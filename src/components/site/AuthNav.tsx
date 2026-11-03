"use client";
import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { localeFromSegment, isAppPath } from "@/lib/i18n/locales";
import { useAppLocale, useT } from "@/components/i18n/LangProvider";
import { signedInFromCookie } from "@/lib/signInRoute";

const noSubscribe = () => () => {};

/**
 * Signed in → "My alerts"; signed out → "Sign in", to the sign-in form on this country's home page, which then
 * sends a paying account to the dashboard and a new one to the alert setup (lib/signInRoute.ts). Until Clerk's
 * script has loaded (~400 KB, after the page), Clerk's own cookie says which, so the button is right at once;
 * the server render keeps the slot (invisible) so nothing shifts.
 */
export function AuthNav() {
  const { isLoaded, isSignedIn } = useAuth();
  const d = useT().chrome.auth;
  const app = useAppLocale();
  const pathname = usePathname() ?? "/";
  const guess = useSyncExternalStore(noSubscribe, () => signedInFromCookie(document.cookie), () => null);
  const signedIn = isLoaded ? Boolean(isSignedIn) : guess;
  if (signedIn === null) return <span className="btn btn-ghost btn-sm invisible" aria-hidden>{d.myAlerts}</span>;
  if (signedIn) return <Link href="/account" className="btn btn-ghost btn-sm">{d.myAlerts}</Link>;
  // Sign in on this country's home in this page's language (/jp, /ja-jp); app pages: the person's language's home.
  const seg = pathname.split("/")[1];
  const home = localeFromSegment(seg) ? `/${seg}` : isAppPath(pathname) && app ? `/${app.id}` : "/";
  // A plain link: no prefetch of the home page from every page a signed-out visitor opens.
  return <a href={`${home}?signin=1`} className="btn btn-ghost btn-sm">{d.signIn}</a>;
}
