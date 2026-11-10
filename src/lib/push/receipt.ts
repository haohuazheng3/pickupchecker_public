/**
 * Push delivery receipts (2026-11-10). The push service's 201 only says it queued a push; whether the phone got it
 * was unknown, and members who saw nothing could not be told apart from members whose phones were fine. Each push
 * now carries a signed token naming the device row, the restock events it reports and when it was sent; the service
 * worker posts the token back the moment the push arrives (public/sw.js), and /api/push/receipt records it
 * (notifications.delivered_at, push_subscriptions.last_delivered_at).
 *
 * Token: "<subscription id>.<event ids joined by '-'>.<sent at, ms>.<HMAC-SHA256, base64url, 22 chars>". Signed with
 * the VAPID private key (both the poller and the site have it), so a receipt can only name pushes we sent. A forged
 * or replayed receipt could at worst mark a push delivered; it can never change who gets alerts.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export interface Receipt { subscriptionId: string; eventIds: number[]; sentAt: number }

/** Receipts older than this are ignored (a push lives at most 10 minutes at the push service; phones may report late). */
export const RECEIPT_MAX_AGE_MS = 24 * 3600 * 1000;

function sign(body: string, key: string): string {
  return createHmac("sha256", `push-receipt:${key}`).update(body).digest("base64url").slice(0, 22);
}

export function receiptToken(subscriptionId: string, eventIds: number[], sentAt: number, key: string): string {
  const body = `${subscriptionId}.${eventIds.filter((n) => Number.isInteger(n) && n > 0).join("-")}.${Math.floor(sentAt)}`;
  return `${body}.${sign(body, key)}`;
}

/** The receipt a token names, or null when it is malformed, not ours, or too old. */
export function readReceipt(token: unknown, key: string, now = Date.now()): Receipt | null {
  if (typeof token !== "string" || token.length > 600 || !key) return null;
  const m = /^([A-Za-z0-9_-]{1,80})\.((?:\d{1,12})(?:-\d{1,12})*)?\.(\d{10,14})\.([A-Za-z0-9_-]{22})$/.exec(token);
  if (!m) return null;
  const body = `${m[1]}.${m[2] ?? ""}.${m[3]}`;
  const want = Buffer.from(sign(body, key)), got = Buffer.from(m[4]);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  const sentAt = Number(m[3]);
  if (!(sentAt <= now + 5 * 60_000 && now - sentAt <= RECEIPT_MAX_AGE_MS)) return null;
  return { subscriptionId: m[1], eventIds: m[2] ? m[2].split("-").map(Number).slice(0, 50) : [], sentAt };
}
