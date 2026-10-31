import type { Metadata } from "next";
import { PendingLink as Link } from "@/components/ui/PendingLink";
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
import { Figure } from "@/components/content/Figure";
import { SourceList } from "@/components/content/RichFaq";
import { emptyFacts } from "@/lib/content/facts";
import { SALES_TAX, SALES_TAX_SOURCE } from "@/content/sales-tax";
import { hubFaq } from "@/lib/seo/placeCopy";

/**
 * Bound keywords (DataForSEO, seo.md §10): "list of apple stores" 210/mo, KD 0 (title and H1); "how many
 * apple stores in the us" 320, KD 30 (its own section); "apple store locations" 22,200, KD 100 (the
 * heading of the state list). The page used to target "apple stores by state", which measures 10.
 */
function hubTitle(): string {
  return `List of Apple Stores in the US: All ${STORES.length} by State, Live Stock`;
}

export const dynamic = "force-dynamic";

/** Nationwide numbers, all cached (60 s): 1 + 3 + 1 queries. */
const load = cache(async () => {
  const [stockNow, pstats, stats] = await Promise.all([storesWithStockNow(), placeStats({ tz: "America/New_York" }), restockStats(STORES.map((s) => s.storeNumber), "America/New_York", 30)]);
  return { stockNow, pstats, stats };
});

export async function generateMetadata(): Promise<Metadata> {
  const d = await load();
  const title = hubTitle();
  const description = `The list of all ${STORES.length} Apple Stores in the US by state and city, with live iPhone Duo, 18 Pro and Pro Max pickup stock: ${d.stockNow.duo} have the Duo now.`.slice(0, 160);
  return { title, description, alternates: { canonical: "/stores" }, openGraph: { type: "website", siteName: "PickupChecker", title, description, url: "/stores" } };
}

export default async function StoresIndex() {
  const d = await load();
  const states = statesWithStores();
  const cities = citiesWithStores();
  const alert = alertHref({ model: DEFAULT_MODEL });
  // Four questions; "how many Apple Stores" has its own section above, so it is not repeated here.
  const hub = hubFaq();
  const duoNow = { q: "Which Apple Stores have the iPhone Duo right now?", a: d.stockNow.duo === 0 ? `None of the ${STORES.length} at the last check. The iPhone Duo stock page and the map update the moment one lists it, and an alert tells you first.` : `${d.stockNow.duo} of the ${STORES.length} at the last check. The iPhone Duo stock page names each store and configuration, updated every 15 seconds.` };
  const questions = [duoNow, ...faq({ kind: "state", place: "the US", stores: STORES, stockNow: d.stockNow, stats: d.pstats, peak: peakOf(d.stats) }).filter((q) => !q.q.startsWith("How many Apple Stores are there") && !q.q.startsWith("Which Apple Stores in")), hub.taxFree];
  const top = [...states].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 10);
  const thin = states.filter((s) => s.count <= 2).map((s) => s.name);
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <JsonLd data={itemListJsonLd("Apple Stores in the US", STORES)} />
      <h1 className="display text-3xl sm:text-5xl">{hubTitle()}</h1>
      <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-2">There are <b className="text-ink">{STORES.length} Apple Stores</b> in the US, in {cities.length} cities across {states.length - 1} states and Washington, D.C. Right now <b className="text-ink">{d.stockNow.duo}</b> of them list an iPhone Duo for pickup, <b className="text-ink">{d.stockNow["18-pro-max"]}</b> the iPhone 18 Pro Max and <b className="text-ink">{d.stockNow["18-pro"]}</b> the 18 Pro. Pick your state; the three with no sales tax are marked.</p>
      <div className="mt-6 flex flex-wrap gap-2"><Link href={`/map?model=${DEFAULT_MODEL}`} className="btn btn-ghost btn-sm">Live map</Link><Link href="/restocks" className="btn btn-ghost btn-sm">Restock log</Link><Link href={alert} className="btn btn-primary btn-sm">Alert me</Link></div>

      <div className="mt-6"><ModelPlaceCards place={US} stockNow={d.stockNow} of={STORES.length} unit="stores with it" /></div>
      <div className="mt-3"><PlaceStatStrip stores={STORES.length} cities={cities.length} stockNow={d.stockNow} stats={d.pstats} /></div>

      <section className="mt-10 max-w-3xl" aria-labelledby="how-many">
        <h2 id="how-many" className="text-2xl font-semibold">How many Apple Stores are there in the US?</h2>
        <p className="mt-2 leading-relaxed text-ink-2">{hub.count.a}</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="mb-2 text-left text-xs text-ink-3">The ten states with the most Apple Stores (Apple retail store list, as tracked here)</caption>
            <thead><tr className="text-left text-ink-3"><th className="py-1.5 pr-4 font-medium">State</th><th className="py-1.5 pr-4 font-medium">Apple Stores</th><th className="py-1.5 font-medium">Cities</th></tr></thead>
            <tbody className="divide-y divide-line">
              {top.map((s) => <tr key={s.slug}><td className="py-1.5 pr-4"><Link href={statePath(s.name)} className="hover:underline">{s.name}</Link></td><td className="py-1.5 pr-4 tabular-nums">{s.count}</td><td className="py-1.5 tabular-nums">{cities.filter((c) => c.state === s.name).length}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <h2 className="mt-10 text-2xl font-semibold">Apple Store locations by state</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {states.map((s) => {
          const mine = cities.filter((c) => c.state === s.name);
          return (
            <li key={s.slug} className="pane-2 min-w-0 p-4">
              <Link href={statePath(s.name)} className="flex items-center justify-between gap-2 font-semibold hover:underline"><span>{s.name}</span><span className="shrink-0 text-sm font-normal text-ink-3">{s.count} store{s.count > 1 ? "s" : ""}{SALES_TAX[s.name] ? (SALES_TAX[s.name].combined === 0 ? " · no sales tax" : ` · ${SALES_TAX[s.name].combined}% tax`) : ""}</span></Link>
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
        <div className="space-y-4">
          <Figure id="apple-store-glass-canopy" className="my-0" />
          <Figure id="phone-map" className="my-0" />
          <div className="pane p-5"><SourceList sources={[{ label: "Apple: Retail store list", url: "https://www.apple.com/retail/storelist/" }, SALES_TAX_SOURCE]} facts={emptyFacts()} /></div>
        </div>
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
