/** The restock log of a country (/restocks, /{cc}/restocks): filter by model, region and sold-outs; paged; times in the reader's zone. */
import type { Metadata } from "next";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { MODELS, DEFAULT_MODEL, modelByKey, statesWithStores, storesOf, mapPath, restocksPath, type ModelKey } from "@/lib/apple/catalog";
import { prefixOf, type Country } from "@/lib/apple/countries";
import { restockFeed, restockCounts } from "@/lib/stock/queries";
import { RestockFeed } from "@/components/restocks/RestockFeed";
import { BrowseModels, BrowseStates } from "@/components/seo/Browse";
import { BrowseCountryModels, BrowseCountryPopular, BrowseCountryRegions } from "@/components/seo/CountryBrowse";
import { RelatedBlock } from "@/components/seo/Related";

const LIMIT = 50;

export function restocksMetadata(c: Country): Metadata {
  if (c.cc === "us") {
    return {
      title: "iPhone restock log — every US Apple Store, live",
      description: "Every iPhone Duo, 18 Pro and Pro Max restock at US Apple Stores for in-store pickup, with exact time, configuration and map.",
      alternates: { canonical: "/restocks" },
    };
  }
  const n = storesOf(c.cc).length;
  return {
    title: `iPhone restock log ${c.inName} — ${n === 1 ? "the Apple Store" : `all ${n} Apple Stores`}, live`,
    description: `Every iPhone Duo, 18 Pro and Pro Max restock at ${n === 1 ? "the Apple Store" : "Apple Stores"} ${c.inName} for in-store pickup, with exact time, configuration and map.`,
    alternates: { canonical: restocksPath(c.cc) },
  };
}

export async function RestocksPage({ country: c, searchParams: sp }: { country: Country; searchParams: Record<string, string | string[] | undefined> }) {
  const cc = c.cc;
  const us = cc === "us";
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
  const regionLabel = us ? "state" : (c.regionNoun ?? "area");
  return (
    <div className="mx-auto max-w-4xl px-4 pt-8">
      <h1 className="display text-3xl sm:text-5xl">{us ? "Restock log" : `Restock log ${c.inName}`}</h1>
      <p className="mt-2 text-ink-2">{counts.day} restock{counts.day === 1 ? "" : "s"} in 24 hours · {counts.week} this week{model ? ` · ${modelByKey(model)!.name}` : ""}{state ? ` · ${state}` : ""}. Times in your time zone.</p>
      <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
        <Link href={base({ model: "all", page: undefined })} className="chip px-3 py-1.5 text-xs" data-on={!model}>All models</Link>
        {MODELS.map((m) => <Link key={m.key} href={base({ model: m.key, page: undefined })} className="chip px-3 py-1.5 text-xs" data-on={model === m.key}>{m.name}</Link>)}
        <span className="mx-1 text-ink-3">·</span>
        <Link href={base({ kind: undefined, page: undefined })} className="chip px-3 py-1.5 text-xs" data-on={kind === "restock"}>Restocks</Link>
        <Link href={base({ kind: "all", page: undefined })} className="chip px-3 py-1.5 text-xs" data-on={kind === "all"}>Restocks + sold out</Link>
        {states.length > 1 && (
          <form action={self} method="get" className="ml-auto flex items-center gap-1">
            <input type="hidden" name="model" value={model ?? "all"} />{kind === "all" && <input type="hidden" name="kind" value="all" />}
            <select name="state" defaultValue={state ? states.find((s) => s.name === state)?.slug : ""} className="input w-auto py-1.5 text-xs" aria-label={us ? "State" : regionLabel[0].toUpperCase() + regionLabel.slice(1)}>
              <option value="">{us ? "All states" : `All ${c.regionNounPlural ?? "areas"}`}</option>
              {states.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
            </select>
            <button className="chip px-3 py-1.5 text-xs" type="submit">Filter</button>
          </form>
        )}
      </div>
      <div className="mt-5">
        <RestockFeed rows={rows} model={model} showModel={!model} />
        <div className="mt-3 flex items-center justify-between text-xs text-ink-3">
          <span>page {page + 1}</span>
          <span className="flex gap-2">{page > 0 && <Link className="chip px-3 py-1" href={base({ page: String(page - 1) })}>← Newer</Link>}{rows.length >= LIMIT && <Link className="chip px-3 py-1" href={base({ page: String(page + 1) })}>Older →</Link>}</span>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={`${mapPath(cc)}${model ? `?model=${model}` : ""}`} className="btn btn-ghost btn-sm">Live map</Link>
        <Link href={`${prefixOf(cc) || "/"}?model=${model ?? DEFAULT_MODEL}#notify`} className="btn btn-primary btn-sm">Get alerts</Link>
      </div>
      <RelatedBlock title="Restocks by place">
        {us ? <BrowseStates current={state} title="By state" /> : states.length > 1 ? <BrowseCountryRegions country={c} current={state} title={`By ${regionLabel}`} /> : <BrowseCountryPopular country={c} />}
        {us ? <BrowseModels current={model} /> : <BrowseCountryModels country={c} current={model} />}
      </RelatedBlock>
    </div>
  );
}
