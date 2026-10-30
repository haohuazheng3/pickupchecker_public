import { PendingLink as Link } from "@/components/ui/PendingLink";
import { MODELS, modelByKey, STORE_INDEX, appleFamilyUrl, type ModelKey } from "@/lib/apple/catalog";
import { restockFeed, restockCounts, stockByStore } from "@/lib/stock/queries";
import { HomeAlertSetup } from "@/components/alerts/AlertSetup";
import { buildPhoneCatalog } from "@/components/alerts/catalog";
import { wizardStartFrom } from "@/lib/wizardStart";
import { productFor, productPath, storePlace } from "@/lib/seo/products";
import { RestockFeed } from "@/components/restocks/RestockFeed";
import { Dot } from "@/components/stock/StatusBits";
import { LiveAgo } from "@/components/site/LiveAgo";
import { BrowseModels, BrowsePopular } from "@/components/seo/Browse";
import { RelatedBlock } from "@/components/seo/Related";
import type { Metadata } from "next";
import { HOME_TITLES } from "@/content/titles";
import { HOME_INTRO, HOME_SECTIONS, HOME_FAQ, HOME_SOURCES } from "@/content/home";
import { getFacts } from "@/lib/content/facts";
import { Inline } from "@/components/content/Inline";
import { KeywordSections, slugId } from "@/components/content/KeywordSections";
import { RichFaq, SourceList } from "@/components/content/RichFaq";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: `${HOME_TITLES.main.title} · PickupChecker` },
  description: HOME_TITLES.description,
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "PickupChecker", title: HOME_TITLES.main.title, description: HOME_TITLES.description, url: "/" },
};

/** Home: the Duo restock board first (that is what visitors come for), the alert setup (phones × stores) beside it, the pitch below. */
export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
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
        <div className="eyebrow inline-flex items-center gap-2"><span className="dot dot-ok dot-live" /> Live · all 269 US Apple Stores · checked every 20 s</div>
        <h1 className="display mt-3 text-3xl sm:text-5xl">{HOME_TITLES.main.h1}</h1>
        <p className="mt-2 max-w-3xl text-ink-2"><Inline text={HOME_INTRO} facts={facts} /></p>
      </section>

      <section className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="min-w-0">
          {/* Rendered with the page, not behind Suspense: a 288 px fallback swapped for the full board (1,148 px on
              a phone) pushed the alert setup down 860 px after the first paint (PSI CLS 0.149 in some runs). */}
          <Board model={model} />
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

/** Live board for one model: who has it right now, the latest real restocks, and where to dig deeper. */
async function Board({ model }: { model: ModelKey }) {
  const meta = modelByKey(model)!;
  const [feed, counts, rows] = await Promise.all([restockFeed({ model, limit: 8 }), restockCounts({ model }), stockByStore(model)]);
  const inStock = rows.filter((r) => r.availableParts.length > 0);
  const newest = rows.reduce<Date | null>((a, r) => (r.lastCheckedAt && (!a || r.lastCheckedAt > a) ? r.lastCheckedAt : a), null);
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Link href={`/stock/${meta.slug}`} className={`min-w-0 rounded-2xl border p-3 ${inStock.length ? "border-accent/30 bg-accent/[0.06]" : "border-line bg-[var(--pane-solid)]"}`}>
          <div className="flex items-center gap-1.5 text-2xl font-semibold tabular-nums"><Dot state={inStock.length ? "ok" : "idle"} live={inStock.length > 0} />{inStock.length}</div>
          <div className="truncate text-xs text-ink-3">stores with {meta.short}</div>
        </Link>
        <Link href={`/restocks?model=${model}`} className="min-w-0 rounded-2xl border border-line bg-[var(--pane-solid)] p-3">
          <div className="text-2xl font-semibold tabular-nums">{counts.day}</div>
          <div className="truncate text-xs text-ink-3">restocks 24 h<span className="hidden sm:inline"> · {counts.week} wk</span></div>
        </Link>
        <div className="min-w-0 rounded-2xl border border-line bg-[var(--pane-solid)] p-3">
          <div className="truncate text-2xl font-semibold tabular-nums"><LiveAgo iso={newest} /></div>
          <div className="truncate text-xs text-ink-3">last check</div>
        </div>
      </div>
      {inStock.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {inStock.slice(0, 6).map((r) => { const s = STORE_INDEX.get(r.storeNumber); return s ? <Link key={r.storeNumber} href={productPath(productFor(model), storePlace(s))} className="rounded-full bg-accent/15 px-2.5 py-1 text-xs text-accent hover:bg-accent/25">{s.name} · {r.availableParts.length}</Link> : null; })}
          {inStock.length > 6 && <Link href={`/stock/${meta.slug}`} className="rounded-full bg-ink/6 px-2.5 py-1 text-xs text-ink-2">+{inStock.length - 6} more</Link>}
        </div>
      )}
      <div className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">Latest {meta.short} restocks</div>
      <RestockFeed rows={feed} model={model} showModel={false} emptyText={`No ${meta.short} restocks yet.`} />
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={`/restocks?model=${model}`} className="btn btn-ghost btn-sm">All restocks</Link>
        <Link href={`/map?model=${model}`} className="btn btn-ghost btn-sm">{meta.short} map</Link>
        <a href={appleFamilyUrl(model)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">Buy on apple.com</a>
        <Link href={`/stock/${meta.slug}`} className="btn btn-ghost btn-sm">Live {meta.short} stock</Link>
      </div>
    </>
  );
}
