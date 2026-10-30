import { Skeleton } from "@/components/ui/Skeleton";

/** Map page: head and status line, the model/filter chips, then the map canvas at its real height. */
export default function MapLoading() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 pt-8" aria-busy="true" aria-label="Loading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-9 w-72 max-w-full sm:h-12" />
          <Skeleton className="mt-3 h-4 w-11/12 max-w-2xl" />
        </div>
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-28 rounded-full" />)}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="pane relative h-[62vh] min-h-[460px] overflow-hidden"><Skeleton className="h-full w-full rounded-none" /></div>
        <aside className="pane p-4">
          <Skeleton className="h-3 w-28" />
          <div className="mt-3 divide-y divide-line">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="flex items-center justify-between gap-2 py-2.5"><Skeleton className="h-3.5 w-1/2" /><Skeleton className="h-3 w-12" /></div>)}
          </div>
        </aside>
      </div>
    </div>
  );
}
