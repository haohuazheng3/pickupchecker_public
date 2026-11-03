import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { userPlan } from "@/lib/billing";
import { deviceSummary } from "@/lib/devices";
import { cookieLang } from "@/lib/i18n/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVATE = { "cache-control": "private, no-store" };

/**
 * What a static public page needs to fit its buttons to a signed-in reader: the plan they are on (the
 * pricing page labels it instead of offering to buy it), where their alerts go (the install guide says
 * so instead of starting the setup over), and whether they have ever paid (the sign-in page sends them to
 * their account if so, to the alert setup if not). Signed out → { signedIn: false }.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ signedIn: false }, { headers: PRIVATE });
  const w = schema.watches;
  const [{ plan }, devices, [used], [subs], [me]] = await Promise.all([
    userPlan(userId),
    deviceSummary(userId, await cookieLang()),
    db().select({ n: sql<number>`count(*)::int` }).from(w).where(and(eq(w.userId, userId), eq(w.active, true))),
    db().select({ n: sql<number>`count(*)::int` }).from(schema.subscriptions).where(eq(schema.subscriptions.userId, userId)),
    db().select({ locale: schema.users.locale }).from(schema.users).where(eq(schema.users.id, userId)).limit(1),
  ]);
  return NextResponse.json({ signedIn: true, plan: { key: plan.key, limit: plan.limit, used: used?.n ?? 0 }, devices, everPaid: (subs?.n ?? 0) > 0, locale: me?.locale ?? "en" }, { headers: PRIVATE });
}
