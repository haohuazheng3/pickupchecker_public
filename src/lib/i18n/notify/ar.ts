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
  checkoutSubmit: (plan: string, limit: number, fastSec: number, checkSec: number, alertSec: number) => `${plan}: ${alerts(limit)}. نفحص متاجرك كل ${secs(fastSec)} (وكل المتاجر كل ${secs(checkSec)})، ويصلك إشعار بعد نحو ${secs(alertSec)} من تأكيد التوفر. اشتراك شهري، ألغِ في أي وقت.`,
  stopped: {
    deviceWord: { ios: "iPhone", android: "هاتف Android", desktop: "الكمبيوتر", other: "الجهاز" },
    subject: (device: string) => `توقفت الإشعارات على ${device} — افتح PickupChecker من الشاشة الرئيسية`,
    gone: (device: string) => `توقف ${device} عن استقبال إشعارات PickupChecker (أبلغت خدمة الإشعارات أن الاشتراك لم يعد موجودًا).`,
    noAlerts: "لن تصلك تنبيهات التوفر حتى تعيد تفعيل الإشعارات: يرسل PickupChecker التنبيهات كإشعارات فقط، وليس عبر البريد الإلكتروني.",
    reopenIos: "افتح PickupChecker من الشاشة الرئيسية (لا من Safari)، واضغط «تفعيل الإشعارات» في صفحة «تنبيهاتي».",
    reopenOther: "افتح PickupChecker، وانتقل إلى «تنبيهاتي» واضغط «تفعيل الإشعارات».",
    causes: "أسباب شائعة: حُذف التطبيق من الشاشة الرئيسية، أو أُوقفت الإشعارات من الإعدادات، أو استُعيد الهاتف.",
  },
};
