import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { STORES, MODELS, DEFAULT_MODEL, modelByKey, citiesWithStores, cityBySlug, stateSlug, storePath, statePath, cityPath, storeTimeZone } from "@/lib/apple/catalog";
import { storesStock, restockFeed, restockStats, restockCounts } from "@/lib/stock/queries";
import { RestockFeed } from "@/components/restocks/RestockFeed";
import { RestockClock } from "@/components/restocks/RestockClock";
import { Dot, timeAgo } from "@/components/stock/StatusBits";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return citiesWithStores().map((c) => ({ state: c.stateSlug, city: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/stores/[state]/[city]">): Promise<Metadata> {
  const { state, city } = await params;
  const c = cityBySlug(state, city);
  if (!c) return {};
  return {
    title: `Apple Stores in ${c.name}, ${c.state} — iPhone Duo & 18 Pro pickup stock`,
    description: `Live in-store pickup availability for the iPhone Duo, 18 Pro and 18 Pro Max at the ${c.stores.length} Apple Store${c.stores.length > 1 ? "s" : ""} in ${c.name}, ${c.state}, with restock times and history.`,
    alternates: { canonical: cityPath(c.state, c.name) },
  };
}

/** City page; also the landing spot for the old /stores/{state}/{store-slug} URLs, which redirect. */
export default async function CityPage({ params }: PageProps<"/stores/[state]/[city]">) {
  const { state, city } = await params;
  const c = cityBySlug(state, city);
  if (!c) {
    const legacy = STORES.find((x) => x.slug === city && stateSlug(x.state) === state);
    if (legacy) permanentRedirect(storePath(legacy));
    notFound();
  }
  const numbers = c.stores.map((s) => s.storeNumber);
  const tz = storeTimeZone(c.stores[0]);
  const [stock, feed, stats, counts] = await Promise.all([storesStock(numbers), restockFeed({ state: c.state, city: c.name, limit: 12 }), restockStats(numbers, tz, 30), restockCounts({ state: c.state, city: c.name })]);
  const duo = modelByKey(DEFAULT_MODEL)!;
  const siblings = citiesWithStores().filter((x) => x.state === c.state && x.slug !== c.slug);
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <nav className="text-sm text-ink-3" aria-label="Breadcrumb"><Link href="/stores" className="hover:text-ink">Stores</Link> / <Link href={statePath(c.state)} className="hover:text-ink">{c.state}</Link> / {c.name}</nav>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl sm:text-5xl">Apple Stores in {c.name}, {c.state}</h1>
          <p className="mt-2 text-ink-2">{c.stores.length} store{c.stores.length > 1 ? "s" : ""} · {counts.day} restock{counts.day === 1 ? "" : "s"} in the last 24 h · {counts.week} this week.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/map?stores=${numbers.join(",")}&model=${DEFAULT_MODEL}`} className="btn btn-ghost btn-sm">Show on map</Link>
          <Link href={`/?model=${DEFAULT_MODEL}#notify`} className="btn btn-primary btn-sm">Alert me · free</Link>
        </div>
      </div>

      <section className="mt-6 grid gap-3 md:grid-cols-2">
        {c.stores.map((s) => {
          const st = stock.get(s.storeNumber);
          return (
            <Link key={s.storeNumber} href={storePath(s)} className="pane-2 pane-hover block p-4">
              <div className="flex items-start justify-between gap-2"><div className="font-semibold">Apple {s.name}</div><span className="text-xs text-ink-3">checked {timeAgo(st?.lastCheckedAt ?? null)}</span></div>
              <div className="text-sm text-ink-3">{s.street?.trim()}</div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {MODELS.map((m) => { const n = st?.perModel[m.key].available ?? 0; return <span key={m.key} className="inline-flex items-center gap-1.5 text-ink-2"><Dot state={n ? "ok" : "idle"} live={n > 0} /> {m.short}{n ? ` · ${n}` : ""}</span>; })}
              </div>
            </Link>
          );
        })}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">When do {c.name} stores restock?</h2>
          <div className="mt-3"><RestockClock stats={stats} label={`in ${c.name}`} /></div>
        </section>
        <section className="pane p-5">
          <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Latest restocks in {c.name}</h2><Link href={`/restocks?model=all&state=${c.stateSlug}`} className="text-sm text-ink-3 hover:text-ink">All of {c.state} →</Link></div>
          <RestockFeed rows={feed} showModel emptyText={`No restock recorded in ${c.name} yet.`} />
        </section>
      </div>

      {siblings.length > 0 && (
        <section className="mt-8">
          <div className="eyebrow">Other cities in {c.state}</div>
          <div className="mt-2 flex flex-wrap gap-2">{siblings.map((x) => <Link key={x.slug} href={cityPath(x.state, x.name)} className="chip px-3 py-1.5 text-xs">{x.name} · {x.stores.length}</Link>)}</div>
        </section>
      )}
      <p className="mt-8 text-xs text-ink-3">{duo.name} first: it is the configuration most people are hunting; 18 Pro and 18 Pro Max stock is shown alongside.</p>
    </div>
  );
}
