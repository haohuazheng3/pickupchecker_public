import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { ensureUser } from "@/lib/auth";
import { createCheckout, activeSubscriptionsFor, subscriptionCovers } from "@/lib/billing";
import { db, schema } from "@/lib/db";
import { recordError, errorMessage } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ watchId: z.string().min(1) });

/** Start a $5/month subscription for the model of a watch the user already saved. */
export async function POST(req: Request) {
  const u = await ensureUser();
  if (!u) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const [watch] = await db()
    .select()
    .from(schema.watches)
    .where(and(eq(schema.watches.id, parsed.data.watchId), eq(schema.watches.userId, u.id)))
    .limit(1);
  if (!watch) return NextResponse.json({ error: "watch not found" }, { status: 404 });
  const subs = await activeSubscriptionsFor(u.id);
  if (subscriptionCovers(subs, watch.model)) {
    const sub = subs.find((s) => s.model === watch.model && ["active", "trialing", "past_due"].includes(s.status));
    await db().update(schema.watches).set({ subscriptionId: sub?.id ?? null }).where(eq(schema.watches.id, watch.id));
    return NextResponse.json({ alreadySubscribed: true, url: "/account?activated=1" });
  }
  try {
    const url = await createCheckout(u.id, u.email, watch.model as "18-pro" | "18-pro-max" | "duo", watch.id);
    return NextResponse.json({ url });
  } catch (e) {
    await recordError("web", `checkout failed: ${errorMessage(e)}`, { userId: u.id });
    return NextResponse.json({ error: "checkout unavailable" }, { status: 502 });
  }
}
