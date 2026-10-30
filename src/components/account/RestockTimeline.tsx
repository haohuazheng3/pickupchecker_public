"use client";
/**
 * The restock timeline (account page): each time of day restocks landed at the user's stores over the
 * window, earliest at the top, with "now" placed among them. Gaps between lines grow with the time between
 * (capped), and the stretch from now to the next one is drawn dashed with its length in words. The minute
 * ticks on the client in the stores' zone; the first render uses the server's, so hydration matches.
 */
import { useEffect, useState } from "react";
import { clockLabel, gapLabel, minuteIn, placeNow } from "@/lib/restockTimes";

export interface TimelineRow { min: number; drops: number; where: string; whereAll: string }
interface Props { rows: TimelineRow[]; nowMin: number; tz: string; zone: string; days: number; hidden: number; scope: string }

/** One line's height (h-8) and the space above a line for `min` minutes since the one before. */
const ROW = 32;
const gapPx = (min: number) => Math.round(Math.min(40, 4 + min * 0.1));
/** Columns: time · rail · stores · how often. The rail's centre and the stores' left edge, for overlays. */
const COLS = "grid-cols-[4.5rem_1.25rem_minmax(0,1fr)_auto] gap-x-2.5";
const RAIL_X = "left-[5.75rem]";

export function RestockTimeline({ rows, nowMin, tz, zone, days, hidden, scope }: Props) {
  const [now, setNow] = useState(nowMin);
  useEffect(() => {
    const tick = () => setNow(minuteIn(tz));
    const t = window.setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(t); document.removeEventListener("visibilitychange", tick); };
  }, [tz]);

  const at = placeNow(rows, now);
  const max = Math.max(1, ...rows.map((r) => r.drops));
  const soon = at.inMin === 0 ? "about now" : `in ${gapLabel(at.inMin)}`;

  const items: React.ReactNode[] = [];
  const nowLine = (pad: number) => (
    <li key="now" aria-current="time" aria-label={`Now, ${clockLabel(now)}${at.next != null ? `. Next restock time ${soon}` : ""}`} className={`relative grid items-center ${COLS}`} style={{ paddingTop: pad }}>
      <span className="text-right text-sm font-bold tabular-nums text-accent">{clockLabel(now)}</span>
      <span className="relative z-10 flex h-8 items-center justify-center"><span className="dot dot-ok dot-live" /></span>
      <span className="col-span-2 flex min-w-0 items-center gap-2">
        <span className="h-[2px] flex-1 rounded-full bg-accent/40" />
        <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--accent-ink)" }}>Now</span>
      </span>
    </li>
  );
  rows.forEach((r, i) => {
    if (i === at.before) items.push(nowLine(i === 0 ? 0 : gapPx(now - rows[i - 1].min)));
    const isNext = at.next === i;
    const passed = i < at.before; // earlier today (in the tomorrow case: all of them)
    const dim = passed && !isNext;
    const sinceAbove = i === at.before ? r.min - now : i === 0 ? 0 : r.min - rows[i - 1].min;
    const pad = i === 0 && at.before !== 0 ? 0 : isNext && !at.tomorrow ? Math.max(28, gapPx(sinceAbove)) : gapPx(sinceAbove);
    const size = r.drops >= 4 ? 12 : r.drops >= 2 ? 10 : 8;
    items.push(
      <li key={r.min} className={`relative grid items-center ${COLS}`} style={{ paddingTop: pad }}
        aria-label={`${clockLabel(r.min)}: ${r.drops} restock${r.drops === 1 ? "" : "s"} at ${r.where}${isNext ? (at.tomorrow ? ", next, tomorrow" : ", next") : ""}`}>
        {isNext && !at.tomorrow && (
          <>
            <span aria-hidden className={`absolute top-0 ${RAIL_X} -translate-x-1/2 border-l-2 border-dashed border-accent/70`} style={{ height: pad + ROW / 2 }} />
            <span aria-hidden className="absolute left-[7rem] text-xs font-semibold text-accent" style={{ top: Math.max(0, pad / 2 - 8) }}>{soon}</span>
          </>
        )}
        <span className={`text-right text-sm tabular-nums ${isNext ? "font-semibold text-accent" : dim ? "text-ink-3" : "font-medium text-ink"}`}>{clockLabel(r.min)}</span>
        <span className="relative z-10 flex h-8 items-center justify-center">
          <span className={`block rounded-full ${isNext ? "bg-accent ring-4 ring-accent/15" : dim ? "bg-ink/20" : "bg-accent/60"}`} style={{ width: size, height: size }} />
        </span>
        <span className={`min-w-0 truncate text-sm ${dim ? "text-ink-3" : "text-ink-2"}`} title={r.whereAll}>
          {r.where}
          {isNext && at.tomorrow && <span className="ml-2 rounded-full bg-accent/12 px-2 py-0.5 text-[11px] font-semibold text-accent">tomorrow</span>}
        </span>
        <span className="flex items-center gap-1.5" title={`${r.drops} restock${r.drops === 1 ? "" : "s"} around this time in the last ${days} days`}>
          <span className="flex w-10 justify-end sm:w-28"><span className={`h-1.5 rounded-full ${dim ? "bg-ink/12" : "bg-accent/45"}`} style={{ width: `${Math.max(14, Math.round((100 * r.drops) / max))}%` }} /></span>
          <span className="w-7 text-right text-xs tabular-nums text-ink-3">{r.drops}×</span>
        </span>
      </li>,
    );
  });
  if (rows.length > 0 && at.before === rows.length) items.push(nowLine(gapPx(now - rows[rows.length - 1].min)));

  return (
    <section className="pane mt-6 p-5 sm:p-6" aria-labelledby="restock-timeline">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <h2 id="restock-timeline" className="text-xl font-semibold">Restock timeline</h2>
        <span className="rounded-full border border-line-2 px-2.5 py-0.5 text-[11px] font-medium text-ink-2">Past restocks · not a forecast</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">
        Built from restocks at {scope} over the last {days} days, in {zone} time, earliest first; a longer bar means more often. It shows when restocks have happened, not when the next one will: treat it as a guide.
      </p>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-ink-3">Nothing yet. This fills in as restocks happen.</p>
      ) : (
        <>
          <ol className="relative mt-5 max-w-3xl" aria-label={`Restock times, ${zone} time`}>
            <span aria-hidden className={`absolute top-4 bottom-4 ${RAIL_X} w-px -translate-x-1/2 bg-line-2`} />
            {items}
          </ol>
          {at.tomorrow && <p className="mt-3 pl-[7rem] text-xs font-semibold text-accent">Next: {clockLabel(rows[0].min)} tomorrow, {soon}</p>}
          {hidden > 0 && <p className="mt-3 text-xs text-ink-3">The {rows.length} busiest times; {hidden} restock{hidden === 1 ? "" : "s"} at quieter times aren&apos;t listed.</p>}
        </>
      )}
    </section>
  );
}
