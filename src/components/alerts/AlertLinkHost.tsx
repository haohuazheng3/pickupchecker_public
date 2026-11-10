"use client";
/**
 * "Alert me" and "Sign in" links keep their hrefs (/?…#notify, /jp?…#notify, /ja-jp?signin=1&next=…: deep
 * links, no-JS, the Home Screen app's start URL). A click on one opens the alert lightbox with that href
 * instead (AlertLightbox), on every page but the admin and checkout ones.
 */
import { useEffect } from "react";
import { localeFromSegment } from "@/lib/i18n/locales";
import { openAlertLightbox } from "@/lib/alertLightbox";

/** "/" or a country's home: its English one ("/uk", "/jp") or one in its own language ("/ja-jp", which PendingLink makes of "/jp" on a Japanese page). */
export const isHome = (path: string) => path === "/" || Boolean(localeFromSegment(path.match(/^\/([a-z]{2}(?:-[a-z]{2})?)\/?$/)?.[1]));

/** A link the lightbox opens: a home page's alert setup (#notify) or its sign-in (?signin=1). */
export function opensLightbox(url: URL): boolean {
  return isHome(url.pathname) && (url.hash === "#notify" || url.searchParams.get("signin") === "1");
}

export function AlertLinkHost() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || !opensLightbox(url)) return;
      if (/^\/(admin|checkout)(\/|$)/.test(window.location.pathname)) return;
      e.preventDefault();
      e.stopPropagation();
      openAlertLightbox(url.href);
    };
    // Capture phase: before the router's own link handler.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
