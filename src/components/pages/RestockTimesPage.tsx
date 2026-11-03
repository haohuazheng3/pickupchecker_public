/**
 * /iphone-duo-restock-times and /{cc}/iphone-duo-restock-times: "Is Apple still restocking the iPhone Duo, and
 * when?" answered the way an answer engine can quote it — one sentence with the numbers under every question — and
 * shown the way a reader scans it: tiles, tables by local hour, day, region, store and configuration, keyword lines,
 * swap cards and folded notes. Every number is PickupChecker's own confirmed observation (lib/content/restockTimes.ts);
 * other trackers' launch-week reports appear as their own, labelled rows and are never counted.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cache } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs, LinkRow, RelatedBlock, type Crumb } from "@/components/seo/Related";
import { Figure } from "@/components/content/Figure";
import { RichFaq, SourceList } from "@/components/content/RichFaq";
import { Chips, Measured, Points, Stat, StatGrid, Swap, type Point } from "@/components/ui/Viz";
import { emptyFacts } from "@/lib/content/facts";
import type { Faq, Source } from "@/lib/content/types";
import { appleName, catalogFor, storeByNumber, storeLocality, storePath, storesOf, type Store } from "@/lib/apple/catalog";
import { ALL_CODES, COUNTRIES, prefixOf, type Country } from "@/lib/apple/countries";
import { DUO_LAUNCH_DAY, DUO_PICKUP_RESUMED, busiestWindow, duoRestockTimes, hourShare, rangeLabel, type DayRow } from "@/lib/content/restockTimes";
import { PATTERN_MIN, PATTERN_MIN_DAYS, WEEKDAYS, WEEKDAY_MIN_SPAN, hourLabel, localStamp } from "@/lib/content/siteFacts";
import { recentByConfig } from "@/lib/stock/recent";
import { storesWithStockNow } from "@/lib/stock/queries";
import { alertHref, fitTitle, plural } from "@/lib/seo/enrich";
import { OTHER_TRACKERS, SPEED } from "@/lib/plans";
import { REPORT_SOURCES } from "@/lib/restockReports";
import { hreflangFor } from "./shared";

const SITE = "https://pickupchecker.com";
const n = (x: number) => x.toLocaleString("en-US");
/** Whole-percent shares; a share under half a percent reads "<1%", never a misleading "0%". */
const pct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : `${Math.round(x * 100)}%`);

/** "Thu, Oct 29" from a calendar day. */
const dateLabel = (ymd: string, weekday = true) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", ...(weekday ? { weekday: "short" as const } : {}) }).format(new Date(`${ymd}T12:00:00Z`));
const longDate = (ymd: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
/** "Oct 27, 9:30 AM EDT": an instant in the country's reference zone (for waves across a country's zones). */
const zoneStamp = (iso: string, c: Country) => new Intl.DateTimeFormat("en-US", { timeZone: c.timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(iso));
const storeName = (s: Store) => `${appleName(s)} (${storeLocality(s)})`;

const load = cache(async (cc: Country["cc"]) => Promise.all([duoRestockTimes(cc), storesWithStockNow(undefined, cc), recentByConfig({ country: cc })]));

export const RESTOCK_TIMES_TITLE_US = "When Does Apple Restock the iPhone Duo? Times by Hour & Day";

export function restockTimesTitle(c: Country): string {
  return c.cc === "us" ? RESTOCK_TIMES_TITLE_US : `When Does Apple Restock the iPhone Duo ${c.inName}?`;
}

export async function restockTimesMetadata(c: Country): Promise<Metadata> {
  const [t] = await load(c.cc);
  const title = restockTimesTitle(c);
  const w = busiestWindow(t.byHour);
  const region = c.cc === "us" ? "state" : (c.regionNoun ?? "store");
  const since = dateLabel(t.since, false);
  const pattern = t.peakHour != null;
  const description = t.n > 0 && pattern
    ? fitTitle([
      `${n(t.n)} iPhone Duo restocks at Apple Stores ${c.inName} since ${since}: ${pct(w.share)} between ${rangeLabel(w.from, w.to)} local time${t.sellout ? `, ${pct(t.sellout.within2min)} gone within 2 minutes` : ""}. Tables by hour, day, ${region}, store and configuration.`,
      `${n(t.n)} iPhone Duo restocks at Apple Stores ${c.inName} since ${since}: ${pct(w.share)} between ${rangeLabel(w.from, w.to)} local time. Tables by hour, day, ${region} and configuration.`,
      `iPhone Duo restock times ${c.inName}: ${n(t.n)} restocks since ${since}, by hour, day, ${region} and configuration.`,
    ], 158)
    : t.n > 0
      ? fitTitle([
        `${n(t.n)} confirmed iPhone Duo restocks at Apple Stores ${c.inName} since ${since}, from checks every ${SPEED.checkSec} seconds: by local hour, day by day, by ${region}, store and configuration, and how long each lasted.`,
        `iPhone Duo restock times ${c.inName}: ${n(t.n)} confirmed restocks since ${since}, by hour, day, ${region} and configuration.`,
      ], 158)
      : `When Apple Stores ${c.inName} restock the iPhone Duo, from PickupChecker's own checks every ${SPEED.checkSec} seconds since ${longDate(t.since)}: hour by hour, day by day, by store and configuration.`;
  const url = `${prefixOf(c.cc)}/iphone-duo-restock-times`;
  return {
    title: { absolute: `${title} · PickupChecker` },
    description,
    alternates: { canonical: url, languages: hreflangFor("restock-times") },
    openGraph: { type: "article", siteName: "PickupChecker", title, description, url },
  };
}

const th = "border-b border-line-2 py-2 pr-3 text-left font-semibold text-ink";
const td = "py-2 pr-3 align-top tabular-nums";
const rowTh = "py-2 pr-3 text-left font-medium text-ink";

function Table({ caption, head, children, min = "28rem" }: { caption: string; head: string[]; children: React.ReactNode; min?: string }) {
  return (
    <div className="my-5 overflow-x-auto">
      <table className="w-full border-collapse text-sm" style={{ minWidth: min }}>
        <caption className="mb-2 text-left text-xs text-ink-3">{caption}</caption>
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

export async function RestockTimesPage({ country: c }: { country: Country }) {
  const cc = c.cc;
  const us = cc === "us";
  const [t, stockNow, recent] = await load(cc);
  const stores = storesOf(cc);
  const one = stores.length === 1;
  const where = c.inName;
  const facts = emptyFacts(cc);
  const items = catalogFor("duo", cc);
  const cfg = (p: string) => { const i = items.find((x) => x.partNumber === p); return i ? `${i.storage} ${i.color}` : p; };
  const w = busiestWindow(t.byHour);
  const window = rangeLabel(w.from, w.to);
  const pattern = t.peakHour != null;
  const regionNoun = us ? "state" : (c.regionNoun ?? "area");
  const regionNounPlural = us ? "states" : (c.regionNounPlural ?? "areas");
  const duoNow = stockNow.duo;
  const today = t.today;
  const latestStore = t.latest ? storeByNumber(t.latest.storeNumber) : undefined;
  const stamp = (iso: string, storeNumber: string) => localStamp(iso, storeByNumber(storeNumber) ?? stores[0]);
  const alert = alertHref({ model: "duo", country: cc });
  const logHref = us ? "/restocks" : `${prefixOf(cc)}/restocks`;
  const storesHref = us ? "/stores" : (prefixOf(cc) || "/");
  const url = `${prefixOf(cc)}/iphone-duo-restock-times`;
  const title = restockTimesTitle(c);
  const h1 = t.unknown
    ? `When does Apple restock the iPhone Duo ${where}?`
    : t.n > 0
      ? `Is Apple still restocking the iPhone Duo ${where}? Yes — here is when, hour by hour`
      : `Is Apple restocking the iPhone Duo ${where}? Not yet, by our checks — here is what we watch`;

  /** Days from the first tracked one to today, restocks or not (spanDays counts only days between the first and last restock). */
  const tracked = Math.max(t.daily.length, t.days, 1);
  const hours = t.byHour.map((count, hour) => ({ hour, count })).filter((h) => h.count > 0);
  const topHours = [...hours].sort((a, b) => b.count - a.count).slice(0, 3);
  const busiestDay = t.daily.reduce<DayRow | null>((a, d) => (d.restocks > (a?.restocks ?? 0) ? d : a), null);
  const regions = t.byRegion;
  const regionsHit = regions.filter((r) => r.restocks > 0);
  const topRegions = regionsHit.slice(0, 12);
  const topStores = t.topStores.slice(0, 8).map((r) => ({ ...r, store: storeByNumber(r.storeNumber) })).filter((r) => r.store);
  const parts = t.byPart;
  const topPart = parts[0];
  const lastPart = parts.length ? parts[parts.length - 1] : undefined;
  const byStorage = new Map<string, number>(), byColor = new Map<string, number>();
  for (const p of parts) { const i = items.find((x) => x.partNumber === p.partNumber); if (!i) continue; byStorage.set(i.storage, (byStorage.get(i.storage) ?? 0) + p.restocks); byColor.set(i.color, (byColor.get(i.color) ?? 0) + p.restocks); }
  const storageTop = [...byStorage.entries()].sort((a, b) => b[1] - a[1]);
  const colorTop = [...byColor.entries()].sort((a, b) => b[1] - a[1]);
  const storageRatio = storageTop.length > 1 && storageTop[1][1] > 0 ? Math.max(1, Math.round((storageTop[0][1] / storageTop[1][1]) * 10) / 10) : null;
  const pairs = stores.length * items.length;
  const drop = t.drops.find((d) => d.stores >= 2) ?? null;
  const reportNames = Object.keys(REPORT_SOURCES);
  const weekend = t.byWeekday[0] + t.byWeekday[6];
  const sell = t.sellout;
  const se = t.n > 0 ? "" : " yet";

  const sections: { id: string; nav: string; h2: string }[] = [
    { id: "time-of-day", nav: "Time of day", h2: `What time of day does the iPhone Duo restock ${where}?` },
    { id: "day-by-day", nav: "Day by day", h2: `Which days has Apple restocked the iPhone Duo ${where}?` },
    ...(one ? [] : [{ id: "where", nav: `By ${regionNoun}`, h2: `Which Apple Stores restock the iPhone Duo most ${where}?` }]),
    { id: "configuration", nav: "Configuration", h2: `Which iPhone Duo configuration restocks most ${where}?` },
    { id: "how-long", nav: "How long it lasts", h2: `How long does an iPhone Duo restock last ${where}?` },
    { id: "unavailable", nav: "Why unavailable", h2: "Why does every Apple Store say “currently unavailable”?" },
    { id: "reddit", nav: "Reddit vs data", h2: "What Reddit says about iPhone Duo restocks — and what the data says" },
    { id: "method", nav: "How we count", h2: "How does PickupChecker count a restock?" },
  ];
  const h2Of = (id: string) => sections.find((s) => s.id === id)!.h2;

  const faq: Faq[] = [
    { q: `When does Apple restock the iPhone Duo ${where}?`, a: t.n > 0 && pattern
      ? `Mostly in the morning: ${pct(w.share)} of the ${n(t.n)} confirmed restocks since ${longDate(t.since)} landed between ${window} in the store's local time, and ${pct(hourShare(t.byHour, 8, 12))} between 8 AM and noon. Apple publishes no schedule; this is PickupChecker's observed pattern, updated about every five minutes.`
      : `Apple publishes no schedule, and PickupChecker has logged ${plural(t.n, "confirmed restock")} ${where} since ${longDate(t.since)}${t.days ? ` on ${plural(t.days, "day")}` : ""}. A usual hour is stated once there are ${PATTERN_MIN} restocks over ${PATTERN_MIN_DAYS} different days, and this page fills in by itself.` },
    { q: `Does Apple restock the iPhone Duo on weekends${us ? "" : ` ${where}`}?`, a: t.n > 0
      ? `${weekend > 0 ? "Yes so far" : "Not yet in our data"}: ${plural(weekend, "restock")} fell on a Saturday or Sunday out of ${n(t.n)} (${pct(weekend / t.n)}). ${t.peakWeekday != null ? `${WEEKDAYS[t.peakWeekday]} has been the busiest weekday.` : `Which weekday is busiest we do not state until the data spans ${WEEKDAY_MIN_SPAN} days; ours covers ${tracked}.`}`
      : `No weekend data ${where} yet; the day-by-day table on this page fills in as restocks are confirmed.` },
    { q: "What time should I start checking?", a: t.n > 0 && pattern
      ? `If you check by hand, be on apple.com with pickup selected from ${hourLabel(w.from)} local time; that two-hour window has carried ${pct(w.share)} of restocks. A typical restock ${sell ? `was gone within ${sell.medianSec} seconds at the median` : "lasts about a minute"}, so an alert that checks every ${SPEED.fastSec} seconds ([how alerts work](/iphone-duo-stock-alerts)) does what no refreshing can.`
      : `Until a pattern ${where} is clear, let an alert do the watching: the stores you choose are checked every ${SPEED.fastSec} seconds, around the clock ([how alerts work](/iphone-duo-stock-alerts)).` },
    { q: "Why do all Apple Stores say the iPhone Duo is unavailable?", a: sell
      ? `Because a restock is short: ${pct(sell.within2min)} of the ${n(sell.n)} sold-out restocks we measured ${where} were gone within 2 minutes and ${pct(sell.within20min)} within 20. Right now ${duoNow} of ${stores.length} stores list one; at almost any other moment the honest reading of apple.com is “unavailable” even on a day with dozens of restocks ([what “unavailable” means](/apple-store-pickup-availability-explained)).`
      : `Because pickup stock appears for minutes at a time. Right now ${duoNow} of ${plural(stores.length, "store")} ${where} list one ([what “unavailable” means](/apple-store-pickup-availability-explained)).` },
    { q: "How do I get notified when my Apple Store restocks the iPhone Duo?", a: `Set an alert for the store and the exact storage and colour: from then on that store is checked every ${SPEED.fastSec} seconds and your phone is told about ${SPEED.alertSec} seconds after a restock is confirmed ([set up an alert](${alert}); [how it works](/how-it-works)).` },
  ];

  const sources: Source[] = [
    { label: "Apple: Delivery and Pickup (how in-store pickup availability works)", url: "https://www.apple.com/shop/shipping-pickup" },
    { label: "Apple Newsroom: iPhone Duo arrives at Apple Store locations worldwide (October 23, 2026)", url: "https://www.apple.com/newsroom/2026/10/iphone-duo-arrives-at-apple-store-locations-worldwide/" },
    ...(us ? [{ label: "MacRumors: Apple Store pickup system for iPhone Duo went live again in the US and Canada (October 24, 2026)", url: "https://macrumors.com/2026/10/24/apple-store-pickup-iphone-duo-us/" }] : []),
    ...(t.reports.length ? reportNames.filter((k) => REPORT_SOURCES[k]).map((k) => ({ label: `${k}: iPhone Duo restock reports for launch week (their observations, shown separately, never counted)`, url: REPORT_SOURCES[k] })) : []),
  ];

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${SITE}${url}`, url: `${SITE}${url}`, name: title, isPartOf: { "@id": `${SITE}/#website` }, about: { "@id": `${SITE}/#organization` }, dateModified: t.at },
      {
        "@type": "Dataset", "@id": `${SITE}${url}#dataset`, name: `iPhone Duo restock times at Apple Stores ${where}`,
        description: `Every confirmed in-store pickup restock of the iPhone Duo at Apple Stores ${where} since ${t.since}, with store, configuration and time, from PickupChecker's checks every ${SPEED.checkSec} seconds; summarised by local hour, day, ${regionNoun}, store and configuration.`,
        url: `${SITE}${url}`, creator: { "@id": `${SITE}/#organization` }, isAccessibleForFree: true, temporalCoverage: `${t.since}/..`,
        spatialCoverage: `Apple Stores ${where}`, variableMeasured: ["restock time (store-local)", "Apple Store", "iPhone Duo storage and colour", "seconds until sold out"],
        ...(t.n ? { size: `${t.n} restocks at ${t.stores} stores` } : {}),
      },
    ],
  };

  const crumbs: Crumb[] = us ? [{ href: "/", label: "PickupChecker" }, { label: "iPhone Duo restock times" }] : [{ href: prefixOf(cc), label: c.short }, { label: "iPhone Duo restock times" }];
  const otherCountries = ALL_CODES.filter((k) => k !== cc).map((k) => ({ href: `${prefixOf(k)}/iphone-duo-restock-times`, label: COUNTRIES[k].short }));

  /** The hero tiles: restocks, the window (or the days), stock now, today (or the weekday). */
  const heroTiles: ReactNode[] = t.n > 0 && !t.unknown
    ? [
      <Stat key="n" value={n(t.n)} label={`confirmed restocks since ${dateLabel(t.since, false)}`} tone="accent" />,
      pattern
        ? <Stat key="w" value={pct(w.share)} label={`between ${window}, store local time`} />
        : <Stat key="d" value={`${t.days}/${tracked}`} label="days with at least one restock" />,
      <Stat key="now" value={`${duoNow}/${stores.length}`} label={one ? "store lists one for pickup right now" : "stores list one for pickup right now"} live />,
      today
        ? <Stat key="today" value={n(today.restocks)} label={`today (${dateLabel(today.date)})${one ? "" : `, at ${plural(today.stores, "store")}`}, so far`} />
        : t.peakWeekday != null
          ? <Stat key="wd" value={<span className="text-2xl sm:text-3xl">{WEEKDAYS[t.peakWeekday]}</span>} label="busiest weekday so far" />
          : <Stat key="d2" value={`${t.days}/${tracked}`} label="days with at least one restock" />,
    ]
    : [];

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8">
      <JsonLd data={ld} />
      <Breadcrumbs items={crumbs} />
      <h1 className="display mt-3 text-3xl sm:text-5xl">{h1}</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-2">
        {t.unknown ? (
          <>Our restock log could not be read just now; the stores {where} are still being checked every {SPEED.checkSec} seconds, and this page returns with its numbers on the next load.</>
        ) : t.n > 0 ? (
          <>
            <b className="text-ink">Yes.</b> {one ? "The Apple Store" : "Apple Stores"} {where} {one ? "has" : "have"} restocked the iPhone Duo <b className="text-ink">{n(t.n)} times since {longDate(t.since)}</b>{tracked > 1 ? <>, on {t.days} of the {tracked} days</> : <> (one day of tracking so far)</>}
            {pattern && <>, <b className="text-ink">{pct(w.share)} of them between {window}</b> in the store&apos;s local time</>}.
          </>
        ) : (
          <>
            <b className="text-ink">Not yet, by our checks.</b> Since {longDate(t.since)} PickupChecker has asked {one ? "the Apple Store" : `all ${stores.length} Apple Stores`} {where} every {SPEED.checkSec} seconds and has not confirmed an iPhone Duo pickup restock.
          </>
        )}
      </p>
      {heroTiles.length > 0 && <StatGrid cols={4} className="mt-6">{heroTiles}</StatGrid>}
      {!t.unknown && t.n > 0 && (
        <Points className="mt-4" items={[
          ...(t.latest && latestStore && today && today.restocks > 0 ? [{ text: <>Latest: <b className="text-ink">{cfg(t.latest.partNumber)}</b>{one ? null : <> at <Link href={storePath(latestStore)} className="underline underline-offset-2">{appleName(latestStore)}</Link></>}, {localStamp(t.latest.at, latestStore)} local time</> }] : []),
          ...(t.peakWeekday != null ? [{ text: <>Most often on <b className="text-ink">{WEEKDAYS[t.peakWeekday]}s</b></> }] : []),
          { text: <>Apple publishes <b className="text-ink">no restock schedule</b>; these are our own confirmed checks, updated about every five minutes</>, no: true },
        ]} />
      )}
      {!t.unknown && t.n === 0 && (
        <Points className="mt-4" items={[
          { text: <>Right now <b className="text-ink">{duoNow} of {stores.length}</b> {one ? "lists" : "list"} one for pickup</> },
          { text: <>The tables below fill in from the first confirmed restock</>, step: true },
          { text: <>Hour and weekday patterns, where we have the most data: <Link href="/iphone-duo-restock-times" className="underline underline-offset-2">the US page</Link></>, step: true },
        ]} />
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={alert} className="btn btn-primary">Set up an iPhone Duo alert</Link>
        <Link href={logHref} className="btn btn-ghost">The restock log, live</Link>
      </div>
      <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2 text-sm">
        {sections.map((s) => <a key={s.id} href={`#${s.id}`} className="chip px-3 py-1.5 text-xs">{s.nav}</a>)}
      </nav>
      <Figure id="closed-sign-return-time" eager />

      <div className="pane prose-site mt-8 p-6 sm:p-8">
        {/* ---------------------------------------------------------------- time of day */}
        <section id="time-of-day" className="scroll-mt-24">
          <h2>{h2Of("time-of-day")}</h2>
          {pattern ? (
            <>
              <p><b>{pct(w.share)} of the {n(t.n)} restocks landed between {window} in the store&apos;s local time, and {pct(hourShare(t.byHour, 8, 12))} between 8 AM and noon.</b></p>
              <StatGrid cols={4} className="my-4">
                <Stat value={<span className="text-2xl sm:text-3xl">{rangeLabel(t.peakHour!, t.peakHour! + 1)}</span>} label={`busiest single hour: ${n(t.byHour[t.peakHour!])} restocks`} tone="accent" />
                <Stat value={pct(hourShare(t.byHour, 8, 12))} label="between 8 AM and noon" />
                <Stat value={pct(hourShare(t.byHour, 17, 24))} label="after 5 PM: evenings are not dead" />
                <Stat value={pct(hourShare(t.byHour, 0, 6))} label="between midnight and 6 AM" tone="muted" />
              </StatGrid>
              {topHours.length > 0 && <Chips className="my-3" items={topHours.map((h) => `${rangeLabel(h.hour, h.hour + 1)} · ${n(h.count)}`)} on={[0]} />}
            </>
          ) : (
            <>
              <p><b>Too few days to call an hour{se}: {plural(t.n, "confirmed restock")} on {plural(t.days, "day")} since {longDate(t.since)}.</b></p>
              <Keys items={[
                { text: <>A usual hour needs <b className="text-ink">{PATTERN_MIN} restocks over {PATTERN_MIN_DAYS} different days</b></> },
                { text: <>Ten restocks in one burst = one event, not a habit</>, no: true },
                { text: <>The page rewrites itself as the days accumulate</>, step: true },
              ]} />
            </>
          )}
          {hours.length > 0 && (
            <Table caption={`iPhone Duo restocks ${where} by the store's local hour, ${dateLabel(t.since, false)} to today (${n(t.n)} restocks)`} head={["Local hour", "Restocks", "Share"]} min="20rem">
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
              { text: <>The morning cluster is <b className="text-ink">not the doors opening</b>{us ? ": most US Apple Stores open at 10 AM" : ""}</> },
              { text: <>Pickup inventory is released <b className="text-ink">online</b>, before the shutters go up</> },
              { text: <>By hand: watch <b className="text-ink">{window}</b> on a weekday morning</>, step: true },
              { text: <>Let an <Link href={alert}>alert</Link> watch the <b className="text-ink">other 22 hours</b>, which nobody is refreshing for</>, step: true },
            ]} />
          )}
          <Keys items={[{ text: <>Every store page has its own chart, in its own zone (<Link href={storesHref}>{us ? "Apple Stores by state" : `stores ${where}`}</Link>): a store that restocks at 8 AM in a 9 AM region is worth knowing</>, step: true }]} />
        </section>

        {/* ---------------------------------------------------------------- day by day */}
        <section id="day-by-day" className="scroll-mt-24">
          <h2>{h2Of("day-by-day")}</h2>
          {t.n > 0 && tracked === 1 ? (
            <p><b>One day of tracking so far, {dateLabel(t.daily[t.daily.length - 1]?.date ?? t.since)}, with {n(t.n)} confirmed restocks{one ? "" : ` at ${plural(t.stores, "store")}`}.</b></p>
          ) : t.n > 0 ? (
            <p><b>{t.days === tracked ? `Every day we have tracked, ${t.days} of ${t.days},` : `${t.days} of the ${tracked} days since ${longDate(t.since)}`} had at least one confirmed restock{t.peakWeekday != null ? `, and ${WEEKDAYS[t.peakWeekday]} has been the busiest weekday` : ""}.</b></p>
          ) : (
            <p><b>No confirmed restock {where} since {longDate(t.since)}.</b></p>
          )}
          {t.n > 0 && (
            <StatGrid cols={3} className="my-4">
              <Stat value={`${t.days}/${tracked}`} label="days tracked with at least one restock" />
              {busiestDay
                ? <Stat value={n(busiestDay.restocks)} label={`busiest day, ${dateLabel(busiestDay.date)}${one ? "" : `, at ${plural(busiestDay.stores, "store")}`}`} tone="accent" />
                : <Stat value="–" label="busiest day" tone="muted" />}
              {drop
                ? <Stat value={drop.stores} label={`stores restocked within one half hour, ${zoneStamp(drop.at, c)} (${n(drop.restocks)} configurations): a national drop seen from outside`} />
                : <Stat value={pct(weekend / t.n)} label={`on a Saturday or Sunday (${plural(weekend, "restock")})`} />}
            </StatGrid>
          )}
          <Table caption={`iPhone Duo restocks ${where}, day by day${t.reports.length ? `; the rows marked “reported” are other trackers' published observations for the days before our own tracking began, shown for the timeline only` : ""}`} head={["Date", "Restocks", one ? "" : "Stores", "Busiest hour", "Source"].filter(Boolean)} min="30rem">
            {[...t.daily].reverse().map((d) => (
              <tr key={d.date} className="border-b border-line">
                <th scope="row" className={rowTh}>{dateLabel(d.date)}{today && d.date === today.date ? <span className="text-ink-3"> · so far</span> : ""}</th>
                <td className={td}>{n(d.restocks)}</td>
                {!one && <td className={td}>{d.stores}</td>}
                <td className={td}>{d.peakHour == null ? "–" : rangeLabel(d.peakHour, d.peakHour + 1)}</td>
                <td className="py-2 pr-3 align-top text-ink-3">PickupChecker</td>
              </tr>
            ))}
            {[...t.reports].reverse().map((d) => (
              <tr key={d.date} className="border-b border-line text-ink-3">
                <th scope="row" className="py-2 pr-3 text-left font-medium">{dateLabel(d.date)}</th>
                <td className={td}>{n(d.restocks)}</td>
                {!one && <td className={td}>{d.stores}</td>}
                <td className={td}>{d.peakHour == null ? "–" : rangeLabel(d.peakHour, d.peakHour + 1)}</td>
                <td className="py-2 pr-3 align-top">reported by {reportNames.join(" / ")}</td>
              </tr>
            ))}
          </Table>
          <Keys items={[
            { text: <><b className="text-ink">{dateLabel(DUO_LAUNCH_DAY)}</b>: launch day, the first units for online orders</> },
            { text: <><b className="text-ink">{dateLabel(DUO_PICKUP_RESUMED)}</b>: pickup reservations reopened{us ? " (MacRumors)" : ""}</> },
            t.reports.length
              ? { text: <>Rows marked <b className="text-ink">reported</b>: {reportNames.join(" and ")}&apos;s launch-week observations, never counted</> }
              : { text: <>Our log of every store {where} starts <b className="text-ink">{longDate(t.since)}</b></> },
            ...(t.n > 0 && t.peakWeekday == null ? [{ text: <>Busiest weekday: stated once the data spans <b className="text-ink">{WEEKDAY_MIN_SPAN} days</b> (ours covers {tracked})</>, no: true }] : []),
            { text: <>Read the <b className="text-ink">stores</b> column: the same restocks over more stores is a better day for you</>, step: true },
          ]} />
        </section>

        {/* ---------------------------------------------------------------- where */}
        {!one && (
          <section id="where" className="scroll-mt-24">
            <h2>{h2Of("where")}</h2>
            {regionsHit.length > 0 ? (
              <p><b>{regionsHit[0].name}: {n(regionsHit[0].restocks)} restocks at {regionsHit[0].stores} of its {plural(regionsHit[0].storesTotal, "store")} since {dateLabel(t.since, false)}{regionsHit[1] ? <>, then {regionsHit[1].name} ({n(regionsHit[1].restocks)})</> : null}{regionsHit[2] ? <> and {regionsHit[2].name} ({n(regionsHit[2].restocks)})</> : null}; {regionsHit.length} of {regions.length} {regionNounPlural} have had at least one restock{regions.length - regionsHit.length > 0 ? ` and ${regions.length - regionsHit.length} none yet` : ""}.</b></p>
            ) : (
              <p><b>No {regionNoun} {where} has a confirmed restock yet; the table fills in from the first one.</b></p>
            )}
            {topRegions.length > 0 && (
              <Table caption={`Confirmed iPhone Duo restocks by ${regionNoun} ${where}, ${dateLabel(t.since, false)} to today`} head={[regionNoun[0].toUpperCase() + regionNoun.slice(1), "Restocks", "Stores restocked", "Last restock (local time)"]}>
                {topRegions.map((r) => (
                  <tr key={r.slug} className="border-b border-line">
                    <th scope="row" className={rowTh}><Link href={r.path} className="hover:underline">{r.name}</Link></th>
                    <td className={td}>{n(r.restocks)}</td>
                    <td className={td}>{r.stores} of {r.storesTotal}</td>
                    <td className="py-2 pr-3 align-top">{r.lastAt && r.lastStore ? <>{stamp(r.lastAt, r.lastStore)} · {storeByNumber(r.lastStore) ? <Link href={storePath(storeByNumber(r.lastStore)!)} className="hover:underline">{appleName(storeByNumber(r.lastStore)!)}</Link> : r.lastStore}</> : "–"}</td>
                  </tr>
                ))}
              </Table>
            )}
            {topStores.length > 0 && (
              <Table caption={`The stores with the most iPhone Duo restocks ${where}, ${dateLabel(t.since, false)} to today`} head={["Store", "Restocks", "Days", "Usually around", "Last (local time)"]} min="34rem">
                {topStores.map((r) => (
                  <tr key={r.storeNumber} className="border-b border-line">
                    <th scope="row" className={rowTh}><Link href={storePath(r.store!)} className="hover:underline">{storeName(r.store!)}</Link></th>
                    <td className={td}>{n(r.restocks)}</td>
                    <td className={td}>{r.days}</td>
                    <td className={td}>{r.peakHour != null ? hourLabel(r.peakHour) : "–"}</td>
                    <td className="py-2 pr-3 align-top">{localStamp(r.lastAt, r.store!)}</td>
                  </tr>
                ))}
              </Table>
            )}
            <ol className="my-4 grid gap-3 sm:grid-cols-2">
              <Swap no="The store with the most restocks, wherever it is" yes={`Two or three stores you can reach within an hour of ${pattern ? hourLabel(w.from) : "the morning"}`} why="A restock you cannot reach is not a restock; even the busiest store reads unavailable for all but a few minutes a day." />
              <Swap no="One store, and hope" yes="An alert on each, then drive to the one that fires" why="The count table only tells you which of your stores to drive to first." />
            </ol>
            <ChipLinks items={[{ href: "/iphone-duo-near-me", label: "Stores with the Duo near me, right now" }]} />
          </section>
        )}

        {/* ---------------------------------------------------------------- configuration */}
        <section id="configuration" className="scroll-mt-24">
          <h2>{h2Of("configuration")}</h2>
          {topPart && topPart.restocks > 0 ? (
            <>
              <p><b>{cfg(topPart.partNumber)}: {n(topPart.restocks)} of the {n(t.n)} restocks ({pct(topPart.restocks / t.n)}){lastPart && lastPart.partNumber !== topPart.partNumber ? `; the rarest was the ${cfg(lastPart.partNumber)}, with ${plural(lastPart.restocks, "restock")}` : ""}.</b></p>
              <StatGrid cols={3} className="my-4">
                <Stat value={pct(topPart.restocks / t.n)} label={`${cfg(topPart.partNumber)}: the most-restocked configuration`} tone="accent" />
                {storageTop.length > 1
                  ? <Stat value={n(storageTop[0][1])} label={`${storageTop[0][0]} restocks, against ${n(storageTop[1][1])} for ${storageTop[1][0]}`} />
                  : <Stat value={storageTop[0] ? n(storageTop[0][1]) : "–"} label={storageTop[0] ? `${storageTop[0][0]} restocks` : "by storage"} />}
                {colorTop.length > 1
                  ? <Stat value={n(colorTop[0][1])} label={`${colorTop[0][0]} restocks, against ${n(colorTop[1][1])} for ${colorTop[1][0]}`} />
                  : <Stat value={colorTop[0] ? n(colorTop[0][1]) : "–"} label={colorTop[0] ? `${colorTop[0][0]} restocks` : "by colour"} />}
              </StatGrid>
            </>
          ) : (
            <p><b>No configuration {where} has a confirmed restock{se}; the eight configurations are listed so the first restock has a row to land in.</b></p>
          )}
          <Table caption={`Confirmed iPhone Duo restocks ${where} by configuration, ${dateLabel(t.since, false)} to today`} head={["Configuration", "Restocks", "Share", "Last restock (local time)"]}>
            {parts.map((p) => (
              <tr key={p.partNumber} className="border-b border-line">
                <th scope="row" className={rowTh}>{cfg(p.partNumber)}</th>
                <td className={td}>{n(p.restocks)}</td>
                <td className={td}>{t.n ? pct(p.restocks / t.n) : "–"}</td>
                <td className="py-2 pr-3 align-top">{p.lastAt && p.lastStore ? <>{stamp(p.lastAt, p.lastStore)}{!one && storeByNumber(p.lastStore) ? <> · <Link href={storePath(storeByNumber(p.lastStore)!)} className="hover:underline">{appleName(storeByNumber(p.lastStore)!)}</Link></> : null}</> : "–"}</td>
              </tr>
            ))}
          </Table>
          <Keys items={[
            { text: <>The configuration decision matters <b className="text-ink">more than the store decision</b></> },
            storageRatio != null
              ? { text: <>Live with the most-restocked storage: about <b className="text-ink">{storageRatio}×</b> the odds of the next size</> }
              : { text: <>Live with the most-restocked storage: your odds improve <b className="text-ink">sharply</b></> },
            { text: <>The <b className="text-ink">2TB</b>: a phone you order for delivery and wait for</>, no: true },
            { text: <>Prices and what is in stock right now: <Link href="/which-iphone-duo-restocks-most">Which iPhone Duo restocks most?</Link></>, step: true },
          ]} />
          <Figure id="apple-store-crowd-inside" />
        </section>

        {/* ---------------------------------------------------------------- how long */}
        <section id="how-long" className="scroll-mt-24">
          <h2>{h2Of("how-long")}</h2>
          {sell ? (
            <>
              <p><b>Half of the {n(sell.n)} sold-out restocks {where} were gone within {sell.medianSec} seconds; {pct(sell.within2min)} within 2 minutes and {pct(sell.within20min)} within 20.</b></p>
              <StatGrid cols={4} className="my-4">
                <Stat value={sell.medianSec} unit="s" label="typical listing, listed to gone (median)" tone="accent" />
                <Stat value={pct(sell.within2min)} label="gone within 2 minutes" tone="warn" />
                <Stat value={pct(sell.within20min)} label="gone within 20 minutes" />
                <Stat value={sell.fastestSec} unit="s" label="fastest sell-out measured" />
              </StatGrid>
            </>
          ) : (
            <p><b>Too few sold-out restocks {where} to measure{se}; we state these numbers from ten, and the US page has the full picture.</b></p>
          )}
          <Keys items={[
            { text: <>A two-minute window is caught by an <b className="text-ink">alert</b>, not by refreshing apple.com</> },
            { text: <>This is the number that explains everything else on this page</> },
            { text: <>Every restock with the seconds it lasted, by configuration and {regionNoun}: <Link href="/iphone-duo-sell-out-times">How fast does an iPhone Duo restock sell out?</Link></>, step: true },
          ]} />
          {sell && <Measured>Each figure is the time from the check that first saw the configuration listed to the check that saw it gone, so it is an upper bound; the true lifetimes are shorter.</Measured>}
        </section>

        {/* ---------------------------------------------------------------- unavailable */}
        <section id="unavailable" className="scroll-mt-24">
          <h2>{h2Of("unavailable")}</h2>
          <p><b>Because a restock is a flicker, not a state: {one ? "one store" : `${n(stores.length)} stores`} × {items.length} configurations = {n(pairs)} things that can be in stock {where}, and at this moment {duoNow} {duoNow === 1 ? "store lists" : "stores list"} any iPhone Duo.</b></p>
          <StatGrid cols={3} className="my-4">
            <Stat value={n(pairs)} label="store × configuration pairs that can be in stock" />
            <Stat value={duoNow} label="listing an iPhone Duo for pickup at this moment" live />
            {sell
              ? <Stat value={pct(sell.within2min)} label="of restocks gone inside two minutes" tone="warn" />
              : <Stat value={n(recent.restocks)} label="confirmed restocks in the last 24 hours" />}
          </StatGrid>
          <Keys items={[
            recent.restocks > 0
              ? { text: <>Last 24 hours: <b className="text-ink">{plural(recent.restocks, "confirmed restock")}</b> at {plural(recent.stores, "store")} {where}</> }
              : today && today.restocks > 0
                ? { text: <>Today: <b className="text-ink">{plural(today.restocks, "confirmed restock")}</b> {where}</> }
                : { text: <>The day-by-day table above shows the restocks that did happen</> },
            { text: <>Each one visible on apple.com for <b className="text-ink">a minute or two</b></> },
            { text: <>“Unavailable everywhere” on day four, or day fourteen, is <b className="text-ink">not</b> Apple stopping</>, no: true },
          ]} />
          <ChipLinks items={[
            { href: "/apple-store-pickup-availability-explained", label: "What “currently unavailable for pickup” means" },
            { href: "/how-to-get-an-iphone-duo", label: "How to get an iPhone Duo" },
          ]} />
          <Figure id="apple-store-night-vancouver" />
        </section>

        {/* ---------------------------------------------------------------- reddit */}
        <section id="reddit" className="scroll-mt-24">
          <h2>{h2Of("reddit")}</h2>
          <p><b>Most of the folk wisdom in <a href="https://www.reddit.com/r/applestore/" target="_blank" rel="noopener nofollow">r/applestore</a> and <a href="https://www.reddit.com/r/iphone/" target="_blank" rel="noopener nofollow">r/iphone</a> is sincere, single-store, and stale within a day; here are the four claims we see most often, against {n(t.n)} confirmed restocks {where}.</b></p>
          <Table caption="Common Reddit claims about iPhone Duo restocks, checked against PickupChecker's confirmed restocks" head={["The claim", "What the data says"]} min="30rem">
            <tr className="border-b border-line">
              <th scope="row" className={rowTh}>“Stores restock overnight — check at 3 AM.”</th>
              <td className="py-2 pr-3 align-top">{t.n > 0 ? <>{pct(hourShare(t.byHour, 0, 6))} of restocks fell between midnight and 6 AM local time; {pct(w.share)} fell between {window}.</> : "No restock logged yet to test it against."}</td>
            </tr>
            <tr className="border-b border-line">
              <th scope="row" className={rowTh}>“Apple only restocks on one weekday.”</th>
              <td className="py-2 pr-3 align-top">{t.n > 0 ? (t.peakWeekday != null ? <>{WEEKDAYS[t.peakWeekday]} is the busiest weekday so far ({n(t.byWeekday[t.peakWeekday])} of {n(t.n)}), but restocks landed on {t.days} of {tracked} days.</> : <>Restocks landed on {t.days} of the {tracked} days we have tracked{t.days === tracked ? " with no empty day" : ""}; a busiest weekday is named once the data spans {WEEKDAY_MIN_SPAN} days.</>) : "No restock logged yet to test it against."}</td>
            </tr>
            <tr className="border-b border-line">
              <th scope="row" className={rowTh}>“Call the store and ask when the truck comes.”</th>
              <td className="py-2 pr-3 align-top">Apple publishes no restock schedule; what reaches apple.com is pickup inventory released online, which the store sees at the same moment as everyone else.</td>
            </tr>
            <tr className="border-b border-line">
              <th scope="row" className={rowTh}>“If it says unavailable, it&apos;s sold out for good.”</th>
              <td className="py-2 pr-3 align-top">{recent.restocks > 0 ? <>{plural(recent.restocks, "confirmed restock")} at {plural(recent.stores, "store")} in the last 24 hours say otherwise; each was “unavailable” again within minutes.</> : t.n > 0 ? <>{n(t.n)} confirmed restocks since {dateLabel(t.since, false)} say otherwise; each was “unavailable” again within minutes.</> : "Nothing to test it against yet."}</td>
            </tr>
          </Table>
          <Keys items={[
            { text: <>Rumour is what people reach for when there is <b className="text-ink">no data</b>; this page is the data, free to read</> },
            { text: <>Where Reddit is right: the <b className="text-ink">checkout tips</b> — signed in, Apple Pay ready (<Link href="/how-to-grab-an-iphone-duo-restock">our 20-second version</Link>)</> },
          ]} />
        </section>

        {/* ---------------------------------------------------------------- method */}
        <section id="method" className="scroll-mt-24">
          <h2>{h2Of("method")}</h2>
          <p><b>A restock is counted when apple.com lists a configuration for in-store pickup at a store where it was not listed, confirmed by two checks that agree.</b></p>
          <Keys items={[
            { text: <>{one ? "The Apple Store" : "Every Apple Store"} {where} every <b className="text-ink">{SPEED.checkSec} seconds</b>; the stores alerts point at every <b className="text-ink">{SPEED.fastSec}</b></> },
            { text: <>Other trackers publish <b className="text-ink">{OTHER_TRACKERS}</b>; we compare published numbers only</> },
            { text: <>A first “available” is asked again <b className="text-ink">about a second later</b> before it counts</> },
            { text: <>A listing that disappears is confirmed on the <b className="text-ink">next round</b></> },
            { text: <>The first sighting of a store, a failed or timed-out request: <b className="text-ink">never</b> a restock, never “out of stock”</>, no: true },
            { text: <>Hours and dates in each store&apos;s <b className="text-ink">local time</b>; “waves” = the same half hour across zones</> },
            { text: <>Other trackers&apos; reports{t.reports.length ? ` (${reportNames.join(", ")})` : ""}: their own labelled rows, <b className="text-ink">never in a total</b></> },
            { text: <>Updated about every five minutes; <Link href={logHref}>the restock log</Link> itself is live</>, step: true },
          ]} />
          <p className="text-sm text-ink-3">You are welcome to quote these numbers with a link to this page; PickupChecker is independent and not affiliated with Apple, and reads the same pickup availability anyone can see on apple.com, just far more often.</p>
          <p><Link href={alert} className="btn btn-primary">Set up an iPhone Duo alert{one ? "" : ` ${where}`}</Link></p>
        </section>
      </div>

      <RelatedBlock title="The other iPhone Duo questions">
        <LinkRow title="Answered with the same data" links={[
          { href: "/iphone-duo-sell-out-times", label: "How fast does a restock sell out?" },
          { href: "/iphone-duo-stock-alerts", label: "Fastest way to get notified" },
          { href: "/how-to-get-an-iphone-duo", label: "How to actually get one" },
          { href: "/which-iphone-duo-restocks-most", label: "Which configuration restocks most" },
          { href: "/iphone-duo-near-me", label: "Stores with it near me, right now" },
          { href: "/apple-store-pickup-availability-explained", label: "What “unavailable” means" },
        ]} />
        <LinkRow title={us ? "The same page for other countries" : "Other countries"} links={otherCountries} />
      </RelatedBlock>

      <div className="mt-10"><RichFaq items={faq} facts={facts} title="Questions" /></div>
      <div className="mt-8"><SourceList sources={sources} facts={facts} where={one ? `the Apple Store ${where}` : `all ${stores.length} Apple Stores ${where}`} since={longDate(t.since)} /></div>
    </div>
  );
}
