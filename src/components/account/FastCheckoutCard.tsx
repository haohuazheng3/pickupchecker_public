/**
 * The dashboard's "reserve it in 20 seconds" card: five numbered steps, two to four words each, so the push
 * leaves four taps; the guide and the member's own restock window one tap away. Lives next to "When your stores
 * restock"; the typical lifetime is the same US figure the guide quotes, so the two never disagree.
 */
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { duoRestockTimes } from "@/lib/content/restockTimes";
import { SPEED } from "@/lib/plans";
import { Stat, StatGrid, StepStrip } from "@/components/ui/Viz";

export async function FastCheckoutCard() {
  const t = await duoRestockTimes("us");
  const median = t.sellout?.medianSec ?? null;
  return (
    <section className="pane p-5 sm:p-6" aria-labelledby="fast-checkout">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="fast-checkout" className="text-xl font-semibold">Reserve it in 20 seconds</h2>
        <span className="text-xs text-ink-3">do everything but the last four taps now</span>
      </div>
      <StatGrid cols={3} className="mt-3">
        <Stat value={median ?? "~60"} unit="s" label="a typical Duo listing lasts" tone="warn" />
        <Stat value={SPEED.alertSec} unit="s" label="confirmed → push on your phone" />
        <Stat value="4" unit="taps" label="left for you once the push lands" tone="accent" />
      </StatGrid>
      <StepStrip
        className="mt-3"
        steps={[
          { title: "Find your window", hint: "your stores' hours, below · staged 10 min early" },
          { title: "Stage Apple's checkout", hint: "exact storage + colour → Delivery & Pickup" },
          { title: "Tick terms · or go unlocked", hint: "unlocked, paid in full: no box at all" },
          { title: "Keep it awake", hint: "Auto-Lock → Never · touch it every 10–15 min" },
          { title: "Alert: read, don't tap", hint: "Pickup → the store named → first slot → Apple Pay" },
        ]}
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/how-to-grab-an-iphone-duo-restock" className="btn btn-primary btn-sm">The 2-minute guide</Link>
        <a href="#restock-times" className="btn btn-ghost btn-sm">Your restock window</a>
      </div>
    </section>
  );
}
