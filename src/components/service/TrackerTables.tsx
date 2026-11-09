/**
 * iPhone stock trackers side by side (server components, English): every other tracker's row is what it states on its
 * own site (trackers.ts, read on TRACKERS_READ), PickupChecker's row carries its plan and its live measurement
 * (serviceStats). Used by /iphone-stock-tracker-comparison (full and cost tables) and /iphone-duo-stock-alerts
 * (the short table). Homepages are linked rel="nofollow noopener": a citation, not an endorsement.
 */
import type { ReactNode } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { ALL_STORES } from "@/lib/apple/catalog";
import { INTL_CODES } from "@/lib/apple/countries";
import { PLANS, PAID_PLANS, SPEED } from "@/lib/plans";
import { secs, type ServiceStats } from "@/lib/content/serviceStats";
import { abovePlan, count } from "@/lib/content/serviceCopy";
import { NEEDS, OTHER_TRACKER_CLAIMS, TRACKERS_READ_SHORT, type TrackerClaim } from "@/lib/content/trackers";

const th = "border-b border-line-2 py-2 pe-3 text-start font-semibold text-ink";
const td = "py-2 pe-3 align-top";

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="nofollow noopener" className="underline decoration-ink/25 underline-offset-[3px] hover:decoration-ink">{children}</a>;
}

/** The cheapest PickupChecker plan that covers `alerts` alerts, as "$5/mo (Plus, 3 of 10 alerts)". */
export function pickupCheckerCost(alerts: number): string {
  const plan = PAID_PLANS.map((k) => PLANS[k]).find((p) => p.limit >= alerts);
  return plan ? `$${plan.priceUsd}/mo (${plan.name}: ${alerts} of ${plan.limit} alerts)` : `more than ${PLANS.max.limit} alerts: not offered`;
}

/** PickupChecker's own row: the plan, then what was measured (or "not yet measured"). */
export function pickupCheckerRow(st: ServiceStats): TrackerClaim & { measured: ReactNode } {
  const us = st.lanes["7d"]["fast-us"], intl = st.lanes["7d"]["fast-intl"], push = st.delivery["7d"].push;
  return {
    name: "PickupChecker (this site)",
    url: "https://pickupchecker.com",
    interval: `planned: ${SPEED.fastSec} s at stores with an alert, ${SPEED.checkSec} s at every store`,
    confirmation: "yes: a second answer, about a second after the first, must agree",
    delay: push ? `measured: push service accepted the first alert a median ${secs(push.p50Sec)} after the first check that saw the restock (p95 ${secs(push.p95Sec)})` : "measured live; no alerts in the last 7 days",
    channels: "push to the Home Screen web app; email when no device is set up",
    coverage: `${count(ALL_STORES.length)} Apple Stores in ${INTL_CODES.length + 1} countries`,
    oneAlert: "one store × one exact configuration",
    price: PAID_PLANS.map((k) => `$${PLANS[k].priceUsd}/mo for ${PLANS[k].limit}`).join(", "),
    needSmall: pickupCheckerCost(NEEDS.small.alerts),
    needLarge: pickupCheckerCost(NEEDS.large.alerts),
    measured: us
      ? <>US {secs(us.p50Sec)} median, p95 {secs(us.p95Sec)}; other countries {intl ? <>{secs(intl.p50Sec)} median, p95 {secs(intl.p95Sec)}{abovePlan("fast-intl", intl) ? " (above plan)" : ""}</> : "no data yet"} (7 days)</>
      : "not yet measured",
  };
}

const note = <>Other trackers: as stated on their own sites, read {TRACKERS_READ_SHORT}, not independently measured. PickupChecker: plan and live measurement (<Link href="/service-report" className="underline underline-offset-2">service report</Link>).</>;

/** The same-basis table: stated interval, confirmation, stated delay, channels, coverage, what one alert covers. */
export function TrackerTable({ st }: { st: ServiceStats }) {
  const ours = pickupCheckerRow(st);
  const rows = [ours, ...OTHER_TRACKER_CLAIMS];
  return (
    <div className="my-5 overflow-x-auto">
      <table className="w-full min-w-[60rem] border-collapse text-sm">
        <caption className="mb-2 text-start text-xs text-ink-3">{note}</caption>
        <thead><tr>{["Tracker", "Check interval", "Measured interval", "Confirms before alerting", "Alert delay", "Channels", "Coverage", "One alert covers"].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-line">
              <th scope="row" className="py-2 pe-3 text-start align-top font-medium text-ink">{r === ours ? r.name : <Ext href={r.url}>{r.name}</Ext>}</th>
              <td className={td}>{r.interval}</td>
              <td className={td}>{r === ours ? ours.measured : <span className="text-ink-3">not measured by us</span>}</td>
              <td className={td}>{r.confirmation}</td>
              <td className={td}>{r.delay}</td>
              <td className={td}>{r.channels}</td>
              <td className={td}>{r.coverage}</td>
              <td className={td}>{r.oneAlert}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** What the same need costs: 1 configuration at 3 stores, 2 configurations at 5 stores. */
export function CostTable({ st }: { st: ServiceStats }) {
  const rows = [pickupCheckerRow(st), ...OTHER_TRACKER_CLAIMS];
  return (
    <div className="my-5 overflow-x-auto">
      <table className="w-full min-w-[44rem] border-collapse text-sm">
        <caption className="mb-2 text-start text-xs text-ink-3">Monthly cost read from each tracker&apos;s stated plans ({TRACKERS_READ_SHORT}); &quot;per 30 days&quot; where that is how the plan is sold. Our reading of their plan rules, not a quote from them.</caption>
        <thead><tr>{["Tracker", "Stated plans", NEEDS.small.label, NEEDS.large.label].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.name} className="border-b border-line">
              <th scope="row" className="py-2 pe-3 text-start align-top font-medium text-ink">{i === 0 ? r.name : <Ext href={r.url}>{r.name}</Ext>}</th>
              <td className={td}>{r.price}</td>
              <td className={`${td} font-semibold text-ink`}>{r.needSmall}</td>
              <td className={`${td} font-semibold text-ink`}>{r.needLarge}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The short version for /iphone-duo-stock-alerts: interval, alert delay, measured. */
export function TrackerTableShort({ st }: { st: ServiceStats }) {
  const ours = pickupCheckerRow(st);
  const rows = [ours, ...OTHER_TRACKER_CLAIMS];
  return (
    <div className="my-5 overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-sm">
        <caption className="mb-2 text-start text-xs text-ink-3">{note}</caption>
        <thead><tr>{["Tracker", "Check interval, as stated", "Alert delay, as stated", "Measured"].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-line">
              <th scope="row" className="py-2 pe-3 text-start align-top font-medium text-ink">{r === ours ? r.name : <Ext href={r.url}>{r.name}</Ext>}</th>
              <td className={td}>{r.interval}</td>
              <td className={td}>{r.delay}</td>
              <td className={td}>{r === ours ? ours.measured : <span className="text-ink-3">not measured by us</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
