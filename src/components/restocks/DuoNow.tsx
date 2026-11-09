/**
 * "iPhone Duo {in this place} right now": the conclusion block a place page opens with (lib/content/duoNow.ts says
 * why). Order (2026-11-09, "evidence first"): the time-stamped verdict and the last time it was in stock → the
 * evidence line (when the stores last answered; a store without a current answer is unknown, not out of stock) →
 * the Key facts list, one self-contained sentence each (place, iPhone Duo, number, window, sample) → four tiles →
 * the method line with the measured check intervals of the page's country → the last three restocks with their
 * lifetimes → the alert link. Answer engines told us they quote the page whose first lines hold the conclusion with
 * its numbers, window and method; this block is that page's first lines.
 *
 * `DuoNow` is an async server component: it reads the measured intervals itself (serviceStats, cached an hour), so
 * the pages that render it do not change. `DuoNowView` is the synchronous body (tests render it from a fixture).
 * Every number comes from `DuoNow` / `ServiceStats`; strings from the dictionary (12 languages).
 */
import type { ReactNode } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { PART_INDEX, storeByNumber, storePath, storeTimeZone, type Store } from "@/lib/apple/catalog";
import { COUNTRIES, type CountryCode } from "@/lib/apple/countries";
import type { DuoNow as DuoNowData, DuoRestockLine } from "@/lib/content/duoNow";
import { PLANNED_SEC, serviceStats, type Lane, type LaneStats, type ServiceStats } from "@/lib/content/serviceStats";
import { PATTERN_MIN, PATTERN_MIN_DAYS } from "@/lib/content/siteFacts";
import { t, pageLocale } from "@/lib/i18n/server";
import type { Dict } from "@/lib/i18n/dict";
import type { MeasuredLane } from "@/lib/i18n/dict/en/modules";
import { LANG_TAG, num, pct as pctOf, stamp } from "@/lib/i18n/format";
import { appleStoreLabel, configLabel } from "@/lib/i18n/places";
import type { Lang } from "@/lib/i18n/locales";
import { Stat, StatGrid } from "@/components/ui/Viz";

type Words = Dict["modules"]["duoNow"];

export interface DuoNowProps {
  d: DuoNowData;
  /** The place phrase with its preposition: "in Michigan", "in the UK", "at Apple Somerset". */
  label: string;
  /** The bare name: "Michigan", "Apple Somerset". */
  name: string;
  /** One store (a store page): sentences count configurations, not stores. */
  one?: boolean;
  stores: Store[];
  country?: CountryCode;
  /** The place's restock-times page, when it has one. */
  restockTimesHref?: string | null;
  alertHref?: string;
  /** Wrap the block in its own pane (default) or render it bare inside the caller's layout. */
  bare?: boolean;
}

/** A median listing time is stated from this many timed listings (restockTimes.selloutFrom's own floor). */
export const MEDIAN_MIN = 10;
/** Where the measured intervals are explained, lane by lane. */
export const MEASURED_HREF = "/how-it-works#measured";

/* ---------------------------------------------------------------- formats (English as the site writes it; other languages through format.ts) */

function stampIn(iso: string, tz: string, lang: Lang): string {
  if (lang !== "en") return stamp(lang, iso, tz, true);
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(iso));
}
function dateIn(ymd: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "en" ? "en-US" : lang, { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
}
/** The calendar day (YYYY-MM-DD) of an instant in a zone. */
function ymdIn(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}
const N = (n: number, lang: Lang) => (lang === "en" ? n.toLocaleString("en-US") : num(lang, n));
/** A share 0–1 as a whole percent in the page's language ("58%", "58 %"). */
const pctIn = (x: number, lang: Lang) => pctOf(lang, Math.round(x * 100));
/** A measured interval's number: one decimal under a minute ("5.0", "15.3"; "5,0" in German), whole seconds above. */
function decimal(sec: number, lang: Lang): string {
  const d = sec < 60 ? 1 : 0;
  return new Intl.NumberFormat(LANG_TAG[lang], { minimumFractionDigits: d, maximumFractionDigits: d }).format(sec);
}

/** "45 s", "2 min", "1 h 10 min" — a lifetime or an age, through the dictionary's units. */
function dur(sec: number, d: { secs: (n: number) => string; mins: (n: number) => string }): string {
  if (sec < 100) return d.secs(Math.max(1, Math.round(sec)));
  if (sec < 5400) return d.mins(Math.round(sec / 60));
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
  return m ? `${h} h ${d.mins(m)}` : `${h} h`;
}
/** "about 95 seconds", "about 3 minutes": the median as a sentence says it (English); other languages use their own units. */
function about(sec: number, lang: Lang, d: { secs: (n: number) => string; mins: (n: number) => string }): string {
  if (lang !== "en") return dur(sec, d);
  if (sec < 100) return `about ${Math.max(5, Math.round(sec / 5) * 5)} seconds`;
  if (sec < 3600) return `about ${Math.round(sec / 60)} minutes`;
  return `about ${(sec / 3600).toFixed(1)} hours`;
}

function lifetime(r: DuoRestockLine, d: Words): string | null {
  if (r.listedSec != null) return d.stillListed(dur(r.listedSec, d));
  if (r.highSec == null) return null;
  const low = r.lowSec ?? 0;
  // Both bounds inside a minute: "listed 45–60 s"; wider: "listed 5–7 min"; equal: "listed about 2 min".
  const a = dur(low, d), b = dur(r.highSec, d);
  return a === b || low === 0 ? d.listedAbout(b) : d.listedRange(a, b);
}

/** A node as plain text (strings and the text of elements): the Dataset description, list keys, tests. */
export function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (typeof node === "object" && "props" in node) return textOf((node as { props: { children?: ReactNode } }).props.children);
  return "";
}

/* ---------------------------------------------------------------- pure parts (exported for tests) */

export interface Fact { node: ReactNode; text: string }

/**
 * Pure: the Key facts, in the order an answer engine should quote them — restocks confirmed since tracking began (n,
 * since, on how many days) → the share in the busiest two local hours (only with a pattern; otherwise why there is no
 * usual hour yet) → the median listing time with its sample (only from MEDIAN_MIN timed listings) → the most restocked
 * configuration with its share → restocks today → alerts sent in 7 days (when known). Each sentence names the place
 * and the iPhone Duo and carries its own window, so any one of them can be quoted alone.
 */
export function keyFacts(d: DuoNowData, o: { label: string; one: boolean; lang: Lang; D: Dict; countryTz: string; cfg?: (partNumber: string) => string }): Fact[] {
  const { label, one, lang } = o;
  const w = o.D.modules.duoNow;
  const F = o.D.views.restockTimes.fmt;
  const cfg = o.cfg ?? ((p: string) => { const i = PART_INDEX.get(p); return i ? configLabel(i, lang) : p; });
  const since = dateIn(d.since, lang);
  const out: ReactNode[] = [];
  if (d.unknown) out.push(w.unknown);
  else if (d.n === 0) out.push(w.neverYet(label, since));
  else {
    out.push(w.fN({ n: d.n, days: d.days, label, stores: d.storesTotal, one, since }));
    if (d.pattern && d.peakHour != null) {
      out.push(w.fShare({ pct: pctIn(d.window.share, lang), n: d.n, label, since, range: F.range(d.window.from, d.window.to), zone: w.zone(d.zones.length === 1 ? d.zones[0] : null), busiest: F.range(d.peakHour, d.peakHour + 1), busiestN: d.peakCount }));
    } else {
      out.push(w.fTooFew({ n: d.n, days: Math.max(1, d.days), label, min: PATTERN_MIN, minDays: PATTERN_MIN_DAYS }));
    }
    if (d.medianSec != null && d.medianN >= MEDIAN_MIN) out.push(w.fMedian({ median: about(d.medianSec, lang, w), n: d.medianN, label, since }));
    if (d.topPart && d.topPart.restocks > 0) out.push(w.fTop({ config: cfg(d.topPart.partNumber), k: d.topPart.restocks, n: d.n, pct: pctIn(d.topPart.share, lang), label, since }));
    out.push(w.fToday({ n: d.today, label, date: dateIn(ymdIn(d.at, o.countryTz), lang) }));
  }
  if (d.alerts && d.alerts.sent > 0) out.push(w.alerts({ sent: d.alerts.sent, stores: d.alerts.stores, total: d.storesTotal, days: d.alerts.days, label, one }));
  return out.map((node) => ({ node, text: textOf(node) }));
}

/** The lanes whose measured intervals a page quotes: the US lanes on US pages, the international ones elsewhere. */
export function lanesFor(country: CountryCode): { fast: Lane; round: Lane } {
  return country === "us" ? { fast: "fast-us", round: "round-us" } : { fast: "fast-intl", round: "round-intl" };
}

/**
 * Pure: the method line — how a restock and a listing time are counted, the planned intervals, and the 7-day measured
 * median and p95 of the page's lanes with their sample. A lane with no data is left out (never "0 s"); a record shorter
 * than 7 days names its own window; a median more than 10% above plan says "slower than planned".
 */
export function howCountedText(stats: ServiceStats | null, country: CountryCode, w: Words, lang: Lang): string {
  const lanes = lanesFor(country);
  const week = stats?.lanes["7d"];
  const f = week?.[lanes.fast] ?? null, r = week?.[lanes.round] ?? null;
  const m = (s: LaneStats | null, lane: Lane): MeasuredLane | null => (s && s.gaps > 0
    ? { p50: w.sec(decimal(s.p50Sec, lang)), p95: w.sec(decimal(s.p95Sec, lang)), n: s.gaps, slow: s.p50Sec > PLANNED_SEC[lane] * 1.1 }
    : null);
  const fast = m(f, lanes.fast), round = m(r, lanes.round);
  let win: { days?: number; hours?: number } | null = null;
  const froms = [fast && f, round && r].filter((x): x is LaneStats => Boolean(x)).map((x) => Date.parse(x.from)).filter(Number.isFinite);
  if (stats && froms.length > 0) {
    // The shorter record decides the window both lanes are quoted over (a lane that began yesterday is not "7 days").
    const spanH = (Date.parse(stats.at) - Math.max(...froms)) / 3600_000;
    win = spanH >= 156 ? { days: 7 } : spanH >= 48 ? { days: Math.floor(spanH / 24) } : { hours: Math.max(1, Math.ceil(spanH)) };
  }
  return w.howCounted({ fast, round, win });
}

/** Pure: the evidence line under the verdict (`stampNode` is the latest store check, a <time>). */
export function evidenceLine(d: DuoNowData, o: { one: boolean; name: string; w: Words; stampNode: ReactNode }): ReactNode {
  if (!d.checkedAt) return o.w.evidenceNone({ total: d.storesTotal, one: o.one, name: o.name });
  return o.w.evidence({ stamp: o.stampNode, fresh: d.fresh, total: d.storesTotal, stale: d.stale, one: o.one, name: o.name });
}

/* ---------------------------------------------------------------- component */

/** The block, with the measured check intervals it quotes read here (cached an hour; null-safe). */
export async function DuoNow(props: DuoNowProps) {
  const stats = await serviceStats();
  return <DuoNowView {...props} stats={stats} />;
}

export function DuoNowView({ d, label, name, one = false, stores, country = "us", restockTimesHref, alertHref, bare = false, stats }: DuoNowProps & { stats: ServiceStats | null }) {
  const loc = pageLocale();
  const lang = loc.lang;
  const D = t();
  const w = D.modules.duoNow;
  // Localised formats shared with the restock-times pages ("9–11 AM" / "9–11時").
  const F = D.views.restockTimes.fmt;
  const c = COUNTRIES[country];
  const byNumber = new Map(stores.map((s) => [s.storeNumber, s]));
  const storeOf = (n: string) => byNumber.get(n) ?? storeByNumber(n);
  const storeLink = (n: string): ReactNode => { const s = storeOf(n); return s ? <Link href={storePath(s)} className="font-medium text-ink underline-offset-2 hover:underline">{appleStoreLabel(s, lang)}</Link> : n; };
  const cfg = (p: string) => { const i = PART_INDEX.get(p); return i ? configLabel(i, lang) : p; };
  // One zone: stamps in it; a country across zones: its reference zone (the store's own zone for store-level times).
  const tz = d.zones.length === 1 ? d.zones[0] : c.timeZone;
  // The latest store check, never the page's own time: a page generated a second ago can rest on an older answer.
  const nowStamp = stampIn(d.checkedAt ?? d.at, tz, lang);

  /* Verdict */
  let verdict: ReactNode;
  if (d.inStock.length === 0) verdict = one ? w.notNowOne({ stamp: nowStamp, name }) : w.notNow({ stamp: nowStamp, n: d.storesTotal, label });
  else if (one) {
    const parts = d.inStock[0].parts;
    const list = parts.slice(0, 8).map((p, i) => <span key={p}>{i ? ", " : ""}{w.configItem(cfg(p), null)}</span>);
    verdict = w.inStockOne({ stamp: nowStamp, k: d.inStock[0].configs, total: d.configsTotal, name, list });
  } else {
    const shown = d.inStock.slice(0, 5);
    const list = <>{shown.map((x, i) => <span key={x.storeNumber}>{i ? ", " : ""}{w.storeItem(storeLink(x.storeNumber), x.configs, null)}</span>)}{d.inStock.length > shown.length ? ` +${d.inStock.length - shown.length}` : ""}</>;
    verdict = w.inStock({ stamp: nowStamp, k: d.inStock.length, n: d.storesTotal, label, list });
  }
  const last = d.last;
  const lastStore = last ? storeOf(last.storeNumber) : undefined;
  // With no restock on record the Key facts open with "no confirmed restock since …", so the verdict does not repeat it.
  const lastLine = last
    ? w.lastIn({ config: cfg(last.partNumber), store: one ? null : storeLink(last.storeNumber), when: stampIn(last.at, lastStore ? storeTimeZone(lastStore) : tz, lang), lasted: lifetime(last, w) })
    : null;
  const others = w.others({ pro: d.others.pro, max: d.others.max, one, configs: 16 });
  const evidence = evidenceLine(d, { one, name, w, stampNode: d.checkedAt ? <time dateTime={d.checkedAt}>{nowStamp}</time> : null });

  /* Key facts, method */
  const facts = keyFacts(d, { label, one, lang, D, countryTz: c.timeZone, cfg });
  const howCounted = howCountedText(stats, country, w, lang);

  /* Tiles: the same numbers at a glance (none while the pattern read failed or before the first restock) */
  const since = dateIn(d.since, lang);
  const range = F.range(d.window.from, d.window.to);
  const busiest = d.peakHour != null ? F.range(d.peakHour, d.peakHour + 1) : null;
  const tiles: ReactNode[] = [];
  if (!d.unknown && d.n > 0) {
    if (d.pattern && busiest) {
      tiles.push(<Stat key="share" value={pctIn(d.window.share, lang)} label={w.tShare(range)} tone="accent" />);
      tiles.push(<Stat key="busy" value={<span className="text-2xl sm:text-3xl">{busiest}</span>} label={w.tBusiest(d.peakCount)} size="sm" />);
    }
    if (d.medianSec != null && d.medianN >= MEDIAN_MIN) tiles.push(<Stat key="half" value={d.medianSec < 100 ? N(Math.round(d.medianSec), lang) : N(Math.round(d.medianSec / 60), lang)} unit={d.medianSec < 100 ? "s" : "min"} label={w.tHalf} tone="warn" />);
    tiles.push(<Stat key="n" value={N(d.n, lang)} label={w.tSince(since)} />);
    if (tiles.length < 4) tiles.push(<Stat key="today" value={N(d.today, lang)} label={w.tToday} tone="muted" />);
  }

  const linkCls = "font-medium text-ink underline-offset-2 hover:underline";
  const body = (
    <>
      <p className="eyebrow">{w.eyebrow(label)}</p>
      <p className="mt-2 max-w-3xl text-lg leading-relaxed text-ink-2">{verdict}{lastLine ? <> {lastLine}</> : null} {others}</p>
      <p className="mt-2 max-w-3xl text-sm text-ink-3">{evidence}</p>
      {facts.length > 0 && (
        <div className="pane-2 mt-4 max-w-3xl p-4">
          <h2 id="key-facts" className="text-xs font-semibold uppercase tracking-wide text-ink-3">{w.factsTitle(label)}</h2>
          <ul className="mt-2 space-y-1.5 text-sm leading-snug text-ink-2">
            {facts.map((f) => (
              <li key={f.text} className="flex gap-2"><span aria-hidden className="mt-[0.5em] size-1.5 shrink-0 rounded-full bg-accent" /><span className="min-w-0">{f.node}</span></li>
            ))}
          </ul>
          {restockTimesHref && <p className="mt-2 text-sm"><Link href={restockTimesHref} className={linkCls}>{w.hourByHour}</Link></p>}
        </div>
      )}
      {tiles.length > 0 && <StatGrid cols={tiles.length === 4 ? 4 : 3} className="mt-4">{tiles}</StatGrid>}
      <p className="mt-3 max-w-3xl text-xs leading-relaxed text-ink-3" data-method>
        {howCounted} <Link href={MEASURED_HREF} className="font-medium underline underline-offset-2 hover:text-ink">{w.howLink}</Link>
      </p>
      {d.lastThree.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold">{w.lastThree(d.lastThree.length, label)}</h3>
          <ol className="mt-2 grid gap-2 sm:grid-cols-3">
            {d.lastThree.map((r) => {
              const s = storeOf(r.storeNumber);
              const life = lifetime(r, w);
              return (
                <li key={`${r.storeNumber}-${r.partNumber}-${r.at}`} className="rounded-[var(--radius-2)] border border-line bg-[var(--fill-1)] p-3 text-sm">
                  <div className="font-semibold tabular-nums text-ink"><time dateTime={r.at}>{stampIn(r.at, s ? storeTimeZone(s) : tz, lang)}</time></div>
                  <div className="mt-0.5 text-ink-2">{cfg(r.partNumber)}{!one && s ? <> · {storeLink(r.storeNumber)}</> : null}</div>
                  {life && <div className="mt-0.5 text-xs text-ink-3">{life}</div>}
                </li>
              );
            })}
          </ol>
        </div>
      )}
      {alertHref && (
        <p className="mt-3 text-sm text-ink-2"><Link href={alertHref} className={linkCls}>{w.alertMe(label)} →</Link></p>
      )}
    </>
  );
  // The page's freshness for crawlers and answer engines: dateModified = the latest store check, with the dataset the
  // block summarises (its description is the Key facts, its technique the method).
  const ld = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    dateModified: d.checkedAt ?? d.at,
    mainEntity: {
      "@type": "Dataset",
      name: w.eyebrow(label),
      description: facts.length > 0 ? facts.map((f) => f.text).join(" ") : textOf(verdict),
      measurementTechnique: w.technique,
      temporalCoverage: `${d.since}/${d.at.slice(0, 10)}`,
      creator: { "@type": "Organization", name: "PickupChecker", url: "https://pickupchecker.com" },
      license: "https://pickupchecker.com/iphone-duo-stock-api",
      variableMeasured: ["in-store pickup availability", "confirmed restocks", "seconds listed before sell-out"],
    },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      {bare ? <div data-block="duo-now">{body}</div> : <section className="pane p-5 sm:p-6" aria-label={w.eyebrow(label)} data-block="duo-now">{body}</section>}
    </>
  );
}
