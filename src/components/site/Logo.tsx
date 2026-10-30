/** The mark: a white pickup bag carrying a check, on the brand's deep-green tile (public/icon.svg is the same drawing). */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="pc-tile" x1="32" y1="0" x2="32" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#16a565" />
          <stop offset="1" stopColor="#077040" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#pc-tile)" />
      <rect x=".75" y=".75" width="62.5" height="62.5" rx="14.25" stroke="#fff" strokeOpacity=".14" strokeWidth="1.5" />
      <path d="M25 24.5v-3.6a7 7 0 0 1 14 0v3.6" stroke="#fff" strokeWidth="3.8" strokeLinecap="round" />
      <path d="M18.2 24h27.6a2 2 0 0 1 2 2.15l-1.55 20.6a4.3 4.3 0 0 1-4.29 3.98H21.99a4.3 4.3 0 0 1-4.29-3.98l-1.55-20.6A2 2 0 0 1 18.2 24z" fill="#fff" />
      <path d="M25.4 37.6l4.6 4.6 8.6-9.4" stroke="#0a7f49" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
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
