import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { notifyOwner } from "@/lib/mail/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ email: z.string().email().max(200), subject: z.string().max(200).optional(), message: z.string().min(5).max(5000), website: z.string().max(0).optional() });

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!(await rateLimit(`contact:${ip}`, 5, 60 * 60 * 1000))) return NextResponse.json({ error: "too many requests" }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const b = parsed.data;
  await db().insert(schema.contactMessages).values({ email: b.email, subject: b.subject ?? null, message: b.message, ip });
  await notifyOwner(`[PickupChecker] Contact: ${b.subject ?? "(no subject)"}`, `From: ${b.email}\n\n${b.message}`, b.email).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
