import type { CDict } from "../en";

/** Swedish client strings: modules (MiniMap, and the other-trackers footnote). */
export const modules: CDict["modules"] = {
  minimap: {
    aria: "Öppna {label} på livekartan",
    cta: "Öppna på livekartan →",
  },
  reports: {
    legend: "Rapporterat av andra bevakningstjänster ({sources}), {range}",
    note: "{mark}: {what} publicerade av {links} för {range}. Det är de sajternas egna observationer, inte påfyllningar som PickupChecker har bekräftat, och ingen av våra siffror räknar med dem.",
    what: "påfyllningar av {models}",
    whatAny: "påfyllningar",
    markDashed: "Streckade",
    markDashedRings: "Streckade ringar",
    markHollowDots: "Ihåliga prickar",
  },
};
