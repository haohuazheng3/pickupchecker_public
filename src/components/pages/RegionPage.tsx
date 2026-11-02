/**
 * The page of a US state or another country's region (province, prefecture, area…): /stores/{state} or
 * /{cc}/stores/{region}. Indexed only where the region has two or more stores in two or more cities and is
 * not the whole country (placeTarget); the proxy 308s every other region URL to the page that answers it.
 */
import type { Metadata } from "next";
import { CHECK_NOTE } from "@/lib/plans";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { hasStatePage, storesOf, MODELS, DEFAULT_MODEL, statesWithStores, citiesWithStores, storePath, cityPath, storeTimeZone, placeTarget, storesIndexPath, mapPath, restocksPath, distanceMiles, type ModelKey } from "@/lib/apple/catalog";
import { prefixOf, type Country } from "@/lib/apple/countries";
import { neighborStates } from "@/lib/seo/links";
import { regionRefs } from "@/lib/seo/countryLinks";
import { nearestOutsideState, centroid, alertHref, faq, peakOf, itemListJsonLd } from "@/lib/seo/enrich";
import { Breadcrumbs, LinkRow, RelatedBlock, type Crumb } from "@/components/seo/Related";
import { BrowseModels, BrowseStates } from "@/components/seo/Browse";
import { BrowseCountryModels, BrowseCountryRegions } from "@/components/seo/CountryBrowse";
import { JsonLd } from "@/components/seo/JsonLd";
import { PlaceStatStrip } from "@/components/seo/StatStrip";
import { ModelPlaceCards } from "@/components/seo/ModelPlaceCards";
import { statePlace } from "@/lib/seo/products";
import { treeOf } from "@/lib/seo/tree";
import { Faq } from "@/components/seo/Faq";
import { storesStock, storesStatusFull, restockFeed, restockStats, placeStats, restockReportStats } from "@/lib/stock/queries";
import { ModelStoreMatrix } from "@/components/stores/ModelStoreMatrix";
import { StoreBlock } from "@/components/stores/StoreBlock";
import { NearbyStores } from "@/components/stores/NearbyStores";
import { RestockFeed } from "@/components/restocks/RestockFeed";
import { RestockClock } from "@/components/restocks/RestockClock";
import { DailyBars } from "@/components/restocks/DailyBars";
import { RestocksByConfig } from "@/components/restocks/RestocksByConfig";
import { placeTitle, placeDescription, placeIntro, placeSections, taxFaq, type PlaceCopyInput } from "@/lib/seo/placeCopy";
import { intlPlaceTitle, intlPlaceDescription, intlPlaceIntro, intlPlaceSections, taxFaqIntl, placeLabel, type IntlPlaceInput } from "@/lib/seo/countryCopy";
import { KeywordSections } from "@/components/content/KeywordSections";
import { Inline } from "@/components/content/Inline";
import { Figure } from "@/components/content/Figure";
import { SourceList } from "@/components/content/RichFaq";
import { emptyFacts } from "@/lib/content/facts";
import { SALES_TAX_SOURCE } from "@/content/sales-tax";
import { TAX_SOURCES, pickupHelp } from "@/content/country-tax";
import { placePhotos } from "@/content/place-photos";
import { INTL_PLACE_PHOTOS } from "@/content/place-photos-intl";
import { AlertPanelFor } from "@/components/alerts/AlertPanelServer";
import { INTL_TRACKING_LABEL } from "./shared";

/** States with this many stores or fewer render every store in full (a complete landing page even with zero events). */
const THIN = 2;

export function regionStaticParams(c: Country) {
  return statesWithStores(c.cc).filter((s) => hasStatePage(s.name, c.cc)).map((s) => ({ state: s.slug }));
}

/** One load per request, shared by the page and its metadata: ≤ 7 queries (4 live + 3 cached statistics). */
const load = cache(async (cc: Country["cc"], slug: string) => {
  const s = statesWithStores(cc).find((x) => x.slug === slug);
  if (!s) return null;
  const stores = storesOf(cc).filter((x) => x.state === s.name).sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name));
  const cities = citiesWithStores(cc).filter((c) => c.state === s.name);
  const numbers = stores.map((x) => x.storeNumber);
  const tz = storeTimeZone(stores[0]);
  const thin = stores.length <= THIN;
  const outside = nearestOutsideState({ ...centroid(stores), state: s.name, country: cc }, 6);
  const extra = thin ? [...new Set([...outside, ...stores.flatMap((x) => nearestOutsideState(x, 4))].map((x) => x.storeNumber))] : outside.map((x) => x.storeNumber);
  const [stock, feed, stats, pstats, full, duoStats, maxStats, reports] = await Promise.all([
    storesStock([...numbers, ...extra]),
    restockFeed({ state: s.name, limit: 12, country: cc }),
    restockStats(numbers, tz, 30),
    placeStats({ storeNumbers: numbers, tz }),
    thin ? storesStatusFull(numbers) : Promise.resolve(new Map()),
    placeStats({ storeNumbers: numbers, model: "duo", tz }),
    placeStats({ storeNumbers: numbers, model: "18-pro-max", tz }),
    restockReportStats(numbers, tz, 30),
  ]);
  const stockNow = Object.fromEntries(MODELS.map((m) => [m.key, stores.filter((x) => (stock.get(x.storeNumber)?.perModel[m.key].available ?? 0) > 0).length])) as Record<ModelKey, number>;
  const duoStores = stores.filter((x) => (stock.get(x.storeNumber)?.perModel[DEFAULT_MODEL].available ?? 0) > 0);
  const copy: PlaceCopyInput = { kind: "state", name: s.name, state: s.name, stateSlug: s.slug, stores, cities: cities.length, stockNow, stock, duo: duoStats, max: maxStats };
  const intl: IntlPlaceInput | null = cc === "us" ? null : { cc, kind: "state", name: s.name, region: s.name, regionSlug: s.slug, stores, cities: cities.length, stockNow, stock, duo: duoStats, max: maxStats };
  return { s, stores, cities, numbers, tz, thin, outside, stock, feed, stats, pstats, full, stockNow, duoStores, copy, intl, reports };
});

export async function regionMetadata(c: Country, p: { state: string }): Promise<Metadata> {
  const d = await load(c.cc, p.state);
  if (!d) return {};
  const { s } = d;
  const title = d.intl ? intlPlaceTitle(d.intl) : placeTitle(d.copy);
  const description = d.intl ? intlPlaceDescription(d.intl) : placeDescription(d.copy);
  const url = `${prefixOf(c.cc)}/stores/${s.slug}`;
  return { title, description, alternates: { canonical: url }, openGraph: { type: "website", siteName: "PickupChecker", title, description, url } };
}

export async function RegionPage({ country: c, params: p }: { country: Country; params: { state: string } }) {
  const cc = c.cc;
  const us = cc === "us";
  const d = await load(cc, p.state);
  if (!d) notFound();
  if (!us) {
    // Streaming pages cannot send a real 308; the proxy does. This is the backstop.
    const t = placeTarget(cc, p.state);
    if (t && !t.indexable) permanentRedirect(t.path);
  }
  const { s, stores, cities } = d;
  const neighbors = us
    ? neighborStates(s.name)
    : regionRefs(cc).filter((r) => r.name !== s.name).map((r) => ({ ...r, d: distanceMiles(r.lat, r.lng, centroid(stores).lat, centroid(stores).lng) })).sort((a, b) => a.d - b.d).slice(0, 8);
  const alert = alertHref({ model: DEFAULT_MODEL, state: s.slug, country: cc });
  // Five questions: the "how long does stock last" answer now lives in the iPhone Duo section, the tax question takes its place.
  const tq = us ? taxFaq(d.copy) : taxFaqIntl(cc, s.name, cc === "ca" ? s.name : undefined);
  const questions = faq({ kind: "state", place: s.name, stores, stockNow: d.stockNow, duoStores: d.duoStores, stats: d.pstats, peak: peakOf(d.stats), nearest: d.outside }).filter((q) => !q.q.startsWith("How long does stock last"));
  if (tq) questions.splice(2, 0, tq);
  const facts = emptyFacts(cc);
  const [photo1, photo2] = us ? placePhotos(s.name) : [INTL_PLACE_PHOTOS[`${cc}:${s.name}`] ?? INTL_PLACE_PHOTOS[cc] ?? "phone-map", "apple-store-pickup-counter"];
  const index = placeTarget(cc);
  const crumbs: Crumb[] = us
    ? [{ href: "/stores", label: "Apple Stores" }, { label: s.name }]
    : [{ href: prefixOf(cc), label: c.short }, ...(index?.indexable ? [{ href: storesIndexPath(cc), label: "Apple Stores" }] : []), { label: s.name }];
  const title = d.intl ? intlPlaceTitle(d.intl) : placeTitle(d.copy);
  const mapHref = `${mapPath(cc)}?state=${us ? s.code : encodeURIComponent(s.code)}&model=${DEFAULT_MODEL}`;
  const restocksHere = `${restocksPath(cc)}?model=all&state=${s.slug}`;
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <JsonLd data={itemListJsonLd(`Apple Stores in ${us ? s.name : placeLabel(cc, s.name)}`, stores)} />
      <Breadcrumbs items={crumbs} />
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="display text-3xl sm:text-5xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-2"><Inline text={d.intl ? intlPlaceIntro(d.intl) : placeIntro(d.copy)} facts={facts} /></p>
          <p className="mt-1 text-sm text-ink-3">{stores.length} stores · {cities.length} cit{cities.length > 1 ? "ies" : "y"} · checked {CHECK_NOTE}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{cities.map((x) => <Link key={x.slug} href={cityPath(x.state, x.name, cc)} className="chip px-3 py-1.5 text-xs">{x.name}<span className="text-ink-3"> · {x.stores.length}</span></Link>)}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={mapHref} className="btn btn-ghost btn-sm">Show on map</Link>
          <Link href={alert} className="btn btn-primary btn-sm">Alert me in {us ? s.code : s.name}</Link>
        </div>
      </div>
      <AlertPanelFor href={alert} summary={`Pick the phones and tick the ${s.name} stores you can get to`} country={cc} />

      <div className="mt-6"><ModelPlaceCards place={us ? statePlace(s.name)! : treeOf(cc).regionPlace(s.name)!} stockNow={d.stockNow} of={stores.length} unit="stores with it" /></div>
      <div className="mt-3"><PlaceStatStrip stores={stores.length} cities={cities.length} stockNow={d.stockNow} stats={d.pstats} /></div>

      {d.thin ? (
        <div className="mt-8 space-y-10">
          {stores.map((st) => <StoreBlock key={st.storeNumber} store={st} summary={d.stock.get(st.storeNumber)} rows={d.full.get(st.storeNumber) ?? []} stock={d.stock} />)}
        </div>
      ) : (
        <section className="mt-8" aria-label="Stock by store">
          <h2 className="text-xl font-semibold">Stock by store and model</h2>
          <p className="mt-1 text-sm text-ink-3">In stock now / tracked, per model.</p>
          {cities.map((x) => (
            <div key={x.slug} className="mt-5">
              <div className="flex items-baseline justify-between gap-3"><h3 className="text-lg font-semibold"><Link href={cityPath(x.state, x.name, cc)} className="hover:underline">{x.name}</Link> <span className="text-sm font-normal text-ink-3">· {x.stores.length}</span></h3><Link href={cityPath(x.state, x.name, cc)} className="text-xs text-ink-3 hover:text-ink">{x.stores.length > 1 || us ? "City page →" : "Store page →"}</Link></div>
              <div className="mt-2"><ModelStoreMatrix stores={[...x.stores].sort((a, b) => a.name.localeCompare(b.name))} stock={d.stock} showCity={false} /></div>
            </div>
          ))}
        </section>
      )}

      <div className="mx-auto mt-10 max-w-3xl">
        <Figure id={photo1} />
        <KeywordSections sections={d.intl ? intlPlaceSections(d.intl) : placeSections(d.copy)} facts={facts} />
        <Figure id={photo2} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">When do {s.name} stores restock?</h2>
          <div className="mt-3"><RestockClock stats={d.stats} label={`in ${s.name}`} reports={d.reports} /></div>
        </section>
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">Last {d.pstats.days} days, day by day</h2>
          <div className="mt-3"><DailyBars stats={d.pstats} label={`in ${s.name}`} /></div>
        </section>
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">Restocks by configuration</h2>
          <div className="mt-3"><RestocksByConfig stats={d.pstats} label={`in ${s.name}`} country={us ? undefined : cc} /></div>
        </section>
        <section className="min-w-0">
          <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Latest restocks in {s.name}</h2><Link href={restocksHere} className="text-sm text-ink-3 hover:text-ink">Full log →</Link></div>
          <RestockFeed rows={d.feed} showModel emptyText={`No restock recorded in ${s.name} yet.`} />
        </section>
      </div>

      {!d.thin && <div className="mt-6"><NearbyStores title={`Closest Apple Stores outside ${s.name}`} stores={d.outside} stock={d.stock} hint={`Distance from the center of ${s.name}'s stores.`} /></div>}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Faq items={questions} title={`Apple Stores in ${s.name}: FAQ`} />
        <div className="pane p-5 sm:p-6"><SourceList sources={[...stores.slice(0, 3).filter((x) => x.url).map((x) => ({ label: `Apple: ${x.name} store page`, url: x.url! })), pickupHelp(cc), us ? SALES_TAX_SOURCE : TAX_SOURCES[cc as Exclude<typeof cc, "us">]]} facts={facts} {...(us ? {} : { where: `the ${storesOf(cc).length} Apple Stores ${c.inName}`, since: INTL_TRACKING_LABEL })} /></div>
      </div>

      <RelatedBlock title={`Beyond ${s.name}`}>
        <LinkRow title={`Every store in ${s.name}`} links={stores.map((x) => ({ href: storePath(x), label: `${x.name} · ${x.city}` }))} />
        {neighbors.length > 0 && <LinkRow title={us ? "Neighboring states" : `Nearest ${c.regionNounPlural ?? "areas"} ${c.inName}`} links={neighbors.map((n) => ({ href: n.href, label: n.name, meta: String(n.count) }))} />}
        {us ? <BrowseModels /> : <BrowseCountryModels country={c} />}
        <LinkRow title="Restock logs" links={[{ href: restocksHere, label: `${s.name} restocks` }, { href: restocksPath(cc), label: us ? "All US restocks" : `All restocks ${c.inName}` }, { href: mapHref, label: `${s.name} on the map` }]} />
        {us ? <BrowseStates current={s.name} /> : <BrowseCountryRegions country={c} current={s.name} />}
      </RelatedBlock>
    </div>
  );
}
