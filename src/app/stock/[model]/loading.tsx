import { FeedSkeleton, Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

/** Model page: model tabs, h1, intro, filter chips, then the board pane beside the alerts/recent column. */
export default function StockModelLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8" aria-busy="true" aria-label="Loading">
      <nav className="mb-4 flex flex-wrap gap-2" aria-hidden>
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-9 w-32 rounded-full" />)}
      </nav>
      <Skeleton className="h-9 w-4/5 max-w-lg sm:h-12" />
      <Skeleton className="mt-4 h-4 w-11/12 max-w-2xl" />
      <div className="mt-5 flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-9 w-20 rounded-full" />)}
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section className="pane p-5 sm:p-6">
          <Skeleton className="mb-4 h-4 w-72 max-w-full" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} chips={3} lines={1} />)}
          </div>
        </section>
        <aside className="space-y-4">
          <div className="pane p-5">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="mt-3 h-4 w-11/12" />
            <Skeleton className="mt-2 h-4 w-2/3" />
            <Skeleton className="mt-4 h-11 w-full rounded-full" />
          </div>
          <div className="pane p-5">
            <div className="flex items-baseline justify-between gap-3"><Skeleton className="h-3 w-28" /><Skeleton className="h-3 w-14" /></div>
            <FeedSkeleton rows={4} className="mt-2" />
          </div>
        </aside>
      </div>
    </div>
  );
}
