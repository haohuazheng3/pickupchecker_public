import { describe, expect, it } from "vitest";
import { BUCKETS, laneFrom, percentileFromHist, shareUnder } from "@/lib/content/serviceStats";

/** A histogram of 0.1-second buckets from { seconds: count } (seconds rounded down to the bucket). */
const hist = (m: Record<number, number>) => {
  const h = new Array(BUCKETS).fill(0) as number[];
  for (const [s, c] of Object.entries(m)) h[Math.min(BUCKETS - 1, Math.floor(Number(s) * 10 + 1e-9))] += c;
  return h;
};

describe("serviceStats — percentiles from hourly histograms", () => {
  it("interpolates inside the 0.1-second bucket that holds the quantile", () => {
    // 100 gaps of 5.0–5.1 s: the median sits halfway through that bucket.
    expect(percentileFromHist(hist({ 5.0: 100 }), 0.5)).toBe(5.1);
    // 50 at 4.9–5.0 s and 50 at 5.3–5.4 s: the median is the top of the first bucket.
    expect(percentileFromHist(hist({ 4.9: 50, 5.3: 50 }), 0.5)).toBe(5);
    expect(percentileFromHist(hist({ 4.9: 50, 5.3: 50 }), 0.95)).toBe(5.4);
  });
  it("is 0 for an empty histogram and puts 30 s+ in the last bucket", () => {
    expect(percentileFromHist(hist({}), 0.5)).toBe(0);
    expect(percentileFromHist(hist({ 45: 10 }), 0.5)).toBe(30);
  });
  it("shares under a threshold prorate the bucket the threshold cuts", () => {
    expect(shareUnder(hist({ 5.0: 50, 6.5: 50 }), 6)).toBe(0.5);
    expect(shareUnder(hist({ 5.0: 100 }), 5.05)).toBeCloseTo(0.5, 5);
    expect(shareUnder(hist({}), 6)).toBe(0);
  });
});

describe("serviceStats — a lane over a window", () => {
  it("adds the hours, keeps the longest gap and the first hour", () => {
    const s = laneFrom("fast-us", [
      { hour: "2026-11-08T02:00:00.000Z", hist: hist({ 5.0: 600 }), maxMs: 9_000 },
      { hour: "2026-11-08T01:00:00.000Z", hist: hist({ 5.2: 300, 7.5: 100 }), maxMs: 12_345 },
    ])!;
    expect(s.gaps).toBe(1000);
    expect(s.hours).toBe(2);
    expect(s.from).toBe("2026-11-08T01:00:00.000Z");
    expect(s.maxSec).toBe(12.3);
    expect(s.p50Sec).toBeGreaterThanOrEqual(5);
    expect(s.p50Sec).toBeLessThanOrEqual(5.1);
    expect(s.onPlan).toBeCloseTo(0.9, 5); // within planned 5 s + 1 s: the 900 under 6 s
    expect(s.under).toBe(1);
  });
  it("is null without data", () => {
    expect(laneFrom("round-us", [])).toBeNull();
    expect(laneFrom("round-us", [{ hour: "2026-11-08T00:00:00.000Z", hist: hist({}), maxMs: null }])).toBeNull();
  });
});
