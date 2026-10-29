import Link from "next/link";
import { storePath, stateCodeOf, type ModelKey } from "@/lib/apple/catalog";
import type { RestockRow } from "@/lib/stock/queries";
import { LocalTime } from "@/components/site/LocalTime";

const MapIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" /><circle cx="12" cy="11" r="2.2" /></svg>
);

/**
 * One row per real restock: when (reader's zone), what, where, how Apple phrased it, and a map
 * button that opens the store on the live map. Sold-outs show when `kind` is "all".
 */
export function RestockFeed({ rows, model, showModel = true, emptyText = "No restocks recorded yet — the first one shows here within seconds of happening." }: { rows: RestockRow[]; model?: ModelKey; showModel?: boolean; emptyText?: string }) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-ink-3">{emptyText}</p>;
  return (
    <ul className="divide-y divide-line">
      {rows.map((r) => {
        const soldout = r.kind === "soldout";
        return (
          <li key={r.id} className="flex items-center gap-3 py-2.5">
            <span className={`mt-1 h-2 w-2 shrink-0 self-start rounded-full ${soldout ? "bg-ink-3" : "bg-accent"}`} aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <LocalTime iso={r.at.toISOString()} className="font-medium" />
                {soldout && <span className="text-xs text-ink-3">sold out</span>}
              </div>
              <div className="truncate text-sm text-ink-2">
                <Link href={storePath(r.store)} className="font-medium text-ink hover:underline">Apple {r.store.name}</Link>
                <span className="text-ink-3"> · {r.store.city}, {stateCodeOf(r.store)}</span>
              </div>
              <div className="text-xs text-ink-3">{showModel ? `${r.item.model} ` : ""}{r.item.storage} {r.item.color}{r.quote ? ` · ${r.quote}` : ""}</div>
            </div>
            <Link href={`/map?store=${r.storeNumber}&model=${model ?? r.item.model.toLowerCase().includes("duo") ? "duo" : "all"}`} className="btn btn-ghost btn-sm shrink-0 px-2.5" aria-label={`Show Apple ${r.store.name} on the map`} title="Show on the map"><MapIcon /></Link>
          </li>
        );
      })}
    </ul>
  );
}
