/**
 * 繁體中文（香港）: modules — the restock, store and stock modules. `label` is a bare place noun ("香港",
 * "Apple Canton Road（廣東道）", "本店", "你的 3 間分店"); each sentence places it. Only 15 s and 5 s intervals.
 */
import type { ReactNode } from "react";
import type { Dict } from "../en";
import { CHECK, n, zhCfg } from "./common";

export const modules: Dict["modules"] = {
  daily: {
    empty: (label: string, days: number) => `${label}過去 ${n(days)} 日未有補貨或售罄記錄——圖表會由第一次開始累積。`,
    summary: (restocks: number, soldouts: number, label: string, days: number, activeDays: number) =>
      `${label}過去 ${n(days)} 日共補貨 ${n(restocks)} 次、售罄 ${n(soldouts)} 次，分佈在 ${n(activeDays)} 個不同日子。`,
    busiest: (day: string, restocks: number) => <>最多的一日是 <b className="text-ink">{day}</b>，共 {n(restocks)} 次。</>,
    barAria: (day: string, restocks: number, soldouts: number) => `${day}：補貨 ${n(restocks)} 次，售罄 ${n(soldouts)} 次`,
    barTitle: (day: string, restocks: number, soldouts: number) => `${day}：補貨 ${n(restocks)} 次 · 售罄 ${n(soldouts)} 次`,
    legendRestocks: "補貨",
    legendSoldouts: "售罄",
  },

  last24: {
    title: (label: string) => `${label}過去 24 小時的 iPhone Duo 補貨`,
    asOf: (when: string) => `截至 ${when}`,
    localTime: (when: string) => `${when}（當地時間）`,
    anAppleStore: "一間 Apple Store",
    unknown: "暫時未能讀取過去 24 小時的數字；本頁的即時現貨和補貨記錄不受影響。",
    none: (label: string, asOf: string) => <><b className="text-ink">{label}過去 24 小時沒有 iPhone Duo 補貨</b>（截至 {asOf}）。</>,
    some: (o: { restocks: number; one: boolean; label: string; withStores: number; allStores: number; config: string; store: ReactNode | null; when: string }) => (
      <>過去 24 小時，<b className="text-ink">{o.one ? o.label : `${o.label} ${n(o.allStores)} 間 Apple Store 中有 ${n(o.withStores)} 間`}補貨 iPhone Duo 共 {n(o.restocks)} 次</b>；最近一次：<b className="text-ink">{o.config}</b>{o.store != null && <>，{o.store}</>}，當地時間 {o.when}。</>
    ),
    tileRestocks: "已確認補貨 · 24 小時",
    tileConfigsBack: "重新上架的款式",
    tileStores: (configs: number, allConfigs: number) => `有補貨的分店${configs ? ` · ${n(allConfigs)} 款中 ${n(configs)} 款` : ""}`,
    tileLatest: (config: string, store: string | null) => <>最近一次 · {config}{store != null && <> · {store}</>}</>,
    tileBefore: (config: string, store: string | null, day: string) => <>之前最後一次 · {config}{store != null && <> · {store}</>} · {day}</>,
    tileNoEarlier: "之前沒有補貨記錄",
    caption: (label: string, asOf: string) => `${label}各款 iPhone Duo 過去 24 小時已確認的補貨，截至 ${asOf}`,
    thConfig: "款式",
    thRestocks: "補貨",
    thStores: "分店",
    thLast: "最近補貨（當地時間）",
    thNow: "現時有貨",
    ofStores: (k: number, total: number) => `${n(total)} 間中 ${n(k)} 間`,
    noneIn24: "24 小時內沒有",
    yes: "有",
    no: "沒有",
    countedTitle: "補貨怎樣計算",
    counted: "全部來自 PickupChecker 自己對 apple.com 店舖取貨的檢查：每間分店每 15 秒一次，有提醒的分店每 5 秒一次。兩次檢查一致才記錄為補貨；分店第一次被看到不計；從不混入其他追蹤網站的報告。",
    alert: (label: string | null) => `${label != null ? `在${label}` : ""}設定提醒 → 下次補貨幾秒內通知你`,
  },

  clock: {
    none: (label: string, days: number) => `${label}過去 ${n(days)} 日暫未有補貨記錄。`,
    thin: (total: number, label: string, days: number, dates: number | null) =>
      `${label}過去 ${n(days)} 日補貨 ${n(total)} 次${dates != null ? `（只分佈在 ${n(dates)} 日）` : ""}——次數太少，暫未能看出規律。`,
    pattern: (total: number, label: string, days: number, hour: string, day: string | null) => (
      <>{label}過去 {n(days)} 日補貨 {n(total)} 次，大多在當地時間<b className="text-ink">{hour}</b>左右出現{day ? <>，<b className="text-ink">{day}</b>最多</> : null}。</>
    ),
    byHour: (zone: string) => `按鐘點 · ${zone}`,
    byWeekday: "按星期",
    barReported: (k: number) => `（另有 ${n(k)} 次由其他追蹤網站報告）`,
    barReportedTitle: (bar: string, k: number) => `${bar}：其他追蹤網站報告 ${n(k)} 次`,
    legendOurs: "PickupChecker 確認",
  },

  feed: {
    empty: "暫未有補貨記錄。",
    available: "有貨",
    soldOut: "已售罄",
    soldOutAt: (time: ReactNode) => <>{time} 售罄</>,
    since: (time: ReactNode) => <>{time} 起有貨</>,
    restockedAt: (time: ReactNode) => <>{time} 補貨</>,
    mapAria: (store: string) => `在地圖上顯示${store}`,
    map: "地圖",
    buyAria: (model: string, config: string) => `在 apple.com 購買 ${model} ${config}`,
    buy: "在 apple.com 購買",
  },

  byConfig: {
    empty: (label: string, days: number) => `${label}過去 ${n(days)} 日沒有任何款式補貨，所以暫未有排名。`,
    intro: (label: string, days: number) => `${label}過去 ${n(days)} 日重新上架的款式，次數最多的排最前。`,
    times: (k: number) => `${n(k)} 次`,
    alert: "提醒我",
  },

  sellout: {
    typical: (label: string, band: string) => `${label}的 iPhone Duo 補貨，一般約 ${band}內售罄。`,
    half: (label: string, duration: string) => `${label}一半的補貨在 ${duration}內售罄。`,
    none: (label: string, days: number) => `${label}過去 ${n(days)} 日暫未有補貨售罄。`,
    whatDuo: "iPhone Duo",
    whatAll: "所有 iPhone",
    tileHalf: (what: string) => <>一半在此時間內售罄 · {what}</>,
    tileWithin30: "30 秒內售罄",
    tileWithin60: "1 分鐘內售罄",
    tileFastest: (k: number, days: number) => <>最快 · {n(days)} 日內 {n(k)} 次售罄的補貨</>,
    caption: (days: number) => `按 iPhone 型號，過去 ${n(days)} 日`,
    thIphone: "iPhone",
    thSoldOut: "售罄次數",
    thHalf: "一半售罄所需",
    thWithin30: "≤ 30 秒",
    thWithin60: "≤ 1 分鐘",
    thFastest: "最快",
    each: "逐次補貨",
    barNote: (full: string) => `長條 = 上架秒數 · ${full} 為滿格`,
    stillListed: (duration: string) => `仍在上架 · ${duration}`,
    approx: (range: string) => `≈ ${range}`,
    measuredTitle: "怎樣量度",
    measured: (estimated: boolean) =>
      `「45–60 秒售罄」的意思是：我們首次看到該款上架後 45 秒的那次檢查仍然有貨，60 秒後的那次檢查已經沒有。有提醒的分店每 5 秒檢查一次，其他分店每 15 秒一次，所以每個區間就是這個寬度${estimated ? "；標有 ≈ 的是我們開始記錄上一次檢查之前的補貨，改以 15 秒一輪為界" : ""}。比一次檢查還短的上架，可能在兩次檢查之間出現又消失，所以 30 秒內售罄的真實比例比顯示的更高。`,
  },

  configTable: {
    title: "本店每一款配置",
    titleAt: (store: string) => `${store}每一款配置`,
    lookupOff: (hasRows: boolean) => `Apple 現時沒有開放這間分店的店舖取貨查詢${hasRows ? "（下面是它最後給出的結果）" : ""}`,
    tracked: (k: number) => `追蹤 ${n(k)} 款`,
    firstSweep: "首輪檢查進行中——一分鐘內顯示狀態",
    inStock: (k: number, total: number) => `${n(total)} 款中 ${n(k)} 款有貨`,
    available: "有貨",
    unavailable: "沒有貨",
    noLookup: "不設取貨查詢",
    notChecked: "尚未檢查",
    since: (ago: ReactNode) => <>{ago}起有貨</>,
    lastAvailable: (ago: ReactNode) => <>上次有貨：{ago}</>,
    neverHere: "這裏從未有貨",
    buy: "購買",
    alertAria: (model: string, config: string, store: string) => `${store}有 ${model} ${config} 時提醒我`,
    alert: "提醒我 →",
  },

  matrix: {
    store: "分店",
    checked: "最近檢查",
    cellTitle: (model: string, k: number, total: number) => `${model}：${n(total)} 款中 ${n(k)} 款有貨`,
  },

  nearby: {
    duo: (short: string, k: number) => `${short} · ${n(k)}`,
    noDuo: (short: string) => `沒有 ${short}`,
  },

  stockByModel: {
    availableNow: (k: number, total: number) => `現時 ${n(total)} 款中 ${n(k)} 款有貨`,
    noneNow: (total: number) => `${n(total)} 款現時全部沒有貨`,
    lookupOff: "Apple 現時沒有開放這裏的取貨查詢",
    notChecked: "尚未檢查",
    more: (k: number) => `+${n(k)}`,
    checked: (ago: ReactNode) => <>{ago}檢查</>,
    alert: "提醒我 →",
  },

  storeBlock: {
    checked: (ago: ReactNode) => <>{ago}檢查 · {CHECK}</>,
    map: "在地圖上顯示",
    alert: "在這裏設定提醒",
    alsoIn: (region: string) => `${region}其他分店`,
    acrossLine: "州界另一邊最近的分店",
    elsewhere: "其他地方最近的分店",
  },

  hours: {
    title: "營業時間",
    local: (zone: string) => `當地時間 · ${zone}`,
    today: (hours: string, week: string) => ` · 今日 ${hours} · ${week}`,
    directions: "路線",
    applePage: "apple.com 分店頁",
    liveMap: "即時地圖",
    storePage: "分店頁",
    closed: "休息",
    everyDay: (hours: string) => `每日 ${hours}`,
    openNow: (closes: string) => `營業中 · ${closes} 關門`,
    opensAt: (opens: string) => `${opens} 開門`,
    closedToday: (next: string | null) => (next ? `今日休息 · ${next} 開門` : "今日休息"),
    closedNow: (next: string | null) => (next ? `現已關門 · ${next} 開門` : "現已關門"),
    nextOpen: (day: string | null, time: string) => `${day ?? "明日"} ${time}`,
  },

  liveStats: {
    inStock: "現時有貨",
    storesWith: "有貨分店",
    lastCheck: "最近檢查",
    none: "—",
  },

  board: {
    summary: (k: number, stores: number, short: string) => `${n(stores)} 間分店中 ${n(k)} 間有 ${short} 現貨`,
    lastCheck: (ago: ReactNode) => <>最近檢查 {ago}</>,
    firstSweep: "首輪檢查進行中。",
    noneListed: (model: string, storage: string | null, color: string | null) => `現時沒有分店有 ${model}${storage ? ` ${storage}` : ""}${color ? ` ${zhCfg(color)}` : ""} 現貨。`,
    more: (k: number) => `+${n(k)}`,
    seen: (ago: ReactNode) => <>{ago}看到</>,
    loading: "載入現貨中",
  },
  duoNow: {
    eyebrow: (label: string) => `${label}現時的 iPhone Duo 現貨`,
    /** 判斷句。`stamp` 是已格式化的日期時間；`list` 是有貨分店（storeItem）連在一起。 */
    notNow: (o: { stamp: string; n: number; label: string }) => <><b className="text-ink">截至 {o.stamp} 沒有現貨</b>：{o.label} {n(o.n)} 間 Apple Store 全部沒有 iPhone Duo 可供取貨。</>,
    notNowOne: (o: { stamp: string; name: string }) => <><b className="text-ink">截至 {o.stamp} 沒有現貨</b>：{o.name}沒有任何 iPhone Duo 款式可供取貨。</>,
    inStock: (o: { stamp: string; k: number; n: number; label: string; list: ReactNode }) => <><b className="text-ink">截至 {o.stamp} 有現貨</b>：{o.label} {n(o.n)} 間 Apple Store 中有 {n(o.k)} 間可取貨 iPhone Duo——{o.list}。</>,
    inStockOne: (o: { stamp: string; k: number; total: number; name: string; list: ReactNode }) => <><b className="text-ink">截至 {o.stamp} 有現貨</b>：{o.name}的 {n(o.total)} 款 iPhone Duo 中有 {n(o.k)} 款可供取貨——{o.list}。</>,
    storeItem: (store: ReactNode, configs: number, ago: string | null) => <>{store}（{n(configs)} 款{ago ? `，${ago}上架` : ""}）</>,
    configItem: (config: string, ago: string | null) => <>{config}{ago ? `（${ago}上架）` : ""}</>,
    lastIn: (o: { config: string; store: ReactNode | null; when: string; lasted: string | null }) => <>上次有貨：<b className="text-ink">{o.config}</b>{o.store != null && <>，{o.store}</>}，{o.when}{o.lasted ? <>（{o.lasted}）</> : null}。</>,
    neverYet: (label: string, since: string) => `自 ${since} 開始追蹤以來，${label}仍未有已確認的 iPhone Duo 補貨。`,
    others: (o: { pro: number; max: number; one: boolean; configs: number }) => (o.one ? `本店 iPhone 18 Pro 的 ${n(o.configs)} 款中有 ${n(o.pro)} 款可取貨，18 Pro Max 有 ${n(o.max)} 款。` : `iPhone 18 Pro 在其中 ${n(o.pro)} 間有貨，18 Pro Max 在 ${n(o.max)} 間。`),
    updated: (stamp: string) => `更新於 ${stamp}`,
    checked: () => CHECK,
    since: (date: string) => `數據由 ${date} 起`,
    method: "兩次檢查一致才算補貨；分店第一次被看到不計",
    tShare: (range: string) => `的補貨落在 ${range}`,
    tBusiest: (count: number) => `最多補貨的一小時 · ${n(count)} 次`,
    tHalf: "一半在這時間內售罄",
    tSince: (date: string) => `${date} 起已確認的補貨`,
    tToday: "今日至今",
    mostOften: (config: string, k: number, total: number) => `最常補貨：${config}（${n(total)} 次中 ${n(k)} 次）`,
    zone: (tz: string | null): string => (void tz, "當地時間"),
    summary: (o: { pct: string; n: number; stores: number; label: string; since: string; range: string; zone: string; busiest: string; busiestN: number; median: string | null; config: string | null; k: number; one: boolean }) =>
      `PickupChecker 自 ${o.since} 起在${o.one ? o.label : `${o.label} ${n(o.stores)} 間 Apple Store`}確認的 ${n(o.n)} 次 iPhone Duo 補貨中，${o.pct} 落在${o.zone} ${o.range}；補貨最多的一小時是 ${o.busiest}（${n(o.busiestN)} 次）。${o.median ? `一半在 ${o.median} 內售罄。` : ""}${o.config ? `最常補貨的是 ${o.config}（${n(o.n)} 次中 ${n(o.k)} 次）。` : ""}`,
    tooFew: (o: { n: number; label: string; since: string; one: boolean; stores: number }) => `自 ${o.since} 起，${o.one ? o.label : `${o.label} ${n(o.stores)} 間 Apple Store`}已確認的 iPhone Duo 補貨共 ${n(o.n)} 次——數量太少，暫時未能說出慣常時段；每一次都列在下面。`,
    hourByHour: "逐小時、逐間分店 →",
    lastThree: (k: number, label: string) => (k === 1 ? `${label}最近一次 iPhone Duo 補貨` : `${label}最近 ${n(k)} 次 iPhone Duo 補貨`),
    secs: (x: number) => `${n(x)} 秒`,
    mins: (x: number) => `${n(x)} 分鐘`,
    listedRange: (low: string, high: string) => `上架 ${low}–${high}`,
    listedAbout: (x: string) => `上架約 ${x}`,
    stillListed: (x: string) => `仍然有貨（${x}）`,
    ago: (x: string) => `${x}前`,
    alerts: (o: { sent: number; stores: number; total: number; days: number; label: string; one: boolean }) => (o.one
      ? `過去 ${n(o.days)} 日，PickupChecker 就${o.label}的 iPhone Duo 補貨向會員發出 ${n(o.sent)} 個提醒。`
      : `過去 ${n(o.days)} 日，PickupChecker 就${o.label} ${n(o.total)} 間 Apple Store 中 ${n(o.stores)} 間的 iPhone Duo 補貨向會員發出 ${n(o.sent)} 個提醒。`),
    alertMe: (label: string) => `在${label}設定提醒`,
    unknown: "暫時未能讀取補貨規律；本頁的即時現貨不受影響。",
    allModels: (o: { n: number; days: number; peak: string | null }) => `三款 iPhone 合計：${n(o.days)} 日內補貨 ${n(o.n)} 次${o.peak ? `，最多在 ${o.peak} 左右` : ""}。`,
  },
};
