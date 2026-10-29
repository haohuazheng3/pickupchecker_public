"use client";
import { useEffect } from "react";
import { track } from "@/lib/track";
export function Identify({ userRef, email }: { userRef: string; email: string }) {
  useEffect(() => { track("identify", { userRef, email }); }, [userRef, email]);
  return null;
}
