/**
 * "iPhone Duo {in this place} right now": the conclusion block every place page opens with since 2026-11-08
 * (state, city, store, country and the Duo product pages). It exists because answer engines quote the page that
 * already holds the conclusion: asked "iPhone Duo stock in Michigan", Grok and ChatGPT cited the competitor whose
 * state page said, in its first lines, "Not in stock as of 4:20 AM ET on November 8 … 71% of the 89 restocks came
 * between 9 and 11 AM … the last 3 restocks lasted …", while our page had the same facts spread over three pages
 * and mixed three models into one chart. Everything here is computed from numbers the page already loads
 * (live stock, the place's restock times, its sell-out rows); the only new read is how many alerts went out.
 *
 * Pure except `alertsSentAt`; JSON-safe (ISO strings).
 */
import { unstable_cache } from "next/cache";
import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { db, hasDatabase, schema } from "../db";
import { PART_INDEX, modelKeyFor, storeTimeZone, type Store } from "../apple/catalog";
import type { StoreStockRow } from "../stock/queries";
import type { Sellouts } from "../stock/sellouts";

/** What the block needs of a store's live stock: when it was last checked and, per model, which parts are listed. */
export interface StockLike { lastCheckedAt: Date | null; perModel: Partial<Record<"duo" | "18-pro" | "18-pro-max", { available: number; parts: string[] }>> }

/** A country page's stock map from the Duo rows it already reads (stockByStore): Duo per store, the other models from `others`. */
export function stockFromRows(rows: StoreStockRow[]): Map<string, StockLike> {
  const map = new Map<string, StockLike>();
  for (const r of rows) map.set(r.storeNumber, { lastCheckedAt: r.lastCheckedAt ?? null, perModel: { duo: { available: r.availableParts.length, parts: r.availableParts } } });
  return map;
}
import { busiestWindow, hourShare, type RestockTimes } from "./restockTimes";
import { recordError, errorMessage } from "../errors";

/** Alerts PickupChecker sent for restocks at these stores in the last `days` days (counts only; no one is named). */
export interface AlertsSent { days: number; sent: number; stores: number }

const alertsCached = unstable_cache(
  async (stores: string[], days: number): Promise<AlertsSent> => {
    const n = schema.notifications;
    const rows = await db()
      .select({ sent: sql<number>`count(*)::int`, stores: sql<number>`count(distinct ${n.storeNumber})::int` })
      .from(n)
      .where(and(eq(n.status, "sent"), inArray(n.storeNumber, stores), gt(n.createdAt, new Date(Date.now() - days * 86400_000))));
    return { days, sent: rows[0]?.sent ?? 0, stores: rows[0]?.stores ?? 0 };
  },
  ["alerts-sent-v1"],
  { revalidate: 300 },
);

export async function alertsSentAt(storeNumbers: string[], days = 7): Promise<AlertsSent | null> {
  if (!hasDatabase() || storeNumbers.length === 0) return null;
  try {
    return await alertsCached([...storeNumbers].sort(), days);
  } catch (e) {
    await recordError("web", `alerts sent ${storeNumbers.length} stores: ${errorMessage(e)}`).catch(() => undefined);
    return null;
  }
}

/** One restock with how long it stayed listed (bounds between two checks), or how long it has been listed so far. */
export interface DuoRestockLine {
  at: string;
  storeNumber: string;
  partNumber: string;
  /** Seconds it was still listed (lower) and gone by (upper); null while still listed or unknown. */
  lowSec: number | null;
  highSec: number | null;
  /** Bounded by two recorded checks (true) or by the 15-second round (false). */
  exact: boolean;
  /** Still listed: seconds since it appeared. */
  listedSec: number | null;
}

export interface DuoNow {
  /** When this was computed. */
  at: string;
  /** The latest check of any of the place's stores; null when none has been checked. */
  checkedAt: string | null;
  storesTotal: number;
  /** Stores listing an iPhone Duo right now, most configurations first. */
  inStock: { storeNumber: string; configs: number; parts: string[] }[];
  /** iPhone Duo configurations each store can list (8). */
  configsTotal: number;
  /** The other two models, for the second sentence: stores with any configuration (place) / configurations here (store). */
  others: { pro: number; max: number };
  /** The latest confirmed restock since tracking began, with its lifetime when the sell-out rows know it. */
  last: DuoRestockLine | null;
  /** The last three confirmed restocks (newest first) that the sell-out rows cover (30 days). */
  lastThree: DuoRestockLine[];
  /** Confirmed restocks since tracking began in this country, and the first tracked day. */
  n: number;
  since: string;
  /** Local days with at least one restock. */
  days: number;
  /** A usual hour may be stated (restockTimes.ts thresholds). */
  pattern: boolean;
  peakHour: number | null;
  peakCount: number;
  /** The busiest two local hours and their share. */
  window: { from: number; to: number; share: number };
  /** Share of restocks between 9 and 11 AM local time (the hour band people ask about). */
  share911: number;
  /** Median seconds a restock stayed listed; null under 10 sell-outs. */
  medianSec: number | null;
  /** How many timed listings the median rests on (the sample answer engines ask for next to the number). */
  medianN: number;
  /** Most restocked configuration since tracking began, and its share of all restocks here. */
  topPart: { partNumber: string; restocks: number; share: number } | null;
  /**
   * The denominator behind "not in stock": stores whose latest successful check is under FRESH_SEC old, and the rest
   * (stale, failing or never answered). A page generated a second ago can still rest on an old answer for one store;
   * readers and answer engines must be able to tell "checked and not listed" from "no recent answer".
   */
  fresh: number;
  stale: number;
  /** Restocks today (each store's local date), so far. */
  today: number;
  alerts: AlertsSent | null;
  /** Distinct time zones of the place's stores (one → the sentences may name the zone). */
  zones: string[];
  /** The read of restock times failed: pattern numbers are placeholders. */
  unknown: boolean;
}

export interface DuoNowInput {
  stores: Store[];
  stock: Map<string, StockLike>;
  /** The other models' counts when `stock` carries only the Duo (country pages: stores with any configuration). */
  others?: { pro: number; max: number };
  times: RestockTimes;
  sell: Sellouts;
  alerts?: AlertsSent | null;
  now?: Date;
  /** iPhone Duo configurations per store in this country (catalogFor("duo", cc).length). */
  configsTotal: number;
}

/** A store's latest answer counts as current for this long (three full rounds of the 15-second sweep). */
export const FRESH_SEC = 60;

const isDuo = (partNumber: string) => { const i = PART_INDEX.get(partNumber); return Boolean(i && modelKeyFor(i.model) === "duo"); };

/** Pure: the block's numbers from what the page already loaded. */
export function duoNowFrom(i: DuoNowInput): DuoNow {
  const now = i.now ?? new Date();
  const numbers = new Set(i.stores.map((s) => s.storeNumber));
  let checkedAt: string | null = null;
  const inStock: DuoNow["inStock"] = [];
  let pro = 0, max = 0, fresh = 0;
  for (const s of i.stores) {
    const sum = i.stock.get(s.storeNumber);
    if (!sum) continue;
    if (sum.lastCheckedAt && now.getTime() - sum.lastCheckedAt.getTime() <= FRESH_SEC * 1000) fresh++;
    if (sum.lastCheckedAt && (!checkedAt || sum.lastCheckedAt.toISOString() > checkedAt)) checkedAt = sum.lastCheckedAt.toISOString();
    const duo = sum.perModel.duo;
    if (duo && duo.available > 0) inStock.push({ storeNumber: s.storeNumber, configs: duo.available, parts: duo.parts });
    const p = sum.perModel["18-pro"]?.available ?? 0, m = sum.perModel["18-pro-max"]?.available ?? 0;
    if (i.stores.length === 1) { pro = p; max = m; }
    else { if (p > 0) pro++; if (m > 0) max++; }
  }
  if (i.others) { pro = i.others.pro; max = i.others.max; }
  inStock.sort((a, b) => b.configs - a.configs || a.storeNumber.localeCompare(b.storeNumber));

  // The sell-out rows (30 days, newest first) carry each Duo restock's lifetime; the latest restock on record comes
  // from the restock-times read, which reaches back to the first tracked day.
  const lines: DuoRestockLine[] = i.sell.recent
    .filter((r) => numbers.has(r.storeNumber) && isDuo(r.partNumber))
    .map((r) => ({ at: r.at.toISOString(), storeNumber: r.storeNumber, partNumber: r.partNumber, lowSec: r.lowSec, highSec: r.highSec, exact: r.exact, listedSec: r.listedSec }))
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  const lastThree = lines.slice(0, 3);
  const t = i.times;
  let last: DuoRestockLine | null = lastThree[0] ?? null;
  if (t.latest && (!last || t.latest.at > last.at)) last = { at: t.latest.at, storeNumber: t.latest.storeNumber, partNumber: t.latest.partNumber, lowSec: null, highSec: null, exact: false, listedSec: null };

  const window = busiestWindow(t.byHour);
  const peakHour = t.peakHour;
  return {
    at: now.toISOString(),
    checkedAt,
    storesTotal: i.stores.length,
    inStock,
    configsTotal: i.configsTotal,
    others: { pro, max },
    last,
    lastThree,
    n: t.n,
    since: t.since,
    days: t.days,
    pattern: peakHour != null,
    peakHour,
    peakCount: peakHour != null ? t.byHour[peakHour] ?? 0 : 0,
    window,
    share911: hourShare(t.byHour, 9, 11),
    medianSec: t.sellout?.medianSec ?? i.sell.byModel.duo?.medianSec ?? null,
    medianN: t.sellout ? t.sellout.n : i.sell.byModel.duo?.medianSec != null ? i.sell.byModel.duo.n : 0,
    topPart: t.byPart[0] ? { partNumber: t.byPart[0].partNumber, restocks: t.byPart[0].restocks, share: t.n > 0 ? t.byPart[0].restocks / t.n : 0 } : null,
    fresh,
    stale: i.stores.length - fresh,
    today: t.today?.restocks ?? 0,
    alerts: i.alerts ?? null,
    zones: [...new Set(i.stores.map((s) => storeTimeZone(s)))],
    unknown: Boolean(t.unknown),
  };
}
