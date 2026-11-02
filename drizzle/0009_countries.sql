-- Other countries (docs/i18n.md): additive only, safe to re-run. Existing US rows keep every value they had;
-- the defaults make them US. stores.timezone already exists (0000) and is now written for non-US stores.
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "country" text DEFAULT 'US' NOT NULL;--> statement-breakpoint
-- The level between country and city in Apple's store list (US: the state, which state keeps carrying too).
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "region" text;--> statement-breakpoint
UPDATE "stores" SET "region" = "state" WHERE "region" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stores_country_idx" ON "stores" ("country");--> statement-breakpoint
-- Which country's request a poll_log row belongs to: null = the US (every row written before this, and every
-- US row after it), else the lower-case site code ("uk", "jp"). The per-store sweep of other countries logs
-- failures only, so US request statistics filter on "country" IS NULL.
ALTER TABLE "poll_log" ADD COLUMN IF NOT EXISTS "country" text;
