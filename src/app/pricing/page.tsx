import type { Metadata } from "next";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { OTHER_TRACKERS, PAID_PLANS, PLANS, SPEED, SPEED_PERKS } from "@/lib/plans";
import { siteFacts } from "@/lib/content/siteFacts";
import { medianBand } from "@/lib/stock/sellouts";
import { PlanButton } from "@/components/site/PlanButton";
import { Chips, Points, Stat, StatGrid } from "@/components/ui/Viz";

export const metadata: Metadata = { title: "Pricing — 10 alerts $5, 20 for $10, 50 for $20", description: `iPhone pickup-stock alerts at every US Apple Store: your stores checked every ${SPEED.fastSec} seconds, a push about ${SPEED.alertSec} seconds after a restock. Plus $5/month for 10 alerts, Pro $10 for 20, Max $20 for 50. Cancel anytime.`, alternates: { canonical: "/pricing" } };

const NOTE: Record<string, string> = { plus: "1 iPhone × 10 stores", pro: "2 iPhones × 10 stores", max: "5 iPhones × 10 stores" };

export const dynamic = "force-dynamic";

export default async function Pricing() {
  const ds = (await siteFacts()).duoSellout;
  return (
    <div className="mx-auto max-w-5xl px-4 pt-10">
      <h1 className="display text-3xl sm:text-5xl">Pricing</h1>
      <p className="mt-3 text-lg text-ink-2"><b className="text-ink">One alert = one store × one exact iPhone.</b> Browsing is free.</p>
      <Chips className="mt-3" items={["All 269 US Apple Stores", "Cancel anytime", "Card or Link"]} />

      <div className="pane mt-6 grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="font-semibold">The fastest published check interval of any iPhone stock tracker</div>
          <Points className="mt-3" items={[
            { text: <>Your stores every <b className="text-ink">{SPEED.fastSec} seconds</b> · other trackers publish {OTHER_TRACKERS}</> },
            { text: <>A typical iPhone Duo restock sells out in <b className="text-ink">{ds ? medianBand(ds.medianSec) : "about a minute"}</b>, some in 20–30 seconds</>, no: true },
            { text: <>Every plan gets the same speed</>, step: true },
          ]} />
        </div>
        <StatGrid cols={3} className="lg:min-w-[26rem]">
          <Stat value={`${SPEED.fastSec}`} unit="s" label="your stores re-checked" tone="accent" />
          <Stat value={`~${SPEED.alertSec}`} unit="s" label="confirmed restock to your phone" tone="accent" />
          <Stat value={ds ? `${ds.medianSec}` : "~60"} unit="s" label="typical Duo listing, listed to gone" tone="warn" />
        </StatGrid>
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
      <Points className="mt-6" items={[
        { text: <>Stripe billing · card or Link · plan changes prorated</> },
        { text: <>Not for you? <Link href="/refunds" className="underline">Full refund within 7 days</Link> if no restock alert has reached you yet</> },
      ]} />
    </div>
  );
}
