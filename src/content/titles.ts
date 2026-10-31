/**
 * Round 2 of the SEO plan (seo.md《三轮规则》): one entry title per bound keyword.
 * <title> and H1 carry the main keyword's entry title; each secondary keyword gets an H2 written as a
 * standalone result title, followed by a block that answers that keyword's own motive. The same page
 * serves every visitor (no cloaking): Google picks among these on-page candidates per query.
 *
 * The national product pages and the home page read their titles here; the store, city and state pages
 * build theirs in src/lib/seo/enrich.ts (storeTitle) and src/lib/seo/placeCopy.ts (placeTitle).
 */

export interface EntryTitles {
  /** Main keyword → <title> and H1. */
  main: { keyword: string; title: string; h1?: string };
  /** Secondary keywords → H2 entry titles. */
  h2: { keyword: string; title: string }[];
  description: string;
}

/** Product pages at US level, keyed by product slug. */
export const PRODUCT_TITLES: Record<string, EntryTitles> = {
  "iphone-duo": {
    main: { keyword: "iphone duo in store", title: "iPhone Duo in Store: Live Stock at All 269 Apple Stores", h1: "iPhone Duo in store: live stock at all 269 Apple Stores" },
    h2: [
      { keyword: "apple store duo", title: "Apple Store Duo stock right now: walk-in vs. pickup" },
      { keyword: "iphone duo near me", title: "iPhone Duo near me: the nearest stores that restock it" },
    ],
    description: "Is the iPhone Duo in stock at an Apple Store near you? Live pickup status for all 269 US stores, every Night Sky and Star White config, plus restock times.",
  },
  "iphone-18-pro-max": {
    main: { keyword: "iphone 18 pro max in stock", title: "iPhone 18 Pro Max In Stock: Live at 269 Apple Stores", h1: "iPhone 18 Pro Max in stock: live at 269 Apple Stores" },
    h2: [
      { keyword: "iphone 18 pro max in stock near me", title: "iPhone 18 Pro Max in stock near me: closest stores first" },
      { keyword: "iphone 18 pro max stock", title: "iPhone 18 Pro Max stock by storage and color" },
    ],
    description: "Which Apple Stores have the iPhone 18 Pro Max right now? Live pickup stock for every storage and color at all 269 US stores, checked every 15 seconds.",
  },
  "iphone-18-pro-max-burgundy": {
    main: { keyword: "iphone 18 pro max burgundy", title: "iPhone 18 Pro Max Burgundy: Live Stock & Price", h1: "iPhone 18 Pro Max Burgundy: live stock and price" },
    h2: [
      { keyword: "iphone 18 pro max dark cherry", title: "iPhone 18 Pro Max Dark Cherry is Burgundy: same phone" },
      { keyword: "iphone 18 pro max cherry red", title: "iPhone 18 Pro Max cherry red (Burgundy) by storage" },
    ],
    description: "Burgundy is the deep red iPhone 18 Pro Max (rumored as Dark Cherry). Live pickup stock for every Burgundy storage at all 269 US Apple Stores, from $1,299.",
  },
  "iphone-18-pro-max-glacier": {
    main: { keyword: "iphone 18 pro max glacier", title: "iPhone 18 Pro Max Glacier: Live Stock & Price", h1: "iPhone 18 Pro Max Glacier: live stock and price" },
    h2: [
      { keyword: "iphone 18 pro max blue", title: "iPhone 18 Pro Max blue is Glacier: where it's in stock" },
      { keyword: "iphone 18 pro max glacier blue", title: "Glacier blue iPhone 18 Pro Max by storage and store" },
    ],
    description: "Glacier is the light-blue iPhone 18 Pro Max. Live pickup stock for each Glacier storage at all 269 US Apple Stores, prices from $1,299 and restock times.",
  },
  "iphone-18-pro-max-silver": {
    main: { keyword: "iphone 18 pro max silver", title: "iPhone 18 Pro Max Silver: Live Stock & Price", h1: "iPhone 18 Pro Max Silver: live stock and price" },
    h2: [
      { keyword: "silver iphone 18 pro max", title: "Silver iPhone 18 Pro Max: which storage is easiest to find" },
      { keyword: "iphone 18 pro max silver color", title: "iPhone 18 Pro Max silver color next to Glacier and Black" },
    ],
    description: "Live pickup stock for the Silver iPhone 18 Pro Max at all 269 US Apple Stores, by storage, with prices from $1,299 and how fast each size sells out.",
  },
  "iphone-18-pro-glacier": {
    main: { keyword: "iphone 18 pro glacier", title: "iPhone 18 Pro Glacier: Live Stock & Price", h1: "iPhone 18 Pro Glacier: live stock and price" },
    h2: [{ keyword: "iphone 18 pro blue", title: "iPhone 18 Pro blue is Glacier: stock by storage" }],
    description: "Glacier is the light-blue iPhone 18 Pro. Live pickup stock for each Glacier storage at all 269 US Apple Stores, prices from $1,199 and restock times.",
  },
  "iphone-duo-night-sky": {
    main: { keyword: "iphone duo night sky", title: "iPhone Duo Night Sky: Restocks & Live Stock", h1: "iPhone Duo Night Sky: restocks and live stock" },
    h2: [{ keyword: "iphone duo black", title: "iPhone Duo black is Night Sky: the dark Duo" }],
    description: "Night Sky is the dark iPhone Duo. See which of the 269 US Apple Stores have it for pickup now, every Night Sky restock logged, and an alert for the next one.",
  },
  "iphone-duo-star-white": {
    main: { keyword: "iphone duo star white", title: "iPhone Duo Star White: Restocks & Live Stock", h1: "iPhone Duo Star White: restocks and live stock" },
    h2: [{ keyword: "iphone duo white", title: "iPhone Duo white is Star White: stock and restocks" }],
    description: "Star White is the light iPhone Duo. Live pickup stock at all 269 US Apple Stores, every Star White restock logged, and an alert the moment one appears.",
  },
  "iphone-duo-1tb": {
    main: { keyword: "iphone duo 1tb", title: "iPhone Duo 1TB: $2,599, Live Pickup Stock", h1: "iPhone Duo 1TB: $2,599, live pickup stock" },
    h2: [{ keyword: "iphone duo 1tb price", title: "iPhone Duo 1TB price: $2,599 unlocked or $108.29 a month" }],
    description: "The iPhone Duo 1TB costs $2,599 unlocked. See whether any of the 269 US Apple Stores has it for pickup now, how often it restocks, and get an alert.",
  },
  "iphone-duo-2tb": {
    main: { keyword: "iphone duo 2tb", title: "iPhone Duo 2TB: $3,199, Live Pickup Stock", h1: "iPhone Duo 2TB: $3,199, live pickup stock" },
    h2: [{ keyword: "iphone duo 2tb price", title: "iPhone Duo 2TB price: $3,199, and is it ever in stock?" }],
    description: "The iPhone Duo 2TB costs $3,199 unlocked and is the rarest Duo in stores. Live pickup stock at all 269 US Apple Stores and an alert for the next restock.",
  },
};

/** Home page (the category tool). */
export const HOME_TITLES: EntryTitles = {
  main: { keyword: "iphone stock checker", title: "iPhone Stock Checker: 269 Apple Stores, Checked Every 15s", h1: "iPhone stock checker for all 269 US Apple Stores" },
  h2: [
    { keyword: "apple inventory checker", title: "Apple inventory checker: Duo, 18 Pro and Pro Max by store" },
    { keyword: "apple store stock checker", title: "Apple Store stock checker with restock alerts" },
  ],
  description: "Check iPhone Duo, 18 Pro and 18 Pro Max pickup stock at all 269 US Apple Stores, live every 15 seconds. Free to browse; get a push when your store restocks.",
};

/** Store pages bound to measured keywords, keyed by store slug. `city` is set when a one-store city's query is bound too. */
export const STORE_KEYWORDS: Record<string, { main: string; store: string; city?: string }> = {
  fifthavenue: { main: "apple fifth avenue", store: "apple store fifth avenue" },
  soho: { main: "apple soho", store: "apple store soho" },
  downtownbrooklyn: { main: "apple downtown brooklyn", store: "apple store downtown brooklyn" },
  unionsquare: { main: "apple union square", store: "apple store union square" },
  floridamall: { main: "apple florida mall", store: "apple store florida mall" },
  boylstonstreet: { main: "apple boylston street", store: "apple store boylston street", city: "apple store boston" },
  aventura: { main: "apple aventura", store: "apple store aventura" },
  williamsburg: { main: "apple williamsburg", store: "apple store williamsburg" },
  west14thstreet: { main: "apple west 14th street", store: "apple store west 14th street" },
  worldtradecenter: { main: "apple world trade center", store: "apple store world trade center" },
  upperwestside: { main: "apple upper west side", store: "apple store upper west side" },
  millenia: { main: "apple millenia", store: "apple store millenia" },
  lincolnpark: { main: "apple lincoln park", store: "apple store lincoln park" },
  pioneerplace: { main: "apple pioneer place", store: "apple store pioneer place" },
  walnutstreet: { main: "apple walnut street", store: "apple store walnut street", city: "apple store philadelphia" },
  universityvillage: { main: "apple university village", store: "apple store university village" },
  valleyfair: { main: "apple valley fair", store: "apple store valley fair" },
  oakbrook: { main: "apple oakbrook", store: "apple store oakbrook", city: "apple store oak brook" },
  highlandvillage: { main: "apple highland village", store: "apple store highland village" },
  southlaketownsquare: { main: "apple southlake town square", store: "apple store southlake town square", city: "apple store southlake" },
  thegrove: { main: "apple the grove", store: "apple store the grove" },
  pasadena: { main: "apple pasadena", store: "apple store pasadena" },
  victoriagardens: { main: "apple victoria gardens", store: "apple store victoria gardens", city: "apple store rancho cucamonga" },
  fashionvalley: { main: "apple fashion valley", store: "apple store fashion valley" },
  southpark: { main: "apple southpark", store: "apple store southpark", city: "apple store charlotte" },
  bartoncreek: { main: "apple barton creek", store: "apple store barton creek" },
  universityparkvillage: { main: "apple university park village", store: "apple store university park village", city: "apple store fort worth" },
  "4thstreet": { main: "apple 4th street", store: "apple store 4th street", city: "apple store berkeley" },
};
