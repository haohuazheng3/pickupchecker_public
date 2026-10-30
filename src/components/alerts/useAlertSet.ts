"use client";
/**
 * The signed-in alert set, edited in place: every tick updates the screen at once and, a moment later,
 * sends the whole set (PUT /api/watches). Taps made while a save is in flight are folded into the next one,
 * so the server always ends on the last state. A failed save puts the screen back to what the server has.
 */
import { useCallback, useRef, useState } from "react";
import { phoneKey, type AlertSet } from "@/lib/alertSet";
import { announceAlertsChanged } from "@/lib/alertEvents";
import { forgetMe } from "@/lib/me";
import type { PlanKey } from "@/lib/plans";

export interface PlanInfo { key: PlanKey; limit: number; used: number }
export type SaveState = "idle" | "saving" | "saved" | "error";
const same = (a: AlertSet, b: AlertSet) =>
  a.stores.length === b.stores.length && a.phones.length === b.phones.length && a.stores.every((n) => b.stores.includes(n)) && a.phones.every((p) => b.phones.some((q) => phoneKey(q) === phoneKey(p)));

export function useAlertSet(initial: AlertSet, initialPlan: PlanInfo | null) {
  const [set, setSet] = useState(initial);
  const [plan, setPlan] = useState(initialPlan);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const confirmed = useRef(initial);
  const queued = useRef<AlertSet | null>(null);
  const inflight = useRef(false);
  const timer = useRef(0);

  const flush = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      // Taps that arrive while a save is out are sent next, as one set.
      while (queued.current) {
        const next = queued.current;
        queued.current = null;
        setState("saving");
        try {
          const res = await fetch("/api/watches", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(next) });
          const j = (await res.json().catch(() => ({}))) as { set?: AlertSet; plan?: PlanInfo; error?: string };
          if (!res.ok || !j.set) throw new Error(j.error ?? `Couldn't save (${res.status})`);
          const saved = j.set;
          confirmed.current = saved;
          if (j.plan) setPlan(j.plan);
          if (!queued.current) {
            // Keep the screen's order when the server agrees on what is chosen.
            setSet((cur) => (same(cur, saved) ? cur : saved));
            setState("saved");
            forgetMe();
            announceAlertsChanged();
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
          setState("error");
          if (!queued.current) setSet(confirmed.current);
        }
      }
    } finally {
      inflight.current = false;
    }
  }, []);

  /** Show `next` now and save it shortly (taps within 300 ms go as one). */
  const apply = useCallback((next: AlertSet) => {
    setSet(next);
    setError(null);
    queued.current = next;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), 300);
  }, [flush]);

  /** Adopt what the server says (first load, or after signing in). */
  const reset = useCallback((s: AlertSet, p: PlanInfo | null) => { confirmed.current = s; setSet(s); setPlan(p); setState("idle"); }, []);

  return { set, plan, state, error, apply, reset };
}
