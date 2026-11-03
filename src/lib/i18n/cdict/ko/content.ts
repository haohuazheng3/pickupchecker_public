import type { CDict } from "../en";

/** 한국어 클라이언트 문구: content — 첫 화면 재고 확인(QuickCheck)과 이동 중 스켈레톤. */
export const content: CDict["content"] = {
  quickCheck: {
    model: "iPhone 모델",
    search: "우편번호, 도시 또는 Apple Store",
    useLocation: "내 위치 사용",
    nearMe: "📍 내 주변",
    locationOff: "이 사이트의 위치 권한이 꺼져 있어요. 우편번호를 입력해 주세요.",
    storesNow: "미국 Apple Store **{total}곳 중 {n}곳**에서 지금 {what} 픽업 가능",
    nearestTo: " · {place} 기준 가까운 순",
    you: "내 위치",
    noMatch: "결과가 없어요. 5자리 우편번호나 도시로 찾아보세요.",
    inStock: "{n}/{total} 재고 있음",
    soldOut: "품절",
    alertMe: "입고되면 알림 받기",
    allStores: "매장 {n}곳 전체 →",
    here: "현위치",
  },
  skeleton: {
    loading: "불러오는 중",
  },
};
