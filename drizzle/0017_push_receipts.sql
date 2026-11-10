-- Push delivery receipts (2026-11-10). A push service answering 201 only means it queued the push; three paying
-- members wrote that they never saw alerts we had sent. The service worker now posts a signed receipt the moment the
-- phone receives a push (public/sw.js → /api/push/receipt): notifications.delivered_at = the first device that
-- reported it, push_subscriptions.last_delivered_at = that device's latest. Null = sent but never confirmed (pushes
-- before this migration, or a phone that is off, has notifications turned off, or dropped the app).
-- Additive, nullable, no default: a metadata-only change, safe to re-run.
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "delivered_at" timestamp with time zone;
ALTER TABLE "push_subscriptions" ADD COLUMN IF NOT EXISTS "last_delivered_at" timestamp with time zone;
