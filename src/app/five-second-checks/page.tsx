import type { Metadata } from "next";
import data from "../../../public/check-evidence/2026-11-07/summary.json";
import "./report.css";

export const metadata: Metadata = {
  title: "5-second iPhone stock checks: measured polling evidence",
  description: "PickupChecker publishes 103,636 recorded checks: a 6.099-second median interval, full distribution, timestamp samples and downloadable evidence. The five-second target is not a delivery guarantee.",
  alternates: { canonical: "/five-second-checks" },
};
const number = (n: number) => n.toLocaleString("en-US");
const schema = { "@context": "https://schema.org", "@type": "Article", headline: "Five-second checks, measured in public", datePublished: "2026-11-07", dateModified: "2026-11-07", author: { "@type": "Organization", name: "PickupChecker" }, publisher: { "@type": "Organization", name: "PickupChecker" }, mainEntityOfPage: "https://pickupchecker.com/five-second-checks", description: metadata.description };

export default function PollingEvidence() {
  return <article className="pc-evidence-report">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <header className="pc-evidence-hero">
      <p className="pc-evidence-kicker">PICKUPCHECKER / MEASUREMENT NOTE 001</p>
      <h1>Five-second checks,<br /><span>measured in public.</span></h1>
      <p className="pc-evidence-lead">Fast stock monitoring should come with numbers you can inspect. Our five-second target produced a <strong>6.099-second median</strong> between recorded store checks in this sample. Here is the evidence, including the slower checks.</p>
      <p className="pc-evidence-window">Published November 7, 2026 · Fixed window: 22:00–22:30 UTC</p>
    </header>
    <div className="pc-evidence-metrics" aria-label="Measured check intervals">
      <div><span>Scheduled target</span><strong>5<small> s</small></strong><p>A target, not a hard limit</p></div>
      <div><span>Observed median</span><strong>{data.medianSeconds.toFixed(2)}<small> s</small></strong><p>Half the intervals were shorter</p></div>
      <div><span>95th percentile</span><strong>{data.p95Seconds.toFixed(2)}<small> s</small></strong><p>95% were at or below 7.923 s</p></div>
    </div>
    <nav className="pc-evidence-nav" aria-label="Evidence sections"><a href="#results">Results</a><a href="#timestamps">Timestamps</a><a href="#method">Measurement</a><a href="#questions">Questions</a></nav>
    <section id="results" className="pc-evidence-section">
      <p className="pc-evidence-kicker">01 / THE COMPLETE DISTRIBUTION</p><h2>How close did checks come to five seconds?</h2>
      <p>The observed median was 6.099 seconds, so this sample does not support a promise that every check completes within five seconds. It does document repeated, seconds-apart monitoring: {data.within10Percent}% of measured intervals were no longer than ten seconds.</p>
      <div className="pc-evidence-chart" role="img" aria-label="Distribution of consecutive check-completion intervals; exact values in the table below">{data.distribution.map(b => <div className="pc-evidence-barRow" key={b.label}><span>{b.label}</span><div className="pc-evidence-track"><i style={{ width: `${Math.max(b.percent, .3)}%` }} /></div><b>{b.percent}%</b></div>)}</div>
      <div className="pc-evidence-tableWrap"><table><caption>All {number(data.intervalCount)} within-window intervals; failures retained</caption><thead><tr><th scope="col">Time between checks</th><th scope="col">Intervals</th><th scope="col">Share</th></tr></thead><tbody>{data.distribution.map(b => <tr key={b.label}><th scope="row">{b.label}</th><td>{number(b.count)}</td><td>{b.percent}%</td></tr>)}</tbody></table></div>
      <p>We counted <strong>{number(data.checkCount)} check completions</strong> across {data.seriesCount} anonymous store series. {number(data.successfulChecks)} succeeded and {data.failedChecks} did not. The longest measured gap was <strong>{data.maxSeconds} seconds</strong>. A failed check remains in the timing count; it does not mean fresh stock was obtained.</p>
    </section>
    <section id="timestamps" className="pc-evidence-section">
      <p className="pc-evidence-kicker">02 / SHOW THE CLOCK</p><h2>Can I inspect actual consecutive checks?</h2>
      <p>Yes. These are the first eight recorded completions for the first anonymous series in the export, chosen by label rather than speed. Each interval is the difference from that series’ previous completion. These are historical timestamps, not an animated live counter.</p>
      <div className="pc-evidence-tableWrap"><table><caption>Series {data.example[0].series} · November 7, 2026 · UTC</caption><thead><tr><th scope="col">Check completed</th><th scope="col">Previous gap</th><th scope="col">Result</th></tr></thead><tbody>{data.example.map(r => <tr key={r.completedAt}><td><time dateTime={r.completedAt}>{r.completedAt.slice(11,23)}</time></td><td>{r.gapSeconds === null ? "First in window" : `${r.gapSeconds.toFixed(3)} s`}</td><td>{r.successful ? "Successful" : "Unsuccessful"}</td></tr>)}</tbody></table></div>
      <div className="pc-evidence-downloads"><a href="/check-evidence/2026-11-07/checks.csv" download>Download every timestamp (CSV) ↗</a><a href="/check-evidence/2026-11-07/summary.json">Read the summary (JSON) ↗</a></div>
      <details><summary>File fingerprint</summary><p className="pc-evidence-hash">CSV SHA-256: {data.csvSha256}</p><p>This fingerprint identifies this exact export. It is not independent certification of its accuracy.</p></details>
    </section>
    <section id="method" className="pc-evidence-section">
      <p className="pc-evidence-kicker">03 / WHAT WAS MEASURED</p><h2>A repeatable check, without revealing the machinery</h2>
      <p>The sample contains all logged priority store-check series in the inventory data used by PickupChecker during the stated half-hour. We measured completion-to-completion gaps for the same store series, with one completion per store check cycle. We did not select only successful requests or discard long gaps.</p>
      <p>For each series, sort the CSV by <code>completedAt</code> and subtract the preceding timestamp. The first row has no earlier observation inside this window, leaving {number(data.intervalCount)} intervals from {number(data.checkCount)} completions. The median splits those intervals in half; the 95th percentile uses the nearest-rank method.</p>
      <p>The store labels are anonymous. The export contains times, gaps and success flags, without customer selections or operational implementation details. This is a publisher-produced measurement, not a third-party audit. The sample is shared inventory evidence, not an independent test of each website that uses that inventory.</p>
      <p>There are limits: unlogged work cannot be reconstructed, changing watch selections are not reconstructed, and store-level checks do not prove that every configuration or every member target was covered. A half-hour observation cannot establish continuous performance for every market, all day.</p>
      <aside className="pc-evidence-note"><h3>Checking speed is not notification speed</h3><p>These timestamps describe completed inventory checks. They do not measure the time from Apple making stock available to a notification appearing on a phone. Confirmation, delivery and device conditions are outside this dataset. There is no five-second notification guarantee or stock reservation in these results.</p></aside>
    </section>
    <section id="questions" className="pc-evidence-section"><h2>Before you use these numbers</h2>
      <details><summary>What is the practical advantage of frequent checks?</summary><p>Frequent observations can reduce the time between opportunities to notice a stock change. This sample demonstrates sustained seconds-apart checks. It does not measure a purchase-success improvement, and we have not tested a competitor in the same conditions.</p></details>
      <details><summary>Does five seconds apply to every store and configuration?</summary><p>No. The five-second target concerns eligible active member monitoring. This report measures the logged store-level sample above; it is not a certificate that every store, configuration or subscription achieved that interval.</p></details>
      <details><summary>Why publish a median above the target?</summary><p>Because the actual result is more useful than repeating a setting. The gap between the target and the observation remains visible here. We will need a new dated measurement before claiming an improvement.</p></details>
      <details><summary>Is this a live service-status page?</summary><p>No. This is an immutable dated sample. Current stock should be checked on the stock pages, and the final pickup option should be confirmed with Apple.</p></details>
      <p><a href="/stock/iphone-duo">Check current iPhone Duo stock</a> · <a href="/pricing">Membership options</a> · <a href="/contact">Ask about these measurements</a></p>
      <p className="pc-evidence-window">Citation: PickupChecker, “Five-second checks, measured in public,” November 7, 2026; 22:00–22:30 UTC. Preserve the distinction between the 5-second target and 6.099-second measured median.</p>
    </section>
  </article>;
}
