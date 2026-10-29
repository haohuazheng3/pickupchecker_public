import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { env, bearerOk } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  to: z.string(),
  from: z.string(),
  subject: z.string().optional(),
  text: z.string().optional(),
  html: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  auth: z.object({ spf: z.string().optional(), dkim: z.string().optional(), dmarc: z.string().optional() }).optional(),
});

/** Cloudflare mail worker → test inbox (test@pickupchecker.com). */
export async function POST(req: Request) {
  if (!bearerOk(req, env.inboxIngestSecret())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const b = parsed.data;
  const [row] = await db()
    .insert(schema.inboxMessages)
    .values({ to: b.to, from: b.from, subject: b.subject ?? null, text: b.text ?? null, html: b.html ?? null, headers: b.headers ?? null, auth: b.auth ?? null })
    .returning({ id: schema.inboxMessages.id });
  return NextResponse.json({ ok: true, id: row.id });
}
