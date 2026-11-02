/**
 * The US-only view of the catalogue, for client components and every module a client component imports
 * (geo, search, wizardStart, push/payload, seo/links, seo/products…). Same names as catalog.ts over the US
 * data alone: STORE_INDEX and PART_INDEX hold US stores and parts only, storesOf("uk") is []. The browser
 * therefore downloads the 269 US stores and 40 US configurations it always did, not the other 18 countries
 * (≈ +240 KB raw on every page). Server code that may meet another country imports catalog.ts instead.
 *
 * A test keeps every client-reachable module off catalog.ts (tests/catalog-split.test.ts).
 */
import usCatalog from "../../../data/apple/catalog.json";
import usStores from "../../../data/apple/stores.json";
import { createCatalog, usStoreFrom, type CatalogItem, type RawCatalogItem, type RawUsStore, type Store } from "./catalog-core";

export * from "./catalog-core";

/** The US catalogue (40 configurations, USD). */
export const CATALOG: CatalogItem[] = (usCatalog as RawCatalogItem[]).map((c) => ({ ...c }));

/** The US stores (269), exactly as stores.json lists them, plus their country fields. */
export const STORES: Store[] = (usStores as RawUsStore[]).map(usStoreFrom);

/** The US part numbers (the sweep's default part list). */
export const ALL_PART_NUMBERS: string[] = CATALOG.map((c) => c.partNumber);

const US_ONLY = createCatalog({ us: STORES }, { us: CATALOG });

export const {
  catalogOf, catalogFor, storagesFor, colorsFor, partNumbersFor, PART_INDEX, partNumbersOf, priceFor, itemFor, hasOwnPartNumbers,
  storesOf, ALL_STORES, STORE_INDEX, countryOfStore, storeInCountry, partNumbersForStore, storeByNumber,
  statesWithStores, storesNear, citiesWithStores, cityBySlug,
  statePath, hasStatePage, isOneStoreState, cityPath, isOneStoreCity, placeTarget,
} = US_ONLY;
