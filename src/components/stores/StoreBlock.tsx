import { PendingLink as Link } from "@/components/ui/PendingLink";
import { DEFAULT_MODEL, storePath, type Store, appleName } from "@/lib/apple/catalog";
import type { StoreStockSummary, StoreStatusRow } from "@/lib/stock/queries";
import { nearestOutsideState, nearestInState, alertHref } from "@/lib/seo/enrich";
import { StockByModel } from "./StockByModel";
import { ConfigTable } from "./ConfigTable";
import { StoreInfo, HoursTable } from "./StoreInfo";
import { NearbyStores } from "./NearbyStores";
import { LiveAgo } from "@/components/site/LiveAgo";

/**
 * A store rendered in full on a thin state or city page (≤ 2 stores): stock by model, every
 * configuration, hours, map link and the nearest stores across the state line — a complete landing
 * page even when no event has ever been logged there.
 */
export function StoreBlock({ store, summary, rows, stock }: { store: Store; summary: StoreStockSummary | undefined; rows: StoreStatusRow[]; stock: Map<string, StoreStockSummary> }) {
  const outside = nearestOutsideState(store, 4);
  const inState = nearestInState(store, 3);
  return (
    <section className="space-y-4" aria-label={`${appleName(store)}`} id={store.slug}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold"><Link href={storePath(store)} className="hover:underline">Apple {store.name}</Link></h2>
          <p className="text-sm text-ink-3">Checked <LiveAgo iso={summary?.lastCheckedAt ?? null} /> · every 20 s</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/map?store=${store.storeNumber}&model=${DEFAULT_MODEL}`} className="btn btn-ghost btn-sm">Show on map</Link>
          <Link href={alertHref({ store: store.storeNumber })} className="btn btn-primary btn-sm">Alert me here</Link>
        </div>
      </div>
      <div className="pane p-5"><StoreInfo store={store} compact /></div>
      <StockByModel summary={summary} storeNumber={store.storeNumber} />
      <ConfigTable store={store} rows={rows} title={`Every configuration at ${appleName(store)}`} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="pane p-5"><HoursTable store={store} /></div>
        <div className="space-y-4">
          {inState.length > 0 && <NearbyStores title={`Also in ${store.state}`} stores={inState} stock={stock} />}
          <NearbyStores title="Nearest stores across the state line" stores={outside} stock={stock} />
        </div>
      </div>
    </section>
  );
}
