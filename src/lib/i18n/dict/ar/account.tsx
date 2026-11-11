/**
 * العربية: account (صفحة «تنبيهاتي» ووحدات التوفر فيها، و/install و/checkout/success و/pricing). تتبع الشخص لا المتجر،
 * فقد تكون متاجره في أي دولة. **الخط العريض** و[النص](الرابط) عبر <Md>. أسماء الباقات ومبالغ الدولار لا تُترجم.
 */
import { SPEED } from "@/lib/plans";
import type { Dict } from "../en";
import { ALERTS, ALERTS_G, DAYS, HOURS, N, SECONDS, STORES, TIMES, count, forms } from "./util";

const secs = (n: number) => count(n, SECONDS);
/** The pricing table's rows: "iPhone واحد", "جهازا iPhone", "3 أجهزة iPhone". */
const IPHONES = forms({ one: "iPhone واحد", two: "جهازا iPhone", few: "# أجهزة iPhone", many: "# جهاز iPhone", other: "# جهاز iPhone" });
const OTHER_STORES = forms({ one: "متجر آخر", two: "متجران آخران", few: "# متاجر أخرى", many: "# متجرًا آخر", other: "# متجر آخر" });
const yours = (n: number) => (n === 1 ? "متجرك" : n === 2 ? "متجريك" : `متاجرك (${N(n)})`);

export const account: Dict["account"] = {
  loading: "جارٍ التحميل",
  meta: { title: "تنبيهاتي" },
  signedInAs: (email: string) => `مسجّل الدخول: ${email}`,
  title: "تنبيهاتي",
  units: { s: "ث", min: "د", taps: "نقرات" },

  plan: {
    title: "الباقة",
    none: "لا باقة بعد: التنبيهات متوقفة",
    summary: (plan: string, on: number, limit: number) => `${plan} · ${N(on)} من ${count(limit, ALERTS)} مفعّلة`,
    renews: (date: string) => ` · تتجدد في ${date}`,
    ends: (date: string) => ` · تنتهي في ${date}`,
  },

  sent: {
    title: "التنبيهات المرسلة",
    last: (ago: string) => `آخرها ${ago}`,
    none: "لم يُرسَل شيء بعد",
    empty: "لم يُرسَل شيء بعد.",
    channel: { push: "إشعار", email: "بريد إلكتروني" },
    status: { sent: "أُرسل", delivered: "وصل", failed: "فشل", skipped: "تُخطّي" },
  },

  fast: {
    title: "احجزه خلال 20 ثانية",
    sub: "أنجز الآن كل شيء إلا النقرات الأربع الأخيرة",
    lasts: "مدة عرض Duo المعتادة",
    push: "تأكيد ← إرسال الإشعار (وصوله لا يُقاس)",
    tapsLeft: "تبقى لك بعد وصول الإشعار",
    steps: [
      { title: "حدّد نافذتك", hint: "ساعات متاجرك أدناه · جهّز قبلها بـ10 دقائق" },
      { title: "جهّز صفحة الدفع في Apple", hint: "السعة واللون بالتحديد ← Delivery & Pickup" },
      { title: "وافق على الشروط · أو اختر غير المقفل", hint: "غير مقفل ومدفوع بالكامل: بلا أي خانة" },
      { title: "أبقِ الشاشة مفتوحة", hint: "«قفل تلقائي» ← «أبدًا» · المسها كل 10–15 دقيقة" },
      { title: "التنبيه: اقرأه ولا تنقره", hint: "Pickup ← المتجر المذكور ← أول موعد ← Apple Pay" },
    ],
    guide: "الدليل في دقيقتين (بالإنجليزية)",
    window: "نافذة التوفر لديك",
  },

  restock: {
    /** "Restock by restock" on the dashboard: each restock against the member's alerts (lib/alertMarks.ts). */
    mark: { delivered: "وصل التنبيه", sent: "أُرسل التنبيه", other: "ليس ضمن تنبيهاتك", before: "قبل تنبيهك" },
    title: "متى تتوفر متاجرك",
    anyIphone: "iPhone",
    and: " و",
    yours,
    Yours: yours,
    otherStores: (n: number) => count(n, OTHER_STORES),
    meta: (what: string, stores: number, days: number, zone: string) => `${what} · ${count(stores, STORES)} · آخر ${count(days, DAYS)} · ${zone}`,
    busiest: (y: string, then: string | null) => (then ? `أكثر ساعة في ${y} · ثم ${then}` : `أكثر ساعة في ${y}`),
    busiestArea: (stores: number, zone: string) => `الأكثر في كل المتاجر الـ${N(stores)} على ${zone}`,
    next: (inHours: number) => `النافذة التالية · ${inHours === 0 ? "هذه الساعة" : `بعد ${count(inHours, HOURS)}`}`,
    typical: "مدة العرض المعتادة قبل النفاد",
    count: (y: string, days: number, total: number, pattern: boolean) => (total === 0 ? `لا توفر في ${y} بعد · آخر ${count(days, DAYS)}` : `التوفر في ${y} · آخر ${count(days, DAYS)}${pattern ? "" : " · أقل من أن يكشف نمطًا"}`),
    byHour: (busiestInGreen: boolean) => `حسب الساعة${busiestInGreen ? " · الأكثر بالأخضر" : ""}`,
    byWeekday: (busiest: string | null) => `حسب يوم الأسبوع${busiest ? ` · الأكثر ${busiest}` : ""}`,
    hourChart: (y: string, zone: string, items: string) => `التوفر حسب الساعة في ${y}، ${zone}: ${items}`,
    weekdayChart: (y: string, items: string) => `التوفر حسب يوم الأسبوع في ${y}: ${items}`,
    chartItem: (label: string, n: number, reported: number) => `${label} ${N(n)}${reported ? ` (+${N(reported)} أبلغت عنها متتبعات أخرى)` : ""}`,
    barTitle: (label: string, n: number, y: string, area: { n: number; zone: string } | null, reported: number) =>
      `${label}: توفر ${count(n, TIMES)} في ${y}${area ? ` · ${N(area.n)} على ${area.zone}` : ""}${reported ? ` · ${N(reported)} أبلغت عنها متتبعات أخرى` : ""}`,
    now: "الآن",
    allZone: (stores: number, zone: string) => `كل المتاجر الـ${N(stores)} على ${zone}`,
    reportMarkBars: "الأعمدة المتقطعة",
    reportMarkDots: "النقاط المفرغة",
    sellTitle: "كم يصمد التوفر في متاجرك",
    sellMeta: (what: string, stores: number, days: number) => `${what} · ${count(stores, STORES)} · آخر ${count(days, DAYS)}`,
    sellLabel: (y: string) => `في ${y}`,
  },

  success: {
    metaTitle: "التنبيهات مفعّلة",
    isOn: (plan: string) => `${plan} مفعّلة`,
    yourPlan: "باقتك",
    received: "تم استلام الدفع",
    onPlan: (limit: number) => `${count(limit, ALERTS)} في باقتك.`,
    planOn: "باقتك مفعّلة.",
    pending: "سيظهر اشتراكك في حسابك خلال دقيقة.",
    open: "افتح تنبيهاتي",
    another: "أضف تنبيهًا آخر",
    saved: (n: number) => `تم حفظ ${count(n, ALERTS_G)} · الإيصال من Stripe`,
    pushOn: "الإشعارات",
    pushNext: "التالي: التنبيهات على هاتفك",
  },

  install: {
    metaTitle: "احصل على التطبيق: تنبيهات التوفر على شاشتك الرئيسية",
    metaDescription: "أضف PickupChecker إلى شاشتك الرئيسية، وتلقَّ إشعارًا لحظة توفر iPhone Duo أو 18 Pro أو Pro Max للاستلام في متجر Apple قريب منك.",
  },

  pricing: {
    metaTitle: "الباقات: 10 تنبيهات بـ$5، و20 بـ$10، و50 بـ$20",
    metaDescription: `تنبيهات توفر iPhone للاستلام من متاجر Apple: نفحص متاجرك كل ${secs(SPEED.fastSec)}، ويصلك إشعار بعد نحو ${secs(SPEED.alertSec)} من التوفر. Plus بـ$5 شهريًا لعشرة تنبيهات، وPro بـ$10 لعشرين، وMax بـ$20 لخمسين. ألغِ في أي وقت.`,
    title: "الباقات",
    lead: "**التنبيه الواحد = متجر واحد × iPhone محدد واحد.** والتصفح مجاني.",
    chips: ["متاجر Apple الخمسة في الإمارات", "ألغِ في أي وقت", "بطاقة أو Link"],
    speedTitle: "ما مدى السرعة؟ المخطط ثم المقيس",
    speedAnswer: (v) => `نخطط لفحص المتاجر التي تشير إليها تنبيهاتك كل ${secs(SPEED.fastSec)}. وفي القياس خلال آخر 7 أيام في الولايات المتحدة، كان الفاصل بين إجابتين لمثل هذا المتجر **${v.p50}** في الوسيط و${v.p95} عند المئين 95. والوتيرة نفسها في كل باقة.`,
    speedPlanned: `نخطط لفحص المتاجر التي تشير إليها تنبيهاتك كل ${secs(SPEED.fastSec)}، وبقية المتاجر كل ${secs(SPEED.checkSec)}. ستظهر القيم المقيسة هنا بعد تسجيل أسبوع من الفحوص. والوتيرة نفسها في كل باقة.`,
    planned: `المخطط: متاجرك كل **${secs(SPEED.fastSec)}**، وكل المتاجر كل **${secs(SPEED.checkSec)}**`,
    intl: (v) => `خارج الولايات المتحدة: الوسيط **${v.p50}**، والمئين 95 ${v.p95}${v.above ? `، أبطأ من الفاصل المخطط (${secs(SPEED.fastSec)})` : ""}`,
    push: (v) => `أول فحص رأى التوفر ← قبول الإشعار لدى خدمة الإشعارات من Apple أو Google: الوسيط **${v.p50}**، والمئين 90 ${v.p90} (مرات التوفر: ${v.n}، آخر 7 أيام)`,
    pushPending: "ستظهر توقيتات التنبيهات هنا بعد تسجيل أسبوع من التنبيهات",
    notMeasured: "لا نقيس وصول الإشعار إلى هاتفك: خدمات الإشعارات لا تبلغ عنه",
    listingLine: (band, k) => `عرضت صفحة الاستلام في Apple توفر iPhone Duo المعتاد لمدة **${band}** (الوسيط من ${k} مرة توفر، آخر 7 أيام)`,
    band: (range: string) => `${range} ثانية`,
    aboutMinute: "دقيقة تقريبًا",
    report: "[تقرير الخدمة](/service-report): كل مسار فحص خلال 24 ساعة و7 أيام و30 يومًا، مع أحجام العينات والحدود",
    gapTile: "متاجرك: وسيط الفاصل بين الفحوص، 7 أيام",
    plannedTile: "متاجرك: فاصل الفحص المخطط",
    pushTile: "أول رصد ← خدمة الإشعارات، الوسيط، 7 أيام",
    pushTilePending: "أول رصد ← خدمة الإشعارات: قيد القياس",
    listing: "مدة عرض Duo المعتادة على صفحة الاستلام في Apple، الوسيط",
    note: { plus: "iPhone واحد × 10 متاجر", pro: "جهازا iPhone × 10 متاجر", max: "5 أجهزة iPhone × 10 متاجر" },
    month: "/ الشهر",
    alerts: (n: number) => count(n, ALERTS),
    perks: [
      `متاجرك كل ${secs(SPEED.fastSec)}، وكل المتاجر كل ${secs(SPEED.checkSec)}`,
      `إشعار يُرسَل بعد نحو ${secs(SPEED.alertSec)} من تأكيد التوفر`,
    ],
    cancel: "ألغِ في أي وقت",
    get: (plan: string) => `اشترك في ${plan}`,
    needTitle: "هل تحتاج إلى باقة؟",
    needAnswer: "غالبًا لا. الباقة مجدية حين تريد iPhone محددًا في متاجر تستطيع الوصول إليها، ولا يمكنك المتابعة بنفسك، ولا يبقى توفره معروضًا طويلًا. المخزون المباشر والخريطة وسجل التوفر وكل صفحات المتاجر والواجهة البرمجية العامة تبقى مجانية، بلا حساب.",
    skipTitle: "لا تحتاج إليها إن",
    skip: [
      "كنت تتصفح المخزون المباشر أو الخريطة أو سجل التوفر",
      "كان متجرك في متناولك متى شئت: افتح صفحته قبل أن تذهب",
      "كنت مرنًا في الخيار: صفحات المتاجر تعرض كل المتوفر الآن",
      "كنت تريد البيانات: [الواجهة البرمجية العامة المجانية](/iphone-duo-stock-api) تقدم المخزون المباشر نفسه",
    ],
    helpsTitle: "تفيدك الباقة إن",
    helps: [
      "كنت تريد خيارًا محددًا وينفد توفره خلال دقائق",
      "لم تستطع إبقاء صفحة مفتوحة: يُرسل الإشعار حين يؤكد فحصان متطابقان التوفر",
      "كنت تراقب عدة متاجر أو خيارات معًا",
    ],
    tool: "لست متأكدًا من المتاجر أو الألوان؟ يعرض [إعداد التنبيهات](/#notify) مجانًا عدد فترات الاستلام السابقة لاختياراتك وأي تغيير كان سيضيف أكثرها.",
    tableTitle: "كم تنبيهًا تحتاج؟",
    tableAnswer: (plus, pro, max) => `التنبيهات = الخيارات × المتاجر. حتى ${N(plus.limit)} تنبيهات، مثل iPhone واحد في ${N(plus.limit)} متاجر، تكفيها Plus بـ$${plus.price} شهريًا؛ وحتى ${N(pro.limit)} تكفيها Pro بـ$${pro.price}؛ وحتى ${N(max.limit)} تكفيها Max بـ$${max.price}. وما يزيد على ${N(max.limit)} لا تتسع له أي باقة، فقلّل المتاجر أو الخيارات.`,
    corner: "iPhone ↓ · المتاجر ←",
    configsN: (k) => count(k, IPHONES),
    storesN: (k) => count(k, STORES),
    noPlan: "لا تتسع له أي باقة",
    tableNote: "التنبيه الواحد = متجر واحد × خيار محدد واحد (الطراز والسعة واللون). كل باقة تغطي أي مزيج حتى حدها.",
    billing: "الدفع عبر Stripe · بطاقة أو Link · الترقية بالتناسب، والتخفيض من التجديد القادم",
    refund: "لم تناسبك؟ [استرداد كامل خلال 7 أيام](/refunds) إن لم يصلك أي تنبيه توفر بعد",
  },
};
