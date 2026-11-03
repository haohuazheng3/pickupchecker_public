-- The person's language (docs/i18n.md §6): a native locale id ("ja-jp", "de-ch"…) or null for English.
-- Pushes, alert emails and Stripe pages follow it. Additive, safe to re-run.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locale" text;
