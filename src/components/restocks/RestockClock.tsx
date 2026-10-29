import type { RestockStats } from "@/lib/stock/queries";

const HOURS = ["12a", "", "", "3a", "", "", "6a", "", "", "9a", "", "", "12p", "", "", "3p", "", "", "6p", "", "", "9p", "", ""];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Bars({ values, labels, peak }: { values: number[]; labels: string[]; peak: number }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex h-24 items-end gap-[3px]" role="img" aria-label={values.map((v, i) => `${labels[i] || i}: ${v}`).join(", ")}>
      {values.map((v, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
          <div className={`w-full rounded-t-[3px] ${i === peak && v > 0 ? "bg-accent" : "bg-[#3987e5]"}`} style={{ height: `${(v / max) * 72}px`, minHeight: v > 0 ? 3 : 0 }} title={`${labels[i] || i}: ${v}`} />
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

/** "When does this store restock?" — local hour-of-day and weekday histograms over the last 30 days. */
export function RestockClock({ stats, label }: { stats: RestockStats; label: string }) {
  const peakHour = stats.byHour.indexOf(Math.max(...stats.byHour));
  const peakDay = stats.byWeekday.indexOf(Math.max(...stats.byWeekday));
  const thin = stats.total < 5;
  const zone = stats.tz.split("/").pop()?.replace(/_/g, " ") ?? stats.tz;
  return (
    <div>
      <p className="text-sm text-ink-2">
        {stats.total === 0 ? `No restocks recorded ${label} in the last ${stats.days} days yet.` : thin ? `${stats.total} restock${stats.total === 1 ? "" : "s"} ${label} in the last ${stats.days} days — too few to call a pattern yet.` : <>{stats.total} restocks {label} in the last {stats.days} days. Most arrive around <b className="text-ink">{fmtHour(peakHour)}</b> local time, and <b className="text-ink">{DAYS[peakDay]}s</b> are the busiest day.</>}
      </p>
      {stats.total > 0 && (
        <div className="mt-4 grid gap-6 sm:grid-cols-[3fr_2fr]">
          <div><div className="mb-2 text-xs text-ink-3">By hour · {zone} time</div><Bars values={stats.byHour} labels={HOURS} peak={peakHour} /></div>
          <div><div className="mb-2 text-xs text-ink-3">By weekday</div><Bars values={stats.byWeekday} labels={DAYS} peak={peakDay} /></div>
        </div>
      )}
    </div>
  );
}
