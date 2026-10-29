export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="56" height="56" rx="18" fill="url(#pc-g)" />
      <path d="M22 33.5l7 7L43 25.5" stroke="#052414" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="46" cy="18" r="6" fill="#07080c" stroke="#35e38c" strokeWidth="3" />
      <defs>
        <linearGradient id="pc-g" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5cf0a5" />
          <stop offset="1" stopColor="#1fbf72" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** `compact` hides the wordmark on narrow screens (the header has three things to fit). */
export function Logo({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className={`font-semibold tracking-tight text-[1.05rem] ${compact ? "hidden min-[400px]:inline" : ""}`}>
        Pickup<span className="text-accent">Checker</span>
      </span>
    </span>
  );
}
