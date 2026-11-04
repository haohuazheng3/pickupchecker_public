#!/usr/bin/env node
/**
 * Applies drizzle/*.sql in order, once each (table `_migrations`), each file in one transaction.
 * Idempotent; skipped without a database URL so `next build` works anywhere. TLS rules match
 * src/lib/db (plain on loopback, otherwise verified against DATABASE_CA).
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url || url.includes("[SENSITIVE]")) {
  console.log("[migrate] no database URL — skipped");
  process.exit(0);
}
const dir = join(root, "drizzle");
if (!existsSync(dir)) { console.log("[migrate] no drizzle/ directory — skipped"); process.exit(0); }
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const host = new URL(url).hostname.replace(/^\[|\]$/g, "");
const local = ["localhost", "127.0.0.1", "::1"].includes(host);
const ca = process.env.DATABASE_CA?.replace(/\\n/g, "\n").trim() || undefined;
// The build runs this; on 11-04 a build failed because the server was out of ordinary connection slots
// (53300) for a moment. That passes in seconds, so wait it out (up to ~30 s) instead of failing the deploy.
let client;
for (let i = 0; ; i++) {
  client = new pg.Client({ connectionString: url, ssl: local ? false : { ca, rejectUnauthorized: true }, connectionTimeoutMillis: 15_000 });
  try {
    await client.connect();
    break;
  } catch (e) {
    await client.end().catch(() => {});
    if (e?.code !== "53300" || i >= 7) throw e;
    console.warn(`[migrate] database out of connection slots, retrying in ${1 + i} s`);
    await new Promise((r) => setTimeout(r, 1000 * (1 + i)));
  }
}
try {
  await client.query("CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  const done = new Set((await client.query("SELECT name FROM _migrations")).rows.map((r) => r.name));
  let applied = 0;
  for (const f of files) {
    if (done.has(f)) continue;
    const text = readFileSync(join(dir, f), "utf8");
    // drizzle-kit separates statements with "--> statement-breakpoint"
    const statements = text.split(/-->\s*statement-breakpoint/g).map((s) => s.trim()).filter(Boolean);
    await client.query("BEGIN");
    try {
      for (const s of statements) await client.query(s);
      await client.query("INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT DO NOTHING", [f]);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
    applied++;
    console.log(`[migrate] applied ${f} (${statements.length} statements)`);
  }
  console.log(`[migrate] up to date (${applied} new, ${files.length} total)`);
} finally {
  await client.end();
}
