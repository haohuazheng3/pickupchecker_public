/**
 * The measured service figures as tables, tiles and a chart (server components, English): /how-it-works#measured shows
 * the compact versions, /service-report the detailed ones. Data from serviceStats() and serviceHourly(); wording from
 * serviceCopy.ts. Missing data renders as "no data yet", never as 0 s.
 */
import type { ReactNode } from "react";
import { PLANNED_SEC, LANES, secs, type Lane, type ServiceStats, type Window, type DeliveryStats } from "@/lib/content/serviceStats";
import { LANE_LABEL, LANE_UNIT, WINDOW_SHORT, abovePlan, count, share, utcDate, utcHour } from "@/lib/content/serviceCopy";
import type { HourPoint, RestockTimeline } from "@/lib/content/serviceHourly";
import { offsetSec } from "@/lib/content/serviceHourly";
import { Stat, StatGrid } from "@/components/ui/Viz";

const WINDOW_ORDER: Window[] = ["24h", "7d", "30d"];
const th = "border-b border-line-2 py-2 pe-3 text-start font-semibold text-ink whitespace-nowrap";
const td = "py-2 pe-3 align-top tabular-nums whitespace-nowrap";

function Table({ head, children, caption, source, min = "min-w-[34rem]" }: { head: ReactNode[]; children: ReactNode; caption?: ReactNode; source?: ReactNode; min?: string }) {
  return (
    <div className="my-5 overflow-x-auto">
      <table className={`w-full ${min} border-collapse text-sm`}>
        {caption && <caption className="mb-2 text-start text-xs text-ink-3">{caption}</caption>}
        <thead><tr>{head.map((h, k) => <th key={k} scope="col" className={th}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
      {source && <p className="mt-1.5 text-xs text-ink-3">Source: {source}</p>}
    </div>
  );
}

/**
 * Planned vs measured check interval, every lane × window. `detail` adds p99, the longest interval, the share under
 * 10 s (20 s for rounds) and the hours with data.
 */
export function IntervalTable({ st, lanes = LANES, detail = false }: { st: ServiceStats; lanes?: Lane[]; detail?: boolean }) {
  const head = ["Window", "Median", "p95", ...(detail ? ["p99", "Longest"] : []), "Within plan + 1 s", ...(detail ? ["Under 10 s / 20 s"] : []), "Intervals measured", ...(detail ? ["Hours with data"] : [])];
  const cols = head.length;
  return (
    <Table head={head} min={detail ? "min-w-[44rem]" : "min-w-[30rem]"}
      caption={<>Planned vs measured time between two successful checks, by lane. Percentiles from 0.1-second histograms (exact to a tenth of a second). Figures as of {utcHour(st.at)}, refreshed hourly.</>}
      source={<>PickupChecker&apos;s request and round logs, rolled up hourly into check_gaps_hourly; record per lane since the first hour shown.</>}>
      {lanes.map((lane) => (
        <LaneRows key={lane} lane={lane} st={st} detail={detail} cols={cols} />
      ))}
    </Table>
  );
}

function LaneRows({ lane, st, detail, cols }: { lane: Lane; st: ServiceStats; detail: boolean; cols: number }) {
  const since = st.since[lane];
  return (
    <>
      <tr className="border-b border-line bg-[var(--fill-1)]">
        <th scope="rowgroup" colSpan={cols} className="py-2 pe-3 text-start font-semibold text-ink">
          {LANE_LABEL[lane]} <span className="font-normal text-ink-3">· plan {PLANNED_SEC[lane]} s · {LANE_UNIT[lane]} · {since ? <>record since {utcHour(since)}</> : "no record yet"}</span>
        </th>
      </tr>
      {WINDOW_ORDER.map((w) => {
        const s = st.lanes[w][lane];
        if (!s) return (
          <tr key={w} className="border-b border-line"><th scope="row" className="py-2 pe-3 text-start font-medium text-ink">{WINDOW_SHORT[w]}</th><td colSpan={cols - 1} className={`${td} text-ink-3`}>no data in this window yet</td></tr>
        );
        const over = abovePlan(lane, s);
        return (
          <tr key={w} className="border-b border-line">
            <th scope="row" className="py-2 pe-3 text-start font-medium text-ink whitespace-nowrap">{WINDOW_SHORT[w]}{s.hours < (w === "24h" ? 22 : w === "7d" ? 151 : 648) && <span className="block text-[11px] font-normal text-ink-3">from {utcDate(s.from)}</span>}</th>
            <td className={`${td} ${over ? "font-semibold text-warn" : "font-semibold text-ink"}`}>{secs(s.p50Sec)}</td>
            <td className={td}>{secs(s.p95Sec)}</td>
            {detail && <td className={td}>{secs(s.p99Sec)}</td>}
            {detail && <td className={td}>{secs(s.maxSec)}</td>}
            <td className={td}>{share(s.onPlan)}</td>
            {detail && <td className={td}>{share(s.under)}</td>}
            <td className={td}>{count(s.gaps)}</td>
            {detail && <td className={td}>{count(s.hours)}</td>}
          </tr>
        );
      })}
    </>
  );
}

/** First check that saw a restock → the push (mail) service accepted the first alert, per channel and window. */
export function DeliveryTable({ st }: { st: ServiceStats }) {
  const rows: { label: string; w: "7d" | "30d"; d: DeliveryStats | null }[] = [
    { label: "Push", w: "7d", d: st.delivery["7d"].push },
    { label: "Push", w: "30d", d: st.delivery["30d"].push },
    { label: "Email", w: "7d", d: st.delivery["7d"].email },
    { label: "Email", w: "30d", d: st.delivery["30d"].email },
  ];
  return (
    <Table head={["Channel", "Window", "Restocks", "Median", "p90", "p95", "Longest"]}
      caption={<>From the first check that saw the restock to the moment the push service (or the mail service) accepted the first alert for it. Arrival on the device is not measured.</>}
      source={<>PickupChecker&apos;s alert log joined to its restock log; first accepted alert per restock and channel. As of {utcHour(st.at)}.</>}>
      {rows.map((r) => (
        <tr key={`${r.label}-${r.w}`} className="border-b border-line">
          <th scope="row" className="py-2 pe-3 text-start font-medium text-ink">{r.label}</th>
          <td className={td}>{WINDOW_SHORT[r.w]}</td>
          {r.d ? (
            <>
              <td className={td}>{count(r.d.events)}</td>
              <td className={`${td} font-semibold text-ink`}>{secs(r.d.p50Sec)}</td>
              <td className={td}>{secs(r.d.p90Sec)}</td>
              <td className={td}>{secs(r.d.p95Sec)}</td>
              <td className={td}>{secs(r.d.maxSec)}</td>
            </>
          ) : <td colSpan={5} className={`${td} text-ink-3`}>no alerts on this channel in this window</td>}
        </tr>
      ))}
    </Table>
  );
}

/** Four tiles: both fast lanes (7 days), the US full round, and the push delay. Planned values when nothing is measured. */
export function ServiceTiles({ st, className = "" }: { st: ServiceStats; className?: string }) {
  const us = st.lanes["7d"]["fast-us"], intl = st.lanes["7d"]["fast-intl"], round = st.lanes["7d"]["round-us"], push = st.delivery["7d"].push;
  return (
    <StatGrid cols={4} className={className}>
      <Stat value={us ? us.p50Sec.toFixed(1) : `${PLANNED_SEC["fast-us"]}`} unit="s" label={us ? <>median between checks of a US store with an alert · p95 {secs(us.p95Sec)} · plan {PLANNED_SEC["fast-us"]} s</> : <>planned between checks of a store with an alert (not yet measured)</>} tone="accent" />
      <Stat value={intl ? intl.p50Sec.toFixed(1) : "—"} unit={intl ? "s" : undefined} label={intl ? <>the same, other countries · p95 {secs(intl.p95Sec)}{abovePlan("fast-intl", intl) ? " · above plan" : ""}</> : "other countries: no data yet"} tone={abovePlan("fast-intl", intl) ? "warn" : "plain"} />
      <Stat value={round ? (round.p50Sec < 10 ? round.p50Sec.toFixed(1) : `${Math.round(round.p50Sec)}`) : `${PLANNED_SEC["round-us"]}`} unit="s" label={round ? <>median between full rounds of every US store · plan {PLANNED_SEC["round-us"]} s</> : "planned between full rounds of every store"} />
      <Stat value={push ? push.p50Sec.toFixed(1) : "—"} unit={push ? "s" : undefined} label={push ? <>median, first check that saw a restock → push service accepted the alert · {count(push.events)} restocks</> : "push delay: no alerts in the last 7 days"} />
    </StatGrid>
  );
}

/* ------------------------------------------------------------------------------------------- hourly chart */

const CHART_LANES: { lane: Lane; name: string; color: string; dash?: string }[] = [
  { lane: "fast-us", name: "US", color: "var(--accent)" },
  { lane: "fast-intl", name: "Other countries", color: "var(--accent-2)", dash: "5 3" },
];

/**
 * The last 7 days, hour by hour: each fast lane's median (line) and p95 (band) against the 5-second plan. HTML axis
 * labels around a stretched SVG plot, so the text stays readable at phone width; every hour has a native tooltip.
 */
export function HourlyChart({ points, nowIso }: { points: HourPoint[]; nowIso: string }) {
  const end = Math.ceil(new Date(nowIso).getTime() / 3_600_000) * 3_600_000;
  const weekAgo = end - 7 * 24 * 3_600_000;
  const fast = points.filter((p) => (p.lane === "fast-us" || p.lane === "fast-intl") && p.p50Sec != null && new Date(p.hour).getTime() >= weekAgo);
  if (fast.length === 0) return <p className="pane-2 mt-5 p-4 text-sm text-ink-3">The hour-by-hour chart appears once the hourly record has data for the stores with an alert.</p>;
  // A record younger than the window starts the axis at its first hour (an empty left half would read as an outage).
  const firstHour = Math.min(...fast.map((p) => new Date(p.hour).getTime()));
  const start = Math.max(weekAgo, firstHour);
  const span = end - start;
  const yMax = Math.max(10, Math.ceil(Math.max(...fast.map((p) => p.p95Sec ?? p.p50Sec ?? 0)) / 5) * 5);
  const W = 1000, H = 300;
  const x = (iso: string) => ((new Date(iso).getTime() + 1_800_000 - start) / span) * W; // the middle of the hour
  const y = (s: number) => H - (s / yMax) * H;
  const byHour = new Map<string, Partial<Record<Lane, HourPoint>>>();
  for (const p of fast) byHour.set(p.hour, { ...byHour.get(p.hour), [p.lane]: p });
  const hours = [...byHour.keys()].sort();
  const series = CHART_LANES.map((c) => {
    const pts = hours.map((h) => byHour.get(h)![c.lane]).filter((p): p is HourPoint => !!p);
    // Break the line where an hour is missing (no data is a gap, not a straight line across it).
    const segs: HourPoint[][] = [];
    for (const p of pts) {
      const last = segs[segs.length - 1]?.at(-1);
      if (last && new Date(p.hour).getTime() - new Date(last.hour).getTime() <= 3_600_000) segs[segs.length - 1].push(p);
      else segs.push([p]);
    }
    const line = segs.map((s) => s.map((p, i) => `${i ? "L" : "M"}${x(p.hour).toFixed(1)},${y(p.p50Sec!).toFixed(1)}`).join("")).join("");
    const band = segs.filter((s) => s.length > 1).map((s) => `M${s.map((p) => `${x(p.hour).toFixed(1)},${y(p.p95Sec ?? p.p50Sec!).toFixed(1)}`).join("L")}L${[...s].reverse().map((p) => `${x(p.hour).toFixed(1)},${y(p.p50Sec!).toFixed(1)}`).join("L")}Z`).join("");
    const latest = pts.at(-1);
    return { ...c, line, band, latest };
  });
  const ticks = Array.from({ length: yMax / 5 + 1 }, (_, i) => i * 5);
  const days = Array.from({ length: 8 }, (_, i) => (Math.floor(start / 86_400_000) + i + 1) * 86_400_000).filter((t) => t > start && t < end);
  const dayLabel = (t: number) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(new Date(t));
  const plan = PLANNED_SEC["fast-us"];
  return (
    <figure className="mt-5">
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-2">
        {series.map((s) => (
          <span key={s.lane} className="inline-flex items-center gap-2">
            <svg width="22" height="10" aria-hidden><line x1="1" y1="5" x2="21" y2="5" stroke={s.color} strokeWidth="2" strokeDasharray={s.dash} strokeLinecap="round" /></svg>
            {s.name}{s.latest ? <> · last hour: median {secs(s.latest.p50Sec!)}, p95 {secs(s.latest.p95Sec ?? s.latest.p50Sec!)}</> : null}
          </span>
        ))}
        <span className="inline-flex items-center gap-2"><svg width="22" height="10" aria-hidden><line x1="1" y1="5" x2="21" y2="5" stroke="var(--ink-3)" strokeWidth="1.5" strokeDasharray="2 3" /></svg>plan {plan} s</span>
        <span className="text-ink-3">Shaded: median to p95</span>
      </div>
      <div className="relative h-56 sm:h-72">
        <div className="absolute bottom-6 left-0 top-1 w-8" aria-hidden>
          {ticks.map((t) => <span key={t} className="absolute right-1.5 -translate-y-1/2 text-[11px] tabular-nums text-ink-3" style={{ top: `${(1 - t / yMax) * 100}%` }}>{t} s</span>)}
        </div>
        <div className="absolute bottom-6 left-8 right-0 top-1">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible" role="img" aria-label={`Median and p95 check interval per hour over the last 7 days, stores with an alert, US and other countries, against the ${plan}-second plan`}>
            {ticks.map((t) => <line key={t} x1="0" x2={W} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
            {days.map((t) => <line key={t} x1={((t - start) / span) * W} x2={((t - start) / span) * W} y1="0" y2={H} stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
            {series.map((s) => <path key={`b-${s.lane}`} d={s.band} fill={s.color} fillOpacity="0.14" stroke="none" />)}
            <line x1="0" x2={W} y1={y(plan)} y2={y(plan)} stroke="var(--ink-3)" strokeWidth="1.5" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
            {series.map((s) => <path key={`l-${s.lane}`} d={s.line} fill="none" stroke={s.color} strokeWidth="2" strokeDasharray={s.dash} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />)}
            {hours.map((h) => {
              const e = byHour.get(h)!;
              const tip = [`${utcHour(h)}`, ...CHART_LANES.map((c) => { const p = e[c.lane]; return p ? `${c.name}: median ${secs(p.p50Sec!)}, p95 ${secs(p.p95Sec ?? p.p50Sec!)}, ${count(p.gaps)} intervals` : `${c.name}: no data`; })].join("\n");
              const hw = (3_600_000 / span) * W;
              return <rect key={h} x={x(h) - hw / 2} y="0" width={hw} height={H} className="fill-transparent hover:fill-[var(--fill-2)]"><title>{tip}</title></rect>;
            })}
          </svg>
        </div>
        <div className="absolute bottom-0 left-8 right-0 h-5" aria-hidden>
          {days.map((t) => <span key={t} className="absolute top-0.5 -translate-x-1/2 whitespace-nowrap text-[11px] text-ink-3" style={{ left: `${((t - start) / span) * 100}%` }}>{dayLabel(t)}</span>)}
        </div>
      </div>
      <figcaption className="mt-2 text-xs text-ink-3">Each hour&apos;s median (line) and 95th percentile (top of the band) of the time between two successful checks of the same store with an alert, UTC{start > weekAgo ? <>, from the first hour of this record ({utcHour(new Date(start).toISOString())})</> : ", last 7 days"}. Hover an hour for its figures; the daily table has the same data.</figcaption>
    </figure>
  );
}

/** The chart's table view: per UTC day and lane, the median of the hourly medians and the worst hourly p95. */
export function DailyTable({ points }: { points: HourPoint[] }) {
  const days = new Map<string, Partial<Record<Lane, HourPoint[]>>>();
  for (const p of points) {
    if ((p.lane !== "fast-us" && p.lane !== "fast-intl") || p.p50Sec == null) continue;
    const d = p.hour.slice(0, 10);
    const e = days.get(d) ?? {};
    (e[p.lane] ??= []).push(p);
    days.set(d, e);
  }
  if (days.size === 0) return null;
  const mid = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
  const cell = (ps: HourPoint[] | undefined) => ps?.length
    ? <><td className={td}>{secs(Math.round(mid(ps.map((p) => p.p50Sec!)) * 10) / 10)}</td><td className={td}>{secs(Math.max(...ps.map((p) => p.p95Sec ?? p.p50Sec!)))}</td><td className={td}>{count(ps.reduce((a, p) => a + p.gaps, 0))}</td></>
    : <td colSpan={3} className={`${td} text-ink-3`}>no data</td>;
  return (
    <Table min="min-w-[40rem]" head={["Day (UTC)", "US median", "US worst hour p95", "US intervals", "Other countries median", "Worst hour p95", "Intervals"]}>
      {[...days.keys()].sort().reverse().map((d) => (
        <tr key={d} className="border-b border-line">
          <th scope="row" className="py-2 pe-3 text-start font-medium text-ink whitespace-nowrap">{utcDate(`${d}T12:00:00Z`)}</th>
          {cell(days.get(d)!["fast-us"])}
          {cell(days.get(d)!["fast-intl"])}
        </tr>
      ))}
    </Table>
  );
}

/* --------------------------------------------------------------------------------------- one restock */

export interface TimelineNames { store: string; place: string; config: string; localTime: string }

/** One real restock, stage by stage, as offsets from the first answer that listed it. */
export function RestockTimelineView({ t, names }: { t: RestockTimeline; names: TimelineNames }) {
  const off = (iso: string | null) => offsetSec(t.firstSeen, iso);
  const fmt = (v: number | null) => (v == null ? "not in the log" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)} s`);
  const steps: { at: number | null; title: string; hint: string; muted?: boolean }[] = [
    { at: off(t.prevCheck), title: "Previous check: not listed", hint: "the last successful answer for this store before the restock, which did not list the configuration; the listing appeared some time after it" },
    { at: 0, title: "First observed", hint: "the first answer from apple.com that listed it; every delay on this site starts here" },
    { at: off(t.confirmed), title: "Confirmed by a second answer", hint: "the store was asked again and the answer agreed; only now does it count as a restock" },
    { at: off(t.handed), title: "Handed to the push service", hint: "alerting for this restock started" },
    { at: off(t.acceptedFirst), title: t.pushes > 1 ? `Accepted by the push service (first of ${count(t.pushes)} pushes)` : "Accepted by the push service", hint: t.pushes > 1 && t.acceptedLast ? `the last of them at ${fmt(off(t.acceptedLast))}` : "Apple's, Google's or Mozilla's push service took the alert" },
    { at: null, title: "On the phone: not measured", hint: "the push service delivers it from here; we cannot see when a device shows it", muted: true },
    { at: off(t.lastListed), title: "Last check that still listed it", hint: "Apple's pickup page was still offering it at this answer" },
    { at: off(t.goneSeen), title: "First check that saw it gone", hint: "so the listing lasted somewhere between these two checks" },
  ];
  return (
    <div className="mt-5">
      <div className="eyebrow">{names.store} · {names.place} · {names.config} · first observed {names.localTime} local time</div>
      <ol className="mt-3 grid gap-2">
        {steps.map((s, i) => (
          <li key={i} className={`grid grid-cols-[5.5rem_1fr] gap-3 rounded-[var(--radius-3)] border border-line p-3 ${s.muted ? "bg-transparent text-ink-3" : "bg-[var(--fill-1)]"}`}>
            <span className={`display text-lg tabular-nums ${s.muted ? "text-ink-3" : "text-ink"}`}>{s.muted ? "—" : fmt(s.at)}</span>
            <span className="min-w-0 text-sm leading-snug"><span className={`block font-semibold ${s.muted ? "text-ink-3" : "text-ink"}`}>{s.title}</span><span className="mt-0.5 block text-xs text-ink-3">{s.hint}</span></span>
          </li>
        ))}
      </ol>
    </div>
  );
}
