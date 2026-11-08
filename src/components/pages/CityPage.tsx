/**
 * The page of a city with two or more Apple Stores, in any country: /stores/{state}/{city} or
 * /{cc}/stores/{region}/{city}. A one-store city is its store's page (the proxy 308s it there); a city that
 * holds every store of its country is the country's store index.
 */
import type { Metadata } from "next";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { partNumbersFor, hasStatePage, storesOf, catalogFor, MODELS, DEFAULT_MODEL, citiesWithStores, cityBySlug, stateSlug, storePath, statePath, cityPath, storeTimeZone, STATE_CODES, placeTarget, storesIndexPath, mapPath, restocksPath, type ModelKey } from "@/lib/apple/catalog";
import { prefixOf, type Country } from "@/lib/apple/countries";
import { nearbyCities, neighborStates, cityRef, cityLabel } from "@/lib/seo/links";
import { nearbyCitiesIn, cityRefs as intlCityRefs } from "@/lib/seo/countryLinks";
import { nearestTo, nearestOutsideState, nearestInState, centroid, alertHref, faq, peakOf, itemListJsonLd, distText } from "@/lib/seo/enrich";
import { Breadcrumbs, LinkRow, RelatedBlock, type Crumb } from "@/components/seo/Related";
import { BrowseModels } from "@/components/seo/Browse";
import { BrowseCountryModels, BrowseCountryRegions } from "@/components/seo/CountryBrowse";
import { JsonLd } from "@/components/seo/JsonLd";
import { PlaceStatStrip } from "@/components/seo/StatStrip";
import { ModelPlaceCards } from "@/components/seo/ModelPlaceCards";
import { cityPlace, storePlace } from "@/lib/seo/products";
import { treeOf } from "@/lib/seo/tree";
import { Faq } from "@/components/seo/Faq";
import { storesStock, storesStatusFull, restockFeed, restockStats, placeStats, restockReportStats } from "@/lib/stock/queries";
import { ModelStoreMatrix } from "@/components/stores/ModelStoreMatrix";
import { StoreBlock } from "@/components/stores/StoreBlock";
import { NearbyStores } from "@/components/stores/NearbyStores";
import { StoreInfo } from "@/components/stores/StoreInfo";
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

export function cityStaticParams(c: Country) {
  return citiesWithStores(c.cc).filter((x) => x.stores.length > 1).map((x) => ({ state: x.stateSlug, city: x.slug }));
}

/** One load per request, shared by the page and its metadata: ≤ 7 queries (4 live + 3 cached statistics). */
const load = cache(async (cc: Country["cc"], state: string, city: string) => {
  const c = cityBySlug(state, city, cc);
  if (!c) return null;
  const stores = [...c.stores].sort((a, b) => a.name.localeCompare(b.name));
  const numbers = stores.map((s) => s.storeNumber);
  const tz = storeTimeZone(stores[0]);
  const thin = stores.length === 1;
  const mid = centroid(stores);
  const near = nearestTo(mid, new Set(numbers), 6, cc);
  const outside = nearestOutsideState({ ...mid, state: c.state, country: cc }, 3);
  // StoreBlock lists the three nearest in-state stores too — load their stock as well, or they render as "no Duo".
  const extra = [...new Set([...near, ...outside, ...(thin ? [...nearestOutsideState(stores[0], 4), ...nearestInState(stores[0], 3)] : [])].map((x) => x.storeNumber))];
  const [stock, feed, stats, pstats, full, duoStats, maxStats, reports, sell, recent, duoClock, duoReports, duoSell, times, alerts] = await Promise.all([
    storesStock([...numbers, ...extra]),
    restockFeed({ state: c.state, city: c.name, limit: 12, country: cc }),
    restockStats(numbers, tz, 30),
    placeStats({ storeNumbers: numbers, tz }),
    thin ? storesStatusFull(numbers) : Promise.resolve(new Map()),
    placeStats({ storeNumbers: numbers, model: "duo", tz }),
    placeStats({ storeNumbers: numbers, model: "18-pro-max", tz }),
    restockReportStats(numbers, tz, 30),
    sellouts({ storeNumbers: numbers, country: cc }),
    recentByConfig({ storeNumbers: numbers, country: cc }),
    // iPhone Duo only for the clock and the opening block (RegionPage says why).
    restockStats(numbers, tz, 30, "duo"),
    restockReportStats(numbers, tz, 30, "duo"),
    sellouts({ storeNumbers: numbers, parts: partNumbersFor("duo", [], [], cc), country: cc }),
    duoRestockTimesAt(cc, stores),
    alertsSentAt(numbers),
  ]);
  const now = duoNowFrom({ stores, stock, times, sell: duoSell, alerts, configsTotal: catalogFor("duo", cc).length });
  const stockNow = Object.fromEntries(MODELS.map((m) => [m.key, stores.filter((x) => (stock.get(x.storeNumber)?.perModel[m.key].available ?? 0) > 0).length])) as Record<ModelKey, number>;
  const duoStores = stores.filter((x) => (stock.get(x.storeNumber)?.perModel[DEFAULT_MODEL].available ?? 0) > 0);
  const copy: PlaceCopyInput = { kind: "city", name: c.name, state: c.state, stateSlug: c.stateSlug, citySlug: c.slug, stores, stockNow, stock, duo: duoStats, max: maxStats };
  const intl: IntlPlaceInput | null = cc === "us" ? null : { cc, kind: "city", name: c.name, region: c.state, regionSlug: c.stateSlug, citySlug: c.slug, stores, stockNow, stock, duo: duoStats, max: maxStats };
  return { c, stores, numbers, tz, thin, near, outside, stock, feed, stats, pstats, full, stockNow, duoStores, copy, intl, reports, sell, recent, duoClock, duoReports, now };
});

export async function cityMetadata(country: Country, p: { state: string; city: string }, loc: Locale = englishLocale(country.cc)): Promise<Metadata> {
  const d = await load(country.cc, p.state, p.city);
  if (!d) return {};
  const { c } = d;
  const P = dict(loc.lang).place;
  const title = d.intl ? P.placeTitle(d.intl) : placeTitle(d.copy);
  const description = d.intl ? P.placeDescription(d.intl) : placeDescription(d.copy);
  const en = cityPath(c.state, c.name, country.cc);
  const alt = alternatesIn(en, loc);
  return { title, description, alternates: country.cc === "us" ? { canonical: en } : alt, openGraph: { type: "website", siteName: "PickupChecker", title, description, url: alt.canonical } };
}

/** City page; also the landing spot for the old /stores/{state}/{store-slug} URLs, which redirect. */
export async function CityPage({ country, params: p }: { country: Country; params: { state: string; city: string } }) {
  const cc = country.cc;
  const us = cc === "us";
  const { state, city } = p;
  const d = await load(cc, state, city);
  if (!d) {
    const legacy = storesOf(cc).find((x) => x.slug === city && stateSlug(x.state) === state);
    if (legacy) permanentRedirect(storePath(legacy));
    notFound();
  }
  if (!us) {
    // Streaming pages cannot send a real 308; the proxy does. This is the backstop.
    const t = placeTarget(cc, state, city);
    if (t && !t.indexable) permanentRedirect(t.path);
  }
  const { c, stores } = d;
  const lang = pageLocale().lang;
  const P = t().place;
  const G = t().pages.common;
  const CT = t().pages.city;
  const N = namesFor(lang, cc);
  const cname = N.city(c.name);
  const rname = N.region(c.state);
  const code = us ? (STATE_CODES[c.state] ?? c.state) : c.state;
  const siblings = citiesWithStores(cc).filter((x) => x.state === c.state && x.slug !== c.slug);
  const me = us ? cityRef(c.state, c.name) : undefined;
  const nearCities = us
    ? (me ? nearbyCities(me.lat, me.lng, { exclude: me, limit: 8 }) : []).map((x) => ({ href: x.href, label: cityLabel(x), meta: `${Math.round(x.distance)} mi` }))
    : nearbyCitiesIn(cc, centroid(stores).lat, centroid(stores).lng, { excludeHref: intlCityRefs(cc).find((x) => x.state === c.state && x.name === c.name)?.href, limit: 8 }).map((x) => ({ href: x.href, label: N.city(x.name), meta: distText(x.distance, cc, lang) }));
  const neighbors = us ? neighborStates(c.state) : [];
  const place = us ? `${c.name}, ${code}` : P.placeLabel(cc, cname);
  const alert = alertHref({ model: DEFAULT_MODEL, state: c.stateSlug, city: c.slug, country: cc });
  const tq = us ? taxFaq(d.copy) : P.taxFaq(cc, cname, cc === "ca" ? c.state : undefined);
  const questions = faq({ kind: "city", place: cname, stores, stockNow: d.stockNow, duoStores: d.duoStores, stats: d.pstats, peak: peakOf(d.duoClock, lang), nearest: d.near, omit: ["lasts"] }, lang);
  if (tq) questions.splice(2, 0, tq);
  const facts = lang === "en" ? emptyFacts(cc) : { ...emptyFacts(cc), lang };
  const [photo1, photo2] = us ? placePhotos(`${c.name}, ${c.state}`) : [INTL_PLACE_PHOTOS[`${cc}:${c.name}, ${c.state}`] ?? INTL_PLACE_PHOTOS[`${cc}:${c.state}`] ?? INTL_PLACE_PHOTOS[cc] ?? "phone-map", "apple-store-pickup-counter"];
  const index = placeTarget(cc);
  const crumbs: Crumb[] = us
    ? [{ href: "/stores", label: "Apple Stores" }, ...(hasStatePage(c.state) ? [{ href: statePath(c.state), label: c.state }] : []), { label: c.name }]
    : [{ href: prefixOf(cc), label: N.countryShort() }, ...(index?.indexable ? [{ href: storesIndexPath(cc), label: G.appleStores }] : []), ...(hasStatePage(c.state, cc) ? [{ href: statePath(c.state, cc), label: rname }] : []), { label: cname }];
  const title = d.intl ? P.placeTitle(d.intl) : placeTitle(d.copy);
  const restocksRegion = `${restocksPath(cc)}?model=all&state=${c.stateSlug}`;
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <JsonLd data={itemListJsonLd(G.itemList(place), stores, lang)} />
      <Breadcrumbs items={crumbs} />
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="display text-3xl sm:text-5xl">{title}</h1>
          <p className="mt-2 text-sm text-ink-3">{CT.counts(stores.length)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`${mapPath(cc)}?stores=${d.numbers.join(",")}&model=${DEFAULT_MODEL}`} className="btn btn-ghost btn-sm">{G.showOnMap}</Link>
          <Link href={alert} className="btn btn-primary btn-sm">{G.alertIn(cname)}</Link>
        </div>
      </div>
      {/* The conclusion first (lib/content/duoNow.ts). */}
      <div className="mt-5"><DuoNow d={d.now} label={G.inPlace(cname)} name={cname} stores={stores} country={cc} restockTimesHref={!d.thin ? restockTimesPath(c.state, c.name, cc) : null} alertHref={alert} /></div>
      <AlertPanelFor href={alert} summary={G.panelPick(cname)} country={cc} />

      <div className="mt-6"><Last24Hours data={d.recent} label={G.inPlace(cname)} stores={stores} country={cc} stock={d.stock} lastBefore={d.copy.duo.lastRestock} alert={alert} /></div>

      <div className="mt-6"><ModelPlaceCards place={(us ? cityPlace(c.state, c.name) : treeOf(cc).cityPlace(c.state, c.name)) ?? storePlace(stores[0])} stockNow={d.stockNow} of={stores.length} unit={G.storesWithIt} /></div>
      <div className="mt-3"><PlaceStatStrip stores={stores.length} stockNow={d.stockNow} stats={d.copy.duo} scoped="Duo" /></div>

      {d.thin ? (
        <div className="mt-8"><StoreBlock store={stores[0]} summary={d.stock.get(stores[0].storeNumber)} rows={d.full.get(stores[0].storeNumber) ?? []} stock={d.stock} /></div>
      ) : (
        <>
          <section className="mt-8" aria-label={G.matrixLabel}>
            <h2 className="text-xl font-semibold">{G.matrixH2}</h2>
            <p className="mt-1 text-sm text-ink-3">{G.matrixHint}</p>
            <div className="mt-3"><ModelStoreMatrix stores={stores} stock={d.stock} showCity={false} /></div>
          </section>
          <section className="mt-6 grid gap-3 md:grid-cols-2" aria-label={CT.details}>
            {stores.map((s) => (
              <div key={s.storeNumber} className="pane p-5">
                <h3 className="font-semibold"><Link href={storePath(s)} className="hover:underline">{us || lang === "en" ? CT.storeHeading(s.name) : N.apple(s)}</Link></h3>
                <div className="mt-2"><StoreInfo store={s} compact /></div>
              </div>
            ))}
          </section>
        </>
      )}

      <div className="mx-auto mt-10 max-w-3xl">
        <Figure id={photo1} />
        <KeywordSections sections={d.intl ? P.placeSections(d.intl) : placeSections(d.copy)} facts={facts} />
        <Figure id={photo2} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">{G.whenRestock(cname)}</h2>
          <div className="mt-3"><RestockClock stats={d.duoClock} label={G.inPlace(cname)} reports={d.duoReports} /></div>
          <p className="mt-2 text-xs text-ink-3">{t().modules.duoNow.allModels({ n: d.pstats.month, days: d.pstats.days, peak: peakOf(d.stats, lang)?.hour ?? null })}</p>
          {us && !d.thin && <p className="mt-3 text-sm"><Link href={restockTimesPath(c.state, c.name)} className="font-medium text-ink underline-offset-2 hover:underline">When does the iPhone Duo restock in {c.name}? Hour by hour, every store →</Link></p>}
        </section>
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">{G.howFast(cname)}</h2>
          <div className="mt-3"><SellOutTimes data={d.sell} label={G.inPlace(cname)} showStore /></div>
        </section>
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">{G.lastDays(d.pstats.days)}</h2>
          <div className="mt-3"><DailyBars stats={d.pstats} label={G.inPlace(cname)} /></div>
        </section>
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">{G.restocksBy}</h2>
          <div className="mt-3"><RestocksByConfig stats={d.pstats} label={G.inPlace(cname)} country={us ? undefined : cc} /></div>
        </section>
        <section className="min-w-0">
          <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">{G.latestIn(cname)}</h2><Link href={restocksRegion} className="text-sm text-ink-3 hover:text-ink">{G.allOfArrow(rname)}</Link></div>
          <RestockFeed rows={d.feed} showModel emptyText={G.noneIn(cname)} />
        </section>
      </div>

      {!d.thin && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <NearbyStores title={CT.outside(cname)} stores={d.near} stock={d.stock} />
          {us ? <NearbyStores title={G.acrossStateLine} stores={d.outside} stock={d.stock} /> : <NearbyStores title={CT.outsideRegion(rname)} stores={d.outside.filter((x) => !d.near.slice(0, 3).some((n) => n.storeNumber === x.storeNumber))} stock={d.stock} />}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Faq items={questions} title={G.faqTitle(cname)} />
        <div className="pane p-5 sm:p-6"><SourceList sources={[...stores.slice(0, 3).filter((x) => x.url).map((x) => ({ label: G.appleStorePage(N.store(x)), url: x.url! })), us ? pickupHelp(cc) : P.sources(cc as Exclude<typeof cc, "us">).pickupHelp, us ? SALES_TAX_SOURCE : P.sources(cc as Exclude<typeof cc, "us">).tax]} facts={facts} {...(us ? {} : { where: G.sourcesWhere(storesOf(cc).length, cc), since: G.since })} /></div>
      </div>

      <RelatedBlock title={CT.around(cname)}>
        {nearCities.length > 0 && <LinkRow title={G.nearbyCities} links={nearCities} />}
        {siblings.length > 0 && <LinkRow title={CT.otherCities(rname)} links={siblings.map((x) => ({ href: cityPath(x.state, x.name, cc), label: N.city(x.name), meta: String(x.stores.length) }))} more={{ href: statePath(c.state, cc), label: G.allOf(rname) }} />}
        {neighbors.length > 0 && <LinkRow title={G.neighboringStates} links={neighbors.map((n) => ({ href: n.href, label: n.name, meta: String(n.count) }))} />}
        {us ? <BrowseModels /> : <BrowseCountryModels country={country} />}
        <LinkRow title={G.restockLogs} links={[{ href: restocksRegion, label: G.regionRestocks(rname) }, { href: restocksPath(cc), label: us ? G.allUsRestocks : G.allRestocksIn(cc) }, { href: `${mapPath(cc)}?state=${us ? code : encodeURIComponent(c.state)}&model=${DEFAULT_MODEL}`, label: G.onTheMap(rname) }]} />
        {!us && <BrowseCountryRegions country={country} current={c.state} />}
      </RelatedBlock>
    </div>
  );
}
