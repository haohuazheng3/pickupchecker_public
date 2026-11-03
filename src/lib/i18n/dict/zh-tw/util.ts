/**
 * 台灣中文版（zh-TW）共用的小工具：語言常數、台灣說法的鐘點與日期、中英混排的空格、國名與地區名。
 * 只給 dict/zh-tw 內的檔案用；不放任何文案句子。
 */
import { COUNTRIES, type Country, type CountryCode } from "@/lib/apple/countries";
import { includedRate } from "@/content/country-tax";
import type { Lang } from "../../locales";
import { num } from "../../format";
import { colorLabel, countryLabel } from "../../places";

export const L: Lang = "zh-TW";

/** 數字（千分位）。 */
export const n = (x: number): string => num(L, x);

/** 國名（台灣、日本、美國…）。 */
export const cn = (cc: CountryCode): string => (cc === "hk" ? "香港" : countryLabel(cc, L));

/**
 * 中英混排的空格：中文字與英文字母、數字、$ 相鄰時補一個半形空格（台灣科技網站與 Apple 台灣官網的寫法）。
 * 不動全形標點、括號、連結語法；`**粗體**` 邊界也照樣補。
 */
const CJK = "⺀-⿿぀-ヺー-ヿ㐀-䶿一-鿿豈-﫿";
const A = new RegExp(`([${CJK}])((?:\\*\\*)?)([A-Za-z0-9$#@&+])`, "g");
const B = new RegExp(`([A-Za-z0-9%$])((?:\\*\\*)?)([${CJK}])`, "g");
export function zs(s: string): string {
  return s.replace(A, "$1 $2$3").replace(B, "$1$2 $3");
}

/** 一天中的時段：凌晨／上午／中午／下午／晚上。 */
function period(h: number): string {
  return h < 6 ? "凌晨" : h < 12 ? "上午" : h === 12 ? "中午" : h < 18 ? "下午" : "晚上";
}
/** 「上午 9 點」「中午 12 點」「晚上 8 點」「午夜 12 點」。 */
export function hh(h: number): string {
  const x = ((h % 24) + 24) % 24;
  if (x === 0) return "午夜 12 點";
  return `${period(x)} ${x % 12 === 0 ? 12 : x % 12} 點`;
}
/** 時段區間 [from, to)：「上午 9–11 點」，跨時段時「上午 11 點–下午 1 點」。 */
export function hrange(from: number, to: number): string {
  const a = ((from % 24) + 24) % 24, b = ((to % 24) + 24) % 24;
  const pa = a === 0 ? "午夜" : period(a), pb = b === 0 ? "午夜" : period(b);
  const na = a % 12 === 0 ? 12 : a % 12, nb = b % 12 === 0 ? 12 : b % 12;
  return pa === pb && a !== 0 ? `${pa} ${na}–${nb} 點` : `${hh(a)}–${hh(b)}`;
}

/** 在某時區的年月日時分（24 小時制）。 */
function partsIn(iso: string | Date, tz: string) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const g = (t: Intl.DateTimeFormatPart["type"]) => Number(p.find((x) => x.type === t)?.value ?? 0);
  return { y: g("year"), m: g("month"), d: g("day"), h: g("hour") % 24, min: g("minute") };
}
/** 「上午 10:31」「晚上 8:05」。 */
export function clockZh(iso: string | Date, tz: string): string {
  const t = partsIn(iso, tz);
  return `${period(t.h)} ${t.h % 12 === 0 ? 12 : t.h % 12}:${String(t.min).padStart(2, "0")}`;
}
/** 「11 月 3 日 上午 10:31」（門市或國家的時區）。 */
export function stampZh(iso: string | Date, tz: string): string {
  const t = partsIn(iso, tz);
  return `${t.m} 月 ${t.d} 日 ${clockZh(iso, tz)}`;
}
/** 時區的中文全名（「台北標準時間」）。 */
export function zoneName(tz: string, iso: string | Date = new Date()): string {
  const p = new Intl.DateTimeFormat(L, { timeZone: tz, timeZoneName: "long" }).formatToParts(new Date(iso));
  return p.find((x) => x.type === "timeZoneName")?.value ?? tz;
}

const WD = ["日", "一", "二", "三", "四", "五", "六"];
/** 0 = 星期日。 */
export const weekdayZh = (d: number): string => `星期${WD[((d % 7) + 7) % 7]}`;
/** 日曆日（YYYY-MM-DD）：「11 月 3 日（週二）」或「11 月 3 日」。 */
export function ymdZh(ymd: string, weekday = true): string {
  const [, m, d] = ymd.split("-").map(Number);
  const w = new Date(`${ymd}T12:00:00Z`).getUTCDay();
  return `${m} 月 ${d} 日${weekday ? `（週${WD[w]}）` : ""}`;
}
/** 「2026 年 11 月 2 日」。 */
export function longYmdZh(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${y} 年 ${m} 月 ${d} 日`;
}

/** 英文規格名裡的顏色換成 Apple 台灣的寫法：「iPhone Duo 512GB Night Sky」→「iPhone Duo 512GB 夜空色」。 */
export function zhCfg(s: string): string {
  return s.replace(/Night Sky|Star White|Black|Burgundy|Glacier|Silver/g, (m) => colorLabel(m, L));
}

/** 各國門市所在層級的中文說法（Taiwan = 縣市）。 */
const REGION: Record<string, string> = {
  state: "州", province: "省", area: "地區", department: "省", prefecture: "都道府縣", emirate: "酋長國",
  canton: "州", region: "大區", county: "省", city: "縣市",
};
export function regionZh(c: Country | CountryCode): string {
  const k = (typeof c === "string" ? COUNTRIES[c] : c).regionNoun;
  return k ? REGION[k] ?? "地區" : "地區";
}
export const REGION_NOUNS = REGION;

/** 價格裡含的稅：「含 5% 營業稅」；香港：「香港不收銷售稅」；美國、加拿大：「未稅」。 */
export function taxName(cc: CountryCode): string {
  switch (cc) {
    case "tw": return "營業稅";
    case "jp": return "消費稅";
    case "au": case "sg": return "商品及服務稅（GST）";
    default: return "加值稅";
  }
}
export function taxNoteZh(c: Country): string {
  const r = includedRate(c);
  if (c.cc === "hk") return "香港不收銷售稅";
  if (r == null) return "未稅";
  return `含 ${r}% ${taxName(c.cc)}`;
}

/** 幣別的中文說法（新台幣…），其他維持代碼。 */
export function currencyZh(c: Country): string {
  const m: Record<string, string> = { TWD: "新台幣", USD: "美元", HKD: "港幣", JPY: "日圓", KRW: "韓元", EUR: "歐元", GBP: "英鎊", CAD: "加幣", AUD: "澳幣", SGD: "新加坡幣", CHF: "瑞士法郎", SEK: "瑞典克朗", AED: "阿聯酋迪拉姆" };
  return m[c.currency] ?? c.currency;
}

/** 「兩家」「3 家」：只有兩家時用國字，讀起來自然。 */
export const nStores = (k: number): string => (k === 2 ? "兩家" : `${n(k)} 家`);
