/**
 * Pure helpers for the product × place pages: everything on a page is computed in memory from the
 * cached status rows of the three models (stock/queries.ts modelStock), so a page costs no extra reads.
 */
import { MODELS, PART_INDEX, STORES, catalogFor, colorsFor, distanceMiles, storagesFor, type CatalogItem, type ModelKey, type Store } from "../apple/catalog";
import type { PartStatus } from "../stock/queries";
import { multiStoreCities, productFor, statePlace, cityPlace, storePlace, type Place, type Product } from "./products";
import { neighborStates } from "./links";

export type StockByModel = Record<ModelKey, PartStatus[]>;

/** storeNumber → partNumber → status row, per model. */
export function indexStock(stock: StockByModel): Map<string, Map<string, PartStatus>> {
  const out = new Map<string, Map<string, PartStatus>>();
  for (const m of MODELS) for (const r of stock[m.key] ?? []) {
    const e = out.get(r.storeNumber) ?? new Map<string, PartStatus>();
    e.set(r.partNumber, r);
    out.set(r.storeNumber, e);
  }
  return out;
}
export type StockIndex = ReturnType<typeof indexStock>;

const isOn = (r: PartStatus | undefined) => r?.status === "available";

/** Stores of `stores` with at least one of `parts` available. */
export function storesWith(ix: StockIndex, parts: string[], stores: Store[]): Store[] {
  return stores.filter((s) => { const e = ix.get(s.storeNumber); return Boolean(e && parts.some((p) => isOn(e.get(p)))); });
}

/** The number a facet chip shows: stores with stock (a place), or configurations in stock (a store). */
export function chipCount(ix: StockIndex, product: Product, place: Place): number {
  if (place.level === "store") {
    const e = ix.get(place.store!.storeNumber);
    return e ? product.parts.filter((p) => isOn(e.get(p))).length : 0;
  }
  return storesWith(ix, product.parts, place.stores).length;
}

export interface Facet { product: Product; label: string; count: number; on: boolean; swatch?: string }
export interface Facets { models: Facet[]; storages: Facet[]; colors: Facet[] }

/** The three chip rows: switch model (keeping storage / color where the model has them), storage, color. */
export function facetsFor(ix: StockIndex, product: Product, place: Place): Facets {
  const models = MODELS.map((m) => {
    const p = productFor(m.key, product.storage, product.color);
    return { product: p, label: m.short === "Duo" ? "iPhone Duo" : m.short, count: chipCount(ix, p, place), on: m.key === product.model };
  });
  const storages = [undefined, ...storagesFor(product.model)].map((s) => {
    const p = productFor(product.model, s, product.color);
    return { product: p, label: s ?? "All", count: chipCount(ix, p, place), on: product.storage === s };
  });
  const colors = [undefined, ...colorsFor(product.model)].map((c) => {
    const p = productFor(product.model, product.storage, c);
    return { product: p, label: c ?? "All", count: chipCount(ix, p, place), on: product.color === c, swatch: c };
  });
  return { models, storages, colors };
}

export interface StoreLine {
  store: Store;
  /** Configurations of the product available now. */
  available: CatalogItem[];
  tracked: number;
  lastCheckedAt: string | null;
  lastAvailableAt: string | null;
  /** The one status row, for an exact configuration. */
  status?: PartStatus;
  distance?: number;
}

export function storeLine(ix: StockIndex, product: Product, store: Store): StoreLine {
  const e = ix.get(store.storeNumber);
  let lastCheckedAt: string | null = null;
  let lastAvailableAt: string | null = null;
  const available: CatalogItem[] = [];
  let tracked = 0;
  for (const p of product.parts) {
    const r = e?.get(p);
    if (!r) continue;
    tracked++;
    if (isOn(r)) { const item = PART_INDEX.get(p); if (item) available.push(item); }
    if (r.lastCheckedAt && (!lastCheckedAt || r.lastCheckedAt > lastCheckedAt)) lastCheckedAt = r.lastCheckedAt;
    if (r.lastAvailableAt && (!lastAvailableAt || r.lastAvailableAt > lastAvailableAt)) lastAvailableAt = r.lastAvailableAt;
  }
  return { store, available, tracked, lastCheckedAt, lastAvailableAt, status: product.parts.length === 1 ? e?.get(product.parts[0]) : undefined };
}

/** Stores of a place for a product: in stock first (most configurations first), then by most recent stock, then A–Z. */
export function storeLines(ix: StockIndex, product: Product, stores: Store[]): StoreLine[] {
  return stores.map((s) => storeLine(ix, product, s)).sort((a, b) =>
    b.available.length - a.available.length || (b.lastAvailableAt ?? "").localeCompare(a.lastAvailableAt ?? "") || a.store.name.localeCompare(b.store.name),
  );
}

/** Newest check across a set of lines (the "checked 4s ago" of a page). */
export function lastChecked(lines: StoreLine[]): string | null {
  let best: string | null = null;
  for (const l of lines) if (l.lastCheckedAt && (!best || l.lastCheckedAt > best)) best = l.lastCheckedAt;
  return best;
}

export interface GridCell { item: CatalogItem; product: Product; count: number; status?: PartStatus; inScope: boolean }

/** storage × color for the product's model: stores with each configuration (a place) or its status (a store). */
export function configGrid(ix: StockIndex, product: Product, place: Place): { storages: string[]; colors: string[]; cells: Map<string, GridCell> } {
  const storages = storagesFor(product.model);
  const colors = colorsFor(product.model);
  const cells = new Map<string, GridCell>();
  const scope = new Set(product.parts);
  for (const item of catalogFor(product.model)) {
    const p = productFor(product.model, item.storage, item.color);
    const status = place.level === "store" ? ix.get(place.store!.storeNumber)?.get(item.partNumber) : undefined;
    cells.set(`${item.storage}|${item.color}`, { item, product: p, count: chipCount(ix, p, place), status, inScope: scope.has(item.partNumber) });
  }
  return { storages, colors, cells };
}

export interface PlaceCount { place: Place; stores: number; inStock: number; distance?: number }

/** One level down: states of the US, two-plus-store cities of a state. */
export function childPlaces(ix: StockIndex, product: Product, place: Place): PlaceCount[] {
  const count = (p: Place): PlaceCount => ({ place: p, stores: p.stores.length, inStock: storesWith(ix, product.parts, p.stores).length });
  if (place.level === "us") {
    const names = [...new Set(STORES.map((s) => s.state))];
    return names.map((n) => count(statePlace(n)!)).sort((a, b) => b.inStock - a.inStock || b.stores - a.stores || a.place.name.localeCompare(b.place.name));
  }
  if (place.level === "state") {
    return multiStoreCities().filter((c) => c.state === place.state).map((c) => count(cityPlace(c.state, c.name)!)).sort((a, b) => b.inStock - a.inStock || b.stores - a.stores || a.place.name.localeCompare(b.place.name));
  }
  return [];
}

/** Sideways: bordering states (a state), or the nearest stores outside this city / store. */
export function siblingPlaces(ix: StockIndex, product: Product, place: Place, limit = 6): PlaceCount[] {
  if (place.level === "state") {
    return neighborStates(place.state!).map((n) => statePlace(n.name)!).map((p) => ({ place: p, stores: p.stores.length, inStock: storesWith(ix, product.parts, p.stores).length }));
  }
  if (place.level === "city" || place.level === "store") {
    const own = new Set(place.stores.map((s) => s.storeNumber));
    return STORES.filter((s) => !own.has(s.storeNumber))
      .map((s) => ({ s, d: distanceMiles(place.lat, place.lng, s.lat, s.lng) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, limit)
      .map(({ s, d }) => ({ place: storePlace(s), stores: 1, inStock: storesWith(ix, product.parts, [s]).length, distance: d }));
  }
  return [];
}

/** Nearest store outside the place that has the product now (for "not here — try …"). */
export function nearestWithStock(ix: StockIndex, product: Product, place: Place): { store: Store; distance: number } | null {
  const own = new Set(place.stores.map((s) => s.storeNumber));
  let best: { store: Store; distance: number } | null = null;
  for (const s of storesWith(ix, product.parts, STORES)) {
    if (own.has(s.storeNumber)) continue;
    const d = distanceMiles(place.lat, place.lng, s.lat, s.lng);
    if (!best || d < best.distance) best = { store: s, distance: d };
  }
  return best;
}
