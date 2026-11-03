import { PendingLink as Link } from "@/components/ui/PendingLink";
import { MODELS, COLOR_META, catalogFor, appleBuyUrl, modelKeyFor, type CatalogItem, type Store, appleName } from "@/lib/apple/catalog";
import { productFor, productPath, storePlace } from "@/lib/seo/products";
import type { StoreStatusRow } from "@/lib/stock/queries";
import { alertHref, fmtPrice, sortConfigs } from "@/lib/seo/enrich";
import { COUNTRIES, formatPrice } from "@/lib/apple/countries";
import { t, pageLocale } from "@/lib/i18n/server";
import type { Dict } from "@/lib/i18n/dict";
import type { Lang } from "@/lib/i18n/locales";
import { price } from "@/lib/i18n/format";
import { appleStoreLabel, configLabel } from "@/lib/i18n/places";
import { Dot } from "@/components/stock/StatusBits";
import { LiveAgo } from "@/components/site/LiveAgo";

/** A colour dot; `color` is the catalogue's English colour (the key of COLOR_META). */
export function Swatch({ color, className = "h-3 w-3" }: { color: string; className?: string }) {
  return <span className={`inline-block shrink-0 rounded-full border border-ink/15 ${className}`} style={{ background: COLOR_META[color]?.hex ?? "#888" }} aria-hidden />;
}

type Row = { item: CatalogItem; status: StoreStatusRow | undefined };

function Line({ r, store, lookupOff, d, lang }: { r: Row; store: Store; lookupOff?: boolean; d: Dict["modules"]["configTable"]; lang: Lang }) {
  const st = r.status;
  const ok = st?.status === "available";
  const unknown = !st || st.status === "unknown";
  const config = configLabel(r.item, lang);
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-0.5 py-2 text-sm">
      <Swatch color={r.item.color} className="h-3.5 w-3.5" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <Link href={productPath(productFor(modelKeyFor(r.item.model), r.item.storage, r.item.color), storePlace(store))} className="font-medium text-ink hover:underline">{config}</Link>
          <span className="text-xs text-ink-3">{lang !== "en" ? price(lang, COUNTRIES[store.country], r.item.price) : store.country === "us" ? fmtPrice(r.item.price) : formatPrice(COUNTRIES[store.country], r.item.price)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
          <span className={`inline-flex items-center gap-1.5 ${ok ? "text-accent" : ""}`}><Dot state={ok ? "ok" : unknown ? "warn" : "idle"} live={ok} />{ok ? (st?.quote ?? d.available) : unknown ? (lookupOff ? d.noLookup : d.notChecked) : (st?.quote ?? d.unavailable)}</span>
          {ok && st?.since && <span>{d.since(<LiveAgo iso={st.since} />)}</span>}
          {!ok && st?.lastAvailableAt && <span>{d.lastAvailable(<LiveAgo iso={st.lastAvailableAt} />)}</span>}
          {!ok && st && !st.lastAvailableAt && !unknown && <span>{d.neverHere}</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-xs">
        {ok && <a href={appleBuyUrl(r.item, store.country)} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm px-2.5 text-xs">{d.buy}</a>}
        <Link href={alertHref({ model: MODELS.find((m) => m.name === r.item.model)?.key, storage: r.item.storage, color: r.item.color, store: store.storeNumber, country: store.country })} className="font-medium text-ink hover:underline" aria-label={d.alertAria(r.item.model, config, lang === "en" ? appleName(store) : appleStoreLabel(store, lang))}>{d.alert}</Link>
      </div>
    </li>
  );
}

/**
 * Every tracked configuration at one store: storage, colour, price, status, since / last available, and an alert
 * link per row. `lookupOff`: Apple offers no pickup lookups at this store right now (stock/notOffered.ts).
 */
export function ConfigTable({ store, rows, title, lookupOff = false }: { store: Store; rows: StoreStatusRow[]; title?: string; lookupOff?: boolean }) {
  const d = t().modules.configTable;
  const lang = pageLocale().lang;
  const heading = title ?? d.title;
  const byPart = new Map(rows.map((r) => [r.partNumber, r]));
  return (
    <section className="pane p-5 sm:p-6" aria-label={heading}>
      <h2 className="text-xl font-semibold">{heading}</h2>
      <p className="mt-1 text-sm text-ink-3">{lookupOff ? d.lookupOff(rows.length > 0) : rows.length ? d.tracked(rows.length) : d.firstSweep}</p>
      <div className="mt-3 grid gap-5 lg:grid-cols-3">
        {MODELS.map((m) => {
          const items = sortConfigs(catalogFor(m.key, store.country)).map((item) => ({ item, status: byPart.get(item.partNumber) }));
          const avail = items.filter((r) => r.status?.status === "available").length;
          return (
            <div key={m.key} className="min-w-0">
              <div className="flex items-baseline justify-between gap-2"><h3 className="font-semibold">{m.name}</h3><span className={`text-xs ${avail ? "text-accent" : "text-ink-3"}`}>{d.inStock(avail, items.length)}</span></div>
              <ul className="mt-1 divide-y divide-line">{items.map((r) => <Line key={r.item.partNumber} r={r} store={store} lookupOff={lookupOff} d={d} lang={lang} />)}</ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
