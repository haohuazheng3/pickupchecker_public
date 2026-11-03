/**
 * /iphone-duo-near-me: "Which Apple Stores have the iPhone Duo near me right now?" The finder does the work; the
 * sections under it keep one quotable answer sentence per question and show the rest as tiles, steps, swap cards,
 * tables and keyword lines. Every number is live and PickupChecker's own.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { Figure } from "@/components/content/Figure";
import { RichFaq, SourceList } from "@/components/content/RichFaq";
import { JsonLd } from "@/components/seo/JsonLd";
import { NearMeFinder, type NearMeData } from "@/components/content/NearMeFinder";
import { Measured, Points, Stat, StatGrid, Swap, type Point } from "@/components/ui/Viz";
import { getFacts, tokenValue } from "@/lib/content/facts";
import type { Faq, Source } from "@/lib/content/types";
import { PART_INDEX, STORES, appleName, catalogFor, cityLine, stateCodeOf, statePath, storeByNumber, storePath, type Store } from "@/lib/apple/catalog";
import { INTL_CODES } from "@/lib/apple/countries";
import { SPEED } from "@/lib/plans";
import { TRACKING_SINCE_US, hourLabel, localStamp } from "@/lib/content/siteFacts";
import { busiestWindow, duoRestockTimes } from "@/lib/content/restockTimes";
import { medianBand } from "@/lib/stock/sellouts";
import { recentByConfig } from "@/lib/stock/recent";
import { stockByStore } from "@/lib/stock/queries";
import { alertHref, itemListJsonLd, listWords, plural } from "@/lib/seo/enrich";

export const dynamic = "force-dynamic";

const TITLE = "iPhone Duo in Stock Near Me: Apple Stores With It Now";
const DESCRIPTION = `Which of the ${STORES.length} US Apple Stores list the iPhone Duo for pickup right now, sorted by distance from you or your ZIP, with each store's configurations and an alert. Checked every ${SPEED.checkSec} s.`;
const APPLE_STORES = "https://www.apple.com/retail/storelist/";
const CENSUS_GAZETTEER = "https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html";
const APPLE_PICKUP = "https://www.apple.com/shop/shipping-pickup";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} · PickupChecker` },
  description: DESCRIPTION,
  alternates: { canonical: "/iphone-duo-near-me" },
  openGraph: { type: "article", siteName: "PickupChecker", title: TITLE, description: DESCRIPTION, url: "/iphone-duo-near-me" },
};

const n = (x: number) => x.toLocaleString("en-US");
/** Whole-percent shares; a share under half a percent reads "<1%", never a misleading "0%". */
const pct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : `${Math.round(x * 100)}%`);
const LONG = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
const longDate = (ymd: string) => LONG.format(new Date(`${ymd}T12:00:00Z`));

type Now = { store: Store; parts: string[] };

/** Keyword lines inside the prose pane (the pane's list indent is turned off). */
function Keys({ items }: { items: Point[] }) {
  return <Points items={items} className="my-3 ml-0!" />;
}

/** A row of page links as chips. */
function ChipLinks({ items }: { items: { href: string; label: string }[] }) {
  return <div className="my-3 flex flex-wrap gap-1.5">{items.map((l) => <Link key={l.href} href={l.href} className="chip chip-sm no-underline!">{l.label}</Link>)}</div>;
}

/** Numbered step cards: a title and a one-line hint each. */
function Steps({ steps }: { steps: { title: ReactNode; hint: ReactNode }[] }) {
  return (
    <ol className="my-4 grid gap-3 sm:grid-cols-3">
      {steps.map((s, i) => (
        <li key={i} className="pane-2 flex gap-3 p-4">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-[var(--accent-ink)]">{i + 1}</span>
          <span className="min-w-0 text-sm leading-snug"><span className="block font-semibold text-ink">{s.title}</span><span className="mt-1 block text-xs text-ink-3">{s.hint}</span></span>
        </li>
      ))}
    </ol>
  );
}

/** "Figure → how it is made": the legend for the finder's distances. */
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

export default async function NearMePage() {
  const [rows, recent, rt, facts] = await Promise.all([stockByStore("duo"), recentByConfig({ country: "us" }), duoRestockTimes("us"), getFacts()]);
  const items = catalogFor("duo");
  const cfg = (p: string) => { const i = PART_INDEX.get(p); return i ? `${i.storage} ${i.color}` : p; };
  // stockByStore answers [] both for "no rows" and for a read that failed; a status row exists for every tracked store, so [] means unreadable.
  const unknown = rows.length === 0;
  const now: Now[] = rows
    .filter((r) => r.availableParts.length > 0)
    .map((r) => ({ store: storeByNumber(r.storeNumber), parts: r.availableParts }))
    .filter((x): x is Now => Boolean(x.store))
    .sort((a, b) => a.store.state.localeCompare(b.store.state) || a.store.city.localeCompare(b.store.city) || a.store.name.localeCompare(b.store.name));
  const count = now.length;
  const byState = new Map<string, Now[]>();
  for (const x of now) byState.set(x.store.state, [...(byState.get(x.store.state) ?? []), x]);
  const states = [...byState.keys()].sort();
  const asOf = tokenValue("asOf", facts) ?? "";
  const win = busiestWindow(rt.byHour);
  const hasPattern = rt.n > 0 && !rt.unknown;
  const winLabel = `${hourLabel(win.from)} and ${hourLabel(win.to)}`;
  const top: { store: Store; restocks: number }[] = [];
  for (const t of rt.topStores.slice(0, 3)) { const store = storeByNumber(t.storeNumber); if (store) top.push({ store, restocks: t.restocks }); }
  const latest = recent.latest ? { ...recent.latest, store: storeByNumber(recent.latest.storeNumber) } : null;
  const sell = rt.sellout;
  /** "about 60–80 seconds" from the timed sell-outs, or a wording that claims no number while there are none. */
  const lasts = sell ? `about ${medianBand(sell.medianSec)}` : "seconds to a few minutes";
  const alert = alertHref({ model: "duo" });

  const data: NearMeData = {
    stock: Object.fromEntries(now.map((x) => [x.store.storeNumber, x.parts.map(cfg)])),
    total: items.length,
    alertPattern: alertHref({ model: "duo", store: "STORE_NUMBER" }),
    asOf,
  };

  const sections = [
    { id: "now", nav: "Stores with it now", h2: "Which Apple Stores have the iPhone Duo right now?" },
    { id: "find", nav: "Find the nearest", h2: "How do I find the nearest Apple Store with iPhone Duo stock?" },
    { id: "best", nav: "Nearest vs busiest", h2: "Is the nearest store the best one to watch?" },
    { id: "ai", nav: "Any state", h2: "Does \"near me\" work when an AI assistant reads this page?" },
    { id: "distance", nav: "What distance means", h2: "What does the distance mean?" },
  ];

  const faq: Faq[] = [
    { q: "Why does my nearest store never show stock?", a: sell
      ? `Because an iPhone Duo listing lasts about ${medianBand(sell.medianSec)}: half of the ${n(sell.n)} restocks we timed were gone within ${sell.medianSec} seconds, so the page you refresh is almost always between restocks. [How fast the iPhone Duo sells out](/iphone-duo-sell-out-times) has the full numbers; an alert replaces the refreshing.`
      : "Because an iPhone Duo listing lasts seconds to a few minutes, so the page you refresh is almost always between restocks. [How fast the iPhone Duo sells out](/iphone-duo-sell-out-times) measures each one; an alert replaces the refreshing." },
    { q: "Can I search by ZIP without sharing my location?", a: "Yes: type a 5-digit ZIP and the stores are ranked from its Census center; the browser only fetches a small file of ZIP centers chosen by the first three digits, and nothing about you is sent or stored. If you do use your location, it stays on your device, rounded to about a kilometer, so the next page can use it without asking again." },
    { q: "Does the page show stores outside the US?", a: `No, this page ranks the ${STORES.length} US Apple Stores. The ${INTL_CODES.length} other countries PickupChecker tracks each have their own home page with live iPhone Duo stock and the same store pages: [Canada](/ca), [the UK](/uk), [Australia](/au), [Japan](/jp), [Germany](/de), [France](/fr) and the rest from the country switch in the header.` },
    { q: "How current is \"right now\"?", a: `The list on this page was rendered at ${asOf}, from checks of every US Apple Store every ${SPEED.checkSec} seconds and of stores with alerts every ${SPEED.fastSec}, and a store is shown with stock only after two consecutive checks agree. Reload for a fresh list; the finder's snapshot is the one you loaded.` },
    { q: "Can PickupChecker reserve the iPhone Duo for me?", a: `No: PickupChecker tells you the moment a store lists your configuration for pickup, and you reserve it yourself on apple.com, where Apple holds it for you at that store ([Apple: Delivery and Pickup](${APPLE_PICKUP})). PickupChecker is independent and not affiliated with Apple.` },
  ];
  const sources: Source[] = [
    { label: "Apple: Find a store (the list of Apple Store locations)", url: APPLE_STORES },
    { label: "US Census Bureau: Gazetteer files, ZIP Code Tabulation Areas (ZIP centers)", url: CENSUS_GAZETTEER },
    { label: "Apple: Delivery and Pickup (how in-store pickup works)", url: APPLE_PICKUP },
  ];

  const site = "https://pickupchecker.com";
  const ld = [
    { "@context": "https://schema.org", "@type": "WebPage", "@id": `${site}/iphone-duo-near-me`, url: `${site}/iphone-duo-near-me`, name: TITLE, description: DESCRIPTION, isPartOf: { "@id": `${site}/#website` }, about: { "@id": `${site}/#organization` }, dateModified: facts.at },
    ...(count > 0 ? [itemListJsonLd(`Apple Stores with the iPhone Duo in stock for pickup right now (${asOf})`, now.map((x) => x.store))] : []),
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10">
      <JsonLd data={ld} />
      <h1 className="display text-3xl sm:text-5xl">Which Apple Stores have the iPhone Duo in stock near me right now?</h1>
      <p className="mt-4 text-lg text-ink-2">
        {unknown
          ? <>Live stock could not be read at this moment; the finder below still ranks all <b className="text-ink">{STORES.length}</b> US Apple Stores by distance from you or your ZIP.</>
          : count > 0
            ? <>Right now <b className="text-ink">{count} of the {STORES.length}</b> US Apple Stores list an iPhone Duo for pickup (as of {asOf}): {listWords(now.map((x) => `${appleName(x.store)} (${stateCodeOf(x.store)})`), 5)}.</>
            : <>Right now <b className="text-ink">none of the {STORES.length}</b> US Apple Stores lists an iPhone Duo for pickup (as of {asOf}), so the nearest ones are the ones to watch.</>}
      </p>
      <StatGrid cols={3} className="mt-6">
        <Stat value={unknown ? "–" : count} label={`of ${STORES.length} US Apple Stores list a Duo for pickup (${asOf})`} tone={count > 0 ? "accent" : "plain"} live={!unknown} />
        <Stat value={recent.restocks} label={`iPhone Duo restocks in the last 24 hours, at ${plural(recent.stores, "store")}`} />
        {hasPattern
          ? <Stat value={pct(win.share)} label={`of ${n(rt.n)} restocks since ${longDate(rt.since)} fell between ${winLabel} local time`} />
          : sell
            ? <Stat value={sell.medianSec} unit="s" label="typical listing before it sells out" tone="warn" />
            : <Stat value="–" label="usual restock hour: too few restocks yet" tone="muted" />}
      </StatGrid>
      <div className="mt-6"><NearMeFinder data={data} /></div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href={alert} className="btn btn-primary">Alert me when a store near me restocks</Link>
        <Link href="/map" className="btn btn-ghost">Live map</Link>
      </div>
      <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2 text-sm">
        {sections.map((x) => <a key={x.id} href={`#${x.id}`} className="chip px-3 py-1.5 text-xs">{x.nav}</a>)}
      </nav>

      <div className="pane prose-site mt-8 p-6 sm:p-8">
        {/* ---------------------------------------------------------------- right now */}
        <section id="now" className="scroll-mt-24">
          <h2>{sections[0].h2}</h2>
          <p><b>{unknown
            ? "The live list could not be read just now; the store pages linked from the finder above are unaffected."
            : count > 0
              ? `${plural(count, "store")} in ${plural(states.length, "state")} as of ${asOf}, listed by state with the configurations each one shows.`
              : `None at the last check (${asOf}); ${recent.restocks > 0 && latest ? `the latest restock was a ${cfg(latest.partNumber)} at ${latest.store ? appleName(latest.store) : "an Apple Store"}, ${localStamp(latest.at, latest.store ?? STORES[0])} local time` : "no store restocked it in the last 24 hours either"}.`}</b></p>
          {count > 0 && states.map((st) => (
            <div key={st}>
              <h3><Link href={statePath(st)}>{st}</Link></h3>
              <ul>
                {byState.get(st)!.map((x) => (
                  <li key={x.store.storeNumber}>
                    <Link href={storePath(x.store)}>{appleName(x.store)}</Link>, {cityLine(x.store)}: {x.parts.map(cfg).join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {!unknown && count > 0 && (
            <Keys items={[
              { text: <>Each store page: all <b className="text-ink">{items.length} configurations</b> live, plus its usual restock hour</> },
              { text: <>A listing lasts <b className="text-ink">{lasts}</b>: it can be gone before you arrive</>, no: true },
              { text: <>So the finder gives an <b className="text-ink">alert per store</b>, not a list to refresh</>, step: true },
            ]} />
          )}
          {!unknown && count === 0 && (
            <>
              <Keys items={[
                { text: <>Sold out everywhere is the <b className="text-ink">normal state</b> of this page, not a fault</> },
                { text: <>A listing lasts <b className="text-ink">{lasts}</b>, then reads unavailable all day</>, no: true },
                ...(hasPattern ? [{ text: <><b className="text-ink">{pct(win.share)}</b> of {n(rt.n)} restocks since {longDate(rt.since)}: <b className="text-ink">{winLabel}</b> local time</>, step: true }] : []),
              ]} />
              <ChipLinks items={[{ href: "/iphone-duo-restock-times", label: "When Apple restocks the iPhone Duo" }, { href: "/restocks", label: "The restock log, live" }]} />
            </>
          )}
        </section>

        {/* ---------------------------------------------------------------- find */}
        <section id="find" className="scroll-mt-24">
          <h2>{sections[1].h2}</h2>
          <p><b>Use the finder at the top of this page: it ranks all {STORES.length} US Apple Stores by distance from your location or your ZIP, in your browser, and shows which of the ten nearest list the iPhone Duo at this moment.</b></p>
          <Steps steps={[
            { title: "Use my location, or type a ZIP", hint: "Ranked in your browser; your location never leaves your device, and a ZIP only selects a small file of ZIP centers by its first three digits." },
            { title: "Read the badge", hint: `"Duo in stock: 3 of ${items.length} configs" lists what the store shows right now; "none right now" is the usual state, sold out.` },
            { title: "Alert me on two or three reachable stores", hint: `From then on those stores are checked every ${SPEED.fastSec} seconds and your phone hears about a confirmed restock about ${SPEED.alertSec} seconds later.` },
          ]} />
          <ChipLinks items={[
            { href: "/stores", label: "Apple Stores by state" },
            { href: "/map", label: `Live map of all ${STORES.length} stores` },
            { href: "/stock/iphone-duo", label: "Every store with the Duo now" },
          ]} />
          <Figure id="navigation-app-street" />
        </section>

        {/* ---------------------------------------------------------------- nearest vs busiest */}
        <section id="best" className="scroll-mt-24">
          <h2>{sections[2].h2}</h2>
          <p><b>{hasPattern
            ? `Not necessarily: the right set is the two or three stores you could reach by ${hourLabel(win.from)} local time, because ${pct(win.share)} of the ${n(rt.n)} iPhone Duo restocks since ${longDate(rt.since)} landed between ${winLabel}.`
            : "Not necessarily: the right set is the two or three stores you could actually reach on a weekday morning, not the one store with the most restocks."}</b></p>
          <ol className="my-4 grid gap-3 sm:grid-cols-2">
            <Swap no="The store with the most restocks, three hours away" yes="Two or three stores within reach" why="A pickup order is collected at that store, in person, usually the same day." />
            <Swap no="One alert at one store" yes="The nearest stores × the one configuration you want" why={`Your stores every ${SPEED.fastSec} seconds, a push about ${SPEED.alertSec} seconds after a restock is confirmed.`} />
          </ol>
          <Keys items={[
            { text: <><b className="text-ink">Distance</b> decides what you can do with an alert</> },
            { text: <><b className="text-ink">Restock count</b> decides only how often you get one</> },
          ]} />
          {hasPattern && top.length > 0 && (
            <div className="my-4 overflow-x-auto">
              <table className="w-full min-w-[20rem] text-sm">
                <caption className="mb-2 text-start text-xs text-ink-3">The stores with the most iPhone Duo restocks since {longDate(rt.since)}: listed because people ask, not because you should drive to them</caption>
                <thead><tr className="text-start text-xs uppercase tracking-wide text-ink-3"><th className="pb-2 pe-3 font-semibold">Store</th><th className="pb-2 font-semibold">Restocks</th></tr></thead>
                <tbody>
                  {top.map((t) => (
                    <tr key={t.store.storeNumber} className="border-t border-line">
                      <td className="py-2 pe-3 font-medium text-ink"><Link href={storePath(t.store)}>{appleName(t.store)}</Link>, {cityLine(t.store)}</td>
                      <td className="py-2 tabular-nums">{n(t.restocks)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <ChipLinks items={[
            { href: "/which-iphone-duo-restocks-most", label: "Which iPhone Duo restocks most" },
            { href: "/iphone-duo-restock-times", label: "The hour, store by store" },
            { href: "/iphone-duo-stock-alerts", label: "What one alert covers" },
            { href: "/install", label: "The Home Screen app" },
          ]} />
        </section>

        {/* ---------------------------------------------------------------- any state */}
        <section id="ai" className="scroll-mt-24">
          <h2>{sections[3].h2}</h2>
          <p><b>Yes, in a plain way: this page covers all {STORES.length} US Apple Stores, the list above names every store with the iPhone Duo right now, and every state has its own page, so a reader in any state can start from that state&apos;s page.</b></p>
          {unknown
            ? <p>The live list is unavailable at this moment; the state pages carry their own.</p>
            : count > 0
              ? (
                <>
                  <p className="text-sm text-ink-3">States with at least one Apple Store listing the iPhone Duo right now ({asOf}):</p>
                  <ChipLinks items={states.map((st) => ({ href: statePath(st), label: st }))} />
                </>
              )
              : <p>No state has a store listing the iPhone Duo at this moment ({asOf}); every state page shows the hour its stores usually restock.</p>}
          <Keys items={[
            { text: <>Every state: a page under <Link href="/stores">/stores</Link> with <b className="text-ink">live stock</b> and restock hours</> },
            { text: <>Cities with more than one store: their own page</> },
            { text: <>Start from your state: <Link href={statePath("Texas")}>Texas</Link>, <Link href={statePath("California")}>California</Link>, or any other</>, step: true },
            { text: <>Independent, not affiliated with Apple; apple.com pickup stock read every <b className="text-ink">{SPEED.checkSec} seconds</b></> },
          ]} />
          <Figure id="phone-map" />
        </section>

        {/* ---------------------------------------------------------------- distance */}
        <section id="distance" className="scroll-mt-24">
          <h2>{sections[4].h2}</h2>
          <p><b>An estimate of road miles and door-to-door driving time from your location or your ZIP&apos;s center, not a straight line and not a turn-by-turn route.</b></p>
          <KeyTable head={["Figure", "How it is made"]} rows={[
            ["Road miles", <>Straight line × <b className="text-ink">1.2–1.35</b>: roads wind, and short trips wind more</>],
            ["Drive time", <>About <b className="text-ink">5 minutes</b> to get going and park, then <b className="text-ink">22 mph</b> in city traffic rising to <b className="text-ink">60 mph</b> on the highway as the trip gets longer; rush hour is not modeled</>],
            ["Your ZIP", <>The population-weighted center of its ZIP Code Tabulation Area, from the <a href={CENSUS_GAZETTEER} target="_blank" rel="noopener">US Census Bureau&apos;s gazetteer files</a></>],
            ["The stores", <>All <b className="text-ink">{STORES.length}</b> US Apple Stores with their coordinates, from <a href={APPLE_STORES} target="_blank" rel="noopener">Apple&apos;s own store list</a></>],
          ]} />
          <Measured>
            A 2-mile estimate can be a 10-minute drive or a 25-minute one depending on the hour. Use the number to choose which stores to watch, and the store page&apos;s address and map for real directions.
          </Measured>
          <Figure id="apple-store-entrance-busy" />
        </section>
        <p><Link href={alert} className="btn btn-primary">Alert me when a store near me restocks</Link></p>
      </div>
      <div className="mt-10"><RichFaq items={faq} facts={facts} title="Questions" /></div>
      <div className="mt-8"><SourceList sources={sources} facts={facts} where={`all ${STORES.length} US Apple Stores`} since={longDate(TRACKING_SINCE_US)} /></div>
    </div>
  );
}
