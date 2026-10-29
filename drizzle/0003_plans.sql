ALTER TABLE "subscriptions" ALTER COLUMN "model" SET DEFAULT 'all';--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "plan" text DEFAULT 'plus' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "alert_limit" integer DEFAULT 10 NOT NULL;