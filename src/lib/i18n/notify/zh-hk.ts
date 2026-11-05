/**
 * 繁體中文（香港）notification texts (push, alert email, "notifications stopped" email, Stripe checkout line).
 * Poller-safe: type imports only. Apple Hong Kong calls in-store pickup 提取.
 */
import type { NotifyText } from "./en";

/** "你的 iPhone 已…" but "你的電腦已…": spaces only around a Latin name. */
const yourDevice = (d: string): string => `你的${/^[A-Za-z]/.test(d) ? " " : ""}${d}${/[A-Za-z)]$/.test(d) ? " " : ""}`;

export const notifyZhHK: NotifyText = {
  pushTitle: (cfg: string) => cfg,
  pushBody: (where: string, quote: string | null) => `${where}${quote ? `——${quote}` : ""}。按此在 apple.com 預訂。`,
  testTitle: "PickupChecker 通知已開啟",
  testBody: (time: string, device: string) => `已於 ${time} 發送測試到${yourDevice(device).trimEnd()}。補貨提醒會以同樣方式，在幾秒內送到。`,
  device: {
    iphoneApp: "iPhone（主畫面 App）",
    iphoneSafari: "iPhone（Safari）",
    androidApp: "Android（已安裝 App）",
    android: (browser: string) => `Android${browser ? `（${browser}）` : ""}`,
    computer: (browser: string) => `電腦${browser ? `（${browser}）` : ""}`,
    other: "這部裝置",
  },
  checkoutSubmit: (plan: string, limit: number, fastSec: number, checkSec: number, alertSec: number) => `${plan}：${limit} 個提醒。你的分店每 ${fastSec} 秒檢查一次（所有分店每 ${checkSec} 秒），確認補貨後約 ${alertSec} 秒推送。按月收費，隨時取消。`,
  stopped: {
    deviceWord: { ios: "iPhone", android: "Android 手機", desktop: "電腦", other: "裝置" },
    subject: (device: string) => `${yourDevice(device)}已停止接收通知——請從主畫面打開 PickupChecker`,
    gone: (device: string) => `${yourDevice(device)}已不再接收 PickupChecker 通知（推送服務表示訂閱已失效）。`,
    noAlerts: "在你重新開啟通知之前，你不會收到補貨提醒：PickupChecker 只以通知提醒，不會發電郵。",
    reopenIos: "請從主畫面（不是 Safari）打開 PickupChecker，在帳戶頁按「開啟通知」。",
    reopenOther: "請打開 PickupChecker，前往帳戶頁並按「開啟通知」。",
    causes: "常見原因：App 已從主畫面移除、通知在「設定」中被關閉，或手機曾經還原。",
  },
};
