/**
 * One sweep = every coverage anchor × every ≤20-part batch, fetched through an egress provider,
 * ingested, notified, logged. Shared by the VPS poller (full mode) and the serverless fallback.
 */
import { randomUUID } from "node:crypto";
import { COVERAGE, ALL_PART_NUMBERS, STORE_INDEX, type CoverageAnchor } from "../apple/catalog";
import { batchParts, fetchPickup, type FetchLike, type PickupResponse } from "../apple/client";
import { db, schema } from "../db";
import { ingestStores, type Transition } from "./ingest";
import { notifyRestocks } from "./notify";
import { recordError, errorMessage } from "../errors";

export interface SweepTask {
  anchor: CoverageAnchor;
  batchIndex: number;
  parts: string[];
}

export function buildTasks(parts: string[] = ALL_PART_NUMBERS, anchors: CoverageAnchor[] = COVERAGE): SweepTask[] {
  const batches = batchParts(parts);
  const tasks: SweepTask[] = [];
  for (const anchor of anchors) batches.forEach((b, i) => tasks.push({ anchor, batchIndex: i, parts: b }));
  return tasks;
}

/** An egress identity hands out a fetch for one request and learns from its outcome. */
export interface Egress {
  name: string;
  /** Returns a fetch bound to a fresh/available identity, or null when the pool is exhausted. */
  acquire(): Promise<{ fetch: FetchLike; label: string; release(status: number): void } | null>;
}

export interface SweepOptions {
  egress: Egress;
  tasks?: SweepTask[];
  concurrency?: number;
  mode: "full" | "degraded";
  host: string;
  /** Called after each request (for metrics / adaptive pacing). */
  onResult?: (r: { task: SweepTask; status: number; ok: boolean; ms: number; label: string }) => void;
  /**
   * Retry each failed task once at the end of the sweep, through a fresh egress identity (default on).
   * 147 stores sit under a single anchor, so a failed request otherwise leaves half their phones a round
   * behind. Skipped when the first pass mostly failed or ran long: that is an outage, not a blip.
   */
  retryFailed?: boolean;
}

/** Retry pass rules: only when failures are a minority and the first pass left time for it. */
export function shouldRetry(failed: number, tasks: number, firstPassMs: number): boolean {
  return failed > 0 && failed <= tasks / 2 && firstPassMs < 40_000;
}

export interface SweepSummary {
  id: string;
  requests: number;
  /** Failed requests, retries included. */
  failures: number;
  /** Tasks that failed, were retried, and then succeeded. */
  recovered: number;
  /** Tasks still without an answer after the sweep (their pairs wait for the next round). */
  unresolved: number;
  tasks: number;
  throttled: number;
  timeouts: number;
  storesCovered: number;
  transitions: number;
  /** Observations held back as unconfirmed (Apple blips) — see ingest.ts CONFIRM. */
  held: number;
  notified: { matched: number; sent: number; failed: number; skipped: number };
  durationMs: number;
  exhausted: boolean;
}

export async function runSweep(opts: SweepOptions): Promise<SweepSummary> {
  const id = randomUUID();
  const started = new Date();
  const tasks = opts.tasks ?? buildTasks();
  const concurrency = Math.max(1, opts.concurrency ?? 6);
  const d = db();
  await d.insert(schema.sweeps).values({ id, startedAt: started, mode: opts.mode, host: opts.host }).onConflictDoNothing();

  const known = new Set(STORE_INDEX.keys());
  const covered = new Set<string>();
  const allTransitions: Transition[] = [];
  const allEventIds: number[] = [];
  let requests = 0, failures = 0, throttled = 0, timeouts = 0, held = 0, exhausted = false;
  const logRows: (typeof schema.pollLog.$inferInsert)[] = [];

  let queue = tasks, cursor = 0;
  const failed: SweepTask[] = [];
  let retrying = false, recovered = 0;
  const worker = async () => {
    while (cursor < queue.length && !exhausted) {
      const task = queue[cursor++];
      const slot = await opts.egress.acquire();
      if (!slot) { exhausted = true; cursor--; break; }
      const t0 = Date.now();
      let res: PickupResponse | null = null;
      let err: string | undefined;
      try {
        res = await fetchPickup(task.parts, task.anchor.location, slot.fetch);
      } catch (e) {
        err = /abort/i.test(errorMessage(e)) ? `timed out after ${Math.round((Date.now() - t0) / 1000)} s` : errorMessage(e);
      }
      const ms = Date.now() - t0;
      const status = res?.httpStatus ?? 0;
      slot.release(status);
      requests++;
      const ok = Boolean(res?.ok);
      if (!ok) { failures++; if (!retrying) failed.push(task); }
      else if (retrying) recovered++;
      if (status === 541 || status === 429 || status === 403) throttled++;
      logRows.push({
        at: new Date(), sweepId: id, egress: slot.label, anchor: task.anchor.location, batch: task.batchIndex,
        httpStatus: status || null, ok, durationMs: ms, bytes: res?.bytes ?? null, storesSeen: res?.stores.length ?? null,
        error: err ?? res?.error ?? null,
      });
      opts.onResult?.({ task, status, ok, ms, label: slot.label });
      if (res?.ok) {
        try {
          const r = await ingestStores(res.stores, id, new Date(), known);
          for (const s of res.stores) if (known.has(s.storeNumber)) covered.add(s.storeNumber);
          allTransitions.push(...r.transitions);
          allEventIds.push(...r.eventIds);
          held += r.held;
          // Notify immediately per response, but never hold the worker: push retries can take seconds.
          if (r.transitions.some((t) => t.kind === "restock")) {
            notifyJobs.push(notifyRestocks(r.transitions, r.eventIds).then((n) => { notified.matched += n.matched; notified.sent += n.sent; notified.failed += n.failed; notified.skipped += n.skipped; }).catch(() => undefined));
          }
        } catch (e) {
          await recordError("poller", `ingest failed: ${errorMessage(e)}`, { anchor: task.anchor.location, batch: task.batchIndex });
        }
      } else if (err && !/http \d+/.test(err)) {
        // Timeouts are counted (poll_log, sweep summary) and only become an incident when they pile up.
        if (/timed out/.test(err)) timeouts++;
        else await recordError("poller", `apple request failed: ${err}`, { anchor: task.anchor.location, egress: slot.label });
      }
    }
  };
  const notified = { matched: 0, sent: 0, failed: 0, skipped: 0 };
  const notifyJobs: Promise<void>[] = [];
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  const firstPassMs = Date.now() - started.getTime();
  const notAttempted = exhausted ? tasks.length - cursor : 0;
  if (opts.retryFailed !== false && !exhausted && shouldRetry(failed.length, tasks.length, firstPassMs)) {
    queue = failed; cursor = 0; retrying = true;
    await Promise.all(Array.from({ length: Math.min(concurrency, failed.length) }, worker));
  }
  const unresolved = failed.length - recovered + notAttempted;
  // Give in-flight alerts a moment to land in this sweep's numbers; stragglers finish in the background.
  await Promise.race([Promise.allSettled(notifyJobs), new Promise((r) => setTimeout(r, 5000))]);

  if (timeouts >= 3 && timeouts / Math.max(1, requests) >= 0.1) {
    await recordError("poller", `apple requests timing out: ${timeouts} of ${requests} in one sweep`, { host: opts.host, sweepId: id });
  }
  const finished = new Date();
  // poll_log in chunks
  for (let i = 0; i < logRows.length; i += 200) await d.insert(schema.pollLog).values(logRows.slice(i, i + 200));
  await d
    .update(schema.sweeps)
    .set({ finishedAt: finished, requests, failures, storesCovered: covered.size, transitions: allTransitions.length, durationMs: finished.getTime() - started.getTime() })
    .where((await import("drizzle-orm")).eq(schema.sweeps.id, id));
  return { id, requests, failures, recovered, unresolved, tasks: tasks.length, throttled, timeouts, storesCovered: covered.size, transitions: allTransitions.length, held, notified, durationMs: finished.getTime() - started.getTime(), exhausted };
}

/** Heartbeat written after every sweep; the watchdog and the admin page read it. */
export async function writeHeartbeat(value: Record<string, unknown>): Promise<void> {
  await db()
    .insert(schema.pollerState)
    .values({ key: "heartbeat", value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.pollerState.key, set: { value, updatedAt: new Date() } });
}

export async function readState<T = Record<string, unknown>>(key: string): Promise<{ value: T; updatedAt: Date } | null> {
  const rows = await db().select().from(schema.pollerState).where((await import("drizzle-orm")).eq(schema.pollerState.key, key)).limit(1);
  return rows[0] ? { value: rows[0].value as T, updatedAt: rows[0].updatedAt } : null;
}

export async function writeState(key: string, value: Record<string, unknown>): Promise<void> {
  await db()
    .insert(schema.pollerState)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.pollerState.key, set: { value, updatedAt: new Date() } });
}

/* ---------------- a simple budgeted single-identity egress (serverless / local) ---------------- */

export interface BudgetState { used: number; windowStart: number; cooldownUntil: number }

/**
 * One fixed IP (a Vercel function, a laptop): ≤ `limit` requests per `windowMs`; a 541 puts it
 * on cool-down for `cooldownMs`. State is persisted by the caller via readState/writeState.
 */
export function singleIdentityEgress(
  label: string,
  state: BudgetState,
  fetchImpl: FetchLike,
  limit = 25,
  windowMs = 35 * 60 * 1000,
  cooldownMs = 35 * 60 * 1000,
): Egress & { state: BudgetState } {
  return {
    name: label,
    state,
    async acquire() {
      const now = Date.now();
      if (now < state.cooldownUntil) return null;
      if (now - state.windowStart > windowMs) { state.windowStart = now; state.used = 0; }
      if (state.used >= limit) return null;
      state.used++;
      return {
        fetch: fetchImpl,
        label,
        release(status: number) {
          if (status === 541 || status === 429 || status === 403) state.cooldownUntil = Date.now() + cooldownMs;
        },
      };
    },
  };
}
