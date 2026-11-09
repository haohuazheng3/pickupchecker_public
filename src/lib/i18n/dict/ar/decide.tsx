/**
 * العربية (الإمارات): decide — صفحات القرار الأربع (seo.md §16): أي خيار هو الأسهل حصولًا، هل ينفرج النقص،
 * Apple أم شركات الاتصالات أم متاجر التجزئة، وواجهة API العامة. البنية والنوع نفسهما في dict/en/decide: جملة إجابة
 * أولًا تحت كل سؤال، وكل رقم من lib/content/duoDecide.ts (وchannels.ts). الخيار واللون واسم المتجر تصل بالعربية عبر
 * العرض (x.cfg / x.colour / x.storeName)؛ واسم الدولة من util.country (لا x.c.inName الإنجليزي). الأرقام غربية
 * (ar-AE-u-nu-latn)، والرموز اللاتينية (الأسماء التجارية، حقول JSON، الروابط، «+12%») معزولة بـbidi كي تبقى بترتيبها
 * داخل النص من اليمين إلى اليسار. فترات الفحص 15 ثانية و5 ثوانٍ فقط؛ التخزين المؤقت للواجهة يُكتب «بفاصل 30 ثانية»؛
 * ولا ذكر للاسترداد؛ ولا تُترجم أسماء الطرازات والسعات والعلامات التجارية ومصطلحات HTTP.
 */
import type { Faq } from "@/lib/content/types";
import type { Country } from "@/lib/apple/countries";
import type { DuoSupply } from "@/lib/content/duoDecide";
import { exposureHours } from "@/lib/content/duoDecide";
import { SPEED } from "@/lib/plans";
import { LANG_TAG, bidi, fitTitleW, list } from "@/lib/i18n/format";
import type { ApiView, ChannelsView, ConfigsView, DecideCtx, DecideDict, SupplyView } from "../en/decide";
import { content } from "./content";
import {
  ALERTS, APPLE_STORES, DAYS, HOURS, L, MINUTES, N, SECONDS, STORES, STORES_G, TIMES, biCountry, count, country, forms, inCountry,
  theStoresG,
} from "./util";

/* ---------------------------------------------------------------- forms and helpers */

const RESTOCKS = forms({ one: "حالة توفر واحدة", two: "حالتا توفر", few: "# حالات توفر", many: "# حالة توفر", other: "# حالة توفر" });
/** After a preposition or as an object ("في حالتي توفر"). */
const RESTOCKS_G = forms({ one: "حالة توفر واحدة", two: "حالتي توفر", few: "# حالات توفر", many: "# حالة توفر", other: "# حالة توفر" });
const APPLE_STORES_G = forms({ one: "متجر Apple واحد", two: "متجري Apple", few: "# متاجر Apple", many: "# متجرًا لـApple", other: "# متجر Apple" });
const POINTS = forms({ one: "نقطة واحدة", two: "نقطتين", few: "# نقاط", many: "# نقطة", other: "# نقطة" });
const SELLERS = forms({ one: "بائع آخر واحد", two: "بائعان آخران", few: "# بائعين آخرين", many: "# بائعًا آخر", other: "# بائع آخر" });
const COUNTRIES_F = forms({ one: "دولة واحدة", two: "دولتين", few: "# دول", many: "# دولة", other: "# دولة" });

/** A Latin token (brand, field, URL, signed percentage) isolated so it keeps its order inside right-to-left text. */
const B = (s: string) => bidi(s, L);
const listAr = (items: string[], max = 6) => list(L, items, max, (n) => content.listMore(N(n)));
const listB = (items: string[], max = 6) => listAr(items.map(B), max);
const pct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : `${Math.round(x * 100)}%`);
const signed = (x: number) => B(`${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.round(Math.abs(x) * 100)}%`);
const df = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(LANG_TAG[L], { timeZone: "UTC", ...o });
/** "5 نوفمبر 2026". */
const longDate = (ymd: string) => df({ month: "long", day: "numeric", year: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
/** "الخميس، 5 نوفمبر". */
const dateLabel = (ymd: string) => df({ weekday: "long", month: "long", day: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
/** "38.4 ساعة" / "3 ساعات". */
const hoursAr = (h: number) => (Number.isInteger(h) ? count(h, HOURS) : `${N(h)} ساعة`);
/** Listing time: "38.4 ساعة", or "41 دقيقة" under an hour. */
const hours = (sec: number) => (sec >= 3600 ? hoursAr(exposureHours(sec)) : count(Math.max(1, Math.round(sec / 60)), MINUTES));
const secs = (s: number) => (s >= 120 ? count(Math.round(s / 60), MINUTES) : count(Math.round(s), SECONDS));
/** "2.4 ضعف ما توفرت به" — how many times as often one storage restocked as another. */
const ratio = (a: number, b: number) => {
  if (b <= 0) return "—";
  const r = Math.round((a / b) * 10) / 10;
  if (r === 1) return "بقدر ما توفرت به";
  if (r === 2) return "ضعفَي ما توفرت به";
  return `${N(r)} ${Number.isInteger(r) && r >= 3 && r <= 10 ? "أضعاف" : "ضعف"} ما توفرت به`;
};
/** Restocks per store over a week, one decimal ("2.4"). */
const perStore = (perStoreDay: number) => N(Math.round(perStoreDay * 70) / 10);
const inC = (x: DecideCtx) => inCountry(x.c.cc);
const cn = (x: DecideCtx) => country(x.c.cc);
const where = (x: DecideCtx) => (x.us ? "" : ` ${inC(x)}`);
/** "متجر Apple الوحيد في الإمارات" / "جميع متاجر Apple الخمسة في الإمارات". */
const storesPhrase = (x: DecideCtx) => (x.one ? `متجر Apple الوحيد ${inC(x)}` : `جميع ${theStoresG(x.stores)} ${inC(x)}`);
const trendAr = (d: DuoSupply) => (d.trend === "up" ? "أكثر" : d.trend === "down" ? "أقل" : "بالعدد نفسه تقريبًا");
const trendCmp = (d: DuoSupply) => (d.trend === "up" ? "أكثر من الأسبوع الماضي" : d.trend === "down" ? "أقل من الأسبوع الماضي" : "بقدر الأسبوع الماضي تقريبًا");
/** "تعرض 3 متاجر جهاز Duo الآن" / "يعرض متجر واحد…" / "لا يعرض أي متجر…". */
const nowStores = (n: number) => (n === 0 ? "لا يعرض أي متجر جهاز Duo الآن" : n === 1 ? "يعرض متجر واحد جهاز Duo الآن" : `تعرض ${count(n, STORES)} جهاز Duo الآن`);
/** "فترة الإرجاع لدى Apple (14 يومًا)", Hong Kong's no-returns policy, or a neutral phrase. */
const returnPhrase = (days: number | null) => (days ? `فترة الإرجاع لدى Apple (${count(days, DAYS)})` : days === 0 ? "سياسة Apple هناك التي لا تقبل الإرجاع (الاستبدال للعيوب فقط)" : "سياسة الإرجاع لدى Apple");
/** The carrier-lock note: the UAE's in Arabic (the only country with an Arabic version), elsewhere the data's own line. */
const lockAr = (x: ChannelsView, fallback: string) => (x.c.cc === "ae" ? "تبيع Apple جهاز iPhone غير مقفل في الإمارات؛ ولم نتحقق من حالة قفل الأجهزة التي تبيعها شركات الاتصالات." : x.ch.carrierLock ?? fallback);

/* ================================================================== أي خيار هو الأسهل حصولًا */
const configs: DecideDict["configs"] = {
  crumb: "أي خيار؟",
  title: (c: Country) => fitTitleW([
    `أي iPhone Duo يتوفر أكثر ${biCountry(c.cc)}؟ السعة واللون`,
    `أي خيار iPhone Duo يتوفر أكثر ${inCountry(c.cc)}؟`,
    `أي خيار iPhone Duo يتوفر أكثر؟ (${country(c.cc)})`,
  ], 49),
  metaDescription: (x: ConfigsView) => {
    const { d } = x;
    const e = d.easiest, h = d.hardest;
    return e && h
      ? fitTitleW([
        `${x.cfg(e)} هو خيار iPhone Duo الأسهل حصولًا${where(x)}: ${N(e.restocks)} من ${count(d.n, RESTOCKS_G)} المؤكدة في ${count(x.stores, APPLE_STORES_G)} و${hours(e.exposureSec)} من مدة العرض منذ ${longDate(d.since)}؛ و${x.cfg(h)} الأصعب (${N(h.restocks)}). ترتيب كل الخيارات حسب السعة واللون، يتحدث مع كل توفر.`,
        `${x.cfg(e)} هو خيار iPhone Duo الأسهل حصولًا${where(x)} (${N(e.restocks)} من ${count(d.n, RESTOCKS_G)} منذ ${longDate(d.since)})؛ و${x.cfg(h)} الأصعب. ترتيب كل الخيارات حسب السعة واللون.`,
      ], 160)
      : `ترتيب كل خيارات iPhone Duo حسب حالات التوفر المؤكدة في متاجر Apple${where(x)} منذ ${longDate(d.since)}: السعة واللون ومدة العرض وما يُعرض الآن.`;
  },
  h1: (x: ConfigsView) => `أي خيار iPhone Duo يتوفر أكثر${where(x)}، وأيها الأسهل حصولًا؟`,
  intro: (x: ConfigsView) => {
    const { d } = x;
    const e = d.easiest, h = d.hardest;
    if (!e) return `أكّد PickupChecker ${count(d.n, RESTOCKS_G)} لـiPhone Duo في ${storesPhrase(x)} منذ ${longDate(d.since)} — وهي أقل من أن تكفي لترتيب الخيارات بعد. يمتلئ الجدول أدناه مع كل توفر؛ والصفحة الأمريكية فيها النمط من الآن.`;
    const st = d.byStorage, co = d.byColor;
    const top = st[0], last = st[st.length - 1];
    return `${x.cfg(e)} هو خيار iPhone Duo الذي بقي معروضًا أطول مدة إجمالية${where(x)}: ${N(e.restocks)} من حالات التوفر الـ${N(d.n)} التي أكّدها PickupChecker في ${storesPhrase(x)} منذ ${longDate(d.since)}، في ${count(e.stores, STORES_G)}، بإجمالي مدة عرض ${hours(e.exposureSec)}${e.lifetimes ? ` وبقاءٍ معروضًا ${secs(e.lifetimes.medianSec)} (الوسيط) قبل النفاد` : ""}. ${h ? `و${x.cfg(h)} هو الأقصر عرضًا: ${count(h.restocks, RESTOCKS)} و${hours(h.exposureSec)} من مدة العرض.` : ""}${st.length > 1 ? ` السعة تقسم العدد أكثر من اللون: ${last.restocks > 0 ? `توفرت طرازات ${B(top.key)} ${ratio(top.restocks, last.restocks)} طرازات ${B(last.key)}` : `حملت طرازات ${B(top.key)} ${pct(top.share)} من حالات التوفر بينما لم تتوفر ${B(last.key)} ولا مرة`}${co.length > 1 ? `، في حين تقدّم ${x.colour(co[0].key)} على ${x.colour(co[1].key)} بفارق ${count(Math.abs(Math.round((co[0].share - co[1].share) * 100)), POINTS)} فقط` : ""}.` : ""} لا أحد يستطيع أن يقول أيّها ستنجح في شرائه؛ ما يمكن قياسه هو نوافذ الاستلام السابقة، وهذا ما ترتّبه هذه الصفحة.`;
  },
  updated: (x: ConfigsView, stamp: string) => `آخر تحديث ${stamp} · البيانات منذ ${longDate(x.d.since)} · ${count(x.stores, APPLE_STORES)} · فحص كل ${secs(SPEED.checkSec)} (ومتاجر التنبيهات كل ${secs(SPEED.fastSec)})`,
  nav: { easiest: "الأطول عرضًا", storage: "السعة", colour: "اللون", shelf: "وقت الالتقاط", week: "هذا الأسبوع", alerts: "ماذا تراقب", method: "طريقة الاحتساب" },
  h2: (x: ConfigsView) => ({
    easiest: `أي خيار iPhone Duo بقي معروضًا أطول مدة${where(x)}؟`,
    storage: "هل تغيّر السعة عدد مرات التوفر؟",
    colour: `${x.d.byColor.length > 1 ? `${x.colour(x.d.byColor[0].key)} أم ${x.colour(x.d.byColor[1].key)}` : "أي لون"}: أي لون يعود أكثر؟`,
    shelf: "أي خيار يمنحك أطول وقت لالتقاطه؟",
    week: "ما الذي تغيّر في الأيام السبعة الأخيرة؟",
    alerts: "على أي خيارات أفعّل التنبيهات؟",
    method: "كيف نحتسب التوفر ومدة العرض",
  }),
  hero: {
    restocks: (label: string) => `حالة توفر مؤكدة لـ${label}`,
    exposure: "ساعة كان معروضًا فيها، بجمع كل المتاجر",
    now: ((one: boolean): string => (one ? "يعرضه الآن" : "متاجر تعرضه الآن")) as DecideDict["configs"]["hero"]["now"],
    median: "ثانية من العرض (الوسيط)",
    total: "حالة توفر لكل الخيارات",
  },
  easiestLead: (x: ConfigsView) => {
    const e = x.d.easiest!;
    return `يتصدّر ${x.cfg(e)} المعيارَين القابلَين للقياس معًا: عاد أكثر من غيره (${count(e.restocks, RESTOCKS)}، أي ${pct(e.restocks / x.d.n)} من المجموع) وبقي معروضًا أطول مدة إجمالية (${hours(e.exposureSec)})، وهي المدة التي كان يمكن فيها حجز استلام. ${e.nowStores > 0 ? `${count(e.nowStores, STORES)} ${e.nowStores === 1 ? "يعرضه" : "تعرضه"} وأنت تقرأ هذا.` : "لا يعرضه أي متجر وأنت تقرأ هذا؛ ويظهر التوفر التالي هنا خلال ثوانٍ."}`;
  },
  easiestKeys: (x: ConfigsView) => {
    const { d } = x;
    const top3 = d.byPart.slice(0, 3);
    return [
      `الثلاثة الأولى حسب مدة العرض: ${listAr(top3.map((r) => `${x.cfg(r)} (${hours(r.exposureSec)})`))}.`,
      d.never.length ? `لم يتوفر قط${where(x)} منذ ${longDate(d.since)}: ${listAr(d.never.map((r) => x.cfg(r)))}.` : `توفر كل خيار مرة واحدة على الأقل منذ ${longDate(d.since)}.`,
      d.lifetimes ? `عبر كل الخيارات، بقي التوفر معروضًا ${secs(d.lifetimes.medianSec)} (الوسيط)؛ و${pct(d.lifetimes.within2min)} منه نفد خلال دقيقتين.` : "تظهر مدة العرض حين تبلغ حالات التوفر ذات النهاية المعروفة عشرًا.",
    ];
  },
  rankCaption: (x: ConfigsView) => `كل خيارات iPhone Duo${where(x)}، الأطول عرضًا أولًا · من ${longDate(x.d.since)} حتى اليوم`,
  rankHead: ["الخيار", "التوفر", "المتاجر", "إجمالي مدة العرض", "وسيط مدة العرض", "يُعرض الآن", "آخر توفر"],
  none: "لا شيء بعد",
  storageLead: (x: ConfigsView) => {
    const st = x.d.byStorage;
    if (st.length < 2 || !x.d.n) return "تُقارن السعات حين تبدأ حالات التوفر؛ والجدول أدناه مباشر.";
    const big = st.filter((g) => /^(1|2)TB$/.test(g.key)).reduce((a, g) => a + g.restocks, 0);
    return `نعم، أكثر من أي عامل آخر: شكّلت ${B(st[0].key)} ${pct(st[0].share)} من حالات التوفر و${B(st[1].key)} ${pct(st[1].share)}${big ? `، بينما شكّل طرازا 1TB و2TB معًا ${pct(big / x.d.n)}` : ""}. تشحن Apple السعات التي يطلبها أكثر الناس؛ والسعات الأعلى طلبًا هي أيضًا التي يتسلم المتجر منها عدة وحدات في الشحنة الواحدة.`;
  },
  groupCaption: (what: "storage" | "colour") => `التوفر حسب ${what === "storage" ? "السعة" : "اللون"}، بجمع كل المتاجر`,
  groupHead: (what: "Storage" | "Colour") => [what === "Storage" ? "السعة" : "اللون", "التوفر", "النسبة", "المتاجر", "إجمالي مدة العرض", "وسيط مدة العرض", "يُعرض الآن"],
  storageSwaps: (x: ConfigsView) => {
    const st = x.d.byStorage;
    if (st.length < 2) return [];
    const top = st[0].key, second = st[1].key, last = st[st.length - 1].key;
    return [
      { no: `تنبيه على ${B(last)} فقط`, yes: `${B(top)} أولًا، و${B(last)} أيضًا`, why: `توفرت ${B(last)} في ${pct(st[st.length - 1].share)} من الحالات؛ و${B(top)} في ${pct(st[0].share)}. وكل تنبيه منهما يشغل خانة واحدة.` },
      { no: "انتظار السعة بالتحديد", yes: `خذ ${B(top)} أو ${B(second)} حين يأتي`, why: `حملتا ${pct(st[0].share + st[1].share)} من كل حالات التوفر${where(x)}؛ وبين غطاء يخفي اللون وiCloud يوسّع السعة، تصبح السعة أقل أهمية من الانتظار.` },
    ];
  },
  colourLead: (x: ConfigsView) => {
    const co = x.d.byColor;
    if (co.length < 2 || !x.d.n) return "تُقارن الألوان حين تبدأ حالات التوفر.";
    const gap = Math.abs(Math.round((co[0].share - co[1].share) * 100));
    return `${x.colour(co[0].key)}، لكن بفارق ضئيل: ${pct(co[0].share)} من حالات التوفر مقابل ${pct(co[1].share)} ل${x.colour(co[1].key)}، أي فارق ${count(gap, POINTS)}${co[0].medianSec && co[1].medianSec ? `؛ وبقيا معروضَين ${secs(co[0].medianSec)} و${secs(co[1].medianSec)} (الوسيط)` : ""}. يحرّك اللون العدد أقل مما تحرّكه السعة. ومراقبة لون ثانٍ تضيف نوافذ استلامه إلى نوافذك: ${co[1].restocks > 0 ? `أضاف ${x.colour(co[1].key)} ${count(co[1].restocks, RESTOCKS)} و${hours(co[1].exposureSec)} من مدة العرض${where(x)} منذ ${longDate(x.d.since)}، فوق ${count(co[0].restocks, RESTOCKS)} و${hours(co[0].exposureSec)} لـ${x.colour(co[0].key)} (كل السعات)` : `لم يتوفر ${x.colour(co[1].key)}${where(x)} منذ ${longDate(x.d.since)}، فلم يكن ليضيف شيئًا حتى الآن`}.`;
  },
  colourKeys: (x: ConfigsView) => x.d.byColor.map((g) => `${x.colour(g.key)}: ${count(g.restocks, RESTOCKS)} في ${count(g.stores, STORES_G)}، و${hours(g.exposureSec)} إجمالي عرض${g.nowStores ? `، و${count(g.nowStores, STORES)} ${g.nowStores === 1 ? "يعرضه" : "تعرضه"} الآن` : ""}.`),
  shelfLead: (x: ConfigsView) => {
    const withM = x.d.byPart.filter((r) => r.lifetimes);
    if (!withM.length) return "تُقاس مدة عرض التوفر من لحظة التوفر إلى أول فحص يُظهر النفاد؛ وتظهر أول الأرقام حين تنتهي عشر حالات توفر لخيار واحد.";
    const slow = [...withM].sort((a, b) => b.lifetimes!.medianSec - a.lifetimes!.medianSec)[0], fast = [...withM].sort((a, b) => a.lifetimes!.medianSec - b.lifetimes!.medianSec)[0];
    return `${x.cfg(slow)} يمنحك أطول وقت: ${secs(slow.lifetimes!.medianSec)} معروضًا قبل النفاد (الوسيط)، مقابل ${secs(fast.lifetimes!.medianSec)} لـ${x.cfg(fast)}. الأبطأ بيعًا هي السعات الغالية — يريدها عدد أقل من المشترين — لذا يشير «أطول وقت للالتقاط» و«أكثر توفرًا» إلى خيارَين مختلفَين، والترتيب أعلاه يوازن بينهما.`;
  },
  shelfCaption: "مدة العرض لكل خيار (من التوفر ← فحص النفاد التالي)",
  shelfHead: ["الخيار", "حالات توفر بنهاية معروفة", "الوسيط", "نفد خلال دقيقتين", "نفد خلال 20 دقيقة", "الأسرع"],
  shelfKeys: (x: ConfigsView) => [
    `نصف حالات التوفر انتهت خلال ${x.d.lifetimes ? secs(x.d.lifetimes.medianSec) : "نحو دقيقة"}؛ ويُرسَل تنبيهنا بعد نحو ${secs(SPEED.alertSec)} من تأكيدنا التوفر، وما يتبقى من مدة العرض بعدها يتوقف على هاتفك وعلى دفعٍ جهّزته مسبقًا.`,
    `هذه المدة حدٌّ أعلى: نرى حالة النفاد عند الفحص التالي، بعد ${secs(SPEED.checkSec)} على الأكثر (${secs(SPEED.fastSec)} في المتاجر التي عليها تنبيهات).`,
    "«نفد» هنا يعني أن صفحة الاستلام في Apple توقفت عن عرض الخيار في ذلك المتجر؛ أما عدد الوحدات فلا تذكره Apple.",
  ],
  weekLead: (x: ConfigsView) => {
    const rows = [...x.d.byPart].sort((a, b) => b.last7 - a.last7);
    const tot7 = rows.reduce((a, r) => a + r.last7, 0), totP = rows.reduce((a, r) => a + r.prev7, 0);
    if (!tot7 && !totP) return `لا توفر في الأيام الأربعة عشر الأخيرة${where(x)}؛ ويبدأ جدول المقارنة الأسبوعية مع التوفر التالي.`;
    const lead = rows[0];
    return `${count(tot7, RESTOCKS)} في الأيام السبعة الأخيرة${totP ? ` مقابل ${N(totP)} في الأسبوع السابق (${signed(tot7 / totP - 1)})` : ""}، يتصدرها ${x.cfg(lead)} بـ${N(lead.last7)}. ${x.d.easiest && lead.partNumber !== x.d.easiest.partNumber ? `وهذا خيار مختلف عن متصدر السجل كله (${x.cfg(x.d.easiest)}): يتغير المزيج مع كل شحنة، فراجع هذا الجدول قبل أن تختار ما تضع عليه تنبيهك.` : "ومتصدر السجل كله ما زال يتصدر هذا الأسبوع."}`;
  },
  weekCaption: "التوفر لكل خيار: آخر 7 أيام مقابل الأيام السبعة قبلها",
  weekHead: ["الخيار", "آخر 7 أيام", "الأيام السبعة السابقة", "التغير"],
  alertsLead: (x: ConfigsView) => {
    const top = x.d.byPart.slice(0, 3).filter((r) => r.restocks > 0);
    return top.length
      ? `فعّل تنبيهات على ${listAr(top.map((r) => x.cfg(r)))} في المتجرَين أو الثلاثة التي تصلها أسرع؛ فذلك يغطي ${pct(top.reduce((a, r) => a + r.restocks, 0) / x.d.n)} من حالات التوفر حتى الآن${where(x)}. وأضف الخيار الذي تريده بالتحديد تنبيهًا رابعًا، وخذ أيها جاء أولًا.`
      : `إلى أن تبدأ حالات التوفر${where(x)}، فعّل تنبيهات على السعة التي تريدها بلونَيها في أقرب المتاجر إليك.`;
  },
  alertsKeys: (x: ConfigsView) => [
    `التنبيهات تُحسب لكل متجر × خيار، فثلاثة متاجر × ثلاثة خيارات = ${count(9, ALERTS)}.`,
    `نفحص متاجر التنبيهات كل ${secs(SPEED.fastSec)} ونؤكد التوفر قبل الإرسال؛ ويُرسَل الإشعار بعد نحو ${secs(SPEED.alertSec)}، أما موعد ظهوره على هاتفك فيتوقف على الجهاز واتصاله، ولا نقيسه.`,
    x.one ? "المتجر الأكثر توفرًا هو أيضًا الذي يراقبه أكثر الناس." : "اختر المتاجر حسب المسافة لا حسب عدد حالات التوفر: فالمتجر الأكثر توفرًا هو أيضًا الذي يراقبه أكثر الناس.",
  ],
  methodLead: "التوفر هو انتقال خيار ما من «نفد» إلى «متوفر» في متجر واحد، مؤكدًا بفحصَين متطابقَين؛ ولا تُحتسب أول رؤية بعد انقطاع في التتبع. تمتد مدة العرض من التوفر إلى أول فحص يُظهره نافدًا من جديد، فهي حدٌّ أعلى. و«إجمالي مدة العرض» يجمع هذه المدد عبر كل حالات توفر الخيار — وهو أبسط مقياس للمدة التي كان يمكن فيها حجز استلام. إنه سجل لعروض سابقة، لا احتمال شراء ولا عدد وحدات مبيعة: فـApple لا تنشر أيًّا منهما.",
  methodKeys: (x: ConfigsView) => [
    `المصدر: توفر الاستلام الذي تنشره Apple نفسها ل${storesPhrase(x)}، يُقرأ كل ${secs(SPEED.checkSec)} لكل متجر (${secs(SPEED.fastSec)} في المتاجر التي عليها تنبيهات) منذ ${longDate(x.d.since)}.`,
    "المتاجر التي تعرضه الآن وأوقات آخر توفر مباشرة؛ وكل ما عداها يُعاد احتسابه خلال خمس دقائق.",
    "اقتبس بحرية مع رابط: الأرقام تتغير، فاذكر تاريخ قراءتك لها.",
  ],
  faq: (x: ConfigsView): Faq[] => {
    const { d } = x;
    const e = d.easiest, h = d.hardest, co = d.byColor;
    return [
      { q: `أي خيار iPhone Duo هو الأسهل حصولًا${where(x)}؟`, a: e ? `لا أحد يستطيع أن يقول أيّ خيار ستتمكن من شرائه، إذ لا تنشر Apple حصص التوزيع ولا عدد من يحاولون الشراء. ما يمكن قياسه هو فترات الاستلام السابقة. منذ ${longDate(d.since)} كان ${x.cfg(e)} الأطول عرضًا في المجموع (${hours(e.exposureSec)} عبر ${count(e.restocks, RESTOCKS_G)} في ${count(e.stores, APPLE_STORES_G)})${h ? `، و${x.cfg(h)} الأقصر (${hours(h.exposureSec)} عبر ${count(h.restocks, RESTOCKS_G)})` : ""}، من أصل ${count(d.n, RESTOCKS_G)} مؤكدة في ${storesPhrase(x)}. هذا سجلّ لعروض سابقة، لا توقّع لك؛ ولمعرفة أي تغيير يضيف أكثر الفترات إلى اختياراتك — لون آخر أو متجر آخر — افتح «ما الذي يضيف أكثر فترات الاستلام؟» في محرر التنبيهات.` : `حالات التوفر المؤكدة${where(x)} أقل من أن نحكم بعد؛ وترتّب هذه الصفحة كل الخيارات فور ورودها.` },
      { q: `هل ${co.length > 1 ? x.colour(co[1].key) : "أحد اللونَين"} أصعب في إيجاده من ${co.length > 1 ? x.colour(co[0].key) : "الآخر"}؟`, a: co.length > 1 && d.n ? `قليلًا: شكّل ${x.colour(co[0].key)} ${pct(co[0].share)} من حالات التوفر و${x.colour(co[1].key)} ${pct(co[1].share)}. والفارق بين السعات أكبر بكثير، فاختر السعة أولًا وفعّل التنبيه على لونَيها.` : "تُقارن الألوان حين تبدأ حالات التوفر." },
      { q: `هل يتوفر iPhone Duo بسعة 1TB أو 2TB أصلًا${where(x)}؟`, a: (() => { const big = d.byPart.filter((r) => /^(1|2)TB$/.test(r.storage)); const bn = big.reduce((a, r) => a + r.restocks, 0); return bn ? `نعم، لكن نادرًا: ${count(bn, RESTOCKS)} لطرازَي 1TB و2TB من أصل ${N(d.n)} (${pct(bn / d.n)})، في ${new Set(big.flatMap((r) => (r.stores ? [r.partNumber] : []))).size ? count(Math.max(...big.map((r) => r.stores)), STORES_G) : "لا متجر"} على الأكثر. وحين يظهر أحدهما يبقى معروضًا أطول (مشترون أقل)، لذا يستحق تنبيهٌ عليه خانةً وإن كان نادر الانطلاق.` : `ليس بعد في بياناتنا${where(x)}: لا توفر مؤكدًا لطراز 1TB أو 2TB منذ ${longDate(d.since)}.`; })() },
      { q: "هل أفعّل التنبيهات على خيار واحد أم على عدة خيارات؟", a: `عدة خيارات في متاجر قليلة: حملت الخيارات الثلاثة الأولى ${d.n ? `${pct(d.byPart.slice(0, 3).reduce((a, r) => a + r.restocks, 0) / d.n)} من` : "أغلب"} حالات التوفر${where(x)}. ثلاثة خيارات في ثلاثة متاجر قريبة = تسعة تنبيهات، وهي تناسب باقة Plus؛ وأضف الخيار الذي تريده بالتحديد رابعًا.` },
      { q: "هل المزيج نفسه في الدول الأخرى؟", a: `ليس دائمًا: لكل دولة حصتها، وقد يختلف الترتيب في صفحتها. الروابط تحت «دول أخرى» تفتح الصفحة نفسها للدول الـ${N(18)} الأخرى التي يتابعها PickupChecker؛ والصفحة الأمريكية لها أطول سجل (منذ ${longDate("2026-10-29")}).` },
    ];
  },
  sources: { apple: "Apple: خيارات iPhone Duo وأسعاره", pickup: "Apple: الاستلام من المتجر", log: "PickupChecker: سجل التوفر الذي تُحتسب منه هذه الصفحة" },
  ld: (x: ConfigsView) => ({
    datasetName: `حالات توفر iPhone Duo حسب الخيار، متاجر Apple ${inC(x)}`,
    description: `حالات توفر iPhone Duo المؤكدة في ${storesPhrase(x)} منذ ${longDate(x.d.since)}، لكل خيار (السعة × اللون): العدد، والمتاجر، وإجمالي مدة العرض، ووسيط مدة العرض، والمتاجر التي تعرضه الآن.`,
    measured: ["حالات التوفر لكل خيار", "متاجر شهدت توفرًا", "مدة العرض بالثواني", "وسيط مدة العرض", "متاجر تعرضه الآن"],
  }),
  related: "تابع القراءة",
  sameData: "البيانات نفسها، أسئلة أخرى",
  otherCountries: "دول أخرى",
  questions: { restockTimes: "متى توفّر Apple جهاز iPhone Duo؟", sellOut: "كم يصمد التوفر قبل النفاد؟", shortage: "هل ينفرج النقص؟", channels: "Apple أم شركة الاتصالات أم التجزئة؟", alerts: "أسرع طريقة لتلقي الإشعار", api: "واجهة API المجانية للمخزون" },
  setUpAlert: "فعّل التنبيهات",
  logLive: "سجل التوفر مباشرة",
  faqTitle: "أسئلة يطرحها الناس",
  onThisPage: "في هذه الصفحة",
};

/* ================================================================== هل ينفرج النقص */
const supply: DecideDict["supply"] = {
  crumb: "هل ينفرج النقص؟",
  title: (c: Country) => fitTitleW([
    `هل ينفرج نقص iPhone Duo ${biCountry(c.cc)}؟ اتجاه الأسبوع`,
    `هل تنفرج أزمة نقص iPhone Duo ${inCountry(c.cc)}؟`,
    `هل ينفرج نقص iPhone Duo؟ (${country(c.cc)})`,
  ], 49),
  metaDescription: (x: SupplyView) => {
    const { d } = x;
    const w = d.last7;
    return d.trend !== "insufficient"
      ? fitTitleW([
        `حالات توفر iPhone Duo${where(x)} هذا الأسبوع ${trendAr(d)}: ${N(w.restocks)} في ${count(w.stores, APPLE_STORES_G)} خلال 7 أيام (${signed(d.change!)} مقابل الأسبوع السابق)${w.medianSec ? `، ونفد كلٌّ منها خلال ${secs(w.medianSec)} (الوسيط)` : ""}. العرض يومًا بيوم، وكيف يبدو «الانفراج»، وهل تنتظر.`,
        `${count(w.restocks, RESTOCKS)} لـiPhone Duo${where(x)} في آخر 7 أيام (${signed(d.change!)} أسبوعًا بأسبوع). العرض يومًا بيوم وهل ينفرج النقص.`,
      ], 160)
      : `هل ينفرج نقص iPhone Duo${where(x)}؟ ${count(d.n, RESTOCKS)} مؤكدة في متاجر Apple منذ ${longDate(d.since)}، يومًا بيوم، مع ما يبدو عليه الانفراج وهل تنتظر أم تشتري الآن.`;
  },
  h1: (x: SupplyView) => `هل بدأ نقص iPhone Duo ينفرج${where(x)}، وكم سيطول؟`,
  intro: (x: SupplyView) => {
    const { d } = x;
    const w = d.last7;
    if (d.trend === "insufficient") {
      return `من المبكر الحكم${where(x)}: بدأ PickupChecker التتبع في ${longDate(d.since)}، أي قبل ${count(d.days, DAYS)}، لذا تظهر أول مقارنة أسبوعية كاملة في ${longDate(d.comparableFrom)}. حتى الآن ${count(d.n, RESTOCKS)} مؤكدة في ${N(d.storesEver)} من ${count(x.stores, APPLE_STORES_G)}${d.lifetimes ? `، بقي كلٌّ منها معروضًا ${secs(d.lifetimes.medianSec)} (الوسيط) قبل أن ينفد` : ""}؛ و${nowStores(d.storesNow)}. لا أحد يستطيع التنبؤ بنهاية النقص؛ وتُظهر هذه الصفحة الرقمَين اللذين سيقولان ذلك أولًا — حالات التوفر في الأسبوع والثواني التي يبقى فيها معروضًا — وتتحدث مع كل توفر.`;
    }
    const verdict = d.trend === "up" ? "العرض يتحسن" : d.trend === "down" ? "العرض يضيق" : "العرض مستقر";
    const demand = w.medianSec ? (w.medianSec <= 120 ? `لكن الطلب ما زال يلتهمه: بقي التوفر معروضًا ${secs(w.medianSec)} (الوسيط) هذا الأسبوع${d.prev7.medianSec ? ` (${secs(d.prev7.medianSec)} الأسبوع الماضي)` : ""}، فلم يصبح الشراء يدويًا أسهل بعد` : `ومدة العرض تطول: ${secs(w.medianSec)} (الوسيط) هذا الأسبوع${d.prev7.medianSec ? ` مقابل ${secs(d.prev7.medianSec)} الأسبوع الماضي` : ""}، وهي أول إشارة إلى الانفراج`) : "";
    return `${verdict}${where(x)}: وفّرت متاجر Apple جهاز iPhone Duo ${count(w.restocks, TIMES)} في الأيام السبعة الأخيرة، ${signed(d.change!)} مقارنةً بالأسبوع السابق (${N(d.prev7.restocks)})، في ${count(w.stores, STORES_G)} من ${N(x.stores)}${demand ? ` — ${demand}` : ""}. ${nowStores(d.storesNow)}. لا أحد يستطيع التنبؤ بالنهاية؛ والرقمان اللذان سيقولانها أولًا في هذه الصفحة، ويتحدثان مع كل توفر.`;
  },
  updated: (x: SupplyView, stamp: string) => `آخر تحديث ${stamp} · البيانات منذ ${longDate(x.d.since)} · ${count(x.stores, APPLE_STORES)} · فحص كل ${secs(SPEED.checkSec)}`,
  nav: { trend: "هذا الأسبوع", easier: "أسهل في الشراء؟", stores: "كم متجرًا", howlong: "كم يستمر", christmas: "انتظار أم شراء", world: "دول أخرى", method: "طريقة الاحتساب" },
  h2: (x: SupplyView) => ({
    trend: `هل حالات توفر iPhone Duo${where(x)} في ازدياد أم في تراجع؟`,
    easier: "هل أصبح شراء واحد فعلًا أسهل؟",
    stores: `كم متجرًا من متاجر Apple${where(x)} شهد توفر iPhone Duo أصلًا؟`,
    howlong: "كم سيستمر نقص iPhone Duo؟",
    christmas: "هل أواصل انتظار التوفر، أم أشتري بطريقة أخرى؟",
    world: `هل ينفرج النقص أسرع في دول أخرى${x.us ? "" : ` مما ${inC(x)}`}؟`,
    method: "طريقة الاحتساب",
  }),
  weekBefore: "الأسبوع السابق",
  goneIn2: "نفد خلال دقيقتين",
  storesEverLabel: ((one: boolean): string => (one ? "حالة توفر مؤكدة حتى الآن" : "متاجر شهدت توفرًا واحدًا على الأقل")) as DecideDict["supply"]["storesEverLabel"],
  hero: { last7: "حالة توفر، آخر 7 أيام", change: "مقابل الأيام السبعة السابقة", stores: ((one: boolean): string => (one ? "أيام شهدت توفرًا" : "متاجر توفر فيها، آخر 7 أيام")) as DecideDict["supply"]["hero"]["stores"], median: "ثانية وسيط مدة العرض، آخر 7 أيام", now: ((one: boolean): string => (one ? "يعرض واحدًا الآن" : "متاجر تعرض واحدًا الآن")) as DecideDict["supply"]["hero"]["now"], sinceLast: "ساعة منذ آخر توفر" },
  trendLead: (x: SupplyView) => {
    const { d } = x;
    if (d.trend === "insufficient") return `الجدول اليومي هو كل السجل حتى الآن: ${count(d.n, RESTOCKS)} على مدى ${count(d.days, DAYS)}. يظهر سطر المقارنة الأسبوعية في ${longDate(d.comparableFrom)}؛ وحتى ذلك الحين اقرأ الاتجاه يومًا بيوم.`;
    const w = d.last7, p = d.prev7;
    const gap = w.longestGapHours != null ? `وأطول فجوة بين توفرَين هذا الأسبوع كانت ${hoursAr(w.longestGapHours)}${p.longestGapHours != null ? ` (${hoursAr(p.longestGapHours)} الأسبوع الماضي)` : ""}. ` : "";
    return `${trendAr(d)} هذا الأسبوع: ${count(w.restocks, RESTOCKS)} (${perStore(w.perStoreDay)} لكل متجر) مقابل ${N(p.restocks)} في الأسبوع السابق، أي ${signed(d.change!)}. ${gap}تأتي حالات التوفر في موجات مرتبطة بالشحنات، فيوم هادئ واحد لا يعني الكثير؛ وما ينبغي مراقبته هو مجاميع الأيام السبعة.`;
  },
  dailyCaption: (x: SupplyView) => `حالات التوفر المؤكدة لكل يوم محلي${where(x)}، الأحدث أولًا (آخر 14 يومًا)`,
  dailyHead: ["اليوم", "التوفر", "المتاجر", "وسيط مدة العرض"],
  trendKeys: (x: SupplyView) => {
    const best = [...x.d.daily].sort((a, b) => b.restocks - a.restocks)[0];
    return [
      best && best.restocks ? `أكثر الأيام توفرًا حتى الآن: ${dateLabel(best.date)} بـ${count(best.restocks, RESTOCKS_G)} في ${count(best.stores, STORES_G)}.` : "لا توفر بعد؛ ويظهر أكثر الأيام توفرًا هنا.",
      x.d.sinceLastHours != null && x.d.latest ? `آخر توفر قبل ${x.d.sinceLastHours < 1 ? "أقل من ساعة" : hoursAr(x.d.sinceLastHours)}: ${x.storeName(x.d.latest.storeNumber)}، ${x.storeWhen(x.d.latest.at, x.d.latest.storeNumber)}.` : "لم يُسجَّل أي توفر بعد.",
      `«ازدياد» يعني حالات توفر أكثر من الأسبوع السابق بـ${Math.round(0.15 * 100)}% على الأقل؛ و«تراجع» أقل بـ${Math.round(0.15 * 100)}% على الأقل؛ وما بينهما يُقرأ «مستقرًا».`,
    ];
  },
  easierLead: (x: SupplyView) => {
    const w = x.d.last7, p = x.d.prev7;
    if (!w.medianSec) return "«أسهل» تعني أمرَين معًا: حالات توفر أكثر، وبقاء كلٍّ منها معروضًا مدة أطول. وتظهر مدة العرض حين تبلغ حالات التوفر ذات النهاية المعروفة في هذه النافذة عشرًا.";
    const longer = p.medianSec ? w.medianSec > p.medianSec * 1.15 : false, shorter = p.medianSec ? w.medianSec < p.medianSec * 0.85 : false;
    return `${longer ? "قليلًا، نعم" : shorter ? "لا — بل العكس" : "ليس بعد"}: بقي التوفر معروضًا ${secs(w.medianSec)} (الوسيط) هذا الأسبوع${p.medianSec ? ` مقابل ${secs(p.medianSec)} الأسبوع الماضي` : ""}، ونفد ${pct(w.within2min!)} منه خلال دقيقتين${p.within2min != null ? ` (${pct(p.within2min)} الأسبوع الماضي)` : ""}. يبدو الانفراج حين يتحرك الرقمان معًا — حالات توفر أكثر ومدد عرض أطول؛ أما حالات توفر أكثر وحدها فتعني أن Apple تشحن أكثر بينما ينتظر العدد نفسه من الناس.`;
  },
  easierKeys: (x: SupplyView) => [
    "كيف سيبدو «الانفراج» هنا: وسيط مدة العرض يتجاوز 20 دقيقة، وأغلب المتاجر تعرض واحدًا في الوقت نفسه، وتقديرات التوصيل على apple.com خلال أسبوع.",
    `حتى ذلك الحين، طريقة الشراء ما زالت التنبيه: نؤكد التوفر ونرسل الإشعار بعد نحو ${secs(SPEED.alertSec)}، أي قبل انتهاء وسيط مدة العرض بوقت كافٍ.`,
    x.d.lifetimes ? `السجل كله${where(x)}: ${count(x.d.lifetimes.n, RESTOCKS)} بنهاية معروفة، الوسيط ${secs(x.d.lifetimes.medianSec)}، و${pct(x.d.lifetimes.within2min)} نفد خلال دقيقتين.` : "تظهر أرقام مدة العرض للسجل كله بعد عشر حالات توفر منتهية.",
  ],
  storesLead: (x: SupplyView) => {
    const { d } = x;
    const never = x.stores - d.storesEver;
    return x.one
      ? `${d.storesEver ? `نعم: شهد متجر Apple الوحيد ${inC(x)} ${count(d.n, RESTOCKS_G)} مؤكدة منذ ${longDate(d.since)}` : `ليس بعد: لا توفر مؤكدًا في متجر Apple الوحيد ${inC(x)} منذ ${longDate(d.since)}`}${d.storesNow ? "، وهو يعرض جهاز Duo الآن" : ""}.`
      : `${N(d.storesEver)} من ${count(x.stores, APPLE_STORES_G)}${where(x)} (${pct(d.storesEver / x.stores)}) شهدت حالة توفر مؤكدة واحدة على الأقل لـiPhone Duo منذ ${longDate(d.since)}${never ? `؛ و${count(never, STORES)} لم ${never === 1 ? "يشهد" : "تشهد"} أي توفر` : ""}. ${nowStores(d.storesNow)}. ينتشر العرض على نحو غير متساوٍ: المتاجر الرئيسية ومتاجر المولات تتوفر أكثر، ولهذا يهم المتجر الذي تختاره لتنبيهاتك بقدر ما يهم الخيار.`;
  },
  storesKeys: (x: SupplyView) => [
    `المتاجر حسب عدد حالات التوفر، بأوقاتها المحلية: قسم «أين» في صفحة أوقات التوفر${where(x)}.`,
    "المتجر الذي لم يتوفر فيه قط ليس متجرًا تتجاوزه Apple: الحصص تصل مع الشحنات، وعدة متاجر لم تتسلم أول Duo لها إلا في الأسبوع الثاني.",
  ],
  howlongLead: (x: SupplyView) => `لا يعرف أحد خارج Apple، ونحن لا نتنبأ. ما يُظهره السجل${where(x)}: ${count(x.d.n, RESTOCKS)} في ${count(x.d.days, DAYS)}، ${x.d.trend === "insufficient" ? `واتجاه أسبوعي يبدأ من ${longDate(x.d.comparableFrom)}` : `وحالات توفر هذا الأسبوع ${trendCmp(x.d)}`}، ومدد عرض ${x.d.last7.medianSec ? `نحو ${secs(x.d.last7.medianSec)}` : "دون بضع دقائق"}. ينتهي النقص في تسلسل يمكنك مراقبته هنا: ترتفع حالات التوفر الأسبوعية، وتمتد مدد العرض من ثوانٍ إلى ساعات، ثم تعرض أغلب المتاجر واحدًا في وقت واحد وينخفض تقدير التوصيل على apple.com إلى أيام.`,
  howlongKeys: () => [
    "الإشارة 1 — حالات التوفر الأسبوعية تواصل الارتفاع أسبوعَين أو ثلاثة (الجدول أعلاه).",
    "الإشارة 2 — وسيط مدة العرض يتجاوز 20 دقيقة: التوفر يصمد أطول من الذين يحدّثون الصفحة.",
    "الإشارة 3 — تقدير التوصيل على apple.com ينزل إلى أقل من أسبوع، وأغلب المتاجر تعرض واحدًا معًا.",
    "إطلاق ألوان أو سعات جديدة يعيد العدّ من الصفر؛ أبقِ التنبيه مفعّلًا حتى الإشارة 3.",
  ],
  christmasLead: (x: SupplyView) => {
    const w = x.d.last7;
    const perDay = w.days ? w.restocks / w.days : 0;
    return `أبقِ التنبيه مفعّلًا وأبقِ طلب توصيل في الطابور — كلاهما، لا أحدهما. بالوتيرة الحالية (${perDay >= 1 ? `نحو ${count(Math.round(perDay), RESTOCKS)} في اليوم${where(x)}` : `أقل من حالة توفر واحدة في اليوم${where(x)}`}${w.medianSec ? `، يبقى كلٌّ منها معروضًا ${secs(w.medianSec)} (الوسيط)` : ""}) يأتي دور متجر قريب منك تراقبه خلال أيام، ويُرسَل إشعار التوفر المؤكد بعد نحو ${secs(SPEED.alertSec)} من رؤيتنا له. ودفع زيادة على السعر في مكان آخر لا معنى له إلا إذا كان الانتظار نفسه يكلفك أكثر من الزيادة؛ ومقارنة القنوات توازن ذلك بصدق.`;
  },
  christmasKeys: () => [
    "اطلب التوصيل من apple.com أولًا: يحفظ مكانك، ويمكن إلغاؤه حين يأتي الاستلام.",
    "تنبيهات على الخيارَين أو الثلاثة الأكثر توفرًا في أقرب المتاجر إليك (صفحة الخيارات تقول أيها).",
    "اجعل تطبيق Apple Store مسجَّل الدخول، وجهاز Duo في الحقيبة، وبطاقتك محفوظة: وسيط مدة العرض نحو دقيقة.",
  ],
  worldLead: (x: SupplyView) => {
    const rows = x.world.filter((r) => r.complete && r.stores > 0).sort((a, b) => b.perStoreDay - a.perStoreDay);
    if (rows.length < 2) return "تُقارن هنا حالات التوفر الأسبوعية لكل متجر في كل دولة حين يكتمل لكل دولة أسبوع من البيانات.";
    const top = rows[0], bottom = rows[rows.length - 1];
    const mine = rows.find((r) => r.cc === x.c.cc);
    return `${top.name} سجّلت أكثر حالات التوفر لكل متجر في الأيام السبعة الأخيرة (${perStore(top.perStoreDay)} لكل متجر)، و${bottom.name} الأقل (${perStore(bottom.perStoreDay)})${mine ? `؛ و${cn(x)} عند ${perStore(mine.perStoreDay)}` : ""}. تختلف الحصص بين الدول وتواريخ الإطلاق، فيظهر الانفراج على نحو غير متساوٍ؛ والسجل الأمريكي هو الأطول.`;
  },
  worldCaption: "آخر 7 أيام حسب الدولة: حالات التوفر، ولكل متجر، ووسيط مدة العرض، والمتاجر التي تعرض واحدًا الآن",
  worldHead: ["الدولة", "المتاجر", "التوفر (7 أيام)", "لكل متجر", "وسيط مدة العرض", "يُعرض الآن"],
  methodLead: `التوفر هو انتقال خيار ما من «نفد» إلى «متوفر» في متجر واحد، مؤكدًا بفحصَين متطابقَين تفصل بينهما ${secs(SPEED.checkSec)} (${secs(SPEED.fastSec)} في المتاجر التي عليها تنبيهات)؛ ولا تُحتسب أول رؤية بعد انقطاع في التتبع. الأيام هي الأيام المحلية للمتجر. تمتد مدة العرض من التوفر إلى أول فحص يُظهره نافدًا من جديد — حدٌّ أعلى، حتى الفحص التالي. الأسابيع هي آخر سبعة أيام محلية مقابل السبعة قبلها؛ وتحتاج المقارنة إلى اكتمالهما معًا.`,
  methodKeys: (x: SupplyView) => [
    `المصدر: توفر الاستلام لدى Apple ل${storesPhrase(x)}، منذ ${longDate(x.d.since)}.`,
    "كل ما في هذه الصفحة يُعاد احتسابه خلال خمس دقائق من أي توفر؛ والمتاجر التي تعرضه الآن مباشرة.",
    "اقتبس مع رابط وتاريخ: هذه أرقام متحركة.",
  ],
  faq: (x: SupplyView): Faq[] => {
    const { d } = x;
    const w = d.last7;
    return [
      { q: `هل ما زالت Apple توفّر iPhone Duo${where(x)}؟`, a: d.n ? `نعم: ${count(w.restocks, RESTOCKS)} مؤكدة في الأيام السبعة الأخيرة في ${count(w.stores, APPLE_STORES_G)}${where(x)}، و${count(d.n, RESTOCKS)} منذ ${longDate(d.since)}. وآخرها كان ${d.sinceLastHours != null && d.sinceLastHours < 1 ? "قبل أقل من ساعة" : d.sinceLastHours != null ? `قبل ${hoursAr(d.sinceLastHours)}` : "لم يُسجَّل بعد"}.` : `لا توفر مؤكدًا بعد${where(x)} منذ بدء التتبع في ${longDate(d.since)}؛ وتتحدث هذه الصفحة خلال خمس دقائق من أول توفر.` },
      { q: `هل بدأ نقص iPhone Duo ينفرج${where(x)}؟`, a: d.trend === "insufficient" ? `من المبكر الحكم: تظهر أول مقارنة أسبوعية كاملة في ${longDate(d.comparableFrom)}. راقب رقمَين — حالات التوفر في الأسبوع والثواني التي يبقى فيها معروضًا؛ والانفراج يعني ارتفاعهما معًا.` : `حالات التوفر هذا الأسبوع ${trendCmp(d)} (${signed(d.change!)})${w.medianSec ? `، وبقي التوفر معروضًا ${secs(w.medianSec)} (الوسيط)` : ""}. الانفراج يعني حالات توفر أكثر ومدد عرض أطول معًا؛ وحتى الآن ${d.trend === "up" && w.medianSec && d.prev7.medianSec && w.medianSec > d.prev7.medianSec ? "يتحرك الرقمان في الاتجاه الصحيح" : "لا يحدث من ذلك إلا جزء"}.` },
      { q: "متى يصبح شراء iPhone Duo سهلًا؟", a: "لا يستطيع أحد خارج Apple أن يقول، وPickupChecker لا يتنبأ. التسلسل الذي تراقبه: ترتفع حالات التوفر الأسبوعية أسبوعَين أو ثلاثة، ويتجاوز وسيط مدة العرض 20 دقيقة، ثم تعرض أغلب المتاجر واحدًا في وقت واحد وينزل تقدير التوصيل على apple.com إلى أقل من أسبوع." },
      { q: "هل أدفع زيادة على السعر بدل الانتظار؟", a: `فقط إذا كان الانتظار يكلفك أكثر من الزيادة: بالوتيرة الحالية يأتي دور متجر قريب تراقبه خلال أيام، ويُرسَل التنبيه بعد نحو ${secs(SPEED.alertSec)} من توفر مؤكد. وإعادة البيع تعني أيضًا لا فترة إرجاع والمخاطر المعتادة؛ وصفحة مقارنة القنوات توازنها.` },
      { q: "هل يغيّر موسم الأعياد الفرص؟", a: "يرتفع الطلب مع اقتراب ديسمبر بينما تحافظ الشحنات على إيقاعها، فتميل مدد العرض إلى التقلص لا الامتداد. أبقِ طلب توصيل احتياطًا ودع التنبيهات تلتقط الاستلام؛ وألغِ ما لا تحتاج إليه منهما." },
    ];
  },
  sources: { newsroom: "Apple Newsroom: وصول iPhone Duo إلى متاجر Apple", pickup: "Apple: الاستلام من المتجر", log: "PickupChecker: سجل التوفر الذي تُحتسب منه هذه الصفحة", restockTimes: "PickupChecker: متى توفّر Apple جهاز iPhone Duo" },
  ld: (x: SupplyView) => ({
    datasetName: `اتجاه عرض iPhone Duo، متاجر Apple ${inC(x)}`,
    description: `حالات توفر iPhone Duo المؤكدة في اليوم في ${storesPhrase(x)} منذ ${longDate(x.d.since)}: الحالات، والمتاجر، ووسيط مدة العرض، والتغير أسبوعًا بأسبوع.`,
    measured: ["حالات التوفر في اليوم", "متاجر شهدت توفرًا", "وسيط مدة العرض", "التغير أسبوعًا بأسبوع", "متاجر تعرضه الآن"],
  }),
  related: "تابع القراءة",
  sameData: "البيانات نفسها، أسئلة أخرى",
  otherCountries: "هذه الصفحة لدول أخرى",
  questions: { restockTimes: "متى توفّر Apple جهاز iPhone Duo؟", configs: "أي خيار هو الأسهل حصولًا؟", channels: "Apple أم شركة الاتصالات أم التجزئة؟", sellOut: "كم يصمد التوفر قبل النفاد؟", howToGet: "كيف تحصل على iPhone Duo", alerts: "أسرع طريقة لتلقي الإشعار" },
  setUpAlert: "فعّل التنبيهات",
  logLive: "سجل التوفر مباشرة",
  faqTitle: "أسئلة يطرحها الناس",
  onThisPage: "في هذه الصفحة",
};

/* ================================================================== Apple أم شركات الاتصالات أم متاجر التجزئة */
const channels: DecideDict["channels"] = {
  crumb: "Apple أم شركة الاتصالات أم التجزئة؟",
  title: (c: Country, retailer: string) => (c.cc === "us"
    ? fitTitleW([`iPhone Duo: Apple أم ${retailer} أم شركة اتصالات؟`, "iPhone Duo: Apple أم المشغل أم التجزئة؟"], 49)
    : fitTitleW([`iPhone Duo ${biCountry(c.cc)}: Apple أم المشغل أم التجزئة؟`, `iPhone Duo: Apple أم المشغل أم التجزئة؟ (${country(c.cc)})`, `iPhone Duo ${biCountry(c.cc)}: Apple أم غيرها؟`], 49)),
  metaDescription: (x: ChannelsView) => fitTitleW([
    `من أين تحصل فعلًا على iPhone Duo${where(x)}: الاستلام من Apple Store (${count(x.sup.n, RESTOCKS)} مؤكدة في ${count(x.stores, STORES_G)} منذ ${longDate(x.sup.since)})، والتوصيل من apple.com، و${listB(x.ch.carriers.slice(0, 3))}، و${listB(x.ch.retailers.slice(0, 2))}، وإعادة البيع — ما تستطيع كل قناة أن تخبرك به وما لا تستطيع، وأيها تراقب.`,
    `الاستلام من Apple Store مقابل التوصيل من apple.com مقابل ${listB(x.ch.carriers.slice(0, 2))} مقابل ${x.ch.retailers[0] ? B(x.ch.retailers[0]) : "متاجر التجزئة"} مقابل إعادة البيع لجهاز iPhone Duo${where(x)}: ما تخبرك به كل قناة وأيها تراقب.`,
  ], 160),
  h1: (x: ChannelsView) => `Apple Store أم شركة اتصالات أم متجر تجزئة: من أين تحصل فعلًا على iPhone Duo${where(x)}؟`,
  intro: (x: ChannelsView) => `الاستلام من Apple Store هو قناة iPhone Duo الوحيدة${where(x)} التي يستطيع أحد قياس عرضها: أكّد PickupChecker ${count(x.sup.n, RESTOCKS_G)} في ${storesPhrase(x)} منذ ${longDate(x.sup.since)}، منها ${N(x.sup.last7.restocks)} في الأيام السبعة الأخيرة، كلٌّ منها مقروء من صفحة الاستلام لدى Apple نفسها كل ${secs(SPEED.checkSec)}. أما شركات الاتصالات (${listB(x.ch.carriers)}) ومتاجر التجزئة (${listB(x.ch.retailers)}) فتتسلم حصصها الخاصة ولا تنشر أي بيانات مخزون، فلا يستطيع أحد — لا نحن ولا غيرنا — أن يخبرك بصدق بأوقات توفرها. أدناه ما تستطيع كل قناة أن تخبرك به وما لا تستطيع، والمقايضات، والترتيب الذي تراقبها به.`,
  updated: (x: ChannelsView, stamp: string) => `آخر تحديث ${stamp} · بيانات Apple Store منذ ${longDate(x.sup.since)} · ${count(x.stores, APPLE_STORES)} · فحص كل ${secs(SPEED.checkSec)}`,
  nav: { compare: "قناةً بقناة", pickup: "استلام أم توصيل", carriers: "شركات الاتصالات", retailers: "متاجر التجزئة", resale: "زيادات إعادة البيع", abroad: "الشراء من الخارج", method: "كيف نعرف" },
  h2: (x: ChannelsView) => ({
    compare: `أي قناة توفّر iPhone Duo أكثر${where(x)}؟`,
    pickup: "هل الاستلام من Apple Store أسرع من طلب التوصيل على apple.com؟",
    carriers: `هل أشتري iPhone Duo من ${x.ch.carriers.length ? listB(x.ch.carriers.slice(0, 3)) : "شركة اتصالات"} بدلًا من ذلك؟`,
    retailers: `هل من المفيد تفقد ${x.ch.retailers.length ? listB(x.ch.retailers.slice(0, 2)) : "متاجر التجزئة"}؟`,
    resale: `هل يستحق دفع زيادة على السعر في ${x.ch.resale[0] ? B(x.ch.resale[0]) : "موقع إعادة بيع"} العناء؟`,
    abroad: "هل يمكنني شراء iPhone Duo من الخارج واستخدامه في بلدي؟",
    method: "كيف نعرف ما نعرفه",
  }),
  hero: { restocks: "حالة توفر مؤكدة في Apple Store", last7: "في آخر 7 أيام", now: ((one: boolean): string => (one ? "متجر Apple يعرض واحدًا الآن" : "متاجر Apple تعرض واحدًا الآن")) as DecideDict["channels"]["hero"]["now"], channels: "قنوات أخرى، بلا بيانات مخزون عامة" },
  compareLead: (x: ChannelsView) => `الاستلام من Apple Store، بالمقياس الوحيد المتاح: ${count(x.sup.last7.restocks, RESTOCKS)} مؤكدة في الأيام السبعة الأخيرة في ${count(x.sup.last7.stores, STORES_G)}${where(x)}${x.sup.last7.medianSec ? `، بقي كلٌّ منها معروضًا ${secs(x.sup.last7.medianSec)} (الوسيط)` : ""}. شركات الاتصالات ومتاجر التجزئة توفّر أيضًا على الأرجح — فهي تتسلم حصصها من شحنات Apple نفسها — لكنها تُظهر نعم/لا في صفحة المنتج لا بيانات متدفقة، لذا فالمقارنة أدناه عمّا تستطيع مراقبته، لا عمّن يحصل على أكثر.`,
  compareCaption: "قنوات iPhone Duo، مقارنة صادقة",
  compareHead: ["القناة", "ما يُعرف عن مخزونها", "كيف تراقبها", "العقبة"],
  compareRows: (x: ChannelsView) => {
    const r = x.ch;
    return [
      { channel: "الاستلام من Apple Store", known: `${count(x.sup.n, RESTOCKS)} مؤكدة منذ ${longDate(x.sup.since)}؛ كل توفر، في كل متجر، بوقته.`, watch: `تنبيه هنا (يُرسَل بعد نحو ${secs(SPEED.alertSec)} من التأكيد)، أو خيار الاستلام في تطبيق Apple Store.`, catch: "يدوم العرض نحو دقيقة؛ تحتاج إلى التطبيق مفتوحًا وبطاقة محفوظة." },
      { channel: "التوصيل من apple.com", known: "تعرض Apple تقدير شحن عند الدفع؛ يتغير يوميًا وليس عدد مخزون أبدًا.", watch: "قدّم الطلب؛ ويتحدث التقدير في صفحة طلبك مع شحن Apple.", catch: "أسابيع لا دقائق — لكن مكانك في الطابور محفوظ." },
      { channel: `شركات الاتصالات (${listB(r.carriers)})`, known: "حصة خاصة؛ المخزون الأونلاين يُعرض لكل خيار على هيئة متوفر / قيد الطلب. لا سجل ولا بيانات متدفقة.", watch: "تطبيقاتها ومحددات متاجرها؛ والاتصال بالمتجر ما زال يفيد.", catch: lockAr(x, "تنطبق شروط الباقات والتقسيط والتفعيل؛ ويختلف المخزون من متجر إلى آخر.") },
      { channel: `متاجر التجزئة (${listB(r.retailers)})`, known: "حصة خاصة، وغالبًا أونلاين فقط لمنتج جديد؛ تُعرض لكل خيار في صفحة المنتج.", watch: "صفحة المنتج والتطبيق لديها؛ وبعضها يرسل بريدًا عند التوفر.", catch: "الحصص أصغر من حصص Apple وتنفد خلال دقائق أيضًا." },
      { channel: `إعادة البيع (${listB(r.resale)})`, known: "متوفر دائمًا بثمن.", watch: "—", catch: `زيادة على السعر، ولا سجل شراء من الشركة المصنّعة، ${r.returnDays ? `ولا شيء من ${returnPhrase(r.returnDays)}` : "ولا فترة إرجاع أصلًا"}.` },
    ];
  },
  compareKeys: (x: ChannelsView) => [
    `${count(x.ch.carriers.length + x.ch.retailers.length, SELLERS)}${where(x)} ولا سجل مخزون عام واحد: أي موقع يزعم معرفة أوقات توفر شركة اتصالات إنما يخمّن.`,
    "موقفنا: راقب الاستلام من Apple Store بتنبيه، وأبقِ طلب توصيل من apple.com احتياطًا، وتفقد صفحة متجر التجزئة حين تكون هناك أصلًا.",
  ],
  pickupLead: (x: ChannelsView) => `للسرعة، الاستلام: الخيار الذي يظهر في صفحة الاستلام يمكن حجزه في تلك الدقيقة واستلامه في اليوم نفسه، بينما ينتظر طلب التوصيل تقدير Apple. ولليقين، التوصيل: يحفظ الطلب مكانك مهما جرى على الرفوف. ${x.sup.lifetimes ? `بقيت عروض الاستلام${where(x)} معروضة ${secs(x.sup.lifetimes.medianSec)} (الوسيط) ونفد ${pct(x.sup.lifetimes.within2min)} منها خلال دقيقتين — ولهذا وُجد التنبيه. ` : ""}والإجابة الصحيحة هي كلاهما: اطلب التوصيل اليوم، وفعّل تنبيه الاستلام، وألغِ ما لا تحتاج إليه.`,
  pickupSwaps: () => [
    { no: "إلغاء طلب التوصيل لـ«البدء من جديد»", yes: "أبقِه حتى يكون الاستلام في يدك", why: "لا تنشر Apple مواضع الطابور؛ والطلب الجديد يأخذ تقدير اليوم فحسب، ونادرًا ما يكون أبكر مما تحمله." },
    { no: "تحديث صفحة الاستلام يدويًا", yes: "دع التنبيه يراقبها", why: `نفحص متاجر التنبيهات كل ${secs(SPEED.fastSec)} ونرسل الإشعار بعد نحو ${secs(SPEED.alertSec)} من التأكيد؛ ومن يحدّث الصفحة بيده يرى أغلب العروض بعد أن تختفي.` },
    { no: "تغيير الطلب إلى الاستلام عند الدفع لاحقًا", yes: "احجز الاستلام طلبًا جديدًا حين يصلك التنبيه", why: "حجوزات الاستلام تأتي من مخزون المتجر، وطلبات التوصيل من المستودع: طابوران مختلفان، والاستلام هو السريع منهما." },
  ],
  pickupKeys: (x: ChannelsView) => [
    `تشرح صفحة Apple نفسها خيارات الاستلام والتوصيل${x.ch.returnDays ? ` وفترة الإرجاع (${count(x.ch.returnDays, DAYS)}) لكليهما` : x.ch.returnDays === 0 ? "؛ ولاحظ أن Apple في هونغ كونغ لا تقبل الإرجاع بتغيير الرأي، بل الاستبدال للعيوب فقط" : ""} (المصادر أدناه).`,
    "حجز الاستلام هو طلب لذلك المتجر؛ تحفظه Apple وتخبرك بموعد الحضور.",
  ],
  carriersLead: (x: ChannelsView) => `إن كنت تريد التقسيط، أو استبدال جهازك القديم ضمن باقة، أو كنت أصلًا في متجر ${x.ch.carriers[0] ? B(x.ch.carriers[0]) : "شركة اتصالات"} وأمامك واحد على الرف — فنعم. وإن كنت تريد الهاتف في أقرب وقت، فشركات الاتصالات قرعة ثانية بفرص أصغر وبلا وسيلة لمراقبتها. ${lockAr(x, "تحقق من شروط القفل والباقة قبل الشراء.")} تعرض متاجرها الأونلاين التوفر لكل خيار، فنظرة سريعة لا تكلف شيئًا؛ لكن لا تتوقع سجلًا أو إشعارًا.`,
  carriersKeys: (x: ChannelsView) => [
    `شركات الاتصالات${where(x)}: ${listB(x.ch.carriers)}.`,
    "مخزون شركات الاتصالات لكل متجر على حدة؛ والمتجر الذي يعرض واحدًا أونلاين قد يتيحه للاستلام من المتجر فقط.",
    "هاتف شركة الاتصالات هو العتاد نفسه؛ والفرق هو العقد المرتبط به.",
  ],
  retailersLead: (x: ChannelsView) => `تستحق نظرة حين تتسوق هناك أصلًا، ولا تستحق المراقبة: ${listB(x.ch.retailers)} تعرض iPhone Duo لكل خيار وتبيع حصتها أونلاين خلال دقائق، بلا بيانات متدفقة تشترك فيها. ميزتها شروط الدفع ونقاط الولاء؛ وعيبها حصة أصغر من حصة متاجر Apple نفسها.`,
  retailersKeys: (x: ChannelsView) => [
    `متاجر التجزئة${where(x)}: ${listB(x.ch.retailers)}.`,
    "تفقد محدد الخيارات في صفحة المنتج: الخيار الباهت يعني نفاده أونلاين، ولا يقول شيئًا عن متاجرها.",
  ],
  resaleLead: (x: ChannelsView) => {
    const w = x.sup.last7;
    const perDay = w.days ? w.restocks / w.days : 0;
    return `نادرًا. قارن الزيادة على السعر بالانتظار الذي تشتريه بها: وفّرت متاجر Apple${where(x)} ${perDay >= 1 ? `نحو ${count(Math.round(perDay), TIMES)} في اليوم` : "أقل من مرة في اليوم"} هذا الأسبوع، ويُرسَل التنبيه بعد نحو ${secs(SPEED.alertSec)} من توفر مؤكد، فعادةً يأتي دور متجر قريب منك تراقبه خلال أيام. في المقابل، لا يقدّم ${listB(x.ch.resale)} أي سجل شراء من الشركة المصنّعة، و${x.ch.returnDays ? `لا شيء من ${returnPhrase(x.ch.returnDays)}` : "لا فترة إرجاع أصلًا"}، إلى جانب المخاطر المعتادة — جهاز مقفل بقفل التنشيط، أو علبة مبدَّلة، أو مرتجع بغلاف «مختوم».`;
  },
  resaleKeys: () => [
    "إن اشتريت من إعادة البيع: التقِ البائع شخصيًا، وشغّل الجهاز، وتحقق من الرقم التسلسلي في الإعدادات ← عام ← حول، وسجّل الدخول قبل أن تدفع.",
    "ضمان Apple يتبع الجهاز لا الفاتورة — لكن قد يُطلب إثبات الشراء؛ والبيع من فرد لا يمنحك إثبات Apple.",
    "الزيادة التي تتجاوز أسبوعًا من الانتظار هي ثمن لنفاد الصبر؛ فقرر وأنت تعرف ذلك.",
  ],
  abroadLead: (x: ChannelsView) => `غالبًا نعم، مع تحققات: iPhone المشترى من Apple يُباع غير مقفل في أغلب الدول، وخدمة ضمان Apple متاحة دوليًا مع استثناءات، ويجب أن يدعم الطراز ترددات شركة الاتصالات في بلدك — وeSIM لديها، لأن صفحات الشراء لدى Apple تدرج iPhone Duo بـeSIM فقط في كل دولة. والضرائب هي التكلفة الحقيقية: ${x.c.pricesIncludeTax ? "السعر الذي تدفعه في الخارج يشمل ضريبة محلية قد لا يمكنك استعادتها" : "تُضاف ضريبة المبيعات عند الدفع"}، وقد تضيف جمارك بلدك رسومًا في طريق العودة. يتابع PickupChecker ${x.us ? `${N(18)} دولة أخرى` : `الولايات المتحدة و${N(17)} دولة أخرى`}، فسؤال المخزون نفسه تجيب عنه صفحات الدول.`,
  abroadKeys: () => [
    "قبل الشراء: صفحة ضمان Apple عن أماكن تقديم الخدمة، وقائمة ترددات الطراز وشرائحه، ودعم eSIM لدى شركة اتصالاتك في بلدك.",
    "احتفظ بالفاتورة: الخدمة وأي إرجاع يخضعان لقواعد دولة الشراء.",
    "الهاتف المشترى لشخص في بلدك هو أيضًا هاتف مشترى من الخارج؛ وتنطبق التحققات نفسها.",
  ],
  methodLead: (x: ChannelsView) => `أرقام Apple Store في هذه الصفحة من فحوص PickupChecker نفسه ل${storesPhrase(x)} كل ${secs(SPEED.checkSec)} منذ ${longDate(x.sup.since)}؛ ولا يُحتسب التوفر إلا بعد رصدَين متطابقَين. وقوائم شركات الاتصالات ومتاجر التجزئة هي البائعون الذين تسمّيهم Apple نفسها للدولة إضافة إلى أكبر الموزعين، وصفحاتهم هي المصادر؛ وما نقوله عن مخزونهم هو ما تُظهره صفحاتهم، وهو لقطة لا سجل. لا نزحف على مواقعهم ولا ندّعي شيئًا عن أوقات توفرهم.`,
  methodKeys: () => ["التصحيحات مرحّب بها: إن لم يعد بائع في هذه الصفحة يبيع iPhone Duo، أخبرنا ونحذفه.", "اقتبس مع رابط وتاريخ."],
  faq: (x: ChannelsView): Faq[] => [
    { q: `أي قناة توفّر iPhone Duo أسرع${where(x)}؟`, a: `القناة الوحيدة التي لها سجل قابل للقياس هي الاستلام من Apple Store: ${count(x.sup.last7.restocks, RESTOCKS)} مؤكدة في الأيام السبعة الأخيرة${where(x)}${x.sup.last7.medianSec ? `، بقي كلٌّ منها معروضًا ${secs(x.sup.last7.medianSec)} (الوسيط)` : ""}. شركات الاتصالات ومتاجر التجزئة توفّر أيضًا لكنها لا تنشر بيانات متدفقة، فلا يستطيع أحد ترتيبها بصدق.` },
    { q: "إن ألغيت طلبي على apple.com وأعدت الطلب، هل أخسر مكاني؟", a: "تحصل على طلب جديد بتقدير شحن اليوم؛ ولا تنشر Apple أي موضع في الطابور. قارن التقدير المعروض عند الدفع بتقدير طلبك الحالي قبل الإلغاء — فنادرًا ما يكون أبكر." },
    { q: "هل iPhone Duo من شركة الاتصالات يختلف عن iPhone Duo من Apple؟", a: `العتاد نفسه. ${lockAr(x, "الفرق هو الباقة وأي شروط قفل أو تقسيط مرتبطة به.")} ومخزون شركات الاتصالات منفصل عن مخزون Apple ويُعرض لكل متجر.` },
    { q: "هل يمنحني الشراء من متجر تجزئة فترة إرجاع Apple؟", a: x.ch.returnDays ? `لا — تنطبق سياسة متجر التجزئة نفسه. وفترة Apple (${count(x.ch.returnDays, DAYS)}) تنطبق على المشتريات من Apple (apple.com ومتاجر Apple Store).` : x.ch.returnDays === 0 ? "Apple في هونغ كونغ لا تقبل بنفسها الإرجاع بتغيير الرأي (الاستبدال للعيوب فقط)، فقارن سياسة متجر التجزئة نفسه — بعضها أكرم من Apple هناك." : "لا — تنطبق سياسة متجر التجزئة نفسه؛ وفترة إرجاع Apple تغطي المشتريات من Apple فقط." },
    { q: "أي شركات اتصالات تدرجها Apple لجهاز iPhone Duo؟", a: x.c.cc === "us" || x.c.cc === "jp" ? `تسمّي صفحة الشراء لدى Apple${where(x)} ${listB(x.ch.carriers)}؛ وصفحة كل دولة أخرى تبيعه غير مقفل من دون خطوة شركة اتصالات.` : `تبيع صفحة الشراء لدى Apple${where(x)} جهاز iPhone Duo غير مقفل ولا تسمّي أي شركة اتصالات؛ و${listB(x.ch.carriers)} هي الشبكات التي تدرجها Apple داعمةً لـiPhone هناك، وتبيعه بشروطها.` },
    { q: "هل يمكنني استخدام iPhone Duo مشترى من الخارج مع شركة اتصالاتي في بلدي؟", a: "عادةً نعم، إذا دعم الطراز ترددات شركة اتصالاتك، وكانت تقدّم eSIM (iPhone Duo بـeSIM فقط في كل مكان)، وكان غير مقفل — وهو ما تبيعه Apple في أغلب الدول. خدمة الضمان دولية مع استثناءات؛ والضرائب والجمارك هي التكلفة الإضافية الحقيقية." },
  ],
  sources: { buy: "Apple: شراء iPhone Duo", pickup: "Apple: الاستلام من المتجر والتوصيل", returns: "Apple: الإرجاع وفترة الإرجاع", warranty: "Apple: خدمة الضمان حسب الدولة", log: "PickupChecker: سجل التوفر الذي تُحتسب منه هذه الصفحة" },
  ld: (x: ChannelsView) => ({
    description: `الاستلام من Apple Store مقابل التوصيل من apple.com مقابل شركات الاتصالات مقابل متاجر التجزئة مقابل إعادة البيع لجهاز iPhone Duo${where(x)}: حالات توفر Apple Store المقاسة، وما تستطيع القنوات الأخرى أن تخبرك به وما لا تستطيع.`,
  }),
  related: "تابع القراءة",
  sameData: "البيانات نفسها، أسئلة أخرى",
  otherCountries: "هذه الصفحة لدول أخرى",
  questions: { howToGet: "كيف تحصل على iPhone Duo", whereToBuy: "من أين تشتري واحدًا اليوم", shortage: "هل ينفرج النقص؟", configs: "أي خيار هو الأسهل حصولًا؟", restockTimes: "متى توفّر Apple جهاز iPhone Duo؟", alerts: "أسرع طريقة لتلقي الإشعار" },
  setUpAlert: "فعّل التنبيهات",
  logLive: "سجل التوفر مباشرة",
  faqTitle: "أسئلة يطرحها الناس",
  onThisPage: "في هذه الصفحة",
};

/* ================================================================== واجهة API العامة */
const api: DecideDict["api"] = {
  crumb: "واجهة API للمخزون",
  title: (c: Country) => fitTitleW([
    `API مجاني لمخزون iPhone Duo ${biCountry(c.cc)}: JSON مباشر`,
    `واجهة API مجانية لمخزون iPhone Duo ${biCountry(c.cc)}`,
    `API مخزون iPhone Duo (${country(c.cc)})`,
  ], 49),
  metaDescription: (x: ApiView) => fitTitleW([
    `واجهة JSON مجانية للقراءة فقط لمخزون استلام iPhone Duo في ${count(x.stores, APPLE_STORES_G)}${where(x)} (${N(x.worldStores)} في ${count(x.countries, COUNTRIES_F)}): التوفر الحالي لكل متجر وخيار، وحالات التوفر المؤكدة في آخر 24 ساعة، بلا مفتاح، بتخزين مؤقت 30 ثانية. نقاط النهاية، وأمثلة curl وPython وJavaScript، والحدود، ومتى يتفوق السكربت على التنبيه.`,
    `واجهة JSON مجانية لمخزون iPhone Duo في ${count(x.stores, APPLE_STORES_G)}${where(x)}: التوفر لكل متجر، وحالات توفر آخر 24 ساعة، بلا مفتاح. نقاط النهاية والأمثلة والحدود.`,
  ], 160),
  h1: (x: ApiView) => `هل توجد واجهة API أو سكربت لمراقبة مخزون iPhone Duo في متاجر Apple${where(x)}؟`,
  intro: (x: ApiView) => `نعم: ينشر PickupChecker واجهة JSON مجانية للقراءة فقط تغطي ${storesPhrase(x)} (${count(x.worldStores, STORES_G)} في ${count(x.countries, COUNTRIES_F)} إجمالًا)، مبنية من فحوص كل ${secs(SPEED.checkSec)} لكل متجر ومخزّنة مؤقتًا 30 ثانية على الحافة، بلا مفتاح ولا تسجيل. يعيد طلب واحد توفر الاستلام الحالي لـiPhone Duo في كل متجر حسب الخيار؛ ويعيد طلب ثانٍ حالات التوفر المؤكدة في آخر 24 ساعة. الآن ${N(x.storesNow)} من ${count(x.stores, STORES_G)}${where(x)} ${x.storesNow === 1 ? "يعرض" : "تعرض"} واحدًا، وتأكدت ${count(x.restocks24, RESTOCKS)} في آخر 24 ساعة. أدناه: نقاط النهاية، وأمثلة عاملة بـcurl وPython وJavaScript، ومرجع الحقول، والحدود — ولماذا يبقى السكربت الذي يستطلع بفاصل التخزين المؤقت (30 ثانية) أبطأ من إشعار التنبيه.`,
  updated: (x: ApiView, stamp: string) => `آخر تحديث ${stamp} · ${count(x.stores, APPLE_STORES)}${where(x)} · فحص كل ${secs(SPEED.checkSec)} · تخزين مؤقت للواجهة 30 ثانية`,
  nav: { endpoints: "نقاط النهاية", examples: "أمثلة", fields: "الحقول", limits: "الحدود والشروط", script: "سكربت أم تنبيه؟", apple: "زحف apple.com", method: "من أين تأتي البيانات" },
  h2: (x: ApiView) => ({
    endpoints: `ماذا تعيد واجهة API لمخزون iPhone Duo${where(x)}؟`,
    examples: "كيف أستدعيها من curl أو Python أو JavaScript؟",
    fields: "ماذا تعني الحقول؟",
    limits: "كم مرة يمكنني الاستطلاع، وما الشروط؟",
    script: "هل أكتب سكربتي الخاص أم أستخدم التنبيهات فحسب؟",
    apple: "هل يمكنني استطلاع apple.com بنفسي بدلًا من ذلك؟",
    method: "من أين تأتي البيانات",
  }),
  hero: { stores: ((one: boolean): string => (one ? "متجر Apple مشمول" : "متاجر Apple مشمولة")) as DecideDict["api"]["hero"]["stores"], now: "تعرض iPhone Duo الآن", restocks24: "حالة توفر مؤكدة، آخر 24 ساعة", cache: "ثانية تخزين مؤقت للواجهة" },
  perMinute: "طلبًا في الدقيقة لكل عنوان",
  keysNeeded: "مفاتيح API مطلوبة",
  endpointsLead: (x: ApiView) => `ثلاث نقاط نهاية GET، كلها JSON، كلها تحت ${B("https://pickupchecker.com/api/v1")}: ${B("stock")} تعيد كل متجر Apple${where(x)} مع الخيارات التي يعرضها للاستلام الآن ووقت آخر فحص له؛ و${B("restocks")} تعيد حالات التوفر المؤكدة في آخر ${B("1–168")} ساعة، الأحدث أولًا، مع ما إذا كان كلٌّ منها ما زال معروضًا؛ و${B("iphone-duo")} اختصار لـ${B("stock?model=duo")}. رمز الدولة يأتي في المسار (${B(x.c.cc)}${x.c.cc === "uk" ? `، ويُقبل ${B("gb")} أيضًا` : ""})؛ والطرازات هي ${B("duo")} و${B("18-pro")} و${B("18-pro-max")}.`,
  endpointsCaption: `نقاط النهاية (ضع بدل ${B("{country}")} أحد الرموز: ${B("us, ca, uk, au, de, fr, it, es, jp, kr, hk, sg, ae, ch, nl, se, tw, at, be")})`,
  endpointsHead: ["نقطة النهاية", "تعيد", "المعاملات"],
  endpointsRows: (x: ApiView) => [
    { path: `/api/v1/${x.c.cc}/stock`, returns: `كل متجر: ${B("in_stock")}، والخيارات المتوفرة، و${B("last_checked_at")}، و${B("last_in_stock_at")}؛ وملخص فيه ${B("stores_in_stock")}.`, params: `${B("model")} (${B("duo | 18-pro | 18-pro-max")})، ${B("storage")} (مثل ${B("512GB")})، ${B("color")} (مثل ${B("night-sky")})` },
    { path: `/api/v1/${x.c.cc}/restocks`, returns: `حالات التوفر المؤكدة، الأحدث أولًا: ${B("at")}، و${B("store")}، والخيار، و${B("still_listed")}.`, params: `${B("model")}، ${B("hours")} (${B("1–168")}، الافتراضي 24)، ${B("limit")} (${B("1–200")}، الافتراضي 100)` },
    { path: `/api/v1/${x.c.cc}/iphone-duo`, returns: `يحوّل إلى ${B("stock?model=duo")}.`, params: "—" },
    { path: "/api/v1", returns: "هذه القائمة، والدول والطرازات، والحدود.", params: "—" },
  ],
  examplesLead: `انسخ أحد هذه الأمثلة؛ يطبع كلٌّ منها المتاجر التي تعرض iPhone Duo الآن. بلا مفتاح، ولا ترويسة سوى ${B("User-Agent")} يسمّي سكربتك (لنستطيع مراسلتك إن أساء التصرف).`,
  exampleTitles: { curl: "curl (أي صدفة أوامر)", python: "Python 3، المكتبة القياسية فقط", node: `JavaScript (${B("Node 18+")} أو متصفح)` },
  fieldsLead: `كل الحقول بصيغة ${B("snake_case")} وكل الأوقات ${B("ISO 8601")} بتوقيت UTC. معرّفات المتاجر هي معرّفات Apple نفسها (الأرقام التي تبدأ بـ${B("R")})، فتطابق صفحات متاجر Apple وروابط هذا الموقع.`,
  fieldsCaption: "مرجع الحقول",
  fieldsHead: ["الحقل", "النوع", "المعنى"],
  fieldsRows: () => [
    { f: "generated_at", t: "string", m: "وقت احتساب هذه الإجابة؛ وقد تقدمها شبكة CDN حتى 30 ثانية." },
    { f: "country.code / name / currency", t: "string", m: "دولة المتاجر." },
    { f: "configurations[]", t: "object", m: "أرقام القطع التي يغطيها الاستعلام، مع السعة واللون كما تكتبهما Apple." },
    { f: "summary.stores_in_stock", t: "integer", m: "المتاجر التي تعرض خيارًا مشمولًا واحدًا على الأقل للاستلام الآن." },
    { f: "stores[].store_number", t: "string", m: `معرّف متجر Apple، مثل ${B("R085")}.` },
    { f: "stores[].in_stock", t: "boolean", m: "خيار مشمول واحد على الأقل معروض للاستلام." },
    { f: "stores[].available[]", t: "object", m: `الخيارات المعروضة: ${B("part_number")} و${B("storage")} و${B("color")}.` },
    { f: "stores[].last_checked_at", t: "string | null", m: `آخر مرة قرأنا فيها صفحة الاستلام لدى Apple لهذا المتجر (عادةً قبل أقل من ${secs(SPEED.checkSec)}).` },
    { f: "stores[].last_in_stock_at", t: "string | null", m: "آخر لحظة عرض فيها هذا المتجر خيارًا مشمولًا." },
    { f: "restocks[].at", t: "string", m: "وقت انتقال الخيار من «نفد» إلى «متوفر» (مؤكدًا بفحصَين)." },
    { f: "restocks[].still_listed", t: "boolean | null", m: "هل ما زال ذلك المتجر يعرضه وقت الإجابة." },
    { f: "attribution", t: "object", m: "المصدر، وسطر الترخيص، وهذه الصفحة." },
  ],
  limitsLead: `استطلع بفاصل 30 ثانية أو أكثر لكل نقطة نهاية — فالإجابات مخزّنة مؤقتًا هذه المدة على الحافة، والفاصل الأقصر يعيد JSON نفسه — وابقَ تحت 60 طلبًا في الدقيقة من العنوان الواحد، وهو الحد الذي يصل إلى خوادمنا. البيانات مجانية الاستخدام، بما في ذلك تجاريًا، بشرط واحد: اعرض «المصدر: PickupChecker» مع رابط إلى pickupchecker.com (أو صفحة المتجر أو الدولة) حيثما ظهرت الأرقام. بلا مفتاح، ولا تسجيل، وCORS مفتوح، فيمكن لصفحة متصفح أن تستدعيها مباشرة.`,
  limitsKeys: () => [
    `إجابة ${B("429")} تعني أكثر من 60 طلبًا في دقيقة من عنوانك؛ انتظر عدد الثواني في ${B("Retry-After")}.`,
    `التغييرات الكاسرة تأخذ مسار إصدار جديد (${B("/api/v2")})؛ وتحت ${B("v1")} تُضاف الحقول ولا تُعاد تسميتها أبدًا.`,
    `رجاءً عيّن ${B("User-Agent")} يسمّي مشروعك وجهة اتصال؛ لم نحجب سكربتًا مهذبًا قط.`,
  ],
  scriptLead: (x: ApiView) => `إن كنت تريد لوحة بيانات أو بوت Discord أو جدول بيانات أو بحثًا، فاكتب السكربت — لهذا وُجدت الواجهة. وإن كنت تريد فعلًا شراء iPhone Duo، فالسكربت هو الأداة الأبطأ: يرى التوفر عند استطلاعه التالي، بعد 30 ثانية على الأكثر، ثم عليه أن يخبرك؛ أما إشعار التنبيه عندنا فيقرأ المتاجر نفسها كل ${secs(SPEED.fastSec)}، ويؤكد التوفر، ويُرسَل بعد نحو ${secs(SPEED.alertSec)} — ${x.storesNow !== undefined ? "ضمن وسيط مدة العرض البالغ نحو دقيقة" : "ضمن وسيط مدة العرض"}. كثيرون يفعلون الأمرَين: التنبيه للشراء، والواجهة للمراقبة.`,
  scriptCaption: "سكربت استطلاع مقابل إشعار التنبيه",
  scriptHead: ["", "سكربتك على هذه الواجهة", "تنبيه PickupChecker"],
  scriptRows: () => [
    { k: "يرى التوفر بعد", a: "حتى 30 ثانية (التخزين المؤقت) + فاصلك", b: `إرسال الإشعار بعد نحو ${secs(SPEED.alertSec)} من رصد فحصنا له` },
    { k: "يصل إلى هاتفك", a: "بما تبنيه أنت (بريد، بوت، رسالة نصية)", b: "إشعار من تطبيق الشاشة الرئيسية" },
    { k: "المتاجر المراقبة", a: "كلها، في كل استدعاء", b: `متاجرك المختارة كل ${secs(SPEED.fastSec)}، وكل المتاجر كل ${secs(SPEED.checkSec)}` },
    { k: "التكلفة", a: "مجاني", b: "باقة للتنبيهات؛ وهذا الموقع مجاني للقراءة" },
  ],
  appleLead: "يمكنك، ضمن حدود: صفحة الاستلام على apple.com تجيب لكل متجر وخيار، وهو بالضبط ما نقرأه. ما يفوّته السكربت العابر هو العناية — تدوير IPv6 لتبقى Apple تجيب، وقاعدة الرصدَين كي لا يتحول «غير متوفر» متذبذب إلى توفر زائف، ومعالجة المناطق الزمنية لكل متجر، وسجل محفوظ منذ يوم الإطلاق. إن كنت تريد الإجابة فحسب، فالواجهة هي ذلك العمل منجزًا؛ وإن كنت تريد أن تتعلم، فصفحة طريقة العمل تشرح كل جزء.",
  appleKeys: () => [
    "صفحة Apple لقطة: تخبرك بالآن، ولا تخبرك أبدًا كم دام العرض أو متى كان آخر توفر.",
    `تفصل بين فحوصنا ${secs(SPEED.checkSec)} لكل متجر ولا تقل عن ${secs(SPEED.fastSec)} أبدًا؛ والسكربت الذي يستطلع apple.com أكثر من ذلك يُحجب ولا يتعلم شيئًا.`,
  ],
  methodLead: (x: ApiView) => `كل رقم يأتي من قراءة PickupChecker توفرَ الاستلام من المتجر الذي تنشره Apple نفسها ل${storesPhrase(x)} كل ${secs(SPEED.checkSec)} (وكل ${secs(SPEED.fastSec)} في المتاجر التي عليها تنبيهات). لا يُعتمد التغيير إلا بعد رصدَين متطابقَين؛ وأول رؤية بعد انقطاع ليست توفرًا. تقدّم الواجهة الجداول نفسها التي تقرأها صفحات هذا الموقع؛ لا شيء مُعايَن ولا مُقدَّر.`,
  methodKeys: () => ["الطريقة كاملة: صفحة طريقة العمل.", "الإسناد هو الثمن كله؛ ورابط العودة يبقي هذا مجانيًا."],
  faq: (x: ApiView): Faq[] => [
    { q: `هل توجد واجهة API مجانية لمخزون iPhone Duo في متاجر Apple${where(x)}؟`, a: `نعم — واجهة PickupChecker، على ${B(`https://pickupchecker.com/api/v1/${x.c.cc}/stock`)}: كل متجر Apple${where(x)} مع الخيارات التي يعرضها للاستلام الآن، بصيغة JSON، بلا مفتاح، مخزّنة مؤقتًا 30 ثانية. وتعيد نقطة نهاية ثانية حالات التوفر المؤكدة في آخر 24 ساعة.` },
    { q: "هل لدى Apple واجهة API رسمية للمخزون؟", a: "لا توجد واجهة عامة. يمكن قراءة صفحة الاستلام على apple.com لكل متجر وخيار، وهو ما يفعله هذا الموقع بعناية (تدوير، وتأكيد، ومناطق زمنية)؛ والواجهة هنا هي ذلك العمل معروضًا بصيغة JSON." },
    { q: "ما مدى حداثة البيانات؟", a: `يُفحص كل متجر كل ${secs(SPEED.checkSec)} (وكل ${secs(SPEED.fastSec)} في المتاجر التي عليها تنبيهات) وتُخزَّن إجابة الواجهة مؤقتًا 30 ثانية، فعمر أي رقم نحو 45 ثانية على الأكثر؛ و${B("last_checked_at")} يخبرك بالضبط.` },
    { q: "هل يمكنني استخدامها في منتج تجاري؟", a: "نعم، مع الإسناد: «المصدر: PickupChecker» مرتبطًا بـpickupchecker.com حيثما تُعرض البيانات، وفاصل استطلاع 30 ثانية أو أكثر. ولا حاجة إلى مفتاح." },
    { q: "هل يوصلني السكربت إلى iPhone Duo أسرع من التنبيه؟", a: `لا: يرى السكربت التوفر عند استطلاعه التالي، بعد 30 ثانية على الأكثر؛ أما التنبيه فيؤكده ويُرسَل بعد نحو ${secs(SPEED.alertSec)} من رؤيتنا له. استخدم السكربت للمراقبة والتنبيه للشراء.` },
  ],
  sources: { pickup: "Apple: الاستلام من المتجر", method: "PickupChecker: كيف تعمل الفحوص", log: "PickupChecker: سجل التوفر" },
  ld: (x: ApiView) => ({
    description: `واجهة JSON مجانية لتوفر استلام iPhone Duo في ${storesPhrase(x)}: المخزون الحالي لكل متجر وخيار، وحالات التوفر المؤكدة في آخر 24 ساعة.`,
  }),
  related: "تابع القراءة",
  sameData: "البيانات نفسها، أسئلة أخرى",
  otherCountries: "هذه الصفحة لدول أخرى",
  questions: { alerts: "أسرع طريقة لتلقي الإشعار", howItWorks: "كيف تعمل الفحوص", restockTimes: "متى توفّر Apple جهاز iPhone Duo؟", shortage: "هل ينفرج النقص؟", configs: "أي خيار هو الأسهل حصولًا؟", stockChecker: "فحص مخزون iPhone Duo" },
  setUpAlert: "فعّل التنبيهات",
  tryIt: "افتح JSON المباشر",
  faqTitle: "أسئلة يطرحها الناس",
  onThisPage: "في هذه الصفحة",
};

export const decide: DecideDict = { configs, supply, channels, api };
