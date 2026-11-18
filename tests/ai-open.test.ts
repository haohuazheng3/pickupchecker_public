import { afterAll, beforeAll, describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { aiOpenEntries, aiOpenPlaces } from "@/lib/seo/aiOpen";
import { isAiOpenProductPage, productBySlug, resolvePlace, statePlace, cityPlace } from "@/lib/seo/products";

/** Google's robots.txt matching (as in robots.test.ts): longest matching rule wins, allow wins a tie. */
function allowed(rules: { allow: string[]; disallow: string[] }, url: string): boolean {
  const re = (p: string) => new RegExp(`^${p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$")}`);
  const best = (list: string[]) => Math.max(-1, ...list.filter((p) => re(p).test(url)).map((p) => p.length));
  return best(rules.allow) >= best(rules.disallow);
}

describe("iPhone Duo region and city pages open to answer engines, not Google (owner 2026-11-18)", () => {
  const before = process.env.NEXT_PUBLIC_INDEXABLE;
  beforeAll(() => { process.env.NEXT_PUBLIC_INDEXABLE = "1"; });
  afterAll(() => { process.env.NEXT_PUBLIC_INDEXABLE = before; });
  const group = (ua: string) => {
    const r = robots().rules;
    const g = (Array.isArray(r) ? r : [r]).find((x) => x.userAgent === ua)!;
    const list = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
    return { allow: list(g.allow), disallow: list(g.disallow) };
  };
  const entries = aiOpenEntries();
  const paths = entries.map((e) => e.path);

  it("covers US states and two-plus-store cities, every country and the native versions, once each", () => {
    expect(paths).toContain("/stock/iphone-duo/california");
    expect(paths).toContain("/stock/iphone-duo/nevada/las-vegas");
    expect(paths).toContain("/stock/iphone-duo/california/los-angeles");
    expect(paths.some((p) => p.startsWith("/uk/stock/iphone-duo/"))).toBe(true);
    expect(paths.some((p) => p.startsWith("/ja-jp/stock/iphone-duo/"))).toBe(true);
    expect(new Set(paths).size).toBe(paths.length);
    // Never the store level, never another model or a storage/colour page.
    expect(paths.filter((p) => !/^(\/[a-z]{2}(-[a-z]{2})?)?\/stock\/iphone-duo\/[^/]+(\/[^/]+)?$/.test(p))).toEqual([]);
  });

  it("lists only pages that are their own canonical (a one-city or one-store state is not)", () => {
    const duo = productBySlug("iphone-duo")!;
    for (const p of aiOpenPlaces("us")) {
      const r = resolvePlace(p.segments);
      expect(r && !("redirect" in r), p.segments.join("/")).toBe(true);
    }
    // Nevada's stores are all in Las Vegas? Then its state page collapses into the city and is not listed.
    const nv = statePlace("Nevada")!;
    const nvCities = new Set(nv.stores.map((s) => s.city));
    expect(paths.includes("/stock/iphone-duo/nevada")).toBe(nvCities.size > 1);
    expect(isAiOpenProductPage(duo, cityPlace("Nevada", "Las Vegas")!, true)).toBe(true);
    expect(isAiOpenProductPage(productBySlug("iphone-duo-256gb")!, cityPlace("Nevada", "Las Vegas")!, true)).toBe(false);
    expect(isAiOpenProductPage(productBySlug("iphone-18-pro")!, cityPlace("Nevada", "Las Vegas")!, true)).toBe(false);
  });

  it("robots.txt opens them to the AI and Bing groups and keeps them closed to Google", () => {
    for (const ua of ["OAI-SearchBot", "ChatGPT-User", "GPTBot", "PerplexityBot", "ClaudeBot", "Bingbot"]) {
      const g = group(ua);
      expect(paths.filter((u) => !allowed(g, u)), ua).toEqual([]);
      // The store level and every other product stay closed.
      for (const u of ["/stock/iphone-duo/new-york/new-york/fifthavenue", "/stock/iphone-duo-1tb/new-york/new-york", "/stock/iphone-18-pro/california", "/uk/stock/iphone-duo-256gb/greater-london", "/map?model=duo", "/admin"]) {
        expect(allowed(g, u), `${ua} ${u}`).toBe(false);
      }
    }
    const google = group("*");
    expect(paths.filter((u) => allowed(google, u))).toEqual([]);
  });

  it("stays out of /sitemap.xml (Google reads it)", async () => {
    const main = new Set((await sitemap()).map((e) => new URL(e.url).pathname));
    expect(paths.filter((p) => main.has(p))).toEqual([]);
  });
});
