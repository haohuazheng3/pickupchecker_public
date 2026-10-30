import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { STORES, MODELS, DEFAULT_MODEL, modelByKey, citySlug, stateSlug, stateCodeOf, storePath, cityPath, statePath, storeTimeZone, modelKeyFor, catalogFor, type ModelKey, type Store, appleName } from "@/lib/apple/catalog";
import { nearestStores, nearbyCities, neighborStates, cityRef, cityLabel } from "@/lib/seo/links";
import { normalizeHours, compressHours, todayLabel, hoursText, storeJsonLd, nearestOutsideState, nearestInState, alertHref, faq, peakOf, storeTitle, fitTitle } from "@/lib/seo/enrich";
import { Breadcrumbs, LinkRow, RelatedBlock } from "@/components/seo/Related";
import { BrowseModels } from "@/components/seo/Browse";
import { JsonLd } from "@/components/seo/JsonLd";
import { PlaceStatStrip } from "@/components/seo/StatStrip";
import { ModelPlaceCards } from "@/components/seo/ModelPlaceCards";
import { storePlace } from "@/lib/seo/products";

import { Faq } from "@/components/seo/Faq";
import { storesStock, storeStatus, restockFeed, restockStats, placeStats } from "@/lib/stock/queries";
import { StockByModel } from "@/components/stores/StockByModel";
import { ConfigTable } from "@/components/stores/ConfigTable";
import { StoreInfo, HoursTable } from "@/components/stores/StoreInfo";
import { NearbyStores } from "@/components/stores/NearbyStores";
import { RestockFeed } from "@/components/restocks/RestockFeed";
import { RestockClock } from "@/components/restocks/RestockClock";
import { DailyBars } from "@/components/restocks/DailyBars";
import { RestocksByConfig } from "@/components/restocks/RestocksByConfig";
import { MiniMap } from "@/components/stores/MiniMap";
import { LiveAgo } from "@/components/site/LiveAgo";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return STORES.map((s) => ({ state: stateSlug(s.state), city: citySlug(s.city), store: s.slug }));
}

function find(state: string, city: string, store: string) {
  return STORES.find((s) => s.slug === store && stateSlug(s.state) === state && citySlug(s.city) === city);
}

/** Everything the page and its metadata need, loaded once per request (8 queries: 5 live + 3 cached statistics). */
const load = cache(async (s: Store) => {
  const tz = storeTimeZone(s);
  const nearby = nearestStores(s, 6);
  const outside = nearestOutsideState(s, 3);
  const inState = nearestInState(s, 4, { excludeCity: true });
  const others = [...new Set([...nearby, ...outside, ...inState].map((n) => n.storeNumber))];
  const [rows, stock, feed, stats, pstats] = await Promise.all([
    storeStatus(s.storeNumber),
    storesStock([s.storeNumber, ...others]),
    restockFeed({ storeNumber: s.storeNumber, kind: "all", limit: 30 }),
    restockStats([s.storeNumber], tz, 30),
    placeStats({ storeNumbers: [s.storeNumber], tz }),
  ]);
  const summary = stock.get(s.storeNumber);
  const stockNow = Object.fromEntries(MODELS.map((m) => [m.key, summary?.perModel[m.key].available ?? 0])) as Record<ModelKey, number>;
  const configs = Object.fromEntries(MODELS.map((m) => [m.key, rows.filter((r) => modelKeyFor(r.item.model) === m.key).length || catalogFor(m.key).length])) as Record<ModelKey, number>;
  return { tz, nearby, outside, inState, rows, stock, summary, feed, stats, pstats, stockNow, configs };
});

export async function generateMetadata({ params }: PageProps<"/stores/[state]/[city]/[store]">): Promise<Metadata> {
  const { state, city, store } = await params;
  const s = find(state, city, store);
  if (!s) return {};
  const d = await load(s);
  const title = storeTitle(s, stateCodeOf(s), d.stockNow.duo);
  const description = fitTitle([
    `Live iPhone pickup stock at ${appleName(s)}, ${s.city} ${stateCodeOf(s)}: ${d.stockNow.duo} Duo, ${d.stockNow["18-pro"]} 18 Pro and ${d.stockNow["18-pro-max"]} Pro Max configurations in stock now, ${d.pstats.week} restocks this week, hours and history.`,
    `${appleName(s)}, ${s.city} ${stateCodeOf(s)}: ${d.stockNow.duo} Duo, ${d.stockNow["18-pro"]} 18 Pro and ${d.stockNow["18-pro-max"]} Pro Max configurations in stock for pickup now; ${d.pstats.week} restocks this week.`,
    `${appleName(s)}, ${s.city}: ${d.stockNow.duo} Duo, ${d.stockNow["18-pro"]} 18 Pro, ${d.stockNow["18-pro-max"]} Pro Max configurations in stock for pickup; ${d.pstats.week} restocks this week.`,
  ], 155);
  return { title, description, alternates: { canonical: storePath(s) }, openGraph: { type: "website", siteName: "PickupChecker", title, description, url: storePath(s) } };
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
  const d = await load(s);
  const week = normalizeHours(s.hours);
  const today = todayLabel(week, d.tz);
  const sameCity = STORES.filter((x) => x.state === s.state && x.city === s.city && x.storeNumber !== s.storeNumber);
  const sameState = STORES.filter((x) => x.state === s.state && x.city !== s.city).sort((a, b) => a.city.localeCompare(b.city)).slice(0, 14);
  const here = cityRef(s.state, s.city);
  const cities = nearbyCities(s.lat, s.lng, { exclude: here, limit: 8 });
  const neighbors = neighborStates(s.state);
  const duo = modelByKey(DEFAULT_MODEL)!;
  const code = stateCodeOf(s);
  const place = `${appleName(s)}`;
  const alert = alertHref({ model: DEFAULT_MODEL, store: s.storeNumber });
  const questions = faq({ kind: "store", place, stores: [s], stockNow: d.stockNow, stats: d.pstats, peak: peakOf(d.stats), nearest: d.nearby, hours: compressHours(week), todayText: `${hoursText(today.today)} (${today.label.toLowerCase()})` });
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <JsonLd data={storeJsonLd(s, week)} />
      <Breadcrumbs items={[{ href: "/stores", label: "Apple Stores" }, { href: statePath(s.state), label: s.state }, { href: cityPath(s.state, s.city), label: s.city }, { label: place }]} />
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="display text-3xl sm:text-5xl">{place}</h1>
          <div className="mt-3"><StoreInfo store={s} showMapLink={false} /></div>
          <p className="mt-2 text-sm text-ink-3">Checked <LiveAgo iso={d.summary?.lastCheckedAt ?? null} /> · every 20 s</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/map?store=${s.storeNumber}&model=${DEFAULT_MODEL}`} className="btn btn-ghost btn-sm">Show on map</Link>
          <Link href={alert} className="btn btn-primary btn-sm">Alert me for {duo.short} here</Link>
        </div>
      </div>

      <div className="mt-6"><ModelPlaceCards place={storePlace(s)} stockNow={d.stockNow} of={Object.fromEntries(MODELS.map((m) => [m.key, catalogFor(m.key).length])) as Record<ModelKey, number>} unit="configs in stock" /></div>
      <div className="mt-3"><PlaceStatStrip stores={1} stockNow={d.stockNow} stats={d.pstats} storeMode /></div>

      <section className="mt-6">
        <h2 className="text-xl font-semibold">Pickup stock right now</h2>
        <div className="mt-3"><StockByModel summary={d.summary} storeNumber={s.storeNumber} /></div>
      </section>

      <div className="mt-6" id="configs"><ConfigTable store={s} rows={d.rows} /></div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="pane p-5">
            <h2 className="text-xl font-semibold">When does {s.name} restock?</h2>
            <div className="mt-3"><RestockClock stats={d.stats} label="here" /></div>
          </section>
          <section className="pane p-5">
            <h2 className="text-xl font-semibold">Last {d.pstats.days} days, day by day</h2>
            <div className="mt-3"><DailyBars stats={d.pstats} label="here" /></div>
          </section>
          <section className="pane p-5">
            <h2 className="text-xl font-semibold">Restocks by configuration</h2>
            <div className="mt-3"><RestocksByConfig stats={d.pstats} label="here" store={s.storeNumber} /></div>
          </section>
          <section className="min-w-0">
            <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Restock history</h2><Link href={`/restocks?model=all&state=${stateSlug(s.state)}`} className="text-sm text-ink-3 hover:text-ink">All of {s.state} →</Link></div>
            <RestockFeed rows={d.feed} showModel emptyText="No restock or sell-out recorded here yet." />
          </section>
        </div>
        <aside className="space-y-4">
          <MiniMap lat={s.lat} lng={s.lng} label={place} href={`/map?store=${s.storeNumber}&model=${DEFAULT_MODEL}`} />
          <div className="pane p-5"><HoursTable store={s} /></div>
          <NearbyStores title="Nearby stores" stores={d.nearby} stock={d.stock} />
          {d.inState.length > 0 && <NearbyStores title={`Elsewhere in ${s.state}`} stores={d.inState} stock={d.stock} />}
          <NearbyStores title="Across the state line" stores={d.outside} stock={d.stock} />
          {s.image && (
            // eslint-disable-next-line @next/next/no-img-element -- Apple CDN image, already sized by its query string
            <img src={s.image} alt={place} className="w-full rounded-[20px] border border-line" loading="lazy" />
          )}
        </aside>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Faq items={questions} title={`${place} FAQ`} />
      </div>

      <RelatedBlock title={`Around ${place}`}>
        {sameCity.length > 0 && <LinkRow title={`Other Apple Stores in ${s.city}`} links={sameCity.map((x) => ({ href: storePath(x), label: x.name }))} more={{ href: cityPath(s.state, s.city), label: `${s.city} page` }} />}
        {cities.length > 0 && <LinkRow title="Nearby cities with Apple Stores" links={cities.map((c) => ({ href: c.href, label: cityLabel(c), meta: `${Math.round(c.distance)} mi` }))} />}
        <LinkRow title={`More Apple Stores in ${s.state}`} links={sameState.map((x) => ({ href: storePath(x), label: `${x.name} · ${x.city}` }))} more={{ href: statePath(s.state), label: `All of ${s.state}` }} />
        {neighbors.length > 0 && <LinkRow title="Neighboring states" links={neighbors.map((n) => ({ href: n.href, label: n.name, meta: String(n.count) }))} />}
        <BrowseModels />
        <LinkRow title="Restock logs" links={[{ href: `/restocks?model=all&state=${stateSlug(s.state)}`, label: `${s.state} restocks` }, { href: "/restocks", label: "All US restocks" }, { href: `/map?state=${code}&model=${DEFAULT_MODEL}`, label: `${s.state} on the map` }]} />
      </RelatedBlock>
      <p className="mt-8 text-xs text-ink-3">Availability as shown on apple.com for in-store pickup, as of the last check.</p>
    </div>
  );
}
