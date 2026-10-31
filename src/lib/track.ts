"use client";
/**
 * FlowGlance's browser API: fw('event', name, props) for named events and fw('identify', { userRef, email })
 * for who the visitor is. Calls made before the snippet has loaded wait in fw.q, which the snippet replays —
 * unless analytics turn out not to be allowed (see Consent.tsx), in which case the queue is dropped unsent.
 */
import { choiceFrom } from "@/lib/consent";

type Fw = ((...args: unknown[]) => void) & { q?: unknown[][] };
type W = { fw?: Fw; __pcNoAnalytics?: boolean };

function fw(): Fw {
  const w = window as unknown as W;
  if (!w.fw) {
    const stub: Fw = (...args: unknown[]) => { const q = (stub.q ??= []); if (q.length < 100) q.push(args); };
    w.fw = stub;
  }
  return w.fw;
}

/** Declined, or still waiting for an answer in a region that asks first: nothing is queued or sent. */
function blocked(): boolean {
  return (window as unknown as W).__pcNoAnalytics === true || (typeof document !== "undefined" && choiceFrom(document.cookie) === "declined");
}

/** Stop analytics on this page: drop whatever waited for the snippet and refuse new calls. */
export function holdAnalytics() {
  const w = window as unknown as W;
  w.__pcNoAnalytics = true;
  if (w.fw?.q) w.fw.q.length = 0;
}

export function releaseAnalytics() {
  (window as unknown as W).__pcNoAnalytics = false;
}

/** A named business event (watch_saved, checkout_started, purchase …). */
export function track(event: string, props?: Record<string, unknown>) {
  try { if (!blocked()) fw()("event", event, props); } catch { /* analytics never breaks the page */ }
}

/** Ties this browser's journey to the signed-in account. */
export function identify(userRef: string, email: string) {
  try { if (!blocked()) fw()("identify", { userRef, email }); } catch { /* ignore */ }
}
