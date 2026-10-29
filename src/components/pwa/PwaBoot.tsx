"use client";
/**
 * Registers the service worker on every page (so a Home Screen install is ready for push) and
 * parks Chrome's install prompt on window for the install guide's "Install" button.
 */
import { useEffect } from "react";
import { registerSw, type InstallPromptEvent } from "@/lib/push/client";

export function PwaBoot() {
  useEffect(() => {
    void registerSw();
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
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}
