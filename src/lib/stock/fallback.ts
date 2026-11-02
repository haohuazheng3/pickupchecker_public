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
export interface IntlWatchState { runs: number; mailed: boolean; since?: string | null; countries?: string[] }
/** Judged watchdog runs in a row with a blind country before the owner is mailed. */
export const INTL_RUNS = 3;

/**
 * Pure: one watchdog run of the other countries. Blind for INTL_RUNS judged runs in a row → mail "blind" once;
 * nothing blind any more after that mail → mail "recovered". A run that is not judged (paused, degraded, the US
 * not fine, disabled) breaks the streak — the count starts again from zero, so runs scattered over an hour (the
 * 15-minute full-mode probes of a degraded poller) never add up to a mail — and an outstanding mail stays so.
 */
export function intlWatchStep(st: IntlWatchState, judged: boolean, blind: string[], now: Date): { next: IntlWatchState; mail: "blind" | "recovered" | null; write: boolean } {
  if (!judged) return { next: { ...st, runs: 0 }, mail: null, write: st.runs !== 0 };
  if (blind.length) {
    const next: IntlWatchState = { ...st, runs: st.runs + 1, countries: blind };
    if (next.runs >= INTL_RUNS && !st.mailed) return { next: { ...next, mailed: true, since: now.toISOString() }, mail: "blind", write: true };
    return { next, mail: null, write: true };
  }
  const next: IntlWatchState = { runs: 0, mailed: false, since: null, countries: [] };
  return { next, mail: st.mailed ? "recovered" : null, write: st.runs !== 0 || st.mailed };
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
