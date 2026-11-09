/**
 * العربية: views — صفحات «الطراز × المكان»، وسجل التوفر، والخريطة المباشرة، وصفحة أوقات توفر iPhone Duo، وفهرس المتاجر.
 * `c: Country` بيانات إنجليزية: اسم الدولة من util.country، وكلمة المنطقة من util.regionNoun. السلاسل `name` `place` `region`
 * `city` `store` `config` تصل بالعربية؛ أما كائنات Store / Place فإنجليزية فتُسمّى عبر places. العبارات المسلّمة للوحدات
 * (inPlace / inCountry) تحمل حرف الجر («في دبي»، «في الإمارات»). لا تُترجم أسماء الطرازات والسعات وPickupChecker والروابط.
 * فترات الفحص 15 ثانية و5 ثوانٍ فقط؛ ولا ذكر للاسترداد.
 */
import type { ReactNode } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import type { Point } from "@/components/ui/Viz";
import type { Faq } from "@/lib/content/types";
import { catalogFor, modelByKey, storePath, type Store } from "@/lib/apple/catalog";
import { COUNTRIES, type Country, type CountryCode } from "@/lib/apple/countries";
import { faq as placeFaq, peakOf, type FaqContext, type FaqItem } from "@/lib/seo/enrich";
import type { Place, Product } from "@/lib/seo/products";
import type { StoreLine } from "@/lib/seo/productData";
import type { PlaceStats, RestockStats } from "@/lib/stock/queries";
import { hourShare, type DayRow, type SelloutFacts } from "@/lib/content/restockTimes";
import { PATTERN_MIN, PATTERN_MIN_DAYS, WEEKDAY_MIN_SPAN, localStamp } from "@/lib/content/siteFacts";
import { SPEED } from "@/lib/plans";
import { list, stamp, weekdays, price as priceIn, distance, fitTitleW } from "@/lib/i18n/format";
import { appleStoreLabel, cityLabel, colorLabel, regionLabel, storeLabel } from "@/lib/i18n/places";
import type { Dict } from "../en";
import type { RestockTimesMeta, RestockTimesPlace, RestockTimesView } from "../en/views";
import { content } from "./content";
import {
  APPLE_STORES, CITIES_G, CONFIGS, DAYS, L, N, SECONDS, STORES, STORES_G, TIMES, allWord, apple, count, country, durAr, inCountry,
  regionNoun, regionsCount, taxNoteAr, theStores, theStoresG,
} from "./util";

const cn = (c: Pick<Country, "cc">) => country(c.cc);
const inC = (c: Pick<Country, "cc">) => inCountry(c.cc);
const listAr = (items: string[], max = 6) => list(L, items, max, (n) => content.listMore(N(n)));
const secs = (n: number) => count(n, SECONDS);

/* ---------------------------------------------------------------- product × place names */

const ccOf = (p: { country?: CountryCode }) => p.country ?? "us";
/** "iPhone Duo 512GB سماء الليل". */
function productName(p: Product, short = false): string {
  const m = modelByKey(p.model)!;
  return `${short ? m.short : m.name}${p.storage ? ` ${p.storage}` : ""}${p.color ? ` ${colorLabel(p.color, L)}` : ""}`;
}
/** " (العين)" when the store's name does not already say its city. */
const cityNote = (s: Store) => { const city = cityLabel(s.country ?? "us", s.city, L); return appleStoreLabel(s, L).includes(city) ? "" : ` (${city})`; };
/** The place in Arabic: the country, an emirate, a city, «Apple دبي مول». */
function placeNameAr(place: Place): string {
  const cc = ccOf(place);
  if (place.level === "country") return country(cc);
  if (place.level === "state") return regionLabel(cc, place.state!, L);
  if (place.level === "city") return cityLabel(cc, place.city!, L);
  return appleStoreLabel(place.store!, L);
}

function productTitle(product: Product, place: Place, inStock: number): string {
  const n = place.stores.length;
  const name = productName(product), short = productName(product, true);
  if (place.level === "country") {
    const w = inCountry(ccOf(place));
    return fitTitleW([...(inStock > 0 ? [`${name} ${w}: متوفر الآن في ${N(inStock)} من متاجر Apple`] : []), `مخزون ${name} للاستلام ${w} مباشرة`, `مخزون ${short} للاستلام ${w}`, `مخزون ${short} للاستلام`]);
  }
  if (place.level === "store") {
    const s = place.store!;
    const a = appleStoreLabel(s, L);
    const now = inStock > 0 ? "متوفر الآن" : "مخزون الاستلام";
    return fitTitleW([`${name} في ${a}: ${now}`, `${short} في ${a}${cityNote(s)}`, `${short} في ${a}`, `${short} في ${storeLabel(s, L)}`]);
  }
  const w = placeNameAr(place);
  return fitTitleW([`مخزون ${name} في ${w}: ${N(inStock)} من ${count(n, STORES_G)}`, `${name} في ${w}: مخزون الاستلام`, `مخزون ${short} في ${w}`, `${short} في ${w}`]);
}

function productDescription(product: Product, place: Place, inStock: number, stats: PlaceStats): string {
  const name = productName(product);
  const week = stats.week === 0 ? "لا توفر هذا الأسبوع" : `توفر ${count(stats.week, TIMES)} هذا الأسبوع`;
  if (place.level === "store") {
    const s = place.store!;
    const a = appleStoreLabel(s, L);
    const now = inStock > 0 ? "متوفر الآن" : "غير متوفر الآن";
    return fitTitleW([
      `مخزون ${name} للاستلام في ${a}${cityNote(s)}: ${now}، و${week}. الحالة المباشرة وأوقات التوفر والتنبيهات.`,
      `${name} في ${a}: ${now}، و${week}. الحالة المباشرة والتنبيهات.`,
    ], 155);
  }
  const w = placeNameAr(place);
  const n = place.stores.length;
  const avail = inStock === 0 ? "غير متوفر الآن في أيٍّ من" : `متوفر في ${N(inStock)} من`;
  return fitTitleW([
    `مخزون ${name} للاستلام في ${w}: ${avail} ${count(n, STORES_G)}، و${week}. مخزون مباشر لكل متجر وأوقات التوفر والتنبيهات.`,
    `${name} في ${w}: ${avail} ${count(n, STORES_G)}، و${week}. مخزون مباشر لكل متجر والتنبيهات.`,
  ], 155);
}

function productFaq(product: Product, place: Place, lines: StoreLine[], stats: PlaceStats, clock: RestockStats, nearest: { name: string; city: string; distance: number } | null): FaqItem[] {
  const out: FaqItem[] = [];
  const name = productName(product);
  const at = placeNameAr(place);
  const cc = ccOf(place);
  const near = nearest ? `${apple(nearest.name)} في ${nearest.city} (${distance(L, cc, nearest.distance)})` : null;
  const inStock = lines.filter((l) => l.available.length > 0);
  if (place.level === "store") {
    const l = lines[0];
    out.push({
      q: `هل يتوفر ${name} في ${at}؟`,
      a: l && l.available.length > 0
        ? product.parts.length > 1 ? `نعم، ${listAr(l.available.map((i) => `${i.storage} ${colorLabel(i.color, L)}`), 4)} عند آخر فحص.` : "نعم، عند آخر فحص."
        : `لا، عند آخر فحص${near ? `؛ وأقرب متجر يتوفر فيه هو ${near}` : ""}.`,
    });
  } else {
    out.push({
      q: `أي متاجر Apple في ${at} يتوفر فيها ${name}؟`,
      a: inStock.length === 0
        ? `لا يوجد عند آخر فحص${near ? `؛ وأقرب متجر يتوفر فيه هو ${near}` : ""}.`
        : `${count(inStock.length, STORES)} عند آخر فحص: ${listAr(inStock.map((x) => appleStoreLabel(x.store, L)), 4)}.`,
    });
  }
  const peak = peakOf(clock, L);
  out.push({
    q: `كم مرة يتوفر ${name} من جديد في ${at}؟`,
    a: stats.month === 0 ? `لم يُسجَّل أي توفر خلال آخر ${count(stats.days, DAYS)}.` : `توفر ${count(stats.month, TIMES)} خلال آخر ${count(stats.days, DAYS)}، منها ${N(stats.week)} هذا الأسبوع${peak ? `، وأغلبها نحو الساعة ${peak.hour} بالتوقيت المحلي` : ""}.`,
  });
  if (stats.medianMs != null) out.push({ q: `كم يبقى متوفرًا في ${at}؟`, a: `نحو ${durAr(stats.medianMs)} (الوسيط) قبل أن ينفد من جديد.` });
  return out;
}

function priceLabelAr(product: Product): string {
  const cc = ccOf(product);
  const prices = catalogFor(product.model, cc).filter((c) => product.parts.includes(c.partNumber)).map((c) => c.price);
  const lo = Math.min(...prices), hi = Math.max(...prices);
  const f = (v: number) => priceIn(L, COUNTRIES[cc], v);
  return lo === hi ? f(lo) : `${f(lo)} – ${f(hi)}`;
}

/* ---------------------------------------------------------------- restock-times formats */

const rtPct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : `${Math.round(x * 100)}%`);
const df = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("ar-AE-u-nu-latn", { timeZone: "UTC", ...o });
/** "الثلاثاء، 3 نوفمبر" / "3 نوفمبر". */
const dateLabel = (ymd: string, weekday = true) => df({ month: "long", day: "numeric", ...(weekday ? { weekday: "long" as const } : {}) }).format(new Date(`${ymd}T12:00:00Z`));
const longDate = (ymd: string) => df({ month: "long", day: "numeric", year: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
const zoneStamp = (iso: string, c: Country) => (c.cc === "ae" ? `${stamp(L, iso, c.timeZone)} بتوقيت الإمارات` : stamp(L, iso, c.timeZone, true));
/** "9:00". */
const hourLabel = (h: number) => `${h % 24}:00`;
/** "9:00–11:00". */
const rangeLabel = (from: number, to: number) => `${hourLabel(from)}–${hourLabel(to)}`;
/** "بين 9:00 و11:00" inside a sentence. */
const between = (from: number, to: number) => `بين ${hourLabel(from)} و${hourLabel(to)}`;
const weekdayName = (d: number) => weekdays(L)[d];
const storeAr = (s: Store) => appleStoreLabel(s, L);
const rtRegion = (x: { us: boolean; c: Country }) => (x.us ? "ولاية" : regionNoun(x.c));
/** «في الإمارات»، أو مكان صفحة المنطقة/المدينة: «في دبي». */
const rtIn = (x: { c: Country; place?: RestockTimesPlace }) => (x.place ? `في ${x.place.name}` : inC(x.c));
/** وحدة قسم «أين»: مناطق الدولة، ومدن المنطقة، ومتاجر المدينة (مفرد / جمع / «من N …»). */
const rtUnit = (x: { us: boolean; c: Country; place?: RestockTimesPlace }) => (x.place ? (x.place.kind === "region" ? "مدينة" : "متجر") : rtRegion(x));
const rtUnits = (x: { us: boolean; c: Country; place?: RestockTimesPlace }) => (x.place ? (x.place.kind === "region" ? "مدن" : "متاجر") : x.us ? "ولايات" : regionNoun(x.c, true));
const rtUnitsOf = (x: { us: boolean; c: Country; place?: RestockTimesPlace }, total: number) =>
  x.place ? count(total, x.place.kind === "region" ? CITIES_G : STORES_G) : x.us ? `${N(total)} ولاية` : regionsCount(x.c, total);
const zero = "لم يُسجَّل أي توفر بعد لنختبره به.";

/** The peak handed over in English ("10 AM", "Tuesday") → Arabic ("10:00", "الثلاثاء"). */
function peakAr(p: FaqContext["peak"]): FaqContext["peak"] {
  if (!p) return p;
  const m = p.hour.match(/^(\d{1,2}) (AM|PM)$/);
  const hour = m ? hourLabel((Number(m[1]) % 12) + (m[2] === "PM" ? 12 : 0)) : p.hour === "noon" ? "12:00" : p.hour === "midnight" ? "0:00" : p.hour;
  const en = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(p.day ?? "");
  return { ...p, hour, day: en >= 0 ? weekdayName(en) : p.day };
}

export const views: Dict["views"] = {
  common: {
    inCountry: (c: Country) => inC(c),
    liveMap: "الخريطة المباشرة",
    restockLog: "سجل التوفر",
    alertMe: "نبّهني",
    lastDays: (days: number) => <>آخر {count(days, DAYS)}</>,
    since: "2 نوفمبر 2026",
    sourcesWhere: (n: number, c: Country) => `${theStores(n)} ${inC(c)}`,
    checker: (c: Country) => `فحص مخزون iPhone ${inC(c)}`,
    appleStoresIn: (c: Country) => `متاجر Apple ${inC(c)}`,
    storesWithIt: "متاجر يتوفر فيها",
    more: "المزيد",
  },

  /* ---------------------------------------------------------------- /stock/{product}/{place…} */
  product: {
    title: productTitle,
    description: productDescription,
    faq: productFaq,
    priceLabel: priceLabelAr,
    inPlace: (name: string) => `في ${name}`,
    h1Country: (model: string, c: Country) => `مخزون ${model} للاستلام ${inC(c)}`,
    h1Place: (model: string, where: string) => `${model} ${where}`,
    inStockNow: "متوفر الآن",
    yes: "نعم",
    no: "لا",
    pickup: "استلام",
    configurations: "خيارات",
    ofStores: (n: number) => `من ${count(n, STORES_G)}`,
    restocks24h: "التوفر · 24 ساعة",
    restocksHint: (week: number, month: number, days: number) => `${N(week)} في 7 أيام · ${N(month)} في ${count(days, DAYS)}`,
    sellOuts: (days: number) => `النفاد · ${count(days, DAYS)}`,
    stays: (ms: number) => `يبقى ~${durAr(ms)}`,
    noPairs: "لا بيانات بعد",
    lastRestock: "آخر توفر",
    noneYet: "لا شيء بعد",
    thisConfig: "هذا الخيار",
    inDays: (days: number) => `خلال ${count(days, DAYS)}`,
    notInStockNow: "غير متوفر الآن",
    configsInStock: (n: number, of: number) => <span><b className="text-ink">{N(n)}</b> من {count(of, CONFIGS)} متوفرة</span>,
    inStockAt: (n: number, of: number) => <span>متوفر في <b className="text-ink">{N(n)}</b> من {count(of, STORES_G)}</span>,
    checked: (live: ReactNode, price: string, tax: string) => <>آخر فحص {live} · {price}{tax}</>,
    taxNote: (c: Country) => taxNoteAr(c),
    beforeTax: "قبل الضريبة",
    buyOnApple: "اشترِ من apple.com",
    allStoresIn: (c: Country) => `كل المتاجر ${inC(c)}`,
    everyIphoneHere: "كل أجهزة iPhone هنا",
    everyIphone: (where: string) => `كل أجهزة iPhone ${where}`,
    panel: (model: string, where: string | null) => `${model}${where ? ` ${where}` : ""}: حدّد الخيارات والمتاجر`,
    unitConfigs: "الخيارات",
    unitStores: "المتاجر",
    otherConfigsHere: "خيارات أخرى هنا",
    byStorageColor: "حسب السعة واللون",
    nearestStores: "أقرب المتاجر",
    closest: (link: ReactNode, dist: string) => <>الأقرب الذي يتوفر فيه الآن: {link} · {dist}</>,
    storeCity: (store: string, city: string) => <>{store}، {city}</>,
    mostRecentlyInStock: "آخر المتاجر توفرًا",
    storesWithItNow: "متاجر يتوفر فيها الآن",
    storesIn: (where: string) => `المتاجر ${where}`,
    colStatus: "الحالة",
    colConfigs: "خيارات متوفرة",
    noStoreHasIt: "لا يتوفر في أي متجر الآن.",
    noStoreHereHasIt: "لا يتوفر في أي متجر هنا الآن.",
    moreStores: (n: number) => <>متاجر أخرى ({N(n)}): تصفّحها حسب المنطقة.</>,
    byRegion: (c: Country) => `حسب ال${regionNoun(c)}`,
    byCity: "حسب المدينة",
    nearbyStores: "متاجر قريبة",
    latestChanges: "أحدث التغييرات",
    nothingLogged: "لم يُسجَّل شيء بعد.",
    whenRestocks: "متى يتوفر",
    howFast: "كم يصمد قبل النفاد",
    restocksByConfig: "التوفر حسب الخيار",
    faqTitleCountry: (model: string, c: Country) => `${model} ${inC(c)}: أسئلة شائعة`,
    faqTitle: (model: string, where: string) => `${model} ${where}: أسئلة شائعة`,
    buySource: (model: string, c: Country) => `Apple: شراء ${model} (${cn(c)}، بالإنجليزية)`,
    nearby: "قريب",
    otherRegions: (c: Country) => `${regionNoun(c, true)} أخرى`,
    elsewhereIn: (region: string) => `في أماكن أخرى من ${region}`,
    everyAppleStoreIn: (c: Country) => `كل متاجر Apple ${inC(c)}`,
    across: (model: string, c: Country) => `${model} في كل أنحاء ${cn(c)}`,
    itemList: (model: string, where: string) => `${model} ${where}`,
    nearLead: (c: Country, model: string, inStock: number, n: number, have: { store: string; city: string; configs: number }[]) =>
      inStock === 0
        ? `لا يعرض أي متجر Apple ${inC(c)} ${model} للاستلام الآن، لذا فسؤال «الأقرب مني» صار: أي متجر يتوفر فيه أولًا؟ فعّل تنبيهًا على المتاجر التي يمكنك الوصول إليها، ويُرسَل إليك الإشعار بعد ثوانٍ من عرض أحدها له.`
        : `${N(inStock)} من ${count(n, STORES_G)} تعرض ${model} الآن: ${listAr(have.slice(0, 5).map((l) => `${l.store} في ${l.city} (${count(l.configs, CONFIGS)})`), 5)}.`,
    nearHead: (c: Country) => [`ال${regionNoun(c)}`, "متاجر يتوفر فيها الآن"],
    nearCaption: (c: Country, model: string) => `مخزون ${model} للاستلام حسب ال${regionNoun(c)}، عند آخر فحص`,
    nearMe: (_c: Country, model: string, alert: string) => `لترتيب كل المتاجر حسب قربها منك، افتح إعداد التنبيه في هذه الصفحة واضغط «بالقرب مني»: المسافات تقديرية على الطريق بالكيلومتر، ولكل متجر رابط للاتجاهات. [فعّل تنبيه ${model}](${alert}).`,
    modelFaq: (c: Country, model: string, low: number, high: number, inStock: number): { price: FaqItem; reserve: FaqItem } => {
      const money = (v: number) => priceIn(L, c, v);
      return {
        price: { q: `كم سعر ${model} ${inC(c)}؟`, a: `من ${money(low)} إلى ${money(high)} على apple.com (${taxNoteAr(c)})، حسب السعة.` },
        reserve: { q: `هل يمكنني حجز ${model} للاستلام ${inC(c)}؟`, a: `لا؛ حين يعرض متجرٌ خيارًا ما، تشتريه من apple.com${c.cc === "ae" ? " (صفحة الشراء بالإنجليزية)" : ""} مع اختيار الاستلام من المتجر، فيُحجز لك حتى موعد الاستلام.${inStock === 0 ? " ولا يعرضه أي متجر الآن، لذا فالتنبيه هو طريقك لتكون الأول." : ""}` },
      };
    },
  },

  /* ---------------------------------------------------------------- /restocks */
  restocks: {
    metaTitle: (c: Country, n: number) => `سجل توفر iPhone ${inC(c)}: ${n === 1 ? "متجر Apple" : theStores(n)} مباشرة`,
    metaDescription: (c: Country, n: number) => `كل حالة توفر لأجهزة iPhone Duo و18 Pro وPro Max للاستلام من ${n === 1 ? "متجر Apple" : "متاجر Apple"} ${inC(c)}، بالوقت الدقيق والخيار والخريطة.`,
    h1: (c: Country) => `سجل التوفر ${inC(c)}`,
    summary: (day: number, week: number, model?: string, region?: string) => <>{day === 0 ? "لا توفر" : `توفر ${count(day, TIMES)}`} خلال 24 ساعة · {N(week)} هذا الأسبوع{model ? ` · ${model}` : ""}{region ? ` · ${region}` : ""}. الأوقات بتوقيتك المحلي.</>,
    allModels: "كل الطرازات",
    restocks: "التوفر",
    withSoldOut: "التوفر + النفاد",
    regionLabel: (c: Country) => `ال${regionNoun(c)}`,
    allRegions: (c: Country) => `كل ال${regionNoun(c, true)}`,
    filter: "تصفية",
    page: (k: number) => <>صفحة {N(k)}</>,
    newer: "→ الأحدث",
    older: "الأقدم ←",
    getAlerts: "فعّل التنبيهات",
    byPlace: "التوفر حسب المكان",
    byRegion: (c: Country) => `حسب ال${regionNoun(c)}`,
    datasetName: (c: Country) => `سجل توفر iPhone للاستلام في متاجر Apple ${inC(c)}`,
    datasetDescription: (c: Country) => `كل توفر ونفاد مؤكد لأجهزة iPhone Duo وiPhone 18 Pro وiPhone 18 Pro Max للاستلام من ${c.cc === "us" ? "جميع متاجر Apple الـ269 في الولايات المتحدة" : `متاجر Apple ${inC(c)}`}، مع المتجر والخيار الدقيق والوقت. لا يُسجَّل التوفر إلا بعد إجابتين متطابقتين من apple.com، بفحص كل 15 ثانية (وكل 5 ثوانٍ للمتاجر التي عليها تنبيهات).`,
    datasetMeasured: ["متجر Apple", "طراز iPhone وسعته ولونه", "وقت التوفر", "وقت النفاد"],
  },

  /* ---------------------------------------------------------------- /map */
  map: {
    metaTitle: (c: Country, n: number) => `خريطة مخزون iPhone Duo للاستلام: ${n === 1 ? "متجر Apple" : "كل متاجر Apple"} ${inC(c)} مباشرة`,
    metaDescription: (c: Country, n: number) => `خريطة مباشرة ل${n === 1 ? "متجر Apple" : theStoresG(n)} ${inC(c)} مع مخزون iPhone Duo و18 Pro وPro Max للاستلام الآن، حسب السعة واللون.`,
    country: (c: Country) => ({ name: cn(c), inName: inC(c), regionNoun: c.regionNoun, regionNounPlural: c.regionNounPlural }),
    everyStore: "كل المتاجر",
    storeCity: (store: string, city: string) => `${store} · ${city}`,
  },

  /* ---------------------------------------------------------------- /{cc}/stores */
  storesIndex: {
    metaDescription: (c: Country, n: number, regions: number, cities: number, duo: number, max: number) => {
      const by = c.regionNoun && regions > 1 ? ` حسب ال${regionNoun(c)} والمدينة` : cities > 1 ? " حسب المدينة" : "";
      return `${theStores(n)} ${inC(c)}${by}، مع مخزون iPhone Duo و18 Pro وPro Max للاستلام مباشرة: Duo متوفر الآن في ${N(duo)}، وPro Max في ${N(max)}.`;
    },
    countAnswer: (n: number, spread: string, top: { name: string; count: number }[]) => `${count(n, APPLE_STORES)}، ${spread}${top.length ? `. أكثرها في ${top[0].name} (${N(top[0].count)})${top[1] ? `، ثم ${top[1].name} (${N(top[1].count)})` : ""}` : ""}.`,
    howMany: (c: Country) => <>كم عدد متاجر Apple {inC(c)}؟</>,
    duoNow: (c: Country, n: number, have: Store[]): FaqItem => ({
      q: `أي متاجر Apple ${inC(c)} فيها iPhone Duo الآن؟`,
      a: have.length === 0 ? `لا يوجد في أيٍّ من ${allWord(n)} عند آخر فحص. تتحدث هذه الصفحة والخريطة لحظة أن يعرضه أحدها، والتنبيه يخبرك أولًا.` : `${N(have.length)} من ${count(n, STORES_G)} عند آخر فحص: ${listAr(have.map(storeAr), 6)}.`,
    }),
    faq: (ctx: FaqContext) => placeFaq({ ...ctx, peak: peakAr(ctx.peak), omit: [...(ctx.omit ?? []), "count", "stock", "lasts"] }, L),
    duoBlock: (alert: string) => `أسرع طريقة للحصول عليه هي تنبيه على المتاجر التي يمكنك الوصول إليها: [فعّل تنبيه iPhone Duo](${alert}). كل متجر × خيار محدد = تنبيه واحد، ويُرسَل الإشعار بعد ثوانٍ من عرض المتجر له.`,
    intro: (c: Country, n: number, spread: string, now: { duo: number; max: number; pro: number }, tax: string) => `يوجد ${inC(c)} **${count(n, APPLE_STORES)}**، ${spread}. الآن iPhone Duo متوفر للاستلام في **${N(now.duo)}** ${n === 2 ? "منهما" : "منها"}، وiPhone 18 Pro Max في **${N(now.max)}**، و18 Pro في **${N(now.pro)}**. ${tax}`,
    crumb: "متاجر Apple",
    panel: (c: Country) => `اختر الهواتف وحدّد المتاجر التي يمكنك الوصول إليها ${inC(c)}`,
    matrixLabel: "المخزون حسب المتجر",
    matrixH2: (c: Country) => <>المخزون في كل متجر Apple {inC(c)}</>,
    matrixHint: "المتوفر الآن / ما نتابعه، لكل طراز.",
    topCaption: (c: Country) => <>ترتيب ال{regionNoun(c, true)} حسب عدد متاجر Apple (وفق قائمة متاجر Apple كما نتابعها)</>,
    regionHead: (c: Country) => `ال${regionNoun(c)}`,
    colStores: "متاجر Apple",
    colCities: "المدن",
    locationsBy: (c: Country) => `مواقع متاجر Apple حسب ال${regionNoun(c)}`,
    locationsIn: (c: Country) => `مواقع متاجر Apple ${inC(c)}`,
    storeCount: (n: number) => <>{count(n, STORES)}</>,
    storeCountAll: (n: number) => <>{count(n, STORES)}</>,
    whenRestock: (c: Country) => <>متى يتوفر iPhone في المتاجر {inC(c)}؟</>,
    howFast: (c: Country) => <>كم يصمد المخزون {inC(c)} قبل أن ينفد؟</>,
    faqTitle: (c: Country) => `متاجر Apple ${inC(c)}: أسئلة شائعة`,
    getApp: "احصل على التطبيق",
    howItWorks: "طريقة العمل (بالإنجليزية)",
    pricing: "الباقات",
  },

  /* ---------------------------------------------------------------- /iphone-duo-restock-times */
  restockTimes: {
    fmt: {
      n: N,
      pct: rtPct,
      date: dateLabel,
      longDate,
      zoneStamp,
      local: (iso: string, store: Parameters<typeof localStamp>[1]) => localStamp(iso, store, L),
      hour: hourLabel,
      range: rangeLabel,
      weekday: weekdayName,
      store: storeAr,
      storeWithPlace: (s: Store) => `${storeAr(s)} (${cityLabel(s.country ?? "us", s.city, L)})`,
    },
    title: (c: Country, place?: RestockTimesPlace) => `متى يتوفر iPhone Duo من جديد ${place ? `في ${place.name}` : inC(c)}؟`,
    metaDescription: (x: RestockTimesMeta) => {
      const { c, t, w, pattern } = x;
      const region = c.cc === "us" ? "الولاية" : c.regionNoun ? `ال${regionNoun(c)}` : "المتجر";
      /** صفحة المنطقة حسب المدينة؛ صفحة المدينة بلا وحدة (كي لا يتكرر «المتجر»). */
      const unit = x.place ? (x.place.kind === "region" ? "المدينة" : null) : region;
      const where = rtIn(x);
      const since = dateLabel(t.since, false);
      return t.n > 0 && pattern
        ? fitTitleW([
          `تأكد توفر iPhone Duo ${count(t.n, TIMES)} في متاجر Apple ${where} منذ ${since}: ${rtPct(w.share)} منها ${between(w.from, w.to)} بالتوقيت المحلي${t.sellout ? `، و${rtPct(t.sellout.within2min)} نفد خلال دقيقتين` : ""}. جداول حسب الساعة واليوم ${unit ? `و${unit} ` : ""}والمتجر والخيار.`,
          `تأكد توفر iPhone Duo ${count(t.n, TIMES)} في متاجر Apple ${where} منذ ${since}: ${rtPct(w.share)} منها ${between(w.from, w.to)} بالتوقيت المحلي. جداول حسب الساعة واليوم و${unit ?? "المتجر"} والخيار.`,
          `أوقات توفر iPhone Duo ${where}: ${count(t.n, TIMES)} منذ ${since}، حسب الساعة واليوم و${unit ?? "المتجر"} والخيار.`,
        ], 158)
        : t.n > 0
          ? fitTitleW([
            `تأكد توفر iPhone Duo ${count(t.n, TIMES)} في متاجر Apple ${where} منذ ${since}، بفحص كل ${secs(SPEED.checkSec)}: حسب الساعة المحلية، يومًا بيوم، وحسب ${unit ? `${unit} و` : ""}المتجر والخيار، وكم دام كل توفر.`,
            `أوقات توفر iPhone Duo ${where}: تأكد التوفر ${count(t.n, TIMES)} منذ ${since}، حسب الساعة واليوم و${unit ?? "المتجر"} والخيار.`,
          ], 158)
          : `متى تعيد متاجر Apple ${where} توفير iPhone Duo، من فحوص PickupChecker كل ${secs(SPEED.checkSec)} منذ ${longDate(t.since)}: ساعةً بساعة، ويومًا بيوم، وحسب المتجر والخيار.`;
    },
    h1: (x: RestockTimesView) => x.t.unknown
      ? `متى يتوفر iPhone Duo من جديد ${rtIn(x)}؟`
      : x.t.n > 0
        ? `هل ما زالت Apple توفّر iPhone Duo ${rtIn(x)}؟ نعم — وهذه أوقاته ساعةً بساعة`
        : `هل بدأت Apple توفير iPhone Duo ${rtIn(x)}؟ ليس بعد حسب فحوصنا — وهذا ما نراقبه`,
    intro: (x: RestockTimesView) => {
      const { t, one, tracked, pattern, w } = x;
      const where = rtIn(x);
      return t.unknown ? (
        <>تعذّرت قراءة سجل التوفر الآن؛ ما زلنا نفحص المتاجر {where} كل {secs(SPEED.checkSec)}، وستعود هذه الصفحة بأرقامها عند التحميل التالي.</>
      ) : t.n > 0 ? (
        <>
          <b className="text-ink">نعم.</b> توفّر iPhone Duo في {one ? "متجر Apple" : "متاجر Apple"} {where} <b className="text-ink">{count(t.n, TIMES)} منذ {longDate(t.since)}</b>{tracked > 1 ? <>، في {N(t.days)} من الأيام الـ{N(tracked)} التي تتبعناها</> : <> (يوم واحد من التتبع حتى الآن)</>}
          {pattern && <>، و<b className="text-ink">{rtPct(w.share)} منها {between(w.from, w.to)}</b> بالتوقيت المحلي للمتجر</>}.
        </>
      ) : (
        <>
          <b className="text-ink">ليس بعد، حسب فحوصنا.</b> منذ {longDate(t.since)} يسأل PickupChecker {one ? "متجر Apple" : theStoresG(x.stores)} {where} كل {secs(SPEED.checkSec)}، ولم يتأكد بعد أي توفر لـiPhone Duo للاستلام.
        </>
      );
    },
    hero: {
      restocks: (x: RestockTimesView) => `توفر مؤكد منذ ${dateLabel(x.t.since, false)}`,
      window: (x: RestockTimesView) => `${between(x.w.from, x.w.to)}، بالتوقيت المحلي للمتجر`,
      days: "أيام شهدت توفرًا واحدًا على الأقل",
      now: (one: boolean): string => (one ? "متجر يعرضه للاستلام الآن" : "متاجر تعرضه للاستلام الآن"),
      today: (x: RestockTimesView, today: DayRow) => `اليوم (${dateLabel(today.date)})${x.one ? "" : `، في ${count(today.stores, STORES_G)}`} حتى الآن`,
      weekday: "أكثر أيام الأسبوع توفرًا حتى الآن",
    },
    heroPoints: (x: RestockTimesView, latest: { config: string; store: Store; at: string } | null): Point[] => [
      ...(latest ? [{ text: <>الأحدث: <b className="text-ink">{latest.config}</b>{x.one ? null : <> في <Link href={storePath(latest.store)} className="underline underline-offset-2">{storeAr(latest.store)}</Link></>}، {localStamp(latest.at, latest.store, L)} بالتوقيت المحلي</> }] : []),
      ...(x.t.peakWeekday != null ? [{ text: <>أكثره يوم <b className="text-ink">{weekdayName(x.t.peakWeekday)}</b></> }] : []),
      { text: <>لا تنشر Apple <b className="text-ink">أي جدول للتوفر</b>؛ هذه فحوصنا المؤكدة، وتتحدث كل خمس دقائق تقريبًا</>, no: true },
    ],
    emptyPoints: (x: RestockTimesView): Point[] => [
      { text: <>الآن <b className="text-ink">{N(x.duoNow)} من {count(x.stores, STORES_G)}</b> {x.one ? "يعرضه" : "تعرضه"} للاستلام</> },
      { text: <>تمتلئ الجداول أدناه من أول توفر مؤكد</>, step: true },
      { text: <>أنماط الساعة ويوم الأسبوع، حيث لدينا أكبر قدر من البيانات: <Link href="/iphone-duo-restock-times" className="underline underline-offset-2">الصفحة الأمريكية (بالإنجليزية)</Link></>, step: true },
    ],
    keyFactsTitle: "أهم الحقائق",
    keyFacts: (x: RestockTimesView, k: { top: { label: string; restocks: number } | null; latest: { config: string; store: Store; at: string } | null }): string[] => {
      const { t, w, sell } = x;
      const wh = rtIn(x);
      const since = dateLabel(t.since, false);
      const peak = t.peakHour;
      return [
        `عدد حالات توفر iPhone Duo التي أكّدها PickupChecker ${x.one ? "في متجر Apple" : `في ${N(x.stores)} من متاجر Apple`} ${wh} منذ ${longDate(t.since)}: ${N(t.n)}، في ${N(t.days)} من أصل ${N(x.tracked)} من أيام التتبع.`,
        ...(x.pattern
          ? [`${rtPct(w.share)} من حالات توفر iPhone Duo الـ${N(t.n)} ${wh} منذ ${since} وقعت ${between(w.from, w.to)} بالتوقيت المحلي للمتجر.`]
          : [`لا يذكر PickupChecker ساعةً معتادة لتوفر iPhone Duo ${wh} إلا بعد ${PATTERN_MIN} حالات توفر في ${PATTERN_MIN_DAYS} أيام مختلفة، وحالات التوفر الـ${N(t.n)} حتى الآن لا تكفي.`]),
        ...(x.pattern && peak != null ? [`أكثر ساعة منفردة لتوفر iPhone Duo ${wh} كانت ${rangeLabel(peak, peak + 1)} بالتوقيت المحلي، بـ${N(t.byHour[peak])} من أصل ${N(t.n)} (${rtPct(t.byHour[peak] / t.n)}).`] : []),
        ...(sell ? [`بقي iPhone Duo بعد توفره ${wh} معروضًا على صفحة الاستلام في Apple مدةً وسيطها ${secs(sell.medianSec)} (قيست في حالات التوفر الـ${N(sell.n)} منذ ${since})؛ وهذه مدة عرض لا عدد وحدات مبيعة.`] : []),
        ...(k.top && k.top.restocks > 0 ? [`أكثر خيارات iPhone Duo توفرًا ${wh} هو ${k.top.label}: ${N(k.top.restocks)} من أصل ${N(t.n)} منذ ${since} (${rtPct(k.top.restocks / t.n)}).`] : []),
        ...(k.latest ? [`آخر توفر مؤكد لـiPhone Duo ${wh} كان ${k.latest.config}${x.one ? "" : ` في ${storeAr(k.latest.store)}`}، ${localStamp(k.latest.at, k.latest.store, L)} بالتوقيت المحلي للمتجر.`] : []),
        `حتى ${zoneStamp(t.at, x.c)}: لا يُحتسب التوفر ${wh} إلا بعد فحصَين متطابقَين لصفحة الاستلام في Apple، ولا تُحتسب أبدًا أول رؤية بعد انقطاع في التتبع.`,
      ];
    },
    setUpAlert: "فعّل تنبيه iPhone Duo",
    logLive: "سجل التوفر مباشرة",
    onThisPage: "في هذه الصفحة",
    nav: (x: RestockTimesView): Record<string, string> => ({
      "time-of-day": "وقت اليوم",
      "day-by-day": "يومًا بيوم",
      where: `حسب ال${rtUnit(x)}`,
      configuration: "الخيار",
      "how-long": "كم يصمد",
      unavailable: "لماذا غير متوفر",
      reddit: "Reddit مقابل البيانات",
      method: "طريقة الاحتساب",
    }),
    h2: (x: RestockTimesView): Record<string, string> => ({
      "time-of-day": `في أي وقت من اليوم يتوفر iPhone Duo ${rtIn(x)}؟`,
      "day-by-day": `في أي أيام وفّرت Apple جهاز iPhone Duo ${rtIn(x)}؟`,
      where: `أي متاجر Apple ${rtIn(x)} يتوفر فيها iPhone Duo أكثر؟`,
      configuration: `أي خيارات iPhone Duo تتوفر أكثر ${rtIn(x)}؟`,
      "how-long": `كم يصمد توفر iPhone Duo ${rtIn(x)}؟`,
      unavailable: "لماذا تقول كل متاجر Apple «غير متوفر حاليًا»؟",
      reddit: "ماذا يقول Reddit عن توفر iPhone Duo، وماذا تقول البيانات",
      method: "كيف يحتسب PickupChecker حالة التوفر؟",
    }),
    faq: (x: RestockTimesView): Faq[] => {
      const { t, w, pattern, sell, us, weekend, tracked } = x;
      const where = rtIn(x);
      const fast = secs(SPEED.fastSec);
      return [
        { q: `متى توفّر Apple جهاز iPhone Duo ${where}؟`, a: t.n > 0 && pattern
          ? `${w.from >= 5 && w.from < 12 ? "غالبًا صباحًا: " : ""}${rtPct(w.share)} من حالات التوفر المؤكدة منذ ${longDate(t.since)} (وعددها ${N(t.n)}) وقعت ${between(w.from, w.to)} بالتوقيت المحلي للمتجر، و${rtPct(hourShare(t.byHour, 8, 12))} بين 8:00 و12:00. لا تنشر Apple أي جدول؛ هذا هو النمط الذي رصده PickupChecker، ويتحدث كل خمس دقائق تقريبًا.`
          : `لا تنشر Apple أي جدول، وقد سجّل PickupChecker ${where} ${t.n === 0 ? "لا توفر مؤكدًا" : `توفرًا مؤكدًا ${count(t.n, TIMES)}`} منذ ${longDate(t.since)}${t.days ? ` على مدى ${count(t.days, DAYS)}` : ""}. نذكر الساعة المعتادة حين تبلغ حالات التوفر ${N(PATTERN_MIN)} على ${count(PATTERN_MIN_DAYS, DAYS)} مختلفة، وتتحدث هذه الصفحة تلقائيًا.` },
        { q: `هل توفّر Apple جهاز iPhone Duo في عطلة نهاية الأسبوع${us ? "" : ` ${where}`}؟`, a: t.n > 0
          ? `${weekend > 0 ? `نعم حتى الآن: وقع ${N(weekend)} من حالات التوفر الـ${N(t.n)} يوم سبت أو أحد (${rtPct(weekend / t.n)}).` : `ليس بعد في بياناتنا: لم يقع أيٌّ من حالات التوفر الـ${N(t.n)} يوم سبت أو أحد.`} ${t.peakWeekday != null ? `وكان ${weekdayName(t.peakWeekday)} أكثر الأيام توفرًا.` : `ولا نذكر أكثر الأيام توفرًا حتى تغطي البيانات ${count(WEEKDAY_MIN_SPAN, DAYS)}؛ وبياناتنا تغطي ${count(tracked, DAYS)}.`}`
          : `لا بيانات لعطلة نهاية الأسبوع ${where} بعد؛ يمتلئ جدول «يومًا بيوم» في هذه الصفحة مع تأكيد كل توفر.` },
        { q: "متى أبدأ الفحص؟", a: t.n > 0 && pattern
          ? `إن كنت تفحص يدويًا، فكن على apple.com مع اختيار الاستلام من الساعة ${hourLabel(w.from)} بالتوقيت المحلي؛ فهاتان الساعتان حملتا ${rtPct(w.share)} من حالات التوفر. ${sell ? `ونصف حالات التوفر نفد خلال ${secs(sell.medianSec)}` : "والتوفر المعتاد يدوم دقيقة تقريبًا"}، لذا فالتنبيه الذي يفحص كل ${fast} ([كيف تعمل التنبيهات](/iphone-duo-stock-alerts)، بالإنجليزية) يفعل ما لا يفعله أي تحديث للصفحة.`
          : `إلى أن يتضح النمط ${where}، دع التنبيه يراقب عنك: نفحص المتاجر التي تختارها كل ${fast} على مدار الساعة ([كيف تعمل التنبيهات](/iphone-duo-stock-alerts)، بالإنجليزية).` },
        { q: "لماذا تقول كل متاجر Apple إن iPhone Duo غير متوفر؟", a: sell
          ? `لأن التوفر قصير: ${rtPct(sell.within2min)} من حالات التوفر التي نفدت وقسناها ${where} (وعددها ${N(sell.n)}) اختفت خلال دقيقتين، و${rtPct(sell.within20min)} خلال 20 دقيقة. الآن يعرضه ${N(x.duoNow)} من ${count(x.stores, STORES_G)}؛ وفي أي لحظة أخرى تقريبًا، القراءة الصادقة لـapple.com هي «غير متوفر» حتى في يوم شهد عشرات حالات التوفر ([ماذا تعني «غير متوفر»](/apple-store-pickup-availability-explained)، بالإنجليزية).`
          : `لأن مخزون الاستلام يظهر لدقائق في كل مرة. الآن يعرضه ${N(x.duoNow)} من ${count(x.stores, STORES_G)} ${where} ([ماذا تعني «غير متوفر»](/apple-store-pickup-availability-explained)، بالإنجليزية).` },
        { q: "كيف يصلني إشعار حين يتوفر iPhone Duo في متجر Apple الذي أريده؟", a: `فعّل تنبيهًا للمتجر وللسعة واللون بالتحديد: من حينها يُفحص ذلك المتجر كل ${fast}، ويُرسَل الإشعار بعد نحو ${secs(SPEED.alertSec)} من تأكيد التوفر، أما ظهوره على هاتفك فيتوقف على الجهاز واتصاله ([فعّل تنبيهًا](${x.alert})؛ [طريقة العمل](/how-it-works)، بالإنجليزية).` },
      ];
    },
    sources: {
      applePickup: "Apple: التوصيل والاستلام (كيف يعمل توفر الاستلام من المتجر، بالإنجليزية)",
      newsroom: "Apple Newsroom: وصول iPhone Duo إلى متاجر Apple حول العالم (23 أكتوبر 2026، بالإنجليزية)",
      macRumors: "MacRumors: عودة نظام الاستلام من متاجر Apple لجهاز iPhone Duo في الولايات المتحدة وكندا (24 أكتوبر 2026، بالإنجليزية)",
      reports: (tracker: string) => `${tracker}: تقارير توفر iPhone Duo في أسبوع الإطلاق (ملاحظاتهم، معروضة على حدة ولا تُحتسب أبدًا)`,
    },
    ld: (x: RestockTimesView) => ({
      datasetName: `أوقات توفر iPhone Duo في متاجر Apple ${rtIn(x)}`,
      description: `كل توفر مؤكد لـiPhone Duo للاستلام من متاجر Apple ${rtIn(x)} منذ ${x.t.since}، مع المتجر والخيار والوقت، من فحوص PickupChecker كل ${secs(SPEED.checkSec)}؛ ملخّصًا حسب الساعة المحلية واليوم ${x.place?.kind === "city" ? "" : `وال${rtUnit(x)} `}والمتجر والخيار.`,
      spatial: `متاجر Apple ${rtIn(x)}`,
      measured: ["وقت التوفر (بالتوقيت المحلي للمتجر)", "متجر Apple", "سعة iPhone Duo ولونه", "الثواني حتى النفاد"],
      size: `توفر ${count(x.t.n, TIMES)} في ${count(x.t.stores, STORES_G)}`,
    }),
    crumb: "أوقات توفر iPhone Duo",

    // ---- time of day
    timeLead: (x: RestockTimesView) => <b>{rtPct(x.w.share)} من حالات التوفر الـ{N(x.t.n)} وقعت {between(x.w.from, x.w.to)} بالتوقيت المحلي للمتجر، و{rtPct(hourShare(x.t.byHour, 8, 12))} بين 8:00 و12:00.</b>,
    busiestHour: (c: number) => `أكثر ساعة: توفر ${count(c, TIMES)}`,
    morning: "بين 8:00 و12:00",
    evening: "بعد 17:00: المساء ليس هادئًا تمامًا",
    night: "بين منتصف الليل و6:00",
    tooFew: (x: RestockTimesView) => <b>الأيام أقل من أن نحدد ساعة معتادة{x.t.n > 0 ? "" : " بعد"}: {x.t.n > 0 ? `تأكد التوفر ${count(x.t.n, TIMES)} على مدى ${count(x.t.days, DAYS)}` : "لم يتأكد أي توفر"} منذ {longDate(x.t.since)}.</b>,
    tooFewKeys: (): Point[] => [
      { text: <>الساعة المعتادة تحتاج <b className="text-ink">{N(PATTERN_MIN)} حالات توفر على {count(PATTERN_MIN_DAYS, DAYS)} مختلفة</b></> },
      { text: <>عشر حالات توفر في دفعة واحدة = حدث واحد، لا عادة</>, no: true },
      { text: <>تعيد الصفحة كتابة نفسها مع تراكم الأيام</>, step: true },
    ],
    hourCaption: (x: RestockTimesView) => `توفر iPhone Duo ${rtIn(x)} حسب الساعة المحلية للمتجر، من ${dateLabel(x.t.since, false)} حتى اليوم (${N(x.t.n)} إجمالًا)`,
    hourHead: ["الساعة المحلية", "التوفر", "النسبة"],
    morningKeys: (x: RestockTimesView): Point[] => [
      { text: <>تجمّع الصباح <b className="text-ink">ليس موعد فتح الأبواب</b>{x.us ? ": معظم متاجر Apple الأمريكية تفتح الساعة 10:00" : ""}</> },
      { text: <>مخزون الاستلام يُطرح <b className="text-ink">أونلاين</b>، قبل أن تُفتح الأبواب</> },
      { text: <>يدويًا: راقب <b className="text-ink">{rangeLabel(x.w.from, x.w.to)}</b> صباح أيام العمل</>, step: true },
      { text: <>ودع <Link href={x.alert}>التنبيه</Link> يراقب <b className="text-ink">الساعات الـ22 الأخرى</b> التي لا يحدّث فيها أحد الصفحة</>, step: true },
    ],
    storeChartKeys: (x: RestockTimesView): Point[] => [{ text: <>لكل صفحة متجر مخططها الخاص بتوقيتها (<Link href={x.storesHref}>{x.us ? "متاجر Apple حسب الولاية" : `المتاجر ${rtIn(x)}`}</Link>): متجر يتوفر فيه المخزون الساعة 8:00 بينما يأتي غيره الساعة 9:00 يستحق أن تعرفه</>, step: true }],

    // ---- day by day
    dayLead: (x: RestockTimesView) => {
      const { t, tracked, one } = x;
      return t.n > 0 && tracked === 1 ? (
        <b>يوم واحد من التتبع حتى الآن ({dateLabel(t.daily[t.daily.length - 1]?.date ?? t.since)})، تأكد فيه التوفر {count(t.n, TIMES)}{one ? "" : ` في ${count(t.stores, STORES_G)}`}.</b>
      ) : t.n > 0 ? (
        <b>{t.days === tracked ? `كل يوم تتبعناه (${N(t.days)} من ${N(t.days)}) شهد` : `${N(t.days)} من ${count(tracked, DAYS)} منذ ${longDate(t.since)} شهدت`} توفرًا مؤكدًا واحدًا على الأقل{t.peakWeekday != null ? `، وكان ${weekdayName(t.peakWeekday)} أكثر الأيام توفرًا` : ""}.</b>
      ) : (
        <b>لا توفر مؤكدًا {rtIn(x)} منذ {longDate(t.since)}.</b>
      );
    },
    daysTracked: "أيام تتبع شهدت توفرًا واحدًا على الأقل",
    busiestDay: (x: RestockTimesView, day: DayRow) => `أكثر الأيام توفرًا: ${dateLabel(day.date)}${x.one ? "" : `، في ${count(day.stores, STORES_G)}`}`,
    busiestDayNone: "أكثر الأيام توفرًا",
    drop: (x: RestockTimesView, drop: { at: string; restocks: number }) => `متاجر توفر فيها المخزون خلال نصف ساعة واحدة، ${zoneStamp(drop.at, x.c)} (${count(drop.restocks, CONFIGS)}): طرح على مستوى الدولة يُرى من الخارج`,
    weekend: (x: RestockTimesView) => `في عطلة نهاية الأسبوع، السبت أو الأحد (${x.weekend === 0 ? "لا شيء بعد" : count(x.weekend, TIMES)})`,
    dayCaption: (x: RestockTimesView) => `توفر iPhone Duo ${rtIn(x)}، يومًا بيوم${x.t.reports.length ? "؛ والصفوف المعلَّمة «مُبلَّغ عنه» ملاحظات منشورة لمتتبعات أخرى عن الأيام التي سبقت بدء تتبعنا، معروضة للتسلسل الزمني فقط" : ""}`,
    dayHead: { date: "التاريخ", restocks: "التوفر", stores: "المتاجر", busiest: "أكثر ساعة", source: "المصدر" },
    soFar: " · حتى الآن",
    reportedBy: (names: string[]) => <>أبلغت عنه {names.join(" / ")}</>,
    dayKeys: (x: RestockTimesView, launch: string, resumed: string): Point[] => [
      { text: <><b className="text-ink">{dateLabel(launch)}</b>: يوم الإطلاق، وأولى الوحدات لطلبات الأونلاين</> },
      { text: <><b className="text-ink">{dateLabel(resumed)}</b>: عادت حجوزات الاستلام{x.us ? " (MacRumors)" : ""}</> },
      x.t.reports.length
        ? { text: <>الصفوف المعلَّمة <b className="text-ink">مُبلَّغ عنه</b>: ملاحظات {x.reportNames.join(" و")} في أسبوع الإطلاق، ولا تُحتسب أبدًا</> }
        : { text: <>سجلّنا لكل متجر {rtIn(x)} يبدأ <b className="text-ink">{longDate(x.t.since)}</b></> },
      ...(x.t.n > 0 && x.t.peakWeekday == null ? [{ text: <>أكثر أيام الأسبوع توفرًا: نذكره حين تغطي البيانات <b className="text-ink">{count(WEEKDAY_MIN_SPAN, DAYS)}</b> (بياناتنا تغطي {count(x.tracked, DAYS)})</>, no: true }] : []),
      { text: <>اقرأ عمود <b className="text-ink">المتاجر</b>: العدد نفسه من حالات التوفر موزعًا على متاجر أكثر يعني يومًا أفضل لك</>, step: true },
    ],

    // ---- where
    whereLead: (x: RestockTimesView, hit: { name: string; restocks: number; stores: number; storesTotal: number }[], total: number) => (
      <b>{hit[0].name}: توفر {count(hit[0].restocks, TIMES)} في {N(hit[0].stores)} من {count(hit[0].storesTotal, STORES_G)} منذ {dateLabel(x.t.since, false)}{hit[1] ? <>، ثم {hit[1].name} ({N(hit[1].restocks)})</> : null}{hit[2] ? <> و{hit[2].name} ({N(hit[2].restocks)})</> : null}؛ {hit.length === total ? `وشهدت كل ال${rtUnits(x)} توفرًا واحدًا على الأقل` : `وشهدت ${N(hit.length)} من ${rtUnitsOf(x, total)} توفرًا، ولم تشهد ${N(total - hit.length)} أي توفر بعد`}.</b>
    ),
    whereNone: (x: RestockTimesView) => x.place?.kind === "city"
      ? <b>لم يشهد أي متجر {rtIn(x)} توفرًا مؤكدًا بعد؛ يمتلئ الجدول من أول حالة.</b>
      : x.place
        ? <b>لم تشهد أي مدينة {rtIn(x)} توفرًا مؤكدًا بعد؛ يمتلئ الجدول من أول حالة.</b>
        : <b>لم تشهد أي {rtRegion(x)} توفرًا مؤكدًا بعد؛ يمتلئ الجدول من أول حالة.</b>,
    regionCaption: (x: RestockTimesView) => `توفر iPhone Duo المؤكد ${rtIn(x)} حسب ال${rtUnit(x)}، من ${dateLabel(x.t.since, false)} حتى اليوم`,
    regionHead: (x: RestockTimesView) => [`ال${rtUnit(x)}`, "التوفر", "متاجر شهدت توفرًا", "آخر توفر (بالتوقيت المحلي)"],
    ofN: (a: number, b: number) => <>{N(a)} من {N(b)}</>,
    storesCaption: (x: RestockTimesView) => `المتاجر الأكثر توفرًا لـiPhone Duo ${rtIn(x)}، من ${dateLabel(x.t.since, false)} حتى اليوم`,
    storesHead: ["المتجر", "التوفر", "الأيام", "غالبًا نحو", "الأخير (بالتوقيت المحلي)"],
    swaps: (x: RestockTimesView) => [
      { no: "المتجر صاحب أكثر حالات التوفر، أينما كان", yes: `متجران أو ثلاثة يمكنك الوصول إليها خلال ساعة من ${x.pattern ? `الساعة ${hourLabel(x.w.from)}` : "الصباح"}`, why: "التوفر الذي لا تستطيع الوصول إليه ليس توفرًا؛ حتى أكثر المتاجر توفرًا يقول «غير متوفر» طوال اليوم إلا بضع دقائق." },
      { no: "متجر واحد، والأمل", yes: "تنبيه على كلٍّ منها، ثم انطلق إلى المتجر الذي يصلك إشعاره", why: "جدول الأعداد يخبرك فقط بأي متاجرك تبدأ." },
    ],
    nearMe: "متاجر فيها Duo قريبة مني الآن",

    // ---- configuration
    configLead: (x: RestockTimesView, top: { label: string; restocks: number }, rarest: { label: string; restocks: number } | null) => (
      <b>{top.label}: {N(top.restocks)} من حالات التوفر الـ{N(x.t.n)} ({rtPct(top.restocks / x.t.n)}){rarest ? `؛ والأندر ${rarest.label}، وقد توفر ${count(rarest.restocks, TIMES)}` : ""}.</b>
    ),
    mostRestocked: (config: string) => `${config}: الخيار الأكثر توفرًا`,
    versus: (a: string, bCount: number, b: string) => `حالات توفر ${a}، مقابل ${N(bCount)} لـ${b}`,
    restocksOf: (a: string) => `حالات توفر ${a}`,
    byStorage: "حسب السعة",
    byColour: "حسب اللون",
    configNone: (x: RestockTimesView) => <b>لم يشهد أي خيار {rtIn(x)} توفرًا مؤكدًا{x.t.n > 0 ? "" : " بعد"}؛ والخيارات الـ{N(x.configs)} مدرجة ليجد أول توفر صفًا يدخل فيه.</b>,
    configCaption: (x: RestockTimesView) => `توفر iPhone Duo المؤكد ${rtIn(x)} حسب الخيار، من ${dateLabel(x.t.since, false)} حتى اليوم`,
    configHead: ["الخيار", "التوفر", "النسبة", "آخر توفر (بالتوقيت المحلي)"],
    configKeys: (x: RestockTimesView): Point[] => [
      { text: <>قرار الخيار أهم <b className="text-ink">من قرار المتجر</b></> },
      x.storageRatio != null
        ? { text: <>السعة الأكثر توفرًا عادت نحو <b className="text-ink">{x.storageRatio}×</b> مرات السعة التالية: نوافذ استلام سابقة أكثر، لا وعدٌ بالقادم</> }
        : { text: <>السعة الأكثر توفرًا كانت لها أكثر نوافذ الاستلام السابقة؛ والجدول يبيّن <b className="text-ink">بكم</b></> },
      { text: <>سعة <b className="text-ink">2TB</b>: هاتف تطلبه للتوصيل وتنتظره</>, no: true },
      { text: <>الأسعار والمتوفر الآن: <Link href="/which-iphone-duo-restocks-most">أي خيارات iPhone Duo تتوفر أكثر؟ (بالإنجليزية)</Link></>, step: true },
    ],

    // ---- how long
    howLongLead: (x: RestockTimesView, sell: SelloutFacts) => <b>نصف حالات التوفر التي نفدت {rtIn(x)} (وعددها {N(sell.n)}) اختفت خلال {secs(sell.medianSec)}؛ و{rtPct(sell.within2min)} خلال دقيقتين، و{rtPct(sell.within20min)} خلال 20 دقيقة.</b>,
    secUnit: "ث",
    medianListing: "مدة العرض المعتادة، من الظهور حتى الاختفاء (الوسيط)",
    within2: "نفد خلال دقيقتين",
    within20: "نفد خلال 20 دقيقة",
    fastest: "أسرع نفاد قسناه",
    howLongNone: (x: RestockTimesView) => <b>حالات النفاد {rtIn(x)} أقل من أن تُقاس{x.t.n > 0 ? "" : " بعد"}؛ نذكر هذه الأرقام بدءًا من عشر حالات، والصفحة الأمريكية فيها الصورة الكاملة.</b>,
    howLongKeys: (x: RestockTimesView): Point[] => [
      { text: <>نافذة الدقيقتين يلتقطها <b className="text-ink">التنبيه</b>، لا تحديث apple.com</> },
      { text: <>هذا هو الرقم الذي يفسّر كل ما عداه في هذه الصفحة</> },
      { text: <>كل توفر بالثواني التي دامها، حسب الخيار وال{rtRegion(x)}: <Link href="/iphone-duo-sell-out-times">كم يصمد توفر iPhone Duo قبل النفاد؟ (بالإنجليزية)</Link></>, step: true },
    ],
    measured: "كل رقم هو الوقت من الفحص الذي رأى الخيار معروضًا أول مرة إلى الفحص الذي رآه قد اختفى، فهو حدٌّ أعلى؛ والأعمار الحقيقية أقصر. وهي المدة التي عرضت فيها صفحة الاستلام في Apple هذا الخيار، لا عدد الوحدات المبيعة.",

    // ---- unavailable
    unavailableLead: (x: RestockTimesView) => <b>لأن التوفر ومضة لا حالة دائمة: {x.one ? "متجر واحد" : count(x.stores, STORES)} × {count(x.configs, CONFIGS)} = {N(x.pairs)} احتمالًا للتوفر {rtIn(x)}، وعدد المتاجر التي تعرض أي iPhone Duo في هذه اللحظة: {N(x.duoNow)}.</b>,
    pairs: "أزواج «متجر × خيار» يمكن أن تتوفر",
    listingNow: "تعرض iPhone Duo للاستلام في هذه اللحظة",
    goneIn2: "من حالات التوفر نفدت خلال دقيقتين",
    last24: "توفر مؤكد خلال آخر 24 ساعة",
    unavailableKeys: (x: RestockTimesView, today: number): Point[] => [
      x.recent.restocks > 0
        ? { text: <>آخر 24 ساعة: <b className="text-ink">توفر مؤكد {count(x.recent.restocks, TIMES)}</b> في {count(x.recent.stores, STORES_G)} {rtIn(x)}</> }
        : today > 0
          ? { text: <>اليوم: <b className="text-ink">توفر مؤكد {count(today, TIMES)}</b> {rtIn(x)}</> }
          : { text: <>جدول «يومًا بيوم» أعلاه يُظهر حالات التوفر التي حدثت فعلًا</> },
      { text: <>كلٌّ منها ظهر على apple.com <b className="text-ink">لدقيقة أو دقيقتين</b></> },
      { text: <>«غير متوفر في كل مكان» في اليوم الرابع أو الرابع عشر <b className="text-ink">لا</b> يعني أن Apple توقفت</>, no: true },
    ],
    unavailableLinks: { explained: "ماذا تعني «غير متوفر حاليًا للاستلام» (بالإنجليزية)", howToGet: "كيف تحصل على iPhone Duo (بالإنجليزية)" },

    // ---- reddit
    redditLead: (x: RestockTimesView) => <b>معظم الحكمة الشعبية في <a href="https://www.reddit.com/r/applestore/" target="_blank" rel="noopener nofollow">r/applestore</a> و<a href="https://www.reddit.com/r/iphone/" target="_blank" rel="noopener nofollow">r/iphone</a> صادقة، لكنها عن متجر واحد وتتقادم خلال يوم؛ وهذه أكثر أربعة ادعاءات نراها، في مقابل حالات التوفر المؤكدة الـ{N(x.t.n)} {rtIn(x)}.</b>,
    redditCaption: "ادعاءات شائعة على Reddit عن توفر iPhone Duo، مقارنةً بحالات التوفر التي أكدها PickupChecker",
    redditHead: ["الادعاء", "ماذا تقول البيانات"],
    claims: (x: RestockTimesView): { claim: string; answer: ReactNode }[] => {
      const { t, w, tracked, recent } = x;
      return [
        { claim: "«المتاجر تتوفر ليلًا، افحص الساعة 3 فجرًا.»", answer: t.n > 0 ? <>{rtPct(hourShare(t.byHour, 0, 6))} من حالات التوفر وقعت بين منتصف الليل و6:00 بالتوقيت المحلي؛ و{rtPct(w.share)} {between(w.from, w.to)}.</> : zero },
        { claim: "«Apple لا توفّر إلا في يوم واحد من الأسبوع.»", answer: t.n > 0 ? (t.peakWeekday != null ? <>{weekdayName(t.peakWeekday)} هو الأكثر حتى الآن ({N(t.byWeekday[t.peakWeekday])} من {N(t.n)})، لكن التوفر وقع في {N(t.days)} من الأيام الـ{N(tracked)} التي تتبعناها.</> : <>وقع التوفر في {N(t.days)} من الأيام الـ{N(tracked)} التي تتبعناها{t.days === tracked ? "، دون يوم فارغ" : ""}؛ ونذكر أكثر أيام الأسبوع توفرًا حين تغطي البيانات {count(WEEKDAY_MIN_SPAN, DAYS)}.</>) : zero },
        { claim: "«اتصل بالمتجر واسأل متى تصل الشحنة.»", answer: "لا تنشر Apple أي جدول للتوفر؛ وما يصل إلى apple.com هو مخزون استلام يُطرح أونلاين، ويراه المتجر في اللحظة نفسها التي يراه فيها الجميع." },
        { claim: "«إذا قال غير متوفر، فقد نفد نهائيًا.»", answer: recent.restocks > 0 ? <>حالات التوفر المؤكدة خلال آخر 24 ساعة ({N(recent.restocks)} في {count(recent.stores, STORES_G)}) تقول غير ذلك؛ وكلٌّ منها عاد «غير متوفر» خلال دقائق.</> : t.n > 0 ? <>حالات التوفر المؤكدة الـ{N(t.n)} منذ {dateLabel(t.since, false)} تقول غير ذلك؛ وكلٌّ منها عاد «غير متوفر» خلال دقائق.</> : "لا شيء نختبره به بعد." },
      ];
    },
    redditKeys: (): Point[] => [
      { text: <>الشائعة هي ما يلجأ إليه الناس حين <b className="text-ink">لا توجد بيانات</b>؛ وهذه الصفحة هي البيانات، ومجانية للقراءة</> },
      { text: <>حيث يصيب Reddit: <b className="text-ink">نصائح الدفع</b>، سجّل الدخول وجهّز Apple Pay (<Link href="/how-to-grab-an-iphone-duo-restock">نسختنا في 20 ثانية، بالإنجليزية</Link>)</> },
    ],

    // ---- method
    methodLead: <b>نحتسب التوفر حين يعرض apple.com خيارًا للاستلام من متجر لم يكن معروضًا فيه، ويؤكده فحصان متطابقان.</b>,
    methodKeys: (x: RestockTimesView): Point[] => [
      { text: <>{x.one ? `متجر Apple ${rtIn(x)}` : `كل متجر Apple ${rtIn(x)}`} كل <b className="text-ink">{secs(SPEED.checkSec)}</b>؛ والمتاجر التي تشير إليها التنبيهات كل <b className="text-ink">{secs(SPEED.fastSec)}</b></> },
      { text: <>المتتبعات الأخرى تعلن على مواقعها فواصل فحص <b className="text-ink">من 5 ثوانٍ إلى 15 دقيقة</b>؛ لم نقسها بأنفسنا، لذا نقارن بما تعلنه فقط</> },
      { text: <>أول «متوفر» نعيد السؤال عنه <b className="text-ink">بعد نحو ثانية</b> قبل أن يُحتسب</> },
      { text: <>العرض الذي يختفي يتأكد في <b className="text-ink">الجولة التالية</b></> },
      { text: <>أول رؤية لمتجر، أو طلب فاشل أو انتهت مهلته: <b className="text-ink">لا يُحتسب أبدًا</b> توفرًا ولا «نفادًا»</>, no: true },
      { text: <>الساعات والتواريخ <b className="text-ink">بالتوقيت المحلي</b> لكل متجر؛ و«الموجات» = نصف الساعة نفسه عبر المناطق الزمنية</> },
      { text: <>تقارير المتتبعات الأخرى{x.t.reports.length ? ` (${x.reportNames.join("، ")})` : ""}: صفوف خاصة بها ومعلَّمة، <b className="text-ink">ولا تدخل أي مجموع</b></> },
      { text: <>تتحدث كل خمس دقائق تقريبًا؛ و<Link href={x.logHref}>سجل التوفر</Link> نفسه مباشر</>, step: true },
    ],
    quote: "يسعدنا أن تقتبس هذه الأرقام مع رابط إلى هذه الصفحة؛ PickupChecker مستقل ولا يتبع Apple، ويقرأ توفر الاستلام نفسه الذي يراه أي شخص على apple.com، لكن بتكرار أكبر بكثير.",
    alertIn: (x: RestockTimesView) => <>فعّل تنبيه iPhone Duo{x.one ? "" : ` ${rtIn(x)}`}</>,

    // ---- related, FAQ, sources
    related: "أسئلة iPhone Duo الأخرى",
    sameData: "إجابات من البيانات نفسها (بالإنجليزية)",
    questions: {
      sellOut: "كم يصمد التوفر قبل النفاد؟",
      alerts: "أسرع طريقة لتلقي الإشعار",
      howToGet: "كيف تحصل عليه فعلًا",
      whichConfig: "أي خيار يتوفر أكثر",
      nearMe: "متاجر قريبة منك فيها الآن",
      unavailable: "ماذا تعني «غير متوفر»",
    },
    otherCountries: (us: boolean): string => (us ? "الصفحة نفسها لدول أخرى" : "دول أخرى"),
    place: {
      byCity: "حسب المدينة",
      storesLive: (x: RestockTimesView) => `متاجر Apple ${rtIn(x)}، مباشرةً`,
      countryPage: (c: Country) => `أوقات توفر iPhone Duo ${inC(c)}`,
      sourcesWhere: (x: RestockTimesView) => `${x.stores === 1 ? "متجر Apple" : theStores(x.stores)} ${rtIn(x)}`,
    },
    faqTitle: "أسئلة",
  },
};
