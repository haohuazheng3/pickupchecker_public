import { faqJsonLd, type FaqItem } from "@/lib/seo/enrich";
import { t } from "@/lib/i18n/server";
import { JsonLd } from "./JsonLd";

/** Questions as native details/summary (no JS) plus FAQPage structured data. */
export function Faq({ items, title }: { items: FaqItem[]; title?: string }) {
  if (items.length === 0) return null;
  return (
    <section className="pane p-5 sm:p-6" aria-labelledby="faq">
      <JsonLd data={faqJsonLd(items)} />
      <h2 id="faq" className="text-xl font-semibold">{title ?? t().content.faqTitle}</h2>
      <div className="mt-2 divide-y divide-line">
        {items.map((f) => (
          <details key={f.q} className="group py-3">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 font-medium text-ink [&::-webkit-details-marker]:hidden">
              <span>{f.q}</span>
              <span className="mt-0.5 shrink-0 text-ink-3 transition-transform group-open:rotate-45" aria-hidden>+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
