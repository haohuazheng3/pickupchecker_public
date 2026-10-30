import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { ensureUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { MODELS, STORE_INDEX, catalogFor, type ModelKey } from "@/lib/apple/catalog";
import { userPlan } from "@/lib/billing";
import { coveredWatchIds, SAVE_CAP } from "@/lib/plans";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const modelKeys = MODELS.map((m) => m.key) as [ModelKey, ...ModelKey[]];
/** One rule = one store × one exact configuration. */
export const Body = z.object({
  model: z.enum(modelKeys),
  storage: z.string().min(1).max(16),
  color: z.string().min(1).max(32),
  storeNumber: z.string().regex(/^R\d{3,4}$/),
});

/** The single configuration a rule watches, or null for a legacy-shaped row. */
export function ruleConfig(w: { model: string; storages: string[]; colors: string[]; storeNumbers: string[] }) {
  if (w.storages.length !== 1 || w.colors.length !== 1 || w.storeNumbers.length !== 1) return null;
  const item = catalogFor(w.model as ModelKey).find((c) => c.storage === w.storages[0] && c.color === w.colors[0]);
  return item ? { storage: w.storages[0], color: w.colors[0], storeNumber: w.storeNumbers[0], partNumber: item.partNumber, price: item.price } : null;
}

export async function GET() {
  const u = await ensureUser();
  if (!u) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  const rows = await db().select().from(schema.watches).where(eq(schema.watches.userId, u.id));
  const { plan, sub } = await userPlan(u.id);
  const covered = coveredWatchIds(rows, plan.limit);
  return NextResponse.json({
    watches: rows.map((w) => ({ ...w, config: ruleConfig(w), covered: covered.has(w.id) })),
    plan: { key: plan.key, limit: plan.limit, used: rows.filter((w) => w.active).length, renewsAt: sub?.currentPeriodEnd ?? null },
  });
}

/**
 * Save a rule. It sends once the user has a plan with a free slot; otherwise it is saved but silent
 * until they subscribe or upgrade. The same store × configuration is never saved twice: the
 * existing active rule is returned instead.
 */
export async function POST(req: Request) {
  const u = await ensureUser();
  if (!u) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  if (!(await rateLimit(`watches:${u.id}`, 30, 60 * 60 * 1000)) || !(await rateLimit(`watches-ip:${clientIp(req)}`, 60, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request", issues: parsed.error.issues }, { status: 400 });
  const b = parsed.data;
  const item = catalogFor(b.model).find((c) => c.storage === b.storage && c.color === b.color);
  if (!item) return NextResponse.json({ error: "unknown configuration" }, { status: 400 });
  if (!STORE_INDEX.has(b.storeNumber)) return NextResponse.json({ error: "unknown store" }, { status: 400 });

  const existing = await db()
    .select({ id: schema.watches.id, active: schema.watches.active, createdAt: schema.watches.createdAt, model: schema.watches.model, storages: schema.watches.storages, colors: schema.watches.colors, storeNumbers: schema.watches.storeNumbers })
    .from(schema.watches)
    .where(eq(schema.watches.userId, u.id));
  const { plan, sub } = await userPlan(u.id);
  const dup = existing.find((w) => w.active && w.model === b.model && w.storages[0] === b.storage && w.colors[0] === b.color && w.storeNumbers[0] === b.storeNumber);
  if (dup) {
    const covered = coveredWatchIds(existing, plan.limit).has(dup.id);
    return NextResponse.json({ id: dup.id, covered, existing: true, plan: { key: plan.key, limit: plan.limit, used: existing.filter((w) => w.active).length } });
  }
  if (existing.filter((w) => w.active).length >= SAVE_CAP) return NextResponse.json({ error: `you can keep at most ${SAVE_CAP} alert rules — delete one first` }, { status: 400 });
  const id = randomUUID();
  // Two taps in flight at once: the partial unique index keeps one row; return that one as existing.
  const inserted = await db()
    .insert(schema.watches)
    .values({ id, userId: u.id, subscriptionId: sub?.id ?? null, model: b.model, storages: [b.storage], colors: [b.color], storeNumbers: [b.storeNumber] })
    .onConflictDoNothing()
    .returning({ id: schema.watches.id });
  if (inserted.length === 0) {
    const rows = await db().select({ id: schema.watches.id, active: schema.watches.active, createdAt: schema.watches.createdAt, model: schema.watches.model, storages: schema.watches.storages, colors: schema.watches.colors, storeNumbers: schema.watches.storeNumbers }).from(schema.watches).where(eq(schema.watches.userId, u.id));
    const row = rows.find((w) => w.active && w.model === b.model && w.storages[0] === b.storage && w.colors[0] === b.color && w.storeNumbers[0] === b.storeNumber);
    if (!row) return NextResponse.json({ error: "could not save the rule — try again" }, { status: 500 });
    return NextResponse.json({ id: row.id, covered: coveredWatchIds(rows, plan.limit).has(row.id), existing: true, plan: { key: plan.key, limit: plan.limit, used: rows.filter((w) => w.active).length } });
  }
  const covered = coveredWatchIds([...existing, { id, active: true, createdAt: new Date() }], plan.limit).has(id);
  return NextResponse.json({ id, covered, plan: { key: plan.key, limit: plan.limit, used: existing.filter((w) => w.active).length + 1 } });
}

const Patch = z.object({ id: z.string().min(1), paused: z.boolean().optional(), active: z.boolean().optional(), dismiss: z.boolean().optional() });

export async function PATCH(req: Request) {
  const u = await ensureUser();
  if (!u) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { id, dismiss, ...set } = parsed.data;
  const r = await db()
    .update(schema.watches)
    .set({ ...set, ...(dismiss ? { active: false, deactivatedReason: "legacy_dismissed" } : {}), updatedAt: new Date() })
    .where(and(eq(schema.watches.id, id), eq(schema.watches.userId, u.id)))
    .returning({ id: schema.watches.id });
  if (r.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
