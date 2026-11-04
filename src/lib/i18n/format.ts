/**
 * Number, time, duration and plural formatting for a language (client-safe). English output is exactly what the
 * site has always printed (the English helpers stay the source for it); other languages use Intl plus a few
 * short unit tables, so durations read "75秒", "75 Sek.", "75 s".
 */
import { COUNTRIES, formatPrice, type Country, type CountryCode } from "@/lib/apple/countries";
import { baseLang, type Lang } from "./locales";

/** BCP 47 for Intl when only a language is known. */
export const LANG_TAG: Record<Lang, string> = {
  en: "en-US", ja: "ja-JP", ko: "ko-KR", "zh-TW": "zh-TW", "zh-HK": "zh-HK", de: "de-DE", "de-CH": "de-CH",
  fr: "fr-FR", "fr-CA": "fr-CA", it: "it-IT", es: "es-ES", nl: "nl-NL", sv: "sv-SE",
  // UAE Arabic with Western digits, as Apple and the UAE's shops write prices and times.
  ar: "ar-AE-u-nu-latn",
};

/** Italian and Spanish Intl leave four-digit numbers ungrouped ("2369 €"); Apple there writes "2.369 €". */
const GROUP_ALWAYS = new Set<Lang>(["it", "es"]);
const grouping = (lang: Lang): Intl.NumberFormatOptions => (GROUP_ALWAYS.has(lang) ? { useGrouping: "always" } as unknown as Intl.NumberFormatOptions : {});

export function num(lang: Lang, n: number): string {
  return lang === "en" ? n.toLocaleString("en-US") : new Intl.NumberFormat(LANG_TAG[lang], grouping(lang)).format(n);
}
/** 59 → "59%" ("59 %" in German and French). */
export function pct(lang: Lang, n: number): string {
  if (lang === "en") return `${n}%`;
  return new Intl.NumberFormat(LANG_TAG[lang], { style: "percent", maximumFractionDigits: 1 }).format(n / 100);
}

/** Plural forms of one phrase; languages without plurals give `other` only. */
export interface Forms { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string }
const rules = new Map<string, Intl.PluralRules>();
/** The form for n, with "#" replaced by the formatted number. */
export function plural(lang: Lang, n: number, f: Forms | string): string {
  if (typeof f === "string") return f.replace(/#/g, num(lang, n));
  const tag = LANG_TAG[lang];
  let r = rules.get(tag);
  if (!r) { r = new Intl.PluralRules(tag); rules.set(tag, r); }
  const k = r.select(n) as keyof Forms;
  return (f[k] ?? f.other).replace(/#/g, num(lang, n));
}

/**
 * A Latin name inside right-to-left text, isolated (FSI…PDI) so "18 Pro Max" keeps its order on the Arabic pages;
 * every other language gets the string untouched.
 */
export const bidi = (s: string, lang: Lang): string => (lang === "ar" ? `\u2068${s}\u2069` : s);

/** "{n} stores" → filled; unknown keys stay. */
export function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** Short duration units. */
const UNITS: Record<string, { s: string; m: string; h: string; d: string; sep: string; tight?: boolean }> = {
  en: { s: "s", m: "min", h: "h", d: "d", sep: " " },
  ja: { s: "秒", m: "分", h: "時間", d: "日", sep: "", tight: true },
  ko: { s: "초", m: "분", h: "시간", d: "일", sep: " ", tight: true },
  zh: { s: "秒", m: "分鐘", h: "小時", d: "天", sep: " " },
  de: { s: "Sek.", m: "Min.", h: "Std.", d: "Tg.", sep: " " },
  fr: { s: "s", m: "min", h: "h", d: "j", sep: " " },
  it: { s: "s", m: "min", h: "h", d: "g", sep: " " },
  es: { s: "s", m: "min", h: "h", d: "d", sep: " " },
  nl: { s: "sec", m: "min", h: "u", d: "d", sep: " " },
  sv: { s: "s", m: "min", h: "tim", d: "d", sep: " " },
  ar: { s: "ث", m: "د", h: "س", d: "ي", sep: " " },
};
const unitsOf = (lang: Lang) => UNITS[baseLang(lang)] ?? UNITS.en;
/** One amount + unit: "75 s", "75秒", "75 Sek.". */
export function unit(lang: Lang, n: number, u: "s" | "m" | "h" | "d"): string {
  const t = unitsOf(lang);
  return `${num(lang, n)}${t.tight ? "" : " "}${t[u]}`;
}
/** Seconds as the restock modules write them: "45 s", "2 min", "1 h 5 min". */
export function secs(lang: Lang, s: number): string {
  const t = unitsOf(lang);
  const r = Math.round(s);
  if (r < 60) return unit(lang, r, "s");
  const m = Math.round(r / 60);
  if (m < 60) return unit(lang, m, "m");
  const h = Math.floor(m / 60);
  return m % 60 ? `${unit(lang, h, "h")}${t.sep}${unit(lang, m % 60, "m")}` : unit(lang, h, "h");
}

/** "9 AM" / "9時" / "9 Uhr" / "9 h" for an hour-of-day bucket (English keeps its noon/midnight wording where asked). */
export function hour(lang: Lang, h: number, words = false): string {
  switch (baseLang(lang)) {
    case "en": return words && h === 0 ? "midnight" : words && h === 12 ? "noon" : `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;
    case "ja": return `${h}時`;
    case "ko": return `${h}시`;
    case "zh": return `${h < 6 ? "凌晨" : h < 12 ? "上午" : h === 12 ? "中午" : h < 18 ? "下午" : "晚上"} ${h % 12 === 0 ? 12 : h % 12} 點`;
    case "de": return `${h} Uhr`;
    case "fr": return `${h} h`;
    case "sv": return `kl. ${h}`;
    default: return `${h}:00`;
  }
}

const dtf = new Map<string, Intl.DateTimeFormat>();
function df(tag: string, o: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const k = `${tag}|${JSON.stringify(o)}`;
  let f = dtf.get(k);
  if (!f) { f = new Intl.DateTimeFormat(tag, o); dtf.set(k, f); }
  return f;
}
/** "Nov 2, 8:48 AM" / "11月2日 8:48" in a zone. */
export function stamp(lang: Lang, iso: string | Date, timeZone: string, zoneName = false): string {
  return df(LANG_TAG[lang], { timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit", ...(zoneName ? { timeZoneName: "short" } : {}) }).format(new Date(iso));
}
/** "8:48 AM" / "8:48" in a zone. */
export function clock(lang: Lang, iso: string | Date, timeZone: string): string {
  return df(LANG_TAG[lang], { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}
/** "Nov 2" / "11月2日". */
export function day(lang: Lang, iso: string | Date, timeZone: string): string {
  return df(LANG_TAG[lang], { timeZone, month: "short", day: "numeric" }).format(new Date(iso));
}
/** Weekday names, Sunday first, in the language. */
export function weekdays(lang: Lang, style: "long" | "short" = "long"): string[] {
  const f = df(LANG_TAG[lang], { weekday: style, timeZone: "UTC" });
  return Array.from({ length: 7 }, (_, i) => f.format(new Date(Date.UTC(2026, 10, 1 + i)))); // Nov 1, 2026 is a Sunday
}

/** "a, b and c" (Intl list), beyond `max`: the first `max` and "+N" in the language's words. */
export function list(lang: Lang, items: string[], max = 6, more?: (n: number) => string): string {
  if (items.length === 0) return "";
  const lf = new Intl.ListFormat(LANG_TAG[lang], { style: "long", type: "conjunction" });
  // Safari wraps each Arabic item in bidi isolates (U+2068…U+2069) and Node does not, which broke hydration:
  // the items go back in as given, only the joining words come from Intl.
  const out = (xs: string[]) => { let i = 0; return lf.formatToParts(xs).map((p) => (p.type === "element" ? xs[i++] : p.value)).join(""); };
  if (items.length <= max) return out(items);
  const rest = items.length - max;
  return out([...items.slice(0, max), more ? more(rest) : `+${rest}`]);
}

/** "7s ago" / "7秒前" / "vor 7 Sek." — the live "checked … ago" (seconds tick). */
const AGO: Record<string, { tpl: string; now: string; never: string }> = {
  en: { tpl: "{d} ago", now: "just now", never: "never" },
  ja: { tpl: "{d}前", now: "たった今", never: "まだありません" },
  ko: { tpl: "{d} 전", now: "방금", never: "없음" },
  zh: { tpl: "{d}前", now: "剛剛", never: "從未" },
  de: { tpl: "vor {d}", now: "gerade eben", never: "nie" },
  fr: { tpl: "il y a {d}", now: "à l’instant", never: "jamais" },
  it: { tpl: "{d} fa", now: "proprio ora", never: "mai" },
  es: { tpl: "hace {d}", now: "ahora mismo", never: "nunca" },
  nl: { tpl: "{d} geleden", now: "zojuist", never: "nooit" },
  sv: { tpl: "för {d} sedan", now: "nyss", never: "aldrig" },
  ar: { tpl: "منذ {d}", now: "الآن", never: "لم يحدث بعد" },
};
const agoOf = (lang: Lang) => AGO[baseLang(lang)] ?? AGO.en;
export function never(lang: Lang): string { return agoOf(lang).never; }
export function justNow(lang: Lang): string { return agoOf(lang).now; }
/** Elapsed seconds → "7 Sek." / "3 Min. 5 Sek." (the part inside "ago"). */
function elapsed(lang: Lang, s: number, fine: boolean): string {
  const t = unitsOf(lang);
  if (s < 60) return unit(lang, s, "s");
  if (fine && s < 600) return `${unit(lang, Math.floor(s / 60), "m")}${t.sep}${unit(lang, s % 60, "s")}`;
  if (s < 3600) return unit(lang, Math.floor(s / 60), "m");
  if (fine && s < 86400) return `${unit(lang, Math.floor(s / 3600), "h")}${t.sep}${unit(lang, Math.floor((s % 3600) / 60), "m")}`;
  if (s < 86400) return unit(lang, Math.floor(s / 3600), "h");
  return unit(lang, Math.floor(s / 86400), "d");
}
/** "checked … ago" that ticks (LiveAgo): never rounded to "just now". */
export function agoFine(lang: Lang, d: Date | string | null | undefined, now: number): string {
  if (!d) return never(lang);
  const s = Math.max(0, Math.round((now - new Date(d).getTime()) / 1000));
  if (lang === "en") {
    if (s < 60) return `${s}s ago`;
    if (s < 600) return `${Math.floor(s / 60)}m ${s % 60}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }
  return agoOf(lang).tpl.replace("{d}", elapsed(lang, s, true));
}
/** "3m ago", "just now" under 15 s (timeAgo). */
export function ago(lang: Lang, d: Date | string | null | undefined, now = Date.now()): string {
  if (!d) return never(lang);
  const s = Math.max(0, Math.round((now - new Date(d).getTime()) / 1000));
  if (s < 15) return justNow(lang);
  if (lang === "en") {
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }
  return agoOf(lang).tpl.replace("{d}", elapsed(lang, s, false));
}

/* ---------------------------------------------------------------- money and distance */

/** A price in the store country's currency, written for a reader of `lang` (English: the site's own C$ / A$ forms). */
export function price(lang: Lang, c: Country, amount: number): string {
  if (lang === "en") return formatPrice(c, amount);
  const whole = Number.isInteger(amount);
  const s = new Intl.NumberFormat(LANG_TAG[lang], { style: "currency", currency: c.currency, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2, ...grouping(lang) }).format(amount);
  // Taiwan's dollar reads "$" in zh-TW: NT$ as Taiwan writes it.
  return c.currency === "TWD" ? s.replace(/^(-?)\$/, "$1NT$") : s;
}
/** Road distance: English pages and dashboards keep the store country's unit (mi in the US and UK), every other language km. */
export function distance(lang: Lang, cc: CountryCode, miles: number): string {
  if (lang === "en") return COUNTRIES[cc].unit === "mi" ? `${Math.round(miles)} mi` : `${Math.round(miles * 1.609344)} km`;
  return `${num(lang, Math.round(miles * 1.609344))} ${lang === "ar" ? "كم" : "km"}`;
}

/** Titles: CJK characters take about twice a Latin letter's width in a result line. */
export function titleWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += /[ᄀ-ᇿ⺀-鿿가-힯豈-﫿＀-￯]/.test(ch) ? 2 : 1;
  return w;
}
/** The first variant that fits (width-aware), else the last one cut with "…". */
export function fitTitleW(variants: string[], max = 60): string {
  for (const v of variants) if (titleWidth(v) <= max) return v;
  let out = "";
  for (const ch of variants[variants.length - 1] ?? "") { if (titleWidth(out + ch) > max - 1) break; out += ch; }
  return `${out.trimEnd()}…`;
}
