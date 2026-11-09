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
/** One measured check-interval lane as the method line words it: median and p95 already formatted ("5.0 s"), the sample, above plan. */
export interface MeasuredLane { p50: string; p95: string; n: number; slow: boolean }
/** Thousands grouped ("3,891"): the DuoNow block's numbers are quoted, so they read as prose, not as raw counters. */
const nn = (n: number) => n.toLocaleString("en-US");

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
    /** Under the headline: what a listing time is, and what it is not. */
    definition: "A listing time is how long Apple's pickup page showed the configuration as available, bounded by two of our checks; it is not how many phones were sold or how fast you must be.",
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

  /**
   * DuoNow: the conclusion block a place page opens with (state, city, store, country, Duo product page). Written so
   * an answer engine can lift it whole: a time-stamped verdict, the evidence line (when the stores last answered), the
   * Key facts list (one self-contained sentence each), four tiles, the method line with measured check intervals, the
   * last three restocks with how long each lasted. `label` is the place
   * phrase ("in Michigan", "in the UK", "at Apple Somerset"); `name` the bare place or store name.
   */
  duoNow: {
    eyebrow: (label: string) => `iPhone Duo ${label} right now`,
    /** Verdict sentences. `stamp` is "Nov 8, 4:22 AM EST"; `list` the in-stock stores (storeItem), joined. */
    notNow: (o: { stamp: string; n: number; label: string }) => <><b className="text-ink">Not in stock as of {o.stamp}</b>: none of the {nn(o.n)} Apple Store{s(o.n)} {o.label} lists an iPhone Duo for pickup.</>,
    notNowOne: (o: { stamp: string; name: string }) => <><b className="text-ink">Not in stock as of {o.stamp}</b>: {o.name} lists no iPhone Duo configuration for pickup.</>,
    inStock: (o: { stamp: string; k: number; n: number; label: string; list: ReactNode }) => <><b className="text-ink">In stock as of {o.stamp}</b>: {nn(o.k)} of the {nn(o.n)} Apple Store{s(o.n)} {o.label} list{o.k === 1 ? "s" : ""} an iPhone Duo for pickup — {o.list}.</>,
    inStockOne: (o: { stamp: string; k: number; total: number; name: string; list: ReactNode }) => <><b className="text-ink">In stock as of {o.stamp}</b>: {o.name} lists {o.k} of {o.total} iPhone Duo configuration{s(o.total)} for pickup — {o.list}.</>,
    /** One in-stock store in the list: its link, how many configurations, and since when ("listed 40 s ago"). */
    storeItem: (store: ReactNode, configs: number, ago: string | null) => <>{store} ({configs} configuration{s(configs)}{ago ? `, listed ${ago}` : ""})</>,
    /** One in-stock configuration on a store page. */
    configItem: (config: string, ago: string | null) => <>{config}{ago ? ` (listed ${ago})` : ""}</>,
    /** `lasted`: "listed 5–7 min" / "still listed" / null when unknown. */
    lastIn: (o: { config: string; store: ReactNode | null; when: string; lasted: string | null }) => <>Last in stock: <b className="text-ink">{o.config}</b>{o.store != null && <> at {o.store}</>}, {o.when}{o.lasted ? <> ({o.lasted})</> : null}.</>,
    neverYet: (label: string, since: string) => `No confirmed iPhone Duo restock ${label} since tracking began on ${since}.`,
    /** The other two models in one clause. Place: stores with any configuration; store: configurations here. */
    others: (o: { pro: number; max: number; one: boolean; configs: number }) => (o.one ? `The iPhone 18 Pro is listed in ${o.pro} of ${o.configs} configurations here, the 18 Pro Max in ${o.max}.` : `The iPhone 18 Pro is at ${o.pro} of them, the 18 Pro Max at ${o.max}.`),
    /**
     * The evidence line under the verdict: when the stores last answered, and how many answered recently enough to
     * count (`stamp` is the latest store check, a <time> node; `fresh` answered within the last minute). A store without
     * a current answer is unknown, never "out of stock".
     */
    evidence: (o: { stamp: ReactNode; fresh: number; total: number; stale: number; one: boolean; name: string }) => (o.one
      ? (o.fresh > 0
        ? <>As of {o.stamp}: {o.name} answered our check within the last minute.</>
        : <>As of {o.stamp}: no answer from {o.name} within the last minute — unknown, not counted as out of stock.</>)
      : <>As of {o.stamp}: {nn(o.fresh)} of {nn(o.total)} store{s(o.total)} answered within the last minute{o.stale > 0 ? `; ${nn(o.stale)} without a current answer — unknown, not counted as out of stock` : ""}.</>),
    /** No store of the place has answered a check yet. */
    evidenceNone: (o: { total: number; one: boolean; name: string }) => (o.one
      ? `${o.name} has not answered a check yet — unknown, not counted as out of stock.`
      : `None of the ${nn(o.total)} store${s(o.total)} has answered a check yet — unknown, not counted as out of stock.`),
    /**
     * The method line: how a restock and a listing time are counted, the planned check intervals, and the measured ones
     * (serviceStats, the lane that matches the page's country). `fast` / `round` null: no measurement yet; `win` the
     * window the measurement covers (a record shorter than 7 days says so). Only 5 s and 15 s are ever planned.
     */
    howCounted: (o: { fast: MeasuredLane | null; round: MeasuredLane | null; win: { days?: number; hours?: number } | null }) => {
      const base = "A restock counts after two matching answers (first sightings excluded); a listing time is bounded by the last check that still saw the configuration and the first that no longer did. Checks are planned every 5 s at stores with alerts and every 15 s at every store";
      const lanes = [
        o.fast && `${o.fast.p50} at the median at stores with alerts (p95 ${o.fast.p95}, ${nn(o.fast.n)} intervals${o.fast.slow ? "; slower than planned" : ""})`,
        o.round && `${o.round.p50} per full round (p95 ${o.round.p95}, ${nn(o.round.n)} rounds${o.round.slow ? "; slower than planned" : ""})`,
      ].filter(Boolean);
      if (lanes.length === 0 || !o.win) return `${base}.`;
      const win = o.win.days ? `the last ${o.win.days} day${s(o.win.days)}` : `the last ${o.win.hours ?? 1} hour${s(o.win.hours ?? 1)}`;
      return `${base}; measured over ${win}: ${lanes.join(" and ")}.`;
    },
    howLink: "How we measure →",
    /** A measured interval with its decimal already formatted ("5.0", "15.3"). */
    sec: (v: string) => `${v} s`,
    /** Dataset JSON-LD measurementTechnique. */
    technique: "PickupChecker queries Apple's in-store pickup availability for each Apple Store, every 5 s for stores with member alerts and every 15 s for every store. A restock counts only after two matching answers (first sightings excluded); a listing time is bounded by the last check that still saw the configuration and the first that no longer did.",
    /* Tiles */
    tShare: (range: string) => `of restocks between ${range}`,
    tBusiest: (count: number) => `busiest hour · ${nn(count)} restock${s(count)}`,
    tHalf: "median listing time",
    tSince: (date: string) => `confirmed restocks since ${date}`,
    tToday: "today, so far",
    mostOften: (config: string, k: number, n: number) => `most often ${config} (${nn(k)} of ${nn(n)})`,
    /** "Eastern time" for a US zone the sentences can name, else "store local time". */
    zone: (tz: string | null): string => {
      const w: Record<string, string> = { "America/New_York": "Eastern", "America/Detroit": "Eastern", "America/Kentucky/Louisville": "Eastern", "America/Indiana/Indianapolis": "Eastern", "America/Chicago": "Central", "America/Denver": "Mountain", "America/Boise": "Mountain", "America/Phoenix": "Arizona", "America/Los_Angeles": "Pacific", "America/Anchorage": "Alaska", "Pacific/Honolulu": "Hawaii", "America/Puerto_Rico": "Atlantic" };
      return tz && w[tz] ? `${w[tz]} time` : "store local time";
    },
    /**
     * Key facts: one self-contained sentence each (place + iPhone Duo + number + window), the list an answer engine
     * quotes. `label` the place phrase, `since` the first tracked day ("October 29, 2026"), `pct` "58%", `range`
     * "9–11 AM", `busiest` "9–10 AM", `median` "about 95 seconds", `config` "512GB Star White", `date` today's date.
     */
    factsTitle: (label: string) => `Key facts: iPhone Duo ${label}`,
    fN: (o: { n: number; days: number; label: string; stores: number; one: boolean; since: string }) => <>PickupChecker has confirmed <b className="text-ink">{nn(o.n)}</b> iPhone Duo restock{s(o.n)} {o.one ? o.label : o.stores === 1 ? `at the Apple Store ${o.label}` : `at the ${nn(o.stores)} Apple Stores ${o.label}`} since {o.since}, on {o.days === 1 ? "one day" : `${nn(o.days)} different days`}.</>,
    fShare: (o: { pct: string; n: number; label: string; since: string; range: string; zone: string; busiest: string; busiestN: number }) => <><b className="text-ink">{o.pct}</b> of the {nn(o.n)} iPhone Duo restocks {o.label} since {o.since} landed between {o.range.replace("–", " and ")} {o.zone}; the busiest hour was {o.busiest} ({nn(o.busiestN)} restock{s(o.busiestN)}).</>,
    /** No usual hour yet: `min` restocks on `minDays` different local days are needed (siteFacts PATTERN_MIN). */
    fTooFew: (o: { n: number; days: number; label: string; min: number; minDays: number }) => `${nn(o.n)} confirmed iPhone Duo restock${s(o.n)} ${o.label} on ${o.days === 1 ? "one day" : `${nn(o.days)} days`} ${o.n === 1 ? "is" : "are"} too few to name a usual hour yet: PickupChecker waits for ${o.min} restocks on ${o.minDays} different days.`,
    /** `n` timed listings since `since`; a listing time is how long Apple's pickup page showed it, not a buying chance. */
    fMedian: (o: { median: string; n: number; label: string; since: string }) => <>The median iPhone Duo listing {o.label} lasted <b className="text-ink">{o.median}</b> on Apple&apos;s pickup page ({nn(o.n)} timed listings since {o.since}).</>,
    fTop: (o: { config: string; k: number; n: number; pct: string; label: string; since: string }) => <>The <b className="text-ink">{o.config}</b> is the most restocked iPhone Duo configuration {o.label}: {nn(o.k)} of {nn(o.n)} restocks ({o.pct}) since {o.since}.</>,
    fToday: (o: { n: number; label: string; date: string }) => (o.n > 0
      ? <>PickupChecker has confirmed <b className="text-ink">{nn(o.n)}</b> iPhone Duo restock{s(o.n)} {o.label} so far today ({o.date}, local time).</>
      : <>No iPhone Duo restock {o.label} has been confirmed so far today ({o.date}, local time).</>),
    hourByHour: "Hour by hour, every store →",
    lastThree: (n: number, label: string) => (n === 1 ? `The last iPhone Duo restock ${label}` : `The last ${n} iPhone Duo restocks ${label}`),
    /** Lifetimes: "listed 5–7 min", "listed about 2 min", "still listed (12 min)". */
    secs: (n: number) => `${n} s`,
    mins: (n: number) => `${n} min`,
    listedRange: (low: string, high: string) => `listed ${low}–${high}`,
    listedAbout: (x: string) => `listed about ${x}`,
    stillListed: (x: string) => `still listed (${x})`,
    /** "listed 40 s ago" / "listed 12 min ago". */
    ago: (x: string) => `${x} ago`,
    /** Alerts sent (counts only). */
    alerts: (o: { sent: number; stores: number; total: number; days: number; label: string; one: boolean }) => (o.one
      ? `In the last ${o.days} days PickupChecker sent ${nn(o.sent)} alert${s(o.sent)} to members for iPhone Duo restocks ${o.label}.`
      : `In the last ${o.days} days PickupChecker sent ${nn(o.sent)} alert${s(o.sent)} to members for iPhone Duo restocks at ${nn(o.stores)} of the ${nn(o.total)} Apple Store${s(o.total)} ${o.label}.`),
    alertMe: (label: string) => `Alert me ${label}`,
    unknown: "The restock pattern could not be read just now; live stock on this page is unaffected.",
    /** Under the Duo-only clock: the other models in one line ("All three iPhones: 456 restocks in 30 days, most around 4 PM"). */
    allModels: (o: { n: number; days: number; peak: string | null }) => `All three iPhones: ${nn(o.n)} restock${s(o.n)} in ${o.days} days${o.peak ? `, most around ${o.peak}` : ""}.`,
  },
};
