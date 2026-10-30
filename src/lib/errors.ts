import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db, hasDatabase, schema } from "./db";

/**
 * Error inbox: every failure the site or poller hits is grouped by fingerprint and counted,
 * so the admin dashboard shows "what is broken, how often, since when" instead of raw logs.
 */
export async function recordError(
  source: "web" | "poller" | "worker",
  message: string,
  sample?: Record<string, unknown>,
): Promise<void> {
  try {
    console.error(`[${source}] ${message}`, sample ? JSON.stringify(sample).slice(0, 2000) : "");
    if (!hasDatabase()) return;
    const normalized = message.replace(/\d+/g, "#").slice(0, 300);
    const fingerprint = createHash("sha1").update(`${source}:${normalized}`).digest("hex").slice(0, 24);
    await db()
      .insert(schema.errorGroups)
      .values({ fingerprint, source, message: message.slice(0, 1000), sample: sample ?? null, count: 1 })
      .onConflictDoUpdate({
        target: schema.errorGroups.fingerprint,
        set: {
          count: sql`${schema.errorGroups.count} + 1`,
          lastSeenAt: new Date(),
          sample: sample ?? null,
          resolvedAt: null,
        },
      });
  } catch (e) {
    console.error("[errors] failed to record error", e);
  }
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) {
    // Drizzle wraps driver errors as "Failed query: <sql>"; the reason lives in .cause — put it first.
    const cause = (e as { cause?: unknown }).cause;
    if (cause instanceof Error && cause.message && !e.message.includes(cause.message)) {
      const head = e.message.startsWith("Failed query:") ? "Failed query" : e.message;
      return `${head}: ${cause.message}${e.message.startsWith("Failed query:") ? ` — ${e.message.slice(14, 160)}` : ""}`;
    }
    return e.message;
  }
  return typeof e === "string" ? e : JSON.stringify(e);
}
