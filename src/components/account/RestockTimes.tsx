/**
 * "When your stores restock" on the account page: every store the user has an alert at, together — which
 * hours of the day restocks of their phones' models land (last 30 days), said in the stores' time zone,
 * with the next likely window, how long a restock usually lasts, and each store's own busiest hour.
 */
import { MODELS, STORE_INDEX, catalogFor, partNumbersFor, stateCodeOf, storeTimeZone, type ModelKey } from "@/lib/apple/catalog";
import { placeStats, restockPattern } from "@/lib/stock/queries";
import { hourLabel, hourSpan, majorityZone, nextWindow, topHours, zoneName } from "@/lib/restockTimes";
import { fmtDuration } from "@/lib/seo/enrich";

type Rule = { active: boolean; model: string; storages: string[]; colors: string[]; storeNumbers: string[] };
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** The current hour (0–23) in a zone. */
function hourIn(tz: string, now = new Date()): number {
  const h = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).formatToParts(now).find((p) => p.type === "hour")?.value;
  return Number(h ?? 0) % 24;
}

export async function RestockTimes({ watches }: { watches: Rule[] }) {
  const live = watches.filter((w) => w.active && w.storages.length === 1 && w.colors.length === 1 && w.storeNumbers.length === 1 && STORE_INDEX.has(w.storeNumbers[0]));
  if (live.length === 0) return null;
  const stores = [...new Set(live.map((w) => w.storeNumbers[0]))];
  const models = MODELS.filter((m) => live.some((w) => w.model === m.key));
  const parts = models.flatMap((m) => partNumbersFor(m.key));
  const exact = [...new Set(live.map((w) => catalogFor(w.model as ModelKey).find((c) => c.storage === w.storages[0] && c.color === w.colors[0])?.partNumber).filter((p): p is string => Boolean(p)))];
  const tz = majorityZone(stores.map((n) => storeTimeZone(STORE_INDEX.get(n)!)));
  const [p, stay] = await Promise.all([restockPattern(stores, parts, exact, tz), placeStats({ storeNumbers: stores, parts, tz })]);
  const zone = zoneName(tz);
  const what = models.length === MODELS.length ? "iPhone" : models.map((m) => m.name).join(" and ");
  const top = topHours(p.byHour, 3);
  const nowHour = hourIn(tz);
  const thin = p.total < 5;
  const next = thin ? null : nextWindow(top, nowHour);
  const peakDay = p.byWeekday.indexOf(Math.max(...p.byWeekday));
  const max = Math.max(1, ...p.byHour), maxDay = Math.max(1, ...p.byWeekday);
  return (
    <section className="pane mt-6 p-5 sm:p-6" aria-labelledby="restock-times">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="restock-times" className="text-xl font-semibold">When your stores restock</h2>
        <span className="text-xs text-ink-3">{what} · {stores.length} store{stores.length === 1 ? "" : "s"} · last {p.days} days · {zone} time</span>
      </div>
      {p.total === 0 ? (
        <p className="mt-2 text-sm text-ink-2">No {what} restocks at your stores in the last {p.days} days yet. This fills in as they happen.</p>
      ) : (
        <>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">
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

          <div className="mt-6 grid gap-6 sm:grid-cols-[2fr_3fr]">
            <div>
              <div className="text-xs text-ink-3">By weekday · busiest {DAY_NAMES[peakDay]}</div>
              <div className="mt-2 flex h-16 items-end gap-1.5">
                {p.byWeekday.map((n, d) => (
                  <div key={d} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${DAY_NAMES[d]}: ${n}`}>
                    <div className={`w-full rounded-t-[3px] ${d === peakDay ? "bg-accent" : "bg-ink/15"}`} style={{ height: `${(n / maxDay) * 44}px`, minHeight: n > 0 ? 3 : 0 }} />
                    <span className="h-3 text-[9px] leading-3 text-ink-3">{DAYS[d]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-ink-3">Your busiest stores</div>
              <ul className="mt-1 divide-y divide-line text-sm">
                {p.stores.slice(0, 5).map((st) => {
                  const s = STORE_INDEX.get(st.storeNumber)!;
                  const peak = topHours(st.byHour, 1)[0];
                  return (
                    <li key={st.storeNumber} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0 truncate">{s.name} <span className="text-ink-3">· {s.city}, {stateCodeOf(s)}</span></span>
                      <span className="shrink-0 text-xs tabular-nums text-ink-3">{st.total} · usually {hourLabel(peak)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          {p.exact.total > 0 && p.exact.total < p.total && <p className="mt-3 text-xs text-ink-3">{p.total} restocks of {what} at these stores, {p.exact.total} of them one of your exact phones.</p>}
        </>
      )}
    </section>
  );
}

/** Same footprint while the numbers load, so nothing below jumps. */
export function RestockTimesSkeleton() {
  return (
    <section className="pane mt-6 p-5 sm:p-6" aria-hidden>
      <div className="skeleton h-6 w-56" />
      <div className="skeleton mt-3 h-4 w-full max-w-xl" />
      <div className="mt-4 flex h-32 items-end gap-[3px]">{Array.from({ length: 24 }, (_, i) => <div key={i} className="skeleton flex-1" style={{ height: `${20 + ((i * 37) % 60)}%` }} />)}</div>
      <div className="skeleton mt-6 h-24 w-full" />
    </section>
  );
}
