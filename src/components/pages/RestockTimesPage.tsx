/**
 * /iphone-duo-restock-times and /{cc}/iphone-duo-restock-times: "Is Apple still restocking the iPhone Duo, and
 * when?" answered the way an answer engine can quote it — one sentence with the numbers under every question — and
 * shown the way a reader scans it: tiles, tables by local hour, day, region, store and configuration, keyword lines,
 * swap cards and folded notes. Every number is PickupChecker's own confirmed observation (lib/content/restockTimes.ts);
 * other trackers' launch-week reports appear as their own, labelled rows and are never counted.
 *
 * With a `scope` the same page answers for one region or city of a country other than the US
 * (/{cc}/iphone-duo-restock-times/{region}[/{city}], restockPlaces.ts): every number is counted over the place's
 * stores, every sentence names the place, and the "where" section lists its cities and stores.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cache } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs, LinkRow, RelatedBlock, type Crumb } from "@/components/seo/Related";
import { Figure } from "@/components/content/Figure";
import { RichFaq, SourceList } from "@/components/content/RichFaq";
import { Chips, Measured, Points, Stat, StatGrid, Swap, type Point } from "@/components/ui/Viz";
import { emptyFacts } from "@/lib/content/facts";
import type { Faq, Source } from "@/lib/content/types";
import { catalogFor, storeByNumber, storePath, storeTimeZone, storesOf, type Store } from "@/lib/apple/catalog";
import { ALL_CODES, COUNTRIES, prefixOf, type Country } from "@/lib/apple/countries";
import { DUO_LAUNCH_DAY, DUO_PICKUP_RESUMED, busiestWindow, duoRestockTimes, duoRestockTimesAt, hourShare, type DayRow } from "@/lib/content/restockTimes";
import { restockPlacePages, restockPlaceTarget } from "@/lib/content/restockPlaces";
import { recentByConfig } from "@/lib/stock/recent";
import { storesWithStockNow } from "@/lib/stock/queries";
import { alertHref } from "@/lib/seo/enrich";
import { REPORT_SOURCES } from "@/lib/restockReports";
import { englishLocale, pathInLocale, type Lang, type Locale } from "@/lib/i18n/locales";
import { dict } from "@/lib/i18n/dict";
import { pageLocale, t as dictT } from "@/lib/i18n/server";
import { cityLabel, colorLabel, configLabel, countryLabel, regionLabel } from "@/lib/i18n/places";
import type { RestockTimesPlace, RestockTimesView } from "@/lib/i18n/dict/en/views";
import { alternatesIn, hreflangFor } from "./shared";
import { restockPlaces } from "./PlaceRestockTimesPage";
import { CHECK_NOTE } from "@/lib/plans";

const SITE = "https://pickupchecker.com";
/** "Nov 5, 2026, 10:12 AM EST": the visible "updated" stamp, in the country's reference zone. */
const UPDATED = (tz: string) => new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });

/** One region or city of a country other than the US that has a restock-times page of its own (restockPlaces.ts). */
export interface RestockTimesScope {
  kind: "region" | "city";
  /** English data names. */
  region: string;
  regionSlug: string;
  city?: string;
  citySlug?: string;
  stores: Store[];
  /** /{cc}/iphone-duo-restock-times/{region}[/{city}] (English form), and the place's live /stores page. */
  path: string;
  storesPath: string;
}

/** The scope of /{cc}/iphone-duo-restock-times/{region}[/{city}]; null when the place has no page of its own. */
export function restockTimesScope(cc: Country["cc"], regionSlug: string, citySlug?: string): RestockTimesScope | null {
  if (cc === "us") return null;
  const r = restockPlaceTarget(cc, regionSlug, citySlug);
  if (!r || !("page" in r)) return null;
  const p = r.page;
  return { kind: p.level, region: p.region, regionSlug, city: p.city, citySlug, stores: p.stores, path: p.path, storesPath: p.storesPath };
}

/** The scope as the dictionary sees it: the place's name in the page's language and its links. */
function placeOf(cc: Country["cc"], scope: RestockTimesScope, lang: Lang): RestockTimesPlace {
  const name = scope.kind === "city" ? cityLabel(cc, scope.city!, lang) : regionLabel(cc, scope.region, lang);
  const parent = scope.kind === "city" ? restockPlaceTarget(cc, scope.regionSlug) : null;
  return { kind: scope.kind, name, inName: `in ${name}`, storesHref: scope.storesPath, parentHref: parent && "page" in parent ? parent.page.path : null };
}

/** `key`: null = the whole country; the place's store numbers joined by commas = one place (a stable cache key). */
const load = cache(async (cc: Country["cc"], key: string | null) => {
  if (!key) return Promise.all([duoRestockTimes(cc), storesWithStockNow(undefined, cc), recentByConfig({ country: cc })]);
  const numbers = key.split(",");
  const stores = numbers.map((n) => storeByNumber(n)).filter((s): s is Store => Boolean(s));
  return Promise.all([duoRestockTimesAt(cc, stores), storesWithStockNow(numbers, cc), recentByConfig({ storeNumbers: numbers, country: cc })]);
});
const keyOf = (scope?: RestockTimesScope | null) => (scope ? scope.stores.map((s) => s.storeNumber).sort().join(",") : null);

export const RESTOCK_TIMES_TITLE_US = "When Does Apple Restock the iPhone Duo? Times by Hour & Day";

export function restockTimesTitle(c: Country, lang: Lang = "en", place?: RestockTimesPlace): string {
  return c.cc === "us" ? RESTOCK_TIMES_TITLE_US : dict(lang).views.restockTimes.title(c, place);
}

export async function restockTimesMetadata(c: Country, loc: Locale = englishLocale(c.cc), scope?: RestockTimesScope | null): Promise<Metadata> {
  const [t] = await load(c.cc, keyOf(scope));
  const place = scope ? placeOf(c.cc, scope, loc.lang) : undefined;
  const title = restockTimesTitle(c, loc.lang, place);
  const description = dict(loc.lang).views.restockTimes.metaDescription({ c, t, w: busiestWindow(t.byHour), pattern: t.peakHour != null, place });
  if (scope) {
    const alternates = alternatesIn(scope.path, loc);
    return {
      title: { absolute: `${title} · PickupChecker` },
      description,
      alternates,
      openGraph: { type: "article", siteName: "PickupChecker", title, description, url: alternates.canonical },
    };
  }
  const path = `${prefixOf(c.cc)}/iphone-duo-restock-times`;
  const url = loc.native ? pathInLocale(path, loc) : path;
  return {
    title: { absolute: `${title} · PickupChecker` },
    description,
    alternates: { canonical: url, languages: hreflangFor("restock-times", loc) },
    openGraph: { type: "article", siteName: "PickupChecker", title, description, url },
  };
}

const th = "border-b border-line-2 py-2 pe-3 text-start font-semibold text-ink";
const td = "py-2 pe-3 align-top tabular-nums";
const rowTh = "py-2 pe-3 text-start font-medium text-ink";

function Table({ caption, head, children, min = "28rem" }: { caption: string; head: string[]; children: React.ReactNode; min?: string }) {
  return (
    <div className="my-5 overflow-x-auto">
      <table className="w-full border-collapse text-sm" style={{ minWidth: min }}>
        <caption className="mb-2 text-start text-xs text-ink-3">{caption}</caption>
        <thead><tr>{head.map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** Keyword lines inside the prose pane (the pane's list indent is turned off). */
function Keys({ items, className = "my-3" }: { items: Point[]; className?: string }) {
  return <Points items={items} className={`${className} ml-0!`} />;
}

/** A row of page links as chips. */
function ChipLinks({ items }: { items: { href: string; label: string }[] }) {
  return <div className="my-3 flex flex-wrap gap-1.5">{items.map((l) => <Link key={l.href} href={l.href} className="chip chip-sm no-underline!">{l.label}</Link>)}</div>;
}

export async function RestockTimesPage({ country: c, scope }: { country: Country; scope?: RestockTimesScope | null }) {
  const cc = c.cc;
  const us = cc === "us";
  const loc = pageLocale();
  const lang = loc.lang;
  const V = dictT().views.restockTimes;
  const C = dictT().views.common;
  const F = V.fmt;
  const [t, stockNow, recent] = await load(cc, keyOf(scope));
  const stores = scope ? scope.stores : storesOf(cc);
  const place = scope ? placeOf(cc, scope, lang) : undefined;
  const one = stores.length === 1;
  const facts = emptyFacts(cc);
  const items = catalogFor("duo", cc);
  const cfg = (p: string) => { const i = items.find((x) => x.partNumber === p); return i ? configLabel(i, lang) : p; };
  const w = busiestWindow(t.byHour);
  const pattern = t.peakHour != null;
  const duoNow = stockNow.duo;
  const today = t.today;
  const latestStore = t.latest ? storeByNumber(t.latest.storeNumber) : undefined;
  const stamp = (iso: string, storeNumber: string) => F.local(iso, storeByNumber(storeNumber) ?? stores[0]);
  const alert = scope ? alertHref({ model: "duo", state: scope.regionSlug, city: scope.citySlug, country: cc }) : alertHref({ model: "duo", country: cc });
  const logHref = us ? "/restocks" : `${prefixOf(cc)}/restocks`;
  const storesHref = scope ? scope.storesPath : us ? "/stores" : (prefixOf(cc) || "/");
  const countryPath = `${prefixOf(cc)}/iphone-duo-restock-times`;
  const enPath = scope ? scope.path : countryPath;
  const url = loc.native ? pathInLocale(enPath, loc) : enPath;
  const title = restockTimesTitle(c, lang, place);
  const region = (name: string) => regionLabel(cc, name, lang);
  const city = (name: string) => cityLabel(cc, name, lang);

  /** Days from the first tracked one to today, restocks or not (spanDays counts only days between the first and last restock). */
  const tracked = Math.max(t.daily.length, t.days, 1);
  const hours = t.byHour.map((count, hour) => ({ hour, count })).filter((h) => h.count > 0);
  const topHours = [...hours].sort((a, b) => b.count - a.count).slice(0, 3);
  const busiestDay = t.daily.reduce<DayRow | null>((a, d) => (d.restocks > (a?.restocks ?? 0) ? d : a), null);
  // A region page breaks down by its cities, a city page by its stores (below), a country by its regions.
  const regions = scope?.kind === "region" ? t.byCity : t.byRegion;
  const unitName = scope?.kind === "region" ? city : region;
  const regionsHit = regions.filter((r) => r.restocks > 0);
  const topRegions = regionsHit.slice(0, 12);
  const topStores = t.topStores.slice(0, scope ? t.topStores.length : 8).map((r) => ({ ...r, store: storeByNumber(r.storeNumber) })).filter((r) => r.store);
  const parts = t.byPart;
  const topPart = parts[0];
  const lastPart = parts.length ? parts[parts.length - 1] : undefined;
  const byStorage = new Map<string, number>(), byColor = new Map<string, number>();
  for (const p of parts) { const i = items.find((x) => x.partNumber === p.partNumber); if (!i) continue; byStorage.set(i.storage, (byStorage.get(i.storage) ?? 0) + p.restocks); byColor.set(i.color, (byColor.get(i.color) ?? 0) + p.restocks); }
  const storageTop = [...byStorage.entries()].sort((a, b) => b[1] - a[1]);
  const colorTop = [...byColor.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => [colorLabel(k, lang), v] as const);
  const storageRatio = storageTop.length > 1 && storageTop[1][1] > 0 ? Math.max(1, Math.round((storageTop[0][1] / storageTop[1][1]) * 10) / 10) : null;
  const pairs = stores.length * items.length;
  const drop = t.drops.find((d) => d.stores >= 2) ?? null;
  const reportNames = Object.keys(REPORT_SOURCES);
  const weekend = t.byWeekday[0] + t.byWeekday[6];
  const sell = t.sellout;

  // Every sentence below reads its numbers from here (the dictionary's RestockTimesView).
  const x: RestockTimesView = {
    c, t, w, pattern, us, one, tracked, stores: stores.length, duoNow, weekend, sell,
    recent: { restocks: recent.restocks, stores: recent.stores }, configs: items.length, pairs, storageRatio, reportNames, alert, logHref, storesHref,
    ...(place ? { place } : {}),
  };

  const NAV = V.nav(x), H2 = V.h2(x);
  const sections: { id: string; nav: string; h2: string }[] = ["time-of-day", "day-by-day", ...(one ? [] : ["where"]), "configuration", "how-long", "unavailable", "reddit", "method"].map((id) => ({ id, nav: NAV[id], h2: H2[id] }));
  const h2Of = (id: string) => sections.find((s) => s.id === id)!.h2;

  const faq: Faq[] = V.faq(x);

  const sources: Source[] = [
    { label: V.sources.applePickup, url: "https://www.apple.com/shop/shipping-pickup" },
    { label: V.sources.newsroom, url: "https://www.apple.com/newsroom/2026/10/iphone-duo-arrives-at-apple-store-locations-worldwide/" },
    ...(us ? [{ label: V.sources.macRumors, url: "https://macrumors.com/2026/10/24/apple-store-pickup-iphone-duo-us/" }] : []),
    ...(t.reports.length ? reportNames.filter((k) => REPORT_SOURCES[k]).map((k) => ({ label: V.sources.reports(k), url: REPORT_SOURCES[k] })) : []),
  ];

  const L = V.ld(x);
  const inLanguage = loc.native ? { inLanguage: loc.tag } : {};
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${SITE}${url}`, url: `${SITE}${url}`, name: title, isPartOf: { "@id": `${SITE}/#website` }, about: { "@id": `${SITE}/#organization` }, dateModified: t.at, ...inLanguage },
      {
        "@type": "Dataset", "@id": `${SITE}${url}#dataset`, name: L.datasetName,
        description: L.description,
        url: `${SITE}${url}`, creator: { "@id": `${SITE}/#organization` }, isAccessibleForFree: true, temporalCoverage: `${t.since}/..`,
        spatialCoverage: L.spatial, variableMeasured: L.measured,
        ...(t.n ? { size: L.size } : {}),
        ...inLanguage,
      },
    ],
  };

  const short = (k: Country["cc"]) => (lang === "en" ? COUNTRIES[k].short : countryLabel(k, lang));
  const crumbs: Crumb[] = us
    ? [{ href: "/", label: "PickupChecker" }, { label: V.crumb }]
    : scope
      ? [
        { href: prefixOf(cc), label: short(cc) },
        { href: countryPath, label: V.crumb },
        ...(scope.kind === "city"
          ? [...(place!.parentHref ? [{ href: place!.parentHref, label: region(scope.region) }] : []), { label: place!.name }]
          : [{ label: place!.name }]),
      ]
      : [{ href: prefixOf(cc), label: short(cc) }, { label: V.crumb }];
  const otherCountries = ALL_CODES.filter((k) => k !== cc).map((k) => ({ href: `${prefixOf(k)}/iphone-duo-restock-times`, label: short(k) }));
  // The country's place pages ("When does the iPhone Duo restock in Greater London?"), the page itself left out.
  const placePages = us ? { regions: [], cities: [] } : restockPlacePages(cc);
  const regionLinks = placePages.regions.filter((p) => p.path !== enPath).map((p) => ({ href: p.path, label: region(p.region), meta: String(p.stores.length) }));
  const cityLinks = placePages.cities.filter((p) => p.path !== enPath).map((p) => ({ href: p.path, label: city(p.city!), meta: String(p.stores.length) }));
  /** "By county" as the country page says it, whatever page this is. */
  const byRegion = V.nav({ ...x, place: undefined }).where;

  /** The hero tiles: restocks, the window (or the days), stock now, today (or the weekday). */
  const heroTiles: ReactNode[] = t.n > 0 && !t.unknown
    ? [
      <Stat key="n" value={F.n(t.n)} label={V.hero.restocks(x)} tone="accent" />,
      pattern
        ? <Stat key="w" value={F.pct(w.share)} label={V.hero.window(x)} />
        : <Stat key="d" value={`${t.days}/${tracked}`} label={V.hero.days} />,
      <Stat key="now" value={`${duoNow}/${stores.length}`} label={V.hero.now(one)} live />,
      today
        ? <Stat key="today" value={F.n(today.restocks)} label={V.hero.today(x, today)} />
        : t.peakWeekday != null
          ? <Stat key="wd" value={<span className="text-2xl sm:text-3xl">{F.weekday(t.peakWeekday)}</span>} label={V.hero.weekday} />
          : <Stat key="d2" value={`${t.days}/${tracked}`} label={V.hero.days} />,
    ]
    : [];

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8">
      <JsonLd data={ld} />
      <Breadcrumbs items={crumbs} />
      <h1 className="display mt-3 text-3xl sm:text-5xl">{V.h1(x)}</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-2">
        {V.intro(x)}
      </p>
      {/* The visible date an answer engine quotes next to the numbers (docs/research.md §8.3): English pages only. */}
      {lang === "en" && <p className="mt-2 text-sm text-ink-3">Updated {UPDATED(scope ? storeTimeZone(stores[0]) : c.timeZone).format(new Date(t.at))} · data since {F.longDate(t.since)} · {stores.length} Apple {one ? "Store" : "Stores"} · checked {CHECK_NOTE}</p>}
      {heroTiles.length > 0 && <StatGrid cols={4} className="mt-6">{heroTiles}</StatGrid>}
      {!t.unknown && t.n > 0 && (
        <Points className="mt-4" items={V.heroPoints(x, t.latest && latestStore && today && today.restocks > 0 ? { config: cfg(t.latest.partNumber), store: latestStore, at: t.latest.at } : null)} />
      )}
      {!t.unknown && t.n === 0 && (
        <Points className="mt-4" items={V.emptyPoints(x)} />
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={alert} className="btn btn-primary">{V.setUpAlert}</Link>
        <Link href={logHref} className="btn btn-ghost">{V.logLive}</Link>
      </div>
      <nav aria-label={V.onThisPage} className="mt-6 flex flex-wrap gap-2 text-sm">
        {sections.map((s) => <a key={s.id} href={`#${s.id}`} className="chip px-3 py-1.5 text-xs">{s.nav}</a>)}
      </nav>
      <Figure id="closed-sign-return-time" eager />

      <div className="pane prose-site mt-8 p-6 sm:p-8">
        {/* ---------------------------------------------------------------- time of day */}
        <section id="time-of-day" className="scroll-mt-24">
          <h2>{h2Of("time-of-day")}</h2>
          {pattern ? (
            <>
              <p>{V.timeLead(x)}</p>
              <StatGrid cols={4} className="my-4">
                <Stat value={<span className="text-2xl sm:text-3xl">{F.range(t.peakHour!, t.peakHour! + 1)}</span>} label={V.busiestHour(t.byHour[t.peakHour!])} tone="accent" />
                <Stat value={F.pct(hourShare(t.byHour, 8, 12))} label={V.morning} />
                <Stat value={F.pct(hourShare(t.byHour, 17, 24))} label={V.evening} />
                <Stat value={F.pct(hourShare(t.byHour, 0, 6))} label={V.night} tone="muted" />
              </StatGrid>
              {topHours.length > 0 && <Chips className="my-3" items={topHours.map((h) => `${F.range(h.hour, h.hour + 1)} · ${F.n(h.count)}`)} on={[0]} />}
            </>
          ) : (
            <>
              <p>{V.tooFew(x)}</p>
              <Keys items={V.tooFewKeys()} />
            </>
          )}
          {hours.length > 0 && (
            <Table caption={V.hourCaption(x)} head={V.hourHead} min="20rem">
              {hours.map((h) => (
                <tr key={h.hour} className={`border-b border-line ${pattern && h.hour >= w.from && h.hour < w.to ? "bg-accent/[0.06]" : ""}`}>
                  <th scope="row" className={rowTh}>{F.range(h.hour, h.hour + 1)}</th>
                  <td className={td}>{F.n(h.count)}</td>
                  <td className={td}>{F.pct(h.count / t.n)}</td>
                </tr>
              ))}
            </Table>
          )}
          {pattern && (
            <Keys items={V.morningKeys(x)} />
          )}
          <Keys items={V.storeChartKeys(x)} />
        </section>

        {/* ---------------------------------------------------------------- day by day */}
        <section id="day-by-day" className="scroll-mt-24">
          <h2>{h2Of("day-by-day")}</h2>
          <p>{V.dayLead(x)}</p>
          {t.n > 0 && (
            <StatGrid cols={3} className="my-4">
              <Stat value={`${t.days}/${tracked}`} label={V.daysTracked} />
              {busiestDay
                ? <Stat value={F.n(busiestDay.restocks)} label={V.busiestDay(x, busiestDay)} tone="accent" />
                : <Stat value="–" label={V.busiestDayNone} tone="muted" />}
              {drop
                ? <Stat value={drop.stores} label={V.drop(x, drop)} />
                : <Stat value={F.pct(weekend / t.n)} label={V.weekend(x)} />}
            </StatGrid>
          )}
          <Table caption={V.dayCaption(x)} head={[V.dayHead.date, V.dayHead.restocks, one ? "" : V.dayHead.stores, V.dayHead.busiest, V.dayHead.source].filter(Boolean)} min="30rem">
            {[...t.daily].reverse().map((d) => (
              <tr key={d.date} className="border-b border-line">
                <th scope="row" className={rowTh}>{F.date(d.date)}{today && d.date === today.date ? <span className="text-ink-3">{V.soFar}</span> : ""}</th>
                <td className={td}>{F.n(d.restocks)}</td>
                {!one && <td className={td}>{d.stores}</td>}
                <td className={td}>{d.peakHour == null ? "–" : F.range(d.peakHour, d.peakHour + 1)}</td>
                <td className="py-2 pe-3 align-top text-ink-3">PickupChecker</td>
              </tr>
            ))}
            {[...t.reports].reverse().map((d) => (
              <tr key={d.date} className="border-b border-line text-ink-3">
                <th scope="row" className="py-2 pe-3 text-start font-medium">{F.date(d.date)}</th>
                <td className={td}>{F.n(d.restocks)}</td>
                {!one && <td className={td}>{d.stores}</td>}
                <td className={td}>{d.peakHour == null ? "–" : F.range(d.peakHour, d.peakHour + 1)}</td>
                <td className="py-2 pe-3 align-top">{V.reportedBy(reportNames)}</td>
              </tr>
            ))}
          </Table>
          <Keys items={V.dayKeys(x, DUO_LAUNCH_DAY, DUO_PICKUP_RESUMED)} />
        </section>

        {/* ---------------------------------------------------------------- where */}
        {!one && (
          <section id="where" className="scroll-mt-24">
            <h2>{h2Of("where")}</h2>
            {scope?.kind === "city" ? (
              t.topStores.length === 0 && <p>{V.whereNone(x)}</p>
            ) : regionsHit.length > 0 ? (
              <p>{V.whereLead(x, regionsHit.map((r) => ({ ...r, name: unitName(r.name) })), regions.length)}</p>
            ) : (
              <p>{V.whereNone(x)}</p>
            )}
            {scope?.kind !== "city" && topRegions.length > 0 && (
              <Table caption={V.regionCaption(x)} head={V.regionHead(x)}>
                {topRegions.map((r) => (
                  <tr key={r.slug} className="border-b border-line">
                    <th scope="row" className={rowTh}><Link href={r.path} className="hover:underline">{unitName(r.name)}</Link></th>
                    <td className={td}>{F.n(r.restocks)}</td>
                    <td className={td}>{V.ofN(r.stores, r.storesTotal)}</td>
                    <td className="py-2 pe-3 align-top">{r.lastAt && r.lastStore ? <>{stamp(r.lastAt, r.lastStore)} · {storeByNumber(r.lastStore) ? <Link href={storePath(storeByNumber(r.lastStore)!)} className="hover:underline">{F.store(storeByNumber(r.lastStore)!)}</Link> : r.lastStore}</> : "–"}</td>
                  </tr>
                ))}
              </Table>
            )}
            {topStores.length > 0 && (
              <Table caption={V.storesCaption(x)} head={V.storesHead} min="34rem">
                {topStores.map((r) => (
                  <tr key={r.storeNumber} className="border-b border-line">
                    <th scope="row" className={rowTh}><Link href={storePath(r.store!)} className="hover:underline">{F.storeWithPlace(r.store!)}</Link></th>
                    <td className={td}>{F.n(r.restocks)}</td>
                    <td className={td}>{r.days}</td>
                    <td className={td}>{r.peakHour != null ? F.hour(r.peakHour) : "–"}</td>
                    <td className="py-2 pe-3 align-top">{F.local(r.lastAt, r.store!)}</td>
                  </tr>
                ))}
              </Table>
            )}
            <ol className="my-4 grid gap-3 sm:grid-cols-2">
              {V.swaps(x).map((s) => <Swap key={s.no} no={s.no} yes={s.yes} why={s.why} />)}
            </ol>
            <ChipLinks items={[{ href: "/iphone-duo-near-me", label: V.nearMe }]} />
          </section>
        )}

        {/* ---------------------------------------------------------------- configuration */}
        <section id="configuration" className="scroll-mt-24">
          <h2>{h2Of("configuration")}</h2>
          {topPart && topPart.restocks > 0 ? (
            <>
              <p>{V.configLead(x, { label: cfg(topPart.partNumber), restocks: topPart.restocks }, lastPart && lastPart.partNumber !== topPart.partNumber ? { label: cfg(lastPart.partNumber), restocks: lastPart.restocks } : null)}</p>
              <StatGrid cols={3} className="my-4">
                <Stat value={F.pct(topPart.restocks / t.n)} label={V.mostRestocked(cfg(topPart.partNumber))} tone="accent" />
                {storageTop.length > 1
                  ? <Stat value={F.n(storageTop[0][1])} label={V.versus(storageTop[0][0], storageTop[1][1], storageTop[1][0])} />
                  : <Stat value={storageTop[0] ? F.n(storageTop[0][1]) : "–"} label={storageTop[0] ? V.restocksOf(storageTop[0][0]) : V.byStorage} />}
                {colorTop.length > 1
                  ? <Stat value={F.n(colorTop[0][1])} label={V.versus(colorTop[0][0], colorTop[1][1], colorTop[1][0])} />
                  : <Stat value={colorTop[0] ? F.n(colorTop[0][1]) : "–"} label={colorTop[0] ? V.restocksOf(colorTop[0][0]) : V.byColour} />}
              </StatGrid>
            </>
          ) : (
            <p>{V.configNone(x)}</p>
          )}
          <Table caption={V.configCaption(x)} head={V.configHead}>
            {parts.map((p) => (
              <tr key={p.partNumber} className="border-b border-line">
                <th scope="row" className={rowTh}>{cfg(p.partNumber)}</th>
                <td className={td}>{F.n(p.restocks)}</td>
                <td className={td}>{t.n ? F.pct(p.restocks / t.n) : "–"}</td>
                <td className="py-2 pe-3 align-top">{p.lastAt && p.lastStore ? <>{stamp(p.lastAt, p.lastStore)}{!one && storeByNumber(p.lastStore) ? <> · <Link href={storePath(storeByNumber(p.lastStore)!)} className="hover:underline">{F.store(storeByNumber(p.lastStore)!)}</Link></> : null}</> : "–"}</td>
              </tr>
            ))}
          </Table>
          <Keys items={V.configKeys(x)} />
          <Figure id="apple-store-crowd-inside" />
        </section>

        {/* ---------------------------------------------------------------- how long */}
        <section id="how-long" className="scroll-mt-24">
          <h2>{h2Of("how-long")}</h2>
          {sell ? (
            <>
              <p>{V.howLongLead(x, sell)}</p>
              <StatGrid cols={4} className="my-4">
                <Stat value={sell.medianSec} unit={V.secUnit} label={V.medianListing} tone="accent" />
                <Stat value={F.pct(sell.within2min)} label={V.within2} tone="warn" />
                <Stat value={F.pct(sell.within20min)} label={V.within20} />
                <Stat value={sell.fastestSec} unit={V.secUnit} label={V.fastest} />
              </StatGrid>
            </>
          ) : (
            <p>{V.howLongNone(x)}</p>
          )}
          <Keys items={V.howLongKeys(x)} />
          {sell && <Measured>{V.measured}</Measured>}
        </section>

        {/* ---------------------------------------------------------------- unavailable */}
        <section id="unavailable" className="scroll-mt-24">
          <h2>{h2Of("unavailable")}</h2>
          <p>{V.unavailableLead(x)}</p>
          <StatGrid cols={3} className="my-4">
            <Stat value={F.n(pairs)} label={V.pairs} />
            <Stat value={duoNow} label={V.listingNow} live />
            {sell
              ? <Stat value={F.pct(sell.within2min)} label={V.goneIn2} tone="warn" />
              : <Stat value={F.n(recent.restocks)} label={V.last24} />}
          </StatGrid>
          <Keys items={V.unavailableKeys(x, today?.restocks ?? 0)} />
          <ChipLinks items={[
            { href: "/apple-store-pickup-availability-explained", label: V.unavailableLinks.explained },
          ]} />
          <Figure id="apple-store-night-vancouver" />
        </section>

        {/* ---------------------------------------------------------------- reddit */}
        <section id="reddit" className="scroll-mt-24">
          <h2>{h2Of("reddit")}</h2>
          <p>{V.redditLead(x)}</p>
          <Table caption={V.redditCaption} head={V.redditHead} min="30rem">
            {V.claims(x).map((r) => (
              <tr key={r.claim} className="border-b border-line">
                <th scope="row" className={rowTh}>{r.claim}</th>
                <td className="py-2 pe-3 align-top">{r.answer}</td>
              </tr>
            ))}
          </Table>
          <Keys items={V.redditKeys()} />
        </section>

        {/* ---------------------------------------------------------------- method */}
        <section id="method" className="scroll-mt-24">
          <h2>{h2Of("method")}</h2>
          <p>{V.methodLead}</p>
          <Keys items={V.methodKeys(x)} />
          <p className="text-sm text-ink-3">{V.quote}</p>
          <p><Link href={alert} className="btn btn-primary">{V.alertIn(x)}</Link></p>
        </section>
      </div>

      <RelatedBlock title={V.related}>
        <LinkRow title={V.sameData} links={[
          { href: "/iphone-duo-sell-out-times", label: V.questions.sellOut },
          { href: "/iphone-duo-stock-alerts", label: V.questions.alerts },
          { href: "/which-iphone-duo-restocks-most", label: V.questions.whichConfig },
          { href: "/iphone-duo-near-me", label: V.questions.nearMe },
          { href: "/apple-store-pickup-availability-explained", label: V.questions.unavailable },
        ]} />
        {scope && <LinkRow title={place!.name} links={[
          { href: scope.storesPath, label: V.place.storesLive(x) },
          // A city's region, when the region has a page: "When does Apple restock the iPhone Duo in Greater London?"
          ...(place!.parentHref ? [{ href: place!.parentHref, label: restockTimesTitle(c, lang, placeOf(cc, { ...scope, kind: "region", city: undefined, citySlug: undefined }, lang)) }] : []),
          { href: countryPath, label: V.place.countryPage(c) },
          { href: alert, label: V.setUpAlert },
        ]} />}
        {!us && <LinkRow title={byRegion} links={regionLinks} />}
        {!us && <LinkRow title={V.place.byCity} links={cityLinks} />}
        {!scope && <LinkRow title={V.otherCountries(us)} links={otherCountries} />}
        {/* The US page hands down to its states and cities: "When does the iPhone Duo restock in Los Angeles?" (docs/research.md §8.3 B). */}
        {us && <LinkRow title="By state" links={restockPlaces().states.map((p) => ({ href: p.href, label: p.label, meta: String(p.stores.length) }))} />}
        {us && <LinkRow title="By city" links={restockPlaces().cities.map((p) => ({ href: p.href, label: `${p.label}, ${p.stateCode}`, meta: String(p.stores.length) }))} />}
      </RelatedBlock>

      <div className="mt-10"><RichFaq items={faq} facts={facts} title={V.faqTitle} /></div>
      <div className="mt-8"><SourceList sources={sources} facts={facts} where={scope ? V.place.sourcesWhere(x) : C.sourcesWhere(stores.length, c)} since={F.longDate(t.since)} /></div>
    </div>
  );
}
