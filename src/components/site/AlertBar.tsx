"use client";
/**
 * The one button of the product, floating above every page like the header: "Alert me". It carries
 * the page's context into the wizard — a store page pre-selects that store, a model page that model.
 * Hidden inside the ops console and when the wizard itself is on screen (the home page's #notify).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODELS } from "@/lib/apple/catalog";

export function alertHref(pathname: string): string {
  const store = pathname.match(/^\/stores\/[^/]+\/[^/]+\/([^/]+)\/?$/);
  if (store) return `/?store=${encodeURIComponent(store[1])}#notify`;
  const model = pathname.match(/^\/stock\/([^/]+)\/?$/);
  if (model) {
    const m = MODELS.find((x) => x.slug === model[1]);
    if (m) return `/?model=${m.key}#notify`;
  }
  return "/#notify";
}

export function AlertBar() {
  const pathname = usePathname() ?? "/";
  const [wizardVisible, setWizardVisible] = useState(false);
  useEffect(() => {
    const el = document.getElementById("notify");
    if (!el || typeof IntersectionObserver === "undefined") {
      const t = window.setTimeout(() => setWizardVisible(false), 0); // a page without the wizard: show the bar
      return () => window.clearTimeout(t);
    }
    const io = new IntersectionObserver(([e]) => setWizardVisible(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [pathname]);
  if (pathname.startsWith("/admin") || pathname.startsWith("/checkout")) return null;
  const href = alertHref(pathname);
  return (
    <div className={`alert-bar fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] transition-[transform,opacity] duration-200 ${wizardVisible ? "pointer-events-none translate-y-full opacity-0" : ""}`} aria-hidden={wizardVisible}>
      <div className="pane mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2.5 sm:px-5">
        <div className="hidden min-w-0 sm:block">
          <div className="text-sm font-semibold">Restock alerts in seconds</div>
          <div className="truncate text-xs text-ink-3">One store, one configuration. Your phone buzzes the moment it is in stock.</div>
        </div>
        <Link href={href} className="btn btn-hero w-full sm:w-auto sm:min-w-56">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></svg>
          Alert me
        </Link>
      </div>
    </div>
  );
}
