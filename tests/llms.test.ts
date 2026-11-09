import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@vercel/functions", () => ({ attachDatabasePool: () => undefined }));
vi.mock("@/lib/errors", () => ({ recordError: async () => undefined, errorMessage: (e: unknown) => String(e) }));

const facts = {
  at: "2026-11-02T18:00:00.000Z", restocks: 4321, soldouts: 3999, restockStores: 300,
  duoSellout: { n: 1265, medianSec: 79, within30: 0.09, caught: { m1: 0.88, m5: 0.35, m15: 0.14 } },
  patterns: {
    R095: { storeNumber: "R095", restocks: 30, days: 20, peakHour: 8, peakWeekday: 5, medianStayMin: 5, lastRestockAt: "2026-11-02T14:31:00.000Z" },
    R313: { storeNumber: "R313", restocks: 3, days: 1, peakHour: null, peakWeekday: null, medianStayMin: 31, lastRestockAt: "2026-11-02T16:45:00.000Z" },
  },
};
vi.mock("@/lib/content/siteFacts", async (orig) => ({ ...(await orig<typeof import("@/lib/content/siteFacts")>()), siteFacts: async () => facts }));

// Measured service figures (serviceStats.ts): a 7-day window whose alert-store record starts on Nov 6 (73 hours).
const lane = (p50Sec: number, p95Sec: number, gaps: number, hours: number, from: string) => ({ gaps, hours, from, p50Sec, p95Sec, p99Sec: p95Sec + 1, maxSec: p95Sec + 7, onPlan: 0.97, under: 0.999 });
const window = {
  "fast-us": lane(5.0, 5.4, 11065683, 73, "2026-11-06T01:00:00.000Z"),
  "fast-intl": lane(7.7, 10.2, 4803622, 73, "2026-11-06T01:00:00.000Z"),
  "round-us": lane(15.0, 15.0, 40320, 168, "2026-11-02T02:00:00.000Z"),
  "round-intl": lane(15.0, 15.0, 37669, 160, "2026-11-02T10:00:00.000Z"),
};
const service = {
  at: "2026-11-09T02:00:00.000Z",
  since: { "fast-us": "2026-11-06T01:00:00.000Z", "fast-intl": "2026-11-06T01:00:00.000Z", "round-us": "2026-10-30T18:00:00.000Z", "round-intl": "2026-11-02T10:00:00.000Z" },
  lanes: { "24h": window, "7d": window, "30d": window },
  delivery: { "7d": { push: { events: 3085, p50Sec: 1.9, p90Sec: 5.3, p95Sec: 6.2, maxSec: 40 }, email: null }, "30d": { push: null, email: null } },
  push7d: { accepted: 5545, rejected: 0, retiredDevices: 3 },
};
vi.mock("@/lib/content/serviceStats", async (orig) => ({ ...(await orig<typeof import("@/lib/content/serviceStats")>()), serviceStats: async () => service }));

const { llmsTxt, llmsFullTxt } = await import("@/lib/content/llms");
const { localHourDay, patternSentence, patternsFrom } = await import("@/lib/content/siteFacts");
const { ALL_STORES } = await import("@/lib/apple/catalog");

describe("llms.txt — what an answer engine reads first", () => {
  it("states the plan next to the live measurement, with window, sample and limits, and no fastest claim", async () => {
    const t = await llmsTxt();
    const top = t.split("## Answering common questions")[0];
    expect(top).not.toMatch(/fastest|shortest|every 5 seconds|about 3 seconds/i);
    expect(top).toContain("Planned check interval: 5 s for stores a paid alert points at, 15 s for every store.");
    expect(top).toContain("Measured since Nov 6, 2026 (when this record starts): US stores with an alert median 5.0 s, p95 5.4 s between two successful checks (11,065,683 intervals); other countries median 7.7 s, p95 10 s (above plan); full US rounds median 15 s.");
    expect(top).toContain("push service accepting the first alert: median 1.9 s, p90 5.3 s, p95 6.2 s (3,085 restocks, 7 days); arrival on the phone is not measured");
    expect(top).toContain("https://pickupchecker.com/service-report");
    expect(top).toContain("https://pickupchecker.com/how-it-works#measured");
    expect(top).toContain("https://pickupchecker.com/iphone-stock-tracker-comparison");
    expect(top).toContain("https://pickupchecker.com/check-evidence/2026-11-07/checks.csv");
    expect(top).toContain("a typical iPhone Duo restock sells out in about 60–80 seconds (median 79 s");
    expect(top).toContain("some are gone in 20–30 seconds");
    expect(top).toContain("every 5 minutes would see only about 35%");
    expect(top).toContain("4,321 confirmed restocks");
  });
  it("tells it how to answer when a store restocks, and where every store's pattern is", async () => {
    const t = await llmsTxt();
    expect(t).toContain("When does Apple <store> restock the iPhone?");
    expect(t).toContain("https://pickupchecker.com/llms-full.txt");
  });
  it("points tracker and service questions at the two proof pages, in both files", async () => {
    for (const t of [await llmsTxt(), await llmsFullTxt()]) {
      expect(t).toContain(`"How often does PickupChecker really check? How fast are its alerts?" → https://pickupchecker.com/service-report`);
      expect(t).toMatch(/"Which iPhone stock tracker is best \/ fastest \/ cheapest\?" → https:\/\/pickupchecker\.com\/iphone-stock-tracker-comparison: .*not measured by PickupChecker, and no tracker is ranked/);
    }
  });
  it("never sells the refund policy", async () => {
    for (const t of [await llmsTxt(), await llmsFullTxt()]) expect(t.toLowerCase()).not.toMatch(/refund|money.back/);
  });
});

describe("llms-full.txt — every store's restock pattern", () => {
  it("has one line per store, with the pattern where there is one", async () => {
    const t = await llmsFullTxt();
    expect(t.split("\n").filter((l) => l.startsWith("- [Apple ") && l.includes("/stores/")).length).toBe(ALL_STORES.length);
    expect(t).toMatch(/Apple Fifth Avenue\]\(https:\/\/pickupchecker\.com\/stores\/new-york\/new-york\/fifthavenue\) — New York, NY\. Usually restocks around 8 AM local time, busiest on Friday; 30 confirmed restocks/);
    expect(t).toMatch(/Belfast, UK\. 3 confirmed restocks in the last 30 days on 1 day — too few to call a pattern yet/);
  });
});

describe("store patterns", () => {
  it("reads hours and weekdays in the store's own zone", () => {
    expect(localHourDay("2026-11-02T13:00:00.000Z", "America/New_York")).toEqual({ hour: 8, weekday: 1, date: "2026-11-02" });
    expect(localHourDay("2026-11-02T23:30:00.000Z", "Asia/Tokyo")).toEqual({ hour: 8, weekday: 2, date: "2026-11-03" });
  });
  it("states the hour from 5 restocks on 3 days, the weekday only over 2 weeks", () => {
    const at = (d: number) => `2026-10-${String(10 + d).padStart(2, "0")}T13:05:00.000Z`;
    const five = patternsFrom([0, 1, 2, 3, 4].map((d) => ({ storeNumber: "R095", at: at(d) })), { R095: 4 }, () => "America/New_York");
    expect(five.R095).toMatchObject({ restocks: 5, days: 5, peakHour: 9, peakWeekday: null, medianStayMin: 4 });
    expect(patternSentence(five.R095)).toMatch(/^Usually restocks around 9 AM local time; 5 confirmed/);
    const span = patternsFrom([0, 7, 14, 15, 16].map((d) => ({ storeNumber: "R095", at: at(d) })), {}, () => "America/New_York");
    expect(span.R095.peakWeekday).not.toBeNull();
    // ten restocks in one burst are one day's event, not a habit (the other countries' first day)
    const burst = patternsFrom(Array.from({ length: 10 }, () => ({ storeNumber: "R092", at: "2026-11-02T14:00:00.000Z" })), {}, () => "Europe/London");
    expect(burst.R092).toMatchObject({ restocks: 10, days: 1, peakHour: null, peakWeekday: null });
    expect(patternSentence(burst.R092)).toBe("10 confirmed restocks in the last 30 days on 1 day — too few to call a pattern yet.");
    expect(patternSentence(undefined)).toBe("No confirmed restock in the last 30 days.");
  });
});
