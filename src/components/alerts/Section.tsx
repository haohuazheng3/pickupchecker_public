"use client";
/**
 * The site's section block: a card whose header row (title, a one-line summary, a chevron) folds the body
 * away. Everything on the dashboard and in the alert panels is one of these — no dialogs, no extra pages.
 * Another part of the page can open one and bring it into view: openSection("plan").
 */
import { useEffect, useId, useState, type ReactNode } from "react";

export function openSection(id: string) {
  window.dispatchEvent(new CustomEvent("pc:open-section", { detail: id }));
}

export function Section({ id, title, summary, badge, defaultOpen = true, inner = false, onOpen, children }: {
  id: string; title: ReactNode; summary?: ReactNode; badge?: ReactNode; defaultOpen?: boolean;
  /** Told the first time the section is open (lazy bodies). */
  onOpen?: () => void;
  /** Nested in another card (the alert panels): a lighter frame. */
  inner?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  useEffect(() => { if (open) onOpen?.(); }, [open, onOpen]);
  // Arriving at /page#id opens that section (a link from elsewhere: "See plans" → /account#plan).
  useEffect(() => {
    if (window.location.hash !== `#${id}`) return;
    const t = window.setTimeout(() => setOpen(true), 0);
    return () => window.clearTimeout(t);
  }, [id]);
  useEffect(() => {
    const on = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== id) return;
      setOpen(true);
      window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    };
    window.addEventListener("pc:open-section", on);
    return () => window.removeEventListener("pc:open-section", on);
  }, [id]);
  return (
    <section id={id} className={`${inner ? "pane-2" : "pane"} scroll-mt-28 overflow-hidden`}>
      <button type="button" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-3 text-left transition hover:bg-ink/[0.025] ${inner ? "px-4 py-3.5" : "px-5 py-4 sm:px-6"}`}>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2"><span className={inner ? "font-semibold" : "text-lg font-semibold"}>{title}</span>{badge}</span>
          {summary != null && <span className="mt-0.5 block truncate text-sm text-ink-3">{summary}</span>}
        </span>
        <svg viewBox="0 0 20 20" className={`h-5 w-5 shrink-0 text-ink-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 7.5 5 5 5-5" /></svg>
      </button>
      <div id={bodyId} hidden={!open} className={`border-t border-line ${inner ? "px-4 pb-4 pt-3.5" : "px-5 pb-5 pt-4 sm:px-6 sm:pb-6"}`}>{children}</div>
    </section>
  );
}

/** A count chip for a section title. */
export function Count({ n }: { n: number }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${n > 0 ? "bg-accent/12 text-accent" : "bg-ink/6 text-ink-3"}`}>{n}</span>;
}
