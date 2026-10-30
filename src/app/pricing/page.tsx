import type { Metadata } from "next";
import Link from "next/link";
import { PAID_PLANS, PLANS } from "@/lib/plans";
import { PlanButton } from "@/components/site/PlanButton";

export const metadata: Metadata = { title: "Pricing — 10 alerts $5, 20 for $10, 50 for $20", description: "iPhone pickup-stock alerts at every US Apple Store, on your phone within seconds. Plus $5/month for 10 alerts, Pro $10 for 20, Max $20 for 50. Cancel anytime.", alternates: { canonical: "/pricing" } };

const NOTE: Record<string, string> = { plus: "1 iPhone × 10 stores", pro: "2 iPhones × 10 stores", max: "5 iPhones × 10 stores" };

export default function Pricing() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-10">
      <h1 className="display text-3xl sm:text-5xl">Pricing</h1>
      <p className="mt-3 text-lg text-ink-2">One alert = one store × one exact iPhone. All 269 US Apple Stores, every 20 s, notification within seconds. Browsing is free.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {PAID_PLANS.map((k) => {
          const plan = PLANS[k];
          return (
            <div key={k} className={`pane flex flex-col p-6 ${k === "plus" ? "border-accent/40" : ""}`}>
              <div className="flex items-center justify-between"><div className="text-lg font-semibold">{plan.name}</div><span className="text-xs text-ink-3">{NOTE[k]}</span></div>
              <div className="mt-3 flex items-baseline gap-2"><span className="display text-5xl">${plan.priceUsd}</span><span className="text-ink-3">/ month</span></div>
              <div className="mt-2 text-2xl font-semibold">{plan.limit} alerts</div>
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
