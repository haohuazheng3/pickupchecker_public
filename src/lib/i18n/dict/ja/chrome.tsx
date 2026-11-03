import type { ReactNode } from "react";
import type { Dict } from "../en";

/** 日本語: chrome — フッター、404、言語版の案内。 */
export const chrome: Dict["chrome"] = {
  footer: {
    blurb: "米国のアップルストア全269店舗で、iPhoneの店頭受け取り在庫の入荷を通知。全店舗を15秒ごと、通知を設定した店舗は5秒ごとにチェックします。",
    blurbIn: (allStores: string) => `${allStores}で、iPhoneの店頭受け取り在庫の入荷を通知。全店舗を15秒ごと、通知を設定した店舗は5秒ごとにチェックします。`,
    trademark: "PickupCheckerはApple Inc.と提携・承認関係にありません。Apple、iPhone、Apple StoreはApple Inc.の商標です。",
    product: "サービス",
    duoStock: "iPhone Duoの在庫",
    proStock: "iPhone 18 Proの在庫",
    proMaxStock: "iPhone 18 Pro Maxの在庫",
    restockLog: "入荷履歴",
    liveMap: "在庫マップ",
    storesByState: "州別の店舗",
    pricing: "料金",
    company: "PickupChecker",
    howItWorks: "仕組み",
    getApp: "アプリを入手",
    about: "運営について",
    contact: "お問い合わせ",
    allStates: "すべての州と都市 →",
    storesIn: "アップルストア",
    allStores: "全店舗 →",
    legal: "規約",
    privacy: "プライバシー",
    terms: "利用規約",
    refunds: "返金",
    englishOnly: "英語のみ",
    questions: "iPhone Duoの疑問",
    restockTimes: "iPhone Duoの再入荷はいつ？",
    countries: "国・地域",
    status: "稼働状況",
  },
  notFound: {
    title: "ページが見つかりません",
    body: (stores: ReactNode, map: ReactNode) => <>このページは存在しません。{stores}か{map}からお探しください。</>,
    stores: "店舗一覧",
    map: "在庫マップ",
    home: "ホームへ戻る",
  },
};
