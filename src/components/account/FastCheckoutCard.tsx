/**
 * The dashboard's "reserve it in 20 seconds" card: five numbered steps, two to four words each, so the push
 * leaves four taps; the guide and the member's own restock window one tap away. Lives next to "When your stores
 * restock"; the typical lifetime is the same US figure the guide quotes, so the two never disagree.
 */
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { duoRestockTimes } from "@/lib/content/restockTimes";
import { SPEED } from "@/lib/plans";
import { Stat, StatGrid, StepStrip } from "@/components/ui/Viz";
import { t } from "@/lib/i18n/server";

export async function FastCheckoutCard() {
  const d = t().account.fast, u = t().account.units;
  const times = await duoRestockTimes("us");
  const median = times.sellout?.medianSec ?? null;
  return (
    <section className="pane p-5 sm:p-6" aria-labelledby="fast-checkout">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="fast-checkout" className="text-xl font-semibold">{d.title}</h2>
        <span className="text-xs text-ink-3">{d.sub}</span>
      </div>
      <StatGrid cols={3} className="mt-3">
        <Stat value={median ?? "~60"} unit={u.s} label={d.lasts} tone="warn" />
        <Stat value={SPEED.alertSec} unit={u.s} label={d.push} />
        <Stat value="4" unit={u.taps} label={d.tapsLeft} tone="accent" />
      </StatGrid>
      <StepStrip className="mt-3" steps={d.steps} />
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/how-to-grab-an-iphone-duo-restock" className="btn btn-primary btn-sm">{d.guide}</Link>
        <a href="#restock-times" className="btn btn-ghost btn-sm">{d.window}</a>
      </div>
    </section>
  );
}
