import type { Metadata } from "next";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { BlockView } from "@/components/content/Blocks";
import { RichFaq, SourceList } from "@/components/content/RichFaq";
import { JsonLd } from "@/components/seo/JsonLd";
import { getFacts } from "@/lib/content/facts";
import type { Block, Faq, Source } from "@/lib/content/types";
import { STORES, appleName, storePath } from "@/lib/apple/catalog";
import { SPEED } from "@/lib/plans";
import { TRACKING_SINCE_US, hourLabel } from "@/lib/content/siteFacts";
import { DUO_LAUNCH_DAY, DUO_PICKUP_RESUMED, busiestWindow, duoRestockTimes } from "@/lib/content/restockTimes";
import { recentByConfig } from "@/lib/stock/recent";
import { storesWithStockNow } from "@/lib/stock/queries";
import { alertHref } from "@/lib/seo/enrich";

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

export default async function PickupAvailabilityExplained() {
  const [facts, rt, recent, now] = await Promise.all([getFacts(), duoRestockTimes("us"), recentByConfig({ country: "us" }), storesWithStockNow(undefined, "us")]);
  const so = rt.sellout; // every confirmed US iPhone Duo restock since tracking began that sold out
  const since = longDate(rt.since);
  const bw = rt.peakHour != null && rt.n > 0 ? busiestWindow(rt.byHour) : null;
  const drop = rt.drops[0];
  const latestStore = rt.latest ? STORES.find((s) => s.storeNumber === rt.latest!.storeNumber) : undefined;
  const setupHref = alertHref({ model: "duo" });
  const thin = rt.unknown || rt.n === 0;

  const lead = `It means that store is not listing that exact storage and color for in-store pickup at this moment, not that it never will. iPhone Duo pickup stock appears for minutes at a time${so ? `: a restock lasts a median of ${so.medianSec} seconds before it sells out, and ${pct(so.within2min)} are gone within 2 minutes` : ""}, so almost every store reads "unavailable" at any random moment, even on a day with hundreds of restocks${!recent.unknown && recent.restocks > 0 ? ` (${n(recent.restocks)} at ${n(recent.stores)} US Apple Stores in the last 24 hours` : ""}${!thin ? `${!recent.unknown && recent.restocks > 0 ? ", " : " ("}${n(rt.n)} since ${since})` : !recent.unknown && recent.restocks > 0 ? ")" : ""}. The word describes a moment, not a verdict.`;

  const how: Block[] = [
    { t: "table", head: ["What apple.com shows", "What it does not show"], rows: [
      ["Whether each listed store has your exact configuration for pickup right now; a different color at the same store is a different answer", "How many units a store has"],
      ["A short list of stores near a ZIP code: in our poller's experience up to about a dozen within roughly 250 miles per search", "Every store in the country at once"],
      ["The state at the moment you asked", "When the store last had it, or when it will again"],
      ["Delivery estimates for the same configuration", "Any restock schedule"],
    ], caption: "What the public availability answers show; Apple's own page describes the pickup flow.", source: `[Apple: Delivery and Pickup](${APPLE_PICKUP}); PickupChecker's checks of apple.com pickup availability since ${longDate(TRACKING_SINCE_US)}` },
    { t: "p", text: `That short list is why a friend 50 miles away sees stores you do not: each ZIP gets its own neighborhood. PickupChecker asks from enough points to see all ${STORES.length} US Apple Stores on every round ([how it works](/how-it-works)).` },
    { t: "img", id: "apple-store-entrance-busy" },
  ];

  const kinds: Block[] = [
    { t: "table", head: ["Way to buy", "What you actually get", "What decides it"], rows: [
      ["Pickup reservation (\"I'll pick it up\" on apple.com)", "a specific phone held for you at one store, with a pickup window Apple states in its email", "whether that store lists the exact configuration at the moment you check out"],
      ["Walking in", "a chance at whatever the store can sell over the counter that day", "stock Apple has not allocated to orders; at the Duo's launch, reported as little or none in most markets"],
      ["Delivery", "a place in a queue with an estimated date", "Apple's supply; dates were reported to slip into 2027 within days of launch"],
    ], caption: "Three different things the same product page sells.", source: `[Apple Newsroom, ${ET_DAY.format(new Date(`${DUO_LAUNCH_DAY}T12:00:00Z`))}](${NEWSROOM}); [MacRumors, ${ET_DAY.format(new Date(`${DUO_PICKUP_RESUMED}T12:00:00Z`))}](${MACRUMORS})` },
    { t: "p", text: `The iPhone Duo reached Apple Stores on ${longDate(DUO_LAUNCH_DAY)} ([Apple Newsroom](${NEWSROOM})); US pickup reservations for it were reported the next day ([MacRumors](${MACRUMORS})). Our view: treat the reservation as the product. Delivery is fine if you can wait months, walking in is a lottery whose odds you cannot see, and the reservation is the one path where a few seconds of speed buy you the phone.` },
    { t: "img", id: "click-and-collect-queue" },
  ];

  const flips: Block[] = [
    { t: "p", text: "A pickup listing appears when Apple allocates units at that store to online pickup and disappears when the last of them is reserved. The allocation is small and thousands of people are checking out, so the listing lives for seconds to minutes, then the store reads \"unavailable\" until the next allocation." },
    { t: "ul", items: [
      !recent.unknown ? `**Right now**: ${n(now.duo)} of ${STORES.length} US Apple Stores list any iPhone Duo configuration for pickup; ${n(recent.restocks)} confirmed restocks at ${n(recent.stores)} stores in the last 24 hours.` : "**Right now**: the live count is briefly unavailable; the store pages carry it.",
      drop ? `**Biggest single wave**: ${drop.stores} stores restocked within the same 30-minute slot on ${ET_DAY.format(new Date(drop.at))}, ${drop.restocks} restocks in all. Waves are why checking one store by hand finds nothing: the stock reached a dozen stores at once and left all of them within minutes.` : "**Waves**: restocks tend to reach several stores in the same half hour; the biggest are on [when the iPhone Duo restocks](/iphone-duo-restock-times).",
      rt.latest && latestStore ? `**Most recent confirmed restock**: [${appleName(latestStore)}](${storePath(latestStore)}), ${ET_TIME.format(new Date(rt.latest.at))} ET.` : "**Most recent confirmed restock**: on [the restock log](/restocks).",
    ] },
    { t: "p", text: "\"Unavailable\" is the resting state of the listing; \"available\" is the event. Read the page as a heartbeat monitor, not a shelf. Every restock with the seconds it lasted is on [how fast the iPhone Duo sells out](/iphone-duo-sell-out-times), the hours they land in on [when the iPhone Duo restocks](/iphone-duo-restock-times)." },
  ];

  const often: Block[] = [
    { t: "ul", items: [
      `**Every US Apple Store is asked every ${SPEED.checkSec} seconds**, the stores with alerts every ${SPEED.fastSec}; apple.com answers with the state at that instant.`,
      "**Two answers must agree.** A restock counts only after a second answer about a second later says the same; a sell-out is confirmed on the next round.",
      "**An error is never \"out of stock\".** A failed or timed-out request changes nothing; a store that reads unavailable here was answered unavailable by apple.com, twice.",
      `**Your own tab does not refresh itself.** What you see on apple.com is the answer to the search you ran; to see a change you search again. That gap is what an alert closes: your phone is told about ${SPEED.alertSec} seconds after a confirmed restock ([iPhone Duo stock alerts](/iphone-duo-stock-alerts)).`,
    ] },
    { t: "note", text: `We do not know how often Apple's own systems update the figure behind the page and will not guess; what we can say is how often we ask: ${n(STORES.length)} stores every ${SPEED.checkSec} seconds, around the clock, since ${longDate(TRACKING_SINCE_US)}.`, tone: "tip" },
  ];

  const after: Block[] = [
    { t: "ol", items: [
      "**Apple confirms the order** by email, then emails and notifies you when it is ready for pickup. That second email states the pickup window; we do not quote a number because Apple states it per order.",
      `**Bring what Apple asks for**: the order number or QR code from the pickup email and a government-issued photo ID ([Apple: Shipping & Pickup help](${APPLE_HELP})). A designated pickup contact named at checkout brings their own ID.`,
      "**Go to the Pickup counter**, not the queue at the door; pickup orders are handed over separately from walk-in sales.",
      "**If you cannot make the window**, cancel from your order page rather than letting the hold lapse; the unit goes back on the page for someone else.",
    ] },
    { t: "img", id: "apple-store-pickup-counter" },
  ];

  const staff: Block[] = [
    { t: "p", text: `Nothing official says a schedule exists, so the pattern in the restocks that have already happened is the closest thing: ${n(rt.stores)} US stores have restocked at least once since ${since}, and each store page states its usual hour${bw ? "" : " as soon as five restocks on three different days allow it"}. A pattern is history, not a promise, and a launch week can look nothing like the week after. That is why we would rather you set an alert than plan a morning around a chart: the alert is right every time, the chart on average. The hour-by-hour picture is on [when the iPhone Duo restocks](/iphone-duo-restock-times), the ranking of stores on [which iPhone Duo restocks most](/which-iphone-duo-restocks-most).` },
    { t: "cta", label: "Set up an iPhone Duo alert", href: setupHref, sub: `Your stores checked every ${SPEED.fastSec} seconds; a push about ${SPEED.alertSec} seconds after a confirmed restock.` },
  ];

  const sections: { id: string; nav: string; h2: string; lead: string; blocks: Block[] }[] = [
    { id: "how-it-works", nav: "How availability works", h2: "How does Apple's pickup availability work?", lead: `Apple decides it per store and per exact configuration. For each store near your ZIP it shows one of two states, listing it for pickup today or "currently unavailable", with no quantities, no restock time and no schedule, and each search returns only a short list of nearby stores.`, blocks: how },
    { id: "reservation-vs-walk-in", nav: "Reservation, walk-in, delivery", h2: "What is the difference between a pickup reservation, walking in and delivery?", lead: "A pickup reservation is a specific phone Apple holds for you at one store; walking in is a hope that depends on stock Apple has not allocated to orders; delivery is a queue whose dates were reported to have slipped into 2027 within days of launch.", blocks: kinds },
    { id: "why-it-flips", nav: "Why it flips in minutes", h2: "Why does availability flip from unavailable to available and back within minutes?", lead: so ? `Because an iPhone Duo pickup listing lives for a median of ${so.medianSec} seconds. Of ${n(so.n)} confirmed US restocks since ${since} that have sold out, ${pct(so.within2min)} were gone within 2 minutes and ${pct(so.within20min)} within 20; the fastest sold out within ${so.fastestSec} seconds of appearing.` : "Because a pickup listing is a small allocation claimed by many people at once: it appears, is reserved within minutes, and the store reads unavailable again. Exact lifetimes appear here once ten confirmed restocks have sold out.", blocks: flips },
    { id: "how-often", nav: "How often it updates", h2: "How often does apple.com's availability update, and how often do we check?", lead: `apple.com answers with the state at the moment you ask. PickupChecker asks every ${SPEED.checkSec} seconds for every US Apple Store and every ${SPEED.fastSec} seconds for stores with alerts, and shows a change only when two answers agree; an error is never counted as out of stock.`, blocks: often },
    { id: "after-reserve", nav: "After you reserve", h2: "What happens after you reserve for pickup?", lead: "Apple emails you when the order is ready and states the pickup window in that email; at the Pickup counter you show the order number or QR code and a government-issued photo ID, or a designated contact named at checkout does.", blocks: after },
    { id: "staff", nav: "Can staff tell you?", h2: "Can Apple Store staff tell you when stock comes in?", lead: `No. Apple publishes no restock schedule and store staff have no public one to share${bw ? `; the observed pattern is the closest thing: ${pct(bw.share)} of the ${n(rt.n)} confirmed US iPhone Duo restocks since ${since} landed between ${hl(bw.from)} and ${hl(bw.to)} local time` : "; the observed pattern on each store page is the closest thing, once a store has enough restocks to state one"}.`, blocks: staff },
  ];

  const faq: Faq[] = [
    { q: "Does \"currently unavailable for pickup\" mean sold out for good?", a: so ? `No. It means that store is not listing that exact configuration at this moment. Since ${since}, ${n(rt.n)} confirmed iPhone Duo restocks have been logged at ${n(rt.stores)} US Apple Stores, and the median one was gone within ${so.medianSec} seconds, so the page reads unavailable almost all of the time even at stores that restock often.` : "No. It means that store is not listing that exact configuration at this moment; restocks appear and sell out within minutes, so the page reads unavailable almost all of the time even at stores that restock often ([restock log](/restocks))." },
    { q: "Can I reserve an iPhone Duo for pickup without buying it?", a: "No. A pickup reservation on apple.com is a completed order with in-store pickup chosen; there is no hold without checking out. If you change your mind, you cancel the order." },
    { q: "How long does Apple hold a pickup order?", a: `Apple states the pickup window in the email that tells you the order is ready, per order, so we do not quote a number. Read that email, and cancel the order if you cannot make the window ([Apple: Shipping & Pickup help](${APPLE_HELP})).` },
    { q: "Is the Apple Store app different from apple.com for pickup availability?", a: "Both show the store's pickup availability for the exact configuration you choose; use whichever you can check out from faster while signed in. PickupChecker reads the public apple.com availability. It is independent and not affiliated with Apple." },
    { q: "Why does my friend 50 miles away see stock I don't?", a: so ? `Two reasons: Apple answers each ZIP code with its own short list of nearby stores, so two people see different stores; and a listing may have appeared and sold out between your two looks, since the median iPhone Duo listing lasts ${so.medianSec} seconds. The stores around you, with their recent restocks, are on [iPhone Duo near me](/iphone-duo-near-me).` : "Two reasons: Apple answers each ZIP code with its own short list of nearby stores, so two people see different stores; and a listing may have appeared and sold out between your two looks. The stores around you are on [iPhone Duo near me](/iphone-duo-near-me)." },
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
    <div className="mx-auto max-w-3xl px-4 pt-10">
      <JsonLd data={ld} />
      <h1 className="display text-3xl sm:text-5xl">What does &quot;currently unavailable for pickup&quot; mean on apple.com?</h1>
      <p className="mt-4 text-lg text-ink-2">{lead}</p>
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
        <p><Link href="/stock/iphone-duo" className="btn btn-primary">See iPhone Duo pickup stock now</Link></p>
      </div>
      <div className="mt-10"><RichFaq items={faq} facts={facts} title="Questions" /></div>
      <div className="mt-8"><SourceList sources={sources} facts={facts} since={TRACKING_SINCE_US} /></div>
    </div>
  );
}
