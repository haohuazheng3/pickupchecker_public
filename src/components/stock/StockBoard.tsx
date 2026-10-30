import { PART_INDEX, STORE_INDEX, storePath, type ModelKey, MODELS } from "@/lib/apple/catalog";
import { stockByStore } from "@/lib/stock/queries";
import { Dot } from "./StatusBits";
import { LiveAgo } from "@/components/site/LiveAgo";
import { PendingLink } from "@/components/ui/PendingLink";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export async function StockBoard({ model, storage, color, limit = 60 }: { model: ModelKey; storage?: string; color?: string; limit?: number }) {
  const rows = await stockByStore(model, { storage, color });
  const inStock = rows.filter((r) => r.availableParts.length > 0);
  const meta = MODELS.find((m) => m.key === model)!;
  const checked = rows.length;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-3">
        <span className="inline-flex items-center gap-2"><Dot state={inStock.length ? "ok" : "idle"} live={inStock.length > 0} /> {inStock.length} of {checked || 269} stores have the {meta.short} in stock</span>
        {rows[0]?.lastCheckedAt && <span>Last check <LiveAgo iso={rows[0].lastCheckedAt} /></span>}
      </div>
      {inStock.length === 0 ? (
        <div className="pane-2 p-6 text-ink-2">
          {checked === 0 ? "First sweep in progress." : `No store lists the ${meta.name}${storage ? ` ${storage}` : ""}${color ? ` in ${color}` : ""} right now.`}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {inStock.slice(0, limit).map((r) => {
            const s = STORE_INDEX.get(r.storeNumber);
            if (!s) return null;
            const items = r.availableParts.map((p) => PART_INDEX.get(p)!).filter(Boolean);
            return (
              <li key={r.storeNumber} className="pane-2 pane-hover p-4">
                <PendingLink href={storePath(s)} className="block">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">Apple {s.name}</div>
                      <div className="text-sm text-ink-3">{s.city}, {s.state}</div>
                    </div>
                    <Dot state="ok" live />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {items.slice(0, 6).map((i) => <span key={i.partNumber} className="rounded-full bg-ink/6 px-2 py-0.5 text-xs text-ink-2">{i.storage} {i.color}</span>)}
                    {items.length > 6 && <span className="text-xs text-ink-3">+{items.length - 6}</span>}
                  </div>
                  <div className="mt-2 text-xs text-ink-3">Seen <LiveAgo iso={r.lastAvailableAt} /></div>
                </PendingLink>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Same shape as the board: the status line, then the store-card grid with name, city, chips and "seen". */
export function StockBoardSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading stock">
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1"><Skeleton className="h-4 w-72 max-w-full" /><Skeleton className="h-4 w-28" /></div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, i) => <li key={i}><SkeletonCard chips={3} lines={1} foot /></li>)}
      </ul>
    </div>
  );
}
