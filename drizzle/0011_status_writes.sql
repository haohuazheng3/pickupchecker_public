-- store_sku_status is rewritten about 2,000 rows a second. Every observation of an in-stock pair moves
-- last_available_at, which this index covered, so those updates could never be HOT: each one also inserted into
-- all three indexes (about 45% of all WAL, measured 2026-11-02). The index was never scanned. Fillfactor keeps
-- room on each page so the updates stay on their page (HOT) and touch no index. Safe to re-run.
DROP INDEX IF EXISTS "sss_last_available_idx";--> statement-breakpoint
ALTER TABLE "store_sku_status" SET (fillfactor = 70);
