import { STORES, STORAGE_ORDER, catalogFor, colorsFor, storagesFor, modelByKey, type ModelKey } from "@/lib/apple/catalog";
import { restockFeed, restockStats, restockReportStats } from "@/lib/stock/queries";
import { fmtPrice } from "@/lib/seo/enrich";
import { productFor, productPath } from "@/lib/seo/products";
import type { Facts } from "@/lib/content/facts";
import type { LiveWidgetId } from "@/lib/content/types";
import { RestockFeed } from "@/components/restocks/RestockFeed";
import { RestockClock } from "@/components/restocks/RestockClock";
import { Swatch } from "@/components/stores/ConfigTable";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { t, pageLocale } from "@/lib/i18n/server";
import type { Lang } from "@/lib/i18n/locales";
import { num, pct, price, unit } from "@/lib/i18n/format";
import { colorLabel } from "@/lib/i18n/places";
import { COUNTRIES } from "@/lib/apple/countries";

/** These widgets show the US stores (US dollars); numbers in the page's language. */
const N = (lang: Lang, n: number) => (lang === "en" ? String(n) : num(lang, n));

function Cell({ n }: { n: number }) {
  return <span className={`inline-flex min-w-[3.25rem] justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${n > 0 ? "bg-accent/15 text-ink" : "bg-ink/5 text-ink-3"}`}>{n > 0 ? n : "0"}</span>;
}

/** Storage × color grid: how many of the 269 stores list each configuration for pickup right now. */
function ConfigGrid({ model, facts }: { model: ModelKey; facts: Facts }) {
  const d = t().content.live;
  const lang = pageLocale().lang;
  const f = facts.models[model];
  const storages = storagesFor(model).sort((a, b) => STORAGE_ORDER.indexOf(a) - STORAGE_ORDER.indexOf(b));
  const colors = colorsFor(model);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[22rem] text-sm">
        <caption className="mb-2 text-left text-xs text-ink-3">{d.configsCaption(lang === "en" ? STORES.length : N(lang, STORES.length), modelByKey(model)!.name)}</caption>
        <thead><tr><th className="py-1.5 pr-2 text-left font-medium text-ink-3">{d.storage}</th>{colors.map((c) => <th key={c} className="px-1 py-1.5 text-center font-medium text-ink-2"><span className="inline-flex items-center gap-1.5"><Swatch color={c} className="h-2.5 w-2.5" />{colorLabel(c, lang)}</span></th>)}</tr></thead>
        <tbody className="divide-y divide-line">
          {storages.map((s) => (
            <tr key={s}>
              <th scope="row" className="py-2 pr-2 text-left font-medium text-ink">{s}</th>
              {colors.map((c) => <td key={c} className="px-1 py-2 text-center"><Link href={productPath(productFor(model, s, c))} aria-label={`${modelByKey(model)!.name} ${s} ${colorLabel(c, lang)}`}><Cell n={f.byConfig[`${s} ${c}`] ?? 0} /></Link></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PriceTable({ model, facts }: { model: ModelKey; facts: Facts }) {
  const d = t().content.live;
  const lang = pageLocale().lang;
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
        <caption className="mb-2 text-left text-xs text-ink-3">{d.pricesCaption(m.name)}</caption>
        <thead><tr className="text-left text-ink-3"><th className="py-1.5 pr-3 font-medium">{d.storage}</th><th className="py-1.5 pr-3 font-medium">{d.price}</th><th className="py-1.5 font-medium">{d.bestColor}</th></tr></thead>
        <tbody className="divide-y divide-line">
          {byStorage.map((r) => (
            <tr key={r.storage}>
              <th scope="row" className="py-2 pr-3 text-left font-medium text-ink"><Link href={productPath(productFor(model, r.storage))} className="hover:underline">{r.storage}</Link></th>
              <td className="py-2 pr-3 tabular-nums text-ink">{lang === "en" ? fmtPrice(r.price) : price(lang, COUNTRIES.us, r.price)}</td>
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
  const d = t().content.live;
  const lang = pageLocale().lang;
  const m = modelByKey(model)!;
  if (id === "configs") return <div className="pane-2 my-5 p-4"><ConfigGrid model={model} facts={facts} /></div>;
  if (id === "prices") return <div className="pane-2 my-5 p-4"><PriceTable model={model} facts={facts} /></div>;
  if (id === "restocks") {
    const rows = await restockFeed({ model, kind: "all", limit: 6 });
    return <div className="my-5"><RestockFeed rows={rows} model={model} showModel={false} emptyText={d.noRestock(m.name)} /></div>;
  }
  if (id === "clock") {
    const numbers = STORES.map((s) => s.storeNumber);
    const [stats, reports] = await Promise.all([restockStats(numbers, "America/New_York", 30, model), restockReportStats(numbers, "America/New_York", 30, model, undefined, "us")]);
    return <div className="pane-2 my-5 p-4"><RestockClock stats={stats} label={d.clockLabel(m.name)} reports={reports} /></div>;
  }
  if (id === "stores-now" || id === "status") {
    const f = facts.models[model];
    return (
      <div className="pane-2 my-5 grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        <Stat label={d.storesWithIt} value={f.unknown ? "—" : `${N(lang, f.storesNow)}/${N(lang, STORES.length)}`} ok={f.storesNow > 0} />
        <Stat label={d.pairsInStock} value={f.unknown ? "—" : pct(lang, Math.round((100 * f.pairsNow) / Math.max(1, f.pairsTotal)))} ok={f.pairsNow > 0} />
        <Stat label={d.restocksLogged} value={f.unknown ? "—" : N(lang, f.restocks)} />
        <Stat label={d.medianTime} value={f.medianMs == null ? "—" : fmtStay(f.medianMs, lang)} />
      </div>
    );
  }
  return null;
}

function fmtStay(ms: number, lang: Lang = "en"): string {
  const min = ms / 60000;
  if (lang !== "en") return min < 1 ? t().content.live.underOneMin(unit(lang, 1, "m")) : min < 90 ? unit(lang, Math.round(min), "m") : unit(lang, Math.round(min / 60), "h");
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
