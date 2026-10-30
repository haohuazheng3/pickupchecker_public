import { ClockSkeleton, FeedSkeleton, PageHeadSkeleton, Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

/** Store page: breadcrumb, head, three per-model cards, then clock + history beside the map/hours/nearby column. */
export default function StoreLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8" aria-busy="true" aria-label="Loading">
      <PageHeadSkeleton crumbs lines={2} actions={2} />
      <section className="mt-6">
        <Skeleton className="h-6 w-52" />
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} chips={i === 0 ? 4 : 0} lines={1} />)}
        </div>
      </section>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="pane p-5"><Skeleton className="h-6 w-64 max-w-full" /><ClockSkeleton className="mt-3" /></section>
          <section className="pane p-5"><Skeleton className="h-6 w-40" /><FeedSkeleton rows={6} className="mt-2" /></section>
        </div>
        <aside className="space-y-4">
          <Skeleton className="h-52 rounded-[20px]" />
          <div className="pane p-5">
            <Skeleton className="h-3 w-14" />
            <div className="mt-3 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-3.5 w-4/5" />)}</div>
          </div>
          <div className="pane p-5">
            <Skeleton className="h-3 w-24" />
            <div className="mt-2 divide-y divide-line">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex items-center justify-between gap-2 py-2.5"><Skeleton className="h-3.5 w-1/2" /><Skeleton className="h-3 w-14" /></div>)}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
