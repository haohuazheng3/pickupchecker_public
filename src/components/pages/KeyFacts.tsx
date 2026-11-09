/**
 * The "Key facts" list under the lead of the restock-times pages (the national and country pages, their region and
 * city pages, and the US state and city pages): short sentences that each stand alone when an answer engine quotes one
 * (place, iPhone Duo, number, window, sample). The sentences come from the page (views.restockTimes.keyFacts for the
 * multilingual pages); this only lays them out.
 */
export function KeyFacts({ title, items, className = "mt-5" }: { title: string; items: string[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="key-facts" className={`pane-2 p-4 sm:p-5 ${className}`}>
      <h2 id="key-facts" className="text-xs font-semibold uppercase tracking-wide text-ink-3">{title}</h2>
      <ul className="mt-2 space-y-1.5 text-sm leading-snug text-ink-2">
        {items.map((s) => (
          <li key={s} className="flex gap-2"><span aria-hidden className="mt-[0.5em] size-1.5 shrink-0 rounded-full bg-accent" /><span className="min-w-0">{s}</span></li>
        ))}
      </ul>
    </section>
  );
}
