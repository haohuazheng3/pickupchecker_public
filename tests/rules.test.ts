import { describe, it, expect } from "vitest";
import { ruleMatches } from "@/lib/stock/notify";
import { Body, ruleConfig } from "@/app/api/watches/route";

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
  it("the API body needs exactly one of each", () => {
    expect(Body.safeParse({ model: "duo", storage: "512GB", color: "Night Sky", storeNumber: "R123" }).success).toBe(true);
    expect(Body.safeParse({ model: "duo", storages: ["512GB"], colors: ["Night Sky"], storeNumbers: ["R123"] }).success).toBe(false);
    expect(Body.safeParse({ model: "duo", storage: "512GB", color: "Night Sky" }).success).toBe(false);
    expect(Body.safeParse({ model: "duo", storage: "512GB", color: "Night Sky", storeNumber: "X1" }).success).toBe(false);
  });
});
