/** Another country's store index (/{cc}/stores): the live first screen plus every store in one matrix, then where they are, the keyword sections, charts, FAQ and sources. */
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { permanentRedirect } from "next/navigation";
import { citiesWithStores, cityPath, statePath, statesWithStores, storesOf, storePath, DEFAULT_MODEL, placeTarget, mapPath, restocksPath } from "@/lib/apple/catalog";
import { prefixOf, theName, type Country } from "@/lib/apple/countries";
import { alertHref, peakOf, itemListJsonLd } from "@/lib/seo/enrich";
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
import { INTL_PLACE_PHOTOS } from "@/content/place-photos-intl";
import type { IntlPlaceInput } from "@/lib/seo/countryCopy";
import { topRegions } from "@/lib/seo/countryLinks";
import { AlertPanelFor } from "@/components/alerts/AlertPanelServer";
import { pageLocale, t as dictT } from "@/lib/i18n/server";
import { pathInLocale } from "@/lib/i18n/locales";
import { appleStoreLabel, cityLabel, countryLabel, regionLabel, storeLabel } from "@/lib/i18n/places";
import { loadIndex } from "./StoresIndexPage";

export async function IntlStoresIndexPage({ country: c }: { country: Country }) {
  const t = placeTarget(c.cc);
  // A one-store country: its store page is the index (the proxy 308s; this is the backstop).
  if (t && !t.indexable) permanentRedirect(t.path);
  return <IntlStoresIndex c={c} />;
}

/** Another country's index: the same live first screen plus every store in one matrix (no country has more than 39). */
async function IntlStoresIndex({ c }: { c: Country }) {
  const cc = c.cc;
  const loc = pageLocale();
  const lang = loc.lang;
  const D = dictT();
  const P = D.place;
  const V = D.views.storesIndex;
  const C = D.views.common;
  const stores = storesOf(cc);
  const d = await loadIndex(cc);
  const regions = statesWithStores(cc);
  const cities = citiesWithStores(cc);
  const hasRegions = Boolean(c.regionNoun) && regions.length > 1;
  const alert = alertHref({ model: DEFAULT_MODEL, country: cc });
  // The country as a place name in the page's language ("the UK"; native: Intl's name).
  const where = lang === "en" ? theName(c) : countryLabel(cc, lang);
  const short = lang === "en" ? c.short : countryLabel(cc, lang);
  const input: IntlPlaceInput = { cc, kind: "state", name: where, region: "", regionSlug: "", stores, cities: cities.length, stockNow: d.stockNow, stock: d.stock, duo: d.duo!, max: d.max! };
  const sections = P.placeSections(input).map((s) => (s.id === "iphone-duo" ? { ...s, blocks: [{ t: "p" as const, text: V.duoBlock(alert) }] } : s));
  const tops = (hasRegions ? topRegions(cc, 10) : []).map((r) => ({ ...r, name: regionLabel(cc, r.name, lang) }));
  const duoStores = stores.filter((x) => (d.stock.get(x.storeNumber)?.perModel.duo.available ?? 0) > 0);
  const countQ = { a: V.countAnswer(stores.length, P.spreadPhrase(cc), tops) };
  const questions = [
    V.duoNow(c, stores.length, duoStores),
    ...V.faq({ kind: "state", place: where, stores, stockNow: d.stockNow, stats: d.pstats, peak: peakOf(d.stats, lang) }),
    P.taxFaq(cc, where),
  ];
  const facts = emptyFacts(cc);
  const intro = V.intro(c, stores.length, P.spreadPhrase(cc), { duo: d.stockNow.duo, max: d.stockNow["18-pro-max"], pro: d.stockNow["18-pro"] }, P.taxSentence(cc));
  const ld = itemListJsonLd(C.appleStoresIn(c), stores);
  // A native version lists its own store pages, by the names Apple uses in that language.
  const itemList = loc.native ? { ...ld, itemListElement: stores.map((x, i) => ({ "@type": "ListItem", position: i + 1, name: appleStoreLabel(x, lang), url: `https://pickupchecker.com${pathInLocale(storePath(x), loc)}` })) } : ld;
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <JsonLd data={itemList} />
      <Breadcrumbs items={[{ href: prefixOf(cc), label: short }, { label: V.crumb }]} />
      <h1 className="display mt-2 text-3xl sm:text-5xl">{P.storesIndexTitle(cc)}</h1>
      <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-2"><Inline text={intro} facts={facts} /></p>
      <div className="mt-6 flex flex-wrap gap-2"><Link href={`${mapPath(cc)}?model=${DEFAULT_MODEL}`} className="btn btn-ghost btn-sm">{C.liveMap}</Link><Link href={restocksPath(cc)} className="btn btn-ghost btn-sm">{C.restockLog}</Link><Link href={alert} className="btn btn-primary btn-sm">{C.alertMe}</Link></div>
      <AlertPanelFor href={alert} summary={V.panel(c)} country={cc} />

      <div className="mt-6"><ModelPlaceCards place={treeOf(cc).root} stockNow={d.stockNow} of={stores.length} unit={C.storesWithIt} /></div>
      <div className="mt-3"><PlaceStatStrip stores={stores.length} cities={cities.length} stockNow={d.stockNow} stats={d.pstats} /></div>
      <section className="mt-6" aria-label={V.matrixLabel}>
        <h2 className="text-xl font-semibold">{V.matrixH2(c)}</h2>
        <p className="mt-1 text-sm text-ink-3">{V.matrixHint}</p>
        <div className="mt-3"><ModelStoreMatrix stores={[...stores].sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name))} stock={d.stock} /></div>
      </section>

      <section className="mt-10 max-w-3xl" aria-labelledby="how-many">
        <h2 id="how-many" className="text-2xl font-semibold">{V.howMany(c)}</h2>
        <p className="mt-2 leading-relaxed text-ink-2">{countQ.a}</p>
        {hasRegions && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="mb-2 text-left text-xs text-ink-3">{V.topCaption(c)}</caption>
              <thead><tr className="text-left text-ink-3"><th className="py-1.5 pr-4 font-medium">{V.regionHead(c)}</th><th className="py-1.5 pr-4 font-medium">{V.colStores}</th><th className="py-1.5 font-medium">{V.colCities}</th></tr></thead>
              <tbody className="divide-y divide-line">
                {tops.map((s) => <tr key={s.slug}><td className="py-1.5 pr-4"><Link href={s.href} className="hover:underline">{s.name}</Link></td><td className="py-1.5 pr-4 tabular-nums">{s.count}</td><td className="py-1.5 tabular-nums">{s.cities}</td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <h2 className="mt-10 text-2xl font-semibold">{hasRegions ? V.locationsBy(c) : V.locationsIn(c)}</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(hasRegions ? regions : [{ name: where, slug: "", count: stores.length, code: "" }]).map((s) => {
          const mine = hasRegions ? cities.filter((x) => x.state === s.name) : cities;
          const own = hasRegions ? stores.filter((x) => x.state === s.name) : stores;
          return (
            <li key={s.slug || "all"} className="pane-2 min-w-0 p-4">
              {hasRegions
                ? <Link href={statePath(s.name, cc)} className="flex items-center justify-between gap-2 font-semibold hover:underline"><span>{regionLabel(cc, s.name, lang)}</span><span className="shrink-0 text-sm font-normal text-ink-3">{V.storeCount(s.count)}</span></Link>
                : <div className="flex items-center justify-between gap-2 font-semibold"><span>{countryLabel(cc, lang)}</span><span className="shrink-0 text-sm font-normal text-ink-3">{V.storeCountAll(s.count)}</span></div>}
              <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs">
                {mine.length > 1 || !hasRegions
                  ? mine.map((x) => <Link key={x.slug} href={cityPath(x.state, x.name, cc)} className="text-ink-2 hover:text-ink hover:underline">{cityLabel(cc, x.name, lang)}{x.stores.length > 1 ? ` (${x.stores.length})` : ""}</Link>)
                  : own.map((x) => <Link key={x.storeNumber} href={storePath(x)} className="text-ink-2 hover:text-ink hover:underline">{storeLabel(x, lang)} · {cityLabel(cc, x.city, lang)}</Link>)}
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
          <h2 className="text-xl font-semibold">{V.whenRestock(c)}</h2>
          <div className="mt-3"><RestockClock stats={d.stats} label={C.inCountry(c)} reports={d.reports} /></div>
        </section>
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">{V.howFast(c)}</h2>
          <div className="mt-3"><SellOutTimes data={d.sell} label={C.inCountry(c)} showStore /></div>
        </section>
        <section className="pane p-5">
          <h2 className="text-xl font-semibold">{C.lastDays(d.pstats.days)}</h2>
          <div className="mt-3"><DailyBars stats={d.pstats} label={C.inCountry(c)} /></div>
        </section>
        <Faq items={questions} title={V.faqTitle(c)} />
        <div className="space-y-4">
          <Figure id="phone-map" className="my-0" />
          <div className="pane p-5"><SourceList sources={[dictT().place.sources(cc as Exclude<typeof cc, "us">).storeList, dictT().place.sources(cc as Exclude<typeof cc, "us">).pickupHelp, dictT().place.sources(cc as Exclude<typeof cc, "us">).tax]} facts={facts} where={C.sourcesWhere(stores.length, c)} since={C.since} /></div>
        </div>
      </div>

      <RelatedBlock>
        <BrowseCountryPopular country={c} />
        <BrowseCountryModels country={c} />
        <LinkRow title={C.more} links={[{ href: prefixOf(cc), label: C.checker(c) }, { href: restocksPath(cc), label: C.restockLog }, { href: mapPath(cc), label: C.liveMap }, { href: "/install", label: V.getApp }, { href: "/how-it-works", label: V.howItWorks }, { href: "/pricing", label: V.pricing }]} />
      </RelatedBlock>
    </div>
  );
}
