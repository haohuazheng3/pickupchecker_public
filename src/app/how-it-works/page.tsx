import type { Metadata } from "next";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { BlockView } from "@/components/content/Blocks";
import { RichFaq, SourceList } from "@/components/content/RichFaq";
import { JsonLd } from "@/components/seo/JsonLd";
import { getFacts } from "@/lib/content/facts";
import type { Block, Faq, Source } from "@/lib/content/types";
import { ALL_STORES, STORES, storePath, appleName } from "@/lib/apple/catalog";
import { INTL_CODES } from "@/lib/apple/countries";
import { PLANS, SPEED, OTHER_TRACKERS } from "@/lib/plans";
import { PATTERN_DAYS, TRACKING_SINCE_INTL, TRACKING_SINCE_US, WEEKDAYS, hourLabel, siteFacts, type SiteFacts } from "@/lib/content/siteFacts";

export const dynamic = "force-dynamic";

const TITLE = "How PickupChecker Works: 5-Second Checks, Every Restock Logged";
const DESCRIPTION = `PickupChecker checks your Apple Stores every ${SPEED.fastSec} seconds, the fastest published interval of any iPhone stock tracker, pushes a restock in ~${SPEED.alertSec} s and logs every one, so you can see when your store restocks.`;

export const metadata: Metadata = {
  title: { absolute: `${TITLE} · PickupChecker` },
  description: DESCRIPTION,
  alternates: { canonical: "/how-it-works" },
  openGraph: { type: "article", siteName: "PickupChecker", title: TITLE, description: DESCRIPTION, url: "/how-it-works" },
};

const n = (x: number) => x.toLocaleString("en-US");
const pct = (x: number) => `${Math.round(x * 100)}%`;

/** The US store with the most restocks and a stated pattern: the worked example of "when does my store restock". */
function example(f: SiteFacts) {
  const best = Object.values(f.patterns).filter((p) => p.peakHour != null && STORES.some((s) => s.storeNumber === p.storeNumber)).sort((a, b) => b.restocks - a.restocks)[0];
  const store = best ? STORES.find((s) => s.storeNumber === best.storeNumber) : undefined;
  return best && store ? { p: best, store, name: appleName(store), path: storePath(store) } : null;
}

export default async function HowItWorks() {
  const f = await siteFacts();
  const facts = await getFacts();
  const ex = example(f);
  const intl = ALL_STORES.length - STORES.length;
  const gone = f.duoGone2Min ? `${pct(f.duoGone2Min.share)} of iPhone Duo restocks in the last 7 days were gone within 2 minutes` : "most iPhone Duo restocks are gone within 2 minutes";
  const exampleLine = ex
    ? `At [${ex.name}](${ex.path}), for example: ${ex.p.restocks} restocks in the last ${PATTERN_DAYS} days, most around **${hourLabel(ex.p.peakHour!)}** local time, **${WEEKDAYS[ex.p.peakWeekday!]}** the busiest day${ex.p.medianStayMin != null ? `, and a typical restock stayed listed about ${ex.p.medianStayMin} minutes` : ""}.`
    : "Each store page shows the hour restocks usually land, the busiest weekday and the last 30 days, day by day.";

  const speed: Block[] = [
    { t: "table", head: ["What happens", "How long"], rows: [
      ["The stores your alerts point at are asked", `every **${SPEED.fastSec} seconds**`],
      [`Every other Apple Store (${n(ALL_STORES.length)} in all)`, `every ${SPEED.checkSec} seconds`],
      ["A first \"available\" is asked again before it counts", "about 1 second later"],
      ["A confirmed restock reaches your phone", `about **${SPEED.alertSec} seconds**`],
      ["What other iPhone stock trackers publish", OTHER_TRACKERS],
    ], caption: "PickupChecker's check cycle, around the clock", source: "PickupChecker's poller; other trackers' intervals as published on their own sites (November 2026)" },
    { t: "p", text: `We think speed is the whole product. **${gone[0].toUpperCase()}${gone.slice(1)}** (from our [restock log](/restocks)). A tracker that looks every few minutes reports a restock that has already sold out; at ${SPEED.fastSec} seconds you hear about it while it is still there to reserve.` },
    { t: "img", id: "phone-notification" },
  ];
  const real: Block[] = [
    { t: "ul", items: [
      "**Two answers must agree.** A restock counts only when apple.com lists the configuration twice in a row; the second ask goes out about a second after the first, so a real restock is confirmed fast and a one-response glitch is thrown away.",
      `**Sold out is confirmed too.** A listing that disappears is checked again on the next round (${SPEED.checkSec} seconds) before the store counts as sold out.`,
      "**An error is never \"out of stock\".** A request that fails or times out changes nothing; it is asked again from a fresh address.",
      "**One push per restock.** No repeats while it stays in stock, and nothing for the very first time a store is seen.",
    ] },
  ];
  const data: Block[] = [
    { t: "table", head: ["What we record", "Where you see it"], rows: [
      ["Live pickup stock for every storage and color", "every store, city and state page, with the time of the last check"],
      ["Every confirmed restock and sell-out, with store, configuration and time", "[the restock log](/restocks) and each store page"],
      ["When restocks usually land: local hour and weekday", "\"When does … restock?\" on every store, city and state page"],
      [`Restocks in the last 24 hours, 7 and ${PATTERN_DAYS} days`, "store, city, state and iPhone model pages"],
      ["How long a restock typically stays listed", "the same pages (\"stays ~N min\")"],
      ["Which configurations come back most often", "\"Restocks by configuration\" on store pages"],
      ["The local price with tax", "store and state pages"],
    ], caption: f.restocks ? `${n(f.restocks)} confirmed restocks and ${n(f.soldouts)} sell-outs recorded so far` : "Recorded since tracking began", source: `PickupChecker restock log (US since ${TRACKING_SINCE_US}, other countries since ${TRACKING_SINCE_INTL})` },
    { t: "note", text: "Only our own confirmed observations enter these numbers. Where a page also shows restocks reported by other trackers, they are drawn as a separate, labelled series and never counted." },
  ];
  const yourStore: Block[] = [
    { t: "ol", items: [
      "Find your store: search by store, city or ZIP at the top of any page, or browse [Apple Stores by state](/stores).",
      "Read **\"When does … restock?\"** on the store page: the hour restocks usually land in local time, the busiest weekday and the count over the last 30 days.",
      "Check **\"Restocks by configuration\"** to see whether your exact storage and color is one that comes back.",
      `Set an alert for that store and configuration, so you do not have to watch: it is checked every ${SPEED.fastSec} seconds from then on.`,
    ] },
    { t: "p", text: exampleLine },
    { t: "p", text: "A pattern is history, not a promise: Apple publishes no restock schedule, and a launch week can look nothing like the week after. That is why the alert, not the chart, is what gets you the phone." },
    { t: "img", id: "apple-store-pickup-counter" },
  ];
  const coverage: Block[] = [
    { t: "p", text: `All ${STORES.length} Apple Stores in the US and ${intl} more in ${INTL_CODES.length} countries (Canada, the UK, Australia, Germany, France, Italy, Spain, Japan, South Korea, Hong Kong, Singapore, the UAE, Switzerland, the Netherlands, Sweden, Taiwan, Austria and Belgium), every storage and color of the iPhone Duo, iPhone 18 Pro and iPhone 18 Pro Max, with Apple's local prices. Start from [the US stores](/stores) or a country's home page, such as [the UK](/uk) or [Japan](/jp).` },
  ];
  const cost: Block[] = [
    { t: "p", text: `Everything above, live stock, restock times and the restock log, is free to browse. Alerts to your phone are the paid part: Plus $${PLANS.plus.priceUsd}/month for ${PLANS.plus.limit} alerts, Pro $${PLANS.pro.priceUsd} for ${PLANS.pro.limit}, Max $${PLANS.max.priceUsd} for ${PLANS.max.limit}. One alert is one store × one exact configuration, and every plan gets the same ${SPEED.fastSec}-second checks ([pricing](/pricing)).` },
  ];

  const sections: { id: string; nav: string; h2: string; lead: string; blocks: Block[] }[] = [
    { id: "speed", nav: "5-second checks", h2: "How fast does PickupChecker check Apple Stores?", lead: `Every ${SPEED.fastSec} seconds for the stores your alerts point at, the fastest published check interval of any iPhone stock tracker we know of, and every ${SPEED.checkSec} seconds for all ${n(ALL_STORES.length)} stores. A confirmed restock reaches your phone in about ${SPEED.alertSec} seconds.`, blocks: speed },
    { id: "confirmed", nav: "Confirmed restocks", h2: "How does PickupChecker know a restock is real?", lead: "By asking twice: a restock counts only when two answers from apple.com agree, and the second ask goes out about a second after the first. A glitch never becomes an alert, and a real restock is not held back.", blocks: real },
    { id: "data", nav: "What we record", h2: "What does PickupChecker record?", lead: `Every confirmed restock and sell-out at every store, with the exact configuration and time${f.restocks ? `: ${n(f.restocks)} restocks at ${n(f.restockStores)} stores so far` : ""}. From that log each page works out when restocks usually land, how often they come and how long they last.`, blocks: data },
    { id: "your-store", nav: "Your store's restock times", h2: "When does my Apple Store restock?", lead: "Open your store's page and read \"When does … restock?\": it gives the hour restocks usually land in local time, the busiest weekday and the last 30 days. Apple publishes no schedule, so this is the closest thing to one.", blocks: yourStore },
    { id: "coverage", nav: "Stores and iPhones", h2: "Which stores and iPhones are covered?", lead: `${n(ALL_STORES.length)} Apple Stores in ${INTL_CODES.length + 1} countries, every configuration of three iPhones.`, blocks: coverage },
    { id: "cost", nav: "Price", h2: "What does PickupChecker cost?", lead: "Browsing is free; alerts start at $5 a month.", blocks: cost },
  ];

  const faq: Faq[] = [
    { q: "Is PickupChecker the fastest iPhone stock tracker?", a: `By published check interval, yes: the stores your alerts point at are checked every ${SPEED.fastSec} seconds, where other iPhone stock trackers publish ${OTHER_TRACKERS}. We compare published numbers only.` },
    { q: "Where does the restock data come from?", a: `From PickupChecker's own checks of apple.com in-store pickup availability: every US Apple Store since ${TRACKING_SINCE_US}, the other countries since ${TRACKING_SINCE_INTL}. A restock is logged only after two matching answers ([restock log](/restocks)).` },
    { q: "Does Apple publish a restock schedule?", a: "No. Apple shows pickup availability per store and configuration but no schedule; the restock times on PickupChecker are observed, store by store ([Apple: Delivery and Pickup](https://www.apple.com/shop/shipping-pickup))." },
    { q: "Can PickupChecker reserve a phone for me?", a: "No. It tells you the moment a store lists your configuration; you reserve on apple.com with in-store pickup, and Apple holds it for you." },
    { q: "Is PickupChecker affiliated with Apple?", a: "No. PickupChecker is independent; it reads the same pickup availability anyone can see on apple.com, just far more often." },
  ];
  const sources: Source[] = [
    { label: "Apple: Delivery and Pickup (how pickup availability works)", url: "https://www.apple.com/shop/shipping-pickup" },
    { label: "Apple: Shipping & Pickup help (what to bring to a pickup)", url: "https://www.apple.com/shop/help/shipping_delivery" },
  ];

  const site = "https://pickupchecker.com";
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${site}/how-it-works`, url: `${site}/how-it-works`, name: TITLE, description: DESCRIPTION, isPartOf: { "@id": `${site}/#website` }, about: { "@id": `${site}/#organization` }, dateModified: f.at },
      {
        "@type": "HowTo", name: "How to find when your Apple Store restocks the iPhone",
        step: [
          { "@type": "HowToStep", name: "Find your store", text: "Search by store, city or ZIP, or browse Apple Stores by state.", url: `${site}/stores` },
          { "@type": "HowToStep", name: "Read “When does … restock?”", text: "The store page gives the local hour restocks usually land, the busiest weekday and the last 30 days." },
          { "@type": "HowToStep", name: "Check the configuration", text: "“Restocks by configuration” shows which storage and color come back most often." },
          { "@type": "HowToStep", name: "Set an alert", text: `From then on the store is checked every ${SPEED.fastSec} seconds and your phone is told about ${SPEED.alertSec} seconds after a confirmed restock.` },
        ],
      },
      {
        "@type": "Dataset", "@id": `${site}/restocks#dataset`, name: "Apple Store iPhone pickup restock log",
        description: "Every confirmed restock and sell-out of the iPhone Duo, iPhone 18 Pro and iPhone 18 Pro Max for in-store pickup at Apple Stores in 19 countries, with store, configuration and time, from PickupChecker's own checks.",
        url: `${site}/restocks`, creator: { "@id": `${site}/#organization` }, isAccessibleForFree: true,
        temporalCoverage: `${TRACKING_SINCE_US}/..`, spatialCoverage: "Apple Stores in the United States and 18 other countries",
        variableMeasured: ["Apple Store", "iPhone model, storage and color", "restock time", "sell-out time", "time in stock"],
        ...(f.restocks ? { size: `${f.restocks} restocks, ${f.soldouts} sell-outs` } : {}),
      },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10">
      <JsonLd data={ld} />
      <h1 className="display text-3xl sm:text-5xl">How PickupChecker works: every {SPEED.fastSec} seconds, every restock logged</h1>
      <p className="mt-4 text-lg text-ink-2">
        PickupChecker checks the Apple Stores you care about every {SPEED.fastSec} seconds, the fastest published check interval of any iPhone stock tracker we know of, and every other Apple Store every {SPEED.checkSec}. When a store lists your exact iPhone for pickup, your phone hears about it about {SPEED.alertSec} seconds after the restock is confirmed. And because every confirmed restock is logged, every store page can tell you when that store usually restocks.
      </p>
      <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2 text-sm">
        {sections.map((s) => <a key={s.id} href={`#${s.id}`} className="chip px-3 py-1.5 text-xs">{s.nav}</a>)}
      </nav>
      <div className="pane prose-site mt-8 p-6 sm:p-8">
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-24">
            <h2>{s.h2}</h2>
            <p><b>{s.lead}</b></p>
            {s.blocks.map((b, i) => <BlockView key={i} b={b} facts={facts} />)}
          </section>
        ))}
        <section id="limits" className="scroll-mt-24">
          <h2>What can&apos;t PickupChecker do?</h2>
          <p><b>It sees what apple.com shows, nothing more.</b></p>
          <ul>
            <li>Public availability only: no quantities, no holds.</li>
            <li>Apple sometimes shows stock already reserved for other orders.</li>
            <li>Phone notifications need the Home Screen app (<Link href="/install">install</Link>); without one, alerts come by email from alerts@pickupchecker.com.</li>
          </ul>
        </section>
        <p><Link href="/#notify" className="btn btn-primary">Set up an alert</Link></p>
      </div>
      <div className="mt-10"><RichFaq items={faq} facts={facts} title="Questions" /></div>
      <div className="mt-8"><SourceList sources={sources} facts={facts} where={`${n(ALL_STORES.length)} Apple Stores in ${INTL_CODES.length + 1} countries`} since={TRACKING_SINCE_US} /></div>
    </div>
  );
}
