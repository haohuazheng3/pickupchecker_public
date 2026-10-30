import type { ReactNode } from "react";
import { MODELS, PART_INDEX, STORE_INDEX, type ModelKey } from "@/lib/apple/catalog";
import type { PlaceStats } from "@/lib/stock/queries";
import { fmtDuration } from "@/lib/seo/enrich";
import { LiveAgo } from "@/components/site/LiveAgo";
import { Dot } from "@/components/stock/StatusBits";

export interface Stat { label: string; value: ReactNode; hint?: ReactNode; live?: boolean }

/** A row of small numeric tiles. Two per row on phones, up to six on desktop; every tile is real data. */
export function StatStrip({ items, className = "" }: { items: Stat[]; className?: string }) {
  return (
    <dl className={`grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 ${className}`}>
      {items.map((s, i) => (
        <div key={i} className="pane-2 min-w-0 p-3">
          <dt className="eyebrow truncate text-[0.65rem]">{s.label}</dt>
          <dd className="mt-1 flex items-center gap-1.5 text-xl font-semibold tabular-nums text-ink">{s.live && <Dot state="ok" live />}<span className="truncate">{s.value}</span></dd>
          {s.hint && <dd className="mt-0.5 truncate text-xs text-ink-3">{s.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}

/**
 * The standard strip for a place or a model: stores, cities, stock now per model, restocks 24 h / 7 d / 30 d,
 * sell-outs, median time available and the last restock.
 */
export function PlaceStatStrip({ stores, cities, stockNow, stats, storeMode = false, model }: {
  stores: number;
  cities?: number;
  /** Stores with stock per model (place pages) or configurations available per model (store pages). */
  stockNow: Record<ModelKey, number>;
  stats: PlaceStats;
  /** Store page: stockNow counts configurations, not stores. */
  storeMode?: boolean;
  /** Model page: show just this model's stock. */
  model?: ModelKey;
}) {
  const items: Stat[] = [];
  if (model) items.push({ label: "In stock now", value: stockNow[model], hint: `of ${stores} stores`, live: stockNow[model] > 0 });
  else {
    items.push({ label: "Stores", value: stores, hint: cities != null ? `${cities} ${cities === 1 ? "city" : "cities"}` : "tracked" });
    for (const m of MODELS) items.push({ label: `${m.short} now`, value: stockNow[m.key], hint: storeMode ? "configs in stock" : `store${stockNow[m.key] === 1 ? "" : "s"} with stock`, live: stockNow[m.key] > 0 });
  }
  items.push({ label: "Restocks 24 h", value: stats.day, hint: `${stats.week} in 7 d · ${stats.month} in ${stats.days} d` });
  items.push({ label: `Sell-outs ${stats.days} d`, value: stats.soldouts, hint: stats.medianMs != null ? `stays ~${fmtDuration(stats.medianMs)}` : "no pairs yet" });
  const lr = stats.lastRestock;
  const lrStore = lr ? STORE_INDEX.get(lr.storeNumber) : undefined;
  const lrItem = lr ? PART_INDEX.get(lr.partNumber) : undefined;
  items.push({ label: "Last restock", value: lr ? <LiveAgo iso={lr.at} /> : "none yet", hint: lr && lrItem ? `${lrItem.storage} ${lrItem.color}${lrStore && !storeMode ? ` · ${lrStore.name}` : ""}` : `in the last ${stats.days} days` });
  return <StatStrip items={items} />;
}
