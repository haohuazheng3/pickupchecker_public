import { STORES, STORAGE_ORDER, catalogFor, colorsFor, storagesFor, modelByKey, type ModelKey } from "@/lib/apple/catalog";
import { restockFeed, restockStats } from "@/lib/stock/queries";
import { fmtPrice } from "@/lib/seo/enrich";
import { productFor, productPath } from "@/lib/seo/products";
import type { Facts } from "@/lib/content/facts";
import type { LiveWidgetId } from "@/lib/content/types";
import { RestockFeed } from "@/components/restocks/RestockFeed";
import { RestockClock } from "@/components/restocks/RestockClock";
import { Swatch } from "@/components/stores/ConfigTable";
import { PendingLink as Link } from "@/components/ui/PendingLink";

function Cell({ n }: { n: number }) {
  return <span className={`inline-flex min-w-[3.25rem] justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${n > 0 ? "bg-accent/15 text-ink" : "bg-ink/5 text-ink-3"}`}>{n > 0 ? n : "0"}</span>;
}

/** Storage × color grid: how many of the 269 stores list each configuration for pickup right now. */
function ConfigGrid({ model, facts }: { model: ModelKey; facts: Facts }) {
  const f = facts.models[model];
  const storages = storagesFor(model).sort((a, b) => STORAGE_ORDER.indexOf(a) - STORAGE_ORDER.indexOf(b));
  const colors = colorsFor(model);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[22rem] text-sm">
        <caption className="mb-2 text-left text-xs text-ink-3">Apple Stores (of {STORES.length}) with each {modelByKey(model)!.name} configuration for pickup now · live</caption>
        <thead><tr><th className="py-1.5 pr-2 text-left font-medium text-ink-3">Storage</th>{colors.map((c) => <th key={c} className="px-1 py-1.5 text-center font-medium text-ink-2"><span className="inline-flex items-center gap-1.5"><Swatch color={c} className="h-2.5 w-2.5" />{c}</span></th>)}</tr></thead>
        <tbody className="divide-y divide-line">
          {storages.map((s) => (
            <tr key={s}>
              <th scope="row" className="py-2 pr-2 text-left font-medium text-ink">{s}</th>
              {colors.map((c) => <td key={c} className="px-1 py-2 text-center"><Link href={productPath(productFor(model, s, c))} aria-label={`${modelByKey(model)!.name} ${s} ${c}`}><Cell n={f.byConfig[`${s} ${c}`] ?? 0} /></Link></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PriceTable({ model, facts }: { model: ModelKey; facts: Facts }) {
  const f = facts.models[model];
  const m = modelByKey(model)!;
  const byStorage = storagesFor(model).sort((a, b) => STORAGE_ORDER.indexOf(a) - STORAGE_ORDER.indexOf(b)).map((s) => {
    const items = catalogFor(model).filter((i) => i.storage === s);
    const stores = Math.max(...items.map((i) => f.byConfig[`${i.storage} ${i.color}`] ?? 0));
    return { storage: s, price: items[0].price, colors: items.map((i) => i.color), stores };
  });
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[20rem] text-sm">
        <caption className="mb-2 text-left text-xs text-ink-3">{m.name} prices on apple.com (unlocked, before tax) and live pickup stock</caption>
        <thead><tr className="text-left text-ink-3"><th className="py-1.5 pr-3 font-medium">Storage</th><th className="py-1.5 pr-3 font-medium">Price</th><th className="py-1.5 font-medium">Best color, stores now</th></tr></thead>
        <tbody className="divide-y divide-line">
          {byStorage.map((r) => (
            <tr key={r.storage}>
              <th scope="row" className="py-2 pr-3 text-left font-medium text-ink"><Link href={productPath(productFor(model, r.storage))} className="hover:underline">{r.storage}</Link></th>
              <td className="py-2 pr-3 tabular-nums text-ink">{fmtPrice(r.price)}</td>
              <td className="py-2"><Cell n={r.stores} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Server-rendered live block placed inside hand-written pages. */
export async function LiveWidget({ id, model = "duo", facts }: { id: LiveWidgetId; model?: ModelKey; facts: Facts }) {
  const m = modelByKey(model)!;
  if (id === "configs") return <div className="pane-2 my-5 p-4"><ConfigGrid model={model} facts={facts} /></div>;
  if (id === "prices") return <div className="pane-2 my-5 p-4"><PriceTable model={model} facts={facts} /></div>;
  if (id === "restocks") {
    const rows = await restockFeed({ model, kind: "all", limit: 6 });
    return <div className="my-5"><RestockFeed rows={rows} model={model} showModel={false} emptyText={`No ${m.name} restock logged yet.`} /></div>;
  }
  if (id === "clock") {
    const stats = await restockStats(STORES.map((s) => s.storeNumber), "America/New_York", 30, model);
    return <div className="pane-2 my-5 p-4"><RestockClock stats={stats} label={`for the ${m.name} nationwide`} /></div>;
  }
  if (id === "stores-now" || id === "status") {
    const f = facts.models[model];
    return (
      <div className="pane-2 my-5 grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        <Stat label="Stores with it now" value={f.unknown ? "—" : `${f.storesNow}/${STORES.length}`} ok={f.storesNow > 0} />
        <Stat label="Store × config pairs in stock" value={f.unknown ? "—" : `${Math.round((100 * f.pairsNow) / Math.max(1, f.pairsTotal))}%`} ok={f.pairsNow > 0} />
        <Stat label="Restocks logged" value={f.unknown ? "—" : String(f.restocks)} />
        <Stat label="Median time in stock" value={f.medianMs == null ? "—" : fmtStay(f.medianMs)} />
      </div>
    );
  }
  return null;
}

function fmtStay(ms: number): string {
  const min = ms / 60000;
  if (min < 1) return "< 1 min";
  if (min < 90) return `${Math.round(min)} min`;
  return `${Math.round(min / 60)} h`;
}

function Stat({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div>
      <div className={`text-2xl font-semibold tabular-nums ${ok === false ? "text-ink-2" : "text-ink"}`}>{value}</div>
      <div className="mt-0.5 text-xs text-ink-3">{label}</div>
    </div>
  );
}
