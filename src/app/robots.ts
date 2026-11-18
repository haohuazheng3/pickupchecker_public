import type { MetadataRoute } from "next";
import { INTL_CODES } from "@/lib/apple/countries";
import { NATIVE_LOCALES } from "@/lib/i18n/locales";
import { AI_OPEN_ALLOW, AI_OPEN_STORE_LEVEL } from "@/lib/seo/aiOpen";

/** Search and AI answer engines are welcome everywhere public; private areas stay out for everyone. */
const PRIVATE = ["/admin", "/account", "/api/", "/checkout/"];
const TREES = ["", ...[...INTL_CODES, ...NATIVE_LOCALES.map((l) => l.id)].map((p) => `/${p}`)];
/**
 * Filtered views, never pages of their own: the map and restock-log filters (canonical to /map and /restocks).
 * Every product page is open to search engines since 2026-11-18 (owner: "所有页面都对谷歌 index"); before that the
 * place-level product pages were blocked here too (`/stock/*\/`), and they still are for the answer-engine groups.
 */
export const FACETS = TREES.flatMap((p) => [`${p}/map?`, `${p}/restocks?`]);
/** Place-level product pages: blocked for the answer-engine groups except the iPhone Duo region and city pages. */
export const STOCK_FACETS = TREES.map((p) => `${p}/stock/*/`);
/** Search engines with their own group: the same rules as "*" (Googlebot). */
const SEARCH_AGENTS = ["Bingbot"];
/**
 * Answer-engine and AI crawlers: the same as "*" except /stock below the national level, where only the iPhone Duo
 * region and city pages are open (lib/seo/aiOpen.ts) until the database load of the wider crawl has been watched.
 */
const AI_AGENTS = [
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
      // Named groups replace "*" for that agent, so each repeats its rules.
      ...SEARCH_AGENTS.map((ua) => ({ userAgent: ua, allow: "/", disallow: [...PRIVATE, ...FACETS] })),
      ...AI_AGENTS.map((ua) => ({ userAgent: ua, allow: ["/", ...AI_OPEN_ALLOW], disallow: [...PRIVATE, ...FACETS, ...STOCK_FACETS, ...AI_OPEN_STORE_LEVEL] })),
    ],
    // The product pages beyond /sitemap.xml (lib/seo/aiOpen.ts): product × region/city, and product × store (an index).
    sitemap: [`${base}/sitemap.xml`, `${base}/sitemap-places.xml`, `${base}/sitemap-store-products.xml`],
    host: base,
  };
}
