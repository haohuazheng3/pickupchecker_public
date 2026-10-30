"use client";
/**
 * FlowGlance's browser API: fw('event', name, props) for named events and fw('identify', { userRef, email })
 * for who the visitor is. Calls made before the snippet has loaded wait in fw.q, which the snippet replays.
 */
type Fw = ((...args: unknown[]) => void) & { q?: unknown[][] };

function fw(): Fw {
  const w = window as unknown as { fw?: Fw };
  if (!w.fw) {
    const stub: Fw = (...args: unknown[]) => { const q = (stub.q ??= []); if (q.length < 100) q.push(args); };
    w.fw = stub;
  }
  return w.fw;
}

/** A named business event (watch_saved, checkout_started, purchase …). */
export function track(event: string, props?: Record<string, unknown>) {
  try { fw()("event", event, props); } catch { /* analytics never breaks the page */ }
}

/** Ties this browser's journey to the signed-in account. */
export function identify(userRef: string, email: string) {
  try { fw()("identify", { userRef, email }); } catch { /* ignore */ }
}
