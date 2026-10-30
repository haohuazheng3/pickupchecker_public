import { describe, expect, it } from "vitest";
import { CATALOG, STORES, catalogFor, citiesWithStores } from "@/lib/apple/catalog";
import { PRODUCTS, US, productBySlug, productFor, productPath, resolvePlace, placeChain, storePlace } from "@/lib/seo/products";
import { publicRouteCheck } from "@/lib/seo/routes";
import { alertHref } from "@/components/site/AlertBar";
import { indexStock, facetsFor, storeLines, chipCount, configGrid, childPlaces } from "@/lib/seo/productData";
import type { PartStatus } from "@/lib/stock/queries";

describe("products", () => {
  it("65 unique slugs: 3 models, 12 storages, 10 colors, 40 configurations", () => {
    expect(PRODUCTS.length).toBe(65);
    expect(new Set(PRODUCTS.map((p) => p.slug)).size).toBe(65);
    expect(PRODUCTS.filter((p) => p.kind === "config").length).toBe(CATALOG.length);
    for (const p of PRODUCTS) expect(productBySlug(p.slug)).toBe(p);
  });
  it("18 Pro and 18 Pro Max never collide", () => {
    expect(productBySlug("iphone-18-pro-max")?.model).toBe("18-pro-max");
    expect(productBySlug("iphone-18-pro-256gb")?.model).toBe("18-pro");
    expect(productBySlug("iphone-18-pro-max-1tb-silver")).toMatchObject({ model: "18-pro-max", storage: "1TB", color: "Silver", kind: "config" });
    expect(productBySlug("iphone-duo-512gb-night-sky")?.parts.length).toBe(1);
    expect(productBySlug("iphone-duo-night-sky")?.parts.length).toBe(4);
  });
  it("productFor drops an option the model does not have", () => {
    expect(productFor("18-pro", "512GB", "Night Sky").slug).toBe("iphone-18-pro-512gb");
    expect(productFor("duo", undefined, "Silver").slug).toBe("iphone-duo");
  });
});

describe("places", () => {
  const multi = citiesWithStores().find((c) => c.stores.length > 1)!;
  const single = citiesWithStores().find((c) => c.stores.length === 1)!;
  it("US, state, multi-store city, store; a one-store city points at its store", () => {
    expect(resolvePlace([])).toBe(US);
    expect(resolvePlace(["texas"])).toMatchObject({ level: "state", state: "Texas" });
    expect(resolvePlace([multi.stateSlug, multi.slug])).toMatchObject({ level: "city", city: multi.name });
    expect(resolvePlace([single.stateSlug, single.slug])).toEqual({ redirect: storePlace(single.stores[0]).segments });
    expect(resolvePlace(storePlace(STORES[0]).segments)).toMatchObject({ level: "store", store: STORES[0] });
    expect(resolvePlace(["nowhere"])).toBeNull();
    expect(resolvePlace([multi.stateSlug, multi.slug, "not-a-store"])).toBeNull();
    expect(resolvePlace([...storePlace(STORES[0]).segments, "x"])).toBeNull();
  });
  it("the breadcrumb chain skips one-store cities", () => {
    const s = single.stores[0];
    expect(placeChain(storePlace(s)).map((p) => p.level)).toEqual(["us", "state", "store"]);
    const m = multi.stores[0];
    expect(placeChain(storePlace(m)).map((p) => p.level)).toEqual(["us", "state", "city", "store"]);
  });
});

describe("route check for /stock", () => {
  const single = citiesWithStores().find((c) => c.stores.length === 1)!;
  it("lets real pages through and 404s the rest", () => {
    expect(publicRouteCheck("/stock/iphone-duo")).toBeNull();
    expect(publicRouteCheck("/stock/iphone-duo-512gb-night-sky/texas")).toBeNull();
    expect(publicRouteCheck(`/stock/iphone-18-pro${productPath({ slug: "" }, storePlace(STORES[5])).slice(7)}`)).toBeNull();
    expect(publicRouteCheck("/stock/iphone-nope")).toEqual({ notFound: true });
    expect(publicRouteCheck("/stock/iphone-duo/atlantis")).toEqual({ notFound: true });
  });
  it("one-store cities redirect to the store; the old ?storage&color filter redirects to its page", () => {
    expect(publicRouteCheck(`/stock/iphone-duo/${single.stateSlug}/${single.slug}`)).toEqual({ redirect: productPath({ slug: "iphone-duo" }, storePlace(single.stores[0])) });
    expect(publicRouteCheck("/stock/iphone-duo", "?storage=512GB&color=Night%20Sky")).toEqual({ redirect: "/stock/iphone-duo-512gb-night-sky" });
    expect(publicRouteCheck("/stock/iphone-duo", "?color=Star+White&utm_source=x")).toEqual({ redirect: "/stock/iphone-duo-star-white?utm_source=x" });
    expect(publicRouteCheck("/stock/iphone-duo", "?utm_source=x")).toBeNull();
  });
});

describe("Alert me on a product page", () => {
  it("carries the phone and the place into the wizard", () => {
    const s = STORES[0];
    const href = alertHref(productPath({ slug: "iphone-duo-512gb-night-sky" }, storePlace(s)));
    const q = new URLSearchParams(href.slice(2, href.indexOf("#")));
    expect(Object.fromEntries(q)).toEqual({ model: "duo", storage: "512GB", color: "Night Sky", store: s.storeNumber });
    expect(alertHref("/stock/iphone-18-pro-silver/texas")).toBe("/?model=18-pro&color=Silver&state=texas#notify");
  });
});

describe("facets and lines", () => {
  const duo = catalogFor("duo");
  const [a, b] = STORES.filter((s) => s.state === "Texas");
  const row = (store: string, part: string, status: string): PartStatus => ({ storeNumber: store, partNumber: part, status, quote: null, since: null, lastCheckedAt: "2026-10-30T10:00:00.000Z", lastAvailableAt: status === "available" ? "2026-10-30T09:59:00.000Z" : null });
  const stock = { duo: [row(a.storeNumber, duo[0].partNumber, "available"), row(a.storeNumber, duo[1].partNumber, "available"), row(b.storeNumber, duo[0].partNumber, "unavailable")], "18-pro": [], "18-pro-max": [] };
  const ix = indexStock(stock);
  const tx = resolvePlace(["texas"]);
  it("counts stores at a place and configurations at a store", () => {
    if (!tx || "redirect" in tx) throw new Error("texas");
    const model = productBySlug("iphone-duo")!;
    expect(chipCount(ix, model, tx)).toBe(1);
    expect(chipCount(ix, model, storePlace(a))).toBe(2);
    const f = facetsFor(ix, model, tx);
    expect(f.models.find((x) => x.on)?.count).toBe(1);
    expect(f.storages[0]).toMatchObject({ label: "All", on: true });
    const lines = storeLines(ix, model, tx.stores);
    expect(lines[0].store.storeNumber).toBe(a.storeNumber);
    expect(lines[0].available.length).toBe(2);
    const grid = configGrid(ix, model, tx);
    expect(grid.cells.get(`${duo[0].storage}|${duo[0].color}`)?.count).toBe(1);
    expect(childPlaces(ix, model, tx).every((c) => c.place.level === "city")).toBe(true);
  });
});
