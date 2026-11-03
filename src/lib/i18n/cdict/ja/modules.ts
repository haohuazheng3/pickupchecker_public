import type { CDict } from "../en";

/** 日本語クライアント文言: modules（ミニマップと、他サイトの報告に関する注記）。 */
export const modules: CDict["modules"] = {
  minimap: {
    aria: "{label}を在庫マップで開く",
    cta: "在庫マップで開く →",
  },
  reports: {
    legend: "他サイトの報告（{sources}）、{range}",
    note: "{mark}：{links}が{range}に公開した{what}です。これらは各サイト自身の観測で、PickupCheckerが確認した入荷ではなく、当サイトの数値には一切含めていません。",
    what: "{models}の入荷",
    whatAny: "入荷",
    markDashed: "破線",
    markDashedRings: "破線の円",
    markHollowDots: "白抜きの点",
  },
};
