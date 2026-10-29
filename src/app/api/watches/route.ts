import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { ensureUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { MODELS, STORE_INDEX, storagesFor, colorsFor, type ModelKey } from "@/lib/apple/catalog";
import { geocodeZip } from "@/lib/geo";
import { userPlan } from "@/lib/billing";
import { coveredWatchIds, SAVE_CAP } from "@/lib/plans";
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
  const { plan, sub } = await userPlan(u.id);
  const covered = coveredWatchIds(rows, plan.limit);
  return NextResponse.json({
    watches: rows.map((w) => ({ ...w, covered: covered.has(w.id) })),
    plan: { key: plan.key, limit: plan.limit, used: rows.filter((w) => w.active).length, renewsAt: sub?.currentPeriodEnd ?? null },
  });
}

/** Save a rule. The first one is free; beyond the plan's limit it is saved but does not send until the user upgrades. */
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
  const existing = await db().select({ id: schema.watches.id, active: schema.watches.active, createdAt: schema.watches.createdAt }).from(schema.watches).where(eq(schema.watches.userId, u.id));
  if (existing.filter((w) => w.active).length >= SAVE_CAP) return NextResponse.json({ error: `you can keep at most ${SAVE_CAP} alert rules — delete one first` }, { status: 400 });
  const { plan, sub } = await userPlan(u.id);
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
  const covered = coveredWatchIds([...existing, { id, active: true, createdAt: new Date() }], plan.limit).has(id);
  return NextResponse.json({ id, covered, plan: { key: plan.key, limit: plan.limit, used: existing.filter((w) => w.active).length + 1 } });
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
