/**
 * 台灣中文：account（「我的通知」儀表板、上面的補貨模組、安裝／結帳成功／價格方案頁）。方案名稱與美元金額不翻；
 * {zone} 在中文是 Intl 的時區全名（「台北標準時間」），本身已經含「時間」，所以句子不再加。
 */
import type { Dict } from "../en";
import { n } from "./util";

export const account: Dict["account"] = {
  loading: "載入中",
  meta: { title: "我的通知" },
  signedInAs: (email: string) => `登入帳號：${email}`,
  title: "我的通知",
  units: { s: "秒", min: "分鐘", taps: "下" },

  plan: {
    title: "方案",
    none: "還沒有方案：通知未啟用",
    summary: (plan: string, on: number, limit: number) => `${plan} · ${limit} 則中已啟用 ${on} 則`,
    renews: (date: string) => ` · ${date} 自動續訂`,
    ends: (date: string) => ` · ${date} 到期`,
  },

  sent: {
    title: "已送出的通知",
    last: (ago: string) => `最近一則：${ago}`,
    none: "還沒送出任何通知",
    empty: "還沒送出任何通知。",
    channel: { push: "推播", email: "Email" } as Record<string, string>,
    status: { sent: "已送出", failed: "失敗", skipped: "略過" } as Record<string, string>,
  },

  fast: {
    title: "20 秒內搶到",
    sub: "除了最後四下，其他現在全部先做好",
    lasts: "一般 Duo 上架只維持",
    push: "確認 → 推播到你的手機",
    tapsLeft: "推播到了以後，你只剩這幾下",
    steps: [
      { title: "找出你的時段", hint: "你的門市營業時間在下方 · 提早 10 分鐘就位" },
      { title: "先在 Apple 結帳頁就位", hint: "確切的容量＋顏色 → 送貨與取貨" },
      { title: "勾好條款，或直接買空機", hint: "空機、一次付清：完全不用勾" },
      { title: "讓手機保持喚醒", hint: "自動鎖定 → 永不 · 每 10–15 分鐘碰一下" },
      { title: "通知來了：看清楚，別亂點", hint: "取貨 → 通知裡的那家門市 → 第一個時段 → Apple Pay" },
    ],
    guide: "2 分鐘教學",
    window: "你的補貨時段",
  },

  restock: {
    title: "你的門市什麼時候補貨",
    anyIphone: "iPhone",
    and: " 和 ",
    yours: (k: number) => (k === 1 ? "你的門市" : `你的 ${k} 家門市`),
    Yours: (k: number) => (k === 1 ? "你的門市" : `你的 ${k} 家門市`),
    otherStores: (k: number) => `其他 ${k} 家門市`,
    meta: (what: string, stores: number, days: number, zone: string) => `${what} · ${stores} 家門市 · 最近 ${days} 天 · ${zone}`,
    busiest: (yours: string, then: string | null) => (then ? `${yours}最忙的時段 · 其次 ${then}` : `${yours}最忙的時段`),
    busiestArea: (stores: number, zone: string) => `${zone}全部 ${stores} 家門市最忙的時段`,
    next: (inHours: number) => `下一個時段 · ${inHours === 0 ? "就是這個小時" : `${inHours} 小時後`}`,
    typical: "賣完前的一般上架時間",
    count: (yours: string, days: number, total: number, pattern: boolean) => (total === 0 ? `${yours}還沒有補貨 · 最近 ${days} 天` : `${yours}補貨次數 · 最近 ${days} 天${pattern ? "" : " · 還太少，看不出規律"}`),
    byHour: (busiestInGreen: boolean) => `依小時${busiestInGreen ? " · 綠色是最忙的時段" : ""}`,
    byWeekday: (busiest: string | null) => `依星期${busiest ? ` · ${busiest}最忙` : ""}`,
    hourChart: (yours: string, zone: string, items: string) => `${yours}依小時的補貨次數（${zone}）：${items}`,
    weekdayChart: (yours: string, items: string) => `${yours}依星期的補貨次數：${items}`,
    chartItem: (label: string, k: number, reported: number) => `${label} ${k}${reported ? `（另有其他追蹤網站回報 ${reported} 次）` : ""}`,
    barTitle: (label: string, k: number, yours: string, area: { n: number; zone: string } | null, reported: number) =>
      `${label}：${yours}補貨 ${n(k)} 次${area ? ` · ${area.zone}共 ${area.n} 次` : ""}${reported ? ` · 其他追蹤網站回報 ${reported} 次` : ""}`,
    now: "現在",
    allZone: (stores: number, zone: string) => `${zone}全部 ${stores} 家門市`,
    reportMarkBars: "虛線",
    reportMarkDots: "空心點",
    sellTitle: "你的門市補貨多快賣完",
    sellMeta: (what: string, stores: number, days: number) => `${what} · ${stores} 家門市 · 最近 ${days} 天`,
    sellLabel: (yours: string) => yours,
  },

  success: {
    metaTitle: "通知已啟用",
    isOn: (plan: string) => `${plan} 已啟用`,
    yourPlan: "你的方案",
    received: "已收到付款",
    onPlan: (limit: number) => `你的方案可設 ${limit} 則通知。`,
    planOn: "你的方案已啟用。",
    pending: "你的訂閱一分鐘內就會出現在帳號裡。",
    open: "打開我的通知",
    another: "再新增一則通知",
    saved: (k: number) => `已儲存 ${k} 則通知 · Stripe 會寄收據給你`,
    pushOn: "通知",
    pushNext: "下一步：讓通知送到你的手機",
  },

  install: {
    metaTitle: "安裝 App：補貨通知直接出現在主畫面",
    metaDescription: "把 PickupChecker 加入主畫面，你附近的門市一有 iPhone Duo、18 Pro 或 Pro Max 可門市取貨，馬上收到通知。",
  },

  pricing: {
    metaTitle: "價格方案：10 則通知 $5、20 則 $10、50 則 $20",
    metaDescription: "iPhone 門市取貨現貨通知：你的門市每 5 秒檢查一次，補貨確認後約 3 秒推播。Plus 每月 $5 可設 10 則、Pro $10 可設 20 則、Max $20 可設 50 則，隨時可取消。",
    title: "價格方案",
    lead: "**一則通知 = 一家門市 × 一款確切的 iPhone。**瀏覽免費。",
    chips: ["全美 269 家 Apple Store", "隨時可取消", "信用卡或 Link"],
    fastest: "所有 iPhone 現貨追蹤網站中，公布的檢查間隔最快",
    everyFast: "你的門市每 **5 秒**檢查一次 · 其他追蹤網站公布的間隔是 8 秒到 15 分鐘",
    sellsOut: (band: string) => `iPhone Duo 補貨一般 **${band}**就賣完，有些只要 20–30 秒`,
    band: (range: string) => `${range} 秒`,
    aboutMinute: "大約 1 分鐘",
    sameSpeed: "每個方案速度都一樣",
    rechecked: "你的門市重新檢查",
    toPhone: "確認補貨到推播上手機",
    listing: "一般 Duo 上架時間，從上架到賣完",
    note: { plus: "1 支 iPhone × 10 家門市", pro: "2 支 iPhone × 10 家門市", max: "5 支 iPhone × 10 家門市" } as Record<string, string>,
    month: "/ 月",
    alerts: (k: number) => `${k} 則通知`,
    perks: ["你的門市每 5 秒檢查一次，全部 269 家每 15 秒一次", "確認補貨後約 3 秒推播"],
    cancel: "隨時可取消",
    get: (plan: string) => `選擇 ${plan}`,
    billing: "Stripe 計費 · 信用卡或 Link · 變更方案按比例計算",
    refund: "不適合你？如果還沒收到任何補貨通知，[7 天內全額退款](/refunds)",
  },
};
