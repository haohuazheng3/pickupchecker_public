import { BoardSkeleton, Skeleton } from "@/components/ui/Skeleton";

/** Home while the board and wizard load: eyebrow, h1, intro, then the two panes (stacked on phones). */
export default function HomeLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4" aria-busy="true" aria-label="Loading">
      <section className="pt-6 sm:pt-10">
        <Skeleton className="h-3 w-72 max-w-full" />
        <Skeleton className="mt-4 h-9 w-11/12 max-w-3xl sm:h-12" />
        <Skeleton className="mt-3 h-4 w-4/5 max-w-2xl" />
      </section>
      <section className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="pane p-5 sm:p-6"><BoardSkeleton /></div>
        <div className="pane p-5 sm:p-7">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-3/4 max-w-sm" />
          <Skeleton className="mt-2 h-4 w-11/12" />
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="mt-5 h-12 w-full rounded-full" />
        </div>
      </section>
      <section className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-7 w-24 rounded-full" />)}
      </section>
    </div>
  );
}
