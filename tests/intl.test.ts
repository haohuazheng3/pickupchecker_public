import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  ALL_STORES, STORES, CATALOG, PART_INDEX, STORE_INDEX, ALL_PART_NUMBERS, MODELS,
  storesOf, catalogOf, partNumbersOf, partNumbersFor, partNumbersForStore, priceFor, countryOfStore, storeInCountry, hasOwnPartNumbers,
  slugify, stateSlug, citySlug, storePath, cityPath, statePath, hasStatePage, isOneStoreState, isOneStoreCity, stateCodeOf, storeTimeZone,
  statesWithStores, citiesWithStores, cityBySlug, placeTarget, storesIndexPath, appleBuyUrl, appleFamilyUrl, appleBuyIphoneUrl, storeLocality, itemFor,
} from "@/lib/apple/catalog";
import { ALL_CODES, INTL_CODES, COUNTRIES, COUNTRIES_WITH_PAGES, type CountryCode } from "@/lib/apple/countries";
import { targetsFromRules, type RuleRow, type SubRow } from "@/lib/stock/fastlane";
import { buildIntlTasks, parsePollCountries, buildTasks } from "@/lib/stock/sweep";
import { freshnessFromRows, intlVerdict, pollerVerdict, INTL_FRESH_FACTOR } from "@/lib/stock/fallback";
import { countryScope, countryStoreNumbers } from "@/lib/stock/queries";
import { restockPayload } from "@/lib/push/payload";
import { alertHtml, alertText } from "@/lib/mail/resend";

const snap = JSON.parse(readFileSync("tests/fixtures/us-catalog-snapshot.json", "utf8")) as {
  stores: { n: string; storePath: string; cityPath: string; statePath: string; hasStatePage: boolean; oneState: boolean; oneCity: boolean; stateSlug: string; citySlug: string; code: string; tz: string }[];
  states: { name: string; code: string; slug: string; count: number }[];
  cities: { name: string; slug: string; state: string; stateSlug: string; stores: string[] }[];
  buy: string[]; family: string[]; parts: string[][];
};

describe("the US is unchanged (snapshot taken before other countries existed)", () => {
  it("every store, city and state URL and helper result of all 269 stores", () => {
    expect(STORES).toHaveLength(269);
    expect(snap.stores).toHaveLength(269);
    for (const want of snap.stores) {
      const s = STORE_INDEX.get(want.n)!;
      expect(s.country).toBe("us");
      expect({
        n: s.storeNumber, storePath: storePath(s), cityPath: cityPath(s.state, s.city), statePath: statePath(s.state),
        hasStatePage: hasStatePage(s.state), oneState: isOneStoreState(s.state), oneCity: isOneStoreCity(s.state, s.city),
        stateSlug: stateSlug(s.state), citySlug: citySlug(s.city), code: stateCodeOf(s), tz: storeTimeZone(s),
      }).toEqual(want);
    }
  });
  it("state and city lists, buy links and part numbers", () => {
    expect(statesWithStores()).toEqual(snap.states);
    expect(citiesWithStores().map((c) => ({ name: c.name, slug: c.slug, state: c.state, stateSlug: c.stateSlug, stores: c.stores.map((s) => s.storeNumber) }))).toEqual(snap.cities);
    expect(CATALOG.map((c) => appleBuyUrl(c))).toEqual(snap.buy);
    expect(MODELS.map((m) => appleFamilyUrl(m.key))).toEqual(snap.family);
    expect(MODELS.map((m) => partNumbersFor(m.key))).toEqual(snap.parts);
    expect(ALL_PART_NUMBERS).toEqual(CATALOG.map((c) => c.partNumber));
    expect(CATALOG.every((c) => c.currency === undefined)).toBe(true); // US items keep their exact shape
  });
  it("the US agrees with placeTarget", () => {
    expect(placeTarget("us")).toMatchObject({ level: "country", kind: "stores", path: "/stores", indexable: true });
    expect(placeTarget("us", "texas")).toMatchObject({ kind: "region", path: "/stores/texas", indexable: true });
    expect(placeTarget("us", "hawaii")).toMatchObject({ kind: "city", path: "/stores/hawaii/honolulu", indexable: false });
    const delaware = STORES.find((s) => s.state === "Delaware")!;
    expect(placeTarget("us", "delaware")).toMatchObject({ kind: "store", path: storePath(delaware), indexable: false });
    for (const c of snap.cities) expect(placeTarget("us", c.stateSlug, c.slug)!.path).toBe(snap.stores.find((x) => x.n === c.stores[0])!.cityPath);
    expect(placeTarget("us", "atlantis")).toBeNull();
    expect(placeTarget("us", "texas", "atlantis")).toBeNull();
  });
});

describe("global indexes", () => {
  it("hold every country: R### is unique worldwide", () => {
    expect(ALL_STORES).toHaveLength(269 + 199);
    expect(STORE_INDEX.size).toBe(ALL_STORES.length);
    expect(new Set(ALL_STORES.map((s) => s.storeNumber)).size).toBe(ALL_STORES.length);
    const counts = Object.fromEntries(INTL_CODES.map((cc) => [cc, storesOf(cc).length]));
    expect(counts).toEqual({ ca: 28, uk: 39, au: 21, de: 16, fr: 20, it: 17, es: 12, jp: 11, kr: 7, hk: 6, sg: 3, ae: 5, ch: 4, nl: 3, se: 3, tw: 2, at: 1, be: 1 });
    for (const cc of ALL_CODES) {
      expect(catalogOf(cc)).toHaveLength(40);
      expect(partNumbersOf(cc)).toHaveLength(40);
      for (const s of storesOf(cc)) { expect(s.country).toBe(cc); expect(s.iso).toBe(COUNTRIES[cc].iso); expect(countryOfStore(s.storeNumber)).toBe(cc); }
      // Store slugs never collide within a country (they make the last URL segment).
      expect(new Set(storesOf(cc).map((s) => s.slug)).size).toBe(storesOf(cc).length);
    }
  });
  it("decode a part number of any country; prices come from priceFor", () => {
    expect(PART_INDEX.get("MJQ34LL/A")).toBe(CATALOG.find((c) => c.partNumber === "MJQ34LL/A"));
    const uk = PART_INDEX.get("MK2E4QN/A")!;
    expect([uk.model, uk.storage, uk.color]).toEqual(["iPhone Duo", "256GB", "Night Sky"]);
    // ZD/A is sold in Germany, Austria, the Netherlands and Belgium: one item, a price per country.
    const zd = catalogOf("de")[0].partNumber;
    expect(zd).toMatch(/ZD\/A$/);
    for (const cc of ["de", "at", "nl", "be"] as CountryCode[]) expect(priceFor(zd, cc)).toBeGreaterThan(0);
    expect(priceFor(zd, "us")).toBeUndefined();
    expect(priceFor("MJQ34LL/A", "us")).toBe(CATALOG.find((c) => c.partNumber === "MJQ34LL/A")!.price);
    expect(catalogOf("jp")[0].currency).toBe("JPY");
  });
  it("knows which countries share part numbers", () => {
    for (const cc of ["us", "ca", "fr", "jp", "kr", "hk", "ae", "tw"] as CountryCode[]) expect(hasOwnPartNumbers(cc)).toBe(true);
    for (const cc of ["de", "at", "nl", "be", "uk", "se", "it", "es", "ch", "au", "sg"] as CountryCode[]) expect(hasOwnPartNumbers(cc)).toBe(false);
  });
  it("maps a rule to the store's own country's part number", () => {
    expect(partNumbersForStore("R092", "duo", ["256GB"], ["Night Sky"])).toEqual(["MK2E4QN/A"]); // Regent Street, London
    expect(partNumbersForStore("R079", "duo", ["256GB"], ["Night Sky"])).toEqual(["MK254J/A"]); // Ginza, Tokyo
    expect(partNumbersForStore("R085", "duo", ["256GB"], ["Night Sky"])).toEqual(partNumbersFor("duo", ["256GB"], ["Night Sky"]));
    expect(partNumbersForStore("R999", "duo")).toEqual([]);
    expect(storeInCountry("R092")).toBeUndefined();
    expect(storeInCountry("R092", "uk")?.name).toBe("Regent Street");
    expect(storeInCountry("R085")?.country).toBe("us");
  });
});

describe("slugify", () => {
  it("drops accents and spells out ß/ø/æ, curly apostrophes join", () => {
    expect(slugify("Zürich")).toBe("zurich");
    expect(slugify("Düsseldorf")).toBe("dusseldorf");
    expect(slugify("Bouches-du-Rhône")).toBe("bouches-du-rhone");
    expect(slugify("Côte d’Or")).toBe("cote-dor");
    expect(slugify("Baden-Württemberg")).toBe("baden-wurttemberg");
    expect(slugify("Skåne")).toBe("skane");
    expect(slugify("Malmö")).toBe("malmo");
    expect(slugify("Großbeeren")).toBe("grossbeeren");
    expect(slugify("Ørestad")).toBe("orestad");
    expect(slugify("Puteaux - la Défense")).toBe("puteaux-la-defense");
    // ASCII as it always slugged (the straight apostrophe still splits).
    expect(slugify("Saint Louis")).toBe("saint-louis");
    expect(slugify("Tice's Corner")).toBe("tice-s-corner");
  });
  it("every slug of every country is plain ASCII", () => {
    for (const s of ALL_STORES) for (const seg of storePath(s).split("/").filter(Boolean)) expect(seg).toMatch(/^[a-z0-9-]+$/);
  });
});

describe("paths and the one-page-per-place rules, every country", () => {
  it("prefixes every non-US store path with its country code", () => {
    const regent = STORE_INDEX.get("R092")!;
    expect(storePath(regent)).toBe("/uk/stores/greater-london/london/regentstreet");
    expect(storePath(STORE_INDEX.get("R331")!)).toBe("/de/stores/north-rhine-westphalia/dusseldorf/duesseldorf");
    for (const s of storesOf("ca")) expect(storePath(s).startsWith("/ca/stores/")).toBe(true);
    expect(storesIndexPath("uk")).toBe("/uk/stores");
    expect(new Set(ALL_STORES.map((s) => storePath(s))).size).toBe(ALL_STORES.length);
  });
  it("Singapore: one region and one city hold every store → the country index", () => {
    expect(placeTarget("sg")).toMatchObject({ kind: "stores", path: "/sg/stores", indexable: true });
    expect(placeTarget("sg", "singapore")).toMatchObject({ kind: "stores", path: "/sg/stores", indexable: false });
    expect(placeTarget("sg", "singapore", "singapore")).toMatchObject({ kind: "stores", path: "/sg/stores", indexable: false });
    expect(statePath("Singapore", "sg")).toBe("/sg/stores");
    expect(cityPath("Singapore", "Singapore", "sg")).toBe("/sg/stores");
    expect(hasStatePage("Singapore", "sg")).toBe(false);
  });
  it("Hong Kong: the region is the whole country; each district has one store", () => {
    expect(placeTarget("hk", "hong-kong")).toMatchObject({ kind: "stores", path: "/hk/stores", indexable: false });
    const central = cityBySlug("hong-kong", "central", "hk")!;
    expect(central.stores).toHaveLength(1);
    expect(placeTarget("hk", "hong-kong", "central")).toMatchObject({ kind: "store", path: storePath(central.stores[0]), indexable: false });
  });
  it("Austria and Belgium: a single store is the country's only page", () => {
    for (const cc of ["at", "be"] as CountryCode[]) {
      const only = storesOf(cc)[0];
      expect(placeTarget(cc)).toMatchObject({ level: "country", kind: "store", path: storePath(only), indexable: false });
      expect(statePath(only.state, cc)).toBe(storePath(only));
      expect(cityPath(only.state, only.city, cc)).toBe(storePath(only));
    }
  });
  it("UK: areas with stores in two cities get a page; a one-city area is its city; a one-store area is its store", () => {
    expect(placeTarget("uk")).toMatchObject({ kind: "stores", path: "/uk/stores", indexable: true });
    expect(placeTarget("uk", "greater-london")).toMatchObject({ kind: "region", path: "/uk/stores/greater-london", indexable: true });
    expect(placeTarget("uk", "greater-london", "london")).toMatchObject({ kind: "city", path: "/uk/stores/greater-london/london", indexable: true });
    // Whatever the data's areas are: one with all its stores in one city collapses into that city's page.
    const oneCity = statesWithStores("uk").filter((r) => r.count > 1 && new Set(storesOf("uk").filter((s) => s.state === r.name).map((s) => s.city)).size === 1);
    expect(oneCity.length).toBeGreaterThan(0);
    for (const r of oneCity) {
      const city = storesOf("uk").find((s) => s.state === r.name)!.city;
      expect(placeTarget("uk", r.slug)).toMatchObject({ kind: "city", path: `/uk/stores/${r.slug}/${citySlug(city)}`, indexable: false });
      expect(hasStatePage(r.name, "uk")).toBe(false);
    }
    expect(placeTarget("uk", "aberdeen")).toMatchObject({ kind: "store", path: "/uk/stores/aberdeen/aberdeen/unionsquare" });
    expect(placeTarget("uk", "nowhere")).toBeNull();
  });
  it("Canada: provinces, Toronto's four stores, one-store cities", () => {
    expect(placeTarget("ca", "ontario")).toMatchObject({ kind: "region", path: "/ca/stores/ontario", indexable: true });
    expect(placeTarget("ca", "ontario", "toronto")).toMatchObject({ kind: "city", indexable: true, stores: expect.any(Array) });
    expect(placeTarget("ca", "ontario", "toronto")!.stores).toHaveLength(4);
    expect(placeTarget("ca", "manitoba")).toMatchObject({ kind: "store", path: storePath(STORE_INDEX.get("R369")!) });
    expect(statesWithStores("ca").find((r) => r.name === "Ontario")).toEqual({ name: "Ontario", code: "ON", slug: "ontario", count: 12 });
    expect(stateCodeOf(STORE_INDEX.get("R121")!)).toBe("ON");
    // Apple says Canada/Eastern; Postgres on Ubuntu 24.04 only knows the canonical name.
    expect(storeTimeZone(STORE_INDEX.get("R121")!)).toBe("America/Toronto");
  });
  it("Taiwan and South Korea", () => {
    expect(placeTarget("tw", "taipei", "taipei")).toMatchObject({ kind: "stores", path: "/tw/stores" });
    expect(placeTarget("kr", "seoul")).toMatchObject({ kind: "city", path: "/kr/stores/seoul/seoul", indexable: false });
    expect(placeTarget("kr", "seoul", "seoul")).toMatchObject({ kind: "city", indexable: true });
  });
  it("links to the country's own apple.com", () => {
    expect(appleBuyUrl({ model: "iPhone Duo", storage: "256GB", color: "Night Sky" }, "uk")).toBe("https://www.apple.com/uk/shop/buy-iphone/iphone-duo");
    expect(appleFamilyUrl("18-pro-max", "ch")).toBe("https://www.apple.com/ch-de/shop/buy-iphone/iphone-18-pro");
    expect(appleBuyIphoneUrl()).toBe("https://www.apple.com/shop/buy-iphone");
    expect(appleBuyIphoneUrl("jp")).toBe("https://www.apple.com/jp/shop/buy-iphone");
  });
  it("names the place in one short line", () => {
    expect(storeLocality(STORE_INDEX.get("R032")!)).toBe("New York, NY");
    expect(storeLocality(STORE_INDEX.get("R032")!, true)).toBe("New York, New York");
    expect(storeLocality(STORE_INDEX.get("R092")!)).toBe("London, UK");
    expect(storeLocality(STORE_INDEX.get("R092")!, true)).toBe("London, United Kingdom");
    expect(storeLocality(STORE_INDEX.get("R121")!)).toBe("Toronto, Canada");
    expect(storeLocality(storesOf("sg")[0])).toBe("Singapore");
  });
});

describe("fast lane targets for other countries", () => {
  const t0 = new Date("2026-11-01T00:00:00Z");
  const rule = (id: string, store: string, over: Partial<RuleRow> = {}): RuleRow => ({
    id, userId: "u1", active: true, paused: false, createdAt: new Date(t0.getTime() + Number(id.slice(1)) * 1000),
    model: "duo", storages: ["256GB"], colors: ["Night Sky"], storeNumbers: [store], ...over,
  });
  const plus: SubRow[] = [{ userId: "u1", plan: "plus", status: "active", alertLimit: 10 }];
  it("a UK rule asks for the UK part, a JP rule for the Japanese one, a US rule for the US one", () => {
    const t = targetsFromRules([rule("w1", "R092"), rule("w2", "R079", { model: "18-pro-max", storages: ["1TB"], colors: ["Burgundy"] }), rule("w3", "R085")], plus);
    expect(t.get("R092")).toEqual(["MK2E4QN/A"]);
    expect(t.get("R079")).toEqual(partNumbersFor("18-pro-max", ["1TB"], ["Burgundy"], "jp"));
    expect(t.get("R079")![0]).toMatch(/J\/A$/);
    expect(t.get("R085")).toEqual(partNumbersFor("duo", ["256GB"], ["Night Sky"]));
  });
});

describe("the store-by-store round of the other countries (the shape before anchors, still used for stores no anchor returns)", () => {
  it("asks every store on its own, its country's 40 parts in two batches", () => {
    const tasks = buildIntlTasks([...INTL_CODES], { anchors: {} });
    expect(tasks).toHaveLength(199 * 2);
    expect(buildIntlTasks([...INTL_CODES])).toHaveLength(94 + 2); // 2026-11-08: 47 anchors × 2 batches + Chermside on its own
    for (const t of tasks) {
      expect(t.store).toBe(t.anchor.anchorStore);
      expect(countryOfStore(t.store!)).toBe(t.country);
      expect(t.parts.length).toBe(20);
      for (const p of t.parts) expect(partNumbersOf(t.country!)).toContain(p);
      expect(t.anchor.location).toBe(`${t.country}:${t.store}`);
    }
    const uk = tasks.filter((t) => t.store === "R092");
    expect(uk.map((t) => t.batchIndex)).toEqual([0, 1]);
    expect(new Set(uk.flatMap((t) => t.parts))).toEqual(new Set(partNumbersOf("uk")));
    expect(buildIntlTasks(["us"])).toEqual([]);
    expect(buildIntlTasks(["us"], { anchors: {} })).toEqual([]);
    expect(buildTasks()).toHaveLength(84); // the US anchor sweep is untouched
  });
  it("POLL_COUNTRIES is opt-in: unset or empty = none, \"all\" = every other country, a list = those (US and junk ignored)", () => {
    expect(parsePollCountries(undefined)).toEqual([]);
    expect(parsePollCountries("")).toEqual([]);
    expect(parsePollCountries(" ALL ")).toEqual(INTL_CODES);
    expect(parsePollCountries("constructor,__proto__,toString")).toEqual([]);
    expect(parsePollCountries("uk, CA ,us,xx")).toEqual(["ca", "uk"]);
  });
});

describe("country-scoped reads (pure part)", () => {
  it("the US: a whole-country read is pinned by its own part numbers, a store subset by the stores", () => {
    expect(countryScope("us", null, null)).toEqual({ stores: null, parts: ALL_PART_NUMBERS });
    expect(countryScope("us", STORES.map((s) => s.storeNumber), null)).toEqual({ stores: null, parts: ALL_PART_NUMBERS });
    const duo = partNumbersFor("duo");
    expect(countryScope("us", null, duo)).toEqual({ stores: null, parts: duo });
    expect(countryScope("us", ["R085", "R032"], duo)).toEqual({ stores: ["R085", "R032"], parts: duo });
  });
  it("a country whose part numbers others share is narrowed to its store list", () => {
    expect(countryScope("de", null, null)).toEqual({ stores: countryStoreNumbers("de"), parts: null });
    expect(countryStoreNumbers("de")).toHaveLength(16);
    const parts = partNumbersFor("duo", [], [], "de");
    expect(countryScope("de", null, parts)).toEqual({ stores: countryStoreNumbers("de"), parts });
    expect(countryScope("jp", null, null)).toEqual({ stores: null, parts: partNumbersOf("jp") });
  });
});

describe("freshness per country", () => {
  const row = (store: string, pairs: number, fresh: number, freshIntl: number, oldest: number) => ({ store_number: store, pairs, fresh, fresh_intl: freshIntl, oldest });
  it("the US figures ignore other countries; each country is judged on its own window", () => {
    const f = freshnessFromRows([
      row("R085", 40, 40, 40, 10), row("R032", 40, 40, 40, 12),
      row("R092", 40, 0, 40, 50), // London: checked 50 s ago — stale for the US window, fresh for the 60 s intl window (4 × 15 s)
      row("R079", 40, 0, 0, 900), // Tokyo: nothing for 15 minutes
    ]);
    expect(f).toMatchObject({ pairs: 80, freshPairs: 80, stores: 2, staleStores: [], oldestSec: 12 });
    expect(f.intl?.uk).toEqual({ pairs: 40, freshPairs: 40, stores: 1, staleStores: [], oldestSec: 50 });
    expect(f.intl?.jp).toEqual({ pairs: 40, freshPairs: 0, stores: 1, staleStores: ["R079"], oldestSec: 900 });
    expect(f.intlFreshSec).toBe(INTL_FRESH_FACTOR * 15);
    // A dead Japan never touches the US verdict.
    expect(pollerVerdict(5_000, f).state).toBe("ok");
    const v = intlVerdict(f, ["uk", "jp", "ca"])!;
    expect(v.state).toBe("blind");
    expect(v.countries.map((c) => [c.cc, c.state])).toEqual([["ca", "blind"], ["uk", "ok"], ["jp", "blind"]]);
    expect(v.summary).toContain("jp 0% fresh");
    expect(intlVerdict(f, ["uk"])!.state).toBe("ok");
  });
  it("without other countries' rows it is exactly the old figure", () => {
    const f = freshnessFromRows([row("R085", 40, 30, 30, 95)]);
    expect(f).toEqual({ pairs: 40, freshPairs: 30, stores: 1, staleStores: ["R085"], oldestSec: 95 });
    expect(intlVerdict(f)).toBeNull();
  });
});

describe("alerts for a store outside the US", () => {
  const store = STORE_INDEX.get("R092")!;
  const item = PART_INDEX.get("MK2E4QN/A")!;
  it("push: the store's place line, its country's apple.com, and the store's own page (the UK has pages)", () => {
    const p = restockPayload([{ item, store, quote: "Heute" }], "w1", new Date("2026-11-02T12:00:00Z"));
    expect(p.title).toBe("iPhone Duo 256GB Night Sky");
    expect(p.body).toBe("Apple Regent Street · London, UK. Tap to reserve on apple.com.");
    // Every country has its page tree (COUNTRIES_WITH_PAGES): the alert opens the store's page under /uk.
    expect(COUNTRIES_WITH_PAGES.has("uk")).toBe(true);
    expect(p.url).toBe(`${storePath(store)}?from=push`);
    expect(p.url.startsWith("/uk/stores/")).toBe(true);
    expect(p.data?.buyUrl).toBe("https://www.apple.com/uk/shop/buy-iphone/iphone-duo");
    expect(p.tag).toBe("restock-w1-R092-MK2E4QN-A");
    // A US alert is exactly what it was: its store page and Apple's own quote.
    const us = STORE_INDEX.get("R085")!;
    const usItem = PART_INDEX.get(partNumbersFor("duo")[0])!;
    const q = restockPayload([{ item: usItem, store: us, quote: "Available Today" }], "w2");
    expect(q.url).toBe(`${storePath(us)}?from=push`);
    expect(q.body).toContain(" — Available Today. Tap to reserve on apple.com.");
  });
  it("Apple's local-language pickup quote stays out of English alerts (push and email)", () => {
    const jp = storesOf("jp")[0];
    const jpItem = itemFor(catalogOf("jp")[0].partNumber, "jp")!;
    const line = { item: jpItem, store: jp, quote: "本日" };
    expect(restockPayload([line], "w3").body).not.toContain("本日");
    expect(alertText([line], "https://x/account")).not.toContain("本日");
    expect(alertHtml([line], "https://x/account")).not.toContain("本日");
    const us = { item: PART_INDEX.get(partNumbersFor("duo")[0])!, store: STORE_INDEX.get("R085")!, quote: "Available Today" };
    expect(alertText([us], "https://x/account")).toContain("(Available Today)");
    expect(alertHtml([us], "https://x/account")).toContain("Available Today");
  });
  it("Hong Kong's buy links go to the English store; its pickup API keeps the probed path", () => {
    expect(appleBuyIphoneUrl("hk")).toBe("https://www.apple.com/hk/en/shop/buy-iphone");
    expect(appleBuyUrl({ model: "iPhone Duo", storage: "256GB", color: "Night Sky" }, "hk")).toBe("https://www.apple.com/hk/en/shop/buy-iphone/iphone-duo");
    expect(appleBuyIphoneUrl("uk")).toBe("https://www.apple.com/uk/shop/buy-iphone");
    expect(appleBuyIphoneUrl()).toBe("https://www.apple.com/shop/buy-iphone");
  });
  it("email: the country's apple.com and a place line without a US state", () => {
    const lines = [{ item, store, quote: null }];
    expect(alertText(lines, "https://x/account")).toContain("Reserve: https://www.apple.com/uk/shop/buy-iphone");
    expect(alertText(lines, "https://x/account")).toContain("Apple Regent Street, London, United Kingdom");
    expect(alertHtml(lines, "https://x/account")).toContain('href="https://www.apple.com/uk/shop/buy-iphone"');
  });
});

describe("/api/watches for a store outside the US", () => {
  it("accepts a configuration the store's country sells, and says clearly when it does not", async () => {
    const { unsoldAt, ruleConfig } = await import("@/app/api/watches/route");
    const duo = { model: "duo" as const, storage: "256GB", color: "Night Sky" };
    expect(unsoldAt([duo], ["R092", "R085"])).toBeNull();
    expect(unsoldAt([{ ...duo, color: "Burgundy" }], ["R085"])).toBeNull(); // US stores are checked by the US catalogue as before
    expect(unsoldAt([{ ...duo, color: "Burgundy" }], ["R092"])).toBe("duo 256GB Burgundy is not sold at Regent Street (United Kingdom)");
    expect(ruleConfig({ model: "duo", storages: ["256GB"], colors: ["Night Sky"], storeNumbers: ["R092"] })).toMatchObject({ partNumber: "MK2E4QN/A", price: priceFor("MK2E4QN/A", "uk") });
    expect(ruleConfig({ model: "duo", storages: ["256GB"], colors: ["Night Sky"], storeNumbers: ["R085"] })!.partNumber).toBe(partNumbersFor("duo", ["256GB"], ["Night Sky"])[0]);
  });
});
