import { describe, it, expect } from "vitest";
import { computeNodes, overallState, type HealthSnapshot } from "@/lib/admin/health";
import { pollerStrip, appleStrip, cronStrip } from "@/lib/admin/strips";
import { fillBuckets } from "@/lib/admin/ops";
import { signAdminToken, verifyAdminToken } from "@/lib/admin/session";

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
