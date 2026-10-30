"use client";
/**
 * "This user's alerts just changed": the wizard says so after a save, the alert list after a pause or
 * delete, and the account page (rules, plan use, restock modules) refreshes. Same tab through a window
 * event, other tabs through a BroadcastChannel (the storage event where that is missing).
 */
const EVENT = "pc:alerts-changed";
const CHANNEL = "pc-alerts";
const KEY = "pc:alerts-changed";

export function announceAlertsChanged(): void {
  window.dispatchEvent(new Event(EVENT));
  try {
    const c = new BroadcastChannel(CHANNEL);
    c.postMessage(Date.now());
    c.close();
  } catch {
    try { localStorage.setItem(KEY, String(Date.now())); } catch { /* private mode: this tab still heard it */ }
  }
}

export function onAlertsChanged(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) cb(); };
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = () => cb();
  } catch {
    window.addEventListener("storage", onStorage);
  }
  window.addEventListener(EVENT, cb);
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener("storage", onStorage); channel?.close(); };
}
