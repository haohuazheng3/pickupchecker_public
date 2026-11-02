import type { Metadata } from "next";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { OTHER_TRACKERS, PAID_PLANS, PLANS, SPEED, SPEED_PERKS } from "@/lib/plans";
import { PlanButton } from "@/components/site/PlanButton";

export const metadata: Metadata = { title: "Pricing — 10 alerts $5, 20 for $10, 50 for $20", description: `iPhone pickup-stock alerts at every US Apple Store: your stores checked every ${SPEED.fastSec} seconds, a push about ${SPEED.alertSec} seconds after a restock. Plus $5/month for 10 alerts, Pro $10 for 20, Max $20 for 50. Cancel anytime.`, alternates: { canonical: "/pricing" } };

const NOTE: Record<string, string> = { plus: "1 iPhone × 10 stores", pro: "2 iPhones × 10 stores", max: "5 iPhones × 10 stores" };

export default function Pricing() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-10">
      <h1 className="display text-3xl sm:text-5xl">Pricing</h1>
      <p className="mt-3 text-lg text-ink-2">One alert = one store × one exact iPhone. All 269 US Apple Stores. Browsing is free.</p>

      <div className="pane mt-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-8 sm:p-6">
        <div className="flex-1">
          <div className="font-semibold">The fastest published check interval of any iPhone stock tracker</div>
          <p className="mt-1 text-sm text-ink-2">Your stores every {SPEED.fastSec} seconds, where other trackers publish {OTHER_TRACKERS}. Most iPhone Duo restocks are gone within 2 minutes, and every plan gets the same speed.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-8">
          <div><div className="display text-4xl text-accent">{SPEED.fastSec} s</div><div className="text-xs text-ink-3">your stores re-checked</div></div>
          <div><div className="display text-4xl text-accent">~{SPEED.alertSec} s</div><div className="text-xs text-ink-3">confirmed restock to your phone</div></div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {PAID_PLANS.map((k) => {
          const plan = PLANS[k];
          return (
            <div key={k} className={`pane flex flex-col p-6 ${k === "plus" ? "border-accent/40" : ""}`}>
              <div className="flex items-center justify-between"><div className="text-lg font-semibold">{plan.name}</div><span className="text-xs text-ink-3">{NOTE[k]}</span></div>
              <div className="mt-3 flex items-baseline gap-2"><span className="display text-5xl">${plan.priceUsd}</span><span className="text-ink-3">/ month</span></div>
              <div className="mt-2 text-2xl font-semibold">{plan.limit} alerts</div>
              <ul className="mt-4 space-y-1.5 text-sm text-ink-2">
                {SPEED_PERKS.map((p) => <li key={p} className="flex gap-2"><span className="text-accent" aria-hidden>✓</span>{p}</li>)}
                <li className="flex gap-2"><span className="text-accent" aria-hidden>✓</span>Cancel anytime</li>
              </ul>
              <div className="flex-1" />
              <PlanButton plan={k} label={`Get ${plan.name}`} primary={k === "plus"} />
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-sm text-ink-3">Stripe billing, card or Link. Plan changes are prorated. Not for you? <Link href="/refunds" className="underline">Refund within 7 days</Link>.</p>
    </div>
  );
}
