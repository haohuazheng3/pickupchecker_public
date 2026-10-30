import type { MetadataRoute } from "next";
import { MODELS, STORES, statesWithStores, citiesWithStores, storePath, cityPath, hasStatePage } from "@/lib/apple/catalog";
import { latestEventPerStore } from "@/lib/stock/queries";
import { PRODUCTS, US, productPath, isIndexedProductPage } from "@/lib/seo/products";

/** Regenerated hourly: lastModified of a store/city/state page is its latest real availability event when one is known. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pickupchecker.com";
  const now = new Date();
  const latest = await latestEventPerStore();
  const latestOf = (storeNumbers: string[]): Date => {
    let best: Date | null = null;
    for (const n of storeNumbers) { const iso = latest[n]; if (iso) { const d = new Date(iso); if (!best || d > best) best = d; } }
    return best ?? now;
  };
  const statics = ["", "/how-it-works", "/pricing", "/install", "/map", "/restocks", "/about", "/contact", "/privacy", "/terms", "/refunds", "/stores"].map((p) => ({ url: `${base}${p}`, lastModified: now, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 }));
  const models = MODELS.map((m) => ({ url: `${base}/stock/${m.slug}`, lastModified: now, changeFrequency: "always" as const, priority: 0.8 }));
  const states = statesWithStores().filter((s) => hasStatePage(s.name)).map((s) => ({ url: `${base}/stores/${s.slug}`, lastModified: latestOf(STORES.filter((x) => x.state === s.name).map((x) => x.storeNumber)), changeFrequency: "hourly" as const, priority: 0.9 }));
  const cities = citiesWithStores().filter((c) => c.stores.length > 1).map((c) => ({ url: `${base}${cityPath(c.state, c.name)}`, lastModified: latestOf(c.stores.map((x) => x.storeNumber)), changeFrequency: "hourly" as const, priority: 0.85 }));
  const stores = STORES.map((s) => ({ url: `${base}${storePath(s)}`, lastModified: latestOf([s.storeNumber]), changeFrequency: "hourly" as const, priority: 0.8 }));

  // Product pages: only the national page of each model, storage size and color, minus the storage sizes whose
  // keyword has no opening (NOT_INDEXED_PRODUCTS). Every place-level product page and every exact configuration
  // stays out of the index (noindex, follow): the /stores page of a place already answers "iPhone Duo in
  // <place>", and one indexed page per place keeps the site free of near-duplicates.
  const products: MetadataRoute.Sitemap = PRODUCTS.filter((p) => (p.kind === "storage" || p.kind === "color") && isIndexedProductPage(p, US)).map((p) => ({ url: `${base}${productPath(p, US)}`, lastModified: now, changeFrequency: "hourly" as const, priority: 0.5 }));
  return [...statics, ...models, ...states, ...cities, ...stores, ...products];
}
