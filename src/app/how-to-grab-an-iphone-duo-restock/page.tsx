/**
 * /how-to-grab-an-iphone-duo-restock: the 20-second checkout, told in pictures and keywords. Everything except the
 * last four taps is done before the restock — Apple's checkout staged on the exact configuration, kept open through
 * the hour the reader's stores usually restock — so the push leaves Pickup, the store, the first slot and Apple Pay.
 * Each step is a title, two or three keyword lines and a hand-drawn illustration (CheckoutMocks), never Apple's
 * screens; the sentences live in the FAQ and the HowTo schema. Every number is live.
 */
import type { Metadata } from "next";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { JsonLd } from "@/components/seo/JsonLd";
import { Figure } from "@/components/content/Figure";
import { RichFaq, SourceList } from "@/components/content/RichFaq";
import { emptyFacts } from "@/lib/content/facts";
import type { Faq, Source } from "@/lib/content/types";
import { AlertBannerMock, AutoLockMock, CheckoutSheetMock, RestockWindowMock, StorePickMock, TermsMock, TimeSlotMock } from "@/components/content/CheckoutMocks";
import { PART_INDEX, STORES } from "@/lib/apple/catalog";
import { SPEED } from "@/lib/plans";
import { TRACKING_SINCE_US, siteFacts } from "@/lib/content/siteFacts";
import { busiestWindow, duoRestockTimes, rangeLabel } from "@/lib/content/restockTimes";
import { medianBand } from "@/lib/stock/sellouts";
import { alertHref } from "@/lib/seo/enrich";
import { Do, Dont, Points, Stat, StatGrid, Swap, type Point } from "@/components/ui/Viz";

export const dynamic = "force-dynamic";

const PATH = "/how-to-grab-an-iphone-duo-restock";
const TITLE = "Grab an iPhone Duo Restock in 20 Seconds: Checkout Guide";
const SITE = "https://pickupchecker.com";
const APPLE_PICKUP = "https://www.apple.com/shop/shipping-pickup";
const APPLE_PAY = "https://support.apple.com/apple-pay";
const APPLE_STORE_APP = "https://apps.apple.com/us/app/apple-store/id375380948";
const WIKI_APPLE_PAY = "https://en.wikipedia.org/wiki/Apple_Pay";

const n = (x: number) => x.toLocaleString("en-US");
const pct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : `${Math.round(x * 100)}%`);
const longDate = (ymd: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));

/** The reader's own budget, in seconds: push, four taps, and the listing. */
const YOU_SEC = 20;

export async function generateMetadata(): Promise<Metadata> {
  const t = await duoRestockTimes("us");
  const band = t.sellout ? medianBand(t.sellout.medianSec) : "about a minute";
  const description = `Stage Apple's checkout before the restock, then the alert leaves four taps: Pickup, the store, the first slot, Apple Pay. A typical iPhone Duo listing lasts ${band}; this takes about ${YOU_SEC} seconds.`;
  return {
    title: { absolute: `${TITLE} · PickupChecker` },
    description,
    alternates: { canonical: PATH },
    openGraph: { type: "article", siteName: "PickupChecker", title: TITLE, description, url: PATH },
  };
}

/** A keyword line on a step card; `plain` is the sentence the HowTo schema carries. */
type GuidePoint = Point & { plain: string };
interface Step { title: string; points: GuidePoint[]; art: React.ReactNode }

function StepCard({ step, index }: { step: Step; index: number }) {
  return (
    <li id={`step-${index}`} className="pane flex scroll-mt-24 flex-col p-5 sm:p-6">
      <div className="flex items-center gap-3"><span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-[var(--accent-ink)]">{index}</span><h3 className="text-lg font-semibold leading-tight">{step.title}</h3></div>
      <Points items={step.points} className="mt-3" />
      <div className="mt-5 flex flex-1 items-end justify-center pt-8">{step.art}</div>
    </li>
  );
}

/** The four taps as a row of numbered pills. */
function TapFlow({ taps }: { taps: string[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2" aria-label="The four taps">
      {taps.map((t, i) => (
        <li key={t} className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-line-2 bg-[var(--pane-solid)] py-1 pl-1 pr-3.5 text-sm font-semibold text-ink">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-[var(--accent-ink)]">{i + 1}</span>{t}
          </span>
          {i < taps.length - 1 && <span aria-hidden className="text-ink-3">→</span>}
        </li>
      ))}
    </ol>
  );
}

export default async function GrabRestockGuide() {
  const [t, f] = await Promise.all([duoRestockTimes("us"), siteFacts()]);
  const facts = emptyFacts();
  const sell = t.sellout;
  const band = sell ? medianBand(sell.medianSec) : "about a minute";
  /** "in the 60–80 seconds before it sells out" / "in the minute before it sells out". */
  const h1Band = sell ? medianBand(sell.medianSec) : "minute";
  const w = busiestWindow(t.byHour);
  const window = rangeLabel(w.from, w.to);
  const pattern = t.peakHour != null;
  const ds = f.duoSellout;
  const top = t.byPart[0];
  const topItem = top ? PART_INDEX.get(top.partNumber) : undefined;
  const topName = topItem ? `${topItem.storage} ${topItem.color}` : "512GB Star White";
  const topShare = top && t.n ? top.restocks / t.n : 0;
  const alert = alertHref({ model: "duo" });
  const reserveAt = SPEED.alertSec + YOU_SEC;
  const budget = [
    { label: "Confirmed → push", sec: SPEED.alertSec, tone: "bg-ink/25" },
    { label: "You: four taps", sec: YOU_SEC, tone: "bg-accent" },
    { label: sell ? `Typical listing: ${sell.medianSec} s` : "Typical listing", sec: sell ? Math.max(sell.medianSec - YOU_SEC - SPEED.alertSec, 10) : 60, tone: "bg-ink/10" },
  ];
  const total = budget.reduce((a, b) => a + b.sec, 0);
  const taps = ["Pickup – In-Store", "The store it named", "First slot", "Apple Pay"];

  const before: Step[] = [
    {
      title: "Find your window",
      points: [
        pattern
          ? { text: <><b className="text-ink">{pct(w.share)}</b> of US Duo restocks land <b className="text-ink">{window}</b>, store local time</>, plain: `${pct(w.share)} of US iPhone Duo restocks land ${window} in the store's local time` }
          : { text: <>The hour pattern is on every store page</>, plain: "The hour pattern is on every store page" },
        { text: <>Members: <Link href="/account#restock-times" className="underline underline-offset-2">your stores&apos; own hours</Link></>, plain: "Members see their own stores' hours on the dashboard" },
        { text: <>Be staged <b className="text-ink">10 minutes early</b></>, plain: "Be staged ten minutes before the window opens" },
      ],
      art: <RestockWindowMock />,
    },
    {
      title: "Stage the checkout",
      points: [
        { text: <><a href={APPLE_STORE_APP} target="_blank" rel="noopener" className="underline underline-offset-2">Apple Store app</a> · exact <b className="text-ink">storage + colour</b></>, plain: "In the Apple Store app choose the exact storage and colour" },
        { text: <>Through to <b className="text-ink">Delivery &amp; Pickup</b> · ZIP and <a href={APPLE_PAY} target="_blank" rel="noopener" className="underline underline-offset-2">Apple Pay</a> set</>, plain: "Go as far as the Delivery & Pickup sheet with ZIP, address and Apple Pay set" },
        { text: <>Leave delivery selected · <b className="text-ink">stay on this sheet</b></>, plain: "Leave delivery selected and stay on this sheet" },
      ],
      art: <CheckoutSheetMock />,
    },
    {
      title: "Tick terms · keep it awake",
      points: [
        { text: <>Carrier or financing? Tick <b className="text-ink">I agree</b> now</>, plain: "If you chose a carrier plan or financing, tick I agree to the above terms now" },
        { text: <>Better: <b className="text-ink">Unlocked, paid in full</b> → no box at all</>, plain: "Unlocked and paid in full has no agreement box" },
        { text: <>Auto-Lock → <b className="text-ink">Never</b> · touch the sheet every 10–15 min</>, plain: "Set Auto-Lock to Never for the window and touch the sheet every 10–15 minutes" },
      ],
      art: <TermsMock />,
    },
  ];
  const during: Step[] = [
    {
      title: "Read it, don't tap it",
      points: [
        { text: <>Push lands <b className="text-ink">~{SPEED.alertSec} s</b> after two matching checks</>, plain: `The push arrives about ${SPEED.alertSec} seconds after two matching checks` },
        { text: <>Tapping it = Safari + a fresh checkout</>, plain: "Tapping the notification opens apple.com in Safari, a fresh checkout", no: true },
        { text: <>Read the <b className="text-ink">store name</b> → swipe to the app</>, plain: "Read the store name and swipe back to the Apple Store app" },
      ],
      art: <AlertBannerMock />,
    },
    {
      title: "Pickup → the store named",
      points: [
        { text: <>Tap <b className="text-ink">Pickup – In-Store</b></>, plain: "Tap Pickup – In-Store on the sheet" },
        { text: <><b className="text-ink">Available Today</b> → tap it</>, plain: "Tap the store the alert named, showing Available Today" },
        { text: <>Still unavailable? Back → Pickup again</>, plain: "If the row still reads unavailable, back out and tap Pickup again" },
      ],
      art: <StorePickMock />,
    },
    {
      title: "First slot",
      points: [
        { text: <>Take the <b className="text-ink">first time</b> offered</>, plain: "Take the first pickup time Apple offers" },
        { text: <>Every slot = the same phone</>, plain: "Every slot is the same phone" },
        { text: ds ? <><b className="text-ink">{pct(ds.within30)}</b> of last week&apos;s restocks gone within 30 s</> : <>Some restocks are gone within 30 s</>, plain: ds ? `${pct(ds.within30)} of last week's Duo restocks were gone within 30 seconds` : "Some restocks are gone within 30 seconds" },
      ],
      art: <TimeSlotMock />,
    },
    {
      title: "Apple Pay · done",
      points: [
        { text: <>Double-click · Face ID · <b className="text-ink">reserved</b></>, plain: "Double-click the side button, Face ID, and the order is placed" },
        { text: <>Face ID missed? Passcode, <b className="text-ink">not</b> a re-tap</>, plain: "If Face ID misses, type the passcode; do not re-tap the pay button" },
        { text: <>Bring the QR code + photo ID</>, plain: "Bring the order's QR code and a photo ID to the store" },
      ],
      art: <AutoLockMock />,
    },
  ];
  const steps = [...before, ...during];

  const wrong: [string, string][] = [
    ["Sheet reset · terms un-ticked", "Rebuild now · touch it every 10–15 min"],
    ["Pickup still says unavailable", "Back → tap Pickup again (fresh query)"],
    ["Slot gone", "Next slot · none? wait for the next alert"],
    ["Face ID missed", "Passcode · never re-tap Pay"],
    ["Alert names another colour", "Decide now · ~10 s to change on the sheet"],
  ];

  const faq: Faq[] = [
    { q: "Does this work on apple.com in Safari, or on a Mac?", a: "Yes: the same Delivery & Pickup sheet exists on apple.com, so stage it in Safari on an iPhone, iPad or a Mac with Apple Pay. A second device with its own staged checkout is a reasonable backup, so long as you complete only one order." },
    { q: "Carrier plan or unlocked?", a: "Unlocked, paid in full, is the fewest taps and the fewest things that can fail at the last second: no carrier agreement to tick, no eligibility check. A carrier plan works, but tick the agreement before the window and expect to tick it again if the sheet reloads." },
    { q: "What if the alert is for a different storage or color than I staged?", a: `Changing the configuration on the sheet costs about ten seconds, so decide now whether you would take it. Stage the configuration that restocks most${topShare ? ` (${topName}, ${pct(topShare)} of US Duo restocks since ${longDate(t.since)})` : ""} and set alerts for exactly that configuration at two or three stores ([which configuration restocks most](/which-iphone-duo-restocks-most)).` },
    { q: "Two stores restocked at once — which do I pick?", a: "The nearer one, without thinking: a reservation is only useful at a store you will reach in the pickup window. Set alerts only at stores you can get to, and the question rarely comes up." },
    { q: "Can PickupChecker reserve it for me?", a: `No, and nothing legitimate can: PickupChecker tells you within seconds that a store lists your configuration, and the reservation is yours to make on apple.com. PickupChecker is independent and not affiliated with Apple; it reads the same pickup availability anyone can see, every ${SPEED.fastSec} seconds for the stores your alerts point at.` },
  ];
  const sources: Source[] = [
    { label: "Apple: Delivery and Pickup (how in-store pickup and the hold work)", url: APPLE_PICKUP },
    { label: "Apple Support: Apple Pay (paying with Face ID)", url: APPLE_PAY },
    { label: "App Store: Apple Store app", url: APPLE_STORE_APP },
    { label: "Wikipedia: Apple Pay", url: WIKI_APPLE_PAY },
  ];

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${SITE}${PATH}`, url: `${SITE}${PATH}`, name: TITLE, isPartOf: { "@id": `${SITE}/#website` }, about: { "@id": `${SITE}/#organization` }, dateModified: t.at },
      {
        "@type": "HowTo", name: "How to reserve an iPhone Duo restock for Apple Store pickup in about 20 seconds", totalTime: "PT20S",
        description: `Stage Apple's checkout on the exact configuration before the restock window, then answer the alert with four taps: Pickup – In-Store, the store the alert named, the first time slot, Apple Pay. A typical iPhone Duo listing lasts ${band}.`,
        supply: [{ "@type": "HowToSupply", name: "Apple Store app or apple.com, signed in, with Apple Pay set up" }, { "@type": "HowToSupply", name: "A PickupChecker alert for the configuration at the stores you can reach" }],
        step: steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.title, text: s.points.map((p) => (p.no ? `Do not: ${p.plain}` : p.plain)).join(". ") + ".", url: `${SITE}${PATH}#step-${i + 1}` })),
      },
    ],
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:pt-12">
      <JsonLd data={ld} />

      {/* hero */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="eyebrow mb-4">Pickup playbook · about {YOU_SEC} seconds</div>
          <h1 className="display text-4xl sm:text-6xl">How do you reserve an iPhone Duo in the {h1Band} before it sells out?</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-2"><b className="text-ink">Stage Apple&apos;s checkout before the restock.</b> The alert then leaves four taps.</p>
          <div className="mt-5"><TapFlow taps={taps} /></div>
          {sell && <p className="mt-5 max-w-xl text-sm text-ink-3">Half of the {n(sell.n)} timed US restocks were gone within <b className="text-ink">{sell.medianSec} s</b>. This takes about <b className="text-ink">{YOU_SEC}</b>.</p>}
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#before" className="btn btn-primary btn-lg">See the steps</a>
            <Link href={alert} className="btn btn-ghost btn-lg">Set up an alert</Link>
          </div>
        </div>
        <div className="mx-auto w-full max-w-sm"><CheckoutSheetMock /></div>
      </section>

      {/* budget */}
      <section className="pane mt-14 p-6 sm:p-8" aria-labelledby="budget-h">
        <h2 id="budget-h" className="display text-2xl sm:text-4xl">How much time do you actually have?</h2>
        <p className="mt-3 text-ink-2"><b className="text-ink">{sell ? `About ${band}.` : "About a minute."}</b> {sell ? <>Median of {n(sell.n)} timed US restocks since {longDate(t.since)}; {pct(sell.within2min)} were gone within two minutes.</> : <>By every restock we have timed.</>}</p>
        <StatGrid cols={3} className="mt-5">
          <Stat value={`${SPEED.alertSec}`} unit="s" label="Confirmed → push on your phone" />
          <Stat value={`${YOU_SEC}`} unit="s" label="You: the four taps, practised" tone="accent" />
          <Stat value={sell ? `${sell.medianSec}` : "~60"} unit="s" label="Typical listing, listed to gone" />
        </StatGrid>
        <div className="mt-5 flex h-10 w-full overflow-hidden rounded-full border border-line-2" role="img" aria-label={budget.map((b) => `${b.label}: ${b.sec} seconds`).join("; ")}>
          {budget.map((b) => <div key={b.label} className={`${b.tone} flex items-center justify-center px-2 text-[11px] font-semibold text-ink`} style={{ width: `${(b.sec / total) * 100}%` }} title={`${b.label}: ${b.sec} s`}><span className="truncate">{b.sec} s</span></div>)}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-3">{budget.map((b) => <span key={b.label} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-sm ${b.tone}`} />{b.label}</span>)}</div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2 text-sm text-ink-2"><Do /><span>Start from the staged sheet → reserving at <b className="text-ink">second {reserveAt}</b>{ds ? <>, ahead of <b className="text-ink">~{pct(1 - ds.within30)}</b> of last week&apos;s sell-outs</> : null}</span></div>
          <div className="flex items-start gap-2 text-sm text-ink-3"><Dont /><span>Start from the app&apos;s home screen → model, storage, colour, address → <b>second 90</b>, gone</span></div>
        </div>
        <p className="mt-4 text-xs text-ink-3">Lifetimes are measured between two of our checks ({SPEED.fastSec} s apart at stores with alerts), so they are upper bounds. <Link href="/iphone-duo-sell-out-times" className="underline-offset-2 hover:underline">Every restock with the seconds it lasted</Link>.</p>
      </section>

      {/* steps: before */}
      <section id="before" className="mt-16 scroll-mt-24">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 className="display text-2xl sm:text-4xl">Before the window</h2>
          <span className="text-sm text-ink-3">Three things · 10 minutes before your stores&apos; hour</span>
        </div>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {before.map((s, i) => <StepCard key={s.title} step={s} index={i + 1} />)}
        </ol>
      </section>

      {/* steps: during */}
      <section id="during" className="mt-14 scroll-mt-24">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 className="display text-2xl sm:text-4xl">When the alert comes</h2>
          <span className="text-sm text-ink-3">Four taps · nothing else until Apple&apos;s confirmation is on screen</span>
        </div>
        <ol className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {during.map((s, i) => <StepCard key={s.title} step={s} index={before.length + i + 1} />)}
        </ol>
      </section>

      {/* our view */}
      <section className="mt-16 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="pane p-6 sm:p-8">
          <h2 className="display text-2xl sm:text-3xl">Where we would tighten it</h2>
          <p className="mt-2 text-sm text-ink-2">The shape is right: stage everything, leave four taps. Three swaps take the most seconds off it.</p>
          <ol className="mt-5 grid gap-3 sm:grid-cols-3">
            <Swap no="Carrier plan + installments" yes="Unlocked, paid in full" why="No agreement box, no eligibility check at the finish line." />
            <Swap no="Tap the notification" yes="Read it, swipe to the app" why="The push opens apple.com in Safari from scratch; the staged sheet lives in the app." />
            <Swap no="Stage any configuration" yes="Stage the one your alerts are on" why={topShare ? <>{topName} is {pct(topShare)} of US Duo restocks; a mismatch costs ~10 s.</> : <>Alerts on the staged configuration, at two or three stores; a mismatch costs ~10 s.</>} />
          </ol>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="chip chip-sm pointer-events-none">Also: Auto-Lock → Never (saves 3–4 s)</span>
            <span className="chip chip-sm pointer-events-none">Second device staged as backup · complete one order</span>
          </div>
        </div>
        <div className="pane p-6 sm:p-8">
          <h2 className="display text-2xl sm:text-3xl">Where it goes wrong</h2>
          <table className="mt-4 w-full text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wide text-ink-3"><th className="pb-2 font-semibold">If…</th><th className="pb-2 font-semibold">Do…</th></tr></thead>
            <tbody>
              {wrong.map(([a, b]) => (
                <tr key={a} className="border-t border-line align-top">
                  <td className="py-2.5 pr-3 text-ink-3">{a}</td>
                  <td className="py-2.5 font-medium text-ink">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* faster? */}
      <section className="pane mt-6 p-6 sm:p-8">
        <h2 className="display text-2xl sm:text-3xl">Is there anything faster?</h2>
        <p className="mt-2 text-sm text-ink-2"><b className="text-ink">For a person, not really.</b> The earliest honest signal is the push; the rest is practice.</p>
        <StatGrid cols={3} className="mt-5">
          <Stat value="8–12" unit="s" label="Human floor: push + four taps, eyes already on the sheet" />
          <Stat value={`~${YOU_SEC}`} unit="s" label="This guide, after one practice run" tone="accent" />
          <Stat value="✗" label="Scripts that order for you: break Apple's terms, risk the account. Not built here." tone="muted" />
        </StatGrid>
        <ul className="mt-5 grid gap-2 text-sm text-ink-2 sm:grid-cols-2">
          <li className="flex items-start gap-2"><Do /><span>Stores your alerts point at: checked every <b className="text-ink">{SPEED.fastSec} seconds</b></span></li>
          <li className="flex items-start gap-2"><Do /><span>First &quot;available&quot;: asked again ~1 s later → push ~{SPEED.alertSec} s after the match</span></li>
          {ds && <li className="flex items-start gap-2 text-ink-3"><Dont /><span>A tracker checking once a minute sees <b>{pct(ds.caught.m1)}</b> of Duo restocks; every 5 minutes, <b>{pct(ds.caught.m5)}</b></span></li>}
          <li className="flex items-start gap-2"><Do /><span>Against a listing that lasts {band}: {YOU_SEC} practised seconds win</span></li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-3"><Link href={alert} className="btn btn-primary">Set up an alert</Link><Link href="/account#restock-times" className="btn btn-ghost">Your stores&apos; restock window</Link><Link href="/how-to-get-an-iphone-duo" className="btn btn-ghost">The wider plan</Link></div>
      </section>

      <div className="mx-auto mt-10 max-w-3xl"><Figure id="phone-card-payment" /></div>
      <div className="mx-auto mt-10 max-w-3xl"><RichFaq items={faq} facts={facts} title="Questions" /></div>
      <div className="mx-auto mt-8 max-w-3xl"><SourceList sources={sources} facts={facts} where={`all ${STORES.length} US Apple Stores`} since={longDate(TRACKING_SINCE_US)} /></div>
    </div>
  );
}
