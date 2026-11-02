-- Restock reports published by other trackers (scripts/import-restock-reports.ts reads data/restock-reports/*.json,
-- which stays in the private repo). Kept apart from availability_events on purpose: a report is not one of
-- PickupChecker's confirmed restocks, so it never reaches a count, a feed, an alert or a facts token; pages draw it
-- only as a separate, labelled series. Additive only, safe to re-run.
CREATE TABLE IF NOT EXISTS "restock_reports" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "store_number" text NOT NULL,
  "part_number" text NOT NULL,
  "at" timestamp with time zone NOT NULL,
  "source" text NOT NULL,
  "source_url" text,
  "kind" text NOT NULL,
  "imported_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "restock_reports_store_part_at_source_key" UNIQUE ("store_number", "part_number", "at", "source")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "restock_reports_store_idx" ON "restock_reports" ("store_number", "at");
