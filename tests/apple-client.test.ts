import { describe, it, expect } from "vitest";
import { buildPickupUrl, parsePickupBody, batchParts, MAX_PARTS_PER_CALL } from "@/lib/apple/client";

describe("buildPickupUrl", () => {
  it("includes the required parameters", () => {
    const u = new URL(buildPickupUrl(["MJQ34LL/A", "MJQ44LL/A"], "10001"));
    expect(u.searchParams.get("cppart")).toBe("UNLOCKED/US");
    expect(u.searchParams.get("parts.0")).toBe("MJQ34LL/A");
    expect(u.searchParams.get("parts.1")).toBe("MJQ44LL/A");
    expect(u.searchParams.get("location")).toBe("10001");
    expect(u.searchParams.get("pl")).toBe("true");
  });
  it("refuses more than 20 parts", () => {
    expect(() => buildPickupUrl(Array.from({ length: 21 }, (_, i) => `P${i}`), "10001")).toThrow();
  });
});

describe("batchParts", () => {
  it("splits 40 parts into two batches of 20", () => {
    const b = batchParts(Array.from({ length: 40 }, (_, i) => `P${i}`));
    expect(b).toHaveLength(2);
    expect(b[0]).toHaveLength(MAX_PARTS_PER_CALL);
  });
});

describe("parsePickupBody", () => {
  const body = {
    head: { status: "200" },
    body: {
      location: "10001",
      stores: [
        { storeNumber: "R032", storeName: "SoHo", city: "New York", state: "NY", storedistance: 1.77,
          partsAvailability: { "MJQ34LL/A": { pickupDisplay: "available", pickupSearchQuote: "Available Today" }, "MJQ44LL/A": { pickupDisplay: "unavailable", pickupSearchQuote: "Currently unavailable" } } },
      ],
    },
  };
  it("maps stores and parts", () => {
    const r = parsePickupBody(body, 200, 1000);
    expect(r.ok).toBe(true);
    expect(r.stores).toHaveLength(1);
    expect(r.stores[0].storeNumber).toBe("R032");
    expect(r.stores[0].parts.find((p) => p.partNumber === "MJQ34LL/A")?.available).toBe(true);
    expect(r.stores[0].parts.find((p) => p.partNumber === "MJQ44LL/A")?.available).toBe(false);
  });
  it("throws loudly on schema drift instead of reporting 'unavailable'", () => {
    expect(() => parsePickupBody({ foo: 1 }, 200, 10)).toThrow(/missing body/);
    expect(() => parsePickupBody({ body: { stores: "nope" } }, 200, 10)).toThrow(/not an array/);
  });
  it("treats a missing store list as zero stores", () => {
    expect(parsePickupBody({ body: { location: "99999" } }, 200, 10).stores).toEqual([]);
  });
});
