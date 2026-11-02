/**
 * The product × place tree of one country (server only: it reads every country's catalogue). The US tree is
 * products.ts as it always was; every other country gets the same shape over its own catalogue (its part
 * numbers and prices) and its own stores, with every Place and Product carrying `country`, so paths come out
 * as /{cc}/stock/{product}/{region}/{city}/{store} and no link ever crosses into another country's stores.
 */
import { MODELS, catalogFor, colorsFor, storagesFor, storesOf, citiesWithStores, stateSlug, citySlug, stateCodeOf, storeTimeZone, distanceMiles, type CityEntry, type ModelKey, type Store } from "../apple/catalog";
import { COUNTRIES, theName, type CountryCode } from "../apple/countries";
import * as usTree from "./products";
import { neighborStates } from "./links";
import type { Place, Product, ProductKind } from "./products";

export interface Tree {
  cc: CountryCode;
  /** The whole country. */
  root: Place;
  stores: Store[];
  products: Product[];
  productBySlug(slug: string): Product | undefined;
  /** The product for a model and (optional) storage / color; an option the model does not have is dropped. */
  productFor(model: ModelKey, storage?: string, color?: string): Product;
  regionPlace(name: string): Place | null;
  /** Two-plus-store cities only (a one-store city is its store). */
  cityPlace(region: string, city: string): Place | null;
  storePlace(store: Store): Place;
  multiStoreCities(): CityEntry[];
  resolvePlace(segments: string[]): Place | { redirect: string[] } | null;
  placeChain(place: Place): Place[];
  canonicalPlace(place: Place): Place;
  /** Sideways from a region: bordering US states; elsewhere the country's nearest other regions. */
  neighborRegions(region: string, limit?: number): Place[];
}

const mid = (stores: Store[]) => ({ lat: stores.reduce((a, s) => a + s.lat, 0) / Math.max(1, stores.length), lng: stores.reduce((a, s) => a + s.lng, 0) / Math.max(1, stores.length) });

const US_TREE: Tree = {
  cc: "us",
  root: usTree.US,
  stores: usTree.US.stores,
  products: usTree.PRODUCTS,
  productBySlug: usTree.productBySlug,
  productFor: usTree.productFor,
  regionPlace: usTree.statePlace,
  cityPlace: usTree.cityPlace,
  storePlace: usTree.storePlace,
  multiStoreCities: usTree.multiStoreCities,
  resolvePlace: usTree.resolvePlace,
  placeChain: usTree.placeChain,
  canonicalPlace: usTree.canonicalPlace,
  neighborRegions: (region) => neighborStates(region).map((n) => usTree.statePlace(n.name)!).filter(Boolean),
};

function intlTree(cc: Exclude<CountryCode, "us">): Tree {
  const c = COUNTRIES[cc];
  const stores = storesOf(cc);
  const root: Place = { level: "country", segments: [], name: theName(c), label: c.short, stores, tz: c.timeZone, ...mid(stores), country: cc };

  const make = (model: ModelKey, storage?: string, color?: string): Product => {
    const m = MODELS.find((x) => x.key === model)!;
    const variant = [storage, color].filter(Boolean).join(" ");
    const kind: ProductKind = storage && color ? "config" : storage ? "storage" : color ? "color" : "model";
    const parts = catalogFor(model, cc).filter((x) => (!storage || x.storage === storage) && (!color || x.color === color)).map((x) => x.partNumber);
    return { slug: usTree.productSlug(model, storage, color), kind, model, storage, color, name: variant ? `${m.name} ${variant}` : m.name, short: variant ? `${m.short} ${variant}` : m.short, variant, parts, country: cc };
  };
  const products = MODELS.flatMap((m) => [
    make(m.key),
    ...storagesFor(m.key, cc).map((s) => make(m.key, s)),
    ...colorsFor(m.key, undefined, cc).map((x) => make(m.key, undefined, x)),
    ...catalogFor(m.key, cc).map((x) => make(m.key, x.storage, x.color)),
  ]);
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const productFor = (model: ModelKey, storage?: string, color?: string): Product => {
    const s = storage && storagesFor(model, cc).includes(storage) ? storage : undefined;
    const k = color && colorsFor(model, undefined, cc).includes(color) ? color : undefined;
    return bySlug.get(usTree.productSlug(model, s, k)) ?? bySlug.get(usTree.productSlug(model, s)) ?? bySlug.get(usTree.productSlug(model))!;
  };

  const regionPlace = (name: string): Place | null => {
    const here = stores.filter((s) => s.state === name);
    if (here.length === 0) return null;
    return { level: "state", segments: [stateSlug(name)], name, label: name, stores: here, state: name, stateSlug: stateSlug(name), stateCode: stateCodeOf(here[0]), tz: storeTimeZone(here[0]), ...mid(here), country: cc };
  };
  const cityPlace = (region: string, city: string): Place | null => {
    const here = stores.filter((s) => s.state === region && s.city === city).sort((a, b) => a.name.localeCompare(b.name));
    if (here.length < 2) return null;
    return { level: "city", segments: [stateSlug(region), citySlug(city)], name: city, label: city, stores: here, state: region, stateSlug: stateSlug(region), stateCode: stateCodeOf(here[0]), city, citySlug: citySlug(city), tz: storeTimeZone(here[0]), ...mid(here), country: cc };
  };
  const storePlace = usTree.storePlace; // country-aware already
  const multiStoreCities = () => citiesWithStores(cc).filter((x) => x.stores.length > 1);

  const resolvePlace = (segments: string[]): Place | { redirect: string[] } | null => {
    if (segments.length === 0) return root;
    const region = stores.find((s) => stateSlug(s.state) === segments[0])?.state;
    if (!region) return null;
    if (segments.length === 1) return regionPlace(region);
    const inCity = stores.filter((s) => s.state === region && citySlug(s.city) === segments[1]);
    if (inCity.length === 0) return null;
    if (segments.length === 2) return inCity.length === 1 ? { redirect: storePlace(inCity[0]).segments } : cityPlace(region, inCity[0].city);
    if (segments.length === 3) {
      const store = inCity.find((s) => s.slug === segments[2]);
      return store ? storePlace(store) : null;
    }
    return null;
  };

  /** A region or city that holds every store of the country is the country (Singapore, Hong Kong, Taiwan). */
  const isWhole = (p: Place) => p.stores.length > 1 && p.stores.length >= stores.length;
  const placeChain = (place: Place): Place[] => {
    const out: Place[] = [root];
    if (place.level === "country") return out;
    const region = regionPlace(place.state!);
    if (region && !isWhole(region)) out.push(region);
    if (place.level === "state") return out;
    const city = cityPlace(place.state!, place.city!);
    if (city && !isWhole(city)) out.push(city);
    if (place.level === "store") out.push(place);
    return out;
  };
  const canonicalPlace = (place: Place): Place => {
    if (place.level === "city") return isWhole(place) ? root : place;
    if (place.level !== "state") return place;
    if (place.stores.length === 1) return storePlace(place.stores[0]);
    if (isWhole(place)) return root;
    const cities = new Set(place.stores.map((s) => s.city));
    if (cities.size === 1) return cityPlace(place.state!, place.stores[0].city) ?? place;
    return place;
  };
  const neighborRegions = (region: string, limit = 6): Place[] => {
    const me = regionPlace(region);
    if (!me) return [];
    return [...new Set(stores.map((s) => s.state))].filter((r) => r !== region).map((r) => regionPlace(r)!)
      .sort((a, b) => distanceMiles(me.lat, me.lng, a.lat, a.lng) - distanceMiles(me.lat, me.lng, b.lat, b.lng)).slice(0, limit);
  };

  return { cc, root, stores, products, productBySlug: (slug) => bySlug.get(slug), productFor, regionPlace, cityPlace, storePlace, multiStoreCities, resolvePlace, placeChain, canonicalPlace, neighborRegions };
}

const TREES = new Map<CountryCode, Tree>([["us", US_TREE]]);

/** The tree of a country (built once per process). */
export function treeOf(cc: CountryCode | undefined | null): Tree {
  const key = cc ?? "us";
  let t = TREES.get(key);
  if (!t) { t = intlTree(key as Exclude<CountryCode, "us">); TREES.set(key, t); }
  return t;
}

/** The tree a place belongs to. */
export function treeFor(place: Pick<Place, "country">): Tree {
  return treeOf(place.country);
}
