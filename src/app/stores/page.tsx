import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { citiesWithStores, cityPath, statePath, statesWithStores, DEFAULT_MODEL, STORES, MODELS } from "@/lib/apple/catalog";
import { alertHref, faq, peakOf, itemListJsonLd } from "@/lib/seo/enrich";
import { storesWithStockNow, placeStats, restockStats } from "@/lib/stock/queries";
import { BrowseModels, BrowsePopular } from "@/components/seo/Browse";
import { LinkRow, RelatedBlock } from "@/components/seo/Related";
import { JsonLd } from "@/components/seo/JsonLd";
import { PlaceStatStrip } from "@/components/seo/StatStrip";
import { ModelPlaceCards } from "@/components/seo/ModelPlaceCards";
import { US } from "@/lib/seo/products";

import { Faq } from "@/components/seo/Faq";
import { DailyBars } from "@/components/restocks/DailyBars";
import { RestockClock } from "@/components/restocks/RestockClock";

export const dynamic = "force-dynamic";

/** Nationwide numbers, all cached (60 s): 1 + 3 + 1 queries. */
const load = cache(async () => {
  const [stockNow, pstats, stats] = await Promise.all([storesWithStockNow(), placeStats({ tz: "America/New_York" }), restockStats(STORES.map((s) => s.storeNumber), "America/New_York", 30)]);
  return { stockNow, pstats, stats };
});

export async function generateMetadata(): Promise<Metadata> {
  const d = await load();
  const states = statesWithStores();
  const title = `Apple Stores by state: ${d.stockNow.duo} of ${STORES.length} have the iPhone Duo now`;
  const description = `${STORES.length} US Apple Stores in ${states.length} states by city, live iPhone Duo, 18 Pro and Pro Max pickup stock: ${d.stockNow.duo} have the Duo now, ${d.pstats.week} restocks this week.`;
  return { title: title.length <= 60 ? title : "Apple Stores by state and city – iPhone Duo pickup stock", description, alternates: { canonical: "/stores" }, openGraph: { type: "website", siteName: "PickupChecker", title, description, url: "/stores" } };
}

export default async function StoresIndex() {
  const d = await load();
  const states = statesWithStores();
  const cities = citiesWithStores();
  const alert = alertHref({ model: DEFAULT_MODEL });
  const questions = faq({ kind: "state", place: "the US", stores: STORES, stockNow: d.stockNow, stats: d.pstats, peak: peakOf(d.stats) }).filter((q) => !q.q.startsWith("How many Apple Stores are there") && !q.q.startsWith("Which Apple Stores in"));
  const thin = states.filter((s) => s.count <= 2).map((s) => s.name);
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <JsonLd data={itemListJsonLd("Apple Stores in the US", STORES)} />
      <h1 className="display text-3xl sm:text-5xl">Apple Stores by state and city</h1>
      <p className="mt-3 max-w-2xl text-ink-2">{STORES.length} stores · {cities.length} cities · {states.length} states and territories.</p>
      <div className="mt-6 flex flex-wrap gap-2"><Link href={`/map?model=${DEFAULT_MODEL}`} className="btn btn-ghost btn-sm">Live map</Link><Link href="/restocks" className="btn btn-ghost btn-sm">Restock log</Link><Link href={alert} className="btn btn-primary btn-sm">Alert me</Link></div>

      <div className="mt-6"><ModelPlaceCards place={US} stockNow={d.stockNow} of={STORES.length} unit="stores with it" /></div>
      <div className="mt-3"><PlaceStatStrip stores={STORES.length} cities={cities.length} stockNow={d.stockNow} stats={d.pstats} /></div>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {states.map((s) => {
          const mine = cities.filter((c) => c.state === s.name);
          return (
            <li key={s.slug} className="pane-2 min-w-0 p-4">
              <Link href={statePath(s.name)} className="flex items-center justify-between font-semibold hover:underline"><span>{s.name}</span><span className="text-sm font-normal text-ink-3">{s.count} store{s.count > 1 ? "s" : ""}</span></Link>
              <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs">
                {mine.map((c) => <Link key={c.slug} href={cityPath(c.state, c.name)} className="text-ink-2 hover:text-ink hover:underline">{c.name}{c.stores.length > 1 ? ` (${c.stores.length})` : ""}</Link>)}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">When do stores restock?</h2>
          <div className="mt-3"><RestockClock stats={d.stats} label="across the US" /></div>
        </section>
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">Last {d.pstats.days} days</h2>
          <div className="mt-3"><DailyBars stats={d.pstats} label="across the US" /></div>
        </section>
        <Faq items={questions} title="FAQ" />
      </div>

      <RelatedBlock>
        <BrowsePopular />
        <LinkRow title="States with 1–2 stores" links={thin.map((n) => ({ href: statePath(n), label: n }))} />
        <BrowseModels />
        <LinkRow title="More" links={[{ href: "/restocks", label: "Restock log" }, { href: "/map", label: "Live map" }, { href: "/install", label: "Get the app" }, { href: "/how-it-works", label: "How it works" }, { href: "/pricing", label: "Pricing" }, ...MODELS.map((m) => ({ href: `/stock/${m.slug}`, label: `${m.name} stock` }))]} />
      </RelatedBlock>
    </div>
  );
}
