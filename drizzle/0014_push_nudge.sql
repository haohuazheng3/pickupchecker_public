-- Members whose alerts go by email (no device with notifications on) get one "turn on notifications" email, at most
-- every 14 days (owner 2026-11-05: email is the fallback, the phone banner is the product). Additive, safe to re-run.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "push_nudge_sent_at" timestamp with time zone;
