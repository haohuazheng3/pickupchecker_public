"use client";
/** The signed-in reader as /api/me describes them, fetched once per page load and shared by every caller. */
import type { PlanKey } from "./plans";
import type { DeviceSummary } from "./devices";

export interface Me { signedIn: boolean; plan?: { key: PlanKey; limit: number; used: number }; devices?: DeviceSummary }

let pending: Promise<Me | null> | null = null;

export function fetchMe(): Promise<Me | null> {
  pending ??= fetch("/api/me", { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<Me>) : null)).catch(() => null);
  return pending;
}

/** After a change (plan switched, device added) the next caller reads fresh. */
export function forgetMe() { pending = null; }
