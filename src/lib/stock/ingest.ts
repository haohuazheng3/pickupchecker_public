/**
 * Apply one pickup-message result to the stock tables (idempotent, transition-aware).
 *
 *  status per (store, part): available | unavailable | unknown
 *  • a successful call sets available/unavailable for every (store, part) it covers
 *  • an error never changes a status (unknown ≠ unavailable), it only shows in poll_log / errors
 *  • unavailable→available emits a `restock` event; available→unavailable emits `soldout`
 *  • unknown→available also emits `restock` (first sighting counts) but is flagged `firstSeen`
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "../db";
import type { PickupStoreResult } from "../apple/client";

export interface Transition {
  storeNumber: string;
  partNumber: string;
  kind: "restock" | "soldout";
  quote: string | null;
  firstSeen: boolean;
}

export interface IngestResult {
  updated: number;
  transitions: Transition[];
  eventIds: number[];
}

export async function ingestStores(
  stores: PickupStoreResult[],
  sweepId: string | null,
  now = new Date(),
  knownStores?: Set<string>,
): Promise<IngestResult> {
  const d = db();
  const pairs: { storeNumber: string; partNumber: string; available: boolean; quote: string | null }[] = [];
  for (const s of stores) {
    if (knownStores && !knownStores.has(s.storeNumber)) continue;
    for (const p of s.parts) pairs.push({ storeNumber: s.storeNumber, partNumber: p.partNumber, available: p.available, quote: p.quote });
  }
  if (pairs.length === 0) return { updated: 0, transitions: [], eventIds: [] };

  const storeNumbers = [...new Set(pairs.map((p) => p.storeNumber))];
  const partNumbers = [...new Set(pairs.map((p) => p.partNumber))];
  const current = await d
    .select({
      storeNumber: schema.storeSkuStatus.storeNumber,
      partNumber: schema.storeSkuStatus.partNumber,
      status: schema.storeSkuStatus.status,
    })
    .from(schema.storeSkuStatus)
    .where(and(inArray(schema.storeSkuStatus.storeNumber, storeNumbers), inArray(schema.storeSkuStatus.partNumber, partNumbers)));
  const prev = new Map(current.map((c) => [`${c.storeNumber}|${c.partNumber}`, c.status]));

  const transitions: Transition[] = [];
  const rows = pairs.map((p) => {
    const before = prev.get(`${p.storeNumber}|${p.partNumber}`) ?? "unknown";
    const after = p.available ? "available" : "unavailable";
    const changed = before !== after;
    if (changed && after === "available") transitions.push({ ...p, kind: "restock", firstSeen: before === "unknown" });
    if (changed && after === "unavailable" && before === "available") transitions.push({ ...p, kind: "soldout", firstSeen: false });
    return { ...p, status: after, changed };
  });

  // Upsert statuses in chunks; `since`/`last_changed_at` only move on a change.
  const CH = 200;
  for (let i = 0; i < rows.length; i += CH) {
    const chunk = rows.slice(i, i + CH);
    await d
      .insert(schema.storeSkuStatus)
      .values(
        chunk.map((r) => ({
          storeNumber: r.storeNumber,
          partNumber: r.partNumber,
          status: r.status,
          quote: r.quote,
          since: now,
          lastCheckedAt: now,
          lastChangedAt: now,
          lastAvailableAt: r.status === "available" ? now : null,
        })),
      )
      .onConflictDoUpdate({
        target: [schema.storeSkuStatus.storeNumber, schema.storeSkuStatus.partNumber],
        set: {
          quote: sql`excluded.quote`,
          lastCheckedAt: now,
          since: sql`CASE WHEN ${schema.storeSkuStatus.status} IS DISTINCT FROM excluded.status THEN excluded.since ELSE ${schema.storeSkuStatus.since} END`,
          lastChangedAt: sql`CASE WHEN ${schema.storeSkuStatus.status} IS DISTINCT FROM excluded.status THEN excluded.last_changed_at ELSE ${schema.storeSkuStatus.lastChangedAt} END`,
          lastAvailableAt: sql`CASE WHEN excluded.status = 'available' THEN excluded.last_available_at ELSE ${schema.storeSkuStatus.lastAvailableAt} END`,
          status: sql`excluded.status`,
        },
      });
  }

  const eventIds: number[] = [];
  if (transitions.length > 0) {
    const inserted = await d
      .insert(schema.availabilityEvents)
      .values(transitions.map((t) => ({ storeNumber: t.storeNumber, partNumber: t.partNumber, kind: t.kind, quote: t.quote, at: now, sweepId, firstSeen: t.firstSeen })))
      .returning({ id: schema.availabilityEvents.id });
    eventIds.push(...inserted.map((r) => r.id));
  }
  return { updated: rows.length, transitions, eventIds };
}

/** Mark statuses older than `staleMs` as unknown (we have not seen them lately). */
export async function expireStale(staleMs: number, now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - staleMs);
  const r = await db()
    .update(schema.storeSkuStatus)
    .set({ status: "unknown", lastChangedAt: now, since: now })
    .where(and(sql`${schema.storeSkuStatus.lastCheckedAt} < ${cutoff}`, sql`${schema.storeSkuStatus.status} <> 'unknown'`))
    .returning({ s: schema.storeSkuStatus.storeNumber });
  return r.length;
}

export async function currentStatus(partNumbers: string[]) {
  if (partNumbers.length === 0) return [];
  return db()
    .select()
    .from(schema.storeSkuStatus)
    .where(inArray(schema.storeSkuStatus.partNumber, partNumbers));
}

export async function statusForStore(storeNumber: string) {
  return db().select().from(schema.storeSkuStatus).where(eq(schema.storeSkuStatus.storeNumber, storeNumber));
}
