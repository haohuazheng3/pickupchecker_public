import Link from "next/link";
import { catalogFor, storagesFor, colorsFor, modelByKey, STORES, STORE_INDEX, storePath, statePath, PART_INDEX, type ModelKey } from "@/lib/apple/catalog";
import type { StoreStockRow } from "@/lib/stock/queries";
import { stateRefs } from "@/lib/seo/links";
import { fmtPrice, alertHref } from "@/lib/seo/enrich";
import { Swatch } from "@/components/stores/ConfigTable";
import { Dot } from "@/components/stock/StatusBits";
import { LiveAgo } from "@/components/site/LiveAgo";

/** storage × color → number of stores with that configuration in stock now, each cell linking to the filtered view. */
export function ConfigMatrix({ model, rows }: { model: ModelKey; rows: StoreStockRow[] }) {
  const m = modelByKey(model)!;
  const storages = storagesFor(model);
  const colors = colorsFor(model);
  const count = new Map<string, number>();
  for (const r of rows) for (const p of r.availableParts) count.set(p, (count.get(p) ?? 0) + 1);
  const byKey = new Map(catalogFor(model).map((c) => [`${c.storage}|${c.color}`, c]));
  const total = [...count.values()].reduce((a, b) => a + b, 0);
  return (
    <div className="pane-2 overflow-hidden">
      <div className="grid gap-x-2 border-b border-line px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-ink-3 sm:px-4" style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${storages.length}, minmax(3rem, 4.5rem))` }}>
        <span>Color</span>
        {storages.map((s) => <span key={s} className="text-center">{s}</span>)}
      </div>
      <ul className="divide-y divide-line">
        {colors.map((c) => (
          <li key={c} className="grid items-center gap-x-2 px-3 py-2 sm:px-4" style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${storages.length}, minmax(3rem, 4.5rem))` }}>
            <span className="inline-flex min-w-0 items-center gap-2 text-sm"><Swatch color={c} /><span className="truncate">{c}</span></span>
            {storages.map((s) => {
              const item = byKey.get(`${s}|${c}`);
              const n = item ? count.get(item.partNumber) ?? 0 : 0;
              if (!item) return <span key={s} className="text-center text-xs text-ink-3">—</span>;
              return (
                <Link key={s} href={`/stock/${m.slug}?storage=${encodeURIComponent(s)}&color=${encodeURIComponent(c)}`} className={`inline-flex items-center justify-center gap-1 rounded-full py-1 text-sm tabular-nums ${n ? "bg-accent/15 font-semibold text-accent" : "text-ink-3"}`} title={`${m.name} ${s} ${c}: ${n} store${n === 1 ? "" : "s"} · ${fmtPrice(item.price)}`}>
                  <Dot state={n ? "ok" : "idle"} live={n > 0} />{n}
                </Link>
              );
            })}
          </li>
        ))}
      </ul>
      <p className="px-3 py-2 text-xs text-ink-3 sm:px-4">{total === 0 ? `No ${m.name} configuration is listed for pickup anywhere right now.` : `${total} store × configuration pairs in stock; tap a number for the stores.`}</p>
    </div>
  );
}

/** State → stores, stores with stock now, link. Sorted by stock then store count. */
export function ByStateTable({ model, rows }: { model: ModelKey; rows: StoreStockRow[] }) {
  const m = modelByKey(model)!;
  const inStock = new Set(rows.filter((r) => r.availableParts.length > 0).map((r) => r.storeNumber));
  const states = stateRefs().map((s) => ({ ...s, now: STORES.filter((x) => x.state === s.name && inStock.has(x.storeNumber)).length })).sort((a, b) => b.now - a.now || b.count - a.count || a.name.localeCompare(b.name));
  return (
    <div className="pane-2 overflow-hidden">
      <div className="grid grid-cols-[1fr_5rem_5rem] gap-x-2 border-b border-line px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-ink-3 sm:px-4"><span>State</span><span className="text-center">Stores</span><span className="text-center">{m.short} now</span></div>
      <ul className="max-h-[28rem] divide-y divide-line overflow-y-auto">
        {states.map((s) => (
          <li key={s.slug} className="grid grid-cols-[1fr_5rem_5rem] items-center gap-x-2 px-3 py-2 text-sm sm:px-4">
            <Link href={statePath(s.name)} className="truncate font-medium text-ink hover:underline">{s.name}</Link>
            <span className="text-center tabular-nums text-ink-3">{s.count}</span>
            <span className={`inline-flex items-center justify-center gap-1.5 tabular-nums ${s.now ? "font-semibold text-accent" : "text-ink-3"}`}><Dot state={s.now ? "ok" : "idle"} live={s.now > 0} />{s.now}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Storage → price with the colors available at that size. */
export function PriceTable({ model }: { model: ModelKey }) {
  const m = modelByKey(model)!;
  const items = catalogFor(model);
  const storages = storagesFor(model);
  return (
    <div>
      <ul className="divide-y divide-line">
        {storages.map((s) => {
          const mine = items.filter((i) => i.storage === s);
          const price = Math.min(...mine.map((i) => i.price));
          return (
            <li key={s} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="min-w-0"><span className="font-medium text-ink">{m.name} {s}</span><div className="mt-0.5 flex flex-wrap gap-1.5 text-xs text-ink-3">{mine.map((i) => <span key={i.partNumber} className="inline-flex items-center gap-1"><Swatch color={i.color} className="h-2.5 w-2.5" />{i.color}</span>)}</div></div>
              <span className="shrink-0 tabular-nums text-ink">{fmtPrice(price)}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-ink-3">Unlocked prices on apple.com.</p>
    </div>
  );
}

/** Stores with the model in stock now (from one stockByStore call), nearest-first is not known here so most configurations first. */
export function ModelStoreList({ model, rows, storage, color, limit = 60 }: { model: ModelKey; rows: StoreStockRow[]; storage?: string; color?: string; limit?: number }) {
  const m = modelByKey(model)!;
  const inStock = rows.filter((r) => r.availableParts.length > 0);
  const checked = rows.length;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-3">
        <span className="inline-flex items-center gap-2"><Dot state={inStock.length ? "ok" : "idle"} live={inStock.length > 0} /> {inStock.length} of {checked || STORES.length} stores list the {m.short}{storage ? ` ${storage}` : ""}{color ? ` ${color}` : ""} for pickup</span>
        {rows[0]?.lastCheckedAt && <span>Last check <LiveAgo iso={rows[0].lastCheckedAt} /></span>}
      </div>
      {inStock.length === 0 ? (
        <div className="pane-2 p-6 text-ink-2">
          {checked === 0 ? "First sweep in progress; stock appears here within a minute." : `No Apple Store lists the ${m.name}${storage ? ` ${storage}` : ""}${color ? ` ${color}` : ""} for pickup right now.`}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {inStock.slice(0, limit).map((r) => {
            const s = STORE_INDEX.get(r.storeNumber);
            if (!s) return null;
            const items = r.availableParts.map((p) => PART_INDEX.get(p)!).filter(Boolean);
            return (
              <li key={r.storeNumber} className="pane-2 pane-hover min-w-0 p-4">
                <Link href={storePath(s)} className="block">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><div className="truncate font-semibold">Apple {s.name}</div><div className="truncate text-sm text-ink-3">{s.city}, {s.state}</div></div>
                    <Dot state="ok" live />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {items.slice(0, 6).map((i) => <span key={i.partNumber} className="inline-flex items-center gap-1 rounded-full bg-ink/6 px-2 py-0.5 text-xs text-ink-2"><Swatch color={i.color} className="h-2 w-2" />{i.storage} {i.color}</span>)}
                    {items.length > 6 && <span className="text-xs text-ink-3">+{items.length - 6}</span>}
                  </div>
                  <div className="mt-2 text-xs text-ink-3">Seen <LiveAgo iso={r.lastAvailableAt} /></div>
                </Link>
                <Link href={alertHref({ model, storage: storage ?? items[0]?.storage, color: color ?? items[0]?.color, store: s.storeNumber })} className="mt-2 inline-block text-xs font-medium text-ink hover:underline">Alert me here →</Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
