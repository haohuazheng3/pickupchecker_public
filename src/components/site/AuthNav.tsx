"use client";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { useAuth } from "@clerk/nextjs";

/** Signed-in → "My alerts"; signed-out → nothing (sign-in happens inside the wizard, never on a Clerk page). */
export function AuthNav() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded || !isSignedIn) return null;
  return (
    <Link href="/account" className="btn btn-ghost btn-sm">
      My alerts
    </Link>
  );
}
