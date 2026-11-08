/**
 * 台灣中文：views —— 產品 × 地點頁、補貨紀錄、即時地圖、iPhone Duo 補貨時段頁與門市索引。
 * `c: Country` 是英文資料，國名一律用 places.countryLabel；`Store`／`Place` 物件也是英文資料，店名、城市、
 * 地區用 places.ts 換成 Apple 台灣的寫法。檢查間隔只寫 15 秒與 5 秒；不提退款。
 */
import type { ReactNode } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import type { Point } from "@/components/ui/Viz";
import type { Faq } from "@/lib/content/types";
import { catalogFor, storePath, storeTimeZone, type Store } from "@/lib/apple/catalog";
import { COUNTRIES, type Country, type CountryCode } from "@/lib/apple/countries";
import { faq as placeFaq, fmtDuration, peakOf, type FaqContext, type FaqItem } from "@/lib/seo/enrich";
import type { Place, Product } from "@/lib/seo/products";
import type { StoreLine } from "@/lib/seo/productData";
import type { PlaceStats, RestockStats } from "@/lib/stock/queries";
import { hourShare, type DayRow, type SelloutFacts } from "@/lib/content/restockTimes";
import { PATTERN_MIN, PATTERN_MIN_DAYS, WEEKDAY_MIN_SPAN } from "@/lib/content/siteFacts";
import type { Dict } from "../en";
import type { RestockTimesMeta, RestockTimesPlace, RestockTimesView } from "../en/views";
import { distance, fitTitleW, list, num, price } from "../../format";
import { appleStoreLabel, cityLabel, configLabel, regionLabel, storeLabel } from "../../places";
import { L, cn, hh, hrange, longYmdZh, n, regionZh, stampZh, taxNoteZh, weekdayZh, ymdZh, zhCfg, zoneName, zs } from "./util";

/* ---------------------------------------------------------------- 小工具 */

type RTMeta = RestockTimesMeta;
type RTView = RestockTimesView;

const C = (c: Country) => cn(c.cc);
/** 百分比；不到 0.5% 寫「<1%」。 */
const pc = (x: number) => (x > 0 && x < 0.005 ? "<1%" : `${Math.round(x * 100)}%`);
/** 「11 月 2 日 上午 9:30（台北標準時間）」：國家參考時區。 */
const zoneStamp = (iso: string, c: Country) => `${stampZh(iso, c.timeZone)} ${zoneName(c.timeZone, iso)}`;
/** 門市當地時間：「11 月 2 日 下午 2:31」。 */
const local = (iso: string, store: Pick<Store, "storeNumber" | "country" | "timeZone" | "state">) => stampZh(iso, storeTimeZone(store as Store));
/** 補貨時段頁按地區分組時的名詞：美國「州」，其他國家依 regionNoun，沒有就是「門市」。 */
const rtRegion = (x: { us: boolean; c: Country }) => (x.us ? "州" : x.c.regionNoun ? regionZh(x.c) : "地區");
/** 頁面講的地方：國家（C），或地區／城市頁的名字（「大倫敦」「東京」）。 */
const rtW = (x: { c: Country; place?: RestockTimesPlace }) => (x.place ? x.place.name : C(x.c));
/** 「依○○」的分組單位：國家頁依地區，地區頁依城市，城市頁依門市。 */
const rtUnit = (x: { us: boolean; c: Country; place?: RestockTimesPlace }) => (x.place ? (x.place.kind === "region" ? "城市" : "門市") : rtRegion(x));
/** 分組單位的量詞：地區、城市用「個」，門市用「家」。 */
const rtCl = (x: { place?: RestockTimesPlace }) => (x.place?.kind === "city" ? "家" : "個");
const apple = (s: Store) => appleStoreLabel(s, L);
/** 地點（英文資料）→ 中文名。 */
function placeName(place: Place): string {
  const code = place.country ?? "us";
  if (place.level === "country") return cn(code);
  if (place.level === "state") return regionLabel(code, place.state!, L);
  if (place.level === "city") return cityLabel(code, place.city!, L);
  return appleStoreLabel(place.store!, L);
}

/* ---------------------------------------------------------------- 產品 × 地點頁的標題、描述與 FAQ */

function productTitle(product: Product, place: Place, inStock: number): string {
  const code = place.country ?? "us";
  const k = place.stores.length;
  const name = zhCfg(product.name);
  const short = zhCfg(product.short);
  const w = placeName(place);
  if (place.level === "country") {
    return fitTitleW([
      ...(inStock > 0 ? [`${name}現貨：${w} ${n(inStock)} 家 Apple ${code === "us" ? "Store" : "直營店"}有貨`] : []),
      `${w} ${name}門市取貨即時現貨`,
      `${w} ${short}門市取貨現貨`,
      `${short}門市取貨現貨`,
    ].map(zs));
  }
  if (place.level === "store") {
    const s = place.store!;
    return fitTitleW([
      `${w} ${name}：${inStock > 0 ? "現在有貨" : "門市取貨現貨"}`,
      `${w}（${cityLabel(code, s.city, L)}）${short}現貨`,
      `${w} ${short}現貨`,
      `${storeLabel(s, L)} ${short}`,
    ].map(zs));
  }
  return fitTitleW([
    `${w} ${name}現貨：${n(k)} 家中 ${n(inStock)} 家有貨`,
    `${w} ${name}門市取貨現貨`,
    `${w} ${short}現貨`,
    `${w} ${short}`,
  ].map(zs));
}

function productDescription(product: Product, place: Place, inStock: number, stats: PlaceStats): string {
  const code = place.country ?? "us";
  const name = zhCfg(product.name);
  const week = `本週補貨 ${n(stats.week)} 次`;
  if (place.level === "store") {
    const s = place.store!;
    return fitTitleW([
      `${apple(s)}（${cityLabel(code, s.city, L)}）的 ${name}門市取貨現貨：${inStock > 0 ? "現在有貨" : "目前沒貨"}，${week}。即時狀態、補貨時段與通知。`,
      `${apple(s)} 的 ${name}：${inStock > 0 ? "現在有貨" : "目前沒貨"}，${week}。即時狀態與通知。`,
    ].map(zs), 155);
  }
  const where = place.level === "country" ? `${cn(code)}的 ${code === "us" ? "Apple Store" : "Apple 直營店"}` : `${placeName(place)}的 Apple 直營店`;
  return fitTitleW([
    `${name}門市取貨現貨：${where}共 ${n(place.stores.length)} 家，現在 ${n(inStock)} 家有貨，${week}。各門市即時狀態、補貨時段與通知。`,
    `${name}：${where} ${n(place.stores.length)} 家中現在 ${n(inStock)} 家有貨，${week}。各門市即時狀態與通知。`,
  ].map(zs), 155);
}

function productFaq(product: Product, place: Place, lines: StoreLine[], stats: PlaceStats, clock: RestockStats, nearest: { name: string; city: string; distance: number } | null): FaqItem[] {
  const code = place.country ?? "us";
  const name = zhCfg(product.name);
  const at = placeName(place);
  const out: FaqItem[] = [];
  const km = (miles: number) => (miles * 1.609344 < 0.5 ? "不到 1 km" : distance(L, code, miles));
  const near = nearest ? `；最近有貨的是${nearest.city}的 ${/^apple\b/i.test(nearest.name) ? nearest.name : `Apple ${nearest.name}`}，距離${km(nearest.distance)}` : "";
  const have = lines.filter((l) => l.available.length > 0);
  if (place.level === "store") {
    const l = lines[0];
    out.push({
      q: zs(`${at}現在有 ${name}現貨嗎？`),
      a: zs(l && l.available.length > 0
        ? `上次檢查時有${product.parts.length > 1 ? `：${list(L, l.available.map((i) => configLabel(i, L)), 4, (x) => `另外 ${n(x)} 款`)}` : ""}。`
        : `上次檢查時沒有${near}。`),
    });
  } else {
    out.push({
      q: zs(`${at}哪些 Apple 直營店有 ${name}？`),
      a: zs(have.length === 0
        ? `上次檢查時沒有${near}。`
        : `上次檢查時有 ${n(have.length)} 家：${list(L, have.map((x) => apple(x.store)), 4, (x) => `另外 ${n(x)} 家`)}。`),
    });
  }
  const peak = peakOf(clock, L);
  out.push({
    q: zs(`${at}的 ${name}多久補貨一次？`),
    a: zs(stats.month === 0 ? `${at}最近 ${stats.days} 天沒有補貨紀錄。` : `最近 ${stats.days} 天補貨 ${n(stats.month)} 次，本週 ${n(stats.week)} 次${peak ? `，大多在當地時間${peak.hour}前後` : ""}。`),
  });
  if (stats.medianMs != null) out.push({ q: zs(`${at}的 ${name}現貨能維持多久？`), a: zs(`中位數約 ${fmtDuration(stats.medianMs, L)}，之後就又賣完了。`) });
  return out;
}

function priceLabel(product: Product): string {
  const code: CountryCode = product.country ?? "us";
  const prices = catalogFor(product.model, code).filter((x) => product.parts.includes(x.partNumber)).map((x) => x.price);
  const lo = Math.min(...prices), hi = Math.max(...prices);
  const f = (v: number) => price(L, COUNTRIES[code], v);
  return lo === hi ? f(lo) : `${f(lo)}–${f(hi)}`;
}

/* ---------------------------------------------------------------- views */

export const views: Dict["views"] = {
  common: {
    inCountry: (c: Country) => C(c),
    liveMap: "即時地圖",
    restockLog: "補貨紀錄",
    alertMe: "通知我",
    lastDays: (days: number) => <>最近 {days} 天</>,
    since: "2026 年 11 月 2 日",
    sourcesWhere: (k: number, c: Country) => zs(k === 1 ? `${C(c)}唯一的 Apple 直營店` : `${C(c)}全部 ${k} 家 Apple 直營店`),
    checker: (c: Country) => zs(`${C(c)} iPhone 現貨查詢`),
    appleStoresIn: (c: Country) => zs(`${C(c)}的 Apple 直營店`),
    storesWithIt: "有貨門市",
    more: "更多",
  },

  /* ---------------------------------------------------------------- /stock/{product}/{place…} */
  product: {
    title: productTitle,
    description: productDescription,
    faq: productFaq,
    priceLabel,
    inPlace: (name: string) => name,
    h1Country: (model: string, c: Country) => zs(`${C(c)} ${zhCfg(model)}門市取貨現貨`),
    h1Place: (model: string, where: string) => zs(`${where} ${zhCfg(model)}現貨`),
    inStockNow: "目前有現貨",
    yes: "有",
    no: "沒有",
    pickup: "門市取貨",
    configurations: "款規格",
    ofStores: (k: number) => `共 ${k} 家門市`,
    restocks24h: "24 小時補貨",
    restocksHint: (week: number, month: number, days: number) => `7 天 ${week} 次 · ${days} 天 ${month} 次`,
    sellOuts: (days: number) => `${days} 天售完次數`,
    stays: (ms: number) => `約維持 ${fmtDuration(ms, L)}`,
    noPairs: "資料還不夠",
    lastRestock: "上次補貨",
    noneYet: "還沒有",
    thisConfig: "此規格",
    inDays: (days: number) => `最近 ${days} 天`,
    notInStockNow: "目前沒有現貨",
    configsInStock: (k: number, of: number) => <span>{of} 款規格中 <b className="text-ink">{k}</b> 款有現貨</span>,
    inStockAt: (k: number, of: number) => <span>{of} 家門市中 <b className="text-ink">{k}</b> 家有現貨</span>,
    checked: (live: ReactNode, p: string, tax: string) => <>檢查於 {live} · {p}{tax}</>,
    taxNote: (c: Country) => taxNoteZh(c),
    beforeTax: "未稅",
    buyOnApple: "前往 apple.com 購買",
    allStoresIn: (c: Country) => `${C(c)}所有門市`,
    everyIphoneHere: "這家店的所有 iPhone",
    everyIphone: (where: string) => zs(`${where}所有 iPhone`),
    panel: (model: string, where: string | null) => zs(`${where ? `${where}的 ` : ""}${zhCfg(model)}：勾選規格與門市`),
    unitConfigs: "規格",
    unitStores: "門市",
    otherConfigsHere: "這裡的其他規格",
    byStorageColor: "依容量與顏色",
    nearestStores: "最近的門市",
    closest: (link: ReactNode, dist: string) => <>最近有貨：{link} · {dist}</>,
    storeCity: (store: string, city: string) => <>{store}（{city}）</>,
    mostRecentlyInStock: "最近有過現貨",
    storesWithItNow: "現在有貨的門市",
    storesIn: (where: string) => zs(`${where}的門市`),
    colStatus: "狀態",
    colConfigs: "有現貨的規格",
    noStoreHasIt: "目前沒有門市有貨。",
    noStoreHereHasIt: "這裡目前沒有門市有貨。",
    moreStores: (k: number) => <>還有 {k} 家門市，依地區查看。</>,
    byRegion: (c: Country) => `依${regionZh(c)}`,
    byCity: "依城市",
    nearbyStores: "附近門市",
    latestChanges: "最新變化",
    nothingLogged: "還沒有紀錄。",
    whenRestocks: "什麼時候補貨",
    howFast: "多快賣完",
    restocksByConfig: "各規格補貨次數",
    faqTitleCountry: (model: string, c: Country) => zs(`${C(c)} ${zhCfg(model)}常見問題`),
    faqTitle: (model: string, where: string) => zs(`${where} ${zhCfg(model)}常見問題`),
    buySource: (model: string, c: Country) => zs(`Apple ${C(c)}：購買 ${zhCfg(model)}`),
    nearby: "附近",
    otherRegions: (c: Country) => `其他${regionZh(c)}`,
    elsewhereIn: (region: string) => zs(`${region}其他地方`),
    everyAppleStoreIn: (c: Country) => zs(`${C(c)}所有 Apple 直營店`),
    across: (model: string, c: Country) => zs(c.cc === "tw" ? `全台 ${zhCfg(model)}現貨` : `${C(c)}各地 ${zhCfg(model)}現貨`),
    itemList: (model: string, where: string) => zs(`${where} ${zhCfg(model)}`),
    nearLead: (c: Country, model: string, inStock: number, total: number, have: { store: string; city: string; configs: number }[]) =>
      zs(inStock === 0
        ? `${C(c)}目前沒有任何 Apple 直營店上架 ${model} 門市取貨，所以「我附近哪家有」問的其實是哪家先補貨。在你到得了的門市設好通知，一上架，推播幾秒內就到。`
        : `${n(total)} 家門市中有 ${n(inStock)} 家現在有 ${model}：${list(L, have.slice(0, 5).map((l) => `${l.store}（${l.city}，${l.configs} 款）`), 5, (x) => `另外 ${n(x)} 家`)}。`),
    nearHead: (c: Country) => [regionZh(c), "有貨門市"],
    nearCaption: (c: Country, model: string) => zs(`各${regionZh(c)}的 ${model} 門市取貨現貨（上次檢查）`),
    nearMe: (_c: Country, model: string, alert: string) => zs(`想依你的位置排出每家門市的遠近，打開本頁的通知設定並點「我附近」：距離以公里計、依道路估算，每家門市都附導航連結。[設定 ${model} 補貨通知](${alert})。`),
    modelFaq: (c: Country, model: string, low: number, high: number, inStock: number): { price: FaqItem; reserve: FaqItem } => {
      const money = (v: number) => price(L, c, v);
      return {
        price: { q: zs(`${model} 在${C(c)}多少錢？`), a: zs(`apple.com 售價從 ${money(low)} 到 ${money(high)}（${taxNoteZh(c)}），依容量而定。`) },
        reserve: { q: zs(`${C(c)}可以預約 ${model} 門市取貨嗎？`), a: zs(`不行；門市一上架某個規格，你就在 apple.com 下單並選擇門市取貨，Apple 會依你選的時段保留。${inStock === 0 ? "現在沒有門市上架，所以想搶第一，就要先設好通知。" : ""}`) },
      };
    },
  },

  /* ---------------------------------------------------------------- /restocks */
  restocks: {
    metaTitle: (c: Country, k: number) => zs(`${C(c)} iPhone 補貨紀錄：${k === 1 ? "Apple 直營店" : `全部 ${k} 家 Apple 直營店`}即時更新`),
    metaDescription: (c: Country, k: number) => zs(`${C(c)}${k === 1 ? "唯一一家" : "各家"} Apple 直營店每一次 iPhone Duo、18 Pro 與 Pro Max 門市取貨補貨，附確切時間、規格與地圖。`),
    h1: (c: Country) => `${C(c)}補貨紀錄`,
    summary: (day: number, week: number, model?: string, region?: string) => <>24 小時內補貨 {num(L, day)} 次 · 本週 {num(L, week)} 次{model ? ` · ${model}` : ""}{region ? ` · ${region}` : ""}。時間以你的時區顯示。</>,
    allModels: "所有機型",
    restocks: "補貨",
    withSoldOut: "補貨＋售完",
    regionLabel: (c: Country) => regionZh(c),
    allRegions: (c: Country) => `所有${regionZh(c)}`,
    filter: "篩選",
    page: (k: number) => <>第 {k} 頁</>,
    newer: "← 較新",
    older: "較舊 →",
    getAlerts: "設定通知",
    byPlace: "依地點看補貨",
    byRegion: (c: Country) => `依${regionZh(c)}`,
    datasetName: (c: Country) => zs(`${C(c)} Apple 直營店 iPhone 門市取貨補貨紀錄`),
    datasetDescription: (c: Country) => zs(`${c.cc === "us" ? "全美 269 家 Apple Store" : `${C(c)}的 Apple 直營店`}每一次經確認的 iPhone Duo、iPhone 18 Pro 與 iPhone 18 Pro Max 門市取貨補貨與售完，附門市、確切規格與時間。apple.com 連續兩次回應一致才記為補貨；每 15 秒檢查一次（有通知的門市每 5 秒）。`),
    datasetMeasured: ["Apple 直營店", "iPhone 機型、容量與顏色", "補貨時間", "售完時間"],
  },

  /* ---------------------------------------------------------------- /map */
  map: {
    metaTitle: (c: Country, k: number) => zs(`${C(c)} iPhone Duo 門市取貨現貨地圖：${k === 1 ? "Apple 直營店" : "每家 Apple 直營店"}即時更新`),
    metaDescription: (c: Country, k: number) => zs(`${C(c)}${k === 1 ? "唯一一家" : `全部 ${k} 家`} Apple 直營店的即時地圖：iPhone Duo、18 Pro 與 Pro Max 現在的門市取貨現貨，可依容量與顏色篩選。`),
    /** 地圖元件在非英文時用 regionNoun 當 key 查 cdict map.nouns，所以這裡維持英文 key；國名它自己用 countryLabel。 */
    country: (c: Country) => ({ name: C(c), inName: C(c), regionNoun: c.regionNoun, regionNounPlural: c.regionNounPlural }),
    everyStore: "所有門市",
    storeCity: (store: string, city: string) => `${store} · ${city}`,
  },

  /* ---------------------------------------------------------------- /{cc}/stores */
  storesIndex: {
    metaDescription: (c: Country, k: number, regions: number, cities: number, duo: number, max: number) => {
      const by = c.regionNoun && regions > 1 ? `，依${regionZh(c)}與城市排列` : cities > 1 ? "，依城市排列" : "";
      return zs(`${C(c)}全部 ${k} 家 Apple 直營店${by}，即時顯示 iPhone Duo、18 Pro 與 Pro Max 門市取貨現貨：現在 ${duo} 家有 Duo、${max} 家有 Pro Max。`);
    },
    countAnswer: (k: number, spread: string, top: { name: string; count: number }[]) => zs(`${k} 家，${spread}${top.length ? `。${top[0].name}最多（${top[0].count} 家）${top[1] ? `，其次是${top[1].name}（${top[1].count} 家）` : ""}` : ""}。`),
    howMany: (c: Country) => <>{C(c)}有幾家 Apple 直營店？</>,
    duoNow: (c: Country, k: number, have: Store[]): FaqItem => ({
      q: zs(`${C(c)}哪些 Apple 直營店現在有 iPhone Duo？`),
      a: zs(have.length === 0 ? `上次檢查時 ${k} 家都沒有。只要有門市上架，本頁與地圖會立刻更新，設好通知則會第一時間告訴你。` : `上次檢查時 ${k} 家中有 ${have.length} 家：${have.slice(0, 6).map(apple).join("、")}${have.length > 6 ? "等" : ""}。`),
    }),
    faq: (ctx: FaqContext) => placeFaq({ ...ctx, omit: [...(ctx.omit ?? []), "count", "stock", "lasts"] }, L),
    duoBlock: (alert: string) => zs(`最快買到的方法，是在你到得了的門市設好通知：[設定 iPhone Duo 補貨通知](${alert})。每家門市 × 每種規格算一則通知，門市一上架，推播幾秒內就到。`),
    intro: (c: Country, k: number, spread: string, now: { duo: number; max: number; pro: number }, tax: string) => zs(`${C(c)}共有 **${k} 家 Apple 直營店**，${spread}。現在有 **${now.duo}** 家可門市取貨 iPhone Duo、**${now.max}** 家有 iPhone 18 Pro Max、**${now.pro}** 家有 18 Pro。${tax}`),
    crumb: "Apple 直營店",
    panel: (c: Country) => zs(`選好手機，勾選你到得了的${C(c)}門市`),
    matrixLabel: "各門市現貨",
    matrixH2: (c: Country) => <>{zs(`${C(c)}每家 Apple 直營店的現貨`)}</>,
    matrixHint: "有現貨／追蹤中的規格數，依機型。",
    topCaption: (c: Country) => <>Apple 直營店最多的{regionZh(c)}（依 Apple 直營店列表，本站追蹤範圍）</>,
    regionHead: (c: Country) => regionZh(c),
    colStores: "Apple 直營店",
    colCities: "城市",
    locationsBy: (c: Country) => zs(`各${regionZh(c)}的 Apple 直營店`),
    locationsIn: (c: Country) => zs(`${C(c)}的 Apple 直營店據點`),
    storeCount: (k: number) => <>{k} 家門市</>,
    storeCountAll: (k: number) => <>{k} 家門市</>,
    whenRestock: (c: Country) => <>{C(c)}的門市什麼時候補貨？</>,
    howFast: (c: Country) => <>{C(c)}的補貨多快賣完？</>,
    faqTitle: (c: Country) => zs(`${C(c)} Apple 直營店常見問題`),
    getApp: "安裝 App",
    howItWorks: "運作方式",
    pricing: "價格方案",
  },

  /* ---------------------------------------------------------------- /iphone-duo-restock-times */
  restockTimes: {
    fmt: {
      n: (x: number) => num(L, x),
      pct: pc,
      date: (ymd: string, weekday = true) => ymdZh(ymd, weekday),
      longDate: longYmdZh,
      zoneStamp,
      local,
      hour: (h: number) => hh(h),
      range: hrange,
      weekday: weekdayZh,
      store: apple,
      storeWithPlace: (s: Store) => `${apple(s)}（${cityLabel(s.country ?? "us", s.city, L)}）`,
    },
    title: (c: Country, place?: RestockTimesPlace) => zs(`${place ? place.name : C(c)} iPhone Duo 什麼時候補貨？Apple 直營店補貨時段`),
    metaDescription: (x: RTMeta) => {
      const { c, t, w, pattern } = x;
      const region = c.cc === "us" ? "州" : c.regionNoun ? regionZh(c) : "門市";
      /** 地區頁依城市；城市頁不另列單位（免得「門市」說兩次）。 */
      const unit = x.place ? (x.place.kind === "region" ? "城市" : null) : region;
      const w2 = rtW(x);
      const since = ymdZh(t.since, false);
      return t.n > 0 && pattern
        ? fitTitleW([
          `自 ${since}起，${w2} Apple 直營店共確認 ${n(t.n)} 次 iPhone Duo 補貨：${pc(w.share)} 落在當地時間${hrange(w.from, w.to)}${t.sellout ? `，${pc(t.sellout.within2min)} 在 2 分鐘內被搶光` : ""}。依小時、日期、${unit ? `${unit}、` : ""}門市與規格整理成表。`,
          `自 ${since}起，${w2} Apple 直營店共確認 ${n(t.n)} 次 iPhone Duo 補貨：${pc(w.share)} 落在當地時間${hrange(w.from, w.to)}。依小時、日期、${unit ?? "門市"}與規格整理成表。`,
          `${w2} iPhone Duo 補貨時段：自 ${since}起確認 ${n(t.n)} 次，依小時、日期、${unit ?? "門市"}與規格整理。`,
        ].map(zs), 158)
        : t.n > 0
          ? fitTitleW([
            `PickupChecker 自 ${since}起每 15 秒檢查一次，確認${w2} Apple 直營店 iPhone Duo 補貨 ${n(t.n)} 次：依當地小時、每日、${unit ? `${unit}、` : ""}門市與規格整理，並記下每次維持多久。`,
            `${w2} iPhone Duo 補貨時段：自 ${since}起確認 ${n(t.n)} 次，依小時、日期、${unit ?? "門市"}與規格整理。`,
          ].map(zs), 158)
          : zs(`${w2} Apple 直營店什麼時候補貨 iPhone Duo：PickupChecker 自 ${longYmdZh(t.since)}起每 15 秒自行檢查，逐小時、逐日、依門市與規格整理。`);
    },
    h1: (x: RTView) => zs(x.t.unknown
      ? `Apple 什麼時候在${rtW(x)}補貨 iPhone Duo？`
      : x.t.n > 0
        ? `${rtW(x)}的 Apple 直營店還有在補 iPhone Duo 嗎？有，逐小時告訴你何時補`
        : `${rtW(x)}的 Apple 直營店開始補 iPhone Duo 了嗎？依我們的檢查還沒有，以下是我們盯的數據`),
    intro: (x: RTView) => {
      const { t, one, tracked, pattern, w } = x;
      const who = one ? `${rtW(x)}唯一的 Apple 直營店` : `${rtW(x)}的 Apple 直營店`;
      return t.unknown ? (
        <>{zs(`暫時讀不到補貨紀錄；${rtW(x)}的門市仍在每 15 秒檢查一次，下次載入本頁時數字就會回來。`)}</>
      ) : t.n > 0 ? (
        <>
          <b className="text-ink">有。</b>{zs(who)}<b className="text-ink">{zs(`自 ${longYmdZh(t.since)}起已補貨 iPhone Duo ${n(t.n)} 次`)}</b>{tracked > 1 ? `，${tracked} 天中有 ${t.days} 天有補貨` : "（目前只追蹤了一天）"}
          {pattern && <>，<b className="text-ink">其中 {pc(w.share)} 落在門市當地時間{hrange(w.from, w.to)}</b></>}。
        </>
      ) : (
        <>
          <b className="text-ink">依我們的檢查，還沒有。</b>{zs(`自 ${longYmdZh(t.since)}起，PickupChecker 每 15 秒詢問${one ? `${rtW(x)}唯一的 Apple 直營店` : `${rtW(x)}全部 ${x.stores} 家 Apple 直營店`}一次，還沒有確認過任何 iPhone Duo 門市取貨補貨。`)}
        </>
      );
    },
    hero: {
      restocks: (x: RTView) => zs(`${ymdZh(x.t.since, false)}起確認的補貨`),
      window: (x: RTView) => `落在門市當地時間${hrange(x.w.from, x.w.to)}`,
      days: "至少補貨一次的天數",
      now: ((one: boolean): string => (one ? "這家店現在可門市取貨" : "家門市現在可門市取貨")) as Dict["views"]["restockTimes"]["hero"]["now"],
      today: (x: RTView, today: DayRow) => `今天（${ymdZh(today.date, false)}）到目前${x.one ? "" : `，${today.stores} 家門市`}`,
      weekday: "目前最忙的星期",
    },
    heroPoints: (x: RTView, latest: { config: string; store: Store; at: string } | null): Point[] => [
      ...(latest ? [{ text: <>最新：<b className="text-ink">{latest.config}</b>{x.one ? null : <>，在 <Link href={storePath(latest.store)} className="underline underline-offset-2">{apple(latest.store)}</Link></>}，當地時間 {local(latest.at, latest.store)}</> }] : []),
      ...(x.t.peakWeekday != null ? [{ text: <>最常落在<b className="text-ink">{weekdayZh(x.t.peakWeekday)}</b></> }] : []),
      { text: <>Apple <b className="text-ink">不公布補貨時間表</b>；這些是我們自己確認的檢查結果，大約每 5 分鐘更新一次</>, no: true },
    ],
    emptyPoints: (x: RTView): Point[] => [
      { text: <>現在 <b className="text-ink">{x.stores} 家中 {x.duoNow} 家</b>可門市取貨</> },
      { text: <>下面的表格會從第一次確認的補貨開始累積</>, step: true },
      { text: <>逐小時、逐星期的規律，資料最多的是<Link href="/iphone-duo-restock-times" className="underline underline-offset-2">美國頁面</Link>（英文）</>, step: true },
    ],
    setUpAlert: "設定 iPhone Duo 補貨通知",
    logLive: "即時補貨紀錄",
    onThisPage: "本頁內容",
    nav: (x: RTView): Record<string, string> => ({
      "time-of-day": "時段",
      "day-by-day": "每日",
      where: `依${rtUnit(x)}`,
      configuration: "規格",
      "how-long": "維持多久",
      unavailable: "為何顯示無貨",
      reddit: "網路說法 vs 數據",
      method: "怎麼計算",
    }),
    h2: (x: RTView): Record<string, string> => ({
      "time-of-day": zs(`${rtW(x)}的 iPhone Duo 通常幾點補貨？`),
      "day-by-day": zs(`Apple 哪幾天在${rtW(x)}補貨 iPhone Duo？`),
      where: zs(`${rtW(x)}哪幾家 Apple 直營店最常補貨 iPhone Duo？`),
      configuration: zs(`${rtW(x)}哪個 iPhone Duo 規格最常補貨？`),
      "how-long": zs(`${rtW(x)}的 iPhone Duo 補貨能維持多久？`),
      unavailable: "為什麼每家 Apple 直營店都顯示「無法取貨」？",
      reddit: "Reddit 上流傳的 iPhone Duo 補貨說法，和數據怎麼說",
      method: "PickupChecker 怎麼計算一次補貨？",
    }),
    faq: (x: RTView): Faq[] => {
      const { t, w, pattern, sell, us, weekend, tracked } = x;
      const where = rtW(x);
      const window = hrange(w.from, w.to);
      return [
        { q: zs(`Apple 什麼時候在${where}補貨 iPhone Duo？`), a: zs(t.n > 0 && pattern
          ? `大多在上午：自 ${longYmdZh(t.since)}起確認的 ${n(t.n)} 次補貨中，${pc(w.share)} 落在門市當地時間${window}，${pc(hourShare(t.byHour, 8, 12))} 落在上午 8 點到中午 12 點。Apple 不公布時間表；這是 PickupChecker 觀察到的規律，大約每 5 分鐘更新一次。`
          : `Apple 不公布時間表。PickupChecker 自 ${longYmdZh(t.since)}起在${where}記錄到 ${n(t.n)} 次確認補貨${t.days ? `，分布在 ${t.days} 天` : ""}。要有 ${PATTERN_MIN} 次補貨、分布在 ${PATTERN_MIN_DAYS} 個不同的日子，我們才會寫出「通常幾點」，本頁會自動更新。`) },
        { q: zs(`Apple 週末也會${us ? "" : `在${where}`}補貨 iPhone Duo 嗎？`), a: zs(t.n > 0
          ? `${weekend > 0 ? "目前看來會" : "我們的資料裡還沒有"}：${n(t.n)} 次補貨中有 ${n(weekend)} 次落在週六或週日（${pc(weekend / t.n)}）。${t.peakWeekday != null ? `${weekdayZh(t.peakWeekday)}是目前最忙的一天。` : `資料涵蓋滿 ${WEEKDAY_MIN_SPAN} 天前，我們不說哪一天最忙；目前涵蓋 ${tracked} 天。`}`
          : `${where}還沒有週末資料；本頁的每日表格會隨確認的補貨自動累積。`) },
        { q: "應該幾點開始盯？", a: zs(t.n > 0 && pattern
          ? `如果要自己手動刷，從當地時間${hh(w.from)}起就開著 apple.com、選好門市取貨；這兩個小時佔了 ${pc(w.share)} 的補貨。一次補貨${sell ? `的中位數是 ${sell.medianSec} 秒就沒了` : "大約只維持一分鐘"}，所以每 5 秒檢查一次的通知（[通知怎麼運作](/iphone-duo-stock-alerts)）做得到手動刷新做不到的事。`
          : `在${where}的規律明朗之前，就讓通知替你盯：你選的門市每 5 秒檢查一次，全天候不停（[通知怎麼運作](/iphone-duo-stock-alerts)）。`) },
        { q: "為什麼每家 Apple 直營店都顯示 iPhone Duo 無法取貨？", a: zs(sell
          ? `因為補貨很短：我們在${where}量到的 ${n(sell.n)} 次售完補貨中，${pc(sell.within2min)} 在 2 分鐘內被搶光，${pc(sell.within20min)} 在 20 分鐘內。現在 ${x.stores} 家中有 ${x.duoNow} 家有貨；就算一天補貨好幾十次，其他時候 apple.com 誠實的答案幾乎都是「無法取貨」（[「無法取貨」是什麼意思](/apple-store-pickup-availability-explained)）。`
          : `因為門市取貨的現貨每次只出現幾分鐘。現在${where} ${x.stores} 家門市中有 ${x.duoNow} 家有貨（[「無法取貨」是什麼意思](/apple-store-pickup-availability-explained)）。`) },
        { q: "我的 Apple 直營店補貨 iPhone Duo 時，怎麼收到通知？", a: zs(`為那家門市和確切的容量、顏色設一則通知：之後那家店每 5 秒檢查一次，確認補貨後約 3 秒推播到你的手機（[設定通知](${x.alert})；[運作方式](/how-it-works)）。`) },
      ];
    },
    sources: {
      applePickup: "Apple：送貨與取貨（門市取貨的供應情況怎麼運作）",
      newsroom: "Apple Newsroom：iPhone Duo 抵達全球 Apple 直營店（2026 年 10 月 23 日）",
      macRumors: "MacRumors：iPhone Duo 的 Apple Store 取貨系統在美國與加拿大重新開放（2026 年 10 月 24 日）",
      reports: (tracker: string) => zs(`${tracker}：上市週的 iPhone Duo 補貨回報（對方的觀察，單獨標示，從不計入）`),
    },
    ld: (x: RTView) => ({
      datasetName: zs(`${rtW(x)} Apple 直營店 iPhone Duo 補貨時段`),
      description: zs(`自 ${x.t.since} 起${rtW(x)} Apple 直營店每一次經確認的 iPhone Duo 門市取貨補貨，附門市、規格與時間，來自 PickupChecker 每 15 秒一次的檢查；依當地小時、日期、${x.place?.kind === "city" ? "" : `${rtUnit(x)}、`}門市與規格彙整。`),
      spatial: zs(`${rtW(x)}的 Apple 直營店`),
      measured: ["補貨時間（門市當地時間）", "Apple 直營店", "iPhone Duo 容量與顏色", "賣完前經過的秒數"],
      size: `${x.t.n} 次補貨，${x.t.stores} 家門市`,
    }),
    crumb: "iPhone Duo 補貨時段",

    timeLead: (x: RTView) => <b>{zs(`${n(x.t.n)} 次補貨中，${pc(x.w.share)} 落在門市當地時間${hrange(x.w.from, x.w.to)}，${pc(hourShare(x.t.byHour, 8, 12))} 落在上午 8 點到中午 12 點。`)}</b>,
    busiestHour: (count: number) => `單一最忙的小時：補貨 ${n(count)} 次`,
    morning: "上午 8 點到中午 12 點",
    evening: "下午 5 點以後：晚上不是沒有",
    night: "午夜到清晨 6 點",
    tooFew: (x: RTView) => <b>{zs(`天數還太少，還說不出通常幾點：自 ${longYmdZh(x.t.since)}起，${x.t.days} 天內確認補貨 ${n(x.t.n)} 次。`)}</b>,
    tooFewKeys: (): Point[] => [
      { text: <>要說出通常幾點，需要 <b className="text-ink">{PATTERN_MIN} 次補貨、分布在 {PATTERN_MIN_DAYS} 個不同的日子</b></> },
      { text: <>同一波連補十次 = 一次事件，不是習慣</>, no: true },
      { text: <>天數累積後，本頁會自己改寫</>, step: true },
    ],
    hourCaption: (x: RTView) => zs(`${rtW(x)} iPhone Duo 依門市當地小時的補貨次數，${ymdZh(x.t.since, false)}至今（共 ${n(x.t.n)} 次）`),
    hourHead: ["當地時段", "補貨次數", "占比"],
    morningKeys: (x: RTView): Point[] => [
      { text: <>上午的集中<b className="text-ink">不是因為開門</b>{x.us ? "：美國多數 Apple Store 上午 10 點才開門" : ""}</> },
      { text: <>門市取貨的庫存是在<b className="text-ink">線上</b>釋出的，早在拉開鐵門之前</> },
      { text: <>手動盯：平日盯緊<b className="text-ink">{hrange(x.w.from, x.w.to)}</b></>, step: true },
      { text: <>其餘 <b className="text-ink">22 個小時</b>沒人在刷，就交給<Link href={x.alert}>通知</Link></>, step: true },
    ],
    storeChartKeys: (x: RTView): Point[] => [{ text: <>每家門市頁面都有自己的圖表，用自己的時區（<Link href={x.storesHref}>{x.us ? "美國各州 Apple Store" : `${rtW(x)}的門市`}</Link>）：在 9 點才熱起來的地區，有家 8 點就補貨的門市，值得知道</>, step: true }],

    dayLead: (x: RTView) => {
      const { t, tracked, one } = x;
      return t.n > 0 && tracked === 1 ? (
        <b>{zs(`目前只追蹤了一天（${ymdZh(t.daily[t.daily.length - 1]?.date ?? t.since)}），確認補貨 ${n(t.n)} 次${one ? "" : `，${t.stores} 家門市`}。`)}</b>
      ) : t.n > 0 ? (
        <b>{zs(`${t.days === tracked ? `我們追蹤的每一天（${t.days} 天中的 ${t.days} 天）` : `自 ${longYmdZh(t.since)}起的 ${tracked} 天中有 ${t.days} 天`}都至少有一次確認補貨${t.peakWeekday != null ? `，${weekdayZh(t.peakWeekday)}是目前最忙的一天` : ""}。`)}</b>
      ) : (
        <b>{zs(`自 ${longYmdZh(t.since)}起，${rtW(x)}還沒有確認的補貨。`)}</b>
      );
    },
    daysTracked: "追蹤的天數中，至少補貨一次的天數",
    busiestDay: (x: RTView, day: DayRow) => `最忙的一天，${ymdZh(day.date)}${x.one ? "" : `，${day.stores} 家門市`}`,
    busiestDayNone: "最忙的一天",
    drop: (x: RTView, drop: { at: string; restocks: number }) => `家門市在同一個半小時內補貨（${zoneStamp(drop.at, x.c)}，${n(drop.restocks)} 個規格）：從外部看到的一波全國性釋出`,
    weekend: (x: RTView) => `落在週六或週日（${n(x.weekend)} 次）`,
    dayCaption: (x: RTView) => zs(`${rtW(x)} iPhone Duo 每日補貨${x.t.reports.length ? "；標示「回報」的列，是其他追蹤網站在我們開始追蹤之前公布的觀察，只供對照時間線" : ""}`),
    dayHead: { date: "日期", restocks: "補貨", stores: "門市", busiest: "最忙時段", source: "來源" },
    soFar: " · 到目前",
    reportedBy: (names: string[]) => <>{names.join("／")} 回報</>,
    dayKeys: (x: RTView, launch: string, resumed: string): Point[] => [
      { text: <><b className="text-ink">{ymdZh(launch)}</b>：上市日，第一批貨給線上訂單</> },
      { text: <><b className="text-ink">{ymdZh(resumed)}</b>：門市取貨預約重新開放{x.us ? "（MacRumors）" : ""}</> },
      x.t.reports.length
        ? { text: <>標示<b className="text-ink">回報</b>的列：{x.reportNames.join(" 和 ")} 的上市週觀察，從不計入</> }
        : { text: <>我們對{rtW(x)}每家門市的紀錄從 <b className="text-ink">{longYmdZh(x.t.since)}</b> 開始</> },
      ...(x.t.n > 0 && x.t.peakWeekday == null ? [{ text: <>最忙的星期：資料涵蓋滿 <b className="text-ink">{WEEKDAY_MIN_SPAN} 天</b>才會寫出（目前 {x.tracked} 天）</>, no: true }] : []),
      { text: <>看<b className="text-ink">門市</b>那一欄：同樣的補貨次數分散在更多門市，對你來說是更好的一天</>, step: true },
    ],

    whereLead: (x: RTView, hit: { name: string; restocks: number; stores: number; storesTotal: number }[], total: number) => (
      <b>{zs(`${hit[0].name}：自 ${ymdZh(x.t.since, false)}起，${hit[0].storesTotal} 家門市中有 ${hit[0].stores} 家補貨，共 ${n(hit[0].restocks)} 次${hit[1] ? `，其次是${hit[1].name}（${n(hit[1].restocks)} 次）` : ""}${hit[2] ? `和${hit[2].name}（${n(hit[2].restocks)} 次）` : ""}；${total} ${rtCl(x)}${rtUnit(x)}中有 ${hit.length} ${rtCl(x)}至少補貨一次${total - hit.length > 0 ? `，${total - hit.length} ${rtCl(x)}還沒有` : ""}。`)}</b>
    ),
    whereNone: (x: RTView) => <b>{zs(`${rtW(x)}還沒有任何${rtUnit(x)}出現確認的補貨；第一次出現後，表格就會開始累積。`)}</b>,
    regionCaption: (x: RTView) => zs(`${rtW(x)}各${rtUnit(x)}確認的 iPhone Duo 補貨，${ymdZh(x.t.since, false)}至今`),
    regionHead: (x: RTView) => [rtUnit(x), "補貨次數", "補過貨的門市", "上次補貨（當地時間）"],
    ofN: (a: number, b: number) => <>{b} 家中 {a} 家</>,
    storesCaption: (x: RTView) => zs(`${rtW(x)}最常補貨 iPhone Duo 的門市，${ymdZh(x.t.since, false)}至今`),
    storesHead: ["門市", "補貨次數", "天數", "通常在", "上次（當地時間）"],
    swaps: (x: RTView) => [
      { no: "補貨次數最多的那家，不管它在哪", yes: `在${x.pattern ? hh(x.w.from) : "上午"}前後、一小時內到得了的兩三家門市`, why: "到不了的補貨不算補貨；再忙的門市，一天裡也只有幾分鐘不是「無法取貨」。" },
      { no: "只盯一家，然後祈禱", yes: "每家都設通知，哪家先響就去哪家", why: "次數表能告訴你的，只是先往你的哪家門市衝。" },
    ],
    nearMe: "我附近現在有 Duo 的門市",

    configLead: (x: RTView, top: { label: string; restocks: number }, rarest: { label: string; restocks: number } | null) => (
      <b>{zs(`${top.label}：${n(x.t.n)} 次補貨中占 ${n(top.restocks)} 次（${pc(top.restocks / x.t.n)}）${rarest ? `；最少的是 ${rarest.label}，只有 ${n(rarest.restocks)} 次` : ""}。`)}</b>
    ),
    mostRestocked: (config: string) => zs(`${config}：最常補貨的規格`),
    versus: (a: string, bCount: number, b: string) => zs(`${a} 補貨次數（${b} 為 ${n(bCount)} 次）`),
    restocksOf: (a: string) => zs(`${a} 補貨次數`),
    byStorage: "依容量",
    byColour: "依顏色",
    configNone: (x: RTView) => <b>{zs(`${rtW(x)}還沒有任何規格出現確認的補貨；先列出 ${x.configs} 種規格，第一次補貨就有地方落腳。`)}</b>,
    configCaption: (x: RTView) => zs(`${rtW(x)}各規格確認的 iPhone Duo 補貨，${ymdZh(x.t.since, false)}至今`),
    configHead: ["規格", "補貨次數", "占比", "上次補貨（當地時間）"],
    configKeys: (x: RTView): Point[] => [
      { text: <>選規格這件事，<b className="text-ink">比選門市更重要</b></> },
      x.storageRatio != null
        ? { text: <>接受最常補貨的容量：機會大約是下一個容量的 <b className="text-ink">{x.storageRatio} 倍</b></> }
        : { text: <>接受最常補貨的容量：機會會<b className="text-ink">大幅</b>提高</> },
      { text: <><b className="text-ink">2TB</b>：比較適合直接下單宅配，然後等</>, no: true },
      { text: <>價格與現在有哪些現貨：<Link href="/which-iphone-duo-restocks-most">哪個 iPhone Duo 規格最常補貨？</Link></>, step: true },
    ],

    howLongLead: (x: RTView, sell: SelloutFacts) => <b>{zs(`${rtW(x)} ${n(sell.n)} 次賣完的補貨中，一半在 ${sell.medianSec} 秒內就沒了；${pc(sell.within2min)} 在 2 分鐘內、${pc(sell.within20min)} 在 20 分鐘內賣完。`)}</b>,
    secUnit: "秒",
    medianListing: "一般上架時間，從上架到賣完（中位數）",
    within2: "2 分鐘內賣完",
    within20: "20 分鐘內賣完",
    fastest: "量到最快的賣完",
    howLongNone: (x: RTView) => <b>{zs(`${rtW(x)}賣完的補貨還太少，${x.t.n > 0 ? "" : "暫時"}無法計算；滿 10 次我們才寫出這些數字，完整數據請看美國頁面。`)}</b>,
    howLongKeys: (x: RTView): Point[] => [
      { text: <>兩分鐘的空窗，靠的是<b className="text-ink">通知</b>，不是狂刷 apple.com</> },
      { text: <>本頁其他所有數字，都要從這個數字讀起</> },
      { text: <>每次補貨維持了幾秒，依規格與{rtRegion(x)}整理：<Link href="/iphone-duo-sell-out-times">iPhone Duo 補貨多快賣完？</Link></>, step: true },
    ],
    measured: "每個數字都是從「第一次看到該規格上架」的那次檢查，算到「看到它不見」的那次檢查，所以是上限；實際的上架時間更短。",

    unavailableLead: (x: RTView) => <b>{zs(`因為補貨是一閃而過，不是一種狀態：${x.one ? "一家門市" : `${n(x.stores)} 家門市`} × ${x.configs} 種規格 = ${rtW(x)}共有 ${n(x.pairs)} 個可能有貨的組合，而此刻${x.duoNow === 0 ? "沒有任何門市" : ` ${x.duoNow} 家門市`}上架 iPhone Duo。`)}</b>,
    pairs: "可能有貨的「門市 × 規格」組合",
    listingNow: "此刻上架 iPhone Duo 門市取貨",
    goneIn2: "的補貨在兩分鐘內賣完",
    last24: "過去 24 小時確認的補貨",
    unavailableKeys: (x: RTView, today: number): Point[] => [
      x.recent.restocks > 0
        ? { text: <>過去 24 小時：{zs(`${rtW(x)}有 ${x.recent.stores} 家門市、共`)}<b className="text-ink">確認補貨 {n(x.recent.restocks)} 次</b></> }
        : today > 0
          ? { text: <>今天：{rtW(x)}<b className="text-ink">確認補貨 {n(today)} 次</b></> }
          : { text: <>上面的每日表格，列出的是真正發生過的補貨</> },
      { text: <>每一次在 apple.com 上都只看得到<b className="text-ink">一兩分鐘</b></> },
      { text: <>上市第四天、第十四天「每家都無法取貨」，<b className="text-ink">不代表</b> Apple 停止供貨</>, no: true },
    ],
    unavailableLinks: { explained: "「目前無法取貨」是什麼意思", howToGet: "怎麼買到 iPhone Duo" },

    redditLead: (x: RTView) => <b><a href="https://www.reddit.com/r/applestore/" target="_blank" rel="noopener nofollow">r/applestore</a> 和 <a href="https://www.reddit.com/r/iphone/" target="_blank" rel="noopener nofollow">r/iphone</a> 上的經驗談大多很真誠，但只講一家店，而且隔天就過時；以下是最常見的四種說法，對照{zs(`${rtW(x)} ${n(x.t.n)} 次確認的補貨。`)}</b>,
    redditCaption: "Reddit 上常見的 iPhone Duo 補貨說法，對照 PickupChecker 確認的補貨",
    redditHead: ["說法", "數據怎麼說"],
    claims: (x: RTView): { claim: string; answer: ReactNode }[] => {
      const { t, w, tracked, recent } = x;
      return [
        { claim: "「門市半夜補貨，凌晨 3 點去看。」", answer: t.n > 0 ? <>{pc(hourShare(t.byHour, 0, 6))} 的補貨落在當地時間午夜到清晨 6 點；{pc(w.share)} 落在{hrange(w.from, w.to)}。</> : "還沒有補貨紀錄可以驗證。" },
        { claim: "「Apple 只在固定某一天補貨。」", answer: t.n > 0 ? (t.peakWeekday != null ? <>目前最忙的是{weekdayZh(t.peakWeekday)}（{n(t.n)} 次中的 {n(t.byWeekday[t.peakWeekday])} 次），但 {tracked} 天中有 {t.days} 天都有補貨。</> : <>我們追蹤的 {tracked} 天中，有 {t.days} 天有補貨{t.days === tracked ? "，沒有一天空白" : ""}；資料涵蓋滿 {WEEKDAY_MIN_SPAN} 天才會說哪一天最忙。</>) : "還沒有補貨紀錄可以驗證。" },
        { claim: "「打電話問門市，貨車什麼時候到。」", answer: "Apple 不公布補貨時間表；出現在 apple.com 上的，是線上釋出的門市取貨庫存，門市和大家同一時間才看到。" },
        { claim: "「顯示無法取貨，就是永遠賣完了。」", answer: recent.restocks > 0 ? <>過去 24 小時 {recent.stores} 家門市確認補貨 {n(recent.restocks)} 次，證明不是；每一次都在幾分鐘內又變回「無法取貨」。</> : t.n > 0 ? <>{zs(`自 ${ymdZh(t.since, false)}起確認的 ${n(t.n)} 次補貨證明不是；每一次都在幾分鐘內又變回「無法取貨」。`)}</> : "目前還沒有資料可以驗證。" },
      ];
    },
    redditKeys: (): Point[] => [
      { text: <>沒有<b className="text-ink">數據</b>的時候，大家只能靠傳言；這頁就是數據，免費看</> },
      { text: <>Reddit 說對的地方：<b className="text-ink">結帳技巧</b>——先登入、備好 Apple Pay（<Link href="/how-to-grab-an-iphone-duo-restock">我們的 20 秒版本</Link>）</> },
    ],

    methodLead: <b>當 apple.com 在某家門市上架了原本沒有的規格供門市取貨，而且兩次檢查結果一致，我們才算一次補貨。</b>,
    methodKeys: (x: RTView): Point[] => [
      { text: <>{zs(x.one ? `${rtW(x)}唯一的 Apple 直營店` : `${rtW(x)}每家 Apple 直營店`)}每 <b className="text-ink">15 秒</b>檢查一次；有通知指向的門市每 <b className="text-ink">5 秒</b></> },
      { text: <>其他追蹤網站公布的檢查間隔是 <b className="text-ink">8 秒到 15 分鐘</b>；我們只比較公布的數字</> },
      { text: <>第一次出現「有貨」時，會在<b className="text-ink">大約一秒後</b>再問一次才算數</> },
      { text: <>上架消失，會在<b className="text-ink">下一輪</b>確認</> },
      { text: <>第一次看到某家門市、請求失敗或逾時：<b className="text-ink">絕不</b>算補貨，也絕不算「沒貨」</>, no: true },
      { text: <>時間與日期一律用各門市的<b className="text-ink">當地時間</b>；「一波」= 跨時區的同一個半小時</> },
      { text: <>其他追蹤網站的回報{x.t.reports.length ? `（${x.reportNames.join("、")}）` : ""}：單獨標示的列，<b className="text-ink">從不計入總數</b></> },
      { text: <>大約每 5 分鐘更新；<Link href={x.logHref}>補貨紀錄</Link>本身是即時的</>, step: true },
    ],
    quote: "歡迎引用這些數字，請附上本頁連結。PickupChecker 是獨立網站，與 Apple 沒有任何關係；我們讀取的是任何人在 apple.com 上都看得到的門市取貨供應情況，只是頻繁得多。",
    alertIn: (x: RTView) => <>{zs(x.one ? "設定 iPhone Duo 補貨通知" : `設定${rtW(x)}的 iPhone Duo 補貨通知`)}</>,

    related: "其他 iPhone Duo 問題",
    sameData: "用同一份數據回答",
    questions: {
      sellOut: "補貨多快賣完？",
      alerts: "最快收到通知的方法",
      howToGet: "到底怎麼買到",
      whichConfig: "哪個規格最常補貨",
      nearMe: "我附近現在有貨的門市",
      unavailable: "「無法取貨」是什麼意思",
    },
    otherCountries: ((us: boolean): string => (us ? "其他國家的同一頁" : "其他國家／地區")) as Dict["views"]["restockTimes"]["otherCountries"],
    place: {
      byCity: "依城市",
      storesLive: (x: RTView) => zs(`${rtW(x)}的 Apple 直營店即時庫存`),
      countryPage: (c: Country) => zs(`${C(c)} iPhone Duo 補貨時段`),
      sourcesWhere: (x: RTView) => zs(`${rtW(x)}全部 ${x.stores} 家 Apple 直營店`),
    },
    faqTitle: "常見問題",
  },
};
