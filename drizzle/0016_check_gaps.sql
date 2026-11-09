-- Measured check intervals per hour, kept forever (2026-11-09). Answer engines and readers asked for the interval we
-- actually achieve next to the one we plan ("checked every 5 s"): this table holds, per hour and lane, how long passed
-- between two successful checks, as a histogram (0.1-second buckets) plus exact percentiles for that hour, so any window
-- (24 h, 7 d, 30 d) can be summarised exactly by adding histograms. Written by infra/linode/poll-rollup.sh
-- (function check_gaps_rollup) before raw poll_log rows are trimmed; read by src/lib/content/serviceStats.ts.
--   fast-us / fast-intl  the per-store fast lane (stores a paid alert points at): gap between two successful
--                        single-store answers for the same store (poll_log rows of sweep fast:*, anchor store:R…).
--   round-us / round-intl the full rounds that cover every store: gap between the starts of two rounds (sweeps).
-- Additive, safe to re-run.
CREATE TABLE IF NOT EXISTS "check_gaps_hourly" (
  "hour" timestamp with time zone NOT NULL,
  "lane" text NOT NULL,
  "gaps" integer NOT NULL,
  "hist" integer[] NOT NULL,   -- 301 buckets of 0.1 s: hist[i] = gaps of (i-1)/10 to i/10 seconds for i = 1..300; hist[301] = 30 s or more
  "p50_ms" integer,
  "p95_ms" integer,
  "p99_ms" integer,
  "max_ms" integer,
  "rolled_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("hour", "lane")
);
--> statement-breakpoint
-- Re-computes [p_from, p_to) (whole hours). Gaps are attributed to the hour of the later check; the first gap of the
-- hour looks back up to 5 minutes. Fast-lane gaps need raw poll_log rows (3 days); round gaps need sweeps (14 days).
CREATE OR REPLACE FUNCTION check_gaps_rollup(p_from timestamptz, p_to timestamptz) RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  n integer;
  f timestamptz := date_trunc('hour', p_from);
  t timestamptz := date_trunc('hour', p_to);
BEGIN
  DELETE FROM check_gaps_hourly WHERE hour >= f AND hour < t;
  WITH fast AS (
    SELECT CASE WHEN coalesce(p.country, 'us') = 'us' THEN 'fast-us' ELSE 'fast-intl' END AS lane, p.at,
           lag(p.at) OVER (PARTITION BY p.anchor ORDER BY p.at) AS prev
    FROM poll_log p
    WHERE p.sweep_id LIKE 'fast:%' AND p.anchor LIKE 'store:%' AND p.ok AND p.at >= f - interval '5 minutes' AND p.at < t
  ), rounds AS (
    SELECT CASE WHEN s.mode = 'intl' THEN 'round-intl' ELSE 'round-us' END AS lane, s.started_at AS at,
           lag(s.started_at) OVER (PARTITION BY (s.mode = 'intl') ORDER BY s.started_at) AS prev
    FROM sweeps s
    WHERE s.mode IN ('full', 'intl') AND s.started_at >= f - interval '5 minutes' AND s.started_at < t
  ), g AS MATERIALIZED (
    -- A store leaves the fast lane when no paid alert points at it any more and may come back later: a gap over
    -- 5 minutes is that absence, not a slow check, so it is not an interval of the lane. Round gaps keep every gap
    -- (a pause between two full rounds is a real outage of the whole lane).
    SELECT date_trunc('hour', at) AS hour, lane, (extract(epoch FROM at - prev) * 1000)::int AS ms FROM fast WHERE prev IS NOT NULL AND at >= f AND at - prev <= interval '5 minutes'
    UNION ALL
    SELECT date_trunc('hour', at), lane, (extract(epoch FROM at - prev) * 1000)::int FROM rounds WHERE prev IS NOT NULL AND at >= f
  ), b AS (
    SELECT hour, lane, least(ms / 100, 300) AS bucket, count(*)::int AS c FROM g GROUP BY 1, 2, 3
  ), h AS (
    SELECT k.hour, k.lane, array_agg(coalesce(b.c, 0) ORDER BY s.i) AS hist
    FROM (SELECT DISTINCT hour, lane FROM b) k
    CROSS JOIN generate_series(0, 300) AS s(i)
    LEFT JOIN b ON b.hour = k.hour AND b.lane = k.lane AND b.bucket = s.i
    GROUP BY k.hour, k.lane
  ), p AS (
    SELECT hour, lane, count(*)::int AS gaps,
           percentile_disc(0.5) WITHIN GROUP (ORDER BY ms) AS p50_ms,
           percentile_disc(0.95) WITHIN GROUP (ORDER BY ms) AS p95_ms,
           percentile_disc(0.99) WITHIN GROUP (ORDER BY ms) AS p99_ms,
           max(ms) AS max_ms
    FROM g GROUP BY 1, 2
  )
  INSERT INTO check_gaps_hourly (hour, lane, gaps, hist, p50_ms, p95_ms, p99_ms, max_ms)
  SELECT p.hour, p.lane, p.gaps, h.hist, p.p50_ms, p.p95_ms, p.p99_ms, p.max_ms
  FROM p JOIN h USING (hour, lane);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
