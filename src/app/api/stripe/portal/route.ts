import { NextResponse } from "next/server";
import { ensureUser, userById } from "@/lib/auth";
import { portalUrl } from "@/lib/billing";
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
    return NextResponse.json({ error: "portal unavailable" }, { status: 502 });
  }
}
