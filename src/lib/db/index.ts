import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";


let _db: NeonHttpDatabase<typeof schema> | null = null;

/** Lazy Neon-over-HTTP client (pooled DATABASE_URL). Safe to import at build time. */
export function db(): NeonHttpDatabase<typeof schema> {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  _db = drizzle(neon(url), { schema });
  return _db;
}

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export { schema };
