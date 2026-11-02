/** "Keep exploring" rows for another country's pages: its models, regions and cities, never another country's stores. */
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { MODELS, DEFAULT_MODEL, mapPath, restocksPath, placeTarget } from "@/lib/apple/catalog";
import { prefixOf, type Country } from "@/lib/apple/countries";
import { regionRefs, topCities, topRegions, regionWord } from "@/lib/seo/countryLinks";
import { LinkRow } from "./Related";

/** Model pages + the country's restock log and map. */
export function BrowseCountryModels({ country: c, current, title = "Live stock by model" }: { country: Country; current?: string; title?: string }) {
  const p = prefixOf(c.cc);
  return (
    <LinkRow
      title={title}
      links={[
        ...MODELS.map((m) => ({ href: `${p}/stock/${m.slug}`, label: `${m.name} stock`, meta: m.key === current ? "this page" : undefined })),
        ...MODELS.map((m) => ({ href: `${restocksPath(c.cc)}?model=${m.key}`, label: `${m.short} restock log` })),
        { href: `${mapPath(c.cc)}?model=${DEFAULT_MODEL}`, label: "Live map" },
      ]}
    />
  );
}

/** Every region of the country as a chip (current one highlighted); nothing where the country has a single region. */
export function BrowseCountryRegions({ country: c, current, title }: { country: Country; current?: string; title?: string }) {
  const regions = regionRefs(c.cc);
  if (regions.length < 2) return null;
  const index = placeTarget(c.cc);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3"><div className="eyebrow">{title ?? `Stores by ${regionWord(c.cc)}`}</div>{index?.indexable && <Link href={index.path} className="text-xs text-ink-3 hover:text-ink">All Apple Stores {c.inName} →</Link>}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {regions.map((r) => <Link key={r.slug} href={r.href} className="chip px-3 py-1.5 text-xs" data-on={r.name === current}>{r.name}<span className="text-ink-3"> · {r.count}</span></Link>)}
      </div>
    </div>
  );
}

/** The country's biggest regions and cities. */
export function BrowseCountryPopular({ country: c, regions = 10, cities = 12 }: { country: Country; regions?: number; cities?: number }) {
  const index = placeTarget(c.cc);
  const rs = regionRefs(c.cc).length > 1 ? topRegions(c.cc, regions) : [];
  return (
    <div className="space-y-5">
      {rs.length > 0 && <LinkRow title="Most stores" links={rs.map((r) => ({ href: r.href, label: r.name, meta: String(r.count) }))} more={index?.indexable ? { href: index.path, label: `All ${regionWord(c.cc, true)}` } : undefined} />}
      <LinkRow title={rs.length ? "Big cities" : "Cities"} links={topCities(c.cc, cities).map((x) => ({ href: x.href, label: x.name, meta: String(x.count) }))} />
    </div>
  );
}
