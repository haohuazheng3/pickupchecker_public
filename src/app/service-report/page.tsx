/**
 * /service-report (2026-11-09): PickupChecker's continuous, live report on its own service — how often each lane
 * actually checks a store, how long an alert takes to reach the push service, one real restock stage by stage, the
 * known limits and why a reading can differ from Apple's page or another tracker. Answer engines told the owner a
 * planned "every 5 seconds" is worth less than a measured interval with its window, sample and limits; this page is
 * that measurement. Every figure is live (serviceStats, serviceHourly), names its window and sample, and falls back to
 * "no data yet", never to 0 s. English only.
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
import { ALL_STORES, PART_INDEX, STORE_INDEX, appleName, storeLocality, storeTimeZone } from "@/lib/apple/catalog";
import { INTL_CODES } from "@/lib/apple/countries";
import { SPEED } from "@/lib/plans";
import { TRACKING_SINCE_US, siteFacts } from "@/lib/content/siteFacts";
import { PLANNED_SEC, serviceStats, secs, type ServiceStats } from "@/lib/content/serviceStats";
import { PLAN_ONLY, abovePlan, count, deliverySentence, intervalSentence, intlLimit, outcomesLine, share, utcDate, utcHour, windowPhrase } from "@/lib/content/serviceCopy";
import { latestRestockTimeline, offsetSec, serviceHourly, type HourPoint, type RestockTimeline } from "@/lib/content/serviceHourly";
import { DailyTable, DeliveryTable, HourlyChart, IntervalTable, RestockTimelineView, ServiceTiles, type TimelineNames } from "@/components/service/ServiceFigures";
import { Measured, Points, StepStrip } from "@/components/ui/Viz";

export const dynamic = "force-dynamic";

const PATH = "/service-report";
const TITLE = "PickupChecker Service Report: Check Intervals & Alert Delays";
const H1 = "PickupChecker service report: measured check intervals and alert delays";
const DESCRIPTION = "Measured live, not promised: how often PickupChecker really checks Apple Stores (median, p95, 24 h to 30 days) and how fast alerts reach the push service.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { type: "article", siteName: "PickupChecker", title: TITLE, description: DESCRIPTION, url: PATH },
};

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
  return <div className={`flex flex-wrap gap-2 ${className}`}>{links.map((l) => <Link key={l.href} href={l.href} className="chip chip-sm">{l.label}</Link>)}</div>;
}

/** The hour-by-hour lead: how many hours kept the plan, and the worst hour, for both alert lanes. */
function hourlyLead(points: HourPoint[]): string {
  const lane = (l: "fast-us" | "fast-intl") => points.filter((p) => p.lane === l && p.p50Sec != null);
  const us = lane("fast-us"), intl = lane("fast-intl");
  if (us.length === 0) return "The chart fills in as the hourly record of the stores with an alert grows; until then the tables above carry every figure there is.";
  const plan = PLANNED_SEC["fast-us"];
  const kept = (ps: HourPoint[]) => ps.filter((p) => p.p50Sec! <= plan + 0.5).length;
  const worst = (ps: HourPoint[]) => ps.reduce((a, p) => ((p.p95Sec ?? 0) > (a.p95Sec ?? 0) ? p : a), ps[0]);
  const w = worst(us);
  const intlPart = intl.length
    ? ` Outside the US, ${count(kept(intl))} of ${count(intl.length)} hours kept it, with hourly medians between ${secs(Math.min(...intl.map((p) => p.p50Sec!)))} and ${secs(Math.max(...intl.map((p) => p.p50Sec!)))}.`
    : "";
  return `In **${count(kept(us))} of ${count(us.length)}** hours with data, the US hourly median stayed within half a second of the ${plan}-second plan; the worst hour's p95 was ${secs(w.p95Sec ?? w.p50Sec!)} (${utcHour(w.hour)}).${intlPart}`;
}

/** The hero's verdict: each alert lane against its plan in one line (the full sentence opens the first section). */
function verdict(st: ServiceStats): string {
  const us = st.lanes["7d"]["fast-us"], intl = st.lanes["7d"]["fast-intl"];
  if (!us) return PLAN_ONLY;
  const word = (over: boolean) => (over ? "above" : "close to");
  const intlPart = intl ? `; in the other countries ${word(abovePlan("fast-intl", intl))} it, a median **${secs(intl.p50Sec)}**` : "";
  return `Stores with an alert are checked ${word(abovePlan("fast-us", us))} the ${PLANNED_SEC["fast-us"]}-second plan in the US, a median **${secs(us.p50Sec)}** between two successful checks (p95 ${secs(us.p95Sec)}, ${windowPhrase(us, "7d")})${intlPart}.`;
}

/** Store, place, configuration and local time of the example restock (public facts only). */
function timelineNames(t: RestockTimeline): TimelineNames | null {
  const store = STORE_INDEX.get(t.storeNumber);
  const item = PART_INDEX.get(t.partNumber);
  if (!store || !item) return null;
  const localTime = new Intl.DateTimeFormat("en-US", { timeZone: storeTimeZone(store), month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date(t.firstSeen));
  return { store: appleName(store), place: storeLocality(store), config: `${item.model} ${item.storage} ${item.color}`, localTime };
}

function exampleLead(t: RestockTimeline | null, names: TimelineNames | null): string {
  if (!t || !names) return "No restock in the last two days both sent an alert and sold out again, so there is no example to show right now; it returns with the next one.";
  const f = (iso: string | null) => { const v = offsetSec(t.firstSeen, iso); return v == null ? null : `${v.toFixed(1)} s`; };
  const confirmed = f(t.confirmed), accepted = f(t.acceptedFirst), gone = f(t.goneSeen);
  return `**${names.store}** listed the ${names.config} at ${names.localTime} local time${confirmed ? `; a second answer confirmed it ${confirmed} later` : ""}${accepted ? `, the push service accepted the first alert at ${accepted}` : ""}${gone ? `, and the check at ${gone} found it gone` : ""}. It was picked by rule, not by hand: the most recent restock that sent an alert and has since sold out.`;
}

export default async function ServiceReport() {
  const [st, points, tl, facts, f] = await Promise.all([serviceStats(), serviceHourly(), latestRestockTimeline(), getFacts(), siteFacts()]);
  const names = tl ? timelineNames(tl) : null;
  const us7 = st.lanes["7d"]["fast-us"], intl7 = st.lanes["7d"]["fast-intl"], push7 = st.delivery["7d"].push;
  const ds = f.duoSellout;
  const intervals = intervalSentence(st, "7d") ?? PLAN_ONLY;
  const delivery = deliverySentence(st, "7d");
  const outcomes = outcomesLine(st);
  const intlNote = intlLimit(st, "7d");
  const fastSince = st.since["fast-us"];
  const earliest = Object.values(st.since).filter((v): v is string => !!v).sort()[0] ?? `${TRACKING_SINCE_US}T00:00:00Z`;

  const stagesLead = "Four timestamps come from our own logs and one does not exist: first observed, confirmed by a second answer, handed to and accepted by the push or mail service, and, not measured, shown on your device. Every delay on this site starts at the first observation, so the confirming second is counted, never hidden.";
  const limitsLead = intlNote ?? "Right now no lane runs more than half a second above its plan; the limits that matter are the ones a median does not show, listed below.";
  const diffLead = `Because each of them looked at a different moment under different rules: a listing that lasts${ds ? ` a median ${ds.medianSec} seconds` : " seconds"} can be on Apple's page when you load it and gone at our next check, or the reverse. We also wait for a second answer, and we never turn a failed check into "out of stock".`;
  const methodLead = "From two of our own logs, added up hourly: every successful answer from apple.com, to time the checks, and every alert with the push or mail service's reply, to time the alerts. Nothing is sampled by hand or smoothed, and the page reads the database live, cached for up to an hour.";

  const nav = [
    { id: "intervals", label: "Check intervals" },
    { id: "hourly", label: "Hour by hour" },
    { id: "alerts", label: "Alert delay" },
    { id: "stages", label: "What each stage means" },
    { id: "example", label: "One real restock" },
    { id: "limits", label: "Known limits" },
    { id: "differences", label: "Why readings differ" },
    { id: "method", label: "Method" },
  ];

  const faq: Faq[] = [
    { q: "How often does PickupChecker check Apple Stores?", a: us7 ? `The plan is every ${SPEED.fastSec} seconds at stores a paid alert points at and every ${SPEED.checkSec} seconds at all ${count(ALL_STORES.length)} stores. Measured over the last 7 days: a median ${secs(us7.p50Sec)} and p95 ${secs(us7.p95Sec)} at US alert stores${intl7 ? `, ${secs(intl7.p50Sec)} and ${secs(intl7.p95Sec)} in the other countries` : ""}.` : PLAN_ONLY },
    { q: "How fast are PickupChecker alerts?", a: push7 ? `Over the last 7 days the push service accepted the first alert a median ${secs(push7.p50Sec)} after the first check that saw the restock (p90 ${secs(push7.p90Sec)}, p95 ${secs(push7.p95Sec)}, ${count(push7.events)} restocks). When the phone shows it is not measured.` : "The delay is measured from the first check that saw a restock to the push service accepting the alert; no alert went out in the last 7 days, so there is no current figure." },
    { q: "Why is the interval outside the US above 5 seconds?", a: abovePlan("fast-intl", intl7) ? `Because that lane does not keep its plan today: a median ${secs(intl7!.p50Sec)} and p95 ${secs(intl7!.p95Sec)} over the last 7 days. We print the measurement instead of the plan until it does; the hourly chart shows whether that changes.` : "Right now it is not: the measured median is within half a second of the plan. If it drifts above, this page says so in the first line of its limits section." },
    { q: "Does \"accepted by the push service\" mean my phone got the alert?", a: "No. It means Apple's, Google's or Mozilla's push service took the alert for delivery. Delivery to the device happens after that and reports nothing back to us, so we do not measure it and never call it arrival." },
    { q: "Can I check these numbers myself?", a: "The raw timestamps of one dated half-hour sample are downloadable ([CSV](/check-evidence/2026-11-07/checks.csv)), so any interval can be recomputed by hand; the live figures on this page are recomputed every hour from the full logs. Corrections are welcome through [contact](/contact)." },
  ];
  const sources: Source[] = [
    { label: "Apple Developer: Sending web push notifications in web apps and browsers", url: "https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers" },
    { label: "IETF RFC 8030: Generic Event Delivery Using HTTP Push (what a push service accepts)", url: "https://www.rfc-editor.org/rfc/rfc8030" },
    { label: "Wikipedia: Percentile (median, p95)", url: "https://en.wikipedia.org/wiki/Percentile" },
  ];

  const site = "https://pickupchecker.com";
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${site}${PATH}`, url: `${site}${PATH}`, name: H1, description: DESCRIPTION, isPartOf: { "@id": `${site}/#website` }, about: { "@id": `${site}/#organization` }, dateModified: st.at },
      {
        "@type": "Dataset", "@id": `${site}${PATH}#dataset`, name: "PickupChecker measured check intervals and alert delays",
        description: "Hourly measurements of PickupChecker's own service: the time between two successful checks of the same Apple Store (stores with an alert, US and other countries) and between full rounds of every store, with median, p95, p99 and maximum; and the time from the first check that saw a restock to the push or mail service accepting the alert.",
        url: `${site}${PATH}`, creator: { "@id": `${site}/#organization` }, publisher: { "@id": `${site}/#organization` }, isAccessibleForFree: true,
        temporalCoverage: `${earliest.slice(0, 10)}/..`, dateModified: st.at,
        variableMeasured: ["check interval (seconds) per lane", "share of intervals within plan + 1 s", "first check to push accepted (seconds)", "first check to email accepted (seconds)", "pushes accepted and rejected"],
        measurementTechnique: "Timestamps from PickupChecker's request, round and alert logs, rolled up hourly into 0.1-second histograms (to 30 s); percentiles interpolated inside the tenth of a second; device arrival not measured.",
        distribution: [{ "@type": "DataDownload", name: "Raw check timestamps, dated sample (2026-11-07 22:00–22:30 UTC)", encodingFormat: "text/csv", contentUrl: `${site}/check-evidence/2026-11-07/checks.csv` }],
      },
    ],
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 sm:pt-12">
      <JsonLd data={ld} />

      {/* hero */}
      <section>
        <div className="eyebrow mb-4">PickupChecker · service report · figures as of {utcHour(st.at)}</div>
        <h1 className="display text-4xl sm:text-5xl">{H1}</h1>
        <p className="mt-5 max-w-3xl text-lg text-ink-2"><Inline text={verdict(st)} facts={facts} /></p>
        {delivery && <p className="mt-3 max-w-3xl text-base text-ink-2"><Inline text={delivery} facts={facts} /></p>}
        <ServiceTiles st={st} className="mt-6" />
        <p className="mt-3 text-xs text-ink-3">Planned: {SPEED.fastSec} s at stores with an alert, {SPEED.checkSec} s at every store. Measured: from our own logs, refreshed hourly. Nothing here is a claim about another tracker; for those see <Link href="/iphone-stock-tracker-comparison" className="underline underline-offset-2">iPhone stock trackers compared</Link>.</p>
      </section>

      <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-2 text-sm">
        {nav.map((s) => <a key={s.id} href={`#${s.id}`} className="chip px-3 py-1.5 text-xs">{s.label}</a>)}
      </nav>

      <div className="mt-6 grid gap-5">
        <Section id="intervals" h2="How often does PickupChecker really check a store?" lead={intervals} facts={facts}>
          <IntervalTable st={st} detail />
          <Points items={[
            { text: <><b className="text-ink">Median</b>: half the intervals were shorter · <b className="text-ink">p95</b>: 95 in 100 were shorter · <b className="text-ink">longest</b>: one bad moment, not the habit</> },
            { text: <><b className="text-ink">Within plan + 1 s</b>: the share at or under {PLANNED_SEC["fast-us"] + 1} s for alert stores, {PLANNED_SEC["round-us"] + 1} s for full rounds</> },
            { text: <>The 24-hour row moves with today&apos;s load; the 30-day row is the habit</> },
            ...(fastSince ? [{ text: <>The alert-store record starts {utcHour(fastSince)}: the per-store request log was not rolled up before, so longer windows cover what exists and say where they start</>, no: true }] : []),
          ]} />
        </Section>

        <Section id="hourly" h2="What did the last 7 days look like, hour by hour?" lead={hourlyLead(points)} facts={facts}>
          <HourlyChart points={points} nowIso={st.at} />
          <Measured title="Table view: day by day">
            <DailyTable points={points} />
          </Measured>
        </Section>

        <Section id="alerts" h2="How fast does an alert go out after a restock?" lead={delivery ?? "No alert went out in the last 7 days, so there is no delay to report; the table fills in with the next alert."} facts={facts}>
          <DeliveryTable st={st} />
          {outcomes && <p className="text-sm text-ink-2">{outcomes}</p>}
          <Points className="mt-4" items={[
            { text: <>Measured from the <b className="text-ink">first check that saw the restock</b>, so the confirming second answer (about a second later) sits inside the figure</> },
            { text: <><b className="text-ink">Accepted</b>: the push service returned success · <b className="text-ink">rejected</b>: the send failed · a member whose every device is refused gets the alert by email instead</> },
            { text: <>Email goes mostly to members with no device set up; a mail service&apos;s acceptance is not an inbox delivery either</> },
            { text: <>On the phone: not measured, by anyone; a push service reports acceptance, not display</>, no: true },
          ]} />
          <Figure id="phone-notification" />
        </Section>

        <Section id="stages" h2="What exactly is measured at each stage?" lead={stagesLead} facts={facts}>
          <StepStrip className="mt-5 lg:grid-cols-5!" steps={[
            { title: "First observed", hint: "the first answer from apple.com that listed the configuration at that store; delays start here" },
            { title: "Confirmed", hint: "the store asked again about a second later; the answer agreed, so it counts as a restock" },
            { title: "Handed off", hint: "alerting started: the alert went to Apple's, Google's or Mozilla's push service, or to the mail service" },
            { title: "Accepted", hint: "that service replied that it took the alert; this is where our measurement ends" },
            { title: "On your device", hint: "not measured: the push service delivers it and reports nothing back" },
          ]} />
          <Points className="mt-5" items={[
            { text: <>A listing Apple withdraws before the second answer is never a restock, and never an alert</> },
            { text: <>A failed or timed-out answer changes nothing: it is asked again, never read as &quot;sold out&quot;</> },
            { text: <>A sell-out is confirmed the same way, by the next check</> },
          ]} />
        </Section>

        <Section id="example" h2="What did one real restock look like, second by second?" lead={exampleLead(tl, names)} facts={facts}>
          {tl && names && <RestockTimelineView t={tl} names={names} />}
          <p className="mt-4 text-xs text-ink-3">No account, device or person appears here: the store and configuration are public on the <Link href="/restocks" className="underline underline-offset-2">restock log</Link>, and the timings come from our request and alert logs. Refreshed every 5 minutes.</p>
        </Section>

        <Section id="limits" h2="Where does PickupChecker fall short of its plan?" lead={limitsLead} facts={facts}>
          <Points className="mt-5" items={[
            ...(intl7 ? [{ text: <>Alert stores outside the US: median {secs(intl7.p50Sec)}, p95 {secs(intl7.p95Sec)}, {share(intl7.onPlan)} of intervals within {PLANNED_SEC["fast-intl"] + 1} s (last 7 days)</>, no: abovePlan("fast-intl", intl7) }] : []),
            { text: <>The longest interval in each window is real: a slow or failed answer from Apple, retried from another address</>, no: true },
            { text: <>Every delay starts at our first sighting, not at Apple&apos;s listing, which can be up to one interval older</>, no: true },
            { text: <>Apple offers no pickup lookup at one store (Chermside, Australia), which is re-asked every 30 minutes instead</>, no: true },
            { text: <>Arrival on your phone, and whether you could still buy, are not measured</>, no: true },
            { text: <>Every figure here comes with its window and sample, so a bad week shows up as a bad week</>, step: true },
          ]} />
        </Section>

        <Section id="differences" h2="Why can PickupChecker differ from Apple's page or another tracker?" lead={diffLead} facts={facts}>
          <Points className="mt-5" size="base" items={[
            { text: <><b className="text-ink">Timing</b> · our check, your page load and another tracker&apos;s check are three moments; with listings this short they often disagree</> },
            { text: <><b className="text-ink">Confirmation</b> · we count a restock after a second answer agrees; a tracker that alerts on the first answer can be a second earlier, or wrong</> },
            { text: <><b className="text-ink">Not listed, unknown, stale</b> · &quot;unavailable&quot; is Apple saying no; a store we could not read is unknown, not sold out; the time shown is our last successful check, so an old time means no good answer since</> },
            { text: <><b className="text-ink">Caches</b> · Apple&apos;s page and ours can be seconds old (our public API is cached 30 s); the time printed is the check&apos;s, not the page&apos;s</> },
            { text: <><b className="text-ink">Scope</b> · Apple answers per store and configuration; another tracker may group nearby stores or count delivery</> },
            { text: <><b className="text-ink">Holds</b> · Apple sometimes lists stock already reserved for other orders</> },
          ]} />
          <LinkRow links={[{ label: "What \"currently unavailable for pickup\" means", href: "/apple-store-pickup-availability-explained" }, { label: "How a restock is confirmed", href: "/how-it-works#confirmed" }]} />
        </Section>

        <Section id="method" h2="How is this report produced?" lead={methodLead} facts={facts}>
          <Points className="mt-5" items={[
            { text: <>Alert stores: every successful single-store answer, paired with the previous one for that store; a store gone from the alert lane for over 5 minutes left the lane, it was not a slow check</> },
            { text: <>Full rounds: the start of each round paired with the previous one; every pause counts</> },
            { text: <>Each hour is stored as a histogram of 0.1-second steps, so any window adds up exactly and percentiles are exact to a tenth of a second</> },
            { text: <>Alerts: the first accepted alert per restock and channel, timed from the restock&apos;s first sighting</> },
            { text: <>Records since {utcDate(earliest)}; figures as of {utcHour(st.at)}</> },
          ]} />
          <LinkRow links={[{ label: "How PickupChecker works", href: "/how-it-works" }, { label: "iPhone Duo stock alerts", href: "/iphone-duo-stock-alerts" }, { label: "iPhone stock trackers compared", href: "/iphone-stock-tracker-comparison" }]} />
          <Figure id="terminal-logs" />
        </Section>
      </div>

      <div className="mx-auto mt-10 max-w-3xl"><RichFaq items={faq} facts={facts} title="Questions" /></div>
      <div className="mx-auto mt-8 max-w-3xl"><SourceList sources={sources} facts={facts} where={`${count(ALL_STORES.length)} Apple Stores in ${INTL_CODES.length + 1} countries`} since={TRACKING_SINCE_US} /></div>
    </div>
  );
}

