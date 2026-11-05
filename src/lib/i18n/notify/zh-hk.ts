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
  email: {
    subject: (cfg: string, store: string, more: number) => `有貨：${store}${/[A-Za-z)]$/.test(store) ? " " : ""}的 ${cfg}${more > 0 ? `（另有 ${more} 個）` : ""}`,
    intro: "好消息——以下現在可到店提取：",
    reserve: "預訂",
    store: "分店",
    tip: "取貨現貨走得很快：打開 Apple Store App 或 apple.com，選擇「提取」，再揀選分店。",
    manage: (url: string) => `管理或暫停這個提醒：${url}`,
    htmlTitle: "現在有貨可取",
    htmlReserve: "在 apple.com 預訂",
    htmlStorePage: "分店頁 →",
    htmlTip: "取貨現貨走得很快——在 Apple Store App 或 apple.com 預訂，選擇<b>提取</b>，再揀選分店。",
    htmlManage: "管理或暫停這個提醒",
    cancel: (url: string) => `已買到 iPhone？隨時可以取消訂閱：${url}`,
    htmlGotIt: "已買到 iPhone？",
    htmlCancel: "隨時取消訂閱",
    nudge: (url: string) => `這封郵件是因為您的帳戶沒有任何手機開啟通知才寄出的。手機通知在補貨後約 3 秒就會送達——請從主畫面開啟 PickupChecker，按「開啟通知」：${url}`,
    htmlNudge: (url: string) => `這封郵件是因為您的帳戶沒有任何手機開啟通知才寄出的。<b>手機通知在補貨後約 3 秒</b>就會送達——請從主畫面開啟 PickupChecker，按<b>開啟通知</b>。<a href="${url}" style="color:#0a7f3f">設定方法 →</a>`,
  },
  checkoutSubmit: (plan: string, limit: number, fastSec: number, checkSec: number, alertSec: number) => `${plan}：${limit} 個提醒。你的分店每 ${fastSec} 秒檢查一次（所有分店每 ${checkSec} 秒），確認補貨後約 ${alertSec} 秒推送。按月收費，隨時取消。`,
  stopped: {
    deviceWord: { ios: "iPhone", android: "Android 手機", desktop: "電腦", other: "裝置" },
    subject: (device: string) => `${yourDevice(device)}已停止接收通知——請從主畫面打開 PickupChecker`,
    gone: (device: string) => `${yourDevice(device)}已不再接收 PickupChecker 通知（推送服務表示訂閱已失效）。`,
    byEmail: "在你重新開啟通知之前，你的提醒會改為以電郵發送。",
    reopenIos: "請從主畫面（不是 Safari）打開 PickupChecker，在帳戶頁按「開啟通知」。",
    reopenOther: "請打開 PickupChecker，前往帳戶頁並按「開啟通知」。",
    causes: "常見原因：App 已從主畫面移除、通知在「設定」中被關閉，或手機曾經還原。",
  },
  nudge: {
    subject: "在手機上接收 iPhone Duo 補貨提醒，補貨後約 3 秒送達",
    intro: "您的 PickupChecker 提醒目前以郵件寄送，因為您的帳戶沒有任何手機開啟通知。郵件是慢車道：一次 iPhone Duo 補貨通常約一分鐘就售罄，而手機通知在我們確認補貨後約 3 秒就會送達。",
    howTitle: "不用一分鐘即可開啟：",
    stepsIos: ["在 iPhone 的 Safari 開啟 pickupchecker.com，按「分享」，再按「加入主畫面」。", "從主畫面（而不是 Safari）開啟 PickupChecker 並登入。", "在「帳戶」頁按「開啟通知」，再按「允許」。"],
    stepsOther: "Android 或電腦：開啟 pickupchecker.com/account，按「開啟通知」。",
    after: "在有裝置開啟通知之前，提醒會繼續以郵件寄送；之後改以通知送達，郵件即停止。",
    cta: (url: string) => `圖文設定教學：${url}`,
  },
};
