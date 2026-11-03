/**
 * English client strings: map (the live pickup-stock map). {model} is a model's short name ("Duo") or "iPhone", never
 * translated; {in} is "in Japan" (English: the site's own "in the US", "in the UK"; other languages fill `inCountry`).
 */
export const map = {
  title: "Pickup stock map",
  leadUs: "All {n} US Apple Stores",
  leadOne: "The Apple Store {in}",
  leadAll: "All {n} Apple Stores {in}",
  leadTail: ", live. Bigger dot = more {model} configurations in stock.",
  inCountry: "in {country}",
  /** "Updated 7s ago": {ago} is the live counter. */
  updated: "Updated {ago}",
  waiting: "Waiting for the first sweep",
  allModels: "All models",
  storage: "Storage",
  anyStorage: "Any storage",
  color: "Color",
  anyColor: "Any color",
  mapLabelUs: "Map of US Apple Stores",
  mapLabel: "Map of Apple Stores {in}",
  loading: "Loading map…",
  errors: {
    library: "The map library could not be loaded.",
    webgl: "This browser can't draw the map (WebGL2 is off or unsupported)",
    tiles: "Map tiles unavailable ({reason})",
    network: "network",
    /** Follows the error. */
    tail: "{error}. The store list still works.",
  },
  locating: "Locating…",
  nearMe: "📍 Near me",
  /** The US region buttons. */
  regions: { "Lower 48": "Lower 48", Alaska: "Alaska", Hawaii: "Hawaii", "Puerto Rico": "Puerto Rico" } as Record<string, string>,
  allOf: "All of {country}",
  legend: { inStock: "in stock", none: "none", unchecked: "not checked yet" },
  rightNow: "Right now",
  ofStores: "of {n} stores",
  configs: { one: "{n} {model} configuration in stock", other: "{n} {model} configurations in stock" },
  noneListed: "No store lists this configuration right now.",
  firstSweep: "First sweep in progress.",
  selected: "Selected store",
  close: "Close",
  /** {ago} is the live counter. */
  checked: "{city}, {region} · checked {ago}",
  openStore: "Open store page →",
  alertHere: "Alert me here",
  withStock: "Stores with stock",
  tapDot: "Tap a dot for details.",
  nothingMatching: "Nothing matching your filter right now.",
  /** The tooltip over a dot. */
  popupCount: "{n} in stock",
  popupNone: "none",
  byRegion: "By {noun}",
  regionsHave: "{n} of {total} {nouns} have {model} stock.",
  /** The US table. */
  usNoun: "state",
  usNouns: "states and territories",
  usHeader: "State",
  table: { stores: "Stores", withStock: "With stock", configs: "Configurations", share: "Share", page: "page" },
  /**
   * What each country's stores are grouped by (countries.ts regionNoun), singular and plural. English pages keep the
   * country data's own words; another language reads these. `area` also stands for a country without such a level.
   */
  nouns: {
    state: { one: "state", other: "states" },
    province: { one: "province", other: "provinces" },
    area: { one: "area", other: "areas" },
    department: { one: "department", other: "departments" },
    prefecture: { one: "prefecture", other: "prefectures" },
    emirate: { one: "emirate", other: "emirates" },
    canton: { one: "canton", other: "cantons" },
    county: { one: "county", other: "counties" },
    region: { one: "region", other: "regions" },
    city: { one: "city", other: "cities" },
  } as Record<string, { one: string; other: string }>,
};
