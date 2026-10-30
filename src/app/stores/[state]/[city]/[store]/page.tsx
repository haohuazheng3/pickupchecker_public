import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { STORES, MODELS, DEFAULT_MODEL, modelByKey, citySlug, stateSlug, stateCodeOf, storePath, cityPath, statePath, storeTimeZone } from "@/lib/apple/catalog";
import { nearestStores, nearbyCities, neighborStates, cityRef, cityLabel } from "@/lib/seo/links";
import { Breadcrumbs, LinkRow, RelatedBlock } from "@/components/seo/Related";
import { BrowseModels } from "@/components/seo/Browse";
import { storesStock, restockFeed, restockStats } from "@/lib/stock/queries";
import { StockByModel } from "@/components/stores/StockByModel";
import { RestockFeed } from "@/components/restocks/RestockFeed";
import { RestockClock } from "@/components/restocks/RestockClock";
import { MiniMap } from "@/components/stores/MiniMap";
import { Dot, timeAgo } from "@/components/stock/StatusBits";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return STORES.map((s) => ({ state: stateSlug(s.state), city: citySlug(s.city), store: s.slug }));
}

function find(state: string, city: string, store: string) {
  return STORES.find((s) => s.slug === store && stateSlug(s.state) === state && citySlug(s.city) === city);
}

export async function generateMetadata({ params }: PageProps<"/stores/[state]/[city]/[store]">): Promise<Metadata> {
  const { state, city, store } = await params;
  const s = find(state, city, store);
  if (!s) return {};
  return {
    title: `Apple ${s.name}, ${s.city}, ${stateCodeOf(s)} — iPhone Duo & 18 Pro pickup stock, restock times`,
    description: `Live in-store pickup availability for every iPhone Duo, 18 Pro and 18 Pro Max configuration at Apple ${s.name} (${s.street?.trim()}, ${s.city}, ${s.state}), when this store usually restocks, and its restock history.`,
    alternates: { canonical: storePath(s) },
  };
}

export default async function StorePage({ params }: PageProps<"/stores/[state]/[city]/[store]">) {
  const { state, city, store } = await params;
  const s = find(state, city, store);
  if (!s) {
    // Old URL shape /stores/{state}/{store-slug} lands here with city = store slug: send it to the canonical page.
    const legacy = STORES.find((x) => x.slug === city && stateSlug(x.state) === state);
    if (legacy && store === legacy.slug) permanentRedirect(storePath(legacy));
    notFound();
  }
  const tz = storeTimeZone(s);
  const [stock, feed, stats, duoStats] = await Promise.all([
    storesStock([s.storeNumber]), restockFeed({ storeNumber: s.storeNumber, kind: "all", limit: 30 }), restockStats([s.storeNumber], tz, 30), restockStats([s.storeNumber], tz, 30, DEFAULT_MODEL),
  ]);
  const summary = stock.get(s.storeNumber);
  const nearby = nearestStores(s, 6);
  const nearbyStock = await storesStock(nearby.map((n) => n.storeNumber));
  const sameCity = STORES.filter((x) => x.state === s.state && x.city === s.city && x.storeNumber !== s.storeNumber);
  const sameState = STORES.filter((x) => x.state === s.state && x.city !== s.city).sort((a, b) => a.city.localeCompare(b.city)).slice(0, 14);
  const here = cityRef(s.state, s.city);
  const cities = nearbyCities(s.lat, s.lng, { exclude: here, limit: 8 });
  const neighbors = neighborStates(s.state);
  const duo = modelByKey(DEFAULT_MODEL)!;
  const code = stateCodeOf(s);
  const ld = {
    "@context": "https://schema.org", "@type": "Store", name: `Apple ${s.name}`, url: `https://pickupchecker.com${storePath(s)}`, sameAs: s.url,
    address: { "@type": "PostalAddress", streetAddress: s.street?.trim(), addressLocality: s.city, addressRegion: s.state, postalCode: s.postalCode, addressCountry: "US" },
    geo: { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lng }, telephone: s.phone, image: s.image,
  };
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Breadcrumbs items={[{ href: "/stores", label: "Apple Stores" }, { href: statePath(s.state), label: s.state }, { href: cityPath(s.state, s.city), label: s.city }, { label: `Apple ${s.name}` }]} />
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl sm:text-5xl">Apple {s.name}</h1>
          <p className="mt-2 text-ink-2">{s.street?.trim()}, {s.city}, {code} {s.postalCode}{s.phone ? ` · ${s.phone}` : ""}</p>
          <p className="mt-1 text-sm text-ink-3">Last checked {timeAgo(summary?.lastCheckedAt ?? null)} · re-checked every 20 s · <a className="underline" href={s.url} rel="nofollow noopener" target="_blank">apple.com store page</a></p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/map?store=${s.storeNumber}&model=${DEFAULT_MODEL}`} className="btn btn-ghost btn-sm">Show on map</Link>
          <Link href={`/?model=${DEFAULT_MODEL}&store=${s.storeNumber}#notify`} className="btn btn-primary btn-sm">Alert me for {duo.short} here</Link>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="text-xl font-semibold">Pickup stock right now</h2>
        <div className="mt-3"><StockByModel summary={summary} storeNumber={s.storeNumber} /></div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="pane p-5">
            <h2 className="text-xl font-semibold">When does {s.name} restock?</h2>
            <div className="mt-3"><RestockClock stats={stats} label="here" /></div>
            {duoStats.total > 0 && duoStats.total !== stats.total && <p className="mt-3 text-xs text-ink-3">{duoStats.total} of those were the {duo.name}.</p>}
          </section>
          <section className="pane p-5">
            <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Restock history</h2><Link href={`/restocks?model=all&state=${stateSlug(s.state)}`} className="text-sm text-ink-3 hover:text-ink">All of {s.state} →</Link></div>
            <RestockFeed rows={feed} showModel emptyText="No restock recorded here yet. Every change is logged the second it happens." />
          </section>
        </div>
        <aside className="space-y-4">
          <MiniMap lat={s.lat} lng={s.lng} label={`Apple ${s.name}`} href={`/map?store=${s.storeNumber}&model=${DEFAULT_MODEL}`} />
          <div className="pane p-5">
            <div className="eyebrow">Hours</div>
            <ul className="mt-2 space-y-1 text-sm text-ink-2">
              {(s.hours ?? []).map((h, i) => <li key={i}>{h.days.length === 7 ? "Every day" : h.days.join(", ")}: {h.opens && h.closes ? `${h.opens.slice(0, 5)}–${h.closes.slice(0, 5)}` : "Closed"}</li>)}
            </ul>
          </div>
          {nearby.length > 0 && (
            <div className="pane p-5">
              <div className="eyebrow">Nearby stores</div>
              <ul className="mt-2 divide-y divide-line text-sm">
                {nearby.map((n) => {
                  const st = nearbyStock.get(n.storeNumber);
                  const d = st?.perModel[DEFAULT_MODEL].available ?? 0;
                  return <li key={n.storeNumber} className="flex items-center justify-between gap-2 py-2"><Link href={storePath(n)} className="hover:underline">{n.name} <span className="text-ink-3">· {Math.round(n.distance)} mi</span></Link><span className="inline-flex items-center gap-1.5 text-xs text-ink-3"><Dot state={d ? "ok" : "idle"} live={d > 0} />{d ? `${duo.short} · ${d}` : `no ${duo.short}`}</span></li>;
                })}
              </ul>
            </div>
          )}
          {s.image && (
            // eslint-disable-next-line @next/next/no-img-element -- Apple CDN image, already sized by its query string
            <img src={s.image} alt={`Apple ${s.name}`} className="w-full rounded-[20px] border border-line" loading="lazy" />
          )}
        </aside>
      </div>

      <RelatedBlock title={`Around Apple ${s.name}`}>
        {sameCity.length > 0 && <LinkRow title={`Other Apple Stores in ${s.city}`} links={sameCity.map((x) => ({ href: storePath(x), label: x.name }))} more={{ href: cityPath(s.state, s.city), label: `${s.city} page` }} />}
        {cities.length > 0 && <LinkRow title="Nearby cities with Apple Stores" links={cities.map((c) => ({ href: c.href, label: cityLabel(c), meta: `${Math.round(c.distance)} mi` }))} />}
        <LinkRow title={`More Apple Stores in ${s.state}`} links={sameState.map((x) => ({ href: storePath(x), label: `${x.name} · ${x.city}` }))} more={{ href: statePath(s.state), label: `All of ${s.state}` }} />
        {neighbors.length > 0 && <LinkRow title="Neighboring states" links={neighbors.map((n) => ({ href: n.href, label: n.name, meta: String(n.count) }))} />}
        <BrowseModels />
        <LinkRow title="Restock logs" links={[{ href: `/restocks?model=all&state=${stateSlug(s.state)}`, label: `${s.state} restocks` }, { href: "/restocks", label: "All US restocks" }, { href: `/map?state=${stateCodeOf(s)}&model=${DEFAULT_MODEL}`, label: `${s.state} on the map` }]} />
      </RelatedBlock>
      <p className="mt-8 text-xs text-ink-3">Availability is what apple.com shows for in-store pickup at this store, as of the last check. {MODELS.map((m) => m.name).join(", ")} are tracked; Apple, iPhone and Apple Store are trademarks of Apple Inc.</p>
    </div>
  );
}
