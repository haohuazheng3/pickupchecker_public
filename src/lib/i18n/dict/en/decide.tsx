/**
 * English strings of the four decision pages (seo.md §16): which configuration is easiest to get, is the shortage
 * easing, Apple vs carriers vs retailers, and the public API. One answer-first sentence under every question, every
 * number from lib/content/duoDecide.ts (and channels.ts). The type every language follows; sentences take a view object
 * built by the page component, with labels (configuration, colour, store) already in the page's language.
 * Facts that never change wording: check intervals are 15 s and 5 s; no model names, storage sizes or brands are translated.
 */
import type { Faq } from "@/lib/content/types";
import type { Country } from "@/lib/apple/countries";
import type { DuoConfigs, DuoSupply } from "@/lib/content/duoDecide";
import type { CountryChannels } from "@/lib/content/channels";
import { exposureHours } from "@/lib/content/duoDecide";
import { fitTitle, plural, listWords } from "@/lib/seo/enrich";
import { SPEED } from "@/lib/plans";

const n = (x: number) => x.toLocaleString("en-US");
const pct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : `${Math.round(x * 100)}%`);
const signed = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.round(Math.abs(x) * 100)}%`;
const longDate = (ymd: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
const dateLabel = (ymd: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
/** "38.4 h" of listing time, "41 min" under an hour. */
const hours = (sec: number) => (sec >= 3600 ? `${exposureHours(sec)} h` : `${Math.max(1, Math.round(sec / 60))} min`);
const secs = (s: number) => (s >= 120 ? `${Math.round(s / 60)} min` : `${Math.round(s)} s`);
const ratio = (a: number, b: number) => (b > 0 ? `${(Math.round((a / b) * 10) / 10).toLocaleString("en-US")}×` : "—");
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** What every decision page's sentences need. */
export interface DecideCtx {
  c: Country;
  us: boolean;
  /** The country has one Apple Store. */
  one: boolean;
  /** Apple Stores in the country, and the ISO date tracking began there. */
  stores: number;
  since: string;
  days: number;
  /** The "set up alerts" link for the country. */
  alert: string;
  /** Labels in the page's language. */
  cfg: (r: { storage: string; color: string }) => string;
  colour: (color: string) => string;
  storeName: (storeNumber: string) => string;
  /** "Nov 5, 2:31 PM" in the store's own zone. */
  storeWhen: (iso: string, storeNumber: string) => string;
}
export interface ConfigsView extends DecideCtx { d: DuoConfigs }
export interface WorldRow { cc: string; name: string; href: string; stores: number; last7: number; perStoreDay: number; medianSec: number | null; storesNow: number; complete: boolean }
export interface SupplyView extends DecideCtx { d: DuoSupply; world: WorldRow[] }
export interface ChannelsView extends DecideCtx { ch: CountryChannels; sup: DuoSupply; cfgs: DuoConfigs }
export interface ApiView extends DecideCtx { worldStores: number; countries: number; storesNow: number; restocks24: number }

const where = (c: Country) => (c.cc === "us" ? "" : ` ${c.inName}`);
const storesPhrase = (x: DecideCtx) => (x.one ? `the one Apple Store ${x.c.inName}` : `all ${n(x.stores)} Apple Stores ${x.c.inName}`);
const trendWord = (d: DuoSupply) => (d.trend === "up" ? "more" : d.trend === "down" ? "fewer" : "about as many");
/** "Apple's 14-day return window", "Apple's no-returns policy there (exchanges for defects only)" (Hong Kong), or a neutral phrase. */
const returnPhrase = (days: number | null) => (days ? `Apple's ${days}-day return window` : days === 0 ? "Apple's no-returns policy there (exchanges for defects only)" : "Apple's return policy");

/* ================================================================== which configuration is easiest to get */
const configs = {
  crumb: "Which configuration?",
  /** The US title is fixed (it has been indexed since 2026-11-03); other countries get the question alone. */
  title: (c: Country) => (c.cc === "us" ? "Which iPhone Duo Restocks Most? Storage & Color Odds" : fitTitle([`Which iPhone Duo Restocks Most ${c.inName}? Storage & Color`, `Which iPhone Duo Restocks Most ${c.inName}?`, `Which iPhone Duo Restocks Most? (${c.short})`], 49)),
  metaDescription: (x: ConfigsView) => {
    const { d } = x;
    const e = d.easiest, h = d.hardest;
    return e && h
      ? fitTitle([
        `${x.cfg(e)} is the easiest iPhone Duo to get${where(x.c)}: ${n(e.restocks)} of ${n(d.n)} confirmed restocks at ${plural(x.stores, "Apple Store")} and ${hours(e.exposureSec)} of listing time since ${longDate(d.since)}; ${x.cfg(h)} the hardest (${n(h.restocks)}). Every configuration ranked, by storage and colour, updated with every restock.`,
        `${x.cfg(e)} is the easiest iPhone Duo to get${where(x.c)} (${n(e.restocks)} of ${n(d.n)} restocks since ${longDate(d.since)}); ${x.cfg(h)} the hardest. Every configuration ranked by storage and colour.`,
      ], 160)
      : `Every iPhone Duo configuration ranked by confirmed Apple Store restocks${where(x.c)} since ${longDate(d.since)}: storage, colour, time on the shelf and what is listed right now.`;
  },
  h1: (x: ConfigsView) => `Which iPhone Duo configuration restocks most${where(x.c)}, and which is easiest to get?`,
  intro: (x: ConfigsView) => {
    const { d } = x;
    const e = d.easiest, h = d.hardest;
    if (!e) return `PickupChecker has confirmed ${plural(d.n, "iPhone Duo restock")} at ${storesPhrase(x)} since ${longDate(d.since)} — too few to rank the configurations yet. The table below fills in with every restock; the US page already has the pattern.`;
    const st = d.byStorage, co = d.byColor;
    return `${x.cfg(e)} is the easiest iPhone Duo to get${where(x.c)}: ${n(e.restocks)} of the ${n(d.n)} restocks PickupChecker confirmed at ${storesPhrase(x)} since ${longDate(d.since)}, at ${plural(e.stores, "store")}, with ${hours(e.exposureSec)} of total listing time${e.lifetimes ? ` and a median ${secs(e.lifetimes.medianSec)} on the shelf` : ""}. ${h ? `${x.cfg(h)} is the hardest: ${plural(h.restocks, "restock")} and ${hours(h.exposureSec)} of listing time.` : ""}${st.length > 1 ? ` Storage decides more than colour: ${st[st.length - 1].restocks > 0 ? `${st[0].key} models restocked ${ratio(st[0].restocks, st[st.length - 1].restocks)} as often as ${st[st.length - 1].key}` : `${st[0].key} models carried ${pct(st[0].share)} of restocks while ${st[st.length - 1].key} has not restocked at all`}${co.length > 1 ? `, while ${x.colour(co[0].key)} led ${x.colour(co[1].key)} by only ${Math.abs(Math.round((co[0].share - co[1].share) * 100))} points` : ""}.` : ""}`;
  },
  updated: (x: ConfigsView, stamp: string) => `Updated ${stamp} · data since ${longDate(x.d.since)} · ${plural(x.stores, "Apple Store")} · checked every ${SPEED.checkSec} s (alert stores every ${SPEED.fastSec} s)`,
  nav: { easiest: "Easiest now", storage: "Storage", colour: "Colour", shelf: "Time to grab", week: "This week", alerts: "What to watch", method: "How we count" },
  h2: (x: ConfigsView) => ({
    easiest: `Which iPhone Duo configuration is easiest to get${where(x.c)} right now?`,
    storage: "Does storage size change the odds?",
    colour: `${x.d.byColor.length > 1 ? `${x.colour(x.d.byColor[0].key)} or ${x.colour(x.d.byColor[1].key)}` : "Which colour"}: which colour comes back more often?`,
    shelf: "Which configuration gives you the most time to grab it?",
    week: "What changed in the last seven days?",
    alerts: "Which configurations should I set alerts for?",
    method: "How we count a restock and the time on the shelf",
  }),
  hero: {
    restocks: (label: string) => `confirmed restocks of ${label}`,
    exposure: "hours it was listed, all stores added up",
    now: (one: boolean): string => (one ? "listing it right now" : "stores listing it right now"),
    median: "median seconds on the shelf",
    total: "restocks of every configuration",
  },
  easiestLead: (x: ConfigsView) => {
    const e = x.d.easiest!;
    return `${x.cfg(e)} wins on both counts that matter: it came back most often (${n(e.restocks)} restocks, ${pct(e.restocks / x.d.n)} of all) and stayed listed longest in total (${hours(e.exposureSec)}), which is the time there was to open the app and reserve one. ${e.nowStores > 0 ? `${plural(e.nowStores, "store")} ${e.nowStores === 1 ? "lists" : "list"} it as you read this.` : "No store lists it as you read this; the next restock shows here within seconds."}`;
  },
  easiestKeys: (x: ConfigsView) => {
    const { d } = x;
    const top3 = d.byPart.slice(0, 3);
    return [
      `Top three by listing time: ${listWords(top3.map((r) => `${x.cfg(r)} (${hours(r.exposureSec)})`))}.`,
      d.never.length ? `Never restocked${where(x.c)} since ${longDate(d.since)}: ${listWords(d.never.map((r) => x.cfg(r)))}.` : `Every configuration has restocked at least once since ${longDate(d.since)}.`,
      d.lifetimes ? `Across all configurations a restock stayed listed a median ${secs(d.lifetimes.medianSec)}; ${pct(d.lifetimes.within2min)} were gone within 2 minutes.` : "Time on the shelf appears once ten restocks have a known end.",
    ];
  },
  rankCaption: (x: ConfigsView) => `Every iPhone Duo configuration${where(x.c)}, most listing time first · ${longDate(x.d.since)} to today`,
  rankHead: ["Configuration", "Restocks", "Stores", "Listed in total", "Median on shelf", "Listing now", "Last restock"],
  none: "none yet",
  storageLead: (x: ConfigsView) => {
    const st = x.d.byStorage;
    if (st.length < 2 || !x.d.n) return `Storage sizes are compared once restocks come in; the table below is live.`;
    const big = st.filter((g) => /^(1|2)TB$/.test(g.key)).reduce((a, g) => a + g.restocks, 0);
    return `Yes, more than anything else: ${st[0].key} accounted for ${pct(st[0].share)} of restocks and ${st[1].key} for ${pct(st[1].share)}${big ? `, while the 1TB and 2TB models together made up ${pct(big / x.d.n)}` : ""}. Apple ships the storage sizes most people order; the top sizes are also the ones a store gets several of in one delivery.`;
  },
  groupCaption: (what: "storage" | "colour") => `Restocks by ${what}, all stores added up`,
  groupHead: (what: "Storage" | "Colour") => [what, "Restocks", "Share", "Stores", "Listed in total", "Median on shelf", "Listing now"],
  storageSwaps: (x: ConfigsView) => {
    const st = x.d.byStorage;
    if (st.length < 2) return [];
    const top = st[0].key, second = st[1].key, last = st[st.length - 1].key;
    return [
      { no: `Alert on ${last} only`, yes: `${top} first, ${last} as well`, why: `${last} restocked ${pct(st[st.length - 1].share)} of the time; ${top} ${pct(st[0].share)}. Both alerts cost one slot each.` },
      { no: "Wait for the exact size", yes: `Take ${top} or ${second} when it comes`, why: `They carried ${pct(st[0].share + st[1].share)} of all restocks${where(x.c)}; a case and iCloud make the size matter less than the wait.` },
    ];
  },
  colourLead: (x: ConfigsView) => {
    const co = x.d.byColor;
    if (co.length < 2 || !x.d.n) return `Colours are compared once restocks come in.`;
    const gap = Math.abs(Math.round((co[0].share - co[1].share) * 100));
    return `${x.colour(co[0].key)}, but not by much: ${pct(co[0].share)} of restocks against ${pct(co[1].share)} for ${x.colour(co[1].key)}, a ${gap}-point gap${co[0].medianSec && co[1].medianSec ? `; on the shelf they lasted a median ${secs(co[0].medianSec)} and ${secs(co[1].medianSec)}` : ""}. Colour changes your odds less than storage does, so an alert on both colours of the size you want roughly doubles your chances.`;
  },
  colourKeys: (x: ConfigsView) => x.d.byColor.map((g) => `${x.colour(g.key)}: ${n(g.restocks)} restocks at ${plural(g.stores, "store")}, ${hours(g.exposureSec)} listed in total${g.nowStores ? `, ${plural(g.nowStores, "store")} listing it now` : ""}.`),
  shelfLead: (x: ConfigsView) => {
    const withM = x.d.byPart.filter((r) => r.lifetimes);
    if (!withM.length) return `A restock's time on the shelf is measured from the restock to the next sold-out check; the first figures appear once ten restocks of a configuration have ended.`;
    const slow = [...withM].sort((a, b) => b.lifetimes!.medianSec - a.lifetimes!.medianSec)[0], fast = [...withM].sort((a, b) => a.lifetimes!.medianSec - b.lifetimes!.medianSec)[0];
    return `${x.cfg(slow)} gives you the most time: a median ${secs(slow.lifetimes!.medianSec)} listed before it sold out, against ${secs(fast.lifetimes!.medianSec)} for ${x.cfg(fast)}. The slower sellers are the expensive sizes — fewer buyers want them — so "most time to grab" and "most restocks" point at different configurations, and the ranking above weighs both.`;
  },
  shelfCaption: "Time on the shelf per configuration (restock → next sold-out check)",
  shelfHead: ["Configuration", "Restocks with a known end", "Median", "Gone within 2 min", "Gone within 20 min", "Fastest"],
  shelfKeys: (x: ConfigsView) => [
    `A push alert lands about ${SPEED.alertSec} s after we confirm a restock; the median listing is ${x.d.lifetimes ? secs(x.d.lifetimes.medianSec) : "about a minute"}, so most restocks are reachable if you have the Apple Store app open to the Duo and your card saved.`,
    "The time is an upper bound: we see the sold-out state at the next check, up to 15 s later (5 s at stores with alerts).",
  ],
  weekLead: (x: ConfigsView) => {
    const rows = [...x.d.byPart].sort((a, b) => b.last7 - a.last7);
    const tot7 = rows.reduce((a, r) => a + r.last7, 0), totP = rows.reduce((a, r) => a + r.prev7, 0);
    if (!tot7 && !totP) return `No restocks in the last fourteen days${where(x.c)}; the week-by-week table starts with the next one.`;
    const lead = rows[0];
    return `${plural(tot7, "restock")} in the last seven days${totP ? ` against ${n(totP)} the week before (${signed(tot7 / totP - 1)})` : ""}, led by ${x.cfg(lead)} with ${n(lead.last7)}. ${x.d.easiest && lead.partNumber !== x.d.easiest.partNumber ? `That is a different configuration from the all-time leader (${x.cfg(x.d.easiest)}): the mix shifts with each delivery, so check this table before you pick what to alert on.` : "The all-time leader still leads this week."}`;
  },
  weekCaption: "Restocks per configuration: last 7 days vs the 7 before",
  weekHead: ["Configuration", "Last 7 days", "Previous 7 days", "Change"],
  alertsLead: (x: ConfigsView) => {
    const top = x.d.byPart.slice(0, 3).filter((r) => r.restocks > 0);
    return top.length
      ? `Set alerts on ${listWords(top.map((r) => x.cfg(r)))} at the two or three stores you can reach fastest; that covers ${pct(top.reduce((a, r) => a + r.restocks, 0) / x.d.n)} of the restocks so far${where(x.c)}. Add the exact configuration you want as a fourth alert, and take whichever comes first.`
      : `Until restocks come in${where(x.c)}, set alerts on the storage size you want in both colours at your nearest stores.`;
  },
  alertsKeys: (x: ConfigsView) => [
    `Alerts are per store × configuration, so three stores × three configurations is ${plural(9, "alert")}.`,
    `We check alert stores every ${SPEED.fastSec} s and confirm a restock before pushing; the banner lands about ${SPEED.alertSec} s after.`,
    `${x.one ? "" : "Pick stores by distance, not by restock count: "}the busiest store is also the one with the most people watching it.`.replace(/^the/, "The"),
  ],
  methodLead: `A restock is a configuration going from sold out to available at one store, confirmed by two consistent checks; first sightings after a tracking gap are not counted. Time on the shelf runs from the restock to the first check that shows it sold out again, so it is an upper bound. "Listed in total" adds those times up over every restock of the configuration — the simplest measure of how much chance there was to buy one.`,
  methodKeys: (x: ConfigsView) => [
    `Source: Apple's own pickup availability for ${storesPhrase(x)}, read every ${SPEED.checkSec} s per store (${SPEED.fastSec} s at stores with alerts) since ${longDate(x.d.since)}.`,
    "Stores listing it now and last-restock times are live; everything else recomputes within five minutes.",
    "Quote freely with a link: the figures change, so name the date you read them.",
  ],
  faq: (x: ConfigsView): Faq[] => {
    const { d } = x;
    const e = d.easiest, h = d.hardest, co = d.byColor;
    return [
      { q: `Which iPhone Duo is easiest to get${where(x.c)}?`, a: e ? `${x.cfg(e)}: ${n(e.restocks)} confirmed restocks at ${plural(e.stores, "Apple Store")} since ${longDate(d.since)} and ${hours(e.exposureSec)} of total listing time, more than any other configuration. ${h ? `${x.cfg(h)} is the hardest with ${plural(h.restocks, "restock")}.` : ""}` : `Too few confirmed restocks${where(x.c)} to say yet; this page ranks every configuration as soon as they come in.` },
      { q: `Is ${co.length > 1 ? x.colour(co[1].key) : "one colour"} harder to find than ${co.length > 1 ? x.colour(co[0].key) : "the other"}?`, a: co.length > 1 && d.n ? `Slightly: ${x.colour(co[0].key)} made up ${pct(co[0].share)} of restocks and ${x.colour(co[1].key)} ${pct(co[1].share)}. The difference between storage sizes is far larger, so choose the size first and set alerts on both colours of it.` : "Colours are compared once restocks come in." },
      { q: `Is the 1TB or 2TB iPhone Duo ever in stock${where(x.c)}?`, a: (() => { const big = d.byPart.filter((r) => /^(1|2)TB$/.test(r.storage)); const bn = big.reduce((a, r) => a + r.restocks, 0); return bn ? `Yes, but rarely: ${plural(bn, "restock")} of the 1TB and 2TB models out of ${n(d.n)} (${pct(bn / d.n)}), at ${new Set(big.flatMap((r) => (r.stores ? [r.partNumber] : []))).size ? plural(Math.max(...big.map((r) => r.stores)), "store") : "no store"} at most. When one appears it stays listed longer (fewer buyers), so an alert on it is worth a slot even though it fires seldom.` : `Not yet in our data${where(x.c)}: no confirmed restock of a 1TB or 2TB model since ${longDate(d.since)}.`; })() },
      { q: "Should I set alerts on one configuration or several?", a: `Several, at few stores: the top three configurations carried ${d.n ? pct(d.byPart.slice(0, 3).reduce((a, r) => a + r.restocks, 0) / d.n) : "most"} of restocks${where(x.c)}. Three configurations at three nearby stores is nine alerts, which fits a Plus plan; add the exact one you want as a fourth.` },
      { q: `Is the mix the same in other countries?`, a: `Not always: each country gets its own allocation, and the ranking on its page can differ. The links under "Other countries" open the same page for the other ${x.us ? 18 : 18} countries PickupChecker tracks; the US page has the longest record (since ${longDate("2026-10-29")}).` },
    ];
  },
  sources: { apple: "Apple – iPhone Duo configurations and prices", pickup: "Apple – In-store pickup", log: "PickupChecker – the restock log this page is computed from" },
  ld: (x: ConfigsView) => ({
    datasetName: `iPhone Duo restocks by configuration, Apple Stores ${x.c.inName}`,
    description: `Confirmed iPhone Duo restocks at ${storesPhrase(x)} since ${longDate(x.d.since)}, per configuration (storage × colour): count, stores, total listing time, median time on the shelf, stores listing it now.`,
    measured: ["restocks per configuration", "stores with a restock", "listing time in seconds", "median time on the shelf", "stores listing now"],
  }),
  related: "Keep reading",
  sameData: "Same data, other questions",
  otherCountries: "Other countries",
  questions: { restockTimes: "When does Apple restock the iPhone Duo?", sellOut: "How fast does a restock sell out?", shortage: "Is the shortage easing?", channels: "Apple, carrier or retailer?", alerts: "Fastest way to get notified", api: "The free stock API" },
  setUpAlert: "Set up alerts",
  logLive: "Restock log, live",
  faqTitle: "Questions people ask",
  onThisPage: "On this page",
};

/* ================================================================== is the shortage easing */
const supply = {
  crumb: "Is the shortage easing?",
  title: (c: Country) => (c.cc === "us" ? "Is the iPhone Duo Shortage Easing? Weekly Trend" : fitTitle([`Is the iPhone Duo Shortage Easing ${c.inName}? Weekly Trend`, `Is the iPhone Duo Shortage Easing ${c.inName}?`, `Is the iPhone Duo Shortage Easing? (${c.short})`], 49)),
  metaDescription: (x: SupplyView) => {
    const { d } = x;
    const w = d.last7;
    return d.trend !== "insufficient"
      ? fitTitle([
        `${cap(trendWord(d))} iPhone Duo restocks${where(x.c)} this week: ${n(w.restocks)} at ${plural(w.stores, "Apple Store")} in 7 days (${signed(d.change!)} vs the week before)${w.medianSec ? `, each gone in a median ${secs(w.medianSec)}` : ""}. Day-by-day supply, what "easing" would look like, and whether to wait.`,
        `${n(w.restocks)} iPhone Duo restocks${where(x.c)} in the last 7 days (${signed(d.change!)} week over week). Day-by-day supply and whether the shortage is easing.`,
      ], 160)
      : `Is the iPhone Duo shortage easing${where(x.c)}? ${n(d.n)} confirmed Apple Store restocks since ${longDate(d.since)}, day by day, with what an easing would look like and whether to wait or buy now.`;
  },
  h1: (x: SupplyView) => `Is the iPhone Duo shortage getting better${where(x.c)}, and how long will it last?`,
  intro: (x: SupplyView) => {
    const { d } = x;
    const w = d.last7;
    if (d.trend === "insufficient") {
      return `Too early to call${where(x.c)}: PickupChecker began tracking on ${longDate(d.since)}, ${plural(d.days, "day")} ago, so the first full week-over-week comparison appears on ${longDate(d.comparableFrom)}. So far ${plural(d.n, "confirmed restock")} at ${d.storesEver} of ${plural(x.stores, "Apple Store")}${d.lifetimes ? `, each listed a median ${secs(d.lifetimes.medianSec)} before selling out` : ""}; ${d.storesNow} ${d.storesNow === 1 ? "store lists" : "stores list"} a Duo right now. Nobody can forecast the end of the shortage; this page shows the two numbers that will say so first — restocks per week and seconds on the shelf — updated with every restock.`;
    }
    const verdict = d.trend === "up" ? "Supply is improving" : d.trend === "down" ? "Supply is tightening" : "Supply is flat";
    const demand = w.medianSec ? (w.medianSec <= 120 ? `but demand still clears it: a restock lasted a median ${secs(w.medianSec)} this week${d.prev7.medianSec ? ` (${secs(d.prev7.medianSec)} last week)` : ""}, so it is not yet easier to buy one by hand` : `and the shelf time is lengthening: a median ${secs(w.medianSec)} this week${d.prev7.medianSec ? ` against ${secs(d.prev7.medianSec)} last week` : ""}, the first sign of an easing`) : "";
    return `${verdict}${where(x.c)}: Apple Stores restocked the iPhone Duo ${n(w.restocks)} times in the last seven days, ${signed(d.change!)} on the week before (${n(d.prev7.restocks)}), at ${plural(w.stores, "store")} out of ${n(x.stores)} — ${demand}. ${d.storesNow} ${d.storesNow === 1 ? "store lists" : "stores list"} one right now. Nobody can forecast the end; the two numbers that will say so first are on this page and update with every restock.`;
  },
  updated: (x: SupplyView, stamp: string) => `Updated ${stamp} · data since ${longDate(x.d.since)} · ${plural(x.stores, "Apple Store")} · checked every ${SPEED.checkSec} s`,
  nav: { trend: "This week", easier: "Easier to buy?", stores: "How many stores", howlong: "How long", christmas: "Wait or buy", world: "Other countries", method: "How we count" },
  h2: (x: SupplyView) => ({
    trend: `Are iPhone Duo restocks going up or down${where(x.c)}?`,
    easier: "Is it getting easier to actually buy one?",
    stores: `How many Apple Stores${where(x.c)} have had an iPhone Duo at all?`,
    howlong: "How long will the iPhone Duo shortage last?",
    christmas: "Should I keep waiting for a restock, or buy another way?",
    world: `Is the shortage easing faster in other countries${x.us ? "" : " than " + x.c.inName.replace(/^in /, "in ")}?`,
    method: "How we count",
  }),
  weekBefore: "week before",
  goneIn2: "gone within 2 minutes",
  storesEverLabel: (one: boolean): string => (one ? "confirmed restocks so far" : "stores with at least one restock"),
  hero: { last7: "restocks, last 7 days", change: "vs the previous 7 days", stores: (one: boolean): string => (one ? "days with a restock" : "stores that restocked, last 7 days"), median: "median seconds on the shelf, last 7 days", now: (one: boolean): string => (one ? "listing one right now" : "stores listing one right now"), sinceLast: "hours since the last restock" },
  trendLead: (x: SupplyView) => {
    const { d } = x;
    if (d.trend === "insufficient") return `The daily table is the whole record so far: ${plural(d.n, "restock")} over ${plural(d.days, "day")}. A week-over-week line appears on ${longDate(d.comparableFrom)}; until then read the direction day by day.`;
    const w = d.last7, p = d.prev7;
    return `${cap(trendWord(d))} this week: ${n(w.restocks)} restocks (${(w.perStoreDay * 7).toFixed(1)} per store) against ${n(p.restocks)} the week before, ${signed(d.change!)}. ${w.longestGapHours != null ? `The longest gap between two restocks this week was ${w.longestGapHours} hours` : ""}${w.longestGapHours != null && p.longestGapHours != null ? ` (${p.longestGapHours} last week)` : ""}. Restocks arrive in waves tied to deliveries, so a single quiet day means little; the seven-day totals are what to watch.`;
  },
  dailyCaption: (x: SupplyView) => `Confirmed restocks per local day${where(x.c)}, newest first (last 14 days)`,
  dailyHead: ["Day", "Restocks", "Stores", "Median on shelf"],
  trendKeys: (x: SupplyView) => {
    const best = [...x.d.daily].sort((a, b) => b.restocks - a.restocks)[0];
    return [
      best && best.restocks ? `Busiest day so far: ${dateLabel(best.date)} with ${plural(best.restocks, "restock")} at ${plural(best.stores, "store")}.` : "No restock yet; the busiest day appears here.",
      x.d.sinceLastHours != null && x.d.latest ? `Last restock ${x.d.sinceLastHours < 1 ? "under an hour" : `${x.d.sinceLastHours} hours`} ago: ${x.storeName(x.d.latest.storeNumber)}, ${x.storeWhen(x.d.latest.at, x.d.latest.storeNumber)}.` : "No restock recorded yet.",
      `"Up" means at least ${Math.round(0.15 * 100)}% more restocks than the week before; "down" at least ${Math.round(0.15 * 100)}% fewer; anything between reads as flat.`,
    ];
  },
  easierLead: (x: SupplyView) => {
    const w = x.d.last7, p = x.d.prev7;
    if (!w.medianSec) return `Easier means two things at once: more restocks, and each one staying listed longer. Shelf time appears once ten restocks in the window have a known end.`;
    const longer = p.medianSec ? w.medianSec > p.medianSec * 1.15 : false, shorter = p.medianSec ? w.medianSec < p.medianSec * 0.85 : false;
    return `${longer ? "Slightly, yes" : shorter ? "No — the opposite" : "Not yet"}: a restock stayed listed a median ${secs(w.medianSec)} this week${p.medianSec ? ` against ${secs(p.medianSec)} last week` : ""}, and ${pct(w.within2min!)} were gone within two minutes${p.within2min != null ? ` (${pct(p.within2min)} last week)` : ""}. Easing looks like both numbers moving together — more restocks and longer shelf times; more restocks alone means Apple is shipping more while just as many people are waiting.`;
  },
  easierKeys: (x: SupplyView) => [
    "What \"easing\" will look like here: median shelf time past 20 minutes, most stores listing one at the same time, apple.com delivery estimates inside a week.",
    `Until then the way to buy one is still an alert: we confirm a restock and push about ${SPEED.alertSec} s later, well inside the median listing.`,
    x.d.lifetimes ? `All-time${where(x.c)}: ${n(x.d.lifetimes.n)} restocks with a known end, median ${secs(x.d.lifetimes.medianSec)}, ${pct(x.d.lifetimes.within2min)} gone within 2 minutes.` : "All-time shelf-time figures appear after ten ended restocks.",
  ],
  storesLead: (x: SupplyView) => {
    const { d } = x;
    const never = x.stores - d.storesEver;
    return x.one
      ? `${d.storesEver ? `Yes: the one Apple Store ${x.c.inName} has had ${plural(d.n, "confirmed restock")} since ${longDate(d.since)}` : `Not yet: no confirmed restock at the one Apple Store ${x.c.inName} since ${longDate(d.since)}`}${d.storesNow ? ", and it lists a Duo right now" : ""}.`
      : `${d.storesEver} of ${plural(x.stores, "Apple Store")}${where(x.c)} (${pct(d.storesEver / x.stores)}) have had at least one confirmed iPhone Duo restock since ${longDate(d.since)}${never ? `; ${plural(never, "store")} ${never === 1 ? "has" : "have"} not` : ""}. ${d.storesNow} ${d.storesNow === 1 ? "lists" : "list"} one right now. Supply spreads unevenly: flagship and mall stores restock most, which is why the store you pick for alerts matters as much as the configuration.`;
  },
  storesKeys: (x: SupplyView) => [
    `Stores by restock count, with local times: the "where" section of the restock-times page${where(x.c)}.`,
    "A store that has never restocked is not a store Apple skips: allocations arrive by delivery, and several stores got their first Duo only in the second week.",
  ],
  howlongLead: (x: SupplyView) => `Nobody outside Apple knows, and we do not forecast. What the record shows${where(x.c)}: ${plural(x.d.n, "restock")} in ${plural(x.d.days, "day")}, ${x.d.trend === "insufficient" ? "a week-over-week trend from " + longDate(x.d.comparableFrom) : `${trendWord(x.d)} restocks this week than last`}, and shelf times ${x.d.last7.medianSec ? `around ${secs(x.d.last7.medianSec)}` : "under a few minutes"}. A shortage ends in a sequence you can watch here: restocks per week climb, shelf times stretch from seconds to hours, then most stores list one at once and apple.com's delivery estimate drops to days.`,
  howlongKeys: () => [
    "Signal 1 — restocks per week keep rising for two or three weeks (the table above).",
    "Signal 2 — median shelf time passes 20 minutes: restocks outlast the people refreshing.",
    "Signal 3 — apple.com's delivery estimate falls inside a week and most stores list one together.",
    "Launches of new colours or sizes reset the clock; keep the alert on until signal 3.",
  ],
  christmasLead: (x: SupplyView) => {
    const w = x.d.last7;
    const perDay = w.days ? w.restocks / w.days : 0;
    return `Keep the alert on and keep a delivery order in the queue — both, not one. At the current pace (${perDay >= 1 ? `about ${Math.round(perDay)} restocks a day${where(x.c)}` : `fewer than one restock a day${where(x.c)}`}${w.medianSec ? `, each listed a median ${secs(w.medianSec)}` : ""}) a watched store near you gets its turn within days, and a confirmed restock reaches your phone about ${SPEED.alertSec} s after we see it. Paying a premium elsewhere only makes sense if the wait itself costs you more than the markup; the channel comparison weighs that honestly.`;
  },
  christmasKeys: () => [
    "Order delivery on apple.com first: it holds your place and can be cancelled when a pickup comes through.",
    "Alerts on the two or three most-restocked configurations at your nearest stores (the configuration page says which).",
    "Have the Apple Store app signed in with the Duo in your bag and a card saved: the median listing is about a minute.",
  ],
  worldLead: (x: SupplyView) => {
    const rows = x.world.filter((r) => r.complete && r.stores > 0).sort((a, b) => b.perStoreDay - a.perStoreDay);
    if (rows.length < 2) return `Every country's weekly restocks per store will be compared here once each has a full week of data.`;
    const top = rows[0], bottom = rows[rows.length - 1];
    const mine = rows.find((r) => r.cc === x.c.cc);
    return `${top.name} had the most restocks per store in the last seven days (${(top.perStoreDay * 7).toFixed(1)} per store), ${bottom.name} the fewest (${(bottom.perStoreDay * 7).toFixed(1)})${mine ? `; ${x.c.short} sits at ${(mine.perStoreDay * 7).toFixed(1)}` : ""}. Allocations differ by country and launch date, so an easing shows up unevenly; the US record is the longest.`;
  },
  worldCaption: "Last 7 days by country: restocks, restocks per store, median shelf time, stores listing one now",
  worldHead: ["Country", "Stores", "Restocks (7 d)", "Per store", "Median on shelf", "Listing now"],
  methodLead: `A restock is a configuration going from sold out to available at one store, confirmed by two consistent checks ${SPEED.checkSec} s apart (${SPEED.fastSec} s at stores with alerts); first sightings after a tracking gap do not count. Days are the store's local days. Shelf time runs from the restock to the first check that shows it sold out again — an upper bound, to the next check. Weeks are the last seven local days against the seven before; a comparison needs both complete.`,
  methodKeys: (x: SupplyView) => [
    `Source: Apple's pickup availability for ${storesPhrase(x)}, since ${longDate(x.d.since)}.`,
    "Everything on this page recomputes within five minutes of a restock; stores listing now is live.",
    "Quote with a link and the date: these are moving numbers.",
  ],
  faq: (x: SupplyView): Faq[] => {
    const { d } = x;
    const w = d.last7;
    return [
      { q: `Is Apple still restocking the iPhone Duo${where(x.c)}?`, a: d.n ? `Yes: ${plural(w.restocks, "confirmed restock")} in the last seven days at ${plural(w.stores, "Apple Store")}${where(x.c)}, ${plural(d.n, "restock")} since ${longDate(d.since)}. The last one was ${d.sinceLastHours != null && d.sinceLastHours < 1 ? "under an hour ago" : d.sinceLastHours != null ? `${d.sinceLastHours} hours ago` : "not yet recorded"}.` : `No confirmed restock yet${where(x.c)} since tracking began on ${longDate(d.since)}; this page updates within five minutes of the first.` },
      { q: `Is the iPhone Duo shortage getting better${where(x.c)}?`, a: d.trend === "insufficient" ? `Too early to say: the first full week-over-week comparison appears on ${longDate(d.comparableFrom)}. Watch two numbers — restocks per week and seconds on the shelf; easing means both rise.` : `${cap(trendWord(d))} restocks this week than last (${signed(d.change!)})${w.medianSec ? `, and a restock lasted a median ${secs(w.medianSec)}` : ""}. Easing means more restocks and longer shelf times together; so far ${d.trend === "up" && w.medianSec && d.prev7.medianSec && w.medianSec > d.prev7.medianSec ? "both are moving the right way" : "only part of that is happening"}.` },
      { q: "When will the iPhone Duo be easy to buy?", a: "No one outside Apple can say, and PickupChecker does not forecast. The sequence to watch: weekly restocks rise for two or three weeks, median shelf time passes 20 minutes, then most stores list one at once and apple.com's delivery estimate drops inside a week." },
      { q: "Should I pay a markup instead of waiting?", a: `Only if the wait costs you more than the premium: at the current pace a watched nearby store gets its turn within days, and an alert reaches you about ${SPEED.alertSec} s after a confirmed restock. Resale also means no return window and the usual risks; the channel comparison page weighs them.` },
      { q: "Does the holiday season change the odds?", a: "Demand rises into December while deliveries keep their rhythm, so shelf times tend to shorten rather than lengthen. Keep a delivery order as a backstop and let alerts catch the pickup; cancel whichever you do not need." },
    ];
  },
  sources: { newsroom: "Apple Newsroom – iPhone Duo arrives at Apple Store locations", pickup: "Apple – In-store pickup", log: "PickupChecker – the restock log this page is computed from", restockTimes: "PickupChecker – when Apple restocks the iPhone Duo" },
  ld: (x: SupplyView) => ({
    datasetName: `iPhone Duo supply trend, Apple Stores ${x.c.inName}`,
    description: `Confirmed iPhone Duo restocks per day at ${storesPhrase(x)} since ${longDate(x.d.since)}: restocks, stores, median time on the shelf, week-over-week change.`,
    measured: ["restocks per day", "stores with a restock", "median time on the shelf", "week-over-week change", "stores listing now"],
  }),
  related: "Keep reading",
  sameData: "Same data, other questions",
  otherCountries: "This page for other countries",
  questions: { restockTimes: "When does Apple restock the iPhone Duo?", configs: "Which configuration is easiest to get?", channels: "Apple, carrier or retailer?", sellOut: "How fast does a restock sell out?", howToGet: "How to get an iPhone Duo", alerts: "Fastest way to get notified" },
  setUpAlert: "Set up alerts",
  logLive: "Restock log, live",
  faqTitle: "Questions people ask",
  onThisPage: "On this page",
};


/* ================================================================== Apple vs carriers vs retailers */
const channels = {
  crumb: "Apple, carrier or retailer?",
  title: (c: Country, retailer: string) => (c.cc === "us" ? `iPhone Duo: Apple, ${retailer} or a Carrier?` : fitTitle([`iPhone Duo ${c.inName}: Apple, Carrier or Retailer?`, `iPhone Duo: Apple, Carrier or Retailer? (${c.short})`, `iPhone Duo: Apple, Carrier or Retailer? (${c.iso})`], 49)),
  metaDescription: (x: ChannelsView) => fitTitle([
    `Where to actually get an iPhone Duo${where(x.c)}: Apple Store pickup (${n(x.sup.n)} confirmed restocks at ${plural(x.stores, "store")} since ${longDate(x.sup.since)}), apple.com delivery, ${listWords(x.ch.carriers.slice(0, 3))}, ${listWords(x.ch.retailers.slice(0, 2))} and resale — what each channel can and cannot tell you, and which to watch.`,
    `Apple Store pickup vs apple.com delivery vs ${listWords(x.ch.carriers.slice(0, 2))} vs ${x.ch.retailers[0] ?? "retailers"} vs resale for the iPhone Duo${where(x.c)}: what each channel can tell you and which to watch.`,
  ], 160),
  h1: (x: ChannelsView) => `Apple Store, a carrier or a retailer: where do you actually get an iPhone Duo${where(x.c)}?`,
  intro: (x: ChannelsView) => `Apple Store pickup is the only iPhone Duo channel${where(x.c)} whose supply anyone can measure: PickupChecker has confirmed ${plural(x.sup.n, "restock")} at ${storesPhrase(x)} since ${longDate(x.sup.since)}, ${n(x.sup.last7.restocks)} of them in the last seven days, each read from Apple's own pickup page every ${SPEED.checkSec} s. The carriers (${listWords(x.ch.carriers)}) and the retailers (${listWords(x.ch.retailers)}) receive their own allocations and publish no stock feed, so nobody — not us, not anyone — can honestly give you their restock times. Below is what each channel can and cannot tell you, the trade-offs, and the order in which to watch them.`,
  updated: (x: ChannelsView, stamp: string) => `Updated ${stamp} · Apple Store data since ${longDate(x.sup.since)} · ${plural(x.stores, "Apple Store")} · checked every ${SPEED.checkSec} s`,
  nav: { compare: "Channel by channel", pickup: "Pickup vs delivery", carriers: "Carriers", retailers: "Retailers", resale: "Resale markups", abroad: "Buying abroad", method: "How we know" },
  h2: (x: ChannelsView) => ({
    compare: `Which channel restocks the iPhone Duo most often${where(x.c)}?`,
    pickup: "Is Apple Store pickup faster than ordering delivery on apple.com?",
    carriers: `Should I buy the iPhone Duo from ${x.ch.carriers.length ? listWords(x.ch.carriers.slice(0, 3), 3) : "a carrier"} instead?`,
    retailers: `Are ${x.ch.retailers.length ? listWords(x.ch.retailers.slice(0, 2), 2) : "retailers"} worth checking?`,
    resale: `Is paying a markup on ${x.ch.resale[0] ?? "a resale site"} worth it?`,
    abroad: "Can I buy an iPhone Duo abroad and use it at home?",
    method: "How we know what we know",
  }),
  hero: { restocks: "confirmed Apple Store restocks", last7: "in the last 7 days", now: (one: boolean): string => (one ? "Apple Store listing one now" : "Apple Stores listing one now"), channels: "other channels, no public stock feed" },
  compareLead: (x: ChannelsView) => `Apple Store pickup, by the only measure available: ${plural(x.sup.last7.restocks, "confirmed restock")} in the last seven days at ${plural(x.sup.last7.stores, "store")}${where(x.c)}${x.sup.last7.medianSec ? `, each listed a median ${secs(x.sup.last7.medianSec)}` : ""}. Carriers and retailers almost certainly restock too — they get allocations from the same Apple shipments — but they show a yes/no on a product page, not a feed, so the comparison below is about what you can watch, not about who gets more.`,
  compareCaption: "The iPhone Duo channels, honestly compared",
  compareHead: ["Channel", "What is known about its stock", "How to watch it", "The catch"],
  compareRows: (x: ChannelsView) => {
    const r = x.ch;
    return [
      { channel: "Apple Store pickup", known: `${plural(x.sup.n, "confirmed restock")} since ${longDate(x.sup.since)}; every restock, every store, timed.`, watch: `An alert here (about ${SPEED.alertSec} s after confirmation), or the Apple Store app's pickup picker.`, catch: `Listings last about a minute; you need the app open and a card saved.` },
      { channel: "apple.com delivery", known: "Apple shows a shipping estimate at checkout; it moves daily and is never a stock count.", watch: "Place the order; the estimate on your order page updates as Apple ships.", catch: "Weeks, not minutes — but your place in line is held." },
      { channel: `Carriers (${listWords(r.carriers)})`, known: "Own allocation; online stock shown per configuration as available / backordered. No history, no feed.", watch: "Their apps and store finders; a store call still works.", catch: `${r.carrierLock ?? "Plans, financing and activation rules apply; stock varies by shop."}` },
      { channel: `Retailers (${listWords(r.retailers)})`, known: "Own allocation, often online-only for a launch product; shown per configuration on the product page.", watch: "Their product page and app; a few publish restock emails.", catch: "Allocations are smaller than Apple's and sell out in minutes too." },
      { channel: `Resale (${listWords(r.resale)})`, known: "Always available at a price.", watch: "—", catch: `A premium, no manufacturer purchase record, ${r.returnDays ? `and none of ${returnPhrase(r.returnDays)}` : "and no return window at all"}.` },
    ];
  },
  compareKeys: (x: ChannelsView) => [
    `${x.ch.carriers.length + x.ch.retailers.length} other sellers${where(x.c)} and not one public stock history: any site that claims to know a carrier's restock times is guessing.`,
    `Our stance: watch Apple Store pickup with an alert, keep an apple.com delivery order as the backstop, and check a retailer's page when you are already there.`,
  ],
  pickupLead: (x: ChannelsView) => `For speed, pickup: a configuration that appears on the pickup page can be reserved that minute and collected the same day, while a delivery order waits for Apple's estimate. For certainty, delivery: the order holds your place whatever happens on the shelves. ${x.sup.lifetimes ? `Pickup listings${where(x.c)} lasted a median ${secs(x.sup.lifetimes.medianSec)} and ${pct(x.sup.lifetimes.within2min)} were gone within two minutes — which is why the alert exists.` : ""} The right answer is both: order delivery today, set the pickup alert, cancel whichever you do not need.`,
  pickupSwaps: () => [
    { no: "Cancel the delivery order to \"start fresh\"", yes: "Keep it until the pickup is in your hand", why: "Apple does not publish queue positions; a new order simply gets today's estimate, which is rarely earlier than the one you hold." },
    { no: "Refresh the pickup page by hand", yes: "Let the alert watch it", why: `We check alert stores every ${SPEED.fastSec} s and push about ${SPEED.alertSec} s after confirming; a human refreshing sees most listings after they are gone.` },
    { no: "Change the order to pickup at checkout later", yes: "Reserve pickup as a new order when the alert fires", why: "Pickup reservations come from store stock, delivery orders from the warehouse: they are two queues, and the pickup one is the fast one." },
  ],
  pickupKeys: (x: ChannelsView) => [
    `Apple's own page explains pickup and delivery options${x.ch.returnDays ? ` and the ${x.ch.returnDays}-day return window for both` : x.ch.returnDays === 0 ? "; note that Apple in Hong Kong accepts no change-of-mind returns, only exchanges for defects" : ""} (sources below).`,
    "A pickup reservation is an order for that store; Apple holds it and tells you when to come.",
  ],
  carriersLead: (x: ChannelsView) => `If you want financing, a trade-in bundled with a plan, or you are already in a ${x.ch.carriers[0] ?? "carrier"} shop with one on the shelf — yes. If you want the phone soonest, carriers are a second lottery with smaller odds and no way to watch it. ${x.ch.carrierLock ?? "Check the lock and plan terms before you buy."} Their online stores list availability per configuration, so a quick look costs nothing; just do not expect a history or a notification.`,
  carriersKeys: (x: ChannelsView) => [
    `Carriers${where(x.c)}: ${listWords(x.ch.carriers)}.`,
    "Carrier stock is per shop; a shop that lists one online may have it for in-store pickup only.",
    "A carrier phone is the same hardware; the difference is the contract attached to it.",
  ],
  retailersLead: (x: ChannelsView) => `Worth a look when you are already shopping there, not worth a watch: ${listWords(x.ch.retailers)} list the iPhone Duo per configuration and sell their allocation online in minutes, with no feed to subscribe to. Their advantage is payment terms and loyalty points; their disadvantage is a smaller allocation than Apple's own stores.`,
  retailersKeys: (x: ChannelsView) => [
    `Retailers${where(x.c)}: ${listWords(x.ch.retailers)}.`,
    "Check the product page's configuration picker: greyed-out means out of stock online, which says nothing about their shops.",
  ],
  resaleLead: (x: ChannelsView) => {
    const w = x.sup.last7;
    const perDay = w.days ? w.restocks / w.days : 0;
    return `Rarely. Weigh the markup against the wait it buys: Apple Stores${where(x.c)} restocked ${perDay >= 1 ? `about ${Math.round(perDay)} times a day` : "less than once a day"} this week, and an alert reaches you about ${SPEED.alertSec} s after a confirmed restock, so a watched store near you usually comes through within days. Against that, ${listWords(x.ch.resale)} offer no manufacturer purchase record, ${x.ch.returnDays ? `none of ${returnPhrase(x.ch.returnDays)}` : "no return window at all"}, and the usual risks — an activation-locked device, a swapped box, a "sealed" return.`;
  },
  resaleKeys: () => [
    "If you do buy resale: meet in person, power it on, check Settings → General → About for the serial, and sign in before paying.",
    "Apple's warranty follows the device, not the receipt — but proof of purchase may be asked for; a private sale cannot give you Apple's.",
    "A premium that exceeds a week of waiting is a premium for impatience; decide knowing that.",
  ],
  abroadLead: (x: ChannelsView) => `Often yes, with checks: an iPhone bought from Apple is sold unlocked in most countries, Apple's warranty service is available internationally with exceptions, and the model must support your home carrier's bands — and its eSIM, because Apple's buy pages list the iPhone Duo as eSIM-only in every country. Taxes are the real cost: ${x.c.pricesIncludeTax ? "the price you pay abroad includes local tax you may not reclaim" : "sales tax is added at the register"}, and your home customs may add duty on the way back. PickupChecker tracks ${x.us ? "18 other countries" : "the US and 17 other countries"}, so the stock question itself is answerable from the country pages.`,
  abroadKeys: () => [
    "Before buying: Apple's warranty page for where service is offered, the model's band and SIM list, and your home carrier's eSIM support.",
    "Keep the receipt: service and any return go through the country of purchase's rules.",
    "A phone bought for someone back home is still one bought abroad; the same checks apply.",
  ],
  methodLead: (x: ChannelsView) => `The Apple Store numbers on this page come from PickupChecker's own checks of ${storesPhrase(x)} every ${SPEED.checkSec} s since ${longDate(x.sup.since)}; a restock counts only after two consistent observations. The carrier and retailer lists are the sellers Apple itself names for the country plus the largest resellers, with their own pages as sources; what we say about their stock is what their pages show, which is a snapshot, not a history. We do not scrape them and we make no claim about their restock times.`,
  methodKeys: () => ["Corrections welcome: if a seller on this page no longer carries the iPhone Duo, tell us and it comes off.", "Quote with a link and the date."],
  faq: (x: ChannelsView): Faq[] => [
    { q: `Which channel restocks the iPhone Duo fastest${where(x.c)}?`, a: `The only channel with a measurable record is Apple Store pickup: ${plural(x.sup.last7.restocks, "confirmed restock")} in the last seven days${where(x.c)}${x.sup.last7.medianSec ? `, each listed a median ${secs(x.sup.last7.medianSec)}` : ""}. Carriers and retailers restock too but publish no feed, so no one can rank them honestly.` },
    { q: "If I cancel my apple.com order and reorder, do I lose my place?", a: "You get a new order with today's shipping estimate; Apple publishes no queue position. Compare the estimate shown at checkout with the one on your existing order before cancelling — it is rarely earlier." },
    { q: "Is a carrier iPhone Duo different from Apple's?", a: `Same hardware. ${x.ch.carrierLock ?? "The difference is the plan and any lock or financing terms attached."} Carrier stock is separate from Apple's and shown per shop.` },
    { q: "Does buying from a retailer get me Apple's return window?", a: x.ch.returnDays ? `No — the retailer's own policy applies. Apple's ${x.ch.returnDays}-day window applies to purchases from Apple (apple.com and Apple Stores).` : x.ch.returnDays === 0 ? "Apple in Hong Kong accepts no change-of-mind returns itself (exchanges for defects only), so compare the retailer's own policy — some are more generous than Apple there." : "No — the retailer's own policy applies; Apple's return window covers purchases from Apple only." },
    { q: "Which carriers does Apple list for the iPhone Duo?", a: x.c.cc === "us" || x.c.cc === "jp" ? `Apple's buy page${where(x.c)} names ${listWords(x.ch.carriers)}; every other country's page sells it unlocked without a carrier step.` : `Apple's buy page${where(x.c)} sells the iPhone Duo unlocked and names no carrier; ${listWords(x.ch.carriers)} are the networks Apple lists as supporting the iPhone there, and they sell it on their own terms.` },
    { q: "Can I use an iPhone Duo bought abroad with my carrier at home?", a: "Usually, if the model supports your carrier's bands and your carrier offers eSIM (the iPhone Duo is eSIM-only everywhere) and it is unlocked, which Apple's own sales are in most countries. Warranty service is international with exceptions; taxes and duty are the real extra cost." },
  ],
  sources: { buy: "Apple – Buy iPhone Duo", pickup: "Apple – In-store pickup and delivery", returns: "Apple – Returns and the return window", warranty: "Apple – Warranty service by country", log: "PickupChecker – the restock log this page is computed from" },
  ld: (x: ChannelsView) => ({
    description: `Apple Store pickup vs apple.com delivery vs carriers vs retailers vs resale for the iPhone Duo${where(x.c)}: measured Apple Store restocks, and what the other channels can and cannot tell you.`,
  }),
  related: "Keep reading",
  sameData: "Same data, other questions",
  otherCountries: "This page for other countries",
  questions: { howToGet: "How to get an iPhone Duo", whereToBuy: "Where to buy one today", shortage: "Is the shortage easing?", configs: "Which configuration is easiest to get?", restockTimes: "When does Apple restock the iPhone Duo?", alerts: "Fastest way to get notified" },
  setUpAlert: "Set up alerts",
  logLive: "Restock log, live",
  faqTitle: "Questions people ask",
  onThisPage: "On this page",
};

/* ================================================================== the public API */
const api = {
  crumb: "Stock API",
  title: (c: Country) => (c.cc === "us" ? "iPhone Duo Stock API: Live Apple Store Data (Free)" : fitTitle([`iPhone Duo Stock API ${c.inName}: Live Apple Store Data`, `iPhone Duo Stock API ${c.inName} (Free JSON)`, `iPhone Duo Stock API (${c.short})`], 49)),
  metaDescription: (x: ApiView) => fitTitle([
    `A free, read-only JSON API for iPhone Duo pickup stock at ${plural(x.stores, "Apple Store")}${where(x.c)} (${n(x.worldStores)} in ${x.countries} countries): current availability per store and configuration, confirmed restocks of the last 24 hours, no key, cached 30 s. Endpoints, curl/Python/JavaScript examples, limits, and when a script beats an alert.`,
    `Free JSON API for iPhone Duo stock at ${plural(x.stores, "Apple Store")}${where(x.c)}: availability per store, restocks of the last 24 h, no key. Endpoints, examples and limits.`,
  ], 160),
  h1: (x: ApiView) => `Is there an API or a script to monitor iPhone Duo stock at Apple Stores${where(x.c)}?`,
  intro: (x: ApiView) => `Yes: PickupChecker publishes a free, read-only JSON API covering ${storesPhrase(x)} (${n(x.worldStores)} stores in ${x.countries} countries in all), built from checks every ${SPEED.checkSec} s per store and cached 30 s at the edge, with no key and no sign-up. One request returns every store's current pickup availability for the iPhone Duo by configuration; a second returns the confirmed restocks of the last 24 hours. Right now ${x.storesNow} of ${plural(x.stores, "store")}${where(x.c)} list one and ${plural(x.restocks24, "restock")} were confirmed in the last 24 hours. Below: the endpoints, working examples in curl, Python and JavaScript, the field reference, the limits — and why a script polling at the 30-second cache interval is still slower than a push alert.`,
  updated: (x: ApiView, stamp: string) => `Updated ${stamp} · ${plural(x.stores, "Apple Store")}${where(x.c)} · checked every ${SPEED.checkSec} s · API cached 30 s`,
  nav: { endpoints: "Endpoints", examples: "Examples", fields: "Fields", limits: "Limits & terms", script: "Script or alert?", apple: "Scraping apple.com", method: "Where the data comes from" },
  h2: (x: ApiView) => ({
    endpoints: `What does the iPhone Duo stock API return${where(x.c)}?`,
    examples: "How do I call it from curl, Python or JavaScript?",
    fields: "What do the fields mean?",
    limits: "How often can I poll, and what are the terms?",
    script: "Should I write my own script or just use alerts?",
    apple: "Can I poll apple.com myself instead?",
    method: "Where the data comes from",
  }),
  hero: { stores: (one: boolean): string => (one ? "Apple Store covered" : "Apple Stores covered"), now: "listing an iPhone Duo now", restocks24: "confirmed restocks, last 24 h", cache: "seconds the API is cached" },
  perMinute: "requests a minute per address",
  keysNeeded: "API keys needed",
  endpointsLead: (x: ApiView) => `Three GET endpoints, all JSON, all under https://pickupchecker.com/api/v1: \`stock\` gives every Apple Store${where(x.c)} with the configurations it lists for pickup right now and when it was last checked; \`restocks\` gives confirmed restocks of the last 1–168 hours, newest first, with whether each is still listed; \`iphone-duo\` is a shortcut to \`stock?model=duo\`. The country code goes in the path (${x.c.cc}${x.c.cc === "uk" ? ", gb also accepted" : ""}); models are duo, 18-pro and 18-pro-max.`,
  endpointsCaption: "Endpoints (replace {country} with us, ca, uk, au, de, fr, it, es, jp, kr, hk, sg, ae, ch, nl, se, tw, at or be)",
  endpointsHead: ["Endpoint", "Returns", "Parameters"],
  endpointsRows: (x: ApiView) => [
    { path: `/api/v1/${x.c.cc}/stock`, returns: "Every store: in_stock, the available configurations, last_checked_at, last_in_stock_at; a summary with stores_in_stock.", params: "model (duo | 18-pro | 18-pro-max), storage (e.g. 512GB), color (e.g. night-sky)" },
    { path: `/api/v1/${x.c.cc}/restocks`, returns: "Confirmed restocks newest first: at, store, configuration, still_listed.", params: "model, hours (1–168, default 24), limit (1–200, default 100)" },
    { path: `/api/v1/${x.c.cc}/iphone-duo`, returns: "Redirects to stock?model=duo.", params: "—" },
    { path: "/api/v1", returns: "This list, the countries and models, the limits.", params: "—" },
  ],
  examplesLead: "Copy one of these; each prints the stores that list an iPhone Duo right now. No key, no header beyond a User-Agent that names your script (so we can write to you if it misbehaves).",
  exampleTitles: { curl: "curl (any shell)", python: "Python 3, standard library only", node: "JavaScript (Node 18+ or a browser)" },
  fieldsLead: "Every field is snake_case and every time is ISO 8601 in UTC. Store identifiers are Apple's own (R-numbers), so they match Apple's store pages and the URLs on this site.",
  fieldsCaption: "Field reference",
  fieldsHead: ["Field", "Type", "Meaning"],
  fieldsRows: () => [
    { f: "generated_at", t: "string", m: "When this answer was computed; the CDN may serve it for up to 30 s." },
    { f: "country.code / name / currency", t: "string", m: "The country of the stores." },
    { f: "configurations[]", t: "object", m: "The part numbers the query covers, with storage and color as Apple writes them." },
    { f: "summary.stores_in_stock", t: "integer", m: "Stores listing at least one covered configuration for pickup now." },
    { f: "stores[].store_number", t: "string", m: "Apple's store id, e.g. R085." },
    { f: "stores[].in_stock", t: "boolean", m: "At least one covered configuration is listed for pickup." },
    { f: "stores[].available[]", t: "object", m: "The listed configurations: part_number, storage, color." },
    { f: "stores[].last_checked_at", t: "string | null", m: `When we last read Apple's pickup page for this store (normally under ${SPEED.checkSec} s ago).` },
    { f: "stores[].last_in_stock_at", t: "string | null", m: "The last moment this store listed a covered configuration." },
    { f: "restocks[].at", t: "string", m: "When the configuration went from sold out to available (confirmed by two checks)." },
    { f: "restocks[].still_listed", t: "boolean | null", m: "Whether that store still lists it at the time of the answer." },
    { f: "attribution", t: "object", m: "The source, the licence line and this page." },
  ],
  limitsLead: `Poll at an interval of 30 seconds or longer per endpoint — answers are cached that long at the edge, so a shorter interval returns the same JSON — and stay under 60 requests a minute from one address, which is the limit that reaches our servers. The data is free to use, including commercially, on one condition: show "Source: PickupChecker" with a link to pickupchecker.com (or the store or country page) wherever the numbers appear. No key, no sign-up, CORS open, so a browser page can call it directly.`,
  limitsKeys: () => [
    "A 429 answer means more than 60 requests in a minute from your address; wait the Retry-After seconds.",
    "Breaking changes get a new version path (/api/v2); fields are added, never renamed, under v1.",
    "Please set a User-Agent naming your project and a contact; we have never blocked a polite script.",
  ],
  scriptLead: (x: ApiView) => `If you want a dashboard, a Discord bot, a spreadsheet or research, write the script — that is what the API is for. If you want to actually buy an iPhone Duo, a script is the slower tool: it sees a restock at its next poll, up to 30 s later, and then has to tell you; our push alert reads the same stores every ${SPEED.fastSec} s, confirms the restock and lands on your phone about ${SPEED.alertSec} s after — ${x.storesNow !== undefined ? "inside the median listing time of about a minute" : "inside the median listing time"}. Many people do both: the alert for buying, the API for watching.`,
  scriptCaption: "A polling script against a push alert",
  scriptHead: ["", "Your script on this API", "PickupChecker alert"],
  scriptRows: () => [
    { k: "Sees a restock after", a: "up to 30 s (cache) + your interval", b: `about ${SPEED.alertSec} s` },
    { k: "Reaches your phone", a: "whatever you build (email, bot, SMS)", b: "a notification on the Home Screen app" },
    { k: "Stores watched", a: "all of them, every call", b: `your chosen stores every ${SPEED.fastSec} s, all stores every ${SPEED.checkSec} s` },
    { k: "Costs", a: "free", b: "a plan for the alerts; this site is free to read" },
  ],
  appleLead: `You can, within limits: apple.com's pickup page answers per store and configuration, which is exactly what we read. What a one-off script misses is the care — IPv6 rotation so Apple keeps answering, a two-observation rule so a flapping "unavailable" does not become a false restock, time-zone handling for every store, and a record kept since launch day. If you only want the answer, the API is that work done; if you want to learn, our method page explains each piece.`,
  appleKeys: () => [
    "Apple's page is a snapshot: it tells you now, never how long a listing lasted or when the last one was.",
    `Our checks are ${SPEED.checkSec} s apart per store and never faster than ${SPEED.fastSec} s; a script that polls apple.com harder than that gets blocked and learns nothing.`,
  ],
  methodLead: (x: ApiView) => `Every number comes from PickupChecker reading Apple's own in-store pickup availability for ${storesPhrase(x)} every ${SPEED.checkSec} s (every ${SPEED.fastSec} s at stores with alerts). A change is committed only after two consistent observations; the first sighting after a gap is not a restock. The API serves the same tables the pages on this site read; nothing is sampled or estimated.`,
  methodKeys: () => ["Method in full: the how-it-works page.", "Attribution is the whole price; a link back keeps this free."],
  faq: (x: ApiView): Faq[] => [
    { q: `Is there a free API for iPhone Duo stock at Apple Stores${where(x.c)}?`, a: `Yes — PickupChecker's, at https://pickupchecker.com/api/v1/${x.c.cc}/stock: every Apple Store${where(x.c)} with the configurations it lists for pickup now, JSON, no key, cached 30 s. A second endpoint returns confirmed restocks of the last 24 hours.` },
    { q: "Does Apple have an official stock API?", a: "No public one. apple.com's pickup page can be read per store and configuration, which is what this site does with care (rotation, confirmation, time zones); the API here is that work exposed as JSON." },
    { q: "How current is the data?", a: `Each store is checked every ${SPEED.checkSec} s (every ${SPEED.fastSec} s at stores with alerts) and the API answer is cached 30 s, so a figure is at most about 45 s old; last_checked_at tells you exactly.` },
    { q: "Can I use it in a commercial product?", a: "Yes, with attribution: \"Source: PickupChecker\" linked to pickupchecker.com wherever the data is shown, and a polling interval of 30 s or longer. No key is needed." },
    { q: "Will a script get me an iPhone Duo faster than an alert?", a: `No: a script sees a restock at its next poll, up to 30 s later; the alert confirms it and reaches your phone about ${SPEED.alertSec} s after we see it. Use the script to watch and the alert to buy.` },
  ],
  sources: { pickup: "Apple – In-store pickup", method: "PickupChecker – how the checks work", log: "PickupChecker – the restock log" },
  ld: (x: ApiView) => ({
    description: `Free JSON API for iPhone Duo pickup availability at ${storesPhrase(x)}: current stock per store and configuration, confirmed restocks of the last 24 hours.`,
  }),
  related: "Keep reading",
  sameData: "Same data, other questions",
  otherCountries: "This page for other countries",
  questions: { alerts: "Fastest way to get notified", howItWorks: "How the checks work", restockTimes: "When does Apple restock the iPhone Duo?", shortage: "Is the shortage easing?", configs: "Which configuration is easiest to get?", stockChecker: "iPhone Duo stock checker" },
  setUpAlert: "Set up alerts",
  tryIt: "Open the live JSON",
  faqTitle: "Questions people ask",
  onThisPage: "On this page",
};

export const decide = { configs, supply, channels, api };
export type DecideDict = typeof decide;
