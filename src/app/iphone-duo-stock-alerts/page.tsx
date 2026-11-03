import type { Metadata } from "next";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { BlockView } from "@/components/content/Blocks";
import { RichFaq, SourceList } from "@/components/content/RichFaq";
import { JsonLd } from "@/components/seo/JsonLd";
import { getFacts } from "@/lib/content/facts";
import type { Block, Faq, Source } from "@/lib/content/types";
import { ALL_STORES, STORES, appleName, storePath } from "@/lib/apple/catalog";
import { INTL_CODES } from "@/lib/apple/countries";
import { OTHER_TRACKERS, PLANS, SPEED } from "@/lib/plans";
import { TRACKING_SINCE_INTL, TRACKING_SINCE_US, hourLabel, siteFacts } from "@/lib/content/siteFacts";
import { busiestWindow, duoRestockTimes } from "@/lib/content/restockTimes";
import { medianBand } from "@/lib/stock/sellouts";
import { alertHref } from "@/lib/seo/enrich";

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

  const lead = `An automated tracker with push: PickupChecker asks the stores your alerts point at every ${SPEED.fastSec} seconds, the fastest published check interval of any iPhone stock tracker we know of (the others publish ${OTHER_TRACKERS}), and your phone hears about a confirmed restock about ${SPEED.alertSec} seconds later. Speed is the whole question: a typical iPhone Duo restock sells out in ${typical}${ds ? `, ${pct(ds.within30)} within 30 seconds` : ", some within 20–30 seconds"}, so refreshing apple.com by hand or checking every few minutes mostly finds nothing.`;

  const vanish: Block[] = [
    ...(ds ? [{ t: "table", head: ["A tracker checking…", "…would have seen this share of the last 7 days' iPhone Duo restocks at least once"], rows: [
      [`every ${SPEED.fastSec} seconds (PickupChecker, stores with alerts)`, "all of them: this is the set our checks saw"],
      ["every 1 minute", pct(ds.caught.m1)],
      ["every 5 minutes", pct(ds.caught.m5)],
      ["every 15 minutes", pct(ds.caught.m15)],
    ], caption: `A listing that lasts d seconds is seen by a check every T seconds with probability min(1, d ÷ T), over the ${n(ds.n)} Duo restocks that sold out in the last 7 days. A restock's life runs from the check that first saw it to the check that first saw it gone, so every duration is an upper bound and these rates flatter the slower trackers.`, source: "PickupChecker restock log, confirmed iPhone Duo restocks that sold out in the last 7 days" } as Block] : [{ t: "note", text: "The catch-rate table appears once 20 or more confirmed iPhone Duo restocks have sold out within the last 7 days; until then we would rather show nothing than a shaky number.", tone: "tip" } as Block]),
    { t: "p", text: `Our honest view: a tracker that checks every 5 or 15 minutes is a restock historian, not an alert. It can tell you a store had stock this morning, which is true and useless${ds ? `; it misses ${pct(1 - ds.caught.m5)} of Duo restocks outright at 5 minutes and ${pct(1 - ds.caught.m15)} at 15` : ""}. Every restock with the seconds it lasted is on [how fast the iPhone Duo sells out](/iphone-duo-sell-out-times).` },
    { t: "img", id: "texting-city-street" },
  ];

  const how: Block[] = [
    { t: "ol", items: [
      `**Check.** Your stores are asked for your exact configuration every ${SPEED.fastSec} seconds; every other US Apple Store every ${SPEED.checkSec}.`,
      "**Confirm.** The first \"available\" answer is asked again about a second later; a restock counts only when both agree.",
      `**Push.** About ${SPEED.alertSec} seconds after confirmation a notification reaches the PickupChecker app on your Home Screen ([install](/install)), naming the store and configuration and linking to apple.com. With no device set up, an email from alerts@pickupchecker.com goes out instead.`,
      "**Once.** One push per restock: nothing while it stays listed, nothing for sell-outs or a store's first sighting.",
    ] },
    { t: "table", head: ["What one alert is", "Detail"], rows: [
      ["Scope", "one Apple Store × one exact configuration (model, storage, color)"],
      ["Confirmation", "two matching answers from apple.com, about 1 second apart"],
      ["Delivery", `push about ${SPEED.alertSec} seconds after confirmation; email when no device is set up`],
      ["Coverage", `${STORES.length} US Apple Stores, plus ${intl} stores in ${INTL_CODES.length} other countries`],
    ], caption: "The same checks for every plan.", source: "PickupChecker's poller; the two-answer rule is described on [how it works](/how-it-works)" },
    { t: "p", text: `On iPhone the notification is a [web push](https://en.wikipedia.org/wiki/Push_technology) to a Home Screen web app, which Apple supports in Safari ([Apple Developer](${WEB_PUSH})): nothing to download, one permission prompt.` },
    { t: "img", id: "phone-notification" },
  ];

  const compare: Block[] = [
    { t: "table", head: ["Tracker", "Check interval, as published on their own sites, November 2026", "Push delay, as claimed"], rows: [
      ["PickupChecker", `every ${SPEED.fastSec} seconds for stores with alerts; every ${SPEED.checkSec} seconds for all ${STORES.length} US stores`, `about ${SPEED.alertSec} seconds after a confirmed restock`],
      ["InStock Radar", "an 8-second interval for stores a paid alert points at; \"every few minutes\" for new models elsewhere", "median 2 seconds (their claim)"],
      ["Store Stock Checker", "a 15-second check of \"your Apple Stores\", up to 5 stores per plan", "about 2 seconds (their claim)"],
      ["iPhoneStockChecker.com", "once a minute (as reported)", "not published"],
      ["ManzanaTracker", "roughly 5-minute checks", "not published"],
      ["Apple Inventory Check", "a 15-minute cadence", "not published"],
    ], caption: "Self-published intervals only: we have not measured anyone else's service and will not pretend to.", source: "each tracker's own website, read in November 2026; PickupChecker's figures from its poller" },
    { t: "p", text: ds ? `Does ${SPEED.fastSec} versus 15 seconds matter? When half the restocks are gone within about ${ds.medianSec} seconds, yes: a 15-second interval can burn up to ${pct(SPEED.checkSec / ds.medianSec)} of a median listing's life before its first look, a ${SPEED.fastSec}-second one ${pct(SPEED.fastSec / ds.medianSec)}. We think the interval is the one number worth comparing, because it is the one every tracker controls; "fastest" without an interval is marketing. Ours is ${SPEED.fastSec} seconds; hold us to it.` : `Does ${SPEED.fastSec} versus 15 seconds matter? When a typical restock is gone in about a minute, yes. We think the interval is the one number worth comparing, because it is the one every tracker controls. Ours is ${SPEED.fastSec} seconds; hold us to it.` },
  ];

  const setup: Block[] = [
    { t: "ol", items: [
      "**Pick the iPhone, storage and color.** One alert is one exact configuration; two acceptable colors are two alerts.",
      "**Tick the stores you can reach.** The list is nearest first with an estimated drive time.",
      "**On iPhone, add PickupChecker to your Home Screen and allow notifications** ([step by step](/install)).",
      "**When the push arrives, open apple.com from it** and check out with in-store pickup at the store it names.",
    ] },
    { t: "h3", text: "Which stores should I pick?" },
    { t: "p", text: `The two or three you can reach by 9 AM, plus the ones that restock most. ${bw ? `${pct(bw.share)} of the ${n(rt.n)} confirmed US iPhone Duo restocks since ${since} landed between ${hl(bw.from)} and ${hl(bw.to)} local time, so a store you cannot reach in the morning is a weaker pick than a farther one you can.` : `The day-by-day picture is on [when the iPhone Duo restocks](/iphone-duo-restock-times).`} ${top && topStore ? `The US store with the most confirmed Duo restocks since ${since} is [${appleName(topStore)}](${storePath(topStore)}), ${top.restocks} on ${top.days} days.` : ""} The ranking is on [which iPhone Duo restocks most](/which-iphone-duo-restocks-most), the stores around you on [iPhone Duo near me](/iphone-duo-near-me).` },
    { t: "cta", label: "Set up an iPhone Duo alert", href: setupHref, sub: `Your stores checked every ${SPEED.fastSec} seconds from then on.` },
    { t: "img", id: "apple-store-night-vancouver" },
  ];

  const cost: Block[] = [
    { t: "table", head: ["Plan", "Price per month", "Alerts (store × configuration)"], rows: [
      [PLANS.plus.name, `$${PLANS.plus.priceUsd}`, String(PLANS.plus.limit)],
      [PLANS.pro.name, `$${PLANS.pro.priceUsd}`, String(PLANS.pro.limit)],
      [PLANS.max.name, `$${PLANS.max.priceUsd}`, String(PLANS.max.limit)],
    ], caption: `Every plan gets the same ${SPEED.fastSec}-second checks and ~${SPEED.alertSec}-second push; live stock and the restock log are free to browse.`, source: "[pricing](/pricing)" },
    { t: "p", text: `${PLANS.plus.limit} alerts is one configuration at ${PLANS.plus.limit} stores, or two at five, which covers most people in one metro area; ${PLANS.pro.name} and ${PLANS.max.name} are for several colors, several people or a long drive radius.` },
  ];

  const arrives: Block[] = [
    { t: "ul", items: [
      "**Be signed in to apple.com before the alert**, with Apple Pay or a card and your address saved; typing an address during a restock is how people lose it.",
      "**Tap the alert, choose the configuration, then \"I'll pick it up\"** at the store named. If it already reads unavailable, try your other stores: a batch often reaches several at once.",
      "**Finish checkout.** The reservation is the order; Apple emails you when it is ready and states the pickup window in that email.",
      `**Bring what Apple asks for**: the order number or QR code from the pickup email and a government-issued photo ID ([Apple: Shipping & Pickup help](${APPLE_HELP})).`,
    ] },
    { t: "p", text: "The tap-by-tap version, with Apple's checkout staged before the window so the alert leaves four taps, is [Grab an iPhone Duo restock in 20 seconds](/how-to-grab-an-iphone-duo-restock); the wider plan is on [how to get an iPhone Duo](/how-to-get-an-iphone-duo); what the wording on apple.com means is on [Apple pickup availability explained](/apple-store-pickup-availability-explained)." },
  ];

  const sections: { id: string; nav: string; h2: string; lead: string; blocks: Block[] }[] = [
    { id: "how-fast", nav: "How fast restocks vanish", h2: "How fast does an iPhone Duo restock disappear?", lead: ds ? `Half of them within ${ds.medianSec} seconds: over the last 7 days, ${n(ds.n)} confirmed iPhone Duo restocks sold out with a median life of ${ds.medianSec} seconds, ${pct(ds.within30)} within 30.${so ? ` Since ${since}, ${pct(so.within2min)} of ${n(so.n)} US Duo restocks were gone within 2 minutes and ${pct(so.within20min)} within 20.` : ""}` : so ? `Within minutes: since ${since}, ${pct(so.within2min)} of ${n(so.n)} confirmed US iPhone Duo restocks were gone within 2 minutes and ${pct(so.within20min)} within 20; the median listing lasted ${so.medianSec} seconds.` : "Too early to say: we state sell-out times only once 20 or more confirmed restocks have sold out, and the window does not have them yet.", blocks: vanish },
    { id: "how-alerts-work", nav: "How alerts work", h2: "How do PickupChecker alerts work?", lead: `Your stores are asked every ${SPEED.fastSec} seconds and every other US Apple Store every ${SPEED.checkSec}; a first "available" is asked again about a second later, and once two answers agree a push reaches your phone about ${SPEED.alertSec} seconds after the restock.`, blocks: how },
    { id: "compare", nav: "Versus other trackers", h2: "How does it compare with other iPhone stock trackers?", lead: `By published check interval, PickupChecker's ${SPEED.fastSec} seconds is the shortest we know of; the other trackers publish ${OTHER_TRACKERS}. We compare published numbers only.`, blocks: compare },
    { id: "setup", nav: "Set up an alert", h2: "How do I set up an iPhone Duo alert?", lead: "Four steps, about two minutes: pick the iPhone, storage and color; tick the stores you can reach; on iPhone add PickupChecker to your Home Screen and allow notifications; when the push arrives, open apple.com from it and check out with in-store pickup.", blocks: setup },
    { id: "cost", nav: "Price", h2: "What does it cost?", lead: `Browsing is free. Alerts are $${PLANS.plus.priceUsd} a month for ${PLANS.plus.limit} (${PLANS.plus.name}), $${PLANS.pro.priceUsd} for ${PLANS.pro.limit} (${PLANS.pro.name}) or $${PLANS.max.priceUsd} for ${PLANS.max.limit} (${PLANS.max.name}), one alert being one store × one exact configuration.`, blocks: cost },
    { id: "when-it-arrives", nav: "When the alert arrives", h2: "What should I do the moment the alert arrives?", lead: `Tap it, choose "I'll pick it up" at the store it names, and pay with Apple Pay while already signed in to apple.com. You have ${ds ? `about ${medianBand(ds.medianSec)}` : "about a minute"} in the typical case; the people who get the phone did their setup before the alert came.`, blocks: arrives },
  ];

  const faq: Faq[] = [
    { q: "Do alerts work on iPhone without an app from the App Store?", a: `Yes. Add PickupChecker to your Home Screen from Safari and allow notifications once: a web app with web push, which Apple supports for Home Screen web apps ([Apple Developer](${WEB_PUSH}); [install guide](/install)). Without a device set up, alerts arrive by email from alerts@pickupchecker.com.` },
    { q: "How many alerts do I need?", a: `Usually ${PLANS.plus.limit} or fewer: one configuration at the stores you can reach. Two acceptable colors are two alerts per store. ${PLANS.plus.name} covers ${PLANS.plus.limit}, ${PLANS.pro.name} ${PLANS.pro.limit}, ${PLANS.max.name} ${PLANS.max.limit} ([pricing](/pricing)).` },
    { q: "Can PickupChecker reserve the phone for me?", a: "No. It tells you within seconds that a store lists your configuration; you reserve on apple.com with in-store pickup, and Apple holds it for you. PickupChecker is independent and not affiliated with Apple; it reads the same pickup availability anyone can see on apple.com, just far more often." },
    { q: `Why every ${SPEED.fastSec} seconds and not every second?`, a: `Because apple.com answers a limited number of requests from one address, and because every restock must be confirmed by a second answer about a second later; asking every second would not shorten that and would risk getting no answers at all. At ${SPEED.fastSec} seconds the longest wait between a restock and our first look is ${SPEED.fastSec} seconds${ds ? `, against a median listing of ${ds.medianSec}` : ""}.` },
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
    <div className="mx-auto max-w-3xl px-4 pt-10">
      <JsonLd data={ld} />
      <h1 className="display text-3xl sm:text-5xl">What is the fastest way to get notified when the iPhone Duo is in stock?</h1>
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
        <p><Link href={setupHref} className="btn btn-primary">Set up an alert</Link></p>
      </div>
      <div className="mt-10"><RichFaq items={faq} facts={facts} title="Questions" /></div>
      <div className="mt-8"><SourceList sources={sources} facts={facts} where={`${n(ALL_STORES.length)} Apple Stores in ${INTL_CODES.length + 1} countries`} since={TRACKING_SINCE_US} /></div>
    </div>
  );
}
