import { desc, eq, gt, inArray, sql, and } from "drizzle-orm";
import { db, hasDatabase, schema } from "../db";
import { PART_INDEX, STORE_INDEX, modelKeyFor, partNumbersFor, type ModelKey } from "../apple/catalog";
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
