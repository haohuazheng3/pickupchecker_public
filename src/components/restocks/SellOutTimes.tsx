/**
 * "How fast do restocks sell out here?": one quotable line, four big numbers, the per-model table, then each
 * restock as a bar whose length is the seconds it lasted. Server-rendered (times in the store's own zone,
 * formatted here, so nothing differs between server and browser). Numbers are bounds between two of our checks
 * (lib/stock/sellouts.ts), shown as ranges, never rounded up to a claim the checks cannot support; one line under
 * the headline says what a listing time is (and is not: units sold or how fast a buyer must be); the method sits
 * folded under the module.
 */
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { MODELS, PART_INDEX, STORE_INDEX, appleName, modelByKey, modelKeyFor, storePath, storeTimeZone } from "@/lib/apple/catalog";
import { fmtLife, medianBand, type SelloutSummary, type Sellouts } from "@/lib/stock/sellouts";
import { t, pageLocale } from "@/lib/i18n/server";
import type { Dict } from "@/lib/i18n/dict";
import type { Lang } from "@/lib/i18n/locales";
import { num, pct as pctOf, stamp, unit, bidi } from "@/lib/i18n/format";
import { appleStoreLabel, configLabel } from "@/lib/i18n/places";
import { Measured, Stat, StatGrid } from "@/components/ui/Viz";

type Words = Dict["modules"]["sellout"];

const pct = (x: number, lang: Lang) => pctOf(lang, Math.round(x * 100));
/** "45 s", "2 min 05 s" (other languages: "45秒", "2 Min. 5 Sek."). */
function secs(s: number | null, lang: Lang): string {
  if (s == null) return "–";
  if (lang === "en") return s < 120 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
  return s < 120 ? unit(lang, s, "s") : `${unit(lang, Math.floor(s / 60), "m")} ${unit(lang, s % 60, "s")}`;
}
/** A restock's life between two checks: "45–60 s" (English: sellouts.fmtLife). */
function life(low: number, high: number, lang: Lang): string {
  if (lang === "en") return fmtLife(low, high);
  if (high - low < 1) return secs(high, lang);
  if (high < 120) return `${num(lang, low)}–${unit(lang, high, "s")}`;
  return `${secs(low, lang)} – ${secs(high, lang)}`;
}
/** The 20-second band around a median: "60–80 seconds" (English: sellouts.medianBand). */
function band(medianSec: number, lang: Lang): string {
  const b = medianBand(medianSec);
  const m = lang === "en" ? null : b.match(/^(\d+)–(\d+)/);
  return m ? `${num(lang, Number(m[1]))}–${unit(lang, Number(m[2]), "s")}` : b;
}
/** A big number and its unit: English "45" + "s" under two minutes; other languages the whole duration. */
function tile(sec: number | null, lang: Lang): { value: string; unit?: string } {
  if (lang !== "en") return { value: secs(sec, lang) };
  return { value: secs(sec, lang).replace(/ s$/, ""), unit: sec != null && sec < 120 ? "s" : undefined };
}
/** The bar's full width: a listing that lasted this long or longer fills it. */
const BAR_SEC = 180;

/** The one line an answer engine can quote; everything else is tiles. */
function headline(d: Sellouts, label: string, duo: SelloutSummary | undefined, w: Words, lang: Lang): string {
  if (duo && duo.n >= 3 && duo.medianSec != null) return w.typical(label, band(duo.medianSec, lang));
  const s = d.summary;
  if (s.n > 0 && s.medianSec != null) return w.half(label, secs(s.medianSec, lang));
  return w.none(label, s.days);
}

function ModelRow({ name, s, lang }: { name: string; s: SelloutSummary; lang: Lang }) {
  return (
    <tr className="border-b border-line">
      <th scope="row" className="py-2 pe-3 text-start font-medium text-ink">{name}</th>
      <td className="py-2 pe-3 tabular-nums">{s.n}</td>
      <td className="py-2 pe-3 tabular-nums">{secs(s.medianSec, lang)}</td>
      <td className="py-2 pe-3 tabular-nums">{pct(s.within30, lang)}</td>
      <td className="py-2 pe-3 tabular-nums">{pct(s.within60, lang)}</td>
      <td className="py-2 pe-3 tabular-nums">{secs(s.fastestSec, lang)}</td>
    </tr>
  );
}

export function SellOutTimes({ data, label, showStore = false, limit = 10 }: { data: Sellouts; label: string; showStore?: boolean; limit?: number }) {
  const w = t().modules.sellout;
  const lang = pageLocale().lang;
  const models = MODELS.filter((m) => data.byModel[m.key]?.n);
  const rows = data.recent.slice(0, limit);
  const estimated = rows.some((r) => r.highSec != null && !r.exact);
  const duo = data.byModel.duo;
  // The tiles follow the Duo once it has three timed sell-outs; before that, everything here.
  const s = duo && duo.n >= 3 && duo.medianSec != null ? duo : data.summary;
  const what = s === duo ? w.whatDuo : w.whatAll;
  const have = s.n > 0 && s.medianSec != null;
  const median = tile(s.medianSec, lang);
  const fastest = tile(s.fastestSec, lang);
  return (
    <div>
      <p className="text-sm font-medium text-ink">{headline(data, label, duo, w, lang)}</p>
      {/* What the number is and is not (2026-11-09): a listing on Apple's page, bounded by two checks; not units sold, not a deadline. */}
      <p className="mt-1 max-w-3xl text-xs leading-snug text-ink-3">{w.definition}</p>

      {have && (
        <StatGrid cols={4} className="mt-3">
          <Stat value={median.value} unit={median.unit} label={w.tileHalf(what)} tone="accent" />
          <Stat value={pct(s.within30, lang)} label={w.tileWithin30} tone="warn" />
          <Stat value={pct(s.within60, lang)} label={w.tileWithin60} />
          <Stat value={fastest.value} unit={fastest.unit} label={w.tileFastest(s.n, s.days)} tone="muted" />
        </StatGrid>
      )}

      {models.length > 1 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-sm">
            <caption className="mb-2 text-start text-xs text-ink-3">{w.caption(data.summary.days)}</caption>
            <thead>
              <tr className="border-b border-line-2 text-start text-ink">
                <th scope="col" className="py-2 pe-3 font-semibold">{w.thIphone}</th>
                <th scope="col" className="py-2 pe-3 font-semibold">{w.thSoldOut}</th>
                <th scope="col" className="py-2 pe-3 font-semibold">{w.thHalf}</th>
                <th scope="col" className="py-2 pe-3 font-semibold">{w.thWithin30}</th>
                <th scope="col" className="py-2 pe-3 font-semibold">{w.thWithin60}</th>
                <th scope="col" className="py-2 pe-3 font-semibold">{w.thFastest}</th>
              </tr>
            </thead>
            <tbody>{models.map((m) => <ModelRow key={m.key} name={m.name} s={data.byModel[m.key]!} lang={lang} />)}</tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="mt-5 flex items-baseline justify-between gap-3"><h3 className="text-sm font-semibold text-ink">{w.each}</h3><span className="text-[11px] text-ink-3">{w.barNote(lang === "en" ? `${BAR_SEC} s` : unit(lang, BAR_SEC, "s"))}</span></div>
          <ul className="mt-2 divide-y divide-line text-sm">
            {rows.map((r) => {
              const item = PART_INDEX.get(r.partNumber);
              const store = STORE_INDEX.get(r.storeNumber);
              if (!item || !store) return null;
              const model = modelByKey(modelKeyFor(item.model));
              // From the data cache `at` comes back as an ISO string (it is stored as JSON); stamp() takes either.
              const when = stamp(lang, r.at, storeTimeZone(store));
              const gone = r.highSec != null;
              const lived = gone ? r.highSec! : r.listedSec ?? 0;
              const fast = gone && r.highSec! <= 30;
              const width = `${Math.max(3, Math.min(100, (lived / BAR_SEC) * 100))}%`;
              return (
                <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-2 sm:grid-cols-[minmax(0,1fr)_7rem_auto]">
                  <span className="min-w-0 truncate">
                    <span className="tabular-nums text-ink-3">{when}</span>{" · "}
                    <span className="text-ink">{bidi(model?.short ?? "", lang)} {configLabel(item, lang)}</span>
                    {showStore && <>{" · "}<Link href={storePath(store)} className="underline-offset-2 hover:underline">{lang === "en" ? appleName(store) : appleStoreLabel(store, lang)}</Link></>}
                  </span>
                  <span className="col-span-2 flex h-2 items-center sm:col-span-1" aria-hidden>
                    <span className={`h-1.5 rounded-full ${!gone ? "bg-accent/35" : fast ? "bg-warn" : "bg-ink/25"}`} style={{ width }} />
                  </span>
                  <span className={`col-start-2 row-start-1 shrink-0 text-end tabular-nums font-medium sm:col-start-3 ${!gone ? "text-accent" : fast ? "text-warn" : "text-ink"}`}>
                    {!gone ? w.stillListed(secs(r.listedSec, lang)) : r.exact ? life(r.lowSec!, r.highSec!, lang) : w.approx(life(r.lowSec!, r.highSec!, lang))}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <Measured title={w.measuredTitle}>
        {w.measured(estimated)}
      </Measured>
    </div>
  );
}
