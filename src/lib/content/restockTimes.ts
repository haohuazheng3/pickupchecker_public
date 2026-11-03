/**
 * "When does Apple restock the iPhone Duo?" for one country: the data behind /iphone-duo-restock-times and its
 * country variants. Every confirmed Duo restock since tracking began, bucketed to 30-minute slots in SQL and read
 * here into each store's own local hour and date (a national drop at 9:30 ET is one slot across the zones). The
 * reports other trackers published for the days before our own tracking (restock_reports) fill the launch-week
 * rows of the day-by-day table as a separate, labelled series and are never counted with ours. Cached five
 * minutes; JSON-safe (ISO strings, never Date).
 */
import { unstable_cache } from "next/cache";
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db, hasDatabase, schema } from "../db";
import { PART_INDEX, partNumbersFor, statePath, statesWithStores, storeTimeZone, storesOf, type Store } from "../apple/catalog";
import { COUNTRIES, type CountryCode } from "../apple/countries";
import { countryScope } from "../stock/queries";
import { recordError, errorMessage } from "../errors";
import { PATTERN_MIN, PATTERN_MIN_DAYS, TRACKING_SINCE_INTL, TRACKING_SINCE_US, WEEKDAY_MIN_SPAN, hourLabel, localHourDay } from "./siteFacts";

/** The iPhone Duo went on sale, and Apple Store pickup opened, on this day; pickup reservations resumed the next. */
export const DUO_LAUNCH_DAY = "2026-10-23";
export const DUO_PICKUP_RESUMED = "2026-10-24";

export interface SlotRow { storeNumber: string; partNumber: string; slot: string; n: number; last: string }
export interface ReportSlotRow { storeNumber: string; slot: string; n: number }

export interface DayRow {
  /** Local date (YYYY-MM-DD) in each store's own zone. */
  date: string;
  /** 0 = Sunday. */
  weekday: number;
  restocks: number;
  /** Distinct stores with at least one restock that day. */
  stores: number;
  /** Local hour with the most restocks that day; null without restocks. */
  peakHour: number | null;
  /** Our own confirmed restocks (true) or other trackers' published reports (false). */
  ours: boolean;
}
export interface RegionRow { name: string; slug: string; path: string; restocks: number; stores: number; storesTotal: number; lastAt: string | null; lastStore: string | null }
export interface PartRow { partNumber: string; restocks: number; lastAt: string | null; lastStore: string | null }
export interface StoreRow { storeNumber: string; restocks: number; days: number; peakHour: number | null; lastAt: string }
export interface DropRow { at: string; stores: number; restocks: number }
export interface SelloutFacts { n: number; medianSec: number; within2min: number; within20min: number; fastestSec: number }

export interface RestockTimes {
  at: string;
  cc: CountryCode;
  /** First day of our own tracking in this country. */
  since: string;
  n: number;
  stores: number;
  storesTotal: number;
  /** Local days with at least one restock, and the span from the first to the last of them. */
  days: number;
  spanDays: number;
  byHour: number[];
  byWeekday: number[];
  /** Stated only from PATTERN_MIN restocks on PATTERN_MIN_DAYS days; the weekday only over WEEKDAY_MIN_SPAN days. */
  peakHour: number | null;
  peakWeekday: number | null;
  /** Every local day from `since` to today, zero-filled, ascending. */
  daily: DayRow[];
  today: DayRow | null;
  latest: { storeNumber: string; partNumber: string; at: string } | null;
  /** Most restocks first. */
  byRegion: RegionRow[];
  byPart: PartRow[];
  topStores: StoreRow[];
  /** 30-minute slots in which the most stores restocked at once, most first. */
  drops: DropRow[];
  sellout: SelloutFacts | null;
  /** Other trackers' reports for the days before `since` (launch week), most recent last. */
  reports: DayRow[];
  /** The read failed: placeholders, not "nothing happened". */
  unknown?: boolean;
}

export function trackingSince(cc: CountryCode): string {
  return cc === "us" ? TRACKING_SINCE_US : TRACKING_SINCE_INTL;
}

const argmax = (v: number[]) => v.indexOf(Math.max(...v));
const dateOf = (iso: string, tz: string) => localHourDay(iso, tz);

/** Calendar days from `from` to `to` (YYYY-MM-DD, inclusive); empty when `to` is before `from`. */
export function dayRange(from: string, to: string): string[] {
  const out: string[] = [];
  let t = Date.parse(`${from}T12:00:00Z`);
  const end = Date.parse(`${to}T12:00:00Z`);
  for (let i = 0; t <= end && i < 1000; i++, t += 86400_000) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/** Pure: median, shares and fastest from restock lifetimes in seconds (upper bounds to the next check); null under 10. */
export function selloutFrom(secs: number[]): SelloutFacts | null {
  if (secs.length < 10) return null;
  const v = [...secs].sort((a, b) => a - b);
  const median = v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
  return { n: v.length, medianSec: Math.round(median), within2min: v.filter((d) => d <= 120).length / v.length, within20min: v.filter((d) => d <= 1200).length / v.length, fastestSec: Math.round(v[0]) };
}

export function emptyRestockTimes(cc: CountryCode, now = new Date()): RestockTimes {
  return { at: now.toISOString(), cc, since: trackingSince(cc), n: 0, stores: 0, storesTotal: storesOf(cc).length, days: 0, spanDays: 0, byHour: Array(24).fill(0), byWeekday: Array(7).fill(0), peakHour: null, peakWeekday: null, daily: [], today: null, latest: null, byRegion: [], byPart: [], topStores: [], drops: [], sellout: null, reports: [] };
}

/** Pure: the whole page's numbers from 30-minute slot rows, restock lifetimes and other trackers' slot rows. */
export function restockTimesFrom(cc: CountryCode, rows: SlotRow[], pairSecs: number[], reports: ReportSlotRow[], now = new Date()): RestockTimes {
  const out = emptyRestockTimes(cc, now);
  const stores = storesOf(cc);
  const byNumber = new Map(stores.map((s) => [s.storeNumber, s]));
  const countryTz = COUNTRIES[cc].timeZone;
  const tzOf = (n: string): string => { const s = byNumber.get(n); return s ? storeTimeZone(s) : countryTz; };
  const todayKey = dateOf(now.toISOString(), countryTz).date;

  type DayAgg = { restocks: number; stores: Set<string>; hours: number[] };
  const dayAgg = new Map<string, DayAgg>();
  const day = (d: string) => { let a = dayAgg.get(d); if (!a) { a = { restocks: 0, stores: new Set(), hours: Array(24).fill(0) }; dayAgg.set(d, a); } return a; };
  const region = new Map<string, { restocks: number; stores: Set<string>; lastAt: string | null; lastStore: string | null }>();
  const part = new Map<string, { restocks: number; lastAt: string | null; lastStore: string | null }>();
  const store = new Map<string, { restocks: number; dates: Set<string>; hours: number[]; lastAt: string }>();
  const slot = new Map<string, { stores: Set<string>; restocks: number }>();
  let latest: RestockTimes["latest"] = null;

  for (const r of rows) {
    const s = byNumber.get(r.storeNumber);
    if (!s) continue;
    const { hour, weekday, date } = dateOf(r.slot, tzOf(r.storeNumber));
    out.n += r.n;
    out.byHour[hour] += r.n;
    out.byWeekday[weekday] += r.n;
    const d = day(date); d.restocks += r.n; d.stores.add(r.storeNumber); d.hours[hour] += r.n;
    const rg = region.get(s.state) ?? { restocks: 0, stores: new Set<string>(), lastAt: null, lastStore: null };
    rg.restocks += r.n; rg.stores.add(r.storeNumber);
    if (!rg.lastAt || r.last > rg.lastAt) { rg.lastAt = r.last; rg.lastStore = r.storeNumber; }
    region.set(s.state, rg);
    const p = part.get(r.partNumber) ?? { restocks: 0, lastAt: null, lastStore: null };
    p.restocks += r.n;
    if (!p.lastAt || r.last > p.lastAt) { p.lastAt = r.last; p.lastStore = r.storeNumber; }
    part.set(r.partNumber, p);
    const st = store.get(r.storeNumber) ?? { restocks: 0, dates: new Set<string>(), hours: Array(24).fill(0), lastAt: r.last };
    st.restocks += r.n; st.dates.add(date); st.hours[hour] += r.n; if (r.last > st.lastAt) st.lastAt = r.last;
    store.set(r.storeNumber, st);
    const sl = slot.get(r.slot) ?? { stores: new Set<string>(), restocks: 0 };
    sl.stores.add(r.storeNumber); sl.restocks += r.n; slot.set(r.slot, sl);
    if (!latest || r.last > latest.at) latest = { storeNumber: r.storeNumber, partNumber: r.partNumber, at: r.last };
  }

  const dates = [...dayAgg.keys()].sort();
  out.stores = store.size;
  out.days = dates.length;
  out.spanDays = dates.length ? Math.round((Date.parse(dates[dates.length - 1]) - Date.parse(dates[0])) / 86400_000) + 1 : 0;
  const enough = out.n >= PATTERN_MIN && out.days >= PATTERN_MIN_DAYS;
  out.peakHour = enough ? argmax(out.byHour) : null;
  out.peakWeekday = enough && out.spanDays >= WEEKDAY_MIN_SPAN ? argmax(out.byWeekday) : null;
  out.latest = latest;

  // Every day from the first tracked one to today, in order, so a quiet day reads as 0 and not as a gap.
  out.daily = dayRange(out.since, todayKey).map((date) => {
    const a = dayAgg.get(date);
    return { date, weekday: weekdayOf(date), restocks: a?.restocks ?? 0, stores: a?.stores.size ?? 0, peakHour: a && a.restocks > 0 ? argmax(a.hours) : null, ours: true };
  });
  out.today = out.daily.find((d) => d.date === todayKey) ?? null;

  out.byRegion = statesWithStores(cc).map((r) => {
    const a = region.get(r.name);
    return { name: r.name, slug: r.slug, path: statePath(r.name, cc), restocks: a?.restocks ?? 0, stores: a?.stores.size ?? 0, storesTotal: r.count, lastAt: a?.lastAt ?? null, lastStore: a?.lastStore ?? null };
  }).sort((a, b) => b.restocks - a.restocks || a.name.localeCompare(b.name));

  out.byPart = partNumbersFor("duo", [], [], cc).filter((p) => PART_INDEX.has(p)).map((partNumber) => {
    const a = part.get(partNumber);
    return { partNumber, restocks: a?.restocks ?? 0, lastAt: a?.lastAt ?? null, lastStore: a?.lastStore ?? null };
  }).sort((a, b) => b.restocks - a.restocks);

  out.topStores = [...store.entries()]
    .map(([storeNumber, a]) => ({ storeNumber, restocks: a.restocks, days: a.dates.size, peakHour: a.restocks >= PATTERN_MIN && a.dates.size >= PATTERN_MIN_DAYS ? argmax(a.hours) : null, lastAt: a.lastAt }))
    .sort((a, b) => b.restocks - a.restocks || a.lastAt.localeCompare(b.lastAt))
    .slice(0, 12);

  out.drops = [...slot.entries()].map(([at, a]) => ({ at, stores: a.stores.size, restocks: a.restocks })).sort((a, b) => b.stores - a.stores || b.restocks - a.restocks || a.at.localeCompare(b.at)).slice(0, 6);

  out.sellout = selloutFrom(pairSecs);

  // Launch week as others saw it: one row per local day with a report, before our own tracking began.
  const rep = new Map<string, { restocks: number; stores: Set<string>; hours: number[] }>();
  for (const r of reports) {
    const { hour, date } = dateOf(r.slot, tzOf(r.storeNumber));
    if (date < DUO_LAUNCH_DAY || date >= out.since) continue;
    const a = rep.get(date) ?? { restocks: 0, stores: new Set<string>(), hours: Array(24).fill(0) };
    a.restocks += r.n; a.stores.add(r.storeNumber); a.hours[hour] += r.n; rep.set(date, a);
  }
  out.reports = [...rep.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, a]) => ({ date, weekday: weekdayOf(date), restocks: a.restocks, stores: a.stores.size, peakHour: argmax(a.hours), ours: false }));
  return out;
}

const cached = unstable_cache(
  async (cc: CountryCode): Promise<RestockTimes> => {
    const since = new Date(`${trackingSince(cc)}T00:00:00Z`);
    const parts = partNumbersFor("duo", [], [], cc);
    const scope = countryScope(cc, null, parts);
    const ev = schema.availabilityEvents;
    const scopeConds = [...(scope.stores ? [inArray(ev.storeNumber, scope.stores)] : []), ...(scope.parts ? [inArray(ev.partNumber, scope.parts)] : [])];
    const where = and(eq(ev.firstSeen, false), gte(ev.at, since), ...scopeConds);
    const slotExpr = sql<string>`date_bin('30 minutes', ${ev.at}, timestamp with time zone '2026-01-01 00:00:00+00')`;
    const d = db();
    const [slots, pairs, reports] = await Promise.all([
      d.select({ storeNumber: ev.storeNumber, partNumber: ev.partNumber, slot: slotExpr, n: sql<number>`count(*)::int`, last: sql<string>`max(${ev.at})` })
        .from(ev)
        .where(and(where, eq(ev.kind, "restock")))
        .groupBy(ev.storeNumber, ev.partNumber, slotExpr),
      (async () => {
        const inner = d
          .select({ kind: ev.kind, secs: sql<number>`extract(epoch from (lead(${ev.at}) over (partition by ${ev.storeNumber}, ${ev.partNumber} order by ${ev.at}) - ${ev.at}))`.as("secs"), nextKind: sql<string>`lead(${ev.kind}) over (partition by ${ev.storeNumber}, ${ev.partNumber} order by ${ev.at})`.as("next_kind") })
          .from(ev)
          .where(where)
          .as("t");
        return d.select({ secs: inner.secs }).from(inner).where(and(eq(inner.kind, "restock"), eq(inner.nextKind, "soldout")));
      })(),
      (async () => {
        const rr = schema.restockReports;
        const slotR = sql<string>`date_bin('30 minutes', ${rr.at}, timestamp with time zone '2026-01-01 00:00:00+00')`;
        return d.select({ storeNumber: rr.storeNumber, slot: slotR, n: sql<number>`count(*)::int` })
          .from(rr)
          .where(and(inArray(rr.partNumber, parts), inArray(rr.storeNumber, storesOf(cc).map((s: Store) => s.storeNumber)), lt(rr.at, since)))
          .groupBy(rr.storeNumber, slotR);
      })(),
    ]);
    const iso = (v: string | Date) => new Date(v).toISOString();
    return restockTimesFrom(
      cc,
      slots.map((r) => ({ storeNumber: r.storeNumber, partNumber: r.partNumber, slot: iso(r.slot), n: Number(r.n), last: iso(r.last) })),
      pairs.map((p) => Number(p.secs)).filter((x) => Number.isFinite(x) && x >= 0),
      reports.map((r) => ({ storeNumber: r.storeNumber, slot: iso(r.slot), n: Number(r.n) })),
    );
  },
  ["duo-restock-times-v1"],
  { revalidate: 300 },
);

/** The country's iPhone Duo restock times; placeholders flagged `unknown` when the database cannot be read. */
export async function duoRestockTimes(cc: CountryCode): Promise<RestockTimes> {
  if (!hasDatabase()) return emptyRestockTimes(cc);
  try {
    return await cached(cc);
  } catch (e) {
    await recordError("web", `duo restock times ${cc}: ${errorMessage(e)}`).catch(() => undefined);
    return { ...emptyRestockTimes(cc), unknown: true };
  }
}

/** "9–11 AM", "11 AM–1 PM", "noon–2 PM": a local-hour window [from, to). */
export function rangeLabel(from: number, to: number): string {
  const a = hourLabel(from), b = hourLabel(to % 24);
  const suf = (s: string) => (s.endsWith(" AM") ? "AM" : s.endsWith(" PM") ? "PM" : "");
  return suf(a) && suf(a) === suf(b) ? `${a.replace(/ (AM|PM)$/, "")}–${b}` : `${a}–${b}`;
}

/** Share of `n` restocks that fell in local hours [from, to) — "59% between 9 and 11 AM". */
export function hourShare(byHour: number[], from: number, to: number): number {
  const total = byHour.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let n = 0;
  for (let h = from; h < to; h++) n += byHour[h] ?? 0;
  return n / total;
}

/** The two-hour window with the most restocks: [start, start + 2). */
export function busiestWindow(byHour: number[], width = 2): { from: number; to: number; share: number } {
  let best = 0, bestN = -1;
  for (let h = 0; h + width <= 24; h++) {
    const n = byHour.slice(h, h + width).reduce((a, b) => a + b, 0);
    if (n > bestN) { bestN = n; best = h; }
  }
  return { from: best, to: best + width, share: hourShare(byHour, best, best + width) };
}
