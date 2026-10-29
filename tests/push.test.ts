import { describe, it, expect } from "vitest";
import { platformFromUA, browserFromUA, isInAppBrowser } from "@/lib/push/platform";
import { restockPayload, testPayload, urlBase64ToBytes } from "@/lib/push/payload";
import { PART_INDEX, STORE_INDEX } from "@/lib/apple/catalog";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1";
const IPAD_AS_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15";
const ANDROID = "Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36";
const MAC_CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
const INSTAGRAM = IPHONE + " Instagram 400.0.0.0";

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
});

describe("push payload", () => {
  const item = PART_INDEX.get("MJQ34LL/A")!;
  const store = STORE_INDEX.get("R032")!;
  it("fits a lock screen and opens the store page", () => {
    const p = restockPayload([{ item, store, quote: "Available Today" }], "w1", new Date("2026-10-29T12:00:00Z"));
    expect(p.title).toBe(`In stock: ${item.model} ${item.storage} ${item.color}`);
    expect(p.body).toContain(`Apple ${store.name}`);
    expect(p.body).toContain("Available Today");
    expect(p.url).toMatch(/^\/stores\/[a-z-]+\/[a-z0-9-]+\?from=push$/);
    expect(p.tag).toBe("restock-w1");
    expect(JSON.stringify(p).length).toBeLessThan(1000);
  });
  it("counts extra restocks in the title", () => {
    const p = restockPayload([{ item, store, quote: null }, { item, store, quote: null }, { item, store, quote: null }], "w2");
    expect(p.title).toContain("+2 more");
  });
  it("has a test payload with a tag", () => {
    expect(testPayload().tag).toBe("test");
  });
  it("decodes base64url VAPID keys to raw bytes", () => {
    // "BA" + 63 zero bytes → 65-byte uncompressed point prefix
    const key = "BA" + "A".repeat(85);
    const bytes = urlBase64ToBytes(key);
    expect(bytes.length).toBe(65);
    expect(bytes[0]).toBe(4);
    expect(urlBase64ToBytes("-_8")).toEqual(new Uint8Array([251, 255]));
  });
});
