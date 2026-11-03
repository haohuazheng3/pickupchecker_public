/**
 * One page per product × place, in any country: /stock/{product}/{place…} in the US, /{cc}/stock/… elsewhere.
 * Reads: three cached status reads (one per model and country, shared by every page), the cached place
 * statistics, the restock-hour histogram and the latest changes. The place's country (seo/tree.ts) decides
 * the catalogue, stores and links. Indexed: the US national model/storage/colour pages (seo.md §10) and, in
 * every other country, its three model pages (§12); everything else is noindex, follow.
 */
import type { Metadata } from "next";
import { LiveChecked } from "@/components/site/LiveChecked";
import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { STORE_INDEX, appleBuyUrl, cityPath, statePath, storePath, appleName, itemFor, placeTarget, mapPath, restocksPath, storesIndexPath } from "@/lib/apple/catalog";
import { prefixOf, theName, type Country } from "@/lib/apple/countries";
import { isIndexedProductPage, productPath, storePlace, type Place, type Product } from "@/lib/seo/products";
import { treeOf } from "@/lib/seo/tree";
import { childPlaces, configGrid, facetsFor, indexStock, lastChecked, nearestWithStock, siblingPlaces, storeLines } from "@/lib/seo/productData";
import { productJsonLdFor } from "@/lib/seo/productCopy";
import { priceRange } from "@/lib/seo/countryCopy";
import { alertHref, distText } from "@/lib/seo/enrich";
import { modelStock, placeStats, restockFeed, restockStats, restockReportStats } from "@/lib/stock/queries";
import { Breadcrumbs, LinkRow, RelatedBlock } from "@/components/seo/Related";
import { JsonLd } from "@/components/seo/JsonLd";
import { StatStrip, type Stat } from "@/components/seo/StatStrip";
import { Faq } from "@/components/seo/Faq";
import { PlaceCountList, ProductGrid, ProductNav, ProductStoreList, StatusCard } from "@/components/seo/ProductParts";
import { RestockFeed } from "@/components/restocks/RestockFeed";
import { RestockClock } from "@/components/restocks/RestockClock";
import { SellOutTimes } from "@/components/restocks/SellOutTimes";
import { sellouts } from "@/lib/stock/sellouts";
import { DailyBars } from "@/components/restocks/DailyBars";
import { RestocksByConfig } from "@/components/restocks/RestocksByConfig";
import { LiveAgo } from "@/components/site/LiveAgo";
import { Dot } from "@/components/stock/StatusBits";
import { PRODUCT_TITLES } from "@/content/titles";
import { PRODUCT_COPY } from "@/content/product-pages";
import { getFacts, emptyFacts } from "@/lib/content/facts";
import { Inline } from "@/components/content/Inline";
import { Figure } from "@/components/content/Figure";
import { QuickCheckServer } from "@/components/content/QuickCheckServer";
import { KeywordSections, slugId, type KeywordSection } from "@/components/content/KeywordSections";
import { RichFaq, SourceList } from "@/components/content/RichFaq";
import { AlertPanelFor } from "@/components/alerts/AlertPanelServer";
import { TAX_SOURCES, pickupHelp } from "@/content/country-tax";
import { INTL_PLACE_PHOTOS } from "@/content/place-photos-intl";
import { hreflangFor } from "./shared";
import { englishLocale, pathInLocale, type Lang, type Locale } from "@/lib/i18n/locales";
import { dict, type Dict } from "@/lib/i18n/dict";
import { pageLocale, t as dictT } from "@/lib/i18n/server";
import { distance, bidi } from "@/lib/i18n/format";
import { appleStoreLabel, cityLabel, configLabel, countryLabel, regionLabel, storeLabel } from "@/lib/i18n/places";

const INDEXABLE = process.env.NEXT_PUBLIC_INDEXABLE === "1";
const BASE = "https://pickupchecker.com";

export type ProductParams = { product: string; place?: string[] };

// Keyed by strings: React's cache compares arguments by identity, and the page and its metadata get different arrays.
const load = cache(async (cc: Country["cc"], slug: string, path: string) => {
  const t = treeOf(cc);
  const product = t.productBySlug(slug);
  if (!product) return null;
  const place = t.resolvePlace(path ? path.split("/") : []);
  if (!place) return null;
  if ("redirect" in place) return { kind: "redirect" as const, to: productPath(product, { segments: place.redirect, country: product.country }) };
  const numbers = place.stores.map((s) => s.storeNumber);
  const [duo, pro, max, stats, clock, feed, reports, sell] = await Promise.all([
    modelStock("duo", cc),
    modelStock("18-pro", cc),
    modelStock("18-pro-max", cc),
    placeStats({ storeNumbers: numbers, parts: product.parts, tz: place.tz, country: cc }),
    restockStats(numbers, place.tz, 30, undefined, product.parts, cc),
    restockFeed({ parts: product.parts, storeNumbers: numbers, kind: "all", limit: 8, country: cc }),
    restockReportStats(numbers, place.tz, 30, undefined, product.parts, cc),
    sellouts({ storeNumbers: numbers, parts: product.parts, country: cc }),
  ]);
  const ix = indexStock({ duo, "18-pro": pro, "18-pro-max": max });
  const lines = storeLines(ix, product, place.stores);
  const inStock = lines.filter((l) => l.available.length > 0).length;
  // Index scope (seo.md §10, §12): the national page of a model (US: also a storage size or a color). Every
  // place-level product page and every exact configuration is noindex, follow: the /stores page of that place
  // is the one indexed page for "iPhone Duo in <place>", which keeps near-duplicates out of the index.
  const indexable = isIndexedProductPage(product, place);
  return { kind: "page" as const, product, place, ix, lines, inStock, stats, clock, feed, reports, indexable, sell };
});

/** Another country's model page binds its own titles (seo.md §12). */
function intlBound(c: Country, product: Product, place: Place, P: Dict["place"]) {
  return c.cc !== "us" && place.level === "country" && product.kind === "model" ? P.modelPageTitles(c.cc, product.model) : undefined;
}

/** A place's name in the page's language (English: the tree's own name, or its breadcrumb label when `short`). */
function placeName(place: Place, lang: Lang, short = false): string {
  if (lang === "en") return short ? place.label : place.name;
  const cc = place.country ?? "us";
  if (place.level === "country") return countryLabel(cc, lang);
  if (place.level === "state") return regionLabel(cc, place.state!, lang);
  if (place.level === "city") return cityLabel(cc, place.city!, lang);
  return short ? storeLabel(place.store!, lang) : appleStoreLabel(place.store!, lang);
}

export async function productMetadata(c: Country, p: ProductParams, loc: Locale = englishLocale(c.cc)): Promise<Metadata> {
  const { product: slug, place: segments = [] } = p;
  const d = await load(c.cc, slug, segments.join("/"));
  if (!d || d.kind === "redirect") return {};
  const t = treeOf(c.cc);
  const D = dict(loc.lang);
  const inStock = d.place.level === "store" ? d.lines[0]?.available.length ?? 0 : d.inStock;
  const bound = c.cc === "us" && d.place.level === "country" ? PRODUCT_TITLES[d.product.slug] : undefined;
  const ib = intlBound(c, d.product, d.place, D.place);
  const title = bound?.main.title ?? ib?.title ?? D.views.product.title(d.product, d.place, inStock);
  const description = bound?.description ?? (ib ? D.place.modelDescription(c.cc, d.product.model, inStock) : D.views.product.description(d.product, d.place, inStock, d.stats));
  const inLoc = (path: string) => (loc.native ? pathInLocale(path, loc) : path);
  const url = inLoc(productPath(d.product, d.place));
  const canonical = inLoc(productPath(d.product, t.canonicalPlace(d.place)));
  // The three model pages are the same page in every country (hreflang, x-default = the US one).
  const languages = d.place.level === "country" && d.product.kind === "model" ? hreflangFor({ model: d.product.slug }, loc) : undefined;
  return {
    title, description, alternates: { canonical, ...(languages ? { languages } : {}) },
    ...(INDEXABLE && !d.indexable ? { robots: { index: false, follow: true } } : {}),
    openGraph: { type: "website", siteName: "PickupChecker", title, description, url },
  };
}

/** The all-models page for the same place. */
function placePagePath(place: Place): string {
  const cc = place.country ?? "us";
  if (place.level === "country") return cc === "us" ? "/stores" : (placeTarget(cc)?.path ?? prefixOf(cc));
  if (place.level === "state") return statePath(place.state!, cc);
  if (place.level === "city") return cityPath(place.state!, place.city!, cc);
  return storePath(place.store!);
}

function placeAlert(product: Product, place: Place): string {
  return alertHref({ model: product.model, storage: product.storage, color: product.color, store: place.store?.storeNumber, state: place.level === "state" || place.level === "city" ? place.stateSlug : undefined, city: place.level === "city" ? place.citySlug : undefined, country: place.country });
}

export async function ProductPage({ country: c, params: p }: { country: Country; params: ProductParams }) {
  const { product: slug, place: segments = [] } = p;
  const d = await load(c.cc, slug, segments.join("/"));
  if (!d) notFound();
  if (d.kind === "redirect") permanentRedirect(d.to);
  const us = c.cc === "us";
  const t = treeOf(c.cc);
  const loc = pageLocale();
  const lang = loc.lang;
  const D = dictT();
  const V = D.views.product;
  const C = D.views.common;
  const inLoc = (path: string) => (loc.native ? pathInLocale(path, loc) : path);
  const { product, place, ix, lines, inStock, stats, clock, feed, reports, sell } = d;
  const top = place.level === "country";
  const atStore = place.level === "store";
  const line = lines[0];
  const chain = t.placeChain(place);
  const facets = facetsFor(ix, product, place);
  const grid = configGrid(ix, product, place);
  const children = childPlaces(ix, product, place);
  const siblings = siblingPlaces(ix, product, place, atStore ? 8 : 6);
  const nearest = inStock === 0 || (atStore && (line?.available.length ?? 0) === 0) ? nearestWithStock(ix, product, place) : null;
  const checked = lastChecked(lines);
  const one = product.parts.length === 1;
  const configItem = one ? itemFor(product.parts[0], c.cc) : undefined;
  const lr = stats.lastRestock;
  const lrItem = lr ? itemFor(lr.partNumber, c.cc) : undefined;
  const lrStore = lr ? STORE_INDEX.get(lr.storeNumber) : undefined;
  const dist = (miles: number) => (lang !== "en" ? distance(lang, c.cc, miles) : us ? `${Math.round(miles)} mi` : distText(miles, c.cc));
  // "in Tokyo" / "at Apple Ginza", and the country's "in the UK", in the page's language.
  const where = V.inPlace(placeName(place, lang), place.level);
  const inCountry = C.inCountry(c);
  const label = top && !us ? inCountry : where;
  // The whole country: the stores that have it, or — when none do — the ones that had it most recently.
  const usNone = top && inStock === 0;
  const shownLines = !top ? lines : usNone ? lines.filter((l) => l.lastAvailableAt).slice(0, 12) : lines.filter((l) => l.available.length > 0).slice(0, 40);
  const faq = V.faq(product, place, lines, stats, clock, nearest ? { name: storeLabel(nearest.store, lang), city: cityLabel(c.cc, nearest.store.city, lang), distance: nearest.distance } : null);
  // Keyword-bound national pages (seo.md §3): entry titles, an Answer-First intro, one section per secondary keyword.
  const bound = us && top ? PRODUCT_TITLES[product.slug] : undefined;
  const copy = bound ? PRODUCT_COPY[product.slug] : undefined;
  const facts = us && top ? await getFacts() : null;
  const sections = bound && copy ? bound.h2.map((h) => ({ id: slugId(h.keyword), h2: h.title, ...(copy.sections[h.keyword] ?? { lead: "", blocks: [] }) })).filter((x) => x.lead) : [];
  // Another country's model page: its own titles, an Answer-First intro and two keyword sections (seo.md §12).
  const ib = intlBound(c, product, place, D.place);
  const countryName = lang === "en" ? theName(c) : countryLabel(c.cc, lang);
  const intlSections: KeywordSection[] = ib ? modelSections(c, product, lines, inStock, ib.h2[0], lang, D, countryName) : [];
  const intlFaq = ib ? modelFaq(c, product, inStock, D, countryName) : [];

  const stat: Stat[] = [
    atStore
      ? { label: V.inStockNow, value: one ? (inStock ? V.yes : V.no) : `${line?.available.length ?? 0}/${product.parts.length}`, hint: one ? (line?.status?.quote ?? V.pickup) : V.configurations, live: inStock > 0 }
      : { label: V.inStockNow, value: inStock, hint: V.ofStores(place.stores.length), live: inStock > 0 },
    { label: V.restocks24h, value: stats.day, hint: V.restocksHint(stats.week, stats.month, stats.days) },
    { label: V.sellOuts(stats.days), value: stats.soldouts, hint: stats.medianMs != null ? V.stays(stats.medianMs) : V.noPairs },
    { label: V.lastRestock, value: lr ? <LiveAgo iso={lr.at} /> : V.noneYet, hint: lr && lrItem ? `${one ? "" : configLabel(lrItem, lang)}${lrStore && !atStore ? `${one ? "" : " · "}${storeLabel(lrStore, lang)}` : ""}` || V.thisConfig : V.inDays(stats.days) },
  ];
  const intlTop = !us && top;
  const h1 = bound ? bound.main.h1 ?? bound.main.title : ib ? ib.title : top ? (us ? `${product.name} pickup stock` : V.h1Country(product.name, c)) : V.h1Place(product.name, where);
  const short = lang === "en" ? c.short : countryLabel(c.cc, lang);
  const photo = ib ? (INTL_PLACE_PHOTOS[c.cc] ?? "phone-map") : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <JsonLd data={loc.native ? { ...productJsonLdFor(product, place, atStore ? line?.available.length ?? 0 : inStock), url: `${BASE}${inLoc(productPath(product, place))}` } : productJsonLdFor(product, place, atStore ? line?.available.length ?? 0 : inStock)} />
      {!atStore && place.stores.length > 1 && (
        <JsonLd data={{ "@context": "https://schema.org", "@type": "ItemList", name: V.itemList(product.name, label), numberOfItems: Math.min(50, lines.length), itemListElement: lines.slice(0, 50).map((l, i) => ({ "@type": "ListItem", position: i + 1, name: lang === "en" ? `${appleName(l.store)}` : appleStoreLabel(l.store, lang), url: `${BASE}${inLoc(productPath(product, storePlace(l.store)))}` })) }} />
      )}
      {chain.length > 1 ? <Breadcrumbs items={chain.map((x, i) => ({ href: i < chain.length - 1 ? productPath(product, x) : undefined, label: placeName(x, lang, true) }))} />
        : intlTop && <Breadcrumbs items={[{ href: prefixOf(c.cc), label: short }, { label: product.name }]} />}

      <h1 className="display mt-2 text-3xl sm:text-5xl">{h1}</h1>
      {copy && facts && <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-2"><Inline text={copy.intro} facts={facts} /></p>}
      {ib && <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-2"><Inline text={D.place.modelIntro(c.cc, product.model, inStock)} facts={emptyFacts(c.cc)} /></p>}
      <p className={`mt-2 items-center gap-2 text-lg text-ink-2 ${copy || ib ? "hidden" : "flex"}`}>
        <Dot state={inStock ? "ok" : "idle"} live={inStock > 0} />
        {atStore
          ? (one ? <b className={inStock ? "text-accent" : "text-ink"}>{inStock ? V.inStockNow : V.notInStockNow}</b> : V.configsInStock(line?.available.length ?? 0, product.parts.length))
          : V.inStockAt(inStock, place.stores.length)}
      </p>
      <p className="mt-0.5 text-sm text-ink-3">{V.checked(<LiveChecked iso={checked} model={product.model} stores={top ? null : place.stores.map((s) => s.storeNumber)} country={us ? undefined : c.cc} />, V.priceLabel(product), !us && c.cc !== "ca" ? ` · ${V.taxNote(c)}` : c.cc === "ca" ? ` · ${V.beforeTax}` : "")}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={placeAlert(product, place)} className="btn btn-primary btn-sm">{C.alertMe}</Link>
        {configItem && !atStore && <a href={appleBuyUrl(configItem, c.cc)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">{V.buyOnApple}</a>}
        <Link href={placePagePath(place)} className="btn btn-ghost btn-sm max-w-full truncate">{top ? (us ? "All stores" : V.allStoresIn(c)) : atStore ? V.everyIphoneHere : V.everyIphone(where)}</Link>
      </div>
      <AlertPanelFor href={placeAlert(product, place)} summary={V.panel(product.name, top ? (us ? null : inCountry) : where)} country={c.cc} />

      {us && top && <div className="mt-5 max-w-3xl"><QuickCheckServer model={product.model} product={product} /></div>}

      <div className="mt-6"><ProductNav facets={facets} place={place} unit={atStore ? V.unitConfigs : V.unitStores} /></div>

      <div className="mt-6"><StatStrip items={stat} cols={4} /></div>

      {atStore ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {one && line && <StatusCard line={line} />}
            <section className="pane p-5">
              <h2 className="text-lg font-semibold">{one ? V.otherConfigsHere : V.byStorageColor}</h2>
              <div className="mt-3"><ProductGrid grid={grid} place={place} current={product} /></div>
            </section>
          </div>
          <aside className="pane p-5">
            <h2 className="text-lg font-semibold">{V.nearestStores}</h2>
            {nearest && <p className="mt-1 text-sm text-ink-2">{V.closest(<Link href={productPath(product, storePlace(nearest.store))} className="font-medium text-accent hover:underline">{storeLabel(nearest.store, lang)}</Link>, dist(nearest.distance))}</p>}
            <div className="mt-2"><PlaceCountList product={product} items={siblings} /></div>
          </aside>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="pane p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">{usNone ? V.mostRecentlyInStock : top ? V.storesWithItNow : V.storesIn(where)}</h2>
              <span className="text-xs text-ink-3">{one ? V.colStatus : V.colConfigs}</span>
            </div>
            {nearest && inStock === 0 && <p className="mt-1 text-sm text-ink-2">{V.closest(<Link href={productPath(product, storePlace(nearest.store))} className="font-medium text-accent hover:underline">{V.storeCity(storeLabel(nearest.store, lang), cityLabel(c.cc, nearest.store.city, lang))}</Link>, dist(nearest.distance))}</p>}
            <div className="mt-2"><ProductStoreList product={product} lines={shownLines} showCity={place.level !== "city"} emptyText={top ? V.noStoreHasIt : V.noStoreHereHasIt} /></div>
            {top && !usNone && inStock > shownLines.length && <p className="mt-3 text-sm text-ink-3">{V.moreStores(inStock - shownLines.length)}</p>}
          </section>
          <aside className="space-y-6">
            <section className="pane p-5">
              <h2 className="text-lg font-semibold">{V.byStorageColor}</h2>
              <div className="mt-3"><ProductGrid grid={grid} place={place} current={product} /></div>
            </section>
            {children.length > 0 && (
              <section className="pane p-5">
                <h2 className="text-lg font-semibold">{top ? (us ? "By state" : V.byRegion(c)) : V.byCity}</h2>
                <div className="mt-2"><PlaceCountList product={product} items={children} /></div>
              </section>
            )}
            {place.level === "city" && siblings.length > 0 && (
              <section className="pane p-5">
                <h2 className="text-lg font-semibold">{V.nearbyStores}</h2>
                <div className="mt-2"><PlaceCountList product={product} items={siblings} /></div>
              </section>
            )}
          </aside>
        </div>
      )}

      {facts && sections.length > 0 && (
        <div className="mx-auto mt-8 max-w-3xl">
          {copy?.photos[0] && <Figure id={copy.photos[0]} />}
          <KeywordSections sections={sections} facts={facts} model={product.model} />
        </div>
      )}
      {intlSections.length > 0 && (
        <div className="mx-auto mt-8 max-w-3xl">
          {photo && <Figure id={photo} />}
          <KeywordSections sections={intlSections} facts={emptyFacts(c.cc)} />
          <Figure id={product.model === "duo" ? "foldable-hands" : "apple-store-pickup-counter"} />
        </div>
      )}
      {us && top && !copy && (
        <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
          {(product.model === "duo" ? ["foldable-hands", "apple-store-pickup-counter"] : ["phone-hand-camera", "apple-store-pickup-counter"]).map((id) => <Figure key={id} id={id} className="my-0" />)}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="min-w-0">
          <h2 className="text-lg font-semibold">{V.latestChanges}</h2>
          <RestockFeed rows={feed} showModel={product.kind === "model"} emptyText={V.nothingLogged} />
        </section>
        <section className="pane p-5">
          <h2 className="text-lg font-semibold">{V.whenRestocks}</h2>
          <div className="mt-3"><RestockClock stats={clock} label={label} reports={reports} /></div>
        </section>
        <section className="pane p-5">
          <h2 className="text-lg font-semibold">{V.howFast}</h2>
          <div className="mt-3"><SellOutTimes data={sell} label={label} showStore={place.stores.length > 1} /></div>
        </section>
        {stats.month > 0 && (
          <section className="pane p-5">
            <h2 className="text-lg font-semibold">{C.lastDays(stats.days)}</h2>
            <div className="mt-3"><DailyBars stats={stats} label={label} /></div>
          </section>
        )}
        {stats.month > 0 && !one && (
          <section className="pane p-5">
            <h2 className="text-lg font-semibold">{V.restocksByConfig}</h2>
            <div className="mt-3"><RestocksByConfig stats={stats} label={label} store={place.store?.storeNumber} country={us ? undefined : c.cc} /></div>
          </section>
        )}
      </div>

      {copy && facts ? (
        <div className="mx-auto mt-8 max-w-3xl space-y-8">
          <RichFaq items={[...faq, ...copy.faq]} facts={facts} title={`${product.name} FAQ`} />
          <SourceList sources={copy.sources} facts={facts} />
        </div>
      ) : ib ? (
        <div className="mx-auto mt-8 max-w-3xl space-y-8">
          <RichFaq items={[...faq, ...intlFaq].slice(0, loc.native ? 5 : undefined)} facts={emptyFacts(c.cc)} title={V.faqTitleCountry(product.name, c)} />
          <SourceList sources={[c.cc === "us" ? pickupHelp(c.cc) : dictT().place.sources(c.cc).pickupHelp, { label: V.buySource(product.name, c), url: appleBuyUrl({ model: product.name, storage: "256GB", color: "" }, c.cc) }, c.cc === "us" ? TAX_SOURCES[c.cc as Exclude<typeof c.cc, "us">] : dictT().place.sources(c.cc).tax]} facts={emptyFacts(c.cc)} where={C.sourcesWhere(place.stores.length, c)} since={C.since} />
        </div>
      ) : (
        <div className="mt-6"><Faq items={faq} title={V.faqTitle(bidi(product.short, lang), label)} /></div>
      )}

      <RelatedBlock title={V.nearby}>
        {place.level === "state" && siblings.length > 0 && <LinkRow title={us ? "Neighboring states" : V.otherRegions(c)} links={siblings.map((s) => ({ href: productPath(product, s.place), label: placeName(s.place, lang), meta: `${s.inStock}/${s.stores}` }))} />}
        {(place.level === "city" || place.level === "store") && place.state && t.regionPlace(place.state) && (
          <LinkRow title={V.elsewhereIn(regionLabel(c.cc, place.state, lang))} links={[t.regionPlace(place.state)!, ...(place.level === "store" && place.city ? [t.cityPlace(place.state, place.city)].filter((x): x is Place => Boolean(x)) : [])].map((x) => ({ href: productPath(product, x), label: placeName(x, lang) }))} />
        )}
        <LinkRow title={C.more} links={[
          { href: placePagePath(place), label: top ? (us ? "Every Apple Store" : V.everyAppleStoreIn(c)) : V.everyIphone(where) },
          { href: `${restocksPath(c.cc)}?model=${product.model}`, label: C.restockLog },
          { href: `${mapPath(c.cc)}?model=${product.model}${place.store ? `&store=${place.store.storeNumber}` : ""}`, label: C.liveMap },
          ...(top ? [] : [{ href: productPath(product, t.root), label: V.across(bidi(product.short, lang), c) }]),
          ...(intlTop ? [{ href: prefixOf(c.cc), label: C.checker(c) }, ...(placeTarget(c.cc)?.indexable ? [{ href: storesIndexPath(c.cc), label: C.appleStoresIn(c) }] : [])] : []),
          // Native versions only (English pages keep their links): the Duo page leads to the restock-times page.
          ...(intlTop && loc.native && product.model === "duo" ? [{ href: `${prefixOf(c.cc)}/iphone-duo-restock-times`, label: dictT().place.home.restockTimesChip }] : []),
        ]} />
      </RelatedBlock>
    </div>
  );
}

/** The two keyword sections of another country's model page: where it is now (nearest first, by region), and its price. */
function modelSections(c: Country, product: Product, lines: ReturnType<typeof storeLines>, inStock: number, nearH2: string, lang: Lang, D: Dict, countryName: string): KeywordSection[] {
  const V = D.views.product;
  const have = lines.filter((l) => l.available.length > 0);
  const n = lines.length;
  const byRegion = new Map<string, number>();
  for (const l of have) byRegion.set(l.store.state, (byRegion.get(l.store.state) ?? 0) + 1);
  const regions = [...byRegion.entries()].sort((a, b) => b[1] - a[1]);
  const lead = V.nearLead(c, product.name, inStock, n, have.map((l) => ({ store: lang === "en" ? appleName(l.store) : appleStoreLabel(l.store, lang), city: cityLabel(c.cc, l.store.city, lang), configs: l.available.length })));
  const blocks: KeywordSection["blocks"] = [];
  if (regions.length > 1 && c.regionNoun) blocks.push({ t: "table", head: V.nearHead(c), rows: regions.map(([r, k]) => [regionLabel(c.cc, r, lang), String(k)]), caption: V.nearCaption(c, product.name) });
  blocks.push({ t: "p", text: V.nearMe(c, product.name, alertHref({ model: product.model, country: c.cc })) });
  return [
    { id: "near-me", h2: nearH2, lead, blocks },
    D.place.priceSection(c.cc, countryName, undefined, product.model),
  ];
}

/** Two more questions for another country's model page, around the tax one: the price and whether it can be reserved. */
function modelFaq(c: Country, product: Product, inStock: number, D: Dict, countryName: string): { q: string; a: string }[] {
  const r = priceRange(c.cc, product.model);
  const f = D.views.product.modelFaq(c, product.name, r.low, r.high, inStock);
  return [f.price, D.place.taxFaq(c.cc, countryName), f.reserve];
}
