import { afterAll, beforeAll, describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { NAMED_AGENTS } from "@/app/robots";
import { TREE_IDS, duoPlaceEntries, placeProductEntries, treeProductEntries } from "@/lib/seo/productPages";
import { resolvePlace } from "@/lib/seo/products";
import { SITEMAPS } from "@/lib/gsc";

/** Google's robots.txt matching (as in robots.test.ts): longest matching rule wins, allow wins a tie. */
function allowed(rules: { allow: string[]; disallow: string[] }, url: string): boolean {
  const re = (p: string) => new RegExp(`^${p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$")}`);
  const best = (list: string[]) => Math.max(-1, ...list.filter((p) => re(p).test(url)).map((p) => p.length));
  return best(rules.allow) >= best(rules.disallow);
}

describe("product pages: every one listed in a sitemap and open to every crawler (owner 2026-11-18)", () => {
  const before = process.env.NEXT_PUBLIC_INDEXABLE;
  beforeAll(() => { process.env.NEXT_PUBLIC_INDEXABLE = "1"; });
  afterAll(() => { process.env.NEXT_PUBLIC_INDEXABLE = before; });
  const group = (ua: string) => {
    const r = robots().rules;
    const g = (Array.isArray(r) ? r : [r]).find((x) => (Array.isArray(x.userAgent) ? x.userAgent.includes(ua) : x.userAgent === ua))!;
    const list = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
    return { allow: list(g.allow), disallow: list(g.disallow) };
  };
  const duo = duoPlaceEntries().map((e) => e.path);
  const places = placeProductEntries().map((e) => e.path);
  const us = TREE_IDS.find((t) => t.id === "us")!;
  const stores = treeProductEntries(us, "store").map((e) => e.path);

  it("lists the iPhone Duo region and city pages of every tree once, and only those", () => {
    expect(duo).toContain("/stock/iphone-duo/california");
    expect(duo).toContain("/stock/iphone-duo/nevada/las-vegas");
    expect(duo.some((p) => p.startsWith("/uk/stock/iphone-duo/"))).toBe(true);
    expect(duo.some((p) => p.startsWith("/ja-jp/stock/iphone-duo/"))).toBe(true);
    expect(new Set(duo).size).toBe(duo.length);
    expect(duo.filter((p) => !/^(\/[a-z]{2}(-[a-z]{2})?)?\/stock\/iphone-duo\/[^/]+(\/[^/]+)?$/.test(p))).toEqual([]);
  });

  it("lists only pages that are their own canonical", () => {
    for (const path of duo.filter((p) => p.startsWith("/stock/"))) {
      const r = resolvePlace(path.split("/").slice(3));
      expect(r && !("redirect" in r), path).toBe(true);
    }
  });

  it("/sitemap-places.xml: every product × region/city, Duo first, no duplicates; store level in its own files", () => {
    expect(places.slice(0, duo.length)).toEqual(duo);
    expect(places).toContain("/stock/iphone-duo-1tb/new-york/new-york");
    expect(places).toContain("/stock/iphone-18-pro-max/texas");
    expect(new Set(places).size).toBe(places.length);
    expect(stores).toContain("/stock/iphone-duo/new-york/new-york/fifthavenue");
    expect(stores.length).toBeLessThan(25_000); // one file, well under the 50,000-URL limit
    expect(new Set(stores).size).toBe(stores.length);
  });

  it("robots.txt: Google, Bing and every named AI crawler may fetch every listed product page", () => {
    // Every named crawler gets exactly the rules of "*", so checking two groups page by page covers them all.
    for (const ua of NAMED_AGENTS) expect(group(ua), ua).toEqual(group("*"));
    for (const ua of ["*", "OAI-SearchBot"]) {
      const g = group(ua);
      expect([...places, ...stores.slice(0, 2000)].filter((u) => !allowed(g, u)), ua).toEqual([]);
      for (const u of ["/map?model=duo", "/restocks?model=all", "/admin", "/api/search-index"]) expect(allowed(g, u), `${ua} ${u}`).toBe(false);
    }
    const r = robots();
    expect(r.sitemap).toEqual(["https://pickupchecker.com/sitemap.xml", "https://pickupchecker.com/sitemap-places.xml", "https://pickupchecker.com/sitemap-store-products.xml"]);
    // The daily cron submits the same list to Search Console.
    expect(SITEMAPS).toEqual(r.sitemap);
  });

  it("/sitemap.xml holds every national product page and none of the place-level ones", async () => {
    const main = new Set((await sitemap()).map((e) => new URL(e.url).pathname));
    for (const p of ["/stock/iphone-duo-512gb", "/stock/iphone-duo-512gb-night-sky", "/uk/stock/iphone-duo-256gb", "/ja-jp/stock/iphone-duo-1tb"]) expect(main.has(p), p).toBe(true);
    expect(places.filter((p) => main.has(p))).toEqual([]);
  });
});
