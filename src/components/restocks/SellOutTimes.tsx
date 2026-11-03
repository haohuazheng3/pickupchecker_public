/**
 * "How fast do restocks sell out here?": one quotable line, four big numbers, the per-model table, then each
 * restock as a bar whose length is the seconds it lasted. Server-rendered (times in the store's own zone,
 * formatted here, so nothing differs between server and browser). Numbers are bounds between two of our checks
 * (lib/stock/sellouts.ts), shown as ranges, never rounded up to a claim the checks cannot support; the method
 * sits folded under the module.
 */
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { MODELS, PART_INDEX, STORE_INDEX, appleName, modelByKey, modelKeyFor, storePath, storeTimeZone } from "@/lib/apple/catalog";
import { fmtLife, medianBand, type SelloutSummary, type Sellouts } from "@/lib/stock/sellouts";
import { Measured, Stat, StatGrid } from "@/components/ui/Viz";

const pct = (x: number) => `${Math.round(x * 100)}%`;
const secs = (s: number | null) => (s == null ? "–" : s < 120 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`);
/** The bar's full width: a listing that lasted this long or longer fills it. */
const BAR_SEC = 180;

/** The one line an answer engine can quote; everything else is tiles. */
function headline(d: Sellouts, label: string, duo: SelloutSummary | undefined): string {
  if (duo && duo.n >= 3 && duo.medianSec != null) return `A typical iPhone Duo restock ${label} sold out in about ${medianBand(duo.medianSec)}.`;
  const s = d.summary;
  if (s.n > 0 && s.medianSec != null) return `Half of the restocks ${label} sold out within ${secs(s.medianSec)}.`;
  return `No restock ${label} has sold out in the last ${s.days} days yet.`;
}

function ModelRow({ name, s }: { name: string; s: SelloutSummary }) {
  return (
    <tr className="border-b border-line">
      <th scope="row" className="py-2 pr-3 text-left font-medium text-ink">{name}</th>
      <td className="py-2 pr-3 tabular-nums">{s.n}</td>
      <td className="py-2 pr-3 tabular-nums">{secs(s.medianSec)}</td>
      <td className="py-2 pr-3 tabular-nums">{pct(s.within30)}</td>
      <td className="py-2 pr-3 tabular-nums">{pct(s.within60)}</td>
      <td className="py-2 pr-3 tabular-nums">{secs(s.fastestSec)}</td>
    </tr>
  );
}

export function SellOutTimes({ data, label, showStore = false, limit = 10 }: { data: Sellouts; label: string; showStore?: boolean; limit?: number }) {
  const models = MODELS.filter((m) => data.byModel[m.key]?.n);
  const rows = data.recent.slice(0, limit);
  const estimated = rows.some((r) => r.highSec != null && !r.exact);
  const duo = data.byModel.duo;
  // The tiles follow the Duo once it has three timed sell-outs; before that, everything here.
  const s = duo && duo.n >= 3 && duo.medianSec != null ? duo : data.summary;
  const what = s === duo ? "iPhone Duo" : "all iPhones";
  const have = s.n > 0 && s.medianSec != null;
  return (
    <div>
      <p className="text-sm font-medium text-ink">{headline(data, label, duo)}</p>

      {have && (
        <StatGrid cols={4} className="mt-3">
          <Stat value={secs(s.medianSec).replace(/ s$/, "")} unit={s.medianSec! < 120 ? "s" : undefined} label={<>half gone within · {what}</>} tone="accent" />
          <Stat value={pct(s.within30)} label="gone within 30 s" tone="warn" />
          <Stat value={pct(s.within60)} label="gone within 1 min" />
          <Stat value={secs(s.fastestSec).replace(/ s$/, "")} unit={s.fastestSec != null && s.fastestSec < 120 ? "s" : undefined} label={<>fastest · {s.n} sold-out restocks, {s.days} d</>} tone="muted" />
        </StatGrid>
      )}

      {models.length > 1 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-sm">
            <caption className="mb-2 text-left text-xs text-ink-3">By iPhone, last {data.summary.days} days</caption>
            <thead>
              <tr className="border-b border-line-2 text-left text-ink">
                <th scope="col" className="py-2 pr-3 font-semibold">iPhone</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Sold out</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Half gone within</th>
                <th scope="col" className="py-2 pr-3 font-semibold">≤ 30 s</th>
                <th scope="col" className="py-2 pr-3 font-semibold">≤ 1 min</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Fastest</th>
              </tr>
            </thead>
            <tbody>{models.map((m) => <ModelRow key={m.key} name={m.name} s={data.byModel[m.key]!} />)}</tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="mt-5 flex items-baseline justify-between gap-3"><h3 className="text-sm font-semibold text-ink">Restock by restock</h3><span className="text-[11px] text-ink-3">bar = seconds listed · full at {BAR_SEC} s</span></div>
          <ul className="mt-2 divide-y divide-line text-sm">
            {rows.map((r) => {
              const item = PART_INDEX.get(r.partNumber);
              const store = STORE_INDEX.get(r.storeNumber);
              if (!item || !store) return null;
              const model = modelByKey(modelKeyFor(item.model));
              // new Date(): from the data cache `at` comes back as an ISO string (it is stored as JSON).
              const when = new Intl.DateTimeFormat("en-US", { timeZone: storeTimeZone(store), month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(r.at));
              const gone = r.highSec != null;
              const life = gone ? r.highSec! : r.listedSec ?? 0;
              const fast = gone && r.highSec! <= 30;
              const width = `${Math.max(3, Math.min(100, (life / BAR_SEC) * 100))}%`;
              return (
                <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-2 sm:grid-cols-[minmax(0,1fr)_7rem_auto]">
                  <span className="min-w-0 truncate">
                    <span className="tabular-nums text-ink-3">{when}</span>{" · "}
                    <span className="text-ink">{model?.short} {item.storage} {item.color}</span>
                    {showStore && <>{" · "}<Link href={storePath(store)} className="underline-offset-2 hover:underline">{appleName(store)}</Link></>}
                  </span>
                  <span className="col-span-2 flex h-2 items-center sm:col-span-1" aria-hidden>
                    <span className={`h-1.5 rounded-full ${!gone ? "bg-accent/35" : fast ? "bg-warn" : "bg-ink/25"}`} style={{ width }} />
                  </span>
                  <span className={`col-start-2 row-start-1 shrink-0 text-right tabular-nums font-medium sm:col-start-3 ${!gone ? "text-accent" : fast ? "text-warn" : "text-ink"}`}>
                    {!gone ? `still listed · ${secs(r.listedSec)}` : `${r.exact ? "" : "≈ "}${fmtLife(r.lowSec!, r.highSec!)}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <Measured>
        “Sold out in 45–60 s” means the configuration was still listed at our check 45 seconds after we first saw it and gone at the check 60 seconds after. Stores with alerts are checked every 5 seconds, every other store every 15, so that is the width of each range{estimated ? "; ≈ marks restocks from before we recorded the last check, bounded by the 15-second round instead" : ""}. A listing shorter than one check can come and go between two of them, so the real share gone within 30 seconds is higher than shown.
      </Measured>
    </div>
  );
}
