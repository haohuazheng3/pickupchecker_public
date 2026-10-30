import { describe, it, expect } from "vitest";
import { buildSearchIndex, searchIndex } from "@/lib/search";

const index = buildSearchIndex();
const top = (q: string) => searchIndex(index, q)[0];

describe("site search", () => {
  it("indexes every state, city and store once, plus models and pages", () => {
    expect(index.filter((e) => e.k === "store")).toHaveLength(269);
    expect(index.filter((e) => e.k === "state").length).toBeGreaterThan(40);
    expect(index.filter((e) => e.k === "city").length).toBeGreaterThan(200);
    expect(index.filter((e) => e.k === "model")).toHaveLength(9 + 62); // 3 models × stock/restocks/map + every storage, color and configuration
    expect(new Set(index.map((e) => `${e.k}:${e.h}`)).size).toBe(index.length);
  });
  it("a state name or code goes to the state page before its cities and stores", () => {
    expect(top("texas").h).toBe("/stores/texas");
    expect(top("TX").h).toBe("/stores/texas");
    expect(top("new york").h).toBe("/stores/new-york");
  });
  it("a city goes to the city page (or its only store), a store name to the store page", () => {
    expect(top("houston").h).toBe("/stores/texas/houston");
    expect(top("Fifth Avenue").h).toBe("/stores/new-york/new-york/fifthavenue");
    expect(top("ann arbor").h).toBe("/stores/michigan/ann-arbor/briarwood"); // a one-store city is its store
  });
  it("a ZIP code lists the nearest stores by distance, even one with no store nearby", () => {
    const r = searchIndex(index, "10001");
    expect(r.length).toBeGreaterThan(3);
    expect(r.every((e) => e.k === "store")).toBe(true);
    expect(r[0].s).toContain("New York, NY");
    expect(r.slice(0, 4).every((e) => e.s.includes("New York, NY"))).toBe(true); // Manhattan first (Fifth Avenue is 10153)
    const far = searchIndex(index, "36104"); // Montgomery, AL: no store in its sectional
    expect(far.length).toBeGreaterThan(0);
    expect(far[0].s).toMatch(/AL\b/);
    expect(searchIndex(index, "00000")).toEqual([]); // not a US sectional
  });
  it("models and pages are reachable by plain words", () => {
    expect(top("duo").h).toBe("/stock/iphone-duo");
    expect(top("map").h).toBe("/map");
    expect(top("pricing").h).toBe("/pricing");
    expect(searchIndex(index, "")).toEqual([]);
    expect(searchIndex(index, "zzzz-nothing")).toEqual([]);
  });
});
