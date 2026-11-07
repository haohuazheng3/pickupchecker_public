-- Hourly summary of poll_log, kept forever (owner 2026-11-07). The raw request log grew from ~0.5M to ~5.5M rows a day
-- once 18 countries and the per-store fast lane joined (≈1.5 GB/day on a 25 GB disk), so raw rows now live 3 days
-- and infra/linode/poll-rollup.sh rolls every complete hour into this table before any row is deleted.
-- Restock history is not here: that is availability_events, which is never trimmed.
-- Written only by the host script; nothing in the app reads it yet. Additive, safe to re-run.
CREATE TABLE IF NOT EXISTS "poll_hourly" (
  "hour" timestamp with time zone NOT NULL,
  "lane" text NOT NULL,          -- fast | confirm | full | degraded | intl | other (sweep row already trimmed)
  "country" text NOT NULL,       -- us | uk | jp …
  "egress" text NOT NULL,        -- ipv6 | vercel | cloudflare | local
  "requests" integer NOT NULL,
  "failures" integer NOT NULL,
  "timeouts" integer NOT NULL,
  "anchors" integer NOT NULL,    -- distinct anchors (ZIPs / stores) asked that hour
  "p50_ms" integer,
  "p95_ms" integer,
  "max_ms" integer,
  "bytes" bigint NOT NULL DEFAULT 0,
  "stores_seen" bigint NOT NULL DEFAULT 0,
  "statuses" jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {"200": n, "502": n, "none": n}
  "errors" jsonb NOT NULL DEFAULT '{}'::jsonb,    -- the 20 commonest error texts, addresses masked: {"timed out after 6 s": n}
  "rolled_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("hour", "lane", "country", "egress")
);
--> statement-breakpoint
-- Re-rolls [p_from, p_to) (whole hours): replaces those hours' summary rows. Only call it for hours whose raw rows
-- are still in poll_log, or the summary for them is lost.
CREATE OR REPLACE FUNCTION poll_log_rollup(p_from timestamptz, p_to timestamptz) RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  n integer;
  f timestamptz := date_trunc('hour', p_from);
  t timestamptz := date_trunc('hour', p_to);
BEGIN
  DELETE FROM poll_hourly WHERE hour >= f AND hour < t;
  WITH r AS MATERIALIZED (
    SELECT date_trunc('hour', p.at) AS hour,
           CASE WHEN p.sweep_id LIKE 'fast:%' THEN 'fast'
                WHEN p.anchor LIKE 'confirm:%' THEN 'confirm'
                ELSE coalesce(s.mode, 'other') END AS lane,
           coalesce(p.country, 'us') AS country,
           split_part(p.egress, ':', 1) AS egress,
           p.anchor, p.ok, p.http_status, p.duration_ms, p.bytes, p.stores_seen,
           CASE WHEN p.error IS NULL THEN NULL
                ELSE left(regexp_replace(p.error, '([0-9a-f]{0,4}:){2,}[0-9a-f]{0,4}|[0-9]{1,3}(\.[0-9]{1,3}){3}', '<ip>', 'gi'), 100) END AS err
    FROM poll_log p LEFT JOIN sweeps s ON s.id = p.sweep_id
    WHERE p.at >= f AND p.at < t
  ), g AS (
    SELECT hour, lane, country, egress,
           count(*)::int AS requests,
           count(*) FILTER (WHERE NOT ok)::int AS failures,
           count(*) FILTER (WHERE err LIKE 'timed out%')::int AS timeouts,
           count(DISTINCT anchor)::int AS anchors,
           percentile_disc(0.5) WITHIN GROUP (ORDER BY duration_ms) AS p50_ms,
           percentile_disc(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_ms,
           max(duration_ms) AS max_ms,
           coalesce(sum(bytes), 0)::bigint AS bytes,
           coalesce(sum(stores_seen), 0)::bigint AS stores_seen
    FROM r GROUP BY 1, 2, 3, 4
  ), st AS (
    SELECT hour, lane, country, egress, jsonb_object_agg(k, c) AS statuses
    FROM (SELECT hour, lane, country, egress, coalesce(http_status::text, 'none') AS k, count(*) AS c FROM r GROUP BY 1, 2, 3, 4, 5) x
    GROUP BY 1, 2, 3, 4
  ), er AS (
    SELECT hour, lane, country, egress, jsonb_object_agg(err, c) AS errors
    FROM (SELECT hour, lane, country, egress, err, c, row_number() OVER (PARTITION BY hour, lane, country, egress ORDER BY c DESC, err) AS rk
          FROM (SELECT hour, lane, country, egress, err, count(*) AS c FROM r WHERE err IS NOT NULL GROUP BY 1, 2, 3, 4, 5) y) x
    WHERE rk <= 20
    GROUP BY 1, 2, 3, 4
  )
  INSERT INTO poll_hourly (hour, lane, country, egress, requests, failures, timeouts, anchors, p50_ms, p95_ms, max_ms, bytes, stores_seen, statuses, errors)
  SELECT g.hour, g.lane, g.country, g.egress, g.requests, g.failures, g.timeouts, g.anchors, g.p50_ms, g.p95_ms, g.max_ms, g.bytes, g.stores_seen,
         coalesce(st.statuses, '{}'::jsonb), coalesce(er.errors, '{}'::jsonb)
  FROM g LEFT JOIN st USING (hour, lane, country, egress) LEFT JOIN er USING (hour, lane, country, egress);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
--> statement-breakpoint
-- With 3 days of rows (~16M), the default 20 % threshold would leave ~3M dead rows before autovacuum frees their
-- space; 5 % (~0.8M, a few hours of trimming) keeps the table from growing past its current size.
ALTER TABLE "poll_log" SET (autovacuum_vacuum_scale_factor = 0.05);
