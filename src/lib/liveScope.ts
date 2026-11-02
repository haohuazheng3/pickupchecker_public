/**
 * Scopes for live "checked … ago" figures (/api/live, src/components/site/LiveChecked.tsx): a model across
 * the US, one or more stores, or a model at some stores. One string per scope keeps the request URL — and
 * so the CDN cache key — stable for every visitor of the same page.
 *   "m:duo"                  newest check of any iPhone Duo configuration
 *   "s:R085.R123"            newest check at these stores
 *   "m:duo|s:R085"           newest check of the Duo at R085
 */
import type { ModelKey } from "./apple/catalog";

export interface LiveScope { model: ModelKey | null; stores: string[] }

const MODEL_KEYS = new Set<string>(["duo", "18-pro", "18-pro-max"]);

export function liveKey(scope: { model?: ModelKey | null; stores?: string[] | null }): string | null {
  const stores = [...new Set(scope.stores ?? [])].filter((s) => /^R\d{3,4}$/.test(s)).sort();
  const parts = [scope.model ? `m:${scope.model}` : "", stores.length ? `s:${stores.join(".")}` : ""].filter(Boolean);
  return parts.length ? parts.join("|") : null;
}

export function parseLiveKey(key: string): LiveScope | null {
  let model: ModelKey | null = null;
  let stores: string[] = [];
  for (const part of key.split("|")) {
    if (part.startsWith("m:") && MODEL_KEYS.has(part.slice(2))) model = part.slice(2) as ModelKey;
    else if (part.startsWith("s:")) stores = part.slice(2).split(".").filter((s) => /^R\d{3,4}$/.test(s));
    else return null;
  }
  return model || stores.length ? { model, stores } : null;
}
