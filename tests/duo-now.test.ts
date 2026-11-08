import { describe, expect, it } from "vitest";
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
    expect(d.topPart).toEqual({ partNumber: duo[0], restocks: 24 });
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
  it("summary, verdicts and tiles", () => {
    for (const lang of LANGS) {
      const w = dict(lang).modules.duoNow;
      const summary = w.summary({ pct: "58%", n: 57, stores: 6, label: "X", since: "D", range: "R", zone: "Z", busiest: "B", busiestN: 18, median: "M", config: "C", k: 24, one: false });
      // (the store count may be spelled out — Arabic writes "the six stores" — so it is not required as digits)
      for (const piece of ["58%", "57", "X", "D", "R", "B", "18", "M", "C", "24"]) expect(summary, `${lang} summary lacks ${piece}`).toContain(piece);
      expect(w.tooFew({ n: 3, label: "X", since: "D", one: false, stores: 6 }), lang).toMatch(/3/);
      expect(w.alerts({ sent: 45, stores: 5, total: 6, days: 7, label: "X", one: false }), lang).toMatch(/45/);
      expect(w.zone("America/New_York"), lang).toMatch(/\S/);
      expect(w.secs(45), lang).toMatch(/45/);
      expect(w.mins(5), lang).toMatch(/5/);
      expect(dict(lang).content.statStrip.scoped("A", "Duo"), lang).toContain("Duo");
    }
  });
  it("English says the window as prose and groups thousands", () => {
    const w = dict("en").modules.duoNow;
    expect(w.summary({ pct: "58%", n: 3891, stores: 269, label: "in the US", since: "October 29, 2026", range: "9–11 AM", zone: "store local time", busiest: "9–10 AM", busiestN: 1481, median: "about 75 seconds", config: "512GB Star White", k: 1110, one: false }))
      .toBe("58% of the 3,891 iPhone Duo restocks PickupChecker confirmed at the 269 Apple Stores in the US since October 29, 2026 landed between 9 and 11 AM store local time; the busiest hour was 9–10 AM (1,481). Half sold out within about 75 seconds. The 512GB Star White came back most (1,110 of 3,891).");
  });
});
