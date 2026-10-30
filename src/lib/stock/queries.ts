import { desc, eq, gt, inArray, sql, and } from "drizzle-orm";
import { unstable_cache } from "next/cache";
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
  return rows.map((r) => ({ ...r, item: PART_INDEX.get(r.partNumber) })).filter((r): r is typeof r & { item: CatalogItem } => Boolean(r.item));
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

/* ------------------------------------------------------------------ SEO page statistics (cached 60 s, keyed by their arguments) */

/**
 * Cached values are serialised, so every shape below is JSON-safe (ISO strings, never Date). Callers
 * guard with hasDatabase() before entering the cache so a missing DATABASE_URL never caches a fallback.
 */

export interface PlaceStats {
  day: number; week: number; month: number; soldouts: number;
  /** Median restock→sell-out duration over the window, from pairs at the same store × part; null until there are pairs. */
  medianMs: number | null; medianSamples: number;
  lastRestock: { storeNumber: string; partNumber: string; at: string } | null;
  /** Ascending, one entry per local day of the window (zero-filled). */
  daily: { day: string; restocks: number; soldouts: number }[];
  /** Restocks per configuration over the window, most first. */
  byPart: { partNumber: string; restocks: number }[];
  days: number; tz: string;
}

const EMPTY_STATS = (days: number, tz: string): PlaceStats => ({ day: 0, week: 0, month: 0, soldouts: 0, medianMs: null, medianSamples: 0, lastRestock: null, daily: [], byPart: [], days, tz });

function dayKeysBack(days: number, tz: string): string[] {
  const out: string[] = [];
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  for (let k = days - 1; k >= 0; k--) out.push(fmt.format(new Date(Date.now() - k * 86400_000)));
  return out;
}

const cachedPlaceStats = unstable_cache(
  async (storeNumbers: string[] | null, parts: string[] | null, tz: string, days: number): Promise<PlaceStats> => {
    const base = EMPTY_STATS(days, tz);
    const ev = schema.availabilityEvents;
    const scope = [eq(ev.firstSeen, false), sql`${ev.at} > now() - interval '1 day' * ${days}`];
    if (storeNumbers) scope.push(inArray(ev.storeNumber, storeNumbers));
    if (parts) scope.push(inArray(ev.partNumber, parts));
    const where = and(...scope);
    const [totals, median, series] = await Promise.all([
      safe("place stats totals", null as null | { day: number; week: number; month: number; soldouts: number; lastStore: string | null; lastPart: string | null; lastAt: string | null }, async () => {
        const [r] = await db()
          .select({
            day: sql<number>`count(*) filter (where ${ev.kind} = 'restock' and ${ev.at} > now() - interval '24 hours')::int`,
            week: sql<number>`count(*) filter (where ${ev.kind} = 'restock' and ${ev.at} > now() - interval '7 days')::int`,
            month: sql<number>`count(*) filter (where ${ev.kind} = 'restock')::int`,
            soldouts: sql<number>`count(*) filter (where ${ev.kind} = 'soldout')::int`,
            lastStore: sql<string | null>`(array_agg(${ev.storeNumber} order by ${ev.at} desc) filter (where ${ev.kind} = 'restock'))[1]`,
            lastPart: sql<string | null>`(array_agg(${ev.partNumber} order by ${ev.at} desc) filter (where ${ev.kind} = 'restock'))[1]`,
            lastAt: sql<string | null>`max(${ev.at}) filter (where ${ev.kind} = 'restock')`,
          })
          .from(ev)
          .where(where);
        return r ?? null;
      }),
      safe("place stats median", null as null | { med: number | null; n: number }, async () => {
        const inner = db()
          .select({ dur: sql<number>`extract(epoch from (lead(${ev.at}) over (partition by ${ev.storeNumber}, ${ev.partNumber} order by ${ev.at}) - ${ev.at}))`.as("dur"), kind: ev.kind, nextKind: sql<string>`lead(${ev.kind}) over (partition by ${ev.storeNumber}, ${ev.partNumber} order by ${ev.at})`.as("next_kind") })
          .from(ev)
          .where(where)
          .as("t");
        const [r] = await db().select({ med: sql<number | null>`percentile_cont(0.5) within group (order by ${inner.dur})`, n: sql<number>`count(*)::int` }).from(inner).where(and(eq(inner.kind, "restock"), eq(inner.nextKind, "soldout")));
        return r ?? null;
      }),
      safe("place stats series", [] as { day: string | null; partNumber: string | null; kind: string; n: number }[], () =>
        db()
          .select({ day: sql<string | null>`to_char(${ev.at} at time zone ${tz}, 'YYYY-MM-DD')`, partNumber: sql<string | null>`${ev.partNumber}`, kind: ev.kind, n: sql<number>`count(*)::int` })
          .from(ev)
          .where(where)
          // Ordinals: the day expression carries a bound parameter, and Postgres would not match a re-bound copy in GROUP BY.
          .groupBy(sql`grouping sets ((1, 3), (2, 3))`),
      ),
    ]);
    const daily = new Map(dayKeysBack(days, tz).map((d) => [d, { day: d, restocks: 0, soldouts: 0 }]));
    const byPart = new Map<string, number>();
    for (const r of series) {
      if (r.day) { const e = daily.get(r.day); if (e) { if (r.kind === "restock") e.restocks += r.n; else if (r.kind === "soldout") e.soldouts += r.n; } }
      else if (r.partNumber && r.kind === "restock" && PART_INDEX.has(r.partNumber)) byPart.set(r.partNumber, (byPart.get(r.partNumber) ?? 0) + r.n);
    }
    return {
      ...base,
      day: totals?.day ?? 0, week: totals?.week ?? 0, month: totals?.month ?? 0, soldouts: totals?.soldouts ?? 0,
      medianMs: median?.med != null && Number.isFinite(Number(median.med)) ? Math.round(Number(median.med) * 1000) : null, medianSamples: median?.n ?? 0,
      lastRestock: totals?.lastStore && totals.lastPart && totals.lastAt ? { storeNumber: totals.lastStore, partNumber: totals.lastPart, at: new Date(totals.lastAt).toISOString() } : null,
      daily: [...daily.values()], byPart: [...byPart.entries()].map(([partNumber, restocks]) => ({ partNumber, restocks })).sort((a, b) => b.restocks - a.restocks),
    };
  },
  ["seo-place-stats"],
  { revalidate: 60 },
);

/** Restock / sell-out statistics for a set of stores and/or one model over the last `days` (default 30). Three queries, cached 60 s. */
export async function placeStats(opts: { storeNumbers?: string[]; model?: ModelKey; tz?: string; days?: number } = {}): Promise<PlaceStats> {
  const days = opts.days ?? 30;
  const tz = opts.tz ?? "America/New_York";
  if (!hasDatabase()) return EMPTY_STATS(days, tz);
  const stores = opts.storeNumbers && opts.storeNumbers.length < STORES.length ? [...opts.storeNumbers].sort() : null;
  const parts = opts.model ? partNumbersFor(opts.model) : null;
  if ((stores && stores.length === 0) || (parts && parts.length === 0)) return EMPTY_STATS(days, tz);
  return cachedPlaceStats(stores, parts, tz, days);
}

const cachedStockNow = unstable_cache(
  async (storeNumbers: string[] | null): Promise<Record<ModelKey, number>> => {
    const out = Object.fromEntries(MODELS.map((m) => [m.key, 0])) as Record<ModelKey, number>;
    const conds = [eq(schema.storeSkuStatus.status, "available")];
    if (storeNumbers) conds.push(inArray(schema.storeSkuStatus.storeNumber, storeNumbers));
    const rows = await safe("stock now", [] as { storeNumber: string; partNumber: string }[], () =>
      db().selectDistinct({ storeNumber: schema.storeSkuStatus.storeNumber, partNumber: schema.storeSkuStatus.partNumber }).from(schema.storeSkuStatus).where(and(...conds)),
    );
    const sets = Object.fromEntries(MODELS.map((m) => [m.key, new Set<string>()])) as Record<ModelKey, Set<string>>;
    for (const r of rows) { const item = PART_INDEX.get(r.partNumber); if (item) sets[modelKeyFor(item.model)].add(r.storeNumber); }
    for (const m of MODELS) out[m.key] = sets[m.key].size;
    return out;
  },
  ["seo-stock-now"],
  { revalidate: 60 },
);

/** Stores (of the set, or all) with at least one configuration available right now, per model. One query, cached 60 s — for metadata. */
export async function storesWithStockNow(storeNumbers?: string[]): Promise<Record<ModelKey, number>> {
  const empty = Object.fromEntries(MODELS.map((m) => [m.key, 0])) as Record<ModelKey, number>;
  if (!hasDatabase()) return empty;
  const stores = storeNumbers && storeNumbers.length < STORES.length ? [...storeNumbers].sort() : null;
  if (stores && stores.length === 0) return empty;
  return cachedStockNow(stores);
}

export type StoreStatusRow = typeof schema.storeSkuStatus.$inferSelect & { item: CatalogItem };

/** Every status row for several stores (the full configuration tables of thin state/city pages). */
export async function storesStatusFull(storeNumbers: string[]): Promise<Map<string, StoreStatusRow[]>> {
  const map = new Map<string, StoreStatusRow[]>();
  if (!hasDatabase() || storeNumbers.length === 0) return map;
  const rows = await safe("stores status", [] as (typeof schema.storeSkuStatus.$inferSelect)[], () => db().select().from(schema.storeSkuStatus).where(inArray(schema.storeSkuStatus.storeNumber, storeNumbers)));
  for (const r of rows) {
    const item = PART_INDEX.get(r.partNumber);
    if (!item) continue;
    const list = map.get(r.storeNumber) ?? [];
    list.push({ ...r, item });
    map.set(r.storeNumber, list);
  }
  return map;
}

const cachedLatestEvents = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const ev = schema.availabilityEvents;
    const rows = await safe("latest events", [] as { storeNumber: string; at: string | null }[], () =>
      db().select({ storeNumber: ev.storeNumber, at: sql<string | null>`max(${ev.at})` }).from(ev).where(eq(ev.firstSeen, false)).groupBy(ev.storeNumber),
    );
    const out: Record<string, string> = {};
    for (const r of rows) if (r.at) out[r.storeNumber] = new Date(r.at).toISOString();
    return out;
  },
  ["seo-latest-events"],
  { revalidate: 3600 },
);

/** storeNumber → ISO time of its latest real event (sitemap lastModified). Cached an hour. */
export async function latestEventPerStore(): Promise<Record<string, string>> {
  if (!hasDatabase()) return {};
  return cachedLatestEvents();
}
