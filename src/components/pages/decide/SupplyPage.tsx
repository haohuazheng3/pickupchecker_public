/**
 * /iphone-duo-shortage and its country and language versions: "Is the iPhone Duo shortage getting better, and how
 * long will it last?" Restocks per day and week over week, shelf times, how many stores have had one, the signals of an
 * easing, wait-or-buy, and every tracked country side by side. Numbers: lib/content/duoDecide.ts.
 */
import type { Metadata } from "next";
import { cache } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs, LinkRow, RelatedBlock } from "@/components/seo/Related";
import { Figure } from "@/components/content/Figure";
import { RichFaq, SourceList } from "@/components/content/RichFaq";
import { Stat, StatGrid } from "@/components/ui/Viz";
import { emptyFacts } from "@/lib/content/facts";
import type { Source } from "@/lib/content/types";
import { storesOf } from "@/lib/apple/catalog";
import { ALL_CODES, COUNTRIES, prefixOf, type Country } from "@/lib/apple/countries";
import { duoDecide } from "@/lib/content/duoDecide";
import { englishLocale, type Locale } from "@/lib/i18n/locales";
import { dict } from "@/lib/i18n/dict";
import { pageLocale, t as dictT } from "@/lib/i18n/server";
import { countryLabel } from "@/lib/i18n/places";
import type { SupplyView, WorldRow } from "@/lib/i18n/dict/en/decide";
import { DECIDE_SLUGS, equivalentPath, hreflangFor } from "../shared";
import { Keys, SITE, SectionNav, Table, UPDATED, crumbsFor, decideCtx, otherCountryLinks, pageUrl, pctLabel, rowTh, secsLabel, td } from "./frame";

const load = cache(async (cc: Country["cc"]) => duoDecide(cc));
/** Every country's last seven days (each cached five minutes on its own). */
const world = cache(async (): Promise<Record<string, Awaited<ReturnType<typeof duoDecide>>["supply"]>> => {
  const all = await Promise.all(ALL_CODES.map(async (cc) => [cc, (await duoDecide(cc)).supply] as const));
  return Object.fromEntries(all);
});
const PATH = (c: Country) => `${prefixOf(c.cc)}/${DECIDE_SLUGS.shortage}`;

async function view(c: Country, loc: Locale): Promise<SupplyView> {
  const [{ supply: d }, w] = await Promise.all([load(c.cc), world()]);
  const rows: WorldRow[] = ALL_CODES.map((cc) => {
    const s = w[cc];
    return { cc, name: loc.lang === "en" ? COUNTRIES[cc].short : countryLabel(cc, loc.lang), href: equivalentPath(cc, "shortage")!, stores: storesOf(cc).length, last7: s?.last7.restocks ?? 0, perStoreDay: s?.last7.perStoreDay ?? 0, medianSec: s?.last7.medianSec ?? null, storesNow: s?.storesNow ?? 0, complete: Boolean(s?.last7.complete) };
  });
  return { ...decideCtx(c, loc.lang), d, world: rows };
}

export async function supplyMetadata(c: Country, loc: Locale = englishLocale(c.cc)): Promise<Metadata> {
  const V = dict(loc.lang).decide.supply;
  const x = await view(c, loc);
  const title = V.title(c);
  const description = V.metaDescription(x);
  const url = pageUrl(PATH(c), loc);
  return { title: { absolute: `${title} · PickupChecker` }, description, alternates: { canonical: url, languages: hreflangFor("shortage", loc) }, openGraph: { type: "article", siteName: "PickupChecker", title, description, url } };
}

export async function SupplyPage({ country: c }: { country: Country }) {
  const cc = c.cc;
  const loc = pageLocale();
  const lang = loc.lang;
  const V = dictT().decide.supply;
  const C = dictT().views.common;
  const x = await view(c, loc);
  const d = x.d;
  const url = pageUrl(PATH(c), loc);
  const title = V.title(c);
  const facts = emptyFacts(cc);
  const n = (v: number) => v.toLocaleString(lang === "en" ? "en-US" : loc.tag);
  const dayFmt = new Intl.DateTimeFormat(lang === "en" ? "en-US" : loc.tag, { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });
  const longFmt = new Intl.DateTimeFormat(lang === "en" ? "en-US" : loc.tag, { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
  const logHref = x.us ? "/restocks" : `${prefixOf(cc)}/restocks`;
  const H2 = V.h2(x);
  const sections = ["trend", "easier", "stores", "howlong", "christmas", "world", "method"].map((id) => ({ id, nav: V.nav[id as keyof typeof V.nav], h2: H2[id as keyof typeof H2] }));
  const w = d.last7;
  const sources: Source[] = [
    { label: V.sources.newsroom, url: "https://www.apple.com/newsroom/2026/10/iphone-duo-arrives-at-apple-store-locations-worldwide/" },
    { label: V.sources.pickup, url: "https://www.apple.com/shop/shipping-pickup" },
    { label: V.sources.restockTimes, url: `${SITE}${prefixOf(cc)}/iphone-duo-restock-times` },
    { label: V.sources.log, url: `${SITE}${logHref}` },
  ];
  const L = V.ld(x);
  const inLanguage = loc.native ? { inLanguage: loc.tag } : {};
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${SITE}${url}`, url: `${SITE}${url}`, name: title, isPartOf: { "@id": `${SITE}/#website` }, about: { "@id": `${SITE}/#organization` }, dateModified: d.at, ...inLanguage },
      { "@type": "Dataset", "@id": `${SITE}${url}#dataset`, name: L.datasetName, description: L.description, url: `${SITE}${url}`, creator: { "@id": `${SITE}/#organization` }, isAccessibleForFree: true, temporalCoverage: `${d.since}/..`, spatialCoverage: c.name, variableMeasured: L.measured, ...inLanguage },
    ],
  };
  const recent = [...d.daily].reverse().slice(0, 14);
  const changeLabel = d.change == null ? "–" : `${d.change >= 0 ? "+" : "−"}${Math.round(Math.abs(d.change) * 100)}%`;
  const worldRows = [...x.world].sort((a, b) => b.perStoreDay - a.perStoreDay || b.last7 - a.last7);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8">
      <JsonLd data={ld} />
      <Breadcrumbs items={crumbsFor(c, lang, V.crumb)} />
      <h1 className="display mt-3 text-3xl sm:text-5xl">{V.h1(x)}</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-2">{V.intro(x)}</p>
      {lang === "en" && <p className="mt-2 text-sm text-ink-3">{V.updated(x, UPDATED(c.timeZone).format(new Date(d.at)))}</p>}
      {!d.unknown && (
        <StatGrid cols={4} className="mt-6">
          <Stat value={n(w.restocks)} label={V.hero.last7} tone="accent" />
          <Stat value={changeLabel} label={V.hero.change} tone={d.trend === "down" ? "warn" : undefined} />
          <Stat value={x.one ? d.daily.filter((r) => r.restocks > 0).length : `${w.stores}/${x.stores}`} label={V.hero.stores(x.one)} />
          {w.medianSec != null ? <Stat value={w.medianSec} unit="s" label={V.hero.median} /> : <Stat value={`${d.storesNow}/${x.stores}`} label={V.hero.now(x.one)} live />}
        </StatGrid>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={x.alert} className="btn btn-primary">{V.setUpAlert}</Link>
        <Link href={logHref} className="btn btn-ghost">{V.logLive}</Link>
      </div>
      <SectionNav label={V.onThisPage} sections={sections} />
      <Figure id="warehouse-aisle" eager />

      <div className="pane prose-site mt-8 p-6 sm:p-8">
        <section id="trend" className="scroll-mt-24">
          <h2>{H2.trend}</h2>
          <p>{V.trendLead(x)}</p>
          <Table caption={V.dailyCaption(x)} head={V.dailyHead} min="26rem">
            {recent.map((r) => (
              <tr key={r.date} className="border-b border-line">
                <th scope="row" className={rowTh}>{dayFmt.format(new Date(`${r.date}T12:00:00Z`))}</th>
                <td className={td}>{n(r.restocks)}</td>
                <td className={td}>{r.stores}</td>
                <td className={td}>{secsLabel(r.medianSec)}</td>
              </tr>
            ))}
          </Table>
          <Keys items={V.trendKeys(x)} />
        </section>

        <section id="easier" className="scroll-mt-24">
          <h2>{H2.easier}</h2>
          <p>{V.easierLead(x)}</p>
          {(w.medianSec != null || d.prev7.medianSec != null) && (
            <StatGrid cols={4} className="my-4">
              <Stat value={secsLabel(w.medianSec)} label={V.hero.median} tone="accent" />
              <Stat value={secsLabel(d.prev7.medianSec)} label={`${V.hero.median} · ${V.weekBefore}`} tone="muted" />
              <Stat value={pctLabel(w.within2min)} label={V.goneIn2} tone="warn" />
              <Stat value={pctLabel(d.prev7.within2min)} label={`${V.goneIn2} · ${V.weekBefore}`} tone="muted" />
            </StatGrid>
          )}
          <Keys items={V.easierKeys(x)} />
          <Figure id="boxes-stacked" />
        </section>

        <section id="stores" className="scroll-mt-24">
          <h2>{H2.stores}</h2>
          <p>{V.storesLead(x)}</p>
          <StatGrid cols={3} className="my-4">
            <Stat value={x.one ? d.storesEver : `${d.storesEver}/${x.stores}`} label={V.storesEverLabel(x.one)} tone="accent" />
            <Stat value={`${d.storesNow}/${x.stores}`} label={V.hero.now(x.one)} live />
            <Stat value={d.sinceLastHours == null ? "–" : d.sinceLastHours < 1 ? "<1" : Math.round(d.sinceLastHours)} unit="h" label={V.hero.sinceLast} />
          </StatGrid>
          <Keys items={V.storesKeys(x)} />
        </section>

        <section id="howlong" className="scroll-mt-24">
          <h2>{H2.howlong}</h2>
          <p>{V.howlongLead(x)}</p>
          <Keys items={V.howlongKeys()} />
        </section>

        <section id="christmas" className="scroll-mt-24">
          <h2>{H2.christmas}</h2>
          <p>{V.christmasLead(x)}</p>
          <Keys items={V.christmasKeys()} />
          <p><Link href={x.alert} className="btn btn-primary">{V.setUpAlert}</Link></p>
          <Figure id="apple-store-queue" />
        </section>

        <section id="world" className="scroll-mt-24">
          <h2>{H2.world}</h2>
          <p>{V.worldLead(x)}</p>
          <Table caption={V.worldCaption} head={V.worldHead} min="36rem">
            {worldRows.map((r) => (
              <tr key={r.cc} className={`border-b border-line ${r.cc === cc ? "bg-accent/[0.06]" : ""}`}>
                <th scope="row" className={rowTh}><Link href={r.href} className="hover:underline">{r.name}</Link></th>
                <td className={td}>{r.stores}</td>
                <td className={td}>{n(r.last7)}</td>
                <td className={td}>{(r.perStoreDay * 7).toFixed(1)}</td>
                <td className={td}>{secsLabel(r.medianSec)}</td>
                <td className={td}>{r.storesNow}</td>
              </tr>
            ))}
          </Table>
        </section>

        <section id="method" className="scroll-mt-24">
          <h2>{H2.method}</h2>
          <p>{V.methodLead}</p>
          <Keys items={V.methodKeys(x)} />
        </section>
      </div>

      <RelatedBlock title={V.related}>
        <LinkRow title={V.sameData} links={[
          { href: `${prefixOf(cc)}/iphone-duo-restock-times`, label: V.questions.restockTimes },
          { href: `${prefixOf(cc)}/${DECIDE_SLUGS.configs}`, label: V.questions.configs },
          { href: `${prefixOf(cc)}/${DECIDE_SLUGS.channels}`, label: V.questions.channels },
          ...(x.us ? [{ href: "/iphone-duo-sell-out-times", label: V.questions.sellOut }, { href: "/how-to-get-an-iphone-duo", label: V.questions.howToGet }, { href: "/iphone-duo-stock-alerts", label: V.questions.alerts }] : []),
        ]} />
        <LinkRow title={V.otherCountries} links={otherCountryLinks("shortage", cc, lang)} />
      </RelatedBlock>
      <div className="mt-10"><RichFaq items={V.faq(x)} facts={facts} title={V.faqTitle} /></div>
      <div className="mt-8"><SourceList sources={sources} facts={facts} where={C.sourcesWhere(x.stores, c)} since={longFmt.format(new Date(`${d.since}T12:00:00Z`))} /></div>
    </div>
  );
}
