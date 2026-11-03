/** German client strings: content — the first-screen stock checker and the navigation skeletons. */
import type { CDict } from "../en";

export const content: CDict["content"] = {
  quickCheck: {
    model: "iPhone-Modell",
    search: "ZIP-Code, Stadt oder Apple Store",
    useLocation: "Meinen Standort verwenden",
    nearMe: "📍 In der Nähe",
    locationOff: "Standortzugriff ist für diese Seite aus. Geben Sie stattdessen einen ZIP-Code ein.",
    storesNow: "**{n} von {total}** Apple Stores in den USA haben das {what} jetzt zur Abholung",
    nearestTo: " · am nächsten zu {place}",
    you: "Ihnen",
    noMatch: "Kein Treffer. Probieren Sie einen 5-stelligen ZIP-Code oder eine Stadt.",
    inStock: "{n}/{total} vorrätig",
    soldOut: "Ausverkauft",
    alertMe: "Alarm, sobald verfügbar",
    allStores: "Alle {n} Stores →",
    here: "hier",
  },
  skeleton: {
    loading: "Wird geladen",
  },
};
