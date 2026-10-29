ALTER TABLE "availability_events" ADD COLUMN "first_seen" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "events_store_idx" ON "availability_events" USING btree ("store_number","at");--> statement-breakpoint
-- backfill: the earliest restock we recorded for each (store, part) was a first sighting, not a restock
UPDATE "availability_events" SET "first_seen" = true WHERE "kind" = 'restock' AND "id" IN (SELECT min("id") FROM "availability_events" WHERE "kind" = 'restock' GROUP BY "store_number", "part_number");
