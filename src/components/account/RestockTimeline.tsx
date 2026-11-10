"use client";
/**
 * The restock timeline (account page): each time of day restocks landed at the user's stores over the
 * window, earliest at the top, with "now" placed among them. Gaps between lines grow with the time between
 * (capped), and the stretch from now to the next one is drawn dashed with its length in words. While the
 * user's stores have had few restocks, times from the other stores in their zone are mixed in, hollow and
 * grey. Only our own measured restocks are listed (other trackers' reports are
 * left out of this module: owner, 2026-11-10). The minute ticks on the client in the stores' zone; the
 * first render uses the server's minute and the server's clock strings (`clocks`): Safari's Intl writes some
 * languages' times differently from Node's ("20:03" for "20 h 03"), which made React discard the page (#418).
 */
import { useEffect, useState } from "react";
import { clockIn, gapLabel, minuteIn, placeNow } from "@/lib/restockTimes";
import { useLang, useT } from "@/components/i18n/LangProvider";
import { fill, plural, secs } from "@/lib/i18n/format";
import type { Lang } from "@/lib/i18n/locales";

export interface TimelineRow { min: number; drops: number; mine: boolean; where: string; whereAll: string }
/**
 * `zone`: "Eastern" in English, the full zone name in another language (the dictionary's templates say which).
 * `Yours`: `yours` at the start of a line ("Your 2 stores"); English derives it.
 */
interface Props { rows: TimelineRow[]; nowMin: number; tz: string; zone: string; days: number; hidden: number; yours: string; Yours?: string; mixed: boolean; /** Minute of the day → its clock string, as the server wrote it (every row and `nowMin`). */ clocks?: Record<number, string> }

/** 125 → "2 h 5 min" (English) / "2 Std. 5 Min.". */
function gapOf(lang: Lang, min: number): string {
  return lang === "en" ? gapLabel(min) : secs(lang, min * 60);
}

/** One line's height (h-8) and the space above a line for `min` minutes since the one before. */
const ROW = 32;
const gapPx = (min: number) => Math.round(Math.min(40, 4 + min * 0.1));
/** Columns: time · rail · stores · how often. The rail's centre, for overlays. */
const COLS = "grid-cols-[4.5rem_1.25rem_minmax(0,1fr)_auto] gap-x-2.5";
const RAIL_X = "start-[5.75rem]";

export function RestockTimeline({ rows, nowMin, tz, zone, days, hidden, yours, Yours = yours.replace(/^your/, "Your"), mixed, clocks }: Props) {
  const d = useT().account.timeline;
  const lang = useLang();
  const hm = (min: number) => clocks?.[min] ?? clockIn(lang, min);
  const [now, setNow] = useState(nowMin);
  useEffect(() => {
    const tick = () => setNow(minuteIn(tz));
    const t = window.setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(t); document.removeEventListener("visibilitychange", tick); };
  }, [tz]);

  const at = placeNow(rows, now);
  // One scale for every line, the user's and the other stores' alike, so the bars compare honestly.
  const max = Math.max(1, ...rows.map((r) => r.drops));
  const soon = at.inMin === 0 ? d.aboutNow : fill(d.in, { gap: gapOf(lang, at.inMin) });
  const anyMine = rows.some((r) => r.mine);

  const items: React.ReactNode[] = [];
  const nowLine = (pad: number) => (
    <li key="now" aria-current="time" aria-label={`${fill(d.nowLabel, { time: hm(now) })}${at.next != null ? fill(d.nowNext, { soon }) : ""}`} className={`relative grid items-center ${COLS}`} style={{ paddingTop: pad }}>
      <span className="text-end text-sm font-bold tabular-nums text-accent">{hm(now)}</span>
      <span className="relative z-10 flex h-8 items-center justify-center"><span className="dot dot-ok dot-live" /></span>
      <span className="col-span-2 flex min-w-0 items-center gap-2">
        <span className="h-[2px] flex-1 rounded-full bg-accent/40" />
        <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--accent-ink)" }}>{d.now}</span>
      </span>
    </li>
  );
  rows.forEach((r, i) => {
    if (i === at.before) items.push(nowLine(i === 0 ? 0 : gapPx(now - rows[i - 1].min)));
    const isNext = at.next === i;
    const dim = i < at.before && !isNext; // passed earlier today
    const sinceAbove = i === at.before ? r.min - now : i === 0 ? 0 : r.min - rows[i - 1].min;
    const pad = i === 0 && at.before !== 0 ? 0 : isNext && !at.tomorrow ? Math.max(28, gapPx(sinceAbove)) : gapPx(sinceAbove);
    const size = r.drops >= 4 ? 12 : r.drops >= 2 ? 10 : 8;
    const node = r.mine
        ? <span className={`block rounded-full ${isNext ? "bg-accent ring-4 ring-accent/15" : dim ? "bg-ink/20" : "bg-accent/60"}`} style={{ width: size, height: size }} />
        : <span className={`block rounded-full border-[1.5px] bg-[var(--pane-solid)] ${isNext ? "border-accent ring-4 ring-accent/15" : dim ? "border-ink/20" : "border-ink/35"}`} style={{ width: size, height: size }} />;
    items.push(
      <li key={`${r.mine ? "m" : "a"}${r.min}`} className={`relative grid items-center ${COLS}`} style={{ paddingTop: pad }}
        aria-label={`${fill(plural(lang, r.drops, r.mine ? d.rowMine : d.rowArea), { time: hm(r.min), n: r.drops, where: r.where, zone })}${isNext ? (at.tomorrow ? d.rowNextTomorrow : d.rowNext) : ""}`}>
        {isNext && !at.tomorrow && (
          <>
            <span aria-hidden className={`absolute top-0 ${RAIL_X} -translate-x-1/2 border-s-2 border-dashed border-accent/70`} style={{ height: pad + ROW / 2 }} />
            <span aria-hidden className="absolute start-[7rem] text-xs font-semibold text-accent" style={{ top: Math.max(0, pad / 2 - 8) }}>{soon}</span>
          </>
        )}
        <span className={`text-end text-sm tabular-nums ${isNext ? "font-semibold text-accent" : dim || !r.mine ? "text-ink-3" : "font-medium text-ink"}`}>{hm(r.min)}</span>
        <span className="relative z-10 flex h-8 items-center justify-center">{node}</span>
        <span className={`min-w-0 truncate text-sm ${dim || !r.mine ? "text-ink-3" : "text-ink-2"}`} title={r.whereAll}>
          {r.where}
          {isNext && at.tomorrow && <span className="ms-2 rounded-full bg-accent/12 px-2 py-0.5 text-[11px] font-semibold text-accent">{d.tomorrow}</span>}
        </span>
        <span className="flex items-center gap-1.5" title={fill(plural(lang, r.drops, d.often), { n: r.drops, days })}>
          <span className="flex w-10 justify-end sm:w-28"><span className={`h-1.5 rounded-full ${dim || !r.mine ? "bg-ink/12" : "bg-accent/45"}`} style={{ width: `${Math.max(14, Math.round((100 * r.drops) / max))}%` }} /></span>
          <span className="w-7 text-end text-xs tabular-nums text-ink-3">{r.drops}×</span>
        </span>
      </li>,
    );
  });
  if (rows.length > 0 && at.before === rows.length) items.push(nowLine(gapPx(now - rows[rows.length - 1].min)));

  return (
    <section className="pane p-5 sm:p-6" aria-labelledby="restock-timeline">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <h2 id="restock-timeline" className="text-xl font-semibold">{d.title}</h2>
        <span className="rounded-full border border-line-2 px-2.5 py-0.5 text-[11px] font-medium text-ink-2">{d.badge}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-3">
        <span>{fill(d.window, { yours: Yours, days })}</span><span>{fill(d.order, { zone })}</span><span>{d.bars}</span>
        {mixed && <span>{anyMine ? d.mixedSome : d.mixedNone}</span>}
      </div>
      {mixed && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-3">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent/70" />{Yours}</span>
          {mixed && <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full border-[1.5px] border-ink/35" />{fill(d.otherStores, { zone })}</span>}
        </div>
      )}
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-ink-3">{d.empty}</p>
      ) : (
        <>
          <ol className="relative mt-5 max-w-3xl" aria-label={fill(d.listLabel, { zone })}>
            <span aria-hidden className={`absolute top-4 bottom-4 ${RAIL_X} w-px -translate-x-1/2 bg-line-2`} />
            {items}
          </ol>
          {at.tomorrow && at.next != null && <p className="mt-3 ps-[7rem] text-xs font-semibold text-accent">{fill(d.nextTomorrow, { time: hm(rows[at.next].min), soon })}</p>}
          {hidden > 0 && <p className="mt-3 text-xs text-ink-3">{fill(plural(lang, hidden, d.hidden), { n: hidden })}</p>}
        </>
      )}
    </section>
  );
}
