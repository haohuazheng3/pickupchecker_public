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
    status: { sent: "발송됨", failed: "실패", skipped: "건너뜀" },
  },

  fast: {
    title: "20초 만에 예약하기",
    sub: "마지막 네 번의 탭만 남기고 지금 다 준비해 두세요",
    lasts: "Duo 재고가 보통 떠 있는 시간",
    push: "재입고 확인 → 휴대폰 푸시",
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
    fastest: "iPhone 재고 트래커 중 가장 빠른 공개 확인 주기",
    everyFast: `내 매장은 **${SPEED.fastSec}초마다** · 다른 트래커가 공개한 주기는 8초~15분`,
    sellsOut: (band: string) => `iPhone Duo 재입고는 보통 **${band}** 만에 품절되고, 20–30초 만에 끝나는 경우도 있어요`,
    band: (range: string) => `${range}초`,
    aboutMinute: "약 1분",
    sameSpeed: "모든 요금제가 같은 속도",
    rechecked: "내 매장 재확인 주기",
    toPhone: "재입고 확인 → 휴대폰까지",
    listing: "Duo 재고가 떠 있다 사라지기까지(보통)",
    note: { plus: "iPhone 1대 × 매장 10곳", pro: "iPhone 2대 × 매장 10곳", max: "iPhone 5대 × 매장 10곳" },
    month: "/ 월",
    alerts: (k: number) => `알림 ${n(k)}개`,
    perks: [`내 매장은 ${SPEED.fastSec}초마다, 전체 매장은 ${SPEED.checkSec}초마다 확인`, `재입고 확인 후 약 ${SPEED.alertSec}초 만에 푸시`],
    cancel: "언제든 해지",
    get: (plan: string) => `${plan} 시작하기`,
    billing: "Stripe 결제 · 카드 또는 Link · 요금제 변경은 일할 계산",
    refund: "맞지 않으신가요? 아직 재입고 알림을 한 번도 받지 않았다면 [7일 이내 전액 환불](/refunds)해 드려요",
  },
};
