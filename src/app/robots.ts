import type { MetadataRoute } from "next";
import { INTL_CODES } from "@/lib/apple/countries";
import { NATIVE_LOCALES } from "@/lib/i18n/locales";

/** Search and AI answer engines are welcome everywhere public; private areas stay out for everyone. */
const PRIVATE = ["/admin", "/account", "/api/", "/checkout/"];
const TREES = ["", ...[...INTL_CODES, ...NATIVE_LOCALES.map((l) => l.id)].map((p) => `/${p}`)];
/**
 * Filtered views, never pages of their own: the map and restock-log filters (canonical to /map and /restocks).
 * Every product page is open to every crawler since 2026-11-18 (owner: "所有页面都对谷歌 index", then "所有页面都对
 * ai 爬虫开放"); before that the place-level product pages were blocked here too (`/stock/*\/`).
 */
export const FACETS = TREES.flatMap((p) => [`${p}/map?`, `${p}/restocks?`]);
/**
 * Search, answer-engine and AI crawlers named on purpose, with exactly the rules of "*" (a named group replaces "*"
 * for that agent, so the rules are repeated, once, for all of them).
 */
export const NAMED_AGENTS = [
  "Bingbot",
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",
  "ClaudeBot", "Claude-SearchBot", "Claude-User", "anthropic-ai",
  "PerplexityBot", "Perplexity-User",
  "Google-Extended", "Applebot", "Applebot-Extended",
  "DuckAssistBot", "Amazonbot", "meta-externalagent", "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pickupchecker.com";
  const indexable = process.env.NEXT_PUBLIC_INDEXABLE === "1";
  if (!indexable) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: [...PRIVATE, ...FACETS] },
      { userAgent: NAMED_AGENTS, allow: "/", disallow: [...PRIVATE, ...FACETS] },
    ],
    // The product pages beyond /sitemap.xml (lib/seo/productPages.ts): product × region/city, and product × store (an index).
    sitemap: [`${base}/sitemap.xml`, `${base}/sitemap-places.xml`, `${base}/sitemap-store-products.xml`],
    host: base,
  };
}
