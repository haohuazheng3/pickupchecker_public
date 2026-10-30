import { describe, expect, it } from "vitest";
import { publicRouteCheck } from "@/lib/seo/routes";
import { MODELS, STORES, citySlug, stateSlug, storePath } from "@/lib/apple/catalog";

const store = STORES[0];
const state = stateSlug(store.state);
const city = citySlug(store.city);

describe("publicRouteCheck (proxy: real 404 / 308 before the page streams)", () => {
  it("lets every real address through", () => {
    expect(publicRouteCheck("/")).toBeNull();
    expect(publicRouteCheck("/stores")).toBeNull();
    expect(publicRouteCheck(`/stores/${state}`)).toBeNull();
    expect(publicRouteCheck(`/stores/${state}/${city}`)).toBeNull();
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
  it("never confuses a city slug with a legacy store slug", () => {
    for (const s of STORES) expect(publicRouteCheck(storePath(s))).toBeNull();
  });
});
