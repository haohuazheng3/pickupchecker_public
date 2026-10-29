"use client";
import { useClerk } from "@clerk/nextjs";
export function SignOutButton() {
  const { signOut } = useClerk();
  return <button className="btn btn-ghost btn-sm" onClick={() => signOut({ redirectUrl: "/" })}>Sign out</button>;
}
