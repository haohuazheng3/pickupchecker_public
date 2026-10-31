/**
 * When polling goes wrong, and what takes over. Judged by the data, not by the poller saying it is alive:
 * a heartbeat proves the process runs, not that Apple answers it (a blocked /56 or a broken IPv6 route
 * keeps the heartbeat ticking while nothing gets checked).
 *
 *  • silent  — no heartbeat for HEARTBEAT_STALE_MS: the poller (or its host) is gone. Vercel fills in.
 *  • blind   — heartbeat fresh, but under half of store × phone pairs were checked in the last minute.
 *              The poller falls back to its own spare egress; the owner is mailed.
 *  • partial — some stores have gone unchecked for PARTIAL_SEC (a region's requests keep failing).
 *  • ok
 *
 * Serverless fill-in (degraded mode) has about one request a minute, so it spends it where it matters:
 * stores × phones that paying alerts watch and that have gone stale, then whatever is oldest.
 */
import { eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { partNumbersFor, type ModelKey } from "../apple/catalog";
import { coveredWatchIds, effectivePlan } from "../plans";
import type { SweepTask } from "./sweep";

export const HEARTBEAT_STALE_MS = 75_000;
/**
 * A heartbeat this old *and* stale data means the poller is gone, not blind: fill in a minute sooner.
 * Normal rounds beat every ~15–30 s, the poller's own spare mode every ~40 s, so this never fires on them.
 */
export const HEARTBEAT_LATE_MS = 60_000;
/** A pair counts as fresh when it was checked this recently (cadence 15 s, so ~4 rounds of slack). */
export const FRESH_SEC = 60;
/** A store unchecked this long means its requests keep failing, not a blip. */
export const PARTIAL_SEC = 90;
/** A watched pair younger than this doesn't need serverless help yet. */
const WATCHED_REFRESH_SEC = 60;

export interface Freshness {
  pairs: number;
  freshPairs: number;
  stores: number;
  /** Stores with at least one phone not checked for PARTIAL_SEC. */
  staleStores: string[];
  oldestSec: number | null;
}

export async function freshness(): Promise<Freshness> {
  const rows = (await db().execute(sql`
    select store_number, count(*)::int as pairs,
           count(*) filter (where last_checked_at > now() - make_interval(secs => ${FRESH_SEC}))::int as fresh,
           extract(epoch from now() - min(last_checked_at))::int as oldest
    from store_sku_status group by store_number`)).rows as { store_number: string; pairs: number; fresh: number; oldest: number | null }[];
  let pairs = 0, freshPairs = 0, oldest: number | null = null;
  const staleStores: string[] = [];
  for (const r of rows) {
    pairs += r.pairs;
    freshPairs += r.fresh;
    if (r.oldest != null) { oldest = Math.max(oldest ?? 0, r.oldest); if (r.oldest > PARTIAL_SEC) staleStores.push(r.store_number); }
  }
  return { pairs, freshPairs, stores: rows.length, staleStores: staleStores.sort(), oldestSec: oldest };
}

export type PollerState = "ok" | "silent" | "blind" | "partial";

export function pollerVerdict(heartbeatAgeMs: number, f: Freshness | null): { state: PollerState; fill: boolean; summary: string } {
  const share = f && f.pairs > 0 ? f.freshPairs / f.pairs : null;
  if (!(heartbeatAgeMs <= HEARTBEAT_STALE_MS) || (heartbeatAgeMs > HEARTBEAT_LATE_MS && share != null && share < 0.5)) {
    const age = Number.isFinite(heartbeatAgeMs) ? `${Math.round(heartbeatAgeMs / 1000)} s` : "ever";
    return { state: "silent", fill: true, summary: `no poller heartbeat for ${age}` };
  }
  if (f && share != null) {
    if (share < 0.5) return { state: "blind", fill: false, summary: `poller alive, but only ${Math.round(share * 100)}% of store × phone pairs checked in the last minute` };
    if (f.staleStores.length > 0) return { state: "partial", fill: false, summary: `${f.staleStores.length} store${f.staleStores.length === 1 ? "" : "s"} not checked for over ${PARTIAL_SEC} s: ${f.staleStores.slice(0, 10).join(", ")}${f.staleStores.length > 10 ? " …" : ""}` };
  }
  return { state: "ok", fill: false, summary: "all stores fresh" };
}

/** "R123|MJQ34LL/A" */
export const pairKey = (store: string, part: string) => `${store}|${part}`;

/**
 * Serverless order: tasks that refresh stale watched pairs first (stalest first), then by the oldest pair
 * they cover. Checking a task makes its pairs fresh, so the next call moves on by itself — no cursor.
 */
export function orderTasks(tasks: SweepTask[], watched: Set<string>, ageSec: (store: string, part: string) => number): SweepTask[] {
  return tasks
    .map((t, i) => {
      let watchedAge = 0, oldest = 0;
      for (const s of t.anchor.covers) for (const p of t.parts) {
        const a = ageSec(s, p);
        if (a > oldest) oldest = a;
        if (watched.has(pairKey(s, p)) && a > watchedAge) watchedAge = a;
      }
      return { t, i, urgent: watchedAge > WATCHED_REFRESH_SEC ? watchedAge : 0, oldest };
    })
    .sort((a, b) => b.urgent - a.urgent || b.oldest - a.oldest || a.i - b.i)
    .map((x) => x.t);
}

/** Store × phone pairs that alerts actually send for (active, not paused, inside the owner's plan). */
export async function watchedPairs(): Promise<Set<string>> {
  const d = db();
  const rules = await d
    .select({ id: schema.watches.id, userId: schema.watches.userId, model: schema.watches.model, storages: schema.watches.storages, colors: schema.watches.colors, storeNumbers: schema.watches.storeNumbers, active: schema.watches.active, paused: schema.watches.paused, createdAt: schema.watches.createdAt })
    .from(schema.watches)
    .where(eq(schema.watches.active, true));
  if (rules.length === 0) return new Set();
  const userIds = [...new Set(rules.map((r) => r.userId))];
  const subs = await d.select().from(schema.subscriptions).where(inArray(schema.subscriptions.userId, userIds));
  const out = new Set<string>();
  for (const uid of userIds) {
    const mine = rules.filter((r) => r.userId === uid);
    const covered = coveredWatchIds(mine, effectivePlan(subs.filter((s) => s.userId === uid)).plan.limit);
    for (const r of mine) {
      if (r.paused || !covered.has(r.id)) continue;
      for (const part of partNumbersFor(r.model as ModelKey, r.storages, r.colors)) for (const s of r.storeNumbers) out.add(pairKey(s, part));
    }
  }
  return out;
}

/** The serverless order for this moment (see orderTasks). Never-checked pairs count as the oldest. */
export async function fallbackOrder(tasks: SweepTask[]): Promise<SweepTask[]> {
  const [watched, ages] = await Promise.all([
    watchedPairs(),
    db().execute(sql`select store_number, part_number, extract(epoch from now() - last_checked_at)::int as age from store_sku_status`),
  ]);
  const age = new Map<string, number>();
  for (const r of ages.rows as { store_number: string; part_number: string; age: number | null }[]) age.set(pairKey(r.store_number, r.part_number), r.age ?? 1e9);
  return orderTasks(tasks, watched, (s, p) => age.get(pairKey(s, p)) ?? 1e9);
}
