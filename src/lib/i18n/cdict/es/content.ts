import type { CDict } from "../en";

/** Spanish (Spain) client strings: content — the first-screen stock checker and the navigation skeletons. */
export const content: CDict["content"] = {
  quickCheck: {
    model: "Modelo de iPhone",
    search: "Código postal, ciudad o Apple Store",
    useLocation: "Usar mi ubicación",
    nearMe: "📍 Cerca de mí",
    locationOff: "La ubicación está desactivada para este sitio. Escribe un código postal.",
    storesNow: "**{n} de {total}** Apple Store de EE. UU. tienen el {what} para recogida ahora",
    nearestTo: " · los más cercanos a {place}",
    you: "ti",
    noMatch: "Sin resultados. Prueba con un código postal de 5 cifras o una ciudad.",
    inStock: "{n}/{total} en stock",
    soldOut: "Agotado",
    alertMe: "Avísame cuando haya stock",
    allStores: "Las {n} tiendas →",
    here: "aquí",
  },
  skeleton: {
    loading: "Cargando",
  },
};
