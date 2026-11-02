/** Another country's store index (/{cc}/stores): the live first screen plus every store in one matrix, then where they are, the keyword sections, charts, FAQ and sources. */
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { permanentRedirect } from "next/navigation";
import { citiesWithStores, cityPath, statePath, statesWithStores, storesOf, storePath, DEFAULT_MODEL, placeTarget, mapPath, restocksPath } from "@/lib/apple/catalog";
import { prefixOf, theName, type Country } from "@/lib/apple/countries";
import { alertHref, faq, peakOf, itemListJsonLd } from "@/lib/seo/enrich";
import { BrowseCountryModels, BrowseCountryPopular } from "@/components/seo/CountryBrowse";
import { Breadcrumbs, LinkRow, RelatedBlock } from "@/components/seo/Related";
import { JsonLd } from "@/components/seo/JsonLd";
import { PlaceStatStrip } from "@/components/seo/StatStrip";
import { ModelPlaceCards } from "@/components/seo/ModelPlaceCards";
import { treeOf } from "@/lib/seo/tree";
import { Faq } from "@/components/seo/Faq";
import { DailyBars } from "@/components/restocks/DailyBars";
import { RestockClock } from "@/components/restocks/RestockClock";
import { SellOutTimes } from "@/components/restocks/SellOutTimes";
import { ModelStoreMatrix } from "@/components/stores/ModelStoreMatrix";
import { Figure } from "@/components/content/Figure";
import { KeywordSections } from "@/components/content/KeywordSections";
import { Inline } from "@/components/content/Inline";
import { SourceList } from "@/components/content/RichFaq";
import { emptyFacts } from "@/lib/content/facts";
import { TAX_SOURCES, pickupHelp, storeListSource } from "@/content/country-tax";
import { INTL_PLACE_PHOTOS } from "@/content/place-photos-intl";
import { intlPlaceSections, spreadPhrase, storesIndexTitle, taxFaqIntl, taxSentence, type IntlPlaceInput } from "@/lib/seo/countryCopy";
import { regionWord, topRegions } from "@/lib/seo/countryLinks";
import { AlertPanelFor } from "@/components/alerts/AlertPanelServer";
import { loadIndex } from "./StoresIndexPage";
import { INTL_TRACKING_LABEL } from "./shared";

export async function IntlStoresIndexPage({ country: c }: { country: Country }) {
  const t = placeTarget(c.cc);
  // A one-store country: its store page is the index (the proxy 308s; this is the backstop).
  if (t && !t.indexable) permanentRedirect(t.path);
  return <IntlStoresIndex c={c} />;
}

/** Another country's index: the same live first screen plus every store in one matrix (no country has more than 39). */
async function IntlStoresIndex({ c }: { c: Country }) {
  const cc = c.cc;
  const stores = storesOf(cc);
  const d = await loadIndex(cc);
  const regions = statesWithStores(cc);
  const cities = citiesWithStores(cc);
  const hasRegions = Boolean(c.regionNoun) && regions.length > 1;
  const alert = alertHref({ model: DEFAULT_MODEL, country: cc });
  const where = theName(c);
  const input: IntlPlaceInput = { cc, kind: "state", name: where, region: "", regionSlug: "", stores, cities: cities.length, stockNow: d.stockNow, stock: d.stock, duo: d.duo!, max: d.max! };
  const sections = intlPlaceSections(input).map((s) => (s.id === "iphone-duo" ? { ...s, blocks: [{ t: "p" as const, text: `The fastest way to get one is an alert at the stores you can reach: [set an iPhone Duo alert](${alert}). Each store × exact configuration is one alert, and the push arrives seconds after a store lists it.` }] } : s));
  const tops = hasRegions ? topRegions(cc, 10) : [];
  const duoStores = stores.filter((x) => (d.stock.get(x.storeNumber)?.perModel.duo.available ?? 0) > 0);
  const countQ = { q: `How many Apple Stores are there ${c.inName}?`, a: `${stores.length}, ${spreadPhrase(cc)}${hasRegions ? `. ${tops[0].name} has the most (${tops[0].count})${tops[1] ? `, then ${tops[1].name} (${tops[1].count})` : ""}` : ""}.` };
  const questions = [
    { q: `Which Apple Stores ${c.inName} have the iPhone Duo right now?`, a: duoStores.length === 0 ? `None of the ${stores.length} at the last check. This page and the map update the moment one lists it, and an alert tells you first.` : `${duoStores.length} of the ${stores.length} at the last check: ${duoStores.slice(0, 6).map((x) => `Apple ${x.name}`).join(", ")}${duoStores.length > 6 ? " and more" : ""}.` },
    ...faq({ kind: "state", place: where, stores, stockNow: d.stockNow, stats: d.pstats, peak: peakOf(d.stats) }).filter((q) => !q.q.startsWith("How many Apple Stores are there") && !q.q.startsWith("Which Apple Stores in") && !q.q.startsWith("How long does stock last")),
    taxFaqIntl(cc, where),
  ];
  const facts = emptyFacts(cc);
  const intro = `There ${stores.length === 1 ? "is" : "are"} **${stores.length} Apple Store${stores.length === 1 ? "" : "s"}** ${c.inName}, ${spreadPhrase(cc)}. Right now **${d.stockNow.duo}** of them list an iPhone Duo for pickup, **${d.stockNow["18-pro-max"]}** the iPhone 18 Pro Max and **${d.stockNow["18-pro"]}** the 18 Pro. ${taxSentence(cc)}`;
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <JsonLd data={itemListJsonLd(`Apple Stores ${c.inName}`, stores)} />
      <Breadcrumbs items={[{ href: prefixOf(cc), label: c.short }, { label: "Apple Stores" }]} />
      <h1 className="display mt-2 text-3xl sm:text-5xl">{storesIndexTitle(cc)}</h1>
      <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-2"><Inline text={intro} facts={facts} /></p>
      <div className="mt-6 flex flex-wrap gap-2"><Link href={`${mapPath(cc)}?model=${DEFAULT_MODEL}`} className="btn btn-ghost btn-sm">Live map</Link><Link href={restocksPath(cc)} className="btn btn-ghost btn-sm">Restock log</Link><Link href={alert} className="btn btn-primary btn-sm">Alert me</Link></div>
      <AlertPanelFor href={alert} summary={`Pick the phones and tick the stores ${c.inName} you can get to`} country={cc} />

      <div className="mt-6"><ModelPlaceCards place={treeOf(cc).root} stockNow={d.stockNow} of={stores.length} unit="stores with it" /></div>
      <div className="mt-3"><PlaceStatStrip stores={stores.length} cities={cities.length} stockNow={d.stockNow} stats={d.pstats} /></div>
      <section className="mt-6" aria-label="Stock by store">
        <h2 className="text-xl font-semibold">Stock at every Apple Store {c.inName}</h2>
        <p className="mt-1 text-sm text-ink-3">In stock now / tracked, per model.</p>
        <div className="mt-3"><ModelStoreMatrix stores={[...stores].sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name))} stock={d.stock} /></div>
      </section>

      <section className="mt-10 max-w-3xl" aria-labelledby="how-many">
        <h2 id="how-many" className="text-2xl font-semibold">How many Apple Stores are there {c.inName}?</h2>
        <p className="mt-2 leading-relaxed text-ink-2">{countQ.a}</p>
        {hasRegions && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="mb-2 text-left text-xs text-ink-3">{regionWord(cc, true, true)} with the most Apple Stores (Apple retail store list, as tracked here)</caption>
              <thead><tr className="text-left text-ink-3"><th className="py-1.5 pr-4 font-medium">{regionWord(cc, false, true)}</th><th className="py-1.5 pr-4 font-medium">Apple Stores</th><th className="py-1.5 font-medium">Cities</th></tr></thead>
              <tbody className="divide-y divide-line">
                {tops.map((s) => <tr key={s.slug}><td className="py-1.5 pr-4"><Link href={s.href} className="hover:underline">{s.name}</Link></td><td className="py-1.5 pr-4 tabular-nums">{s.count}</td><td className="py-1.5 tabular-nums">{s.cities}</td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <h2 className="mt-10 text-2xl font-semibold">{hasRegions ? `Apple Store locations by ${regionWord(cc)}` : `Apple Store locations ${c.inName}`}</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(hasRegions ? regions : [{ name: where, slug: "", count: stores.length, code: "" }]).map((s) => {
          const mine = hasRegions ? cities.filter((x) => x.state === s.name) : cities;
          const own = hasRegions ? stores.filter((x) => x.state === s.name) : stores;
          return (
            <li key={s.slug || "all"} className="pane-2 min-w-0 p-4">
              {hasRegions
                ? <Link href={statePath(s.name, cc)} className="flex items-center justify-between gap-2 font-semibold hover:underline"><span>{s.name}</span><span className="shrink-0 text-sm font-normal text-ink-3">{s.count} store{s.count > 1 ? "s" : ""}</span></Link>
                : <div className="flex items-center justify-between gap-2 font-semibold"><span>{c.name}</span><span className="shrink-0 text-sm font-normal text-ink-3">{s.count} stores</span></div>}
              <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs">
                {mine.length > 1 || !hasRegions
                  ? mine.map((x) => <Link key={x.slug} href={cityPath(x.state, x.name, cc)} className="text-ink-2 hover:text-ink hover:underline">{x.name}{x.stores.length > 1 ? ` (${x.stores.length})` : ""}</Link>)
                  : own.map((x) => <Link key={x.storeNumber} href={storePath(x)} className="text-ink-2 hover:text-ink hover:underline">{x.name} · {x.city}</Link>)}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mx-auto mt-10 max-w-3xl">
        <Figure id={INTL_PLACE_PHOTOS[cc] ?? "apple-store-glass-canopy"} />
        <KeywordSections sections={sections} facts={facts} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">When do stores {c.inName} restock?</h2>
          <div className="mt-3"><RestockClock stats={d.stats} label={c.inName} reports={d.reports} /></div>
        </section>
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">How fast do restocks sell out {c.inName}?</h2>
          <div className="mt-3"><SellOutTimes data={d.sell} label={c.inName} showStore /></div>
        </section>
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">Last {d.pstats.days} days</h2>
          <div className="mt-3"><DailyBars stats={d.pstats} label={c.inName} /></div>
        </section>
        <Faq items={questions} title={`Apple Stores ${c.inName}: FAQ`} />
        <div className="space-y-4">
          <Figure id="phone-map" className="my-0" />
          <div className="pane p-5"><SourceList sources={[storeListSource(cc), pickupHelp(cc), TAX_SOURCES[cc as Exclude<typeof cc, "us">]]} facts={facts} where={`all ${stores.length} Apple Stores ${c.inName}`} since={INTL_TRACKING_LABEL} /></div>
        </div>
      </div>

      <RelatedBlock>
        <BrowseCountryPopular country={c} />
        <BrowseCountryModels country={c} />
        <LinkRow title="More" links={[{ href: prefixOf(cc), label: `iPhone stock checker ${c.short}` }, { href: restocksPath(cc), label: "Restock log" }, { href: mapPath(cc), label: "Live map" }, { href: "/install", label: "Get the app" }, { href: "/how-it-works", label: "How it works" }, { href: "/pricing", label: "Pricing" }]} />
      </RelatedBlock>
    </div>
  );
}
