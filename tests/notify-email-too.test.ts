import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { emailPlan } from "@/lib/stock/notify";
import { hasMobileDevice } from "@/lib/push/platform";

/**
 * 2026-11-18: a Plus member on a Mac read the email going quiet (Safari notifications on, so alerts went to the
 * browser only) as a broken account. A member whose devices are all computers now gets the email as well as the push,
 * and so does one we set to users.email_with_push; only the fallback emails are recorded, so the hourly flood guard
 * counts each alert once.
 */
describe("email with push", () => {
  const all = ["a", "b", "c"];
  it("default: no device → every alert by email", () => {
    expect(emailPlan(all, all, false, false)).toEqual({ send: all, record: all });
  });
  it("default: a device got the push → no email", () => {
    expect(emailPlan(all, [], true, false)).toEqual({ send: [], record: [] });
  });
  it("default: push to one store failed → that store by email", () => {
    expect(emailPlan(all, ["c"], true, false)).toEqual({ send: ["c"], record: ["c"] });
  });
  it("email_with_push: every alert by email, only the fallback ones recorded", () => {
    expect(emailPlan(all, [], true, true)).toEqual({ send: all, record: [] });
    expect(emailPlan(all, ["c"], true, true)).toEqual({ send: all, record: ["c"] });
  });
  it("email_with_push without a device is the plain fallback", () => {
    expect(emailPlan(all, all, false, true)).toEqual({ send: all, record: all });
  });
  it("computers only → email too; any phone or tablet → push only", () => {
    expect(hasMobileDevice([{ platform: "desktop" }])).toBe(false);
    expect(hasMobileDevice([{ platform: "desktop" }, { platform: "unknown" }])).toBe(false);
    expect(hasMobileDevice([{ platform: "desktop" }, { platform: "ios" }])).toBe(true);
    expect(hasMobileDevice([{ platform: "android" }])).toBe(true);
    expect(hasMobileDevice([])).toBe(false);
  });
  it("the alert path reads the member's setting and never inserts an empty batch", () => {
    const src = readFileSync("src/lib/stock/notify.ts", "utf8");
    expect(src).toMatch(/emailWithPush: schema\.users\.emailWithPush/);
    expect(src).toMatch(/emailPlan\(g\.hits, byEmail, devices\.length > 0, g\.c\.emailWithPush \|\| !hasMobileDevice\(devices\)\)/);
    expect(src).toMatch(/if \(mail\.record\.length\) await record\(mail\.record, "email", "failed"/);
  });
});
