/** 繁體中文（香港）client strings: content — the first-screen stock checker and the navigation skeletons. */
import type { CDict } from "../en";

export const content: CDict["content"] = {
  quickCheck: {
    model: "iPhone 型號",
    search: "郵遞區號、城市或 Apple Store",
    useLocation: "使用我的位置",
    nearMe: "📍 我附近",
    locationOff: "本網站的定位已關閉。請改為輸入郵遞區號。",
    storesNow: "美國 Apple Store 中有 **{n} / {total}** 間現在有 {what} 可取貨",
    nearestTo: " · 最接近 {place}",
    you: "你",
    noMatch: "找不到。試試 5 位數郵遞區號或城市名稱。",
    inStock: "{n}/{total} 有貨",
    soldOut: "已售罄",
    alertMe: "有貨時提醒我",
    allStores: "全部 {n} 間分店 →",
    here: "就在這裏",
  },
  skeleton: {
    loading: "載入中",
  },
};
