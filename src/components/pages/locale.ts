/**
 * The /[cc] segment of a country page: "jp" (its English tree) or "ja-jp" (a native version, docs/i18n.md §6).
 * Route files resolve it here, set it as the page's locale for the components, and hand it to the metadata.
 */
import { COUNTRIES, type Country } from "@/lib/apple/countries";
import { localeFromSegment, type Locale } from "@/lib/i18n/locales";
import { setPageLocale } from "@/lib/i18n/server";

export function routeCountry(seg: string): { c: Country; loc: Locale } | null {
  const loc = localeFromSegment(seg);
  return loc ? { c: COUNTRIES[loc.cc], loc } : null;
}
/** For the page itself: also makes `loc` the locale every server component reads. */
export function routeCountryForPage(seg: string): { c: Country; loc: Locale } | null {
  const r = routeCountry(seg);
  if (r) setPageLocale(r.loc);
  return r;
}
