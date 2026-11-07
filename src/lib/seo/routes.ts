import { MODELS, STORES, citySlug, citiesWithStores, stateSlug, statesWithStores, storePath, statePath, hasStatePage, storesOf, placeTarget } from "@/lib/apple/catalog";
import { countryFromPrefix, type CountryCode } from "@/lib/apple/countries";
import { nativeLocale, pathInLocale } from "@/lib/i18n/locales";
import { productBySlug, productFor, productPath, resolvePlace } from "./products";
import { treeOf } from "./tree";
/** The old blog had one thin post; its topic lives on the 18 Pro stock page. Everything else under /blog goes home. */
const RETIRED: Record<string, string> = { "/blog/how-to-find-iphone-18-pro-in-stock-near-you": "/stock/iphone-18-pro" };

/**
 * First path segments that are not another country: the app's own top-level routes, metadata routes without an
 * extension, and the public/ folders (a test keeps this in step with src/app and public/).
 */
export const TOP_LEVEL: ReadonlySet<string> = new Set([
  "about", "account", "admin", "api", "checkout", "contact", "how-it-works", "install", "map", "pricing", "privacy", "refunds", "restocks", "stock", "stores", "terms",
  // The iPhone Duo question pages (seo.md §13): one answer page per question people put to search and answer engines.
  "iphone-duo-restock-times", "iphone-duo-sell-out-times", "iphone-duo-stock-alerts", "iphone-duo-near-me", "how-to-get-an-iphone-duo", "which-iphone-duo-restocks-most", "apple-store-pickup-availability-explained", "how-to-grab-an-iphone-duo-restock",
  // The phrasing pages (docs/research.md §8.3 C): the words people type when they do not know a tracker exists.
  "iphone-duo-back-in-stock", "iphone-duo-stock-checker", "where-to-buy-iphone-duo",
  "research", "blog", "opengraph-image", "_not-found", "icons", "img", "vendor", "zip",
  "iphone-duo-shortage",
  "iphone-duo-apple-vs-carriers-vs-retailers",
  "iphone-duo-stock-api",
]);

/** Question pages that exist for every country under its prefix (/ca/iphone-duo-restock-times …). */
export const COUNTRY_QUESTION_PAGES: ReadonlySet<string> = new Set(["iphone-duo-restock-times", "which-iphone-duo-restocks-most", "iphone-duo-shortage", "iphone-duo-apple-vs-carriers-vs-retailers", "iphone-duo-stock-api"]);

/** Every public place address, built once per process. */
let known: { states: Set<string>; oneStoreStates: Map<string, string>; cities: Set<string>; oneStoreCities: Map<string, string>; stores: Set<string>; legacy: Map<string, string>; models: Set<string> } | null = null;
function knownPaths() {
  if (known) return known;
  known = {
    states: new Set(statesWithStores().filter((s) => hasStatePage(s.name)).map((s) => s.slug)),
    // One-store states go to their store, one-city states to their city page.
    oneStoreStates: new Map(statesWithStores().filter((s) => !hasStatePage(s.name)).map((s) => [s.slug, statePath(s.name)])),
    cities: new Set(citiesWithStores().filter((c) => c.stores.length > 1).map((c) => `${c.stateSlug}/${c.slug}`)),
    oneStoreCities: new Map(citiesWithStores().filter((c) => c.stores.length === 1).map((c) => [`${c.stateSlug}/${c.slug}`, storePath(c.stores[0])])),
    stores: new Set(STORES.map((s) => `${stateSlug(s.state)}/${citySlug(s.city)}/${s.slug}`)),
    legacy: new Map(STORES.map((s) => [`${stateSlug(s.state)}/${s.slug}`, storePath(s)])),
    models: new Set(MODELS.map((m) => m.slug)),
  };
  return known;
}

/**
 * The place and model pages stream behind loading.tsx, so a notFound()/permanentRedirect() thrown
 * inside them can only answer 200 + noindex / meta refresh. Decide here, before anything streams:
 * unknown slugs are a real 404, the old /stores/{state}/{store} addresses a real 308.
 */
export function publicRouteCheck(pathname: string, search = ""): { notFound: true } | { redirect: string } | null {
  const parts = pathname.split("/").filter(Boolean);
  // Any other unknown first segment would land on the /[cc] route and render its 404 late: answer it here.
  if (parts[0] && !/^[a-z]{2}(-[a-z]{2})?$/.test(parts[0]) && !TOP_LEVEL.has(parts[0]) && !parts[parts.length - 1].includes(".")) return { notFound: true };
  // A native version of a country's tree (/ja-jp/…, docs/i18n.md §6): the same rules as its English tree, redirects kept in the version.
  if (parts[0] && /^[a-z]{2}-[a-z]{2}$/.test(parts[0])) {
    const loc = nativeLocale(parts[0]);
    if (!loc) return { notFound: true };
    const r = countryRouteCheck(loc.cc, parts.slice(1), search);
    return r && "redirect" in r ? { redirect: pathInLocale(r.redirect, loc) } : r;
  }
  // Two letters first: another country's tree (/ca, /uk/stores/…). No top-level route of the site has two letters.
  if (parts[0] && /^[a-z]{2}$/.test(parts[0])) {
    if (parts[0] === "us") return { redirect: `/${parts.slice(1).join("/")}${search}` }; // the US has no prefix
    const c = countryFromPrefix(parts[0]);
    return c ? countryRouteCheck(c.cc, parts.slice(1), search) : { notFound: true };
  }
  if (parts[0] === "blog") return { redirect: RETIRED[`/${parts.join("/")}`] ?? "/" };
  if (parts[0] === "stores" && parts.length > 1) {
    const k = knownPaths();
    if (parts.length === 2) {
      if (k.states.has(parts[1])) return null;
      // A one-store state is its store's page.
      const only = k.oneStoreStates.get(parts[1]);
      return only ? { redirect: only + search } : { notFound: true };
    }
    if (parts.length === 3) {
      const key = `${parts[1]}/${parts[2]}`;
      if (k.cities.has(key)) return null;
      // A one-store city is its store's page.
      const only = k.oneStoreCities.get(key);
      if (only) return { redirect: only + search };
      const to = k.legacy.get(key);
      return to ? { redirect: to + search } : { notFound: true };
    }
    if (parts.length === 4) return k.stores.has(parts.slice(1).join("/")) ? null : { notFound: true };
    return { notFound: true };
  }
  // /iphone-duo-restock-times/{state}[/{city}]: the same one-page-per-place rules as /stores (a one-store place is
  // its store's page, a one-city state its city's restock-times page), decided here so a wrong slug is a real 404.
  if (parts[0] === "iphone-duo-restock-times" && parts.length > 1) {
    const k = knownPaths();
    if (parts.length === 2) {
      if (k.states.has(parts[1])) return null;
      const only = k.oneStoreStates.get(parts[1]);
      if (!only) return { notFound: true };
      const cityPage = only.match(/^\/stores\/([^/]+)\/([^/]+)$/);
      return { redirect: (cityPage ? `/iphone-duo-restock-times/${cityPage[1]}/${cityPage[2]}` : only) + search };
    }
    if (parts.length === 3) {
      const key = `${parts[1]}/${parts[2]}`;
      if (k.cities.has(key)) return null;
      const only = k.oneStoreCities.get(key);
      return only ? { redirect: only + search } : { notFound: true };
    }
    return { notFound: true };
  }
  if (parts[0] === "stock" && parts.length > 1) {
    const product = productBySlug(parts[1]);
    if (!product) return { notFound: true };
    // The old model page filtered with ?storage=&color=: those are pages of their own now.
    const q = new URLSearchParams(search);
    if (parts.length === 2 && product.kind === "model" && (q.has("storage") || q.has("color"))) {
      const to = productFor(product.model, q.get("storage") ?? undefined, q.get("color") ?? undefined);
      q.delete("storage"); q.delete("color");
      const rest = q.toString();
      return { redirect: `${productPath(to)}${rest ? `?${rest}` : ""}` };
    }
    const place = resolvePlace(parts.slice(2));
    if (!place) return { notFound: true };
    if ("redirect" in place) return { redirect: `${productPath(product, { segments: place.redirect })}${search}` };
    return null;
  }
  return null;
}

/**
 * /{cc}/… of another country: its home, store tree (one indexable page per place, placeTarget), product tree,
 * restock log and map. Anything else under the prefix is a 404; a place URL that is not its place's page 308s
 * to the one that is (Glasgow's region → its city, Austria's store index → its only store, Tokyo → Tokyo city…).
 */
function countryRouteCheck(cc: CountryCode, rest: string[], search: string): { notFound: true } | { redirect: string } | null {
  if (rest.length === 0) return null;
  const [head, ...tail] = rest;
  if (head === "stores") {
    if (tail.length <= 2) {
      const t = placeTarget(cc, tail[0], tail[1]);
      if (!t) {
        // The old shape /{cc}/stores/{region}/{store}: its store.
        const legacy = tail.length === 2 ? storesOf(cc).find((s) => s.slug === tail[1] && stateSlug(s.state) === tail[0]) : undefined;
        return legacy ? { redirect: storePath(legacy) + search } : { notFound: true };
      }
      return t.indexable ? null : { redirect: t.path + search };
    }
    if (tail.length === 3) return storesOf(cc).some((s) => stateSlug(s.state) === tail[0] && citySlug(s.city) === tail[1] && s.slug === tail[2]) ? null : { notFound: true };
    return { notFound: true };
  }
  if (head === "stock" && tail.length > 0) {
    const t = treeOf(cc);
    const product = t.productBySlug(tail[0]);
    if (!product) return { notFound: true };
    const q = new URLSearchParams(search);
    if (tail.length === 1 && product.kind === "model" && (q.has("storage") || q.has("color"))) {
      const to = t.productFor(product.model, q.get("storage") ?? undefined, q.get("color") ?? undefined);
      q.delete("storage"); q.delete("color");
      const left = q.toString();
      return { redirect: `${productPath(to)}${left ? `?${left}` : ""}` };
    }
    const place = t.resolvePlace(tail.slice(1));
    if (!place) return { notFound: true };
    if ("redirect" in place) return { redirect: `${productPath(product, { segments: place.redirect, country: cc })}${search}` };
    return null;
  }
  if ((head === "restocks" || head === "map" || COUNTRY_QUESTION_PAGES.has(head)) && tail.length === 0) return null;
  return { notFound: true };
}
