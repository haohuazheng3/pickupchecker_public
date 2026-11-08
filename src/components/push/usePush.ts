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
import { useApiError } from "@/components/i18n/useApiError";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  clearSyncRecord, currentSubscription, detectPlatform, fetchVapidKey, forgetSubscription, inAppBrowser, installPrompt, isStandalone,
  permissionState, pushSupported, reconcileSubscription, repairSubscription, requestPermission, resolveConflict, subscribePush,
  syncSubscription, unsubscribePush, SW_UNAVAILABLE,
} from "@/lib/push/client";
import type { Platform } from "@/lib/push/platform";
import { track } from "@/lib/track";
import { useLang, useT } from "@/components/i18n/LangProvider";
import { LANG_TAG, fill, justNow, list, plural } from "@/lib/i18n/format";
import type { Lang } from "@/lib/i18n/locales";

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

type T = ReturnType<typeof useT>["account"]["push"];

/** Seconds the server waits before an iPhone test: enough to swipe home or lock the phone. */
export const IOS_TEST_DELAY_SEC = 5;

function describeTest(j: TestResponse, d: T["test"], lang: Lang): string {
  const ok = (j.devices ?? []).filter((x) => x.ok).map((x) => x.device);
  const bad = (j.devices ?? []).filter((x) => !x.ok);
  // English: the reader's own clock format, as always; another language: its own.
  const when = j.sentAt ? new Date(j.sentAt).toLocaleTimeString(lang === "en" ? [] : LANG_TAG[lang], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : justNow(lang);
  if (!j.sent) {
    if (bad.some((x) => x.disabled)) return d.gone;
    return fill(d.none, { error: bad[0]?.error ? fill(d.noneError, { error: bad[0].error }) : "" });
  }
  const where = ok.length === 1 ? fill(d.one, { device: ok[0] }) : fill(d.many, { n: ok.length, list: lang === "en" ? ok.join(", ") : list(lang, ok, ok.length) });
  const failed = bad.length ? ` ${fill(plural(lang, bad.length, d.failed), { n: bad.length })}` : "";
  return fill(d.sent, { when, where, failed });
}

/** An error to show: ours are already in the reader's language; the push client's own one is translated here. */
function message(e: unknown, d: T): string {
  const m = e instanceof Error ? e.message : String(e);
  return m === SW_UNAVAILABLE ? d.errors.noServiceWorker : m;
}

export function usePush(vapidPublicKey: string): PushState {
  const tErr = useApiError();
  const { isLoaded, isSignedIn } = useAuth();
  const d = useT().account.push;
  const lang = useLang();
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
    if (outcome === "error") { setError(d.errors.notSaved); return setStatus("ready"); }
    setStatus("on");
  }, [isLoaded, isSignedIn, vapidPublicKey, d]);

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
      if (!key) throw new Error(d.errors.notConfigured);
      const perm = await permission;
      if (perm === "denied") { setStatus("denied"); return; }
      if (perm !== "granted") throw new Error(d.errors.allow);
      let sub = await subscribePush(key);
      let r = await syncSubscription(sub);
      if (r.status === 409) {
        // Linked to another account on this phone: mint a fresh endpoint for this one.
        const fixed = await resolveConflict(key);
        if (fixed) { sub = fixed.sub; r = fixed.result; }
      }
      if (r.status === 401) { setStatus("needs-signin"); return; }
      if (!r.ok) throw new Error(d.errors.notSavedPlain);
      track("push_enabled", { platform: detectPlatform(), standalone: isStandalone() });
      setStatus("on");
      setNotice(d.onNotice);
    } catch (e) {
      const name = (e as { name?: string }).name;
      if (name === "NotAllowedError" || permissionState() === "denied") setStatus("denied");
      else setError(message(e, d));
    } finally { setBusy(false); }
  }, [vapidPublicKey, d]);

  const turnOff = useCallback(async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      const endpoint = await unsubscribePush();
      if (endpoint) await forgetSubscription(endpoint);
      clearSyncRecord();
      track("push_disabled");
      setStatus("ready");
    } catch (e) { setError(message(e, d)); }
    finally { setBusy(false); }
  }, [d]);

  const sendTest = useCallback(async () => {
    // iPhone draws no banner while this app is in front: the server waits IOS_TEST_DELAY_SEC so there is time to
    // go to the Home Screen or lock the phone, and the result says where to look if no banner showed.
    const ios = detectPlatform() === "ios";
    const delaySec = ios ? IOS_TEST_DELAY_SEC : 0;
    setBusy(true); setError(null); setNotice(delaySec ? fill(d.test.soon, { s: delaySec }) : null);
    try {
      const res = await fetch("/api/push/test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ delaySec }) });
      const j = (await res.json().catch(() => ({}))) as TestResponse;
      if (!res.ok) throw new Error((j.error ? tErr(j.error) : undefined) ?? d.errors.noTest);
      setNotice(describeTest(j, d.test, lang) + (ios && j.sent ? ` ${d.test.iosHint}` : ""));
      if (!j.sent) void evaluate();
    } catch (e) {
      // A request cut off while the app sat in the background still reached the server, which sent the test.
      if (delaySec && e instanceof TypeError) setNotice(d.test.away);
      else setError(message(e, d));
    }
    finally { setBusy(false); }
  }, [evaluate, d, lang, tErr]);

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
