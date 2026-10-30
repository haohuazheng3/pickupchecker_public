"use client";
/**
 * Pages are rendered once, so a phone tab left in the background came back saying "last check 16m ago"
 * over stock that had moved on — reading as if checking had stopped. The route's server components render
 * again when the tab returns after a minute or more away, when it is restored from the back/forward cache,
 * and every five minutes while it stays open on screen. Client state (an alert being set up) is kept.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const AWAY_MS = 60_000;
const OPEN_MS = 5 * 60_000;

export function FreshOnReturn() {
  const router = useRouter();
  useEffect(() => {
    let hiddenAt: number | null = document.visibilityState === "hidden" ? Date.now() : null;
    let last = Date.now();
    const refresh = () => { last = Date.now(); router.refresh(); };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") { hiddenAt = Date.now(); return; }
      if (hiddenAt != null && Date.now() - hiddenAt >= AWAY_MS) refresh();
      hiddenAt = null;
    };
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) refresh(); };
    const tick = window.setInterval(() => { if (document.visibilityState === "visible" && Date.now() - last >= OPEN_MS) refresh(); }, 30_000);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onShow);
    return () => { window.clearInterval(tick); document.removeEventListener("visibilitychange", onVisibility); window.removeEventListener("pageshow", onShow); };
  }, [router]);
  return null;
}
