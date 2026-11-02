/** Small pieces every country's page template shares. */
import { MODELS, placeTarget, storesIndexPath } from "@/lib/apple/catalog";
import { ALL_CODES, COUNTRIES, prefixOf, type CountryCode } from "@/lib/apple/countries";

/** When other countries' stores began to be tracked (the sources line of their pages). */
export const INTL_TRACKING_LABEL = "November 2, 2026";

export type EquivalentPage = "home" | "stores" | { model: string };

/** The path of one page type in a country, or null where that country has no such page (Austria's store index is its store). */
export function equivalentPath(cc: CountryCode, page: EquivalentPage): string | null {
  if (page === "home") return prefixOf(cc) || "/";
  if (page === "stores") return placeTarget(cc)?.indexable ? storesIndexPath(cc) : null;
  return MODELS.some((m) => m.slug === page.model) ? `${prefixOf(cc)}/stock/${page.model}` : null;
}

/**
 * hreflang alternates between the countries' equivalent pages (home, store index, the three model pages;
 * seo.md §12): en-US ↔ en-CA ↔ en-GB …, x-default = the US page.
 */
export function hreflangFor(page: EquivalentPage): Record<string, string> {
  const out: Record<string, string> = {};
  for (const cc of ALL_CODES) {
    const p = equivalentPath(cc, page);
    if (p) out[COUNTRIES[cc].hreflang] = p;
  }
  out["x-default"] = equivalentPath("us", page)!;
  return out;
}
