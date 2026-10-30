import type { Metadata } from "next";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { hasStatePage, STORES, MODELS, DEFAULT_MODEL, citiesWithStores, cityBySlug, stateSlug, storePath, statePath, cityPath, storeTimeZone, STATE_CODES, type ModelKey } from "@/lib/apple/catalog";
import { nearbyCities, neighborStates, cityRef, cityLabel } from "@/lib/seo/links";
import { nearestTo, nearestOutsideState, nearestInState, centroid, alertHref, faq, peakOf, itemListJsonLd } from "@/lib/seo/enrich";
import { Breadcrumbs, LinkRow, RelatedBlock } from "@/components/seo/Related";
import { BrowseModels } from "@/components/seo/Browse";
import { JsonLd } from "@/components/seo/JsonLd";
import { PlaceStatStrip } from "@/components/seo/StatStrip";
import { ModelPlaceCards } from "@/components/seo/ModelPlaceCards";
import { cityPlace, storePlace } from "@/lib/seo/products";

import { Faq } from "@/components/seo/Faq";
import { storesStock, storesStatusFull, restockFeed, restockStats, placeStats } from "@/lib/stock/queries";
import { ModelStoreMatrix } from "@/components/stores/ModelStoreMatrix";
import { StoreBlock } from "@/components/stores/StoreBlock";
import { NearbyStores } from "@/components/stores/NearbyStores";
import { StoreInfo } from "@/components/stores/StoreInfo";
import { RestockFeed } from "@/components/restocks/RestockFeed";
import { RestockClock } from "@/components/restocks/RestockClock";
import { DailyBars } from "@/components/restocks/DailyBars";
import { RestocksByConfig } from "@/components/restocks/RestocksByConfig";
import { placeTitle, placeDescription, placeIntro, placeSections, taxFaq, type PlaceCopyInput } from "@/lib/seo/placeCopy";
import { KeywordSections } from "@/components/content/KeywordSections";
import { Inline } from "@/components/content/Inline";
import { Figure } from "@/components/content/Figure";
import { SourceList } from "@/components/content/RichFaq";
import { emptyFacts } from "@/lib/content/facts";
import { SALES_TAX_SOURCE } from "@/content/sales-tax";
import { placePhotos } from "@/content/place-photos";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return citiesWithStores().filter((c) => c.stores.length > 1).map((c) => ({ state: c.stateSlug, city: c.slug }));
}

/** One load per request, shared by the page and its metadata: ≤ 7 queries (4 live + 3 cached statistics). */
const load = cache(async (state: string, city: string) => {
  const c = cityBySlug(state, city);
  if (!c) return null;
  const stores = [...c.stores].sort((a, b) => a.name.localeCompare(b.name));
  const numbers = stores.map((s) => s.storeNumber);
  const tz = storeTimeZone(stores[0]);
  const thin = stores.length === 1;
  const mid = centroid(stores);
  const near = nearestTo(mid, new Set(numbers), 6);
  const outside = nearestOutsideState({ ...mid, state: c.state }, 3);
  // StoreBlock lists the three nearest in-state stores too — load their stock as well, or they render as "no Duo".
  const extra = [...new Set([...near, ...outside, ...(thin ? [...nearestOutsideState(stores[0], 4), ...nearestInState(stores[0], 3)] : [])].map((x) => x.storeNumber))];
  const [stock, feed, stats, pstats, full, duoStats, maxStats] = await Promise.all([
    storesStock([...numbers, ...extra]),
    restockFeed({ state: c.state, city: c.name, limit: 12 }),
    restockStats(numbers, tz, 30),
    placeStats({ storeNumbers: numbers, tz }),
    thin ? storesStatusFull(numbers) : Promise.resolve(new Map()),
    placeStats({ storeNumbers: numbers, model: "duo", tz }),
    placeStats({ storeNumbers: numbers, model: "18-pro-max", tz }),
  ]);
  const stockNow = Object.fromEntries(MODELS.map((m) => [m.key, stores.filter((x) => (stock.get(x.storeNumber)?.perModel[m.key].available ?? 0) > 0).length])) as Record<ModelKey, number>;
  const duoStores = stores.filter((x) => (stock.get(x.storeNumber)?.perModel[DEFAULT_MODEL].available ?? 0) > 0);
  const copy: PlaceCopyInput = { kind: "city", name: c.name, state: c.state, stateSlug: c.stateSlug, citySlug: c.slug, stores, stockNow, stock, duo: duoStats, max: maxStats };
  return { c, stores, numbers, tz, thin, near, outside, stock, feed, stats, pstats, full, stockNow, duoStores, copy };
});

export async function generateMetadata({ params }: PageProps<"/stores/[state]/[city]">): Promise<Metadata> {
  const { state, city } = await params;
  const d = await load(state, city);
  if (!d) return {};
  const { c } = d;
  const title = placeTitle(d.copy);
  const description = placeDescription(d.copy);
  const url = cityPath(c.state, c.name);
  return { title, description, alternates: { canonical: url }, openGraph: { type: "website", siteName: "PickupChecker", title, description, url } };
}

/** City page; also the landing spot for the old /stores/{state}/{store-slug} URLs, which redirect. */
export default async function CityPage({ params }: PageProps<"/stores/[state]/[city]">) {
  const { state, city } = await params;
  const d = await load(state, city);
  if (!d) {
    const legacy = STORES.find((x) => x.slug === city && stateSlug(x.state) === state);
    if (legacy) permanentRedirect(storePath(legacy));
    notFound();
  }
  const { c, stores } = d;
  const code = STATE_CODES[c.state] ?? c.state;
  const siblings = citiesWithStores().filter((x) => x.state === c.state && x.slug !== c.slug);
  const me = cityRef(c.state, c.name);
  const nearCities = me ? nearbyCities(me.lat, me.lng, { exclude: me, limit: 8 }) : [];
  const neighbors = neighborStates(c.state);
  const place = `${c.name}, ${code}`;
  const alert = alertHref({ model: DEFAULT_MODEL, state: c.stateSlug, city: c.slug });
  const tq = taxFaq(d.copy);
  const questions = faq({ kind: "city", place: c.name, stores, stockNow: d.stockNow, duoStores: d.duoStores, stats: d.pstats, peak: peakOf(d.stats), nearest: d.near }).filter((q) => !q.q.startsWith("How long does stock last"));
  if (tq) questions.splice(2, 0, tq);
  const facts = emptyFacts();
  const [photo1, photo2] = placePhotos(`${c.name}, ${c.state}`);
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <JsonLd data={itemListJsonLd(`Apple Stores in ${place}`, stores)} />
      <Breadcrumbs items={[{ href: "/stores", label: "Apple Stores" }, ...(hasStatePage(c.state) ? [{ href: statePath(c.state), label: c.state }] : []), { label: c.name }]} />
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="display text-3xl sm:text-5xl">{placeTitle(d.copy)}</h1>
          <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-2"><Inline text={placeIntro(d.copy)} facts={facts} /></p>
          <p className="mt-1 text-sm text-ink-3">{stores.length} stores · checked every 20 s</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/map?stores=${d.numbers.join(",")}&model=${DEFAULT_MODEL}`} className="btn btn-ghost btn-sm">Show on map</Link>
          <Link href={alert} className="btn btn-primary btn-sm">Alert me in {c.name}</Link>
        </div>
      </div>

      <div className="mt-6"><ModelPlaceCards place={cityPlace(c.state, c.name) ?? storePlace(stores[0])} stockNow={d.stockNow} of={stores.length} unit="stores with it" /></div>
      <div className="mt-3"><PlaceStatStrip stores={stores.length} stockNow={d.stockNow} stats={d.pstats} /></div>

      {d.thin ? (
        <div className="mt-8"><StoreBlock store={stores[0]} summary={d.stock.get(stores[0].storeNumber)} rows={d.full.get(stores[0].storeNumber) ?? []} stock={d.stock} /></div>
      ) : (
        <>
          <section className="mt-8" aria-label="Stock by store">
            <h2 className="text-xl font-semibold">Stock by store and model</h2>
            <p className="mt-1 text-sm text-ink-3">In stock now / tracked, per model.</p>
            <div className="mt-3"><ModelStoreMatrix stores={stores} stock={d.stock} showCity={false} /></div>
          </section>
          <section className="mt-6 grid gap-3 md:grid-cols-2" aria-label="Store details">
            {stores.map((s) => (
              <div key={s.storeNumber} className="pane p-5">
                <h3 className="font-semibold"><Link href={storePath(s)} className="hover:underline">Apple {s.name}</Link></h3>
                <div className="mt-2"><StoreInfo store={s} compact /></div>
              </div>
            ))}
          </section>
        </>
      )}

      <div className="mx-auto mt-10 max-w-3xl">
        <Figure id={photo1} />
        <KeywordSections sections={placeSections(d.copy)} facts={facts} />
        <Figure id={photo2} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">When do {c.name} stores restock?</h2>
          <div className="mt-3"><RestockClock stats={d.stats} label={`in ${c.name}`} /></div>
        </section>
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">Last {d.pstats.days} days, day by day</h2>
          <div className="mt-3"><DailyBars stats={d.pstats} label={`in ${c.name}`} /></div>
        </section>
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">Restocks by configuration</h2>
          <div className="mt-3"><RestocksByConfig stats={d.pstats} label={`in ${c.name}`} /></div>
        </section>
        <section className="min-w-0">
          <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Latest restocks in {c.name}</h2><Link href={`/restocks?model=all&state=${c.stateSlug}`} className="text-sm text-ink-3 hover:text-ink">All of {c.state} →</Link></div>
          <RestockFeed rows={d.feed} showModel emptyText={`No restock recorded in ${c.name} yet.`} />
        </section>
      </div>

      {!d.thin && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <NearbyStores title={`Closest stores outside ${c.name}`} stores={d.near} stock={d.stock} />
          <NearbyStores title="Across the state line" stores={d.outside} stock={d.stock} />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Faq items={questions} title={`Apple Stores in ${c.name}: FAQ`} />
        <div className="pane p-5 sm:p-6"><SourceList sources={[...stores.slice(0, 3).filter((x) => x.url).map((x) => ({ label: `Apple: ${x.name} store page`, url: x.url! })), { label: "Apple: Shipping & Pickup help (what to bring to a pickup)", url: "https://www.apple.com/shop/help/shipping_delivery" }, SALES_TAX_SOURCE]} facts={facts} /></div>
      </div>

      <RelatedBlock title={`Around ${c.name}`}>
        {nearCities.length > 0 && <LinkRow title="Nearby cities with Apple Stores" links={nearCities.map((x) => ({ href: x.href, label: cityLabel(x), meta: `${Math.round(x.distance)} mi` }))} />}
        {siblings.length > 0 && <LinkRow title={`Other cities in ${c.state}`} links={siblings.map((x) => ({ href: cityPath(x.state, x.name), label: x.name, meta: String(x.stores.length) }))} more={{ href: statePath(c.state), label: `All of ${c.state}` }} />}
        {neighbors.length > 0 && <LinkRow title="Neighboring states" links={neighbors.map((n) => ({ href: n.href, label: n.name, meta: String(n.count) }))} />}
        <BrowseModels />
        <LinkRow title="Restock logs" links={[{ href: `/restocks?model=all&state=${c.stateSlug}`, label: `${c.state} restocks` }, { href: "/restocks", label: "All US restocks" }, { href: `/map?state=${code}&model=${DEFAULT_MODEL}`, label: `${c.state} on the map` }]} />
      </RelatedBlock>
    </div>
  );
}
