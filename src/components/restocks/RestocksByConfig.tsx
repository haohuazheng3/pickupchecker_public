import { PendingLink as Link } from "@/components/ui/PendingLink";
import { PART_INDEX, MODELS, modelKeyFor } from "@/lib/apple/catalog";
import type { CountryCode } from "@/lib/apple/countries";
import type { PlaceStats } from "@/lib/stock/queries";
import { alertHref } from "@/lib/seo/enrich";
import { t, pageLocale } from "@/lib/i18n/server";
import { configLabel } from "@/lib/i18n/places";
import { Swatch } from "@/components/stores/ConfigTable";

/** "Restocks by configuration" over the window — which storage/colour actually comes back here. */
export function RestocksByConfig({ stats, label, store, limit = 10, country }: { stats: PlaceStats; label: string; store?: string; limit?: number; country?: CountryCode }) {
  const d = t().modules.byConfig;
  const lang = pageLocale().lang;
  const rows = stats.byPart.map((r) => ({ ...r, item: PART_INDEX.get(r.partNumber)! })).filter((r) => r.item).slice(0, limit);
  if (rows.length === 0) return <p className="text-sm text-ink-2">{d.empty(label, stats.days)}</p>;
  const max = Math.max(1, ...rows.map((r) => r.restocks));
  return (
    <div>
      <p className="text-sm text-ink-2">{d.intro(label, stats.days)}</p>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => {
          const key = modelKeyFor(r.item.model);
          const short = MODELS.find((m) => m.key === key)?.short ?? r.item.model;
          return (
            <li key={r.partNumber} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 text-sm">
              <Swatch color={r.item.color} />
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2"><span className="truncate text-ink">{short} {configLabel(r.item, lang)}</span><span className="shrink-0 tabular-nums text-ink-3">{d.times(r.restocks)}</span></div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-ink/6"><div className="h-full rounded-full bg-accent" style={{ width: `${(r.restocks / max) * 100}%` }} /></div>
              </div>
              <Link href={alertHref({ model: key, storage: r.item.storage, color: r.item.color, store, country })} className="text-xs font-medium text-ink hover:underline">{d.alert}</Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
