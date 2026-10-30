import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureUser } from "@/lib/auth";
import { previewPlanChange, userPlan, isPermissionError } from "@/lib/billing";
import { comparePlans, isPaidPlan } from "@/lib/plans";
import { recordError, errorMessage } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ plan: z.enum(["plus", "pro", "max"]) });

/** What switching the current subscription to `plan` costs today and from the next renewal. Changes nothing. */
export async function POST(req: Request) {
  const u = await ensureUser();
  if (!u) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const current = await userPlan(u.id);
  if (!current.sub || !isPaidPlan(current.plan.key)) return NextResponse.json({ error: "no plan to change — choose one first" }, { status: 400 });
  if (comparePlans(parsed.data.plan, current.plan.key) === 0) return NextResponse.json({ error: "that is your plan already" }, { status: 400 });
  try {
    return NextResponse.json(await previewPlanChange(current.sub.id, parsed.data.plan), { headers: { "cache-control": "private, no-store" } });
  } catch (e) {
    await recordError("web", `plan preview failed: ${errorMessage(e)}`, { userId: u.id });
    if (isPermissionError(e)) return NextResponse.json({ error: "Plan changes are offline for a moment. Your current plan keeps working." }, { status: 503 });
    return NextResponse.json({ error: "Couldn't price the change. Try again in a minute." }, { status: 502 });
  }
}
