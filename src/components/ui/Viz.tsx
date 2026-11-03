/**
 * The site's "show, don't write" primitives: a big number with a label, a keyword line with a tick or a cross,
 * an instead-of/do swap, a read-only chip row, and a folded "how this is measured" note. Every module that
 * used to open with a paragraph now opens with these; the sentence, where a page still needs one for an answer
 * engine to quote, stays to one line. Server components (no hooks) so dashboard, SEO pages and the guide share them;
 * Measured's default title reads the page's language (i18n/server), so import Viz from server components only.
 */
import type { ReactNode } from "react";
import { t } from "@/lib/i18n/server";

/* ----------------------------------------------------------------------------------------------- icons */

/** A tick: this is the thing to do (or the fact that holds). */
export function Do({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 16 16" className={`mt-[3px] h-3.5 w-3.5 shrink-0 text-accent ${className}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 8.5l3.2 3L13 4.5" /></svg>;
}
/** A cross: the thing not to do (or the number that works against you). */
export function Dont({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 16 16" className={`mt-[3px] h-3.5 w-3.5 shrink-0 text-bad ${className}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M4 4l8 8M12 4l-8 8" /></svg>;
}
/** An arrow: a step or a consequence. */
export function Next({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 16 16" className={`mt-[3px] h-3.5 w-3.5 shrink-0 text-ink-3 rtl:-scale-x-100 ${className}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 8h9M8.5 4.5L12 8l-3.5 3.5" /></svg>;
}

/* ------------------------------------------------------------------------------------------- big number */

export type StatTone = "plain" | "accent" | "warn" | "muted";

/**
 * One number, large, with a unit and a one-line label: "75 s · typical listing, listed to gone". `tone` "accent"
 * is the number the reader should act on, "warn" the one working against them, "muted" a comparison.
 */
export function Stat({ value, unit, label, tone = "plain", live = false, size = "md", className = "" }: { value: ReactNode; unit?: string; label: ReactNode; tone?: StatTone; live?: boolean; /** "sm" for a clock time or a word, which would not fit a phone-width tile at the number size. */ size?: "md" | "sm"; className?: string }) {
  const frame = tone === "accent" ? "border-accent/40 bg-accent/10" : tone === "warn" ? "border-warn/40 bg-warn/10" : "border-line bg-[var(--fill-1)]";
  const ink = tone === "muted" ? "text-ink-3" : "text-ink";
  const type = size === "sm" ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl";
  return (
    <div className={`min-w-0 rounded-[var(--radius-2)] border p-4 ${frame} ${className}`}>
      <div className={`display flex items-baseline gap-1.5 tabular-nums ${type} ${ink}`}>
        {live && <span className="dot dot-ok dot-live relative top-[-2px] me-1 shrink-0" aria-hidden />}
        <span className="min-w-0 break-words">{value}</span>{unit && <span className="shrink-0 text-base font-semibold text-ink-3">{unit}</span>}
      </div>
      <div className="mt-1 text-xs leading-snug text-ink-3">{label}</div>
    </div>
  );
}

/** Two tiles per row on a phone (an odd last tile spans the row), `cols` on a laptop. */
export function StatGrid({ children, cols = 3, className = "" }: { children: ReactNode; cols?: 2 | 3 | 4; className?: string }) {
  const c = cols === 2 ? "sm:grid-cols-2" : cols === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3";
  return <div className={`grid grid-cols-2 gap-3 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1 ${c} ${className}`}>{children}</div>;
}

/* ------------------------------------------------------------------------------------------- keywords */

/** One line on a keyword list; `plain` is the sentence for schema/aria when the visible text is fragments. */
export interface Point { text: ReactNode; plain?: string; no?: boolean; step?: boolean }

/** Two to five short lines with a tick, a cross or an arrow in front — in place of a paragraph. */
export function Points({ items, className = "", size = "sm" }: { items: Point[]; className?: string; size?: "sm" | "base" }) {
  return (
    <ul className={`space-y-1.5 leading-snug ${size === "sm" ? "text-sm" : "text-base"} ${className}`}>
      {items.map((p, i) => (
        <li key={p.plain ?? i} className={`flex gap-2 ${p.no ? "text-ink-3" : "text-ink-2"}`}>{p.no ? <Dont /> : p.step ? <Next /> : <Do />}<span className="min-w-0">{p.text}</span></li>
      ))}
    </ul>
  );
}

/** "Instead of X → do Y", with a one-line why. */
export function Swap({ no, yes, why }: { no: ReactNode; yes: ReactNode; why?: ReactNode }) {
  return (
    <li className="pane-2 flex flex-col gap-2 p-4">
      <div className="flex items-start gap-2 text-sm text-ink-3"><Dont /><span className="line-through decoration-ink-3/60">{no}</span></div>
      <div className="flex items-start gap-2 text-base font-semibold text-ink"><Do /><span>{yes}</span></div>
      {why && <div className="text-xs leading-snug text-ink-3">{why}</div>}
    </li>
  );
}

/** Read-only chips: the three busiest hours, the configurations in play, the knobs to set. */
export function Chips({ items, className = "", on }: { items: ReactNode[]; className?: string; on?: number[] }) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {items.map((c, i) => <span key={i} className="chip chip-sm pointer-events-none" data-on={on?.includes(i) ? "true" : undefined}>{c}</span>)}
    </div>
  );
}

/** A numbered step, two to four words, with an optional one-line hint: the dashboard's checklist strip. */
export function StepStrip({ steps, className = "" }: { steps: { title: ReactNode; hint?: ReactNode }[]; className?: string }) {
  return (
    <ol className={`grid gap-2 sm:grid-cols-2 lg:grid-cols-5 ${className}`}>
      {steps.map((s, i) => (
        <li key={i} className="flex gap-2.5 rounded-[var(--radius-3)] border border-line bg-[var(--fill-1)] p-3">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-[var(--accent-ink)]">{i + 1}</span>
          <span className="min-w-0 text-sm leading-snug"><span className="block font-semibold text-ink">{s.title}</span>{s.hint && <span className="mt-0.5 block text-xs text-ink-3">{s.hint}</span>}</span>
        </li>
      ))}
    </ol>
  );
}

/* ---------------------------------------------------------------------------------------------- notes */

/** The honest footnote, folded: one line to open, the method inside. Open by default for print and crawlers' text. */
export function Measured({ title, children, className = "" }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <details className={`group mt-3 text-xs text-ink-3 ${className}`}>
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 font-medium underline-offset-2 hover:text-ink [&::-webkit-details-marker]:hidden">
        <svg viewBox="0 0 16 16" className="h-3 w-3 transition-transform group-open:rotate-90 rtl:-scale-x-100 rtl:group-open:-rotate-90" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 4l4 4-4 4" /></svg>
        {title === undefined ? t().content.measured : title}
      </summary>
      <div className="mt-2 max-w-3xl leading-relaxed">{children}</div>
    </details>
  );
}
