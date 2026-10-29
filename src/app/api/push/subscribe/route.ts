import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { ensureUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  endpoint: z.string().url().max(2048).refine((u) => u.startsWith("https://"), "https only"),
  keys: z.object({ p256dh: z.string().min(80).max(200), auth: z.string().min(16).max(64) }),
  platform: z.enum(["ios", "android", "desktop", "unknown"]).default("unknown"),
  standalone: z.boolean().default(false),
  userAgent: z.string().max(300).optional(),
});

/** Devices registered for the signed-in user (the account page renders the same list server-side). */
export async function GET() {
  const u = await ensureUser();
  if (!u) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  const rows = await db()
    .select({ id: schema.pushSubscriptions.id, platform: schema.pushSubscriptions.platform, standalone: schema.pushSubscriptions.standalone, createdAt: schema.pushSubscriptions.createdAt, lastSentAt: schema.pushSubscriptions.lastSentAt, disabledAt: schema.pushSubscriptions.disabledAt, endpoint: schema.pushSubscriptions.endpoint })
    .from(schema.pushSubscriptions)
    .where(eq(schema.pushSubscriptions.userId, u.id))
    .orderBy(desc(schema.pushSubscriptions.createdAt));
  return NextResponse.json({ devices: rows.map((r) => ({ ...r, endpoint: undefined, endpointHash: r.endpoint.slice(-12) })), vapidPublicKey: env.vapidPublicKey() });
}

/** Save (or re-link) a browser's push subscription for the signed-in user. */
export async function POST(req: Request) {
  const u = await ensureUser();
  if (!u) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  if (!(await rateLimit(`push:${u.id}`, 30, 60 * 60 * 1000)) || !(await rateLimit(`push-ip:${clientIp(req)}`, 60, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request", issues: parsed.error.issues }, { status: 400 });
  const b = parsed.data;
  const id = randomUUID();
  const now = new Date();
  const rows = await db()
    .insert(schema.pushSubscriptions)
    .values({ id, userId: u.id, endpoint: b.endpoint, p256dh: b.keys.p256dh, auth: b.keys.auth, platform: b.platform, standalone: b.standalone, userAgent: b.userAgent ?? null, createdAt: now, lastSeenAt: now })
    .onConflictDoUpdate({
      target: schema.pushSubscriptions.endpoint,
      set: { userId: u.id, p256dh: b.keys.p256dh, auth: b.keys.auth, platform: b.platform, standalone: b.standalone, userAgent: b.userAgent ?? null, lastSeenAt: now, disabledAt: null, lastError: null },
    })
    .returning({ id: schema.pushSubscriptions.id });
  return NextResponse.json({ id: rows[0]?.id ?? id });
}

const Del = z.object({ endpoint: z.string().max(2048).optional(), id: z.string().max(64).optional() }).refine((v) => v.endpoint || v.id, "endpoint or id");

/** Remove a device (its own unsubscribe, or "Remove" on the account page). */
export async function DELETE(req: Request) {
  const u = await ensureUser();
  if (!u) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  const parsed = Del.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { endpoint, id } = parsed.data;
  const where = id ? and(eq(schema.pushSubscriptions.userId, u.id), eq(schema.pushSubscriptions.id, id)) : and(eq(schema.pushSubscriptions.userId, u.id), eq(schema.pushSubscriptions.endpoint, endpoint!));
  const r = await db().delete(schema.pushSubscriptions).where(where).returning({ id: schema.pushSubscriptions.id });
  return NextResponse.json({ ok: true, removed: r.length });
}
