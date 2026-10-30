/**
 * Skeleton building blocks. Every block is the `.skeleton` shimmer (globals.css) shaped like the
 * component it stands in for, so a loading.tsx swap keeps heading, card and list positions and the
 * page does not jump when the real content lands. Server-safe (no hooks), aria-hidden throughout.
 */
import type { CSSProperties } from "react";

export function Skeleton({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden />;
}

const LINE_WIDTHS = ["w-full", "w-11/12", "w-4/5", "w-2/3", "w-3/4"];

/** A paragraph: `lines` text-height bars with staggered widths; the last one is shorter. */
export function SkeletonText({ lines = 3, className = "", line = "h-3.5" }: { lines?: number; className?: string; line?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`skeleton ${line} ${i === lines - 1 ? "w-1/2" : LINE_WIDTHS[i % LINE_WIDTHS.length]}`} />
      ))}
    </div>
  );
}

/** A `.pane-2` card with a title line, a sub line and a row of chips — the generic list item. */
export function SkeletonCard({ className = "", chips = 3, lines = 1, foot = false }: { className?: string; chips?: number; lines?: number; foot?: boolean }) {
  return (
    <div className={`pane-2 p-4 ${className}`} aria-hidden>
      <div className="flex items-start justify-between gap-2">
        <div className="skeleton h-4 w-2/5" />
        <div className="skeleton h-3 w-12" />
      </div>
      {Array.from({ length: lines }).map((_, i) => <div key={i} className="skeleton mt-2 h-3 w-3/5" />)}
      {chips > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Array.from({ length: chips }).map((_, i) => <div key={i} className="skeleton h-5 w-16 rounded-full" />)}
        </div>
      )}
      {foot && <div className="skeleton mt-2 h-3 w-20" />}
    </div>
  );
}

/**
 * The page head used by the SEO pages: optional breadcrumb line, h1, intro line(s), optional chip
 * row, and the action buttons that sit to the right on wide screens and below on phones.
 */
export function PageHeadSkeleton({ crumbs = false, eyebrow = false, lines = 1, chips = 0, actions = 2, className = "" }: { crumbs?: boolean; eyebrow?: boolean; lines?: number; chips?: number; actions?: number; className?: string }) {
  return (
    <div className={className} aria-hidden>
      {crumbs && <div className="skeleton h-3.5 w-48 max-w-full" />}
      {eyebrow && <div className="skeleton h-3 w-40 max-w-full" />}
      <div className={`${crumbs || eyebrow ? "mt-2" : ""} flex flex-wrap items-end justify-between gap-4`}>
        <div className="min-w-0 flex-1">
          <div className="skeleton h-9 w-4/5 max-w-md sm:h-12" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: lines }).map((_, i) => <div key={i} className={`skeleton h-4 ${i === 0 ? "w-11/12 max-w-2xl" : "w-2/3 max-w-xl"}`} />)}
          </div>
          {chips > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Array.from({ length: chips }).map((_, i) => <div key={i} className="skeleton h-7 w-20 rounded-full" />)}
            </div>
          )}
        </div>
        {actions > 0 && (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: actions }).map((_, i) => <div key={i} className={`skeleton h-9 rounded-full ${i === actions - 1 ? "w-28" : "w-32"}`} />)}
          </div>
        )}
      </div>
    </div>
  );
}

/** Mirrors RestockFeed: dot, time line, store line, detail line, and the two icon buttons at the right. */
export function FeedSkeleton({ rows = 6, buttons = true, className = "" }: { rows?: number; buttons?: boolean; className?: string }) {
  return (
    <ul className={`divide-y divide-line ${className}`} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 py-2.5">
          <span className="skeleton mt-1 h-2 w-2 shrink-0 self-start rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="skeleton h-3.5 w-28" />
            <div className={`skeleton h-3.5 ${i % 2 ? "w-3/5" : "w-1/2"}`} />
            <div className="skeleton h-3 w-2/5" />
          </div>
          {buttons && (
            <div className="flex shrink-0 gap-1">
              <div className="skeleton h-8 w-9 rounded-full" />
              <div className="skeleton h-8 w-9 rounded-full" />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Mirrors the store card on state/city pages: name + "checked", street, three model dots. */
export function StoreCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`pane-2 block p-4 ${className}`} aria-hidden>
      <div className="flex items-start justify-between gap-2">
        <div className="skeleton h-4 w-1/2" />
        <div className="skeleton h-3 w-20" />
      </div>
      <div className="skeleton mt-2 h-3.5 w-3/5" />
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <span key={i} className="inline-flex items-center gap-1.5"><span className="skeleton h-2.5 w-2.5 rounded-full" /><span className="skeleton h-3.5 w-12" /></span>
        ))}
      </div>
    </div>
  );
}

/** Mirrors RestockClock: the sentence, then the by-hour and by-weekday bar charts. */
export function ClockSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <div className="skeleton h-4 w-11/12 max-w-lg" />
      <div className="skeleton mt-2 h-4 w-2/3 max-w-sm" />
      <div className="mt-4 grid gap-6 sm:grid-cols-[3fr_2fr]">
        {[24, 7].map((n, col) => (
          <div key={col}>
            <div className="skeleton mb-2 h-3 w-28" />
            <div className="flex h-24 items-end gap-[3px]">
              {Array.from({ length: n }).map((_, i) => (
                <div key={i} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                  <div className="skeleton w-full rounded-t-[3px] rounded-b-none" style={{ height: `${18 + ((i * 29) % 54)}px` }} />
                  <span className="h-3" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Mirrors the home Board: eyebrow + big count, the checked line, store chips, the latest-restocks list, buttons. */
export function BoardSkeleton({ rows = 5, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={className} aria-hidden>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="skeleton h-3 w-36" />
          <div className="mt-2 flex items-baseline gap-2"><div className="skeleton h-10 w-14" /><div className="skeleton h-4 w-40" /></div>
        </div>
        <div className="space-y-1.5">
          <div className="skeleton h-3 w-28" />
          <div className="skeleton h-3 w-36" />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-6 w-24 rounded-full" />)}
      </div>
      <div className="skeleton mt-4 h-3 w-32" />
      <FeedSkeleton rows={rows} />
      <div className="mt-3 flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-8 w-24 rounded-full" />)}
      </div>
    </div>
  );
}
