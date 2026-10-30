import { NextResponse } from "next/server";
import { ensureUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { enabledSubscriptionsForUser, sendPushToRows, pushConfigured } from "@/lib/push/server";
import { deviceLabel, testPayload } from "@/lib/push/payload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Send a test notification" on the account / install pages. Each enabled device gets its own
 * payload naming the device and the send time, so the user can tell which phone a banner landed on
 * and how long it took. Goes through web-push and Apple/Google exactly like a restock alert.
 */
export async function POST() {
  const u = await ensureUser();
  if (!u) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  if (!pushConfigured()) return NextResponse.json({ error: "push is not configured on the server" }, { status: 503 });
  if (!(await rateLimit(`push-test:${u.id}`, 10, 60 * 60 * 1000))) return NextResponse.json({ error: "too many tests — try again in an hour" }, { status: 429 });
  const rows = await enabledSubscriptionsForUser(u.id);
  if (rows.length === 0) return NextResponse.json({ error: "no device has notifications on" }, { status: 400 });
  const now = new Date();
  const results = await Promise.all(
    rows.map(async (row) => {
      const device = deviceLabel(row);
      const r = await sendPushToRows([row], testPayload({ device, now }), { ttlSec: 60, source: "web" });
      return { device, ok: r.sent === 1, disabled: r.disabled === 1, error: r.errors[0] ?? null };
    }),
  );
  const sent = results.filter((r) => r.ok).length;
  return NextResponse.json({
    sent,
    failed: results.length - sent,
    disabled: results.filter((r) => r.disabled).length,
    sentAt: now.toISOString(),
    devices: results,
    errors: results.filter((r) => r.error).map((r) => r.error).slice(0, 3),
  });
}
