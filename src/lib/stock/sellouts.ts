/**
 * How long each restock lasted before it sold out, to the second (or rather, to the spacing of two checks).
 *
 * A restock event's `at` is the first check that saw the configuration listed; the sell-out's `at` the first check
 * that saw it gone, and its `seen_until` (migration 0012) the last check that still saw it listed. So the restock
 * was gone by (sell-out at − restock at) and was still there at (seen_until − restock at): "sold out 45–60 s after
 * it appeared". Stores with alerts are checked every 5 s, every other store every 15 s: that is the width of the range.
 * Sell-outs recorded before seen_until existed are bounded by the 15-second round instead (`exact: false`).
 * Listings shorter than one check can be missed altogether, so the share of very short restocks is a floor.
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db, hasDatabase } from "../db";
import { MODELS, PART_INDEX, countryOfStore, modelKeyFor, partNumbersFor, type ModelKey } from "../apple/catalog";
import { countryScope } from "./queries";
import type { CountryCode } from "../apple/countries";
import { recordError, errorMessage } from "../errors";

/** The round every store gets: the bound used where a sell-out has no last sighting. */
export const ROUND_SEC = 15;

export interface SelloutRow {
  id: number;
  at: Date;
  storeNumber: string;
  partNumber: string;
  /** Seconds after the restock appeared that it was still listed (lower) and gone (upper); null while still listed. */
  lowSec: number | null;
  highSec: number | null;
  /** Bounded by two recorded checks (true) or by the 15-second round (false). */
  exact: boolean;
  /** Still listed: seconds since it appeared. */
  listedSec: number | null;
}

export interface SelloutSummary {
  /** Restocks in the window that have sold out (each with a duration). */
  n: number;
  /** Median of "gone by" (upper bounds), seconds. */
  medianSec: number | null;
  /** Shares (0–1) gone within 30 s, 60 s, 120 s. */
  within30: number;
  within60: number;
  within120: number;
  fastestSec: number | null;
  days: number;
}

/**
 * `summary` covers every phone in scope; `byModel` each one, because they behave nothing alike (an iPhone Duo
 * restock is typically gone in about a minute, an 18 Pro often stays listed for hours).
 */
export interface Sellouts { summary: SelloutSummary; byModel: Partial<Record<ModelKey, SelloutSummary>>; recent: SelloutRow[] }

const EMPTY_SUMMARY = (days: number): SelloutSummary => ({ n: 0, medianSec: null, within30: 0, within60: 0, within120: 0, fastestSec: null, days });
const EMPTY = (days: number): Sellouts => ({ summary: EMPTY_SUMMARY(days), byModel: {}, recent: [] });

/** Pure: summary of "gone by" times (seconds). */
export function summarize(secs: number[], days: number): SelloutSummary {
  if (secs.length === 0) return EMPTY_SUMMARY(days);
  const v = [...secs].sort((a, b) => a - b);
  const mid = v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
  const share = (t: number) => v.filter((x) => x <= t).length / v.length;
  return { n: v.length, medianSec: Math.round(mid), within30: share(30), within60: share(60), within120: share(120), fastestSec: Math.round(v[0]), days };
}

/** Pure: the bounds of one restock's life from its event times (seconds; lower never negative, never above upper). */
export function lifeBounds(restockAt: Date, soldAt: Date | null, seenUntil: Date | null): { lowSec: number | null; highSec: number | null; exact: boolean } {
  if (!soldAt) return { lowSec: null, highSec: null, exact: false };
  const high = Math.max(0, (soldAt.getTime() - restockAt.getTime()) / 1000);
  const exact = Boolean(seenUntil && seenUntil.getTime() >= restockAt.getTime() && seenUntil.getTime() <= soldAt.getTime());
  const low = exact ? (seenUntil!.getTime() - restockAt.getTime()) / 1000 : Math.max(0, high - ROUND_SEC);
  return { lowSec: Math.floor(Math.min(low, high)), highSec: Math.ceil(high), exact };
}

/** Pure: "45–60 s", "1 min 5 s – 1 min 20 s", or "58 s" when both checks agree to the second. */
export function fmtLife(low: number, high: number): string {
  const one = (s: number) => (s < 120 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`);
  if (high - low < 1) return one(high);
  if (high < 120) return `${low}–${high} s`;
  return `${one(low)} – ${one(high)}`;
}

/** Pure: "60–80 seconds" around a median, the band the headline quotes (10-second steps, at least 20 wide). */
export function medianBand(medianSec: number): string {
  const hi = Math.max(20, Math.ceil(medianSec / 10) * 10);
  return `${Math.max(0, hi - 20)}–${hi} seconds`;
}

const cached = unstable_cache(
  async (stores: string[] | null, parts: string[] | null, days: number, limit: number): Promise<Sellouts> => {
    const storeCond = stores ? sql`and store_number in (${sql.join(stores.map((s) => sql`${s}`), sql`, `)})` : sql``;
    const partCond = parts ? sql`and part_number in (${sql.join(parts.map((p) => sql`${p}`), sql`, `)})` : sql``;
    const pairs = sql`
      select id, store_number, part_number, at, kind,
             lead(kind) over w as next_kind, lead(at) over w as next_at, lead(seen_until) over w as next_seen
      from availability_events
      where not first_seen and at > now() - make_interval(days => ${days}) ${storeCond} ${partCond}
      window w as (partition by store_number, part_number order by at)`;
    const life = sql`extract(epoch from next_at - at)`;
    const [lifeRows, recentRows] = await Promise.all([
      db().execute(sql`select part_number, ${life}::float8 as secs from (${pairs}) e where kind = 'restock' and next_kind = 'soldout'`),
      db().execute(sql`
        select id, store_number, part_number, at, next_kind, next_at, next_seen
        from (${pairs}) e where kind = 'restock' and (next_kind = 'soldout' or next_kind is null)
        order by at desc limit ${limit}`),
    ]);
    const lives = lifeRows.rows as { part_number: string; secs: number }[];
    const byModel: Partial<Record<ModelKey, SelloutSummary>> = {};
    for (const m of MODELS) {
      const secs = lives.filter((r) => { const i = PART_INDEX.get(r.part_number); return i && modelKeyFor(i.model) === m.key; }).map((r) => Number(r.secs));
      if (secs.length) byModel[m.key] = summarize(secs, days);
    }
    const now = Date.now();
    const recent = (recentRows.rows as { id: number; store_number: string; part_number: string; at: string | Date; next_kind: string | null; next_at: string | Date | null; next_seen: string | Date | null }[]).map((r): SelloutRow => {
      const at = new Date(r.at);
      const b = lifeBounds(at, r.next_at ? new Date(r.next_at) : null, r.next_seen ? new Date(r.next_seen) : null);
      return { id: Number(r.id), at, storeNumber: r.store_number, partNumber: r.part_number, ...b, listedSec: r.next_kind ? null : Math.round((now - at.getTime()) / 1000) };
    });
    return { summary: summarize(lives.map((r) => Number(r.secs)), days), byModel, recent };
  },
  ["sellouts-v2"],
  { revalidate: 60 },
);

/**
 * Restocks and how fast they sold out, for a place (stores) and/or phones (model or parts) in one country.
 * Whole-country scopes pass no store list (the country's own part numbers keep it to that country).
 */
export async function sellouts(opts: { storeNumbers?: string[]; model?: ModelKey; parts?: string[]; country?: CountryCode; days?: number; limit?: number } = {}): Promise<Sellouts> {
  const days = opts.days ?? 30;
  if (!hasDatabase()) return EMPTY(days);
  const cc = opts.country ?? (opts.storeNumbers?.length ? countryOfStore(opts.storeNumbers[0]) : undefined) ?? "us";
  const parts = opts.parts ?? (opts.model ? partNumbersFor(opts.model, [], [], cc) : null);
  if ((opts.storeNumbers && opts.storeNumbers.length === 0) || (parts && parts.length === 0)) return EMPTY(days);
  // The same scoping as every other place query: a whole country by its own part numbers where it has them,
  // else by its store list (Germany and Austria share part numbers).
  const scope = countryScope(cc, opts.storeNumbers?.length ? opts.storeNumbers : null, parts);
  try {
    const d = await cached(scope.stores ? [...scope.stores].sort() : null, scope.parts ? [...scope.parts].sort() : null, days, opts.limit ?? 12);
    // The data cache stores JSON: dates come back as ISO strings. Callers get real Dates either way.
    return { ...d, recent: d.recent.map((r) => ({ ...r, at: new Date(r.at) })) };
  } catch (e) {
    await recordError("web", `sellouts: ${errorMessage(e)}`).catch(() => undefined);
    return EMPTY(days);
  }
}
