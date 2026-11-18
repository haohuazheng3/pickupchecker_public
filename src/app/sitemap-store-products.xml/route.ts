/**
 * /sitemap-store-products.xml: the index of the product × store sitemaps, one per tree (the US, each country's English
 * tree, each native version): /sitemap-store-products/{tree}.xml. About 40,000 pages in all, split so no file nears the
 * 50,000-URL / 50 MB sitemap limit or a function's response limit (the US file is about 17,500 URLs).
 */
import { TREE_IDS } from "@/lib/seo/aiOpen";
import { sitemapIndex } from "@/lib/seo/sitemapXml";

export const revalidate = 86400;

export async function GET(): Promise<Response> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pickupchecker.com";
  if (process.env.NEXT_PUBLIC_INDEXABLE !== "1") return sitemapIndex([]);
  return sitemapIndex(TREE_IDS.map((t) => `${base}/sitemap-store-products/${t.id}.xml`));
}
