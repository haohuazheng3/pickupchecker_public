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
import type { Lang } from "../i18n/locales";
import { dict } from "../i18n/dict";
import { hour as hourIn, num, plural, stamp, weekdays } from "../i18n/format";

/** Tracking of the 269 US stores began on this day; the 18 other countries on the second date. */
export const TRACKING_SINCE_US = "2026-10-29";
export const TRACKING_SINCE_INTL = "2026-11-02";
/**
 * A store's "usual hour" is stated from PATTERN_MIN restocks on PATTERN_MIN_DAYS different local days (ten restocks
 * in one burst are one event, not a habit), its busiest weekday only once its restocks span WEEKDAY_MIN_SPAN days
 * (the 18 other countries were first tracked on a Monday: every one of them would be "busiest on Monday").
 */
export const PATTERN_MIN = 5;
export const PATTERN_MIN_DAYS = 3;
export const WEEKDAY_MIN_SPAN = 14;
export const PATTERN_DAYS = 30;

export interface StorePattern {
  storeNumber: string;
  restocks: number;
  /** Local days with at least one restock. */
  days: number;
  /** Local hour (0–23) with the most restocks; null below PATTERN_MIN restocks or PATTERN_MIN_DAYS days. */
  peakHour: number | null;
  /** 0 = Sunday; null until the restocks span WEEKDAY_MIN_SPAN days. */
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
  /**
   * iPhone Duo restocks of the last 7 days that sold out: how many, the median seconds until gone, the share gone
   * within 30 s, and the share a tracker checking every 1 / 5 / 15 minutes would ever see (a listing lasting d seconds
   * is caught by a check every T seconds with chance min(1, d/T)). Durations are upper bounds (to the next check),
   * so the catch rates flatter slower trackers, never us.
   */
  duoSellout: { n: number; medianSec: number; within30: number; caught: { m1: number; m5: number; m15: number } } | null;
  /** Store → pattern over the last PATTERN_DAYS, for every store with at least one restock. */
  patterns: Record<string, StorePattern>;
}

const EMPTY: SiteFacts = { at: new Date(0).toISOString(), restocks: 0, soldouts: 0, restockStores: 0, duoSellout: null, patterns: {} };

/** Pure: the Duo sell-out facts from restock lifetimes (seconds); null under 20. */
export function duoSelloutFrom(secs: number[]): SiteFacts["duoSellout"] {
  if (secs.length < 20) return null;
  const v = [...secs].sort((a, b) => a - b);
  const median = v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
  const caught = (t: number) => v.reduce((a, d) => a + Math.min(1, d / t), 0) / v.length;
  return { n: v.length, medianSec: Math.round(median), within30: v.filter((d) => d <= 30).length / v.length, caught: { m1: caught(60), m5: caught(300), m15: caught(900) } };
}

/** Pure: local hour, weekday and date (YYYY-MM-DD) of an instant in a zone. */
export function localHourDay(iso: string, tz: string): { hour: number; weekday: number; date: string } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = Number(get("hour") || 0) % 24;
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday") || "Sun");
  return { hour, weekday: Math.max(0, weekday), date: `${get("year")}-${get("month")}-${get("day")}` };
}

/** Pure: per-store patterns from restock instants (ISO) and median stays. */
export function patternsFrom(restocks: { storeNumber: string; at: string }[], stays: Record<string, number>, tzOf: (store: string) => string): Record<string, StorePattern> {
  const by = new Map<string, string[]>();
  for (const r of restocks) by.set(r.storeNumber, [...(by.get(r.storeNumber) ?? []), r.at]);
  const out: Record<string, StorePattern> = {};
  for (const [store, ats] of by) {
    const hours = Array(24).fill(0), weekdays = Array(7).fill(0), dates = new Set<string>();
    const tz = tzOf(store);
    for (const at of ats) { const { hour, weekday, date } = localHourDay(at, tz); hours[hour]++; weekdays[weekday]++; dates.add(date); }
    const sorted = [...dates].sort();
    const spanDays = sorted.length ? Math.round((Date.parse(sorted[sorted.length - 1]) - Date.parse(sorted[0])) / 86400_000) + 1 : 0;
    const enough = ats.length >= PATTERN_MIN && dates.size >= PATTERN_MIN_DAYS;
    out[store] = {
      storeNumber: store,
      restocks: ats.length,
      days: dates.size,
      peakHour: enough ? hours.indexOf(Math.max(...hours)) : null,
      peakWeekday: enough && spanDays >= WEEKDAY_MIN_SPAN ? weekdays.indexOf(Math.max(...weekdays)) : null,
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
      duoSellout: duoSelloutFrom(duo.map((p) => Number(p.secs))),
      patterns: patternsFrom(recent.map((r) => ({ storeNumber: r.store_number, at: iso(r.at) })), stays, tzOfStore),
    };
  },
  ["site-facts-v3"],
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

/** English weekday names, Sunday first; `weekdayName(i, lang)` for a page's language. */
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export function weekdayName(i: number, lang: Lang = "en"): string {
  return lang === "en" ? WEEKDAYS[i] : weekdays(lang)[i];
}

/** "8 AM", "noon", "midnight" ("8時", "8 Uhr" in other languages). */
export function hourLabel(h: number, lang: Lang = "en"): string {
  if (lang !== "en") return hourIn(lang, h, true);
  return h === 0 ? "midnight" : h === 12 ? "noon" : h < 12 ? `${h} AM` : `${h - 12} PM`;
}

/** A number in these sentences: English raw, as always; other languages grouped. */
const N = (n: number, lang: Lang) => (lang === "en" ? String(n) : num(lang, n));
/** Plural forms with English exactly as before ("1 confirmed restock", "2 days"). */
const count = (n: number, forms: { one?: string; other: string }, lang: Lang) => (lang === "en" ? (n === 1 ? forms.one ?? forms.other : forms.other).replace(/#/g, String(n)) : plural(lang, n, forms));

/** "Usually restocks around 8 AM local time[, busiest on Friday]; 30 confirmed restocks in the last 30 days; typically listed ~5 min…" */
export function patternSentence(p: StorePattern | undefined, lang: Lang = "en"): string {
  const d = dict(lang).content.pattern;
  const days = N(PATTERN_DAYS, lang);
  if (!p) return d.none(days);
  const restocks = d.countIn(count(p.restocks, d.nConfirmed, lang), days);
  const stay = p.medianStayMin != null ? d.stay(N(p.medianStayMin, lang)) : "";
  if (p.peakHour == null) return d.tooFew(restocks, p.days > 0 && p.days < PATTERN_MIN_DAYS ? count(p.days, d.nDays, lang) : null, stay);
  return d.usual(hourLabel(p.peakHour, lang), p.peakWeekday != null ? weekdayName(p.peakWeekday, lang) : null, restocks, stay);
}

/** "Nov 2, 2:31 PM" in the store's own zone ("2. Nov., 14:31" in German). */
export function localStamp(iso: string, store: Pick<Store, "storeNumber" | "country" | "timeZone" | "state">, lang: Lang = "en"): string {
  if (lang !== "en") return stamp(lang, iso, storeTimeZone(store as Store));
  return new Intl.DateTimeFormat("en-US", { timeZone: storeTimeZone(store as Store), month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

export { storePath, countryOfStore };
