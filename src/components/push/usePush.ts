"use client";
/**
 * One state machine for "can this device get notifications, and are they on?", shared by the
 * account card, the checkout page and the install guide.
 */
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  currentSubscription, detectPlatform, forgetSubscription, inAppBrowser, installPrompt, isStandalone, permissionState,
  pushSupported, subscribePush, syncSubscription, unsubscribePush,
} from "@/lib/push/client";
import type { Platform } from "@/lib/push/platform";
import { track } from "@/lib/track";

export type PushStatus =
  | "checking"
  | "in-app-browser" // Instagram/Facebook web view: nothing works until opened in the real browser
  | "needs-install" // iPhone/iPad in Safari: must be on the Home Screen first
  | "unsupported" // old browser
  | "needs-signin" // subscribed in the browser but no account to link it to
  | "denied" // permission blocked at the OS/browser level
  | "ready" // one tap away
  | "on"; // subscribed and stored for this account

export interface PushState {
  status: PushStatus;
  platform: Platform;
  standalone: boolean;
  signedIn: boolean | null;
  busy: boolean;
  error: string | null;
  notice: string | null;
  canInstall: boolean;
  turnOn(): Promise<void>;
  turnOff(): Promise<void>;
  sendTest(): Promise<void>;
  install(): Promise<void>;
}

const SYNC_KEY = "pc:push:synced";

export function usePush(vapidPublicKey: string): PushState {
  const { isLoaded, isSignedIn } = useAuth();
  const [status, setStatus] = useState<PushStatus>("checking");
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [standalone, setStandalone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const signedIn = isLoaded ? Boolean(isSignedIn) : null;

  const evaluate = useCallback(async () => {
    // First await up front: every state update below runs in a continuation, never synchronously
    // inside the effect that calls evaluate() (currentSubscription() is null where push is unsupported).
    const sub = await currentSubscription();
    const p = detectPlatform();
    const sa = isStandalone();
    setPlatform(p);
    setStandalone(sa);
    setCanInstall(Boolean(installPrompt()));
    if (inAppBrowser() && !sa) return setStatus("in-app-browser");
    if (p === "ios" && !sa) return setStatus("needs-install");
    if (!pushSupported()) return setStatus("unsupported");
    if (permissionState() === "denied") return setStatus("denied");
    if (!sub) return setStatus("ready");
    if (!isLoaded) return; // wait for Clerk, then re-run
    if (!isSignedIn) return setStatus("needs-signin");
    let synced = false;
    try { synced = localStorage.getItem(SYNC_KEY) === sub.endpoint; } catch { /* private mode */ }
    if (!synced) {
      const r = await syncSubscription(sub);
      if (r.status === 401) return setStatus("needs-signin");
      if (!r.ok) { setError("Could not save this device — try again"); return setStatus("ready"); }
      try { localStorage.setItem(SYNC_KEY, sub.endpoint); } catch { /* ignore */ }
    }
    setStatus("on");
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    // Deferred so hydration finishes first; evaluate() only touches state asynchronously anyway.
    const t = window.setTimeout(() => { void evaluate(); }, 0);
    return () => window.clearTimeout(t);
  }, [evaluate]);
  useEffect(() => {
    const onPrompt = () => setCanInstall(true);
    const onInstalled = () => { setCanInstall(false); void evaluate(); };
    window.addEventListener("pc:installprompt", onPrompt);
    window.addEventListener("pc:installed", onInstalled);
    const vis = () => { if (document.visibilityState === "visible") void evaluate(); };
    document.addEventListener("visibilitychange", vis);
    return () => { window.removeEventListener("pc:installprompt", onPrompt); window.removeEventListener("pc:installed", onInstalled); document.removeEventListener("visibilitychange", vis); };
  }, [evaluate]);

  const turnOn = useCallback(async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      if (!vapidPublicKey) throw new Error("Notifications are not configured yet");
      const sub = await subscribePush(vapidPublicKey);
      const r = await syncSubscription(sub);
      if (r.status === 401) { setStatus("needs-signin"); return; }
      if (!r.ok) throw new Error("Could not save this device");
      try { localStorage.setItem(SYNC_KEY, sub.endpoint); } catch { /* ignore */ }
      track("push_enabled", { platform: detectPlatform(), standalone: isStandalone() });
      setStatus("on");
      setNotice("Notifications are on for this device.");
    } catch (e) {
      const name = (e as { name?: string }).name;
      if (name === "NotAllowedError" || permissionState() === "denied") setStatus("denied");
      else setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }, [vapidPublicKey]);

  const turnOff = useCallback(async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      const endpoint = await unsubscribePush();
      if (endpoint) await forgetSubscription(endpoint);
      try { localStorage.removeItem(SYNC_KEY); } catch { /* ignore */ }
      track("push_disabled");
      setStatus("ready");
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }, []);

  const sendTest = useCallback(async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const j = (await res.json().catch(() => ({}))) as { sent?: number; failed?: number; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Could not send a test");
      setNotice(j.sent ? `Test sent to ${j.sent} device${j.sent === 1 ? "" : "s"} — it should appear in a moment.` : "No device received the test. Turn notifications off and on again.");
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }, []);

  const install = useCallback(async () => {
    const p = installPrompt();
    if (!p) return;
    setBusy(true);
    try { await p.prompt(); const c = await p.userChoice; if (c.outcome === "accepted") track("pwa_installed"); window.__pcInstallPrompt = null; setCanInstall(false); }
    catch { /* dismissed */ }
    finally { setBusy(false); }
  }, []);

  return { status, platform, standalone, signedIn, busy, error, notice, canInstall, turnOn, turnOff, sendTest, install };
}
