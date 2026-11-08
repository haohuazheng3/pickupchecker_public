/**
 * 日本語: pages — ホームのボード、地域・都市・店舗ページ（/ja-jp/…）。地名は日本語で届く。
 * 入荷モジュールに渡すラベル（inPlace / atPlace / here）は助詞なしの名詞句：「東京」「Apple 銀座」「この店舗」。
 */
import { COUNTRIES, type CountryCode } from "@/lib/apple/countries";
import { countryLabel } from "@/lib/i18n/places";
import { num } from "@/lib/i18n/format";
import type { Dict } from "../en";

const country = (cc: CountryCode) => countryLabel(cc, "ja");
const N = (n: number) => num("ja", n);
const CHECK = "15秒ごと、通知設定店舗は5秒ごと";
/** 地域の呼び方（日本：都道府県）。 */
const REGION: Record<string, string> = { state: "州", province: "州", area: "エリア", department: "県", prefecture: "都道府県", emirate: "首長国", canton: "州", region: "地域", county: "県", city: "都市" };
const regionOf = (cc: CountryCode) => REGION[COUNTRIES[cc].regionNoun ?? "area"] ?? "エリア";
/** 「銀座」→「Apple 銀座」（すでに Apple で始まる名前はそのまま）。 */
const apple = (name: string) => (/^apple\b/i.test(name) ? name : `Apple ${name}`);

export const pages: Dict["pages"] = {
  common: {
    checkNote: CHECK,
    appleStores: "アップルストア",
    showOnMap: "地図で表示",
    restockLogs: "入荷履歴",
    fullLog: "すべての履歴 →",
    restocksBy: "構成別の入荷",
    lastDays: (days: number) => `過去${N(days)}日間の日別推移`,
    nearbyCities: "アップルストアのある近くの都市",
    neighboringStates: "近隣の地域",
    acrossStateLine: "州境の向こう",
    allUsRestocks: "米国の全入荷",
    allRestocksIn: (cc: CountryCode) => `${country(cc)}の全入荷`,
    regionRestocks: (place: string) => `${place}の入荷`,
    onTheMap: (place: string) => `${place}を地図で見る`,
    allOf: (place: string) => `${place}全体`,
    allOfArrow: (place: string) => `${place}全体 →`,
    storeAndCity: (store: string, city: string) => `${store} · ${city}`,
    appleStorePage: (store: string) => `Apple：${store}の店舗ページ`,
    sourcesWhere: (n: number, cc: CountryCode) => `${country(cc)}のアップルストア${N(n)}店舗`,
    inPlace: (place: string) => place,
    atPlace: (place: string) => place,
    here: "この店舗",
    storesWithIt: "在庫のある店舗",
    whenRestock: (place: string) => `${place}の店舗に入荷するのはいつ？`,
    /** The Duo-only clock on place pages (2026-11-08). */
    whenDuoRestocks: (place: string) => `${place}でiPhone Duoが入荷するのはいつ？`,
    howFast: (place: string) => `${place}では入荷はどれくらいで完売する？`,
    latestIn: (place: string) => `${place}の最新の入荷`,
    noneIn: (place: string) => `${place}ではまだ入荷の記録はありません。`,
    faqTitle: (place: string) => `${place}のアップルストア：よくある質問`,
    itemList: (place: string) => `${place}のアップルストア`,
    alertIn: (place: string) => `${place}で入荷通知`,
    panelPick: (place: string) => `iPhoneを選び、行ける${place}の店舗にチェック`,
    matrixH2: "店舗・機種別の在庫",
    matrixHint: "機種ごとに「現在の在庫 / チェック対象」。",
    matrixLabel: "店舗別の在庫",
    cityPage: "都市ページ →",
    storePage: "店舗ページ →",
    since: "2026年11月2日",
  },
  home: {
    storesWith: (short: string) => `${short}の在庫がある店舗`,
    restocks24: "24時間の入荷",
    week: (n: number) => ` · 週${N(n)}回`,
    lastCheck: "最終チェック",
    more: (n: number) => `+${N(n)}`,
    latest: (short: string) => `${short}の最新の入荷`,
    none: (short: string) => `${short}の入荷はまだありません。`,
    allRestocks: "すべての入荷",
    modelMap: (short: string) => `${short}の在庫マップ`,
    buy: "apple.comで購入",
    liveStock: (short: string) => `${short}のライブ在庫`,
    live: "ライブ",
    alsoTracking: "ほかにもチェック中：",
    liveMap: "在庫マップ",
    allStores: "全店舗",
    questions: "よくある質問",
  },
  region: {
    counts: (stores: number, cities: number) => `${N(stores)}店舗 · ${N(cities)}都市 · ${CHECK}にチェック`,
    nearbyOutside: (place: string) => `${place}の外で近いアップルストア`,
    nearbyHint: (place: string) => `${place}の店舗の中心からの距離。`,
    beyond: (place: string) => `${place}の外`,
    everyStore: (place: string) => `${place}の全店舗`,
    nearestRegions: (cc: CountryCode) => `${country(cc)}の近くの${regionOf(cc)}`,
  },
  city: {
    counts: (stores: number) => `${N(stores)}店舗 · ${CHECK}にチェック`,
    storeHeading: (name: string) => apple(name),
    details: "店舗の詳細",
    outside: (place: string) => `${place}の外で近い店舗`,
    outsideRegion: (region: string) => `${region}の外で近い店舗`,
    around: (place: string) => `${place}の周辺`,
    otherCities: (region: string) => `${region}のほかの都市`,
  },
  store: {
    description: (a: { place: string; street: string; city: string; where: string; duo: number; pro: number; pm: number }) => [
      `${a.place}（${a.city}${a.street ? `・${a.street}` : ""}）のiPhone在庫：いま店頭受け取りできるのはDuo ${N(a.duo)}構成、18 Pro ${N(a.pro)}構成、Pro Max ${N(a.pm)}構成。本日の営業時間、入荷時間、近くの店舗も。`,
      `${a.place}（${a.where}）のiPhone在庫：Duo ${N(a.duo)}構成、18 Pro ${N(a.pro)}構成、Pro Max ${N(a.pm)}構成が受け取り可能。本日の営業時間と入荷時間も。`,
      `${a.place}（${a.city}）：Duo ${N(a.duo)}・18 Pro ${N(a.pro)}・Pro Max ${N(a.pm)}構成の在庫、営業時間、入荷。`,
    ],
    where: (city: string, cc: CountryCode) => `${country(cc)}・${city}`,
    taxQ: (place: string) => `${place}で買うiPhone Duoの税込価格は？`,
    pickupQ: (place: string) => `apple.comで注文したiPhoneを${place}で受け取れますか？`,
    pickupA: (place: string) => `はい。購入手続きで「受け取り」と${place}を選び、Appleから受け取り準備完了の通知が届いてから来店します。ご注文番号、公的な写真付き身分証明書、QRコードまたはWalletのパスを持参してください。スクリーンショットは使えません。`,
    /** 「銀座」→「アップルストア銀座」：人が検索する呼び方。 */
    storeWord: (name: string) => (/^apple\b/i.test(name) ? name.replace(/^apple\s*/i, "アップルストア") : `アップルストア${name}`),
    hoursH2: (storeWord: string) => `${storeWord}の営業時間・場所・店頭受け取り`,
    hoursLead: (place: string, address: string, phone: string | undefined, today: string, week: string) => `${place}の所在地は${address}${phone ? `（電話：${phone}）` : ""}。本日の営業時間は${today}、1週間では${week}です。`,
    pickupRules: (helpUrl: string) => [
      `**Appleから受け取り準備完了の通知が届いてから**来店（[Appleの受け取りのルール](${helpUrl})）`,
      "**持ち物：**ご注文番号 · 公的な写真付き身分証明書 · QRコードまたはWalletのパス",
      "**不可：**コードのスクリーンショット",
      "**代理で受け取る場合：**購入手続きで指定した人のみ",
    ],
    directions: (place: string, dirUrl: string, appleUrl?: string) => `[${place}への経路](${dirUrl})${appleUrl ? ` · [Appleのこの店舗のページ](${appleUrl})` : ""}`,
    onlyH2: (where: string, place: string) => `${where}のアップルストア：${place}が唯一の店舗`,
    onlyInCountry: (place: string, cc: CountryCode) => `${place}は${country(cc)}で唯一のアップルストアなので、${country(cc)}での店頭受け取りはすべてここで行われます。構成の在庫が出ても、ほかに試せる店舗はありません。だからこそ、その構成の入荷通知がすべてです。`,
    onlyInCity: (city: string, place: string, backups: string) => `${city}のアップルストアは${place}の1店舗だけです。${backups ? `次に近いのは${backups}です。` : ""}`,
    backup: (appleName: string, city: string, dist: string) => `${appleName}（${city}・${dist}）`,
    onlyBlockCountry: (place: string) => `通知1件で1店舗・1構成をカバー。${place}で受け取り可能になってから数秒で、プッシュ通知が届きます。`,
    onlyBlock: (place: string) => `${place}に欲しい構成がないなら、これらの店舗も見張る価値があります。通知1件で1店舗・1構成をカバーし、店舗で受け取り可能になってから数秒でプッシュ通知が届きます。`,
    intro: (a: { place: string; street: string; duo: number; duoOf: number; pro: number; proOf: number; pm: number; pmOf: number; peak: string | null }) => (
      <>{a.place}{a.street ? `（${a.street}）` : ""}では現在、iPhone Duo <b className="text-ink">{N(a.duoOf)}構成中{N(a.duo)}</b>、iPhone 18 Pro <b className="text-ink">{N(a.proOf)}構成中{N(a.pro)}</b>、iPhone 18 Pro Max <b className="text-ink">{N(a.pmOf)}構成中{N(a.pm)}</b>を店頭受け取りできます。{a.peak ? <>この店舗の入荷は、現地時間の<b className="text-ink">{a.peak}</b>ごろが多めです。</> : null}</>
    ),
    restocks30: (n: number) => `入荷${N(n)}回 · 過去30日間`,
    lookupOff: "現在、この店舗ではAppleが店頭受け取りの在庫照会を提供していません。30分ごとに再確認し、Appleが応答したらすぐに在庫を表示します。",
    checked: "最終チェック",
    alertHere: (short: string) => `この店舗で${short}の入荷通知`,
    panel: (name: string) => `${apple(name)}：iPhoneを選び、この店舗と近くの店舗にチェック`,
    configsInStock: "在庫のある構成",
    stockNowH2: "現在の店頭受け取り在庫",
    whenRestock: (name: string) => `${apple(name)}の入荷はいつ？`,
    whenDuoRestocks: (name: string) => `${apple(name)}にiPhone Duoが入荷するのはいつ？`,
    howFast: (name: string) => `${apple(name)}の入荷はどれくらいで完売する？`,
    history: "入荷履歴",
    historyEmpty: "この店舗では、まだ入荷・完売の記録はありません。",
    nearby: "近くの店舗",
    elsewhereIn: (region: string) => `${region}のほかの店舗`,
    faqTitle: (place: string) => `${place}：よくある質問`,
    applePage: (place: string) => `Apple：${place}の店舗ページ（営業時間、イベント）`,
    sourcesWhere: (n: number, cc: CountryCode) => `${country(cc)}の${n === 1 ? "アップルストア" : `アップルストア${N(n)}店舗`}`,
    around: (place: string) => `${place}の周辺`,
    otherInCity: (city: string) => `${city}のほかのアップルストア`,
    cityPage: (city: string) => `${city}のページ`,
    moreIn: (region: string) => `${region}のほかのアップルストア`,
    everyIn: (cc: CountryCode) => `${country(cc)}の全アップルストア`,
    allIn: (cc: CountryCode) => `${country(cc)}のアップルストア一覧`,
    countryHome: (cc: CountryCode) => `${country(cc)}のトップ`,
    footnote: "在庫はapple.comの店頭受け取りの表示に基づく、前回チェック時点のものです。",
    footnoteIntl: (cc: CountryCode) => `価格は${COUNTRIES[cc].currency === "JPY" ? "日本円" : COUNTRIES[cc].currency}、距離はkmで表示。行政や販売店のサイトではありません。`,
  },
};
