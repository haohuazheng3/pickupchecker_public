import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { LANG_COOKIE, nativeLocale } from "@/lib/i18n/locales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The person picks a language (header switch, dashboard): `{ locale: "ja-jp" | "en" }`. Always sets the
 * `pc_lang` cookie (the dashboard and app pages); signed in, also the account's language, which pushes,
 * the "notifications stopped" email and Stripe pages follow (docs/i18n.md §6).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { locale?: unknown } | null;
  const v = typeof body?.locale === "string" ? body.locale.toLowerCase() : "";
  const loc = nativeLocale(v);
  if (!loc && v !== "en") return NextResponse.json({ error: "unknown locale" }, { status: 400 });
  const { userId } = await auth();
  if (userId) await db().update(schema.users).set({ locale: loc?.id ?? null }).where(eq(schema.users.id, userId));
  const res = NextResponse.json({ ok: true, locale: loc?.id ?? "en", saved: Boolean(userId) });
  res.cookies.set(LANG_COOKIE, loc?.id ?? "en", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}
