"use client";
/**
 * Pages are rendered once, so a phone tab left in the background came back saying "last check 16m ago"
 * over stock that had moved on — reading as if checking had stopped. The route's server components render
 * again when the tab returns after a minute or more away, when it is restored from the back/forward cache,
 * and every five minutes while it stays open on screen — and within seconds of a restock or sell-out in what
 * the page shows (LiveChecked's STOCK_CHANGED), at most once every MIN_GAP_MS. Client state (an alert being
 * set up) is kept.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { STOCK_CHANGED } from "./LiveChecked";

const AWAY_MS = 60_000;
const OPEN_MS = 5 * 60_000;
// A refresh also re-prefetches every link on screen (router.refresh clears the router cache: 6 header links,
// measured on production), so stock changes re-render at most twice a minute.
const MIN_GAP_MS = 30_000;

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
    let pending: number | null = null;
    const onStock = () => {
      if (pending !== null) return;
      const wait = Math.max(0, MIN_GAP_MS - (Date.now() - last));
      pending = window.setTimeout(() => { pending = null; if (document.visibilityState === "visible") refresh(); }, wait);
    };
    const tick = window.setInterval(() => { if (document.visibilityState === "visible" && Date.now() - last >= OPEN_MS) refresh(); }, 30_000);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onShow);
    window.addEventListener(STOCK_CHANGED, onStock);
    return () => {
      window.clearInterval(tick);
      if (pending !== null) window.clearTimeout(pending);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onShow);
      window.removeEventListener(STOCK_CHANGED, onStock);
    };
  }, [router]);
  return null;
}
