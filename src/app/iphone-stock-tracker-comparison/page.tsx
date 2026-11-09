/**
 * /iphone-stock-tracker-comparison (2026-11-09): iPhone stock trackers side by side on one basis — stated check
 * interval, confirmation, stated alert delay, channels, coverage, what one alert covers, and the monthly cost of the
 * same two needs. Neutral and dated: every other tracker's figure is its own claim, read on TRACKERS_READ and labelled
 * "not independently measured"; PickupChecker's row shows its plan and its live measurement (serviceStats). No
 * ranking, no superlatives, homepages linked rel="nofollow noopener". English only.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { Inline } from "@/components/content/Inline";
import { Figure } from "@/components/content/Figure";
import { RichFaq, SourceList } from "@/components/content/RichFaq";
import { JsonLd } from "@/components/seo/JsonLd";
import { getFacts, type Facts } from "@/lib/content/facts";
import type { Faq, Source } from "@/lib/content/types";
import { ALL_STORES } from "@/lib/apple/catalog";
import { INTL_CODES } from "@/lib/apple/countries";
import { OTHER_TRACKERS, PLANS, SPEED } from "@/lib/plans";
import { TRACKING_SINCE_US } from "@/lib/content/siteFacts";
import { serviceStats, secs } from "@/lib/content/serviceStats";
import { abovePlan, count } from "@/lib/content/serviceCopy";
import { NEEDS, OTHER_TRACKER_CLAIMS, TRACKERS_READ, TRACKERS_READ_LABEL } from "@/lib/content/trackers";
import { CostTable, TrackerTable } from "@/components/service/TrackerTables";
import { Measured, Points, Stat, StatGrid, StepStrip } from "@/components/ui/Viz";

export const dynamic = "force-dynamic";

const PATH = "/iphone-stock-tracker-comparison";
const TITLE = "iPhone Stock Trackers Compared: Check Intervals, Alerts, Prices";
const H1 = "iPhone stock trackers compared: check intervals, alerts and prices (November 2026)";
const DESCRIPTION = "Six iPhone stock trackers side by side: stated check interval, confirmation, alert delay, channels, coverage, cost of the same need. Dated, claims labelled.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { type: "article", siteName: "PickupChecker", title: TITLE, description: DESCRIPTION, url: PATH },
};

function Section({ id, h2, lead, facts, children }: { id: string; h2: string; lead: string; facts: Facts; children: ReactNode }) {
  return (
    <section id={id} className="pane scroll-mt-24 p-5 sm:p-7">
      <h2 className="display text-2xl sm:text-3xl">{h2}</h2>
      <p className="mt-3 text-base text-ink-2 sm:text-lg"><Inline text={lead} facts={facts} /></p>
      {children}
    </section>
  );
}
function LinkRow({ links, className = "mt-4" }: { links: { label: string; href: string }[]; className?: string }) {
  return <div className={`flex flex-wrap gap-2 ${className}`}>{links.map((l) => <Link key={l.href} href={l.href} className="chip chip-sm">{l.label}</Link>)}</div>;
}

export default async function TrackerComparison() {
  const [st, facts] = await Promise.all([serviceStats(), getFacts()]);
  const us7 = st.lanes["7d"]["fast-us"], intl7 = st.lanes["7d"]["fast-intl"], push7 = st.delivery["7d"].push;
  const ours = us7 ? `PickupChecker plans ${SPEED.fastSec} seconds and measured a median **${secs(us7.p50Sec)}** (p95 ${secs(us7.p95Sec)}) in the US over the last 7 days` : `PickupChecker plans ${SPEED.fastSec} seconds and publishes its measured interval on its service report`;
  const trackers = OTHER_TRACKER_CLAIMS.length + 1;

  const heroLead = `They differ less in stated speed than in what one alert covers and what it costs. On their own sites, two trackers state a 5–8 second check at the stores your alert points at, two state about 5 minutes and one states none; ${ours}. Every other figure here is the tracker's own claim, read ${TRACKERS_READ_LABEL}.`;
  const tableLead = `On stated check interval, Store Stock Checker (every ${SPEED.fastSec} seconds) and InStock Radar (an 8-second check) sit with PickupChecker's ${SPEED.fastSec}-second plan, ManzanaTracker and Apple Inventory Check state about 5 minutes, and iPhone Stock Checker states none. Only the column marked "measured" was timed by us, and only for our own service.`;
  const costLead = `For ${NEEDS.small.label} the stated plans run from free to $24.99 per 30 days, and the same range holds for ${NEEDS.large.label}. PickupChecker's ${PLANS.plus.name} at $${PLANS.plus.priceUsd} and Store Stock Checker's $5 plan both cover either need; the difference is in how each counts an alert.`;
  const claimsLead = `Only PickupChecker's, and only by PickupChecker: we time our own checks and alerts from our logs and publish the result live. Every other number on this page is what that tracker says about itself; we did not test their services, and a stated "~2 s" and our measured${push7 ? ` ${secs(push7.p50Sec)}` : ""} may not start and stop at the same moments.`;
  const judgeLead = "Ask four questions a tracker should answer with numbers: how often it actually checks your store, measured, with a window and a sample; when its alert delay starts and stops; whether it confirms a first \"in stock\" before alerting; and what one alert covers. A tracker that answers with \"fastest\" has not answered.";
  const freeLead = "When the phone is not scarce for you: if apple.com already offers your configuration for pickup or for a delivery date you can live with, if another colour or storage would do and is listed, or if you can be on the page at the hours restocks usually land, a paid alert buys you little.";

  const nav = [
    { id: "table", label: "Side by side" },
    { id: "cost", label: "Cost of the same need" },
    { id: "claims", label: "Claims vs measurements" },
    { id: "judge", label: "How to judge a tracker" },
    { id: "free", label: "When you need none" },
  ];

  const faq: Faq[] = [
    { q: "Which iPhone stock tracker checks most often?", a: `By stated intervals, Store Stock Checker states every ${SPEED.fastSec} seconds and PickupChecker plans ${SPEED.fastSec} seconds${us7 ? ` (measured median ${secs(us7.p50Sec)} in the US over the last 7 days)` : ""}; InStock Radar states an 8-second check at stores a paid alert points at. No one has measured all of them on the same basis, so no one can honestly name a fastest.` },
    { q: "Are free iPhone stock trackers good enough?", a: "For a phone that is not scarce, yes: a free checker, or apple.com itself, shows what a store lists. For a configuration that sells out within a minute, a checker that refreshes on your own device helps only while the page stays open and you are watching it; an alert that runs while you are not is what a paid plan is for." },
    { q: "What does \"alert delay\" mean on a tracker's site?", a: `It depends on the tracker, which is the problem. PickupChecker's runs from the first check that saw the restock to the push service accepting the alert${push7 ? ` (median ${secs(push7.p50Sec)}, last 7 days)` : ""}; arrival on the phone is not measured by anyone. Another tracker's "~2 seconds" may start or stop elsewhere, and its site does not say.` },
    { q: "Why does PickupChecker confirm a restock before alerting?", a: "Because apple.com sometimes lists a configuration for a second or two and withdraws it. Asking the store again about a second later costs that second and keeps those blips from becoming alerts. Of the trackers here, only ManzanaTracker also states a re-check before it emails." },
    { q: "Is this comparison neutral?", a: "PickupChecker wrote it and is one of the trackers in it, so read it with that in mind. Every other row quotes the tracker's own site with the date it was read, nothing is ranked, and our row shows a measurement anyone can check on the [service report](/service-report). Corrections are welcome through [contact](/contact)." },
  ];
  // The trackers themselves are cited in the tables (rel="nofollow noopener"), not here, where links are followed.
  const sources: Source[] = [
    { label: "Apple: Delivery and Pickup (how in-store pickup works)", url: "https://www.apple.com/shop/shipping-pickup" },
    { label: "Apple Developer: Sending web push notifications in web apps and browsers", url: "https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers" },
  ];

  const site = "https://pickupchecker.com";
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article", "@id": `${site}${PATH}#article`, headline: H1, description: DESCRIPTION, url: `${site}${PATH}`,
        datePublished: TRACKERS_READ, dateModified: st.at > `${TRACKERS_READ}T00:00:00Z` ? st.at : TRACKERS_READ,
        author: { "@id": `${site}/#organization` }, publisher: { "@id": `${site}/#organization` }, isPartOf: { "@id": `${site}/#website` },
        about: OTHER_TRACKER_CLAIMS.map((t) => ({ "@type": "WebSite", name: t.name, url: t.url })),
      },
    ],
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 sm:pt-12">
      <JsonLd data={ld} />

      {/* hero */}
      <section>
        <div className="eyebrow mb-4">iPhone stock trackers · read {TRACKERS_READ_LABEL}</div>
        <h1 className="display text-4xl sm:text-5xl">{H1}</h1>
        <p className="mt-5 max-w-3xl text-lg text-ink-2"><Inline text={heroLead} facts={facts} /></p>
        <StatGrid cols={4} className="mt-6">
          <Stat value={trackers} label="trackers compared, PickupChecker included" />
          <Stat value={OTHER_TRACKERS.replace(" seconds to ", " s – ").replace(" minutes", " min")} label="check intervals the others state about themselves" size="sm" />
          <Stat value={us7 ? us7.p50Sec.toFixed(1) : `${SPEED.fastSec}`} unit="s" label={us7 ? <>PickupChecker&apos;s measured median, US alert stores, 7 days · plan {SPEED.fastSec} s</> : "PickupChecker's plan (measurement on the service report)"} tone="accent" />
          <Stat value="0" label="other trackers measured by us: their figures are their claims" tone="muted" />
        </StatGrid>
      </section>

      <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-2 text-sm">
        {nav.map((s) => <a key={s.id} href={`#${s.id}`} className="chip px-3 py-1.5 text-xs">{s.label}</a>)}
      </nav>

      <div className="mt-6 grid gap-5">
        <Section id="table" h2="How do iPhone stock trackers compare, side by side?" lead={tableLead} facts={facts}>
          <TrackerTable st={st} />
          <Points items={[
            { text: <>Read across a row: a 5-second check on 2 alerts and an 8-second check on 25 alerts are different products for different needs</> },
            { text: <>&quot;Not stated&quot; means we did not find it on their site on {TRACKERS_READ_LABEL}, not that the tracker lacks it</> },
            { text: <>No row is ranked, and none is called fastest: no one has measured them all on one basis</>, no: true },
          ]} />
          <Figure id="phone-notification" />
        </Section>

        <Section id="cost" h2="What does the same need cost on each tracker?" lead={costLead} facts={facts}>
          <CostTable st={st} />
          <Points items={[
            { text: <><b className="text-ink">Units differ</b>: PickupChecker counts one store × one configuration, so {NEEDS.small.label} is {NEEDS.small.alerts} alerts; Store Stock Checker counts one configuration at up to 5 nearby stores; InStock Radar one iPhone at one store or area</> },
            { text: <>Ask what a second colour costs: on most trackers it is a second alert</> },
            { text: <>&quot;Per 30 days&quot; renews about 12.2 times a year, &quot;per month&quot; 12</> },
          ]} />
        </Section>

        <Section id="claims" h2="Which of these numbers are measured?" lead={claimsLead} facts={facts}>
          <StatGrid cols={3} className="mt-5">
            <Stat value={us7 ? us7.p95Sec.toFixed(1) : "—"} unit={us7 ? "s" : undefined} label={us7 ? <>p95 between checks, US alert stores · {count(us7.gaps)} intervals, 7 days</> : "US alert stores: measurement pending"} tone="accent" />
            <Stat value={intl7 ? intl7.p50Sec.toFixed(1) : "—"} unit={intl7 ? "s" : undefined} label={intl7 ? <>median, alert stores in other countries{abovePlan("fast-intl", intl7) ? `: above the ${SPEED.fastSec}-second plan` : ""}</> : "other countries: measurement pending"} tone={abovePlan("fast-intl", intl7) ? "warn" : "plain"} />
            <Stat value={push7 ? push7.p50Sec.toFixed(1) : "—"} unit={push7 ? "s" : undefined} label={push7 ? <>median, first check that saw a restock → push service accepted the alert · {count(push7.events)} restocks</> : "alert delay: no alerts in the last 7 days"} />
          </StatGrid>
          <Points className="mt-5" items={[
            { text: <>Their &quot;~2 seconds&quot; starts at &quot;spotting stock&quot;; ours starts at our first check that saw it and stops when the push service accepts the alert</> },
            { text: <>Neither of us can see the moment your phone shows it</>, no: true },
            { text: <>Our view: pick the tracker whose numbers you can check, and check them</>, step: true },
          ]} />
          <LinkRow links={[{ label: "PickupChecker's service report", href: "/service-report" }, { label: "How PickupChecker works", href: "/how-it-works#measured" }]} />
        </Section>

        <Section id="judge" h2="How should you judge any iPhone stock tracker?" lead={judgeLead} facts={facts}>
          <StepStrip className="mt-5 lg:grid-cols-4!" steps={[
            { title: "A measured interval", hint: "median and p95, with the window and the number of checks behind it; a stated interval is a target" },
            { title: "Where the delay starts and stops", hint: "Apple's listing, the first sighting or the confirmation; the push service or your phone (nobody measures the phone)" },
            { title: "Confirmation", hint: "a second answer costs about a second and keeps listings Apple withdraws at once from becoming alerts" },
            { title: "Your stores, your unit", hint: "does it cover the stores you can reach, and how many alerts does your need take in its unit" },
          ]} />
          <Points className="mt-5" items={[
            { text: <>Ask what a failed check becomes: it should be &quot;unknown&quot;, never &quot;sold out&quot;</> },
            { text: <>Ask for the time of the last successful check on every stock reading</> },
            { text: <>&quot;Fastest&quot;, &quot;instant&quot; and &quot;real-time&quot; without a number are marketing</>, no: true },
          ]} />
        </Section>

        <Section id="free" h2="When do you not need a paid tracker at all?" lead={freeLead} facts={facts}>
          <Points className="mt-5" size="base" items={[
            { text: <>Check live stock first, free: <Link href="/iphone-duo-stock-checker" className="underline underline-offset-2">iPhone Duo stock checker</Link> · <Link href="/iphone-duo-near-me" className="underline underline-offset-2">near me</Link></> },
            { text: <>A ship date you can live with beats a pickup race: order online for delivery</> },
            { text: <>Flexible on colour or storage? See <Link href="/which-iphone-duo-restocks-most" className="underline underline-offset-2">which configurations were listed most</Link> (past listings, not odds)</> },
            { text: <>Know your store&apos;s usual hour: <Link href="/iphone-duo-restock-times" className="underline underline-offset-2">when the iPhone Duo restocks</Link>, then be on the page then</> },
            { text: <>Free tools exist: iPhone Stock Checker is free and refreshes on your own device; our live pages and <Link href="/restocks" className="underline underline-offset-2">restock log</Link> are free to browse</> },
            { text: <>Pay only for the shortage you actually face, and only for the stores you can reach</>, step: true },
          ]} />
          <Measured title="How the table was built">
            Each tracker&apos;s homepage, pricing and FAQ pages were read on {TRACKERS_READ_LABEL}; quotes are their wording, paraphrases keep their numbers. Costs are our reading of each stated plan for the two needs, in PickupChecker&apos;s unit (one store × one exact configuration: {NEEDS.small.alerts} and {NEEDS.large.alerts} alerts). Nothing was bought or tested. PickupChecker&apos;s measured figures come from its own logs ({count(ALL_STORES.length)} Apple Stores in {INTL_CODES.length + 1} countries), refreshed hourly.
          </Measured>
          <Figure id="apple-store-queue" />
        </Section>
      </div>

      <div className="mx-auto mt-10 max-w-3xl"><RichFaq items={faq} facts={facts} title="Questions" /></div>
      <div className="mx-auto mt-8 max-w-3xl"><SourceList sources={sources} facts={facts} where={`${count(ALL_STORES.length)} Apple Stores in ${INTL_CODES.length + 1} countries`} since={TRACKING_SINCE_US} /></div>
    </div>
  );
}
