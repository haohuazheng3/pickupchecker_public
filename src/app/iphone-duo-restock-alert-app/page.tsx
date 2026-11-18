/**
 * /iphone-duo-restock-alert-app: "Is there an app that alerts me when the iPhone Duo is back in stock?" — the question
 * ChatGPT answered without us in the 2026-11-18 test (docs/research.md §9), added on the owner's go-ahead the same day.
 * The answer is yes, and the page says which one, how it is installed (a Home Screen web app, no App Store), what
 * Apple's own app does and does not do, what the other trackers state about their alerts, and how fast ours arrive —
 * plan next to measurement, as on /iphone-duo-stock-alerts (which covers alerts in general; this page is the app).
 * Every H2 is a question with an answer-first sentence; every number is live; other trackers are quoted as their own
 * claims with the date read.
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
import { ALL_STORES, STORES } from "@/lib/apple/catalog";
import { INTL_CODES } from "@/lib/apple/countries";
import { PLANS, SPEED } from "@/lib/plans";
import { TRACKING_SINCE_US, siteFacts } from "@/lib/content/siteFacts";
import { medianBand } from "@/lib/stock/sellouts";
import { alertHref } from "@/lib/seo/enrich";
import { Measured, Points, Stat, StatGrid, StepStrip, Swap } from "@/components/ui/Viz";
import { serviceStats, secs } from "@/lib/content/serviceStats";
import { count } from "@/lib/content/serviceCopy";
import { OTHER_TRACKER_CLAIMS, TRACKERS_READ_LABEL } from "@/lib/content/trackers";

export const dynamic = "force-dynamic";

const SITE = "https://pickupchecker.com";
const PATH = "/iphone-duo-restock-alert-app";
const TITLE = "iPhone Duo Restock Alert App: Notified When It's Back";
const DESCRIPTION = `Yes, there is an app: add PickupChecker to your Home Screen and get a push when your Apple Store restocks the iPhone Duo. Stores checked every ${SPEED.fastSec} s; no App Store download.`;
const WEBKIT_PUSH = "https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/";
const WEB_PUSH = "https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers";
const APPLE_PICKUP = "https://www.apple.com/shop/shipping-pickup";
const WIKI_PWA = "https://en.wikipedia.org/wiki/Progressive_web_app";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} · PickupChecker` },
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { type: "article", siteName: "PickupChecker", title: TITLE, description: DESCRIPTION, url: PATH },
};

const n = (x: number) => x.toLocaleString("en-US");
const longDate = (ymd: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
const pct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : `${Math.round(x * 100)}%`);

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
function LinkRow({ links, className = "mt-4" }: { links: { label: string; href: string }[]; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {links.map((l) => <Link key={l.href} href={l.href} className="chip chip-sm">{l.label}</Link>)}
    </div>
  );
}

export default async function RestockAlertApp() {
  const [f, facts, st] = await Promise.all([siteFacts(), getFacts(), serviceStats()]);
  const us7 = st.lanes["7d"]["fast-us"], push7 = st.delivery["7d"].push;
  const ds = f.duoSellout; // iPhone Duo restocks of the last 7 days that sold out
  const typical = ds ? `about ${medianBand(ds.medianSec)}` : "about a minute";
  const intl = ALL_STORES.length - STORES.length;
  const setupHref = alertHref({ model: "duo" });

  const heroLead = `Yes: **PickupChecker** is an iPhone Duo restock alert app you add to your Home Screen from Safari, with no App Store download. It asks the Apple Stores you pick every **${SPEED.fastSec} seconds** and sends a push ${push7 ? `a median **${secs(push7.p50Sec)}** after the first check that saw the restock (last 7 days)` : `about ${SPEED.alertSec} seconds after a restock is confirmed`}. Apple's own Apple Store app has no back-in-stock alert for pickup.`;
  const appleLead = `No: the Apple Store app and apple.com show which stores have your configuration for pickup **when you look**, but neither offers a "notify me" for an iPhone at a store, and a typical Duo restock is gone in **${typical}**${ds ? ` (median of ${n(ds.n)} restocks, last 7 days)` : ""}, so looking by hand mostly finds "unavailable".`;
  const howLead = `You pick the exact iPhone Duo (storage and color) and the stores you can reach; from then on each of those stores is asked every **${SPEED.fastSec} seconds**, a first "available" is asked again about a second later, and when both answers agree the push goes to your phone naming the store and the configuration.`;
  const installLead = `On iPhone, open pickupchecker.com in **Safari**, tap Share → **Add to Home Screen**, open the new icon and allow notifications: Apple lets Home Screen web apps send push on **iOS and iPadOS 16.4 or later** ([WebKit](${WEBKIT_PUSH})). On Android, Chrome's **Install app**; on a computer, any browser that asks to show notifications.`;
  const compareLead = `Several trackers send restock alerts; what differs is how often they check, whether a **phone push** is included and what one alert covers. Below is what each states on its own site (read ${TRACKERS_READ_LABEL}) — claims, not our measurements — next to our plan${us7 ? ` and our measured median of **${secs(us7.p50Sec)}** between checks (US, 7 days)` : ""}.`;
  const speedLead = push7
    ? `Our side is measured: over the last 7 days the push service accepted the alert a median **${secs(push7.p50Sec)}** after the first check that saw a restock (p95 ${secs(push7.p95Sec)}, ${count(push7.events)} restocks). From there it is up to Apple's or Google's push service, your connection and your Focus settings, usually a second or two.`
    : `Our plan is a push about **${SPEED.alertSec} seconds** after a restock is confirmed; the measured figure appears here once a week of alerts is on record. After that it is up to Apple's or Google's push service, your connection and your Focus settings.`;
  const costLead = `Installing the app and browsing live stock are free; alerts need a plan: **$${PLANS.plus.priceUsd}** a month for ${PLANS.plus.limit} alerts (${PLANS.plus.name}), $${PLANS.pro.priceUsd} for ${PLANS.pro.limit} (${PLANS.pro.name}) or $${PLANS.max.priceUsd} for ${PLANS.max.limit} (${PLANS.max.name}). One alert is one Apple Store × one exact configuration.`;
  const needLead = `Only if you are ready to buy within a minute: an alert app moves the race from "noticing" to "checking out", and the second half is yours. Our view, from watching every US Apple Store since ${longDate(TRACKING_SINCE_US)}: **two or three reachable stores, one configuration, checkout staged in advance** beats twenty alerts and a cold wallet.`;

  const platformTable: Block = { t: "table", head: ["Device", "How to install", "Where alerts show"], rows: [
    ["iPhone / iPad (iOS 16.4+)", "Safari → Share → Add to Home Screen, then open it and allow notifications", "Lock Screen, Notification Center, banners — like any app"],
    ["Android", "Chrome → ⋮ → Install app (or Add to Home screen), then allow notifications", "The notification shade"],
    ["Mac / PC", "Open the site in Chrome, Edge, Firefox or Safari and allow notifications", "The system's notifications"],
    ["No device set up", "Nothing to install", "Email from alerts@pickupchecker.com"],
  ], caption: "One account, as many devices as you like: every device you allow gets the push.", source: `Apple's rule for web push on the Home Screen: [WebKit, "Web Push for Web Apps on iOS and iPadOS"](${WEBKIT_PUSH})` };

  const trackerTable: Block = { t: "table", head: ["Tracker", "Alerts by", "Stated check", "Stated price"], rows: [
    ["**PickupChecker**", "push to a Home Screen web app (iPhone, Android, computer); email if no device", `every ${SPEED.fastSec} s at your stores (plan)${us7 ? `; measured median ${secs(us7.p50Sec)}, US, 7 days` : ""}`, `$${PLANS.plus.priceUsd}/mo for ${PLANS.plus.limit} alerts, $${PLANS.pro.priceUsd} for ${PLANS.pro.limit}, $${PLANS.max.priceUsd} for ${PLANS.max.limit}`],
    ...OTHER_TRACKER_CLAIMS.map((t) => [t.name, t.channels, t.interval, t.price]),
  ], caption: `Other trackers' rows quote their own sites, read ${TRACKERS_READ_LABEL}; we have measured no one else's service.`, source: "Each tracker's homepage; ours: the [service report](/service-report)" };

  const faq: Faq[] = [
    { q: "Is PickupChecker in the App Store?", a: `No: it is a web app ([progressive web app](${WIKI_PWA})) that you add to your Home Screen from Safari, and on iOS and iPadOS 16.4 or later it can send push notifications like an App Store app ([Apple Developer](${WEB_PUSH})). Nothing to download, no App Store account needed ([install guide](/install)).` },
    { q: "Why don't my alerts show up after I add it to my Home Screen?", a: "Open the Home Screen icon (not Safari) and allow notifications there: the Home Screen app keeps its own sign-in, separate from Safari, so sign in once more inside it. Then check Settings → Notifications → PickupChecker, and allow it in any Focus you use." },
    { q: "Does Apple have its own iPhone restock alert?", a: `Not for pickup as far as we can find (November 2026): the Apple Store app and apple.com show live pickup availability when you check, and Apple publishes no restock schedule. [Apple: Delivery and Pickup](${APPLE_PICKUP}) explains how pickup availability works.` },
    { q: "Can the app reserve the iPhone Duo for me?", a: "No: it tells you within seconds that a store lists your configuration; you reserve on apple.com with in-store pickup, where Apple holds it for you. PickupChecker is independent and not affiliated with Apple." },
    { q: "Does it work outside the US?", a: `Yes: ${n(intl)} Apple Stores in ${INTL_CODES.length} other countries, with the same ${SPEED.fastSec}-second checks for stores with alerts. Start from a country's page, such as [Canada](/ca), [the UK](/uk), [Australia](/au) or [Japan](/jp).` },
  ];

  const sources: Source[] = [
    { label: "WebKit: Web Push for Web Apps on iOS and iPadOS (Home Screen web apps, iOS 16.4)", url: WEBKIT_PUSH },
    { label: "Apple Developer: Sending web push notifications in web apps and browsers", url: WEB_PUSH },
    { label: "Apple: Delivery and Pickup (how in-store pickup availability works)", url: APPLE_PICKUP },
    { label: "Wikipedia: Progressive web app", url: WIKI_PWA },
  ];

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${SITE}${PATH}`, url: `${SITE}${PATH}`, name: TITLE, description: DESCRIPTION, isPartOf: { "@id": `${SITE}/#website` }, about: { "@id": `${SITE}/#organization` }, dateModified: f.at },
      {
        "@type": "WebApplication", name: "PickupChecker", url: SITE, applicationCategory: "UtilitiesApplication",
        operatingSystem: "iOS 16.4+, iPadOS 16.4+, Android, Windows, macOS (installable web app)", browserRequirements: "Web push notifications",
        description: `iPhone Duo restock alerts: the Apple Stores you pick are checked every ${SPEED.fastSec} seconds, with a push when a restock is confirmed.`,
        offers: { "@type": "AggregateOffer", priceCurrency: "USD", lowPrice: PLANS.plus.priceUsd, highPrice: PLANS.max.priceUsd, offerCount: 3 },
        publisher: { "@id": `${SITE}/#organization` },
      },
      {
        "@type": "HowTo", name: "How to install the PickupChecker restock alert app on iPhone", totalTime: "PT2M",
        step: [
          { "@type": "HowToStep", name: "Open pickupchecker.com in Safari", text: "Home Screen web apps can send push on iOS and iPadOS 16.4 or later." },
          { "@type": "HowToStep", name: "Tap Share, then Add to Home Screen", text: "The PickupChecker icon appears on your Home Screen." },
          { "@type": "HowToStep", name: "Open the icon, sign in and allow notifications", text: "The Home Screen app keeps its own sign-in, separate from Safari.", url: `${SITE}/install` },
          { "@type": "HowToStep", name: "Pick the iPhone Duo and the stores you can reach", text: "One alert is one Apple Store × one exact configuration.", url: `${SITE}${setupHref}` },
        ],
      },
    ],
  };

  const nav = [
    { id: "apple-app", label: "Apple's own app" },
    { id: "how-it-works", label: "How the app works" },
    { id: "install", label: "Install" },
    { id: "compare", label: "Other alert apps" },
    { id: "speed", label: "How fast" },
    { id: "cost", label: "Price" },
    { id: "do-you-need-one", label: "Do you need one?" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 sm:pt-12">
      <JsonLd data={ld} />

      <section className="grid items-start gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="eyebrow mb-4">iPhone Duo · restock alert app</div>
          <h1 className="display text-4xl sm:text-6xl">Is there an app that alerts you when the iPhone Duo is back in stock?</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-2"><Inline text={heroLead} facts={facts} /></p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={setupHref} className="btn btn-primary btn-lg">Set up an iPhone Duo alert</Link>
            <Link href="/install" className="btn btn-ghost btn-lg">Install the app</Link>
          </div>
        </div>
        <StatGrid cols={2}>
          <Stat value={us7 ? us7.p50Sec.toFixed(1) : `${SPEED.fastSec}`} unit="s" label={us7 ? <>measured median between checks at the stores your alerts point at · US, 7 days · plan {SPEED.fastSec} s</> : "planned between checks at the stores your alerts point at"} tone="accent" />
          <Stat value={push7 ? push7.p50Sec.toFixed(1) : `~${SPEED.alertSec}`} unit="s" label={push7 ? <>median, first check that saw a restock → push accepted · {count(push7.events)} restocks, 7 days</> : "planned, confirmed restock → push sent"} />
          <Stat value={ds ? `${ds.medianSec}` : "~60"} unit="s" label={ds ? <>typical Duo listing, listed to gone · last 7 days, {n(ds.n)} restocks</> : "typical Duo listing, listed to gone"} tone="warn" />
          <Stat value="0" label="App Store downloads needed: it installs from Safari" tone="muted" />
        </StatGrid>
      </section>

      <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-2 text-sm">
        {nav.map((s) => <a key={s.id} href={`#${s.id}`} className="chip px-3 py-1.5 text-xs">{s.label}</a>)}
      </nav>

      <div className="mt-6 grid gap-5">
        <Section id="apple-app" h2="Does Apple's own app alert you when the iPhone Duo restocks?" lead={appleLead} facts={facts}>
          <ol className="mt-5 grid gap-3 sm:grid-cols-2">
            <Swap no="Opening the Apple Store app every few minutes" yes={<>A push the moment your store lists it</>} why={ds ? <>Half of last week&apos;s Duo restocks were gone within <b>{ds.medianSec} seconds</b>, and {pct(ds.within30)} within 30: a listing usually starts and ends between two looks.</> : "A listing usually starts and ends between two looks."} />
            <Swap no="Waiting for Apple to announce a restock" yes={<>Watching the stores themselves</>} why="Apple publishes no restock schedule; pickup stock simply appears on a store's page and is gone again within minutes." />
          </ol>
          <Points className="mt-5" items={[
            { text: <>What Apple&apos;s app <b className="text-ink">is</b> good for: checking out fast once you know — keep it signed in, with Apple Pay ready</> },
            { text: <>&quot;Currently unavailable&quot; on every store is the normal reading, even on a day with dozens of restocks (<Link href="/apple-store-pickup-availability-explained" className="underline underline-offset-2">what it means</Link>)</> },
          ]} />
          <Figure id="foldable-apps" />
        </Section>

        <Section id="how-it-works" h2="How does the PickupChecker app work?" lead={howLead} facts={facts}>
          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <StepStrip className="lg:grid-cols-2!" steps={[
                { title: "Choose", hint: "the iPhone Duo storage and color, and the Apple Stores you can reach; each store × configuration is one alert" },
                { title: "Check", hint: <>those stores asked every {SPEED.fastSec} seconds, around the clock; every other US Apple Store every {SPEED.checkSec}</> },
                { title: "Confirm", hint: "a first \"available\" is asked again about a second later; the push goes out only when both answers agree" },
                { title: "Push", hint: "one notification per restock, naming the store and the configuration; several colors back at one store arrive as one banner" },
              ]} />
              <Points className="mt-5" items={[
                { text: <>Nothing while it stays listed, nothing for sell-outs: <b className="text-ink">one push per restock</b></> },
                { text: <>No device allowed yet? The alert comes by <b className="text-ink">email</b> instead</> },
                { text: <>Tap the push → apple.com → &quot;I&apos;ll pick it up&quot; at the store it names</>, step: true },
              ]} />
            </div>
            <div className="mx-auto w-full max-w-[16rem] lg:mx-0"><AlertBannerMock /></div>
          </div>
        </Section>

        <Section id="install" h2="How do I install it on iPhone, Android or a computer?" lead={installLead} facts={facts}>
          <BlockView b={platformTable} facts={facts} />
          <Points className="mt-5" items={[
            { text: <>On iPhone, alerts only reach the <b className="text-ink">Home Screen app</b>, never a Safari tab: Apple&apos;s rule, not ours</> },
            { text: <>The Home Screen app keeps its own sign-in, separate from Safari: <b className="text-ink">sign in once more inside it</b></> },
            { text: <>Allow PickupChecker in any Focus you use, or a 7 AM restock waits until you look</>, step: true },
          ]} />
          <LinkRow links={[{ label: "Step-by-step install guide with screenshots", href: "/install" }]} />
          <Figure id="light-blue-case" />
        </Section>

        <Section id="compare" h2="Which other iPhone restock alert apps are there?" lead={compareLead} facts={facts}>
          <BlockView b={trackerTable} facts={facts} />
          <Points className="mt-5" items={[
            { text: <>Ask any tracker for a <b className="text-ink">measured</b> interval with its window and sample; a stated one is a promise</> },
            { text: <>A page-change monitor (alerts when a web page changes) is not a stock alert: it does not know your store or confirm a restock</>, no: true },
            { text: <>Ours is measured in public, hour by hour, on the <Link href="/service-report" className="underline underline-offset-2">service report</Link></>, step: true },
          ]} />
          <LinkRow links={[{ label: "iPhone stock trackers compared, in full", href: "/iphone-stock-tracker-comparison" }]} />
        </Section>

        <Section id="speed" h2="How fast does the alert reach your phone?" lead={speedLead} facts={facts}>
          {push7 && (
            <StatGrid cols={3} className="mt-5">
              <Stat value={push7.p50Sec.toFixed(1)} unit="s" label="median, first sighting → push accepted" tone="accent" />
              <Stat value={push7.p95Sec.toFixed(1)} unit="s" label="95th percentile" />
              <Stat value={count(push7.events)} label="restocks alerted, last 7 days" tone="muted" />
            </StatGrid>
          )}
          <Measured>
            Measured from the first check that saw a restock to the moment Apple&apos;s or Google&apos;s push service accepted the notification, for every restock that produced an alert in the last 7 days. It includes the second, confirming check; it cannot include the last hop to your phone, which we do not see.
          </Measured>
        </Section>

        <Section id="cost" h2="Is the iPhone Duo restock alert app free?" lead={costLead} facts={facts}>
          <StatGrid cols={3} className="mt-5">
            <Stat value={`$${PLANS.plus.priceUsd}`} unit="/ month" label={<>{PLANS.plus.name} · {PLANS.plus.limit} alerts</>} tone="accent" />
            <Stat value={`$${PLANS.pro.priceUsd}`} unit="/ month" label={<>{PLANS.pro.name} · {PLANS.pro.limit} alerts</>} />
            <Stat value={`$${PLANS.max.priceUsd}`} unit="/ month" label={<>{PLANS.max.name} · {PLANS.max.limit} alerts</>} />
          </StatGrid>
          <Points className="mt-5" items={[
            { text: <><b className="text-ink">{PLANS.plus.limit} alerts</b> = one configuration at {PLANS.plus.limit} stores, or two colors at five</> },
            { text: <>Free without a plan: the live map, every store&apos;s stock and the restock log</> },
            { text: <>Cancel anytime from your account page</>, step: true },
          ]} />
          <LinkRow links={[{ label: "Pricing", href: "/pricing" }]} />
        </Section>

        <Section id="do-you-need-one" h2="Do you actually need an alert app?" lead={needLead} facts={facts}>
          <StepStrip className="mt-5 lg:grid-cols-3!" steps={[
            { title: "Pick reachable stores", hint: "the two or three you can get to the same day beat a long list you would never drive to" },
            { title: "Stage checkout", hint: "signed in on apple.com, Apple Pay or a card saved, pickup person set: the alert should only need taps" },
            { title: "Keep sound on", hint: "a restock at 9 AM on a weekday is the common case; a silent phone turns a 20-second job into a missed one" },
          ]} />
          <LinkRow links={[{ label: "Grab a restock in 20 seconds", href: "/how-to-grab-an-iphone-duo-restock" }, { label: "When the iPhone Duo restocks", href: "/iphone-duo-restock-times" }, { label: "iPhone Duo stock alerts, explained", href: "/iphone-duo-stock-alerts" }]} />
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href={setupHref} className="btn btn-primary">Set up an iPhone Duo alert</Link>
            <span className="text-sm text-ink-3">Your stores checked every {SPEED.fastSec} seconds from then on.</span>
          </div>
          <Figure id="phone-sofa-shopping" />
        </Section>
      </div>

      <div className="mx-auto mt-10 max-w-3xl"><RichFaq items={faq} facts={facts} title="Questions" /></div>
      <div className="mx-auto mt-8 max-w-3xl"><SourceList sources={sources} facts={facts} where={`${n(ALL_STORES.length)} Apple Stores in ${INTL_CODES.length + 1} countries`} since={TRACKING_SINCE_US} /></div>
    </div>
  );
}
