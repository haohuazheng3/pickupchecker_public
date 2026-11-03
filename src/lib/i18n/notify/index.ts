/** Notification texts by language (a language without its own reads English). Poller-safe: no React, no data. */
import type { Lang } from "../locales";
import { nativeLocale } from "../locales";
import { notifyEn, type NotifyText } from "./en";
import { notifyJa } from "./ja";
import { notifyKo } from "./ko";
import { notifyZhTW } from "./zh-tw";
import { notifyZhHK } from "./zh-hk";
import { notifyDe } from "./de";
import { notifyFr } from "./fr";
import { notifyIt } from "./it";
import { notifyEs } from "./es";
import { notifyNl } from "./nl";
import { notifySv } from "./sv";

const ss = (s: string) => s.replace(/ß/g, "ss");
/** Swiss German: German with ss for ß (strings and the strings functions return). */
function swissText(t: NotifyText): NotifyText {
  const map = (v: unknown): unknown => typeof v === "string" ? ss(v) : typeof v === "function" ? (...a: unknown[]) => map((v as (...x: unknown[]) => unknown)(...a)) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, map(x)])) : v;
  return map(t) as NotifyText;
}

const BY: Partial<Record<Lang, NotifyText>> = {
  ja: notifyJa,
  ko: notifyKo,
  "zh-TW": notifyZhTW,
  "zh-HK": notifyZhHK,
  de: notifyDe,
  fr: notifyFr,
  it: notifyIt,
  es: notifyEs,
  nl: notifyNl,
  sv: notifySv,
  "de-CH": swissText(notifyDe),
  "fr-CA": notifyFr
};

export function notifyText(lang: Lang): NotifyText {
  return BY[lang] ?? notifyEn;
}
/** users.locale ("ja-jp" | null) → the language alerts go out in. */
export function langOfUser(locale: string | null | undefined): Lang {
  return nativeLocale(locale ?? undefined)?.lang ?? "en";
}
export type { NotifyText };
