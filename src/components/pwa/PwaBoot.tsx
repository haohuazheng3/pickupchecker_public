"use client";
/**
 * Runs on every page:
 *  - registers the service worker (so a Home Screen install is ready for push) and checks for a
 *    newer sw.js on each load and each return to the foreground;
 *  - when notifications are already allowed, keeps the subscription alive without any tap: re-subscribes
 *    if the browser lost it or the VAPID key rotated, and re-POSTs it once a day so the server's
 *    last_seen_at stays fresh (the account page does the stricter server probe);
 *  - parks Chrome's install prompt on window for the install guide's "Install" button;
 *  - follows `navigate` messages from the service worker (a notification tap on a client that
 *    cannot be navigated from the worker).
 */
import { useEffect } from "react";
import { fetchVapidKey, permissionState, reconcileSubscription, registerSw, repairSubscription, type InstallPromptEvent } from "@/lib/push/client";

const MAINTAIN_EVERY_MS = 30_000;

export function PwaBoot() {
  useEffect(() => {
    let lastRun = 0;
    let disposed = false;
    const maintain = async () => {
      if (Date.now() - lastRun < MAINTAIN_EVERY_MS) return;
      lastRun = Date.now();
      const reg = await registerSw();
      if (!reg || disposed) return;
      reg.update().catch(() => undefined);
      if (permissionState() !== "granted") return;
      const key = await fetchVapidKey();
      if (!key || disposed) return;
      // repairSubscription returns the existing subscription when it is healthy, a new one otherwise.
      const sub = await repairSubscription(key);
      if (!sub || disposed) return;
      await reconcileSubscription(sub).catch(() => undefined);
    };
    const t = window.setTimeout(() => { void maintain(); }, 0);
    const onVisible = () => { if (document.visibilityState === "visible") void maintain(); };
    document.addEventListener("visibilitychange", onVisible);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      window.__pcInstallPrompt = e as InstallPromptEvent;
      window.dispatchEvent(new Event("pc:installprompt"));
    };
    const onInstalled = () => {
      window.__pcInstallPrompt = null;
      window.dispatchEvent(new Event("pc:installed"));
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const onMessage = (e: MessageEvent) => {
      const data = e.data as { type?: string; url?: string } | null;
      if (data?.type === "navigate" && typeof data.url === "string") {
        try {
          const target = new URL(data.url, window.location.origin);
          if (target.origin === window.location.origin) window.location.assign(target.href);
        } catch { /* ignore malformed */ }
      }
    };
    if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", onMessage);

    return () => {
      disposed = true;
      window.clearTimeout(t);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if ("serviceWorker" in navigator) navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, []);
  return null;
}
