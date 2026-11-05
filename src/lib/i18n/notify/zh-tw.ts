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
  email: {
    subject: (cfg: string, store: string, more: number) => `有現貨：${cfg}（${store}）${more > 0 ? `，另有 ${more} 則` : ""}`,
    intro: "好消息——以下現在可以門市取貨：",
    reserve: "預訂",
    store: "門市",
    tip: "門市取貨的現貨消失得很快：打開 Apple Store App 或 apple.com，選擇「取貨」，再選這家門市。",
    manage: (url: string) => `管理或暫停這則通知：${url}`,
    htmlTitle: "現在可門市取貨",
    htmlReserve: "前往 apple.com 預訂",
    htmlStorePage: "門市頁面 →",
    htmlTip: "門市取貨的現貨消失得很快——在 Apple Store App 或 apple.com 預訂，選擇 <b>取貨</b>，再選這家門市。",
    htmlManage: "管理或暫停這則通知",
    cancel: (url: string) => `已經買到 iPhone 了嗎？隨時可以取消訂閱：${url}`,
    htmlGotIt: "已經買到 iPhone 了嗎？",
    htmlCancel: "隨時取消訂閱",
    nudge: (url: string) => `這封郵件是因為您的帳戶沒有任何手機開啟通知才寄出的。手機通知在補貨後約 3 秒就會送達——請從主畫面開啟 PickupChecker，點「開啟通知」：${url}`,
    htmlNudge: (url: string) => `這封郵件是因為您的帳戶沒有任何手機開啟通知才寄出的。<b>手機通知在補貨後約 3 秒</b>就會送達——請從主畫面開啟 PickupChecker，點<b>開啟通知</b>。<a href="${url}" style="color:#0a7f3f">設定方法 →</a>`,
  },
  checkoutSubmit: (plan: string, limit: number, fastSec: number, checkSec: number, alertSec: number) => `${plan}：${limit} 則通知。你的門市每 ${fastSec} 秒檢查一次（每家門市每 ${checkSec} 秒），確認補貨後約 ${alertSec} 秒推播。按月計費，隨時可取消。`,
  stopped: {
    deviceWord: { ios: "iPhone", android: "Android 手機", desktop: "電腦", other: "裝置" },
    subject: (device: string) => `你的${w(device)}已停止接收通知——請從主畫面打開 PickupChecker`,
    gone: (device: string) => `你的${w(device)}已停止接收 PickupChecker 的通知（推播服務回報這個訂閱已失效）。`,
    byEmail: "在你重新開啟通知之前，你的補貨通知會改寄到 Email。",
    reopenIos: "請從主畫面（不是 Safari）打開 PickupChecker，在「我的通知」頁點「開啟通知」。",
    reopenOther: "打開 PickupChecker，前往「我的通知」，點「開啟通知」。",
    causes: "常見原因：App 被從主畫面移除、在「設定」裡關閉了通知，或手機被還原過。",
  },
  nudge: {
    subject: "在手機上接收 iPhone Duo 補貨提醒，補貨後約 3 秒送達",
    intro: "您的 PickupChecker 提醒目前以郵件寄送，因為您的帳戶沒有任何手機開啟通知。郵件是慢車道：一次 iPhone Duo 補貨通常約一分鐘就賣完，而手機通知在我們確認補貨後約 3 秒就會送達。",
    howTitle: "不到一分鐘即可開啟：",
    stepsIos: ["在 iPhone 的 Safari 開啟 pickupchecker.com，點「分享」，再點「加入主畫面」。", "從主畫面（而不是 Safari）開啟 PickupChecker 並登入。", "在「帳戶」頁點「開啟通知」，再點「允許」。"],
    stepsOther: "Android 或電腦：開啟 pickupchecker.com/account，點「開啟通知」。",
    after: "在有裝置開啟通知之前，提醒會繼續以郵件寄送；之後改以通知送達，郵件即停止。",
    cta: (url: string) => `圖文設定教學：${url}`,
  },
};
