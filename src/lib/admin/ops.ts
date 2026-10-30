/**
 * Admin data: time-bucketed series for the charts and health strips, the health snapshot, and
 * filtered/paginated log readers. Every query is bounded (time window or limit).
 */
import { and, desc, eq, gt, isNull, sql, type SQL } from "drizzle-orm";
import { db, schema } from "../db";
import { readState } from "../stock/sweep";
import { stripePermissions } from "./stripeCheck";
import { env } from "../env";
import { STORES, PART_INDEX, MODELS, modelKeyFor, type ModelKey } from "../apple/catalog";
import type { HealthSnapshot, Heartbeat } from "./health";

/* ------------------------------------------------------------------ buckets */

export interface Bucket { t: string; [k: string]: number | string }

function bucketOf(col: SQL | unknown, sec: number): SQL {
  // sec is inlined (not a bind parameter) so the SELECT and GROUP BY expressions are textually equal.
  return sql`to_timestamp(floor(extract(epoch from ${col}) / ${sql.raw(String(sec))}) * ${sql.raw(String(sec))})`;
}

/** Fills missing buckets with zeros so charts show gaps as gaps. */
export function fillBuckets(rows: ({ t: string | Date } & Record<string, unknown>)[], hours: number, sec: number, keys: string[], now = Date.now()): Bucket[] {
  const start = Math.floor((now - hours * 3600_000) / (sec * 1000)) * sec * 1000;
  const byT = new Map(rows.map((r) => [Math.floor(new Date(r.t).getTime() / (sec * 1000)) * sec * 1000, r]));
  const out: Bucket[] = [];
  for (let t = start; t <= now; t += sec * 1000) {
    const r = byT.get(t) as Record<string, unknown> | undefined;
    const b: Bucket = { t: new Date(t).toISOString() };
    for (const k of keys) b[k] = Number(r?.[k] ?? 0);
    out.push(b);
  }
  return out;
}

export async function requestBuckets(hours = 6, sec = 300) {
  const since = new Date(Date.now() - hours * 3600_000);
  const t = bucketOf(schema.pollLog.at, sec);
  const rows = await db()
    .select({
      t,
      n: sql<number>`count(*)::int`,
      ok: sql<number>`count(*) filter (where ok)::int`,
      s541: sql<number>`count(*) filter (where http_status = 541)::int`,
      other: sql<number>`count(*) filter (where not ok and coalesce(http_status, 0) <> 541)::int`,
      avgMs: sql<number>`coalesce(avg(duration_ms), 0)::int`,
      bytes: sql<number>`coalesce(sum(bytes), 0)::bigint`,
    })
    .from(schema.pollLog)
    .where(gt(schema.pollLog.at, since))
    .groupBy(t)
    .orderBy(t);
  return fillBuckets(rows.map((r) => ({ ...r, t: r.t as unknown as string })), hours, sec, ["n", "ok", "s541", "other", "avgMs", "bytes"]);
}

export async function sweepBuckets(hours = 6, sec = 300) {
  const since = new Date(Date.now() - hours * 3600_000);
  const t = bucketOf(schema.sweeps.startedAt, sec);
  const rows = await db()
    .select({
      t,
      n: sql<number>`count(*)::int`,
      avgMs: sql<number>`coalesce(avg(duration_ms), 0)::int`,
      maxMs: sql<number>`coalesce(max(duration_ms), 0)::int`,
      stores: sql<number>`coalesce(avg(stores_covered), 0)::int`,
      transitions: sql<number>`coalesce(sum(transitions), 0)::int`,
      failures: sql<number>`coalesce(sum(failures), 0)::int`,
      degraded: sql<number>`count(*) filter (where mode = 'degraded')::int`,
    })
    .from(schema.sweeps)
    .where(gt(schema.sweeps.startedAt, since))
    .groupBy(t)
    .orderBy(t);
  return fillBuckets(rows.map((r) => ({ ...r, t: r.t as unknown as string })), hours, sec, ["n", "avgMs", "maxMs", "stores", "transitions", "failures", "degraded"]);
}

export async function eventBuckets(hours = 24, sec = 3600) {
  const since = new Date(Date.now() - hours * 3600_000);
  const t = bucketOf(schema.availabilityEvents.at, sec);
  const rows = await db()
    .select({ t, restocks: sql<number>`count(*) filter (where kind = 'restock')::int`, soldouts: sql<number>`count(*) filter (where kind = 'soldout')::int` })
    .from(schema.availabilityEvents)
    .where(gt(schema.availabilityEvents.at, since))
    .groupBy(t)
    .orderBy(t);
  return fillBuckets(rows.map((r) => ({ ...r, t: r.t as unknown as string })), hours, sec, ["restocks", "soldouts"]);
}

export async function alertBuckets(hours = 24, sec = 3600) {
  const since = new Date(Date.now() - hours * 3600_000);
  const t = bucketOf(schema.notifications.createdAt, sec);
  const rows = await db()
    .select({
      t,
      pushSent: sql<number>`count(*) filter (where channel = 'push' and status = 'sent')::int`,
      emailSent: sql<number>`count(*) filter (where channel = 'email' and status = 'sent')::int`,
      failed: sql<number>`count(*) filter (where status = 'failed')::int`,
    })
    .from(schema.notifications)
    .where(gt(schema.notifications.createdAt, since))
    .groupBy(t)
    .orderBy(t);
  return fillBuckets(rows.map((r) => ({ ...r, t: r.t as unknown as string })), hours, sec, ["pushSent", "emailSent", "failed"]);
}

export async function cronBuckets(hours = 24, sec = 300) {
  const since = new Date(Date.now() - hours * 3600_000);
  const t = bucketOf(schema.opsLog.at, sec);
  const rows = await db()
    .select({ t, ticks: sql<number>`count(*)::int`, degraded: sql<number>`count(*) filter (where (data->>'degraded') = 'true')::int` })
    .from(schema.opsLog)
    .where(and(gt(schema.opsLog.at, since), eq(schema.opsLog.source, "cron"), eq(schema.opsLog.message, "watchdog tick")))
    .groupBy(t)
    .orderBy(t);
  return fillBuckets(rows.map((r) => ({ ...r, t: r.t as unknown as string })), hours, sec, ["ticks", "degraded"]);
}

/* ------------------------------------------------------------------ health snapshot */

export async function healthSnapshot(): Promise<HealthSnapshot> {
  const d = db();
  const now = Date.now();
  const m15 = new Date(now - 15 * 60_000), hour = new Date(now - 3600_000), day = new Date(now - 86400_000), m30 = new Date(now - 30 * 60_000);
  let dbLatencyMs: number | null = null, dbError: string | null = null;
  try { const t0 = Date.now(); await d.execute(sql`select 1`); dbLatencyMs = Date.now() - t0; } catch (e) { dbError = e instanceof Error ? e.message : String(e); }
  const [heartbeat, watchdog] = await Promise.all([readState<Heartbeat>("heartbeat"), readState<{ down?: boolean; since?: string }>("watchdog")]);
  const [req15] = await d.select({ n: sql<number>`count(*)::int`, ok: sql<number>`count(*) filter (where ok)::int`, s541: sql<number>`count(*) filter (where http_status = 541)::int`, avgMs: sql<number>`coalesce(avg(duration_ms),0)::int` }).from(schema.pollLog).where(gt(schema.pollLog.at, m15));
  const [reqHour] = await d.select({ n: sql<number>`count(*)::int`, ok: sql<number>`count(*) filter (where ok)::int`, s541: sql<number>`count(*) filter (where http_status = 541)::int`, avgMs: sql<number>`coalesce(avg(duration_ms),0)::int` }).from(schema.pollLog).where(gt(schema.pollLog.at, hour));
  const [stock] = await d.select({
    total: sql<number>`count(*)::int`, available: sql<number>`count(*) filter (where status='available')::int`, unknown: sql<number>`count(*) filter (where status='unknown')::int`,
    newest: sql<string | null>`max(last_checked_at)`, storesChecked: sql<number>`count(distinct store_number) filter (where last_checked_at is not null)::int`,
    storesStale: sql<number>`count(distinct store_number) filter (where last_checked_at is null or last_checked_at < ${m30})::int`,
  }).from(schema.storeSkuStatus);
  const [alerts24] = await d.select({
    sent: sql<number>`count(*) filter (where status='sent')::int`, failed: sql<number>`count(*) filter (where status='failed')::int`,
    pushSent: sql<number>`count(*) filter (where status='sent' and channel='push')::int`, emailSent: sql<number>`count(*) filter (where status='sent' and channel='email')::int`,
    lastSentAt: sql<string | null>`max(created_at) filter (where status='sent')`, lastFailedAt: sql<string | null>`max(created_at) filter (where status='failed')`,
  }).from(schema.notifications).where(gt(schema.notifications.createdAt, day));
  const [push] = await d.select({ enabled: sql<number>`count(*) filter (where disabled_at is null)::int`, disabled: sql<number>`count(*) filter (where disabled_at is not null)::int`, lastSentAt: sql<string | null>`max(last_sent_at)` }).from(schema.pushSubscriptions);
  const [email] = await d.select({ lastSentAt: sql<string | null>`max(created_at) filter (where status='sent' and channel='email')`, lastFailedAt: sql<string | null>`max(created_at) filter (where status='failed' and channel='email')` }).from(schema.notifications);
  const [stripe] = await d.select({ lastEventAt: sql<string | null>`max(received_at)`, lastEventType: sql<string | null>`(array_agg(type order by received_at desc))[1]` }).from(schema.stripeEvents);
  const [subs] = await d.select({ active: sql<number>`count(*) filter (where status in ('active','trialing','past_due'))::int` }).from(schema.subscriptions);
  const [cron] = await d.select({ lastTickAt: sql<string | null>`max(at)`, ticksHour: sql<number>`count(*) filter (where at > ${hour})::int` }).from(schema.opsLog).where(and(eq(schema.opsLog.source, "cron"), eq(schema.opsLog.message, "watchdog tick"), gt(schema.opsLog.at, day)));
  const [inboxRow] = await d.select({ lastAt: sql<string | null>`max(received_at)` }).from(schema.inboxMessages);
  // The key's permissions, probed live (cached ten minutes). Runs before the error count: a passing probe
  // resolves error groups a missing permission left behind.
  const perms = await stripePermissions().catch(() => null);
  const missingPermission = perms?.missing[0] ?? null;
  const [errors24] = await d.select({ open: sql<number>`count(*)::int`, lastAt: sql<string | null>`max(last_seen_at)` }).from(schema.errorGroups).where(and(isNull(schema.errorGroups.resolvedAt), gt(schema.errorGroups.lastSeenAt, day)));
  const toIso = (v: string | Date | null | undefined) => (v ? new Date(v).toISOString() : null);
  return {
    now,
    heartbeat: heartbeat?.value ?? null,
    heartbeatUpdatedAt: heartbeat ? heartbeat.updatedAt.toISOString() : null,
    watchdog: watchdog?.value ?? null,
    dbLatencyMs, dbError,
    req15: req15 ?? { n: 0, ok: 0, s541: 0, avgMs: 0 },
    reqHour: reqHour ?? { n: 0, ok: 0, s541: 0, avgMs: 0 },
    stock: { total: stock?.total ?? 0, available: stock?.available ?? 0, unknown: stock?.unknown ?? 0, newest: toIso(stock?.newest), storesChecked: stock?.storesChecked ?? 0, storesStale: stock?.storesStale ?? 0 },
    storesTotal: STORES.length,
    alerts24: { sent: alerts24?.sent ?? 0, failed: alerts24?.failed ?? 0, pushSent: alerts24?.pushSent ?? 0, emailSent: alerts24?.emailSent ?? 0, lastSentAt: toIso(alerts24?.lastSentAt), lastFailedAt: toIso(alerts24?.lastFailedAt) },
    push: { configured: Boolean(env.vapidPublicKey() && env.vapidPrivateKey()), enabled: push?.enabled ?? 0, disabled: push?.disabled ?? 0, lastSentAt: toIso(push?.lastSentAt) },
    email: { configured: Boolean(env.resendKey()), lastSentAt: toIso(email?.lastSentAt), lastFailedAt: toIso(email?.lastFailedAt) },
    stripe: { configured: Boolean(env.stripeKey() && env.stripeWebhookSecret() && env.stripePriceMonthly()), lastEventAt: toIso(stripe?.lastEventAt), lastEventType: stripe?.lastEventType ?? null, activeSubs: subs?.active ?? 0, missingPermission, permissionsCheckedAt: perms?.checkedAt ?? null },
    cron: { lastTickAt: toIso(cron?.lastTickAt), ticksHour: cron?.ticksHour ?? 0 },
    errors24: { open: errors24?.open ?? 0, lastAt: toIso(errors24?.lastAt) },
    inbox: { lastAt: toIso(inboxRow?.lastAt), worker: Boolean(env.mailWorkerUrl() && env.mailWorkerToken()) },
    deploy: { commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null, env: process.env.VERCEL_ENV ?? "local", region: process.env.VERCEL_REGION ?? null, node: process.version, pollerCode: process.env.POLLER_CODE_HASH || null },
    deployedAt: process.env.BUILD_AT || null,
    clerkConfigured: Boolean(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
  };
}

/* ------------------------------------------------------------------ stock */

export async function stockByModel() {
  const rows = await db()
    .select({ partNumber: schema.storeSkuStatus.partNumber, status: schema.storeSkuStatus.status, n: sql<number>`count(*)::int`, stores: sql<number>`count(distinct store_number) filter (where status = 'available')::int` })
    .from(schema.storeSkuStatus)
    .groupBy(schema.storeSkuStatus.partNumber, schema.storeSkuStatus.status);
  const byModel = new Map<ModelKey, { available: number; unavailable: number; unknown: number }>();
  for (const m of MODELS) byModel.set(m.key, { available: 0, unavailable: 0, unknown: 0 });
  for (const r of rows) {
    const item = PART_INDEX.get(r.partNumber);
    if (!item) continue;
    const e = byModel.get(modelKeyFor(item.model))!;
    if (r.status === "available") e.available += r.n; else if (r.status === "unavailable") e.unavailable += r.n; else e.unknown += r.n;
  }
  return MODELS.map((m) => ({ model: m, ...byModel.get(m.key)! }));
}

export async function skuTable() {
  const rows = await db()
    .select({
      partNumber: schema.storeSkuStatus.partNumber,
      available: sql<number>`count(*) filter (where status = 'available')::int`,
      unknown: sql<number>`count(*) filter (where status = 'unknown')::int`,
      tracked: sql<number>`count(*)::int`,
      lastAvailableAt: sql<string | null>`max(last_available_at)`,
    })
    .from(schema.storeSkuStatus)
    .groupBy(schema.storeSkuStatus.partNumber);
  return rows
    .map((r) => ({ ...r, item: PART_INDEX.get(r.partNumber) }))
    .filter((r) => r.item)
    .sort((a, b) => a.item!.model.localeCompare(b.item!.model) || a.item!.storage.localeCompare(b.item!.storage) || a.item!.color.localeCompare(b.item!.color));
}

export async function storeFreshness() {
  const rows = await db()
    .select({ storeNumber: schema.storeSkuStatus.storeNumber, last: sql<string | null>`max(last_checked_at)`, available: sql<number>`count(*) filter (where status='available')::int`, unknown: sql<number>`count(*) filter (where status='unknown')::int` })
    .from(schema.storeSkuStatus)
    .groupBy(schema.storeSkuStatus.storeNumber);
  const byStore = new Map(rows.map((r) => [r.storeNumber, r]));
  return STORES.map((s) => ({ store: s, last: byStore.get(s.storeNumber)?.last ? new Date(byStore.get(s.storeNumber)!.last!).toISOString() : null, available: byStore.get(s.storeNumber)?.available ?? 0, unknown: byStore.get(s.storeNumber)?.unknown ?? 0 }));
}

export async function recentTransitions(limit = 60, kind?: "restock" | "soldout") {
  const rows = await db()
    .select()
    .from(schema.availabilityEvents)
    .where(kind ? eq(schema.availabilityEvents.kind, kind) : undefined)
    .orderBy(desc(schema.availabilityEvents.at))
    .limit(limit);
  return rows.map((r) => ({ ...r, item: PART_INDEX.get(r.partNumber), store: STORES.find((s) => s.storeNumber === r.storeNumber) }));
}

/* ------------------------------------------------------------------ alerts & users */

export async function pushDevices(limit = 200) {
  return db()
    .select({ d: schema.pushSubscriptions, email: schema.users.email })
    .from(schema.pushSubscriptions)
    .leftJoin(schema.users, eq(schema.users.id, schema.pushSubscriptions.userId))
    .orderBy(desc(schema.pushSubscriptions.createdAt))
    .limit(limit);
}

export async function watchesTable(limit = 200) {
  return db()
    .select({ w: schema.watches, email: schema.users.email, subStatus: schema.subscriptions.status })
    .from(schema.watches)
    .leftJoin(schema.users, eq(schema.users.id, schema.watches.userId))
    .leftJoin(schema.subscriptions, eq(schema.subscriptions.id, schema.watches.subscriptionId))
    .orderBy(desc(schema.watches.createdAt))
    .limit(limit);
}

/* ------------------------------------------------------------------ logs (filtered, paginated) */

export interface PageOpts { limit?: number; page?: number }
const lim = (o: PageOpts) => Math.min(500, Math.max(10, o.limit ?? 100));
const off = (o: PageOpts) => Math.max(0, (o.page ?? 0) * lim(o));

export async function opsLogRows(o: PageOpts & { level?: string; source?: string } = {}) {
  const conds: SQL[] = [];
  if (o.source) conds.push(eq(schema.opsLog.source, o.source));
  if (o.level === "warn") conds.push(sql`${schema.opsLog.level} in ('warn','error')`);
  else if (o.level === "error") conds.push(eq(schema.opsLog.level, "error"));
  else if (o.level !== "debug") conds.push(sql`${schema.opsLog.level} <> 'debug'`);
  return db().select().from(schema.opsLog).where(conds.length ? and(...conds) : undefined).orderBy(desc(schema.opsLog.at)).limit(lim(o)).offset(off(o));
}

export async function pollLogRows(o: PageOpts & { status?: "all" | "fail" | "541" | "ok"; anchor?: string; egress?: string } = {}) {
  const conds: SQL[] = [];
  if (o.status === "fail") conds.push(eq(schema.pollLog.ok, false));
  if (o.status === "ok") conds.push(eq(schema.pollLog.ok, true));
  if (o.status === "541") conds.push(eq(schema.pollLog.httpStatus, 541));
  if (o.anchor) conds.push(eq(schema.pollLog.anchor, o.anchor));
  if (o.egress) conds.push(sql`${schema.pollLog.egress} like ${o.egress + "%"}`);
  return db().select().from(schema.pollLog).where(conds.length ? and(...conds) : undefined).orderBy(desc(schema.pollLog.at)).limit(lim(o)).offset(off(o));
}

export async function notificationRows(o: PageOpts & { channel?: string; status?: string } = {}) {
  const conds: SQL[] = [];
  if (o.channel) conds.push(eq(schema.notifications.channel, o.channel));
  if (o.status) conds.push(eq(schema.notifications.status, o.status));
  return db()
    .select({ n: schema.notifications, email: schema.users.email })
    .from(schema.notifications)
    .leftJoin(schema.users, eq(schema.users.id, schema.notifications.userId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(schema.notifications.createdAt))
    .limit(lim(o))
    .offset(off(o));
}

export async function sweepRows(o: PageOpts = {}) {
  return db().select().from(schema.sweeps).orderBy(desc(schema.sweeps.startedAt)).limit(lim(o)).offset(off(o));
}

export async function stripeEventRows(o: PageOpts = {}) {
  return db().select().from(schema.stripeEvents).orderBy(desc(schema.stripeEvents.receivedAt)).limit(lim(o)).offset(off(o));
}

/* ------------------------------------------------------------------ system */

const TABLES = ["users", "subscriptions", "watches", "stripe_events", "stores", "skus", "store_sku_status", "availability_events", "notifications", "push_subscriptions", "poll_log", "sweeps", "poller_state", "error_groups", "ops_log", "contact_messages", "inbox_messages", "rate_limits", "app_state"];

export async function tableStats() {
  const d = db();
  // An array interpolated into sql`` becomes one bind parameter per element, so the list is joined by hand.
  const names = sql.join(TABLES.map((t) => sql`${t}`), sql`, `);
  const sizes = await d.execute(sql`select c.relname as name, pg_total_relation_size(c.oid)::bigint as bytes, coalesce(s.n_live_tup, 0)::bigint as est from pg_class c join pg_namespace n on n.oid = c.relnamespace left join pg_stat_user_tables s on s.relid = c.oid where c.relkind = 'r' and n.nspname = 'public' and c.relname in (${names})`);
  const rows = (sizes.rows as { name: string; bytes: string | number; est: string | number }[]).map((r) => ({ name: r.name, bytes: Number(r.bytes), est: Number(r.est) }));
  const byName = new Map(rows.map((r) => [r.name, r]));
  const migrations = await d.execute(sql`select name, applied_at from _migrations order by name`).then((r) => r.rows as { name: string; applied_at: string }[]).catch(() => []);
  const [dbSize] = (await d.execute(sql`select pg_database_size(current_database())::bigint as bytes`)).rows as { bytes: string | number }[];
  return { tables: TABLES.map((t) => byName.get(t) ?? { name: t, bytes: 0, est: 0 }), migrations, dbBytes: Number(dbSize?.bytes ?? 0) };
}

export async function stateDump() {
  const [poller, app] = await Promise.all([db().select().from(schema.pollerState), db().select().from(schema.appState)]);
  return { poller, app };
}

export async function errorSummary(hours = 24) {
  const since = new Date(Date.now() - hours * 3600_000);
  return db()
    .select({ source: schema.errorGroups.source, open: sql<number>`count(*) filter (where resolved_at is null)::int`, total: sql<number>`count(*)::int`, hits: sql<number>`coalesce(sum(count),0)::int` })
    .from(schema.errorGroups)
    .where(gt(schema.errorGroups.lastSeenAt, since))
    .groupBy(schema.errorGroups.source);
}
