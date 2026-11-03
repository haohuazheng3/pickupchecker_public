import type { CDict } from "../en";

/** Spanish (Spain) client strings: modules (MiniMap, and the other-trackers footnote). */
export const modules: CDict["modules"] = {
  minimap: {
    aria: "Abrir {label} en el mapa en directo",
    cta: "Abrir en el mapa en directo →",
  },
  reports: {
    legend: "Según otros rastreadores ({sources}), {range}",
    note: "{mark}: {what} publicadas por {links} para {range}. Son observaciones de esas webs, no reposiciones confirmadas por PickupChecker, y ninguna de nuestras cifras las cuenta.",
    what: "reposiciones del {models}",
    whatAny: "reposiciones",
    markDashed: "En discontinua",
    markDashedRings: "Anillos discontinuos",
    markHollowDots: "Puntos huecos",
  },
};
