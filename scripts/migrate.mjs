#!/usr/bin/env node
/**
 * Applies drizzle/*.sql in order, once each (table `_migrations`). Idempotent; skipped without a
 * database URL so `next build` works anywhere. Uses the unpooled URL when available.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url || url.includes("[SENSITIVE]")) {
  console.log("[migrate] no database URL — skipped");
  process.exit(0);
}
const dir = join(root, "drizzle");
if (!existsSync(dir)) { console.log("[migrate] no drizzle/ directory — skipped"); process.exit(0); }
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const sql = neon(url);
await sql`CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
const done = new Set((await sql`SELECT name FROM _migrations`).map((r) => r.name));
let applied = 0;
for (const f of files) {
  if (done.has(f)) continue;
  const text = readFileSync(join(dir, f), "utf8");
  // drizzle-kit separates statements with "--> statement-breakpoint"
  const statements = text.split(/-->\s*statement-breakpoint/g).map((s) => s.trim()).filter(Boolean);
  for (const s of statements) await sql.query(s);
  await sql`INSERT INTO _migrations (name) VALUES (${f}) ON CONFLICT DO NOTHING`;
  applied++;
  console.log(`[migrate] applied ${f} (${statements.length} statements)`);
}
console.log(`[migrate] up to date (${applied} new, ${files.length} total)`);
