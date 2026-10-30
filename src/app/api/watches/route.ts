import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray, sql } from "drizzle-orm";
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
const storeNumber = z.string().regex(/^R\d{3,4}$/);
const phone = z.object({ model: z.enum(modelKeys), storage: z.string().min(1).max(16), color: z.string().min(1).max(32) });
export type Phone = z.infer<typeof phone>;
/**
 * One rule = one store × one exact phone. A request lists phones (`items`, or the single model/storage/
 * color form) and stores (`storeNumbers`, or one `storeNumber`) and saves every combination.
 */
export const Body = z
  .object({
    model: z.enum(modelKeys).optional(),
    storage: z.string().min(1).max(16).optional(),
    color: z.string().min(1).max(32).optional(),
    items: z.array(phone).min(1).max(SAVE_CAP).optional(),
    storeNumber: storeNumber.optional(),
    storeNumbers: z.array(storeNumber).min(1).max(SAVE_CAP).optional(),
  })
  .refine((b) => Boolean(b.items?.length) || Boolean(b.model && b.storage && b.color), { message: "pick a phone", path: ["items"] })
  .refine((b) => Boolean(b.storeNumber) || Boolean(b.storeNumbers?.length), { message: "pick at least one store", path: ["storeNumbers"] });

/** The stores a body asks for, in the order given, without repeats. */
export function storeNumbersOf(b: { storeNumber?: string; storeNumbers?: string[] }): string[] {
  return [...new Set([...(b.storeNumbers ?? []), ...(b.storeNumber ? [b.storeNumber] : [])])];
}
/** The phones a body asks for, in order, without repeats. */
export function phonesOf(b: { model?: ModelKey; storage?: string; color?: string; items?: Phone[] }): Phone[] {
  const all = [...(b.items ?? []), ...(b.model && b.storage && b.color ? [{ model: b.model, storage: b.storage, color: b.color }] : [])];
  const seen = new Set<string>();
  return all.filter((p) => { const k = `${p.model}|${p.storage}|${p.color}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

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

type Row = { id: string; active: boolean; createdAt: Date; model: string; storages: string[]; colors: string[]; storeNumbers: string[] };
const ROW = { id: schema.watches.id, active: schema.watches.active, createdAt: schema.watches.createdAt, model: schema.watches.model, storages: schema.watches.storages, colors: schema.watches.colors, storeNumbers: schema.watches.storeNumbers };
const findRule = (rows: Row[], b: { model: string; storage: string; color: string }, n: string) =>
  rows.find((w) => w.active && w.model === b.model && w.storages[0] === b.storage && w.colors[0] === b.color && w.storeNumbers[0] === n);

/**
 * Save one rule per phone per store. Each sends once the user has a plan with a free slot (the oldest
 * rules win, so rows are stamped in tick order); otherwise it is saved but silent until they subscribe
 * or upgrade. The same store × phone is never saved twice: the existing active rule is returned instead.
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
  const phones = phonesOf(b);
  for (const p of phones) {
    if (!catalogFor(p.model).find((c) => c.storage === p.storage && c.color === p.color)) return NextResponse.json({ error: `unknown configuration ${p.model} ${p.storage} ${p.color}` }, { status: 400 });
  }
  const wanted = storeNumbersOf(b);
  const unknown = wanted.find((n) => !STORE_INDEX.has(n));
  if (unknown) return NextResponse.json({ error: `unknown store ${unknown}` }, { status: 400 });
  // Store-major, so the first store ticked gets its rules first for every phone.
  const combos = wanted.flatMap((n) => phones.map((p) => ({ ...p, storeNumber: n })));
  if (combos.length > SAVE_CAP) return NextResponse.json({ error: `that is ${combos.length} alerts — at most ${SAVE_CAP} per account` }, { status: 400 });

  const existing: Row[] = await db().select(ROW).from(schema.watches).where(eq(schema.watches.userId, u.id));
  const { plan, sub } = await userPlan(u.id);
  const fresh = combos.filter((c) => !findRule(existing, c, c.storeNumber));
  const activeNow = existing.filter((w) => w.active).length;
  if (activeNow + fresh.length > SAVE_CAP) {
    const room = Math.max(0, SAVE_CAP - activeNow);
    return NextResponse.json({ error: room === 0 ? `you can keep at most ${SAVE_CAP} alerts — delete some first` : `you can keep at most ${SAVE_CAP} alerts — room for ${room} more; untick some stores or delete alerts first` }, { status: 400 });
  }
  let insertedIds: string[] = [];
  if (fresh.length) {
    // Stamped by the database clock, a millisecond apart in tick order, so the plan's "oldest rules send"
    // picks the first ones ticked and rows from other requests keep their place. Two taps in flight at once:
    // the partial unique index keeps one row per store × phone; the re-read below finds it.
    const inserted = await db()
      .insert(schema.watches)
      .values(fresh.map((c, i) => ({ id: randomUUID(), userId: u.id, subscriptionId: sub?.id ?? null, model: c.model, storages: [c.storage], colors: [c.color], storeNumbers: [c.storeNumber], createdAt: sql`now() + ${i} * interval '1 millisecond'` })))
      .onConflictDoNothing()
      .returning({ id: schema.watches.id });
    insertedIds = inserted.map((r) => r.id);
  }
  let rows: Row[] = fresh.length ? await db().select(ROW).from(schema.watches).where(eq(schema.watches.userId, u.id)) : existing;
  // Two batches racing past the cap check: retire this request's newest rows until the account fits again.
  const over = rows.filter((w) => w.active).length - SAVE_CAP;
  if (over > 0 && insertedIds.length) {
    const mine = rows.filter((w) => insertedIds.includes(w.id)).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id));
    const retire = mine.slice(0, over).map((w) => w.id);
    if (retire.length) {
      await db().update(schema.watches).set({ active: false, deactivatedReason: "over_cap", updatedAt: new Date() }).where(inArray(schema.watches.id, retire));
      rows = rows.map((w) => (retire.includes(w.id) ? { ...w, active: false } : w));
    }
    return NextResponse.json({ error: `you can keep at most ${SAVE_CAP} alerts — ${retire.length} of these were not saved; delete some first` }, { status: 400 });
  }
  const covered = coveredWatchIds(rows, plan.limit);
  const rules = combos.map((c) => {
    const row = findRule(rows, c, c.storeNumber);
    return row ? { id: row.id, model: c.model, storage: c.storage, color: c.color, storeNumber: c.storeNumber, covered: covered.has(row.id), existing: !fresh.includes(c) } : null;
  });
  if (rules.some((r) => r === null)) return NextResponse.json({ error: "could not save the rules — try again" }, { status: 500 });
  const first = rules[0]!;
  return NextResponse.json({
    rules,
    // The first rule's fields, for callers that still expect a single one.
    id: first.id, covered: first.covered, existing: first.existing,
    plan: { key: plan.key, limit: plan.limit, used: rows.filter((w) => w.active).length },
  });
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
