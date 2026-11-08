/**
 * Product catalog and store dataset of every country (static JSON captured from apple.com, see docs/research.md
 * and docs/i18n.md). These are bundled at build time; the database mirrors them (scripts/seed.ts) for joins.
 * The code lives in catalog-core.ts; this module feeds it all 19 countries. Client components import
 * catalog-us.ts instead (the same names over the US alone), so the browser never downloads the other countries.
 *
 * Old names keep meaning "the US" — STORES, CATALOG, COVERAGE, ALL_PART_NUMBERS, statesWithStores(),
 * citiesWithStores(), statePath()… — so every US page reads exactly what it read before other countries
 * existed. Other countries are reached through new names or a trailing country argument that defaults to
 * "us" (storesOf, catalogOf, partNumbersFor(…, cc), statePath(name, cc)…). Two lookups are global because
 * the poller, alerts and payloads look things up by id whatever the country: STORE_INDEX (R### is unique
 * worldwide) and PART_INDEX (a part number decodes to the same model/storage/colour everywhere; its price is
 * only trustworthy through priceFor / itemFor, since one part number can be sold in several countries).
 */
import coverageJson from "../../../data/apple/coverage-plan.json";
import intlCoverageJson from "../../../data/apple/intl-coverage-plan.json";
import { INTL_CODES, type CountryCode } from "./countries";
import { createCatalog, intlStoreFrom, type CatalogItem, type CoverageAnchor, type Store } from "./catalog-core";
import { CATALOG, STORES } from "./catalog-us";
import { RAW_INTL_CATALOG, RAW_INTL_STORES } from "./data";

export * from "./catalog-core";
export { CATALOG, STORES, ALL_PART_NUMBERS } from "./catalog-us";

type Intl18<T> = Record<Exclude<CountryCode, "us">, T>;

const CATALOGS: Partial<Record<CountryCode, CatalogItem[]>> = {
  us: CATALOG,
  ...(Object.fromEntries(INTL_CODES.map((cc) => [cc, RAW_INTL_CATALOG[cc].map((c) => ({ ...c }))])) as Intl18<CatalogItem[]>),
};

const STORES_BY_COUNTRY: Partial<Record<CountryCode, Store[]>> = {
  us: STORES,
  ...(Object.fromEntries(INTL_CODES.map((cc) => [cc, RAW_INTL_STORES[cc].map((r) => intlStoreFrom(r, cc))])) as Intl18<Store[]>),
};

const WORLD = createCatalog(STORES_BY_COUNTRY, CATALOGS);

export const {
  catalogOf, catalogFor, storagesFor, colorsFor, partNumbersFor, PART_INDEX, partNumbersOf, priceFor, itemFor, hasOwnPartNumbers,
  storesOf, ALL_STORES, STORE_INDEX, countryOfStore, storeInCountry, partNumbersForStore, storeByNumber,
  statesWithStores, storesNear, citiesWithStores, cityBySlug,
  statePath, hasStatePage, isOneStoreState, cityPath, isOneStoreCity, placeTarget,
} = WORLD;

/** The US sweep's coverage anchors (42 ZIPs). */
export const COVERAGE: CoverageAnchor[] = coverageJson as CoverageAnchor[];
/**
 * The other countries' coverage anchors (2026-11-08: 47 locations cover 198 stores, 94 requests a round instead of
 * 398 store-by-store). Built from Apple's real answers — every store was asked as a location and the stores it
 * returned recorded (scripts/intl-coverage.mjs) — because the radius Apple searches differs by country (the UK
 * fills 12 stores, Germany or Japan answer ~200 km). A store no anchor returns (Chermside, where Apple offers no
 * pickup lookup) is still asked store by store; see stock/intlCoverage.ts for how drift is caught at run time.
 */
export const INTL_COVERAGE: Partial<Record<CountryCode, CoverageAnchor[]>> = intlCoverageJson as Partial<Record<CountryCode, CoverageAnchor[]>>;
