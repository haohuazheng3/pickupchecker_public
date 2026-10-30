import { describe, it, expect } from "vitest";
import { computeNodes, overallState, type HealthSnapshot } from "@/lib/admin/health";
import { pollerStrip, appleStrip, cronStrip } from "@/lib/admin/strips";
import { fillBuckets } from "@/lib/admin/ops";
import { signAdminToken, verifyAdminToken } from "@/lib/admin/session";
import { probeOutcome } from "@/lib/admin/stripeCheck";

const NOW = Date.parse("2026-10-29T20:00:00Z");
const iso = (minAgo: number) => new Date(NOW - minAgo * 60_000).toISOString();

function snap(over: Partial<HealthSnapshot> = {}): HealthSnapshot {
  return {
    now: NOW,
    heartbeat: { at: iso(0.5), host: "linode-1", mode: "full", cadenceSec: 20, requests: 66, failures: 0, throttled: 0, storesCovered: 239, durationMs: 16000, egress: "ipv6", sys: { load1: 0.2, load5: 0.2, cpus: 1, memTotalMb: 960, memFreeMb: 500, rssMb: 120, uptimeSec: 7200, node: "v24.21.0", commit: "d735966" } },
    heartbeatUpdatedAt: iso(0.5),
    watchdog: { down: false },
    dbLatencyMs: 40, dbError: null,
    req15: { n: 300, ok: 300, s541: 0, avgMs: 400 }, reqHour: { n: 1200, ok: 1190, s541: 5, avgMs: 420 },
    stock: { total: 12000, available: 300, unknown: 10, newest: iso(0.3), storesChecked: 239, storesStale: 30 },
    storesTotal: 269,
    alerts24: { sent: 10, failed: 0, pushSent: 8, emailSent: 2, lastSentAt: iso(30), lastFailedAt: null },
    push: { configured: true, enabled: 3, disabled: 0, lastSentAt: iso(30) },
    email: { configured: true, lastSentAt: iso(60), lastFailedAt: null },
    stripe: { configured: true, lastEventAt: iso(600), lastEventType: "invoice.paid", activeSubs: 2 },
    cron: { lastTickAt: iso(0.5), ticksHour: 60 },
    errors24: { open: 0, lastAt: null },
    inbox: { lastAt: iso(100), worker: true },
    deploy: { commit: "d735966abcdef", env: "production", region: "iad1", node: "v24.21.0" },
    clerkConfigured: true,
    ...over,
  };
}

describe("health rules", () => {
  it("is all green on a healthy snapshot", () => {
    const nodes = computeNodes(snap());
    expect(nodes.map((n) => n.state)).not.toContain("bad");
    expect(overallState(nodes)).toBe("ok");
    expect(nodes.find((n) => n.key === "deploy")?.detail).not.toContain("behind");
  });
  it("judges the host on the 5-minute load, so a momentary spike stays green", () => {
    const host = (load1: number, load5: number) => computeNodes(snap({ heartbeat: { ...snap().heartbeat!, sys: { ...snap().heartbeat!.sys!, load1, load5 } } })).find((n) => n.key === "host")!;
    expect(host(1.6, 0.3).state).toBe("ok");
    expect(host(1.6, 0.3).value).toContain("load 0.3");
    expect(host(0.9, 1.0).state).toBe("warn");
    expect(host(2, 1.8).state).toBe("bad");
  });
  it("judges the database on an open connection and shows what connecting cost", () => {
    const db = computeNodes(snap({ dbLatencyMs: 20, dbConnectMs: 480 })).find((n) => n.key === "db")!;
    expect(db.state).toBe("ok");
    expect(db.detail).toContain("first query 480 ms");
  });
  it("flags a silent poller and a throttled API", () => {
    const nodes = computeNodes(snap({ heartbeat: { ...snap().heartbeat!, at: iso(12) }, heartbeatUpdatedAt: iso(12), req15: { n: 100, ok: 60, s541: 40, avgMs: 500 } }));
    expect(nodes.find((n) => n.key === "poller")?.state).toBe("bad");
    expect(nodes.find((n) => n.key === "apple")?.state).toBe("bad");
    expect(overallState(nodes)).toBe("bad");
  });
  it("warns when the host runs an older commit than the site", () => {
    const nodes = computeNodes(snap({ deploy: { commit: "94f8306abc", env: "production", region: null, node: "v24" } }));
    expect(nodes.find((n) => n.key === "deploy")?.state).toBe("warn");
  });
  it("compares the poller code, not the commit: a pages-only deploy leaves the poller current", () => {
    const sys = { ...snap().heartbeat!.sys!, commit: "bfbdd8a", codeHash: "3b72225a6556" };
    const node = (deploy: Partial<HealthSnapshot["deploy"]>, deployedAt: string | null) =>
      computeNodes(snap({ heartbeat: { ...snap().heartbeat!, sys }, deploy: { commit: "3b1118e219", env: "production", region: null, node: "v24", ...deploy }, deployedAt })).find((n) => n.key === "deploy")!;
    expect(node({ pollerCode: "3b72225a6556" }, iso(300))).toMatchObject({ state: "ok" });
    expect(node({ pollerCode: "3b72225a6556" }, iso(300)).detail).toContain("poller code current");
    // Different code: the host updates itself within ~10 min, so a fresh build only says so …
    expect(node({ pollerCode: "999999999999" }, iso(5))).toMatchObject({ state: "ok" });
    expect(node({ pollerCode: "999999999999" }, iso(5)).detail).toContain("updating");
    // … and one that outlasts the grace period warns.
    expect(node({ pollerCode: "999999999999" }, iso(60))).toMatchObject({ state: "warn" });
  });
  it("reads the Stripe node from the live key probe", () => {
    const stripe = (over: Partial<HealthSnapshot["stripe"]>) => computeNodes(snap({ stripe: { ...snap().stripe, ...over } })).find((n) => n.key === "stripe")!;
    expect(stripe({ missingPermission: "Subscriptions Write" })).toMatchObject({ state: "warn" });
    expect(stripe({ missingPermission: null, permissionsCheckedAt: iso(3) })).toMatchObject({ state: "ok" });
    expect(stripe({ missingPermission: null, permissionsCheckedAt: iso(3) }).detail).toContain("every permission");
  });
  it("classifies Stripe probe errors without guessing", () => {
    expect(probeOutcome(null)).toBe("ok");
    expect(probeOutcome({ statusCode: 404, code: "resource_missing", message: "No such subscription" })).toBe("ok");
    // The "No such …" message quotes the id; an id with "permission" in it once read as a permission error.
    expect(probeOutcome({ statusCode: 404, code: "resource_missing", message: "No such checkout session: 'cs_permission_probe'" })).toBe("ok");
    expect(probeOutcome({ type: "StripePermissionError", statusCode: 403, message: "The provided key does not have the required permissions" })).toBe("missing");
    expect(probeOutcome({ statusCode: 401, type: "StripeAuthenticationError", message: "Invalid API Key provided" })).toBe("unknown");
    expect(probeOutcome({ type: "StripeConnectionError", message: "socket hang up" })).toBe("unknown");
  });
  it("treats missing VAPID keys as down", () => {
    expect(computeNodes(snap({ push: { configured: false, enabled: 0, disabled: 0, lastSentAt: null } })).find((n) => n.key === "push")?.state).toBe("bad");
  });
});

describe("health strips", () => {
  const buckets = fillBuckets([{ t: iso(10), n: 15, avgMs: 16000, stores: 239, failures: 0, degraded: 0 }], 1, 300, ["n", "avgMs", "stores", "failures", "degraded"], NOW);
  it("fills missing buckets with zeros and marks them red after the first data point", () => {
    expect(buckets.length).toBe(13);
    const cells = pollerStrip(buckets, 15);
    expect(cells.filter((c) => c.state === "idle").length).toBeGreaterThan(0); // before the first sweep
    expect(cells.some((c) => c.state === "ok")).toBe(true);
    expect(cells[cells.length - 1].state).toBe("bad"); // nothing in the newest cell
  });
  it("grades the Apple API by 541 share", () => {
    const req = fillBuckets([{ t: iso(5), n: 100, ok: 70, s541: 30, other: 0, avgMs: 400, bytes: 0 }], 1, 300, ["n", "ok", "s541", "other", "avgMs", "bytes"], NOW);
    expect(appleStrip(req).find((c) => c.state !== "idle")?.state).toBe("bad");
    const fine = fillBuckets([{ t: iso(5), n: 100, ok: 99, s541: 1, other: 0, avgMs: 400, bytes: 0 }], 1, 300, ["n", "ok", "s541", "other", "avgMs", "bytes"], NOW);
    expect(appleStrip(fine).find((c) => c.state !== "idle")?.state).toBe("ok");
  });
  it("needs the cron to run every minute", () => {
    const ticks = fillBuckets([{ t: iso(5), ticks: 2, degraded: 0 }], 1, 300, ["ticks", "degraded"], NOW);
    expect(cronStrip(ticks, 5).find((c) => c.state !== "idle")?.state).toBe("warn");
  });
});

describe("admin session token", () => {
  it("round-trips and rejects tampering or expiry", async () => {
    const t = await signAdminToken("secret", NOW);
    expect(await verifyAdminToken(t, "secret", NOW)).toBe(true);
    expect(await verifyAdminToken(t, "other", NOW)).toBe(false);
    expect(await verifyAdminToken(t + "x", "secret", NOW)).toBe(false);
    expect(await verifyAdminToken(t, "secret", NOW + 31 * 86400_000)).toBe(false);
    expect(await verifyAdminToken("", "secret", NOW)).toBe(false);
  });
});
