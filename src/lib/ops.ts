import { db, hasDatabase, schema } from "./db";

export type OpsSource = "poller" | "web" | "cron" | "worker";
export type OpsLevel = "debug" | "info" | "warn" | "error";

/** Append one operational event; never throws (logging must not break the caller). */
export async function logOps(source: OpsSource, level: OpsLevel, message: string, data?: Record<string, unknown>): Promise<void> {
  if (level !== "debug") console.log(`[ops:${source}] ${level}: ${message}`, data ? JSON.stringify(data).slice(0, 500) : "");
  if (!hasDatabase()) return;
  try {
    await db().insert(schema.opsLog).values({ source, level, message: message.slice(0, 500), data: data ?? null });
  } catch (e) {
    console.error("[ops] failed to log", e);
  }
}
