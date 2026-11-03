/**
 * /how-to-grab-an-iphone-duo-restock: the 20-second checkout. Everything except the last four taps is done
 * before the restock — Apple's checkout staged on the exact configuration, kept open through the hour the
 * reader's stores usually restock — so the push leaves Pickup, the store, the first slot and Apple Pay. The
 * method is the one PickupChecker's owner uses by hand; the page says where we agree and where we tighten it.
 * Illustrations are hand-drawn (CheckoutMocks), never Apple's screens; every number is live.
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

interface Step { title: string; text: React.ReactNode; art: React.ReactNode }

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
  const budget = [
    { label: "Confirmed → push", sec: SPEED.alertSec, tone: "bg-ink/25" },
    { label: "You: four taps", sec: YOU_SEC, tone: "bg-accent" },
    { label: sell ? `Median listing: ${sell.medianSec} s` : "Median listing", sec: sell ? Math.max(sell.medianSec - YOU_SEC - SPEED.alertSec, 10) : 60, tone: "bg-ink/10" },
  ];
  const total = budget.reduce((a, b) => a + b.sec, 0);

  const before: Step[] = [
    {
      title: "Find your window",
      text: <>Apple restocks pickup stock in bursts, mostly in the morning: {pattern ? <><b>{pct(w.share)} of the {n(t.n)} confirmed US iPhone Duo restocks since {longDate(t.since)} landed between {window}</b> in the store&apos;s local time.</> : <>the hour pattern for every store is on its page.</>} Members see their own stores&apos; hours on the dashboard (<Link href="/account#restock-times">When your stores restock</Link>); everyone else can read a store page or <Link href="/iphone-duo-restock-times">the national table</Link>. Plan to be staged ten minutes before the window opens.</>,
      art: <RestockWindowMock />,
    },
    {
      title: "Stage the checkout",
      text: <>In the <a href={APPLE_STORE_APP} target="_blank" rel="noopener">Apple Store app</a> (or apple.com in Safari), choose the exact iPhone Duo you want — storage and color — and go as far as the <b>Delivery &amp; Pickup</b> sheet with your ZIP, address and <a href={APPLE_PAY} target="_blank" rel="noopener">Apple Pay</a> already set. Leave delivery selected; that is as far as the sheet goes without stock. Stay on this screen. You are now one tap from the pickup list.</>,
      art: <CheckoutSheetMock />,
    },
    {
      title: "Tick the terms, keep it awake",
      text: <>If you chose a carrier plan or financing, tick <b>I agree to the above terms</b> now; it is the one box that un-ticks itself when the sheet reloads. Our preference is <b>Unlocked, paid in full</b>: no agreement, no credit check at the finish line. Then Settings → Display &amp; Brightness → Auto-Lock → <b>Never</b> for the window, and touch the sheet every 10–15 minutes: left idle, Apple sends you back to the bag and you rebuild from scratch.</>,
      art: <TermsMock />,
    },
  ];
  const during: Step[] = [
    {
      title: "Read the alert, don't tap it",
      text: <>The push arrives about <b>{SPEED.alertSec} seconds</b> after two checks a second apart both saw the listing. It names the store and the configuration. <b>Read it; do not tap it.</b> Tapping opens apple.com in Safari from the product page — a fresh checkout, 60 seconds you do not have. Your staged sheet is in the app, one swipe away.</>,
      art: <AlertBannerMock />,
    },
    {
      title: "Tap Pickup, pick the store",
      text: <>On the sheet, tap <b>Pickup – In-Store</b>. The list of stores near your ZIP opens and the store the alert named shows <b>Available Today</b>; tap it. The sheet shows the state at the moment it loaded, so if the row still reads unavailable, back out and tap Pickup again — we only alert after two matching answers, so the listing is real.</>,
      art: <StorePickMock />,
    },
    {
      title: "First slot",
      text: <>Take the first pickup time Apple offers. Every slot is the same phone; the only difference between the first and the third is the five seconds you spent reading them, and <b>{ds ? `${pct(ds.within30)} of last week's Duo restocks were gone within 30 seconds` : "some restocks are gone within 30 seconds"}</b>.</>,
      art: <TimeSlotMock />,
    },
    {
      title: "Apple Pay, done",
      text: <>Double-click the side button, Face ID, and the order is placed: Apple holds that phone for you at that store and emails the pickup window ({""}<a href={APPLE_PICKUP} target="_blank" rel="noopener">Apple: Delivery and Pickup</a>). Bring the order&apos;s QR code and a photo ID. If Face ID misses, type the passcode; do not re-tap the button.</>,
      art: <AutoLockMock />,
    },
  ];

  const faq: Faq[] = [
    { q: "Does this work on apple.com in Safari, or on a Mac?", a: "Yes. The same Delivery & Pickup sheet exists on apple.com; stage it in Safari on an iPhone, iPad or a Mac with Apple Pay (Touch ID or an iPhone to confirm). A second device with its own staged checkout is a reasonable backup, so long as you only complete one order." },
    { q: "Carrier plan or unlocked?", a: "Unlocked, paid in full, is the fewest taps and the fewest things that can fail at the last second: no carrier agreement to tick, no eligibility check. Financing without a carrier (Apple Card Monthly Installments) sits in between. A carrier plan works — it is how this method was first used — but tick the agreement before the window and expect to tick it again if the sheet reloads." },
    { q: "What if the alert is for a different storage or color than I staged?", a: `Changing the configuration on the sheet costs about ten seconds, which is often still fast enough, but decide now whether you would take it. Our advice: stage the configuration that restocks most${topShare ? ` (${topName}, ${pct(topShare)} of US Duo restocks since ${longDate(t.since)})` : ""} if you would keep it, and set alerts for exactly that configuration at two or three stores ([which configuration restocks most](/which-iphone-duo-restocks-most)).` },
    { q: "Two stores restocked at once — which do I pick?", a: "The nearer one, without thinking: the list already shows both as Available Today, and a reservation is only useful at a store you will reach in the pickup window. Set alerts only at stores you can get to, and the question rarely comes up." },
    { q: "Can PickupChecker reserve it for me?", a: `No, and nothing legitimate can. PickupChecker tells you within seconds that a store lists your configuration; the reservation is yours to make on apple.com. PickupChecker is independent and not affiliated with Apple; it reads the same pickup availability anyone can see, every ${SPEED.fastSec} seconds for the stores your alerts point at.` },
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
        step: [...before, ...during].map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.title, url: `${SITE}${PATH}#step-${i + 1}` })),
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
          <p className="mt-5 max-w-xl text-lg text-ink-2">
            By doing everything except the last four taps before the restock. Stage Apple&apos;s checkout on the configuration you want, keep it open through the hour your stores usually restock, and when the push arrives — about {SPEED.alertSec} seconds after we confirm the listing — tap <b className="text-ink">Pickup</b>, <b className="text-ink">the store it named</b>, <b className="text-ink">the first slot</b> and <b className="text-ink">Apple Pay</b>.
            {sell && <> Half of the {n(sell.n)} iPhone Duo restocks we have timed sold out within {sell.medianSec} seconds; this takes about {YOU_SEC}.</>}
          </p>
          <p className="mt-4 max-w-xl text-sm text-ink-3">This is the method PickupChecker&apos;s owner uses by hand. Below is where we agree with it, and the three places we would tighten it.</p>
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
        <p className="mt-3 max-w-3xl text-ink-2">
          <b className="text-ink">{sell ? `About ${band}: half of the ${n(sell.n)} timed US restocks since ${longDate(t.since)} were gone within ${sell.medianSec} seconds, ${pct(sell.within2min)} within two minutes.` : "About a minute, by every restock we have timed."}</b> The push reaches you about {SPEED.alertSec} seconds after the listing is confirmed. If your {YOU_SEC} seconds start then, you are reserving around second {SPEED.alertSec + YOU_SEC}{ds ? `, ahead of roughly ${pct(1 - ds.within30)} of last week's sell-outs` : ""}. If instead you start by opening the app, finding the model, choosing storage and color and typing an address, you are at second ninety and the phone is gone.
        </p>
        <div className="mt-6 flex h-10 w-full overflow-hidden rounded-full border border-line-2" role="img" aria-label={budget.map((b) => `${b.label}: ${b.sec} seconds`).join("; ")}>
          {budget.map((b) => <div key={b.label} className={`${b.tone} flex items-center justify-center px-2 text-[11px] font-semibold text-ink`} style={{ width: `${(b.sec / total) * 100}%` }} title={`${b.label}: ${b.sec} s`}><span className="truncate">{b.sec} s</span></div>)}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-3">{budget.map((b) => <span key={b.label} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-sm ${b.tone}`} />{b.label}</span>)}</div>
        <p className="mt-4 text-sm text-ink-3">Every lifetime is measured between two of our checks ({SPEED.fastSec} s apart at stores with alerts), so it is an upper bound: the real margin is a little smaller than the bar. <Link href="/iphone-duo-sell-out-times" className="underline-offset-2 hover:underline">Every restock with the seconds it lasted</Link>.</p>
      </section>

      {/* steps: before */}
      <section id="before" className="mt-16 scroll-mt-24">
        <h2 className="display text-2xl sm:text-4xl">Before the window: stage the checkout</h2>
        <p className="mt-2 max-w-3xl text-ink-2">Three things, ten minutes before your stores&apos; usual hour. Done right, the alert will find you one tap from the pickup list.</p>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {before.map((s, i) => (
            <li key={s.title} id={`step-${i + 1}`} className="pane flex scroll-mt-24 flex-col p-5 sm:p-6">
              <div className="flex items-center gap-3"><span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-[var(--accent-ink)]">{i + 1}</span><h3 className="text-lg font-semibold">{s.title}</h3></div>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{s.text}</p>
              <div className="mt-5 flex flex-1 items-end justify-center pt-8">{s.art}</div>
            </li>
          ))}
        </ol>
      </section>

      {/* steps: during */}
      <section id="during" className="mt-14 scroll-mt-24">
        <h2 className="display text-2xl sm:text-4xl">When the alert comes: four taps</h2>
        <p className="mt-2 max-w-3xl text-ink-2">Pickup, store, slot, pay. Nothing else is worth a tap until Apple&apos;s confirmation is on the screen.</p>
        <ol className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {during.map((s, i) => (
            <li key={s.title} id={`step-${before.length + i + 1}`} className="pane flex scroll-mt-24 flex-col p-5 sm:p-6">
              <div className="flex items-center gap-3"><span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-[var(--accent-ink)]">{before.length + i + 1}</span><h3 className="text-lg font-semibold">{s.title}</h3></div>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{s.text}</p>
              <div className="mt-5 flex flex-1 items-end justify-center pt-8">{s.art}</div>
            </li>
          ))}
        </ol>
      </section>

      {/* our view */}
      <section className="mt-16 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="pane p-6 sm:p-8">
          <h2 className="display text-2xl sm:text-3xl">Where we would tighten it</h2>
          <p className="mt-3 text-sm text-ink-2"><b className="text-ink">The owner&apos;s method is right in its shape — stage everything, leave four taps — and these are the three changes that take the most seconds off it.</b></p>
          <ol className="mt-4 space-y-3 text-sm leading-relaxed text-ink-2">
            <li><b className="text-ink">Unlocked and paid in full.</b> The original run used a carrier plan with monthly installments: one more agreement box, one eligibility check, and both happen at the end. Unlocked at full price has neither. If you need financing, Apple Card Monthly Installments without a carrier keeps the agreement out of the critical path.</li>
            <li><b className="text-ink">Never tap the notification.</b> Its link opens the product page on apple.com in Safari, which is a fresh checkout. The staged sheet lives in the Apple Store app; the alert is a signal, the app is the tool. Read the store name, swipe to the app.</li>
            <li><b className="text-ink">Stage the configuration the alerts are for.</b> {topShare ? <>{topName} is {pct(topShare)} of US Duo restocks since {longDate(t.since)}; if you would keep it, stage it and put your alerts on it at two or three stores, so the alert and the sheet always match.</> : <>Put your alerts on the configuration you staged, at two or three stores, so the alert and the sheet always match.</>} A mismatch costs ten seconds of changing the color on the sheet — survivable, but why.</li>
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-ink-2">Two smaller ones: Auto-Lock → Never for the window, because an unlock and an app switch are three or four seconds you can delete; and a second staged device (an iPad or a Mac with Apple Pay) as a backup if the first sheet has reset. Complete one order.</p>
        </div>
        <div className="pane p-6 sm:p-8">
          <h2 className="display text-2xl sm:text-3xl">Where it goes wrong</h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-2">
            <li><b className="text-ink">The sheet reset.</b> Idle too long and Apple returns you to the bag; the terms box un-ticks. Touch the sheet every 10–15 minutes during the window; rebuild it the moment you notice.</li>
            <li><b className="text-ink">Pickup still says unavailable.</b> The sheet shows the state when it loaded. Back out, tap Pickup – In-Store again; it asks apple.com afresh. We alert only after two matching answers about a second apart, so the listing was real when the push went out.</li>
            <li><b className="text-ink">The slot is gone.</b> Someone reserved it between the push and your tap. Take the next slot; if none, the store is sold out — wait for the next alert, do not rebuild anything.</li>
            <li><b className="text-ink">Face ID missed.</b> Type the passcode. Re-tapping the pay button is how people place nothing twice.</li>
            <li><b className="text-ink">Wrong color in the alert.</b> Decide now, not then, whether you would take the other color; changing it on the sheet is about ten seconds.</li>
          </ul>
        </div>
      </section>

      {/* faster? */}
      <section className="pane mt-6 p-6 sm:p-8">
        <h2 className="display text-2xl sm:text-3xl">Is there anything faster?</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-2">
          <b className="text-ink">For a person, not really: the floor is the push plus four taps, about eight to twelve seconds if you are already looking at the sheet.</b> The only thing faster is a script that places the order for you, and that breaks Apple&apos;s terms, risks the account, and is not something we build or recommend. What we do instead is make the signal as early as it can honestly be: every store your alerts point at is asked every {SPEED.fastSec} seconds, a first &quot;available&quot; is asked again about a second later, and the push goes out about {SPEED.alertSec} seconds after the second answer agrees. {ds ? <>Over the last 7 days a tracker checking every minute would have seen about {pct(ds.caught.m1)} of Duo restocks at all, one checking every 5 minutes about {pct(ds.caught.m5)}.</> : null} Against a listing that lasts {band}, {YOU_SEC} seconds of practised taps is the fastest legitimate way through, and this page is the practice.
        </p>
        <p className="mt-4 text-sm text-ink-3">The wider plan — which stores, which configurations, delivery versus pickup — is on <Link href="/how-to-get-an-iphone-duo" className="underline-offset-2 hover:underline">How to get an iPhone Duo when it is sold out everywhere</Link>; how alerts work on <Link href="/iphone-duo-stock-alerts" className="underline-offset-2 hover:underline">iPhone Duo stock alerts</Link>.</p>
        <div className="mt-6 flex flex-wrap gap-3"><Link href={alert} className="btn btn-primary">Set up an alert</Link><Link href="/account#restock-times" className="btn btn-ghost">Your stores&apos; restock window</Link></div>
      </section>

      <div className="mx-auto mt-10 max-w-3xl"><Figure id="phone-card-payment" /></div>
      <div className="mx-auto mt-10 max-w-3xl"><RichFaq items={faq} facts={facts} title="Questions" /></div>
      <div className="mx-auto mt-8 max-w-3xl"><SourceList sources={sources} facts={facts} where={`all ${STORES.length} US Apple Stores`} since={longDate(TRACKING_SINCE_US)} /></div>
    </div>
  );
}
