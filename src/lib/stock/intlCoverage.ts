/**
 * Coverage bookkeeping for the other countries' anchor round (pure; tests/intl-coverage.test.ts).
 *
 * Since 2026-11-08 the 15 s round of the other countries asks Apple by location (an anchor returns the nearest
 * ≤12 stores) like the US sweep, instead of store by store. Apple's answer to a location can drift — a new store
 * opens nearby and pushes one out of the 12, a store closes, the geocoder changes its mind — and a store that no
 * anchor returns any more would silently go stale. So every round compares the stores the anchors returned with
 * the stores the plan expects; a store missing from its anchors' answers for DIRECT_AFTER_MISSES rounds in a row
 * (while those anchors did answer) is polled store by store from the next round on, and the owner is told once.
 * When its anchors return it again for BACK_AFTER_HITS rounds, the direct request is dropped again.
 *
 * Stores the plan never covers (Chermside R384: Apple offers no pickup lookup there, so no location returns it)
 * are direct from the start, without a report — `uncoveredByPlan`.
 */
import type { CoverageAnchor } from "../apple/catalog-core";
import type { CountryCode } from "../apple/countries";

export const INTL_COVERAGE_KEY = "intl:coverage";
/** Rounds in a row a store must be missing from answering anchors before it is asked directly. */
export const DIRECT_AFTER_MISSES = 2;
/** Rounds in a row its anchors must return a direct store before the direct request is dropped. */
export const BACK_AFTER_HITS = 20;

export interface CoverageEntry {
  country: string;
  /** Rounds in a row the anchors did not return it (reset when they do). */
  misses: number;
  /** Rounds in a row the anchors returned it while it was direct. */
  hits: number;
  /** ISO time it was first missed in the current streak. */
  since: string;
  /** Polled store by store because of the misses. */
  direct: boolean;
  /** The owner has been told about this streak. */
  notified: boolean;
}
export type CoverageState = Record<string, CoverageEntry>;

export interface CoverageRound {
  /** Stores the round should have covered: every store of a polled country, less the stores not due (notOffered) and the resting countries. */
  expected: { store: string; country: string }[];
  /** Stores an anchor (location) request returned this round. */
  anchorCovered: Iterable<string>;
  /** Stores whose anchors did not all answer this round: not judged (a timeout is not drift). */
  excused: Iterable<string>;
  now: Date;
}

/** Stores of `stores` (per country) no anchor of `anchors` lists: asked store by store, as before anchors. */
export function uncoveredByPlan(stores: Partial<Record<CountryCode, string[]>>, anchors: Partial<Record<CountryCode, CoverageAnchor[]>>): Partial<Record<CountryCode, string[]>> {
  const out: Partial<Record<CountryCode, string[]>> = {};
  for (const [cc, list] of Object.entries(stores) as [CountryCode, string[]][]) {
    const covered = new Set((anchors[cc] ?? []).flatMap((a) => a.covers));
    const missing = list.filter((s) => !covered.has(s));
    if (missing.length) out[cc] = missing;
  }
  return out;
}

/**
 * Stores per anchor task key (`location#batch`) → the stores it should return, for working out `excused`:
 * a store is excused when any of its anchors' requests failed this round.
 */
export function excusedStores(anchors: Partial<Record<CountryCode, CoverageAnchor[]>>, failedLocations: Iterable<string>): Set<string> {
  const failed = new Set(failedLocations);
  const out = new Set<string>();
  for (const list of Object.values(anchors)) for (const a of list ?? []) if (failed.has(a.location)) for (const s of a.covers) out.add(s);
  return out;
}

/** One round's step. `newlyDirect` / `back` are the stores that changed mode; `report` lists the stores to tell the owner about (once). */
export function coverageStep(prev: CoverageState, round: CoverageRound): { state: CoverageState; newlyDirect: string[]; back: string[]; report: string[] } {
  const covered = new Set(round.anchorCovered);
  const excused = new Set(round.excused);
  const state: CoverageState = { ...prev };
  const newlyDirect: string[] = [], back: string[] = [], report: string[] = [];
  for (const { store, country } of round.expected) {
    const e = state[store];
    if (covered.has(store)) {
      if (!e) continue;
      if (e.direct) {
        const hits = e.hits + 1;
        if (hits >= BACK_AFTER_HITS) { delete state[store]; back.push(store); } else state[store] = { ...e, hits, misses: 0 };
      } else delete state[store]; // a miss streak that ended before it mattered
      continue;
    }
    if (excused.has(store)) continue; // its anchors did not answer: nothing to learn
    const misses = (e?.misses ?? 0) + 1;
    const next: CoverageEntry = { country, misses, hits: 0, since: e?.since ?? round.now.toISOString(), direct: e?.direct ?? false, notified: e?.notified ?? false };
    if (!next.direct && misses >= DIRECT_AFTER_MISSES) { next.direct = true; newlyDirect.push(store); }
    if (next.direct && !next.notified) { next.notified = true; report.push(store); }
    state[store] = next;
  }
  return { state, newlyDirect, back, report };
}

/** The stores currently asked store by store because their anchors stopped returning them. */
export function directStores(state: CoverageState): string[] {
  return Object.keys(state).filter((s) => state[s].direct).sort();
}

/** What is persisted in poller_state (and what restores it; unknown shapes → empty). */
export function restoreCoverage(value: unknown, polled: Set<string>): CoverageState {
  const v = value as { stores?: Record<string, Partial<CoverageEntry>> } | null | undefined;
  const out: CoverageState = {};
  for (const [store, e] of Object.entries(v?.stores ?? {})) {
    if (!polled.has(store) || !e || typeof e !== "object") continue;
    out[store] = { country: String(e.country ?? ""), misses: Number(e.misses ?? 0), hits: Number(e.hits ?? 0), since: String(e.since ?? ""), direct: Boolean(e.direct), notified: Boolean(e.notified) };
  }
  return out;
}

export function persistCoverage(state: CoverageState): { stores: CoverageState } {
  return { stores: state };
}
