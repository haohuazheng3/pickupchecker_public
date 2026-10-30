import Link from "next/link";
import { PART_INDEX, STORE_INDEX, storePath } from "@/lib/apple/catalog";
import { narrative, type NarrativeInput } from "@/lib/seo/enrich";
import type { PlaceStats } from "@/lib/stock/queries";
import { LiveAgo } from "@/components/site/LiveAgo";

/** The data paragraph: a template filled with the real numbers, plus the ticking "latest restock" sentence. */
export function Narrative({ input, stats, hideStore = false, className = "" }: { input: NarrativeInput; stats: PlaceStats; hideStore?: boolean; className?: string }) {
  const lr = stats.lastRestock;
  const item = lr ? PART_INDEX.get(lr.partNumber) : undefined;
  const store = lr ? STORE_INDEX.get(lr.storeNumber) : undefined;
  return (
    <p className={`max-w-3xl leading-relaxed text-ink-2 ${className}`}>
      {narrative(input)}
      {lr && item && (
        <>
          {" "}The most recent restock was the <b className="text-ink">{item.model} {item.storage} {item.color}</b>
          {!hideStore && store && <> at <Link href={storePath(store)} className="font-medium text-ink hover:underline">Apple {store.name}</Link></>}, <LiveAgo iso={lr.at} className="text-ink" />.
        </>
      )}
    </p>
  );
}
