/**
 * When polling goes wrong, and what takes over. Judged by the data, not by the poller saying it is alive:
 * a heartbeat proves the process runs, not that Apple answers it (a blocked /56 or a broken IPv6 route
 * keeps the heartbeat ticking while nothing gets checked).
 *
 *  • silent  — no heartbeat for HEARTBEAT_STALE_MS: the poller (or its host) is gone. Vercel fills in.
 *  • blind   — heartbeat fresh, but under half of store × phone pairs were checked in the last minute.
 *              The poller falls back to its own spare egress; the owner is mailed.
 *  • partial — some stores have gone unchecked for PARTIAL_SEC (a region's requests keep failing).
 *  • ok
 *
 * Serverless fill-in (degraded mode) has about one request a minute, so it spends it where it matters:
 * stores × phones that paying alerts watch and that have gone stale, then whatever is oldest.
 *
 * All of the above is about the US (its anchor sweep, its spare egress, the Vercel fill-in), exactly as before
 * other countries were polled. The other countries are judged on their own (intlVerdict): each country's share
 * of pairs checked within INTL_FRESH_FACTOR × its cadence. Their state is reported (health, watchdog mail) but
 * never turns the US silent or blind and never starts the fill-in, which only serves the US.
 */
import { eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { countryOfStore, partNumbersForStore, type ModelKey } from "../apple/catalog";
import { COUNTRIES, INTL_CODES, type CountryCode } from "../apple/countries";
import { coveredWatchIds, effectivePlan } from "../plans";
import type { SweepTask } from "./sweep";

export const HEARTBEAT_STALE_MS = 75_000;
/**
 * A heartbeat this old *and* stale data means the poller is gone, not blind: fill in a minute sooner.
 * Normal rounds beat every ~15–30 s, the poller's own spare mode every ~40 s, so this never fires on them.
 */
export const HEARTBEAT_LATE_MS = 60_000;
/** A pair counts as fresh when it was checked this recently (cadence 15 s, so ~4 rounds of slack). */
export const FRESH_SEC = 60;
/** A store unchecked this long means its requests keep failing, not a blip. */
export const PARTIAL_SEC = 90;
/** A watched pair younger than this doesn't need serverless help yet. */
const WATCHED_REFRESH_SEC = 60;

/** Other countries: fresh = checked within this many of their rounds; partial = a store unchecked for this many. */
export const INTL_FRESH_FACTOR = 4;
export const INTL_PARTIAL_FACTOR = 6;
/** The other countries' default cadence (countries.ts; the poller's INTL_CADENCE_SEC, which the heartbeat reports). */
export const INTL_CADENCE_SEC = COUNTRIES.ca.cadenceSec;

export interface CountryFreshness {
  pairs: number;
  freshPairs: number;
  stores: number;
  staleStores: string[];
  oldestSec: number | null;
}

/** The US figures at the top level (what pollerVerdict judges); other countries under `intl`, when they have rows. */
export interface Freshness extends CountryFreshness {
  /** Stores with at least one phone not checked for PARTIAL_SEC. */
  staleStores: string[];
  intl?: Partial<Record<CountryCode, CountryFreshness>>;
  /** The window `intl` freshness was measured over (seconds). */
  intlFreshSec?: number;
}

export interface FreshnessRow { store_number: string; pairs: number; fresh: number; fresh_intl?: number; oldest: number | null }

/**
 * Pure: per-store rows → the US totals (every store not known as another country's, as before) and one entry
 * per other country, with that country's own windows.
 */
export function freshnessFromRows(rows: FreshnessRow[], intlCadenceSec = INTL_CADENCE_SEC): Freshness {
  const intlPartial = INTL_PARTIAL_FACTOR * intlCadenceSec;
  let pairs = 0, freshPairs = 0, stores = 0, oldest: number | null = null;
  const staleStores: string[] = [];
  const intl: Partial<Record<CountryCode, CountryFreshness>> = {};
  for (const r of rows) {
    const cc = countryOfStore(r.store_number);
    if (cc && cc !== "us") {
      const e = (intl[cc] ??= { pairs: 0, freshPairs: 0, stores: 0, staleStores: [], oldestSec: null });
      e.pairs += r.pairs; e.freshPairs += r.fresh_intl ?? r.fresh; e.stores++;
      if (r.oldest != null) { e.oldestSec = Math.max(e.oldestSec ?? 0, r.oldest); if (r.oldest > intlPartial) e.staleStores.push(r.store_number); }
      continue;
    }
    pairs += r.pairs;
    freshPairs += r.fresh;
    stores++;
    if (r.oldest != null) { oldest = Math.max(oldest ?? 0, r.oldest); if (r.oldest > PARTIAL_SEC) staleStores.push(r.store_number); }
  }
  for (const e of Object.values(intl)) e!.staleStores.sort();
  const out: Freshness = { pairs, freshPairs, stores, staleStores: staleStores.sort(), oldestSec: oldest };
  if (Object.keys(intl).length) { out.intl = intl; out.intlFreshSec = INTL_FRESH_FACTOR * intlCadenceSec; }
  return out;
}

export async function freshness(opts: { intlCadenceSec?: number } = {}): Promise<Freshness> {
  const intlCadence = opts.intlCadenceSec && opts.intlCadenceSec > 0 ? opts.intlCadenceSec : INTL_CADENCE_SEC;
  const rows = (await db().execute(sql`
    select store_number, count(*)::int as pairs,
           count(*) filter (where last_checked_at > now() - make_interval(secs => ${FRESH_SEC}))::int as fresh,
           count(*) filter (where last_checked_at > now() - make_interval(secs => ${INTL_FRESH_FACTOR * intlCadence}))::int as fresh_intl,
           extract(epoch from now() - min(last_checked_at))::int as oldest
    from store_sku_status group by store_number`)).rows as unknown as FreshnessRow[];
  return freshnessFromRows(rows, intlCadence);
}

export type IntlState = "ok" | "blind" | "partial";
export interface IntlVerdict {
  state: IntlState;
  countries: { cc: CountryCode; state: IntlState; share: number; staleStores: string[] }[];
  summary: string;
}

/**
 * Pure: how the other countries stand. `enabled` are the countries the poller says it polls (heartbeat), all
 * of them when unknown; an enabled country without a single row counts as blind (nothing ever landed).
 * blind = under half of its pairs fresh; partial = some of its stores stale.
 */
export function intlVerdict(f: Freshness | null, enabled?: CountryCode[]): IntlVerdict | null {
  const list = (enabled ?? (Object.keys(f?.intl ?? {}) as CountryCode[])).filter((cc) => cc !== "us");
  if (!f || list.length === 0) return null;
  const countries = INTL_CODES.filter((cc) => list.includes(cc)).map((cc) => {
    const e = f.intl?.[cc];
    const share = e && e.pairs > 0 ? e.freshPairs / e.pairs : 0;
    const state: IntlState = share < 0.5 ? "blind" : (e?.staleStores.length ?? 0) > 0 ? "partial" : "ok";
    return { cc, state, share, staleStores: e?.staleStores ?? [] };
  });
  const blind = countries.filter((c) => c.state === "blind");
  const partial = countries.filter((c) => c.state === "partial");
  const state: IntlState = blind.length ? "blind" : partial.length ? "partial" : "ok";
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const summary = state === "ok"
    ? `all ${countries.length} other countr${countries.length === 1 ? "y" : "ies"} fresh`
    : [
        ...blind.map((c) => `${c.cc} ${pct(c.share)} fresh`),
        ...partial.map((c) => `${c.cc} ${c.staleStores.length} store${c.staleStores.length === 1 ? "" : "s"} stale (${c.staleStores.slice(0, 5).join(", ")}${c.staleStores.length > 5 ? " …" : ""})`),
      ].join("; ");
  return { state, countries, summary };
}

/** The other countries' watchdog state ("watchdog:intl"), kept apart from the US one (their trouble never changes what the US does). */
export interface IntlWatchState { runs: number; mailed: boolean; since?: string | null; countries?: string[]; okRuns?: number }
/** Judged watchdog runs in a row with a blind country before the owner is mailed. */
export const INTL_RUNS = 3;
/** Judged runs in a row with nothing blind, after that mail, before the recovery is mailed (a country wobbling at the line is one episode). */
export const INTL_RECOVER_RUNS = 5;

/**
 * Pure: one watchdog run of the other countries. Blind for INTL_RUNS judged runs in a row → mail "blind" once;
 * nothing blind for INTL_RECOVER_RUNS judged runs in a row after that mail → mail "recovered". A country that
 * comes back and relapses in between is the same episode: no second mail, and the recovery mail names every
 * country the episode touched. A run that is not judged (paused, degraded, the US not fine, disabled) breaks both
 * streaks — the counts start again from zero, so runs scattered over an hour (the 15-minute full-mode probes of a
 * degraded poller) never add up to a mail — and an outstanding mail stays so.
 */
export function intlWatchStep(st: IntlWatchState, judged: boolean, blind: string[], now: Date): { next: IntlWatchState; mail: "blind" | "recovered" | null; write: boolean } {
  const okRuns = st.okRuns ?? 0;
  if (!judged) return { next: { ...st, runs: 0, okRuns: 0 }, mail: null, write: st.runs !== 0 || okRuns !== 0 };
  if (blind.length) {
    const countries = st.mailed ? [...new Set([...(st.countries ?? []), ...blind])].sort() : blind;
    const next: IntlWatchState = { ...st, runs: st.runs + 1, okRuns: 0, countries };
    if (next.runs >= INTL_RUNS && !st.mailed) return { next: { ...next, mailed: true, since: now.toISOString() }, mail: "blind", write: true };
    return { next, mail: null, write: true };
  }
  const idle: IntlWatchState = { runs: 0, mailed: false, since: null, countries: [] };
  if (!st.mailed) return { next: idle, mail: null, write: st.runs !== 0 || okRuns !== 0 };
  if (okRuns + 1 >= INTL_RECOVER_RUNS) return { next: idle, mail: "recovered", write: true };
  return { next: { ...st, runs: 0, okRuns: okRuns + 1 }, mail: null, write: true };
}

export type PollerState = "ok" | "silent" | "blind" | "partial";

export function pollerVerdict(heartbeatAgeMs: number, f: Freshness | null): { state: PollerState; fill: boolean; summary: string } {
  const share = f && f.pairs > 0 ? f.freshPairs / f.pairs : null;
  if (!(heartbeatAgeMs <= HEARTBEAT_STALE_MS) || (heartbeatAgeMs > HEARTBEAT_LATE_MS && share != null && share < 0.5)) {
    const age = Number.isFinite(heartbeatAgeMs) ? `${Math.round(heartbeatAgeMs / 1000)} s` : "ever";
    return { state: "silent", fill: true, summary: `no poller heartbeat for ${age}` };
  }
  if (f && share != null) {
    if (share < 0.5) return { state: "blind", fill: false, summary: `poller alive, but only ${Math.round(share * 100)}% of store × phone pairs checked in the last minute` };
    if (f.staleStores.length > 0) return { state: "partial", fill: false, summary: `${f.staleStores.length} store${f.staleStores.length === 1 ? "" : "s"} not checked for over ${PARTIAL_SEC} s: ${f.staleStores.slice(0, 10).join(", ")}${f.staleStores.length > 10 ? " …" : ""}` };
  }
  return { state: "ok", fill: false, summary: "all stores fresh" };
}

/** "R123|MJQ34LL/A" */
export const pairKey = (store: string, part: string) => `${store}|${part}`;

/**
 * Serverless order: tasks that refresh stale watched pairs first (stalest first), then by the oldest pair
 * they cover. Checking a task makes its pairs fresh, so the next call moves on by itself — no cursor.
 */
export function orderTasks(tasks: SweepTask[], watched: Set<string>, ageSec: (store: string, part: string) => number): SweepTask[] {
  return tasks
    .map((t, i) => {
      let watchedAge = 0, oldest = 0;
      for (const s of t.anchor.covers) for (const p of t.parts) {
        const a = ageSec(s, p);
        if (a > oldest) oldest = a;
        if (watched.has(pairKey(s, p)) && a > watchedAge) watchedAge = a;
      }
      return { t, i, urgent: watchedAge > WATCHED_REFRESH_SEC ? watchedAge : 0, oldest };
    })
    .sort((a, b) => b.urgent - a.urgent || b.oldest - a.oldest || a.i - b.i)
    .map((x) => x.t);
}

/** Store × phone pairs that alerts actually send for (active, not paused, inside the owner's plan). */
export async function watchedPairs(): Promise<Set<string>> {
  const d = db();
  const rules = await d
    .select({ id: schema.watches.id, userId: schema.watches.userId, model: schema.watches.model, storages: schema.watches.storages, colors: schema.watches.colors, storeNumbers: schema.watches.storeNumbers, active: schema.watches.active, paused: schema.watches.paused, createdAt: schema.watches.createdAt })
    .from(schema.watches)
    .where(eq(schema.watches.active, true));
  if (rules.length === 0) return new Set();
  const userIds = [...new Set(rules.map((r) => r.userId))];
  const subs = await d.select().from(schema.subscriptions).where(inArray(schema.subscriptions.userId, userIds));
  const out = new Set<string>();
  for (const uid of userIds) {
    const mine = rules.filter((r) => r.userId === uid);
    const covered = coveredWatchIds(mine, effectivePlan(subs.filter((s) => s.userId === uid)).plan.limit);
    for (const r of mine) {
      if (r.paused || !covered.has(r.id)) continue;
      // Each store's own country's part numbers (a UK rule watches …QN/A parts at a UK store).
      for (const s of r.storeNumbers) for (const part of partNumbersForStore(s, r.model as ModelKey, r.storages, r.colors)) out.add(pairKey(s, part));
    }
  }
  return out;
}

/** The serverless order for this moment (see orderTasks). Never-checked pairs count as the oldest. */
export async function fallbackOrder(tasks: SweepTask[]): Promise<SweepTask[]> {
  const [watched, ages] = await Promise.all([
    watchedPairs(),
    db().execute(sql`select store_number, part_number, extract(epoch from now() - last_checked_at)::int as age from store_sku_status`),
  ]);
  const age = new Map<string, number>();
  for (const r of ages.rows as { store_number: string; part_number: string; age: number | null }[]) age.set(pairKey(r.store_number, r.part_number), r.age ?? 1e9);
  return orderTasks(tasks, watched, (s, p) => age.get(pairKey(s, p)) ?? 1e9);
}

/* ---------------- the US watchdog's mail state machine ---------------- */

/**
 * The US watchdog state ("watchdog" key). `down` = an episode of silent/blind is open (the admin board shows it
 * from the first bad minute); the mails inside an episode are usWatchStep's.
 */
export interface UsWatchState {
  down: boolean;
  kind?: PollerState;
  since?: string | null;
  lastMail?: string | null;
  /** Bad (silent/blind) runs in a row: the first mail waits for BAD_RUNS of them. */
  badRuns?: number;
  /** Fine runs in a row since the last bad one: the recovery mail waits for RECOVER_RUNS of them. */
  okRuns?: number;
  /** Times the episode looked over and came back (the recovery mail says so). */
  relapses?: number;
  partialRuns?: number;
  partialMailed?: boolean;
  partialOkRuns?: number;
}
export const US_IDLE: UsWatchState = { down: false };
/** Minutes silent/blind in a row before the owner is mailed (the fill-in starts at once regardless). */
export const BAD_RUNS = 2;
/**
 * Fine minutes in a row before "back to normal" is mailed. 2026-11-06: Apple answered slowly for two hours and the
 * US share of fresh pairs crossed 50 % eleven times — with a mail per crossing that was 22 mails for one episode.
 */
export const RECOVER_RUNS = 5;
export const REMIND_MS = 3 * 60 * 60 * 1000;
/** Minutes a "partial" picture must persist before it is worth a mail (restarts and blips clear sooner). */
export const PARTIAL_RUNS = 3;
/** Fine minutes in a row before "every store checked again" is mailed. */
export const PARTIAL_CLEAR_RUNS = 5;

export type UsMail = "silent" | "blind" | "remind" | "recovered" | "partial" | "partial-cleared";

/**
 * Pure: one watchdog run of the US. An episode opens on the first silent/blind run and closes after RECOVER_RUNS
 * fine runs in a row; inside it there is at most one first mail (after BAD_RUNS bad runs — silent or blind,
 * whichever it is then), one more if blind escalates to silent after that mail (the fill-in has started), a
 * reminder every REMIND_MS, and one recovery mail when it closes — none when it closed before any mail went out.
 * The partial picture is judged only outside an episode (its stale stores are the episode's symptom); it mails
 * after PARTIAL_RUNS partial runs and clears after PARTIAL_CLEAR_RUNS fine ones, with the same one-per-episode rule.
 */
export function usWatchStep(st: UsWatchState, state: PollerState, now: Date): { next: UsWatchState; mail: UsMail | null } {
  const t = now.getTime();
  if (state === "silent" || state === "blind") {
    const badRuns = (st.badRuns ?? 0) + 1;
    const relapses = (st.relapses ?? 0) + (st.down && (st.okRuns ?? 0) > 0 ? 1 : 0);
    const base: UsWatchState = { ...st, down: true, kind: state, since: st.down && st.since ? st.since : now.toISOString(), badRuns, okRuns: 0, relapses };
    if (!st.lastMail) return badRuns >= BAD_RUNS ? { next: { ...base, lastMail: now.toISOString() }, mail: state } : { next: base, mail: null };
    const escalated = st.kind === "blind" && state === "silent";
    if (escalated) return { next: { ...base, lastMail: now.toISOString() }, mail: "silent" };
    if (t - new Date(st.lastMail).getTime() > REMIND_MS) return { next: { ...base, lastMail: now.toISOString() }, mail: "remind" };
    return { next: base, mail: null };
  }
  if (st.down) {
    const okRuns = (st.okRuns ?? 0) + 1;
    if (okRuns < RECOVER_RUNS) return { next: { ...st, okRuns, badRuns: 0 }, mail: null };
    return { next: { down: false, partialRuns: 0, partialMailed: Boolean(st.partialMailed), partialOkRuns: 0 }, mail: st.lastMail ? "recovered" : null };
  }
  if (state === "partial") {
    const partialRuns = (st.partialRuns ?? 0) + 1;
    if (partialRuns >= PARTIAL_RUNS && !st.partialMailed) return { next: { down: false, partialRuns, partialMailed: true, partialOkRuns: 0 }, mail: "partial" };
    return { next: { down: false, partialRuns, partialMailed: Boolean(st.partialMailed), partialOkRuns: 0 }, mail: null };
  }
  if (st.partialMailed) {
    const partialOkRuns = (st.partialOkRuns ?? 0) + 1;
    if (partialOkRuns >= PARTIAL_CLEAR_RUNS) return { next: { down: false, partialRuns: 0, partialMailed: false, partialOkRuns: 0 }, mail: "partial-cleared" };
    return { next: { down: false, partialRuns: 0, partialMailed: true, partialOkRuns }, mail: null };
  }
  return { next: { down: false, partialRuns: 0, partialMailed: false, partialOkRuns: 0 }, mail: null };
}

/* ---------------- whose fault a blind minute is ---------------- */

/** The lanes' last minutes from poll_log (the blind mail carries them: who is failing says whose fault it is). */
export interface LaneFailures {
  minutes: number;
  sweep: { requests: number; failed: number; timedOut: number; throttled: number };
  fast: { requests: number; failed: number };
  intlFailed: number;
}

export async function recentFailures(minutes = 5): Promise<LaneFailures> {
  const r = (await db().execute(sql`
    select
      count(*) filter (where country is null and sweep_id not like 'fast%')::int as sweep,
      count(*) filter (where country is null and sweep_id not like 'fast%' and not ok)::int as sweep_failed,
      count(*) filter (where country is null and sweep_id not like 'fast%' and not ok and error like 'timed out%')::int as sweep_timed_out,
      count(*) filter (where country is null and sweep_id not like 'fast%' and http_status = 541)::int as sweep_throttled,
      count(*) filter (where country is null and sweep_id like 'fast%')::int as fast,
      count(*) filter (where country is null and sweep_id like 'fast%' and not ok)::int as fast_failed,
      count(*) filter (where country is not null and not ok)::int as intl_failed
    from poll_log where at > now() - make_interval(mins => ${minutes})`)).rows[0] as Record<string, number>;
  return {
    minutes,
    sweep: { requests: r.sweep, failed: r.sweep_failed, timedOut: r.sweep_timed_out, throttled: r.sweep_throttled },
    fast: { requests: r.fast, failed: r.fast_failed },
    intlFailed: r.intl_failed,
  };
}

/**
 * Pure: the figures and a one-line reading. Timeouts on every lane and in other countries = Apple slow for
 * everyone (nothing to do on the host); 541s = Apple throttling this range; only the big nearby-stores answers
 * timing out while one-store checks land = Apple slow on those; anything else = this host's egress.
 */
export function laneDiagnosis(f: LaneFailures): string {
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  const sweepFail = pct(f.sweep.failed, f.sweep.requests), fastFail = pct(f.fast.failed, f.fast.requests);
  const timeoutsDominate = f.sweep.failed > 0 && f.sweep.timedOut >= f.sweep.failed / 2;
  const figures = `Last ${f.minutes} min — US sweep: ${sweepFail}% of ${f.sweep.requests} requests failed (${pct(f.sweep.timedOut, f.sweep.requests)}% timed out, ${f.sweep.throttled} × 541); US fast lane: ${fastFail}% of ${f.fast.requests} failed; other countries: ${f.intlFailed} failed requests.`;
  let reading: string;
  if (f.sweep.throttled > 0 && f.sweep.throttled >= f.sweep.failed / 2) reading = "Apple is throttling this host's IPv6 range (541): the poller backs off and switches to its spare egress after two bad rounds — see /admin/poller.";
  else if (timeoutsDominate && (f.intlFailed >= 20 || fastFail >= 5)) reading = "Timeouts on every lane and in other countries too: Apple's side is slow for everyone. Nothing to fix on the host; it clears by itself.";
  else if (timeoutsDominate) reading = "Only the big nearby-stores answers time out while the one-store checks (fast lane) land: Apple's side is slow on those. Nothing to fix on the host.";
  else reading = "Failures on this host only: the IPv6 range may be blocked or the route gone — see /admin/poller, then the host (ip -6 route, journalctl -u pickupchecker-poller).";
  return `${figures}\n${reading}`;
}
