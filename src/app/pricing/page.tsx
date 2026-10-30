import type { Metadata } from "next";
import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { PlanButton } from "@/components/site/PlanButton";

export const metadata: Metadata = { title: "Pricing — 10 alerts for $5, 20 for $10", description: "iPhone pickup-stock alerts: Plus is $5/month for 10 alert rules, Pro $10/month for 20. Every US Apple Store, phone notifications within seconds, cancel anytime. Live stock, the map and the restock log are free to browse.", alternates: { canonical: "/pricing" } };

export default function Pricing() {
  const rows = [
    { plan: PLANS.plus, cta: <PlanButton plan="plus" label="Get Plus · $5/mo" primary />, note: "Most people" },
    { plan: PLANS.pro, cta: <PlanButton plan="pro" label="Get Pro · $10/mo" />, note: "Power users & families" },
  ];
  return (
    <div className="mx-auto max-w-5xl px-4 pt-10">
      <h1 className="display text-3xl sm:text-5xl">Simple pricing</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-2">Two plans, both with every US Apple Store, every configuration and phone notifications within seconds. Live stock, the map and the restock log are free to browse, no account needed.</p>
      <div className="mt-8 grid gap-4 md:max-w-3xl md:grid-cols-2">
        {rows.map(({ plan, cta, note }) => (
          <div key={plan.key} className={`pane flex flex-col p-6 ${plan.key === "plus" ? "border-accent/40" : ""}`}>
            <div className="flex items-center justify-between"><div className="text-lg font-semibold">{plan.name}</div><span className="text-xs text-ink-3">{note}</span></div>
            <div className="mt-3 flex items-baseline gap-2"><span className="display text-5xl">${plan.priceUsd}</span><span className="text-ink-3">/ month</span></div>
            <div className="mt-2 text-sm text-ink-2">{plan.limit} alert rules</div>
            <ul className="mt-4 flex-1 space-y-2 text-sm text-ink-2">
              <li>✓ All 269 US Apple Stores, checked every 20 s</li>
              <li>✓ Any model · any storage · any color · any store set</li>
              <li>✓ Phone notification (or email) within seconds of a restock</li>
              <li>✓ Renews monthly, cancel anytime from your account</li>
            </ul>
            {cta}
          </div>
        ))}
      </div>
      <div className="pane prose-site mt-8 p-6 sm:p-8">
        <h2>What counts as an alert rule?</h2>
        <p>One rule is one model with the storage sizes, colors and stores you&apos;d accept — for example &ldquo;iPhone Duo, 256 GB or 512 GB, any color, within 50 miles of 10001&rdquo;. A rule can cover the whole country. You need more rules when you watch several models, want different settings for different places, or hunt for more than one phone.</p>
        <h2>Why isn&apos;t there a free alert?</h2>
        <p>Checking every store every 20 seconds costs real infrastructure, and free alert lists grow until everyone hears late. Keeping alerts paid keeps the list short and the notification fast — which is the whole point. Everything else on the site is free: <Link href="/stock/iphone-duo">live stock</Link>, the <Link href="/map">map</Link> and the <Link href="/restocks">restock log</Link>.</p>
        <h2>Billing</h2>
        <p>Plans are monthly subscriptions through Stripe (card or Link) that renew until you cancel. Switching between Plus and Pro is prorated immediately. If PickupChecker didn&apos;t work for you, write to us within 7 days of a charge and we&apos;ll refund it — see the <Link href="/refunds">refund policy</Link>.</p>
      </div>
    </div>
  );
}
