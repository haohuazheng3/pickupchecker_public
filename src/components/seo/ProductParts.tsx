/**
 * Building blocks of the /stock/{product}/{place} pages. Every chip, row and cell is a plain link to
 * another page of the tree, so the pages read like one app with filters — and stay crawlable.
 */
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { appleBuyUrl, stateCodeOf } from "@/lib/apple/catalog";
import { productPath, storePlace, type Place, type Product } from "@/lib/seo/products";
import type { Facet, Facets, GridCell, PlaceCount, StoreLine } from "@/lib/seo/productData";
import { formatDrive, formatMiles } from "@/lib/geo";
import { fmtPrice } from "@/lib/seo/enrich";
import { Swatch } from "@/components/stores/ConfigTable";
import { Dot } from "@/components/stock/StatusBits";
import { LiveAgo } from "@/components/site/LiveAgo";

function Count({ n }: { n: number }) {
  return <span className={`tabular-nums ${n > 0 ? "font-semibold text-accent" : "opacity-50"}`}>{n}</span>;
}

/** Model segmented control + storage and color chips. Links keep the place and the scroll position. */
export function ProductNav({ facets, place, unit }: { facets: Facets; place: Place; unit: string }) {
  const row = (label: string, items: Facet[]) => (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-[0.65rem] font-semibold uppercase tracking-wider text-ink-3">{label}</span>
      <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
        {items.map((f) => (
          <Link key={f.label} href={productPath(f.product, place)} scroll={false} className="chip chip-sm shrink-0" data-on={f.on} aria-current={f.on ? "page" : undefined}>
            {f.swatch && <Swatch color={f.swatch} className="h-2.5 w-2.5" />}{f.label}{!f.on && <> <Count n={f.count} /></>}
          </Link>
        ))}
      </div>
    </div>
  );
  return (
    <nav className="space-y-2" aria-label="Choose the iPhone">
      <div className="flex w-full max-w-md gap-1 rounded-full bg-ink/6 p-1">
        {facets.models.map((f) => (
          <Link key={f.label} href={productPath(f.product, place)} scroll={false} aria-current={f.on ? "page" : undefined}
            className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-medium transition-colors ${f.on ? "bg-[var(--pane-solid)] text-ink shadow-sm" : "text-ink-2 hover:text-ink"}`}>
            <span className="truncate">{f.label}</span> <Count n={f.count} />
          </Link>
        ))}
      </div>
      {row("Storage", facets.storages)}
      {row("Color", facets.colors)}
      <p className="text-xs text-ink-3">Numbers = {unit} with stock now.</p>
    </nav>
  );
}

/** Stores of a place for one product, in stock first. Each row opens that store's page for the same product. */
export function ProductStoreList({ product, lines, showCity = true, emptyText }: { product: Product; lines: StoreLine[]; showCity?: boolean; emptyText: string }) {
  if (lines.length === 0) return <p className="py-6 text-center text-sm text-ink-3">{emptyText}</p>;
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
                <span className="block truncate font-medium text-ink">{l.store.name}</span>
                <span className="block truncate text-xs text-ink-3">{showCity ? `${l.store.city}, ${stateCodeOf(l.store)}${l.distance != null ? ` · ${formatMiles(l.distance)}` : ""} · ` : ""}{on ? <>seen <LiveAgo iso={l.lastAvailableAt} /></> : l.lastAvailableAt ? <>last <LiveAgo iso={l.lastAvailableAt} /></> : l.tracked ? "not seen yet" : "first check pending"}</span>
              </span>
              <span className={`shrink-0 text-sm tabular-nums ${on ? "font-semibold text-accent" : "text-ink-3"}`}>{one ? (on ? "In stock" : "—") : `${l.available.length}/${l.tracked || product.parts.length}`}</span>
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
  const cols = `minmax(5.25rem,1.7fr) repeat(${grid.storages.length}, minmax(2.25rem,1fr))`;
  const atStore = place.level === "store";
  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      <div className="grid gap-x-1.5 border-b border-line px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-ink-3" style={{ gridTemplateColumns: cols }}>
        <span>Color</span>{grid.storages.map((s) => <span key={s} className="text-center">{s}</span>)}
      </div>
      <ul className="divide-y divide-line">
        {grid.colors.map((c) => (
          <li key={c} className="grid items-center gap-x-1.5 px-3 py-1.5" style={{ gridTemplateColumns: cols }}>
            <span className="inline-flex min-w-0 items-center gap-1.5 text-sm"><Swatch color={c} /><span className="truncate">{c}</span></span>
            {grid.storages.map((s) => {
              const cell = grid.cells.get(`${s}|${c}`);
              if (!cell) return <span key={s} className="text-center text-xs text-ink-3">—</span>;
              const on = atStore ? cell.status?.status === "available" : cell.count > 0;
              const here = cell.product.slug === current.slug;
              // Outline the row / column a storage or color page covers; a model page covers everything, so nothing.
              const scoped = cell.inScope && (current.kind === "storage" || current.kind === "color");
              return (
                <Link key={s} href={productPath(cell.product, place)} scroll={false} title={`${cell.product.name} · ${fmtPrice(cell.item.price)}`}
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
  return (
    <ul className="max-h-[26rem] divide-y divide-line overflow-y-auto">
      {items.slice(0, max).map((p) => (
        <li key={p.place.segments.join("/")}>
          <Link href={productPath(product, p.place)} className="flex items-center gap-3 py-2 text-sm hover:bg-ink/[0.03]">
            <span className="min-w-0 flex-1 truncate font-medium text-ink">{p.place.level === "store" ? p.place.label : p.place.name}{p.place.level === "store" && <span className="font-normal text-ink-3"> · {p.place.city}, {p.place.stateCode}</span>}</span>
            {p.distance != null && <span className="shrink-0 text-xs tabular-nums text-ink-3">{formatMiles(p.distance)} · {formatDrive(p.distance)}</span>}
            <span className={`inline-flex shrink-0 items-center gap-1.5 tabular-nums ${p.inStock ? "font-semibold text-accent" : "text-ink-3"}`}>
              <Dot state={p.inStock ? "ok" : "idle"} live={p.inStock > 0} />{p.place.level === "store" ? (p.inStock ? "in stock" : "none") : `${p.inStock}/${p.stores}`}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** One configuration at one store: the answer, big. */
export function StatusCard({ line }: { line: StoreLine }) {
  const st = line.status;
  const on = st?.status === "available";
  const item = line.available[0];
  return (
    <div className={`rounded-2xl border p-5 ${on ? "border-accent/40 bg-accent/8" : "border-line"}`}>
      <div className="flex items-center gap-2 text-2xl font-semibold"><Dot state={on ? "ok" : st ? "idle" : "warn"} live={on} />{on ? "In stock" : st ? "Not available" : "Not checked yet"}</div>
      <p className="mt-1 text-sm text-ink-2">
        {on ? <>{st?.quote ?? "Available for pickup"}{st?.since && <> · since <LiveAgo iso={st.since} /></>}</> : st?.lastAvailableAt ? <>Last in stock <LiveAgo iso={st.lastAvailableAt} /></> : st ? "Never seen in stock here yet" : "First check within a minute"}
      </p>
      {on && item && <a href={appleBuyUrl(item)} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-4">Buy on apple.com</a>}
      <p className="mt-3 text-xs text-ink-3">Checked <LiveAgo iso={line.lastCheckedAt} /> · every 20 s</p>
    </div>
  );
}
