import { PendingLink as Link } from "@/components/ui/PendingLink";
import { PART_INDEX, MODELS, modelKeyFor } from "@/lib/apple/catalog";
import type { PlaceStats } from "@/lib/stock/queries";
import { alertHref } from "@/lib/seo/enrich";
import { Swatch } from "@/components/stores/ConfigTable";

/** "Restocks by configuration" over the window — which storage/colour actually comes back here. */
export function RestocksByConfig({ stats, label, store, limit = 10 }: { stats: PlaceStats; label: string; store?: string; limit?: number }) {
  const rows = stats.byPart.map((r) => ({ ...r, item: PART_INDEX.get(r.partNumber)! })).filter((r) => r.item).slice(0, limit);
  if (rows.length === 0) return <p className="text-sm text-ink-2">No configuration has restocked {label} in the last {stats.days} days, so there is no ranking yet.</p>;
  const max = Math.max(1, ...rows.map((r) => r.restocks));
  return (
    <div>
      <p className="text-sm text-ink-2">Which configurations came back {label} in the last {stats.days} days, most often first.</p>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => {
          const key = modelKeyFor(r.item.model);
          const short = MODELS.find((m) => m.key === key)?.short ?? r.item.model;
          return (
            <li key={r.partNumber} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 text-sm">
              <Swatch color={r.item.color} />
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2"><span className="truncate text-ink">{short} {r.item.storage} {r.item.color}</span><span className="shrink-0 tabular-nums text-ink-3">{r.restocks}×</span></div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-ink/6"><div className="h-full rounded-full bg-accent" style={{ width: `${(r.restocks / max) * 100}%` }} /></div>
              </div>
              <Link href={alertHref({ model: key, storage: r.item.storage, color: r.item.color, store })} className="text-xs font-medium text-ink hover:underline">Alert me</Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
