/** 台灣中文客戶端字串：content —— 首屏現貨查詢（美國首頁）與換頁骨架。 */
import type { CDict } from "../en";

export const content: CDict["content"] = {
  quickCheck: {
    model: "iPhone 機型",
    search: "郵遞區號、城市或 Apple Store",
    useLocation: "使用我的位置",
    nearMe: "📍 我附近",
    locationOff: "這個網站的定位已關閉，請改輸入郵遞區號。",
    storesNow: "**{total} 家中有 {n} 家**美國 Apple Store 現在可門市取貨 {what}",
    nearestTo: " · 依距離排序：{place}",
    you: "你",
    noMatch: "找不到。試試 5 碼郵遞區號或城市。",
    inStock: "{n}/{total} 有現貨",
    soldOut: "已售完",
    alertMe: "有貨時通知我",
    allStores: "全部 {n} 家門市 →",
    here: "就在這",
  },
  skeleton: {
    loading: "載入中",
  },
};
