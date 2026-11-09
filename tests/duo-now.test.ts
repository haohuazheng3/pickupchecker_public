import { describe, expect, it } from "vitest";
import { Fragment, createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { duoNowFrom, stockFromRows, type StockLike } from "@/lib/content/duoNow";
import { emptyRestockTimes } from "@/lib/content/restockTimes";
import { storesOf, partNumbersFor } from "@/lib/apple/catalog";
import { dict } from "@/lib/i18n/dict";
import { LANGS } from "@/lib/i18n/locales";
import type { Sellouts } from "@/lib/stock/sellouts";

/* 2026-11-08: the "iPhone Duo {here} right now" block every place page opens with (lib/content/duoNow.ts). */

const mi = storesOf("us").filter((s) => s.state === "Michigan");
const duo = partNumbersFor("duo");
const noSell: Sellouts = { summary: { n: 0, medianSec: null, within30: 0, within60: 0, within120: 0, fastestSec: null, days: 30 }, byModel: {}, recent: [] };
const at = (h: number, m = 0) => new Date(Date.UTC(2026, 10, 7, h, m)).toISOString();

function stock(opts: { duoAt?: Record<string, string[]>; checked?: string } = {}): Map<string, StockLike> {
  const map = new Map<string, StockLike>();
  for (const s of mi) {
    const parts = opts.duoAt?.[s.storeNumber] ?? [];
    map.set(s.storeNumber, { lastCheckedAt: new Date(opts.checked ?? at(9, 22)), perModel: { duo: { available: parts.length, parts }, "18-pro": { available: 14, parts: [] }, "18-pro-max": { available: 11, parts: [] } } });
  }
  return map;
}

describe("duoNowFrom", () => {
  it("says not in stock, names the last restock with its lifetime, and counts the other models per store", () => {
    const times = { ...emptyRestockTimes("us", new Date(at(9, 22)), { stores: mi }), n: 57, days: 10, byHour: Array.from({ length: 24 }, (_, h) => (h === 9 ? 18 : h === 10 ? 15 : h === 8 ? 4 : 1)), peakHour: 9, latest: { storeNumber: mi[0].storeNumber, partNumber: duo[0], at: at(17, 23) }, byPart: [{ partNumber: duo[0], restocks: 24, lastAt: at(17, 23), lastStore: mi[0].storeNumber }], sellout: { n: 40, medianSec: 93, within2min: 0.6, within20min: 1, fastestSec: 5 } };
    const sell: Sellouts = { ...noSell, recent: [
      { id: 1, at: new Date(at(17, 23)), storeNumber: mi[0].storeNumber, partNumber: duo[0], lowSec: 300, highSec: 420, exact: true, listedSec: null },
      { id: 2, at: new Date(at(16, 26)), storeNumber: mi[1].storeNumber, partNumber: duo[1], lowSec: 240, highSec: 300, exact: true, listedSec: null },
      { id: 3, at: new Date(at(15, 0)), storeNumber: mi[1].storeNumber, partNumber: "MJW44LL/A", lowSec: 3600, highSec: 3615, exact: true, listedSec: null }, // an 18 Pro Max row: not a Duo
    ] };
    const d = duoNowFrom({ stores: mi, stock: stock(), times, sell, alerts: { days: 7, sent: 45, stores: 5 }, configsTotal: 8, now: new Date(at(9, 22)) });
    expect(d.storesTotal).toBe(6);
    expect(d.inStock).toEqual([]);
    expect(d.others).toEqual({ pro: 6, max: 6 });
    expect(d.last).toMatchObject({ storeNumber: mi[0].storeNumber, partNumber: duo[0], lowSec: 300, highSec: 420 });
    expect(d.lastThree.map((r) => r.partNumber)).toEqual([duo[0], duo[1]]); // the Pro Max row is left out
    expect(d.pattern).toBe(true);
    expect(d.peakHour).toBe(9);
    expect(d.peakCount).toBe(18);
    expect(d.window).toMatchObject({ from: 9, to: 11 });
    expect(Math.round(d.share911 * 100)).toBe(Math.round(((18 + 15) / times.byHour.reduce((a, b) => a + b, 0)) * 100));
    expect(d.medianSec).toBe(93);
    expect(d.topPart).toEqual({ partNumber: duo[0], restocks: 24, share: 24 / 57 });
    expect(d.medianN).toBe(40); // the median's sample, quoted next to it
    expect([d.fresh, d.stale]).toEqual([6, 0]); // every store answered within FRESH_SEC
    expect(d.alerts).toEqual({ days: 7, sent: 45, stores: 5 });
    expect(d.checkedAt).toBe(at(9, 22));
    expect(d.zones).toEqual(["America/Detroit"]);
  });
  it("lists the stores with stock, most configurations first, and takes the latest restock from the restock-times read when the sell-out rows are older", () => {
    const times = { ...emptyRestockTimes("us", new Date(), { stores: mi }), n: 2, latest: { storeNumber: mi[2].storeNumber, partNumber: duo[2], at: at(18, 0) } };
    const d = duoNowFrom({ stores: mi, stock: stock({ duoAt: { [mi[3].storeNumber]: [duo[0]], [mi[4].storeNumber]: [duo[0], duo[1], duo[2]] } }), times, sell: noSell, configsTotal: 8 });
    expect(d.inStock.map((x) => [x.storeNumber, x.configs])).toEqual([[mi[4].storeNumber, 3], [mi[3].storeNumber, 1]]);
    expect(d.last).toMatchObject({ storeNumber: mi[2].storeNumber, at: at(18, 0), highSec: null });
    expect(d.lastThree).toEqual([]);
    expect(d.pattern).toBe(false);
    expect(d.medianSec).toBeNull();
  });
  it("a single store counts its configurations for the other models; a country page's rows build the stock map", () => {
    const one = [mi[0]];
    const d = duoNowFrom({ stores: one, stock: stock(), times: emptyRestockTimes("us", new Date(), { stores: one }), sell: noSell, configsTotal: 8 });
    expect(d.others).toEqual({ pro: 14, max: 11 });
    const map = stockFromRows([{ storeNumber: mi[0].storeNumber, availableParts: [duo[0]], lastCheckedAt: new Date(at(1)) } as never]);
    const e = duoNowFrom({ stores: mi, stock: map, others: { pro: 200, max: 190 }, times: emptyRestockTimes("us", new Date(), { stores: mi }), sell: noSell, configsTotal: 8 });
    expect(e.inStock).toEqual([{ storeNumber: mi[0].storeNumber, configs: 1, parts: [duo[0]] }]);
    expect(e.others).toEqual({ pro: 200, max: 190 });
    expect(e.checkedAt).toBe(at(1));
  });
});

describe("the block's strings exist in every language and carry their numbers", () => {
  // Dictionary nodes flattened to text (the Key facts are JSX with bold numbers).
  const text = (node: ReactNode) => renderToStaticMarkup(createElement(Fragment, null, node)).replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
  const lane = { p50: "P50", p95: "P95", n: 1234, slow: true };
  it("Key facts, evidence and method lines", () => {
    for (const lang of LANGS) {
      const w = dict(lang).modules.duoNow;
      // German writes the compound "iPhone-Duo-Restock".
      const has = (s: string, pieces: string[], what: string) => { for (const p of pieces) expect(s.replace(/iPhone-Duo/g, "iPhone Duo"), `${lang} ${what} lacks ${p}`).toContain(p); expect(s, `${lang} ${what}`).not.toMatch(/undefined|NaN|\[object/); };
      has(text(w.fN({ n: 57, days: 9, label: "X", stores: 6, one: false, since: "D" })), ["57", "9", "X", "D", "iPhone Duo"], "fN");
      has(text(w.fN({ n: 57, days: 1, label: "X", stores: 1, one: true, since: "D" })), ["57", "X", "D"], "fN one");
      has(text(w.fShare({ pct: "58%", n: 57, label: "X", since: "D", range: "R", zone: "Z", busiest: "B", busiestN: 18 })), ["58%", "57", "X", "D", "R", "B", "18", "iPhone Duo"], "fShare");
      has(text(w.fTooFew({ n: 4, days: 4, label: "X", min: 5, minDays: 3 })), ["4", "X", "5", "iPhone Duo"], "fTooFew"); // (Arabic spells a dual: "يومين")
      has(text(w.fMedian({ median: "M", n: 40, label: "X", since: "D" })), ["M", "40", "X", "D", "iPhone Duo"], "fMedian");
      has(text(w.fTop({ config: "C", k: 24, n: 57, pct: "42%", label: "X", since: "D" })), ["C", "24", "57", "42%", "X", "D", "iPhone Duo"], "fTop");
      has(text(w.fToday({ n: 3, label: "X", date: "T" })), ["3", "X", "T", "iPhone Duo"], "fToday");
      has(text(w.fToday({ n: 0, label: "X", date: "T" })), ["X", "T", "iPhone Duo"], "fToday none");
      has(text(w.evidence({ stamp: "S", fresh: 5, total: 6, stale: 1, one: false, name: "N" })), ["S", "5", "6", "1"], "evidence");
      has(text(w.evidence({ stamp: "S", fresh: 0, total: 1, stale: 1, one: true, name: "N" })), ["S", "N"], "evidence one stale");
      has(w.evidenceNone({ total: 39, one: false, name: "N" }), ["39"], "evidenceNone");
      has(w.howCounted({ fast: lane, round: { ...lane, slow: false }, win: { days: 7 } }), ["P50", "P95", "5", "15", "7"], "howCounted");
      has(w.howCounted({ fast: lane, round: null, win: { hours: 30 } }), ["P50", "30"], "howCounted hours");
      expect(w.howCounted({ fast: null, round: null, win: null }), lang).not.toMatch(/P50|0 s/);
      has(w.sec("5.0"), ["5.0"], "sec");
      has(w.factsTitle("X"), ["X", "iPhone Duo"], "factsTitle");
      expect(w.technique.length, lang).toBeGreaterThan(60);
      expect(dict(lang).modules.sellout.definition.length, lang).toBeGreaterThan(40);
      expect(w.zone("America/New_York"), lang).toMatch(/\S/);
      expect(w.secs(45), lang).toMatch(/45/);
      expect(w.mins(5), lang).toMatch(/5/);
      expect(dict(lang).content.statStrip.scoped("A", "Duo"), lang).toContain("Duo");
    }
  });
  it("English groups thousands and says the window as prose", () => {
    const w = dict("en").modules.duoNow;
    expect(text(w.fN({ n: 3891, days: 11, label: "in the US", stores: 269, one: false, since: "October 29, 2026" })))
      .toBe("PickupChecker has confirmed 3,891 iPhone Duo restocks at the 269 Apple Stores in the US since October 29, 2026, on 11 different days.");
    expect(text(w.fShare({ pct: "58%", n: 3891, label: "in the US", since: "October 29, 2026", range: "9–11 AM", zone: "store local time", busiest: "9–10 AM", busiestN: 1481 })))
      .toBe("58% of the 3,891 iPhone Duo restocks in the US since October 29, 2026 landed between 9 and 11 AM store local time; the busiest hour was 9–10 AM (1,481 restocks).");
    expect(text(w.fMedian({ median: "about 75 seconds", n: 2210, label: "in the US", since: "October 29, 2026" })))
      .toBe("The median iPhone Duo listing in the US lasted about 75 seconds on Apple's pickup page (2,210 timed listings since October 29, 2026).");
    expect(w.howCounted({ fast: { p50: "5.0 s", p95: "5.4 s", n: 1203442, slow: false }, round: { p50: "15.0 s", p95: "15.3 s", n: 40211, slow: false }, win: { days: 7 } }))
      .toBe("A restock counts after two matching answers (first sightings excluded); a listing time is bounded by the last check that still saw the configuration and the first that no longer did. Checks are planned every 5 s at stores with alerts and every 15 s at every store; measured over the last 7 days: 5.0 s at the median at stores with alerts (p95 5.4 s, 1,203,442 intervals) and 15.0 s per full round (p95 15.3 s, 40,211 rounds).");
  });
});
