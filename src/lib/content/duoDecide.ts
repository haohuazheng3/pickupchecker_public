/**
 * The decision pages' numbers for one country: "Which iPhone Duo configuration is easiest to get?" (per configuration,
 * storage size and colour) and "Is the iPhone Duo shortage easing?" (day by day, week over week). Every confirmed Duo
 * restock since tracking began (availability_events, first sightings excluded, as everywhere on the site), each restock's
 * listing lifetime (restock → the next sold-out observation of the same store × configuration; an upper bound, to the
 * next check), and what every store lists right now. Behind /which-iphone-duo-restocks-most and /iphone-duo-shortage and
 * their country and language versions. Cached five minutes; JSON-safe (ISO strings, never Date).
 */
import { unstable_cache } from "next/cache";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db, hasDatabase, schema } from "../db";
import { PART_INDEX, catalogFor, partNumbersFor, storeByNumber, storeTimeZone, storesOf, type Store } from "../apple/catalog";
import { COUNTRIES, type CountryCode } from "../apple/countries";
import { countryScope } from "../stock/queries";
import { recordError, errorMessage } from "../errors";
import { PATTERN_MIN, localHourDay } from "./siteFacts";
import { dayRange, selloutFrom, trackingSince, type SelloutFacts } from "./restockTimes";

/** One confirmed restock; `secs` = seconds until the same store × configuration was seen sold out again (null: still listed, or unknown). */
export interface RestockEvent { storeNumber: string; partNumber: string; at: string; secs: number | null }
export interface NowRow { partNumber: string; nowStores: number }

/** Lifetimes need this many known ends before a median is stated (restockTimes.selloutFrom). */
export const LIFETIME_MIN = 10;
/** A week-over-week comparison needs both seven-day windows complete. */
export const WEEK_DAYS = 7;
/** Weekly restocks moving this much (either way) reads as a trend; less is "about the same". */
export const TREND_MIN = 0.15;

export interface ConfigRow {
  partNumber: string;
  storage: string;
  color: string;
  restocks: number;
  /** Distinct stores with at least one restock. */
  stores: number;
  /** Restocks in the last 7 days and the 7 before (both counted even when the window is incomplete; `complete` says so). */
  last7: number;
  prev7: number;
  /** Seconds this configuration was listed, summed over every restock with a known end: the time there was to grab one. */
  exposureSec: number;
  lifetimes: SelloutFacts | null;
  /** Stores listing it right now. */
  nowStores: number;
  lastAt: string | null;
  lastStore: string | null;
}
export interface GroupRow { key: string; restocks: number; stores: number; exposureSec: number; nowStores: number; medianSec: number | null; share: number }

export interface DuoConfigs {
  at: string;
  cc: CountryCode;
  since: string;
  /** Days from the first tracked day to today. */
  days: number;
  n: number;
  storesTotal: number;
  /** Most listing time first. */
  byPart: ConfigRow[];
  byStorage: GroupRow[];
  byColor: GroupRow[];
  /** The configuration with the most listing time, and the least among those that restocked at all; null before PATTERN_MIN restocks. */
  easiest: ConfigRow | null;
  hardest: ConfigRow | null;
  /** Configurations without a single confirmed restock. */
  never: ConfigRow[];
  lifetimes: SelloutFacts | null;
  unknown?: boolean;
}

export interface SupplyDay { date: string; weekday: number; restocks: number; stores: number; medianSec: number | null; within2min: number | null }
export interface SupplyWindow { from: string; to: string; days: number; complete: boolean; restocks: number; stores: number; perStoreDay: number; medianSec: number | null; within2min: number | null; longestGapHours: number | null }

export interface DuoSupply {
  at: string;
  cc: CountryCode;
  since: string;
  days: number;
  n: number;
  storesTotal: number;
  /** Stores with at least one restock since tracking began, and those listing one right now. */
  storesEver: number;
  storesNow: number;
  daily: SupplyDay[];
  /** The last seven days and the seven before, by local date. */
  last7: SupplyWindow;
  prev7: SupplyWindow;
  /** Restocks per week: up, down, flat, or not enough days yet. */
  trend: "up" | "down" | "flat" | "insufficient";
  /** Week-over-week change in restocks (−1…), null when insufficient. */
  change: number | null;
  /** The local date on which the first full week-over-week comparison exists. */
  comparableFrom: string;
  latest: { storeNumber: string; partNumber: string; at: string } | null;
  /** Hours since the last confirmed restock, null before the first. */
  sinceLastHours: number | null;
  lifetimes: SelloutFacts | null;
  unknown?: boolean;
}

export interface DuoDecide { configs: DuoConfigs; supply: DuoSupply }

const countryTz = (cc: CountryCode) => COUNTRIES[cc].timeZone;
const dateIn = (iso: string, tz: string) => localHourDay(iso, tz).date;
const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T12:00:00Z`) + n * 86400_000).toISOString().slice(0, 10);
const median = (v: number[]): number | null => {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

function emptyWindow(from: string, to: string, complete: boolean): SupplyWindow {
  return { from, to, days: 0, complete, restocks: 0, stores: 0, perStoreDay: 0, medianSec: null, within2min: null, longestGapHours: null };
}

export function emptyDecide(cc: CountryCode, now = new Date()): DuoDecide {
  const at = now.toISOString();
  const since = trackingSince(cc);
  const today = dateIn(at, countryTz(cc));
  const items = catalogFor("duo", cc);
  const byPart: ConfigRow[] = items.map((i) => ({ partNumber: i.partNumber, storage: i.storage, color: i.color, restocks: 0, stores: 0, last7: 0, prev7: 0, exposureSec: 0, lifetimes: null, nowStores: 0, lastAt: null, lastStore: null }));
  const storesTotal = storesOf(cc).length;
  const days = Math.max(1, dayRange(since, today).length);
  return {
    configs: { at, cc, since, days, n: 0, storesTotal, byPart, byStorage: [], byColor: [], easiest: null, hardest: null, never: byPart, lifetimes: null },
    supply: {
      at, cc, since, days, n: 0, storesTotal, storesEver: 0, storesNow: 0, daily: [], last7: emptyWindow(addDays(today, -6), today, false), prev7: emptyWindow(addDays(today, -13), addDays(today, -7), false),
      trend: "insufficient", change: null, comparableFrom: addDays(since, 2 * WEEK_DAYS - 1), latest: null, sinceLastHours: null, lifetimes: null,
    },
  };
}

/** Pure: both pages' numbers from the restock events and what is listed now. */
export function decideFrom(cc: CountryCode, events: RestockEvent[], nowRows: NowRow[], now = new Date()): DuoDecide {
  const out = emptyDecide(cc, now);
  const stores = storesOf(cc);
  const byNumber = new Map(stores.map((s) => [s.storeNumber, s]));
  const tz = countryTz(cc);
  const tzOf = (n: string): string => { const s = byNumber.get(n); return s ? storeTimeZone(s) : tz; };
  const today = dateIn(now.toISOString(), tz);
  const since = out.configs.since;
  const last7From = addDays(today, -(WEEK_DAYS - 1)), prev7From = addDays(today, -(2 * WEEK_DAYS - 1)), prev7To = addDays(today, -WEEK_DAYS);
  const nowBy = new Map(nowRows.map((r) => [r.partNumber, r.nowStores]));

  type Agg = { restocks: number; stores: Set<string>; last7: number; prev7: number; secs: number[]; exposure: number; lastAt: string | null; lastStore: string | null };
  const part = new Map<string, Agg>();
  const day = new Map<string, { restocks: number; stores: Set<string>; secs: number[] }>();
  const storesEver = new Set<string>();
  const allSecs: number[] = [];
  let latest: DuoSupply["latest"] = null;
  const sorted = [...events].filter((e) => byNumber.has(e.storeNumber) && PART_INDEX.has(e.partNumber)).sort((a, b) => a.at.localeCompare(b.at));
  for (const e of sorted) {
    const date = dateIn(e.at, tzOf(e.storeNumber));
    if (date < since) continue;
    const a = part.get(e.partNumber) ?? { restocks: 0, stores: new Set<string>(), last7: 0, prev7: 0, secs: [], exposure: 0, lastAt: null, lastStore: null };
    a.restocks++; a.stores.add(e.storeNumber);
    if (date >= last7From) a.last7++; else if (date >= prev7From && date <= prev7To) a.prev7++;
    if (e.secs != null && Number.isFinite(e.secs) && e.secs >= 0) { a.secs.push(e.secs); a.exposure += e.secs; allSecs.push(e.secs); }
    if (!a.lastAt || e.at > a.lastAt) { a.lastAt = e.at; a.lastStore = e.storeNumber; }
    part.set(e.partNumber, a);
    const d = day.get(date) ?? { restocks: 0, stores: new Set<string>(), secs: [] };
    d.restocks++; d.stores.add(e.storeNumber); if (e.secs != null && e.secs >= 0) d.secs.push(e.secs);
    day.set(date, d);
    storesEver.add(e.storeNumber);
    if (!latest || e.at > latest.at) latest = { storeNumber: e.storeNumber, partNumber: e.partNumber, at: e.at };
  }

  // ---- configurations
  const items = catalogFor("duo", cc);
  const rows: ConfigRow[] = items.map((i) => {
    const a = part.get(i.partNumber);
    return {
      partNumber: i.partNumber, storage: i.storage, color: i.color,
      restocks: a?.restocks ?? 0, stores: a?.stores.size ?? 0, last7: a?.last7 ?? 0, prev7: a?.prev7 ?? 0,
      exposureSec: Math.round(a?.exposure ?? 0), lifetimes: a ? selloutFrom(a.secs) : null, nowStores: nowBy.get(i.partNumber) ?? 0,
      lastAt: a?.lastAt ?? null, lastStore: a?.lastStore ?? null,
    };
  }).sort((a, b) => b.exposureSec - a.exposureSec || b.restocks - a.restocks || a.partNumber.localeCompare(b.partNumber));
  const n = rows.reduce((s, r) => s + r.restocks, 0);
  const group = (key: (r: ConfigRow) => string): GroupRow[] => {
    const m = new Map<string, { restocks: number; stores: Set<string>; exposure: number; now: number; secs: number[] }>();
    for (const r of rows) {
      const g = m.get(key(r)) ?? { restocks: 0, stores: new Set<string>(), exposure: 0, now: 0, secs: [] };
      g.restocks += r.restocks; g.exposure += r.exposureSec; g.now += r.nowStores;
      for (const s of part.get(r.partNumber)?.stores ?? []) g.stores.add(s);
      g.secs.push(...(part.get(r.partNumber)?.secs ?? []));
      m.set(key(r), g);
    }
    return [...m.entries()].map(([k, g]) => ({ key: k, restocks: g.restocks, stores: g.stores.size, exposureSec: Math.round(g.exposure), nowStores: g.now, medianSec: g.secs.length >= LIFETIME_MIN ? Math.round(median(g.secs)!) : null, share: n ? g.restocks / n : 0 }))
      .sort((a, b) => b.exposureSec - a.exposureSec || b.restocks - a.restocks);
  };
  const hit = rows.filter((r) => r.restocks > 0);
  out.configs = {
    ...out.configs, n, byPart: rows, byStorage: group((r) => r.storage), byColor: group((r) => r.color),
    easiest: n >= PATTERN_MIN && hit.length ? hit[0] : null,
    hardest: n >= PATTERN_MIN && hit.length > 1 ? hit[hit.length - 1] : null,
    never: rows.filter((r) => r.restocks === 0),
    lifetimes: selloutFrom(allSecs),
  };

  // ---- supply, day by day and week over week
  const daily: SupplyDay[] = dayRange(since, today).map((date) => {
    const d = day.get(date);
    const med = d && d.secs.length >= LIFETIME_MIN ? Math.round(median(d.secs)!) : null;
    return { date, weekday: weekdayOf(date), restocks: d?.restocks ?? 0, stores: d?.stores.size ?? 0, medianSec: med, within2min: d && d.secs.length >= LIFETIME_MIN ? d.secs.filter((x) => x <= 120).length / d.secs.length : null };
  });
  const window = (from: string, to: string): SupplyWindow => {
    const inWin = daily.filter((d) => d.date >= from && d.date <= to);
    const complete = from >= since && inWin.length === WEEK_DAYS;
    const restocks = inWin.reduce((s, d) => s + d.restocks, 0);
    const storeSet = new Set<string>();
    const secs: number[] = [];
    const times: number[] = [];
    for (const e of sorted) {
      const date = dateIn(e.at, tzOf(e.storeNumber));
      if (date < from || date > to) continue;
      storeSet.add(e.storeNumber);
      if (e.secs != null && e.secs >= 0) secs.push(e.secs);
      times.push(Date.parse(e.at));
    }
    let gap: number | null = null;
    if (times.length > 1) { let g = 0; for (let i = 1; i < times.length; i++) g = Math.max(g, times[i] - times[i - 1]); gap = Math.round((g / 3600_000) * 10) / 10; }
    const days = Math.max(1, inWin.length);
    return {
      from, to, days: inWin.length, complete, restocks, stores: storeSet.size, perStoreDay: stores.length ? restocks / stores.length / days : 0,
      medianSec: secs.length >= LIFETIME_MIN ? Math.round(median(secs)!) : null, within2min: secs.length >= LIFETIME_MIN ? secs.filter((x) => x <= 120).length / secs.length : null, longestGapHours: gap,
    };
  };
  const last7 = window(last7From, today), prev7 = window(prev7From, prev7To);
  let trend: DuoSupply["trend"] = "insufficient", change: number | null = null;
  if (last7.complete && prev7.complete && prev7.restocks > 0) {
    change = last7.restocks / prev7.restocks - 1;
    trend = change >= TREND_MIN ? "up" : change <= -TREND_MIN ? "down" : "flat";
  }
  out.supply = {
    ...out.supply, n, storesEver: storesEver.size, storesNow: 0, daily, last7, prev7, trend, change, latest,
    sinceLastHours: latest ? Math.round(((now.getTime() - Date.parse(latest.at)) / 3600_000) * 10) / 10 : null,
    lifetimes: selloutFrom(allSecs),
  };
  return out;
}

const cached = unstable_cache(
  async (cc: CountryCode): Promise<DuoDecide> => {
    const since = new Date(`${trackingSince(cc)}T00:00:00Z`);
    const parts = partNumbersFor("duo", [], [], cc);
    const scope = countryScope(cc, null, parts);
    const ev = schema.availabilityEvents;
    const st = schema.storeSkuStatus;
    const scopeConds = [...(scope.stores ? [inArray(ev.storeNumber, scope.stores)] : []), ...(scope.parts ? [inArray(ev.partNumber, scope.parts)] : [])];
    const d = db();
    const inner = d
      .select({
        storeNumber: ev.storeNumber, partNumber: ev.partNumber, kind: ev.kind, at: ev.at,
        secs: sql<number | null>`extract(epoch from (lead(${ev.at}) over (partition by ${ev.storeNumber}, ${ev.partNumber} order by ${ev.at}) - ${ev.at}))`.as("secs"),
        nextKind: sql<string | null>`lead(${ev.kind}) over (partition by ${ev.storeNumber}, ${ev.partNumber} order by ${ev.at})`.as("next_kind"),
      })
      .from(ev)
      .where(and(eq(ev.firstSeen, false), gte(ev.at, since), ...scopeConds))
      .as("t");
    const [events, nowRows] = await Promise.all([
      d.select({ storeNumber: inner.storeNumber, partNumber: inner.partNumber, at: inner.at, secs: sql<number | null>`case when ${inner.nextKind} = 'soldout' then ${inner.secs} end` }).from(inner).where(eq(inner.kind, "restock")),
      d.select({ partNumber: st.partNumber, nowStores: sql<number>`count(*) filter (where ${st.status} = 'available')::int` })
        .from(st)
        .where(and(...(scope.stores ? [inArray(st.storeNumber, scope.stores)] : []), ...(scope.parts ? [inArray(st.partNumber, scope.parts)] : [])))
        .groupBy(st.partNumber),
    ]);
    const out = decideFrom(
      cc,
      events.map((e) => ({ storeNumber: e.storeNumber, partNumber: e.partNumber, at: new Date(e.at).toISOString(), secs: e.secs == null ? null : Number(e.secs) })),
      nowRows.map((r) => ({ partNumber: r.partNumber, nowStores: Number(r.nowStores) })),
    );
    out.supply.storesNow = await storesListingNow(scope.stores, scope.parts);
    return out;
  },
  ["duo-decide-v1"],
  { revalidate: 300 },
);

async function storesListingNow(stores: string[] | null | undefined, parts: string[] | null | undefined): Promise<number> {
  const st = schema.storeSkuStatus;
  const [r] = await db()
    .select({ n: sql<number>`count(distinct ${st.storeNumber})::int` })
    .from(st)
    .where(and(eq(st.status, "available"), ...(stores ? [inArray(st.storeNumber, stores)] : []), ...(parts ? [inArray(st.partNumber, parts)] : [])));
  return Number(r?.n ?? 0);
}

/** Both pages' numbers for a country; placeholders flagged `unknown` when the database cannot be read. */
export async function duoDecide(cc: CountryCode): Promise<DuoDecide> {
  if (!hasDatabase()) return emptyDecide(cc);
  try {
    return await cached(cc);
  } catch (e) {
    await recordError("web", `duo decide ${cc}: ${errorMessage(e)}`).catch(() => undefined);
    const out = emptyDecide(cc);
    return { configs: { ...out.configs, unknown: true }, supply: { ...out.supply, unknown: true } };
  }
}

/** The store of a restock, for sentences ("Apple SoHo, Nov 5"). */
export const storeOf = (storeNumber: string | null | undefined): Store | undefined => (storeNumber ? storeByNumber(storeNumber) : undefined);

/** Hours as "6.2 h", minutes under an hour: the listing time there was to grab a configuration. */
export function exposureHours(sec: number): number {
  return Math.round((sec / 3600) * 10) / 10;
}
