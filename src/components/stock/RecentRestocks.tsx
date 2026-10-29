import Link from "next/link";
import { recentRestocks } from "@/lib/stock/queries";
import { stateSlug, type ModelKey } from "@/lib/apple/catalog";
import { timeAgo } from "./StatusBits";

export async function RecentRestocks({ model, limit = 8 }: { model?: ModelKey; limit?: number }) {
  const rows = await recentRestocks(limit, model);
  if (rows.length === 0) return <p className="mt-3 text-sm text-ink-3">No restocks recorded yet.</p>;
  return (
    <ul className="mt-3 space-y-2 text-sm">
      {rows.map((r) => (
        <li key={r.id} className="flex items-start justify-between gap-3">
          <span>
            <Link href={`/stores/${stateSlug(r.store!.state)}/${r.store!.slug}`} className="font-medium hover:underline">Apple {r.store!.name}</Link>
            <span className="block text-ink-3">{r.item!.model.replace("iPhone ", "")} {r.item!.storage} {r.item!.color}</span>
          </span>
          <span className="shrink-0 text-ink-3">{timeAgo(r.at)}</span>
        </li>
      ))}
    </ul>
  );
}
