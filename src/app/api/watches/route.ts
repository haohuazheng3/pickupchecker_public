import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { ensureUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { MODELS, STORE_INDEX, storagesFor, colorsFor, type ModelKey } from "@/lib/apple/catalog";
import { geocodeZip } from "@/lib/geo";
import { activeSubscriptionsFor, subscriptionCovers } from "@/lib/billing";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const modelKeys = MODELS.map((m) => m.key) as [ModelKey, ...ModelKey[]];
const Body = z.object({
  model: z.enum(modelKeys),
  storages: z.array(z.string()).max(8).default([]),
  colors: z.array(z.string()).max(8).default([]),
  storeNumbers: z.array(z.string().regex(/^R\d{3,4}$/)).max(60).default([]),
  zip: z.string().regex(/^\d{5}$/).optional(),
  radiusMiles: z.number().int().min(5).max(500).optional(),
});

export async function GET() {
  const u = await ensureUser();
  if (!u) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  const rows = await db().select().from(schema.watches).where(eq(schema.watches.userId, u.id));
  const subs = await activeSubscriptionsFor(u.id);
  return NextResponse.json({
    watches: rows.map((w) => ({ ...w, covered: subscriptionCovers(subs, w.model) })),
    subscriptions: subs,
  });
}

/** Save a watch (free to save; alerts only flow once the model is subscribed). */
export async function POST(req: Request) {
  const u = await ensureUser();
  if (!u) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  if (!(await rateLimit(`watches:${u.id}`, 30, 60 * 60 * 1000)) || !(await rateLimit(`watches-ip:${clientIp(req)}`, 60, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request", issues: parsed.error.issues }, { status: 400 });
  const b = parsed.data;
  const validStorages = storagesFor(b.model);
  const validColors = colorsFor(b.model);
  if (b.storages.some((s) => !validStorages.includes(s)) || b.colors.some((c) => !validColors.includes(c))) {
    return NextResponse.json({ error: "unknown storage or color" }, { status: 400 });
  }
  if (b.storeNumbers.some((s) => !STORE_INDEX.has(s))) return NextResponse.json({ error: "unknown store" }, { status: 400 });
  let geo: { lat: number; lng: number } | null = null;
  if (b.zip && b.storeNumbers.length === 0) {
    geo = await geocodeZip(b.zip);
    if (!geo) return NextResponse.json({ error: "zip not found" }, { status: 400 });
  }
  const subs = await activeSubscriptionsFor(u.id);
  const sub = subs.find((s) => s.model === b.model && ["active", "trialing", "past_due"].includes(s.status));
  const id = randomUUID();
  await db().insert(schema.watches).values({
    id,
    userId: u.id,
    subscriptionId: sub?.id ?? null,
    model: b.model,
    storages: b.storages,
    colors: b.colors,
    storeNumbers: b.storeNumbers,
    zip: b.zip ?? null,
    radiusMiles: b.storeNumbers.length ? null : (b.radiusMiles ?? (b.zip ? 50 : null)),
    lat: geo?.lat ?? null,
    lng: geo?.lng ?? null,
  });
  return NextResponse.json({ id, covered: Boolean(sub) });
}

const Patch = z.object({ id: z.string().min(1), paused: z.boolean().optional(), active: z.boolean().optional() });

export async function PATCH(req: Request) {
  const u = await ensureUser();
  if (!u) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { id, ...set } = parsed.data;
  const r = await db()
    .update(schema.watches)
    .set({ ...set, updatedAt: new Date() })
    .where(and(eq(schema.watches.id, id), eq(schema.watches.userId, u.id)))
    .returning({ id: schema.watches.id });
  if (r.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
