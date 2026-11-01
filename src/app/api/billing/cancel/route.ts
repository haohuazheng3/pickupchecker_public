import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUser } from "@/lib/auth";
import { BillingPermissionError, setCancelAtPeriodEnd, userPlan } from "@/lib/billing";
import { isPaidPlan } from "@/lib/plans";
import { recordError, errorMessage } from "@/lib/errors";
import { logOps } from "@/lib/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ action: z.enum(["cancel", "resume"]), confirm: z.boolean().optional() });

/**
 * The account page's "Cancel subscription" (and "Resume"). Cancelling ends the plan at the close of the
 * paid period: alerts keep working until then and nothing more is charged. It only happens with
 * `confirm: true`, sent from the confirmation the button opens; without it nothing changes.
 */
export async function POST(req: Request) {
  const u = await ensureUser();
  if (!u) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { action, confirm } = parsed.data;
  try {
    const current = await userPlan(u.id);
    if (!current.sub || !isPaidPlan(current.plan.key)) return NextResponse.json({ error: "There is no subscription to change." }, { status: 400 });
    const cancel = action === "cancel";
    if (cancel && !confirm) return NextResponse.json({ needsConfirm: true });
    if (Boolean(current.sub.cancelAtPeriodEnd) === cancel) {
      return NextResponse.json({ ok: true, cancelAtPeriodEnd: cancel, endsAt: current.sub.currentPeriodEnd?.toISOString() ?? null });
    }
    const r = await setCancelAtPeriodEnd(current.sub.id, cancel);
    await logOps("web", "info", cancel ? `subscription set to cancel (${current.plan.key})` : `subscription resumed (${current.plan.key})`, { userId: u.id, subscriptionId: current.sub.id, endsAt: r.endsAt });
    return NextResponse.json({ ok: true, cancelAtPeriodEnd: cancel, endsAt: r.endsAt });
  } catch (e) {
    await recordError("web", `subscription ${action} failed: ${errorMessage(e)}`, { userId: u.id });
    if (e instanceof BillingPermissionError) return NextResponse.json({ error: "Subscription changes are offline for a moment. Try again shortly, or use Billing and invoices.", code: "billing_permission" }, { status: 503 });
    return NextResponse.json({ error: action === "cancel" ? "The subscription wasn't cancelled. Try again in a minute." : "The subscription wasn't resumed. Try again in a minute." }, { status: 502 });
  }
}
