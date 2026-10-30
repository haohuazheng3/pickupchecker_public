ALTER TABLE "store_sku_status" ADD COLUMN "pending_status" text;--> statement-breakpoint
ALTER TABLE "store_sku_status" ADD COLUMN "pending_since" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "store_sku_status" ADD COLUMN "pending_seen" integer DEFAULT 0 NOT NULL;