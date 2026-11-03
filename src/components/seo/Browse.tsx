import { PendingLink as Link } from "@/components/ui/PendingLink";
import { MODELS, DEFAULT_MODEL } from "@/lib/apple/catalog";
import { stateRefs, topStates, topCities, cityLabel } from "@/lib/seo/links";
import { t } from "@/lib/i18n/server";
import { LinkRow } from "./Related";

/** Every state as a chip (current one highlighted). */
export function BrowseStates({ current, title }: { current?: string; title?: string }) {
  const d = t().content.browse;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3"><div className="eyebrow">{title ?? d.storesByState}</div><Link href="/stores" className="text-xs text-ink-3 hover:text-ink">{d.allStatesCities}</Link></div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {stateRefs().map((s) => <Link key={s.slug} href={s.href} className="chip px-3 py-1.5 text-xs" data-on={s.name === current}>{s.name}<span className="text-ink-3"> · {s.count}</span></Link>)}
      </div>
    </div>
  );
}

/** Model pages + the per-model restock logs and maps. */
export function BrowseModels({ current, title }: { current?: string; title?: string }) {
  const d = t().content.browse;
  return (
    <LinkRow
      title={title ?? d.liveByModel}
      links={[
        ...MODELS.map((m) => ({ href: `/stock/${m.slug}`, label: d.modelStock(m.name), meta: m.key === current ? d.thisPage : undefined })),
        ...MODELS.map((m) => ({ href: `/restocks?model=${m.key}`, label: d.restockLog(m.short) })),
        { href: `/map?model=${DEFAULT_MODEL}`, label: d.liveMap },
      ]}
    />
  );
}

/** Popular states and cities — the broad entry points, used on the home page, footer-level pages and logs. */
export function BrowsePopular({ states = 10, cities = 12 }: { states?: number; cities?: number }) {
  const d = t().content.browse;
  return (
    <div className="space-y-5">
      <LinkRow title={d.mostStores} links={topStates(states).map((s) => ({ href: s.href, label: s.name, meta: String(s.count) }))} more={{ href: "/stores", label: d.allStates }} />
      <LinkRow title={d.bigCities} links={topCities(cities).map((c) => ({ href: c.href, label: cityLabel(c), meta: String(c.count) }))} />
    </div>
  );
}
