import type { Metadata } from "next";
import Link from "next/link";
import { MODELS } from "@/lib/apple/catalog";
export const metadata: Metadata = { title: "Pricing — $5/month per iPhone model", description: "One $5/month subscription per iPhone model: unlimited pickup-stock alerts for every US Apple Store. Cancel anytime.", alternates: { canonical: "/pricing" } };
export default function Pricing() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-10">
      <h1 className="display text-3xl sm:text-5xl">Simple pricing</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-2">One subscription per model. Everything else is included: every store, every configuration, as many alerts as you want.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {MODELS.map((m) => (
          <div key={m.key} className="pane p-6">
            <div className="text-lg font-semibold">{m.name} alerts</div>
            <div className="mt-3 flex items-baseline gap-2"><span className="display text-5xl">$5</span><span className="text-ink-3">/ month</span></div>
            <ul className="mt-4 space-y-2 text-sm text-ink-2">
              <li>✓ All 269 US Apple Stores</li>
              <li>✓ Any storage · any color · any store set</li>
              <li>✓ Unlimited alerts for this model</li>
              <li>✓ Phone notification (or email) within seconds of a restock</li>
              <li>✓ Cancel anytime, keep alerts until month end</li>
            </ul>
            <Link href={`/?model=${m.key}#notify`} className="btn btn-primary mt-6 w-full">Get {m.short} alerts</Link>
          </div>
        ))}
      </div>
      <div className="pane prose-site mt-8 p-6 sm:p-8">
        <h2>Why not free?</h2>
        <p>Checking every store every 20 seconds costs real infrastructure, and free alert lists get so large that everyone hears late. A small fee keeps the list short and the alerts fast.</p>
        <h2>Refunds</h2>
        <p>If PickupChecker didn&apos;t work for you, write to us within 7 days of a charge and we&apos;ll refund it. See the <Link href="/refunds">refund policy</Link>.</p>
      </div>
    </div>
  );
}
