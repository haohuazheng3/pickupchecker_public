/**
 * Scopes for live "checked … ago" figures (/api/live, src/components/site/LiveChecked.tsx): a model across
 * the US, one or more stores, or a model at some stores. One string per scope keeps the request URL — and
 * so the CDN cache key — stable for every visitor of the same page.
 *   "m:duo"                  newest check of any iPhone Duo configuration in the US
 *   "c:uk|m:duo"             the same across another country (its own part numbers and stores)
 *   "s:R085.R123"            newest check at these stores (store numbers are unique worldwide)
 *   "m:duo|s:R085"           newest check of the Duo at R085 (in that store's country's part numbers)
 * US keys never carry "c:" (they are exactly what they always were).
 */
import type { ModelKey } from "./apple/catalog";
import { isCountryCode, type CountryCode } from "./apple/countries";

export interface LiveScope { model: ModelKey | null; stores: string[]; country?: Exclude<CountryCode, "us"> }

const MODEL_KEYS = new Set<string>(["duo", "18-pro", "18-pro-max"]);

export function liveKey(scope: { model?: ModelKey | null; stores?: string[] | null; country?: CountryCode | null }): string | null {
  const stores = [...new Set(scope.stores ?? [])].filter((s) => /^R\d{3,4}$/.test(s)).sort();
  // The country only matters to a model scope without stores: stores already name their country.
  const cc = scope.country && scope.country !== "us" && scope.model && !stores.length ? `c:${scope.country}` : "";
  const parts = [cc, scope.model ? `m:${scope.model}` : "", stores.length ? `s:${stores.join(".")}` : ""].filter(Boolean);
  return parts.length ? parts.join("|") : null;
}

export function parseLiveKey(key: string): LiveScope | null {
  let model: ModelKey | null = null;
  let stores: string[] = [];
  let country: LiveScope["country"];
  for (const part of key.split("|")) {
    if (part.startsWith("m:") && MODEL_KEYS.has(part.slice(2))) model = part.slice(2) as ModelKey;
    else if (part.startsWith("s:")) stores = part.slice(2).split(".").filter((s) => /^R\d{3,4}$/.test(s));
    else if (part.startsWith("c:") && isCountryCode(part.slice(2)) && part.slice(2) !== "us") country = part.slice(2) as LiveScope["country"];
    else return null;
  }
  if (country && (!model || stores.length)) return null;
  return model || stores.length ? { model, stores, ...(country ? { country } : {}) } : null;
}
