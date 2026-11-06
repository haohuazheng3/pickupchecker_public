"use client";
/**
 * Drop-in for next/link that lights up the moment it is tapped. While the navigation is pending
 * (Next 16 `useLinkStatus`) the anchor carries data-pending="true", and feedback.css dims it and
 * shows a spinner on `.btn` links. The markup is unchanged: the status probe renders nothing and
 * only toggles the attribute on the anchor it lives in. It also announces the start and the end of
 * the navigation (NAV_EVENT), so NavSkeleton can show the target page's skeleton meanwhile.
 *
 * Prefetching is on intent only (2026-11-06). next/link's default prefetches every link that scrolls into view, and
 * router.refresh() (FreshOnReturn: on a stock change, and every 5 min while visible) empties the router cache so all
 * of them are fetched again: the header's 6 links and the footer's ~40 made one page view cost ~50 function
 * invocations on Vercel (1.3 M a day on 2026-11-05, ~$16/day). Now a link is prefetched once when the reader shows
 * intent — mouse over it, finger down on it, keyboard focus — which keeps desktop navigation instant and costs one
 * request per link the reader is about to use. `prefetch={true}` on a link restores the viewport behaviour for it.
 */
import Link, { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useLayoutEffect, useRef, type ComponentProps, type RefObject } from "react";
import { NAV_EVENT, type NavEventDetail } from "./navEvents";
import { useAppLocale, useLocale } from "@/components/i18n/LangProvider";
import { langOfPath, localizePath } from "@/lib/i18n/locales";

function announce(detail: NavEventDetail) {
  window.dispatchEvent(new CustomEvent<NavEventDetail>(NAV_EVENT, { detail }));
}

function PendingProbe({ anchor }: { anchor: RefObject<HTMLAnchorElement | null> }) {
  const { pending } = useLinkStatus();
  useLayoutEffect(() => {
    const el = anchor.current;
    if (!el) return;
    if (!pending) { el.removeAttribute("data-pending"); return; }
    el.setAttribute("data-pending", "true");
    const href = el.href;
    announce({ href, pending: true });
    // Runs when the navigation settles and also when this link unmounts with the old page.
    return () => announce({ href, pending: false });
  }, [pending, anchor]);
  return null;
}

export type PendingLinkProps = ComponentProps<typeof Link>;

/**
 * Languages (docs/i18n.md §6): an href written in its English form goes to the reader's language where that page
 * exists ("/jp/stores/…" on a Japanese page → "/ja-jp/stores/…"), and a link into another language is a plain
 * anchor — a full page load — because the root layout (header, footer, <html lang>) renders once per load.
 */
export function PendingLink({ children, ref, href, prefetch, onMouseEnter, onTouchStart, onFocus, ...props }: PendingLinkProps) {
  const loc = useLocale();
  const app = useAppLocale();
  const router = useRouter();
  const own = useRef<HTMLAnchorElement | null>(null);
  const prefetched = useRef(false);
  const setRef = useCallback((el: HTMLAnchorElement | null) => {
    own.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  }, [ref]);
  const to = typeof href === "string" ? localizePath(href, loc.lang) : href;
  if (typeof to === "string" && to.startsWith("/") && langOfPath(to, app?.lang ?? "en") !== loc.lang) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { replace, scroll, shallow, locale, legacyBehavior, passHref, onNavigate, ...a } = props as PendingLinkProps & Record<string, unknown>;
    return <a {...(a as React.AnchorHTMLAttributes<HTMLAnchorElement>)} href={to} ref={setRef} onMouseEnter={onMouseEnter} onTouchStart={onTouchStart} onFocus={onFocus}>{children}</a>;
  }
  // Intent prefetch: once per link, only when the default viewport prefetch is off (prefetch === true keeps next/link's own).
  const intent = () => {
    if (prefetch === true || prefetched.current || typeof to !== "string") return;
    prefetched.current = true;
    try { router.prefetch(to); } catch { /* offline or unsupported: the click still navigates */ }
  };
  return (
    <Link
      {...props}
      href={to}
      ref={setRef}
      prefetch={prefetch === true ? true : false}
      onMouseEnter={(e) => { onMouseEnter?.(e); intent(); }}
      onTouchStart={(e) => { onTouchStart?.(e); intent(); }}
      onFocus={(e) => { onFocus?.(e); intent(); }}
    >
      <PendingProbe anchor={own} />
      {children}
    </Link>
  );
}
