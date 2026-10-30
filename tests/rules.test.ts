import { describe, it, expect } from "vitest";
import { ruleMatches } from "@/lib/stock/notify";
import { Body, phonesOf, ruleConfig, storeNumbersOf } from "@/app/api/watches/route";

const rule = { model: "duo", storages: ["512GB"], colors: ["Night Sky"], storeNumbers: ["R123"] };

describe("one rule = one store × one exact configuration", () => {
  it("matches only the same store, storage and colour", () => {
    expect(ruleMatches(rule, "duo", "512GB", "Night Sky", "R123")).toBe(true);
    expect(ruleMatches(rule, "duo", "512GB", "Star White", "R123")).toBe(false);
    expect(ruleMatches(rule, "duo", "256GB", "Night Sky", "R123")).toBe(false);
    expect(ruleMatches(rule, "duo", "512GB", "Night Sky", "R999")).toBe(false);
    expect(ruleMatches(rule, "18-pro", "512GB", "Night Sky", "R123")).toBe(false);
  });
  it("never matches a legacy-shaped rule (any storage, several stores, all US)", () => {
    expect(ruleMatches({ model: "duo", storages: [], colors: [], storeNumbers: [] }, "duo", "512GB", "Night Sky", "R123")).toBe(false);
    expect(ruleMatches({ model: "duo", storages: ["512GB"], colors: ["Night Sky"], storeNumbers: ["R123", "R124"] }, "duo", "512GB", "Night Sky", "R123")).toBe(false);
  });
  it("resolves the part number of a well-formed rule and rejects the rest", () => {
    expect(ruleConfig(rule)?.partNumber).toMatch(/LL\/A$/);
    expect(ruleConfig({ model: "duo", storages: ["512GB"], colors: ["Purple"], storeNumbers: ["R123"] })).toBeNull();
    expect(ruleConfig({ model: "duo", storages: [], colors: [], storeNumbers: [] })).toBeNull();
  });
  it("the API body needs at least one phone and one store", () => {
    expect(Body.safeParse({ model: "duo", storage: "512GB", color: "Night Sky", storeNumber: "R123" }).success).toBe(true);
    expect(Body.safeParse({ model: "duo", storage: "512GB", color: "Night Sky", storeNumbers: ["R123", "R124"] }).success).toBe(true);
    expect(Body.safeParse({ items: [{ model: "duo", storage: "512GB", color: "Night Sky" }, { model: "18-pro", storage: "256GB", color: "Silver" }], storeNumbers: ["R123"] }).success).toBe(true);
    expect(Body.safeParse({ model: "duo", storages: ["512GB"], colors: ["Night Sky"], storeNumbers: ["R123"] }).success).toBe(false);
    expect(Body.safeParse({ model: "duo", storage: "512GB", color: "Night Sky" }).success).toBe(false);
    expect(Body.safeParse({ items: [], storeNumbers: ["R123"] }).success).toBe(false);
    expect(Body.safeParse({ storeNumbers: ["R123"] }).success).toBe(false);
    expect(Body.safeParse({ model: "duo", storage: "512GB", color: "Night Sky", storeNumbers: [] }).success).toBe(false);
    expect(Body.safeParse({ model: "duo", storage: "512GB", color: "Night Sky", storeNumber: "X1" }).success).toBe(false);
    expect(Body.safeParse({ model: "duo", storage: "512GB", color: "Night Sky", storeNumbers: ["R123", "X1"] }).success).toBe(false);
    expect(Body.safeParse({ model: "duo", storage: "512GB", color: "Night Sky", storeNumbers: Array.from({ length: 101 }, (_, i) => `R${100 + i}`) }).success).toBe(false);
  });
  it("phones are de-duplicated and the single form joins the list", () => {
    expect(phonesOf({ items: [{ model: "duo", storage: "512GB", color: "Night Sky" }, { model: "duo", storage: "512GB", color: "Night Sky" }], model: "duo", storage: "256GB", color: "Star White" })).toEqual([
      { model: "duo", storage: "512GB", color: "Night Sky" }, { model: "duo", storage: "256GB", color: "Star White" },
    ]);
  });
  it("one rule per store, in tick order, without repeats", () => {
    expect(storeNumbersOf({ storeNumbers: ["R124", "R123", "R124"] })).toEqual(["R124", "R123"]);
    expect(storeNumbersOf({ storeNumber: "R123" })).toEqual(["R123"]);
    expect(storeNumbersOf({ storeNumbers: ["R123"], storeNumber: "R123" })).toEqual(["R123"]);
  });
});
