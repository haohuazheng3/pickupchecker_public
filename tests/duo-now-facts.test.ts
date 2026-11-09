import { describe, expect, it, vi } from "vitest";

/* 2026-11-09 "evidence first": the DuoNow block's Key facts, evidence line, method line and Dataset JSON-LD, rendered
   from a fixture (components/restocks/DuoNow.tsx). Numbers are fixtures; production reads them live. */

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@vercel/functions", () => ({ attachDatabasePool: () => undefined }));
vi.mock("@/components/ui/PendingLink", async () => {
  const { createElement } = await import("react");
  return { PendingLink: ({ children, href, className }: { children: unknown; href: string; className?: string }) => createElement("a", { href, className }, children as never) };
});
const { createElement } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { DuoNowView, keyFacts, howCountedText, lanesFor, MEDIAN_MIN, MEASURED_HREF } = await import("@/components/restocks/DuoNow");
const { duoNowFrom } = await import("@/lib/content/duoNow");
const { emptyRestockTimes } = await import("@/lib/content/restockTimes");
const { EMPTY_SERVICE_STATS } = await import("@/lib/content/serviceStats");
const { storesOf, partNumbersFor, appleName } = await import("@/lib/apple/catalog");
const { dict } = await import("@/lib/i18n/dict");
const { LANGS } = await import("@/lib/i18n/locales");
type ServiceStats = import("@/lib/content/serviceStats").ServiceStats;
type LaneStats = import("@/lib/content/serviceStats").LaneStats;
type Sellouts = import("@/lib/stock/sellouts").Sellouts;
type StockLike = import("@/lib/content/duoNow").StockLike;
type DuoNowData = import("@/lib/content/duoNow").DuoNow;

const mi = storesOf("us").filter((s) => s.state === "Michigan");
const duo = partNumbersFor("duo");
const at = (h: number, m = 0) => new Date(Date.UTC(2026, 10, 8, h, m)).toISOString();
const NOW = new Date(Date.UTC(2026, 10, 8, 15, 22, 30)); // 10:22 AM Eastern, Nov 8; stores answered 4 s earlier
const noSell: Sellouts = { summary: { n: 0, medianSec: null, within30: 0, within60: 0, within120: 0, fastestSec: null, days: 30 }, byModel: {}, recent: [] };
const hours = (m: Record<number, number>) => Array.from({ length: 24 }, (_, h) => m[h] ?? 0);

function stockFor(stores: typeof mi, o: { duoAt?: Record<string, string[]>; checkedAgoSec?: Record<string, number> } = {}): Map<string, StockLike> {
  const map = new Map<string, StockLike>();
  for (const s of stores) {
    const parts = o.duoAt?.[s.storeNumber] ?? [];
    const ago = o.checkedAgoSec?.[s.storeNumber] ?? 4;
    map.set(s.storeNumber, { lastCheckedAt: new Date(NOW.getTime() - ago * 1000), perModel: { duo: { available: parts.length, parts }, "18-pro": { available: 9, parts: [] }, "18-pro-max": { available: 7, parts: [] } } });
  }
  return map;
}

/** A Michigan state page: 53 restocks on 10 days, 66% between 9 and 11 AM, a median from 40 timed listings. */
function stateData(over: { stale?: boolean } = {}): DuoNowData {
  const byHour = hours({ 8: 5, 9: 21, 10: 14, 11: 4, 13: 3, 15: 3, 17: 2, 19: 1 });
  const times = {
    ...emptyRestockTimes("us", NOW, { stores: mi }), n: 53, days: 10, byHour, peakHour: 9,
    today: { date: "2026-11-08", weekday: 0, restocks: 2, stores: 2, peakHour: 9, ours: true },
    latest: { storeNumber: mi[0].storeNumber, partNumber: duo[0], at: at(14, 41) },
    byPart: [{ partNumber: duo[0], restocks: 19, lastAt: at(14, 41), lastStore: mi[0].storeNumber }],
    sellout: { n: 40, medianSec: 93, within2min: 0.6, within20min: 1, fastestSec: 6 },
  };
  const sell: Sellouts = { ...noSell, recent: [
    { id: 1, at: new Date(at(14, 41)), storeNumber: mi[0].storeNumber, partNumber: duo[0], lowSec: 85, highSec: 90, exact: true, listedSec: null },
    { id: 2, at: new Date(at(13, 58)), storeNumber: mi[1].storeNumber, partNumber: duo[1], lowSec: 300, highSec: 305, exact: true, listedSec: null },
    { id: 3, at: new Date(at(13, 12)), storeNumber: mi[2].storeNumber, partNumber: duo[0], lowSec: 40, highSec: 45, exact: true, listedSec: null },
  ] };
  const stock = stockFor(mi, over.stale ? { checkedAgoSec: { [mi[5].storeNumber]: 190 } } : {});
  return duoNowFrom({ stores: mi, stock, times, sell, alerts: { days: 7, sent: 45, stores: 5 }, configsTotal: 8, now: NOW });
}

/** A store page: 12 restocks on 6 days (a usual hour), a median from only 6 timed listings (not stated), stock now. */
function storeData(): DuoNowData {
  const one = [mi[0]];
  const times = {
    ...emptyRestockTimes("us", NOW, { stores: one }), n: 12, days: 6, byHour: hours({ 9: 5, 10: 3, 14: 2, 16: 2 }), peakHour: 9,
    today: { date: "2026-11-08", weekday: 0, restocks: 0, stores: 0, peakHour: null, ours: true },
    latest: { storeNumber: mi[0].storeNumber, partNumber: duo[2], at: at(15, 19) },
    byPart: [{ partNumber: duo[1], restocks: 5, lastAt: at(13, 2), lastStore: mi[0].storeNumber }],
    sellout: null,
  };
  const sell: Sellouts = { ...noSell, byModel: { duo: { n: 6, medianSec: 70, within30: 0.2, within60: 0.4, within120: 0.8, fastestSec: 25, days: 30 } }, recent: [
    { id: 1, at: new Date(at(15, 19)), storeNumber: mi[0].storeNumber, partNumber: duo[2], lowSec: null, highSec: null, exact: false, listedSec: 180 },
    { id: 2, at: new Date(at(13, 2)), storeNumber: mi[0].storeNumber, partNumber: duo[1], lowSec: 55, highSec: 60, exact: true, listedSec: null },
  ] };
  return duoNowFrom({ stores: one, stock: stockFor(one, { duoAt: { [mi[0].storeNumber]: [duo[2]] } }), times, sell, alerts: { days: 7, sent: 9, stores: 1 }, configsTotal: 8, now: NOW });
}

const lane = (p50: number, p95: number, gaps: number, from = "2026-11-01T10:00:00.000Z"): LaneStats => ({ gaps, hours: 168, from, p50Sec: p50, p95Sec: p95, p99Sec: p95 + 1, maxSec: 31, onPlan: 0.9, under: 0.99 });
const STATS: ServiceStats = {
  ...EMPTY_SERVICE_STATS,
  at: "2026-11-08T15:00:00.000Z",
  lanes: { ...EMPTY_SERVICE_STATS.lanes, "7d": { "fast-us": lane(5.0, 5.4, 1203442), "round-us": lane(15.0, 15.3, 40211), "fast-intl": lane(7.7, 10.2, 412050), "round-intl": lane(15.0, 15.6, 40100) } },
};

const textOfHtml = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<(li|p|h2|h3|div)[^>]*>/g, "\n").replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\n\s*\n+/g, "\n").trim();
const ldOf = (html: string) => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
const render = (props: Record<string, unknown>) => renderToStaticMarkup(createElement(DuoNowView, props as never));
const storeName = appleName(mi[0]);

describe("DuoNow — state page", () => {
  const d = stateData();
  const html = render({ d, label: "in Michigan", name: "Michigan", stores: mi, country: "us", restockTimesHref: "/iphone-duo-restock-times/michigan", alertHref: "/?model=duo#notify", stats: STATS });
  const text = textOfHtml(html);

  it("keeps the block's hook and opens with the verdict, then the evidence line, then the Key facts", () => {
    expect(html).toContain('data-block="duo-now"');
    const verdict = text.indexOf("Not in stock as of Nov 8, 10:22 AM EST");
    const evidence = text.indexOf("As of Nov 8, 10:22 AM EST: 6 of 6 stores answered within the last minute.");
    const facts = text.indexOf("Key facts: iPhone Duo in Michigan");
    expect(verdict).toBeGreaterThanOrEqual(0);
    expect(evidence).toBeGreaterThan(verdict);
    expect(facts).toBeGreaterThan(evidence);
    // The long paragraph is gone: its numbers live in the list.
    expect(text).not.toContain("came back most (");
  });
  it("states each fact as its own sentence, with the place, the iPhone Duo, the number and the window", () => {
    expect(text).toContain("PickupChecker has confirmed 53 iPhone Duo restocks at the 6 Apple Stores in Michigan since October 29, 2026, on 10 different days.");
    expect(text).toContain("66% of the 53 iPhone Duo restocks in Michigan since October 29, 2026 landed between 9 and 11 AM Eastern time; the busiest hour was 9–10 AM (21 restocks).");
    expect(text).toContain("The median iPhone Duo listing in Michigan lasted about 95 seconds on Apple's pickup page (40 timed listings since October 29, 2026).");
    expect(text).toMatch(/The .+ is the most restocked iPhone Duo configuration in Michigan: 19 of 53 restocks \(36%\) since October 29, 2026\./);
    expect(text).toContain("PickupChecker has confirmed 2 iPhone Duo restocks in Michigan so far today (November 8, 2026, local time).");
    expect(text).toContain("In the last 7 days PickupChecker sent 45 alerts to members for iPhone Duo restocks at 5 of the 6 Apple Stores in Michigan.");
    expect(keyFacts(d, { label: "in Michigan", one: false, lang: "en", D: dict("en"), countryTz: "America/New_York" })).toHaveLength(6);
  });
  it("quotes the measured US intervals with their window and sample, and links the method", () => {
    expect(text).toContain("Checks are planned every 5 s at stores with alerts and every 15 s at every store; measured over the last 7 days: 5.0 s at the median at stores with alerts (p95 5.4 s, 1,203,442 intervals) and 15.0 s per full round (p95 15.3 s, 40,211 rounds).");
    expect(html).toContain(`href="${MEASURED_HREF}"`);
    expect(text).not.toContain("slower than planned");
  });
  it("Dataset JSON-LD: the facts as description, the method as technique, dateModified = the latest store check", () => {
    const ld = ldOf(html);
    expect(ld.dateModified).toBe(d.checkedAt);
    expect(ld.dateModified).not.toBe(d.at);
    expect(ld.mainEntity.description).toContain("PickupChecker has confirmed 53 iPhone Duo restocks");
    expect(ld.mainEntity.description).toContain("19 of 53 restocks (36%)");
    expect(ld.mainEntity.measurementTechnique).toMatch(/two matching answers/);
  });
  it("a store without a current answer is unknown, not out of stock", () => {
    const s = stateData({ stale: true });
    expect([s.fresh, s.stale]).toEqual([5, 1]);
    const t = textOfHtml(render({ d: s, label: "in Michigan", name: "Michigan", stores: mi, country: "us", stats: STATS }));
    expect(t).toContain("5 of 6 stores answered within the last minute; 1 without a current answer — unknown, not counted as out of stock.");
  });
});

describe("DuoNow — store page", () => {
  const d = storeData();
  const html = render({ d, label: `at ${storeName}`, name: storeName, one: true, stores: [mi[0]], country: "us", alertHref: "/?model=duo#notify", stats: STATS });
  const text = textOfHtml(html);
  it("counts configurations, states the usual hour, and leaves out a median resting on fewer than MEDIAN_MIN listings", () => {
    expect(d.medianN).toBeLessThan(MEDIAN_MIN);
    expect(text).toContain(`In stock as of Nov 8, 10:22 AM EST: ${storeName} lists 1 of 8 iPhone Duo configurations for pickup`);
    expect(text).toContain(`As of Nov 8, 10:22 AM EST: ${storeName} answered our check within the last minute.`);
    expect(text).toContain(`PickupChecker has confirmed 12 iPhone Duo restocks at ${storeName} since October 29, 2026, on 6 different days.`);
    expect(text).toContain(`67% of the 12 iPhone Duo restocks at ${storeName} since October 29, 2026 landed between 9 and 11 AM Eastern time`);
    expect(text).not.toContain("median iPhone Duo listing");
    expect(text).not.toContain("median listing time"); // nor its tile
    expect(text).toContain(`No iPhone Duo restock at ${storeName} has been confirmed so far today (November 8, 2026, local time).`);
  });
});

describe("thresholds and fallbacks", () => {
  const base = stateData();
  const facts = (d: DuoNowData) => keyFacts(d, { label: "in Michigan", one: false, lang: "en", D: dict("en"), countryTz: "America/New_York" }).map((f) => f.text);
  it("no usual hour without a pattern: says why instead", () => {
    const f = facts({ ...base, pattern: false, peakHour: null, n: 4, days: 2 });
    expect(f.join(" ")).not.toMatch(/landed between/);
    expect(f).toContain("4 confirmed iPhone Duo restocks in Michigan on 2 days are too few to name a usual hour yet: PickupChecker waits for 5 restocks on 3 different days.");
  });
  it("no median without a sample of MEDIAN_MIN", () => {
    expect(facts({ ...base, medianN: MEDIAN_MIN - 1 }).join(" ")).not.toMatch(/median/);
  });
  it("no restock yet: one sentence, no tiles, the verdict does not repeat it", () => {
    const d = { ...base, n: 0, days: 0, pattern: false, peakHour: null, topPart: null, medianSec: null, medianN: 0, today: 0, last: null, lastThree: [], alerts: null };
    expect(facts(d)).toEqual(["No confirmed iPhone Duo restock in Michigan since tracking began on October 29, 2026."]);
    const t = textOfHtml(render({ d, label: "in Michigan", name: "Michigan", stores: mi, country: "us", stats: STATS }));
    expect(t.match(/No confirmed iPhone Duo restock/g)).toHaveLength(1);
    expect(t).not.toContain("confirmed restocks since");
  });
  it("the pattern read failed: the placeholder numbers are never stated", () => {
    const f = facts({ ...base, unknown: true });
    expect(f[0]).toMatch(/could not be read/);
    expect(f.join(" ")).not.toMatch(/53|66%/);
  });
  it("no store has answered yet", () => {
    const t = textOfHtml(render({ d: { ...base, checkedAt: null, fresh: 0, stale: 6 }, label: "in Michigan", name: "Michigan", stores: mi, country: "us", stats: STATS }));
    expect(t).toContain("None of the 6 stores has answered a check yet — unknown, not counted as out of stock.");
  });
});

describe("the method line", () => {
  const w = dict("en").modules.duoNow;
  it("quotes the lanes of the page's country", () => {
    expect(lanesFor("us")).toEqual({ fast: "fast-us", round: "round-us" });
    expect(lanesFor("uk")).toEqual({ fast: "fast-intl", round: "round-intl" });
    expect(howCountedText(STATS, "uk", w, "en")).toContain("7.7 s at the median at stores with alerts (p95 10.2 s, 412,050 intervals; slower than planned) and 15.0 s per full round (p95 15.6 s, 40,100 rounds).");
  });
  it("no data: the plan only, never 0 s", () => {
    for (const s of [null, EMPTY_SERVICE_STATS]) {
      const line = howCountedText(s, "us", w, "en");
      expect(line).toMatch(/every 5 s at stores with alerts and every 15 s at every store\.$/);
      expect(line).not.toMatch(/0 s|measured/);
    }
  });
  it("a record shorter than 7 days names its own window", () => {
    const short: ServiceStats = { ...STATS, lanes: { ...STATS.lanes, "7d": { ...STATS.lanes["7d"], "fast-us": lane(5.1, 5.6, 9000, "2026-11-07T09:00:00.000Z") } } };
    expect(howCountedText(short, "us", w, "en")).toContain("measured over the last 30 hours:");
    const days: ServiceStats = { ...STATS, lanes: { ...STATS.lanes, "7d": { ...STATS.lanes["7d"], "fast-us": lane(5.1, 5.6, 9000, "2026-11-05T09:00:00.000Z") } } };
    expect(howCountedText(days, "us", w, "en")).toContain("measured over the last 3 days:");
  });
  it("every language carries the measured numbers in its own decimal style", () => {
    for (const lang of LANGS) {
      const line = howCountedText(STATS, "de", dict(lang).modules.duoNow, lang);
      expect(line, lang).toMatch(/7[.,٫]7/);
      expect(line, lang).toMatch(/10[.,٫]2/);
      expect(line, lang).not.toMatch(/undefined|NaN/);
    }
  });
});

describe("Key facts in every language", () => {
  it("carry the numbers and never leak placeholders", () => {
    const d = stateData();
    for (const lang of LANGS) {
      const f = keyFacts(d, { label: "X", one: false, lang, D: dict(lang), countryTz: "America/New_York" }).map((x) => x.text);
      expect(f, lang).toHaveLength(6);
      const all = f.join(" ").replace(/iPhone-Duo/g, "iPhone Duo"); // German compounds
      // (English rounds the median into prose, "about 95 seconds"; the others print the seconds)
      for (const piece of ["53", "66", lang === "en" ? "95" : "93", "19", "36", "45", "iPhone Duo"]) expect(all, `${lang} lacks ${piece}`).toContain(piece);
      expect(all, lang).not.toMatch(/undefined|NaN|\[object/);
    }
  });
});
