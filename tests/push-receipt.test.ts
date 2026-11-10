import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { readReceipt, receiptToken, RECEIPT_MAX_AGE_MS } from "../src/lib/push/receipt";
import { alertMarks } from "../src/lib/alertMarks";
import { partNumbersFor } from "../src/lib/apple/catalog";

/**
 * 2026-11-10: three paying members wrote that they never got an alert we had recorded as sent (the push service
 * answered 201). Pushes now carry a signed receipt the service worker posts back on arrival, and the dashboard marks
 * each restock against the member's own alerts (a Star White restock at a store where they watch Night Sky was shown
 * as "your" restock next to "Nothing sent yet").
 */
const KEY = "test-vapid-private-key";
const SUB = "8f0b6c2e-3f1a-4b7d-9a51-2c4e5f6a7b8c";

describe("push receipts", () => {
  it("round-trips the device, the events and the time", () => {
    const t = receiptToken(SUB, [101, 202], 1_794_300_000_000, KEY);
    expect(readReceipt(t, KEY, 1_794_300_005_000)).toEqual({ subscriptionId: SUB, eventIds: [101, 202], sentAt: 1_794_300_000_000 });
  });
  it("carries no events for a test push", () => {
    const t = receiptToken(SUB, [], 1_794_300_000_000, KEY);
    expect(readReceipt(t, KEY, 1_794_300_000_000)?.eventIds).toEqual([]);
  });
  it("refuses a token signed with another key, edited, or too old", () => {
    const t = receiptToken(SUB, [7], 1_794_300_000_000, KEY);
    expect(readReceipt(t, "another-key", 1_794_300_000_000)).toBeNull();
    expect(readReceipt(t.replace(".7.", ".8."), KEY, 1_794_300_000_000)).toBeNull();
    expect(readReceipt(t, KEY, 1_794_300_000_000 + RECEIPT_MAX_AGE_MS + 1)).toBeNull();
    expect(readReceipt("nonsense", KEY)).toBeNull();
    expect(readReceipt(undefined, KEY)).toBeNull();
    expect(readReceipt(t, "", 1_794_300_000_000)).toBeNull();
  });
  it("is posted back by the service worker without holding up the banner", () => {
    const sw = readFileSync("public/sw.js", "utf8");
    expect(sw).toMatch(/\/api\/push\/receipt/);
    // The banner is shown first and on its own; the receipt's failure is swallowed.
    expect(sw.indexOf("showNotification(")).toBeLessThan(sw.indexOf("/api/push/receipt"));
    expect(sw).toMatch(/receipt[\s\S]*\.catch\(function \(\) \{\}\)/);
  });
});

describe("dashboard restock marks", () => {
  const ns256 = partNumbersFor("duo", ["256GB"], ["Night Sky"])[0];
  const sw256 = partNumbersFor("duo", ["256GB"], ["Star White"])[0];
  const rule = { active: true, model: "duo", storages: ["256GB"], colors: ["Night Sky"], storeNumbers: ["R016"], createdAt: "2026-11-07T17:08:00Z" };
  const row = (id: number, partNumber: string, at: string, storeNumber = "R016") => ({ id, partNumber, at, storeNumber });

  it("tells alerted, other-configuration and before-the-alert restocks apart", () => {
    const rows = [
      row(1, sw256, "2026-11-10T14:54:43Z"), // Star White at a Night Sky member's store
      row(2, ns256, "2026-11-07T14:54:00Z"), // their configuration, before they set the alert
      row(3, ns256, "2026-11-09T10:00:00Z"), // alerted, phone confirmed
      row(4, ns256, "2026-11-09T12:00:00Z"), // alerted, no receipt
      row(5, ns256, "2026-11-09T12:01:30Z"), // back within the same batch: no alert, no mark
      row(6, ns256, "2026-11-09T12:00:00Z", "R288"), // their configuration at a store they do not watch
    ];
    const notes = [{ eventId: 3, status: "sent", deliveredAt: "2026-11-09T10:00:02Z" }, { eventId: 4, status: "sent", deliveredAt: null }];
    expect(alertMarks(rows, [rule], notes)).toEqual({ 1: "other", 2: "before", 3: "delivered", 4: "sent", 6: "other" });
  });
  it("ignores alerts that are switched off", () => {
    expect(alertMarks([row(9, ns256, "2026-11-09T10:00:00Z")], [{ ...rule, active: false }], [])).toEqual({ 9: "other" });
  });

  it("draws a chip on each marked row, in the reader's words", async () => {
    const { SellOutTimes } = await import("@/components/restocks/SellOutTimes");
    const { dict } = await import("@/lib/i18n/dict");
    const at = new Date("2026-11-10T14:54:43Z");
    const one = (id: number, partNumber: string) => ({ id, at, storeNumber: "R016", partNumber, lowSec: 183, highSec: 189, exact: true, listedSec: null });
    const data = { summary: { n: 2, medianSec: 186, within30: 0, within60: 0, within120: 0, fastestSec: 183, days: 30 }, byModel: {}, recent: [one(1, sw256), one(3, ns256), one(5, ns256)] };
    const out = renderToStaticMarkup(SellOutTimes({ data, label: "your store", limit: 15, marks: { 1: "other", 3: "delivered" }, markLabels: dict("en").account.restock.mark }));
    expect(out).toContain('data-mark="other"');
    expect(out).toContain("Not in your alerts");
    expect(out).toContain('data-mark="delivered"');
    expect(out).toContain("Alert delivered");
    expect(out.match(/data-mark=/g)).toHaveLength(2); // the unmarked row stays as it was
    // Without marks (every public page) the list is unchanged.
    expect(renderToStaticMarkup(SellOutTimes({ data, label: "x", limit: 15 }))).not.toContain("data-mark");
  });
});
