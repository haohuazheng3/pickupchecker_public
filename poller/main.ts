/**
 * PickupChecker poller — runs on the VPS host (Linode or Hetzner, systemd), full mode.
 *
 *  • every CADENCE_SEC (15) a sweep: 42 anchors × 2 part batches = 84 requests, CONCURRENCY at once (14)
 *  • the fast lane (stock/fastlane.ts): every FAST_CADENCE_SEC (5) each store a paid alert points at is
 *    asked on its own (`store=R###`, ~7 KB); a first "available" anywhere is re-asked within a second
 *    (instant confirm) so an alert follows a sighting in ~1–2 s. Runs only in full mode (IPv6 egress), on each host
 *    for the countries it polls (US stores with the US sweep, the others with the other countries' round).
 *  • egress "ipv6": each request binds a fresh random address inside IPV6_PREFIX (/64 or /56) that
 *    was routed to this host (AnyIP) — Apple counts per /128, so the per-IP budget never bites
 *  • a failed request is retried once at the end of the sweep from a fresh address (sweep.ts). An anchor request
 *    gives up after SWEEP_TIMEOUT_MS (6 s; answers take 1.8 s, 99.99% under 4.5 s): with the old 15 s one hung
 *    request held its whole round to ~25 s (69 rounds a day, measured 2026-11-02)
 *  • adaptive: 541 share > 25% ⇒ back off and alert; ≥ 90% failing for 2 rounds (541s, a dead route,
 *    anything) ⇒ switch to the spare egress — the host's own IPv4, then the Vercel function — spent on
 *    watched stores first (fallback.ts); full mode is probed again every 15 min
 *  • the other countries (docs/i18n.md), opt-in through POLL_COUNTRIES: every INTL_CADENCE_SEC (15) each of
 *    their stores on its own (`store=R###`, the country's 40 part numbers in 2 batches), INTL_CONCURRENCY at once
 *    (12), through the same IPv6 egress, ingest, instant confirm and alerts; failed requests retried once in the
 *    round. A country whose round mostly failed (any reason) is paused on its own, 60 s doubling to 16 min.
 *    A store Apple answers "There is no store associated with this search" for is not a failure: twice in a
 *    row marks it "pickup lookup not offered" (poller_state, the store page says so) and it is asked again
 *    only every 30 min (stock/notOffered.ts).
 *    poll_log keeps only its failures (one sweeps row per round, mode "intl"); totals ride along with the
 *    heartbeat. Runs only in full mode (the spare egress is budgeted for the US).
 *  • heartbeat after every sweep (the Vercel watchdog alerts when it stops, or when the data goes stale)
 *  • hosts (POLLER_ROLE primary | standby | worker, stock/cluster.ts): every ALIVE_EVERY_MS each one decides its
 *    duties from the cluster record and the others' alive:<host> records — the cluster primary polls the US unless
 *    a US worker reports in, the standby the other countries (the primary takes either back when no one else
 *    reports doing it). The standby promotes its database replica when the primary database is unreachable from
 *    it and from the site for a minute; an old primary that finds a newer epoch fences itself
 *    (docs/architecture.md「热备主机」「美国专用轮询机」). A host reports "us" until its last US round has
 *    finished, so a handover never has two processes writing one store.
 *  • a sweep stuck for STUCK_MS exits the process, and systemd starts a fresh one. A round of the other
 *    countries stuck for INTL_STUCK_MS only restarts their own loop (the US sweep never restarts for them).
 *
 *  Env: DATABASE_URL (the poller's own role, which has reserved connection slots: infra/linode/postgres.sh),
 *       DATABASE_URL_STANDBY (the other host's database: TLS from the primary, loopback on the standby),
 *       POLLER_ROLE (primary | standby | worker: no database of its own, polls the US once handed over),
 *       RESEND_API_KEY, IPV6_PREFIX (e.g. 2600:3c0a:e000:1b::/56, or "auto" = read
 *       IPV6_PREFIX_FILE written by anyip.sh, else derive the /64 of the first global address), SITE_URL,
 *       POLLER_TOKEN (for the vercel egress fallback), CADENCE_SEC, CONCURRENCY, SWEEP_TIMEOUT_MS (6000),
 *       HOST_LABEL,
 *       FAST_CADENCE_SEC (5; 0 disables the fast lane), FAST_CONCURRENCY (8), FAST_TIMEOUT_MS (4500),
 *       POLL_COUNTRIES (unset or "" = none; "ca,uk" = those; "all" = all 18), INTL_CADENCE_SEC (15),
 *       INTL_CONCURRENCY (12), INTL_TIMEOUT_MS (6000), INTL_INGEST_CONCURRENCY (4), DATABASE_POOL_MAX
 */
import "dotenv/config";
import os from "node:os";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { Agent, fetch as undiciFetch } from "undici";
import { buildIntlTasks, buildTasks, intlStores, nextCountryBackoff, parsePollCountries, readState, runSweep, singleIdentityEgress, writeHeartbeat, writeState, type Egress } from "../src/lib/stock/sweep";
import { NOT_OFFERED_KEY, nextNotOffered, notOfferedDue, persistNotOffered, restoreNotOffered, type NotOfferedState } from "../src/lib/stock/notOffered";
import { DIRECT_AFTER_MISSES, INTL_COVERAGE_KEY, coverageStep, directStores, excusedStores, persistCoverage, restoreCoverage, uncoveredByPlan, type CoverageState } from "../src/lib/stock/intlCoverage";
import { INTL_COVERAGE } from "../src/lib/apple/catalog";
import { fallbackOrder } from "../src/lib/stock/fallback";
import { loadFastTargets, runFastRound, targetsForDuties } from "../src/lib/stock/fastlane";
import { expireStale } from "../src/lib/stock/ingest";
import { recordError, errorMessage } from "../src/lib/errors";
import { prefixFromInterfaces, randomAddressIn } from "./ipv6";
import { pickupCountryOf, type FetchLike } from "../src/lib/apple/client";
import { notifyOwner } from "../src/lib/mail/owner";
import { logOps } from "../src/lib/ops";
import { pollerCodeHash } from "./codeHash.mjs";
import { dbStatus, recheckDatabases, targetPool } from "../src/lib/db";
import { ALIVE_EVERY_MS, dutyLabel, duties, promoteStep, readAlive, readCluster, type ClusterRecord, type Duties, type PollerRole, type PromoteState } from "../src/lib/stock/cluster";

const CADENCE_SEC = Number(process.env.CADENCE_SEC ?? 15);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 14);
const SWEEP_TIMEOUT_MS = Number(process.env.SWEEP_TIMEOUT_MS ?? 6000);
const FAST_CADENCE_SEC = Number(process.env.FAST_CADENCE_SEC ?? 5);
const FAST_CONCURRENCY = Number(process.env.FAST_CONCURRENCY ?? 8);
const FAST_TIMEOUT_MS = Number(process.env.FAST_TIMEOUT_MS ?? 4500);
const POLL_COUNTRIES = parsePollCountries(process.env.POLL_COUNTRIES);
const INTL_CADENCE_SEC = Number(process.env.INTL_CADENCE_SEC ?? 15);
const INTL_CONCURRENCY = Number(process.env.INTL_CONCURRENCY ?? 12);
const INTL_TIMEOUT_MS = Number(process.env.INTL_TIMEOUT_MS ?? 6000);
const HOST = process.env.HOST_LABEL ?? os.hostname();
const ROLE: PollerRole = process.env.POLLER_ROLE === "standby" ? "standby" : process.env.POLLER_ROLE === "worker" ? "worker" : "primary";
const PREFIX = resolvePrefix(process.env.IPV6_PREFIX ?? "");
const SITE = process.env.SITE_URL ?? "https://pickupchecker.com";
const POLLER_TOKEN = process.env.POLLER_TOKEN ?? "";
/** Longer than the worst honest sweep (84 requests all timing out, then retried: 2 × 6 waves × 6 s), short enough to matter. */
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
/** Share of the last 5 minutes some task waited for a CPU (Linux PSI), percent; null where PSI is missing. */
function cpuPressure(): number | null {
  try {
    const m = /some avg10=[\d.]+ avg60=[\d.]+ avg300=([\d.]+)/.exec(readFileSync("/proc/pressure/cpu", "utf8"));
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

function hostVitals() {
  const [load1, load5] = os.loadavg();
  return {
    load1: Math.round(load1 * 100) / 100, load5: Math.round(load5 * 100) / 100, cpus: os.cpus().length, cpuWaitPct: cpuPressure(),
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
      // A one-store request and another country's endpoint travel along; a US anchor request is sent as always.
      const store = u.searchParams.get("store");
      const country = pickupCountryOf(url);
      const res = await undiciFetch(`${SITE}/api/egress/apple`, {
        method: "POST",
        headers: { authorization: `Bearer ${POLLER_TOKEN}`, "content-type": "application/json" },
        body: JSON.stringify(store || country !== "us" ? { parts, ...(store ? { store } : { location }), ...(country !== "us" ? { country } : {}) } : { parts, location }),
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

/* ---------------- fast lane ---------------- */

/** Running totals since the process started; they ride along with every heartbeat (admin Poller node). */
const fastStats = {
  cadenceSec: FAST_CADENCE_SEC, stores: 0, pairs: 0, rounds: 0, requests: 0, failures: 0, throttled: 0, timeouts: 0,
  transitions: 0, confirmed: 0, refuted: 0, errors: 0, paused: false, lastAt: null as string | null, lastDurationMs: 0, targetsAt: null as string | null,
};

/**
 * Every FAST_CADENCE_SEC: the stores paid alerts point at, one request each. The target list is re-read
 * every minute (a new alert joins the fast lane within a minute). Pauses while the sweep is in degraded
 * mode (the spare egress has a few requests per half hour) and for 60 s after a round that was mostly 541s.
 */
async function fastLoop(egress: Egress, active: () => boolean) {
  let targets = new Map<string, string[]>(), targetsAt = 0, backoffUntil = 0, lastErrorLog = 0;
  console.log(`[fast] start cadence=${FAST_CADENCE_SEC}s concurrency=${FAST_CONCURRENCY}`);
  for (;;) {
    const t0 = Date.now();
    try {
      fastStats.paused = !active() || Date.now() < backoffUntil;
      if (!fastStats.paused) {
        if (Date.now() - targetsAt > 60_000) { targets = await loadFastTargets(); targetsAt = Date.now(); fastStats.targetsAt = new Date(targetsAt).toISOString(); }
        // Only the stores of the countries this host polls, decided every round (duties move on a takeover).
        const mine = targetsForDuties(targets, duty);
        fastStats.stores = mine.size; fastStats.pairs = [...mine.values()].reduce((a, p) => a + p.length, 0);
        if (mine.size > 0) {
          usBusy.fast = duty.us; // set before the first await: the alive record must not drop "us" mid-round
          const r = await runFastRound({ egress, targets: mine, concurrency: FAST_CONCURRENCY, timeoutMs: FAST_TIMEOUT_MS }).finally(() => { usBusy.fast = false; });
          fastStats.rounds++; fastStats.requests += r.requests; fastStats.failures += r.failures; fastStats.throttled += r.throttled; fastStats.timeouts += r.timeouts;
          fastStats.transitions += r.transitions; fastStats.confirmed += r.confirmed; fastStats.refuted += r.refuted;
          fastStats.lastAt = new Date().toISOString(); fastStats.lastDurationMs = r.durationMs;
          if (r.transitions || r.failures || r.confirmed || r.refuted) console.log(`[fast ${r.id.slice(5, 13)}] req=${r.requests} fail=${r.failures} 541=${r.throttled} trans=${r.transitions} confirmed=${r.confirmed} refuted=${r.refuted} ${r.durationMs}ms`);
          if (r.requests >= 4 && r.throttled / r.requests >= 0.5) {
            backoffUntil = Date.now() + 60_000;
            await logOps("poller", "warn", `fast lane throttled: ${r.throttled} of ${r.requests} requests — pausing it for 60 s`, { host: HOST }).catch(() => undefined);
          }
        }
      }
    } catch (e) {
      fastStats.errors++;
      if (Date.now() - lastErrorLog > 10 * 60_000) {
        lastErrorLog = Date.now();
        await recordError("poller", `fast lane round failed: ${errorMessage(e)}`, { host: HOST }).catch(() => undefined);
      }
    }
    await new Promise((r) => setTimeout(r, Math.max(500, FAST_CADENCE_SEC * 1000 - (Date.now() - t0))));
  }
}

/* ---------------- other countries ---------------- */

/** Running totals since the process started; they ride along with every heartbeat (admin Poller node, health). */
const intlStats = {
  cadenceSec: INTL_CADENCE_SEC, countries: POLL_COUNTRIES as string[], stores: 0, tasks: 0, rounds: 0, requests: 0, failures: 0, recovered: 0,
  unresolved: 0, throttled: 0, timeouts: 0, transitions: 0, confirmed: 0, held: 0, notified: 0, errors: 0, paused: false,
  lastAt: null as string | null, lastDurationMs: 0, lastSweepId: null as string | null, lastStoresCovered: 0,
  /** Countries resting after a failed round: code → ISO time they are asked again. */
  pausedCountries: {} as Record<string, string>,
  /** Times a stuck round made the loop start over (the process never restarts for the other countries). */
  restarts: 0,
  /** Stuck too often: left off until the process restarts. */
  stopped: false,
  /** Stores Apple offers no pickup lookups for (asked every 30 min instead of every round). */
  notOffered: [] as string[],
  /** Anchor locations in the round (INTL_COVERAGE); 0 = every store on its own. */
  anchors: 0,
  /** Stores no anchor of the plan lists: asked store by store from the start (Chermside). */
  planUncovered: [] as string[],
  /** Stores asked store by store because their anchors stopped returning them (intlCoverage.ts). */
  direct: [] as string[],
};
/** When the intl loop last finished a round (or decided to rest): the STUCK watchdog reads it. */
let intlProgress = Date.now();
/** The running intl loop; a stuck one is abandoned by bumping this, and quits if it ever comes back. */
let intlGeneration = 0;
/** Loop restarts allowed per hour; past that the other countries stay off until the process restarts. */
const INTL_MAX_RESTARTS_PER_HOUR = 3;
const intlRestartTimes: number[] = [];
/**
 * Longer than the worst honest round of the other countries — every request timing out, no retry pass
 * (398 tasks / 12 at a time × 6 s ≈ 200 s) — with half again as slack, and never shorter than STUCK_MS:
 * a dead foreign endpoint makes rounds slow, not stuck. A stuck one only starts their loop over.
 */
const INTL_STUCK_MS = Math.max(STUCK_MS, Math.ceil(buildIntlTasks(POLL_COUNTRIES).length / Math.max(1, INTL_CONCURRENCY)) * INTL_TIMEOUT_MS * 1.5 + 60_000);

/**
 * Every INTL_CADENCE_SEC: the anchors of POLL_COUNTRIES (INTL_COVERAGE, each returning the nearest ≤12 stores)
 * plus the stores no anchor returns on their own, through the sweep engine in mode "intl" (fetch, ingest, instant
 * confirm, alerts; failed requests retried once from a fresh address; poll_log keeps failures only). Pauses while
 * the US sweep is in degraded mode, and for 60 s after a round that was mostly 541s; a single country whose round
 * mostly failed rests on its own (nextCountryBackoff). After every round, intlCoverage.ts compares the stores the
 * anchors returned with the plan: a store missing twice in a row (while its anchors answered) is asked store by
 * store from then on and the owner is told once. `generation` ends a loop the stuck watchdog has replaced.
 */
async function intlLoop(egress: Egress, active: () => boolean, generation: number) {
  const universe = intlStores(POLL_COUNTRIES);
  const known = new Set(Object.values(universe).flat());
  const planGaps = uncoveredByPlan(universe, INTL_COVERAGE);
  const planGapSet = new Set(Object.values(planGaps).flat());
  intlStats.planUncovered = [...planGapSet].sort();
  let coverage: CoverageState = {};
  try {
    coverage = restoreCoverage((await readState(INTL_COVERAGE_KEY))?.value, known);
  } catch (e) {
    console.warn(`[intl] could not read ${INTL_COVERAGE_KEY}: ${errorMessage(e)}`);
  }
  let tasks = buildIntlTasks(POLL_COUNTRIES, { direct: directStores(coverage) });
  const refreshTasks = () => {
    tasks = buildIntlTasks(POLL_COUNTRIES, { direct: directStores(coverage) });
    intlStats.tasks = tasks.length; intlStats.stores = known.size;
    intlStats.anchors = new Set(tasks.filter((t) => !t.store).map((t) => t.anchor.location)).size;
    intlStats.direct = directStores(coverage);
  };
  refreshTasks();
  let backoffUntil = 0, lastErrorLog = 0;
  /** Per-country rest (nextCountryBackoff); a country absent here is asked every round. */
  const countryRest = new Map<string, { level: number; until: number }>();
  /** Stores Apple answers "no store associated with this search" for: asked every 30 min, not every round. */
  let noPickup: NotOfferedState = {};
  try {
    const saved = await readState(NOT_OFFERED_KEY);
    noPickup = restoreNotOffered(saved?.value, known);
    if (saved && Object.keys(persistNotOffered(noPickup).stores).length !== Object.keys((saved.value as { stores?: object }).stores ?? {}).length) await writeState(NOT_OFFERED_KEY, persistNotOffered(noPickup));
  } catch (e) {
    console.warn(`[intl] could not read ${NOT_OFFERED_KEY}: ${errorMessage(e)}`);
  }
  intlStats.notOffered = Object.keys(persistNotOffered(noPickup).stores).sort();
  console.log(`[intl] start countries=${POLL_COUNTRIES.join(",")} stores=${known.size} anchors=${intlStats.anchors} direct=${intlStats.planUncovered.length + intlStats.direct.length} requests/round=${tasks.length} cadence=${INTL_CADENCE_SEC}s concurrency=${INTL_CONCURRENCY}${generation ? ` (restart ${generation})` : ""}`);
  while (generation === intlGeneration) {
    const t0 = Date.now();
    try {
      intlStats.paused = !active() || Date.now() < backoffUntil;
      const now = Date.now();
      const resting = new Set([...countryRest].filter(([, r]) => r.until > now).map(([cc]) => cc));
      intlStats.pausedCountries = Object.fromEntries([...countryRest].filter(([cc]) => resting.has(cc)).map(([cc, r]) => [cc, new Date(r.until).toISOString()]));
      const round = tasks.filter((t) => !resting.has(t.country!) && (!t.store || notOfferedDue(noPickup, t.store, now)));
      if (!intlStats.paused && round.length) {
        const r = await runSweep({ egress, tasks: round, concurrency: INTL_CONCURRENCY, mode: "intl", host: HOST, known, timeoutMs: INTL_TIMEOUT_MS, logOk: false });
        if (generation !== intlGeneration) break; // abandoned while it ran (a stuck round came back late)
        intlStats.rounds++; intlStats.requests += r.requests; intlStats.failures += r.failures; intlStats.recovered += r.recovered; intlStats.unresolved += r.unresolved;
        intlStats.throttled += r.throttled; intlStats.timeouts += r.timeouts; intlStats.transitions += r.transitions; intlStats.confirmed += r.confirmed; intlStats.held += r.held; intlStats.notified += r.notified.sent;
        intlStats.lastAt = new Date().toISOString(); intlStats.lastDurationMs = r.durationMs; intlStats.lastSweepId = r.id; intlStats.lastStoresCovered = r.storesCovered;
        if (r.transitions || r.unresolved || r.throttled) console.log(`[intl ${r.id.slice(0, 8)}] req=${r.requests} fail=${r.failures} recovered=${r.recovered} unresolved=${r.unresolved} 541=${r.throttled} stores=${r.storesCovered} trans=${r.transitions} confirmed=${r.confirmed} ${r.durationMs}ms`);
        // Coverage: did the anchors return every store the plan says they do? (Stores whose anchors did not answer,
        // resting countries and the stores the plan never covers are not judged.)
        if (intlStats.anchors) {
          const expected = Object.entries(universe).flatMap(([cc, list]) => (resting.has(cc) ? [] : list!.filter((s) => !planGapSet.has(s)).map((store) => ({ store, country: cc }))));
          const step = coverageStep(coverage, { expected, anchorCovered: r.anchorCovered, excused: excusedStores(INTL_COVERAGE, r.failedLocations), now: new Date() });
          coverage = step.state;
          if (step.newlyDirect.length || step.back.length) {
            refreshTasks();
            for (const s of step.newlyDirect) console.warn(`[intl] ${s} missing from its anchors' answers ${coverage[s]?.misses ?? 0} rounds in a row — asked store by store from now on`);
            for (const s of step.back) console.log(`[intl] ${s} back in its anchors' answers — store-by-store request dropped`);
            await logOps("poller", step.newlyDirect.length ? "warn" : "info", `anchor coverage changed: ${step.newlyDirect.length ? `now direct: ${step.newlyDirect.join(", ")}` : ""}${step.newlyDirect.length && step.back.length ? "; " : ""}${step.back.length ? `back under anchors: ${step.back.join(", ")}` : ""}`, { host: HOST, direct: intlStats.direct, sweepId: r.id }).catch(() => undefined);
          }
          if (step.newlyDirect.length || step.back.length || step.report.length) await writeState(INTL_COVERAGE_KEY, persistCoverage(coverage)).catch((e) => console.warn(`[intl] could not save ${INTL_COVERAGE_KEY}: ${errorMessage(e)}`));
          if (step.report.length) {
            await notifyOwner(`[PickupChecker] ${step.report.length} store${step.report.length > 1 ? "s" : ""} dropped out of the anchor answers (other countries)`,
              `Host ${HOST}: Apple's answers for the coverage anchors no longer include ${step.report.map((s) => `${s} (${coverage[s]?.country})`).join(", ")} — missing ${DIRECT_AFTER_MISSES} rounds in a row while the anchors themselves answered. Each is now asked store by store every round, so nothing goes stale; stock pages and alerts are unaffected.\n\nIf this persists, rebuild data/apple/intl-coverage-plan.json on a host with the IPv6 range: node scripts/intl-coverage.mjs (docs/architecture.md, 海外锚点轮询).`).catch(() => undefined);
          }
        }
        if (r.pickup) {
          const step = nextNotOffered(noPickup, r.pickup, new Date());
          noPickup = step.state;
          if (step.marked.length || step.cleared.length || step.rechecked.length) {
            await writeState(NOT_OFFERED_KEY, persistNotOffered(noPickup)).catch((e) => console.warn(`[intl] could not save ${NOT_OFFERED_KEY}: ${errorMessage(e)}`));
            intlStats.notOffered = Object.keys(persistNotOffered(noPickup).stores).sort();
          }
          for (const store of step.marked) {
            const e = noPickup[store];
            console.log(`[intl] ${store} (${e.country}): pickup lookup not offered — asked again every 30 min`);
            await logOps("poller", "info", `${store} (${e.country}): Apple offers no pickup lookups there ("${e.message}") — asking it again every 30 min instead of every round`, { host: HOST, store, country: e.country, since: e.since }).catch(() => undefined);
          }
          for (const store of step.cleared) {
            console.log(`[intl] ${store}: pickup lookups back — polled every round again`);
            await logOps("poller", "info", `${store}: Apple answers pickup lookups there again — back in every round`, { host: HOST, store }).catch(() => undefined);
          }
        }
        if (r.requests >= 10 && r.throttled / r.requests >= 0.5) {
          backoffUntil = Date.now() + 60_000;
          await logOps("poller", "warn", `other countries throttled: ${r.throttled} of ${r.requests} requests — pausing them for 60 s`, { host: HOST }).catch(() => undefined);
        }
        // One country failing (throttled, refused, timing out, answering without its store) rests on its own,
        // so it neither drags every round through its retries nor floods poll_log; the others carry on.
        for (const [cc, cr] of Object.entries(r.byCountry ?? {})) {
          const next = nextCountryBackoff(countryRest.get(cc), cr!, Date.now());
          if (!next) { countryRest.delete(cc); continue; }
          countryRest.set(cc, next);
          await logOps("poller", "warn", `${cc}: ${cr!.failed} of ${cr!.tasks} requests failed (${cr!.throttled} throttled) — pausing it for ${Math.round((next.until - Date.now()) / 1000)} s`, { host: HOST, country: cc, level: next.level, sweepId: r.id }).catch(() => undefined);
        }
      }
    } catch (e) {
      intlStats.errors++;
      if (Date.now() - lastErrorLog > 10 * 60_000) {
        lastErrorLog = Date.now();
        await recordError("poller", `round of the other countries failed: ${errorMessage(e)}`, { host: HOST }).catch(() => undefined);
      }
    }
    if (generation !== intlGeneration) break;
    intlProgress = Date.now();
    await new Promise((r) => setTimeout(r, Math.max(1_000, INTL_CADENCE_SEC * 1000 - (Date.now() - t0))));
  }
  console.warn(`[intl] loop ${generation} ended (superseded by ${intlGeneration})`);
}

/* ---------------- cluster: duties, takeover, fence ---------------- */

/** What this host polls now (stock/cluster.ts decides; nothing until the first check has run). */
let duty: Duties = { us: false, intl: false, fenced: false, why: "starting" };
/**
 * A US round (the anchor sweep, a fast-lane round with US stores) still running after `duty.us` went false: the
 * alive record keeps saying "us" until it has finished, and the US worker waits for that before it starts.
 */
const usBusy = { sweep: false, fast: false };

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`no answer in ${ms} ms`)), ms))]);
}

/** The site's view of the primary database (/api/health?db=1); null when the site does not answer. */
async function siteSaysPrimaryOk(): Promise<boolean | null> {
  try {
    const r = await fetch(`${SITE}/api/health?shallow=1&db=1`, { signal: AbortSignal.timeout(8_000), headers: { "cache-control": "no-cache" } });
    const j = (await r.json()) as { databases?: { primary?: { ok?: boolean } } };
    return typeof j.databases?.primary?.ok === "boolean" ? j.databases.primary.ok : null;
  } catch {
    return null;
  }
}

/** Standby only: promote the local replica to primary, with the next epoch (see cluster.ts). */
async function takeOver(cluster: ClusterRecord | null, why: string) {
  const local = targetPool("standby");
  if (!local) return;
  console.error(`[cluster] taking over: ${why}`);
  await local.query("select pg_promote(true, 60)");
  const record: ClusterRecord & { promotedAt: string; from: string | null } = { primary: HOST, epoch: (cluster?.epoch ?? 1) + 1, promotedAt: new Date().toISOString(), from: cluster?.primary ?? null };
  await local.query("insert into poller_state (key, value, updated_at) values ('cluster', $1, now()) on conflict (key) do update set value = excluded.value, updated_at = now()", [JSON.stringify(record)]);
  await recheckDatabases();
  await logOps("poller", "error", `${HOST} took over: its database is now the primary (epoch ${record.epoch})`, { host: HOST, why, from: record.from }).catch(() => undefined);
  await notifyOwner(
    `[PickupChecker] ${HOST} took over from ${record.from ?? "the primary"}`,
    `The primary database was unreachable from ${HOST} and from the site for a minute (${why}).\n${HOST} promoted its replica (epoch ${record.epoch}) and now polls the other countries and sends their alerts; the US (sweep and fast lane) stays with the US worker while it reports in, else ${HOST} polls it too. The site follows by itself.\n\nWhen the old primary is back it fences itself (no polling, never chosen by the site). Make it the new standby with infra/linode/standby.sh (docs/architecture.md, 热备主机).`,
  ).catch(() => undefined);
}

/** Old primary only: record in its own database who the primary is now, so nothing ever picks it again. */
async function fence(cluster: ClusterRecord) {
  const local = targetPool("primary");
  if (!local) return;
  await local.query("update poller_state set value = $1, updated_at = now() where key = 'cluster'", [JSON.stringify({ ...cluster, fencedAt: new Date().toISOString() })]);
}

/** Every ALIVE_EVERY_MS: decide this host's duties, run the takeover check (standby) or fence (old primary), report alive. */
async function clusterLoop(intlConfigured: boolean) {
  const promote: PromoteState = { misses: 0 };
  let fenced = false, last = "";
  for (;;) {
    try {
      const st = await dbStatus();
      const writable = st ? st.writable : true;
      const [cluster, alive] = await Promise.all([readCluster().catch(() => null), readAlive().catch(() => null)]);
      // Without the other hosts' records a decision could start a second writer of the US stores: keep the last one
      // (a database that refuses writes means no duties either way). The standby's takeover check below still runs.
      if (alive || !writable) duty = duties({ me: HOST, role: ROLE, cluster, alive: alive ?? [], now: new Date(), intlConfigured, writable });
      if (duty.fenced && cluster && !fenced) {
        fenced = true;
        await fence(cluster);
        await logOps("poller", "error", `${HOST} is fenced: ${duty.why}`, { host: HOST, cluster }).catch(() => undefined);
        await notifyOwner(`[PickupChecker] ${HOST} is fenced (${cluster.primary} is the primary now)`, `${HOST} came back after ${cluster.primary} took over (epoch ${cluster.epoch}). It does not poll, and the site never chooses its database again. Make it the new standby with infra/linode/standby.sh (docs/architecture.md, 热备主机).`).catch(() => undefined);
      }
      let replicaInfo: { status: string | null; lagSec: number | null } | null = null;
      if (ROLE === "standby") {
        const local = targetPool("standby"), remote = targetPool("primary");
        const replica = local ? Boolean((await withTimeout(local.query("select pg_is_in_recovery() as r"), 3_000)).rows[0]?.r) : false;
        if (replica && local) {
          const r = (await withTimeout(local.query("select (select status from pg_stat_wal_receiver) as status, extract(epoch from now() - pg_last_xact_replay_timestamp())::float8 as lag"), 3_000)).rows[0] as { status: string | null; lag: number | null };
          replicaInfo = { status: r?.status ?? null, lagSec: r?.lag == null ? null : Number(r.lag) };
        }
        if (replica && remote) {
          const primaryOk = await withTimeout(remote.query("select 1"), 3_000).then(() => true, () => false);
          const step = promoteStep(promote, primaryOk, primaryOk ? true : await siteSaysPrimaryOk());
          promote.misses = step.next.misses;
          if (step.next.misses === 1) console.warn(`[cluster] ${step.why}`);
          if (step.promote) await takeOver(cluster, step.why);
        }
      }
      const label = dutyLabel({ ...duty, us: duty.us || usBusy.sweep || usBusy.fast });
      if (label !== last) {
        console.log(`[cluster] ${HOST} (${ROLE}) duties: ${label} — ${duty.why}`);
        await logOps("poller", "info", `${HOST} duties: ${label} (${duty.why})`, { host: HOST, role: ROLE, epoch: cluster?.epoch ?? null }).catch(() => undefined);
        last = label;
      }
      if (writable) {
        await writeState(`alive:${HOST}`, {
          host: HOST, at: new Date().toISOString(), role: ROLE, duties: label, why: duty.why, epoch: cluster?.epoch ?? null, commit: COMMIT,
          intl: duty.intl ? intlStats : null, fast: duty.us || duty.intl ? fastStats : null, sys: hostVitals(), db: st ? { using: st.using, writable: st.writable } : null, replica: replicaInfo,
        });
      }
    } catch (e) {
      console.warn(`[cluster] check failed: ${errorMessage(e)}`);
    }
    await new Promise((r) => setTimeout(r, ALIVE_EVERY_MS));
  }
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
  const intlOn = Boolean(ipv6 && POLL_COUNTRIES.length > 0 && INTL_CADENCE_SEC > 0);
  console.log(`[poller] start host=${HOST} role=${ROLE} mode=${mode} cadence=${CADENCE_SEC}s prefix=${PREFIX || "(none)"}${intlOn ? ` intl=${POLL_COUNTRIES.join(",")}/${INTL_CADENCE_SEC}s` : ""}`);
  const intlConfig = intlOn ? { pollCountries: POLL_COUNTRIES, intlCadenceSec: INTL_CADENCE_SEC, intlConcurrency: INTL_CONCURRENCY } : {};
  const config = { host: HOST, role: ROLE, cadenceSec: CADENCE_SEC, concurrency: CONCURRENCY, fastCadenceSec: FAST_CADENCE_SEC, ...intlConfig, prefix: PREFIX || null, startedAt: new Date().toISOString(), commit: COMMIT, node: process.version };
  // "poller:config" is the primary's (the admin System page reads it); every host also keeps its own.
  if (ROLE === "primary") await writeState("poller:config", config);
  await writeState(`poller:config:${HOST}`, config);
  await logOps("poller", "info", `poller started (${mode}, ${ROLE})`, { host: HOST, role: ROLE, cadenceSec: CADENCE_SEC, concurrency: CONCURRENCY, fastCadenceSec: FAST_CADENCE_SEC, ...intlConfig, prefix: PREFIX || null, commit: COMMIT, node: process.version });
  // Duties first: a standby must not poll the US for even one round before it knows it is not the primary.
  void clusterLoop(intlOn);
  for (let i = 0; i < 30 && duty.why === "starting"; i++) await new Promise((r) => setTimeout(r, 500));
  if (ipv6 && FAST_CADENCE_SEC > 0) void fastLoop(ipv6, () => mode === "full" && (duty.us || duty.intl));
  const startIntl = () => { if (intlOn && ipv6) void intlLoop(ipv6, () => mode === "full" && duty.intl, intlGeneration); };
  startIntl();
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
  let exiting = false;
  let intlGivenUp = false;
  setInterval(() => {
    if (exiting) return;
    // The other countries' loop is watched too, but a hung round of theirs only starts their loop over: the old
    // one is abandoned (it quits if it ever returns) and the US sweep is never restarted on their account.
    if (intlOn && !intlGivenUp && Date.now() - intlProgress >= INTL_STUCK_MS) {
      const sec = Math.round((Date.now() - intlProgress) / 1000);
      intlGeneration++; intlStats.restarts++; intlProgress = Date.now();
      const now = Date.now();
      while (intlRestartTimes.length && now - intlRestartTimes[0] > 3600_000) intlRestartTimes.shift();
      intlRestartTimes.push(now);
      // An abandoned round may still hold sockets and connections: past a few restarts an hour, stop adding loops.
      intlGivenUp = intlRestartTimes.length > INTL_MAX_RESTARTS_PER_HOUR;
      const what = intlGivenUp ? `stuck ${intlRestartTimes.length} times in an hour — left off until the poller restarts` : "starting their loop over";
      console.error(`[intl] no round finished for ${sec} s — ${what}`);
      void logOps("poller", "error", `round of the other countries stuck — ${what} (the US sweep is not restarted)`, { host: HOST, stuckSec: sec, restarts: intlStats.restarts }).catch(() => undefined);
      void recordError("poller", `round of the other countries stuck — ${intlGivenUp ? "left off" : "loop started over"}`, { host: HOST, stuckSec: sec }).catch(() => undefined);
      // Left off is not "paused": the watchdog keeps judging those countries, so their going stale is mailed.
      if (intlGivenUp) intlStats.stopped = true;
      else startIntl();
    }
    if (Date.now() - lastProgress < STUCK_MS) return;
    exiting = true;
    const sec = Math.round((Date.now() - lastProgress) / 1000);
    console.error(`[poller] no sweep finished for ${sec} s — exiting for a restart`);
    void logOps("poller", "error", "sweep stuck — restarting the process", { host: HOST, stuckSec: sec }).catch(() => undefined);
    setTimeout(() => process.exit(1), 2000);
  }, 10_000);

  for (;;) {
    const t0 = Date.now();
    if (!duty.us) {
      // Not polling the US here (a standby, a primary that handed it to the US worker, no writable database):
      // nothing to sweep, and idling is not being stuck.
      lastProgress = Date.now();
      await new Promise((r) => setTimeout(r, 2_000));
      continue;
    }
    usBusy.sweep = true; // before the first await (see usBusy)
    try {
      const egress = mode === "full" && ipv6 ? ipv6 : spare;
      // Spare identities have a few requests per half hour: spend them on watched, stale pairs first.
      // About 50 requests per 35 min between the two (25 each): one every 40 s spreads them evenly.
      const tasks = egress === spare ? (await fallbackOrder(buildTasks()).catch(() => buildTasks())).slice(0, 1) : undefined;
      // The spare egress keeps the 15 s default (the Vercel hop adds its own latency).
      const r = await runSweep({ egress, tasks, concurrency: mode === "full" ? CONCURRENCY : 1, mode, host: HOST, retryFailed: egress !== spare, confirm: egress !== spare, ...(egress === spare ? {} : { timeoutMs: SWEEP_TIMEOUT_MS }) });
      const throttledShare = r.requests ? r.throttled / r.requests : 0;
      const failedShare = r.tasks ? r.unresolved / r.tasks : 0;
      await writeHeartbeat({
        at: new Date().toISOString(), host: HOST, mode, cadenceSec: CADENCE_SEC, lastSweepId: r.id,
        requests: r.requests, failures: r.failures, recovered: r.recovered, unresolved: r.unresolved, throttled: r.throttled, storesCovered: r.storesCovered,
        transitions: r.transitions, held: r.held, confirmed: r.confirmed, notified: r.notified, durationMs: r.durationMs, egress: egress.name,
        ipv6Stats: ipv6 ? ipv6.stats : null, fast: ipv6 && FAST_CADENCE_SEC > 0 ? fastStats : null, ...(duty.intl ? { intl: intlStats } : {}), sys: hostVitals(), sweeps: ++sweepsSinceStart, consecutiveBad, role: ROLE,
      });
      lastProgress = Date.now();
      console.log(`[sweep ${r.id.slice(0, 8)}] ${mode}/${egress.name} req=${r.requests} fail=${r.failures} recovered=${r.recovered} unresolved=${r.unresolved} 541=${r.throttled} stores=${r.storesCovered} trans=${r.transitions} confirmed=${r.confirmed} held=${r.held} sent=${r.notified.sent} ${r.durationMs}ms`);

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
    } finally {
      usBusy.sweep = false;
    }
    const elapsed = Date.now() - t0;
    const pause = mode === "full" ? Math.max(2_000, CADENCE_SEC * 1000 - elapsed + (consecutiveBad ? 40_000 : 0)) : Math.max(2_000, 40_000 - elapsed);
    await new Promise((r) => setTimeout(r, pause));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
