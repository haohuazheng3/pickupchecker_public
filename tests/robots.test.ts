import { afterAll, beforeAll, describe, expect, it } from "vitest";
import robots from "@/app/robots";
import { STORES, statesWithStores, citiesWithStores, hasStatePage, storePath, cityPath, MODELS } from "@/lib/apple/catalog";
import { PRODUCTS, US, productPath } from "@/lib/seo/products";

/** Google's robots.txt matching: `*` is any run of characters, `$` anchors the end; the longest matching rule wins, allow wins a tie. */
function allowed(rules: { allow: string[]; disallow: string[] }, url: string): boolean {
  const re = (p: string) => new RegExp(`^${p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$")}`);
  const best = (list: string[]) => Math.max(-1, ...list.filter((p) => re(p).test(url)).map((p) => p.length));
  return best(rules.allow) >= best(rules.disallow);
}

describe("robots.txt once the site is indexable", () => {
  const before = process.env.NEXT_PUBLIC_INDEXABLE;
  beforeAll(() => { process.env.NEXT_PUBLIC_INDEXABLE = "1"; });
  afterAll(() => { process.env.NEXT_PUBLIC_INDEXABLE = before; });

  const group = (ua: string) => {
    const r = robots().rules;
    const g = (Array.isArray(r) ? r : [r]).find((x) => x.userAgent === ua)!;
    const list = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
    return { allow: list(g.allow), disallow: list(g.disallow) };
  };

  it("lets every sitemap page be crawled, for Google and for the AI crawlers", () => {
    const urls = [
      "/", "/stores", "/map", "/restocks", "/pricing", "/install", "/how-it-works",
      ...MODELS.map((m) => `/stock/${m.slug}`),
      ...statesWithStores().filter((s) => hasStatePage(s.name)).map((s) => `/stores/${s.slug}`),
      ...citiesWithStores().filter((c) => c.stores.length > 1).map((c) => cityPath(c.state, c.name)),
      ...STORES.map(storePath),
      ...PRODUCTS.filter((p) => p.kind === "storage" || p.kind === "color").map((p) => productPath(p, US)),
    ];
    for (const ua of ["*", "GPTBot", "ClaudeBot", "PerplexityBot", "Bingbot"]) {
      const g = group(ua);
      expect(urls.filter((u) => !allowed(g, u)), ua).toEqual([]);
    }
  });

  it("keeps crawlers out of filtered views and private areas", () => {
    const g = group("*");
    for (const u of ["/stock/iphone-duo/california", "/stock/iphone-duo/new-york/new-york/fifthavenue", "/stock/iphone-18-pro-256gb-black/new-york/new-york/fifthavenue", "/map?state=CA&model=duo", "/restocks?model=all&state=california", "/admin", "/account", "/api/search-index", "/checkout/success"]) {
      expect(allowed(g, u), u).toBe(false);
    }
  });
});
