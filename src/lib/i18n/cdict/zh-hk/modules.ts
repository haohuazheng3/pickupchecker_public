/** 繁體中文（香港）client strings: modules (MiniMap, the other-trackers footnote). */
import type { CDict } from "../en";

export const modules: CDict["modules"] = {
  minimap: {
    aria: "在即時地圖上打開 {label}",
    cta: "在即時地圖上打開 →",
  },
  reports: {
    legend: "其他追蹤網站的報告（{sources}），{range}",
    note: "{mark}：{links} 在 {range} 公布的{what}。這是那些網站的觀察，不是 PickupChecker 確認的補貨，我們的數字一概不計入。",
    what: "{models} 補貨",
    whatAny: "補貨",
    markDashed: "虛線",
    markDashedRings: "虛線圓圈",
    markHollowDots: "空心點",
  },
};
