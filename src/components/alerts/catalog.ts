import { MODELS, catalogFor, storesOf, storeByNumber, type Store } from "@/lib/apple/catalog";
import type { CountryCode } from "@/lib/apple/countries";
import type { PhoneCatalog, PickerStore } from "./PhoneMatrix";

/** The slim store the browser gets for the picker. */
export function pickerStore(s: Store): PickerStore {
  return { storeNumber: s.storeNumber, slug: s.slug, name: s.name, city: s.city, state: s.state, lat: s.lat, lng: s.lng, country: s.country, region: s.region, regionCode: s.regionCode ?? undefined };
}

/** One country's stores for the picker. */
export function pickerStores(cc: CountryCode): PickerStore[] {
  return storesOf(cc).map(pickerStore);
}

/** Stores named by number, any country (an account's chosen stores, for /account). */
export function pickerStoresFor(numbers: string[]): PickerStore[] {
  return [...new Set(numbers)].map((n) => storeByNumber(n)).filter((s): s is Store => Boolean(s)).map(pickerStore);
}

/**
 * Every configuration (storage × colour × price) per model, for the phone grid. The US catalogue as it always
 * was; another country's carries its prices, the country and its store list (the browser never imports
 * other countries' data: it arrives here, as props).
 */
export function buildPhoneCatalog(cc: CountryCode = "us"): PhoneCatalog {
  const configs = {} as PhoneCatalog["configs"];
  for (const m of MODELS) configs[m.key] = catalogFor(m.key, cc).map((c) => ({ storage: c.storage, color: c.color, price: c.price, partNumber: c.partNumber }));
  return cc === "us" ? { configs } : { configs, country: cc, stores: pickerStores(cc) };
}
