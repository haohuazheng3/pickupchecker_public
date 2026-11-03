import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { env } from "./env";
import { ADMIN_COOKIE, verifyAdminToken } from "./admin/session";
import { LANG_COOKIE, nativeLocale } from "./i18n/locales";

export interface SessionUser {
  id: string;
  email: string;
}

/** Signed-in user (Clerk) or null. Does not touch the database. */
export async function sessionUser(): Promise<SessionUser | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const u = await currentUser();
  const email = u?.primaryEmailAddress?.emailAddress ?? u?.emailAddresses?.[0]?.emailAddress ?? "";
  return { id: userId, email: email.toLowerCase() };
}

/**
 * Signed-in user, mirrored into `users` (idempotent). A new account takes the language it signed up in (the
 * `pc_lang` cookie a native page set) for its pushes and emails; an existing account's language changes only
 * when the person picks one (POST /api/me/locale), never because they browsed a page in another language.
 */
export async function ensureUser(): Promise<SessionUser | null> {
  const u = await sessionUser();
  if (!u) return null;
  const locale = nativeLocale((await cookies()).get(LANG_COOKIE)?.value)?.id ?? null;
  await db()
    .insert(schema.users)
    .values({ id: u.id, email: u.email, lastSeenAt: new Date(), locale })
    .onConflictDoUpdate({ target: schema.users.id, set: { email: u.email, lastSeenAt: new Date() } });
  return u;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return env.adminEmails().includes(email.toLowerCase());
}

/** True when the admin password cookie is valid (the proxy checks the same thing). */
export async function hasAdminSession(): Promise<boolean> {
  const jar = await cookies();
  return verifyAdminToken(jar.get(ADMIN_COOKIE)?.value, env.adminSessionSecret());
}

/**
 * Admin pages: the password session (set by /api/admin/login) or a whitelisted Clerk email.
 * Anyone else is sent to the login page with the current path as ?next=.
 */
export async function requireAdmin(): Promise<{ via: "password" | "clerk"; email: string | null }> {
  if (await hasAdminSession()) return { via: "password", email: null };
  const u = await sessionUser();
  if (u && isAdminEmail(u.email)) return { via: "clerk", email: u.email };
  const h = await headers();
  const next = h.get("x-pathname") ?? "/admin";
  redirect(`/admin/login?next=${encodeURIComponent(next)}`);
}

export async function userById(id: string) {
  const rows = await db().select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  return rows[0] ?? null;
}
