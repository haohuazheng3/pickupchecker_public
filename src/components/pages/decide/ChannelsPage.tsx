/**
 * /iphone-duo-apple-vs-carriers-vs-retailers and its country and language versions: "Apple Store, a carrier or a
 * retailer — where do you actually get an iPhone Duo?" The measured channel (Apple Store pickup) against the ones
 * nobody can measure, honestly: lib/content/channels.ts for who sells, lib/content/duoDecide.ts for Apple's numbers.
 */
import type { Metadata } from "next";
import { cache } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs, LinkRow, RelatedBlock } from "@/components/seo/Related";
import { Figure } from "@/components/content/Figure";
import { RichFaq, SourceList } from "@/components/content/RichFaq";
import { Stat, StatGrid, Swap } from "@/components/ui/Viz";
import { emptyFacts } from "@/lib/content/facts";
import type { Source } from "@/lib/content/types";
import { prefixOf, type Country } from "@/lib/apple/countries";
import { duoDecide } from "@/lib/content/duoDecide";
import { channelsOf } from "@/lib/content/channels";
import { englishLocale, type Locale } from "@/lib/i18n/locales";
import { dict } from "@/lib/i18n/dict";
import { pageLocale, t as dictT } from "@/lib/i18n/server";
import type { ChannelsView } from "@/lib/i18n/dict/en/decide";
import { DECIDE_SLUGS, hreflangFor } from "../shared";
import { Keys, SITE, SectionNav, Table, UPDATED, crumbsFor, decideCtx, otherCountryLinks, pageUrl, rowTh } from "./frame";

const load = cache(async (cc: Country["cc"]) => duoDecide(cc));
const PATH = (c: Country) => `${prefixOf(c.cc)}/${DECIDE_SLUGS.channels}`;

async function view(c: Country, loc: Locale): Promise<ChannelsView> {
  const { configs, supply } = await load(c.cc);
  return { ...decideCtx(c, loc.lang), ch: channelsOf(c.cc), sup: supply, cfgs: configs };
}

export async function channelsMetadata(c: Country, loc: Locale = englishLocale(c.cc)): Promise<Metadata> {
  const V = dict(loc.lang).decide.channels;
  const x = await view(c, loc);
  const title = V.title(c, x.ch.retailers[0] ?? "Retailers");
  const description = V.metaDescription(x);
  const url = pageUrl(PATH(c), loc);
  return { title: { absolute: `${title} · PickupChecker` }, description, alternates: { canonical: url, languages: hreflangFor("channels", loc) }, openGraph: { type: "article", siteName: "PickupChecker", title, description, url } };
}

export async function ChannelsPage({ country: c }: { country: Country }) {
  const cc = c.cc;
  const loc = pageLocale();
  const lang = loc.lang;
  const V = dictT().decide.channels;
  const C = dictT().views.common;
  const x = await view(c, loc);
  const url = pageUrl(PATH(c), loc);
  const title = V.title(c, x.ch.retailers[0] ?? "Retailers");
  const facts = emptyFacts(cc);
  const n = (v: number) => v.toLocaleString(lang === "en" ? "en-US" : loc.tag);
  const longFmt = new Intl.DateTimeFormat(lang === "en" ? "en-US" : loc.tag, { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
  const logHref = x.us ? "/restocks" : `${prefixOf(cc)}/restocks`;
  const H2 = V.h2(x);
  const sections = ["compare", "pickup", "carriers", "retailers", "resale", "abroad", "method"].map((id) => ({ id, nav: V.nav[id as keyof typeof V.nav], h2: H2[id as keyof typeof H2] }));
  const sources: Source[] = [
    ...x.ch.sources,
    { label: V.sources.pickup, url: "https://www.apple.com/shop/shipping-pickup" },
    { label: V.sources.warranty, url: "https://www.apple.com/legal/warranty/" },
    { label: V.sources.log, url: `${SITE}${logHref}` },
  ];
  const inLanguage = loc.native ? { inLanguage: loc.tag } : {};
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${SITE}${url}`, url: `${SITE}${url}`, name: title, description: V.ld(x).description, isPartOf: { "@id": `${SITE}/#website` }, about: { "@id": `${SITE}/#organization` }, dateModified: x.sup.at, ...inLanguage },
    ],
  };
  const otherSellers = x.ch.carriers.length + x.ch.retailers.length;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8">
      <JsonLd data={ld} />
      <Breadcrumbs items={crumbsFor(c, lang, V.crumb)} />
      <h1 className="display mt-3 text-3xl sm:text-5xl">{V.h1(x)}</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-2">{V.intro(x)}</p>
      {lang === "en" && <p className="mt-2 text-sm text-ink-3">{V.updated(x, UPDATED(c.timeZone).format(new Date(x.sup.at)))}</p>}
      {!x.sup.unknown && (
        <StatGrid cols={4} className="mt-6">
          <Stat value={n(x.sup.n)} label={V.hero.restocks} tone="accent" />
          <Stat value={n(x.sup.last7.restocks)} label={V.hero.last7} />
          <Stat value={`${x.sup.storesNow}/${x.stores}`} label={V.hero.now(x.one)} live />
          <Stat value={otherSellers} label={V.hero.channels} tone="muted" />
        </StatGrid>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={x.alert} className="btn btn-primary">{V.setUpAlert}</Link>
        <Link href={logHref} className="btn btn-ghost">{V.logLive}</Link>
      </div>
      <SectionNav label={V.onThisPage} sections={sections} />
      <Figure id="electronics-store-tables" eager />

      <div className="pane prose-site mt-8 p-6 sm:p-8">
        <section id="compare" className="scroll-mt-24">
          <h2>{H2.compare}</h2>
          <p>{V.compareLead(x)}</p>
          <Table caption={V.compareCaption} head={V.compareHead} min="44rem">
            {V.compareRows(x).map((r) => (
              <tr key={r.channel} className="border-b border-line">
                <th scope="row" className={rowTh}>{r.channel}</th>
                <td className="py-2 pe-3 align-top">{r.known}</td>
                <td className="py-2 pe-3 align-top">{r.watch}</td>
                <td className="py-2 pe-3 align-top">{r.catch}</td>
              </tr>
            ))}
          </Table>
          <Keys items={V.compareKeys(x)} />
        </section>

        <section id="pickup" className="scroll-mt-24">
          <h2>{H2.pickup}</h2>
          <p>{V.pickupLead(x)}</p>
          <ol className="my-4 grid gap-3 sm:grid-cols-1">
            {V.pickupSwaps().map((s) => <Swap key={s.no} no={s.no} yes={s.yes} why={s.why} />)}
          </ol>
          <Keys items={V.pickupKeys(x)} />
          <Figure id="courier-delivery" />
        </section>

        <section id="carriers" className="scroll-mt-24">
          <h2>{H2.carriers}</h2>
          <p>{V.carriersLead(x)}</p>
          <Keys items={V.carriersKeys(x)} />
        </section>

        <section id="retailers" className="scroll-mt-24">
          <h2>{H2.retailers}</h2>
          <p>{V.retailersLead(x)}</p>
          <Keys items={V.retailersKeys(x)} />
          <Figure id="phone-shops-street" />
        </section>

        <section id="resale" className="scroll-mt-24">
          <h2>{H2.resale}</h2>
          <p>{V.resaleLead(x)}</p>
          <Keys items={V.resaleKeys()} />
        </section>

        <section id="abroad" className="scroll-mt-24">
          <h2>{H2.abroad}</h2>
          <p>{V.abroadLead(x)}</p>
          <Keys items={V.abroadKeys()} />
        </section>

        <section id="method" className="scroll-mt-24">
          <h2>{H2.method}</h2>
          <p>{V.methodLead(x)}</p>
          <Keys items={V.methodKeys()} />
          <p><Link href={x.alert} className="btn btn-primary">{V.setUpAlert}</Link></p>
        </section>
      </div>

      <RelatedBlock title={V.related}>
        <LinkRow title={V.sameData} links={[
          { href: `${prefixOf(cc)}/${DECIDE_SLUGS.shortage}`, label: V.questions.shortage },
          { href: `${prefixOf(cc)}/${DECIDE_SLUGS.configs}`, label: V.questions.configs },
          { href: `${prefixOf(cc)}/iphone-duo-restock-times`, label: V.questions.restockTimes },
          ...(x.us ? [{ href: "/how-to-get-an-iphone-duo", label: V.questions.howToGet }, { href: "/where-to-buy-iphone-duo", label: V.questions.whereToBuy }, { href: "/iphone-duo-stock-alerts", label: V.questions.alerts }] : []),
        ]} />
        <LinkRow title={V.otherCountries} links={otherCountryLinks("channels", cc, lang)} />
      </RelatedBlock>
      <div className="mt-10"><RichFaq items={V.faq(x)} facts={facts} title={V.faqTitle} /></div>
      <div className="mt-8"><SourceList sources={sources} facts={facts} where={C.sourcesWhere(x.stores, c)} since={longFmt.format(new Date(`${x.sup.since}T12:00:00Z`))} /></div>
    </div>
  );
}
