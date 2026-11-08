import { describe, expect, it } from "vitest";
import { publicRouteCheck } from "@/lib/seo/routes";
import { MODELS, STORES, citySlug, stateSlug, storePath } from "@/lib/apple/catalog";

const store = STORES[0];
const state = stateSlug(store.state);
const city = citySlug(store.city);

describe("publicRouteCheck (proxy: real 404 / 308 before the page streams)", () => {
  it("the pages retired on 2026-11-08 redirect (308) instead of 404ing, in every country and language", () => {
    expect(publicRouteCheck("/iphone-duo-shortage")).toEqual({ redirect: "/iphone-duo-restock-times" });
    expect(publicRouteCheck("/iphone-duo-apple-vs-carriers-vs-retailers")).toEqual({ redirect: "/iphone-duo-stock-alerts" });
    expect(publicRouteCheck("/five-second-checks")).toEqual({ redirect: "/how-it-works#speed" });
    expect(publicRouteCheck("/how-to-get-an-iphone-duo")).toEqual({ redirect: "/how-to-grab-an-iphone-duo-restock" });
    expect(publicRouteCheck("/uk/iphone-duo-shortage")).toEqual({ redirect: "/uk/iphone-duo-restock-times" });
    expect(publicRouteCheck("/ca/iphone-duo-apple-vs-carriers-vs-retailers")).toEqual({ redirect: "/ca/iphone-duo-restock-times" });
    expect(publicRouteCheck("/ja-jp/iphone-duo-shortage")).toEqual({ redirect: "/ja-jp/iphone-duo-restock-times" });
    expect(publicRouteCheck("/fr-ca/iphone-duo-apple-vs-carriers-vs-retailers")).toEqual({ redirect: "/fr-ca/iphone-duo-restock-times" });
    // The surviving decision pages and the evidence files still resolve.
    expect(publicRouteCheck("/which-iphone-duo-restocks-most")).toBeNull();
    expect(publicRouteCheck("/uk/iphone-duo-stock-api")).toBeNull();
    expect(publicRouteCheck("/check-evidence/2026-11-07/checks.csv")).toBeNull();
  });
  it("lets every real address through", () => {
    expect(publicRouteCheck("/")).toBeNull();
    expect(publicRouteCheck("/research/iphone-duo-week-2026-11-07")).toBeNull();
    expect(publicRouteCheck("/stores")).toBeNull();
    expect(publicRouteCheck(`/stores/${state}`)).toBeNull();
    expect(publicRouteCheck("/stores/texas/houston")).toBeNull();
    expect(publicRouteCheck(`/stores/${state}/${city}/${store.slug}`)).toBeNull();
    expect(publicRouteCheck(storePath(store))).toBeNull();
    for (const m of MODELS) expect(publicRouteCheck(`/stock/${m.slug}`)).toBeNull();
    expect(publicRouteCheck("/restocks")).toBeNull();
    expect(publicRouteCheck("/account/anything")).toBeNull();
  });
  it("answers 404 for unknown states, cities, stores, models and extra segments", () => {
    expect(publicRouteCheck("/stores/notastate")).toEqual({ notFound: true });
    expect(publicRouteCheck(`/stores/${state}/nowhere`)).toEqual({ notFound: true });
    expect(publicRouteCheck(`/stores/${state}/${city}/nonexistent-store`)).toEqual({ notFound: true });
    expect(publicRouteCheck(`/stores/${state}/${city}/${store.slug}/extra`)).toEqual({ notFound: true });
    expect(publicRouteCheck("/stock/iphone-nope")).toEqual({ notFound: true });
    expect(publicRouteCheck(`/stock/${MODELS[0].slug}/x`)).toEqual({ notFound: true });
  });
  it("rejects a real store under the wrong city or state", () => {
    const other = STORES.find((s) => citySlug(s.city) !== city || stateSlug(s.state) !== state)!;
    expect(publicRouteCheck(`/stores/${state}/${city}/${other.slug}`)).toEqual({ notFound: true });
  });
  it("redirects the old /stores/{state}/{store} address to the city URL", () => {
    expect(publicRouteCheck(`/stores/${state}/${store.slug}`)).toEqual({ redirect: storePath(store) });
  });
  it("folds one-store cities and states into their store page, one-city states into their city page", () => {
    // Birmingham, AL has one store: the city address is that store.
    expect(publicRouteCheck(`/stores/${state}/${city}`)).toEqual({ redirect: storePath(store) });
    const delaware = STORES.find((s) => s.state === "Delaware")!;
    expect(publicRouteCheck("/stores/delaware")).toEqual({ redirect: storePath(delaware) });
    expect(publicRouteCheck("/stores/hawaii")).toEqual({ redirect: "/stores/hawaii/honolulu" });
    expect(publicRouteCheck("/stores/hawaii/honolulu")).toBeNull();
  });
  it("sends the retired blog home", () => {
    expect(publicRouteCheck("/blog")).toEqual({ redirect: "/" });
    expect(publicRouteCheck("/blog/how-to-find-iphone-18-pro-in-stock-near-you")).toEqual({ redirect: "/stock/iphone-18-pro" });
  });
  it("never confuses a city slug with a legacy store slug", () => {
    for (const s of STORES) expect(publicRouteCheck(storePath(s))).toBeNull();
  });
});

describe("the state and city restock-times pages (/iphone-duo-restock-times/{state}[/{city}])", () => {
  it("lets every place with a page through and 404s the rest", () => {
    expect(publicRouteCheck("/iphone-duo-restock-times")).toBeNull();
    expect(publicRouteCheck("/iphone-duo-restock-times/california")).toBeNull();
    expect(publicRouteCheck("/iphone-duo-restock-times/california/los-angeles")).toBeNull();
    expect(publicRouteCheck("/iphone-duo-restock-times/new-york/new-york")).toBeNull();
    expect(publicRouteCheck("/iphone-duo-restock-times/notastate")).toEqual({ notFound: true });
    expect(publicRouteCheck("/iphone-duo-restock-times/california/nowhere")).toEqual({ notFound: true });
    expect(publicRouteCheck("/iphone-duo-restock-times/california/los-angeles/extra")).toEqual({ notFound: true });
  });
  it("folds one-store places into their store page and a one-city state into its city's page", () => {
    const delaware = STORES.find((s) => s.state === "Delaware")!;
    expect(publicRouteCheck("/iphone-duo-restock-times/delaware")).toEqual({ redirect: storePath(delaware) });
    expect(publicRouteCheck("/iphone-duo-restock-times/hawaii")).toEqual({ redirect: "/iphone-duo-restock-times/hawaii/honolulu" });
    expect(publicRouteCheck("/iphone-duo-restock-times/hawaii/honolulu")).toBeNull();
    // Birmingham, AL has one store: the city address is that store.
    expect(publicRouteCheck(`/iphone-duo-restock-times/${state}/${city}`)).toEqual({ redirect: storePath(store) });
  });
});
