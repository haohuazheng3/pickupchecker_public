/**
 * The page of a US state or another country's region (province, prefecture, area…): /stores/{state} or
 * /{cc}/stores/{region}. Indexed only where the region has two or more stores in two or more cities and is
 * not the whole country (placeTarget); the proxy 308s every other region URL to the page that answers it.
 */
import type { Metadata } from "next";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { partNumbersFor, hasStatePage, storesOf, catalogFor, MODELS, DEFAULT_MODEL, statesWithStores, citiesWithStores, storePath, cityPath, storeTimeZone, placeTarget, storesIndexPath, mapPath, restocksPath, distanceMiles, type ModelKey } from "@/lib/apple/catalog";
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
import { duoRestockTimesAt, restockTimesPath } from "@/lib/content/restockTimes";
import { alertsSentAt, duoNowFrom } from "@/lib/content/duoNow";
import { DuoNow } from "@/components/restocks/DuoNow";
import { SellOutTimes } from "@/components/restocks/SellOutTimes";
import { sellouts } from "@/lib/stock/sellouts";
import { DailyBars } from "@/components/restocks/DailyBars";
import { RestocksByConfig } from "@/components/restocks/RestocksByConfig";
import { Last24Hours } from "@/components/restocks/Last24Hours";
import { recentByConfig } from "@/lib/stock/recent";
import { placeTitle, placeDescription, placeSections, taxFaq, type PlaceCopyInput } from "@/lib/seo/placeCopy";
import { type IntlPlaceInput } from "@/lib/seo/countryCopy";
import { KeywordSections } from "@/components/content/KeywordSections";
import { Figure } from "@/components/content/Figure";
import { SourceList } from "@/components/content/RichFaq";
import { emptyFacts } from "@/lib/content/facts";
import { SALES_TAX_SOURCE } from "@/content/sales-tax";
import { pickupHelp } from "@/content/country-tax";
import { placePhotos } from "@/content/place-photos";
import { INTL_PLACE_PHOTOS } from "@/content/place-photos-intl";
import { AlertPanelFor } from "@/components/alerts/AlertPanelServer";
import { alternatesIn } from "./shared";
import { englishLocale, type Locale } from "@/lib/i18n/locales";
import { dict } from "@/lib/i18n/dict";
import { pageLocale, t } from "@/lib/i18n/server";
import { namesFor } from "@/lib/i18n/names";

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
  const [stock, feed, stats, pstats, full, duoStats, maxStats, reports, sell, recent, duoClock, duoReports, duoSell, times, alerts] = await Promise.all([
    storesStock([...numbers, ...extra]),
    restockFeed({ state: s.name, limit: 12, country: cc }),
    restockStats(numbers, tz, 30),
    placeStats({ storeNumbers: numbers, tz }),
    thin ? storesStatusFull(numbers) : Promise.resolve(new Map()),
    placeStats({ storeNumbers: numbers, model: "duo", tz }),
    placeStats({ storeNumbers: numbers, model: "18-pro-max", tz }),
    restockReportStats(numbers, tz, 30),
    sellouts({ storeNumbers: numbers, country: cc }),
    recentByConfig({ storeNumbers: numbers, country: cc }),
    // The clock and the opening block are iPhone Duo only (2026-11-08): a chart mixing three models said "most
    // arrive around 4 PM" (the Pro Max) on a page whose title promises Duo stock, and contradicted the Duo page.
    restockStats(numbers, tz, 30, "duo"),
    restockReportStats(numbers, tz, 30, "duo"),
    sellouts({ storeNumbers: numbers, parts: partNumbersFor("duo", [], [], cc), country: cc }),
    duoRestockTimesAt(cc, stores),
    alertsSentAt(numbers),
  ]);
  const now = duoNowFrom({ stores, stock, times, sell: duoSell, alerts, configsTotal: catalogFor("duo", cc).length });
  const stockNow = Object.fromEntries(MODELS.map((m) => [m.key, stores.filter((x) => (stock.get(x.storeNumber)?.perModel[m.key].available ?? 0) > 0).length])) as Record<ModelKey, number>;
  const duoStores = stores.filter((x) => (stock.get(x.storeNumber)?.perModel[DEFAULT_MODEL].available ?? 0) > 0);
  const copy: PlaceCopyInput = { kind: "state", name: s.name, state: s.name, stateSlug: s.slug, stores, cities: cities.length, stockNow, stock, duo: duoStats, max: maxStats };
  const intl: IntlPlaceInput | null = cc === "us" ? null : { cc, kind: "state", name: s.name, region: s.name, regionSlug: s.slug, stores, cities: cities.length, stockNow, stock, duo: duoStats, max: maxStats };
  return { s, stores, cities, numbers, tz, thin, outside, stock, feed, stats, pstats, full, stockNow, duoStores, copy, intl, reports, sell, recent, duoClock, duoReports, now };
});

export async function regionMetadata(c: Country, p: { state: string }, loc: Locale = englishLocale(c.cc)): Promise<Metadata> {
  const d = await load(c.cc, p.state);
  if (!d) return {};
  const { s } = d;
  const P = dict(loc.lang).place;
  const title = d.intl ? P.placeTitle(d.intl) : placeTitle(d.copy);
  const description = d.intl ? P.placeDescription(d.intl) : placeDescription(d.copy);
  const en = `${prefixOf(c.cc)}/stores/${s.slug}`;
  const alt = alternatesIn(en, loc);
  return { title, description, alternates: c.cc === "us" ? { canonical: en } : alt, openGraph: { type: "website", siteName: "PickupChecker", title, description, url: alt.canonical } };
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
  const lang = pageLocale().lang;
  const P = t().place;
  const G = t().pages.common;
  const R = t().pages.region;
  const N = namesFor(lang, cc);
  const name = N.region(s.name);
  const neighbors = us
    ? neighborStates(s.name)
    : regionRefs(cc).filter((r) => r.name !== s.name).map((r) => ({ ...r, d: distanceMiles(r.lat, r.lng, centroid(stores).lat, centroid(stores).lng) })).sort((a, b) => a.d - b.d).slice(0, 8);
  const alert = alertHref({ model: DEFAULT_MODEL, state: s.slug, country: cc });
  // Five questions: the "how long does stock last" answer now lives in the iPhone Duo section, the tax question takes its place.
  const tq = us ? taxFaq(d.copy) : P.taxFaq(cc, name, cc === "ca" ? s.name : undefined);
  const questions = faq({ kind: "state", place: name, stores, stockNow: d.stockNow, duoStores: d.duoStores, stats: d.pstats, peak: peakOf(d.duoClock, lang), nearest: d.outside, omit: ["lasts"] }, lang);
  const peakAll = peakOf(d.stats, lang);
  const W = t().modules.duoNow;
  if (tq) questions.splice(2, 0, tq);
  const facts = lang === "en" ? emptyFacts(cc, d.tz) : { ...emptyFacts(cc, d.tz), lang };
  const [photo1, photo2] = us ? placePhotos(s.name) : [INTL_PLACE_PHOTOS[`${cc}:${s.name}`] ?? INTL_PLACE_PHOTOS[cc] ?? "phone-map", "apple-store-pickup-counter"];
  const index = placeTarget(cc);
  const crumbs: Crumb[] = us
    ? [{ href: "/stores", label: "Apple Stores" }, { label: s.name }]
    : [{ href: prefixOf(cc), label: N.countryShort() }, ...(index?.indexable ? [{ href: storesIndexPath(cc), label: G.appleStores }] : []), { label: name }];
  const title = d.intl ? P.placeTitle(d.intl) : placeTitle(d.copy);
  const mapHref = `${mapPath(cc)}?state=${us ? s.code : encodeURIComponent(s.code)}&model=${DEFAULT_MODEL}`;
  const restocksHere = `${restocksPath(cc)}?model=all&state=${s.slug}`;
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <JsonLd data={itemListJsonLd(G.itemList(us ? s.name : P.placeLabel(cc, name)), stores, lang)} />
      <Breadcrumbs items={crumbs} />
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="display text-3xl sm:text-5xl">{title}</h1>
          <p className="mt-2 text-sm text-ink-3">{R.counts(stores.length, cities.length)}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{cities.map((x) => <Link key={x.slug} href={cityPath(x.state, x.name, cc)} className="chip px-3 py-1.5 text-xs">{N.city(x.name)}<span className="text-ink-3"> · {x.stores.length}</span></Link>)}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={mapHref} className="btn btn-ghost btn-sm">{G.showOnMap}</Link>
          <Link href={alert} className="btn btn-primary btn-sm">{G.alertIn(us ? s.code : name)}</Link>
        </div>
      </div>
      {/* The conclusion first (lib/content/duoNow.ts): in stock or not as of now, the last time it was, the pattern since
          tracking began, the last three restocks — what an answer engine lifts whole. */}
      <div className="mt-5"><DuoNow d={d.now} label={G.inPlace(name)} name={name} stores={stores} country={cc} restockTimesHref={restockTimesPath(s.name, undefined, cc)} alertHref={alert} /></div>
      <AlertPanelFor href={alert} summary={G.panelPick(name)} country={cc} />

      {/* The answer to "has the Duo restocked anywhere in {state} in the last 24 hours, and which configuration?" comes before the matrix. */}
      <div className="mt-6"><Last24Hours data={d.recent} label={G.inPlace(name)} stores={stores} country={cc} stock={d.stock} lastBefore={d.copy.duo.lastRestock} alert={alert} compact /></div>

      <div className="mt-6"><ModelPlaceCards place={us ? statePlace(s.name)! : treeOf(cc).regionPlace(s.name)!} stockNow={d.stockNow} of={stores.length} unit={G.storesWithIt} /></div>
      <div className="mt-3"><PlaceStatStrip stores={stores.length} cities={cities.length} stockNow={d.stockNow} stats={d.copy.duo} model="duo" scoped="Duo" /></div>

      {d.thin ? (
        <div className="mt-8 space-y-10">
          {stores.map((st) => <StoreBlock key={st.storeNumber} store={st} summary={d.stock.get(st.storeNumber)} rows={d.full.get(st.storeNumber) ?? []} stock={d.stock} />)}
        </div>
      ) : (
        <section className="mt-8" aria-label={G.matrixLabel}>
          <h2 className="text-xl font-semibold">{G.matrixH2}</h2>
          <p className="mt-1 text-sm text-ink-3">{G.matrixHint}</p>
          {cities.map((x) => (
            <div key={x.slug} className="mt-5">
              <div className="flex items-baseline justify-between gap-3"><h3 className="text-lg font-semibold"><Link href={cityPath(x.state, x.name, cc)} className="hover:underline">{N.city(x.name)}</Link> <span className="text-sm font-normal text-ink-3">· {x.stores.length}</span></h3><Link href={cityPath(x.state, x.name, cc)} className="text-xs text-ink-3 hover:text-ink">{x.stores.length > 1 || us ? G.cityPage : G.storePage}</Link></div>
              <div className="mt-2"><ModelStoreMatrix stores={[...x.stores].sort((a, b) => a.name.localeCompare(b.name))} stock={d.stock} showCity={false} /></div>
            </div>
          ))}
        </section>
      )}

      <div className="mx-auto mt-10 max-w-3xl">
        <Figure id={photo1} />
        <KeywordSections sections={d.intl ? P.placeSections(d.intl) : placeSections(d.copy)} facts={facts} />
        <Figure id={photo2} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">{G.whenDuoRestocks(name)}</h2>
          <div className="mt-3"><RestockClock stats={d.duoClock} label={G.inPlace(name)} reports={d.duoReports} /></div>
          <p className="mt-2 text-xs text-ink-3">{W.allModels({ n: d.pstats.month, days: d.pstats.days, peak: peakAll ? peakAll.hour : null })}</p>
          {us && <p className="mt-3 text-sm"><Link href={restockTimesPath(s.name)} className="font-medium text-ink underline-offset-2 hover:underline">When does the iPhone Duo restock in {s.name}? Hour by hour, every store →</Link></p>}
        </section>
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">{G.howFast(name)}</h2>
          <div className="mt-3"><SellOutTimes data={d.sell} label={G.inPlace(name)} showStore /></div>
        </section>
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">{G.lastDays(d.pstats.days)}</h2>
          <div className="mt-3"><DailyBars stats={d.copy.duo} label={G.inPlace(name)} /></div>
        </section>
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">{G.restocksBy}</h2>
          <div className="mt-3"><RestocksByConfig stats={d.pstats} label={G.inPlace(name)} country={us ? undefined : cc} /></div>
        </section>
        <section className="min-w-0">
          <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">{G.latestIn(name)}</h2><Link href={restocksHere} className="text-sm text-ink-3 hover:text-ink">{G.fullLog}</Link></div>
          <RestockFeed rows={d.feed} showModel emptyText={G.noneIn(name)} />
        </section>
      </div>

      {!d.thin && <div className="mt-6"><NearbyStores title={R.nearbyOutside(name)} stores={d.outside} stock={d.stock} hint={R.nearbyHint(name)} /></div>}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Faq items={questions} title={G.faqTitle(name)} />
        <div className="pane p-5 sm:p-6"><SourceList sources={[...stores.slice(0, 3).filter((x) => x.url).map((x) => ({ label: G.appleStorePage(N.store(x)), url: x.url! })), us ? pickupHelp(cc) : P.sources(cc as Exclude<typeof cc, "us">).pickupHelp, us ? SALES_TAX_SOURCE : P.sources(cc as Exclude<typeof cc, "us">).tax]} facts={facts} {...(us ? {} : { where: G.sourcesWhere(storesOf(cc).length, cc), since: G.since })} /></div>
      </div>

      <RelatedBlock title={R.beyond(name)}>
        <LinkRow title={R.everyStore(name)} links={stores.map((x) => ({ href: storePath(x), label: G.storeAndCity(N.store(x), N.city(x.city)) }))} />
        {neighbors.length > 0 && <LinkRow title={us ? G.neighboringStates : R.nearestRegions(cc)} links={neighbors.map((n) => ({ href: n.href, label: us ? n.name : N.region(n.name), meta: String(n.count) }))} />}
        {us ? <BrowseModels /> : <BrowseCountryModels country={c} />}
        <LinkRow title={G.restockLogs} links={[{ href: restocksHere, label: G.regionRestocks(name) }, { href: restocksPath(cc), label: us ? G.allUsRestocks : G.allRestocksIn(cc) }, { href: mapHref, label: G.onTheMap(name) }]} />
        {us ? <BrowseStates current={s.name} /> : <BrowseCountryRegions country={c} current={s.name} />}
      </RelatedBlock>
    </div>
  );
}
