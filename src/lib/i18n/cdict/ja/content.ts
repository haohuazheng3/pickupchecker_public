import type { CDict } from "../en";

/** 日本語クライアント文言: content（ファーストビューの在庫チェッカーと、画面遷移中のスケルトン）。 */
export const content: CDict["content"] = {
  quickCheck: {
    model: "iPhoneの機種",
    search: "ZIPコード、都市、アップルストア",
    useLocation: "現在地を使う",
    nearMe: "📍 現在地",
    locationOff: "このサイトの位置情報はオフです。ZIPコードを入力してください。",
    storesNow: "米国のアップルストア **{total}店舗中{n}店舗** で、{what}をいま店頭受け取りできます",
    nearestTo: " · {place}から近い順",
    you: "現在地",
    noMatch: "該当なし。5桁のZIPコードか都市名で試してください。",
    inStock: "{n}/{total} 在庫あり",
    soldOut: "在庫切れ",
    alertMe: "入荷したら通知",
    allStores: "全{n}店舗 →",
    here: "現在地",
  },
  skeleton: {
    loading: "読み込み中",
  },
};
