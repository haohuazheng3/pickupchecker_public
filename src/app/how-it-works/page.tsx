/**
 * /how-it-works: the check cycle, the two-answer rule and what is recorded, shown as tiles, tables, keyword lines and a
 * step strip. Each H2 is a question with one answer-first sentence; every number is live. Since 2026-11-09 the speed
 * claims are the plan next to the measurement (#measured, from serviceStats): no "fastest", no "on your phone in 3 s".
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { BlockView } from "@/components/content/Blocks";
import { Inline } from "@/components/content/Inline";
import { Figure } from "@/components/content/Figure";
import { RichFaq, SourceList } from "@/components/content/RichFaq";
import { JsonLd } from "@/components/seo/JsonLd";
import { getFacts, type Facts } from "@/lib/content/facts";
import type { Block, Faq, Source } from "@/lib/content/types";
import { ALL_STORES, STORES, storePath, appleName } from "@/lib/apple/catalog";
import { INTL_CODES } from "@/lib/apple/countries";
import { PLANS, SPEED, OTHER_TRACKERS } from "@/lib/plans";
import { PATTERN_DAYS, TRACKING_SINCE_INTL, TRACKING_SINCE_US, WEEKDAYS, hourLabel, siteFacts, type SiteFacts } from "@/lib/content/siteFacts";
import { medianBand } from "@/lib/stock/sellouts";
import { Chips, Measured, Points, Stat, StatGrid, StepStrip } from "@/components/ui/Viz";
import { serviceStats, secs } from "@/lib/content/serviceStats";
import { PLAN_ONLY, abovePlan, count, deliverySentence, intervalSentence, intlLimit, outcomesLine, utcHour } from "@/lib/content/serviceCopy";
import { DeliveryTable, IntervalTable, ServiceTiles } from "@/components/service/ServiceFigures";

export const dynamic = "force-dynamic";

const TITLE = "How PickupChecker Works: 5-Second Checks, Every Restock Logged";
const DESCRIPTION = `PickupChecker checks your Apple Stores every ${SPEED.fastSec} seconds (measured intervals published), pushes a restock in ~${SPEED.alertSec} s and logs every one, so you can see when your store restocks.`;

export const metadata: Metadata = {
  title: { absolute: `${TITLE} · PickupChecker` },
  description: DESCRIPTION,
  alternates: { canonical: "/how-it-works" },
  openGraph: { type: "article", siteName: "PickupChecker", title: TITLE, description: DESCRIPTION, url: "/how-it-works" },
};

const n = (x: number) => x.toLocaleString("en-US");
const pct = (x: number) => `${Math.round(x * 100)}%`;
const COUNTRIES_COVERED = ["Canada", "the UK", "Australia", "Germany", "France", "Italy", "Spain", "Japan", "South Korea", "Hong Kong", "Singapore", "the UAE", "Switzerland", "the Netherlands", "Sweden", "Taiwan", "Austria", "Belgium"];

/** The US store with the most restocks and a stated pattern: the worked example of "when does my store restock". */
function example(f: SiteFacts) {
  const best = Object.values(f.patterns).filter((p) => p.peakHour != null && STORES.some((s) => s.storeNumber === p.storeNumber)).sort((a, b) => b.restocks - a.restocks)[0];
  const store = best ? STORES.find((s) => s.storeNumber === best.storeNumber) : undefined;
  return best && store ? { p: best, store, name: appleName(store), path: storePath(store) } : null;
}

/** A question, its one-sentence answer, then the UI. */
function Section({ id, h2, lead, facts, children }: { id: string; h2: string; lead: string; facts: Facts; children: ReactNode }) {
  return (
    <section id={id} className="pane scroll-mt-24 p-5 sm:p-7">
      <h2 className="display text-2xl sm:text-3xl">{h2}</h2>
      <p className="mt-3 text-base text-ink-2 sm:text-lg"><Inline text={lead} facts={facts} /></p>
      {children}
    </section>
  );
}
/** Where to go next: a row of chip links. */
function LinkRow({ links, className = "mt-4" }: { links: { label: string; href: string }[]; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {links.map((l) => l.href.startsWith("http") ? <a key={l.href} href={l.href} target="_blank" rel="noopener" className="chip chip-sm">{l.label}</a> : <Link key={l.href} href={l.href} className="chip chip-sm">{l.label}</Link>)}
    </div>
  );
}

export default async function HowItWorks() {
  const [f, facts, st] = await Promise.all([siteFacts(), getFacts(), serviceStats()]);
  const ex = example(f);
  const intl = ALL_STORES.length - STORES.length;
  const ds = f.duoSellout;
  const typical = ds ? `about ${medianBand(ds.medianSec)}` : "about a minute";
  const us7 = st.lanes["7d"]["fast-us"], intl7 = st.lanes["7d"]["fast-intl"], push7 = st.delivery["7d"].push;
  const measuredFast = us7 ? `measured median ${secs(us7.p50Sec)} in the US${intl7 ? `, ${secs(intl7.p50Sec)} in other countries` : ""} (last 7 days)` : "measured intervals: [below](#measured)";

  const cycleTable: Block = { t: "table", head: ["What happens", "How long"], rows: [
    ["The stores your alerts point at are asked", `every **${SPEED.fastSec} seconds** planned; ${measuredFast}`],
    [`Every other Apple Store (${n(ALL_STORES.length)} in all)`, `every ${SPEED.checkSec} seconds`],
    ["A first \"available\" is asked again before it counts", "about 1 second later"],
    ["First check that saw a restock → the push service accepts the alert", push7 ? `median **${secs(push7.p50Sec)}**, p95 ${secs(push7.p95Sec)} (last 7 days, ${count(push7.events)} restocks); arrival on your phone is not measured` : "measured live ([below](#measured)); arrival on your phone is not measured"],
    ["What other iPhone stock trackers state about themselves", `${OTHER_TRACKERS}, their claims ([side by side](/iphone-stock-tracker-comparison))`],
    ["How long a typical iPhone Duo restock lasts", `${typical}; some are gone in 20–30 s`],
  ], caption: "PickupChecker's check cycle, around the clock", source: "PickupChecker's poller, request log and alert log; other trackers' intervals as stated on their own sites (read November 9, 2026)" };
  const dataTable: Block = { t: "table", head: ["What we record", "Where you see it"], rows: [
    ["Live pickup stock for every storage and color", "every store, city and state page, with the time of the last check"],
    ["Every confirmed restock and sell-out, with store, configuration and time", "[the restock log](/restocks) and each store page"],
    ["When restocks usually land: local hour and weekday", "\"When does … restock?\" on every store, city and state page"],
    [`Restocks in the last 24 hours, 7 and ${PATTERN_DAYS} days`, "store, city, state and iPhone model pages"],
    ["How long a restock typically stays listed", "the same pages (\"stays ~N min\")"],
    ["Which configurations come back most often", "\"Restocks by configuration\" on store pages"],
    ["The local price with tax", "store and state pages"],
  ], caption: f.restocks ? `${n(f.restocks)} confirmed restocks and ${n(f.soldouts)} sell-outs recorded so far` : "Recorded since tracking began", source: `PickupChecker restock log (US since ${TRACKING_SINCE_US}, other countries since ${TRACKING_SINCE_INTL})` };

  const speedLead = `Every **${SPEED.fastSec} seconds** is the plan for the stores your alerts point at${us7 ? ` (measured: a median ${secs(us7.p50Sec)} in the US over the last 7 days)` : ""}, and every ${SPEED.checkSec} seconds for all ${n(ALL_STORES.length)} stores; ${push7 ? `the push service accepted alerts a median **${secs(push7.p50Sec)}** after the first check that saw the restock` : "an alert goes to the push service seconds after a restock is confirmed"}.`;
  const measuredLead = intervalSentence(st, "7d") ?? PLAN_ONLY;
  const deliveryLead = deliverySentence(st, "7d");
  const outcomes = outcomesLine(st);
  const intlNote = intlLimit(st, "7d");
  const realLead = "By asking twice: a restock counts only when **two answers from apple.com agree**, the second ask going out about a second after the first, so a glitch never becomes an alert and a real restock is not held back.";
  const dataLead = `Every confirmed restock and sell-out at every store, with the exact configuration and time${f.restocks ? `: **${n(f.restocks)}** restocks at ${n(f.restockStores)} stores so far` : ""}, from which each page works out when restocks usually land, how often they come and how long they last.`;
  const yourStoreLead = `Open your store's page and read **"When does … restock?"**: the hour restocks usually land in local time, the busiest weekday and the last ${PATTERN_DAYS} days; Apple publishes no schedule, so this is the closest thing to one.`;
  const coverageLead = `**${n(ALL_STORES.length)}** Apple Stores in ${INTL_CODES.length + 1} countries, every configuration of three iPhones.`;
  const costLead = `Browsing is free; alerts start at **$${PLANS.plus.priceUsd}** a month.`;

  const nav = [
    { id: "speed", label: "5-second checks" },
    { id: "measured", label: "Measured speed" },
    { id: "confirmed", label: "Confirmed restocks" },
    { id: "data", label: "What we record" },
    { id: "your-store", label: "Your store's restock times" },
    { id: "coverage", label: "Stores and iPhones" },
    { id: "cost", label: "Price" },
    { id: "limits", label: "Limits" },
  ];

  const faq: Faq[] = [
    { q: "Is PickupChecker the fastest iPhone stock tracker?", a: `Nobody can honestly say. Our plan is a check every ${SPEED.fastSec} seconds at the stores your alerts point at${us7 ? `, and we publish what we measure: a median ${secs(us7.p50Sec)} (p95 ${secs(us7.p95Sec)}) in the US over the last 7 days` : ""}. Store Stock Checker states the same ${SPEED.fastSec} seconds and InStock Radar an 8-second check for paid stores, as stated on their sites (read November 9, 2026); we have measured neither. And no tracker can see when a push reaches your phone. [Trackers side by side](/iphone-stock-tracker-comparison) · [our service report](/service-report).` },
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
      { "@type": "WebPage", "@id": `${site}/how-it-works`, url: `${site}/how-it-works`, name: TITLE, description: DESCRIPTION, isPartOf: { "@id": `${site}/#website` }, about: { "@id": `${site}/#organization` }, dateModified: f.at, significantLink: [`${site}/service-report`, `${site}/iphone-stock-tracker-comparison`] },
      {
        "@type": "HowTo", name: "How to find when your Apple Store restocks the iPhone",
        step: [
          { "@type": "HowToStep", name: "Find your store", text: "Search by store, city or ZIP, or browse Apple Stores by state.", url: `${site}/stores` },
          { "@type": "HowToStep", name: "Read “When does … restock?”", text: "The store page gives the local hour restocks usually land, the busiest weekday and the last 30 days." },
          { "@type": "HowToStep", name: "Check the configuration", text: "“Restocks by configuration” shows which storage and color come back most often." },
          { "@type": "HowToStep", name: "Set an alert", text: `From then on the store is checked on a ${SPEED.fastSec}-second plan, and a confirmed restock is handed to the push service for your phone within seconds (measured on the service report).` },
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
    <div className="mx-auto max-w-5xl px-4 pt-8 sm:pt-12">
      <JsonLd data={ld} />

      {/* hero */}
      <section className="grid items-start gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="eyebrow mb-4">PickupChecker · the check cycle</div>
          <h1 className="display text-4xl sm:text-6xl">How PickupChecker works: every {SPEED.fastSec} seconds, every restock logged</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-2">Your Apple Stores are checked on a <b className="text-ink">{SPEED.fastSec}-second</b> plan{us7 ? <> (measured: median <b className="text-ink">{secs(us7.p50Sec)}</b> in the US, last 7 days)</> : null}, every other store every {SPEED.checkSec} seconds, and a confirmed restock goes to the push service {push7 ? <>a median <b className="text-ink">{secs(push7.p50Sec)}</b> after the first check saw it</> : "within seconds"}; every restock is logged, so each store page can tell you when that store usually restocks.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/#notify" className="btn btn-primary btn-lg">Set up an alert</Link>
            <Link href="/restocks" className="btn btn-ghost btn-lg">The restock log</Link>
          </div>
        </div>
        <StatGrid cols={2}>
          <Stat value={us7 ? us7.p50Sec.toFixed(1) : `${SPEED.fastSec}`} unit="s" label={us7 ? <>measured median between checks at the stores your alerts point at · US, 7 days · plan {SPEED.fastSec} s</> : "planned between checks at the stores your alerts point at"} tone="accent" />
          <Stat value={`${SPEED.checkSec}`} unit="s" label={<>between checks at every other store, {n(ALL_STORES.length)} in all</>} />
          <Stat value={push7 ? push7.p50Sec.toFixed(1) : "—"} unit={push7 ? "s" : undefined} label={push7 ? <>median, first check that saw a restock → push service accepted the alert · 7 days</> : "first check → push accepted: measured below"} />
          <Stat value={f.restocks ? n(f.restocks) : "—"} label={f.restocks ? <>confirmed restocks logged · {n(f.soldouts)} sell-outs</> : "confirmed restocks logged since tracking began"} live={!!f.restocks} />
        </StatGrid>
      </section>

      <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-2 text-sm">
        {nav.map((s) => <a key={s.id} href={`#${s.id}`} className="chip px-3 py-1.5 text-xs">{s.label}</a>)}
      </nav>

      <div className="mt-6 grid gap-5">
        {/* speed */}
        <Section id="speed" h2="How fast does PickupChecker check Apple Stores?" lead={speedLead} facts={facts}>
          <BlockView b={cycleTable} facts={facts} />
          <StatGrid cols={3}>
            <Stat value={ds ? `${ds.medianSec}` : "~60"} unit="s" label={ds ? <>median iPhone Duo listing, last 7 days · {n(ds.n)} restocks</> : "typical iPhone Duo listing"} tone="warn" />
            <Stat value={ds ? pct(ds.caught.m5) : "—"} label="of those restocks a tracker checking every 5 minutes would ever see" tone="muted" />
            <Stat value={ds ? pct(ds.caught.m15) : "—"} label="checking every 15 minutes" tone="muted" />
          </StatGrid>
          <Points className="mt-5" items={[
            { text: <><b className="text-ink">Speed is the whole product</b>: a typical iPhone Duo restock sells out in {typical}, some in 20–30 seconds</> },
            { text: <>A listing that short falls between two checks of a slower tracker and is never seen at all</>, no: true },
            { text: <>At a {SPEED.fastSec}-second plan the first look comes within about one interval of the listing; whether you can still reserve depends on how long Apple keeps it listed</>, step: true },
            { text: <><b className="text-ink">Measured, not promised</b>: the live intervals, per lane and window, are in <a href="#measured" className="underline">How fast is PickupChecker in practice?</a> just below and on the <Link href="/service-report" className="underline">service report</Link>. Check speed is not notification speed.</> },
            { text: <>Raw timestamps from one dated half-hour sample (November 7, 2026, 22:00–22:30 UTC), for anyone who wants to recompute an interval: <a href="/check-evidence/2026-11-07/checks.csv" className="underline" download>CSV</a> · <a href="/check-evidence/2026-11-07/summary.json" className="underline">summary JSON</a></> },
            { text: <>Every store, city, state and country page has <b className="text-ink">&quot;How fast do restocks sell out?&quot;</b>: each restock with the seconds it lasted (&quot;sold out in 45–60 s&quot;), and the share gone within 30 seconds and within a minute</> },
          ]} />
          <Figure id="phone-notification" />
        </Section>

        {/* measured */}
        <Section id="measured" h2="How fast is PickupChecker in practice?" lead={measuredLead} facts={facts}>
          <ServiceTiles st={st} className="mt-5" />
          <IntervalTable st={st} />
          <h3 className="mt-7 text-lg font-semibold">How long from a restock to the alert?</h3>
          <p className="mt-2 text-ink-2">{deliveryLead ? <Inline text={deliveryLead} facts={facts} /> : <>No alert went out in the last 7 days, so there is no delay to report; the figures return with the next alert.</>}</p>
          <DeliveryTable st={st} />
          {outcomes && <p className="text-sm text-ink-3">{outcomes}</p>}
          <h3 className="mt-7 text-lg font-semibold">What is not measured, and where does it fall short?</h3>
          <Points className="mt-3" items={[
            { text: <>When a push appears on your phone: Apple, Google or Mozilla deliver it after accepting it, and nothing reports back to us</>, no: true },
            { text: <>Whether you could still buy: a listing can be reserved by someone else in the seconds between our check and your tap</>, no: true },
            { text: <>The moment Apple listed it: the delay starts at our first check that saw it, up to one interval later</>, no: true },
            ...(intlNote ? [{ text: <>{intlNote}</>, no: true }] : []),
            { text: <>Window, sample and the start of every record are printed with the figure; data as of {utcHour(st.at)}, refreshed hourly</> },
          ]} />
          <LinkRow links={[{ label: "The full service report: every lane, hour by hour, one real restock", href: "/service-report" }, { label: "iPhone stock trackers compared", href: "/iphone-stock-tracker-comparison" }]} />
          <Measured>
            Check interval = the time between two successful answers from apple.com for the same store (stores with an alert) or between the starts of two full rounds (every store), rolled up hourly into 0.1-second histograms; a store that leaves the alert lane for more than 5 minutes is not counted as a slow check. Alert delay = from the first check that saw the restock (before the confirming second answer) to the push or mail service accepting the first alert for it. {abovePlan("fast-intl", intl7) ? "The international alert lane currently runs above its plan, and the table says so in amber." : ""}
          </Measured>
        </Section>

        {/* confirmed */}
        <Section id="confirmed" h2="How does PickupChecker know a restock is real?" lead={realLead} facts={facts}>
          <Points className="mt-5" size="base" items={[
            { text: <><b className="text-ink">Two answers must agree</b> · the second ask ~1 s after the first · a one-response glitch is thrown away</> },
            { text: <><b className="text-ink">Sold out is confirmed too</b> · a listing that disappears is checked again on the next round ({SPEED.checkSec} s)</> },
            { text: <><b className="text-ink">An error is never &quot;out of stock&quot;</b> · a failed or timed-out request changes nothing · asked again from a fresh address</> },
            { text: <><b className="text-ink">One push per restock</b> · no repeats while it stays in stock · nothing for the very first time a store is seen</> },
          ]} />
        </Section>

        {/* data */}
        <Section id="data" h2="What does PickupChecker record?" lead={dataLead} facts={facts}>
          <StatGrid cols={3} className="mt-5">
            <Stat value={f.restocks ? n(f.restocks) : "—"} label="confirmed restocks" tone="accent" />
            <Stat value={f.soldouts ? n(f.soldouts) : "—"} label="confirmed sell-outs" />
            <Stat value={f.restockStores ? n(f.restockStores) : "—"} label="stores with at least one restock" />
          </StatGrid>
          <BlockView b={dataTable} facts={facts} />
          <Measured>
            Only our own confirmed observations enter these numbers. Where a page also shows restocks reported by other trackers, they are drawn as a separate, labelled series and never counted. US since {TRACKING_SINCE_US}, other countries since {TRACKING_SINCE_INTL}.
          </Measured>
        </Section>

        {/* your store */}
        <Section id="your-store" h2="When does my Apple Store restock?" lead={yourStoreLead} facts={facts}>
          <StepStrip className="mt-5 lg:grid-cols-4!" steps={[
            { title: "Find your store", hint: <Inline text="search by store, city or ZIP at the top of any page, or browse [Apple Stores by state](/stores)" facts={facts} /> },
            { title: "Read \"When does … restock?\"", hint: `the hour restocks usually land in local time, the busiest weekday and the last ${PATTERN_DAYS} days` },
            { title: "Check \"Restocks by configuration\"", hint: "whether your exact storage and color is one that comes back" },
            { title: "Set an alert", hint: <>for that store and configuration, so you do not have to watch: checked every {SPEED.fastSec} seconds from then on</> },
          ]} />
          {ex ? (
            <>
              <div className="eyebrow mt-6">For example: <Link href={ex.path} className="normal-case tracking-normal text-ink underline underline-offset-2">{ex.name}</Link>, last {PATTERN_DAYS} days</div>
              <StatGrid cols={4} className="mt-3">
                <Stat value={n(ex.p.restocks)} label="confirmed restocks" />
                <Stat value={hourLabel(ex.p.peakHour!)} label="most land around this hour, local time" tone="accent" />
                <Stat value={ex.p.peakWeekday != null ? WEEKDAYS[ex.p.peakWeekday] : "—"} label={ex.p.peakWeekday != null ? "the busiest day" : "busiest day: needs two weeks of data"} tone={ex.p.peakWeekday != null ? "plain" : "muted"} />
                <Stat value={ex.p.medianStayMin != null ? `~${ex.p.medianStayMin}` : "—"} unit={ex.p.medianStayMin != null ? "min" : undefined} label="a typical restock stayed listed" />
              </StatGrid>
            </>
          ) : (
            <Points className="mt-5" items={[{ text: <>Each store page shows the hour restocks usually land, the busiest weekday and the last {PATTERN_DAYS} days, day by day</> }]} />
          )}
          <Points className="mt-5" items={[
            { text: <><b className="text-ink">A pattern is history, not a promise</b>: Apple publishes no restock schedule, and a launch week can look nothing like the week after</>, no: true },
            { text: <>The alert, not the chart, is what gets you the phone</>, step: true },
          ]} />
          <LinkRow links={[{ label: "When does Apple restock the iPhone Duo? Country-wide, hour by hour", href: "/iphone-duo-restock-times" }, { label: "How fast does an iPhone Duo restock sell out?", href: "/iphone-duo-sell-out-times" }]} />
          <Figure id="apple-store-pickup-counter" />
        </Section>

        {/* coverage */}
        <Section id="coverage" h2="Which stores and iPhones are covered?" lead={coverageLead} facts={facts}>
          <StatGrid cols={3} className="mt-5">
            <Stat value={STORES.length} label="Apple Stores in the US" tone="accent" />
            <Stat value={n(intl)} label={<>more in {INTL_CODES.length} other countries</>} />
            <Stat value="3" label="iPhones: Duo, 18 Pro and 18 Pro Max, every storage and color, with Apple's local prices" />
          </StatGrid>
          <Chips className="mt-4" items={COUNTRIES_COVERED} />
          <LinkRow links={[{ label: "The US stores", href: "/stores" }, { label: "The UK", href: "/uk" }, { label: "Japan", href: "/jp" }]} />
        </Section>

        {/* cost */}
        <Section id="cost" h2="What does PickupChecker cost?" lead={costLead} facts={facts}>
          <StatGrid cols={3} className="mt-5">
            <Stat value={`$${PLANS.plus.priceUsd}`} unit="/ month" label={<>Plus · {PLANS.plus.limit} alerts</>} tone="accent" />
            <Stat value={`$${PLANS.pro.priceUsd}`} unit="/ month" label={<>Pro · {PLANS.pro.limit} alerts</>} />
            <Stat value={`$${PLANS.max.priceUsd}`} unit="/ month" label={<>Max · {PLANS.max.limit} alerts</>} />
          </StatGrid>
          <Points className="mt-5" items={[
            { text: <>Live stock, restock times and the restock log: <b className="text-ink">free to browse</b></> },
            { text: <>One alert = one store × one exact configuration</> },
            { text: <Inline text={`Every plan gets the same ${SPEED.fastSec}-second checks ([pricing](/pricing))`} facts={facts} /> },
          ]} />
        </Section>

        {/* limits */}
        <Section id="limits" h2="What can't PickupChecker do?" lead="It sees **what apple.com shows, nothing more**." facts={facts}>
          <Points className="mt-5" items={[
            { text: <>Public availability only: no quantities, no holds</>, no: true },
            { text: <>Apple sometimes shows stock already reserved for other orders</>, no: true },
            { text: <Inline text="Phone notifications need the Home Screen app ([install](/install)); without one, alerts come by email from alerts@pickupchecker.com" facts={facts} /> },
          ]} />
          <div className="mt-5"><Link href="/#notify" className="btn btn-primary">Set up an alert</Link></div>
        </Section>
      </div>

      <div className="mx-auto mt-10 max-w-3xl"><RichFaq items={faq} facts={facts} title="Questions" /></div>
      <div className="mx-auto mt-8 max-w-3xl"><SourceList sources={sources} facts={facts} where={`${n(ALL_STORES.length)} Apple Stores in ${INTL_CODES.length + 1} countries`} since={TRACKING_SINCE_US} /></div>
    </div>
  );
}
