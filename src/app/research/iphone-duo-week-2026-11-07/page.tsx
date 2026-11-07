import type { Metadata } from "next";
import { Page } from "@/components/site/Page";
import { TrackOnce } from "@/components/site/TrackOnce";
import report from "../../../../public/research/2026-11-07/data.json";

const path = "/research/iphone-duo-week-2026-11-07";
export const metadata: Metadata = {
  title: "iPhone Duo weekly stock report: 3,009 observed restocks",
  description: "PickupChecker's fixed-window US iPhone Duo report: configuration counts, a Queens Center case study, methods, downloadable data and global coverage of 468 stores in 19 countries/regions.",
  alternates: { canonical: path },
  openGraph: { images: ["/research/2026-11-07/weekly.png"] },
};

export default function WeeklyReport() {
  return <Page title="iPhone Duo: a week of observed restocks" lead="3,009 confirmed restock events across 266 US Apple Stores. A dated snapshot from PickupChecker’s own observations, with the data and limits explained.">
    <TrackOnce event="research_report_viewed" props={{ report: "2026-11-07" }} />
    <p>By PickupChecker · Published November 7, 2026. Window: October 31, 2026 at 21:00 UTC (inclusive) to November 7 at 21:00 UTC (exclusive). This is a historical report, not a current stock offer.</p>
    <nav aria-label="Report sections"><a href="#weekly">Weekly results</a> · <a href="#case">Store case study</a> · <a href="#coverage">Global coverage</a> · <a href="#walkthrough">Walkthrough</a> · <a href="#method">Methods</a></nav>
    <h2 id="weekly">Which configurations appeared most often?</h2>
    <p>Across a catalog of 269 US stores, 266 had at least one recorded Duo restock in this window. The most frequently recorded configuration was 256GB Star White (781 events). All configurations and zero counts for the case-study store are shown below.</p>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm [&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2 [&_tr]:border-b [&_tr]:border-white/10"><caption>Confirmed restock events, same seven-day UTC window</caption><thead><tr><th scope="col">iPhone Duo configuration</th><th scope="col">United States</th><th scope="col">Queens Center</th></tr></thead><tbody>{report.configurations.map(r => <tr key={r.configuration}><th scope="row">{r.configuration}</th><td>{r.events}</td><td>{r.queensCenter}</td></tr>)}</tbody></table></div>
    <p>A restock event counts one store–configuration changing from unavailable to available. It does not count units, deliveries, purchases or unique buyers. Several configurations can change during the same delivery.</p>
    <h2 id="case">Queens Center: the configuration changes the picture</h2>
    <p>At Apple Queens Center in Elmhurst, New York (R612), we recorded 113 Duo restocks: 63 for 256GB Night Sky, 28 for 512GB Night Sky, 17 for 256GB Star White, four for 512GB Star White and one for 2TB Night Sky. The other three configurations had no recorded restock in this window.</p>
    <p>The useful lesson is to inspect the exact phone you would buy. A busy store-level chart can conceal very different configuration histories. These counts do not establish which phone will restock next or which store gives a shopper the best chance.</p>
    <p><a href="/stock/iphone-duo">Check current US Duo availability</a> · <a href="/restocks">Read the current restock log</a></p>
    <h2 id="coverage">468 Apple Stores in 19 countries and regions</h2>
    <p>Coverage verified November 7, 2026 against the live regional store catalogs and active database stores. The 269 US stores are one part of the service. The weekly analysis above is US-only; it must not be interpreted as a global weekly total.</p>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm [&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2 [&_tr]:border-b [&_tr]:border-white/10"><caption>PickupChecker regional store catalog</caption><thead><tr><th scope="col">Country or region</th><th scope="col">Stores</th></tr></thead><tbody>{report.coverage.map(c => <tr key={c.code}><th scope="row"><a href={c.code === "us" ? "/" : `/${c.code}`}>{c.name}</a></th><td>{c.stores}</td></tr>)}</tbody></table></div>
    <h2 id="walkthrough">Choose your market, then inspect the exact phone</h2>
    <p>The short walkthrough below uses real website screenshots captured on November 7. It shows market selection, the UK stock view and restock history. It is an edited screenshot walkthrough, not a live notification-speed test. Numbers shown in it are historical snapshots.</p>
    <video controls preload="none" playsInline className="w-full rounded-xl" aria-label="PickupChecker market and stock lookup walkthrough"><source src="/research/2026-11-07/walkthrough.mp4" type="video/mp4" /><track kind="captions" src="/research/2026-11-07/walkthrough.vtt" srcLang="en" label="English" default /></video>
    <ol><li>Choose the country or region where you can collect the phone.</li><li>Open that market’s Duo stock view and select the exact storage and color.</li><li>Use store-level history for context; confirm current pickup availability with Apple.</li></ol>
    <p><a href="/install">Install and enable notifications</a> · <a href="/pricing">Compare alert memberships</a></p>
    <h2 id="method">How we counted, and what we cannot infer</h2>
    <p>Source: PickupChecker’s own confirmed availability events. We filtered to US stores, iPhone Duo, restock events and the stated UTC window, excluding first sightings. Imported third-party reports are excluded. Each event is one store and exact configuration; repeated confirmed changes count separately. The snapshot was extracted after the window closed.</p>
    <p>The catalog denominator is 269 US stores. The 266 stores with an event are not an uptime or complete-monitoring measure. We did not audit uninterrupted historical coverage per store or adjust counts for gaps. Brief listings can occur between checks. A zero means no qualifying recorded event, not proof that no stock existed. This descriptive report does not measure units, demand, probability of purchase or causal differences between stores.</p>
    <p>Eligible active member targets have a planned five-second polling interval. Actual check intervals, confirmation, queueing and push delivery are separate stages. This report does not provide a measured notification-latency benchmark or claim that every alert arrives within five seconds.</p>
    <p><a href="/research/2026-11-07/configurations.csv" download>Download configuration counts (CSV)</a> · <a href="/research/2026-11-07/data.json">Read the report data (JSON)</a></p>
    <p>To cite: PickupChecker, “iPhone Duo: a week of observed restocks,” published November 7, 2026, window October 31–November 7 at 21:00 UTC. Please preserve the US scope and the distinction between events and units.</p>
    <p>Independent service; not affiliated with Apple. <a href="/contact">Send a correction or data question</a>.</p>
  </Page>;
}
