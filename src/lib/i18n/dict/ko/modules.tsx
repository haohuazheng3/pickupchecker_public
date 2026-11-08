/**
 * 한국어 문구: modules — 재입고·매장·재고 모듈(src/components/{restocks,stores,stock}).
 * `label`은 페이지가 만든 조사 없는 장소 명사구("서울", "Apple 강남", "이 매장", "국내")예요. 문장마다 조사를 붙여 써요.
 * 숫자는 날것으로 와서 num()으로 적고, 시간·날짜·비율은 이미 형식이 맞춰져 와요. 확인 주기는 15초(전체)와 5초(알림 매장)뿐이에요.
 */
import type { ReactNode } from "react";
import { num } from "@/lib/i18n/format";
import type { Dict } from "../en";

const n = (x: number) => num("ko", x);

export const modules: Dict["modules"] = {
  daily: {
    empty: (label: string, days: number) => `최근 ${n(days)}일 동안 ${label}에서 기록된 재입고나 품절이 없어요. 첫 기록부터 차트가 채워져요.`,
    summary: (restocks: number, soldouts: number, label: string, days: number, activeDays: number) =>
      `최근 ${n(days)}일 동안 ${label}에서 재입고 ${n(restocks)}회, 품절 ${n(soldouts)}회가 있었고, 서로 다른 ${n(activeDays)}일에 걸쳐 있어요.`,
    busiest: (day: string, restocks: number) => <> 가장 많았던 날은 <b className="text-ink">{day}</b>, 재입고 {n(restocks)}회예요.</>,
    barAria: (day: string, restocks: number, soldouts: number) => `${day}: 재입고 ${n(restocks)}회, 품절 ${n(soldouts)}회`,
    barTitle: (day: string, restocks: number, soldouts: number) => `${day}: 재입고 ${n(restocks)}회 · 품절 ${n(soldouts)}회`,
    legendRestocks: "재입고",
    legendSoldouts: "품절",
  },

  last24: {
    title: (label: string) => `최근 24시간 ${label} iPhone Duo 재입고`,
    asOf: (when: string) => `${when} 기준`,
    localTime: (when: string) => `현지 시간 ${when}`,
    anAppleStore: "Apple Store",
    unknown: "최근 24시간 집계를 지금은 읽지 못했어요. 이 페이지의 실시간 재고와 재입고 기록은 영향이 없어요.",
    none: (label: string, asOf: string) => <><b className="text-ink">최근 24시간 {label}에서 iPhone Duo 재입고 없음</b> ({asOf} 기준).</>,
    some: (o: { restocks: number; one: boolean; label: string; withStores: number; allStores: number; config: string; store: ReactNode | null; when: string }) => (
      <>최근 24시간 동안 <b className="text-ink">{o.one ? `${o.label}에서` : `${o.label} Apple Store ${n(o.allStores)}곳 중 ${n(o.withStores)}곳에서`} iPhone Duo가 {n(o.restocks)}회 재입고</b>됐어요. 가장 최근: <b className="text-ink">{o.config}</b>{o.store != null && <>, {o.store}</>}, 현지 시간 {o.when}.</>
    ),
    tileRestocks: "확인된 재입고 · 24시간",
    tileConfigsBack: "다시 들어온 구성",
    tileStores: (configs: number, allConfigs: number) => `재입고된 매장${configs ? ` · 구성 ${n(allConfigs)}개 중 ${n(configs)}개` : ""}`,
    tileLatest: (config: string, store: string | null) => <>가장 최근 · {config}{store != null && <> · {store}</>}</>,
    tileBefore: (config: string, store: string | null, day: string) => <>그 전 마지막 · {config}{store != null && <> · {store}</>} · {day}</>,
    tileNoEarlier: "이전 재입고 기록 없음",
    caption: (label: string, asOf: string) => `${label} iPhone Duo 구성별 확인된 재입고, 최근 24시간, ${asOf} 기준`,
    thConfig: "구성",
    thRestocks: "재입고",
    thStores: "매장",
    thLast: "마지막 재입고(현지 시간)",
    thNow: "지금 재고",
    ofStores: (k: number, total: number) => `${n(total)}곳 중 ${n(k)}곳`,
    noneIn24: "24시간 내 없음",
    yes: "있음",
    no: "없음",
    countedTitle: "재입고 집계 방법",
    counted: "PickupChecker가 apple.com 매장 픽업을 직접 확인해요. 모든 매장은 15초마다, 알림 매장은 5초마다 확인하고, 두 번의 확인이 일치할 때만 재입고로 기록해요. 매장을 처음 확인한 순간은 세지 않고, 다른 트래커의 제보는 섞지 않아요.",
    alert: (label: string | null) => `${label != null ? `${label} ` : ""}알림 받기 → 다음 재입고를 몇 초 안에`,
  },

  clock: {
    none: (label: string, days: number) => `최근 ${n(days)}일 동안 ${label}에서 아직 기록된 재입고가 없어요.`,
    thin: (total: number, label: string, days: number, dates: number | null) =>
      `최근 ${n(days)}일 동안 ${label}에서 재입고 ${n(total)}회${dates != null ? `(${n(dates)}일에 걸쳐)` : ""}: 패턴을 말하기엔 아직 적어요.`,
    pattern: (total: number, label: string, days: number, hour: string, day: string | null) => (
      <>최근 {n(days)}일 동안 {label}에서 재입고 {n(total)}회. 대부분 현지 시간 <b className="text-ink">{hour}</b> 전후에 들어와요{day ? <>. 가장 많은 요일은 <b className="text-ink">{day}</b></> : null}.</>
    ),
    byHour: (zone: string) => `시간대별 · ${zone}`,
    byWeekday: "요일별",
    barReported: (k: number) => ` (+다른 트래커 제보 ${n(k)}회)`,
    barReportedTitle: (bar: string, k: number) => `${bar}: 다른 트래커 제보 ${n(k)}회`,
    legendOurs: "PickupChecker 확인",
  },

  feed: {
    empty: "아직 기록된 재입고가 없어요.",
    available: "재고 있음",
    soldOut: "품절",
    soldOutAt: (time: ReactNode) => <>{time} 품절</>,
    since: (time: ReactNode) => <>{time}부터</>,
    restockedAt: (time: ReactNode) => <>{time} 재입고</>,
    mapAria: (store: string) => `지도에서 ${store} 보기`,
    map: "지도",
    buyAria: (model: string, config: string) => `apple.com에서 ${model} ${config} 구입하기`,
    buy: "apple.com에서 구입하기",
  },

  byConfig: {
    empty: (label: string, days: number) => `최근 ${n(days)}일 동안 ${label}에서 재입고된 구성이 없어 아직 순위가 없어요.`,
    intro: (label: string, days: number) => `최근 ${n(days)}일 동안 ${label}에서 다시 들어온 구성, 많은 순이에요.`,
    times: (k: number) => `${n(k)}회`,
    alert: "알림 받기",
  },

  sellout: {
    typical: (label: string, band: string) => `${label}의 iPhone Duo 재입고는 보통 약 ${band} 만에 품절됐어요.`,
    half: (label: string, duration: string) => `${label} 재입고의 절반은 ${duration} 안에 품절됐어요.`,
    none: (label: string, days: number) => `최근 ${n(days)}일 동안 ${label}에서 품절까지 간 재입고가 아직 없어요.`,
    whatDuo: "iPhone Duo",
    whatAll: "전체 iPhone",
    tileHalf: (what: string) => <>절반 품절까지 · {what}</>,
    tileWithin30: "30초 안에 품절",
    tileWithin60: "1분 안에 품절",
    tileFastest: (k: number, days: number) => <>최단 · 품절된 재입고 {n(k)}회, {n(days)}일</>,
    caption: (days: number) => `iPhone별, 최근 ${n(days)}일`,
    thIphone: "iPhone",
    thSoldOut: "품절",
    thHalf: "절반 품절까지",
    thWithin30: "≤ 30초",
    thWithin60: "≤ 1분",
    thFastest: "최단",
    each: "재입고별",
    barNote: (full: string) => `막대 = 재고가 떠 있던 시간 · ${full}이면 가득`,
    stillListed: (duration: string) => `아직 판매 중 · ${duration}`,
    approx: (range: string) => `≈ ${range}`,
    measuredTitle: "측정 방법",
    measured: (estimated: boolean) =>
      `‘45–60초 만에 품절’은 처음 본 뒤 45초 시점의 확인에서는 아직 떠 있었고 60초 시점의 확인에서는 사라졌다는 뜻이에요. 알림 매장은 5초마다, 나머지 매장은 15초마다 확인하므로 그만큼이 각 범위의 폭이에요${estimated ? ". ≈ 표시는 마지막 확인 시각을 기록하기 전의 재입고라, 대신 15초 주기로 범위를 잡았어요" : ""}. 확인 간격보다 짧은 재고는 두 확인 사이에 왔다 갈 수 있어서, 실제 ‘30초 안에 품절’ 비율은 표시보다 높아요.`,
  },

  configTable: {
    title: "이 매장의 모든 구성",
    titleAt: (store: string) => `${store}의 모든 구성`,
    lookupOff: (hasRows: boolean) => `Apple이 지금 이 매장의 매장 픽업 조회를 막아 두었어요${hasRows ? "(마지막으로 받은 응답은 아래에 있어요)" : ""}`,
    tracked: (k: number) => `구성 ${n(k)}개 확인 중`,
    firstSweep: "첫 확인 진행 중: 1분 안에 상태가 표시돼요",
    inStock: (k: number, total: number) => `${n(total)}개 중 ${n(k)}개 재고 있음`,
    available: "픽업 가능",
    unavailable: "재고 없음",
    noLookup: "픽업 조회 불가",
    notChecked: "아직 확인 전",
    since: (ago: ReactNode) => <>{ago}부터</>,
    lastAvailable: (ago: ReactNode) => <>마지막 재고 {ago}</>,
    neverHere: "이 매장에선 아직 재고를 본 적 없음",
    buy: "구입",
    alertAria: (model: string, config: string, store: string) => `${store}에 ${model} ${config} 재고가 들어오면 알림 받기`,
    alert: "알림 받기 →",
  },

  matrix: {
    store: "매장",
    checked: "확인",
    cellTitle: (model: string, k: number, total: number) => `${model}: 구성 ${n(total)}개 중 ${n(k)}개 픽업 가능`,
  },

  nearby: {
    duo: (short: string, k: number) => `${short} · ${n(k)}`,
    noDuo: (short: string) => `${short} 없음`,
  },

  stockByModel: {
    availableNow: (k: number, total: number) => `지금 구성 ${n(total)}개 중 ${n(k)}개 픽업 가능`,
    noneNow: (total: number) => `지금은 구성 ${n(total)}개 모두 없음`,
    lookupOff: "Apple이 지금 이 매장의 픽업 조회를 막아 두었어요",
    notChecked: "아직 확인 전",
    more: (k: number) => `+${n(k)}`,
    checked: (ago: ReactNode) => <>{ago} 확인</>,
    alert: "알림 받기 →",
  },

  storeBlock: {
    checked: (ago: ReactNode) => <>{ago} 확인 · 15초마다, 알림 매장은 5초마다</>,
    map: "지도에서 보기",
    alert: "이 매장 알림 받기",
    alsoIn: (region: string) => `${region}의 다른 매장`,
    acrossLine: "다른 지역의 가까운 매장",
    elsewhere: "그 밖의 가까운 매장",
  },

  hours: {
    title: "영업시간",
    local: (zone: string) => `현지 시간 · ${zone}`,
    today: (hours: string, week: string) => ` · 오늘 ${hours} · ${week}`,
    directions: "길찾기",
    applePage: "apple.com 매장 페이지",
    liveMap: "실시간 지도",
    storePage: "매장 페이지",
    closed: "휴무",
    everyDay: (hours: string) => `매일 ${hours}`,
    openNow: (closes: string) => `영업 중 · ${closes} 종료`,
    opensAt: (opens: string) => `${opens} 영업 시작`,
    closedToday: (next: string | null) => (next ? `오늘 휴무 · ${next} 영업 시작` : "오늘 휴무"),
    closedNow: (next: string | null) => (next ? `영업 종료 · ${next} 영업 시작` : "영업 종료"),
    nextOpen: (day: string | null, time: string) => `${day ? `${day}요일` : "내일"} ${time}`,
  },

  liveStats: {
    inStock: "지금 재고",
    storesWith: "재고 있는 매장",
    lastCheck: "마지막 확인",
    none: "—",
  },

  board: {
    summary: (k: number, stores: number, short: string) => `매장 ${n(stores)}곳 중 ${n(k)}곳에 ${short} 재고 있음`,
    lastCheck: (ago: ReactNode) => <>마지막 확인 {ago}</>,
    firstSweep: "첫 확인 진행 중.",
    noneListed: (model: string, storage: string | null, color: string | null) => `지금 ${model}${storage ? ` ${storage}` : ""}${color ? ` ${color}` : ""} 재고가 있는 매장이 없어요.`,
    more: (k: number) => `+${n(k)}`,
    seen: (ago: ReactNode) => <>{ago} 확인</>,
    loading: "재고 불러오는 중",
  },
  duoNow: {
    eyebrow: (label: string) => `지금 ${label} iPhone Duo 재고`,
    /** 판정 문장. `stamp`는 형식이 맞춰진 날짜·시각, `list`는 재고 있는 매장(storeItem)을 이은 것. */
    notNow: (o: { stamp: string; n: number; label: string }) => <><b className="text-ink">{o.stamp} 기준 재고 없음</b>: {o.label} Apple Store {n(o.n)}곳 모두 iPhone Duo 픽업 재고가 없어요.</>,
    notNowOne: (o: { stamp: string; name: string }) => <><b className="text-ink">{o.stamp} 기준 재고 없음</b>: {o.name}에는 픽업할 수 있는 iPhone Duo 구성이 없어요.</>,
    inStock: (o: { stamp: string; k: number; n: number; label: string; list: ReactNode }) => <><b className="text-ink">{o.stamp} 기준 재고 있음</b>: {o.label} Apple Store {n(o.n)}곳 중 {n(o.k)}곳에서 iPhone Duo를 픽업할 수 있어요 — {o.list}.</>,
    inStockOne: (o: { stamp: string; k: number; total: number; name: string; list: ReactNode }) => <><b className="text-ink">{o.stamp} 기준 재고 있음</b>: {o.name}에서 iPhone Duo 구성 {n(o.total)}개 중 {n(o.k)}개를 픽업할 수 있어요 — {o.list}.</>,
    storeItem: (store: ReactNode, configs: number, ago: string | null) => <>{store} (구성 {n(configs)}개{ago ? `, ${ago}부터 표시` : ""})</>,
    configItem: (config: string, ago: string | null) => <>{config}{ago ? ` (${ago}부터 표시)` : ""}</>,
    lastIn: (o: { config: string; store: ReactNode | null; when: string; lasted: string | null }) => <>마지막 재고: <b className="text-ink">{o.config}</b>{o.store != null && <>, {o.store}</>}, {o.when}{o.lasted ? <> ({o.lasted})</> : null}.</>,
    neverYet: (label: string, since: string) => `${since} 추적을 시작한 뒤로 ${label}에서 확인된 iPhone Duo 재입고는 아직 없어요.`,
    others: (o: { pro: number; max: number; one: boolean; configs: number }) => (o.one ? `이 매장에서 iPhone 18 Pro는 구성 ${n(o.configs)}개 중 ${n(o.pro)}개, 18 Pro Max는 ${n(o.max)}개를 픽업할 수 있어요.` : `iPhone 18 Pro는 그중 ${n(o.pro)}곳, 18 Pro Max는 ${n(o.max)}곳에 재고가 있어요.`),
    updated: (stamp: string) => `${stamp} 업데이트`,
    checked: () => "15초마다 확인, 알림 매장은 5초마다",
    since: (date: string) => `${date}부터의 데이터`,
    method: "두 번의 확인이 일치할 때만 재입고로 세고, 처음 확인한 순간은 제외",
    tShare: (range: string) => `재입고 중 ${range} 사이 비율`,
    tBusiest: (count: number) => `가장 많은 시간대 · ${n(count)}회`,
    tHalf: "절반이 품절되기까지",
    tSince: (date: string) => `${date} 이후 확인된 재입고`,
    tToday: "오늘 지금까지",
    mostOften: (config: string, k: number, total: number) => `가장 많은 구성 ${config} (${n(total)}회 중 ${n(k)}회)`,
    zone: (tz: string | null): string => (void tz, "현지 시간"),
    summary: (o: { pct: string; n: number; stores: number; label: string; since: string; range: string; zone: string; busiest: string; busiestN: number; median: string | null; config: string | null; k: number; one: boolean }) =>
      `PickupChecker가 ${o.since} 이후 ${o.one ? o.label : `${o.label} Apple Store ${n(o.stores)}곳`}에서 확인한 iPhone Duo 재입고 ${n(o.n)}회 중 ${o.pct}가 ${o.zone} ${o.range} 사이였어요. 가장 많은 시간대는 ${o.busiest}(${n(o.busiestN)}회)였어요.${o.median ? ` 절반은 ${o.median} 안에 품절됐어요.` : ""}${o.config ? ` 가장 자주 재입고된 구성은 ${o.config}(${n(o.n)}회 중 ${n(o.k)}회)예요.` : ""}`,
    tooFew: (o: { n: number; label: string; since: string; one: boolean; stores: number }) => `${o.since} 이후 ${o.one ? o.label : `${o.label} Apple Store ${n(o.stores)}곳`}에서 확인된 iPhone Duo 재입고는 ${n(o.n)}회예요. 아직 평소 시간대를 말하기엔 적어서 아래에 하나씩 적었어요.`,
    hourByHour: "시간대별, 모든 매장 →",
    lastThree: (k: number, label: string) => (k === 1 ? `${label} 마지막 iPhone Duo 재입고` : `${label} 최근 iPhone Duo 재입고 ${n(k)}회`),
    secs: (x: number) => `${n(x)}초`,
    mins: (x: number) => `${n(x)}분`,
    listedRange: (low: string, high: string) => `${low}–${high} 표시`,
    listedAbout: (x: string) => `약 ${x} 표시`,
    stillListed: (x: string) => `아직 표시 중(${x})`,
    ago: (x: string) => `${x} 전`,
    alerts: (o: { sent: number; stores: number; total: number; days: number; label: string; one: boolean }) => (o.one
      ? `최근 ${n(o.days)}일 동안 PickupChecker는 ${o.label}의 iPhone Duo 재입고로 회원에게 알림 ${n(o.sent)}건을 보냈어요.`
      : `최근 ${n(o.days)}일 동안 PickupChecker는 ${o.label} Apple Store ${n(o.total)}곳 중 ${n(o.stores)}곳의 iPhone Duo 재입고로 회원에게 알림 ${n(o.sent)}건을 보냈어요.`),
    alertMe: (label: string) => `${label} 알림 받기`,
    unknown: "지금은 재입고 패턴을 읽지 못했어요. 이 페이지의 실시간 재고는 영향이 없어요.",
    allModels: (o: { n: number; days: number; peak: string | null }) => `iPhone 세 모델 전체: ${n(o.days)}일 동안 재입고 ${n(o.n)}회${o.peak ? `, 주로 ${o.peak} 무렵` : ""}.`,
  },
};
