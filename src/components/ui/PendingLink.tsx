"use client";
/**
 * Drop-in for next/link that lights up the moment it is tapped. While the navigation is pending
 * (Next 16 `useLinkStatus`) the anchor carries data-pending="true", and feedback.css dims it and
 * shows a spinner on `.btn` links. The markup is unchanged: the status probe renders nothing and
 * only toggles the attribute on the anchor it lives in.
 */
import Link, { useLinkStatus } from "next/link";
import { useCallback, useLayoutEffect, useRef, type ComponentProps, type RefObject } from "react";

function PendingProbe({ anchor }: { anchor: RefObject<HTMLAnchorElement | null> }) {
  const { pending } = useLinkStatus();
  useLayoutEffect(() => {
    const el = anchor.current;
    if (!el) return;
    if (pending) el.setAttribute("data-pending", "true");
    else el.removeAttribute("data-pending");
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
