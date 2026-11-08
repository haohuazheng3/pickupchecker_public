/**
 * 日本語: views — 製品×場所ページ、入荷履歴、在庫マップ、iPhone Duo の入荷時間ページ、店舗一覧（/ja-jp/…）。
 * `c: Country` は英語データ：国名は countryLabel、地域の呼び方は日本語の対応表で書く。
 * `name` `place` `region` `city` `store` `config` の文字列は日本語で届く。`Store` / `Place` オブジェクトは英語データなので places で名前を引く。
 * モジュールへ渡すラベル（inPlace / inCountry）は助詞なしの名詞句（「東京」「Apple 銀座」「日本」）。
 * 機種名・容量・Apple Store・PickupChecker・URL・型番は訳さない。チェック間隔は 15 秒と 5 秒のみ。返金には触れない。
 */
import type { ReactNode } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import type { Point } from "@/components/ui/Viz";
import type { Faq } from "@/lib/content/types";
import { catalogFor, modelByKey, storePath, type Store } from "@/lib/apple/catalog";
import { COUNTRIES, type Country, type CountryCode } from "@/lib/apple/countries";
import { faq as placeFaq, fmtDuration, peakOf, type FaqContext, type FaqItem } from "@/lib/seo/enrich";
import type { Place, Product } from "@/lib/seo/products";
import type { StoreLine } from "@/lib/seo/productData";
import type { PlaceStats, RestockStats } from "@/lib/stock/queries";
import { hourShare, type DayRow, type SelloutFacts } from "@/lib/content/restockTimes";
import { PATTERN_MIN, PATTERN_MIN_DAYS, WEEKDAY_MIN_SPAN, localStamp } from "@/lib/content/siteFacts";
import { OTHER_TRACKERS, SPEED } from "@/lib/plans";
import { includedRate, taxName } from "@/content/country-tax";
import { num, list, stamp, weekdays, price as priceIn, distance, fitTitleW } from "@/lib/i18n/format";
import { appleStoreLabel, cityLabel, colorLabel, countryLabel, regionLabel, storeLabel } from "@/lib/i18n/places";
import type { Dict } from "../en";
import type { RestockTimesMeta, RestockTimesPlace, RestockTimesView } from "../en/views";
import { content } from "./content";

type RT = Dict["views"]["restockTimes"];

const L = "ja" as const;
const N = (n: number) => num(L, n);
const country = (c: Pick<Country, "cc">) => countryLabel(c.cc, L);
const listJa = (items: string[], max = 6) => list(L, items, max, (n) => content.listMore(N(n)));
/** 地域の呼び方（日本：都道府県）。 */
const NOUN: Record<string, string> = { state: "州", province: "州", area: "エリア", department: "県", prefecture: "都道府県", emirate: "首長国", canton: "州", region: "地域", county: "県", city: "市" };
const noun = (c: Country) => NOUN[c.regionNoun ?? "area"] ?? "エリア";
/** 他サイトが公表しているチェック間隔（「8秒〜15分」）。 */
const others = (() => {
  const m = OTHER_TRACKERS.match(/^(\d+) seconds? to (\d+) minutes?$/);
  return m ? `${m[1]}秒〜${m[2]}分` : OTHER_TRACKERS;
})();
/** 価格に含まれる税：「消費税（10%）込み」。 */
function taxNoteJa(c: Country): string {
  if (c.cc === "us") return "税抜（州により異なる）";
  if (c.cc === "ca") return "税抜（GST/HSTと州税は別）";
  const r = includedRate(c);
  if (r == null) return "香港は売上税なし";
  const t = taxName(c);
  return `${t === "consumption tax" ? "消費税" : t === "VAT" ? "付加価値税" : t}（${r}%）込み`;
}

/* ---------------------------------------------------------------- 製品×場所の名前 */

const ccOf = (p: { country?: CountryCode }) => p.country ?? "us";
/** 「iPhone Duo 512GB ナイトスカイ」。 */
function productName(p: Product, short = false): string {
  const m = modelByKey(p.model)!;
  return `${short ? m.short : m.name}${p.storage ? ` ${p.storage}` : ""}${p.color ? ` ${colorLabel(p.color, L)}` : ""}`;
}
/** 店舗名に都市名が含まれないときだけ「（東京）」を添える。 */
const cityNote = (s: Store) => { const city = cityLabel(s.country ?? "us", s.city, L); return appleStoreLabel(s, L).includes(city) ? "" : `（${city}）`; };
/** 場所の日本語名：国、地域、都市、「Apple 銀座」。 */
function placeNameJa(place: Place): string {
  const cc = ccOf(place);
  if (place.level === "country") return countryLabel(cc, L);
  if (place.level === "state") return regionLabel(cc, place.state!, L);
  if (place.level === "city") return cityLabel(cc, place.city!, L);
  return appleStoreLabel(place.store!, L);
}
const apple = (name: string) => (/^apple\b/i.test(name) ? name : `Apple ${name}`);

function productTitle(product: Product, place: Place, inStock: number): string {
  const n = place.stores.length;
  const name = productName(product), short = productName(product, true);
  if (place.level === "country") {
    const w = countryLabel(ccOf(place), L);
    return fitTitleW([...(inStock > 0 ? [`${name}の在庫：${w}のアップルストア${N(inStock)}店舗にあり`] : []), `${name}の店頭受け取り在庫（${w}・ライブ）`, `${short}の受け取り在庫（${w}）`, `${short}の受け取り在庫`]);
  }
  if (place.level === "store") {
    const s = place.store!;
    const a = appleStoreLabel(s, L);
    const now = inStock > 0 ? "いま在庫あり" : "受け取り在庫";
    return fitTitleW([`${a}の${name}：${now}`, `${a}${cityNote(s)}の${short}`, `${a}の${short}`, `${storeLabel(s, L)}の${short}`]);
  }
  const w = placeNameJa(place);
  return fitTitleW([`${w}の${name}在庫：${N(n)}店舗中${N(inStock)}店舗`, `${w}の${name}：受け取り在庫`, `${w}の${short}在庫`, `${w}の${short}`]);
}

function productDescription(product: Product, place: Place, inStock: number, stats: PlaceStats): string {
  const name = productName(product);
  const week = `今週の入荷${N(stats.week)}回`;
  if (place.level === "store") {
    const s = place.store!;
    const a = appleStoreLabel(s, L);
    const now = inStock > 0 ? "いま在庫あり" : "現在在庫なし";
    return fitTitleW([
      `${a}${cityNote(s)}の${name}受け取り在庫：${now}、${week}。ライブの状況、入荷時間、入荷通知。`,
      `${a}の${name}：${now}、${week}。ライブの状況と入荷通知。`,
    ], 155);
  }
  const where = `${placeNameJa(place)}のアップルストア`;
  const n = N(place.stores.length);
  return fitTitleW([
    `${name}の受け取り在庫：${where}${n}店舗中${N(inStock)}店舗にあり、${week}。店舗別のライブ在庫、入荷時間、入荷通知。`,
    `${name}：${where}${n}店舗中${N(inStock)}店舗にあり、${week}。店舗別のライブ在庫と入荷通知。`,
  ], 155);
}

function productFaq(product: Product, place: Place, lines: StoreLine[], stats: PlaceStats, clock: RestockStats, nearest: { name: string; city: string; distance: number } | null): FaqItem[] {
  const out: FaqItem[] = [];
  const name = productName(product);
  const at = placeNameJa(place);
  const cc = ccOf(place);
  const near = nearest ? `${apple(nearest.name)}（${nearest.city}・${distance(L, cc, nearest.distance)}）` : null;
  const inStock = lines.filter((l) => l.available.length > 0);
  if (place.level === "store") {
    const l = lines[0];
    out.push({
      q: `${at}に${name}の在庫はありますか？`,
      a: l && l.available.length > 0
        ? product.parts.length > 1 ? `はい。前回のチェックで${listJa(l.available.map((i) => `${i.storage} ${colorLabel(i.color, L)}`), 4)}の在庫がありました。` : "はい、前回のチェックで在庫がありました。"
        : `前回のチェックではありませんでした${near ? `。在庫のある最寄りの店舗は${near}です` : ""}。`,
    });
  } else {
    out.push({
      q: `${at}で${name}の在庫があるアップルストアは？`,
      a: inStock.length === 0
        ? `前回のチェックではありませんでした${near ? `。在庫のある最寄りの店舗は${near}です` : ""}。`
        : `前回のチェックで${N(inStock.length)}店舗：${listJa(inStock.map((x) => appleStoreLabel(x.store, L)), 4)}。`,
    });
  }
  const peak = peakOf(clock, L);
  out.push({
    q: `${at}では${name}がどれくらいの頻度で入荷しますか？`,
    a: stats.month === 0 ? `過去${N(stats.days)}日間、入荷の記録はありません。` : `過去${N(stats.days)}日間に${N(stats.month)}回、今週は${N(stats.week)}回入荷しています${peak ? `。多くは現地時間の${peak.hour}ごろです` : ""}。`,
  });
  if (stats.medianMs != null) out.push({ q: `${at}では在庫がどれくらい持ちますか？`, a: `約${fmtDuration(stats.medianMs, L)}（中央値）で、再び完売します。` });
  return out;
}

function priceLabelJa(product: Product): string {
  const cc = ccOf(product);
  const prices = catalogFor(product.model, cc).filter((c) => product.parts.includes(c.partNumber)).map((c) => c.price);
  const lo = Math.min(...prices), hi = Math.max(...prices);
  const f = (v: number) => priceIn(L, COUNTRIES[cc], v);
  return lo === hi ? f(lo) : `${f(lo)}〜${f(hi)}`;
}

/* ---------------------------------------------------------------- 入荷時間ページの書式 */

/** 0〜1 の割合を整数％で（0.5% 未満は「<1%」）。 */
const rtPct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : `${Math.round(x * 100)}%`);
/** 暦日（YYYY-MM-DD）：「11月3日(火)」、曜日なしで「11月3日」。 */
const dateLabel = (ymd: string, weekday = true) => new Intl.DateTimeFormat("ja-JP", { timeZone: "UTC", month: "short", day: "numeric", ...(weekday ? { weekday: "short" as const } : {}) }).format(new Date(`${ymd}T12:00:00Z`));
const longDate = (ymd: string) => new Intl.DateTimeFormat("ja-JP", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
const zoneStamp = (iso: string, c: Country) => stamp(L, iso, c.timeZone, true);
const hourLabel = (h: number) => `${h}時`;
/** 「9〜11時」。 */
const rangeLabel = (from: number, to: number) => `${from}〜${to}時`;
const weekdayName = (d: number) => weekdays(L)[d];
const storeJa = (s: Store) => appleStoreLabel(s, L);
const rtRegion = (x: { us: boolean; c: Country }) => (x.us ? "州" : noun(x.c));
/** 国名、または地域・都市ページではその場所の名前（「東京」）。後ろに「の」「で」「では」が続く。 */
const rtPlace = (x: { c: Country; place?: RestockTimesPlace }) => (x.place ? x.place.name : country(x.c));
/** 「場所別」の単位：国ページは地域の呼び名、地域ページは都市、都市ページは店舗。 */
const rtUnit = (x: { us: boolean; c: Country; place?: RestockTimesPlace }) => (x.place ? (x.place.kind === "region" ? "都市" : "店舗") : rtRegion(x));
const zero = "検証できる入荷がまだ記録されていません。";

/** 英語の時刻（「10 AM」）と曜日（「Tuesday」）で届いた peak を日本語に。 */
function peakJa(p: FaqContext["peak"]): FaqContext["peak"] {
  if (!p) return p;
  const m = p.hour.match(/^(\d{1,2}) (AM|PM)$/);
  const hour = m ? `${(Number(m[1]) % 12) + (m[2] === "PM" ? 12 : 0)}時` : p.hour;
  const en = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(p.day ?? "");
  return { ...p, hour, day: en >= 0 ? weekdayName(en) : p.day };
}

export const views: Dict["views"] = {
  common: {
    inCountry: (c: Country) => country(c),
    liveMap: "在庫マップ",
    restockLog: "入荷履歴",
    alertMe: "入荷通知",
    lastDays: (days: number) => <>過去{N(days)}日間</>,
    since: "2026年11月2日",
    sourcesWhere: (n: number, c: Country) => `${country(c)}の${n === 1 ? "アップルストア" : `アップルストア全${N(n)}店舗`}`,
    checker: (c: Country) => `${country(c)}のiPhone在庫確認`,
    appleStoresIn: (c: Country) => `${country(c)}のアップルストア`,
    storesWithIt: "在庫のある店舗",
    more: "その他",
  },

  /* ---------------------------------------------------------------- /stock/{product}/{place…} */
  product: {
    title: productTitle,
    description: productDescription,
    faq: productFaq,
    priceLabel: priceLabelJa,
    inPlace: (name: string) => name,
    h1Country: (model: string, c: Country) => `${country(c)}の${model}店頭受け取り在庫`,
    h1Place: (model: string, where: string) => `${where}の${model}`,
    inStockNow: "現在の在庫",
    yes: "あり",
    no: "なし",
    pickup: "店頭受け取り",
    configurations: "構成",
    ofStores: (n: number) => `${N(n)}店舗中`,
    restocks24h: "24時間の入荷",
    restocksHint: (week: number, month: number, days: number) => `7日間で${N(week)}回 · ${N(days)}日間で${N(month)}回`,
    sellOuts: (days: number) => `${N(days)}日間の完売`,
    stays: (ms: number) => `在庫は約${fmtDuration(ms, L)}`,
    noPairs: "データなし",
    lastRestock: "最新の入荷",
    noneYet: "まだなし",
    thisConfig: "この構成",
    inDays: (days: number) => `過去${N(days)}日間`,
    notInStockNow: "現在在庫なし",
    configsInStock: (n: number, of: number) => <span>{N(of)}構成中<b className="text-ink">{N(n)}</b>構成に在庫</span>,
    inStockAt: (n: number, of: number) => <span>{N(of)}店舗中<b className="text-ink">{N(n)}</b>店舗に在庫</span>,
    checked: (live: ReactNode, price: string, tax: string) => <>{live}にチェック · {price}{tax}</>,
    taxNote: (c: Country) => taxNoteJa(c),
    beforeTax: "税抜",
    buyOnApple: "apple.comで購入",
    allStoresIn: (c: Country) => `${country(c)}の全店舗`,
    everyIphoneHere: "ここのすべてのiPhone",
    everyIphone: (where: string) => `${where}のすべてのiPhone`,
    panel: (model: string, where: string | null) => `${where ? `${where}の` : ""}${model}：構成と店舗にチェック`,
    unitConfigs: "構成",
    unitStores: "店舗",
    otherConfigsHere: "ほかの構成",
    byStorageColor: "容量・カラー別",
    nearestStores: "近くの店舗",
    closest: (link: ReactNode, dist: string) => <>いま在庫のある最寄り：{link} · {dist}</>,
    storeCity: (store: string, city: string) => <>{store}（{city}）</>,
    mostRecentlyInStock: "最近在庫があった店舗",
    storesWithItNow: "いま在庫のある店舗",
    storesIn: (where: string) => `${where}の店舗`,
    colStatus: "状況",
    colConfigs: "在庫のある構成",
    noStoreHasIt: "現在、在庫のある店舗はありません。",
    noStoreHereHasIt: "現在、ここで在庫のある店舗はありません。",
    moreStores: (n: number) => <>ほか{N(n)}店舗は地域別のページでどうぞ。</>,
    byRegion: (c: Country) => `${noun(c)}別`,
    byCity: "都市別",
    nearbyStores: "近くの店舗",
    latestChanges: "最新の変化",
    nothingLogged: "まだ記録はありません。",
    whenRestocks: "入荷する時間帯",
    howFast: "完売までの速さ",
    restocksByConfig: "構成別の入荷",
    faqTitleCountry: (model: string, c: Country) => `${country(c)}の${model}：よくある質問`,
    faqTitle: (model: string, where: string) => `${where}の${model}：よくある質問`,
    buySource: (model: string, c: Country) => `Apple：${model}を購入（${country(c)}）`,
    nearby: "周辺",
    otherRegions: (c: Country) => `ほかの${noun(c)}`,
    elsewhereIn: (region: string) => `${region}のほかの場所`,
    everyAppleStoreIn: (c: Country) => `${country(c)}の全アップルストア`,
    across: (model: string, c: Country) => `${country(c)}全体の${model}`,
    itemList: (model: string, where: string) => `${where}の${model}`,
    nearLead: (c: Country, model: string, inStock: number, n: number, have: { store: string; city: string; configs: number }[]) =>
      inStock === 0
        ? `いま${model}を店頭受け取りできる${country(c)}のアップルストアはありません。つまり「近く」の答えは、どの店舗に先に入荷するか次第です。行ける店舗に入荷通知を設定しておけば、在庫が出てから数秒でプッシュ通知が届きます。`
        : `いま${model}の在庫があるのは${N(n)}店舗中${N(inStock)}店舗：${listJa(have.slice(0, 5).map((l) => `${l.store}（${l.city}・${N(l.configs)}構成）`), 5)}。`,
    nearHead: (c: Country) => [noun(c), "いま在庫のある店舗"],
    nearCaption: (c: Country, model: string) => `${noun(c)}別の${model}受け取り在庫（前回のチェック時点）`,
    nearMe: (_c: Country, model: string, alert: string) => `現在地から全店舗を近い順に並べるなら、このページの入荷通知の設定を開いて「現在地から探す」をタップ。距離は道のりのkm（推定）で、各店舗から経路を開けます。[${model}の入荷通知を設定](${alert})。`,
    modelFaq: (c: Country, model: string, low: number, high: number, inStock: number): { price: FaqItem; reserve: FaqItem } => {
      const money = (v: number) => priceIn(L, c, v);
      return {
        price: { q: `${country(c)}での${model}の価格は？`, a: `容量に応じて、apple.comで${money(low)}〜${money(high)}（${taxNoteJa(c)}）です。` },
        reserve: { q: `${model}は${country(c)}で店頭受け取りの予約ができますか？`, a: `予約はできません。店舗に構成の在庫が出たら、apple.comで「受け取り」を選んで購入すると、指定した時間帯まで確保されます。${inStock === 0 ? "いまはどの店舗にも在庫がないので、一番乗りしたいなら入荷通知です。" : ""}` },
      };
    },
  },

  /* ---------------------------------------------------------------- /restocks */
  restocks: {
    metaTitle: (c: Country, n: number) => `${country(c)}のiPhone入荷履歴：${n === 1 ? "アップルストア" : `アップルストア全${N(n)}店舗`}をライブ記録`,
    metaDescription: (c: Country) => `${country(c)}のアップルストアで、iPhone Duo・18 Pro・Pro Maxの店頭受け取り在庫が入荷するたびに記録。正確な時刻、構成、地図つき。`,
    h1: (c: Country) => `${country(c)}の入荷履歴`,
    summary: (day: number, week: number, model?: string, region?: string) => <>24時間で{N(day)}回の入荷 · 今週{N(week)}回{model ? ` · ${model}` : ""}{region ? ` · ${region}` : ""}。時刻はお使いのタイムゾーンで表示しています。</>,
    allModels: "すべての機種",
    restocks: "入荷",
    withSoldOut: "入荷＋完売",
    regionLabel: (c: Country) => noun(c),
    allRegions: (c: Country) => `すべての${noun(c)}`,
    filter: "絞り込む",
    page: (k: number) => <>{N(k)}ページ</>,
    newer: "← 新しい記録",
    older: "古い記録 →",
    getAlerts: "入荷通知を設定",
    byPlace: "場所別の入荷",
    byRegion: (c: Country) => `${noun(c)}別`,
    datasetName: (c: Country) => `${country(c)}のアップルストア iPhone店頭受け取り入荷記録`,
    datasetDescription: (c: Country) => `${c.cc === "us" ? "米国のアップルストア全269店舗" : `${country(c)}のアップルストア`}における、iPhone Duo、iPhone 18 Pro、iPhone 18 Pro Maxの店頭受け取り在庫の確認済みの入荷と完売を、店舗・正確な構成・時刻とともにすべて記録。15秒ごと（通知のある店舗は5秒ごと）のチェックで、apple.comから一致する回答を2回得たときだけ入荷として記録しています。`,
    datasetMeasured: ["アップルストア", "iPhoneの機種・容量・カラー", "入荷時刻", "完売時刻"],
  },

  /* ---------------------------------------------------------------- /map */
  map: {
    metaTitle: (c: Country, n: number) => `iPhone Duo受け取り在庫マップ：${country(c)}の${n === 1 ? "アップルストア" : "全アップルストア"}をライブ表示`,
    metaDescription: (c: Country, n: number) => `${country(c)}の${n === 1 ? "アップルストア" : `アップルストア全${N(n)}店舗`}で、いまiPhone Duo・18 Pro・Pro Maxを店頭受け取りできるかを、容量・カラー別に表示するライブマップ。`,
    country: (c: Country) => ({ name: country(c), inName: `${country(c)}の`, regionNoun: c.regionNoun, regionNounPlural: c.regionNounPlural }),
    everyStore: "全店舗",
    storeCity: (store: string, city: string) => `${store} · ${city}`,
  },

  /* ---------------------------------------------------------------- /{cc}/stores */
  storesIndex: {
    metaDescription: (c: Country, n: number, regions: number, cities: number, duo: number, max: number) => {
      const by = c.regionNoun && regions > 1 ? `${noun(c)}・都市別に` : cities > 1 ? "都市別に" : "";
      return `${country(c)}のアップルストア全${N(n)}店舗を${by}一覧。iPhone Duo・18 Pro・Pro Maxの店頭受け取り在庫をライブ表示：いまDuoは${N(duo)}店舗、Pro Maxは${N(max)}店舗に在庫あり。`;
    },
    countAnswer: (n: number, spread: string, top: { name: string; count: number }[]) => `${N(n)}店舗（${spread}）です${top.length ? `。最も多いのは${top[0].name}（${N(top[0].count)}店舗）${top[1] ? `、次いで${top[1].name}（${N(top[1].count)}店舗）` : ""}` : ""}。`,
    howMany: (c: Country) => <>{country(c)}にアップルストアは何店舗ありますか？</>,
    duoNow: (c: Country, n: number, have: Store[]): FaqItem => ({
      q: `いまiPhone Duoの在庫がある${country(c)}のアップルストアは？`,
      a: have.length === 0 ? `前回のチェックでは${N(n)}店舗ともありませんでした。このページと地図は在庫が出た瞬間に更新され、入荷通知ならいちばん早く届きます。` : `前回のチェックでは${N(n)}店舗中${N(have.length)}店舗：${have.slice(0, 6).map(storeJa).join("、")}${have.length > 6 ? "ほか" : ""}。`,
    }),
    faq: (ctx: FaqContext) => placeFaq({ ...ctx, peak: peakJa(ctx.peak), omit: [...(ctx.omit ?? []), "count", "stock", "lasts"] }, L),
    duoBlock: (alert: string) => `いちばん早いのは、行ける店舗での入荷通知です：[iPhone Duoの入荷通知を設定](${alert})。店舗×構成ごとに通知1件で、店舗に在庫が出てから数秒でプッシュ通知が届きます。`,
    intro: (c: Country, n: number, spread: string, now: { duo: number; max: number; pro: number }, tax: string) => `${country(c)}のアップルストアは**${N(n)}店舗**、${spread}にあります。いまiPhone Duoを店頭受け取りできるのは**${N(now.duo)}店舗**、iPhone 18 Pro Maxは**${N(now.max)}店舗**、18 Proは**${N(now.pro)}店舗**。${tax}`,
    crumb: "店舗一覧",
    panel: (c: Country) => `iPhoneを選び、行ける${country(c)}の店舗にチェック`,
    matrixLabel: "店舗別の在庫",
    matrixH2: (c: Country) => <>{country(c)}の全アップルストアの在庫</>,
    matrixHint: "機種ごとに「現在の在庫 / チェック対象」。",
    topCaption: (c: Country) => <>アップルストアの多い{noun(c)}（Appleの直営店一覧に基づく）</>,
    regionHead: (c: Country) => noun(c),
    colStores: "店舗数",
    colCities: "都市数",
    locationsBy: (c: Country) => `${noun(c)}別のアップルストア`,
    locationsIn: (c: Country) => `${country(c)}のアップルストアの場所`,
    storeCount: (n: number) => <>{N(n)}店舗</>,
    storeCountAll: (n: number) => <>{N(n)}店舗</>,
    whenRestock: (c: Country) => <>{country(c)}の店舗に入荷するのはいつ？</>,
    howFast: (c: Country) => <>{country(c)}では、入荷はどれくらいで完売する？</>,
    faqTitle: (c: Country) => `${country(c)}のアップルストア：よくある質問`,
    getApp: "アプリを入手",
    howItWorks: "仕組み（英語）",
    pricing: "料金",
  },

  /* ---------------------------------------------------------------- /iphone-duo-restock-times */
  restockTimes: {
    fmt: {
      n: N,
      pct: rtPct,
      date: dateLabel,
      longDate,
      zoneStamp,
      local: (iso: string, store: Parameters<typeof localStamp>[1]) => localStamp(iso, store, L),
      hour: hourLabel,
      range: rangeLabel,
      weekday: weekdayName,
      store: storeJa,
      storeWithPlace: (s: Store) => `${storeJa(s)}（${cityLabel(s.country ?? "us", s.city, L)}）`,
    },
    title: (c: Country, place?: RestockTimesPlace) => `iPhone Duoの再入荷はいつ？${place?.name ?? country(c)}のアップルストアの入荷時間`,
    metaDescription: (x: RestockTimesMeta) => {
      const { c, t, w, pattern } = x;
      const w0 = rtPlace(x);
      const region = x.place ? (x.place.kind === "region" ? "都市" : null) : c.cc === "us" ? "州" : c.regionNoun ? noun(c) : "店舗";
      /** 「時間帯・日・県・店舗・構成」。都市ページでは日と店舗の間に単位を入れない。 */
      const by = region ? `${region}・店舗` : "店舗";
      const since = dateLabel(t.since, false);
      return t.n > 0 && pattern
        ? fitTitleW([
          `${w0}のアップルストアで${since}以降に確認したiPhone Duoの入荷は${N(t.n)}回。${rtPct(w.share)}が現地時間${rangeLabel(w.from, w.to)}に集中${t.sellout ? `、${rtPct(t.sellout.within2min)}は2分以内に完売` : ""}。時間帯・日・${by}・構成別の表。`,
          `${w0}のアップルストアで${since}以降のiPhone Duo入荷${N(t.n)}回、${rtPct(w.share)}が現地時間${rangeLabel(w.from, w.to)}。時間帯・日・${region ?? "店舗"}・構成別の表。`,
          `${w0}のiPhone Duo入荷時間：${since}以降の${N(t.n)}回を時間帯・日・${region ?? "店舗"}・構成別に。`,
        ], 158)
        : t.n > 0
          ? fitTitleW([
            `${since}以降、${w0}のアップルストアで確認したiPhone Duoの入荷${N(t.n)}回を、${SPEED.checkSec}秒ごとのチェックから集計：現地の時間帯別、日別、${by}・構成別、それぞれの在庫時間も。`,
            `${w0}のiPhone Duo入荷時間：${since}以降の確認済み入荷${N(t.n)}回を時間帯・日・${region ?? "店舗"}・構成別に。`,
          ], 158)
          : `${w0}のアップルストアにiPhone Duoが入荷するのはいつか。PickupCheckerが${longDate(t.since)}から${SPEED.checkSec}秒ごとに続けているチェックをもとに、時間帯・日・店舗・構成別にまとめます。`;
    },
    h1: (x: RestockTimesView) => x.t.unknown
      ? `${rtPlace(x)}でiPhone Duoが再入荷するのはいつ？`
      : x.t.n > 0
        ? `${rtPlace(x)}でiPhone Duoの再入荷は続いている？ はい。入荷する時間帯はこちら`
        : `${rtPlace(x)}でiPhone Duoの再入荷は始まった？ 私たちのチェックではまだ。見ているのはここです`,
    intro: (x: RestockTimesView) => {
      const { t, tracked, pattern, w } = x;
      const where = rtPlace(x);
      return t.unknown ? (
        <>入荷履歴をいま読み込めませんでした。{where}の店舗は引き続き{SPEED.checkSec}秒ごとにチェックしており、次に読み込んだときに数値が表示されます。</>
      ) : t.n > 0 ? (
        <>
          <b className="text-ink">はい。</b>{where}のアップルストアでは、<b className="text-ink">{longDate(t.since)}以降、iPhone Duoが{N(t.n)}回入荷</b>しています{tracked > 1 ? <>（{N(tracked)}日間のうち{N(t.days)}日）</> : <>（計測はまだ1日目）</>}
          {pattern && <>。<b className="text-ink">そのうち{rtPct(w.share)}は、店舗の現地時間で{rangeLabel(w.from, w.to)}</b>の入荷でした</>}。
        </>
      ) : (
        <>
          <b className="text-ink">私たちのチェックでは、まだありません。</b>PickupCheckerは{longDate(t.since)}から{x.one ? `${where}のアップルストア` : `${where}のアップルストア全${N(x.stores)}店舗`}を{SPEED.checkSec}秒ごとに確認していますが、iPhone Duoの店頭受け取りの入荷はまだ確認できていません。
        </>
      );
    },
    hero: {
      restocks: (x: RestockTimesView) => `${dateLabel(x.t.since, false)}以降の確認済み入荷`,
      window: (x: RestockTimesView) => `${rangeLabel(x.w.from, x.w.to)}（店舗の現地時間）`,
      days: "入荷があった日 / 計測した日",
      // 英語の型は戻り値が文字列リテラルなので、日本語の文字列を渡すために型を合わせる。
      now: (() => "いま受け取りできる店舗") as unknown as RT["hero"]["now"],
      today: (x: RestockTimesView, today: DayRow) => `今日（${dateLabel(today.date)}）のここまで${x.one ? "" : ` · ${N(today.stores)}店舗`}`,
      weekday: "これまでで最も多い曜日",
    },
    heroPoints: (x: RestockTimesView, latest: { config: string; store: Store; at: string } | null): Point[] => [
      ...(latest ? [{ text: <>最新：<b className="text-ink">{latest.config}</b>{x.one ? null : <>（<Link href={storePath(latest.store)} className="underline underline-offset-2">{storeJa(latest.store)}</Link>）</>}、現地時間{localStamp(latest.at, latest.store, L)}</> }] : []),
      ...(x.t.peakWeekday != null ? [{ text: <>最も多いのは<b className="text-ink">{weekdayName(x.t.peakWeekday)}</b></> }] : []),
      { text: <>Appleは<b className="text-ink">入荷スケジュールを公表していません</b>。これは私たち自身が確認した記録で、約5分ごとに更新しています</>, no: true },
    ],
    emptyPoints: (x: RestockTimesView): Point[] => [
      { text: <>いま受け取りできるのは<b className="text-ink">{N(x.stores)}店舗中{N(x.duoNow)}店舗</b></> },
      { text: <>以下の表は、最初の入荷が確認された時点から埋まっていきます</>, step: true },
      { text: <>データが最も多い時間帯・曜日の傾向は<Link href="/iphone-duo-restock-times" className="underline underline-offset-2">米国版ページ（英語）</Link>で</>, step: true },
    ],
    setUpAlert: "iPhone Duoの入荷通知を設定",
    logLive: "入荷履歴をライブで見る",
    onThisPage: "このページの内容",
    nav: (x: RestockTimesView): Record<string, string> => ({
      "time-of-day": "時間帯",
      "day-by-day": "日別",
      where: `${rtUnit(x)}別`,
      configuration: "構成",
      "how-long": "在庫の持続時間",
      unavailable: "なぜ受け取り不可？",
      reddit: "Redditとデータ",
      method: "数え方",
    }),
    h2: (x: RestockTimesView): Record<string, string> => ({
      "time-of-day": `${rtPlace(x)}でiPhone Duoが入荷するのは何時ごろ？`,
      "day-by-day": `${rtPlace(x)}でiPhone Duoが入荷したのはどの日？`,
      where: `${rtPlace(x)}でiPhone Duoの入荷が多いアップルストアは？`,
      configuration: `${rtPlace(x)}で入荷が多いiPhone Duoの構成は？`,
      "how-long": `${rtPlace(x)}では、iPhone Duoの入荷はどれくらい持つ？`,
      unavailable: "なぜどのアップルストアも「受け取り不可」なの？",
      reddit: "iPhone Duoの入荷についてRedditで言われていることと、データが示すこと",
      method: "PickupCheckerはどうやって入荷を数えている？",
    }),
    faq: (x: RestockTimesView): Faq[] => {
      const { t, w, pattern, sell, us, weekend, tracked } = x;
      const where = rtPlace(x);
      const window = rangeLabel(w.from, w.to);
      return [
        { q: `${where}でiPhone Duoが再入荷するのはいつ？`, a: t.n > 0 && pattern
          ? `${w.from >= 5 && w.from < 12 ? "主に朝です。" : ""}${longDate(t.since)}以降に確認した${N(t.n)}回の入荷のうち${rtPct(w.share)}が店舗の現地時間${window}、${rtPct(hourShare(t.byHour, 8, 12))}が8〜12時でした。Appleはスケジュールを公表しておらず、これはPickupCheckerが観測した傾向で、約5分ごとに更新しています。`
          : `Appleはスケジュールを公表していません。PickupCheckerが${longDate(t.since)}以降に${where}で確認した入荷は${N(t.n)}回${t.days ? `（${N(t.days)}日間）` : ""}です。いつもの時間帯は、${PATTERN_MIN}回以上の入荷が${PATTERN_MIN_DAYS}日以上に分かれてから示し、このページは自動で更新されます。` },
        { q: `${us ? "" : `${where}では`}週末にもiPhone Duoが入荷しますか？`, a: t.n > 0
          ? `${weekend > 0 ? "これまでのところ、はい" : "私たちのデータでは、まだありません"}。${N(t.n)}回の入荷のうち${N(weekend)}回（${rtPct(weekend / t.n)}）が土日でした。${t.peakWeekday != null ? `最も多い曜日は${weekdayName(t.peakWeekday)}です。` : `最も多い曜日は、データが${WEEKDAY_MIN_SPAN}日分そろうまで示しません（現在${N(tracked)}日分）。`}`
          : `${where}の週末のデータはまだありません。入荷が確認されるたびに、このページの日別の表が埋まっていきます。` },
        { q: "何時からチェックすればいい？", a: t.n > 0 && pattern
          ? `自分で確認するなら、現地時間の${hourLabel(w.from)}から、店頭受け取りを選んだ状態でapple.comを開いておきましょう。この2時間で入荷の${rtPct(w.share)}を占めています。入荷は${sell ? `中央値で${N(sell.medianSec)}秒で消えた` : "通常1分ほどしか持たない"}ので、${SPEED.fastSec}秒ごとにチェックする入荷通知（[通知の仕組み（英語）](/iphone-duo-stock-alerts)）なら、再読み込みでは届かないところまでカバーできます。`
          : `${where}の傾向がはっきりするまでは、見張りは入荷通知に任せましょう。選んだ店舗を${SPEED.fastSec}秒ごとに、24時間チェックします（[通知の仕組み（英語）](/iphone-duo-stock-alerts)）。` },
        { q: "なぜどのアップルストアもiPhone Duoが受け取り不可なの？", a: sell
          ? `入荷が一瞬だからです。${where}で計測した完売済みの入荷${N(sell.n)}回のうち、${rtPct(sell.within2min)}は2分以内、${rtPct(sell.within20min)}は20分以内に消えました。いま在庫があるのは${N(x.stores)}店舗中${N(x.duoNow)}店舗。数十回入荷した日でも、ほとんどの瞬間はapple.comが「受け取り不可」と表示するのが正しい状態です（[「受け取り不可」の意味（英語）](/apple-store-pickup-availability-explained)）。`
          : `店頭受け取りの在庫は数分単位でしか出ないからです。いま${where}で在庫があるのは${N(x.stores)}店舗中${N(x.duoNow)}店舗です（[「受け取り不可」の意味（英語）](/apple-store-pickup-availability-explained)）。` },
        { q: "行きたいアップルストアにiPhone Duoが入荷したら通知を受け取るには？", a: `店舗と、容量・カラーまで指定して入荷通知を設定します。以降その店舗は${SPEED.fastSec}秒ごとにチェックされ、入荷を確認してから約${SPEED.alertSec}秒でスマートフォンに届きます（[入荷通知を設定](${x.alert})、[仕組み（英語）](/how-it-works)）。` },
      ];
    },
    sources: {
      applePickup: "Apple：Delivery and Pickup（店頭受け取りの在庫の仕組み、英語）",
      newsroom: "Apple Newsroom：iPhone Duoが世界のApple Storeに登場（2026年10月23日、英語）",
      macRumors: "MacRumors：米国とカナダでiPhone DuoのApple Store受け取りが再開（2026年10月24日、英語）",
      reports: (tracker: string) => `${tracker}：発売週のiPhone Duo入荷報告（各サイト自身の観測。区別して表示し、集計には含めません）`,
    },
    ld: (x: RestockTimesView) => ({
      datasetName: `${rtPlace(x)}のアップルストアにおけるiPhone Duoの入荷時間`,
      description: `${x.t.since}以降、${rtPlace(x)}のアップルストアで確認したiPhone Duoの店頭受け取りの入荷をすべて、店舗・構成・時刻とともに記録したデータ。PickupCheckerの${SPEED.checkSec}秒ごとのチェックに基づき、現地の時間帯・日・${x.place?.kind === "city" ? "" : `${rtUnit(x)}・`}店舗・構成別に集計しています。`,
      spatial: `${rtPlace(x)}のアップルストア`,
      measured: ["入荷時刻（店舗の現地時間）", "アップルストア", "iPhone Duoの容量とカラー", "完売までの秒数"],
      size: `入荷${N(x.t.n)}回、${N(x.t.stores)}店舗`,
    }),
    crumb: "iPhone Duoの入荷時間",

    // ---- 時間帯
    timeLead: (x: RestockTimesView) => <b>{N(x.t.n)}回の入荷のうち{rtPct(x.w.share)}が店舗の現地時間で{rangeLabel(x.w.from, x.w.to)}、{rtPct(hourShare(x.t.byHour, 8, 12))}が8〜12時でした。</b>,
    busiestHour: (count: number) => `最も多い1時間：${N(count)}回`,
    morning: "8〜12時",
    evening: "17時以降：夜も止まっていない",
    night: "0〜6時",
    tooFew: (x: RestockTimesView) => <b>いつもの時間帯を言うには、まだ日数が足りません：{longDate(x.t.since)}以降、{N(x.t.days)}日間で確認済みの入荷{N(x.t.n)}回。</b>,
    tooFewKeys: (): Point[] => [
      { text: <>いつもの時間帯を示すには<b className="text-ink">{PATTERN_MIN}回以上の入荷が{PATTERN_MIN_DAYS}日以上に分かれている</b>必要があります</> },
      { text: <>一度にまとまった10回の入荷は1回の出来事で、習慣ではありません</>, no: true },
      { text: <>日数が増えるにつれ、このページは自動で書き換わります</>, step: true },
    ],
    hourCaption: (x: RestockTimesView) => `${rtPlace(x)}のiPhone Duoの入荷：店舗の現地時間別、${dateLabel(x.t.since, false)}から今日まで（${N(x.t.n)}回）`,
    hourHead: ["現地時間", "入荷", "割合"],
    morningKeys: (x: RestockTimesView): Point[] => [
      { text: <>朝に集中するのは<b className="text-ink">開店とは関係ありません</b>{x.us ? "：米国のアップルストアの多くは10時開店です" : ""}</> },
      { text: <>受け取り在庫は、シャッターが上がる前に<b className="text-ink">オンラインで</b>放出されます</> },
      { text: <>自分で見るなら：平日の朝の<b className="text-ink">{rangeLabel(x.w.from, x.w.to)}</b></>, step: true },
      { text: <>誰も再読み込みしていない<b className="text-ink">残りの22時間</b>は、<Link href={x.alert}>入荷通知</Link>に任せましょう</>, step: true },
    ],
    storeChartKeys: (x: RestockTimesView): Point[] => [{ text: <>各店舗のページには、その店舗の時間帯のグラフがあります（<Link href={x.storesHref}>{x.us ? "州別のアップルストア" : `${rtPlace(x)}の店舗`}</Link>）。周りより1時間早く入荷する店舗は、知っておく価値があります</>, step: true }],

    // ---- 日別
    dayLead: (x: RestockTimesView) => {
      const { t, tracked, one } = x;
      return t.n > 0 && tracked === 1 ? (
        <b>計測はまだ1日目（{dateLabel(t.daily[t.daily.length - 1]?.date ?? t.since)}）で、確認済みの入荷は{N(t.n)}回{one ? "" : `（${N(t.stores)}店舗）`}です。</b>
      ) : t.n > 0 ? (
        <b>{t.days === tracked ? `計測した${N(t.days)}日すべて` : `${longDate(t.since)}以降の${N(tracked)}日中${N(t.days)}日`}で、1回以上の入荷を確認しました{t.peakWeekday != null ? `。最も多い曜日は${weekdayName(t.peakWeekday)}です` : ""}。</b>
      ) : (
        <b>{longDate(t.since)}以降、{rtPlace(x)}で確認された入荷はありません。</b>
      );
    },
    daysTracked: "入荷があった日 / 計測した日",
    busiestDay: (x: RestockTimesView, day: DayRow) => `最多の日：${dateLabel(day.date)}${x.one ? "" : `、${N(day.stores)}店舗`}`,
    busiestDayNone: "最多の日",
    drop: (x: RestockTimesView, drop: { at: string; restocks: number }) => `30分以内に入荷した店舗数：${zoneStamp(drop.at, x.c)}（${N(drop.restocks)}構成）。外から見えた一斉の放出`,
    weekend: (x: RestockTimesView) => `土日の入荷（${N(x.weekend)}回）`,
    dayCaption: (x: RestockTimesView) => `${rtPlace(x)}のiPhone Duoの入荷（日別）${x.t.reports.length ? "。「報告」の行は、私たちの計測開始前の日について他サイトが公開した観測で、時系列の参考としてのみ表示しています" : ""}`,
    dayHead: { date: "日付", restocks: "入荷", stores: "店舗", busiest: "最多の時間帯", source: "出典" },
    soFar: " · ここまで",
    reportedBy: (names: string[]) => <>{names.join(" / ")}の報告</>,
    dayKeys: (x: RestockTimesView, launch: string, resumed: string): Point[] => [
      { text: <><b className="text-ink">{dateLabel(launch)}</b>：発売日。最初の在庫はオンライン注文分</> },
      { text: <><b className="text-ink">{dateLabel(resumed)}</b>：店頭受け取りの予約が再開{x.us ? "（MacRumors）" : ""}</> },
      x.t.reports.length
        ? { text: <><b className="text-ink">報告</b>の行：{x.reportNames.join("・")}による発売週の観測。集計には含めません</> }
        : { text: <>{rtPlace(x)}の全店舗の記録は<b className="text-ink">{longDate(x.t.since)}</b>から</> },
      ...(x.t.n > 0 && x.t.peakWeekday == null ? [{ text: <>最も多い曜日は、データが<b className="text-ink">{WEEKDAY_MIN_SPAN}日分</b>そろってから示します（現在{N(x.tracked)}日分）</>, no: true }] : []),
      { text: <><b className="text-ink">店舗</b>の列に注目：同じ入荷回数でも、店舗数が多い日のほうがチャンスは大きい</>, step: true },
    ],

    // ---- 場所
    whereLead: (x: RestockTimesView, hit: { name: string; restocks: number; stores: number; storesTotal: number }[], total: number) => (
      <b>{hit[0].name}：{dateLabel(x.t.since, false)}以降、{N(hit[0].storesTotal)}店舗中{N(hit[0].stores)}店舗で{N(hit[0].restocks)}回の入荷{hit[1] ? <>、次いで{hit[1].name}（{N(hit[1].restocks)}回）</> : null}{hit[2] ? <>、{hit[2].name}（{N(hit[2].restocks)}回）</> : null}。{N(total)}{rtUnit(x)}のうち{N(hit.length)}で入荷があり{total - hit.length > 0 ? `、残る${N(total - hit.length)}はまだです` : "、すべてで入荷を確認しました"}。</b>
    ),
    whereNone: (x: RestockTimesView) => <b>{rtPlace(x)}で入荷が確認された{rtUnit(x)}はまだありません。最初の入荷から表が埋まります。</b>,
    regionCaption: (x: RestockTimesView) => `${rtPlace(x)}の${rtUnit(x)}別・iPhone Duoの確認済み入荷（${dateLabel(x.t.since, false)}〜今日）`,
    regionHead: (x: RestockTimesView) => [rtUnit(x), "入荷", "入荷した店舗", "最新の入荷（現地時間）"],
    ofN: (a: number, b: number) => <>{N(b)}店舗中{N(a)}</>,
    storesCaption: (x: RestockTimesView) => `${rtPlace(x)}でiPhone Duoの入荷が多い店舗（${dateLabel(x.t.since, false)}〜今日）`,
    storesHead: ["店舗", "入荷", "日数", "多い時間帯", "最新（現地時間）"],
    swaps: (x: RestockTimesView) => [
      { no: "入荷回数が最も多い店舗（場所は問わない）", yes: `${x.pattern ? `${hourLabel(x.w.from)}ごろ` : "朝"}、1時間以内で行ける2〜3店舗`, why: "行けない店舗の入荷は、入荷ではありません。いちばん多い店舗でも、1日のうち数分以外は受け取り不可です。" },
      { no: "1店舗だけを祈るように待つ", yes: "各店舗に通知を設定し、鳴った店舗へ向かう", why: "回数の表が教えてくれるのは、どの店舗へ先に向かうかだけです。" },
    ],
    nearMe: "いま近くでDuoの在庫がある店舗（英語）",

    // ---- 構成
    configLead: (x: RestockTimesView, top: { label: string; restocks: number }, rarest: { label: string; restocks: number } | null) => (
      <b>{top.label}：{N(x.t.n)}回の入荷のうち{N(top.restocks)}回（{rtPct(top.restocks / x.t.n)}）{rarest ? `。最も少なかったのは${rarest.label}で${N(rarest.restocks)}回` : ""}。</b>
    ),
    mostRestocked: (config: string) => `${config}：入荷が最も多い構成`,
    versus: (a: string, bCount: number, b: string) => `${a}の入荷（${b}は${N(bCount)}回）`,
    restocksOf: (a: string) => `${a}の入荷`,
    byStorage: "容量別",
    byColour: "カラー別",
    configNone: (x: RestockTimesView) => <b>{rtPlace(x)}で入荷が確認された構成はまだありません。最初の入荷が入る行として、{N(x.configs)}つの構成を並べています。</b>,
    configCaption: (x: RestockTimesView) => `${rtPlace(x)}のiPhone Duo、構成別の確認済み入荷（${dateLabel(x.t.since, false)}〜今日）`,
    configHead: ["構成", "入荷", "割合", "最新の入荷（現地時間）"],
    configKeys: (x: RestockTimesView): Point[] => [
      { text: <>構成の選び方は、<b className="text-ink">店舗の選び方より重要</b>です</> },
      x.storageRatio != null
        ? { text: <>入荷が最も多い容量で妥協すれば、次の容量の約<b className="text-ink">{x.storageRatio}倍</b>のチャンス</> }
        : { text: <>入荷が最も多い容量で妥協すれば、チャンスは<b className="text-ink">大きく</b>上がります</> },
      { text: <><b className="text-ink">2TB</b>は、配送で注文して待つiPhoneです</>, no: true },
      { text: <>価格といまの在庫：<Link href="/which-iphone-duo-restocks-most">入荷が多いiPhone Duoはどれ？（英語）</Link></>, step: true },
    ],

    // ---- 持続時間
    howLongLead: (x: RestockTimesView, sell: SelloutFacts) => <b>{rtPlace(x)}で完売した入荷{N(sell.n)}回のうち半数は{N(sell.medianSec)}秒以内に消え、{rtPct(sell.within2min)}が2分以内、{rtPct(sell.within20min)}が20分以内でした。</b>,
    secUnit: "秒",
    medianListing: "通常の在庫時間（出てから消えるまで、中央値）",
    within2: "2分以内に完売",
    within20: "20分以内に完売",
    fastest: "計測した最速の完売",
    howLongNone: (x: RestockTimesView) => <b>{rtPlace(x)}で完売した入荷は、まだ測定できるほどありません。数値は10回から示します。全体像は米国版ページにあります。</b>,
    howLongKeys: (x: RestockTimesView): Point[] => [
      { text: <>2分の窓をつかむのは<b className="text-ink">入荷通知</b>です。apple.comの再読み込みではありません</> },
      { text: <>このページのほかの数字は、すべてこの数字で説明がつきます</> },
      { text: <>入荷ごとの在庫秒数を構成・{rtRegion(x)}別に：<Link href="/iphone-duo-sell-out-times">iPhone Duoの入荷は何秒で完売する？（英語）</Link></>, step: true },
    ],
    measured: "各数値は、在庫を最初に確認したチェックから、なくなったことを確認したチェックまでの時間です。上限値なので、実際の在庫時間はこれより短くなります。",

    // ---- 受け取り不可
    unavailableLead: (x: RestockTimesView) => <b>入荷は「状態」ではなく一瞬の出来事だからです。{x.one ? "1店舗" : `${N(x.stores)}店舗`} × {N(x.configs)}構成＝{rtPlace(x)}で在庫になりうるのは{N(x.pairs)}通り。そしていま、iPhone Duoの在庫がある店舗は{N(x.duoNow)}店舗です。</b>,
    pairs: "在庫になりうる店舗×構成の組み合わせ",
    listingNow: "いまiPhone Duoを受け取りできる店舗",
    goneIn2: "2分以内に消えた入荷の割合",
    last24: "過去24時間の確認済み入荷",
    unavailableKeys: (x: RestockTimesView, today: number): Point[] => [
      x.recent.restocks > 0
        ? { text: <>過去24時間：{rtPlace(x)}の{N(x.recent.stores)}店舗で<b className="text-ink">確認済みの入荷{N(x.recent.restocks)}回</b></> }
        : today > 0
          ? { text: <>今日：{rtPlace(x)}で<b className="text-ink">確認済みの入荷{N(today)}回</b></> }
          : { text: <>実際にあった入荷は、上の日別の表で確認できます</> },
      { text: <>どれもapple.comに表示されたのは<b className="text-ink">1〜2分</b>だけ</> },
      { text: <>4日目でも14日目でも「どこも受け取り不可」は、Appleが販売をやめたという意味では<b className="text-ink">ありません</b></>, no: true },
    ],
    unavailableLinks: { explained: "「受け取り不可」の意味（英語）", howToGet: "iPhone Duoを手に入れる方法（英語）" },

    // ---- Reddit
    redditLead: (x: RestockTimesView) => <b><a href="https://www.reddit.com/r/applestore/" target="_blank" rel="noopener nofollow">r/applestore</a>や<a href="https://www.reddit.com/r/iphone/" target="_blank" rel="noopener nofollow">r/iphone</a>の経験則の多くは誠実ですが、1店舗だけの話で、1日で古くなります。よく見る4つの主張を、{rtPlace(x)}で確認した{N(x.t.n)}回の入荷と照らし合わせました。</b>,
    redditCaption: "iPhone Duoの入荷に関するRedditのよくある主張を、PickupCheckerの確認済み入荷で検証",
    redditHead: ["主張", "データが示すこと"],
    claims: (x: RestockTimesView): { claim: string; answer: ReactNode }[] => {
      const { t, w, tracked, recent } = x;
      return [
        { claim: "「入荷は夜中。午前3時にチェックしろ」", answer: t.n > 0 ? <>現地時間0〜6時の入荷は{rtPct(hourShare(t.byHour, 0, 6))}、{rangeLabel(w.from, w.to)}は{rtPct(w.share)}でした。</> : zero },
        { claim: "「Appleが入荷するのは決まった曜日だけ」", answer: t.n > 0 ? (t.peakWeekday != null ? <>これまで最も多いのは{weekdayName(t.peakWeekday)}（{N(t.n)}回中{N(t.byWeekday[t.peakWeekday])}回）ですが、入荷は{N(tracked)}日中{N(t.days)}日にありました。</> : <>計測した{N(tracked)}日のうち{N(t.days)}日に入荷があり{t.days === tracked ? "、入荷ゼロの日はありません" : "ました"}。最も多い曜日は、データが{WEEKDAY_MIN_SPAN}日分そろってから示します。</>) : zero },
        { claim: "「店舗に電話して、トラックが来る日を聞け」", answer: "Appleは入荷スケジュールを公表していません。apple.comに出るのはオンラインで放出される受け取り在庫で、店舗もほかの全員と同じ瞬間にそれを知ります。" },
        { claim: "「受け取り不可なら、もう二度と入らない」", answer: recent.restocks > 0 ? <>過去24時間に{N(recent.stores)}店舗で確認した{N(recent.restocks)}回の入荷が、そうでないことを示しています。どれも数分で再び「受け取り不可」に戻りました。</> : t.n > 0 ? <>{dateLabel(t.since, false)}以降に確認した{N(t.n)}回の入荷が、そうでないことを示しています。どれも数分で再び「受け取り不可」に戻りました。</> : "検証できるものがまだありません。" },
      ];
    },
    redditKeys: (): Point[] => [
      { text: <>うわさに頼るのは<b className="text-ink">データがない</b>とき。このページがそのデータで、誰でも無料で読めます</> },
      { text: <>Redditが正しいのは<b className="text-ink">購入手続きのコツ</b>：サインイン済み、Apple Payを準備（<Link href="/how-to-grab-an-iphone-duo-restock">私たちの20秒版（英語）</Link>）</> },
    ],

    // ---- 数え方
    methodLead: <b>入荷として数えるのは、apple.comが、それまで掲載していなかった構成をある店舗で店頭受け取り可能と掲載し、それを2回のチェックが一致して確認したときです。</b>,
    methodKeys: (x: RestockTimesView): Point[] => [
      { text: <>{x.one ? `${rtPlace(x)}のアップルストア` : `${rtPlace(x)}の全アップルストア`}を<b className="text-ink">{SPEED.checkSec}秒ごと</b>、通知の設定された店舗は<b className="text-ink">{SPEED.fastSec}秒ごと</b>にチェック</> },
      { text: <>他サイトの公表値は<b className="text-ink">{others}</b>。比べるのは公表された数字だけです</> },
      { text: <>最初の「在庫あり」は<b className="text-ink">約1秒後</b>にもう一度確かめてから数えます</> },
      { text: <>消えた在庫は<b className="text-ink">次のチェック</b>で確定</> },
      { text: <>店舗を初めて確認したとき、失敗・タイムアウトしたリクエスト：入荷にも「在庫切れ」にも<b className="text-ink">数えません</b></>, no: true },
      { text: <>時刻と日付は各店舗の<b className="text-ink">現地時間</b>。「波」は、タイムゾーンをまたいだ同じ30分のこと</> },
      { text: <>他サイトの報告{x.t.reports.length ? `（${x.reportNames.join("、")}）` : ""}：独自の行として表示し、<b className="text-ink">合計には含めません</b></> },
      { text: <>約5分ごとに更新。<Link href={x.logHref}>入荷履歴</Link>そのものはライブです</>, step: true },
    ],
    quote: "このページの数値は、リンクを添えていただければ自由に引用できます。PickupCheckerはAppleと提携していない独立したサービスで、誰でもapple.comで見られる受け取り在庫を、はるかに高い頻度で読み取っています。",
    alertIn: (x: RestockTimesView) => <>{x.one ? "" : `${rtPlace(x)}で`}iPhone Duoの入荷通知を設定</>,

    // ---- 関連、FAQ、出典
    related: "iPhone Duoのほかの疑問",
    sameData: "同じデータで答えています（英語）",
    questions: {
      sellOut: "入荷は何秒で完売する？",
      alerts: "いちばん早く通知を受け取るには",
      howToGet: "実際に手に入れるには",
      whichConfig: "入荷が多い構成は",
      nearMe: "いま近くで在庫がある店舗",
      unavailable: "「受け取り不可」の意味",
    },
    otherCountries: ((us: boolean) => (us ? "ほかの国の同じページ" : "ほかの国・地域")) as unknown as RT["otherCountries"],
    place: {
      byCity: "都市別",
      storesLive: (x: RestockTimesView) => `${rtPlace(x)}のアップルストア（リアルタイム在庫）`,
      countryPage: (c: Country) => `${country(c)}のiPhone Duo入荷時間`,
      sourcesWhere: (x: RestockTimesView) => `${rtPlace(x)}のアップルストア全${N(x.stores)}店舗`,
    },
    faqTitle: "よくある質問",
  },
};
