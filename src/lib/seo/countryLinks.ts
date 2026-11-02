/**
 * The internal-link graph of another country's pages (server only; the US graph is links.ts, which client
 * components share). Same shapes: regions and cities with their canonical page (after collapsing, so a link
 * never lands on a redirect), the nearest cities and stores. Everything stays inside one country.
 */
import { citiesWithStores, cityPath, distanceMiles, statePath, statesWithStores, storesOf, storePath, placeTarget, type Store } from "../apple/catalog";
import { COUNTRIES, type CountryCode } from "../apple/countries";

export interface RegionRef { name: string; code: string; slug: string; href: string; count: number; cities: number; lat: number; lng: number }
export interface CityRef { name: string; slug: string; state: string; stateSlug: string; href: string; count: number; lat: number; lng: number }

const centre = (stores: Store[]) => ({ lat: stores.reduce((a, s) => a + s.lat, 0) / Math.max(1, stores.length), lng: stores.reduce((a, s) => a + s.lng, 0) / Math.max(1, stores.length) });

const _regions = new Map<CountryCode, RegionRef[]>();
/** Every region of a country with stores, A–Z; `href` is the page that answers it (a region, city, store or the index). */
export function regionRefs(cc: CountryCode): RegionRef[] {
  const hit = _regions.get(cc);
  if (hit) return hit;
  const all = storesOf(cc);
  const out = statesWithStores(cc).map((r) => {
    const here = all.filter((s) => s.state === r.name);
    return { name: r.name, code: r.code, slug: r.slug, href: statePath(r.name, cc), count: r.count, cities: new Set(here.map((s) => s.city)).size, ...centre(here) };
  });
  _regions.set(cc, out);
  return out;
}

const _cities = new Map<CountryCode, CityRef[]>();
export function cityRefs(cc: CountryCode): CityRef[] {
  const hit = _cities.get(cc);
  if (hit) return hit;
  const out = citiesWithStores(cc).map((c) => ({ name: c.name, slug: c.slug, state: c.state, stateSlug: c.stateSlug, href: cityPath(c.state, c.name, cc), count: c.stores.length, ...centre(c.stores) }));
  _cities.set(cc, out);
  return out;
}

/** Regions that have a page of their own (two or more stores in two or more cities, not the whole country). */
export function regionPages(cc: CountryCode): RegionRef[] {
  return regionRefs(cc).filter((r) => placeTarget(cc, r.slug)?.indexable);
}

/** Cities that have a page of their own (two or more stores, not the whole country). */
export function cityPages(cc: CountryCode): CityRef[] {
  return cityRefs(cc).filter((c) => placeTarget(cc, c.stateSlug, c.slug)?.indexable);
}

/** Regions with the most stores (ties A–Z). */
export function topRegions(cc: CountryCode, n = 10): RegionRef[] {
  return [...regionRefs(cc)].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, n);
}

/** Cities with the most stores (ties A–Z). */
export function topCities(cc: CountryCode, n = 12): CityRef[] {
  return [...cityRefs(cc)].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, n);
}

/** Cities around a point in the country, nearest first (any distance: a country's stores can be far apart). */
export function nearbyCitiesIn(cc: CountryCode, lat: number, lng: number, opts: { excludeHref?: string; limit?: number; maxMiles?: number } = {}): (CityRef & { distance: number })[] {
  const { excludeHref, limit = 8, maxMiles = 250 } = opts;
  return cityRefs(cc)
    .filter((c) => c.href !== excludeHref)
    .map((c) => ({ ...c, distance: distanceMiles(lat, lng, c.lat, c.lng) }))
    .filter((c) => c.distance <= maxMiles)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

/** The country's other stores, nearest first. */
export function nearestStoresIn(store: Store, limit = 6): (Store & { distance: number })[] {
  return storesOf(store.country)
    .filter((s) => s.storeNumber !== store.storeNumber)
    .map((s) => ({ ...s, distance: distanceMiles(store.lat, store.lng, s.lat, s.lng) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

/** Store pages of a country with their store, A–Z by city then name. */
export function storeRefs(cc: CountryCode): { store: Store; href: string }[] {
  return [...storesOf(cc)].sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name)).map((s) => ({ store: s, href: storePath(s) }));
}

/** "province" → "Province", "provinces" for headings. */
export function regionWord(cc: CountryCode, plural = false, cap = false): string {
  const c = COUNTRIES[cc];
  const w = (plural ? c.regionNounPlural : c.regionNoun) ?? (plural ? "areas" : "area");
  return cap ? w[0].toUpperCase() + w.slice(1) : w;
}
