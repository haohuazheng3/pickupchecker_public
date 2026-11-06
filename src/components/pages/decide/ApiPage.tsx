/**
 * /iphone-duo-stock-api and its country and language versions: "Is there an API or a script to monitor iPhone Duo
 * stock at Apple Stores?" The public v1 API documented for people who want to build: endpoints, examples, fields,
 * limits and terms, and the honest comparison with a push alert. Live numbers from lib/stock/queries and lib/stock/recent.
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
import { ALL_STORES } from "@/lib/apple/catalog";
import { ALL_CODES, prefixOf, type Country } from "@/lib/apple/countries";
import { storesWithStockNow } from "@/lib/stock/queries";
import { recentByConfig } from "@/lib/stock/recent";
import { CACHE_SEC, RATE_PER_MIN } from "@/lib/api/v1";
import { englishLocale, type Locale } from "@/lib/i18n/locales";
import { dict } from "@/lib/i18n/dict";
import { pageLocale, t as dictT } from "@/lib/i18n/server";
import type { ApiView } from "@/lib/i18n/dict/en/decide";
import { DECIDE_SLUGS, hreflangFor } from "../shared";
import { Keys, SITE, SectionNav, Table, UPDATED, crumbsFor, decideCtx, otherCountryLinks, pageUrl, rowTh, td } from "./frame";

const load = cache(async (cc: Country["cc"]) => Promise.all([storesWithStockNow(undefined, cc), recentByConfig({ country: cc })]));
const PATH = (c: Country) => `${prefixOf(c.cc)}/${DECIDE_SLUGS.api}`;

async function view(c: Country, loc: Locale): Promise<ApiView> {
  const [now, recent] = await load(c.cc);
  return { ...decideCtx(c, loc.lang), worldStores: ALL_STORES.length, countries: ALL_CODES.length, storesNow: now.duo, restocks24: recent.restocks };
}

export async function apiMetadata(c: Country, loc: Locale = englishLocale(c.cc)): Promise<Metadata> {
  const V = dict(loc.lang).decide.api;
  const x = await view(c, loc);
  const title = V.title(c);
  const description = V.metaDescription(x);
  const url = pageUrl(PATH(c), loc);
  return { title: { absolute: `${title} · PickupChecker` }, description, alternates: { canonical: url, languages: hreflangFor("api", loc) }, openGraph: { type: "article", siteName: "PickupChecker", title, description, url } };
}

const pre = "my-4 overflow-x-auto rounded-xl border border-line-2 bg-ink/[0.04] p-4 text-xs leading-relaxed";

function samples(cc: string) {
  const base = `${SITE}/api/v1/${cc}`;
  return {
    curl: `curl -s -A "my-duo-watcher (me@example.com)" \\
  "${base}/stock?model=duo" \\
  | jq -r '.stores[] | select(.in_stock) | "\\(.name) (\\(.city)): \\(.available | map(.storage + " " + .color) | join(", "))"'`,
    python: `import json, time, urllib.request

URL = "${base}/stock?model=duo"
REQ = urllib.request.Request(URL, headers={"User-Agent": "my-duo-watcher (me@example.com)"})

seen = set()
while True:
    data = json.load(urllib.request.urlopen(REQ, timeout=20))
    for s in data["stores"]:
        for a in s["available"]:
            key = (s["store_number"], a["part_number"])
            if key not in seen:
                seen.add(key)
                print(f'{data["generated_at"]} {s["name"]} ({s["city"]}): {a["storage"]} {a["color"]}')
    time.sleep(${CACHE_SEC})  # answers are cached ${CACHE_SEC} s; polling faster returns the same JSON`,
    node: `const URL = "${base}/restocks?model=duo&hours=1";

async function tick() {
  const res = await fetch(URL, { headers: { "User-Agent": "my-duo-watcher (me@example.com)" } });
  const { restocks } = await res.json();
  for (const r of restocks) console.log(r.at, r.store, r.city, r.storage, r.color, r.still_listed ? "still listed" : "gone");
}
tick();
setInterval(tick, ${CACHE_SEC}_000);`,
  };
}

export async function ApiPage({ country: c }: { country: Country }) {
  const cc = c.cc;
  const loc = pageLocale();
  const lang = loc.lang;
  const V = dictT().decide.api;
  const C = dictT().views.common;
  const x = await view(c, loc);
  const url = pageUrl(PATH(c), loc);
  const title = V.title(c);
  const facts = emptyFacts(cc);
  const longFmt = new Intl.DateTimeFormat(lang === "en" ? "en-US" : loc.tag, { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
  const H2 = V.h2(x);
  const sections = ["endpoints", "examples", "fields", "limits", "script", "apple", "method"].map((id) => ({ id, nav: V.nav[id as keyof typeof V.nav], h2: H2[id as keyof typeof H2] }));
  const code = samples(cc);
  const live = `${SITE}/api/v1/${cc}/stock?model=duo`;
  const sources: Source[] = [
    { label: V.sources.pickup, url: "https://www.apple.com/shop/shipping-pickup" },
    { label: V.sources.method, url: `${SITE}/how-it-works` },
    { label: V.sources.log, url: `${SITE}${x.us ? "/restocks" : `${prefixOf(cc)}/restocks`}` },
  ];
  const inLanguage = loc.native ? { inLanguage: loc.tag } : {};
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${SITE}${url}`, url: `${SITE}${url}`, name: title, description: V.ld(x).description, isPartOf: { "@id": `${SITE}/#website` }, about: { "@id": `${SITE}/#organization` }, ...inLanguage },
      { "@type": "WebAPI", "@id": `${SITE}/api/v1#api`, name: "PickupChecker public API", description: V.ld(x).description, documentation: `${SITE}${url}`, provider: { "@id": `${SITE}/#organization` }, termsOfService: `${SITE}${url}#limits`, url: `${SITE}/api/v1` },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8">
      <JsonLd data={ld} />
      <Breadcrumbs items={crumbsFor(c, lang, V.crumb)} />
      <h1 className="display mt-3 text-3xl sm:text-5xl">{V.h1(x)}</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-2">{V.intro(x)}</p>
      {lang === "en" && <p className="mt-2 text-sm text-ink-3">{V.updated(x, UPDATED(c.timeZone).format(new Date()))}</p>}
      <StatGrid cols={4} className="mt-6">
        <Stat value={x.stores} label={V.hero.stores(x.one)} tone="accent" />
        <Stat value={`${x.storesNow}/${x.stores}`} label={V.hero.now} live />
        <Stat value={x.restocks24} label={V.hero.restocks24} />
        <Stat value={CACHE_SEC} unit="s" label={V.hero.cache} tone="muted" />
      </StatGrid>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href={live} className="btn btn-primary" target="_blank" rel="noopener">{V.tryIt}</a>
        <Link href={x.alert} className="btn btn-ghost">{V.setUpAlert}</Link>
      </div>
      <SectionNav label={V.onThisPage} sections={sections} />
      <Figure id="laptop-typing-code" eager />

      <div className="pane prose-site mt-8 p-6 sm:p-8">
        <section id="endpoints" className="scroll-mt-24">
          <h2>{H2.endpoints}</h2>
          <p>{V.endpointsLead(x)}</p>
          <Table caption={V.endpointsCaption} head={V.endpointsHead} min="40rem">
            {V.endpointsRows(x).map((r) => (
              <tr key={r.path} className="border-b border-line">
                <th scope="row" className={rowTh}><code>{r.path}</code></th>
                <td className="py-2 pe-3 align-top">{r.returns}</td>
                <td className="py-2 pe-3 align-top">{r.params}</td>
              </tr>
            ))}
          </Table>
        </section>

        <section id="examples" className="scroll-mt-24">
          <h2>{H2.examples}</h2>
          <p>{V.examplesLead}</p>
          <h3 className="mt-5 text-base font-semibold">{V.exampleTitles.curl}</h3>
          <pre className={pre}><code>{code.curl}</code></pre>
          <h3 className="mt-5 text-base font-semibold">{V.exampleTitles.python}</h3>
          <pre className={pre}><code>{code.python}</code></pre>
          <h3 className="mt-5 text-base font-semibold">{V.exampleTitles.node}</h3>
          <pre className={pre}><code>{code.node}</code></pre>
          <Figure id="terminal-logs" />
        </section>

        <section id="fields" className="scroll-mt-24">
          <h2>{H2.fields}</h2>
          <p>{V.fieldsLead}</p>
          <Table caption={V.fieldsCaption} head={V.fieldsHead} min="36rem">
            {V.fieldsRows().map((r) => (
              <tr key={r.f} className="border-b border-line">
                <th scope="row" className={rowTh}><code>{r.f}</code></th>
                <td className={td}>{r.t}</td>
                <td className="py-2 pe-3 align-top">{r.m}</td>
              </tr>
            ))}
          </Table>
        </section>

        <section id="limits" className="scroll-mt-24">
          <h2>{H2.limits}</h2>
          <p>{V.limitsLead}</p>
          <StatGrid cols={3} className="my-4">
            <Stat value={CACHE_SEC} unit="s" label={V.hero.cache} tone="accent" />
            <Stat value={RATE_PER_MIN} label={V.perMinute} />
            <Stat value="0" label={V.keysNeeded} tone="muted" />
          </StatGrid>
          <Keys items={V.limitsKeys()} />
        </section>

        <section id="script" className="scroll-mt-24">
          <h2>{H2.script}</h2>
          <p>{V.scriptLead(x)}</p>
          <Table caption={V.scriptCaption} head={V.scriptHead} min="32rem">
            {V.scriptRows().map((r) => (
              <tr key={r.k} className="border-b border-line">
                <th scope="row" className={rowTh}>{r.k}</th>
                <td className="py-2 pe-3 align-top">{r.a}</td>
                <td className="py-2 pe-3 align-top">{r.b}</td>
              </tr>
            ))}
          </Table>
          <p><Link href={x.alert} className="btn btn-primary">{V.setUpAlert}</Link></p>
          <Figure id="phone-notification" />
        </section>

        <section id="apple" className="scroll-mt-24">
          <h2>{H2.apple}</h2>
          <p>{V.appleLead}</p>
          <Keys items={V.appleKeys()} />
        </section>

        <section id="method" className="scroll-mt-24">
          <h2>{H2.method}</h2>
          <p>{V.methodLead(x)}</p>
          <Keys items={V.methodKeys()} />
        </section>
      </div>

      <RelatedBlock title={V.related}>
        <LinkRow title={V.sameData} links={[
          { href: `${prefixOf(cc)}/iphone-duo-restock-times`, label: V.questions.restockTimes },
          { href: `${prefixOf(cc)}/${DECIDE_SLUGS.shortage}`, label: V.questions.shortage },
          { href: `${prefixOf(cc)}/${DECIDE_SLUGS.configs}`, label: V.questions.configs },
          { href: "/how-it-works", label: V.questions.howItWorks },
          ...(x.us ? [{ href: "/iphone-duo-stock-alerts", label: V.questions.alerts }, { href: "/iphone-duo-stock-checker", label: V.questions.stockChecker }] : []),
        ]} />
        <LinkRow title={V.otherCountries} links={otherCountryLinks("api", cc, lang)} />
      </RelatedBlock>
      <div className="mt-10"><RichFaq items={V.faq(x)} facts={facts} title={V.faqTitle} /></div>
      <div className="mt-8"><SourceList sources={sources} facts={facts} where={C.sourcesWhere(x.stores, c)} since={longFmt.format(new Date(`${x.since}T12:00:00Z`))} /></div>
    </div>
  );
}
