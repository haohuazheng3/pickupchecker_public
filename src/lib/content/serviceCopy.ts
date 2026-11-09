/**
 * How the site words its measured service figures (serviceStats.ts) in English: lane names, the one quotable sentence
 * per topic, and the honest fallbacks when a lane has no data yet. Pure, so /how-it-works, /service-report, the tracker
 * comparison and llms.txt say the same thing and tests can pin it. Strings use the Inline markup (**bold**).
 *
 * Rules (the owner's brief, 2026-11-09): every figure names its window and its sample; a record shorter than the
 * window says where it starts; "accepted by the push service" is never "on your phone"; a lane running above its plan
 * says so; no figure ever reads "0 s" for missing data.
 */
import { PLANNED_SEC, WINDOWS, secs, type DeliveryStats, type Lane, type LaneStats, type ServiceStats, type Window } from "./serviceStats";

export const LANE_LABEL: Record<Lane, string> = {
  "fast-us": "Stores with an alert, US",
  "fast-intl": "Stores with an alert, other countries",
  "round-us": "Every store, US (full round)",
  "round-intl": "Every store, other countries (full round)",
};
/** What one interval of the lane is. */
export const LANE_UNIT: Record<Lane, string> = {
  "fast-us": "time between two successful answers for the same store",
  "fast-intl": "time between two successful answers for the same store",
  "round-us": "time between the starts of two full rounds of every store",
  "round-intl": "time between the starts of two full rounds of every store",
};
export const WINDOW_LABEL: Record<Window, string> = { "24h": "last 24 hours", "7d": "last 7 days", "30d": "last 30 days" };
export const WINDOW_SHORT: Record<Window, string> = { "24h": "24 h", "7d": "7 days", "30d": "30 days" };

export const count = (x: number) => Math.round(x).toLocaleString("en-US");
/** Whole-percent share; "<1%" and ">99%" at the edges, so a rounding never reads as never or always. */
export function share(x: number): string {
  if (x > 0 && x < 0.005) return "<1%";
  if (x < 1 && x > 0.995) return ">99%";
  return `${Math.round(x * 100)}%`;
}
/** "Nov 6, 2026" (UTC). */
export function utcDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}
/** "Nov 6, 2026, 01:00 UTC". */
export function utcHour(iso: string): string {
  const d = new Date(iso);
  return `${utcDate(iso)}, ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} UTC`;
}

/** Whether the lane's record covers (nearly) the whole window; a shorter record must say where it starts. */
export function coversWindow(s: LaneStats, w: Window): boolean {
  return s.hours >= WINDOWS[w] * 24 * 0.9;
}
/** "over the last 7 days" or, for a shorter record, "since Nov 6, 2026 (when this record starts)". */
export function windowPhrase(s: LaneStats, w: Window): string {
  return coversWindow(s, w) ? `over the ${WINDOW_LABEL[w]}` : `since ${utcDate(s.from)} (when this record starts)`;
}
/** True when the measured median runs more than half a second over the plan. */
export function abovePlan(lane: Lane, s: LaneStats | null): boolean {
  return !!s && s.p50Sec > PLANNED_SEC[lane] + 0.5;
}
/** "median 5.0 s, p95 5.4 s". */
export const medianP95 = (s: LaneStats) => `median ${secs(s.p50Sec)}, p95 ${secs(s.p95Sec)}`;

/**
 * The one quotable sentence about check intervals, for the window: both fast lanes against the plan, then the
 * full rounds. Null when the US fast lane has no data (the page then states the plan only).
 */
export function intervalSentence(st: ServiceStats, w: Window = "7d"): string | null {
  const us = st.lanes[w]["fast-us"];
  if (!us) return null;
  const intl = st.lanes[w]["fast-intl"];
  const round = st.lanes[w]["round-us"];
  const plan = PLANNED_SEC["fast-us"];
  const intlPart = intl
    ? ` and **${secs(intl.p50Sec)}** in the other countries (p95 ${secs(intl.p95Sec)}${abovePlan("fast-intl", intl) ? ", above the plan" : ""})`
    : "";
  const roundPart = round ? `; full rounds of every US store ran a median ${secs(round.p50Sec)} apart against a ${PLANNED_SEC["round-us"]}-second plan` : "";
  const when = windowPhrase(us, w);
  return `Measured ${when}, a store with an alert was checked a median **${secs(us.p50Sec)}** after the previous successful check in the US (p95 ${secs(us.p95Sec)}, ${count(us.gaps)} intervals)${intlPart}, against a ${plan}-second plan${roundPart}.`;
}

/** The plan alone, for when nothing is measured yet. */
export const PLAN_ONLY = `The plan is a check every ${PLANNED_SEC["fast-us"]} s for stores with an alert and every ${PLANNED_SEC["round-us"]} s for every store; the measured intervals appear here once the hourly record has data.`;

/** One channel's delay as a clause: "a median 1.9 s (p90 5.3 s, p95 6.2 s; 3,085 restocks)". */
export function delayClause(d: DeliveryStats): string {
  return `a median **${secs(d.p50Sec)}** (p90 ${secs(d.p90Sec)}, p95 ${secs(d.p95Sec)}; ${count(d.events)} restock${d.events === 1 ? "" : "s"})`;
}

/**
 * The one quotable sentence about alerts: first check that saw the restock → push (or mail) service accepted the
 * first alert. Always ends by saying arrival on the phone is not measured. Null without push data.
 */
export function deliverySentence(st: ServiceStats, w: "7d" | "30d" = "7d"): string | null {
  const push = st.delivery[w].push;
  if (!push) return null;
  const email = st.delivery[w].email;
  const mail = email ? `; email alerts were accepted by the mail service ${delayClause(email).replace(/\*\*/g, "")}` : "";
  return `Over the ${WINDOW_LABEL[w]}, the push service (Apple, Google or Mozilla) accepted the first alert ${delayClause(push)} after the first check that saw the restock${mail}. When it then appears on a phone is not something we can see, so it is not measured.`;
}

/** Push outcomes over 7 days as one line, or null with no pushes. */
export function outcomesLine(st: ServiceStats): string | null {
  const o = st.push7d;
  const total = o.accepted + o.rejected;
  if (total === 0) return null;
  return `${count(o.accepted)} pushes accepted and ${count(o.rejected)} rejected by the push services in the last 7 days (${share(o.accepted / total)} accepted); ${count(o.retiredDevices)} device${o.retiredDevices === 1 ? "" : "s"} retired by them as no longer subscribed.`;
}

/** The international fast lane's known limit, stated plainly when it runs above plan; null when it does not. */
export function intlLimit(st: ServiceStats, w: Window = "7d"): string | null {
  const s = st.lanes[w]["fast-intl"];
  if (!abovePlan("fast-intl", s)) return null;
  return `Outside the US, stores with an alert are checked less often than planned: a median ${secs(s!.p50Sec)} and a p95 of ${secs(s!.p95Sec)} ${windowPhrase(s!, w)}, against the ${PLANNED_SEC["fast-intl"]}-second plan (${share(s!.onPlan)} of intervals within ${PLANNED_SEC["fast-intl"] + 1} s).`;
}

/** A plain-text line for llms.txt (no markup), built from the same figures; null parts drop out. */
export function llmsServiceLine(st: ServiceStats, base: string): string {
  const us = st.lanes["7d"]["fast-us"];
  const intl = st.lanes["7d"]["fast-intl"];
  const round = st.lanes["7d"]["round-us"];
  const push = st.delivery["7d"].push;
  const plan = `Planned check interval: ${PLANNED_SEC["fast-us"]} s for stores a paid alert points at, ${PLANNED_SEC["round-us"]} s for every store.`;
  const measured = us
    ? ` Measured ${windowPhrase(us, "7d")}: US stores with an alert ${medianP95(us)} between two successful checks (${count(us.gaps)} intervals)${intl ? `; other countries ${medianP95(intl)}${abovePlan("fast-intl", intl) ? " (above plan)" : ""}` : ""}${round ? `; full US rounds median ${secs(round.p50Sec)}` : ""}.`
    : " Measured intervals: not yet available.";
  const alerts = push
    ? ` From the first check that saw a restock to the push service accepting the first alert: median ${secs(push.p50Sec)}, p90 ${secs(push.p90Sec)}, p95 ${secs(push.p95Sec)} (${count(push.events)} restocks, 7 days); arrival on the phone is not measured.`
    : "";
  return `- Service figures (live, cached an hour; ${base}/service-report): ${plan}${measured}${alerts} Other trackers' intervals are their own claims, compared at ${base}/iphone-stock-tracker-comparison.`;
}
