/**
 * Poller hosts (docs/architecture.md「热备主机」「美国专用轮询机」): the primary (database), a standby in another
 * region (streaming replica + the other countries) and, optionally, a US worker (no database: the US anchor sweep
 * and the US fast lane). Who does what is decided here, from the cluster record in the database every query goes
 * to (db/index.ts picks it):
 *  • cluster = { primary: <host>, epoch }. The host it names polls the US (anchor sweep + fast lane) — unless a
 *    US worker reports in (alive:<host>, written every ALIVE_EVERY_MS): then the primary hands the US over and
 *    takes it back by itself when the worker's record goes stale.
 *  • the handover never has two hosts writing one store (Postgres deadlocked on exactly that, 2026-11-03): the
 *    primary keeps reporting "us" until its last US round has finished (poller/main.ts), and the worker starts
 *    only once no other host reports "us".
 *  • the other countries run on the standby, or on an intl worker (POLLER_ROLE=intl: other countries only, no
 *    takeover; since 2026-11-10 linode-2, while linode-4 is the standby with no egress of its own); the primary
 *    runs them only while no other host reports doing so, so they come back to it by themselves if that host stops.
 *  • nothing runs without a writable database (a replica-only view cannot ingest).
 *  • takeover: the standby promotes its replica when, for PROMOTE_AFTER checks in a row, it cannot reach the
 *    primary database AND the site (Vercel, a third vantage point) reports the same. Its own view alone never
 *    suffices: that could be its own network. The promoted database gets epoch + 1, and becomes the primary.
 *  • an old primary that comes back finds a writable database with a higher epoch, writes that into its own
 *    cluster record (so nothing ever picks it again) and stops polling: it is fenced.
 */
import { sql } from "drizzle-orm";
import { db } from "../db";

export type PollerRole = "primary" | "standby" | "worker" | "intl";
export interface ClusterRecord { primary: string; epoch: number; fencedAt?: string }
/** A standby's view of its replica: the WAL receiver's status ("streaming") and how far behind replay is. */
export interface ReplicaInfo { status: string | null; lagSec: number | null }
export interface AliveRecord { host: string; at: string; role: PollerRole; duties: string; epoch?: number; replica?: ReplicaInfo | null }

export const ALIVE_EVERY_MS = 10_000;
/** Another host's alive record younger than this means it is doing what it says. */
export const ALIVE_FRESH_MS = 45_000;
/** Checks (one per ALIVE_EVERY_MS) the primary database must be unreachable, from here and from the site. */
export const PROMOTE_AFTER = 6;

export interface DutyInput {
  me: string;
  role: PollerRole;
  cluster: ClusterRecord | null;
  alive: AliveRecord[];
  now: Date;
  /** POLL_COUNTRIES set on this host and an IPv6 egress to poll them through. */
  intlConfigured: boolean;
  /** The database queries go to accepts writes. */
  writable: boolean;
}
export interface Duties { us: boolean; intl: boolean; fenced: boolean; why: string }

/** Pure: what this host polls right now. */
export function duties(i: DutyInput): Duties {
  if (!i.writable) return { us: false, intl: false, fenced: false, why: "no writable database" };
  const owner = i.cluster?.primary ?? (i.role === "primary" ? i.me : null);
  if (i.role === "primary" && owner !== i.me) return { us: false, intl: false, fenced: true, why: `${owner} took over (epoch ${i.cluster?.epoch})` };
  const fresh = (a: AliveRecord) => a.host !== i.me && i.now.getTime() - new Date(a.at).getTime() < ALIVE_FRESH_MS;
  if (i.role === "worker") {
    // The US worker waits until no other host reports "us": the primary stops on seeing it and says so only after
    // its last US round has finished.
    const othersRunUs = i.alive.some((a) => fresh(a) && a.duties.includes("us"));
    return { us: !othersRunUs, intl: false, fenced: false, why: othersRunUs ? "US worker, waiting for the US to be handed over" : "US worker" };
  }
  if (i.role === "intl") {
    // The intl worker runs the other countries whenever it can; the primary hands them over on seeing its record.
    return i.intlConfigured
      ? { us: false, intl: true, fenced: false, why: "intl worker: other countries" }
      : { us: false, intl: false, fenced: false, why: "intl worker, no egress for other countries" };
  }
  const isPrimary = owner === i.me;
  const worker = i.alive.find((a) => fresh(a) && a.role === "worker");
  const us = isPrimary && !worker;
  const usWhy = isPrimary ? (worker ? `cluster primary, US on ${worker.host}` : "cluster primary") : "standby";
  if (!i.intlConfigured) return { us, intl: false, fenced: false, why: isPrimary ? usWhy : "standby, no egress for other countries" };
  const othersRunIntl = i.alive.some((a) => fresh(a) && a.duties.includes("intl"));
  // The cluster primary hands the other countries to whoever else runs them; anyone else simply runs them.
  const intl = isPrimary ? !othersRunIntl : true;
  return { us, intl, fenced: false, why: isPrimary ? `${usWhy}, other countries ${intl ? "too" : "elsewhere"}` : "standby: other countries" };
}

export function dutyLabel(d: Duties): string {
  return d.us && d.intl ? "us+intl" : d.us ? "us" : d.intl ? "intl" : "none";
}

export interface PromoteState { misses: number }
/**
 * Pure: one takeover check on the standby. `primaryDbOk`: the primary database answered from here.
 * `sitePrimaryOk`: what the site says about the primary database (null = the site did not answer: no vote).
 */
export function promoteStep(st: PromoteState, primaryDbOk: boolean, sitePrimaryOk: boolean | null): { next: PromoteState; promote: boolean; why: string } {
  if (primaryDbOk) return { next: { misses: 0 }, promote: false, why: "primary answers" };
  if (sitePrimaryOk !== false) {
    // Unreachable from here only (or no word from the site): count nothing towards a takeover.
    return { next: { misses: 0 }, promote: false, why: sitePrimaryOk ? "primary unreachable from here only" : "primary unreachable, site silent" };
  }
  const misses = st.misses + 1;
  return { next: { misses }, promote: misses >= PROMOTE_AFTER, why: `primary unreachable from here and from the site (${misses}/${PROMOTE_AFTER})` };
}

/* ---------------- database helpers ---------------- */

export async function readCluster(): Promise<ClusterRecord | null> {
  const r = (await db().execute(sql`select value from poller_state where key = 'cluster'`)).rows[0] as { value: ClusterRecord } | undefined;
  return r?.value ?? null;
}

export async function readAlive(withinMin = 10): Promise<AliveRecord[]> {
  const rows = (await db().execute(sql`select value from poller_state where key like 'alive:%' and updated_at > now() - make_interval(mins => ${withinMin})`)).rows as { value: AliveRecord }[];
  return rows.map((r) => r.value);
}

/** The other-country stats of whichever host runs them (its alive record), for the watchdog and health. */
export async function intlRunner(): Promise<{ host: string; at: string; intl: Record<string, unknown> } | null> {
  const rows = (await db().execute(sql`select value from poller_state where key like 'alive:%' and updated_at > now() - make_interval(secs => ${ALIVE_FRESH_MS / 1000}) and value->>'duties' like '%intl%' order by updated_at desc limit 1`)).rows as { value: AliveRecord & { intl?: Record<string, unknown> } }[];
  const v = rows[0]?.value;
  return v?.intl ? { host: v.host, at: v.at, intl: v.intl } : null;
}

/**
 * Pure: how the US worker stands, for the watchdog. "none" without one in the window the caller read; "down" when its
 * record went stale (the primary has taken the US back by itself, with the CPU the worker was there to relieve).
 */
export function workerVerdict(alive: AliveRecord[], now: Date): { state: "ok" | "down" | "none"; host: string | null; summary: string } {
  const w = alive.filter((a) => a.role === "worker").sort((a, b) => b.at.localeCompare(a.at))[0];
  if (!w) return { state: "none", host: null, summary: "no US worker" };
  const age = now.getTime() - new Date(w.at).getTime();
  if (age > STANDBY_STALE_MS) return { state: "down", host: w.host, summary: `${w.host} last reported ${Math.round(age / 1000)} s ago` };
  return { state: "ok", host: w.host, summary: `${w.host} reports, duties ${w.duties}` };
}

/** A standby is unhealthy when its alive record is older than this, or its replica not streaming / this far behind. */
export const STANDBY_STALE_MS = 60_000;
export const STANDBY_LAG_SEC = 60;

/**
 * Pure: how the standby stands, for the watchdog. "none" when no host has reported as a standby in the window
 * the caller read (a single-host setup); "down" when its record went stale; "lagging" when its replica is not
 * streaming or falls behind. The primary takes the other countries back by itself either way: this is for the
 * owner, because a broken standby means no takeover.
 */
export function standbyVerdict(alive: AliveRecord[], now: Date): { state: "ok" | "down" | "lagging" | "none"; host: string | null; summary: string } {
  const sb = alive.filter((a) => a.role === "standby").sort((a, b) => b.at.localeCompare(a.at))[0];
  if (!sb) return { state: "none", host: null, summary: "no standby" };
  const age = now.getTime() - new Date(sb.at).getTime();
  if (age > STANDBY_STALE_MS) return { state: "down", host: sb.host, summary: `${sb.host} last reported ${Math.round(age / 1000)} s ago` };
  // A promoted standby has no replica any more: that is the takeover, mailed by the standby itself.
  if (sb.replica === null || sb.replica === undefined) return { state: "ok", host: sb.host, summary: `${sb.host} reports, no replica info` };
  if (sb.replica.status !== "streaming") return { state: "lagging", host: sb.host, summary: `${sb.host}: replica ${sb.replica.status ?? "not receiving"}` };
  if ((sb.replica.lagSec ?? 0) > STANDBY_LAG_SEC) return { state: "lagging", host: sb.host, summary: `${sb.host}: replica ${Math.round(sb.replica.lagSec!)} s behind` };
  return { state: "ok", host: sb.host, summary: `${sb.host} streaming, ${sb.replica.lagSec == null ? "?" : sb.replica.lagSec.toFixed(1)} s behind` };
}
