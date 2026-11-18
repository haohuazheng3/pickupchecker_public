/**
 * /sitemap-places.xml: every product × region (US state) and two-plus-store city page, in every country and language,
 * the iPhone Duo pages first (lib/seo/aiOpen.ts). Listed in robots.txt and submitted to Google and Bing since every
 * product page became indexable (owner 2026-11-18). lastmod = the latest real availability event at the place's stores.
 */
import { placeProductEntries } from "@/lib/seo/aiOpen";
import { latestByStore, urlset } from "@/lib/seo/sitemapXml";

export const revalidate = 3600;

export async function GET(): Promise<Response> {
  if (process.env.NEXT_PUBLIC_INDEXABLE !== "1") return urlset([], {}, "");
  return urlset(placeProductEntries(), await latestByStore(), process.env.NEXT_PUBLIC_SITE_URL ?? "https://pickupchecker.com");
}
