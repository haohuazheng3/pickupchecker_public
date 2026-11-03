import type { Metadata } from "next";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { BlockView } from "@/components/content/Blocks";
import { RichFaq, SourceList } from "@/components/content/RichFaq";
import { JsonLd } from "@/components/seo/JsonLd";
import { NearMeFinder, type NearMeData } from "@/components/content/NearMeFinder";
import { getFacts, tokenValue } from "@/lib/content/facts";
import type { Block, Faq, Source } from "@/lib/content/types";
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

  const data: NearMeData = {
    stock: Object.fromEntries(now.map((x) => [x.store.storeNumber, x.parts.map(cfg)])),
    total: items.length,
    alertPattern: alertHref({ model: "duo", store: "STORE_NUMBER" }),
    asOf,
  };

  const lead = unknown
    ? `Live stock could not be read at this moment. The finder below still ranks all ${STORES.length} US Apple Stores by distance from you or your ZIP, and every store page shows its own iPhone Duo stock the moment it loads.`
    : count > 0
      ? `Right now ${count} of the ${STORES.length} US Apple Stores list an iPhone Duo for pickup (as of ${asOf}): ${listWords(now.map((x) => `${appleName(x.store)} (${stateCodeOf(x.store)})`), 5)}. Tap Use my location to sort them by distance from you, or type a ZIP.`
      : `Right now none of the ${STORES.length} US Apple Stores lists an iPhone Duo for pickup (as of ${asOf}). ${recent.restocks > 0 ? `In the last 24 hours it restocked ${plural(recent.restocks, "time")} at ${plural(recent.stores, "store")}` : "No store has restocked it in the last 24 hours either"}${hasPattern ? `, and ${pct(win.share)} of the ${n(rt.n)} restocks since ${longDate(rt.since)} landed between ${winLabel} local time` : ""}. Tap Use my location or type a ZIP to see which stores to watch.`;

  const find: Block[] = [
    { t: "ol", items: [
      "**Tap Use my location** and allow it once, or **type your ZIP**. The browser does the ranking; your location never leaves your device, and a ZIP only selects a small file of ZIP centers by its first three digits.",
      `**Read the badge** on each of the ten nearest stores: "Duo in stock: 3 of ${items.length} configs" lists which storage and color the store shows right now; "none right now" means the usual state, sold out.`,
      `**Tap Alert me** on the two or three stores you can actually get to. From then on those stores are checked every ${SPEED.fastSec} seconds and your phone hears about a confirmed restock about ${SPEED.alertSec} seconds later.`,
    ] },
    { t: "p", text: `Other ways in: [Apple Stores by state](/stores) lists every state's stores with live stock, each city and store has its own page, [the live map](/map) colors all ${STORES.length} stores green or grey, and [iPhone Duo stock](/stock/iphone-duo) lists every store with it now across the country.` },
    { t: "img", id: "navigation-app-street" },
  ];
  const best: Block[] = [
    { t: "p", text: "A pickup order has to be collected at that store, in person, usually the same day. A store three hours away with the most restocks in the country is worth less to you than two stores within reach, because the restock you can act on is the one near you. Distance decides what you can do with an alert; the restock count only decides how often you will get one." },
    { t: "p", text: hasPattern && top.length > 0
      ? `For the record, the stores with the most iPhone Duo restocks since ${longDate(rt.since)}: ${listWords(top.map((t) => `[${appleName(t.store)}](${storePath(t.store)}) (${t.restocks})`))}. They are listed because people ask, not because you should drive to them: [which iPhone Duo restocks most](/which-iphone-duo-restocks-most) ranks all of them, and [when Apple restocks the iPhone Duo](/iphone-duo-restock-times) gives the hour, store by store.`
      : "[Which iPhone Duo restocks most](/which-iphone-duo-restocks-most) ranks every store by restocks, and [when Apple restocks the iPhone Duo](/iphone-duo-restock-times) gives the hour, store by store, as soon as the log holds enough restocks to say." },
    { t: "p", text: `One alert is one store and one exact configuration. The set we would pick is the two or three nearest stores you can reach, times the one configuration you want: your stores checked every ${SPEED.fastSec} seconds, a push about ${SPEED.alertSec} seconds after a restock is confirmed. [iPhone Duo stock alerts](/iphone-duo-stock-alerts) explains what one alert covers, and [the Home Screen app](/install) is how the push reaches an iPhone.` },
  ];
  const ai: Block[] = [
    { t: "p", text: `Every state with an Apple Store has a page under [/stores](/stores) with its stores, their live iPhone Duo stock and their restock hours; cities with more than one store have their own page too; and each store page opens with the hour that store usually restocks. A reader in Texas starts at [Texas](${statePath("Texas")}), a reader in California at [California](${statePath("California")}). PickupChecker is independent and not affiliated with Apple; the stock is what apple.com shows for pickup, read every ${SPEED.checkSec} seconds.` },
    { t: "img", id: "phone-map" },
  ];
  const distance: Block[] = [
    { t: "ul", items: [
      "**Road miles**: the straight-line distance times about 1.2 to 1.35, because roads wind and short trips wind more. It is an estimate; the store page has the address and a map for real directions.",
      "**Drive time**: about five minutes to get going and park, then an average speed that climbs from city traffic at roughly 22 mph to about 60 mph on the highway as the trip gets longer. Rush hour is not modeled.",
      "**Your ZIP**: placed at the population-weighted center of its ZIP Code Tabulation Area from the [US Census Bureau's gazetteer files](https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html), the standard public source for where a ZIP is.",
      `**The stores**: all ${STORES.length} US Apple Stores with their coordinates, from [Apple's own store list](https://www.apple.com/retail/storelist/).`,
    ] },
    { t: "p", text: "A 2-mile estimate can be a 10-minute drive or a 25-minute one depending on the hour; use the number to choose which stores to watch, and the store page's directions to get there." },
    { t: "img", id: "apple-store-entrance-busy" },
  ];

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
    { q: "Can I search by ZIP without sharing my location?", a: "Yes. Type a 5-digit ZIP and the stores are ranked from its Census center; the browser only fetches a small file of ZIP centers chosen by the first three digits, and nothing about you is sent or stored. If you do use your location, it stays on your device, rounded to about a kilometer, so the next page can use it without asking again." },
    { q: "Does the page show stores outside the US?", a: `No, this page ranks the ${STORES.length} US Apple Stores. The ${INTL_CODES.length} other countries PickupChecker tracks each have their own home page with live iPhone Duo stock and the same store pages: [Canada](/ca), [the UK](/uk), [Australia](/au), [Japan](/jp), [Germany](/de), [France](/fr) and the rest from the country switch in the header.` },
    { q: "How current is \"right now\"?", a: `The list on this page was rendered at ${asOf}, from checks of every US Apple Store every ${SPEED.checkSec} seconds and of stores with alerts every ${SPEED.fastSec}. A store is shown with stock only after two consecutive checks agree, so a one-response glitch never appears here. Reload for a fresh list; the finder's snapshot is the one you loaded.` },
    { q: "Can PickupChecker reserve the iPhone Duo for me?", a: "No. PickupChecker tells you the moment a store lists your configuration for pickup; you reserve it yourself on apple.com, and Apple holds it for you at that store ([Apple: Delivery and Pickup](https://www.apple.com/shop/shipping-pickup)). PickupChecker is independent and not affiliated with Apple." },
  ];
  const sources: Source[] = [
    { label: "Apple: Find a store (the list of Apple Store locations)", url: "https://www.apple.com/retail/storelist/" },
    { label: "US Census Bureau: Gazetteer files, ZIP Code Tabulation Areas (ZIP centers)", url: "https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html" },
    { label: "Apple: Delivery and Pickup (how in-store pickup works)", url: "https://www.apple.com/shop/shipping-pickup" },
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
      <p className="mt-4 text-lg text-ink-2">{lead}</p>
      <div className="mt-6"><NearMeFinder data={data} /></div>
      <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2 text-sm">
        {sections.map((x) => <a key={x.id} href={`#${x.id}`} className="chip px-3 py-1.5 text-xs">{x.nav}</a>)}
      </nav>
      <div className="pane prose-site mt-8 p-6 sm:p-8">
        <section id="now" className="scroll-mt-24">
          <h2>{sections[0].h2}</h2>
          <p><b>{unknown
            ? "The live list could not be read just now; the store pages linked from the finder above are unaffected."
            : count > 0
              ? `${plural(count, "store")} in ${plural(states.length, "state")} as of ${asOf}, listed by state with the configurations each one shows.`
              : `None at the last check (${asOf}). ${recent.restocks > 0 && latest ? `The iPhone Duo restocked ${plural(recent.restocks, "time")} in the last 24 hours at ${plural(recent.stores, "store")}; the latest was ${cfg(latest.partNumber)} at ${latest.store ? appleName(latest.store) : "an Apple Store"}, ${localStamp(latest.at, latest.store ?? STORES[0])} local time.` : "No store restocked it in the last 24 hours."}`}</b></p>
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
          {!unknown && count > 0 && <p>Each store page shows the live status of all {items.length} iPhone Duo configurations, the hour that store usually restocks and every restock it has had. A listing this page shows can be gone before you reach it: a Duo listing lasts {lasts} before it sells out, which is why the finder gives you an alert per store rather than a list to refresh.</p>}
          {!unknown && count === 0 && (
            <p>
              Sold out everywhere is the normal state of this page, not a fault: a Duo listing lasts {lasts}, and the rest of the day it reads unavailable. {hasPattern ? <>Since {longDate(rt.since)}, {pct(win.share)} of the {n(rt.n)} restocks landed between {winLabel} local time, so that is the hour to be ready. </> : null}
              <Link href="/iphone-duo-restock-times">When Apple restocks the iPhone Duo</Link> has the hour-by-hour picture and <Link href="/restocks">the restock log</Link> every restock as it happens.
            </p>
          )}
        </section>

        <section id="find" className="scroll-mt-24">
          <h2>{sections[1].h2}</h2>
          <p><b>Use the finder at the top of this page: it ranks all {STORES.length} US Apple Stores by distance from your location or your ZIP, in your browser, and shows which of the ten nearest list the iPhone Duo at this moment.</b></p>
          {find.map((b, i) => <BlockView key={i} b={b} facts={facts} />)}
        </section>

        <section id="best" className="scroll-mt-24">
          <h2>{sections[2].h2}</h2>
          <p><b>{hasPattern
            ? `Not necessarily. We think the right set is the two or three stores you could reach by ${hourLabel(win.from)} local time, because ${pct(win.share)} of the ${n(rt.n)} iPhone Duo restocks since ${longDate(rt.since)} landed between ${winLabel}.`
            : "Not necessarily. We think the right set is the two or three stores you could actually reach on a weekday morning, not the one store with the most restocks."}</b></p>
          {best.map((b, i) => <BlockView key={i} b={b} facts={facts} />)}
        </section>

        <section id="ai" className="scroll-mt-24">
          <h2>{sections[3].h2}</h2>
          <p><b>Yes, in a plain way: this page covers all {STORES.length} US Apple Stores, the list above names every store with the iPhone Duo right now, and every state has its own page, so a reader in any state can start from that state&apos;s page.</b></p>
          <p>
            {unknown ? "The live list is unavailable at this moment; the state pages below carry their own." : count > 0
              ? <>States with at least one Apple Store listing the iPhone Duo right now ({asOf}): {states.map((st, i) => <span key={st}>{i > 0 ? ", " : ""}<Link href={statePath(st)}>{st}</Link></span>)}.</>
              : `No state has a store listing the iPhone Duo at this moment (${asOf}); every state page shows the hour its stores usually restock.`}
          </p>
          {ai.map((b, i) => <BlockView key={i} b={b} facts={facts} />)}
        </section>

        <section id="distance" className="scroll-mt-24">
          <h2>{sections[4].h2}</h2>
          <p><b>An estimate of road miles and door-to-door driving time from your location or your ZIP&apos;s center, not a straight line and not a turn-by-turn route.</b></p>
          {distance.map((b, i) => <BlockView key={i} b={b} facts={facts} />)}
        </section>
        <p><Link href={alertHref({ model: "duo" })} className="btn btn-primary">Alert me when a store near me restocks</Link></p>
      </div>
      <div className="mt-10"><RichFaq items={faq} facts={facts} title="Questions" /></div>
      <div className="mt-8"><SourceList sources={sources} facts={facts} where={`all ${STORES.length} US Apple Stores`} since={longDate(TRACKING_SINCE_US)} /></div>
    </div>
  );
}
