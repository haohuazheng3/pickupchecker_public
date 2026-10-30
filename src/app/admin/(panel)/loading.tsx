import { Skeleton } from "@/components/ui/Skeleton";

/** Admin panel body (the tab bar lives in the layout): a status section with node cards, then chart panes. */
export default function AdminLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <section className="pane min-w-0 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><Skeleton className="h-5 w-32" /><Skeleton className="h-3 w-40" /></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="pane-2 p-3">
              <div className="flex items-center justify-between gap-2"><Skeleton className="h-3.5 w-1/2" /><Skeleton className="h-2.5 w-2.5 rounded-full" /></div>
              <Skeleton className="mt-2 h-5 w-2/5" />
              <Skeleton className="mt-2 h-3 w-4/5" />
            </div>
          ))}
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <section key={i} className="pane min-w-0 p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><Skeleton className="h-5 w-44 max-w-full" /><Skeleton className="h-3 w-24" /></div>
            <Skeleton className="h-40" />
          </section>
        ))}
      </div>
    </div>
  );
}
