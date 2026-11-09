import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@vercel/functions", () => ({ attachDatabasePool: () => undefined }));
vi.mock("@/components/ui/PendingLink", () => ({ PendingLink: ({ children }: { children: unknown }) => children }));
const { EMPTY_SERVICE_STATS } = await import("@/lib/content/serviceStats");
type ServiceStats = import("@/lib/content/serviceStats").ServiceStats;
const { PLAN_ONLY, deliverySentence, intervalSentence, intlLimit, outcomesLine, share, utcHour } = await import("@/lib/content/serviceCopy");
const { offsetSec } = await import("@/lib/content/serviceHourly");
const { OTHER_TRACKER_CLAIMS, TRACKERS_READ } = await import("@/lib/content/trackers");
const { OTHER_TRACKERS } = await import("@/lib/plans");
const { renderToStaticMarkup } = await import("react-dom/server");
const { DeliveryTable, IntervalTable, ServiceTiles, RestockTimelineView } = await import("@/components/service/ServiceFigures");
const { CostTable, TrackerTable, pickupCheckerCost } = await import("@/components/service/TrackerTables");

const lane = (p50Sec: number, p95Sec: number, gaps: number, hours: number, from = "2026-11-06T01:00:00.000Z") => ({ gaps, hours, from, p50Sec, p95Sec, p99Sec: p95Sec + 1, maxSec: 13, onPlan: 0.97, under: 0.999 });
function stats(over: { usHours?: number; intlP50?: number; push?: boolean } = {}): ServiceStats {
  const w = { "fast-us": lane(5.0, 5.4, 11065683, over.usHours ?? 73), "fast-intl": lane(over.intlP50 ?? 7.7, 10.2, 4803622, 73), "round-us": lane(15, 15, 40320, 168), "round-intl": lane(15, 15, 37669, 160) };
  return {
    ...EMPTY_SERVICE_STATS,
    at: "2026-11-09T02:00:00.000Z",
    since: { "fast-us": "2026-11-06T01:00:00.000Z", "fast-intl": "2026-11-06T01:00:00.000Z", "round-us": "2026-10-30T18:00:00.000Z", "round-intl": "2026-11-02T10:00:00.000Z" },
    lanes: { "24h": w, "7d": w, "30d": w },
    delivery: { "7d": { push: over.push === false ? null : { events: 3085, p50Sec: 1.9, p90Sec: 5.3, p95Sec: 6.2, maxSec: 40 }, email: { events: 12, p50Sec: 2.4, p90Sec: 3.1, p95Sec: 3.3, maxSec: 4 } }, "30d": { push: null, email: null } },
    push7d: { accepted: 5545, rejected: 0, retiredDevices: 3 },
  };
}

describe("measured service wording", () => {
  it("states the measurement against the plan, with sample, window and where a short record starts", () => {
    const s = intervalSentence(stats())!;
    expect(s).toContain("Measured since Nov 6, 2026 (when this record starts), a store with an alert was checked a median **5.0 s** after the previous successful check in the US (p95 5.4 s, 11,065,683 intervals)");
    expect(s).toContain("**7.7 s** in the other countries (p95 10 s, above the plan), against a 5-second plan");
    expect(intervalSentence(stats({ usHours: 168 }))).toContain("Measured over the last 7 days,");
    expect(intervalSentence(stats({ intlP50: 5.3 }))).not.toContain("above the plan");
  });
  it("falls back to the plan, never to 0 s, when nothing is measured", () => {
    expect(intervalSentence(EMPTY_SERVICE_STATS)).toBeNull();
    expect(deliverySentence(EMPTY_SERVICE_STATS)).toBeNull();
    expect(outcomesLine(EMPTY_SERVICE_STATS)).toBeNull();
    expect(PLAN_ONLY).toContain("every 5 s for stores with an alert");
    const html = renderToStaticMarkup(IntervalTable({ st: EMPTY_SERVICE_STATS, detail: true })) + renderToStaticMarkup(DeliveryTable({ st: EMPTY_SERVICE_STATS })) + renderToStaticMarkup(ServiceTiles({ st: EMPTY_SERVICE_STATS }));
    expect(html).toContain("no data in this window yet");
    expect(html).toContain("no alerts on this channel in this window");
    expect(html).not.toMatch(/>0(\.0)?<\/span><span[^>]*>s</);
  });
  it("never calls push acceptance arrival", () => {
    const s = deliverySentence(stats())!;
    expect(s).toContain("accepted the first alert a median **1.9 s** (p90 5.3 s, p95 6.2 s; 3,085 restocks) after the first check that saw the restock");
    expect(s).toContain("is not measured");
    expect(s).not.toMatch(/reaches your phone|on your phone in/);
  });
  it("names the international lane's shortfall only while it runs above plan", () => {
    expect(intlLimit(stats())).toMatch(/^Outside the US, stores with an alert are checked less often than planned: a median 7\.7 s/);
    expect(intlLimit(stats({ intlP50: 5.4 }))).toBeNull();
  });
  it("formats shares and hours honestly at the edges", () => {
    expect(share(0.001)).toBe("<1%");
    expect(share(0.999)).toBe(">99%");
    expect(share(1)).toBe("100%");
    expect(utcHour("2026-11-06T01:00:00.000Z")).toBe("Nov 6, 2026, 01:00 UTC");
    expect(offsetSec("2026-11-09T02:15:12.491Z", "2026-11-09T02:15:13.860Z")).toBe(1.4);
    expect(offsetSec("2026-11-09T02:15:12.491Z", "2026-11-09T02:15:07.317Z")).toBe(-5.2);
    expect(offsetSec("2026-11-09T02:15:12.491Z", null)).toBeNull();
  });
});

describe("one real restock, stage by stage", () => {
  it("shows offsets from the first sighting and says device arrival is not measured", () => {
    const html = renderToStaticMarkup(RestockTimelineView({
      t: { storeNumber: "R715", partNumber: "MK1H4LL/A", firstSeen: "2026-11-09T02:15:12.491Z", prevCheck: "2026-11-09T02:15:07.317Z", confirmed: "2026-11-09T02:15:13.860Z", handed: "2026-11-09T02:15:13.874Z", acceptedFirst: "2026-11-09T02:15:14.025Z", acceptedLast: "2026-11-09T02:15:14.403Z", pushes: 7, lastListed: "2026-11-09T02:15:20.250Z", goneSeen: "2026-11-09T02:15:21.761Z" },
      names: { store: "Apple Example", place: "Austin, TX", config: "iPhone Duo 256GB Night Sky", localTime: "Nov 8, 8:15:12 PM" },
    }));
    for (const s of ["−5.2 s", "+1.4 s", "+1.5 s", "+9.3 s", "first of 7 pushes", "the last of them at +1.9 s", "On the phone: not measured"]) expect(html).toContain(s);
  });
});

describe("tracker comparison", () => {
  it("quotes other trackers as claims, dated, without the cadence wording reserved for our own intervals", () => {
    expect(TRACKERS_READ).toBe("2026-11-09");
    expect(OTHER_TRACKERS).toBe("5 seconds to 15 minutes");
    const ssc = OTHER_TRACKER_CLAIMS.find((t) => t.name === "Store Stock Checker")!;
    expect(ssc.interval).toContain("every 5 seconds");
    for (const t of OTHER_TRACKER_CLAIMS) expect(t.url).toMatch(/^https:\/\/[a-z]+\.com$/);
  });
  it("prices the same need in each tracker's unit, and our row shows plan and measurement", () => {
    expect(pickupCheckerCost(3)).toBe("$5/mo (Plus: 3 of 10 alerts)");
    expect(pickupCheckerCost(10)).toBe("$5/mo (Plus: 10 of 10 alerts)");
    expect(pickupCheckerCost(60)).toMatch(/not offered/);
    const html = renderToStaticMarkup(TrackerTable({ st: stats() })) + renderToStaticMarkup(CostTable({ st: stats() }));
    expect(html).toContain("not independently measured");
    expect(html).toContain('rel="nofollow noopener"');
    expect(html).toContain("planned: 5 s at stores with an alert, 15 s at every store");
    expect(html).toContain("US 5.0 s median, p95 5.4 s");
    expect(html).toContain("(above plan)");
    expect(html).not.toMatch(/fastest|shortest|best/i);
  });
});
