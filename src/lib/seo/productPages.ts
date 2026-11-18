/**
 * Product-page lists for the sitemaps (server only: it walks every country's tree).
 *
 * 2026-11-18 (owner, the same day): the iPhone Duo region and city pages were opened to answer engines and Bing first,
 * then every product page, at every level, to Google and Bing ("所有页面都对谷歌 index") and to every AI crawler ("所有
 * 页面都对 ai 爬虫开放"); robots.txt now has no product-page rule at all. Sitemaps: national pages in /sitemap.xml,
 * product × region/city in /sitemap-places.xml (the iPhone Duo pages first), product × store in
 * /sitemap-store-products.xml (one file per tree).
 */
import { INTL_CODES, type CountryCode } from "../apple/countries";
import { NATIVE_LOCALES, pathInLocale, type Locale } from "../i18n/locales";
import { productPath, type Place, type Product } from "./products";
import { treeOf, type Tree } from "./tree";

const DUO = "iphone-duo";

export interface PageEntry { path: string; storeNumbers: string[] }

/** A country's regions and two-plus-store cities, regions first. */
function regionsAndCities(t: Tree): Place[] {
  const regions = [...new Set(t.stores.map((s) => s.state))].map((r) => t.regionPlace(r)).filter((p): p is Place => Boolean(p));
  const cities = t.multiStoreCities().map((c) => t.cityPlace(c.state, c.name)).filter((p): p is Place => Boolean(p));
  return [...regions, ...cities];
}

const selfCanonical = (t: Tree, pr: Product, p: Place) => productPath(pr, t.canonicalPlace(p)) === productPath(pr, p);

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

/** The iPhone Duo region and city pages of every tree, English trees first (the most asked-about product × place pages). */
export function duoPlaceEntries(): PageEntry[] {
  return TREE_IDS.flatMap((tree) => treeProductEntries(tree, "place", isDuoModel));
}

/** /sitemap-places.xml: every product × region/city page, the iPhone Duo ones first. */
export function placeProductEntries(): PageEntry[] {
  return [...duoPlaceEntries(), ...TREE_IDS.flatMap((tree) => treeProductEntries(tree, "place", (p) => !isDuoModel(p)))];
}
