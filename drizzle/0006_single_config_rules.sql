ALTER TABLE "watches" ADD COLUMN IF NOT EXISTS "deactivated_reason" text;--> statement-breakpoint
-- One rule = one store × one exact configuration. Rules written under the old shape (several
-- storages/colours, a ZIP radius or "all US") stop sending and are flagged for the account page.
UPDATE "watches" SET "active" = false, "deactivated_reason" = 'legacy_shape', "updated_at" = now()
WHERE "active" = true AND (jsonb_array_length("storages") <> 1 OR jsonb_array_length("colors") <> 1 OR jsonb_array_length("store_numbers") <> 1);--> statement-breakpoint
-- The old API never de-duplicated: keep the oldest copy of a repeated store × configuration, retire the rest.
UPDATE "watches" w SET "active" = false, "deactivated_reason" = 'duplicate', "updated_at" = now()
WHERE w."active" = true AND EXISTS (
  SELECT 1 FROM "watches" o WHERE o."active" = true AND o."user_id" = w."user_id" AND o."model" = w."model"
    AND o."storages"->>0 = w."storages"->>0 AND o."colors"->>0 = w."colors"->>0 AND o."store_numbers"->>0 = w."store_numbers"->>0
    AND (o."created_at", o."id") < (w."created_at", w."id"));--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "watches_one_per_config_idx" ON "watches" ("user_id", "model", ("storages"->>0), ("colors"->>0), ("store_numbers"->>0)) WHERE "active" = true;
