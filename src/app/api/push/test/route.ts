import { NextResponse } from "next/server";
import { ensureUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { enabledSubscriptionsForUser, sendPushToRows, pushConfigured } from "@/lib/push/server";
import { testPayload } from "@/lib/push/payload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** "Send a test" on the account / install pages: one notification to every enabled device. */
export async function POST() {
  const u = await ensureUser();
  if (!u) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  if (!pushConfigured()) return NextResponse.json({ error: "push is not configured on the server" }, { status: 503 });
  if (!(await rateLimit(`push-test:${u.id}`, 10, 60 * 60 * 1000))) return NextResponse.json({ error: "too many tests — try again in an hour" }, { status: 429 });
  const rows = await enabledSubscriptionsForUser(u.id);
  if (rows.length === 0) return NextResponse.json({ error: "no device has notifications on" }, { status: 400 });
  const r = await sendPushToRows(rows, testPayload(), { ttlSec: 60 });
  return NextResponse.json({ sent: r.sent, failed: r.failed, disabled: r.disabled, errors: r.errors.slice(0, 3) });
}
