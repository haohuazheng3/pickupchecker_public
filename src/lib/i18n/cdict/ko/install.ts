import type { CDict } from "../en";

/** 한국어 클라이언트 문구: install (/install 가이드와 손그림 화면). 목업 라벨은 한국어 iOS·Android·Chrome의 실제 표기를 따라요. */
export const install: CDict["install"] = {
  hero: {
    eyebrow: "홈 화면 앱 · 다운로드 없음",
    title: "잠금 화면으로 받는 재입고 알림.",
    lead: "PickupChecker를 홈 화면에 추가하고 알림을 허용하세요. 재입고 소식이 몇 초 안에 잠금 화면에 떠요.",
    seeSteps: "방법 보기",
    sendTest: "테스트 보내기",
    turnOn: "알림 켜기",
    already: "**✓ 설정 완료.** 알림은 {label}에서 받고 있어요. 아래 단계대로 하면 이 기기도 추가돼요. {link}",
    myAlerts: "내 알림",
  },
  progress: {
    homeScreen: "홈 화면에 추가됨",
    signedIn: "로그인됨",
    on: "알림 켜짐",
    blocked: "설정에서 차단됨: {n}단계를 보세요.",
  },
  steps: {
    title: "알림 설정하기",
    intro: {
      ios: "iPhone과 iPad에서는 홈 화면에 추가한 앱에서만 알림을 받을 수 있어요.",
      android: "Android는 설치하지 않아도 돼요. Chrome만으로도 알림이 와요.",
      desktop: "브라우저에서 바로 돼요. 설치할 필요 없어요.",
    },
    tabsLabel: "내 기기",
    tabs: { ios: "iPhone / iPad", android: "Android", desktop: "컴퓨터" },
    ios: {
      safari: { title: "Safari에서 pickupchecker.com 열기", text: "Safari에서만 돼요. Chrome이나 앱 안의 브라우저는 안 돼요." },
      share: { title: "공유 탭하기", text: "iPhone은 하단 막대, iPad는 상단에 있어요." },
      choose: { title: "‘홈 화면에 추가’ 선택", text: "안 보이면 아래로 스크롤하세요." },
      add: { title: "추가 탭하기", text: "이름은 PickupChecker 그대로 두세요." },
      open: { title: "홈 화면에서 열고 로그인", text: "앱은 로그인이 따로예요. 같은 이메일이면 알림도 그대로예요." },
      allow: { title: "‘알림 켜기’를 누른 뒤 허용", text: "버튼은 내 알림 페이지에 있어요. iPhone은 한 번만 물어봐요." },
    },
    android: {
      chrome: { title: "Chrome에서 pickupchecker.com 열기", text: "삼성 인터넷과 Edge도 돼요. 앱 안의 브라우저는 안 돼요." },
      install: { title: "앱 설치", text: "탭 한 번이면 끝, 앱 스토어 필요 없어요." },
      menu: { title: "메뉴 ⋮ → ‘홈 화면에 추가’", text: "**앱 설치**로 표시될 때도 있어요." },
      open: { title: "PickupChecker를 열고 로그인", text: "홈 화면이나 앱 서랍에서 여세요. 같은 이메일이면 알림도 그대로예요." },
      allow: { title: "‘알림 켜기’를 누른 뒤 허용", text: "Android는 한 번만 물어봐요. Chrome 탭에서도 돼요." },
    },
    desktop: {
      allow: { title: "‘알림 켜기’ 누르기", text: "Chrome, Edge, Firefox, Safari 16 이상. 브라우저가 한 번만 물어봐요." },
      install: { title: "선택: 앱으로 설치", text: "Chrome이나 Edge 주소창의 설치 아이콘. 브라우저를 닫아도 알림이 와요." },
      phone: { title: "휴대폰에서도", text: "휴대폰에서 같은 이메일로 로그인하세요. 알림이 켜진 모든 기기가 모든 알림을 받아요." },
    },
  },
  action: {
    install: "PickupChecker 설치",
    on: "✓ 이 기기에서 알림이 켜져 있어요.",
    sendTest: "테스트 보내기",
    needsInstall: "홈 화면 앱을 열면 쓸 수 있어요.",
    signInFirst: "먼저 로그인",
    signInThenOn: "로그인 후 알림 켜기",
    turnOn: "알림 켜기",
    denied: "차단됨. 설정에서 PickupChecker 알림을 허용한 뒤 새로고침하세요.",
  },
  notes: [
    { q: "왜 iPhone은 Safari여야 하나요?", a: "웹사이트를 홈 화면에 추가할 수 있는 건 Safari뿐이에요. 앱 안의 브라우저로는 안 돼요." },
    { q: "배터리는요?", a: "휴대폰에서는 아무것도 돌지 않아요. 확인은 저희 서버가 해요." },
    { q: "이메일은요?", a: "아니요. 알림은 푸시로만 가니, 기기 한 대 이상에서 켜 주세요." },
    { q: "기기가 여러 대라면요?", a: "각 기기에서 같은 이메일로 로그인하세요. 모든 기기가 모든 알림을 받아요." },
  ],
  cta: { title: "아직 알림이 없나요?", button: "알림 설정하기" },

  mocks: {
    share: "공유",
    shareSheet: { copy: "복사", readingList: "읽기 목록에 추가", bookmark: "책갈피 추가", favorites: "즐겨찾기에 추가", addToHome: "홈 화면에 추가", markup: "마크업" },
    addDialog: { cancel: "취소", title: "홈 화면에 추가", add: "추가", note: "이 웹 사이트에 빠르게 접근할 수 있도록 홈 화면에 아이콘이 추가됩니다." },
    iosAlert: { title: "‘PickupChecker’에서 알림을 보내고자 합니다", text: "경고, 사운드 및 아이콘 배지가 알림에 포함될 수 있습니다. 설정에서 이를 구성할 수 있습니다.", dontAllow: "허용 안 함", allow: "허용" },
    chromeMenuLabel: "메뉴",
    chromeMenu: { before: ["새 탭", "방문 기록", "다운로드", "북마크", "공유…"], add: "홈 화면에 추가", after: ["데스크톱 사이트"] },
    androidAlert: { title: "PickupChecker에서 알림을 보내도록 허용하시겠습니까?", dontAllow: "허용 안함", allow: "허용" },
    desktopAlert: { wantsTo: "pickupchecker.com에서 다음 권한을 요청합니다.", show: "알림 표시", block: "차단", allow: "허용" },
    desktopInstall: { callout: "설치", title: "PickupChecker 앱 설치", text: "별도 창에서 열려요", cancel: "취소", install: "설치" },
    lockScreen: { date: "10월 29일 목요일", now: "지금", title: "iPhone 18 Pro 256GB 블랙", body: "Apple 가로수길 · 서울 — 오늘 픽업 가능. 탭해서 apple.com에서 예약하세요." },
  },
};
