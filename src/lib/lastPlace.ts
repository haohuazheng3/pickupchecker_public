/**
 * The visitor's last device location, kept on this device only (localStorage, rounded to ~1 km, 30 days), so
 * "Near me" is not a question asked again on every page. A Home Screen app on iPhone forgets the permission
 * between launches: paying users tapped Near me six times in one afternoon to get the same list (FlowGlance,
 * 2026-11-02). Tapping Near me still asks the device and replaces it.
 */
const KEY = "pc:here";
const MAX_AGE_MS = 30 * 86400_000;

export interface Here { lat: number; lng: number }

export function rememberHere(h: Here): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ lat: Math.round(h.lat * 100) / 100, lng: Math.round(h.lng * 100) / 100, at: Date.now() }));
  } catch {
    /* private mode: it is asked again next time */
  }
}

export function recallHere(): Here | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { lat?: unknown; lng?: unknown; at?: unknown };
    if (typeof v.lat !== "number" || typeof v.lng !== "number" || typeof v.at !== "number") return null;
    if (Date.now() - v.at > MAX_AGE_MS || Math.abs(v.lat) > 90 || Math.abs(v.lng) > 180) return null;
    return { lat: v.lat, lng: v.lng };
  } catch {
    return null;
  }
}
