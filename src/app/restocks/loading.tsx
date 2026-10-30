import { FeedSkeleton, Skeleton } from "@/components/ui/Skeleton";

/** Restock log: title, count line, the filter chips, then the feed pane. */
export default function RestocksLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-8" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-56 sm:h-12" />
      <Skeleton className="mt-3 h-4 w-11/12 max-w-2xl" />
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-7 w-24 rounded-full" />)}
      </div>
      <div className="pane mt-5 p-4 sm:p-6">
        <FeedSkeleton rows={10} />
        <div className="mt-3 flex items-center justify-between"><Skeleton className="h-3 w-12" /><Skeleton className="h-6 w-20 rounded-full" /></div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2"><Skeleton className="h-8 w-24 rounded-full" /><Skeleton className="h-8 w-24 rounded-full" /></div>
    </div>
  );
}
