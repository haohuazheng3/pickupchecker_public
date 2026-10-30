import Link from "next/link";
import { DEFAULT_MODEL, modelByKey, storePath, stateCodeOf } from "@/lib/apple/catalog";
import type { StoreStockSummary } from "@/lib/stock/queries";
import type { StoreWithDistance } from "@/lib/seo/enrich";
import { Dot } from "@/components/stock/StatusBits";

/** Other stores with distance, city/state and a live Duo dot (the stock map must include these store numbers). */
export function NearbyStores({ title, stores, stock, hint }: { title: string; stores: StoreWithDistance[]; stock: Map<string, StoreStockSummary>; hint?: string }) {
  if (stores.length === 0) return null;
  const duo = modelByKey(DEFAULT_MODEL)!;
  return (
    <div className="pane p-5">
      <div className="eyebrow">{title}</div>
      {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
      <ul className="mt-2 divide-y divide-line text-sm">
        {stores.map((n) => {
          const d = stock.get(n.storeNumber)?.perModel[DEFAULT_MODEL].available ?? 0;
          return (
            <li key={n.storeNumber} className="flex items-center justify-between gap-2 py-2">
              <Link href={storePath(n)} className="min-w-0 hover:underline">
                <span className="block truncate font-medium text-ink">Apple {n.name}</span>
                <span className="block truncate text-xs text-ink-3">{n.city}, {stateCodeOf(n)} · {Math.round(n.distance)} mi</span>
              </Link>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-ink-3"><Dot state={d ? "ok" : "idle"} live={d > 0} />{d ? `${duo.short} · ${d}` : `no ${duo.short}`}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
