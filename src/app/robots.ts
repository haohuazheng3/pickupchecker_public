import type { MetadataRoute } from "next";

/** Search and AI answer engines are welcome everywhere public; private areas stay out for everyone. */
const PRIVATE = ["/admin", "/account", "/api/", "/checkout/"];
/**
 * Filtered views that are never meant for the index: every place-level product page (noindex) and the
 * map / restock-log filters (canonical to /map and /restocks). Location pages link to about 13,500 of
 * them, so crawling them would spend a new site's crawl on pages Google drops anyway; Google's advice for
 * faceted URLs you don't need indexed is to block crawling in robots.txt. National product pages
 * (/stock/{product}) and every /stores page stay open.
 */
export const FACETS = ["/stock/*/", "/map?", "/restocks?"];
const AI_AGENTS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",
  "ClaudeBot", "Claude-SearchBot", "Claude-User", "anthropic-ai",
  "PerplexityBot", "Perplexity-User",
  "Google-Extended", "Applebot", "Applebot-Extended",
  "Bingbot", "DuckAssistBot", "Amazonbot", "meta-externalagent", "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pickupchecker.com";
  const indexable = process.env.NEXT_PUBLIC_INDEXABLE === "1";
  if (!indexable) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: [...PRIVATE, ...FACETS] },
      // Named groups replace "*" for that agent, so each repeats the same rules.
      ...AI_AGENTS.map((ua) => ({ userAgent: ua, allow: "/", disallow: [...PRIVATE, ...FACETS] })),
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
