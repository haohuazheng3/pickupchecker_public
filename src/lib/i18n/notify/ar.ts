/**
 * نصوص الإشعارات بالعربية (الإشعار الفوري، بريد التنبيه، بريد «توقفت الإشعارات»، أسماء الأجهزة، سطر صفحة الدفع في Stripe).
 * يرسلها الـpoller أيضًا، لذا لا استيراد إلا للأنواع. الأرقام غربية.
 */
import type { NotifyText } from "./en";

/** Arabic counting: one / two / 3–10 / 11–99 / 100+. */
const ar = (n: number, one: string, two: string, few: string, many: string): string => {
  const r = n % 100;
  return n === 1 ? one : n === 2 ? two : r >= 3 && r <= 10 ? `${n} ${few}` : r >= 11 ? `${n} ${many}` : `${n} ${one}`;
};
const secs = (n: number) => ar(n, "ثانية", "ثانيتين", "ثوانٍ", "ثانية");
const alerts = (n: number) => ar(n, "تنبيه", "تنبيهان", "تنبيهات", "تنبيهًا");

export const notifyAr: NotifyText = {
  pushTitle: (cfg: string) => cfg,
  pushBody: (where: string, quote: string | null) => `${where}${quote ? ` — ${quote}` : ""}. اضغط للحجز على apple.com.`,
  testTitle: "إشعارات PickupChecker مفعّلة",
  testBody: (time: string, device: string) => `أُرسل الاختبار ${time} إلى ${device}. تنبيهات التوفر تصلك بالطريقة نفسها، خلال ثوانٍ.`,
  device: {
    iphoneApp: "iPhone (تطبيق الشاشة الرئيسية)",
    iphoneSafari: "iPhone (Safari)",
    androidApp: "Android (تطبيق مثبّت)",
    android: (browser: string) => `Android${browser ? ` (${browser})` : ""}`,
    computer: (browser: string) => `الكمبيوتر${browser ? ` (${browser})` : ""}`,
    other: "هذا الجهاز",
  },
  email: {
    subject: (cfg: string, store: string, more: number) => `متوفر: ${cfg} في ${store}${more > 0 ? ` و${more} أخرى` : ""}`,
    intro: "خبر سار — متوفر للاستلام من المتجر الآن:",
    reserve: "احجز",
    store: "المتجر",
    tip: "مخزون الاستلام ينفد بسرعة: افتح تطبيق Apple Store أو apple.com، واختر «Pick up» (الاستلام) ثم المتجر.",
    manage: (url: string) => `إدارة هذا التنبيه أو إيقافه مؤقتًا: ${url}`,
    htmlTitle: "متوفر للاستلام الآن",
    htmlReserve: "احجز على apple.com",
    htmlStorePage: "صفحة المتجر ←",
    htmlTip: "مخزون الاستلام ينفد بسرعة — احجز من تطبيق Apple Store أو apple.com، واختر <b>Pick up</b> (الاستلام) ثم المتجر.",
    htmlManage: "إدارة هذا التنبيه أو إيقافه مؤقتًا",
  },
  checkoutSubmit: (plan: string, limit: number, fastSec: number, checkSec: number, alertSec: number) => `${plan}: ${alerts(limit)}. نفحص متاجرك كل ${secs(fastSec)} (وكل المتاجر كل ${secs(checkSec)})، ويصلك إشعار بعد نحو ${secs(alertSec)} من تأكيد التوفر. اشتراك شهري، ألغِ في أي وقت.`,
  stopped: {
    deviceWord: { ios: "iPhone", android: "هاتف Android", desktop: "الكمبيوتر", other: "الجهاز" },
    subject: (device: string) => `توقفت الإشعارات على ${device} — افتح PickupChecker من الشاشة الرئيسية`,
    gone: (device: string) => `توقف ${device} عن استقبال إشعارات PickupChecker (أبلغت خدمة الإشعارات أن الاشتراك لم يعد موجودًا).`,
    byEmail: "تصلك تنبيهات التوفر الآن عبر البريد الإلكتروني حتى تعيد تفعيل الإشعارات.",
    reopenIos: "افتح PickupChecker من الشاشة الرئيسية (لا من Safari)، واضغط «تفعيل الإشعارات» في صفحة «تنبيهاتي».",
    reopenOther: "افتح PickupChecker، وانتقل إلى «تنبيهاتي» واضغط «تفعيل الإشعارات».",
    causes: "أسباب شائعة: حُذف التطبيق من الشاشة الرئيسية، أو أُوقفت الإشعارات من الإعدادات، أو استُعيد الهاتف.",
  },
};
