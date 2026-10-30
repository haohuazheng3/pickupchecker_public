/**
 * Product catalog and store dataset (static JSON captured from apple.com, see docs/research.md).
 * These are bundled at build time; the database mirrors them (scripts/seed.ts) for joins.
 */
import catalogJson from "../../../data/apple/catalog.json";
import storesJson from "../../../data/apple/stores.json";
import coverageJson from "../../../data/apple/coverage-plan.json";

export type ModelKey = "18-pro" | "18-pro-max" | "duo";

export interface CatalogItem {
  model: string; // "iPhone 18 Pro"
  storage: string; // "256GB"
  color: string; // "Black"
  partNumber: string; // "MJQ34LL/A"
  sku: string; // "MJQ34"
  price: number;
}

export interface Store {
  storeNumber: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  street?: string;
  postalCode?: string;
  stateCode?: string;
  phone?: string;
  image?: string;
  hours?: { days: string[]; opens: string | null; closes: string | null }[]; // null = closed that day
  url?: string;
}

export interface CoverageAnchor {
  anchorStore: string;
  anchorName: string;
  location: string; // zip
  covers: string[];
}

/** Duo first everywhere: it is the scarce one and what nearly every visitor is here for. */
export const MODELS: { key: ModelKey; name: string; short: string; slug: string; blurb: string }[] = [
  { key: "duo", name: "iPhone Duo", short: "Duo", slug: "iphone-duo", blurb: "The foldable" },
  { key: "18-pro", name: "iPhone 18 Pro", short: "18 Pro", slug: "iphone-18-pro", blurb: "6.3-inch Pro" },
  { key: "18-pro-max", name: "iPhone 18 Pro Max", short: "18 Pro Max", slug: "iphone-18-pro-max", blurb: "6.9-inch Pro" },
];
export const DEFAULT_MODEL: ModelKey = "duo";

export function modelKeyFor(modelName: string): ModelKey {
  if (/pro max/i.test(modelName)) return "18-pro-max";
  if (/duo/i.test(modelName)) return "duo";
  return "18-pro";
}

export function modelByKey(key: string) {
  return MODELS.find((m) => m.key === key);
}

export function modelBySlug(slug: string) {
  return MODELS.find((m) => m.slug === slug);
}

export const CATALOG: CatalogItem[] = (catalogJson as CatalogItem[]).map((c) => ({ ...c }));

export const STORAGE_ORDER = ["256GB", "512GB", "1TB", "2TB"];
export const COLOR_META: Record<string, { hex: string; label: string }> = {
  "Night Sky": { hex: "#1f2430", label: "Night Sky" },
  Black: { hex: "#15151a", label: "Black" },
  Silver: { hex: "#d9dadc", label: "Silver" },
  "Star White": { hex: "#ece9e2", label: "Star White" },
  Glacier: { hex: "#b9d6e8", label: "Glacier" },
  Burgundy: { hex: "#5a1f2b", label: "Burgundy" },
};

export function catalogFor(model: ModelKey): CatalogItem[] {
  return CATALOG.filter((c) => modelKeyFor(c.model) === model).sort(
    (a, b) => STORAGE_ORDER.indexOf(a.storage) - STORAGE_ORDER.indexOf(b.storage) || a.color.localeCompare(b.color),
  );
}

export function storagesFor(model: ModelKey): string[] {
  return [...new Set(catalogFor(model).map((c) => c.storage))].sort(
    (a, b) => STORAGE_ORDER.indexOf(a) - STORAGE_ORDER.indexOf(b),
  );
}

export function colorsFor(model: ModelKey, storage?: string): string[] {
  return [...new Set(catalogFor(model).filter((c) => !storage || c.storage === storage).map((c) => c.color))];
}

export function partNumbersFor(model: ModelKey, storages: string[] = [], colors: string[] = []): string[] {
  return catalogFor(model)
    .filter((c) => (storages.length === 0 || storages.includes(c.storage)) && (colors.length === 0 || colors.includes(c.color)))
    .map((c) => c.partNumber);
}

export const PART_INDEX: Map<string, CatalogItem> = new Map(CATALOG.map((c) => [c.partNumber, c]));
export const ALL_PART_NUMBERS: string[] = CATALOG.map((c) => c.partNumber);

export const STORES: Store[] = storesJson as Store[];
export const STORE_INDEX: Map<string, Store> = new Map(STORES.map((s) => [s.storeNumber, s]));
export const COVERAGE: CoverageAnchor[] = coverageJson as CoverageAnchor[];

/** Two-letter code for a state name ("New York" → "NY"); stores.json carries full names. */
export const STATE_CODES: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO", Connecticut: "CT",
  Delaware: "DE", "District of Columbia": "DC", Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID", Illinois: "IL",
  Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE",
  Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", "North Carolina": "NC",
  "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI",
  "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT", Virginia: "VA",
  Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY", "Puerto Rico": "PR",
};

export function stateCodeOf(store: Store): string {
  const raw = store.stateCode && store.stateCode.length === 2 ? store.stateCode : STATE_CODES[store.state];
  return raw ?? store.state.slice(0, 2).toUpperCase();
}

export function stateSlug(stateName: string): string {
  return stateName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function statesWithStores(): { name: string; code: string; slug: string; count: number }[] {
  const map = new Map<string, number>();
  for (const s of STORES) map.set(s.state, (map.get(s.state) ?? 0) + 1);
  return [...map.entries()]
    .map(([name, count]) => ({ name, code: STATE_CODES[name] ?? name, slug: stateSlug(name), count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Haversine distance in miles. */
export function distanceMiles(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 3958.8;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function storesNear(lat: number, lng: number, radiusMiles: number): (Store & { distance: number })[] {
  return STORES.map((s) => ({ ...s, distance: distanceMiles(lat, lng, s.lat, s.lng) }))
    .filter((s) => s.distance <= radiusMiles)
    .sort((a, b) => a.distance - b.distance);
}

/** City slug ("Saint Louis" → "saint-louis"); store slugs come from Apple and never collide (tested). */
export function citySlug(city: string): string {
  return city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export interface CityEntry { name: string; slug: string; state: string; stateSlug: string; stores: Store[] }

/** Cities with at least one store, grouped per state. */
export function citiesWithStores(): CityEntry[] {
  const map = new Map<string, CityEntry>();
  for (const s of STORES) {
    const key = `${s.state}|${s.city}`;
    const e = map.get(key) ?? { name: s.city, slug: citySlug(s.city), state: s.state, stateSlug: stateSlug(s.state), stores: [] };
    e.stores.push(s);
    map.set(key, e);
  }
  return [...map.values()].sort((a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name));
}

export function cityBySlug(stateSlugValue: string, slug: string): CityEntry | undefined {
  return citiesWithStores().find((c) => c.stateSlug === stateSlugValue && c.slug === slug);
}

/** IANA zone per state for "typical restock time" charts (states that span zones use their larger part). */
const STATE_TZ: Record<string, string> = {
  AL: "America/Chicago", AK: "America/Anchorage", AZ: "America/Phoenix", AR: "America/Chicago", CA: "America/Los_Angeles", CO: "America/Denver", CT: "America/New_York",
  DE: "America/New_York", DC: "America/New_York", FL: "America/New_York", GA: "America/New_York", HI: "Pacific/Honolulu", ID: "America/Boise", IL: "America/Chicago", IN: "America/Indiana/Indianapolis",
  IA: "America/Chicago", KS: "America/Chicago", KY: "America/New_York", LA: "America/Chicago", ME: "America/New_York", MD: "America/New_York", MA: "America/New_York", MI: "America/Detroit",
  MN: "America/Chicago", MS: "America/Chicago", MO: "America/Chicago", MT: "America/Denver", NE: "America/Chicago", NV: "America/Los_Angeles", NH: "America/New_York", NJ: "America/New_York",
  NM: "America/Denver", NY: "America/New_York", NC: "America/New_York", ND: "America/Chicago", OH: "America/New_York", OK: "America/Chicago", OR: "America/Los_Angeles", PA: "America/New_York",
  RI: "America/New_York", SC: "America/New_York", SD: "America/Chicago", TN: "America/Chicago", TX: "America/Chicago", UT: "America/Denver", VT: "America/New_York", VA: "America/New_York",
  WA: "America/Los_Angeles", WV: "America/New_York", WI: "America/Chicago", WY: "America/Denver", PR: "America/Puerto_Rico",
};
export function storeTimeZone(store: Store): string {
  return STATE_TZ[stateCodeOf(store)] ?? "America/New_York";
}

/** Canonical URLs: /stores/{state}/{city}/{store}. City slugs can equal Apple's store slugs, so depth disambiguates. */
export function statePath(stateName: string): string {
  return `/stores/${stateSlug(stateName)}`;
}
export function cityPath(stateName: string, city: string): string {
  return `/stores/${stateSlug(stateName)}/${citySlug(city)}`;
}
export function storePath(store: Pick<Store, "state" | "city" | "slug">): string {
  return `/stores/${stateSlug(store.state)}/${citySlug(store.city)}/${store.slug}`;
}
/** apple.com buy page for a model family (the 18 Pro Max is a display option under iphone-18-pro). */
export function appleFamilyUrl(model: ModelKey): string {
  return `https://www.apple.com/shop/buy-iphone/${model === "duo" ? "iphone-duo" : "iphone-18-pro"}`;
}

/**
 * apple.com buy page for one unlocked configuration, e.g.
 * https://www.apple.com/shop/buy-iphone/iphone-duo/7.6-inch-display-256gb-night-sky-unlocked
 * Pattern verified against apple.com on 2026-10-30: every catalog item resolves (tests/catalog.test.ts).
 */
export function appleBuyUrl(item: Pick<CatalogItem, "model" | "storage" | "color">): string {
  const key = modelKeyFor(item.model);
  const display = key === "duo" ? "7.6" : key === "18-pro-max" ? "6.9" : "6.3";
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${appleFamilyUrl(key)}/${display}-inch-display-${slug(item.storage)}-${slug(item.color)}-unlocked`;
}

export function storeByNumber(n: string): Store | undefined {
  return STORE_INDEX.get(n);
}
