/**
 * 한국어 문구: account (대시보드, 그 안의 재입고 모듈, 설치·결제 완료·요금제 페이지). 숫자는 날것으로 와서 num()으로 적어요.
 * **굵게** / [라벨](링크)는 <Md>로 렌더링돼요. 요금제 이름과 달러 금액은 번역하지 않아요(모든 언어에서 USD 청구).
 */
import { SPEED } from "@/lib/plans";
import { num } from "@/lib/i18n/format";
import type { Dict } from "../en";

const n = (x: number) => num("ko", x);

export const account: Dict["account"] = {
  loading: "불러오는 중",
  meta: { title: "내 알림" },
  signedInAs: (email: string) => `로그인: ${email}`,
  title: "내 알림",
  units: { s: "초", min: "분", taps: "번" },

  plan: {
    title: "요금제",
    none: "아직 요금제 없음: 알림이 꺼져 있어요",
    summary: (plan: string, on: number, limit: number) => `${plan} · 알림 ${n(limit)}개 중 ${n(on)}개 켜짐`,
    renews: (date: string) => ` · ${date} 갱신`,
    ends: (date: string) => ` · ${date} 종료`,
  },

  sent: {
    title: "보낸 알림",
    last: (ago: string) => `마지막 알림 ${ago}`,
    none: "아직 보낸 알림 없음",
    empty: "아직 보낸 알림이 없어요.",
    channel: { push: "푸시", email: "이메일" },
    status: { sent: "발송됨", delivered: "도착함", failed: "실패", skipped: "건너뜀" },
  },

  fast: {
    title: "20초 만에 예약하기",
    sub: "마지막 네 번의 탭만 남기고 지금 다 준비해 두세요",
    lasts: "Duo 재고가 보통 떠 있는 시간",
    push: "재입고 확인 → 푸시 발송(도착은 측정 안 함)",
    tapsLeft: "푸시가 온 뒤 남은 탭",
    steps: [
      { title: "내 시간대 파악", hint: "아래 내 매장 영업시간 · 10분 일찍 준비" },
      { title: "Apple 결제 화면 미리 열기", hint: "정확한 용량 + 색상 → 배송 및 픽업" },
      { title: "약관 미리 체크", hint: "결제 직전 단계까지 다 채워 두기" },
      { title: "화면 켜 두기", hint: "자동 잠금 → 안 함 · 10–15분마다 한 번 터치" },
      { title: "알림은 누르기 전에 읽기", hint: "픽업 → 알림 속 매장 → 첫 시간대 → Apple Pay" },
    ],
    guide: "2분 가이드",
    window: "내 재입고 시간대",
  },

  restock: {
    /** "Restock by restock" on the dashboard: each restock against the member's alerts (lib/alertMarks.ts). */
    mark: { delivered: "알림 도착", sent: "알림 발송됨", other: "내 알림 대상 아님", before: "알림 설정 전" },
    title: "내 매장은 언제 재입고되나",
    anyIphone: "iPhone",
    and: " 및 ",
    yours: (k: number) => (k === 1 ? "내 매장" : `내 매장 ${n(k)}곳`),
    Yours: (k: number) => (k === 1 ? "내 매장" : `내 매장 ${n(k)}곳`),
    otherStores: (k: number) => `다른 매장 ${n(k)}곳`,
    meta: (what: string, stores: number, days: number, zone: string) => `${what} · 매장 ${n(stores)}곳 · 최근 ${n(days)}일 · ${zone}`,
    busiest: (yours: string, then: string | null) => (then ? `${yours} 최다 시간대 · 다음은 ${then}` : `${yours} 최다 시간대`),
    busiestArea: (stores: number, zone: string) => `${zone} 전체 매장 ${n(stores)}곳 기준 최다`,
    next: (inHours: number) => `다음 시간대 · ${inHours === 0 ? "지금" : `${n(inHours)}시간 후`}`,
    typical: "품절 전까지 보통 떠 있는 시간",
    count: (yours: string, days: number, total: number, pattern: boolean) => (total === 0 ? `${yours} 재입고 아직 없음 · 최근 ${n(days)}일` : `${yours} 재입고 · 최근 ${n(days)}일${pattern ? "" : " · 패턴을 말하기엔 적음"}`),
    byHour: (busiestInGreen: boolean) => `시간대별${busiestInGreen ? " · 최다는 초록색" : ""}`,
    byWeekday: (busiest: string | null) => `요일별${busiest ? ` · 최다 ${busiest}` : ""}`,
    hourChart: (yours: string, zone: string, items: string) => `${yours} 시간대별 재입고, ${zone}: ${items}`,
    weekdayChart: (yours: string, items: string) => `${yours} 요일별 재입고: ${items}`,
    chartItem: (label: string, k: number, reported: number) => `${label} ${n(k)}회${reported ? ` (+다른 트래커 제보 ${n(reported)}회)` : ""}`,
    barTitle: (label: string, k: number, yours: string, area: { n: number; zone: string } | null, reported: number) =>
      `${label}: ${yours} 재입고 ${n(k)}회${area ? ` · ${area.zone} 전체 ${n(area.n)}회` : ""}${reported ? ` · 다른 트래커 제보 ${n(reported)}회` : ""}`,
    now: "지금",
    allZone: (stores: number, zone: string) => `${zone} 전체 매장 ${n(stores)}곳`,
    reportMarkBars: "점선",
    reportMarkDots: "빈 점",
    sellTitle: "내 매장 재입고는 얼마나 빨리 품절되나",
    sellMeta: (what: string, stores: number, days: number) => `${what} · 매장 ${n(stores)}곳 · 최근 ${n(days)}일`,
    sellLabel: (yours: string) => yours,
  },

  success: {
    metaTitle: "알림이 켜졌어요",
    isOn: (plan: string) => `${plan} 요금제가 켜졌어요`,
    yourPlan: "내 요금제",
    received: "결제 완료",
    onPlan: (limit: number) => `요금제에 알림 ${n(limit)}개가 포함돼요.`,
    planOn: "요금제가 켜졌어요.",
    pending: "구독 정보는 1분 안에 계정에 표시돼요.",
    open: "내 알림 열기",
    another: "알림 하나 더 추가",
    saved: (k: number) => `알림 ${n(k)}개 저장됨 · 영수증은 Stripe에서 발송`,
    pushOn: "알림",
    pushNext: "다음 단계: 휴대폰으로 알림 받기",
  },

  install: {
    metaTitle: "앱 설치: 홈 화면에서 받는 재입고 알림",
    metaDescription: "PickupChecker를 홈 화면에 추가하면 가까운 매장에 iPhone Duo, 18 Pro, Pro Max 픽업 재고가 뜨는 순간 알림을 받아요.",
  },

  pricing: {
    metaTitle: "요금제: 알림 10개 $5, 20개 $10, 50개 $20",
    metaDescription: `Apple Store iPhone 픽업 재고 알림: 내 매장을 ${SPEED.fastSec}초마다 확인하고, 재입고 후 약 ${SPEED.alertSec}초 만에 푸시. Plus 월 $5에 알림 10개, Pro $10에 20개, Max $20에 50개. 언제든 해지.`,
    title: "요금제",
    lead: "**알림 하나 = 매장 하나 × 정확한 iPhone 하나.** 둘러보기는 무료예요.",
    chips: ["국내 Apple Store 7곳 포함", "언제든 해지", "카드 또는 Link"],
    speedTitle: "얼마나 빠른가요? 계획치와 실측치",
    speedAnswer: (v) => `알림을 건 매장은 ${SPEED.fastSec}초마다 확인하도록 계획돼 있어요. 미국에서 최근 7일간 실측한 결과, 그런 매장에 대한 두 응답 사이 간격은 중앙값 **${v.p50}**, 95번째 백분위수 ${v.p95}였어요. 모든 요금제가 같은 속도예요.`,
    speedPlanned: `알림을 건 매장은 ${SPEED.fastSec}초마다, 나머지 매장은 ${SPEED.checkSec}초마다 확인하도록 계획돼 있어요. 1주일치 확인 기록이 쌓이면 여기에 실측치가 표시돼요. 모든 요금제가 같은 속도예요.`,
    planned: `계획: 내 매장 **${SPEED.fastSec}초마다**, 전체 매장 **${SPEED.checkSec}초마다**`,
    intl: (v) => `미국 외: 중앙값 **${v.p50}**, 95번째 백분위수 ${v.p95}${v.above ? ` (계획한 ${SPEED.fastSec}초보다 느림)` : ""}`,
    push: (v) => `재고를 처음 본 확인 → Apple 또는 Google 푸시 서비스가 수락: 중앙값 **${v.p50}**, 90번째 백분위수 ${v.p90} (재입고 ${v.n}회, 7일)`,
    pushPending: "1주일치 알림 기록이 쌓이면 알림 시간이 여기에 표시돼요",
    notMeasured: "휴대폰 도착은 측정하지 않아요. 푸시 서비스가 알려 주지 않기 때문이에요",
    listingLine: (band, k) => `Apple 픽업 페이지에 iPhone Duo 재입고가 표시된 시간은 보통 **${band}**였어요 (재입고 ${k}회의 중앙값, 7일)`,
    band: (range: string) => `${range}초`,
    aboutMinute: "약 1분",
    report: "[서비스 리포트](/service-report): 확인 경로별 24시간·7일·30일 실측치, 표본과 한계 포함",
    gapTile: "내 매장: 확인 간격 중앙값, 7일",
    plannedTile: "내 매장: 계획된 확인 주기",
    pushTile: "첫 감지 → 푸시 서비스, 중앙값, 7일",
    pushTilePending: "첫 감지 → 푸시 서비스: 측정 중",
    listing: "Apple 픽업 페이지의 Duo 표시 시간(보통), 중앙값",
    note: { plus: "iPhone 1대 × 매장 10곳", pro: "iPhone 2대 × 매장 10곳", max: "iPhone 5대 × 매장 10곳" },
    month: "/ 월",
    alerts: (k: number) => `알림 ${n(k)}개`,
    perks: [`내 매장은 ${SPEED.fastSec}초마다, 전체 매장은 ${SPEED.checkSec}초마다 확인`, `재입고 확인 후 약 ${SPEED.alertSec}초 만에 푸시 발송`],
    cancel: "언제든 해지",
    get: (plan: string) => `${plan} 시작하기`,
    needTitle: "요금제가 꼭 필요할까요?",
    needAnswer: "대부분은 필요 없어요. 갈 수 있는 매장에서 정확한 iPhone 한 모델을 원하는데 직접 계속 확인할 수 없고, 재입고가 금방 사라지는 경우에만 요금제가 값을 해요. 실시간 재고, 지도, 재입고 기록, 모든 매장 페이지와 공개 API는 계정 없이 무료예요.",
    skipTitle: "이런 경우엔 필요 없어요",
    skip: [
      "실시간 재고, 지도, 재입고 기록만 둘러볼 때",
      "언제든 갈 수 있는 매장일 때: 출발 전에 매장 페이지를 확인하세요",
      "구성에 유연할 때: 매장 페이지에 지금 있는 재고가 모두 나와요",
      "데이터가 필요할 때: [무료 공개 API](/iphone-duo-stock-api)로 같은 실시간 재고를 받을 수 있어요",
    ],
    helpsTitle: "이런 경우엔 도움이 돼요",
    helps: [
      "정확한 구성 하나를 원하고, 재입고가 몇 분 안에 사라질 때",
      "탭을 계속 열어 둘 수 없을 때: 두 번의 일치하는 확인으로 재입고가 확정되면 푸시를 보내요",
      "여러 매장이나 구성을 동시에 지켜볼 때",
    ],
    tool: "매장이나 색상이 고민되나요? [알림 설정](/#notify)에서 선택한 조합의 지난 픽업 가능 구간 수와 가장 많이 늘려 줬을 변경을 무료로 볼 수 있어요.",
    tableTitle: "알림이 몇 개 필요할까요?",
    tableAnswer: (plus, pro, max) => `알림 수 = 구성 × 매장. 알림 ${n(plus.limit)}개까지(예: iPhone 1대 × 매장 ${n(plus.limit)}곳)는 Plus 월 $${plus.price}, ${n(pro.limit)}개까지는 Pro $${pro.price}, ${n(max.limit)}개까지는 Max $${max.price}예요. ${n(max.limit)}개를 넘으면 맞는 요금제가 없으니 매장이나 구성을 줄이세요.`,
    corner: "iPhone ↓ · 매장 →",
    configsN: (k) => `iPhone ${n(k)}대`,
    storesN: (k) => `매장 ${n(k)}곳`,
    noPlan: "맞는 요금제 없음",
    tableNote: "알림 하나 = 매장 하나 × 정확한 구성 하나(모델, 용량, 색상). 어떤 요금제든 한도 안에서 자유롭게 조합할 수 있어요.",
    billing: "Stripe 결제 · 카드 또는 Link · 업그레이드는 일할 계산, 다운그레이드는 다음 갱신부터",
    refund: "맞지 않으신가요? 아직 재입고 알림을 한 번도 받지 않았다면 [7일 이내 전액 환불](/refunds)해 드려요",
  },
};
