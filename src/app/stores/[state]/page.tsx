import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { STORES, MODELS, DEFAULT_MODEL, statesWithStores, citiesWithStores, storePath, cityPath, storeTimeZone } from "@/lib/apple/catalog";
import { neighborStates } from "@/lib/seo/links";
import { Breadcrumbs, LinkRow, RelatedBlock } from "@/components/seo/Related";
import { BrowseModels, BrowseStates } from "@/components/seo/Browse";
import { storesStock, restockFeed, restockStats, restockCounts } from "@/lib/stock/queries";
import { RestockFeed } from "@/components/restocks/RestockFeed";
import { RestockClock } from "@/components/restocks/RestockClock";
import { Dot } from "@/components/stock/StatusBits";
import { LiveAgo } from "@/components/site/LiveAgo";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return statesWithStores().map((s) => ({ state: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/stores/[state]">): Promise<Metadata> {
  const { state } = await params;
  const s = statesWithStores().find((x) => x.slug === state);
  if (!s) return {};
  return {
    title: `Apple Stores in ${s.name} — iPhone Duo & 18 Pro pickup stock by city`,
    description: `Live in-store pickup availability for the iPhone Duo, 18 Pro and 18 Pro Max at all ${s.count} Apple Store${s.count > 1 ? "s" : ""} in ${s.name}, grouped by city, with restock times and the latest restocks.`,
    alternates: { canonical: `/stores/${s.slug}` },
  };
}

export default async function StatePage({ params }: PageProps<"/stores/[state]">) {
  const { state } = await params;
  const s = statesWithStores().find((x) => x.slug === state);
  if (!s) notFound();
  const stores = STORES.filter((x) => x.state === s.name);
  const cities = citiesWithStores().filter((c) => c.state === s.name);
  const numbers = stores.map((x) => x.storeNumber);
  const tz = storeTimeZone(stores[0]);
  const [stock, feed, stats, counts] = await Promise.all([storesStock(numbers), restockFeed({ state: s.name, limit: 12 }), restockStats(numbers, tz, 30), restockCounts({ state: s.name })]);
  const duoStores = stores.filter((x) => (stock.get(x.storeNumber)?.perModel[DEFAULT_MODEL].available ?? 0) > 0);
  const neighbors = neighborStates(s.name);
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <Breadcrumbs items={[{ href: "/stores", label: "Apple Stores" }, { label: s.name }]} />
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl sm:text-5xl">Apple Stores in {s.name}</h1>
          <p className="mt-2 text-ink-2">{stores.length} store{stores.length > 1 ? "s" : ""} in {cities.length} cit{cities.length > 1 ? "ies" : "y"} · <b className="text-ink">{duoStores.length}</b> with an iPhone Duo for pickup right now · {counts.day} restock{counts.day === 1 ? "" : "s"} in 24 h.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{cities.map((c) => <Link key={c.slug} href={cityPath(c.state, c.name)} className="chip px-3 py-1.5 text-xs">{c.name}<span className="text-ink-3"> · {c.stores.length}</span></Link>)}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/map?state=${s.code}&model=${DEFAULT_MODEL}`} className="btn btn-ghost btn-sm">Show on map</Link>
          <Link href={`/?model=${DEFAULT_MODEL}#notify`} className="btn btn-primary btn-sm">Alert me</Link>
        </div>
      </div>

      {cities.map((c) => (
        <section key={c.slug} className="mt-6">
          <div className="flex items-baseline justify-between gap-3"><h2 className="text-lg font-semibold"><Link href={cityPath(c.state, c.name)} className="hover:underline">{c.name}</Link> <span className="text-sm font-normal text-ink-3">· {c.stores.length}</span></h2><Link href={cityPath(c.state, c.name)} className="text-xs text-ink-3 hover:text-ink">City page →</Link></div>
          <ul className="mt-2 grid gap-3 md:grid-cols-2">
            {c.stores.sort((a, b) => a.name.localeCompare(b.name)).map((st) => {
              const r = stock.get(st.storeNumber);
              return (
                <li key={st.storeNumber}>
                  <Link href={storePath(st)} className="pane-2 pane-hover block p-4">
                    <div className="flex items-start justify-between gap-2"><span className="font-semibold">Apple {st.name}</span><span className="text-xs text-ink-3">checked <LiveAgo iso={r?.lastCheckedAt ?? null} /></span></div>
                    <div className="text-sm text-ink-3">{st.street?.trim()}</div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      {MODELS.map((m) => { const n = r?.perModel[m.key].available ?? 0; return <span key={m.key} className="inline-flex items-center gap-1.5 text-ink-2"><Dot state={n ? "ok" : "idle"} live={n > 0} /> {m.short}{n ? ` · ${n}` : ""}</span>; })}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">When do {s.name} stores restock?</h2>
          <div className="mt-3"><RestockClock stats={stats} label={`in ${s.name}`} /></div>
        </section>
        <section className="pane p-5">
          <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Latest restocks in {s.name}</h2><Link href={`/restocks?model=all&state=${s.slug}`} className="text-sm text-ink-3 hover:text-ink">Full log →</Link></div>
          <RestockFeed rows={feed} showModel emptyText={`No restock recorded in ${s.name} yet.`} />
        </section>
      </div>

      <RelatedBlock title={`Beyond ${s.name}`}>
        {neighbors.length > 0 && <LinkRow title="Neighboring states" links={neighbors.map((n) => ({ href: n.href, label: n.name, meta: String(n.count) }))} />}
        <BrowseModels />
        <LinkRow title="Restock logs" links={[{ href: `/restocks?model=all&state=${s.slug}`, label: `${s.name} restocks` }, { href: "/restocks", label: "All US restocks" }, { href: `/map?state=${s.code}&model=${DEFAULT_MODEL}`, label: `${s.name} on the map` }]} />
        <BrowseStates current={s.name} />
      </RelatedBlock>
    </div>
  );
}
