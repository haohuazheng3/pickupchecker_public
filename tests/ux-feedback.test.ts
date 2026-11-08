import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isSamePage } from "@/components/ui/navEvents";
import { CDICTS } from "@/lib/i18n/cdict/all";

/**
 * 2026-11-08, from FlowGlance paths: taps that changed nothing visible were being repeated dozens of times — the
 * header link of the page already open (the iPhone Home Screen app has no reload), the test notification inside
 * that app (iPhone shows no banner while it is in front), Near me, and ticks refused past the plan. Each now answers.
 */
const here = (url: string) => { const u = new URL(url); return { pathname: u.pathname, search: u.search, href: u.href }; };

describe("isSamePage (a tap on the link to the page on screen refreshes it)", () => {
  it("matches the same path and query, with or without a trailing slash", () => {
    expect(isSamePage("/stock/iphone-duo", here("https://pickupchecker.com/stock/iphone-duo"))).toBe(true);
    expect(isSamePage("/stock/iphone-duo/", here("https://pickupchecker.com/stock/iphone-duo"))).toBe(true);
    expect(isSamePage("/", here("https://pickupchecker.com/"))).toBe(true);
    expect(isSamePage("https://pickupchecker.com/map", here("https://pickupchecker.com/map"))).toBe(true);
  });
  it("leaves other pages, other queries, fragments and other sites to a normal navigation", () => {
    expect(isSamePage("/restocks", here("https://pickupchecker.com/stock/iphone-duo"))).toBe(false);
    expect(isSamePage("/restocks?model=duo", here("https://pickupchecker.com/restocks"))).toBe(false);
    expect(isSamePage("/?model=duo#notify", here("https://pickupchecker.com/?model=duo"))).toBe(false);
    expect(isSamePage("https://example.com/map", here("https://pickupchecker.com/map"))).toBe(false);
  });
});

describe("the new answers exist in every language", () => {
  it("has the refresh pill, the test-notification guidance, the plan toast and Near me results", () => {
    for (const [lang, d] of Object.entries(CDICTS)) {
      const strings = [d.chrome.refresh.busy, d.chrome.refresh.done, d.account.push.previewNow, d.account.push.previewShown,
        d.account.push.test.soon, d.account.push.test.iosHint, d.account.push.test.away, d.alerts.editor.overPlanHave,
        d.alerts.editor.upgradeTo, d.alerts.picker.locatedNow, d.alerts.picker.locBlocked];
      for (const s of strings) expect(s, lang).toMatch(/\S/);
      expect(d.account.push.test.soon, lang).toContain("{s}");
      for (const k of ["{plan}", "{limit}", "{price}"]) expect(d.alerts.editor.upgradeTo, lang).toContain(k);
      for (const k of ["{have}", "{plan}", "{limit}"]) expect(d.alerts.editor.overPlanHave, lang).toContain(k);
    }
  });
});

describe("wiring", () => {
  const src = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
  it("an iPhone test waits on the server, not in the backgrounded page", () => {
    expect(src("src/components/push/usePush.ts")).toMatch(/delaySec: ios \? IOS_TEST_DELAY_SEC : 0|const delaySec = ios \? IOS_TEST_DELAY_SEC : 0/);
    expect(src("src/app/api/push/test/route.ts")).toContain("testDelaySec(body?.delaySec)");
  });
  it("the refused-tap toast carries the upgrade button", () => {
    const s = src("src/components/alerts/AlertEditor.tsx");
    expect(s).toMatch(/refused > 0[\s\S]{0,700}\{upgrade && /);
  });
  it("PendingLink hands same-page taps to FreshOnReturn", () => {
    expect(src("src/components/ui/PendingLink.tsx")).toContain("SAME_PAGE_EVENT");
    expect(src("src/components/site/FreshOnReturn.tsx")).toContain("SAME_PAGE_EVENT");
  });
});
