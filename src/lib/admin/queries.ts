import { desc, eq, gt, sql, and, isNull } from "drizzle-orm";
import { db, schema } from "../db";
import { readState } from "../stock/sweep";

export async function adminOverview() {
  const d = db();
  const hour = new Date(Date.now() - 3600_000);
  const day = new Date(Date.now() - 86400_000);
  const [heartbeat, config, watchdog, egress] = await Promise.all([
    readState<Record<string, unknown>>("heartbeat"), readState<Record<string, unknown>>("poller:config"), readState<Record<string, unknown>>("watchdog"), readState<Record<string, unknown>>("egress:vercel"),
  ]);
  const [reqHour] = await d.select({ n: sql<number>`count(*)::int`, ok: sql<number>`count(*) filter (where ok)::int`, s541: sql<number>`count(*) filter (where http_status = 541)::int`, avgMs: sql<number>`coalesce(avg(duration_ms),0)::int`, bytes: sql<number>`coalesce(sum(bytes),0)::bigint` }).from(schema.pollLog).where(gt(schema.pollLog.at, hour));
  const [reqDay] = await d.select({ n: sql<number>`count(*)::int`, ok: sql<number>`count(*) filter (where ok)::int`, s541: sql<number>`count(*) filter (where http_status = 541)::int` }).from(schema.pollLog).where(gt(schema.pollLog.at, day));
  const sweeps = await d.select().from(schema.sweeps).orderBy(desc(schema.sweeps.startedAt)).limit(30);
  const [subs] = await d.select({ active: sql<number>`count(*) filter (where status in ('active','trialing','past_due'))::int`, total: sql<number>`count(*)::int` }).from(schema.subscriptions);
  const [users] = await d.select({ n: sql<number>`count(*)::int`, day: sql<number>`count(*) filter (where created_at > ${day})::int` }).from(schema.users);
  const [watches] = await d.select({ n: sql<number>`count(*) filter (where active)::int` }).from(schema.watches);
  const [notes] = await d.select({ sent: sql<number>`count(*) filter (where status='sent' and created_at > ${day})::int`, failed: sql<number>`count(*) filter (where status='failed' and created_at > ${day})::int`, p50: sql<number>`coalesce(percentile_cont(0.5) within group (order by latency_ms) filter (where status='sent' and created_at > ${day}),0)::int` }).from(schema.notifications);
  const [stock] = await d.select({ available: sql<number>`count(*) filter (where status='available')::int`, unknown: sql<number>`count(*) filter (where status='unknown')::int`, total: sql<number>`count(*)::int`, oldest: sql<Date | null>`min(last_checked_at)`, newest: sql<Date | null>`max(last_checked_at)` }).from(schema.storeSkuStatus);
  const [events] = await d.select({ restocks: sql<number>`count(*) filter (where kind='restock' and at > ${day})::int`, soldout: sql<number>`count(*) filter (where kind='soldout' and at > ${day})::int` }).from(schema.availabilityEvents);
  const errors = await d.select().from(schema.errorGroups).where(isNull(schema.errorGroups.resolvedAt)).orderBy(desc(schema.errorGroups.lastSeenAt)).limit(50);
  const [errCount] = await d.select({ n: sql<number>`count(*)::int` }).from(schema.errorGroups).where(and(isNull(schema.errorGroups.resolvedAt), gt(schema.errorGroups.lastSeenAt, day)));
  return { heartbeat, config, watchdog, egress, reqHour, reqDay, sweeps, subs, users, watches, notes, stock, events, errors, errCount: errCount?.n ?? 0 };
}

/** Per-anchor freshness: last successful request per anchor zip and its failure share in the last hour. */
export async function anchorHealth() {
  const d = db();
  const hour = new Date(Date.now() - 3600_000);
  return d
    .select({ anchor: schema.pollLog.anchor, last: sql<Date | null>`max(at) filter (where ok)`, n: sql<number>`count(*)::int`, bad: sql<number>`count(*) filter (where not ok)::int`, avgMs: sql<number>`coalesce(avg(duration_ms),0)::int` })
    .from(schema.pollLog)
    .where(gt(schema.pollLog.at, hour))
    .groupBy(schema.pollLog.anchor)
    .orderBy(schema.pollLog.anchor);
}

export async function recentPollLog(limit = 100, onlyFailures = false) {
  const d = db();
  if (onlyFailures) return d.select().from(schema.pollLog).where(eq(schema.pollLog.ok, false)).orderBy(desc(schema.pollLog.at)).limit(limit);
  return d.select().from(schema.pollLog).orderBy(desc(schema.pollLog.at)).limit(limit);
}

export async function recentNotifications(limit = 50) {
  return db().select({ n: schema.notifications, email: schema.users.email }).from(schema.notifications).leftJoin(schema.users, eq(schema.users.id, schema.notifications.userId)).orderBy(desc(schema.notifications.createdAt)).limit(limit);
}

export async function recentUsers(limit = 50) {
  return db().select({ u: schema.users, subs: sql<number>`(select count(*) from subscriptions s where s.user_id = ${schema.users.id} and s.status in ('active','trialing','past_due'))::int`, watches: sql<number>`(select count(*) from watches w where w.user_id = ${schema.users.id} and w.active)::int` }).from(schema.users).orderBy(desc(schema.users.createdAt)).limit(limit);
}

export async function inbox(limit = 30) {
  return db().select().from(schema.inboxMessages).orderBy(desc(schema.inboxMessages.receivedAt)).limit(limit);
}

export async function contacts(limit = 30) {
  return db().select().from(schema.contactMessages).orderBy(desc(schema.contactMessages.createdAt)).limit(limit);
}

export async function resolveError(fingerprint: string) {
  await db().update(schema.errorGroups).set({ resolvedAt: new Date() }).where(eq(schema.errorGroups.fingerprint, fingerprint));
}
