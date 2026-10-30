/**
 * What a push notification carries. The service worker (public/sw.js) reads exactly these fields,
 * so keep them small: push services cap payloads at 4 KB and iOS shows ~2 lines of body.
 */
import type { AlertLine } from "../mail/resend";
import { appleBuyUrl, storePath, stateCodeOf, appleName } from "../apple/catalog";

export type PushKind = "restock" | "test";

export interface PushPayload {
  /** Payload schema version; bump when sw.js needs to tell old and new apart. */
  v: 1;
  kind: PushKind;
  title: string;
  body: string;
  /** Same-origin path the notification opens. */
  url: string;
  /** Notifications with the same tag replace each other: one per alert rule × store × configuration. */
  tag: string;
  /** ISO time the restock was seen (or the test was sent). */
  at: string;
  data?: {
    /** apple.com buy page for exactly this storage/colour ("Buy" action on Android/desktop). */
    buyUrl?: string;
    storeNumber?: string;
    partNumber?: string;
    /** Test pushes: where this one should land, so a user with several devices can tell them apart. */
    device?: string;
  };
}

/** `MJQ34LL/A` → `MJQ34LL-A`: tags must be safe for the push service and the Topic header. */
export function sanitizePartNumber(partNumber: string): string {
  return partNumber.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** One alert is one store × one model × one storage × one colour, so the tag names all four. */
export function restockTag(watchId: string, storeNumber: string, partNumber: string): string {
  return `restock-${watchId}-${storeNumber}-${sanitizePartNumber(partNumber)}`;
}

export function restockPayload(lines: AlertLine | AlertLine[], watchId: string, now = new Date()): PushPayload {
  const first = Array.isArray(lines) ? lines[0] : lines;
  const title = `In stock: ${first.item.model} ${first.item.storage} ${first.item.color}`;
  const where = `${appleName(first.store)} · ${first.store.city}, ${stateCodeOf(first.store)}`;
  const body = `${where}${first.quote ? ` — ${first.quote}` : ""}. Tap to reserve on apple.com.`;
  return {
    v: 1,
    kind: "restock",
    title: title.slice(0, 120),
    body: body.slice(0, 200),
    url: `${storePath(first.store)}?from=push`,
    tag: restockTag(watchId, first.store.storeNumber, first.item.partNumber),
    at: now.toISOString(),
    data: { buyUrl: appleBuyUrl(first.item), storeNumber: first.store.storeNumber, partNumber: first.item.partNumber },
  };
}

/** "iPhone (Home Screen app)", "Android phone", "computer (Chrome)". */
export function deviceLabel(d: { platform: string; standalone: boolean; userAgent?: string | null }): string {
  const ua = d.userAgent ?? "";
  const browser = /Edg\//i.test(ua) ? "Edge" : /Firefox|FxiOS/i.test(ua) ? "Firefox" : /CriOS|Chrome\//i.test(ua) ? "Chrome" : /Safari\//i.test(ua) ? "Safari" : "";
  if (d.platform === "ios") return d.standalone ? "iPhone (Home Screen app)" : "iPhone (Safari)";
  if (d.platform === "android") return d.standalone ? "Android (installed app)" : `Android${browser ? ` (${browser})` : ""}`;
  if (d.platform === "desktop") return `computer${browser ? ` (${browser})` : ""}`;
  return "this device";
}

/** Clock time the user can compare with the moment they pressed the button. */
export function formatSentAt(now: Date): string {
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  const ss = String(now.getUTCSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss} UTC`;
}

export function testPayload(opts: { device?: string; now?: Date } = {}): PushPayload {
  const now = opts.now ?? new Date();
  const device = opts.device ?? "this device";
  return {
    v: 1,
    kind: "test",
    title: "PickupChecker notifications are on",
    body: `Test sent ${formatSentAt(now)} to your ${device}. Restock alerts arrive the same way, within seconds.`.slice(0, 200),
    url: "/account?from=push",
    tag: "test",
    at: now.toISOString(),
    data: { device },
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
