/**
 * The countries PickupChecker tracks. The US is the root of the site and keeps every URL it had; every
 * other country lives under its prefix (/ca, /uk, /au, …) with the same page tree. Apple's pickup API is per
 * country (its own site path, part numbers and prices), so each entry carries what the poller and the
 * pages need. Probed 2026-11-02 from the Linode host (docs/i18n.md): every endpoint answers `store=R###`
 * and `location=` the same way as the US one; `cppart=UNLOCKED/<ISO>` is accepted everywhere.
 */
export type CountryCode = "us" | "ca" | "au" | "uk" | "de" | "fr" | "it" | "es" | "jp" | "sg" | "hk" | "ae" | "ch" | "nl" | "se" | "at" | "be" | "kr" | "tw";

export interface Country {
  /** URL prefix and data directory (data/apple/<cc>); "us" has no prefix. */
  cc: CountryCode;
  /** ISO 3166-1 alpha-2 as Apple's API and the stores table use it ("GB" for the UK). */
  iso: string;
  name: string;
  /** Short form for tight lines ("Toronto, Canada", "London, UK"): the name unless one is in common use. */
  short: string;
  /** "in Canada", "in the UK": the form that follows a place phrase. */
  inName: string;
  adjective: string;
  currency: string;
  /** Intl locale for prices (English wording, local currency conventions). */
  locale: string;
  /** Where `locale` writes prices an English reader would misread (en-AT: "€ 1.449"), the locale to format them with. */
  priceLocale?: string;
  /** hreflang for the English page aimed at this country. */
  hreflang: string;
  /** Road distances: the US and the UK sign in miles, everyone else in km. */
  unit: "mi" | "km";
  /** What Apple's store list groups stores by (the level between country and city); null = no such level. */
  regionNoun: string | null;
  regionNounPlural: string | null;
  /** Apple site paths: store list / store pages, and the online store (pickup API) — they differ for HK, CH, BE. */
  retailPath: string;
  shopPath: string;
  /**
   * The online store for links people follow, where it differs from shopPath: Hong Kong's pickup API answers under
   * /hk/shop (probed), but its English store is /hk/en/shop. Unset = shopPath.
   */
  buyPath?: string;
  cppart: string;
  /** Apple's listed prices include sales tax (true everywhere but the US and Canada). */
  pricesIncludeTax: boolean;
  /** One phrase after a price: "VAT (20%) included", "before GST/HST and provincial sales tax". */
  taxNote: string;
  /** Default IANA zone for country-level copy; each store carries its own. */
  timeZone: string;
  /** How often the public sweep asks each store: the US by anchors, other countries store by store; both every 15 s. */
  cadenceSec: number;
}

const C = (c: Omit<Country, "cadenceSec" | "regionNounPlural" | "short"> & { cadenceSec?: number; regionNounPlural?: string | null; short?: string }): Country => ({
  cadenceSec: 15,
  regionNounPlural: c.regionNoun ? `${c.regionNoun}s` : null,
  short: c.name,
  ...c,
});

export const COUNTRIES: Record<CountryCode, Country> = {
  us: C({ cc: "us", iso: "US", name: "United States", short: "US", inName: "in the US", adjective: "American", currency: "USD", locale: "en-US", hreflang: "en-US", unit: "mi", regionNoun: "state", retailPath: "", shopPath: "", cppart: "UNLOCKED/US", pricesIncludeTax: false, taxNote: "before sales tax, which varies by state", timeZone: "America/New_York", cadenceSec: 15 }),
  ca: C({ cc: "ca", iso: "CA", name: "Canada", inName: "in Canada", adjective: "Canadian", currency: "CAD", locale: "en-CA", hreflang: "en-CA", unit: "km", regionNoun: "province", retailPath: "ca", shopPath: "ca", cppart: "UNLOCKED/CA", pricesIncludeTax: false, taxNote: "before GST/HST and provincial sales tax", timeZone: "America/Toronto" }),
  au: C({ cc: "au", iso: "AU", name: "Australia", inName: "in Australia", adjective: "Australian", currency: "AUD", locale: "en-AU", hreflang: "en-AU", unit: "km", regionNoun: "state", retailPath: "au", shopPath: "au", cppart: "UNLOCKED/AU", pricesIncludeTax: true, taxNote: "GST (10%) included", timeZone: "Australia/Sydney" }),
  uk: C({ cc: "uk", iso: "GB", name: "United Kingdom", short: "UK", inName: "in the UK", adjective: "British", currency: "GBP", locale: "en-GB", hreflang: "en-GB", unit: "mi", regionNoun: "area", retailPath: "uk", shopPath: "uk", cppart: "UNLOCKED/GB", pricesIncludeTax: true, taxNote: "VAT (20%) included", timeZone: "Europe/London" }),
  de: C({ cc: "de", iso: "DE", name: "Germany", inName: "in Germany", adjective: "German", currency: "EUR", locale: "en-DE", hreflang: "en-DE", unit: "km", regionNoun: "state", retailPath: "de", shopPath: "de", cppart: "UNLOCKED/DE", pricesIncludeTax: true, taxNote: "VAT (19%) included", timeZone: "Europe/Berlin" }),
  fr: C({ cc: "fr", iso: "FR", name: "France", inName: "in France", adjective: "French", currency: "EUR", locale: "en-FR", hreflang: "en-FR", unit: "km", regionNoun: "department", retailPath: "fr", shopPath: "fr", cppart: "UNLOCKED/FR", pricesIncludeTax: true, taxNote: "VAT (20%) included", timeZone: "Europe/Paris" }),
  it: C({ cc: "it", iso: "IT", name: "Italy", inName: "in Italy", adjective: "Italian", currency: "EUR", locale: "en-IT", hreflang: "en-IT", unit: "km", regionNoun: "province", retailPath: "it", shopPath: "it", cppart: "UNLOCKED/IT", pricesIncludeTax: true, taxNote: "VAT (22%) included", timeZone: "Europe/Rome" }),
  es: C({ cc: "es", iso: "ES", name: "Spain", inName: "in Spain", adjective: "Spanish", currency: "EUR", locale: "en-ES", hreflang: "en-ES", unit: "km", regionNoun: "province", retailPath: "es", shopPath: "es", cppart: "UNLOCKED/ES", pricesIncludeTax: true, taxNote: "VAT (21%) included", timeZone: "Europe/Madrid" }),
  jp: C({ cc: "jp", iso: "JP", name: "Japan", inName: "in Japan", adjective: "Japanese", currency: "JPY", locale: "en-JP", hreflang: "en-JP", unit: "km", regionNoun: "prefecture", retailPath: "jp", shopPath: "jp", cppart: "UNLOCKED/JP", pricesIncludeTax: true, taxNote: "consumption tax (10%) included", timeZone: "Asia/Tokyo" }),
  sg: C({ cc: "sg", iso: "SG", name: "Singapore", inName: "in Singapore", adjective: "Singaporean", currency: "SGD", locale: "en-SG", hreflang: "en-SG", unit: "km", regionNoun: null, retailPath: "sg", shopPath: "sg", cppart: "UNLOCKED/SG", pricesIncludeTax: true, taxNote: "GST (9%) included", timeZone: "Asia/Singapore" }),
  hk: C({ cc: "hk", iso: "HK", name: "Hong Kong", inName: "in Hong Kong", adjective: "Hong Kong", currency: "HKD", locale: "en-HK", hreflang: "en-HK", unit: "km", regionNoun: null, retailPath: "hk/en", shopPath: "hk", buyPath: "hk/en", cppart: "UNLOCKED/HK", pricesIncludeTax: true, taxNote: "no sales tax in Hong Kong", timeZone: "Asia/Hong_Kong" }),
  ae: C({ cc: "ae", iso: "AE", name: "United Arab Emirates", short: "UAE", inName: "in the UAE", adjective: "Emirati", currency: "AED", locale: "en-AE", hreflang: "en-AE", unit: "km", regionNoun: "emirate", retailPath: "ae", shopPath: "ae", cppart: "UNLOCKED/AE", pricesIncludeTax: true, taxNote: "VAT (5%) included", timeZone: "Asia/Dubai" }),
  ch: C({ cc: "ch", iso: "CH", name: "Switzerland", inName: "in Switzerland", adjective: "Swiss", currency: "CHF", locale: "en-CH", hreflang: "en-CH", unit: "km", regionNoun: "canton", retailPath: "chde", shopPath: "ch-de", cppart: "UNLOCKED/CH", pricesIncludeTax: true, taxNote: "VAT (8.1%) included", timeZone: "Europe/Zurich" }),
  nl: C({ cc: "nl", iso: "NL", name: "Netherlands", inName: "in the Netherlands", adjective: "Dutch", currency: "EUR", locale: "en-NL", hreflang: "en-NL", unit: "km", regionNoun: "province", retailPath: "nl", shopPath: "nl", cppart: "UNLOCKED/NL", pricesIncludeTax: true, taxNote: "VAT (21%) included", timeZone: "Europe/Amsterdam" }),
  se: C({ cc: "se", iso: "SE", name: "Sweden", inName: "in Sweden", adjective: "Swedish", currency: "SEK", locale: "en-SE", hreflang: "en-SE", unit: "km", regionNoun: "county", retailPath: "se", shopPath: "se", cppart: "UNLOCKED/SE", pricesIncludeTax: true, taxNote: "VAT (25%) included", timeZone: "Europe/Stockholm" }),
  at: C({ cc: "at", iso: "AT", name: "Austria", inName: "in Austria", adjective: "Austrian", currency: "EUR", locale: "en-AT", priceLocale: "en-DE", hreflang: "en-AT", unit: "km", regionNoun: "state", retailPath: "at", shopPath: "at", cppart: "UNLOCKED/AT", pricesIncludeTax: true, taxNote: "VAT (20%) included", timeZone: "Europe/Vienna" }),
  be: C({ cc: "be", iso: "BE", name: "Belgium", inName: "in Belgium", adjective: "Belgian", currency: "EUR", locale: "en-BE", hreflang: "en-BE", unit: "km", regionNoun: "region", retailPath: "befr", shopPath: "be-fr", cppart: "UNLOCKED/BE", pricesIncludeTax: true, taxNote: "VAT (21%) included", timeZone: "Europe/Brussels" }),
  kr: C({ cc: "kr", iso: "KR", name: "South Korea", inName: "in South Korea", adjective: "Korean", currency: "KRW", locale: "en-KR", hreflang: "en-KR", unit: "km", regionNoun: "province", retailPath: "kr", shopPath: "kr", cppart: "UNLOCKED/KR", pricesIncludeTax: true, taxNote: "VAT (10%) included", timeZone: "Asia/Seoul" }),
  tw: C({ cc: "tw", iso: "TW", name: "Taiwan", inName: "in Taiwan", adjective: "Taiwanese", currency: "TWD", locale: "en-TW", hreflang: "en-TW", unit: "km", regionNoun: "city", regionNounPlural: "cities", retailPath: "tw", shopPath: "tw", cppart: "UNLOCKED/TW", pricesIncludeTax: true, taxNote: "VAT (5%) included", timeZone: "Asia/Taipei" }),
};

export const US = COUNTRIES.us;
/** Every country but the US, in the order the site lists them (biggest markets first). */
export const INTL_CODES: Exclude<CountryCode, "us">[] = ["ca", "uk", "au", "de", "fr", "it", "es", "jp", "kr", "hk", "sg", "ae", "ch", "nl", "se", "tw", "at", "be"];
export const ALL_CODES: CountryCode[] = ["us", ...INTL_CODES];
/**
 * Countries whose page tree ({prefix}/stores/…) is live. Links the site generates for a store (push
 * notifications) point at its page only here; a country without pages would open /account, never a 404.
 * Every country has its pages since 2026-11-02.
 */
export const COUNTRIES_WITH_PAGES: ReadonlySet<CountryCode> = new Set<CountryCode>(ALL_CODES);

const BY_ISO = new Map(Object.values(COUNTRIES).map((c) => [c.iso, c]));

export function isCountryCode(v: unknown): v is CountryCode {
  // Own keys only: `in` would accept "constructor", "__proto__", "toString"… from the prototype chain.
  return typeof v === "string" && Object.hasOwn(COUNTRIES, v);
}
/** A URL prefix segment ("ca") → country, or undefined; "us" is never a prefix. */
export function countryFromPrefix(seg: string | undefined): Country | undefined {
  return seg && seg !== "us" && isCountryCode(seg) ? COUNTRIES[seg] : undefined;
}
export function countryByIso(iso: string): Country | undefined {
  return BY_ISO.get(iso);
}
/** "" for the US, "/ca" for Canada: prepend to any US-shaped path. */
export function prefixOf(c: Country | CountryCode): string {
  const cc = typeof c === "string" ? c : c.cc;
  return cc === "us" ? "" : `/${cc}`;
}
/** Apple's pickup API for a country: the US one has no path segment. */
export function pickupEndpoint(c: Country): string {
  return c.shopPath ? `https://www.apple.com/${c.shopPath}/shop/retail/pickup-message` : "https://www.apple.com/shop/retail/pickup-message";
}
/** The country's iPhone family buy page (the exact-configuration deep links are verified for the US only). */
export function appleShopUrl(c: Country, familySlug: string): string {
  const p = c.buyPath ?? c.shopPath;
  return p ? `https://www.apple.com/${p}/shop/buy-iphone/${familySlug}` : `https://www.apple.com/shop/buy-iphone/${familySlug}`;
}
/** Dollars that are not US dollars, written so a reader of a site with US prices never mistakes them. */
const DOLLAR: Record<string, string> = { CAD: "C$", AUD: "A$", SGD: "S$", TWD: "NT$" };

/**
 * Euros are written as en-US writes them ("€2,339"): Safari formats "en-DE", "en-NL"… the way the country does
 * ("2.339 €", "€ 2.339") while the server (Node) writes "€2,339", so the price grid re-rendered differently on
 * iPhones and React threw away the page's HTML (error #418, 2026-11-04). en-US gives the server's string in both.
 */
const priceLocaleOf = (c: Country): string => (c.currency === "EUR" ? "en-US" : c.priceLocale ?? c.locale);

/** A price in the country's currency, English digits, no decimals when whole (JPY/KRW never have them); C$, A$, S$, NT$ for other dollars. */
export function formatPrice(c: Country, amount: number): string {
  const whole = Number.isInteger(amount);
  const s = new Intl.NumberFormat(priceLocaleOf(c), { style: "currency", currency: c.currency, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 }).format(amount);
  const d = DOLLAR[c.currency];
  return d ? s.replace(/^(-?)\$/, `$1${d}`) : s;
}
/** Road distance text in the country's unit from a figure in miles. */
export function formatDistance(c: Country, miles: number): string {
  return c.unit === "mi" ? `${Math.round(miles)} mi` : `${Math.round(miles * 1.609344)} km`;
}

/** "the UK", "Canada", "the Netherlands": the country as the object of "in". */
export function theName(c: Country): string {
  return c.inName.replace(/^in /, "");
}
