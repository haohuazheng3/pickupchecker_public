/** Dutch client strings: modules (MiniMap, and the other-trackers footnote of the restock charts). */
import type { CDict } from "../en";

export const modules: CDict["modules"] = {
  minimap: {
    aria: "{label} openen op de live kaart",
    cta: "Openen op de live kaart →",
  },
  reports: {
    legend: "Gemeld door andere trackers ({sources}), {range}",
    note: "{mark}: {what} gepubliceerd door {links} voor {range}. Het zijn waarnemingen van die sites, geen aanvullingen die PickupChecker heeft bevestigd, en geen van onze cijfers telt ze mee.",
    what: "aanvullingen van de {models}",
    whatAny: "aanvullingen",
    markDashed: "Gestippeld",
    markDashedRings: "Gestippelde ringen",
    markHollowDots: "Holle stippen",
  },
};
