"use client";
/**
 * Drop-in for next/link that lights up the moment it is tapped. While the navigation is pending
 * (Next 16 `useLinkStatus`) the anchor carries data-pending="true", and feedback.css dims it and
 * shows a spinner on `.btn` links. The markup is unchanged: the status probe renders nothing and
 * only toggles the attribute on the anchor it lives in. It also announces the start and the end of
 * the navigation (NAV_EVENT), so NavSkeleton can show the target page's skeleton meanwhile.
 */
import Link, { useLinkStatus } from "next/link";
import { useCallback, useLayoutEffect, useRef, type ComponentProps, type RefObject } from "react";
import { NAV_EVENT, type NavEventDetail } from "./navEvents";

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

export function PendingLink({ children, ref, ...props }: PendingLinkProps) {
  const own = useRef<HTMLAnchorElement | null>(null);
  const setRef = useCallback((el: HTMLAnchorElement | null) => {
    own.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  }, [ref]);
  return (
    <Link {...props} ref={setRef}>
      <PendingProbe anchor={own} />
      {children}
    </Link>
  );
}
