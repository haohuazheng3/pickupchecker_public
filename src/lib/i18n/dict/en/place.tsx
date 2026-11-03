/**
 * English strings: place — the copy builders of the 18 other countries' page tree (seo.md §12): titles,
 * Answer-First intros, keyword sections, price/tax sections and FAQ entries, built from live numbers.
 * English is lib/seo/countryCopy.ts itself. Another language implements the same functions (same arguments,
 * same return shapes) in its own words and keyword choices; the data helpers it may reuse are exported from
 * countryCopy (priceOf, priceRange, scarcest, pairsPct, duoStoresNow) and content/country-tax (CA_PROVINCE_TAX,
 * withProvinceTax, includedRate, beforeTax, TAX_SOURCES…). Returned strings may use **bold**, [label](href) and
 * live {{tokens}} (rendered by Inline).
 */
import * as cc from "@/lib/seo/countryCopy";
import { TAX_SOURCES, pickupHelp, storeListSource } from "@/content/country-tax";
import type { CountryCode } from "@/lib/apple/countries";

export const place = {
  /** "since tracking began on November 2" / "in the last 30 days". */
  sinceWhen: cc.sinceWhenIntl,
  /** A place name that is also a US Apple Store city/state gets the country: "Manchester, UK". */
  placeLabel: cc.placeLabel,
  /** "Nov 2, 3:04 PM GMT" in the country's zone. */
  whenIn: cc.whenIn,
  taxSentence: cc.taxSentence,
  priceSection: cc.priceSection,
  taxFaq: cc.taxFaqIntl,
  placeTitle: cc.intlPlaceTitle,
  placeDescription: cc.intlPlaceDescription,
  placeIntro: cc.intlPlaceIntro,
  placeSections: cc.intlPlaceSections,
  storesIndexTitle: cc.storesIndexTitle,
  homeTitle: cc.homeTitle,
  homeH1: cc.homeH1,
  /** "the 39 Apple Stores in the UK" / "the one Apple Store in Austria". */
  allStoresPhrase: cc.allStoresPhrase,
  /** "in 22 cities across 6 provinces". */
  spreadPhrase: cc.spreadPhrase,
  modelPageTitles: cc.modelPageTitles,
  modelIntro: cc.modelIntro,
  modelDescription: cc.modelDescription,
  modelRows: cc.modelRows,
  homeDescription: cc.homeDescription,
  /** The country home's first paragraph ({{duo.storesNow}} etc. are live tokens). */
  homeIntro: cc.homeIntro,
  homeSections: cc.homeSections,
  homeFaq: cc.homeFaq,
  home: cc.homeLabels,
  /** Store page title: "Apple Ginza: iPhone Stock Today, Pickup & Hours" (`region`, already in the page's language: the city/state when it is the store's only one). */
  storeTitle: cc.storeTitleIntl,
  /** The sources lines of a country's pages: Apple's pickup help, Apple's store list, the tax authority. A language may point at the same page in its own language. */
  sources: (code: Exclude<CountryCode, "us">) => ({ pickupHelp: pickupHelp(code), storeList: storeListSource(code), tax: TAX_SOURCES[code] }),
};
