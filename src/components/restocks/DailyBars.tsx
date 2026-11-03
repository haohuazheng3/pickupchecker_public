import type { PlaceStats } from "@/lib/stock/queries";
import { t, pageLocale } from "@/lib/i18n/server";
import { LANG_TAG } from "@/lib/i18n/format";
import type { Lang } from "@/lib/i18n/locales";

/** "2026-10-26" → "10/26" (other languages: their numeric month and day, "26.10."). */
function shortDay(key: string, lang: Lang): string {
  const [y, m, d] = key.split("-").map(Number);
  if (lang === "en") return `${m}/${d}`;
  return new Intl.DateTimeFormat(LANG_TAG[lang], { month: "numeric", day: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** 30-day daily bars: restocks (accent) stacked over sell-outs (muted). Says so in one sentence when there is nothing. */
export function DailyBars({ stats, label }: { stats: PlaceStats; label: string }) {
  const w = t().modules.daily;
  const lang = pageLocale().lang;
  const total = stats.daily.reduce((n, d) => n + d.restocks + d.soldouts, 0);
  if (total === 0 || stats.daily.length === 0) return <p className="text-sm text-ink-2">{w.empty(label, stats.days)}</p>;
  const max = Math.max(1, ...stats.daily.map((d) => d.restocks + d.soldouts));
  const busiest = stats.daily.reduce((a, b) => (b.restocks > a.restocks ? b : a), stats.daily[0]);
  const activeDays = stats.daily.filter((d) => d.restocks > 0).length;
  return (
    <div>
      <p className="text-sm text-ink-2">
        {w.summary(stats.month, stats.soldouts, label, stats.days, activeDays)}
        {busiest.restocks > 0 && w.busiest(shortDay(busiest.day, lang), busiest.restocks)}
      </p>
      <div className="mt-3 flex h-24 items-end gap-[2px]" role="img" aria-label={stats.daily.map((d) => w.barAria(shortDay(d.day, lang), d.restocks, d.soldouts)).join("; ")}>
        {stats.daily.map((d, i) => (
          <div key={d.day} className="flex min-w-0 flex-1 flex-col items-center justify-end" title={w.barTitle(shortDay(d.day, lang), d.restocks, d.soldouts)}>
            <div className="w-full rounded-t-[2px] bg-accent" style={{ height: `${(d.restocks / max) * 72}px`, minHeight: d.restocks ? 2 : 0 }} />
            <div className="w-full bg-ink/20" style={{ height: `${(d.soldouts / max) * 72}px`, minHeight: d.soldouts ? 2 : 0 }} />
            <span className="mt-1 h-3 text-[9px] leading-3 text-ink-3">{i % 5 === 0 || i === stats.daily.length - 1 ? shortDay(d.day, lang) : ""}</span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-4 text-xs text-ink-3"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-accent" />{w.legendRestocks}</span><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-ink/20" />{w.legendSoldouts}</span></div>
    </div>
  );
}
