/**
 * The fast lane: the stores paid alerts point at, each asked on its own (`store=R###`, ~7 KB, ~0.3 s)
 * every FAST_CADENCE_SEC (5) — on top of the 15 s sweep of the 269 US stores and the 30 s per-store round of
 * the other countries. Every request goes to the store's own country endpoint with that country's part
 * numbers (a UK alert for a Duo asks /uk/… for the …QN/A part). Plus the instant confirm,
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
import { Pool, type PoolConfig } from "pg";
import { batchParts, fetchPickupAtStore, type PickupResponse } from "../apple/client";
import { countryOfStore, partNumbersForStore, partNumbersOf, STORE_INDEX, type ModelKey } from "../apple/catalog";
import { db, dbStatus, schema } from "../db";
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
 * what would alert — nothing for a user without a plan. Part numbers are those of the store's country.
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
      for (const p of partNumbersForStore(store, r.model as ModelKey, r.storages, r.colors)) out.set(store, (out.get(store) ?? new Set()).add(p));
    }
  }
  return new Map([...out].sort(([a], [b]) => a.localeCompare(b)).map(([s, parts]) => [s, [...parts].sort()]));
}

/**
 * Pure: the targets this host asks — the stores of the countries it polls (US with the US sweep, every other country
 * with the round of the other countries). Every write for a store then comes from one process, where withStoreLocks
 * keeps them in order: a Canadian store asked by the primary while the standby polled Canada deadlocked in Postgres
 * (2026-11-03), and two hosts deciding on the same pending sighting could each record it.
 */
export function targetsForDuties(targets: Map<string, string[]>, duty: { us: boolean; intl: boolean }): Map<string, string[]> {
  return new Map([...targets].filter(([store]) => (countryOfStore(store) === "us" ? duty.us : duty.intl)));
}

export interface SharedFastTarget { store_number: string; part_number: string }
const SHARED_REFRESH_MS = 60_000;
const SHARED_MAX_AGE_MS = 120_000;

/** Each application applies its own paid coverage; only anonymous store/part demand is combined. */
export function mergeFastTargets(...sources: Map<string, string[]>[]): Map<string, string[]> {
  const merged = new Map<string, Set<string>>();
  for (const source of sources) for (const [store, parts] of source) {
    const found = merged.get(store) ?? new Set<string>();
    for (const part of parts) found.add(part);
    merged.set(store, found);
  }
  return new Map([...merged].sort(([a], [b]) => a.localeCompare(b)).map(([store, parts]) => [store, [...parts].sort()]));
}

/** Optional source, deliberately separate from the poller's writable DB and connection budget. */
export function sharedFastlanePoolConfig(env: Record<string, string | undefined>): PoolConfig {
  const url = new URL(env.FASTLANE_SHARED_DATABASE_URL ?? "");
  const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname.replace(/^\[|\]$/g, ""));
  if (!["postgres:", "postgresql:"].includes(url.protocol) || url.search || url.hash
    || (url.port && url.port !== "5432") || !url.password
    || decodeURIComponent(url.username) !== "shelfspring_fastlane_reader"
    || !["/pickupchecker", "/shelfspring"].includes(url.pathname)
    || (!local && !["172.232.3.151", "45.33.64.182"].includes(url.hostname))) {
    throw new Error("Invalid shared fast-lane database scope");
  }
  const ca = env.FASTLANE_SHARED_DATABASE_CA?.replace(/\\n/g, "\n").trim();
  if (!local && !ca) throw new Error("Shared fast-lane database CA is required");
  return { connectionString: url.toString(), ssl: local ? false : { ca, rejectUnauthorized: true },
    max: 1, connectionTimeoutMillis: 1500, statement_timeout: 1500, query_timeout: 2000,
    idleTimeoutMillis: 5000, application_name: "pickupchecker-shared-fastlane-readonly",
    options: "-c default_transaction_read_only=on -c search_path=pg_catalog" };
}

/** Follow the original cluster's existing epoch/fencing decision, never independently pick a host. */
export function sharedFastlaneTarget(status: Awaited<ReturnType<typeof dbStatus>>): "primary" | "standby" {
  const probe = status?.probes.find((p) => p.name === status.using);
  if (!status?.writable || !status.using || !probe?.ok || probe.recovery !== false
    || !probe.host || probe.owner !== probe.host || !Number.isFinite(probe.epoch) || probe.epoch < 0) {
    throw new Error("No authoritative shared fast-lane primary");
  }
  return status.using;
}

type SharedFeedEvent = "updated" | "unavailable" | "expired" | "recovered";
/**
 * Never waits for the other application's database. A completed refresh changes the same target Map
 * the fast loop already holds; targetsForDuties copies it before a round. Expiry removes only shared
 * demand even if the local 60-second reload is delayed. No shared failure can skip a local round.
 */
export function createSharedFastlaneFeed(read: () => Promise<SharedFastTarget[]>, report: (event: SharedFeedEvent, stores: number, pairs: number) => void = () => undefined) {
  let local = new Map<string, string[]>(), shared = new Map<string, string[]>();
  const output = new Map<string, string[]>();
  let lastAttempt = -Infinity, lastErrorReport = -Infinity, expiresAt = 0;
  let inFlight = false, unavailable = false, disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const emit = (event: SharedFeedEvent) => {
    try { report(event, shared.size, [...shared.values()].reduce((n, p) => n + p.length, 0)); } catch { /* diagnostics never affect polling */ }
  };
  const publish = () => {
    const merged = mergeFastTargets(local, Date.now() < expiresAt ? shared : new Map());
    output.clear();
    for (const [store, parts] of merged) output.set(store, parts);
  };
  const refresh = async () => {
    try {
      const rows = await read();
      if (disposed) return;
      const next = new Map<string, string[]>();
      for (const row of rows) {
        const country = countryOfStore(row.store_number);
        if (!country || !partNumbersOf(country).includes(row.part_number)) throw new Error("Invalid shared fast-lane target");
        next.set(row.store_number, [...(next.get(row.store_number) ?? []), row.part_number]);
      }
      shared = mergeFastTargets(next);
      expiresAt = Date.now() + SHARED_MAX_AGE_MS;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { shared = new Map(); expiresAt = 0; publish(); emit("expired"); }, SHARED_MAX_AGE_MS);
      timer.unref();
      publish();
      emit(unavailable ? "recovered" : "updated");
      unavailable = false;
    } catch {
      if (disposed) return;
      unavailable = true;
      publish();
      if (Date.now() - lastErrorReport >= 600_000) { lastErrorReport = Date.now(); emit("unavailable"); }
    } finally { inFlight = false; }
  };
  return {
    merge(targets: Map<string, string[]>): Map<string, string[]> {
      local = mergeFastTargets(targets);
      publish();
      if (!disposed && !inFlight && Date.now() - lastAttempt >= SHARED_REFRESH_MS) {
        inFlight = true; lastAttempt = Date.now(); void refresh();
      }
      return output;
    },
    dispose() { disposed = true; if (timer) clearTimeout(timer); },
  };
}

let sharedFeed: ReturnType<typeof createSharedFastlaneFeed> | undefined;
let sharedConfigErrorAt = -Infinity;
function withSharedTargets(local: Map<string, string[]>): Map<string, string[]> {
  if (!process.env.FASTLANE_SHARED_DATABASE_URL) return local;
  try {
    if (!sharedFeed) {
      const configs: Partial<Record<"primary" | "standby", PoolConfig>> = { primary: sharedFastlanePoolConfig(process.env) };
      if (process.env.FASTLANE_SHARED_DATABASE_URL_STANDBY) configs.standby = sharedFastlanePoolConfig({
        ...process.env, FASTLANE_SHARED_DATABASE_URL: process.env.FASTLANE_SHARED_DATABASE_URL_STANDBY,
      });
      const pools: Partial<Record<"primary" | "standby", Pool>> = {};
      sharedFeed = createSharedFastlaneFeed(async () => {
        const target = sharedFastlaneTarget(await dbStatus());
        const config = configs[target];
        if (!config) throw new Error("Shared demand endpoint is not configured");
        if (!pools[target]) {
          pools[target] = new Pool(config);
          // No driver error text: it can contain a DSN or server details.
          pools[target]!.on("error", () => console.warn("[fast] shared demand idle connection closed"));
        }
        const pool = pools[target]!;
        const client = await pool.connect();
        try {
          await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
          const { rows: [state] } = await client.query<{ recovery: boolean }>("SELECT pg_is_in_recovery() AS recovery");
          if (!state || state.recovery !== false) throw new Error("Shared demand endpoint is not the primary");
          const result = await client.query<SharedFastTarget>("SELECT store_number, part_number FROM public.shelfspring_fastlane_targets");
          await client.query("COMMIT");
          return result.rows;
        } catch {
          await client.query("ROLLBACK").catch(() => undefined);
          throw new Error("Shared fast-lane demand unavailable");
        } finally { client.release(); }
      }, (event, stores, pairs) => {
        const level = event === "unavailable" || event === "expired" ? "warn" : event === "recovered" ? "info" : "debug";
        void logOps("poller", level, `shared fast-lane demand ${event}`, { source: "shelfspring", stores, pairs, maxAgeSec: SHARED_MAX_AGE_MS / 1000 }).catch(() => undefined);
      });
    }
    return sharedFeed.merge(local);
  } catch {
    if (Date.now() - sharedConfigErrorAt >= 600_000) {
      sharedConfigErrorAt = Date.now();
      console.warn("[fast] shared demand configuration rejected; local targets continue");
    }
    return local;
  }
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
  return withSharedTargets(targetsFromRules(rules, subs));
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
  const country = countryOfStore(task.storeNumber) ?? "us";
  try {
    res = await fetchPickupAtStore(task.parts, task.storeNumber, slot.fetch, timeoutMs, country);
  } catch (e) {
    err = /abort/i.test(errorMessage(e)) ? `timed out after ${Math.round((Date.now() - t0) / 1000)} s` : errorMessage(e);
  }
  const status = res?.httpStatus ?? 0;
  slot.release(status);
  const row: LogRow = {
    at: new Date(), sweepId: label, egress: slot.label, anchor: `store:${task.storeNumber}`, batch: 0,
    httpStatus: status || null, ok: Boolean(res?.ok), durationMs: Date.now() - t0, bytes: res?.bytes ?? null, storesSeen: res?.stores.length ?? null,
    error: err ?? res?.error ?? null,
    ...(country !== "us" ? { country } : {}),
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

/** Runs a request through a bounded number of slots (a counting semaphore). */
export type Gate = <T>(run: () => Promise<T>) => Promise<T>;

/**
 * At most `max` runs at once; the rest wait in arrival order. A finishing run hands its slot straight to the
 * next waiter, so the bound holds exactly.
 */
export function gate(max: number): Gate {
  let active = 0;
  const waiting: (() => void)[] = [];
  return async <T,>(run: () => Promise<T>): Promise<T> => {
    if (active < max) active++;
    else await new Promise<void>((r) => waiting.push(r));
    try {
      return await run();
    } finally {
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  };
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
  /**
   * Bounds the confirm requests in flight across calls (the per-store round of other countries passes one: a
   * mass restock there would otherwise start one confirm per response, outside its own concurrency).
   */
  gate?: Gate;
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
        const ask = () => askStore({ storeNumber, parts: batch }, opts.egress, opts.label, opts.timeoutMs ?? 4500, opts.known, jobs, notified);
        const r = await (opts.gate ? opts.gate(ask) : ask());
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
  // Every country: a fast-lane target is any store a paid alert points at.
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
