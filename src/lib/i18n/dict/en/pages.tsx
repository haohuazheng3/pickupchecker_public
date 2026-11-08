/**
 * English strings: pages — the home board and the region, city and store pages of every country tree (the US and
 * the English country trees render these exact strings). Place names arrive already in the page's language.
 * `cc` arguments: the page's country (use the language's own name for it: places.countryLabel).
 * Labels handed to the restock modules (Last24Hours, RestockClock, SellOutTimes, DailyBars, RestocksByConfig):
 * English "in Michigan" / "at Apple Somerset" / "here" — each language writes them to fit its own module sentences.
 */
import { COUNTRIES, type CountryCode } from "@/lib/apple/countries";
import { CHECK_NOTE } from "@/lib/plans";

const inName = (cc: CountryCode) => COUNTRIES[cc].inName;

export const pages = {
  common: {
    /** "every 15 s, 5 s with an alert" — the check cadence note. */
    checkNote: CHECK_NOTE,
    appleStores: "Apple Stores",
    showOnMap: "Show on map",
    restockLogs: "Restock logs",
    fullLog: "Full log →",
    restocksBy: "Restocks by configuration",
    lastDays: (days: number) => `Last ${days} days, day by day`,
    nearbyCities: "Nearby cities with Apple Stores",
    neighboringStates: "Neighboring states",
    acrossStateLine: "Across the state line",
    allUsRestocks: "All US restocks",
    allRestocksIn: (cc: CountryCode) => `All restocks ${inName(cc)}`,
    regionRestocks: (place: string) => `${place} restocks`,
    onTheMap: (place: string) => `${place} on the map`,
    allOf: (place: string) => `All of ${place}`,
    allOfArrow: (place: string) => `All of ${place} →`,
    storeAndCity: (store: string, city: string) => `${store} · ${city}`,
    /** Source list line: "Apple: Ginza store page". */
    appleStorePage: (store: string) => `Apple: ${store} store page`,
    /** Source list: where the live data comes from ("the 11 Apple Stores in Japan"). */
    sourcesWhere: (n: number, cc: CountryCode) => `the ${n} Apple Stores ${inName(cc)}`,
    /** Label handed to the restock modules for a place: "in Michigan". */
    inPlace: (place: string) => `in ${place}`,
    /** The same for one store: "at Apple Somerset". */
    atPlace: (place: string) => `at ${place}`,
    here: "here",
    storesWithIt: "stores with it",
    whenRestock: (place: string) => `When do ${place} stores restock?`,
    /** The Duo-only clock on place pages (2026-11-08). */
    whenDuoRestocks: (place: string) => `When does the iPhone Duo restock in ${place}?`,
    howFast: (place: string) => `How fast do restocks sell out in ${place}?`,
    latestIn: (place: string) => `Latest restocks in ${place}`,
    noneIn: (place: string) => `No restock recorded in ${place} yet.`,
    faqTitle: (place: string) => `Apple Stores in ${place}: FAQ`,
    itemList: (place: string) => `Apple Stores in ${place}`,
    alertIn: (place: string) => `Alert me in ${place}`,
    panelPick: (place: string) => `Pick the phones and tick the ${place} stores you can get to`,
    matrixH2: "Stock by store and model",
    matrixHint: "In stock now / tracked, per model.",
    matrixLabel: "Stock by store",
    cityPage: "City page →",
    storePage: "Store page →",
    /** The "Live data since" date on country pages. */
    since: "November 2, 2026",
  },
  home: {
    storesWith: (short: string) => `stores with ${short}`,
    restocks24: "restocks 24 h",
    week: (n: number) => ` · ${n} wk`,
    lastCheck: "last check",
    more: (n: number) => `+${n} more`,
    latest: (short: string) => `Latest ${short} restocks`,
    none: (short: string) => `No ${short} restocks yet.`,
    allRestocks: "All restocks",
    modelMap: (short: string) => `${short} map`,
    buy: "Buy on apple.com",
    liveStock: (short: string) => `Live ${short} stock`,
    live: "Live",
    alsoTracking: "Also tracking:",
    liveMap: "Live map",
    allStores: "All stores",
    questions: "Questions",
  },
  region: {
    counts: (stores: number, cities: number) => `${stores} stores · ${cities} cit${cities > 1 ? "ies" : "y"} · checked ${CHECK_NOTE}`,
    nearbyOutside: (place: string) => `Closest Apple Stores outside ${place}`,
    nearbyHint: (place: string) => `Distance from the center of ${place}'s stores.`,
    beyond: (place: string) => `Beyond ${place}`,
    everyStore: (place: string) => `Every store in ${place}`,
    /** "Nearest provinces in Canada" (the country's word for its regions, plural). */
    nearestRegions: (cc: CountryCode) => `Nearest ${COUNTRIES[cc].regionNounPlural ?? "areas"} ${inName(cc)}`,
  },
  city: {
    counts: (stores: number) => `${stores} stores · checked ${CHECK_NOTE}`,
    storeHeading: (name: string) => `Apple ${name}`,
    details: "Store details",
    outside: (place: string) => `Closest stores outside ${place}`,
    outsideRegion: (region: string) => `Closest outside ${region}`,
    around: (place: string) => `Around ${place}`,
    otherCities: (region: string) => `Other cities in ${region}`,
  },
  store: {
    /** Meta description, three lengths (the first that fits 155 characters wins). */
    description: (a: { place: string; street: string; city: string; where: string; duo: number; pro: number; pm: number }) => [
      `${a.place}, ${a.street}, ${a.city}: live pickup stock for ${a.duo} iPhone Duo, ${a.pro} 18 Pro and ${a.pm} Pro Max configs, today's hours, restock times and nearby stores.`,
      `${a.place}, ${a.where}: live pickup stock for ${a.duo} Duo, ${a.pro} 18 Pro and ${a.pm} Pro Max configs, today's hours and restock times.`,
      `${a.place}, ${a.city}: live stock for ${a.duo} Duo, ${a.pro} 18 Pro, ${a.pm} Pro Max configs, hours and restocks.`,
    ],
    /** "Tokyo, Japan" — where the store is, for the description. */
    where: (city: string, cc: CountryCode) => `${city}, ${COUNTRIES[cc].short}`,
    taxQ: (place: string) => `How much is the iPhone Duo with tax at ${place}?`,
    pickupQ: (place: string) => `Can I pick up an apple.com order at ${place}?`,
    pickupA: (place: string) => `Yes. Choose "I'll pick it up" and ${place} at checkout, wait for Apple's pickup notification, then bring the order number, a government photo ID and the QR code or Wallet pass; screenshots are not accepted.`,
    /** "Apple Store Ginza": the store as people say it. */
    storeWord: (name: string) => (/^apple\b/i.test(name) ? name.replace(/^apple\s*/i, "Apple Store ") : `Apple Store ${name}`),
    hoursH2: (storeWord: string) => `${storeWord} hours, address and pickup`,
    hoursLead: (place: string, address: string, phone: string | undefined, today: string, week: string) => `${place} is at ${address}${phone ? `, ${phone}` : ""}. Today's hours: ${today}; the full week: ${week}.`,
    pickupRules: (helpUrl: string) => [
      `**Wait for Apple's pickup notification**, then come in ([Apple's pickup rules](${helpUrl}))`,
      `**Bring:** order number · government photo ID · the QR code or Wallet pass`,
      `**Not accepted:** a screenshot of the code`,
      `**Someone else collecting?** Only a contact you named at checkout`,
    ],
    directions: (place: string, dirUrl: string, appleUrl?: string) => `[Directions to ${place}](${dirUrl})${appleUrl ? ` · [Apple's page for this store](${appleUrl})` : ""}`,
    onlyH2: (where: string, place: string) => `Apple Store ${where}: ${place} is the only one`,
    onlyInCountry: (place: string, cc: CountryCode) => `${place} is the only Apple Store ${inName(cc)}, so every in-store pickup ${inName(cc)} happens here. When it lists a configuration, there is no second store to try: an alert for it is the whole strategy.`,
    /** One store in the city; `backups`: "Apple X in City (12 km)" list, may be empty. */
    onlyInCity: (city: string, place: string, backups: string) => `${city} has one Apple Store, ${place}.${backups ? ` The next closest are ${backups}.` : ""}`,
    backup: (apple: string, city: string, dist: string) => `${apple} in ${city} (${dist})`,
    onlyBlockCountry: (place: string) => `One alert covers one store and one exact configuration, and the push arrives seconds after ${place} lists it for pickup.`,
    onlyBlock: (place: string) => `If ${place} is out of the configuration you want, those are the backups worth watching too: one alert covers one store and one exact configuration, and the push arrives seconds after the store lists it.`,
    /** The first paragraph. Numbers: in stock now / configurations, per model; `peak`: the usual hour or null. */
    intro: (a: { place: string; street: string; duo: number; duoOf: number; pro: number; proOf: number; pm: number; pmOf: number; peak: string | null }) => (
      <>{a.place}{a.street ? ` at ${a.street}` : ""} lists <b className="text-ink">{a.duo} of {a.duoOf}</b> iPhone Duo, <b className="text-ink">{a.pro} of {a.proOf}</b> iPhone 18 Pro and <b className="text-ink">{a.pm} of {a.pmOf}</b> iPhone 18 Pro Max configurations for pickup right now.{a.peak ? <> Restocks here usually land around <b className="text-ink">{a.peak}</b> local time.</> : null}</>
    ),
    restocks30: (n: number) => `${n} restocks · last 30 days`,
    lookupOff: "Apple isn't offering in-store pickup lookups at this store right now. We ask again every 30 minutes and show its stock as soon as Apple answers.",
    checked: "Checked",
    alertHere: (short: string) => `Alert me for ${short} here`,
    panel: (name: string) => `For Apple ${name}: pick the phones, tick this store and any nearby`,
    configsInStock: "configs in stock",
    stockNowH2: "Pickup stock right now",
    whenRestock: (name: string) => `When does ${name} restock?`,
    whenDuoRestocks: (name: string) => `When does the iPhone Duo restock at ${name}?`,
    howFast: (name: string) => `How fast do restocks sell out at ${name}?`,
    history: "Restock history",
    historyEmpty: "No restock or sell-out recorded here yet.",
    nearby: "Nearby stores",
    elsewhereIn: (region: string) => `Elsewhere in ${region}`,
    faqTitle: (place: string) => `${place} FAQ`,
    applePage: (place: string) => `Apple: ${place} store page (hours, events)`,
    /** Source list "where" for a country page: "the Apple Store in Austria" / "the 11 Apple Stores in Japan". */
    sourcesWhere: (n: number, cc: CountryCode) => `the ${n === 1 ? "Apple Store" : `${n} Apple Stores`} ${inName(cc)}`,
    around: (place: string) => `Around ${place}`,
    otherInCity: (city: string) => `Other Apple Stores in ${city}`,
    cityPage: (city: string) => `${city} page`,
    moreIn: (region: string) => `More Apple Stores in ${region}`,
    everyIn: (cc: CountryCode) => `Every Apple Store ${inName(cc)}`,
    allIn: (cc: CountryCode) => `All Apple Stores ${inName(cc)}`,
    countryHome: (cc: CountryCode) => `${COUNTRIES[cc].name} home`,
    footnote: "Availability as shown on apple.com for in-store pickup, as of the last check.",
    footnoteIntl: (cc: CountryCode, regionWord: string) => ` Prices in ${COUNTRIES[cc].currency}; distances in ${COUNTRIES[cc].unit === "mi" ? "miles" : "kilometres"}. Not a ${regionWord} or retailer site.`,
  },
};
