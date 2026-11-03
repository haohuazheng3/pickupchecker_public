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
import { COUNTRIES, prefixOf, type Country } from "@/lib/apple/countries";
import { nearestStores, nearbyCities, neighborStates, cityRef, cityLabel } from "@/lib/seo/links";
import { nearbyCitiesIn, nearestStoresIn, cityRefs as intlCityRefs } from "@/lib/seo/countryLinks";
import { normalizeHours, compressHours, todayLabel, hoursText, storeJsonLd, nearestOutsideState, nearestInState, alertHref, faq, peakOf, storeTitle, fitTitle, fullAddress, directionsUrl, listWords, distText } from "@/lib/seo/enrich";
import { taxFaqIntl, taxSentence } from "@/lib/seo/countryCopy";
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
import { SellOutTimes } from "@/components/restocks/SellOutTimes";
import { sellouts } from "@/lib/stock/sellouts";
import { DailyBars } from "@/components/restocks/DailyBars";
import { RestocksByConfig } from "@/components/restocks/RestocksByConfig";
import { Last24Hours } from "@/components/restocks/Last24Hours";
import { recentByConfig } from "@/lib/stock/recent";
import { MiniMap } from "@/components/stores/MiniMap";
import { LiveChecked } from "@/components/site/LiveChecked";
import { CHECK_NOTE } from "@/lib/plans";
import { Figure } from "@/components/content/Figure";
import { KeywordSections, slugId } from "@/components/content/KeywordSections";
import { SourceList } from "@/components/content/RichFaq";
import { emptyFacts } from "@/lib/content/facts";
import { storePhotos } from "@/content/store-photos";
import { SALES_TAX, SALES_TAX_SOURCE, withTax } from "@/content/sales-tax";
import { TAX_SOURCES, pickupHelp } from "@/content/country-tax";
import { AlertPanelFor } from "@/components/alerts/AlertPanelServer";
import { INTL_TRACKING_LABEL } from "./shared";

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

export async function storeMetadata(c: Country, p: StoreParams): Promise<Metadata> {
  const s = find(c, p.state, p.city, p.store);
  if (!s) return {};
  const d = await load(s);
  const title = storeTitle(s, stateCodeOf(s), d.stockNow.duo, soleRegion(s));
  const street = (s.street ?? "").trim();
  const where = c.cc === "us" ? `${s.city} ${stateCodeOf(s)}` : `${s.city}, ${c.short}`;
  const description = fitTitle([
    `${appleName(s)}, ${street}, ${s.city}: live pickup stock for ${d.stockNow.duo} iPhone Duo, ${d.stockNow["18-pro"]} 18 Pro and ${d.stockNow["18-pro-max"]} Pro Max configs, today's hours, restock times and nearby stores.`,
    `${appleName(s)}, ${where}: live pickup stock for ${d.stockNow.duo} Duo, ${d.stockNow["18-pro"]} 18 Pro and ${d.stockNow["18-pro-max"]} Pro Max configs, today's hours and restock times.`,
    `${appleName(s)}, ${s.city}: live stock for ${d.stockNow.duo} Duo, ${d.stockNow["18-pro"]} 18 Pro, ${d.stockNow["18-pro-max"]} Pro Max configs, hours and restocks.`,
  ], 155);
  return { title, description, alternates: { canonical: storePath(s) }, openGraph: { type: "website", siteName: "PickupChecker", title, description, url: storePath(s) } };
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
  const d = await load(s);
  const week = normalizeHours(s.hours);
  const today = todayLabel(week, d.tz);
  const all = storesOf(cc);
  const sameCity = all.filter((x) => x.state === s.state && x.city === s.city && x.storeNumber !== s.storeNumber);
  const sameState = all.filter((x) => x.state === s.state && x.city !== s.city).sort((a, b) => a.city.localeCompare(b.city)).slice(0, 14);
  const here = us ? cityRef(s.state, s.city) : undefined;
  const cities = us
    ? nearbyCities(s.lat, s.lng, { exclude: here, limit: 8 }).map((x) => ({ href: x.href, label: cityLabel(x), meta: `${Math.round(x.distance)} mi` }))
    : nearbyCitiesIn(cc, s.lat, s.lng, { excludeHref: intlCityRefs(cc).find((x) => x.state === s.state && x.name === s.city)?.href, limit: 8 }).map((x) => ({ href: x.href, label: x.name, meta: distText(x.distance, cc) }));
  const neighbors = us ? neighborStates(s.state) : [];
  const duo = modelByKey(DEFAULT_MODEL)!;
  const code = stateCodeOf(s);
  const place = `${appleName(s)}`;
  const alert = alertHref({ model: DEFAULT_MODEL, store: s.storeNumber, country: cc });
  const questions = faq({ kind: "store", place, stores: [s], stockNow: d.stockNow, stats: d.pstats, peak: peakOf(d.stats), nearest: d.nearby, hours: compressHours(week), todayText: `${hoursText(today.today)} (${today.label.toLowerCase()})` })
    .filter((q) => !q.q.startsWith("How long does stock last") && !q.q.startsWith("What is the nearest other Apple Store"));
  const tax = us ? SALES_TAX[s.state] : undefined;
  const duoTaxed = us ? withTax(1999, s.state) : null;
  if (tax) questions.push({ q: `How much is the iPhone Duo with tax at ${place}?`, a: tax.combined === 0 ? `$1,999 for the 256GB: ${s.state} has no sales tax, so the apple.com price is what you pay at pickup.` : `About $${withTax(1999, s.state)!.total.toLocaleString("en-US")} for the 256GB, using ${s.state}'s average combined rate of ${tax.combined}% (local rates vary). In-store pickup is taxed where the store is.` });
  if (!us) { const t = taxFaqIntl(cc, place, cc === "ca" ? s.state : undefined); questions.push({ q: cc === "ca" ? `How much is the iPhone Duo with tax at ${place}?` : t.q, a: t.a }); }
  questions.push({ q: `Can I pick up an apple.com order at ${place}?`, a: `Yes. Choose "I'll pick it up" and ${place} at checkout, wait for Apple's pickup notification, then bring the order number, a government photo ID and the QR code or Wallet pass; screenshots are not accepted.` });
  const alone = onlyInCity(s);
  const soleInState = us && isOneStoreState(s.state);
  const soleInCountry = !us && all.length === 1;
  const title = storeTitle(s, code, d.stockNow.duo, soleRegion(s));
  const taxLine = us
    ? (!tax ? "" : tax.combined === 0 ? `${s.state} has no sales tax, so a 256GB iPhone Duo costs $1,999 out the door here.` : `With ${s.state}'s average ${tax.combined}% sales tax, a 256GB iPhone Duo comes to about $${duoTaxed!.total.toLocaleString("en-US")} here.`)
    : taxSentence(cc, cc === "ca" ? s.state : undefined);
  const [photo1, photo2] = storePhotos(s);
  const facts = emptyFacts(cc);
  const street = (s.street ?? "").trim();
  const storeWord = /^apple\b/i.test(s.name) ? s.name.replace(/^apple\s*/i, "Apple Store ") : `Apple Store ${s.name}`;
  const backups = d.nearby.slice(0, 2);
  const help = pickupHelp(cc);
  const dist = (miles: number) => (us ? `${Math.round(miles)} mi` : distText(miles, cc));
  const sections = [
    {
      id: slugId(`${storeWord} hours`),
      h2: `${storeWord} hours, address and pickup`,
      lead: `${place} is at ${fullAddress(s)}${s.phone ? `, ${s.phone}` : ""}. Today's hours: ${hoursText(today.today)}; the full week: ${compressHours(week)}.`,
      blocks: [
        { t: "p" as const, text: `To collect an online order here, wait for Apple's pickup notification, then bring the order number, a government photo ID and the QR code or Wallet pass ([Apple's pickup rules](${help.url})). Screenshots of the code are not accepted, and a designated contact can collect for you if you named one at checkout.` },
        { t: "p" as const, text: `[Directions to ${place}](${directionsUrl(s)})${s.url ? ` · [Apple's page for this store](${s.url})` : ""}` },
        { t: "img" as const, id: photo2 },
      ],
    },
    ...(alone ? [{
      id: slugId(`apple store ${soleInState ? s.state : s.city}`),
      h2: soleInState ? `Apple Store ${s.state}: ${place} is the only one` : `Apple Store ${s.city}: ${place} is the only one`,
      lead: soleInState
        ? `${s.state} has one Apple Store, ${place} in ${s.city}.${d.outside.length ? ` The closest ones across the state line are ${listWords(d.outside.slice(0, 2).map((b) => `${appleName(b)} in ${b.city}, ${stateCodeOf(b)} (${Math.round(b.distance)} mi)`))}.` : ""}${tax && tax.combined === 0 ? ` With no sales tax here, many buyers make the drive on purpose.` : ""}`
        : soleInCountry
          ? `${place} is the only Apple Store ${c.inName}, so every in-store pickup ${c.inName} happens here. When it lists a configuration, there is no second store to try: an alert for it is the whole strategy.`
          : `${s.city} has one Apple Store, ${place}.${backups.length ? ` The next closest are ${listWords(backups.map((b) => `${appleName(b)} in ${b.city} (${dist(b.distance)})`))}.` : ""}`,
      blocks: [{ t: "p" as const, text: soleInCountry ? `One alert covers one store and one exact configuration, and the push arrives seconds after ${place} lists it for pickup.` : `If ${place} is out of the configuration you want, those are the backups worth watching too: one alert covers one store and one exact configuration, and the push arrives seconds after the store lists it.` }],
    }] : []),
  ];
  const index = placeTarget(cc);
  const crumbs: Crumb[] = us
    ? [{ href: "/stores", label: "Apple Stores" }, ...(hasStatePage(s.state) ? [{ href: statePath(s.state), label: s.state }] : []), ...(alone ? [] : [{ href: cityPath(s.state, s.city), label: s.city }]), { label: place }]
    : [{ href: prefixOf(cc), label: c.short }, ...(index?.indexable ? [{ href: storesIndexPath(cc), label: "Apple Stores" }] : []), ...(hasStatePage(s.state, cc) ? [{ href: statePath(s.state, cc), label: s.state }] : []), ...(alone || !placeTarget(cc, stateSlug(s.state), citySlug(s.city))?.indexable ? [] : [{ href: cityPath(s.state, s.city, cc), label: s.city }]), { label: place }];
  const restocksAll = `${restocksPath(cc)}?model=all&state=${stateSlug(s.state)}`;
  const regionWord = us ? "state" : (c.regionNoun ?? "area");
  // The restock pattern in the first paragraph: the sentence answer engines lift for "when does this store restock".
  const peak = peakOf(d.stats);
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <JsonLd data={storeJsonLd(s, week)} />
      <Breadcrumbs items={crumbs} />
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="display text-3xl sm:text-5xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-2">{place}{street ? ` at ${street}` : ""} lists <b className="text-ink">{d.stockNow.duo} of {d.configs.duo}</b> iPhone Duo, <b className="text-ink">{d.stockNow["18-pro"]} of {d.configs["18-pro"]}</b> iPhone 18 Pro and <b className="text-ink">{d.stockNow["18-pro-max"]} of {d.configs["18-pro-max"]}</b> iPhone 18 Pro Max configurations for pickup right now.{peak ? <> Restocks here usually land around <b className="text-ink">{peak.hour}</b> local time ({peak.total} in the last 30 days).</> : null} {today.label}. {taxLine}</p>
          <div className="mt-3"><StoreInfo store={s} showMapLink={false} /></div>
          {d.lookupOff && <p className="mt-2 text-sm font-medium text-warn">Apple isn&apos;t offering in-store pickup lookups at this store right now. We ask again every 30 minutes and show its stock as soon as Apple answers.</p>}
          <p className="mt-2 text-sm text-ink-3">Checked <LiveChecked iso={d.summary?.lastCheckedAt ?? null} stores={[s.storeNumber]} /> · {CHECK_NOTE}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`${mapPath(cc)}?store=${s.storeNumber}&model=${DEFAULT_MODEL}`} className="btn btn-ghost btn-sm">Show on map</Link>
          <Link href={alert} className="btn btn-primary btn-sm">Alert me for {duo.short} here</Link>
        </div>
      </div>
      <AlertPanelFor href={alert} summary={`For Apple ${s.name}: pick the phones, tick this store and any nearby`} country={cc} />

      <div className="mt-6"><Last24Hours data={d.recent} label={`at ${place}`} stores={[s]} country={cc} stock={d.stock} lastBefore={d.lastDuoRestock} alert={alert} /></div>

      <div className="mt-6"><ModelPlaceCards place={storePlace(s)} stockNow={d.stockNow} of={Object.fromEntries(MODELS.map((m) => [m.key, catalogFor(m.key, cc).length])) as Record<ModelKey, number>} unit="configs in stock" /></div>
      <div className="mt-3"><PlaceStatStrip stores={1} stockNow={d.stockNow} stats={d.pstats} storeMode /></div>

      <section className="mt-6">
        <h2 className="text-xl font-semibold">Pickup stock right now</h2>
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
            <h2 className="text-xl font-semibold">When does {s.name} restock?</h2>
            <div className="mt-3"><RestockClock stats={d.stats} label="here" reports={d.reports} /></div>
          </section>
          <section className="pane p-5">
            <h2 className="text-xl font-semibold">How fast do restocks sell out at {s.name}?</h2>
            <div className="mt-3"><SellOutTimes data={d.sell} label="here" /></div>
          </section>
          <section className="pane p-5">
            <h2 className="text-xl font-semibold">Last {d.pstats.days} days, day by day</h2>
            <div className="mt-3"><DailyBars stats={d.pstats} label="here" /></div>
          </section>
          <section className="pane p-5">
            <h2 className="text-xl font-semibold">Restocks by configuration</h2>
            <div className="mt-3"><RestocksByConfig stats={d.pstats} label="here" store={s.storeNumber} country={cc} /></div>
          </section>
          <section className="min-w-0">
            <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Restock history</h2><Link href={restocksAll} className="text-sm text-ink-3 hover:text-ink">All of {s.state} →</Link></div>
            <RestockFeed rows={d.feed} showModel emptyText="No restock or sell-out recorded here yet." />
          </section>
        </div>
        <aside className="space-y-4">
          <MiniMap lat={s.lat} lng={s.lng} label={place} href={`${mapPath(cc)}?store=${s.storeNumber}&model=${DEFAULT_MODEL}`} />
          <div className="pane p-5"><HoursTable store={s} /></div>
          <NearbyStores title="Nearby stores" stores={d.nearby} stock={d.stock} />
          {d.inState.length > 0 && <NearbyStores title={`Elsewhere in ${s.state}`} stores={d.inState} stock={d.stock} />}
          {us && <NearbyStores title="Across the state line" stores={d.outside} stock={d.stock} />}
        </aside>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Faq items={questions} title={`${place} FAQ`} />
        <div className="pane p-5 sm:p-6"><SourceList sources={[...(s.url ? [{ label: `Apple: ${place} store page (hours, events)`, url: s.url }] : []), help, us ? SALES_TAX_SOURCE : TAX_SOURCES[cc as Exclude<typeof cc, "us">]]} facts={facts} {...(us ? {} : { where: `the ${all.length === 1 ? "Apple Store" : `${all.length} Apple Stores`} ${c.inName}`, since: INTL_TRACKING_LABEL })} /></div>
      </div>

      <RelatedBlock title={`Around ${place}`}>
        {sameCity.length > 0 && <LinkRow title={`Other Apple Stores in ${s.city}`} links={sameCity.map((x) => ({ href: storePath(x), label: x.name }))} more={{ href: cityPath(s.state, s.city, cc), label: `${s.city} page` }} />}
        {cities.length > 0 && <LinkRow title="Nearby cities with Apple Stores" links={cities} />}
        <LinkRow title={`More Apple Stores in ${s.state}`} links={sameState.map((x) => ({ href: storePath(x), label: `${x.name} · ${x.city}` }))} more={{ href: statePath(s.state, cc), label: `All of ${s.state}` }} />
        {neighbors.length > 0 && <LinkRow title="Neighboring states" links={neighbors.map((n) => ({ href: n.href, label: n.name, meta: String(n.count) }))} />}
        {!us && <LinkRow title={`Every Apple Store ${c.inName}`} links={all.filter((x) => x.storeNumber !== s.storeNumber && !sameCity.includes(x) && !sameState.includes(x)).slice(0, 16).map((x) => ({ href: storePath(x), label: `${x.name} · ${x.city}` }))} more={{ href: index?.path ?? prefixOf(cc), label: index?.indexable ? `All Apple Stores ${c.inName}` : `${c.name} home` }} />}
        {us ? <BrowseModels /> : <BrowseCountryModels country={c} />}
        <LinkRow title="Restock logs" links={[{ href: restocksAll, label: `${s.state} restocks` }, { href: restocksPath(cc), label: us ? "All US restocks" : `All restocks ${c.inName}` }, { href: `${mapPath(cc)}?state=${encodeURIComponent(code)}&model=${DEFAULT_MODEL}`, label: `${s.state} on the map` }]} />
      </RelatedBlock>
      <p className="mt-8 text-xs text-ink-3">Availability as shown on apple.com for in-store pickup, as of the last check.{us ? "" : ` Prices in ${COUNTRIES[cc].currency}; distances in ${c.unit === "mi" ? "miles" : "kilometres"}. Not a ${regionWord} or retailer site.`}</p>
    </div>
  );
}
