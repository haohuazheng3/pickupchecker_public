"use client";
/**
 * Instant skeleton for in-app navigations. PendingLink announces when a client-side navigation starts
 * and ends (NAV_EVENT); while one to another page is pending, the current page is hidden (not unmounted)
 * and the target route's skeleton stands in, exactly where loading.tsx used to put it. The first load
 * never shows a skeleton: the server streams the page itself.
 */
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { RouteSkeleton, skeletonKind, type SkeletonKind } from "./RouteSkeletons";
import { NAV_EVENT, type NavEventDetail } from "./navEvents";

/** The longest a skeleton may stay up if a navigation never reports back. */
const MAX_MS = 15_000;

interface Pending { kind: SkeletonKind; href: string; from: string }

export function NavSkeleton({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [nav, setNav] = useState<Pending | null>(null);
  // Only while we are still on the page the navigation left from: once the new path commits, it is gone.
  const kind = nav && nav.from === pathname ? nav.kind : null;

  useEffect(() => {
    const onNav = (e: Event) => {
      const { href, pending } = (e as CustomEvent<NavEventDetail>).detail;
      if (!pending) { setNav((cur) => (cur && cur.href === href ? null : cur)); return; }
      let url: URL;
      try { url = new URL(href, window.location.href); } catch { return; }
      const to = skeletonKind(url.pathname);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname || !to) return;
      setNav({ kind: to, href, from: window.location.pathname });
    };
    window.addEventListener(NAV_EVENT, onNav);
    return () => window.removeEventListener(NAV_EVENT, onNav);
  }, []);

  useEffect(() => {
    if (!nav) return;
    const t = setTimeout(() => setNav(null), MAX_MS);
    return () => clearTimeout(t);
  }, [nav]);

  return (
    <>
      {kind && <RouteSkeleton kind={kind} />}
      <div style={{ display: kind ? "none" : "contents" }}>{children}</div>
    </>
  );
}
