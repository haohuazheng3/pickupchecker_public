import Link from "next/link";
import { Suspense } from "react";
import { MODELS, modelByKey, type ModelKey } from "@/lib/apple/catalog";
import { WizardServer } from "@/components/wizard/WizardServer";
import { RecentRestocks } from "@/components/stock/RecentRestocks";
import { LiveStats } from "@/components/stock/LiveStats";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const initialModel = typeof sp.model === "string" && modelByKey(sp.model) ? (sp.model as ModelKey) : undefined;
  const startSignIn = sp.signin === "1";
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const faq = [
    ["How fast are the alerts?", "Every Apple Store in the US is re-checked continuously, typically every 20 seconds. The notification reaches your phone within seconds of a store flipping to \"available\" for pickup."],
    ["How do I get notifications on my iPhone?", "Add PickupChecker to your Home Screen from Safari (Share → Add to Home Screen), open it from there, sign in and tap Turn on notifications. The install guide walks you through it in a minute. No device set up? Alerts go to your email instead."],
    ["Does $5 cover every store?", "Yes. One subscription covers one iPhone model (for example iPhone 18 Pro) with as many alerts as you like: any storage, any color, nearby stores, hand-picked stores or the whole country."],
    ["Can you reserve the phone for me?", "No. We tell you the instant it's available; you reserve it on apple.com or in the Apple Store app. Pickup stock often lasts minutes, so the speed of the alert is what matters."],
    ["Is this affiliated with Apple?", "No. PickupChecker is an independent service that reads the same public availability apple.com shows shoppers. Apple, iPhone and Apple Store are trademarks of Apple Inc."],
    ["How do I cancel?", "From your account page, any time. Alerts keep running until the end of the paid month."],
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
      <section className="grid items-start gap-8 pt-10 sm:pt-16 lg:grid-cols-[1.05fr_1fr]">
        <div className="lg:pt-6">
          <div className="eyebrow mb-4 inline-flex items-center gap-2"><span className="dot dot-ok dot-live" /> Live across all 269 US Apple Stores</div>
          <h1 className="display text-4xl sm:text-6xl">Know the second your iPhone is in a store near you.</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-2">PickupChecker watches in-store pickup availability for the iPhone 18 Pro, 18 Pro Max and iPhone Duo at every Apple Store in the United States and pings your phone the moment yours shows up. $5 a month, cancel anytime.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#notify" className="btn btn-primary btn-lg">Get notified</a>
            <Link href="/stock/iphone-18-pro" className="btn btn-ghost btn-lg">See live stock</Link>
          </div>
          <Suspense fallback={<div className="skeleton mt-8 h-16 max-w-md" />}>
            <LiveStats />
          </Suspense>
        </div>
        <WizardServer initialModel={initialModel} startSignIn={startSignIn} next={next} />
      </section>

      <section className="mt-20 grid gap-4 md:grid-cols-3">
        {[
          ["Every store, around the clock", "Not just the 12 stores apple.com shows you. We cover all 269 US locations and re-check them continuously."],
          ["A notification in seconds", "Add PickupChecker to your Home Screen and a restock lands on your lock screen like a text: the store, the exact configuration, one tap to reserve on apple.com."],
          ["No noise", "Only the configurations and stores you asked for. One alert per restock, never a repeat while it's still in stock."],
        ].map(([t, d]) => (
          <div key={t} className="pane p-6">
            <h2 className="text-lg font-semibold">{t}</h2>
            <p className="mt-2 text-ink-2">{d}</p>
          </div>
        ))}
      </section>

      <section className="mt-20 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="pane p-6 sm:p-8">
          <h2 className="display text-2xl sm:text-3xl">Live stock by model</h2>
          <p className="mt-2 text-ink-2">Public pages, no account needed. Alerts are the paid part. Prefer a picture? <Link href="/map" className="underline underline-offset-4 hover:text-ink">See every store on the map →</Link></p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {MODELS.map((m) => (
              <Link key={m.key} href={`/stock/${m.slug}`} className="pane-2 pane-hover p-5">
                <div className="font-semibold">{m.name}</div>
                <div className="mt-1 text-sm text-ink-3">Stores with pickup stock right now →</div>
              </Link>
            ))}
          </div>
        </div>
        <div className="pane p-6">
          <div className="eyebrow">Recent restocks</div>
          <Suspense fallback={<div className="skeleton mt-3 h-40" />}>
            <RecentRestocks limit={8} />
          </Suspense>
        </div>
      </section>

      <section className="mt-20">
        <h2 className="display text-2xl sm:text-3xl">Questions</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {faq.map(([q, a]) => (
            <details key={q} className="pane-2 group p-5">
              <summary className="cursor-pointer list-none font-semibold">{q}</summary>
              <p className="mt-2 text-ink-2">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
