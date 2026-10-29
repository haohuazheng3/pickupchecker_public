import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { db, schema } from "@/lib/db";
import { recordError, errorMessage } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ClerkUserEvent {
  type: string;
  data: { id: string; email_addresses?: { id: string; email_address: string }[]; primary_email_address_id?: string };
}

/** Clerk → users mirror (user.created / user.updated / user.deleted). Optional: the app also mirrors on first request. */
export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const body = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };
  let evt: ClerkUserEvent;
  try {
    evt = new Webhook(secret).verify(body, headers) as unknown as ClerkUserEvent;
  } catch (e) {
    return NextResponse.json({ error: `invalid signature: ${errorMessage(e)}` }, { status: 400 });
  }
  try {
    if (evt.type === "user.created" || evt.type === "user.updated") {
      const primary = evt.data.email_addresses?.find((e) => e.id === evt.data.primary_email_address_id) ?? evt.data.email_addresses?.[0];
      if (primary) {
        await db()
          .insert(schema.users)
          .values({ id: evt.data.id, email: primary.email_address.toLowerCase() })
          .onConflictDoUpdate({ target: schema.users.id, set: { email: primary.email_address.toLowerCase() } });
      }
    }
  } catch (e) {
    await recordError("web", `clerk webhook ${evt.type}: ${errorMessage(e)}`);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
