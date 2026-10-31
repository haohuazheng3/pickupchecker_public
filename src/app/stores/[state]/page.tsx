import type { Metadata } from "next";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { cache } from "react";
import { notFound } from "next/navigation";
import { hasStatePage, STORES, MODELS, DEFAULT_MODEL, statesWithStores, citiesWithStores, storePath, cityPath, storeTimeZone, type ModelKey } from "@/lib/apple/catalog";
import { neighborStates } from "@/lib/seo/links";
import { nearestOutsideState, centroid, alertHref, faq, peakOf, itemListJsonLd } from "@/lib/seo/enrich";
import { Breadcrumbs, LinkRow, RelatedBlock } from "@/components/seo/Related";
import { BrowseModels, BrowseStates } from "@/components/seo/Browse";
import { JsonLd } from "@/components/seo/JsonLd";
import { PlaceStatStrip } from "@/components/seo/StatStrip";
import { ModelPlaceCards } from "@/components/seo/ModelPlaceCards";
import { statePlace } from "@/lib/seo/products";

import { Faq } from "@/components/seo/Faq";
import { storesStock, storesStatusFull, restockFeed, restockStats, placeStats } from "@/lib/stock/queries";
import { ModelStoreMatrix } from "@/components/stores/ModelStoreMatrix";
import { StoreBlock } from "@/components/stores/StoreBlock";
import { NearbyStores } from "@/components/stores/NearbyStores";
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
import { AlertPanelFor } from "@/components/alerts/AlertPanelServer";

export const dynamic = "force-dynamic";

/** States with this many stores or fewer render every store in full (a complete landing page even with zero events). */
const THIN = 2;

export function generateStaticParams() {
  return statesWithStores().filter((s) => hasStatePage(s.name)).map((s) => ({ state: s.slug }));
}

/** One load per request, shared by the page and its metadata: ≤ 7 queries (4 live + 3 cached statistics). */
const load = cache(async (slug: string) => {
  const s = statesWithStores().find((x) => x.slug === slug);
  if (!s) return null;
  const stores = STORES.filter((x) => x.state === s.name).sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name));
  const cities = citiesWithStores().filter((c) => c.state === s.name);
  const numbers = stores.map((x) => x.storeNumber);
  const tz = storeTimeZone(stores[0]);
  const thin = stores.length <= THIN;
  const outside = nearestOutsideState({ ...centroid(stores), state: s.name }, 6);
  const extra = thin ? [...new Set([...outside, ...stores.flatMap((x) => nearestOutsideState(x, 4))].map((x) => x.storeNumber))] : outside.map((x) => x.storeNumber);
  const [stock, feed, stats, pstats, full, duoStats, maxStats] = await Promise.all([
    storesStock([...numbers, ...extra]),
    restockFeed({ state: s.name, limit: 12 }),
    restockStats(numbers, tz, 30),
    placeStats({ storeNumbers: numbers, tz }),
    thin ? storesStatusFull(numbers) : Promise.resolve(new Map()),
    placeStats({ storeNumbers: numbers, model: "duo", tz }),
    placeStats({ storeNumbers: numbers, model: "18-pro-max", tz }),
  ]);
  const stockNow = Object.fromEntries(MODELS.map((m) => [m.key, stores.filter((x) => (stock.get(x.storeNumber)?.perModel[m.key].available ?? 0) > 0).length])) as Record<ModelKey, number>;
  const duoStores = stores.filter((x) => (stock.get(x.storeNumber)?.perModel[DEFAULT_MODEL].available ?? 0) > 0);
  const copy: PlaceCopyInput = { kind: "state", name: s.name, state: s.name, stateSlug: s.slug, stores, cities: cities.length, stockNow, stock, duo: duoStats, max: maxStats };
  return { s, stores, cities, numbers, tz, thin, outside, stock, feed, stats, pstats, full, stockNow, duoStores, copy };
});

export async function generateMetadata({ params }: PageProps<"/stores/[state]">): Promise<Metadata> {
  const { state } = await params;
  const d = await load(state);
  if (!d) return {};
  const { s } = d;
  const title = placeTitle(d.copy);
  const description = placeDescription(d.copy);
  return { title, description, alternates: { canonical: `/stores/${s.slug}` }, openGraph: { type: "website", siteName: "PickupChecker", title, description, url: `/stores/${s.slug}` } };
}

export default async function StatePage({ params }: PageProps<"/stores/[state]">) {
  const { state } = await params;
  const d = await load(state);
  if (!d) notFound();
  const { s, stores, cities } = d;
  const neighbors = neighborStates(s.name);
  const alert = alertHref({ model: DEFAULT_MODEL, state: s.slug });
  // Five questions: the "how long does stock last" answer now lives in the iPhone Duo section, the tax question takes its place.
  const tq = taxFaq(d.copy);
  const questions = faq({ kind: "state", place: s.name, stores, stockNow: d.stockNow, duoStores: d.duoStores, stats: d.pstats, peak: peakOf(d.stats), nearest: d.outside }).filter((q) => !q.q.startsWith("How long does stock last"));
  if (tq) questions.splice(2, 0, tq);
  const facts = emptyFacts();
  const [photo1, photo2] = placePhotos(s.name);
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <JsonLd data={itemListJsonLd(`Apple Stores in ${s.name}`, stores)} />
      <Breadcrumbs items={[{ href: "/stores", label: "Apple Stores" }, { label: s.name }]} />
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="display text-3xl sm:text-5xl">{placeTitle(d.copy)}</h1>
          <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-2"><Inline text={placeIntro(d.copy)} facts={facts} /></p>
          <p className="mt-1 text-sm text-ink-3">{stores.length} stores · {cities.length} cit{cities.length > 1 ? "ies" : "y"} · checked every 15 s</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{cities.map((c) => <Link key={c.slug} href={cityPath(c.state, c.name)} className="chip px-3 py-1.5 text-xs">{c.name}<span className="text-ink-3"> · {c.stores.length}</span></Link>)}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/map?state=${s.code}&model=${DEFAULT_MODEL}`} className="btn btn-ghost btn-sm">Show on map</Link>
          <Link href={alert} className="btn btn-primary btn-sm">Alert me in {s.code}</Link>
        </div>
      </div>
      <AlertPanelFor href={alert} summary={`Pick the phones and tick the ${s.name} stores you can get to`} />

      <div className="mt-6"><ModelPlaceCards place={statePlace(s.name)!} stockNow={d.stockNow} of={stores.length} unit="stores with it" /></div>
      <div className="mt-3"><PlaceStatStrip stores={stores.length} cities={cities.length} stockNow={d.stockNow} stats={d.pstats} /></div>

      {d.thin ? (
        <div className="mt-8 space-y-10">
          {stores.map((st) => <StoreBlock key={st.storeNumber} store={st} summary={d.stock.get(st.storeNumber)} rows={d.full.get(st.storeNumber) ?? []} stock={d.stock} />)}
        </div>
      ) : (
        <section className="mt-8" aria-label="Stock by store">
          <h2 className="text-xl font-semibold">Stock by store and model</h2>
          <p className="mt-1 text-sm text-ink-3">In stock now / tracked, per model.</p>
          {cities.map((c) => (
            <div key={c.slug} className="mt-5">
              <div className="flex items-baseline justify-between gap-3"><h3 className="text-lg font-semibold"><Link href={cityPath(c.state, c.name)} className="hover:underline">{c.name}</Link> <span className="text-sm font-normal text-ink-3">· {c.stores.length}</span></h3><Link href={cityPath(c.state, c.name)} className="text-xs text-ink-3 hover:text-ink">City page →</Link></div>
              <div className="mt-2"><ModelStoreMatrix stores={[...c.stores].sort((a, b) => a.name.localeCompare(b.name))} stock={d.stock} showCity={false} /></div>
            </div>
          ))}
        </section>
      )}

      <div className="mx-auto mt-10 max-w-3xl">
        <Figure id={photo1} />
        <KeywordSections sections={placeSections(d.copy)} facts={facts} />
        <Figure id={photo2} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">When do {s.name} stores restock?</h2>
          <div className="mt-3"><RestockClock stats={d.stats} label={`in ${s.name}`} /></div>
        </section>
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">Last {d.pstats.days} days, day by day</h2>
          <div className="mt-3"><DailyBars stats={d.pstats} label={`in ${s.name}`} /></div>
        </section>
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">Restocks by configuration</h2>
          <div className="mt-3"><RestocksByConfig stats={d.pstats} label={`in ${s.name}`} /></div>
        </section>
        <section className="min-w-0">
          <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Latest restocks in {s.name}</h2><Link href={`/restocks?model=all&state=${s.slug}`} className="text-sm text-ink-3 hover:text-ink">Full log →</Link></div>
          <RestockFeed rows={d.feed} showModel emptyText={`No restock recorded in ${s.name} yet.`} />
        </section>
      </div>

      {!d.thin && <div className="mt-6"><NearbyStores title={`Closest Apple Stores outside ${s.name}`} stores={d.outside} stock={d.stock} hint={`Distance from the center of ${s.name}'s stores.`} /></div>}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Faq items={questions} title={`Apple Stores in ${s.name}: FAQ`} />
        <div className="pane p-5 sm:p-6"><SourceList sources={[...stores.slice(0, 3).filter((x) => x.url).map((x) => ({ label: `Apple: ${x.name} store page`, url: x.url! })), { label: "Apple: Shipping & Pickup help (what to bring to a pickup)", url: "https://www.apple.com/shop/help/shipping_delivery" }, SALES_TAX_SOURCE]} facts={facts} /></div>
      </div>

      <RelatedBlock title={`Beyond ${s.name}`}>
        <LinkRow title={`Every store in ${s.name}`} links={stores.map((x) => ({ href: storePath(x), label: `${x.name} · ${x.city}` }))} />
        {neighbors.length > 0 && <LinkRow title="Neighboring states" links={neighbors.map((n) => ({ href: n.href, label: n.name, meta: String(n.count) }))} />}
        <BrowseModels />
        <LinkRow title="Restock logs" links={[{ href: `/restocks?model=all&state=${s.slug}`, label: `${s.name} restocks` }, { href: "/restocks", label: "All US restocks" }, { href: `/map?state=${s.code}&model=${DEFAULT_MODEL}`, label: `${s.name} on the map` }]} />
        <BrowseStates current={s.name} />
      </RelatedBlock>
    </div>
  );
}
