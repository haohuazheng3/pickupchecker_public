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
import { buildTimeline, hourLabel, hourSpan, majorityZone, minuteIn, nextWindow, topHours, zoneName } from "@/lib/restockTimes";
import { Stat, StatGrid } from "@/components/ui/Viz";
import { RestockTimeline, type TimelineRow } from "./RestockTimeline";
import { REPORT_MARK, ReportLegendItem, ReportsNote } from "@/components/restocks/ReportsNote";

type Rule = { active: boolean; model: string; storages: string[]; colors: string[]; storeNumbers: string[] };
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Restocks at the user's stores below which the zone's stores are drawn underneath for context. */
const THIN = 10;
/** Below this many, the user's own restocks show as dots rather than as a pattern of bars. */
const PATTERN = 5;

/** Busiest first: "Fifth Avenue", "Fifth Avenue, SoHo", "Fifth Avenue +3" (short enough for a phone line). */
function storeList(storeNumbers: string[]): string {
  const names = storeNumbers.map((n) => STORE_INDEX.get(n)?.name ?? n);
  return names.length <= 2 ? names.join(", ") : `${names[0]} +${names.length - 1}`;
}
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export async function RestockTimes({ watches }: { watches: Rule[] }) {
  const live = watches.filter((w) => w.active && w.storages.length === 1 && w.colors.length === 1 && w.storeNumbers.length === 1 && STORE_INDEX.has(w.storeNumbers[0]));
  if (live.length === 0) return null;
  const own = [...new Set(live.map((w) => w.storeNumbers[0]))];
  const models = MODELS.filter((m) => live.some((w) => w.model === m.key));
  // Each store's own country's part numbers (an account can watch stores in several countries).
  const countries = [...new Set(own.map((n) => STORE_INDEX.get(n)!.country))];
  const parts = [...new Set(models.flatMap((m) => countries.flatMap((cc) => partNumbersFor(m.key, [], [], cc))))];
  const tz = majorityZone(own.map((n) => storeTimeZone(STORE_INDEX.get(n)!)));
  const zone = zoneName(tz);
  const zoneStores = countries.flatMap((cc) => storesOf(cc)).filter((s) => storeTimeZone(s) === tz).map((s) => s.storeNumber);
  const others = zoneStores.filter((n) => !own.includes(n));

  const [mine, mineSlots, rep, sell] = await Promise.all([restockPattern(own, parts, [], tz), restockSlots(own, parts, tz), restockReportStats(own, tz, 30, undefined, parts), sellouts({ storeNumbers: own, parts })]);
  const thin = mine.total < THIN && others.length > 0;
  const [area, areaSlots] = thin ? await Promise.all([restockPattern(zoneStores, parts, [], tz), restockSlots(others, parts, tz)]) : [null, []];

  const what = models.length === MODELS.length ? "iPhone" : models.map((m) => m.name).join(" and ");
  const yours = own.length === 1 ? "your store" : `your ${own.length} stores`;
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
  const hours = (list: number[]) => [...list].sort((a, b) => a - b).map((h) => hourLabel(h)).join(", ");

  // The timeline: the user's own times, plus the zone's when theirs are few (marked, never merged).
  const ownLine = buildTimeline(mineSlots, 12);
  const areaLine = thin ? buildTimeline(areaSlots, Math.max(6, 12 - ownLine.points.length)) : null;
  // Other trackers' reports at the user's stores: their own rows (dashed), never "next", never merged with ours.
  const repLine = rep ? buildTimeline(rep.slots, 8) : null;
  const rows: TimelineRow[] = [
    ...ownLine.points.map((pt) => ({ min: pt.min, drops: pt.drops, mine: true, where: storeList(pt.stores.map((s) => s.storeNumber)), whereAll: pt.stores.map((s) => `${STORE_INDEX.get(s.storeNumber)?.name ?? s.storeNumber} ${s.drops}×`).join(", ") })),
    ...(areaLine?.points ?? []).map((pt) => ({ min: pt.min, drops: pt.drops, mine: false, where: `${plural(pt.stores.length, "other store")}`, whereAll: pt.stores.map((s) => `${STORE_INDEX.get(s.storeNumber)?.name ?? s.storeNumber} ${s.drops}×`).join(", ") })),
    ...(repLine?.points ?? []).map((pt) => ({ min: pt.min, drops: pt.drops, mine: false, reported: true, where: storeList(pt.stores.map((s) => s.storeNumber)), whereAll: pt.stores.map((s) => `${STORE_INDEX.get(s.storeNumber)?.name ?? s.storeNumber} ${s.drops}×`).join(", ") })),
  ];
  rows.sort((a, b) => a.min - b.min || Number(b.mine) - Number(a.mine) || Number(Boolean(a.reported)) - Number(Boolean(b.reported)));

  return (
    <>
      <section className="pane p-5 sm:p-6" aria-labelledby="restock-times">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 id="restock-times" className="text-xl font-semibold">When your stores restock</h2>
          <span className="text-xs text-ink-3">{what} · {plural(own.length, "store")} · last {mine.days} days · {zone} time</span>
        </div>
        {/* The numbers that used to be a sentence: busiest hour, next window, how long one lasts, how many. */}
        <StatGrid cols={4} className="mt-3">
          {patterned
            ? <Stat size="sm" value={hourLabel(topMine[0])} label={<>busiest hour at {yours}{topMine.length > 1 && <> · then {hours([...topMine].slice(1))}</>}</>} tone="accent" />
            : area && area.total >= PATTERN && <Stat size="sm" value={hourLabel(top[0])} label={<>busiest across all {zoneStores.length} stores on {zone} time</>} tone="muted" />}
          {next && <Stat size="sm" value={hourLabel(next.hour)} label={<>next window · {next.inHours === 0 ? "this hour" : `in ${next.inHours} h`}</>} />}
          {sell.summary.medianSec != null && sell.summary.n >= 3 && <Stat value={sell.summary.medianSec < 120 ? sell.summary.medianSec : Math.round(sell.summary.medianSec / 60)} unit={sell.summary.medianSec < 120 ? "s" : "min"} label="typical listing before it sells out" tone="warn" />}
          <Stat value={mine.total} label={mine.total === 0 ? <>no restocks at {yours} yet · last {mine.days} days</> : <>restocks at {yours} · last {mine.days} days{!patterned && " · too few for a pattern"}</>} tone={mine.total === 0 ? "muted" : "plain"} />
        </StatGrid>

        <div className="mt-5 text-xs text-ink-3">By hour{patterned && <> · busiest in green</>}</div>
        {/* By hour. Yours: bars (busiest three in the accent) once there is a pattern, dots before that; the
            zone's shape in grey underneath while yours are few. A dot under the current hour. */}
        <div className="mt-2 flex h-32 items-end gap-[2px] sm:gap-[3px]" role="img" aria-label={`Restocks by hour at ${yours}, ${zone} time: ${mine.byHour.map((n, h) => `${hourLabel(h)} ${n}${repHour[h] ? ` (+${repHour[h]} reported by other trackers)` : ""}`).join(", ")}`}>
          {mine.byHour.map((n, h) => {
            const bg = area ? (area.byHour[h] / maxArea) * 96 : 0;
            const r = repHour[h];
            const bar = <div className={`relative w-full rounded-t-[3px] ${topMine.includes(h) ? "bg-accent" : area ? "bg-accent/45" : "bg-ink/15"}`} style={{ height: `${(n / maxMine) * 96}px`, minHeight: n > 0 ? 3 : 0 }} />;
            return (
              <div key={h} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${hourSpan(h)}: ${plural(n, "restock")} at ${yours}${area ? ` · ${area.byHour[h]} across ${zone} time` : ""}${r ? ` · ${r} reported by other trackers` : ""}`}>
                <div className="relative flex w-full flex-1 items-end justify-center">
                  {area && <div className="absolute inset-x-0 bottom-0 rounded-t-[3px] bg-ink/10" style={{ height: `${bg}px`, minHeight: area.byHour[h] > 0 ? 3 : 0 }} />}
                  {patterned
                    ? (r > 0 ? <div className="relative flex w-full flex-col justify-end gap-px"><div className={`w-full rounded-t-[3px] ${REPORT_MARK}`} data-series="reported" style={{ height: `${(r / maxMine) * 96}px`, minHeight: 5 }} />{bar}</div> : bar)
                    : (n > 0 || r > 0) && <div className="absolute inset-x-0 flex flex-col-reverse items-center gap-[2px]" style={{ bottom: `${bg + 3}px` }}>{Array.from({ length: Math.min(n, 4) }, (_, i) => <span key={i} className="block h-[5px] w-[5px] rounded-full bg-accent" />)}{Array.from({ length: Math.min(r, 4) }, (_, i) => <span key={`r${i}`} data-series="reported" className={`block h-[6px] w-[6px] rounded-full ${REPORT_MARK}`} />)}</div>}
                </div>
                <span className="flex h-3 items-center text-[9px] leading-3 text-ink-3">{h === nowHour ? <span className="h-1.5 w-1.5 rounded-full bg-ink" aria-label="now" /> : h % 3 === 0 ? hourLabel(h).replace(" AM", "a").replace(" PM", "p") : ""}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-xs text-ink-3">By weekday{(patterned || area) && <> · busiest {DAY_NAMES[peakDay]}</>}</div>
        <div className="mt-2 flex h-16 items-end gap-1.5" role="img" aria-label={`Restocks by weekday at ${yours}: ${mine.byWeekday.map((n, d) => `${DAY_NAMES[d]} ${n}${repDay[d] ? ` (+${repDay[d]} reported by other trackers)` : ""}`).join(", ")}`}>
          {mine.byWeekday.map((n, d) => {
            const bg = area ? (area.byWeekday[d] / maxAreaDay) * 44 : 0;
            const r = repDay[d];
            const bar = <div className={`relative w-full rounded-t-[3px] ${d === peakDay ? "bg-accent" : area ? "bg-accent/45" : "bg-ink/15"}`} style={{ height: `${(n / maxMineDay) * 44}px`, minHeight: n > 0 ? 3 : 0 }} />;
            return (
              <div key={d} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${DAY_NAMES[d]}: ${plural(n, "restock")} at ${yours}${area ? ` · ${area.byWeekday[d]} across ${zone} time` : ""}${r ? ` · ${r} reported by other trackers` : ""}`}>
                <div className="relative flex w-full flex-1 items-end justify-center">
                  {area && <div className="absolute inset-x-0 bottom-0 rounded-t-[3px] bg-ink/10" style={{ height: `${bg}px`, minHeight: area.byWeekday[d] > 0 ? 3 : 0 }} />}
                  {patterned
                    ? (r > 0 ? <div className="relative flex w-full flex-col justify-end gap-px"><div className={`w-full rounded-t-[3px] ${REPORT_MARK}`} data-series="reported" style={{ height: `${(r / maxMineDay) * 44}px`, minHeight: 5 }} />{bar}</div> : bar)
                    : (n > 0 || r > 0) && <div className="absolute inset-x-0 flex flex-col-reverse items-center gap-[2px]" style={{ bottom: `${bg + 3}px` }}>{Array.from({ length: Math.min(n, 4) }, (_, i) => <span key={i} className="block h-[5px] w-[5px] rounded-full bg-accent" />)}{Array.from({ length: Math.min(r, 4) }, (_, i) => <span key={`r${i}`} data-series="reported" className={`block h-[6px] w-[6px] rounded-full ${REPORT_MARK}`} />)}</div>}
                </div>
                <span className="h-3 text-[9px] leading-3 text-ink-3">{DAYS[d]}</span>
              </div>
            );
          })}
        </div>
        {(area || rep) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-3">
            <span className="inline-flex items-center gap-1.5">{patterned ? <span className="h-2.5 w-2.5 rounded-sm bg-accent" /> : <span className="h-[5px] w-[5px] rounded-full bg-accent" />}{own.length === 1 ? "Your store" : `Your ${own.length} stores`}</span>
            {area && <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ink/10" />All {zoneStores.length} stores on {zone} time</span>}
            {rep && <ReportLegendItem reports={rep} round={!patterned} />}
          </div>
        )}
        {rep && <ReportsNote reports={rep} mark={patterned ? "Dashed" : "Hollow dots"} />}
      </section>
      <RestockTimeline rows={rows} nowMin={nowMin} tz={tz} zone={zone} days={mine.days} hidden={ownLine.hidden} yours={yours} mixed={Boolean(areaLine && areaLine.points.length)} {...(repLine?.points.length && rep ? { reported: { sources: rep.sources, models: rep.models, from: rep.from, to: rep.to } } : {})} />
      <section className="pane p-5 sm:p-6" aria-labelledby="sellout-times">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 id="sellout-times" className="text-xl font-semibold">How fast your restocks sell out</h2>
          <span className="text-xs text-ink-3">{what} · {plural(own.length, "store")} · last {sell.summary.days} days</span>
        </div>
        <div className="mt-3"><SellOutTimes data={sell} label={`at ${yours}`} showStore={own.length > 1} limit={15} /></div>
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
