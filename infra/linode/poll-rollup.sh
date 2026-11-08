#!/usr/bin/env bash
# Hourly (pickupchecker-poll-rollup.timer, :07 UTC) and again at the start of db-maintenance.sh:
#  1. Roll every complete hour of poll_log that poll_hourly does not have yet into poll_hourly (kept forever:
#     requests, failures, timeouts, p50/p95/max duration, bytes, HTTP statuses and error kinds per
#     hour × lane × country × egress; function poll_log_rollup, migration 0015).
#  2. Delete raw poll_log rows older than KEEP_DAYS (3) in batches of 50k (smooth WAL to the standby and disk I/O
#     while the pollers keep writing). A row goes only if its own hour has a summary row: on 2026-11-07 the first
#     version cut at "the last rolled hour" while older hours had never been rolled and deleted 750k unsummarised
#     rows (restored from the nightly dump the same hour), so the check is per row now, not per cut-off.
# NO_TRIM=1 rolls up without deleting anything.
# Owner 2026-11-07: raw request rows are only forensic detail (~5.5M rows, ~1.5 GB a day); the restock history is
# availability_events and is never trimmed. Installed on both database hosts; only the primary does anything.
# NOTIFY=1 (set by db-maintenance.sh) mails the owner on failure; the hourly run only writes ops_log.
set -uo pipefail
exec 9>/run/pickupchecker-poll-rollup.lock
flock -n 9 || { echo "another roll-up is running"; exit 0; }
P=(sudo -u postgres psql -v ON_ERROR_STOP=1 -qX -d pickupchecker)
[ "$("${P[@]}" -tAc 'select pg_is_in_recovery()' 2>/dev/null)" = "f" ] || exit 0
KEEP_DAYS=${KEEP_DAYS:-3}
BATCH=50000
log() { printf "insert into ops_log (source, level, message, data) values ('host', :'lvl', :'msg', :'data'::jsonb);\n" | "${P[@]}" -v lvl="$1" -v msg="$2" -v data="$3" >/dev/null 2>&1 || true; }
val() { sed -n "s/^$1=//p" /opt/pickupchecker/poller.env | head -1 | sed 's/^"\(.*\)"$/\1/'; }
fail() {
  log error "poll_log roll-up failed" "$(python3 -c 'import json,sys; print(json.dumps({"step": sys.argv[1], "error": sys.argv[2][-600:]}))' "$1" "$2")"
  echo "FAILED at $1: $2"
  if [ "${NOTIFY:-0}" = 1 ]; then
    /opt/pickupchecker/owner-mail.sh "[PickupChecker] poll_log roll-up failed" \
      "$(printf 'The hourly summary of the request log failed at step "%s" on the database host, so no raw rows were deleted (the disk keeps filling until it is fixed).\n\n%s' "$1" "$2")" || true
  fi
  exit 1
}

# 1. Roll up every complete hour that still has raw rows and no summary yet, oldest first (gaps included).
hours=$("${P[@]}" -tAc "
  select h from generate_series((select date_trunc('hour', min(at)) from poll_log), date_trunc('hour', now()) - interval '1 hour', interval '1 hour') h
  where not exists (select 1 from poll_hourly s where s.hour = h)
    and exists (select 1 from poll_log p where p.at >= h and p.at < h + interval '1 hour')
  order by h" 2>&1) || fail rollup-plan "$hours"
rolled=0 rows=0
while IFS= read -r h; do
  [ -n "$h" ] || continue
  n=$("${P[@]}" -tAc "select poll_log_rollup('$h'::timestamptz, '$h'::timestamptz + interval '1 hour')" 2>&1) || fail "rollup $h" "$n"
  rolled=$((rolled + 1)) rows=$((rows + n))
done <<< "$hours"

# 2. Trim: older than KEEP_DAYS, and only rows whose hour is in poll_hourly.
cutoff=$("${P[@]}" -tAc "select now() - interval '$KEEP_DAYS days'" 2>&1) || fail trim-cutoff "$cutoff"
deleted=0
if [ "${NO_TRIM:-0}" != 1 ] && [ -n "$cutoff" ]; then
  for _ in $(seq 1 600); do
    n=$("${P[@]}" -tAc "with d as (delete from poll_log where id in (
          select p.id from poll_log p
          where p.at < '$cutoff'::timestamptz and exists (select 1 from poll_hourly s where s.hour = date_trunc('hour', p.at))
          limit $BATCH) returning 1)
        select count(*) from d" 2>&1) || fail trim "$n"
    deleted=$((deleted + n))
    [ "$n" -lt "$BATCH" ] && break
    sleep 1
  done
fi

summary=$("${P[@]}" -tAc "select json_build_object('hours_rolled', $rolled, 'summary_rows', $rows, 'raw_deleted', $deleted, 'cutoff', '${cutoff:-}',
  'poll_log_bytes', pg_total_relation_size('poll_log'), 'poll_hourly_bytes', pg_total_relation_size('poll_hourly'),
  'disk_free_bytes', $(df -B1 --output=avail /var/lib/postgresql | tail -1 | tr -d ' '))")
[ "$rolled" -gt 0 ] || [ "$deleted" -gt 0 ] && log info "poll_log rolled up and trimmed" "$summary"
echo "$summary"
