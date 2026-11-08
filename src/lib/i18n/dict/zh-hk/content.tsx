/**
 * 繁體中文（香港）: content — FAQ answers, browse rows, stat strips, product parts, sources, live widgets, the
 * enrich helpers (hours, durations, titles), live tokens, the restock-pattern sentence and photo text.
 * `where` in the FAQ is a bare place noun; counts arrive with their classifier ("31 次補貨", "2 款").
 */
import type { ReactNode } from "react";
import type { Dict } from "../en";
import type { Forms } from "@/lib/i18n/format";
import { CHECK, cleanCountry, tidyAddress, tidyPhone } from "./common";

const f = (x: Forms): Forms => x;
type Kind = "state" | "city" | "store" | "model";

/** "Apple ifc mall（中環） · 3 km": a nearby store and the line nearLine built ("中環｜3 km"); the place is dropped when the store's name already says it. */
function storeIn(store: string, line: string): string {
  const [place, dist] = line.split("｜");
  if (dist == null) return store.includes(place) ? store : `${store} · ${place}`;
  return store.includes(place) ? `${store} · ${dist}` : `${store} · ${place} ${dist}`;
}

export const content: Dict["content"] = {
  hours: {
    closed: "休息",
    everyDay: (hours: string) => `每日 ${hours}`,
    tomorrow: "明日",
    dayAt: (day: string, time: string) => `${day} ${time}`,
    closedTodayOpens: (next: string) => `今日休息 · ${next} 開門`,
    closedToday: "今日休息",
    opensAt: (time: string) => `${time} 開門`,
    openNow: (closes: string) => `營業中 · ${closes} 關門`,
    closedNowOpens: (next: string) => `現已關門 · ${next} 開門`,
    closedNow: "現已關門",
  },

  duration: {
    underAMinute: "不足一分鐘",
    pair: (a: string, b: string) => `${a} ${b}`,
  },
  listMore: (k: string) => `其餘 ${k} 個`,
  nearLine: (place: string, distance: string) => `${place}｜${distance}`,

  faq: {
    where: (_kind: Kind, place: string) => place,
    nRestocks: f({ other: "# 次補貨" }),
    restockA: ({ count, where, days, week, peak }: { count: string | null; where: string; days: string; week: string; peak: { hour: string; day: string | null } | null }) =>
      `${count == null ? `${where}過去 ${days} 日未有補貨記錄` : `${where}過去 ${days} 日共 ${count}，本週 ${week} 次`}${peak ? `，大多在當地時間${peak.hour}左右${peak.day ? `，以${peak.day}最多` : ""}` : ""}；Apple 不會公布補貨時間表。`,
    lastsNone: (where: string) => `${where}的「補貨→售罄」記錄仍太少，暫未能量度。`,
    lasts: (days: string, duration: string) => `過去 ${days} 日，補貨的款式通常上架約 ${duration}（中位數）便再次售罄。`,
    storeIn,
    nearestA: (stores: string) => `${stores}。`,

    modelStockQ: (model: string) => `哪幾間 Apple Store 現在有 ${model} 現貨？`,
    modelStockNone: (model: string) => `最近一次檢查時沒有；只要有美國 Apple Store 開放 ${model} 取貨，本頁清單會即時更新。`,
    nUsStores: f({ other: "# 間美國 Apple Store" }),
    modelStockSome: (count: string) => `最近一次檢查有 ${count}，本頁逐一列出每間分店有貨的款式。`,
    priceQ: (model: string) => `${model} 售價多少？`,
    priceA: (low: string, high: string, storages: string, colors: string) => `視乎容量（${storages}），無鎖版由 ${low} 至 ${high}，有${colors}可選。`,
    modelRestockQ: (model: string) => `${model} 多久補貨一次？`,
    modelLastsQ: (model: string) => `${model} 上架後，現貨能維持多久？`,
    reserveQ: (model: string) => `可以預留 ${model} 到店提取嗎？`,
    reserveA: "不可以；分店一上架某款配置，你要在 apple.com 選擇店舖提取並付款，Apple 才會在你揀選的時段為你保留。",

    storeStockQ: (store: string, model: string) => `${store}有 ${model} 現貨嗎？`,
    nConfigs: f({ other: "# 款" }),
    storeStockYes: (count: string) => `有，最近一次檢查有 ${count}；本頁表格列出是哪個容量和顏色。`,
    storeStockNo: (other: { pro: string; proMax: string } | null) => `最近一次檢查時沒有${other ? `，不過有 ${other.pro} 款 iPhone 18 Pro 及 ${other.proMax} 款 18 Pro Max` : "，iPhone 18 Pro 和 18 Pro Max 亦沒有任何一款"}。`,
    hoursQ: (store: string) => `${store}的營業時間是幾點至幾點？`,
    hoursA: ({ hours, today, address, phone }: { hours: string | null; today: string | null; address: string; phone: string | null }) =>
      `${hours ?? "營業時間列於本頁"}${today ? `；今日 ${today.replace(/\s*\((.+)\)$/, "（$1）")}` : ""}；地址：${tidyAddress(address)}${phone ? `，電話 ${tidyPhone(phone)}` : ""}。`,
    storeRestockQ: (store: string) => `${store}多久補貨一次 iPhone？`,
    storeLastsQ: (store: string) => `${store}的現貨能維持多久？`,
    storeNearestQ: (store: string) => `離${store}最近的另一間 Apple Store 是哪間？`,

    placeStockQ: (place: string, model: string) => `${place}哪幾間 Apple Store 現在有 ${model} 現貨？`,
    placeStockNone: (place: string, model: string) => `最近一次檢查時沒有；${place}任何一間分店一開放 ${model} 取貨，本頁即時更新。`,
    nStores: f({ other: "# 間分店" }),
    placeStockSome: (count: string, stores: string) => `最近一次檢查有 ${count}：${stores}。`,
    countQ: (place: string) => `${place}有幾多間 Apple Store？`,
    nAppleStores: f({ other: "# 間 Apple Store" }),
    countMany: (count: string, stores: string) => `${count}，包括${stores}。`,
    countOne: (count: string, store: string) => `${count}：${store}。`,
    placeRestockQ: (place: string) => `${place}的 Apple Store 多久補貨一次 iPhone？`,
    placeLastsQ: (place: string) => `${place}的現貨能維持多久？`,
    placeNearestQ: (place: string) => `${place}以外最近的 Apple Store 是哪間？`,
  },

  explainer: (kind: Kind, place: string) => {
    const at = kind === "store" ? place : kind === "model" ? "美國每一間 Apple Store" : `${place}的 Apple Store`;
    return [
      "店舖取貨的現貨在 apple.com 發售：結帳時揀選款式和分店，網上付款，再到店提取，通常即日可取。這與店內陳列的貨品及電訊商門市的存貨是分開的。",
      `PickupChecker 每 15 秒檢查一次${at}每一款追蹤中的配置，有提醒的分店每 5 秒一次；變化要經第二次檢查確認才算數，所以偶發異常不會變成假補貨或假售罄。`,
      "每個確認的變化都會記錄下來；本頁的補貨圖表和歷史，就是由這些記錄而來。",
    ];
  },
  alertRule: "一個提醒 = 一間分店、一個型號、一個容量、一種顏色；apple.com 一轉為有貨，推送（或電郵）幾秒內發出。",

  titles: {
    state: (name: string, duoNow: string, stores: string) => [
      `${name} Apple Store：${stores} 間中 ${duoNow} 間現有 iPhone Duo`,
      `${name} Apple Store：iPhone Duo 即時取貨現貨`,
      `${name} Apple Store：iPhone Duo 現貨`,
      `${name} Apple Store iPhone 現貨`,
    ],
    city: (cityName: string, code: string, duoNow: string, stores: string) => [
      `${cityName}, ${code} Apple Store：${stores} 間中 ${duoNow} 間有 iPhone Duo`,
      `${cityName}, ${code} Apple Store：iPhone Duo 取貨現貨`,
      `${cityName}, ${code} Apple Store：iPhone Duo 現貨`,
      `${cityName} Apple Store iPhone 現貨`,
    ],
    store: (name: string, region: string | null) => {
      const r = region ? `（${region}）` : "";
      return [
        `${name}${r}：iPhone 現貨・取貨・營業時間`,
        `${name}${r}：iPhone 現貨及營業時間`,
        `${name}${r}：iPhone 現貨`,
        `${name}：iPhone 現貨・取貨・營業時間`,
        `${name}：iPhone 現貨及營業時間`,
        `${name}：iPhone 現貨`,
        `${name} 現貨`,
      ];
    },
    model: (name: string, storesNow: string) => [
      `${name} 取貨現貨：現有 ${storesNow} 間 Apple Store 有貨`,
      `${name} 取貨現貨：${storesNow} 間 Apple Store 有貨`,
      `${name} 店舖取貨即時現貨`,
    ],
  },

  tokens: {
    tooFewToMeasure: "數據仍太少，未能量度",
    noneLoggedYet: "暫未有記錄",
    noneYet: "暫未有",
  },

  pattern: {
    none: (days: string) => `過去 ${days} 日沒有已確認的補貨。`,
    nConfirmed: f({ other: "已確認補貨 # 次" }),
    countIn: (count: string, days: string) => `過去 ${days} 日${count}`,
    stay: (minutes: string) => `；一般上架約 ${minutes} 分鐘便售罄`,
    nDays: f({ other: "# 日" }),
    tooFew: (count: string, onDays: string | null, stay: string) => `${count}${onDays ? `（只分佈在 ${onDays}）` : ""}——次數太少，暫未能看出規律${stay}。`,
    usual: (hour: string, weekday: string | null, count: string, stay: string) => `通常在當地時間${hour}左右補貨${weekday ? `，${weekday}最多` : ""}；${count}${stay}。`,
  },

  regionNouns: {
    state: f({ other: "州" }),
    province: f({ other: "省" }),
    area: f({ other: "地區" }),
    department: f({ other: "省" }),
    prefecture: f({ other: "縣" }),
    emirate: f({ other: "酋長國" }),
    canton: f({ other: "州" }),
    region: f({ other: "大區" }),
    county: f({ other: "郡" }),
    city: f({ other: "縣市" }),
  } as Record<string, Forms>,

  measured: "怎樣量度",

  faqTitle: "常見問題",
  breadcrumb: "導覽路徑",
  keepExploring: "繼續瀏覽",
  browse: {
    storesByState: "按州份查看分店",
    allStatesCities: "全部州份及城市 →",
    liveByModel: "按型號看即時現貨",
    modelStock: (model: string) => `${model} 現貨`,
    thisPage: "本頁",
    restockLog: (short: string) => `${short} 補貨記錄`,
    liveMap: "即時地圖",
    mostStores: "分店最多",
    allStates: "全部州份",
    bigCities: "主要城市",
    cities: "地區",
    storesBy: (region: string) => `按${region}查看分店`,
    allStoresIn: ({ country }: { inName: string; country: string }) => <>{cleanCountry(country)}全部 Apple Store →</>,
    allRegions: (regions: string) => `全部${regions}`,
  },
  modelCards: "按 iPhone 型號",
  narrative: {
    lastRestock: (config: ReactNode, at: ReactNode, ago: ReactNode) => <>最近一次補貨：{config}{at}，{ago}。</>,
    at: (store: ReactNode) => <> · {store}</>,
  },
  statStrip: {
    inStockNow: "現時有貨",
    ofStores: (k: string) => `共 ${k} 間分店`,
    stores: "分店",
    nCities: f({ other: "# 個地區" }),
    tracked: "追蹤中",
    modelNow: (short: string) => `${short} 現貨`,
    configsInStock: "有貨款式",
    storesWithStock: f({ other: "間有貨" }),
    restocks24h: "24 小時補貨",
    scoped: (label: string, model: string) => `${label} · ${model}`,
    restocksHint: (week: string, month: string, days: string) => `7 日 ${week} 次 · ${days} 日 ${month} 次`,
    sellOuts: (days: string) => `${days} 日售罄`,
    stays: (duration: string) => `上架約 ${duration}`,
    noPairs: "暫未有數據",
    lastRestock: "最近補貨",
    noneYet: "暫未有",
    inLastDays: (days: string) => `過去 ${days} 日`,
  },
  product: {
    chooseIphone: "揀選 iPhone",
    storage: "容量",
    color: "顏色",
    all: "全部",
    numbersAre: (unit: ReactNode) => <>數字 = 現時有貨的{unit}。</>,
    seen: (ago: ReactNode) => <>{ago}看到</>,
    last: (ago: ReactNode) => <>上次 {ago}</>,
    notSeenYet: "暫未見過",
    firstCheckPending: "等待首次檢查",
    inStock: "有貨",
    inStockLower: "有貨",
    none: "沒有",
    here: "就在這裏",
    notAvailable: "沒有貨",
    notCheckedYet: "尚未檢查",
    availableForPickup: "可供提取",
    since: (ago: ReactNode) => <> · {ago}起</>,
    lastInStock: (ago: ReactNode) => <>上次有貨：{ago}</>,
    neverSeen: "這裏暫未見過有貨",
    firstCheckSoon: "一分鐘內首次檢查",
    buy: "在 apple.com 購買",
    checked: (checked: ReactNode, note: ReactNode) => <>{checked}檢查 · {note}</>,
    checkNote: CHECK,
  },

  source: (source: ReactNode) => <>來源：{source}</>,
  photoCredit: (link: ReactNode) => <>相片：{link}</>,
  sources: "資料來源",
  allUsStores: "美國全部 269 間 Apple Store",
  trackerSource: (where: ReactNode, since: ReactNode, asOf: ReactNode) => <>PickupChecker 即時追蹤：{where} 的每一款 iPhone Duo、18 Pro 及 18 Pro Max 配置，自{since}起每 15 秒檢查一次（有提醒的分店每 5 秒）；本頁數字截至 {asOf}。</>,
  live: {
    configsCaption: (stores: ReactNode, model: ReactNode) => <>現時可取貨各款 {model} 的 Apple Store 數目（共 {stores} 間）· 即時</>,
    storage: "容量",
    pricesCaption: (model: ReactNode) => <>apple.com 上 {model} 的價錢（無鎖版，未連稅）及即時取貨現貨</>,
    price: "價錢",
    bestColor: "現貨最多的顏色",
    noRestock: (model: string) => `暫未有 ${model} 補貨記錄。`,
    clockLabel: (model: string) => `全美國的 ${model}`,
    storesWithIt: "現時有貨分店",
    pairsInStock: "有貨的「分店 × 款式」",
    restocksLogged: "已記錄補貨",
    medianTime: "上架時間中位數",
    underOneMin: (min: string) => `< ${min}`,
  },

  photos: {
    "apple-store-pickup-counter": { alt: "Apple Store 內設有「Pickup」指示牌的木製取貨櫃檯", caption: "店舖取貨的訂單，就在這樣的櫃檯交收。" },
    "phone-map": { alt: "在戶外用手機地圖 App 導航", caption: "補貨只維持一分鐘時，距離比想像中更重要。" },
    "phone-card-payment": { alt: "女士手持 iPhone 和信用卡在網上付款", caption: "網上付款，再到店提取。" },
    "phone-on-box": { alt: "新手機放在白色包裝盒上", caption: "剛開箱的新手機。" },
    "city-map-phone": { alt: "兩個人用手機查看城市地圖", caption: "規劃前往分店的路線。" },
    "phone-notification": { alt: "手持手機，鎖定畫面顯示通知", caption: "提醒直接出現在鎖定畫面。" },
    "apple-store-crowd-inside": { alt: "商場內人頭湧湧的 Apple Store", caption: "發售週的 Apple Store 人潮：上到貨架的貨，幾分鐘內就賣光。" },
    "apple-store-glass-canopy": { alt: "夜色中玻璃幕牆配木製簷篷的 Apple Store", caption: "入夜後的玻璃外牆 Apple Store。" },
    "apple-store-night-vancouver": { alt: "溫哥華一間夜間亮燈的 Apple Store", caption: "夜晚的 Apple Store：取貨現貨任何鐘點都可能出現，但多數落在早上。" },
    "phone-hand-camera": { alt: "手持配備三鏡頭的 iPhone", caption: "大家排隊搶的，正是 Pro 型號。" },
    "place-hk-hong-kong": { alt: "隔着維多利亞港望向港島天際線及國際金融中心二期", caption: "維多利亞港與國際金融中心二期（Two IFC），香港。" },
  },
};
