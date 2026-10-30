"use client";
/**
 * "Phone notifications" card: tells the user exactly where they are (installed? signed in?
 * allowed?) and offers the one action that moves them forward. `account` is what the server knows:
 * when another device (or the Home Screen app, while this is Safari) already gets the alerts, the
 * card says so instead of walking the user through a setup they already did.
 */
import { PendingLink as Link } from "@/components/ui/PendingLink";
import type { DeviceSummary } from "@/lib/devices";
import { usePush, type PushState } from "./usePush";

export function PushSetup({ vapidPublicKey, title = "Phone notifications", compact = false, account }: { vapidPublicKey: string; title?: string; compact?: boolean; account?: DeviceSummary | null }) {
  const p = usePush(vapidPublicKey);
  // This browser is not (or cannot be) the one getting alerts, but the account already has one that is.
  const elsewhere = account?.active ? account.label : null;
  const onElsewhere = Boolean(elsewhere) && p.status !== "on" && p.status !== "checking" && p.status !== "needs-signin";
  return (
    <section className={compact ? "pane-2 p-5" : "pane p-5 sm:p-6"} aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className={compact ? "text-lg font-semibold" : "text-xl font-semibold"}>{title}</h2>
            <StatusPill status={onElsewhere ? "on" : p.status} />
          </div>
          <p className="mt-1 max-w-xl text-sm text-ink-2">{onElsewhere ? <Elsewhere p={p} label={elsewhere!} /> : <Explain p={p} />}</p>
        </div>
        {onElsewhere ? <ElsewhereActions p={p} /> : <Actions p={p} />}
      </div>
      {p.status === "needs-install" && !onElsewhere && <IosMiniSteps />}
      {p.notice && <p className="mt-3 text-sm text-accent">{p.notice}</p>}
      {p.error && <p role="alert" className="mt-3 text-sm text-bad">{p.error}</p>}
    </section>
  );
}

/** Shows a sample banner straight from the service worker (no server round trip): proves the OS popup itself works. */
async function previewLocally() {
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification("In stock: iPhone Duo 256GB Black", { body: "Apple Fifth Avenue · New York, NY — Available Today. Tap to reserve on apple.com.", icon: "/icons/icon-192.png", badge: "/icons/badge-96.png", tag: "preview", data: { url: "/account", kind: "test" } });
  } catch {
    /* unsupported: the server test still tells the truth */
  }
}

function StatusPill({ status }: { status: PushState["status"] }) {
  const map: Record<PushState["status"], [string, string]> = {
    checking: ["Checking…", "bg-ink/6 text-ink-3"],
    "in-app-browser": ["Open in Safari", "bg-warn/15 text-warn"],
    "needs-install": ["Not installed", "bg-warn/15 text-warn"],
    unsupported: ["Unsupported", "bg-ink/6 text-ink-3"],
    "needs-signin": ["Sign in", "bg-warn/15 text-warn"],
    denied: ["Blocked", "bg-bad/15 text-bad"],
    ready: ["Off", "bg-ink/6 text-ink-2"],
    on: ["On", "bg-accent/15 text-accent"],
  };
  const [label, cls] = map[status];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}

function Explain({ p }: { p: PushState }) {
  switch (p.status) {
    case "checking": return <>Checking this device…</>;
    case "in-app-browser": return <>Tap ··· and choose <b>Open in Safari</b> (or Chrome).</>;
    case "needs-install": return <>On iPhone and iPad, notifications only work from the Home Screen app.</>;
    case "unsupported": return <>This browser can&apos;t receive notifications, so alerts go to your email.</>;
    case "needs-signin": return <>Sign in on this device to turn on notifications.</>;
    case "denied": return <>{p.platform === "ios" ? <>Allow in <b>Settings → Notifications → PickupChecker</b>,</> : <>Allow in your browser&apos;s site settings,</>} then reload.</>;
    case "ready": return <>{p.standalone ? "You're in the app. " : ""}Matching restocks land on this device in seconds.</>;
    case "on": return <>Restocks arrive here in seconds, even with the app closed.</>;
  }
}

function Elsewhere({ p, label }: { p: PushState; label: string }) {
  switch (p.status) {
    case "needs-install": return <>Alerts go to your {label}. Safari can&apos;t show them on iPhone; the Home Screen app does.</>;
    case "ready": return <>Alerts go to your {label}. Turn them on here to get them on this device too.</>;
    case "denied": return <>Alerts go to your {label}. Notifications are blocked in this browser.</>;
    default: return <>Alerts go to your {label}.</>;
  }
}

/** A test reaches every device on the account, so it works from a browser that is not one of them. */
function ElsewhereActions({ p }: { p: PushState }) {
  const spin = p.busy ? <span className="spinner" /> : null;
  // This device can be added (in the Home Screen app, or a desktop browser): that is the next step.
  const add = p.status === "ready";
  return (
    <div className="flex flex-wrap gap-2">
      {add && <button type="button" className="btn btn-primary btn-sm" disabled={p.busy || !p.signedIn} onClick={() => void p.turnOn()}>{spin}Turn on here too</button>}
      <button type="button" className={`btn btn-sm ${add ? "btn-ghost" : "btn-primary"}`} disabled={p.busy} onClick={() => void p.sendTest()}>{add ? null : spin}Send a test</button>
    </div>
  );
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
          <button type="button" className="btn btn-primary btn-sm" disabled={p.busy} onClick={() => void p.sendTest()}>{spin}Send a test</button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={p.busy} onClick={() => void previewLocally()}>Preview here</button>
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
        <li key={t} className="flex items-center gap-3 rounded-2xl border border-line bg-ink/4 px-3 py-2.5 text-sm">
          <span className="step-num shrink-0">{i + 1}</span>
          <span className="text-accent">{icon}</span>
          <span>{t}</span>
        </li>
      ))}
    </ol>
  );
}
