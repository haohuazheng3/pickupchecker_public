import { describe, it, expect } from "vitest";
import { CATALOG, STORES, COVERAGE, STORE_INDEX, partNumbersFor, storagesFor, colorsFor, storesNear, statesWithStores, stateCodeOf } from "@/lib/apple/catalog";

describe("catalog data", () => {
  it("has 40 SKUs across three models and 269 stores", () => {
    expect(CATALOG).toHaveLength(40);
    expect(STORES).toHaveLength(269);
    expect(partNumbersFor("18-pro")).toHaveLength(16);
    expect(partNumbersFor("18-pro-max")).toHaveLength(16);
    expect(partNumbersFor("duo")).toHaveLength(8);
  });
  it("coverage plan reaches every store", () => {
    const covered = new Set(COVERAGE.flatMap((c) => c.covers));
    for (const s of STORES) expect(covered.has(s.storeNumber)).toBe(true);
    expect(COVERAGE).toHaveLength(42); // 33 original anchors + 9 added 2026-10-30 for the stores Apple never returned (see docs/delivery)
    for (const c of COVERAGE) expect(c.covers).toContain(c.anchorStore);
  });
  it("filters by storage and color", () => {
    const s = storagesFor("18-pro");
    expect(s[0]).toBe("256GB");
    expect(colorsFor("duo").length).toBeGreaterThan(0);
    expect(partNumbersFor("18-pro", ["256GB"], [colorsFor("18-pro")[0]])).toHaveLength(1);
  });
  it("finds stores near Manhattan", () => {
    const near = storesNear(40.75, -73.99, 10);
    expect(near.length).toBeGreaterThan(5);
    expect(near[0].distance).toBeLessThan(near[near.length - 1].distance);
  });
  it("maps state names to codes", () => {
    expect(stateCodeOf(STORE_INDEX.get("R032")!)).toBe("NY");
    expect(statesWithStores().find((s) => s.name === "California")?.count).toBeGreaterThan(40);
  });
});
