"use client";
/**
 * "Phone notifications" card: tells the user exactly where they are (installed? signed in?
 * allowed?) and offers the one action that moves them forward. `account` is what the server knows:
 * when another device (or the Home Screen app, while this is Safari) already gets the alerts, the
 * card says so instead of walking the user through a setup they already did.
 */
import { Fragment, type ReactNode } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { useAppLocale, useT } from "@/components/i18n/LangProvider";
import type { DeviceSummary } from "@/lib/devices";
import { signInHome } from "@/lib/i18n/locales";
import { usePush, type PushState } from "./usePush";

type T = ReturnType<typeof useT>["account"]["push"];

/**
 * A dictionary string whose **bold** runs are plain <b> (no class: the card's and the install guide's own markup)
 * and whose "{name}" placeholders take strings or nodes.
 */
export function B({ text, vars = {} }: { text: string; vars?: Record<string, ReactNode> }) {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\{(\w+)\}/g;
  let last = 0;
  let k = 0;
  for (let m: RegExpExecArray | null; (m = re.exec(text)); last = m.index + m[0].length) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(m[1] != null ? <b key={k++}><B text={m[1]} vars={vars} /></b> : <Fragment key={k++}>{m[2] in vars ? vars[m[2]] : m[0]}</Fragment>);
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

export function PushSetup({ vapidPublicKey, title, compact = false, account }: { vapidPublicKey: string; title?: string; compact?: boolean; account?: DeviceSummary | null }) {
  const p = usePush(vapidPublicKey);
  const d = useT().account.push;
  // This browser is not (or cannot be) the one getting alerts, but the account already has one that is.
  const elsewhere = account?.active ? account.label : null;
  const onElsewhere = Boolean(elsewhere) && p.status !== "on" && p.status !== "checking" && p.status !== "needs-signin";
  return (
    <section className={compact ? "pane-2 p-5" : "pane p-5 sm:p-6"} aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className={compact ? "text-lg font-semibold" : "text-xl font-semibold"}>{title ?? d.title}</h2>
            <StatusPill status={onElsewhere ? "on" : p.status} d={d} />
          </div>
          <p className="mt-1 max-w-xl text-sm text-ink-2">{onElsewhere ? <Elsewhere p={p} label={elsewhere!} d={d} /> : <Explain p={p} d={d} />}</p>
        </div>
        {onElsewhere ? <ElsewhereActions p={p} d={d} /> : <Actions p={p} d={d} />}
      </div>
      {p.status === "needs-install" && !onElsewhere && <IosMiniSteps d={d} />}
      {p.notice && <p className="mt-3 text-sm text-accent">{p.notice}</p>}
      {p.error && <p role="alert" className="mt-3 text-sm text-bad">{p.error}</p>}
    </section>
  );
}

/** Shows a sample banner straight from the service worker (no server round trip): proves the OS popup itself works. */
async function previewLocally(sample: T["preview"]) {
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(sample.title, { body: sample.body, icon: "/icons/icon-192.png", badge: "/icons/badge-96.png", tag: "preview", data: { url: "/account", kind: "test" } });
  } catch {
    /* unsupported: the server test still tells the truth */
  }
}

function StatusPill({ status, d }: { status: PushState["status"]; d: T }) {
  const map: Record<PushState["status"], string> = {
    checking: "bg-ink/6 text-ink-3",
    "in-app-browser": "bg-warn/15 text-warn",
    "needs-install": "bg-warn/15 text-warn",
    unsupported: "bg-ink/6 text-ink-3",
    "needs-signin": "bg-warn/15 text-warn",
    denied: "bg-bad/15 text-bad",
    ready: "bg-ink/6 text-ink-2",
    on: "bg-accent/15 text-accent",
  };
  const label = d.pill[status], cls = map[status];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}

function Explain({ p, d }: { p: PushState; d: T }) {
  const e = d.explain;
  switch (p.status) {
    case "checking": return <>{e.checking}</>;
    case "in-app-browser": return <B text={e.inAppBrowser} />;
    case "needs-install": return <>{e.needsInstall}</>;
    case "unsupported": return <>{e.unsupported}</>;
    case "needs-signin": return <>{e.needsSignin}</>;
    case "denied": return <B text={p.platform === "ios" ? e.deniedIos : e.denied} />;
    // "Off" must read as off: "you're in the app, restocks land here in seconds" over an Off pill left a paying
    // user believing they were set while no alert reached a device (FlowGlance, 2026-11-02). Alerts are push only.
    case "ready": return <B text={p.platform === "ios" ? e.readyIos : p.standalone ? e.readyDevice : e.readyBrowser} />;
    case "on": return <>{e.on}</>;
  }
}

function Elsewhere({ p, label, d }: { p: PushState; label: string; d: T }) {
  const e = d.elsewhere;
  const text = p.status === "needs-install" ? e.needsInstall : p.status === "ready" ? e.ready : p.status === "denied" ? e.denied : e.other;
  return <B text={text} vars={{ label }} />;
}

/** A test reaches every device on the account, so it works from a browser that is not one of them. */
function ElsewhereActions({ p, d }: { p: PushState; d: T }) {
  const spin = p.busy ? <span className="spinner" /> : null;
  // This device can be added (in the Home Screen app, or a desktop browser): that is the next step.
  const add = p.status === "ready";
  return (
    <div className="flex flex-wrap gap-2">
      {add && <button type="button" className="btn btn-primary btn-sm" disabled={p.busy || !p.signedIn} onClick={() => void p.turnOn()}>{spin}{d.turnOnToo}</button>}
      <button type="button" className={`btn btn-sm ${add ? "btn-ghost" : "btn-primary"}`} disabled={p.busy} onClick={() => void p.sendTest()}>{add ? null : spin}{d.sendTest}</button>
    </div>
  );
}

function Actions({ p, d }: { p: PushState; d: T }) {
  const spin = p.busy ? <span className="spinner" /> : null;
  // Sign-in happens on the home page of the person's language ("/" in English).
  const home = signInHome(useAppLocale() ?? undefined);
  switch (p.status) {
    case "needs-install":
      return <Link href="/install" className="btn btn-primary btn-sm">{d.showMeHow}</Link>;
    case "needs-signin":
      return <a href={`${home}?signin=1&next=${encodeURIComponent(typeof window === "undefined" ? "/account" : window.location.pathname)}`} className="btn btn-primary btn-sm">{d.signIn}</a>;
    case "ready":
      return (
        <div className="flex flex-wrap gap-2">
          {p.canInstall && <button type="button" className="btn btn-ghost btn-sm" disabled={p.busy} onClick={() => void p.install()}>{d.installApp}</button>}
          <button type="button" className="btn btn-primary btn-sm" disabled={p.busy || !p.signedIn} onClick={() => void p.turnOn()}>{spin}{d.turnOn}</button>
        </div>
      );
    case "on":
      return (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary btn-sm" disabled={p.busy} onClick={() => void p.sendTest()}>{spin}{d.sendTest}</button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={p.busy} onClick={() => void previewLocally(d.preview)}>{d.previewHere}</button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={p.busy} onClick={() => void p.turnOff()}>{d.turnOff}</button>
        </div>
      );
    case "denied":
    case "in-app-browser":
    case "unsupported":
      return <Link href="/install" className="btn btn-ghost btn-sm">{d.setupGuide}</Link>;
    default:
      return null;
  }
}

function IosMiniSteps({ d }: { d: T }) {
  const [share, add, open] = d.miniSteps;
  const steps: [string, React.ReactNode][] = [
    [share, <svg key="1" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="M8 7l4-4 4 4" /><path d="M6 11v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8" /></svg>],
    [add, <svg key="2" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><path d="M12 8v8M8 12h8" /></svg>],
    [open, <svg key="3" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 17V11a6 6 0 1 1 12 0v6l1 2H5zM10 21h4" /></svg>],
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
