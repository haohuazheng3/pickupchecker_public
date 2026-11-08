/**
 * /iphone-duo-restock-times/{state} and /iphone-duo-restock-times/{state}/{city}: "When does the iPhone Duo restock in
 * Los Angeles?" answered for one US state or two-plus-store city, in the shape an answer engine quotes (docs/research.md
 * §8): the title is the question, the first sentence carries the share, the sample size, the since-date and the local
 * time, the date it was updated is visible, and every table is the place's own stores. Every number is PickupChecker's
 * own confirmed observation over the place's stores (lib/content/restockTimes.ts, duoRestockTimesAt), compared with
 * the national figures where that says something. English only: these pages exist for the US tree.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cache } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs, LinkRow, RelatedBlock, type Crumb } from "@/components/seo/Related";
import { Figure } from "@/components/content/Figure";
import { RichFaq, SourceList } from "@/components/content/RichFaq";
import { Chips, Measured, Points, Stat, StatGrid, StepStrip, Swap, type Point } from "@/components/ui/Viz";
import { emptyFacts } from "@/lib/content/facts";
import type { Faq, Source } from "@/lib/content/types";
import { STATE_CODES, STORES, appleName, catalogFor, cityPath, citiesWithStores, hasStatePage, statePath, statesWithStores, storeByNumber, storePath, storeTimeZone, type Store } from "@/lib/apple/catalog";
import { busiestWindow, duoRestockTimes, duoRestockTimesAt, hourShare, rangeLabel, restockTimesPath, type DayRow, type RestockTimes } from "@/lib/content/restockTimes";
import { PATTERN_MIN, PATTERN_MIN_DAYS, WEEKDAYS, WEEKDAY_MIN_SPAN, hourLabel, localStamp } from "@/lib/content/siteFacts";
import { recentByConfig } from "@/lib/stock/recent";
import { storesStock, storesWithStockNow } from "@/lib/stock/queries";
import { alertHref, fitTitle, plural } from "@/lib/seo/enrich";
import { nearbyCities, neighborStates } from "@/lib/seo/links";
import { CHECK_NOTE, PLANS, SPEED } from "@/lib/plans";
import { placePhotos } from "@/content/place-photos";

const SITE = "https://pickupchecker.com";
const APPLE_PICKUP = "https://www.apple.com/shop/shipping-pickup";
const APPLE_NEWSROOM = "https://www.apple.com/newsroom/2026/10/iphone-duo-arrives-at-apple-store-locations-worldwide/";
const MACRUMORS = "https://macrumors.com/2026/10/24/apple-store-pickup-iphone-duo-us/";
const WIKI_MEDIAN = "https://en.wikipedia.org/wiki/Median";

/** A US state with a page of its own, or a two-plus-store city (the only places with a restock-times page). */
export interface RestockPlace {
  kind: "state" | "city";
  state: string;
  stateSlug: string;
  stateCode: string;
  city?: string;
  citySlug?: string;
  /** As sentences say it: "Los Angeles", "New York City", "Texas", "Washington State". */
  name: string;
  /** As the breadcrumb says it: "Los Angeles", "Texas". */
  label: string;
  stores: Store[];
  /** /stores/{state}[/{city}]: the place's live page. */
  storesHref: string;
  /** This page. */
  href: string;
}

/** The two names titles and sentences use where the plain city or state name would mislead (placeCopy.ts says the same). */
const SAID: Record<string, string> = { "city:New York|New York": "New York City", "state:Washington": "Washington State" };

/** The state's page place, or null when the state has no page of its own (one store, or one city: the proxy 308s). */
export function statePlaceOf(slug: string): RestockPlace | null {
  const s = statesWithStores().find((x) => x.slug === slug);
  if (!s || !hasStatePage(s.name)) return null;
  const stores = STORES.filter((x) => x.state === s.name).sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name));
  const name = SAID[`state:${s.name}`] ?? s.name;
  return { kind: "state", state: s.name, stateSlug: s.slug, stateCode: s.code, name, label: s.name, stores, storesHref: statePath(s.name), href: `/iphone-duo-restock-times/${s.slug}` };
}

/** The city's page place, or null for a one-store city (its store's page answers) or an unknown one. */
export function cityPlaceOf(state: string, city: string): RestockPlace | null {
  const c = citiesWithStores().find((x) => x.stateSlug === state && x.slug === city);
  if (!c || c.stores.length < 2) return null;
  const stores = [...c.stores].sort((a, b) => a.name.localeCompare(b.name));
  const name = SAID[`city:${c.name}|${c.state}`] ?? c.name;
  return { kind: "city", state: c.state, stateSlug: c.stateSlug, stateCode: STATE_CODES[c.state] ?? c.state, city: c.name, citySlug: c.slug, name, label: c.name, stores, storesHref: cityPath(c.state, c.name), href: `/iphone-duo-restock-times/${c.stateSlug}/${c.slug}` };
}

/** Every place with a page: the states first, then the cities (sitemap, the national page's link rows). */
export function restockPlaces(): { states: RestockPlace[]; cities: RestockPlace[] } {
  const states = statesWithStores().map((s) => statePlaceOf(s.slug)).filter((p): p is RestockPlace => Boolean(p));
  const cities = citiesWithStores().filter((c) => c.stores.length > 1).map((c) => cityPlaceOf(c.stateSlug, c.slug)).filter((p): p is RestockPlace => Boolean(p));
  return { states, cities };
}

/* ---------------------------------------------------------------- formats */

const n = (x: number) => x.toLocaleString("en-US");
/** Whole-percent shares; under half a percent reads "<1%", never "0%". */
const pct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : `${Math.round(x * 100)}%`);
const dateLabel = (ymd: string, weekday = true) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", ...(weekday ? { weekday: "short" as const } : {}) }).format(new Date(`${ymd}T12:00:00Z`));
const longDate = (ymd: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
/** "Nov 5, 2026, 10:12 AM PST": the visible "updated" stamp, in the place's zone. */
const updatedStamp = (iso: string, tz: string) => new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(iso));
const secs = (s: number) => (s < 120 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`);
/** "about 70 seconds", "about 3 minutes": the sell-out median as a sentence says it. */
const about = (s: number) => (s < 100 ? `about ${Math.round(s / 5) * 5} seconds` : s < 3600 ? `about ${Math.round(s / 60)} minutes` : `about ${(s / 3600).toFixed(1)} hours`);

/** "Pacific time", "Eastern time"; a place across two zones says "store local time". */
const ZONE_WORD: Record<string, string> = {
  "America/New_York": "Eastern", "America/Detroit": "Eastern", "America/Kentucky/Louisville": "Eastern", "America/Indiana/Indianapolis": "Eastern",
  "America/Chicago": "Central", "America/Denver": "Mountain", "America/Boise": "Mountain", "America/Phoenix": "Arizona",
  "America/Los_Angeles": "Pacific", "America/Anchorage": "Alaska", "Pacific/Honolulu": "Hawaii", "America/Puerto_Rico": "Atlantic",
};
function zoneWord(stores: Store[]): { word: string; one: boolean; tz: string } {
  const zones = [...new Set(stores.map((s) => storeTimeZone(s)))];
  const tz = zones[0];
  if (zones.length === 1 && ZONE_WORD[tz]) return { word: `${ZONE_WORD[tz]} time`, one: true, tz };
  return { word: "store local time", one: zones.length === 1, tz };
}

const th = "border-b border-line-2 py-2 pe-3 text-start font-semibold text-ink";
const td = "py-2 pe-3 align-top tabular-nums";
const rowTh = "py-2 pe-3 text-start font-medium text-ink";

function Table({ caption, head, children, min = "28rem" }: { caption: string; head: string[]; children: ReactNode; min?: string }) {
  return (
    <div className="my-5 overflow-x-auto">
      <table className="w-full border-collapse text-sm" style={{ minWidth: min }}>
        <caption className="mb-2 text-start text-xs text-ink-3">{caption}</caption>
        <thead><tr>{head.map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** Keyword lines inside the prose pane (the pane's list indent is turned off). */
function Keys({ items, className = "my-3" }: { items: Point[]; className?: string }) {
  return <Points items={items} className={`${className} ml-0!`} />;
}

function ChipLinks({ items }: { items: { href: string; label: string }[] }) {
  return <div className="my-3 flex flex-wrap gap-1.5">{items.map((l) => <Link key={l.href} href={l.href} className="chip chip-sm no-underline!">{l.label}</Link>)}</div>;
}

/* ---------------------------------------------------------------- data */

const load = cache(async (place: RestockPlace) => {
  const numbers = place.stores.map((s) => s.storeNumber);
  return Promise.all([duoRestockTimesAt("us", place.stores), duoRestockTimes("us"), storesWithStockNow(numbers, "us"), recentByConfig({ storeNumbers: numbers, country: "us" }), storesStock(numbers)]);
});

/** "58% of the 412 iPhone Duo restocks … since October 29, 2026 landed between 9 and 11 AM Pacific time": the sentence everything else repeats. */
function quotable(place: RestockPlace, t: RestockTimes, zone: string): string {
  const k = place.stores.length;
  const where = `${k} Apple Stores in ${place.name}`;
  if (t.unknown) return `PickupChecker's restock log for the ${where} could not be read just now; the stores are still being checked every ${SPEED.checkSec} seconds and this page returns with its numbers on the next load.`;
  if (t.n === 0) return `None yet, by our checks: since ${longDate(t.since)} PickupChecker has asked the ${where} every ${SPEED.checkSec} seconds and has not confirmed an iPhone Duo pickup restock.`;
  const w = busiestWindow(t.byHour);
  if (t.peakHour != null) {
    return `${pct(w.share)} of the ${n(t.n)} iPhone Duo restocks PickupChecker confirmed at the ${where} since ${longDate(t.since)} landed between ${rangeLabel(w.from, w.to)} ${zone}${t.sellout ? `, and a typical one sold out in ${about(t.sellout.medianSec)}` : ""}.`;
  }
  return `The ${where} have restocked the iPhone Duo ${plural(t.n, "time")} since ${longDate(t.since)}, on ${plural(t.days, "day")} — not yet enough to call a usual hour (PickupChecker waits for ${PATTERN_MIN} restocks over ${PATTERN_MIN_DAYS} different days)${t.sellout ? `; a typical one sold out in ${about(t.sellout.medianSec)}` : ""}.`;
}

/**
 * The question is the title; "Times by Hour" rides along only while the whole tag (with the " · PickupChecker" suffix,
 * 16 characters) stays within the 65 Bing's URL inspection flags as "title too long". Never truncated: a long place
 * name keeps its full question.
 */
function titleOf(place: RestockPlace): string {
  const q = `When Does the iPhone Duo Restock in ${place.name}?`;
  return q.length + " Times by Hour".length + 16 <= 65 ? `${q} Times by Hour` : q;
}

export async function placeRestockTimesMetadata(place: RestockPlace): Promise<Metadata> {
  const [t] = await load(place);
  const title = titleOf(place);
  const zone = zoneWord(place.stores).word;
  const q = quotable(place, t, zone);
  const description = fitTitle([q, `${q.split(";")[0].split(", and a typical")[0]}.`, `iPhone Duo restock times in ${place.name}: ${n(t.n)} confirmed restocks since ${dateLabel(t.since, false)}, by hour, day and store.`], 158);
  return {
    title: { absolute: `${title} · PickupChecker` },
    description,
    alternates: { canonical: place.href },
    openGraph: { type: "article", siteName: "PickupChecker", title, description, url: place.href },
  };
}

export async function PlaceRestockTimesPage({ place }: { place: RestockPlace }) {
  const [t, us, stockNow, recent, stock] = await load(place);
  const { stores } = place;
  const k = stores.length;
  const city = place.kind === "city";
  const zone = zoneWord(stores);
  const facts = emptyFacts("us");
  const items = catalogFor("duo");
  const cfg = (p: string) => { const i = items.find((x) => x.partNumber === p); return i ? `${i.storage} ${i.color}` : p; };
  const w = busiestWindow(t.byHour);
  const uw = busiestWindow(us.byHour);
  const pattern = t.peakHour != null;
  const duoNow = stockNow.duo;
  const today = t.today;
  const tracked = Math.max(t.daily.length, t.days, 1);
  const hours = t.byHour.map((count, hour) => ({ hour, count })).filter((h) => h.count > 0);
  const topHours = [...hours].sort((a, b) => b.count - a.count).slice(0, 3);
  const busiestDay = t.daily.reduce<DayRow | null>((a, d) => (d.restocks > (a?.restocks ?? 0) ? d : a), null);
  const weekend = t.byWeekday[0] + t.byWeekday[6];
  const sell = t.sellout;
  const storeRows = t.topStores.map((r) => ({ ...r, store: storeByNumber(r.storeNumber) })).filter((r) => r.store);
  const quiet = stores.filter((s) => !t.topStores.some((r) => r.storeNumber === s.storeNumber));
  const top = storeRows[0];
  const parts = t.byPart;
  const topPart = parts[0];
  const lastPart = parts.length ? parts[parts.length - 1] : undefined;
  const latestStore = t.latest ? storeByNumber(t.latest.storeNumber) : undefined;
  const nowAt = (s: Store) => (stock.get(s.storeNumber)?.perModel.duo.available ?? 0) > 0;
  const alert = alertHref({ model: "duo", state: place.stateSlug, city: place.citySlug });
  const stateHref = hasStatePage(place.state) ? restockTimesPath(place.state) : null;
  const share = t.n && us.n ? Math.round((t.n / us.n) * 1000) / 10 : 0;
  const lead = quotable(place, t, zone.word);
  const title = titleOf(place);
  const h1 = `When does the iPhone Duo restock in ${place.name}?`;
  const [photo1, photo2] = placePhotos(city ? `${place.city}, ${place.state}` : place.state);

  // Sideways: the state's other cities with a page, the bordering states' pages; a city's nearest other cities' pages.
  const cityPages = citiesWithStores().filter((c) => c.state === place.state && c.stores.length > 1 && c.slug !== place.citySlug).map((c) => ({ href: restockTimesPath(c.state, c.name), label: c.name, meta: String(c.stores.length) }));
  const neighborPages = neighborStates(place.state).filter((s) => hasStatePage(s.name)).map((s) => ({ href: restockTimesPath(s.name), label: s.name, meta: String(s.count) }));
  const mid = { lat: stores.reduce((a, s) => a + s.lat, 0) / k, lng: stores.reduce((a, s) => a + s.lng, 0) / k };
  const nearPages = city ? nearbyCities(mid.lat, mid.lng, { limit: 10, maxMiles: 200 }).filter((c) => c.count > 1 && !(c.state === place.state && c.name === place.city)).slice(0, 6).map((c) => ({ href: restockTimesPath(c.state, c.name), label: `${c.name}, ${c.stateCode}`, meta: `${Math.round(c.distance)} mi` })) : [];

  const sections = [
    { id: "time-of-day", nav: "Time of day", h2: `What time of day does the iPhone Duo restock in ${place.name}?` },
    { id: "day-by-day", nav: "Day by day", h2: `Which days has the iPhone Duo restocked in ${place.name}?` },
    { id: "stores", nav: city ? "By store" : "By store and city", h2: `Which Apple Stores in ${place.name} restock the iPhone Duo most?` },
    { id: "configuration", nav: "Configuration", h2: `Which iPhone Duo configuration restocks most in ${place.name}?` },
    { id: "how-long", nav: "How long it lasts", h2: `How long does an iPhone Duo restock last in ${place.name}?` },
    { id: "right-now", nav: "Right now", h2: `Is the iPhone Duo in stock in ${place.name} right now?` },
    { id: "alerts", nav: "Catch the next one", h2: `How do you catch the next iPhone Duo restock in ${place.name}?` },
    { id: "method", nav: "How we count", h2: "How does PickupChecker count a restock?" },
  ];
  const h2Of = (id: string) => sections.find((s) => s.id === id)!.h2;

  const faq: Faq[] = [
    { q: `When does Apple restock the iPhone Duo in ${place.name}?`, a: t.n > 0 && pattern
      ? `${lead} The busiest single hour has been ${rangeLabel(t.peakHour!, t.peakHour! + 1)} (${n(t.byHour[t.peakHour!])} restocks), and ${pct(hourShare(t.byHour, 8, 12))} of all restocks fell between 8 AM and noon. Apple publishes no schedule; this is PickupChecker's observed pattern over the ${k} stores, updated about every five minutes.`
      : `${lead} Apple publishes no schedule. Hour-by-hour tables fill in on this page as restocks are confirmed; the national pattern, from the most data, is on [the US page](/iphone-duo-restock-times).` },
    { q: `Which Apple Store in ${place.name} restocks the iPhone Duo most often?`, a: top
      ? `[${appleName(top.store!)}](${storePath(top.store!)}) — ${plural(top.restocks, "confirmed restock")} on ${plural(top.days, "day")} since ${longDate(t.since)}${top.peakHour != null ? `, usually around ${hourLabel(top.peakHour)} local time` : ""}; its last one was ${localStamp(top.lastAt, top.store!)}. ${storeRows.length > 1 ? `The table above ranks all ${plural(storeRows.length, "store")} with a restock${quiet.length ? `; ${plural(quiet.length, "store")} in ${place.name} ${quiet.length === 1 ? "has" : "have"} none yet` : ""}.` : ""}`
      : `None of the ${k} Apple Stores in ${place.name} has a confirmed iPhone Duo restock since ${longDate(t.since)} yet; every store is checked every ${SPEED.checkSec} seconds and the table on this page fills in from the first one.` },
    { q: `Does the iPhone Duo restock on weekends in ${place.name}?`, a: t.n > 0
      ? `${weekend > 0 ? "Yes so far" : "Not yet in our data"}: ${plural(weekend, "restock")} fell on a Saturday or Sunday out of ${n(t.n)} (${pct(weekend / t.n)}). ${t.peakWeekday != null ? `${WEEKDAYS[t.peakWeekday]} has been the busiest weekday.` : `Which weekday is busiest we do not state until the data spans ${WEEKDAY_MIN_SPAN} days; ours covers ${tracked}.`}`
      : `No weekend data for ${place.name} yet; the day-by-day table on this page fills in as restocks are confirmed.` },
    { q: `How long does an iPhone Duo restock last in ${place.name}?`, a: sell
      ? `Half of the ${n(sell.n)} timed restocks in ${place.name} were gone within ${secs(sell.medianSec)} (the [median](${WIKI_MEDIAN})); ${pct(sell.within2min)} sold out within 2 minutes and ${pct(sell.within20min)} within 20. Nationally the median is ${us.sellout ? secs(us.sellout.medianSec) : "about a minute"}. Each figure is the time between our check that saw the listing and the check that saw it gone, so it is an upper bound.`
      : `Fewer than 10 restocks in ${place.name} have been timed to a sell-out so far, which is too few for a local figure; nationally half of all iPhone Duo restocks are gone within ${us.sellout ? secs(us.sellout.medianSec) : "about a minute"} ([the sell-out page](/iphone-duo-sell-out-times)).` },
    { q: `How do I get notified when the iPhone Duo restocks in ${place.name}?`, a: `Set an alert for the ${k === 1 ? "store" : "stores"} you can reach: alerts from $${PLANS.plus.priceUsd}/month, the stores you pick are checked every ${SPEED.fastSec} s, with a push about ${SPEED.alertSec} s after a restock is confirmed. One alert is one store and one exact configuration, so [pick the stores in ${place.name}](${alert}) and the storage and color you would actually buy; [how to set it up](/iphone-duo-stock-alerts), and [how to check out in the time a restock lasts](/how-to-grab-an-iphone-duo-restock).` },
  ];

  const sources: Source[] = [
    { label: "Apple — Shipping & Pickup (how in-store pickup works)", url: APPLE_PICKUP },
    { label: "Apple Newsroom — iPhone Duo arrives at Apple Store locations worldwide", url: APPLE_NEWSROOM },
    { label: "MacRumors — iPhone Duo Apple Store pickup in the US (October 24, 2026)", url: MACRUMORS },
    { label: "Wikipedia — Median", url: WIKI_MEDIAN },
  ];

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${SITE}${place.href}`, url: `${SITE}${place.href}`, name: title, headline: h1, description: lead, isPartOf: { "@id": `${SITE}/#website` }, about: { "@id": `${SITE}/#organization` }, dateModified: t.at, inLanguage: "en-US" },
      {
        "@type": "Dataset", "@id": `${SITE}${place.href}#dataset`, name: `iPhone Duo restocks at Apple Stores in ${place.name}`,
        description: `Every confirmed iPhone Duo in-store pickup restock at the ${k} Apple Stores in ${place.name} since ${longDate(t.since)}, from PickupChecker's checks every ${SPEED.checkSec} seconds: by local hour, by day, by store and by configuration, with how long each restock stayed listed.`,
        url: `${SITE}${place.href}`, creator: { "@id": `${SITE}/#organization` }, isAccessibleForFree: true, temporalCoverage: `${t.since}/..`, dateModified: t.at,
        spatialCoverage: { "@type": "Place", name: city ? `${place.city}, ${place.stateCode}, US` : `${place.state}, US`, ...(city ? { containedInPlace: { "@type": "AdministrativeArea", name: place.state } } : {}) },
        variableMeasured: ["Confirmed iPhone Duo restocks per local hour", "Restocks per day and per store", "Restocks per storage size and color", "Seconds a restock stayed listed before it sold out"],
        ...(t.n ? { size: `${n(t.n)} restocks` } : {}),
        inLanguage: "en-US",
      },
    ],
  };

  const crumbs: Crumb[] = [
    { href: "/", label: "PickupChecker" },
    { href: "/iphone-duo-restock-times", label: "iPhone Duo restock times" },
    ...(city && stateHref ? [{ href: stateHref, label: place.state }] : []),
    { label: place.label },
  ];

  const heroTiles: ReactNode[] = t.n > 0 && !t.unknown
    ? [
      <Stat key="n" value={n(t.n)} label={`confirmed restocks at ${plural(k, "store")} since ${dateLabel(t.since, false)}`} tone="accent" />,
      pattern
        ? <Stat key="w" value={pct(w.share)} label={`between ${rangeLabel(w.from, w.to)}, ${zone.word}`} />
        : <Stat key="d" value={`${t.days}/${tracked}`} label="days with at least one restock" />,
      <Stat key="now" value={`${duoNow}/${k}`} label="stores list one for pickup right now" live />,
      today
        ? <Stat key="today" value={n(today.restocks)} label={`today (${dateLabel(today.date)}), at ${plural(today.stores, "store")}, so far`} />
        : sell
          ? <Stat key="sell" value={sell.medianSec} unit="s" label="typical restock: half were gone within" tone="warn" />
          : <Stat key="d2" value={`${t.days}/${tracked}`} label="days with at least one restock" />,
    ]
    : [];

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8">
      <JsonLd data={ld} />
      <Breadcrumbs items={crumbs} />
      <h1 className="display mt-3 text-3xl sm:text-5xl">{h1}</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-2">
        {t.unknown || t.n === 0 ? lead : pattern ? (
          <><b className="text-ink">{pct(w.share)} of the {n(t.n)} iPhone Duo restocks</b> PickupChecker confirmed at the {k} Apple Stores in {place.name} since {longDate(t.since)} landed <b className="text-ink">between {rangeLabel(w.from, w.to)} {zone.word}</b>{sell ? <>, and a typical one sold out in <b className="text-ink">{about(sell.medianSec)}</b></> : null}.</>
        ) : (
          <>The {k} Apple Stores in {place.name} have restocked the iPhone Duo <b className="text-ink">{plural(t.n, "time")} since {longDate(t.since)}</b>, on {plural(t.days, "day")} — not yet enough to call a usual hour (we wait for {PATTERN_MIN} restocks over {PATTERN_MIN_DAYS} different days){sell ? <>; a typical one sold out in <b className="text-ink">{about(sell.medianSec)}</b></> : null}.</>
        )}
      </p>
      <p className="mt-2 text-sm text-ink-3">Updated {updatedStamp(t.at, zone.tz)} · data since {longDate(t.since)} · {plural(k, "Apple Store")} · checked {CHECK_NOTE}</p>
      {heroTiles.length > 0 && <StatGrid cols={4} className="mt-6">{heroTiles}</StatGrid>}
      {!t.unknown && t.n > 0 && (
        <Points className="mt-4" items={[
          ...(t.latest && latestStore ? [{ text: <>Latest: <b className="text-ink">{cfg(t.latest.partNumber)}</b> at <Link href={storePath(latestStore)} className="underline underline-offset-2">{appleName(latestStore)}</Link>, {localStamp(t.latest.at, latestStore)} local time</> }] : []),
          ...(pattern && us.peakHour != null ? [{ text: <>Nationally: <b className="text-ink">{pct(uw.share)}</b> of {n(us.n)} US restocks between {rangeLabel(uw.from, uw.to)} store local time — {place.name} {Math.abs(w.share - uw.share) < 0.03 ? "matches the US pattern" : w.share > uw.share ? "is more concentrated in its window than the US as a whole" : "is spread wider through the day than the US as a whole"}</> }] : []),
          ...(t.peakWeekday != null ? [{ text: <>Most often on <b className="text-ink">{WEEKDAYS[t.peakWeekday]}s</b></> }] : []),
          { text: <>Apple publishes <b className="text-ink">no restock schedule</b>; these are our own confirmed checks, updated about every five minutes</>, no: true },
        ]} />
      )}
      {!t.unknown && t.n === 0 && (
        <Points className="mt-4" items={[
          { text: <>Right now <b className="text-ink">{duoNow} of {k}</b> stores list one for pickup</> },
          { text: <>The tables below fill in from the first confirmed restock</>, step: true },
          { text: <>The national pattern, from the most data: <Link href="/iphone-duo-restock-times" className="underline underline-offset-2">the US page</Link></>, step: true },
        ]} />
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={alert} className="btn btn-primary">Alert me for {place.name} stores</Link>
        <Link href={place.storesHref} className="btn btn-ghost">Live stock in {place.name}</Link>
      </div>
      <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2 text-sm">
        {sections.map((s) => <a key={s.id} href={`#${s.id}`} className="chip px-3 py-1.5 text-xs">{s.nav}</a>)}
      </nav>
      <Figure id={photo1} eager />

      <div className="pane prose-site mt-8 p-6 sm:p-8">
        {/* ---------------------------------------------------------------- time of day */}
        <section id="time-of-day" className="scroll-mt-24">
          <h2>{h2Of("time-of-day")}</h2>
          {pattern ? (
            <>
              <p>Mostly in the morning: <b className="text-ink">{pct(hourShare(t.byHour, 8, 12))}</b> of the {n(t.n)} restocks in {place.name} fell between 8 AM and noon {zone.one ? zone.word : "in each store's local time"}, and the single busiest hour has been <b className="text-ink">{rangeLabel(t.peakHour!, t.peakHour! + 1)}</b> with {n(t.byHour[t.peakHour!])}.</p>
              <StatGrid cols={4} className="my-4">
                <Stat value={<span className="text-2xl sm:text-3xl">{rangeLabel(t.peakHour!, t.peakHour! + 1)}</span>} label={`busiest hour · ${n(t.byHour[t.peakHour!])} restocks`} tone="accent" />
                <Stat value={pct(hourShare(t.byHour, 8, 12))} label="8 AM – noon" />
                <Stat value={pct(hourShare(t.byHour, 17, 24))} label="5 PM – midnight" />
                <Stat value={pct(hourShare(t.byHour, 0, 6))} label="midnight – 6 AM" tone="muted" />
              </StatGrid>
              {topHours.length > 0 && <Chips className="my-3" items={topHours.map((h) => `${rangeLabel(h.hour, h.hour + 1)} · ${n(h.count)}`)} on={[0]} />}
            </>
          ) : (
            <>
              <p>Too few restocks in {place.name} to call an hour yet: {plural(t.n, "restock")} on {plural(t.days, "day")}. We state a usual hour only from {PATTERN_MIN} restocks on {PATTERN_MIN_DAYS} different days, so ten restocks in one burst never become a habit.</p>
              <Keys items={[
                { text: <>The table fills in by itself as restocks are confirmed</>, step: true },
                { text: <>The US pattern, from {n(us.n)} restocks: <Link href="/iphone-duo-restock-times">{us.peakHour != null ? `${pct(uw.share)} between ${rangeLabel(uw.from, uw.to)} local time` : "the national page"}</Link></>, step: true },
              ]} />
            </>
          )}
          {hours.length > 0 && (
            <Table caption={`iPhone Duo restocks at Apple Stores in ${place.name} by local hour, ${dateLabel(t.since, false)} – today (hours with none are left out)`} head={["Local hour", "Restocks", "Share"]} min="20rem">
              {hours.map((h) => (
                <tr key={h.hour} className={`border-b border-line ${pattern && h.hour >= w.from && h.hour < w.to ? "bg-accent/[0.06]" : ""}`}>
                  <th scope="row" className={rowTh}>{rangeLabel(h.hour, h.hour + 1)}</th>
                  <td className={td}>{n(h.count)}</td>
                  <td className={td}>{pct(h.count / t.n)}</td>
                </tr>
              ))}
            </Table>
          )}
          {pattern && (
            <Keys items={[
              { text: <>Start watching <b className="text-ink">{hourLabel(Math.max(0, w.from - 1))}</b>; most of the day&apos;s restocks have landed by {hourLabel(w.to)}</>, step: true },
              { text: <>{pct(hourShare(t.byHour, 12, 17))} between noon and 5 PM: afternoons are {hourShare(t.byHour, 12, 17) >= 0.25 ? "a real second chance" : "quieter, not empty"}</> },
              { text: <>A restock that lands at {hourLabel(w.from)} is usually gone {sell ? about(sell.medianSec) : "about a minute"} later — the window says when to be ready, not when to look</>, no: true },
            ]} />
          )}
        </section>

        {/* ---------------------------------------------------------------- day by day */}
        <section id="day-by-day" className="scroll-mt-24">
          <h2>{h2Of("day-by-day")}</h2>
          <p>{t.n > 0 ? <>Restocks in {place.name} landed on <b className="text-ink">{t.days} of the {tracked} days</b> since {longDate(t.since)}{busiestDay ? <>; the busiest day was <b className="text-ink">{dateLabel(busiestDay.date)}</b> with {n(busiestDay.restocks)} at {plural(busiestDay.stores, "store")}</> : null}.</> : <>No day with a confirmed restock in {place.name} yet since {longDate(t.since)}.</>}</p>
          {t.n > 0 && (
            <StatGrid cols={3} className="my-4">
              <Stat value={`${t.days}/${tracked}`} label="days with a restock / days tracked" />
              {busiestDay ? <Stat value={n(busiestDay.restocks)} label={`busiest day · ${dateLabel(busiestDay.date)}`} tone="accent" /> : <Stat value="–" label="busiest day" tone="muted" />}
              <Stat value={pct(weekend / t.n)} label={`on a Saturday or Sunday (${n(weekend)})`} />
            </StatGrid>
          )}
          <Table caption={`iPhone Duo restocks at Apple Stores in ${place.name}, day by day (each store's local date)`} head={["Date", "Restocks", "Stores", "Busiest hour"]} min="26rem">
            {[...t.daily].reverse().map((d) => (
              <tr key={d.date} className="border-b border-line">
                <th scope="row" className={rowTh}>{dateLabel(d.date)}{today && d.date === today.date ? <span className="text-ink-3"> · so far</span> : ""}</th>
                <td className={td}>{n(d.restocks)}</td>
                <td className={td}>{d.stores}</td>
                <td className={td}>{d.peakHour == null ? "–" : rangeLabel(d.peakHour, d.peakHour + 1)}</td>
              </tr>
            ))}
          </Table>
          <Keys items={[
            { text: <>A quiet day reads as <b className="text-ink">0</b>, never as a gap: every day since {dateLabel(t.since, false)} is listed</> },
            { text: <>Tracking in {place.name} began {longDate(t.since)}, six days after the iPhone Duo went on sale; the national page shows other trackers&apos; launch-week reports as their own rows</> },
            { text: <>Weekday patterns are stated only once the data spans {WEEKDAY_MIN_SPAN} days{t.peakWeekday != null ? <>: so far <b className="text-ink">{WEEKDAYS[t.peakWeekday]}</b> leads</> : null}</>, step: true },
          ]} />
        </section>

        {/* ---------------------------------------------------------------- stores (and cities) */}
        <section id="stores" className="scroll-mt-24">
          <h2>{h2Of("stores")}</h2>
          {top ? (
            <p><b className="text-ink"><Link href={storePath(top.store!)}>{appleName(top.store!)}</Link></b> leads {place.name} with <b className="text-ink">{n(top.restocks)} confirmed restocks</b> on {plural(top.days, "day")}{top.peakHour != null ? <>, usually around {hourLabel(top.peakHour)}</> : null}; {storeRows.length} of the {k} stores {storeRows.length === 1 ? "has" : "have"} restocked at least once{quiet.length ? <>, {plural(quiet.length, "store")} not yet</> : null}.</p>
          ) : (
            <p>None of the {k} Apple Stores in {place.name} has a confirmed iPhone Duo restock since {longDate(t.since)} yet; the table fills in from the first.</p>
          )}
          {!city && t.byCity.length > 1 && (
            <Table caption={`iPhone Duo restocks by city in ${place.name} since ${dateLabel(t.since, false)} (a one-store city links to its store)`} head={["City", "Restocks", "Stores", "Last restock"]} min="30rem">
              {t.byCity.map((r) => (
                <tr key={r.slug} className="border-b border-line">
                  <th scope="row" className={rowTh}><Link href={r.path} className="hover:underline">{r.name}</Link></th>
                  <td className={td}>{n(r.restocks)}</td>
                  <td className={td}>{r.stores} of {r.storesTotal}</td>
                  <td className="py-2 pe-3 align-top">{r.lastAt && r.lastStore && storeByNumber(r.lastStore) ? <>{localStamp(r.lastAt, storeByNumber(r.lastStore)!)} · <Link href={storePath(storeByNumber(r.lastStore)!)} className="hover:underline">{storeByNumber(r.lastStore)!.name}</Link></> : "–"}</td>
                </tr>
              ))}
            </Table>
          )}
          <Table caption={`Every Apple Store in ${place.name}: confirmed iPhone Duo restocks since ${dateLabel(t.since, false)}, the usual hour where there is one (${PATTERN_MIN} restocks on ${PATTERN_MIN_DAYS} days), the last restock in the store's local time, and whether it lists one right now`} head={["Store", "Restocks", "Days", "Usual hour", "Last restock", "Now"]} min="38rem">
            {storeRows.map((r) => (
              <tr key={r.storeNumber} className="border-b border-line">
                <th scope="row" className={rowTh}><Link href={storePath(r.store!)} className="hover:underline">{appleName(r.store!)}</Link>{!city && <span className="font-normal text-ink-3"> · {r.store!.city}</span>}</th>
                <td className={td}>{n(r.restocks)}</td>
                <td className={td}>{r.days}</td>
                <td className={td}>{r.peakHour != null ? hourLabel(r.peakHour) : "–"}</td>
                <td className="py-2 pe-3 align-top">{localStamp(r.lastAt, r.store!)}</td>
                <td className={td}>{nowAt(r.store!) ? <span className="text-accent">in stock</span> : <span className="text-ink-3">–</span>}</td>
              </tr>
            ))}
            {quiet.map((s) => (
              <tr key={s.storeNumber} className="border-b border-line text-ink-3">
                <th scope="row" className="py-2 pe-3 text-start font-medium"><Link href={storePath(s)} className="hover:underline">{appleName(s)}</Link>{!city && <span className="font-normal"> · {s.city}</span>}</th>
                <td className={td}>0</td>
                <td className={td}>0</td>
                <td className={td}>–</td>
                <td className="py-2 pe-3 align-top">none yet</td>
                <td className={td}>{nowAt(s) ? <span className="text-accent">in stock</span> : "–"}</td>
              </tr>
            ))}
          </Table>
          <ol className="my-4 grid gap-3 sm:grid-cols-2">
            <Swap no={`Watch only the nearest store in ${place.name}`} yes={`Alert every ${place.name} store you could reach in 20 minutes`} why="Each store restocks on its own; the next one is as likely to be a town over." />
            <Swap no="Drive over when a store 'usually' restocks" yes="Reserve on apple.com the second the alert lands, then drive" why="A pickup reservation holds the phone; walk-in stock for the Duo is rare." />
          </ol>
          <ChipLinks items={[{ href: place.storesHref, label: `Live stock at every store in ${place.name}` }, { href: "/iphone-duo-near-me", label: "iPhone Duo near me" }]} />
          <Figure id={photo2} />
        </section>

        {/* ---------------------------------------------------------------- configuration */}
        <section id="configuration" className="scroll-mt-24">
          <h2>{h2Of("configuration")}</h2>
          {topPart && topPart.restocks > 0 ? (
            <p><b className="text-ink">{cfg(topPart.partNumber)}</b> is the configuration that comes back most in {place.name}: <b className="text-ink">{n(topPart.restocks)} of {n(t.n)} restocks</b> ({pct(topPart.restocks / t.n)}){lastPart && lastPart.partNumber !== topPart.partNumber ? <>, against {plural(lastPart.restocks, "restock")} for {cfg(lastPart.partNumber)}</> : null}. {lastPart && lastPart.restocks > 0 && topPart.restocks / lastPart.restocks >= 2 ? <> It has come back about <b className="text-ink">{Math.round(topPart.restocks / lastPart.restocks)}×</b> as often as the rarest: if you can live with it, your odds in {place.name} are that much better.</> : <> If you can live with the most-restocked configuration, your odds in {place.name} improve.</>}</p>
          ) : (
            <p>No configuration has a confirmed restock in {place.name} yet; all eight are listed below and fill in by themselves.</p>
          )}
          <Table caption={`iPhone Duo restocks in ${place.name} by storage and color since ${dateLabel(t.since, false)}`} head={["Configuration", "Restocks", "Share", "Last restock"]}>
            {parts.map((p) => (
              <tr key={p.partNumber} className="border-b border-line">
                <th scope="row" className={rowTh}>{cfg(p.partNumber)}</th>
                <td className={td}>{n(p.restocks)}</td>
                <td className={td}>{t.n ? pct(p.restocks / t.n) : "–"}</td>
                <td className="py-2 pe-3 align-top">{p.lastAt && p.lastStore && storeByNumber(p.lastStore) ? <>{localStamp(p.lastAt, storeByNumber(p.lastStore)!)} · <Link href={storePath(storeByNumber(p.lastStore)!)} className="hover:underline">{storeByNumber(p.lastStore)!.name}</Link></> : "–"}</td>
              </tr>
            ))}
          </Table>
          <Keys items={[
            { text: <>One alert = one store × one exact configuration; set it on the configuration you would actually buy</> },
            { text: <>Nationally the order is the same most of the time: <Link href="/which-iphone-duo-restocks-most">which iPhone Duo restocks most</Link></>, step: true },
          ]} />
        </section>

        {/* ---------------------------------------------------------------- how long */}
        <section id="how-long" className="scroll-mt-24">
          <h2>{h2Of("how-long")}</h2>
          {sell ? (
            <>
              <p>Half of the <b className="text-ink">{n(sell.n)} timed restocks</b> in {place.name} were gone within <b className="text-ink">{secs(sell.medianSec)}</b>; {pct(sell.within2min)} sold out within 2 minutes and {pct(sell.within20min)} within 20{us.sellout ? <> — {sell.medianSec < us.sellout.medianSec - 10 ? "faster than" : sell.medianSec > us.sellout.medianSec + 10 ? "slower than" : "about the same as"} the US median of {secs(us.sellout.medianSec)}</> : null}.</p>
              <StatGrid cols={4} className="my-4">
                <Stat value={sell.medianSec} unit="s" label="median listing (half were gone within)" tone="accent" />
                <Stat value={pct(sell.within2min)} label="gone within 2 minutes" tone="warn" />
                <Stat value={pct(sell.within20min)} label="gone within 20 minutes" />
                <Stat value={sell.fastestSec} unit="s" label="fastest sell-out" />
              </StatGrid>
            </>
          ) : (
            <p>Fewer than 10 restocks in {place.name} have been timed to a sell-out so far — too few for a local figure. Nationally, half of all iPhone Duo restocks are gone within {us.sellout ? secs(us.sellout.medianSec) : "about a minute"}, and {place.name} has given no reason to expect otherwise.</p>
          )}
          <Keys items={[
            { text: <>Each figure is the time between our check that saw the listing and the check that saw it gone: an <b className="text-ink">upper bound</b>, never rounded down</> },
            { text: <>That is why a page you reload by hand almost always shows &ldquo;unavailable&rdquo;: <Link href="/apple-store-pickup-availability-explained">what the status means</Link></> },
            { text: <>Restock by restock, every store in {place.name}: <Link href="/iphone-duo-sell-out-times">the sell-out times page</Link></>, step: true },
          ]} />
          {sell && <Measured>Lifetimes are measured between two of PickupChecker&apos;s checks ({SPEED.checkSec} s apart, {SPEED.fastSec} s for stores with alerts), so a restock that lasted 40 seconds may read as 45. Restocks still listed at the time of reading are not in these figures.</Measured>}
        </section>

        {/* ---------------------------------------------------------------- right now */}
        <section id="right-now" className="scroll-mt-24">
          <h2>{h2Of("right-now")}</h2>
          <p>{recent.unknown ? <>The live read failed just now; the stores in {place.name} are still being checked and this section returns on the next load.</> : <>Right now <b className="text-ink">{duoNow} of the {k}</b> Apple Stores in {place.name} {duoNow === 1 ? "lists" : "list"} an iPhone Duo for pickup; in the last 24 hours <b className="text-ink">{plural(recent.restocks, "restock")}</b> {recent.restocks === 1 ? "was" : "were"} confirmed at {plural(recent.stores, "store")}{recent.latest && storeByNumber(recent.latest.storeNumber) ? <>, the latest {cfg(recent.latest.partNumber)} at <Link href={storePath(storeByNumber(recent.latest.storeNumber)!)}>{appleName(storeByNumber(recent.latest.storeNumber)!)}</Link>, {localStamp(recent.latest.at, storeByNumber(recent.latest.storeNumber)!)}</> : null}.</>}</p>
          <StatGrid cols={3} className="my-4">
            <Stat value={`${duoNow}/${k}`} label="stores listing one for pickup now" live tone={duoNow > 0 ? "accent" : "plain"} />
            <Stat value={n(recent.restocks)} label="restocks in the last 24 hours" tone={recent.restocks > 0 ? "plain" : "muted"} />
            <Stat value={`${recent.stores}/${k}`} label="stores with a restock in the last 24 hours" tone={recent.stores > 0 ? "plain" : "muted"} />
          </StatGrid>
          <Keys items={[
            { text: <>Per store and configuration, with the time of the last check: <Link href={place.storesHref}>Apple Stores in {place.name}</Link></>, step: true },
            { text: <>Every confirmed restock in {place.state}, newest first: <Link href={`/restocks?model=duo&state=${place.stateSlug}`}>the restock log</Link></>, step: true },
          ]} />
        </section>

        {/* ---------------------------------------------------------------- alerts */}
        <section id="alerts" className="scroll-mt-24">
          <h2>{h2Of("alerts")}</h2>
          <p>Be ready {pattern ? <>before <b className="text-ink">{hourLabel(w.from)}</b></> : "in the morning"} with Apple&apos;s checkout already staged, and let an alert do the watching: a typical restock in {place.name} is over in {sell ? about(sell.medianSec) : "about a minute"}, which is less time than a reload-and-scroll takes.</p>
          <p><b className="text-ink">Alerts from ${PLANS.plus.priceUsd}/month:</b> the stores you pick are checked every {SPEED.fastSec} s, with a push about {SPEED.alertSec} s after a restock is confirmed. One alert is one store and one exact configuration; Plus covers {PLANS.plus.limit}, Pro {PLANS.pro.limit}, Max {PLANS.max.limit}.</p>
          <StepStrip className="my-4" steps={[
            { title: `Pick ${place.name} stores`, hint: "and the storage and color you would buy" },
            { title: "Install the Home Screen app", hint: "iPhone alerts need it" },
            { title: "Stage Apple's checkout", hint: "stop at the last step" },
            { title: "Tap the alert", hint: "about four taps, 20 seconds" },
          ]} />
          <p><Link href={alert} className="btn btn-primary">Alert me for {place.name} stores</Link></p>
          <ChipLinks items={[{ href: "/iphone-duo-stock-alerts", label: "How the alerts work" }, { href: "/how-to-grab-an-iphone-duo-restock", label: "Check out in 20 seconds" }, { href: "/install", label: "Install the app" }]} />
        </section>

        {/* ---------------------------------------------------------------- method */}
        <section id="method" className="scroll-mt-24">
          <h2>{h2Of("method")}</h2>
          <p>A restock here is apple.com flipping a configuration from &ldquo;currently unavailable&rdquo; to available for pickup at one of the {k} stores in {place.name}, seen by two of our checks in a row.</p>
          <Keys items={[
            { text: <>Every Apple Store in {place.name} every <b className="text-ink">{SPEED.checkSec} seconds</b>; the stores alerts point at every <b className="text-ink">{SPEED.fastSec}</b></> },
            { text: <>A first &ldquo;available&rdquo; is asked again <b className="text-ink">about a second later</b> before it counts</> },
            { text: <>A listing that disappears is confirmed on the <b className="text-ink">next round</b></> },
            { text: <>The first sighting of a store, a failed or timed-out request: <b className="text-ink">never</b> a restock, never &ldquo;out of stock&rdquo;</>, no: true },
            { text: <>Hours and dates in each store&apos;s <b className="text-ink">local time</b>{zone.one ? <> ({zone.word} throughout {place.name})</> : <> ({place.name} spans two zones)</>}</> },
            { text: <>Only PickupChecker&apos;s own observations enter these numbers; the national page shows other trackers&apos; launch-week reports as separate rows</> },
            { text: <>Updated about every five minutes; <Link href={`/restocks?model=duo&state=${place.stateSlug}`}>the restock log</Link> itself is live</>, step: true },
          ]} />
          <p className="text-sm text-ink-3">You are welcome to quote these numbers with a link to this page; PickupChecker is independent and not affiliated with Apple, and reads the same pickup availability anyone can see on apple.com, just far more often.</p>
        </section>
      </div>

      <RelatedBlock title="Restock times elsewhere">
        {city && stateHref && <LinkRow title={`All of ${place.state}`} links={[{ href: stateHref, label: `When does the iPhone Duo restock in ${SAID[`state:${place.state}`] ?? place.state}?` }]} />}
        {cityPages.length > 0 && <LinkRow title={city ? `Other cities in ${place.state}` : `By city in ${place.name}`} links={cityPages} />}
        {nearPages.length > 0 && <LinkRow title="Nearby cities" links={nearPages} />}
        {neighborPages.length > 0 && <LinkRow title="Neighboring states" links={neighborPages} />}
        <LinkRow title="The whole country" links={[{ href: "/iphone-duo-restock-times", label: "When does Apple restock the iPhone Duo in the US?", meta: t.n && us.n ? `${place.name} = ${share}% of US restocks` : undefined }]} />
        <LinkRow title={`${place.name}, live`} links={[
          { href: place.storesHref, label: `Apple Stores in ${place.name}` },
          { href: `/restocks?model=duo&state=${place.stateSlug}`, label: `${place.state} restock log` },
          { href: `/map?state=${place.stateCode}&model=duo`, label: "On the map" },
          { href: "/stock/iphone-duo", label: "iPhone Duo stock, all US stores" },
        ]} />
        <LinkRow title="More iPhone Duo questions" links={[
          { href: "/iphone-duo-sell-out-times", label: "How fast does it sell out?" },
          { href: "/iphone-duo-stock-alerts", label: "Fastest way to get notified" },
          { href: "/which-iphone-duo-restocks-most", label: "Which configuration restocks most?" },
          { href: "/iphone-duo-back-in-stock", label: "Is it back in stock right now?" },
          { href: "/where-to-buy-iphone-duo", label: "Where to buy one today" },
        ]} />
      </RelatedBlock>

      <div className="mt-10"><RichFaq items={faq} facts={facts} title={`iPhone Duo restocks in ${place.name}: FAQ`} /></div>
      <div className="mt-8"><SourceList sources={sources} facts={facts} where={`the ${k} Apple Stores in ${place.name}`} since={longDate(t.since)} /></div>
    </div>
  );
}
