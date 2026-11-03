/**
 * "In the last 24 hours": restocks of one model at a set of stores (or a whole country), per configuration — the
 * answer block at the top of every state, city, country and store page ("Has the iPhone Duo restocked anywhere in
 * Michigan in the last 24 hours? 512GB, Night Sky or Star White" is the question people put to an answer engine).
 * One grouped query, cached a minute; JSON-safe (ISO strings).
 */
import { unstable_cache } from "next/cache";
import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { db, hasDatabase, schema } from "../db";
import { PART_INDEX, countryOfStore, partNumbersFor, type ModelKey } from "../apple/catalog";
import type { CountryCode } from "../apple/countries";
import { recordError, errorMessage } from "../errors";
import { countryScope } from "./queries";

export interface RecentPart { partNumber: string; restocks: number; stores: number; lastAt: string; lastStore: string }
export interface RecentByConfig {
  at: string;
  hours: number;
  restocks: number;
  /** Distinct stores with at least one restock in the window. */
  stores: number;
  latest: { storeNumber: string; partNumber: string; at: string } | null;
  /** Only configurations with a restock, most first; the component zero-fills the rest of the catalogue. */
  byPart: RecentPart[];
  /** The read failed: placeholders, not "nothing happened". */
  unknown?: boolean;
}

const EMPTY = (hours: number): RecentByConfig => ({ at: new Date().toISOString(), hours, restocks: 0, stores: 0, latest: null, byPart: [] });

const cached = unstable_cache(
  // The country is implied: its scope is either its own part numbers or its store list (countryScope).
  async (stores: string[] | null, parts: string[] | null, hours: number): Promise<RecentByConfig> => {
    const ev = schema.availabilityEvents;
    const conds = [eq(ev.firstSeen, false), eq(ev.kind, "restock"), gt(ev.at, new Date(Date.now() - hours * 3600_000))];
    if (stores) conds.push(inArray(ev.storeNumber, stores));
    if (parts) conds.push(inArray(ev.partNumber, parts));
    // Grouping sets: one row per configuration and one grand-total row (part_number null) for distinct stores overall.
    const rows = await db()
      .select({
        partNumber: sql<string | null>`${ev.partNumber}`,
        n: sql<number>`count(*)::int`,
        stores: sql<number>`count(distinct ${ev.storeNumber})::int`,
        lastAt: sql<string>`max(${ev.at})`,
        lastStore: sql<string>`(array_agg(${ev.storeNumber} order by ${ev.at} desc))[1]`,
        lastPart: sql<string>`(array_agg(${ev.partNumber} order by ${ev.at} desc))[1]`,
      })
      .from(ev)
      .where(and(...conds))
      .groupBy(sql`grouping sets ((1), ())`);
    const iso = (v: string | Date) => new Date(v).toISOString();
    const out = EMPTY(hours);
    for (const r of rows) {
      if (r.partNumber == null) {
        out.restocks = r.n; out.stores = r.stores;
        out.latest = r.n > 0 ? { storeNumber: r.lastStore, partNumber: r.lastPart, at: iso(r.lastAt) } : null;
      } else if (PART_INDEX.has(r.partNumber)) {
        out.byPart.push({ partNumber: r.partNumber, restocks: r.n, stores: r.stores, lastAt: iso(r.lastAt), lastStore: r.lastStore });
      }
    }
    out.byPart.sort((a, b) => b.restocks - a.restocks || b.lastAt.localeCompare(a.lastAt));
    return out;
  },
  ["recent-by-config-v1"],
  { revalidate: 60 },
);

/**
 * Restocks of `model` (default the iPhone Duo) at `storeNumbers` — or the whole `country` when no stores are given —
 * over the last `hours` (default 24), per configuration. The country comes from the stores unless named.
 */
export async function recentByConfig(opts: { storeNumbers?: string[]; country?: CountryCode; model?: ModelKey; hours?: number } = {}): Promise<RecentByConfig> {
  const hours = opts.hours ?? 24;
  if (!hasDatabase()) return EMPTY(hours);
  const cc = opts.country ?? (opts.storeNumbers?.length ? countryOfStore(opts.storeNumbers[0]) : undefined) ?? "us";
  const parts = partNumbersFor(opts.model ?? "duo", [], [], cc);
  if (parts.length === 0 || (opts.storeNumbers && opts.storeNumbers.length === 0)) return EMPTY(hours);
  const scope = countryScope(cc, opts.storeNumbers ?? null, parts);
  try {
    return await cached(scope.stores ? [...scope.stores].sort() : null, scope.parts ? [...scope.parts].sort() : null, hours);
  } catch (e) {
    await recordError("web", `recent by config: ${errorMessage(e)}`).catch(() => undefined);
    return { ...EMPTY(hours), unknown: true };
  }
}
