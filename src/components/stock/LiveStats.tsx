import { overview } from "@/lib/stock/queries";
import { t } from "@/lib/i18n/server";
import { LiveAgo } from "@/components/site/LiveAgo";

export async function LiveStats() {
  const d = t().modules.liveStats;
  const o = await overview();
  return (
    <dl className="mt-8 grid max-w-md grid-cols-3 gap-3 text-sm">
      <div className="pane-2 px-4 py-3"><dt className="text-ink-3">{d.inStock}</dt><dd className="mt-1 text-xl font-semibold">{o.availableNow}</dd></div>
      <div className="pane-2 px-4 py-3"><dt className="text-ink-3">{d.storesWith}</dt><dd className="mt-1 text-xl font-semibold">{o.storesWithStock}</dd></div>
      <div className="pane-2 px-4 py-3"><dt className="text-ink-3">{d.lastCheck}</dt><dd className="mt-1 text-xl font-semibold">{o.lastCheckedAt ? <LiveAgo iso={o.lastCheckedAt} /> : d.none}</dd></div>
    </dl>
  );
}
