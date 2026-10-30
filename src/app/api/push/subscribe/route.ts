import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { ensureUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { decideSubscribeWrite, endpointHash } from "@/lib/push/policy";
import { logOps } from "@/lib/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Endpoint = z.string().url().max(2048).refine((u) => u.startsWith("https://"), "https only");

const Body = z.object({
  endpoint: Endpoint,
  keys: z.object({ p256dh: z.string().min(80).max(200), auth: z.string().min(16).max(64) }),
  platform: z.enum(["ios", "android", "desktop", "unknown"]).default("unknown"),
  standalone: z.boolean().default(false),
  userAgent: z.string().max(300).optional(),
  /** The endpoint this browser had before the push service rotated it (pushsubscriptionchange). */
  oldEndpoint: Endpoint.optional(),
  /** PushSubscription.expirationTime (epoch ms) or null. */
  expirationTime: z.number().int().positive().nullable().optional(),
  /** base64url VAPID public key the subscription was created with. */
  appServerKey: z.string().min(80).max(100).optional(),
});

/** Devices registered for the signed-in user (the account page renders the same list server-side). */
export async function GET() {
  const u = await ensureUser();
  if (!u) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  const rows = await db()
    .select({
      id: schema.pushSubscriptions.id, platform: schema.pushSubscriptions.platform, standalone: schema.pushSubscriptions.standalone,
      createdAt: schema.pushSubscriptions.createdAt, lastSeenAt: schema.pushSubscriptions.lastSeenAt, lastSentAt: schema.pushSubscriptions.lastSentAt,
      disabledAt: schema.pushSubscriptions.disabledAt, failCount: schema.pushSubscriptions.failCount, endpoint: schema.pushSubscriptions.endpoint,
    })
    .from(schema.pushSubscriptions)
    .where(eq(schema.pushSubscriptions.userId, u.id))
    .orderBy(desc(schema.pushSubscriptions.createdAt));
  return NextResponse.json(
    { devices: rows.map((r) => ({ ...r, endpoint: undefined, endpointHash: endpointHash(r.endpoint) })), vapidPublicKey: env.vapidPublicKey() },
    { headers: { "cache-control": "no-store" } },
  );
}

/**
 * Save (or re-link) a browser's push subscription.
 *  - Signed in: upsert for this user. An endpoint that belongs to another account answers 409; the
 *    client then unsubscribes and subscribes again, which mints a fresh endpoint.
 *  - No session but `oldEndpoint` names a row we have: the service worker is reporting a rotation
 *    (it has no cookies). Knowing the old endpoint proves ownership, so that row is rewritten in place.
 */
export async function POST(req: Request) {
  const u = await ensureUser();
  if (!(await rateLimit(`push-ip:${clientIp(req)}`, 60, 60 * 60 * 1000)) || (u && !(await rateLimit(`push:${u.id}`, 30, 60 * 60 * 1000)))) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request", issues: parsed.error.issues }, { status: 400 });
  const b = parsed.data;
  const d = db();
  const now = new Date();
  const oldEndpoint = b.oldEndpoint && b.oldEndpoint !== b.endpoint ? b.oldEndpoint : null;
  const [existing, oldRow] = await Promise.all([
    d.select({ id: schema.pushSubscriptions.id, userId: schema.pushSubscriptions.userId }).from(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.endpoint, b.endpoint)).limit(1).then((r) => r[0] ?? null),
    oldEndpoint
      ? d.select({ id: schema.pushSubscriptions.id, userId: schema.pushSubscriptions.userId }).from(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.endpoint, oldEndpoint)).limit(1).then((r) => r[0] ?? null)
      : Promise.resolve(null),
  ]);
  const decision = decideSubscribeWrite({ sessionUserId: u?.id ?? null, existingUserId: existing?.userId ?? null, oldRowUserId: oldRow?.userId ?? null });
  if (decision.kind === "unauthorized") return NextResponse.json({ error: "sign in first" }, { status: 401 });
  if (decision.kind === "conflict") return NextResponse.json({ error: "this device is linked to another account", code: "owned" }, { status: 409 });

  const fields = {
    p256dh: b.keys.p256dh, auth: b.keys.auth, platform: b.platform, standalone: b.standalone, userAgent: b.userAgent ?? null,
    lastSeenAt: now, disabledAt: null, lastError: null, failCount: 0,
    expirationTime: b.expirationTime ? new Date(b.expirationTime) : null, appServerKey: b.appServerKey ?? null,
  };

  // Rotation with no clash on the new endpoint: rewrite the old row so its id (and history) survive.
  if (oldRow && !existing && !decision.dropOld) {
    await d.update(schema.pushSubscriptions).set({ ...fields, endpoint: b.endpoint, userId: decision.userId }).where(eq(schema.pushSubscriptions.id, oldRow.id));
    await logOps("web", "info", "push endpoint rotated", { subscriptionId: oldRow.id, platform: b.platform, viaSession: Boolean(u) });
    return NextResponse.json({ id: oldRow.id, rotated: true });
  }
  if (oldRow && (existing || decision.dropOld)) {
    await d.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, oldRow.id));
  }
  const id = randomUUID();
  const rows = await d
    .insert(schema.pushSubscriptions)
    .values({ id, userId: decision.userId, endpoint: b.endpoint, createdAt: now, ...fields })
    .onConflictDoUpdate({ target: schema.pushSubscriptions.endpoint, set: { ...fields, userId: decision.userId } })
    .returning({ id: schema.pushSubscriptions.id });
  return NextResponse.json({ id: rows[0]?.id ?? id, rotated: Boolean(oldRow) });
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
