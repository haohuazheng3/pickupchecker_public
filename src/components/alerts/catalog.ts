import { MODELS, catalogFor, storesOf, storeByNumber, type Store } from "@/lib/apple/catalog";
import { COUNTRIES, type CountryCode } from "@/lib/apple/countries";
import type { Lang } from "@/lib/i18n/locales";
import { price } from "@/lib/i18n/format";
import { cityLabel, colorLabel, regionLabel, storeLabel } from "@/lib/i18n/places";
import type { PhoneCatalog, PickerStore } from "./PhoneMatrix";

/**
 * The slim store the browser gets for the picker. In another language it also carries Apple's names there
 * (`label`, `cityLabel`, `regionLabel`); the English fields stay as they are (search, pre-fill and URLs read them).
 */
export function pickerStore(s: Store, lang: Lang = "en"): PickerStore {
  const p: PickerStore = { storeNumber: s.storeNumber, slug: s.slug, name: s.name, city: s.city, state: s.state, lat: s.lat, lng: s.lng, country: s.country, region: s.region, regionCode: s.regionCode ?? undefined };
  if (lang === "en") return p;
  return { ...p, label: storeLabel(s, lang), cityLabel: cityLabel(s.country, s.city, lang), regionLabel: regionLabel(s.country, s.state, lang) };
}

/** One country's stores for the picker. */
export function pickerStores(cc: CountryCode, lang: Lang = "en"): PickerStore[] {
  return storesOf(cc).map((s) => pickerStore(s, lang));
}

/** Stores named by number, any country (an account's chosen stores, for /account). */
export function pickerStoresFor(numbers: string[], lang: Lang = "en"): PickerStore[] {
  return [...new Set(numbers)].map((n) => storeByNumber(n)).filter((s): s is Store => Boolean(s)).map((s) => pickerStore(s, lang));
}

/**
 * Every configuration (storage × colour × price) per model, for the phone grid. The US catalogue as it always
 * was; another country's carries its prices, the country and its store list (the browser never imports
 * other countries' data: it arrives here, as props). In another language each configuration also carries its
 * colour's name and its price as that language writes them (`colorLabel`, `priceLabel`); `color` stays the key.
 */
export function buildPhoneCatalog(cc: CountryCode = "us", lang: Lang = "en"): PhoneCatalog {
  const configs = {} as PhoneCatalog["configs"];
  for (const m of MODELS) {
    configs[m.key] = catalogFor(m.key, cc).map((c) => {
      const row = { storage: c.storage, color: c.color, price: c.price, partNumber: c.partNumber };
      return lang === "en" ? row : { ...row, colorLabel: colorLabel(c.color, lang), priceLabel: price(lang, COUNTRIES[cc], c.price) };
    });
  }
  return cc === "us" ? { configs } : { configs, country: cc, stores: pickerStores(cc, lang) };
}
