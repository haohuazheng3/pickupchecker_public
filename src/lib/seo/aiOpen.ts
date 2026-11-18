/**
 * The iPhone Duo region and city pages that answer engines may index and Google may not (products.ts
 * isAiOpenProductPage, owner 2026-11-18): which ones there are, where robots.txt opens them, and the URLs
 * /sitemap-places.xml lists for Bing. Server only (it walks every country's tree).
 */
import { INTL_CODES, prefixOf, type CountryCode } from "../apple/countries";
import { NATIVE_LOCALES, pathInLocale } from "../i18n/locales";
import { isAiOpenProductPage, productPath, type Place } from "./products";
import { treeOf } from "./tree";

const DUO = "iphone-duo";

/** Every prefix a country's product tree lives under: "" (the US), "/ca", …, and each native version ("/ja-jp", …). */
const TREE_PREFIXES: string[] = ["", ...INTL_CODES.map((cc) => prefixOf(cc)), ...NATIVE_LOCALES.map((l) => `/${l.id}`)];

/**
 * robots.txt, named AI and Bing groups only: the iPhone Duo place pages are opened (Allow beats the shorter
 * "/stock/*\/" facet rule under the longest-match rule Google, Bing and OpenAI document), and its store level stays
 * closed (noindex anyway: the /stores page of a store is that store's page).
 */
export const AI_OPEN_ALLOW: string[] = TREE_PREFIXES.map((p) => `${p}/stock/${DUO}/`);
export const AI_OPEN_STORE_LEVEL: string[] = TREE_PREFIXES.map((p) => `${p}/stock/${DUO}/*/*/`);

/** The places of one country whose iPhone Duo page is open to answer engines: regions first, then cities. */
export function aiOpenPlaces(cc: CountryCode): Place[] {
  const t = treeOf(cc);
  const duo = t.productBySlug(DUO);
  if (!duo) return [];
  const regions = [...new Set(t.stores.map((s) => s.state))].map((r) => t.regionPlace(r)).filter((p): p is Place => Boolean(p));
  const cities = t.multiStoreCities().map((c) => t.cityPlace(c.state, c.name)).filter((p): p is Place => Boolean(p));
  return [...regions, ...cities].filter((p) => isAiOpenProductPage(duo, p, productPath(duo, t.canonicalPlace(p)) === productPath(duo, p)));
}

export interface AiOpenEntry { path: string; storeNumbers: string[] }

/** Every open page, English trees first (the US, then each country), then the native versions of those countries. */
export function aiOpenEntries(): AiOpenEntry[] {
  const duoPath = (cc: CountryCode, p: Place) => productPath({ slug: DUO, country: cc === "us" ? undefined : cc }, p);
  const english = (["us", ...INTL_CODES] as CountryCode[]).flatMap((cc) => aiOpenPlaces(cc).map((p) => ({ cc, path: duoPath(cc, p), storeNumbers: p.stores.map((s) => s.storeNumber) })));
  const natives = NATIVE_LOCALES.flatMap((loc) => english.filter((e) => e.cc === loc.cc).map((e) => ({ ...e, path: pathInLocale(e.path, loc) })));
  return [...english, ...natives].map(({ path, storeNumbers }) => ({ path, storeNumbers }));
}
