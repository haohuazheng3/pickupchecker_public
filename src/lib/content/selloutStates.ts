/**
 * The by-state table of /iphone-duo-sell-out-times: every US state with at least STATE_MIN timed listings among the
 * rows the page already loaded (lib/stock/sellouts.ts `recent`), with its median listing time and the shares gone
 * within 30 seconds and 2 minutes, most timed listings first.
 *
 * A "timed listing" is one confirmed restock whose end was seen: the seconds Apple's pickup page listed that
 * configuration at that store, bounded by two checks (the upper bound, `highSec`). It is listing time, never a count
 * of units sold, and never a chance of buying one. Restocks still listed (no end yet) are left out. Pure.
 */
import { summarize, type SelloutRow } from "../stock/sellouts";

/** A state is ranked from this many timed listings; fewer is an anecdote and goes to `thin`. */
export const STATE_MIN = 10;

export interface StateSellout {
  state: string;
  /** Timed listings in the state. */
  n: number;
  medianSec: number;
  /** Shares (0–1) gone within 30 seconds and within 2 minutes. */
  within30: number;
  within120: number;
}

export interface StateDistribution {
  /** States with at least `min` timed listings, most first (ties by name). */
  rows: StateSellout[];
  /** States with 1 to min − 1 timed listings, most first (ties by name): listed, not ranked. */
  thin: { state: string; n: number }[];
  /** Every timed listing with a known state, and the same figures over all of them (the national row). */
  all: { n: number; medianSec: number | null; within30: number; within120: number };
  /** The oldest timed listing considered (ISO), null when there is none: the table's "since". */
  from: string | null;
}

/** Pure: the timed rows grouped by the state of their store (`stateOf` returns undefined for an unknown store). */
export function selloutsByState(rows: SelloutRow[], stateOf: (storeNumber: string) => string | undefined, min = STATE_MIN): StateDistribution {
  const by = new Map<string, number[]>();
  const every: number[] = [];
  let from: number | null = null;
  for (const r of rows) {
    if (r.highSec == null || !Number.isFinite(r.highSec)) continue;
    const state = stateOf(r.storeNumber);
    if (!state) continue;
    by.set(state, [...(by.get(state) ?? []), r.highSec]);
    every.push(r.highSec);
    const at = new Date(r.at).getTime();
    if (Number.isFinite(at) && (from == null || at < from)) from = at;
  }
  const order = (a: { state: string; n: number }, b: { state: string; n: number }) => b.n - a.n || a.state.localeCompare(b.state);
  const ranked: StateSellout[] = [];
  const thin: { state: string; n: number }[] = [];
  for (const [state, v] of by) {
    if (v.length >= min) {
      const s = summarize(v, 0);
      ranked.push({ state, n: s.n, medianSec: s.medianSec!, within30: s.within30, within120: s.within120 });
    } else {
      thin.push({ state, n: v.length });
    }
  }
  const total = summarize(every, 0);
  return {
    rows: ranked.sort(order),
    thin: thin.sort(order),
    all: { n: total.n, medianSec: total.medianSec, within30: total.within30, within120: total.within120 },
    from: from == null ? null : new Date(from).toISOString(),
  };
}
