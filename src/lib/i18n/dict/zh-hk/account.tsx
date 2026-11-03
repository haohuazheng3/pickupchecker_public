/**
 * 繁體中文（香港）: account (dashboard, its restock modules, install / checkout / pricing pages). Plan names and
 * dollar amounts stay as they are: every plan is billed in US dollars.
 */
import type { Dict } from "../en";
import { SPEED } from "@/lib/plans";
import { n } from "./common";

export const account: Dict["account"] = {
  loading: "載入中",
  meta: { title: "我的提醒" },
  signedInAs: (email: string) => `已登入：${email}`,
  title: "我的提醒",
  units: { s: "秒", min: "分鐘", taps: "下" },

  plan: {
    title: "方案",
    none: "未有方案：提醒尚未啟用",
    summary: (plan: string, on: number, limit: number) => `${plan} · ${n(limit)} 個提醒中 ${n(on)} 個已啟用`,
    renews: (date: string) => ` · ${date} 續期`,
    ends: (date: string) => ` · ${date} 結束`,
  },

  sent: {
    title: "已發出的提醒",
    last: (ago: string) => `最近一次：${ago}`,
    none: "暫未發出任何提醒",
    empty: "暫未發出任何提醒。",
    channel: { push: "通知", email: "電郵" } as Record<string, string>,
    status: { sent: "已發出", failed: "失敗", skipped: "已略過" } as Record<string, string>,
  },

  fast: {
    title: "20 秒內搶到手",
    sub: "現在先做好一切，只留最後四下",
    lasts: "一般 Duo 上架時間",
    push: "確認 → 手機收到推送",
    tapsLeft: "推送一到，你只需再按的次數",
    steps: [
      { title: "找出你的時段", hint: "下面是你的分店營業時間 · 提早 10 分鐘準備" },
      { title: "預先準備 Apple 結帳", hint: "指定容量 + 顏色 → 送貨及提取" },
      { title: "剔選條款 · 或直接買無鎖版", hint: "無鎖版一次過付款：沒有條款要剔" },
      { title: "保持螢幕常亮", hint: "自動鎖定 → 永不 · 每 10–15 分鐘碰一下" },
      { title: "收到提醒：看清楚，別亂按", hint: "提取 → 指定分店 → 第一個時段 → Apple Pay" },
    ],
    guide: "2 分鐘教學",
    window: "你的補貨時段",
  },

  restock: {
    title: "你的分店幾時補貨",
    anyIphone: "iPhone",
    and: " 及 ",
    yours: (k: number) => (k === 1 ? "你的分店" : `你的 ${n(k)} 間分店`),
    Yours: (k: number) => (k === 1 ? "你的分店" : `你的 ${n(k)} 間分店`),
    otherStores: (k: number) => `其他 ${n(k)} 間分店`,
    meta: (what: string, stores: number, days: number, zone: string) => `${what} · ${n(stores)} 間分店 · 過去 ${n(days)} 日 · ${zone}`,
    busiest: (yours: string, then: string | null) => (then ? `${yours}最多補貨的鐘點 · 其次 ${then}` : `${yours}最多補貨的鐘點`),
    busiestArea: (stores: number, zone: string) => `同一時區（${zone}）全部 ${n(stores)} 間分店最多補貨的鐘點`,
    next: (inHours: number) => `下一個時段 · ${inHours === 0 ? "就在這一小時" : `${n(inHours)} 小時後`}`,
    typical: "一般上架多久便售罄",
    count: (yours: string, days: number, total: number, pattern: boolean) => (total === 0 ? `${yours}暫未有補貨 · 過去 ${n(days)} 日` : `${yours}的補貨 · 過去 ${n(days)} 日${pattern ? "" : " · 次數太少，未成規律"}`),
    byHour: (busiestInGreen: boolean) => `按鐘點${busiestInGreen ? " · 最多的以綠色標示" : ""}`,
    byWeekday: (busiest: string | null) => `按星期${busiest ? ` · ${busiest}最多` : ""}`,
    hourChart: (yours: string, zone: string, items: string) => `${yours}按鐘點的補貨（${zone}）：${items}`,
    weekdayChart: (yours: string, items: string) => `${yours}按星期的補貨：${items}`,
    chartItem: (label: string, k: number, reported: number) => `${label} ${n(k)}${reported ? `（另有 ${n(reported)} 次由其他追蹤網站報告）` : ""}`,
    barTitle: (label: string, k: number, yours: string, area: { n: number; zone: string } | null, reported: number) =>
      `${label}：${yours}補貨 ${n(k)} 次${area ? ` · 同一時區（${area.zone}）共 ${n(area.n)} 次` : ""}${reported ? ` · 其他追蹤網站報告 ${n(reported)} 次` : ""}`,
    now: "現在",
    allZone: (stores: number, zone: string) => `同一時區（${zone}）全部 ${n(stores)} 間分店`,
    reportMarkBars: "虛線",
    reportMarkDots: "空心點",
    sellTitle: "你的補貨幾快售罄",
    sellMeta: (what: string, stores: number, days: number) => `${what} · ${n(stores)} 間分店 · 過去 ${n(days)} 日`,
    sellLabel: (yours: string) => yours,
  },

  success: {
    metaTitle: "提醒已啟用",
    isOn: (plan: string) => `${plan} 已啟用`,
    yourPlan: "你的方案",
    received: "已收到付款",
    onPlan: (limit: number) => `你的方案可設 ${n(limit)} 個提醒。`,
    planOn: "你的方案已啟用。",
    pending: "你的訂閱會在一分鐘內出現在帳戶中。",
    open: "打開我的提醒",
    another: "再加一個提醒",
    saved: (k: number) => `已儲存 ${n(k)} 個提醒 · 收據由 Stripe 寄出`,
    pushOn: "通知",
    pushNext: "下一步：在手機收提醒",
  },

  install: {
    metaTitle: "安裝 App：補貨提醒直達主畫面",
    metaDescription: "把 PickupChecker 加至主畫面，iPhone Duo、18 Pro 或 Pro Max 一在你附近的分店開放取貨，即時收到通知。",
  },

  pricing: {
    metaTitle: "收費：10 個提醒 $5、20 個 $10、50 個 $20（美元）",
    metaDescription: `Apple Store iPhone 取貨現貨提醒：你的分店每 ${SPEED.fastSec} 秒檢查一次，確認補貨後約 ${SPEED.alertSec} 秒推送。Plus 每月 $5 有 10 個提醒、Pro $10 有 20 個、Max $20 有 50 個，以美元收費，隨時取消。`,
    title: "收費",
    lead: "**一個提醒 = 一間分店 × 一款指定 iPhone。**瀏覽免費。",
    chips: ["香港全部 6 間 Apple Store", "隨時取消", "信用卡或 Link"],
    fastest: "所有 iPhone 現貨追蹤器之中，公布的檢查間隔最快",
    everyFast: `你的分店每 **${SPEED.fastSec} 秒**檢查一次 · 其他追蹤器自述的間隔是 8 秒至 15 分鐘`,
    sellsOut: (band: string) => `一般 iPhone Duo 補貨 **${band}** 內售罄，有些只需 20–30 秒`,
    band: (range: string) => `${range} 秒`,
    aboutMinute: "約一分鐘",
    sameSpeed: "每個方案速度都一樣",
    rechecked: "你的分店重新檢查",
    toPhone: "確認補貨到推送上手機",
    listing: "一般 Duo 由上架到售罄",
    note: { plus: "1 部 iPhone × 10 間分店", pro: "2 部 iPhone × 10 間分店", max: "5 部 iPhone × 10 間分店" } as Record<string, string>,
    month: "/ 月",
    alerts: (k: number) => `${n(k)} 個提醒`,
    perks: [`你的分店每 ${SPEED.fastSec} 秒檢查，所有分店每 ${SPEED.checkSec} 秒`, `確認補貨後約 ${SPEED.alertSec} 秒推送`] as string[],
    cancel: "隨時取消",
    get: (plan: string) => `選擇 ${plan}`,
    billing: "Stripe 收費 · 信用卡或 Link · 轉換方案按比例計算",
    refund: "不合用？如你仍未收到任何補貨提醒，[7 日內可全額退款](/refunds)",
  },
};
