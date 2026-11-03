/**
 * العربية (الإمارات): أدوات مشتركة لنصوص الخادم — أسماء الدول كما يقولها الناس («الإمارات» لا الاسم الرسمي الطويل)،
 * صيغ العدد العربية (مفرد، مثنى، 3–10، 11–99، 100+)، «متاجر Apple الخمسة»، اسم الضريبة، أسماء الإمارات والمدن،
 * وعناوين متاجر الإمارات بالعربية. الأرقام غربية دائمًا (ar-AE-u-nu-latn).
 */
import type { Country, CountryCode } from "@/lib/apple/countries";
import { includedRate, taxName } from "@/content/country-tax";
import { num, plural, type Forms } from "@/lib/i18n/format";
import { cityLabel, countryLabel, regionLabel } from "@/lib/i18n/places";

export const L = "ar" as const;
export const N = (n: number): string => num(L, n);

/** One noun's count forms; zero reads like 3–10 ("0 متاجر"). "#" = the number. */
export const forms = (f: { one: string; two: string; few: string; many: string; other: string; zero?: string }): Forms => ({ zero: f.zero ?? f.few, ...f });
export const count = (n: number, f: Forms): string => plural(L, n, f);

export const STORES = forms({ one: "متجر واحد", two: "متجران", few: "# متاجر", many: "# متجرًا", other: "# متجر" });
/** After a preposition or as an object ("في متجرين"). */
export const STORES_G = forms({ one: "متجر واحد", two: "متجرين", few: "# متاجر", many: "# متجرًا", other: "# متجر" });
export const TIMES = forms({ one: "مرة واحدة", two: "مرتين", few: "# مرات", many: "# مرة", other: "# مرة" });
export const DAYS = forms({ one: "يوم واحد", two: "يومين", few: "# أيام", many: "# يومًا", other: "# يوم" });
export const CONFIGS = forms({ one: "خيار واحد", two: "خياران", few: "# خيارات", many: "# خيارًا", other: "# خيار" });
export const CITIES = forms({ one: "مدينة واحدة", two: "مدينتان", few: "# مدن", many: "# مدينة", other: "# مدينة" });
export const SECONDS = forms({ one: "ثانية واحدة", two: "ثانيتين", few: "# ثوانٍ", many: "# ثانية", other: "# ثانية" });
export const MINUTES = forms({ one: "دقيقة واحدة", two: "دقيقتين", few: "# دقائق", many: "# دقيقة", other: "# دقيقة" });
export const HOURS = forms({ one: "ساعة واحدة", two: "ساعتين", few: "# ساعات", many: "# ساعة", other: "# ساعة" });

/** A number that arrives already formatted ("1,234") back to a number, to pick its noun form. */
export const parseN = (s: string): number => Number(String(s).replace(/[^\d.]/g, "")) || 0;

/** "30 يومًا" / "7 أيام" for a days string that arrives formatted. */
export const daysOf = (days: string): string => count(parseN(days), DAYS);

/** A duration in words, as the place pages write it: "أقل من دقيقة", "5 دقائق", "ساعتين و15 دقيقة". */
export function durAr(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return "أقل من دقيقة";
  const m = Math.floor(s / 60);
  if (m < 60) return count(m, MINUTES);
  const h = Math.floor(m / 60);
  return m % 60 ? `${count(h, HOURS)} و${count(m % 60, MINUTES)}` : count(h, HOURS);
}

/* ---------------------------------------------------------------- countries */

/** What people call a country ("الإمارات", not "الإمارات العربية المتحدة"). */
const SHORT: Partial<Record<CountryCode, string>> = { ae: "الإمارات", us: "الولايات المتحدة", uk: "المملكة المتحدة", kr: "كوريا الجنوبية" };
export const country = (cc: CountryCode): string => SHORT[cc] ?? countryLabel(cc, L);
/** "في الإمارات". */
export const inCountry = (cc: CountryCode): string => `في ${country(cc)}`;
/** "بالإمارات" after a phrase that already has «في» ("متاجر Apple بالإمارات"); names without «ال» keep «في». */
export const biCountry = (cc: CountryCode): string => { const n = country(cc); return n.startsWith("ال") ? `ب${n}` : `في ${n}`; };

/** Number words for "the five stores" (masculine noun متجر). */
const WORDS = ["", "", "", "الثلاثة", "الأربعة", "الخمسة", "الستة", "السبعة", "الثمانية", "التسعة", "العشرة"];
/** "متاجر Apple الخمسة" / "متجر Apple الوحيد" / "متجرا Apple" / "متاجر Apple الـ39". */
export function theStores(n: number): string {
  if (n === 1) return "متجر Apple الوحيد";
  if (n === 2) return "متجرا Apple";
  if (n <= 10) return `متاجر Apple ${WORDS[n]}`;
  return `متاجر Apple الـ${N(n)}`;
}
/** The same in a genitive / object slot ("في متجري Apple"). */
export function theStoresG(n: number): string {
  return n === 2 ? "متجري Apple" : theStores(n);
}

/* ---------------------------------------------------------------- regions, cities, tax */

/** A country's word for its regions: singular, plural, dual. */
const NOUN: Record<string, { one: string; other: string; two: string }> = {
  state: { one: "ولاية", other: "ولايات", two: "ولايتين" },
  province: { one: "مقاطعة", other: "مقاطعات", two: "مقاطعتين" },
  area: { one: "منطقة", other: "مناطق", two: "منطقتين" },
  department: { one: "مقاطعة", other: "مقاطعات", two: "مقاطعتين" },
  prefecture: { one: "محافظة", other: "محافظات", two: "محافظتين" },
  emirate: { one: "إمارة", other: "إمارات", two: "إمارتين" },
  canton: { one: "كانتون", other: "كانتونات", two: "كانتونين" },
  region: { one: "منطقة", other: "مناطق", two: "منطقتين" },
  county: { one: "مقاطعة", other: "مقاطعات", two: "مقاطعتين" },
  city: { one: "مدينة", other: "مدن", two: "مدينتين" },
};
export const regionNoun = (c: Pick<Country, "regionNoun">, plural = false): string => { const w = NOUN[c.regionNoun ?? "area"] ?? NOUN.area; return plural ? w.other : w.one; };
/** "في إمارتين" / "في 6 مقاطعات" / "في 11 مقاطعة". */
export const regionsCount = (c: Pick<Country, "regionNoun">, n: number): string => {
  const w = NOUN[c.regionNoun ?? "area"] ?? NOUN.area;
  return n === 1 ? `${w.one} واحدة` : n === 2 ? w.two : n <= 10 ? `${N(n)} ${w.other}` : `${N(n)} ${w.one}`;
};
export const NOUNS = NOUN;

export const cityAr = (cc: CountryCode, city: string): string => cityLabel(cc, city, L);
export const regionAr = (cc: CountryCode, region: string): string => regionLabel(cc, region, L);

/** The tax inside Apple's price, in Arabic. */
export function taxAr(c: Country): string {
  const t = taxName(c);
  return t === "VAT" ? "ضريبة القيمة المضافة" : t === "GST" ? "ضريبة السلع والخدمات" : t === "consumption tax" ? "ضريبة الاستهلاك" : "ضريبة المبيعات";
}
/** "شامل ضريبة القيمة المضافة 5%" / "قبل الضريبة" (Canada) / "بلا ضريبة مبيعات" (Hong Kong). */
export function taxNoteAr(c: Country): string {
  if (c.cc === "us") return "قبل الضريبة (تختلف حسب الولاية)";
  if (c.cc === "ca") return "قبل الضريبة";
  const r = includedRate(c);
  return r == null ? "بلا ضريبة مبيعات" : `شامل ${taxAr(c)} ${r}%`;
}

/* ---------------------------------------------------------------- the UAE's stores in Arabic */

/** Apple's English street lines for the UAE stores, as an Arabic reader writes them. */
const STREET: Record<string, string> = {
  "The Dubai Mall Downtown": "دبي مول، وسط مدينة دبي",
  "Mall of the Emirates Al Barsha 1": "مول الإمارات، البرشاء 1",
  "Yas Mall Yas Island": "ياس مول، جزيرة ياس",
  "The Galleria Al Maryah Island": "ذا غاليريا، جزيرة الماريه",
  "Al Jimi Mall Hamdan Bin Mohammed Street": "الجيمي مول، شارع حمدان بن محمد",
};
/** An English address line with the UAE street in Arabic (anything else stays as Apple writes it). */
export function streetAr(s: string): string {
  let out = s;
  for (const [en, ar] of Object.entries(STREET)) out = out.split(en).join(ar);
  return out.replace(/, /g, "، ");
}

/** The searched form of a store's name in titles: "ابل دبي مول" (people type «ابل», not «Apple»). */
export const searchedStore = (name: string): string => name.replace(/^apple\s*/i, "ابل ");


/** "للإمارات" / "لـكندا": «لـ» before a country name. */
export const liCountry = (cc: CountryCode): string => { const n = country(cc); return n.startsWith("ال") ? `لل${n.slice(2)}` : `لـ${n}`; };
/** "Apple دبي مول" from "دبي مول" (a name already starting with Apple stays). */
export const apple = (name: string): string => (/^apple\b/i.test(name) ? name : `Apple ${name}`);
/** The currency in words where Arabic readers say it. */
export const currencyAr = (code: string): string => ({ AED: "الدرهم الإماراتي", USD: "الدولار الأمريكي", EUR: "اليورو", GBP: "الجنيه الإسترليني", JPY: "الين الياباني" } as Record<string, string>)[code] ?? code;
export const SELLOUTS = forms({ one: "حالة نفاد واحدة", two: "حالتي نفاد", few: "# حالات نفاد", many: "# حالة نفاد", other: "# حالة نفاد" });
/** "المتجرين" / "المتاجر الخمسة" / "المتاجر الـ39": a place's stores, all of them. */
export function allWord(n: number): string {
  if (n === 1) return "المتجر";
  if (n === 2) return "المتجرين";
  if (n <= 10) return `المتاجر ${WORDS[n]}`;
  return `المتاجر الـ${N(n)}`;
}
export const APPLE_STORES = forms({ one: "متجر Apple واحد", two: "متجرا Apple", few: "# متاجر Apple", many: "# متجرًا لـApple", other: "# متجر Apple" });
export const CITIES_G = forms({ one: "مدينة واحدة", two: "مدينتين", few: "# مدن", many: "# مدينة", other: "# مدينة" });
/** How people type the model names in Arabic searches (titles only). */
export const SEARCHED_MODEL: Record<string, string> = { duo: "ايفون دو", "18-pro": "ايفون 18 برو", "18-pro-max": "ايفون 18 برو ماكس" };
export const ALERTS = forms({ one: "تنبيه واحد", two: "تنبيهان", few: "# تنبيهات", many: "# تنبيهًا", other: "# تنبيه" });
export const ALERTS_G = forms({ one: "تنبيه واحد", two: "تنبيهين", few: "# تنبيهات", many: "# تنبيهًا", other: "# تنبيه" });
/** The street line without the store's own name at its start ("دبي مول، وسط مدينة دبي" for Apple دبي مول → "وسط مدينة دبي"). */
export function streetWithout(street: string, place: string): string {
  const s = streetAr(street);
  const name = place.replace(/^apple\s*/i, "");
  return s.startsWith(`${name}، `) ? s.slice(name.length + 2) : s;
}
