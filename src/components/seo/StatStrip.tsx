import type { ReactNode } from "react";
import { MODELS, PART_INDEX, STORE_INDEX, type ModelKey } from "@/lib/apple/catalog";
import type { PlaceStats } from "@/lib/stock/queries";
import { countIn, fmtDuration } from "@/lib/seo/enrich";
import { t, pageLocale } from "@/lib/i18n/server";
import { num, bidi } from "@/lib/i18n/format";
import { colorLabel, storeLabel } from "@/lib/i18n/places";
import { LiveAgo } from "@/components/site/LiveAgo";
import { Dot } from "@/components/stock/StatusBits";

export interface Stat { label: string; value: ReactNode; hint?: ReactNode; live?: boolean }

/** A row of small numeric tiles. Two per row on phones, up to six on desktop; every tile is real data. */
export function StatStrip({ items, className = "", cols = 6 }: { items: Stat[]; className?: string; cols?: 4 | 6 }) {
  return (
    <dl className={`grid grid-cols-2 gap-2 ${cols === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3 lg:grid-cols-6"} ${className}`}>
      {items.map((s, i) => (
        <div key={i} className="pane-2 min-w-0 p-3">
          <dt className="eyebrow truncate text-[0.65rem]">{s.label}</dt>
          <dd className="mt-1 flex items-center gap-1.5 text-xl font-semibold tabular-nums text-ink">{s.live && <Dot state="ok" live />}<span className="truncate">{s.value}</span></dd>
          {s.hint && <dd className="mt-0.5 truncate text-xs text-ink-3">{s.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}

/**
 * The standard strip for a place or a model: stores, cities, stock now per model, restocks 24 h / 7 d / 30 d,
 * sell-outs, median time available and the last restock.
 */
export function PlaceStatStrip({ stores, cities, stockNow, stats, storeMode = false, model, scoped }: {
  stores: number;
  cities?: number;
  /** Stores with stock per model (place pages) or configurations available per model (store pages). */
  stockNow: Record<ModelKey, number>;
  stats: PlaceStats;
  /** Store page: stockNow counts configurations, not stores. */
  storeMode?: boolean;
  /** Model page: show just this model's stock. */
  model?: ModelKey;
  /** The restock / sell-out / last-restock tiles count one model only (its short name, "Duo"): the label says so. */
  scoped?: string;
}) {
  const d = t().content.statStrip;
  const lang = pageLocale().lang;
  // Tile values stay numbers in English (as before); other languages group digits ("1.234").
  const v = (x: number) => (lang === "en" ? x : num(lang, x));
  const s = (x: number) => (lang === "en" ? String(x) : num(lang, x));
  const items: Stat[] = [];
  if (model) items.push({ label: scoped ? d.modelNow(bidi(scoped, lang)) : d.inStockNow, value: v(stockNow[model]), hint: storeMode ? d.configsInStock : d.ofStores(s(stores)), live: stockNow[model] > 0 });
  else {
    items.push({ label: d.stores, value: v(stores), hint: cities != null ? countIn(lang, cities, d.nCities) : d.tracked });
    for (const m of MODELS) items.push({ label: d.modelNow(bidi(m.short, lang)), value: v(stockNow[m.key]), hint: storeMode ? d.configsInStock : countIn(lang, stockNow[m.key], d.storesWithStock), live: stockNow[m.key] > 0 });
  }
  const sc = (label: string) => (scoped ? d.scoped(label, bidi(scoped, lang)) : label);
  items.push({ label: sc(d.restocks24h), value: v(stats.day), hint: d.restocksHint(s(stats.week), s(stats.month), s(stats.days)) });
  items.push({ label: sc(d.sellOuts(s(stats.days))), value: v(stats.soldouts), hint: stats.medianMs != null ? d.stays(fmtDuration(stats.medianMs, lang)) : d.noPairs });
  const lr = stats.lastRestock;
  const lrStore = lr ? STORE_INDEX.get(lr.storeNumber) : undefined;
  const lrItem = lr ? PART_INDEX.get(lr.partNumber) : undefined;
  items.push({ label: sc(d.lastRestock), value: lr ? <LiveAgo iso={lr.at} /> : d.noneYet, hint: lr && lrItem ? `${lrItem.storage} ${colorLabel(lrItem.color, lang)}${lrStore && !storeMode ? ` · ${storeLabel(lrStore, lang)}` : ""}` : d.inLastDays(s(stats.days)) });
  return <StatStrip items={items} cols={model ? 4 : 6} />;
}
