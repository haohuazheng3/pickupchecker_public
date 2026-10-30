/**
 * Web Push delivery (RFC 8030/8291/8292 via `web-push`, VAPID). Runs wherever notifyRestocks runs:
 * the VPS poller and the serverless fallback. A 404/410 from the push service means the browser
 * dropped the subscription: the row is disabled (not deleted) so the account page can say so.
 * 429/5xx/network failures are retried (1 s, 3 s, Retry-After honoured); five such failures in a
 * row also disable the row. 400/401/403/413 are our problem (payload, VAPID) and land in the error
 * inbox so the admin "Web Push" node turns red.
 */
import webpush from "web-push";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { env } from "../env";
import { errorMessage, recordError } from "../errors";
import { logOps, type OpsSource } from "../ops";
import { sendPlainEmail } from "../mail/resend";
import type { PushPayload } from "./payload";
import { classifyPushFailure, pushTopic, sendWithRetry, shouldDisableAfterFailures, type PushError } from "./policy";

export type PushRow = typeof schema.pushSubscriptions.$inferSelect;

export function pushConfigured(): boolean {
  return Boolean(env.vapidPublicKey() && env.vapidPrivateKey());
}

export interface DeliveryResult {
  sent: number;
  failed: number;
  /** Rows switched off by this call (410/404, or the 5th consecutive failure). */
  disabled: number;
  /** Subscription id of the first successful delivery (stored as the notification's provider id). */
  firstId: string | null;
  errors: string[];
  /** The rows that were just disabled, so the caller can tell the user their phone went quiet. */
  disabledRows: PushRow[];
}

/** Enabled subscriptions grouped by user id. */
export async function enabledSubscriptionsFor(userIds: string[]): Promise<Map<string, PushRow[]>> {
  const map = new Map<string, PushRow[]>();
  if (userIds.length === 0) return map;
  const rows = await db()
    .select()
    .from(schema.pushSubscriptions)
    .where(and(inArray(schema.pushSubscriptions.userId, [...new Set(userIds)]), isNull(schema.pushSubscriptions.disabledAt)));
  for (const r of rows) {
    const list = map.get(r.userId) ?? [];
    list.push(r);
    map.set(r.userId, list);
  }
  return map;
}

export async function enabledSubscriptionsForUser(userId: string): Promise<PushRow[]> {
  return (await enabledSubscriptionsFor([userId])).get(userId) ?? [];
}

export interface SendOptions {
  /** Seconds the push service keeps an undelivered push. Stock moves fast: default 10 minutes. */
  ttlSec?: number;
  /** Where to file errors and ops lines (poller for alerts, web for the account-page test). */
  source?: OpsSource & ("poller" | "web" | "worker");
}

/**
 * Sends one payload to every row. Stock moves fast, so the TTL is short: a phone that was offline
 * for ten minutes should not buzz about stock that is long gone. The Topic header collapses queued
 * pushes for the same alert, so that phone sees one banner, not five.
 */
export async function sendPushToRows(rows: PushRow[], payload: PushPayload, opts: SendOptions = {}): Promise<DeliveryResult> {
  const result: DeliveryResult = { sent: 0, failed: 0, disabled: 0, firstId: null, errors: [], disabledRows: [] };
  if (rows.length === 0) return result;
  const source = opts.source ?? "poller";
  if (!pushConfigured()) {
    result.failed = rows.length;
    result.errors.push("VAPID keys are not configured");
    await recordError(source, "push: VAPID keys are not configured", { rows: rows.length });
    return result;
  }
  const body = JSON.stringify(payload);
  const vapidDetails = { subject: env.vapidSubject(), publicKey: env.vapidPublicKey(), privateKey: env.vapidPrivateKey() };
  const topic = pushTopic(payload.tag);
  const ttl = opts.ttlSec ?? 600;
  const started = Date.now();
  const now = new Date();
  const d = db();
  let attemptsTotal = 0;
  await Promise.all(
    rows.map(async (row) => {
      const r = await sendWithRetry(() =>
        webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          body,
          { TTL: ttl, urgency: "high", topic, vapidDetails, timeout: 10_000 },
        ),
      );
      attemptsTotal += r.attempts;
      if (r.ok) {
        result.sent++;
        if (!result.firstId) result.firstId = row.id;
        await d.update(schema.pushSubscriptions).set({ lastSentAt: now, lastError: null, failCount: 0 }).where(eq(schema.pushSubscriptions.id, row.id));
        return;
      }
      const err = r.error as PushError;
      const status = r.status;
      const msg = `${status ?? "?"} ${errorMessage(r.error)}`.slice(0, 300);
      result.failed++;
      result.errors.push(msg);
      const cls = classifyPushFailure(status);
      if (cls === "gone") {
        result.disabled++;
        result.disabledRows.push({ ...row, disabledAt: now, lastError: msg });
        await d.update(schema.pushSubscriptions).set({ disabledAt: now, lastError: msg }).where(eq(schema.pushSubscriptions.id, row.id));
        return;
      }
      if (cls === "config") {
        await recordError(source, `push rejected by the push service: ${status} ${errorMessage(r.error).slice(0, 120)}`, {
          subscriptionId: row.id, platform: row.platform, status, body: String((err as { body?: string })?.body ?? "").slice(0, 300), tag: payload.tag,
        });
      }
      const failures = (row.failCount ?? 0) + 1;
      if (shouldDisableAfterFailures(failures)) {
        result.disabled++;
        result.disabledRows.push({ ...row, disabledAt: now, lastError: msg, failCount: failures });
        await d.update(schema.pushSubscriptions).set({ disabledAt: now, lastError: `${failures} failures in a row; last: ${msg}`.slice(0, 300), failCount: failures }).where(eq(schema.pushSubscriptions.id, row.id));
        await recordError(source, `push subscription disabled after ${failures} consecutive failures (${row.platform})`, { subscriptionId: row.id, last: msg });
      } else {
        await d.update(schema.pushSubscriptions).set({ lastError: msg, failCount: sql`${schema.pushSubscriptions.failCount} + 1` }).where(eq(schema.pushSubscriptions.id, row.id));
      }
    }),
  );
  const level = result.sent === 0 ? "warn" : result.failed ? "info" : "debug";
  await logOps(source, level, `push ${payload.kind}: ${result.sent}/${rows.length} sent, ${result.failed} failed, ${result.disabled} disabled`, {
    tag: payload.tag, topic, ttl, attempts: attemptsTotal, ms: Date.now() - started, errors: result.errors.slice(0, 3),
  });
  return result;
}

const PUSH_STOPPED_EMAIL_EVERY_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * One email when a device goes quiet: iOS drops the subscription when the app is deleted or the
 * subscription is revoked, and a user who never opens the app would otherwise never learn their
 * alerts moved to email. users.push_stopped_notified_at keeps it to one email per 30 days.
 */
export async function notifyPushStopped(userId: string, email: string, disabledRows: PushRow[], now = new Date()): Promise<boolean> {
  if (disabledRows.length === 0) return false;
  const d = db();
  const [u] = await d.select({ at: schema.users.pushStoppedNotifiedAt }).from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (u?.at && now.getTime() - u.at.getTime() < PUSH_STOPPED_EMAIL_EVERY_MS) return false;
  const platforms = new Set(disabledRows.map((r) => r.platform));
  const device = platforms.has("ios") ? "iPhone" : platforms.has("android") ? "Android phone" : platforms.has("desktop") ? "computer" : "device";
  const reopen = platforms.has("ios")
    ? "Open PickupChecker from your Home Screen (not Safari) and tap \"Turn on notifications\" on the Account page."
    : "Open PickupChecker, go to Account and tap \"Turn on notifications\".";
  const subject = `Notifications stopped on your ${device} — open PickupChecker from the Home Screen`;
  const text = [
    `Your ${device} stopped accepting PickupChecker notifications (the push service reported the subscription is gone).`,
    "Restock alerts for your rules now arrive by email until you turn notifications back on.",
    "",
    reopen,
    `${env.siteUrl()}/account`,
    "",
    "Common causes: the app was removed from the Home Screen, notifications were switched off in Settings, or the phone was restored.",
  ].join("\n");
  try {
    await sendPlainEmail(email, subject, text);
    await d.update(schema.users).set({ pushStoppedNotifiedAt: now }).where(eq(schema.users.id, userId));
    await logOps("poller", "info", "push stopped email sent", { userId, devices: disabledRows.length, device });
    return true;
  } catch (e) {
    await recordError("poller", `push stopped email failed: ${errorMessage(e)}`, { userId });
    return false;
  }
}
