/**
 * Building blocks of the /stock/{product}/{place} pages. Every chip, row and cell is a plain link to
 * another page of the tree, so the pages read like one app with filters — and stay crawlable.
 */
import { CHECK_NOTE } from "@/lib/plans";
import { LiveChecked } from "@/components/site/LiveChecked";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { appleBuyUrl, cityLine } from "@/lib/apple/catalog";
import { COUNTRIES, formatDistance, formatPrice } from "@/lib/apple/countries";
import { productPath, storePlace, type Place, type Product } from "@/lib/seo/products";
import type { Facet, Facets, GridCell, PlaceCount, StoreLine } from "@/lib/seo/productData";
import { driveMinutes, formatDrive, formatMiles, roadMiles } from "@/lib/geo";
import { fmtPrice } from "@/lib/seo/enrich";
import { Swatch } from "@/components/stores/ConfigTable";
import { Dot } from "@/components/stock/StatusBits";
import { LiveAgo } from "@/components/site/LiveAgo";
import { t, pageLocale } from "@/lib/i18n/server";
import type { Lang } from "@/lib/i18n/locales";
import { distance, num, price, secs, unit } from "@/lib/i18n/format";
import { cityLabel, colorLabel, configLabel, regionLabel, storeLabel } from "@/lib/i18n/places";

/** Road distance from straight-line miles, in the country's unit ("12 mi" / "19 km"); other languages always km. */
function distLabel(miles: number, cc: keyof typeof COUNTRIES | undefined, lang: Lang = "en"): string {
  if (lang !== "en") return distance(lang, cc ?? "us", roadMiles(miles));
  if (!cc || cc === "us") return formatMiles(miles);
  return COUNTRIES[cc].unit === "mi" ? formatMiles(miles) : formatDistance(COUNTRIES[cc], roadMiles(miles));
}

/** formatDrive ("25 min", "1 h 05") in the page's language. */
function driveLabel(miles: number, lang: Lang): string {
  if (lang === "en") return formatDrive(miles);
  const m = driveMinutes(miles);
  if (m === 0) return t().content.product.here;
  if (m < 60) return unit(lang, m, "m");
  const h = Math.floor(m / 60);
  const r = Math.round((m % 60) / 5) * 5;
  return secs(lang, h * 3600 + r * 60);
}

/** "City, ST" in the US, the city elsewhere (catalog cityLine), with the city in the page's language. */
function cityIn(store: StoreLine["store"], lang: Lang): string {
  return lang === "en" ? cityLine(store) : (store.country ?? "us") === "us" ? cityLine(store) : cityLabel(store.country ?? "us", store.city, lang);
}

function Count({ n }: { n: number }) {
  return <span className={`tabular-nums ${n > 0 ? "font-semibold text-accent" : "opacity-50"}`}>{n}</span>;
}

/** Model segmented control + storage and color chips. Links keep the place and the scroll position. */
export function ProductNav({ facets, place, unit }: { facets: Facets; place: Place; unit: string }) {
  const d = t().content.product;
  const lang = pageLocale().lang;
  // Facet labels come in English ("All", colour names); other languages relabel them.
  const facetLabel = (f: Facet, kind: "storage" | "color") => (lang === "en" ? f.label : kind === "color" ? (f.swatch ? colorLabel(f.swatch, lang) : d.all) : f.product.storage ? f.label : d.all);
  const row = (label: string, items: Facet[], kind: "storage" | "color") => (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-[0.65rem] font-semibold uppercase tracking-wider text-ink-3">{label}</span>
      <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
        {items.map((f) => (
          <Link key={f.label} href={productPath(f.product, place)} scroll={false} className="chip chip-sm shrink-0" data-on={f.on} aria-current={f.on ? "page" : undefined}>
            {f.swatch && <Swatch color={f.swatch} className="h-2.5 w-2.5" />}{facetLabel(f, kind)}{!f.on && <> <Count n={f.count} /></>}
          </Link>
        ))}
      </div>
    </div>
  );
  return (
    <nav className="space-y-2" aria-label={d.chooseIphone}>
      <div className="flex w-full max-w-md gap-1 rounded-full bg-ink/6 p-1">
        {facets.models.map((f) => (
          <Link key={f.label} href={productPath(f.product, place)} scroll={false} aria-current={f.on ? "page" : undefined}
            className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-medium transition-colors ${f.on ? "bg-[var(--pane-solid)] text-ink shadow-sm" : "text-ink-2 hover:text-ink"}`}>
            <span className="truncate">{f.label}</span> <Count n={f.count} />
          </Link>
        ))}
      </div>
      {row(d.storage, facets.storages, "storage")}
      {row(d.color, facets.colors, "color")}
      <p className="text-xs text-ink-3">{d.numbersAre(unit)}</p>
    </nav>
  );
}

/** Stores of a place for one product, in stock first. Each row opens that store's page for the same product. */
export function ProductStoreList({ product, lines, showCity = true, emptyText }: { product: Product; lines: StoreLine[]; showCity?: boolean; emptyText: string }) {
  if (lines.length === 0) return <p className="py-6 text-center text-sm text-ink-3">{emptyText}</p>;
  const d = t().content.product;
  const lang = pageLocale().lang;
  const one = product.parts.length === 1;
  return (
    <ul className="divide-y divide-line">
      {lines.map((l) => {
        const on = l.available.length > 0;
        return (
          <li key={l.store.storeNumber}>
            <Link href={productPath(product, storePlace(l.store))} className="flex min-w-0 items-center gap-3 py-2.5 hover:bg-ink/[0.03]">
              <Dot state={on ? "ok" : l.tracked ? "idle" : "warn"} live={on} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ink">{storeLabel(l.store, lang)}</span>
                <span className="block truncate text-xs text-ink-3">{showCity ? `${cityIn(l.store, lang)}${l.distance != null ? ` · ${distLabel(l.distance, l.store.country, lang)}` : ""} · ` : ""}{on ? d.seen(<LiveAgo iso={l.lastAvailableAt} />) : l.lastAvailableAt ? d.last(<LiveAgo iso={l.lastAvailableAt} />) : l.tracked ? d.notSeenYet : d.firstCheckPending}</span>
              </span>
              <span className={`shrink-0 text-sm tabular-nums ${on ? "font-semibold text-accent" : "text-ink-3"}`}>{one ? (on ? d.inStock : "—") : `${l.available.length}/${l.tracked || product.parts.length}`}</span>
              <span className="shrink-0 text-ink-3" aria-hidden>›</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** storage × color: stores with each configuration (a place) or its status (a store). Cells open that configuration here. */
export function ProductGrid({ grid, place, current }: { grid: { storages: string[]; colors: string[]; cells: Map<string, GridCell> }; place: Place; current: Product }) {
  const d = t().content.product;
  const lang = pageLocale().lang;
  const cols = `minmax(5.25rem,1.7fr) repeat(${grid.storages.length}, minmax(2.25rem,1fr))`;
  const atStore = place.level === "store";
  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      <div className="grid gap-x-1.5 border-b border-line px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-ink-3" style={{ gridTemplateColumns: cols }}>
        <span>{d.color}</span>{grid.storages.map((s) => <span key={s} className="text-center">{s}</span>)}
      </div>
      <ul className="divide-y divide-line">
        {grid.colors.map((c) => (
          <li key={c} className="grid items-center gap-x-1.5 px-3 py-1.5" style={{ gridTemplateColumns: cols }}>
            <span className="inline-flex min-w-0 items-center gap-1.5 text-sm"><Swatch color={c} /><span className="truncate">{colorLabel(c, lang)}</span></span>
            {grid.storages.map((s) => {
              const cell = grid.cells.get(`${s}|${c}`);
              if (!cell) return <span key={s} className="text-center text-xs text-ink-3">—</span>;
              const on = atStore ? cell.status?.status === "available" : cell.count > 0;
              const here = cell.product.slug === current.slug;
              // Outline the row / column a storage or color page covers; a model page covers everything, so nothing.
              const scoped = cell.inScope && (current.kind === "storage" || current.kind === "color");
              return (
                <Link key={s} href={productPath(cell.product, place)} scroll={false} title={lang === "en" ? `${cell.product.name} · ${place.country && place.country !== "us" ? formatPrice(COUNTRIES[place.country], cell.item.price) : fmtPrice(cell.item.price)}` : `${cell.item.model} ${configLabel(cell.item, lang)} · ${price(lang, COUNTRIES[place.country ?? "us"], cell.item.price)}`}
                  className={`inline-flex h-8 items-center justify-center gap-1 rounded-full text-sm tabular-nums ${on ? "bg-accent/15 font-semibold text-accent" : "text-ink-3"} ${here ? "ring-2 ring-ink" : scoped ? "ring-1 ring-ink/25" : ""}`}>
                  {atStore ? (on ? "✓" : "–") : <><Dot state={on ? "ok" : "idle"} live={on} />{cell.count}</>}
                </Link>
              );
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A compact list of places with "in stock / stores", each opening the same product there. */
export function PlaceCountList({ product, items, max = 60 }: { product: Product; items: PlaceCount[]; max?: number }) {
  if (items.length === 0) return null;
  const d = t().content.product;
  const lang = pageLocale().lang;
  const cc = (p: Place) => p.country ?? "us";
  // English: the place's own label/name; other languages: its store, region or city in their words.
  const name = (p: Place) => (lang === "en" ? (p.level === "store" ? p.label : p.name)
    : p.level === "store" && p.store ? storeLabel(p.store, lang)
    : p.level === "city" && p.city && cc(p) !== "us" ? cityLabel(cc(p), p.city, lang)
    : p.state && p.level !== "store" && p.level !== "city" && cc(p) !== "us" ? regionLabel(cc(p), p.state, lang)
    : p.level === "store" ? p.label : p.name);
  return (
    <ul className="max-h-[26rem] divide-y divide-line overflow-y-auto">
      {items.slice(0, max).map((p) => (
        <li key={p.place.segments.join("/")}>
          <Link href={productPath(product, p.place)} className="flex items-center gap-3 py-2 text-sm hover:bg-ink/[0.03]">
            <span className="min-w-0 flex-1 truncate font-medium text-ink">{name(p.place)}{p.place.level === "store" && <span className="font-normal text-ink-3"> · {p.place.country && p.place.country !== "us" ? (lang === "en" ? p.place.city : cityLabel(p.place.country, p.place.city ?? "", lang)) : `${p.place.city}, ${p.place.stateCode}`}</span>}</span>
            {p.distance != null && <span className="shrink-0 text-xs tabular-nums text-ink-3">{distLabel(p.distance, p.place.country, lang)} · {driveLabel(p.distance, lang)}</span>}
            <span className={`inline-flex shrink-0 items-center gap-1.5 tabular-nums ${p.inStock ? "font-semibold text-accent" : "text-ink-3"}`}>
              <Dot state={p.inStock ? "ok" : "idle"} live={p.inStock > 0} />{p.place.level === "store" ? (p.inStock ? d.inStockLower : d.none) : `${lang === "en" ? p.inStock : num(lang, p.inStock)}/${lang === "en" ? p.stores : num(lang, p.stores)}`}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** One configuration at one store: the answer, big. */
export function StatusCard({ line }: { line: StoreLine }) {
  const d = t().content.product;
  const lang = pageLocale().lang;
  const st = line.status;
  const on = st?.status === "available";
  const item = line.available[0];
  return (
    <div className={`rounded-2xl border p-5 ${on ? "border-accent/40 bg-accent/8" : "border-line"}`}>
      <div className="flex items-center gap-2 text-2xl font-semibold"><Dot state={on ? "ok" : st ? "idle" : "warn"} live={on} />{on ? d.inStock : st ? d.notAvailable : d.notCheckedYet}</div>
      <p className="mt-1 text-sm text-ink-2">
        {on ? <>{st?.quote ?? d.availableForPickup}{st?.since && d.since(<LiveAgo iso={st.since} />)}</> : st?.lastAvailableAt ? d.lastInStock(<LiveAgo iso={st.lastAvailableAt} />) : st ? d.neverSeen : d.firstCheckSoon}
      </p>
      {on && item && <a href={appleBuyUrl(item, line.store.country)} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-4">{d.buy}</a>}
      <p className="mt-3 text-xs text-ink-3">{d.checked(<LiveChecked iso={line.lastCheckedAt} stores={[line.store.storeNumber]} />, lang === "en" ? CHECK_NOTE : d.checkNote)}</p>
    </div>
  );
}
