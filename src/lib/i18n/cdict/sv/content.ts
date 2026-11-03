import type { CDict } from "../en";

/** Swedish client strings: content — the first-screen stock checker and the navigation skeletons. */
export const content: CDict["content"] = {
  quickCheck: {
    model: "iPhone-modell",
    search: "Postnummer, stad eller Apple Store",
    useLocation: "Använd min plats",
    nearMe: "📍 Nära mig",
    locationOff: "Platstjänster är avstängda för den här sajten. Skriv ett postnummer i stället.",
    storesNow: "**{n} av {total}** Apple Store-butiker i USA har {what} att hämta nu",
    nearestTo: " · närmast {place}",
    you: "dig",
    noMatch: "Ingen träff. Testa ett femsiffrigt postnummer eller en stad.",
    inStock: "{n}/{total} i lager",
    soldOut: "Slutsåld",
    alertMe: "Bevaka tills den finns i lager",
    allStores: "Alla {n} butiker →",
    here: "här",
  },
  skeleton: {
    loading: "Laddar",
  },
};
