import { Pool, type PoolConfig } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { attachDatabasePool } from "@vercel/functions";
import * as schema from "./schema";

let _db: NodePgDatabase<typeof schema> | null = null;

/**
 * Postgres on the poller host. One small pool per process, created on first use so importing at build
 * time never connects. On Vercel the pool is attached to the function instance, which then lives long
 * enough to close idle connections instead of freezing with them open.
 */
export function db(): NodePgDatabase<typeof schema> {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = new Pool(poolConfig(url));
  // An idle connection the server closed (idle_session_timeout, a restart): the pool drops it and dials anew.
  pool.on("error", (e) => console.error(`[db] idle connection closed: ${e.message}`));
  if (process.env.VERCEL) attachDatabasePool(pool);
  _db = drizzle(pool, { schema });
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
    max: Number(env.DATABASE_POOL_MAX) || (local ? 8 : 3),
    idleTimeoutMillis: local ? 30_000 : 5_000,
    connectionTimeoutMillis: 10_000,
    maxLifetimeSeconds: 600,
    keepAlive: true,
    ssl: local ? false : { ca, rejectUnauthorized: true },
  };
}

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export { schema };
