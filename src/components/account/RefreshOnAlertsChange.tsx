"use client";
/** Re-renders the account page the moment alerts change, here (the alert dialog, the list) or in another tab. */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAlertsChanged } from "@/lib/alertEvents";

export function RefreshOnAlertsChange() {
  const router = useRouter();
  useEffect(() => {
    let t = 0;
    const off = onAlertsChanged(() => { window.clearTimeout(t); t = window.setTimeout(() => router.refresh(), 150); });
    return () => { off(); window.clearTimeout(t); };
  }, [router]);
  return null;
}
