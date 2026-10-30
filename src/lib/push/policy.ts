/**
 * Pure Web Push rules shared by the browser (client.ts, usePush, PwaBoot), the service worker's
 * server counterpart (subscribe route) and the sender (server.ts). No DOM, no Node, no DB here,
 * so every rule is unit-tested in tests/push.test.ts.
 */
import { urlBase64ToBytes } from "./payload";

/* ------------------------------------------------------------------ keys */

/** base64url of a raw P-256 point (what PushSubscription.options.applicationServerKey holds). */
export function bytesToUrlBase64(bytes: ArrayBuffer | ArrayBufferView | null | undefined): string | null {
  if (!bytes) return null;
  const u8 = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let bin = "";
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  const b64 = typeof btoa === "function" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** True when the browser's subscription was created with exactly this VAPID public key. */
export function vapidKeyMatches(existing: ArrayBuffer | ArrayBufferView | string | null | undefined, publicKey: string): boolean {
  if (!existing || !publicKey) return false;
  const a = typeof existing === "string" ? urlBase64ToBytes(existing) : existing instanceof ArrayBuffer ? new Uint8Array(existing) : new Uint8Array(existing.buffer, existing.byteOffset, existing.byteLength);
  const b = urlBase64ToBytes(publicKey);
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export const RENEW_BEFORE_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * A subscription must be replaced when it was made with another key (rotation) or the push service
 * will expire it within a day. `expirationTime` is epoch ms or null (never expires).
 */
export function subscriptionNeedsRenewal(
  sub: { expirationTime: number | null | undefined; applicationServerKey: ArrayBuffer | ArrayBufferView | string | null | undefined },
  publicKey: string,
  now = Date.now(),
): "key-rotated" | "expiring" | null {
  if (sub.applicationServerKey && !vapidKeyMatches(sub.applicationServerKey, publicKey)) return "key-rotated";
  if (typeof sub.expirationTime === "number" && sub.expirationTime - now < RENEW_BEFORE_EXPIRY_MS) return "expiring";
  return null;
}

/* ------------------------------------------------------------------ identity */

/** The server never returns full endpoints to the page; both sides compare this tail instead. */
export function endpointHash(endpoint: string): string {
  return endpoint.slice(-12);
}

/** How often a healthy device re-POSTs its subscription so last_seen_at stays fresh. */
export const RESYNC_AFTER_MS = 24 * 60 * 60 * 1000;

export interface ServerDevice {
  endpointHash: string;
  disabledAt: string | null;
}

/**
 * Decides whether the page should POST its subscription again: the server has never seen this
 * endpoint, the push service killed it (410) and the row is disabled, or the last POST is a day old.
 */
export function resyncDecision(
  endpoint: string,
  devices: ServerDevice[] | null,
  lastSyncedAt: number | null,
  now = Date.now(),
): "missing" | "disabled" | "stale" | "fresh" {
  const h = endpointHash(endpoint);
  const row = devices?.find((d) => d.endpointHash === h) ?? null;
  if (!row) return "missing";
  if (row.disabledAt) return "disabled";
  if (lastSyncedAt == null || now - lastSyncedAt > RESYNC_AFTER_MS) return "stale";
  return "fresh";
}

/* ------------------------------------------------------------------ subscribe route */

export type SubscribeWrite =
  | { kind: "unauthorized" }
  | { kind: "conflict" }
  | { kind: "upsert"; userId: string; dropOld: boolean };

/**
 * Who a POST /api/push/subscribe may write for.
 *  - Signed in, endpoint new or already ours → upsert for the session user.
 *  - Signed in, endpoint owned by someone else → 409 (the client unsubscribes and makes a new endpoint).
 *  - No session but the body names an `oldEndpoint` we know → the push service rotated the endpoint
 *    inside the service worker (no cookies there); knowing the old endpoint proves ownership, so the
 *    row is rewritten for its existing owner.
 *  - Signed in with an old row that belongs to another account → the device changed hands: write for
 *    the session user and drop the old row.
 */
export function decideSubscribeWrite(input: { sessionUserId: string | null; existingUserId: string | null; oldRowUserId: string | null }): SubscribeWrite {
  const { sessionUserId, existingUserId, oldRowUserId } = input;
  if (sessionUserId) {
    if (existingUserId && existingUserId !== sessionUserId) return { kind: "conflict" };
    return { kind: "upsert", userId: sessionUserId, dropOld: Boolean(oldRowUserId && oldRowUserId !== sessionUserId) };
  }
  if (oldRowUserId) {
    if (existingUserId && existingUserId !== oldRowUserId) return { kind: "conflict" };
    return { kind: "upsert", userId: oldRowUserId, dropOld: false };
  }
  return { kind: "unauthorized" };
}

/* ------------------------------------------------------------------ sending */

/** Topic header: ≤ 32 base64url characters; queued pushes with the same topic collapse at the push service. */
export function pushTopic(tag: string): string {
  const safe = tag.replace(/[^A-Za-z0-9_-]/g, "-");
  if (safe.length <= 32) return safe;
  // FNV-1a 32-bit over the full tag keeps long tags distinct; the prefix keeps them readable in logs.
  let h = 0x811c9dc5;
  for (let i = 0; i < tag.length; i++) {
    h ^= tag.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const hex = h.toString(16).padStart(8, "0");
  return `${safe.slice(0, 23)}-${hex}`;
}

export type FailureClass = "gone" | "retryable" | "config" | "other";

/** 404/410 = subscription gone; 429/5xx/network = try again; 400/401/403/413 = our bug or key problem. */
export function classifyPushFailure(status: number | undefined): FailureClass {
  if (status === 404 || status === 410) return "gone";
  if (status === undefined || status === 429 || status >= 500) return "retryable";
  if (status === 400 || status === 401 || status === 403 || status === 413) return "config";
  return "other";
}

export const RETRY_DELAYS_MS = [1_000, 3_000];
export const MAX_RETRY_AFTER_MS = 10_000;

/** Delay before attempt `attempt` (1-based retry index), honouring Retry-After (seconds or HTTP date). */
export function retryDelayMs(attempt: number, retryAfter?: string | number | null, now = Date.now()): number {
  const base = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length) - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
  if (retryAfter == null || retryAfter === "") return base;
  let hinted: number;
  if (typeof retryAfter === "number") hinted = retryAfter * 1000;
  else if (/^\d+$/.test(retryAfter.trim())) hinted = Number(retryAfter.trim()) * 1000;
  else {
    const at = Date.parse(retryAfter);
    hinted = Number.isNaN(at) ? base : at - now;
  }
  return Math.max(base, Math.min(hinted, MAX_RETRY_AFTER_MS));
}

export interface PushError {
  statusCode?: number;
  headers?: Record<string, string | string[] | undefined>;
  message?: string;
}

export interface SendAttemptResult {
  ok: boolean;
  attempts: number;
  status?: number;
  error?: unknown;
}

/**
 * Runs `send` up to 1 + RETRY_DELAYS_MS.length times. Only retryable failures (429, 5xx, no status =
 * network/timeout) are retried; a 410 or a 403 is final on the first try.
 */
export async function sendWithRetry(
  send: () => Promise<unknown>,
  opts: { sleep?: (ms: number) => Promise<void>; now?: () => number } = {},
): Promise<SendAttemptResult> {
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const now = opts.now ?? Date.now;
  let attempts = 0;
  for (;;) {
    attempts++;
    try {
      await send();
      return { ok: true, attempts };
    } catch (e) {
      const err = e as PushError;
      const status = typeof err?.statusCode === "number" ? err.statusCode : undefined;
      const retryable = classifyPushFailure(status) === "retryable";
      if (!retryable || attempts > RETRY_DELAYS_MS.length) return { ok: false, attempts, status, error: e };
      const ra = err?.headers?.["retry-after"];
      await sleep(retryDelayMs(attempts, Array.isArray(ra) ? ra[0] : ra, now()));
    }
  }
}

export const DISABLE_AFTER_FAILURES = 5;

/** A row that failed this many times in a row (none of them 404/410) is switched off. */
export function shouldDisableAfterFailures(consecutiveFailures: number): boolean {
  return consecutiveFailures >= DISABLE_AFTER_FAILURES;
}
