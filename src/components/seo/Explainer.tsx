import Link from "next/link";
import { explainer, ALERT_RULE } from "@/lib/seo/enrich";

/** "How in-store pickup works at Apple {place}": the fixed process, place-interpolated, plus the alert rule. */
export function Explainer({ kind, place, alertHref }: { kind: "state" | "city" | "store" | "model"; place: string; alertHref: string }) {
  const title = kind === "model" ? `How in-store pickup works for the ${place}` : `How in-store pickup works at ${kind === "store" ? place : `Apple Stores in ${place}`}`;
  return (
    <section className="pane p-5 sm:p-6" aria-labelledby="explainer">
      <h2 id="explainer" className="text-xl font-semibold">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-2 sm:text-base">
        {explainer(kind, place).map((p, i) => <p key={i}>{p}</p>)}
        <p>{ALERT_RULE} <Link href={alertHref} className="font-medium text-ink underline">Set one up →</Link></p>
      </div>
    </section>
  );
}
