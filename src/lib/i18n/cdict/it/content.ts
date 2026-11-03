import type { CDict } from "../en";

/** Italian client strings: content — the first-screen stock checker and the navigation skeletons. */
export const content: CDict["content"] = {
  quickCheck: {
    model: "Modello di iPhone",
    search: "CAP, città o Apple Store",
    useLocation: "Usa la mia posizione",
    nearMe: "📍 Vicino a me",
    locationOff: "La posizione è disattivata per questo sito. Scrivi invece un CAP.",
    storesNow: "**{n} Apple Store su {total}** negli Stati Uniti hanno l'{what} disponibile per il ritiro adesso",
    nearestTo: " · i più vicini a {place}",
    you: "te",
    noMatch: "Nessun risultato. Prova un CAP di 5 cifre o una città.",
    inStock: "{n}/{total} disponibili",
    soldOut: "Esaurito",
    alertMe: "Avvisami quando è disponibile",
    allStores: "Tutti i {n} negozi →",
    here: "qui",
  },
  skeleton: {
    loading: "Caricamento",
  },
};
