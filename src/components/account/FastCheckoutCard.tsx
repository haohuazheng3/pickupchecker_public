/**
 * The dashboard's "reserve it in 20 seconds" card: the five things a member does before the next alert so the
 * push leaves four taps, with the guide and their own restock window one tap away. Lives next to "When your
 * stores restock"; the median lifetime is the site-wide figure (siteFacts, cached an hour).
 */
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { duoRestockTimes } from "@/lib/content/restockTimes";
import { medianBand } from "@/lib/stock/sellouts";
import { SPEED } from "@/lib/plans";

export async function FastCheckoutCard() {
  // The same US figure the guide quotes (every timed sell-out since tracking began), so the two never disagree.
  const t = await duoRestockTimes("us");
  const band = t.sellout ? `about ${medianBand(t.sellout.medianSec)}` : "about a minute";
  const steps: [string, React.ReactNode][] = [
    ["Find your window", <>the hours below are your stores&apos; own; be staged ten minutes before.</>],
    ["Stage Apple's checkout", <>the exact storage and colour, through to the Delivery &amp; Pickup sheet, Apple Pay set. Stay on it.</>],
    ["Tick the terms, or go unlocked", <>a carrier agreement un-ticks when the sheet reloads; unlocked, paid in full, has none.</>],
    ["Keep the screen awake", <>Auto-Lock → Never for the window; touch the sheet every 10–15 minutes.</>],
    ["Alert: read it, don't tap it", <>Pickup – In-Store → the store it named → first slot → Apple Pay.</>],
  ];
  return (
    <section className="pane p-5 sm:p-6" aria-labelledby="fast-checkout">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="fast-checkout" className="text-xl font-semibold">Reserve it in 20 seconds</h2>
        <span className="text-xs text-ink-3">before the next alert</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">A typical iPhone Duo listing at a US Apple Store lasts {band}; the push reaches you about {SPEED.alertSec} seconds after we confirm it. Do everything except the last four taps now.</p>
      <ol className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {steps.map(([title, text], i) => (
          <li key={title} className="flex gap-2.5">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-[var(--accent-ink)]">{i + 1}</span>
            <span className="text-ink-2"><b className="text-ink">{title}:</b> {text}</span>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/how-to-grab-an-iphone-duo-restock" className="btn btn-primary btn-sm">Read the 2-minute guide</Link>
        <a href="#restock-times" className="btn btn-ghost btn-sm">Your restock window</a>
      </div>
    </section>
  );
}
