import Link from "next/link";
import { Suspense } from "react";
import { MODELS, modelByKey, STORE_INDEX, appleFamilyUrl, type ModelKey } from "@/lib/apple/catalog";
import { restockFeed, restockCounts, stockByStore } from "@/lib/stock/queries";
import { WizardServer } from "@/components/wizard/WizardServer";
import { wizardStartFrom } from "@/lib/wizardStart";
import { productFor, productPath, storePlace } from "@/lib/seo/products";
import { RestockFeed } from "@/components/restocks/RestockFeed";
import { Dot } from "@/components/stock/StatusBits";
import { LiveAgo } from "@/components/site/LiveAgo";
import { BrowseModels, BrowsePopular } from "@/components/seo/Browse";
import { RelatedBlock } from "@/components/seo/Related";

export const dynamic = "force-dynamic";

/** Home: the Duo restock board first (that is what visitors come for), the alert wizard beside it, the pitch below. */
export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const start = wizardStartFrom((k) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined));
  const model: ModelKey = start.initialModel;
  const meta = modelByKey(model)!;
  const startSignIn = sp.signin === "1";
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const faq = [
    ["How fast are the alerts?", "Every US Apple Store is re-checked about every 20 seconds; your phone gets the notification seconds after a store flips to available."],
    ["What is one alert?", "One Apple Store × one exact phone (model, storage, color), so three stores are three alerts."],
    ["What does it cost?", "Plus $5/month for 10 alerts, Pro $10 for 20, Max $20 for 50; live stock, the map and the restock log are free."],
    ["How do I get notifications on my iPhone?", "Add PickupChecker to your Home Screen from Safari, open it from there, sign in and turn on notifications."],
    ["Can you reserve the phone for me?", "No. We tell you the instant it's available; you reserve on apple.com or in the Apple Store app."],
  ];
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", name: "PickupChecker", url: "https://pickupchecker.com", logo: "https://pickupchecker.com/icon.svg" },
      { "@type": "WebSite", name: "PickupChecker", url: "https://pickupchecker.com" },
      { "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
    ],
  };
  return (
    <div className="mx-auto max-w-6xl px-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />

      <section className="pt-6 sm:pt-10">
        <div className="eyebrow inline-flex items-center gap-2"><span className="dot dot-ok dot-live" /> Live · all 269 US Apple Stores · checked every 20 s</div>
        <h1 className="display mt-3 text-3xl sm:text-5xl">{meta.name} restocks, the second they happen.</h1>
        <p className="mt-2 max-w-2xl text-ink-2">Pick your stores and the exact {meta.short}. Your phone buzzes when it&apos;s in stock for pickup.</p>
      </section>

      <section className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="min-w-0">
          <Suspense fallback={<div className="skeleton h-72 rounded-2xl" />}>
            <Board model={model} />
          </Suspense>
        </div>
        <WizardServer initialModel={start.initialModel} initialStorage={start.initialStorage} initialColor={start.initialColor} initialStore={start.initialStore} initialState={start.initialState} initialCity={start.initialCity} startSignIn={startSignIn} next={next} />
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

      <section className="mt-16">
        <h2 className="display text-2xl sm:text-3xl">Questions</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {faq.map(([q, a]) => (
            <details key={q} className="pane-2 group p-4">
              <summary className="cursor-pointer list-none font-semibold">{q}</summary>
              <p className="mt-2 text-sm text-ink-2">{a}</p>
            </details>
          ))}
        </div>
      </section>
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
          <div className="truncate text-xs text-ink-3">{meta.short} in stock · stores</div>
        </Link>
        <Link href={`/restocks?model=${model}`} className="min-w-0 rounded-2xl border border-line bg-[var(--pane-solid)] p-3">
          <div className="text-2xl font-semibold tabular-nums">{counts.day}</div>
          <div className="truncate text-xs text-ink-3">restocks 24 h · {counts.week} wk</div>
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
