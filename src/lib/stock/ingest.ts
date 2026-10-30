/**
 * Apply one pickup-message result to the stock tables (idempotent, transition-aware, debounced).
 *
 *  status per (store, part): available | unavailable | unknown
 *  • a successful call observes available/unavailable for every (store, part) it covers
 *  • an error never changes a status (unknown ≠ unavailable), it only shows in poll_log / errors
 *  • unavailable→available emits a `restock` event; available→unavailable emits `soldout`
 *  • unknown→available also emits `restock` (first sighting counts) but is flagged `firstSeen`
 *  • a change is held as *pending* until confirmed (see CONFIRM): Apple now and then answers
 *    "Currently unavailable" for every store of one response and takes it back seconds later
 *    (≈250 such blips in the poller's first seven hours). One response cannot flip a status alone.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "../db";
import type { PickupStoreResult } from "../apple/client";

export type StockStatus = "available" | "unavailable" | "unknown";

/**
 * Confirmation rules. A pending change is committed once it has been observed `seen` times in a row
 * (responses from overlapping anchors count, so the same sweep usually confirms) and has persisted
 * for `minMs`. Any observation that agrees with the committed status cancels the pending change.
 *  • restock: two responses must agree (same sweep via overlap, else the next one ≈ 20 s later) —
 *    an alert is late by seconds, and never sent for a one-off "available"
 *  • soldout: two observations at least 15 s apart — i.e. the next sweep must still say unavailable.
 *    A blip is one response taken back within seconds, so the second observation refutes it; a real
 *    sell-out shows on the public pages within ~20–40 s instead of the 2 minutes the first version
 *    waited (users compared us against other trackers and saw stale "available").
 */
export const CONFIRM = {
  restock: { seen: 2, minMs: 0 },
  soldout: { seen: 2, minMs: 15_000 },
} as const;

export interface Transition {
  storeNumber: string;
  partNumber: string;
  kind: "restock" | "soldout";
  quote: string | null;
  firstSeen: boolean;
  /** When the new status was first observed — the event time. */
  at: Date;
}

export interface IngestResult {
  updated: number;
  /** Observations that disagreed with the committed status and were held back as pending. */
  held: number;
  transitions: Transition[];
  eventIds: number[];
}

export interface StatusRow {
  status: StockStatus;
  quote: string | null;
  pendingStatus: StockStatus | null;
  pendingSince: Date | null;
  pendingSeen: number;
}

export interface Decision {
  status: StockStatus;
  quote: string | null;
  pendingStatus: StockStatus | null;
  pendingSince: Date | null;
  pendingSeen: number;
  /** The transition this observation committed, if any. */
  commit: { kind: "restock" | "soldout"; firstSeen: boolean; since: Date } | null;
  /** The observation disagreed with the committed status and was not (yet) applied. */
  held: boolean;
}

const CLEARED = { pendingStatus: null, pendingSince: null, pendingSeen: 0 } as const;

/** Pure: what one observation does to one (store, part) row. */
export function decide(prev: StatusRow | undefined, obs: { available: boolean; quote: string | null }, now: Date): Decision {
  const before: StockStatus = prev?.status ?? "unknown";
  const after: StockStatus = obs.available ? "available" : "unavailable";
  if (before === after) return { status: before, quote: obs.quote, ...CLEARED, commit: null, held: false };
  if (before === "unknown") {
    // Nothing to compare against (new store or part, or rows expired as stale): take it, flag restocks.
    return { status: after, quote: obs.quote, ...CLEARED, commit: after === "available" ? { kind: "restock", firstSeen: true, since: now } : null, held: false };
  }
  const kind = after === "available" ? "restock" : "soldout";
  const rule = CONFIRM[kind];
  const pending = prev && prev.pendingStatus === after && prev.pendingSince ? { since: prev.pendingSince, seen: prev.pendingSeen + 1 } : { since: now, seen: 1 };
  if (pending.seen >= rule.seen && now.getTime() - pending.since.getTime() >= rule.minMs) {
    return { status: after, quote: obs.quote, ...CLEARED, commit: { kind, firstSeen: false, since: pending.since }, held: false };
  }
  return { status: before, quote: prev?.quote ?? null, pendingStatus: after, pendingSince: pending.since, pendingSeen: pending.seen, commit: null, held: true };
}

/**
 * Per-store write serialisation: two responses that cover the same store (overlapping anchors) must
 * not read-then-write the same rows concurrently, or a pending count is lost / a commit reverted.
 * Keys are taken in sorted order, so there is no deadlock; disjoint responses still run in parallel.
 */
const chains = new Map<string, Promise<void>>();
export async function withStoreLocks<T>(storeNumbers: Iterable<string>, fn: () => Promise<T>): Promise<T> {
  const keys = [...new Set(storeNumbers)].sort();
  const releases: (() => void)[] = [];
  for (const k of keys) {
    const prev = chains.get(k) ?? Promise.resolve();
    let release: () => void = () => {};
    const mine = new Promise<void>((resolve) => { release = resolve; });
    const chain = prev.then(() => mine);
    chains.set(k, chain);
    await prev;
    releases.push(() => { release(); if (chains.get(k) === chain) chains.delete(k); });
  }
  try {
    return await fn();
  } finally {
    for (const r of releases) r();
  }
}

export async function ingestStores(
  stores: PickupStoreResult[],
  sweepId: string | null,
  now = new Date(),
  knownStores?: Set<string>,
): Promise<IngestResult> {
  const obs: { storeNumber: string; partNumber: string; available: boolean; quote: string | null }[] = [];
  for (const s of stores) {
    if (knownStores && !knownStores.has(s.storeNumber)) continue;
    for (const p of s.parts) obs.push({ storeNumber: s.storeNumber, partNumber: p.partNumber, available: p.available, quote: p.quote });
  }
  if (obs.length === 0) return { updated: 0, held: 0, transitions: [], eventIds: [] };

  const storeNumbers = [...new Set(obs.map((p) => p.storeNumber))];
  const partNumbers = [...new Set(obs.map((p) => p.partNumber))];
  return withStoreLocks(storeNumbers, async () => {
    const d = db();
    const current = await d
      .select({
        storeNumber: schema.storeSkuStatus.storeNumber,
        partNumber: schema.storeSkuStatus.partNumber,
        status: schema.storeSkuStatus.status,
        quote: schema.storeSkuStatus.quote,
        pendingStatus: schema.storeSkuStatus.pendingStatus,
        pendingSince: schema.storeSkuStatus.pendingSince,
        pendingSeen: schema.storeSkuStatus.pendingSeen,
      })
      .from(schema.storeSkuStatus)
      .where(and(inArray(schema.storeSkuStatus.storeNumber, storeNumbers), inArray(schema.storeSkuStatus.partNumber, partNumbers)));
    const prev = new Map<string, StatusRow>(
      current.map((c) => [
        `${c.storeNumber}|${c.partNumber}`,
        { status: c.status as StockStatus, quote: c.quote, pendingStatus: c.pendingStatus as StockStatus | null, pendingSince: c.pendingSince, pendingSeen: c.pendingSeen },
      ]),
    );

    const transitions: Transition[] = [];
    let held = 0;
    const rows = obs.map((o) => {
      const dec = decide(prev.get(`${o.storeNumber}|${o.partNumber}`), o, now);
      if (dec.commit) transitions.push({ storeNumber: o.storeNumber, partNumber: o.partNumber, kind: dec.commit.kind, quote: o.quote, firstSeen: dec.commit.firstSeen, at: dec.commit.since });
      if (dec.held) held++;
      return { ...o, dec };
    });

    // Upsert in chunks; `since`/`last_changed_at` only move on a committed change, `last_available_at`
    // only when the committed status is available and this observation agrees.
    const CH = 200;
    for (let i = 0; i < rows.length; i += CH) {
      const chunk = rows.slice(i, i + CH);
      await d
        .insert(schema.storeSkuStatus)
        .values(
          chunk.map((r) => ({
            storeNumber: r.storeNumber,
            partNumber: r.partNumber,
            status: r.dec.status,
            quote: r.dec.quote,
            since: r.dec.commit?.since ?? now,
            lastCheckedAt: now,
            lastChangedAt: now,
            lastAvailableAt: r.available && r.dec.status === "available" ? now : null,
            pendingStatus: r.dec.pendingStatus,
            pendingSince: r.dec.pendingSince,
            pendingSeen: r.dec.pendingSeen,
          })),
        )
        .onConflictDoUpdate({
          target: [schema.storeSkuStatus.storeNumber, schema.storeSkuStatus.partNumber],
          set: {
            status: sql`excluded.status`,
            quote: sql`excluded.quote`,
            lastCheckedAt: now,
            since: sql`CASE WHEN ${schema.storeSkuStatus.status} IS DISTINCT FROM excluded.status THEN excluded.since ELSE ${schema.storeSkuStatus.since} END`,
            lastChangedAt: sql`CASE WHEN ${schema.storeSkuStatus.status} IS DISTINCT FROM excluded.status THEN excluded.last_changed_at ELSE ${schema.storeSkuStatus.lastChangedAt} END`,
            lastAvailableAt: sql`CASE WHEN excluded.last_available_at IS NOT NULL THEN excluded.last_available_at ELSE ${schema.storeSkuStatus.lastAvailableAt} END`,
            pendingStatus: sql`excluded.pending_status`,
            pendingSince: sql`excluded.pending_since`,
            pendingSeen: sql`excluded.pending_seen`,
          },
        });
    }

    const eventIds: number[] = [];
    if (transitions.length > 0) {
      const inserted = await d
        .insert(schema.availabilityEvents)
        .values(transitions.map((t) => ({ storeNumber: t.storeNumber, partNumber: t.partNumber, kind: t.kind, quote: t.quote, at: t.at, sweepId, firstSeen: t.firstSeen })))
        .returning({ id: schema.availabilityEvents.id });
      eventIds.push(...inserted.map((r) => r.id));
    }
    return { updated: rows.length, held, transitions, eventIds };
  });
}

/** Mark statuses older than `staleMs` as unknown (we have not seen them lately); pending changes go with them. */
export async function expireStale(staleMs: number, now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - staleMs);
  const r = await db()
    .update(schema.storeSkuStatus)
    .set({ status: "unknown", lastChangedAt: now, since: now, ...CLEARED })
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
