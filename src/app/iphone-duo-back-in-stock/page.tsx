/**
 * /iphone-duo-back-in-stock: "Is the iPhone Duo back in stock?" answered for the person who typed exactly that and
 * does not know a tracker exists. The first sentence is the whole answer with live numbers (how many US Apple Stores
 * list one now, the latest confirmed restock with its store and local time, the last 24 hours); the sections under
 * it say where, which configurations, how long "back in stock" lasts, when the next window usually opens, how to be
 * told the moment it happens, and the 18 other countries. Every number is PickupChecker's own, read at request time;
 * a read that fails says so instead of showing a zero as a fact.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cache } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs, LinkRow, RelatedBlock } from "@/components/seo/Related";
import { Figure } from "@/components/content/Figure";
import { RichFaq, SourceList } from "@/components/content/RichFaq";
import { RestockFeed } from "@/components/restocks/RestockFeed";
import { Swatch } from "@/components/stores/ConfigTable";
import { Measured, Points, Stat, StatGrid, StepStrip, Swap, type Point } from "@/components/ui/Viz";
import { getFacts } from "@/lib/content/facts";
import type { Faq, Source } from "@/lib/content/types";
import { PART_INDEX, STORES, appleName, catalogFor, cityLine, statePath, statesWithStores, storeByNumber, storePath, storeTimeZone, storesOf, type CatalogItem, type Store } from "@/lib/apple/catalog";
import { COUNTRIES, INTL_CODES, prefixOf } from "@/lib/apple/countries";
import { CHECK_NOTE, OTHER_TRACKERS, PLANS, SPEED } from "@/lib/plans";
import { TRACKING_SINCE_INTL, TRACKING_SINCE_US, WEEKDAYS, hourLabel, localHourDay, localStamp, siteFacts } from "@/lib/content/siteFacts";
import { busiestWindow, duoRestockTimes, rangeLabel } from "@/lib/content/restockTimes";
import { medianBand } from "@/lib/stock/sellouts";
import { recentByConfig } from "@/lib/stock/recent";
import { modelStock, restockFeed, storesWithStockNow, type RestockRow } from "@/lib/stock/queries";
import { alertHref, fmtPrice, plural } from "@/lib/seo/enrich";

export const dynamic = "force-dynamic";

const SITE = "https://pickupchecker.com";
const PATH = "/iphone-duo-back-in-stock";
const TITLE = `Is the iPhone Duo Back in Stock? Live at ${STORES.length} Apple Stores`;
const APPLE_PICKUP = "https://www.apple.com/shop/shipping-pickup";
const APPLE_NEWSROOM = "https://www.apple.com/newsroom/2026/10/iphone-duo-arrives-at-apple-store-locations-worldwide/";
const MACRUMORS = "https://macrumors.com/2026/10/24/apple-store-pickup-iphone-duo-us/";
const WIKI_STOCKOUT = "https://en.wikipedia.org/wiki/Stockout";
const DAY_MS = 86400_000;
/** restockFeed hands out at most 200 rows a page; the 24-hour window is walked page by page, up to this many. */
const FEED_PAGE = 200;
const FEED_PAGES = 5;
/** The one price sentence, in the body and in a FAQ answer, word for word. */
const PRICE_SENTENCE = `Alerts from $${PLANS.plus.priceUsd}/month: the stores you pick are checked every ${SPEED.fastSec} s, with a push about ${SPEED.alertSec} s after a restock is confirmed.`;

const n = (x: number) => x.toLocaleString("en-US");
/** Whole-percent shares; a share under half a percent reads "<1%", never a misleading "0%". */
const pct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : `${Math.round(x * 100)}%`);
const LONG = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
const longDate = (ymd: string) => LONG.format(new Date(`${ymd}T12:00:00Z`));
const ET_STAMP = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
/** "9:41 AM" on the store's own clock. */
const clockAt = (iso: string, store: Store) => new Intl.DateTimeFormat("en-US", { timeZone: storeTimeZone(store), hour: "numeric", minute: "2-digit" }).format(new Date(iso));
const cfgName = (i: CatalogItem) => `${i.storage} ${i.color}`;
/** A ratio for a sentence: "3×" above 3, "1.8×" below. */
const times = (r: number) => (r >= 3 ? `${Math.round(r)}×` : `${(Math.round(r * 10) / 10).toFixed(1)}×`);

/** "today", "yesterday" or "on Nov 3", by the store's own calendar. */
function dayWord(iso: string, store: Store, now: Date): string {
  const tz = storeTimeZone(store);
  const d = localHourDay(iso, tz).date;
  if (d === localHourDay(now.toISOString(), tz).date) return "today";
  if (d === localHourDay(new Date(now.getTime() - DAY_MS).toISOString(), tz).date) return "yesterday";
  return `on ${new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric" }).format(new Date(iso))}`;
}

/** "about 4 minutes ago", computed on the server for this request (the page is never cached). */
function agoText(iso: string, now: Date): string {
  const s = Math.max(0, Math.round((now.getTime() - Date.parse(iso)) / 1000));
  if (s < 60) return "less than a minute ago";
  const m = Math.round(s / 60);
  if (m < 60) return `about ${plural(m, "minute")} ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `about ${plural(h, "hour")} ago`;
  return `about ${plural(Math.round(h / 24), "day")} ago`;
}

/**
 * Confirmed US iPhone Duo restocks, newest first, reaching back at least 24 hours: restockFeed pages at 200 rows,
 * so pages are read until one ends before the window (or FEED_PAGES pages, `complete: false`).
 */
async function duoFeed(now: Date): Promise<{ rows: RestockRow[]; complete: boolean }> {
  const since = now.getTime() - DAY_MS;
  const rows: RestockRow[] = [];
  for (let page = 0; page < FEED_PAGES; page++) {
    const batch = await restockFeed({ model: "duo", limit: FEED_PAGE, country: "us", page });
    rows.push(...batch);
    if (batch.length < FEED_PAGE || batch[batch.length - 1].at.getTime() < since) return { rows, complete: true };
  }
  return { rows, complete: false };
}

/** One read per request, shared by the metadata and the page. */
const load = cache(async () => {
  const now = new Date();
  const [t, recent, stock, feed, f, facts, abroad] = await Promise.all([
    duoRestockTimes("us"),
    recentByConfig({ country: "us" }),
    modelStock("duo", "us"),
    duoFeed(now),
    siteFacts(),
    getFacts(),
    Promise.all(INTL_CODES.map((cc) => storesWithStockNow(undefined, cc))),
  ]);
  return { now, t, recent, stock, feed, f, facts, abroad };
});

/** Pure: every number the page and its description quote, from the raw reads. */
function derive(d: Awaited<ReturnType<typeof load>>) {
  const { now, t, recent, stock, feed } = d;
  // A status row exists for every store × configuration since the first sweep, so an empty read is a failed one.
  const stockUnknown = stock.length === 0;
  const nowByStore = new Map<string, Set<string>>();
  for (const r of stock) {
    if (r.status !== "available") continue;
    const set = nowByStore.get(r.storeNumber) ?? new Set<string>();
    set.add(r.partNumber);
    nowByStore.set(r.storeNumber, set);
  }
  const storesNow = nowByStore.size;
  const nowByState = new Map<string, number>();
  const nowByPart = new Map<string, number>();
  for (const [storeNumber, parts] of nowByStore) {
    const s = storeByNumber(storeNumber);
    if (s) nowByState.set(s.state, (nowByState.get(s.state) ?? 0) + 1);
    for (const p of parts) nowByPart.set(p, (nowByPart.get(p) ?? 0) + 1);
  }

  const since24 = now.getTime() - DAY_MS;
  const last24 = feed.rows.filter((r) => r.at.getTime() >= since24);
  // Thousands of restocks sit in the log: an empty feed while the log has rows is a failed read, not a quiet day.
  const feedUnknown = feed.rows.length === 0 && (t.n > 0 || Boolean(t.unknown));
  // The 24-hour figures: the walked feed when it covers the window, else the cached grouped read.
  const h24 = !feedUnknown && feed.complete
    ? { restocks: last24.length, stores: new Set(last24.map((r) => r.storeNumber)).size, unknown: false }
    : { restocks: recent.restocks, stores: recent.stores, unknown: Boolean(recent.unknown) || feedUnknown };

  // The latest confirmed restock: the feed is the freshest read; the five-minute aggregate stands in when it failed.
  const first = feed.rows[0];
  const latestStore = first ? first.store : t.latest ? storeByNumber(t.latest.storeNumber) : undefined;
  const latest = first
    ? { store: first.store, item: first.item as CatalogItem | undefined, at: first.at.toISOString() }
    : t.latest && latestStore
      ? { store: latestStore, item: PART_INDEX.get(t.latest.partNumber), at: t.latest.at }
      : null;

  const states = statesWithStores().map((st) => {
    const rows = last24.filter((r) => r.store.state === st.name);
    const newest = rows[0];
    return {
      name: st.name, code: st.code, total: st.count, path: statePath(st.name),
      now: nowByState.get(st.name) ?? 0,
      restocks: rows.length, stores: new Set(rows.map((r) => r.storeNumber)).size,
      latest: newest ? { store: newest.store, at: newest.at.toISOString() } : null,
    };
  }).sort((a, b) => b.now - a.now || b.restocks - a.restocks || a.name.localeCompare(b.name));
  const statesNow = states.filter((s) => s.now > 0);
  const states24 = states.filter((s) => s.restocks > 0);
  const active = states.filter((s) => s.now > 0 || s.restocks > 0);

  const items = catalogFor("duo");
  const partRows = new Map(t.byPart.map((p) => [p.partNumber, p]));
  const recentParts = new Map(recent.byPart.map((p) => [p.partNumber, p]));
  const configs = items.map((item) => {
    const p = partRows.get(item.partNumber);
    const restocks = p?.restocks ?? 0;
    const lastStore = p?.lastStore ? storeByNumber(p.lastStore) : undefined;
    return { item, name: cfgName(item), restocks, share: t.n ? restocks / t.n : 0, lastAt: p?.lastAt ?? null, lastStore, now: nowByPart.get(item.partNumber) ?? 0, h24: recentParts.get(item.partNumber)?.restocks ?? 0 };
  }).sort((a, b) => b.restocks - a.restocks || a.name.localeCompare(b.name));
  const topCfg = configs[0];
  const lastCfg = configs[configs.length - 1];
  // The spread between the most- and least-restocked configuration, stated only when it is a real one.
  const spread = topCfg && lastCfg && lastCfg.restocks > 0 && topCfg !== lastCfg ? topCfg.restocks / lastCfg.restocks : 0;
  const ratio = spread >= 1.2 ? spread : null;
  // Which lever moves the odds more: the gap between storage sizes or the gap between colors, in restocks.
  const byStorage = new Map<string, number>(), byColor = new Map<string, number>();
  for (const c of configs) { byStorage.set(c.item.storage, (byStorage.get(c.item.storage) ?? 0) + c.restocks); byColor.set(c.item.color, (byColor.get(c.item.color) ?? 0) + c.restocks); }
  const gap = (m: Map<string, number>) => { const v = [...m.values()]; return v.length ? Math.max(...v) - Math.min(...v) : 0; };
  const storageWins = gap(byStorage) >= gap(byColor);

  const tracked = Math.max(t.daily.length, t.days, 1);
  const have = t.n > 0 && !t.unknown;
  const pattern = have && t.peakHour != null;
  const w = busiestWindow(t.byHour);
  const sell = t.sellout;
  const ds = d.f.duoSellout;
  const band = sell ? medianBand(sell.medianSec) : ds ? medianBand(ds.medianSec) : null;
  const top = t.topStores[0];
  const topStore = top ? storeByNumber(top.storeNumber) : undefined;

  const intl = INTL_CODES.map((cc, i) => ({ cc, name: COUNTRIES[cc].name, now: d.abroad[i].duo, total: storesOf(cc).length, href: `${prefixOf(cc)}/stock/iphone-duo` }))
    .sort((a, b) => b.now - a.now || INTL_CODES.indexOf(a.cc) - INTL_CODES.indexOf(b.cc));
  const intlNow = intl.reduce((a, c) => a + c.now, 0);
  const intlTotal = intl.reduce((a, c) => a + c.total, 0);

  return { now, t, stockUnknown, storesNow, h24, latest, last24, feedUnknown, feedComplete: feed.complete && !feedUnknown, states, statesNow, states24, active, items, configs, topCfg, lastCfg, ratio, storageWins, tracked, have, pattern, w, sell, ds, band, top, topStore, intl, intlNow, intlTotal, feedRows: feed.rows.slice(0, 12) };
}

/** The meta description: the quotable first sentence, cut to the clause that fits 158 characters. */
function describe(v: ReturnType<typeof derive>): string {
  const a = v.stockUnknown
    ? `Live iPhone Duo in-store pickup availability at all ${STORES.length} US Apple Stores`
    : v.storesNow > 0
      ? `${v.storesNow} of ${STORES.length} US Apple Stores list an iPhone Duo for pickup right now`
      : `No US Apple Store lists an iPhone Duo for pickup right now`;
  const b = v.h24.unknown ? "" : v.h24.restocks > 0 ? `; ${n(v.h24.restocks)} confirmed ${v.h24.restocks === 1 ? "restock" : "restocks"} at ${plural(v.h24.stores, "store")} in the last 24 hours` : "; no confirmed restock in the last 24 hours";
  const c = ` Where, how long it lasts and when it comes back; checked every ${SPEED.checkSec} s.`;
  for (const s of [`${a}${b}.${c}`, `${a}${b}.`, `${a}.`]) if (s.length <= 158) return s;
  return `${a}.`.slice(0, 158);
}

export async function generateMetadata(): Promise<Metadata> {
  const description = describe(derive(await load()));
  return {
    title: { absolute: `${TITLE} · PickupChecker` },
    description,
    alternates: { canonical: PATH },
    openGraph: { type: "article", siteName: "PickupChecker", title: TITLE, description, url: PATH },
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

export default async function DuoBackInStock() {
  const d = await load();
  const v = derive(d);
  const { now, t, stockUnknown, storesNow, h24, latest, feedUnknown, states, statesNow, states24, active, items, configs, topCfg, lastCfg, ratio, storageWins, tracked, have, pattern, w, sell, ds, band, top, topStore, intl, intlNow, intlTotal, feedRows } = v;
  const facts = d.facts;
  const since = longDate(t.since);
  const asOf = `${ET_STAMP.format(now)} ET`;
  const alert = alertHref({ model: "duo" });
  const description = describe(v);
  const storeLink = (s: Store) => <Link href={storePath(s)} className="hover:underline">{appleName(s)}</Link>;
  const nowKnown = !stockUnknown;
  const yesNow = nowKnown && storesNow > 0;
  const perDay = have ? Math.round(t.n / tracked) : 0;
  const quietStates = states.length - active.length;
  const configs24 = configs.filter((c) => c.h24 > 0).length;
  const topIntl = intl[0];

  const sections = [
    { id: "now", nav: "Right now", h2: "Is the iPhone Duo back in stock right now?" },
    { id: "where", nav: "Where", h2: "Where is the iPhone Duo back in stock today?" },
    { id: "configurations", nav: "Which configurations", h2: "Which configurations are back most often?" },
    { id: "how-long", nav: "How long it lasts", h2: "How long does “back in stock” last?" },
    { id: "when", nav: "When next", h2: "When will the iPhone Duo be back in stock?" },
    { id: "alerts", nav: "Know the moment", h2: "How do you know the moment it is back?" },
    { id: "abroad", nav: "Outside the US", h2: "Is it back in stock outside the US?" },
  ];
  const h2Of = (id: string) => sections.find((s) => s.id === id)!.h2;

  /* ---------------------------------------------------------------- the sentences every section opens with */
  const latestClause = latest
    ? yesNow
      ? <>; the latest came back at <b className="text-ink">{appleName(latest.store)}</b> ({cityLine(latest.store)}) at <b className="text-ink">{clockAt(latest.at, latest.store)}</b> local time {dayWord(latest.at, latest.store, now)}</>
      : <>; the last one came back at <b className="text-ink">{appleName(latest.store)}</b> ({cityLine(latest.store)}) <b className="text-ink">{agoText(latest.at, now)}</b>, at {clockAt(latest.at, latest.store)} local time</>
    : null;
  const h24Clause = h24.unknown
    ? <>; the 24-hour count could not be read for this request.</>
    : h24.restocks > 0
      ? <>, and in the last 24 hours <b className="text-ink">{n(h24.restocks)}</b> {h24.restocks === 1 ? "restock was" : "restocks were"} confirmed at <b className="text-ink">{plural(h24.stores, "store")}</b>.</>
      : <>, and no restock has been confirmed anywhere in the US in the last 24 hours.</>;

  const whereLead = stockUnknown
    ? `Live stock could not be read for this request; the 24-hour column below still shows where the iPhone Duo came back${states24.length ? `, in ${plural(states24.length, "state")}, led by ${states24[0].name} with ${plural(states24[0].restocks, "restock")}` : ""}.`
    : statesNow.length > 0
      ? `Right now ${plural(statesNow.length, "state has", "states have")} an Apple Store listing an iPhone Duo: ${statesNow.slice(0, 4).map((s) => `${s.name} (${s.now} of ${s.total})`).join(", ")}${statesNow.length > 4 ? ` and ${statesNow.length - 4} more` : ""}; in the last 24 hours restocks were confirmed in ${plural(states24.length, "state")}.`
      : states24.length > 0
        ? `No state has an Apple Store listing an iPhone Duo at this minute; in the last 24 hours restocks were confirmed in ${plural(states24.length, "state")}, led by ${states24[0].name} (${plural(states24[0].restocks, "restock")} at ${plural(states24[0].stores, "store")}).`
        : `No state has an Apple Store listing an iPhone Duo at this minute, and no US restock has been confirmed in the last 24 hours; the table fills in with the next one.`;

  const configLead = have && topCfg && topCfg.restocks > 0
    ? `${topCfg.name} comes back most: ${n(topCfg.restocks)} of the ${n(t.n)} confirmed US restocks since ${since} (${pct(topCfg.share)})${lastCfg && lastCfg.restocks < topCfg.restocks ? `, against ${n(lastCfg.restocks)} for ${lastCfg.name} (${pct(lastCfg.share)})` : ", and the eight configurations are level so far"}${ratio ? `, so the most common configuration returns ${times(ratio)} as often as the rarest` : ""}.`
    : t.unknown
      ? "The restock log could not be read for this request; the eight-row table below fills in on the next load."
      : `No confirmed US restock yet since ${since}; the eight configurations are listed below and rank themselves as restocks are confirmed.`;

  const howLongLead = sell
    ? `About ${band}: half of the ${n(sell.n)} US iPhone Duo restocks that sold out since ${since} were gone within ${sell.medianSec} seconds, ${pct(sell.within2min)} within 2 minutes and ${pct(sell.within20min)} within 20, so a page you reload by hand almost always shows it gone.`
    : ds
      ? `About ${band}: half of the ${n(ds.n)} iPhone Duo restocks that sold out in the last 7 days were gone within ${ds.medianSec} seconds and ${pct(ds.within30)} within 30, so a page you reload by hand almost always shows it gone.`
      : "Seconds to a few minutes: we state a sell-out time only once ten or more confirmed restocks have sold out, and until then the honest answer is that a listing you see by hand is usually gone before you finish checkout.";

  const whenLead = pattern
    ? `Apple publishes no restock schedule; what we can say is that ${pct(w.share)} of the ${n(t.n)} iPhone Duo restocks confirmed at US Apple Stores since ${since} landed between ${hourLabel(w.from)} and ${hourLabel(w.to % 24)} local time${t.peakWeekday != null ? `, and ${WEEKDAYS[t.peakWeekday]} has been the busiest day` : ""}.`
    : have
      ? `Apple publishes no restock schedule, and ${n(t.n)} confirmed restocks on ${plural(t.days, "day")} since ${since} are too few for us to call an hour of the day a pattern; we say "usually" only from 5 restocks on 3 different days.`
      : `Apple publishes no restock schedule, and we have no confirmed US restock to read a pattern from yet; the window fills in from 5 restocks on 3 different days.`;

  const abroadLead = intlNow > 0 && topIntl
    ? `Right now ${intlNow} of the ${n(intlTotal)} Apple Stores in ${INTL_CODES.length} other countries list an iPhone Duo for pickup, led by ${topIntl.name} (${topIntl.now} of ${topIntl.total}); each country has its own stock, part numbers and prices, so a US restock says nothing about Toronto or London.`
    : `At this minute none of the ${n(intlTotal)} Apple Stores in the ${INTL_CODES.length} other countries we track lists an iPhone Duo for pickup; each country has its own stock, part numbers and prices, and its own page below.`;

  /* ---------------------------------------------------------------- FAQ, sources, structured data */
  const faq: Faq[] = [
    { q: "Is the iPhone Duo back in stock?", a: stockUnknown
      ? `We could not read live stock for this request. [Live iPhone Duo stock](/stock/iphone-duo) shows every US Apple Store's pickup availability as of its last ${SPEED.checkSec}-second check${h24.unknown ? "" : `; in the last 24 hours ${n(h24.restocks)} restocks were confirmed at ${plural(h24.stores, "store")}`}.`
      : yesNow
        ? `Yes, at ${storesNow} of the ${STORES.length} US Apple Stores when this page loaded (${asOf})${latest ? `; the latest confirmed restock was ${appleName(latest.store)} in ${cityLine(latest.store)} at ${clockAt(latest.at, latest.store)} local time ${dayWord(latest.at, latest.store, now)}` : ""}. A listing typically lasts about ${band ?? "a minute"}, so check [live stock](/stock/iphone-duo) rather than a page from an hour ago.`
        : `Not at this minute: none of the ${STORES.length} US Apple Stores listed an iPhone Duo for pickup when this page loaded (${asOf}). It comes back in short bursts${h24.unknown ? "" : `: ${n(h24.restocks)} ${h24.restocks === 1 ? "restock was" : "restocks were"} confirmed in the last 24 hours`}${latest ? `, the latest ${agoText(latest.at, now)} at ${appleName(latest.store)}` : ""}, and each lasts about ${band ?? "a minute"}.` },
    { q: "How often does the iPhone Duo come back in stock?", a: have
      ? `About ${n(perDay)} times a day across the ${STORES.length} US Apple Stores: ${n(t.n)} confirmed restocks at ${t.stores} stores over the ${tracked} days since ${since}${h24.unknown ? "" : `, ${n(h24.restocks)} of them in the last 24 hours`}. One restock is one store × one configuration, so a single store sees a few a week, which is why people set alerts on two or three stores rather than one.`
      : `We cannot say yet: the count of confirmed US restocks since ${since} is in the first section and this answer fills in from it. Tracking covers all ${STORES.length} US Apple Stores every ${SPEED.checkSec} seconds.` },
    { q: "How long does it stay in stock?", a: sell
      ? `About ${band}: half of the ${n(sell.n)} US iPhone Duo restocks that sold out since ${since} were gone within ${sell.medianSec} seconds, ${pct(sell.within2min)} within 2 minutes and ${pct(sell.within20min)} within 20 minutes; the fastest was gone within ${sell.fastestSec} seconds. Every figure is bounded by two of our checks, so it is an upper bound ([how fast the iPhone Duo sells out](/iphone-duo-sell-out-times)).`
      : `Usually under a few minutes, from what every confirmed iPhone Duo restock has shown so far; we quote a median only once ten or more restocks in the window have sold out, and [how fast the iPhone Duo sells out](/iphone-duo-sell-out-times) carries it the moment they have.` },
    { q: "Which Apple Store gets the iPhone Duo back most often?", a: top && topStore
      ? `[${appleName(topStore)}](${storePath(topStore)}) in ${cityLine(topStore)}: ${n(top.restocks)} confirmed restocks on ${plural(top.days, "day")} since ${since}${top.peakHour != null ? `, most often around ${hourLabel(top.peakHour)} local time` : ""}. Our reading: the stores with the most restocks are the big, busy ones, so a high count makes a store a better one to watch, not a quieter queue; [which iPhone Duo restocks most](/which-iphone-duo-restocks-most) ranks configurations and stores.`
      : `Too early to name one: the ranking of stores by confirmed restocks since ${since} fills in on [which iPhone Duo restocks most](/which-iphone-duo-restocks-most) as they are confirmed.` },
    { q: "How do I get notified when it is back in stock?", a: `${PRICE_SENTENCE} Pick the iPhone Duo configuration and the Apple Stores you can reach, add PickupChecker to your iPhone's Home Screen and allow notifications once ([install guide](/install)); the push names the store and configuration, and you reserve on apple.com with in-store pickup. ${PLANS.plus.name} covers ${PLANS.plus.limit} alerts, ${PLANS.pro.name} ${PLANS.pro.limit} for $${PLANS.pro.priceUsd}, ${PLANS.max.name} ${PLANS.max.limit} for $${PLANS.max.priceUsd} ([pricing](/pricing)).` },
  ];

  const sources: Source[] = [
    { label: "Apple: Delivery and Pickup (how in-store pickup availability and holds work)", url: APPLE_PICKUP },
    { label: "Apple Newsroom: iPhone Duo arrives at Apple Store locations worldwide (October 23, 2026)", url: APPLE_NEWSROOM },
    { label: "MacRumors: Apple Store pickup for iPhone Duo resumes in the US (October 24, 2026)", url: MACRUMORS },
    { label: "Wikipedia: Stockout (what “out of stock” and “back in stock” mean)", url: WIKI_STOCKOUT },
  ];

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${SITE}${PATH}`, url: `${SITE}${PATH}`, name: TITLE, description, isPartOf: { "@id": `${SITE}/#website` }, about: { "@id": `${SITE}/#organization` }, dateModified: now.toISOString() },
      {
        "@type": "Dataset", "@id": `${SITE}${PATH}#dataset`, name: "iPhone Duo pickup availability and confirmed restocks at US Apple Stores",
        description: `Which of the ${STORES.length} US Apple Stores list an iPhone Duo for in-store pickup right now, and every confirmed restock (two agreeing checks of apple.com, first sightings excluded) with store, configuration and time, by state and configuration, with how long each listing lasted; checked every ${SPEED.checkSec} seconds, every ${SPEED.fastSec} for stores with alerts.`,
        url: `${SITE}${PATH}`, creator: { "@id": `${SITE}/#organization` }, isAccessibleForFree: true,
        temporalCoverage: `${TRACKING_SINCE_US}/..`, spatialCoverage: "Apple Stores in the United States",
        variableMeasured: ["Apple Store", "US state", "iPhone Duo storage and color", "listed for pickup now", "confirmed restock time", "restocks in the last 24 hours", "seconds listed before sell-out"],
        ...(have ? { size: `${n(t.n)} confirmed restocks at ${t.stores} stores` } : {}),
      },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8">
      <JsonLd data={ld} />
      <Breadcrumbs items={[{ href: "/", label: "PickupChecker" }, { label: "iPhone Duo back in stock" }]} />
      <h1 className="display mt-3 text-3xl sm:text-5xl">Is the iPhone Duo back in stock at Apple Stores right now?</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-2">
        {stockUnknown
          ? <>Our live read of apple.com pickup availability did not come back for this request, so we cannot say how many of the <b className="text-ink">{STORES.length}</b> US Apple Stores list an iPhone Duo at this minute</>
          : yesNow
            ? <>Right now <b className="text-ink">{storesNow}</b> of the <b className="text-ink">{STORES.length}</b> US Apple Stores {storesNow === 1 ? "lists" : "list"} an iPhone Duo for in-store pickup</>
            : <>Right now <b className="text-ink">none</b> of the {STORES.length} US Apple Stores lists an iPhone Duo for pickup</>}
        {latestClause}
        {h24Clause}
      </p>
      <p className="mt-3 text-sm text-ink-3">Updated {asOf} · data since {longDate(TRACKING_SINCE_US)} · {STORES.length} Apple Stores · checked {CHECK_NOTE}</p>

      <StatGrid cols={4} className="mt-6">
        <Stat value={stockUnknown ? "–" : `${storesNow}/${STORES.length}`} label="US Apple Stores listing an iPhone Duo for pickup now" tone={yesNow ? "accent" : "muted"} live={nowKnown} />
        <Stat value={h24.unknown ? "–" : n(h24.restocks)} label={h24.unknown ? "restocks in the last 24 hours (unreadable right now)" : <>confirmed restocks in the last 24 hours · {plural(h24.stores, "store")}</>} tone={h24.restocks > 0 ? "plain" : "muted"} />
        {latest
          ? <Stat size="sm" value={clockAt(latest.at, latest.store)} label={<>latest restock · {appleName(latest.store)}, {cityLine(latest.store)} · local time {dayWord(latest.at, latest.store, now)}</>} />
          : <Stat value="–" label="latest confirmed restock" tone="muted" />}
        {sell
          ? <Stat value={sell.medianSec} unit="s" label={<>typical listing, listed to gone · {n(sell.n)} sold-out restocks since {since}</>} tone="warn" />
          : ds
            ? <Stat value={ds.medianSec} unit="s" label={<>typical listing, listed to gone · last 7 days</>} tone="warn" />
            : <Stat value="–" label="typical seconds a listing lasts (needs 10 timed sell-outs)" tone="muted" />}
      </StatGrid>
      <Points className="mt-4" items={[
        { text: <><b className="text-ink">&ldquo;Back in stock&rdquo;</b> here = one store × one configuration flipped from unavailable to available on apple.com, confirmed by a second check about a second later</> },
        { text: <>Every US Apple Store asked every <b className="text-ink">{SPEED.checkSec} seconds</b>; stores with an alert every {SPEED.fastSec}</> },
        have
          ? { text: <>Since {since}: <b className="text-ink">{n(t.n)}</b> confirmed restocks at {t.stores} of {STORES.length} stores</> }
          : { text: <>Counting from {since}; the restock log is on <Link href="/restocks">the restock page</Link></> },
        { text: <>The latest 12 are listed below, newest first</>, step: true },
      ]} />
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={alert} className="btn btn-primary">Alert me when it is back</Link>
        <Link href="/stock/iphone-duo" className="btn btn-ghost">Live stock at every store</Link>
      </div>
      <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2 text-sm">
        {sections.map((s) => <a key={s.id} href={`#${s.id}`} className="chip px-3 py-1.5 text-xs">{s.nav}</a>)}
      </nav>
      <Figure id="apple-store-pickup-counter" eager />

      <div className="pane prose-site mt-8 p-6 sm:p-8">
        {/* ---------------------------------------------------------------- right now */}
        <section id="now" className="scroll-mt-24">
          <h2>{h2Of("now")}</h2>
          <p><b>{stockUnknown
            ? `We cannot say for this request: the live read failed, and we would rather say so than show a zero. The restocks below are from the log and are real.`
            : yesNow
              ? `Yes: ${storesNow} of the ${STORES.length} US Apple Stores ${storesNow === 1 ? "lists" : "list"} an iPhone Duo for in-store pickup as of ${asOf}${h24.unknown ? "" : `, after ${n(h24.restocks)} confirmed ${h24.restocks === 1 ? "restock" : "restocks"} at ${plural(h24.stores, "store")} in the last 24 hours`}; a yes on this page is worth about ${band ?? "a minute"}, so act on it rather than bookmark it.`
              : `No, not at this minute: none of the ${STORES.length} US Apple Stores lists an iPhone Duo for pickup as of ${asOf}${h24.unknown ? "" : h24.restocks > 0 ? `, but ${n(h24.restocks)} ${h24.restocks === 1 ? "restock was" : "restocks were"} confirmed at ${plural(h24.stores, "store")} in the last 24 hours` : ", and the last 24 hours brought no confirmed restock either"}; "unavailable" is the normal state of a phone that sells out in about ${band ?? "a minute"}.`}</b></p>
          <StatGrid cols={4} className="my-4">
            <Stat value={stockUnknown ? "–" : storesNow} label="stores listing one now" tone={yesNow ? "accent" : "muted"} live={nowKnown} />
            <Stat value={h24.unknown ? "–" : n(h24.restocks)} label="restocks in the last 24 h" tone={h24.restocks > 0 ? "plain" : "muted"} />
            <Stat value={h24.unknown ? "–" : `${h24.stores}/${STORES.length}`} label="stores with a restock in 24 h" tone={h24.stores > 0 ? "plain" : "muted"} />
            <Stat value={h24.unknown ? "–" : `${configs24}/${items.length}`} label="configurations that came back in 24 h" tone={configs24 > 0 ? "plain" : "muted"} />
          </StatGrid>
          <Keys items={[
            { text: <>A <a href={WIKI_STOCKOUT} target="_blank" rel="noopener">stockout</a> ends when apple.com shows a configuration as available for pickup; <b className="text-ink">that flip is what we log</b>, store by store</> },
            { text: <>Apple&apos;s <a href={APPLE_PICKUP} target="_blank" rel="noopener">pickup page</a> shows what a store can hand over now; it never says when the next batch lands</> },
            { text: <>Each card below is one confirmed restock, <b className="text-ink">newest first</b>; a dimmed card has already sold out again</> },
            { text: <>Every restock since {since}, with filters, on <Link href="/restocks">the restock log</Link></>, step: true },
          ]} />
          <div className="my-5 [&_a]:no-underline">
            <RestockFeed rows={feedRows} model="duo" showModel={false} emptyText={feedUnknown || t.unknown ? "The restock log could not be read for this request." : `No confirmed iPhone Duo restock yet since ${since}.`} />
          </div>
          <ChipLinks items={[{ href: "/restocks", label: "The full restock log" }, { href: "/stock/iphone-duo", label: "Live stock, every store" }, { href: "/apple-store-pickup-availability-explained", label: "What the wording on apple.com means" }]} />
        </section>

        {/* ---------------------------------------------------------------- where */}
        <section id="where" className="scroll-mt-24">
          <h2>{h2Of("where")}</h2>
          <p><b>{whereLead}</b></p>
          {active.length > 0 ? (
            <Table caption={`States with an iPhone Duo listed now or a confirmed restock in the last 24 hours, stock first; ${quietStates === 0 ? "every state is listed" : `the other ${plural(quietStates, "state")} had neither`}. ${v.feedComplete ? "" : "The 24-hour column counts the newest 1,000 restocks only."}`.trim()} head={["State", "Listing one now", "Restocks, last 24 h", "Stores restocked", "Latest, local time"]} min="36rem">
              {active.map((s) => (
                <tr key={s.name} className={`border-b border-line ${s.now > 0 ? "bg-accent/[0.06]" : ""}`}>
                  <th scope="row" className={rowTh}><Link href={s.path} className="hover:underline">{s.name}</Link></th>
                  <td className={`${td} ${s.now > 0 ? "font-semibold text-accent" : ""}`}>{stockUnknown ? "–" : `${s.now} of ${s.total}`}</td>
                  <td className={td}>{n(s.restocks)}</td>
                  <td className={td}>{s.stores ? `${s.stores} of ${s.total}` : "–"}</td>
                  <td className="py-2 pe-3 align-top">{s.latest ? <>{localStamp(s.latest.at, s.latest.store)} · {storeLink(s.latest.store)}</> : "–"}</td>
                </tr>
              ))}
            </Table>
          ) : (
            <Keys items={[{ text: <>No state has a listing now or a confirmed restock in the last 24 hours; the table appears with the next one</>, no: true }]} />
          )}
          <Keys items={[
            { text: <><b className="text-ink">Big states lead</b> because they have more stores, not because a store there is likelier to have one</> },
            { text: <>&ldquo;Listing one now&rdquo; is live to the last {SPEED.checkSec}-second check; the 24-hour columns are confirmed restocks, first sightings excluded</> },
            { text: <>Sort by distance instead: <Link href="/iphone-duo-near-me">iPhone Duo near me</Link> uses your location or ZIP</>, step: true },
          ]} />
          <ChipLinks items={[{ href: "/iphone-duo-near-me", label: "Stores with one near me" }, { href: "/map", label: "Live map of every store" }, { href: "/stores", label: "Stores by state" }]} />
        </section>

        {/* ---------------------------------------------------------------- configurations */}
        <section id="configurations" className="scroll-mt-24">
          <h2>{h2Of("configurations")}</h2>
          <p><b>{configLead}</b></p>
          {have && topCfg && topCfg.restocks > 0 && (
            <StatGrid cols={3} className="my-4">
              {configs.slice(0, 3).map((c, i) => (
                <Stat key={c.item.partNumber} value={n(c.restocks)} label={<><span className="inline-flex items-center gap-1.5"><Swatch color={c.item.color} className="h-2.5 w-2.5" />{c.name}</span> · {pct(c.share)} of restocks · {fmtPrice(c.item.price)}</>} tone={i === 0 ? "accent" : "plain"} />
              ))}
            </StatGrid>
          )}
          <Table caption={`All ${items.length} iPhone Duo configurations at the ${STORES.length} US Apple Stores, most confirmed restocks first; prices from apple.com before sales tax`} head={["Configuration", "Price", `Restocks since ${since}`, "Share", "Last 24 h", "Listing it now", "Last restock, local time"]} min="44rem">
            {configs.map((c) => (
              <tr key={c.item.partNumber} className="border-b border-line">
                <th scope="row" className={rowTh}><span className="inline-flex items-center gap-2"><Swatch color={c.item.color} />{c.name}</span></th>
                <td className={td}>{fmtPrice(c.item.price)}</td>
                <td className={td}>{t.unknown ? "–" : n(c.restocks)}</td>
                <td className={td}>{t.unknown || !t.n ? "–" : pct(c.share)}</td>
                <td className={td}>{h24.unknown ? "–" : n(c.h24)}</td>
                <td className={td}>{stockUnknown ? "–" : c.now ? <span className="font-semibold text-accent">{c.now} of {STORES.length}</span> : `0 of ${STORES.length}`}</td>
                <td className="py-2 pe-3 align-top">{c.lastAt && c.lastStore ? <>{localStamp(c.lastAt, c.lastStore)} · {storeLink(c.lastStore)}</> : "–"}</td>
              </tr>
            ))}
          </Table>
          <Keys items={[
            ratio && topCfg && lastCfg
              ? { text: <>Our view: someone who insists on <b className="text-ink">{lastCfg.name}</b> is choosing the hardest queue; {topCfg.name} has come back {times(ratio)} as often, and a case hides the color</>, no: true }
              : have
                ? { text: <>Our view: {storageWins ? "pick the storage you want and accept either color; storage has moved the odds more than color" : "take the color that comes back more in the size you want; so far color has moved the odds more than storage"}</> }
                : { text: <>Our view: pick the storage you want and accept either color; a configuration you would return is a reservation someone else lost</> },
            { text: <>One alert is <b className="text-ink">one store × one configuration</b>, so two acceptable colors at one store are two alerts</> },
            { text: <>Shares are of restocks, not of units: Apple shows availability, never quantities</> },
            { text: <>Storage versus color, and the rarest size, on <Link href="/which-iphone-duo-restocks-most">which iPhone Duo restocks most</Link></>, step: true },
          ]} />
        </section>

        {/* ---------------------------------------------------------------- how long */}
        <section id="how-long" className="scroll-mt-24">
          <h2>{h2Of("how-long")}</h2>
          <p><b>{howLongLead}</b></p>
          {sell && (
            <StatGrid cols={4} className="my-4">
              <Stat value={sell.medianSec} unit="s" label={<>median listing, listed to gone · {n(sell.n)} sold-out restocks</>} tone="accent" />
              <Stat value={pct(sell.within2min)} label="gone within 2 minutes" tone="warn" />
              <Stat value={pct(sell.within20min)} label="gone within 20 minutes" />
              <Stat value={sell.fastestSec} unit="s" label="the fastest sell-out we timed" />
            </StatGrid>
          )}
          {ds && (
            <Keys items={[
              { text: <>Last 7 days: median <b className="text-ink">{ds.medianSec} s</b> over {n(ds.n)} sold-out restocks, <b className="text-ink">{pct(ds.within30)}</b> gone within 30 seconds</> },
              { text: <>A tracker checking once a minute would have seen about {pct(ds.caught.m1)} of them; every 5 minutes, {pct(ds.caught.m5)}</>, no: true },
            ]} />
          )}
          <p>&ldquo;Back in stock&rdquo; is an event measured in seconds, not a state you can browse to. The phone is bought out faster than it arrives, so <b className="text-ink">unavailable is the normal reading</b> and available is the exception that lasts about {band ?? "a minute"}. That is why this page shows the latest confirmed restocks rather than only the live count: the count tells you about this minute, the log tells you how often the minute comes.</p>
          <ol className="my-4 grid gap-3 sm:grid-cols-2">
            <Swap no="Reload apple.com every few minutes" yes={<>Be told within about {SPEED.alertSec} seconds of a confirmed restock</>} why={band ? `A listing that lasts about ${band} is usually gone between two reloads.` : "A listing that lasts seconds is usually gone between two reloads."} />
            <Swap no="Hunt for the store that is 'back in stock' right now" yes="Stage checkout, then wait for the push" why="The people who get the phone did their setup before the alert came: signed in, Apple Pay ready, the buy page open." />
          </ol>
          <Keys items={[
            { text: <>Every duration is bounded by two of our checks, so it is an <b className="text-ink">upper bound</b>; the true listing was shorter</> },
            { text: <>Restock by restock, with the seconds each lasted: <Link href="/iphone-duo-sell-out-times">how fast the iPhone Duo sells out</Link></>, step: true },
          ]} />
          <Figure id="apple-store-queue" />
        </section>

        {/* ---------------------------------------------------------------- when */}
        <section id="when" className="scroll-mt-24">
          <h2>{h2Of("when")}</h2>
          <p><b>{whenLead}</b></p>
          {have && (
            <StatGrid cols={4} className="my-4">
              {pattern
                ? <Stat size="sm" value={rangeLabel(w.from, w.to)} label={<>busiest two hours, local time · {pct(w.share)} of {n(t.n)} restocks</>} tone="accent" />
                : <Stat value={`${t.days}/${tracked}`} label="days with a confirmed restock, of days tracked" />}
              <Stat value={t.today ? n(t.today.restocks) : "0"} label={t.today ? <>restocks today so far · {plural(t.today.stores, "store")}</> : "restocks today so far"} tone={t.today && t.today.restocks > 0 ? "plain" : "muted"} />
              <Stat value={`${t.days}/${tracked}`} label="days with at least one restock, of days tracked" />
              {t.peakWeekday != null
                ? <Stat size="sm" value={WEEKDAYS[t.peakWeekday]} label="busiest weekday so far" />
                : <Stat value="–" label={<>busiest weekday: stated once restocks span 14 days (they span {t.spanDays})</>} tone="muted" />}
            </StatGrid>
          )}
          <Keys items={[
            { text: <>The iPhone Duo reached Apple Stores on <a href={APPLE_NEWSROOM} target="_blank" rel="noopener"><b className="text-ink">October 23, 2026</b></a>; US pickup reservations resumed the next day (<a href={MACRUMORS} target="_blank" rel="noopener">MacRumors</a>) and have been bursts ever since</> },
            { text: <>A window is a <b className="text-ink">share</b>, not an appointment: restocks land outside it too</> },
            { text: <>Hour by hour and day by day, nationally: <Link href="/iphone-duo-restock-times">when Apple restocks the iPhone Duo</Link></>, step: true },
          ]} />
          <p>The same question has a page for each state and city, with that place&apos;s own stores and local hours; for example <Link href="/iphone-duo-restock-times/california">California</Link> and <Link href="/iphone-duo-restock-times/new-york/new-york">New York City</Link>.</p>
          <ChipLinks items={[{ href: "/iphone-duo-restock-times", label: "US restock times by hour and day" }, { href: "/iphone-duo-restock-times/california", label: "California" }, { href: "/iphone-duo-restock-times/new-york/new-york", label: "New York City" }]} />
        </section>

        {/* ---------------------------------------------------------------- alerts */}
        <section id="alerts" className="scroll-mt-24">
          <h2>{h2Of("alerts")}</h2>
          <p><b>{PRICE_SENTENCE}</b> That interval is the shortest any iPhone stock tracker publishes that we know of (the others publish {OTHER_TRACKERS}), and against a listing that lasts about {band ?? "a minute"} it is the difference between a push you can act on and a notification about a phone that is already gone.</p>
          <StepStrip className="my-4 lg:grid-cols-3!" steps={[
            { title: "Pick the store and configuration", hint: <>one alert = one Apple Store × one storage and color; two or three stores you can reach by 9 AM beat ten you cannot</> },
            { title: "Install the Home Screen app", hint: <>on iPhone, add PickupChecker from Safari and allow notifications once; alerts are push notifications only</> },
            { title: "Stage Apple's checkout", hint: <>signed in, Apple Pay ready, the configuration&apos;s buy page open; when the push comes, change the store and pay</> },
          ]} />
          <Keys items={[
            { text: <><b className="text-ink">{PLANS.plus.name}</b> ${PLANS.plus.priceUsd}/month for {PLANS.plus.limit} alerts · {PLANS.pro.name} ${PLANS.pro.priceUsd} for {PLANS.pro.limit} · {PLANS.max.name} ${PLANS.max.priceUsd} for {PLANS.max.limit}; browsing is free</> },
            { text: <>One push per restock, naming the store and configuration; nothing for sell-outs</> },
            { text: <>Checking by hand is free and nearly always late</>, no: true },
          ]} />
          <ChipLinks items={[{ href: "/iphone-duo-stock-alerts", label: "How the alerts work" }, { href: "/how-to-grab-an-iphone-duo-restock", label: "The 20-second checkout, tap by tap" }, { href: "/install", label: "Install the Home Screen app" }]} />
          <p><Link href={alert} className="btn btn-primary no-underline!">Set up an iPhone Duo alert</Link></p>
          <Figure id="phone-notification" />
        </section>

        {/* ---------------------------------------------------------------- abroad */}
        <section id="abroad" className="scroll-mt-24">
          <h2>{h2Of("abroad")}</h2>
          <p><b>{abroadLead}</b></p>
          <Table caption={`Apple Stores listing an iPhone Duo for pickup now, by country; tracked since ${longDate(TRACKING_SINCE_INTL)}, each with its own part numbers and prices. A country whose read failed shows 0 for this request.`} head={["Country", "Listing one now", "Apple Stores tracked"]} min="22rem">
            {intl.map((c) => (
              <tr key={c.cc} className={`border-b border-line ${c.now > 0 ? "bg-accent/[0.06]" : ""}`}>
                <th scope="row" className={rowTh}><Link href={c.href} className="hover:underline">{c.name}</Link></th>
                <td className={`${td} ${c.now > 0 ? "font-semibold text-accent" : ""}`}>{c.now}</td>
                <td className={td}>{c.total}</td>
              </tr>
            ))}
          </Table>
          <Keys items={[
            { text: <>Same {SPEED.checkSec}-second checks, same two-check rule, since <b className="text-ink">{longDate(TRACKING_SINCE_INTL)}</b></> },
            { text: <>Alerts cover these stores too, at the same {SPEED.fastSec}-second interval</> },
            { text: <>Each country&apos;s own restock times: <Link href="/ca/iphone-duo-restock-times">Canada</Link>, <Link href="/uk/iphone-duo-restock-times">the UK</Link>, <Link href="/au/iphone-duo-restock-times">Australia</Link>, <Link href="/jp/iphone-duo-restock-times">Japan</Link></>, step: true },
          ]} />
          <Measured title="How these numbers are made">
            PickupChecker asks apple.com for in-store pickup availability of every iPhone Duo configuration at every Apple Store it tracks, every {SPEED.checkSec} seconds (every {SPEED.fastSec} for stores an alert points at). A restock is logged when two checks about a second apart both list the configuration; the first sighting of a store × configuration is excluded; a sell-out is confirmed on the next round. Nothing here is a forecast, a carrier&apos;s stock or a delivery estimate.
          </Measured>
          <p className="text-sm text-ink-3">You are welcome to quote these numbers with a link to this page; PickupChecker is independent and not affiliated with Apple, and reads the same pickup availability anyone can see on apple.com, just far more often.</p>
        </section>
      </div>

      <RelatedBlock>
        <LinkRow title="The same question, asked other ways" links={[
          { href: "/iphone-duo-stock-checker", label: "iPhone Duo stock checker" },
          { href: "/where-to-buy-iphone-duo", label: "Where to buy an iPhone Duo" },
          { href: "/iphone-duo-restock-times", label: "When Apple restocks the iPhone Duo" },
          { href: "/iphone-duo-sell-out-times", label: "How fast it sells out" },
          { href: "/iphone-duo-stock-alerts", label: "Stock alerts" },
          { href: "/iphone-duo-near-me", label: "iPhone Duo near me" },
          { href: "/how-to-get-an-iphone-duo", label: "How to get an iPhone Duo" },
          { href: "/how-to-grab-an-iphone-duo-restock", label: "Grab a restock in 20 seconds" },
          { href: "/which-iphone-duo-restocks-most", label: "Which configuration restocks most" },
          { href: "/apple-store-pickup-availability-explained", label: "Pickup availability explained" },
        ]} />
        <LinkRow title="Live pages" links={[
          { href: "/stock/iphone-duo", label: "iPhone Duo stock by store" },
          { href: "/restocks", label: "Restock log" },
          { href: "/map", label: "Map" },
          { href: "/stores", label: "Apple Stores by state" },
        ]} />
      </RelatedBlock>

      <div className="mt-10"><RichFaq items={faq} facts={facts} title="Questions" /></div>
      <div className="mt-8"><SourceList sources={sources} facts={facts} where={`all ${STORES.length} US Apple Stores (and the stores of ${INTL_CODES.length} other countries since ${longDate(TRACKING_SINCE_INTL)})`} since={longDate(TRACKING_SINCE_US)} /></div>
    </div>
  );
}
