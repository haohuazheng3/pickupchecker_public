import { NATIVE_LOCALES } from "@/lib/i18n/locales";
import { describe, expect, it } from "vitest";
import { publicRouteCheck } from "@/lib/seo/routes";
import { storesOf, storePath, placeTarget, statesWithStores, citiesWithStores, hasStatePage } from "@/lib/apple/catalog";
import { INTL_CODES } from "@/lib/apple/countries";
import sitemap, { countryEntries } from "@/app/sitemap";
import { switchHref, type SwitchCountry } from "@/components/site/CountrySwitcher";
import { hreflangFor } from "@/components/pages/shared";
import { liveKey, parseLiveKey } from "@/lib/liveScope";
import { alertHref as barHref } from "@/components/site/AlertBar";
import { alertHref } from "@/lib/seo/enrich";

const only = (cc: (typeof INTL_CODES)[number]) => storesOf(cc)[0];

describe("country routes (proxy: real 404 / 308 before the page streams)", () => {
  it("lets every country's home, index, regions, cities, stores, model pages, map and log through", () => {
    for (const cc of INTL_CODES) {
      expect(publicRouteCheck(`/${cc}`), cc).toBeNull();
      expect(publicRouteCheck(`/${cc}/map`), cc).toBeNull();
      expect(publicRouteCheck(`/${cc}/restocks`), cc).toBeNull();
      expect(publicRouteCheck(`/${cc}/stock/iphone-duo`), cc).toBeNull();
      for (const s of storesOf(cc)) expect(publicRouteCheck(storePath(s)), storePath(s)).toBeNull();
    }
  });
  it("answers 404 for an unknown country, region, city, store, product or page", () => {
    expect(publicRouteCheck("/xx")).toEqual({ notFound: true });
    expect(publicRouteCheck("/zz/stores")).toEqual({ notFound: true });
    expect(publicRouteCheck("/uk/stores/narnia")).toEqual({ notFound: true });
    expect(publicRouteCheck("/uk/stores/greater-london/atlantis")).toEqual({ notFound: true });
    expect(publicRouteCheck("/uk/stores/greater-london/london/nope")).toEqual({ notFound: true });
    expect(publicRouteCheck("/uk/stores/greater-london/london/regentstreet/extra")).toEqual({ notFound: true });
    expect(publicRouteCheck("/uk/stock/iphone-nope")).toEqual({ notFound: true });
    expect(publicRouteCheck("/uk/stock/iphone-duo/narnia")).toEqual({ notFound: true });
    expect(publicRouteCheck("/uk/pricing")).toEqual({ notFound: true });
    expect(publicRouteCheck("/uk/map/extra")).toEqual({ notFound: true });
    // A US store under another country's prefix is not a page there.
    expect(publicRouteCheck("/ca/stores/new-york/new-york/fifthavenue")).toEqual({ notFound: true });
  });
  it("never uses /us as a prefix: it folds into the root", () => {
    expect(publicRouteCheck("/us")).toEqual({ redirect: "/" });
    expect(publicRouteCheck("/us/stores")).toEqual({ redirect: "/stores" });
  });
  it("Singapore: one region, one city = the whole country, so both fold into /sg/stores", () => {
    expect(publicRouteCheck("/sg/stores")).toBeNull();
    expect(publicRouteCheck("/sg/stores/singapore")).toEqual({ redirect: "/sg/stores" });
    expect(publicRouteCheck("/sg/stores/singapore/singapore")).toEqual({ redirect: "/sg/stores" });
  });
  it("Hong Kong: the region is the country, every district one store", () => {
    expect(publicRouteCheck("/hk/stores")).toBeNull();
    expect(publicRouteCheck("/hk/stores/hong-kong")).toEqual({ redirect: "/hk/stores" });
    expect(publicRouteCheck("/hk/stores/hong-kong/central")).toEqual({ redirect: "/hk/stores/hong-kong/central/ifcmall" });
  });
  it("Austria and Belgium: one store, so the store index, region and city are the store page", () => {
    for (const cc of ["at", "be"] as const) {
      const s = only(cc);
      expect(publicRouteCheck(`/${cc}/stores`)).toEqual({ redirect: storePath(s) });
      expect(publicRouteCheck(`/${cc}/stores/${storePath(s).split("/")[3]}`)).toEqual({ redirect: storePath(s) });
      expect(publicRouteCheck(storePath(s).split("/").slice(0, 5).join("/"))).toEqual({ redirect: storePath(s) });
      expect(publicRouteCheck(storePath(s))).toBeNull();
    }
    expect(storePath(only("at"))).toBe("/at/stores/vienna/vienna/kaerntnerstrasse");
  });
  it("UK: Greater London (8 stores, 2 cities) and London (7) are pages; Glasgow's region is its city", () => {
    expect(publicRouteCheck("/uk/stores")).toBeNull();
    expect(publicRouteCheck("/uk/stores/greater-london")).toBeNull();
    expect(publicRouteCheck("/uk/stores/greater-london/london")).toBeNull();
    expect(placeTarget("uk", "greater-london")?.stores).toHaveLength(8);
    expect(placeTarget("uk", "greater-london", "london")?.stores).toHaveLength(7);
    expect(publicRouteCheck("/uk/stores/glasgow")).toEqual({ redirect: "/uk/stores/glasgow/glasgow" });
    expect(publicRouteCheck("/uk/stores/aberdeen")).toEqual({ redirect: "/uk/stores/aberdeen/aberdeen/unionsquare" });
    expect(publicRouteCheck("/uk/stores/aberdeen/aberdeen", "?x=1")).toEqual({ redirect: "/uk/stores/aberdeen/aberdeen/unionsquare?x=1" });
  });
  it("Canada: Ontario and Toronto are pages; a one-store province is its store", () => {
    expect(publicRouteCheck("/ca/stores/ontario")).toBeNull();
    expect(publicRouteCheck("/ca/stores/ontario/toronto")).toBeNull();
    expect(placeTarget("ca", "ontario")?.stores).toHaveLength(12);
    const mb = storesOf("ca").find((s) => s.state === "Manitoba")!;
    expect(publicRouteCheck("/ca/stores/manitoba")).toEqual({ redirect: storePath(mb) });
  });
  it("Japan: Tokyo prefecture (5 stores, one city) is the Tokyo city page", () => {
    expect(publicRouteCheck("/jp/stores/tokyo")).toEqual({ redirect: "/jp/stores/tokyo/tokyo" });
    expect(publicRouteCheck("/jp/stores/tokyo/tokyo")).toBeNull();
    expect(publicRouteCheck("/jp/stores/kyoto/kyoto")).toEqual({ redirect: "/jp/stores/kyoto/kyoto/kyoto" });
  });
  it("product pages: country products and places, a one-store city 308s to its store, the old query form to its page", () => {
    expect(publicRouteCheck("/uk/stock/iphone-duo-256gb-night-sky")).toBeNull();
    expect(publicRouteCheck("/uk/stock/iphone-duo/greater-london")).toBeNull();
    expect(publicRouteCheck("/uk/stock/iphone-duo/greater-london/london/regentstreet")).toBeNull();
    expect(publicRouteCheck("/uk/stock/iphone-duo/aberdeen/aberdeen")).toEqual({ redirect: "/uk/stock/iphone-duo/aberdeen/aberdeen/unionsquare" });
    expect(publicRouteCheck("/uk/stock/iphone-duo", "?storage=1TB")).toEqual({ redirect: "/uk/stock/iphone-duo-1tb" });
  });
});

describe("sitemap: every indexable country page, once, and nothing else", () => {
  const base = "https://pickupchecker.com";
  const now = new Date();
  const per = Object.fromEntries(INTL_CODES.map((cc) => [cc, countryEntries(cc, base, now, () => now).map((e) => e.url)]));
  it("counts per country (home + index + region/city pages + stores + 3 models + log + map + restock times)", () => {
    const counts = Object.fromEntries(INTL_CODES.map((cc) => [cc, per[cc].length]));
    expect(counts).toEqual({ ca: 48, uk: 60, au: 37, de: 35, fr: 37, it: 34, es: 27, jp: 25, kr: 20, hk: 18, sg: 15, ae: 20, ch: 17, nl: 16, se: 15, tw: 14, at: 12, be: 12 });
    for (const cc of INTL_CODES) for (const slug of ["iphone-duo-restock-times", "which-iphone-duo-restocks-most", "iphone-duo-shortage", "iphone-duo-apple-vs-carriers-vs-retailers", "iphone-duo-stock-api"]) expect(per[cc]).toContain(`${base}/${cc}/${slug}`);
  });
  it("lists no URL the proxy would redirect or reject, and every store", () => {
    for (const cc of INTL_CODES) {
      for (const url of per[cc]) {
        const u = new URL(url);
        expect(publicRouteCheck(u.pathname, u.search), url).toBeNull();
        // Product pages: the three model pages only (everything else is noindex).
        if (u.pathname.includes("/stock/") && !u.pathname.includes("stock-api")) expect(u.pathname).toMatch(new RegExp(`^/${cc}/stock/iphone-(duo|18-pro|18-pro-max)$`));
      }
      for (const s of storesOf(cc)) expect(per[cc]).toContain(`${base}${storePath(s)}`);
    }
  });
  it("has no duplicates, keeps the US part as it was, and has every country after it", async () => {
    const all = (await sitemap()).map((e) => e.url);
    expect(new Set(all).size).toBe(all.length);
    const prefixes = [...INTL_CODES, ...NATIVE_LOCALES.map((l) => l.id)];
    const us = all.filter((u) => !prefixes.some((p) => u === `${base}/${p}` || u.startsWith(`${base}/${p}/`)));
    // 356 US pages of seo.md §10–11, the eight iPhone Duo question pages of §13, the three phrasing pages and the
    // state (32) and city (26) restock-times pages of docs/research.md §8.3.
    const placePages = statesWithStores().filter((s) => hasStatePage(s.name)).length + citiesWithStores().filter((c) => c.stores.length > 1).length;
    expect(placePages).toBe(58);
    // …plus the three decision pages of seo.md §16 (the fourth, which-iphone-duo-restocks-most, is one of the eight).
    expect(us).toHaveLength(356 + 8 + 3 + 3 + placePages);
    for (const p of ["/iphone-duo-restock-times", "/iphone-duo-sell-out-times", "/iphone-duo-stock-alerts", "/iphone-duo-near-me", "/how-to-get-an-iphone-duo", "/which-iphone-duo-restocks-most", "/apple-store-pickup-availability-explained", "/how-to-grab-an-iphone-duo-restock", "/iphone-duo-back-in-stock", "/iphone-duo-stock-checker", "/where-to-buy-iphone-duo", "/iphone-duo-restock-times/california", "/iphone-duo-restock-times/california/los-angeles", "/iphone-duo-restock-times/hawaii/honolulu"]) expect(us).toContain(`${base}${p}`);
    expect(us).not.toContain(`${base}/iphone-duo-restock-times/hawaii`);
    expect(us).not.toContain(`${base}/iphone-duo-restock-times/delaware`);
    // Every country's pages once in English and once per language it also has (docs/i18n.md §6).
    const natives = NATIVE_LOCALES.reduce((a, l) => a + per[l.cc as keyof typeof per].length, 0);
    expect(all.length).toBe(us.length + Object.values(per).reduce((a, l) => a + l.length, 0) + natives);
    for (const l of NATIVE_LOCALES) {
      const mine = all.filter((u) => u === `${base}/${l.id}` || u.startsWith(`${base}/${l.id}/`));
      expect(mine.length, l.id).toBe(per[l.cc as keyof typeof per].length);
      for (const url of mine) { const u = new URL(url); expect(publicRouteCheck(u.pathname, u.search), url).toBeNull(); }
    }
  });
});

describe("hreflang between equivalent pages", () => {
  it("homes, store indexes and model pages point at each other; x-default is the US", () => {
    const home = hreflangFor("home");
    expect(home["en-US"]).toBe("/");
    expect(home["en-GB"]).toBe("/uk");
    expect(home["x-default"]).toBe("/");
    // English pages keep exactly the cluster they had (pages with traffic are not touched): 19 trees + x-default.
    expect(home["ja-JP"]).toBeUndefined();
    expect(Object.keys(home)).toHaveLength(20);
    const stores = hreflangFor("stores");
    // Austria's and Belgium's /stores is their only store: no equivalent index.
    expect(stores["en-AT"]).toBeUndefined();
    expect(stores["en-BE"]).toBeUndefined();
    expect(stores["de-DE"]).toBeUndefined();
    expect(stores["en-CA"]).toBe("/ca/stores");
    expect(hreflangFor({ model: "iphone-duo" })["en-JP"]).toBe("/jp/stock/iphone-duo");
    const times = hreflangFor("restock-times");
    expect(times["x-default"]).toBe("/iphone-duo-restock-times");
    expect(times["en-AU"]).toBe("/au/iphone-duo-restock-times");
    expect(Object.keys(times)).toHaveLength(20);
  });
});

describe("country switch keeps the page type where the other country has it", () => {
  const C = (cc: SwitchCountry["cc"], index = true): SwitchCountry => ({ cc, name: cc, short: cc, index });
  it("maps equivalent pages and falls back to the country home", () => {
    expect(switchHref("/", C("uk"))).toBe("/uk");
    expect(switchHref("/uk", C("us"))).toBe("/");
    expect(switchHref("/stores", C("ca"))).toBe("/ca/stores");
    expect(switchHref("/stores", C("at", false))).toBe("/at");
    expect(switchHref("/stock/iphone-duo", C("jp"))).toBe("/jp/stock/iphone-duo");
    expect(switchHref("/uk/stock/iphone-18-pro-max", C("us"))).toBe("/stock/iphone-18-pro-max");
    expect(switchHref("/uk/map", C("de"))).toBe("/de/map");
    expect(switchHref("/restocks", C("fr"))).toBe("/fr/restocks");
    expect(switchHref("/stores/texas", C("uk"))).toBe("/uk");
    expect(switchHref("/stock/iphone-duo-1tb", C("uk"))).toBe("/uk");
    expect(switchHref("/uk/stores/greater-london", C("us"))).toBe("/");
  });
});

describe("live scopes with a country", () => {
  it("adds c:{cc} only to another country's model scope; US keys are unchanged", () => {
    expect(liveKey({ model: "duo", country: "uk" })).toBe("c:uk|m:duo");
    expect(liveKey({ model: "duo", country: "us" })).toBe("m:duo");
    expect(liveKey({ model: "duo" })).toBe("m:duo");
    expect(liveKey({ model: "duo", stores: ["R092"], country: "uk" })).toBe("m:duo|s:R092");
    expect(parseLiveKey("c:uk|m:duo")).toEqual({ model: "duo", stores: [], country: "uk" });
    expect(parseLiveKey("c:us|m:duo")).toBeNull();
    expect(parseLiveKey("c:uk")).toBeNull();
    expect(parseLiveKey("c:xx|m:duo")).toBeNull();
  });
});

describe("alert links on another country's pages go to that country's home", () => {
  it("builds /{cc}?…#notify and keeps the US form", () => {
    expect(alertHref({ model: "duo", store: "R092", country: "uk" })).toBe("/uk?model=duo&store=R092#notify");
    expect(alertHref({ model: "duo", store: "R095" })).toBe("/?model=duo&store=R095#notify");
    expect(barHref("/uk/stores/greater-london/london/regentstreet")).toBe("/uk?store=regentstreet#notify");
    expect(barHref("/ca/stock/iphone-duo-1tb/ontario")).toBe("/ca?model=duo&storage=1TB&state=ontario#notify");
    expect(barHref("/jp")).toBe("/jp#notify");
    expect(barHref("/stores/texas/austin/barton-creek")).toBe("/?store=barton-creek#notify");
  });
});

describe("country copy: prices, tax and titles", async () => {
  const { priceSection, taxSentence, homeTitle, storesIndexTitle, modelPageTitles, placeLabel } = await import("@/lib/seo/countryCopy");
  const { COUNTRIES, formatPrice } = await import("@/lib/apple/countries");
  it("Canada adds the province's tax to Apple's pre-tax price; elsewhere the price already includes it", () => {
    const on = priceSection("ca", "Toronto", "Ontario");
    expect(on.h2).toBe("iPhone Duo price in Toronto with sales tax");
    expect(on.lead).toContain("C$2,999 before tax");
    expect(on.lead).toContain("13% HST");
    expect(on.lead).toContain("C$3,389"); // 2,999 × 1.13
    expect(priceSection("ca", "Canada").h2).toBe("iPhone Duo price in Canada with sales tax, by province");
    expect(priceSection("uk", "London").h2).toBe("iPhone Duo price in the UK: £1,999, VAT (20%) included");
    expect(priceSection("hk", "Hong Kong").lead).toContain("no sales tax");
    expect(taxSentence("ca", "Quebec")).toContain("14.975%");
    expect(taxSentence("jp")).toContain("10% consumption tax included");
  });
  it("other dollars never read as US dollars", () => {
    expect(formatPrice(COUNTRIES.ca, 2999)).toBe("C$2,999");
    expect(formatPrice(COUNTRIES.au, 3499)).toBe("A$3,499");
    expect(formatPrice(COUNTRIES.sg, 3099)).toBe("S$3,099");
    expect(formatPrice(COUNTRIES.tw, 74900)).toBe("NT$74,900");
    expect(formatPrice(COUNTRIES.hk, 17499)).toBe("HK$17,499");
  });
  it("titles follow seo.md §12", () => {
    expect(homeTitle("uk")).toBe("iPhone Stock Checker UK: 39 Apple Stores, Checked Every 15s");
    expect(homeTitle("at")).toBe("iPhone Stock Checker Austria: 1 Apple Store, Checked Every 15s");
    expect(storesIndexTitle("ca")).toBe("Apple Stores in Canada: Live iPhone Duo Stock at All 28");
    expect(storesIndexTitle("tw")).toBe("Apple Stores in Taiwan: Live iPhone Duo Stock at Both");
    expect(modelPageTitles("uk", "duo").title).toBe("iPhone Duo in Stock in the UK: Live at All 39 Apple Stores");
    expect(placeLabel("uk", "Manchester")).toBe("Manchester, UK"); // also a US Apple Store city
    expect(placeLabel("uk", "Glasgow")).toBe("Glasgow");
  });
});

describe("first segments that are not a country", async () => {
  const { readdirSync, statSync } = await import("node:fs");
  const { TOP_LEVEL } = await import("@/lib/seo/routes");
  it("every top-level route of src/app and folder of public/ is known, so the proxy never 404s a real page", () => {
    const dirs = (d: string) => readdirSync(d).filter((f) => statSync(`${d}/${f}`).isDirectory() && !f.startsWith("[") && !f.startsWith("(") && !f.includes(".") /* llms.txt: a file-like path, never 404ed */);
    for (const f of [...dirs("src/app"), ...dirs("public")]) expect(TOP_LEVEL.has(f), f).toBe(true);
  });
  it("an unknown first segment is a real 404 at any depth; files and real routes pass", () => {
    expect(publicRouteCheck("/foo")).toEqual({ notFound: true });
    expect(publicRouteCheck("/foo/stores")).toEqual({ notFound: true });
    expect(publicRouteCheck("/__not_found__")).toEqual({ notFound: true });
    expect(publicRouteCheck("/zip/100.json")).toBeNull();
    expect(publicRouteCheck("/pricing")).toBeNull();
    expect(publicRouteCheck("/api/stores/uk")).toBeNull();
    expect(publicRouteCheck("/opengraph-image")).toBeNull();
  });
});
