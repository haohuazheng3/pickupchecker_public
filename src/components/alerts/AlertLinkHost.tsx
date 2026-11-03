"use client";
/**
 * "Alert me" links keep their /?…#notify hrefs (deep links, no-JS); another country's pages link to their own
 * home (/uk?…#notify). On a page with an alert panel, a click opens that panel in place with the link's
 * pre-fill; anywhere else it is an ordinary link to that home page.
 */
import { useEffect } from "react";
import { localeFromSegment } from "@/lib/i18n/locales";
import { openSection } from "./Section";

/** "/" or a country's home: its English one ("/uk", "/jp") or one in its own language ("/ja-jp", which PendingLink makes of "/jp" on a Japanese page). */
const isHome = (path: string) => path === "/" || Boolean(localeFromSegment(path.match(/^\/([a-z]{2}(?:-[a-z]{2})?)\/?$/)?.[1]));

export function AlertLinkHost() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || !isHome(url.pathname) || url.hash !== "#notify" || url.searchParams.has("signin")) return;
      if (isHome(window.location.pathname) || !document.querySelector("[data-alert-panel]")) return;
      e.preventDefault();
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent("pc:alert", { detail: url.searchParams.toString() }));
      openSection("notify");
    };
    // Capture phase: before the router's own link handler.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
