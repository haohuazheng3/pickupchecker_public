import { PendingLink as Link } from "@/components/ui/PendingLink";
import { stateCodeOf, modelKeyFor, appleBuyUrl, type ModelKey, appleName } from "@/lib/apple/catalog";
import type { RestockRow } from "@/lib/stock/queries";
import { productFor, productPath, storePlace } from "@/lib/seo/products";
import { LocalTime } from "@/components/site/LocalTime";
import { Swatch } from "@/components/stores/ConfigTable";

const BagIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 8h12l-1 12H7L6 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
);
const MapIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" /><circle cx="12" cy="11" r="2.2" /></svg>
);

/**
 * Restocks and sell-outs as separate cards. The tag is the state now ("Available" / "Sold out"); the
 * line under it says when it changed. A card whose configuration has sold out again is dimmed.
 */
export function RestockFeed({ rows, model, showModel = true, emptyText = "No restocks recorded yet." }: { rows: RestockRow[]; model?: ModelKey; showModel?: boolean; emptyText?: string }) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-ink-3">{emptyText}</p>;
  return (
    <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(100%,15.5rem),1fr))]">
      {rows.map((r) => {
        const available = r.nowAvailable ?? r.kind === "restock";
        const key = modelKeyFor(r.item.model);
        const config = productFor(key, r.item.storage, r.item.color);
        const here = storePlace(r.store);
        return (
          <li key={r.id} className={`flex min-w-0 flex-col gap-1.5 rounded-2xl border px-3 py-2.5 transition-opacity ${available ? "border-accent/30 bg-accent/[0.06]" : "border-line bg-[var(--pane-solid)] opacity-60 grayscale-[0.35]"}`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide ${available ? "bg-accent text-[var(--accent-ink)]" : "bg-ink/10 text-ink-2"}`}>{available ? "Available" : "Sold out"}</span>
              <span className="truncate text-xs text-ink-3">{r.kind === "soldout" ? "sold out " : available ? "since " : "restocked "}<LocalTime iso={r.at.toISOString()} withAgo={false} /></span>
            </div>
            <Link href={productPath(productFor(key), here)} className="block min-w-0 truncate">
              <span className="font-semibold text-ink hover:underline">{r.store.name}</span>
              <span className="text-xs text-ink-3"> · {r.store.city}, {stateCodeOf(r.store)}</span>
            </Link>
            <div className="flex items-center justify-between gap-2">
              <Link href={productPath(config, here)} className="inline-flex min-w-0 items-center gap-1.5 text-sm text-ink-2 hover:text-ink hover:underline">
                <Swatch color={r.item.color} className="h-2.5 w-2.5" />
                <span className="truncate">{showModel ? `${r.item.model.replace("iPhone ", "")} ` : ""}{r.item.storage} {r.item.color}</span>
              </Link>
              <span className="flex shrink-0 gap-1">
                <Link href={`/map?store=${r.storeNumber}&model=${model ?? key}`} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-2 hover:bg-ink/5" aria-label={`Show ${appleName(r.store)} on the map`} title="Map"><MapIcon /></Link>
                {available && <a href={appleBuyUrl(r.item)} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-2 hover:bg-ink/5" aria-label={`Buy the ${r.item.model} ${r.item.storage} ${r.item.color} on apple.com`} title="Buy on apple.com"><BagIcon /></a>}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
