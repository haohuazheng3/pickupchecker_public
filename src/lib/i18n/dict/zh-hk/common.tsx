/**
 * 繁體中文（香港）server strings: common, plus the small helpers every zh-HK module shares (names, numbers, hours,
 * dates, tax words). Hong Kong usage: 香港書面語, 現貨 / 有貨, 補貨, 售罄, 取貨 (Apple's checkout step: 提取),
 * 價錢, 分店, 間 for stores, 款 for configurations, full-width punctuation.
 */
import type { Dict } from "../en";
import { COUNTRIES, type Country, type CountryCode } from "@/lib/apple/countries";
import type { Store } from "@/lib/apple/catalog";
import { includedRate, taxName } from "@/content/country-tax";
import { addressLabel, appleStoreLabel, cityLabel, colorLabel, countryLabel, regionLabel, storeLabel } from "@/lib/i18n/places";
import { storesOf } from "@/lib/apple/catalog";
import { fitTitleW, num, stamp } from "@/lib/i18n/format";
import type { Lang } from "@/lib/i18n/locales";

export const common: Dict["common"] = {};

/** The language of every helper below. */
export const L: Lang = "zh-HK";

/** A number as these pages write it ("1,234"). */
export const n = (x: number): string => num(L, x);

/** A share 0–100 as "59%". */
export const pc = (x: number): string => `${Math.round(x)}%`;

/** Country names as Hong Kong writes them (Intl's zh-HK says 中國香港特別行政區 for Hong Kong itself). */
const COUNTRY: Partial<Record<CountryCode, string>> = { hk: "香港", us: "美國", uk: "英國", ae: "阿聯酋", kr: "南韓", tw: "台灣" };
export function cn(cc: CountryCode): string {
  return COUNTRY[cc] ?? countryLabel(cc, L);
}
export const cnOf = (c: Country): string => cn(c.cc);

/** A place name as it arrives (English data, Intl's country name or already Chinese) → the name Hong Kong reads. */
export function zhPlace(cc: CountryCode, name: string, kind: "region" | "city" = "region"): string {
  const c = COUNTRIES[cc];
  if (!name) return cn(cc);
  if (name === countryLabel(cc, L) || name === c.name || name === c.short || /^the /i.test(name)) return cn(cc);
  const a = kind === "region" ? regionLabel(cc, name, L) : cityLabel(cc, name, L);
  if (a !== name) return a;
  return kind === "region" ? cityLabel(cc, name, L) : regionLabel(cc, name, L);
}

/** "Apple Canton Road（廣東道）" and "Canton Road（廣東道）". */
export const apple = (s: Pick<Store, "storeNumber" | "name">): string => appleStoreLabel(s, L);
export const shop = (s: Pick<Store, "storeNumber" | "name">): string => storeLabel(s, L);
export const city = (s: Pick<Store, "city" | "country">): string => cityLabel(s.country ?? "us", s.city, L);

/** Apple's colour names inside an English configuration or product name ("256GB Night Sky" → "256GB 夜空色"). */
const COLORS = ["Night Sky", "Star White", "Burgundy", "Glacier", "Silver", "Black"];
export function zhCfg(s: string): string {
  return COLORS.reduce((acc, c) => acc.replace(new RegExp(`\\b${c}\\b`, "g"), colorLabel(c, L)), s);
}

/** Hours: "上午 9 點", "中午 12 點", "午夜 12 點"; a window: "上午 9–11 點", "上午 11 點至下午 1 點". */
const half = (h: number): string => (h === 0 ? "午夜" : h === 12 ? "中午" : h < 12 ? "上午" : "下午");
const h12 = (h: number): number => (h % 12 === 0 ? 12 : h % 12);
export const hr = (h: number): string => `${half(h % 24)} ${h12(h % 24)} 點`;
export function rng(from: number, to: number): string {
  const a = from % 24, b = to % 24;
  return half(a) === half(b) && b > a ? `${half(a)} ${h12(a)}–${h12(b)} 點` : `${hr(a)}至${hr(b)}`;
}
/** An English hour label ("9 AM", "noon", "midnight") → the Chinese one; anything else as it is. */
export function hrFromEn(s: string): string {
  if (s === "noon") return hr(12);
  if (s === "midnight") return hr(0);
  const m = s.match(/^(\d{1,2}) ?(AM|PM)$/);
  if (!m) return s;
  const h = Number(m[1]) % 12 + (m[2] === "PM" ? 12 : 0);
  return hr(h);
}
const WEEK_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEK = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
/** "Monday" → "星期一"; anything else as it is. */
export const dayFromEn = (s: string): string => (WEEK_EN.includes(s) ? WEEK[WEEK_EN.indexOf(s)] : s);

/** A calendar day (YYYY-MM-DD): "10月29日（星期四）" or "10月29日". */
export function ymd(d: string, weekday = true): string {
  const t = new Date(`${d}T12:00:00Z`);
  return `${t.getUTCMonth() + 1}月${t.getUTCDate()}日${weekday ? `（${WEEK[t.getUTCDay()]}）` : ""}`;
}
/** "2026年10月29日". */
export function longYmd(d: string): string {
  const t = new Date(`${d}T12:00:00Z`);
  return `${t.getUTCFullYear()}年${t.getUTCMonth() + 1}月${t.getUTCDate()}日`;
}
/** An instant in a country's reference zone, with the zone: "11月2日 下午3:04（香港時間）". */
export function zoneStampZh(iso: string | Date, cc: CountryCode): string {
  return `${stamp(L, iso, COUNTRIES[cc].timeZone)}（${cc === "hk" ? "香港時間" : "當地時間"}）`;
}

/** The tax inside a price, in Chinese. */
export function taxNameZh(c: Country): string {
  const t = taxName(c);
  return t === "VAT" ? "增值稅" : t === "GST" ? "商品及服務稅" : t === "consumption tax" ? "消費稅" : "銷售稅";
}
/** One phrase after a price: "香港不設銷售稅", "已含 20% 增值稅", "未連 GST/HST 及省銷售稅". */
export function taxNoteZh(c: Country): string {
  if (c.cc === "hk") return "香港不設銷售稅";
  if (c.cc === "us") return "未連銷售稅（各州稅率不同）";
  if (c.cc === "ca") return "未連 GST/HST 及省銷售稅";
  const r = includedRate(c);
  return r == null ? "已含稅" : `已含 ${r}% ${taxNameZh(c)}`;
}

/** What a country's stores are grouped by (countries.ts regionNoun) in Chinese. */
export const REGION_NOUN: Record<string, string> = {
  state: "州", province: "省", area: "地區", department: "省", prefecture: "縣", emirate: "酋長國", canton: "州", county: "郡", region: "大區", city: "縣市",
};
export const rn = (c: Country): string => REGION_NOUN[c.regionNoun ?? "area"] ?? "地區";
/** Hong Kong's stores sit in districts (銅鑼灣, 尖沙咀…); elsewhere cities. */
export const cityNoun = (cc: CountryCode): string => (cc === "hk" ? "地區" : "城市");

/** Apple's store page in Chinese where Apple has one (Hong Kong: /hk/retail/… instead of /hk/en/retail/…). */
export const zhAppleUrl = (url: string): string => url.replace("://www.apple.com/hk/en/", "://www.apple.com/hk/");

/** The check cadence, as every label states it (CHECK_NOTE): only 15 s and 5 s. */
export const CHECK = "每 15 秒檢查，有提醒的分店每 5 秒";

/** How Hong Kong says each store ("Apple Store 廣東道"), by Apple's English name. */
export const HK_SAY: Record<string, string> = {
  "Canton Road": "廣東道", "ifc mall": "ifc mall", "Festival Walk": "又一城", "apm Hong Kong": "apm", "New Town Plaza": "新城市廣場", "Causeway Bay": "銅鑼灣",
};

/** Currency names in Chinese ("港幣"); others keep the code. */
export const CURRENCY: Record<string, string> = { HKD: "港幣", TWD: "新台幣", JPY: "日圓", USD: "美元", EUR: "歐元", GBP: "英鎊", CAD: "加元", AUD: "澳元", SGD: "新加坡元", CHF: "瑞士法郎", KRW: "韓圓", SEK: "瑞典克朗", AED: "迪拉姆" };

/** An address as the shared helper writes it, tidied for Hong Kong ("…, 尖沙咀, 香港"). */
export const tidyAddress = (a: string): string => a.replace(/中國香港特別行政區/g, "香港").replace(/, /g, "，");
/** Hong Kong's 8-digit numbers read "3979 8800". */
export const tidyPhone = (p: string): string => (/^\d{8}$/.test(p) ? `${p.slice(0, 4)} ${p.slice(4)}` : p);

/** Intl's formal names for Hong Kong and Macau → the everyday ones. */
export const cleanCountry = (s: string): string => s.replace(/中國香港特別行政區/g, "香港").replace(/中國澳門特別行政區/g, "澳門");

/* ------------------------------------------------------------------ spacing between Chinese and Latin words */

const CJK = "\\u3400-\\u4dbf\\u4e00-\\u9fff";
const CJK_LATIN = new RegExp(`([${CJK}])([A-Za-z])`, "g");
const LATIN_CJK = new RegExp(`([A-Za-z%])([${CJK}])`, "g");
/** One space between a Chinese character and a Latin word ("Apple Store 的", "及 Apple ifc mall"); digits and full-width punctuation are left alone. */
export const pan = (s: string): string => s.replace(CJK_LATIN, "$1 $2").replace(LATIN_CJK, "$1 $2").replace(/([）」，。：；、])[ \u00a0]+/g, "$1");
/** Titles: spaced first, then measured (CJK counts double). */
export const fitW = (variants: string[], max = 60): string => fitTitleW(variants.map(pan), max);

function spaced(v: unknown): unknown {
  if (typeof v === "string") return pan(v);
  if (Array.isArray(v)) return v.map(spaced);
  if (v && typeof v === "object" && !("$$typeof" in v) && Object.getPrototypeOf(v) === Object.prototype) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, spaced(x)]));
  return v;
}
/**
 * The whole dictionary with that spacing applied to every string it holds or returns (names arrive as "Apple …",
 * lists join with 及): strings, arrays and plain objects; React elements and other objects are left as they are.
 */
export function panDict<T>(d: T): T {
  if (typeof d === "function") return ((...a: unknown[]) => spaced((d as (...x: unknown[]) => unknown)(...a))) as T;
  if (typeof d === "string") return pan(d) as T;
  if (Array.isArray(d)) return d.map((x) => panDict(x)) as T;
  if (d && typeof d === "object" && !("$$typeof" in d) && Object.getPrototypeOf(d) === Object.prototype) return Object.fromEntries(Object.entries(d).map(([k, x]) => [k, panDict(x)])) as T;
  return d;
}

/** Hong Kong store titles: the name people search ("apple 廣東道", "apple ifc", "apple apm", "apple 又一城", "apple store 沙田", "apple 銅鑼灣") and where it is. */
export const HK_TITLE: Record<string, [string, string]> = {
  R499: ["Apple 廣東道", "尖沙咀"],
  R428: ["Apple ifc mall", "中環"],
  R485: ["Apple 又一城", "九龍塘"],
  R673: ["Apple apm Hong Kong", "觀塘"],
  R610: ["Apple 新城市廣場", "沙田"],
  R409: ["Apple 銅鑼灣", "希慎廣場"],
};
/** "Apple 廣東道（尖沙咀）" for a Hong Kong store, else Apple's name in Chinese. */
export const storeHead = (s: Pick<Store, "storeNumber" | "name">): string => {
  const t = HK_TITLE[s.storeNumber];
  return t ? `${t[0]}（${t[1]}）` : apple(s);
};

/** Apple's Chinese address of a Hong Kong store named "Apple Canton Road（廣東道）" (the name pages hand over), if any. */
export function addressOfName(name: string): string | undefined {
  const s = storesOf("hk").find((x) => apple(x) === name);
  return s ? addressLabel(s, L) : undefined;
}
