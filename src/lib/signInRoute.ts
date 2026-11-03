/**
 * Where the sign-in page (?signin=1) sends someone once they are signed in. Anyone who has ever paid goes to
 * their account; someone who never has goes to the alert setup on the home page they signed in from, which
 * ends in choosing a plan. A `next` page other than the account (the install guide, pricing) is kept.
 */
export function afterSignInPath({ next, home, paid }: { next?: string | null; home: string; paid: boolean }): string {
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  const toAccount = !safe || safe === "/account" || safe.startsWith("/account?") || safe.startsWith("/account#");
  if (!toAccount) return safe;
  if (paid) return safe ?? "/account";
  return `${/^\/[a-z]{2}$/.test(home) ? home : "/"}#notify`;
}

/** Clerk's `__client_uat` cookie (readable by scripts): 0 when signed out, a timestamp when signed in. */
export function signedInFromCookie(cookie: string): boolean {
  return [...cookie.matchAll(/(?:^|;\s*)__client_uat(?:_[^=]*)?=(\d+)/g)].some((m) => Number(m[1]) > 0);
}
