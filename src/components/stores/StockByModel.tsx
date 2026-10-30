import Link from "next/link";
import { MODELS, PART_INDEX, STORAGE_ORDER, COLOR_META } from "@/lib/apple/catalog";
import type { StoreStockSummary } from "@/lib/stock/queries";
import { Dot } from "@/components/stock/StatusBits";
import { LiveAgo } from "@/components/site/LiveAgo";

/** Per-model stock at one store, Duo first: count, the available configurations as chips, and an alert CTA. */
export function StockByModel({ summary, storeNumber }: { summary: StoreStockSummary | undefined; storeNumber: string }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {MODELS.map((m) => {
        const s = summary?.perModel[m.key];
        const n = s?.available ?? 0;
        const items = (s?.parts ?? []).map((p) => PART_INDEX.get(p)!).filter(Boolean).sort((a, b) => STORAGE_ORDER.indexOf(a.storage) - STORAGE_ORDER.indexOf(b.storage) || a.color.localeCompare(b.color));
        return (
          <div key={m.key} className={`pane-2 flex flex-col p-4 ${n ? "border-accent/40" : ""}`}>
            <div className="flex items-center justify-between gap-2"><span className="font-semibold">{m.name}</span><Dot state={n ? "ok" : s ? "idle" : "warn"} live={n > 0} /></div>
            <div className={`mt-1 text-sm ${n ? "text-accent" : "text-ink-3"}`}>{s ? (n ? `${n} of ${s.total} configurations available now` : `none of ${s.total} configurations right now`) : "not checked yet"}</div>
            {items.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {items.slice(0, 8).map((i) => <span key={i.partNumber} className="inline-flex items-center gap-1.5 rounded-full bg-ink/6 px-2 py-0.5 text-xs text-ink-2"><span className="h-2 w-2 rounded-full border border-ink/15" style={{ background: COLOR_META[i.color]?.hex ?? "#888" }} />{i.storage} {i.color}</span>)}
                {items.length > 8 && <span className="text-xs text-ink-3">+{items.length - 8}</span>}
              </div>
            )}
            <div className="mt-auto flex items-center justify-between pt-3 text-xs text-ink-3">
              <span>checked <LiveAgo iso={summary?.lastCheckedAt ?? null} /></span>
              <Link href={`/?model=${m.key}&store=${storeNumber}#notify`} className="font-medium text-ink hover:underline">Alert me →</Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
