import { PendingLink as Link } from "@/components/ui/PendingLink";
import { ALERT_RULE } from "@/lib/seo/enrich";
import { Points } from "@/components/ui/Viz";

/**
 * "In-store pickup at {place}": the fixed process as three keyword cards (what pickup stock is, how often it is
 * checked, what the log feeds), place-interpolated, plus the one-line alert rule. The same facts enrich.ts spells
 * out as paragraphs (`explainer`), shown as key words.
 */
export function Explainer({ kind, place, alertHref }: { kind: "state" | "city" | "store" | "model"; place: string; alertHref: string }) {
  const title = kind === "model" ? `${place} in-store pickup` : `In-store pickup ${kind === "store" ? "at" : "in"} ${place}`;
  const at = kind === "store" ? place : kind === "model" ? "every US Apple Store" : `Apple Stores in ${place}`;
  const cards: { title: string; items: { text: React.ReactNode; no?: boolean }[] }[] = [
    { title: "Pickup stock is sold online", items: [
      { text: <>Buy on <b className="text-ink">apple.com</b> → pick the store → pay</> },
      { text: <>Collect in store, often <b className="text-ink">same day</b> · photo ID + QR code</> },
      { text: <>Separate from shelf stock and carrier stores</>, no: true },
    ] },
    { title: "Checked every 15 seconds", items: [
      { text: <>Every configuration at {at}: <b className="text-ink">every 15 seconds</b></> },
      { text: <>Stores an alert points at: <b className="text-ink">every 5</b></> },
      { text: <>A change counts only after a <b className="text-ink">second</b> confirming check</> },
    ] },
    { title: "Every change is logged", items: [
      { text: <>Feeds the <b className="text-ink">restock chart</b> and history on this page</> },
      { text: <>A glitch never becomes a false restock or sell-out</> },
    ] },
  ];
  return (
    <section className="pane p-5 sm:p-6" aria-labelledby="explainer">
      <h2 id="explainer" className="text-xl font-semibold">{title}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {cards.map((c, i) => (
          <div key={c.title} className="pane-2 p-4">
            <div className="flex items-center gap-2"><span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-[var(--accent-ink)]">{i + 1}</span><h3 className="text-sm font-semibold text-ink">{c.title}</h3></div>
            <Points items={c.items} className="mt-2.5" />
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-ink-2">{ALERT_RULE} <Link href={alertHref} className="font-medium text-ink underline">Set an alert →</Link></p>
    </section>
  );
}
