import { desc, eq, gt, inArray, sql, and } from "drizzle-orm";
import { db, hasDatabase, schema } from "../db";
import { PART_INDEX, STORE_INDEX, STORES, MODELS, modelKeyFor, partNumbersFor, type ModelKey, type CatalogItem, type Store } from "../apple/catalog";
import { recordError, errorMessage } from "../errors";

/**
 * Public pages read through this: a transient database failure (Neon "fetch failed" at cold start,
 * a network blip) degrades to an empty widget instead of a 500 for the whole page. The failure is
 * still recorded for the admin error inbox.
 */
async function safe<T>(what: string, fallback: T, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    await recordError("web", `${what}: ${errorMessage(e)}`);
    return fallback;
  }
}

export interface StoreStockRow {
  storeNumber: string;
  availableParts: string[];
  lastCheckedAt: Date | null;
  lastAvailableAt: Date | null;
}

/** Per-store summary for one model: which parts are available now, when last checked. */
export async function stockByStore(model: ModelKey, filter: { storage?: string; color?: string } = {}): Promise<StoreStockRow[]> {
  if (!hasDatabase()) return [];
  const parts = partNumbersFor(model, filter.storage ? [filter.storage] : [], filter.color ? [filter.color] : []);
  if (parts.length === 0) return [];
  return safe("stock by store", [], async () => {
  const rows = await db()
    .select({ storeNumber: schema.storeSkuStatus.storeNumber, partNumber: schema.storeSkuStatus.partNumber, status: schema.storeSkuStatus.status, lastCheckedAt: schema.storeSkuStatus.lastCheckedAt, lastAvailableAt: schema.storeSkuStatus.lastAvailableAt })
    .from(schema.storeSkuStatus)
    .where(inArray(schema.storeSkuStatus.partNumber, parts));
  const map = new Map<string, StoreStockRow>();
  for (const r of rows) {
    const m = map.get(r.storeNumber) ?? { storeNumber: r.storeNumber, availableParts: [], lastCheckedAt: null, lastAvailableAt: null };
    if (r.status === "available") m.availableParts.push(r.partNumber);
    if (!m.lastCheckedAt || (r.lastCheckedAt && r.lastCheckedAt > m.lastCheckedAt)) m.lastCheckedAt = r.lastCheckedAt;
    if (!m.lastAvailableAt || (r.lastAvailableAt && r.lastAvailableAt > m.lastAvailableAt)) m.lastAvailableAt = r.lastAvailableAt;
    map.set(r.storeNumber, m);
  }
  return [...map.values()].sort((a, b) => b.availableParts.length - a.availableParts.length || (STORE_INDEX.get(a.storeNumber)?.state ?? "").localeCompare(STORE_INDEX.get(b.storeNumber)?.state ?? ""));
  });
}

export async function recentRestocks(limit = 30, model?: ModelKey) {
  if (!hasDatabase()) return [];
  const rows = await safe("recent restocks", [] as (typeof schema.availabilityEvents.$inferSelect)[], () =>
    db().select().from(schema.availabilityEvents).where(eq(schema.availabilityEvents.kind, "restock")).orderBy(desc(schema.availabilityEvents.at)).limit(limit * (model ? 4 : 1)),
  );
  return rows
    .map((r) => ({ ...r, item: PART_INDEX.get(r.partNumber), store: STORE_INDEX.get(r.storeNumber) }))
    .filter((r) => r.item && r.store && (!model || modelKeyFor(r.item.model) === model))
    .slice(0, limit);
}

export async function storeStatus(storeNumber: string) {
  if (!hasDatabase()) return [];
  const rows = await safe("store status", [] as (typeof schema.storeSkuStatus.$inferSelect)[], () => db().select().from(schema.storeSkuStatus).where(eq(schema.storeSkuStatus.storeNumber, storeNumber)));
  return rows.map((r) => ({ ...r, item: PART_INDEX.get(r.partNumber) })).filter((r) => r.item);
}

export async function overview() {
  const empty = { availableNow: 0, storesWithStock: 0, lastCheckedAt: null as Date | null, checksLastHour: 0 };
  if (!hasDatabase()) return empty;
  return safe("overview", empty, async () => {
  const d = db();
  const [a] = await d.select({ n: sql<number>`count(*)::int`, stores: sql<number>`count(distinct ${schema.storeSkuStatus.storeNumber})::int`, last: sql<Date | null>`max(${schema.storeSkuStatus.lastCheckedAt})` }).from(schema.storeSkuStatus).where(eq(schema.storeSkuStatus.status, "available"));
  const [c] = await d.select({ n: sql<number>`count(*)::int` }).from(schema.pollLog).where(and(gt(schema.pollLog.at, new Date(Date.now() - 3600_000)), eq(schema.pollLog.ok, true)));
  const [l] = await d.select({ last: sql<Date | null>`max(${schema.storeSkuStatus.lastCheckedAt})` }).from(schema.storeSkuStatus);
  return { availableNow: a?.n ?? 0, storesWithStock: a?.stores ?? 0, lastCheckedAt: l?.last ?? null, checksLastHour: c?.n ?? 0 };
  });
}

export interface MapSnapshot {
  at: string;
  /** storeNumber → available part numbers (all models) and the newest check time. */
  stores: Record<string, { a: string[]; c: string | null }>;
}

/** One aggregated row per store for the map: cheap enough to poll every 20 s from every open tab. */
export async function mapSnapshot(): Promise<MapSnapshot> {
  const at = new Date().toISOString();
  if (!hasDatabase()) return { at, stores: {} };
  return safe("map snapshot", { at, stores: {} }, async () => {
  const rows = await db()
    .select({
      storeNumber: schema.storeSkuStatus.storeNumber,
      parts: sql<string[] | null>`array_agg(${schema.storeSkuStatus.partNumber}) filter (where ${schema.storeSkuStatus.status} = 'available')`,
      checked: sql<string | null>`max(${schema.storeSkuStatus.lastCheckedAt})`,
    })
    .from(schema.storeSkuStatus)
    .groupBy(schema.storeSkuStatus.storeNumber);
  const stores: MapSnapshot["stores"] = {};
  for (const r of rows) stores[r.storeNumber] = { a: (r.parts ?? []).filter((x) => PART_INDEX.has(x)), c: r.checked ? new Date(r.checked).toISOString() : null };
  return { at, stores };
  });
}

/* ------------------------------------------------------------------ restocks (real ones: first sightings excluded) */

export interface RestockRow { id: number; at: Date; kind: string; quote: string | null; storeNumber: string; partNumber: string; item: CatalogItem; store: Store }

export interface RestockQuery {
  model?: ModelKey;
  /** Full state name, e.g. "New York". */
  state?: string;
  city?: string;
  storeNumber?: string;
  kind?: "restock" | "soldout" | "all";
  limit?: number;
  page?: number;
}

function storeNumbersFor(q: RestockQuery): string[] | null {
  if (q.storeNumber) return [q.storeNumber];
  if (q.state) return STORES.filter((s) => s.state === q.state && (!q.city || s.city === q.city)).map((s) => s.storeNumber);
  return null;
}

/** Newest first; a page of real availability changes, joined with the catalog. */
export async function restockFeed(q: RestockQuery = {}): Promise<RestockRow[]> {
  if (!hasDatabase()) return [];
  const limit = Math.min(200, Math.max(1, q.limit ?? 20));
  const offset = Math.max(0, (q.page ?? 0) * limit);
  const parts = q.model ? partNumbersFor(q.model) : null;
  const stores = storeNumbersFor(q);
  if ((parts && parts.length === 0) || (stores && stores.length === 0)) return [];
  const conds = [eq(schema.availabilityEvents.firstSeen, false)];
  if (q.kind && q.kind !== "all") conds.push(eq(schema.availabilityEvents.kind, q.kind));
  else if (!q.kind) conds.push(eq(schema.availabilityEvents.kind, "restock"));
  if (parts) conds.push(inArray(schema.availabilityEvents.partNumber, parts));
  if (stores) conds.push(inArray(schema.availabilityEvents.storeNumber, stores));
  const rows = await safe("restock feed", [] as (typeof schema.availabilityEvents.$inferSelect)[], () =>
    db().select().from(schema.availabilityEvents).where(and(...conds)).orderBy(desc(schema.availabilityEvents.at)).limit(limit).offset(offset),
  );
  return rows
    .map((r) => ({ id: r.id, at: r.at, kind: r.kind, quote: r.quote, storeNumber: r.storeNumber, partNumber: r.partNumber, item: PART_INDEX.get(r.partNumber), store: STORE_INDEX.get(r.storeNumber) }))
    .filter((r): r is RestockRow => Boolean(r.item && r.store));
}

/** How many real restocks in the last 24 h / 7 d (optionally per model or store set). */
export async function restockCounts(q: Pick<RestockQuery, "model" | "state" | "city" | "storeNumber"> = {}): Promise<{ day: number; week: number; lastAt: Date | null }> {
  const empty = { day: 0, week: 0, lastAt: null as Date | null };
  if (!hasDatabase()) return empty;
  const parts = q.model ? partNumbersFor(q.model) : null;
  const stores = storeNumbersFor(q);
  if ((parts && parts.length === 0) || (stores && stores.length === 0)) return empty;
  const conds = [eq(schema.availabilityEvents.firstSeen, false), eq(schema.availabilityEvents.kind, "restock"), gt(schema.availabilityEvents.at, new Date(Date.now() - 7 * 86400_000))];
  if (parts) conds.push(inArray(schema.availabilityEvents.partNumber, parts));
  if (stores) conds.push(inArray(schema.availabilityEvents.storeNumber, stores));
  return safe("restock counts", empty, async () => {
    const [r] = await db()
      .select({ day: sql<number>`count(*) filter (where ${schema.availabilityEvents.at} > now() - interval '24 hours')::int`, week: sql<number>`count(*)::int`, lastAt: sql<Date | null>`max(${schema.availabilityEvents.at})` })
      .from(schema.availabilityEvents)
      .where(and(...conds));
    return { day: r?.day ?? 0, week: r?.week ?? 0, lastAt: r?.lastAt ? new Date(r.lastAt) : null };
  });
}

export interface RestockStats { total: number; byHour: number[]; byWeekday: number[]; days: number; tz: string }

/** When restocks happen at these stores: local hour-of-day and weekday histograms over the last `days`. */
export async function restockStats(storeNumbers: string[], tz: string, days = 30, model?: ModelKey): Promise<RestockStats> {
  const empty: RestockStats = { total: 0, byHour: Array(24).fill(0), byWeekday: Array(7).fill(0), days, tz };
  if (!hasDatabase() || storeNumbers.length === 0) return empty;
  const parts = model ? partNumbersFor(model) : null;
  const conds = [eq(schema.availabilityEvents.firstSeen, false), eq(schema.availabilityEvents.kind, "restock"), gt(schema.availabilityEvents.at, new Date(Date.now() - days * 86400_000)), inArray(schema.availabilityEvents.storeNumber, storeNumbers)];
  if (parts) conds.push(inArray(schema.availabilityEvents.partNumber, parts));
  return safe("restock stats", empty, async () => {
    const rows = await db()
      .select({ h: sql<number>`extract(hour from ${schema.availabilityEvents.at} at time zone ${tz})::int`, d: sql<number>`extract(dow from ${schema.availabilityEvents.at} at time zone ${tz})::int`, n: sql<number>`count(*)::int` })
      .from(schema.availabilityEvents)
      .where(and(...conds))
      .groupBy(sql`1`, sql`2`);
    const out: RestockStats = { ...empty, byHour: Array(24).fill(0), byWeekday: Array(7).fill(0) };
    for (const r of rows) { out.byHour[r.h] += r.n; out.byWeekday[r.d] += r.n; out.total += r.n; }
    return out;
  });
}

/* ------------------------------------------------------------------ per-store stock summaries (state / city / store pages) */

export interface StoreStockSummary { storeNumber: string; lastCheckedAt: Date | null; perModel: Record<ModelKey, { available: number; total: number; parts: string[] }> }

export async function storesStock(storeNumbers: string[]): Promise<Map<string, StoreStockSummary>> {
  const map = new Map<string, StoreStockSummary>();
  if (!hasDatabase() || storeNumbers.length === 0) return map;
  const rows = await safe("stores stock", [] as { storeNumber: string; partNumber: string; status: string; lastCheckedAt: Date | null }[], () =>
    db().select({ storeNumber: schema.storeSkuStatus.storeNumber, partNumber: schema.storeSkuStatus.partNumber, status: schema.storeSkuStatus.status, lastCheckedAt: schema.storeSkuStatus.lastCheckedAt }).from(schema.storeSkuStatus).where(inArray(schema.storeSkuStatus.storeNumber, storeNumbers)),
  );
  const blank = () => Object.fromEntries(MODELS.map((m) => [m.key, { available: 0, total: 0, parts: [] as string[] }])) as StoreStockSummary["perModel"];
  for (const r of rows) {
    const item = PART_INDEX.get(r.partNumber);
    if (!item) continue;
    const e = map.get(r.storeNumber) ?? { storeNumber: r.storeNumber, lastCheckedAt: null, perModel: blank() };
    const m = e.perModel[modelKeyFor(item.model)];
    m.total++;
    if (r.status === "available") { m.available++; m.parts.push(r.partNumber); }
    if (r.lastCheckedAt && (!e.lastCheckedAt || r.lastCheckedAt > e.lastCheckedAt)) e.lastCheckedAt = r.lastCheckedAt;
    map.set(r.storeNumber, e);
  }
  return map;
}
