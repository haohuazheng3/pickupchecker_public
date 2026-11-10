/**
 * The account page's two restock modules, both about the stores the user has alerts at (and their phones'
 * models): "When your stores restock" (hours and weekdays restocks land, last 30 days, in the stores' time
 * zone) and the restock timeline (each time of day they landed, earliest first, "now" placed among them).
 * Adding or removing a store changes both. While the user's stores have had few restocks, every other store
 * in that time zone is drawn faintly underneath (grey bars, hollow timeline dots) so there is a shape to
 * read — never in place of the user's own. Other trackers' published reports at the user's stores, when there
 * are any, are drawn as their own dashed series (stacked over ours, legend + footnote) and never counted.
 */
import { MODELS, STORE_INDEX, partNumbersFor, storeTimeZone, storesOf } from "@/lib/apple/catalog";
import { restockPattern, restockReportStats, restockSlots } from "@/lib/stock/queries";
import { sellouts } from "@/lib/stock/sellouts";
import { SellOutTimes } from "@/components/restocks/SellOutTimes";
import { buildTimeline, clockIn, hourLabel, hourSpan, majorityZone, minuteIn, nextWindow, topHours, zoneName } from "@/lib/restockTimes";
import { Stat, StatGrid } from "@/components/ui/Viz";
import { RestockTimeline, type TimelineRow } from "./RestockTimeline";
import { REPORT_MARK, ReportLegendItem, ReportsNote } from "@/components/restocks/ReportsNote";
import { pageLocale, t } from "@/lib/i18n/server";
import { LANG_TAG, hour, list, weekdays } from "@/lib/i18n/format";
import { storeLabel } from "@/lib/i18n/places";
import type { Lang } from "@/lib/i18n/locales";

type Rule = { active: boolean; model: string; storages: string[]; colors: string[]; storeNumbers: string[] };
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Words that follow the reader's language (the person's, on the dashboard). English keeps the module's own forms
 * ("9 AM", "10–11 AM", "Eastern", "Monday", "S"); another language gets Intl's (and a zone name that already says "time").
 */
function words(lang: Lang) {
  const en = lang === "en";
  const long = en ? DAY_NAMES : weekdays(lang, "long"), short = en ? DAYS : weekdays(lang, "short");
  return {
    hour: (h: number) => (en ? hourLabel(h) : hour(lang, h)),
    span: (h: number) => (en ? hourSpan(h) : `${hour(lang, h)}–${hour(lang, (h + 1) % 24)}`),
    /** Every third hour under the chart: "9a" / "9". */
    tick: (h: number) => (en ? hourLabel(h).replace(" AM", "a").replace(" PM", "p") : String(h)),
    zone: (tz: string) => (en ? zoneName(tz) : new Intl.DateTimeFormat(LANG_TAG[lang], { timeZone: tz, timeZoneName: "longGeneric" }).formatToParts(new Date()).find((x) => x.type === "timeZoneName")?.value ?? zoneName(tz)),
    day: (d: number) => long[d],
    letter: (d: number) => short[d],
    /** Clock-ordered hours after the busiest: "1 PM, 6 PM". */
    join: (xs: string[]) => (en ? xs.join(", ") : list(lang, xs, xs.length)),
    /** The models watched: "iPhone Duo and iPhone 18 Pro". */
    and: (xs: string[], sep: string) => (en ? xs.join(sep) : list(lang, xs, xs.length)),
    store: (n: string) => { const s = STORE_INDEX.get(n); return s ? (en ? s.name : storeLabel(s, lang)) : n; },
  };
}
/** Restocks at the user's stores below which the zone's stores are drawn underneath for context. */
const THIN = 10;
/** Below this many, the user's own restocks show as dots rather than as a pattern of bars. */
const PATTERN = 5;

/** Busiest first: "Fifth Avenue", "Fifth Avenue, SoHo", "Fifth Avenue +3" (short enough for a phone line). */
function storeList(storeNumbers: string[], name: (n: string) => string): string {
  const names = storeNumbers.map(name);
  return names.length <= 2 ? names.join(", ") : `${names[0]} +${names.length - 1}`;
}

export async function RestockTimes({ watches }: { watches: Rule[] }) {
  const d = t().account.restock, u = t().account.units;
  const w = words(pageLocale().lang);
  const live = watches.filter((w) => w.active && w.storages.length === 1 && w.colors.length === 1 && w.storeNumbers.length === 1 && STORE_INDEX.has(w.storeNumbers[0]));
  if (live.length === 0) return null;
  const own = [...new Set(live.map((w) => w.storeNumbers[0]))];
  const models = MODELS.filter((m) => live.some((w) => w.model === m.key));
  // Each store's own country's part numbers (an account can watch stores in several countries).
  const countries = [...new Set(own.map((n) => STORE_INDEX.get(n)!.country))];
  const parts = [...new Set(models.flatMap((m) => countries.flatMap((cc) => partNumbersFor(m.key, [], [], cc))))];
  const tz = majorityZone(own.map((n) => storeTimeZone(STORE_INDEX.get(n)!)));
  const zone = w.zone(tz);
  const zoneStores = countries.flatMap((cc) => storesOf(cc)).filter((s) => storeTimeZone(s) === tz).map((s) => s.storeNumber);
  const others = zoneStores.filter((n) => !own.includes(n));

  const [mine, mineSlots, rep, sell] = await Promise.all([restockPattern(own, parts, [], tz), restockSlots(own, parts, tz), restockReportStats(own, tz, 30, undefined, parts), sellouts({ storeNumbers: own, parts })]);
  const thin = mine.total < THIN && others.length > 0;
  const [area, areaSlots] = thin ? await Promise.all([restockPattern(zoneStores, parts, [], tz), restockSlots(others, parts, tz)]) : [null, []];

  const what = models.length === MODELS.length ? d.anyIphone : w.and(models.map((m) => m.name), d.and);
  const yours = d.yours(own.length);
  const patterned = mine.total >= PATTERN;
  const basis = patterned ? mine : area && area.total >= PATTERN ? area : null; // whose hours the sentence names
  const top = basis ? topHours(basis.byHour, 3) : [];
  const nowMin = minuteIn(tz);
  const nowHour = Math.floor(nowMin / 60);
  const next = basis ? nextWindow(top, nowHour) : null;
  const peakOf = (byWeekday: number[]) => byWeekday.indexOf(Math.max(...byWeekday));
  const peakDay = peakOf((patterned ? mine : area ?? mine).byWeekday);
  // Other trackers' reports stack on our bars (one scale for both); without any, the scale is ours alone, as always.
  const repHour = rep?.byHour ?? Array(24).fill(0) as number[], repDay = rep?.byWeekday ?? Array(7).fill(0) as number[];
  const maxMine = Math.max(1, ...mine.byHour.map((n, h) => n + repHour[h])), maxMineDay = Math.max(1, ...mine.byWeekday.map((n, d) => n + repDay[d]));
  const maxArea = Math.max(1, ...(area?.byHour ?? [0])), maxAreaDay = Math.max(1, ...(area?.byWeekday ?? [0]));
  const topMine = patterned ? topHours(mine.byHour, 3) : [];
  // Named in clock order (the chart already shows which is busiest).
  const hours = (hs: number[]) => w.join([...hs].sort((a, b) => a - b).map((h) => w.hour(h)));

  // The timeline: the user's own times, plus the zone's when theirs are few (marked, never merged).
  const ownLine = buildTimeline(mineSlots, 12);
  const areaLine = thin ? buildTimeline(areaSlots, Math.max(6, 12 - ownLine.points.length)) : null;
  const rows: TimelineRow[] = [
    ...ownLine.points.map((pt) => ({ min: pt.min, drops: pt.drops, mine: true, where: storeList(pt.stores.map((s) => s.storeNumber), w.store), whereAll: pt.stores.map((s) => `${w.store(s.storeNumber)} ${s.drops}×`).join(", ") })),
    ...(areaLine?.points ?? []).map((pt) => ({ min: pt.min, drops: pt.drops, mine: false, where: d.otherStores(pt.stores.length), whereAll: pt.stores.map((s) => `${w.store(s.storeNumber)} ${s.drops}×`).join(", ") })),
  ];
  rows.sort((a, b) => a.min - b.min || Number(b.mine) - Number(a.mine));

  return (
    <>
      <section className="pane p-5 sm:p-6" aria-labelledby="restock-times">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 id="restock-times" className="text-xl font-semibold">{d.title}</h2>
          <span className="text-xs text-ink-3">{d.meta(what, own.length, mine.days, zone)}</span>
        </div>
        {/* The numbers that used to be a sentence: busiest hour, next window, how long one lasts, how many. */}
        <StatGrid cols={4} className="mt-3">
          {patterned
            ? <Stat size="sm" value={w.hour(topMine[0])} label={d.busiest(yours, topMine.length > 1 ? hours([...topMine].slice(1)) : null)} tone="accent" />
            : area && area.total >= PATTERN && <Stat size="sm" value={w.hour(top[0])} label={d.busiestArea(zoneStores.length, zone)} tone="muted" />}
          {next && <Stat size="sm" value={w.hour(next.hour)} label={d.next(next.inHours)} />}
          {sell.summary.medianSec != null && sell.summary.n >= 3 && <Stat value={sell.summary.medianSec < 120 ? sell.summary.medianSec : Math.round(sell.summary.medianSec / 60)} unit={sell.summary.medianSec < 120 ? u.s : u.min} label={d.typical} tone="warn" />}
          <Stat value={mine.total} label={d.count(yours, mine.days, mine.total, patterned)} tone={mine.total === 0 ? "muted" : "plain"} />
        </StatGrid>

        <div className="mt-5 text-xs text-ink-3">{d.byHour(patterned)}</div>
        {/* By hour. Yours: bars (busiest three in the accent) once there is a pattern, dots before that; the
            zone's shape in grey underneath while yours are few. A dot under the current hour. */}
        <div className="mt-2 flex h-32 items-end gap-[2px] sm:gap-[3px]" role="img" aria-label={d.hourChart(yours, zone, mine.byHour.map((n, h) => d.chartItem(w.hour(h), n, repHour[h])).join(", "))}>
          {mine.byHour.map((n, h) => {
            const bg = area ? (area.byHour[h] / maxArea) * 96 : 0;
            const r = repHour[h];
            const bar = <div className={`relative w-full rounded-t-[3px] ${topMine.includes(h) ? "bg-accent" : area ? "bg-accent/45" : "bg-ink/15"}`} style={{ height: `${(n / maxMine) * 96}px`, minHeight: n > 0 ? 3 : 0 }} />;
            return (
              <div key={h} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={d.barTitle(w.span(h), n, yours, area ? { n: area.byHour[h], zone } : null, r)}>
                <div className="relative flex w-full flex-1 items-end justify-center">
                  {area && <div className="absolute inset-x-0 bottom-0 rounded-t-[3px] bg-ink/10" style={{ height: `${bg}px`, minHeight: area.byHour[h] > 0 ? 3 : 0 }} />}
                  {patterned
                    ? (r > 0 ? <div className="relative flex w-full flex-col justify-end gap-px"><div className={`w-full rounded-t-[3px] ${REPORT_MARK}`} data-series="reported" style={{ height: `${(r / maxMine) * 96}px`, minHeight: 5 }} />{bar}</div> : bar)
                    : (n > 0 || r > 0) && <div className="absolute inset-x-0 flex flex-col-reverse items-center gap-[2px]" style={{ bottom: `${bg + 3}px` }}>{Array.from({ length: Math.min(n, 4) }, (_, i) => <span key={i} className="block h-[5px] w-[5px] rounded-full bg-accent" />)}{Array.from({ length: Math.min(r, 4) }, (_, i) => <span key={`r${i}`} data-series="reported" className={`block h-[6px] w-[6px] rounded-full ${REPORT_MARK}`} />)}</div>}
                </div>
                <span className="flex h-3 items-center text-[9px] leading-3 text-ink-3">{h === nowHour ? <span className="h-1.5 w-1.5 rounded-full bg-ink" aria-label={d.now} /> : h % 3 === 0 ? w.tick(h) : ""}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-xs text-ink-3">{d.byWeekday(patterned || area ? w.day(peakDay) : null)}</div>
        <div className="mt-2 flex h-16 items-end gap-1.5" role="img" aria-label={d.weekdayChart(yours, mine.byWeekday.map((n, i) => d.chartItem(w.day(i), n, repDay[i])).join(", "))}>
          {mine.byWeekday.map((n, i) => {
            const bg = area ? (area.byWeekday[i] / maxAreaDay) * 44 : 0;
            const r = repDay[i];
            const bar = <div className={`relative w-full rounded-t-[3px] ${i === peakDay ? "bg-accent" : area ? "bg-accent/45" : "bg-ink/15"}`} style={{ height: `${(n / maxMineDay) * 44}px`, minHeight: n > 0 ? 3 : 0 }} />;
            return (
              <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={d.barTitle(w.day(i), n, yours, area ? { n: area.byWeekday[i], zone } : null, r)}>
                <div className="relative flex w-full flex-1 items-end justify-center">
                  {area && <div className="absolute inset-x-0 bottom-0 rounded-t-[3px] bg-ink/10" style={{ height: `${bg}px`, minHeight: area.byWeekday[i] > 0 ? 3 : 0 }} />}
                  {patterned
                    ? (r > 0 ? <div className="relative flex w-full flex-col justify-end gap-px"><div className={`w-full rounded-t-[3px] ${REPORT_MARK}`} data-series="reported" style={{ height: `${(r / maxMineDay) * 44}px`, minHeight: 5 }} />{bar}</div> : bar)
                    : (n > 0 || r > 0) && <div className="absolute inset-x-0 flex flex-col-reverse items-center gap-[2px]" style={{ bottom: `${bg + 3}px` }}>{Array.from({ length: Math.min(n, 4) }, (_, i) => <span key={i} className="block h-[5px] w-[5px] rounded-full bg-accent" />)}{Array.from({ length: Math.min(r, 4) }, (_, i) => <span key={`r${i}`} data-series="reported" className={`block h-[6px] w-[6px] rounded-full ${REPORT_MARK}`} />)}</div>}
                </div>
                <span className="h-3 text-[9px] leading-3 text-ink-3">{w.letter(i)}</span>
              </div>
            );
          })}
        </div>
        {(area || rep) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-3">
            <span className="inline-flex items-center gap-1.5">{patterned ? <span className="h-2.5 w-2.5 rounded-sm bg-accent" /> : <span className="h-[5px] w-[5px] rounded-full bg-accent" />}{d.Yours(own.length)}</span>
            {area && <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ink/10" />{d.allZone(zoneStores.length, zone)}</span>}
            {rep && <ReportLegendItem reports={rep} round={!patterned} />}
          </div>
        )}
        {rep && <ReportsNote reports={rep} mark={patterned ? d.reportMarkBars : d.reportMarkDots} />}
      </section>
      <RestockTimeline rows={rows} nowMin={nowMin} clocks={Object.fromEntries([nowMin, ...rows.map((r) => r.min)].map((m) => [m, clockIn(pageLocale().lang, m)]))} tz={tz} zone={zone} days={mine.days} hidden={ownLine.hidden} yours={yours} Yours={d.Yours(own.length)} mixed={Boolean(areaLine && areaLine.points.length)} />
      <section className="pane p-5 sm:p-6" aria-labelledby="sellout-times">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 id="sellout-times" className="text-xl font-semibold">{d.sellTitle}</h2>
          <span className="text-xs text-ink-3">{d.sellMeta(what, own.length, sell.summary.days)}</span>
        </div>
        <div className="mt-3"><SellOutTimes data={sell} label={d.sellLabel(yours)} showStore={own.length > 1} limit={15} /></div>
      </section>
    </>
  );
}

/** Same footprint while the numbers load, so nothing below jumps. */
export function RestockTimesSkeleton() {
  return (
    <>
      <section className="pane p-5 sm:p-6" aria-hidden>
        <div className="skeleton h-6 w-56" />
        <div className="skeleton mt-3 h-4 w-full max-w-xl" />
        <div className="mt-4 flex h-32 items-end gap-[3px]">{Array.from({ length: 24 }, (_, i) => <div key={i} className="skeleton flex-1" style={{ height: `${20 + ((i * 37) % 60)}%` }} />)}</div>
        <div className="skeleton mt-6 h-16 w-full" />
      </section>
      <section className="pane p-5 sm:p-6" aria-hidden>
        <div className="skeleton h-6 w-44" />
        <div className="skeleton mt-3 h-4 w-full max-w-lg" />
        <div className="mt-5 space-y-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-6 w-full" />)}</div>
      </section>
    </>
  );
}
