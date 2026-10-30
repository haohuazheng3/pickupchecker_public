import { ClockSkeleton, FeedSkeleton, PageHeadSkeleton, Skeleton, StoreCardSkeleton } from "@/components/ui/Skeleton";

/** State page: breadcrumb, head with city chips and two buttons, store cards grouped by city, clock + feed. */
export default function StateLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8" aria-busy="true" aria-label="Loading">
      <PageHeadSkeleton crumbs chips={4} actions={2} />
      {[2, 1].map((n, g) => (
        <section key={g} className="mt-6">
          <div className="flex items-baseline justify-between gap-3"><Skeleton className="h-5 w-40" /><Skeleton className="h-3 w-16" /></div>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            {Array.from({ length: n }).map((_, i) => <StoreCardSkeleton key={i} />)}
          </div>
        </section>
      ))}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="pane p-5"><Skeleton className="h-6 w-64 max-w-full" /><ClockSkeleton className="mt-3" /></section>
        <section className="pane p-5"><Skeleton className="h-6 w-56 max-w-full" /><FeedSkeleton rows={5} className="mt-2" /></section>
      </div>
    </div>
  );
}
