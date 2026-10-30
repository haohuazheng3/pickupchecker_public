import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import { MODELS, STORES, modelBySlug, storagesFor, colorsFor, catalogFor, partNumbersFor, type ModelKey } from "@/lib/apple/catalog";
import { alertHref, faq, peakOf, modelTitle, productJsonLd, fmtPrice } from "@/lib/seo/enrich";
import { stockByStore, restockFeed, restockStats, placeStats } from "@/lib/stock/queries";
import { ConfigMatrix, ByStateTable, PriceTable, ModelStoreList } from "@/components/seo/ModelMatrix";
import { BrowseStates, BrowsePopular } from "@/components/seo/Browse";
import { LinkRow, RelatedBlock } from "@/components/seo/Related";
import { JsonLd } from "@/components/seo/JsonLd";
import { PlaceStatStrip } from "@/components/seo/StatStrip";
import { Narrative } from "@/components/seo/Narrative";
import { Explainer } from "@/components/seo/Explainer";
import { Faq } from "@/components/seo/Faq";
import { RestockFeed } from "@/components/restocks/RestockFeed";
import { RestockClock } from "@/components/restocks/RestockClock";
import { DailyBars } from "@/components/restocks/DailyBars";
import { RestocksByConfig } from "@/components/restocks/RestocksByConfig";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return MODELS.map((m) => ({ model: m.slug }));
}

/** One load per request for the page and its metadata: 6 queries (3 live + 3 cached statistics). */
const load = cache(async (key: ModelKey) => {
  const [rows, pstats, stats, feed] = await Promise.all([
    stockByStore(key),
    placeStats({ model: key, tz: "America/New_York" }),
    restockStats(STORES.map((s) => s.storeNumber), "America/New_York", 30, key),
    restockFeed({ model: key, limit: 10 }),
  ]);
  const storesNow = rows.filter((r) => r.availableParts.length > 0).length;
  const stockNow = Object.fromEntries(MODELS.map((m) => [m.key, m.key === key ? storesNow : 0])) as Record<ModelKey, number>;
  return { rows, pstats, stats, feed, storesNow, stockNow };
});

export async function generateMetadata({ params }: PageProps<"/stock/[model]">): Promise<Metadata> {
  const { model } = await params;
  const m = modelBySlug(model);
  if (!m) return {};
  const d = await load(m.key);
  const title = modelTitle(m.name, d.storesNow);
  const description = `${d.storesNow} of ${STORES.length} US Apple Stores list the ${m.name} for in-store pickup right now; ${d.pstats.week} restocks this week. Every store checked every 20 seconds, by storage and colour, with prices, restock times and alerts.`;
  return { title, description, alternates: { canonical: `/stock/${m.slug}` }, openGraph: { type: "website", siteName: "PickupChecker", title, description, url: `/stock/${m.slug}` } };
}

export default async function StockModelPage({ params, searchParams }: PageProps<"/stock/[model]">) {
  const { model } = await params;
  const sp = await searchParams;
  const m = modelBySlug(model);
  if (!m) notFound();
  const key = m.key as ModelKey;
  const storage = typeof sp.storage === "string" && storagesFor(key).includes(sp.storage) ? sp.storage : undefined;
  const color = typeof sp.color === "string" && colorsFor(key).includes(sp.color) ? sp.color : undefined;
  const d = await load(key);
  const wanted = new Set(partNumbersFor(key, storage ? [storage] : [], color ? [color] : []));
  const filtered = storage || color ? d.rows.map((r) => ({ ...r, availableParts: r.availableParts.filter((p) => wanted.has(p)) })).sort((a, b) => b.availableParts.length - a.availableParts.length) : d.rows;
  const items = catalogFor(key);
  const prices = items.map((i) => i.price);
  const alert = alertHref({ model: key, storage, color });
  const questions = faq({ kind: "model", place: m.name, stores: STORES, stockNow: d.stockNow, stats: d.pstats, peak: peakOf(d.stats), prices: { low: Math.min(...prices), high: Math.max(...prices), storages: storagesFor(key), colors: colorsFor(key) } });
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <JsonLd data={productJsonLd(key, d.storesNow)} />
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Models">
        {MODELS.map((x) => (
          <Link key={x.key} href={`/stock/${x.slug}`} className="chip" data-on={x.key === key}>{x.name}</Link>
        ))}
      </nav>
      <h1 className="display text-3xl sm:text-5xl">{m.name} pickup stock, live</h1>
      <p className="mt-3 max-w-2xl text-ink-2">Every Apple Store in the US, checked every 20 seconds. Green means a store currently lists the {m.short} for in-store pickup on apple.com. From {fmtPrice(Math.min(...prices))}, {storagesFor(key).join(" / ")}, in {colorsFor(key).length} colours.</p>
      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        <Link href={`/stock/${m.slug}`} className="chip" data-on={!storage && !color}>All</Link>
        {storagesFor(key).map((s) => <Link key={s} href={`/stock/${m.slug}?storage=${encodeURIComponent(s)}${color ? `&color=${encodeURIComponent(color)}` : ""}`} className="chip" data-on={storage === s}>{s}</Link>)}
        <span className="mx-1 self-center text-ink-3">·</span>
        {colorsFor(key).map((c) => <Link key={c} href={`/stock/${m.slug}?color=${encodeURIComponent(c)}${storage ? `&storage=${encodeURIComponent(storage)}` : ""}`} className="chip" data-on={color === c}>{c}</Link>)}
      </div>

      <div className="mt-6"><PlaceStatStrip stores={STORES.length} stockNow={d.stockNow} stats={d.pstats} model={key} /></div>
      <Narrative className="mt-4" input={{ kind: "model", place: m.name, stores: STORES.length, stockNow: d.stockNow, stats: d.pstats }} stats={d.pstats} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section className="pane p-5 sm:p-6">
          <ModelStoreList model={key} rows={filtered} storage={storage} color={color} />
        </section>
        <aside className="space-y-4">
          <div className="pane p-5">
            <div className="eyebrow">Alerts</div>
            <p className="mt-2 text-ink-2">Don&apos;t refresh this page. Get a notification the second a {m.short} appears at your store — one alert per store, storage and colour.</p>
            <Link href={alert} className="btn btn-primary mt-4 w-full">Get notified</Link>
          </div>
          <div className="pane p-5">
            <div className="flex items-baseline justify-between gap-3"><div className="eyebrow">Recent restocks</div><Link href={`/restocks?model=${key}`} className="text-xs text-ink-3 hover:text-ink">Full log →</Link></div>
            <div className="mt-2"><RestockFeed rows={d.feed} model={key} showModel={false} /></div>
          </div>
          <div className="pane p-5">
            <div className="eyebrow">Prices</div>
            <div className="mt-2"><PriceTable model={key} /></div>
          </div>
        </aside>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-xl font-semibold">Stores with stock by storage and colour</h2>
          <p className="mt-1 text-sm text-ink-3">How many stores list each configuration right now.</p>
          <div className="mt-3"><ConfigMatrix model={key} rows={d.rows} /></div>
        </section>
        <section>
          <h2 className="text-xl font-semibold">{m.short} stock by state</h2>
          <p className="mt-1 text-sm text-ink-3">Stores per state and how many have the {m.short} right now.</p>
          <div className="mt-3"><ByStateTable model={key} rows={d.rows} /></div>
        </section>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">When does the {m.short} restock?</h2>
          <div className="mt-3"><RestockClock stats={d.stats} label="across the US" /></div>
        </section>
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">Last {d.pstats.days} days, day by day</h2>
          <div className="mt-3"><DailyBars stats={d.pstats} label="across the US" /></div>
        </section>
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">Restocks by configuration</h2>
          <div className="mt-3"><RestocksByConfig stats={d.pstats} label="across the US" /></div>
        </section>
        <Explainer kind="model" place={m.name} alertHref={alert} />
      </div>

      <div className="mt-6"><Faq items={questions} title={`Questions about ${m.name} pickup`} /></div>

      <RelatedBlock title={`${m.name} by place`}>
        <LinkRow title="This model" links={[{ href: `/restocks?model=${key}`, label: `${m.short} restock log` }, { href: `/map?model=${key}`, label: `${m.short} on the map` }, { href: alert, label: `${m.short} alert` }, ...MODELS.filter((x) => x.key !== key).map((x) => ({ href: `/stock/${x.slug}`, label: `${x.name} stock` }))]} />
        <BrowseStates />
        <BrowsePopular states={0} cities={12} />
      </RelatedBlock>
    </div>
  );
}
