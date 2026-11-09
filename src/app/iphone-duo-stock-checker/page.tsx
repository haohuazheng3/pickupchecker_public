/**
 * /iphone-duo-stock-checker: "iPhone Duo stock checker", the words Google and Gemini use for this kind of site. The
 * page is the checker: a server-rendered table of every US state with the Apple Stores listing an iPhone Duo for
 * pickup right now, then how to check on apple.com yourself, how our checks work, what we know about each store,
 * which configurations turn up, the observed restock pattern (never a schedule), the 18 other countries, and alerts.
 * Every H2 is a question with one quotable answer sentence under it; every number is live and PickupChecker's own,
 * and a read that fails says so instead of showing zeros as facts.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cache } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { Breadcrumbs, LinkRow, RelatedBlock } from "@/components/seo/Related";
import { Figure } from "@/components/content/Figure";
import { RichFaq, SourceList } from "@/components/content/RichFaq";
import { JsonLd } from "@/components/seo/JsonLd";
import { LiveChecked } from "@/components/site/LiveChecked";
import { Swatch } from "@/components/stores/ConfigTable";
import { Measured, Points, Stat, StatGrid, StepStrip, Swap, type Point } from "@/components/ui/Viz";
import { getFacts, tokenValue } from "@/lib/content/facts";
import type { Faq, Source } from "@/lib/content/types";
import { ALL_STORES, STORES, appleBuyUrl, appleName, catalogFor, cityLine, statePath, statesWithStores, storeByNumber, storePath, storesOf, type Store } from "@/lib/apple/catalog";
import { COUNTRIES, INTL_CODES, prefixOf } from "@/lib/apple/countries";
import { CHECK_NOTE, OTHER_TRACKERS, PLANS, SPEED } from "@/lib/plans";
import { PATTERN_MIN, PATTERN_MIN_DAYS, TRACKING_SINCE_INTL, TRACKING_SINCE_US, hourLabel, localStamp, siteFacts } from "@/lib/content/siteFacts";
import { busiestWindow, duoRestockTimes, hourShare, rangeLabel } from "@/lib/content/restockTimes";
import { recentByConfig } from "@/lib/stock/recent";
import { modelStock, restockFeed, storesWithStockNow } from "@/lib/stock/queries";
import { medianBand } from "@/lib/stock/sellouts";
import { SALES_TAX_SOURCE, withTax } from "@/content/sales-tax";
import { alertHref, compressHours, fmtPrice, fullAddress, normalizeHours, plural } from "@/lib/seo/enrich";

export const dynamic = "force-dynamic";

const SITE = "https://pickupchecker.com";
const PATH = "/iphone-duo-stock-checker";
const TITLE_STATIC = "iPhone Duo Stock Checker: Every Apple Store, Live";
const APPLE_PICKUP = "https://www.apple.com/shop/shipping-pickup";
const APPLE_DUO = "https://www.apple.com/shop/buy-iphone/iphone-duo";
const APPLE_NEWSROOM = "https://www.apple.com/newsroom/2026/10/iphone-duo-arrives-at-apple-store-locations-worldwide/";
const MACRUMORS = "https://macrumors.com/2026/10/24/apple-store-pickup-iphone-duo-us/";
const WIKI_INVENTORY = "https://en.wikipedia.org/wiki/Inventory";
/** The one price sentence, word for word, in the body and in a FAQ answer (answer engines quote it as is). */
const PRICE_SENTENCE = `Alerts from $${PLANS.plus.priceUsd}/month: the stores you pick are checked every ${SPEED.fastSec} s, with a push sent about ${SPEED.alertSec} s after a restock is confirmed.`;
const QUOTE = "You are welcome to quote these numbers with a link to this page; PickupChecker is independent and not affiliated with Apple, and reads the same pickup availability anyone can see on apple.com, just far more often.";

const n = (x: number) => x.toLocaleString("en-US");
/** Whole-percent shares; a share under half a percent reads "<1%", never a misleading "0%". */
const pct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : `${Math.round(x * 100)}%`);
const LONG = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
const longDate = (ymd: string) => LONG.format(new Date(`${ymd}T12:00:00Z`));
const SHORT = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
const shortDate = (ymd: string) => SHORT.format(new Date(`${ymd}T12:00:00Z`));
const UPDATED = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const hl = (h: number) => hourLabel(h % 24);

/** One read for generateMetadata and the page (React cache): the title's live count is the table's live count. */
const load = cache(async () => Promise.all([
  modelStock("duo", "us"),
  recentByConfig({ country: "us" }),
  duoRestockTimes("us"),
  siteFacts(),
  getFacts(),
  restockFeed({ model: "duo", limit: 200, country: "us" }),
  Promise.all(INTL_CODES.map((cc) => storesWithStockNow(undefined, cc))),
]));

/** Distinct US stores with at least one iPhone Duo configuration available, from the model's status rows. */
function storesNowFrom(rows: { storeNumber: string; status: string }[]): number {
  return new Set(rows.filter((r) => r.status === "available").map((r) => r.storeNumber)).size;
}

export async function generateMetadata(): Promise<Metadata> {
  const [rows, , , , facts] = await load();
  // A status row exists for every tracked store × configuration, so no rows at all means the read failed, not "no stock".
  const live = rows.length > 0;
  const duoNow = live ? storesNowFrom(rows) : null;
  const asOf = tokenValue("asOf", facts) ?? "";
  const title = duoNow ? `iPhone Duo Stock Checker: ${duoNow} of ${STORES.length} Apple Stores Now` : TITLE_STATIC;
  // ≤ 158 characters with the largest possible count and the longest "asOf" ("Nov 25, 12:45 PM ET"): 157.
  const description = duoNow != null
    ? `${duoNow} of ${STORES.length} US Apple Stores list the iPhone Duo for pickup now (${asOf}), by state and configuration, plus ${INTL_CODES.length} other countries; checked every ${SPEED.checkSec} s.`
    : `Which of the ${STORES.length} US Apple Stores list the iPhone Duo for pickup right now, by state and configuration, plus ${INTL_CODES.length} other countries. Checked every ${SPEED.checkSec} s.`;
  return {
    title: { absolute: `${title} · PickupChecker` },
    description,
    alternates: { canonical: PATH },
    openGraph: { type: "article", siteName: "PickupChecker", title, description, url: PATH },
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

/** A row of page links as chips. */
function ChipLinks({ items }: { items: { href: string; label: string }[] }) {
  return <div className="my-3 flex flex-wrap gap-1.5">{items.map((l) => <Link key={l.href} href={l.href} className="chip chip-sm no-underline!">{l.label}</Link>)}</div>;
}

/** "Reads → means": a two-column legend. */
function KeyTable({ head, rows }: { head: [string, string]; rows: [ReactNode, ReactNode][] }) {
  return (
    <div className="my-4 overflow-x-auto">
      <table className="w-full min-w-[20rem] text-sm">
        <thead><tr className="text-start text-xs uppercase tracking-wide text-ink-3"><th className="pb-2 pe-3 font-semibold">{head[0]}</th><th className="pb-2 font-semibold">{head[1]}</th></tr></thead>
        <tbody>
          {rows.map(([a, b], i) => (
            <tr key={i} className="border-t border-line align-top">
              <td className="whitespace-nowrap py-2 pe-3 font-semibold text-ink">{a}</td>
              <td className="py-2 text-ink-2">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface StateRow { name: string; path: string; stores: number; withStock: number; configs: number; restocks: number | null; lastAt: string | null; lastStore: Store | null }

export default async function StockCheckerPage() {
  const [rows, recent, t, f, facts, feed, intlNow] = await load();
  const live = rows.length > 0;
  const available = rows.filter((r) => r.status === "available");
  const duoNow = storesNowFrom(rows);
  const asOf = tokenValue("asOf", facts) ?? "";
  const updated = `${UPDATED.format(new Date(facts.at))} ET`;
  const intlStores = ALL_STORES.length - STORES.length;
  const items = catalogFor("duo");
  const cfg = (p: string) => { const i = items.find((x) => x.partNumber === p); return i ? `${i.storage} ${i.color}` : p; };
  const since = longDate(t.since);
  const sell = t.sellout;
  const band = sell ? medianBand(sell.medianSec) : null;
  const alert = alertHref({ model: "duo" });
  /** The newest check among the model's status rows: the figure LiveChecked keeps true while the page is open. */
  const lastChecked = rows.reduce<string | null>((a, r) => (r.lastCheckedAt && (!a || r.lastCheckedAt > a) ? r.lastCheckedAt : a), null);
  const stampAt = (iso: string, store: Store) => `${localStamp(iso, store)} local time`;

  // ---- the checker: every US state, stores listing a Duo now, configurations, restocks and the last one
  const byState = new Map<string, { stores: Set<string>; parts: Set<string> }>();
  for (const r of available) {
    const s = storeByNumber(r.storeNumber);
    if (!s) continue;
    const a = byState.get(s.state) ?? { stores: new Set<string>(), parts: new Set<string>() };
    a.stores.add(r.storeNumber); a.parts.add(r.partNumber); byState.set(s.state, a);
  }
  const region = new Map(t.byRegion.map((r) => [r.name, r]));
  // The last restock per state: the 5-minute restock-times read, overlaid with the live feed where it is newer.
  const last = new Map<string, { at: string; store: Store }>();
  for (const r of t.byRegion) { const s = r.lastStore ? storeByNumber(r.lastStore) : undefined; if (r.lastAt && s) last.set(r.name, { at: r.lastAt, store: s }); }
  for (const r of feed) { const cur = last.get(r.store.state); const at = r.at.toISOString(); if (!cur || at > cur.at) last.set(r.store.state, { at, store: r.store }); }
  const states: StateRow[] = statesWithStores().map((st) => ({
    name: st.name, path: statePath(st.name), stores: st.count,
    withStock: byState.get(st.name)?.stores.size ?? 0, configs: byState.get(st.name)?.parts.size ?? 0,
    restocks: t.unknown ? null : region.get(st.name)?.restocks ?? 0,
    lastAt: last.get(st.name)?.at ?? null, lastStore: last.get(st.name)?.store ?? null,
  })).sort((a, b) => (b.withStock > 0 ? 1 : 0) - (a.withStock > 0 ? 1 : 0) || b.withStock - a.withStock || a.name.localeCompare(b.name));
  const statesHit = states.filter((s) => s.withStock > 0);
  const topState = statesHit[0];
  const latest = recent.latest ? { ...recent.latest, store: storeByNumber(recent.latest.storeNumber) } : null;

  // ---- configurations: stores listing each one now, restocks in 24 h and since tracking began
  const nowByPart = new Map<string, number>();
  for (const r of available) nowByPart.set(r.partNumber, (nowByPart.get(r.partNumber) ?? 0) + 1);
  const sincePart = new Map(t.byPart.map((p) => [p.partNumber, p]));
  const dayPart = new Map(recent.byPart.map((p) => [p.partNumber, p]));
  const configs = [...items].sort((a, b) => (sincePart.get(b.partNumber)?.restocks ?? 0) - (sincePart.get(a.partNumber)?.restocks ?? 0) || (nowByPart.get(b.partNumber) ?? 0) - (nowByPart.get(a.partNumber) ?? 0));
  const topCfg = !t.unknown && t.n > 0 ? configs.find((i) => (sincePart.get(i.partNumber)?.restocks ?? 0) > 0) : undefined;
  const topCfgN = topCfg ? sincePart.get(topCfg.partNumber)!.restocks : 0;
  const mostNow = live ? [...configs].sort((a, b) => (nowByPart.get(b.partNumber) ?? 0) - (nowByPart.get(a.partNumber) ?? 0))[0] : undefined;
  const mostNowN = mostNow ? nowByPart.get(mostNow.partNumber) ?? 0 : 0;

  // ---- one real store: the US store with the most confirmed Duo restocks since tracking began
  const topRow = t.topStores[0];
  const topStore = topRow ? storeByNumber(topRow.storeNumber) : undefined;
  const topPattern = topStore ? f.patterns[topStore.storeNumber] : undefined;
  const topNow = topStore ? available.filter((r) => r.storeNumber === topStore.storeNumber).length : 0;
  const cheapest = Math.min(...items.map((i) => i.price));
  const topTax = topStore ? withTax(cheapest, topStore.state) : null;
  const topHours = topStore?.hours ? compressHours(normalizeHours(topStore.hours)) : null;

  // ---- the observed pattern
  const pattern = !t.unknown && t.peakHour != null;
  const w = busiestWindow(t.byHour);

  // ---- the 18 other countries
  const countries = INTL_CODES.map((cc, i) => ({ cc, now: intlNow[i].duo, stores: storesOf(cc).length })).sort((a, b) => (b.now > 0 ? 1 : 0) - (a.now > 0 ? 1 : 0));
  const intlDuoNow = countries.reduce((a, c) => a + c.now, 0);
  const intlHit = countries.filter((c) => c.now > 0);

  const sections = [
    { id: "states", nav: "Stores with one now", h2: "Which Apple Stores have the iPhone Duo in stock right now?" },
    { id: "apple", nav: "Check on apple.com", h2: "How do you check iPhone Duo stock at an Apple Store yourself?" },
    { id: "how", nav: "How it works", h2: "How does this stock checker work?" },
    { id: "store", nav: "Per store", h2: "What does the checker know about each store?" },
    { id: "configs", nav: "By configuration", h2: "Which configurations does the checker find in stock most?" },
    { id: "when", nav: "Restock times", h2: "Can the checker tell you when a store will restock?" },
    { id: "countries", nav: "Other countries", h2: "Does the checker work outside the US?" },
    { id: "alerts", nav: "Alerts", h2: "How do you get alerted instead of checking?" },
  ];
  const h2Of = (id: string) => sections.find((s) => s.id === id)!.h2;

  const faq: Faq[] = [
    { q: "Is there an iPhone Duo stock checker?", a: `Yes, this page: PickupChecker checks all ${STORES.length} US Apple Stores for iPhone Duo pickup stock every ${SPEED.checkSec} seconds (and ${intlStores} stores in ${INTL_CODES.length} other countries), lists the states and stores with one right now, and logs every confirmed restock${t.unknown ? "" : ` (${n(t.n)} in the US since ${since})`}. Browsing is free; [alerts](/iphone-duo-stock-alerts) send a push within seconds of a confirmed restock (when it shows on your phone depends on the phone and its connection).` },
    { q: "How often is Apple Store stock checked?", a: `Every ${SPEED.checkSec} seconds for every US Apple Store and every ${SPEED.fastSec} seconds for the stores a paid alert points at, with the measured intervals published on the [service report](/service-report) (other trackers state ${OTHER_TRACKERS}; [compared](/iphone-stock-tracker-comparison)). A first "available" is asked again about a second later and counts only when both answers agree; a failed request never counts as "out of stock".` },
    { q: "Why does apple.com say \"currently unavailable for pickup\" everywhere?", a: sell && band
      ? `Because you are looking between restocks: a typical iPhone Duo listing lasts about ${band} (median ${sell.medianSec} seconds over ${n(sell.n)} timed sell-outs since ${since}), so the page you reload is almost always between two of them. [What the wording means](/apple-store-pickup-availability-explained); the state table above shows where it reads "available" right now.`
      : `Because you are looking between restocks: an iPhone Duo listing lasts seconds to a few minutes and reads "currently unavailable" for the rest of the day, so the page you reload is almost always between two of them. [What the wording means](/apple-store-pickup-availability-explained); the state table above shows where it reads "available" right now.` },
    { q: "Which Apple Store has the iPhone Duo in stock near me?", a: `The state table on this page names every state with a store listing one right now, and [iPhone Duo near me](/iphone-duo-near-me) ranks all ${STORES.length} US Apple Stores by distance from your location or ZIP with each one's live stock. Every [state page](/stores) and store page carries the same live table, checked every ${SPEED.checkSec} seconds.` },
    { q: "Is the stock checker free?", a: `Browsing is free: live stock, the state table, every store page, the [map](/map) and the [restock log](/restocks). ${PRICE_SENTENCE} ${PLANS.plus.name} covers ${PLANS.plus.limit} alerts, ${PLANS.pro.name} ${PLANS.pro.limit} ($${PLANS.pro.priceUsd}) and ${PLANS.max.name} ${PLANS.max.limit} ($${PLANS.max.priceUsd}); one alert is one store × one exact configuration ([pricing](/pricing)).` },
  ];

  const sources: Source[] = [
    { label: "Apple: Delivery and Pickup (how in-store pickup availability and holds work)", url: APPLE_PICKUP },
    { label: "Apple: Buy iPhone Duo (the pickup availability the checker reads)", url: APPLE_DUO },
    { label: "Apple Newsroom: iPhone Duo arrives at Apple Store locations worldwide (October 23, 2026)", url: APPLE_NEWSROOM },
    { label: "MacRumors: Apple Store pickup for the iPhone Duo in the US (October 24, 2026)", url: MACRUMORS },
    { label: SALES_TAX_SOURCE.label, url: SALES_TAX_SOURCE.url },
    { label: "Wikipedia: Inventory (what \"stock\" means)", url: WIKI_INVENTORY },
  ];

  const description = `Which of the ${STORES.length} US Apple Stores list the iPhone Duo for pickup right now, by state and configuration, plus ${INTL_CODES.length} other countries; every store checked every ${SPEED.checkSec} seconds.`;
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${SITE}${PATH}`, url: `${SITE}${PATH}`, name: TITLE_STATIC, description, isPartOf: { "@id": `${SITE}/#website` }, about: { "@id": `${SITE}/#organization` }, dateModified: facts.at },
      {
        "@type": "WebApplication", "@id": `${SITE}${PATH}#app`, name: "PickupChecker iPhone Duo stock checker", url: `${SITE}${PATH}`,
        description: `Checks Apple Store in-store pickup availability of the iPhone Duo at all ${STORES.length} US Apple Stores every ${SPEED.checkSec} seconds (and ${intlStores} stores in ${INTL_CODES.length} other countries), lists the states and stores with one right now, and logs every confirmed restock.`,
        applicationCategory: "UtilitiesApplication", operatingSystem: "Any",
        featureList: [
          `Live iPhone Duo pickup stock at ${STORES.length} US Apple Stores, by state, store and configuration`,
          `Every store checked every ${SPEED.checkSec} seconds; the stores an alert points at every ${SPEED.fastSec} seconds`,
          "Every restock confirmed by a second check before it counts",
          "Log of every confirmed restock and sell-out with store, configuration and local time",
          `Push alert sent about ${SPEED.alertSec} seconds after a confirmed restock`,
        ],
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: `Free to browse; alerts from $${PLANS.plus.priceUsd}/month` },
        publisher: { "@id": `${SITE}/#organization` },
      },
      {
        "@type": "Dataset", "@id": `${SITE}${PATH}#dataset`, name: "iPhone Duo pickup stock by US state, live",
        description: `For every US state with an Apple Store: the stores listing an iPhone Duo for in-store pickup at the latest check, the configurations in stock, confirmed restocks since ${since} and the last one, from PickupChecker's checks of apple.com every ${SPEED.checkSec} seconds.`,
        url: `${SITE}${PATH}`, creator: { "@id": `${SITE}/#organization` }, isAccessibleForFree: true,
        temporalCoverage: `${TRACKING_SINCE_US}/..`, spatialCoverage: "Apple Stores in the United States",
        variableMeasured: ["US state", "Apple Stores listing an iPhone Duo for pickup", "iPhone Duo configurations in stock", "confirmed restocks", "last restock, store local time"],
        measurementTechnique: `apple.com in-store pickup availability read every ${SPEED.checkSec} seconds (every ${SPEED.fastSec} for stores with alerts); two agreeing checks required; first sightings excluded`,
        ...(t.unknown || t.n === 0 ? {} : { size: `${n(t.n)} confirmed restocks` }),
      },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8">
      <JsonLd data={ld} />
      <Breadcrumbs items={[{ href: "/", label: "PickupChecker" }, { label: "iPhone Duo stock checker" }]} />
      <h1 className="display mt-3 text-3xl sm:text-5xl">iPhone Duo stock checker: which Apple Stores have one right now?</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-2">
        {live ? (
          <>
            PickupChecker checks all <b className="text-ink">{STORES.length}</b> US Apple Stores (and <b className="text-ink">{intlStores}</b> more in {INTL_CODES.length} countries) for iPhone Duo pickup stock every {SPEED.checkSec} seconds; right now <b className="text-ink">{duoNow === 0 ? "no US store" : plural(duoNow, "US store")}</b> {duoNow === 1 || duoNow === 0 ? "lists" : "list"} one, the last check was <LiveChecked iso={lastChecked} model="duo" className="font-semibold text-ink" />{recent.unknown ? "." : <>, and <b className="text-ink">{plural(recent.restocks, "restock")}</b> {recent.restocks === 1 ? "was" : "were"} confirmed in the last 24 hours.</>}
          </>
        ) : (
          <>
            PickupChecker checks all <b className="text-ink">{STORES.length}</b> US Apple Stores (and <b className="text-ink">{intlStores}</b> more in {INTL_CODES.length} countries) for iPhone Duo pickup stock every {SPEED.checkSec} seconds; live stock could not be read at this moment, so the table below shows each state&apos;s stores and confirmed restocks while the live columns refill on the next load.
          </>
        )}
      </p>
      <p className="mt-2 text-sm text-ink-3">Updated {updated} · data since {longDate(TRACKING_SINCE_US)} · {n(ALL_STORES.length)} Apple Stores · checked {CHECK_NOTE}</p>

      <StatGrid cols={4} className="mt-6">
        <Stat value={live ? duoNow : "–"} label={`of ${STORES.length} US Apple Stores list an iPhone Duo for pickup now`} tone={duoNow > 0 ? "accent" : "plain"} live={live} />
        <Stat value={recent.unknown ? "–" : recent.restocks} label={recent.unknown ? "restocks in the last 24 hours: not readable at this moment" : `restocks confirmed in the last 24 hours, at ${plural(recent.stores, "store")}`} tone={recent.restocks > 0 ? "plain" : "muted"} />
        <Stat value={t.unknown ? "–" : n(t.n)} label={`confirmed US iPhone Duo restocks since ${since}`} />
        {sell
          ? <Stat value={sell.medianSec} unit="s" label={`typical listing before it sold out (median of ${n(sell.n)})`} tone="warn" />
          : <Stat value={`${SPEED.checkSec}`} unit="s" label="between checks of every US Apple Store" tone="accent" />}
      </StatGrid>
      <Points className="mt-4" items={[
        { text: <>All {STORES.length} US stores every <b className="text-ink">{SPEED.checkSec} s</b>; the stores an alert points at every <b className="text-ink">{SPEED.fastSec} s</b></> },
        { text: <>Two agreeing answers from apple.com before a restock counts; a failed request never counts as sold out</> },
        { text: <>Times in each store&apos;s local zone; independent, not affiliated with Apple</> },
        { text: <>Alerts send the push about <b className="text-ink">{SPEED.alertSec} s</b> after a confirmed restock; arrival on your phone is not measured</>, step: true },
      ]} />
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={alert} className="btn btn-primary">Alert me when a store restocks</Link>
        <Link href="/iphone-duo-near-me" className="btn btn-ghost">Nearest stores with one now</Link>
      </div>
      <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2 text-sm">
        {sections.map((s) => <a key={s.id} href={`#${s.id}`} className="chip px-3 py-1.5 text-xs">{s.nav}</a>)}
      </nav>
      <Figure id="apple-store-entrance-busy" eager />

      <div className="pane prose-site mt-8 p-6 sm:p-8">
        {/* ---------------------------------------------------------------- the checker */}
        <section id="states" className="scroll-mt-24">
          <h2>{h2Of("states")}</h2>
          <p><b>{!live
            ? `Live stock could not be read at this moment; the table below still lists every US state with its Apple Stores, its confirmed iPhone Duo restocks since ${since} and the last one, and each state page carries its own live table.`
            : duoNow > 0 && topState
              ? `Right now ${duoNow} of the ${STORES.length} US Apple Stores list an iPhone Duo for pickup (as of ${asOf}), across ${plural(statesHit.length, "state")}; ${topState.name} has the most (${topState.withStock} of its ${plural(topState.stores, "store")}), and every state with an Apple Store is in the table below, states with stock first.`
              : `None at the last check (${asOf}): no US Apple Store lists an iPhone Duo for pickup at this moment, which is the normal state between restocks; ${latest && latest.store ? `the latest confirmed restock was a ${cfg(latest.partNumber)} at ${appleName(latest.store)}, ${stampAt(latest.at, latest.store)}` : "no restock has been confirmed in the last 24 hours either"}, and the table below keeps every state's restock count and last restock.`}</b></p>
          <Table caption={`Every US state with an Apple Store: stores listing an iPhone Duo for pickup at the latest check${live ? ` (${asOf})` : ""}, configurations in stock, confirmed restocks since ${since} and the last one, store local time`} head={["State", "Stores listing a Duo now", "Configurations in stock", `Restocks since ${shortDate(t.since)}`, "Last restock in the state"]} min="40rem">
            {states.map((s) => (
              <tr key={s.name} className={`border-b border-line ${s.withStock > 0 ? "bg-accent/[0.06]" : ""}`}>
                <th scope="row" className={rowTh}><Link href={s.path} className="hover:underline">{s.name}</Link></th>
                <td className={`${td} ${s.withStock > 0 ? "font-semibold text-accent" : ""}`}>{live ? `${s.withStock} of ${s.stores}` : "–"}</td>
                <td className={td}>{live ? (s.configs > 0 ? `${s.configs} of ${items.length}` : "–") : "–"}</td>
                <td className={td}>{s.restocks == null ? "–" : n(s.restocks)}</td>
                <td className="py-2 pe-3 align-top">{s.lastAt && s.lastStore ? <>{localStamp(s.lastAt, s.lastStore)} · <Link href={storePath(s.lastStore)} className="hover:underline">{appleName(s.lastStore)}</Link></> : "–"}</td>
              </tr>
            ))}
          </Table>
          <Keys items={[
            { text: <>A shaded row: at least one store in the state listed a Duo at the latest check</> },
            { text: <><b className="text-ink">Configurations in stock</b> counts distinct storage × color pairs listed anywhere in the state, of {items.length}</> },
            { text: <>A one-store state links straight to that store&apos;s page</> },
            { text: <>In Apple Stores since <a href={APPLE_NEWSROOM} target="_blank" rel="noopener">October 23, 2026</a>; bought out faster than it arrives, so an empty column is the normal reading</>, no: true },
          ]} />
          <ChipLinks items={[
            { href: "/iphone-duo-near-me", label: "Nearest stores with one now" },
            { href: "/map", label: `Live map of all ${STORES.length} stores` },
            { href: "/stock/iphone-duo", label: "Every store, every configuration" },
            { href: "/stores", label: "Apple Stores by state" },
          ]} />
          <Measured title="How a store gets into this table">
            A store is listed with stock only after two consecutive checks of apple.com both answered &quot;available&quot; for the same configuration, and it drops out only after the next round confirms the disappearance. The first time a configuration was ever seen at a store is excluded from the restock counts, so launch-day listings before {longDate(TRACKING_SINCE_US)} are not counted as restocks. A read that fails shows a dash, never a zero.
          </Measured>
        </section>

        {/* ---------------------------------------------------------------- apple.com */}
        <section id="apple" className="scroll-mt-24">
          <h2>{h2Of("apple")}</h2>
          <p><b>On apple.com: open the <a href={APPLE_DUO} target="_blank" rel="noopener">iPhone Duo buy page</a>, choose storage and color, pick &quot;Pick up&quot; and enter a ZIP code, and Apple lists the nearby stores as &quot;Available Today&quot; or &quot;Currently unavailable for pickup&quot; for that one configuration at that one moment (<a href={APPLE_PICKUP} target="_blank" rel="noopener">Apple: Delivery and Pickup</a>).</b></p>
          <StepStrip className="my-4 lg:grid-cols-3!" steps={[
            { title: "Choose the configuration", hint: "storage and color, unlocked; the price shows before tax" },
            { title: "Pick up → enter a ZIP", hint: "Apple lists the stores within reach of that ZIP, usually up to a dozen" },
            { title: "Read each store's line", hint: "\"Available Today\" can be reserved now; \"Currently unavailable for pickup\" means not at this moment" },
          ]} />
          <Keys items={[
            { text: <>One ZIP and one configuration at a time: {items.length} configurations × a second ZIP is {items.length * 2} reloads</>, no: true },
            { text: <>No history: the page never says when that store last had one or how long it stayed</>, no: true },
            { text: <>No notification: a Duo listing lasts about <b className="text-ink">{band ?? "a minute"}</b>{sell ? ` (median ${sell.medianSec} s over ${n(sell.n)} timed sell-outs)` : ""}, usually gone between two reloads</>, no: true },
            { text: <>Pickup opened in US stores on October 24, 2026, a day after launch (<a href={MACRUMORS} target="_blank" rel="noopener">MacRumors</a>)</> },
            { text: <>What each phrase on the pickup page means, word by word: <Link href="/apple-store-pickup-availability-explained">pickup availability explained</Link></>, step: true },
          ]} />
          <ol className="my-4 grid gap-3 sm:grid-cols-2">
            <Swap no="Reload apple.com every few minutes" yes="Let a checker reload for you and ping your phone" why={`Every US store is asked every ${SPEED.checkSec} seconds here, the stores an alert points at every ${SPEED.fastSec}; the push is sent about ${SPEED.alertSec} seconds after a restock is confirmed.`} />
            <Swap no="Check one ZIP, then another, then another" yes={<Link href="/iphone-duo-near-me">Every store ranked by distance from you</Link>} why={`All ${STORES.length} US Apple Stores, live stock on each, in one list.`} />
          </ol>
          <Figure id="click-and-collect-queue" />
        </section>

        {/* ---------------------------------------------------------------- how it works */}
        <section id="how" className="scroll-mt-24">
          <h2>{h2Of("how")}</h2>
          <p><b>It asks apple.com the same pickup question a shopper asks, for all {items.length} iPhone Duo configurations at every one of the {STORES.length} US Apple Stores every {SPEED.checkSec} seconds (every {SPEED.fastSec} at stores with an alert), and keeps only the answers that two consecutive checks agree on; the live tables on this site are those answers and nothing else.</b></p>
          <StatGrid cols={4} className="my-4">
            <Stat value={`${SPEED.checkSec}`} unit="s" label="between checks of every US Apple Store" tone="accent" />
            <Stat value={`${SPEED.fastSec}`} unit="s" label="between checks of a store an alert points at" tone="accent" />
            <Stat value="~1" unit="s" label={<>a first &quot;available&quot; is asked again this much later before it counts</>} />
            <Stat value={t.unknown ? "–" : n(t.n)} label={`confirmed US Duo restocks logged since ${since}`} />
          </StatGrid>
          <Keys items={[
            { text: <>Every store every <b className="text-ink">{SPEED.checkSec} seconds</b>; the stores an alert points at every <b className="text-ink">{SPEED.fastSec} seconds</b></> },
            { text: <>A first &quot;available&quot; is asked again about a second later; it counts only when both answers agree</> },
            { text: <>A disappearance is confirmed on the next round, so a one-response glitch never becomes a sell-out</> },
            { text: <>A failed or slow request is never written down as &quot;out of stock&quot;</>, no: true },
            { text: <>Times in the store&apos;s own local zone; data since <b className="text-ink">{longDate(TRACKING_SINCE_US)}</b> in the US, {longDate(TRACKING_SINCE_INTL)} elsewhere</> },
            { text: <>Other trackers state check intervals of <b className="text-ink">{OTHER_TRACKERS}</b>, their own claims: <Link href="/iphone-stock-tracker-comparison">side by side</Link>, with our measured ones on the <Link href="/service-report">service report</Link></> },
            { text: <>The full method with the confirmation rules: <Link href="/how-it-works">how it works</Link></>, step: true },
          ]} />
          <Measured title="What &quot;stock&quot; means here">
            Stock on this site is Apple&apos;s own in-store pickup availability for a store, read from apple.com: whether that store can hand over that configuration now. In the usual sense, <a href={WIKI_INVENTORY} target="_blank" rel="noopener">inventory</a> is the goods a shop holds for sale; Apple does not publish unit counts, so no page here claims a quantity, a delivery date or a carrier&apos;s stock. A store&apos;s line reads either available or not, and we record when it changed.
          </Measured>
        </section>

        {/* ---------------------------------------------------------------- per store */}
        <section id="store" className="scroll-mt-24">
          <h2>{h2Of("store")}</h2>
          <p><b>For each of the {STORES.length} US Apple Stores: live stock for all {items.length} iPhone Duo configurations, restocks in the last 24 hours and 30 days, the usual restock hour once there are enough of them, how long each restock lasted, hours, address and the price with that state&apos;s sales tax{topStore && topRow ? `; ${appleName(topStore)} in ${cityLine(topStore)}, the US store with the most confirmed Duo restocks since ${since} (${n(topRow.restocks)}), is a fair example` : ""}.</b></p>
          {topStore && topRow ? (
            <>
              <StatGrid cols={4} className="my-4">
                <Stat value={n(topRow.restocks)} label={<>confirmed Duo restocks at <Link href={storePath(topStore)} className="underline underline-offset-2">{appleName(topStore)}</Link> since {since}, on {plural(topRow.days, "day")}</>} tone="accent" />
                {topRow.peakHour != null
                  ? <Stat value={<span className="text-2xl sm:text-3xl">{rangeLabel(topRow.peakHour, topRow.peakHour + 1)}</span>} label="its usual restock hour, local time" />
                  : <Stat value="–" label={`usual hour: stated from ${PATTERN_MIN} restocks on ${PATTERN_MIN_DAYS} different days`} tone="muted" />}
                <Stat value={<span className="text-2xl sm:text-3xl">{localStamp(topRow.lastAt, topStore)}</span>} label="its last confirmed restock, local time" />
                <Stat value={live ? `${topNow}/${items.length}` : "–"} label="configurations it lists right now" live={live} tone={topNow > 0 ? "accent" : "plain"} />
              </StatGrid>
              <KeyTable head={["The store page shows", `${appleName(topStore)} today`]} rows={[
                ["Live stock", <>All {items.length} configurations, each &quot;available&quot; or not at the latest check</>],
                ["Restocks", <>{n(topRow.restocks)} since {since}{topPattern ? `, ${topPattern.restocks} in the last 30 days` : ""}, each with the local time and how long it stayed listed</>],
                ["Usual hour", <>{topRow.peakHour != null ? `${rangeLabel(topRow.peakHour, topRow.peakHour + 1)} local time, from ${plural(topRow.days, "day")} of restocks` : `not yet: stated only from ${PATTERN_MIN} restocks on ${PATTERN_MIN_DAYS} different days`}</>],
                ...(topHours ? [["Hours", <>{topHours}</>] as [ReactNode, ReactNode]] : []),
                ["Address", <>{fullAddress(topStore)}</>],
                ...(topTax ? [["Price with tax", <>{fmtPrice(cheapest)} list, about {fmtPrice(topTax.total)} with {topStore.state}&apos;s {topTax.rate}% average combined sales tax (<a href={SALES_TAX_SOURCE.url} target="_blank" rel="noopener">Tax Foundation, 2026</a>)</>] as [ReactNode, ReactNode]] : []),
              ]} />
              <ChipLinks items={[
                { href: storePath(topStore), label: `${appleName(topStore)}: the store page` },
                { href: "/which-iphone-duo-restocks-most", label: "The stores that restock most" },
                { href: "/stores", label: `All ${STORES.length} store pages by state` },
              ]} />
            </>
          ) : (
            <>
              <p>The example store fills in from the restock log as soon as it can be read; until then, every store page under <Link href="/stores">Apple Stores by state</Link> carries the same facts for its own store.</p>
              <ChipLinks items={[{ href: "/stores", label: `All ${STORES.length} store pages by state` }, { href: "/which-iphone-duo-restocks-most", label: "The stores that restock most" }]} />
            </>
          )}
          <Keys items={[
            { text: <>Restocks shown with the <b className="text-ink">seconds they lasted</b>, bounded by two checks</> },
            { text: <>The usual hour needs <b className="text-ink">{PATTERN_MIN} restocks on {PATTERN_MIN_DAYS} different days</b>; a burst is one event, not a habit</> },
            { text: <>A store&apos;s page is where to set the alert for that store</>, step: true },
          ]} />
        </section>

        {/* ---------------------------------------------------------------- configurations */}
        <section id="configs" className="scroll-mt-24">
          <h2>{h2Of("configs")}</h2>
          <p><b>{topCfg
            ? `${cfg(topCfg.partNumber)}: it accounts for ${pct(topCfgN / t.n)} of the ${n(t.n)} confirmed US iPhone Duo restocks since ${since}${live && mostNow && mostNowN > 0 ? `, and right now ${cfg(mostNow.partNumber)} is the configuration most stores list (${plural(mostNowN, "store")})` : live ? ", and at this moment no store lists any configuration" : ""}; the table has all ${items.length} configurations with the stores listing each one now, restocks in the last 24 hours and since launch, and Apple's buy page for each.`
            : t.unknown
              ? "The restock log could not be read at this moment, so there is no ranking to quote; the table below still lists all eight configurations with Apple's buy page for each, and refills on the next load."
              : `No configuration has a confirmed restock yet, so there is no ranking to quote; the table below lists all ${items.length} configurations with the stores listing each one now and Apple's buy page for each.`}</b></p>
          <Table caption={`All ${items.length} iPhone Duo configurations sold in the US: stores listing each for pickup at the latest check, confirmed restocks in the last 24 hours and since ${since}`} head={["Configuration", "Price", "Stores now", "Last 24 h", `Since ${shortDate(t.since)}`, "apple.com"]} min="40rem">
            {configs.map((i) => {
              const now = nowByPart.get(i.partNumber) ?? 0;
              const day = dayPart.get(i.partNumber)?.restocks ?? 0;
              const all = sincePart.get(i.partNumber)?.restocks ?? 0;
              return (
                <tr key={i.partNumber} className={`border-b border-line ${now > 0 ? "bg-accent/[0.06]" : ""}`}>
                  <th scope="row" className={rowTh}><span className="inline-flex items-center gap-2"><Swatch color={i.color} />{i.storage} {i.color}</span></th>
                  <td className={td}>{fmtPrice(i.price)}</td>
                  <td className={`${td} ${now > 0 ? "font-semibold text-accent" : ""}`}>{live ? `${now} of ${STORES.length}` : "–"}</td>
                  <td className={td}>{recent.unknown ? "–" : day}</td>
                  <td className={td}>{t.unknown ? "–" : n(all)}</td>
                  <td className="py-2 pe-3 align-top"><a href={appleBuyUrl(i)} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap underline underline-offset-2 hover:text-ink">Buy on apple.com</a></td>
                </tr>
              );
            })}
          </Table>
          <Keys items={[
            { text: <><b className="text-ink">Stores now</b>: distinct US Apple Stores listing that exact configuration at the latest check</> },
            { text: <>Prices are Apple&apos;s list prices before sales tax; the state and store pages add the tax</> },
            { text: <>&quot;Buy on apple.com&quot; opens Apple&apos;s page for that configuration; choose Pick up there and enter your ZIP</>, step: true },
          ]} />
          <ChipLinks items={[
            { href: "/which-iphone-duo-restocks-most", label: "Which iPhone Duo restocks most" },
            { href: "/stock/iphone-duo", label: "Live stock by configuration and place" },
          ]} />
        </section>

        {/* ---------------------------------------------------------------- when */}
        <section id="when" className="scroll-mt-24">
          <h2>{h2Of("when")}</h2>
          <p><b>{pattern
            ? `No, and nobody honest can: it reports the observed pattern, not a schedule. ${pct(w.share)} of the ${n(t.n)} confirmed US iPhone Duo restocks since ${since} landed between ${hl(w.from)} and ${hl(w.to)} store local time, a tendency to plan around rather than a time to show up.`
            : t.unknown
              ? "No, and nobody honest can: it reports the observed pattern, not a schedule, and the restock log could not be read at this moment; the hour-by-hour tables refill on the next load."
              : `No, and nobody honest can: it reports the observed pattern, not a schedule, and a pattern is stated only from ${PATTERN_MIN} restocks on ${PATTERN_MIN_DAYS} different days; the US log has ${n(t.n)} so far.`}</b></p>
          {pattern && (
            <StatGrid cols={4} className="my-4">
              <Stat value={pct(w.share)} label={`of ${n(t.n)} restocks since ${since} fell between ${hl(w.from)} and ${hl(w.to)} local time`} tone="accent" />
              <Stat value={<span className="text-2xl sm:text-3xl">{rangeLabel(t.peakHour!, t.peakHour! + 1)}</span>} label={`the single busiest hour (${n(t.byHour[t.peakHour!])} restocks)`} />
              <Stat value={pct(hourShare(t.byHour, 8, 12))} label="between 8 AM and noon" />
              <Stat value={pct(hourShare(t.byHour, 17, 24))} label="after 5 PM" tone="muted" />
            </StatGrid>
          )}
          <Keys items={[
            { text: <>Hours are each store&apos;s <b className="text-ink">local time</b>: a national drop at 9:30 ET is one event across the zones</> },
            { text: <>Per-state and per-city hour tables: <Link href="/iphone-duo-restock-times/texas">Texas</Link>, <Link href="/iphone-duo-restock-times/california/los-angeles">Los Angeles</Link>, and every other state and city from the national page</> },
            { text: <>A schedule would be a guess; the pattern is a count</>, no: true },
            { text: <>The hour-by-hour and day-by-day tables: <Link href="/iphone-duo-restock-times">when Apple restocks the iPhone Duo</Link></>, step: true },
          ]} />
          <ChipLinks items={[
            { href: "/iphone-duo-restock-times", label: "When Apple restocks the iPhone Duo" },
            { href: "/iphone-duo-sell-out-times", label: "How fast each restock sold out" },
            { href: "/restocks", label: "The restock log, live" },
          ]} />
        </section>

        {/* ---------------------------------------------------------------- other countries */}
        <section id="countries" className="scroll-mt-24">
          <h2>{h2Of("countries")}</h2>
          <p><b>{live
            ? `Yes: the same checks run at ${intlStores} Apple Stores in ${INTL_CODES.length} other countries since ${longDate(TRACKING_SINCE_INTL)}, every ${SPEED.checkSec} seconds each, and right now ${intlDuoNow === 0 ? "none of them lists" : `${plural(intlDuoNow, "of them lists", "of them list")}`} an iPhone Duo for pickup${intlHit.length > 0 ? ` (${intlHit.map((c) => COUNTRIES[c.cc].short).join(", ")})` : ""}; each country has its own live page, store pages and alerts.`
            : `Yes: the same checks run at ${intlStores} Apple Stores in ${INTL_CODES.length} other countries since ${longDate(TRACKING_SINCE_INTL)}, every ${SPEED.checkSec} seconds each; live stock could not be read at this moment, and each country's own page carries its live table.`}</b></p>
          <Table caption={`The ${INTL_CODES.length} other countries PickupChecker tracks: Apple Stores listing an iPhone Duo for pickup at the latest check and stores tracked, since ${longDate(TRACKING_SINCE_INTL)}`} head={["Country", "Stores listing a Duo now", "Apple Stores tracked", "Live page"]} min="30rem">
            {countries.map((c) => (
              <tr key={c.cc} className={`border-b border-line ${c.now > 0 ? "bg-accent/[0.06]" : ""}`}>
                <th scope="row" className={rowTh}><Link href={`${prefixOf(c.cc)}/stock/iphone-duo`} className="hover:underline">{COUNTRIES[c.cc].name}</Link></th>
                <td className={`${td} ${c.now > 0 ? "font-semibold text-accent" : ""}`}>{live ? `${c.now} of ${c.stores}` : "–"}</td>
                <td className={td}>{c.stores}</td>
                <td className="py-2 pe-3 align-top"><Link href={prefixOf(c.cc) || "/"} className="hover:underline">{COUNTRIES[c.cc].short} home</Link> · <Link href={`${prefixOf(c.cc)}/iphone-duo-restock-times`} className="hover:underline">restock times</Link></td>
              </tr>
            ))}
          </Table>
          <Keys items={[
            { text: <>Prices and times on each country&apos;s pages in its own currency and zones; store names as Apple writes them there</> },
            { text: <>Alerts for a store abroad work the same way: that store every <b className="text-ink">{SPEED.fastSec} s</b>, a push sent about {SPEED.alertSec} s after confirmation</> },
            { text: <>Austria and Belgium have one Apple Store each, so their country page is that store&apos;s page</> },
          ]} />
        </section>

        {/* ---------------------------------------------------------------- alerts */}
        <section id="alerts" className="scroll-mt-24">
          <h2>{h2Of("alerts")}</h2>
          <p><b>{PRICE_SENTENCE}</b></p>
          <StatGrid cols={3} className="my-4">
            <Stat value={`$${PLANS.plus.priceUsd}`} unit="/ month" label={`${PLANS.plus.name} · ${PLANS.plus.limit} alerts`} tone="accent" />
            <Stat value={`$${PLANS.pro.priceUsd}`} unit="/ month" label={`${PLANS.pro.name} · ${PLANS.pro.limit} alerts`} />
            <Stat value={`$${PLANS.max.priceUsd}`} unit="/ month" label={`${PLANS.max.name} · ${PLANS.max.limit} alerts`} />
          </StatGrid>
          <Keys items={[
            { text: <>One alert = <b className="text-ink">one Apple Store × one exact configuration</b> (model, storage, color); two colors at one store are two alerts</> },
            { text: <>A push notification to your phone; on iPhone through the <Link href="/install">Home Screen app</Link>, nothing to download</> },
            { text: <>One push per restock, naming the store and configuration; nothing for sell-outs</> },
            { text: <>Tap it, choose &quot;I&apos;ll pick it up&quot; at that store on apple.com, pay: <Link href="/how-to-grab-an-iphone-duo-restock">the 20-second checkout</Link></>, step: true },
          ]} />
          <ChipLinks items={[
            { href: "/iphone-duo-stock-alerts", label: "What one alert covers" },
            { href: "/pricing", label: "Pricing" },
            { href: "/install", label: "Set up the Home Screen app" },
          ]} />
          <p><Link href={alert} className="btn btn-primary">Set up an iPhone Duo alert</Link></p>
          <Figure id="phone-notification" />
          <p className="text-sm text-ink-3">{QUOTE}</p>
        </section>
      </div>

      <RelatedBlock title="Keep exploring">
        <LinkRow title="The same data, other questions" links={[
          { href: "/iphone-duo-restock-times", label: "When does Apple restock the iPhone Duo?" },
          { href: "/iphone-duo-sell-out-times", label: "How fast does a restock sell out?" },
          { href: "/iphone-duo-stock-alerts", label: "iPhone Duo stock alerts" },
          { href: "/iphone-duo-near-me", label: "iPhone Duo near me" },
          { href: "/how-to-grab-an-iphone-duo-restock", label: "How to grab a restock" },
          { href: "/which-iphone-duo-restocks-most", label: "Which iPhone Duo restocks most" },
          { href: "/apple-store-pickup-availability-explained", label: "Pickup availability explained" },
        ]} />
        <LinkRow title="Live pages" links={[
          { href: "/stock/iphone-duo", label: "iPhone Duo stock, every store" },
          { href: "/restocks", label: "Restock log" },
          { href: "/map", label: "Live map" },
          { href: "/stores", label: "Apple Stores by state" },
        ]} />
        <LinkRow title="Other ways people ask" links={[
          { href: "/iphone-duo-back-in-stock", label: "Is the iPhone Duo back in stock?" },
          { href: "/where-to-buy-iphone-duo", label: "Where to buy an iPhone Duo today" },
        ]} />
      </RelatedBlock>

      <div className="mt-10"><RichFaq items={faq} facts={facts} title="Questions" /></div>
      <div className="mt-8"><SourceList sources={sources} facts={facts} where={`all ${STORES.length} US Apple Stores (and the ${intlStores} stores of ${INTL_CODES.length} other countries since ${longDate(TRACKING_SINCE_INTL)})`} since={longDate(TRACKING_SINCE_US)} /></div>
    </div>
  );
}
