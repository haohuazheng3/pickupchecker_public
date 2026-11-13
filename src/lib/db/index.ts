import { Pool, type PoolClient, type PoolConfig } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { attachDatabasePool } from "@vercel/functions";
import * as schema from "./schema";

let _db: NodePgDatabase<typeof schema> | null = null;
let _router: FailoverPool | null = null;

/**
 * Postgres on the poller hosts. One small pool per database per process, created on first use so importing at
 * build time never connects. On Vercel the pools are attached to the function instance, which then lives long
 * enough to close idle connections instead of freezing with them open.
 *
 * Two databases when DATABASE_URL_STANDBY is set (docs/architecture.md「热备主机」): the primary and its streaming
 * replica on the second host. Every query goes to the one that is the cluster's primary right now (chooseTarget);
 * after a takeover that is the promoted replica, with no redeploy and no DNS change.
 */
export function db(): NodePgDatabase<typeof schema> {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const targets: { name: DbTargetName; url: string }[] = [{ name: "primary", url }];
  if (process.env.DATABASE_URL_STANDBY) targets.push({ name: "standby", url: process.env.DATABASE_URL_STANDBY });
  const pools = targets.map((t) => {
    const pool = new Pool(poolConfig(t.url));
    // An idle connection the server closed (idle_session_timeout, a restart): the pool drops it and dials anew.
    pool.on("error", (e) => console.error(`[db] ${t.name}: idle connection closed: ${e.message}`));
    if (process.env.VERCEL) attachDatabasePool(pool);
    return { name: t.name, pool };
  });
  _router = pools.length > 1 ? new FailoverPool(pools) : null;
  // FailoverPool implements what drizzle uses of a Pool (query, connect); the cast is only for the type.
  _db = drizzle(_router ? (_router as unknown as Pool) : pools[0].pool, { schema });
  return _db;
}

/**
 * Loopback (the poller, next to the database) is plain; anything else is TLS verified against our own CA
 * (DATABASE_CA, PEM; "\n" escapes allowed) — without it the system roots are used and the handshake fails
 * closed rather than falling back to an unverified connection.
 */
export function poolConfig(url: string, env: Record<string, string | undefined> = process.env): PoolConfig {
  const host = new URL(url).hostname.replace(/^\[|\]$/g, "");
  const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
  const ca = env.DATABASE_CA?.replace(/\\n/g, "\n").trim() || undefined;
  return {
    connectionString: url,
    // Remote = the site on Vercel (the poller hosts set DATABASE_POOL_MAX). 2, not 3: every warm function instance
    // keeps its pool, and on 11-04 ~20 instances × 3 + the pollers' 19 left 6 of the 87 ordinary slots free; the
    // two deploys that day doubled the fleet for a few minutes and ~1,500 page queries got 53300 (too many clients).
    max: Number(env.DATABASE_POOL_MAX) || (local ? 8 : 2),
    idleTimeoutMillis: local ? 30_000 : 5_000,
    connectionTimeoutMillis: 10_000,
    maxLifetimeSeconds: 600,
    keepAlive: true,
    // Nothing should wait forever: a page query that hangs holds a function open, a poller one stalls the sweep.
    statement_timeout: local ? 30_000 : 15_000,
    ssl: local ? false : { ca, rejectUnauthorized: true },
  };
}

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/* ---------------- failover between the primary and the standby ---------------- */

export type DbTargetName = "primary" | "standby";

/** What one database says about itself (probe query below). */
export interface DbProbe {
  name: DbTargetName;
  ok: boolean;
  ms: number;
  /** pg_is_in_recovery(): true on a streaming replica. */
  recovery: boolean | null;
  /** The server's own host label (postgresql.conf pickupchecker.host). */
  host: string | null;
  /** poller_state "cluster": which host is the primary, and the takeover count. */
  owner: string | null;
  epoch: number;
  error?: string;
}

/**
 * Pure: which database queries go to. Writable and calling itself the primary beats everything, the highest
 * epoch first (a takeover bumps it, so a promoted standby wins over an old primary that came back); an old
 * primary that has learnt it was replaced says so (owner ≠ its own host) and is never chosen. With no writable
 * database, a reachable one serves reads (the replica while the takeover is decided); null when none answers.
 */
export function chooseTarget(probes: DbProbe[]): { index: number; writable: boolean } | null {
  let best = -1;
  probes.forEach((p, i) => {
    if (!p.ok || p.recovery !== false) return;
    if (p.owner && p.host && p.owner !== p.host) return;
    if (best < 0 || p.epoch > probes[best].epoch) best = i;
  });
  if (best >= 0) return { index: best, writable: true };
  const readable = probes.findIndex((p) => p.ok);
  return readable >= 0 ? { index: readable, writable: false } : null;
}

/**
 * Pure: where writes go after a probe round. Normally the database that serves reads. When no writable database
 * answered in time, reads move to the replica, but writes stay on the last database that was the primary: a write
 * can only succeed there. On 2026-11-12 the overloaded primary missed the 2 s probe in waves for hours (about 400
 * switches to the replica between 17:30 and 23:15 UTC), and every write an instance made during a wave went to the
 * replica and failed with 25006 (ten members' account pages). The previous writer is dropped only when it answers
 * and is no longer the primary (a replica, or fenced: owner ≠ its own host).
 */
export function nextWriter(probes: DbProbe[], choice: { index: number; writable: boolean } | null, writer: number | null): number | null {
  if (choice?.writable) return choice.index;
  if (writer == null) return null;
  const p = probes[writer];
  if (p?.ok && (p.recovery !== false || Boolean(p.owner && p.host && p.owner !== p.host))) return null;
  return writer;
}

/**
 * Pure: whether a statement needs the writable database. Only a plain read counts as a read; anything else
 * (insert/update/delete, DDL, SET, a writing CTE, a locking or sequence-advancing select, an unknown shape) is a
 * write. A read misjudged as a write merely runs on the primary; a write misjudged as a read fails on the replica
 * with 25006 and is retried on the writer (FailoverPool.query).
 */
export function isWriteSql(text: string): boolean {
  const s = text.replace(/^(?:\s|--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/|\()*/, "").toLowerCase();
  if (/^(?:select|values|table|show|explain)\b/.test(s)) {
    return /\bfor\s+(?:no\s+key\s+update|update|key\s+share|share)\b|\b(?:nextval|setval|pg_advisory_(?:xact_)?lock|pg_notify)\s*\(/.test(s);
  }
  if (/^with\b/.test(s)) return /\b(?:insert\s+into|delete\s+from|merge\s+into)\b|\bupdate\s+[\w."]+(?:\s+(?:as\s+)?\w+)?\s+set\b/.test(s);
  return true;
}

/** The statement text of a pg query call (a string, or drizzle's { text, ... } config). */
function queryText(first: unknown): string {
  if (typeof first === "string") return first;
  const text = (first as { text?: unknown } | null)?.text;
  return typeof text === "string" ? text : "";
}

/** A write that reached a database refusing writes (a replica, or a fenced old primary). */
export function isReadOnlyError(e: unknown): boolean {
  const err = e as { code?: string; message?: string };
  return err?.code === "25006" || /read-only transaction/i.test(err?.message ?? "");
}

/** Errors after which the choice is re-made and the query tried once more. */
export function isFailoverError(e: unknown): boolean {
  const err = e as { code?: string; message?: string };
  const code = err?.code ?? "";
  if (["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EHOSTUNREACH", "ECONNRESET", "EPIPE", "57P01", "57P02", "57P03", "25006", "08006", "08001", "08004"].includes(code)) return true;
  return /Connection terminated|timeout exceeded when trying to connect|read-only transaction|the database system is (starting up|shutting down|in recovery mode)/i.test(err?.message ?? "");
}

/**
 * The server is out of connection slots (53300: max_connections, or only the slots reserved for the poller role
 * are left). It passes in seconds as other instances' idle connections close, so it is waited out, not failed.
 */
export function isBusyError(e: unknown): boolean {
  const err = e as { code?: string; message?: string };
  return err?.code === "53300" || /too many clients|remaining connection slots are reserved/i.test(err?.message ?? "");
}

/** Waits before each retry of a query refused for want of a slot: about 3.5 s in all, then the error stands. */
export const BUSY_BACKOFF_MS = [250, 750, 1_000, 1_500];

/** Runs `run`, retrying a busy refusal after each BUSY_BACKOFF_MS wait (exported for the test). */
export async function waitOutBusy<T>(run: () => Promise<T>, backoff: number[] = BUSY_BACKOFF_MS, sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await run();
    } catch (e) {
      if (!isBusyError(e) || i >= backoff.length) throw e;
      await sleep(backoff[i]);
    }
  }
}

const PROBE_SQL = `select pg_is_in_recovery() as recovery, current_setting('pickupchecker.host', true) as host,
  (select value from poller_state where key = 'cluster') as cluster`;
/** How long a choice stands before it is checked again in the background. */
const PROBE_TTL_MS = 15_000;
const PROBE_TIMEOUT_MS = 2_000;
/**
 * A write while reads sit on the replica and no primary is known yet (a fresh instance that came up during a slow
 * spell) waits this long for one to answer, instead of being sent to the replica to fail.
 */
const WRITER_PROBE_TIMEOUT_MS = 10_000;

async function probe(name: DbTargetName, pool: Pool, timeoutMs = PROBE_TIMEOUT_MS): Promise<DbProbe> {
  const t0 = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const r = await Promise.race([
      pool.query(PROBE_SQL),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`no answer in ${timeoutMs} ms`)), timeoutMs); }),
    ]).finally(() => clearTimeout(timer));
    const row = r.rows[0] as { recovery: boolean; host: string | null; cluster: { primary?: string; epoch?: number } | null };
    return { name, ok: true, ms: Date.now() - t0, recovery: row.recovery, host: row.host || null, owner: row.cluster?.primary ?? null, epoch: Number(row.cluster?.epoch ?? 0) };
  } catch (e) {
    return { name, ok: false, ms: Date.now() - t0, recovery: null, host: null, owner: null, epoch: -1, error: (e as Error).message };
  }
}

/**
 * Looks like a pg Pool to drizzle (its transactions check the constructor name and call connect()), and sends
 * each query to the database chooseTarget picked. A choice stands for PROBE_TTL_MS, then is re-checked in the
 * background; a connection-level error re-checks at once and retries the query once.
 *
 * Reads and writes part ways only while no writable database answers the probe: reads go to the replica (pages
 * keep rendering and the struggling primary sheds load), writes stay on the last primary (nextWriter), or wait up
 * to WRITER_PROBE_TIMEOUT_MS for one when none is known yet. Transactions (connect) count as writes.
 */
export class FailoverPool {
  private probes: DbProbe[] = [];
  private choice: { index: number; writable: boolean } | null = null;
  private writer: number | null = null;
  private checkedAt = 0;
  private pending: Promise<void> | null = null;
  private writerPending: Promise<void> | null = null;
  constructor(
    readonly targets: { name: DbTargetName; pool: Pool }[],
    private readonly timing: { probeMs?: number; writerProbeMs?: number } = {},
  ) {}

  private refresh(): Promise<void> {
    this.pending ??= Promise.all(this.targets.map((t) => probe(t.name, t.pool, this.timing.probeMs))).then((probes) => {
      const before = this.choice?.index;
      this.probes = probes;
      this.choice = chooseTarget(probes);
      this.writer = nextWriter(probes, this.choice, this.writer);
      this.checkedAt = Date.now();
      if (before != null && this.choice && before !== this.choice.index) {
        const writes = !this.choice.writable && this.writer != null ? `; writes stay on the ${this.targets[this.writer].name}` : "";
        console.warn(`[db] now using the ${this.targets[this.choice.index].name} database (${this.choice.writable ? "writable" : "read-only"})${writes}`);
      }
    }).finally(() => { this.pending = null; });
    return this.pending;
  }

  /** No primary known while reads sit on a replica: probe again with the long timeout (only writes wait for this). */
  private findWriter(): Promise<void> {
    this.writerPending ??= Promise.all(this.targets.map((t) => probe(t.name, t.pool, this.timing.writerProbeMs ?? WRITER_PROBE_TIMEOUT_MS))).then((probes) => {
      const found = chooseTarget(probes);
      if (found?.writable) this.writer = found.index;
    }).finally(() => { this.writerPending = null; });
    return this.writerPending;
  }

  private async ensureChoice(): Promise<void> {
    if (!this.choice) await this.refresh();
    else if (Date.now() - this.checkedAt > PROBE_TTL_MS) void this.refresh();
  }

  private noneAnswers(): Error {
    return new Error(`no database answers: ${this.probes.map((p) => `${p.name} ${p.error ?? "?"}`).join("; ")}`);
  }

  private async pool(): Promise<Pool> {
    await this.ensureChoice();
    if (!this.choice) throw this.noneAnswers();
    return this.targets[this.choice.index].pool;
  }

  private async writerPool(): Promise<Pool> {
    await this.ensureChoice();
    if (this.choice?.writable) return this.targets[this.choice.index].pool;
    if (this.writer == null) await this.findWriter();
    if (this.writer != null) return this.targets[this.writer].pool;
    // Nothing writable answered even with the long wait: as before, the replica answers (and refuses a write).
    if (!this.choice) throw this.noneAnswers();
    return this.targets[this.choice.index].pool;
  }

  async query(...args: unknown[]): Promise<unknown> {
    const write = isWriteSql(queryText(args[0]));
    const run = (toWriter: boolean) => waitOutBusy(async () => (await (toWriter ? this.writerPool() : this.pool())).query(...(args as Parameters<Pool["query"]>)));
    try {
      return await run(write);
    } catch (e) {
      if (!isFailoverError(e)) throw e;
      await this.refresh();
      // A statement taken for a read that writes (a writing function in a select) fails on the replica: writer now.
      return run(write || isReadOnlyError(e));
    }
  }

  async connect(): Promise<PoolClient> {
    return waitOutBusy(async () => (await this.writerPool()).connect());
  }

  recheck(): Promise<void> {
    return this.refresh();
  }

  /** The latest probes and choice (health checks; triggers a probe when none was made yet). */
  async status(): Promise<{ probes: DbProbe[]; using: DbTargetName | null; writable: boolean }> {
    if (!this.choice || Date.now() - this.checkedAt > PROBE_TTL_MS) await this.refresh();
    return { probes: this.probes, using: this.choice ? this.targets[this.choice.index].name : null, writable: Boolean(this.choice?.writable) };
  }

}

/** One database by name, bypassing the choice (the standby's takeover and the old primary's fence need exactly that one). */
export function targetPool(name: DbTargetName): Pool | null {
  db();
  return _router?.targets.find((t) => t.name === name)?.pool ?? null;
}

/** Make every query re-check which database is the primary now (after a promotion or a fence). */
export async function recheckDatabases(): Promise<void> {
  if (_router) await _router.recheck();
}

/** Both databases as this process sees them; null with a single database configured. */
export async function dbStatus(): Promise<Awaited<ReturnType<FailoverPool["status"]>> | null> {
  db();
  return _router ? _router.status() : null;
}

export { schema };
