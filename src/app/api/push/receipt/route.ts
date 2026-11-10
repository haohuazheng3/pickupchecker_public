import { NextResponse } from "next/server";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { readReceipt } from "@/lib/push/receipt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A phone saying it received a push (public/sw.js, on the push event). Body: { r: token } where the token was
 * signed when the push was sent (lib/push/receipt.ts). Marks the device's last_delivered_at and the notifications
 * of the events it reports as delivered. Always answers 204: the service worker never retries and never shows
 * anything about it.
 *
 * The poller records a notification after every device's push service has answered, so a quick phone can report
 * before the row exists: then it waits and tries again (twice, ~12 s in all) before giving up on the row.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { r?: unknown } | null;
  const rec = readReceipt(body?.r, env.vapidPrivateKey());
  if (!rec) return new NextResponse(null, { status: 204 });
  const d = db();
  const now = new Date();
  const dev = await d.update(schema.pushSubscriptions)
    .set({ lastDeliveredAt: sql`greatest(coalesce(${schema.pushSubscriptions.lastDeliveredAt}, ${now}), ${now})` })
    .where(eq(schema.pushSubscriptions.id, rec.subscriptionId))
    .returning({ userId: schema.pushSubscriptions.userId })
    .then((r) => r[0] ?? null, () => null);
  if (!dev || rec.eventIds.length === 0) return new NextResponse(null, { status: 204 });
  const mark = () => d.update(schema.notifications).set({ deliveredAt: now })
    .where(and(eq(schema.notifications.userId, dev.userId), inArray(schema.notifications.eventId, rec.eventIds), eq(schema.notifications.channel, "push"), isNull(schema.notifications.deliveredAt)))
    .returning({ id: schema.notifications.id }).then((r) => r.length, () => 0);
  // Already marked by another of the member's devices, or not recorded yet: only the second needs a wait.
  const recorded = () => d.select({ n: sql<number>`count(*)::int` }).from(schema.notifications)
    .where(and(eq(schema.notifications.userId, dev.userId), inArray(schema.notifications.eventId, rec.eventIds), eq(schema.notifications.channel, "push")))
    .then((r) => r[0]?.n ?? 0, () => 0);
  for (const waitMs of [0, 4000, 8000]) {
    if (waitMs) await new Promise((r) => setTimeout(r, waitMs));
    if ((await mark()) > 0 || (await recorded()) > 0) break;
  }
  return new NextResponse(null, { status: 204 });
}
