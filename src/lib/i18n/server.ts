/**
 * The page's locale for server components, request-scoped (React cache): a page sets it first thing, the
 * components it renders read it. Defaults to US English, so a page that never sets it renders as before.
 * Metadata and pure functions take the locale explicitly.
 */
import { cache } from "react";
import { headers, cookies } from "next/headers";
import { EN_US, LANG_COOKIE, LOCALE_HEADER, localeFromSegment, nativeLocale, type Locale } from "./locales";
import { dict, type Dict } from "./dict";

const box = cache((): { loc: Locale } => ({ loc: EN_US }));

export function setPageLocale(loc: Locale): void {
  box().loc = loc;
}
export function pageLocale(): Locale {
  return box().loc;
}
/** The page's dictionary. */
export function t(): Dict {
  return dict(box().loc.lang);
}

/** The locale the proxy resolved for this request (root layout: <html lang>, header, footer). */
export async function requestLocale(): Promise<Locale> {
  const v = (await headers()).get(LOCALE_HEADER) ?? "";
  if (!v || v === "en") return EN_US;
  return nativeLocale(v) ?? localeFromSegment(v) ?? EN_US;
}
/** API routes: the language the person is using now (cookie), "en" if none. */
export async function cookieLang(): Promise<import("./locales").Lang> {
  return nativeLocale((await cookies()).get(LANG_COOKIE)?.value)?.lang ?? "en";
}

/** The person's language for app pages (cookie): a native locale, or undefined for English. */
export async function personLocale(): Promise<Locale | undefined> {
  return nativeLocale((await cookies()).get(LANG_COOKIE)?.value);
}
