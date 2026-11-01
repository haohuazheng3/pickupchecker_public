import { describe, expect, it, vi, beforeEach } from "vitest";

const state = vi.hoisted(() => ({
  user: { id: "user_1", email: "a@b.c" } as { id: string; email: string } | null,
  sub: { id: "sub_1", cancelAtPeriodEnd: false, currentPeriodEnd: new Date("2026-12-01T21:57:46Z") } as { id: string; cancelAtPeriodEnd: boolean; currentPeriodEnd: Date | null } | null,
  planKey: "pro" as string,
  calls: [] as [string, boolean][],
  fail: null as Error | null,
}));

vi.mock("@/lib/auth", () => ({ ensureUser: async () => state.user }));
vi.mock("@/lib/ops", () => ({ logOps: async () => undefined }));
vi.mock("@/lib/errors", () => ({ recordError: async () => undefined, errorMessage: (e: unknown) => String(e) }));
vi.mock("@/lib/billing", () => {
  class BillingPermissionError extends Error {}
  return {
    BillingPermissionError,
    userPlan: async () => ({ plan: { key: state.planKey }, sub: state.sub }),
    setCancelAtPeriodEnd: async (id: string, cancel: boolean) => {
      if (state.fail) throw state.fail;
      state.calls.push([id, cancel]);
      return { endsAt: "2026-12-01T21:57:46.000Z" };
    },
  };
});

const post = async (body: unknown) => {
  const { POST } = await import("@/app/api/billing/cancel/route");
  const res = await POST(new Request("https://pickupchecker.com/api/billing/cancel", { method: "POST", body: JSON.stringify(body) }));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
};

describe("POST /api/billing/cancel", () => {
  beforeEach(() => {
    state.user = { id: "user_1", email: "a@b.c" };
    state.sub = { id: "sub_1", cancelAtPeriodEnd: false, currentPeriodEnd: new Date("2026-12-01T21:57:46Z") };
    state.planKey = "pro";
    state.calls = [];
    state.fail = null;
  });

  it("changes nothing without the confirmation step", async () => {
    const r = await post({ action: "cancel" });
    expect(r.body.needsConfirm).toBe(true);
    expect(state.calls).toEqual([]);
  });
  it("cancels at period end once confirmed, and says until when", async () => {
    const r = await post({ action: "cancel", confirm: true });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, cancelAtPeriodEnd: true, endsAt: "2026-12-01T21:57:46.000Z" });
    expect(state.calls).toEqual([["sub_1", true]]);
  });
  it("resumes a cancelled subscription (no confirmation needed to keep paying as before)", async () => {
    state.sub!.cancelAtPeriodEnd = true;
    const r = await post({ action: "resume" });
    expect(r.body).toMatchObject({ ok: true, cancelAtPeriodEnd: false });
    expect(state.calls).toEqual([["sub_1", false]]);
  });
  it("is a no-op when already in the asked state", async () => {
    state.sub!.cancelAtPeriodEnd = true;
    const r = await post({ action: "cancel", confirm: true });
    expect(r.body).toMatchObject({ ok: true, cancelAtPeriodEnd: true });
    expect(state.calls).toEqual([]);
  });
  it("refuses without a paid subscription, or signed out", async () => {
    state.sub = null; state.planKey = "free";
    expect((await post({ action: "cancel", confirm: true })).status).toBe(400);
    state.user = null;
    expect((await post({ action: "cancel", confirm: true })).status).toBe(401);
  });
  it("reports a Stripe failure without pretending it worked", async () => {
    state.fail = new Error("stripe down");
    const r = await post({ action: "cancel", confirm: true });
    expect(r.status).toBe(502);
    expect(r.body.ok).toBeUndefined();
  });
});
