import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@vercel/functions", () => ({ attachDatabasePool: () => undefined }));
const { fmtLife, lifeBounds, medianBand, summarize, ROUND_SEC } = await import("@/lib/stock/sellouts");
const { duoSelloutFrom } = await import("@/lib/content/siteFacts");

const t = (s: number) => new Date(Date.UTC(2026, 10, 2, 15, 0, 0) + s * 1000);

describe("lifeBounds — how long one restock lasted, between two checks", () => {
  it("is exact between the last check that saw it and the first that did not", () => {
    expect(lifeBounds(t(0), t(60), t(45))).toEqual({ lowSec: 45, highSec: 60, exact: true });
  });
  it("falls back to the 15-second round without a last sighting (older sell-outs)", () => {
    expect(lifeBounds(t(0), t(62), null)).toEqual({ lowSec: 62 - ROUND_SEC, highSec: 62, exact: false });
    expect(lifeBounds(t(0), t(9), null)).toEqual({ lowSec: 0, highSec: 9, exact: false });
  });
  it("ignores a last sighting outside the restock's life", () => {
    expect(lifeBounds(t(0), t(30), t(-5)).exact).toBe(false);
  });
  it("has no bounds while the restock is still listed", () => {
    expect(lifeBounds(t(0), null, null)).toEqual({ lowSec: null, highSec: null, exact: false });
  });
});

describe("wording", () => {
  it("prints a range in seconds, minutes past two", () => {
    expect(fmtLife(45, 60)).toBe("45–60 s");
    expect(fmtLife(58, 58)).toBe("58 s");
    expect(fmtLife(125, 140)).toBe("2 min 05 s – 2 min 20 s");
  });
  it("puts a median into the 20-second band the headline quotes", () => {
    expect(medianBand(79)).toBe("60–80 seconds");
    expect(medianBand(61)).toBe("50–70 seconds");
    expect(medianBand(8)).toBe("0–20 seconds");
  });
  it("summarises lifetimes", () => {
    expect(summarize([10, 25, 70, 80, 200], 30)).toMatchObject({ n: 5, medianSec: 70, within30: 0.4, within60: 0.4, within120: 0.8, fastestSec: 10 });
  });
});

describe("duoSelloutFrom — the site-wide Duo facts", () => {
  it("needs 20 restocks, then gives the median, the 30-second share and what slower trackers would catch", () => {
    expect(duoSelloutFrom([60, 70])).toBeNull();
    const f = duoSelloutFrom([...Array(18).fill(80), 20, 25])!;
    expect(f).toMatchObject({ n: 20, medianSec: 80, within30: 0.1 });
    // a 5-minute tracker sees an 80-second listing 80/300 of the time
    expect(f.caught.m5).toBeCloseTo((18 * 80 / 300 + 20 / 300 + 25 / 300) / 20, 5);
    expect(f.caught.m1).toBeLessThan(1);
  });
});
