/**
 * Early warning before polling outgrows its host (owner mail from the watchdog, every minute).
 *
 * Measured 2026-11-02 on the 1 vCPU poller host: 64% busy with 337 anchor requests, 468 fast-lane and 1,584
 * other-country requests a minute; each extra one-store request costs ~10–16 ms of CPU. The host tops out around
 * 100–140 fast-lane stores, and the poller is one Node thread, so more vCPUs alone do not lift that. Warned on:
 *  • the fast lane reaching FAST_STORES_WARN stores (the leading signal: paid alerts spreading to new stores)
 *  • a round mode's median duration over the last ROUND_WINDOW_MIN close to its cadence (cadence − 1 s)
 *  • the stores paid alerts point at going unchecked for longer than the fast cadence allows (their 90th
 *    percentile age over LAG_WARN_SEC for LAG_RUNS runs in a row)
 * One mail when it starts (and again if a new reason joins), a reminder a day while it lasts, one when it has
 * been clear for CLEAR_RUNS runs. A reason that drops out and comes back within REARM_RUNS runs is the same
 * reason, not a new one (2026-11-06: two hours of slow Apple answers made the round reasons flap, 13 mails).
 */
import { sql } from "drizzle-orm";
import { db } from "../db";
import { watchedPairs, pairKey } from "./fallback";

export const FAST_STORES_WARN = 80;
export const ROUND_WINDOW_MIN = 10;
/** Rounds needed in the window before a median means anything (a restart leaves only a few). */
export const ROUND_MIN_COUNT = 10;
export const LAG_WARN_SEC = 7;
export const LAG_RUNS = 5;
export const CLEAR_RUNS = 10;
export const REMIND_MS = 24 * 60 * 60 * 1000;
/** Runs a mailed reason must stay inactive before it counts as new again when it returns. */
export const REARM_RUNS = 60;

export interface RoundStat { host: string; mode: string; p50Sec: number; count: number }
export interface CapacityInput {
  fastStores: number | null;
  rounds: RoundStat[];
  /** Cadence per round mode ("full" = the US anchor sweep, "intl" = the other countries), seconds. */
  cadence: Record<string, number>;
  /** 90th percentile age of the pairs paid alerts watch, seconds; null when there are none. */
  watchedLagP90Sec: number | null;
  fastCadenceSec: number;
}

export interface Reason { key: string; text: string }

/** Pure: what is over the line right now (the lag reason is only a candidate here; capacityStep wants it repeated). */
export function capacityReasons(i: CapacityInput): { reasons: Reason[]; lagHigh: boolean } {
  const reasons: Reason[] = [];
  if (i.fastStores != null && i.fastStores >= FAST_STORES_WARN) {
    reasons.push({ key: "fast-stores", text: `The fast lane now checks ${i.fastStores} stores (warning line ${FAST_STORES_WARN}; this host tops out around 100–140).` });
  }
  for (const r of i.rounds) {
    const cadence = i.cadence[r.mode];
    if (!cadence || r.count < ROUND_MIN_COUNT || r.p50Sec <= cadence - 1) continue;
    const what = r.mode === "intl" ? "other-country round" : r.mode === "full" ? "US round" : `${r.mode} round`;
    reasons.push({ key: `round:${r.host}:${r.mode}`, text: `The ${what} on ${r.host} takes ${r.p50Sec.toFixed(1)} s (median of the last ${ROUND_WINDOW_MIN} min) against a ${cadence} s cadence.` });
  }
  const lagHigh = i.watchedLagP90Sec != null && i.watchedLagP90Sec > LAG_WARN_SEC;
  return { reasons, lagHigh };
}

export interface CapacityState {
  mailed: boolean;
  /** Every reason mailed in this episode, active or resting (a resting one is forgotten after REARM_RUNS runs). */
  reasons: string[];
  lagRuns: number;
  clearRuns: number;
  since?: string | null;
  lastMail?: string | null;
  /** Runs in a row each remembered reason has been inactive. */
  quiet?: Record<string, number>;
}
export const CAPACITY_IDLE: CapacityState = { mailed: false, reasons: [], lagRuns: 0, clearRuns: 0 };

/** Pure: one watchdog run. Returns the next state, which reasons are active, and the mail to send (if any). */
export function capacityStep(st: CapacityState, now: Date, reasons: Reason[], lagHigh: boolean, lagSec: number | null, fastCadenceSec: number): { next: CapacityState; active: Reason[]; mail: "warn" | "remind" | "clear" | null } {
  const lagRuns = lagHigh ? st.lagRuns + 1 : 0;
  const active = [...reasons];
  if (lagRuns >= LAG_RUNS) active.push({ key: "lag", text: `Stores with paid alerts go ${lagSec?.toFixed(1)} s between checks (90th percentile, ${lagRuns} minutes running) where the fast lane should keep it near ${fastCadenceSec} s.` });
  const keys = active.map((r) => r.key).sort();
  if (active.length) {
    const fresh = keys.some((k) => !st.reasons.includes(k));
    const quiet: Record<string, number> = {};
    for (const k of st.reasons) if (!keys.includes(k)) quiet[k] = (st.quiet?.[k] ?? 0) + 1;
    const remembered = [...new Set([...keys, ...Object.keys(quiet).filter((k) => quiet[k] < REARM_RUNS)])].sort();
    const base = { ...st, lagRuns, clearRuns: 0, reasons: remembered, quiet };
    if (!st.mailed || fresh) return { next: { ...base, mailed: true, since: st.mailed ? st.since : now.toISOString(), lastMail: now.toISOString() }, active, mail: "warn" };
    if (st.lastMail && now.getTime() - new Date(st.lastMail).getTime() > REMIND_MS) return { next: { ...base, lastMail: now.toISOString() }, active, mail: "remind" };
    return { next: base, active, mail: null };
  }
  if (!st.mailed) return { next: { ...CAPACITY_IDLE, lagRuns }, active, mail: null };
  const clearRuns = st.clearRuns + 1;
  if (clearRuns >= CLEAR_RUNS) return { next: { ...CAPACITY_IDLE, lagRuns }, active, mail: "clear" };
  return { next: { ...st, lagRuns, clearRuns }, active, mail: null };
}

/** Median round duration per host × mode over the window (finished rounds only). */
export async function recentRounds(): Promise<RoundStat[]> {
  const rows = (await db().execute(sql`
    select host, mode, count(*)::int as count, (percentile_cont(0.5) within group (order by duration_ms) / 1000.0)::float8 as p50
    from sweeps where started_at > now() - make_interval(mins => ${ROUND_WINDOW_MIN}) and finished_at is not null
    group by host, mode`)).rows as { host: string; mode: string; count: number; p50: number }[];
  return rows.map((r) => ({ host: r.host, mode: r.mode, count: r.count, p50Sec: Number(r.p50) }));
}

/** 90th percentile of how long ago each watched pair was checked (seconds), or null with nothing watched. */
export async function watchedLagP90(): Promise<number | null> {
  const watched = await watchedPairs();
  if (watched.size === 0) return null;
  const stores = [...new Set([...watched].map((k) => k.split("|")[0]))];
  const rows = (await db().execute(sql`
    select store_number, part_number, extract(epoch from now() - last_checked_at)::float8 as age
    from store_sku_status where store_number in (${sql.join(stores.map((s) => sql`${s}`), sql`, `)})`)).rows as { store_number: string; part_number: string; age: number | null }[];
  const ages = rows.filter((r) => watched.has(pairKey(r.store_number, r.part_number))).map((r) => (r.age == null ? Infinity : Number(r.age))).sort((a, b) => a - b);
  if (ages.length === 0) return null;
  return ages[Math.min(ages.length - 1, Math.floor(ages.length * 0.9))];
}
