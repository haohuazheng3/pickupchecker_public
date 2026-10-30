import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { ensureUser } from "@/lib/auth";
import { BillingPermissionError, createCheckout, changePlan, userPlan } from "@/lib/billing";
import { userById } from "@/lib/auth";
import { comparePlans, isPaidPlan } from "@/lib/plans";
import { db, schema } from "@/lib/db";
import { recordError, errorMessage } from "@/lib/errors";
import { logOps } from "@/lib/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ plan: z.enum(["plus", "pro", "max"]), watchId: z.string().min(1).optional() });

/**
 * Pick a paid plan. No subscription yet → Stripe Checkout (card or Link). Already on a paid plan →
 * switch it in place (upgrade or downgrade, prorated). Same plan → nothing to do.
 */
export async function POST(req: Request) {
  const u = await ensureUser();
  if (!u) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { plan, watchId } = parsed.data;
  if (watchId) {
    const [watch] = await db().select({ id: schema.watches.id }).from(schema.watches).where(and(eq(schema.watches.id, watchId), eq(schema.watches.userId, u.id))).limit(1);
    if (!watch) return NextResponse.json({ error: "watch not found" }, { status: 404 });
  }
  try {
    const current = await userPlan(u.id);
    if (current.sub && isPaidPlan(current.plan.key)) {
      if (comparePlans(plan, current.plan.key) === 0) return NextResponse.json({ alreadySubscribed: true, url: "/account" });
      const row = await userById(u.id);
      const r = await changePlan(current.sub.id, plan, row?.stripeCustomerId);
      if (r.url) return NextResponse.json({ url: r.url }); // Stripe's hosted plan-change page
      await logOps("web", "info", `plan changed ${current.plan.key} → ${plan}`, { userId: u.id });
      return NextResponse.json({ changed: true, url: `/account?plan=${plan}` });
    }
    const url = await createCheckout(u.id, u.email, plan, watchId ?? null);
    return NextResponse.json({ url });
  } catch (e) {
    await recordError("web", `checkout failed: ${errorMessage(e)}`, { userId: u.id, plan });
    if (e instanceof BillingPermissionError) return NextResponse.json({ error: "Plan changes are offline for a moment. Your current plan keeps working.", code: "billing_permission" }, { status: 503 });
    return NextResponse.json({ error: "Checkout didn't open. Try again in a minute." }, { status: 502 });
  }
}
