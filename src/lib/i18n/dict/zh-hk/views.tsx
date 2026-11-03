/**
 * 繁體中文（香港）: views — product × place pages, the restock log, the live map, the iPhone Duo restock-times page
 * and the store index. `c: Country` is English data: named here with cn(); Store / Place objects are named with
 * places.ts; English product names get Apple's Chinese colour names (zhCfg). Only 15 s and 5 s intervals; no refunds.
 */
import type { ReactNode } from "react";
import type { Dict } from "../en";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import type { Point } from "@/components/ui/Viz";
import type { Faq } from "@/lib/content/types";
import { catalogFor, stateCodeOf, storePath, type Store } from "@/lib/apple/catalog";
import { COUNTRIES, type Country, type CountryCode } from "@/lib/apple/countries";
import { faq as placeFaq, fmtDuration, listWords, peakOf, type FaqContext, type FaqItem } from "@/lib/seo/enrich";
import type { Place, Product } from "@/lib/seo/products";
import type { StoreLine } from "@/lib/seo/productData";
import type { PlaceStats, RestockStats } from "@/lib/stock/queries";
import { hourShare, type DayRow, type SelloutFacts } from "@/lib/content/restockTimes";
import { PATTERN_MIN, PATTERN_MIN_DAYS, WEEKDAY_MIN_SPAN, localStamp } from "@/lib/content/siteFacts";
import { SPEED } from "@/lib/plans";
import { distance, price } from "@/lib/i18n/format";
import { cityLabel, colorLabel, regionLabel } from "@/lib/i18n/places";
import type { RestockTimesMeta, RestockTimesView } from "../en/views";
import { HK_TITLE, L, WEEK, apple, city, cityNoun, cn, cnOf, dayFromEn, fitW, hr, hrFromEn, longYmd, n, rn, rng, shop, storeHead, taxNoteZh, ymd, zhCfg, zhPlace, zoneStampZh } from "./common";

const lw = (items: string[], max = 6) => listWords(items, max, L);
const ccOf = (p: { country?: CountryCode }): CountryCode => p.country ?? "us";
/** A place of the product tree in Chinese: "香港", "尖沙咀", "Apple Canton Road（廣東道）". */
function placeZh(place: Place): string {
  const cc = ccOf(place);
  if (place.level === "country") return cn(cc);
  if (place.level === "state") return regionLabel(cc, place.state!, L);
  if (place.level === "city") return cityLabel(cc, place.city!, L);
  return apple(place.store!);
}
const dist = (place: Place, miles: number) => distance(L, ccOf(place), miles);

/** Whole-percent shares; under half a percent "<1%". */
const pct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : `${Math.round(x * 100)}%`);
const regionWordOf = (x: { us: boolean; c: Country }) => (x.us ? "州" : x.c.regionNoun ? rn(x.c) : "地區");
const yet = (x: RestockTimesMeta) => (x.t.n > 0 ? "" : "仍");

/* ---------------------------------------------------------------- product × place */

function productTitle(product: Product, place: Place, inStock: number): string {
  const cc = ccOf(place);
  const name = zhCfg(product.name);
  const short = zhCfg(product.short);
  const k = place.stores.length;
  if (place.level === "country" && cc !== "us") return fitW([...(inStock > 0 ? [`${name}：${cn(cc)} ${n(inStock)} 間 Apple Store 有現貨`] : []), `${name} ${cn(cc)}取貨現貨（即時）`, `${short} ${cn(cc)}取貨現貨`, `${short} 取貨現貨`]);
  if (place.level === "country") return fitW([...(inStock > 0 ? [`${name}：現有 ${n(inStock)} 間 Apple Store 有貨`] : []), `${name} 店舖取貨即時現貨`, `${name} 取貨現貨`, `${short} 取貨現貨`]);
  if (place.level === "store") {
    const s = place.store!;
    const now = inStock > 0 ? "現在有貨" : "取貨現貨";
    const head = HK_TITLE[s.storeNumber]?.[0] ?? apple(s);
    return fitW([`${head} ${name}：${now}`, `${head} ${short}：${now}`, `${head} ${short} 現貨`, `${shop(s)} ${short} 現貨`, `${short} 現貨 · ${shop(s)}`]);
  }
  const w = placeZh(place);
  return fitW([`${w} ${name} 現貨：${n(k)} 間中 ${n(inStock)} 間有貨`, `${w} ${name}：取貨現貨`, `${w} ${short} 現貨`, `${short} 現貨（${w}）`]);
}

function productDescription(product: Product, place: Place, inStock: number, stats: PlaceStats): string {
  const cc = ccOf(place);
  const name = zhCfg(product.name);
  const week = `本週補貨 ${n(stats.week)} 次`;
  if (place.level === "store") {
    const s = place.store!;
    const loc = cc === "us" ? `${s.city} ${stateCodeOf(s)}` : city(s);
    const head = HK_TITLE[s.storeNumber] ? storeHead(s) : `${apple(s)} · ${loc}`;
    return fitW([
      `${head}的 ${name} 取貨現貨：${inStock > 0 ? "現在有貨" : "現時沒有貨"}，${week}。即時狀態、補貨時間及提醒。`,
      `${apple(s)} 的 ${name}：${inStock > 0 ? "現在有貨" : "現時沒有貨"}，${week}。即時狀態及提醒。`,
    ], 155);
  }
  const where = place.level === "country" ? `${cn(cc)} Apple Store` : `${placeZh(place)} Apple Store`;
  return fitW([
    `${name} 取貨現貨：${where}共 ${n(place.stores.length)} 間，現有 ${n(inStock)} 間有貨，${week}。逐店即時現貨、補貨時間及提醒。`,
    `${name}：${n(place.stores.length)} 間${where}中 ${n(inStock)} 間現在有貨，${week}。逐店即時現貨及提醒。`,
  ], 155);
}

function productFaq(product: Product, place: Place, lines: StoreLine[], stats: PlaceStats, clock: RestockStats, nearest: { name: string; city: string; distance: number } | null): FaqItem[] {
  const out: FaqItem[] = [];
  const at = placeZh(place);
  const name = zhCfg(product.name);
  const near = nearest ? `；最近有貨的是${nearest.name.includes(nearest.city) ? "" : `${nearest.city}的`} Apple ${nearest.name}，約 ${dist(place, nearest.distance)}` : "";
  const inStock = lines.filter((l) => l.available.length > 0);
  if (place.level === "store") {
    const l = lines[0];
    out.push({
      q: `${at}有 ${name} 現貨嗎？`,
      a: l && l.available.length > 0
        ? `有${product.parts.length > 1 ? `：${lw(l.available.map((i) => `${i.storage} ${colorLabel(i.color, L)}`), 4)}` : ""}（最近一次檢查）。`
        : `最近一次檢查時沒有${near}。`,
    });
  } else {
    out.push({
      q: `${at}哪幾間 Apple Store 有 ${name}？`,
      a: inStock.length === 0 ? `最近一次檢查時沒有${near}。` : `最近一次檢查有 ${n(inStock.length)} 間：${lw(inStock.map((l) => apple(l.store)), 4)}。`,
    });
  }
  const peak = peakOf(clock, L);
  out.push({
    q: `${name} 在${at}多久補貨一次？`,
    a: stats.month === 0 ? `${at}過去 ${n(stats.days)} 日未有補貨記錄。` : `過去 ${n(stats.days)} 日補貨 ${n(stats.month)} 次，本週 ${n(stats.week)} 次${peak ? `，大多在當地時間${peak.hour}左右` : ""}。`,
  });
  if (stats.medianMs != null) out.push({ q: `${name} 在${at}有貨能維持多久？`, a: `約 ${fmtDuration(stats.medianMs, L)}（中位數）便再次售罄。` });
  return out;
}

function priceLabel(product: Product): string {
  const cc = ccOf(product);
  const prices = catalogFor(product.model, cc).filter((c) => product.parts.includes(c.partNumber)).map((c) => c.price);
  const lo = Math.min(...prices), hi = Math.max(...prices);
  const f = (v: number) => price(L, COUNTRIES[cc], v);
  return lo === hi ? f(lo) : `${f(lo)}–${f(hi)}`;
}

/* ---------------------------------------------------------------- views */

export const views: Dict["views"] = {
  common: {
    inCountry: (c: Country) => cnOf(c),
    liveMap: "即時地圖",
    restockLog: "補貨記錄",
    alertMe: "提醒我",
    lastDays: (days: number) => <>過去 {n(days)} 日</>,
    since: "2026年11月2日",
    sourcesWhere: (k: number, c: Country) => (k === 1 ? `${cnOf(c)}唯一一間 Apple Store` : `${cnOf(c)}全部 ${n(k)} 間 Apple Store`),
    checker: (c: Country) => `${cnOf(c)} iPhone 現貨查詢`,
    appleStoresIn: (c: Country) => `${cnOf(c)} Apple Store`,
    storesWithIt: "有貨分店",
    more: "更多",
  },

  product: {
    title: productTitle,
    description: productDescription,
    faq: productFaq,
    priceLabel,
    inPlace: (name: string) => name,
    h1Country: (model: string, c: Country) => `${zhCfg(model)} ${cnOf(c)}取貨現貨`,
    h1Place: (model: string, where: string) => `${where}的 ${zhCfg(model)} 現貨`,
    inStockNow: "現時有貨",
    yes: "有",
    no: "沒有",
    pickup: "取貨",
    configurations: "款式",
    ofStores: (k: number) => `共 ${n(k)} 間分店`,
    restocks24h: "24 小時補貨",
    restocksHint: (week: number, month: number, days: number) => `7 日 ${n(week)} 次 · ${n(days)} 日 ${n(month)} 次`,
    sellOuts: (days: number) => `${n(days)} 日售罄`,
    stays: (ms: number) => `上架約 ${fmtDuration(ms, L)}`,
    noPairs: "暫未有數據",
    lastRestock: "最近補貨",
    noneYet: "暫未有",
    thisConfig: "此款式",
    inDays: (days: number) => `過去 ${n(days)} 日`,
    notInStockNow: "現時沒有貨",
    configsInStock: (k: number, of: number) => <span>{n(of)} 款中 <b className="text-ink">{n(k)}</b> 款有貨</span>,
    inStockAt: (k: number, of: number) => <span>{n(of)} 間分店中 <b className="text-ink">{n(k)}</b> 間有貨</span>,
    checked: (live: ReactNode, p: string, tax: string) => <>{live}檢查 · {p}{tax}</>,
    taxNote: (c: Country) => taxNoteZh(c),
    beforeTax: "未連稅",
    buyOnApple: "在 apple.com 購買",
    allStoresIn: (c: Country) => `${cnOf(c)}全部分店`,
    everyIphoneHere: "本店所有 iPhone",
    everyIphone: (where: string) => `${where}所有 iPhone`,
    panel: (model: string, where: string | null) => `${zhCfg(model)}${where ? ` · ${where}` : ""}：剔選款式及分店`,
    unitConfigs: "款式",
    unitStores: "分店",
    otherConfigsHere: "本店其他款式",
    byStorageColor: "按容量及顏色",
    nearestStores: "最近的分店",
    closest: (link: ReactNode, d: string) => <>最近有貨：{link} · {d}</>,
    storeCity: (store: string, c: string) => <>{store}，{c}</>,
    mostRecentlyInStock: "最近曾有貨",
    storesWithItNow: "現時有貨的分店",
    storesIn: (where: string) => `${where}的分店`,
    colStatus: "狀態",
    colConfigs: "有貨款式",
    noStoreHasIt: "現時沒有分店有貨。",
    noStoreHereHasIt: "這裏現時沒有分店有貨。",
    moreStores: (k: number) => <>還有 {n(k)} 間分店——按地區查看。</>,
    byRegion: (c: Country) => `按${rn(c)}`,
    byCity: "按地區",
    nearbyStores: "附近分店",
    latestChanges: "最新變化",
    nothingLogged: "暫未有記錄。",
    whenRestocks: "幾時補貨",
    howFast: "幾快售罄",
    restocksByConfig: "各款式補貨次數",
    faqTitleCountry: (model: string, c: Country) => `${zhCfg(model)} ${cnOf(c)}：常見問題`,
    faqTitle: (model: string, where: string) => `${where}的 ${zhCfg(model)}：常見問題`,
    buySource: (model: string, c: Country) => `Apple：購買 ${zhCfg(model)}（${cnOf(c)}）`,
    nearby: "附近",
    otherRegions: (c: Country) => `其他${rn(c)}`,
    elsewhereIn: (region: string) => `${region}其他地方`,
    everyAppleStoreIn: (c: Country) => `${cnOf(c)}每一間 Apple Store`,
    across: (model: string, c: Country) => `${cnOf(c)}各分店的 ${zhCfg(model)}`,
    itemList: (model: string, where: string) => `${where}的 ${zhCfg(model)}`,
    nearLead: (c: Country, model: string, inStock: number, k: number, have: { store: string; city: string; configs: number }[]) =>
      inStock === 0
        ? `${cnOf(c)}現時沒有 Apple Store 開放 ${model} 取貨，所以「附近哪裏有貨」要看哪間分店先補貨。在你去得到的分店設提醒，任何一間一上架，推送幾秒內送到。`
        : `${n(k)} 間分店中有 ${n(inStock)} 間現在有 ${model}：${lw(have.slice(0, 5).map((l) => `${l.store}${l.store.includes(l.city) ? "" : ` · ${l.city}`} · ${n(l.configs)} 款`), 5)}。`,
    nearHead: (c: Country) => [rn(c), "現時有貨分店"],
    nearCaption: (c: Country, model: string) => `各${rn(c)}的 ${model} 取貨現貨（最近一次檢查）`,
    nearMe: (_c: Country, model: string, alert: string) => `想按你所在的位置排列每間分店，打開本頁的提醒設定，按「我附近」：距離按行車路線估算（公里），每間分店都附路線連結。[設定 ${model} 提醒](${alert})。`,
    modelFaq: (c: Country, model: string, low: number, high: number, inStock: number): { price: FaqItem; reserve: FaqItem } => {
      const money = (v: number) => price(L, c, v);
      return {
        price: { q: `${model} ${cnOf(c)}價錢是多少？`, a: `apple.com 售 ${money(low)} 至 ${money(high)}（${taxNoteZh(c)}），視乎容量。` },
        reserve: { q: `在${cnOf(c)}可以預留 ${model} 到店提取嗎？`, a: `不可以；分店一上架某款配置，你要在 apple.com 選擇店舖提取並付款，Apple 才會在你揀選的時段為你保留。${inStock === 0 ? "現時沒有分店有貨，提醒就是搶先一步的方法。" : ""}` },
      };
    },
  },

  restocks: {
    metaTitle: (c: Country, k: number) => `${cnOf(c)} iPhone 補貨記錄：${k === 1 ? "Apple Store" : `全部 ${n(k)} 間 Apple Store`}，即時更新`,
    metaDescription: (c: Country, k: number) => `${cnOf(c)}${k === 1 ? " Apple Store " : "各間 Apple Store "}每一次 iPhone Duo、18 Pro 及 Pro Max 店舖取貨補貨，附準確時間、款式及地圖。`,
    h1: (c: Country) => `${cnOf(c)}補貨記錄`,
    summary: (day: number, week: number, model?: string, region?: string) => <>24 小時內補貨 {n(day)} 次 · 本週 {n(week)} 次{model ? ` · ${model}` : ""}{region ? ` · ${region}` : ""}。時間以你的時區顯示。</>,
    allModels: "所有型號",
    restocks: "補貨",
    withSoldOut: "補貨 + 售罄",
    regionLabel: (c: Country) => rn(c),
    allRegions: (c: Country) => `全部${rn(c)}`,
    filter: "篩選",
    page: (k: number) => <>第 {n(k)} 頁</>,
    newer: "← 較新",
    older: "較舊 →",
    getAlerts: "設定提醒",
    byPlace: "按地點查看補貨",
    byRegion: (c: Country) => `按${rn(c)}`,
    datasetName: (c: Country) => `${cnOf(c)} Apple Store iPhone 取貨補貨記錄`,
    datasetDescription: (c: Country) => `${c.cc === "us" ? "美國全部 269 間 Apple Store" : `${cnOf(c)}各間 Apple Store`}每一次已確認的 iPhone Duo、iPhone 18 Pro 及 iPhone 18 Pro Max 店舖取貨補貨及售罄，附分店、準確款式及時間。apple.com 兩次回應一致才記錄為補貨；每 15 秒檢查一次（有提醒的分店每 5 秒）。`,
    datasetMeasured: ["Apple Store", "iPhone 型號、容量及顏色", "補貨時間", "售罄時間"],
  },

  map: {
    metaTitle: (c: Country, k: number) => `iPhone Duo 取貨現貨地圖：${cnOf(c)}${k === 1 ? " Apple Store " : "每間 Apple Store "}即時更新`,
    metaDescription: (c: Country, k: number) => `${cnOf(c)}${k === 1 ? " Apple Store " : `全部 ${n(k)} 間 Apple Store `}即時地圖：iPhone Duo、18 Pro 及 Pro Max 現時的店舖取貨現貨，可按容量及顏色查看。`,
    country: (c: Country) => ({ name: cnOf(c), inName: cnOf(c), regionNoun: c.regionNoun, regionNounPlural: c.regionNounPlural }),
    everyStore: "每一間分店",
    storeCity: (store: string, c: string) => `${store} · ${c}`,
  },

  storesIndex: {
    metaDescription: (c: Country, k: number, regions: number, cities: number, duo: number, max: number) => {
      const by = c.regionNoun && regions > 1 ? `，按${rn(c)}及城市排列` : cities > 1 ? `，按${cityNoun(c.cc)}排列` : "";
      return `${cnOf(c)}全部 ${n(k)} 間 Apple Store${by}，附 iPhone Duo、18 Pro 及 Pro Max 即時取貨現貨：現有 ${n(duo)} 間有 Duo，${n(max)} 間有 Pro Max。`;
    },
    countAnswer: (k: number, spread: string, top: { name: string; count: number }[]) => `${n(k)} 間，${spread}${top.length ? `。${top[0].name}最多（${n(top[0].count)} 間）${top[1] ? `，其次是${top[1].name}（${n(top[1].count)} 間）` : ""}` : ""}。`,
    howMany: (c: Country) => <>{cnOf(c)}有幾多間 Apple Store？</>,
    duoNow: (c: Country, k: number, have: Store[]): FaqItem => ({
      q: `${cnOf(c)}哪間 Apple Store 現在有 iPhone Duo？`,
      a: have.length === 0 ? `最近一次檢查時，${n(k)} 間都沒有。任何一間一上架，本頁和地圖會即時更新，提醒會最先通知你。` : `最近一次檢查，${n(k)} 間中有 ${n(have.length)} 間：${have.slice(0, 6).map((x) => apple(x)).join("、")}${have.length > 6 ? "等" : ""}。`,
    }),
    faq: (ctx: FaqContext) => {
      const cc = ctx.stores[0]?.country ?? "us";
      const peak = ctx.peak ? { hour: hrFromEn(ctx.peak.hour), day: ctx.peak.day ? dayFromEn(ctx.peak.day) : null, total: ctx.peak.total } : ctx.peak;
      return placeFaq({ ...ctx, place: zhPlace(cc, ctx.place), peak, omit: [...(ctx.omit ?? []), "count", "stock", "lasts"] }, L);
    },
    duoBlock: (alert: string) => `想買到，最快的方法是在你去得到的分店設提醒：[設定 iPhone Duo 提醒](${alert})。每間分店 × 每款指定配置算一個提醒，分店一上架，推送幾秒內送到。`,
    intro: (c: Country, k: number, spread: string, now: { duo: number; max: number; pro: number }, tax: string) => `${cnOf(c)}共有 **${n(k)} 間 Apple Store**，${spread}。現時其中 **${n(now.duo)}** 間可取貨 iPhone Duo，**${n(now.max)}** 間有 iPhone 18 Pro Max，**${n(now.pro)}** 間有 18 Pro。${tax}`,
    crumb: "Apple Store",
    panel: (c: Country) => `揀選手機，再剔選${cnOf(c)}你去得到的分店`,
    matrixLabel: "各分店現貨",
    matrixH2: (c: Country) => <>{cnOf(c)}每間 Apple Store 的現貨</>,
    matrixHint: "現時有貨／追蹤中的款式，按型號。",
    topCaption: (c: Country) => <>Apple Store 最多的{rn(c)}（根據 Apple 零售店列表，即本站追蹤範圍）</>,
    regionHead: (c: Country) => rn(c),
    colStores: "Apple Store",
    colCities: "城市",
    locationsBy: (c: Country) => `按${rn(c)}查看 Apple Store 位置`,
    locationsIn: (c: Country) => `${cnOf(c)} Apple Store 位置`,
    storeCount: (k: number) => <>{n(k)} 間分店</>,
    storeCountAll: (k: number) => <>{n(k)} 間分店</>,
    whenRestock: (c: Country) => <>{cnOf(c)}的分店幾時補貨？</>,
    howFast: (c: Country) => <>{cnOf(c)}的補貨幾快售罄？</>,
    faqTitle: (c: Country) => `${cnOf(c)} Apple Store：常見問題`,
    getApp: "安裝 App",
    howItWorks: "運作原理",
    pricing: "收費",
  },

  restockTimes: {
    fmt: {
      n,
      pct,
      date: (d: string, weekday = true) => ymd(d, weekday),
      longDate: longYmd,
      zoneStamp: (iso: string, c: Country) => zoneStampZh(iso, c.cc),
      local: (iso: string, store: Pick<Store, "storeNumber" | "country" | "timeZone" | "state">) => localStamp(iso, store, L),
      hour: (h: number) => hr(h),
      range: (from: number, to: number) => rng(from, to),
      weekday: (d: number) => WEEK[d],
      store: (s: Store) => apple(s),
      storeWithPlace: (s: Store) => { const a = apple(s); const c = city(s); return a.includes(c) ? a : `${a} · ${c}`; },
    },
    title: (c: Country) => `iPhone Duo 幾時補貨？${cnOf(c)} Apple Store 補貨時間`,
    metaDescription: (x: RestockTimesMeta) => {
      const { c, t, w, pattern } = x;
      const rw = c.cc === "us" ? "州" : c.regionNoun ? rn(c) : null;
      /** "按鐘點、日子、分店及款式" from the parts that apply. */
      const by = (...parts: (string | null)[]) => { const p = parts.filter((x): x is string => Boolean(x)); return `按${p.slice(0, -1).join("、")}及${p[p.length - 1]}`; };
      const since = ymd(t.since, false);
      const w2 = cnOf(c);
      return t.n > 0 && pattern
        ? fitW([
          `自${since}起，${w2} Apple Store 共補貨 iPhone Duo ${n(t.n)} 次：${pct(w.share)} 落在當地時間${rng(w.from, w.to)}${t.sellout ? `，${pct(t.sellout.within2min)} 在 2 分鐘內售罄` : ""}。${by("鐘點", "日子", rw, "分店", "款式")}列表。`,
          `自${since}起，${w2} Apple Store 共補貨 iPhone Duo ${n(t.n)} 次：${pct(w.share)} 落在當地時間${rng(w.from, w.to)}。${by("鐘點", "日子", rw, "款式")}列表。`,
          `${w2} iPhone Duo 補貨時間：自${since}起補貨 ${n(t.n)} 次，${by("鐘點", "日子", rw, "款式")}統計。`,
        ], 158)
        : t.n > 0
          ? fitW([
            `自${since}起，${w2} Apple Store 共確認 ${n(t.n)} 次 iPhone Duo 補貨，每 ${SPEED.checkSec} 秒檢查一次：${by("當地鐘點", "日子", rw, "分店", "款式")}統計，並列出每次維持多久。`,
            `${w2} iPhone Duo 補貨時間：自${since}起確認補貨 ${n(t.n)} 次，${by("鐘點", "日子", rw, "款式")}統計。`,
          ], 158)
          : `${w2} Apple Store 幾時補貨 iPhone Duo？來自 PickupChecker 自${longYmd(t.since)}起每 ${SPEED.checkSec} 秒一次的檢查：逐小時、逐日、按分店及款式統計。`;
    },
    h1: (x: RestockTimesView) => x.t.unknown
      ? `Apple 幾時在${cnOf(x.c)}補貨 iPhone Duo？`
      : x.t.n > 0
        ? `Apple 仍有在${cnOf(x.c)}補貨 iPhone Duo 嗎？有——以下是逐小時的時間`
        : `Apple 有在${cnOf(x.c)}補貨 iPhone Duo 嗎？按我們的檢查，暫時未有——以下是我們留意的數據`,
    intro: (x: RestockTimesView) => {
      const { t, one, tracked, pattern, w } = x;
      const where = cnOf(x.c);
      return t.unknown ? (
        <>暫時未能讀取我們的補貨記錄；{where}的分店仍然每 {SPEED.checkSec} 秒檢查一次，本頁下次載入時會顯示數字。</>
      ) : t.n > 0 ? (
        <>
          <b className="text-ink">有。</b>{one ? `${where}的 Apple Store ` : `${where}各間 Apple Store `}自{longYmd(t.since)}起已補貨 iPhone Duo <b className="text-ink">{n(t.n)} 次</b>{tracked > 1 ? <>，{n(tracked)} 日之中有 {n(t.days)} 日有補貨</> : <>（目前只追蹤了一日）</>}
          {pattern && <>，<b className="text-ink">其中 {pct(w.share)} 落在分店當地時間{rng(w.from, w.to)}</b></>}。
        </>
      ) : (
        <>
          <b className="text-ink">按我們的檢查，暫時未有。</b>自{longYmd(t.since)}起，PickupChecker 每 {SPEED.checkSec} 秒檢查一次{one ? `${where}的 Apple Store` : `${where}全部 ${n(x.stores)} 間 Apple Store`}，仍未確認任何一次 iPhone Duo 取貨補貨。
        </>
      );
    },
    hero: {
      restocks: (x: RestockTimesView) => `自${ymd(x.t.since, false)}起已確認的補貨`,
      window: (x: RestockTimesView) => `落在${rng(x.w.from, x.w.to)}（分店當地時間）`,
      days: "至少有一次補貨的日子",
      // English infers a literal return type here; the cast keeps the same signature.
      now: ((one: boolean): string => (one ? "現時有貨可取（1 = 有）" : "間分店現時有貨可取")) as Dict["views"]["restockTimes"]["hero"]["now"],
      today: (x: RestockTimesView, today: DayRow) => `今日 ${ymd(today.date)}${x.one ? "" : ` · ${n(today.stores)} 間分店`} · 暫計`,
      weekday: "目前最多補貨的星期",
    },
    heroPoints: (x: RestockTimesView, latest: { config: string; store: Store; at: string } | null): Point[] => [
      ...(latest ? [{ text: <>最近一次：<b className="text-ink">{latest.config}</b>{x.one ? null : <>，<Link href={storePath(latest.store)} className="underline underline-offset-2">{apple(latest.store)}</Link></>}，當地時間 {localStamp(latest.at, latest.store, L)}</> }] : []),
      ...(x.t.peakWeekday != null ? [{ text: <>最常在<b className="text-ink">{WEEK[x.t.peakWeekday]}</b></> }] : []),
      { text: <>Apple <b className="text-ink">不會公布補貨時間表</b>；這些是我們自己確認的檢查結果，約每 5 分鐘更新</>, no: true },
    ],
    emptyPoints: (x: RestockTimesView): Point[] => [
      { text: <>現時 <b className="text-ink">{n(x.stores)} 間中 {n(x.duoNow)} 間</b>有貨可取</> },
      { text: <>下面的表格會由第一次確認補貨開始填上</>, step: true },
      { text: <>數據最多的鐘點及星期規律：<Link href="/iphone-duo-restock-times" className="underline underline-offset-2">美國版頁面</Link></>, step: true },
    ],
    setUpAlert: "設定 iPhone Duo 提醒",
    logLive: "即時補貨記錄",
    onThisPage: "本頁內容",
    nav: (x: RestockTimesView): Record<string, string> => ({
      "time-of-day": "鐘點",
      "day-by-day": "逐日",
      where: `按${regionWordOf(x)}`,
      configuration: "款式",
      "how-long": "維持多久",
      unavailable: "為何沒有貨",
      reddit: "Reddit 傳聞 vs 數據",
      method: "計算方法",
    }),
    h2: (x: RestockTimesView): Record<string, string> => ({
      "time-of-day": `${cnOf(x.c)}的 iPhone Duo 通常在甚麼時間補貨？`,
      "day-by-day": `Apple 哪幾日在${cnOf(x.c)}補貨 iPhone Duo？`,
      where: `${cnOf(x.c)}哪間 Apple Store 補貨 iPhone Duo 最多？`,
      configuration: `${cnOf(x.c)}哪款 iPhone Duo 補貨最多？`,
      "how-long": `${cnOf(x.c)}的 iPhone Duo 補貨能維持多久？`,
      unavailable: "為何每間 Apple Store 都顯示沒有貨？",
      reddit: "Reddit 上對 iPhone Duo 補貨的說法——與數據的對照",
      method: "PickupChecker 怎樣計算一次補貨？",
    }),
    faq: (x: RestockTimesView): Faq[] => {
      const { t, w, pattern, sell, us, weekend, tracked } = x;
      const where = cnOf(x.c);
      const window = rng(w.from, w.to);
      return [
        { q: `Apple 幾時在${where}補貨 iPhone Duo？`, a: t.n > 0 && pattern
          ? `${w.from < 12 ? "多數在早上：" : ""}自${longYmd(t.since)}起確認的 ${n(t.n)} 次補貨中，${pct(w.share)} 落在分店當地時間${window}，${pct(hourShare(t.byHour, 8, 12))} 在上午 8 點至中午 12 點之間。Apple 不會公布時間表；這是 PickupChecker 觀察到的規律，約每 5 分鐘更新。`
          : `Apple 不會公布時間表；PickupChecker 自${longYmd(t.since)}起在${where}記錄了 ${n(t.n)} 次已確認補貨${t.days ? `，分佈在 ${n(t.days)} 日` : ""}。要有 ${PATTERN_MIN} 次補貨、分佈在 ${PATTERN_MIN_DAYS} 個不同日子，才會指出慣常鐘點；本頁會自動更新。` },
        { q: `${us ? "" : `${where}的 `}Apple 週末會補貨 iPhone Duo 嗎？`, a: t.n > 0
          ? `${weekend > 0 ? "目前為止會" : "我們的數據暫時未見"}：${n(t.n)} 次補貨中有 ${n(weekend)} 次落在星期六或星期日（${pct(weekend / t.n)}）。${t.peakWeekday != null ? `${WEEK[t.peakWeekday]}是補貨最多的一日。` : `數據要橫跨 ${WEEKDAY_MIN_SPAN} 日才會指出哪一日最多；我們目前有 ${n(tracked)} 日。`}`
          : `${where}暫未有週末數據；本頁的逐日表格會隨確認的補貨填上。` },
        { q: "應該幾點開始留意？", a: t.n > 0 && pattern
          ? `如果自己手動查，由當地時間${hr(w.from)}起，在 apple.com 揀好店舖提取等候；這兩小時佔了 ${pct(w.share)} 的補貨。一般補貨${sell ? `在 ${n(sell.medianSec)} 秒內（中位數）便售罄` : "只維持約一分鐘"}，所以每 ${SPEED.fastSec} 秒檢查一次的提醒（[提醒怎樣運作](/iphone-duo-stock-alerts)）做得到手動重新整理做不到的事。`
          : `在${where}的規律清楚之前，讓提醒替你留意：你揀選的分店每 ${SPEED.fastSec} 秒檢查一次，全日無休（[提醒怎樣運作](/iphone-duo-stock-alerts)）。` },
        { q: "為何每間 Apple Store 都顯示 iPhone Duo 沒有貨？", a: sell
          ? `因為補貨很短暫：我們在${where}量度的 ${n(sell.n)} 次售罄補貨中，${pct(sell.within2min)} 在 2 分鐘內售罄，${pct(sell.within20min)} 在 20 分鐘內。現時 ${n(x.stores)} 間中有 ${n(x.duoNow)} 間有貨；即使一日補貨幾十次，幾乎任何時刻 apple.com 如實顯示的都是「沒有貨」（[「沒有貨」是甚麼意思](/apple-store-pickup-availability-explained)）。`
          : `因為取貨現貨每次只出現幾分鐘。現時${where} ${n(x.stores)} 間分店中有 ${n(x.duoNow)} 間有貨（[「沒有貨」是甚麼意思](/apple-store-pickup-availability-explained)）。` },
        { q: "我的 Apple Store 補貨 iPhone Duo 時，怎樣收到通知？", a: `為分店及指定容量、顏色設定提醒：之後該分店每 ${SPEED.fastSec} 秒檢查一次，確認補貨後約 ${SPEED.alertSec} 秒通知你的手機（[設定提醒](${x.alert})；[運作原理](/how-it-works)）。` },
      ];
    },
    sources: {
      applePickup: "Apple：送貨及取貨（店舖取貨現貨怎樣運作）",
      newsroom: "Apple Newsroom：iPhone Duo 登陸全球 Apple Store（2026 年 10 月 23 日）",
      macRumors: "MacRumors：iPhone Duo 的 Apple Store 取貨系統在美國及加拿大重新開放（2026 年 10 月 24 日）",
      reports: (tracker: string) => `${tracker}：發售週的 iPhone Duo 補貨報告（對方的觀察，獨立顯示，從不計入）`,
    },
    ld: (x: RestockTimesView) => ({
      datasetName: `${cnOf(x.c)} Apple Store 的 iPhone Duo 補貨時間`,
      description: `自 ${x.t.since} 起${cnOf(x.c)} Apple Store 每一次已確認的 iPhone Duo 店舖取貨補貨，附分店、款式及時間，來自 PickupChecker 每 ${SPEED.checkSec} 秒一次的檢查；按當地鐘點、日子、${regionWordOf(x)}、分店及款式匯總。`,
      spatial: `${cnOf(x.c)} Apple Store`,
      measured: ["補貨時間（分店當地時間）", "Apple Store", "iPhone Duo 容量及顏色", "售罄前的秒數"],
      size: `${n(x.t.stores)} 間分店共 ${n(x.t.n)} 次補貨`,
    }),
    crumb: "iPhone Duo 補貨時間",

    timeLead: (x: RestockTimesView) => <b>{n(x.t.n)} 次補貨中，{pct(x.w.share)} 落在分店當地時間{rng(x.w.from, x.w.to)}，{pct(hourShare(x.t.byHour, 8, 12))} 在上午 8 點至中午 12 點之間。</b>,
    busiestHour: (count: number) => `最多補貨的單一鐘點：${n(count)} 次`,
    morning: "上午 8 點至中午 12 點",
    evening: "下午 5 點後：晚上並非沒有",
    night: "午夜至上午 6 點",
    tooFew: (x: RestockTimesView) => <b>日子太少，{yet(x)}未能指出鐘點：自{longYmd(x.t.since)}起確認補貨 {n(x.t.n)} 次，分佈在 {n(x.t.days)} 日。</b>,
    tooFewKeys: (): Point[] => [
      { text: <>要指出慣常鐘點，需要 <b className="text-ink">{PATTERN_MIN} 次補貨、分佈在 {PATTERN_MIN_DAYS} 個不同日子</b></> },
      { text: <>一口氣補 10 次 = 一次事件，不是習慣</>, no: true },
      { text: <>日子累積下去，本頁會自動改寫</>, step: true },
    ],
    hourCaption: (x: RestockTimesView) => `${cnOf(x.c)}的 iPhone Duo 補貨，按分店當地鐘點，${ymd(x.t.since, false)}至今日（${n(x.t.n)} 次補貨）`,
    hourHead: ["當地鐘點", "補貨", "佔比"],
    morningKeys: (x: RestockTimesView): Point[] => [
      { text: <>早上集中補貨<b className="text-ink">不是因為開門</b>{x.us ? "：美國大部分 Apple Store 上午 10 點才開門" : ""}</> },
      { text: <>取貨存貨在<b className="text-ink">網上</b>釋出，早於拉閘開舖</> },
      { text: <>手動查：平日早上留意 <b className="text-ink">{rng(x.w.from, x.w.to)}</b></>, step: true },
      { text: <>其餘 <b className="text-ink">22 小時</b>沒人會守著重新整理，交給<Link href={x.alert}>提醒</Link></>, step: true },
    ],
    storeChartKeys: (x: RestockTimesView): Point[] => [{ text: <>每間分店頁都有自己的圖表，按該店時區（<Link href={x.storesHref}>{x.us ? "按州份查看 Apple Store" : `${cnOf(x.c)}的分店`}</Link>）：一間早上 8 點補貨、而同區多數 9 點才補貨的分店，值得留意</>, step: true }],

    dayLead: (x: RestockTimesView) => {
      const { t, tracked, one } = x;
      return t.n > 0 && tracked === 1 ? (
        <b>目前只追蹤了一日：{ymd(t.daily[t.daily.length - 1]?.date ?? t.since)}，確認補貨 {n(t.n)} 次{one ? "" : `，分佈在 ${n(t.stores)} 間分店`}。</b>
      ) : t.n > 0 ? (
        <b>{t.days === tracked ? `我們追蹤的每一日（${n(t.days)} 日中 ${n(t.days)} 日）` : `自${longYmd(t.since)}起 ${n(tracked)} 日之中有 ${n(t.days)} 日`}至少有一次確認補貨{t.peakWeekday != null ? `，${WEEK[t.peakWeekday]}是補貨最多的一日` : ""}。</b>
      ) : (
        <b>自{longYmd(t.since)}起，{cnOf(x.c)}沒有已確認的補貨。</b>
      );
    },
    daysTracked: "至少有一次補貨的日子",
    busiestDay: (x: RestockTimesView, day: DayRow) => `最多補貨的一日：${ymd(day.date)}${x.one ? "" : ` · ${n(day.stores)} 間分店`}`,
    busiestDayNone: "最多補貨的一日",
    drop: (x: RestockTimesView, drop: { at: string; restocks: number }) => `半小時內補貨的分店數目，${zoneStampZh(drop.at, x.c.cc)}（${n(drop.restocks)} 款）：從外面看到的一次${x.c.cc === "hk" ? "全港" : "全國"}補貨潮`,
    weekend: (x: RestockTimesView) => `落在星期六或星期日（${n(x.weekend)} 次補貨）`,
    dayCaption: (x: RestockTimesView) => `${cnOf(x.c)}的 iPhone Duo 補貨，逐日統計${x.t.reports.length ? "；標為「報告」的行是其他追蹤網站在我們開始追蹤之前公布的觀察，只作時間線參考" : ""}`,
    dayHead: { date: "日期", restocks: "補貨", stores: "分店", busiest: "最多的鐘點", source: "來源" },
    soFar: " · 暫計",
    reportedBy: (names: string[]) => <>{names.join(" / ")} 報告</>,
    dayKeys: (x: RestockTimesView, launch: string, resumed: string): Point[] => [
      { text: <><b className="text-ink">{ymd(launch)}</b>：發售日，首批網上訂單出貨</> },
      { text: <><b className="text-ink">{ymd(resumed)}</b>：店舖取貨預訂重新開放{x.us ? "（MacRumors）" : ""}</> },
      x.t.reports.length
        ? { text: <>標為<b className="text-ink">報告</b>的行：{x.reportNames.join(" 及 ")} 在發售週的觀察，從不計入</> }
        : { text: <>我們對{cnOf(x.c)}每間分店的記錄由 <b className="text-ink">{longYmd(x.t.since)}</b> 開始</> },
      ...(x.t.n > 0 && x.t.peakWeekday == null ? [{ text: <>最多補貨的星期：數據橫跨 <b className="text-ink">{WEEKDAY_MIN_SPAN} 日</b>後才會指出（我們目前有 {n(x.tracked)} 日）</>, no: true }] : []),
      { text: <>留意<b className="text-ink">分店</b>一欄：同樣的補貨次數分佈在更多分店，對你來說是更好的一日</>, step: true },
    ],

    whereLead: (x: RestockTimesView, hit: { name: string; restocks: number; stores: number; storesTotal: number }[], total: number) => (
      <b>{hit[0].name}：自{ymd(x.t.since, false)}起，{n(hit[0].storesTotal)} 間分店中有 {n(hit[0].stores)} 間共補貨 {n(hit[0].restocks)} 次{hit[1] ? <>，其次是{hit[1].name}（{n(hit[1].restocks)}）</> : null}{hit[2] ? <>及{hit[2].name}（{n(hit[2].restocks)}）</> : null}；{n(total)} 個{regionWordOf(x)}中有 {n(hit.length)} 個至少有一次補貨{total - hit.length > 0 ? `，${n(total - hit.length)} 個暫未有` : ""}。</b>
    ),
    whereNone: (x: RestockTimesView) => <b>{cnOf(x.c)}暫未有任何{regionWordOf(x)}錄得確認補貨；表格會由第一次開始填上。</b>,
    regionCaption: (x: RestockTimesView) => `${cnOf(x.c)}按${regionWordOf(x)}的 iPhone Duo 確認補貨，${ymd(x.t.since, false)}至今日`,
    regionHead: (x: RestockTimesView) => [regionWordOf(x), "補貨", "有補貨的分店", "最近補貨（當地時間）"],
    ofN: (a: number, b: number) => <>{n(b)} 間中 {n(a)} 間</>,
    storesCaption: (x: RestockTimesView) => `${cnOf(x.c)} iPhone Duo 補貨最多的分店，${ymd(x.t.since, false)}至今日`,
    storesHead: ["分店", "補貨", "日數", "通常在", "最近（當地時間）"],
    swaps: (x: RestockTimesView) => [
      { no: "補貨最多的那一間，無論它在哪裏", yes: `${x.pattern ? hr(x.w.from) : "早上"}前後一小時內去得到的兩三間分店`, why: "去不到的補貨不算補貨；即使補貨最多的分店，一日裏也只有幾分鐘不是顯示沒有貨。" },
      { no: "只盯一間，然後祈禱", yes: "每間都設提醒，哪間先響就去哪間", why: "次數表只是告訴你，應該先去你那幾間之中的哪一間。" },
    ],
    nearMe: "我附近現時有 Duo 的分店",

    configLead: (x: RestockTimesView, top: { label: string; restocks: number }, rarest: { label: string; restocks: number } | null) => (
      <b>{top.label}：{n(x.t.n)} 次補貨中佔 {n(top.restocks)} 次（{pct(top.restocks / x.t.n)}）{rarest ? `；最少的是 ${rarest.label}，只有 ${n(rarest.restocks)} 次` : ""}。</b>
    ),
    mostRestocked: (config: string) => `${config}：補貨最多的款式`,
    versus: (a: string, bCount: number, b: string) => `${a} 的補貨次數，對比 ${b} 的 ${n(bCount)} 次`,
    restocksOf: (a: string) => `${a} 的補貨次數`,
    byStorage: "按容量",
    byColour: "按顏色",
    configNone: (x: RestockTimesView) => <b>{cnOf(x.c)}暫未有任何款式確認補貨；先列出 8 款配置，第一次補貨就有位置填上。</b>,
    configCaption: (x: RestockTimesView) => `${cnOf(x.c)}按款式的 iPhone Duo 確認補貨，${ymd(x.t.since, false)}至今日`,
    configHead: ["款式", "補貨", "佔比", "最近補貨（當地時間）"],
    configKeys: (x: RestockTimesView): Point[] => [
      { text: <>揀款式<b className="text-ink">比揀分店更重要</b></> },
      x.storageRatio != null
        ? { text: <>選補貨最多的容量：機會約是下一個容量的 <b className="text-ink">{x.storageRatio}×</b></> }
        : { text: <>選補貨最多的容量：機會<b className="text-ink">大大提高</b></> },
      { text: <><b className="text-ink">2TB</b>：要網上訂購、等送貨的手機</>, no: true },
      { text: <>價錢及現時有貨情況：<Link href="/which-iphone-duo-restocks-most">哪款 iPhone Duo 補貨最多？</Link></>, step: true },
    ],

    howLongLead: (x: RestockTimesView, sell: SelloutFacts) => <b>{cnOf(x.c)} {n(sell.n)} 次售罄的補貨中，一半在 {n(sell.medianSec)} 秒內售罄；{pct(sell.within2min)} 在 2 分鐘內，{pct(sell.within20min)} 在 20 分鐘內。</b>,
    secUnit: "秒",
    medianListing: "一般上架時間，由上架到售罄（中位數）",
    within2: "2 分鐘內售罄",
    within20: "20 分鐘內售罄",
    fastest: "量度到最快的售罄",
    howLongNone: (x: RestockTimesView) => <b>{cnOf(x.c)}售罄的補貨{yet(x)}太少，未能量度；我們要有 10 次才公布這些數字，美國版頁面有完整數據。</b>,
    howLongKeys: (x: RestockTimesView): Point[] => [
      { text: <>兩分鐘的窗口要靠<b className="text-ink">提醒</b>捕捉，不是靠重新整理 apple.com</> },
      { text: <>本頁其他一切，都由這個數字解釋</> },
      { text: <>每次補貨維持了多少秒，按款式及{regionWordOf(x)}：<Link href="/iphone-duo-sell-out-times">iPhone Duo 補貨幾快售罄？</Link></>, step: true },
    ],
    measured: "每個數字是由首次看到該款上架的那次檢查，到看到它消失的那次檢查之間的時間，所以是上限；真實的上架時間更短。",

    unavailableLead: (x: RestockTimesView) => <b>因為補貨只是一閃而過，而不是一種狀態：{x.one ? "一間分店" : `${n(x.stores)} 間分店`} × {n(x.configs)} 款 = {cnOf(x.c)}有 {n(x.pairs)} 個可能有貨的組合，而此刻有 {n(x.duoNow)} 間分店有任何一款 iPhone Duo。</b>,
    pairs: "可能有貨的「分店 × 款式」組合",
    listingNow: "此刻有 iPhone Duo 可取貨",
    goneIn2: "的補貨在兩分鐘內售罄",
    last24: "過去 24 小時已確認的補貨",
    unavailableKeys: (x: RestockTimesView, today: number): Point[] => [
      x.recent.restocks > 0
        ? { text: <>過去 24 小時：{cnOf(x.c)} {n(x.recent.stores)} 間分店共<b className="text-ink">確認補貨 {n(x.recent.restocks)} 次</b></> }
        : today > 0
          ? { text: <>今日：{cnOf(x.c)}<b className="text-ink">確認補貨 {n(today)} 次</b></> }
          : { text: <>上面的逐日表格列出確實發生過的補貨</> },
      { text: <>每一次在 apple.com 上只出現<b className="text-ink">一兩分鐘</b></> },
      { text: <>第四日、甚至第十四日「到處都沒有貨」，<b className="text-ink">不代表</b> Apple 停止供貨</>, no: true },
    ],
    unavailableLinks: { explained: "店舖取貨顯示「沒有貨」是甚麼意思", howToGet: "怎樣買到 iPhone Duo" },

    redditLead: (x: RestockTimesView) => <b><a href="https://www.reddit.com/r/applestore/" target="_blank" rel="noopener nofollow">r/applestore</a> 和 <a href="https://www.reddit.com/r/iphone/" target="_blank" rel="noopener nofollow">r/iphone</a> 上的民間智慧大多出於好意，但只看一間分店，而且一日就過時；以下是最常見的四種說法，對照{cnOf(x.c)} {n(x.t.n)} 次已確認補貨。</b>,
    redditCaption: "Reddit 上關於 iPhone Duo 補貨的常見說法，對照 PickupChecker 已確認的補貨",
    redditHead: ["說法", "數據怎樣說"],
    claims: (x: RestockTimesView): { claim: string; answer: ReactNode }[] => {
      const { t, w, tracked, recent } = x;
      return [
        { claim: "「分店半夜補貨——凌晨 3 點去查。」", answer: t.n > 0 ? <>{pct(hourShare(t.byHour, 0, 6))} 的補貨落在當地時間午夜至上午 6 點；{pct(w.share)} 落在{rng(w.from, w.to)}。</> : "暫未有補貨記錄可以對照。" },
        { claim: "「Apple 只在某一日補貨。」", answer: t.n > 0 ? (t.peakWeekday != null ? <>目前{WEEK[t.peakWeekday]}補貨最多（{n(t.n)} 次中佔 {n(t.byWeekday[t.peakWeekday])} 次），但 {n(tracked)} 日之中有 {n(t.days)} 日都有補貨。</> : <>我們追蹤的 {n(tracked)} 日之中，有 {n(t.days)} 日有補貨{t.days === tracked ? "，沒有一日空白" : ""}；數據要橫跨 {WEEKDAY_MIN_SPAN} 日才會指出哪一日最多。</>) : "暫未有補貨記錄可以對照。" },
        { claim: "「打電話問分店幾時有貨到。」", answer: "Apple 不會公布補貨時間表；apple.com 上出現的是網上釋出的取貨存貨，分店與所有人同一時間看到。" },
        { claim: "「顯示沒有貨，就是永遠賣完。」", answer: recent.restocks > 0 ? <>過去 24 小時，{n(recent.stores)} 間分店共確認補貨 {n(recent.restocks)} 次，證明並非如此；每次都在幾分鐘內再次顯示沒有貨。</> : t.n > 0 ? <>自{ymd(t.since, false)}起確認的 {n(t.n)} 次補貨證明並非如此；每次都在幾分鐘內再次顯示沒有貨。</> : "暫時未有可以對照的數據。" },
      ];
    },
    redditKeys: (): Point[] => [
      { text: <>沒有<b className="text-ink">數據</b>的時候，大家才會靠傳聞；本頁就是數據，免費查看</> },
      { text: <>Reddit 說得對的地方：<b className="text-ink">結帳技巧</b>——先登入、準備好 Apple Pay（<Link href="/how-to-grab-an-iphone-duo-restock">我們的 20 秒版本</Link>）</> },
    ],

    methodLead: <b>只有當 apple.com 在一間原本沒有上架的分店，開放某款配置的店舖取貨，並經兩次一致的檢查確認，才算一次補貨。</b>,
    methodKeys: (x: RestockTimesView): Point[] => [
      { text: <>{x.one ? `${cnOf(x.c)}的 Apple Store ` : `${cnOf(x.c)}每一間 Apple Store `}每 <b className="text-ink">{SPEED.checkSec} 秒</b>檢查一次；有提醒的分店每 <b className="text-ink">{SPEED.fastSec} 秒</b></> },
      { text: <>其他追蹤器自述的間隔是 <b className="text-ink">8 秒至 15 分鐘</b>；我們只比較對方公布的數字</> },
      { text: <>首次出現的「有貨」會在<b className="text-ink">約一秒後</b>再查一次才算數</> },
      { text: <>消失的上架會在<b className="text-ink">下一輪</b>確認</> },
      { text: <>分店第一次被看到、請求失敗或逾時：<b className="text-ink">永不</b>當作補貨，也不當作「沒有貨」</>, no: true },
      { text: <>鐘點和日期按每間分店的<b className="text-ink">當地時間</b>；「補貨潮」= 不同時區的同一個半小時</> },
      { text: <>其他追蹤網站的報告{x.t.reports.length ? `（${x.reportNames.join("、")}）` : ""}：獨立標示，<b className="text-ink">從不計入</b>任何總數</> },
      { text: <>約每 5 分鐘更新；<Link href={x.logHref}>補貨記錄</Link>本身是即時的</>, step: true },
    ],
    quote: "歡迎引用這些數字，請附上本頁連結。PickupChecker 是獨立網站，與 Apple 並無關連；我們讀取的是任何人在 apple.com 都看得到的取貨狀態，只是頻密得多。",
    alertIn: (x: RestockTimesView) => <>{x.one ? "" : `在${cnOf(x.c)}`}設定 iPhone Duo 提醒</>,

    related: "其他 iPhone Duo 問題",
    sameData: "用同一套數據回答",
    questions: {
      sellOut: "補貨幾快售罄？",
      alerts: "最快收到通知的方法",
      howToGet: "怎樣真正買到",
      whichConfig: "哪款補貨最多",
      nearMe: "我附近現時有貨的分店",
      unavailable: "「沒有貨」是甚麼意思",
    },
    otherCountries: ((us: boolean): string => (us ? "其他國家的同一頁" : "其他國家／地區")) as Dict["views"]["restockTimes"]["otherCountries"],
    faqTitle: "常見問題",
  },
};
