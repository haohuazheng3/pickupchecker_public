/**
 * English client strings: content — the first-screen stock checker (components/content/QuickCheck.tsx) and the
 * navigation skeletons (components/ui/RouteSkeletons.tsx). Plain data: "{n}" placeholders (fill), **bold** (Md).
 */
export const content = {
  quickCheck: {
    /** aria-label of the model switch. */
    model: "iPhone model",
    /** Search box label and placeholder. */
    search: "ZIP, city or Apple Store",
    useLocation: "Use my location",
    nearMe: "📍 Near me",
    locationOff: "Location is off for this site. Type a ZIP instead.",
    /** {n} of {total}: stores with it now; {what}: the model or configuration ("iPhone 18 Pro Max Burgundy"). */
    storesNow: "**{n} of {total}** US Apple Stores have the {what} for pickup now",
    /** {place}: the typed ZIP / city / store, or "you". */
    nearestTo: " · nearest to {place}",
    you: "you",
    noMatch: "No match. Try a 5-digit ZIP or a city.",
    /** {n} configurations of {total} at one store. */
    inStock: "{n}/{total} in stock",
    soldOut: "Sold out",
    alertMe: "Alert me when it's in stock",
    allStores: "All {n} stores →",
    /** Drive time under a few hundred metres. */
    here: "here",
  },
  skeleton: {
    /** aria-label while the next page loads. */
    loading: "Loading",
  },
};
