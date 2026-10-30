/**
 * Route skeletons, shown by NavSkeleton during a client-side navigation. They used to be the routes'
 * loading.tsx files; those also wrapped the first server render in Suspense, so every public page
 * arrived as a skeleton with its real content in a hidden block swapped in later. That cost the
 * first paint (LCP waited for the swap) and showed crawlers that do not run JavaScript a skeleton.
 * Now the first load streams the page itself and only in-app navigations show these.
 */
import { BoardSkeleton, ClockSkeleton, FeedSkeleton, PageHeadSkeleton, Skeleton, SkeletonCard, StoreCardSkeleton } from "./Skeleton";

export type SkeletonKind = "home" | "hub" | "state" | "city" | "store" | "product" | "map" | "restocks" | "install";

/** Which skeleton a pathname gets; null for pages that render instantly (static) or keep their own loading.tsx. */
export function skeletonKind(pathname: string): SkeletonKind | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return "home";
  if (parts[0] === "stores") return (["hub", "state", "city", "store"] as const)[parts.length - 1] ?? null;
  if (parts[0] === "stock") return parts.length >= 2 ? "product" : null;
  if (parts.length === 1 && (parts[0] === "map" || parts[0] === "restocks" || parts[0] === "install")) return parts[0];
  return null;
}

export function RouteSkeleton({ kind }: { kind: SkeletonKind }) {
  switch (kind) {
    case "home": return <HomeSkeleton />;
    case "hub": return <HubSkeleton />;
    case "state": return <StateSkeleton />;
    case "city": return <CitySkeleton />;
    case "store": return <StoreSkeleton />;
    case "product": return <ProductSkeleton />;
    case "map": return <MapSkeleton />;
    case "restocks": return <RestocksSkeleton />;
    case "install": return <InstallSkeleton />;
  }
}

/** Home: eyebrow, h1, intro, then the two panes (stacked on phones). */
function HomeSkeleton() {
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

/** Stores hub: head, model cards, then the grid of states. */
function HubSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8" aria-busy="true" aria-label="Loading">
      <PageHeadSkeleton lines={2} actions={3} />
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} chips={0} lines={1} />)}
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => <div key={i} className="pane-2 p-4"><Skeleton className="h-4 w-1/2" /><Skeleton className="mt-3 h-3 w-4/5" /></div>)}
      </div>
    </div>
  );
}

/** State page: breadcrumb, head with city chips and two buttons, store cards grouped by city, clock + feed. */
function StateSkeleton() {
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

/** City page: breadcrumb, head with two buttons, the store cards, clock + feed. */
function CitySkeleton() {
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

/** Store page: breadcrumb, head, three per-model cards, then clock + history beside the map/hours/nearby column. */
function StoreSkeleton() {
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

/** Product page: model tabs, h1, intro, filter chips, then the board pane beside the alerts/recent column. */
function ProductSkeleton() {
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

/** Map page: head and status line, the model/filter chips, then the map canvas at its real height. */
function MapSkeleton() {
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

/** Restock log: title, count line, the filter chips, then the feed pane. */
function RestocksSkeleton() {
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

/** Install guide: the hero text beside the lock-screen mock, then the steps. */
function InstallSkeleton() {
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
