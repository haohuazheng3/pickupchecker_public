/**
 * The fast lane: the stores paid alerts point at, each asked on its own (`store=R###`, ~7 KB, ~0.3 s)
 * every FAST_CADENCE_SEC (5) — on top of the 15 s sweep of all 269 stores. Plus the instant confirm,
 * shared with the sweep: a first "available" is re-asked from that store about a second later instead
 * of waiting for the next round, so a confirmed restock (CONFIRM.restock needs two responses) alerts in
 * ~1–2 s and a one-response blip is refuted on the spot. Both outcomes are logged (ops_log) so brief
 * listings and Apple glitches can be told apart.
 *
 * Measured 2026-11-02 before building it (docs/research.md §7): 17 stores every 5 s for 5 minutes,
 * 1,020 requests, 0 failures, 0 × 541, p50 0.26 s; the 15 s sweep ran unchanged beside it.
 */
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { batchParts, fetchPickupAtStore, type PickupResponse } from "../apple/client";
import { partNumbersFor, STORE_INDEX, type ModelKey } from "../apple/catalog";
import { db, schema } from "../db";
import { errorMessage, recordError } from "../errors";
import { logOps } from "../ops";
import { ACTIVE_STATUSES, coveredWatchIds, effectivePlan } from "../plans";
import { ingestStores, type PendingObs, type RefutedObs } from "./ingest";
import { notifyRestocks, type NotifyStats } from "./notify";
import type { Egress } from "./sweep";

export interface RuleRow { id: string; userId: string; active: boolean; paused: boolean; createdAt: Date | string; model: string; storages: string[]; colors: string[]; storeNumbers: string[] }
export interface SubRow { userId: string; plan: string; status: string; alertLimit: number }

/**
 * Pure: store → part numbers that paid, covered, unpaused rules point at. Coverage is the plan rule
 * notify.ts applies (the oldest `limit` active rules of each user send), so the fast lane checks exactly
 * what would alert — nothing for a user without a plan.
 */
export function targetsFromRules(rules: RuleRow[], subs: SubRow[]): Map<string, string[]> {
  const byUser = new Map<string, RuleRow[]>();
  for (const r of rules) if (r.active) byUser.set(r.userId, [...(byUser.get(r.userId) ?? []), r]);
  const out = new Map<string, Set<string>>();
  for (const [userId, mine] of byUser) {
    const { plan } = effectivePlan(subs.filter((s) => s.userId === userId));
    if (plan.limit <= 0) continue;
    const covered = coveredWatchIds(mine, plan.limit);
    for (const r of mine) {
      if (!covered.has(r.id) || r.paused) continue;
      if (r.storages.length !== 1 || r.colors.length !== 1 || r.storeNumbers.length !== 1) continue; // legacy shape never alerts
      const store = r.storeNumbers[0];
      if (!STORE_INDEX.has(store)) continue;
      for (const p of partNumbersFor(r.model as ModelKey, r.storages, r.colors)) out.set(store, (out.get(store) ?? new Set()).add(p));
    }
  }
  return new Map([...out].sort(([a], [b]) => a.localeCompare(b)).map(([s, parts]) => [s, [...parts].sort()]));
}

export async function loadFastTargets(): Promise<Map<string, string[]>> {
  const d = db();
  const rules = await d
    .select({ id: schema.watches.id, userId: schema.watches.userId, active: schema.watches.active, paused: schema.watches.paused, createdAt: schema.watches.createdAt, model: schema.watches.model, storages: schema.watches.storages, colors: schema.watches.colors, storeNumbers: schema.watches.storeNumbers })
    .from(schema.watches)
    .where(eq(schema.watches.active, true));
  const userIds = [...new Set(rules.map((r) => r.userId))];
  const subs = userIds.length
    ? await d.select({ userId: schema.subscriptions.userId, plan: schema.subscriptions.plan, status: schema.subscriptions.status, alertLimit: schema.subscriptions.alertLimit }).from(schema.subscriptions).where(and(inArray(schema.subscriptions.userId, userIds), inArray(schema.subscriptions.status, ACTIVE_STATUSES)))
    : [];
  return targetsFromRules(rules, subs);
}

export interface FastTask { storeNumber: string; parts: string[] }

/** One request per store and ≤ 20 parts (a store with more watched parts gets two). */
export function buildFastTasks(targets: Map<string, string[]>): FastTask[] {
  const tasks: FastTask[] = [];
  for (const [storeNumber, parts] of targets) for (const b of batchParts(parts)) tasks.push({ storeNumber, parts: b });
  return tasks;
}

type LogRow = typeof schema.pollLog.$inferInsert;

/** One store request through an egress slot: fetched, logged, ingested; restocks notified in the background. */
async function askStore(task: FastTask, egress: Egress, label: string, timeoutMs: number, known: Set<string>, jobs: Promise<unknown>[], notified: NotifyStats) {
  const slot = await egress.acquire();
  if (!slot) return null;
  const t0 = Date.now();
  let res: PickupResponse | null = null;
  let err: string | undefined;
  try {
    res = await fetchPickupAtStore(task.parts, task.storeNumber, slot.fetch, timeoutMs);
  } catch (e) {
    err = /abort/i.test(errorMessage(e)) ? `timed out after ${Math.round((Date.now() - t0) / 1000)} s` : errorMessage(e);
  }
  const status = res?.httpStatus ?? 0;
  slot.release(status);
  const row: LogRow = {
    at: new Date(), sweepId: label, egress: slot.label, anchor: `store:${task.storeNumber}`, batch: 0,
    httpStatus: status || null, ok: Boolean(res?.ok), durationMs: Date.now() - t0, bytes: res?.bytes ?? null, storesSeen: res?.stores.length ?? null,
    error: err ?? res?.error ?? null,
  };
  let ingested: Awaited<ReturnType<typeof ingestStores>> | null = null;
  if (res?.ok) {
    try {
      ingested = await ingestStores(res.stores, label, new Date(), known);
      if (ingested.transitions.some((t) => t.kind === "restock")) {
        const r = ingested;
        jobs.push(notifyRestocks(r.transitions, r.eventIds).then((n) => { notified.matched += n.matched; notified.sent += n.sent; notified.failed += n.failed; notified.skipped += n.skipped; }).catch(() => undefined));
      }
      if (ingested.refuted.length) jobs.push(logRefuted(label, ingested.refuted));
    } catch (e) {
      await recordError("poller", `fast lane ingest failed: ${errorMessage(e)}`, { store: task.storeNumber });
    }
  }
  return { row, res, err, ingested };
}

/** Pending changes a response cancelled: kept 3 days (debug) to tell blips from brief listings. */
export function logRefuted(label: string, refuted: RefutedObs[], extra: Record<string, unknown> = {}): Promise<void> {
  const now = Date.now();
  return logOps("poller", "debug", `pending change refuted (${refuted.length})`, {
    sweepId: label, ...extra,
    pairs: refuted.slice(0, 40).map((r) => ({ store: r.storeNumber, part: r.partNumber, pending: r.pendingStatus, seen: r.pendingSeen, afterMs: r.pendingSince ? now - r.pendingSince.getTime() : null })),
  }).catch(() => undefined);
}

export interface ConfirmOptions {
  egress: Egress;
  /** Label for poll_log / events (the sweep id or fast round id). */
  label: string;
  known: Set<string>;
  /** How long after the first sighting the store is asked again (Apple's blips take seconds to be withdrawn). */
  delayMs?: number;
  timeoutMs?: number;
  notified?: NotifyStats;
}

/**
 * The instant confirm: for every store with a pending "available", ask that store once more after
 * `delayMs`. Agreeing → the restock commits (event time = first sighting) and alerts go out; disagreeing
 * → the pending change is refuted and logged. Returns the poll_log rows to persist.
 */
export async function confirmPendingRestocks(pending: PendingObs[], opts: ConfirmOptions): Promise<{ rows: LogRow[]; confirmed: number; refuted: number; requests: number }> {
  const byStore = new Map<string, Set<string>>();
  for (const p of pending) if (p.status === "available") byStore.set(p.storeNumber, (byStore.get(p.storeNumber) ?? new Set()).add(p.partNumber));
  const out = { rows: [] as LogRow[], confirmed: 0, refuted: 0, requests: 0 };
  if (byStore.size === 0) return out;
  await new Promise((r) => setTimeout(r, opts.delayMs ?? 800));
  const notified = opts.notified ?? { matched: 0, sent: 0, failed: 0, skipped: 0 };
  const jobs: Promise<unknown>[] = [];
  await Promise.all(
    [...byStore].map(async ([storeNumber, parts]) => {
      for (const batch of batchParts([...parts])) {
        const r = await askStore({ storeNumber, parts: batch }, opts.egress, opts.label, opts.timeoutMs ?? 4500, opts.known, jobs, notified);
        if (!r) return;
        r.row.anchor = `confirm:${storeNumber}`;
        out.rows.push(r.row); out.requests++;
        if (!r.ingested) continue;
        const confirmed = r.ingested.transitions.filter((t) => t.kind === "restock").length;
        const refuted = r.ingested.refuted.filter((x) => x.pendingStatus === "available").length;
        out.confirmed += confirmed; out.refuted += refuted;
        const first = pending.find((p) => p.storeNumber === storeNumber)?.since;
        jobs.push(logOps("poller", "info", confirmed ? `instant confirm: restock confirmed at ${storeNumber}` : refuted ? `instant confirm: listing gone again at ${storeNumber}` : `instant confirm: no change at ${storeNumber}`, {
          sweepId: opts.label, store: storeNumber, parts: batch, confirmed, refuted, msSinceFirstSighting: first ? Date.now() - first.getTime() : null,
        }).catch(() => undefined));
      }
    }),
  );
  await Promise.allSettled(jobs);
  return out;
}

export interface FastRoundOptions {
  egress: Egress;
  targets: Map<string, string[]>;
  concurrency?: number;
  timeoutMs?: number;
  confirmDelayMs?: number;
}

export interface FastRoundSummary {
  id: string;
  requests: number;
  failures: number;
  throttled: number;
  timeouts: number;
  stores: number;
  transitions: number;
  held: number;
  confirmed: number;
  refuted: number;
  notified: NotifyStats;
  durationMs: number;
  exhausted: boolean;
}

/** One fast-lane round: every target store once, pending restocks confirmed at once, everything logged. */
export async function runFastRound(opts: FastRoundOptions): Promise<FastRoundSummary> {
  const id = `fast:${randomUUID()}`;
  const started = Date.now();
  const tasks = buildFastTasks(opts.targets);
  const known = new Set(STORE_INDEX.keys());
  const notified: NotifyStats = { matched: 0, sent: 0, failed: 0, skipped: 0 };
  const jobs: Promise<unknown>[] = [];
  const rows: LogRow[] = [];
  const pending: PendingObs[] = [];
  let cursor = 0, failures = 0, throttled = 0, timeouts = 0, transitions = 0, held = 0, exhausted = false;
  const worker = async () => {
    while (cursor < tasks.length && !exhausted) {
      const task = tasks[cursor++];
      const r = await askStore(task, opts.egress, id, opts.timeoutMs ?? 4500, known, jobs, notified);
      if (!r) { exhausted = true; break; }
      rows.push(r.row);
      if (!r.row.ok) failures++;
      if (r.row.httpStatus === 541 || r.row.httpStatus === 429 || r.row.httpStatus === 403) throttled++;
      if (r.err && /timed out/.test(r.err)) timeouts++;
      if (r.ingested) { transitions += r.ingested.transitions.length; held += r.ingested.held; pending.push(...r.ingested.pending); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(opts.concurrency ?? 8, Math.max(1, tasks.length)) }, worker));
  const c = await confirmPendingRestocks(pending, { egress: opts.egress, label: id, known, delayMs: opts.confirmDelayMs, timeoutMs: opts.timeoutMs, notified });
  rows.push(...c.rows);
  const d = db();
  for (let i = 0; i < rows.length; i += 200) await d.insert(schema.pollLog).values(rows.slice(i, i + 200));
  // Alerts finish in the background; the next round must not wait on a slow push service.
  void Promise.allSettled(jobs);
  return { id, requests: rows.length, failures, throttled, timeouts, stores: opts.targets.size, transitions: transitions + c.confirmed, held, confirmed: c.confirmed, refuted: c.refuted, notified, durationMs: Date.now() - started, exhausted };
}
