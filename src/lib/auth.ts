import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { env } from "./env";

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

/** Signed-in user, mirrored into `users` (idempotent). */
export async function ensureUser(): Promise<SessionUser | null> {
  const u = await sessionUser();
  if (!u) return null;
  await db()
    .insert(schema.users)
    .values({ id: u.id, email: u.email, lastSeenAt: new Date() })
    .onConflictDoUpdate({ target: schema.users.id, set: { email: u.email, lastSeenAt: new Date() } });
  return u;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return env.adminEmails().includes(email.toLowerCase());
}

export async function requireAdmin(): Promise<SessionUser> {
  const u = await sessionUser();
  if (!u || !isAdminEmail(u.email)) {
    const { notFound } = await import("next/navigation");
    notFound();
  }
  return u!;
}

export async function userById(id: string) {
  const rows = await db().select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  return rows[0] ?? null;
}
