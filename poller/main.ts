/**
 * PickupChecker poller — runs on the Hetzner host (systemd), full mode.
 *
 *  • every CADENCE_SEC (20) a sweep: 33 anchors × 2 part batches = 66 requests, concurrency 8
 *  • egress "ipv6": each request binds a fresh random address inside IPV6_PREFIX (/64) that was
 *    routed to this host (AnyIP) — Apple counts per /128, so the per-IP budget never bites
 *  • adaptive: 541 share > 25% ⇒ pause 60 s and alert; 100% ⇒ switch to "vercel" egress
 *  • heartbeat after every sweep (the Vercel watchdog alerts when it stops)
 *
 *  Env: DATABASE_URL, RESEND_API_KEY, IPV6_PREFIX (e.g. 2a01:4f8:1c1b:abcd::/64), SITE_URL,
 *       POLLER_TOKEN (for the vercel egress fallback), CADENCE_SEC, CONCURRENCY, HOST_LABEL
 */
import "dotenv/config";
import os from "node:os";
import { randomBytes } from "node:crypto";
import { Agent, fetch as undiciFetch } from "undici";
import { runSweep, writeHeartbeat, writeState, type Egress } from "../src/lib/stock/sweep";
import { expireStale } from "../src/lib/stock/ingest";
import { recordError, errorMessage } from "../src/lib/errors";
import type { FetchLike } from "../src/lib/apple/client";
import { notifyOwner } from "../src/lib/mail/owner";

const CADENCE_SEC = Number(process.env.CADENCE_SEC ?? 20);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 8);
const HOST = process.env.HOST_LABEL ?? os.hostname();
const PREFIX = resolvePrefix(process.env.IPV6_PREFIX ?? "");
const SITE = process.env.SITE_URL ?? "https://pickupchecker.com";
const POLLER_TOKEN = process.env.POLLER_TOKEN ?? "";

/** IPV6_PREFIX=auto → derive the /64 from the first global IPv6 address on any interface. */
function resolvePrefix(v: string): string {
  if (v !== "auto") return v;
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list ?? []) {
      if (i.family === "IPv6" && !i.internal && !i.address.startsWith("fe80") && !i.address.startsWith("fc") && !i.address.startsWith("fd")) {
        const hextets = expandV6(i.address).split(":").slice(0, 4);
        return `${hextets.join(":")}::/64`;
      }
    }
  }
  console.warn("[poller] IPV6_PREFIX=auto but no global IPv6 address found");
  return "";
}
function expandV6(a: string): string {
  const [head, tail = ""] = a.split("::");
  const h = head ? head.split(":") : []; const t = tail ? tail.split(":") : [];
  const fill = Array(8 - h.length - t.length).fill("0");
  return [...h, ...fill, ...t].map((x) => x.padStart(4, "0")).join(":");
}

/* ---------------- egress: ipv6 rotate ---------------- */

function randomAddressIn(prefix: string): string {
  // prefix like "2a01:4f8:1c1b:abcd::/64" → first 4 hextets + 4 random hextets
  const base = prefix.split("/")[0].replace(/::$/, "");
  const head = base.split(":").filter(Boolean).slice(0, 4);
  while (head.length < 4) head.push("0");
  const tail: string[] = Array.from({ length: 4 }, () => randomBytes(2).toString("hex").replace(/^0+/, "") || "0");
  // avoid the subnet-router anycast address (::0)
  if (tail.join("") === "0000") tail[3] = "1";
  return `${head.join(":")}:${tail.join(":")}`;
}

function fetchBoundTo(localAddress: string): FetchLike {
  const agent = new Agent({ connect: { localAddress, family: 6, timeout: 10_000 }, keepAliveTimeout: 1_000 });
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
  const vercel = new VercelEgress();
  let mode: "full" | "degraded" = ipv6 ? "full" : "degraded";
  let consecutiveBad = 0;
  let lastAlert = 0;
  console.log(`[poller] start host=${HOST} mode=${mode} cadence=${CADENCE_SEC}s prefix=${PREFIX || "(none)"}`);
  await writeState("poller:config", { host: HOST, cadenceSec: CADENCE_SEC, concurrency: CONCURRENCY, prefix: PREFIX ? PREFIX.replace(/:[0-9a-f]*::\/64$/i, ":…::/64") : null, startedAt: new Date().toISOString() });

  for (;;) {
    const t0 = Date.now();
    try {
      const egress = mode === "full" && ipv6 ? ipv6 : vercel;
      const before = ipv6 ? { ...ipv6.stats } : null;
      const r = await runSweep({ egress, concurrency: mode === "full" ? CONCURRENCY : 1, mode, host: HOST });
      const throttledShare = r.requests ? r.throttled / r.requests : 0;
      await writeHeartbeat({
        at: new Date().toISOString(), host: HOST, mode, cadenceSec: CADENCE_SEC, lastSweepId: r.id,
        requests: r.requests, failures: r.failures, throttled: r.throttled, storesCovered: r.storesCovered,
        transitions: r.transitions, notified: r.notified, durationMs: r.durationMs, egress: egress.name,
        ipv6Stats: ipv6 ? ipv6.stats : null,
      });
      void before;
      console.log(`[sweep ${r.id.slice(0, 8)}] ${mode}/${egress.name} req=${r.requests} fail=${r.failures} 541=${r.throttled} stores=${r.storesCovered} trans=${r.transitions} sent=${r.notified.sent} ${r.durationMs}ms`);

      if (mode === "full" && throttledShare >= 0.25) {
        consecutiveBad++;
        if (consecutiveBad >= 3 && Date.now() - lastAlert > 30 * 60_000) {
          lastAlert = Date.now();
          await notifyOwner(`[PickupChecker] Apple throttling ${Math.round(throttledShare * 100)}% of IPv6 requests`, `Host ${HOST}: ${r.throttled}/${r.requests} requests returned 541 in the last sweep. The poller slows down automatically; if this persists Apple may be counting the whole /64 — see docs/architecture.md.`).catch(() => undefined);
        }
        if (throttledShare >= 0.9 && consecutiveBad >= 3) { mode = "degraded"; console.warn("[poller] switching to degraded (vercel egress)"); }
      } else if (mode === "full") {
        consecutiveBad = 0;
      } else if (mode === "degraded" && ipv6 && Date.now() - lastAlert > 15 * 60_000) {
        // probe: try full mode again every 15 min
        mode = "full"; consecutiveBad = 0; lastAlert = Date.now();
      }
      // Statuses nobody has confirmed for 30 minutes become unknown (never "sold out" by silence).
      if (Math.random() < 0.05) await expireStale(30 * 60_000).catch(() => 0);
    } catch (e) {
      console.error("[poller] sweep failed:", e);
      await recordError("poller", `sweep failed: ${errorMessage(e)}`, { host: HOST }).catch(() => undefined);
    }
    const elapsed = Date.now() - t0;
    const pause = Math.max(2_000, (mode === "full" ? CADENCE_SEC : 60) * 1000 - elapsed + (consecutiveBad ? 40_000 : 0));
    await new Promise((r) => setTimeout(r, pause));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
