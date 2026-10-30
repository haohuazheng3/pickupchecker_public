import type { Faq, Source } from "@/lib/content/types";
import type { Facts } from "@/lib/content/facts";
import { JsonLd } from "@/components/seo/JsonLd";
import { Inline, plainText } from "./Inline";

/** FAQ with inline links and live tokens; FAQPage JSON-LD carries the plain-text answers. Open by default so readers and crawlers see the answers. */
export function RichFaq({ items, facts, title = "FAQ", id = "faq" }: { items: Faq[]; facts: Facts; title?: string; id?: string }) {
  if (items.length === 0) return null;
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: plainText(f.a, facts) } })) };
  return (
    <section id={id} className="scroll-mt-24" aria-labelledby={`${id}-h`}>
      <JsonLd data={ld} />
      <h2 id={`${id}-h`} className="text-2xl font-semibold">{title}</h2>
      <div className="mt-2 divide-y divide-line">
        {items.map((f) => (
          <details key={f.q} className="group py-3" open>
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-ink [&::-webkit-details-marker]:hidden"><h3 className="text-base font-semibold">{f.q}</h3><span className="mt-0.5 shrink-0 text-ink-3 transition-transform group-open:rotate-45" aria-hidden>+</span></summary>
            <p className="mt-2 leading-relaxed text-ink-2"><Inline text={f.a} facts={facts} /></p>
          </details>
        ))}
      </div>
    </section>
  );
}

/** "Sources" list: our own tracker first (with the as-of time), then the outside sources. */
export function SourceList({ sources, facts }: { sources: Source[]; facts: Facts }) {
  return (
    <section className="text-sm" aria-labelledby="src-h">
      <h2 id="src-h" className="text-lg font-semibold">Sources</h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-2">
        <li>PickupChecker live tracker: every iPhone Duo, 18 Pro and 18 Pro Max configuration at all 269 US Apple Stores, checked about every 20 seconds since <Inline text="{{trackingSince}}" facts={facts} />; numbers on this page as of <Inline text="{{asOf}}" facts={facts} />.</li>
        {sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-ink">{s.label}</a></li>)}
      </ol>
    </section>
  );
}
