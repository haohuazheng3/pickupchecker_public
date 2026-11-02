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
import { COUNTRIES, prefixOf, theName, type Country } from "@/lib/apple/countries";
import { inPlace, isIndexedProductPage, productPath, storePlace, type Place, type Product } from "@/lib/seo/products";
import { treeOf } from "@/lib/seo/tree";
import { childPlaces, configGrid, facetsFor, indexStock, lastChecked, nearestWithStock, siblingPlaces, storeLines } from "@/lib/seo/productData";
import { priceLabel, productDescription, productFaq, productJsonLdFor, productTitle } from "@/lib/seo/productCopy";
import { modelDescription, modelIntro, modelPageTitles, priceSection, priceRange, taxFaqIntl } from "@/lib/seo/countryCopy";
import { alertHref, distText, fmtDuration, listWords, plural } from "@/lib/seo/enrich";
import { modelStock, placeStats, restockFeed, restockStats } from "@/lib/stock/queries";
import { Breadcrumbs, LinkRow, RelatedBlock } from "@/components/seo/Related";
import { JsonLd } from "@/components/seo/JsonLd";
import { StatStrip, type Stat } from "@/components/seo/StatStrip";
import { Faq } from "@/components/seo/Faq";
import { PlaceCountList, ProductGrid, ProductNav, ProductStoreList, StatusCard } from "@/components/seo/ProductParts";
import { RestockFeed } from "@/components/restocks/RestockFeed";
import { RestockClock } from "@/components/restocks/RestockClock";
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
import { hreflangFor, INTL_TRACKING_LABEL } from "./shared";

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
  const [duo, pro, max, stats, clock, feed] = await Promise.all([
    modelStock("duo", cc),
    modelStock("18-pro", cc),
    modelStock("18-pro-max", cc),
    placeStats({ storeNumbers: numbers, parts: product.parts, tz: place.tz, country: cc }),
    restockStats(numbers, place.tz, 30, undefined, product.parts, cc),
    restockFeed({ parts: product.parts, storeNumbers: numbers, kind: "all", limit: 8, country: cc }),
  ]);
  const ix = indexStock({ duo, "18-pro": pro, "18-pro-max": max });
  const lines = storeLines(ix, product, place.stores);
  const inStock = lines.filter((l) => l.available.length > 0).length;
  // Index scope (seo.md §10, §12): the national page of a model (US: also a storage size or a color). Every
  // place-level product page and every exact configuration is noindex, follow: the /stores page of that place
  // is the one indexed page for "iPhone Duo in <place>", which keeps near-duplicates out of the index.
  const indexable = isIndexedProductPage(product, place);
  return { kind: "page" as const, product, place, ix, lines, inStock, stats, clock, feed, indexable };
});

/** Another country's model page binds its own titles (seo.md §12). */
function intlBound(c: Country, product: Product, place: Place) {
  return c.cc !== "us" && place.level === "country" && product.kind === "model" ? modelPageTitles(c.cc, product.model) : undefined;
}

export async function productMetadata(c: Country, p: ProductParams): Promise<Metadata> {
  const { product: slug, place: segments = [] } = p;
  const d = await load(c.cc, slug, segments.join("/"));
  if (!d || d.kind === "redirect") return {};
  const t = treeOf(c.cc);
  const inStock = d.place.level === "store" ? d.lines[0]?.available.length ?? 0 : d.inStock;
  const bound = c.cc === "us" && d.place.level === "country" ? PRODUCT_TITLES[d.product.slug] : undefined;
  const ib = intlBound(c, d.product, d.place);
  const title = bound?.main.title ?? ib?.title ?? productTitle(d.product, d.place, inStock);
  const description = bound?.description ?? (ib ? modelDescription(c.cc, d.product.model, inStock) : productDescription(d.product, d.place, inStock, d.stats));
  const url = productPath(d.product, d.place);
  const canonical = productPath(d.product, t.canonicalPlace(d.place));
  // The three model pages are the same page in every country (hreflang, x-default = the US one).
  const languages = d.place.level === "country" && d.product.kind === "model" ? hreflangFor({ model: d.product.slug }) : undefined;
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
  const { product, place, ix, lines, inStock, stats, clock, feed } = d;
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
  const dist = (miles: number) => (us ? `${Math.round(miles)} mi` : distText(miles, c.cc));
  // The whole country: the stores that have it, or — when none do — the ones that had it most recently.
  const usNone = top && inStock === 0;
  const shownLines = !top ? lines : usNone ? lines.filter((l) => l.lastAvailableAt).slice(0, 12) : lines.filter((l) => l.available.length > 0).slice(0, 40);
  const faq = productFaq(product, place, lines, stats, clock, nearest ? { name: nearest.store.name, city: nearest.store.city, distance: nearest.distance } : null);
  // Keyword-bound national pages (seo.md §3): entry titles, an Answer-First intro, one section per secondary keyword.
  const bound = us && top ? PRODUCT_TITLES[product.slug] : undefined;
  const copy = bound ? PRODUCT_COPY[product.slug] : undefined;
  const facts = us && top ? await getFacts() : null;
  const sections = bound && copy ? bound.h2.map((h) => ({ id: slugId(h.keyword), h2: h.title, ...(copy.sections[h.keyword] ?? { lead: "", blocks: [] }) })).filter((x) => x.lead) : [];
  // Another country's model page: its own titles, an Answer-First intro and two keyword sections (seo.md §12).
  const ib = intlBound(c, product, place);
  const intlSections: KeywordSection[] = ib ? modelSections(c, product, lines, inStock, ib.h2[0]) : [];
  const intlFaq = ib ? modelFaq(c, product, inStock) : [];
  const countryWord = us ? "the US" : theName(c);

  const stat: Stat[] = [
    atStore
      ? { label: "In stock now", value: one ? (inStock ? "Yes" : "No") : `${line?.available.length ?? 0}/${product.parts.length}`, hint: one ? (line?.status?.quote ?? "pickup") : "configurations", live: inStock > 0 }
      : { label: "In stock now", value: inStock, hint: `of ${place.stores.length} store${place.stores.length === 1 ? "" : "s"}`, live: inStock > 0 },
    { label: "Restocks 24 h", value: stats.day, hint: `${stats.week} in 7 d · ${stats.month} in ${stats.days} d` },
    { label: `Sell-outs ${stats.days} d`, value: stats.soldouts, hint: stats.medianMs != null ? `stays ~${fmtDuration(stats.medianMs)}` : "no pairs yet" },
    { label: "Last restock", value: lr ? <LiveAgo iso={lr.at} /> : "none yet", hint: lr && lrItem ? `${one ? "" : `${lrItem.storage} ${lrItem.color}`}${lrStore && !atStore ? `${one ? "" : " · "}${lrStore.name}` : ""}` || "this configuration" : `in ${stats.days} days` },
  ];
  const intlTop = !us && top;
  const h1 = bound ? bound.main.h1 ?? bound.main.title : ib ? ib.title : top ? (us ? `${product.name} pickup stock` : `${product.name} pickup stock ${c.inName}`) : `${product.name} ${inPlace(place)}`;
  const photo = ib ? (INTL_PLACE_PHOTOS[c.cc] ?? "phone-map") : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <JsonLd data={productJsonLdFor(product, place, atStore ? line?.available.length ?? 0 : inStock)} />
      {!atStore && place.stores.length > 1 && (
        <JsonLd data={{ "@context": "https://schema.org", "@type": "ItemList", name: `${product.name} ${top && !us ? c.inName : inPlace(place)}`, numberOfItems: Math.min(50, lines.length), itemListElement: lines.slice(0, 50).map((l, i) => ({ "@type": "ListItem", position: i + 1, name: `${appleName(l.store)}`, url: `${BASE}${productPath(product, storePlace(l.store))}` })) }} />
      )}
      {chain.length > 1 ? <Breadcrumbs items={chain.map((x, i) => ({ href: i < chain.length - 1 ? productPath(product, x) : undefined, label: x.label }))} />
        : intlTop && <Breadcrumbs items={[{ href: prefixOf(c.cc), label: c.short }, { label: product.name }]} />}

      <h1 className="display mt-2 text-3xl sm:text-5xl">{h1}</h1>
      {copy && facts && <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-2"><Inline text={copy.intro} facts={facts} /></p>}
      {ib && <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-2"><Inline text={modelIntro(c.cc, product.model, inStock)} facts={emptyFacts(c.cc)} /></p>}
      <p className={`mt-2 items-center gap-2 text-lg text-ink-2 ${copy || ib ? "hidden" : "flex"}`}>
        <Dot state={inStock ? "ok" : "idle"} live={inStock > 0} />
        {atStore
          ? (one ? <b className={inStock ? "text-accent" : "text-ink"}>{inStock ? "In stock now" : "Not in stock now"}</b> : <span><b className="text-ink">{line?.available.length ?? 0}</b> of {product.parts.length} configurations in stock</span>)
          : <span>In stock at <b className="text-ink">{inStock}</b> of {place.stores.length} store{place.stores.length === 1 ? "" : "s"}</span>}
      </p>
      <p className="mt-0.5 text-sm text-ink-3">Checked <LiveChecked iso={checked} model={product.model} stores={top ? null : place.stores.map((s) => s.storeNumber)} country={us ? undefined : c.cc} /> · {priceLabel(product)}{!us && c.cc !== "ca" ? ` · ${c.taxNote}` : c.cc === "ca" ? " · before tax" : ""}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={placeAlert(product, place)} className="btn btn-primary btn-sm">Alert me</Link>
        {configItem && !atStore && <a href={appleBuyUrl(configItem, c.cc)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">Buy on apple.com</a>}
        <Link href={placePagePath(place)} className="btn btn-ghost btn-sm max-w-full truncate">{top ? (us ? "All stores" : `All stores ${c.inName}`) : atStore ? "Every iPhone here" : `Every iPhone ${inPlace(place)}`}</Link>
      </div>
      <AlertPanelFor href={placeAlert(product, place)} summary={`For ${product.name}${top ? (us ? "" : ` ${c.inName}`) : ` ${inPlace(place)}`}: tick the configurations and stores`} country={c.cc} />

      {us && top && <div className="mt-5 max-w-3xl"><QuickCheckServer model={product.model} product={product} /></div>}

      <div className="mt-6"><ProductNav facets={facets} place={place} unit={atStore ? "configurations" : "stores"} /></div>

      <div className="mt-6"><StatStrip items={stat} cols={4} /></div>

      {atStore ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {one && line && <StatusCard line={line} />}
            <section className="pane p-5">
              <h2 className="text-lg font-semibold">{one ? "Other configurations here" : "By storage and color"}</h2>
              <div className="mt-3"><ProductGrid grid={grid} place={place} current={product} /></div>
            </section>
          </div>
          <aside className="pane p-5">
            <h2 className="text-lg font-semibold">Nearest stores</h2>
            {nearest && <p className="mt-1 text-sm text-ink-2">Closest with it now: <Link href={productPath(product, storePlace(nearest.store))} className="font-medium text-accent hover:underline">{nearest.store.name}</Link> · {dist(nearest.distance)}</p>}
            <div className="mt-2"><PlaceCountList product={product} items={siblings} /></div>
          </aside>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="pane p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">{usNone ? "Most recently in stock" : top ? "Stores with it now" : `Stores ${inPlace(place)}`}</h2>
              <span className="text-xs text-ink-3">{one ? "status" : "configs in stock"}</span>
            </div>
            {nearest && inStock === 0 && <p className="mt-1 text-sm text-ink-2">Closest with it now: <Link href={productPath(product, storePlace(nearest.store))} className="font-medium text-accent hover:underline">{nearest.store.name}, {nearest.store.city}</Link> · {dist(nearest.distance)}</p>}
            <div className="mt-2"><ProductStoreList product={product} lines={shownLines} showCity={place.level !== "city"} emptyText={top ? "No store has it right now." : "No store here has it right now."} /></div>
            {top && !usNone && inStock > shownLines.length && <p className="mt-3 text-sm text-ink-3">+{inStock - shownLines.length} more stores — see them by state.</p>}
          </section>
          <aside className="space-y-6">
            <section className="pane p-5">
              <h2 className="text-lg font-semibold">By storage and color</h2>
              <div className="mt-3"><ProductGrid grid={grid} place={place} current={product} /></div>
            </section>
            {children.length > 0 && (
              <section className="pane p-5">
                <h2 className="text-lg font-semibold">{top ? (us ? "By state" : `By ${c.regionNoun ?? "area"}`) : "By city"}</h2>
                <div className="mt-2"><PlaceCountList product={product} items={children} /></div>
              </section>
            )}
            {place.level === "city" && siblings.length > 0 && (
              <section className="pane p-5">
                <h2 className="text-lg font-semibold">Nearby stores</h2>
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
          <h2 className="text-lg font-semibold">Latest changes</h2>
          <RestockFeed rows={feed} showModel={product.kind === "model"} emptyText="Nothing logged yet." />
        </section>
        <section className="pane p-5">
          <h2 className="text-lg font-semibold">When it restocks</h2>
          <div className="mt-3"><RestockClock stats={clock} label={top && !us ? c.inName : inPlace(place)} /></div>
        </section>
        {stats.month > 0 && (
          <section className="pane p-5">
            <h2 className="text-lg font-semibold">Last {stats.days} days</h2>
            <div className="mt-3"><DailyBars stats={stats} label={top && !us ? c.inName : inPlace(place)} /></div>
          </section>
        )}
        {stats.month > 0 && !one && (
          <section className="pane p-5">
            <h2 className="text-lg font-semibold">Restocks by configuration</h2>
            <div className="mt-3"><RestocksByConfig stats={stats} label={top && !us ? c.inName : inPlace(place)} store={place.store?.storeNumber} country={us ? undefined : c.cc} /></div>
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
          <RichFaq items={[...faq, ...intlFaq]} facts={emptyFacts(c.cc)} title={`${product.name} ${c.inName}: FAQ`} />
          <SourceList sources={[pickupHelp(c.cc), { label: `Apple: Buy ${product.name} (${c.short})`, url: appleBuyUrl({ model: product.name, storage: "256GB", color: "" }, c.cc) }, TAX_SOURCES[c.cc as Exclude<typeof c.cc, "us">]]} facts={emptyFacts(c.cc)} where={`${place.stores.length === 1 ? "the Apple Store" : `all ${place.stores.length} Apple Stores`} ${c.inName}`} since={INTL_TRACKING_LABEL} />
        </div>
      ) : (
        <div className="mt-6"><Faq items={faq} title={`${product.short} ${top && !us ? c.inName : inPlace(place)}`} /></div>
      )}

      <RelatedBlock title="Nearby">
        {place.level === "state" && siblings.length > 0 && <LinkRow title={us ? "Neighboring states" : `Other ${c.regionNounPlural ?? "areas"}`} links={siblings.map((s) => ({ href: productPath(product, s.place), label: s.place.name, meta: `${s.inStock}/${s.stores}` }))} />}
        {(place.level === "city" || place.level === "store") && place.state && t.regionPlace(place.state) && (
          <LinkRow title={`Elsewhere in ${place.state}`} links={[t.regionPlace(place.state)!, ...(place.level === "store" && place.city ? [t.cityPlace(place.state, place.city)].filter((x): x is Place => Boolean(x)) : [])].map((x) => ({ href: productPath(product, x), label: x.name }))} />
        )}
        <LinkRow title="More" links={[
          { href: placePagePath(place), label: top ? (us ? "Every Apple Store" : `Every Apple Store ${c.inName}`) : `Every iPhone ${inPlace(place)}` },
          { href: `${restocksPath(c.cc)}?model=${product.model}`, label: "Restock log" },
          { href: `${mapPath(c.cc)}?model=${product.model}${place.store ? `&store=${place.store.storeNumber}` : ""}`, label: "Live map" },
          ...(top ? [] : [{ href: productPath(product, t.root), label: `${product.short} across ${countryWord}` }]),
          ...(intlTop ? [{ href: prefixOf(c.cc), label: `iPhone stock checker ${c.short}` }, ...(placeTarget(c.cc)?.indexable ? [{ href: storesIndexPath(c.cc), label: `Apple Stores ${c.inName}` }] : [])] : []),
        ]} />
      </RelatedBlock>
    </div>
  );
}

/** The two keyword sections of another country's model page: where it is now (nearest first, by region), and its price. */
function modelSections(c: Country, product: Product, lines: ReturnType<typeof storeLines>, inStock: number, nearH2: string): KeywordSection[] {
  const have = lines.filter((l) => l.available.length > 0);
  const n = lines.length;
  const byRegion = new Map<string, number>();
  for (const l of have) byRegion.set(l.store.state, (byRegion.get(l.store.state) ?? 0) + 1);
  const regions = [...byRegion.entries()].sort((a, b) => b[1] - a[1]);
  const lead = inStock === 0
    ? `No Apple Store ${c.inName} lists the ${product.name} for pickup right now, so "near me" is a question of which store restocks first. Set an alert at the stores you can reach and the push arrives seconds after one lists it.`
    : `${plural(inStock, "store")} of ${n} ${inStock === 1 ? "has" : "have"} the ${product.name} right now: ${listWords(have.slice(0, 5).map((l) => `${appleName(l.store)} in ${l.store.city} (${l.available.length} config${l.available.length === 1 ? "" : "s"})`), 5)}.`;
  const blocks: KeywordSection["blocks"] = [];
  if (regions.length > 1 && c.regionNoun) blocks.push({ t: "table", head: [c.regionNoun[0].toUpperCase() + c.regionNoun.slice(1), "Stores with it now"], rows: regions.map(([r, k]) => [r, String(k)]), caption: `${product.name} pickup stock by ${c.regionNoun}, at the last check` });
  blocks.push({ t: "p", text: `To rank every store from where you are, open the alert setup on this page and tap Near me: distances are by road in ${c.unit === "mi" ? "miles" : "kilometres"}, estimated, and each store links to directions. [Set a ${product.name} alert](${alertHref({ model: product.model, country: c.cc })}).` });
  return [
    { id: "near-me", h2: nearH2, lead, blocks },
    priceSection(c.cc, theName(c), undefined, product.model),
  ];
}

/** Two more questions for another country's model page: the price and whether it can be reserved. */
function modelFaq(c: Country, product: Product, inStock: number): { q: string; a: string }[] {
  const r = priceRange(c.cc, product.model);
  const money = (v: number) => new Intl.NumberFormat(c.priceLocale ?? c.locale, { style: "currency", currency: c.currency, maximumFractionDigits: 0 }).format(v);
  const tax = taxFaqIntl(c.cc, theName(c));
  return [
    { q: `How much is the ${product.name} ${c.inName}?`, a: `From ${money(r.low)} to ${money(r.high)} on apple.com (${COUNTRIES[c.cc].taxNote}), depending on storage.` },
    tax,
    { q: `Can I reserve the ${product.name} for pickup ${c.inName}?`, a: `No; once a store lists a configuration you buy it on apple.com with in-store pickup selected, and it is held for your time slot.${inStock === 0 ? " Right now no store lists it, so an alert is the way to be first." : ""}` },
  ];
}
