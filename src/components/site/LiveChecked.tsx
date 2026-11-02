"use client";
/**
 * "checked 4s ago" that stays true while the page is open. LiveAgo alone counts up from the time the page
 * was rendered, so a tab left open read "checked 2m ago" although the store was checked every 15 s — it
 * looked like a fake counter. Every LiveChecked on a page registers its scope (lib/liveScope.ts); one shared
 * timer asks /api/live for all of them every POLL_MS (CDN-cached 4 s, so many open tabs cost one read) and
 * each figure jumps back when a newer check lands. Paused while the tab is hidden.
 * When a scope's stock itself changed since the last poll (a restock or a sell-out was committed), it fires
 * STOCK_CHANGED and FreshOnReturn re-renders the page: people in the Home Screen app kept tapping "Duo stock"
 * to refresh a list that had gone stale under them (FlowGlance, 2026-11-02).
 */
import { useEffect, useState } from "react";
import { formatAgo } from "./LiveAgo";
import { liveKey } from "@/lib/liveScope";
import type { ModelKey } from "@/lib/apple/catalog";
import type { CountryCode } from "@/lib/apple/countries";

const POLL_MS = 5000;
const listeners = new Map<string, Set<(iso: string) => void>>();
const latest = new Map<string, string>();
/** The newest committed stock change seen per scope; the first poll only sets the baseline. */
const changedSeen = new Map<string, number>();
export const STOCK_CHANGED = "pc:stock-changed";
let timer: number | null = null;
let inFlight = false;

async function poll() {
  if (inFlight || document.hidden || listeners.size === 0) return;
  inFlight = true;
  try {
    const keys = [...listeners.keys()].sort();
    const res = await fetch(`/api/live?${keys.map((k) => `k=${encodeURIComponent(k)}`).join("&")}`);
    if (!res.ok) return;
    const body = (await res.json()) as { checked?: Record<string, string | null>; changed?: Record<string, string | null> };
    let moved = false;
    for (const [k, iso] of Object.entries(body.changed ?? {})) {
      if (!iso || !listeners.has(k)) continue;
      const t = new Date(iso).getTime();
      const prev = changedSeen.get(k);
      if (prev !== undefined && t > prev) moved = true;
      if (prev === undefined || t > prev) changedSeen.set(k, t);
    }
    if (moved) window.dispatchEvent(new Event(STOCK_CHANGED));
    for (const [k, iso] of Object.entries(body.checked ?? {})) {
      if (!iso) continue;
      const prev = latest.get(k);
      if (prev && new Date(prev).getTime() >= new Date(iso).getTime()) continue;
      latest.set(k, iso);
      for (const fn of listeners.get(k) ?? []) fn(iso);
    }
  } catch {
    /* offline: the figure keeps counting from the last known check, which is the truth */
  } finally {
    inFlight = false;
  }
}

function subscribe(key: string, fn: (iso: string) => void): () => void {
  const set = listeners.get(key) ?? new Set();
  set.add(fn);
  listeners.set(key, set);
  if (timer === null) {
    timer = window.setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.setTimeout(poll, 1500);
  }
  return () => {
    set.delete(fn);
    if (set.size === 0) listeners.delete(key);
    if (listeners.size === 0 && timer !== null) { window.clearInterval(timer); timer = null; document.removeEventListener("visibilitychange", onVisible); }
  };
}

function onVisible() {
  if (!document.hidden) void poll();
}

export function LiveChecked({ iso, model, stores, country, className = "", never = "never" }: { iso: Date | string | null | undefined; model?: ModelKey | null; stores?: string[] | null; country?: CountryCode | null; className?: string; never?: string }) {
  const initial = iso instanceof Date ? iso.toISOString() : iso ?? null;
  const key = liveKey({ model, stores, country });
  // The polled value only ever moves forward; the rendered one is the later of it and the server's.
  const [polled, setPolled] = useState<string | null>(() => (key ? latest.get(key) ?? null : null));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    if (!key) return;
    return subscribe(key, (next) => setPolled((cur) => (!cur || new Date(next) > new Date(cur) ? next : cur)));
  }, [key]);
  const checked = polled && (!initial || new Date(polled) > new Date(initial)) ? polled : initial;
  if (!checked) return <span className={className}>{never}</span>;
  return <span className={`tabular-nums ${className}`} suppressHydrationWarning>{formatAgo(checked, now)}</span>;
}
