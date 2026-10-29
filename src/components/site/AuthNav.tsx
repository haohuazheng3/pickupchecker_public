"use client";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

/** Signed-in → "My alerts"; signed-out → nothing (sign-in happens inside the wizard, never on a Clerk page). */
export function AuthNav() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded || !isSignedIn) return null;
  return (
    <Link href="/account" className="btn btn-ghost btn-sm hidden sm:inline-flex">
      My alerts
    </Link>
  );
}
