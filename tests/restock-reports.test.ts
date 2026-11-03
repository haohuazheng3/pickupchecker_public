import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { andList, collapseReports, localTime, parseReportFile, reportLegend, reportRange, reportSeries, reportSlots, withoutOurs, REPORT_SOURCES, type ReportInput, type ReportSeries } from "@/lib/restockReports";
import { placeNow } from "@/lib/restockTimes";
import { RestockClock } from "@/components/restocks/RestockClock";
import { RestockTimeline, type TimelineRow } from "@/components/account/RestockTimeline";
import type { RestockStats } from "@/lib/stock/queries";

/* The account module reads the database through these; each test sets what they return. */
const fake: { reports: ReportSeries | null } = { reports: null };
vi.mock("@/lib/stock/queries", () => ({
  restockPattern: async (_s: string[], _p: string[], _e: string[], tz: string) => ({ total: 2, byHour: Array.from({ length: 24 }, (_, h) => (h === 9 ? 2 : 0)), byWeekday: [0, 0, 2, 0, 0, 0, 0], days: 30, tz, exact: { total: 0, byHour: Array(24).fill(0) }, stores: [] }),
  restockSlots: async () => [{ slot: 36, store: "R095", drops: 2, mins: 545 }],
  placeStats: async () => ({ medianMs: null, medianSamples: 0 }),
  restockReportStats: async () => fake.reports,
}));

const NOW = Date.parse("2026-11-02T12:00:00Z");
const r = (storeNumber: string, partNumber: string, at: string, source: string, model = "iPhone Duo"): ReportInput => ({ storeNumber, partNumber, at, source, model });
/** R095 = Fifth Avenue (New York). Times are UTC; US DST ended 2026-11-01 06:00 UTC. */
const ROWS: ReportInput[] = [
  r("R095", "MK1E4LL/A", "2026-10-27T13:21:00Z", "Apple Pickup Live"), // Tue 9:21 AM EDT
  r("R095", "MK1E4LL/A", "2026-10-27T13:25:00Z", "DuoReady"), //          the same restock, the other tracker
  r("R095", "MK1H4LL/A", "2026-10-30T18:05:00Z", "DuoReady"), //          Fri 2:05 PM EDT
  r("R095", "MK1E4LL/A", "2026-11-01T06:30:00Z", "DuoReady"), //          Sun 1:30 AM EST (after the change)
  r("R095", "MJQ34LL/A", "2026-10-31T15:00:00Z", "DuoReady", "iPhone 18 Pro"), // Sat 11 AM EDT
  r("R250", "MK1E4LL/A", "2026-10-26T13:21:00Z", "Apple Pickup Live"), // another store: the data's first day
  r("R250", "MK1E4LL/A", "2026-11-01T23:47:00Z", "DuoReady"), //          …and its last (6:47 PM EST, Nov 1)
  r("R095", "MK1E4LL/A", "2026-09-01T12:00:00Z", "DuoReady"), //          outside the 30-day window
];
const nyc = (o: Partial<Parameters<typeof reportSeries>[1]> = {}) => reportSeries(ROWS, { tz: "America/New_York", days: 30, now: NOW, ...o });

describe("other trackers' reports — import", () => {
  const ours = [{ storeNumber: "R095", partNumber: "MK1E4LL/A", at: "2026-10-27T13:30:00Z" }];
  it("skips a report within ±10 minutes of one of our own restocks of the same store × part", () => {
    const reps = [
      r("R095", "MK1E4LL/A", "2026-10-27T13:20:00Z", "A"), // 10 min before ours: same restock (inclusive)
      r("R095", "MK1E4LL/A", "2026-10-27T13:40:00Z", "A"), // 10 min after
      r("R095", "MK1E4LL/A", "2026-10-27T13:19:59Z", "A"), // just outside
      r("R095", "MK1E4LL/A", "2026-10-27T13:40:01Z", "A"),
      r("R095", "MK1H4LL/A", "2026-10-27T13:30:00Z", "A"), // another part
      r("R032", "MK1E4LL/A", "2026-10-27T13:30:00Z", "A"), // another store
    ];
    const { kept, duplicates } = withoutOurs(reps, ours);
    expect(duplicates.map((x) => x.at)).toEqual(["2026-10-27T13:20:00Z", "2026-10-27T13:40:00Z"]);
    expect(kept).toHaveLength(4);
  });
  it("keeps everything when we have nothing near it", () => {
    expect(withoutOurs(ROWS, []).kept).toHaveLength(ROWS.length);
  });
  it("checks a file: well-formed reports through, each malformed one named", () => {
    const { reports, problems } = parseReportFile({ reports: [
      { storeNumber: "R095", partNumber: "MK1E4LL/A", at: "2026-10-27T13:21:00.000Z", source: " DuoReady ", sourceUrl: "https://x", kind: "snapshot" },
      { storeNumber: "95", partNumber: "MK1E4LL/A", at: "2026-10-27T13:21:00Z", source: "DuoReady", kind: "snapshot" },
      { storeNumber: "R095", partNumber: "MK1E4LL/A", at: "yesterday", source: "DuoReady", kind: "snapshot" },
    ] });
    expect(reports).toEqual([{ storeNumber: "R095", partNumber: "MK1E4LL/A", at: "2026-10-27T13:21:00.000Z", source: "DuoReady", sourceUrl: "https://x", kind: "snapshot" }]);
    expect(problems).toEqual(["report 1: bad storeNumber", "report 2: bad at"]);
    expect(parseReportFile({}).problems).toEqual(["no reports array"]);
  });
});

describe("other trackers' reports — grouping", () => {
  it("counts one restock once when both trackers report it, but keeps one tracker's two sightings", () => {
    expect(collapseReports(ROWS.slice(0, 2)).map((x) => x.source)).toEqual(["Apple Pickup Live"]);
    const same = [r("R1", "P", "2026-10-27T13:21:00Z", "DuoReady"), r("R1", "P", "2026-10-27T13:27:00Z", "DuoReady")];
    expect(collapseReports(same)).toHaveLength(2);
    expect(collapseReports([r("R1", "P", "2026-10-27T13:00:00Z", "A"), r("R1", "P", "2026-10-27T13:11:00Z", "B")])).toHaveLength(2);
  });

  it("puts reports in the store's local hour and weekday, across the DST change", () => {
    expect(localTime(Date.parse("2026-10-27T13:21:00Z"), "America/New_York")).toEqual({ day: "2026-10-27", hour: 9, minute: 21, dow: 2 });
    expect(localTime(Date.parse("2026-10-27T13:21:00Z"), "America/Los_Angeles").hour).toBe(6);
    expect(localTime(Date.parse("2026-11-01T05:30:00Z"), "America/New_York")).toMatchObject({ hour: 1, minute: 30, dow: 0 }); // 1:30 EDT
    expect(localTime(Date.parse("2026-11-01T06:30:00Z"), "America/New_York")).toMatchObject({ hour: 1, minute: 30, dow: 0 }); // 1:30 EST
    expect(localTime(Date.parse("2026-11-02T04:30:00Z"), "America/New_York")).toMatchObject({ day: "2026-11-01", hour: 23 });
  });

  it("builds one store's series: window, collapse, local hours, trackers, models, the data's dates", () => {
    const s = nyc({ stores: ["R095"] })!;
    expect(s.total).toBe(4);
    expect(s.byHour.flatMap((n, h) => (n ? [`${h}:${n}`] : []))).toEqual(["1:1", "9:1", "11:1", "14:1"]);
    expect(s.byWeekday).toEqual([1, 0, 1, 0, 0, 1, 1]);
    expect(s.sources).toEqual([{ name: "Apple Pickup Live", url: REPORT_SOURCES["Apple Pickup Live"] }, { name: "DuoReady", url: REPORT_SOURCES.DuoReady }]);
    expect(s.models).toEqual(["iPhone Duo", "iPhone 18 Pro"]);
    // The dates are what the trackers' data covers (every report in the window), not only this store's.
    expect([s.from, s.to]).toEqual(["2026-10-26", "2026-11-01"]);
  });

  it("narrows to the module's parts and stores, and is null where there is nothing to draw", () => {
    expect(nyc({ stores: ["R095"], parts: ["MK1E4LL/A", "MK1H4LL/A"] })!.total).toBe(3);
    expect(nyc({ stores: ["R095"], parts: ["MK1E4LL/A", "MK1H4LL/A"] })!.models).toEqual(["iPhone Duo"]);
    expect(nyc({ stores: ["R032"] })).toBeNull();
    expect(nyc({ stores: ["R095"], parts: ["MJWE4LL/A"] })).toBeNull();
    expect(reportSeries(ROWS, { tz: "America/New_York", days: 30, now: Date.parse("2027-01-01T00:00:00Z") })).toBeNull();
    expect(reportSeries([], { tz: "America/New_York", days: 30, now: NOW })).toBeNull();
  });

  it("makes the timeline's slots by our own rule: a store's reports within one 10-minute window are one drop", () => {
    expect(reportSlots(ROWS.slice(0, 2), "America/New_York")).toEqual([{ slot: 37, store: "R095", drops: 1, mins: 561 }]);
    expect(reportSlots([ROWS[0], ROWS[2]], "America/New_York").map((x) => x.slot)).toEqual([37, 56]);
  });

  it("labels the series with the trackers and the dates", () => {
    const s = nyc({ stores: ["R095"] })!;
    expect(reportRange(s)).toBe("Oct 26 – Nov 1");
    expect(reportRange({ from: "2026-10-30", to: "2026-10-30" })).toBe("Oct 30");
    expect(reportLegend(s)).toBe("Reported by other trackers (Apple Pickup Live, DuoReady), Oct 26 – Nov 1");
    expect(andList(["A", "B", "C"])).toBe("A, B and C");
  });
});

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const STATS: RestockStats = { total: 6, byHour: Array.from({ length: 24 }, (_, h) => (h === 9 ? 4 : h === 14 ? 2 : 0)), byWeekday: [0, 2, 4, 0, 0, 0, 0], days: 30, tz: "America/New_York" };

describe("RestockClock with reports", () => {
  it("renders exactly as before when a place has no reports", () => {
    const plain = html(createElement(RestockClock, { stats: STATS, label: "here" }));
    expect(html(createElement(RestockClock, { stats: STATS, label: "here", reports: null }))).toBe(plain);
    expect(plain).not.toMatch(/Reported|data-series|nofollow|Confirmed by/);
    expect(html(createElement(RestockClock, { stats: { ...STATS, total: 0, byHour: Array(24).fill(0), byWeekday: Array(7).fill(0) }, label: "here", reports: null }))).not.toContain("By hour");
  });

  it("adds a separate, labelled series, keeps the sentence ours only, and links both trackers", () => {
    const out = html(createElement(RestockClock, { stats: STATS, label: "here", reports: nyc({ stores: ["R095"] }) }));
    expect(out).toContain("6 restocks here in the last 30 days"); // ours only: the 4 reports are not added
    expect(out).toContain("Confirmed by PickupChecker");
    expect(out).toContain("Reported by other trackers (Apple Pickup Live, DuoReady), Oct 26 – Nov 1");
    expect(out).toContain(`href="https://pickup.o1xhack.com/" target="_blank" rel="nofollow noopener"`);
    expect(out).toContain(`href="https://getduoready.com/stock/" target="_blank" rel="nofollow noopener"`);
    expect(out).toContain("not restocks PickupChecker confirmed");
    // A dashed segment per hour and weekday with reports (4 + 4), plus the legend entry.
    expect(out.match(/data-series="reported"/g)).toHaveLength(9);
  });

  it("draws the reports even where we have none yet, and says ours is zero", () => {
    const out = html(createElement(RestockClock, { stats: { ...STATS, total: 0, byHour: Array(24).fill(0), byWeekday: Array(7).fill(0) }, label: "here", reports: nyc({ stores: ["R095"] }) }));
    expect(out).toContain("No restocks recorded here in the last 30 days yet.");
    expect(out).toContain("By hour · New York time");
    expect(out).toContain("Reported by other trackers");
  });
});

describe("restock timeline with reports", () => {
  const ours: TimelineRow = { min: 540, drops: 2, mine: true, where: "Fifth Avenue", whereAll: "Fifth Avenue 2×" };
  const reported: TimelineRow = { min: 600, drops: 1, mine: false, reported: true, where: "Fifth Avenue", whereAll: "Fifth Avenue 1×" };
  const meta = { sources: [{ name: "DuoReady", url: REPORT_SOURCES.DuoReady }], models: ["iPhone Duo"], from: "2026-10-26", to: "2026-11-01" };
  const props = { nowMin: 570, tz: "America/New_York", zone: "Eastern", days: 30, hidden: 0, yours: "your store", mixed: false };

  it("never makes a report the next time", () => {
    expect(placeNow([{ min: 540 }, { min: 600, r: true }], 570, (p) => !("r" in p))).toEqual({ before: 1, next: 0, inMin: 1410, tomorrow: true });
    expect(placeNow([{ min: 600, r: true }], 570, (p) => !("r" in p))).toEqual({ before: 0, next: null, inMin: 0, tomorrow: false });
    expect(placeNow([{ min: 540 }, { min: 600 }], 570)).toEqual({ before: 1, next: 1, inMin: 30, tomorrow: false });
  });

  it("lists reports as their own rows with a legend and the footnote; ours keep the next time", () => {
    const out = html(createElement(RestockTimeline, { ...props, rows: [ours, reported], reported: meta }));
    expect(out).toContain("Reported · Fifth Avenue");
    expect(out).toContain("Next: 9:00 AM tomorrow"); // the 10:00 report ahead of now is not "next"
    expect(out).toContain("Reported by other trackers (DuoReady), Oct 26 – Nov 1");
    expect(out).toContain(`rel="nofollow noopener"`);
    const plain = html(createElement(RestockTimeline, { ...props, rows: [ours] }));
    expect(plain).not.toMatch(/Reported|nofollow|data-series/);
  });
});

describe("account: When your stores restock, with reports", () => {
  const watches = [{ active: true, model: "duo", storages: ["256GB"], colors: ["Night Sky"], storeNumbers: ["R095"] }];
  it("adds dashed report marks, the legend and the footnote to the user's stores' chart and timeline", async () => {
    const { RestockTimes } = await import("@/components/account/RestockTimes");
    fake.reports = nyc({ stores: ["R095"], parts: ["MK1E4LL/A", "MK1H4LL/A"] });
    const out = html((await RestockTimes({ watches }))!);
    expect(out).toContain("Reported by other trackers (Apple Pickup Live, DuoReady), Oct 26 – Nov 1");
    expect(out).toContain("Hollow dots: iPhone Duo restocks published by");
    expect(out).toContain("Reported · Fifth Avenue");
    // Ours only, as the count tile: the value, then its label.
    expect(out).toContain(">2</span>");
    expect(out).toContain("restocks at your store · last 30 days · too few for a pattern");
    fake.reports = null;
    const plain = html((await RestockTimes({ watches }))!);
    expect(plain).not.toMatch(/Reported|nofollow|data-series/);
  });
});

describe("the reports' source files stay private", () => {
  it("nothing the site serves or bundles reads data/restock-reports", () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir)) {
        const p = join(dir, e);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx|mjs|js|json)$/.test(e) && /(from|import\(|require\(|readFile\w*\()\s*["'`][^"'`]*restock-reports/.test(readFileSync(p, "utf8"))) hits.push(p);
      }
    };
    walk(join(process.cwd(), "src"));
    walk(join(process.cwd(), "public"));
    expect(hits).toEqual([]);
  });

  it.skipIf(!existsSync(".public-allowlist"))("is not in .public-allowlist (the public mirror never gets the files or their importer)", () => {
    // The same glob rules as scripts/publish-public.mjs.
    const globToRe = (g: string) => {
      let re = "";
      for (let i = 0; i < g.length; i++) {
        const c = g[i];
        if (c === "*" && g[i + 1] === "*") { if (g[i + 2] === "/") { re += "(?:.*/)?"; i += 2; } else { re += ".*"; i += 1; } }
        else if (c === "*") re += "[^/]*";
        else if (c === "?") re += "[^/]";
        else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
      }
      return new RegExp(`^${re}$`);
    };
    const allow = readFileSync(".public-allowlist", "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map(globToRe);
    for (const f of ["data/restock-reports/us-duo-2026-10-26.json", "data/restock-reports/next.json", "scripts/import-restock-reports.ts"]) expect(allow.some((re) => re.test(f)), f).toBe(false);
  });
});
