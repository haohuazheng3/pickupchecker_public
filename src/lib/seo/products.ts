/**
 * The product × place page tree under /stock:
 *
 *   /stock/{product}                               the whole US
 *   /stock/{product}/{state}                       one state
 *   /stock/{product}/{state}/{city}                one city (only cities with 2+ stores; a one-store
 *                                                  city redirects to its store)
 *   /stock/{product}/{state}/{city}/{store}        one store
 *
 * A product is a model ("iphone-duo"), a model in one storage ("iphone-duo-512gb"), in one color
 * ("iphone-duo-night-sky") or one exact configuration ("iphone-duo-512gb-night-sky"): 3 + 12 + 10 + 40 = 65.
 * Every page links to its neighbours along both axes, so moving between them is one tap.
 */
import { MODELS, STORES, STATE_CODES, catalogFor, citiesWithStores, citySlug, colorsFor, stateSlug, storagesFor, storeTimeZone, type ModelKey, type Store, appleName } from "../apple/catalog";

export type ProductKind = "model" | "storage" | "color" | "config";

export interface Product {
  slug: string;
  kind: ProductKind;
  model: ModelKey;
  storage?: string;
  color?: string;
  /** "iPhone Duo 512GB Night Sky" */
  name: string;
  /** "Duo 512GB Night Sky" */
  short: string;
  /** "512GB Night Sky", "512GB", "Night Sky" or "" for a whole model. */
  variant: string;
  /** Apple part numbers covered, storage then color order. */
  parts: string[];
}

export function slugPart(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function productSlug(model: ModelKey, storage?: string, color?: string): string {
  const m = MODELS.find((x) => x.key === model)!;
  return [m.slug, storage ? slugPart(storage) : null, color ? slugPart(color) : null].filter(Boolean).join("-");
}

function make(model: ModelKey, storage?: string, color?: string): Product {
  const m = MODELS.find((x) => x.key === model)!;
  const variant = [storage, color].filter(Boolean).join(" ");
  const kind: ProductKind = storage && color ? "config" : storage ? "storage" : color ? "color" : "model";
  const parts = catalogFor(model).filter((c) => (!storage || c.storage === storage) && (!color || c.color === color)).map((c) => c.partNumber);
  return { slug: productSlug(model, storage, color), kind, model, storage, color, name: variant ? `${m.name} ${variant}` : m.name, short: variant ? `${m.short} ${variant}` : m.short, variant, parts };
}

/** Every product, model by model: the model, its storages, its colors, then every configuration. */
export const PRODUCTS: Product[] = MODELS.flatMap((m) => [
  make(m.key),
  ...storagesFor(m.key).map((s) => make(m.key, s)),
  ...colorsFor(m.key).map((c) => make(m.key, undefined, c)),
  ...catalogFor(m.key).map((c) => make(m.key, c.storage, c.color)),
]);
const BY_SLUG = new Map(PRODUCTS.map((p) => [p.slug, p]));

/**
 * National storage-size pages whose own keyword has no opening (seo.md §10, per-page SERP check of
 * 2026-10-30): the mobile top 10 is Apple, carriers and big retailers, with at most one weak result in
 * the top 5 (SERP-KD 57-88). They stay up for visitors and in the internal links, as noindex, follow,
 * and out of the sitemap. Every other national model, storage and color page is indexed.
 */
export const NOT_INDEXED_PRODUCTS: ReadonlySet<string> = new Set([
  "iphone-duo-512gb",
  "iphone-18-pro-256gb", "iphone-18-pro-512gb", "iphone-18-pro-1tb", "iphone-18-pro-2tb",
  "iphone-18-pro-max-512gb", "iphone-18-pro-max-1tb", "iphone-18-pro-max-2tb",
]);

/** The product pages that are indexed: national (US) pages of a model, a storage size or a color, minus the list above. */
export function isIndexedProductPage(product: Pick<Product, "slug" | "kind">, place: Pick<Place, "level">): boolean {
  return place.level === "us" && product.kind !== "config" && !NOT_INDEXED_PRODUCTS.has(product.slug);
}

export function productBySlug(slug: string): Product | undefined {
  return BY_SLUG.get(slug);
}

/** The product for a model and (optional) storage / color; an option the model does not have is dropped. */
export function productFor(model: ModelKey, storage?: string, color?: string): Product {
  const s = storage && storagesFor(model).includes(storage) ? storage : undefined;
  const c = color && colorsFor(model).includes(color) ? color : undefined;
  return BY_SLUG.get(productSlug(model, s, c)) ?? BY_SLUG.get(productSlug(model, s)) ?? BY_SLUG.get(productSlug(model))!;
}

/* ------------------------------------------------------------------ places */

export type PlaceLevel = "us" | "state" | "city" | "store";

export interface Place {
  level: PlaceLevel;
  /** URL segments after the product slug. */
  segments: string[];
  /** "the US", "Texas", "Austin, TX", "Apple Barton Creek" */
  name: string;
  /** Breadcrumb label: "US", "Texas", "Austin", "Barton Creek" */
  label: string;
  stores: Store[];
  state?: string;
  stateSlug?: string;
  stateCode?: string;
  city?: string;
  citySlug?: string;
  store?: Store;
  tz: string;
  lat: number;
  lng: number;
}

const mid = (stores: Store[]) => ({ lat: stores.reduce((a, s) => a + s.lat, 0) / Math.max(1, stores.length), lng: stores.reduce((a, s) => a + s.lng, 0) / Math.max(1, stores.length) });

export const US: Place = { level: "us", segments: [], name: "the US", label: "US", stores: STORES, tz: "America/New_York", ...mid(STORES) };

export function statePlace(stateName: string): Place | null {
  const stores = STORES.filter((s) => s.state === stateName);
  if (stores.length === 0) return null;
  const code = STATE_CODES[stateName] ?? stateName.slice(0, 2).toUpperCase();
  return { level: "state", segments: [stateSlug(stateName)], name: stateName, label: stateName, stores, state: stateName, stateSlug: stateSlug(stateName), stateCode: code, tz: storeTimeZone(stores[0]), ...mid(stores) };
}

/** A city page exists only where a city has two or more stores; otherwise the store page is the city page. */
export function cityPlace(stateName: string, city: string): Place | null {
  const stores = STORES.filter((s) => s.state === stateName && s.city === city).sort((a, b) => a.name.localeCompare(b.name));
  if (stores.length < 2) return null;
  const code = STATE_CODES[stateName] ?? stateName.slice(0, 2).toUpperCase();
  return { level: "city", segments: [stateSlug(stateName), citySlug(city)], name: `${city}, ${code}`, label: city, stores, state: stateName, stateSlug: stateSlug(stateName), stateCode: code, city, citySlug: citySlug(city), tz: storeTimeZone(stores[0]), ...mid(stores) };
}

export function storePlace(store: Store): Place {
  const code = STATE_CODES[store.state] ?? store.state.slice(0, 2).toUpperCase();
  return { level: "store", segments: [stateSlug(store.state), citySlug(store.city), store.slug], name: `${appleName(store)}`, label: store.name, stores: [store], state: store.state, stateSlug: stateSlug(store.state), stateCode: code, city: store.city, citySlug: citySlug(store.city), store, tz: storeTimeZone(store), lat: store.lat, lng: store.lng };
}

/** Cities with two or more stores (the only city pages in the product tree). */
export function multiStoreCities() {
  return citiesWithStores().filter((c) => c.stores.length > 1);
}

/** URL segments → place; a one-store city answers with the segments of its store. */
export function resolvePlace(segments: string[]): Place | { redirect: string[] } | null {
  if (segments.length === 0) return US;
  const state = STORES.find((s) => stateSlug(s.state) === segments[0])?.state;
  if (!state) return null;
  if (segments.length === 1) return statePlace(state);
  const inCity = STORES.filter((s) => s.state === state && citySlug(s.city) === segments[1]);
  if (inCity.length === 0) return null;
  if (segments.length === 2) return inCity.length === 1 ? { redirect: storePlace(inCity[0]).segments } : cityPlace(state, inCity[0].city);
  if (segments.length === 3) {
    const store = inCity.find((s) => s.slug === segments[2]);
    return store ? storePlace(store) : null;
  }
  return null;
}

/** The chain of places from the US down to this one (one-store cities are skipped). */
export function placeChain(place: Place): Place[] {
  const out: Place[] = [US];
  if (place.level === "us") return out;
  out.push(statePlace(place.state!)!);
  if (place.level === "state") return out;
  const city = cityPlace(place.state!, place.city!);
  if (city) out.push(city);
  if (place.level === "store") out.push(place);
  return out;
}

export function productPath(product: Pick<Product, "slug">, place: Pick<Place, "segments"> = US): string {
  return `/stock/${product.slug}${place.segments.length ? `/${place.segments.join("/")}` : ""}`;
}

/**
 * The page a place's content really belongs to: a state with one store is that store's page, a state
 * whose stores all sit in one (two-plus-store) city is that city's page. Used for canonical and sitemap.
 */
export function canonicalPlace(place: Place): Place {
  if (place.level !== "state") return place;
  if (place.stores.length === 1) return storePlace(place.stores[0]);
  const cities = new Set(place.stores.map((s) => s.city));
  if (cities.size === 1) return cityPlace(place.state!, place.stores[0].city) ?? place;
  return place;
}

/** Shortest phrase for "in {place}" / "at {store}". */
export function inPlace(place: Place): string {
  return place.level === "store" ? `at ${place.name}` : `in ${place.name}`;
}
