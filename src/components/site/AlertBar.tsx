"use client";
/**
 * The one button of the product, floating over every page: "Alert me". It carries the page's context
 * into the wizard — a store page pre-ticks that store, a model page that model. Hidden inside the ops
 * console, at checkout, and while the wizard itself is on screen (the home page's #notify).
 */
import { useEffect, useState } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { usePathname } from "next/navigation";
import { MODELS } from "@/lib/apple/catalog";
import { productBySlug, resolvePlace } from "@/lib/seo/products";

export function alertHref(pathname: string): string {
  // A product page: the exact phone, and the store / city / state it is about.
  const parts = pathname.split("/").filter(Boolean);
  const product = parts[0] === "stock" && parts[1] ? productBySlug(parts[1]) : undefined;
  if (product) {
    const q = new URLSearchParams({ model: product.model });
    if (product.storage) q.set("storage", product.storage);
    if (product.color) q.set("color", product.color);
    const place = resolvePlace(parts.slice(2));
    if (place && !("redirect" in place)) {
      if (place.store) q.set("store", place.store.storeNumber);
      else if (place.stateSlug) { q.set("state", place.stateSlug); if (place.citySlug) q.set("city", place.citySlug); }
    }
    return `/?${q.toString()}#notify`;
  }
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
  const [wizardMounted, setWizardMounted] = useState(false);
  const [wizardVisible, setWizardVisible] = useState(pathname === "/"); // the home page owns the wizard: no flash before the observer settles
  // The wizard announces itself (pc:wizard) — a route's loading skeleton has no #notify yet.
  useEffect(() => {
    const on = (e: Event) => setWizardMounted(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener("pc:wizard", on);
    return () => window.removeEventListener("pc:wizard", on);
  }, []);
  useEffect(() => {
    const el = wizardMounted ? document.getElementById("notify") : null;
    if (!el || typeof IntersectionObserver === "undefined") {
      const t = window.setTimeout(() => setWizardVisible(false), 0); // no wizard on screen: show the button
      return () => window.clearTimeout(t);
    }
    const io = new IntersectionObserver(([e]) => setWizardVisible(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [pathname, wizardMounted]);
  if (pathname.startsWith("/admin") || pathname.startsWith("/checkout")) return null;
  return (
    <div className={`pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),1rem)] transition-[transform,opacity] duration-200 ${wizardVisible ? "translate-y-4 opacity-0" : ""}`} aria-hidden={wizardVisible}>
      <Link href={alertHref(pathname)} className={`btn btn-hero ${wizardVisible ? "pointer-events-none" : "pointer-events-auto"}`} tabIndex={wizardVisible ? -1 : undefined}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></svg>
        Alert me
      </Link>
    </div>
  );
}
