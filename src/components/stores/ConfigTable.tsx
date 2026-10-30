import Link from "next/link";
import { MODELS, COLOR_META, catalogFor, appleBuyUrl, modelKeyFor, type CatalogItem, type Store, appleName } from "@/lib/apple/catalog";
import { productFor, productPath, storePlace } from "@/lib/seo/products";
import type { StoreStatusRow } from "@/lib/stock/queries";
import { alertHref, fmtPrice, sortConfigs } from "@/lib/seo/enrich";
import { Dot } from "@/components/stock/StatusBits";
import { LiveAgo } from "@/components/site/LiveAgo";

export function Swatch({ color, className = "h-3 w-3" }: { color: string; className?: string }) {
  return <span className={`inline-block shrink-0 rounded-full border border-ink/15 ${className}`} style={{ background: COLOR_META[color]?.hex ?? "#888" }} aria-hidden />;
}

type Row = { item: CatalogItem; status: StoreStatusRow | undefined };

function Line({ r, store }: { r: Row; store: Store }) {
  const st = r.status;
  const ok = st?.status === "available";
  const unknown = !st || st.status === "unknown";
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-0.5 py-2 text-sm">
      <Swatch color={r.item.color} className="h-3.5 w-3.5" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <Link href={productPath(productFor(modelKeyFor(r.item.model), r.item.storage, r.item.color), storePlace(store))} className="font-medium text-ink hover:underline">{r.item.storage} {r.item.color}</Link>
          <span className="text-xs text-ink-3">{fmtPrice(r.item.price)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
          <span className={`inline-flex items-center gap-1.5 ${ok ? "text-accent" : ""}`}><Dot state={ok ? "ok" : unknown ? "warn" : "idle"} live={ok} />{ok ? (st?.quote ?? "Available") : unknown ? "not checked yet" : (st?.quote ?? "Unavailable")}</span>
          {ok && st?.since && <span>since <LiveAgo iso={st.since} /></span>}
          {!ok && st?.lastAvailableAt && <span>last available <LiveAgo iso={st.lastAvailableAt} /></span>}
          {!ok && st && !st.lastAvailableAt && !unknown && <span>never seen in stock here</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-xs">
        {ok && <a href={appleBuyUrl(r.item)} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm px-2.5 text-xs">Buy</a>}
        <Link href={alertHref({ model: MODELS.find((m) => m.name === r.item.model)?.key, storage: r.item.storage, color: r.item.color, store: store.storeNumber })} className="font-medium text-ink hover:underline" aria-label={`Alert me when the ${r.item.model} ${r.item.storage} ${r.item.color} is available at ${appleName(store)}`}>Alert me →</Link>
      </div>
    </li>
  );
}

/** Every tracked configuration at one store: storage, colour, price, status, since / last available, and an alert link per row. */
export function ConfigTable({ store, rows, title = "Every configuration at this store" }: { store: Store; rows: StoreStatusRow[]; title?: string }) {
  const byPart = new Map(rows.map((r) => [r.partNumber, r]));
  return (
    <section className="pane p-5 sm:p-6" aria-label={title}>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-ink-3">{rows.length ? `${rows.length} configurations tracked` : "First sweep in progress — statuses appear within a minute"}</p>
      <div className="mt-3 grid gap-5 lg:grid-cols-3">
        {MODELS.map((m) => {
          const items = sortConfigs(catalogFor(m.key)).map((item) => ({ item, status: byPart.get(item.partNumber) }));
          const avail = items.filter((r) => r.status?.status === "available").length;
          return (
            <div key={m.key} className="min-w-0">
              <div className="flex items-baseline justify-between gap-2"><h3 className="font-semibold">{m.name}</h3><span className={`text-xs ${avail ? "text-accent" : "text-ink-3"}`}>{avail} of {items.length} in stock</span></div>
              <ul className="mt-1 divide-y divide-line">{items.map((r) => <Line key={r.item.partNumber} r={r} store={store} />)}</ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
