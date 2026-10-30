import { Skeleton } from "@/components/ui/Skeleton";

/** Install guide (force-dynamic for the VAPID key): the hero text beside the lock-screen mock, then the steps. */
export default function InstallLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:pt-12" aria-busy="true" aria-label="Loading">
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <Skeleton className="mb-4 h-3 w-64 max-w-full" />
          <Skeleton className="h-10 w-11/12 max-w-xl sm:h-14" />
          <Skeleton className="mt-3 h-10 w-3/5 max-w-md sm:h-14" />
          <div className="mt-5 space-y-2"><Skeleton className="h-5 w-full max-w-xl" /><Skeleton className="h-5 w-11/12 max-w-lg" /><Skeleton className="h-5 w-2/3 max-w-md" /></div>
          <div className="mt-7 flex flex-wrap gap-3"><Skeleton className="h-12 w-44 rounded-full" /><Skeleton className="h-12 w-44 rounded-full" /></div>
        </div>
        <Skeleton className="mx-auto h-64 w-full max-w-[320px] rounded-[22px]" />
      </section>
      <section className="mt-16 grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="pane p-5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-5 w-3/4" />
            <Skeleton className="mt-2 h-4 w-11/12" />
            <Skeleton className="mx-auto mt-5 h-44 w-full max-w-[260px] rounded-[22px]" />
          </div>
        ))}
      </section>
    </div>
  );
}
