/** Small pieces every country's page template shares. */
import { MODELS, placeTarget, storesIndexPath } from "@/lib/apple/catalog";
import { ALL_CODES, COUNTRIES, prefixOf, type CountryCode } from "@/lib/apple/countries";
import { NATIVE_LOCALES, englishPath, localeFromSegment, localesOf, pathInLocale, type Locale } from "@/lib/i18n/locales";

/** When other countries' stores began to be tracked (the sources line of their pages). */
export const INTL_TRACKING_LABEL = "November 2, 2026";

export type EquivalentPage = "home" | "stores" | "restock-times" | { model: string };

/** The path of one page type in a country, or null where that country has no such page (Austria's store index is its store). */
export function equivalentPath(cc: CountryCode, page: EquivalentPage): string | null {
  if (page === "home") return prefixOf(cc) || "/";
  if (page === "stores") return placeTarget(cc)?.indexable ? storesIndexPath(cc) : null;
  if (page === "restock-times") return `${prefixOf(cc)}/iphone-duo-restock-times`;
  return MODELS.some((m) => m.slug === page.model) ? `${prefixOf(cc)}/stock/${page.model}` : null;
}

/**
 * hreflang alternates between the countries' equivalent pages (home, store index, the three model pages, the
 * restock-times page; seo.md §12) and every language version of each (docs/i18n.md §6): en-US ↔ en-CA ↔ fr-CA ↔
 * en-JP ↔ ja-JP …, x-default = the US page.
 */
export function hreflangFor(page: EquivalentPage): Record<string, string> {
  const out: Record<string, string> = {};
  for (const cc of ALL_CODES) {
    const p = equivalentPath(cc, page);
    if (!p) continue;
    out[COUNTRIES[cc].hreflang] = p;
    for (const l of NATIVE_LOCALES) if (l.cc === cc) out[l.tag] = pathInLocale(p, l);
  }
  out["x-default"] = equivalentPath("us", page)!;
  return out;
}

/**
 * hreflang for a page that exists in one country only (a store, region, city, product, map or log page): its
 * English and native versions point at each other, x-default = the English one. US pages have no versions: {}.
 */
export function versionsOf(path: string): Record<string, string> {
  const en = englishPath(path);
  const seg = en.split(/[?#]/)[0].split("/")[1];
  const loc = localeFromSegment(seg);
  if (!loc) return {};
  const vs = localesOf(loc.cc);
  if (vs.length < 2) return {};
  const out: Record<string, string> = {};
  for (const l of vs) out[l.tag] = pathInLocale(en, l);
  out["x-default"] = en;
  return out;
}

/** canonical (this version's own URL) + hreflang for a page given in its English form. */
export function alternatesIn(path: string, loc: Locale, languages?: Record<string, string>): { canonical: string; languages: Record<string, string> } {
  return { canonical: pathInLocale(path, loc), languages: languages ?? versionsOf(path) };
}
