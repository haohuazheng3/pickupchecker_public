/**
 * "iPhone Duo {in this place} right now": the conclusion block a place page opens with (lib/content/duoNow.ts says
 * why). Order: the time-stamped verdict and the last time it was in stock → the dated line → four tiles since
 * tracking began → the quotable paragraph → the last three restocks with their lifetimes → alerts sent. Server
 * component; every number comes from `DuoNow`; strings from the dictionary (12 languages).
 */
import type { ReactNode } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { PART_INDEX, storeByNumber, storePath, storeTimeZone, type Store } from "@/lib/apple/catalog";
import { COUNTRIES, type CountryCode } from "@/lib/apple/countries";
import type { DuoNow as DuoNowData, DuoRestockLine } from "@/lib/content/duoNow";
import { t, pageLocale } from "@/lib/i18n/server";
import { num, stamp } from "@/lib/i18n/format";
import { appleStoreLabel, configLabel } from "@/lib/i18n/places";
import type { Lang } from "@/lib/i18n/locales";
import { Stat, StatGrid } from "@/components/ui/Viz";

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

/* ---------------------------------------------------------------- formats (English as the site writes it; other languages through format.ts) */

function stampIn(iso: string, tz: string, lang: Lang): string {
  if (lang !== "en") return stamp(lang, iso, tz, true);
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(iso));
}
function dateIn(ymd: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "en" ? "en-US" : lang, { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
}
const N = (n: number, lang: Lang) => (lang === "en" ? n.toLocaleString("en-US") : num(lang, n));
const pct = (x: number) => `${Math.round(x * 100)}%`;

/** "45 s", "2 min", "1 h 10 min" — a lifetime or an age, through the dictionary's units. */
function dur(sec: number, d: { secs: (n: number) => string; mins: (n: number) => string }, lang: Lang): string {
  void lang; // the dictionary's units format their own numbers
  if (sec < 100) return d.secs(Math.max(1, Math.round(sec)));
  if (sec < 5400) return d.mins(Math.round(sec / 60));
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
  return m ? `${h} h ${d.mins(m)}` : `${h} h`;
}
/** "about 95 seconds", "about 3 minutes": the median as a sentence says it (English); other languages use their own units. */
function about(sec: number, lang: Lang, d: { secs: (n: number) => string; mins: (n: number) => string }): string {
  if (lang !== "en") return dur(sec, d, lang);
  if (sec < 100) return `about ${Math.max(5, Math.round(sec / 5) * 5)} seconds`;
  if (sec < 3600) return `about ${Math.round(sec / 60)} minutes`;
  return `about ${(sec / 3600).toFixed(1)} hours`;
}

function lifetime(r: DuoRestockLine, d: ReturnType<typeof t>["modules"]["duoNow"], lang: Lang): string | null {
  if (r.listedSec != null) return d.stillListed(dur(r.listedSec, d, lang));
  if (r.highSec == null) return null;
  const low = r.lowSec ?? 0;
  // Both bounds inside a minute: "listed 45–60 s"; wider: "listed 5–7 min"; equal: "listed about 2 min".
  const a = dur(low, d, lang), b = dur(r.highSec, d, lang);
  return a === b || low === 0 ? d.listedAbout(b) : d.listedRange(a, b);
}

/* ---------------------------------------------------------------- component */

export function DuoNow({ d, label, name, one = false, stores, country = "us", restockTimesHref, alertHref, bare = false }: DuoNowProps) {
  const loc = pageLocale();
  const lang = loc.lang;
  const w = t().modules.duoNow;
  // Localised formats shared with the restock-times pages ("9–11 AM" / "9–11時"), and the check-interval phrase in the page's language.
  const F = t().views.restockTimes.fmt;
  const checkNote = t().pages.common.checkNote;
  const c = COUNTRIES[country];
  const byNumber = new Map(stores.map((s) => [s.storeNumber, s]));
  const storeOf = (n: string) => byNumber.get(n) ?? storeByNumber(n);
  const storeLink = (n: string): ReactNode => { const s = storeOf(n); return s ? <Link href={storePath(s)} className="font-medium text-ink underline-offset-2 hover:underline">{appleStoreLabel(s, lang)}</Link> : n; };
  const cfg = (p: string) => { const i = PART_INDEX.get(p); return i ? configLabel(i, lang) : p; };
  // One zone: stamps in it; a country across zones: its reference zone (the store's own zone for store-level times).
  const tz = d.zones.length === 1 ? d.zones[0] : c.timeZone;
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
  const lastLine = last
    ? w.lastIn({ config: cfg(last.partNumber), store: one ? null : storeLink(last.storeNumber), when: stampIn(last.at, lastStore ? storeTimeZone(lastStore) : tz, lang), lasted: lifetime(last, w, lang) })
    : d.unknown ? null : w.neverYet(label, dateIn(d.since, lang));
  const others = w.others({ pro: d.others.pro, max: d.others.max, one, configs: 16 });

  /* Pattern */
  const since = dateIn(d.since, lang);
  const zone = w.zone(d.zones.length === 1 ? d.zones[0] : null);
  const range = F.range(d.window.from, d.window.to);
  const busiest = d.peakHour != null ? F.range(d.peakHour, d.peakHour + 1) : null;
  const median = d.medianSec != null ? about(d.medianSec, lang, w) : null;
  const top = d.topPart;
  const summary = d.unknown
    ? w.unknown
    : d.pattern && busiest
      ? w.summary({ pct: pct(d.window.share), n: d.n, stores: d.storesTotal, label, since, range, zone, busiest, busiestN: d.peakCount, median, config: top ? cfg(top.partNumber) : null, k: top?.restocks ?? 0, one })
      : d.n > 0 ? w.tooFew({ n: d.n, label, since, one, stores: d.storesTotal }) : null;

  const tiles: ReactNode[] = [];
  if (d.pattern && busiest) {
    tiles.push(<Stat key="share" value={pct(d.window.share)} label={w.tShare(range)} tone="accent" />);
    tiles.push(<Stat key="busy" value={<span className="text-2xl sm:text-3xl">{busiest}</span>} label={w.tBusiest(d.peakCount)} size="sm" />);
  }
  if (median) tiles.push(<Stat key="half" value={d.medianSec! < 100 ? N(Math.round(d.medianSec!), lang) : N(Math.round(d.medianSec! / 60), lang)} unit={d.medianSec! < 100 ? "s" : "min"} label={w.tHalf} tone="warn" />);
  tiles.push(<Stat key="n" value={N(d.n, lang)} label={w.tSince(since)} />);
  if (tiles.length < 4) tiles.push(<Stat key="today" value={N(d.today, lang)} label={w.tToday} tone="muted" />);

  const body = (
    <>
      <p className="eyebrow">{w.eyebrow(label)}</p>
      <p className="mt-2 max-w-3xl text-lg leading-relaxed text-ink-2">{verdict}{lastLine ? <> {lastLine}</> : null} {others}</p>
      <p className="mt-2 text-sm text-ink-3">
        <time dateTime={d.checkedAt ?? d.at}>{w.updated(nowStamp)}</time> · {w.checked(checkNote)} · {w.since(since)} · {w.method}
      </p>
      {tiles.length > 0 && <StatGrid cols={tiles.length === 4 ? 4 : 3} className="mt-4">{tiles}</StatGrid>}
      {summary && (
        <p className="mt-4 max-w-3xl leading-relaxed text-ink-2">
          {summary}
          {restockTimesHref && <> <Link href={restockTimesHref} className="font-medium text-ink underline-offset-2 hover:underline">{w.hourByHour}</Link></>}
        </p>
      )}
      {d.lastThree.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold">{w.lastThree(d.lastThree.length, label)}</h3>
          <ol className="mt-2 grid gap-2 sm:grid-cols-3">
            {d.lastThree.map((r) => {
              const s = storeOf(r.storeNumber);
              const life = lifetime(r, w, lang);
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
      {(d.alerts && d.alerts.sent > 0) || alertHref ? (
        <p className="mt-3 text-sm text-ink-2">
          {d.alerts && d.alerts.sent > 0 ? w.alerts({ sent: d.alerts.sent, stores: d.alerts.stores, total: d.storesTotal, days: d.alerts.days, label, one }) : null}
          {alertHref && <> <Link href={alertHref} className="font-medium text-ink underline-offset-2 hover:underline">{w.alertMe(label)} →</Link></>}
        </p>
      ) : null}
    </>
  );
  // The page's freshness for crawlers and answer engines: dateModified = the latest check, with the dataset the
  // block summarises (a page without a dateModified is read as "old" next to a competitor's dated page).
  const ld = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    dateModified: d.checkedAt ?? d.at,
    mainEntity: {
      "@type": "Dataset",
      name: w.eyebrow(label),
      description: summary ?? verdictText(verdict),
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

/** The verdict as plain text for the Dataset description (strings and the text of simple elements). */
function verdictText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(verdictText).join("");
  if (typeof node === "object" && "props" in node) return verdictText((node as { props: { children?: ReactNode } }).props.children);
  return "";
}
