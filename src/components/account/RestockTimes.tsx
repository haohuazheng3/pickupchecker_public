/**
 * The account page's two restock modules, from one read: "When your stores restock" (which hours and
 * weekdays restocks of the user's phones' models land, last 30 days, in the stores' time zone) and the
 * restock timeline (each time of day they landed, earliest first, with "now" placed among them).
 * While the user's own stores have too few restocks to show a pattern, both widen to every store in that
 * time zone and say so.
 */
import { MODELS, STORES, STORE_INDEX, partNumbersFor, storeTimeZone } from "@/lib/apple/catalog";
import { placeStats, restockPattern, restockSlots } from "@/lib/stock/queries";
import { buildTimeline, hourLabel, hourSpan, majorityZone, minuteIn, nextWindow, topHours, zoneName } from "@/lib/restockTimes";
import { fmtDuration } from "@/lib/seo/enrich";
import { RestockTimeline } from "./RestockTimeline";

type Rule = { active: boolean; model: string; storages: string[]; colors: string[]; storeNumbers: string[] };
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Restocks at the user's own stores below which both modules use every store in their time zone. */
const THIN = 10;

/** Busiest first: "Fifth Avenue", "Fifth Avenue, SoHo", "Fifth Avenue +3" (short enough for a phone line). */
function storeList(storeNumbers: string[]): string {
  const names = storeNumbers.map((n) => STORE_INDEX.get(n)?.name ?? n);
  return names.length <= 2 ? names.join(", ") : `${names[0]} +${names.length - 1}`;
}

export async function RestockTimes({ watches }: { watches: Rule[] }) {
  const live = watches.filter((w) => w.active && w.storages.length === 1 && w.colors.length === 1 && w.storeNumbers.length === 1 && STORE_INDEX.has(w.storeNumbers[0]));
  if (live.length === 0) return null;
  const own = [...new Set(live.map((w) => w.storeNumbers[0]))];
  const models = MODELS.filter((m) => live.some((w) => w.model === m.key));
  const parts = models.flatMap((m) => partNumbersFor(m.key));
  const tz = majorityZone(own.map((n) => storeTimeZone(STORE_INDEX.get(n)!)));
  const zone = zoneName(tz);

  const mine = await restockPattern(own, parts, [], tz);
  const zoneStores = STORES.filter((s) => storeTimeZone(s) === tz).map((s) => s.storeNumber);
  const widened = mine.total < THIN && zoneStores.length > own.length;
  const stores = widened ? zoneStores : own;
  const [p, slots, stay] = await Promise.all([widened ? restockPattern(stores, parts, [], tz) : mine, restockSlots(stores, parts, tz), placeStats({ storeNumbers: stores, parts, tz })]);

  const what = models.length === MODELS.length ? "iPhone" : models.map((m) => m.name).join(" and ");
  const top = topHours(p.byHour, 3);
  const nowMin = minuteIn(tz);
  const nowHour = Math.floor(nowMin / 60);
  const thin = p.total < 5;
  const next = thin ? null : nextWindow(top, nowHour);
  const peakDay = p.byWeekday.indexOf(Math.max(...p.byWeekday));
  const max = Math.max(1, ...p.byHour), maxDay = Math.max(1, ...p.byWeekday);
  const scope = widened ? `all ${stores.length} stores on ${zone} time` : `${stores.length} store${stores.length === 1 ? "" : "s"}`;
  const timeline = buildTimeline(slots, 12);

  return (
    <>
      <section className="pane mt-6 p-5 sm:p-6" aria-labelledby="restock-times">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 id="restock-times" className="text-xl font-semibold">When your stores restock</h2>
          <span className="text-xs text-ink-3">{what} · {scope} · last {p.days} days · {zone} time</span>
        </div>
        {p.total === 0 ? (
          <p className="mt-2 text-sm text-ink-2">No {what} restocks {widened ? `at any store on ${zone} time` : "at your stores"} in the last {p.days} days yet. This fills in as they happen.</p>
        ) : (
          <>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              {widened && <>Your stores have had {mine.total === 0 ? "no restocks" : `only ${mine.total}`} so far, so this counts every store on {zone} time. </>}
              {thin
                ? <>{p.total} restock{p.total === 1 ? "" : "s"} so far, too few to call a pattern.</>
                : <>Most land at <b className="text-ink">{hourSpan(top[0])}</b>{top.length > 1 && <>{top.length > 2 ? ", " : " and "}<b className="text-ink">{hourSpan(top[1])}</b></>}{top.length > 2 && <> and <b className="text-ink">{hourSpan(top[2])}</b></>} {zone} time.</>}
              {next && <> Next: <b className="text-ink">{hourLabel(next.hour)}</b>{next.inHours === 0 ? ", this hour" : `, in ${next.inHours} h`}.</>}
              {stay.medianMs != null && stay.medianSamples >= 5 && <> One usually lasts <b className="text-ink">{fmtDuration(stay.medianMs)}</b> before it sells out.</>}
            </p>

            {/* By hour: the busiest three in the accent, the rest quiet; a dot under the current hour. */}
            <div className="mt-4 flex h-32 items-end gap-[2px] sm:gap-[3px]" role="img" aria-label={`Restocks by hour, ${zone} time: ${p.byHour.map((n, h) => `${hourLabel(h)} ${n}`).join(", ")}`}>
              {p.byHour.map((n, h) => (
                <div key={h} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${hourSpan(h)}: ${n} restock${n === 1 ? "" : "s"}`}>
                  <div className={`w-full rounded-t-[3px] ${top.includes(h) ? "bg-accent" : "bg-ink/15"}`} style={{ height: `${(n / max) * 96}px`, minHeight: n > 0 ? 3 : 0 }} />
                  <span className="flex h-3 items-center text-[9px] leading-3 text-ink-3">{h === nowHour ? <span className="h-1.5 w-1.5 rounded-full bg-ink" aria-label="now" /> : h % 3 === 0 ? hourLabel(h).replace(" AM", "a").replace(" PM", "p") : ""}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 text-xs text-ink-3">By weekday · busiest {DAY_NAMES[peakDay]}</div>
            <div className="mt-2 flex h-16 items-end gap-1.5" role="img" aria-label={`Restocks by weekday: ${p.byWeekday.map((n, d) => `${DAY_NAMES[d]} ${n}`).join(", ")}`}>
              {p.byWeekday.map((n, d) => (
                <div key={d} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${DAY_NAMES[d]}: ${n}`}>
                  <div className={`w-full rounded-t-[3px] ${d === peakDay ? "bg-accent" : "bg-ink/15"}`} style={{ height: `${(n / maxDay) * 44}px`, minHeight: n > 0 ? 3 : 0 }} />
                  <span className="h-3 text-[9px] leading-3 text-ink-3">{DAYS[d]}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
      <RestockTimeline
        rows={timeline.points.map((pt) => ({ min: pt.min, drops: pt.drops, where: storeList(pt.stores.map((s) => s.storeNumber)), whereAll: pt.stores.map((s) => `${STORE_INDEX.get(s.storeNumber)?.name ?? s.storeNumber} ${s.drops}×`).join(", ") }))}
        nowMin={nowMin} tz={tz} zone={zone} days={p.days} hidden={timeline.hidden}
        scope={widened ? `the ${stores.length} stores on ${zone} time` : stores.length === 1 ? "your store" : `your ${stores.length} stores`}
      />
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
