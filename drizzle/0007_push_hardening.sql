ALTER TABLE "push_subscriptions" ADD COLUMN IF NOT EXISTS "fail_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD COLUMN IF NOT EXISTS "expiration_time" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD COLUMN IF NOT EXISTS "app_server_key" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "push_stopped_notified_at" timestamp with time zone;