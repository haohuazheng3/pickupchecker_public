import type { MetadataRoute } from "next";
import { MODELS, STORES, statesWithStores, citiesWithStores, storePath, cityPath, hasStatePage, storesOf, placeTarget, mapPath, restocksPath } from "@/lib/apple/catalog";
import { INTL_CODES, prefixOf, type CountryCode } from "@/lib/apple/countries";
import { latestEventPerStore } from "@/lib/stock/queries";
import { PRODUCTS, US, productPath, isIndexedProductPage } from "@/lib/seo/products";
import { NATIVE_LOCALES, pathInLocale } from "@/lib/i18n/locales";

/** Regenerated hourly: lastModified of a store/city/state page is its latest real availability event when one is known. */
export const revalidate = 3600;

type Entry = MetadataRoute.Sitemap[number];

/**
 * Another country's indexable pages (seo.md §12): its home, its store index (unless it collapses into the only
 * store), every region and city page that is its place's page (placeTarget), every store, the three model
 * pages, the restock log and the map. Nothing that redirects or is noindex.
 */
export function countryEntries(cc: Exclude<CountryCode, "us">, base: string, now: Date, latestOf: (storeNumbers: string[]) => Date): Entry[] {
  const p = prefixOf(cc);
  const stores = storesOf(cc);
  const out: Entry[] = [{ url: `${base}${p}`, lastModified: latestOf(stores.map((s) => s.storeNumber)), changeFrequency: "hourly", priority: 0.9 }];
  if (placeTarget(cc)?.indexable) out.push({ url: `${base}${p}/stores`, lastModified: latestOf(stores.map((s) => s.storeNumber)), changeFrequency: "hourly", priority: 0.85 });
  for (const r of statesWithStores(cc)) {
    const t = placeTarget(cc, r.slug);
    if (t?.indexable) out.push({ url: `${base}${t.path}`, lastModified: latestOf(t.stores.map((s) => s.storeNumber)), changeFrequency: "hourly", priority: 0.85 });
  }
  for (const c of citiesWithStores(cc)) {
    const t = placeTarget(cc, c.stateSlug, c.slug);
    if (t?.indexable) out.push({ url: `${base}${t.path}`, lastModified: latestOf(t.stores.map((s) => s.storeNumber)), changeFrequency: "hourly", priority: 0.8 });
  }
  for (const s of stores) out.push({ url: `${base}${storePath(s)}`, lastModified: latestOf([s.storeNumber]), changeFrequency: "hourly", priority: 0.8 });
  for (const m of MODELS) out.push({ url: `${base}${p}/stock/${m.slug}`, lastModified: now, changeFrequency: "always", priority: 0.75 });
  out.push({ url: `${base}${restocksPath(cc)}`, lastModified: now, changeFrequency: "hourly", priority: 0.5 });
  out.push({ url: `${base}${mapPath(cc)}`, lastModified: now, changeFrequency: "hourly", priority: 0.5 });
  // The country's restock-times question page (seo.md §13): its numbers change with every restock.
  out.push({ url: `${base}${p}/iphone-duo-restock-times`, lastModified: latestOf(stores.map((s) => s.storeNumber)), changeFrequency: "hourly", priority: 0.7 });
  return out;
}

/**
 * The iPhone Duo question pages (seo.md §13): one answer page per question people put to search and answer
 * engines. Their numbers are live, so they change with the restock log.
 */
export const QUESTION_PAGES = ["/iphone-duo-restock-times", "/iphone-duo-sell-out-times", "/iphone-duo-stock-alerts", "/iphone-duo-near-me", "/how-to-get-an-iphone-duo", "/which-iphone-duo-restocks-most", "/apple-store-pickup-availability-explained", "/how-to-grab-an-iphone-duo-restock"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pickupchecker.com";
  const now = new Date();
  const [latest, ...intlLatest] = await Promise.all([latestEventPerStore(), ...INTL_CODES.map((cc) => latestEventPerStore(cc))]);
  const all = Object.assign({}, latest, ...intlLatest) as Record<string, string>;
  const latestOf = (storeNumbers: string[]): Date => {
    let best: Date | null = null;
    for (const n of storeNumbers) { const iso = all[n]; if (iso) { const d = new Date(iso); if (!best || d > best) best = d; } }
    return best ?? now;
  };
  const statics = ["", "/how-it-works", "/pricing", "/install", "/map", "/restocks", "/about", "/contact", "/privacy", "/terms", "/refunds", "/stores"].map((p) => ({ url: `${base}${p}`, lastModified: now, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 }));
  const questions = QUESTION_PAGES.map((p) => ({ url: `${base}${p}`, lastModified: now, changeFrequency: "hourly" as const, priority: 0.8 }));
  const models = MODELS.map((m) => ({ url: `${base}/stock/${m.slug}`, lastModified: now, changeFrequency: "always" as const, priority: 0.8 }));
  const states = statesWithStores().filter((s) => hasStatePage(s.name)).map((s) => ({ url: `${base}/stores/${s.slug}`, lastModified: latestOf(STORES.filter((x) => x.state === s.name).map((x) => x.storeNumber)), changeFrequency: "hourly" as const, priority: 0.9 }));
  const cities = citiesWithStores().filter((c) => c.stores.length > 1).map((c) => ({ url: `${base}${cityPath(c.state, c.name)}`, lastModified: latestOf(c.stores.map((x) => x.storeNumber)), changeFrequency: "hourly" as const, priority: 0.85 }));
  const stores = STORES.map((s) => ({ url: `${base}${storePath(s)}`, lastModified: latestOf([s.storeNumber]), changeFrequency: "hourly" as const, priority: 0.8 }));

  // Product pages: only the national page of each model, storage size and color, minus the storage sizes whose
  // keyword has no opening (NOT_INDEXED_PRODUCTS). Every place-level product page and every exact configuration
  // stays out of the index (noindex, follow): the /stores page of a place already answers "iPhone Duo in
  // <place>", and one indexed page per place keeps the site free of near-duplicates.
  const products: MetadataRoute.Sitemap = PRODUCTS.filter((p) => (p.kind === "storage" || p.kind === "color") && isIndexedProductPage(p, US)).map((p) => ({ url: `${base}${productPath(p, US)}`, lastModified: now, changeFrequency: "hourly" as const, priority: 0.5 }));
  const countries = INTL_CODES.flatMap((cc) => countryEntries(cc, base, now, latestOf));
  // Each country's pages in its own languages (docs/i18n.md §6): the same set under /{lang}-{cc}.
  const natives = NATIVE_LOCALES.flatMap((loc) => countryEntries(loc.cc as Exclude<CountryCode, "us">, base, now, latestOf).map((e) => ({ ...e, url: `${base}${pathInLocale(e.url.slice(base.length), loc)}` })));
  return [...statics, ...questions, ...models, ...states, ...cities, ...stores, ...products, ...countries, ...natives];
}
