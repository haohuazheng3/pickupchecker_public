import Link from "next/link";
import { MODELS, storePath, stateCodeOf, type Store } from "@/lib/apple/catalog";
import { productFor, productPath, storePlace } from "@/lib/seo/products";
import type { StoreStockSummary } from "@/lib/stock/queries";
import { normalizeHours, todayLabel } from "@/lib/seo/enrich";
import { storeTimeZone } from "@/lib/apple/catalog";
import { Dot } from "@/components/stock/StatusBits";
import { LiveAgo } from "@/components/site/LiveAgo";

/**
 * Model × store matrix for state and city pages: one row per store, one cell per model with
 * "available / tracked" configurations and a live dot, plus today's hours and the last check.
 */
export function ModelStoreMatrix({ stores, stock, showCity = true, now = new Date() }: { stores: Store[]; stock: Map<string, StoreStockSummary>; showCity?: boolean; now?: Date }) {
  return (
    <div className="pane-2 overflow-hidden">
      <div className="grid grid-cols-[1fr_repeat(3,3.4rem)] gap-x-2 border-b border-line px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-ink-3 sm:grid-cols-[1fr_repeat(3,5.5rem)_7rem] sm:px-4">
        <span>Store</span>
        {MODELS.map((m) => <span key={m.key} className="text-center">{m.short}</span>)}
        <span className="hidden text-right sm:block">Checked</span>
      </div>
      <ul className="divide-y divide-line">
        {stores.map((s) => {
          const r = stock.get(s.storeNumber);
          const today = todayLabel(normalizeHours(s.hours), storeTimeZone(s), now);
          return (
            <li key={s.storeNumber} className="grid grid-cols-[1fr_repeat(3,3.4rem)] items-center gap-x-2 px-3 py-2.5 sm:grid-cols-[1fr_repeat(3,5.5rem)_7rem] sm:px-4">
              <div className="min-w-0">
                <Link href={storePath(s)} className="block truncate font-medium text-ink hover:underline">Apple {s.name}</Link>
                <div className="truncate text-xs text-ink-3">{showCity ? `${s.city}, ${stateCodeOf(s)} · ` : ""}{today.label}<span className="sm:hidden"> · <LiveAgo iso={r?.lastCheckedAt ?? null} /></span></div>
              </div>
              {MODELS.map((m) => {
                const c = r?.perModel[m.key];
                const n = c?.available ?? 0;
                return (
                  <Link key={m.key} href={productPath(productFor(m.key), storePlace(s))} className={`inline-flex items-center justify-center gap-1 rounded-full py-1 text-sm tabular-nums ${n ? "bg-accent/15 font-semibold text-accent" : "text-ink-3"}`} title={`${m.name}: ${n} of ${c?.total ?? 0} configurations available`}>
                    <Dot state={n ? "ok" : c ? "idle" : "warn"} live={n > 0} />{n}<span className="hidden text-xs font-normal text-ink-3 sm:inline">/{c?.total ?? 0}</span>
                  </Link>
                );
              })}
              <span className="hidden text-right text-xs text-ink-3 sm:block"><LiveAgo iso={r?.lastCheckedAt ?? null} /></span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
