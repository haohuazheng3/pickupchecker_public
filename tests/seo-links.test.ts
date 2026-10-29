import { describe, it, expect } from "vitest";
import { STATE_NEIGHBORS, neighborStates, nearbyCities, nearestStores, cityRef, stateRefs, cityRefs, topStates } from "@/lib/seo/links";
import { STATE_CODES, STORE_INDEX } from "@/lib/apple/catalog";

describe("internal link graph", () => {
  it("state adjacency is symmetric and only names real states", () => {
    const codes = new Set(Object.values(STATE_CODES));
    for (const [a, list] of Object.entries(STATE_NEIGHBORS)) {
      expect(codes.has(a)).toBe(true);
      for (const b of list) {
        expect(codes.has(b)).toBe(true);
        expect(STATE_NEIGHBORS[b]).toContain(a);
      }
    }
  });
  it("neighbors, nearby cities and nearest stores resolve", () => {
    expect(neighborStates("New York").map((s) => s.name)).toContain("New Jersey");
    expect(neighborStates("Hawaii")).toHaveLength(0);
    const nyc = cityRef("New York", "New York")!;
    const near = nearbyCities(nyc.lat, nyc.lng, { exclude: nyc, limit: 5 });
    expect(near.length).toBe(5);
    expect(near.some((c) => c.state === "New Jersey")).toBe(true);
    const anchorage = STORE_INDEX.get("R366") ?? [...STORE_INDEX.values()].find((s) => s.state === "Alaska")!;
    const nearest = nearestStores(anchorage, 3);
    expect(nearest).toHaveLength(3); // far away, but never empty
    expect(stateRefs().length).toBeGreaterThan(40);
    expect(cityRefs().reduce((n, c) => n + c.count, 0)).toBe(STORE_INDEX.size);
    expect(topStates(1)[0].name).toBe("California");
  });
});
