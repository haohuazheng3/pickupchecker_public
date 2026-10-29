"use client";
/**
 * Browser side of Web Push. Everything that touches navigator/window lives here so the UI
 * components stay small and the pure helpers (platform.ts, payload.ts) stay testable.
 */
import { urlBase64ToBytes } from "./payload";
import { platformFromUA, isInAppBrowser, type Platform } from "./platform";

export const SW_URL = "/sw.js";

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.("(display-mode: standalone)").matches || window.matchMedia?.("(display-mode: fullscreen)").matches || nav.standalone === true;
}

export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  return platformFromUA(navigator.userAgent, { maxTouchPoints: navigator.maxTouchPoints });
}

export function inAppBrowser(): boolean {
  return typeof navigator !== "undefined" && isInAppBrowser(navigator.userAgent);
}

/** The APIs exist (Safari exposes them only inside an installed Home Screen app). */
export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function permissionState(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function registerSw(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    await navigator.serviceWorker.register(SW_URL, { scope: "/" });
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await registerSw();
  if (!reg) return null;
  try {
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/** Must run inside a user gesture (tap): it prompts for permission when needed. */
export async function subscribePush(vapidPublicKey: string): Promise<PushSubscription> {
  const reg = await registerSw();
  if (!reg) throw new Error("Service worker unavailable");
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  // Uint8Array is a BufferSource; the copy keeps TypeScript's ArrayBufferLike variance happy.
  const key = urlBase64ToBytes(vapidPublicKey);
  const applicationServerKey = new Uint8Array(key).buffer as ArrayBuffer;
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
}

export async function unsubscribePush(): Promise<string | null> {
  const sub = await currentSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  try {
    await sub.unsubscribe();
  } catch {
    /* the server row is removed anyway */
  }
  return endpoint;
}

export interface DeviceInfo {
  platform: Platform;
  standalone: boolean;
  userAgent: string;
}

export function deviceInfo(): DeviceInfo {
  return { platform: detectPlatform(), standalone: isStandalone(), userAgent: typeof navigator === "undefined" ? "" : navigator.userAgent.slice(0, 300) };
}

/** Stores the subscription for the signed-in user. 401 = sign in first. */
export async function syncSubscription(sub: PushSubscription): Promise<{ ok: boolean; status: number; id?: string }> {
  const json = sub.toJSON();
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys, ...deviceInfo() }),
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string };
  return { ok: res.ok, status: res.status, id: body.id };
}

export async function forgetSubscription(endpoint: string): Promise<void> {
  await fetch("/api/push/subscribe", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint }) }).catch(() => undefined);
}

/** Android/desktop Chrome hands us the install prompt; PwaBoot parks it here. */
export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
declare global {
  interface Window {
    __pcInstallPrompt?: InstallPromptEvent | null;
  }
}
export function installPrompt(): InstallPromptEvent | null {
  return typeof window === "undefined" ? null : (window.__pcInstallPrompt ?? null);
}
