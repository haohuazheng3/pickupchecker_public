import { desc, eq, gt, inArray, sql, and, isNull, type SQL } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db, hasDatabase, schema } from "../db";
import { PART_INDEX, STORE_INDEX, MODELS, itemFor, modelKeyFor, partNumbersFor, partNumbersOf, storesOf, countryOfStore, hasOwnPartNumbers, type ModelKey, type CatalogItem, type Store } from "../apple/catalog";
import type { CountryCode } from "../apple/countries";
import { recordError, errorMessage } from "../errors";
import { reportSeries, type ReportInput, type ReportSeries } from "../restockReports";
import { NOT_OFFERED_KEY, parseNotOffered, type PickupOffEntry } from "./notOffered";

/*
 * Every read here is confined to one country (default the US): the database holds every country's stores and
 * several countries share part numbers (ZD/A in DE/AT/NL/BE…), so "all stores" and "all of a part" no longer
 * mean the US. A caller's explicit store list already names a country; a whole country is filtered by its part
 * numbers where no other country sells them (the US, CA, FR, JP…: a short list, and the same rows), else by its
 * store numbers. The country is part of every cache key.
 *
 * Rows handed to pages carry `item` as the row's store's country sells it (storeItem): PART_INDEX alone would
 * give an Austrian store the German price of their shared ZD/A part, or a Singapore store an AUD price.
 */

/** The catalogue item of a status/event row, priced in its store's country (US rows: exactly PART_INDEX's item). */
function storeItem(storeNumber: string, partNumber: string): CatalogItem | undefined {
  return itemFor(partNumber, countryOfStore(storeNumber) ?? "us");
}

const STORE_LIST = new Map<CountryCode, string[]>();
/** A country's store numbers, sorted. */
export function countryStoreNumbers(cc: CountryCode = "us"): string[] {
  let l = STORE_LIST.get(cc);
  if (!l) { l = storesOf(cc).map((s) => s.storeNumber).sort(); STORE_LIST.set(cc, l); }
  return l;
}

/** True when `storeNumbers` is every store of the country (the caller asked for the whole country). */
function wholeCountry(cc: CountryCode, storeNumbers: string[] | null | undefined): boolean {
  return !storeNumbers || storeNumbers.length >= storesOf(cc).length;
}

/**
 * Pure: the filters that confine a read to `cc`. `storeNumbers` null/absent or covering the whole country means
 * "the country"; `parts` null means "every configuration". Returns null for a filter that is not needed.
 */
export function countryScope(cc: CountryCode, storeNumbers: string[] | null | undefined, parts: string[] | null | undefined): { stores: string[] | null; parts: string[] | null } {
  const p = parts ?? null;
  if (!wholeCountry(cc, storeNumbers)) return { stores: storeNumbers!, parts: p };
  if (hasOwnPartNumbers(cc)) return { stores: null, parts: p ?? partNumbersOf(cc) };
  return { stores: countryStoreNumbers(cc), parts: p };
}

/** The SQL conditions of a countryScope on a table with store_number / part_number columns. */
function scopeConds(scope: { stores: string[] | null; parts: string[] | null }, cols: { store: Parameters<typeof inArray>[0]; part: Parameters<typeof inArray>[0] }): SQL[] {
  const out: SQL[] = [];
  if (scope.stores) out.push(inArray(cols.store, scope.stores));
  if (scope.parts) out.push(inArray(cols.part, scope.parts));
  return out;
}
const SSS = { store: schema.storeSkuStatus.storeNumber, part: schema.storeSkuStatus.partNumber };
const EV = { store: schema.availabilityEvents.storeNumber, part: schema.availabilityEvents.partNumber };

/**
 * Public pages read through this: a transient database failure (a dropped connection, a network
 * blip) degrades to an empty widget instead of a 500 for the whole page. The failure is
 * still recorded for the admin error inbox.
 */
async function safe<T>(what: string, fallback: T, run: () => Promise<T>): Promise<T> {
  try {
    return await retried(run);
  } catch (e) {
    await recordError("web", `${what}: ${errorMessage(e)}`);
    return fallback;
  }
}

/** One quick retry: a pooled connection the server closed while idle fails the first query on it. */
async function retried<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch {
    await new Promise((r) => setTimeout(r, 150));
    return run();
  }
}

/**
 * Inside unstable_cache a failure must throw: a fallback returned from there is cached as if it were
 * data (zero restocks for a minute). The wrapper outside the cache records the error and falls back.
 */
const must = <T,>(what: string, run: () => Promise<T>): Promise<T> => retried(run).catch((e) => { throw new Error(`${what}: ${errorMessage(e)}`); });
async function outsideCache<T>(fallback: T, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    await recordError("web", errorMessage(e));
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
export async function stockByStore(model: ModelKey, filter: { storage?: string; color?: string } = {}, country: CountryCode = "us"): Promise<StoreStockRow[]> {
  if (!hasDatabase()) return [];
  const parts = partNumbersFor(model, filter.storage ? [filter.storage] : [], filter.color ? [filter.color] : [], country);
  if (parts.length === 0) return [];
  return safe("stock by store", [], async () => {
  const rows = await db()
    .select({ storeNumber: schema.storeSkuStatus.storeNumber, partNumber: schema.storeSkuStatus.partNumber, status: schema.storeSkuStatus.status, lastCheckedAt: schema.storeSkuStatus.lastCheckedAt, lastAvailableAt: schema.storeSkuStatus.lastAvailableAt })
    .from(schema.storeSkuStatus)
    .where(and(...scopeConds(countryScope(country, null, parts), SSS)));
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

export async function recentRestocks(limit = 30, model?: ModelKey, country: CountryCode = "us") {
  if (!hasDatabase()) return [];
  const rows = await safe("recent restocks", [] as (typeof schema.availabilityEvents.$inferSelect)[], () =>
    db().select().from(schema.availabilityEvents).where(and(eq(schema.availabilityEvents.kind, "restock"), ...scopeConds(countryScope(country, null, null), EV))).orderBy(desc(schema.availabilityEvents.at)).limit(limit * (model ? 4 : 1)),
  );
  return rows
    .map((r) => ({ ...r, item: storeItem(r.storeNumber, r.partNumber), store: STORE_INDEX.get(r.storeNumber) }))
    .filter((r) => r.item && r.store && (!model || modelKeyFor(r.item.model) === model))
    .slice(0, limit);
}

export async function storeStatus(storeNumber: string) {
  if (!hasDatabase()) return [];
  const rows = await safe("store status", [] as (typeof schema.storeSkuStatus.$inferSelect)[], () => db().select().from(schema.storeSkuStatus).where(eq(schema.storeSkuStatus.storeNumber, storeNumber)));
  return rows.map((r) => ({ ...r, item: storeItem(r.storeNumber, r.partNumber) })).filter((r): r is typeof r & { item: CatalogItem } => Boolean(r.item));
}

export async function overview(country: CountryCode = "us") {
  const empty = { availableNow: 0, storesWithStock: 0, lastCheckedAt: null as Date | null, checksLastHour: 0 };
  if (!hasDatabase()) return empty;
  const scope = scopeConds(countryScope(country, null, null), SSS);
  return safe("overview", empty, async () => {
  const d = db();
  const hourAgo = new Date(Date.now() - 3600_000);
  const [a] = await d.select({ n: sql<number>`count(*)::int`, stores: sql<number>`count(distinct ${schema.storeSkuStatus.storeNumber})::int`, last: sql<Date | null>`max(${schema.storeSkuStatus.lastCheckedAt})` }).from(schema.storeSkuStatus).where(and(eq(schema.storeSkuStatus.status, "available"), ...scope));
  const [l] = await d.select({ last: sql<Date | null>`max(${schema.storeSkuStatus.lastCheckedAt})` }).from(schema.storeSkuStatus).where(scope.length ? and(...scope) : undefined);
  let checks: number;
  if (country === "us") {
    // US requests are logged one row each (poll_log.country is null for them).
    const [c] = await d.select({ n: sql<number>`count(*)::int` }).from(schema.pollLog).where(and(gt(schema.pollLog.at, hourAgo), eq(schema.pollLog.ok, true), isNull(schema.pollLog.country)));
    checks = c?.n ?? 0;
  } else {
    // The per-store sweep of other countries logs failures only: its successful requests are its rounds × the
    // country's requests per round (two batches per store) minus the failures; fast-lane requests are logged.
    // Rounds count only for a country the poller says it polls (heartbeat): sweeps rows do not name countries,
    // and with POLL_COUNTRIES="ca,uk" a German page must not claim the round's checks. (A country resting after a
    // failed round still counts its rounds here: an overstatement for at most its backoff.) The other countries
    // may run on the standby host: its alive record carries their stats then.
    const states = (await d.execute(sql`select value from poller_state where key = 'heartbeat' or (key like 'alive:%' and updated_at > now() - interval '2 minutes')`)).rows as { value: { intl?: { countries?: string[] } | null } }[];
    const polled = states.some((s) => (s.value.intl?.countries ?? []).includes(country));
    const [r] = polled ? await d.select({ n: sql<number>`count(*)::int` }).from(schema.sweeps).where(and(eq(schema.sweeps.mode, "intl"), gt(schema.sweeps.startedAt, hourAgo))) : [{ n: 0 }];
    const [c] = await d.select({ ok: sql<number>`count(*) filter (where ${schema.pollLog.ok})::int`, failed: sql<number>`count(*) filter (where not ${schema.pollLog.ok})::int` }).from(schema.pollLog).where(and(gt(schema.pollLog.at, hourAgo), eq(schema.pollLog.country, country)));
    checks = (c?.ok ?? 0) + Math.max(0, (r?.n ?? 0) * storesOf(country).length * Math.ceil(partNumbersOf(country).length / 20) - (c?.failed ?? 0));
  }
  return { availableNow: a?.n ?? 0, storesWithStock: a?.stores ?? 0, lastCheckedAt: l?.last ?? null, checksLastHour: checks };
  });
}

export interface MapSnapshot {
  at: string;
  /** storeNumber → available part numbers (all models) and the newest check time. */
  stores: Record<string, { a: string[]; c: string | null }>;
}

/** One aggregated row per store for the map: cheap enough to poll every 15 s from every open tab. */
export async function mapSnapshot(country: CountryCode = "us"): Promise<MapSnapshot> {
  const at = new Date().toISOString();
  if (!hasDatabase()) return { at, stores: {} };
  const scope = scopeConds(countryScope(country, null, null), SSS);
  return safe("map snapshot", { at, stores: {} }, async () => {
  const rows = await db()
    .select({
      storeNumber: schema.storeSkuStatus.storeNumber,
      parts: sql<string[] | null>`array_agg(${schema.storeSkuStatus.partNumber}) filter (where ${schema.storeSkuStatus.status} = 'available')`,
      checked: sql<string | null>`max(${schema.storeSkuStatus.lastCheckedAt})`,
    })
    .from(schema.storeSkuStatus)
    .where(scope.length ? and(...scope) : undefined)
    .groupBy(schema.storeSkuStatus.storeNumber);
  const stores: MapSnapshot["stores"] = {};
  for (const r of rows) stores[r.storeNumber] = { a: (r.parts ?? []).filter((x) => PART_INDEX.has(x)), c: r.checked ? new Date(r.checked).toISOString() : null };
  return { at, stores };
  });
}

/* ------------------------------------------------------------------ restocks (real ones: first sightings excluded) */

export interface RestockRow { id: number; at: Date; kind: string; quote: string | null; storeNumber: string; partNumber: string; item: CatalogItem; store: Store; /** Is that configuration in stock at that store right now (null = unknown). */ nowAvailable: boolean | null }

export interface RestockQuery {
  model?: ModelKey;
  /** Exact part numbers (a product page); wins over `model`. */
  parts?: string[];
  /** Exact store set (a product page); wins over state/city/store. */
  storeNumbers?: string[];
  /** Full state name, e.g. "New York". */
  state?: string;
  city?: string;
  storeNumber?: string;
  kind?: "restock" | "soldout" | "all";
  limit?: number;
  page?: number;
  /** Whose stores and catalogue (default the US); `state` is a region name of this country. */
  country?: CountryCode;
}

/** The query's store set; null = the whole country. */
function storeNumbersFor(q: RestockQuery): string[] | null {
  const cc = q.country ?? "us";
  if (q.storeNumbers) return wholeCountry(cc, q.storeNumbers) ? null : q.storeNumbers;
  if (q.storeNumber) return [q.storeNumber];
  if (q.state) return storesOf(cc).filter((s) => s.state === q.state && (!q.city || s.city === q.city)).map((s) => s.storeNumber);
  return null;
}

/** Newest first; a page of real availability changes, joined with the catalog. */
export async function restockFeed(q: RestockQuery = {}): Promise<RestockRow[]> {
  if (!hasDatabase()) return [];
  const limit = Math.min(200, Math.max(1, q.limit ?? 20));
  const offset = Math.max(0, (q.page ?? 0) * limit);
  const cc = q.country ?? "us";
  const parts = q.parts ?? (q.model ? partNumbersFor(q.model, [], [], cc) : null);
  const stores = storeNumbersFor(q);
  if ((parts && parts.length === 0) || (stores && stores.length === 0)) return [];
  const conds = [eq(schema.availabilityEvents.firstSeen, false)];
  if (q.kind && q.kind !== "all") conds.push(eq(schema.availabilityEvents.kind, q.kind));
  else if (!q.kind) conds.push(eq(schema.availabilityEvents.kind, "restock"));
  conds.push(...scopeConds(countryScope(cc, stores, parts), EV));
  const rows = await safe("restock feed", [] as (typeof schema.availabilityEvents.$inferSelect)[], () =>
    db().select().from(schema.availabilityEvents).where(and(...conds)).orderBy(desc(schema.availabilityEvents.at)).limit(limit).offset(offset),
  );
  // The card shows the state now, not the state at the time: one lookup for every store × part listed.
  const now = new Map<string, boolean>();
  if (rows.length) {
    const st = await safe("feed status", [] as { storeNumber: string; partNumber: string; status: string }[], () =>
      db().select({ storeNumber: schema.storeSkuStatus.storeNumber, partNumber: schema.storeSkuStatus.partNumber, status: schema.storeSkuStatus.status }).from(schema.storeSkuStatus)
        .where(and(inArray(schema.storeSkuStatus.storeNumber, [...new Set(rows.map((r) => r.storeNumber))]), inArray(schema.storeSkuStatus.partNumber, [...new Set(rows.map((r) => r.partNumber))]))),
    );
    for (const r of st) now.set(`${r.storeNumber}|${r.partNumber}`, r.status === "available");
  }
  return rows
    .map((r) => ({ id: r.id, at: r.at, kind: r.kind, quote: r.quote, storeNumber: r.storeNumber, partNumber: r.partNumber, item: storeItem(r.storeNumber, r.partNumber), store: STORE_INDEX.get(r.storeNumber), nowAvailable: now.get(`${r.storeNumber}|${r.partNumber}`) ?? null }))
    .filter((r): r is RestockRow => Boolean(r.item && r.store));
}

/** How many real restocks in the last 24 h / 7 d (optionally per model or store set). */
export async function restockCounts(q: Pick<RestockQuery, "model" | "state" | "city" | "storeNumber" | "country"> = {}): Promise<{ day: number; week: number; lastAt: Date | null }> {
  const empty = { day: 0, week: 0, lastAt: null as Date | null };
  if (!hasDatabase()) return empty;
  const cc = q.country ?? "us";
  const parts = q.model ? partNumbersFor(q.model, [], [], cc) : null;
  const stores = storeNumbersFor(q);
  if ((parts && parts.length === 0) || (stores && stores.length === 0)) return empty;
  const conds = [eq(schema.availabilityEvents.firstSeen, false), eq(schema.availabilityEvents.kind, "restock"), gt(schema.availabilityEvents.at, new Date(Date.now() - 7 * 86400_000))];
  conds.push(...scopeConds(countryScope(cc, stores, parts), EV));
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
export async function restockStats(storeNumbers: string[], tz: string, days = 30, model?: ModelKey, onlyParts?: string[], country?: CountryCode): Promise<RestockStats> {
  const empty: RestockStats = { total: 0, byHour: Array(24).fill(0), byWeekday: Array(7).fill(0), days, tz };
  if (!hasDatabase() || storeNumbers.length === 0) return empty;
  // The stores name the country unless the caller does.
  const cc = country ?? countryOfStore(storeNumbers[0]) ?? "us";
  const parts = onlyParts ?? (model ? partNumbersFor(model, [], [], cc) : null);
  if (parts && parts.length === 0) return empty;
  const conds = [eq(schema.availabilityEvents.firstSeen, false), eq(schema.availabilityEvents.kind, "restock"), gt(schema.availabilityEvents.at, new Date(Date.now() - days * 86400_000))];
  // A whole country is filtered by its own part numbers where it has them (no 269-item IN list).
  conds.push(...scopeConds(countryScope(cc, storeNumbers, parts), EV));
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

/** "When your stores restock": hour-of-day and weekday histograms for a user's stores, per store too. */
export interface RestockPattern extends RestockStats {
  /** The part of `total` that was one of the user's exact phones. */
  exact: { total: number; byHour: number[] };
  /** Busiest store first. */
  stores: { storeNumber: string; total: number; byHour: number[] }[];
}

/** Restocks of `parts` at `storeNumbers` over the last `days`, bucketed by hour and weekday in `tz`. */
export async function restockPattern(storeNumbers: string[], parts: string[], exactParts: string[], tz: string, days = 30): Promise<RestockPattern> {
  const empty: RestockPattern = { total: 0, byHour: Array(24).fill(0), byWeekday: Array(7).fill(0), days, tz, exact: { total: 0, byHour: Array(24).fill(0) }, stores: [] };
  if (!hasDatabase() || storeNumbers.length === 0 || parts.length === 0) return empty;
  const ev = schema.availabilityEvents;
  return safe("restock pattern", empty, async () => {
    const rows = await db()
      .select({ store: ev.storeNumber, part: ev.partNumber, h: sql<number>`extract(hour from ${ev.at} at time zone ${tz})::int`, d: sql<number>`extract(dow from ${ev.at} at time zone ${tz})::int`, n: sql<number>`count(*)::int` })
      .from(ev)
      .where(and(eq(ev.firstSeen, false), eq(ev.kind, "restock"), gt(ev.at, new Date(Date.now() - days * 86400_000)), inArray(ev.storeNumber, storeNumbers), inArray(ev.partNumber, parts)))
      .groupBy(sql`1`, sql`2`, sql`3`, sql`4`);
    const out: RestockPattern = { ...empty, byHour: Array(24).fill(0), byWeekday: Array(7).fill(0), exact: { total: 0, byHour: Array(24).fill(0) } };
    const exact = new Set(exactParts);
    const perStore = new Map<string, { total: number; byHour: number[] }>();
    for (const r of rows) {
      out.byHour[r.h] += r.n; out.byWeekday[r.d] += r.n; out.total += r.n;
      if (exact.has(r.part)) { out.exact.byHour[r.h] += r.n; out.exact.total += r.n; }
      const st = perStore.get(r.store) ?? { total: 0, byHour: Array(24).fill(0) };
      st.total += r.n; st.byHour[r.h] += r.n; perStore.set(r.store, st);
    }
    out.stores = [...perStore.entries()].map(([storeNumber, v]) => ({ storeNumber, ...v })).sort((a, b) => b.total - a.total);
    return out;
  });
}

/** One store's restock "drops" (its restocks within one 10-minute window count once) in one 15-minute slot of the day. */
export interface RestockSlotRow { slot: number; store: string; drops: number; mins: number }

/**
 * The restock timeline's raw material: drops of `parts` at `storeNumbers` over the last `days`, per
 * 15-minute slot of the day in `tz` and store, with the mean minute of the day of each slot's drops.
 */
export async function restockSlots(storeNumbers: string[], parts: string[], tz: string, days = 30): Promise<RestockSlotRow[]> {
  if (!hasDatabase() || storeNumbers.length === 0 || parts.length === 0) return [];
  const list = (xs: string[]) => sql.join(xs.map((x) => sql`${x}`), sql`, `);
  const since = new Date(Date.now() - days * 86400_000);
  return safe("restock slots", [] as RestockSlotRow[], async () => {
    // The zone is bound once (in `ev`): a parameter repeated in GROUP BY would be a different expression.
    const res = await db().execute(sql`
      with ev as (
        select store_number as store, (at at time zone ${tz}) as t
        from availability_events
        where first_seen = false and kind = 'restock' and at > ${since}
          and store_number in (${list(storeNumbers)}) and part_number in (${list(parts)})
      ), drops as (
        select store, t::date as day, floor((extract(hour from t) * 60 + extract(minute from t)) / 10) as b,
               min(extract(hour from t) * 60 + extract(minute from t))::int as m
        from ev group by store, day, b
      )
      select floor(m / 15)::int as slot, store, count(*)::int as drops, avg(m)::float8 as mins
      from drops group by 1, 2`);
    return (res.rows as unknown as RestockSlotRow[]).map((r) => ({ slot: Number(r.slot), store: String(r.store), drops: Number(r.drops), mins: Number(r.mins) }));
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
  /** Distinct stores with at least one restock in the window. */
  restockStores: number;
  lastRestock: { storeNumber: string; partNumber: string; at: string } | null;
  /** Ascending, one entry per local day of the window (zero-filled). */
  daily: { day: string; restocks: number; soldouts: number }[];
  /** Restocks per configuration over the window, most first. */
  byPart: { partNumber: string; restocks: number }[];
  days: number; tz: string;
  /** The read failed: the numbers are a placeholder, not "nothing happened". */
  unknown?: boolean;
}

const EMPTY_STATS = (days: number, tz: string): PlaceStats => ({ day: 0, week: 0, month: 0, soldouts: 0, medianMs: null, medianSamples: 0, restockStores: 0, lastRestock: null, daily: [], byPart: [], days, tz });

function dayKeysBack(days: number, tz: string): string[] {
  const out: string[] = [];
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  for (let k = days - 1; k >= 0; k--) out.push(fmt.format(new Date(Date.now() - k * 86400_000)));
  return out;
}

const cachedPlaceStats = unstable_cache(
  async (storeNumbers: string[] | null, parts: string[] | null, tz: string, days: number, cc: CountryCode): Promise<PlaceStats> => {
    const base = EMPTY_STATS(days, tz);
    const ev = schema.availabilityEvents;
    const scope = [eq(ev.firstSeen, false), sql`${ev.at} > now() - interval '1 day' * ${days}`, ...scopeConds(countryScope(cc, storeNumbers, parts), EV)];
    const where = and(...scope);
    const [totals, median, series] = await Promise.all([
      must("place stats totals", async () => {
        const [r] = await db()
          .select({
            day: sql<number>`count(*) filter (where ${ev.kind} = 'restock' and ${ev.at} > now() - interval '24 hours')::int`,
            week: sql<number>`count(*) filter (where ${ev.kind} = 'restock' and ${ev.at} > now() - interval '7 days')::int`,
            month: sql<number>`count(*) filter (where ${ev.kind} = 'restock')::int`,
            soldouts: sql<number>`count(*) filter (where ${ev.kind} = 'soldout')::int`,
            stores: sql<number>`count(distinct ${ev.storeNumber}) filter (where ${ev.kind} = 'restock')::int`,
            lastStore: sql<string | null>`(array_agg(${ev.storeNumber} order by ${ev.at} desc) filter (where ${ev.kind} = 'restock'))[1]`,
            lastPart: sql<string | null>`(array_agg(${ev.partNumber} order by ${ev.at} desc) filter (where ${ev.kind} = 'restock'))[1]`,
            lastAt: sql<string | null>`max(${ev.at}) filter (where ${ev.kind} = 'restock')`,
          })
          .from(ev)
          .where(where);
        return r ?? null;
      }),
      must("place stats median", async () => {
        const inner = db()
          .select({ dur: sql<number>`extract(epoch from (lead(${ev.at}) over (partition by ${ev.storeNumber}, ${ev.partNumber} order by ${ev.at}) - ${ev.at}))`.as("dur"), kind: ev.kind, nextKind: sql<string>`lead(${ev.kind}) over (partition by ${ev.storeNumber}, ${ev.partNumber} order by ${ev.at})`.as("next_kind") })
          .from(ev)
          .where(where)
          .as("t");
        const [r] = await db().select({ med: sql<number | null>`percentile_cont(0.5) within group (order by ${inner.dur})`, n: sql<number>`count(*)::int` }).from(inner).where(and(eq(inner.kind, "restock"), eq(inner.nextKind, "soldout")));
        return r ?? null;
      }),
      must("place stats series", () =>
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
      day: totals?.day ?? 0, week: totals?.week ?? 0, month: totals?.month ?? 0, soldouts: totals?.soldouts ?? 0, restockStores: totals?.stores ?? 0,
      medianMs: median?.med != null && Number.isFinite(Number(median.med)) ? Math.round(Number(median.med) * 1000) : null, medianSamples: median?.n ?? 0,
      lastRestock: totals?.lastStore && totals.lastPart && totals.lastAt ? { storeNumber: totals.lastStore, partNumber: totals.lastPart, at: new Date(totals.lastAt).toISOString() } : null,
      daily: [...daily.values()], byPart: [...byPart.entries()].map(([partNumber, restocks]) => ({ partNumber, restocks })).sort((a, b) => b.restocks - a.restocks),
    };
  },
  ["seo-place-stats-v2"],
  { revalidate: 60 },
);

/**
 * Restock / sell-out statistics for a set of stores and/or one model over the last `days` (default 30). Three
 * queries, cached 60 s. No store set = the whole `country` (default: the stores' country, else the US).
 */
export async function placeStats(opts: { storeNumbers?: string[]; model?: ModelKey; parts?: string[]; tz?: string; days?: number; country?: CountryCode } = {}): Promise<PlaceStats> {
  const days = opts.days ?? 30;
  const tz = opts.tz ?? "America/New_York";
  if (!hasDatabase()) return EMPTY_STATS(days, tz);
  const cc = opts.country ?? (opts.storeNumbers?.length ? countryOfStore(opts.storeNumbers[0]) : undefined) ?? "us";
  const stores = opts.storeNumbers && !wholeCountry(cc, opts.storeNumbers) ? [...opts.storeNumbers].sort() : null;
  const parts = opts.parts ? [...opts.parts].sort() : opts.model ? partNumbersFor(opts.model, [], [], cc) : null;
  if ((stores && stores.length === 0) || (parts && parts.length === 0)) return EMPTY_STATS(days, tz);
  return outsideCache({ ...EMPTY_STATS(days, tz), unknown: true }, () => cachedPlaceStats(stores, parts, tz, days, cc));
}

const cachedStockNow = unstable_cache(
  async (storeNumbers: string[] | null, cc: CountryCode): Promise<Record<ModelKey, number>> => {
    const out = Object.fromEntries(MODELS.map((m) => [m.key, 0])) as Record<ModelKey, number>;
    const conds = [eq(schema.storeSkuStatus.status, "available"), ...scopeConds(countryScope(cc, storeNumbers, null), SSS)];
    const rows = await must("stock now", () =>
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

/** Stores (of the set, or all of the country) with at least one configuration available right now, per model. One query, cached 60 s — for metadata. */
export async function storesWithStockNow(storeNumbers?: string[], country?: CountryCode): Promise<Record<ModelKey, number>> {
  const empty = Object.fromEntries(MODELS.map((m) => [m.key, 0])) as Record<ModelKey, number>;
  if (!hasDatabase()) return empty;
  const cc = country ?? (storeNumbers?.length ? countryOfStore(storeNumbers[0]) : undefined) ?? "us";
  const stores = storeNumbers && !wholeCountry(cc, storeNumbers) ? [...storeNumbers].sort() : null;
  if (stores && stores.length === 0) return empty;
  return outsideCache(empty, () => cachedStockNow(stores, cc));
}

export type StoreStatusRow = typeof schema.storeSkuStatus.$inferSelect & { item: CatalogItem };

/** Every status row for several stores (the full configuration tables of thin state/city pages). */
export async function storesStatusFull(storeNumbers: string[]): Promise<Map<string, StoreStatusRow[]>> {
  const map = new Map<string, StoreStatusRow[]>();
  if (!hasDatabase() || storeNumbers.length === 0) return map;
  const rows = await safe("stores status", [] as (typeof schema.storeSkuStatus.$inferSelect)[], () => db().select().from(schema.storeSkuStatus).where(inArray(schema.storeSkuStatus.storeNumber, storeNumbers)));
  for (const r of rows) {
    const item = storeItem(r.storeNumber, r.partNumber);
    if (!item) continue;
    const list = map.get(r.storeNumber) ?? [];
    list.push({ ...r, item });
    map.set(r.storeNumber, list);
  }
  return map;
}

const cachedLatestEvents = unstable_cache(
  async (cc: CountryCode): Promise<Record<string, string>> => {
    const ev = schema.availabilityEvents;
    const rows = await must("latest events", () =>
      db().select({ storeNumber: ev.storeNumber, at: sql<string | null>`max(${ev.at})` }).from(ev).where(and(eq(ev.firstSeen, false), ...scopeConds(countryScope(cc, null, null), EV))).groupBy(ev.storeNumber),
    );
    const out: Record<string, string> = {};
    for (const r of rows) if (r.at) out[r.storeNumber] = new Date(r.at).toISOString();
    return out;
  },
  ["seo-latest-events"],
  { revalidate: 3600 },
);

/** storeNumber → ISO time of its latest real event (sitemap lastModified), one country's stores. Cached an hour. */
export async function latestEventPerStore(country: CountryCode = "us"): Promise<Record<string, string>> {
  if (!hasDatabase()) return {};
  return outsideCache({} as Record<string, string>, () => cachedLatestEvents(country));
}

/* ------------------------------------------------------------------ product pages: every status row of one model, shared by all of its pages */

/** One store × part status, JSON-safe (it lives in the data cache). */
export interface PartStatus { storeNumber: string; partNumber: string; status: string; quote: string | null; since: string | null; lastCheckedAt: string | null; lastAvailableAt: string | null }

/** Cached compactly: [store, part, status 1/0/2, quote, since, lastChecked, lastAvailable] with times in epoch seconds (0 = none). */
type PackedStatus = [string, string, 0 | 1 | 2, string | null, number, number, number];
const sec = (d: Date | null | undefined) => (d ? Math.round(new Date(d).getTime() / 1000) : 0);
const fromSec = (n: number) => (n ? new Date(n * 1000).toISOString() : null);

const cachedModelStock = unstable_cache(
  async (model: ModelKey, cc: CountryCode): Promise<PackedStatus[]> => {
    const parts = partNumbersFor(model, [], [], cc);
    const rows = await must("model stock", () =>
      db().select({ s: schema.storeSkuStatus.storeNumber, p: schema.storeSkuStatus.partNumber, st: schema.storeSkuStatus.status, q: schema.storeSkuStatus.quote, since: schema.storeSkuStatus.since, lc: schema.storeSkuStatus.lastCheckedAt, la: schema.storeSkuStatus.lastAvailableAt }).from(schema.storeSkuStatus).where(and(...scopeConds(countryScope(cc, null, parts), SSS))),
    );
    // Apple's quote is only shown for an available row; leaving the rest out keeps the entry small.
    return rows.map((r) => [r.s, r.p, r.st === "available" ? 1 : r.st === "unavailable" ? 0 : 2, r.st === "available" ? r.q : null, sec(r.since), sec(r.lc), sec(r.la)]);
  },
  ["seo-model-stock-v2"],
  // The poller sweeps every ~15 s: a 15 s cache keeps thousands of product pages to one read per model.
  { revalidate: 15 },
);

const STATUS = ["unavailable", "available", "unknown"] as const;
const memo = new Map<string, { at: number; rows: Promise<PartStatus[]> }>();

/** Every store's status for every configuration of a model in one country (≤ 16 × 269 rows): cached 15 s, and memoised 5 s per process. */
export async function modelStock(model: ModelKey, country: CountryCode = "us"): Promise<PartStatus[]> {
  if (!hasDatabase()) return [];
  const key = `${country}|${model}`;
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < 5_000) return hit.rows;
  const rows = outsideCache([] as PackedStatus[], () => cachedModelStock(model, country)).then((packed) =>
    packed.map(([storeNumber, partNumber, st, quote, since, lc, la]) => ({ storeNumber, partNumber, status: STATUS[st], quote, since: fromSec(since), lastCheckedAt: fromSec(lc), lastAvailableAt: fromSec(la) })),
  );
  memo.set(key, { at: Date.now(), rows });
  return rows;
}

const cachedActivePairs = unstable_cache(
  async (days: number, cc: CountryCode): Promise<{ storeNumber: string; partNumber: string }[]> =>
    must("active pairs", () =>
      db().selectDistinct({ storeNumber: schema.availabilityEvents.storeNumber, partNumber: schema.availabilityEvents.partNumber })
        .from(schema.availabilityEvents)
        .where(and(eq(schema.availabilityEvents.firstSeen, false), eq(schema.availabilityEvents.kind, "restock"), gt(schema.availabilityEvents.at, sql`now() - interval '1 day' * ${days}`), ...scopeConds(countryScope(cc, null, null), EV))),
    ),
  ["seo-active-pairs"],
  { revalidate: 3600 },
);

/** Store × part pairs of one country with at least one real restock in the last `days` (the sitemap's index gate); null when the read failed. */
export async function activePairs(days = 30, country: CountryCode = "us"): Promise<{ storeNumber: string; partNumber: string }[] | null> {
  if (!hasDatabase()) return [];
  return outsideCache(null, () => cachedActivePairs(days, country));
}

/* ------------------------------------------------------------------ other trackers' reports: drawn apart, never counted */

const RR = { store: schema.restockReports.storeNumber, part: schema.restockReports.partNumber };
/** Cached compactly: [store, part, epoch seconds, tracker]. */
type PackedReport = [string, string, number, string];

const cachedReports = unstable_cache(
  async (cc: CountryCode, days: number): Promise<PackedReport[]> => {
    const rr = schema.restockReports;
    const rows = await must("restock reports", () =>
      db().select({ s: rr.storeNumber, p: rr.partNumber, at: rr.at, src: rr.source }).from(rr)
        .where(and(gt(rr.at, sql`now() - interval '1 day' * ${days}`), ...scopeConds(countryScope(cc, null, null), RR))),
    );
    return rows.map((r) => [r.s, r.p, sec(r.at), r.src]);
  },
  ["restock-reports-v1"],
  // They change only when the owner imports a file: one read an hour per country serves every page.
  { revalidate: 3600 },
);

/** One country's reports over the last `days` (every page filters the same cached list); [] when the read fails. */
async function reportRows(cc: CountryCode, days: number): Promise<ReportInput[]> {
  const packed = await outsideCache([] as PackedReport[], () => cachedReports(cc, days));
  return packed.map(([storeNumber, partNumber, at, source]) => ({ storeNumber, partNumber, at: new Date(at * 1000).toISOString(), source, model: storeItem(storeNumber, partNumber)?.model }));
}

/**
 * Other trackers' reports at these stores, for a restock module to draw beside our own: the same stores, zone,
 * window and model/parts filter as its restockStats call. null when there are none (the module then renders
 * exactly as it did before reports existed). Nothing here ever feeds a count.
 */
export async function restockReportStats(storeNumbers: string[], tz: string, days = 30, model?: ModelKey, onlyParts?: string[], country?: CountryCode): Promise<ReportSeries | null> {
  if (!hasDatabase() || storeNumbers.length === 0) return null;
  // An account's stores can be in several countries; a page's are in one.
  const countries = country ? [country] : [...new Set(storeNumbers.map((n) => countryOfStore(n) ?? "us"))];
  const parts = onlyParts ?? (model ? countries.flatMap((cc) => partNumbersFor(model, [], [], cc)) : null);
  if (parts && parts.length === 0) return null;
  const rows = (await Promise.all(countries.map((cc) => reportRows(cc, days)))).flat();
  return reportSeries(rows, { tz, days, stores: storeNumbers, parts });
}

/* ------------------------------------------------------------------ stores Apple offers no pickup lookups for */

const cachedPickupOff = unstable_cache(
  async (): Promise<Record<string, PickupOffEntry>> => {
    const [r] = await must("pickup lookups not offered", () =>
      db().select({ value: schema.pollerState.value }).from(schema.pollerState).where(eq(schema.pollerState.key, NOT_OFFERED_KEY)).limit(1),
    );
    return parseNotOffered(r?.value);
  },
  ["pickup-not-offered-v1"],
  { revalidate: 60 },
);

/**
 * Set when Apple answers a one-store lookup with "There is no store associated with this search" (the poller
 * marks it and asks again every 30 min; src/lib/stock/notOffered.ts): the store page says so instead of "not
 * checked yet". null for every other store, and without a database.
 */
export async function pickupLookupOff(storeNumber: string): Promise<PickupOffEntry | null> {
  if (!hasDatabase()) return null;
  const all = await outsideCache({} as Record<string, PickupOffEntry>, () => cachedPickupOff());
  return Object.hasOwn(all, storeNumber) ? all[storeNumber] : null;
}
