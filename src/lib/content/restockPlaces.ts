/**
 * The restock-times pages of places inside a country other than the US: /{cc}/iphone-duo-restock-times/{region}
 * and /{cc}/iphone-duo-restock-times/{region}/{city} (and their native versions under /{lang}-{cc}/…). Which places
 * get one follows the /stores rule exactly (placeTarget, one indexable page per place): a region page only where the
 * region's /stores page is indexable, a city page only where the city has two or more stores. Any other place URL
 * answers with the page its /stores URL collapses into — a store's page, a city's restock-times page, or the
 * country's restock-times page when the place is the whole country. Pure and database-free, so the proxy
 * (seo/routes.ts), the sitemap and the pages share it.
 */
import { citiesWithStores, placeTarget, statesWithStores, type PlaceTarget, type Store } from "../apple/catalog";
import { prefixOf, type CountryCode } from "../apple/countries";

export const RESTOCK_TIMES_SLUG = "iphone-duo-restock-times";

/** A place with a restock-times page of its own. */
export interface RestockPlacePage {
  level: "region" | "city";
  /** English data names (regionLabel / cityLabel name them in a language). */
  region: string;
  city?: string;
  regionSlug: string;
  citySlug?: string;
  /** /{cc}/iphone-duo-restock-times/{region}[/{city}] (English form). */
  path: string;
  /** The place's live /stores page. */
  storesPath: string;
  stores: Store[];
}

/** The restock-times page that answers a /stores target that is not a place page of its own. */
function collapsed(cc: CountryCode, t: PlaceTarget): string {
  if (t.kind === "store") return t.path;
  if (t.kind === "stores") return `${prefixOf(cc)}/${RESTOCK_TIMES_SLUG}`;
  return t.path.replace(`${prefixOf(cc)}/stores/`, `${prefixOf(cc)}/${RESTOCK_TIMES_SLUG}/`);
}

/**
 * Resolve /{cc}/iphone-duo-restock-times/{region}[/{city}]: the place's own page (`page`) or where it 308s
 * (`redirect`); null = no such place (a real 404).
 */
export function restockPlaceTarget(cc: CountryCode, regionSlug: string, citySlug?: string): { page: RestockPlacePage } | { redirect: string } | null {
  const t = placeTarget(cc, regionSlug, citySlug);
  if (!t || t.level === "country") return null;
  if (!t.indexable) return { redirect: collapsed(cc, t) };
  const own = `${prefixOf(cc)}/${RESTOCK_TIMES_SLUG}/${regionSlug}${citySlug !== undefined ? `/${citySlug}` : ""}`;
  return {
    page: {
      level: t.level, region: t.region!, city: t.city, regionSlug, citySlug,
      path: own, storesPath: t.path, stores: t.stores,
    },
  };
}

/** Every place page of a country: its regions (alphabetical), then its cities (by region, then name). */
export function restockPlacePages(cc: CountryCode): { regions: RestockPlacePage[]; cities: RestockPlacePage[] } {
  const pageOf = (r: ReturnType<typeof restockPlaceTarget>) => (r && "page" in r ? r.page : null);
  const regions = statesWithStores(cc).map((r) => pageOf(restockPlaceTarget(cc, r.slug))).filter((p): p is RestockPlacePage => Boolean(p));
  const cities = citiesWithStores(cc).map((c) => pageOf(restockPlaceTarget(cc, c.stateSlug, c.slug))).filter((p): p is RestockPlacePage => Boolean(p));
  return { regions, cities };
}

/**
 * The restock-times page of a place of a country other than the US, by its English region (and city) name: its own
 * page, or the page the place collapses into (a store, a city, the country). For the US see restockTimesPath.
 */
export function intlRestockTimesPath(cc: CountryCode, stateName: string, city?: string): string {
  const region = statesWithStores(cc).find((r) => r.name === stateName);
  if (!region) return `${prefixOf(cc)}/${RESTOCK_TIMES_SLUG}`;
  const c = city === undefined ? undefined : citiesWithStores(cc).find((x) => x.state === stateName && x.name === city);
  const r = restockPlaceTarget(cc, region.slug, c?.slug);
  if (!r) return `${prefixOf(cc)}/${RESTOCK_TIMES_SLUG}`;
  return "page" in r ? r.page.path : r.redirect;
}
