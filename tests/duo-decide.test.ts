import { describe, expect, it } from "vitest";
import { decideFrom, emptyDecide, LIFETIME_MIN, TREND_MIN, type RestockEvent } from "@/lib/content/duoDecide";
import { catalogFor, storesOf } from "@/lib/apple/catalog";

const parts = catalogFor("duo", "us").map((i) => i.partNumber);
const stores = storesOf("us").slice(0, 30).map((s) => s.storeNumber);
const NOW = new Date("2026-11-20T18:00:00Z");
const at = (daysAgo: number, hour = 15) => new Date(Date.UTC(2026, 10, 20 - daysAgo, hour)).toISOString();

describe("decideFrom — which configuration is easiest, and whether supply is easing", () => {
  it("empty: every configuration listed with zeros, no verdicts, trend insufficient", () => {
    const d = decideFrom("us", [], [], NOW);
    expect(d.configs.byPart.length).toBe(parts.length);
    expect(d.configs.easiest).toBeNull();
    expect(d.configs.never.length).toBe(parts.length);
    expect(d.supply.trend).toBe("insufficient");
    expect(d.supply.daily.length).toBeGreaterThan(14);
    expect(emptyDecide("us", NOW).supply.comparableFrom).toBe("2026-11-11");
  });

  it("ranks by listing time (exposure), states medians only from LIFETIME_MIN lifetimes, and counts stores listing now", () => {
    const ev: RestockEvent[] = [];
    // part 0: 12 restocks, each listed 100 s at 12 stores; part 1: 3 restocks listed 2,000 s each (more time, fewer restocks).
    for (let i = 0; i < 12; i++) ev.push({ storeNumber: stores[i], partNumber: parts[0], at: at(2, 10 + (i % 5)), secs: 100 });
    for (let i = 0; i < 3; i++) ev.push({ storeNumber: stores[i], partNumber: parts[1], at: at(3, 11), secs: 2000 });
    const d = decideFrom("us", ev, [{ partNumber: parts[1], nowStores: 4 }], NOW);
    expect(d.configs.n).toBe(15);
    expect(d.configs.byPart[0].partNumber).toBe(parts[1]); // 6,000 s of listing beats 1,200 s
    expect(d.configs.byPart[0].exposureSec).toBe(6000);
    expect(d.configs.byPart[0].nowStores).toBe(4);
    expect(d.configs.byPart[0].lifetimes).toBeNull(); // 3 < LIFETIME_MIN
    const p0 = d.configs.byPart.find((r) => r.partNumber === parts[0])!;
    expect(p0.lifetimes?.n).toBe(12);
    expect(p0.lifetimes?.medianSec).toBe(100);
    expect(p0.stores).toBe(12);
    expect(d.configs.easiest?.partNumber).toBe(parts[1]);
    expect(d.configs.hardest?.partNumber).toBe(parts[0]);
    expect(d.configs.never.length).toBe(parts.length - 2);
    expect(d.configs.byStorage[0].restocks + d.configs.byStorage.slice(1).reduce((a, g) => a + g.restocks, 0)).toBe(15);
    expect(LIFETIME_MIN).toBe(10);
  });

  it("week over week: both windows complete and restocks up ≥ TREND_MIN reads 'up'; an incomplete window is insufficient", () => {
    const ev: RestockEvent[] = [];
    for (let day = 0; day < 7; day++) for (let i = 0; i < 4; i++) ev.push({ storeNumber: stores[i], partNumber: parts[0], at: at(day, 12 + i), secs: 90 });
    for (let day = 7; day < 14; day++) for (let i = 0; i < 2; i++) ev.push({ storeNumber: stores[i], partNumber: parts[0], at: at(day, 12 + i), secs: 90 });
    const d = decideFrom("us", ev, [], NOW);
    expect(d.supply.last7.restocks).toBe(28);
    expect(d.supply.prev7.restocks).toBe(14);
    expect(d.supply.last7.complete && d.supply.prev7.complete).toBe(true);
    expect(d.supply.change).toBeCloseTo(1, 5);
    expect(d.supply.trend).toBe("up");
    expect(d.supply.last7.medianSec).toBe(90);
    expect(d.supply.storesEver).toBe(4);
    expect(d.supply.sinceLastHours).toBeGreaterThan(0);
    expect(TREND_MIN).toBe(0.15);
    // Tracking that began inside the previous window: no comparison yet.
    const early = decideFrom("us", ev, [], new Date("2026-11-08T18:00:00Z"));
    expect(early.supply.trend).toBe("insufficient");
    expect(early.supply.change).toBeNull();
  });

  it("ignores events of unknown stores or parts and first days before tracking", () => {
    const d = decideFrom("us", [{ storeNumber: "R999", partNumber: parts[0], at: at(1), secs: 50 }, { storeNumber: stores[0], partNumber: "NOPE", at: at(1), secs: 50 }], [], NOW);
    expect(d.configs.n).toBe(0);
  });
});
