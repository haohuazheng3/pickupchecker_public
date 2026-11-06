import { describe, expect, it } from "vitest";
import { countryOf, modelOf, normColor, normStorage, ATTRIBUTION, CACHE_SEC, RATE_PER_MIN } from "@/lib/api/v1";
import { DECIDE_SLUGS, equivalentPath, hreflangFor } from "@/components/pages/shared";
import { NATIVE_LOCALES } from "@/lib/i18n/locales";
import { CHANNELS } from "@/lib/content/channels";
import { ALL_CODES } from "@/lib/apple/countries";

describe("public API v1 — parameter parsing", () => {
  it("accepts the 19 country codes and gb for the UK, rejects the rest", () => {
    expect(countryOf("us")).toBe("us");
    expect(countryOf("GB")).toBe("uk");
    expect(countryOf("uk")).toBe("uk");
    expect(countryOf("cn")).toBeNull();
    expect(countryOf("")).toBeNull();
  });
  it("reads models in every spelling people try, defaulting to the Duo", () => {
    expect(modelOf(null)).toBe("duo");
    expect(modelOf("duo")).toBe("duo");
    expect(modelOf("iphone-duo")).toBe("duo");
    expect(modelOf("18-pro-max")).toBe("18-pro-max");
    expect(modelOf("iphone-18-pro")).toBe("18-pro");
    expect(modelOf("pixel")).toBeNull();
  });
  it("normalises storage and colour the way the catalogue spells them", () => {
    expect(normStorage("512gb")).toBe("512GB");
    expect(normStorage(" 1 tb ")).toBe("1TB");
    expect(normColor("night-sky")).toBe("Night Sky");
    expect(normColor("STAR_WHITE")).toBe("Star White");
    expect(normColor(null)).toBeUndefined();
  });
  it("states its terms: 30 s cache, 60 requests a minute, attribution to pickupchecker.com", () => {
    expect(CACHE_SEC).toBe(30);
    expect(RATE_PER_MIN).toBe(60);
    expect(ATTRIBUTION.url).toBe("https://pickupchecker.com");
    expect(ATTRIBUTION.docs).toContain("/iphone-duo-stock-api");
  });
});

describe("decision pages — every country and language has the four", () => {
  it("equivalentPath knows the slugs and hreflang clusters are complete", () => {
    for (const page of ["configs", "shortage", "channels", "api"] as const) {
      expect(equivalentPath("us", page)).toBe(`/${DECIDE_SLUGS[page]}`);
      expect(equivalentPath("jp", page)).toBe(`/jp/${DECIDE_SLUGS[page]}`);
      const en = hreflangFor(page);
      expect(Object.keys(en)).toHaveLength(ALL_CODES.length + 1); // 19 countries + x-default
      expect(en["x-default"]).toBe(`/${DECIDE_SLUGS[page]}`);
      const native = hreflangFor(page, NATIVE_LOCALES[0]);
      expect(Object.keys(native)).toHaveLength(NATIVE_LOCALES.length);
      expect(native["ja-JP"]).toBe(`/ja-jp/${DECIDE_SLUGS[page]}`);
    }
  });
  it("the channels table covers every country with carriers, retailers, resale and sources", () => {
    for (const cc of ALL_CODES) {
      const c = CHANNELS[cc];
      expect(c.carriers.length, cc).toBeGreaterThanOrEqual(2);
      expect(c.retailers.length, cc).toBeGreaterThanOrEqual(2);
      expect(c.resale.length, cc).toBeGreaterThanOrEqual(1);
      expect(c.sources.length, cc).toBeGreaterThanOrEqual(2);
      expect(c.returnDays === null || c.returnDays >= 0, cc).toBe(true);
      for (const s of c.sources) expect(s.url, cc).toMatch(/^https:\/\//);
    }
    expect(CHANNELS.hk.returnDays).toBe(0);
    expect(CHANNELS.ca.returnDays).toBe(15);
  });
});
