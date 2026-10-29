import type { Metadata } from "next";
import Link from "next/link";
import { MODELS, DEFAULT_MODEL, modelByKey, statesWithStores, type ModelKey } from "@/lib/apple/catalog";
import { restockFeed, restockCounts } from "@/lib/stock/queries";
import { RestockFeed } from "@/components/restocks/RestockFeed";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "iPhone restock log — every US Apple Store, live",
  description: "Every time an Apple Store in the US gets the iPhone Duo, 18 Pro or 18 Pro Max back in stock for in-store pickup, with the exact date and time, the configuration and a map.",
  alternates: { canonical: "/restocks" },
};

const LIMIT = 50;

/** The full restock log: filter by model, state and sold-outs; paged; times in the reader's zone. */
export default async function Restocks({ searchParams }: PageProps<"/restocks">) {
  const sp = await searchParams;
  const modelParam = typeof sp.model === "string" ? sp.model : DEFAULT_MODEL;
  const model: ModelKey | undefined = modelParam === "all" ? undefined : modelByKey(modelParam) ? (modelParam as ModelKey) : DEFAULT_MODEL;
  const states = statesWithStores();
  const state = typeof sp.state === "string" ? states.find((s) => s.slug === sp.state)?.name : undefined;
  const kind = sp.kind === "all" ? "all" : "restock";
  const page = Number(sp.page ?? 0) || 0;
  const [rows, counts] = await Promise.all([restockFeed({ model, state, kind, limit: LIMIT, page }), restockCounts({ model, state })]);
  const base = (over: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const v = { model: model ?? "all", state: state ? states.find((s) => s.name === state)?.slug : undefined, kind: kind === "all" ? "all" : undefined, ...over };
    for (const [k, val] of Object.entries(v)) if (val) q.set(k, val);
    return `/restocks?${q.toString()}`;
  };
  return (
    <div className="mx-auto max-w-4xl px-4 pt-8">
      <h1 className="display text-3xl sm:text-5xl">Restock log</h1>
      <p className="mt-2 text-ink-2">{counts.day} restock{counts.day === 1 ? "" : "s"} in the last 24 hours, {counts.week} this week{model ? ` for the ${modelByKey(model)!.name}` : ""}{state ? ` in ${state}` : ""}. Times are shown in your time zone.</p>
      <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
        <Link href={base({ model: "all", page: undefined })} className="chip px-3 py-1.5 text-xs" data-on={!model}>All models</Link>
        {MODELS.map((m) => <Link key={m.key} href={base({ model: m.key, page: undefined })} className="chip px-3 py-1.5 text-xs" data-on={model === m.key}>{m.name}</Link>)}
        <span className="mx-1 text-ink-3">·</span>
        <Link href={base({ kind: undefined, page: undefined })} className="chip px-3 py-1.5 text-xs" data-on={kind === "restock"}>Restocks</Link>
        <Link href={base({ kind: "all", page: undefined })} className="chip px-3 py-1.5 text-xs" data-on={kind === "all"}>Restocks + sold out</Link>
        <form action="/restocks" method="get" className="ml-auto flex items-center gap-1">
          <input type="hidden" name="model" value={model ?? "all"} />{kind === "all" && <input type="hidden" name="kind" value="all" />}
          <select name="state" defaultValue={state ? states.find((s) => s.name === state)?.slug : ""} className="input w-auto py-1.5 text-xs" aria-label="State">
            <option value="">All states</option>
            {states.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
          </select>
          <button className="chip px-3 py-1.5 text-xs" type="submit">Filter</button>
        </form>
      </div>
      <div className="pane mt-5 p-4 sm:p-6">
        <RestockFeed rows={rows} model={model} showModel={!model} />
        <div className="mt-3 flex items-center justify-between text-xs text-ink-3">
          <span>page {page + 1}</span>
          <span className="flex gap-2">{page > 0 && <Link className="chip px-3 py-1" href={base({ page: String(page - 1) })}>← Newer</Link>}{rows.length >= LIMIT && <Link className="chip px-3 py-1" href={base({ page: String(page + 1) })}>Older →</Link>}</span>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={`/map${model ? `?model=${model}` : ""}`} className="btn btn-ghost btn-sm">Live map</Link>
        <Link href={`/?model=${model ?? DEFAULT_MODEL}#notify`} className="btn btn-primary btn-sm">Get alerts · free</Link>
      </div>
    </div>
  );
}
