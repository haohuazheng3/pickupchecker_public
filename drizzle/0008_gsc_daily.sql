CREATE TABLE IF NOT EXISTS "gsc_daily" (
  "date" date NOT NULL,
  "query" text NOT NULL,
  "page" text NOT NULL,
  "device" text NOT NULL,
  "country" text NOT NULL,
  "clicks" integer DEFAULT 0 NOT NULL,
  "impressions" integer DEFAULT 0 NOT NULL,
  "ctr" double precision DEFAULT 0 NOT NULL,
  "position" double precision DEFAULT 0 NOT NULL,
  "fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "gsc_daily_pk" PRIMARY KEY ("date", "query", "page", "device", "country")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gsc_daily_page_idx" ON "gsc_daily" ("page", "date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gsc_daily_query_idx" ON "gsc_daily" ("query", "date");
