/**
 * A country's store index: /stores (the US, "list of apple stores") and /{cc}/stores ("apple stores in
 * {country}", seo.md §12; body in StoresIndexIntl.tsx). Same skeleton — live cards, how many stores and where,
 * every region, restock charts, FAQ, sources — with the US keeping its sales-tax angle and other countries
 * their own tax rule. Austria and Belgium have one store each: their /stores is that store's page (308).
 */
import type { Metadata } from "next";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { cache } from "react";
import { citiesWithStores, cityPath, statePath, statesWithStores, storesOf, partNumbersFor, DEFAULT_MODEL, MODELS } from "@/lib/apple/catalog";
import { prefixOf, type Country } from "@/lib/apple/countries";
import { alertHref, faq, peakOf, itemListJsonLd } from "@/lib/seo/enrich";
import { storesWithStockNow, storesStock, placeStats, restockStats, restockReportStats, stockByStore } from "@/lib/stock/queries";
import { duoRestockTimes } from "@/lib/content/restockTimes";
import { alertsSentAt, duoNowFrom, stockFromRows } from "@/lib/content/duoNow";
import { DuoNow } from "@/components/restocks/DuoNow";
import { t as dictT } from "@/lib/i18n/server";
import { BrowseModels, BrowsePopular } from "@/components/seo/Browse";
import { LinkRow, RelatedBlock } from "@/components/seo/Related";
import { JsonLd } from "@/components/seo/JsonLd";
import { PlaceStatStrip } from "@/components/seo/StatStrip";
import { ModelPlaceCards } from "@/components/seo/ModelPlaceCards";
import { US as US_PLACE } from "@/lib/seo/products";
import { Faq } from "@/components/seo/Faq";
import { DailyBars } from "@/components/restocks/DailyBars";
import { RestockClock } from "@/components/restocks/RestockClock";
import { SellOutTimes } from "@/components/restocks/SellOutTimes";
import { sellouts } from "@/lib/stock/sellouts";
import { Figure } from "@/components/content/Figure";
import { SourceList } from "@/components/content/RichFaq";
import { emptyFacts } from "@/lib/content/facts";
import { SALES_TAX, SALES_TAX_SOURCE } from "@/content/sales-tax";
import { hubFaq } from "@/lib/seo/placeCopy";
import { storesIndexTitle } from "@/lib/seo/countryCopy";
import { treeOf } from "@/lib/seo/tree";
import { hreflangFor } from "./shared";
import { englishLocale, pathInLocale, type Locale } from "@/lib/i18n/locales";
import { dict } from "@/lib/i18n/dict";

/**
 * Bound keywords (DataForSEO, seo.md §10): "list of apple stores" 210/mo, KD 0 (title and H1); "how many
 * apple stores in the us" 320, KD 30 (its own section); "apple store locations" 22,200, KD 100 (the
 * heading of the state list). The page used to target "apple stores by state", which measures 10.
 */
function hubTitle(c: Country): string {
  if (c.cc !== "us") return storesIndexTitle(c.cc);
  return `List of Apple Stores in the US: All ${storesOf("us").length} by State, Live Stock`;
}

/** Nationwide numbers, all cached (60 s): 1 + 3 + 1 queries; another country also reads its stores' stock (one query). */
export const loadIndex = cache(async (cc: Country["cc"]) => {
  const stores = storesOf(cc);
  const tz = cc === "us" ? "America/New_York" : treeOf(cc).root.tz;
  const numbers = stores.map((s) => s.storeNumber);
  const [stockNow, pstats, stats, stock, duo, max, reports, sell, duoClock, duoReports, duoSell, times, duoRows, alerts] = await Promise.all([
    storesWithStockNow(undefined, cc),
    placeStats({ tz, country: cc }),
    restockStats(numbers, tz, 30),
    cc === "us" ? Promise.resolve(new Map()) : storesStock(numbers),
    placeStats({ model: "duo", tz, country: cc }),
    cc === "us" ? Promise.resolve(null) : placeStats({ model: "18-pro-max", tz, country: cc }),
    restockReportStats(numbers, tz, 30, undefined, undefined, cc),
    sellouts({ country: cc }),
    // iPhone Duo only for the opening block and the clock (2026-11-08, see RegionPage).
    restockStats(numbers, tz, 30, "duo", undefined, cc),
    restockReportStats(numbers, tz, 30, "duo", undefined, cc),
    sellouts({ country: cc, parts: partNumbersFor("duo", [], [], cc) }),
    duoRestockTimes(cc),
    cc === "us" ? stockByStore("duo", {}, cc) : Promise.resolve(null),
    alertsSentAt(numbers),
  ]);
  const now = duoNowFrom({ stores, stock: duoRows ? stockFromRows(duoRows) : stock, others: duoRows ? { pro: stockNow["18-pro"], max: stockNow["18-pro-max"] } : undefined, times, sell: duoSell, alerts, configsTotal: 8 });
  return { stockNow, pstats, stats, stock, duo, max, reports, sell, duoClock, duoReports, now };
});

export async function storesIndexMetadata(c: Country, loc: Locale = englishLocale(c.cc)): Promise<Metadata> {
  const d = await loadIndex(c.cc);
  const D = dict(loc.lang);
  const title = c.cc === "us" ? hubTitle(c) : D.place.storesIndexTitle(c.cc);
  const n = storesOf(c.cc).length;
  const description = c.cc === "us"
    ? `The list of all ${n} Apple Stores in the US by state and city, with live iPhone Duo, 18 Pro and Pro Max pickup stock: ${d.stockNow.duo} have the Duo now.`.slice(0, 160)
    : D.views.storesIndex.metaDescription(c, n, statesWithStores(c.cc).length, citiesWithStores(c.cc).length, d.stockNow.duo, d.stockNow["18-pro-max"]).slice(0, 160);
  const url = loc.native ? pathInLocale(`${prefixOf(c.cc)}/stores`, loc) : `${prefixOf(c.cc)}/stores`;
  return { title, description, alternates: { canonical: url, languages: hreflangFor("stores", loc) }, openGraph: { type: "website", siteName: "PickupChecker", title, description, url } };
}

/** The US index. Another country's is StoresIndexIntl.tsx (a module of its own, so the US page loads none of its client code). */
export async function StoresIndexPage({ country: c }: { country: Country }) {
  const STORES = storesOf("us");
  const d = await loadIndex("us");
  const states = statesWithStores();
  const cities = citiesWithStores();
  const alert = alertHref({ model: DEFAULT_MODEL });
  // Four questions; "how many Apple Stores" has its own section above, so it is not repeated here.
  const hub = hubFaq();
  const duoNow = { q: "Which Apple Stores have the iPhone Duo right now?", a: d.stockNow.duo === 0 ? `None of the ${STORES.length} at the last check. The iPhone Duo stock page and the map update the moment one lists it, and an alert tells you first.` : `${d.stockNow.duo} of the ${STORES.length} at the last check. The iPhone Duo stock page names each store and configuration, updated every 15 seconds.` };
  const questions = [duoNow, ...faq({ kind: "state", place: "the US", stores: STORES, stockNow: d.stockNow, stats: d.pstats, peak: peakOf(d.duoClock) }).filter((q) => !q.q.startsWith("How many Apple Stores are there") && !q.q.startsWith("Which Apple Stores in")), hub.taxFree];
  const top = [...states].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 10);
  const thin = states.filter((s) => s.count <= 2).map((s) => s.name);
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <JsonLd data={itemListJsonLd("Apple Stores in the US", STORES)} />
      <h1 className="display text-3xl sm:text-5xl">{hubTitle(c)}</h1>
      <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-2">There are <b className="text-ink">{STORES.length} Apple Stores</b> in the US, in {cities.length} cities across {states.length - 1} states and Washington, D.C. Right now <b className="text-ink">{d.stockNow.duo}</b> of them list an iPhone Duo for pickup, <b className="text-ink">{d.stockNow["18-pro-max"]}</b> the iPhone 18 Pro Max and <b className="text-ink">{d.stockNow["18-pro"]}</b> the 18 Pro. Pick your state; the three with no sales tax are marked.</p>
      <div className="mt-6 flex flex-wrap gap-2"><Link href={`/map?model=${DEFAULT_MODEL}`} className="btn btn-ghost btn-sm">Live map</Link><Link href="/restocks" className="btn btn-ghost btn-sm">Restock log</Link><Link href={alert} className="btn btn-primary btn-sm">Alert me</Link></div>
      <div className="mt-5"><DuoNow d={d.now} label="in the US" name="the US" stores={STORES} country="us" restockTimesHref="/iphone-duo-restock-times" alertHref={alert} /></div>

      <div className="mt-6"><ModelPlaceCards place={US_PLACE} stockNow={d.stockNow} of={STORES.length} unit="stores with it" /></div>
      <div className="mt-3"><PlaceStatStrip stores={STORES.length} cities={cities.length} stockNow={d.stockNow} stats={d.duo!} scoped="Duo" /></div>

      <section className="mt-10 max-w-3xl" aria-labelledby="how-many">
        <h2 id="how-many" className="text-2xl font-semibold">How many Apple Stores are there in the US?</h2>
        <p className="mt-2 leading-relaxed text-ink-2">{hub.count.a}</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="mb-2 text-start text-xs text-ink-3">The ten states with the most Apple Stores (Apple retail store list, as tracked here)</caption>
            <thead><tr className="text-start text-ink-3"><th className="py-1.5 pe-4 font-medium">State</th><th className="py-1.5 pe-4 font-medium">Apple Stores</th><th className="py-1.5 font-medium">Cities</th></tr></thead>
            <tbody className="divide-y divide-line">
              {top.map((s) => <tr key={s.slug}><td className="py-1.5 pe-4"><Link href={statePath(s.name)} className="hover:underline">{s.name}</Link></td><td className="py-1.5 pe-4 tabular-nums">{s.count}</td><td className="py-1.5 tabular-nums">{cities.filter((x) => x.state === s.name).length}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <h2 className="mt-10 text-2xl font-semibold">Apple Store locations by state</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {states.map((s) => {
          const mine = cities.filter((x) => x.state === s.name);
          return (
            <li key={s.slug} className="pane-2 min-w-0 p-4">
              <Link href={statePath(s.name)} className="flex items-center justify-between gap-2 font-semibold hover:underline"><span>{s.name}</span><span className="shrink-0 text-sm font-normal text-ink-3">{s.count} store{s.count > 1 ? "s" : ""}{SALES_TAX[s.name] ? (SALES_TAX[s.name].combined === 0 ? " · no sales tax" : ` · ${SALES_TAX[s.name].combined}% tax`) : ""}</span></Link>
              <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs">
                {mine.map((x) => <Link key={x.slug} href={cityPath(x.state, x.name)} className="text-ink-2 hover:text-ink hover:underline">{x.name}{x.stores.length > 1 ? ` (${x.stores.length})` : ""}</Link>)}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">When do stores restock?</h2>
          <div className="mt-3"><RestockClock stats={d.duoClock} label="across the US" reports={d.duoReports} /></div>
          <p className="mt-2 text-xs text-ink-3">{dictT().modules.duoNow.allModels({ n: d.pstats.month, days: d.pstats.days, peak: peakOf(d.stats)?.hour ?? null })}</p>
        </section>
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">How fast do restocks sell out across the US?</h2>
          <div className="mt-3"><SellOutTimes data={d.sell} label="across the US" showStore /></div>
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

