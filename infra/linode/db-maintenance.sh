#!/usr/bin/env bash
# Daily, after the 09:30 dump (pickupchecker-db-maintenance.timer, 10:00 UTC):
#  0. poll-rollup.sh once more (it also runs hourly): poll_log is summarised into poll_hourly (kept forever) and
#     raw rows older than 3 days go. The nightly run mails the owner if that fails, and below 3 GB of free disk.
#  1. Trim what grows by itself: sweeps keep 14 days, ops_log debug ticks 3 days and the rest 60, expired
#     rate-limit rows go. Nothing a user made is touched; availability_events (restock history) is never trimmed.
#  2. Off-host copy: the database minus those logs, restored over the Neon project that held it before
#     2026-10-30 (free tier: a restore is ingress, a minute of compute). Only once the one-off merge has
#     taken what Neon held, because the restore replaces Neon's tables; one transaction, so a failed run
#     leaves yesterday's copy. A failure mails the owner. Each run leaves a line in ops_log (source host).
set -uo pipefail
P=(sudo -u postgres psql -v ON_ERROR_STOP=1 -qX -d pickupchecker)
# Installed on both hosts; only the one whose database is the primary does anything (a replica is read-only).
[ "$("${P[@]}" -tAc 'select pg_is_in_recovery()' 2>/dev/null)" = "f" ] || exit 0
log() { printf "insert into ops_log (source, level, message, data) values ('host', :'lvl', :'msg', :'data'::jsonb);\n" | "${P[@]}" -v lvl="$1" -v msg="$2" -v data="$3" >/dev/null 2>&1 || true; }
val() { sed -n "s/^$1=//p" /opt/pickupchecker/poller.env | head -1 | sed 's/^"\(.*\)"$/\1/'; }
notify() {
  local url token; url="$(val MAIL_WORKER_URL)"; token="$(val MAIL_WORKER_TOKEN)"
  [ -n "$url" ] && [ -n "$token" ] || return 0
  python3 -c 'import json,sys; print(json.dumps({"subject": sys.argv[1], "text": sys.argv[2]}))' "$1" "$2" |
    curl -fsS -m 40 -X POST "${url%/}/notify" -H "Authorization: Bearer ${token}" -H "content-type: application/json" --data-binary @- >/dev/null || true
}

HERE="$(cd "$(dirname "$0")" && pwd)"
if [ -x "$HERE/poll-rollup.sh" ]; then NOTIFY=1 "$HERE/poll-rollup.sh"; else log error "db maintenance: poll-rollup.sh missing" '{}'; fi
free=$(df -B1 --output=avail /var/lib/postgresql | tail -1 | tr -d ' ')
if [ "${free:-0}" -lt 3000000000 ]; then
  log error "db maintenance: disk nearly full" "{\"disk_free_bytes\": ${free:-0}}"
  notify "[PickupChecker] Database disk nearly full" "$(printf 'Only %s MB free on the database host (%s). Postgres stops accepting writes when the disk is full.\n\ndf:\n%s' "$((free / 1000000))" "$(hostname)" "$(df -h /)")"
fi

trimmed=$("${P[@]}" -tA <<'SQL'
with b as (delete from sweeps where started_at < now() - interval '14 days' returning 1),
     c as (delete from ops_log where (level = 'debug' and at < now() - interval '3 days') or at < now() - interval '60 days' returning 1),
     d as (delete from rate_limits where reset_at < now() - interval '1 day' returning 1)
select json_build_object('sweeps', (select count(*) from b), 'ops_log', (select count(*) from c), 'rate_limits', (select count(*) from d),
                         'db_bytes', pg_database_size(current_database()));
SQL
)
if [ -n "$trimmed" ]; then log info "db maintenance: old logs trimmed" "$trimmed"; echo "trimmed $trimmed"; else log error "db maintenance: trim failed" '{}'; fi

NEON=/root/pg-secrets/neon.url
if [ -f /opt/pickupchecker/.neon-merged-pickupchecker ] && [ -s "$NEON" ]; then
  DUMP=/var/backups/pickupchecker/offsite.dump
  if sudo -u postgres pg_dump -Fc --exclude-table-data=poll_log --exclude-table-data=sweeps --exclude-table-data=ops_log pickupchecker > "$DUMP.tmp" &&
     mv "$DUMP.tmp" "$DUMP" &&
     pg_restore --clean --if-exists --no-owner --no-privileges --single-transaction -d "$(cat "$NEON")" "$DUMP" 2>/tmp/pc-offsite.err; then
    log info "off-site backup copied to Neon" "{\"dump_bytes\": $(stat -c %s "$DUMP")}"
    echo "off-site copy ok"
  else
    err=$(tail -c 800 /tmp/pc-offsite.err 2>/dev/null | tr '\n' ' ')
    log error "off-site backup failed" "$(python3 -c 'import json,sys; print(json.dumps({"error": sys.argv[1]}))' "$err")"
    notify "[PickupChecker] Off-site database backup failed" "$(printf 'Copying last night'"'"'s database to Neon failed on the poller host. The local dumps in /var/backups/pickupchecker are unaffected.\n\n%s' "$err")"
    echo "off-site copy FAILED: $err"
  fi
else
  echo "off-site copy waits for the Neon merge"
fi
