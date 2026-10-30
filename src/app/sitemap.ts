import type { MetadataRoute } from "next";
import { MODELS, STORES, statesWithStores, citiesWithStores, storePath, cityPath } from "@/lib/apple/catalog";
import { allPosts } from "@/lib/blog";
import { latestEventPerStore, activePairs } from "@/lib/stock/queries";
import { PRODUCTS, US, canonicalPlace, cityPlace, multiStoreCities, productFor, productPath, statePlace, storePlace, type Place, type Product } from "@/lib/seo/products";
import { PART_INDEX, modelKeyFor } from "@/lib/apple/catalog";

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
  const statics = ["", "/how-it-works", "/pricing", "/install", "/map", "/restocks", "/about", "/contact", "/privacy", "/terms", "/refunds", "/stores", "/blog"].map((p) => ({ url: `${base}${p}`, lastModified: now, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 }));
  const models = MODELS.map((m) => ({ url: `${base}/stock/${m.slug}`, lastModified: now, changeFrequency: "always" as const, priority: 0.9 }));
  const states = statesWithStores().map((s) => ({ url: `${base}/stores/${s.slug}`, lastModified: latestOf(STORES.filter((x) => x.state === s.name).map((x) => x.storeNumber)), changeFrequency: "hourly" as const, priority: 0.7 }));
  const cities = citiesWithStores().map((c) => ({ url: `${base}${cityPath(c.state, c.name)}`, lastModified: latestOf(c.stores.map((x) => x.storeNumber)), changeFrequency: "hourly" as const, priority: 0.65 }));
  const stores = STORES.map((s) => ({ url: `${base}${storePath(s)}`, lastModified: latestOf([s.storeNumber]), changeFrequency: "hourly" as const, priority: 0.6 }));
  const posts = allPosts().map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: new Date(p.date), changeFrequency: "monthly" as const, priority: 0.5 }));

  // Product × place pages: every model at every place, every variant across the US, and a narrower
  // variant page once it has a real restock in the last 30 days (the same rule as its robots tag).
  const places: Place[] = [US, ...statesWithStores().map((s) => statePlace(s.name)!), ...multiStoreCities().map((c) => cityPlace(c.state, c.name)!), ...STORES.map(storePlace)];
  const entry = (p: Product, pl: Place, priority: number) => ({ url: `${base}${productPath(p, pl)}`, lastModified: latestOf(pl.stores.map((x) => x.storeNumber)), changeFrequency: "hourly" as const, priority });
  const seen = new Set<string>();
  const products: MetadataRoute.Sitemap = [];
  // Only the canonical page of a place (a one-store state is its store's page).
  const add = (p: Product, pl: Place, priority: number) => { if (canonicalPlace(pl) !== pl) return; const k = productPath(p, pl); if (seen.has(k)) return; seen.add(k); products.push(entry(p, pl, priority)); };
  for (const p of PRODUCTS.filter((x) => x.kind === "model")) for (const pl of places) if (pl.level !== "us") add(p, pl, pl.level === "state" ? 0.7 : 0.55);
  for (const p of PRODUCTS.filter((x) => x.kind !== "model")) add(p, US, 0.6);
  // A failed read must not publish a shrunken sitemap for an hour: throw, and the previous one keeps being served.
  const pairs = await activePairs(30);
  if (!pairs) throw new Error("sitemap: active pairs unavailable");
  for (const pair of pairs) {
    const item = PART_INDEX.get(pair.partNumber);
    const s = STORES.find((x) => x.storeNumber === pair.storeNumber);
    if (!item || !s) continue;
    const m = modelKeyFor(item.model);
    const variants = [productFor(m, item.storage), productFor(m, undefined, item.color), productFor(m, item.storage, item.color)];
    const where = [statePlace(s.state)!, cityPlace(s.state, s.city), storePlace(s)].filter((x): x is Place => Boolean(x));
    for (const v of variants) for (const pl of where) add(v, pl, 0.45);
  }
  return [...statics, ...models, ...states, ...cities, ...stores, ...products, ...posts];
}
