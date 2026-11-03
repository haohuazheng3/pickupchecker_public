/** Chaînes client françaises : modules (mini-carte, note sur les signalements d’autres sites de suivi). */
import type { CDict } from "../en";

export const modules: CDict["modules"] = {
  minimap: {
    aria: "Ouvrir {label} sur la carte en direct",
    cta: "Ouvrir sur la carte en direct →",
  },
  reports: {
    legend: "Signalés par d’autres sites de suivi ({sources}), {range}",
    note: "{mark} : {what} publiés par {links} pour la période {range}. Ce sont les observations de ces sites, pas des retours en stock confirmés par PickupChecker, et aucun de nos chiffres ne les compte.",
    what: "retours en stock d’{models}",
    whatAny: "retours en stock",
    markDashed: "En pointillés",
    markDashedRings: "Cercles en pointillés",
    markHollowDots: "Points creux",
  },
};
