-- A downgrade waits for the next renewal (2026-11-11, owner: switching down is never refunded or credited).
-- The plan the subscription renews on when it is lower than the one paid for this period; null = no change waiting.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS next_plan text;
