/**
 * العربية: place — عناوين صفحات الإمارات (/ar-ae/…) ومقدّماتها بأسلوب «الجواب أولًا»، وأقسام الكلمات المفتاحية، والسعر
 * والضريبة، والأسئلة الشائعة، مبنية من البيانات الحية. لا يلزم أن تصحّ إلا للإمارات (ae)، وتبقى معقولة لغيرها.
 * كلمات البحث (Google Ads، الإمارات، بالعربية، شهريًا): ايفون 18 برو ماكس 6,600 · ابل ستور / آبل ستور 1,900 · متجر ابل 1,000 ·
 * ابل ياس مول 720 · ابل دبي مول 480 · ابل ستور الامارات 480 · ايفون 18 برو 480 · سعر ايفون 18 برو ماكس 390 ·
 * ابل الجيمي مول 320 · ايفون دو 210 · ابل ستور دبي مول 140 · ابل ستور ياس مول 110 · ابل مول الامارات 50 ·
 * ابل ستور ابوظبي 50 · ابل ستور العين 40 · فروع ابل في الامارات 30. كلمات «توفر/مخزون» شبه معدومة البحث، لذا تبدأ
 * العناوين باسم المتجر أو العلامة أو الطراز ثم الوعد. العرض ≤ 60 (fitTitleW)، والوصف ≤ 155.
 */
import { MODELS, catalogFor, citiesWithStores, statesWithStores, storesOf, modelByKey, type ModelKey, type Store } from "@/lib/apple/catalog";
import { COUNTRIES, type Country, type CountryCode } from "@/lib/apple/countries";
import { CA_PROVINCE_TAX, TAX_SOURCES, beforeTax, includedRate, pickupHelp, storeListSource, withProvinceTax } from "@/content/country-tax";
import { priceOf, priceRange, scarcest, pairsPct, duoStoresNow, INTL_TRACKING_SINCE, type IntlPlaceInput, type HomeCopyInput, type RestockTimesBrief } from "@/lib/seo/countryCopy";
import { alertHref, type FaqItem } from "@/lib/seo/enrich";
import type { Block, Faq } from "@/lib/content/types";
import type { KeywordSection } from "@/components/content/KeywordSections";
import { price as priceIn, stamp, list, hour, fitTitleW } from "@/lib/i18n/format";
import { appleStoreLabel, cityLabel, configLabel, regionLabel, storeLabel } from "@/lib/i18n/places";
import type { Dict } from "../en";
import { content } from "./content";
import {
  APPLE_STORES, CITIES_G, L, N, SEARCHED_MODEL, STORES_G, TIMES, allWord, biCountry, count, country, currencyAr, durAr, inCountry,
  regionNoun, regionsCount, taxAr, theStores, theStoresG,
} from "./util";

/** Arabic spellings people search, once in a price heading on the model pages (ايفون 18 برو ماكس 6,600 a month; سعر … 390). */
const priceName = (model: ModelKey, name: string) => (model === "duo" ? name : `${name} (${SEARCHED_MODEL[model]})`);

const money = (c: Country, v: number) => priceIn(L, c, v);
const listAr = (items: string[], max = 6) => list(L, items, max, (n) => content.listMore(N(n)));
const pctAr = (n: number) => `${N(n)}%`;
/** A place's name in Arabic (already Arabic stays). */
const placeAr = (i: Pick<IntlPlaceInput, "cc" | "kind" | "name">) => (i.kind === "city" ? cityLabel(i.cc, i.name, L) : regionLabel(i.cc, i.name, L));
const provinceAr = (p: string) => regionLabel("ca", p, L);
/** "256GB Night Sky" → "256GB سماء الليل". */
const cfgAr = (label: string) => { const [storage, ...rest] = label.split(" "); return configLabel({ storage, color: rest.join(" ") }, L); };
/** Where the shop is: "apple.com/ae (بالإنجليزية)" — Apple's UAE store has no Arabic checkout. */
const shopOf = (c: Country) => `apple.com/${c.buyPath ?? c.shopPath}${c.cc === "ae" ? " (بالإنجليزية)" : ""}`;

function sinceWhen(now = Date.now()): string {
  return now - Date.parse(`${INTL_TRACKING_SINCE}T00:00:00Z`) < 30 * 86400_000 ? "منذ بدء التتبع في 2 نوفمبر" : "خلال آخر 30 يومًا";
}
/** "3 نوفمبر، 10:04 ص بتوقيت الإمارات" (the country's zone). */
function whenIn(cc: CountryCode, iso: string | Date): string {
  return cc === "ae" ? `${stamp(L, iso, COUNTRIES[cc].timeZone)} بتوقيت الإمارات` : stamp(L, iso, COUNTRIES[cc].timeZone, true);
}

/* ------------------------------------------------------------------ tax */

/** Arabic sources where one exists (the UAE's Federal Tax Authority has an Arabic page). */
function taxSource(cc: Exclude<CountryCode, "us">) {
  return cc === "ae" ? { label: "الهيئة الاتحادية للضرائب: ضريبة القيمة المضافة", url: "https://tax.gov.ae/ar/taxes/vat.aspx" } : TAX_SOURCES[cc];
}

function taxSentence(cc: CountryCode, region?: string): string {
  const c = COUNTRIES[cc];
  const duo = priceOf(cc, "duo");
  if (duo == null) return "";
  if (cc === "ca") {
    const t = region ? withProvinceTax(duo, region) : null;
    if (t) return `سعر Apple لجهاز iPhone Duo بسعة 256GB هو ${money(c, duo)} قبل الضريبة؛ ومع ضريبة ${provinceAr(region!)} البالغة ${t.rate}% (${CA_PROVINCE_TAX[region!].label}) يصل إلى نحو ${money(c, t.total)}.`;
    return `سعر Apple لجهاز iPhone Duo بسعة 256GB هو ${money(c, duo)} قبل الضريبة، وتُضاف إليه 5% إلى 15% حسب المقاطعة.`;
  }
  const r = includedRate(c);
  if (r == null) return `سعر iPhone Duo بسعة 256GB هو ${money(c, duo)}، ولا ضريبة مبيعات في هونغ كونغ، فهذا ما تدفعه عند الاستلام.`;
  return `سعر iPhone Duo بسعة 256GB ${inCountry(cc)} هو ${money(c, duo)} شاملًا ${taxAr(c)} ${r}%: سعر apple.com هو ما تدفعه عند الاستلام.`;
}

const PRICE_ROWS: [ModelKey, string][] = [["duo", "256GB"], ["duo", "1TB"], ["18-pro-max", "256GB"], ["18-pro-max", "1TB"], ["18-pro", "256GB"]];

function priceSection(cc: CountryCode, placeName: string, region?: string, model: ModelKey = "duo"): KeywordSection {
  const c = COUNTRIES[cc];
  const m = modelByKey(model)!;
  const base = priceOf(cc, model) ?? 0;
  const src = taxSource(cc as Exclude<CountryCode, "us">);
  const rows: [string, number][] = PRICE_ROWS.flatMap(([k, st]) => { const p = priceOf(cc, k, st); return p == null ? [] : [[`${modelByKey(k)!.name} ${st}`, p] as [string, number]]; });
  if (cc === "ca") {
    const t = region ? CA_PROVINCE_TAX[region] : undefined;
    if (t) {
      const pa = provinceAr(region!);
      return {
        id: "price-with-tax",
        h2: `كم سعر ${m.name} شاملًا الضريبة في ${placeName}؟`,
        lead: `سعر ${m.name} بسعة 256GB هو **${money(c, base)} قبل الضريبة**؛ ومع ضريبة ${pa} (${t.label}، ${t.total}%) يصل إلى نحو **${money(c, withProvinceTax(base, region!)!.total)}** في متجر في ${placeName}.`,
        blocks: [
          { t: "note", text: "**الضريبة تُحتسب حيث تستلم:** مقاطعة المتجر هي التي تحدد النسبة، لا عنوان سكنك." },
          { t: "table", head: ["iPhone", "سعر apple.com", `شاملًا ${t.total}%`], rows: rows.map(([label, p]) => [label, money(c, p), money(c, withProvinceTax(p, region!)!.total)]), caption: `${pa}: سعر Apple في كندا مع ${t.label} (${t.total}%)`, source: `[${src.label}](${src.url})؛ الأسعار من ${shopOf(c)}` },
        ],
      };
    }
    const provinces = Object.keys(CA_PROVINCE_TAX).filter((p) => storesOf("ca").some((s) => s.state === p));
    const cheapest = provinces.reduce((a, b) => (CA_PROVINCE_TAX[b].total < CA_PROVINCE_TAX[a].total ? b : a));
    const dearest = provinces.reduce((a, b) => (CA_PROVINCE_TAX[b].total > CA_PROVINCE_TAX[a].total ? b : a));
    return {
      id: "price-with-tax",
      h2: `كم سعر ${m.name} في كندا شاملًا الضريبة؟ حسب المقاطعة`,
      lead: `سعر Apple البالغ **${money(c, base)}** لجهاز ${m.name} بسعة 256GB لا يشمل الضريبة؛ تضيفها مقاطعة متجر الاستلام، من **${money(c, withProvinceTax(base, cheapest)!.total)}** في ${provinceAr(cheapest)} (${CA_PROVINCE_TAX[cheapest].total}%) إلى **${money(c, withProvinceTax(base, dearest)!.total)}** في ${provinceAr(dearest)} (${CA_PROVINCE_TAX[dearest].total}%).`,
      blocks: [{
        t: "table",
        head: ["المقاطعة", "الضريبة", "النسبة", `${m.short} 256GB شاملًا الضريبة`],
        rows: provinces.map((p) => [provinceAr(p), CA_PROVINCE_TAX[p].label, `${CA_PROVINCE_TAX[p].total}%`, money(c, withProvinceTax(base, p)!.total)]),
        caption: "المقاطعات التي فيها متجر Apple: ضريبة الاستلام من المتجر",
        source: `[${src.label}](${src.url})؛ الأسعار من ${shopOf(c)}`,
      }],
    };
  }
  const r = includedRate(c);
  const tn = taxAr(c);
  return {
    id: "price",
    h2: r == null ? `كم سعر ${priceName(model, m.name)} ${inCountry(cc)}؟ من ${money(c, base)} بلا ضريبة` : `كم سعر ${priceName(model, m.name)} ${inCountry(cc)}؟ من ${money(c, base)} شاملًا الضريبة`,
    lead: r == null
      ? `**${money(c, base)}** لجهاز ${m.name} بسعة 256GB على apple.com هو ما تدفعه عند الاستلام في ${placeName}: لا **ضريبة مبيعات** ولا ضريبة قيمة مضافة في هونغ كونغ.`
      : `سعر ${m.name} بسعة 256GB ${inCountry(cc)} هو **${money(c, base)}**، **شاملًا ${tn} ${r}%** (${money(c, beforeTax(c, base))} قبل الضريبة)، ولا يُضاف شيء عند الاستلام في ${placeName}.`,
    blocks: [{
      t: "table",
      head: r == null ? ["iPhone", "سعر apple.com"] : ["iPhone", "سعر apple.com", `قبل ${tn} ${r}%`],
      rows: rows.map(([label, p]) => (r == null ? [label, money(c, p)] : [label, money(c, p), money(c, beforeTax(c, p))])),
      caption: `أسعار Apple ${inCountry(cc)}${r == null ? "" : `، شاملة ${tn}`}`,
      source: `[${src.label}](${src.url})؛ الأسعار من ${shopOf(c)}`,
    }],
  };
}

function taxFaq(cc: CountryCode, placeName: string, region?: string): FaqItem {
  const c = COUNTRIES[cc];
  const duo = priceOf(cc, "duo") ?? 0;
  if (cc === "ca") {
    const t = region ? withProvinceTax(duo, region) : null;
    return t
      ? { q: `كم سعر iPhone Duo شاملًا الضريبة في ${placeName}؟`, a: `نحو ${money(c, t.total)} لسعة 256GB: سعر Apple البالغ ${money(c, duo)} مع ضريبة ${provinceAr(region!)} (${t.rate}%، ${CA_PROVINCE_TAX[region!].label})، وتُحتسب حيث تستلم.` }
      : { q: "هل يشمل سعر Apple في كندا الضريبة؟", a: `لا. سعر iPhone Duo بسعة 256GB هو ${money(c, duo)} قبل الضريبة؛ وتضيف مقاطعة المتجر GST أو HST أو ضريبة المقاطعة، من 5% في ألبرتا إلى 14.975% في كيبيك.` };
  }
  const r = includedRate(c);
  return r == null
    ? { q: "هل توجد ضريبة مبيعات على iPhone في هونغ كونغ؟", a: `لا. لا ضريبة مبيعات ولا ضريبة قيمة مضافة في هونغ كونغ، لذا يكلّف iPhone Duo بسعة 256GB ${money(c, duo)} عند الاستلام، وهو سعر apple.com نفسه.` }
    : { q: `هل يشمل سعر apple.com ${inCountry(cc)} ${taxAr(c)}؟`, a: `نعم. سعر iPhone Duo بسعة 256GB البالغ ${money(c, duo)} يشمل ${taxAr(c)} ${r}%، ولا يُضاف شيء حين تستلمه من المتجر.` };
}

/* ------------------------------------------------------------------ emirate and city pages */

/** The place's own cities when an emirate page spans several ("أبوظبي والعين"). */
function citiesOf(i: IntlPlaceInput): string[] {
  return [...new Set(i.stores.map((s) => cityLabel(i.cc, s.city, L)))];
}

function placeTitle(i: IntlPlaceInput): string {
  const n = i.stores.length;
  const w = placeAr(i);
  const cities = citiesOf(i);
  const head = i.kind === "state" && cities.length > 1 ? listAr(cities) : w;
  const names = listAr(i.stores.map((s) => storeLabel(s, L)));
  return fitTitleW([
    ...(n <= 3 && i.kind === "city" ? [`ابل ستور ${w}: ${names} – مخزون iPhone مباشرة`] : []),
    `ابل ستور ${head}: مخزون iPhone Duo مباشرة في ${allWord(n)}`,
    `ابل ستور ${head}: مخزون iPhone Duo مباشرة`,
    `ابل ستور ${w}: مخزون iPhone Duo مباشرة في ${allWord(n)}`,
    `ابل ستور ${w}: مخزون iPhone اليوم`,
    `ابل ستور ${w}`,
  ]);
}

/** The description's price clause. */
function priceBit(cc: CountryCode, region?: string): string {
  const c = COUNTRIES[cc];
  const duo = priceOf(cc, "duo");
  if (duo == null) return "";
  if (cc === "ca") { const t = region ? withProvinceTax(duo, region) : null; return t ? `، ونحو ${money(c, t.total)} شاملًا ضريبة ${provinceAr(region!)}` : `، و${money(c, duo)} قبل الضريبة`; }
  return includedRate(c) == null ? `، وDuo من ${money(c, duo)}` : `، وDuo من ${money(c, duo)} شاملًا الضريبة`;
}

/** "iPhone Duo متوفر للاستلام الآن في 2، و18 Pro Max في 3" (zero: "لا iPhone Duo للاستلام الآن"). */
function nowBits(duo: number, pm: number, pickup = true): string {
  const d = duo === 0 ? `لا iPhone Duo ${pickup ? "للاستلام " : ""}الآن` : `iPhone Duo متوفر ${pickup ? "للاستلام " : ""}الآن في ${N(duo)}`;
  return `${d}، ${pm === 0 ? "ولا 18 Pro Max" : `و18 Pro Max في ${N(pm)}`}`;
}

function placeDescription(i: IntlPlaceInput): string {
  const n = i.stores.length;
  const w = placeAr(i);
  return fitTitleW([
    `${count(n, APPLE_STORES)} في ${w}: ${nowBits(i.stockNow.duo, i.stockNow["18-pro-max"])}. مخزون مباشر لكل متجر وأوقات التوفر${priceBit(i.cc, i.region)}.`,
    `${count(n, APPLE_STORES)} في ${w}: ${nowBits(i.stockNow.duo, i.stockNow["18-pro-max"], false)}. مخزون مباشر لكل متجر وأوقات التوفر.`,
  ], 155);
}

function placeIntro(i: IntlPlaceInput): string {
  const n = i.stores.length;
  const w = placeAr(i);
  const cities = i.kind === "state" && i.cities && i.cities > 1 ? `، موزّعة على ${count(i.cities, CITIES_G)}` : "";
  const of = n === 2 ? "منهما" : "منها";
  const duo = i.stockNow.duo === 0 ? `الآن لا يتوفر iPhone Duo للاستلام في أيٍّ ${of}` : `الآن iPhone Duo متوفر للاستلام في **${N(i.stockNow.duo)}** ${of}`;
  return `**${count(n, APPLE_STORES)}** في ${w}${cities}. ${duo}، و18 Pro Max في **${N(i.stockNow["18-pro-max"])}**، و18 Pro في **${N(i.stockNow["18-pro"])}**.`;
}

function duoLead(i: IntlPlaceInput): string {
  const n = i.stores.length;
  const have = duoStoresNow(i);
  const st = i.duo;
  if (have.length > 0) return `iPhone Duo معروض الآن في **${N(have.length)} من ${count(n, STORES_G)}**: ${listAr(have.map((s) => appleStoreLabel(s, L)), 4)}.`;
  if (st.month > 0) return `**لا يعرض أيٌّ من ${allWord(n)}** iPhone Duo الآن، لكنه توفر فيها **${count(st.month, TIMES)}** ${sinceWhen()}.`;
  return `**لا يعرض أيٌّ من ${allWord(n)}** iPhone Duo الآن، ولم يُسجَّل فيها أي توفر له ${sinceWhen()}.`;
}

function duoPoints(i: IntlPlaceInput, w: string, alert: string): Block[] {
  const n = i.stores.length;
  const have = duoStoresNow(i);
  const st = i.duo;
  const last = st.lastRestock ? i.stores.find((s) => s.storeNumber === st.lastRestock!.storeNumber) : undefined;
  const items: string[] = [];
  if (have.length > 0 && st.month > 0) items.push(`**المسجَّل ${sinceWhen()}:** توفر Duo ${count(st.month, TIMES)} في متاجر ${w}`);
  if (st.lastRestock && last) items.push(`**آخر توفر:** ${whenIn(i.cc, st.lastRestock.at)} في ${appleStoreLabel(last, L)}`);
  if (st.medianMs != null) items.push(`**مدة العرض المعتادة:** بقي Duo بعد توفره معروضًا نحو ${durAr(st.medianMs)} (الوسيط)`);
  items.push(`**أسرع طريق:** [فعّل تنبيه iPhone Duo في ${w}](${alert}) ${n === 1 ? "في المتجر" : n === 2 ? "في المتجرين كليهما" : n === 3 ? "في المتاجر الثلاثة كلها" : `في أقرب ${N(Math.min(n, 5))} متاجر تصل إليها`}`);
  items.push("**التنبيه الواحد** = متجر واحد × خيار محدد واحد؛ ويصل الإشعار بعد ثوانٍ من عرض المتجر له");
  const blocks: Block[] = [];
  if (have.length === 0 && st.month === 0) blocks.push({ t: "note", text: "**قد يتغير ذلك خلال دقيقة:** أسرع طريقة للحصول عليه هي التنبيه، لا تحديث apple.com." });
  blocks.push({ t: "ul", items });
  return blocks;
}

function placeSections(i: IntlPlaceInput): KeywordSection[] {
  const n = i.stores.length;
  const w = placeAr(i);
  const alert = alertHref({ model: "duo", state: i.regionSlug || undefined, city: i.kind === "city" ? i.citySlug : undefined, country: i.cc });
  const scarce = scarcest(i, "18-pro-max");
  const pm = catalogFor("18-pro-max", i.cc).length;
  const ofN = count(n, STORES_G);
  return [
    {
      id: "iphone-duo",
      h2: `أي متاجر Apple في ${w} فيها iPhone Duo الآن؟`,
      lead: duoLead(i),
      blocks: duoPoints(i, w, alert),
    },
    {
      id: "iphone-18-pro-max",
      h2: `ما مخزون iPhone 18 Pro Max في متاجر ${w}؟`,
      lead: `iPhone 18 Pro Max معروض في **${N(i.stockNow["18-pro-max"])} من ${ofN}**، و**${pctAr(pairsPct(i, "18-pro-max"))}** من أزواج «متجر × خيار» البالغة ${N(n * pm)} هنا متوفرة.`,
      blocks: [{ t: "ul", items: [
        ...(scarce.length ? [`**الأندر الآن:** ${listAr(scarce.map((x) => `${cfgAr(x.label)} (${N(x.stores)} من ${ofN})`))}`] : []),
        `**iPhone 18 Pro:** في ${N(i.stockNow["18-pro"])} من ${ofN}، و${pctAr(pairsPct(i, "18-pro"))} من الأزواج متوفرة`,
        `**المسجَّل ${sinceWhen()}:** ${i.max.month ? `توفر 18 Pro Max ${count(i.max.month, TIMES)}` : "لم يتوفر 18 Pro Max بعد"}`,
        ...(i.max.medianMs != null ? [`**مدة العرض المعتادة:** بقي Pro Max بعد توفره معروضًا نحو ${durAr(i.max.medianMs)} (الوسيط)`] : []),
      ] }],
    },
    priceSection(i.cc, w, i.cc === "ca" ? i.region : undefined),
  ];
}

/* ------------------------------------------------------------------ country: store index and home */

function storesIndexTitle(cc: CountryCode): string {
  const n = storesOf(cc).length;
  const w = inCountry(cc);
  return fitTitleW([
    `فروع ابل ستور ${w}: ${allWord(n)} ومخزون iPhone Duo مباشرة`,
    `فروع ابل ستور ${w}: مخزون iPhone Duo مباشرة`,
    `متاجر ابل ${w}: مخزون iPhone مباشرة`,
  ], 70);
}

function homeTitle(cc: CountryCode): string {
  const n = storesOf(cc).length;
  const head = `ابل ستور ${country(cc)}`;
  return fitTitleW([
    `${head}: مخزون iPhone في ${allWord(n)} كل 15 ثانية`,
    `${head}: مخزون iPhone في ${count(n, STORES_G)} كل 15 ثانية`,
    `${head}: مخزون iPhone كل 15 ثانية`,
    `${head}: مخزون iPhone مباشرة`,
    head,
  ]);
}

function homeH1(cc: CountryCode): string {
  const n = storesOf(cc).length;
  const branches = n === 1 ? "" : n === 2 ? " في الفرعين" : n <= 10 ? ` في الفروع ${allWord(n).replace(/^المتاجر /, "")}` : ` في الفروع الـ${N(n)}`;
  return `متجر ابل ${inCountry(cc)}: مخزون iPhone مباشرة${branches}`;
}

function allStoresPhrase(cc: CountryCode): string {
  return `${theStores(storesOf(cc).length)} ${inCountry(cc)}`;
}

/** Where the stores are: "في 3 مدن ضمن إمارتين" / "كلها في دبي" / "في دبي". */
function spreadPhrase(cc: CountryCode): string {
  const c = COUNTRIES[cc];
  const regions = statesWithStores(cc);
  const cities = citiesWithStores(cc);
  const n = storesOf(cc).length;
  if (n === 1) return `في ${cityLabel(cc, cities[0].name, L)}`;
  if (cities.length === 1) return `كلها في ${cityLabel(cc, cities[0].name, L)}`;
  if (!c.regionNoun || regions.length === 1) return `في ${count(cities.length, CITIES_G)}`;
  return `في ${count(cities.length, CITIES_G)} ضمن ${regionsCount(c, regions.length)}`;
}

function modelPageTitles(cc: CountryCode, model: ModelKey): { title: string; h2: string[] } {
  const m = modelByKey(model)!;
  const n = storesOf(cc).length;
  const ar = SEARCHED_MODEL[model];
  const w = inCountry(cc);
  return {
    title: fitTitleW([
      `${m.name} (${ar}) ${w}: المخزون والسعر مباشرة في ${count(n, STORES_G)}`,
      `${m.name} (${ar}) ${w}: المخزون والسعر مباشرة`,
      `${m.name} (${ar}) ${w}: المخزون والسعر`,
      `${m.name} (${ar}): المخزون والسعر`,
      `مخزون ${m.name} وسعره ${w}`,
    ], 70),
    h2: [`${m.name} قريب مني: أي متاجر Apple ${w} تعرضه الآن؟`, priceSection(cc, country(cc), undefined, model).h2],
  };
}

function priceFrom(cc: CountryCode, model: ModelKey): string {
  const c = COUNTRIES[cc];
  const r = priceRange(cc, model);
  if (cc === "ca") return `**${money(c, r.low)}** قبل الضريبة`;
  const rate = includedRate(c);
  return rate == null ? `**${money(c, r.low)}**` : `**${money(c, r.low)}** شاملة ${taxAr(c)} ${rate}%`;
}

function modelIntro(cc: CountryCode, model: ModelKey, inStock: number): string {
  const m = modelByKey(model)!;
  const n = storesOf(cc).length;
  const now = inStock === 0
    ? `**لا يعرض أيٌّ من ${theStoresG(n)} ${inCountry(cc)}** ${m.name} للاستلام الآن`
    : `**${N(inStock)} من ${theStoresG(n)} ${inCountry(cc)}** تعرض ${m.name} للاستلام الآن`;
  return `${now} (نفحصها **كل 15 ثانية**)؛ والأسعار من ${priceFrom(cc, model)}.`;
}

function modelDescription(cc: CountryCode, model: ModelKey, inStock: number): string {
  const c = COUNTRIES[cc];
  const m = modelByKey(model)!;
  const n = storesOf(cc).length;
  const r = priceRange(cc, model);
  const p = `${money(c, r.low)}${cc === "ca" ? " قبل الضريبة" : ""}`;
  return fitTitleW([
    `هل ${SEARCHED_MODEL[model]} متوفر ${inCountry(cc)}؟ ${m.name} معروض الآن في ${N(inStock)} من ${theStoresG(n)}. مخزون مباشر لكل متجر وخيار، من ${p}، وأوقات التوفر.`,
    `هل ${SEARCHED_MODEL[model]} متوفر ${inCountry(cc)}؟ معروض الآن في ${N(inStock)} من ${count(n, STORES_G)}. مخزون مباشر لكل متجر وخيار، من ${p}، وأوقات التوفر.`,
    `هل ${m.name} متوفر ${inCountry(cc)}؟ ${N(inStock)} من ${count(n, STORES_G)} تعرضه للاستلام الآن. مخزون مباشر لكل متجر وخيار، من ${p}، مع أوقات التوفر.`,
    `${m.name} ${inCountry(cc)}: ${N(inStock)} من ${count(n, STORES_G)} تعرضه الآن. مخزون الاستلام المباشر لكل متجر وخيار، وأوقات التوفر والتنبيهات.`,
  ], 155);
}

function modelRows(cc: CountryCode, storesNow: Record<ModelKey, number>, restocks: Record<ModelKey, number>): string[][] {
  const prefix = cc === "us" ? "" : `/${cc}`;
  return MODELS.map((m) => [`[${m.name}](${prefix}/stock/${m.slug})`, N(catalogFor(m.key, cc).length), N(storesNow[m.key] ?? 0), N(restocks[m.key] ?? 0)]);
}

function homeDescription(cc: CountryCode): string {
  const c = COUNTRIES[cc];
  const n = storesOf(cc).length;
  const cur = currencyAr(c.currency);
  const inCur = c.currency === "AED" ? "بالدرهم" : cur.startsWith("ال") ? `ب${cur}` : `بعملة ${cur}`;
  return fitTitleW([
    `ابل ستور ${country(cc)}: مخزون iPhone Duo و18 Pro وPro Max للاستلام في ${n === 1 ? "المتجر" : allWord(n).replace(/^المتاجر/, "الفروع")} كل 15 ثانية. ${n === 1 ? "الأسعار" : "أوقات التوفر والأسعار"} ${inCur}، وإشعار حين يتوفر في متجرك.`,
    `تحقق من مخزون iPhone Duo و18 Pro و18 Pro Max للاستلام في ${allStoresPhrase(cc)} مباشرة كل 15 ثانية. ${n === 1 ? "الأسعار" : "أوقات التوفر والأسعار"} ${inCur}، وإشعار فوري حين يتوفر في متجرك.`,
    `مخزون iPhone للاستلام في ${allStoresPhrase(cc)} مباشرة كل 15 ثانية. ${n === 1 ? "الأسعار" : "أوقات التوفر والأسعار"}، وإشعار فوري حين يتوفر في متجرك.`,
  ], 155);
}

function homeIntro(cc: CountryCode): string {
  const n = storesOf(cc).length;
  return `الآن يتوفر iPhone Duo للاستلام في **{{duo.storesNow}} من ${theStoresG(n)}** ${inCountry(cc)}، وiPhone 18 Pro في **{{pro.storesNow}}**، وiPhone 18 Pro Max في **{{pm.storesNow}}**.`;
}

function homeSections(i: HomeCopyInput): KeywordSection[] {
  const cc = i.cc;
  const c = COUNTRIES[cc];
  const stores = storesOf(cc);
  const n = stores.length;
  return [
    {
      id: "iphone-stock",
      h2: `مخزون iPhone ${inCountry(cc)}: Duo و18 Pro وPro Max حسب المتجر`,
      lead: `يقرأ PickupChecker توفر الاستلام من المتجر على apple.com لكل خيار في ${allStoresPhrase(cc)} كل 15 ثانية، حسب المتجر${n > 1 ? ` و${c.regionNoun ? `ال${regionNoun(c)}` : "المدينة"}` : ""} والخيار.`,
      blocks: [
        { t: "table", head: ["الطراز", "الخيارات", "متاجر فيها مخزون الآن", "مرات التوفر المسجلة"], rows: modelRows(cc, i.storesNow, i.restocks), caption: `ما يغطيه الفحص ${inCountry(cc)}، حتى {{asOf}}` },
        { t: "ul", items: [
          `**التغطية:** ${count(n, APPLE_STORES)} ${spreadPhrase(cc)} · الأسعار وأرقام القطع من Apple ${country(cc)}`,
          "**كل متجر كل 15 ثانية**، والمتاجر التي تتابعها بتنبيهاتك كل 5 ثوانٍ",
          "**فحصان قبل الاحتساب:** إجابة واحدة مضطربة من apple.com لا تظهر أبدًا كتوفر أو نفاد وهمي",
          `**كل تغيير مؤكد** يدخل [سجل التوفر](${i.restocksPath})، الذي تُبنى منه مخططات التوفر في ${i.index?.indexable ? `[صفحات المتاجر](${i.index.path})` : "صفحة المتجر"}`,
        ] },
        { t: "img", id: "phone-notification" },
      ],
    },
    priceSection(cc, country(cc)),
    {
      id: "alerts",
      h2: `كيف تعرف فور توفر iPhone في متجر Apple ${inCountry(cc)}؟`,
      lead: `الفحص مجاني؛ والمدفوع هو ألّا تضطر إلى الفحص. اختر ${n === 1 ? "متجر Apple" : "متاجر Apple التي يمكنك الوصول إليها"} والهاتف المحدد، فيصل إلى هاتفك إشعار بعد ثوانٍ من عرض ${n === 1 ? "المتجر" : "أيٍّ منها"} له للاستلام من المتجر.`,
      blocks: [
        { t: "ol", items: [
          "اضغط **نبّهني** واختر iPhone والسعة واللون.",
          n === 1 ? `حدّد المتجر: ${appleStoreLabel(stores[0], L)} في ${cityLabel(cc, stores[0].city, L)}.` : "حدّد المتاجر التي يمكنك الوصول إليها؛ الأقرب أولًا، مع المسافة بالكيلومتر على الطريق ووقت القيادة.",
          "على iPhone، أضف PickupChecker إلى الشاشة الرئيسية واسمح بالإشعارات ([طريقة التثبيت](/install)).",
          `حين يصل الإشعار افتح منه apple.com${cc === "ae" ? " (صفحة الشراء بالإنجليزية)" : ""} وأكمل الشراء مع الاستلام من ذلك المتجر.`,
        ] },
        { t: "table", head: ["الباقة", "السعر (بالدولار الأمريكي)", "التنبيهات"], rows: [["Plus", "$5 / الشهر", "10"], ["Pro", "$10 / الشهر", "20"], ["Max", "$20 / الشهر", "50"]], caption: "التنبيه الواحد = متجر واحد × خيار محدد واحد · التصفح مجاني ([الباقات](/pricing))" },
        { t: "note", text: "**رأينا:** iPhone Duo يستحق تنبيهًا في كل متجر يمكنك الوصول إليه؛ أما 18 Pro وPro Max فانظر إلى الأرقام المباشرة أولًا." },
        { t: "img", id: "apple-store-pickup-counter" },
      ],
    },
  ];
}

function homeFaq(cc: CountryCode, rt: RestockTimesBrief): Faq[] {
  const n = storesOf(cc).length;
  const p = cc === "us" ? "" : `/${cc}`;
  const when = rt.n === 0
    ? `لم يتأكد أي توفر بعد منذ بدء التتبع في 2 نوفمبر. صفحة [متى يتوفر iPhone Duo ${inCountry(cc)}؟](${rt.path}) تحصي كل حالة حسب الساعة واليوم بالتوقيت المحلي فور حدوثها.`
    : rt.peakHour != null
      ? `أغلب حالات التوفر تقع نحو **الساعة ${hour(L, rt.peakHour, true)} بالتوقيت المحلي**: تأكد التوفر ${count(rt.n, TIMES)} في ${N(rt.stores)} من ${count(rt.storesTotal, STORES_G)} منذ 2 نوفمبر. [ساعةً بساعة ويومًا بيوم](${rt.path}).`
      : `تأكد التوفر ${count(rt.n, TIMES)} في ${N(rt.stores)} من ${count(rt.storesTotal, STORES_G)} منذ 2 نوفمبر، على أيام أقل من أن نحدد منها ساعة معتادة بعد. [ساعةً بساعة ويومًا بيوم](${rt.path}).`;
  return [
    { q: `أي متاجر Apple ${inCountry(cc)} فيها iPhone Duo الآن؟`, a: `{{duo.storesNow}} من ${count(n, STORES_G)} عند آخر فحص ({{asOf}}). صفحة [مخزون iPhone Duo ${inCountry(cc)}](${p}/stock/iphone-duo) تسمّي كل متجر وكل خيار، وتتحدث كل 15 ثانية.` },
    { q: `متى يتوفر iPhone Duo من جديد ${inCountry(cc)}؟`, a: when },
    { q: "ما سرعة التنبيهات؟", a: `نفحص المتاجر التي تتابعها بتنبيهاتك كل 5 ثوانٍ، وكل متجر Apple ${inCountry(cc)} كل 15 ثانية. وأي «متوفر» أول نعيد فحصه خلال ثانية حتى لا يتحول خلل من Apple إلى تنبيه، ثم يصل الإشعار إلى هاتفك بعد نحو 3 ثوانٍ.` },
    { q: "كم التكلفة؟", a: "المخزون المباشر والخريطة وسجل التوفر مجانية. التنبيهات: Plus بـ$5 شهريًا لعشرة تنبيهات، وPro بـ$10 لعشرين، وMax بـ$20 لخمسين، وتُدفع بالدولار الأمريكي؛ ويمكنك الإلغاء في أي وقت ([الباقات](/pricing))." },
    taxFaq(cc, country(cc)),
    { q: "هل يمكنكم حجز الهاتف لي؟", a: `لا. نخبرك لحظة أن يعرضه المتجر؛ وتشتريه أنت من apple.com${cc === "ae" ? " (صفحة الشراء بالإنجليزية)" : ""} مع الاستلام من المتجر، فتحجزه Apple لك ([مساعدة Apple في الاستلام](${pickupHelp(cc).url})، بالإنجليزية).` },
  ];
}

const homeLabels: Dict["place"]["home"] = {
  appName: (cc: CountryCode) => `PickupChecker لفحص مخزون iPhone ${inCountry(cc)}`,
  offer: "المخزون المباشر والخريطة وسجل التوفر مجانًا؛ والتنبيهات من $5 شهريًا",
  itemList: (cc: CountryCode) => `متاجر Apple ${inCountry(cc)}`,
  restockTimesChip: "متى يتوفر",
  storesByRegion: (cc: CountryCode) => `المتاجر حسب ال${regionNoun(COUNTRIES[cc])}`,
  browse: (cc: CountryCode) => `تصفّح المخزون ${inCountry(cc)}`,
  selloutH2: (cc: CountryCode) => `كم يصمد iPhone بعد توفره ${inCountry(cc)} قبل أن ينفد؟`,
  selloutLabel: (cc: CountryCode) => `في متاجر Apple ${biCountry(cc)}`,
  last24Label: (cc: CountryCode) => inCountry(cc),
  newsroom: "Apple Newsroom: وصول iPhone Duo إلى متاجر Apple حول العالم (23 أكتوبر 2026، بالإنجليزية)",
};

/** Store page <title> and H1: "ابل دبي مول: مخزون iPhone اليوم، الاستلام وساعات العمل"; `region` when the store is its city's only one. */
function storeTitle(s: Store, region?: string): string {
  const name = appleStoreLabel(s, L);
  const shown = region && !name.includes(region) && !storeLabel(s, L).includes(region) ? region : null;
  return fitTitleW(content.titles.store(name, shown));
}

export const place: Dict["place"] = {
  sinceWhen,
  placeLabel: (_cc: CountryCode, name: string) => name,
  whenIn,
  taxSentence,
  priceSection,
  taxFaq,
  placeTitle,
  placeDescription,
  placeIntro,
  placeSections,
  storesIndexTitle,
  homeTitle,
  homeH1,
  allStoresPhrase,
  spreadPhrase,
  modelPageTitles,
  modelIntro,
  modelDescription,
  modelRows,
  homeDescription,
  homeIntro,
  homeSections,
  homeFaq,
  home: homeLabels,
  storeTitle,
  sources: (code: Exclude<CountryCode, "us">) => ({
    pickupHelp: { label: "Apple: مساعدة الشحن والاستلام (ما تحضره للاستلام، بالإنجليزية)", url: pickupHelp(code).url },
    storeList: { label: `Apple: قائمة متاجر Apple ${inCountry(code)} (بالإنجليزية)`, url: storeListSource(code).url },
    tax: taxSource(code),
  }),
};
