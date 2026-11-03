import type { CDict } from "../en";

/** Italian client strings: modules (MiniMap, and the other-trackers footnote). */
export const modules: CDict["modules"] = {
  minimap: {
    aria: "Apri {label} sulla mappa in tempo reale",
    cta: "Apri sulla mappa in tempo reale →",
  },
  reports: {
    legend: "Segnalati da altri tracker ({sources}), {range}",
    note: "{mark}: {what} pubblicati da {links} per il periodo {range}. Sono osservazioni di quei siti, non rifornimenti confermati da PickupChecker, e nessuno dei nostri numeri li conta.",
    what: "rifornimenti di {models}",
    whatAny: "rifornimenti",
    markDashed: "Tratteggiate",
    markDashedRings: "Cerchi tratteggiati",
    markHollowDots: "Punti vuoti",
  },
};
