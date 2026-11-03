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
 * hreflang between the countries' equivalent pages (home, store index, the three model pages, the restock-times page;
 * seo.md §12). English pages keep exactly the cluster they always had — en-US ↔ en-CA ↔ en-GB …, x-default = the US
 * page — so pages that already earn search and AI traffic are not touched (站长 2026-11-03). The native versions
 * (docs/i18n.md §6) form their own cluster: ja-JP ↔ de-DE ↔ fr-CA …
 */
export function hreflangFor(page: EquivalentPage, loc?: Locale): Record<string, string> {
  const out: Record<string, string> = {};
  if (loc?.native) {
    for (const l of NATIVE_LOCALES) {
      const p = equivalentPath(l.cc, page);
      if (p) out[l.tag] = pathInLocale(p, l);
    }
    return out;
  }
  for (const cc of ALL_CODES) {
    const p = equivalentPath(cc, page);
    if (p) out[COUNTRIES[cc].hreflang] = p;
  }
  out["x-default"] = equivalentPath("us", page)!;
  return out;
}

/**
 * hreflang for a page that exists in one country only (a store, region, city, product, map or log page). English
 * pages carry none, as before. A native page names its country's other native versions (Switzerland's German and
 * French, Belgium's French and Dutch) when there is more than one; otherwise none.
 */
export function versionsOf(path: string): Record<string, string> {
  const seg = path.split(/[?#]/)[0].split("/")[1];
  const loc = localeFromSegment(seg);
  if (!loc?.native) return {};
  const natives = localesOf(loc.cc).filter((l) => l.native);
  if (natives.length < 2) return {};
  const en = englishPath(path);
  return Object.fromEntries(natives.map((l) => [l.tag, pathInLocale(en, l)]));
}

/** canonical (this version's own URL) + hreflang (versionsOf) for a page given in its English form. */
export function alternatesIn(path: string, loc: Locale, languages?: Record<string, string>): { canonical: string; languages?: Record<string, string> } {
  const own = pathInLocale(path, loc);
  const langs = languages ?? versionsOf(own);
  return Object.keys(langs).length ? { canonical: own, languages: langs } : { canonical: own };
}
