/**
 * 日本語: content — SEO の部品（FAQ、関連リンク、数値の帯、製品ページの部品、出典、ライブ部品）、enrich の補助
 * （営業時間、所要時間、FAQ の答え、タイトル）、ライブ {{tokens}}、入荷パターンの一文、写真の代替テキスト。
 * 数値・所要時間・店舗名・都市名・カラー名は日本語に整形済みで届く。機種名、容量、Apple Store、PickupChecker、apple.com は訳さない。
 * チェック間隔は 15 秒と 5 秒のみ。
 */
import type { ReactNode } from "react";
import type { Forms } from "@/lib/i18n/format";
import type { Dict } from "../en";

const f = (x: Forms): Forms => x;

type Kind = "state" | "city" | "store" | "model";

export const content: Dict["content"] = {
  hours: {
    closed: "休業",
    everyDay: (hours: string) => `毎日 ${hours}`,
    tomorrow: "明日",
    /** 曜日は「日」のような一文字で届く：「日曜 11:00」。 */
    dayAt: (day: string, time: string) => `${day.length === 1 ? `${day}曜` : day} ${time}`,
    closedTodayOpens: (next: string) => `本日休業 · ${next}に開店`,
    closedToday: "本日休業",
    opensAt: (time: string) => `${time}開店`,
    openNow: (closes: string) => `営業中 · ${closes}閉店`,
    closedNowOpens: (next: string) => `営業時間外 · ${next}に開店`,
    closedNow: "営業時間外",
  },

  duration: {
    underAMinute: "1分未満",
    pair: (a: string, b: string) => `${a}${b}`,
  },
  listMore: (n: string) => `ほか${n}件`,
  nearLine: (place: string, distance: string) => `${place}・${distance}`,

  faq: {
    /** 文の主題として使う：「Apple 銀座では」「東京では」「iPhone Duoは」。 */
    where: (kind: Kind, place: string) => (kind === "model" ? `${place}は` : `${place}では`),
    nRestocks: f({ other: "#回入荷" }),
    restockA: ({ count, where, days, week, peak }: { count: string | null; where: string; days: string; week: string; peak: { hour: string; day: string | null } | null }) =>
      `${count == null ? `${where}過去${days}日間に入荷の記録はありません` : `${where}過去${days}日間に${count}、今週は${week}回`}${peak ? `。多くは現地時間の${peak.hour}ごろ${peak.day ? `で、曜日では${peak.day}が最多` : ""}` : ""}。Appleは入荷スケジュールを公表していません。`,
    lastsNone: (where: string) => `${where}入荷から完売までのデータがまだ少なく、測定できません。`,
    lasts: (days: string, duration: string) => `過去${days}日間、入荷した構成が再び完売するまでの時間は約${duration}（中央値）でした。`,
    storeIn: (store: string, line: string) => `${store}（${line}）`,
    nearestA: (stores: string) => `${stores}です。`,

    modelStockQ: (model: string) => `いま${model}の在庫があるアップルストアは？`,
    modelStockNone: (model: string) => `前回のチェックではありませんでした。米国のアップルストアで${model}が店頭受け取り可能になり次第、このページのリストが更新されます。`,
    nUsStores: f({ other: "米国の#店舗" }),
    modelStockSome: (count: string) => `前回のチェックで${count}にありました。各店舗と在庫のある構成は、このページに掲載しています。`,
    priceQ: (model: string) => `${model}の価格は？`,
    priceA: (low: string, high: string, storages: string, colors: string) => `SIMフリーで${low}〜${high}（容量：${storages}）。カラーは${colors}です。`,
    modelRestockQ: (model: string) => `${model}はどれくらいの頻度で入荷しますか？`,
    modelLastsQ: (model: string) => `${model}の在庫は、入荷してからどれくらい持ちますか？`,
    reserveQ: (model: string) => `${model}は店頭受け取りの予約ができますか？`,
    reserveA: "予約はできません。店舗に在庫が出たらapple.comで「受け取り」を選んで購入すると、指定した受け取り時間帯まで確保されます。",

    storeStockQ: (store: string, model: string) => `${store}に${model}の在庫はありますか？`,
    nConfigs: f({ other: "#構成" }),
    storeStockYes: (count: string) => `はい、前回のチェックで${count}ありました。容量とカラーはこのページの表で確認できます。`,
    storeStockNo: (other: { pro: string; proMax: string } | null) => `前回のチェックではありませんでした${other ? `。iPhone 18 Proは${other.pro}構成、18 Pro Maxは${other.proMax}構成の在庫があります` : `。iPhone 18 Proと18 Pro Maxの在庫もありません`}。`,
    hoursQ: (store: string) => `${store}の営業時間は？`,
    hoursA: ({ hours, today, address, phone }: { hours: string | null; today: string | null; address: string; phone: string | null }) =>
      `${hours ?? "営業時間はこのページに記載しています"}${today ? `。本日は${today}` : ""}。所在地：${address}${phone ? `、電話：${phone}` : ""}。`,
    storeRestockQ: (store: string) => `${store}にはどれくらいの頻度でiPhoneが入荷しますか？`,
    storeLastsQ: (store: string) => `${store}の在庫はどれくらい持ちますか？`,
    storeNearestQ: (store: string) => `${store}から一番近いほかのアップルストアは？`,

    placeStockQ: (place: string, model: string) => `${place}で、いま${model}の在庫があるアップルストアは？`,
    placeStockNone: (place: string, model: string) => `前回のチェックではありませんでした。${place}の店舗で${model}が店頭受け取り可能になった瞬間に、このページが更新されます。`,
    nStores: f({ other: "#店舗" }),
    placeStockSome: (count: string, stores: string) => `前回のチェックで${count}：${stores}。`,
    countQ: (place: string) => `${place}にアップルストアは何店舗ありますか？`,
    nAppleStores: f({ other: "#店舗" }),
    countMany: (count: string, stores: string) => `${count}です。${stores}など。`,
    countOne: (count: string, store: string) => `${count}、${store}です。`,
    placeRestockQ: (place: string) => `${place}のアップルストアには、どれくらいの頻度でiPhoneが入荷しますか？`,
    placeLastsQ: (place: string) => `${place}では、在庫はどれくらい持ちますか？`,
    placeNearestQ: (place: string) => `${place}の外で一番近いアップルストアは？`,
  },

  explainer: (kind: Kind, place: string) => {
    const at = kind === "store" ? place : kind === "model" ? "米国の全アップルストア" : `${place}のアップルストア`;
    return [
      "店頭受け取りの在庫はapple.comで販売されます。購入手続きで構成と店舗を選んでオンラインで支払い、店舗で受け取る仕組みで、当日受け取れることも少なくありません。店頭に並ぶ在庫やキャリアショップの在庫とは別物です。",
      `PickupCheckerは${at}の対象構成をすべて15秒ごとに、通知が設定された店舗は5秒ごとにチェックします。変化はもう一度のチェックで確認できて初めて記録するので、一時的な不具合が誤った入荷や完売になることはありません。`,
      "確認した変化はすべて記録され、このページの入荷グラフと履歴に反映されます。",
    ];
  },
  alertRule: "通知1件＝1店舗 × 1機種 × 1容量 × 1カラー。apple.comで受け取り可能に変わってから数秒で、プッシュ通知（またはメール）が届きます。",

  titles: {
    state: (name: string, duoNow: string, stores: string) => [
      `${name}のアップルストア：${stores}店舗中${duoNow}店舗にiPhone Duoの在庫`,
      `${name}のアップルストア｜iPhone Duoの受け取り在庫をライブ確認`,
      `${name}のアップルストア｜iPhone Duoの在庫`,
      `${name}のアップルストア｜iPhone在庫`,
    ],
    city: (city: string, code: string, duoNow: string, stores: string) => [
      `${city}（${code}）のアップルストア：${stores}店舗中${duoNow}店舗にiPhone Duo`,
      `${city}（${code}）のアップルストア｜iPhone Duoの受け取り在庫`,
      `${city}（${code}）のアップルストア｜iPhone Duoの在庫`,
      `${city}のアップルストア｜iPhone在庫`,
    ],
    store: (name: string, region: string | null) => {
      const r = region ? `（${region}）` : "";
      return [
        `${name}${r}：iPhone在庫・店頭受け取り・営業時間`,
        `${name}${r}：iPhoneの在庫と営業時間`,
        `${name}${r}：iPhone在庫`,
        `${name}：iPhone在庫・店頭受け取り・営業時間`,
        `${name}：iPhoneの在庫と営業時間`,
        `${name}：iPhone在庫`,
        `${name}｜在庫`,
      ];
    },
    model: (name: string, storesNow: string) => [
      `${name}の受け取り在庫：いま${storesNow}店舗のアップルストアに在庫あり`,
      `${name}の受け取り在庫：${storesNow}店舗に在庫あり`,
      `${name}の店頭受け取り在庫をライブ確認`,
    ],
  },

  tokens: {
    tooFewToMeasure: "まだデータが少なく測定できません",
    noneLoggedYet: "まだ記録なし",
    noneYet: "まだなし",
  },

  pattern: {
    none: (days: string) => `過去${days}日間、確認された入荷はありません。`,
    nConfirmed: f({ other: "確認済みの入荷#回" }),
    countIn: (count: string, days: string) => `過去${days}日間に${count}`,
    stay: (minutes: string) => `、完売までの掲載は通常約${minutes}分`,
    nDays: f({ other: "#日" }),
    tooFew: (count: string, onDays: string | null, stay: string) => `${count}${onDays ? `（${onDays}間）` : ""}${stay}。傾向を判断するにはまだ少なすぎます。`,
    usual: (hour: string, weekday: string | null, count: string, stay: string) => `入荷は現地時間の${hour}ごろが多く${weekday ? `、曜日では${weekday}が最多` : ""}。${count}${stay}。`,
  },

  regionNouns: {
    state: f({ other: "州" }),
    province: f({ other: "州" }),
    area: f({ other: "エリア" }),
    department: f({ other: "県" }),
    prefecture: f({ other: "都道府県" }),
    emirate: f({ other: "首長国" }),
    canton: f({ other: "州" }),
    region: f({ other: "地域" }),
    county: f({ other: "県" }),
    city: f({ other: "都市" }),
  } as Record<string, Forms>,

  measured: "測定方法",

  faqTitle: "よくある質問",
  breadcrumb: "パンくずリスト",
  keepExploring: "あわせて見る",
  browse: {
    storesByState: "州別の店舗",
    allStatesCities: "すべての州と都市 →",
    liveByModel: "機種別のライブ在庫",
    modelStock: (model: string) => `${model}の在庫`,
    thisPage: "このページ",
    restockLog: (short: string) => `${short}の入荷履歴`,
    liveMap: "在庫マップ",
    mostStores: "店舗数の多い地域",
    allStates: "すべての州",
    bigCities: "主要都市",
    cities: "都市",
    storesBy: (region: string) => `${region}別の店舗`,
    allStoresIn: ({ country }: { inName: string; country: string }) => <>{country}のアップルストア一覧 →</>,
    allRegions: (regions: string) => `すべての${regions}`,
  },
  modelCards: "iPhone別",
  narrative: {
    lastRestock: (config: ReactNode, at: ReactNode, ago: ReactNode) => <>最新の入荷：{config}{at}、{ago}。</>,
    at: (store: ReactNode) => <>（{store}）</>,
  },
  statStrip: {
    inStockNow: "現在の在庫",
    ofStores: (n: string) => `${n}店舗中`,
    stores: "店舗",
    nCities: f({ other: "#都市" }),
    tracked: "チェック対象",
    modelNow: (short: string) => `${short}の現在の在庫`,
    configsInStock: "在庫のある構成",
    storesWithStock: f({ other: "在庫のある店舗" }),
    restocks24h: "24時間の入荷",
    scoped: (label: string, model: string) => `${label} · ${model}`,
    restocksHint: (week: string, month: string, days: string) => `7日間で${week}回 · ${days}日間で${month}回`,
    sellOuts: (days: string) => `${days}日間の完売`,
    stays: (duration: string) => `在庫は約${duration}`,
    noPairs: "データなし",
    lastRestock: "最新の入荷",
    noneYet: "まだなし",
    inLastDays: (days: string) => `過去${days}日間`,
  },
  product: {
    chooseIphone: "iPhoneを選ぶ",
    storage: "容量",
    color: "カラー",
    all: "すべて",
    numbersAre: (unit: ReactNode) => <>数字＝いま在庫のある{unit}の数。</>,
    seen: (ago: ReactNode) => <>{ago}に確認</>,
    last: (ago: ReactNode) => <>最終 {ago}</>,
    notSeenYet: "未確認",
    firstCheckPending: "初回チェック待ち",
    inStock: "在庫あり",
    inStockLower: "在庫あり",
    none: "なし",
    here: "現在地",
    notAvailable: "受け取り不可",
    notCheckedYet: "未チェック",
    availableForPickup: "受け取り可能",
    since: (ago: ReactNode) => <> · {ago}から</>,
    lastInStock: (ago: ReactNode) => <>最後の在庫：{ago}</>,
    neverSeen: "この店舗ではまだ在庫を確認していません",
    firstCheckSoon: "1分以内に初回チェック",
    buy: "apple.comで購入",
    checked: (checked: ReactNode, note: ReactNode) => <>{checked}にチェック · {note}</>,
    checkNote: "15秒ごと、通知設定店舗は5秒ごと",
  },

  source: (source: ReactNode) => <>出典：{source}</>,
  photoCredit: (link: ReactNode) => <>写真：{link}</>,
  sources: "出典",
  allUsStores: "米国のアップルストア全269店舗",
  trackerSource: (where: ReactNode, since: ReactNode, asOf: ReactNode) => <>PickupCheckerライブトラッカー：{where}のiPhone Duo、18 Pro、18 Pro Maxの全構成を、{since}から15秒ごと（通知を設定した店舗は5秒ごと）にチェック。このページの数値は{asOf}時点のものです。</>,
  live: {
    configsCaption: (stores: ReactNode, model: ReactNode) => <>{model}の構成ごとに、いま店頭受け取りできるアップルストアの数（{stores}店舗中）· ライブ</>,
    storage: "容量",
    pricesCaption: (model: ReactNode) => <>apple.comでの{model}の価格（SIMフリー、税抜）とライブの受け取り在庫</>,
    price: "価格",
    bestColor: "在庫の多いカラー（現在の店舗数）",
    noRestock: (model: string) => `${model}の入荷はまだ記録されていません。`,
    clockLabel: (model: string) => `米国全体の${model}`,
    storesWithIt: "在庫のある店舗",
    pairsInStock: "在庫のある店舗 × 構成",
    restocksLogged: "記録した入荷",
    medianTime: "在庫の持続時間（中央値）",
    underOneMin: (min: string) => `< ${min}`,
  },

  photos: {
    "apple-store-pickup-counter": { alt: "Apple Store店内の「Pickup」の表示がある木製の受け取りカウンター", caption: "店頭受け取りの注文は、こうしたカウンターで手渡されます。" },
    "phone-map": { alt: "屋外でスマートフォンの地図アプリを操作する手元", caption: "入荷が1分で消えるなら、店舗までの距離は思っている以上に重要です。" },
    "phone-card-payment": { alt: "iPhoneとクレジットカードを手にオンラインで支払う女性", caption: "店頭受け取りの代金はオンラインで支払います。" },
    "phone-on-box": { alt: "白い箱の上に置かれた新品のスマートフォン", caption: "箱から出したばかりの新しいiPhone。" },
    "city-map-phone": { alt: "スマートフォンで街の地図を確認する二人", caption: "店舗までのルートを確認。" },
    "phone-notification": { alt: "ロック画面に通知が表示されたスマートフォンを持つ手", caption: "入荷通知はロック画面に届きます。" },
    "apple-store-crowd-inside": { alt: "ショッピングセンター内の混雑したApple Storeに並ぶ人たち", caption: "発売週のApple Store店内。店頭に届いた在庫は数分でなくなります。" },
    "apple-store-glass-canopy": { alt: "夜の、ガラス張りで木製のひさしがあるApple Store", caption: "夜のガラス張りのApple Store。" },
    "apple-store-night-vancouver": { alt: "夜に明かりがともるバンクーバーのApple Store", caption: "夜のApple Store。受け取り在庫はいつでも出得ますが、朝のほうがはるかに多く出ます。" },
    "phone-hand-camera": { alt: "トリプルカメラのiPhoneを持つ人", caption: "行列ができるのはProモデルです。" },
    "place-jp-japan": { alt: "晴れた日の新倉山浅間公園の忠霊塔と富士山", caption: "富士山と忠霊塔（山梨県）。" },
    "place-jp-tokyo": { alt: "青空の下、東京スカイツリーと東京の街を上空から望む", caption: "上空から見た東京とスカイツリー。" },
    "place-jp-osaka": { alt: "大阪・道頓堀の運河沿いに並ぶ色とりどりの看板", caption: "大阪・道頓堀。" },
  },
};
