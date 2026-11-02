import { NextResponse } from "next/server";
import { inArray, sql } from "drizzle-orm";
import { db, hasDatabase, schema } from "@/lib/db";
import { STORE_INDEX, partNumbersFor, type ModelKey } from "@/lib/apple/catalog";
import { parseLiveKey, type LiveScope } from "@/lib/liveScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_KEYS = 100;
const MAX_STORES = 120;

/**
 * GET /api/live?k=m:duo&k=s:R085&k=m:duo|s:R085.R123 — the latest check time per scope, so a page left
 * open keeps showing the real "checked 4s ago" instead of counting up from when it was rendered
 * (src/components/site/LiveChecked.tsx polls it every few seconds). Cached 4 s at the CDN: every open
 * tab on the same page shares one database read.
 */
export async function GET(req: Request) {
  const keys = [...new Set(new URL(req.url).searchParams.getAll("k"))].slice(0, MAX_KEYS);
  const scopes = keys.map((k) => [k, parseLiveKey(k)] as const).filter((x): x is readonly [string, LiveScope] => x[1] !== null);
  const out: Record<string, string | null> = {};
  if (scopes.length && hasDatabase()) {
    const stores = [...new Set(scopes.flatMap(([, s]) => s.stores))].filter((n) => STORE_INDEX.has(n)).slice(0, MAX_STORES);
    const models = [...new Set(scopes.filter(([, s]) => s.stores.length === 0 && s.model).map(([, s]) => s.model as ModelKey))];
    const d = db();
    const [perStorePart, perPart] = await Promise.all([
      stores.length
        ? d.select({ store: schema.storeSkuStatus.storeNumber, part: schema.storeSkuStatus.partNumber, at: schema.storeSkuStatus.lastCheckedAt }).from(schema.storeSkuStatus).where(inArray(schema.storeSkuStatus.storeNumber, stores))
        : Promise.resolve([]),
      models.length
        ? d.select({ part: schema.storeSkuStatus.partNumber, at: sql<Date | null>`max(${schema.storeSkuStatus.lastCheckedAt})` }).from(schema.storeSkuStatus).where(inArray(schema.storeSkuStatus.partNumber, models.flatMap((m) => partNumbersFor(m)))).groupBy(schema.storeSkuStatus.partNumber)
        : Promise.resolve([]),
    ]);
    const latest = (rows: { at: Date | string | null }[]) => rows.reduce<number>((a, r) => (r.at ? Math.max(a, new Date(r.at).getTime()) : a), 0);
    for (const [key, scope] of scopes) {
      const parts = scope.model ? new Set(partNumbersFor(scope.model)) : null;
      const t = scope.stores.length
        ? latest(perStorePart.filter((r) => scope.stores.includes(r.store) && (!parts || parts.has(r.part))))
        : parts ? latest(perPart.filter((r) => parts.has(r.part))) : 0;
      out[key] = t ? new Date(t).toISOString() : null;
    }
  }
  return NextResponse.json({ now: new Date().toISOString(), checked: out }, { headers: { "cache-control": "public, max-age=0, s-maxage=4, stale-while-revalidate=8" } });
}
