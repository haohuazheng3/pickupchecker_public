-- Replace poll_log's (ok, at) index with a partial index of the failed requests only. On the 1 GB database host
-- (linode-1, shared by PickupChecker, RestockWire and ShelfSpring) the old one was 938 MB, maintained on every insert
-- (~300k rows an hour) and scanned ~1,000 times in two weeks (admin failure filter, ops review); no page a visitor sees used it. The failures the admin filter and the ops review look for
-- are a few thousand rows, so the partial index is a few hundred kB. Both steps were done by hand on 2026-11-16 with
-- CREATE INDEX CONCURRENTLY / DROP INDEX CONCURRENTLY (no lock on the pollers' writes), so on production this file is a
-- no-op; it keeps fresh databases the same. Create first, then drop, so failure lookups never lose their index.
-- Guarded by a catalog lookup, not CREATE INDEX IF NOT EXISTS: that form still takes a SHARE lock on poll_log (blocking
-- the pollers' inserts until this transaction ends) before it notices the index exists.
DO $$
BEGIN
  IF to_regclass('public.poll_log_failed_at_idx') IS NULL THEN
    CREATE INDEX "poll_log_failed_at_idx" ON "public"."poll_log" USING btree ("at") WHERE NOT "ok";
  END IF;
END $$;
--> statement-breakpoint
DROP INDEX IF EXISTS "public"."poll_log_ok_idx";
