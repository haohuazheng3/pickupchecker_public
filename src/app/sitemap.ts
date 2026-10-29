import type { MetadataRoute } from "next";
import { MODELS, STORES, statesWithStores, stateSlug } from "@/lib/apple/catalog";
import { allPosts } from "@/lib/blog";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pickupchecker.com";
  const now = new Date();
  const statics = ["", "/how-it-works", "/pricing", "/install", "/map", "/about", "/contact", "/privacy", "/terms", "/refunds", "/stores", "/blog"].map((p) => ({ url: `${base}${p}`, lastModified: now, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 }));
  const models = MODELS.map((m) => ({ url: `${base}/stock/${m.slug}`, lastModified: now, changeFrequency: "always" as const, priority: 0.9 }));
  const states = statesWithStores().map((s) => ({ url: `${base}/stores/${s.slug}`, lastModified: now, changeFrequency: "hourly" as const, priority: 0.7 }));
  const stores = STORES.map((s) => ({ url: `${base}/stores/${stateSlug(s.state)}/${s.slug}`, lastModified: now, changeFrequency: "hourly" as const, priority: 0.6 }));
  const posts = allPosts().map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: new Date(p.date), changeFrequency: "monthly" as const, priority: 0.5 }));
  return [...statics, ...models, ...states, ...stores, ...posts];
}
