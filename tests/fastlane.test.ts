import { describe, it, expect } from "vitest";
import { buildFastTasks, targetsFromRules, type RuleRow, type SubRow } from "@/lib/stock/fastlane";
import { partNumbersFor } from "@/lib/apple/catalog";

const t0 = new Date("2026-11-01T00:00:00Z");
let n = 0;
const rule = (userId: string, store: string, over: Partial<RuleRow> = {}): RuleRow => ({
  id: `w${++n}`, userId, active: true, paused: false, createdAt: new Date(t0.getTime() + n * 1000),
  model: "duo", storages: ["256GB"], colors: ["Night Sky"], storeNumbers: [store], ...over,
});
const plus = (userId: string): SubRow => ({ userId, plan: "plus", status: "active", alertLimit: 10 });
const duoPart = partNumbersFor("duo", ["256GB"], ["Night Sky"])[0];

describe("targetsFromRules — the fast lane checks exactly what would alert", () => {
  it("nothing for a user without a plan, and only the covered (oldest `limit`) rules of a paid one", () => {
    const free = [rule("u0", "R085")];
    expect(targetsFromRules(free, []).size).toBe(0);
    const stores = Array.from({ length: 12 }, (_, i) => `R${String(100 + i).padStart(3, "0")}`);
    const many = stores.map((s) => rule("u1", s));
    const t = targetsFromRules(many, [plus("u1")]);
    expect([...t.keys()]).toEqual(stores.slice(0, 10).sort());
    expect(t.get("R100")).toEqual([duoPart]);
  });
  it("skips paused and legacy-shaped rules and unknown stores", () => {
    const rules = [
      rule("u1", "R085", { paused: true }),
      rule("u1", "R216", { storages: ["256GB", "512GB"] }),
      rule("u1", "R999"),
      rule("u1", "R258"),
    ];
    expect([...targetsFromRules(rules, [plus("u1")]).keys()]).toEqual(["R258"]);
  });
  it("merges two users on one store into one sorted, de-duplicated part list", () => {
    const rules = [rule("u1", "R085"), rule("u2", "R085"), rule("u2", "R085", { colors: ["Star White"] })];
    const t = targetsFromRules(rules, [plus("u1"), plus("u2")]);
    const parts = t.get("R085")!;
    expect(parts).toHaveLength(2);
    expect(parts).toEqual([...parts].sort());
    expect(parts).toContain(duoPart);
  });
  it("counts coverage per user, not across users", () => {
    const rules = [...Array.from({ length: 10 }, (_, i) => rule("u1", `R${200 + i}`)), rule("u2", "R085")];
    expect(targetsFromRules(rules, [plus("u1"), plus("u2")]).has("R085")).toBe(true);
  });
});

describe("buildFastTasks", () => {
  it("one request per store, split at 20 parts", () => {
    const tasks = buildFastTasks(new Map([["R085", Array.from({ length: 25 }, (_, i) => `P${i}`)], ["R216", ["P0"]]]));
    expect(tasks.map((t) => [t.storeNumber, t.parts.length])).toEqual([["R085", 20], ["R085", 5], ["R216", 1]]);
  });
});
