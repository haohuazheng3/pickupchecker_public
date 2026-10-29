"use client";
/**
 * "Phone notifications" card: tells the user exactly where they are (installed? signed in?
 * allowed?) and offers the one action that moves them forward.
 */
import Link from "next/link";
import { usePush, type PushState } from "./usePush";

export function PushSetup({ vapidPublicKey, title = "Phone notifications", compact = false }: { vapidPublicKey: string; title?: string; compact?: boolean }) {
  const p = usePush(vapidPublicKey);
  return (
    <section className={compact ? "pane-2 p-5" : "pane p-5 sm:p-6"} aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className={compact ? "text-lg font-semibold" : "text-xl font-semibold"}>{title}</h2>
            <StatusPill status={p.status} />
          </div>
          <p className="mt-1 max-w-xl text-sm text-ink-2"><Explain p={p} /></p>
        </div>
        <Actions p={p} />
      </div>
      {p.status === "needs-install" && <IosMiniSteps />}
      {p.notice && <p className="mt-3 text-sm text-accent">{p.notice}</p>}
      {p.error && <p role="alert" className="mt-3 text-sm text-bad">{p.error}</p>}
    </section>
  );
}

function StatusPill({ status }: { status: PushState["status"] }) {
  const map: Record<PushState["status"], [string, string]> = {
    checking: ["Checking…", "bg-white/8 text-ink-3"],
    "in-app-browser": ["Open in Safari", "bg-warn/15 text-warn"],
    "needs-install": ["Not installed", "bg-warn/15 text-warn"],
    unsupported: ["Unsupported", "bg-white/8 text-ink-3"],
    "needs-signin": ["Sign in", "bg-warn/15 text-warn"],
    denied: ["Blocked", "bg-bad/15 text-bad"],
    ready: ["Off", "bg-white/8 text-ink-2"],
    on: ["On", "bg-accent/15 text-accent"],
  };
  const [label, cls] = map[status];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}

function Explain({ p }: { p: PushState }) {
  switch (p.status) {
    case "checking": return <>Looking at this device…</>;
    case "in-app-browser": return <>This page is open inside another app. Tap the ··· menu and choose <b>Open in Safari</b> (or Chrome), then come back here.</>;
    case "needs-install": return <>On iPhone and iPad, notifications only work from the Home Screen app. Add PickupChecker to your Home Screen, open it from there and tap <b>Turn on notifications</b>. Takes 20 seconds.</>;
    case "unsupported": return <>This browser can&apos;t receive push notifications. Use Safari on iPhone (as a Home Screen app), Chrome on Android, or Chrome, Edge or Safari on a computer. Until then you&apos;ll get alerts by email.</>;
    case "needs-signin": return <>Sign in on this device to link its notifications to your alerts.</>;
    case "denied": return <>Notifications are blocked for PickupChecker. {p.platform === "ios" ? <>Open <b>Settings → Notifications → PickupChecker</b> and allow them,</> : <>Allow them in your browser&apos;s site settings for pickupchecker.com,</>} then reload this page.</>;
    case "ready": return <>{p.standalone ? "You're in the app. " : ""}One tap and every restock that matches your alerts lands on this device within seconds. No email to open.</>;
    case "on": return <>Restocks that match your alerts arrive here within seconds. Add more devices by opening PickupChecker on them.</>;
  }
}

function Actions({ p }: { p: PushState }) {
  const spin = p.busy ? <span className="spinner" /> : null;
  switch (p.status) {
    case "needs-install":
      return <Link href="/install" className="btn btn-primary btn-sm">Show me how</Link>;
    case "needs-signin":
      return <a href={`/?signin=1&next=${encodeURIComponent(typeof window === "undefined" ? "/account" : window.location.pathname)}`} className="btn btn-primary btn-sm">Sign in</a>;
    case "ready":
      return (
        <div className="flex flex-wrap gap-2">
          {p.canInstall && <button type="button" className="btn btn-ghost btn-sm" disabled={p.busy} onClick={() => void p.install()}>Install app</button>}
          <button type="button" className="btn btn-primary btn-sm" disabled={p.busy || !p.signedIn} onClick={() => void p.turnOn()}>{spin}Turn on notifications</button>
        </div>
      );
    case "on":
      return (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost btn-sm" disabled={p.busy} onClick={() => void p.sendTest()}>{spin}Send a test</button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={p.busy} onClick={() => void p.turnOff()}>Turn off</button>
        </div>
      );
    case "denied":
    case "in-app-browser":
    case "unsupported":
      return <Link href="/install" className="btn btn-ghost btn-sm">Setup guide</Link>;
    default:
      return null;
  }
}

function IosMiniSteps() {
  const steps: [string, React.ReactNode][] = [
    ["Tap Share in Safari", <svg key="1" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="M8 7l4-4 4 4" /><path d="M6 11v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8" /></svg>],
    ["Add to Home Screen", <svg key="2" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><path d="M12 8v8M8 12h8" /></svg>],
    ["Open it, allow notifications", <svg key="3" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 17V11a6 6 0 1 1 12 0v6l1 2H5zM10 21h4" /></svg>],
  ];
  return (
    <ol className="mt-4 grid gap-2 sm:grid-cols-3">
      {steps.map(([t, icon], i) => (
        <li key={t} className="flex items-center gap-3 rounded-2xl border border-line bg-white/4 px-3 py-2.5 text-sm">
          <span className="step-num shrink-0">{i + 1}</span>
          <span className="text-accent">{icon}</span>
          <span>{t}</span>
        </li>
      ))}
    </ol>
  );
}
