import type { MetadataRoute } from "next";
import { MODELS, STORES, statesWithStores, citiesWithStores, storePath, cityPath } from "@/lib/apple/catalog";
import { allPosts } from "@/lib/blog";
import { latestEventPerStore } from "@/lib/stock/queries";

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
  return [...statics, ...models, ...states, ...cities, ...stores, ...posts];
}
