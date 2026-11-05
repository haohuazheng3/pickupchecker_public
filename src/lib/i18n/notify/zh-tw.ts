/**
 * 通知文字，台灣中文（推播、補貨 Email、「通知已停止」Email、Stripe 結帳頁按鈕上方那行）。輪詢主機也會送出
 * 這些文字，所以除了型別不 import 任何東西。
 */
import type { NotifyText } from "./en";

/** 裝置名稱是英文（iPhone）時，前後補半形空格（中英混排）。 */
const w = (s: string) => `${/^[A-Za-z0-9]/.test(s) ? " " : ""}${s}${/[A-Za-z0-9]$/.test(s) ? " " : ""}`;

export const notifyZhTW: NotifyText = {
  pushTitle: (cfg: string) => cfg,
  pushBody: (where: string, quote: string | null) => `${where}${quote ? ` — ${quote}` : ""}。點一下前往 apple.com 預訂。`,
  testTitle: "PickupChecker 通知已開啟",
  testBody: (time: string, device: string) => `測試已於 ${time} 送到你的${w(device).trimEnd()}。補貨通知也會這樣送達，只要幾秒。`,
  device: {
    iphoneApp: "iPhone（主畫面 App）",
    iphoneSafari: "iPhone（Safari）",
    androidApp: "Android（已安裝的 App）",
    android: (browser: string) => `Android${browser ? `（${browser}）` : ""}`,
    computer: (browser: string) => `電腦${browser ? `（${browser}）` : ""}`,
    other: "這台裝置",
  },
  checkoutSubmit: (plan: string, limit: number, fastSec: number, checkSec: number, alertSec: number) => `${plan}：${limit} 則通知。你的門市每 ${fastSec} 秒檢查一次（每家門市每 ${checkSec} 秒），確認補貨後約 ${alertSec} 秒推播。按月計費，隨時可取消。`,
  stopped: {
    deviceWord: { ios: "iPhone", android: "Android 手機", desktop: "電腦", other: "裝置" },
    subject: (device: string) => `你的${w(device)}已停止接收通知——請從主畫面打開 PickupChecker`,
    gone: (device: string) => `你的${w(device)}已停止接收 PickupChecker 的通知（推播服務回報這個訂閱已失效）。`,
    noAlerts: "在你重新開啟通知之前，你不會收到補貨通知：PickupChecker 只用推播通知提醒，不寄 Email。",
    reopenIos: "請從主畫面（不是 Safari）打開 PickupChecker，在「我的通知」頁點「開啟通知」。",
    reopenOther: "打開 PickupChecker，前往「我的通知」，點「開啟通知」。",
    causes: "常見原因：App 被從主畫面移除、在「設定」裡關閉了通知，或手機被還原過。",
  },
};
