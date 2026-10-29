import { sql } from "drizzle-orm";
import { db, hasDatabase, schema } from "./db";

/** Fixed-window limiter in Postgres (no extra service). Returns true when allowed. */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (!hasDatabase()) return true;
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  const rows = await db()
    .insert(schema.rateLimits)
    .values({ key, count: 1, resetAt })
    .onConflictDoUpdate({
      target: schema.rateLimits.key,
      set: {
        count: sql`CASE WHEN ${schema.rateLimits.resetAt} < ${now} THEN 1 ELSE ${schema.rateLimits.count} + 1 END`,
        resetAt: sql`CASE WHEN ${schema.rateLimits.resetAt} < ${now} THEN ${resetAt} ELSE ${schema.rateLimits.resetAt} END`,
      },
    })
    .returning({ count: schema.rateLimits.count });
  return (rows[0]?.count ?? 0) <= limit;
}

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}
