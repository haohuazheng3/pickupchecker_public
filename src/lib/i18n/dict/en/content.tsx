/**
 * English strings: content — the SEO building blocks (FAQ, browse/related rows, stat strips, product parts, sources,
 * live widgets), the enrich helpers (opening hours, durations, FAQ answers, titles), live {{tokens}}
 * (lib/content/facts.ts), the restock-pattern sentence (lib/content/siteFacts.ts) and photo alt text.
 *
 * For translators: arguments arrive already written for the language — numbers formatted, durations, distances,
 * store, city and colour names in their local form, counts with their noun ("31 restocks", built from the `{ one,
 * other }` forms here, "#" = the number). A translation arranges words around them. Functions that return JSX keep
 * the same elements: only the words around `{…}` change. Never translate model names (iPhone Duo, 18 Pro, 18 Pro Max),
 * storage sizes, "Apple Store", "PickupChecker" or apple.com. Check intervals are only ever 15 and 5 seconds.
 */
import type { ReactNode } from "react";
import type { Forms } from "@/lib/i18n/format";
import photoList from "@/content/images.json";

/** Plural forms of one phrase ("#" = the number); a language without plurals gives `other` only. */
const f = (x: Forms): Forms => x;

/** The page a FAQ or explainer is about. */
type Kind = "state" | "city" | "store" | "model";

export const content = {
  /* ------------------------------------------------------------ lib/seo/enrich.ts: opening hours (24-hour times) */
  hours: {
    closed: "Closed",
    /** All seven days the same: "Every day 10:00–21:00". */
    everyDay: (hours: string) => `Every day ${hours}`,
    tomorrow: "tomorrow",
    /** The next opening on a later day: "Sun at 11:00" (`day` is a short weekday name). */
    dayAt: (day: string, time: string) => `${day} at ${time}`,
    /** `next`: "tomorrow at 10:00" / "Sun at 11:00". */
    closedTodayOpens: (next: string) => `Closed today · opens ${next}`,
    closedToday: "Closed today",
    opensAt: (time: string) => `Opens at ${time}`,
    openNow: (closes: string) => `Open now · closes ${closes}`,
    closedNowOpens: (next: string) => `Closed now · opens ${next}`,
    closedNow: "Closed now",
  },

  /* ------------------------------------------------------------ enrich.ts: small formatters */
  duration: {
    /** How long stock stayed listed, below one minute. */
    underAMinute: "under a minute",
    /** Two parts of one duration: "2 h" + "15 min" → "2 h 15 min". */
    pair: (a: string, b: string) => `${a} ${b}`,
  },
  /** The last item of a list cut short: "a, b, c and 4 more". */
  listMore: (n: string) => `${n} more`,
  /** "Austin, TX (12 mi)" / "Toronto (19 km)": a nearby store's city and its distance. */
  nearLine: (place: string, distance: string) => `${place} (${distance})`,

  /* ------------------------------------------------------------ enrich.ts: FAQ (one sentence per answer) */
  faq: {
    /** How answers name the page: "at Apple The Summit", "for the iPhone Duo", "in Texas". */
    where: (kind: Kind, place: string) => (kind === "store" ? `at ${place}` : kind === "model" ? `for the ${place}` : `in ${place}`),
    nRestocks: f({ one: "# restock", other: "# restocks" }),
    /**
     * How often a place restocks. `count`: "31 restocks", or null when none was logged; `where` from faq.where;
     * `peak`: the usual local hour ("10 AM") and busiest weekday ("Tuesday"), when the data shows one.
     */
    restockA: ({ count, where, days, week, peak }: { count: string | null; where: string; days: string; week: string; peak: { hour: string; day: string | null } | null }) =>
      `${count == null ? `No restock logged ${where} in the last ${days} days` : `${count} ${where} in the last ${days} days, ${week} this week`}${peak ? `, most of them around ${peak.hour} local time${peak.day ? ` and most often on ${peak.day}s` : ""}` : ""}; Apple publishes no schedule.`,
    lastsNone: (where: string) => `Too few restock-to-sell-out pairs ${where} yet to measure.`,
    /** `duration`: "2 h 15 min". */
    lasts: (days: string, duration: string) => `Over the last ${days} days a restocked configuration stayed available about ${duration} (median) before selling out again.`,
    /** One nearby store in an answer: "Apple Bridge Street in Huntsville, AL (90 mi)". */
    storeIn: (store: string, line: string) => `${store} in ${line}`,
    /** The answer listing the nearest stores ("A, B and C"). */
    nearestA: (stores: string) => `${stores}.`,

    // model pages (the US)
    modelStockQ: (model: string) => `Which Apple Stores have the ${model} in stock right now?`,
    modelStockNone: (model: string) => `None at the last check; the list on this page updates as soon as a US Apple Store lists the ${model} for pickup.`,
    nUsStores: f({ one: "# US Apple Store", other: "# US Apple Stores" }),
    /** `count`: "3 US Apple Stores". */
    modelStockSome: (count: string) => `${count} at the last check, each named on this page with the configurations it has.`,
    priceQ: (model: string) => `How much does the ${model} cost?`,
    /** `storages`: "256GB, 512GB, 1TB"; `colors`: "Night Sky and Star White". */
    priceA: (low: string, high: string, storages: string, colors: string) => `From ${low} to ${high} unlocked depending on storage (${storages}), in ${colors}.`,
    modelRestockQ: (model: string) => `How often does the ${model} restock?`,
    modelLastsQ: (model: string) => `How long does ${model} stock last once it appears?`,
    reserveQ: (model: string) => `Can I reserve the ${model} for pickup?`,
    reserveA: "No; once a store lists a configuration you buy it on apple.com with in-store pickup selected, and it is then held for your time slot.",

    // store pages
    storeStockQ: (store: string, model: string) => `Does ${store} have the ${model} in stock?`,
    nConfigs: f({ one: "# configuration", other: "# configurations" }),
    /** `count`: "2 configurations". */
    storeStockYes: (count: string) => `Yes, ${count} at the last check; the table on this page shows which storage and color.`,
    /** No Duo: `pro` / `proMax` = configurations of the 18 Pro / 18 Pro Max listed now (null when both are 0). */
    storeStockNo: (other: { pro: string; proMax: string } | null) => `Not at the last check${other ? `, though it lists ${other.pro} iPhone 18 Pro and ${other.proMax} 18 Pro Max configurations` : ", and no 18 Pro or 18 Pro Max configuration either"}.`,
    hoursQ: (store: string) => `What are ${store}'s hours?`,
    /** `hours`: the week ("Mon–Sat 10:00–21:00 · Sun 11:00–18:00") or null; `today`: "10:00–21:00 (open now)" or null. */
    hoursA: ({ hours, today, address, phone }: { hours: string | null; today: string | null; address: string; phone: string | null }) =>
      `${hours ?? "Hours are listed on this page"}${today ? `; today ${today}` : ""}; ${address}${phone ? `, ${phone}` : ""}.`,
    storeRestockQ: (store: string) => `How often does ${store} restock the iPhone?`,
    storeLastsQ: (store: string) => `How long does stock last at ${store}?`,
    storeNearestQ: (store: string) => `What is the nearest other Apple Store to ${store}?`,

    // state, city and country pages
    placeStockQ: (place: string, model: string) => `Which Apple Stores in ${place} have the ${model} in stock right now?`,
    placeStockNone: (place: string, model: string) => `None at the last check; this page updates the moment a store in ${place} lists the ${model} for pickup.`,
    nStores: f({ one: "# store", other: "# stores" }),
    /** `count`: "2 stores"; `stores`: their names, listed. */
    placeStockSome: (count: string, stores: string) => `${count} at the last check: ${stores}.`,
    countQ: (place: string) => `How many Apple Stores are there in ${place}?`,
    nAppleStores: f({ one: "# Apple Store", other: "# Apple Stores" }),
    /** Several stores: "5 Apple Stores, including A, B and C". `stores`: up to three names (state pages add "in {city}"). */
    countMany: (count: string, stores: string) => `${count}, including ${stores}.`,
    /** One store: "1 Apple Store: Apple The Summit". */
    countOne: (count: string, store: string) => `${count}: ${store}.`,
    placeRestockQ: (place: string) => `How often do ${place} Apple Stores restock the iPhone?`,
    placeLastsQ: (place: string) => `How long does stock last in ${place}?`,
    placeNearestQ: (place: string) => `What is the closest Apple Store outside ${place}?`,
  },

  /* ------------------------------------------------------------ enrich.ts: explainer and the alert rule */
  /** "In-store pickup at …": three short paragraphs. */
  explainer: (kind: Kind, place: string) => {
    const at = kind === "store" ? place : kind === "model" ? "every US Apple Store" : `Apple Stores in ${place}`;
    return [
      `Pickup stock is sold on apple.com: pick a configuration and a store at checkout, pay online, collect in store, often the same day. It is separate from shelf stock and from carrier stores.`,
      `PickupChecker checks every tracked configuration at ${at} every 15 seconds, and every 5 when an alert points at it; a change counts only after a second confirming check, so a glitch never becomes a false restock or sell-out.`,
      `Every confirmed change is logged; that log feeds the restock chart and history on this page.`,
    ];
  },
  alertRule: "One alert = one store, one model, one storage size, one color; a push (or email) goes out within seconds of apple.com flipping to available.",

  /* ------------------------------------------------------------ enrich.ts: page titles (≤ 60 characters; the first that fits wins) */
  titles: {
    state: (name: string, duoNow: string, stores: string) => [
      `Apple Stores in ${name}: ${duoNow} of ${stores} have the iPhone Duo now`,
      `Apple Stores in ${name} – iPhone Duo pickup stock, live`,
      `Apple Stores in ${name} – iPhone Duo stock`,
      `${name} Apple Stores – iPhone stock`,
    ],
    /** `code`: the state's two-letter code. */
    city: (city: string, code: string, duoNow: string, stores: string) => [
      `Apple Stores in ${city}, ${code}: ${duoNow} of ${stores} have the iPhone Duo`,
      `Apple Stores in ${city}, ${code} – iPhone Duo pickup stock`,
      `Apple Stores in ${city}, ${code} – iPhone Duo stock`,
      `${city} Apple Stores – iPhone stock`,
    ],
    /** Store page <title> and H1: "Apple {name}" first (what people search), then the promise. `region`: the only store's city or state, or null. */
    store: (name: string, region: string | null) => {
      const r = region ? ` (${region})` : "";
      return [
        `${name}${r}: iPhone Stock Today, Pickup & Hours`,
        `${name}${r}: iPhone Stock Today & Hours`,
        `${name}${r}: iPhone Stock & Hours`,
        `${name}: iPhone Stock Today, Pickup & Hours`,
        `${name}: iPhone Stock & Hours`,
        `${name}: iPhone Stock`,
        `${name} – stock`,
      ];
    },
    model: (name: string, storesNow: string) => [
      `${name} pickup stock: ${storesNow} Apple Stores have it right now`,
      `${name} pickup stock: ${storesNow} Apple Stores have it now`,
      `${name} in-store pickup stock, live`,
    ],
  },

  /* ------------------------------------------------------------ lib/content/facts.ts: live {{tokens}} in articles */
  tokens: {
    /** {{duo.medianStay}} before there are enough restock → sell-out pairs. */
    tooFewToMeasure: "too few to measure yet",
    /** {{duo.lastRestock}} before the first restock. */
    noneLoggedYet: "none logged yet",
    /** {{duo.topConfig}} before the first restock. */
    noneYet: "none yet",
  },

  /* ------------------------------------------------------------ lib/content/siteFacts.ts: one store's restock pattern */
  pattern: {
    /** `days`: the window (30). */
    none: (days: string) => `No confirmed restock in the last ${days} days.`,
    nConfirmed: f({ one: "# confirmed restock", other: "# confirmed restocks" }),
    /** `count`: "30 confirmed restocks". */
    countIn: (count: string, days: string) => `${count} in the last ${days} days`,
    /** Median minutes a restock stayed listed. */
    stay: (minutes: string) => `; typically listed ~${minutes} min before selling out`,
    nDays: f({ one: "# day", other: "# days" }),
    /** Restocks on too few local days to call a pattern: `onDays` "2 days" or null. */
    tooFew: (count: string, onDays: string | null, stay: string) => `${count}${onDays ? ` on ${onDays}` : ""} — too few to call a pattern yet${stay}.`,
    /** `hour`: "8 AM" / "noon"; `weekday`: "Friday" or null. */
    usual: (hour: string, weekday: string | null, count: string, stay: string) => `Usually restocks around ${hour} local time${weekday ? `, busiest on ${weekday}` : ""}; ${count}${stay}.`,
  },

  /* ------------------------------------------------------------ lib/seo/countryLinks.ts: a country's word for its regions */
  regionNouns: {
    state: f({ one: "state", other: "states" }),
    province: f({ one: "province", other: "provinces" }),
    area: f({ one: "area", other: "areas" }),
    department: f({ one: "department", other: "departments" }),
    prefecture: f({ one: "prefecture", other: "prefectures" }),
    emirate: f({ one: "emirate", other: "emirates" }),
    canton: f({ one: "canton", other: "cantons" }),
    region: f({ one: "region", other: "regions" }),
    county: f({ one: "county", other: "counties" }),
    city: f({ one: "city", other: "cities" }),
  } as Record<string, Forms>,

  /* ------------------------------------------------------------ components/ui/Viz.tsx */
  measured: "How this is measured",

  /* ------------------------------------------------------------ components/seo/* */
  /** Faq and RichFaq heading. */
  faqTitle: "FAQ",
  breadcrumb: "Breadcrumb",
  keepExploring: "Keep exploring",
  browse: {
    storesByState: "Stores by state",
    allStatesCities: "All states & cities →",
    liveByModel: "Live stock by model",
    modelStock: (model: string) => `${model} stock`,
    thisPage: "this page",
    /** `short`: "Duo", "18 Pro", "18 Pro Max". */
    restockLog: (short: string) => `${short} restock log`,
    liveMap: "Live map",
    mostStores: "Most stores",
    allStates: "All states",
    bigCities: "Big cities",
    cities: "Cities",
    /** `region`: the country's word for its regions (regionNouns), singular. */
    storesBy: (region: string) => `Stores by ${region}`,
    /** `inName` is English only ("in the UK"); other languages use `country`, the country's name. */
    allStoresIn: ({ inName }: { inName: string; country: string }) => <>All Apple Stores {inName} →</>,
    /** `regions`: the region word, plural. */
    allRegions: (regions: string) => `All ${regions}`,
  },
  modelCards: "By iPhone",
  narrative: {
    /** " Last restock: <b>iPhone Duo 256GB Black</b> at Apple X, 3m ago." `at` is narrative.at or nothing. */
    lastRestock: (config: ReactNode, at: ReactNode, ago: ReactNode) => <>{" "}Last restock: {config}{at}, {ago}.</>,
    at: (store: ReactNode) => <> at {store}</>,
  },
  statStrip: {
    inStockNow: "In stock now",
    ofStores: (n: string) => `of ${n} stores`,
    stores: "Stores",
    nCities: f({ one: "# city", other: "# cities" }),
    tracked: "tracked",
    /** `short`: "Duo", "18 Pro"… */
    modelNow: (short: string) => `${short} now`,
    configsInStock: "configs in stock",
    storesWithStock: f({ one: "store with stock", other: "stores with stock" }),
    restocks24h: "Restocks 24 h",
    /** A tile scoped to one model: "Restocks 24 h · Duo". */
    scoped: (label: string, model: string) => `${label} · ${model}`,
    /** "9 in 7 d · 31 in 30 d" (d = days). */
    restocksHint: (week: string, month: string, days: string) => `${week} in 7 d · ${month} in ${days} d`,
    sellOuts: (days: string) => `Sell-outs ${days} d`,
    stays: (duration: string) => `stays ~${duration}`,
    noPairs: "no pairs yet",
    lastRestock: "Last restock",
    noneYet: "none yet",
    inLastDays: (days: string) => `in the last ${days} days`,
  },
  product: {
    chooseIphone: "Choose the iPhone",
    storage: "Storage",
    color: "Color",
    /** Facet chip for every storage size / every colour. */
    all: "All",
    /** `unit`: "stores" / "configurations". */
    numbersAre: (unit: ReactNode) => <>Numbers = {unit} with stock now.</>,
    seen: (ago: ReactNode) => <>seen {ago}</>,
    last: (ago: ReactNode) => <>last {ago}</>,
    notSeenYet: "not seen yet",
    firstCheckPending: "first check pending",
    inStock: "In stock",
    /** Place list rows (lower case). */
    inStockLower: "in stock",
    none: "none",
    /** Drive time under a few hundred metres. */
    here: "here",
    notAvailable: "Not available",
    notCheckedYet: "Not checked yet",
    availableForPickup: "Available for pickup",
    since: (ago: ReactNode) => <> · since {ago}</>,
    lastInStock: (ago: ReactNode) => <>Last in stock {ago}</>,
    neverSeen: "Never seen in stock here yet",
    firstCheckSoon: "First check within a minute",
    buy: "Buy on apple.com",
    /** `checked`: "7s ago" (ticks); `note`: checkNote. */
    checked: (checked: ReactNode, note: ReactNode) => <>Checked {checked} · {note}</>,
    /** Same words as CHECK_NOTE in lib/plans.ts. */
    checkNote: "every 15 s, 5 s with an alert",
  },

  /* ------------------------------------------------------------ components/content/* */
  /** Table source line under a content table. */
  source: (source: ReactNode) => <>Source: {source}</>,
  /** Photo credit: `link` is "{photographer} / Pexels". */
  photoCredit: (link: ReactNode) => <>Photo: {link}</>,
  sources: "Sources",
  /** Default `where` of the tracker line. */
  allUsStores: "all 269 US Apple Stores",
  /** The first source: our own tracker. `since`: the date tracking began; `asOf`: when this page's numbers were read. */
  trackerSource: (where: ReactNode, since: ReactNode, asOf: ReactNode) => <>PickupChecker live tracker: every iPhone Duo, 18 Pro and 18 Pro Max configuration at {where}, checked every 15 seconds (every 5 for stores with alerts) since {since}; numbers on this page as of {asOf}.</>,
  live: {
    configsCaption: (stores: ReactNode, model: ReactNode) => <>Apple Stores (of {stores}) with each {model} configuration for pickup now · live</>,
    storage: "Storage",
    pricesCaption: (model: ReactNode) => <>{model} prices on apple.com (unlocked, before tax) and live pickup stock</>,
    price: "Price",
    bestColor: "Best color, stores now",
    noRestock: (model: string) => `No ${model} restock logged yet.`,
    /** RestockClock label: "for the iPhone Duo nationwide". */
    clockLabel: (model: string) => `for the ${model} nationwide`,
    storesWithIt: "Stores with it now",
    pairsInStock: "Store × config pairs in stock",
    restocksLogged: "Restocks logged",
    medianTime: "Median time in stock",
    /** Below one minute. */
    underOneMin: (min: string) => `< ${min}`,
  },

  /** Photo alt text and caption by image id. English is src/content/images.json itself (scripts/pexels.mjs writes it); a translation lists the ids it covers. */
  photos: Object.fromEntries((photoList as { id: string; alt: string; caption?: string }[]).map((p) => [p.id, p.caption ? { alt: p.alt, caption: p.caption } : { alt: p.alt }])) as Record<string, { alt: string; caption?: string }>,
};
