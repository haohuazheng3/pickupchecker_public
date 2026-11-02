/**
 * Site-wide facts for answer engines (llms.txt, llms-full.txt, /how-it-works): what PickupChecker has recorded
 * and, per store, when that store's restocks usually land. Everything comes from our own confirmed events
 * (first sightings excluded); other trackers' reports never enter these numbers. Cached an hour.
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db, hasDatabase } from "../db";
import { ALL_STORES, PART_INDEX, countryOfStore, modelKeyFor, storePath, storeTimeZone, type Store } from "../apple/catalog";
import { recordError, errorMessage } from "../errors";

/** Tracking of the 269 US stores began on this day; the 18 other countries on the second date. */
export const TRACKING_SINCE_US = "2026-10-29";
export const TRACKING_SINCE_INTL = "2026-11-02";
/** Fewer restocks than this in the window and a store's "usual hour" is not stated: too little to call a pattern. */
export const PATTERN_MIN = 5;
export const PATTERN_DAYS = 30;

export interface StorePattern {
  storeNumber: string;
  restocks: number;
  /** Local hour (0–23) with the most restocks, null under PATTERN_MIN. */
  peakHour: number | null;
  /** 0 = Sunday, null under PATTERN_MIN. */
  peakWeekday: number | null;
  /** Median minutes a restock stayed listed before it sold out (pairs inside the window). */
  medianStayMin: number | null;
  lastRestockAt: string | null;
}

export interface SiteFacts {
  at: string;
  restocks: number;
  soldouts: number;
  restockStores: number;
  /** Share (0–1) of iPhone Duo restocks in the last 7 days that were gone within 2 minutes, and how many restocks that is about. */
  duoGone2Min: { share: number; restocks: number } | null;
  /** Store → pattern over the last PATTERN_DAYS, for every store with at least one restock. */
  patterns: Record<string, StorePattern>;
}

const EMPTY: SiteFacts = { at: new Date(0).toISOString(), restocks: 0, soldouts: 0, restockStores: 0, duoGone2Min: null, patterns: {} };

/** Pure: local hour and weekday of an instant in a zone. */
export function localHourDay(iso: string, tz: string): { hour: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23", weekday: "short" }).formatToParts(new Date(iso));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.find((p) => p.type === "weekday")?.value ?? "Sun");
  return { hour, weekday: Math.max(0, weekday) };
}

/** Pure: per-store patterns from restock instants (ISO) and median stays. */
export function patternsFrom(restocks: { storeNumber: string; at: string }[], stays: Record<string, number>, tzOf: (store: string) => string): Record<string, StorePattern> {
  const by = new Map<string, string[]>();
  for (const r of restocks) by.set(r.storeNumber, [...(by.get(r.storeNumber) ?? []), r.at]);
  const out: Record<string, StorePattern> = {};
  for (const [store, ats] of by) {
    const hours = Array(24).fill(0), days = Array(7).fill(0);
    const tz = tzOf(store);
    for (const at of ats) { const { hour, weekday } = localHourDay(at, tz); hours[hour]++; days[weekday]++; }
    const enough = ats.length >= PATTERN_MIN;
    out[store] = {
      storeNumber: store,
      restocks: ats.length,
      peakHour: enough ? hours.indexOf(Math.max(...hours)) : null,
      peakWeekday: enough ? days.indexOf(Math.max(...days)) : null,
      medianStayMin: stays[store] ?? null,
      lastRestockAt: ats.reduce((a, b) => (a > b ? a : b)),
    };
  }
  return out;
}

const STORE_BY_NUMBER = new Map(ALL_STORES.map((s) => [s.storeNumber, s]));
const tzOfStore = (n: string) => { const s = STORE_BY_NUMBER.get(n); return s ? storeTimeZone(s) : "UTC"; };

const cached = unstable_cache(
  async (): Promise<SiteFacts> => {
    const d = db();
    const [totals] = (await d.execute(sql`
      select count(*) filter (where kind = 'restock')::int as restocks, count(*) filter (where kind = 'soldout')::int as soldouts,
             count(distinct store_number) filter (where kind = 'restock')::int as stores
      from availability_events where not first_seen`)).rows as { restocks: number; soldouts: number; stores: number }[];
    const recent = (await d.execute(sql`
      select store_number, at from availability_events
      where not first_seen and kind = 'restock' and at > now() - make_interval(days => ${PATTERN_DAYS})`)).rows as { store_number: string; at: string | Date }[];
    // How long each restock stayed listed: from it to the next event of the same store × part, when that is a sell-out.
    const pairs = (await d.execute(sql`
      select store_number, part_number, at, extract(epoch from next_at - at)::float8 as secs from (
        select store_number, part_number, at, kind,
               lead(at) over (partition by store_number, part_number order by at) as next_at,
               lead(kind) over (partition by store_number, part_number order by at) as next_kind
        from availability_events where not first_seen and at > now() - make_interval(days => ${PATTERN_DAYS})
      ) e where kind = 'restock' and next_kind = 'soldout'`)).rows as { store_number: string; part_number: string; at: string | Date; secs: number }[];
    const staysBy = new Map<string, number[]>();
    for (const p of pairs) staysBy.set(p.store_number, [...(staysBy.get(p.store_number) ?? []), Number(p.secs)]);
    const stays: Record<string, number> = {};
    for (const [s, v] of staysBy) { v.sort((a, b) => a - b); stays[s] = Math.max(1, Math.round(v[Math.floor(v.length / 2)] / 60)); }
    const weekAgo = Date.now() - 7 * 86400_000;
    const duo = pairs.filter((p) => new Date(p.at).getTime() > weekAgo && PART_INDEX.get(p.part_number) && modelKeyFor(PART_INDEX.get(p.part_number)!.model) === "duo");
    const iso = (v: string | Date) => new Date(v).toISOString();
    return {
      at: new Date().toISOString(),
      restocks: totals?.restocks ?? 0,
      soldouts: totals?.soldouts ?? 0,
      restockStores: totals?.stores ?? 0,
      duoGone2Min: duo.length >= 20 ? { share: duo.filter((p) => Number(p.secs) <= 120).length / duo.length, restocks: duo.length } : null,
      patterns: patternsFrom(recent.map((r) => ({ storeNumber: r.store_number, at: iso(r.at) })), stays, tzOfStore),
    };
  },
  ["site-facts-v1"],
  { revalidate: 3600 },
);

export async function siteFacts(): Promise<SiteFacts> {
  if (!hasDatabase()) return EMPTY;
  try {
    return await cached();
  } catch (e) {
    await recordError("web", `site facts: ${errorMessage(e)}`).catch(() => undefined);
    return EMPTY;
  }
}

/* ---------------- wording shared by llms.txt, llms-full.txt and /how-it-works ---------------- */

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function hourLabel(h: number): string {
  return h === 0 ? "midnight" : h === 12 ? "noon" : h < 12 ? `${h} AM` : `${h - 12} PM`;
}

/** "Usually restocks around 8 AM local time, busiest on Friday; 30 restocks in the last 30 days; typically listed ~5 min." */
export function patternSentence(p: StorePattern | undefined): string {
  if (!p) return `No confirmed restock in the last ${PATTERN_DAYS} days.`;
  const count = `${p.restocks} confirmed restock${p.restocks === 1 ? "" : "s"} in the last ${PATTERN_DAYS} days`;
  const stay = p.medianStayMin != null ? `; typically listed ~${p.medianStayMin} min before selling out` : "";
  if (p.peakHour == null) return `${count} — too few to call a pattern yet${stay}.`;
  return `Usually restocks around ${hourLabel(p.peakHour)} local time, busiest on ${WEEKDAYS[p.peakWeekday!]}; ${count}${stay}.`;
}

/** "Nov 2, 2:31 PM" in the store's own zone. */
export function localStamp(iso: string, store: Pick<Store, "storeNumber" | "country" | "timeZone" | "state">): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: storeTimeZone(store as Store), month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

export { storePath, countryOfStore };
