/**
 * 台灣中文：content —— SEO 積木（FAQ、瀏覽連結、數字條、產品元件、資料來源、即時元件）、enrich 的營業時間與
 * FAQ 答句、頁面標題、即時 {{token}}、補貨規律句與圖片說明。參數已是中文、數字已格式化；這裡只負責排字。
 * 機型名、容量、Apple Store、PickupChecker、apple.com 不翻。檢查間隔只寫 15 秒與 5 秒。
 */
import type { ReactNode } from "react";
import type { Forms } from "@/lib/i18n/format";
import type { Dict } from "../en";
import { zs } from "./util";

const f = (x: Forms): Forms => x;
type Kind = "state" | "city" | "store" | "model";

export const content: Dict["content"] = {
  hours: {
    closed: "休息",
    everyDay: (hours: string) => `每日 ${hours}`,
    tomorrow: "明天",
    dayAt: (day: string, time: string) => `${day} ${time}`,
    closedTodayOpens: (next: string) => `今日休息 · ${next} 開門`,
    closedToday: "今日休息",
    opensAt: (time: string) => `${time} 開門`,
    openNow: (closes: string) => `營業中 · ${closes} 打烊`,
    closedNowOpens: (next: string) => `已打烊 · ${next} 開門`,
    closedNow: "已打烊",
  },

  duration: {
    underAMinute: "不到 1 分鐘",
    pair: (a: string, b: string) => `${a} ${b}`,
  },
  listMore: (k: string) => `另外 ${k} 個`,
  nearLine: (place: string, distance: string) => `${place} · ${distance}`,

  faq: {
    /** 句子以地點開頭（「Apple 信義 A13 最近 30 天…」），所以這裡只給名詞。 */
    where: (_kind: Kind, place: string) => place,
    nRestocks: f({ other: "補貨 # 次" }),
    restockA: ({ count, where, days, week, peak }: { count: string | null; where: string; days: string; week: string; peak: { hour: string; day: string | null } | null }) =>
      zs(`${count == null ? `${where}最近 ${days} 天沒有補貨紀錄` : `${where}最近 ${days} 天${count}，本週 ${week} 次`}${peak ? `，大多在當地時間${peak.hour}前後${peak.day ? `，${peak.day}最常見` : ""}` : ""}；Apple 不公布補貨時間表。`),
    lastsNone: (where: string) => zs(`${where}的「補貨到售完」紀錄還太少，暫時無法計算。`),
    lasts: (days: string, duration: string) => zs(`最近 ${days} 天，補貨的規格大約維持 ${duration}（中位數）才又賣完。`),
    storeIn: (store: string, line: string) => `${store}（${line}）`,
    nearestA: (stores: string) => `${stores}。`,

    modelStockQ: (model: string) => zs(`哪些美國 Apple Store 現在有 ${model} 現貨？`),
    modelStockNone: (model: string) => zs(`上次檢查時沒有；只要有美國 Apple Store 上架 ${model} 門市取貨，本頁清單就會更新。`),
    nUsStores: f({ other: "# 家美國 Apple Store" }),
    modelStockSome: (count: string) => zs(`上次檢查時有 ${count}，本頁列出每家店和它有的規格。`),
    priceQ: (model: string) => zs(`${model} 多少錢？`),
    priceA: (low: string, high: string, storages: string, colors: string) => zs(`依容量（${storages}）從 ${low} 到 ${high}（空機），顏色有${colors}。`),
    modelRestockQ: (model: string) => zs(`${model} 多久補貨一次？`),
    modelLastsQ: (model: string) => zs(`${model} 上架後，現貨能維持多久？`),
    reserveQ: (model: string) => zs(`${model} 可以預約門市取貨嗎？`),
    reserveA: "不行；門市一上架某個規格，你就得在 apple.com 下單並選擇門市取貨，之後才會依你選的時段替你保留。",

    storeStockQ: (store: string, model: string) => zs(`${store}現在有 ${model} 現貨嗎？`),
    nConfigs: f({ other: "# 款規格" }),
    storeStockYes: (count: string) => zs(`有，上次檢查時有 ${count}；本頁表格列出是哪些容量與顏色。`),
    storeStockNo: (other: { pro: string; proMax: string } | null) => zs(`上次檢查時沒有${other ? `，不過有 iPhone 18 Pro ${other.pro} 款、18 Pro Max ${other.proMax} 款規格可取貨` : "，18 Pro 與 18 Pro Max 也都沒有"}。`),
    hoursQ: (store: string) => zs(`${store}的營業時間是幾點到幾點？`),
    hoursA: ({ hours, today, address, phone }: { hours: string | null; today: string | null; address: string; phone: string | null }) =>
      zs(`${hours ?? "營業時間請見本頁"}${today ? `；今日 ${today}` : ""}；地址：${address}${phone ? `，電話 ${phone}` : ""}。`),
    storeRestockQ: (store: string) => zs(`${store}多久補貨一次 iPhone？`),
    storeLastsQ: (store: string) => zs(`${store}的現貨通常能維持多久？`),
    storeNearestQ: (store: string) => zs(`離${store}最近的其他 Apple 直營店是哪一家？`),

    placeStockQ: (place: string, model: string) => zs(`${place}哪些 Apple 直營店現在有 ${model} 現貨？`),
    placeStockNone: (place: string, model: string) => zs(`上次檢查時沒有；${place}只要有門市上架 ${model} 門市取貨，本頁會立刻更新。`),
    nStores: f({ other: "# 家" }),
    placeStockSome: (count: string, stores: string) => zs(`上次檢查時有 ${count}：${stores}。`),
    countQ: (place: string) => zs(`${place}有幾家 Apple 直營店？`),
    nAppleStores: f({ other: "# 家" }),
    countMany: (count: string, stores: string) => zs(`${count}，包括${stores}。`),
    countOne: (count: string, store: string) => zs(`${count}：${store}。`),
    placeRestockQ: (place: string) => zs(`${place}的 Apple 直營店多久補貨一次 iPhone？`),
    placeLastsQ: (place: string) => zs(`${place}的現貨能維持多久？`),
    placeNearestQ: (place: string) => zs(`${place}以外最近的 Apple 直營店在哪裡？`),
  },

  explainer: (kind: Kind, place: string) => {
    const at = kind === "store" ? place : kind === "model" ? "每一家美國 Apple Store" : `${place}的 Apple 直營店`;
    return [
      "門市取貨的現貨是在 apple.com 上賣的：結帳時選好規格與門市，線上付款、到店取貨，常常當天就拿得到。它和店內陳列的庫存、電信門市的貨都是分開的。",
      zs(`PickupChecker 每 15 秒檢查一次${at}每一種追蹤中的規格，有通知指向時每 5 秒一次；變化要經過第二次檢查確認才算數，所以一次異常不會變成假補貨或假售完。`),
      "每次確認的變化都會記錄下來；本頁的補貨圖表與歷史就是從這份紀錄來的。",
    ];
  },
  alertRule: "一則通知 = 一家門市 × 一個機型 × 一種容量 × 一個顏色；apple.com 一轉為可取貨，推播（或 Email）幾秒內就送出。",

  titles: {
    state: (name: string, duoNow: string, stores: string) => [
      `${name} Apple Store：${stores} 家中 ${duoNow} 家現在有 iPhone Duo`,
      `${name} Apple Store iPhone Duo 門市取貨即時現貨`,
      `${name} Apple Store iPhone Duo 現貨`,
      `${name} Apple Store iPhone 現貨`,
    ].map(zs),
    city: (city: string, code: string, duoNow: string, stores: string) => [
      `${city}（${code}）Apple Store：${stores} 家中 ${duoNow} 家有 iPhone Duo`,
      `${city}（${code}）Apple Store iPhone Duo 門市取貨現貨`,
      `${city} Apple Store iPhone Duo 現貨`,
      `${city} Apple Store iPhone 現貨`,
    ].map(zs),
    /** 門市頁 <title> 與 H1：店名在前（大家搜的就是「apple 信義 a13」），再接現貨、庫存、取貨、營業時間。 */
    store: (name: string, region: string | null) => {
      const r = region ? `（${region}）` : "";
      return [
        `${name}${r}：iPhone 現貨查詢、庫存、門市取貨與營業時間`,
        `${name}${r}：iPhone 現貨查詢、門市取貨與營業時間`,
        `${name}${r}：iPhone 現貨與營業時間`,
        `${name}：iPhone 現貨查詢、庫存、門市取貨與營業時間`,
        `${name}：iPhone 現貨與營業時間`,
        `${name}：iPhone 現貨`,
        `${name} 現貨`,
      ].map(zs);
    },
    model: (name: string, storesNow: string) => [
      `${name} 門市取貨現貨：現在 ${storesNow} 家 Apple Store 有貨`,
      `${name} 門市取貨現貨：${storesNow} 家 Apple Store 有貨`,
      `${name} 門市取貨即時現貨`,
    ].map(zs),
  },

  tokens: {
    tooFewToMeasure: "資料還不夠",
    noneLoggedYet: "還沒有紀錄",
    noneYet: "還沒有",
  },

  pattern: {
    none: (days: string) => `最近 ${days} 天沒有確認的補貨。`,
    nConfirmed: f({ other: "確認補貨 # 次" }),
    countIn: (count: string, days: string) => `最近 ${days} 天${count}`,
    stay: (minutes: string) => `；通常上架約 ${minutes} 分鐘就賣完`,
    nDays: f({ other: "# 天" }),
    tooFew: (count: string, onDays: string | null, stay: string) => `${count}${onDays ? `，分布在 ${onDays}` : ""}，還太少，看不出規律${stay}。`,
    usual: (hour: string, weekday: string | null, count: string, stay: string) => `通常在當地時間${hour}前後補貨${weekday ? `，${weekday}最多` : ""}；${count}${stay}。`,
  },

  regionNouns: {
    state: f({ other: "州" }),
    province: f({ other: "省" }),
    area: f({ other: "地區" }),
    department: f({ other: "省" }),
    prefecture: f({ other: "都道府縣" }),
    emirate: f({ other: "酋長國" }),
    canton: f({ other: "州" }),
    region: f({ other: "大區" }),
    county: f({ other: "省" }),
    city: f({ other: "縣市" }),
  } as Record<string, Forms>,

  measured: "怎麼量的",

  faqTitle: "常見問題",
  breadcrumb: "導覽路徑",
  keepExploring: "繼續瀏覽",
  browse: {
    storesByState: "美國各州門市",
    allStatesCities: "所有州與城市 →",
    liveByModel: "各機型即時現貨",
    modelStock: (model: string) => `${model} 現貨`,
    thisPage: "本頁",
    restockLog: (short: string) => `${short} 補貨紀錄`,
    liveMap: "即時地圖",
    mostStores: "門市最多",
    allStates: "所有州",
    bigCities: "主要城市",
    cities: "城市",
    storesBy: (region: string) => `依${region}看門市`,
    allStoresIn: ({ country }: { inName: string; country: string }) => <>{zs(`${country}所有 Apple 直營店`)} →</>,
    allRegions: (regions: string) => `所有${regions}`,
  },
  modelCards: "依機型",
  narrative: {
    lastRestock: (config: ReactNode, at: ReactNode, ago: ReactNode) => <>上次補貨：{config}{at}，{ago}。</>,
    at: (store: ReactNode) => <>（{store}）</>,
  },
  statStrip: {
    inStockNow: "目前有現貨",
    ofStores: (k: string) => `共 ${k} 家門市`,
    stores: "門市",
    nCities: f({ other: "# 個城市" }),
    tracked: "追蹤中",
    modelNow: (short: string) => `${short} 現貨`,
    configsInStock: "款規格有現貨",
    storesWithStock: f({ other: "家門市有貨" }),
    restocks24h: "24 小時補貨",
    scoped: (label: string, model: string) => `${label} · ${model}`,
    restocksHint: (week: string, month: string, days: string) => `7 天 ${week} 次 · ${days} 天 ${month} 次`,
    sellOuts: (days: string) => `${days} 天售完次數`,
    stays: (duration: string) => `約維持 ${duration}`,
    noPairs: "資料還不夠",
    lastRestock: "上次補貨",
    noneYet: "還沒有",
    inLastDays: (days: string) => `最近 ${days} 天`,
  },
  product: {
    chooseIphone: "選擇 iPhone",
    storage: "容量",
    color: "顏色",
    all: "全部",
    numbersAre: (unit: ReactNode) => <>數字 = 目前有現貨的{unit}數。</>,
    seen: (ago: ReactNode) => <>{ago}看到</>,
    last: (ago: ReactNode) => <>上次 {ago}</>,
    notSeenYet: "還沒看到",
    firstCheckPending: "等待第一次檢查",
    inStock: "有現貨",
    inStockLower: "有現貨",
    none: "沒有",
    here: "就在這",
    notAvailable: "無現貨",
    notCheckedYet: "尚未檢查",
    availableForPickup: "可門市取貨",
    since: (ago: ReactNode) => <> · {ago}上架</>,
    lastInStock: (ago: ReactNode) => <>上次有貨：{ago}</>,
    neverSeen: "這裡還沒出現過現貨",
    firstCheckSoon: "一分鐘內完成第一次檢查",
    buy: "前往 apple.com 購買",
    checked: (checked: ReactNode, note: ReactNode) => <>檢查於 {checked} · {note}</>,
    checkNote: "每 15 秒，有通知的門市每 5 秒",
  },

  source: (source: ReactNode) => <>資料來源：{source}</>,
  photoCredit: (link: ReactNode) => <>照片：{link}</>,
  sources: "資料來源",
  allUsStores: "全美 269 家 Apple Store",
  trackerSource: (where: ReactNode, since: ReactNode, asOf: ReactNode) => <>PickupChecker 即時追蹤（{where}）：每一款 iPhone Duo、18 Pro 與 18 Pro Max 規格，自 {since}起每 15 秒檢查一次（有通知的門市每 5 秒）；本頁數字截至 {asOf}。</>,
  live: {
    configsCaption: (stores: ReactNode, model: ReactNode) => <>{model} 各規格現在可門市取貨的 Apple Store 數（共 {stores} 家）· 即時</>,
    storage: "容量",
    pricesCaption: (model: ReactNode) => <>{model} 在 apple.com 的價格（空機、未稅）與即時門市取貨現貨</>,
    price: "價格",
    bestColor: "最多門市有貨的顏色",
    noRestock: (model: string) => zs(`還沒有 ${model} 補貨紀錄。`),
    clockLabel: (model: string) => zs(`全美的 ${model}`),
    storesWithIt: "現在有貨的門市",
    pairsInStock: "有現貨的「門市 × 規格」組合",
    restocksLogged: "已記錄的補貨",
    medianTime: "現貨維持時間（中位數）",
    underOneMin: (min: string) => `< ${min}`,
  },

  /** 圖片說明：只翻通用圖與台灣的地點圖，其他 id 沿用英文。 */
  photos: {
    "apple-store-pickup-counter": { alt: "Apple Store 店內掛著 Pickup 標示的木質取貨櫃台", caption: "門市取貨的訂單就是在這樣的櫃台交貨。" },
    "phone-map": { alt: "在戶外用手機地圖 App 導航的雙手", caption: "補貨只維持一分鐘時，距離比你想的更重要。" },
    "phone-card-payment": { alt: "一手拿 iPhone、一手拿信用卡準備線上付款的女性", caption: "線上付款，再到門市取貨。" },
    "phone-on-box": { alt: "放在白色包裝盒上的新手機", caption: "剛拆封的新手機。" },
    "city-map-phone": { alt: "兩個人一起看手機上的城市地圖", caption: "規劃去門市的路線。" },
    "phone-notification": { alt: "手上拿著鎖定畫面顯示通知的手機", caption: "通知直接出現在鎖定畫面。" },
    "apple-store-crowd-inside": { alt: "購物中心裡一間 Apple Store 店內排隊的人潮", caption: "上市週的 Apple Store 人潮：上架的貨幾分鐘就沒了。" },
    "apple-store-glass-canopy": { alt: "夜晚有玻璃帷幕與木質雨遮的 Apple Store", caption: "入夜後的玻璃帷幕 Apple Store。" },
    "apple-store-night-vancouver": { alt: "溫哥華夜裡燈火通明的 Apple Store", caption: "夜裡的 Apple Store：門市取貨的現貨隨時可能出現，但出現在早上的機率高得多。" },
    "phone-hand-camera": { alt: "手持三鏡頭 iPhone 的人", caption: "大家排隊搶的就是 Pro 機型。" },
    "place-tw-taiwan": { alt: "晴天下聳立在信義區天際線上的台北 101", caption: "台北 101，台北。" },
  },
};
