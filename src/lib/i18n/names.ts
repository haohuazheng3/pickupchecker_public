/**
 * Names on a page in its language: English keeps the catalog's own (appleName, the region and city as stored,
 * the country's short/long name); another language uses Apple's names in that language (places.ts).
 */
import { appleName, type Store } from "@/lib/apple/catalog";
import { COUNTRIES, theName, type CountryCode } from "@/lib/apple/countries";
import { appleStoreLabel, cityLabel, countryLabel, regionLabel, storeLabel } from "./places";
import type { Lang } from "./locales";

export interface Names {
  /** "Apple Ginza" / "Apple 銀座". */
  apple(s: Store): string;
  /** "Ginza" / "銀座". */
  store(s: { storeNumber: string; name: string }): string;
  city(city: string, cc?: CountryCode): string;
  region(region: string, cc?: CountryCode): string;
  /** "UK" / "イギリス": the short name for tight places. */
  countryShort(cc?: CountryCode): string;
  /** "United Kingdom" / "イギリス". */
  country(cc?: CountryCode): string;
  /** English "the UK", "Canada" (the object of "in"); other languages the country's name. */
  the(cc?: CountryCode): string;
}

export function namesFor(lang: Lang, home: CountryCode): Names {
  const en = lang === "en";
  return {
    apple: (s) => (en ? appleName(s) : appleStoreLabel(s, lang)),
    store: (s) => (en ? s.name : storeLabel(s, lang)),
    city: (x, cc = home) => cityLabel(cc, x, lang),
    region: (x, cc = home) => regionLabel(cc, x, lang),
    countryShort: (cc = home) => (en ? COUNTRIES[cc].short : countryLabel(cc, lang)),
    country: (cc = home) => countryLabel(cc, lang),
    the: (cc = home) => (en ? theName(COUNTRIES[cc]) : countryLabel(cc, lang)),
  };
}
