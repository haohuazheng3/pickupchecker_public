/**
 * A country's home: / (the US) and /{cc}. The live board for one model (stores with it, restocks, last check,
 * the latest restocks) beside the alert setup, then the keyword sections, FAQ and sources. The US keeps its
 * hand-written copy (content/home.ts); another country's copy is built from its own live numbers, prices,
 * tax rule and stores (seo.md §12: "iPhone Stock Checker {Country}: {n} Apple Stores, Checked Every 15s").
 */
import type { Metadata } from "next";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { MODELS, modelByKey, STORE_INDEX, appleFamilyUrl, storesOf, placeTarget, mapPath, restocksPath, type ModelKey } from "@/lib/apple/catalog";
import { prefixOf, theName, type Country } from "@/lib/apple/countries";
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
import { getFacts } from "@/lib/content/facts";
import { Inline } from "@/components/content/Inline";
import { KeywordSections, slugId, type KeywordSection } from "@/components/content/KeywordSections";
import { RichFaq, SourceList } from "@/components/content/RichFaq";
import { itemListJsonLd } from "@/lib/seo/enrich";
import { allStoresPhrase, homeH1, homeTitle, modelRows, priceSection, spreadPhrase, taxFaqIntl } from "@/lib/seo/countryCopy";
import { regionWord } from "@/lib/seo/countryLinks";
import { TAX_SOURCES, pickupHelp, storeListSource } from "@/content/country-tax";
import type { Faq } from "@/lib/content/types";
import { hreflangFor, INTL_TRACKING_LABEL } from "./shared";

type SearchParams = Record<string, string | string[] | undefined>;

/** The home's metadata: the US one as it always was (plus hreflang), another country's from its formula. */
export function homeMetadata(c: Country): Metadata {
  const languages = hreflangFor("home");
  if (c.cc === "us") {
    return {
      title: { absolute: `${HOME_TITLES.main.title} · PickupChecker` },
      description: HOME_TITLES.description,
      alternates: { canonical: "/", languages },
      openGraph: { type: "website", siteName: "PickupChecker", title: HOME_TITLES.main.title, description: HOME_TITLES.description, url: "/" },
    };
  }
  const n = storesOf(c.cc).length;
  const title = homeTitle(c.cc);
  const description = `Check iPhone Duo, 18 Pro and 18 Pro Max pickup stock at ${allStoresPhrase(c.cc)}, live every 15 seconds. ${n === 1 ? "Prices" : "Restock times, prices"} in ${c.currency}; a push when your store restocks.`;
  const url = prefixOf(c.cc);
  return { title: { absolute: `${title} · PickupChecker` }, description, alternates: { canonical: url, languages }, openGraph: { type: "website", siteName: "PickupChecker", title, description, url } };
}

/** Home: the Duo restock board first (that is what visitors come for), the alert setup (phones × stores) beside it, the pitch below. */
export async function HomePage({ country: c, searchParams: sp }: { country: Country; searchParams: SearchParams }) {
  if (c.cc !== "us") return <IntlHome c={c} sp={sp} />;
  const start = wizardStartFrom((k) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined));
  const model: ModelKey = start.initialModel;
  const startSignIn = sp.signin === "1";
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const facts = await getFacts();
  const sections = HOME_TITLES.h2.map((h) => ({ id: slugId(h.keyword), h2: h.title, ...HOME_SECTIONS[h.keyword] }));
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", name: "PickupChecker", url: "https://pickupchecker.com", logo: "https://pickupchecker.com/icon.svg" },
      { "@type": "WebSite", name: "PickupChecker", url: "https://pickupchecker.com" },
      { "@type": "WebApplication", name: "PickupChecker iPhone stock checker", url: "https://pickupchecker.com", applicationCategory: "UtilitiesApplication", operatingSystem: "Web, iOS and Android (Home Screen app)", offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Live stock, map and restock log are free; alerts from $5/month" }, publisher: { "@type": "Organization", name: "PickupChecker" } },
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

      <RelatedBlock title="Browse stock by place">
        <BrowsePopular />
        <BrowseModels />
      </RelatedBlock>

      <div className="mx-auto mt-12 max-w-3xl">
        <KeywordSections sections={sections} facts={facts} />
        <div className="mt-10"><RichFaq items={HOME_FAQ} facts={facts} title="Questions" /></div>
        <div className="mt-8"><SourceList sources={HOME_SOURCES} facts={facts} /></div>
      </div>
    </div>
  );
}

/** Live board for one model in one country: who has it right now, the latest real restocks, and where to dig deeper. */
async function Board({ model, c }: { model: ModelKey; c: Country }) {
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
          <div className="truncate text-xs text-ink-3">stores with {meta.short}</div>
        </Link>
        <Link href={`${restocksPath(cc)}?model=${model}`} className="min-w-0 rounded-2xl border border-line bg-[var(--pane-solid)] p-3">
          <div className="text-2xl font-semibold tabular-nums">{counts.day}</div>
          <div className="truncate text-xs text-ink-3">restocks 24 h<span className="hidden sm:inline"> · {counts.week} wk</span></div>
        </Link>
        <div className="min-w-0 rounded-2xl border border-line bg-[var(--pane-solid)] p-3">
          <div className="truncate text-2xl font-semibold tabular-nums"><LiveChecked iso={newest} model={model} country={cc === "us" ? undefined : cc} /></div>
          <div className="truncate text-xs text-ink-3">last check</div>
        </div>
      </div>
      {inStock.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {inStock.slice(0, 6).map((r) => { const s = STORE_INDEX.get(r.storeNumber); return s ? <Link key={r.storeNumber} href={productPath(productFor(model), storePlace(s))} className="rounded-full bg-accent/15 px-2.5 py-1 text-xs text-accent hover:bg-accent/25">{s.name} · {r.availableParts.length}</Link> : null; })}
          {inStock.length > 6 && <Link href={`${p}/stock/${meta.slug}`} className="rounded-full bg-ink/6 px-2.5 py-1 text-xs text-ink-2">+{inStock.length - 6} more</Link>}
        </div>
      )}
      <div className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">Latest {meta.short} restocks</div>
      <RestockFeed rows={feed} model={model} showModel={false} emptyText={`No ${meta.short} restocks yet.`} />
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={`${restocksPath(cc)}?model=${model}`} className="btn btn-ghost btn-sm">All restocks</Link>
        <Link href={`${mapPath(cc)}?model=${model}`} className="btn btn-ghost btn-sm">{meta.short} map</Link>
        <a href={appleFamilyUrl(model, cc)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">Buy on apple.com</a>
        <Link href={`${p}/stock/${meta.slug}`} className="btn btn-ghost btn-sm">Live {meta.short} stock</Link>
      </div>
    </>
  );
}

/** Another country's home: the same board and alert setup over its stores, with copy built from its own numbers. */
async function IntlHome({ c, sp }: { c: Country; sp: SearchParams }) {
  const cc = c.cc;
  const catalog = buildPhoneCatalog(cc);
  const start = startFromPool((k) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined), catalog.stores ?? [], catalog.configs);
  const model: ModelKey = start.model ?? "duo";
  const startSignIn = sp.signin === "1";
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const facts = await getFacts(cc);
  const stores = storesOf(cc);
  const n = stores.length;
  const where = theName(c);
  const index = placeTarget(cc);
  const p = prefixOf(cc);
  const unit = c.unit === "mi" ? "miles" : "kilometres";
  const intro = `Right now the iPhone Duo is in stock for pickup at **{{duo.storesNow}} of ${n}** Apple Store${n === 1 ? "" : "s"} ${c.inName}, the iPhone 18 Pro at **{{pro.storesNow}}** and the iPhone 18 Pro Max at **{{pm.storesNow}}**. Every store is re-checked every 15 seconds, and the stores your alerts point at every 5. Browse for free, or pick your stores and exact phone and get a push the moment one lists it.`;
  const sections: KeywordSection[] = [
    {
      id: "iphone-stock",
      h2: `iPhone stock ${c.inName}: Duo, 18 Pro and Pro Max by store`,
      lead: `This checker reads apple.com's in-store pickup availability for every configuration at ${allStoresPhrase(cc)} (${spreadPhrase(cc)}), every 15 seconds, and shows the answer by store${n > 1 ? `, by ${c.regionNoun ?? "city"}` : ""} and by configuration. Prices and part numbers are Apple's ${c.adjective} ones.`,
      blocks: [
        { t: "table", head: ["Model", "Configurations", "Stores with stock now", "Restocks logged"], rows: modelRows(cc, { duo: facts.models.duo.storesNow, "18-pro": facts.models["18-pro"].storesNow, "18-pro-max": facts.models["18-pro-max"].storesNow }, { duo: facts.models.duo.restocks, "18-pro": facts.models["18-pro"].restocks, "18-pro-max": facts.models["18-pro-max"].restocks }), caption: `What the check covers ${c.inName}, as of {{asOf}}` },
        { t: "p", text: `A change only counts after a second check confirms it, so one glitchy response from apple.com never shows up as a fake restock or a fake sell-out. Every confirmed change goes into the [restock log](${restocksPath(cc)}), which is where the restock-time charts on ${index?.indexable ? `[the store pages](${index.path})` : "the store page"} come from.` },
        { t: "img", id: "phone-notification" },
      ],
    },
    priceSection(cc, where),
    {
      id: "alerts",
      h2: `Apple Store stock checker ${c.inName} with restock alerts`,
      lead: `Checking is free; the paid part is not having to check. Pick the Apple Store${n === 1 ? "" : "s"} you can reach and the exact phone, and your phone gets a push seconds after ${n === 1 ? "the store" : "any of those stores"} lists it for in-store pickup.`,
      blocks: [
        { t: "ol", items: [
          "Tap **Alert me** and choose the iPhone, storage and color.",
          n === 1 ? `Tick the store: ${stores[0].name} in ${stores[0].city}.` : `Tick the stores you can get to; the nearest are listed first, with ${unit} by road and drive time.`,
          "On an iPhone, add PickupChecker to your Home Screen and allow notifications ([how to install](/install)).",
          "When the push arrives, open apple.com from it and check out with in-store pickup at that store.",
        ] },
        { t: "p", text: `One alert is one store and one exact configuration. Plans are billed in US dollars: Plus $5 a month for 10 alerts, Pro $10 for 20 and Max $20 for 50 ([pricing](/pricing)). Our honest view: the Duo is worth alerts at every store you can reach; for the 18 Pro and Pro Max, look at the live numbers first.` },
        { t: "img", id: "apple-store-pickup-counter" },
      ],
    },
  ];
  const faq: Faq[] = [
    { q: `Which Apple Stores ${c.inName} have the iPhone Duo right now?`, a: `{{duo.storesNow}} of ${n} at the last check ({{asOf}}). [iPhone Duo stock ${c.inName}](${p}/stock/iphone-duo) names each store and configuration, updated every 15 seconds.` },
    { q: "How fast are the alerts?", a: `The stores your alerts point at are checked every 5 seconds, every Apple Store ${c.inName} every 15. A first "available" is checked again within a second so an Apple glitch never becomes an alert, and the push reaches your phone about 3 seconds after that.` },
    { q: "What does it cost?", a: "Live stock, the map and the restock log are free. Alerts are Plus $5/month for 10, Pro $10 for 20 and Max $20 for 50, billed in US dollars; cancel anytime ([pricing](/pricing))." },
    taxFaqIntl(cc, where),
    { q: "Can you reserve the phone for me?", a: `No. We tell you the instant a store lists it; you buy on apple.com with in-store pickup, and Apple holds it for you ([Apple's pickup help](${pickupHelp(cc).url})).` },
  ];
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebApplication", name: `PickupChecker iPhone stock checker ${c.short}`, url: `https://pickupchecker.com${p}`, applicationCategory: "UtilitiesApplication", operatingSystem: "Web, iOS and Android (Home Screen app)", areaServed: { "@type": "Country", name: c.name }, offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Live stock, map and restock log are free; alerts from $5/month" }, publisher: { "@type": "Organization", name: "PickupChecker" } },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "PickupChecker", item: "https://pickupchecker.com/" }, { "@type": "ListItem", position: 2, name: c.name }] },
    ],
  };
  return (
    <div className="mx-auto max-w-6xl px-4">
      <JsonLd data={ld} />
      <JsonLd data={itemListJsonLd(`Apple Stores ${c.inName}`, stores)} />

      <section className="pt-6 sm:pt-10">
        <div className="eyebrow inline-flex items-center gap-2"><span className="dot dot-ok dot-live" /> Live · {allStoresPhrase(cc)} · {CHECK_NOTE}</div>
        <h1 className="display mt-3 text-3xl sm:text-5xl">{homeH1(cc)}</h1>
        <p className="mt-2 max-w-3xl text-ink-2"><Inline text={intro} facts={facts} /></p>
      </section>

      <section className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="min-w-0"><Board model={model} c={c} /></div>
        <HomeAlertSetup catalog={catalog} signInOnly={startSignIn} next={next} start={start} />
      </section>

      <section className="mt-6 flex flex-wrap items-center gap-2 text-sm text-ink-3">
        <span>Also tracking:</span>
        {MODELS.filter((m) => m.key !== model).map((m) => <Link key={m.key} href={`${p}?model=${m.key}`} className="chip px-3 py-1.5 text-xs">{m.name}</Link>)}
        <Link href={mapPath(cc)} className="chip px-3 py-1.5 text-xs">Live map</Link>
        {index && <Link href={index.path} className="chip px-3 py-1.5 text-xs">{index.indexable ? (c.regionNoun && n > 3 ? `Stores by ${regionWord(cc)}` : "All stores") : `Apple ${stores[0].name}`}</Link>}
      </section>

      <RelatedBlock title={`Browse stock ${c.inName}`}>
        <BrowseCountryPopular country={c} />
        <BrowseCountryModels country={c} />
      </RelatedBlock>

      <div className="mx-auto mt-12 max-w-3xl">
        <KeywordSections sections={sections} facts={facts} />
        <div className="mt-10"><RichFaq items={faq} facts={facts} title="Questions" /></div>
        <div className="mt-8"><SourceList sources={[pickupHelp(cc), storeListSource(cc), TAX_SOURCES[cc as Exclude<typeof cc, "us">], { label: "Apple Newsroom: iPhone Duo arrives at Apple Store locations worldwide (Oct 23, 2026)", url: "https://www.apple.com/newsroom/2026/10/iphone-duo-arrives-at-apple-store-locations-worldwide/" }]} facts={facts} where={allStoresPhrase(cc)} since={INTL_TRACKING_LABEL} /></div>
      </div>
    </div>
  );
}

