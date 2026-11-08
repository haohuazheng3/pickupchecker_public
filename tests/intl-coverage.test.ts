import { describe, expect, it } from "vitest";
import { INTL_COVERAGE, storesOf, STORE_INDEX, countryOfStore } from "@/lib/apple/catalog";
import { INTL_CODES } from "@/lib/apple/countries";
import { buildIntlTasks, intlStores } from "@/lib/stock/sweep";
import { BACK_AFTER_HITS, DIRECT_AFTER_MISSES, coverageStep, directStores, excusedStores, persistCoverage, restoreCoverage, uncoveredByPlan, type CoverageState } from "@/lib/stock/intlCoverage";

/* 2026-11-08: the other countries' 15 s round asks Apple by location (anchors) instead of store by store. */

describe("data/apple/intl-coverage-plan.json", () => {
  it("has anchors for every polled country, each anchored on a store of that country with a location", () => {
    for (const cc of INTL_CODES) {
      const plan = INTL_COVERAGE[cc];
      expect(plan, cc).toBeDefined();
      expect(plan!.length, cc).toBeGreaterThan(0);
      for (const a of plan!) {
        expect(countryOfStore(a.anchorStore), `${cc} ${a.anchorStore}`).toBe(cc);
        expect(a.location.trim().length, `${cc} ${a.anchorStore}`).toBeGreaterThan(0);
        expect(a.covers.length, `${cc} ${a.anchorStore}`).toBeGreaterThan(0);
        for (const s of a.covers) expect(countryOfStore(s), `${cc} ${a.anchorStore} covers ${s}`).toBe(cc);
        expect(a.covers, `${cc} ${a.anchorStore} returns itself`).toContain(a.anchorStore);
      }
    }
  });
  it("covers every store of every country except Chermside, where Apple offers no pickup lookup", () => {
    const gaps = uncoveredByPlan(intlStores([...INTL_CODES]), INTL_COVERAGE);
    expect(gaps).toEqual({ au: ["R384"] });
    expect(STORE_INDEX.get("R384")?.name).toMatch(/Chermside/);
  });
  it("is 47 anchors, 94 requests a round, against 398 store by store", () => {
    const anchors = Object.values(INTL_COVERAGE).reduce((n, a) => n + a!.length, 0);
    expect(anchors).toBe(47);
    const tasks = buildIntlTasks([...INTL_CODES]);
    expect(tasks.filter((t) => !t.store)).toHaveLength(94);
    expect(tasks.filter((t) => t.store).map((t) => t.store)).toEqual(["R384", "R384"]);
    expect(buildIntlTasks([...INTL_CODES], { anchors: {} })).toHaveLength(398);
  });
});

describe("buildIntlTasks with anchors", () => {
  it("asks each anchor's location on the country's endpoint, then the stores the plan misses and the direct ones", () => {
    const tasks = buildIntlTasks(["au"], { direct: ["R405"] });
    const anchors = tasks.filter((t) => !t.store);
    expect(anchors).toHaveLength(INTL_COVERAGE.au!.length * 2);
    for (const t of anchors) { expect(t.country).toBe("au"); expect(t.parts.length).toBeLessThanOrEqual(20); }
    expect(anchors[0].anchor.location).toBe(INTL_COVERAGE.au![0].location);
    expect([...new Set(tasks.filter((t) => t.store).map((t) => t.store))].sort()).toEqual(["R384", "R405"]);
    // Every Australian store is reachable through some task.
    const reach = new Set([...anchors.flatMap((t) => t.anchor.covers), ...tasks.filter((t) => t.store).map((t) => t.store!)]);
    for (const s of storesOf("au")) expect(reach.has(s.storeNumber), s.storeNumber).toBe(true);
  });
  it("without a plan for a country, every store is asked on its own (the shape before 2026-11-08)", () => {
    const tasks = buildIntlTasks(["sg"], { anchors: {} });
    expect(tasks).toHaveLength(storesOf("sg").length * 2);
    for (const t of tasks) expect(t.store).toBeDefined();
  });
});

describe("coverageStep", () => {
  const now = new Date("2026-11-08T04:00:00Z");
  const expected = [{ store: "R001", country: "uk" }, { store: "R002", country: "uk" }, { store: "R003", country: "uk" }];
  it("a store missing from answering anchors twice in a row turns direct and is reported once", () => {
    let s: CoverageState = {};
    let r = coverageStep(s, { expected, anchorCovered: ["R001", "R003"], excused: [], now });
    expect(r.newlyDirect).toEqual([]); expect(r.report).toEqual([]);
    expect(r.state.R002).toMatchObject({ misses: 1, direct: false });
    s = r.state;
    r = coverageStep(s, { expected, anchorCovered: ["R001", "R003"], excused: [], now });
    expect(r.newlyDirect).toEqual(["R002"]); expect(r.report).toEqual(["R002"]);
    expect(directStores(r.state)).toEqual(["R002"]);
    s = r.state;
    r = coverageStep(s, { expected, anchorCovered: ["R001", "R003"], excused: [], now });
    expect(r.newlyDirect).toEqual([]); expect(r.report).toEqual([]); // told once
    expect(r.state.R002.misses).toBe(DIRECT_AFTER_MISSES + 1);
  });
  it("a store whose anchors did not answer is not judged; one miss that ends is forgotten", () => {
    let r = coverageStep({}, { expected, anchorCovered: ["R001"], excused: ["R002"], now });
    expect(r.state.R002).toBeUndefined();
    expect(r.state.R003.misses).toBe(1);
    r = coverageStep(r.state, { expected, anchorCovered: ["R001", "R002", "R003"], excused: [], now });
    expect(r.state).toEqual({});
  });
  it("a direct store returned by its anchors for BACK_AFTER_HITS rounds goes back under the anchors", () => {
    let s: CoverageState = { R002: { country: "uk", misses: 5, hits: 0, since: now.toISOString(), direct: true, notified: true } };
    for (let i = 1; i < BACK_AFTER_HITS; i++) {
      const r = coverageStep(s, { expected, anchorCovered: ["R001", "R002", "R003"], excused: [], now });
      expect(r.back).toEqual([]); expect(r.state.R002.hits).toBe(i); s = r.state;
    }
    const r = coverageStep(s, { expected, anchorCovered: ["R001", "R002", "R003"], excused: [], now });
    expect(r.back).toEqual(["R002"]);
    expect(directStores(r.state)).toEqual([]);
  });
  it("a miss in between resets the hit streak but keeps the store direct", () => {
    const s: CoverageState = { R002: { country: "uk", misses: 0, hits: 7, since: now.toISOString(), direct: true, notified: true } };
    const r = coverageStep(s, { expected, anchorCovered: ["R001", "R003"], excused: [], now });
    expect(r.state.R002).toMatchObject({ direct: true, hits: 0, misses: 1 });
    expect(r.report).toEqual([]);
  });
});

describe("excusedStores / persistence", () => {
  it("excuses every store of an anchor whose location failed", () => {
    const uk = INTL_COVERAGE.uk![0];
    const ex = excusedStores(INTL_COVERAGE, [uk.location]);
    for (const s of uk.covers) expect(ex.has(s)).toBe(true);
    expect(ex.size).toBe(uk.covers.length);
    expect(excusedStores(INTL_COVERAGE, []).size).toBe(0);
  });
  it("round-trips through poller_state and drops stores no longer polled", () => {
    const s: CoverageState = { R002: { country: "uk", misses: 3, hits: 0, since: "2026-11-08T04:00:00.000Z", direct: true, notified: true } };
    expect(restoreCoverage(persistCoverage(s), new Set(["R002"]))).toEqual(s);
    expect(restoreCoverage(persistCoverage(s), new Set(["R001"]))).toEqual({});
    expect(restoreCoverage(undefined, new Set(["R002"]))).toEqual({});
    expect(restoreCoverage({ stores: { R002: "junk" } }, new Set(["R002"]))).toEqual({});
  });
});
