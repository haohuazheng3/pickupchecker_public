/**
 * English strings: modules — the restock, store and stock modules (src/components/{restocks,stores,stock}).
 *
 * For translators:
 * - `label` is a place phrase the page builds ("in Ohio", "at Apple Somerset", "here"); it already carries its preposition.
 * - Numbers arrive raw (English prints them as the site always has, "1170"); other languages format them with
 *   num() / plural() from @/lib/i18n/format. Durations, times, dates and percentages arrive already formatted.
 * - Functions that return JSX keep the bold runs (<b className="text-ink">) and the passed-in nodes (links, live times).
 * - Check intervals are only ever 15 seconds (every store) and 5 seconds (stores with alerts).
 */
import type { ReactNode } from "react";
import { CHECK_NOTE } from "@/lib/plans";

const s = (n: number) => (n === 1 ? "" : "s");

export const modules = {
  /** DailyBars: 30 days of restocks (bars) and sell-outs (stacked under them). */
  daily: {
    empty: (label: string, days: number) => `No restock or sell-out has been logged ${label} in the last ${days} days — the chart fills in from the first one.`,
    summary: (restocks: number, soldouts: number, label: string, days: number, activeDays: number) =>
      `${restocks} restock${s(restocks)} and ${soldouts} sell-out${s(soldouts)} ${label} over the last ${days} days, on ${activeDays} different day${s(activeDays)}.`,
    /** Follows `summary` (leading space). `day` is a short date ("10/26"). */
    busiest: (day: string, restocks: number) => <> The busiest day was <b className="text-ink">{day}</b> with {restocks}.</>,
    /** Screen-reader text of one bar. */
    barAria: (day: string, restocks: number, soldouts: number) => `${day}: ${restocks} restocks, ${soldouts} sell-outs`,
    barTitle: (day: string, restocks: number, soldouts: number) => `${day}: ${restocks} restocks · ${soldouts} sell-outs`,
    legendRestocks: "restocks",
    legendSoldouts: "sell-outs",
  },

  /** Last24Hours: "iPhone Duo restocks {label} in the last 24 hours" — sentence, three tiles, a table per configuration. */
  last24: {
    title: (label: string) => `iPhone Duo restocks ${label} in the last 24 hours`,
    /** `when` is a date and time ("Nov 3, 10:00 AM EST" or "Nov 3, 6:10 AM local time"). */
    asOf: (when: string) => `as of ${when}`,
    localTime: (when: string) => `${when} local time`,
    /** Stands in for a store the catalogue no longer has. */
    anAppleStore: "an Apple Store",
    unknown: "The last-24-hours count could not be read just now; the live stock and the restock log on this page are unaffected.",
    none: (label: string, asOf: string) => <><b className="text-ink">No iPhone Duo restock {label} in the last 24 hours</b> (as of {asOf}).</>,
    /**
     * `one`: the place is one store (then `withStores`/`allStores` are not said). `config` "256GB Night Sky",
     * `store` a link to the store of the latest restock (null for one store), `when` its local date and time.
     */
    some: (o: { restocks: number; one: boolean; label: string; withStores: number; allStores: number; config: string; store: ReactNode | null; when: string }) => (
      <>In the last 24 hours the iPhone Duo restocked <b className="text-ink">{`${o.restocks} time${s(o.restocks)}`} {o.one ? o.label : `at ${o.withStores} of the ${o.allStores} Apple Store${s(o.allStores)} ${o.label}`}</b>; the latest: <b className="text-ink">{o.config}</b>{o.store != null && <> at {o.store}</>}, {o.when} local time.</>
    ),
    tileRestocks: "confirmed restocks · 24 h",
    tileConfigsBack: "configurations that came back",
    /** `configs` 0: no configuration came back (then only "stores with a restock"). */
    tileStores: (configs: number, allConfigs: number) => `stores with a restock${configs ? ` · ${configs} of ${allConfigs} configurations` : ""}`,
    /** `store` null on a one-store page. */
    tileLatest: (config: string, store: string | null) => <>latest · {config}{store != null && <> · {store}</>}</>,
    /** The last restock before the 24 hours; `day` its local date ("Nov 1"). */
    tileBefore: (config: string, store: string | null, day: string) => <>last before that · {config}{store != null && <> · {store}</>} · {day}</>,
    tileNoEarlier: "no earlier restock on record",
    caption: (label: string, asOf: string) => `Confirmed restocks of each iPhone Duo configuration ${label}, last 24 hours, as of ${asOf}`,
    thConfig: "Configuration",
    thRestocks: "Restocks",
    thStores: "Stores",
    thLast: "Last restock (local time)",
    thNow: "In stock now",
    /** "2 of 5" stores. */
    ofStores: (n: number, total: number) => `${n} of ${total}`,
    noneIn24: "none in 24 h",
    yes: "yes",
    no: "no",
    countedTitle: "How restocks are counted",
    counted: "PickupChecker's own checks of apple.com in-store pickup: every store every 15 seconds, the stores with alerts every 5. A restock is logged only when two checks agree; the first time a store is ever seen is not counted; other trackers' reports are never mixed in.",
    /** `label` null on a one-store page. */
    alert: (label: string | null) => `Alert me${label != null ? ` ${label}` : ""} → next one within seconds`,
  },

  /** RestockClock: when restocks arrive, by local hour and weekday. */
  clock: {
    none: (label: string, days: number) => `No restocks recorded ${label} in the last ${days} days yet.`,
    /** Fewer than 5 restocks, or on fewer than 3 dates. `dates` is set only when it is under 3. */
    thin: (total: number, label: string, days: number, dates: number | null) =>
      `${total} restock${s(total)} ${label} in the last ${days} days${dates != null ? ` (on ${dates} day${s(dates)})` : ""} — too few to call a pattern yet.`,
    /** `hour` "9 AM"; `day` the busiest weekday ("Thursday"), null under 14 days of data. */
    pattern: (total: number, label: string, days: number, hour: string, day: string | null) => (
      <>{total} restocks {label} in the last {days} days. Most arrive around <b className="text-ink">{hour}</b> local time{day ? <>, and <b className="text-ink">{day}</b> is the busiest day</> : null}.</>
    ),
    /** `zone` the time zone's city ("New York") in English; other languages get the zone's own name. */
    byHour: (zone: string) => `By hour · ${zone} time`,
    byWeekday: "By weekday",
    /** Appended to a bar's "9 AM: 3" (leading space). */
    barReported: (n: number) => ` (+${n} reported by other trackers)`,
    barReportedTitle: (bar: string, n: number) => `${bar}: ${n} reported by other trackers`,
    legendOurs: "Confirmed by PickupChecker",
  },

  /** RestockFeed: one card per restock or sell-out. */
  feed: {
    empty: "No restocks recorded yet.",
    available: "Available",
    soldOut: "Sold out",
    /** `time` is the reader's local time ("Today 5:42 PM"). */
    soldOutAt: (time: ReactNode) => <>sold out {time}</>,
    since: (time: ReactNode) => <>since {time}</>,
    restockedAt: (time: ReactNode) => <>restocked {time}</>,
    mapAria: (store: string) => `Show ${store} on the map`,
    map: "Map",
    /** `config` "256GB Night Sky". */
    buyAria: (model: string, config: string) => `Buy the ${model} ${config} on apple.com`,
    buy: "Buy on apple.com",
  },

  /** RestocksByConfig: which configurations came back, most first. */
  byConfig: {
    empty: (label: string, days: number) => `No configuration has restocked ${label} in the last ${days} days, so there is no ranking yet.`,
    intro: (label: string, days: number) => `Which configurations came back ${label} in the last ${days} days, most often first.`,
    times: (n: number) => `${n}×`,
    alert: "Alert me",
  },

  /** SellOutTimes: how fast restocks sell out. Durations arrive formatted ("45–60 s", "2 min 05 s"). */
  sellout: {
    /** `band` "60–80 seconds". */
    typical: (label: string, band: string) => `A typical iPhone Duo restock ${label} sold out in about ${band}.`,
    half: (label: string, duration: string) => `Half of the restocks ${label} sold out within ${duration}.`,
    none: (label: string, days: number) => `No restock ${label} has sold out in the last ${days} days yet.`,
    whatDuo: "iPhone Duo",
    whatAll: "all iPhones",
    tileHalf: (what: string) => <>half gone within · {what}</>,
    tileWithin30: "gone within 30 s",
    tileWithin60: "gone within 1 min",
    tileFastest: (n: number, days: number) => <>fastest · {n} sold-out restocks, {days} d</>,
    caption: (days: number) => `By iPhone, last ${days} days`,
    thIphone: "iPhone",
    thSoldOut: "Sold out",
    thHalf: "Half gone within",
    thWithin30: "≤ 30 s",
    thWithin60: "≤ 1 min",
    thFastest: "Fastest",
    each: "Restock by restock",
    /** `full` "180 s": a bar this long is full width. */
    barNote: (full: string) => `bar = seconds listed · full at ${full}`,
    stillListed: (duration: string) => `still listed · ${duration}`,
    /** A range bounded by the 15-second round rather than two recorded checks. */
    approx: (range: string) => `≈ ${range}`,
    measuredTitle: "How this is measured",
    /** `estimated`: some rows are marked ≈. */
    measured: (estimated: boolean) =>
      `“Sold out in 45–60 s” means the configuration was still listed at our check 45 seconds after we first saw it and gone at the check 60 seconds after. Stores with alerts are checked every 5 seconds, every other store every 15, so that is the width of each range${estimated ? "; ≈ marks restocks from before we recorded the last check, bounded by the 15-second round instead" : ""}. A listing shorter than one check can come and go between two of them, so the real share gone within 30 seconds is higher than shown.`,
  },

  /** ConfigTable: every configuration at one store. */
  configTable: {
    title: "Every configuration at this store",
    titleAt: (store: string) => `Every configuration at ${store}`,
    /** `hasRows`: earlier answers are listed below. */
    lookupOff: (hasRows: boolean) => `Apple isn't offering in-store pickup lookups at this store right now${hasRows ? " (the last answers it gave are below)" : ""}`,
    tracked: (n: number) => `${n} configurations tracked`,
    firstSweep: "First sweep in progress — statuses appear within a minute",
    inStock: (n: number, total: number) => `${n} of ${total} in stock`,
    /** Shown when Apple's own wording (its pickup quote) is missing. */
    available: "Available",
    unavailable: "Unavailable",
    noLookup: "no pickup lookup",
    notChecked: "not checked yet",
    /** `ago` ticks ("7s ago"). */
    since: (ago: ReactNode) => <>since {ago}</>,
    lastAvailable: (ago: ReactNode) => <>last available {ago}</>,
    neverHere: "never seen in stock here",
    buy: "Buy",
    alertAria: (model: string, config: string, store: string) => `Alert me when the ${model} ${config} is available at ${store}`,
    alert: "Alert me →",
  },

  /** ModelStoreMatrix: one row per store, one cell per model. */
  matrix: {
    store: "Store",
    checked: "Checked",
    cellTitle: (model: string, n: number, total: number) => `${model}: ${n} of ${total} configurations available`,
  },

  /** NearbyStores: `short` "Duo". */
  nearby: {
    duo: (short: string, n: number) => `${short} · ${n}`,
    noDuo: (short: string) => `no ${short}`,
  },

  /** StockByModel: one card per iPhone at a store. */
  stockByModel: {
    availableNow: (n: number, total: number) => `${n} of ${total} configurations available now`,
    noneNow: (total: number) => `none of ${total} configurations right now`,
    lookupOff: "Apple isn't offering pickup lookups here right now",
    notChecked: "not checked yet",
    more: (n: number) => `+${n}`,
    /** `ago` ticks ("7s ago"). */
    checked: (ago: ReactNode) => <>checked {ago}</>,
    alert: "Alert me →",
  },

  /** StoreBlock: a store in full on a thin region or city page. */
  storeBlock: {
    /** `ago` ticks; then the check intervals (15 s, 5 s with an alert). */
    checked: (ago: ReactNode) => <>Checked {ago} · {CHECK_NOTE}</>,
    map: "Show on map",
    alert: "Alert me here",
    alsoIn: (region: string) => `Also in ${region}`,
    acrossLine: "Nearest stores across the state line",
    elsewhere: "Nearest stores elsewhere",
  },

  /** StoreInfo / HoursTable: address, hours and today's status (times are 24-hour "10:00"). */
  hours: {
    title: "Hours",
    /** `zone` the time zone's city ("New York"). */
    local: (zone: string) => `Local time · ${zone}`,
    /** After today's status (leading " · "). */
    today: (hours: string, week: string) => ` · today ${hours} · ${week}`,
    directions: "Directions",
    applePage: "apple.com store page",
    liveMap: "Live map",
    storePage: "Store page",
    closed: "Closed",
    everyDay: (hours: string) => `Every day ${hours}`,
    openNow: (closes: string) => `Open now · closes ${closes}`,
    opensAt: (opens: string) => `Opens at ${opens}`,
    /** `next` from nextOpen ("tomorrow at 10:00", "Mon at 10:00"); null if no day opens. */
    closedToday: (next: string | null) => (next ? `Closed today · opens ${next}` : "Closed today"),
    closedNow: (next: string | null) => (next ? `Closed now · opens ${next}` : "Closed now"),
    /** `day` a short weekday ("Mon"); null = tomorrow. */
    nextOpen: (day: string | null, time: string) => `${day ?? "tomorrow"} at ${time}`,
  },

  /** LiveStats: three numbers on the home page. */
  liveStats: {
    inStock: "In stock now",
    storesWith: "Stores w/ stock",
    lastCheck: "Last check",
    none: "—",
  },

  /** StockBoard: stores with a model in stock now. */
  board: {
    summary: (n: number, stores: number, short: string) => `${n} of ${stores} stores have the ${short} in stock`,
    lastCheck: (ago: ReactNode) => <>Last check {ago}</>,
    firstSweep: "First sweep in progress.",
    /** `storage` / `color` null when not filtered. */
    noneListed: (model: string, storage: string | null, color: string | null) => `No store lists the ${model}${storage ? ` ${storage}` : ""}${color ? ` in ${color}` : ""} right now.`,
    more: (n: number) => `+${n}`,
    seen: (ago: ReactNode) => <>Seen {ago}</>,
    loading: "Loading stock",
  },
};
