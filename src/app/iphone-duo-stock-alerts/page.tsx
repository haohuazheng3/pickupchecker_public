/**
 * /iphone-duo-stock-alerts: what an alert is and why the interval matters, shown as tiles, a step strip, tables and
 * swaps. Each H2 is a question with one answer-first sentence; every number is live.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { BlockView } from "@/components/content/Blocks";
import { Inline } from "@/components/content/Inline";
import { Figure } from "@/components/content/Figure";
import { RichFaq, SourceList } from "@/components/content/RichFaq";
import { JsonLd } from "@/components/seo/JsonLd";
import { AlertBannerMock } from "@/components/content/CheckoutMocks";
import { getFacts, type Facts } from "@/lib/content/facts";
import type { Block, Faq, Source } from "@/lib/content/types";
import { ALL_STORES, STORES, appleName, storePath } from "@/lib/apple/catalog";
import { INTL_CODES } from "@/lib/apple/countries";
import { OTHER_TRACKERS, PLANS, SPEED } from "@/lib/plans";
import { TRACKING_SINCE_INTL, TRACKING_SINCE_US, hourLabel, siteFacts } from "@/lib/content/siteFacts";
import { busiestWindow, duoRestockTimes } from "@/lib/content/restockTimes";
import { medianBand } from "@/lib/stock/sellouts";
import { alertHref } from "@/lib/seo/enrich";
import { Measured, Points, Stat, StatGrid, StepStrip, Swap } from "@/components/ui/Viz";

export const dynamic = "force-dynamic";

const TITLE = "iPhone Duo Stock Alerts: Notified Seconds After a Restock";
const DESCRIPTION = `iPhone Duo in-stock alerts: your Apple Stores checked every ${SPEED.fastSec} seconds, a push about ${SPEED.alertSec} s after a confirmed restock. A typical Duo restock is gone in about a minute.`;
const PATH = "/iphone-duo-stock-alerts";
const WEB_PUSH = "https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers";
const APPLE_HELP = "https://www.apple.com/shop/help/shipping_delivery";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} · PickupChecker` },
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { type: "article", siteName: "PickupChecker", title: TITLE, description: DESCRIPTION, url: PATH },
};

const n = (x: number) => x.toLocaleString("en-US");
/** Whole-percent shares; a share under half a percent reads "<1%", never a misleading "0%". */
const pct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : `${Math.round(x * 100)}%`);
const longDate = (ymd: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
const hl = (h: number) => hourLabel(h % 24);

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

export default async function DuoStockAlerts() {
  const [f, facts, rt] = await Promise.all([siteFacts(), getFacts(), duoRestockTimes("us")]);
  const ds = f.duoSellout; // iPhone Duo restocks of the last 7 days that sold out
  const so = rt.sellout; // every confirmed US Duo restock since tracking began that sold out
  const intl = ALL_STORES.length - STORES.length;
  const typical = ds ? `about ${medianBand(ds.medianSec)}` : "about a minute";
  const since = longDate(rt.since);
  const bw = rt.peakHour != null && rt.n > 0 ? busiestWindow(rt.byHour) : null;
  const top = rt.topStores[0];
  const topStore = top ? STORES.find((s) => s.storeNumber === top.storeNumber) : undefined;
  const setupHref = alertHref({ model: "duo" });

  const alertTable: Block = { t: "table", head: ["What one alert is", "Detail"], rows: [
    ["Scope", "one Apple Store × one exact configuration (model, storage, color)"],
    ["Confirmation", "two matching answers from apple.com, about 1 second apart"],
    ["Delivery", `push about ${SPEED.alertSec} seconds after confirmation; notifications only, never email`],
    ["Coverage", `${STORES.length} US Apple Stores, plus ${intl} stores in ${INTL_CODES.length} other countries`],
  ], caption: "The same checks for every plan.", source: "PickupChecker's poller; the two-answer rule is described on [how it works](/how-it-works)" };
  const compareTable: Block = { t: "table", head: ["Tracker", "Check interval, as published on their own sites, November 2026", "Push delay, as claimed"], rows: [
    ["PickupChecker", `every ${SPEED.fastSec} seconds for stores with alerts; every ${SPEED.checkSec} seconds for all ${STORES.length} US stores`, `about ${SPEED.alertSec} seconds after a confirmed restock`],
    ["InStock Radar", "an 8-second interval for stores a paid alert points at; \"every few minutes\" for new models elsewhere", "median 2 seconds (their claim)"],
    ["Store Stock Checker", "a 15-second check of \"your Apple Stores\", up to 5 stores per plan", "about 2 seconds (their claim)"],
    ["iPhoneStockChecker.com", "once a minute (as reported)", "not published"],
    ["ManzanaTracker", "roughly 5-minute checks", "not published"],
    ["Apple Inventory Check", "a 15-minute cadence", "not published"],
  ], caption: "Self-published intervals only: we have not measured anyone else's service and will not pretend to.", source: "each tracker's own website, read in November 2026; PickupChecker's figures from its poller" };

  const fastLead = ds
    ? `Half within **${ds.medianSec} seconds** over the last 7 days (${n(ds.n)} sold-out Duo restocks, **${pct(ds.within30)}** within 30 s)${so ? `; since ${since}, **${pct(so.within2min)}** of ${n(so.n)} US Duo restocks were gone within 2 minutes` : ""}.`
    : so ? `Within minutes: since ${since}, **${pct(so.within2min)}** of ${n(so.n)} confirmed US iPhone Duo restocks were gone within 2 minutes and ${pct(so.within20min)} within 20, with a median listing of ${so.medianSec} seconds.`
    : "Too early to say: we state sell-out times only once 20 or more confirmed restocks have sold out, and the window does not have them yet.";
  const howLead = `Your stores are asked every **${SPEED.fastSec} seconds** and every other US Apple Store every ${SPEED.checkSec}; a first "available" is asked again about a second later, and once two answers agree a push reaches your phone about **${SPEED.alertSec} seconds** after the restock.`;
  const compareLead = `By published check interval, PickupChecker's **${SPEED.fastSec} seconds** is the shortest we know of; the other trackers publish ${OTHER_TRACKERS}, and we compare published numbers only.`;
  const setupLead = "Four steps, about two minutes: pick the iPhone, storage and color; tick the stores you can reach; on iPhone add PickupChecker to your Home Screen; **reserve on apple.com from the push**.";
  const costLead = `Browsing is free; alerts are **$${PLANS.plus.priceUsd}** a month for ${PLANS.plus.limit} (${PLANS.plus.name}), $${PLANS.pro.priceUsd} for ${PLANS.pro.limit} (${PLANS.pro.name}) or $${PLANS.max.priceUsd} for ${PLANS.max.limit} (${PLANS.max.name}), one alert being one store × one exact configuration.`;
  const arrivesLead = `Tap it, choose "I'll pick it up" at the store it names and pay with Apple Pay while already signed in: you have **${typical}** in the typical case, and the people who get the phone did their setup before the alert came.`;

  const nav = [
    { id: "how-fast", label: "How fast restocks vanish" },
    { id: "how-alerts-work", label: "How alerts work" },
    { id: "compare", label: "Versus other trackers" },
    { id: "setup", label: "Set up an alert" },
    { id: "cost", label: "Price" },
    { id: "when-it-arrives", label: "When the alert arrives" },
  ];

  const faq: Faq[] = [
    { q: "Do alerts work on iPhone without an app from the App Store?", a: `Yes: add PickupChecker to your Home Screen from Safari and allow notifications once, a web app with web push that Apple supports for Home Screen web apps ([Apple Developer](${WEB_PUSH}); [install guide](/install)). Without a device set up, alerts arrive by email from alerts@pickupchecker.com.` },
    { q: "How many alerts do I need?", a: `Usually ${PLANS.plus.limit} or fewer: one configuration at the stores you can reach, two acceptable colors being two alerts per store. ${PLANS.plus.name} covers ${PLANS.plus.limit}, ${PLANS.pro.name} ${PLANS.pro.limit}, ${PLANS.max.name} ${PLANS.max.limit} ([pricing](/pricing)).` },
    { q: "Can PickupChecker reserve the phone for me?", a: "No: it tells you within seconds that a store lists your configuration, and you reserve on apple.com with in-store pickup, where Apple holds it for you. PickupChecker is independent and not affiliated with Apple; it reads the same pickup availability anyone can see on apple.com, just far more often." },
    { q: `Why every ${SPEED.fastSec} seconds and not every second?`, a: `Because apple.com answers a limited number of requests from one address, and every restock must be confirmed by a second answer about a second later, which asking every second would not shorten and would risk getting no answers at all. At ${SPEED.fastSec} seconds the longest wait between a restock and our first look is ${SPEED.fastSec} seconds${ds ? `, against a median listing of ${ds.medianSec}` : ""}.` },
    { q: "Does it cover Apple Stores outside the US?", a: `Yes: ${intl} Apple Stores in ${INTL_CODES.length} other countries, tracked since ${longDate(TRACKING_SINCE_INTL)}, with the same ${SPEED.fastSec}-second checks for stores with alerts. Start from a country's page, such as [Canada](/ca), [the UK](/uk), [Australia](/au) or [Japan](/jp).` },
  ];

  const sources: Source[] = [
    { label: "Apple: Delivery and Pickup (how in-store pickup works)", url: "https://www.apple.com/shop/shipping-pickup" },
    { label: "Apple: Shipping & Pickup help (what to bring to a pickup)", url: APPLE_HELP },
    { label: "Apple Developer: Sending web push notifications in web apps and browsers", url: WEB_PUSH },
    { label: "Wikipedia: Push technology (what a push notification is)", url: "https://en.wikipedia.org/wiki/Push_technology" },
  ];

  const site = "https://pickupchecker.com";
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${site}${PATH}`, url: `${site}${PATH}`, name: TITLE, description: DESCRIPTION, isPartOf: { "@id": `${site}/#website` }, about: { "@id": `${site}/#organization` }, dateModified: f.at },
      {
        "@type": "HowTo", name: "How to set up an iPhone Duo in-stock alert",
        totalTime: "PT2M",
        step: [
          { "@type": "HowToStep", name: "Pick the iPhone, storage and color", text: "One alert is one exact configuration.", url: `${site}${setupHref}` },
          { "@type": "HowToStep", name: "Tick the stores you can reach", text: "Stores are listed nearest first with an estimated drive time." },
          { "@type": "HowToStep", name: "Add PickupChecker to your Home Screen and allow notifications", text: "On iPhone, alerts are web push notifications to the Home Screen app.", url: `${site}/install` },
          { "@type": "HowToStep", name: "Open apple.com from the push and reserve", text: `About ${SPEED.alertSec} seconds after a confirmed restock the push arrives; choose in-store pickup at the store it names.` },
        ],
      },
    ],
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 sm:pt-12">
      <JsonLd data={ld} />

      {/* hero */}
      <section className="grid items-start gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="eyebrow mb-4">iPhone Duo · in-stock alerts</div>
          <h1 className="display text-4xl sm:text-6xl">What is the fastest way to get notified when the iPhone Duo is in stock?</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-2"><b className="text-ink">An automated tracker with push</b>: PickupChecker asks your stores every <b className="text-ink">{SPEED.fastSec} seconds</b>, the fastest published interval of any iPhone stock tracker we know of (the others publish {OTHER_TRACKERS}), and your phone hears about a confirmed restock about <b className="text-ink">{SPEED.alertSec} seconds</b> later.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={setupHref} className="btn btn-primary btn-lg">Set up an iPhone Duo alert</Link>
            <Link href="/how-to-grab-an-iphone-duo-restock" className="btn btn-ghost btn-lg">The 20-second checkout</Link>
          </div>
        </div>
        <StatGrid cols={2}>
          <Stat value={`${SPEED.fastSec}`} unit="s" label="between checks at the stores your alerts point at" tone="accent" />
          <Stat value={`~${SPEED.alertSec}`} unit="s" label="confirmed restock to the push on your phone" />
          <Stat value={ds ? `${ds.medianSec}` : "~60"} unit="s" label={ds ? <>typical Duo listing, listed to gone · last 7 days, {n(ds.n)} restocks</> : "typical Duo listing, listed to gone"} tone="warn" />
          <Stat value={ds ? pct(ds.within30) : "20–30"} unit={ds ? undefined : "s"} label={ds ? "of last week's restocks gone within 30 seconds" : "some restocks are gone this fast"} tone="warn" />
        </StatGrid>
      </section>

      <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-2 text-sm">
        {nav.map((s) => <a key={s.id} href={`#${s.id}`} className="chip px-3 py-1.5 text-xs">{s.label}</a>)}
      </nav>

      <div className="mt-6 grid gap-5">
        {/* how fast */}
        <Section id="how-fast" h2="How fast does an iPhone Duo restock disappear?" lead={fastLead} facts={facts}>
          {so && (
            <StatGrid cols={3} className="mt-5">
              <Stat value={`${so.medianSec}`} unit="s" label={<>median listing since {since} · {n(so.n)} sold-out restocks</>} tone="warn" />
              <Stat value={pct(so.within2min)} label="gone within 2 minutes" />
              <Stat value={pct(so.within20min)} label="gone within 20 minutes" tone="muted" />
            </StatGrid>
          )}
          {ds ? (
            <>
              <div className="eyebrow mt-6">Share of the last 7 days&apos; Duo restocks a tracker would have seen at least once</div>
              <StatGrid cols={4} className="mt-3">
                <Stat value="all" label={<>checking every {SPEED.fastSec} seconds (PickupChecker, stores with alerts): this is the set our checks saw</>} tone="accent" />
                <Stat value={pct(ds.caught.m1)} label="checking every 1 minute" tone="muted" />
                <Stat value={pct(ds.caught.m5)} label="checking every 5 minutes" tone="muted" />
                <Stat value={pct(ds.caught.m15)} label="checking every 15 minutes" tone="muted" />
              </StatGrid>
              <Measured>
                A listing that lasts d seconds is seen by a check every T seconds with probability min(1, d ÷ T), over the {n(ds.n)} Duo restocks that sold out in the last 7 days. A restock&apos;s life runs from the check that first saw it to the check that first saw it gone, so every duration is an upper bound and these rates flatter the slower trackers.
              </Measured>
            </>
          ) : (
            <p className="pane-2 mt-5 p-4 text-sm text-ink-3">The catch-rate tiles appear once 20 or more confirmed iPhone Duo restocks have sold out within the last 7 days; until then we would rather show nothing than a shaky number.</p>
          )}
          <ol className="mt-5 grid gap-3 sm:grid-cols-2">
            <Swap no="A tracker checking every 5 or 15 minutes" yes={<>A push about {SPEED.alertSec} s after confirmation</>} why={ds ? <>A restock historian, not an alert: it misses <b>{pct(1 - ds.caught.m5)}</b> of Duo restocks outright at 5 minutes and <b>{pct(1 - ds.caught.m15)}</b> at 15.</> : "A restock historian, not an alert: it can tell you a store had stock this morning, which is true and useless."} />
            <Swap no="Refreshing apple.com by hand" yes={<>Your stores asked every {SPEED.fastSec} seconds</>} why="Checking every few minutes mostly finds nothing; the listing came and went between two reloads." />
          </ol>
          <LinkRow links={[{ label: "Every restock with the seconds it lasted", href: "/iphone-duo-sell-out-times" }]} />
          <Figure id="texting-city-street" />
        </Section>

        {/* how alerts work */}
        <Section id="how-alerts-work" h2="How do PickupChecker alerts work?" lead={howLead} facts={facts}>
          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <StepStrip className="lg:grid-cols-2!" steps={[
                { title: "Check", hint: <>your stores asked for your exact configuration every {SPEED.fastSec} seconds; every other US Apple Store every {SPEED.checkSec}</> },
                { title: "Confirm", hint: "the first \"available\" is asked again about a second later; a restock counts only when both agree" },
                { title: "Push", hint: <Inline text={`about ${SPEED.alertSec} seconds after confirmation, to the PickupChecker app on your Home Screen ([install](/install)), naming store and configuration; no device → an email from alerts@pickupchecker.com`} facts={facts} /> },
                { title: "Once", hint: "one push per restock: nothing while it stays listed, nothing for sell-outs or a store's first sighting" },
              ]} />
              <BlockView b={alertTable} facts={facts} />
              <Points items={[
                { text: <Inline text={`On iPhone the notification is a [web push](https://en.wikipedia.org/wiki/Push_technology) to a Home Screen web app, supported in Safari ([Apple Developer](${WEB_PUSH}))`} facts={facts} /> },
                { text: <>Nothing to download · one permission prompt</> },
                { text: <>Read the store name in the banner, then reserve</>, step: true },
              ]} />
            </div>
            <div className="mx-auto w-full max-w-[16rem] lg:mx-0"><AlertBannerMock /></div>
          </div>
          <Figure id="phone-notification" />
        </Section>

        {/* compare */}
        <Section id="compare" h2="How does it compare with other iPhone stock trackers?" lead={compareLead} facts={facts}>
          <BlockView b={compareTable} facts={facts} />
          {ds && (
            <>
              <div className="eyebrow">Of a median listing&apos;s life ({ds.medianSec} s), burnt before a tracker&apos;s first look</div>
              <StatGrid cols={2} className="mt-3">
                <Stat value={`up to ${pct(SPEED.checkSec / ds.medianSec)}`} label="with a 15-second interval" tone="warn" />
                <Stat value={`up to ${pct(SPEED.fastSec / ds.medianSec)}`} label={<>with a {SPEED.fastSec}-second interval</>} tone="accent" />
              </StatGrid>
            </>
          )}
          <Points className="mt-5" items={[
            { text: <>The interval is the one number worth comparing: <b className="text-ink">every tracker controls it</b></> },
            { text: <>&quot;Fastest&quot; without an interval is marketing</>, no: true },
            { text: <>Ours is <b className="text-ink">{SPEED.fastSec} seconds</b>; hold us to it</>, step: true },
          ]} />
        </Section>

        {/* setup */}
        <Section id="setup" h2="How do I set up an iPhone Duo alert?" lead={setupLead} facts={facts}>
          <StepStrip className="mt-5 lg:grid-cols-4!" steps={[
            { title: "Pick the iPhone, storage and color", hint: "one alert is one exact configuration; two acceptable colors are two alerts" },
            { title: "Tick the stores you can reach", hint: "nearest first, with an estimated drive time" },
            { title: "Add PickupChecker to your Home Screen", hint: <Inline text={`on iPhone, then allow notifications ([step by step](/install))`} facts={facts} /> },
            { title: "Reserve from the push", hint: "open apple.com from it and check out with in-store pickup at the store it names" },
          ]} />
          <h3 className="mt-7 text-lg font-semibold">Which stores should I pick?</h3>
          <p className="mt-2 text-ink-2">The two or three you can reach by <b className="text-ink">9 AM</b>, plus the ones that restock most.</p>
          <StatGrid cols={2} className="mt-4">
            {bw
              ? <Stat value={pct(bw.share)} label={<>of the {n(rt.n)} confirmed US Duo restocks since {since} landed between {hl(bw.from)} and {hl(bw.to)} local time</>} tone="accent" />
              : <Stat value="—" label={<>the day-by-day picture is on <Link href="/iphone-duo-restock-times" className="underline underline-offset-2">when the iPhone Duo restocks</Link></>} tone="muted" />}
            {top && topStore
              ? <Stat value={n(top.restocks)} label={<><Link href={storePath(topStore)} className="underline underline-offset-2">{appleName(topStore)}</Link> · most confirmed Duo restocks since {since} · {top.days} days</>} />
              : <Stat value="—" label="the store with the most restocks fills in as they are confirmed" tone="muted" />}
          </StatGrid>
          <Points className="mt-4" items={[
            { text: <>A store you cannot reach in the morning is a weaker pick than a farther one you can</>, no: true },
          ]} />
          <LinkRow links={[{ label: "Which iPhone Duo restocks most", href: "/which-iphone-duo-restocks-most" }, { label: "iPhone Duo near me", href: "/iphone-duo-near-me" }, { label: "When the iPhone Duo restocks", href: "/iphone-duo-restock-times" }]} />
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href={setupHref} className="btn btn-primary">Set up an iPhone Duo alert</Link>
            <span className="text-sm text-ink-3">Your stores checked every {SPEED.fastSec} seconds from then on.</span>
          </div>
          <Figure id="apple-store-night-vancouver" />
        </Section>

        {/* cost */}
        <Section id="cost" h2="What does it cost?" lead={costLead} facts={facts}>
          <StatGrid cols={3} className="mt-5">
            <Stat value={`$${PLANS.plus.priceUsd}`} unit="/ month" label={<>{PLANS.plus.name} · {PLANS.plus.limit} alerts</>} tone="accent" />
            <Stat value={`$${PLANS.pro.priceUsd}`} unit="/ month" label={<>{PLANS.pro.name} · {PLANS.pro.limit} alerts</>} />
            <Stat value={`$${PLANS.max.priceUsd}`} unit="/ month" label={<>{PLANS.max.name} · {PLANS.max.limit} alerts</>} />
          </StatGrid>
          <Points className="mt-5" items={[
            { text: <><b className="text-ink">{PLANS.plus.limit} alerts</b> = one configuration at {PLANS.plus.limit} stores, or two at five: most people in one metro area</> },
            { text: <>{PLANS.pro.name} and {PLANS.max.name}: several colors, several people or a long drive radius</> },
            { text: <>Every plan: the same {SPEED.fastSec}-second checks and ~{SPEED.alertSec}-second push · live stock and the restock log are free to browse</> },
          ]} />
          <LinkRow links={[{ label: "Pricing", href: "/pricing" }]} />
        </Section>

        {/* when it arrives */}
        <Section id="when-it-arrives" h2="What should I do the moment the alert arrives?" lead={arrivesLead} facts={facts}>
          <StepStrip className="mt-5 lg:grid-cols-4!" steps={[
            { title: "Be signed in before the alert", hint: "Apple Pay or a card and your address saved; typing an address during a restock is how people lose it" },
            { title: "Tap → \"I'll pick it up\"", hint: "at the store named; if it already reads unavailable, try your other stores: a batch often reaches several at once" },
            { title: "Finish checkout", hint: "the reservation is the order; Apple emails when it is ready and states the pickup window" },
            { title: "Bring what Apple asks for", hint: <Inline text={`the order number or QR code from the pickup email and a government-issued photo ID ([Apple: Shipping & Pickup help](${APPLE_HELP}))`} facts={facts} /> },
          ]} />
          <LinkRow links={[{ label: "Tap by tap: grab a restock in 20 seconds, checkout staged before the window", href: "/how-to-grab-an-iphone-duo-restock" }, { label: "The wider plan: how to get an iPhone Duo", href: "/how-to-get-an-iphone-duo" }, { label: "What the wording on apple.com means", href: "/apple-store-pickup-availability-explained" }]} />
          <div className="mt-5"><Link href={setupHref} className="btn btn-primary">Set up an alert</Link></div>
        </Section>
      </div>

      <div className="mx-auto mt-10 max-w-3xl"><RichFaq items={faq} facts={facts} title="Questions" /></div>
      <div className="mx-auto mt-8 max-w-3xl"><SourceList sources={sources} facts={facts} where={`${n(ALL_STORES.length)} Apple Stores in ${INTL_CODES.length + 1} countries`} since={TRACKING_SINCE_US} /></div>
    </div>
  );
}
