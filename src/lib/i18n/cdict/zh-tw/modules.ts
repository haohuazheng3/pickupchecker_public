/** 台灣中文客戶端字串：modules（迷你地圖，以及伺服器與客戶端共用的「其他追蹤網站回報」註腳）。 */
import type { CDict } from "../en";

export const modules: CDict["modules"] = {
  minimap: {
    aria: "在即時地圖上打開 {label}",
    cta: "在即時地圖上打開 →",
  },
  reports: {
    legend: "其他追蹤網站回報（{sources}），{range}",
    note: "{mark}：{links} 公布的補貨回報（{what}，{range}）。這些是那些網站自己的觀察，不是 PickupChecker 確認的補貨，我們的數字一個都沒有計入。",
    what: "{models}",
    whatAny: "所有機型",
    markDashed: "虛線",
    markDashedRings: "虛線圓圈",
    markHollowDots: "空心點",
  },
};
