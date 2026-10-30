import { NextResponse } from "next/server";
import { ensureUser, userById } from "@/lib/auth";
import { isPermissionError, portalUrl } from "@/lib/billing";
import { recordError, errorMessage } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const u = await ensureUser();
  if (!u) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  const row = await userById(u.id);
  if (!row?.stripeCustomerId) return NextResponse.json({ error: "no billing account yet" }, { status: 404 });
  try {
    return NextResponse.json({ url: await portalUrl(row.stripeCustomerId) });
  } catch (e) {
    await recordError("web", `portal failed: ${errorMessage(e)}`, { userId: u.id });
    if (isPermissionError(e)) return NextResponse.json({ error: "Billing is offline for a moment. Your plan keeps working.", code: "billing_permission" }, { status: 503 });
    return NextResponse.json({ error: "Billing didn't open. Try again in a minute." }, { status: 502 });
  }
}
