/**
 * العربية: account (صفحة «تنبيهاتي» ووحدات التوفر فيها، و/install و/checkout/success و/pricing). تتبع الشخص لا المتجر،
 * فقد تكون متاجره في أي دولة. **الخط العريض** و[النص](الرابط) عبر <Md>. أسماء الباقات ومبالغ الدولار لا تُترجم.
 */
import { OTHER_TRACKERS, SPEED } from "@/lib/plans";
import type { Dict } from "../en";
import { ALERTS, ALERTS_G, DAYS, HOURS, N, SECONDS, STORES, TIMES, count, forms } from "./util";

const secs = (n: number) => count(n, SECONDS);
/** "من 8 ثوانٍ إلى 15 دقيقة". */
const others = (() => {
  const m = OTHER_TRACKERS.match(/^(\d+) seconds? to (\d+) minutes?$/);
  return m ? `من ${secs(Number(m[1]))} إلى ${N(Number(m[2]))} دقيقة` : OTHER_TRACKERS;
})();
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
    status: { sent: "أُرسل", failed: "فشل", skipped: "تُخطّي" },
  },

  fast: {
    title: "احجزه خلال 20 ثانية",
    sub: "أنجز الآن كل شيء إلا النقرات الأربع الأخيرة",
    lasts: "مدة عرض Duo المعتادة",
    push: "تأكيد ← إشعار على هاتفك",
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
    fastest: "أسرع فاصل فحص معلن بين كل متتبعات مخزون iPhone",
    everyFast: `متاجرك كل **${secs(SPEED.fastSec)}** · المتتبعات الأخرى تعلن فواصل ${others}`,
    sellsOut: (band: string) => `ينفد توفر iPhone Duo المعتاد خلال **${band}**، وبعضه خلال 20–30 ثانية`,
    band: (range: string) => `${range} ثانية`,
    aboutMinute: "دقيقة تقريبًا",
    sameSpeed: "السرعة نفسها في كل باقة",
    rechecked: "إعادة فحص متاجرك",
    toPhone: "من تأكيد التوفر إلى هاتفك",
    listing: "مدة عرض Duo المعتادة، من الظهور حتى النفاد",
    note: { plus: "iPhone واحد × 10 متاجر", pro: "جهازا iPhone × 10 متاجر", max: "5 أجهزة iPhone × 10 متاجر" },
    month: "/ الشهر",
    alerts: (n: number) => count(n, ALERTS),
    perks: [
      `متاجرك كل ${secs(SPEED.fastSec)}، وكل المتاجر كل ${secs(SPEED.checkSec)}`,
      `إشعار بعد نحو ${secs(SPEED.alertSec)} من تأكيد التوفر`,
    ],
    cancel: "ألغِ في أي وقت",
    get: (plan: string) => `اشترك في ${plan}`,
    billing: "الدفع عبر Stripe · بطاقة أو Link · تغيير الباقة يُحتسب بالتناسب",
    refund: "لم تناسبك؟ [استرداد كامل خلال 7 أيام](/refunds) إن لم يصلك أي تنبيه توفر بعد",
  },
};
