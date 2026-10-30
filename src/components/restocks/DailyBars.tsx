import type { PlaceStats } from "@/lib/stock/queries";

function shortDay(key: string): string {
  const [, m, d] = key.split("-");
  return `${Number(m)}/${Number(d)}`;
}

/** 30-day daily bars: restocks (accent) stacked over sell-outs (muted). Says so in one sentence when there is nothing. */
export function DailyBars({ stats, label }: { stats: PlaceStats; label: string }) {
  const total = stats.daily.reduce((n, d) => n + d.restocks + d.soldouts, 0);
  if (total === 0 || stats.daily.length === 0) return <p className="text-sm text-ink-2">No restock or sell-out has been logged {label} in the last {stats.days} days — the chart fills in from the first one.</p>;
  const max = Math.max(1, ...stats.daily.map((d) => d.restocks + d.soldouts));
  const busiest = stats.daily.reduce((a, b) => (b.restocks > a.restocks ? b : a), stats.daily[0]);
  const activeDays = stats.daily.filter((d) => d.restocks > 0).length;
  return (
    <div>
      <p className="text-sm text-ink-2">
        {stats.month} restock{stats.month === 1 ? "" : "s"} and {stats.soldouts} sell-out{stats.soldouts === 1 ? "" : "s"} {label} over the last {stats.days} days, on {activeDays} different day{activeDays === 1 ? "" : "s"}.
        {busiest.restocks > 0 && <> The busiest day was <b className="text-ink">{shortDay(busiest.day)}</b> with {busiest.restocks}.</>}
      </p>
      <div className="mt-3 flex h-24 items-end gap-[2px]" role="img" aria-label={stats.daily.map((d) => `${shortDay(d.day)}: ${d.restocks} restocks, ${d.soldouts} sell-outs`).join("; ")}>
        {stats.daily.map((d, i) => (
          <div key={d.day} className="flex min-w-0 flex-1 flex-col items-center justify-end" title={`${shortDay(d.day)}: ${d.restocks} restocks · ${d.soldouts} sell-outs`}>
            <div className="w-full rounded-t-[2px] bg-accent" style={{ height: `${(d.restocks / max) * 72}px`, minHeight: d.restocks ? 2 : 0 }} />
            <div className="w-full bg-ink/20" style={{ height: `${(d.soldouts / max) * 72}px`, minHeight: d.soldouts ? 2 : 0 }} />
            <span className="mt-1 h-3 text-[9px] leading-3 text-ink-3">{i % 5 === 0 || i === stats.daily.length - 1 ? shortDay(d.day) : ""}</span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-4 text-xs text-ink-3"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-accent" />restocks</span><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-ink/20" />sell-outs</span></div>
    </div>
  );
}
