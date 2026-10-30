import { describe, it, expect } from "vitest";
import { platformFromUA, browserFromUA, isInAppBrowser } from "@/lib/push/platform";
import { deviceLabel, restockPayload, restockTag, sanitizePartNumber, testPayload, urlBase64ToBytes } from "@/lib/push/payload";
import {
  bytesToUrlBase64, classifyPushFailure, decideSubscribeWrite, endpointHash, pushTopic, resyncDecision, retryDelayMs, sendWithRetry,
  shouldDisableAfterFailures, subscriptionNeedsRenewal, vapidKeyMatches, RESYNC_AFTER_MS, RENEW_BEFORE_EXPIRY_MS,
} from "@/lib/push/policy";
import { PART_INDEX, STORE_INDEX, appleBuyUrl } from "@/lib/apple/catalog";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1";
const IPAD_AS_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15";
const ANDROID = "Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36";
const MAC_CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
const INSTAGRAM = IPHONE + " Instagram 400.0.0.0";

// "BA" + 63 zero bytes → a 65-byte uncompressed P-256 point in base64url.
const KEY_A = "BA" + "A".repeat(85);
const KEY_B = "BB" + "A".repeat(85);

describe("platform detection", () => {
  it("tells phones, tablets and computers apart", () => {
    expect(platformFromUA(IPHONE)).toBe("ios");
    expect(platformFromUA(IPAD_AS_MAC, { maxTouchPoints: 5 })).toBe("ios");
    expect(platformFromUA(IPAD_AS_MAC, { maxTouchPoints: 0 })).toBe("desktop");
    expect(platformFromUA(ANDROID)).toBe("android");
    expect(platformFromUA(MAC_CHROME)).toBe("desktop");
    expect(platformFromUA("")).toBe("unknown");
  });
  it("names the browser and spots in-app web views", () => {
    expect(browserFromUA(IPHONE)).toBe("safari");
    expect(browserFromUA(ANDROID)).toBe("chrome");
    expect(browserFromUA(MAC_CHROME)).toBe("chrome");
    expect(isInAppBrowser(INSTAGRAM)).toBe(true);
    expect(isInAppBrowser(IPHONE)).toBe(false);
  });
  it("labels devices for the test banner", () => {
    expect(deviceLabel({ platform: "ios", standalone: true })).toBe("iPhone (Home Screen app)");
    expect(deviceLabel({ platform: "android", standalone: false, userAgent: ANDROID })).toBe("Android (Chrome)");
    expect(deviceLabel({ platform: "desktop", standalone: false, userAgent: MAC_CHROME })).toBe("computer (Chrome)");
    expect(deviceLabel({ platform: "unknown", standalone: false })).toBe("this device");
  });
});

describe("push payload", () => {
  const item = PART_INDEX.get("MJQ34LL/A")!;
  const store = STORE_INDEX.get("R032")!;
  it("fits a lock screen and opens the store page", () => {
    const p = restockPayload([{ item, store, quote: "Available Today" }], "w1", new Date("2026-10-29T12:00:00Z"));
    expect(p.v).toBe(1);
    expect(p.kind).toBe("restock");
    expect(p.title).toBe(`In stock: ${item.model} ${item.storage} ${item.color}`);
    expect(p.body).toContain(`Apple ${store.name}`);
    expect(p.body).toContain("Available Today");
    expect(p.url).toMatch(/^\/stores\/[a-z-]+\/[a-z0-9-]+\/[a-z0-9-]+\?from=push$/); // /stores/{state}/{city}/{store}
    expect(p.data?.buyUrl).toBe(appleBuyUrl(item));
    expect(p.data?.buyUrl).toMatch(/^https:\/\/www\.apple\.com\/shop\/buy-iphone\//);
    expect(p.data?.storeNumber).toBe("R032");
    expect(p.data?.partNumber).toBe("MJQ34LL/A");
    expect(JSON.stringify(p).length).toBeLessThan(1000);
  });
  it("tags one alert as one store × one configuration (no '+N more')", () => {
    const p = restockPayload([{ item, store, quote: null }, { item, store, quote: null }, { item, store, quote: null }], "w2");
    expect(p.title).not.toContain("more");
    expect(p.tag).toBe("restock-w2-R032-MJQ34LL-A");
    expect(restockPayload({ item, store, quote: null }, "w2").tag).toBe(p.tag);
  });
  it("builds tags the push service and Topic header accept", () => {
    expect(sanitizePartNumber("MJQ34LL/A")).toBe("MJQ34LL-A");
    expect(restockTag("8f1c", "R032", "MJQ34LL/A")).toBe("restock-8f1c-R032-MJQ34LL-A");
    expect(restockTag("8f1c", "R032", "MJQ34LL/A")).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it("test payload says when it was sent and where it should land", () => {
    const t = testPayload({ device: "iPhone (Home Screen app)", now: new Date("2026-10-29T12:34:56Z") });
    expect(t.kind).toBe("test");
    expect(t.tag).toBe("test");
    expect(t.body).toContain("12:34:56 UTC");
    expect(t.body).toContain("iPhone (Home Screen app)");
    expect(t.data?.device).toBe("iPhone (Home Screen app)");
  });
  it("decodes base64url VAPID keys to raw bytes", () => {
    const bytes = urlBase64ToBytes(KEY_A);
    expect(bytes.length).toBe(65);
    expect(bytes[0]).toBe(4);
    expect(urlBase64ToBytes("-_8")).toEqual(new Uint8Array([251, 255]));
  });
});

describe("VAPID key comparison and renewal", () => {
  it("round-trips bytes ↔ base64url", () => {
    const bytes = urlBase64ToBytes(KEY_A);
    expect(bytesToUrlBase64(bytes)).toBe(KEY_A);
    expect(bytesToUrlBase64(new Uint8Array(bytes).buffer)).toBe(KEY_A);
    expect(bytesToUrlBase64(null)).toBeNull();
  });
  it("matches a subscription's applicationServerKey against the server key", () => {
    const a = urlBase64ToBytes(KEY_A);
    expect(vapidKeyMatches(a, KEY_A)).toBe(true);
    expect(vapidKeyMatches(new Uint8Array(a).buffer, KEY_A)).toBe(true);
    expect(vapidKeyMatches(KEY_A, KEY_A)).toBe(true);
    expect(vapidKeyMatches(a, KEY_B)).toBe(false);
    expect(vapidKeyMatches(null, KEY_A)).toBe(false);
    expect(vapidKeyMatches(a, "")).toBe(false);
  });
  it("renews on key rotation or when expiry is under a day away", () => {
    const now = Date.parse("2026-10-29T12:00:00Z");
    const a = urlBase64ToBytes(KEY_A);
    expect(subscriptionNeedsRenewal({ expirationTime: null, applicationServerKey: a }, KEY_A, now)).toBeNull();
    expect(subscriptionNeedsRenewal({ expirationTime: null, applicationServerKey: a }, KEY_B, now)).toBe("key-rotated");
    expect(subscriptionNeedsRenewal({ expirationTime: now + RENEW_BEFORE_EXPIRY_MS - 1, applicationServerKey: a }, KEY_A, now)).toBe("expiring");
    expect(subscriptionNeedsRenewal({ expirationTime: now + 3 * RENEW_BEFORE_EXPIRY_MS, applicationServerKey: a }, KEY_A, now)).toBeNull();
    // Browsers that do not expose options still get the expiry check.
    expect(subscriptionNeedsRenewal({ expirationTime: now - 1, applicationServerKey: null }, KEY_A, now)).toBe("expiring");
  });
});

describe("resync decision", () => {
  const endpoint = "https://web.push.apple.com/QAbCdEf0123456789";
  const now = Date.parse("2026-10-29T12:00:00Z");
  it("re-POSTs when the server has no row or disabled it, or after a day", () => {
    const h = endpointHash(endpoint);
    expect(h).toBe(endpoint.slice(-12)); // the server only ever returns this tail
    expect(h.length).toBe(12);
    expect(resyncDecision(endpoint, [], now, now)).toBe("missing");
    expect(resyncDecision(endpoint, [{ endpointHash: h, disabledAt: "2026-10-28T00:00:00Z" }], now, now)).toBe("disabled");
    expect(resyncDecision(endpoint, [{ endpointHash: h, disabledAt: null }], null, now)).toBe("stale");
    expect(resyncDecision(endpoint, [{ endpointHash: h, disabledAt: null }], now - RESYNC_AFTER_MS - 1, now)).toBe("stale");
    expect(resyncDecision(endpoint, [{ endpointHash: h, disabledAt: null }], now - 60_000, now)).toBe("fresh");
  });
});

describe("subscribe route ownership", () => {
  it("lets a signed-in user write their own or a new endpoint", () => {
    expect(decideSubscribeWrite({ sessionUserId: "u1", existingUserId: null, oldRowUserId: null })).toEqual({ kind: "upsert", userId: "u1", dropOld: false });
    expect(decideSubscribeWrite({ sessionUserId: "u1", existingUserId: "u1", oldRowUserId: null })).toEqual({ kind: "upsert", userId: "u1", dropOld: false });
  });
  it("never reassigns another account's endpoint", () => {
    expect(decideSubscribeWrite({ sessionUserId: "u2", existingUserId: "u1", oldRowUserId: null })).toEqual({ kind: "conflict" });
  });
  it("rewrites a rotated endpoint without a session when the old endpoint is known", () => {
    expect(decideSubscribeWrite({ sessionUserId: null, existingUserId: null, oldRowUserId: "u1" })).toEqual({ kind: "upsert", userId: "u1", dropOld: false });
    expect(decideSubscribeWrite({ sessionUserId: null, existingUserId: null, oldRowUserId: null })).toEqual({ kind: "unauthorized" });
    expect(decideSubscribeWrite({ sessionUserId: null, existingUserId: "u2", oldRowUserId: "u1" })).toEqual({ kind: "conflict" });
  });
  it("hands a device that changed accounts to the new user and drops the old row", () => {
    expect(decideSubscribeWrite({ sessionUserId: "u2", existingUserId: null, oldRowUserId: "u1" })).toEqual({ kind: "upsert", userId: "u2", dropOld: true });
  });
});

describe("topic header", () => {
  it("is ≤ 32 base64url characters and stable per tag", () => {
    const short = pushTopic("test");
    expect(short).toBe("test");
    const long = pushTopic("restock-5e1a6b0c-7d2f-4c3a-9b8e-1f2a3b4c5d6e-R032-MJQ34LL-A");
    expect(long.length).toBeLessThanOrEqual(32);
    expect(long).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(pushTopic("restock-5e1a6b0c-7d2f-4c3a-9b8e-1f2a3b4c5d6e-R032-MJQ34LL-A")).toBe(long);
    expect(pushTopic("restock-5e1a6b0c-7d2f-4c3a-9b8e-1f2a3b4c5d6e-R032-MJQ35LL-A")).not.toBe(long);
    expect(pushTopic("a/b+c=d").length).toBeLessThanOrEqual(32);
    expect(pushTopic("a/b+c=d")).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("retry policy", () => {
  const fail = (statusCode?: number, headers?: Record<string, string>) => Object.assign(new Error(`push ${statusCode ?? "network"}`), { statusCode, headers });
  const recorder = () => {
    const sleeps: number[] = [];
    return { sleeps, sleep: async (ms: number) => { sleeps.push(ms); } };
  };
  it("classifies push service answers", () => {
    expect(classifyPushFailure(410)).toBe("gone");
    expect(classifyPushFailure(404)).toBe("gone");
    expect(classifyPushFailure(429)).toBe("retryable");
    expect(classifyPushFailure(503)).toBe("retryable");
    expect(classifyPushFailure(undefined)).toBe("retryable");
    expect(classifyPushFailure(400)).toBe("config");
    expect(classifyPushFailure(401)).toBe("config");
    expect(classifyPushFailure(403)).toBe("config");
    expect(classifyPushFailure(413)).toBe("config");
    expect(classifyPushFailure(418)).toBe("other");
  });
  it("retries 429/5xx/network twice with 1 s then 3 s", async () => {
    const r = recorder();
    let calls = 0;
    const res = await sendWithRetry(async () => { calls++; if (calls < 3) throw fail(calls === 1 ? 503 : undefined); }, { sleep: r.sleep });
    expect(res).toMatchObject({ ok: true, attempts: 3 });
    expect(r.sleeps).toEqual([1000, 3000]);
  });
  it("gives up after the second retry", async () => {
    const r = recorder();
    const res = await sendWithRetry(async () => { throw fail(429); }, { sleep: r.sleep });
    expect(res.ok).toBe(false);
    expect(res.attempts).toBe(3);
    expect(res.status).toBe(429);
    expect(r.sleeps).toEqual([1000, 3000]);
  });
  it("does not retry 410, 403 or 400", async () => {
    for (const status of [410, 404, 403, 400, 413]) {
      const r = recorder();
      const res = await sendWithRetry(async () => { throw fail(status); }, { sleep: r.sleep });
      expect(res).toMatchObject({ ok: false, attempts: 1, status });
      expect(r.sleeps).toEqual([]);
    }
  });
  it("honours Retry-After up to 10 s", async () => {
    const now = Date.parse("2026-10-29T12:00:00Z");
    expect(retryDelayMs(1, "2", now)).toBe(2000);
    expect(retryDelayMs(1, "0", now)).toBe(1000); // never below the base delay
    expect(retryDelayMs(2, "60", now)).toBe(10_000); // capped
    expect(retryDelayMs(1, new Date(now + 5000).toUTCString(), now)).toBe(5000);
    expect(retryDelayMs(1, "garbage", now)).toBe(1000);
    const r = recorder();
    let calls = 0;
    await sendWithRetry(async () => { calls++; if (calls === 1) throw fail(429, { "retry-after": "4" }); }, { sleep: r.sleep, now: () => now });
    expect(r.sleeps).toEqual([4000]);
  });
  it("disables a row after five consecutive non-410 failures", () => {
    expect(shouldDisableAfterFailures(4)).toBe(false);
    expect(shouldDisableAfterFailures(5)).toBe(true);
  });
});
