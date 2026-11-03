import type { CDict } from "../en";

/** 한국어 클라이언트 문구: modules (MiniMap, 다른 트래커 각주). */
export const modules: CDict["modules"] = {
  minimap: {
    aria: "실시간 지도에서 {label} 열기",
    cta: "실시간 지도에서 보기 →",
  },
  reports: {
    legend: "다른 트래커 제보({sources}), {range}",
    note: "{mark}: {links}에서 {range} 기간에 공개한 {what}. 해당 사이트의 관찰 기록이며 PickupChecker가 확인한 재입고가 아니고, 저희 수치에는 포함하지 않아요.",
    what: "{models} 재입고",
    whatAny: "재입고",
    markDashed: "점선",
    markDashedRings: "점선 원",
    markHollowDots: "빈 점",
  },
};
