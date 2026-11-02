/**
 * Two poller hosts (docs/architecture.md「热备主机」): the primary (database + US polling) and a standby in another
 * region (streaming replica + the other countries). Who does what is decided here, from the cluster record in
 * the database every query goes to (db/index.ts picks it):
 *  • cluster = { primary: <host>, epoch }. The host it names polls the US (anchor sweep + fast lane).
 *  • the other countries run on the standby; the primary runs them only while no other host reports doing so
 *    (alive:<host>, written every ALIVE_EVERY_MS), so they come back to it by themselves if the standby stops.
 *  • nothing runs without a writable database (a replica-only view cannot ingest).
 *  • takeover: the standby promotes its replica when, for PROMOTE_AFTER checks in a row, it cannot reach the
 *    primary database AND the site (Vercel, a third vantage point) reports the same. Its own view alone never
 *    suffices: that could be its own network. The promoted database gets epoch + 1, and becomes the primary.
 *  • an old primary that comes back finds a writable database with a higher epoch, writes that into its own
 *    cluster record (so nothing ever picks it again) and stops polling: it is fenced.
 */
import { sql } from "drizzle-orm";
import { db } from "../db";

export type PollerRole = "primary" | "standby";
export interface ClusterRecord { primary: string; epoch: number; fencedAt?: string }
export interface AliveRecord { host: string; at: string; role: PollerRole; duties: string; epoch?: number }

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
  const us = owner === i.me;
  if (!i.intlConfigured) return { us, intl: false, fenced: false, why: us ? "cluster primary" : "standby, no egress for other countries" };
  const othersRunIntl = i.alive.some((a) => a.host !== i.me && a.duties.includes("intl") && i.now.getTime() - new Date(a.at).getTime() < ALIVE_FRESH_MS);
  // The cluster primary hands the other countries to whoever else runs them; anyone else simply runs them.
  const intl = us ? !othersRunIntl : true;
  return { us, intl, fenced: false, why: us ? (intl ? "cluster primary, other countries too" : "cluster primary, other countries elsewhere") : "standby: other countries" };
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

export async function readAlive(): Promise<AliveRecord[]> {
  const rows = (await db().execute(sql`select value from poller_state where key like 'alive:%' and updated_at > now() - interval '10 minutes'`)).rows as { value: AliveRecord }[];
  return rows.map((r) => r.value);
}

/** The other-country stats of whichever host runs them (its alive record), for the watchdog and health. */
export async function intlRunner(): Promise<{ host: string; at: string; intl: Record<string, unknown> } | null> {
  const rows = (await db().execute(sql`select value from poller_state where key like 'alive:%' and updated_at > now() - make_interval(secs => ${ALIVE_FRESH_MS / 1000}) and value->>'duties' like '%intl%' order by updated_at desc limit 1`)).rows as { value: AliveRecord & { intl?: Record<string, unknown> } }[];
  const v = rows[0]?.value;
  return v?.intl ? { host: v.host, at: v.at, intl: v.intl } : null;
}
