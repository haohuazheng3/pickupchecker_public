import { describe, expect, it } from "vitest";
import { buildTimeline, clockLabel, gapLabel, minuteIn, placeNow } from "@/lib/restockTimes";

const row = (slot: number, store: string, drops: number, mins = slot * 15 + 7) => ({ slot, store, drops, mins });

describe("restock timeline", () => {
  it("keeps 15-minute slots while few, earliest first, minutes rounded to 5", () => {
    const t = buildTimeline([row(40, "R1", 2, 602), row(8, "R2", 1, 121), row(40, "R2", 1, 608)]);
    expect(t.step).toBe(15);
    expect(t.points.map((p) => p.min)).toEqual([120, 605]);
    expect(t.points[1]).toMatchObject({ drops: 3, stores: [{ storeNumber: "R1", drops: 2 }, { storeNumber: "R2", drops: 1 }] });
    expect(t.total).toBe(4);
    expect(t.hidden).toBe(0);
  });

  it("merges into half hours, then hours, when there are too many", () => {
    const many = Array.from({ length: 30 }, (_, i) => row(i * 2, "R1", 1));
    const t = buildTimeline(many, 12);
    expect(t.step).toBe(60);
    expect(t.points.length).toBe(12);
    expect(t.hidden).toBe(30 - t.points.reduce((a, p) => a + p.drops, 0));
    expect(t.points.map((p) => p.min)).toEqual([...t.points.map((p) => p.min)].sort((a, b) => a - b));
  });

  it("places now between points and finds the next, wrapping to tomorrow", () => {
    const pts = [{ min: 360 }, { min: 600 }, { min: 900 }];
    expect(placeNow(pts, 300)).toEqual({ before: 0, next: 0, inMin: 60, tomorrow: false });
    expect(placeNow(pts, 642)).toEqual({ before: 2, next: 2, inMin: 258, tomorrow: false });
    expect(placeNow(pts, 600)).toEqual({ before: 1, next: 1, inMin: 0, tomorrow: false });
    expect(placeNow(pts, 1000)).toEqual({ before: 3, next: 0, inMin: 800, tomorrow: true });
    expect(placeNow([], 500).next).toBeNull();
  });

  it("says times and gaps plainly", () => {
    expect(clockLabel(0)).toBe("12:00 AM");
    expect(clockLabel(565)).toBe("9:25 AM");
    expect(clockLabel(780)).toBe("1:00 PM");
    expect(gapLabel(48)).toBe("48 min");
    expect(gapLabel(125)).toBe("2 h 5 min");
    expect(gapLabel(180)).toBe("3 h");
  });

  it("reads the minute of the day in a zone", () => {
    expect(minuteIn("America/New_York", new Date("2026-10-30T14:37:00Z"))).toBe(10 * 60 + 37);
    expect(minuteIn("America/Los_Angeles", new Date("2026-10-30T07:05:00Z"))).toBe(5);
  });
});
