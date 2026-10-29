/**
 * What a push notification carries. The service worker (public/sw.js) reads exactly these fields,
 * so keep them small: push services cap payloads at 4 KB and iOS shows ~2 lines of body.
 */
import type { AlertLine } from "../mail/resend";
import { storePath, stateCodeOf } from "../apple/catalog";

export interface PushPayload {
  title: string;
  body: string;
  /** Same-origin path the notification opens. */
  url: string;
  /** Notifications with the same tag replace each other (one per alert rule). */
  tag?: string;
  /** ISO time the restock was seen. */
  at: string;
}

export function restockPayload(lines: AlertLine[], watchId: string, now = new Date()): PushPayload {
  const first = lines[0];
  const more = lines.length > 1 ? ` +${lines.length - 1} more` : "";
  const title = `In stock: ${first.item.model} ${first.item.storage} ${first.item.color}${more}`;
  const where = `Apple ${first.store.name} · ${first.store.city}, ${stateCodeOf(first.store)}`;
  const body = `${where}${first.quote ? ` — ${first.quote}` : ""}. Tap to reserve on apple.com.`;
  return {
    title: title.slice(0, 120),
    body: body.slice(0, 200),
    url: `${storePath(first.store)}?from=push`,
    tag: `restock-${watchId}`,
    at: now.toISOString(),
  };
}

export function testPayload(now = new Date()): PushPayload {
  return {
    title: "PickupChecker notifications are on",
    body: "This is how a restock will look. Alerts arrive within seconds of a store flipping to available.",
    url: "/account?from=push",
    tag: "test",
    at: now.toISOString(),
  };
}

/** VAPID public keys travel as base64url; PushManager wants the raw 65-byte P-256 point. */
export function urlBase64ToBytes(s: string): Uint8Array {
  const padded = (s + "=".repeat((4 - (s.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const bin = typeof atob === "function" ? atob(padded) : Buffer.from(padded, "base64").toString("binary");
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
