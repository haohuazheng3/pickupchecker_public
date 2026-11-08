/**
 * "iPhone Duo restocks in {place} in the last 24 hours": the first thing a state, city, country or store page says
 * after its title — one quotable sentence, three big numbers, and an eight-row table (storage × colour), so a
 * reader or an answer engine asked "has the Duo restocked anywhere in Michigan in the last 24 hours? 512GB, Night
 * Sky or Star White" gets the answer without reading a chart. Server-rendered; times in the store's own zone. Zero
 * rows stay in the table: a configuration with no restock is an answer too. The counting rule sits folded below.
 */
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { appleName, catalogFor, storeByNumber, storePath, storeTimeZone, type Store } from "@/lib/apple/catalog";
import { COUNTRIES, type CountryCode } from "@/lib/apple/countries";
import type { RecentByConfig } from "@/lib/stock/recent";
import type { StoreStockSummary } from "@/lib/stock/queries";
import { t, pageLocale } from "@/lib/i18n/server";
import { clock, day, stamp } from "@/lib/i18n/format";
import { appleStoreLabel, configLabel } from "@/lib/i18n/places";
import { Swatch } from "@/components/stores/ConfigTable";
import { Measured, Stat, StatGrid } from "@/components/ui/Viz";

export function Last24Hours({ data, label, stores, country = "us", stock, lastBefore, alert, id = "last-24-hours", compact = false }: {
  data: RecentByConfig;
  /** "in Michigan", "in Australia", "at Apple Somerset". */
  label: string;
  stores: Store[];
  country?: CountryCode;
  /** Live stock of these stores, for the "in stock now" column. */
  stock?: Map<string, StoreStockSummary>;
  /** The last restock before the window (the place's 30-day statistics), for a quiet day. */
  lastBefore?: { storeNumber: string; partNumber: string; at: string } | null;
  /** Where "Alert me" goes. */
  alert?: string;
  id?: string;
  /** Rendered under the DuoNow block (2026-11-08): keep the sentence and the configuration table, drop the three tiles that repeat the block. */
  compact?: boolean;
}) {
  if (stores.length === 0) return null;
  const d = t().modules.last24;
  const lang = pageLocale().lang;
  const items = catalogFor("duo", country);
  const byPart = new Map(data.byPart.map((p) => [p.partNumber, p]));
  const one = stores.length === 1;
  // A place in one zone reads the store's clock; a country across several (the US, Canada, Australia) its reference zone, named.
  const zones = new Set(stores.map((s) => storeTimeZone(s)));
  const asOf = zones.size > 1 ? stamp(lang, data.at, COUNTRIES[country].timeZone, true) : d.localTime(stamp(lang, data.at, storeTimeZone(stores[0])));
  const nameOf = (n: string) => { const s = storeByNumber(n); return s ? (lang === "en" ? appleName(s) : appleStoreLabel(s, lang)) : d.anAppleStore; };
  const storeLink = (n: string) => <Link href={storePath(storeByNumber(n) ?? stores[0])} className="underline-offset-2 hover:underline">{nameOf(n)}</Link>;
  const zoneOf = (n: string) => storeTimeZone(storeByNumber(n) ?? stores[0]);
  const stampAt = (iso: string, n: string) => stamp(lang, iso, zoneOf(n));
  const timeAt = (iso: string, n: string) => clock(lang, iso, zoneOf(n));
  const cfg = (p: string) => { const i = items.find((x) => x.partNumber === p); return i ? configLabel(i, lang) : p; };
  const withRestock = items.filter((i) => (byPart.get(i.partNumber)?.restocks ?? 0) > 0);
  const inStock = (partNumber: string) => (stock ? stores.filter((s) => stock.get(s.storeNumber)?.perModel.duo.parts.includes(partNumber)).length : null);
  const latest = data.latest;

  // The one sentence: the count, the place, the latest. Everything else is a tile or a row.
  let lead: React.ReactNode;
  if (data.unknown) lead = d.unknown;
  else if (data.restocks === 0) lead = d.none(label, asOf);
  else lead = d.some({ restocks: data.restocks, one, label, withStores: data.stores, allStores: stores.length, config: cfg(latest!.partNumber), store: one ? null : storeLink(latest!.storeNumber), when: stampAt(latest!.at, latest!.storeNumber) });

  return (
    <section id={id} className="pane p-5" aria-labelledby={`${id}-h`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id={`${id}-h`} className="text-xl font-semibold">{d.title(label)}</h2>
        <span className="text-xs text-ink-3">{d.asOf(asOf)}</span>
      </div>
      <p className="mt-2 text-sm font-medium text-ink">{lead}</p>

      {!data.unknown && !compact && (
        <StatGrid cols={3} className="mt-3">
          <Stat value={data.restocks} label={d.tileRestocks} tone={data.restocks > 0 ? "accent" : "muted"} />
          {one
            ? <Stat value={`${withRestock.length}/${items.length}`} label={d.tileConfigsBack} tone={withRestock.length ? "plain" : "muted"} />
            : <Stat value={`${data.stores}/${stores.length}`} label={d.tileStores(withRestock.length, items.length)} tone={data.stores ? "plain" : "muted"} />}
          {latest
            ? <Stat size="sm" value={timeAt(latest.at, latest.storeNumber)} label={d.tileLatest(cfg(latest.partNumber), one ? null : nameOf(latest.storeNumber))} />
            : lastBefore
              ? <Stat size="sm" value={timeAt(lastBefore.at, lastBefore.storeNumber)} label={d.tileBefore(cfg(lastBefore.partNumber), one ? null : nameOf(lastBefore.storeNumber), day(lang, lastBefore.at, zoneOf(lastBefore.storeNumber)))} tone="muted" />
              : <Stat value="–" label={d.tileNoEarlier} tone="muted" />}
        </StatGrid>
      )}

      {!data.unknown && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <caption className="sr-only">{d.caption(label, asOf)}</caption>
            <thead>
              <tr className="border-b border-line-2 text-start text-ink">
                <th scope="col" className="py-2 pe-3 font-semibold">{d.thConfig}</th>
                <th scope="col" className="py-2 pe-3 font-semibold">{d.thRestocks}</th>
                {!one && <th scope="col" className="py-2 pe-3 font-semibold">{d.thStores}</th>}
                <th scope="col" className="py-2 pe-3 font-semibold">{d.thLast}</th>
                {stock && <th scope="col" className="py-2 pe-3 font-semibold">{d.thNow}</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const r = byPart.get(i.partNumber);
                const now = inStock(i.partNumber);
                const quiet = !r;
                return (
                  <tr key={i.partNumber} className={`border-b border-line ${quiet ? "text-ink-3" : ""}`}>
                    <th scope="row" className={`py-2 pe-3 text-start font-medium ${quiet ? "text-ink-2" : "text-ink"}`}><span className="inline-flex items-center gap-2"><Swatch color={i.color} />{configLabel(i, lang)}</span></th>
                    <td className={`py-2 pe-3 tabular-nums ${r ? "font-semibold text-ink" : ""}`}>{r?.restocks ?? 0}</td>
                    {!one && <td className="py-2 pe-3 tabular-nums">{r ? d.ofStores(r.stores, stores.length) : "–"}</td>}
                    <td className="py-2 pe-3">{r ? <>{stampAt(r.lastAt, r.lastStore)}{!one && <>{" · "}{storeLink(r.lastStore)}</>}</> : d.noneIn24}</td>
                    {stock && <td className="py-2 pe-3 tabular-nums">{now == null ? "–" : one ? (now ? <span className="font-semibold text-accent">{d.yes}</span> : d.no) : now ? <span className="font-semibold text-accent">{d.ofStores(now, stores.length)}</span> : d.ofStores(0, stores.length)}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Measured title={d.countedTitle} className="!mt-0">
          {d.counted}
        </Measured>
        {alert && <Link href={alert} className="btn btn-ghost btn-sm">{d.alert(one ? null : label)}</Link>}
      </div>
    </section>
  );
}
