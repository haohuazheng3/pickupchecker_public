import { describe, expect, it, vi, beforeEach } from "vitest";

// 2026-11-15: a member cancelled in Stripe's customer portal, which sets `cancel_at` (the period end) and leaves
// `cancel_at_period_end` false. We read only the latter, so the database kept him as renewing.

const state = vi.hoisted(() => ({
  writes: [] as { values: Record<string, unknown>; set: Record<string, unknown> }[],
  updates: [] as [string, Record<string, unknown>][],
  sub: null as Record<string, unknown> | null,
}));

vi.mock("@/lib/db", () => {
  const chain = {
    insert: () => ({ values: (values: Record<string, unknown>) => ({ onConflictDoUpdate: ({ set }: { set: Record<string, unknown> }) => { state.writes.push({ values, set }); return Promise.resolve(); } }) }),
    update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
  };
  return { db: () => chain, schema: { subscriptions: { id: "id" }, users: { id: "id" }, watches: { userId: "user_id" } } };
});
vi.mock("@/lib/stripe", () => ({
  stripe: () => ({
    subscriptions: {
      retrieve: async () => state.sub,
      update: async (id: string, params: Record<string, unknown>) => {
        state.updates.push([id, params]);
        const next = { ...state.sub!, ...params };
        if (params.cancel_at === "") next.cancel_at = null;
        if (params.cancel_at_period_end === false) { next.cancel_at_period_end = false; next.cancel_at = null; }
        if (params.cancel_at_period_end === true) next.cancel_at = (state.sub as { items: { data: { current_period_end: number }[] } }).items.data[0].current_period_end;
        state.sub = next;
        return next;
      },
    },
  }),
}));

const { endsScheduled, keepGoingParams, setCancelAtPeriodEnd, syncSubscription } = await import("@/lib/billing");

const PERIOD_END = 1796768685; // 2026-12-08 22:24:45 UTC
const sub = (o: Record<string, unknown>) => ({
  id: "sub_1", customer: "cus_1", status: "active", metadata: { userId: "user_1" },
  items: { data: [{ id: "si_1", current_period_end: PERIOD_END, price: { id: "price_max", metadata: { plan: "max" }, unit_amount: 2000 } }] },
  cancel_at_period_end: false, cancel_at: null, ...o,
});

describe("endsScheduled / keepGoingParams — both ways Stripe records a scheduled end", () => {
  it("our cancel (cancel_at_period_end), a portal cancel (cancel_at only), or neither", () => {
    expect(endsScheduled({ cancel_at_period_end: true, cancel_at: PERIOD_END })).toBe(true);
    expect(endsScheduled({ cancel_at_period_end: false, cancel_at: PERIOD_END })).toBe(true);
    expect(endsScheduled({ cancel_at_period_end: false, cancel_at: null })).toBe(false);
  });
  it("undoing it: cancel_at_period_end false for ours, cancel_at '' for the portal's, nothing when nothing is scheduled", () => {
    expect(keepGoingParams({ cancel_at_period_end: true, cancel_at: PERIOD_END })).toEqual({ cancel_at_period_end: false });
    expect(keepGoingParams({ cancel_at_period_end: false, cancel_at: PERIOD_END })).toEqual({ cancel_at: "" });
    expect(keepGoingParams({ cancel_at_period_end: false, cancel_at: null })).toBeNull();
  });
});

describe("syncSubscription / setCancelAtPeriodEnd with a portal cancellation", () => {
  beforeEach(() => { state.writes = []; state.updates = []; state.sub = null; });

  it("a portal cancellation (cancel_at set, cancel_at_period_end false) is stored as ending, both on insert and on update", async () => {
    await syncSubscription(sub({ cancel_at: PERIOD_END }) as never);
    expect(state.writes[0].values.cancelAtPeriodEnd).toBe(true);
    expect(state.writes[0].set.cancelAtPeriodEnd).toBe(true);
    await syncSubscription(sub({}) as never);
    expect(state.writes[1].set.cancelAtPeriodEnd).toBe(false);
  });

  it("resuming a portal cancellation clears cancel_at, and the row says renewing again", async () => {
    state.sub = sub({ cancel_at: PERIOD_END });
    await setCancelAtPeriodEnd("sub_1", false);
    expect(state.updates).toEqual([["sub_1", { cancel_at: "" }]]);
    expect(state.writes.at(-1)!.set.cancelAtPeriodEnd).toBe(false);
  });

  it("cancelling still sets cancel_at_period_end, and resuming that one sets it back", async () => {
    state.sub = sub({});
    await setCancelAtPeriodEnd("sub_1", true);
    expect(state.updates).toEqual([["sub_1", { cancel_at_period_end: true }]]);
    expect(state.writes.at(-1)!.set.cancelAtPeriodEnd).toBe(true);
    await setCancelAtPeriodEnd("sub_1", false);
    expect(state.updates.at(-1)).toEqual(["sub_1", { cancel_at_period_end: false }]);
    expect(state.writes.at(-1)!.set.cancelAtPeriodEnd).toBe(false);
  });

  it("resuming when nothing is scheduled changes nothing in Stripe", async () => {
    state.sub = sub({});
    await setCancelAtPeriodEnd("sub_1", false);
    expect(state.updates).toEqual([]);
  });
});
