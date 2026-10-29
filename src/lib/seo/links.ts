/**
 * Internal-link graph for the SEO pages: which states border which, which cities and stores are
 * near which, and what is "popular". Every page type links sideways (siblings, neighbours) and
 * up/down (state ↔ city ↔ store), so no page is a dead end.
 */
import { STORES, STATE_CODES, citiesWithStores, cityPath, statePath, stateSlug, stateCodeOf, distanceMiles, type Store } from "../apple/catalog";

/** Land borders by two-letter code (DC counts as bordering MD/VA; HI/AK/PR have none). */
export const STATE_NEIGHBORS: Record<string, string[]> = {
  AL: ["MS", "TN", "GA", "FL"], AK: [], AZ: ["CA", "NV", "UT", "CO", "NM"], AR: ["MO", "TN", "MS", "LA", "TX", "OK"], CA: ["OR", "NV", "AZ"],
  CO: ["WY", "NE", "KS", "OK", "NM", "AZ", "UT"], CT: ["NY", "MA", "RI"], DE: ["MD", "PA", "NJ"], DC: ["MD", "VA"], FL: ["GA", "AL"],
  GA: ["FL", "AL", "TN", "NC", "SC"], HI: [], ID: ["WA", "OR", "NV", "UT", "WY", "MT"], IL: ["WI", "IA", "MO", "KY", "IN"], IN: ["MI", "OH", "KY", "IL"],
  IA: ["MN", "WI", "IL", "MO", "NE", "SD"], KS: ["NE", "MO", "OK", "CO"], KY: ["IN", "OH", "WV", "VA", "TN", "MO", "IL"], LA: ["TX", "AR", "MS"],
  ME: ["NH"], MD: ["VA", "WV", "PA", "DE", "DC"], MA: ["NH", "VT", "NY", "CT", "RI"], MI: ["OH", "IN", "WI"], MN: ["ND", "SD", "IA", "WI"],
  MS: ["LA", "AR", "TN", "AL"], MO: ["IA", "IL", "KY", "TN", "AR", "OK", "KS", "NE"], MT: ["ID", "WY", "SD", "ND"], NE: ["SD", "IA", "MO", "KS", "CO", "WY"],
  NV: ["OR", "ID", "UT", "AZ", "CA"], NH: ["ME", "MA", "VT"], NJ: ["NY", "PA", "DE"], NM: ["AZ", "UT", "CO", "OK", "TX"], NY: ["VT", "MA", "CT", "NJ", "PA"],
  NC: ["VA", "TN", "GA", "SC"], ND: ["MN", "SD", "MT"], OH: ["PA", "WV", "KY", "IN", "MI"], OK: ["KS", "MO", "AR", "TX", "NM", "CO"], OR: ["WA", "ID", "NV", "CA"],
  PA: ["NY", "NJ", "DE", "MD", "WV", "OH"], PR: [], RI: ["CT", "MA"], SC: ["NC", "GA"], SD: ["ND", "MN", "IA", "NE", "WY", "MT"], TN: ["KY", "VA", "NC", "GA", "AL", "MS", "AR", "MO"],
  TX: ["NM", "OK", "AR", "LA"], UT: ["ID", "WY", "CO", "NM", "AZ", "NV"], VT: ["NY", "NH", "MA"], VA: ["MD", "DC", "WV", "KY", "TN", "NC"], WA: ["ID", "OR"],
  WV: ["OH", "PA", "MD", "VA", "KY"], WI: ["MI", "MN", "IA", "IL"], WY: ["MT", "SD", "NE", "CO", "UT", "ID"],
};

export interface StateRef { name: string; code: string; slug: string; href: string; count: number }
export interface CityRef { name: string; slug: string; state: string; stateSlug: string; stateCode: string; href: string; count: number; lat: number; lng: number }

const CODE_TO_NAME: Record<string, string> = Object.fromEntries(Object.entries(STATE_CODES).map(([n, c]) => [c, n]));

let _states: StateRef[] | null = null;
export function stateRefs(): StateRef[] {
  if (_states) return _states;
  const counts = new Map<string, number>();
  for (const s of STORES) counts.set(s.state, (counts.get(s.state) ?? 0) + 1);
  _states = [...counts.entries()].map(([name, count]) => ({ name, code: STATE_CODES[name] ?? name.slice(0, 2).toUpperCase(), slug: stateSlug(name), href: statePath(name), count })).sort((a, b) => a.name.localeCompare(b.name));
  return _states;
}
export function stateRef(stateName: string): StateRef | undefined {
  return stateRefs().find((s) => s.name === stateName);
}

let _cities: CityRef[] | null = null;
export function cityRefs(): CityRef[] {
  if (_cities) return _cities;
  _cities = citiesWithStores().map((c) => ({
    name: c.name, slug: c.slug, state: c.state, stateSlug: c.stateSlug, stateCode: STATE_CODES[c.state] ?? c.state, href: cityPath(c.state, c.name), count: c.stores.length,
    lat: c.stores.reduce((a, s) => a + s.lat, 0) / c.stores.length, lng: c.stores.reduce((a, s) => a + s.lng, 0) / c.stores.length,
  }));
  return _cities;
}
export function cityRef(stateName: string, city: string): CityRef | undefined {
  return cityRefs().find((c) => c.state === stateName && c.name === city);
}

/** States sharing a border that also have stores, biggest first. */
export function neighborStates(stateName: string): StateRef[] {
  const code = STATE_CODES[stateName];
  const names = (STATE_NEIGHBORS[code] ?? []).map((c) => CODE_TO_NAME[c]).filter(Boolean);
  return stateRefs().filter((s) => names.includes(s.name)).sort((a, b) => b.count - a.count);
}

/** Cities around a point, across state lines, nearest first. */
export function nearbyCities(lat: number, lng: number, opts: { exclude?: CityRef; limit?: number; maxMiles?: number } = {}): (CityRef & { distance: number })[] {
  const { exclude, limit = 8, maxMiles = 120 } = opts;
  return cityRefs()
    .filter((c) => !exclude || c.href !== exclude.href)
    .map((c) => ({ ...c, distance: distanceMiles(lat, lng, c.lat, c.lng) }))
    .filter((c) => c.distance <= maxMiles)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

/** Nearest other stores, any distance (a store in Anchorage still gets Seattle). */
export function nearestStores(store: Store, limit = 6, opts: { excludeCity?: boolean } = {}): (Store & { distance: number })[] {
  return STORES
    .filter((s) => s.storeNumber !== store.storeNumber && (!opts.excludeCity || s.city !== store.city || s.state !== store.state))
    .map((s) => ({ ...s, distance: distanceMiles(store.lat, store.lng, s.lat, s.lng) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

export function topStates(n = 10): StateRef[] {
  return [...stateRefs()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, n);
}
export function topCities(n = 12): CityRef[] {
  return [...cityRefs()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, n);
}

/** Short "City, ST" label. */
export function cityLabel(c: { name: string; stateCode: string }): string {
  return `${c.name}, ${c.stateCode}`;
}
export function storeStateCode(store: Store): string {
  return stateCodeOf(store);
}
