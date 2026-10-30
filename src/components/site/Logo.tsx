/**
 * The mark: an ink shopping bag on a flat mint tile, the check cut out of the bag in the tile's colour —
 * two colours, mint #35e38c (the dark theme's accent) and ink #0d1411; the same in both themes.
 * public/icon.svg, the PWA icons and the OG image are the same drawing (scratchpad pw/mark.mjs renders them).
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="#35e38c" />
      <path d="M24.6 25.6v-3.4a7.4 7.4 0 0 1 14.8 0v3.4" stroke="#0d1411" strokeWidth="4" strokeLinecap="round" />
      <path d="M17.6 25.2h28.8a2.2 2.2 0 0 1 2.19 2.38l-1.6 19.5a4.6 4.6 0 0 1-4.58 4.22H21.6a4.6 4.6 0 0 1-4.58-4.22l-1.6-19.5a2.2 2.2 0 0 1 2.19-2.38z" fill="#0d1411" />
      <path d="M24.9 38.4l4.9 4.9 9.3-10.1" stroke="#35e38c" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * `compact` hides the wordmark below 420 px and lets it truncate above that: on a phone the header row
 * must hold the mark, "My alerts", search and the theme toggle, so the wordmark is the one thing that gives way.
 */
export function Logo({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={`inline-flex min-w-0 max-w-full items-center gap-2.5 ${className}`}>
      <span className="shrink-0"><LogoMark /></span>
      <span className={`min-w-0 truncate text-[1.05rem] font-semibold tracking-[-0.02em] text-ink ${compact ? "hidden min-[420px]:inline-block" : ""}`}>PickupChecker</span>
    </span>
  );
}
