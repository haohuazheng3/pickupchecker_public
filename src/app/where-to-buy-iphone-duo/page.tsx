/**
 * /where-to-buy-iphone-duo: "Where can you buy an iPhone Duo today?" for the person who wants a phone in hand today,
 * does not know tracker sites exist and will take any legitimate channel. Every H2 is a question with one quotable
 * answer sentence under it; the rest is tiles, tables and keyword lines. Apple Store pickup is the one channel we
 * measure (apple.com pickup availability, every store every 15 s); apple.com delivery, carriers and retailers are
 * described by what their official pages offer, with a link, never with a stock or delivery claim we did not measure.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cache } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { Figure } from "@/components/content/Figure";
import { RichFaq, SourceList } from "@/components/content/RichFaq";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs, LinkRow, RelatedBlock } from "@/components/seo/Related";
import { RestockFeed } from "@/components/restocks/RestockFeed";
import { Swatch } from "@/components/stores/ConfigTable";
import { Measured, Points, Stat, StatGrid, StepStrip, Swap, type Point } from "@/components/ui/Viz";
import { getFacts } from "@/lib/content/facts";
import type { Faq, Source } from "@/lib/content/types";
import { PART_INDEX, STORES, appleBuyUrl, appleFamilyUrl, appleName, catalogFor, cityLine, statePath, statesWithStores, storeByNumber, storePath, storeTimeZone, storesOf, type CatalogItem, type Store } from "@/lib/apple/catalog";
import { COUNTRIES, INTL_CODES, prefixOf } from "@/lib/apple/countries";
import { CHECK_NOTE, PLANS, SPEED } from "@/lib/plans";
import { PATTERN_MIN, PATTERN_MIN_DAYS, TRACKING_SINCE_INTL, TRACKING_SINCE_US, hourLabel, localStamp, siteFacts } from "@/lib/content/siteFacts";
import { busiestWindow, duoRestockTimes, rangeLabel, type StoreRow } from "@/lib/content/restockTimes";
import { recentByConfig } from "@/lib/stock/recent";
import { modelStock, restockFeed, storesWithStockNow } from "@/lib/stock/queries";
import { medianBand } from "@/lib/stock/sellouts";
import { alertHref, fitTitle, fmtPrice } from "@/lib/seo/enrich";

export const dynamic = "force-dynamic";

const PATH = "/where-to-buy-iphone-duo";
const SITE = "https://pickupchecker.com";
/** 55 characters; the phrase people type, then the promise the page keeps. */
const TITLE = "Where to Buy an iPhone Duo Today: Stores With Stock Now";
const APPLE_PICKUP = "https://www.apple.com/shop/shipping-pickup";
const APPLE_NEWSROOM = "https://www.apple.com/newsroom/2026/10/iphone-duo-arrives-at-apple-store-locations-worldwide/";
const MACRUMORS = "https://macrumors.com/2026/10/24/apple-store-pickup-iphone-duo-us/";
const APPLE_DUO = "https://www.apple.com/shop/buy-iphone/iphone-duo";
const FCC_UNLOCK = "https://www.fcc.gov/consumers/guides/cell-phone-unlocking-faqs";
const WIKI_SIM_LOCK = "https://en.wikipedia.org/wiki/SIM_lock";
const CARRIERS = [
  { name: "AT&T", url: "https://www.att.com/buy/phones/" },
  { name: "Verizon", url: "https://www.verizon.com/smartphones/" },
  { name: "T-Mobile", url: "https://www.t-mobile.com/cell-phones" },
];
const BEST_BUY = { name: "Best Buy", url: "https://www.bestbuy.com/" };
/** The one price sentence, verbatim, once in the body and once in a FAQ answer (the brief's wording). */
const PRICE_SENTENCE = `Alerts from $${PLANS.plus.priceUsd}/month: the stores you pick are checked every ${SPEED.fastSec} s, with a push about ${SPEED.alertSec} s after a restock is confirmed.`;

const n = (x: number) => x.toLocaleString("en-US");
/** Whole-percent shares; a share under half a percent reads "<1%", never a misleading "0%". */
const pct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : `${Math.round(x * 100)}%`);
const LONG = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
const longDate = (ymd: string) => LONG.format(new Date(`${ymd}T12:00:00Z`));
const ET = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
/** "9:31 AM" on the store's own clock. */
const clockAt = (iso: string, store: Store) => new Intl.DateTimeFormat("en-US", { timeZone: storeTimeZone(store), hour: "numeric", minute: "2-digit" }).format(new Date(iso));
const cfgName = (i: CatalogItem) => `${i.storage} ${i.color}`;
const cfgOf = (partNumber: string) => { const i = PART_INDEX.get(partNumber); return i ? cfgName(i) : partNumber; };
const stores = (k: number) => `${k} ${k === 1 ? "store" : "stores"}`;

/** One read per request, shared by the metadata and the page. */
const load = cache(async () => {
  const [stockNow, recent, f, facts, t, rows, feed, abroad] = await Promise.all([
    storesWithStockNow(undefined, "us"),
    recentByConfig({ country: "us" }),
    siteFacts(),
    getFacts(),
    duoRestockTimes("us"),
    modelStock("duo", "us"),
    restockFeed({ model: "duo", limit: 8, country: "us" }),
    Promise.all(INTL_CODES.map((cc) => storesWithStockNow(undefined, cc))),
  ]);
  return { stockNow, recent, f, facts, t, rows, feed, abroad };
});

interface StateRow { name: string; now: number; total: number; lastAt: string | null; lastStore: Store | undefined }
interface ConfigRow { item: CatalogItem; now: number; restocks: number }

function add(map: Map<string, Set<string>>, key: string, value: string) {
  const set = map.get(key) ?? new Set<string>();
  set.add(value);
  map.set(key, set);
}

/** Every number on the page, derived once from the reads; `stockUnknown` and `t.unknown` keep zeros from posing as facts. */
function derive(d: Awaited<ReturnType<typeof load>>) {
  const { stockNow, recent, f, facts, t, rows } = d;
  const items = catalogFor("duo");
  // modelStock always has a row for every store × configuration; an empty array means the read failed.
  const stockUnknown = rows.length === 0 || facts.models.duo?.unknown === true;
  const avail = rows.filter((r) => r.status === "available");
  const storesNow = stockUnknown ? stockNow.duo : new Set(avail.map((r) => r.storeNumber)).size;
  const pairsNow = avail.length;

  const totals = new Map(statesWithStores().map((s) => [s.name, s.count]));
  const byState = new Map<string, Set<string>>();
  for (const r of avail) { const s = storeByNumber(r.storeNumber); if (s) add(byState, s.state, r.storeNumber); }
  const regionLast = new Map(t.byRegion.map((r) => [r.name, r]));
  const states: StateRow[] = [...byState.entries()]
    .map(([name, set]) => ({ name, now: set.size, total: totals.get(name) ?? 0, lastAt: regionLast.get(name)?.lastAt ?? null, lastStore: regionLast.get(name)?.lastStore ? storeByNumber(regionLast.get(name)!.lastStore!) : undefined }))
    .sort((a, b) => b.now - a.now || b.total - a.total || a.name.localeCompare(b.name))
    .slice(0, 10);

  const nowByPart = new Map<string, Set<string>>();
  for (const r of avail) add(nowByPart, r.partNumber, r.storeNumber);
  const restocksByPart = new Map(t.byPart.map((p) => [p.partNumber, p.restocks]));
  const configs: ConfigRow[] = items
    .map((item) => ({ item, now: nowByPart.get(item.partNumber)?.size ?? 0, restocks: restocksByPart.get(item.partNumber) ?? 0 }))
    .sort((a, b) => b.restocks - a.restocks || b.now - a.now);
  const topCfg = configs[0] && configs[0].restocks > 0 ? configs[0] : null;
  const lastCfg = topCfg && configs.length > 1 && configs[configs.length - 1].item !== topCfg.item ? configs[configs.length - 1] : null;

  const latest = recent.latest ?? t.latest;
  const latestStore = latest ? storeByNumber(latest.storeNumber) : undefined;
  const ds = f.duoSellout;
  const medianSec = ds?.medianSec ?? t.sellout?.medianSec ?? null;
  const band = medianSec != null ? medianBand(medianSec) : null;
  const top = t.topStores[0];
  const topStore = top ? storeByNumber(top.storeNumber) : undefined;
  const topStores = t.topStores.slice(0, 5).map((r) => ({ ...r, store: storeByNumber(r.storeNumber) })).filter((r): r is StoreRow & { store: Store } => Boolean(r.store));
  const pattern = t.peakHour != null && t.n > 0;
  const bw = pattern ? busiestWindow(t.byHour) : null;
  const since = longDate(t.since);
  const tracked = Math.max(t.daily.length, t.days, 1);

  const abroad = INTL_CODES.map((cc, i) => ({ cc, now: d.abroad[i].duo, total: storesOf(cc).length })).sort((a, b) => b.now - a.now || b.total - a.total);
  const abroadNow = abroad.reduce((a, c) => a + c.now, 0);
  const intlStores = abroad.reduce((a, c) => a + c.total, 0);

  return { items, stockUnknown, storesNow, pairsNow, states, configs, topCfg, lastCfg, latest, latestStore, medianSec, band, top, topStore, topStores, pattern, bw, since, tracked, abroad, abroadNow, intlStores, recent, t, f, facts, feed: d.feed };
}
type View = ReturnType<typeof derive>;

/** ≤ 158 characters, from the live numbers; the first variant that fits wins. */
function description(v: View): string {
  if (v.stockUnknown || v.recent.unknown) {
    return fitTitle([
      `Where to buy an iPhone Duo today: Apple Store pickup at all ${STORES.length} US stores, checked every ${SPEED.checkSec} seconds, against apple.com delivery, carriers and retailers.`,
      `Where to buy an iPhone Duo today: Apple Store pickup at all ${STORES.length} US stores against apple.com delivery, carriers and retailers.`,
    ], 158);
  }
  return fitTitle([
    `${v.storesNow} of ${STORES.length} US Apple Stores list an iPhone Duo for pickup now; ${n(v.recent.restocks)} restocks in 24 h${v.band ? `, a typical one gone in ${v.band}` : ""}. Where to buy one today, by store.`,
    `${v.storesNow} of ${STORES.length} US Apple Stores list an iPhone Duo for pickup now, ${n(v.recent.restocks)} restocks in 24 h. Where to buy one today, by store.`,
    `${v.storesNow} of ${STORES.length} US Apple Stores list an iPhone Duo for pickup now. Where to buy one today, store by store.`,
  ], 158);
}

export async function generateMetadata(): Promise<Metadata> {
  const v = derive(await load());
  const d = description(v);
  return {
    title: { absolute: `${TITLE} · PickupChecker` },
    description: d,
    alternates: { canonical: PATH },
    openGraph: { type: "article", siteName: "PickupChecker", title: TITLE, description: d, url: PATH },
  };
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

/** A row of page links as chips; outside links open in a new tab. */
function ChipLinks({ items }: { items: { href: string; label: string }[] }) {
  return (
    <div className="my-3 flex flex-wrap gap-1.5">
      {items.map((l) => l.href.startsWith("http")
        ? <a key={l.href} href={l.href} target="_blank" rel="noopener" className="chip chip-sm no-underline!">{l.label}</a>
        : <Link key={l.href} href={l.href} className="chip chip-sm no-underline!">{l.label}</Link>)}
    </div>
  );
}

const Out = ({ href, children }: { href: string; children: ReactNode }) => <a href={href} target="_blank" rel="noopener">{children}</a>;

export default async function WhereToBuyPage() {
  const v = derive(await load());
  const { items, stockUnknown, storesNow, pairsNow, states, configs, topCfg, lastCfg, latest, latestStore, medianSec, band, top, topStore, topStores, bw, since, tracked, abroad, abroadNow, intlStores, recent, t, facts, feed } = v;
  const alert = alertHref({ model: "duo" });
  const asOf = `${ET.format(new Date(facts.at))} ET`;
  const latestLine = latest && latestStore
    ? `${cfgOf(latest.partNumber)} at ${appleName(latestStore)} (${cityLine(latestStore)}), ${localStamp(latest.at, latestStore)} store local time`
    : "none logged yet";
  const storeLink = (s: Store) => <Link href={storePath(s)} className="hover:underline">{appleName(s)}</Link>;
  const win = bw ? rangeLabel(bw.from, bw.to) : null;

  const sections = [
    { id: "now", nav: "In stock right now", h2: "Where is the iPhone Duo in stock right now?" },
    { id: "delivery", nav: "apple.com delivery", h2: "Can you buy an iPhone Duo on apple.com for delivery?" },
    { id: "which-store", nav: "Which Apple Store", h2: "Which Apple Store should you go to?" },
    { id: "carriers", nav: "Carriers and retailers", h2: "What about carriers and other retailers?" },
    { id: "configuration", nav: "Which configuration", h2: "Which configuration can you actually buy today?" },
    { id: "the-minute", nav: "The minute it is back", h2: "How do you buy one the minute it is back?" },
    { id: "abroad", nav: "Outside the US", h2: "Where can you buy an iPhone Duo outside the US?" },
  ];
  const h2 = (id: string) => sections.find((s) => s.id === id)!.h2;

  // ------------------------------------------------------------------------------------------- answer sentences
  const intro: ReactNode = stockUnknown || recent.unknown
    ? <>Today the surest way to buy an iPhone Duo is <b className="text-ink">Apple Store pickup</b>: PickupChecker reads pickup availability at all <b className="text-ink">{STORES.length} US Apple Stores</b> every {SPEED.checkSec} seconds, but the live count could not be read at this moment, so the restock log below is the freshest signal of where one was just available{band ? <>, and a typical restock sells out in about <b className="text-ink">{band}</b></> : null}; the answer is a specific store at a specific minute, not a city.</>
    : <>Today the surest way to buy an iPhone Duo is <b className="text-ink">Apple Store pickup</b>: <b className="text-ink">{storesNow} of the {STORES.length} US Apple Stores</b> list one right now, <b className="text-ink">{n(recent.restocks)} restocks</b> were confirmed in the last 24 hours{band ? <>, and a typical restock sells out in about <b className="text-ink">{band}</b></> : null} — so the answer is a specific store at a specific minute, not a city.</>;

  const nowLead = stockUnknown
    ? `The live count could not be read at this moment; PickupChecker reads pickup availability at all ${STORES.length} US Apple Stores every ${SPEED.checkSec} seconds, and the last confirmed restocks below are the freshest record of where an iPhone Duo was just available.`
    : storesNow > 0
      ? `${storesNow} of the ${STORES.length} US Apple Stores list at least one iPhone Duo configuration for in-store pickup right now (${n(pairsNow)} store-and-configuration listings)${states[0] ? `, led by ${states[0].name} with ${states[0].now} of its ${stores(states[0].total)}` : ""}; the last confirmed restock was ${latestLine}.`
      : `None at this moment: 0 of the ${STORES.length} US Apple Stores list an iPhone Duo for pickup as of ${asOf}, which is the normal state between restocks; ${recent.unknown ? "" : `${n(recent.restocks)} came back in the last 24 hours, and `}the last confirmed one was ${latestLine}.`;

  const storeLead = top && topStore
    ? `${appleName(topStore)} in ${cityLine(topStore)}: ${n(top.restocks)} confirmed iPhone Duo restocks on ${top.days} ${top.days === 1 ? "day" : "days"} since ${since}, the most of any US Apple Store${top.peakHour != null ? `, usually around ${hourLabel(top.peakHour)} local time` : ""}; its last was ${localStamp(top.lastAt, topStore)} store local time.`
    : t.unknown
      ? "The restock log could not be read at this moment, so the store ranking is blank until the next load; the rule still stands: go to the store the alert names, not the nearest one."
      : `No US Apple Store has a confirmed iPhone Duo restock since ${since} yet, so there is no store to rank; the first one appears here with its local time.`;

  const windowSentence = bw && win
    ? `${pct(bw.share)} of the ${n(t.n)} iPhone Duo restocks PickupChecker confirmed at US Apple Stores since ${since} landed between ${win} store local time, so the store to go to is the one that restocks most, in that window, with the pickup reservation already placed from your phone.`
    : t.unknown
      ? "The hour-by-hour pattern is on the restock-times page once the log can be read again."
      : `${n(t.n)} confirmed ${t.n === 1 ? "restock" : "restocks"} on ${t.days} ${t.days === 1 ? "day" : "days"} is too few to state a usual hour (we need ${PATTERN_MIN} across ${PATTERN_MIN_DAYS} days before we write one); the hour table fills in by itself on the restock-times page.`;

  const configLead = topCfg
    ? `${cfgName(topCfg.item)}: ${n(topCfg.restocks)} of the ${n(t.n)} confirmed US iPhone Duo restocks since ${since} (${pct(topCfg.restocks / Math.max(1, t.n))}) were that configuration${lastCfg ? `, against ${n(lastCfg.restocks)} for ${cfgName(lastCfg.item)}` : ""}, and ${stockUnknown ? "its live store count is unreadable right now" : `${stores(topCfg.now)} ${topCfg.now === 1 ? "lists" : "list"} it right now`}; Apple's list price is ${fmtPrice(topCfg.item.price)} before sales tax.`
    : t.unknown
      ? "The restock log could not be read at this moment, so the ranking is blank; the table still carries every configuration's price and apple.com order page."
      : `No configuration has a confirmed restock since ${since} yet; the table lists all ${items.length} with Apple's list price and the apple.com order page, and ranks itself as restocks are confirmed.`;

  const minuteLead = `With an alert on two or three stores and Apple's checkout staged to its last step: a confirmed restock reaches your phone about ${SPEED.alertSec} seconds after we see it, and the people who get the phone finish in about 20 seconds${band ? `, inside a listing that typically lasts ${band}` : ""}.`;

  const abroadLead = `Apple sells the iPhone Duo through its own stores and online store in the ${INTL_CODES.length} other countries PickupChecker tracks (${n(intlStores)} Apple Stores, since ${longDate(TRACKING_SINCE_INTL)}); right now ${abroadNow} of them list one for pickup${abroad[0] && abroad[0].now > 0 ? `, most in ${COUNTRIES[abroad[0].cc].name} (${abroad[0].now} of ${abroad[0].total})` : ""}.`;

  // ------------------------------------------------------------------------------------------------------ FAQ
  const faq: Faq[] = [
    { q: "Where can I buy an iPhone Duo today?", a: stockUnknown || recent.unknown
      ? `At a US Apple Store that lists one for in-store pickup: reserve the configuration on apple.com with "I'll pick it up" and collect it at that store. PickupChecker checks all ${STORES.length} US Apple Stores every ${SPEED.checkSec} seconds (the live count is unreadable at this moment and refills on the next load). apple.com delivery, the carriers and retailers such as Best Buy also sell the iPhone Duo, but we verify stock for Apple Store pickup only; the [live list](/stock/iphone-duo) is free.`
      : `At a US Apple Store that lists one for in-store pickup: ${storesNow} of ${STORES.length} do right now and ${n(recent.restocks)} restocked in the last 24 hours, so reserve the configuration on apple.com with "I'll pick it up" and collect it at that store. apple.com delivery, the carriers and retailers such as Best Buy also sell the iPhone Duo, but PickupChecker verifies stock for Apple Store pickup only; the [live list](/stock/iphone-duo) is free.` },
    { q: "Can I walk into an Apple Store and buy an iPhone Duo?", a: `Not reliably: iPhone Duo stock at Apple Stores is sold through online pickup reservations, and ${band ? `a typical listing is gone in about ${band}` : "listings are short-lived"}, so by the time you reach the counter the batch is reserved. Reserve on apple.com first; Apple then holds the phone for you at that store ([Apple: Delivery and Pickup](${APPLE_PICKUP})). [How to get an iPhone Duo](/how-to-get-an-iphone-duo) is the longer version.` },
    { q: "Is it faster to order online or wait for pickup?", a: `We can only answer the pickup half, with what we measure: ${t.n > 0 ? `${n(t.n)} confirmed iPhone Duo restocks at ${t.stores} US Apple Stores since ${since}${bw && win ? `, ${pct(bw.share)} of them between ${win} local time` : ""}${band ? `, each typically listed for about ${band}` : ""}` : `there is no confirmed restock in our log since ${since} to time yet`}. PickupChecker does not track apple.com delivery dates; Apple shows the estimate at checkout for your ZIP code, and the honest comparison is that date against how often your stores restock ([restock times](/iphone-duo-restock-times)).` },
    { q: "Which iPhone Duo is easiest to buy?", a: topCfg
      ? `${cfgName(topCfg.item)}, by the numbers: ${n(topCfg.restocks)} of the ${n(t.n)} confirmed US restocks since ${since} (${pct(topCfg.restocks / Math.max(1, t.n))})${stockUnknown ? "" : `, ${stores(topCfg.now)} listing it right now`}, ${fmtPrice(topCfg.item.price)} before sales tax.${lastCfg ? ` ${cfgName(lastCfg.item)} is the hardest, with ${n(lastCfg.restocks)}.` : ""} If you need one this week, fix the storage and accept any of its colors; [which iPhone Duo restocks most](/which-iphone-duo-restocks-most) ranks all ${items.length}.`
      : `Too early to rank: no configuration has a confirmed restock since ${since} in a readable log right now. The ranking fills in by itself on [which iPhone Duo restocks most](/which-iphone-duo-restocks-most); until then, fix the storage you need and accept any of its colors.` },
    { q: "How do I know when a store near me has one?", a: `${PRICE_SENTENCE} On iPhone, add PickupChecker to your Home Screen and allow notifications ([install guide](/install)); alerts arrive as push notifications, or by email while no device is set up. Pick the stores you can reach on [iPhone Duo near me](/iphone-duo-near-me), and the live list of every store is free without an account.` },
    { q: "Should I try Best Buy, Walmart, Target or a carrier instead of Apple?", a: `Check them when you are already there, but do not count on them: they receive their own allocations, show a yes/no on a product page and publish no restock history, so no one can rank them against Apple Store pickup ({{duo.restocks}} confirmed restocks since {{trackingSince}}, every one timed). Our stance is to watch Apple pickup with an alert, keep an apple.com delivery order as the backstop, and glance at a retailer's page in passing — the reasoning is on [Apple, Best Buy or a carrier?](/iphone-duo-apple-vs-carriers-vs-retailers).` },
    { q: "Is paying a markup on eBay worth it?", a: `Rarely. Weigh the premium against the wait it buys: US Apple Stores are restocking the Duo daily and an alert reaches you about 3 seconds after a confirmed restock, so a watched store near you usually comes through within days. Resale means no Apple return window, no manufacturer purchase record and the usual risks (activation lock, swapped box). If you do buy privately, meet in person, power it on and sign in before paying.` },
  ];

  const sources: Source[] = [
    { label: "Apple: Delivery and Pickup (how in-store pickup availability and holds work)", url: APPLE_PICKUP },
    { label: "Apple Newsroom: iPhone Duo arrives at Apple Store locations worldwide (October 23, 2026)", url: APPLE_NEWSROOM },
    { label: "MacRumors: Apple Store pickup for the iPhone Duo in the US (October 24, 2026)", url: MACRUMORS },
    { label: "FCC: Cell Phone Unlocking FAQs (the official guide to carrier locks and unlocking)", url: FCC_UNLOCK },
    { label: "Wikipedia: SIM lock (what a carrier lock is)", url: WIKI_SIM_LOCK },
  ];

  // --------------------------------------------------------------------------------------------------- JSON-LD
  const desc = description(v);
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${SITE}${PATH}`, url: `${SITE}${PATH}`, name: TITLE, description: desc, isPartOf: { "@id": `${SITE}/#website` }, about: { "@id": `${SITE}/#organization` }, dateModified: facts.at },
      {
        "@type": "Dataset", "@id": `${SITE}${PATH}#dataset`, name: "iPhone Duo in-store pickup availability at US Apple Stores, live",
        description: `Which of the ${STORES.length} US Apple Stores list each iPhone Duo configuration for in-store pickup right now, read from apple.com every ${SPEED.checkSec} seconds (every ${SPEED.fastSec} for stores with alerts), with PickupChecker's confirmed restocks since ${longDate(TRACKING_SINCE_US)} by state, store and configuration, and the stores listing one in ${INTL_CODES.length} other countries.`,
        url: `${SITE}${PATH}`, creator: { "@id": `${SITE}/#organization` }, isAccessibleForFree: true,
        temporalCoverage: `${TRACKING_SINCE_US}/..`, spatialCoverage: `Apple Stores in the United States, with the ${INTL_CODES.length} other countries PickupChecker tracks`,
        variableMeasured: ["Apple Store", "US state", "iPhone Duo storage and color", "listed for pickup now", "confirmed restocks", "last restock time (store local)"],
        measurementTechnique: `apple.com in-store pickup availability read every ${SPEED.checkSec} seconds at every store (every ${SPEED.fastSec} at stores with alerts); a restock counts only when two checks about a second apart agree; first sightings excluded`,
        ...(t.n ? { size: `${n(t.n)} confirmed restocks` } : {}),
      },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8">
      <JsonLd data={ld} />
      <Breadcrumbs items={[{ href: "/", label: "PickupChecker" }, { label: "Where to buy an iPhone Duo" }]} />
      <h1 className="display mt-3 text-3xl sm:text-5xl">Where can you buy an iPhone Duo today?</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-2">{intro}</p>
      <p className="mt-3 text-sm text-ink-3">Updated {asOf} · data since {longDate(TRACKING_SINCE_US)} · {STORES.length} Apple Stores · checked {CHECK_NOTE}</p>

      <StatGrid cols={4} className="mt-6">
        <Stat value={stockUnknown ? "–" : `${storesNow}/${STORES.length}`} label="US Apple Stores listing an iPhone Duo for pickup right now" tone={!stockUnknown && storesNow > 0 ? "accent" : "muted"} live={!stockUnknown} />
        <Stat value={recent.unknown ? "–" : n(recent.restocks)} label="confirmed restocks in the last 24 hours, all US Apple Stores" tone={recent.unknown ? "muted" : "plain"} />
        {latest && latestStore
          ? <Stat size="sm" value={clockAt(latest.at, latestStore)} label={<>latest restock · {cfgOf(latest.partNumber)} · {storeLink(latestStore)}, store local time</>} />
          : <Stat value="–" label="latest restock: none logged yet" tone="muted" />}
        <Stat value={medianSec ?? "–"} unit={medianSec != null ? "s" : undefined} label="typical restock, listed to gone (median)" tone={medianSec != null ? "warn" : "muted"} />
      </StatGrid>
      <Points className="mt-4" items={[
        { text: <><b className="text-ink">Apple Store pickup</b>: the one channel where &quot;today&quot; is realistic; reserve online, collect at the store</> },
        { text: <><b className="text-ink">apple.com delivery</b>: any configuration, the date shown at checkout for your ZIP (not tracked here)</> },
        { text: <><b className="text-ink">Carriers and retailers</b>: sell iPhones; check their page for the Duo, we read no stock there</>, step: true },
        { text: <>Walking in without a reservation: the batch is reserved before you reach the counter</>, no: true },
      ]} />
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={alert} className="btn btn-primary">Alert me when a store near me restocks</Link>
        <Link href="/iphone-duo-near-me" className="btn btn-ghost">Stores listing one near me</Link>
      </div>
      <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2 text-sm">
        {sections.map((s) => <a key={s.id} href={`#${s.id}`} className="chip px-3 py-1.5 text-xs">{s.nav}</a>)}
      </nav>
      <Figure id="phone-card-payment" eager />

      <div className="pane prose-site mt-8 p-6 sm:p-8">
        {/* ---------------------------------------------------------------- in stock right now */}
        <section id="now" className="scroll-mt-24">
          <h2>{h2("now")}</h2>
          <p><b>{nowLead}</b></p>
          <StatGrid cols={4} className="my-4">
            <Stat value={stockUnknown ? "–" : `${storesNow}/${STORES.length}`} label="stores listing one now" tone={!stockUnknown && storesNow > 0 ? "accent" : "muted"} live={!stockUnknown} />
            <Stat value={recent.unknown ? "–" : n(recent.restocks)} label="restocks confirmed in the last 24 hours" />
            {latest && latestStore
              ? <Stat size="sm" value={clockAt(latest.at, latestStore)} label={<>{storeLink(latestStore)} · latest restock, local time</>} />
              : <Stat value="–" label="latest restock: none logged yet" tone="muted" />}
            <Stat value={medianSec ?? "–"} unit={medianSec != null ? "s" : undefined} label="typical seconds a listing stays up" tone={medianSec != null ? "warn" : "muted"} />
          </StatGrid>
          {states.length > 0 ? (
            <Table caption={`The ${states.length} states with the most Apple Stores listing an iPhone Duo for pickup right now (as of ${asOf}); last confirmed restock in store local time`} head={["State", "Stores listing one now", "Last confirmed restock"]} min="30rem">
              {states.map((r) => (
                <tr key={r.name} className="border-b border-line">
                  <th scope="row" className={rowTh}><Link href={statePath(r.name)} className="hover:underline">{r.name}</Link></th>
                  <td className={td}>{r.now} of {r.total}</td>
                  <td className="py-2 pe-3 align-top">{r.lastAt && r.lastStore ? <>{localStamp(r.lastAt, r.lastStore)} · {storeLink(r.lastStore)}</> : "–"}</td>
                </tr>
              ))}
            </Table>
          ) : (
            <>
              <div className="eyebrow mt-5">{stockUnknown ? "The last confirmed restocks" : "No store lists one right now: the last confirmed restocks"}</div>
              <div className="my-3"><RestockFeed rows={feed} showModel={false} model="duo" emptyText="No confirmed iPhone Duo restock is in the log to show yet." /></div>
            </>
          )}
          <Keys items={[
            { text: <>&quot;Available&quot; at a store = <b className="text-ink">reservable for pickup now</b>{band ? <>; a typical listing lasts about <b className="text-ink">{band}</b></> : null}</> },
            { text: <>Every US Apple Store read every <b className="text-ink">{SPEED.checkSec} seconds</b>; stores with alerts every {SPEED.fastSec}</> },
            { text: <>Not a city: a listing is <b className="text-ink">one store, one configuration</b>, and the state table is a shortlist, not a stock promise</> },
            { text: <>Sort the stores by distance from you, or watch the map</>, step: true },
          ]} />
          <ChipLinks items={[
            { href: "/iphone-duo-near-me", label: "iPhone Duo near me" },
            { href: "/iphone-duo-stock-checker", label: "The stock checker, store by store" },
            { href: "/map", label: "Live map of every store" },
          ]} />
        </section>

        {/* ---------------------------------------------------------------- apple.com delivery */}
        <section id="delivery" className="scroll-mt-24">
          <h2>{h2("delivery")}</h2>
          <p><b>Yes: apple.com&apos;s iPhone Duo page lets you order any of the {items.length} configurations, unlocked, for delivery, and shows the delivery estimate at checkout for your ZIP code; PickupChecker does not track those dates, so compare the date Apple shows you with the pickup odds on this page.</b></p>
          <p>Our view: delivery is the certain route and pickup is the fast one. {t.unknown ? "Every confirmed restock in our log" : `${n(t.n)} confirmed restocks at ${t.stores} US Apple Stores since ${since}`} say the phones keep reaching stores in small batches, and a store that lists a configuration for pickup is listing it for today; once the pickup order is placed, Apple holds the phone for you at that store (<Out href={APPLE_PICKUP}>Apple: Delivery and Pickup</Out>). A delivery order, by contrast, holds your place for whatever date Apple quotes.</p>
          {!t.unknown && t.n > 0 && (
            <StatGrid cols={3} className="my-4">
              <Stat value={n(t.n)} label={<>confirmed restocks at US Apple Stores since {since}</>} tone="accent" />
              <Stat value={`${t.stores}/${STORES.length}`} label="stores with at least one confirmed restock" />
              <Stat value={t.today ? n(t.today.restocks) : `${t.days}/${tracked}`} label={t.today ? "restocks confirmed today so far (store local days)" : "tracked days with at least one restock"} />
            </StatGrid>
          )}
          <ol className="my-4 grid gap-3 sm:grid-cols-2">
            <Swap no="Watch the delivery date move on apple.com all week" yes="Place the delivery order, then set pickup alerts" why="Whichever comes first wins; read Apple's order page for how to cancel the other before you double up." />
            <Swap no="Pick a city and drive from store to store" yes="Pick two or three stores and the minute" why="A listing is one store and one configuration, reserved online in seconds; the drive comes after the reservation." />
          </ol>
          <Keys items={[
            { text: <>Delivery estimate: shown by Apple at checkout for your ZIP code; <b className="text-ink">not tracked</b> by PickupChecker</> },
            { text: <>Pickup listing: what the store can hand over <b className="text-ink">today</b>, read from the same apple.com page anyone can open</> },
            { text: <>Compare the two yourself: Apple&apos;s date against the restock counts on this page</>, step: true },
          ]} />
          <ChipLinks items={[
            ...(topCfg ? [{ href: appleBuyUrl(topCfg.item), label: `Order ${cfgName(topCfg.item)} on apple.com (most restocked)` }] : []),
            { href: APPLE_DUO, label: "iPhone Duo on apple.com, every configuration" },
            { href: "/stock/iphone-duo", label: "Live pickup stock at every US store" },
          ]} />
          <Figure id="doorstep-packages" />
        </section>

        {/* ---------------------------------------------------------------- which store */}
        <section id="which-store" className="scroll-mt-24">
          <h2>{h2("which-store")}</h2>
          <p><b>{storeLead}</b></p>
          <p>{windowSentence}</p>
          {topStores.length > 0 && (
            <Table caption={`The ${topStores.length} US Apple Stores with the most confirmed iPhone Duo restocks since ${since}; usual hour stated only from ${PATTERN_MIN} restocks on ${PATTERN_MIN_DAYS} days; last restock in store local time`} head={["Store", "Restocks", "Days", "Usual hour", "Last restock"]} min="34rem">
              {topStores.map((r) => (
                <tr key={r.storeNumber} className="border-b border-line">
                  <th scope="row" className={rowTh}>{storeLink(r.store)}<span className="font-normal text-ink-3"> · {cityLine(r.store)}</span></th>
                  <td className={td}>{n(r.restocks)}</td>
                  <td className={td}>{r.days}</td>
                  <td className={td}>{r.peakHour != null ? hourLabel(r.peakHour) : "–"}</td>
                  <td className="py-2 pe-3 align-top">{localStamp(r.lastAt, r.store)}</td>
                </tr>
              ))}
            </Table>
          )}
          <Keys items={[
            { text: <>Walking in without a reservation: iPhone Duo stock is sold as <b className="text-ink">online pickup reservations</b>, and the counter hands over what was reserved (<Link href="/how-to-get-an-iphone-duo">how to get one</Link> · <Link href="/apple-store-pickup-availability-explained">what the apple.com wording means</Link>)</>, no: true },
            { text: <>Go to the store the alert names, in its usual window, with checkout already staged</>, step: true },
            { text: <>One page per state: hour-by-hour restock times for your stores, for example <Link href="/iphone-duo-restock-times/florida">Florida</Link></> },
          ]} />
          <ChipLinks items={[
            { href: "/iphone-duo-restock-times", label: "When Apple restocks the iPhone Duo, hour by hour" },
            { href: "/iphone-duo-restock-times/florida", label: "Florida restock times (one page per state)" },
            { href: "/which-iphone-duo-restocks-most", label: "Which configuration restocks most" },
          ]} />
        </section>

        {/* ---------------------------------------------------------------- carriers and retailers */}
        <section id="carriers" className="scroll-mt-24">
          <h2>{h2("carriers")}</h2>
          <p><b>Four legitimate channels sell the iPhone Duo in the US — Apple Store pickup, apple.com delivery, the carriers&apos; stores and sites, and big-box retailers — and PickupChecker can verify stock for exactly one of them: Apple Store pickup, read from apple.com at all {STORES.length} US stores every {SPEED.checkSec} seconds.</b></p>
          <Table caption="What each channel's official page lets you do, and what PickupChecker can verify about it" head={["Channel", "What the official page lets you do", "What we can verify", "Official page"]} min="40rem">
            <tr className="border-b border-line">
              <th scope="row" className={rowTh}>Apple Store pickup</th>
              <td className="py-2 pe-3 align-top">Reserve a configuration at a store that lists it and collect it there; Apple holds a placed pickup order for you</td>
              <td className="py-2 pe-3 align-top font-medium text-ink">Yes: every US Apple Store, every {SPEED.checkSec} s; every number on this page</td>
              <td className="py-2 pe-3 align-top"><Out href={APPLE_PICKUP}>Apple: Delivery and Pickup</Out></td>
            </tr>
            <tr className="border-b border-line">
              <th scope="row" className={rowTh}>apple.com delivery</th>
              <td className="py-2 pe-3 align-top">Order any configuration, unlocked; the delivery estimate appears at checkout for your ZIP code</td>
              <td className="py-2 pe-3 align-top text-ink-3">No: we do not track delivery estimates</td>
              <td className="py-2 pe-3 align-top"><Out href={APPLE_DUO}>iPhone Duo on apple.com</Out></td>
            </tr>
            <tr className="border-b border-line">
              <th scope="row" className={rowTh}>Carrier stores and sites</th>
              <td className="py-2 pe-3 align-top">Sell iPhones, usually with the carrier&apos;s own plans and financing; check their page for the Duo</td>
              <td className="py-2 pe-3 align-top text-ink-3">No: we read no carrier stock</td>
              <td className="py-2 pe-3 align-top">{CARRIERS.map((c, i) => <span key={c.url}>{i > 0 && " · "}<Out href={c.url}>{c.name}</Out></span>)}</td>
            </tr>
            <tr className="border-b border-line">
              <th scope="row" className={rowTh}>Big-box retailers</th>
              <td className="py-2 pe-3 align-top">Sell iPhones; check their page for the Duo</td>
              <td className="py-2 pe-3 align-top text-ink-3">No: we read no retailer stock</td>
              <td className="py-2 pe-3 align-top"><Out href={BEST_BUY.url}>{BEST_BUY.name}</Out></td>
            </tr>
          </Table>
          <p>Our point of view, stated plainly: a carrier purchase may add a carrier lock or financing terms that an unlocked phone from Apple does not carry. The FCC&apos;s <Out href={FCC_UNLOCK}>Cell Phone Unlocking FAQs</Out> are the official guide to what a carrier lock is and when a carrier unlocks a phone, and <Out href={WIKI_SIM_LOCK}>SIM lock</Out> is the term for the lock itself; read them before you trade &quot;in stock today&quot; for a line you did not want.</p>
          <Keys items={[
            { text: <>Apple Store pickup: the <b className="text-ink">one channel we measure</b>; every other row is a description of the page, not of its stock</> },
            { text: <>apple.com and Apple Stores sell the Duo <b className="text-ink">unlocked</b>: every configuration page on apple.com is the unlocked one</> },
            { text: <>A carrier or retailer may well have one today; we simply cannot see it, and will not pretend to</>, step: true },
          ]} />
        </section>

        {/* ---------------------------------------------------------------- configuration */}
        <section id="configuration" className="scroll-mt-24">
          <h2>{h2("configuration")}</h2>
          <p><b>{configLead}</b></p>
          <p>Our view: if you need the phone this week, fix the storage you need and accept any of its colors; insisting on one color is how a one-week wait becomes three. The spread between the rows below is restocks, not price, and every row is the same phone.</p>
          <Table caption={`All ${items.length} iPhone Duo configurations: US Apple Stores listing each for pickup right now (as of ${asOf}), confirmed restocks since ${since}, Apple's list price before sales tax, and the apple.com order page`} head={["Configuration", "Stores now", `Restocks since ${since}`, "Price", "apple.com"]} min="36rem">
            {configs.map((r) => (
              <tr key={r.item.partNumber} className={`border-b border-line ${r.restocks === 0 && r.now === 0 ? "text-ink-3" : ""}`}>
                <th scope="row" className={rowTh}><span className="inline-flex items-center gap-2"><Swatch color={r.item.color} />{cfgName(r.item)}</span></th>
                <td className={`${td} ${r.now > 0 ? "font-semibold text-accent" : ""}`}>{stockUnknown ? "–" : r.now}</td>
                <td className={td}>{t.unknown ? "–" : n(r.restocks)}</td>
                <td className={td}>{fmtPrice(r.item.price)}</td>
                <td className="py-2 pe-3 align-top"><Out href={appleBuyUrl(r.item)}>Order</Out></td>
              </tr>
            ))}
          </Table>
          <Keys items={[
            { text: <>Prices are Apple&apos;s list prices on apple.com, <b className="text-ink">before sales tax</b>, which varies by state</> },
            { text: <>&quot;Stores now&quot; is this minute&apos;s pickup listing; <b className="text-ink">restocks</b> is the record since {since}</> },
            { text: <>Two acceptable colors = two alerts per store; <Link href="/which-iphone-duo-restocks-most">the full ranking</Link> explains the odds</>, step: true },
          ]} />
        </section>

        {/* ---------------------------------------------------------------- the minute it is back */}
        <section id="the-minute" className="scroll-mt-24">
          <h2>{h2("the-minute")}</h2>
          <p><b>{minuteLead}</b></p>
          <p>{PRICE_SENTENCE}</p>
          <StepStrip className="my-4 lg:grid-cols-4!" steps={[
            { title: "Pick the store and the configuration", hint: "two or three stores you can reach; one alert is one store × one exact configuration" },
            { title: "Turn on alerts in the Home Screen app", hint: <>on iPhone, add PickupChecker to your Home Screen and allow notifications (<Link href="/install">step by step</Link>)</> },
            { title: "Stage Apple's checkout to the last step", hint: "signed in, Apple Pay or a saved card, the configuration's buy page open with pickup chosen" },
            { title: "Tap the alert and finish in about 20 seconds", hint: "choose the store it names, confirm pickup, pay; the reservation is the order" },
          ]} />
          <Keys items={[
            { text: <>Push about <b className="text-ink">{SPEED.alertSec} s</b> after two checks agree; your stores asked every <b className="text-ink">{SPEED.fastSec} s</b>, every other store every {SPEED.checkSec}</> },
            { text: <>Typing an address during a restock is how people lose it</>, no: true },
            { text: <>Browsing is free; alerts are {PLANS.plus.name} ${PLANS.plus.priceUsd} ({PLANS.plus.limit} alerts), {PLANS.pro.name} ${PLANS.pro.priceUsd} ({PLANS.pro.limit}) or {PLANS.max.name} ${PLANS.max.priceUsd} ({PLANS.max.limit}) a month</>, step: true },
          ]} />
          <ChipLinks items={[
            { href: "/iphone-duo-stock-alerts", label: "How the alerts work" },
            { href: "/how-to-grab-an-iphone-duo-restock", label: "Tap by tap: the 20-second checkout" },
            { href: "/install", label: "Install the Home Screen app" },
          ]} />
          <p><Link href={alert} className="btn btn-primary">Set up an iPhone Duo alert</Link></p>
          <Figure id="apple-store-pickup-counter" />
        </section>

        {/* ---------------------------------------------------------------- outside the US */}
        <section id="abroad" className="scroll-mt-24">
          <h2>{h2("abroad")}</h2>
          <p><b>{abroadLead}</b></p>
          <Table caption={`Apple Stores listing an iPhone Duo for pickup right now in the ${INTL_CODES.length} other countries PickupChecker tracks (as of ${asOf}), most first; each country's apple.com store sells it online as well`} head={["Country", "Stores listing one now", "Stores tracked", "apple.com"]} min="30rem">
            {abroad.map((c) => (
              <tr key={c.cc} className={`border-b border-line ${c.now === 0 ? "text-ink-3" : ""}`}>
                <th scope="row" className={rowTh}><Link href={`${prefixOf(c.cc)}/stock/iphone-duo`} className="hover:underline">{COUNTRIES[c.cc].name}</Link></th>
                <td className={`${td} ${c.now > 0 ? "font-semibold text-accent" : ""}`}>{c.now}</td>
                <td className={td}>{c.total}</td>
                <td className="py-2 pe-3 align-top"><Out href={appleFamilyUrl("duo", c.cc)}>iPhone Duo, {COUNTRIES[c.cc].short}</Out></td>
              </tr>
            ))}
          </Table>
          <Keys items={[
            { text: <>Each country&apos;s page: the same live list, that country&apos;s stores, prices in its currency</> },
            { text: <>Tracked since <b className="text-ink">{longDate(TRACKING_SINCE_INTL)}</b>, the same {SPEED.checkSec}-second checks and {SPEED.fastSec}-second alerts</> },
            { text: <>Apple&apos;s country store sells the Duo online too; delivery estimates there are not tracked either</>, step: true },
          ]} />
          <Measured title="How to read these numbers">
            A store counts as listing an iPhone Duo when apple.com shows at least one of its configurations available for in-store pickup there at our last check, every {SPEED.checkSec} seconds at every store and every {SPEED.fastSec} at stores with alerts. A restock is confirmed only when two checks about a second apart agree, and a store&apos;s first sighting after launch is never counted. Carrier and retailer pages are described, not read: PickupChecker has no data on their stock and says so.
          </Measured>
          <p className="text-sm text-ink-3">You are welcome to quote these numbers with a link to this page; PickupChecker is independent and not affiliated with Apple, and reads the same pickup availability anyone can see on apple.com, just far more often.</p>
        </section>
      </div>

      <RelatedBlock>
        <LinkRow title="The iPhone Duo questions, answered from the same data" links={[
          { href: "/iphone-duo-restock-times", label: "When does Apple restock the iPhone Duo?" },
          { href: "/iphone-duo-sell-out-times", label: "How fast does it sell out?" },
          { href: "/iphone-duo-stock-alerts", label: "iPhone Duo stock alerts" },
          { href: "/iphone-duo-near-me", label: "iPhone Duo near me" },
          { href: "/how-to-get-an-iphone-duo", label: "How to get an iPhone Duo" },
          { href: "/how-to-grab-an-iphone-duo-restock", label: "How to grab a restock in 20 seconds" },
          { href: "/which-iphone-duo-restocks-most", label: "Which iPhone Duo restocks most?" },
          { href: "/apple-store-pickup-availability-explained", label: "Apple Store pickup availability, explained" },
        ]} />
        <LinkRow title="Live pages" links={[
          { href: "/stock/iphone-duo", label: "iPhone Duo stock at every US store" },
          { href: "/restocks", label: "The restock log" },
          { href: "/map", label: "Live map" },
          { href: "/stores", label: "All 269 US Apple Stores" },
        ]} />
        <LinkRow title="Other ways people ask" links={[
          { href: "/iphone-duo-back-in-stock", label: "Is the iPhone Duo back in stock?" },
          { href: "/iphone-duo-stock-checker", label: "iPhone Duo stock checker" },
        ]} />
      </RelatedBlock>

      <div className="mt-10"><RichFaq items={faq} facts={facts} title="Questions" /></div>
      <div className="mt-8"><SourceList sources={sources} facts={facts} where={`all ${STORES.length} US Apple Stores (and the stores of ${INTL_CODES.length} other countries since ${longDate(TRACKING_SINCE_INTL)})`} since={longDate(TRACKING_SINCE_US)} /></div>
    </div>
  );
}
