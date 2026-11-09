/**
 * English strings: views — the product × place pages, the restock log, the live map, the iPhone Duo restock-times
 * answer page and the store index, shared by the US, the English country trees and the native versions. English
 * here is exactly what those pages have always printed (same text, markup and classes). Server only.
 *
 * For translators
 * - `c: Country` is the page's country as English data (c.inName "in the UK", c.short "UK", c.regionNoun "county").
 *   Name it in your language with places.countryLabel(c.cc, lang) and use your own word for its regions.
 * - Arguments called `name`, `place`, `region`, `city`, `store`, `config` (strings) arrive already in your language.
 *   `Store` / `Place` objects are English data: name them with places.appleStoreLabel / cityLabel / regionLabel.
 * - Numbers arrive raw: format them for your language (format.ts: num, pct, plural, stamp, hour…).
 * - Strings with **bold** / [label](href) are rendered by Inline / Md; hrefs stay in their English form (/jp/…),
 *   the site moves them to the reader's language. JSX entries keep their markup (classes, links) as they are.
 * - Never translate model names (iPhone Duo, iPhone 18 Pro, 18 Pro Max), storage sizes, "Apple Store",
 *   "PickupChecker", URLs or part numbers. Check intervals are only ever 15 and 5 seconds; no refund wording.
 */
import type { ReactNode } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import type { Point } from "@/components/ui/Viz";
import type { Faq } from "@/lib/content/types";
import { appleName, storeLocality, storePath, type Store } from "@/lib/apple/catalog";
import { theName, type Country } from "@/lib/apple/countries";
import { faq as placeFaq, fitTitle, fmtDuration, listWords, plural, type FaqContext, type FaqItem } from "@/lib/seo/enrich";
import { priceLabel, productDescription, productFaq, productTitle } from "@/lib/seo/productCopy";
import type { PlaceLevel } from "@/lib/seo/products";
import { regionWord } from "@/lib/seo/countryLinks";
import { hourShare, rangeLabel, type DayRow, type RestockTimes, type SelloutFacts } from "@/lib/content/restockTimes";
import { PATTERN_MIN, PATTERN_MIN_DAYS, WEEKDAYS, WEEKDAY_MIN_SPAN, hourLabel, localStamp } from "@/lib/content/siteFacts";
import { SPEED } from "@/lib/plans";

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/* ---------------------------------------------------------------- restock-times helpers */

/** The restock-times page's numbers (lib/content/restockTimes.ts) and its busiest two-hour window. */
export interface RestockTimesMeta {
  c: Country;
  t: RestockTimes;
  /** The busiest two local hours [from, to) and their share (0–1) of all restocks. */
  w: { from: number; to: number; share: number };
  /** A usual hour may be stated (enough restocks over enough days). */
  pattern: boolean;
  /** A place page of another country (/{cc}/iphone-duo-restock-times/{region}[/{city}]): sentences name it, not the country. */
  place?: RestockTimesPlace;
}
/**
 * The region or city a place page is about. `name` is in the page's language ("Greater London", "東京"); `inName` is
 * the English "in Greater London" (other languages build their own phrase from `name` and `kind`).
 */
export interface RestockTimesPlace {
  kind: "region" | "city";
  name: string;
  inName: string;
  /** The place's live /stores page, and its parent's restock-times page (the region of a city; null for a region). */
  storesHref: string;
  parentHref: string | null;
}
/** Everything the restock-times page's sentences use. */
export interface RestockTimesView extends RestockTimesMeta {
  us: boolean;
  /** The country has one Apple Store. */
  one: boolean;
  /** Days from the first tracked one to today. */
  tracked: number;
  /** The country's Apple Stores. */
  stores: number;
  /** Stores listing an iPhone Duo right now. */
  duoNow: number;
  /** Restocks on a Saturday or Sunday. */
  weekend: number;
  sell: SelloutFacts | null;
  /** The last 24 hours. */
  recent: { restocks: number; stores: number };
  /** iPhone Duo configurations, and stores × configurations. */
  configs: number;
  pairs: number;
  /** How many times the most-restocked storage beat the next one (1 decimal), when there are two. */
  storageRatio: number | null;
  /** Other trackers whose launch-week reports are shown. */
  reportNames: string[];
  /** Links: the alert setup, the restock log, the country's store index. */
  alert: string;
  logHref: string;
  storesHref: string;
}

const rtN = (x: number) => x.toLocaleString("en-US");
/** Whole-percent shares; a share under half a percent reads "<1%", never a misleading "0%". */
const rtPct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : `${Math.round(x * 100)}%`);
/** "Thu, Oct 29" from a calendar day. */
const dateLabel = (ymd: string, weekday = true) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", ...(weekday ? { weekday: "short" as const } : {}) }).format(new Date(`${ymd}T12:00:00Z`));
const longDate = (ymd: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
/** "Oct 27, 9:30 AM EDT": an instant in the country's reference zone (for waves across a country's zones). */
const zoneStamp = (iso: string, c: Country) => new Intl.DateTimeFormat("en-US", { timeZone: c.timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(iso));
const rtRegion = (x: { us: boolean; c: Country }) => (x.us ? "state" : (x.c.regionNoun ?? "area"));
const rtRegions = (x: { us: boolean; c: Country }) => (x.us ? "states" : (x.c.regionNounPlural ?? "areas"));
const rtYet = (x: RestockTimesMeta) => (x.t.n > 0 ? "" : " yet");
/** "in the UK", or the place of a place page: "in Greater London". */
const rtIn = (x: { c: Country; place?: RestockTimesPlace }) => x.place?.inName ?? x.c.inName;
/** What the "where" section breaks a page down by: the country's regions, a region's cities, a city's stores. */
const rtUnit = (x: { us: boolean; c: Country; place?: RestockTimesPlace }) => (x.place ? (x.place.kind === "region" ? "city" : "store") : rtRegion(x));
const rtUnits = (x: { us: boolean; c: Country; place?: RestockTimesPlace }) => (x.place ? (x.place.kind === "region" ? "cities" : "stores") : rtRegions(x));

/* ---------------------------------------------------------------- views */

export const views = {
  /** Pieces several of these pages share. */
  common: {
    /** "in the UK": the country after a phrase, also handed to the restock modules as their place label. */
    inCountry: (c: Country) => c.inName,
    liveMap: "Live map",
    restockLog: "Restock log",
    alertMe: "Alert me",
    /** Heading over the daily chart. */
    lastDays: (days: number) => <>Last {days} days</>,
    /** The date other countries' tracking began (the sources line: "Live data since …"). */
    since: "November 2, 2026",
    /** Source list: where the live data comes from. */
    sourcesWhere: (n: number, c: Country) => `${n === 1 ? "the Apple Store" : `all ${n} Apple Stores`} ${c.inName}`,
    /** Link to a country's home: "iPhone stock checker UK". */
    checker: (c: Country) => `iPhone stock checker ${c.short}`,
    appleStoresIn: (c: Country) => `Apple Stores ${c.inName}`,
    /** Label handed to the modules: "stores with it" (… of 39 stores with it). */
    storesWithIt: "stores with it",
    more: "More",
  },

  /* ---------------------------------------------------------------- /stock/{product}/{place…} */
  product: {
    /** Titles, descriptions and FAQ of the product × place pages (lib/seo/productCopy): same arguments, same shapes. */
    title: productTitle,
    description: productDescription,
    faq: productFaq,
    /** "£999–£1,599": the price range of the page's configurations (format.price for your language). */
    priceLabel,
    /** "in Tokyo" / "at Apple Ginza": the page's place after a phrase (`name` in your language; `level`: its kind). */
    inPlace: (name: string, level: PlaceLevel) => (level === "store" ? `at ${name}` : `in ${name}`),
    /** H1 of a country-wide page without bound titles: "iPhone 18 Pro pickup stock in the UK". */
    h1Country: (model: string, c: Country) => `${model} pickup stock ${c.inName}`,
    /** H1 of a place page: "iPhone Duo in Tokyo" (`where` = inPlace). */
    h1Place: (model: string, where: string) => `${model} ${where}`,
    // The four stat tiles.
    inStockNow: "In stock now",
    yes: "Yes",
    no: "No",
    /** Hint under "Yes/No" when Apple gives no pickup quote. */
    pickup: "pickup",
    configurations: "configurations",
    /** Hint: "of 39 stores". */
    ofStores: (n: number) => `of ${n} store${n === 1 ? "" : "s"}`,
    restocks24h: "Restocks 24 h",
    restocksHint: (week: number, month: number, days: number) => `${week} in 7 d · ${month} in ${days} d`,
    sellOuts: (days: number) => `Sell-outs ${days} d`,
    /** Median restock → sell-out time, in ms. */
    stays: (ms: number) => `stays ~${fmtDuration(ms)}`,
    noPairs: "no pairs yet",
    lastRestock: "Last restock",
    noneYet: "none yet",
    thisConfig: "this configuration",
    inDays: (days: number) => `in ${days} days`,
    // The status line under the H1.
    notInStockNow: "Not in stock now",
    configsInStock: (n: number, of: number) => <span><b className="text-ink">{n}</b> of {of} configurations in stock</span>,
    inStockAt: (n: number, of: number) => <span>In stock at <b className="text-ink">{n}</b> of {of} store{of === 1 ? "" : "s"}</span>,
    /** "Checked 7s ago · £999–£1,599 · VAT (20%) included": `live` is the ticking time, `tax` the tax phrase with its " · ". */
    checked: (live: ReactNode, price: string, tax: string) => <>Checked {live} · {price}{tax}</>,
    /** Apple's prices and tax there: "VAT (20%) included". */
    taxNote: (c: Country) => c.taxNote,
    /** Canada: Apple's prices are before tax. */
    beforeTax: "before tax",
    buyOnApple: "Buy on apple.com",
    allStoresIn: (c: Country) => `All stores ${c.inName}`,
    everyIphoneHere: "Every iPhone here",
    everyIphone: (where: string) => `Every iPhone ${where}`,
    /** The alert panel's summary line; `where` is null on the US national page. */
    panel: (model: string, where: string | null) => `For ${model}${where ? ` ${where}` : ""}: tick the configurations and stores`,
    /** ProductNav's count unit. */
    unitConfigs: "configurations",
    unitStores: "stores",
    otherConfigsHere: "Other configurations here",
    byStorageColor: "By storage and color",
    nearestStores: "Nearest stores",
    /** "Closest with it now: <store> · 12 km". */
    closest: (link: ReactNode, dist: string) => <>Closest with it now: {link} · {dist}</>,
    /** Inside that link on a place page: "Ginza, Tokyo". */
    storeCity: (store: string, city: string) => <>{store}, {city}</>,
    mostRecentlyInStock: "Most recently in stock",
    storesWithItNow: "Stores with it now",
    storesIn: (where: string) => `Stores ${where}`,
    colStatus: "status",
    colConfigs: "configs in stock",
    noStoreHasIt: "No store has it right now.",
    noStoreHereHasIt: "No store here has it right now.",
    moreStores: (n: number) => <>+{n} more stores — see them by state.</>,
    byRegion: (c: Country) => `By ${c.regionNoun ?? "area"}`,
    byCity: "By city",
    nearbyStores: "Nearby stores",
    latestChanges: "Latest changes",
    nothingLogged: "Nothing logged yet.",
    whenRestocks: "When it restocks",
    howFast: "How fast it sells out",
    restocksByConfig: "Restocks by configuration",
    /** FAQ titles: a country's model page, and every other page ("iPhone Duo in Tokyo"). */
    faqTitleCountry: (model: string, c: Country) => `${model} ${c.inName}: FAQ`,
    faqTitle: (model: string, where: string) => `${model} ${where}`,
    /** Source list line for a country's model page. */
    buySource: (model: string, c: Country) => `Apple: Buy ${model} (${c.short})`,
    nearby: "Nearby",
    otherRegions: (c: Country) => `Other ${c.regionNounPlural ?? "areas"}`,
    elsewhereIn: (region: string) => `Elsewhere in ${region}`,
    everyAppleStoreIn: (c: Country) => `Every Apple Store ${c.inName}`,
    /** "iPhone Duo across the UK" (`model` is the short model name). */
    across: (model: string, c: Country) => `${model} across ${c.cc === "us" ? "the US" : theName(c)}`,
    /** The ItemList (JSON-LD) name: "iPhone Duo in Tokyo". */
    itemList: (model: string, where: string) => `${model} ${where}`,
    /** A country's model page, "near me" section: the answer sentence (`inStock` of `n` stores have it; `have`: those stores, names in your language). */
    nearLead: (c: Country, model: string, inStock: number, n: number, have: { store: string; city: string; configs: number }[]) =>
      inStock === 0
        ? `No Apple Store ${c.inName} lists the ${model} for pickup right now, so "near me" is a question of which store restocks first. Set an alert at the stores you can reach and the push is sent seconds after one lists it.`
        : `${plural(inStock, "store")} of ${n} ${inStock === 1 ? "has" : "have"} the ${model} right now: ${listWords(have.slice(0, 5).map((l) => `${l.store} in ${l.city} (${l.configs} config${l.configs === 1 ? "" : "s"})`), 5)}.`,
    /** Its table by region: head and caption. */
    nearHead: (c: Country) => [cap(c.regionNoun!), "Stores with it now"],
    nearCaption: (c: Country, model: string) => `${model} pickup stock by ${c.regionNoun}, at the last check`,
    /** Its closing paragraph (markdown link to the alert setup). */
    nearMe: (c: Country, model: string, alert: string) => `To rank every store from where you are, open the alert setup on this page and tap Near me: distances are by road in ${c.unit === "mi" ? "miles" : "kilometres"}, estimated, and each store links to directions. [Set a ${model} alert](${alert}).`,
    /** A country's model page: two more questions around the tax question (place.taxFaq). `low`/`high`: whole prices. */
    modelFaq: (c: Country, model: string, low: number, high: number, inStock: number): { price: FaqItem; reserve: FaqItem } => {
      const money = (v: number) => new Intl.NumberFormat(c.priceLocale ?? c.locale, { style: "currency", currency: c.currency, maximumFractionDigits: 0 }).format(v);
      return {
        price: { q: `How much is the ${model} ${c.inName}?`, a: `From ${money(low)} to ${money(high)} on apple.com (${c.taxNote}), depending on storage.` },
        reserve: { q: `Can I reserve the ${model} for pickup ${c.inName}?`, a: `No; once a store lists a configuration you buy it on apple.com with in-store pickup selected, and it is held for your time slot.${inStock === 0 ? " Right now no store lists it, so an alert is the way to be first." : ""}` },
      };
    },
  },

  /* ---------------------------------------------------------------- /restocks */
  restocks: {
    /** n = the country's Apple Stores. */
    metaTitle: (c: Country, n: number) => `iPhone restock log ${c.inName} — ${n === 1 ? "the Apple Store" : `all ${n} Apple Stores`}, live`,
    metaDescription: (c: Country, n: number) => `Every iPhone Duo, 18 Pro and Pro Max restock at ${n === 1 ? "the Apple Store" : "Apple Stores"} ${c.inName} for in-store pickup, with exact time, configuration and map.`,
    h1: (c: Country) => `Restock log ${c.inName}`,
    /** "4 restocks in 24 hours · 21 this week · iPhone Duo · Tokyo. Times in your time zone." (`model`, `region`: the active filters). */
    summary: (day: number, week: number, model?: string, region?: string) => <>{day} restock{day === 1 ? "" : "s"} in 24 hours · {week} this week{model ? ` · ${model}` : ""}{region ? ` · ${region}` : ""}. Times in your time zone.</>,
    allModels: "All models",
    restocks: "Restocks",
    withSoldOut: "Restocks + sold out",
    /** The region filter's label ("County") and first option ("All counties"). */
    regionLabel: (c: Country) => cap(c.regionNoun ?? "area"),
    allRegions: (c: Country) => `All ${c.regionNounPlural ?? "areas"}`,
    filter: "Filter",
    page: (k: number) => <>page {k}</>,
    newer: "← Newer",
    older: "Older →",
    getAlerts: "Get alerts",
    byPlace: "Restocks by place",
    byRegion: (c: Country) => `By ${c.regionNoun ?? "area"}`,
    /** The log as a Dataset (JSON-LD). */
    datasetName: (c: Country) => `Apple Store iPhone pickup restock log ${c.inName}`,
    datasetDescription: (c: Country) => `Every confirmed restock and sell-out of the iPhone Duo, iPhone 18 Pro and iPhone 18 Pro Max for in-store pickup at ${c.cc === "us" ? "all 269 US Apple Stores" : `the Apple Stores ${c.inName}`}, with store, exact configuration and time. A restock is logged only after two matching answers from apple.com, checked every 15 seconds (every 5 for stores with alerts).`,
    datasetMeasured: ["Apple Store", "iPhone model, storage and color", "restock time", "sell-out time"],
  },

  /* ---------------------------------------------------------------- /map */
  map: {
    /** n = the country's Apple Stores. */
    metaTitle: (c: Country, n: number) => `iPhone Duo pickup stock map — ${n === 1 ? "the Apple Store" : "every Apple Store"} ${c.inName}, live`,
    metaDescription: (c: Country, n: number) => `Live map of ${n === 1 ? "the Apple Store" : `all ${n} Apple Stores`} ${c.inName} with iPhone Duo, 18 Pro and Pro Max in-store pickup stock right now, by storage and color.`,
    /** What the map (a browser component) is told about the country: its name, "in …" form and region words. */
    country: (c: Country) => ({ name: c.name, inName: c.inName, regionNoun: c.regionNoun, regionNounPlural: c.regionNounPlural }),
    everyStore: "Every store",
    storeCity: (store: string, city: string) => `${store} · ${city}`,
  },

  /* ---------------------------------------------------------------- /{cc}/stores */
  storesIndex: {
    /** Meta description; `regions`/`cities`: how many hold an Apple Store; `duo`/`max`: stores with each now. Cut at 160. */
    metaDescription: (c: Country, n: number, regions: number, cities: number, duo: number, max: number) => {
      const by = c.regionNoun && regions > 1 ? ` by ${c.regionNoun} and city` : cities > 1 ? " by city" : "";
      return `All ${n} Apple Stores ${c.inName}${by}, with live iPhone Duo, 18 Pro and Pro Max pickup stock: ${duo} have the Duo now, ${max} the Pro Max.`;
    },
    /** The answer under "How many Apple Stores…" (`spread` = place.spreadPhrase; `top`: the regions with the most, names in your language). */
    countAnswer: (n: number, spread: string, top: { name: string; count: number }[]) => `${n}, ${spread}${top.length ? `. ${top[0].name} has the most (${top[0].count})${top[1] ? `, then ${top[1].name} (${top[1].count})` : ""}` : ""}.`,
    howMany: (c: Country) => <>How many Apple Stores are there {c.inName}?</>,
    /** "Which Apple Stores … have the iPhone Duo right now?" (`have`: stores with it now). */
    duoNow: (c: Country, n: number, have: Store[]): FaqItem => ({
      q: `Which Apple Stores ${c.inName} have the iPhone Duo right now?`,
      a: have.length === 0 ? `None of the ${n} at the last check. This page and the map update the moment one lists it, and an alert tells you first.` : `${have.length} of the ${n} at the last check: ${have.slice(0, 6).map((x) => `Apple ${x.name}`).join(", ")}${have.length > 6 ? " and more" : ""}.`,
    }),
    /** The rest of the page's questions (lib/seo/enrich's place FAQ without the three this page answers elsewhere). */
    faq: (ctx: FaqContext) => placeFaq(ctx).filter((q) => !q.q.startsWith("How many Apple Stores are there") && !q.q.startsWith("Which Apple Stores in") && !q.q.startsWith("How long does stock last")),
    /** The Duo keyword section's paragraph (markdown link to the alert setup). */
    duoBlock: (alert: string) => `The fastest way to get one is an alert at the stores you can reach: [set an iPhone Duo alert](${alert}). Each store × exact configuration is one alert, and the push is sent seconds after a store lists it.`,
    /** The intro (Inline: **bold**); `spread` = place.spreadPhrase, `tax` = place.taxSentence. */
    intro: (c: Country, n: number, spread: string, now: { duo: number; max: number; pro: number }, tax: string) => `There ${n === 1 ? "is" : "are"} **${n} Apple Store${n === 1 ? "" : "s"}** ${c.inName}, ${spread}. Right now **${now.duo}** of them list an iPhone Duo for pickup, **${now.max}** the iPhone 18 Pro Max and **${now.pro}** the 18 Pro. ${tax}`,
    crumb: "Apple Stores",
    panel: (c: Country) => `Pick the phones and tick the stores ${c.inName} you can get to`,
    matrixLabel: "Stock by store",
    matrixH2: (c: Country) => <>Stock at every Apple Store {c.inName}</>,
    matrixHint: "In stock now / tracked, per model.",
    /** The table of regions with the most stores. */
    topCaption: (c: Country) => <>{regionWord(c.cc, true, true)} with the most Apple Stores (Apple retail store list, as tracked here)</>,
    regionHead: (c: Country) => regionWord(c.cc, false, true),
    colStores: "Apple Stores",
    colCities: "Cities",
    locationsBy: (c: Country) => `Apple Store locations by ${regionWord(c.cc)}`,
    locationsIn: (c: Country) => `Apple Store locations ${c.inName}`,
    /** A region card's count, and the whole country's when it has no regions. */
    storeCount: (n: number) => <>{n} store{n > 1 ? "s" : ""}</>,
    storeCountAll: (n: number) => <>{n} stores</>,
    whenRestock: (c: Country) => <>When do stores {c.inName} restock?</>,
    howFast: (c: Country) => <>How fast do restocks sell out {c.inName}?</>,
    faqTitle: (c: Country) => `Apple Stores ${c.inName}: FAQ`,
    getApp: "Get the app",
    howItWorks: "How it works",
    pricing: "Pricing",
  },

  /* ---------------------------------------------------------------- /iphone-duo-restock-times */
  restockTimes: {
    /** Number, date and name formats of this page (tables included). */
    fmt: {
      n: rtN,
      /** A share 0–1 as a whole percent ("<1%" under half a percent). */
      pct: rtPct,
      /** A calendar day (YYYY-MM-DD): "Thu, Oct 29", or "Oct 29" without the weekday. */
      date: dateLabel,
      longDate,
      /** An instant in the country's reference zone, with the zone: "Oct 27, 9:30 AM EDT". */
      zoneStamp,
      /** An instant in the store's own zone: "Nov 2, 2:31 PM". */
      local: localStamp,
      /** A local hour, and a window [from, to): "9 AM", "9–11 AM", "noon–2 PM". */
      hour: hourLabel,
      range: rangeLabel,
      /** 0 = Sunday. */
      weekday: (d: number) => WEEKDAYS[d],
      /** A store, and a store with where it is (tables). */
      store: (s: Store) => appleName(s),
      storeWithPlace: (s: Store) => `${appleName(s)} (${storeLocality(s)})`,
    },
    /** <title>/H1 base of a country's page (the US one is fixed). */
    title: (c: Country, place?: RestockTimesPlace) => `When Does Apple Restock the iPhone Duo ${place?.inName ?? c.inName}?`,
    metaDescription: (x: RestockTimesMeta) => {
      const { c, t, w, pattern } = x;
      const region = x.place ? (x.place.kind === "region" ? "city" : null) : c.cc === "us" ? "state" : (c.regionNoun ?? "store");
      const since = dateLabel(t.since, false);
      const where = rtIn(x);
      /** "hour, day, county, store and configuration"; a city page has no unit between day and store. */
      const by = region ? `${region}, store` : "store";
      return t.n > 0 && pattern
        ? fitTitle([
          `${rtN(t.n)} iPhone Duo restocks at Apple Stores ${where} since ${since}: ${rtPct(w.share)} between ${rangeLabel(w.from, w.to)} local time${t.sellout ? `, ${rtPct(t.sellout.within2min)} gone within 2 minutes` : ""}. Tables by hour, day, ${by} and configuration.`,
          `${rtN(t.n)} iPhone Duo restocks at Apple Stores ${where} since ${since}: ${rtPct(w.share)} between ${rangeLabel(w.from, w.to)} local time. Tables by hour, day, ${region ?? "store"} and configuration.`,
          `iPhone Duo restock times ${where}: ${rtN(t.n)} restocks since ${since}, by hour, day, ${region ?? "store"} and configuration.`,
        ], 158)
        : t.n > 0
          ? fitTitle([
            `${rtN(t.n)} confirmed iPhone Duo restocks at Apple Stores ${where} since ${since}, from checks every ${SPEED.checkSec} seconds: by local hour, day by day, by ${by} and configuration, and how long each lasted.`,
            `iPhone Duo restock times ${where}: ${rtN(t.n)} confirmed restocks since ${since}, by hour, day, ${region ?? "store"} and configuration.`,
          ], 158)
          : `When Apple Stores ${where} restock the iPhone Duo, from PickupChecker's own checks every ${SPEED.checkSec} seconds since ${longDate(t.since)}: hour by hour, day by day, by store and configuration.`;
    },
    h1: (x: RestockTimesView) => x.t.unknown
      ? `When does Apple restock the iPhone Duo ${rtIn(x)}?`
      : x.t.n > 0
        ? `When does Apple restock the iPhone Duo ${rtIn(x)}? ${x.pattern ? `Mostly ${rangeLabel(x.w.from, x.w.to)}, store local time` : "Hour by hour, from our own checks"}`
        : `Is Apple restocking the iPhone Duo ${rtIn(x)}? Not yet, by our checks — here is what we watch`,
    /** The answer paragraph under the H1. */
    intro: (x: RestockTimesView) => {
      const { t, one, tracked, pattern, w } = x;
      const where = rtIn(x);
      return t.unknown ? (
        <>Our restock log could not be read just now; the stores {where} are still being checked every {SPEED.checkSec} seconds, and this page returns with its numbers on the next load.</>
      ) : t.n > 0 && pattern ? (
        // The sentence an answer engine lifts whole: share, sample size, since-date, window, local time (docs/research.md §8).
        <>
          <b className="text-ink">{rtPct(w.share)} of the {rtN(t.n)} iPhone Duo restocks</b> PickupChecker confirmed at {one ? "the Apple Store" : "Apple Stores"} {where} since {longDate(t.since)} landed <b className="text-ink">between {rangeLabel(w.from, w.to)}</b> in the store&apos;s local time{x.sell ? <>, and a typical one sold out in about {Math.round(x.sell.medianSec / 5) * 5} seconds</> : null}. <b className="text-ink">Yes, Apple is still restocking it</b>{tracked > 1 ? <>: on {t.days} of the {tracked} days so far</> : <> (one day of tracking so far)</>}.
        </>
      ) : t.n > 0 ? (
        <>
          <b className="text-ink">Yes.</b> {one ? "The Apple Store" : "Apple Stores"} {where} {one ? "has" : "have"} restocked the iPhone Duo <b className="text-ink">{rtN(t.n)} times since {longDate(t.since)}</b>{tracked > 1 ? <>, on {t.days} of the {tracked} days</> : <> (one day of tracking so far)</>}; a usual hour is stated from {PATTERN_MIN} restocks over {PATTERN_MIN_DAYS} different days.
        </>
      ) : (
        <>
          <b className="text-ink">Not yet, by our checks.</b> Since {longDate(t.since)} PickupChecker has asked {one ? "the Apple Store" : `all ${x.stores} Apple Stores`} {where} every {SPEED.checkSec} seconds and has not confirmed an iPhone Duo pickup restock.
        </>
      );
    },
    /** The four hero tiles' labels. */
    hero: {
      restocks: (x: RestockTimesView) => `confirmed restocks since ${dateLabel(x.t.since, false)}`,
      window: (x: RestockTimesView) => `between ${rangeLabel(x.w.from, x.w.to)}, store local time`,
      days: "days with at least one restock",
      now: (one: boolean): string => (one ? "store lists one for pickup right now" : "stores list one for pickup right now"),
      today: (x: RestockTimesView, today: DayRow) => `today (${dateLabel(today.date)})${x.one ? "" : `, at ${plural(today.stores, "store")}`}, so far`,
      weekday: "busiest weekday so far",
    },
    /** Lines under the hero tiles; `latest`: today's latest restock (`config` in your language). */
    heroPoints: (x: RestockTimesView, latest: { config: string; store: Store; at: string } | null): Point[] => [
      ...(latest ? [{ text: <>Latest: <b className="text-ink">{latest.config}</b>{x.one ? null : <> at <Link href={storePath(latest.store)} className="underline underline-offset-2">{appleName(latest.store)}</Link></>}, {localStamp(latest.at, latest.store)} local time</> }] : []),
      ...(x.t.peakWeekday != null ? [{ text: <>Most often on <b className="text-ink">{WEEKDAYS[x.t.peakWeekday]}s</b></> }] : []),
      { text: <>Apple publishes <b className="text-ink">no restock schedule</b>; these are our own confirmed checks, updated about every five minutes</>, no: true },
    ],
    /** The same with no restock yet. */
    emptyPoints: (x: RestockTimesView): Point[] => [
      { text: <>Right now <b className="text-ink">{x.duoNow} of {x.stores}</b> {x.one ? "lists" : "list"} one for pickup</> },
      { text: <>The tables below fill in from the first confirmed restock</>, step: true },
      { text: <>Hour and weekday patterns, where we have the most data: <Link href="/iphone-duo-restock-times" className="underline underline-offset-2">the US page</Link></>, step: true },
    ],
    /**
     * The "Key facts" list under the lead: five to seven sentences that each stand alone when quoted (place, iPhone
     * Duo, number, window, sample). `top`: the most-restocked configuration; `latest`: the latest restock (labels in
     * your language). Hour lines only with `x.pattern`, the listing-time line only with `x.sell` (ten timed restocks).
     */
    keyFactsTitle: "Key facts",
    keyFacts: (x: RestockTimesView, k: { top: { label: string; restocks: number } | null; latest: { config: string; store: Store; at: string } | null }): string[] => {
      const { t, w, sell } = x;
      const where = rtIn(x);
      const since = dateLabel(t.since, false);
      const peak = t.peakHour;
      return [
        `PickupChecker has confirmed ${rtN(t.n)} iPhone Duo ${t.n === 1 ? "restock" : "restocks"} at ${x.one ? "the Apple Store" : plural(x.stores, "Apple Store")} ${where} since ${longDate(t.since)}, on ${t.days} of the ${plural(x.tracked, "day")} tracked.`,
        ...(x.pattern
          ? [`${rtPct(w.share)} of the ${rtN(t.n)} iPhone Duo restocks ${where} since ${since} landed between ${rangeLabel(w.from, w.to)} store local time.`]
          : [`PickupChecker names a usual iPhone Duo restock hour ${where} only after ${PATTERN_MIN} restocks on ${PATTERN_MIN_DAYS} different days, which the ${rtN(t.n)} so far do not meet.`]),
        ...(x.pattern && peak != null ? [`The busiest single hour for iPhone Duo restocks ${where} has been ${rangeLabel(peak, peak + 1)} local time, with ${rtN(t.byHour[peak])} of ${rtN(t.n)} (${rtPct(t.byHour[peak] / t.n)}).`] : []),
        ...(sell ? [`A restocked iPhone Duo ${where} stayed listed on Apple's pickup page for a median ${sell.medianSec} seconds (${rtN(sell.n)} timed restocks since ${since}); that is listing time, not units sold.`] : []),
        ...(k.top && k.top.restocks > 0 ? [`The most-restocked iPhone Duo configuration ${where} is ${k.top.label}: ${rtN(k.top.restocks)} of ${rtN(t.n)} restocks since ${since} (${rtPct(k.top.restocks / t.n)}).`] : []),
        ...(k.latest ? [`The latest confirmed iPhone Duo restock ${where} was ${k.latest.config}${x.one ? "" : ` at ${appleName(k.latest.store)}`}, ${localStamp(k.latest.at, k.latest.store)} store local time.`] : []),
        `As of ${zoneStamp(t.at, x.c)}, a restock ${where} counts only after two matching checks of Apple's pickup page, and the first appearance after a gap in tracking is never counted.`,
      ];
    },
    setUpAlert: "Set up an iPhone Duo alert",
    logLive: "The restock log, live",
    onThisPage: "On this page",
    /** The section chips (short) and H2s (questions), by section id. */
    nav: (x: RestockTimesView): Record<string, string> => ({
      "time-of-day": "Time of day",
      "day-by-day": "Day by day",
      where: `By ${rtUnit(x)}`,
      configuration: "Configuration",
      "how-long": "How long it lasts",
      unavailable: "Why unavailable",
      reddit: "Reddit vs data",
      method: "How we count",
    }),
    h2: (x: RestockTimesView): Record<string, string> => ({
      "time-of-day": `What time of day does the iPhone Duo restock ${rtIn(x)}?`,
      "day-by-day": `Which days has Apple restocked the iPhone Duo ${rtIn(x)}?`,
      where: `Which Apple Stores restock the iPhone Duo most ${rtIn(x)}?`,
      configuration: `Which iPhone Duo configuration restocks most ${rtIn(x)}?`,
      "how-long": `How long does an iPhone Duo restock last ${rtIn(x)}?`,
      unavailable: "Why does every Apple Store say “currently unavailable”?",
      reddit: "What Reddit says about iPhone Duo restocks — and what the data says",
      method: "How does PickupChecker count a restock?",
    }),
    faq: (x: RestockTimesView): Faq[] => {
      const { t, w, pattern, sell, us, weekend, tracked } = x;
      const where = rtIn(x);
      const window = rangeLabel(w.from, w.to);
      return [
        { q: `When does Apple restock the iPhone Duo ${where}?`, a: t.n > 0 && pattern
          ? `Mostly in the morning: ${rtPct(w.share)} of the ${rtN(t.n)} confirmed restocks since ${longDate(t.since)} landed between ${window} in the store's local time, and ${rtPct(hourShare(t.byHour, 8, 12))} between 8 AM and noon. Apple publishes no schedule; this is PickupChecker's observed pattern, updated about every five minutes.`
          : `Apple publishes no schedule, and PickupChecker has logged ${plural(t.n, "confirmed restock")} ${where} since ${longDate(t.since)}${t.days ? ` on ${plural(t.days, "day")}` : ""}. A usual hour is stated once there are ${PATTERN_MIN} restocks over ${PATTERN_MIN_DAYS} different days, and this page fills in by itself.` },
        { q: `Does Apple restock the iPhone Duo on weekends${us ? "" : ` ${where}`}?`, a: t.n > 0
          ? `${weekend > 0 ? "Yes so far" : "Not yet in our data"}: ${plural(weekend, "restock")} fell on a Saturday or Sunday out of ${rtN(t.n)} (${rtPct(weekend / t.n)}). ${t.peakWeekday != null ? `${WEEKDAYS[t.peakWeekday]} has been the busiest weekday.` : `Which weekday is busiest we do not state until the data spans ${WEEKDAY_MIN_SPAN} days; ours covers ${tracked}.`}`
          : `No weekend data ${where} yet; the day-by-day table on this page fills in as restocks are confirmed.` },
        { q: "What time should I start checking?", a: t.n > 0 && pattern
          ? `If you check by hand, be on apple.com with pickup selected from ${hourLabel(w.from)} local time; that two-hour window has carried ${rtPct(w.share)} of restocks. A typical restock ${sell ? `was gone within ${sell.medianSec} seconds at the median` : "lasts about a minute"}, so an alert that checks every ${SPEED.fastSec} seconds ([how alerts work](/iphone-duo-stock-alerts)) does what no refreshing can.`
          : `Until a pattern ${where} is clear, let an alert do the watching: the stores you choose are checked every ${SPEED.fastSec} seconds, around the clock ([how alerts work](/iphone-duo-stock-alerts)).` },
        { q: "Why do all Apple Stores say the iPhone Duo is unavailable?", a: sell
          ? `Because a restock is short: ${rtPct(sell.within2min)} of the ${rtN(sell.n)} sold-out restocks we measured ${where} were gone within 2 minutes and ${rtPct(sell.within20min)} within 20. Right now ${x.duoNow} of ${x.stores} stores list one; at almost any other moment the honest reading of apple.com is “unavailable” even on a day with dozens of restocks ([what “unavailable” means](/apple-store-pickup-availability-explained)).`
          : `Because pickup stock appears for minutes at a time. Right now ${x.duoNow} of ${plural(x.stores, "store")} ${where} list one ([what “unavailable” means](/apple-store-pickup-availability-explained)).` },
        { q: "How do I get notified when my Apple Store restocks the iPhone Duo?", a: `Set an alert for the store and the exact storage and colour: from then on that store is checked every ${SPEED.fastSec} seconds and the push is sent about ${SPEED.alertSec} seconds after a restock is confirmed; when it shows on your phone depends on the phone and its connection ([set up an alert](${x.alert}); [how it works](/how-it-works)).` },
      ];
    },
    /** Source list labels (`tracker`: another tracker's name). */
    sources: {
      applePickup: "Apple: Delivery and Pickup (how in-store pickup availability works)",
      newsroom: "Apple Newsroom: iPhone Duo arrives at Apple Store locations worldwide (October 23, 2026)",
      macRumors: "MacRumors: Apple Store pickup system for iPhone Duo went live again in the US and Canada (October 24, 2026)",
      reports: (tracker: string) => `${tracker}: iPhone Duo restock reports for launch week (their observations, shown separately, never counted)`,
    },
    /** JSON-LD (WebPage + Dataset). */
    ld: (x: RestockTimesView) => ({
      datasetName: `iPhone Duo restock times at Apple Stores ${rtIn(x)}`,
      description: `Every confirmed in-store pickup restock of the iPhone Duo at Apple Stores ${rtIn(x)} since ${x.t.since}, with store, configuration and time, from PickupChecker's checks every ${SPEED.checkSec} seconds; summarised by local hour, day, ${x.place?.kind === "city" ? "" : `${rtUnit(x)}, `}store and configuration.`,
      spatial: `Apple Stores ${rtIn(x)}`,
      measured: ["restock time (store-local)", "Apple Store", "iPhone Duo storage and colour", "seconds until sold out"],
      size: `${x.t.n} restocks at ${x.t.stores} stores`,
    }),
    crumb: "iPhone Duo restock times",

    // ---- time of day
    timeLead: (x: RestockTimesView) => <b>{rtPct(x.w.share)} of the {rtN(x.t.n)} restocks landed between {rangeLabel(x.w.from, x.w.to)} in the store&apos;s local time, and {rtPct(hourShare(x.t.byHour, 8, 12))} between 8 AM and noon.</b>,
    busiestHour: (count: number) => `busiest single hour: ${rtN(count)} restocks`,
    morning: "between 8 AM and noon",
    evening: "after 5 PM: evenings are not dead",
    night: "between midnight and 6 AM",
    tooFew: (x: RestockTimesView) => <b>Too few days to call an hour{rtYet(x)}: {plural(x.t.n, "confirmed restock")} on {plural(x.t.days, "day")} since {longDate(x.t.since)}.</b>,
    tooFewKeys: (): Point[] => [
      { text: <>A usual hour needs <b className="text-ink">{PATTERN_MIN} restocks over {PATTERN_MIN_DAYS} different days</b></> },
      { text: <>Ten restocks in one burst = one event, not a habit</>, no: true },
      { text: <>The page rewrites itself as the days accumulate</>, step: true },
    ],
    hourCaption: (x: RestockTimesView) => `iPhone Duo restocks ${rtIn(x)} by the store's local hour, ${dateLabel(x.t.since, false)} to today (${rtN(x.t.n)} restocks)`,
    hourHead: ["Local hour", "Restocks", "Share"],
    morningKeys: (x: RestockTimesView): Point[] => [
      { text: <>The morning cluster is <b className="text-ink">not the doors opening</b>{x.us ? ": most US Apple Stores open at 10 AM" : ""}</> },
      { text: <>Pickup inventory is released <b className="text-ink">online</b>, before the shutters go up</> },
      { text: <>By hand: watch <b className="text-ink">{rangeLabel(x.w.from, x.w.to)}</b> on a weekday morning</>, step: true },
      { text: <>Let an <Link href={x.alert}>alert</Link> watch the <b className="text-ink">other 22 hours</b>, which nobody is refreshing for</>, step: true },
    ],
    storeChartKeys: (x: RestockTimesView): Point[] => [{ text: <>Every store page has its own chart, in its own zone (<Link href={x.storesHref}>{x.us ? "Apple Stores by state" : `stores ${rtIn(x)}`}</Link>): a store that restocks at 8 AM in a 9 AM region is worth knowing</>, step: true }],

    // ---- day by day
    dayLead: (x: RestockTimesView) => {
      const { t, tracked, one } = x;
      return t.n > 0 && tracked === 1 ? (
        <b>One day of tracking so far, {dateLabel(t.daily[t.daily.length - 1]?.date ?? t.since)}, with {rtN(t.n)} confirmed restocks{one ? "" : ` at ${plural(t.stores, "store")}`}.</b>
      ) : t.n > 0 ? (
        <b>{t.days === tracked ? `Every day we have tracked, ${t.days} of ${t.days},` : `${t.days} of the ${tracked} days since ${longDate(t.since)}`} had at least one confirmed restock{t.peakWeekday != null ? `, and ${WEEKDAYS[t.peakWeekday]} has been the busiest weekday` : ""}.</b>
      ) : (
        <b>No confirmed restock {rtIn(x)} since {longDate(t.since)}.</b>
      );
    },
    daysTracked: "days tracked with at least one restock",
    busiestDay: (x: RestockTimesView, day: DayRow) => `busiest day, ${dateLabel(day.date)}${x.one ? "" : `, at ${plural(day.stores, "store")}`}`,
    busiestDayNone: "busiest day",
    /** `drop`: the most stores restocked within one half hour. */
    drop: (x: RestockTimesView, drop: { at: string; restocks: number }) => `stores restocked within one half hour, ${zoneStamp(drop.at, x.c)} (${rtN(drop.restocks)} configurations): a national drop seen from outside`,
    weekend: (x: RestockTimesView) => `on a Saturday or Sunday (${plural(x.weekend, "restock")})`,
    dayCaption: (x: RestockTimesView) => `iPhone Duo restocks ${rtIn(x)}, day by day${x.t.reports.length ? `; the rows marked “reported” are other trackers' published observations for the days before our own tracking began, shown for the timeline only` : ""}`,
    /** Head of the day table; `stores` is left out for a one-store country. */
    dayHead: { date: "Date", restocks: "Restocks", stores: "Stores", busiest: "Busiest hour", source: "Source" },
    soFar: " · so far",
    reportedBy: (names: string[]) => <>reported by {names.join(" / ")}</>,
    dayKeys: (x: RestockTimesView, launch: string, resumed: string): Point[] => [
      { text: <><b className="text-ink">{dateLabel(launch)}</b>: launch day, the first units for online orders</> },
      { text: <><b className="text-ink">{dateLabel(resumed)}</b>: pickup reservations reopened{x.us ? " (MacRumors)" : ""}</> },
      x.t.reports.length
        ? { text: <>Rows marked <b className="text-ink">reported</b>: {x.reportNames.join(" and ")}&apos;s launch-week observations, never counted</> }
        : { text: <>Our log of every store {rtIn(x)} starts <b className="text-ink">{longDate(x.t.since)}</b></> },
      ...(x.t.n > 0 && x.t.peakWeekday == null ? [{ text: <>Busiest weekday: stated once the data spans <b className="text-ink">{WEEKDAY_MIN_SPAN} days</b> (ours covers {x.tracked})</>, no: true }] : []),
      { text: <>Read the <b className="text-ink">stores</b> column: the same restocks over more stores is a better day for you</>, step: true },
    ],

    // ---- where
    /** `hit`: the regions with restocks, most first (names in your language); `total`: all regions with a store. */
    whereLead: (x: RestockTimesView, hit: { name: string; restocks: number; stores: number; storesTotal: number }[], total: number) => (
      <b>{hit[0].name}: {rtN(hit[0].restocks)} restocks at {hit[0].stores} of its {plural(hit[0].storesTotal, "store")} since {dateLabel(x.t.since, false)}{hit[1] ? <>, then {hit[1].name} ({rtN(hit[1].restocks)})</> : null}{hit[2] ? <> and {hit[2].name} ({rtN(hit[2].restocks)})</> : null}; {hit.length} of {total} {rtUnits(x)} have had at least one restock{total - hit.length > 0 ? ` and ${total - hit.length} none yet` : ""}.</b>
    ),
    whereNone: (x: RestockTimesView) => <b>No {rtUnit(x)} {rtIn(x)} has a confirmed restock yet; the table fills in from the first one.</b>,
    regionCaption: (x: RestockTimesView) => `Confirmed iPhone Duo restocks by ${rtUnit(x)} ${rtIn(x)}, ${dateLabel(x.t.since, false)} to today`,
    regionHead: (x: RestockTimesView) => [cap(rtUnit(x)), "Restocks", "Stores restocked", "Last restock (local time)"],
    /** "3 of 5" (stores restocked of the region's stores). */
    ofN: (a: number, b: number) => <>{a} of {b}</>,
    storesCaption: (x: RestockTimesView) => `The stores with the most iPhone Duo restocks ${rtIn(x)}, ${dateLabel(x.t.since, false)} to today`,
    storesHead: ["Store", "Restocks", "Days", "Usually around", "Last (local time)"],
    swaps: (x: RestockTimesView) => [
      { no: "The store with the most restocks, wherever it is", yes: `Two or three stores you can reach within an hour of ${x.pattern ? hourLabel(x.w.from) : "the morning"}`, why: "A restock you cannot reach is not a restock; even the busiest store reads unavailable for all but a few minutes a day." },
      { no: "One store, and hope", yes: "An alert on each, then drive to the one that fires", why: "The count table only tells you which of your stores to drive to first." },
    ],
    nearMe: "Stores with the Duo near me, right now",

    // ---- configuration
    /** `top`/`rarest`: the most and least restocked configurations (labels in your language). */
    configLead: (x: RestockTimesView, top: { label: string; restocks: number }, rarest: { label: string; restocks: number } | null) => (
      <b>{top.label}: {rtN(top.restocks)} of the {rtN(x.t.n)} restocks ({rtPct(top.restocks / x.t.n)}){rarest ? `; the rarest was the ${rarest.label}, with ${plural(rarest.restocks, "restock")}` : ""}.</b>
    ),
    mostRestocked: (config: string) => `${config}: the most-restocked configuration`,
    /** "512GB restocks, against 40 for 256GB" (storage sizes or colour names). */
    versus: (a: string, bCount: number, b: string) => `${a} restocks, against ${rtN(bCount)} for ${b}`,
    restocksOf: (a: string) => `${a} restocks`,
    byStorage: "by storage",
    byColour: "by colour",
    configNone: (x: RestockTimesView) => <b>No configuration {rtIn(x)} has a confirmed restock{rtYet(x)}; the eight configurations are listed so the first restock has a row to land in.</b>,
    configCaption: (x: RestockTimesView) => `Confirmed iPhone Duo restocks ${rtIn(x)} by configuration, ${dateLabel(x.t.since, false)} to today`,
    configHead: ["Configuration", "Restocks", "Share", "Last restock (local time)"],
    configKeys: (x: RestockTimesView): Point[] => [
      { text: <>The configuration decision matters <b className="text-ink">more than the store decision</b></> },
      x.storageRatio != null
        ? { text: <>The most-restocked storage came back about <b className="text-ink">{x.storageRatio}×</b> as often as the next size: more past pickup windows, not a promise</> }
        : { text: <>The most-restocked storage has had the most past pickup windows; the table shows by <b className="text-ink">how much</b></> },
      { text: <>The <b className="text-ink">2TB</b>: a phone you order for delivery and wait for</>, no: true },
      { text: <>Prices and what is in stock right now: <Link href="/which-iphone-duo-restocks-most">Which iPhone Duo restocks most?</Link></>, step: true },
    ],

    // ---- how long
    howLongLead: (x: RestockTimesView, sell: SelloutFacts) => <b>Half of the {rtN(sell.n)} sold-out restocks {rtIn(x)} were gone within {sell.medianSec} seconds; {rtPct(sell.within2min)} within 2 minutes and {rtPct(sell.within20min)} within 20.</b>,
    /** Unit after a number of seconds in the tiles. */
    secUnit: "s",
    medianListing: "typical listing, listed to gone (median)",
    within2: "gone within 2 minutes",
    within20: "gone within 20 minutes",
    fastest: "fastest sell-out measured",
    howLongNone: (x: RestockTimesView) => <b>Too few sold-out restocks {rtIn(x)} to measure{rtYet(x)}; we state these numbers from ten, and the US page has the full picture.</b>,
    howLongKeys: (x: RestockTimesView): Point[] => [
      { text: <>A two-minute window is caught by an <b className="text-ink">alert</b>, not by refreshing apple.com</> },
      { text: <>This is the number that explains everything else on this page</> },
      { text: <>Every restock with the seconds it lasted, by configuration and {rtRegion(x)}: <Link href="/iphone-duo-sell-out-times">How fast does an iPhone Duo restock sell out?</Link></>, step: true },
    ],
    measured: "Each figure is the time from the check that first saw the configuration listed to the check that saw it gone, so it is an upper bound; the true lifetimes are shorter. It is how long Apple's pickup page listed the configuration, not how many units were sold.",

    // ---- unavailable
    unavailableLead: (x: RestockTimesView) => <b>Because a restock is a flicker, not a state: {x.one ? "one store" : `${rtN(x.stores)} stores`} × {x.configs} configurations = {rtN(x.pairs)} things that can be in stock {rtIn(x)}, and at this moment {x.duoNow} {x.duoNow === 1 ? "store lists" : "stores list"} any iPhone Duo.</b>,
    pairs: "store × configuration pairs that can be in stock",
    listingNow: "listing an iPhone Duo for pickup at this moment",
    goneIn2: "of restocks gone inside two minutes",
    last24: "confirmed restocks in the last 24 hours",
    /** `today`: today's restocks so far (when the last 24 hours have none). */
    unavailableKeys: (x: RestockTimesView, today: number): Point[] => [
      x.recent.restocks > 0
        ? { text: <>Last 24 hours: <b className="text-ink">{plural(x.recent.restocks, "confirmed restock")}</b> at {plural(x.recent.stores, "store")} {rtIn(x)}</> }
        : today > 0
          ? { text: <>Today: <b className="text-ink">{plural(today, "confirmed restock")}</b> {rtIn(x)}</> }
          : { text: <>The day-by-day table above shows the restocks that did happen</> },
      { text: <>Each one visible on apple.com for <b className="text-ink">a minute or two</b></> },
      { text: <>“Unavailable everywhere” on day four, or day fourteen, is <b className="text-ink">not</b> Apple stopping</>, no: true },
    ],
    unavailableLinks: { explained: "What “currently unavailable for pickup” means", howToGet: "How to get an iPhone Duo" },

    // ---- reddit
    redditLead: (x: RestockTimesView) => <b>Most of the folk wisdom in <a href="https://www.reddit.com/r/applestore/" target="_blank" rel="noopener nofollow">r/applestore</a> and <a href="https://www.reddit.com/r/iphone/" target="_blank" rel="noopener nofollow">r/iphone</a> is sincere, single-store, and stale within a day; here are the four claims we see most often, against {rtN(x.t.n)} confirmed restocks {rtIn(x)}.</b>,
    redditCaption: "Common Reddit claims about iPhone Duo restocks, checked against PickupChecker's confirmed restocks",
    redditHead: ["The claim", "What the data says"],
    /** The four claims and what the numbers say. */
    claims: (x: RestockTimesView): { claim: string; answer: ReactNode }[] => {
      const { t, w, tracked, recent } = x;
      return [
        { claim: "“Stores restock overnight — check at 3 AM.”", answer: t.n > 0 ? <>{rtPct(hourShare(t.byHour, 0, 6))} of restocks fell between midnight and 6 AM local time; {rtPct(w.share)} fell between {rangeLabel(w.from, w.to)}.</> : "No restock logged yet to test it against." },
        { claim: "“Apple only restocks on one weekday.”", answer: t.n > 0 ? (t.peakWeekday != null ? <>{WEEKDAYS[t.peakWeekday]} is the busiest weekday so far ({rtN(t.byWeekday[t.peakWeekday])} of {rtN(t.n)}), but restocks landed on {t.days} of {tracked} days.</> : <>Restocks landed on {t.days} of the {tracked} days we have tracked{t.days === tracked ? " with no empty day" : ""}; a busiest weekday is named once the data spans {WEEKDAY_MIN_SPAN} days.</>) : "No restock logged yet to test it against." },
        { claim: "“Call the store and ask when the truck comes.”", answer: "Apple publishes no restock schedule; what reaches apple.com is pickup inventory released online, which the store sees at the same moment as everyone else." },
        { claim: "“If it says unavailable, it's sold out for good.”", answer: recent.restocks > 0 ? <>{plural(recent.restocks, "confirmed restock")} at {plural(recent.stores, "store")} in the last 24 hours say otherwise; each was “unavailable” again within minutes.</> : t.n > 0 ? <>{rtN(t.n)} confirmed restocks since {dateLabel(t.since, false)} say otherwise; each was “unavailable” again within minutes.</> : "Nothing to test it against yet." },
      ];
    },
    redditKeys: (): Point[] => [
      { text: <>Rumour is what people reach for when there is <b className="text-ink">no data</b>; this page is the data, free to read</> },
      { text: <>Where Reddit is right: the <b className="text-ink">checkout tips</b> — signed in, Apple Pay ready (<Link href="/how-to-grab-an-iphone-duo-restock">our 20-second version</Link>)</> },
    ],

    // ---- method
    methodLead: <b>A restock is counted when apple.com lists a configuration for in-store pickup at a store where it was not listed, confirmed by two checks that agree.</b>,
    methodKeys: (x: RestockTimesView): Point[] => [
      { text: <>{x.one ? "The Apple Store" : "Every Apple Store"} {rtIn(x)} every <b className="text-ink">{SPEED.checkSec} seconds</b>; the stores alerts point at every <b className="text-ink">{SPEED.fastSec}</b></> },
      { text: <>Other trackers state intervals from <b className="text-ink">5 seconds to 15 minutes</b> on their own sites; we have not measured them, so we compare stated claims only</> },
      { text: <>A first “available” is asked again <b className="text-ink">about a second later</b> before it counts</> },
      { text: <>A listing that disappears is confirmed on the <b className="text-ink">next round</b></> },
      { text: <>The first sighting of a store, a failed or timed-out request: <b className="text-ink">never</b> a restock, never “out of stock”</>, no: true },
      { text: <>Hours and dates in each store&apos;s <b className="text-ink">local time</b>; “waves” = the same half hour across zones</> },
      { text: <>Other trackers&apos; reports{x.t.reports.length ? ` (${x.reportNames.join(", ")})` : ""}: their own labelled rows, <b className="text-ink">never in a total</b></> },
      { text: <>Updated about every five minutes; <Link href={x.logHref}>the restock log</Link> itself is live</>, step: true },
    ],
    quote: "You are welcome to quote these numbers with a link to this page; PickupChecker is independent and not affiliated with Apple, and reads the same pickup availability anyone can see on apple.com, just far more often.",
    /** The closing button: "Set up an iPhone Duo alert in the UK". */
    alertIn: (x: RestockTimesView) => <>Set up an iPhone Duo alert{x.one ? "" : ` ${rtIn(x)}`}</>,

    // ---- related, FAQ, sources
    related: "The other iPhone Duo questions",
    sameData: "Answered with the same data",
    questions: {
      sellOut: "How fast does a restock sell out?",
      alerts: "Fastest way to get notified",
      howToGet: "How to actually get one",
      whichConfig: "Which configuration restocks most",
      nearMe: "Stores with it near me, right now",
      unavailable: "What “unavailable” means",
    },
    otherCountries: (us: boolean): string => (us ? "The same page for other countries" : "Other countries"),
    /** Place pages of another country (a region or city), and the country page's rows that lead to them. */
    place: {
      /** Link row over the country's city pages ("By {region}" is nav(x).where of the country page). */
      byCity: "By city",
      /** The place's live store page. */
      storesLive: (x: RestockTimesView) => `Apple Stores ${rtIn(x)}, live`,
      /** The country's restock-times page. */
      countryPage: (c: Country) => `iPhone Duo restock times ${c.inName}`,
      /** The sources line: "all 6 Apple Stores in Greater London". */
      sourcesWhere: (x: RestockTimesView) => `all ${x.stores} Apple Stores ${rtIn(x)}`,
    },
    faqTitle: "Questions",
  },
};
