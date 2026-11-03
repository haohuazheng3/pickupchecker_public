/**
 * Where a visitor is looking from, and how far every store is. The store step ranks all 269 Apple
 * Stores by distance from an anchor: the device's location, a ZIP, a typed city / state / store, the
 * place an SEO page handed in, or a store a page pre-ticked. Another country's pages hand in their own
 * store list (`pool`): ranking and search then run over it, without ZIPs.
 */
import { STORES, distanceMiles, stateCodeOf, type Store } from "@/lib/apple/catalog-us";

/** The fields ranking and search read: a whole Store, or the slim copy another country's page sends the browser. */
export type GeoStore = Pick<Store, "storeNumber" | "name" | "city" | "state" | "lat" | "lng"> & Partial<Pick<Store, "slug" | "country" | "region" | "regionCode" | "stateCode" | "street" | "postalCode">>;
import { norm } from "@/lib/text";
import type { Lang } from "@/lib/i18n/locales";
import { LANG_TAG, num, secs, unit as amount } from "@/lib/i18n/format";
import { appleStoreLabel, cityLabel, regionLabel, storeLabel } from "@/lib/i18n/places";

/** norm, keeping the letters of every script ("銀座", "서울", "münchen" → "munchen"): searches in another language. */
function normAny(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export type AnchorKind = "here" | "zip" | "place" | "store" | "state";
export interface Anchor {
  lat: number;
  lng: number;
  label: string;
  kind: AnchorKind;
  /** Stores that belong to the searched place: they lead the list, the rest follow by distance. */
  first?: Set<string>;
  /** The point is a guess (a ZIP area with no store): rank by it, but never pre-tick from it. */
  approx?: boolean;
}
export type Ranked<S extends GeoStore = Store> = S & { distance: number };

export function centroid(stores: Pick<Store, "lat" | "lng">[]): { lat: number; lng: number } | null {
  if (stores.length === 0) return null;
  return { lat: stores.reduce((a, s) => a + s.lat, 0) / stores.length, lng: stores.reduce((a, s) => a + s.lng, 0) / stores.length };
}

/** Every store (of `pool`, default the US), nearest first; the anchor's own stores (a searched city or state) stay ahead of the rest. */
export function rankStores<S extends GeoStore = Store>(anchor: Anchor, pool: S[] = STORES as unknown as S[]): Ranked<S>[] {
  const first = anchor.first;
  const inFirst = (s: S) => Boolean(first?.has(s.storeNumber));
  // A whole state has no meaningful centre: its own stores go A–Z by city, the rest follow by distance.
  const byPlace = anchor.kind === "state";
  return pool.map((s) => ({ ...s, distance: distanceMiles(anchor.lat, anchor.lng, s.lat, s.lng) })).sort((a, b) => {
    const fa = inFirst(a), fb = inFirst(b);
    if (fa !== fb) return Number(fb) - Number(fa);
    if (byPlace && fa) return a.city.localeCompare(b.city) || a.name.localeCompare(b.name);
    return a.distance - b.distance || a.name.localeCompare(b.name);
  });
}

/** Stores by the first three digits of their ZIP (a USPS sectional area, roughly one metro). */
const SECTIONALS: Map<number, Store[]> = (() => {
  const m = new Map<number, Store[]>();
  for (const s of STORES) {
    const pc = (s.postalCode ?? "").replace(/\D/g, "");
    if (pc.length < 3) continue;
    const k = Number(pc.slice(0, 3));
    const arr = m.get(k) ?? [];
    arr.push(s);
    m.set(k, arr);
  }
  return m;
})();

/** USPS sectional ranges → state (full name, as in the store table). Numbering is contiguous within a state only. */
const ZIP3_STATES: [number, number, string][] = [
  [5, 5, "New York"], [6, 9, "Puerto Rico"], [10, 27, "Massachusetts"], [28, 29, "Rhode Island"], [30, 38, "New Hampshire"], [39, 49, "Maine"],
  [50, 59, "Vermont"], [60, 69, "Connecticut"], [70, 89, "New Jersey"], [100, 149, "New York"], [150, 196, "Pennsylvania"], [197, 199, "Delaware"],
  [200, 205, "District of Columbia"], [206, 219, "Maryland"], [220, 246, "Virginia"], [247, 268, "West Virginia"], [270, 289, "North Carolina"],
  [290, 299, "South Carolina"], [300, 319, "Georgia"], [320, 349, "Florida"], [350, 369, "Alabama"], [370, 385, "Tennessee"], [386, 397, "Mississippi"],
  [398, 399, "Georgia"], [400, 427, "Kentucky"], [430, 458, "Ohio"], [460, 479, "Indiana"], [480, 499, "Michigan"], [500, 528, "Iowa"], [530, 549, "Wisconsin"],
  [550, 567, "Minnesota"], [570, 577, "South Dakota"], [580, 588, "North Dakota"], [590, 599, "Montana"], [600, 629, "Illinois"], [630, 658, "Missouri"],
  [660, 679, "Kansas"], [680, 693, "Nebraska"], [700, 714, "Louisiana"], [716, 729, "Arkansas"], [730, 749, "Oklahoma"], [750, 799, "Texas"],
  [800, 816, "Colorado"], [820, 831, "Wyoming"], [832, 838, "Idaho"], [840, 847, "Utah"], [850, 865, "Arizona"], [870, 884, "New Mexico"], [885, 885, "Texas"],
  [889, 898, "Nevada"], [900, 961, "California"], [967, 968, "Hawaii"], [970, 979, "Oregon"], [980, 994, "Washington"], [995, 999, "Alaska"],
];
/** Rough population centres, for states with no Apple Store at all. */
const STATE_CENTERS: Record<string, [number, number]> = {
  "West Virginia": [38.5, -80.9], Wyoming: [42.8, -107.3], Vermont: [44.4, -72.7], "North Dakota": [47.5, -99.8], "South Dakota": [44.3, -99.4],
  Montana: [46.9, -110.5], Arkansas: [34.8, -92.2], Mississippi: [32.7, -89.6], "New Mexico": [34.5, -106.0], Delaware: [39.0, -75.5],
  "Puerto Rico": [18.3, -66.3], Maine: [44.0, -70.3], Idaho: [43.6, -116.2], Alaska: [61.2, -149.9], Hawaii: [21.3, -157.9], Nebraska: [41.2, -96.0],
  Kansas: [38.9, -94.8], Oklahoma: [35.5, -97.5], Iowa: [41.6, -93.6], Kentucky: [38.2, -85.7], Louisiana: [30.0, -90.1], Alabama: [33.5, -86.8],
  "South Carolina": [34.0, -81.0], Tennessee: [36.1, -86.8], Utah: [40.7, -111.9], Nevada: [36.2, -115.1], Oregon: [45.5, -122.7],
};
function zip3State(p3: number): string | null {
  const r = ZIP3_STATES.find(([a, b]) => p3 >= a && p3 <= b);
  return r ? r[2] : null;
}

/**
 * Coordinates for a US ZIP without a ZIP database: a store in that exact ZIP, else the stores of its
 * sectional area (first three digits), else — marked approximate — the nearest sectional with stores
 * inside the same state (sectionals are numbered geographically within a state), else the state itself.
 */
export function zipAnchor(raw: string): Anchor | null {
  const z = raw.replace(/\D/g, "");
  if (z.length < 3) return null;
  if (z.length === 5) {
    const hit = STORES.find((s) => s.postalCode === z);
    if (hit) return { lat: hit.lat, lng: hit.lng, label: `ZIP ${z}`, kind: "zip" };
  }
  const p3 = Number(z.slice(0, 3));
  const exact = SECTIONALS.get(p3);
  if (exact?.length) return { ...centroid(exact)!, label: `ZIP ${z}`, kind: "zip" };
  const state = zip3State(p3);
  if (!state) return null;
  let best: { k: number; d: number } | null = null;
  for (const [k, stores] of SECTIONALS) {
    if (stores[0].state !== state) continue;
    const d = Math.abs(k - p3);
    if (!best || d < best.d) best = { k, d };
  }
  if (best) return { ...centroid(SECTIONALS.get(best.k)!)!, label: `ZIP ${z} area`, kind: "zip", approx: true };
  const c = STATE_CENTERS[state];
  return c ? { lat: c[0], lng: c[1], label: `ZIP ${z} area (${state})`, kind: "zip", approx: true } : null;
}

/**
 * A typed place: ZIP, store name, city, or state (name or code). The matched stores lead the list. With
 * another country's `stores` there are no ZIPs: a typed postcode matches nothing rather than a US state.
 * In another language (`lang`) a place also answers to Apple's name for it there ("銀座", "München"), any script,
 * and the anchor's label is that name.
 */
export function searchAnchor(query: string, stores?: GeoStore[], lang: Lang = "en"): Anchor | null {
  const raw = query.trim();
  const us = !stores;
  if (us && /^\d{3,5}(\D|$)/.test(raw)) return zipAnchor(raw.match(/^\d{3,5}/)![0]); // "78701", "787", "78701-1234"
  const en = lang === "en";
  const key = en ? norm : normAny;
  let needle = key(raw).replace(/^apple( store)?(\s+|$)/, ""); // people type "Apple Fifth Avenue"
  if (!needle) return null;
  const all: GeoStore[] = stores ?? STORES;
  const codeOf = (s: GeoStore) => stateCodeOf(s as Store).toLowerCase();
  const cc = (s: GeoStore) => s.country ?? "us";
  // Every name a store, its city and its region answer to: English, and in another language Apple's name there too.
  const names = (s: GeoStore) => (en ? [norm(s.name)] : [key(s.name), key(storeLabel(s, lang))]);
  const cities = (s: GeoStore) => (en ? [norm(s.city)] : [key(s.city), key(cityLabel(cc(s), s.city, lang))]);
  const regions = (s: GeoStore) => (en ? [norm(s.state)] : [key(s.state), key(regionLabel(cc(s), s.state, lang))]);
  // "New York, NY" / "Austin TX": a trailing state code narrows the search to that state.
  let pool: GeoStore[] = all;
  const m = needle.match(/^(.+?)\s+([a-z]{2})$/);
  if (m && all.some((s) => codeOf(s) === m[2])) { pool = all.filter((s) => codeOf(s) === m[2]); needle = m[1]; }
  const n = needle;
  const one = (hits: GeoStore[]): Anchor => ({ lat: hits[0].lat, lng: hits[0].lng, label: en ? `Apple ${hits[0].name}` : appleStoreLabel(hits[0], lang), kind: "store" });
  const cityOf = (s: GeoStore) => (us ? `${s.city}, ${stateCodeOf(s as Store)}` : en ? s.city : cityLabel(cc(s), s.city, lang));
  const many = (hits: GeoStore[], kind: AnchorKind): Anchor => ({ ...centroid(hits)!, label: kind === "state" ? (en ? hits[0].state : regionLabel(cc(hits[0]), hits[0].state, lang)) : kind === "place" && hits.every((s) => s.city === hits[0].city) ? cityOf(hits[0]) : raw, kind, first: new Set(hits.map((s) => s.storeNumber)) });
  // Exact matches win: a store name, a city, a state name or code.
  const exactStore = pool.filter((s) => names(s).includes(n));
  if (exactStore.length === 1) return one(exactStore);
  const exactCity = pool.filter((s) => cities(s).includes(n));
  if (exactCity.length) return many(exactCity, "place");
  const exactState = pool.filter((s) => regions(s).includes(n) || codeOf(s) === n);
  if (exactState.length) return many(exactState, "state");
  // Then prefixes, longest-first by specificity: a city, a state name, a single store.
  const byCity = pool.filter((s) => cities(s).some((x) => x.startsWith(n)));
  if (byCity.length) return many(byCity, "place");
  const byState = n.length >= 4 ? pool.filter((s) => regions(s).some((x) => x.startsWith(n))) : [];
  if (byState.length) return many(byState, "state");
  // CJK names are short ("銀座"): two characters already say which store.
  const minStore = en || /^[\x20-ɏ]*$/.test(n) ? 3 : 2;
  const byStore = n.length >= minStore ? pool.filter((s) => names(s).some((x) => x.startsWith(n))) : [];
  if (byStore.length === 1) return one(byStore);
  if (byStore.length > 1) return many(byStore, "place");
  const loose = n.length >= minStore ? pool.filter((s) => `${names(s).join(" ")} ${cities(s).join(" ")} ${regions(s).join(" ")} ${codeOf(s)} ${key(s.street ?? "")}`.includes(n)) : [];
  if (loose.length === 0) return null;
  return loose.length === 1 ? one(loose) : many(loose, "place");
}

/**
 * Road miles from straight-line miles. US roads wind: about 20 % longer than the crow flies on long trips,
 * a third longer across town (circuity studies put the US average near 1.2–1.4).
 */
export function roadMiles(straight: number): number {
  return straight * (1.2 + 0.15 * Math.exp(-straight / 15));
}

/**
 * Door-to-door driving estimate from straight-line miles: about five minutes to get going and park, then
 * an average speed that climbs from city traffic (~22 mph) to highway (~60 mph) as the trip gets longer.
 * An estimate; the row links to real directions.
 */
export function driveMinutes(miles: number): number {
  if (miles <= 0.2) return 0;
  const road = roadMiles(miles);
  const mph = 22 + 40 * (1 - Math.exp(-road / 30));
  return Math.max(3, Math.round(5 + (road / mph) * 60));
}

/** A typed five-digit ZIP placed at its Census centroid (see useZipPoint): the visitor's own area. */
export function zipAt(zip: string, pt: { lat: number; lng: number }): Anchor {
  return { lat: pt.lat, lng: pt.lng, label: `ZIP ${zip}`, kind: "zip" };
}

/**
 * "25 min", "1 h 05"; another language in its own units ("25分", "1 Std. 5 Min."), same rounding. At the
 * store itself (driveMinutes 0) English says "here"; other languages get "0 min" and callers say it in words.
 */
export function formatDrive(miles: number, lang: Lang = "en"): string {
  const m = driveMinutes(miles);
  if (lang !== "en") {
    if (m < 60) return amount(lang, m, "m");
    const h = Math.floor(m / 60);
    const r = Math.round((m % 60) / 5) * 5;
    return secs(lang, (h * 60 + r) * 60);
  }
  if (m === 0) return "here";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = Math.round((m % 60) / 5) * 5;
  if (r === 60) return `${h + 1} h`;
  return r === 0 ? `${h} h` : `${h} h ${String(r).padStart(2, "0")}`;
}

/** By road (estimated), from straight-line miles. */
export function formatMiles(miles: number): string {
  const r = roadMiles(miles);
  return r < 10 ? `${r.toFixed(1)} mi` : `${Math.round(r)} mi`;
}

/**
 * By road (estimated), in the country's unit: formatMiles, or kilometres where the country signs them.
 * Every language but English reads kilometres, with its own decimal mark ("3,2 km").
 */
export function formatRoad(miles: number, unit: "mi" | "km" = "mi", lang: Lang = "en"): string {
  if (lang !== "en") {
    const k = roadMiles(miles) * 1.609344;
    return `${k < 10 ? new Intl.NumberFormat(LANG_TAG[lang], { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(k) : num(lang, Math.round(k))} km`;
  }
  if (unit === "mi") return formatMiles(miles);
  const r = roadMiles(miles) * 1.609344;
  return r < 10 ? `${r.toFixed(1)} km` : `${Math.round(r)} km`;
}
