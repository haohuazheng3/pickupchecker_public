import { describe, it, expect, vi, afterEach } from "vitest";
import { COUNTRIES, formatPrice, type CountryCode } from "@/lib/apple/countries";
import { bidi, list } from "@/lib/i18n/format";
import { clockIn } from "@/lib/restockTimes";

/*
 * Strings that client components format during hydration must come out the same in Safari as on the server
 * (Node), or React discards the page's HTML (#418, 2026-11-04: Safari wrote the euro grid as "2.339 €").
 */
describe("formatting that hydrates the same in every engine", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes euros as en-US does (the one locale both engines format alike)", () => {
    const euro = (Object.keys(COUNTRIES) as CountryCode[]).filter((cc) => COUNTRIES[cc].currency === "EUR");
    expect(euro.length).toBeGreaterThan(5);
    for (const cc of euro) {
      for (const n of [999, 2339, 2339.5]) {
        const w = Number.isInteger(n);
        expect(formatPrice(COUNTRIES[cc], n)).toBe(new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", minimumFractionDigits: w ? 0 : 2, maximumFractionDigits: w ? 0 : 2 }).format(n));
      }
    }
    expect(formatPrice(COUNTRIES.nl, 2339)).toBe("€2,339");
  });

  it("puts list items back as given when Intl wraps them (Safari's Arabic isolates)", () => {
    const real = Intl.ListFormat.prototype.formatToParts;
    vi.spyOn(Intl.ListFormat.prototype, "formatToParts").mockImplementation(function (this: Intl.ListFormat, items: Iterable<string>) {
      return real.call(this, items).map((p) => (p.type === "element" ? { ...p, value: `⁨${p.value}⁩` } : p));
    });
    const out = list("ar", [bidi("أ", "ar"), "ب", "ج"]);
    expect(out.startsWith(`⁨أ⁩`)).toBe(true);
    expect(out).not.toContain("⁨⁨");
    expect(out).toContain("ب");
  });

  it("gives the timeline's clock strings from a pure helper the server can call", () => {
    expect(clockIn("en", 565)).toBe("9:25 AM");
    expect(clockIn("de", 1203)).toBe("20:03");
  });
});
