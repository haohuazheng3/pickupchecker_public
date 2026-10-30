import { PendingLink as Link } from "@/components/ui/PendingLink";

export interface Crumb { href?: string; label: string }

/** Breadcrumb trail + BreadcrumbList JSON-LD (the last crumb is the current page). */
export function Breadcrumbs({ items, base = "https://pickupchecker.com" }: { items: Crumb[]; base?: string }) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, ...(c.href ? { item: `${base}${c.href}` } : {}) })),
  };
  return (
    <nav className="text-sm text-ink-3" aria-label="Breadcrumb">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      {items.map((c, i) => (
        <span key={i}>{i > 0 && " / "}{c.href ? <Link href={c.href} className="hover:text-ink">{c.label}</Link> : <span className="text-ink-2">{c.label}</span>}</span>
      ))}
    </nav>
  );
}

export interface RelatedLink { href: string; label: string; meta?: string }

/** A titled row of link chips, with an optional "more" link. */
export function LinkRow({ title, links, more, className = "" }: { title: string; links: RelatedLink[]; more?: RelatedLink; className?: string }) {
  if (links.length === 0) return null;
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3"><div className="eyebrow">{title}</div>{more && <Link href={more.href} className="text-xs text-ink-3 hover:text-ink">{more.label} →</Link>}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {links.map((l) => <Link key={l.href + l.label} href={l.href} className="chip px-3 py-1.5 text-xs">{l.label}{l.meta && <span className="text-ink-3"> · {l.meta}</span>}</Link>)}
      </div>
    </div>
  );
}

/** Container for the "keep exploring" block at the bottom of an SEO page. */
export function RelatedBlock({ children, title = "Keep exploring" }: { children: React.ReactNode; title?: string }) {
  return (
    <section className="pane mt-8 space-y-5 p-5 sm:p-6" aria-label={title}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
