/**
 * 한국어 문구: content — SEO 구성 요소(FAQ, 둘러보기, 숫자 띠, 제품 부분, 출처, 실시간 위젯), enrich 도우미
 * (영업시간, 기간, FAQ 답, 제목), 실시간 {{토큰}}, 재입고 패턴 문장, 사진 대체 텍스트.
 * 인자는 이미 한국어로 형식이 맞춰져 와요(숫자, 기간, 거리, 매장·도시·색상 이름, "재입고 31회" 같은 개수+명사).
 */
import type { ReactNode } from "react";
import type { Forms } from "@/lib/i18n/format";
import type { Dict } from "../en";
import { eulReul, eunNeun, ieyo, krAddress } from "./common";

const f = (x: Forms): Forms => x;
type Kind = "state" | "city" | "store" | "model";
const CHECK = "15초마다, 알림 매장은 5초마다";

export const content: Dict["content"] = {
  hours: {
    closed: "휴무",
    everyDay: (hours: string) => `매일 ${hours}`,
    tomorrow: "내일",
    dayAt: (day: string, time: string) => (/^[월화수목금토일]$/.test(day) ? `${day}요일 ${time}` : `${day} ${time}`),
    closedTodayOpens: (next: string) => `오늘 휴무 · ${next} 영업 시작`,
    closedToday: "오늘 휴무",
    opensAt: (time: string) => `${time} 영업 시작`,
    openNow: (closes: string) => `영업 중 · ${closes} 종료`,
    closedNowOpens: (next: string) => `영업 종료 · ${next} 영업 시작`,
    closedNow: "영업 종료",
  },

  duration: {
    underAMinute: "1분 미만",
    pair: (a: string, b: string) => `${a} ${b}`,
  },
  listMore: (n: string) => `그 외 ${n}개`,
  nearLine: (place: string, distance: string) => `${place} · ${distance}`,

  faq: {
    where: (kind: Kind, place: string) => (kind === "model" ? `${place}의` : `${place}에서`),
    nRestocks: f({ other: "재입고 #회" }),
    restockA: ({ count, where, days, week, peak }: { count: string | null; where: string; days: string; week: string; peak: { hour: string; day: string | null } | null }) =>
      `${count == null ? `최근 ${days}일 동안 ${where} 기록된 재입고가 없어요` : `최근 ${days}일 동안 ${where} ${count}, 이번 주 ${week}회예요`}${peak ? `. 대부분 현지 시간 ${peak.hour} 전후에 들어와요${peak.day ? `(가장 잦은 요일: ${peak.day})` : ""}` : ""}. Apple은 재입고 일정을 공개하지 않아요.`,
    lastsNone: (where: string) => `${where} 재입고→품절 기록이 아직 적어 측정할 수 없어요.`,
    lasts: (days: string, duration: string) => `최근 ${days}일 동안 재입고된 구성은 다시 품절되기까지 약 ${duration}(중앙값) 떠 있었어요.`,
    storeIn: (store: string, line: string) => `${store}(${line})`,
    nearestA: (stores: string) => `${stores}.`,

    modelStockQ: (model: string) => `지금 ${model} 재고가 있는 Apple Store는 어디인가요?`,
    modelStockNone: (model: string) => `마지막 확인 기준으로는 없어요. 미국 Apple Store에 ${model} 픽업 재고가 뜨는 즉시 이 페이지 목록이 바뀌어요.`,
    nUsStores: f({ other: "미국 Apple Store #곳" }),
    modelStockSome: (count: string) => `마지막 확인 기준 ${ieyo(count)}. 매장마다 재고 있는 구성이 이 페이지에 나와요.`,
    priceQ: (model: string) => `${model} 가격은 얼마인가요?`,
    priceA: (low: string, high: string, storages: string, colors: string) => `용량(${storages})에 따라 자급제 기준 ${low}부터 ${high}까지이고, 색상은 ${ieyo(colors)}.`,
    modelRestockQ: (model: string) => `${eunNeun(model)} 얼마나 자주 재입고되나요?`,
    modelLastsQ: (model: string) => `${model} 재고는 한번 뜨면 얼마나 가나요?`,
    reserveQ: (model: string) => `${eulReul(model)} 픽업 예약할 수 있나요?`,
    reserveA: "아니요. 매장에 구성이 뜨면 apple.com에서 매장 픽업을 선택해 구입하고, 그때부터 고른 픽업 시간대까지 보관돼요.",

    storeStockQ: (store: string, model: string) => `${store}에 ${model} 재고가 있나요?`,
    nConfigs: f({ other: "#개 구성" }),
    storeStockYes: (count: string) => `네, 마지막 확인 기준 ${ieyo(count)}. 어떤 용량·색상인지는 이 페이지 표에 나와요.`,
    storeStockNo: (other: { pro: string; proMax: string } | null) => `마지막 확인 기준으로는 없어요${other ? `. 대신 iPhone 18 Pro ${other.pro}개, 18 Pro Max ${other.proMax}개 구성은 있어요` : `. iPhone 18 Pro와 18 Pro Max 구성도 없어요`}.`,
    hoursQ: (store: string) => `${store} 영업시간은 어떻게 되나요?`,
    hoursA: ({ hours, today, address, phone }: { hours: string | null; today: string | null; address: string; phone: string | null }) =>
      `${hours ?? "영업시간은 이 페이지에 나와 있어요"}${today ? ` · 오늘 ${today}` : ""}. 주소: ${krAddress(address)}${phone ? ` · 전화 ${phone}` : ""}.`,
    storeRestockQ: (store: string) => `${store}의 iPhone 재입고는 얼마나 자주 있나요?`,
    storeLastsQ: (store: string) => `${store}에서는 재고가 얼마나 오래가나요?`,
    storeNearestQ: (store: string) => `${store}에서 가장 가까운 다른 Apple Store는 어디인가요?`,

    placeStockQ: (place: string, model: string) => `지금 ${model} 재고가 있는 ${place} Apple Store는 어디인가요?`,
    placeStockNone: (place: string, model: string) => `마지막 확인 기준으로는 없어요. ${place} 매장에 ${model} 픽업 재고가 뜨는 순간 이 페이지가 바뀌어요.`,
    nStores: f({ other: "#곳" }),
    placeStockSome: (count: string, stores: string) => `마지막 확인 기준 ${count}: ${stores}.`,
    countQ: (place: string) => `${place}에는 Apple Store가 몇 곳 있나요?`,
    nAppleStores: f({ other: "Apple Store #곳" }),
    countMany: (count: string, stores: string) => `${ieyo(count)}. ${stores} 등이 있어요.`,
    countOne: (count: string, store: string) => `${count}, ${ieyo(store)}.`,
    placeRestockQ: (place: string) => `${place} Apple Store는 iPhone이 얼마나 자주 재입고되나요?`,
    placeLastsQ: (place: string) => `${place}에서는 재고가 얼마나 오래가나요?`,
    placeNearestQ: (place: string) => `${place} 밖에서 가장 가까운 Apple Store는 어디인가요?`,
  },

  explainer: (kind: Kind, place: string) => {
    const at = kind === "store" ? place : kind === "model" ? "미국의 모든 Apple Store" : `${place} Apple Store`;
    return [
      "픽업 재고는 apple.com에서 팔려요. 결제할 때 구성과 매장을 고르고 온라인으로 결제한 뒤 매장에서 받아요. 당일 픽업도 흔해요. 매장 진열 재고나 통신사 매장 재고와는 별개예요.",
      `PickupChecker는 ${at}의 확인 대상 구성을 모두 15초마다, 알림이 걸린 곳은 5초마다 확인해요. 변화는 한 번 더 확인해 일치할 때만 인정하므로, 일시적인 오류가 가짜 재입고나 품절이 되지 않아요.`,
      "확인된 변화는 모두 기록되고, 이 기록이 이 페이지의 재입고 차트와 이력을 만들어요.",
    ];
  },
  alertRule: "알림 하나 = 매장 하나, 모델 하나, 용량 하나, 색상 하나. apple.com에서 픽업 가능으로 바뀌면 몇 초 안에 푸시(또는 이메일)가 가요.",

  titles: {
    state: (name: string, duoNow: string, stores: string) => [
      `${name} Apple Store: ${stores}곳 중 ${duoNow}곳에 iPhone Duo 재고`,
      `${name} Apple Store · iPhone Duo 픽업 재고 실시간`,
      `${name} Apple Store · iPhone Duo 재고`,
      `${name} Apple Store · iPhone 재고`,
    ],
    city: (city: string, code: string, duoNow: string, stores: string) => [
      `${city}, ${code} Apple Store: ${stores}곳 중 ${duoNow}곳에 iPhone Duo`,
      `${city}, ${code} Apple Store · iPhone Duo 픽업 재고`,
      `${city}, ${code} Apple Store · iPhone Duo 재고`,
      `${city} Apple Store · iPhone 재고`,
    ],
    store: (name: string, region: string | null) => {
      const r = region ? ` (${region})` : "";
      return [
        `${name}${r}: 오늘 iPhone 재고·매장 픽업·영업시간`,
        `${name}${r}: iPhone 재고·매장 픽업·영업시간`,
        `${name}${r}: iPhone 재고·영업시간`,
        `${name}: iPhone 재고·매장 픽업·영업시간`,
        `${name}: iPhone 재고·영업시간`,
        `${name}: iPhone 재고`,
        `${name} 재고`,
      ];
    },
    model: (name: string, storesNow: string) => [
      `${name} 픽업 재고: 지금 Apple Store ${storesNow}곳에 있음`,
      `${name} 픽업 재고: Apple Store ${storesNow}곳`,
      `${name} 매장 픽업 재고 실시간`,
    ],
  },

  tokens: {
    tooFewToMeasure: "아직 측정하기엔 적음",
    noneLoggedYet: "아직 기록 없음",
    noneYet: "아직 없음",
  },

  pattern: {
    none: (days: string) => `최근 ${days}일 동안 확인된 재입고가 없어요.`,
    nConfirmed: f({ other: "확인된 재입고 #회" }),
    countIn: (count: string, days: string) => `최근 ${days}일 ${count}`,
    stay: (minutes: string) => ` · 품절까지 보통 약 ${minutes}분`,
    nDays: f({ other: "#일" }),
    tooFew: (count: string, onDays: string | null, stay: string) => `${count}${onDays ? `(${onDays})` : ""}: 패턴을 말하기엔 아직 적어요${stay}.`,
    usual: (hour: string, weekday: string | null, count: string, stay: string) => `보통 현지 시간 ${hour} 전후에 재입고돼요${weekday ? `(가장 많은 요일: ${weekday})` : ""}. ${count}${stay}.`,
  },

  regionNouns: {
    state: f({ other: "주" }),
    province: f({ other: "시·도" }),
    area: f({ other: "지역" }),
    department: f({ other: "도" }),
    prefecture: f({ other: "도도부현" }),
    emirate: f({ other: "토후국" }),
    canton: f({ other: "칸톤" }),
    region: f({ other: "지역" }),
    county: f({ other: "주" }),
    city: f({ other: "시" }),
  },

  measured: "측정 방법",

  faqTitle: "자주 묻는 질문",
  breadcrumb: "탐색 경로",
  keepExploring: "더 둘러보기",
  browse: {
    storesByState: "주별 매장",
    allStatesCities: "전체 주·도시 →",
    liveByModel: "모델별 실시간 재고",
    modelStock: (model: string) => `${model} 재고`,
    thisPage: "이 페이지",
    restockLog: (short: string) => `${short} 재입고 기록`,
    liveMap: "실시간 지도",
    mostStores: "매장이 많은 곳",
    allStates: "전체 주",
    bigCities: "주요 도시",
    cities: "도시",
    storesBy: (region: string) => `${region}별 매장`,
    allStoresIn: ({ country }: { inName: string; country: string }) => <>{country} 전체 Apple Store →</>,
    allRegions: (regions: string) => `전체 ${regions}`,
  },
  modelCards: "iPhone별",
  narrative: {
    lastRestock: (config: ReactNode, at: ReactNode, ago: ReactNode) => <>{" "}마지막 재입고: {config}{at}, {ago}.</>,
    at: (store: ReactNode) => <> · {store}</>,
  },
  statStrip: {
    inStockNow: "지금 재고",
    ofStores: (n: string) => `전체 ${n}곳 중`,
    stores: "매장",
    nCities: f({ other: "도시 #곳" }),
    tracked: "확인 중",
    modelNow: (short: string) => `지금 ${short}`,
    configsInStock: "재고 있는 구성",
    storesWithStock: f({ other: "재고 있는 매장" }),
    restocks24h: "24시간 재입고",
    restocksHint: (week: string, month: string, days: string) => `7일 ${week} · ${days}일 ${month}`,
    sellOuts: (days: string) => `${days}일 품절`,
    stays: (duration: string) => `~${duration} 유지`,
    noPairs: "아직 데이터 없음",
    lastRestock: "마지막 재입고",
    noneYet: "아직 없음",
    inLastDays: (days: string) => `최근 ${days}일`,
  },
  product: {
    chooseIphone: "iPhone 선택",
    storage: "용량",
    color: "색상",
    all: "전체",
    numbersAre: (unit: ReactNode) => <>숫자 = 지금 재고 있는 {unit}.</>,
    seen: (ago: ReactNode) => <>{ago} 확인</>,
    last: (ago: ReactNode) => <>마지막 {ago}</>,
    notSeenYet: "아직 본 적 없음",
    firstCheckPending: "첫 확인 대기 중",
    inStock: "재고 있음",
    inStockLower: "재고 있음",
    none: "없음",
    here: "현위치",
    notAvailable: "재고 없음",
    notCheckedYet: "아직 확인 전",
    availableForPickup: "픽업 가능",
    since: (ago: ReactNode) => <> · {ago}부터</>,
    lastInStock: (ago: ReactNode) => <>마지막 재고 {ago}</>,
    neverSeen: "이 매장에선 아직 재고를 본 적 없어요",
    firstCheckSoon: "1분 안에 첫 확인",
    buy: "apple.com에서 구입하기",
    checked: (checked: ReactNode, note: ReactNode) => <>{checked} 확인 · {note}</>,
    checkNote: CHECK,
  },

  source: (source: ReactNode) => <>출처: {source}</>,
  photoCredit: (link: ReactNode) => <>사진: {link}</>,
  sources: "출처",
  allUsStores: "미국 Apple Store 269곳 전체",
  trackerSource: (where: ReactNode, since: ReactNode, asOf: ReactNode) => <>PickupChecker 실시간 트래커: {where}의 iPhone Duo, 18 Pro, 18 Pro Max 전 구성을 {since}부터 15초마다(알림 매장은 5초마다) 확인; 이 페이지의 수치는 {asOf} 기준.</>,
  live: {
    configsCaption: (stores: ReactNode, model: ReactNode) => <>{model} 구성별 지금 픽업 가능한 Apple Store 수(전체 {stores}곳) · 실시간</>,
    storage: "용량",
    pricesCaption: (model: ReactNode) => <>apple.com의 {model} 가격(자급제, 세전)과 실시간 픽업 재고</>,
    price: "가격",
    bestColor: "재고 많은 색상, 지금 매장 수",
    noRestock: (model: string) => `아직 기록된 ${model} 재입고가 없어요.`,
    clockLabel: (model: string) => `미국 전역(${model})`,
    storesWithIt: "지금 재고 있는 매장",
    pairsInStock: "재고 있는 매장 × 구성",
    restocksLogged: "기록된 재입고",
    medianTime: "재고 유지 시간(중앙값)",
    underOneMin: (min: string) => `< ${min}`,
  },

  photos: {
    "apple-store-pickup-counter": { alt: "Apple Store 안 ‘Pickup’ 표지가 걸린 나무 픽업 카운터", caption: "픽업 주문은 이런 카운터에서 받아요." },
    "phone-map": { alt: "야외에서 스마트폰 지도 앱으로 길을 찾는 손", caption: "재입고가 1분이면 끝날 때, 매장까지 거리는 생각보다 중요해요." },
    "phone-card-payment": { alt: "iPhone과 신용카드를 들고 온라인으로 결제하는 여성", caption: "매장 픽업을 위한 온라인 결제." },
    "phone-on-box": { alt: "흰 상자 위에 놓인 새 스마트폰", caption: "상자에서 막 꺼낸 새 휴대폰." },
    "city-map-phone": { alt: "휴대폰으로 도시 지도를 함께 보는 두 사람", caption: "매장까지 가는 길 확인." },
    "phone-notification": { alt: "잠금 화면에 알림이 뜬 휴대폰을 든 손", caption: "잠금 화면에 도착한 알림." },
    "apple-store-crowd-inside": { alt: "쇼핑몰 안 붐비는 Apple Store에서 줄을 선 사람들", caption: "출시 주간 Apple Store 안의 인파: 매장에 풀린 재고는 몇 분 만에 사라져요." },
    "apple-store-glass-canopy": { alt: "밤에 본 유리 외관과 나무 캐노피의 Apple Store", caption: "해가 진 뒤의 유리 외관 Apple Store." },
    "apple-store-night-vancouver": { alt: "밤에 불을 밝힌 밴쿠버의 Apple Store", caption: "밤의 Apple Store: 픽업 재고는 아무 때나 뜰 수 있지만, 오전에 훨씬 자주 들어와요." },
    "phone-hand-camera": { alt: "트리플 카메라 iPhone을 손에 든 사람", caption: "사람들이 줄을 서는 건 Pro 모델이에요." },
    "place-kr-seoul": { alt: "해 질 녘 석촌호수와 서울 스카이라인 위로 솟은 롯데월드타워", caption: "롯데월드타워. Apple 잠실은 바로 아래 롯데월드몰에 있어요." },
    "place-kr-south-korea": { alt: "맑은 하늘 아래 경복궁의 정문, 광화문", caption: "서울 경복궁 광화문." },
  },
};
