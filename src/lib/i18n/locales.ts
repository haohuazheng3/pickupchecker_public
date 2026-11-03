/**
 * Language versions of the site (docs/i18n.md §6). Client-safe: no data imports.
 *
 * Every country keeps its English page tree (/{cc}/…, the US at the root). Countries whose people search in
 * another language also get that tree in their language under /{lang}-{cc}/… (same slugs): /ja-jp, /de-de, /fr-ca…
 * Public pages take their language from the URL. App pages (/account, /pricing, /install, /checkout/success)
 * follow the person: their saved language, else the `pc_lang` cookie (set when they open a native page or
 * switch), else English. Push, email and Stripe follow the saved language.
 */
import { COUNTRIES, type CountryCode } from "@/lib/apple/countries";

/** Dictionary languages. de-CH and fr-CA are regional forms of de and fr. */
export type Lang = "en" | "ja" | "ko" | "zh-TW" | "zh-HK" | "de" | "de-CH" | "fr" | "fr-CA" | "it" | "es" | "nl" | "sv" | "ar";
export const LANGS: readonly Lang[] = ["en", "ja", "ko", "zh-TW", "zh-HK", "de", "de-CH", "fr", "fr-CA", "it", "es", "nl", "sv", "ar"];

export interface Locale {
  /** URL segment: "ja-jp" for a native version, the country code ("jp") for its English one, "" for the US. */
  id: string;
  lang: Lang;
  cc: CountryCode;
  /** BCP 47: <html lang>, hreflang, Intl. */
  tag: string;
  /** A version in the country's own language (not the English page tree). */
  native: boolean;
}

/** Native versions, in the order the switch lists them. */
const N = (id: string, lang: Lang, cc: CountryCode, tag: string): Locale => ({ id, lang, cc, tag, native: true });
export const NATIVE_LOCALES: readonly Locale[] = [
  N("ja-jp", "ja", "jp", "ja-JP"),
  N("ko-kr", "ko", "kr", "ko-KR"),
  N("zh-tw", "zh-TW", "tw", "zh-TW"),
  N("zh-hk", "zh-HK", "hk", "zh-HK"),
  N("de-de", "de", "de", "de-DE"),
  N("de-at", "de", "at", "de-AT"),
  N("de-ch", "de-CH", "ch", "de-CH"),
  N("fr-ch", "fr", "ch", "fr-CH"),
  N("fr-fr", "fr", "fr", "fr-FR"),
  N("fr-be", "fr", "be", "fr-BE"),
  N("nl-be", "nl", "be", "nl-BE"),
  N("fr-ca", "fr-CA", "ca", "fr-CA"),
  N("it-it", "it", "it", "it-IT"),
  N("es-es", "es", "es", "es-ES"),
  N("nl-nl", "nl", "nl", "nl-NL"),
  N("sv-se", "sv", "se", "sv-SE"),
  N("ar-ae", "ar", "ae", "ar-AE"),
];
const BY_ID = new Map(NATIVE_LOCALES.map((l) => [l.id, l]));

/** The English page tree of a country (the US: no prefix). */
export function englishLocale(cc: CountryCode): Locale {
  return { id: cc === "us" ? "" : cc, lang: "en", cc, tag: COUNTRIES[cc].hreflang, native: false };
}
export const EN_US: Locale = englishLocale("us");

/** "ja-jp" → its native version. */
export function nativeLocale(id: string | undefined | null): Locale | undefined {
  return id ? BY_ID.get(id.toLowerCase()) : undefined;
}
/** The first URL segment of a country page tree → its locale: "jp" (English), "ja-jp" (native); never "us". */
export function localeFromSegment(seg: string | undefined): Locale | undefined {
  if (!seg) return undefined;
  const n = BY_ID.get(seg);
  if (n) return n;
  return seg !== "us" && Object.hasOwn(COUNTRIES, seg) ? englishLocale(seg as CountryCode) : undefined;
}
/** Every language a country's pages exist in: English first. */
export function localesOf(cc: CountryCode): Locale[] {
  return [englishLocale(cc), ...NATIVE_LOCALES.filter((l) => l.cc === cc)];
}
/** "" | "/jp" | "/ja-jp": prepend to a country-relative path ("/stores/…"). */
export function localePrefix(loc: Locale): string {
  return loc.id ? `/${loc.id}` : "";
}

/** de-CH reads de, fr-CA reads fr, zh-HK and zh-TW read each other: the language family. */
export function baseLang(lang: Lang): string {
  return lang === "de-CH" ? "de" : lang === "fr-CA" ? "fr" : lang.startsWith("zh") ? "zh" : lang;
}
/** The native version of country `cc` a reader of `lang` should get, if any (exact language first, then its family). */
export function nativeLocaleFor(cc: CountryCode, lang: Lang): Locale | undefined {
  if (lang === "en") return undefined;
  const of = NATIVE_LOCALES.filter((l) => l.cc === cc);
  return of.find((l) => l.lang === lang) ?? of.find((l) => baseLang(l.lang) === baseLang(lang));
}
/** The version of country `cc`'s pages for a reader of `lang`: native if it exists, else English. */
export function localeFor(cc: CountryCode, lang: Lang): Locale {
  return nativeLocaleFor(cc, lang) ?? englishLocale(cc);
}

/** Names of the languages in themselves, for the switch. */
export const LANG_NAMES: Record<Lang, string> = {
  en: "English", ja: "日本語", ko: "한국어", "zh-TW": "繁體中文（台灣）", "zh-HK": "繁體中文（香港）", de: "Deutsch", "de-CH": "Deutsch (Schweiz)",
  fr: "Français", "fr-CA": "Français (Canada)", it: "Italiano", es: "Español", nl: "Nederlands", sv: "Svenska", ar: "العربية",
};
/** Short label for a version in a list of one country's versions ("English", "日本語", "Deutsch", "Français"). */
export function versionLabel(loc: Locale): string {
  return LANG_NAMES[loc.lang].replace(/ \((Schweiz|Canada)\)$/, "");
}

/* ---------------------------------------------------------------- paths */

/** App routes: no language in the URL; they follow the person's language. */
export const APP_ROUTES: readonly string[] = ["/account", "/pricing", "/install", "/checkout"];
export function isAppPath(pathname: string): boolean {
  return APP_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/** Split "/jp/stores/x?y#z" into its path, the locale of its country tree (or undefined) and the rest. */
function splitTree(href: string): { loc: Locale; rest: string; tail: string } | undefined {
  if (!href.startsWith("/")) return undefined;
  const cut = href.search(/[?#]/);
  const path = cut < 0 ? href : href.slice(0, cut);
  const tail = cut < 0 ? "" : href.slice(cut);
  const seg = path.split("/")[1];
  const loc = localeFromSegment(seg);
  if (!loc) return undefined;
  return { loc, rest: path.slice(seg.length + 1), tail };
}

/**
 * An internal href written in its English form (what the page-tree helpers build: "/jp/stores/…", "/ca?model=duo#notify")
 * as a reader of `lang` should get it: the same page in their language where it exists. US pages, app pages and
 * every other path stay as they are. A path already in a native version stays.
 */
export function localizePath(href: string, lang: Lang): string {
  if (lang === "en") return href;
  const t = splitTree(href);
  if (!t || t.loc.native) return href;
  const n = nativeLocaleFor(t.loc.cc, lang);
  return n ? `/${n.id}${t.rest}${t.tail}` : href;
}
/** A native href back in its English form ("/ja-jp/stores/x" → "/jp/stores/x"). */
export function englishPath(href: string): string {
  const t = splitTree(href);
  if (!t || !t.loc.native) return href;
  const e = englishLocale(t.loc.cc);
  return `${localePrefix(e)}${t.rest}${t.tail}` || "/";
}
/** The same page in another version of its country ("/jp/stores/x" + ja-jp → "/ja-jp/stores/x"). */
export function pathInLocale(href: string, to: Locale): string {
  const en = englishPath(href);
  const t = splitTree(en);
  if (!t) return href;
  if (t.loc.cc !== to.cc) return href;
  return `${localePrefix(to)}${t.rest}${t.tail}` || "/";
}

/**
 * The language a page renders in: a native tree its own, an app page the person's (`appLang`), anything else English.
 * PendingLink compares it with the current page's language: crossing languages is a full page load, so the header,
 * footer and <html lang> (rendered once by the root layout) always match the page.
 */
export function langOfPath(href: string, appLang: Lang): Lang {
  if (!href.startsWith("/")) return "en";
  const path = href.split(/[?#]/)[0];
  if (isAppPath(path)) return appLang;
  const t = splitTree(path);
  return t?.loc.native ? t.loc.lang : "en";
}

/* ---------------------------------------------------------------- cookie / headers */

/** The person's language for app pages: a native locale id ("ja-jp") or "en". */
export const LANG_COOKIE = "pc_lang";
/** Request header the proxy sets on every page request: the locale id of the page (or "en" + country). */
export const LOCALE_HEADER = "x-pc-locale";
/** Request header with the person's language (cookie) for app pages and links into them. */
export const APP_LOCALE_HEADER = "x-pc-app-locale";

/** A cookie / saved value → the person's locale (a native one) or undefined for English. */
export function personLocale(v: string | undefined | null): Locale | undefined {
  return nativeLocale(v ?? undefined);
}
/** Where a person signs in: their language's home ("/ja-jp?signin=1"), English: the US home. */
export function signInHome(person: Locale | undefined): string {
  return person ? `/${person.id}` : "/";
}
