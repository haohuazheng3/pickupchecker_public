import type { RestockStats } from "@/lib/stock/queries";
import type { ReportSeries } from "@/lib/restockReports";
import { t, pageLocale } from "@/lib/i18n/server";
import { hour, weekdays } from "@/lib/i18n/format";
import type { Lang } from "@/lib/i18n/locales";
import { zoneName } from "@/components/stores/StoreInfo";
import { REPORT_MARK, ReportLegendItem, ReportsNote } from "./ReportsNote";

const HOURS = ["12a", "", "", "3a", "", "", "6a", "", "", "9a", "", "", "12p", "", "", "3p", "", "", "6p", "", "", "9p", "", ""];
/** Hour ticks under the bars: English "12a" … "9p", other languages the 24-hour clock (0, 3 … 21). */
const hourTicks = (lang: Lang) => (lang === "en" ? HOURS : HOURS.map((_, h) => (h % 3 === 0 ? String(h) : "")));

/**
 * Our restocks as solid bars. With other trackers' reports, each bar carries a hollow, dashed segment on top
 * for them (one scale for both, so heights compare); without, the markup is exactly what it always was.
 */
function Bars({ values, labels, peak, extra }: { values: number[]; labels: string[]; peak: number; extra?: number[] }) {
  const d = t().modules.clock;
  const max = Math.max(1, ...values.map((v, i) => v + (extra?.[i] ?? 0)));
  if (extra) {
    return (
      <div className="flex h-24 items-end gap-[3px]" role="img" aria-label={values.map((v, i) => `${labels[i] || i}: ${v}${extra[i] ? d.barReported(extra[i]) : ""}`).join(", ")}>
        {values.map((v, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <div className="flex w-full flex-col justify-end gap-px">
              {extra[i] > 0 && <div className={`w-full rounded-t-[3px] ${REPORT_MARK}`} data-series="reported" style={{ height: `${(extra[i] / max) * 72}px`, minHeight: 5 }} title={d.barReportedTitle(`${labels[i] || i}`, extra[i])} />}
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

/**
 * "When does this store restock?" — local hour-of-day and weekday histograms over the last 30 days. The sentence
 * and its numbers are our own restocks only; other trackers' reports (`reports`, same zone and window) are drawn
 * as a separate, labelled series under them, never counted.
 */
export function RestockClock({ stats, label, reports }: { stats: RestockStats; label: string; reports?: ReportSeries | null }) {
  const d = t().modules.clock;
  const lang = pageLocale().lang;
  const peakHour = stats.byHour.indexOf(Math.max(...stats.byHour));
  const peakDay = stats.byWeekday.indexOf(Math.max(...stats.byWeekday));
  // Same rule as peakOf: a pattern from 5 restocks on 3 days, a busiest weekday only over 14 days.
  const thin = stats.total < 5 || (stats.dates ?? Infinity) < 3;
  const weekday = (stats.spanDays ?? Infinity) >= 14;
  const rep = reports && reports.total > 0 ? reports : null;
  return (
    <div>
      <p className="text-sm text-ink-2">
        {stats.total === 0
          ? d.none(label, stats.days)
          : thin
            ? d.thin(stats.total, label, stats.days, stats.dates != null && stats.dates < 3 ? stats.dates : null)
            : d.pattern(stats.total, label, stats.days, hour(lang, peakHour), weekday ? weekdays(lang, "long")[peakDay] : null)}
      </p>
      {(stats.total > 0 || rep) && (
        <div className="mt-4 grid gap-6 sm:grid-cols-[3fr_2fr]">
          <div><div className="mb-2 text-xs text-ink-3">{d.byHour(zoneName(stats.tz, lang))}</div><Bars values={stats.byHour} labels={hourTicks(lang)} peak={peakHour} extra={rep?.byHour} /></div>
          <div><div className="mb-2 text-xs text-ink-3">{d.byWeekday}</div><Bars values={stats.byWeekday} labels={weekdays(lang, "short")} peak={peakDay} extra={rep?.byWeekday} /></div>
        </div>
      )}
      {rep && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-3">
            <span className="inline-flex items-center gap-1.5" data-series="ours"><span aria-hidden className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm bg-accent-2" />{d.legendOurs}</span>
            <ReportLegendItem reports={rep} />
          </div>
          <ReportsNote reports={rep} />
        </>
      )}
    </div>
  );
}
