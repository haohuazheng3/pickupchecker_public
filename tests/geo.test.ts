import { describe, expect, it } from "vitest";
import { STORES, stateCodeOf } from "@/lib/apple/catalog";
import { driveMinutes, formatDrive, formatMiles, rankStores, searchAnchor, zipAnchor } from "@/lib/geo";

const summit = STORES.find((s) => s.slug === "thesummit")!; // Birmingham, AL 35243

describe("zipAnchor — a ZIP without a ZIP database", () => {
  it("lands on the store in that exact ZIP", () => {
    const a = zipAnchor("35243")!;
    expect(a.kind).toBe("zip");
    expect(a.lat).toBeCloseTo(summit.lat, 3);
  });
  it("uses the sectional area for a ZIP with no store, and stays inside the state otherwise", () => {
    const sect = zipAnchor("35201")!; // same 352 sectional as The Summit
    expect(sect.approx).toBeFalsy();
    expect(Math.abs(sect.lat - summit.lat)).toBeLessThan(1);
    const near = zipAnchor("36104")!; // Montgomery: no 361 stores → an Alabama sectional, marked approximate
    expect(near.approx).toBe(true);
    expect(Math.abs(near.lat - summit.lat)).toBeLessThan(3);
    const wv = zipAnchor("26505")!; // Morgantown WV: no store in the state → the state itself, never North Carolina
    expect(wv.approx).toBe(true);
    expect(wv.lat).toBeGreaterThan(37); expect(wv.lng).toBeLessThan(-79);
    const mt = zipAnchor("59801")!; // Missoula MT: never Minnesota
    expect(mt.lng).toBeLessThan(-104);
    expect(zipAnchor("12")).toBeNull();
    expect(zipAnchor("00000")).toBeNull();
  });
});

describe("searchAnchor", () => {
  it("a ZIP, a store, a city and a state each give an anchor", () => {
    expect(searchAnchor("35243")?.kind).toBe("zip");
    expect(searchAnchor("The Summit")?.kind).toBe("store");
    const austin = searchAnchor("Austin")!;
    expect(austin.kind).toBe("place");
    expect([...austin.first!].every((n) => STORES.find((s) => s.storeNumber === n)!.city === "Austin")).toBe(true);
    const tx = searchAnchor("tx")!;
    expect(tx.kind).toBe("state");
    expect([...tx.first!].every((n) => stateCodeOf(STORES.find((s) => s.storeNumber === n)!) === "TX")).toBe(true);
    expect(searchAnchor("Texas")?.kind).toBe("state");
    expect(searchAnchor("Apple The Summit")?.kind).toBe("store");
    expect(searchAnchor("Apple Store The Summit")?.kind).toBe("store");
    expect(searchAnchor("Appleton")).toBeNull();
    for (const code of ["me", "or", "in", "va", "hi", "co", "pa", "wa", "ma", "ca"]) {
      const a = searchAnchor(code)!;
      expect(a.kind, code).toBe("state");
      expect([...a.first!].every((n) => stateCodeOf(STORES.find((s) => s.storeNumber === n)!).toLowerCase() === code), code).toBe(true);
    }
    expect(["place", "state"]).toContain(searchAnchor("Washington")?.kind); // the city (DC) or the state: both list Washington stores first
    const nyny = searchAnchor("New York, NY")!;
    expect(nyny.kind).toBe("place");
    expect([...nyny.first!].every((n) => STORES.find((s) => s.storeNumber === n)!.city === "New York")).toBe(true);
    expect(searchAnchor("austin tx")?.kind).toBe("place");
    expect(searchAnchor("35243-1234")?.kind).toBe("zip");
    expect(searchAnchor("352")?.kind).toBe("zip");
    expect(searchAnchor("zzzz")).toBeNull();
  });
  it("rankStores lists the searched place's stores first, then everything else nearest-first", () => {
    const ranked = rankStores(searchAnchor("Austin")!);
    expect(ranked.length).toBe(STORES.length);
    const austinCount = STORES.filter((s) => s.city === "Austin").length;
    expect(ranked.slice(0, austinCount).every((s) => s.city === "Austin")).toBe(true);
    for (let i = austinCount + 1; i < ranked.length; i++) expect(ranked[i].distance).toBeGreaterThanOrEqual(ranked[i - 1].distance);
  });
});

describe("drive time", () => {
  it("grows with distance and formats tightly", () => {
    expect(driveMinutes(0)).toBe(0);
    expect(driveMinutes(2)).toBeLessThan(driveMinutes(10));
    expect(driveMinutes(10)).toBeLessThan(driveMinutes(60));
    expect(formatDrive(0)).toBe("here");
    expect(formatDrive(3)).toMatch(/^\d+ min$/);
    expect(formatDrive(120)).toMatch(/^\d+ h( \d\d)?$/);
    expect(formatMiles(0.84)).toBe("0.8 mi");
    expect(formatMiles(12.4)).toBe("12 mi");
  });
});
