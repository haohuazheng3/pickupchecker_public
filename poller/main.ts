/**
 * PickupChecker poller — runs on the VPS host (Linode or Hetzner, systemd), full mode.
 *
 *  • every CADENCE_SEC (15) a sweep: 42 anchors × 2 part batches = 84 requests, CONCURRENCY at once (14)
 *  • egress "ipv6": each request binds a fresh random address inside IPV6_PREFIX (/64 or /56) that
 *    was routed to this host (AnyIP) — Apple counts per /128, so the per-IP budget never bites
 *  • a failed request is retried once at the end of the sweep from a fresh address (sweep.ts)
 *  • adaptive: 541 share > 25% ⇒ back off and alert; ≥ 90% failing for 2 rounds (541s, a dead route,
 *    anything) ⇒ switch to the spare egress — the host's own IPv4, then the Vercel function — spent on
 *    watched stores first (fallback.ts); full mode is probed again every 15 min
 *  • heartbeat after every sweep (the Vercel watchdog alerts when it stops, or when the data goes stale)
 *  • a sweep stuck for STUCK_MS exits the process, and systemd starts a fresh one
 *
 *  Env: DATABASE_URL, RESEND_API_KEY, IPV6_PREFIX (e.g. 2600:3c0a:e000:1b::/56, or "auto" = read
 *       IPV6_PREFIX_FILE written by anyip.sh, else derive the /64 of the first global address), SITE_URL,
 *       POLLER_TOKEN (for the vercel egress fallback), CADENCE_SEC, CONCURRENCY, HOST_LABEL
 */
import "dotenv/config";
import os from "node:os";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { Agent, fetch as undiciFetch } from "undici";
import { buildTasks, runSweep, singleIdentityEgress, writeHeartbeat, writeState, type Egress } from "../src/lib/stock/sweep";
import { fallbackOrder } from "../src/lib/stock/fallback";
import { expireStale } from "../src/lib/stock/ingest";
import { recordError, errorMessage } from "../src/lib/errors";
import { prefixFromInterfaces, randomAddressIn } from "./ipv6";
import type { FetchLike } from "../src/lib/apple/client";
import { notifyOwner } from "../src/lib/mail/owner";
import { logOps } from "../src/lib/ops";
import { pollerCodeHash } from "./codeHash.mjs";

const CADENCE_SEC = Number(process.env.CADENCE_SEC ?? 15);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 14);
const HOST = process.env.HOST_LABEL ?? os.hostname();
const PREFIX = resolvePrefix(process.env.IPV6_PREFIX ?? "");
const SITE = process.env.SITE_URL ?? "https://pickupchecker.com";
const POLLER_TOKEN = process.env.POLLER_TOKEN ?? "";
/** Longer than the worst honest sweep (84 requests all timing out: 6 waves × 15 s), short enough to matter. */
const STUCK_MS = 180_000;

/**
 * IPV6_PREFIX=auto → the prefix anyip.sh routed to lo (IPV6_PREFIX_FILE, default
 * /opt/pickupchecker/ipv6-prefix; on Linode that is the routed /56 or /64, which is NOT on any
 * interface), else derive the /64 from the first global IPv6 address on any interface (Hetzner).
 */
function resolvePrefix(v: string): string {
  if (v !== "auto") return v;
  const file = process.env.IPV6_PREFIX_FILE ?? "/opt/pickupchecker/ipv6-prefix";
  try {
    const s = readFileSync(file, "utf8").trim();
    if (/^[0-9a-f:]+\/\d{1,3}$/i.test(s)) return s;
  } catch {
    /* no file: fall through to interface discovery */
  }
  const p = prefixFromInterfaces(os.networkInterfaces());
  if (!p) console.warn("[poller] IPV6_PREFIX=auto but no routed prefix file and no global IPv6 address found");
  return p;
}

/** Short git sha of the checked-out tree (the admin page compares it with the site's build). */
function currentCommit(): string | null {
  try { return execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8", timeout: 3000 }).trim(); } catch { return null; }
}
const COMMIT = currentCommit();
/** Fingerprint of the code this process runs (poller/codeHash.mjs); the site's build carries the one it expects. */
const CODE_HASH = (() => { try { return pollerCodeHash(process.cwd()); } catch { return null; } })();

/** Host vitals that ride along with every heartbeat (the admin status board shows them). */
function hostVitals() {
  const [load1, load5] = os.loadavg();
  return {
    load1: Math.round(load1 * 100) / 100, load5: Math.round(load5 * 100) / 100, cpus: os.cpus().length,
    memTotalMb: Math.round(os.totalmem() / 1048576), memFreeMb: Math.round(os.freemem() / 1048576),
    rssMb: Math.round(process.memoryUsage().rss / 1048576), uptimeSec: Math.round(os.uptime()), procUptimeSec: Math.round(process.uptime()),
    node: process.version, commit: COMMIT, codeHash: CODE_HASH, pid: process.pid,
  };
}

/* ---------------- egress: ipv6 rotate ---------------- */

function fetchBoundTo(localAddress: string): FetchLike {
  // `localAddress` must be a top-level Agent/Client option: inside `connect` undici ignores it and the
  // socket silently uses the interface's primary address (verified on the Linode host, undici 8.12).
  const agent = new Agent({ localAddress, connect: { family: 6, timeout: 10_000 }, keepAliveTimeout: 1_000 });
  return async (url, init) => {
    const res = await undiciFetch(url, { headers: init.headers, signal: init.signal, dispatcher: agent });
    return { status: res.status, text: () => res.text() };
  };
}

class Ipv6Egress implements Egress {
  name = "ipv6";
  stats = { requests: 0, throttled: 0, errors: 0 };
  constructor(private prefix: string) {}
  async acquire() {
    const addr = randomAddressIn(this.prefix);
    const f = fetchBoundTo(addr);
    this.stats.requests++;
    return {
      fetch: f,
      label: `ipv6:${addr}`,
      release: (status: number) => {
        if (status === 541 || status === 429 || status === 403) this.stats.throttled++;
        if (status === 0) this.stats.errors++;
      },
    };
  }
}

/* ---------------- egress: the host's own IPv4 (spare) ---------------- */

const ipv4Agent = new Agent({ connect: { family: 4, timeout: 10_000 }, keepAliveTimeout: 1_000 });
const fetchIpv4: FetchLike = async (url, init) => {
  const res = await undiciFetch(url, { headers: init.headers, signal: init.signal, dispatcher: ipv4Agent });
  return { status: res.status, text: () => res.text() };
};

/** Spare identities in order: whichever still has budget answers. */
function firstAvailable(name: string, pool: Egress[]): Egress {
  return { name, async acquire() { for (const e of pool) { const slot = await e.acquire(); if (slot) return slot; } return null; } };
}

/* ---------------- egress: vercel function (fallback) ---------------- */

class VercelEgress implements Egress {
  name = "vercel";
  private used = 0;
  private windowStart = Date.now();
  private cooldownUntil = 0;
  async acquire() {
    const now = Date.now();
    if (now < this.cooldownUntil) return null;
    if (now - this.windowStart > 35 * 60_000) { this.windowStart = now; this.used = 0; }
    if (this.used >= 25) return null;
    this.used++;
    const f: FetchLike = async (url) => {
      const u = new URL(url);
      const parts = [...u.searchParams.entries()].filter(([k]) => k.startsWith("parts.")).map(([, v]) => v);
      const location = u.searchParams.get("location") ?? "";
      const res = await undiciFetch(`${SITE}/api/egress/apple`, {
        method: "POST",
        headers: { authorization: `Bearer ${POLLER_TOKEN}`, "content-type": "application/json" },
        body: JSON.stringify({ parts, location }),
      });
      const j = (await res.json()) as { ok: boolean; httpStatus: number };
      // Re-wrap so fetchPickup sees the Apple status and a JSON body it can parse.
      return { status: j.httpStatus === 200 ? 200 : j.httpStatus || 599, text: async () => JSON.stringify(rewrap(j)) };
    };
    return { fetch: f, label: "vercel", release: (s: number) => { if (s === 541) this.cooldownUntil = Date.now() + 35 * 60_000; } };
  }
}

/** Convert our parsed PickupResponse back into the minimal Apple body shape the parser accepts. */
function rewrap(j: { ok: boolean; location?: string; stores?: { storeNumber: string; storeName: string; city: string; state: string; distanceMiles: number | null; parts: { partNumber: string; pickupDisplay: string | null; quote: string | null }[] }[] }) {
  return {
    head: { status: "200" },
    body: {
      location: j.location ?? "",
      stores: (j.stores ?? []).map((s) => ({
        storeNumber: s.storeNumber, storeName: s.storeName, city: s.city, state: s.state, storedistance: s.distanceMiles,
        partsAvailability: Object.fromEntries(s.parts.map((p) => [p.partNumber, { pickupDisplay: p.pickupDisplay, pickupSearchQuote: p.quote }])),
      })),
    },
  };
}

/* ---------------- main loop ---------------- */

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");
  const ipv6 = PREFIX ? new Ipv6Egress(PREFIX) : null;
  const spare = firstAvailable("spare", [singleIdentityEgress("ipv4", { used: 0, windowStart: Date.now(), cooldownUntil: 0 }, fetchIpv4), new VercelEgress()]);
  let mode: "full" | "degraded" = ipv6 ? "full" : "degraded";
  let consecutiveBad = 0;
  let lastAlert = 0;
  /** When the spare egress took over; full mode is tried again 15 min later (not on the next round). */
  let degradedSince = 0;
  console.log(`[poller] start host=${HOST} mode=${mode} cadence=${CADENCE_SEC}s prefix=${PREFIX || "(none)"}`);
  await writeState("poller:config", { host: HOST, cadenceSec: CADENCE_SEC, concurrency: CONCURRENCY, prefix: PREFIX || null, startedAt: new Date().toISOString(), commit: COMMIT, node: process.version });
  await logOps("poller", "info", `poller started (${mode})`, { host: HOST, cadenceSec: CADENCE_SEC, concurrency: CONCURRENCY, prefix: PREFIX || null, commit: COMMIT, node: process.version });
  for (const sig of ["SIGTERM", "SIGINT"] as const) {
    process.on(sig, () => {
      logOps("poller", "info", `poller stopping (${sig})`, { host: HOST, commit: COMMIT }).finally(() => process.exit(0));
      setTimeout(() => process.exit(0), 3000).unref();
    });
  }
  let sweepsSinceStart = 0;
  // A sweep that never returns (a hung socket, a stuck query) would keep the process alive and silent:
  // exit instead, and systemd (Restart=always) starts a clean one.
  let lastProgress = Date.now();
  setInterval(() => {
    if (Date.now() - lastProgress < STUCK_MS) return;
    console.error(`[poller] no sweep finished for ${Math.round((Date.now() - lastProgress) / 1000)} s — exiting for a restart`);
    void logOps("poller", "error", "sweep stuck — restarting the process", { host: HOST, stuckSec: Math.round((Date.now() - lastProgress) / 1000) }).catch(() => undefined);
    setTimeout(() => process.exit(1), 2000);
  }, 10_000);

  for (;;) {
    const t0 = Date.now();
    try {
      const egress = mode === "full" && ipv6 ? ipv6 : spare;
      // Spare identities have a few requests per half hour: spend them on watched, stale pairs first.
      // About 50 requests per 35 min between the two (25 each): one every 40 s spreads them evenly.
      const tasks = egress === spare ? (await fallbackOrder(buildTasks()).catch(() => buildTasks())).slice(0, 1) : undefined;
      const r = await runSweep({ egress, tasks, concurrency: mode === "full" ? CONCURRENCY : 1, mode, host: HOST, retryFailed: egress !== spare });
      const throttledShare = r.requests ? r.throttled / r.requests : 0;
      const failedShare = r.tasks ? r.unresolved / r.tasks : 0;
      await writeHeartbeat({
        at: new Date().toISOString(), host: HOST, mode, cadenceSec: CADENCE_SEC, lastSweepId: r.id,
        requests: r.requests, failures: r.failures, recovered: r.recovered, unresolved: r.unresolved, throttled: r.throttled, storesCovered: r.storesCovered,
        transitions: r.transitions, held: r.held, notified: r.notified, durationMs: r.durationMs, egress: egress.name,
        ipv6Stats: ipv6 ? ipv6.stats : null, sys: hostVitals(), sweeps: ++sweepsSinceStart, consecutiveBad,
      });
      lastProgress = Date.now();
      console.log(`[sweep ${r.id.slice(0, 8)}] ${mode}/${egress.name} req=${r.requests} fail=${r.failures} recovered=${r.recovered} unresolved=${r.unresolved} 541=${r.throttled} stores=${r.storesCovered} trans=${r.transitions} held=${r.held} sent=${r.notified.sent} ${r.durationMs}ms`);

      if (mode === "full" && (throttledShare >= 0.25 || failedShare >= 0.5)) {
        consecutiveBad++;
        const what = throttledShare >= 0.25 ? `Apple throttling ${Math.round(throttledShare * 100)}% of requests` : `${Math.round(failedShare * 100)}% of requests failing`;
        await logOps("poller", "warn", what, { sweepId: r.id, throttled: r.throttled, unresolved: r.unresolved, requests: r.requests, consecutiveBad });
        if (consecutiveBad >= 3 && Date.now() - lastAlert > 30 * 60_000) {
          lastAlert = Date.now();
          await notifyOwner(`[PickupChecker] ${what} (IPv6)`, `Host ${HOST}: ${r.throttled} of ${r.requests} requests returned 541 and ${r.unresolved} of ${r.tasks} tasks got no answer in the last sweep. The poller backs off, and switches to its spare egress when nearly everything fails; if this persists Apple may be counting the whole range, or the IPv6 route is gone — see docs/architecture.md.`).catch(() => undefined);
        }
        if ((throttledShare >= 0.9 || failedShare >= 0.9) && consecutiveBad >= 2) {
          mode = "degraded"; degradedSince = Date.now();
          console.warn("[poller] switching to degraded (spare egress: host IPv4, then Vercel)");
          await logOps("poller", "error", "switched to degraded mode (spare egress: host IPv4, then Vercel)", { host: HOST, consecutiveBad, throttledShare, failedShare });
        }
      } else if (mode === "full") {
        consecutiveBad = 0;
      } else if (mode === "degraded" && ipv6 && Date.now() - degradedSince > 15 * 60_000) {
        // probe: try full mode again every 15 min
        mode = "full"; consecutiveBad = 0;
        await logOps("poller", "info", "probing full mode again (IPv6 egress)", { host: HOST });
      }
      // Statuses nobody has confirmed for 30 minutes become unknown (never "sold out" by silence).
      if (Math.random() < 0.05) await expireStale(30 * 60_000).catch(() => 0);
    } catch (e) {
      lastProgress = Date.now(); // a failing sweep is progress of a kind: it returned
      console.error("[poller] sweep failed:", e);
      await recordError("poller", `sweep failed: ${errorMessage(e)}`, { host: HOST }).catch(() => undefined);
      await logOps("poller", "error", `sweep failed: ${errorMessage(e)}`, { host: HOST }).catch(() => undefined);
    }
    const elapsed = Date.now() - t0;
    const pause = mode === "full" ? Math.max(2_000, CADENCE_SEC * 1000 - elapsed + (consecutiveBad ? 40_000 : 0)) : Math.max(2_000, 40_000 - elapsed);
    await new Promise((r) => setTimeout(r, pause));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
