/** German client strings: modules (MiniMap, and the other-trackers footnote). */
import type { CDict } from "../en";

export const modules: CDict["modules"] = {
  minimap: {
    aria: "{label} auf der Live-Karte öffnen",
    cta: "Auf der Live-Karte öffnen →",
  },
  reports: {
    legend: "Von anderen Trackern gemeldet ({sources}), {range}",
    note: "{mark}: {what}, veröffentlicht von {links} für {range}. Das sind Beobachtungen dieser Seiten, keine von PickupChecker bestätigten Restocks, und keine unserer Zahlen zählt sie mit.",
    what: "Restocks von {models}",
    whatAny: "Restocks",
    markDashed: "Gestrichelt",
    markDashedRings: "Gestrichelte Ringe",
    markHollowDots: "Hohle Punkte",
  },
};
