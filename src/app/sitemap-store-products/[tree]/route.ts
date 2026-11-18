/** /sitemap-store-products/{tree}.xml: every product × store page of one tree (see /sitemap-store-products.xml). */
import { TREE_IDS, treeProductEntries } from "@/lib/seo/productPages";
import { latestByStore, urlset } from "@/lib/seo/sitemapXml";

export const revalidate = 3600;

export async function GET(_req: Request, ctx: { params: Promise<{ tree: string }> }): Promise<Response> {
  const { tree } = await ctx.params;
  const t = TREE_IDS.find((x) => `${x.id}.xml` === tree);
  if (!t) return new Response("Not found", { status: 404 });
  if (process.env.NEXT_PUBLIC_INDEXABLE !== "1") return urlset([], {}, "");
  return urlset(treeProductEntries(t, "store"), await latestByStore(), process.env.NEXT_PUBLIC_SITE_URL ?? "https://pickupchecker.com");
}
