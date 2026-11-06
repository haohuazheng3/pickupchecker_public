/**
 * /which-iphone-duo-restocks-most and its country and language versions: "Which iPhone Duo configuration restocks
 * most, and which is easiest to get?" Every configuration ranked by the time it was listed in total, by storage and by
 * colour, with time on the shelf, this week's shift and what to set alerts on. Numbers: lib/content/duoDecide.ts.
 */
import type { Metadata } from "next";
import { cache } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs, LinkRow, RelatedBlock } from "@/components/seo/Related";
import { Figure } from "@/components/content/Figure";
import { RichFaq, SourceList } from "@/components/content/RichFaq";
import { Points, Stat, StatGrid, Swap } from "@/components/ui/Viz";
import { emptyFacts } from "@/lib/content/facts";
import type { Source } from "@/lib/content/types";
import { storeByNumber, storePath } from "@/lib/apple/catalog";
import { prefixOf, type Country } from "@/lib/apple/countries";
import { duoDecide } from "@/lib/content/duoDecide";
import { englishLocale, type Locale } from "@/lib/i18n/locales";
import { dict } from "@/lib/i18n/dict";
import { pageLocale, t as dictT } from "@/lib/i18n/server";
import type { ConfigsView } from "@/lib/i18n/dict/en/decide";
import { DECIDE_SLUGS, hreflangFor } from "../shared";
import { ChipLinks, Keys, SITE, SectionNav, Table, UPDATED, crumbsFor, decideCtx, hoursLabel, otherCountryLinks, pageUrl, pctLabel, rowTh, secsLabel, td } from "./frame";

const load = cache(async (cc: Country["cc"]) => duoDecide(cc));
const PATH = (c: Country) => `${prefixOf(c.cc)}/${DECIDE_SLUGS.configs}`;

export async function configsMetadata(c: Country, loc: Locale = englishLocale(c.cc)): Promise<Metadata> {
  const { configs: d } = await load(c.cc);
  const V = dict(loc.lang).decide.configs;
  const x: ConfigsView = { ...decideCtx(c, loc.lang), d };
  const title = V.title(c);
  const description = V.metaDescription(x);
  const url = pageUrl(PATH(c), loc);
  return { title: { absolute: `${title} · PickupChecker` }, description, alternates: { canonical: url, languages: hreflangFor("configs", loc) }, openGraph: { type: "article", siteName: "PickupChecker", title, description, url } };
}

export async function ConfigsPage({ country: c }: { country: Country }) {
  const cc = c.cc;
  const loc = pageLocale();
  const lang = loc.lang;
  const V = dictT().decide.configs;
  const C = dictT().views.common;
  const { configs: d } = await load(cc);
  const x: ConfigsView = { ...decideCtx(c, lang), d };
  const url = pageUrl(PATH(c), loc);
  const title = V.title(c);
  const facts = emptyFacts(cc);
  const n = (v: number) => v.toLocaleString(lang === "en" ? "en-US" : loc.tag);
  const logHref = x.us ? "/restocks" : `${prefixOf(cc)}/restocks`;
  const H2 = V.h2(x);
  const sections = ["easiest", "storage", "colour", "shelf", "week", "alerts", "method"].map((id) => ({ id, nav: V.nav[id as keyof typeof V.nav], h2: H2[id as keyof typeof H2] }));
  const e = d.easiest;
  const storeLink = (num: string | null) => { const s = num ? storeByNumber(num) : undefined; return s ? <Link href={storePath(s)} className="hover:underline">{x.storeName(num!)}</Link> : null; };
  const sources: Source[] = [
    { label: V.sources.apple, url: `https://www.apple.com${c.buyPath ?? c.shopPath}/buy-iphone/iphone-duo` },
    { label: V.sources.pickup, url: "https://www.apple.com/shop/shipping-pickup" },
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
  const weekRows = [...d.byPart].sort((a, b) => b.last7 - a.last7 || b.prev7 - a.prev7);
  const shelfRows = d.byPart.filter((r) => r.lifetimes).sort((a, b) => b.lifetimes!.medianSec - a.lifetimes!.medianSec);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8">
      <JsonLd data={ld} />
      <Breadcrumbs items={crumbsFor(c, lang, V.crumb)} />
      <h1 className="display mt-3 text-3xl sm:text-5xl">{V.h1(x)}</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-2">{V.intro(x)}</p>
      {lang === "en" && <p className="mt-2 text-sm text-ink-3">{V.updated(x, UPDATED(c.timeZone).format(new Date(d.at)))}</p>}
      {e && !d.unknown && (
        <StatGrid cols={4} className="mt-6">
          <Stat value={n(e.restocks)} label={V.hero.restocks(x.cfg(e))} tone="accent" />
          <Stat value={hoursLabel(e.exposureSec)} label={V.hero.exposure} />
          <Stat value={`${e.nowStores}/${x.stores}`} label={V.hero.now(x.one)} live />
          {e.lifetimes ? <Stat value={e.lifetimes.medianSec} unit="s" label={V.hero.median} /> : <Stat value={n(d.n)} label={V.hero.total} />}
        </StatGrid>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={x.alert} className="btn btn-primary">{V.setUpAlert}</Link>
        <Link href={logHref} className="btn btn-ghost">{V.logLive}</Link>
      </div>
      <SectionNav label={V.onThisPage} sections={sections} />
      <Figure id="two-iphones-stacked" eager />

      <div className="pane prose-site mt-8 p-6 sm:p-8">
        <section id="easiest" className="scroll-mt-24">
          <h2>{H2.easiest}</h2>
          {e ? <p>{V.easiestLead(x)}</p> : <p>{V.intro(x)}</p>}
          <Keys items={V.easiestKeys(x)} />
          <Table caption={V.rankCaption(x)} head={V.rankHead} min="44rem">
            {d.byPart.map((r) => (
              <tr key={r.partNumber} className={`border-b border-line ${e && r.partNumber === e.partNumber ? "bg-accent/[0.06]" : ""}`}>
                <th scope="row" className={rowTh}>{x.cfg(r)}</th>
                <td className={td}>{n(r.restocks)}</td>
                <td className={td}>{r.stores}</td>
                <td className={td}>{r.exposureSec ? hoursLabel(r.exposureSec) : "–"}</td>
                <td className={td}>{secsLabel(r.lifetimes?.medianSec)}</td>
                <td className={td}>{r.nowStores}</td>
                <td className="py-2 pe-3 align-top">{r.lastAt && r.lastStore ? <>{x.storeWhen(r.lastAt, r.lastStore)}{!x.one && <> · {storeLink(r.lastStore)}</>}</> : V.none}</td>
              </tr>
            ))}
          </Table>
        </section>

        <section id="storage" className="scroll-mt-24">
          <h2>{H2.storage}</h2>
          <p>{V.storageLead(x)}</p>
          {d.byStorage.length > 0 && (
            <Table caption={V.groupCaption("storage")} head={V.groupHead("Storage")} min="36rem">
              {d.byStorage.map((g) => (
                <tr key={g.key} className="border-b border-line">
                  <th scope="row" className={rowTh}>{g.key}</th>
                  <td className={td}>{n(g.restocks)}</td>
                  <td className={td}>{pctLabel(g.share)}</td>
                  <td className={td}>{g.stores}</td>
                  <td className={td}>{g.exposureSec ? hoursLabel(g.exposureSec) : "–"}</td>
                  <td className={td}>{secsLabel(g.medianSec)}</td>
                  <td className={td}>{g.nowStores}</td>
                </tr>
              ))}
            </Table>
          )}
          <ol className="my-4 grid gap-3 sm:grid-cols-2">
            {V.storageSwaps(x).map((s) => <Swap key={s.no} no={s.no} yes={s.yes} why={s.why} />)}
          </ol>
        </section>

        <section id="colour" className="scroll-mt-24">
          <h2>{H2.colour}</h2>
          <p>{V.colourLead(x)}</p>
          {d.byColor.length > 0 && (
            <Table caption={V.groupCaption("colour")} head={V.groupHead("Colour")} min="36rem">
              {d.byColor.map((g) => (
                <tr key={g.key} className="border-b border-line">
                  <th scope="row" className={rowTh}>{x.colour(g.key)}</th>
                  <td className={td}>{n(g.restocks)}</td>
                  <td className={td}>{pctLabel(g.share)}</td>
                  <td className={td}>{g.stores}</td>
                  <td className={td}>{g.exposureSec ? hoursLabel(g.exposureSec) : "–"}</td>
                  <td className={td}>{secsLabel(g.medianSec)}</td>
                  <td className={td}>{g.nowStores}</td>
                </tr>
              ))}
            </Table>
          )}
          <Keys items={V.colourKeys(x)} />
          <Figure id="foldable-hands" />
        </section>

        <section id="shelf" className="scroll-mt-24">
          <h2>{H2.shelf}</h2>
          <p>{V.shelfLead(x)}</p>
          {shelfRows.length > 0 && (
            <Table caption={V.shelfCaption} head={V.shelfHead} min="40rem">
              {shelfRows.map((r) => (
                <tr key={r.partNumber} className="border-b border-line">
                  <th scope="row" className={rowTh}>{x.cfg(r)}</th>
                  <td className={td}>{n(r.lifetimes!.n)}</td>
                  <td className={td}>{secsLabel(r.lifetimes!.medianSec)}</td>
                  <td className={td}>{pctLabel(r.lifetimes!.within2min)}</td>
                  <td className={td}>{pctLabel(r.lifetimes!.within20min)}</td>
                  <td className={td}>{secsLabel(r.lifetimes!.fastestSec)}</td>
                </tr>
              ))}
            </Table>
          )}
          <Keys items={V.shelfKeys(x)} />
        </section>

        <section id="week" className="scroll-mt-24">
          <h2>{H2.week}</h2>
          <p>{V.weekLead(x)}</p>
          <Table caption={V.weekCaption} head={V.weekHead} min="30rem">
            {weekRows.map((r) => (
              <tr key={r.partNumber} className="border-b border-line">
                <th scope="row" className={rowTh}>{x.cfg(r)}</th>
                <td className={td}>{n(r.last7)}</td>
                <td className={td}>{n(r.prev7)}</td>
                <td className={td}>{r.prev7 ? `${r.last7 >= r.prev7 ? "+" : "−"}${Math.round(Math.abs(r.last7 / r.prev7 - 1) * 100)}%` : r.last7 ? "new" : "–"}</td>
              </tr>
            ))}
          </Table>
        </section>

        <section id="alerts" className="scroll-mt-24">
          <h2>{H2.alerts}</h2>
          <p>{V.alertsLead(x)}</p>
          <Keys items={V.alertsKeys(x)} />
          <p><Link href={x.alert} className="btn btn-primary">{V.setUpAlert}</Link></p>
          <Figure id="apple-store-pickup-counter" />
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
          { href: `${prefixOf(cc)}/${DECIDE_SLUGS.shortage}`, label: V.questions.shortage },
          { href: `${prefixOf(cc)}/${DECIDE_SLUGS.channels}`, label: V.questions.channels },
          { href: `${prefixOf(cc)}/${DECIDE_SLUGS.api}`, label: V.questions.api },
          ...(x.us ? [{ href: "/iphone-duo-sell-out-times", label: V.questions.sellOut }, { href: "/iphone-duo-stock-alerts", label: V.questions.alerts }] : []),
        ]} />
        <LinkRow title={V.otherCountries} links={otherCountryLinks("configs", cc, lang)} />
      </RelatedBlock>
      <div className="mt-10"><RichFaq items={V.faq(x)} facts={facts} title={V.faqTitle} /></div>
      <div className="mt-8"><SourceList sources={sources} facts={facts} where={C.sourcesWhere(x.stores, c)} since={new Intl.DateTimeFormat(lang === "en" ? "en-US" : loc.tag, { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${d.since}T12:00:00Z`))} /></div>
      <Points className="mt-6 text-sm text-ink-3" items={[]} />
      <ChipLinks items={[]} />
    </div>
  );
}
