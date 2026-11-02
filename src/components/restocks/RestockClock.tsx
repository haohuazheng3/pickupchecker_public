import type { RestockStats } from "@/lib/stock/queries";
import type { ReportSeries } from "@/lib/restockReports";
import { REPORT_MARK, ReportLegendItem, ReportsNote } from "./ReportsNote";

const HOURS = ["12a", "", "", "3a", "", "", "6a", "", "", "9a", "", "", "12p", "", "", "3p", "", "", "6p", "", "", "9p", "", ""];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** Sentences name the day in full: "Thu" + "s" read as the word "Thus". */
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Our restocks as solid bars. With other trackers' reports, each bar carries a hollow, dashed segment on top
 * for them (one scale for both, so heights compare); without, the markup is exactly what it always was.
 */
function Bars({ values, labels, peak, extra }: { values: number[]; labels: string[]; peak: number; extra?: number[] }) {
  const max = Math.max(1, ...values.map((v, i) => v + (extra?.[i] ?? 0)));
  if (extra) {
    return (
      <div className="flex h-24 items-end gap-[3px]" role="img" aria-label={values.map((v, i) => `${labels[i] || i}: ${v}${extra[i] ? ` (+${extra[i]} reported by other trackers)` : ""}`).join(", ")}>
        {values.map((v, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <div className="flex w-full flex-col justify-end gap-px">
              {extra[i] > 0 && <div className={`w-full rounded-t-[3px] ${REPORT_MARK}`} data-series="reported" style={{ height: `${(extra[i] / max) * 72}px`, minHeight: 5 }} title={`${labels[i] || i}: ${extra[i]} reported by other trackers`} />}
              <div className={`w-full rounded-t-[3px] ${i === peak && v > 0 ? "bg-accent" : "bg-accent-2"}`} style={{ height: `${(v / max) * 72}px`, minHeight: v > 0 ? 3 : 0 }} title={`${labels[i] || i}: ${v}`} />
            </div>
            <span className="h-3 text-[9px] leading-3 text-ink-3">{labels[i]}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex h-24 items-end gap-[3px]" role="img" aria-label={values.map((v, i) => `${labels[i] || i}: ${v}`).join(", ")}>
      {values.map((v, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
          <div className={`w-full rounded-t-[3px] ${i === peak && v > 0 ? "bg-accent" : "bg-accent-2"}`} style={{ height: `${(v / max) * 72}px`, minHeight: v > 0 ? 3 : 0 }} title={`${labels[i] || i}: ${v}`} />
          <span className="h-3 text-[9px] leading-3 text-ink-3">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

function fmtHour(h: number): string {
  const ap = h < 12 ? "AM" : "PM";
  return `${h % 12 === 0 ? 12 : h % 12} ${ap}`;
}

/**
 * "When does this store restock?" — local hour-of-day and weekday histograms over the last 30 days. The sentence
 * and its numbers are our own restocks only; other trackers' reports (`reports`, same zone and window) are drawn
 * as a separate, labelled series under them, never counted.
 */
export function RestockClock({ stats, label, reports }: { stats: RestockStats; label: string; reports?: ReportSeries | null }) {
  const peakHour = stats.byHour.indexOf(Math.max(...stats.byHour));
  const peakDay = stats.byWeekday.indexOf(Math.max(...stats.byWeekday));
  const thin = stats.total < 5;
  const zone = stats.tz.split("/").pop()?.replace(/_/g, " ") ?? stats.tz;
  const rep = reports && reports.total > 0 ? reports : null;
  return (
    <div>
      <p className="text-sm text-ink-2">
        {stats.total === 0 ? `No restocks recorded ${label} in the last ${stats.days} days yet.` : thin ? `${stats.total} restock${stats.total === 1 ? "" : "s"} ${label} in the last ${stats.days} days — too few to call a pattern yet.` : <>{stats.total} restocks {label} in the last {stats.days} days. Most arrive around <b className="text-ink">{fmtHour(peakHour)}</b> local time, and <b className="text-ink">{DAY_NAMES[peakDay]}</b> is the busiest day.</>}
      </p>
      {(stats.total > 0 || rep) && (
        <div className="mt-4 grid gap-6 sm:grid-cols-[3fr_2fr]">
          <div><div className="mb-2 text-xs text-ink-3">By hour · {zone} time</div><Bars values={stats.byHour} labels={HOURS} peak={peakHour} extra={rep?.byHour} /></div>
          <div><div className="mb-2 text-xs text-ink-3">By weekday</div><Bars values={stats.byWeekday} labels={DAYS} peak={peakDay} extra={rep?.byWeekday} /></div>
        </div>
      )}
      {rep && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-3">
            <span className="inline-flex items-center gap-1.5" data-series="ours"><span aria-hidden className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm bg-accent-2" />Confirmed by PickupChecker</span>
            <ReportLegendItem reports={rep} />
          </div>
          <ReportsNote reports={rep} />
        </>
      )}
    </div>
  );
}
