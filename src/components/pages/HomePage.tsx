/**
 * A country's home: / (the US) and /{cc}. The live board for one model (stores with it, restocks, last check,
 * the latest restocks) beside the alert setup, then the keyword sections, FAQ and sources. The US keeps its
 * hand-written copy (content/home.ts); another country's copy is built from its own live numbers, prices,
 * tax rule and stores (seo.md §12: "iPhone Stock Checker {Country}: {n} Apple Stores, Checked Every 15s").
 */
import type { Metadata } from "next";
import { bidi } from "@/lib/i18n/format";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { MODELS, modelByKey, STORE_INDEX, appleFamilyUrl, storesOf, placeTarget, mapPath, restocksPath, type ModelKey } from "@/lib/apple/catalog";
import { prefixOf, type Country } from "@/lib/apple/countries";
import { restockFeed, restockCounts, stockByStore } from "@/lib/stock/queries";
import { HomeAlertSetup } from "@/components/alerts/AlertSetup";
import { buildPhoneCatalog } from "@/components/alerts/catalog";
import { wizardStartFrom } from "@/lib/wizardStart";
import { startFromPool } from "@/lib/alertStart";
import { productFor, productPath, storePlace } from "@/lib/seo/products";
import { RestockFeed } from "@/components/restocks/RestockFeed";
import { Dot } from "@/components/stock/StatusBits";
import { LiveChecked } from "@/components/site/LiveChecked";
import { CHECK_NOTE } from "@/lib/plans";
import { BrowseModels, BrowsePopular } from "@/components/seo/Browse";
import { BrowseCountryModels, BrowseCountryPopular } from "@/components/seo/CountryBrowse";
import { RelatedBlock } from "@/components/seo/Related";
import { JsonLd } from "@/components/seo/JsonLd";
import { HOME_TITLES } from "@/content/titles";
import { HOME_INTRO, HOME_SECTIONS, HOME_FAQ, HOME_SOURCES } from "@/content/home";
import { ORG_ID, SITE_DESCRIPTION, SITE_FEATURES } from "@/lib/seo/siteLd";
import { SellOutTimes } from "@/components/restocks/SellOutTimes";
import { sellouts } from "@/lib/stock/sellouts";
import { getFacts } from "@/lib/content/facts";
import { Inline } from "@/components/content/Inline";
import { KeywordSections, slugId, type KeywordSection } from "@/components/content/KeywordSections";
import { RichFaq, SourceList } from "@/components/content/RichFaq";
import { alertHref, itemListJsonLd } from "@/lib/seo/enrich";
import { Last24Hours } from "@/components/restocks/Last24Hours";
import { recentByConfig } from "@/lib/stock/recent";
import type { Faq } from "@/lib/content/types";
import { hreflangFor } from "./shared";
import { englishLocale, pathInLocale, type Locale } from "@/lib/i18n/locales";
import { dict } from "@/lib/i18n/dict";
import { pageLocale, t } from "@/lib/i18n/server";
import { namesFor } from "@/lib/i18n/names";
import { duoRestockTimes } from "@/lib/content/restockTimes";

type SearchParams = Record<string, string | string[] | undefined>;

/** The home's metadata: the US one as it always was (plus hreflang), another country's from its formula. */
export function homeMetadata(c: Country, loc: Locale = englishLocale(c.cc)): Metadata {
  const languages = hreflangFor("home", loc);
  if (c.cc === "us") {
    return {
      title: { absolute: `${HOME_TITLES.main.title} · PickupChecker` },
      description: HOME_TITLES.description,
      alternates: { canonical: "/", languages },
      openGraph: { type: "website", siteName: "PickupChecker", title: HOME_TITLES.main.title, description: HOME_TITLES.description, url: "/" },
    };
  }
  const P = dict(loc.lang).place;
  const title = P.homeTitle(c.cc);
  const description = P.homeDescription(c.cc);
  const url = pathInLocale(prefixOf(c.cc), loc);
  return { title: { absolute: `${title} · PickupChecker` }, description, alternates: { canonical: url, languages }, openGraph: { type: "website", siteName: "PickupChecker", title, description, url, ...(loc.native ? { locale: loc.tag.replace("-", "_") } : {}) } };
}

/** Home: the Duo restock board first (that is what visitors come for), the alert setup (phones × stores) beside it, the pitch below. */
export async function HomePage({ country: c, searchParams: sp }: { country: Country; searchParams: SearchParams }) {
  if (c.cc !== "us") return <IntlHome c={c} sp={sp} />;
  const start = wizardStartFrom((k) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined));
  const model: ModelKey = start.initialModel;
  const startSignIn = sp.signin === "1";
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const [facts, sell, recent] = await Promise.all([getFacts(), sellouts({ country: "us" }), recentByConfig({ country: "us" })]);
  const sections = HOME_TITLES.h2.map((h) => ({ id: slugId(h.keyword), h2: h.title, ...HOME_SECTIONS[h.keyword] }));
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      // Organization and WebSite come from the root layout (lib/seo/siteLd.ts).
      { "@type": "WebApplication", name: "PickupChecker iPhone stock checker", url: "https://pickupchecker.com", description: SITE_DESCRIPTION, featureList: SITE_FEATURES, applicationCategory: "UtilitiesApplication", operatingSystem: "Web, iOS and Android (Home Screen app)", offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Live stock, restock times, map and restock log are free; alerts from $5/month" }, publisher: { "@id": ORG_ID } },
    ],
  };
  return (
    <div className="mx-auto max-w-6xl px-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />

      <section className="pt-6 sm:pt-10">
        <div className="eyebrow inline-flex items-center gap-2"><span className="dot dot-ok dot-live" /> Live · all 269 US Apple Stores · {CHECK_NOTE}</div>
        <h1 className="display mt-3 text-3xl sm:text-5xl">{HOME_TITLES.main.h1}</h1>
        <p className="mt-2 max-w-3xl text-ink-2"><Inline text={HOME_INTRO} facts={facts} /></p>
      </section>

      <section className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="min-w-0">
          {/* Rendered with the page, not behind Suspense: a 288 px fallback swapped for the full board (1,148 px on
              a phone) pushed the alert setup down 860 px after the first paint (PSI CLS 0.149 in some runs). */}
          <Board model={model} c={c} />
        </div>
        <HomeAlertSetup catalog={buildPhoneCatalog()} signInOnly={startSignIn} next={next}
          start={{ model: start.requested ? start.initialModel : undefined, storage: start.initialStorage, color: start.initialColor, store: start.initialStore, state: start.initialState, city: start.initialCity }} />
      </section>

      <section className="mt-6 flex flex-wrap items-center gap-2 text-sm text-ink-3">
        <span>Also tracking:</span>
        {MODELS.filter((m) => m.key !== model).map((m) => <Link key={m.key} href={`/?model=${m.key}`} className="chip px-3 py-1.5 text-xs">{m.name}</Link>)}
        <Link href="/map" className="chip px-3 py-1.5 text-xs">Live map</Link>
        <Link href="/stores" className="chip px-3 py-1.5 text-xs">Stores by state</Link>
      </section>

      {/* The country-wide answer to "did the Duo restock in the last 24 hours, and which configuration?", in one sentence and a table. */}
      <div className="mt-6"><Last24Hours data={recent} label="in the US" stores={storesOf("us")} country="us" alert={alertHref({ model: "duo" })} /></div>

      <RelatedBlock title="Browse stock by place">
        <BrowsePopular />
        <BrowseModels />
      </RelatedBlock>

      <div className="mx-auto mt-12 max-w-3xl">
        <KeywordSections sections={sections} facts={facts} />
        <section className="pane mt-10 p-5" aria-labelledby="sellout-h">
          <h2 id="sellout-h" className="text-xl font-semibold">How fast do iPhone restocks sell out?</h2>
          <div className="mt-3"><SellOutTimes data={sell} label="at US Apple Stores" showStore /></div>
        </section>
        <div className="mt-10"><RichFaq items={HOME_FAQ} facts={facts} title="Questions" /></div>
        <div className="mt-8"><SourceList sources={HOME_SOURCES} facts={facts} /></div>
      </div>
    </div>
  );
}

/** Live board for one model in one country: who has it right now, the latest real restocks, and where to dig deeper. */
async function Board({ model, c }: { model: ModelKey; c: Country }) {
  const H = t().pages.home;
  const lang = pageLocale().lang;
  const N = namesFor(lang, c.cc);
  const meta = modelByKey(model)!;
  const cc = c.cc;
  const p = prefixOf(cc);
  const [feed, counts, rows] = await Promise.all([restockFeed({ model, limit: 8, country: cc }), restockCounts({ model, country: cc }), stockByStore(model, {}, cc)]);
  const inStock = rows.filter((r) => r.availableParts.length > 0);
  const newest = rows.reduce<Date | null>((a, r) => (r.lastCheckedAt && (!a || r.lastCheckedAt > a) ? r.lastCheckedAt : a), null);
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Link href={`${p}/stock/${meta.slug}`} className={`min-w-0 rounded-2xl border p-3 ${inStock.length ? "border-accent/30 bg-accent/[0.06]" : "border-line bg-[var(--pane-solid)]"}`}>
          <div className="flex items-center gap-1.5 text-2xl font-semibold tabular-nums"><Dot state={inStock.length ? "ok" : "idle"} live={inStock.length > 0} />{inStock.length}</div>
          <div className="truncate text-xs text-ink-3">{H.storesWith(bidi(meta.short, lang))}</div>
        </Link>
        <Link href={`${restocksPath(cc)}?model=${model}`} className="min-w-0 rounded-2xl border border-line bg-[var(--pane-solid)] p-3">
          <div className="text-2xl font-semibold tabular-nums">{counts.day}</div>
          <div className="truncate text-xs text-ink-3">{H.restocks24}<span className="hidden sm:inline">{H.week(counts.week)}</span></div>
        </Link>
        <div className="min-w-0 rounded-2xl border border-line bg-[var(--pane-solid)] p-3">
          <div className="truncate text-2xl font-semibold tabular-nums"><LiveChecked iso={newest} model={model} country={cc === "us" ? undefined : cc} /></div>
          <div className="truncate text-xs text-ink-3">{H.lastCheck}</div>
        </div>
      </div>
      {inStock.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {inStock.slice(0, 6).map((r) => { const s = STORE_INDEX.get(r.storeNumber); return s ? <Link key={r.storeNumber} href={productPath(productFor(model), storePlace(s))} className="rounded-full bg-accent/15 px-2.5 py-1 text-xs text-accent hover:bg-accent/25">{N.store(s)} · {r.availableParts.length}</Link> : null; })}
          {inStock.length > 6 && <Link href={`${p}/stock/${meta.slug}`} className="rounded-full bg-ink/6 px-2.5 py-1 text-xs text-ink-2">{H.more(inStock.length - 6)}</Link>}
        </div>
      )}
      <div className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">{H.latest(bidi(meta.short, lang))}</div>
      <RestockFeed rows={feed} model={model} showModel={false} emptyText={H.none(bidi(meta.short, lang))} />
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={`${restocksPath(cc)}?model=${model}`} className="btn btn-ghost btn-sm">{H.allRestocks}</Link>
        <Link href={`${mapPath(cc)}?model=${model}`} className="btn btn-ghost btn-sm">{H.modelMap(bidi(meta.short, lang))}</Link>
        <a href={appleFamilyUrl(model, cc)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">{H.buy}</a>
        <Link href={`${p}/stock/${meta.slug}`} className="btn btn-ghost btn-sm">{H.liveStock(bidi(meta.short, lang))}</Link>
      </div>
    </>
  );
}

/** Another country's home, in English or one of its languages: the same board and alert setup over its stores, with copy built from its own numbers. */
async function IntlHome({ c, sp }: { c: Country; sp: SearchParams }) {
  const cc = c.cc;
  const loc = pageLocale();
  const lang = loc.lang;
  const P = t().place;
  const H = t().pages.home;
  const N = namesFor(lang, cc);
  const catalog = buildPhoneCatalog(cc, lang);
  const start = startFromPool((k) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined), catalog.stores ?? [], catalog.configs);
  const model: ModelKey = start.model ?? "duo";
  const startSignIn = sp.signin === "1";
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const [facts0, sell, recent, rt] = await Promise.all([getFacts(cc), sellouts({ country: cc }), recentByConfig({ country: cc }), duoRestockTimes(cc)]);
  const facts = lang === "en" ? facts0 : { ...facts0, lang };
  const stores = storesOf(cc);
  const n = stores.length;
  const index = placeTarget(cc);
  const p = prefixOf(cc);
  const pageUrl = pathInLocale(p, loc);
  const m = facts.models;
  const sections: KeywordSection[] = P.homeSections({
    cc,
    storesNow: { duo: m.duo.storesNow, "18-pro": m["18-pro"].storesNow, "18-pro-max": m["18-pro-max"].storesNow },
    restocks: { duo: m.duo.restocks, "18-pro": m["18-pro"].restocks, "18-pro-max": m["18-pro-max"].restocks },
    restocksPath: restocksPath(cc),
    index: index ? { path: index.path, indexable: index.indexable } : null,
  });
  const rtPath = `${p}/iphone-duo-restock-times`;
  // Native versions add the restock-times question; five at most (the base spec), so "can you reserve it" goes.
  const faq: Faq[] = P.homeFaq(cc, { n: rt.n, stores: rt.stores, storesTotal: rt.storesTotal, peakHour: rt.peakHour, path: rtPath }).slice(0, loc.native ? 5 : undefined);
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebApplication", name: P.home.appName(cc), url: `https://pickupchecker.com${pageUrl}`, applicationCategory: "UtilitiesApplication", operatingSystem: "Web, iOS and Android (Home Screen app)", areaServed: { "@type": "Country", name: c.name }, offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: P.home.offer }, publisher: { "@type": "Organization", name: "PickupChecker" }, ...(loc.native ? { inLanguage: loc.tag } : {}) },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "PickupChecker", item: "https://pickupchecker.com/" }, { "@type": "ListItem", position: 2, name: lang === "en" ? c.name : N.country() }] },
    ],
  };
  return (
    <div className="mx-auto max-w-6xl px-4">
      <JsonLd data={ld} />
      <JsonLd data={itemListJsonLd(P.home.itemList(cc), stores)} />

      <section className="pt-6 sm:pt-10">
        <div className="eyebrow inline-flex items-center gap-2"><span className="dot dot-ok dot-live" /> {H.live} · {P.allStoresPhrase(cc)} · {t().pages.common.checkNote}</div>
        <h1 className="display mt-3 text-3xl sm:text-5xl">{P.homeH1(cc)}</h1>
        <p className="mt-2 max-w-3xl text-ink-2"><Inline text={P.homeIntro(cc)} facts={facts} /></p>
      </section>

      <section className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="min-w-0"><Board model={model} c={c} /></div>
        <HomeAlertSetup catalog={catalog} signInOnly={startSignIn} next={next} start={start} />
      </section>

      <section className="mt-6 flex flex-wrap items-center gap-2 text-sm text-ink-3">
        <span>{H.alsoTracking}</span>
        {MODELS.filter((x) => x.key !== model).map((x) => <Link key={x.key} href={`${p}?model=${x.key}`} className="chip px-3 py-1.5 text-xs">{x.name}</Link>)}
        <Link href={mapPath(cc)} className="chip px-3 py-1.5 text-xs">{H.liveMap}</Link>
        {index && <Link href={index.path} className="chip px-3 py-1.5 text-xs">{index.indexable ? (c.regionNoun && n > 3 ? P.home.storesByRegion(cc) : H.allStores) : N.apple(stores[0])}</Link>}
        {loc.native && <Link href={rtPath} className="chip px-3 py-1.5 text-xs">{P.home.restockTimesChip}</Link>}
      </section>

      <div className="mt-6"><Last24Hours data={recent} label={P.home.last24Label(cc)} stores={stores} country={cc} alert={alertHref({ model: "duo", country: cc })} /></div>

      <RelatedBlock title={P.home.browse(cc)}>
        <BrowseCountryPopular country={c} />
        <BrowseCountryModels country={c} />
      </RelatedBlock>

      <div className="mx-auto mt-12 max-w-3xl">
        <KeywordSections sections={sections} facts={facts} />
        <section className="pane mt-10 p-5" aria-labelledby="sellout-h">
          <h2 id="sellout-h" className="text-xl font-semibold">{P.home.selloutH2(cc)}</h2>
          <div className="mt-3"><SellOutTimes data={sell} label={P.home.selloutLabel(cc)} showStore={n > 1} /></div>
        </section>
        <div className="mt-10"><RichFaq items={faq} facts={facts} title={H.questions} /></div>
        <div className="mt-8"><SourceList sources={[P.sources(cc as Exclude<typeof cc, "us">).pickupHelp, P.sources(cc as Exclude<typeof cc, "us">).storeList, P.sources(cc as Exclude<typeof cc, "us">).tax, { label: P.home.newsroom, url: "https://www.apple.com/newsroom/2026/10/iphone-duo-arrives-at-apple-store-locations-worldwide/" }]} facts={facts} where={P.allStoresPhrase(cc)} since={t().pages.common.since} /></div>
      </div>
    </div>
  );
}
