import { overview } from "@/lib/stock/queries";
import { LiveAgo } from "@/components/site/LiveAgo";

export async function LiveStats() {
  const o = await overview();
  return (
    <dl className="mt-8 grid max-w-md grid-cols-3 gap-3 text-sm">
      <div className="pane-2 px-4 py-3"><dt className="text-ink-3">In stock now</dt><dd className="mt-1 text-xl font-semibold">{o.availableNow}</dd></div>
      <div className="pane-2 px-4 py-3"><dt className="text-ink-3">Stores w/ stock</dt><dd className="mt-1 text-xl font-semibold">{o.storesWithStock}</dd></div>
      <div className="pane-2 px-4 py-3"><dt className="text-ink-3">Last check</dt><dd className="mt-1 text-xl font-semibold">{o.lastCheckedAt ? <LiveAgo iso={o.lastCheckedAt} /> : "—"}</dd></div>
    </dl>
  );
}
