import { describe, expect, it } from "vitest";
import { englishPath, langOfPath, localeFromSegment, localeFor, localizePath, nativeLocale, NATIVE_LOCALES, pathInLocale } from "@/lib/i18n/locales";
import { publicRouteCheck } from "@/lib/seo/routes";
import { versionsOf, hreflangFor } from "@/components/pages/shared";
import { agoFine, hour, secs, stamp, plural, price, distance, fitTitleW, titleWidth } from "@/lib/i18n/format";
import { hourLabel, localStamp } from "@/lib/content/siteFacts";
import { fmtHour } from "@/lib/seo/enrich";
import { formatAgo } from "@/components/site/LiveAgo";
import { appleStoreLabel, cityLabel, colorLabel, countryLabel, regionLabel } from "@/lib/i18n/places";
import { COUNTRIES } from "@/lib/apple/countries";
import { storesOf, storePath } from "@/lib/apple/catalog";
import { offerFor } from "@/components/i18n/LangSuggest";
import { alertSubject, alertText } from "@/lib/mail/resend";
import { restockPayload } from "@/lib/push/payload";
import { CDICTS } from "@/lib/i18n/cdict/all";
import { DICTS } from "@/lib/i18n/dict/all";

describe("language versions and paths (docs/i18n.md §6)", () => {
  it("resolves segments: English trees by country code, native versions by id, nothing else", () => {
    expect(localeFromSegment("jp")).toMatchObject({ cc: "jp", lang: "en", native: false });
    expect(localeFromSegment("ja-jp")).toMatchObject({ cc: "jp", lang: "ja", native: true, tag: "ja-JP" });
    expect(localeFromSegment("us")).toBeUndefined();
    expect(localeFromSegment("xx-yy")).toBeUndefined();
    expect(nativeLocale("DE-CH")?.lang).toBe("de-CH");
    expect(NATIVE_LOCALES).toHaveLength(16);
  });
  it("moves English-form hrefs to the reader's language only where that version exists", () => {
    expect(localizePath("/jp/stores/tokyo/tokyo/ginza", "ja")).toBe("/ja-jp/stores/tokyo/tokyo/ginza");
    expect(localizePath("/jp?model=duo#notify", "ja")).toBe("/ja-jp?model=duo#notify");
    expect(localizePath("/ch/stores", "fr")).toBe("/fr-ch/stores");
    expect(localizePath("/ch/stores", "de")).toBe("/de-ch/stores");
    expect(localizePath("/de/stores", "de-CH")).toBe("/de-de/stores");
    expect(localizePath("/hk", "zh-TW")).toBe("/zh-hk"); // a Taiwanese reader gets Hong Kong's Chinese, not English
    expect(localizePath("/jp/stores", "de")).toBe("/jp/stores"); // no German Japan: English
    expect(localizePath("/stores/michigan", "ja")).toBe("/stores/michigan"); // US pages are English only
    expect(localizePath("/pricing", "ja")).toBe("/pricing");
    expect(localizePath("/jp", "en")).toBe("/jp");
  });
  it("goes back and across versions", () => {
    expect(englishPath("/ja-jp/stores/tokyo")).toBe("/jp/stores/tokyo");
    expect(englishPath("/fr-ca")).toBe("/ca");
    expect(pathInLocale("/ja-jp/map?x=1", localeFor("jp", "en"))).toBe("/jp/map?x=1");
    expect(pathInLocale("/ca/stores", localeFor("ca", "fr-CA"))).toBe("/fr-ca/stores");
  });
  it("knows which language a page renders in: native trees theirs, app pages the person's, the rest English", () => {
    expect(langOfPath("/ja-jp/stores", "en")).toBe("ja");
    expect(langOfPath("/jp/stores", "ja")).toBe("en");
    expect(langOfPath("/account", "ja")).toBe("ja");
    expect(langOfPath("/checkout/success?x", "de")).toBe("de");
    expect(langOfPath("/how-it-works", "ja")).toBe("en");
  });
  it("routes native versions like their English trees: 404 for unknown, 308 kept in the version", () => {
    expect(publicRouteCheck("/ja-jp")).toBeNull();
    expect(publicRouteCheck("/ja-jp/stores/tokyo/tokyo/ginza")).toBeNull();
    expect(publicRouteCheck("/xx-yy")).toEqual({ notFound: true });
    expect(publicRouteCheck("/ja-jp/pricing")).toEqual({ notFound: true });
    // Austria's store index is its only store: the 308 stays German.
    const r = publicRouteCheck("/de-at/stores");
    expect(r && "redirect" in r && r.redirect.startsWith("/de-at/stores/")).toBe(true);
    // Every store page of every version answers.
    for (const l of NATIVE_LOCALES) for (const s of storesOf(l.cc)) expect(publicRouteCheck(pathInLocale(storePath(s), l)), `${l.id} ${s.slug}`).toBeNull();
  });
  it("hreflang: a store's versions point at each other; equivalent pages across every version", () => {
    const v = versionsOf("/ch/stores/zurich/zurich/rennweg");
    expect(v).toEqual({ "en-CH": "/ch/stores/zurich/zurich/rennweg", "de-CH": "/de-ch/stores/zurich/zurich/rennweg", "fr-CH": "/fr-ch/stores/zurich/zurich/rennweg", "x-default": "/ch/stores/zurich/zurich/rennweg" });
    expect(versionsOf("/ja-jp/stores")).toEqual(versionsOf("/jp/stores"));
    expect(versionsOf("/stores/michigan")).toEqual({});
    expect(versionsOf("/sg/stores")).toEqual({}); // English only
    const home = hreflangFor("home");
    for (const l of NATIVE_LOCALES) expect(home[l.tag]).toBe(`/${l.id}`);
  });
  it("offers a native version to a browser that prefers it, never on native or US pages", () => {
    expect(offerFor("/jp/stores", ["ja-JP", "en"])?.id).toBe("ja-jp");
    expect(offerFor("/jp/stores", ["en-US", "ja"])).toBeNull();
    expect(offerFor("/ch", ["fr-CH"])?.id).toBe("fr-ch");
    expect(offerFor("/ca", ["fr"])?.id).toBe("fr-ca");
    expect(offerFor("/hk", ["zh-Hant-HK"])?.id).toBe("zh-hk");
    expect(offerFor("/ja-jp", ["ja"])).toBeNull();
    expect(offerFor("/stores", ["ja"])).toBeNull();
  });
});

describe("formatting keeps English exactly as it was", () => {
  it("hours, stamps, durations, ago", () => {
    for (let h = 0; h < 24; h++) { expect(hour("en", h)).toBe(fmtHour(h)); expect(hour("en", h, true)).toBe(hourLabel(h)); }
    const s = storesOf("jp")[0];
    expect(stamp("en", "2026-11-02T08:48:00Z", "Asia/Tokyo")).toBe(localStamp("2026-11-02T08:48:00Z", s));
    const now = Date.parse("2026-11-03T12:00:00Z");
    for (const ago of [3, 59, 61, 599, 601, 3599, 3601, 90000]) expect(agoFine("en", new Date(now - ago * 1000), now)).toBe(formatAgo(new Date(now - ago * 1000), now));
    expect(secs("en", 75)).toBe("1 min");
    expect(secs("en", 45)).toBe("45 s");
    expect(price("en", COUNTRIES.ca, 1449)).toBe("C$1,449");
    expect(distance("en", "uk", 10)).toBe("10 mi");
  });
  it("other languages read naturally", () => {
    expect(secs("ja", 45)).toBe("45秒");
    expect(secs("de", 45)).toBe("45 Sek.");
    expect(hour("ja", 9)).toBe("9時");
    expect(plural("fr", 0, { one: "# alerte", other: "# alertes" })).toBe("0 alerte");
    expect(price("ja", COUNTRIES.jp, 159800)).toMatch(/159,800/);
    expect(price("zh-TW", COUNTRIES.tw, 45900)).toMatch(/^NT\$/);
    expect(distance("de", "us", 10)).toBe("16 km");
    expect(titleWidth("銀座")).toBe(4);
    expect(titleWidth(fitTitleW(["あ".repeat(40)], 60))).toBeLessThanOrEqual(60);
  });
});

describe("names in each language (Apple's own)", () => {
  it("stores, cities, regions, colours, countries", () => {
    const ginza = storesOf("jp").find((s) => s.slug === "ginza")!;
    expect(appleStoreLabel(ginza, "ja")).toBe("Apple 銀座");
    expect(cityLabel("de", "Munich", "de")).toBe("München");
    expect(cityLabel("de", "Munich", "en")).toBe("Munich");
    expect(regionLabel("ca", "Quebec", "fr-CA")).toBe("Québec");
    expect(colorLabel("Night Sky", "ja")).toBe("ナイトスカイ");
    expect(colorLabel("Star White", "de-CH")).toBe("Sternenweiss");
    expect(countryLabel("jp", "ja")).toBe("日本");
    expect(countryLabel("uk", "en")).toBe("United Kingdom");
  });
});

describe("notifications keep English as it was and follow the person's language", () => {
  const store = storesOf("jp").find((s) => s.slug === "ginza")!;
  const item = { model: "iPhone Duo", storage: "256GB", color: "Night Sky", partNumber: "X", price: 1, sku: "X" } as never;
  it("English subject and push unchanged", () => {
    expect(alertSubject([{ item, store, quote: null }])).toBe("In stock: iPhone Duo 256GB Night Sky at Apple Ginza");
    expect(alertText([{ item, store, quote: null }], "https://x/account")).toContain("Good news — available for in-store pickup right now:");
    const p = restockPayload({ item, store, quote: "本日" }, "w1");
    expect(p.title).toBe("In stock: iPhone Duo 256GB Night Sky");
    expect(p.body).not.toContain("本日"); // English readers never get a Japanese quote
    expect(p.url).toBe("/jp/stores/tokyo/tokyo/ginza?from=push");
  });
  it("a Japanese reader gets Apple's names, the store's own quote and the Japanese page", () => {
    const p = restockPayload({ item, store, quote: "本日" }, "w1", new Date(), "ja");
    expect(p.title).toContain("ナイトスカイ");
    expect(p.body).toContain("Apple 銀座");
    expect(p.body).toContain("本日");
    expect(p.url).toBe("/ja-jp/stores/tokyo/tokyo/ginza?from=push");
  });
});

describe("dictionaries", () => {
  it("every language is registered (a missing one falls back to English)", () => {
    for (const l of ["en", "ja", "ko", "zh-TW", "zh-HK", "de", "de-CH", "fr", "fr-CA", "it", "es", "nl", "sv"] as const) {
      expect(DICTS[l], l).toBeTruthy();
      expect(CDICTS[l], l).toBeTruthy();
    }
  });
});
