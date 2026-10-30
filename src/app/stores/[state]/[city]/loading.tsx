import { ClockSkeleton, FeedSkeleton, PageHeadSkeleton, Skeleton, StoreCardSkeleton } from "@/components/ui/Skeleton";

/** City page: breadcrumb, head with two buttons, the store cards, clock + feed. */
export default function CityLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8" aria-busy="true" aria-label="Loading">
      <PageHeadSkeleton crumbs actions={2} />
      <section className="mt-6 grid gap-3 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => <StoreCardSkeleton key={i} />)}
      </section>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="pane p-5"><Skeleton className="h-6 w-64 max-w-full" /><ClockSkeleton className="mt-3" /></section>
        <section className="pane p-5"><Skeleton className="h-6 w-56 max-w-full" /><FeedSkeleton rows={5} className="mt-2" /></section>
      </div>
    </div>
  );
}
