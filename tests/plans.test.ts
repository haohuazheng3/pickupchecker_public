import { describe, it, expect } from "vitest";
import { effectivePlan, coveredWatchIds, planFromPrice, PLANS } from "@/lib/plans";

describe("plans", () => {
  it("free by default, highest active paid plan wins, lapsed ones ignored", () => {
    expect(effectivePlan([]).plan.key).toBe("free");
    expect(effectivePlan([{ plan: "plus", status: "canceled", alertLimit: 10 }]).plan.key).toBe("free");
    expect(effectivePlan([{ plan: "plus", status: "active", alertLimit: 10 }, { plan: "pro", status: "past_due", alertLimit: 20 }]).plan.limit).toBe(20);
    expect(effectivePlan([{ plan: "plus", status: "trialing", alertLimit: 10 }]).plan.key).toBe("plus");
  });
  it("covers the oldest rules up to the limit", () => {
    const rules = [
      { id: "c", active: true, createdAt: "2026-10-03T00:00:00Z" },
      { id: "a", active: true, createdAt: "2026-10-01T00:00:00Z" },
      { id: "x", active: false, createdAt: "2026-09-01T00:00:00Z" },
      { id: "b", active: true, createdAt: "2026-10-02T00:00:00Z" },
    ];
    expect([...coveredWatchIds(rules, PLANS.free.limit)]).toEqual([]); // no free alerts
    expect([...coveredWatchIds(rules, 1)]).toEqual(["a"]);
    expect([...coveredWatchIds(rules, 2)]).toEqual(["a", "b"]);
    expect(coveredWatchIds(rules, 10).size).toBe(3);
    expect(coveredWatchIds(rules, 0).size).toBe(0);
  });
  it("maps Stripe prices to plans by metadata, then amount", () => {
    expect(planFromPrice({ id: "price_x", metadata: { plan: "pro" } })).toBe("pro");
    expect(planFromPrice({ id: "price_y", metadata: {}, unit_amount: 1000 })).toBe("pro");
    expect(planFromPrice({ id: "price_z", metadata: {}, unit_amount: 500 })).toBe("plus");
    expect(planFromPrice(null)).toBe("plus");
  });
});
