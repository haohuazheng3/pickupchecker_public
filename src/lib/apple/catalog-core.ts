/**
 * The catalogue's code without its data: types, models, slugs, URLs, and createCatalog(), which builds every
 * data-dependent lookup over a given set of countries. Two modules feed it:
 *
 *  • catalog.ts — every country (the server, the poller, alerts, scripts, tests). Import from there.
 *  • catalog-us.ts — the US only, for client components and the modules they import: the same names over the
 *    US data alone, so the browser never downloads the other 18 countries' stores and catalogues.
 *
 * Nothing here imports a data file, so this module costs a client bundle a few kilobytes of code only.
 */
import { COUNTRIES, ALL_CODES, appleShopUrl, prefixOf, type CountryCode } from "./countries";

export type ModelKey = "18-pro" | "18-pro-max" | "duo";

export interface CatalogItem {
  model: string; // "iPhone 18 Pro"
  storage: string; // "256GB"
  color: string; // "Black"
  partNumber: string; // "MJQ34LL/A"
  sku: string; // "MJQ34"
  /** In the country's currency (US rows: USD). For a part sold in several countries use priceFor() / itemFor(). */
  price: number;
  /** ISO 4217; absent on US rows (USD). */
  currency?: string;
}

export interface Store {
  storeNumber: string;
  slug: string;
  name: string;
  city: string;
  /** US: the state's full name. Other countries: the region (province, prefecture, …) — same as `region`. */
  state: string;
  lat: number;
  lng: number;
  street?: string;
  postalCode?: string;
  /** US data: the state's full name (stateCodeOf() maps it). Other countries: regionCode ?? region. */
  stateCode?: string;
  phone?: string;
  image?: string;
  hours?: { days: string[]; opens: string | null; closes: string | null }[]; // null = closed that day
  url?: string;
  /** Lower-case site code ("us", "ca", "uk", …): the URL prefix and data directory. */
  country: CountryCode;
  /** ISO 3166-1 alpha-2 as Apple and the stores table use it ("GB" for the UK). */
  iso: string;
  /** The level between country and city in Apple's store list (US: the state). */
  region: string;
  /** ISO 3166-2 style short code where Apple gives one (CA "ON", AU "NSW"); US: the two-letter state code. */
  regionCode: string | null;
  /** Canonical IANA zone from Apple's store page (other countries); US rows fall back to the state table (storeTimeZone). */
  timeZone?: string;
  /** Apple's own name for the store in the local site ("Apple Union Square"). */
  nativeName?: string;
}

/** A store-shaped object whose country fields may be missing (then it is a US store). */
export type StoreLike = Omit<Store, "country" | "iso" | "region" | "regionCode"> & Partial<Pick<Store, "country" | "iso" | "region" | "regionCode">>;

export interface CoverageAnchor {
  anchorStore: string;
  anchorName: string;
  location: string; // zip
  covers: string[];
}

type Hours = { days: string[]; opens: string | null; closes: string | null }[];

/** A US row as stored in data/apple/stores.json (state = full name; stateCode is the full name too). */
export interface RawUsStore {
  storeNumber: string; slug: string; name: string; city: string; state: string; lat: number; lng: number;
  street?: string; postalCode?: string; stateCode?: string; phone?: string; image?: string; hours?: Hours; url?: string;
}

/** A row of data/apple/<cc>/stores.json (country is the ISO code: "GB" for the UK; Hong Kong and the UAE have no postcodes). */
export interface RawIntlStore {
  storeNumber: string; slug: string; name: string; city: string; region: string; regionCode: string | null; country: string;
  lat: number; lng: number; street?: string; postalCode?: string | null; phone?: string; image?: string; hours?: Hours;
  timezone?: string; url?: string; nativeName?: string;
}

/** A catalogue row; `price` is in the country's currency (the US file has no currency field: USD). */
export interface RawCatalogItem { model: string; storage: string; color: string; partNumber: string; sku: string; price: number; currency?: string }

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

export const STORAGE_ORDER = ["256GB", "512GB", "1TB", "2TB"];
export const COLOR_META: Record<string, { hex: string; label: string }> = {
  "Night Sky": { hex: "#1f2430", label: "Night Sky" },
  Black: { hex: "#15151a", label: "Black" },
  Silver: { hex: "#d9dadc", label: "Silver" },
  "Star White": { hex: "#ece9e2", label: "Star White" },
  Glacier: { hex: "#b9d6e8", label: "Glacier" },
  Burgundy: { hex: "#5a1f2b", label: "Burgundy" },
};

/* ------------------------------------------------------------------ stores: pure helpers */

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

export function stateCodeOf(store: StoreLike): string {
  if (store.country && store.country !== "us") return store.regionCode ?? store.region ?? store.state;
  const raw = store.stateCode && store.stateCode.length === 2 ? store.stateCode : STATE_CODES[store.state];
  return raw ?? store.state.slice(0, 2).toUpperCase();
}

/**
 * URL slug: lower case ASCII, words joined by "-". Accents are dropped (Zürich → zurich, Malmö → malmo,
 * Bouches-du-Rhône → bouches-du-rhone) and ß/ø/æ/œ spelled out; a typographic apostrophe joins its word
 * (Côte d’Or → cote-dor). ASCII input slugs exactly as it always did (every US path is pinned by a test).
 */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ß/g, "ss").replace(/ø/g, "o").replace(/æ/g, "ae").replace(/œ/g, "oe").replace(/[’‘]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function stateSlug(stateName: string): string {
  return slugify(stateName);
}

/** City slug ("Saint Louis" → "saint-louis"); store slugs come from Apple and never collide within a country (tested). */
export function citySlug(city: string): string {
  return slugify(city);
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

/**
 * Apple's Canadian store pages give backward-compatible zone names (Canada/Eastern …). Node resolves them, but
 * Postgres reads the host's zoneinfo, and Ubuntu 24.04 moved those names to the optional tzdata-legacy package:
 * `at time zone 'Canada/Eastern'` would fail there. Every zone that reaches SQL is a canonical one (tested).
 */
const LEGACY_TZ: Record<string, string> = {
  "Canada/Eastern": "America/Toronto", "Canada/Pacific": "America/Vancouver", "Canada/Mountain": "America/Edmonton",
  "Canada/Central": "America/Winnipeg", "Canada/Atlantic": "America/Halifax", "Canada/Newfoundland": "America/St_Johns",
  "Canada/Saskatchewan": "America/Regina", "Canada/Yukon": "America/Whitehorse",
};
export function canonicalTimeZone(tz: string | undefined | null): string | undefined {
  return tz ? (LEGACY_TZ[tz] ?? tz) : undefined;
}

/** The store's own zone (Apple's, for other countries) else its country's default; US stores: the state table, else New York. */
export function storeTimeZone(store: StoreLike): string {
  if (store.country && store.country !== "us") return canonicalTimeZone(store.timeZone) ?? COUNTRIES[store.country]?.timeZone ?? "UTC";
  return store.timeZone ?? STATE_TZ[stateCodeOf(store)] ?? "America/New_York";
}

/** A row of data/apple/stores.json → Store. */
export function usStoreFrom(s: RawUsStore): Store {
  return { ...s, country: "us", iso: "US", region: s.state, regionCode: STATE_CODES[s.state] ?? null };
}

/** A row of data/apple/<cc>/stores.json → Store (the zone made canonical). */
export function intlStoreFrom(r: RawIntlStore, cc: Exclude<CountryCode, "us">): Store {
  return {
    storeNumber: r.storeNumber, slug: r.slug, name: r.name, city: r.city,
    // Legacy readers group and route by `state`: for other countries that is the region.
    state: r.region, stateCode: r.regionCode ?? r.region,
    lat: r.lat, lng: r.lng, street: r.street, postalCode: r.postalCode ?? undefined, phone: r.phone, image: r.image, hours: r.hours, url: r.url,
    country: cc, iso: COUNTRIES[cc].iso, region: r.region, regionCode: r.regionCode, timeZone: canonicalTimeZone(r.timezone), nativeName: r.nativeName,
  };
}

/* ------------------------------------------------------------------ canonical URLs (pure) */

/**
 * Canonical URLs: {prefix}/stores/{region}/{city}/{store} — the US has no prefix (/stores/new-york/…), other
 * countries their code (/uk/stores/greater-london/london/regentstreet). City slugs can equal Apple's store slugs,
 * so depth disambiguates.
 *
 * One indexable page per place. A place collapses into the page that already says everything about it:
 *  • a region (US state) with one store → that store's page (11 US states)
 *  • a region whose stores are all in one city → that city's page (DC, Hawaii)
 *  • a city with one store → that store's page
 *  • a region or city holding every store of its country → the country's store index (Singapore, Hong Kong,
 *    Taiwan; never true in the US)
 *  • a country with a single store (Austria, Belgium) → that store's page
 */
export function storePath(store: Pick<Store, "state" | "city" | "slug"> & { country?: CountryCode }): string {
  return `${prefixOf(store.country ?? "us")}/stores/${stateSlug(store.state)}/${citySlug(store.city)}/${store.slug}`;
}

/** "/stores" for the US, "/uk/stores" for the UK: the country's store index URL (before collapsing). */
export function storesIndexPath(cc: CountryCode = "us"): string {
  return `${prefixOf(cc)}/stores`;
}

/** apple.com buy page for a model family (the 18 Pro Max is a display option under iphone-18-pro). */
export function appleFamilyUrl(model: ModelKey, cc: CountryCode = "us"): string {
  const family = model === "duo" ? "iphone-duo" : "iphone-18-pro";
  if (cc !== "us") return appleShopUrl(COUNTRIES[cc], family);
  return `https://www.apple.com/shop/buy-iphone/${family}`;
}

/** apple.com's "Buy iPhone" landing page of a country (alert emails link it). */
export function appleBuyIphoneUrl(cc: CountryCode = "us"): string {
  const c = COUNTRIES[cc];
  const p = c ? (c.buyPath ?? c.shopPath) : "";
  return p ? `https://www.apple.com/${p}/shop/buy-iphone` : "https://www.apple.com/shop/buy-iphone";
}

/**
 * apple.com buy page for one unlocked configuration, e.g.
 * https://www.apple.com/shop/buy-iphone/iphone-duo/7.6-inch-display-256gb-night-sky-unlocked
 * Pattern verified against apple.com on 2026-10-30: every catalog item resolves (tests/catalog.test.ts).
 * Other countries get the model family's page: the exact-configuration links are verified for the US only.
 */
export function appleBuyUrl(item: Pick<CatalogItem, "model" | "storage" | "color">, cc: CountryCode = "us"): string {
  const key = modelKeyFor(item.model);
  if (cc !== "us") return appleFamilyUrl(key, cc);
  const display = key === "duo" ? "7.6" : key === "18-pro-max" ? "6.9" : "6.3";
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${appleFamilyUrl(key)}/${display}-inch-display-${slug(item.storage)}-${slug(item.color)}-unlocked`;
}

/** "Apple Fifth Avenue", but "Apple Park Visitor Center" stays as it is. */
export function appleName(store: Pick<Store, "name">): string {
  return /^apple\b/i.test(store.name) ? store.name : `Apple ${store.name}`;
}

/**
 * Where a store is, in one short line: "New York, NY" in the US, "Toronto, Canada" / "London, UK" elsewhere
 * (just "Singapore" where the city is the country). `long` spells the US state out ("New York, New York").
 */
export function storeLocality(store: Pick<Store, "city" | "state"> & Partial<Pick<Store, "country" | "stateCode" | "region" | "regionCode">>, long = false): string {
  const cc = store.country ?? "us";
  if (cc === "us") return `${store.city}, ${long ? store.state : stateCodeOf(store as StoreLike)}`;
  const c = COUNTRIES[cc];
  if (store.city === c.name || store.city === c.short) return store.city;
  return `${store.city}, ${long ? c.name : c.short}`;
}

/* ------------------------------------------------------------------ data-dependent lookups */

export interface CityEntry { name: string; slug: string; state: string; stateSlug: string; stores: Store[]; country: CountryCode }

export type PlaceKind = "stores" | "region" | "city" | "store";

export interface PlaceTarget {
  /** What the URL names. */
  level: "country" | "region" | "city";
  /** The page that represents it: its own (indexable) or the one it collapses into. */
  kind: PlaceKind;
  /** Canonical path of that page; a request for any other path 308s here. */
  path: string;
  /** The requested place URL is itself the canonical page. */
  indexable: boolean;
  /** The stores the place holds. */
  stores: Store[];
  region?: string;
  city?: string;
}

const own = <T,>(rec: Partial<Record<CountryCode, T>>, cc: string): T | undefined => (Object.hasOwn(rec, cc) ? rec[cc as CountryCode] : undefined);

/**
 * Every lookup that reads stores or catalogues, over the countries given (catalog.ts: all 19; catalog-us.ts:
 * the US). A country that is not given has no stores and no catalogue here.
 */
export function createCatalog(storesBy: Partial<Record<CountryCode, Store[]>>, catalogsBy: Partial<Record<CountryCode, CatalogItem[]>>) {
  const codes = ALL_CODES.filter((cc) => Object.hasOwn(storesBy, cc) || Object.hasOwn(catalogsBy, cc));

  /* ---------------- catalogue */

  /** One country's catalogue: 40 configurations, prices in its currency. */
  function catalogOf(cc: CountryCode = "us"): CatalogItem[] {
    return own(catalogsBy, cc) ?? [];
  }

  function catalogFor(model: ModelKey, cc: CountryCode = "us"): CatalogItem[] {
    return catalogOf(cc).filter((c) => modelKeyFor(c.model) === model).sort(
      (a, b) => STORAGE_ORDER.indexOf(a.storage) - STORAGE_ORDER.indexOf(b.storage) || a.color.localeCompare(b.color),
    );
  }

  function storagesFor(model: ModelKey, cc: CountryCode = "us"): string[] {
    return [...new Set(catalogFor(model, cc).map((c) => c.storage))].sort(
      (a, b) => STORAGE_ORDER.indexOf(a) - STORAGE_ORDER.indexOf(b),
    );
  }

  function colorsFor(model: ModelKey, storage?: string, cc: CountryCode = "us"): string[] {
    return [...new Set(catalogFor(model, cc).filter((c) => !storage || c.storage === storage).map((c) => c.color))];
  }

  /** Part numbers of one model (optionally narrowed by storage / colour) in one country's catalogue. */
  function partNumbersFor(model: ModelKey, storages: string[] = [], colors: string[] = [], cc: CountryCode = "us"): string[] {
    return catalogFor(model, cc)
      .filter((c) => (storages.length === 0 || storages.includes(c.storage)) && (colors.length === 0 || colors.includes(c.color)))
      .map((c) => c.partNumber);
  }

  /**
   * Part number → catalogue item, every country given (US first, then INTL_CODES order). model/storage/color
   * are the same wherever a part number is sold; `price`/`currency` are those of the first country listing it —
   * for a store's or a country's item use itemFor() (or priceFor()).
   */
  const PART_INDEX: Map<string, CatalogItem> = new Map();
  for (const cc of codes) for (const c of catalogOf(cc)) if (!PART_INDEX.has(c.partNumber)) PART_INDEX.set(c.partNumber, c);

  const PARTS_OF = new Map<CountryCode, string[]>(codes.map((cc) => [cc, catalogOf(cc).map((c) => c.partNumber)]));
  /** One country's part numbers, catalogue order. */
  function partNumbersOf(cc: CountryCode = "us"): string[] {
    return PARTS_OF.get(cc) ?? [];
  }

  const ITEM = new Map<string, CatalogItem>();
  for (const cc of codes) for (const c of catalogOf(cc)) ITEM.set(`${cc}|${c.partNumber}`, c);
  /** A part's list price in one country's currency, or undefined when that country does not sell it. */
  function priceFor(partNumber: string, cc: CountryCode = "us"): number | undefined {
    return ITEM.get(`${cc}|${partNumber}`)?.price;
  }
  /**
   * The catalogue item of a part as one country sells it (its price and currency); a part that country does not
   * list falls back to PART_INDEX (model, storage and colour are right, the price may be another country's).
   */
  function itemFor(partNumber: string, cc: CountryCode = "us"): CatalogItem | undefined {
    return ITEM.get(`${cc}|${partNumber}`) ?? PART_INDEX.get(partNumber);
  }

  /**
   * True when no other country sells any of this country's part numbers (US LL/A, CA VC/A, FR F/A, JP J/A…):
   * filtering a read by the country's parts then pins it to the country. Shared ones (ZD/A in DE, AT, NL and
   * BE; QN/A in the UK and SE; QL/A in IT, ES and CH; X/A in AU and SG) need the country's store list.
   */
  const SHARED = new Set<CountryCode>();
  {
    const owners = new Map<string, Set<CountryCode>>();
    for (const cc of codes) for (const p of partNumbersOf(cc)) owners.set(p, (owners.get(p) ?? new Set()).add(cc));
    for (const set of owners.values()) if (set.size > 1) for (const cc of set) SHARED.add(cc);
  }
  function hasOwnPartNumbers(cc: CountryCode): boolean {
    return !SHARED.has(cc);
  }

  /* ---------------- stores */

  /** One country's stores, in its data file's order. */
  function storesOf(cc: CountryCode = "us"): Store[] {
    return own(storesBy, cc) ?? [];
  }

  /** Every store of every country given: the US first, then INTL_CODES order. */
  const ALL_STORES: Store[] = codes.flatMap((cc) => storesOf(cc));

  /** Store number → store, every country given (R### is unique worldwide; tested). */
  const STORE_INDEX: Map<string, Store> = new Map(ALL_STORES.map((s) => [s.storeNumber, s]));

  /** The country a store belongs to (undefined for an unknown store number). */
  function countryOfStore(storeNumber: string): CountryCode | undefined {
    return STORE_INDEX.get(storeNumber)?.country;
  }

  /** The store, only when it belongs to `cc` (US pages validate URL input with this, so foreign ids stay ignored). */
  function storeInCountry(storeNumber: string, cc: CountryCode = "us"): Store | undefined {
    const s = STORE_INDEX.get(storeNumber);
    return s && s.country === cc ? s : undefined;
  }

  /** Part numbers a store's country uses for a model (narrowed by storage / colour); [] for an unknown store. */
  function partNumbersForStore(storeNumber: string, model: ModelKey, storages: string[] = [], colors: string[] = []): string[] {
    const cc = countryOfStore(storeNumber);
    return cc ? partNumbersFor(model, storages, colors, cc) : [];
  }

  function storeByNumber(n: string): Store | undefined {
    return STORE_INDEX.get(n);
  }

  function statesWithStores(cc: CountryCode = "us"): { name: string; code: string; slug: string; count: number }[] {
    const map = new Map<string, number>();
    const list = storesOf(cc);
    for (const s of list) map.set(s.state, (map.get(s.state) ?? 0) + 1);
    return [...map.entries()]
      .map(([name, count]) => ({ name, code: cc === "us" ? (STATE_CODES[name] ?? name) : (list.find((s) => s.state === name)?.regionCode ?? name), slug: stateSlug(name), count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function storesNear(lat: number, lng: number, radiusMiles: number, cc: CountryCode = "us"): (Store & { distance: number })[] {
    return storesOf(cc).map((s) => ({ ...s, distance: distanceMiles(lat, lng, s.lat, s.lng) }))
      .filter((s) => s.distance <= radiusMiles)
      .sort((a, b) => a.distance - b.distance);
  }

  const _cities = new Map<CountryCode, CityEntry[]>();
  /** Cities with at least one store, grouped per state (region), for one country. */
  function citiesWithStores(cc: CountryCode = "us"): CityEntry[] {
    const hit = _cities.get(cc);
    if (hit) return hit.map((c) => ({ ...c, stores: [...c.stores] }));
    const map = new Map<string, CityEntry>();
    for (const s of storesOf(cc)) {
      const key = `${s.state}|${s.city}`;
      const e = map.get(key) ?? { name: s.city, slug: citySlug(s.city), state: s.state, stateSlug: stateSlug(s.state), stores: [], country: cc };
      e.stores.push(s);
      map.set(key, e);
    }
    const out = [...map.values()].sort((a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name));
    _cities.set(cc, out);
    return out.map((c) => ({ ...c, stores: [...c.stores] }));
  }

  function cityBySlug(stateSlugValue: string, slug: string, cc: CountryCode = "us"): CityEntry | undefined {
    return citiesWithStores(cc).find((c) => c.stateSlug === stateSlugValue && c.slug === slug);
  }

  /* ---------------- one page per place (see storePath's note) */

  type Target = { kind: PlaceKind; path: string };

  /** The country's store index, or its only store. */
  function countryTarget(cc: CountryCode): Target {
    const all = storesOf(cc);
    if (all.length === 1) return { kind: "store", path: storePath(all[0]) };
    return { kind: "stores", path: storesIndexPath(cc) };
  }

  function regionTarget(cc: CountryCode, regionName: string, here: Store[]): Target {
    if (here.length === 1) return { kind: "store", path: storePath(here[0]) };
    if (here.length > 1 && here.length >= storesOf(cc).length) return countryTarget(cc);
    // All stores in one city (District of Columbia, Hawaii): the city page is the region's page.
    if (here.length > 1 && new Set(here.map((s) => s.city)).size === 1) return { kind: "city", path: `${prefixOf(cc)}/stores/${stateSlug(regionName)}/${citySlug(here[0].city)}` };
    return { kind: "region", path: `${prefixOf(cc)}/stores/${stateSlug(regionName)}` };
  }

  function cityTarget(cc: CountryCode, regionName: string, city: string, here: Store[]): Target {
    if (here.length === 1) return { kind: "store", path: storePath(here[0]) };
    if (here.length > 1 && here.length >= storesOf(cc).length) return countryTarget(cc);
    return { kind: "city", path: `${prefixOf(cc)}/stores/${stateSlug(regionName)}/${citySlug(city)}` };
  }

  const storesInRegion = (cc: CountryCode, regionName: string) => storesOf(cc).filter((s) => s.state === regionName);

  /**
   * The page for a state (region): a region page where it has two or more stores in two or more cities;
   * otherwise the page it collapses into (see storePath's note).
   */
  function statePath(stateName: string, cc: CountryCode = "us"): string {
    return regionTarget(cc, stateName, storesInRegion(cc, stateName)).path;
  }

  /** Regions that get a page of their own: two or more stores in two or more cities, and not the whole country. */
  function hasStatePage(stateName: string, cc: CountryCode = "us"): boolean {
    const here = storesInRegion(cc, stateName);
    return here.length > 1 && new Set(here.map((s) => s.city)).size > 1 && here.length < storesOf(cc).length;
  }

  /** True when the state (region) has exactly one Apple Store. */
  function isOneStoreState(stateName: string, cc: CountryCode = "us"): boolean {
    return storesInRegion(cc, stateName).length === 1;
  }

  /** Stores per "country|state|city", built once. */
  let _byCity: Map<string, Store[]> | null = null;
  function storesInCity(stateName: string, city: string, cc: CountryCode): Store[] {
    if (!_byCity) {
      _byCity = new Map();
      for (const s of ALL_STORES) { const k = `${s.country}|${s.state}|${s.city}`; const a = _byCity.get(k) ?? []; a.push(s); _byCity.set(k, a); }
    }
    return _byCity.get(`${cc}|${stateName}|${city}`) ?? [];
  }

  /**
   * The page for a city: a city page only where the city has two or more stores. A one-store city is
   * that store (its page carries the city in the title), so 200 near-duplicate city pages never exist.
   */
  function cityPath(stateName: string, city: string, cc: CountryCode = "us"): string {
    return cityTarget(cc, stateName, city, storesInCity(stateName, city, cc)).path;
  }

  /** True when the city has exactly one Apple Store. */
  function isOneStoreCity(stateName: string, city: string, cc: CountryCode = "us"): boolean {
    return storesInCity(stateName, city, cc).length === 1;
  }

  /**
   * Resolve a /stores URL of one country — {prefix}/stores[/{region}[/{city}]] — to the page that answers it,
   * applying the one-page-per-place rules (storePath's note). null = no such place (a real 404).
   * For the US it agrees with statePath / cityPath / hasStatePage, which the US routes already use.
   */
  function placeTarget(cc: CountryCode, regionSlug?: string, citySlugValue?: string): PlaceTarget | null {
    const all = storesOf(cc);
    if (all.length === 0) return null;
    if (!regionSlug) {
      const t = countryTarget(cc);
      return { level: "country", ...t, indexable: t.path === storesIndexPath(cc), stores: all };
    }
    const region = statesWithStores(cc).find((r) => r.slug === regionSlug);
    if (!region) return null;
    if (citySlugValue === undefined) {
      const here = storesInRegion(cc, region.name);
      const t = regionTarget(cc, region.name, here);
      return { level: "region", ...t, indexable: t.path === `${prefixOf(cc)}/stores/${regionSlug}`, stores: here, region: region.name };
    }
    const city = cityBySlug(regionSlug, citySlugValue, cc);
    if (!city) return null;
    const t = cityTarget(cc, city.state, city.name, city.stores);
    return { level: "city", ...t, indexable: t.path === `${prefixOf(cc)}/stores/${regionSlug}/${citySlugValue}`, stores: city.stores, region: city.state, city: city.name };
  }

  return {
    catalogOf, catalogFor, storagesFor, colorsFor, partNumbersFor, PART_INDEX, partNumbersOf, priceFor, itemFor, hasOwnPartNumbers,
    storesOf, ALL_STORES, STORE_INDEX, countryOfStore, storeInCountry, partNumbersForStore, storeByNumber,
    statesWithStores, storesNear, citiesWithStores, cityBySlug,
    statePath, hasStatePage, isOneStoreState, cityPath, isOneStoreCity, placeTarget,
  };
}

export type Catalog = ReturnType<typeof createCatalog>;
