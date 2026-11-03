"use client";
import { useClerk } from "@clerk/nextjs";
import { useAppLocale, useT } from "@/components/i18n/LangProvider";
import { signInHome } from "@/lib/i18n/locales";
/** Back to the home page of the person's language ("/" in English). */
export function SignOutButton() {
  const { signOut } = useClerk();
  const d = useT().account;
  const home = signInHome(useAppLocale() ?? undefined);
  return <button className="btn btn-ghost btn-sm" onClick={() => signOut({ redirectUrl: home })}>{d.signOut}</button>;
}
