import Link from "next/link";
import { Suspense } from "react";
import { MODELS, DEFAULT_MODEL, modelByKey, STORE_INDEX, type ModelKey } from "@/lib/apple/catalog";
import { restockFeed, restockCounts, stockByStore } from "@/lib/stock/queries";
import { WizardServer } from "@/components/wizard/WizardServer";
import { RestockFeed } from "@/components/restocks/RestockFeed";
import { Dot, timeAgo } from "@/components/stock/StatusBits";

export const dynamic = "force-dynamic";

/** Home: the Duo restock board first (that is what visitors come for), the alert wizard beside it, the pitch below. */
export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const requested = typeof sp.model === "string" && modelByKey(sp.model) ? (sp.model as ModelKey) : null;
  const model: ModelKey = requested ?? DEFAULT_MODEL;
  const meta = modelByKey(model)!;
  const initialStore = typeof sp.store === "string" && STORE_INDEX.has(sp.store) ? sp.store : undefined;
  const startSignIn = sp.signin === "1";
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const faq = [
    ["How fast are the alerts?", "Every Apple Store in the US is re-checked continuously, typically every 20 seconds. The notification reaches your phone within seconds of a store flipping to \"available\" for pickup."],
    ["What's free and what's paid?", "Every account gets one alert rule free, forever: one model, the storages and colors you'd take, and nearby stores, hand-picked stores or the whole country. Plus ($5/month) holds 10 rules, Pro ($10/month) 20. Paid plans renew monthly until you cancel."],
    ["How do I get notifications on my iPhone?", "Add PickupChecker to your Home Screen from Safari (Share → Add to Home Screen), open it from there, sign in and tap Turn on notifications. The install guide walks you through it in a minute."],
    ["Can you reserve the phone for me?", "No. We tell you the instant it's available; you reserve it on apple.com or in the Apple Store app. Pickup stock often lasts minutes, so the speed of the alert is what matters."],
    ["Is this affiliated with Apple?", "No. PickupChecker is an independent service that reads the same public availability apple.com shows shoppers. Apple, iPhone and Apple Store are trademarks of Apple Inc."],
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
        <p className="mt-2 max-w-2xl text-ink-2">Set one free alert and your phone buzzes when a {meta.short} is available for in-store pickup near you.</p>
      </section>

      <section className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="pane p-5 sm:p-6">
          <Suspense fallback={<div className="skeleton h-72" />}>
            <Board model={model} />
          </Suspense>
        </div>
        <WizardServer initialModel={requested ?? DEFAULT_MODEL} initialStore={initialStore} startSignIn={startSignIn} next={next} />
      </section>

      <section className="mt-6 flex flex-wrap items-center gap-2 text-sm text-ink-3">
        <span>Also tracking:</span>
        {MODELS.filter((m) => m.key !== model).map((m) => <Link key={m.key} href={`/?model=${m.key}`} className="chip px-3 py-1.5 text-xs">{m.name}</Link>)}
        <Link href="/map" className="chip px-3 py-1.5 text-xs">Live map</Link>
        <Link href="/stores" className="chip px-3 py-1.5 text-xs">Stores by state</Link>
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-3">
        {[
          ["Every store, every 20 seconds", "Not just the 12 stores apple.com shows you. All 269 US locations, re-checked around the clock from our own servers."],
          ["A notification in seconds", "Add PickupChecker to your Home Screen and a restock lands on your lock screen like a text: the store, the exact configuration, one tap to reserve."],
          ["Only what you asked for", "Your storage, your colors, your stores. One alert per restock, never a repeat while it's still in stock. First rule free."],
        ].map(([t, d]) => (
          <div key={t} className="pane p-5">
            <h2 className="font-semibold">{t}</h2>
            <p className="mt-1.5 text-sm text-ink-2">{d}</p>
          </div>
        ))}
      </section>

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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">{meta.name} right now</div>
          <div className="mt-1 flex items-baseline gap-2"><span className="display text-4xl">{inStock.length}</span><span className="text-ink-2">store{inStock.length === 1 ? "" : "s"} with pickup stock</span></div>
        </div>
        <div className="text-right text-xs text-ink-3">
          <div className="inline-flex items-center gap-1.5"><Dot state={newest ? "ok" : "warn"} live={Boolean(newest)} /> checked {timeAgo(newest)}</div>
          <div>{counts.day} restock{counts.day === 1 ? "" : "s"} in 24 h · {counts.week} this week</div>
        </div>
      </div>
      {inStock.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {inStock.slice(0, 6).map((r) => { const s = STORE_INDEX.get(r.storeNumber); return s ? <Link key={r.storeNumber} href={`/map?store=${r.storeNumber}&model=${model}`} className="rounded-full bg-accent/15 px-2.5 py-1 text-xs text-accent hover:bg-accent/25">{s.name} · {r.availableParts.length}</Link> : null; })}
          {inStock.length > 6 && <Link href={`/stock/${meta.slug}`} className="rounded-full bg-white/8 px-2.5 py-1 text-xs text-ink-2">+{inStock.length - 6} more</Link>}
        </div>
      )}
      <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-3">Latest {meta.short} restocks</div>
      <RestockFeed rows={feed} model={model} showModel={false} emptyText={`No ${meta.short} restocks recorded yet — the next one shows here within seconds.`} />
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={`/restocks?model=${model}`} className="btn btn-ghost btn-sm">All restocks</Link>
        <Link href={`/map?model=${model}`} className="btn btn-ghost btn-sm">{meta.short} map</Link>
        <Link href={`/stock/${meta.slug}`} className="btn btn-ghost btn-sm">Live {meta.short} stock</Link>
      </div>
    </>
  );
}
