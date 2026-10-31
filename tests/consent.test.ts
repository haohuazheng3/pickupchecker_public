import { describe, expect, it } from "vitest";
import { analyticsAllowed, choiceFrom, consentRequiredFor, regionFrom } from "@/lib/consent";
import { GET } from "@/app/api/geo/route";

describe("consentRequiredFor — who is asked before FlowGlance loads", () => {
  it("asks in the EU, the EEA, the UK and Switzerland", () => {
    for (const c of ["DE", "FR", "IE", "NL", "NO", "IS", "LI", "GB", "CH", "de"]) expect(consentRequiredFor(c)).toBe(true);
  });
  it("loads by default elsewhere", () => {
    for (const c of ["US", "CA", "MX", "JP", "AU", "CN", "IN", "BR"]) expect(consentRequiredFor(c)).toBe(false);
  });
  it("asks when the country is unknown", () => {
    for (const c of ["", null, undefined, "  "]) expect(consentRequiredFor(c)).toBe(true);
  });
});

describe("analyticsAllowed", () => {
  it("an explicit choice wins over region and GPC", () => {
    expect(analyticsAllowed("granted", "ask", true)).toBe(true);
    expect(analyticsAllowed("declined", "default", false)).toBe(false);
  });
  it("GPC opts out where nobody has chosen", () => {
    expect(analyticsAllowed(null, "default", true)).toBe(false);
    expect(analyticsAllowed(null, "ask", true)).toBe(false);
  });
  it("the region decides otherwise: run by default, or ask (null)", () => {
    expect(analyticsAllowed(null, "default", false)).toBe(true);
    expect(analyticsAllowed(null, "ask", false)).toBeNull();
  });
});

describe("cookie parsing", () => {
  it("reads only our exact values", () => {
    expect(choiceFrom("a=1; pc_consent=declined; b=2")).toBe("declined");
    expect(choiceFrom("pc_consent=granted")).toBe("granted");
    expect(choiceFrom("pc_consent=yes")).toBeNull();
    expect(choiceFrom("xpc_consent=declined")).toBeNull();
    expect(regionFrom("pc_region=default")).toBe("default");
    expect(regionFrom("pc_region=ask; x=1")).toBe("ask");
    expect(regionFrom("pc_region=eu")).toBeNull();
  });
});

describe("GET /api/geo", () => {
  const call = async (country?: string) => {
    const res = GET(new Request("https://pickupchecker.com/api/geo", { headers: country ? { "x-vercel-ip-country": country } : {} }));
    return { body: (await res.json()) as { consentRequired: boolean; country: string | null }, cache: res.headers.get("cache-control") };
  };
  it("US: no consent needed", async () => expect((await call("US")).body).toEqual({ consentRequired: false, country: "US" }));
  it("Germany: consent first", async () => expect((await call("DE")).body).toEqual({ consentRequired: true, country: "DE" }));
  it("no header: consent first, privately cached for a day", async () => {
    const r = await call();
    expect(r.body).toEqual({ consentRequired: true, country: null });
    expect(r.cache).toBe("private, max-age=86400");
  });
});
