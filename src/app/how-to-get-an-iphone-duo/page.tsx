/**
 * /how-to-get-an-iphone-duo: the wider plan, told in numbers and keywords. Every H2 is a question an answer engine
 * can quote, with one answer-first sentence under it; everything else is tiles, tables, keyword lines, swaps and a
 * step strip. All numbers are live from the restock log.
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
import { PART_INDEX, STORES, appleName, catalogFor, storeByNumber, storeLocality, storePath } from "@/lib/apple/catalog";
import { PLANS, SPEED } from "@/lib/plans";
import { WEEKDAYS, WEEKDAY_MIN_SPAN, hourLabel, localStamp, siteFacts } from "@/lib/content/siteFacts";
import { DUO_LAUNCH_DAY, DUO_PICKUP_RESUMED, busiestWindow, duoRestockTimes, hourShare } from "@/lib/content/restockTimes";
import { recentByConfig } from "@/lib/stock/recent";
import { medianBand } from "@/lib/stock/sellouts";
import { fmtPrice, listWords, plural } from "@/lib/seo/enrich";
import { Measured, Points, Stat, StatGrid, StepStrip, Swap } from "@/components/ui/Viz";

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

  const waysTable: Block = { t: "table", head: ["Route", "What you get", "How long", "Our view"], rows: [
    ["Order for delivery on apple.com", "A ship date that moves as Apple catches up", `Within a day of launch, MacRumors reported estimates [pushing into late January](${MACRUMORS}), into 2027`, "Fine if you can wait"],
    ["Reserve in-store pickup when a store restocks", "A phone held under your name at a store you pick, at list price", "Days, if you watch the right stores at the right hour", "The only route measured in days"],
    ["A carrier store or Best Buy", "Their own allocation, often tied to a plan", "Unknown: we do not track them", "Ask them; we cannot give you odds"],
  ], caption: "Three ways to buy an iPhone Duo right now", source: `[MacRumors, ${longDate(DUO_PICKUP_RESUMED)}](${MACRUMORS}); PickupChecker restock log` };

  const whenLead = have
    ? `**${pct(win.share)}** of the ${n(t.n)} confirmed US restocks since ${since} landed between **${window}** local time${t.peakWeekday != null ? `, and **${WEEKDAYS[t.peakWeekday]}** has been the busiest day` : ""}.`
    : "Every day, at hours that cluster in the morning; Apple publishes no schedule, so the observed hours below are the closest thing to one.";

  const storesTable: Block | null = topStores.length ? { t: "table", head: ["Store", `Restocks since ${since}`, "Days with a restock", "Usual hour", "Last restock"], rows: topStores.map((s) => {
    const store = storeByNumber(s.storeNumber);
    return [`${storeLink(s.storeNumber)}${store ? ` · ${storeLocality(store)}` : ""}`, n(s.restocks), String(s.days), s.peakHour != null ? hourLabel(s.peakHour) : "too few to say", stamp(s.lastAt, s.storeNumber)];
  }), caption: "The five US Apple Stores with the most confirmed iPhone Duo restocks", source: "PickupChecker restock log" } : null;
  const storageTable: Block = { t: "table", head: ["Storage", "Price (either color)", `Restocks since ${since}`, "Share"], rows: storageRows.map((r) => [r.storage, fmtPrice(r.price), n(r.restocks), pct(r.share)]), caption: "iPhone Duo restocks by storage size, all US Apple Stores", source: "PickupChecker restock log; prices from [apple.com](https://www.apple.com/shop/buy-iphone/iphone-duo)" };
  const oddsLead = have && topName && topPrice != null && regions[0]
    ? `**${topName}** (${fmtPrice(topPrice)}) is the most-restocked configuration, **${pct(top!.share)}** of all confirmed restocks; ${regions.map((r) => `[${r.name}](${r.path})`).join(", ")} lead the states.`
    : "The configuration that restocks most and the states where it happens most; the ranking fills in from PickupChecker's confirmed restocks.";

  const supplyLead = have && busiest
    ? `**${n(t.n)}** confirmed restocks over **${plural(t.days, "day")}** since ${since}, arriving every day in lots small enough to sell out in minutes.`
    : `PickupChecker has tracked every US Apple Store since ${since}; the day-by-day table fills in as restocks are confirmed.`;
  const dailyTable: Block | null = last7.length ? { t: "table", head: ["Day", "Confirmed restocks", "Stores with a restock", "Busiest hour"], rows: last7.map((d) => [dayLabel(d.date), n(d.restocks), n(d.stores), d.peakHour != null ? hourLabel(d.peakHour) : "—"]), caption: `iPhone Duo restocks per day at all ${STORES.length} US Apple Stores, most recent first (today is a partial day)`, source: "PickupChecker restock log; local days in each store's own zone" } : null;

  const nav = [
    { id: "ways", label: "Three ways" },
    { id: "when", label: "Restock window" },
    { id: "odds", label: "Best odds" },
    { id: "playbook", label: "Playbook" },
    { id: "walk-in", label: "Walk in?" },
    { id: "what-fails", label: "What fails" },
    { id: "supply", label: "Supply since launch" },
  ];

  const storageAnswer = storageRows.length >= 2 && t.n > 0
    ? `${bestStorage.storage} has restocked most, ${pct(bestStorage.share)} of confirmed US restocks since ${since} (${storageRows.map((r) => `${r.storage} ${pct(r.share)}`).join(", ")}); ${storages[0]} costs ${fmtPrice(storageRows[0].price)} and ${storages[1]} ${fmtPrice(storageRows[1].price)}. Our view: watch both, lead with ${bestStorage.storage}, and let the first push decide.`
    : "Watch both. The split by storage fills in as restocks are confirmed, and [Which iPhone Duo restocks most?](/which-iphone-duo-restocks-most) ranks all eight configurations.";
  const faq: Faq[] = [
    { q: "Is the iPhone Duo still sold out?", a: `At most stores, most of the time: right now {{duo.storesNow}} of {{duo.storesTotal}} US Apple Stores list at least one configuration for pickup${typical ? `, and a typical listing is gone in ${typical}` : ""}. Restocks still arrive daily: ${n(recent.restocks)} confirmed in the last 24 hours at ${plural(recent.stores, "store")}.` },
    { q: "How long will I wait if I order delivery?", a: `Apple shows the date at checkout and it moves; within a day of launch, MacRumors reported delivery estimates [pushing into late January](${MACRUMORS}). PickupChecker tracks in-store pickup stock, not delivery dates.` },
    { q: "Does Apple hold the phone once I reserve?", a: `Yes: a pickup reservation is an order placed for that store, and Apple [guides you through pickup by email and notification](${PICKUP}) with the pickup time. Bring your order number and a government photo ID.` },
    { q: `Should I pick ${storages[0]} or ${storages[1]}?`, a: storageAnswer },
    { q: `Is it worth $${PLANS.plus.priceUsd} a month for alerts?`, a: `If you want the phone this month, we think so: Plus is $${PLANS.plus.priceUsd} for ${PLANS.plus.limit} alerts, each store checked every ${SPEED.fastSec} seconds, with a push about ${SPEED.alertSec} seconds after a restock is confirmed${typical ? `, against listings that last ${typical}` : ""}. If the delivery date suits you, keep the money; PickupChecker is independent and not affiliated with Apple.` },
    { q: "If I cancel my apple.com delivery order and reorder, do I lose my place in line?", a: `You get a new order with today's shipping estimate; Apple publishes no queue position. Compare the estimate shown at checkout with the one on your existing order before cancelling — it is rarely earlier. Keep the delivery order until a pickup reservation is in your hand, then cancel it; the two are separate queues ([Apple Store pickup vs delivery, carriers and retailers](/iphone-duo-apple-vs-carriers-vs-retailers)).` },
    { q: "Is buying from Verizon, AT&T or T-Mobile faster than Apple?", a: `Nobody can say honestly: carriers get their own allocation and publish no stock feed or history, so there is nothing to measure. Apple Store pickup is the one channel with a record — {{duo.restocks}} confirmed restocks since {{trackingSince}} — and an alert here lands about 3 seconds after a restock is confirmed. A carrier shop with one on the shelf is worth taking, financing and plan terms aside; the full comparison, resale markups included, is on [Apple, Best Buy or a carrier?](/iphone-duo-apple-vs-carriers-vs-retailers).` },
    { q: "Can I buy an iPhone Duo in Canada or abroad and use it in the US?", a: `Usually: an iPhone bought from Apple is sold unlocked in most countries, and the Duo is eSIM-only everywhere, so your carrier needs eSIM. Check Apple's warranty page for where service is offered (it is international with exceptions), keep the receipt, and expect local tax at the register plus possible duty on the way back. PickupChecker tracks Apple Stores in [18 other countries](/ca), so the stock question itself is answerable before you travel.` },
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
    <div className="mx-auto max-w-5xl px-4 pt-8 sm:pt-12">
      <JsonLd data={ld} />

      {/* hero */}
      <section className="grid items-start gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="eyebrow mb-4">iPhone Duo · the way in</div>
          <h1 className="display text-4xl sm:text-6xl">How do you actually get an iPhone Duo when every store says sold out?</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-2"><b className="text-ink">Reserve in-store pickup the moment a store restocks</b>, not by ordering and waiting: know the window, pick the stores with the best odds, get the push within seconds.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/#notify" className="btn btn-primary btn-lg">Set up alerts</Link>
            <Link href="/how-to-grab-an-iphone-duo-restock" className="btn btn-ghost btn-lg">The 20-second checkout</Link>
          </div>
        </div>
        <StatGrid cols={2}>
          {have ? <Stat value={n(t.n)} label={<>confirmed US restocks since {since} · {n(t.stores)} of {STORES.length} stores</>} /> : <Stat value={STORES.length} label={<>US Apple Stores checked every {SPEED.checkSec} seconds</>} />}
          {!recent.unknown ? <Stat value={n(recent.restocks)} label={<>confirmed in the last 24 hours · {plural(recent.stores, "store")}</>} live /> : <Stat value="—" label="last 24 hours: count briefly unavailable" tone="muted" />}
          {have ? <Stat value={pct(win.share)} label={<>land between {window}, store local time</>} tone="accent" /> : <Stat value={`${SPEED.fastSec}`} unit="s" label="between checks at stores with alerts" tone="accent" />}
          {t.sellout ? <Stat value={`${t.sellout.medianSec}`} unit="s" label="typical listing, listed to gone" tone="warn" /> : <Stat value={`~${SPEED.alertSec}`} unit="s" label="confirmed restock to your phone" />}
        </StatGrid>
      </section>

      <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-2 text-sm">
        {nav.map((s) => <a key={s.id} href={`#${s.id}`} className="chip px-3 py-1.5 text-xs">{s.label}</a>)}
      </nav>

      <div className="mt-6 grid gap-5">
        {/* ways */}
        <Section id="ways" h2="What are the three ways to buy an iPhone Duo right now?" facts={facts}
          lead="Delivery from apple.com (a date that moves), **an Apple Store pickup the moment a store restocks** (days), or a carrier or Best Buy (untracked): only pickup is measured in days.">
          <BlockView b={waysTable} facts={facts} />
          <Points items={[
            { text: <Inline text={`Apple's first foldable [iPhone](https://en.wikipedia.org/wiki/IPhone) · on sale ${longDate(DUO_LAUNCH_DAY)} ([Apple Newsroom](${NEWSROOM}))`} facts={facts} /> },
            { text: <Inline text={`**${fmtPrice(low)}** for ${storages[0]} to **${fmtPrice(high)}** for ${storages[storages.length - 1]} · ${listWords(colors)}`} facts={facts} /> },
            { text: <Inline text={`Pickup slots vanished at pre-order, [resumed ${longDate(DUO_PICKUP_RESUMED)}](${MACRUMORS}) with most stores showing none`} facts={facts} /> },
            { text: <>Supply trickles out store by store; each trickle is a restock we confirm and log</>, step: true },
          ]} />
          <Figure id="apple-store-crowd-inside" />
        </Section>

        {/* when */}
        <Section id="when" h2="When do Apple Stores restock the iPhone Duo?" lead={whenLead} facts={facts}>
          <StatGrid cols={3} className="mt-5">
            <Stat value={have ? pct(win.share) : "—"} label={<>between {window} local time</>} tone="accent" />
            <Stat value={have ? pct(evening) : "—"} label="after 6 PM: evenings happen, as the exception" tone="muted" />
            <Stat value={have ? pct(night) : "—"} label="midnight to 6 AM: the overnight restock is a myth" tone="muted" />
          </StatGrid>
          <Points className="mt-5" items={[
            { text: <Inline text={`**Today so far:** ${todayLine}`} facts={facts} /> },
            ...(t.latest ? [{ text: <Inline text={`**Latest:** ${cfgName(t.latest.partNumber)} at ${storeLink(t.latest.storeNumber)}, ${stamp(t.latest.at, t.latest.storeNumber)}`} facts={facts} /> }] : []),
            ...(drop ? [{ text: <><b className="text-ink">Biggest wave:</b> {plural(drop.stores, "store")} on the board inside one half hour, around {ET.format(new Date(drop.at))} ET</> }] : []),
            ...(have && t.peakWeekday == null ? [{ text: <>Busiest weekday: needs {WEEKDAY_MIN_SPAN} days of data, we have {t.spanDays}</>, no: true }] : []),
            { text: <>Be signed in and holding your phone in that window; alerts on several stores beat watching one by hand</>, step: true },
          ]} />
          <Measured>
            <Inline text={`A pattern is history, not a promise: Apple publishes no restock schedule ([Apple: Delivery and Pickup](${PICKUP})) and this launch is ${daysSinceLaunch} days old. The hour tells you when to be ready; the alert tells you when to act.`} facts={facts} />
          </Measured>
          <LinkRow links={[{ label: "When does Apple restock the iPhone Duo? Hour by hour", href: "/iphone-duo-restock-times" }, { label: "How fast does it sell out? Every restock timed", href: "/iphone-duo-sell-out-times" }]} />
        </Section>

        {/* odds */}
        <Section id="odds" h2="Which stores and configurations give the best odds?" lead={oddsLead} facts={facts}>
          {regions.length > 0 && (
            <StatGrid cols={3} className="mt-5">
              {regions.map((r, i) => <Stat key={r.slug} value={n(r.restocks)} label={<><Link href={r.path} className="underline underline-offset-2">{r.name}</Link> · {plural(r.stores, "store")} with a restock</>} tone={i === 0 ? "accent" : "plain"} />)}
            </StatGrid>
          )}
          {storesTable && <BlockView b={storesTable} facts={facts} />}
          <BlockView b={storageTable} facts={facts} />
          {colorRows.length === 2 && t.n > 0 && (
            <StatGrid cols={2} className="mt-2">
              <Stat value={n(colorRows[0].restocks)} label={<>{colorRows[0].color} · confirmed restocks</>} />
              <Stat value={n(colorRows[1].restocks)} label={<>{colorRows[1].color} · confirmed restocks</>} tone="muted" />
            </StatGrid>
          )}
          <Points className="mt-5" items={[
            { text: <>Color is the smaller lever; <b className="text-ink">storage decides more</b></> },
            { text: <>Do not fixate on one store: <b className="text-ink">two or three</b> you can reach</> },
            { text: <>Lead with <b className="text-ink">{bestStorage ? `the ${bestStorage.storage}` : "the storage that restocks most"}</b>, accept the second color</> },
            { text: <>3 stores × 2 configurations = <b className="text-ink">{plural(6, "alert")}</b>, six ways to get the push</>, step: true },
          ]} />
          <LinkRow links={[{ label: "All eight configurations ranked", href: "/which-iphone-duo-restocks-most" }, { label: "iPhone Duo near me", href: "/iphone-duo-near-me" }, { label: "Live stock at every store", href: "/stock/iphone-duo" }]} />
          <Figure id="foldable-butterfly" />
        </Section>

        {/* playbook */}
        <Section id="playbook" h2="What is the step-by-step pickup playbook?" facts={facts}
          lead="Prepare the account, choose the stores, set one alert per store × configuration, then **reserve from the push in under a minute**: seven steps.">
          <StepStrip className="mt-5" steps={[
            { title: "Sign in to apple.com now", hint: <Inline text={`Apple Pay or a card and your address saved; checkout has to take seconds ([Apple: Delivery and Pickup](${PICKUP}))`} facts={facts} /> },
            { title: "Decide two or three stores", hint: "ones you can reach; each store page shows its usual hour" },
            { title: "Accept more than one configuration", hint: "the storage you want and the next size, either color" },
            { title: "One alert per store × configuration", hint: <Inline text={`[alert setup](/#notify) · on iPhone, [add the Home Screen app](/install) first · your stores are then checked every ${SPEED.fastSec} seconds`} facts={facts} /> },
            { title: "Reserve from the push", hint: "open its link → \"I'll pick it up\" → the store → a time slot → pay; do not browse or change the color" },
            { title: "Wait for Apple's pickup email", hint: "the reservation is an order; Apple confirms the pickup time by email and notification" },
            { title: "Bring the QR code and photo ID", hint: <Inline text={`the order number (the email carries a QR code) and a government photo ID ([Apple's pickup help](${PICKUP_HELP}))`} facts={facts} /> },
          ]} />
          <StatGrid cols={3} className="mt-6">
            <Stat value={t.sellout ? `${t.sellout.medianSec}` : "~60"} unit="s" label="typical iPhone Duo listing, listed to gone" tone="warn" />
            <Stat value={`~${SPEED.alertSec}`} unit="s" label="confirmed restock to the push on your phone" />
            <Stat value="20" unit="s" label={<>the four taps, with Apple&apos;s checkout staged before the window: <Link href="/how-to-grab-an-iphone-duo-restock" className="underline underline-offset-2">the tap-by-tap guide</Link></>} tone="accent" />
          </StatGrid>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href="/#notify" className="btn btn-primary">Set up your alerts</Link>
            <span className="text-sm text-ink-3"><Inline text={`Plus is $${PLANS.plus.priceUsd}/month for ${PLANS.plus.limit} alerts; [pricing](/pricing).`} facts={facts} /></span>
          </div>
          <Figure id="phone-card-payment" />
        </Section>

        {/* walk-in */}
        <Section id="walk-in" h2="Can I just walk in and buy one?" facts={facts}
          lead="Some people did at launch; we would not plan a week around it, because **pickup slots are the stock you can actually count on**.">
          <ol className="mt-5 grid gap-3 sm:grid-cols-2">
            <Swap no="Queue at the door and hope" yes="Reserve the slot from your couch" why="A walk-in is a hope; a reservation is a held phone. What we log is the pickup slot appearing on apple.com." />
            <Swap no="Ask staff when stock comes in" yes="Watch the pickup listing" why="Nobody outside Apple knows how many units a store holds back, and there is no restock schedule for staff to read you." />
          </ol>
          <Points className="mt-5" items={[
            { text: <Inline text={`[MacRumors](${MACRUMORS}): long launch-day queues worldwide, "some lucky customers" walked out with one`} facts={facts} /> },
            { text: <Inline text={`[Apple's announcement](${NEWSROOM}) sends shoppers to apple.com and the app as well as its stores; nothing on walk-in quantities`} facts={facts} /> },
            { text: <>Want the phone this week? Reserve it</>, step: true },
          ]} />
        </Section>

        {/* what fails */}
        <Section id="what-fails" h2="What doesn't work?" facts={facts}
          lead="Refreshing apple.com by hand, calling the store, paying a reseller and waiting up for an overnight restock; the numbers say why.">
          <ol className="mt-5 grid gap-3 sm:grid-cols-2">
            <Swap no="Refreshing apple.com by hand" yes={<>A push ~{SPEED.alertSec} s after confirmation</>} why={ds ? <>Of the {n(ds.n)} Duo restocks that sold out in the last 7 days, <b>{pct(ds.within30)}</b> were gone within 30 seconds; reloading every minute sees about {pct(ds.caught.m1)} of them, every 5 minutes {pct(ds.caught.m5)}, every 15 minutes {pct(ds.caught.m15)}.</> : "Listings last minutes; most come and go between two reloads. The exact catch rate appears here once enough of the last week's restocks have sold out."} />
            <Swap no="Calling the store" yes="Read the store page's usual hour" why="Apple publishes no restock schedule; staff see the same pickup availability you see." />
            <Swap no="Paying a reseller" yes={<>List price, from {fmtPrice(low)}, the moment you reserve</>} why="Resale premiums exist for a sold-out phone and buy you nothing but time." />
            <Swap no="Waiting up for an overnight restock" yes={<>Sleep; be ready at {hourLabel(win.from)}</>} why={<>{have ? pct(night) : "A tiny share"} of confirmed US restocks since {since} fell between midnight and 6 AM local time.</>} />
          </ol>
        </Section>

        {/* supply */}
        <Section id="supply" h2="How has supply changed since launch?" lead={supplyLead} facts={facts}>
          <StatGrid cols={3} className="mt-5">
            <Stat value={busiest ? n(busiest.restocks) : "—"} label={busiest ? <>busiest day · {dayLabel(busiest.date)} · {plural(busiest.stores, "store")}</> : "busiest day: fills in with the first restocks"} tone="accent" />
            <Stat value={t.today ? n(t.today.restocks) : "—"} label={t.today ? <>today so far · {plural(t.today.stores, "store")} · a partial day</> : "today so far: no count yet"} live={!!t.today} />
            <Stat value={t.reports.length ? n(repN) : "—"} label={t.reports.length ? <>launch-week reports by other trackers, {dayLabel(t.reports[0].date)}–{dayLabel(t.reports[t.reports.length - 1].date)} · a separate, labelled series, never counted with ours</> : "launch-week reports by other trackers: shown separately, never counted"} tone="muted" />
          </StatGrid>
          {dailyTable && <BlockView b={dailyTable} facts={facts} />}
          <LinkRow className="mt-2" links={[{ label: "How the numbers are made", href: "/how-it-works" }, { label: "What Apple Store pickup availability means", href: "/apple-store-pickup-availability-explained" }, { label: "Today's restock log", href: "/restocks" }]} />
        </Section>
      </div>

      <div className="mx-auto mt-10 max-w-3xl"><RichFaq items={faq} facts={facts} title="Questions" /></div>
      <div className="mx-auto mt-8 max-w-3xl"><SourceList sources={sources} facts={facts} where={`all ${STORES.length} US Apple Stores`} /></div>
    </div>
  );
}
