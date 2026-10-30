"use client";
/**
 * One state machine for "can this device get notifications, and are they on?", shared by the
 * account card, the checkout page and the install guide.
 *
 * Self-healing on every evaluate (page load, tab becomes visible, app comes to the foreground):
 *  - permission granted but no subscription → subscribe again silently (storage cleared, app re-added)
 *  - subscription made with a rotated VAPID key or about to expire → replaced
 *  - server does not know this endpoint, or disabled it after a 410 → re-POSTed
 *  - last POST more than a day ago → re-POSTed so last_seen_at stays fresh
 */
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  clearSyncRecord, currentSubscription, detectPlatform, fetchVapidKey, forgetSubscription, inAppBrowser, installPrompt, isStandalone,
  permissionState, pushSupported, reconcileSubscription, repairSubscription, requestPermission, resolveConflict, subscribePush,
  syncSubscription, unsubscribePush,
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

interface TestResponse {
  sent?: number;
  failed?: number;
  disabled?: number;
  sentAt?: string;
  devices?: { device: string; ok: boolean; disabled?: boolean; error?: string | null }[];
  error?: string;
}

function describeTest(j: TestResponse): string {
  const ok = (j.devices ?? []).filter((d) => d.ok).map((d) => d.device);
  const bad = (j.devices ?? []).filter((d) => !d.ok);
  const when = j.sentAt ? new Date(j.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "just now";
  if (!j.sent) {
    if (bad.some((d) => d.disabled)) return "The push service says this device's subscription is gone. Turn notifications off and on again on that device.";
    return `No device received the test${bad[0]?.error ? ` (${bad[0].error})` : ""}. Turn notifications off and on again.`;
  }
  const where = ok.length === 1 ? `your ${ok[0]}` : `${ok.length} devices (${ok.join(", ")})`;
  const tail = bad.length ? ` ${bad.length} device${bad.length === 1 ? "" : "s"} failed.` : "";
  return `Test sent at ${when} to ${where} — it should pop up within a few seconds; the banner names the device and the time.${tail}`;
}

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
    let sub = await currentSubscription();
    const p = detectPlatform();
    const sa = isStandalone();
    setPlatform(p);
    setStandalone(sa);
    setCanInstall(Boolean(installPrompt()));
    if (inAppBrowser() && !sa) return setStatus("in-app-browser");
    if (p === "ios" && !sa) return setStatus("needs-install");
    if (!pushSupported()) return setStatus("unsupported");
    if (permissionState() === "denied") return setStatus("denied");
    if (!isLoaded) return; // wait for Clerk, then re-run
    if (isSignedIn && permissionState() === "granted") {
      // No subscription although permission is granted (storage cleared, app re-added), or one made
      // with an old key / about to expire: repair without asking for a tap.
      const repaired = await repairSubscription(vapidPublicKey);
      if (repaired) sub = repaired;
    }
    if (!sub) return setStatus("ready");
    if (!isSignedIn) return setStatus("needs-signin");
    let outcome = await reconcileSubscription(sub, { probe: true });
    if (outcome === "conflict") {
      const fixed = await resolveConflict(vapidPublicKey).catch(() => null);
      outcome = fixed?.result.ok ? "synced" : "error";
    }
    if (outcome === "needs-signin") return setStatus("needs-signin");
    if (outcome === "error") { setError("Could not save this device — try again"); return setStatus("ready"); }
    setStatus("on");
  }, [isLoaded, isSignedIn, vapidPublicKey]);

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
    // The permission prompt must be requested synchronously inside the tap (iOS drops it after the
    // first await), so it goes first; the service worker and the key are awaited afterwards.
    const permission = pushSupported() ? requestPermission() : Promise.resolve<NotificationPermission>("denied");
    try {
      const key = vapidPublicKey || (await fetchVapidKey());
      if (!key) throw new Error("Notifications are not configured yet");
      const perm = await permission;
      if (perm === "denied") { setStatus("denied"); return; }
      if (perm !== "granted") throw new Error("Allow notifications to continue");
      let sub = await subscribePush(key);
      let r = await syncSubscription(sub);
      if (r.status === 409) {
        // Linked to another account on this phone: mint a fresh endpoint for this one.
        const fixed = await resolveConflict(key);
        if (fixed) { sub = fixed.sub; r = fixed.result; }
      }
      if (r.status === 401) { setStatus("needs-signin"); return; }
      if (!r.ok) throw new Error("Could not save this device");
      track("push_enabled", { platform: detectPlatform(), standalone: isStandalone() });
      setStatus("on");
      setNotice("Notifications are on for this device. Send a test to see one land.");
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
      clearSyncRecord();
      track("push_disabled");
      setStatus("ready");
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }, []);

  const sendTest = useCallback(async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const j = (await res.json().catch(() => ({}))) as TestResponse;
      if (!res.ok) throw new Error(j.error ?? "Could not send a test");
      setNotice(describeTest(j));
      if (!j.sent) void evaluate();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }, [evaluate]);

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
