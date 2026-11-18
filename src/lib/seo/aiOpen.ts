/**
 * Product-page lists for robots.txt and the sitemaps (server only: it walks every country's tree).
 *
 * 2026-11-18, two steps the same day (owner): first the iPhone Duo region and city pages were opened to answer
 * engines and Bing, then every product page, at every level, was made indexable for Google and Bing ("所有页面都对
 * 谷歌 index"). robots.txt: the "*" group (Googlebot) and Bingbot crawl all of /stock; the named answer-engine
 * groups (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot…) stay on the iPhone Duo region and city pages until the
 * database load of the wider crawl has been watched. Sitemaps: national pages in /sitemap.xml, product × region/city
 * in /sitemap-places.xml (the Duo pages first), product × store in /sitemap-store-products.xml (one file per tree).
 */
import { INTL_CODES, type CountryCode } from "../apple/countries";
import { NATIVE_LOCALES, pathInLocale, type Locale } from "../i18n/locales";
import { isAiOpenProductPage, productPath, type Place, type Product } from "./products";
import { treeOf, type Tree } from "./tree";

const DUO = "iphone-duo";

/** Every prefix a country's product tree lives under: "" (the US), "/ca", …, and each native version ("/ja-jp", …). */
const TREE_PREFIXES: string[] = ["", ...INTL_CODES.map((cc) => `/${cc}`), ...NATIVE_LOCALES.map((l) => `/${l.id}`)];

/** robots.txt, answer-engine groups: the iPhone Duo place pages open, their store level closed. */
export const AI_OPEN_ALLOW: string[] = TREE_PREFIXES.map((p) => `${p}/stock/${DUO}/`);
export const AI_OPEN_STORE_LEVEL: string[] = TREE_PREFIXES.map((p) => `${p}/stock/${DUO}/*/*/`);

export interface PageEntry { path: string; storeNumbers: string[] }

/** A country's regions and two-plus-store cities, regions first. */
function regionsAndCities(t: Tree): Place[] {
  const regions = [...new Set(t.stores.map((s) => s.state))].map((r) => t.regionPlace(r)).filter((p): p is Place => Boolean(p));
  const cities = t.multiStoreCities().map((c) => t.cityPlace(c.state, c.name)).filter((p): p is Place => Boolean(p));
  return [...regions, ...cities];
}

const selfCanonical = (t: Tree, pr: Product, p: Place) => productPath(pr, t.canonicalPlace(p)) === productPath(pr, p);

/** The places of one country whose iPhone Duo page is open to answer engines. */
export function aiOpenPlaces(cc: CountryCode): Place[] {
  const t = treeOf(cc);
  const duo = t.productBySlug(DUO);
  if (!duo) return [];
  return regionsAndCities(t).filter((p) => isAiOpenProductPage(duo, p, selfCanonical(t, duo, p)));
}

/** One tree: the US, a country's English tree or a native version of it. */
export interface TreeId { cc: CountryCode; loc?: Locale; id: string }
export const TREE_IDS: TreeId[] = [
  { cc: "us", id: "us" },
  ...INTL_CODES.map((cc) => ({ cc, id: cc })),
  ...NATIVE_LOCALES.map((loc) => ({ cc: loc.cc as CountryCode, loc, id: loc.id })),
];

export type PageLevel = "national" | "place" | "store";

/**
 * Every product page of one level in one tree that is its own canonical: "national" = the country, "place" = its
 * regions and two-plus-store cities, "store" = its stores. `keep` filters products.
 */
export function treeProductEntries(tree: TreeId, level: PageLevel, keep: (p: Product) => boolean = () => true): PageEntry[] {
  const t = treeOf(tree.cc);
  const places = level === "national" ? [t.root] : level === "store" ? t.stores.map((s) => t.storePlace(s)) : regionsAndCities(t);
  const out: PageEntry[] = [];
  for (const pr of t.products.filter(keep)) {
    for (const p of places) {
      if (!selfCanonical(t, pr, p)) continue;
      const path = productPath(pr, p);
      out.push({ path: tree.loc ? pathInLocale(path, tree.loc) : path, storeNumbers: p.stores.map((s) => s.storeNumber) });
    }
  }
  return out;
}

const isDuoModel = (p: Product) => p.slug === DUO;

/** The answer-engine set: the iPhone Duo region and city pages of every tree, English trees first. */
export function aiOpenEntries(): PageEntry[] {
  return TREE_IDS.flatMap((tree) => treeProductEntries(tree, "place", isDuoModel));
}

/** /sitemap-places.xml: every product × region/city page, the iPhone Duo ones first. */
export function placeProductEntries(): PageEntry[] {
  return [...aiOpenEntries(), ...TREE_IDS.flatMap((tree) => treeProductEntries(tree, "place", (p) => !isDuoModel(p)))];
}
