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
import { localStamp } from "@/lib/content/siteFacts";
import type { RecentByConfig } from "@/lib/stock/recent";
import type { StoreStockSummary } from "@/lib/stock/queries";
import { Swatch } from "@/components/stores/ConfigTable";
import { Measured, Stat, StatGrid } from "@/components/ui/Viz";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function Last24Hours({ data, label, stores, country = "us", stock, lastBefore, alert, id = "last-24-hours" }: {
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
}) {
  if (stores.length === 0) return null;
  const items = catalogFor("duo", country);
  const byPart = new Map(data.byPart.map((p) => [p.partNumber, p]));
  const one = stores.length === 1;
  // A place in one zone reads the store's clock; a country across several (the US, Canada, Australia) its reference zone, named.
  const zones = new Set(stores.map((s) => storeTimeZone(s)));
  const asOf = zones.size > 1
    ? new Intl.DateTimeFormat("en-US", { timeZone: COUNTRIES[country].timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(data.at))
    : `${localStamp(data.at, stores[0])} local time`;
  const nameOf = (n: string) => { const s = storeByNumber(n); return s ? appleName(s) : "an Apple Store"; };
  const storeLink = (n: string) => <Link href={storePath(storeByNumber(n) ?? stores[0])} className="underline-offset-2 hover:underline">{nameOf(n)}</Link>;
  const stampAt = (iso: string, n: string) => localStamp(iso, storeByNumber(n) ?? stores[0]);
  const timeAt = (iso: string, n: string) => new Intl.DateTimeFormat("en-US", { timeZone: storeTimeZone(storeByNumber(n) ?? stores[0]), hour: "numeric", minute: "2-digit" }).format(new Date(iso));
  const cfg = (p: string) => { const i = items.find((x) => x.partNumber === p); return i ? `${i.storage} ${i.color}` : p; };
  const withRestock = items.filter((i) => (byPart.get(i.partNumber)?.restocks ?? 0) > 0);
  const inStock = (partNumber: string) => (stock ? stores.filter((s) => stock.get(s.storeNumber)?.perModel.duo.parts.includes(partNumber)).length : null);
  const latest = data.latest;

  // The one sentence: the count, the place, the latest. Everything else is a tile or a row.
  let lead: React.ReactNode;
  if (data.unknown) lead = <>The last-24-hours count could not be read just now; the live stock and the restock log on this page are unaffected.</>;
  else if (data.restocks === 0) lead = <><b className="text-ink">No iPhone Duo restock {label} in the last 24 hours</b> (as of {asOf}).</>;
  else lead = <>In the last 24 hours the iPhone Duo restocked <b className="text-ink">{plural(data.restocks, "time")} {one ? label : `at ${data.stores} of the ${plural(stores.length, "Apple Store")} ${label}`}</b>; the latest: <b className="text-ink">{cfg(latest!.partNumber)}</b>{!one && <> at {storeLink(latest!.storeNumber)}</>}, {stampAt(latest!.at, latest!.storeNumber)} local time.</>;

  return (
    <section id={id} className="pane p-5" aria-labelledby={`${id}-h`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id={`${id}-h`} className="text-xl font-semibold">iPhone Duo restocks {label} in the last 24 hours</h2>
        <span className="text-xs text-ink-3">as of {asOf}</span>
      </div>
      <p className="mt-2 text-sm font-medium text-ink">{lead}</p>

      {!data.unknown && (
        <StatGrid cols={3} className="mt-3">
          <Stat value={data.restocks} label="confirmed restocks · 24 h" tone={data.restocks > 0 ? "accent" : "muted"} />
          {one
            ? <Stat value={`${withRestock.length}/${items.length}`} label="configurations that came back" tone={withRestock.length ? "plain" : "muted"} />
            : <Stat value={`${data.stores}/${stores.length}`} label={`stores with a restock${withRestock.length ? ` · ${withRestock.length} of ${items.length} configurations` : ""}`} tone={data.stores ? "plain" : "muted"} />}
          {latest
            ? <Stat size="sm" value={timeAt(latest.at, latest.storeNumber)} label={<>latest · {cfg(latest.partNumber)}{!one && <> · {nameOf(latest.storeNumber)}</>}</>} />
            : lastBefore
              ? <Stat size="sm" value={timeAt(lastBefore.at, lastBefore.storeNumber)} label={<>last before that · {cfg(lastBefore.partNumber)}{!one && <> · {nameOf(lastBefore.storeNumber)}</>} · {stampAt(lastBefore.at, lastBefore.storeNumber).split(",")[0]}</>} tone="muted" />
              : <Stat value="–" label="no earlier restock on record" tone="muted" />}
        </StatGrid>
      )}

      {!data.unknown && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <caption className="sr-only">Confirmed restocks of each iPhone Duo configuration {label}, last 24 hours, as of {asOf}</caption>
            <thead>
              <tr className="border-b border-line-2 text-left text-ink">
                <th scope="col" className="py-2 pr-3 font-semibold">Configuration</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Restocks</th>
                {!one && <th scope="col" className="py-2 pr-3 font-semibold">Stores</th>}
                <th scope="col" className="py-2 pr-3 font-semibold">Last restock (local time)</th>
                {stock && <th scope="col" className="py-2 pr-3 font-semibold">In stock now</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const r = byPart.get(i.partNumber);
                const now = inStock(i.partNumber);
                const quiet = !r;
                return (
                  <tr key={i.partNumber} className={`border-b border-line ${quiet ? "text-ink-3" : ""}`}>
                    <th scope="row" className={`py-2 pr-3 text-left font-medium ${quiet ? "text-ink-2" : "text-ink"}`}><span className="inline-flex items-center gap-2"><Swatch color={i.color} />{i.storage} {i.color}</span></th>
                    <td className={`py-2 pr-3 tabular-nums ${r ? "font-semibold text-ink" : ""}`}>{r?.restocks ?? 0}</td>
                    {!one && <td className="py-2 pr-3 tabular-nums">{r ? `${r.stores} of ${stores.length}` : "–"}</td>}
                    <td className="py-2 pr-3">{r ? <>{stampAt(r.lastAt, r.lastStore)}{!one && <>{" · "}{storeLink(r.lastStore)}</>}</> : "none in 24 h"}</td>
                    {stock && <td className="py-2 pr-3 tabular-nums">{now == null ? "–" : one ? (now ? <span className="font-semibold text-accent">yes</span> : "no") : now ? <span className="font-semibold text-accent">{now} of {stores.length}</span> : `0 of ${stores.length}`}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Measured title="How restocks are counted" className="!mt-0">
          PickupChecker&apos;s own checks of apple.com in-store pickup: every store every 15 seconds, the stores with alerts every 5. A restock is logged only when two checks agree; the first time a store is ever seen is not counted; other trackers&apos; reports are never mixed in.
        </Measured>
        {alert && <Link href={alert} className="btn btn-ghost btn-sm">Alert me{one ? "" : ` ${label}`} → next one within seconds</Link>}
      </div>
    </section>
  );
}
