#!/usr/bin/env bash
# One-off: copy what only Neon has into the Postgres on this host. Neon suspended the old database on
# 2026-10-30 (free-tier egress) until its quota resets on 2026-11-01 00:00 UTC; the site has run on this
# host's database since. Rows written here win every conflict (ON CONFLICT DO NOTHING) and old ids never
# collide (sequences here start at 100,000,000). Live state (store statuses, poller state, the raw poll
# log, sweeps, rate limits) is skipped: the copy here is newer. Emails the owner a summary when done.
#
#   bash neon-merge.sh [target-db]     (pickupchecker-neon-merge.timer runs it once; re-runs are harmless)
#   Source: NEON_URL, else /root/pg-secrets/neon.url.
set -euo pipefail
DB=${1:-pickupchecker}
SRC=${NEON_URL:-$(cat /root/pg-secrets/neon.url)}
DONE=/opt/pickupchecker/.neon-merged-$DB
[ -f "$DONE" ] && { echo "already merged into $DB"; exit 0; }
TABLES=(users subscriptions watches push_subscriptions availability_events notifications stripe_events contact_messages inbox_messages ops_log gsc_daily)
P=(sudo -u postgres psql -v ON_ERROR_STOP=1 -qX -d "$DB")

# Neon wakes once its quota resets; give it two hours.
for i in $(seq 1 12); do
  psql "$SRC" -qXtAc 'select 1' >/dev/null 2>&1 && break
  [ "$i" = 12 ] && { echo "Neon still unreachable"; exit 1; }
  sleep 600
done

"${P[@]}" -c "DROP SCHEMA IF EXISTS neon_import CASCADE; CREATE SCHEMA neon_import"
report=""
for t in "${TABLES[@]}"; do
  cols=$("${P[@]}" -tA -c "select string_agg(quote_ident(column_name), ',' order by ordinal_position) from information_schema.columns where table_schema = 'public' and table_name = '$t'")
  "${P[@]}" -c "CREATE TABLE neon_import.$t (LIKE public.$t)"
  psql "$SRC" -v ON_ERROR_STOP=1 -qX -c "\\copy (select $cols from public.$t) to pstdout" | "${P[@]}" -c "\\copy neon_import.$t ($cols) from pstdin"
  had=$("${P[@]}" -tA -c "select count(*) from neon_import.$t")
  added=$("${P[@]}" -tA -c "with ins as (insert into public.$t ($cols) select $cols from neon_import.$t on conflict do nothing returning 1) select count(*) from ins")
  report+="$t: $added of $had copied"$'\n'
  echo "$t: $added of $had copied"
done
"${P[@]}" -c "DROP SCHEMA neon_import CASCADE"
touch "$DONE"

val() { sed -n "s/^$1=//p" /opt/pickupchecker/poller.env | head -1 | sed 's/^"\(.*\)"$/\1/'; }
URL="$(val MAIL_WORKER_URL)"; TOKEN="$(val MAIL_WORKER_TOKEN)"
if [ "$DB" = pickupchecker ] && [ -n "$URL" ] && [ -n "$TOKEN" ]; then
  python3 -c 'import json,sys; print(json.dumps({"subject": "PickupChecker: Neon data merged", "text": "The rows Neon held since before 2026-10-30 are now in the database on the poller host (existing rows kept):\n\n" + sys.stdin.read()}))' <<<"$report" |
    curl -fsS -m 40 -X POST "${URL%/}/notify" -H "Authorization: Bearer ${TOKEN}" -H "content-type: application/json" --data-binary @- >/dev/null || echo "owner email failed"
fi
