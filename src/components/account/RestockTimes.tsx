/**
 * The account page's two restock modules, both about the stores the user has alerts at (and their phones'
 * models): "When your stores restock" (hours and weekdays restocks land, last 30 days, in the stores' time
 * zone) and the restock timeline (each time of day they landed, earliest first, "now" placed among them).
 * Adding or removing a store changes both. While the user's stores have had few restocks, every other store
 * in that time zone is drawn faintly underneath (grey bars, hollow timeline dots) so there is a shape to
 * read — never in place of the user's own.
 */
import { MODELS, STORES, STORE_INDEX, partNumbersFor, storeTimeZone } from "@/lib/apple/catalog";
import { placeStats, restockPattern, restockSlots } from "@/lib/stock/queries";
import { buildTimeline, hourLabel, hourSpan, majorityZone, minuteIn, nextWindow, topHours, zoneName } from "@/lib/restockTimes";
import { fmtDuration } from "@/lib/seo/enrich";
import { RestockTimeline, type TimelineRow } from "./RestockTimeline";

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
  const parts = models.flatMap((m) => partNumbersFor(m.key));
  const tz = majorityZone(own.map((n) => storeTimeZone(STORE_INDEX.get(n)!)));
  const zone = zoneName(tz);
  const zoneStores = STORES.filter((s) => storeTimeZone(s) === tz).map((s) => s.storeNumber);
  const others = zoneStores.filter((n) => !own.includes(n));

  const [mine, mineSlots, stay] = await Promise.all([restockPattern(own, parts, [], tz), restockSlots(own, parts, tz), placeStats({ storeNumbers: own, parts, tz })]);
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
  const maxMine = Math.max(1, ...mine.byHour), maxMineDay = Math.max(1, ...mine.byWeekday);
  const maxArea = Math.max(1, ...(area?.byHour ?? [0])), maxAreaDay = Math.max(1, ...(area?.byWeekday ?? [0]));
  const topMine = patterned ? topHours(mine.byHour, 3) : [];
  // Named in clock order (the chart already shows which is busiest).
  const hours = (list: number[]) => [...list].sort((a, b) => a - b).map((h, i, all) => <span key={h}>{i > 0 && (i === all.length - 1 ? " and " : ", ")}<b className="text-ink">{hourSpan(h)}</b></span>);

  // The timeline: the user's own times, plus the zone's when theirs are few (marked, never merged).
  const ownLine = buildTimeline(mineSlots, 12);
  const areaLine = thin ? buildTimeline(areaSlots, Math.max(6, 12 - ownLine.points.length)) : null;
  const rows: TimelineRow[] = [
    ...ownLine.points.map((pt) => ({ min: pt.min, drops: pt.drops, mine: true, where: storeList(pt.stores.map((s) => s.storeNumber)), whereAll: pt.stores.map((s) => `${STORE_INDEX.get(s.storeNumber)?.name ?? s.storeNumber} ${s.drops}×`).join(", ") })),
    ...(areaLine?.points ?? []).map((pt) => ({ min: pt.min, drops: pt.drops, mine: false, where: `${plural(pt.stores.length, "other store")}`, whereAll: pt.stores.map((s) => `${STORE_INDEX.get(s.storeNumber)?.name ?? s.storeNumber} ${s.drops}×`).join(", ") })),
  ].sort((a, b) => a.min - b.min || Number(b.mine) - Number(a.mine));

  return (
    <>
      <section className="pane mt-6 p-5 sm:p-6" aria-labelledby="restock-times">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 id="restock-times" className="text-xl font-semibold">When your stores restock</h2>
          <span className="text-xs text-ink-3">{what} · {plural(own.length, "store")} · last {mine.days} days · {zone} time</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          {patterned
            ? <>At {yours}, most land at {hours(topMine)} {zone} time.</>
            : <>{mine.total === 0 ? `No restocks at ${yours} yet` : `${plural(mine.total, "restock")} at ${yours} so far`}, too few to call a pattern.{area && area.total >= PATTERN && <> Across all {zoneStores.length} stores on {zone} time, most land at {hours(top)}.</>}</>}
          {next && <> Next: <b className="text-ink">{hourLabel(next.hour)}</b>{next.inHours === 0 ? ", this hour" : `, in ${next.inHours} h`}.</>}
          {stay.medianMs != null && stay.medianSamples >= 5 && <> One usually lasts <b className="text-ink">{fmtDuration(stay.medianMs)}</b> before it sells out.</>}
        </p>

        {/* By hour. Yours: bars (busiest three in the accent) once there is a pattern, dots before that; the
            zone's shape in grey underneath while yours are few. A dot under the current hour. */}
        <div className="mt-4 flex h-32 items-end gap-[2px] sm:gap-[3px]" role="img" aria-label={`Restocks by hour at ${yours}, ${zone} time: ${mine.byHour.map((n, h) => `${hourLabel(h)} ${n}`).join(", ")}`}>
          {mine.byHour.map((n, h) => {
            const bg = area ? (area.byHour[h] / maxArea) * 96 : 0;
            return (
              <div key={h} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${hourSpan(h)}: ${plural(n, "restock")} at ${yours}${area ? ` · ${area.byHour[h]} across ${zone} time` : ""}`}>
                <div className="relative flex w-full flex-1 items-end justify-center">
                  {area && <div className="absolute inset-x-0 bottom-0 rounded-t-[3px] bg-ink/10" style={{ height: `${bg}px`, minHeight: area.byHour[h] > 0 ? 3 : 0 }} />}
                  {patterned
                    ? <div className={`relative w-full rounded-t-[3px] ${topMine.includes(h) ? "bg-accent" : area ? "bg-accent/45" : "bg-ink/15"}`} style={{ height: `${(n / maxMine) * 96}px`, minHeight: n > 0 ? 3 : 0 }} />
                    : n > 0 && <div className="absolute inset-x-0 flex flex-col-reverse items-center gap-[2px]" style={{ bottom: `${bg + 3}px` }}>{Array.from({ length: Math.min(n, 4) }, (_, i) => <span key={i} className="block h-[5px] w-[5px] rounded-full bg-accent" />)}</div>}
                </div>
                <span className="flex h-3 items-center text-[9px] leading-3 text-ink-3">{h === nowHour ? <span className="h-1.5 w-1.5 rounded-full bg-ink" aria-label="now" /> : h % 3 === 0 ? hourLabel(h).replace(" AM", "a").replace(" PM", "p") : ""}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-xs text-ink-3">By weekday{(patterned || area) && <> · busiest {DAY_NAMES[peakDay]}</>}</div>
        <div className="mt-2 flex h-16 items-end gap-1.5" role="img" aria-label={`Restocks by weekday at ${yours}: ${mine.byWeekday.map((n, d) => `${DAY_NAMES[d]} ${n}`).join(", ")}`}>
          {mine.byWeekday.map((n, d) => {
            const bg = area ? (area.byWeekday[d] / maxAreaDay) * 44 : 0;
            return (
              <div key={d} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${DAY_NAMES[d]}: ${plural(n, "restock")} at ${yours}${area ? ` · ${area.byWeekday[d]} across ${zone} time` : ""}`}>
                <div className="relative flex w-full flex-1 items-end justify-center">
                  {area && <div className="absolute inset-x-0 bottom-0 rounded-t-[3px] bg-ink/10" style={{ height: `${bg}px`, minHeight: area.byWeekday[d] > 0 ? 3 : 0 }} />}
                  {patterned
                    ? <div className={`relative w-full rounded-t-[3px] ${d === peakDay ? "bg-accent" : area ? "bg-accent/45" : "bg-ink/15"}`} style={{ height: `${(n / maxMineDay) * 44}px`, minHeight: n > 0 ? 3 : 0 }} />
                    : n > 0 && <div className="absolute inset-x-0 flex flex-col-reverse items-center gap-[2px]" style={{ bottom: `${bg + 3}px` }}>{Array.from({ length: Math.min(n, 4) }, (_, i) => <span key={i} className="block h-[5px] w-[5px] rounded-full bg-accent" />)}</div>}
                </div>
                <span className="h-3 text-[9px] leading-3 text-ink-3">{DAYS[d]}</span>
              </div>
            );
          })}
        </div>
        {area && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-3">
            <span className="inline-flex items-center gap-1.5">{patterned ? <span className="h-2.5 w-2.5 rounded-sm bg-accent" /> : <span className="h-[5px] w-[5px] rounded-full bg-accent" />}{own.length === 1 ? "Your store" : `Your ${own.length} stores`}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ink/10" />All {zoneStores.length} stores on {zone} time</span>
          </div>
        )}
      </section>
      <RestockTimeline rows={rows} nowMin={nowMin} tz={tz} zone={zone} days={mine.days} hidden={ownLine.hidden} yours={yours} mixed={Boolean(areaLine && areaLine.points.length)} />
    </>
  );
}

/** Same footprint while the numbers load, so nothing below jumps. */
export function RestockTimesSkeleton() {
  return (
    <>
      <section className="pane mt-6 p-5 sm:p-6" aria-hidden>
        <div className="skeleton h-6 w-56" />
        <div className="skeleton mt-3 h-4 w-full max-w-xl" />
        <div className="mt-4 flex h-32 items-end gap-[3px]">{Array.from({ length: 24 }, (_, i) => <div key={i} className="skeleton flex-1" style={{ height: `${20 + ((i * 37) % 60)}%` }} />)}</div>
        <div className="skeleton mt-6 h-16 w-full" />
      </section>
      <section className="pane mt-6 p-5 sm:p-6" aria-hidden>
        <div className="skeleton h-6 w-44" />
        <div className="skeleton mt-3 h-4 w-full max-w-lg" />
        <div className="mt-5 space-y-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-6 w-full" />)}</div>
      </section>
    </>
  );
}
