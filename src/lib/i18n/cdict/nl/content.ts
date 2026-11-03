/** Dutch client strings: content — the first-screen stock checker (QuickCheck) and the navigation skeletons. */
import type { CDict } from "../en";

export const content: CDict["content"] = {
  quickCheck: {
    model: "iPhone-model",
    search: "ZIP-code, stad of Apple Store",
    useLocation: "Gebruik mijn locatie",
    nearMe: "📍 In de buurt",
    locationOff: "Locatie staat uit voor deze site. Typ in plaats daarvan een ZIP-code.",
    storesNow: "**{n} van {total}** Apple Stores in de VS hebben de {what} nu om op te halen",
    nearestTo: " · dichtst bij {place}",
    you: "jou",
    noMatch: "Niets gevonden. Probeer een ZIP-code van 5 cijfers of een stad.",
    inStock: "{n}/{total} op voorraad",
    soldOut: "Uitverkocht",
    alertMe: "Waarschuw me als hij op voorraad is",
    allStores: "Alle {n} winkels →",
    here: "hier",
  },
  skeleton: {
    loading: "Laden",
  },
};
