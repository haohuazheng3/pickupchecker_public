import { PendingLink as Link } from "@/components/ui/PendingLink";
import { DEFAULT_MODEL, modelByKey, storePath, cityLine } from "@/lib/apple/catalog";
import type { StoreStockSummary } from "@/lib/stock/queries";
import type { StoreWithDistance } from "@/lib/seo/enrich";
import { t, pageLocale } from "@/lib/i18n/server";
import { distance } from "@/lib/i18n/format";
import { appleStoreLabel, cityLabel } from "@/lib/i18n/places";
import { Dot } from "@/components/stock/StatusBits";

/** Other stores with distance, city/state and a live Duo dot (the stock map must include these store numbers). */
export function NearbyStores({ title, stores, stock, hint }: { title: string; stores: StoreWithDistance[]; stock: Map<string, StoreStockSummary>; hint?: string }) {
  if (stores.length === 0) return null;
  const d = t().modules.nearby;
  const lang = pageLocale().lang;
  const duo = modelByKey(DEFAULT_MODEL)!;
  return (
    <div className="pane p-5">
      <div className="eyebrow">{title}</div>
      {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
      <ul className="mt-2 divide-y divide-line text-sm">
        {stores.map((n) => {
          const k = stock.get(n.storeNumber)?.perModel[DEFAULT_MODEL].available ?? 0;
          const cc = n.country ?? "us";
          const city = lang === "en" || cc === "us" ? cityLine(n) : cityLabel(cc, n.city, lang);
          return (
            <li key={n.storeNumber} className="flex items-center justify-between gap-2 py-2">
              <Link href={storePath(n)} className="min-w-0 hover:underline">
                <span className="block truncate font-medium text-ink">{lang === "en" ? `Apple ${n.name}` : appleStoreLabel(n, lang)}</span>
                <span className="block truncate text-xs text-ink-3">{city} · {distance(lang, cc, n.distance)}</span>
              </Link>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-ink-3"><Dot state={k ? "ok" : "idle"} live={k > 0} />{k ? d.duo(duo.short, k) : d.noDuo(duo.short)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
