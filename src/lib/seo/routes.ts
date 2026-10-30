import { MODELS, STORES, citySlug, citiesWithStores, stateSlug, statesWithStores, storePath } from "@/lib/apple/catalog";
import { productBySlug, productFor, productPath, resolvePlace } from "./products";

/** Every public place address, built once per process. */
let known: { states: Set<string>; cities: Set<string>; stores: Set<string>; legacy: Map<string, string>; models: Set<string> } | null = null;
function knownPaths() {
  if (known) return known;
  known = {
    states: new Set(statesWithStores().map((s) => s.slug)),
    cities: new Set(citiesWithStores().map((c) => `${c.stateSlug}/${c.slug}`)),
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
  if (parts[0] === "stores" && parts.length > 1) {
    const k = knownPaths();
    if (parts.length === 2) return k.states.has(parts[1]) ? null : { notFound: true };
    if (parts.length === 3) {
      const key = `${parts[1]}/${parts[2]}`;
      if (k.cities.has(key)) return null;
      const to = k.legacy.get(key);
      return to ? { redirect: to + search } : { notFound: true };
    }
    if (parts.length === 4) return k.stores.has(parts.slice(1).join("/")) ? null : { notFound: true };
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
