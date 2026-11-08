"use client";
/**
 * Pages are rendered once, so a phone tab left in the background came back saying "last check 16m ago"
 * over stock that had moved on — reading as if checking had stopped. The route's server components render
 * again when the tab returns after a minute or more away, when it is restored from the back/forward cache,
 * and every five minutes while it stays open on screen — and within seconds of a restock or sell-out in what
 * the page shows (LiveChecked's STOCK_CHANGED), at most once every MIN_GAP_MS. Client state (an alert being
 * set up) is kept. A tap on the link to the page already on screen refreshes it too and says so (SAME_PAGE_EVENT).
 */
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/LangProvider";
import { SAME_PAGE_EVENT } from "@/components/ui/navEvents";
import { STOCK_CHANGED } from "./LiveChecked";

const AWAY_MS = 60_000;
const OPEN_MS = 5 * 60_000;
// A refresh also re-prefetches every link on screen (router.refresh clears the router cache: 6 header links,
// measured on production), so stock changes re-render at most twice a minute.
const MIN_GAP_MS = 30_000;

// A tap on the link to the page on screen (PendingLink → SAME_PAGE_EVENT) refreshes it, unless it was just refreshed.
const TAP_GAP_MS = 3_000;

export function FreshOnReturn() {
  const router = useRouter();
  const t = useT().chrome.refresh;
  const [pending, startTransition] = useTransition();
  // > 0 while the "Updating… / Updated just now" pill shows: the answer to a tap that used to change nothing visible.
  const [tap, setTap] = useState(0);
  useEffect(() => {
    if (!tap || pending) return;
    const id = window.setTimeout(() => setTap(0), 1800);
    return () => window.clearTimeout(id);
  }, [tap, pending]);
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
    const onSamePage = () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTap((k) => k + 1);
      if (Date.now() - last < TAP_GAP_MS) return;
      last = Date.now();
      startTransition(() => router.refresh());
    };
    const tick = window.setInterval(() => { if (document.visibilityState === "visible" && Date.now() - last >= OPEN_MS) refresh(); }, 30_000);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onShow);
    window.addEventListener(STOCK_CHANGED, onStock);
    window.addEventListener(SAME_PAGE_EVENT, onSamePage);
    return () => {
      window.removeEventListener(SAME_PAGE_EVENT, onSamePage);
      window.clearInterval(tick);
      if (pending !== null) window.clearTimeout(pending);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onShow);
      window.removeEventListener(STOCK_CHANGED, onStock);
    };
  }, [router]);
  if (!tap) return null;
  return (
    <div role="status" className="fixed inset-x-0 z-50 mx-auto flex w-fit items-center gap-2 rounded-full border border-line bg-pane px-4 py-2 text-sm shadow-lg"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 5rem)" }}>
      {pending ? <><span className="spinner" />{t.busy}</> : <><span className="text-accent" aria-hidden>✓</span>{t.done}</>}
    </div>
  );
}
