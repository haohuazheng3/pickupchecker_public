import type { Metadata } from "next";
import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { PART_INDEX, STORE_INDEX, appleBuyUrl, cityPath, statePath, storePath, appleName } from "@/lib/apple/catalog";
import { canonicalPlace, cityPlace, inPlace, isIndexedProductPage, placeChain, productBySlug, productPath, resolvePlace, storePlace, statePlace, type Place, type Product } from "@/lib/seo/products";
import { childPlaces, configGrid, facetsFor, indexStock, lastChecked, nearestWithStock, siblingPlaces, storeLines } from "@/lib/seo/productData";
import { priceLabel, productDescription, productFaq, productJsonLdFor, productTitle } from "@/lib/seo/productCopy";
import { alertHref, fmtDuration } from "@/lib/seo/enrich";
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
import { getFacts } from "@/lib/content/facts";
import { Inline } from "@/components/content/Inline";
import { Figure } from "@/components/content/Figure";
import { QuickCheckServer } from "@/components/content/QuickCheckServer";
import { KeywordSections, slugId } from "@/components/content/KeywordSections";
import { RichFaq, SourceList } from "@/components/content/RichFaq";

export const dynamic = "force-dynamic";

const INDEXABLE = process.env.NEXT_PUBLIC_INDEXABLE === "1";
const BASE = "https://pickupchecker.com";

/**
 * One page per product × place. Reads: three cached status reads (one per model, shared by every
 * page), the cached place statistics, the restock-hour histogram and the latest changes.
 */
// Keyed by strings: React's cache compares arguments by identity, and the page and its metadata get different arrays.
const load = cache(async (slug: string, path: string) => {
  const product = productBySlug(slug);
  if (!product) return null;
  const place = resolvePlace(path ? path.split("/") : []);
  if (!place) return null;
  if ("redirect" in place) return { kind: "redirect" as const, to: productPath(product, { segments: place.redirect }) };
  const numbers = place.stores.map((s) => s.storeNumber);
  const [duo, pro, max, stats, clock, feed] = await Promise.all([
    modelStock("duo"),
    modelStock("18-pro"),
    modelStock("18-pro-max"),
    placeStats({ storeNumbers: numbers, parts: product.parts, tz: place.tz }),
    restockStats(numbers, place.tz, 30, undefined, product.parts),
    restockFeed({ parts: product.parts, storeNumbers: numbers, kind: "all", limit: 8 }),
  ]);
  const ix = indexStock({ duo, "18-pro": pro, "18-pro-max": max });
  const lines = storeLines(ix, product, place.stores);
  const inStock = lines.filter((l) => l.available.length > 0).length;
  // Index scope (seo.md §10): the national page of a model, a storage size or a color. Every place-level product
  // page and every exact configuration is noindex, follow: the /stores page of that place is the one indexed page
  // for "iPhone Duo in <place>", which keeps near-duplicates out of the index.
  const indexable = isIndexedProductPage(product, place);
  return { kind: "page" as const, product, place, ix, lines, inStock, stats, clock, feed, indexable };
});

type Params = { product: string; place?: string[] };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { product: slug, place: segments = [] } = await params;
  const d = await load(slug, segments.join("/"));
  if (!d || d.kind === "redirect") return {};
  const inStock = d.place.level === "store" ? d.lines[0]?.available.length ?? 0 : d.inStock;
  const bound = d.place.level === "us" ? PRODUCT_TITLES[d.product.slug] : undefined;
  const title = bound?.main.title ?? productTitle(d.product, d.place, inStock);
  const description = bound?.description ?? productDescription(d.product, d.place, inStock, d.stats);
  const url = productPath(d.product, d.place);
  const canonical = productPath(d.product, canonicalPlace(d.place));
  return {
    title, description, alternates: { canonical },
    ...(INDEXABLE && !d.indexable ? { robots: { index: false, follow: true } } : {}),
    openGraph: { type: "website", siteName: "PickupChecker", title, description, url },
  };
}

/** The all-models page for the same place. */
function placePagePath(place: Place): string {
  if (place.level === "us") return "/stores";
  if (place.level === "state") return statePath(place.state!);
  if (place.level === "city") return cityPath(place.state!, place.city!);
  return storePath(place.store!);
}

function placeAlert(product: Product, place: Place): string {
  return alertHref({ model: product.model, storage: product.storage, color: product.color, store: place.store?.storeNumber, state: place.level === "state" || place.level === "city" ? place.stateSlug : undefined, city: place.level === "city" ? place.citySlug : undefined });
}

export default async function ProductPlacePage({ params }: { params: Promise<Params> }) {
  const { product: slug, place: segments = [] } = await params;
  const d = await load(slug, segments.join("/"));
  if (!d) notFound();
  if (d.kind === "redirect") permanentRedirect(d.to);
  const { product, place, ix, lines, inStock, stats, clock, feed } = d;
  const atStore = place.level === "store";
  const line = lines[0];
  const chain = placeChain(place);
  const facets = facetsFor(ix, product, place);
  const grid = configGrid(ix, product, place);
  const children = childPlaces(ix, product, place);
  const siblings = siblingPlaces(ix, product, place, atStore ? 8 : 6);
  const nearest = inStock === 0 || (atStore && (line?.available.length ?? 0) === 0) ? nearestWithStock(ix, product, place) : null;
  const checked = lastChecked(lines);
  const one = product.parts.length === 1;
  const configItem = one ? PART_INDEX.get(product.parts[0]) : undefined;
  const lr = stats.lastRestock;
  const lrItem = lr ? PART_INDEX.get(lr.partNumber) : undefined;
  const lrStore = lr ? STORE_INDEX.get(lr.storeNumber) : undefined;
  // The whole country: the stores that have it, or — when none do — the ones that had it most recently.
  const usNone = place.level === "us" && inStock === 0;
  const shownLines = place.level !== "us" ? lines : usNone ? lines.filter((l) => l.lastAvailableAt).slice(0, 12) : lines.filter((l) => l.available.length > 0).slice(0, 40);
  const faq = productFaq(product, place, lines, stats, clock, nearest ? { name: nearest.store.name, city: nearest.store.city, distance: nearest.distance } : null);
  // Keyword-bound national pages (seo.md §3): entry titles, an Answer-First intro, one section per secondary keyword.
  const bound = place.level === "us" ? PRODUCT_TITLES[product.slug] : undefined;
  const copy = bound ? PRODUCT_COPY[product.slug] : undefined;
  const facts = place.level === "us" ? await getFacts() : null;
  const sections = bound && copy ? bound.h2.map((h) => ({ id: slugId(h.keyword), h2: h.title, ...(copy.sections[h.keyword] ?? { lead: "", blocks: [] }) })).filter((x) => x.lead) : [];

  const stat: Stat[] = [
    atStore
      ? { label: "In stock now", value: one ? (inStock ? "Yes" : "No") : `${line?.available.length ?? 0}/${product.parts.length}`, hint: one ? (line?.status?.quote ?? "pickup") : "configurations", live: inStock > 0 }
      : { label: "In stock now", value: inStock, hint: `of ${place.stores.length} store${place.stores.length === 1 ? "" : "s"}`, live: inStock > 0 },
    { label: "Restocks 24 h", value: stats.day, hint: `${stats.week} in 7 d · ${stats.month} in ${stats.days} d` },
    { label: `Sell-outs ${stats.days} d`, value: stats.soldouts, hint: stats.medianMs != null ? `stays ~${fmtDuration(stats.medianMs)}` : "no pairs yet" },
    { label: "Last restock", value: lr ? <LiveAgo iso={lr.at} /> : "none yet", hint: lr && lrItem ? `${one ? "" : `${lrItem.storage} ${lrItem.color}`}${lrStore && !atStore ? `${one ? "" : " · "}${lrStore.name}` : ""}` || "this configuration" : `in ${stats.days} days` },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <JsonLd data={productJsonLdFor(product, place, atStore ? line?.available.length ?? 0 : inStock)} />
      {!atStore && place.stores.length > 1 && (
        <JsonLd data={{ "@context": "https://schema.org", "@type": "ItemList", name: `${product.name} ${inPlace(place)}`, numberOfItems: Math.min(50, lines.length), itemListElement: lines.slice(0, 50).map((l, i) => ({ "@type": "ListItem", position: i + 1, name: `${appleName(l.store)}`, url: `${BASE}${productPath(product, storePlace(l.store))}` })) }} />
      )}
      {chain.length > 1 && <Breadcrumbs items={chain.map((p, i) => ({ href: i < chain.length - 1 ? productPath(product, p) : undefined, label: p.label }))} />}

      <h1 className="display mt-2 text-3xl sm:text-5xl">{bound ? bound.main.h1 ?? bound.main.title : place.level === "us" ? `${product.name} pickup stock` : `${product.name} ${inPlace(place)}`}</h1>
      {copy && facts && <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-2"><Inline text={copy.intro} facts={facts} /></p>}
      <p className={`mt-2 items-center gap-2 text-lg text-ink-2 ${copy ? "hidden" : "flex"}`}>
        <Dot state={inStock ? "ok" : "idle"} live={inStock > 0} />
        {atStore
          ? (one ? <b className={inStock ? "text-accent" : "text-ink"}>{inStock ? "In stock now" : "Not in stock now"}</b> : <span><b className="text-ink">{line?.available.length ?? 0}</b> of {product.parts.length} configurations in stock</span>)
          : <span>In stock at <b className="text-ink">{inStock}</b> of {place.stores.length} store{place.stores.length === 1 ? "" : "s"}</span>}
      </p>
      <p className="mt-0.5 text-sm text-ink-3">Checked <LiveAgo iso={checked} /> · {priceLabel(product)}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={placeAlert(product, place)} className="btn btn-primary btn-sm">Alert me</Link>
        {configItem && !atStore && <a href={appleBuyUrl(configItem)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">Buy on apple.com</a>}
        <Link href={placePagePath(place)} className="btn btn-ghost btn-sm max-w-full truncate">{place.level === "us" ? "All stores" : atStore ? "Every iPhone here" : `Every iPhone ${inPlace(place)}`}</Link>
      </div>

      {place.level === "us" && <div className="mt-5 max-w-3xl"><QuickCheckServer model={product.model} product={product} /></div>}

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
            {nearest && <p className="mt-1 text-sm text-ink-2">Closest with it now: <Link href={productPath(product, storePlace(nearest.store))} className="font-medium text-accent hover:underline">{nearest.store.name}</Link> · {Math.round(nearest.distance)} mi</p>}
            <div className="mt-2"><PlaceCountList product={product} items={siblings} /></div>
          </aside>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="pane p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">{usNone ? "Most recently in stock" : place.level === "us" ? "Stores with it now" : `Stores ${inPlace(place)}`}</h2>
              <span className="text-xs text-ink-3">{one ? "status" : "configs in stock"}</span>
            </div>
            {nearest && inStock === 0 && <p className="mt-1 text-sm text-ink-2">Closest with it now: <Link href={productPath(product, storePlace(nearest.store))} className="font-medium text-accent hover:underline">{nearest.store.name}, {nearest.store.city}</Link> · {Math.round(nearest.distance)} mi</p>}
            <div className="mt-2"><ProductStoreList product={product} lines={shownLines} showCity={place.level !== "city"} emptyText={place.level === "us" ? "No store has it right now." : "No store here has it right now."} /></div>
            {place.level === "us" && !usNone && inStock > shownLines.length && <p className="mt-3 text-sm text-ink-3">+{inStock - shownLines.length} more stores — see them by state.</p>}
          </section>
          <aside className="space-y-6">
            <section className="pane p-5">
              <h2 className="text-lg font-semibold">By storage and color</h2>
              <div className="mt-3"><ProductGrid grid={grid} place={place} current={product} /></div>
            </section>
            {children.length > 0 && (
              <section className="pane p-5">
                <h2 className="text-lg font-semibold">{place.level === "us" ? "By state" : "By city"}</h2>
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
      {place.level === "us" && !copy && (
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
          <div className="mt-3"><RestockClock stats={clock} label={inPlace(place)} /></div>
        </section>
        {stats.month > 0 && (
          <section className="pane p-5">
            <h2 className="text-lg font-semibold">Last {stats.days} days</h2>
            <div className="mt-3"><DailyBars stats={stats} label={inPlace(place)} /></div>
          </section>
        )}
        {stats.month > 0 && !one && (
          <section className="pane p-5">
            <h2 className="text-lg font-semibold">Restocks by configuration</h2>
            <div className="mt-3"><RestocksByConfig stats={stats} label={inPlace(place)} store={place.store?.storeNumber} /></div>
          </section>
        )}
      </div>

      {copy && facts ? (
        <div className="mx-auto mt-8 max-w-3xl space-y-8">
          <RichFaq items={[...faq, ...copy.faq]} facts={facts} title={`${product.name} FAQ`} />
          <SourceList sources={copy.sources} facts={facts} />
        </div>
      ) : (
        <div className="mt-6"><Faq items={faq} title={`${product.short} ${inPlace(place)}`} /></div>
      )}

      <RelatedBlock title="Nearby">
        {place.level === "state" && siblings.length > 0 && <LinkRow title="Neighboring states" links={siblings.map((s) => ({ href: productPath(product, s.place), label: s.place.name, meta: `${s.inStock}/${s.stores}` }))} />}
        {(place.level === "city" || place.level === "store") && place.state && (
          <LinkRow title={`Elsewhere in ${place.state}`} links={[statePlace(place.state)!, ...(place.level === "store" && place.city ? [cityPlace(place.state, place.city)].filter((x): x is Place => Boolean(x)) : [])].map((p) => ({ href: productPath(product, p), label: p.name }))} />
        )}
        <LinkRow title="More" links={[
          { href: placePagePath(place), label: place.level === "us" ? "Every Apple Store" : `Every iPhone ${inPlace(place)}` },
          { href: `/restocks?model=${product.model}`, label: "Restock log" },
          { href: `/map?model=${product.model}${place.store ? `&store=${place.store.storeNumber}` : ""}`, label: "Live map" },
          ...(place.level === "us" ? [] : [{ href: productPath(product), label: `${product.short} across the US` }]),
        ]} />
      </RelatedBlock>
    </div>
  );
}
