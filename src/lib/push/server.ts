/**
 * Web Push delivery (RFC 8030/8291/8292 via `web-push`, VAPID). Runs wherever notifyRestocks runs:
 * the VPS poller and the serverless fallback. A 404/410 from the push service means the browser
 * dropped the subscription: the row is disabled (not deleted) so the account page can say so.
 */
import webpush from "web-push";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db, schema } from "../db";
import { env } from "../env";
import { errorMessage } from "../errors";
import type { PushPayload } from "./payload";

export type PushRow = typeof schema.pushSubscriptions.$inferSelect;

export function pushConfigured(): boolean {
  return Boolean(env.vapidPublicKey() && env.vapidPrivateKey());
}

export interface DeliveryResult {
  sent: number;
  failed: number;
  disabled: number;
  /** Subscription id of the first successful delivery (stored as the notification's provider id). */
  firstId: string | null;
  errors: string[];
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

/**
 * Sends one payload to every row. Stock moves fast, so the TTL is short: a phone that was offline
 * for ten minutes should not buzz about stock that is long gone.
 */
export async function sendPushToRows(rows: PushRow[], payload: PushPayload, opts: { ttlSec?: number } = {}): Promise<DeliveryResult> {
  const result: DeliveryResult = { sent: 0, failed: 0, disabled: 0, firstId: null, errors: [] };
  if (rows.length === 0) return result;
  if (!pushConfigured()) {
    result.failed = rows.length;
    result.errors.push("VAPID keys are not configured");
    return result;
  }
  const body = JSON.stringify(payload);
  const vapidDetails = { subject: env.vapidSubject(), publicKey: env.vapidPublicKey(), privateKey: env.vapidPrivateKey() };
  const now = new Date();
  const d = db();
  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          body,
          { TTL: opts.ttlSec ?? 600, urgency: "high", vapidDetails, timeout: 10_000 },
        );
        result.sent++;
        if (!result.firstId) result.firstId = row.id;
        await d.update(schema.pushSubscriptions).set({ lastSentAt: now, lastError: null }).where(eq(schema.pushSubscriptions.id, row.id));
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        const msg = `${status ?? "?"} ${errorMessage(e)}`.slice(0, 300);
        result.failed++;
        result.errors.push(msg);
        if (status === 404 || status === 410) {
          result.disabled++;
          await d.update(schema.pushSubscriptions).set({ disabledAt: now, lastError: msg }).where(eq(schema.pushSubscriptions.id, row.id));
        } else {
          await d.update(schema.pushSubscriptions).set({ lastError: msg }).where(eq(schema.pushSubscriptions.id, row.id));
        }
      }
    }),
  );
  return result;
}
