/**
 * "How fast do restocks sell out here?": how many seconds each restock lasted, per iPhone and restock by restock.
 * Server-rendered (times in the store's own zone, formatted here, so nothing differs between server and browser).
 * Numbers are bounds between two of our checks (lib/stock/sellouts.ts), shown as ranges, never rounded up to a
 * claim the checks cannot support.
 */
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { MODELS, PART_INDEX, STORE_INDEX, appleName, modelByKey, modelKeyFor, storePath, storeTimeZone } from "@/lib/apple/catalog";
import { fmtLife, medianBand, type SelloutSummary, type Sellouts } from "@/lib/stock/sellouts";

const pct = (x: number) => `${Math.round(x * 100)}%`;
const secs = (s: number | null) => (s == null ? "–" : s < 120 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`);

function headline(d: Sellouts, label: string): string {
  const duo = d.byModel.duo;
  if (duo && duo.n >= 3 && duo.medianSec != null) {
    const quick = duo.within30 > 0 ? `, ${pct(duo.within30)} within 30 seconds` : "";
    return `A typical iPhone Duo restock ${label} sold out in about ${medianBand(duo.medianSec)}: half were gone within ${duo.medianSec} seconds${quick}${duo.fastestSec != null ? `, and the fastest was gone within ${duo.fastestSec} seconds` : ""} (${duo.n} sold-out restocks, last ${duo.days} days).`;
  }
  const s = d.summary;
  if (s.n > 0 && s.medianSec != null) return `Half of the restocks ${label} sold out within ${secs(s.medianSec)}, ${pct(s.within60)} within a minute (${s.n} sold-out restocks, last ${s.days} days).`;
  return `No restock ${label} has sold out in the last ${s.days} days yet, so there is no sell-out time to show.`;
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
  return (
    <div>
      <p className="text-sm leading-relaxed text-ink-2">{headline(data, label)}</p>

      {models.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-sm">
            <caption className="mb-2 text-left text-xs text-ink-3">Seconds from the check that first saw a restock to the check that saw it gone, last {data.summary.days} days</caption>
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
          <h3 className="mt-5 text-sm font-semibold text-ink">Restock by restock</h3>
          <ul className="mt-2 divide-y divide-line text-sm">
            {rows.map((r) => {
              const item = PART_INDEX.get(r.partNumber);
              const store = STORE_INDEX.get(r.storeNumber);
              if (!item || !store) return null;
              const model = modelByKey(modelKeyFor(item.model));
              // new Date(): from the data cache `at` comes back as an ISO string (it is stored as JSON).
              const when = new Intl.DateTimeFormat("en-US", { timeZone: storeTimeZone(store), month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(r.at));
              return (
                <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2">
                  <span className="min-w-0">
                    <span className="tabular-nums text-ink-3">{when}</span>{" · "}
                    <span className="text-ink">{model?.short} {item.storage} {item.color}</span>
                    {showStore && <>{" · "}<Link href={storePath(store)} className="underline-offset-2 hover:underline">{appleName(store)}</Link></>}
                  </span>
                  <span className={`shrink-0 tabular-nums font-medium ${r.highSec != null && r.highSec <= 30 ? "text-warn" : "text-ink"}`}>
                    {r.highSec == null ? `still listed · ${secs(r.listedSec)}` : `sold out in ${r.exact ? "" : "≈ "}${fmtLife(r.lowSec!, r.highSec)}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <p className="mt-3 text-xs leading-relaxed text-ink-3">
        How this is measured: “sold out in 45–60 s” means the configuration was still listed at our check 45 seconds after we first saw it and gone at the check 60 seconds after. Stores with alerts are checked every 5 seconds, every other store every 15, so that is the width of each range{estimated ? "; ≈ marks restocks from before we recorded the last check, bounded by the 15-second round instead" : ""}. A listing shorter than one check can come and go between two of them, and launch weeks run faster than this, so the real share of restocks gone in 20–30 seconds is higher than shown here.
      </p>
    </div>
  );
}
