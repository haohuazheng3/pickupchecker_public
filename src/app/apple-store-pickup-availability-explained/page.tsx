/**
 * /apple-store-pickup-availability-explained: what "currently unavailable for pickup" means, shown as tiles, tables,
 * keyword lines and swaps. Each H2 is a question with one answer-first sentence; every number is live.
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
import { STORES, appleName, storePath } from "@/lib/apple/catalog";
import { SPEED } from "@/lib/plans";
import { TRACKING_SINCE_US, hourLabel } from "@/lib/content/siteFacts";
import { DUO_LAUNCH_DAY, DUO_PICKUP_RESUMED, busiestWindow, duoRestockTimes } from "@/lib/content/restockTimes";
import { recentByConfig } from "@/lib/stock/recent";
import { storesWithStockNow } from "@/lib/stock/queries";
import { alertHref } from "@/lib/seo/enrich";
import { Measured, Points, Stat, StatGrid, StepStrip, Swap } from "@/components/ui/Viz";

export const dynamic = "force-dynamic";

const TITLE = "Apple Pickup Availability: What 'Unavailable' Means";
const DESCRIPTION = "What \"currently unavailable for pickup\" means on apple.com: that store is not listing that exact iPhone right now, not never. iPhone Duo pickup stock lasts minutes.";
const PATH = "/apple-store-pickup-availability-explained";
const MACRUMORS = "https://macrumors.com/2026/10/24/apple-store-pickup-iphone-duo-us/";
const NEWSROOM = "https://www.apple.com/newsroom/2026/10/iphone-duo-arrives-at-apple-store-locations-worldwide/";
const APPLE_PICKUP = "https://www.apple.com/shop/shipping-pickup";
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
const ET_DAY = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "long", day: "numeric" });
const ET_TIME = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

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

export default async function PickupAvailabilityExplained() {
  const [facts, rt, recent, now] = await Promise.all([getFacts(), duoRestockTimes("us"), recentByConfig({ country: "us" }), storesWithStockNow(undefined, "us")]);
  const so = rt.sellout; // every confirmed US iPhone Duo restock since tracking began that sold out
  const since = longDate(rt.since);
  const bw = rt.peakHour != null && rt.n > 0 ? busiestWindow(rt.byHour) : null;
  const drop = rt.drops[0];
  const latestStore = rt.latest ? STORES.find((s) => s.storeNumber === rt.latest!.storeNumber) : undefined;
  const setupHref = alertHref({ model: "duo" });
  const thin = rt.unknown || rt.n === 0;
  const haveRecent = !recent.unknown && recent.restocks > 0;

  const showsTable: Block = { t: "table", head: ["What apple.com shows", "What it does not show"], rows: [
    ["Whether each listed store has your exact configuration for pickup right now; a different color at the same store is a different answer", "How many units a store has"],
    ["A short list of stores near a ZIP code: in our poller's experience up to about a dozen within roughly 250 miles per search", "Every store in the country at once"],
    ["The state at the moment you asked", "When the store last had it, or when it will again"],
    ["Delivery estimates for the same configuration", "Any restock schedule"],
  ], caption: "What the public availability answers show; Apple's own page describes the pickup flow.", source: `[Apple: Delivery and Pickup](${APPLE_PICKUP}); PickupChecker's checks of apple.com pickup availability since ${longDate(TRACKING_SINCE_US)}` };
  const kindsTable: Block = { t: "table", head: ["Way to buy", "What you actually get", "What decides it"], rows: [
    ["Pickup reservation (\"I'll pick it up\" on apple.com)", "a specific phone held for you at one store, with a pickup window Apple states in its email", "whether that store lists the exact configuration at the moment you check out"],
    ["Walking in", "a chance at whatever the store can sell over the counter that day", "stock Apple has not allocated to orders; at the Duo's launch, reported as little or none in most markets"],
    ["Delivery", "a place in a queue with an estimated date", "Apple's supply; dates were reported to slip into 2027 within days of launch"],
  ], caption: "Three different things the same product page sells.", source: `[Apple Newsroom, ${ET_DAY.format(new Date(`${DUO_LAUNCH_DAY}T12:00:00Z`))}](${NEWSROOM}); [MacRumors, ${ET_DAY.format(new Date(`${DUO_PICKUP_RESUMED}T12:00:00Z`))}](${MACRUMORS})` };

  const howLead = `Apple decides it **per store and per exact configuration**: for each store near your ZIP, one of two states (listed for pickup today or "currently unavailable"), with no quantities, no restock time and no schedule.`;
  const kindsLead = "A pickup reservation is **a specific phone Apple holds for you at one store**; walking in is a hope that depends on stock Apple has not allocated to orders; delivery is a queue whose dates were reported to slip into 2027 within days of launch.";
  const flipsLead = so
    ? `Because an iPhone Duo pickup listing lives for a median of **${so.medianSec} seconds**: of ${n(so.n)} sold-out US restocks since ${since}, **${pct(so.within2min)}** were gone within 2 minutes, the fastest within ${so.fastestSec} seconds of appearing.`
    : "Because a pickup listing is a small allocation claimed by many people at once: it appears, is reserved within minutes, and the store reads unavailable again; exact lifetimes appear here once ten confirmed restocks have sold out.";
  const oftenLead = `apple.com answers with the state at the moment you ask; PickupChecker asks every **${SPEED.checkSec} seconds** for every US Apple Store and every **${SPEED.fastSec} seconds** for stores with alerts, and shows a change only when two answers agree.`;
  const afterLead = "Apple emails you when the order is ready and states the pickup window in that email; at the Pickup counter you show **the order number or QR code and a government-issued photo ID**, or a designated contact named at checkout does.";
  const staffLead = `No: Apple publishes no restock schedule and store staff have no public one to share${bw ? `; the observed pattern is the closest thing, **${pct(bw.share)}** of the ${n(rt.n)} confirmed US iPhone Duo restocks since ${since} landing between ${hl(bw.from)} and ${hl(bw.to)} local time` : "; the observed pattern on each store page is the closest thing, once a store has enough restocks to state one"}.`;

  const nav = [
    { id: "how-it-works", label: "How availability works" },
    { id: "reservation-vs-walk-in", label: "Reservation, walk-in, delivery" },
    { id: "why-it-flips", label: "Why it flips in minutes" },
    { id: "how-often", label: "How often it updates" },
    { id: "after-reserve", label: "After you reserve" },
    { id: "staff", label: "Can staff tell you?" },
  ];

  const faq: Faq[] = [
    { q: "Does \"currently unavailable for pickup\" mean sold out for good?", a: so ? `No: it means that store is not listing that exact configuration at this moment. Since ${since}, ${n(rt.n)} confirmed iPhone Duo restocks have been logged at ${n(rt.stores)} US Apple Stores, and the median one was gone within ${so.medianSec} seconds, so the page reads unavailable almost all of the time even at stores that restock often.` : "No: it means that store is not listing that exact configuration at this moment. Restocks appear and sell out within minutes, so the page reads unavailable almost all of the time even at stores that restock often ([restock log](/restocks))." },
    { q: "Can I reserve an iPhone Duo for pickup without buying it?", a: "No: a pickup reservation on apple.com is a completed order with in-store pickup chosen, and there is no hold without checking out. If you change your mind, you cancel the order." },
    { q: "How long does Apple hold a pickup order?", a: `Apple states the pickup window in the email that tells you the order is ready, per order, so we do not quote a number. Read that email, and cancel the order if you cannot make the window ([Apple: Shipping & Pickup help](${APPLE_HELP})).` },
    { q: "Is the Apple Store app different from apple.com for pickup availability?", a: "Both show the store's pickup availability for the exact configuration you choose; use whichever you can check out from faster while signed in. PickupChecker reads the public apple.com availability and is independent and not affiliated with Apple." },
    { q: "Why does my friend 50 miles away see stock I don't?", a: so ? `Two reasons: Apple answers each ZIP code with its own short list of nearby stores, and a listing may have appeared and sold out between your two looks, since the median iPhone Duo listing lasts ${so.medianSec} seconds. The stores around you, with their recent restocks, are on [iPhone Duo near me](/iphone-duo-near-me).` : "Two reasons: Apple answers each ZIP code with its own short list of nearby stores, and a listing may have appeared and sold out between your two looks. The stores around you are on [iPhone Duo near me](/iphone-duo-near-me)." },
    { q: "Is pickup availability the same as delivery availability?", a: `No — two inventories. Pickup availability is the store's own stock and changes within one check (every 15 s here); delivery availability is Apple's warehouse and shows as a shipping estimate that moves daily. A configuration can be "currently unavailable" for pickup at every store and still ship in a few weeks, or appear for pickup at one store while delivery says December. Hold both: a delivery order keeps your place, an alert catches the pickup ([where to buy an iPhone Duo today](/where-to-buy-iphone-duo)).` },
    { q: "It showed available and was gone before I could reserve — what happened?", a: `A typical iPhone Duo pickup listing lasts about a minute — the median in our log is {{duo.medianStay}} — so the page you refreshed by hand was already behind. The sold-out state appears at Apple's next answer; we commit it after two consistent checks. The practical fix is to have the Apple Store app signed in with the Duo in your bag and a card saved, and to let an alert do the refreshing — the push is sent about ${SPEED.alertSec} seconds after we confirm a restock; how fast it then shows on your phone depends on the phone and its connection, which we do not measure.` },
  ];

  const sources: Source[] = [
    { label: "Apple: Delivery and Pickup (how in-store pickup works)", url: APPLE_PICKUP },
    { label: "Apple: Shipping & Pickup help (what to bring to a pickup)", url: APPLE_HELP },
    { label: "Apple Newsroom: iPhone Duo arrives at Apple Store locations worldwide", url: NEWSROOM },
    { label: "MacRumors: Apple Store pickup for the iPhone Duo in the US", url: MACRUMORS },
    { label: "Wikipedia: Apple Store", url: "https://en.wikipedia.org/wiki/Apple_Store" },
  ];

  const site = "https://pickupchecker.com";
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${site}${PATH}`, url: `${site}${PATH}`, name: TITLE, description: DESCRIPTION, isPartOf: { "@id": `${site}/#website` }, about: { "@id": `${site}/#organization` }, dateModified: rt.at, mentions: { "@id": `${site}/restocks#dataset` } },
      {
        "@type": "HowTo", name: "How to reserve an iPhone Duo for Apple Store pickup",
        step: [
          { "@type": "HowToStep", name: "Choose the exact configuration on apple.com", text: "Pickup availability is per store and per storage and color." },
          { "@type": "HowToStep", name: "Choose \"I'll pick it up\" at a store that lists it", text: "The listing can disappear within a minute; be signed in with Apple Pay ready." },
          { "@type": "HowToStep", name: "Wait for Apple's ready-for-pickup email", text: "It states the pickup window for your order." },
          { "@type": "HowToStep", name: "Collect at the Pickup counter", text: "Bring the order number or QR code and a government-issued photo ID, or send the designated contact you named at checkout.", url: APPLE_HELP },
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
          <div className="eyebrow mb-4">apple.com pickup availability · a moment, not a verdict</div>
          <h1 className="display text-4xl sm:text-6xl">What does &quot;currently unavailable for pickup&quot; mean on apple.com?</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-2">It means that store is <b className="text-ink">not listing that exact storage and color for in-store pickup at this moment</b>, not that it never will: iPhone Duo pickup stock appears for minutes at a time, so almost every store reads &quot;unavailable&quot; at any random moment, even on a day with hundreds of restocks.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/stock/iphone-duo" className="btn btn-primary btn-lg">See iPhone Duo pickup stock now</Link>
            <Link href={setupHref} className="btn btn-ghost btn-lg">Set up an alert</Link>
          </div>
        </div>
        <StatGrid cols={2}>
          <Stat value={so ? `${so.medianSec}` : "—"} unit={so ? "s" : undefined} label="median listing before it sells out" tone="warn" />
          <Stat value={so ? pct(so.within2min) : "—"} label="of sold-out restocks gone within 2 minutes" tone="warn" />
          <Stat value={haveRecent ? n(recent.restocks) : "—"} label={haveRecent ? <>confirmed restocks in the last 24 hours · {n(recent.stores)} US Apple Stores</> : "restocks in the last 24 hours: count briefly unavailable"} live={haveRecent} />
          <Stat value={!thin ? n(rt.n) : "—"} label={!thin ? <>confirmed US restocks since {since}</> : "confirmed restocks: filling in"} />
        </StatGrid>
      </section>

      <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-2 text-sm">
        {nav.map((s) => <a key={s.id} href={`#${s.id}`} className="chip px-3 py-1.5 text-xs">{s.label}</a>)}
      </nav>

      <div className="mt-6 grid gap-5">
        {/* how availability works */}
        <Section id="how-it-works" h2="How does Apple's pickup availability work?" lead={howLead} facts={facts}>
          <BlockView b={showsTable} facts={facts} />
          <Points items={[
            { text: <>Each ZIP gets its own short list of stores: that is why <b className="text-ink">a friend 50 miles away sees stores you do not</b></> },
            { text: <Inline text={`PickupChecker asks from enough points to see all ${STORES.length} US Apple Stores on every round ([how it works](/how-it-works))`} facts={facts} />, step: true },
          ]} />
          <Figure id="apple-store-entrance-busy" />
        </Section>

        {/* reservation vs walk-in vs delivery */}
        <Section id="reservation-vs-walk-in" h2="What is the difference between a pickup reservation, walking in and delivery?" lead={kindsLead} facts={facts}>
          <BlockView b={kindsTable} facts={facts} />
          <ol className="grid gap-3 sm:grid-cols-2">
            <Swap no="Wait for delivery, or try a walk-in" yes="Treat the reservation as the product" why="Delivery is fine if you can wait months; walking in is a lottery whose odds you cannot see; the reservation is the one path where a few seconds of speed buy you the phone." />
            <Swap no="Hope the store has one at the counter" yes="Reserve the pickup slot on apple.com" why="A reservation is a specific phone held under your name; the counter sells whatever is left unallocated." />
          </ol>
          <Points className="mt-5" items={[
            { text: <Inline text={`The iPhone Duo reached Apple Stores on ${longDate(DUO_LAUNCH_DAY)} ([Apple Newsroom](${NEWSROOM}))`} facts={facts} /> },
            { text: <Inline text={`US pickup reservations for it were reported the next day ([MacRumors](${MACRUMORS}))`} facts={facts} /> },
          ]} />
          <Figure id="click-and-collect-queue" />
        </Section>

        {/* why it flips */}
        <Section id="why-it-flips" h2="Why does availability flip from unavailable to available and back within minutes?" lead={flipsLead} facts={facts}>
          <StatGrid cols={3} className="mt-5">
            <Stat value={!recent.unknown ? n(now.duo) : "—"} label={<>of {STORES.length} US Apple Stores list any iPhone Duo configuration for pickup right now</>} live={!recent.unknown} />
            <Stat value={so ? pct(so.within20min) : "—"} label="of sold-out restocks gone within 20 minutes" tone="muted" />
            <Stat value={drop ? n(drop.stores) : "—"} label={drop ? <>stores restocked in the same 30-minute slot on {ET_DAY.format(new Date(drop.at))}, the biggest wave · {drop.restocks} restocks</> : "stores in the biggest single wave: fills in as restocks are confirmed"} tone="warn" />
          </StatGrid>
          <Points className="mt-5" items={[
            { text: <>A listing <b className="text-ink">appears</b> when Apple allocates units at that store to online pickup and <b className="text-ink">disappears</b> when the last of them is reserved</> },
            { text: <>The allocation is small and thousands are checking out: the listing lives seconds to minutes</>, no: true },
            { text: <>Waves reach a dozen stores at once and leave all of them within minutes, which is why checking one store by hand finds nothing</> },
            { text: <Inline text={`**Most recent confirmed restock:** ${rt.latest && latestStore ? `[${appleName(latestStore)}](${storePath(latestStore)}), ${ET_TIME.format(new Date(rt.latest.at))} ET` : "on [the restock log](/restocks)"}`} facts={facts} />, step: true },
          ]} />
          <ol className="mt-5 grid gap-3 sm:grid-cols-2">
            <Swap no="Read the page as a shelf" yes="Read it as a heartbeat monitor" why="&quot;Unavailable&quot; is the resting state of the listing; &quot;available&quot; is the event." />
            <Swap no="Check one store by hand" yes="Alerts on several stores" why="A wave puts stock at a dozen stores at once; the listing is gone before a second reload." />
          </ol>
          <LinkRow links={[{ label: "Every restock with the seconds it lasted", href: "/iphone-duo-sell-out-times" }, { label: "The hours they land in", href: "/iphone-duo-restock-times" }]} />
        </Section>

        {/* how often */}
        <Section id="how-often" h2="How often does apple.com's availability update, and how often do we check?" lead={oftenLead} facts={facts}>
          <StatGrid cols={3} className="mt-5">
            <Stat value={`${SPEED.checkSec}`} unit="s" label={<>between checks of every US Apple Store ({n(STORES.length)} stores, around the clock)</>} />
            <Stat value={`${SPEED.fastSec}`} unit="s" label="between checks of the stores with alerts" tone="accent" />
            <Stat value={`~${SPEED.alertSec}`} unit="s" label="confirmed restock → push sent (arrival on your phone is not measured)" />
          </StatGrid>
          <Points className="mt-5" items={[
            { text: <><b className="text-ink">Two answers must agree</b>: a restock counts after a second answer about a second later says the same; a sell-out is confirmed on the next round</> },
            { text: <><b className="text-ink">An error is never &quot;out of stock&quot;</b>: a failed or timed-out request changes nothing; unavailable here was answered unavailable by apple.com, twice</> },
            { text: <><b className="text-ink">Your own tab does not refresh itself</b>: what you see is the answer to the search you ran; to see a change you search again</>, no: true },
            { text: <Inline text={`That gap is what an alert closes: the push is handed to Apple's push service about ${SPEED.alertSec} seconds after a confirmed restock ([iPhone Duo stock alerts](/iphone-duo-stock-alerts))`} facts={facts} />, step: true },
          ]} />
          <Measured>
            We do not know how often Apple&apos;s own systems update the figure behind the page and will not guess. What we can say is how often we ask: {n(STORES.length)} stores every {SPEED.checkSec} seconds, around the clock, since {longDate(TRACKING_SINCE_US)}.
          </Measured>
        </Section>

        {/* after you reserve */}
        <Section id="after-reserve" h2="What happens after you reserve for pickup?" lead={afterLead} facts={facts}>
          <StepStrip className="mt-5 lg:grid-cols-4!" steps={[
            { title: "Apple confirms the order", hint: "by email, then emails and notifies you when it is ready; that second email states the pickup window, per order, so we quote no number" },
            { title: "Bring what Apple asks for", hint: <Inline text={`the order number or QR code from the pickup email and a government-issued photo ID ([Apple: Shipping & Pickup help](${APPLE_HELP})); a designated pickup contact brings their own ID`} facts={facts} /> },
            { title: "Go to the Pickup counter", hint: "not the queue at the door; pickup orders are handed over separately from walk-in sales" },
            { title: "Cannot make the window? Cancel", hint: "from your order page rather than letting the hold lapse; the unit goes back on the page for someone else" },
          ]} />
          <Figure id="apple-store-pickup-counter" />
        </Section>

        {/* staff */}
        <Section id="staff" h2="Can Apple Store staff tell you when stock comes in?" lead={staffLead} facts={facts}>
          <StatGrid cols={2} className="mt-5">
            <Stat value={!thin ? n(rt.stores) : "—"} label={<>US stores with at least one confirmed restock since {since}</>} />
            <Stat value={bw ? pct(bw.share) : "—"} label={bw ? <>of restocks between {hl(bw.from)} and {hl(bw.to)} local time, the closest thing to a schedule</> : "the usual hour appears on a store page from five restocks on three different days"} tone="accent" />
          </StatGrid>
          <ol className="mt-5 grid gap-3 sm:grid-cols-2">
            <Swap no="Plan a morning around a chart" yes="Set an alert" why="The alert is right every time, the chart on average; a launch week can look nothing like the week after." />
            <Swap no="Ask staff for the schedule" yes="Read the store page's usual hour" why={<>Nothing official says a schedule exists; each store page states its usual hour{bw ? "" : " as soon as five restocks on three different days allow it"}.</>} />
          </ol>
          <LinkRow links={[{ label: "When the iPhone Duo restocks, hour by hour", href: "/iphone-duo-restock-times" }, { label: "Which iPhone Duo restocks most", href: "/which-iphone-duo-restocks-most" }]} />
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href={setupHref} className="btn btn-primary">Set up an iPhone Duo alert</Link>
            <span className="text-sm text-ink-3">Your stores checked every {SPEED.fastSec} seconds; a push sent about {SPEED.alertSec} seconds after a confirmed restock.</span>
          </div>
        </Section>
      </div>

      <div className="mx-auto mt-10 max-w-3xl"><RichFaq items={faq} facts={facts} title="Questions" /></div>
      <div className="mx-auto mt-8 max-w-3xl"><SourceList sources={sources} facts={facts} since={TRACKING_SINCE_US} /></div>
    </div>
  );
}
