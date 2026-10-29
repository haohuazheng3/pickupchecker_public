CREATE TABLE "app_state" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"store_number" text NOT NULL,
	"part_number" text NOT NULL,
	"kind" text NOT NULL,
	"quote" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"sweep_id" text,
	"notified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"subject" text,
	"message" text NOT NULL,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_groups" (
	"fingerprint" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"message" text NOT NULL,
	"sample" jsonb,
	"count" integer DEFAULT 1 NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "inbox_messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"to" text NOT NULL,
	"from" text NOT NULL,
	"subject" text,
	"text" text,
	"html" text,
	"headers" jsonb,
	"auth" jsonb,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"watch_id" text NOT NULL,
	"user_id" text NOT NULL,
	"event_id" integer,
	"store_number" text NOT NULL,
	"part_number" text NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"status" text NOT NULL,
	"provider_id" text,
	"error" text,
	"latency_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"sweep_id" text,
	"egress" text NOT NULL,
	"anchor" text NOT NULL,
	"batch" integer NOT NULL,
	"http_status" integer,
	"ok" boolean NOT NULL,
	"duration_ms" integer,
	"bytes" integer,
	"stores_seen" integer,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "poller_state" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skus" (
	"part_number" text PRIMARY KEY NOT NULL,
	"sku" text NOT NULL,
	"model" text NOT NULL,
	"model_name" text NOT NULL,
	"storage" text NOT NULL,
	"color" text NOT NULL,
	"price_usd" double precision,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_sku_status" (
	"store_number" text NOT NULL,
	"part_number" text NOT NULL,
	"status" text DEFAULT 'unknown' NOT NULL,
	"quote" text,
	"since" timestamp with time zone,
	"last_checked_at" timestamp with time zone,
	"last_changed_at" timestamp with time zone,
	"last_available_at" timestamp with time zone,
	CONSTRAINT "store_sku_status_store_number_part_number_pk" PRIMARY KEY("store_number","part_number")
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"store_number" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"state_code" text NOT NULL,
	"postal_code" text,
	"street" text,
	"phone" text,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"timezone" text,
	"hours" jsonb,
	"image" text,
	"url" text,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"model" text NOT NULL,
	"status" text NOT NULL,
	"price_id" text,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sweeps" (
	"id" text PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"mode" text NOT NULL,
	"host" text NOT NULL,
	"requests" integer DEFAULT 0 NOT NULL,
	"failures" integer DEFAULT 0 NOT NULL,
	"stores_covered" integer DEFAULT 0 NOT NULL,
	"transitions" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"stripe_customer_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "watches" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subscription_id" text,
	"model" text NOT NULL,
	"storages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"colors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"store_numbers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"zip" text,
	"radius_miles" integer,
	"lat" double precision,
	"lng" double precision,
	"active" boolean DEFAULT true NOT NULL,
	"paused" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watches" ADD CONSTRAINT "watches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watches" ADD CONSTRAINT "watches_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_at_idx" ON "availability_events" USING btree ("at");--> statement-breakpoint
CREATE INDEX "events_part_idx" ON "availability_events" USING btree ("part_number","at");--> statement-breakpoint
CREATE INDEX "error_groups_last_idx" ON "error_groups" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "inbox_received_idx" ON "inbox_messages" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_dedupe_idx" ON "notifications" USING btree ("watch_id","event_id");--> statement-breakpoint
CREATE INDEX "poll_log_at_idx" ON "poll_log" USING btree ("at");--> statement-breakpoint
CREATE INDEX "poll_log_ok_idx" ON "poll_log" USING btree ("ok","at");--> statement-breakpoint
CREATE INDEX "sss_part_status_idx" ON "store_sku_status" USING btree ("part_number","status");--> statement-breakpoint
CREATE INDEX "sss_last_available_idx" ON "store_sku_status" USING btree ("last_available_at");--> statement-breakpoint
CREATE INDEX "stores_state_idx" ON "stores" USING btree ("state_code");--> statement-breakpoint
CREATE INDEX "subscriptions_user_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sweeps_started_idx" ON "sweeps" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "watches_user_idx" ON "watches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "watches_model_idx" ON "watches" USING btree ("model");