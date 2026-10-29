CREATE TABLE "ops_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text NOT NULL,
	"level" text DEFAULT 'info' NOT NULL,
	"message" text NOT NULL,
	"data" jsonb
);
--> statement-breakpoint
CREATE INDEX "ops_log_at_idx" ON "ops_log" USING btree ("at");--> statement-breakpoint
CREATE INDEX "ops_log_source_idx" ON "ops_log" USING btree ("source","at");