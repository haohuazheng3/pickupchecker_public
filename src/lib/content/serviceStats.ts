/**
 * Measured service figures (2026-11-09): what PickupChecker actually achieves, next to what it plans. Answer engines
 * told us a planned "every 5 seconds" is worth less than a measured interval with its sample, window and limits, and
 * that "push sent" must never be presented as "your phone received it". So this module reports:
 *
 *  • check intervals per lane, from check_gaps_hourly (migration 0016, written hourly by infra/linode/poll-rollup.sh):
 *    fast-us / fast-intl = seconds between two successful single-store answers for a store a paid alert points at;
 *    round-us / round-intl = seconds between the starts of two full rounds that cover every store. Windows add the
 *    hourly histograms (0.1-second buckets up to 30 s), so percentiles are interpolated inside a 0.1 s bucket;
 *  • alert delivery, from notifications joined to availability_events: seconds from the first check that saw the
 *    configuration available (the event's time, before the second confirming answer) to the moment the push service
 *    (Apple / Google / Mozilla) or the mail service accepted the alert. Device arrival is not measured: we cannot see
 *    it, and the page says so;
 *  • push outcomes: accepted, rejected, devices the push service retired (404/410).
 *
 * Cached an hour. JSON-safe. Pure helpers (`percentileFromHist`, `laneFrom`) are exported for tests.
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db, hasDatabase } from "../db";
import { recordError, errorMessage } from "../errors";

export type Lane = "fast-us" | "fast-intl" | "round-us" | "round-intl";
export const LANES: Lane[] = ["fast-us", "fast-intl", "round-us", "round-intl"];
export type Window = "24h" | "7d" | "30d";
export const WINDOWS: Record<Window, number> = { "24h": 1, "7d": 7, "30d": 30 };

/** Planned intervals, the promise the measured numbers are held against (src/lib/plans.ts SPEED says the same). */
export const PLANNED_SEC: Record<Lane, number> = { "fast-us": 5, "fast-intl": 5, "round-us": 15, "round-intl": 15 };

export interface LaneStats {
  /** Intervals measured in the window. */
  gaps: number;
  /** Hours with data in the window (a lane with fewer hours than the window has a shorter record). */
  hours: number;
  /** First hour with data in the window (ISO). */
  from: string;
  p50Sec: number;
  p95Sec: number;
  p99Sec: number;
  /** Longest single interval in the window. */
  maxSec: number;
  /** Share of intervals at or under the planned interval + 1 s, and under 10 s (fast lanes) / 20 s (rounds). */
  onPlan: number;
  under: number;
}

export interface DeliveryStats {
  /** Restock events that produced at least one accepted alert on this channel. */
  events: number;
  p50Sec: number;
  p90Sec: number;
  p95Sec: number;
  maxSec: number;
}

export interface ServiceStats {
  at: string;
  /** First hour of each lane's record (null: no data yet). */
  since: Record<Lane, string | null>;
  lanes: Record<Window, Record<Lane, LaneStats | null>>;
  delivery: Record<"7d" | "30d", { push: DeliveryStats | null; email: DeliveryStats | null }>;
  /** Push outcomes over 7 days: alerts the push services accepted / rejected, devices they retired. */
  push7d: { accepted: number; rejected: number; retiredDevices: number };
}

const EMPTY_LANES = (): Record<Lane, LaneStats | null> => ({ "fast-us": null, "fast-intl": null, "round-us": null, "round-intl": null });
export const EMPTY_SERVICE_STATS: ServiceStats = {
  at: new Date(0).toISOString(),
  since: { "fast-us": null, "fast-intl": null, "round-us": null, "round-intl": null },
  lanes: { "24h": EMPTY_LANES(), "7d": EMPTY_LANES(), "30d": EMPTY_LANES() },
  delivery: { "7d": { push: null, email: null }, "30d": { push: null, email: null } },
  push7d: { accepted: 0, rejected: 0, retiredDevices: 0 },
};

/** Histogram layout (migration 0016): BUCKETS buckets of BUCKET_SEC seconds; the last holds everything from its start up. */
export const BUCKET_SEC = 0.1;
export const BUCKETS = 301;

/**
 * Pure: the q-quantile (0–1) of the hourly histogram (bucket i = i·0.1 to (i+1)·0.1 s, the last = 30 s or more), with
 * linear interpolation inside the bucket. Returns seconds, one decimal.
 */
export function percentileFromHist(hist: number[], q: number): number {
  const total = hist.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const target = q * total;
  let seen = 0;
  for (let i = 0; i < hist.length; i++) {
    const c = hist[i];
    if (c > 0 && seen + c >= target) {
      if (i === hist.length - 1) return Math.round(i * BUCKET_SEC * 10) / 10; // the open-ended last bucket: "30 s or more"
      const within = (target - seen) / c;
      return Math.round((i + Math.min(1, Math.max(0, within))) * BUCKET_SEC * 10) / 10;
    }
    seen += c;
  }
  return Math.round((hist.length - 1) * BUCKET_SEC * 10) / 10;
}

/** Pure: share of intervals under `sec` seconds (whole buckets below it, the bucket it falls in prorated). */
export function shareUnder(hist: number[], sec: number): number {
  const total = hist.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const at = sec / BUCKET_SEC;
  let n = 0;
  for (let i = 0; i < hist.length; i++) {
    if (i + 1 <= at) n += hist[i];
    else if (i < at) n += hist[i] * (at - i);
  }
  return n / total;
}

/** Pure: one lane's figures from its hourly rows. */
export function laneFrom(lane: Lane, rows: { hour: string; hist: number[]; maxMs: number | null }[]): LaneStats | null {
  if (rows.length === 0) return null;
  const hist = new Array(BUCKETS).fill(0) as number[];
  let max = 0, from = rows[0].hour;
  for (const r of rows) {
    r.hist.forEach((c, i) => { hist[Math.min(BUCKETS - 1, i)] += Number(c) || 0; });
    max = Math.max(max, r.maxMs ?? 0);
    if (r.hour < from) from = r.hour;
  }
  const gaps = hist.reduce((a, b) => a + b, 0);
  if (gaps === 0) return null;
  const planned = PLANNED_SEC[lane];
  return {
    gaps,
    hours: rows.length,
    from,
    p50Sec: percentileFromHist(hist, 0.5),
    p95Sec: percentileFromHist(hist, 0.95),
    p99Sec: percentileFromHist(hist, 0.99),
    maxSec: Math.round(max / 100) / 10,
    onPlan: shareUnder(hist, planned + 1),
    under: shareUnder(hist, lane.startsWith("fast") ? 10 : 20),
  };
}

const cached = unstable_cache(
  async (): Promise<ServiceStats> => {
    const d = db();
    const iso = (v: string | Date) => new Date(v).toISOString();
    const gapRows = (await d.execute(sql`
      select hour, lane, hist, max_ms from check_gaps_hourly where hour > now() - interval '30 days' order by hour`)).rows as { hour: string | Date; lane: Lane; hist: number[]; max_ms: number | null }[];
    const sinceRows = (await d.execute(sql`select lane, min(hour) as since from check_gaps_hourly group by lane`)).rows as { lane: Lane; since: string | Date }[];
    const now = Date.now();
    const lanes = { "24h": EMPTY_LANES(), "7d": EMPTY_LANES(), "30d": EMPTY_LANES() } as ServiceStats["lanes"];
    for (const w of Object.keys(WINDOWS) as Window[]) {
      const cut = now - WINDOWS[w] * 86400_000;
      for (const lane of LANES) {
        lanes[w][lane] = laneFrom(lane, gapRows.filter((r) => r.lane === lane && new Date(r.hour).getTime() >= cut).map((r) => ({ hour: iso(r.hour), hist: r.hist, maxMs: r.max_ms })));
      }
    }
    const since = { ...EMPTY_SERVICE_STATS.since };
    for (const r of sinceRows) if (LANES.includes(r.lane)) since[r.lane] = iso(r.since);

    // First accepted alert per restock event and channel, measured from the event (the first check that saw it).
    const deliveryRows = (await d.execute(sql`
      with first_send as (
        select n.event_id, n.channel, min(n.created_at + coalesce(n.latency_ms, 0) * interval '1 millisecond') as sent_at
        from notifications n where n.status = 'sent' and n.created_at > now() - interval '30 days' group by 1, 2)
      select f.channel, (f.sent_at > now() - interval '7 days') as recent, extract(epoch from f.sent_at - e.at)::float8 as secs
      from first_send f join availability_events e on e.id = f.event_id
      where f.sent_at >= e.at`)).rows as { channel: "push" | "email"; recent: boolean; secs: number }[];
    const stat = (v: number[]): DeliveryStats | null => {
      if (v.length === 0) return null;
      const s = [...v].sort((a, b) => a - b);
      const q = (p: number) => Math.round(s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] * 10) / 10;
      return { events: s.length, p50Sec: q(0.5), p90Sec: q(0.9), p95Sec: q(0.95), maxSec: Math.round(s[s.length - 1] * 10) / 10 };
    };
    const pick = (channel: "push" | "email", recentOnly: boolean) => stat(deliveryRows.filter((r) => r.channel === channel && (!recentOnly || r.recent)).map((r) => Number(r.secs)));
    const [outcomes] = (await d.execute(sql`
      select count(*) filter (where status = 'sent')::int as accepted, count(*) filter (where status = 'failed')::int as rejected,
             (select count(*)::int from push_subscriptions where disabled_at > now() - interval '7 days') as retired
      from notifications where channel = 'push' and created_at > now() - interval '7 days'`)).rows as { accepted: number; rejected: number; retired: number }[];
    return {
      at: new Date().toISOString(),
      since,
      lanes,
      delivery: { "7d": { push: pick("push", true), email: pick("email", true) }, "30d": { push: pick("push", false), email: pick("email", false) } },
      push7d: { accepted: outcomes?.accepted ?? 0, rejected: outcomes?.rejected ?? 0, retiredDevices: outcomes?.retired ?? 0 },
    };
  },
  ["service-stats-v1"],
  { revalidate: 3600 },
);

export async function serviceStats(): Promise<ServiceStats> {
  if (!hasDatabase()) return EMPTY_SERVICE_STATS;
  try {
    return await cached();
  } catch (e) {
    await recordError("web", `service stats: ${errorMessage(e)}`).catch(() => undefined);
    return EMPTY_SERVICE_STATS;
  }
}

/** "about 5.1 s": a measured interval as the site writes it in English. */
export const secs = (s: number) => `${s < 10 ? s.toFixed(1) : Math.round(s)} s`;
