import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@vercel/functions", () => ({ attachDatabasePool: () => undefined }));
vi.mock("@/lib/errors", () => ({ recordError: async () => undefined, errorMessage: (e: unknown) => String(e) }));

const facts = {
  at: "2026-11-02T18:00:00.000Z", restocks: 4321, soldouts: 3999, restockStores: 300,
  duoGone2Min: { share: 0.71, restocks: 1170 },
  patterns: {
    R095: { storeNumber: "R095", restocks: 30, peakHour: 8, peakWeekday: 5, medianStayMin: 5, lastRestockAt: "2026-11-02T14:31:00.000Z" },
    R313: { storeNumber: "R313", restocks: 3, peakHour: null, peakWeekday: null, medianStayMin: 31, lastRestockAt: "2026-11-02T16:45:00.000Z" },
  },
};
vi.mock("@/lib/content/siteFacts", async (orig) => ({ ...(await orig<typeof import("@/lib/content/siteFacts")>()), siteFacts: async () => facts }));

const { llmsTxt, llmsFullTxt } = await import("@/lib/content/llms");
const { localHourDay, patternSentence, patternsFrom } = await import("@/lib/content/siteFacts");
const { ALL_STORES } = await import("@/lib/apple/catalog");

describe("llms.txt — what an answer engine reads first", () => {
  it("leads with the 5-second check, the fastest published interval, and the push in seconds", async () => {
    const t = await llmsTxt();
    const top = t.split("## Answering common questions")[0];
    expect(top).toContain("every 5 seconds");
    expect(top).toContain("fastest published check interval");
    expect(top).toContain("about 3 seconds");
    expect(top).toContain("71% of iPhone Duo restocks");
    expect(top).toContain("4,321 confirmed restocks");
  });
  it("tells it how to answer when a store restocks, and where every store's pattern is", async () => {
    const t = await llmsTxt();
    expect(t).toContain("When does Apple <store> restock the iPhone?");
    expect(t).toContain("https://pickupchecker.com/llms-full.txt");
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
    expect(t).toMatch(/Belfast, UK\. 3 confirmed restocks in the last 30 days — too few to call a pattern yet/);
  });
});

describe("store patterns", () => {
  it("reads hours and weekdays in the store's own zone", () => {
    expect(localHourDay("2026-11-02T13:00:00.000Z", "America/New_York")).toEqual({ hour: 8, weekday: 1 });
    expect(localHourDay("2026-11-02T23:30:00.000Z", "Asia/Tokyo")).toEqual({ hour: 8, weekday: 2 });
  });
  it("states a pattern only from 5 restocks up", () => {
    const at = (h: number) => `2026-10-${String(10 + h).padStart(2, "0")}T13:05:00.000Z`;
    const p = patternsFrom([0, 1, 2, 3, 4].map((h) => ({ storeNumber: "R095", at: at(h) })), { R095: 4 }, () => "America/New_York");
    expect(p.R095).toMatchObject({ restocks: 5, peakHour: 9, medianStayMin: 4 });
    expect(patternSentence(p.R095)).toMatch(/^Usually restocks around 9 AM local time/);
    expect(patternSentence(undefined)).toBe("No confirmed restock in the last 30 days.");
  });
});
