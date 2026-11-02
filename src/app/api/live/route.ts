import { NextResponse } from "next/server";
import { and, inArray, sql } from "drizzle-orm";
import { db, hasDatabase, schema } from "@/lib/db";
import { PART_INDEX, STORE_INDEX, modelKeyFor, partNumbersFor, type ModelKey } from "@/lib/apple/catalog";
import type { CountryCode } from "@/lib/apple/countries";
import { countryScope } from "@/lib/stock/queries";
import { parseLiveKey, type LiveScope } from "@/lib/liveScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_KEYS = 100;
const MAX_STORES = 120;

/**
 * GET /api/live?k=m:duo&k=s:R085&k=m:duo|s:R085.R123&k=c:uk|m:duo — the latest check time per scope, so a page
 * left open keeps showing the real "checked 4s ago" instead of counting up from when it was rendered
 * (src/components/site/LiveChecked.tsx polls it every few seconds), and the latest committed stock change per
 * scope (`changed`), so an open page re-renders when its stock actually moved. Cached 4 s at the CDN: every open
 * tab on the same page shares one database read (plus one per other country's model scope).
 */
export async function GET(req: Request) {
  const keys = [...new Set(new URL(req.url).searchParams.getAll("k"))].slice(0, MAX_KEYS);
  const scopes = keys.map((k) => [k, parseLiveKey(k)] as const).filter((x): x is readonly [string, LiveScope] => x[1] !== null);
  const out: Record<string, string | null> = {};
  const changed: Record<string, string | null> = {};
  if (scopes.length && hasDatabase()) {
    const stores = [...new Set(scopes.flatMap(([, s]) => s.stores))].filter((n) => STORE_INDEX.has(n)).slice(0, MAX_STORES);
    const models = [...new Set(scopes.filter(([, s]) => s.stores.length === 0 && s.model && !s.country).map(([, s]) => s.model as ModelKey))];
    // Another country's model: its part numbers, and its stores where those parts are shared with other countries.
    const intl = [...new Set(scopes.filter(([, s]) => s.country && s.model).map(([, s]) => `${s.country}|${s.model}`))].slice(0, 6);
    const d = db();
    const intlRows = Promise.all(intl.map(async (k) => {
      const [cc, model] = k.split("|") as [CountryCode, ModelKey];
      const sc = countryScope(cc, null, partNumbersFor(model, [], [], cc));
      const conds = [inArray(schema.storeSkuStatus.partNumber, sc.parts ?? []), ...(sc.stores ? [inArray(schema.storeSkuStatus.storeNumber, sc.stores)] : [])];
      const [r] = await d.select({ at: sql<Date | null>`max(${schema.storeSkuStatus.lastCheckedAt})`, changed: sql<Date | null>`max(${schema.storeSkuStatus.lastChangedAt})` }).from(schema.storeSkuStatus).where(and(...conds));
      return [k, { at: r?.at ?? null, changed: r?.changed ?? null }] as const;
    }));
    const [perStorePart, perPart, perCountry] = await Promise.all([
      stores.length
        ? d.select({ store: schema.storeSkuStatus.storeNumber, part: schema.storeSkuStatus.partNumber, at: schema.storeSkuStatus.lastCheckedAt, changed: schema.storeSkuStatus.lastChangedAt }).from(schema.storeSkuStatus).where(inArray(schema.storeSkuStatus.storeNumber, stores))
        : Promise.resolve([]),
      models.length
        ? d.select({ part: schema.storeSkuStatus.partNumber, at: sql<Date | null>`max(${schema.storeSkuStatus.lastCheckedAt})`, changed: sql<Date | null>`max(${schema.storeSkuStatus.lastChangedAt})` }).from(schema.storeSkuStatus).where(inArray(schema.storeSkuStatus.partNumber, models.flatMap((m) => partNumbersFor(m)))).groupBy(schema.storeSkuStatus.partNumber)
        : Promise.resolve([]),
      intlRows,
    ]);
    const byCountry = new Map(perCountry);
    const latest = (rows: { at?: Date | string | null }[]) => rows.reduce<number>((a, r) => (r.at ? Math.max(a, new Date(r.at).getTime()) : a), 0);
    const iso = (t: number | Date | string | null | undefined) => (t ? new Date(t).toISOString() : null);
    // A store row's model, whatever its country (PART_INDEX decodes every country's part numbers).
    const modelOf = (part: string) => { const i = PART_INDEX.get(part); return i ? modelKeyFor(i.model) : null; };
    for (const [key, scope] of scopes) {
      if (scope.country) {
        const r = byCountry.get(`${scope.country}|${scope.model}`);
        out[key] = iso(r?.at);
        changed[key] = iso(r?.changed);
        continue;
      }
      const parts = scope.model ? new Set(partNumbersFor(scope.model)) : null;
      const rows = scope.stores.length
        ? perStorePart.filter((r) => scope.stores.includes(r.store) && (!scope.model || modelOf(r.part) === scope.model))
        : parts ? perPart.filter((r) => parts.has(r.part)) : [];
      out[key] = iso(latest(rows));
      changed[key] = iso(latest(rows.map((r) => ({ at: r.changed }))));
    }
  }
  return NextResponse.json({ now: new Date().toISOString(), checked: out, changed }, { headers: { "cache-control": "public, max-age=0, s-maxage=4, stale-while-revalidate=8" } });
}
