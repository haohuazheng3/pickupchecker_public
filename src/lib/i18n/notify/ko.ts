/** 알림 문구(푸시, 알림 이메일, "알림 중지" 이메일, Stripe 결제 문구), 한국어. 폴러도 보내므로 타입 외 import 없음. */
import type { NotifyText } from "./en";

export const notifyKo: NotifyText = {
  pushTitle: (cfg: string) => cfg,
  pushBody: (where: string, quote: string | null) => `${where}${quote ? ` — ${quote}` : ""}. 탭해서 apple.com에서 예약하세요.`,
  testTitle: "PickupChecker 알림이 켜졌어요",
  testBody: (time: string, device: string) => `${device}에 보낸 테스트예요(${time}). 재입고 알림도 이렇게 몇 초 안에 와요.`,
  device: {
    iphoneApp: "iPhone(홈 화면 앱)",
    iphoneSafari: "iPhone(Safari)",
    androidApp: "Android(설치한 앱)",
    android: (browser: string) => `Android${browser ? `(${browser})` : ""}`,
    computer: (browser: string) => `컴퓨터${browser ? `(${browser})` : ""}`,
    other: "이 기기",
  },
  email: {
    subject: (cfg: string, store: string, more: number) => `재고 있음: ${store} ${cfg}${more > 0 ? ` 외 ${more}건` : ""}`,
    intro: "좋은 소식이에요. 지금 매장 픽업이 가능해요:",
    reserve: "예약",
    store: "매장",
    tip: "픽업 재고는 금방 사라져요. Apple Store 앱이나 apple.com을 열고 ‘매장 픽업’을 선택한 뒤 해당 매장을 고르세요.",
    manage: (url: string) => `이 알림 관리 또는 일시 중지: ${url}`,
    htmlTitle: "지금 매장 픽업 가능",
    htmlReserve: "apple.com에서 예약하기",
    htmlStorePage: "매장 페이지 →",
    htmlTip: "픽업 재고는 금방 사라져요. Apple Store 앱이나 apple.com에서 <b>매장 픽업</b>을 선택하고 해당 매장을 고르세요.",
    htmlManage: "이 알림 관리 또는 일시 중지",
    cancel: (url: string) => `iPhone을 구하셨나요? 언제든 해지할 수 있어요: ${url}`,
    htmlGotIt: "iPhone을 구하셨나요?",
    htmlCancel: "언제든 해지하기",
  },
  checkoutSubmit: (plan: string, limit: number, fastSec: number, checkSec: number, alertSec: number) => `${plan}: 알림 ${limit}개. 내 매장은 ${fastSec}초마다(전체 매장은 ${checkSec}초마다) 확인하고, 재입고가 확인되면 약 ${alertSec}초 후 푸시가 와요. 월 구독, 언제든 해지 가능.`,
  stopped: {
    deviceWord: { ios: "iPhone", android: "Android 휴대폰", desktop: "컴퓨터", other: "기기" },
    subject: (device: string) => `${device}의 알림이 중지됐어요 — 홈 화면에서 PickupChecker를 열어 주세요`,
    gone: (device: string) => `${device}에서 더 이상 PickupChecker 알림을 받지 않아요(푸시 서비스에서 구독이 사라졌다고 알려 왔어요).`,
    byEmail: "알림을 다시 켤 때까지 재입고 알림은 이메일로 보내 드려요.",
    reopenIos: "Safari가 아닌 홈 화면에서 PickupChecker를 열고, 내 알림 페이지에서 ‘알림 켜기’를 누르세요.",
    reopenOther: "PickupChecker를 열고 내 알림 페이지에서 ‘알림 켜기’를 누르세요.",
    causes: "흔한 원인: 홈 화면에서 앱을 삭제했거나, 설정에서 알림을 껐거나, 휴대폰을 복원한 경우예요.",
  },
};
