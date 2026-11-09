/**
 * /iphone-duo-sell-out-times: "How fast does an iPhone Duo restock sell out?" shown rather than written. Every H2 is
 * still a question with one quotable answer sentence under it; everything else is a tile, a table, a keyword line or
 * a swap card, and the measurement notes are folded. Every figure is PickupChecker's own, bounded by two checks.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { Figure } from "@/components/content/Figure";
import { RichFaq, SourceList } from "@/components/content/RichFaq";
import { JsonLd } from "@/components/seo/JsonLd";
import { SellOutTimes } from "@/components/restocks/SellOutTimes";
import { Measured, Points, Stat, StatGrid, Swap, type Point } from "@/components/ui/Viz";
import { getFacts } from "@/lib/content/facts";
import type { Faq, Source } from "@/lib/content/types";
import { STORES, catalogFor, statePath, storeByNumber, storeTimeZone, type CatalogItem } from "@/lib/apple/catalog";
import { COUNTRIES, INTL_CODES, type CountryCode } from "@/lib/apple/countries";
import { OTHER_TRACKERS, SPEED } from "@/lib/plans";
import { TRACKING_SINCE_INTL, TRACKING_SINCE_US, WEEKDAY_MIN_SPAN, localHourDay, siteFacts } from "@/lib/content/siteFacts";
import { duoRestockTimes } from "@/lib/content/restockTimes";
import { STATE_MIN, selloutsByState } from "@/lib/content/selloutStates";
import { serviceStats } from "@/lib/content/serviceStats";
import { ROUND_SEC, medianBand, sellouts, summarize, type SelloutRow, type SelloutSummary } from "@/lib/stock/sellouts";

export const dynamic = "force-dynamic";

const TITLE = "How Fast Does the iPhone Duo Sell Out? Restock Lifetimes";
const DESCRIPTION = "How many seconds an iPhone Duo restock stays listed for Apple Store pickup before it sells out: median, share gone within 30 s and 2 min, by configuration, state and country.";
const APPLE_PICKUP = "https://www.apple.com/shop/shipping-pickup";
const APPLE_NEWSROOM = "https://www.apple.com/newsroom/2026/10/iphone-duo-arrives-at-apple-store-locations-worldwide/";
const WIKI_MEDIAN = "https://en.wikipedia.org/wiki/Median";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} · PickupChecker` },
  description: DESCRIPTION,
  alternates: { canonical: "/iphone-duo-sell-out-times" },
  openGraph: { type: "article", siteName: "PickupChecker", title: TITLE, description: DESCRIPTION, url: "/iphone-duo-sell-out-times" },
};

const n = (x: number) => x.toLocaleString("en-US");
/** Whole-percent shares; a share under half a percent reads "<1%", never a misleading "0%". */
const pct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : `${Math.round(x * 100)}%`);
/** Table cells: to the second. */
const secs = (s: number | null) => (s == null ? "–" : s < 120 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`);
/** Tiles: a listing that stays hours reads as hours, short enough for a big number. */
const life = (s: number | null) => (s == null ? "–" : s < 120 ? `${s} s` : s < 3600 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1)} h`);
const LONG = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
const longDate = (ymd: string) => LONG.format(new Date(`${ymd}T12:00:00Z`));
const cfgName = (i: CatalogItem) => `${i.storage} ${i.color}`;
/** A row is "solid" from this many timed sell-outs; fewer is an anecdote and the table says so. */
const SOLID = 10;
const ABROAD: CountryCode[] = ["ca", "uk", "au", "jp", "de", "fr"];

/** Pure: the sold-out rows grouped by a key, each group summarised, most rows first. Restocks still listed are left out. */
function grouped<K extends string>(rows: SelloutRow[], days: number, keyOf: (r: SelloutRow) => K | undefined): { key: K; s: SelloutSummary }[] {
  const by = new Map<K, number[]>();
  for (const r of rows) {
    if (r.highSec == null) continue;
    const k = keyOf(r);
    if (!k) continue;
    by.set(k, [...(by.get(k) ?? []), r.highSec]);
  }
  return [...by.entries()].map(([key, v]) => ({ key, s: summarize(v, days) })).sort((a, b) => b.s.n - a.s.n);
}

/** Pure: weekday against weekend sell-outs (each store's own local day) and the span of days the rows cover. */
function weekendSplit(rows: SelloutRow[], days: number): { weekday: SelloutSummary; weekend: SelloutSummary; spanDays: number } {
  const wk: number[] = [], we: number[] = [], dates = new Set<string>();
  for (const r of rows) {
    if (r.highSec == null) continue;
    const store = storeByNumber(r.storeNumber);
    const { weekday, date } = localHourDay(new Date(r.at).toISOString(), store ? storeTimeZone(store) : "America/New_York");
    dates.add(date);
    (weekday === 0 || weekday === 6 ? we : wk).push(r.highSec);
  }
  const sorted = [...dates].sort();
  const spanDays = sorted.length ? Math.round((Date.parse(sorted[sorted.length - 1]) - Date.parse(sorted[0])) / 86400_000) + 1 : 0;
  return { weekday: summarize(wk, days), weekend: summarize(we, days), spanDays };
}

function LifeTable({ caption, head, rows }: { caption: string; head: string; rows: { label: ReactNode; s: SelloutSummary }[] }) {
  return (
    <div className="my-4 overflow-x-auto">
      <table className="w-full min-w-[30rem] border-collapse text-sm">
        <caption className="mb-2 text-start text-xs text-ink-3">{caption}</caption>
        <thead>
          <tr className="border-b border-line-2 text-start text-ink">
            <th scope="col" className="py-2 pe-3 font-semibold">{head}</th>
            <th scope="col" className="py-2 pe-3 font-semibold">Sold out</th>
            <th scope="col" className="py-2 pe-3 font-semibold">Half gone within</th>
            <th scope="col" className="py-2 pe-3 font-semibold">≤ 30 s</th>
            <th scope="col" className="py-2 pe-3 font-semibold">≤ 1 min</th>
            <th scope="col" className="py-2 pe-3 font-semibold">Fastest</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line">
              <th scope="row" className="py-2 pe-3 text-start font-medium text-ink">{r.label}</th>
              <td className="py-2 pe-3 tabular-nums">{r.s.n}{r.s.n > 0 && r.s.n < SOLID ? <span className="text-ink-3"> · thin</span> : null}</td>
              <td className="py-2 pe-3 tabular-nums">{secs(r.s.medianSec)}</td>
              <td className="py-2 pe-3 tabular-nums">{r.s.n ? pct(r.s.within30) : "–"}</td>
              <td className="py-2 pe-3 tabular-nums">{r.s.n ? pct(r.s.within60) : "–"}</td>
              <td className="py-2 pe-3 tabular-nums">{secs(r.s.fastestSec)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Keyword lines inside the prose pane (the pane's list indent is turned off). */
function Keys({ items }: { items: Point[] }) {
  return <Points items={items} className="my-3 ml-0!" />;
}

/** A row of page links as chips. */
function ChipLinks({ items }: { items: { href: string; label: string }[] }) {
  return <div className="my-3 flex flex-wrap gap-1.5">{items.map((l) => <Link key={l.href} href={l.href} className="chip chip-sm no-underline!">{l.label}</Link>)}</div>;
}

/** "Reads → means": the legend for every figure on the page. */
function KeyTable({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <div className="my-4 overflow-x-auto">
      <table className="w-full min-w-[20rem] text-sm">
        <thead><tr className="text-start text-xs uppercase tracking-wide text-ink-3"><th className="pb-2 pe-3 font-semibold">Reads</th><th className="pb-2 font-semibold">Means</th></tr></thead>
        <tbody>
          {rows.map(([a, b], i) => (
            <tr key={i} className="border-t border-line align-top">
              <td className="py-2 pe-3 font-semibold tabular-nums text-ink">{a}</td>
              <td className="py-2 text-ink-2">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function SellOutTimesPage() {
  const [us, all, rt, f, facts, abroad, svc] = await Promise.all([
    sellouts({ country: "us", model: "duo", limit: 1000 }),
    sellouts({ country: "us" }),
    duoRestockTimes("us"),
    siteFacts(),
    getFacts(),
    Promise.all(ABROAD.map((cc) => sellouts({ country: cc, model: "duo" }))),
    serviceStats(),
  ]);
  const s = us.summary;
  const days = s.days;
  const have = s.n > 0 && s.medianSec != null;
  // "since October 29, 2026" while the window still reaches back to the first tracked day; "over the last 30 days" after that.
  const sinceLabel = Date.parse(facts.at) - days * 86400_000 <= Date.parse(`${TRACKING_SINCE_US}T00:00:00Z`) ? `since ${longDate(TRACKING_SINCE_US)}` : `over the last ${days} days`;
  const band = have ? medianBand(s.medianSec!) : null;

  const items = catalogFor("duo");
  const byPart = new Map(grouped(us.recent, days, (r) => r.partNumber).map((g) => [g.key, g.s]));
  const configRows = items.map((i) => ({ item: i, s: byPart.get(i.partNumber) ?? summarize([], days) }));
  const solidConfigs = configRows.filter((r) => r.s.n >= SOLID && r.s.medianSec != null).sort((a, b) => a.s.medianSec! - b.s.medianSec!);
  const fastCfg = solidConfigs[0], slowCfg = solidConfigs[solidConfigs.length - 1];

  // The rows above are the most recent timed listings the page loaded (up to 1,000): tables built from them say "since" their oldest one.
  const byState = selloutsByState(us.recent, (num) => storeByNumber(num)?.state);
  const recentSince = byState.from ? LONG.format(new Date(byState.from)) : null;
  const timedRecent = us.recent.filter((r) => r.highSec != null).length;
  const topState = byState.rows[0] ?? byState.thin[0] ?? null;
  const topStateMedian = byState.rows[0] ? byState.rows[0].medianSec : null;
  const solidRegions = [...byState.rows].sort((a, b) => a.medianSec - b.medianSec);
  const fastSt = solidRegions[0], slowSt = solidRegions[solidRegions.length - 1];
  const push7 = svc.delivery["7d"].push;

  const wk = weekendSplit(us.recent, days);
  const weekendKnown = wk.spanDays >= WEEKDAY_MIN_SPAN && wk.weekday.n >= SOLID && wk.weekend.n >= SOLID && wk.weekday.medianSec != null && wk.weekend.medianSec != null;

  const pro = all.byModel["18-pro"], pm = all.byModel["18-pro-max"];
  const ds = f.duoSellout;
  const sel = rt.sellout;
  const countries = ABROAD.map((cc, i) => ({ cc, s: abroad[i].summary })).sort((a, b) => b.s.n - a.s.n);
  const timedAbroad = countries.filter((c) => c.s.n > 0 && c.s.medianSec != null);

  const sections = [
    { id: "stay", nav: "How long it lasts", h2: "How long does an iPhone Duo restock stay available?" },
    { id: "configurations", nav: "By storage and color", h2: "Does it differ by storage and color?" },
    { id: "states", nav: "By state", h2: "Is it faster in some cities or states?" },
    { id: "countries", nav: "Other countries", h2: "How does it compare in other countries?" },
    { id: "trackers", nav: "Slow trackers", h2: "What does this mean for a stock tracker that checks every few minutes?" },
    { id: "method", nav: "How it is measured", h2: "How is a sell-out time measured?" },
    { id: "unavailable", nav: "Why always unavailable", h2: "Why does every store say unavailable, then?" },
  ];

  const faq: Faq[] = [
    { q: "How long do I have once I see the iPhone Duo in stock?", a: have
      ? `Assume under a minute: half of the ${n(s.n)} iPhone Duo restocks timed ${sinceLabel} were gone within ${s.medianSec} seconds, ${pct(s.within30)} within 30, and the fastest within ${s.fastestSec} seconds. Be on the configuration's buy page with pickup chosen before the alert arrives, not after.`
      : "Assume under a minute. No sold-out restock is in the current window to time, but every iPhone Duo restock we have logged was measured in seconds between two checks, and this answer refills with the next one." },
    { q: "Which iPhone Duo configuration sells out fastest?", a: fastCfg
      ? `${cfgName(fastCfg.item)}, with a median of ${fastCfg.s.medianSec} seconds over ${fastCfg.s.n} sold-out restocks${slowCfg && slowCfg !== fastCfg ? `, against ${slowCfg.s.medianSec} seconds for ${cfgName(slowCfg.item)}, the slowest with at least ${SOLID}` : ""}. The spread is seconds and every configuration is gone in about a minute, so pick the one you want.`
      : `Too early to rank: no configuration has ${SOLID} timed sell-outs in the window yet, and we do not rank a handful of restocks. The table above marks the thin rows; this answer fills in by itself.` },
    { q: "Are iPhone Duo restocks slower to sell out on weekends?", a: weekendKnown
      ? `Not by much: weekend restocks sold out in a median of ${wk.weekend.medianSec} seconds (${wk.weekend.n} timed) against ${wk.weekday.medianSec} seconds on weekdays (${wk.weekday.n}), measured in each store's own local day over ${wk.spanDays} days.`
      : `Not knowable yet: a weekday pattern needs restocks spanning at least ${WEEKDAY_MIN_SPAN} days, and our timed sell-outs span ${wk.spanDays}. This answer switches to the measured medians once the span is reached.` },
    { q: "Is 30 seconds enough to check out?", a: `Yes, if everything is ready before the alert: signed in to your Apple Account on apple.com, Apple Pay or a saved card, and the configuration's buy page already open so you only change the pickup store. Once the pickup order is placed, Apple holds the phone for you at that store ([Apple: Delivery and Pickup](${APPLE_PICKUP})).` },
    { q: "Where do these numbers come from?", a: `From PickupChecker's own checks of apple.com in-store pickup availability at all ${STORES.length} US Apple Stores since ${longDate(TRACKING_SINCE_US)} (every ${SPEED.checkSec} seconds, every ${SPEED.fastSec} for stores with alerts) and at the stores of ${INTL_CODES.length} other countries since ${longDate(TRACKING_SINCE_INTL)}. Only restocks confirmed by two agreeing checks enter, other trackers' reports are never counted, and PickupChecker is independent and not affiliated with Apple.` },
  ];
  const sources: Source[] = [
    { label: "Apple: Delivery and Pickup (how in-store pickup availability and holds work)", url: APPLE_PICKUP },
    { label: "Apple Newsroom: iPhone Duo arrives at Apple Store locations worldwide (October 23, 2026)", url: APPLE_NEWSROOM },
    { label: "Wikipedia: Median", url: WIKI_MEDIAN },
  ];

  const site = "https://pickupchecker.com";
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${site}/iphone-duo-sell-out-times`, url: `${site}/iphone-duo-sell-out-times`, name: TITLE, description: DESCRIPTION, isPartOf: { "@id": `${site}/#website` }, about: { "@id": `${site}/#organization` }, dateModified: facts.at },
      {
        "@type": "Dataset", "@id": `${site}/iphone-duo-sell-out-times#dataset`, name: "iPhone Duo restock sell-out times at US Apple Stores",
        description: `How many seconds each confirmed iPhone Duo restock stayed listed for in-store pickup at a US Apple Store before it sold out, bounded by two PickupChecker checks ${SPEED.fastSec}–${SPEED.checkSec} seconds apart, with the median and the shares gone within 30 seconds, 1 minute, 2 minutes and 20 minutes, by configuration, state and country.`,
        url: `${site}/iphone-duo-sell-out-times`, creator: { "@id": `${site}/#organization` }, isAccessibleForFree: true,
        temporalCoverage: `${TRACKING_SINCE_US}/..`, spatialCoverage: "Apple Stores in the United States, with Canada, the UK, Australia, Japan, Germany and France for comparison",
        variableMeasured: ["Apple Store", "iPhone Duo storage and color", "restock time", "sell-out time", "seconds listed (lower and upper bound)"],
        measurementTechnique: `Seconds from the PickupChecker check that first saw the configuration listed to the check that saw it gone; checks every ${SPEED.checkSec} seconds, every ${SPEED.fastSec} for stores with alerts; two agreeing checks required; first sightings excluded`,
        ...(have ? { size: `${s.n} sold-out restocks` } : {}),
      },
    ],
  };

  /** The longer view the module above does not show (2 and 20 minutes), then the other iPhones for contrast. */
  const longerTiles: { value: ReactNode; unit?: string; label: string; tone: "warn" | "plain" | "muted" }[] = have
    ? [
      sel ? { value: pct(sel.within2min), label: `gone within 2 minutes (all ${n(sel.n)} timed since ${longDate(TRACKING_SINCE_US)})`, tone: "warn" } : { value: pct(s.within120), label: "gone within 2 minutes", tone: "warn" },
      ...(sel ? [{ value: pct(sel.within20min), label: "gone within 20 minutes", tone: "plain" as const }] : []),
      ...(pro?.medianSec != null ? [{ value: life(pro.medianSec), label: "iPhone 18 Pro: median listing, same window", tone: "muted" as const }] : []),
      ...(pm?.medianSec != null ? [{ value: life(pm.medianSec), label: "iPhone 18 Pro Max: median listing, same window", tone: "muted" as const }] : []),
    ]
    : [];

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10">
      <JsonLd data={ld} />
      <h1 className="display text-3xl sm:text-5xl">How fast does an iPhone Duo restock sell out?</h1>
      <p className="mt-4 text-lg text-ink-2">
        {have
          ? <>A typical iPhone Duo restock at a US Apple Store sold out in <b className="text-ink">about {band}</b>: the median is <b className="text-ink">{s.medianSec} seconds</b> over {n(s.n)} sold-out restocks {sinceLabel}.</>
          : <>No iPhone Duo restock at a US Apple Store has sold out inside the last {days} days of our log, so there is no sell-out time to quote yet; the tiles fill in with the next restock.</>}
      </p>
      <p className="mt-2 text-sm text-ink-3">
        <b className="text-ink-2">What &ldquo;sold out&rdquo; means here:</b> a sell-out time is how long Apple&apos;s pickup page listed one configuration at one store, from the check that first saw it to the first check that did not ({SPEED.fastSec}–{SPEED.checkSec} seconds apart). It is not a count of units sold (Apple publishes none), and a short listing is not a measure of your chance to buy one.
      </p>
      <StatGrid cols={3} className="mt-6">
        <Stat value={have ? s.medianSec : "–"} unit={have ? "s" : undefined} label="typical listing, listed to gone (median)" tone="accent" />
        <Stat value={have ? pct(s.within30) : "–"} label="gone within 30 seconds" tone="warn" />
        <Stat value={n(s.n)} label={`timed sell-outs ${sinceLabel}`} />
      </StatGrid>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/#notify" className="btn btn-primary">Alert me when my store restocks</Link>
        <a href="#stay" className="btn btn-ghost">Every restock, in seconds</a>
      </div>
      <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2 text-sm">
        {sections.map((x) => <a key={x.id} href={`#${x.id}`} className="chip px-3 py-1.5 text-xs">{x.nav}</a>)}
      </nav>

      <div className="pane prose-site mt-8 p-6 sm:p-8">
        {/* ---------------------------------------------------------------- how long */}
        <section id="stay" className="scroll-mt-24">
          <h2>{sections[0].h2}</h2>
          <p><b>{have
            ? `About ${band}: half of the ${n(s.n)} iPhone Duo restocks that sold out ${sinceLabel} were gone within ${s.medianSec} seconds, ${pct(s.within60)} within a minute, and the fastest within ${s.fastestSec} seconds.`
            : `There is no timed sell-out in the last ${days} days to answer with yet; every earlier iPhone Duo restock we logged was measured in seconds between two checks.`}</b></p>
          <Keys items={[
            { text: <>One line = <b className="text-ink">one restock at one store</b>, local time</> },
            { text: <><b className="text-ink">45–60 s</b> = two checks; one figure = both agreed</> },
            { text: <><b className="text-ink">still listed</b> = not sold out yet, counting up</> },
            { text: <>The same list, one store at a time, on <Link href="/stores">every store page</Link></>, step: true },
          ]} />
          <div className="my-5"><SellOutTimes data={us} label="at US Apple Stores" showStore limit={12} /></div>
          {longerTiles.length > 0 && (
            <StatGrid cols={longerTiles.length >= 4 ? 4 : longerTiles.length === 3 ? 3 : 2} className="my-4">
              {longerTiles.map((t) => <Stat key={t.label} value={t.value} unit={t.unit} label={t.label} tone={t.tone} />)}
            </StatGrid>
          )}
          <Measured title="The longer view, and the other iPhones">
            {sel ? <>The 2-minute and 20-minute shares count every timed Duo sell-out since {longDate(TRACKING_SINCE_US)} ({n(sel.n)}); the other figures are the last {days} days. </> : null}
            Stores with alerts are checked every {SPEED.fastSec} seconds and every other store every {ROUND_SEC}, so no range is wider than that. The iPhone 18 Pro figures are the same window, for contrast: the Duo is the only iPhone where seconds decide.
          </Measured>
          <Figure id="night-line" />
        </section>

        {/* ---------------------------------------------------------------- by configuration */}
        <section id="configurations" className="scroll-mt-24">
          <h2>{sections[1].h2}</h2>
          <p><b>{solidConfigs.length >= 2 && fastCfg && slowCfg
            ? `A little, and not enough to plan around: among configurations with at least ${SOLID} timed sell-outs, the median runs from ${fastCfg.s.medianSec} seconds (${cfgName(fastCfg.item)}) to ${slowCfg.s.medianSec} seconds (${cfgName(slowCfg.item)}).`
            : solidConfigs.length === 1 && fastCfg
              ? `Only ${cfgName(fastCfg.item)} has ${SOLID} or more timed sell-outs so far (median ${fastCfg.s.medianSec} seconds over ${fastCfg.s.n}); every other row is a handful of restocks, so there is no ranking yet.`
              : `Not knowable yet: no configuration has ${SOLID} timed sell-outs in the window, so the rows below are anecdotes rather than a ranking.`}</b></p>
          <LifeTable head="Configuration" caption={`Seconds each iPhone Duo configuration stayed listed before it sold out, US Apple Stores, ${recentSince ? `the ${n(timedRecent)} timed listings since ${recentSince}` : `last ${days} days`}; "thin" = under ${SOLID} sell-outs`} rows={configRows.map((r) => ({ label: cfgName(r.item), s: r.s }))} />
          <Keys items={[
            { text: <>Rows under <b className="text-ink">{SOLID}</b> sell-outs: marked thin, not ranked</> },
            { text: <>Alert stores timed at <b className="text-ink">{SPEED.fastSec} s</b>, the rest at <b className="text-ink">{ROUND_SEC} s</b>: our resolution, not demand</> },
          ]} />
          <ol className="my-4 grid gap-3 sm:grid-cols-2">
            <Swap no="Pick the color that looks slowest to sell" yes="Pick the storage and color you want to own" why="The gap between rows is seconds; an alert sent within seconds of the restock is what decides it." />
            <Swap no="Guess which configuration comes back" yes={<Link href="/which-iphone-duo-restocks-most">Which iPhone Duo restocks most</Link>} why="A different question, answered by configuration and by store." />
          </ol>
        </section>

        {/* ---------------------------------------------------------------- by state */}
        <section id="states" className="scroll-mt-24">
          <h2>{sections[2].h2}</h2>
          <p><b>{topState && byState.all.medianSec != null
            ? `${topState.state} has the most timed iPhone Duo listings (${n(topState.n)}${topStateMedian != null ? `, median ${topStateMedian} seconds` : ""}), against a median of ${byState.all.medianSec} seconds over all ${n(byState.all.n)} US listings timed since ${recentSince}${solidRegions.length >= 2 && fastSt && slowSt && fastSt !== slowSt ? `; among the ${byState.rows.length} states with at least ${STATE_MIN}, ${fastSt.state} has the shortest median listing (${fastSt.medianSec} seconds) and ${slowSt.state} the longest (${slowSt.medianSec}).` : "; no second state has enough timed listings for a fair comparison yet."}`
            : `No state has a timed iPhone Duo listing in the last ${days} days, so there is nothing to compare yet.`}</b></p>
          {byState.rows.length > 0 && (
            <div className="my-4 overflow-x-auto">
              <table className="w-full min-w-[30rem] border-collapse text-sm">
                <caption className="mb-2 text-start text-xs text-ink-3">{`Every US state with at least ${STATE_MIN} timed iPhone Duo listings, most first, out of ${n(byState.all.n)} timed since ${recentSince}. Median: half of the state's listings ended sooner. The shares: listings gone within 30 seconds and within 2 minutes. Listing time on Apple's pickup page, not units sold.`}</caption>
                <thead>
                  <tr className="border-b border-line-2 text-start text-ink">
                    <th scope="col" className="py-2 pe-3 font-semibold">State</th>
                    <th scope="col" className="py-2 pe-3 font-semibold">Timed listings</th>
                    <th scope="col" className="py-2 pe-3 font-semibold">Median listing</th>
                    <th scope="col" className="py-2 pe-3 font-semibold">≤ 30 s</th>
                    <th scope="col" className="py-2 pe-3 font-semibold">≤ 2 min</th>
                  </tr>
                </thead>
                <tbody>
                  {byState.rows.map((r) => (
                    <tr key={r.state} className="border-b border-line">
                      <th scope="row" className="py-2 pe-3 text-start font-medium text-ink"><Link href={statePath(r.state)} className="underline-offset-2 hover:underline">{r.state}</Link></th>
                      <td className="py-2 pe-3 tabular-nums">{n(r.n)}</td>
                      <td className="py-2 pe-3 tabular-nums">{secs(r.medianSec)}</td>
                      <td className="py-2 pe-3 tabular-nums">{pct(r.within30)}</td>
                      <td className="py-2 pe-3 tabular-nums">{pct(r.within120)}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-line text-ink-3">
                    <th scope="row" className="py-2 pe-3 text-start font-medium">All US states</th>
                    <td className="py-2 pe-3 tabular-nums">{n(byState.all.n)}</td>
                    <td className="py-2 pe-3 tabular-nums">{secs(byState.all.medianSec)}</td>
                    <td className="py-2 pe-3 tabular-nums">{pct(byState.all.within30)}</td>
                    <td className="py-2 pe-3 tabular-nums">{pct(byState.all.within120)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          {byState.thin.length > 0 && (
            <p className="text-sm text-ink-3">Fewer than {STATE_MIN} timed listings, so not ranked: {byState.thin.map((r, i) => <span key={r.state}>{i ? ", " : ""}<Link href={statePath(r.state)} className="underline-offset-2 hover:underline">{r.state}</Link> ({r.n})</span>)}.</p>
          )}
          <Keys items={[
            { text: <>Big states lead: <b className="text-ink">more stores</b>, not faster shoppers</> },
            { text: <>Alert stores timed at <b className="text-ink">{SPEED.fastSec} s</b>, others at <b className="text-ink">{ROUND_SEC} s</b>: up to {ROUND_SEC - SPEED.fastSec} s wider</> },
            { text: <>Grouped by <b className="text-ink">state</b>: a city&apos;s handful of sell-outs is not a speed</> },
            { text: <>Same table on each <Link href="/stores">state page</Link>; the {STORES.length} store pages list restock by restock</>, step: true },
          ]} />
        </section>

        {/* ---------------------------------------------------------------- other countries */}
        <section id="countries" className="scroll-mt-24">
          <h2>{sections[3].h2}</h2>
          <p><b>{timedAbroad[0]
            ? `Early and thin: the other countries have been tracked only since ${longDate(TRACKING_SINCE_INTL)}. ${COUNTRIES[timedAbroad[0].cc].name} has the most timed iPhone Duo sell-outs so far (${timedAbroad[0].s.n}, median ${timedAbroad[0].s.medianSec} seconds)${have ? `, against ${s.medianSec} seconds in the US` : ""}.`
            : `No sold-out iPhone Duo restock has been timed outside the US yet; tracking of the other ${INTL_CODES.length} countries began on ${longDate(TRACKING_SINCE_INTL)}.`}</b></p>
          <LifeTable head="Country" caption={`iPhone Duo sell-out times by country; the US since ${longDate(TRACKING_SINCE_US)}, the others since ${longDate(TRACKING_SINCE_INTL)}`} rows={[
            { label: <Link href="/" className="underline-offset-2 hover:underline">United States</Link>, s },
            ...countries.map((c) => ({ label: <Link href={`/${c.cc}`} className="underline-offset-2 hover:underline">{COUNTRIES[c.cc].name}</Link>, s: c.s })),
          ]} />
          <Keys items={[
            { text: <>Under <b className="text-ink">{SOLID}</b> sell-outs: a first look, not a finding</> },
            { text: <>Each country page: the same table, <b className="text-ink">every store</b>, filling in by itself</>, step: true },
          ]} />
          <ChipLinks items={[{ href: "/ca", label: "Canada" }, { href: "/uk", label: "United Kingdom" }, { href: "/au", label: "Australia" }, { href: "/jp", label: "Japan" }, { href: "/de", label: "Germany" }, { href: "/fr", label: "France" }]} />
        </section>

        {/* ---------------------------------------------------------------- slow trackers */}
        <section id="trackers" className="scroll-mt-24">
          <h2>{sections[4].h2}</h2>
          <p><b>{ds
            ? `It misses most of them: over the last 7 days (${n(ds.n)} timed iPhone Duo sell-outs), a tracker checking a store every 5 minutes would have seen about ${pct(ds.caught.m5)} of the restocks, one checking every 15 minutes about ${pct(ds.caught.m15)}, and one checking every minute only about ${pct(ds.caught.m1)}.`
            : "It misses most of them: a listing that is gone before the next check comes round is never seen at all, and the catch rates below are computed from the last 7 days as soon as 20 sell-outs have been timed."}</b></p>
          {ds && (
            <StatGrid cols={4} className="my-4">
              <Stat value={pct(ds.caught.m1)} label="of Duo restocks seen by a tracker checking every minute" tone="warn" />
              <Stat value={pct(ds.caught.m5)} label="seen when checking every 5 minutes" tone="warn" />
              <Stat value={pct(ds.caught.m15)} label="seen when checking every 15 minutes" tone="warn" />
              {push7
                ? <Stat value={push7.p50Sec.toFixed(1)} unit="s" label={`PickupChecker, last 7 days: first check that saw a restock to the push accepted by Apple or Google (median, ${n(push7.events)} restocks; arrival on the phone is not measured)`} tone="accent" />
                : <Stat value={`~${SPEED.alertSec}`} unit="s" label="PickupChecker's planned time from a confirmed restock to the push being sent (not yet measured here)" tone="accent" />}
            </StatGrid>
          )}
          <ol className="my-4 grid gap-3 sm:grid-cols-2">
            <Swap no="A check every few minutes" yes={`A check every ${SPEED.fastSec} seconds`} why={band ? `A listing that lasts about ${band} is often gone between two slow checks.` : "A listing that lasts seconds is often gone between two slow checks."} />
            <Swap no="Refreshing apple.com by hand" yes="An alert on two or three stores" why={`Your stores every ${SPEED.fastSec} seconds, every other Apple Store every ${SPEED.checkSec}; a first "available" is confirmed about a second later and the push is sent ${push7 ? `a median ${push7.p50Sec.toFixed(1)} seconds after that first sighting (last 7 days)` : `about ${SPEED.alertSec} seconds after that`}.`} />
          </ol>
          <Keys items={[
            { text: <>Other trackers state intervals of <b className="text-ink">{OTHER_TRACKERS}</b>, their own claims (<Link href="/iphone-stock-tracker-comparison">compared</Link>)</> },
            { text: <><Link href="/iphone-duo-stock-alerts">What one alert covers</Link> · <Link href="/pricing">what it costs</Link></>, step: true },
          ]} />
          <Measured>
            A listing that lasts d seconds is caught by a check that comes every T seconds with probability d divided by T, capped at one. Our durations are upper bounds, because the sell-out happened some time before the check that saw it, so these catch rates flatter the slow trackers and never us.
          </Measured>
          <Figure id="phone-hand-camera" />
        </section>

        {/* ---------------------------------------------------------------- method */}
        <section id="method" className="scroll-mt-24">
          <h2>{sections[5].h2}</h2>
          <p><b>As the seconds between the check that first saw a configuration listed for pickup and the check that saw it gone, at every US Apple Store since {longDate(TRACKING_SINCE_US)}.</b></p>
          <KeyTable rows={[
            ["45–60 s", <>Still listed at the check 45 seconds after it appeared, gone at the check 60 seconds after</>],
            ["60 s", <>Both checks agreed to the second</>],
            ["sold out", <>Apple&apos;s pickup page stopped listing that configuration at that store; not a count of units sold, which Apple does not publish</>],
            ["still listed", <>Not sold out yet; the figure counts up</>],
            ["≈", <>The oldest rows: bounded by the {ROUND_SEC}-second round, not by two exact checks</>],
            ["thin", <>Under {SOLID} sell-outs; not ranked</>],
            ["median", <>The <a href={WIKI_MEDIAN} target="_blank" rel="noopener">middle value</a>: half lasted less, half more; never the average</>],
          ]} />
          <Keys items={[
            { text: <>Two agreeing checks about <b className="text-ink">1 s</b> apart = one restock</> },
            { text: <>A sell-out is confirmed on the <b className="text-ink">next round</b></> },
            { text: <>First sightings excluded: launch days before <b className="text-ink">{longDate(TRACKING_SINCE_US)}</b></> },
            { text: <>Alert stores every <b className="text-ink">{SPEED.fastSec} seconds</b>, all others every <b className="text-ink">{ROUND_SEC}</b></> },
            { text: <>A one-response glitch never enters the log</>, no: true },
          ]} />
          <Measured title="The honest caveat">
            A listing shorter than one check can appear and vanish between two checks and never be recorded at all. The share gone within 20–30 seconds is therefore a floor, and the true figure is higher than any table on this page shows.
          </Measured>
        </section>

        {/* ---------------------------------------------------------------- why unavailable */}
        <section id="unavailable" className="scroll-mt-24">
          <h2>{sections[6].h2}</h2>
          <p><b>{band
            ? `Because you are looking between restocks: a listing that lasts about ${band} is visible for that long and "currently unavailable" for the rest of the day.`
            : "Because you are looking between restocks: a listing that lasts seconds is visible for those seconds and \"currently unavailable\" for the rest of the day."}</b></p>
          <Keys items={[
            { text: <><a href={APPLE_PICKUP} target="_blank" rel="noopener">Apple&apos;s pickup page</a> shows what a store can hand over <b className="text-ink">now</b>, never when the next batch lands</> },
            { text: <>iPhone Duo in Apple Stores since <a href={APPLE_NEWSROOM} target="_blank" rel="noopener"><b className="text-ink">October 23, 2026</b></a></> },
            { text: <>Bought out faster than it arrives: <b className="text-ink">unavailable</b> is the normal state</>, no: true },
            { text: <>Our part: sending the push within seconds, while the listing is still there to reserve</>, step: true },
          ]} />
          <ChipLinks items={[
            { href: "/iphone-duo-restock-times", label: "When Apple restocks the iPhone Duo" },
            { href: "/apple-store-pickup-availability-explained", label: "How pickup availability works" },
          ]} />
          <Figure id="apple-store-crowd-inside" />
        </section>
        <p><Link href="/#notify" className="btn btn-primary">Alert me when my store restocks</Link></p>
      </div>
      <div className="mt-10"><RichFaq items={faq} facts={facts} title="Questions" /></div>
      <div className="mt-8"><SourceList sources={sources} facts={facts} where={`all ${STORES.length} US Apple Stores (and the stores of ${INTL_CODES.length} other countries since ${longDate(TRACKING_SINCE_INTL)})`} since={longDate(TRACKING_SINCE_US)} /></div>
    </div>
  );
}
