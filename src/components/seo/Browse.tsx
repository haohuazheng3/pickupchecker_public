import Link from "next/link";
import { MODELS, DEFAULT_MODEL } from "@/lib/apple/catalog";
import { stateRefs, topStates, topCities, cityLabel } from "@/lib/seo/links";
import { LinkRow } from "./Related";

/** Every state as a chip (current one highlighted). */
export function BrowseStates({ current, title = "Stores by state" }: { current?: string; title?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3"><div className="eyebrow">{title}</div><Link href="/stores" className="text-xs text-ink-3 hover:text-ink">All states & cities →</Link></div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {stateRefs().map((s) => <Link key={s.slug} href={s.href} className="chip px-3 py-1.5 text-xs" data-on={s.name === current}>{s.name}<span className="text-ink-3"> · {s.count}</span></Link>)}
      </div>
    </div>
  );
}

/** Model pages + the per-model restock logs and maps. */
export function BrowseModels({ current, title = "Live stock by model" }: { current?: string; title?: string }) {
  return (
    <LinkRow
      title={title}
      links={[
        ...MODELS.map((m) => ({ href: `/stock/${m.slug}`, label: `${m.name} stock`, meta: m.key === current ? "this page" : undefined })),
        ...MODELS.map((m) => ({ href: `/restocks?model=${m.key}`, label: `${m.short} restock log` })),
        { href: `/map?model=${DEFAULT_MODEL}`, label: "Live map" },
      ]}
    />
  );
}

/** Popular states and cities — the broad entry points, used on the home page, footer-level pages and logs. */
export function BrowsePopular({ states = 10, cities = 12 }: { states?: number; cities?: number }) {
  return (
    <div className="space-y-5">
      <LinkRow title="Most stores" links={topStates(states).map((s) => ({ href: s.href, label: s.name, meta: String(s.count) }))} more={{ href: "/stores", label: "All states" }} />
      <LinkRow title="Big cities" links={topCities(cities).map((c) => ({ href: c.href, label: cityLabel(c), meta: String(c.count) }))} />
    </div>
  );
}
