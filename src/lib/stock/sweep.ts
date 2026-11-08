/**
 * One sweep = every coverage anchor × every ≤20-part batch, fetched through an egress provider,
 * ingested, notified, logged. Shared by the VPS poller (full mode) and the serverless fallback.
 *
 * The US is swept by ZIP anchors (42 × 2 batches, every 15 s). Other countries are swept by their own anchors
 * since 2026-11-08 (INTL_COVERAGE: 47 locations × 2 batches = 94 requests for 198 stores, every INTL_CADENCE_SEC;
 * until then store by store, 398 requests): buildIntlTasks makes that round — anchor requests on each country's
 * endpoint, plus `store=R###` requests for the stores no anchor returns — and runSweep runs it in mode "intl",
 * the same fetch → ingest → instant confirm → notify path, but poll_log keeps only its failures (it would
 * otherwise add ~1M rows a day). stock/intlCoverage.ts watches that every expected store keeps appearing.
 */
import { randomUUID } from "node:crypto";
import { COVERAGE, INTL_COVERAGE, ALL_PART_NUMBERS, STORES, storesOf, partNumbersOf, type CoverageAnchor } from "../apple/catalog";
import { INTL_CODES, isCountryCode, type CountryCode } from "../apple/countries";
import { batchParts, fetchPickup, fetchPickupAtStore, isNoStoreAnswer, type FetchLike, type PickupResponse } from "../apple/client";
import { db, schema } from "../db";
import { ingestStores, type Transition } from "./ingest";
import { notifyRestocks } from "./notify";
import { confirmPendingRestocks, gate, logRefuted } from "./fastlane";
import { recordError, errorMessage } from "../errors";

export interface SweepTask {
  anchor: CoverageAnchor;
  batchIndex: number;
  parts: string[];
  /** Whose endpoint (default the US). */
  country?: CountryCode;
  /** Ask this one store (`store=R###`) instead of the anchor's location. */
  store?: string;
}

export function buildTasks(parts: string[] = ALL_PART_NUMBERS, anchors: CoverageAnchor[] = COVERAGE): SweepTask[] {
  const batches = batchParts(parts);
  const tasks: SweepTask[] = [];
  for (const anchor of anchors) batches.forEach((b, i) => tasks.push({ anchor, batchIndex: i, parts: b }));
  return tasks;
}

/**
 * The countries the per-store sweep covers, from POLL_COUNTRIES: unset or "" = none (opt-in: a new deploy never
 * starts polling 18 countries on its own), "all" = every country but the US, else a comma list ("ca,uk"); unknown
 * codes and "us" are ignored. Order follows INTL_CODES. Ramp up on the host: "ca,uk" first, watch the US sweep's
 * 541 share and round time for a day, then widen.
 */
export function parsePollCountries(raw: string | undefined): Exclude<CountryCode, "us">[] {
  if (raw === undefined || raw.trim() === "") return [];
  if (raw.trim().toLowerCase() === "all") return [...INTL_CODES];
  const want = new Set(raw.split(/[\s,]+/).map((x) => x.trim().toLowerCase()).filter((x) => isCountryCode(x) && x !== "us"));
  return INTL_CODES.filter((cc) => want.has(cc));
}

export interface IntlTaskOptions {
  /** Coverage anchors per country (default INTL_COVERAGE; `{}` = every store on its own, as before 2026-11-08). */
  anchors?: Partial<Record<CountryCode, CoverageAnchor[]>>;
  /** Stores to ask on their own as well, whatever the anchors cover (intlCoverage.ts: stores the anchors stopped returning). */
  direct?: Iterable<string>;
}

/**
 * One round of the other countries: each country's anchors by location (the nearest ≤12 stores each, the
 * country's 40 part numbers in two batches — 47 × 2 = 94 requests for all 18 countries), then `store=R###`
 * requests for the stores no anchor of that country lists (Chermside) and for `direct` stores. A task's batches
 * are adjacent, so a location is complete as early as possible within the round. Without a plan for a country,
 * every store of it is asked on its own.
 */
export function buildIntlTasks(countries: CountryCode[], opts: IntlTaskOptions = {}): SweepTask[] {
  const anchors = opts.anchors ?? INTL_COVERAGE;
  const direct = new Set(opts.direct ?? []);
  const tasks: SweepTask[] = [];
  for (const cc of countries) {
    if (cc === "us") continue;
    const batches = batchParts(partNumbersOf(cc));
    const plan = anchors[cc] ?? [];
    const covered = new Set(plan.flatMap((a) => a.covers));
    for (const anchor of plan) batches.forEach((b, i) => tasks.push({ anchor, batchIndex: i, parts: b, country: cc }));
    for (const s of storesOf(cc)) {
      if (covered.has(s.storeNumber) && !direct.has(s.storeNumber)) continue;
      const anchor: CoverageAnchor = { anchorStore: s.storeNumber, anchorName: s.name, location: `${cc}:${s.storeNumber}`, covers: [s.storeNumber] };
      batches.forEach((b, i) => tasks.push({ anchor, batchIndex: i, parts: b, country: cc, store: s.storeNumber }));
    }
  }
  return tasks;
}

/** The stores of `countries` the round is about (what a response may write; what coverage is judged against). */
export function intlStores(countries: CountryCode[]): Partial<Record<CountryCode, string[]>> {
  const out: Partial<Record<CountryCode, string[]>> = {};
  for (const cc of countries) if (cc !== "us") out[cc] = storesOf(cc).map((s) => s.storeNumber);
  return out;
}

/**
 * Confirm requests of the per-store round of other countries in flight at once, across rounds. A mass restock
 * there (a launch day) would otherwise start one confirm per response, outside INTL_CONCURRENCY.
 */
export const INTL_CONFIRM_CONCURRENCY = 8;
const intlConfirmGate = gate(INTL_CONFIRM_CONCURRENCY);
/**
 * Ingests of the per-store round of other countries running at once. The poller's database pool (8 connections)
 * is shared with the US sweep and the fast lane: without a bound, 12 intl workers could hold all of it. The
 * standby host runs only these, against the primary's database 17 ms away, so it sets more (poller.env).
 */
export const INTL_INGEST_CONCURRENCY = Number(process.env.INTL_INGEST_CONCURRENCY) || 4;
const intlIngestGate = gate(INTL_INGEST_CONCURRENCY);

/** A country whose round failed this much (any reason: 541, refused, timeouts, missing store) rests on its own. */
export const INTL_COUNTRY_FAIL_SHARE = 0.5;
const INTL_BACKOFF_MS = 60_000;
const INTL_BACKOFF_MAX_MS = 16 * 60_000;

/**
 * Pure: a country's rest after one round of the other countries. ≥ INTL_COUNTRY_FAIL_SHARE of its tasks failing
 * on the first pass → 60 s, doubling with each further bad round up to 16 min; a good round clears it (null).
 */
export function nextCountryBackoff(prev: { level: number } | undefined, round: { tasks: number; failed: number }, now: number): { level: number; until: number } | null {
  if (round.tasks === 0 || round.failed / round.tasks < INTL_COUNTRY_FAIL_SHARE) return null;
  const level = Math.min((prev?.level ?? 0) + 1, 10);
  return { level, until: now + Math.min(INTL_BACKOFF_MAX_MS, INTL_BACKOFF_MS * 2 ** (level - 1)) };
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
  /** full / degraded: the US anchor sweep. intl: the per-store round of other countries. */
  mode: "full" | "degraded" | "intl";
  host: string;
  /** Store numbers a response may write (default: the US stores; the intl round passes its own). */
  known?: Set<string>;
  /** Per-request timeout (default: 15 s for an anchor, 4.5 s for a single store). */
  timeoutMs?: number;
  /** Write a poll_log row for every request (default); false keeps failures only (the intl round). */
  logOk?: boolean;
  /** Called after each request (for metrics / adaptive pacing). */
  onResult?: (r: { task: SweepTask; status: number; ok: boolean; ms: number; label: string }) => void;
  /**
   * Retry each failed task once at the end of the sweep, through a fresh egress identity (default on).
   * 147 stores sit under a single anchor, so a failed request otherwise leaves half their phones a round
   * behind. Skipped when the first pass mostly failed or ran long: that is an outage, not a blip.
   */
  retryFailed?: boolean;
  /**
   * Ask a store again at once when a response shows a first "available" (fastlane.ts), instead of
   * waiting a round for the confirming observation. Default on; off on a budgeted spare egress.
   */
  confirm?: boolean;
}

/** Retry pass rules: only when failures are a minority and the first pass left time for it. */
export function shouldRetry(failed: number, tasks: number, firstPassMs: number): boolean {
  return failed > 0 && failed <= tasks / 2 && firstPassMs < 40_000;
}

/** One country's share of a per-store round (tasks carrying `country`); the poller backs off a country on it. */
export interface CountryRound {
  tasks: number;
  /** Tasks that failed on the first pass (any reason: HTTP error, timeout, refused connection, missing store). */
  failed: number;
  /** Tasks still without an answer after the round. */
  unresolved: number;
  throttled: number;
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
  /** Restocks committed by the instant confirm (a second ask of the store within the sweep). */
  confirmed: number;
  notified: { matched: number; sent: number; failed: number; skipped: number };
  durationMs: number;
  exhausted: boolean;
  /** Per country, for tasks that name one (the per-store round of other countries); absent on US sweeps. */
  byCountry?: Partial<Record<CountryCode, CountryRound>>;
  /**
   * Per-store requests only: the stores Apple answered "There is no store associated with this search" for
   * (store → country and Apple's message; not failures, see notOffered.ts) and the stores that answered with
   * themselves. Absent on US anchor sweeps.
   */
  pickup?: { notOffered: Record<string, { country: string; message: string }>; answered: string[] };
  /** Stores a location (anchor) request returned, sorted; what intlCoverage.ts judges drift on. */
  anchorCovered: string[];
  /** Anchor locations with a request still unanswered after the sweep (their stores are not judged for drift). */
  failedLocations: string[];
}

export async function runSweep(opts: SweepOptions): Promise<SweepSummary> {
  const id = randomUUID();
  const started = new Date();
  const tasks = opts.tasks ?? buildTasks();
  const concurrency = Math.max(1, opts.concurrency ?? 6);
  const d = db();
  await d.insert(schema.sweeps).values({ id, startedAt: started, mode: opts.mode, host: opts.host }).onConflictDoNothing();

  // A response may only write the stores this sweep is about (the US anchors never write another country).
  const known = opts.known ?? new Set(STORES.map((s) => s.storeNumber));
  const logOk = opts.logOk !== false;
  const covered = new Set<string>();
  const anchorCovered = new Set<string>();
  const recoveredTasks = new Set<SweepTask>();
  const allTransitions: Transition[] = [];
  const allEventIds: number[] = [];
  let requests = 0, failures = 0, throttled = 0, timeouts = 0, held = 0, confirmed = 0, exhausted = false;
  const logRows: (typeof schema.pollLog.$inferInsert)[] = [];

  let queue = tasks, cursor = 0;
  const failed: SweepTask[] = [];
  let retrying = false, recovered = 0;
  const intl = opts.mode === "intl";
  const byCountry: Partial<Record<CountryCode, CountryRound>> = {};
  const notOffered: Record<string, { country: string; message: string }> = {};
  const answered = new Set<string>();
  for (const t of tasks) if (t.country) (byCountry[t.country] ??= { tasks: 0, failed: 0, unresolved: 0, throttled: 0 }).tasks++;
  // The per-store round reports an error message once per round (one failing country would otherwise write the
  // same error_groups row a few hundred times a round); poll_log still has every failed request.
  const reported = new Set<string>();
  const report = async (message: string, sample: Record<string, unknown>) => {
    if (intl) { if (reported.has(message)) return; reported.add(message); }
    await recordError("poller", message, sample);
  };
  const worker = async () => {
    while (cursor < queue.length && !exhausted) {
      const task = queue[cursor++];
      const slot = await opts.egress.acquire();
      if (!slot) { exhausted = true; cursor--; break; }
      const t0 = Date.now();
      let res: PickupResponse | null = null;
      let err: string | undefined;
      try {
        res = task.store
          ? await fetchPickupAtStore(task.parts, task.store, slot.fetch, opts.timeoutMs ?? 4500, task.country ?? "us")
          : await fetchPickup(task.parts, task.anchor.location, slot.fetch, opts.timeoutMs ?? 15000, task.country ?? "us");
      } catch (e) {
        err = /abort/i.test(errorMessage(e)) ? `timed out after ${Math.round((Date.now() - t0) / 1000)} s` : errorMessage(e);
      }
      const ms = Date.now() - t0;
      const status = res?.httpStatus ?? 0;
      slot.release(status);
      requests++;
      let ok = Boolean(res?.ok);
      // Apple saying it offers no pickup lookups at this store is an answer, not a failure: not retried, not
      // logged, not counted against the country (notOffered.ts decides when to ask it again).
      const noStore = ok && Boolean(task.store) && isNoStoreAnswer(res!);
      if (noStore) notOffered[task.store!] = { country: task.country ?? "us", message: res!.message ?? "" };
      // Any other one-store request answered without that store (closed, renumbered, or Apple's answer changed) is
      // a failure: logged, retried, counted — never a silent "covered one store fewer" until the pairs expire.
      else if (ok && task.store && !res!.stores.some((s) => s.storeNumber === task.store)) { ok = false; err = "store missing from response"; }
      else if (ok && task.store) answered.add(task.store);
      const cr = task.country ? byCountry[task.country] : undefined;
      if (!ok) { failures++; if (!retrying) { failed.push(task); if (cr) { cr.failed++; cr.unresolved++; } } }
      else if (retrying) { recovered++; recoveredTasks.add(task); if (cr) cr.unresolved--; }
      if (status === 541 || status === 429 || status === 403) { throttled++; if (cr) cr.throttled++; }
      if (logOk || !ok) logRows.push({
        at: new Date(), sweepId: id, egress: slot.label, anchor: task.anchor.location, batch: task.batchIndex,
        httpStatus: status || null, ok, durationMs: ms, bytes: res?.bytes ?? null, storesSeen: res?.stores.length ?? null,
        error: err ?? res?.error ?? (noStore ? "pickup lookup not offered" : null),
        ...(task.country && task.country !== "us" ? { country: task.country } : {}),
      });
      opts.onResult?.({ task, status, ok, ms, label: slot.label });
      if (ok && res && !noStore) {
        try {
          const ingest = () => ingestStores(res.stores, id, new Date(), known);
          const r = await (intl ? intlIngestGate(ingest) : ingest());
          for (const s of res.stores) if (known.has(s.storeNumber)) { covered.add(s.storeNumber); if (!task.store) anchorCovered.add(s.storeNumber); }
          allTransitions.push(...r.transitions);
          allEventIds.push(...r.eventIds);
          held += r.held;
          // Notify immediately per response, but never hold the worker: push retries can take seconds.
          if (r.transitions.some((t) => t.kind === "restock")) {
            notifyJobs.push(notifyRestocks(r.transitions, r.eventIds).then((n) => { notified.matched += n.matched; notified.sent += n.sent; notified.failed += n.failed; notified.skipped += n.skipped; }).catch(() => undefined));
          }
          if (r.refuted.length) notifyJobs.push(logRefuted(id, r.refuted));
          // A first "available": ask that store again in a second rather than next round (alerts ~1–2 s
          // after the sighting instead of ~15 s), and a one-response blip is refuted on the spot.
          const firstAvailable = r.pending.filter((p) => p.status === "available");
          if (firstAvailable.length && opts.confirm !== false) {
            // Same timeout as the round's own requests (the poller's US sweep passes 6 s; without one, 4.5 s);
            // other countries share a bound on confirms in flight.
            const confirmOpts = { egress: opts.egress, label: id, known, notified, timeoutMs: opts.timeoutMs, ...(intl ? { gate: intlConfirmGate } : {}) };
            notifyJobs.push(confirmPendingRestocks(firstAvailable, confirmOpts).then((c) => { logRows.push(...c.rows); confirmed += c.confirmed; requests += c.requests; }).catch(() => undefined));
          }
        } catch (e) {
          await report(`ingest failed: ${errorMessage(e)}`, { anchor: task.anchor.location, batch: task.batchIndex });
        }
      } else if (err && !/http \d+/.test(err)) {
        // Timeouts are counted (poll_log, sweep summary) and only become an incident when they pile up.
        if (/timed out/.test(err)) timeouts++;
        else await report(`apple request failed: ${err}`, { anchor: task.anchor.location, egress: slot.label });
      }
    }
  };
  const notified = { matched: 0, sent: 0, failed: 0, skipped: 0 };
  const notifyJobs: Promise<void>[] = [];
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  const firstPassMs = Date.now() - started.getTime();
  const notAttempted = exhausted ? tasks.length - cursor : 0;
  // A country whose first pass mostly failed is having an outage, not a blip: its tasks are not retried (the
  // poller pauses it instead). US tasks name no country, so the US retry is exactly what it was.
  const retryable = failed.filter((t) => !t.country || byCountry[t.country]!.failed / byCountry[t.country]!.tasks < INTL_COUNTRY_FAIL_SHARE);
  if (exhausted) for (const t of tasks.slice(cursor)) if (t.country) byCountry[t.country]!.unresolved++;
  if (opts.retryFailed !== false && !exhausted && shouldRetry(failed.length, tasks.length, firstPassMs) && retryable.length) {
    queue = retryable; cursor = 0; retrying = true;
    await Promise.all(Array.from({ length: Math.min(concurrency, retryable.length) }, worker));
  }
  const unresolved = failed.length - recovered + notAttempted;
  // Anchor locations left without an answer: failed and not recovered by the retry pass, or never attempted.
  const failedLocations = new Set<string>();
  for (const t of [...failed, ...(exhausted ? tasks.slice(cursor) : [])]) if (!t.store && !recoveredTasks.has(t)) failedLocations.add(t.anchor.location);
  // Give in-flight alerts a moment to land in this sweep's numbers; stragglers finish in the background.
  await Promise.race([Promise.allSettled(notifyJobs), new Promise((r) => setTimeout(r, 5000))]);

  if (timeouts >= 3 && timeouts / Math.max(1, requests) >= 0.1) {
    await recordError("poller", `apple requests timing out: ${timeouts} of ${requests} in one ${opts.mode === "intl" ? "round of the other countries" : "sweep"}`, { host: opts.host, sweepId: id });
  }
  const finished = new Date();
  // poll_log in chunks
  for (let i = 0; i < logRows.length; i += 200) await d.insert(schema.pollLog).values(logRows.slice(i, i + 200));
  await d
    .update(schema.sweeps)
    .set({ finishedAt: finished, requests, failures, storesCovered: covered.size, transitions: allTransitions.length, durationMs: finished.getTime() - started.getTime() })
    .where((await import("drizzle-orm")).eq(schema.sweeps.id, id));
  return {
    id, requests, failures, recovered, unresolved, tasks: tasks.length, throttled, timeouts, storesCovered: covered.size, transitions: allTransitions.length + confirmed, held, confirmed, notified, durationMs: finished.getTime() - started.getTime(), exhausted,
    ...(Object.keys(byCountry).length ? { byCountry } : {}),
    ...(tasks.some((t) => t.store) ? { pickup: { notOffered, answered: [...answered].sort() } } : {}),
    anchorCovered: [...anchorCovered].sort(),
    failedLocations: [...failedLocations].sort(),
  };
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
