import { describe, expect, it, vi } from "vitest";

// A handler failure must not leave the event marked as processed: Stripe retries non-2xx
// deliveries, and the retry has to do the work instead of returning { duplicate: true }.
const state = vi.hoisted(() => ({ seen: new Set<string>(), failSync: 1, synced: 0, errors: [] as string[] }));

vi.mock("@/lib/env", () => ({ env: { stripeWebhookSecret: () => "whsec_fixture" } }));
vi.mock("@/lib/stripe", () => ({ stripe: () => ({ webhooks: { constructEvent: (body: string) => JSON.parse(body) } }) }));
vi.mock("@/lib/errors", () => ({ errorMessage: (e: unknown) => String(e), recordError: async (_s: string, m: string) => { state.errors.push(m); } }));
vi.mock("@/lib/ops", () => ({ logOps: async () => undefined }));
vi.mock("@/lib/billing", () => ({
  syncSubscription: async () => {
    if (state.failSync > 0) { state.failSync--; throw new Error("deadlock detected"); }
    state.synced++;
  },
}));
vi.mock("@/lib/db", async () => {
  const schema = await import("../src/lib/db/schema");
  let pending = "";
  return {
    schema,
    db: () => ({
      insert: () => ({ values: (v: { id: string }) => ({ onConflictDoNothing: () => ({ returning: async () => {
        if (state.seen.has(v.id)) return [];
        state.seen.add(v.id); pending = v.id; return [{ id: v.id }];
      } }) }) }),
      delete: () => ({ where: async () => { state.seen.delete(pending); } }),
      update: () => ({ set: () => ({ where: async () => undefined }) }),
    }),
  };
});

import { POST } from "@/app/api/stripe/webhook/route";

const event = { id: "evt_retry_1", type: "customer.subscription.updated", data: { object: { id: "sub_1", metadata: { app: "pickupchecker", userId: "u1" } } } };
const deliver = () => POST(new Request("https://x/api/stripe/webhook", { method: "POST", body: JSON.stringify(event), headers: { "stripe-signature": "t=1" } }));

describe("stripe webhook retries", () => {
  it("processes Stripe's retry after a failed first delivery", async () => {
    const first = await deliver();
    expect(first.status).toBe(500);
    expect(state.errors[0]).toContain("deadlock");
    expect(state.seen.has(event.id)).toBe(false);

    const retry = await deliver();
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({ received: true });
    expect(state.synced).toBe(1);

    const again = await deliver();
    expect(await again.json()).toEqual({ duplicate: true });
    expect(state.synced).toBe(1);
  });
});
