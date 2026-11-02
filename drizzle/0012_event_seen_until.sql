-- Sell-outs record the last check that still saw the pair available, so how long each restock lasted is known to
-- the spacing of two checks (5 s for stores with alerts, ~15 s otherwise): "sold out 45–60 s after it appeared".
-- Older sell-outs have none; pages bound them by the 15 s round instead and say so. Additive, safe to re-run.
ALTER TABLE "availability_events" ADD COLUMN IF NOT EXISTS "seen_until" timestamp with time zone;
