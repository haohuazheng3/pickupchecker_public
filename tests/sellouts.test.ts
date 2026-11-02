import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@vercel/functions", () => ({ attachDatabasePool: () => undefined }));
vi.mock("@/components/ui/PendingLink", () => ({ PendingLink: ({ children }: { children: unknown }) => children }));
const { fmtLife, lifeBounds, medianBand, summarize, ROUND_SEC } = await import("@/lib/stock/sellouts");
const { duoSelloutFrom } = await import("@/lib/content/siteFacts");
const { renderToStaticMarkup } = await import("react-dom/server");
const { SellOutTimes } = await import("@/components/restocks/SellOutTimes");

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

describe("SellOutTimes renders data that went through the data cache", () => {
  it("formats times that come back from the cache as ISO strings (a 500 on 2026-11-02)", () => {
    const data = {
      summary: { n: 2, medianSec: 70, within30: 0.5, within60: 0.5, within120: 1, fastestSec: 25, days: 30 },
      byModel: { duo: { n: 3, medianSec: 70, within30: 0.34, within60: 0.67, within120: 1, fastestSec: 25, days: 30 } },
      recent: [
        { id: 1, at: new Date("2026-11-02T13:48:00Z"), storeNumber: "R095", partNumber: "MJWE4LL/A", lowSec: 45, highSec: 60, exact: true, listedSec: null },
        { id: 2, at: new Date("2026-11-02T13:40:00Z"), storeNumber: "R095", partNumber: "MJWD4LL/A", lowSec: null, highSec: null, exact: false, listedSec: 300 },
      ],
    };
    const cached = JSON.parse(JSON.stringify(data));
    const html = renderToStaticMarkup(SellOutTimes({ data: cached, label: "here", showStore: true }));
    expect(html).toContain("sold out in 45–60 s");
    expect(html).toContain("still listed");
    expect(html).toContain("Nov 2, 8:48 AM");
    expect(html).toContain("about 50–70 seconds: half were gone within 70 seconds, 34% within 30 seconds, and the fastest was gone within 25 seconds");
  });
});
