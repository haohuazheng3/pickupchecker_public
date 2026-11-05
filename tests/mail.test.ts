import { describe, it, expect } from "vitest";
import { alertSubject, alertText, alertHtml } from "@/lib/mail/resend";
import { PART_INDEX, STORE_INDEX } from "@/lib/apple/catalog";

describe("alert email", () => {
  const item = PART_INDEX.get("MJQ34LL/A")!;
  const store = STORE_INDEX.get("R032")!;
  const lines = [{ item, store, quote: "Available Today" }];
  it("writes a precise subject", () => {
    expect(alertSubject(lines)).toContain(item.model);
    expect(alertSubject(lines)).toContain(store.name);
  });
  it("includes reserve link and manage link", () => {
    const t = alertText(lines, "https://pickupchecker.com/account?watch=x");
    expect(t).toContain("apple.com/shop/buy-iphone");
    expect(t).toContain("/account?watch=x");
    const h = alertHtml(lines, "https://pickupchecker.com/account?watch=x");
    expect(h).toContain("Reserve on apple.com");
    expect(h).not.toContain("<script");
  });
  it("ends with a way to cancel the plan, in the reader's language", () => {
    const t = alertText(lines, "https://pickupchecker.com/account?watch=x");
    expect(t).toContain("Cancel anytime: https://pickupchecker.com/account/cancel");
    const h = alertHtml(lines, "https://pickupchecker.com/account?watch=x");
    expect(h).toContain('href="https://pickupchecker.com/account/cancel"');
    expect(h).toContain(">Cancel anytime</a>");
    expect(alertText(lines, "https://pickupchecker.com/account?watch=x", "ja")).toContain("いつでも解約できます：https://pickupchecker.com/account/cancel");
  });
});
