import { PendingLink as Link } from "@/components/ui/PendingLink";
import { explainer, ALERT_RULE } from "@/lib/seo/enrich";

/** "In-store pickup at {place}": the fixed process in three short paragraphs, place-interpolated, plus the alert rule. */
export function Explainer({ kind, place, alertHref }: { kind: "state" | "city" | "store" | "model"; place: string; alertHref: string }) {
  const title = kind === "model" ? `${place} in-store pickup` : `In-store pickup ${kind === "store" ? "at" : "in"} ${place}`;
  return (
    <section className="pane p-5 sm:p-6" aria-labelledby="explainer">
      <h2 id="explainer" className="text-xl font-semibold">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-2 sm:text-base">
        {explainer(kind, place).map((p, i) => <p key={i}>{p}</p>)}
        <p>{ALERT_RULE} <Link href={alertHref} className="font-medium text-ink underline">Set an alert →</Link></p>
      </div>
    </section>
  );
}
