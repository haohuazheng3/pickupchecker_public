import { describe, expect, it, vi, beforeEach } from "vitest";
import { effectivePlan, planInForce } from "@/lib/plans";

/**
 * Plan changes (owner, 2026-11-11): an upgrade is charged for the days left and starts at once; a downgrade starts at
 * the next renewal and is never refunded or credited — no Stripe balance, so "upgrade, use, downgrade, cancel" has
 * nothing to collect. The Stripe client is a fake that applies updates to one subscription and records every call.
 */
const START = 1_762_000_000, END = START + 30 * 86_400;
const price = (id: string) => ({ id, unit_amount: id === "price_max" ? 2000 : id === "price_pro" ? 1000 : 500, metadata: {} as Record<string, string> });
type Sub = {
  id: string; customer: string; status: string; cancel_at_period_end: boolean; metadata: Record<string, string>; discounts: unknown[];
  default_payment_method: null; pending_update: null | object; items: { data: { id: string; price: ReturnType<typeof price>; current_period_start: number; current_period_end: number }[] };
};
const st = vi.hoisted(() => ({ sub: null as unknown as Sub, calls: [] as Record<string, unknown>[], previews: 0, bankConfirm: false }));

vi.hoisted(() => {
  process.env.STRIPE_PRICE_MONTHLY = "price_plus";
  process.env.STRIPE_PRICE_PRO = "price_pro";
  process.env.STRIPE_PRICE_MAX = "price_max";
});

vi.mock("@/lib/stripe", () => ({
  stripe: () => ({
    subscriptions: {
      retrieve: async () => structuredClone(st.sub),
      update: async (_id: string, params: Record<string, unknown>) => {
        st.calls.push(params);
        const items = params.items as { price: string }[] | undefined;
        if (st.bankConfirm && params.payment_behavior === "pending_if_incomplete") return { ...structuredClone(st.sub), pending_update: { expires_at: 1 } };
        if (items) st.sub.items.data[0].price = price(items[0].price);
        if (params.metadata) for (const [k, v] of Object.entries(params.metadata as Record<string, string>)) { if (v === "") delete st.sub.metadata[k]; else st.sub.metadata[k] = v; }
        if (typeof params.cancel_at_period_end === "boolean") st.sub.cancel_at_period_end = params.cancel_at_period_end;
        return structuredClone(st.sub);
      },
    },
    invoices: { createPreview: async () => { st.previews++; throw new Error("Invoices Read missing"); } },
    paymentMethods: { retrieve: async () => ({}) },
  }),
}));
vi.mock("@/lib/db", async () => {
  // Any chain (insert().values().onConflictDoUpdate(), update().set().where()) resolves to nothing.
  const chain: unknown = new Proxy(() => chain, { get: (_t, p) => (p === "then" ? (res: (v: unknown) => void) => res(undefined) : () => chain), apply: () => chain });
  return { db: () => chain, schema: await vi.importActual("@/lib/db/schema") };
});

const fresh = (plan: "plus" | "pro" | "max", meta: Record<string, string> = {}): Sub => ({
  id: "sub_1", customer: "cus_1", status: "active", cancel_at_period_end: false, metadata: { userId: "user_1", app: "pickupchecker", ...meta }, discounts: [],
  default_payment_method: null, pending_update: null, items: { data: [{ id: "si_1", price: price(`price_${plan}`), current_period_start: START, current_period_end: END }] },
});
const billing = () => import("@/lib/billing");

describe("planInForce", () => {
  it("keeps the plan paid for until that period ends, then the price's plan", () => {
    expect(planInForce("plus", { paid_plan: "max", paid_until: String(END) }, END)).toEqual({ plan: "max", nextPlan: "plus" });
    expect(planInForce("plus", { paid_plan: "max", paid_until: String(END) }, END + 30 * 86_400)).toEqual({ plan: "plus", nextPlan: null });
    expect(planInForce("pro", {}, END)).toEqual({ plan: "pro", nextPlan: null });
    // A stale or nonsensical marker never raises the plan above what was paid.
    expect(planInForce("max", { paid_plan: "plus", paid_until: String(END) }, END)).toEqual({ plan: "max", nextPlan: null });
  });
  it("effectivePlan applies a waiting downgrade once its period is over, even before the renewal is synced", () => {
    const sub = { plan: "max", status: "active", alertLimit: 50, nextPlan: "plus", currentPeriodEnd: new Date(END * 1000) };
    expect(effectivePlan([sub], END * 1000 - 1).plan.limit).toBe(50);
    expect(effectivePlan([sub], END * 1000 + 1).plan).toMatchObject({ key: "plus", limit: 10 });
  });
});

describe("changePlan", () => {
  beforeEach(() => { st.calls = []; st.previews = 0; st.bankConfirm = false; vi.useFakeTimers(); vi.setSystemTime((START + 86_400) * 1000); });

  it("a downgrade charges, refunds and credits nothing: the lower price waits for the renewal", async () => {
    st.sub = fresh("max");
    const r = await (await billing()).changePlan("sub_1", "plus");
    expect(r.startsAt).toBe(new Date(END * 1000).toISOString());
    expect(st.calls).toHaveLength(1);
    expect(st.calls[0]).toMatchObject({ items: [{ id: "si_1", price: "price_plus" }], proration_behavior: "none", metadata: { paid_plan: "max", paid_until: String(END) } });
    expect(planInForce("plus", st.sub.metadata, END)).toEqual({ plan: "max", nextPlan: "plus" });
  });
  it("never sends a prorating update for a downgrade, from any plan to any lower one", async () => {
    for (const [from, to] of [["max", "pro"], ["max", "plus"], ["pro", "plus"]] as const) {
      st.sub = fresh(from); st.calls = [];
      await (await billing()).changePlan("sub_1", to);
      expect(st.calls.every((c) => c.proration_behavior === "none")).toBe(true);
    }
  });
  it("choosing the paid plan again undoes the waiting downgrade, at no charge", async () => {
    st.sub = fresh("plus", { paid_plan: "max", paid_until: String(END) });
    const r = await (await billing()).changePlan("sub_1", "max");
    expect(r.startsAt).toBeNull();
    expect(st.calls).toEqual([expect.objectContaining({ items: [{ id: "si_1", price: "price_max" }], proration_behavior: "none" })]);
    expect(st.sub.metadata.paid_plan).toBeUndefined();
  });
  it("another lower plan while one waits moves the waiting plan, still from the plan paid for", async () => {
    st.sub = fresh("plus", { paid_plan: "max", paid_until: String(END) });
    await (await billing()).changePlan("sub_1", "pro");
    expect(st.calls[0]).toMatchObject({ items: [{ id: "si_1", price: "price_pro" }], proration_behavior: "none", metadata: { paid_plan: "max" } });
    expect(planInForce("pro", st.sub.metadata, END)).toEqual({ plan: "max", nextPlan: "pro" });
  });
  it("the same waiting plan again changes nothing", async () => {
    st.sub = fresh("plus", { paid_plan: "max", paid_until: String(END) });
    const r = await (await billing()).changePlan("sub_1", "plus");
    expect(r.startsAt).toBe(new Date(END * 1000).toISOString());
    expect(st.calls).toEqual([]);
  });
  it("an upgrade over a waiting downgrade goes back to the paid price first, so only the difference from it is charged", async () => {
    st.sub = fresh("plus", { paid_plan: "pro", paid_until: String(END) });
    await (await billing()).changePlan("sub_1", "max");
    expect(st.calls[0]).toMatchObject({ items: [{ price: "price_pro" }], proration_behavior: "none" });
    expect(st.calls[1]).toMatchObject({ items: [{ price: "price_max" }], proration_behavior: "always_invoice", payment_behavior: "pending_if_incomplete" });
  });
  it("a plain upgrade is charged at once, as before", async () => {
    st.sub = fresh("plus");
    const r = await (await billing()).changePlan("sub_1", "pro");
    expect(r.pending).toBeUndefined();
    expect(st.calls[0]).toMatchObject({ items: [{ price: "price_pro" }], proration_behavior: "always_invoice" });
  });
  it("an upgrade waiting for the bank leaves the old plan", async () => {
    st.sub = fresh("plus"); st.bankConfirm = true;
    expect(await (await billing()).changePlan("sub_1", "max")).toEqual({ pending: true });
    expect(st.sub.items.data[0].price.id).toBe("price_plus");
  });
});

describe("previewPlanChange", () => {
  beforeEach(() => { st.calls = []; st.previews = 0; vi.useFakeTimers(); vi.setSystemTime((START + 86_400) * 1000); });

  it("a downgrade costs $0 today and starts at the renewal, without asking Stripe to price it", async () => {
    st.sub = fresh("max");
    const p = await (await billing()).previewPlanChange("sub_1", "plus");
    expect(p).toMatchObject({ from: "max", to: "plus", upgrade: false, atRenewal: true, nowCents: 0, monthlyCents: 500, renewsAt: new Date(END * 1000).toISOString() });
    expect(st.previews).toBe(0);
  });
  it("an upgrade over a waiting downgrade is priced from the plan paid for", async () => {
    st.sub = fresh("plus", { paid_plan: "pro", paid_until: String(END) });
    const p = await (await billing()).previewPlanChange("sub_1", "max");
    expect(p).toMatchObject({ from: "pro", upgrade: true, atRenewal: false, exact: false });
    expect(p.nowCents).toBe(Math.round(1000 * (29 / 30)));
  });
  it("a plain upgrade charges the difference for the days left", async () => {
    st.sub = fresh("plus");
    const p = await (await billing()).previewPlanChange("sub_1", "max");
    expect(p.nowCents).toBe(Math.round(1500 * (29 / 30)));
    expect(st.previews).toBe(1);
  });
});
