/** The restock log of a country (/restocks, /{cc}/restocks): filter by model, region and sold-outs; paged; times in the reader's zone. */
import type { Metadata } from "next";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { MODELS, DEFAULT_MODEL, modelByKey, statesWithStores, storesOf, mapPath, restocksPath, type ModelKey } from "@/lib/apple/catalog";
import { prefixOf, type Country } from "@/lib/apple/countries";
import { restockFeed, restockCounts } from "@/lib/stock/queries";
import { RestockFeed } from "@/components/restocks/RestockFeed";
import { BrowseModels, BrowseStates } from "@/components/seo/Browse";
import { BrowseCountryModels, BrowseCountryPopular, BrowseCountryRegions } from "@/components/seo/CountryBrowse";
import { LinkRow, RelatedBlock } from "@/components/seo/Related";
import { JsonLd } from "@/components/seo/JsonLd";
import { ORG_ID } from "@/lib/seo/siteLd";
import { englishLocale, pathInLocale, type Locale } from "@/lib/i18n/locales";
import { dict } from "@/lib/i18n/dict";
import { pageLocale, t } from "@/lib/i18n/server";
import { countryLabel, regionLabel as regionName } from "@/lib/i18n/places";

const LIMIT = 50;

export function restocksMetadata(c: Country, loc: Locale = englishLocale(c.cc)): Metadata {
  if (c.cc === "us") {
    return {
      title: "iPhone restock log — every US Apple Store, live",
      description: "Every iPhone Duo, 18 Pro and Pro Max restock at US Apple Stores for in-store pickup, with exact time, configuration and map.",
      alternates: { canonical: "/restocks" },
    };
  }
  const V = dict(loc.lang).views.restocks;
  const n = storesOf(c.cc).length;
  return {
    title: V.metaTitle(c, n),
    description: V.metaDescription(c, n),
    alternates: { canonical: loc.native ? pathInLocale(restocksPath(c.cc), loc) : restocksPath(c.cc) },
  };
}

export async function RestocksPage({ country: c, searchParams: sp }: { country: Country; searchParams: Record<string, string | string[] | undefined> }) {
  const cc = c.cc;
  const us = cc === "us";
  const loc = pageLocale();
  const lang = loc.lang;
  const D = t().views;
  const V = D.restocks;
  const modelParam = typeof sp.model === "string" ? sp.model : DEFAULT_MODEL;
  const model: ModelKey | undefined = modelParam === "all" ? undefined : modelByKey(modelParam) ? (modelParam as ModelKey) : DEFAULT_MODEL;
  const states = statesWithStores(cc);
  const state = typeof sp.state === "string" ? states.find((s) => s.slug === sp.state)?.name : undefined;
  const kind = sp.kind === "all" ? "all" : "restock";
  const page = Number(sp.page ?? 0) || 0;
  const [rows, counts] = await Promise.all([restockFeed({ model, state, kind, limit: LIMIT, page, country: cc }), restockCounts({ model, state, country: cc })]);
  const self = restocksPath(cc);
  const base = (over: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const v = { model: model ?? "all", state: state ? states.find((s) => s.name === state)?.slug : undefined, kind: kind === "all" ? "all" : undefined, ...over };
    for (const [k, val] of Object.entries(v)) if (val) q.set(k, val);
    return `${self}?${q.toString()}`;
  };
  // The log as a dataset (answer engines and dataset search): what is recorded, where, since when, by whom.
  const url = `https://pickupchecker.com${loc.native ? pathInLocale(self, loc) : self}`;
  const dataset = {
    "@context": "https://schema.org", "@type": "Dataset", "@id": `${url}#dataset`, url,
    name: us ? "US Apple Store iPhone pickup restock log" : V.datasetName(c),
    description: V.datasetDescription(c),
    creator: { "@id": ORG_ID }, isAccessibleForFree: true, temporalCoverage: `${us ? "2026-10-29" : "2026-11-02"}/..`,
    spatialCoverage: us ? "United States" : countryLabel(cc, lang), variableMeasured: V.datasetMeasured,
    ...(loc.native ? { inLanguage: loc.tag } : {}),
  };
  return (
    <div className="mx-auto max-w-4xl px-4 pt-8">
      <JsonLd data={dataset} />
      <h1 className="display text-3xl sm:text-5xl">{us ? "Restock log" : V.h1(c)}</h1>
      <p className="mt-2 text-ink-2">{V.summary(counts.day, counts.week, model ? modelByKey(model)!.name : undefined, state ? regionName(cc, state, lang) : undefined)}</p>
      <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
        <Link href={base({ model: "all", page: undefined })} className="chip px-3 py-1.5 text-xs" data-on={!model}>{V.allModels}</Link>
        {MODELS.map((m) => <Link key={m.key} href={base({ model: m.key, page: undefined })} className="chip px-3 py-1.5 text-xs" data-on={model === m.key}>{m.name}</Link>)}
        <span className="mx-1 text-ink-3">·</span>
        <Link href={base({ kind: undefined, page: undefined })} className="chip px-3 py-1.5 text-xs" data-on={kind === "restock"}>{V.restocks}</Link>
        <Link href={base({ kind: "all", page: undefined })} className="chip px-3 py-1.5 text-xs" data-on={kind === "all"}>{V.withSoldOut}</Link>
        {states.length > 1 && (
          <form action={self} method="get" className="ms-auto flex items-center gap-1">
            <input type="hidden" name="model" value={model ?? "all"} />{kind === "all" && <input type="hidden" name="kind" value="all" />}
            <select name="state" defaultValue={state ? states.find((s) => s.name === state)?.slug : ""} className="input w-auto py-1.5 text-xs" aria-label={us ? "State" : V.regionLabel(c)}>
              <option value="">{us ? "All states" : V.allRegions(c)}</option>
              {states.map((s) => <option key={s.slug} value={s.slug}>{regionName(cc, s.name, lang)}</option>)}
            </select>
            <button className="chip px-3 py-1.5 text-xs" type="submit">{V.filter}</button>
          </form>
        )}
      </div>
      <div className="mt-5">
        <RestockFeed rows={rows} model={model} showModel={!model} />
        <div className="mt-3 flex items-center justify-between text-xs text-ink-3">
          <span>{V.page(page + 1)}</span>
          <span className="flex gap-2">{page > 0 && <Link className="chip px-3 py-1" href={base({ page: String(page - 1) })}>{V.newer}</Link>}{rows.length >= LIMIT && <Link className="chip px-3 py-1" href={base({ page: String(page + 1) })}>{V.older}</Link>}</span>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={`${mapPath(cc)}${model ? `?model=${model}` : ""}`} className="btn btn-ghost btn-sm">{D.common.liveMap}</Link>
        <Link href={`${prefixOf(cc) || "/"}?model=${model ?? DEFAULT_MODEL}#notify`} className="btn btn-primary btn-sm">{V.getAlerts}</Link>
      </div>
      <RelatedBlock title={V.byPlace}>
        {us ? <BrowseStates current={state} title="By state" /> : states.length > 1 ? <BrowseCountryRegions country={c} current={state} title={V.byRegion(c)} /> : <BrowseCountryPopular country={c} />}
        {us ? <BrowseModels current={model} /> : <BrowseCountryModels country={c} current={model} />}
        {loc.native && <LinkRow title={D.common.more} links={[{ href: `${prefixOf(cc)}/iphone-duo-restock-times`, label: t().place.home.restockTimesChip }]} />}
      </RelatedBlock>
    </div>
  );
}
