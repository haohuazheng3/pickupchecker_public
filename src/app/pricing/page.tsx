import type { Metadata } from "next";
import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { PlanButton } from "@/components/site/PlanButton";

export const metadata: Metadata = { title: "Pricing — first alert free, 10 for $5, 20 for $10", description: "Your first iPhone pickup-stock alert is free. Plus is $5/month for 10 alert rules, Pro $10/month for 20. Every US Apple Store, phone notifications, cancel anytime.", alternates: { canonical: "/pricing" } };

export default function Pricing() {
  const rows = [
    { plan: PLANS.free, cta: <Link href="/#notify" className="btn btn-ghost mt-6 w-full">Start free</Link>, note: "No card needed" },
    { plan: PLANS.plus, cta: <PlanButton plan="plus" label="Get Plus · $5/mo" primary />, note: "Most people" },
    { plan: PLANS.pro, cta: <PlanButton plan="pro" label="Get Pro · $10/mo" />, note: "Power users & families" },
  ];
  return (
    <div className="mx-auto max-w-5xl px-4 pt-10">
      <h1 className="display text-3xl sm:text-5xl">Simple pricing</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-2">Your first alert rule is free. Pay only when you want to watch more at once. Every plan covers all 269 US Apple Stores, every configuration and phone notifications.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {rows.map(({ plan, cta, note }) => (
          <div key={plan.key} className={`pane flex flex-col p-6 ${plan.key === "plus" ? "border-accent/40" : ""}`}>
            <div className="flex items-center justify-between"><div className="text-lg font-semibold">{plan.name}</div><span className="text-xs text-ink-3">{note}</span></div>
            <div className="mt-3 flex items-baseline gap-2"><span className="display text-5xl">${plan.priceUsd}</span><span className="text-ink-3">/ month</span></div>
            <div className="mt-2 text-sm text-ink-2">{plan.limit} alert rule{plan.limit > 1 ? "s" : ""}</div>
            <ul className="mt-4 flex-1 space-y-2 text-sm text-ink-2">
              <li>✓ All 269 US Apple Stores, checked every 20 s</li>
              <li>✓ Any model · any storage · any color · any store set</li>
              <li>✓ Phone notification (or email) within seconds of a restock</li>
              <li>{plan.priceUsd ? "✓ Renews monthly, cancel anytime from your account" : "✓ Free forever, no card"}</li>
            </ul>
            {cta}
          </div>
        ))}
      </div>
      <div className="pane prose-site mt-8 p-6 sm:p-8">
        <h2>What counts as an alert rule?</h2>
        <p>One rule is one model with the storage sizes, colors and stores you&apos;d accept — for example &ldquo;iPhone 18 Pro, 256 GB or 512 GB, any color, within 50 miles of 10001&rdquo;. A rule can cover the whole country. You need more rules when you watch several models, want different settings for different people, or follow several cities.</p>
        <h2>Why not free for everything?</h2>
        <p>Checking every store every 20 seconds costs real infrastructure, and free alert lists get so large that everyone hears late. One free rule lets you see it work; the paid plans keep the list short and the alerts fast.</p>
        <h2>Billing</h2>
        <p>Paid plans are monthly subscriptions through Stripe (card or Link) that renew until you cancel. Switching between Plus and Pro is prorated immediately. If PickupChecker didn&apos;t work for you, write to us within 7 days of a charge and we&apos;ll refund it — see the <Link href="/refunds">refund policy</Link>.</p>
      </div>
    </div>
  );
}
