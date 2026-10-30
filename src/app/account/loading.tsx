import { Skeleton } from "@/components/ui/Skeleton";

/** Account: eyebrow + title with the two buttons, plan card, notifications card, alerts list, recent alerts. */
export default function AccountLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-8" aria-busy="true" aria-label="Loading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-3 w-56 max-w-full" />
          <Skeleton className="mt-2 h-9 w-48 sm:h-10" />
        </div>
        <div className="flex gap-2"><Skeleton className="h-9 w-24 rounded-full" /><Skeleton className="h-9 w-24 rounded-full" /></div>
      </div>
      <div className="pane mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><Skeleton className="h-5 w-40" /><Skeleton className="h-8 w-28 rounded-full" /></div>
        <Skeleton className="mt-3 h-4 w-2/3 max-w-md" />
      </div>
      <div className="pane mt-6 p-5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-3 h-4 w-11/12 max-w-lg" />
        <Skeleton className="mt-4 h-10 w-44 rounded-full" />
      </div>
      <section className="pane mt-6 p-5 sm:p-6">
        <Skeleton className="h-6 w-20" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="pane-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-7 w-20 rounded-full" /></div>
              <Skeleton className="mt-2 h-3.5 w-3/4" />
            </div>
          ))}
        </div>
      </section>
      <section className="pane mt-6 p-5 sm:p-6">
        <Skeleton className="h-6 w-32" />
        <div className="mt-3 divide-y divide-line">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="flex justify-between gap-3 py-2.5"><Skeleton className="h-3.5 w-3/5" /><Skeleton className="h-3.5 w-24" /></div>)}
        </div>
      </section>
    </div>
  );
}
