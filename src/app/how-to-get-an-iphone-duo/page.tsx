import type { Metadata } from "next";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { BlockView } from "@/components/content/Blocks";
import { Inline } from "@/components/content/Inline";
import { RichFaq, SourceList } from "@/components/content/RichFaq";
import { JsonLd } from "@/components/seo/JsonLd";
import { getFacts } from "@/lib/content/facts";
import type { Block, Faq, Source } from "@/lib/content/types";
import { PART_INDEX, STORES, appleName, catalogFor, storeByNumber, storeLocality, storePath } from "@/lib/apple/catalog";
import { PLANS, SPEED } from "@/lib/plans";
import { WEEKDAYS, WEEKDAY_MIN_SPAN, hourLabel, localStamp, siteFacts } from "@/lib/content/siteFacts";
import { DUO_LAUNCH_DAY, DUO_PICKUP_RESUMED, busiestWindow, duoRestockTimes, hourShare } from "@/lib/content/restockTimes";
import { recentByConfig } from "@/lib/stock/recent";
import { medianBand } from "@/lib/stock/sellouts";
import { fmtPrice, listWords, plural } from "@/lib/seo/enrich";

export const dynamic = "force-dynamic";

const TITLE = "How to Get an iPhone Duo When It's Sold Out Everywhere";
const DESCRIPTION = `Apple Stores restock the iPhone Duo daily and a restock sells out in minutes: the hour it lands, the stores and configurations with the best odds, and a step-by-step pickup playbook.`;

export const metadata: Metadata = {
  title: { absolute: `${TITLE} · PickupChecker` },
  description: DESCRIPTION,
  alternates: { canonical: "/how-to-get-an-iphone-duo" },
  openGraph: { type: "article", siteName: "PickupChecker", title: TITLE, description: DESCRIPTION, url: "/how-to-get-an-iphone-duo" },
};

const NEWSROOM = "https://www.apple.com/newsroom/2026/10/iphone-duo-arrives-at-apple-store-locations-worldwide/";
const MACRUMORS = "https://macrumors.com/2026/10/24/apple-store-pickup-iphone-duo-us/";
const PICKUP = "https://www.apple.com/shop/shipping-pickup";
const PICKUP_HELP = "https://www.apple.com/shop/help/shipping_delivery";

const n = (x: number) => x.toLocaleString("en-US");
/** Whole-percent shares; a share under half a percent reads "<1%", never a misleading "0%". */
const pct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : `${Math.round(x * 100)}%`);
const DAY = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });
const LONG = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
const ET = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
/** "Sun, Nov 2" / "October 29, 2026" for a YYYY-MM-DD local date. */
const dayLabel = (date: string) => DAY.format(new Date(`${date}T12:00:00Z`));
const longDate = (date: string) => LONG.format(new Date(`${date}T12:00:00Z`));

/** "9 and 11 AM" when both ends share a meridiem, else "10 AM and noon". */
function windowLabel(from: number, to: number): string {
  const a = hourLabel(from), b = hourLabel(to % 24);
  const plain = /^\d+ [AP]M$/;
  if (plain.test(a) && plain.test(b) && a.slice(-2) === b.slice(-2)) return `${a.slice(0, -3)} and ${b}`;
  return `${a} and ${b}`;
}
/** "[Apple Fifth Avenue](/stores/…)" for a store number. */
function storeLink(storeNumber: string): string {
  const s = storeByNumber(storeNumber);
  return s ? `[${appleName(s)}](${storePath(s)})` : storeNumber;
}
/** "Nov 2, 9:31 AM local time" in the store's own zone. */
function stamp(iso: string, storeNumber: string): string {
  const s = storeByNumber(storeNumber);
  return s ? `${localStamp(iso, s)} local time` : `${ET.format(new Date(iso))} ET`;
}
function cfgName(partNumber: string): string {
  const i = PART_INDEX.get(partNumber);
  return i ? `${i.storage} ${i.color}` : "an iPhone Duo";
}

export default async function HowToGetDuo() {
  const [t, f, facts, recent] = await Promise.all([duoRestockTimes("us"), siteFacts(), getFacts(), recentByConfig({ country: "us" })]);
  const have = t.n > 0 && !t.unknown;
  const since = longDate(t.since);
  const win = busiestWindow(t.byHour);
  const window = windowLabel(win.from, win.to);
  const night = hourShare(t.byHour, 0, 6);
  const evening = hourShare(t.byHour, 18, 24);
  const typical = t.sellout ? `about ${medianBand(t.sellout.medianSec)}` : null;
  const ds = f.duoSellout;
  const items = catalogFor("duo");
  const prices = items.map((i) => i.price);
  const low = Math.min(...prices), high = Math.max(...prices);
  const storages = [...new Set(items.map((i) => i.storage))];
  const colors = [...new Set(items.map((i) => i.color))];
  const parts = t.byPart.map((p) => ({ ...p, item: PART_INDEX.get(p.partNumber), share: t.n ? p.restocks / t.n : 0 }));
  const top = parts.find((p) => p.restocks > 0 && p.item);
  const topName = top?.item ? `${top.item.storage} ${top.item.color}` : null;
  const topPrice = top ? items.find((i) => i.partNumber === top.partNumber)?.price : undefined;
  const storageRows = storages.map((storage) => {
    const restocks = parts.filter((p) => p.item?.storage === storage).reduce((a, p) => a + p.restocks, 0);
    return { storage, restocks, share: t.n ? restocks / t.n : 0, price: items.find((i) => i.storage === storage)?.price ?? 0 };
  });
  const bestStorage = [...storageRows].sort((a, b) => b.restocks - a.restocks)[0];
  const colorRows = colors.map((color) => ({ color, restocks: parts.filter((p) => p.item?.color === color).reduce((a, p) => a + p.restocks, 0) })).sort((a, b) => b.restocks - a.restocks);
  const regions = t.byRegion.filter((r) => r.restocks > 0).slice(0, 3);
  const topStores = t.topStores.slice(0, 5);
  const drop = t.drops[0];
  const last7 = [...t.daily].slice(-7).reverse();
  const busiest = [...t.daily].filter((d) => d.restocks > 0).sort((a, b) => b.restocks - a.restocks)[0];
  const repN = t.reports.reduce((a, d) => a + d.restocks, 0);
  const daysSinceLaunch = Math.max(1, Math.floor((Date.parse(t.at) - Date.parse(`${DUO_LAUNCH_DAY}T00:00:00Z`)) / 86400_000));
  const todayLine = t.today ? `${plural(t.today.restocks, "restock")} at ${plural(t.today.stores, "store")}` : "no count yet";

  const lead = have
    ? `By reserving in-store pickup the moment a store restocks, not by ordering and waiting. Since ${since} PickupChecker has confirmed ${n(t.n)} iPhone Duo restocks at ${n(t.stores)} of the ${STORES.length} US Apple Stores, ${n(recent.restocks)} of them in the last 24 hours; ${pct(win.share)} landed between ${window} local time${typical ? `, and a typical one sold out in ${typical}` : ""}. So the way in is knowing the window, choosing the stores and configurations with the best odds, and getting a push within seconds of the listing.`
    : `By reserving in-store pickup the moment a store restocks, not by ordering and waiting. PickupChecker checks all ${STORES.length} US Apple Stores every ${SPEED.checkSec} seconds; the live restock counts on this page fill in as restocks are confirmed. The way in is knowing the window, choosing the stores and configurations with the best odds, and getting a push within seconds of the listing.`;

  const ways: Block[] = [
    { t: "table", head: ["Route", "What you get", "How long", "Our view"], rows: [
      ["Order for delivery on apple.com", "A ship date that moves as Apple catches up", `Within a day of launch, MacRumors reported estimates [pushing into late January](${MACRUMORS}), into 2027`, "Fine if you can wait"],
      ["Reserve in-store pickup when a store restocks", "A phone held under your name at a store you pick, at list price", "Days, if you watch the right stores at the right hour", "The only route measured in days"],
      ["A carrier store or Best Buy", "Their own allocation, often tied to a plan", "Unknown: we do not track them", "Ask them; we cannot give you odds"],
    ], caption: "Three ways to buy an iPhone Duo right now", source: `[MacRumors, ${longDate(DUO_PICKUP_RESUMED)}](${MACRUMORS}); PickupChecker restock log` },
    { t: "p", text: `The [iPhone](https://en.wikipedia.org/wiki/IPhone) Duo, Apple's first foldable, went on sale at Apple Stores worldwide on ${longDate(DUO_LAUNCH_DAY)} ([Apple Newsroom](${NEWSROOM})), from ${fmtPrice(low)} for ${storages[0]} to ${fmtPrice(high)} for ${storages[storages.length - 1]}, in ${listWords(colors)}. Pickup reservations appeared briefly at pre-order, vanished, and [resumed in the US and Canada](${MACRUMORS}) on ${longDate(DUO_PICKUP_RESUMED)} with most stores showing no slots. Supply has trickled out store by store ever since; each trickle is a restock we confirm and log.` },
    { t: "img", id: "apple-store-crowd-inside" },
  ];

  const whenBlocks: Block[] = [
    { t: "ul", items: [
      `**Between ${window} local time: ${pct(win.share)}** of every confirmed US restock since ${since}. Be signed in and holding your phone then.`,
      `**After 6 PM: ${pct(evening)}.** Evenings happen; they are the exception.`,
    ] },
    ...(drop ? [{ t: "p", text: `Stores cluster: the biggest wave we have logged put ${plural(drop.stores, "store")} on the board inside one half hour, around ${ET.format(new Date(drop.at))} ET. That is why alerts on several stores beat watching one by hand.` } as Block] : []),
    { t: "note", text: `A pattern is history, not a promise: Apple publishes no restock schedule ([Apple: Delivery and Pickup](${PICKUP})), and this launch is ${daysSinceLaunch} days old. The hour tells you when to be ready; the alert tells you when to act. Hour-by-hour tables by state and store: [When does Apple restock the iPhone Duo?](/iphone-duo-restock-times); how long each one lasted: [How fast does the iPhone Duo sell out?](/iphone-duo-sell-out-times).`, tone: "tip" },
  ];
  const whenLead = have
    ? `${pct(win.share)} of the ${n(t.n)} confirmed US restocks since ${since} landed between ${window} local time${t.peakWeekday != null ? `, and ${WEEKDAYS[t.peakWeekday]} has been the busiest day` : ""}. Today so far: ${todayLine}${t.latest ? `; the latest was ${cfgName(t.latest.partNumber)} at ${storeLink(t.latest.storeNumber)}, ${stamp(t.latest.at, t.latest.storeNumber)}` : ""}.${t.peakWeekday == null ? ` Which weekday is busiest needs ${WEEKDAY_MIN_SPAN} days of data (we have ${t.spanDays}), so we do not say yet.` : ""}`
    : "Every day, at hours that cluster in the morning; the live shares below are filled from PickupChecker's confirmed restocks. Apple publishes no schedule, so observed hours are the closest thing to one.";

  const odds: Block[] = [
    ...(topStores.length ? [{ t: "table", head: ["Store", `Restocks since ${since}`, "Days with a restock", "Usual hour", "Last restock"], rows: topStores.map((s) => {
      const store = storeByNumber(s.storeNumber);
      return [`${storeLink(s.storeNumber)}${store ? ` · ${storeLocality(store)}` : ""}`, n(s.restocks), String(s.days), s.peakHour != null ? hourLabel(s.peakHour) : "too few to say", stamp(s.lastAt, s.storeNumber)];
    }), caption: "The five US Apple Stores with the most confirmed iPhone Duo restocks", source: "PickupChecker restock log" } as Block] : []),
    { t: "table", head: ["Storage", "Price (either color)", `Restocks since ${since}`, "Share"], rows: storageRows.map((r) => [r.storage, fmtPrice(r.price), n(r.restocks), pct(r.share)]), caption: "iPhone Duo restocks by storage size, all US Apple Stores", source: "PickupChecker restock log; prices from [apple.com](https://www.apple.com/shop/buy-iphone/iphone-duo)" },
    { t: "p", text: colorRows.length === 2 && t.n > 0
      ? `Color is the smaller lever: ${colorRows[0].color} has ${n(colorRows[0].restocks)} confirmed restocks to ${colorRows[1].color}'s ${n(colorRows[1].restocks)}. Storage decides more.`
      : "Color is usually the smaller lever; storage decides more. The live counts fill in as restocks are confirmed." },
    { t: "p", text: `Our honest view: do not fixate on one store. Pick two or three you can reach, lead with ${bestStorage ? `the ${bestStorage.storage}` : "the storage that restocks most"}, and accept the second color; three stores × two configurations is ${plural(6, "alert")}, six ways to get the push. All eight configurations are ranked on [Which iPhone Duo restocks most?](/which-iphone-duo-restocks-most), the stores around you are on [iPhone Duo near me](/iphone-duo-near-me), and live stock at every store is on [the iPhone Duo stock page](/stock/iphone-duo).` },
    { t: "img", id: "foldable-butterfly" },
  ];
  const oddsLead = have && topName && topPrice != null && regions[0]
    ? `${topName} (${fmtPrice(topPrice)}) is the most-restocked configuration, ${pct(top!.share)} of all confirmed restocks; ${regions.map((r) => `[${r.name}](${r.path})`).join(", ")} lead the states, with ${plural(regions[0].restocks, "restock")} at ${plural(regions[0].stores, "store")} in ${regions[0].name} alone. Watch two or three stores in a busy region and accept more than one configuration.`
    : "The configuration that restocks most and the states where it happens most; the ranking fills in from PickupChecker's confirmed restocks. Watch two or three stores and accept more than one configuration.";

  const playbook: Block[] = [
    { t: "ol", items: [
      `**Sign in to apple.com or the Apple Store app now,** with Apple Pay or a card and your address saved; checkout has to take seconds ([Apple: Delivery and Pickup](${PICKUP})).`,
      "**Decide the two or three stores you can reach.** A reservation is for one store; each store page shows its usual hour.",
      "**Accept more than one configuration:** the storage you want and the next size, in either color.",
      `**Set one alert per store × configuration** on [the alert setup](/#notify). On an iPhone, add the Home Screen app first ([install](/install)) so the push lands on your lock screen; your stores are then checked every ${SPEED.fastSec} seconds.`,
      "**When the push arrives, open its link, choose \"I'll pick it up\", pick the store and a time slot, pay.** Do not browse, do not go back to change the color.",
      "**Wait for Apple's pickup email.** The reservation is an order; Apple confirms the pickup time by email and notification.",
      `**Bring the order number (the email carries a QR code) and a government photo ID.** Apple's pickup emails and [its shipping and pickup help](${PICKUP_HELP}) list what the store asks for.`,
    ] },
    { t: "note", text: `Why seconds matter: ${typical ? `a typical iPhone Duo listing is gone in ${typical}` : "iPhone Duo listings are gone in minutes"}, and PickupChecker's push reaches your phone about ${SPEED.alertSec} seconds after a restock is confirmed. Between those two numbers is the whole game — the tap-by-tap version, with Apple's checkout staged before the window, is [Grab an iPhone Duo restock in 20 seconds](/how-to-grab-an-iphone-duo-restock).` },
    { t: "img", id: "phone-card-payment" },
    { t: "cta", label: "Set up your alerts", href: "/#notify", sub: `Plus is $${PLANS.plus.priceUsd}/month for ${PLANS.plus.limit} alerts; [pricing](/pricing).` },
  ];

  const walkIn: Block[] = [
    { t: "p", text: `MacRumors described [long queues at Apple Stores worldwide on launch day](${MACRUMORS}) and "some lucky customers" getting a Duo on a walk-in basis; Apple's own [launch announcement](${NEWSROOM}) sends shoppers to apple.com and the Apple Store app as well as its stores and says nothing about walk-in quantities. Nobody outside Apple knows how many units a store holds back, and Apple publishes no restock schedule, so there is none for the staff to read you.` },
    { t: "p", text: "A walk-in is a hope; a reservation is a held phone. What we log is the pickup slot appearing on apple.com, which you can reserve from your couch. If you want the phone this week, reserve it." },
  ];

  const fails: Block[] = [
    { t: "ul", items: [
      ds
        ? `**Refreshing apple.com by hand.** Of the ${n(ds.n)} Duo restocks of the last 7 days that sold out, ${pct(ds.within30)} were gone within 30 seconds. Someone reloading every 5 minutes would have seen about ${pct(ds.caught.m5)} of them, every 15 minutes about ${pct(ds.caught.m15)}, and even reloading every minute only about ${pct(ds.caught.m1)}.`
        : "**Refreshing apple.com by hand.** Listings last minutes; most come and go between two reloads. We publish the exact catch rate here once enough of the last week's restocks have sold out.",
      "**Calling the store.** Apple publishes no restock schedule; staff see the same pickup availability you see.",
      `**Paying a reseller.** Resale premiums exist for a sold-out phone and buy you nothing but time; Apple sells the same phone at list price, from ${fmtPrice(low)}, the moment you reserve one.`,
      `**Waiting up for an "overnight restock".** ${pct(night)} of confirmed US restocks since ${since} fell between midnight and 6 AM local time. Sleep; be ready at ${hourLabel(win.from)}.`,
    ] },
  ];

  const supply: Block[] = [
    ...(last7.length ? [{ t: "table", head: ["Day", "Confirmed restocks", "Stores with a restock", "Busiest hour"], rows: last7.map((d) => [dayLabel(d.date), n(d.restocks), n(d.stores), d.peakHour != null ? hourLabel(d.peakHour) : "—"]), caption: `iPhone Duo restocks per day at all ${STORES.length} US Apple Stores, most recent first (today is a partial day)`, source: "PickupChecker restock log; local days in each store's own zone" } as Block] : []),
    ...(t.reports.length ? [{ t: "p", text: `Before our tracking began, other trackers published ${n(repN)} iPhone Duo restock reports for ${dayLabel(t.reports[0].date)}–${dayLabel(t.reports[t.reports.length - 1].date)}; they appear on our restock-time pages as a separate, labelled series and are never counted with ours.` } as Block] : []),
  ];
  const supplyLead = have && busiest
    ? `${n(t.n)} confirmed restocks over ${plural(t.days, "day")} since ${since}: the busiest day was ${dayLabel(busiest.date)}, ${plural(busiest.restocks, "restock")} at ${plural(busiest.stores, "store")}, and today so far has ${todayLine}. Supply arrives every day, in lots small enough to sell out in minutes.`
    : `PickupChecker has tracked every US Apple Store since ${since}; the day-by-day table fills in as restocks are confirmed.`;

  const sections: { id: string; nav: string; h2: string; lead: string; blocks: Block[] }[] = [
    { id: "ways", nav: "Three ways", h2: "What are the three ways to buy an iPhone Duo right now?", lead: "Order on apple.com for delivery and wait for the date it shows; reserve an Apple Store pickup the moment a store restocks; or try a carrier or Best Buy, which we do not track. Only the second is measured in days rather than months; it is what this page is about.", blocks: ways },
    { id: "when", nav: "Restock window", h2: "When do Apple Stores restock the iPhone Duo?", lead: whenLead, blocks: whenBlocks },
    { id: "odds", nav: "Best odds", h2: "Which stores and configurations give the best odds?", lead: oddsLead, blocks: odds },
    { id: "playbook", nav: "Playbook", h2: "What is the step-by-step pickup playbook?", lead: "Prepare the account, choose the stores, set one alert per store and configuration, then reserve from the push in under a minute. Seven steps, in order:", blocks: playbook },
    { id: "walk-in", nav: "Walk in?", h2: "Can I just walk in and buy one?", lead: "Some people did at launch; we would not plan a week around it. Reports from launch weekend describe long queues and some walk-in sales, and pickup slots are the stock you can actually count on.", blocks: walkIn },
    { id: "what-fails", nav: "What fails", h2: "What doesn't work?", lead: "Refreshing apple.com by hand, calling the store, paying a reseller and waiting up for an overnight restock. The numbers below are why.", blocks: fails },
    { id: "supply", nav: "Supply since launch", h2: "How has supply changed since launch?", lead: supplyLead, blocks: supply },
  ];

  const storageAnswer = storageRows.length >= 2 && t.n > 0
    ? `${bestStorage.storage} has restocked most, ${pct(bestStorage.share)} of confirmed US restocks since ${since} (${storageRows.map((r) => `${r.storage} ${pct(r.share)}`).join(", ")}); ${storages[0]} costs ${fmtPrice(storageRows[0].price)} and ${storages[1]} ${fmtPrice(storageRows[1].price)}. Our view: watch both, lead with ${bestStorage.storage}, and let the first push decide.`
    : "Watch both. The split by storage fills in as restocks are confirmed, and [Which iPhone Duo restocks most?](/which-iphone-duo-restocks-most) ranks all eight configurations.";
  const faq: Faq[] = [
    { q: "Is the iPhone Duo still sold out?", a: `At most stores, most of the time. Right now {{duo.storesNow}} of {{duo.storesTotal}} US Apple Stores list at least one configuration for pickup${typical ? `, and a typical listing is gone in ${typical}` : ""}. Restocks still arrive daily: ${n(recent.restocks)} confirmed in the last 24 hours at ${plural(recent.stores, "store")}.` },
    { q: "How long will I wait if I order delivery?", a: `Apple shows the date at checkout and it moves. Within a day of launch, MacRumors reported delivery estimates [pushing into late January](${MACRUMORS}). PickupChecker tracks in-store pickup stock, not delivery dates.` },
    { q: "Does Apple hold the phone once I reserve?", a: `Yes. A pickup reservation is an order placed for that store; Apple [guides you through pickup by email and notification](${PICKUP}) and tells you the pickup time. Bring your order number and a government photo ID.` },
    { q: `Should I pick ${storages[0]} or ${storages[1]}?`, a: storageAnswer },
    { q: `Is it worth $${PLANS.plus.priceUsd} a month for alerts?`, a: `If you want the phone this month, we think so: Plus is $${PLANS.plus.priceUsd} for ${PLANS.plus.limit} alerts, each store checked every ${SPEED.fastSec} seconds, with a push about ${SPEED.alertSec} seconds after a restock is confirmed${typical ? `, against listings that last ${typical}` : ""}. If the delivery date suits you, keep the money. PickupChecker is independent and not affiliated with Apple.` },
  ];
  const sources: Source[] = [
    { label: `Apple Newsroom: iPhone Duo arrives at Apple Store locations worldwide (${longDate(DUO_LAUNCH_DAY)})`, url: NEWSROOM },
    { label: `MacRumors: Apple Store pickup for the iPhone Duo resumes in the US and Canada (${longDate(DUO_PICKUP_RESUMED)})`, url: MACRUMORS },
    { label: "Apple: Delivery and Pickup (how in-store pickup works)", url: PICKUP },
    { label: "Apple: Shipping & Pickup help", url: PICKUP_HELP },
    { label: "Wikipedia: iPhone", url: "https://en.wikipedia.org/wiki/IPhone" },
  ];

  const site = "https://pickupchecker.com";
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${site}/how-to-get-an-iphone-duo`, url: `${site}/how-to-get-an-iphone-duo`, name: TITLE, description: DESCRIPTION, isPartOf: { "@id": `${site}/#website` }, about: { "@id": `${site}/#organization` }, dateModified: t.at },
      {
        "@type": "HowTo", name: "How to get an iPhone Duo by Apple Store pickup when it is sold out",
        description: `Reserve in-store pickup the moment a store restocks: most restocks land between ${window} local time and sell out in minutes, so prepare the account, watch several stores and configurations, and act on a push within seconds.`,
        step: [
          { "@type": "HowToStep", name: "Sign in to apple.com in advance", text: "Save Apple Pay or a card and your address so checkout takes seconds.", url: PICKUP },
          { "@type": "HowToStep", name: "Choose two or three stores you can reach", text: "A reservation is for one store; each store page shows its usual restock hour.", url: `${site}/stores` },
          { "@type": "HowToStep", name: "Accept more than one configuration", text: "The storage you want and the next size, in either color." },
          { "@type": "HowToStep", name: "Set one alert per store and configuration", text: `Each chosen store is checked every ${SPEED.fastSec} seconds; add the Home Screen app on iPhone for push notifications.`, url: `${site}/#notify` },
          { "@type": "HowToStep", name: "Reserve from the push", text: "Open the link, choose I'll pick it up, pick the store and time slot, pay." },
          { "@type": "HowToStep", name: "Wait for Apple's pickup email", text: "Apple confirms the pickup time by email and notification." },
          { "@type": "HowToStep", name: "Collect with order number and photo ID", text: "Bring the order's QR code or number and a government photo ID.", url: PICKUP_HELP },
        ],
      },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10">
      <JsonLd data={ld} />
      <h1 className="display text-3xl sm:text-5xl">How do you actually get an iPhone Duo when every store says sold out?</h1>
      <p className="mt-4 text-lg text-ink-2">{lead}</p>
      <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2 text-sm">
        {sections.map((s) => <a key={s.id} href={`#${s.id}`} className="chip px-3 py-1.5 text-xs">{s.nav}</a>)}
      </nav>
      <div className="pane prose-site mt-8 p-6 sm:p-8">
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-24">
            <h2>{s.h2}</h2>
            <p><b><Inline text={s.lead} facts={facts} /></b></p>
            {s.blocks.map((b, i) => <BlockView key={i} b={b} facts={facts} />)}
          </section>
        ))}
        <p className="mt-6 text-sm text-ink-3">
          How the numbers are made: <Link href="/how-it-works">how PickupChecker works</Link> · <Link href="/apple-store-pickup-availability-explained">what Apple Store pickup availability means</Link> · <Link href="/restocks">today&apos;s restock log</Link>.
        </p>
      </div>
      <div className="mt-10"><RichFaq items={faq} facts={facts} title="Questions" /></div>
      <div className="mt-8"><SourceList sources={sources} facts={facts} where={`all ${STORES.length} US Apple Stores`} /></div>
    </div>
  );
}
