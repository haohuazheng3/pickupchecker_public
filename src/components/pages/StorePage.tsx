/**
 * The store page of any country: /stores/{state}/{city}/{store} in the US, /{cc}/stores/{region}/{city}/{store}
 * elsewhere. One template; the US keeps exactly what it showed (state lines, sales tax, neighboring states),
 * another country gets its own currency, tax rule, distance unit and only its own stores as neighbours.
 */
import type { Metadata } from "next";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { hasStatePage, isOneStoreState, storesOf, MODELS, DEFAULT_MODEL, modelByKey, citySlug, stateSlug, stateCodeOf, storePath, cityPath, statePath, storeTimeZone, modelKeyFor, catalogFor, storesIndexPath, placeTarget, mapPath, restocksPath, type ModelKey, type Store, appleName } from "@/lib/apple/catalog";
import { prefixOf, type Country } from "@/lib/apple/countries";
import { nearestStores, nearbyCities, neighborStates, cityRef, cityLabel } from "@/lib/seo/links";
import { nearbyCitiesIn, nearestStoresIn, cityRefs as intlCityRefs } from "@/lib/seo/countryLinks";
import { normalizeHours, compressHours, todayLabel, hoursText, storeJsonLd, nearestOutsideState, nearestInState, alertHref, faq, peakOf, storeTitle, fitTitle, fullAddress, directionsUrl, listWords, distText } from "@/lib/seo/enrich";
import { Breadcrumbs, LinkRow, RelatedBlock, type Crumb } from "@/components/seo/Related";
import { BrowseModels } from "@/components/seo/Browse";
import { BrowseCountryModels } from "@/components/seo/CountryBrowse";
import { JsonLd } from "@/components/seo/JsonLd";
import { PlaceStatStrip } from "@/components/seo/StatStrip";
import { ModelPlaceCards } from "@/components/seo/ModelPlaceCards";
import { storePlace } from "@/lib/seo/products";
import { Faq } from "@/components/seo/Faq";
import { storesStock, storeStatus, restockFeed, restockStats, placeStats, restockReportStats, pickupLookupOff } from "@/lib/stock/queries";
import { StockByModel } from "@/components/stores/StockByModel";
import { ConfigTable } from "@/components/stores/ConfigTable";
import { StoreInfo, HoursTable } from "@/components/stores/StoreInfo";
import { NearbyStores } from "@/components/stores/NearbyStores";
import { RestockFeed } from "@/components/restocks/RestockFeed";
import { RestockClock } from "@/components/restocks/RestockClock";
import { restockTimesPath } from "@/lib/content/restockTimes";
import { SellOutTimes } from "@/components/restocks/SellOutTimes";
import { sellouts } from "@/lib/stock/sellouts";
import { DailyBars } from "@/components/restocks/DailyBars";
import { RestocksByConfig } from "@/components/restocks/RestocksByConfig";
import { Last24Hours } from "@/components/restocks/Last24Hours";
import { recentByConfig } from "@/lib/stock/recent";
import { MiniMap } from "@/components/stores/MiniMap";
import { LiveChecked } from "@/components/site/LiveChecked";
import { Figure } from "@/components/content/Figure";
import { KeywordSections, slugId } from "@/components/content/KeywordSections";
import { SourceList } from "@/components/content/RichFaq";
import { emptyFacts } from "@/lib/content/facts";
import { storePhotos } from "@/content/store-photos";
import { SALES_TAX, SALES_TAX_SOURCE, withTax } from "@/content/sales-tax";
import { pickupHelp } from "@/content/country-tax";
import { AlertPanelFor } from "@/components/alerts/AlertPanelServer";
import { alternatesIn } from "./shared";
import { englishLocale, type Locale } from "@/lib/i18n/locales";
import { dict } from "@/lib/i18n/dict";
import { pageLocale, t } from "@/lib/i18n/server";
import { namesFor } from "@/lib/i18n/names";
import { fitTitleW, list as listIn } from "@/lib/i18n/format";

export type StoreParams = { state: string; city: string; store: string };

export function storeStaticParams(c: Country) {
  return storesOf(c.cc).map((s) => ({ state: stateSlug(s.state), city: citySlug(s.city), store: s.slug }));
}

function find(c: Country, state: string, city: string, store: string) {
  return storesOf(c.cc).find((s) => s.slug === store && stateSlug(s.state) === state && citySlug(s.city) === city);
}

/** Everything the page and its metadata need, loaded once per request (10 queries: 5 live + 5 cached). */
const load = cache(async (s: Store) => {
  const tz = storeTimeZone(s);
  const us = s.country === "us";
  const nearby = us ? nearestStores(s, 6) : nearestStoresIn(s, 6);
  const outside = nearestOutsideState(s, 3);
  const inState = nearestInState(s, 4, { excludeCity: true });
  const others = [...new Set([...nearby, ...outside, ...inState].map((n) => n.storeNumber))];
  const [rows, stock, feed, stats, pstats, reports, lookupOff, sell, recent] = await Promise.all([
    storeStatus(s.storeNumber),
    storesStock([s.storeNumber, ...others]),
    restockFeed({ storeNumber: s.storeNumber, kind: "all", limit: 30, country: s.country }),
    restockStats([s.storeNumber], tz, 30),
    placeStats({ storeNumbers: [s.storeNumber], tz }),
    restockReportStats([s.storeNumber], tz, 30),
    pickupLookupOff(s.storeNumber),
    sellouts({ storeNumbers: [s.storeNumber], country: s.country }),
    recentByConfig({ storeNumbers: [s.storeNumber], country: s.country }),
  ]);
  const summary = stock.get(s.storeNumber);
  const stockNow = Object.fromEntries(MODELS.map((m) => [m.key, summary?.perModel[m.key].available ?? 0])) as Record<ModelKey, number>;
  const configs = Object.fromEntries(MODELS.map((m) => [m.key, rows.filter((r) => modelKeyFor(r.item.model) === m.key).length || catalogFor(m.key, s.country).length])) as Record<ModelKey, number>;
  // The last Duo restock in the feed (30 rows, all models): what the 24-hour block names on a quiet day.
  const lastDuo = feed.find((r) => r.kind === "restock" && modelKeyFor(r.item.model) === "duo");
  const lastDuoRestock = lastDuo ? { storeNumber: lastDuo.storeNumber, partNumber: lastDuo.partNumber, at: lastDuo.at.toISOString() } : null;
  return { tz, nearby, outside, inState, rows, stock, summary, feed, stats, pstats, reports, lookupOff, stockNow, configs, sell, recent, lastDuoRestock };
});

/** True when this is the only Apple Store in its city (the city query lands here). */
function onlyInCity(s: Store): boolean {
  return !storesOf(s.country).some((x) => x.state === s.state && x.city === s.city && x.storeNumber !== s.storeNumber);
}

/** The title's parenthesis: US state for a state's only store, else the city; elsewhere the city ("Apple Kärntner Straße (Vienna)"). */
function soleRegion(s: Store): string | undefined {
  if (s.country !== "us") return onlyInCity(s) ? s.city : undefined;
  return isOneStoreState(s.state) ? s.state : onlyInCity(s) ? s.city : undefined;
}

export async function storeMetadata(c: Country, p: StoreParams, loc: Locale = englishLocale(c.cc)): Promise<Metadata> {
  const s = find(c, p.state, p.city, p.store);
  if (!s) return {};
  const d = await load(s);
  const D = dict(loc.lang);
  const N = namesFor(loc.lang, c.cc);
  const region = soleRegion(s);
  const title = loc.native ? D.place.storeTitle(s, region === s.state ? N.region(region) : region ? N.city(region) : undefined) : storeTitle(s, stateCodeOf(s), d.stockNow.duo, region);
  const street = (s.street ?? "").trim();
  const where = c.cc === "us" ? `${s.city} ${stateCodeOf(s)}` : D.pages.store.where(N.city(s.city), c.cc);
  const description = (loc.native ? fitTitleW : fitTitle)(D.pages.store.description({ place: N.apple(s), street, city: N.city(s.city), where, duo: d.stockNow.duo, pro: d.stockNow["18-pro"], pm: d.stockNow["18-pro-max"] }), 155);
  const alt = alternatesIn(storePath(s), loc);
  return { title, description, alternates: c.cc === "us" ? { canonical: storePath(s) } : alt, openGraph: { type: "website", siteName: "PickupChecker", title, description, url: alt.canonical } };
}

export async function StorePage({ country: c, params: p }: { country: Country; params: StoreParams }) {
  const { state, city, store } = p;
  const s = find(c, state, city, store);
  if (!s) {
    // Old URL shape /stores/{state}/{store-slug} lands here with city = store slug: send it to the canonical page.
    const legacy = storesOf(c.cc).find((x) => x.slug === city && stateSlug(x.state) === state);
    if (legacy && store === legacy.slug) permanentRedirect(storePath(legacy));
    notFound();
  }
  const us = c.cc === "us";
  const cc = c.cc;
  const loc = pageLocale();
  const lang = loc.lang;
  const P = t().place;
  const G = t().pages.common;
  const S = t().pages.store;
  const N = namesFor(lang, cc);
  const d = await load(s);
  const week = normalizeHours(s.hours);
  const today = todayLabel(week, d.tz, new Date(), lang);
  const all = storesOf(cc);
  const sameCity = all.filter((x) => x.state === s.state && x.city === s.city && x.storeNumber !== s.storeNumber);
  const sameState = all.filter((x) => x.state === s.state && x.city !== s.city).sort((a, b) => a.city.localeCompare(b.city)).slice(0, 14);
  const here = us ? cityRef(s.state, s.city) : undefined;
  const cities = us
    ? nearbyCities(s.lat, s.lng, { exclude: here, limit: 8 }).map((x) => ({ href: x.href, label: cityLabel(x), meta: `${Math.round(x.distance)} mi` }))
    : nearbyCitiesIn(cc, s.lat, s.lng, { excludeHref: intlCityRefs(cc).find((x) => x.state === s.state && x.name === s.city)?.href, limit: 8 }).map((x) => ({ href: x.href, label: N.city(x.name), meta: distText(x.distance, cc, lang) }));
  const neighbors = us ? neighborStates(s.state) : [];
  const duo = modelByKey(DEFAULT_MODEL)!;
  const code = stateCodeOf(s);
  const place = N.apple(s);
  const sCity = N.city(s.city);
  const sRegion = N.region(s.state);
  const alert = alertHref({ model: DEFAULT_MODEL, store: s.storeNumber, country: cc });
  const questions = faq({ kind: "store", place, stores: [s], stockNow: d.stockNow, stats: d.pstats, peak: peakOf(d.stats, lang), nearest: d.nearby, hours: compressHours(week, lang), todayText: `${hoursText(today.today, lang)} (${lang === "en" ? today.label.toLowerCase() : today.label})`, omit: ["lasts", "nearest"] }, lang);
  const tax = us ? SALES_TAX[s.state] : undefined;
  const duoTaxed = us ? withTax(1999, s.state) : null;
  if (tax) questions.push({ q: `How much is the iPhone Duo with tax at ${place}?`, a: tax.combined === 0 ? `$1,999 for the 256GB: ${s.state} has no sales tax, so the apple.com price is what you pay at pickup.` : `About $${withTax(1999, s.state)!.total.toLocaleString("en-US")} for the 256GB, using ${s.state}'s average combined rate of ${tax.combined}% (local rates vary). In-store pickup is taxed where the store is.` });
  if (!us) { const tf = P.taxFaq(cc, place, cc === "ca" ? s.state : undefined); questions.push({ q: cc === "ca" ? S.taxQ(place) : tf.q, a: tf.a }); }
  questions.push({ q: S.pickupQ(place), a: S.pickupA(place) });
  const alone = onlyInCity(s);
  // The restock-times page of this store's city (two-plus stores) or state (with a page of its own), US only.
  const rtLink = us ? [{ href: restockTimesPath(s.state, s.city), place: s.city }, { href: restockTimesPath(s.state), place: s.state }].find((l) => l.href.startsWith("/iphone-duo-restock-times/")) : undefined;
  const soleInState = us && isOneStoreState(s.state);
  const soleInCountry = !us && all.length === 1;
  const sole = soleRegion(s);
  const title = loc.native ? P.storeTitle(s, sole === s.state ? sRegion : sole ? N.city(sole) : undefined) : storeTitle(s, code, d.stockNow.duo, sole);
  const taxLine = us
    ? (!tax ? "" : tax.combined === 0 ? `${s.state} has no sales tax, so a 256GB iPhone Duo costs $1,999 out the door here.` : `With ${s.state}'s average ${tax.combined}% sales tax, a 256GB iPhone Duo comes to about $${duoTaxed!.total.toLocaleString("en-US")} here.`)
    : P.taxSentence(cc, cc === "ca" ? s.state : undefined);
  const [photo1, photo2] = storePhotos(s);
  const facts = lang === "en" ? emptyFacts(cc) : { ...emptyFacts(cc), lang };
  const street = (s.street ?? "").trim();
  const storeWord = S.storeWord(N.store(s));
  const backups = d.nearby.slice(0, 2);
  const help = us ? pickupHelp(cc) : P.sources(cc as Exclude<typeof cc, "us">).pickupHelp;
  const dist = (miles: number) => (us ? `${Math.round(miles)} mi` : distText(miles, cc, lang));
  const sections = [
    {
      id: slugId(`${storeWord} hours`),
      h2: S.hoursH2(storeWord),
      lead: S.hoursLead(place, fullAddress(s, lang), s.phone, hoursText(today.today, lang), compressHours(week, lang)),
      blocks: [
        { t: "ul" as const, items: S.pickupRules(help.url) },
        { t: "p" as const, text: S.directions(place, directionsUrl(s), s.url) },
        { t: "img" as const, id: photo2 },
      ],
    },
    ...(alone ? [{
      id: slugId(`apple store ${soleInState ? s.state : s.city}`),
      h2: S.onlyH2(soleInState ? s.state : sCity, place),
      lead: soleInState
        ? `${s.state} has one Apple Store, ${place} in ${s.city}.${d.outside.length ? ` The closest ones across the state line are ${listWords(d.outside.slice(0, 2).map((b) => `${appleName(b)} in ${b.city}, ${stateCodeOf(b)} (${Math.round(b.distance)} mi)`))}.` : ""}${tax && tax.combined === 0 ? ` With no sales tax here, many buyers make the drive on purpose.` : ""}`
        : soleInCountry
          ? S.onlyInCountry(place, cc)
          : S.onlyInCity(sCity, place, backups.length ? (lang === "en" ? listWords : (x: string[]) => listIn(lang, x))(backups.map((b) => S.backup(N.apple(b), N.city(b.city), dist(b.distance)))) : ""),
      blocks: [{ t: "p" as const, text: soleInCountry ? S.onlyBlockCountry(place) : S.onlyBlock(place) }],
    }] : []),
  ];
  const index = placeTarget(cc);
  const crumbs: Crumb[] = us
    ? [{ href: "/stores", label: "Apple Stores" }, ...(hasStatePage(s.state) ? [{ href: statePath(s.state), label: s.state }] : []), ...(alone ? [] : [{ href: cityPath(s.state, s.city), label: s.city }]), { label: place }]
    : [{ href: prefixOf(cc), label: N.countryShort() }, ...(index?.indexable ? [{ href: storesIndexPath(cc), label: G.appleStores }] : []), ...(hasStatePage(s.state, cc) ? [{ href: statePath(s.state, cc), label: sRegion }] : []), ...(alone || !placeTarget(cc, stateSlug(s.state), citySlug(s.city))?.indexable ? [] : [{ href: cityPath(s.state, s.city, cc), label: sCity }]), { label: place }];
  const restocksAll = `${restocksPath(cc)}?model=all&state=${stateSlug(s.state)}`;
  const regionWord = us ? "state" : (c.regionNoun ?? "area");
  // The restock pattern in the first paragraph: the sentence answer engines lift for "when does this store restock".
  const peak = peakOf(d.stats, lang);
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <JsonLd data={storeJsonLd(s, week, lang)} />
      <Breadcrumbs items={crumbs} />
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="display text-3xl sm:text-5xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-2">{S.intro({ place, street, duo: d.stockNow.duo, duoOf: d.configs.duo, pro: d.stockNow["18-pro"], proOf: d.configs["18-pro"], pm: d.stockNow["18-pro-max"], pmOf: d.configs["18-pro-max"], peak: peak ? peak.hour : null })}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-3">{peak && <span>{S.restocks30(peak.total)}</span>}<span>{today.label}</span>{taxLine && <span>{taxLine}</span>}</div>
          <div className="mt-3"><StoreInfo store={s} showMapLink={false} /></div>
          {d.lookupOff && <p className="mt-2 text-sm font-medium text-warn">{S.lookupOff}</p>}
          <p className="mt-2 text-sm text-ink-3">{S.checked} <LiveChecked iso={d.summary?.lastCheckedAt ?? null} stores={[s.storeNumber]} /> · {G.checkNote}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`${mapPath(cc)}?store=${s.storeNumber}&model=${DEFAULT_MODEL}`} className="btn btn-ghost btn-sm">{G.showOnMap}</Link>
          <Link href={alert} className="btn btn-primary btn-sm">{S.alertHere(duo.short)}</Link>
        </div>
      </div>
      <AlertPanelFor href={alert} summary={lang === "en" ? S.panel(s.name) : S.panel(N.store(s))} country={cc} />

      <div className="mt-6"><Last24Hours data={d.recent} label={G.atPlace(place)} stores={[s]} country={cc} stock={d.stock} lastBefore={d.lastDuoRestock} alert={alert} /></div>

      <div className="mt-6"><ModelPlaceCards place={storePlace(s)} stockNow={d.stockNow} of={Object.fromEntries(MODELS.map((m) => [m.key, catalogFor(m.key, cc).length])) as Record<ModelKey, number>} unit={S.configsInStock} /></div>
      <div className="mt-3"><PlaceStatStrip stores={1} stockNow={d.stockNow} stats={d.pstats} storeMode /></div>

      <section className="mt-6">
        <h2 className="text-xl font-semibold">{S.stockNowH2}</h2>
        <div className="mt-3"><StockByModel summary={d.summary} storeNumber={s.storeNumber} {...(d.lookupOff ? { lookupOff: true } : {})} /></div>
      </section>

      <div className="mt-6" id="configs"><ConfigTable store={s} rows={d.rows} {...(d.lookupOff ? { lookupOff: true } : {})} /></div>

      <div className="mx-auto mt-8 max-w-3xl">
        <Figure id={photo1} />
        <KeywordSections sections={sections} facts={facts} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="pane p-5">
            <h2 className="text-xl font-semibold">{S.whenRestock(N.store(s))}</h2>
            <div className="mt-3"><RestockClock stats={d.stats} label={G.here} reports={d.reports} /></div>
            {rtLink && <p className="mt-3 text-sm"><Link href={rtLink.href} className="font-medium text-ink underline-offset-2 hover:underline">When does the iPhone Duo restock in {rtLink.place}? Every store, hour by hour →</Link></p>}
          </section>
          <section className="pane p-5">
            <h2 className="text-xl font-semibold">{S.howFast(N.store(s))}</h2>
            <div className="mt-3"><SellOutTimes data={d.sell} label={G.here} /></div>
          </section>
          <section className="pane p-5">
            <h2 className="text-xl font-semibold">{G.lastDays(d.pstats.days)}</h2>
            <div className="mt-3"><DailyBars stats={d.pstats} label={G.here} /></div>
          </section>
          <section className="pane p-5">
            <h2 className="text-xl font-semibold">{G.restocksBy}</h2>
            <div className="mt-3"><RestocksByConfig stats={d.pstats} label={G.here} store={s.storeNumber} country={cc} /></div>
          </section>
          <section className="min-w-0">
            <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">{S.history}</h2><Link href={restocksAll} className="text-sm text-ink-3 hover:text-ink">{G.allOfArrow(sRegion)}</Link></div>
            <RestockFeed rows={d.feed} showModel emptyText={S.historyEmpty} />
          </section>
        </div>
        <aside className="space-y-4">
          <MiniMap lat={s.lat} lng={s.lng} label={place} href={`${mapPath(cc)}?store=${s.storeNumber}&model=${DEFAULT_MODEL}`} />
          <div className="pane p-5"><HoursTable store={s} /></div>
          <NearbyStores title={S.nearby} stores={d.nearby} stock={d.stock} />
          {d.inState.length > 0 && <NearbyStores title={S.elsewhereIn(sRegion)} stores={d.inState} stock={d.stock} />}
          {us && <NearbyStores title={G.acrossStateLine} stores={d.outside} stock={d.stock} />}
        </aside>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Faq items={questions} title={S.faqTitle(place)} />
        <div className="pane p-5 sm:p-6"><SourceList sources={[...(s.url ? [{ label: S.applePage(place), url: s.url }] : []), help, us ? SALES_TAX_SOURCE : P.sources(cc as Exclude<typeof cc, "us">).tax]} facts={facts} {...(us ? {} : { where: S.sourcesWhere(all.length, cc), since: G.since })} /></div>
      </div>

      <RelatedBlock title={S.around(place)}>
        {sameCity.length > 0 && <LinkRow title={S.otherInCity(sCity)} links={sameCity.map((x) => ({ href: storePath(x), label: N.store(x) }))} more={{ href: cityPath(s.state, s.city, cc), label: S.cityPage(sCity) }} />}
        {cities.length > 0 && <LinkRow title={G.nearbyCities} links={cities} />}
        <LinkRow title={S.moreIn(sRegion)} links={sameState.map((x) => ({ href: storePath(x), label: G.storeAndCity(N.store(x), N.city(x.city)) }))} more={{ href: statePath(s.state, cc), label: G.allOf(sRegion) }} />
        {neighbors.length > 0 && <LinkRow title={G.neighboringStates} links={neighbors.map((n) => ({ href: n.href, label: n.name, meta: String(n.count) }))} />}
        {!us && <LinkRow title={S.everyIn(cc)} links={all.filter((x) => x.storeNumber !== s.storeNumber && !sameCity.includes(x) && !sameState.includes(x)).slice(0, 16).map((x) => ({ href: storePath(x), label: G.storeAndCity(N.store(x), N.city(x.city)) }))} more={{ href: index?.path ?? prefixOf(cc), label: index?.indexable ? S.allIn(cc) : S.countryHome(cc) }} />}
        {us ? <BrowseModels /> : <BrowseCountryModels country={c} />}
        <LinkRow title={G.restockLogs} links={[{ href: restocksAll, label: G.regionRestocks(sRegion) }, { href: restocksPath(cc), label: us ? G.allUsRestocks : G.allRestocksIn(cc) }, { href: `${mapPath(cc)}?state=${encodeURIComponent(code)}&model=${DEFAULT_MODEL}`, label: G.onTheMap(sRegion) }]} />
      </RelatedBlock>
      <p className="mt-8 text-xs text-ink-3">{S.footnote}{us ? "" : S.footnoteIntl(cc, regionWord)}</p>
    </div>
  );
}
