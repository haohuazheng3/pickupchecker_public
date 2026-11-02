import { describe, it, expect } from "vitest";
import { buildPickupUrl, parsePickupBody, batchParts, MAX_PARTS_PER_CALL, appleHeaders, APPLE_HEADERS, pickupCountryOf, fetchPickupAtStore, type FetchLike } from "@/lib/apple/client";

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
  it("asks one store by number instead of a ZIP for the fast lane and the instant confirm", () => {
    const u = new URL(buildPickupUrl(["MJQ34LL/A"], "", { store: "R085" }));
    expect(u.searchParams.get("store")).toBe("R085");
    expect(u.searchParams.has("location")).toBe(false);
    expect(u.searchParams.get("cppart")).toBe("UNLOCKED/US");
  });
});

describe("buildPickupUrl — other countries", () => {
  it("keeps the US request exactly as it always was", () => {
    expect(buildPickupUrl(["MJQ34LL/A", "MJQ44LL/A"], "10001")).toBe("https://www.apple.com/shop/retail/pickup-message?pl=true&mts.0=regular&cppart=UNLOCKED%2FUS&parts.0=MJQ34LL%2FA&parts.1=MJQ44LL%2FA&location=10001");
    expect(buildPickupUrl(["MJQ34LL/A"], "", { store: "R085" })).toBe("https://www.apple.com/shop/retail/pickup-message?pl=true&mts.0=regular&cppart=UNLOCKED%2FUS&parts.0=MJQ34LL%2FA&store=R085");
    expect(buildPickupUrl(["MJQ34LL/A"], "", { store: "R085", country: "us" })).toBe(buildPickupUrl(["MJQ34LL/A"], "", { store: "R085" }));
    expect(appleHeaders("us")).toBe(APPLE_HEADERS);
  });
  it("asks a UK store on the UK endpoint with cppart UNLOCKED/GB", () => {
    expect(buildPickupUrl(["MK2E4QN/A"], "", { store: "R092", country: "uk" })).toBe("https://www.apple.com/uk/shop/retail/pickup-message?pl=true&mts.0=regular&cppart=UNLOCKED%2FGB&parts.0=MK2E4QN%2FA&store=R092");
    expect(appleHeaders("uk").referer).toBe("https://www.apple.com/uk/shop/buy-iphone/iphone-18-pro");
    expect(appleHeaders("uk")["accept-language"]).toMatch(/^en-GB/);
  });
  it("asks a Hong Kong store on /hk/shop (its store pages live under /hk/en, its shop does not)", () => {
    const u = new URL(buildPickupUrl(["MJRP4ZA/A"], "", { store: "R409", country: "hk" }));
    expect(u.origin + u.pathname).toBe("https://www.apple.com/hk/shop/retail/pickup-message");
    expect(u.searchParams.get("cppart")).toBe("UNLOCKED/HK");
    expect(u.searchParams.get("store")).toBe("R409");
    expect(u.searchParams.has("location")).toBe(false);
  });
  it("uses the language-compound shop paths of Switzerland and Belgium", () => {
    expect(new URL(buildPickupUrl(["X"], "", { store: "R1", country: "ch" })).pathname).toBe("/ch-de/shop/retail/pickup-message");
    expect(new URL(buildPickupUrl(["X"], "", { store: "R1", country: "be" })).pathname).toBe("/be-fr/shop/retail/pickup-message");
  });
  it("tells which country a pickup URL asks (the Vercel egress relays it)", () => {
    expect(pickupCountryOf(buildPickupUrl(["X"], "10001"))).toBe("us");
    expect(pickupCountryOf(buildPickupUrl(["X"], "", { store: "R1", country: "uk" }))).toBe("uk");
    expect(pickupCountryOf(buildPickupUrl(["X"], "", { store: "R1", country: "ch" }))).toBe("ch");
    expect(pickupCountryOf(buildPickupUrl(["X"], "", { store: "R1", country: "hk" }))).toBe("hk");
  });
  it("fetchPickupAtStore sends the country's URL and headers", async () => {
    const seen: { url: string; headers: Record<string, string> }[] = [];
    const f: FetchLike = async (url, init) => { seen.push({ url, headers: init.headers }); return { status: 200, text: async () => JSON.stringify({ body: { stores: [] } }) }; };
    await fetchPickupAtStore(["MK2E4QN/A"], "R092", f, 1000, "uk");
    await fetchPickupAtStore(["MJQ34LL/A"], "R085", f);
    expect(new URL(seen[0].url).pathname).toBe("/uk/shop/retail/pickup-message");
    expect(seen[0].headers.referer).toContain("/uk/shop/");
    expect(new URL(seen[1].url).pathname).toBe("/shop/retail/pickup-message");
    expect(seen[1].headers).toBe(APPLE_HEADERS);
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
