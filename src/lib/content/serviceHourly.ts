/**
 * Two small reads for /service-report (2026-11-09), next to serviceStats.ts:
 *
 *  • serviceHourly(): the last 7 days of check_gaps_hourly (migration 0016) per hour and lane, with that hour's exact
 *    median and p95 interval, for the hour-by-hour chart. Cached an hour (the table is rolled up hourly).
 *  • latestRestockTimeline(): one real restock, stage by stage, picked by a fixed rule (the most recent restock in the
 *    last 2 days that sent a push and has since sold out), so the example is never hand-picked. Only public facts
 *    and timings: the store, the configuration, when each check answered, when the alert was handed to the push
 *    service and when the push service accepted it. No account, device or person appears. Cached 5 minutes.
 *
 * Timestamps (all from our own logs):
 *  - poll_log.at is written when Apple's answer arrives (fastlane.ts / sweep.ts), so it is the answer time;
 *  - an event's `at` is the first answer that saw the change (ingest.ts commits it with the pending start);
 *  - notifications.created_at is when alerting for the event started (notify.ts), latency_ms how long the push
 *    service took to accept it, so created_at + latency_ms is the acceptance;
 *  - a sell-out's seen_until is the last answer that still listed it, its `at` the first that saw it gone.
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db, hasDatabase } from "../db";
import { recordError, errorMessage } from "../errors";
import type { Lane } from "./serviceStats";

export interface HourPoint {
  /** ISO hour (UTC). */
  hour: string;
  lane: Lane;
  gaps: number;
  p50Sec: number | null;
  p95Sec: number | null;
}

const hourlyCached = unstable_cache(
  async (): Promise<HourPoint[]> => {
    const rows = (await db().execute(sql`
      select hour, lane, gaps, p50_ms, p95_ms from check_gaps_hourly
      where hour > now() - interval '7 days' order by hour, lane`)).rows as { hour: string | Date; lane: Lane; gaps: number; p50_ms: number | null; p95_ms: number | null }[];
    const sec = (ms: number | null) => (ms == null ? null : Math.round(ms / 100) / 10);
    return rows.map((r) => ({ hour: new Date(r.hour).toISOString(), lane: r.lane, gaps: Number(r.gaps), p50Sec: sec(r.p50_ms), p95Sec: sec(r.p95_ms) }));
  },
  ["service-hourly-v1"],
  { revalidate: 3600 },
);

export async function serviceHourly(): Promise<HourPoint[]> {
  if (!hasDatabase()) return [];
  try {
    return await hourlyCached();
  } catch (e) {
    await recordError("web", `service hourly: ${errorMessage(e)}`).catch(() => undefined);
    return [];
  }
}

export interface RestockTimeline {
  storeNumber: string;
  partNumber: string;
  /** The last successful answer for that store before the restock, which did not list it (null: not attributable). */
  prevCheck: string | null;
  /** The first answer that listed it. */
  firstSeen: string;
  /** The second answer that agreed (the confirmation); null when not found in the 3-day request log. */
  confirmed: string | null;
  /** Alerting for the restock started (handed to the push service). */
  handed: string | null;
  /** The push service accepted the first and the last push for this restock. */
  acceptedFirst: string | null;
  acceptedLast: string | null;
  /** Pushes the push services accepted for this restock. */
  pushes: number;
  /** The last answer that still listed it, and the first that saw it gone. */
  lastListed: string | null;
  goneSeen: string | null;
}

const timelineCached = unstable_cache(
  async (): Promise<RestockTimeline | null> => {
    const iso = (v: string | Date | null) => (v == null ? null : new Date(v).toISOString());
    const [r] = (await db().execute(sql`
      with ev as (
        select e.id, e.store_number, e.part_number, e.at
        from availability_events e
        where e.kind = 'restock' and not e.first_seen and e.at > now() - interval '2 days'
          and exists (select 1 from notifications n where n.event_id = e.id and n.channel = 'push' and n.status = 'sent')
          and exists (select 1 from availability_events s where s.kind = 'soldout' and s.store_number = e.store_number and s.part_number = e.part_number and s.at > e.at and s.at < e.at + interval '1 day')
        order by e.at desc limit 1)
      select ev.store_number, ev.part_number, ev.at as first_seen,
        (select max(p.at) from poll_log p where p.anchor = 'store:' || ev.store_number and p.ok
           and p.at > ev.at - interval '2 minutes' and p.at < ev.at - interval '200 milliseconds') as prev_check,
        (select min(p.at) from poll_log p where p.anchor = 'confirm:' || ev.store_number and p.ok
           and p.at > ev.at and p.at < ev.at + interval '1 minute') as confirmed,
        n.handed, n.accepted_first, n.accepted_last, n.pushes,
        so.seen_until as last_listed, so.at as gone_seen
      from ev
      cross join lateral (
        select min(x.created_at) as handed,
               min(x.created_at + coalesce(x.latency_ms, 0) * interval '1 millisecond') as accepted_first,
               max(x.created_at + coalesce(x.latency_ms, 0) * interval '1 millisecond') as accepted_last,
               count(*)::int as pushes
        from notifications x where x.event_id = ev.id and x.channel = 'push' and x.status = 'sent') n
      left join lateral (
        select s.at, s.seen_until from availability_events s
        where s.kind = 'soldout' and s.store_number = ev.store_number and s.part_number = ev.part_number and s.at > ev.at
        order by s.at limit 1) so on true`)).rows as {
      store_number: string; part_number: string; first_seen: string | Date; prev_check: string | Date | null; confirmed: string | Date | null;
      handed: string | Date | null; accepted_first: string | Date | null; accepted_last: string | Date | null; pushes: number;
      last_listed: string | Date | null; gone_seen: string | Date | null;
    }[];
    if (!r) return null;
    return {
      storeNumber: r.store_number, partNumber: r.part_number, firstSeen: iso(r.first_seen)!, prevCheck: iso(r.prev_check), confirmed: iso(r.confirmed),
      handed: iso(r.handed), acceptedFirst: iso(r.accepted_first), acceptedLast: iso(r.accepted_last), pushes: Number(r.pushes) || 0,
      lastListed: iso(r.last_listed), goneSeen: iso(r.gone_seen),
    };
  },
  ["service-timeline-v1"],
  { revalidate: 300 },
);

export async function latestRestockTimeline(): Promise<RestockTimeline | null> {
  if (!hasDatabase()) return null;
  try {
    return await timelineCached();
  } catch (e) {
    await recordError("web", `service timeline: ${errorMessage(e)}`).catch(() => undefined);
    return null;
  }
}

/** Pure: seconds from the first sighting to `iso`, one decimal, signed ("+1.8 s", "−7.6 s"); null stays null. */
export function offsetSec(firstSeen: string, iso: string | null): number | null {
  if (!iso) return null;
  return Math.round((new Date(iso).getTime() - new Date(firstSeen).getTime()) / 100) / 10;
}
