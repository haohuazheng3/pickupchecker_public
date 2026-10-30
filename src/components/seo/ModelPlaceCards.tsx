/** "Same place, one iPhone": three cards that open the model's own page for this place. */
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { MODELS, type ModelKey } from "@/lib/apple/catalog";
import { productFor, productPath, type Place } from "@/lib/seo/products";
import { Dot } from "@/components/stock/StatusBits";

export function ModelPlaceCards({ place, stockNow, of, unit }: { place: Place; stockNow: Record<ModelKey, number>; of: Record<ModelKey, number> | number; unit: string }) {
  return (
    <nav className="grid grid-cols-3 gap-2" aria-label="By iPhone">
      {MODELS.map((m) => {
        const n = stockNow[m.key] ?? 0;
        const total = typeof of === "number" ? of : of[m.key];
        return (
          <Link key={m.key} href={productPath(productFor(m.key), place)} className={`pane-2 pane-hover min-w-0 p-3 ${n ? "border-accent/40" : ""}`}>
            <div className="truncate text-sm font-semibold text-ink">{m.short === "Duo" ? "iPhone Duo" : m.short}</div>
            <div className="mt-1 flex items-center gap-1.5 text-lg font-semibold tabular-nums"><Dot state={n ? "ok" : "idle"} live={n > 0} /><span className={n ? "text-accent" : "text-ink-3"}>{n}</span><span className="text-sm font-normal text-ink-3">/{total}</span></div>
            <div className="truncate text-xs text-ink-3">{unit} ›</div>
          </Link>
        );
      })}
    </nav>
  );
}
