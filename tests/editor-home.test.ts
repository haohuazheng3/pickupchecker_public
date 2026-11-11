import { describe, it, expect } from "vitest";
import { editorHomeCountry } from "@/lib/editorHome";

describe("account editor home country", () => {
  it("follows the active rules, the US winning a tie", () => {
    expect(editorHomeCountry(["de", "de", "us"], [], "fr")).toBe("de");
    expect(editorHomeCountry(["de", "us"], [], "de")).toBe("us");
  });
  it("with no active rules, keeps the country of the rules switched off", () => {
    expect(editorHomeCountry([], ["de", "de"], undefined)).toBe("de");
  });
  it("with no rules at all, uses the member's language country, not the US", () => {
    expect(editorHomeCountry([], [], "de")).toBe("de");
    expect(editorHomeCountry([], [], undefined)).toBe("us");
  });
});
