/**
 * 한국어 문구: views — 제품 × 장소 페이지, 재입고 기록, 실시간 지도, iPhone Duo 재입고 시간 답변 페이지, 매장 목록.
 * `c: Country`는 영어 데이터라 나라 이름은 places.countryLabel로, 지역 단위는 한국어 단어로 써요.
 * 한국 페이지에서는 나라를 "국내"라고 불러요(다른 나라는 그 나라 이름).
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
import { PATTERN_MIN, PATTERN_MIN_DAYS, WEEKDAY_MIN_SPAN, hourLabel, localStamp } from "@/lib/content/siteFacts";
import { SPEED } from "@/lib/plans";
import { includedRate, taxName } from "@/content/country-tax";
import { distance, fitTitleW, list, num, price, stamp, weekdays } from "@/lib/i18n/format";
import { appleStoreLabel, cityLabel, colorLabel, countryLabel, regionLabel, storeLabel } from "@/lib/i18n/places";
import type { RestockTimesMeta, RestockTimesPlace, RestockTimesView } from "../en/views";
import type { Dict } from "../en";
import { euro, eulReul, eunNeun, iGa, ieyo } from "./common";

const L = "ko" as const;
const n = (x: number) => num(L, x);
const cn = (c: Country | CountryCode) => countryLabel(typeof c === "string" ? c : c.cc, L);
/** "국내"(한국) / 나라 이름(다른 나라). */
const dom = (c: Country) => (c.cc === "kr" ? "국내" : cn(c));
const REGION_WORD: Record<string, string> = { state: "주", province: "시·도", area: "지역", department: "도", prefecture: "도도부현", emirate: "토후국", canton: "칸톤", region: "지역", county: "주", city: "시" };
const rw = (c: Country) => REGION_WORD[c.regionNoun ?? "area"] ?? "지역";
const taxNote = (c: Country) => {
  if (c.cc === "ca") return "세전";
  const r = includedRate(c);
  const t = taxName(c);
  return r == null ? "판매세 없음" : `${t === "VAT" ? "부가세" : t === "consumption tax" ? "소비세" : t} ${r}% 포함`;
};
/** 제품 이름 속 영어 색상 이름을 한국어로("iPhone Duo 512GB Night Sky" → "… 나이트 스카이"). */
const COLORS = ["Night Sky", "Star White", "Black", "Burgundy", "Glacier", "Silver"];
const ko = (s: string) => COLORS.reduce((acc, col) => acc.replace(new RegExp(`\\b${col}\\b`), colorLabel(col, L)), s);
/** 장소 이름(한국어). */
const placeKo = (place: Place) => {
  const code = place.country ?? "us";
  if (place.level === "country") return code === "kr" ? "국내" : cn(code);
  if (place.level === "state") return regionLabel(code, place.state!, L);
  if (place.level === "city") return cityLabel(code, place.city!, L);
  return appleStoreLabel(place.store!, L);
};

/* ---------------------------------------------------------------- 재입고 시간 페이지 형식 */

const rtPct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : `${Math.round(x * 100)}%`);
const dateLabel = (ymd: string, weekday = true) => new Intl.DateTimeFormat("ko-KR", { timeZone: "UTC", month: "short", day: "numeric", ...(weekday ? { weekday: "short" as const } : {}) }).format(new Date(`${ymd}T12:00:00Z`)).replace(" (", "(");
const longDate = (ymd: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
const zoneStamp = (iso: string, c: Country) => stamp(L, iso, c.timeZone, c.cc !== "kr");
const hr = (h: number) => hourLabel(h, L);
/** "9–11시". */
const range = (from: number, to: number) => `${from}–${to % 24}시`;
const wd = (d: number) => weekdays(L)[d];
const local = (iso: string, store: Parameters<typeof localStamp>[1]) => localStamp(iso, store, L);
const yet = (x: RestockTimesMeta) => (x.t.n > 0 ? "" : "아직 ");
/** "국내"/나라 이름, 또는 지역·도시 페이지면 그 장소 이름("도쿄"). 뒤에 받침과 무관한 조사(에서/의)만 붙어요. */
const rtWhere = (x: { c: Country; place?: RestockTimesPlace }) => (x.place ? x.place.name : dom(x.c));
/** 매장이 한 곳인 나라처럼 나라 이름 그대로(cn) 쓰는 자리용. */
const rtName = (x: { c: Country; place?: RestockTimesPlace }) => (x.place ? x.place.name : cn(x.c));
/** "어디별" 단위: 나라 페이지는 지역 단위, 지역 페이지는 도시, 도시 페이지는 매장. */
const rtUnit = (x: { us: boolean; c: Country; place?: RestockTimesPlace }) => (x.place ? (x.place.kind === "region" ? "도시" : "매장") : x.us ? "주" : rw(x.c));

/* ---------------------------------------------------------------- 제품 × 장소 */

function productName(product: Product, short = false): string {
  const m = modelByKey(product.model)!;
  return `${short ? m.short : m.name}${product.storage ? ` ${product.storage}` : ""}${product.color ? ` ${colorLabel(product.color, L)}` : ""}`;
}

function productTitle(product: Product, place: Place, inStock: number): string {
  const code = place.country ?? "us";
  const name = productName(product);
  const short = productName(product, true);
  const w = placeKo(place);
  const k = place.stores.length;
  if (place.level === "country") {
    const where = code === "us" ? "미국" : w;
    return fitTitleW([
      ...(inStock > 0 ? [`${name} 재고: ${where} Apple Store ${n(inStock)}곳에 있음`] : []),
      `${name} ${where} 픽업 재고 실시간`,
      `${short} ${where} 픽업 재고`,
      `${short} 픽업 재고`,
    ]);
  }
  if (place.level === "store") {
    const s = place.store!;
    return fitTitleW([
      `${w} ${name} ${inStock > 0 ? "재고 있음" : "픽업 재고"}`,
      `${w} ${short} 재고 · ${cityLabel(code, s.city, L)}`,
      `${w} ${short} 재고`,
      `${storeLabel(s, L)} ${short} 재고`,
    ]);
  }
  return fitTitleW([
    `${w} ${name} 재고: ${n(k)}곳 중 ${n(inStock)}곳`,
    `${w} ${name} 픽업 재고`,
    `${w} ${short} 재고`,
    `${short} · ${w}`,
  ]);
}

function productDescription(product: Product, place: Place, inStock: number, stats: PlaceStats): string {
  const code = place.country ?? "us";
  const name = productName(product);
  const week = `이번 주 재입고 ${n(stats.week)}회`;
  if (place.level === "store") {
    const s = place.store!;
    const w = placeKo(place);
    return fitTitleW([
      `${w}${w.includes(cityLabel(code, s.city, L)) ? "" : `(${cityLabel(code, s.city, L)})`} ${name} 픽업 재고: ${inStock > 0 ? "지금 재고 있음" : "지금은 재고 없음"}, ${week}. 실시간 상태, 재입고 시간, 알림.`,
      `${w} ${name}: ${inStock > 0 ? "지금 재고 있음" : "지금 재고 없음"}, ${week}. 실시간 상태와 알림.`,
    ], 155);
  }
  const where = place.level === "country" ? (code === "us" ? "미국 Apple Store" : `${placeKo(place)} Apple Store`) : `${placeKo(place)} Apple Store`;
  return fitTitleW([
    `${name} 픽업 재고: ${where} ${n(place.stores.length)}곳 중 ${n(inStock)}곳에 지금 있음, ${week}. 매장별 실시간 재고, 재입고 시간, 알림.`,
    `${name}: ${where} ${n(place.stores.length)}곳 중 ${n(inStock)}곳에 있음, ${week}. 매장별 실시간 재고와 알림.`,
  ], 155);
}

function productFaq(product: Product, place: Place, lines: StoreLine[], stats: PlaceStats, clock: RestockStats, nearest: { name: string; city: string; distance: number } | null): FaqItem[] {
  const code = place.country ?? "us";
  const name = productName(product);
  const w = placeKo(place);
  const at = `${w}에서`;
  const dist = (miles: number) => distance(L, code, miles);
  const near = nearest ? `${nearest.city}의 Apple ${nearest.name}(${dist(nearest.distance)})` : "";
  const out: FaqItem[] = [];
  const inStock = lines.filter((l) => l.available.length > 0);
  if (place.level === "store") {
    const l = lines[0];
    out.push({
      q: `${w}에 ${name} 재고가 있나요?`,
      a: l && l.available.length > 0
        ? `네${product.parts.length > 1 ? `, ${list(L, l.available.map((i) => `${i.storage} ${colorLabel(i.color, L)}`), 4, (x) => `그 외 ${n(x)}개`)}` : ""}, 마지막 확인 기준이에요.`
        : `마지막 확인 기준으로는 없어요${nearest ? `. 재고가 있는 가장 가까운 매장은 ${ieyo(near)}` : ""}.`,
    });
  } else {
    out.push({
      q: `${name} 재고가 있는 ${w} Apple Store는 어디인가요?`,
      a: inStock.length === 0
        ? `마지막 확인 기준으로는 없어요${nearest ? `. 재고가 있는 가장 가까운 곳은 ${ieyo(near)}` : ""}.`
        : `마지막 확인 기준 ${n(inStock.length)}곳: ${list(L, inStock.map((x) => appleStoreLabel(x.store, L)), 4, (x) => `그 외 ${n(x)}곳`)}.`,
    });
  }
  const peak = peakOf(clock, L);
  out.push({
    q: `${at} ${eunNeun(name)} 얼마나 자주 재입고되나요?`,
    a: stats.month === 0 ? `최근 ${n(stats.days)}일 동안 ${at} 기록된 재입고가 없어요.` : `최근 ${n(stats.days)}일 동안 재입고 ${n(stats.month)}회, 이번 주 ${n(stats.week)}회${peak ? `. 대부분 현지 시간 ${peak.hour} 전후예요` : "예요"}.`,
  });
  if (stats.medianMs != null) out.push({ q: `${at} 재고는 얼마나 오래가나요?`, a: `다시 품절되기까지 약 ${fmtDuration(stats.medianMs, L)}(중앙값)이에요.` });
  return out;
}

function priceLabel(product: Product): string {
  const code = product.country ?? "us";
  const prices = catalogFor(product.model, code).filter((c) => product.parts.includes(c.partNumber)).map((c) => c.price);
  const lo = Math.min(...prices), hi = Math.max(...prices);
  const f = (v: number) => price(L, COUNTRIES[code], v);
  return lo === hi ? f(lo) : `${f(lo)}–${f(hi)}`;
}

/* ---------------------------------------------------------------- views */

export const views: Dict["views"] = {
  common: {
    inCountry: (c: Country) => dom(c),
    liveMap: "실시간 지도",
    restockLog: "재입고 기록",
    alertMe: "알림 받기",
    lastDays: (days: number) => <>최근 {n(days)}일</>,
    since: "2026년 11월 2일",
    sourcesWhere: (k: number, c: Country) => (k === 1 ? `${cn(c)}의 Apple Store` : `${dom(c)} Apple Store ${n(k)}곳 전체`),
    checker: (c: Country) => `${cn(c)} iPhone 재고 확인`,
    appleStoresIn: (c: Country) => `${cn(c)} Apple Store`,
    storesWithIt: "재고 있는 매장",
    more: "더 보기",
  },

  product: {
    title: productTitle,
    description: productDescription,
    faq: productFaq,
    priceLabel,
    inPlace: (name: string) => name,
    h1Country: (model: string, c: Country) => `${dom(c)} ${ko(model)} 픽업 재고`,
    h1Place: (model: string, where: string) => `${where} ${ko(model)} 재고`,
    inStockNow: "지금 재고",
    yes: "있음",
    no: "없음",
    pickup: "픽업",
    configurations: "구성",
    ofStores: (k: number) => `전체 ${n(k)}곳 중`,
    restocks24h: "24시간 재입고",
    restocksHint: (week: number, month: number, days: number) => `7일 ${n(week)} · ${n(days)}일 ${n(month)}`,
    sellOuts: (days: number) => `${n(days)}일 품절`,
    stays: (ms: number) => `~${fmtDuration(ms, L)} 유지`,
    noPairs: "아직 데이터 없음",
    lastRestock: "마지막 재입고",
    noneYet: "아직 없음",
    thisConfig: "이 구성",
    inDays: (days: number) => `최근 ${n(days)}일`,
    notInStockNow: "지금 재고 없음",
    configsInStock: (k: number, of: number) => <span>구성 {n(of)}개 중 <b className="text-ink">{n(k)}</b>개 재고 있음</span>,
    inStockAt: (k: number, of: number) => <span>매장 {n(of)}곳 중 <b className="text-ink">{n(k)}</b>곳에 재고</span>,
    checked: (live: ReactNode, p: string, tax: string) => <>{live} 확인 · {p}{tax}</>,
    taxNote,
    beforeTax: "세전",
    buyOnApple: "apple.com에서 구입하기",
    allStoresIn: (c: Country) => `${dom(c)} 전체 매장`,
    everyIphoneHere: "이곳의 모든 iPhone",
    everyIphone: (where: string) => `${where}의 모든 iPhone`,
    panel: (model: string, where: string | null) => `${where ? `${where} ` : ""}${ko(model)}: 구성과 매장을 체크하세요`,
    unitConfigs: "구성",
    unitStores: "매장",
    otherConfigsHere: "이곳의 다른 구성",
    byStorageColor: "용량·색상별",
    nearestStores: "가까운 매장",
    closest: (link: ReactNode, dist: string) => <>지금 재고 있는 가장 가까운 곳: {link} · {dist}</>,
    storeCity: (store: string, city: string) => <>{store}, {city}</>,
    mostRecentlyInStock: "최근 재고가 있었던 매장",
    storesWithItNow: "지금 재고 있는 매장",
    storesIn: (where: string) => `${where} 매장`,
    colStatus: "상태",
    colConfigs: "재고 있는 구성",
    noStoreHasIt: "지금 재고가 있는 매장이 없어요.",
    noStoreHereHasIt: "지금 이곳에는 재고가 있는 매장이 없어요.",
    moreStores: (k: number) => <>+{n(k)}곳 더: 지역별로 보세요.</>,
    byRegion: (c: Country) => `${rw(c)}별`,
    byCity: "도시별",
    nearbyStores: "주변 매장",
    latestChanges: "최근 변화",
    nothingLogged: "아직 기록이 없어요.",
    whenRestocks: "재입고 시간",
    howFast: "품절까지 걸리는 시간",
    restocksByConfig: "구성별 재입고",
    faqTitleCountry: (model: string, c: Country) => `${dom(c)} ${ko(model)}: 자주 묻는 질문`,
    faqTitle: (model: string, where: string) => `${where} ${ko(model)}`,
    buySource: (model: string, c: Country) => `Apple: ${ko(model)} 구입하기(${cn(c)})`,
    nearby: "주변",
    otherRegions: (c: Country) => `다른 ${rw(c)}`,
    elsewhereIn: (region: string) => `${region}의 다른 곳`,
    everyAppleStoreIn: (c: Country) => `${dom(c)} 전체 Apple Store`,
    across: (model: string, c: Country) => `${c.cc === "us" ? "미국" : dom(c)} 전역 ${ko(model)}`,
    itemList: (model: string, where: string) => `${where} ${ko(model)}`,
    nearLead: (c: Country, model: string, inStock: number, k: number, have: { store: string; city: string; configs: number }[]) =>
      inStock === 0
        ? `지금 ${eulReul(ko(model))} 매장 픽업할 수 있는 ${dom(c)} Apple Store는 없어요. 그래서 ‘내 주변’은 어느 매장이 먼저 재입고되느냐의 문제예요. 갈 수 있는 매장에 알림을 걸어 두면 한 곳에 뜨는 순간 몇 초 안에 푸시를 보내요.`
        : `${n(k)}곳 중 ${n(inStock)}곳에 지금 ${iGa(ko(model))} 있어요: ${list(L, have.slice(0, 5).map((l) => `${l.city}의 ${l.store}(구성 ${n(l.configs)}개)`), 5)}.`,
    nearHead: (c: Country) => [rw(c), "지금 재고 있는 매장"],
    nearCaption: (c: Country, model: string) => `${rw(c)}별 ${ko(model)} 픽업 재고, 마지막 확인 기준`,
    nearMe: (c: Country, model: string, alert: string) => `내 위치에서 모든 매장을 가까운 순으로 보려면 이 페이지의 알림 설정을 열고 ‘내 주변’을 누르세요. 거리는 도로 기준 km 추정치이고, 매장마다 길찾기가 연결돼요. [${ko(model)} 알림 설정](${alert}).`,
    modelFaq: (c: Country, model: string, low: number, high: number, inStock: number): { price: FaqItem; reserve: FaqItem } => {
      const money = (v: number) => price(L, c, v);
      const m = ko(model);
      return {
        price: { q: `${dom(c)} ${m} 가격은 얼마인가요?`, a: `apple.com에서 용량에 따라 ${money(low)}부터 ${money(high)}까지예요(${taxNote(c)}).` },
        reserve: { q: `${dom(c)}에서 ${eulReul(m)} 픽업 예약할 수 있나요?`, a: `아니요. 매장에 구성이 뜨면 apple.com에서 매장 픽업을 선택해 구입하고, 고른 픽업 시간대까지 보관돼요.${inStock === 0 ? " 지금은 재고가 있는 매장이 없으니, 가장 먼저 알려면 알림이 답이에요." : ""}` },
      };
    },
  },

  restocks: {
    metaTitle: (c: Country, k: number) => `${dom(c)} iPhone 재입고 기록: ${k === 1 ? "Apple Store" : `Apple Store ${n(k)}곳 전체`} 실시간`,
    metaDescription: (c: Country) => `${dom(c)} Apple Store의 iPhone Duo, 18 Pro, Pro Max 매장 픽업 재입고를 모두 기록해요. 정확한 시각, 구성, 지도와 함께.`,
    h1: (c: Country) => `${dom(c)} 재입고 기록`,
    summary: (day: number, week: number, model?: string, region?: string) => <>24시간 재입고 {n(day)}회 · 이번 주 {n(week)}회{model ? ` · ${model}` : ""}{region ? ` · ${region}` : ""}. 시간은 내 시간대 기준이에요.</>,
    allModels: "전체 모델",
    restocks: "재입고",
    withSoldOut: "재입고 + 품절",
    regionLabel: (c: Country) => rw(c),
    allRegions: (c: Country) => `전체 ${rw(c)}`,
    filter: "필터",
    page: (k: number) => <>{n(k)}페이지</>,
    newer: "← 최신",
    older: "이전 →",
    getAlerts: "알림 받기",
    byPlace: "장소별 재입고",
    byRegion: (c: Country) => `${rw(c)}별`,
    datasetName: (c: Country) => `${dom(c)} Apple Store iPhone 픽업 재입고 기록`,
    datasetDescription: (c: Country) => `${c.cc === "us" ? "미국 Apple Store 269곳 전체" : `${dom(c)} Apple Store`}에서 iPhone Duo, iPhone 18 Pro, iPhone 18 Pro Max의 매장 픽업 재입고와 품절을 매장, 정확한 구성, 시각과 함께 모두 기록한 데이터예요. apple.com 응답 두 번이 일치할 때만 재입고로 기록하며, 15초마다(알림 매장은 5초마다) 확인해요.`,
    datasetMeasured: ["Apple Store", "iPhone 모델, 용량, 색상", "재입고 시각", "품절 시각"],
  },

  map: {
    metaTitle: (c: Country, k: number) => `iPhone Duo 픽업 재고 지도: ${dom(c)} ${k === 1 ? "Apple Store" : "Apple Store 전체"} 실시간`,
    metaDescription: (c: Country, k: number) => `${k === 1 ? `${cn(c)}의 Apple Store` : `${dom(c)} Apple Store ${n(k)}곳 전체`}의 지금 iPhone Duo, 18 Pro, Pro Max 매장 픽업 재고를 용량·색상별로 보여 주는 실시간 지도.`,
    country: (c: Country) => ({ name: c.name, inName: c.inName, regionNoun: c.regionNoun, regionNounPlural: c.regionNounPlural }),
    everyStore: "전체 매장",
    storeCity: (store: string, city: string) => `${store} · ${city}`,
  },

  storesIndex: {
    metaDescription: (c: Country, k: number, regions: number, cities: number, duo: number, max: number) => {
      const by = c.regionNoun && regions > 1 ? `${rw(c)}·도시별` : cities > 1 ? "도시별" : "";
      return `${dom(c)} Apple Store ${n(k)}곳 전체${by ? `(${by})` : ""}의 iPhone Duo, 18 Pro, Pro Max 실시간 픽업 재고: 지금 Duo는 ${n(duo)}곳, Pro Max는 ${n(max)}곳에 있어요.`;
    },
    countAnswer: (k: number, spread: string, top: { name: string; count: number }[]) =>
      `${n(k)}곳이에요: ${spread}.${top.length && !spread.includes(top[0].name) ? ` ${iGa(top[0].name)} 가장 많고(${n(top[0].count)}곳)${top[1] ? `, 그다음은 ${top[1].name}(${n(top[1].count)}곳)이에요` : "요"}.` : ""}`,
    howMany: (c: Country) => <>{dom(c)}에는 Apple Store가 몇 곳 있나요?</>,
    duoNow: (c: Country, k: number, have: Store[]): FaqItem => ({
      q: `지금 iPhone Duo 재고가 있는 ${dom(c)} Apple Store는 어디인가요?`,
      a: have.length === 0
        ? `마지막 확인 기준 ${n(k)}곳 모두 없어요. 한 곳에라도 뜨는 순간 이 페이지와 지도가 바뀌고, 알림이 가장 먼저 알려 드려요.`
        : `마지막 확인 기준 ${n(k)}곳 중 ${n(have.length)}곳: ${have.slice(0, 6).map((x) => appleStoreLabel(x, L)).join(", ")}${have.length > 6 ? " 등" : ""}.`,
    }),
    faq: (ctx: FaqContext) => placeFaq({ ...ctx, place: ctx.place === cn("kr") ? "국내" : ctx.place, omit: [...(ctx.omit ?? []), "count", "stock", "lasts"] }, L),
    duoBlock: (alert: string) => `가장 빨리 구하는 방법은 갈 수 있는 매장에 알림을 거는 거예요: [iPhone Duo 알림 설정](${alert}). 매장 × 정확한 구성 하나가 알림 하나이고, 매장에 뜨면 몇 초 안에 푸시를 보내요.`,
    intro: (c: Country, k: number, spread: string, now: { duo: number; max: number; pro: number }, tax: string) =>
      `${dom(c)}에는 **Apple Store ${n(k)}곳**이 있어요(${spread}). 지금 이 중 **${n(now.duo)}곳**에서 iPhone Duo를, **${n(now.max)}곳**에서 iPhone 18 Pro Max를, **${n(now.pro)}곳**에서 18 Pro를 매장 픽업할 수 있어요. ${tax}`,
    crumb: "Apple Store",
    panel: (c: Country) => `iPhone을 고르고 갈 수 있는 ${dom(c)} 매장을 체크하세요`,
    matrixLabel: "매장별 재고",
    matrixH2: (c: Country) => <>{dom(c)} 전체 Apple Store 재고</>,
    matrixHint: "모델별 지금 재고 있음 / 확인 중인 구성.",
    topCaption: (c: Country) => <>Apple Store가 많은 {rw(c)}(Apple 매장 목록 기준)</>,
    regionHead: (c: Country) => rw(c),
    colStores: "Apple Store",
    colCities: "도시",
    locationsBy: (c: Country) => `${rw(c)}별 Apple Store 위치`,
    locationsIn: (c: Country) => `${dom(c)} Apple Store 위치`,
    storeCount: (k: number) => <>매장 {n(k)}곳</>,
    storeCountAll: (k: number) => <>매장 {n(k)}곳</>,
    whenRestock: (c: Country) => <>{dom(c)} 매장은 언제 재입고되나요?</>,
    howFast: (c: Country) => <>{dom(c)} 재입고는 얼마나 빨리 품절되나요?</>,
    faqTitle: (c: Country) => `${dom(c)} Apple Store: 자주 묻는 질문`,
    getApp: "앱 설치",
    howItWorks: "작동 방식",
    pricing: "요금제",
  },

  restockTimes: {
    fmt: {
      n,
      pct: rtPct,
      date: dateLabel,
      longDate,
      zoneStamp,
      local,
      hour: hr,
      range,
      weekday: wd,
      store: (s: Store) => appleStoreLabel(s, L),
      storeWithPlace: (s: Store) => `${appleStoreLabel(s, L)}(${cityLabel(s.country ?? "us", s.city, L)})`,
    },
    title: (c: Country, place?: RestockTimesPlace) => `${place?.name ?? dom(c)} iPhone Duo(아이폰 듀오)는 언제 재입고될까?`,
    metaDescription: (x: RestockTimesMeta) => {
      const { c, t, w, pattern } = x;
      const region = x.place ? (x.place.kind === "region" ? "도시" : null) : c.cc === "us" ? "주" : rw(c);
      const where = rtWhere(x);
      /** "시간·날짜·주·매장·구성"; 도시 페이지는 날짜와 매장 사이에 단위가 없어요. */
      const by = region ? `${region}·매장` : "매장";
      const since = dateLabel(t.since, false);
      return t.n > 0 && pattern
        ? fitTitleW([
          `${where} Apple Store iPhone Duo 재입고 ${n(t.n)}회(${since} 이후): ${rtPct(w.share)}가 현지 시간 ${range(w.from, w.to)}에 몰렸고${t.sellout ? `, ${rtPct(t.sellout.within2min)}는 2분 안에 품절` : ""}. 시간·날짜·${by}·구성별 표.`,
          `${where} Apple Store iPhone Duo 재입고 ${n(t.n)}회(${since} 이후): ${rtPct(w.share)}가 현지 시간 ${range(w.from, w.to)}. 시간·날짜·${region ?? "매장"}·구성별 표.`,
          `${where} iPhone Duo 재입고 시간: ${since} 이후 ${n(t.n)}회, 시간·날짜·${region ?? "매장"}·구성별.`,
        ], 158)
        : t.n > 0
          ? fitTitleW([
            `${since} 이후 ${where} Apple Store에서 확인된 iPhone Duo 재입고 ${n(t.n)}회. ${SPEED.checkSec}초마다 직접 확인한 데이터를 현지 시간·날짜·${by}·구성별로, 얼마나 갔는지까지.`,
            `${where} iPhone Duo 재입고 시간: ${since} 이후 확인된 재입고 ${n(t.n)}회, 시간·날짜·${region ?? "매장"}·구성별.`,
          ], 158)
          : `${where} Apple Store의 iPhone Duo 재입고 시간. ${longDate(t.since)}부터 PickupChecker가 ${SPEED.checkSec}초마다 직접 확인한 데이터를 시간·날짜·매장·구성별로.`;
    },
    h1: (x: RestockTimesView) => x.t.unknown
      ? `${rtWhere(x)}에서 iPhone Duo는 언제 재입고되나요?`
      : x.t.n > 0
        ? `${rtWhere(x)} iPhone Duo 재입고, 아직 계속될까요? 네, 시간대별로 보여 드려요`
        : `${rtWhere(x)} iPhone Duo, 재입고되고 있을까요? 저희 확인으로는 아직이에요`,
    intro: (x: RestockTimesView) => {
      const { t, one, tracked, pattern, w } = x;
      const where = one ? `${rtName(x)}의 Apple Store` : `${rtWhere(x)} Apple Store`;
      return t.unknown ? (
        <>재입고 기록을 지금은 읽지 못했어요. {rtWhere(x)} 매장은 계속 {SPEED.checkSec}초마다 확인 중이고, 다음에 불러오면 수치가 다시 나와요.</>
      ) : t.n > 0 ? (
        <>
          <b className="text-ink">네.</b> {where}에서 iPhone Duo는 <b className="text-ink">{longDate(t.since)} 이후 {n(t.n)}회</b> 재입고됐어요{tracked > 1 ? <>(추적한 {n(tracked)}일 중 {n(t.days)}일)</> : <>(아직 추적 1일째)</>}
          {pattern && <>. 그중 <b className="text-ink">{rtPct(w.share)}가 매장 현지 시간 {range(w.from, w.to)}</b>에 들어왔어요</>}.
        </>
      ) : (
        <>
          <b className="text-ink">저희 확인으로는 아직이에요.</b> PickupChecker는 {longDate(t.since)}부터 {one ? `${rtName(x)}의 Apple Store` : `${rtWhere(x)} Apple Store ${n(x.stores)}곳 전체`}를 {SPEED.checkSec}초마다 확인했지만, 확인된 iPhone Duo 매장 픽업 재입고는 아직 없어요.
        </>
      );
    },
    hero: {
      restocks: (x: RestockTimesView) => `${dateLabel(x.t.since, false)} 이후 확인된 재입고`,
      window: (x: RestockTimesView) => `매장 현지 시간 ${range(x.w.from, x.w.to)}`,
      days: "재입고가 1회 이상 있었던 날",
      // 영어 원문이 문자열 리터럴 타입이라 한국어 문장으로 단언해요.
      now: ((one: boolean): string => (one ? "지금 픽업 가능" : "지금 픽업 가능한 매장")) as Dict["views"]["restockTimes"]["hero"]["now"],
      today: (x: RestockTimesView, today: DayRow) => `오늘 ${dateLabel(today.date)} 지금까지${x.one ? "" : ` · 매장 ${n(today.stores)}곳`}`,
      weekday: "지금까지 가장 많은 요일",
    },
    heroPoints: (x: RestockTimesView, latest: { config: string; store: Store; at: string } | null): Point[] => [
      ...(latest ? [{ text: <>가장 최근: <b className="text-ink">{latest.config}</b>{x.one ? null : <>, <Link href={storePath(latest.store)} className="underline underline-offset-2">{appleStoreLabel(latest.store, L)}</Link></>}, 현지 시간 {local(latest.at, latest.store)}</> }] : []),
      ...(x.t.peakWeekday != null ? [{ text: <>가장 잦은 요일: <b className="text-ink">{wd(x.t.peakWeekday)}</b></> }] : []),
      { text: <>Apple은 <b className="text-ink">재입고 일정을 공개하지 않아요</b>. 이 수치는 저희가 직접 확인한 것이고, 약 5분마다 업데이트돼요</>, no: true },
    ],
    emptyPoints: (x: RestockTimesView): Point[] => [
      { text: <>지금 <b className="text-ink">{n(x.stores)}곳 중 {n(x.duoNow)}곳</b>에서 픽업 가능</> },
      { text: <>아래 표는 첫 재입고가 확인되면 채워져요</>, step: true },
      { text: <>데이터가 가장 많은 시간·요일 패턴: <Link href="/iphone-duo-restock-times" className="underline underline-offset-2">미국 페이지(영문)</Link></>, step: true },
    ],
    keyFactsTitle: "핵심 사실",
    keyFacts: (x: RestockTimesView, k: { top: { label: string; restocks: number } | null; latest: { config: string; store: Store; at: string } | null }): string[] => {
      const { t, w, sell } = x;
      const wh = rtWhere(x);
      const since = `${dateLabel(t.since, false)}부터`;
      const peak = t.peakHour;
      return [
        `PickupChecker는 ${longDate(t.since)}부터 ${wh}의 ${x.one ? "Apple Store" : `Apple Store ${n(x.stores)}곳`}에서 iPhone Duo 재입고를 ${n(t.n)}회 확인했어요(추적한 ${n(x.tracked)}일 중 ${t.days}일).`,
        ...(x.pattern
          ? [`${since} ${wh}에서 확인된 iPhone Duo 재입고 ${n(t.n)}회 중 ${rtPct(w.share)}가 매장 현지 시간 ${range(w.from, w.to)}에 들어왔어요.`]
          : [`PickupChecker는 ${PATTERN_MIN_DAYS}일 이상에 걸쳐 재입고가 ${PATTERN_MIN}회 이상 쌓여야 ${wh}의 iPhone Duo ‘보통 재입고 시각’을 밝혀요. 지금까지의 ${n(t.n)}회로는 아직 부족해요.`]),
        ...(x.pattern && peak != null ? [`${wh}에서 iPhone Duo 재입고가 가장 많았던 한 시간은 현지 시간 ${range(peak, peak + 1)}로, ${n(t.n)}회 중 ${n(t.byHour[peak])}회(${rtPct(t.byHour[peak] / t.n)})예요.`] : []),
        ...(sell ? [`${wh}에서 재입고된 iPhone Duo가 Apple 픽업 페이지에 떠 있던 시간의 중앙값은 ${n(sell.medianSec)}초예요(${since} 측정한 ${n(sell.n)}회). 판매 대수가 아니라 노출 시간이에요.`] : []),
        ...(k.top && k.top.restocks > 0 ? [`${wh}에서 가장 많이 재입고된 iPhone Duo 구성: ${k.top.label}, ${since} 재입고 ${n(t.n)}회 중 ${n(k.top.restocks)}회(${rtPct(k.top.restocks / t.n)}).`] : []),
        ...(k.latest ? [`${wh}에서 확인된 가장 최근 iPhone Duo 재입고: ${k.latest.config}${x.one ? "" : `, ${appleStoreLabel(k.latest.store, L)}`}, 매장 현지 시간 ${local(k.latest.at, k.latest.store)}.`] : []),
        `${zoneStamp(t.at, x.c)} 기준: ${wh}의 재입고는 Apple 픽업 페이지를 두 번 확인해 결과가 일치할 때만 세고, 추적 공백 뒤 처음 보인 재고는 세지 않아요.`,
      ];
    },
    setUpAlert: "iPhone Duo 알림 설정하기",
    logLive: "실시간 재입고 기록",
    onThisPage: "이 페이지 목차",
    nav: (x: RestockTimesView): Record<string, string> => ({
      "time-of-day": "시간대",
      "day-by-day": "날짜별",
      where: `${rtUnit(x)}별`,
      configuration: "구성",
      "how-long": "유지 시간",
      unavailable: "왜 픽업 불가일까",
      reddit: "Reddit vs 데이터",
      method: "집계 방법",
    }),
    h2: (x: RestockTimesView): Record<string, string> => ({
      "time-of-day": `${rtWhere(x)}에서 iPhone Duo는 하루 중 언제 재입고되나요?`,
      "day-by-day": `${rtWhere(x)}에서 iPhone Duo가 재입고된 날은 언제인가요?`,
      where: `${rtWhere(x)}에서 iPhone Duo가 가장 많이 재입고되는 Apple Store는?`,
      configuration: `${rtWhere(x)}에서 가장 많이 재입고되는 iPhone Duo 구성은?`,
      "how-long": `${rtWhere(x)}에서 iPhone Duo 재입고는 얼마나 가나요?`,
      unavailable: "왜 모든 Apple Store가 ‘픽업 불가’로 나오나요?",
      reddit: "Reddit에서 말하는 iPhone Duo 재입고, 그리고 데이터가 말하는 것",
      method: "PickupChecker는 재입고를 어떻게 세나요?",
    }),
    faq: (x: RestockTimesView): Faq[] => {
      const { t, w, pattern, sell, us, weekend, tracked } = x;
      const where = rtWhere(x);
      const win = range(w.from, w.to);
      return [
        { q: `${where}에서 iPhone Duo는 언제 재입고되나요?`, a: t.n > 0 && pattern
          ? `주로 오전이에요. ${longDate(t.since)} 이후 확인된 재입고 ${n(t.n)}회 중 ${rtPct(w.share)}가 매장 현지 시간 ${win}에, ${rtPct(hourShare(t.byHour, 8, 12))}가 오전 8시~정오에 들어왔어요. Apple은 일정을 공개하지 않아요. 이건 PickupChecker가 관찰한 패턴이고, 약 5분마다 업데이트돼요.`
          : `Apple은 일정을 공개하지 않아요. PickupChecker는 ${longDate(t.since)} 이후 ${where}에서 확인된 재입고 ${n(t.n)}회${t.days ? `(${n(t.days)}일)` : ""}를 기록했어요. 서로 다른 ${PATTERN_MIN_DAYS}일에 걸쳐 재입고가 ${PATTERN_MIN}회 쌓이면 보통 시간대를 알려 드리고, 이 페이지는 자동으로 채워져요.` },
        { q: `${us ? "" : `${where}에서 `}주말에도 iPhone Duo가 재입고되나요?`, a: t.n > 0
          ? `${weekend > 0 ? "지금까지는 네" : "아직 데이터에는 없어요"}: ${n(t.n)}회 중 ${n(weekend)}회(${rtPct(weekend / t.n)})가 토요일이나 일요일이었어요. ${t.peakWeekday != null ? `가장 많은 요일은 ${ieyo(wd(t.peakWeekday))}.` : `가장 많은 요일은 데이터가 ${WEEKDAY_MIN_SPAN}일 이상 쌓여야 알려 드려요. 지금은 ${n(tracked)}일치예요.`}`
          : `${where}의 주말 데이터는 아직 없어요. 재입고가 확인되는 대로 이 페이지의 날짜별 표가 채워져요.` },
        { q: "언제부터 확인하면 되나요?", a: t.n > 0 && pattern
          ? `직접 확인한다면 현지 시간 ${hr(w.from)}부터 매장 픽업을 고른 apple.com 화면을 열어 두세요. 이 2시간에 재입고의 ${rtPct(w.share)}가 몰렸어요. 재입고는 보통 ${sell ? `중앙값 ${n(sell.medianSec)}초 만에 사라지니` : "1분 안팎이면 끝나니"}, ${SPEED.fastSec}초마다 확인하는 알림([알림 작동 방식(영문)](/iphone-duo-stock-alerts))이 새로고침으로는 못 하는 일을 해요.`
          : `${where}의 패턴이 뚜렷해지기 전까지는 알림에 맡기세요. 고른 매장을 24시간 내내 ${SPEED.fastSec}초마다 확인해요([알림 작동 방식(영문)](/iphone-duo-stock-alerts)).` },
        { q: "왜 모든 Apple Store에서 iPhone Duo가 ‘픽업 불가’로 나오나요?", a: sell
          ? `재입고가 짧기 때문이에요. ${where}에서 품절까지 측정한 재입고 ${n(sell.n)}회 중 ${rtPct(sell.within2min)}가 2분 안에, ${rtPct(sell.within20min)}가 20분 안에 사라졌어요. 지금은 ${n(x.stores)}곳 중 ${n(x.duoNow)}곳에 있어요. 재입고가 수십 번 있는 날에도 거의 모든 순간 apple.com의 정직한 답은 ‘픽업 불가’예요([‘픽업 불가’의 뜻(영문)](/apple-store-pickup-availability-explained)).`
          : `픽업 재고는 몇 분씩만 뜨기 때문이에요. 지금 ${where} 매장 ${n(x.stores)}곳 중 ${n(x.duoNow)}곳에 있어요([‘픽업 불가’의 뜻(영문)](/apple-store-pickup-availability-explained)).` },
        { q: "내 Apple Store에 iPhone Duo가 재입고되면 어떻게 알림을 받나요?", a: `매장과 정확한 용량·색상으로 알림을 설정하세요. 그때부터 그 매장은 ${SPEED.fastSec}초마다 확인되고, 재입고가 확인되면 약 ${SPEED.alertSec}초 뒤 푸시를 발송해요. 휴대폰에 뜨는 시점은 기기와 네트워크에 따라 달라요([알림 설정](${x.alert}); [작동 방식(영문)](/how-it-works)).` },
      ];
    },
    sources: {
      applePickup: "Apple: 배송 및 픽업(매장 픽업 재고가 표시되는 방식)",
      newsroom: "Apple Newsroom: iPhone Duo, 전 세계 Apple Store 출시(2026년 10월 23일)",
      macRumors: "MacRumors: 미국·캐나다에서 iPhone Duo Apple Store 픽업 재개(2026년 10월 24일)",
      reports: (tracker: string) => `${tracker}: 출시 주간 iPhone Duo 재입고 제보(해당 사이트의 관찰, 따로 표시하고 집계에 넣지 않음)`,
    },
    ld: (x: RestockTimesView) => ({
      datasetName: `${rtWhere(x)} Apple Store iPhone Duo 재입고 시간`,
      description: `${rtWhere(x)} Apple Store의 iPhone Duo 매장 픽업 재입고를 ${x.t.since}부터 매장, 구성, 시각과 함께 모두 기록한 데이터. PickupChecker가 ${SPEED.checkSec}초마다 확인했고, 현지 시간, 날짜, ${x.place?.kind === "city" ? "" : `${rtUnit(x)}, `}매장, 구성별로 요약했어요.`,
      spatial: `${rtName(x)} Apple Store`,
      measured: ["재입고 시각(매장 현지)", "Apple Store", "iPhone Duo 용량·색상", "품절까지 걸린 초"],
      size: `매장 ${n(x.t.stores)}곳, 재입고 ${n(x.t.n)}회`,
    }),
    crumb: "iPhone Duo 재입고 시간",

    timeLead: (x: RestockTimesView) => <b>재입고 {n(x.t.n)}회 중 {rtPct(x.w.share)}가 매장 현지 시간 {range(x.w.from, x.w.to)}에, {rtPct(hourShare(x.t.byHour, 8, 12))}가 오전 8시~정오에 들어왔어요.</b>,
    busiestHour: (count: number) => `가장 많은 한 시간: 재입고 ${n(count)}회`,
    morning: "오전 8시~정오",
    evening: "오후 5시 이후: 저녁도 비어 있지 않아요",
    night: "자정~오전 6시",
    tooFew: (x: RestockTimesView) => <b>시간대를 말하기엔 {yet(x)}날짜가 적어요: {longDate(x.t.since)} 이후 {n(x.t.days)}일 동안 확인된 재입고 {n(x.t.n)}회.</b>,
    tooFewKeys: (): Point[] => [
      { text: <>보통 시간대는 <b className="text-ink">서로 다른 {PATTERN_MIN_DAYS}일에 걸친 재입고 {PATTERN_MIN}회</b>가 있어야 말해요</> },
      { text: <>한 번에 몰린 재입고 10회 = 한 번의 이벤트, 습관이 아니에요</>, no: true },
      { text: <>날짜가 쌓이면 이 페이지가 알아서 다시 써져요</>, step: true },
    ],
    hourCaption: (x: RestockTimesView) => `${rtWhere(x)} iPhone Duo 재입고, 매장 현지 시각별, ${dateLabel(x.t.since, false)}부터 오늘까지(재입고 ${n(x.t.n)}회)`,
    hourHead: ["현지 시각", "재입고", "비율"],
    morningKeys: (x: RestockTimesView): Point[] => [
      { text: <>오전에 몰리는 건 <b className="text-ink">매장 문이 열려서가 아니에요</b>{x.us ? ": 미국 Apple Store는 대부분 오전 10시에 열어요" : ""}</> },
      { text: <>픽업 재고는 셔터가 올라가기 전 <b className="text-ink">온라인</b>으로 풀려요</> },
      { text: <>직접 볼 거라면: 평일 오전 <b className="text-ink">{range(x.w.from, x.w.to)}</b></>, step: true },
      { text: <>아무도 새로고침하지 않는 <b className="text-ink">나머지 22시간</b>은 <Link href={x.alert}>알림</Link>에 맡기세요</>, step: true },
    ],
    storeChartKeys: (x: RestockTimesView): Point[] => [{ text: <>매장 페이지마다 그 매장 시간대 기준 차트가 따로 있어요(<Link href={x.storesHref}>{x.us ? "주별 Apple Store" : `${rtWhere(x)} 매장`}</Link>). 다들 9시에 몰리는 지역에서 8시에 재입고되는 매장이라면 알아 둘 만해요</>, step: true }],

    dayLead: (x: RestockTimesView) => {
      const { t, tracked, one } = x;
      return t.n > 0 && tracked === 1 ? (
        <b>추적 1일째인 {dateLabel(t.daily[t.daily.length - 1]?.date ?? t.since)}, {one ? "" : `매장 ${n(t.stores)}곳에서 `}확인된 재입고 {n(t.n)}회.</b>
      ) : t.n > 0 ? (
        <b>{t.days === tracked ? `추적한 ${n(t.days)}일 모두` : `${longDate(t.since)} 이후 ${n(tracked)}일 중 ${n(t.days)}일`} 확인된 재입고가 1회 이상 있었어요.{t.peakWeekday != null ? ` 가장 많은 요일은 ${ieyo(wd(t.peakWeekday))}.` : ""}</b>
      ) : (
        <b>{longDate(t.since)} 이후 {rtWhere(x)}에서 확인된 재입고가 없어요.</b>
      );
    },
    daysTracked: "재입고가 1회 이상 있었던 추적일",
    busiestDay: (x: RestockTimesView, day: DayRow) => `가장 많았던 날 · ${dateLabel(day.date)}${x.one ? "" : ` · 매장 ${n(day.stores)}곳`}`,
    busiestDayNone: "가장 많았던 날",
    drop: (x: RestockTimesView, drop: { at: string; restocks: number }) => `30분 안에 재입고된 매장 수, ${zoneStamp(drop.at, x.c)}(구성 ${n(drop.restocks)}개): 밖에서 본 전국 단위 물량 풀림`,
    weekend: (x: RestockTimesView) => `토·일요일(재입고 ${n(x.weekend)}회)`,
    dayCaption: (x: RestockTimesView) => `${rtWhere(x)} iPhone Duo 재입고, 날짜별${x.t.reports.length ? "; ‘제보’ 표시 행은 저희 추적이 시작되기 전 날짜에 다른 트래커가 공개한 관찰로, 타임라인 참고용이에요" : ""}`,
    dayHead: { date: "날짜", restocks: "재입고", stores: "매장", busiest: "가장 많은 시간", source: "출처" },
    soFar: " · 지금까지",
    reportedBy: (names: string[]) => <>{names.join(" / ")} 제보</>,
    dayKeys: (x: RestockTimesView, launch: string, resumed: string): Point[] => [
      { text: <><b className="text-ink">{dateLabel(launch)}</b>: 출시일, 온라인 주문용 첫 물량</> },
      { text: <><b className="text-ink">{dateLabel(resumed)}</b>: 픽업 예약 재개{x.us ? " (MacRumors)" : ""}</> },
      x.t.reports.length
        ? { text: <>‘제보’ 표시 행: {x.reportNames.join(", ")}의 출시 주간 관찰, 집계에는 넣지 않음</> }
        : { text: <>{rtWhere(x)} 전체 매장 기록은 <b className="text-ink">{longDate(x.t.since)}</b>부터예요</> },
      ...(x.t.n > 0 && x.t.peakWeekday == null ? [{ text: <>가장 많은 요일: 데이터가 <b className="text-ink">{WEEKDAY_MIN_SPAN}일</b> 이상 쌓이면 알려 드려요(지금 {n(x.tracked)}일)</>, no: true }] : []),
      { text: <><b className="text-ink">매장</b> 열을 보세요: 재입고 수가 같아도 매장이 많을수록 나에게 좋은 날이에요</>, step: true },
    ],

    whereLead: (x: RestockTimesView, hit: { name: string; restocks: number; stores: number; storesTotal: number }[], total: number) => (
      <b>{hit[0].name}: {dateLabel(x.t.since, false)} 이후 매장 {n(hit[0].storesTotal)}곳 중 {n(hit[0].stores)}곳에서 재입고 {n(hit[0].restocks)}회{hit[1] ? <>, 그다음 {hit[1].name}({n(hit[1].restocks)}회)</> : null}{hit[2] ? <>, {hit[2].name}({n(hit[2].restocks)}회)</> : null}. {rtUnit(x)} {n(total)}곳 중 {n(hit.length)}곳에서 재입고가 1회 이상 있었어요{total - hit.length > 0 ? `, ${n(total - hit.length)}곳은 아직 없어요` : ""}.</b>
    ),
    whereNone: (x: RestockTimesView) => <b>{rtWhere(x)}의 어느 {rtUnit(x)}에서도 아직 확인된 재입고가 없어요. 첫 재입고부터 표가 채워져요.</b>,
    regionCaption: (x: RestockTimesView) => `${rtWhere(x)} ${rtUnit(x)}별 확인된 iPhone Duo 재입고, ${dateLabel(x.t.since, false)}부터 오늘까지`,
    regionHead: (x: RestockTimesView) => [rtUnit(x), "재입고", "재입고된 매장", "마지막 재입고(현지 시간)"],
    ofN: (a: number, b: number) => <>{n(b)}곳 중 {n(a)}곳</>,
    storesCaption: (x: RestockTimesView) => `${rtWhere(x)}에서 iPhone Duo 재입고가 가장 많은 매장, ${dateLabel(x.t.since, false)}부터 오늘까지`,
    storesHead: ["매장", "재입고", "일수", "보통 시간대", "마지막(현지 시간)"],
    swaps: (x: RestockTimesView) => [
      { no: "어디에 있든 재입고가 가장 많은 매장", yes: `${x.pattern ? hr(x.w.from) : "오전"}에 1시간 안에 갈 수 있는 매장 2~3곳`, why: "갈 수 없는 매장의 재입고는 재입고가 아니에요. 가장 바쁜 매장도 하루 중 몇 분을 빼면 ‘픽업 불가’예요." },
      { no: "매장 한 곳에 운 맡기기", yes: "매장마다 알림을 걸고, 울린 곳으로 가기", why: "횟수 표는 내 매장 중 어디로 먼저 갈지만 알려 줘요." },
    ],
    nearMe: "지금 내 주변에서 Duo가 있는 매장",

    configLead: (x: RestockTimesView, top: { label: string; restocks: number }, rarest: { label: string; restocks: number } | null) => (
      <b>{top.label}: 재입고 {n(x.t.n)}회 중 {n(top.restocks)}회({rtPct(top.restocks / x.t.n)}){rarest ? `. 가장 드문 건 ${euro(rarest.label)} ${n(rarest.restocks)}회` : ""}.</b>
    ),
    mostRestocked: (config: string) => `${config}: 가장 많이 재입고된 구성`,
    versus: (a: string, bCount: number, b: string) => `${a} 재입고(${eunNeun(b)} ${n(bCount)}회)`,
    restocksOf: (a: string) => `${a} 재입고`,
    byStorage: "용량별",
    byColour: "색상별",
    configNone: (x: RestockTimesView) => <b>{rtWhere(x)}에서 확인된 재입고가 있는 구성이 {yet(x)}없어요. 첫 재입고가 들어갈 자리로 8개 구성을 모두 나열해 뒀어요.</b>,
    configCaption: (x: RestockTimesView) => `${rtWhere(x)} 구성별 확인된 iPhone Duo 재입고, ${dateLabel(x.t.since, false)}부터 오늘까지`,
    configHead: ["구성", "재입고", "비율", "마지막 재입고(현지 시간)"],
    configKeys: (x: RestockTimesView): Point[] => [
      { text: <>구성 선택이 <b className="text-ink">매장 선택보다 더 중요해요</b></> },
      x.storageRatio != null
        ? { text: <>가장 많이 재입고된 용량은 다음 용량보다 약 <b className="text-ink">{x.storageRatio}배</b> 자주 돌아왔어요. 지난 픽업 기회가 많았다는 뜻이지, 약속은 아니에요</> }
        : { text: <>가장 많이 재입고된 용량이 지난 픽업 기회도 가장 많았어요. <b className="text-ink">얼마나 많은지</b>는 표에 있어요</> },
      { text: <><b className="text-ink">2TB</b>는 배송으로 주문하고 기다리는 폰이에요</>, no: true },
      { text: <>가격과 지금 재고: <Link href="/which-iphone-duo-restocks-most">어떤 iPhone Duo가 가장 많이 재입고될까?(영문)</Link></>, step: true },
    ],

    howLongLead: (x: RestockTimesView, sell: SelloutFacts) => <b>{rtWhere(x)}에서 품절된 재입고 {n(sell.n)}회 중 절반이 {n(sell.medianSec)}초 안에 사라졌어요. {rtPct(sell.within2min)}는 2분 안에, {rtPct(sell.within20min)}는 20분 안에.</b>,
    secUnit: "초",
    medianListing: "보통 판매 시간, 뜬 순간부터 사라질 때까지(중앙값)",
    within2: "2분 안에 품절",
    within20: "20분 안에 품절",
    fastest: "측정된 가장 빠른 품절",
    howLongNone: (x: RestockTimesView) => <b>{rtWhere(x)}에서 품절된 재입고가 {yet(x)}측정하기엔 적어요. 10회부터 이 수치를 알려 드리고, 전체 그림은 미국 페이지에 있어요.</b>,
    howLongKeys: (x: RestockTimesView): Point[] => [
      { text: <>2분짜리 창은 apple.com 새로고침이 아니라 <b className="text-ink">알림</b>으로 잡아요</> },
      { text: <>이 페이지의 다른 모든 수치를 설명하는 숫자예요</> },
      { text: <>구성·{x.us ? "주" : rw(x.c)}별로 재입고마다 몇 초 갔는지: <Link href="/iphone-duo-sell-out-times">iPhone Duo 재입고는 얼마나 빨리 품절될까?(영문)</Link></>, step: true },
    ],
    measured: "각 수치는 구성이 처음 보인 확인부터 사라진 것을 본 확인까지의 시간이라 상한값이에요. 실제 유지 시간은 더 짧아요. 이건 Apple 픽업 페이지에 그 구성이 떠 있던 시간이지, 판매 대수가 아니에요.",

    unavailableLead: (x: RestockTimesView) => <b>재입고는 상태가 아니라 깜빡임이기 때문이에요. {x.one ? "매장 1곳" : `매장 ${n(x.stores)}곳`} × 구성 {n(x.configs)}개 = {rtWhere(x)}에서 재고가 될 수 있는 {n(x.pairs)}가지인데, 지금 이 순간 iPhone Duo가 있는 매장은 {n(x.duoNow)}곳이에요.</b>,
    pairs: "재고가 될 수 있는 매장 × 구성",
    listingNow: "지금 이 순간 iPhone Duo 픽업 가능",
    goneIn2: "2분 안에 사라진 재입고",
    last24: "최근 24시간 확인된 재입고",
    unavailableKeys: (x: RestockTimesView, today: number): Point[] => [
      x.recent.restocks > 0
        ? { text: <>최근 24시간: {rtWhere(x)} 매장 {n(x.recent.stores)}곳에서 <b className="text-ink">확인된 재입고 {n(x.recent.restocks)}회</b></> }
        : today > 0
          ? { text: <>오늘: {rtWhere(x)}에서 <b className="text-ink">확인된 재입고 {n(today)}회</b></> }
          : { text: <>실제로 있었던 재입고는 위 날짜별 표에 있어요</> },
      { text: <>각각 apple.com에 <b className="text-ink">1~2분</b> 떠 있었어요</> },
      { text: <>4일째든 14일째든 ‘어디서나 픽업 불가’는 Apple이 판매를 멈췄다는 뜻이 <b className="text-ink">아니에요</b></>, no: true },
    ],
    unavailableLinks: { explained: "‘픽업 불가’의 뜻(영문)", howToGet: "iPhone Duo 구하는 법(영문)" },

    redditLead: (x: RestockTimesView) => <b><a href="https://www.reddit.com/r/applestore/" target="_blank" rel="noopener nofollow">r/applestore</a>와 <a href="https://www.reddit.com/r/iphone/" target="_blank" rel="noopener nofollow">r/iphone</a>의 속설은 대부분 진심이지만 매장 한 곳의 이야기이고, 하루면 낡아요. 가장 자주 보이는 주장 네 가지를 {rtWhere(x)}의 확인된 재입고 {n(x.t.n)}회와 비교했어요.</b>,
    redditCaption: "iPhone Duo 재입고에 관한 흔한 Reddit 주장, PickupChecker의 확인된 재입고와 비교",
    redditHead: ["주장", "데이터가 말하는 것"],
    claims: (x: RestockTimesView): { claim: string; answer: ReactNode }[] => {
      const { t, w, tracked, recent } = x;
      const none = "아직 비교할 재입고 기록이 없어요.";
      return [
        { claim: "“매장은 밤사이 재입고돼요. 새벽 3시에 확인하세요.”", answer: t.n > 0 ? <>재입고의 {rtPct(hourShare(t.byHour, 0, 6))}가 현지 시간 자정~오전 6시였고, {rtPct(w.share)}가 {range(w.from, w.to)}였어요.</> : none },
        { claim: "“Apple은 특정 요일에만 재입고해요.”", answer: t.n > 0 ? (t.peakWeekday != null ? <>지금까지 가장 많은 요일은 {wd(t.peakWeekday)}({n(t.n)}회 중 {n(t.byWeekday[t.peakWeekday])}회)이지만, 재입고는 {n(tracked)}일 중 {n(t.days)}일에 있었어요.</> : <>추적한 {n(tracked)}일 중 {n(t.days)}일에 재입고가 있었어요{t.days === tracked ? "(빈 날 없음)" : ""}. 가장 많은 요일은 데이터가 {WEEKDAY_MIN_SPAN}일 쌓이면 알려 드려요.</>) : none },
        { claim: "“매장에 전화해서 물건 들어오는 시간을 물어보세요.”", answer: "Apple은 재입고 일정을 공개하지 않아요. apple.com에 뜨는 건 온라인으로 풀린 픽업 재고이고, 매장도 다른 사람과 같은 순간에 그걸 봐요." },
        { claim: "“픽업 불가라고 나오면 완전히 품절된 거예요.”", answer: recent.restocks > 0 ? <>최근 24시간 동안 매장 {n(recent.stores)}곳에서 확인된 재입고 {n(recent.restocks)}회가 아니라고 말해요. 각각 몇 분 안에 다시 ‘픽업 불가’가 됐어요.</> : t.n > 0 ? <>{dateLabel(t.since, false)} 이후 확인된 재입고 {n(t.n)}회가 아니라고 말해요. 각각 몇 분 안에 다시 ‘픽업 불가’가 됐어요.</> : "아직 비교할 기록이 없어요." },
      ];
    },
    redditKeys: (): Point[] => [
      { text: <>소문은 <b className="text-ink">데이터가 없을 때</b> 기대는 거예요. 이 페이지가 그 데이터이고, 무료로 볼 수 있어요</> },
      { text: <>Reddit이 맞는 부분: <b className="text-ink">결제 팁</b>. 로그인해 두고 Apple Pay 준비(<Link href="/how-to-grab-an-iphone-duo-restock">저희의 20초 버전(영문)</Link>)</> },
    ],

    methodLead: <b>apple.com에서 그 매장에 없던 구성이 매장 픽업으로 뜨고, 두 번의 확인이 일치하면 재입고로 집계해요.</b>,
    methodKeys: (x: RestockTimesView): Point[] => [
      { text: <>{x.one ? `${rtName(x)}의 Apple Store` : `${rtWhere(x)} 모든 Apple Store`}는 <b className="text-ink">{SPEED.checkSec}초</b>마다, 알림이 걸린 매장은 <b className="text-ink">{SPEED.fastSec}초</b>마다</> },
      { text: <>다른 트래커가 자기 사이트에 밝힌 확인 주기는 <b className="text-ink">5초~15분</b>이에요. 저희가 측정한 값이 아니라서, 각자 밝힌 수치끼리만 비교해요</> },
      { text: <>처음 보인 ‘재고 있음’은 <b className="text-ink">약 1초 뒤</b> 한 번 더 확인한 다음에야 인정해요</> },
      { text: <>사라진 재고는 <b className="text-ink">다음 확인</b>에서 확정해요</> },
      { text: <>매장을 처음 본 순간, 실패하거나 시간 초과된 요청: <b className="text-ink">절대</b> 재입고도 품절도 아니에요</>, no: true },
      { text: <>시간과 날짜는 각 매장의 <b className="text-ink">현지 시간</b>. ‘물량 풀림’ = 시간대가 달라도 같은 30분</> },
      { text: <>다른 트래커의 제보{x.t.reports.length ? `(${x.reportNames.join(", ")})` : ""}: 별도 표시 행, <b className="text-ink">합계에는 절대 넣지 않아요</b></> },
      { text: <>약 5분마다 업데이트, <Link href={x.logHref}>재입고 기록</Link> 자체는 실시간</>, step: true },
    ],
    quote: "링크를 달아 주시면 이 수치를 얼마든지 인용하셔도 좋아요. PickupChecker는 Apple과 무관한 독립 서비스이고, 누구나 apple.com에서 볼 수 있는 픽업 재고를 훨씬 자주 읽을 뿐이에요.",
    alertIn: (x: RestockTimesView) => <>{x.one ? "" : `${rtWhere(x)} `}iPhone Duo 알림 설정하기</>,

    related: "다른 iPhone Duo 궁금증",
    sameData: "같은 데이터로 답했어요",
    questions: {
      sellOut: "재입고는 얼마나 빨리 품절되나요?",
      alerts: "가장 빨리 알림 받는 법",
      howToGet: "실제로 구하는 법",
      whichConfig: "가장 많이 재입고되는 구성",
      nearMe: "지금 내 주변에서 재고 있는 매장",
      unavailable: "‘픽업 불가’의 뜻",
    },
    otherCountries: ((us: boolean): string => (us ? "다른 나라의 같은 페이지" : "다른 나라")) as Dict["views"]["restockTimes"]["otherCountries"],
    place: {
      byCity: "도시별",
      storesLive: (x: RestockTimesView) => `${rtWhere(x)} Apple Store 실시간 재고`,
      countryPage: (c: Country) => `${dom(c)} iPhone Duo 재입고 시간`,
      sourcesWhere: (x: RestockTimesView) => `${rtWhere(x)} Apple Store ${n(x.stores)}곳 전체`,
    },
    faqTitle: "자주 묻는 질문",
  },
};

