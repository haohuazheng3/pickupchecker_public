"use client";
import { useEffect } from "react";
import { identify } from "@/lib/track";
export function Identify({ userRef, email }: { userRef: string; email: string }) {
  useEffect(() => { identify(userRef, email); }, [userRef, email]);
  return null;
}
