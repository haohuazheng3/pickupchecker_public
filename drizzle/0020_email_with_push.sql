-- A member can ask for both: the push to their device and the email (2026-11-18, a Mac member whose email went quiet
-- once Safari notifications were on). Off by default; set by hand: UPDATE users SET email_with_push = true WHERE email = '…'.
-- A constant default makes this a catalog-only change on Postgres 11+ (no table rewrite).
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_with_push boolean NOT NULL DEFAULT false;
