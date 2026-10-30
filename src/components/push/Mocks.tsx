/**
 * Decorative phone-screen illustrations for the install guide. Hand-drawn in HTML + inline SVG so
 * they stay crisp, theme with the site and weigh nothing. All are aria-hidden: the step text
 * carries the instruction.
 */
export function Screen({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div aria-hidden className={`mock ${className}`}>
      <div className="mock-screen">{children}</div>
    </div>
  );
}

/** Pulsing accent ring around the control the step is about. */
export function Hl({ children, className = "", label, below }: { children: React.ReactNode; className?: string; label?: string; below?: boolean }) {
  return (
    <span className={`mock-hl ${className}`}>
      {children}
      {label && <span className={below ? "mock-callout mock-callout-below" : "mock-callout"}>{label}</span>}
    </span>
  );
}

const ShareIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v12" /><path d="M8 7l4-4 4 4" /><path d="M6 11v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8" />
  </svg>
);
const PlusSquare = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" /><path d="M12 8v8M8 12h8" />
  </svg>
);
const Chevron = ({ dir, className = "" }: { dir: "l" | "r"; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {dir === "l" ? <path d="M15 5l-7 7 7 7" /> : <path d="M9 5l7 7-7 7" />}
  </svg>
);
const Book = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2V5zM20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 0 2-2V5z" />
  </svg>
);
const Tabs = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="7" width="13" height="13" rx="2" /><path d="M8 4h10a2 2 0 0 1 2 2v10" />
  </svg>
);
const Lock = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
const Dots = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
);
const Monitor = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="12" rx="2" /><path d="M12 9v5M9.5 12.5L12 15l2.5-2.5M8 20h8" />
  </svg>
);

export function AppIcon({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className="shrink-0 rounded-[22%] shadow-[0_6px_18px_-6px_rgba(13,20,17,.35)]">
      <rect width="64" height="64" fill="#35e38c" />
      <g transform="translate(2.56 2.56) scale(.92)">
        <path d="M24.6 25.6v-3.4a7.4 7.4 0 0 1 14.8 0v3.4" stroke="#0d1411" strokeWidth="4" strokeLinecap="round" />
        <path d="M17.6 25.2h28.8a2.2 2.2 0 0 1 2.19 2.38l-1.6 19.5a4.6 4.6 0 0 1-4.58 4.22H21.6a4.6 4.6 0 0 1-4.58-4.22l-1.6-19.5a2.2 2.2 0 0 1 2.19-2.38z" fill="#0d1411" />
        <path d="M24.9 38.4l4.9 4.9 9.3-10.1" stroke="#35e38c" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/* ---------------------------------------------------------------- iPhone */

export function SafariUrlMock() {
  return (
    <Screen>
      <div className="mock-fill">
        <div className="mock-skel w-3/4" /><div className="mock-skel w-1/2" /><div className="mock-skel w-2/3" />
      </div>
      <div className="mock-bar">
        <div className="mock-url"><Lock className="h-3.5 w-3.5 text-ink-3" /><span>pickupchecker.com</span></div>
        <div className="mock-toolbar"><Chevron dir="l" className="h-5 w-5" /><Chevron dir="r" className="h-5 w-5 opacity-40" /><ShareIcon className="h-5 w-5" /><Book className="h-5 w-5" /><Tabs className="h-5 w-5" /></div>
      </div>
    </Screen>
  );
}

export function SafariShareMock() {
  return (
    <Screen>
      <div className="mock-fill">
        <div className="mock-skel w-3/4" /><div className="mock-skel w-1/2" /><div className="mock-skel w-2/3" />
      </div>
      <div className="mock-bar">
        <div className="mock-url"><Lock className="h-3.5 w-3.5 text-ink-3" /><span>pickupchecker.com</span></div>
        <div className="mock-toolbar"><Chevron dir="l" className="h-5 w-5" /><Chevron dir="r" className="h-5 w-5 opacity-40" /><Hl label="Share"><ShareIcon className="h-5 w-5 text-accent" /></Hl><Book className="h-5 w-5" /><Tabs className="h-5 w-5" /></div>
      </div>
    </Screen>
  );
}

export function ShareSheetMock() {
  const rows: [React.ReactNode, string, boolean?][] = [
    [<svg key="c" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>, "Copy"],
    [<svg key="r" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M8 12h8M12 8v8" /></svg>, "Add to Reading List"],
    [<Book key="b" className="h-4 w-4" />, "Add Bookmark"],
    [<svg key="f" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" /></svg>, "Add to Favorites"],
    [<PlusSquare key="h" className="h-4 w-4" />, "Add to Home Screen", true],
    [<svg key="m" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 20l4-1 10-10-3-3L5 16z" /></svg>, "Markup"],
  ];
  return (
    <Screen>
      <div className="mock-sheet">
        <div className="mock-sheet-head"><AppIcon size={28} /><div><div className="text-[11px] font-semibold leading-tight">PickupChecker</div><div className="text-[10px] text-ink-3">pickupchecker.com</div></div></div>
        <ul className="mock-list">
          {rows.map(([icon, label, hl]) => (
            <li key={label} className={hl ? "mock-row mock-row-hl" : "mock-row"}>
              <span>{label}</span>
              {hl ? <Hl><span className="text-accent">{icon}</span></Hl> : <span className="text-ink-2">{icon}</span>}
            </li>
          ))}
        </ul>
      </div>
    </Screen>
  );
}

export function AddDialogMock() {
  return (
    <Screen>
      <div className="mock-sheet mock-sheet-tall">
        <div className="mock-dialog-bar"><span className="text-accent-2">Cancel</span><span className="font-semibold">Add to Home Screen</span><Hl label="Add" below><span className="font-semibold text-accent">Add</span></Hl></div>
        <div className="mock-add-row"><AppIcon size={40} /><div className="min-w-0 flex-1"><div className="mock-field">PickupChecker</div><div className="truncate text-[10px] text-ink-3">https://pickupchecker.com/account</div></div></div>
        <p className="px-3 pt-2 text-[10px] leading-snug text-ink-3">An icon will be added to your Home Screen so you can quickly access this website.</p>
      </div>
    </Screen>
  );
}

export function HomeScreenMock() {
  const ghosts = ["#4a5568", "#3b5bdb", "#e8590c", "#2f9e44", "#862e9c", "#1098ad", "#c92a2a"];
  return (
    <Screen>
      <div className="mock-home">
        {ghosts.map((c, i) => <div key={i} className="mock-app"><span className="mock-app-icon" style={{ background: `linear-gradient(135deg, ${c}, ${c}99)` }} /><span className="mock-app-label" /></div>)}
        <div className="mock-app"><Hl><AppIcon size={38} /></Hl><span className="mock-app-name">PickupChecker</span></div>
      </div>
      <div className="mock-dock"><span /><span /><span /><span /></div>
    </Screen>
  );
}

export function IosPermissionMock() {
  return (
    <Screen>
      <div className="mock-fill mock-dim">
        <div className="mock-skel w-3/4" /><div className="mock-skel w-1/2" /><div className="mock-skel w-2/3" />
      </div>
      <div className="mock-alert">
        <div className="mock-alert-title">&ldquo;PickupChecker&rdquo; Would Like to Send You Notifications</div>
        <div className="mock-alert-text">Notifications may include alerts, sounds and icon badges. These can be configured in Settings.</div>
        <div className="mock-alert-buttons"><span>Don&rsquo;t Allow</span><Hl label="Allow" below><span className="font-semibold text-accent">Allow</span></Hl></div>
      </div>
    </Screen>
  );
}

/* ---------------------------------------------------------------- Android */

export function ChromeMenuMock() {
  return (
    <Screen>
      <div className="mock-chrome-bar"><div className="mock-url mock-url-top"><Lock className="h-3.5 w-3.5 text-ink-3" /><span>pickupchecker.com</span></div><Hl label="Menu" below><Dots className="h-5 w-5 text-accent" /></Hl></div>
      <div className="mock-fill"><div className="mock-skel w-3/4" /><div className="mock-skel w-1/2" /><div className="mock-skel w-2/3" /></div>
    </Screen>
  );
}

export function ChromeInstallMock() {
  const rows = ["New tab", "History", "Downloads", "Bookmarks", "Share…", "Add to Home screen", "Desktop site"];
  return (
    <Screen>
      <div className="mock-menu">
        {rows.map((r) => (
          <div key={r} className={r.startsWith("Add") ? "mock-row mock-row-hl" : "mock-row"}>
            <span>{r}</span>{r.startsWith("Add") && <Hl><PlusSquare className="h-4 w-4 text-accent" /></Hl>}
          </div>
        ))}
      </div>
    </Screen>
  );
}

export function AndroidPermissionMock() {
  return (
    <Screen>
      <div className="mock-fill mock-dim"><div className="mock-skel w-3/4" /><div className="mock-skel w-1/2" /><div className="mock-skel w-2/3" /></div>
      <div className="mock-alert mock-alert-android">
        <div className="mock-alert-title text-left">Allow PickupChecker to send you notifications?</div>
        <div className="mock-alert-buttons mock-alert-buttons-android"><span>Don&rsquo;t allow</span><Hl label="Allow" below><span className="font-semibold text-accent">Allow</span></Hl></div>
      </div>
    </Screen>
  );
}

/* ---------------------------------------------------------------- Desktop */

export function DesktopPermissionMock() {
  return (
    <Screen className="mock-wide">
      <div className="mock-chrome-bar"><div className="mock-url mock-url-top"><Lock className="h-3.5 w-3.5 text-ink-3" /><span>pickupchecker.com/account</span></div><Monitor className="h-4 w-4 text-ink-3" /></div>
      <div className="mock-popover">
        <div className="text-[11px] font-semibold">pickupchecker.com wants to</div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-2"><svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 17V11a6 6 0 1 1 12 0v6l1 2H5zM10 21h4" /></svg> Show notifications</div>
        <div className="mt-2 flex justify-end gap-2 text-[11px]"><span className="mock-btn">Block</span><Hl label="Allow" below><span className="mock-btn mock-btn-primary">Allow</span></Hl></div>
      </div>
      <div className="mock-fill"><div className="mock-skel w-3/4" /><div className="mock-skel w-1/2" /></div>
    </Screen>
  );
}

export function DesktopInstallMock() {
  return (
    <Screen className="mock-wide">
      <div className="mock-chrome-bar"><div className="mock-url mock-url-top"><Lock className="h-3.5 w-3.5 text-ink-3" /><span>pickupchecker.com</span></div><Hl label="Install" below><Monitor className="h-4 w-4 text-accent" /></Hl></div>
      <div className="mock-popover mock-popover-right">
        <div className="flex items-center gap-2"><AppIcon size={26} /><div><div className="text-[11px] font-semibold">Install PickupChecker</div><div className="text-[10px] text-ink-3">Opens in its own window</div></div></div>
        <div className="mt-2 flex justify-end gap-2 text-[11px]"><span className="mock-btn">Cancel</span><span className="mock-btn mock-btn-primary">Install</span></div>
      </div>
      <div className="mock-fill"><div className="mock-skel w-3/4" /><div className="mock-skel w-1/2" /></div>
    </Screen>
  );
}

/* ---------------------------------------------------------------- hero */

/** A lock-screen notification, as the alert actually looks on a phone. */
export function LockScreenMock() {
  return (
    <div aria-hidden className="mock-phone">
      <div className="mock-phone-screen">
        <div className="mock-notch" />
        <div className="mock-clock"><div className="text-[13px] font-medium text-ink-2">Thursday, October 29</div><div className="display mt-1 text-[64px] leading-none">9:41</div></div>
        <div className="mock-notif">
          <AppIcon size={36} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2"><span className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">PickupChecker</span><span className="text-[11px] text-ink-3">now</span></div>
            <div className="mt-0.5 text-[14px] font-semibold leading-snug">In stock: iPhone 18 Pro 256GB Black</div>
            <div className="text-[13px] leading-snug text-ink-2">Apple Fifth Avenue · New York, NY — Available Today. Tap to reserve on apple.com.</div>
          </div>
        </div>
        <div className="mock-notif mock-notif-faded">
          <span className="h-9 w-9 shrink-0 rounded-[22%] bg-ink/8" />
          <div className="min-w-0 flex-1"><div className="mock-skel w-1/3" /><div className="mock-skel w-3/4" /></div>
        </div>
        <div className="mock-notif mock-notif-faded mock-notif-fainter">
          <span className="h-9 w-9 shrink-0 rounded-[22%] bg-ink/8" />
          <div className="min-w-0 flex-1"><div className="mock-skel w-1/4" /><div className="mock-skel w-2/3" /></div>
        </div>
        <div className="mock-home-bar" />
      </div>
      <div className="mock-phone-glow" />
    </div>
  );
}
