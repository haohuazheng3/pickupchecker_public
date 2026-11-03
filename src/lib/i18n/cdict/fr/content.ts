/** Chaînes client françaises : content — le vérificateur de stock en haut de page et les squelettes de navigation. */
import type { CDict } from "../en";

export const content: CDict["content"] = {
  quickCheck: {
    model: "Modèle d’iPhone",
    search: "Code postal, ville ou Apple Store",
    useLocation: "Utiliser ma position",
    nearMe: "📍 Près de moi",
    locationOff: "La localisation est désactivée pour ce site. Saisissez plutôt un code postal.",
    storesNow: "**{n} sur {total}** Apple Store américains ont l’{what} en retrait en ce moment",
    nearestTo: " · les plus proches de {place}",
    you: "vous",
    noMatch: "Aucun résultat. Essayez un code postal à 5 chiffres ou une ville.",
    inStock: "{n}/{total} en stock",
    soldOut: "Épuisé",
    alertMe: "M’alerter dès qu’il est en stock",
    allStores: "Les {n} magasins →",
    here: "ici",
  },
  skeleton: {
    loading: "Chargement",
  },
};
