#!/usr/bin/env bash
# Daily, after the 09:30 dump (pickupchecker-db-maintenance.timer, 10:00 UTC):
#  1. Trim what grows by itself: poll_log and sweeps keep 14 days, ops_log debug ticks 3 days and the rest
#     60, expired rate-limit rows go (poll_log alone is ~75 MB a day). Nothing a user made is touched.
#  2. Off-host copy: the database minus those logs, restored over the Neon project that held it before
#     2026-10-30 (free tier: a restore is ingress, a minute of compute). Only once the one-off merge has
#     taken what Neon held, because the restore replaces Neon's tables; one transaction, so a failed run
#     leaves yesterday's copy. A failure mails the owner. Each run leaves a line in ops_log (source host).
set -uo pipefail
P=(sudo -u postgres psql -v ON_ERROR_STOP=1 -qX -d pickupchecker)
log() { printf "insert into ops_log (source, level, message, data) values ('host', :'lvl', :'msg', :'data'::jsonb);\n" | "${P[@]}" -v lvl="$1" -v msg="$2" -v data="$3" >/dev/null 2>&1 || true; }
val() { sed -n "s/^$1=//p" /opt/pickupchecker/poller.env | head -1 | sed 's/^"\(.*\)"$/\1/'; }
notify() {
  local url token; url="$(val MAIL_WORKER_URL)"; token="$(val MAIL_WORKER_TOKEN)"
  [ -n "$url" ] && [ -n "$token" ] || return 0
  python3 -c 'import json,sys; print(json.dumps({"subject": sys.argv[1], "text": sys.argv[2]}))' "$1" "$2" |
    curl -fsS -m 40 -X POST "${url%/}/notify" -H "Authorization: Bearer ${token}" -H "content-type: application/json" --data-binary @- >/dev/null || true
}

trimmed=$("${P[@]}" -tA <<'SQL'
with a as (delete from poll_log where at < now() - interval '14 days' returning 1),
     b as (delete from sweeps where started_at < now() - interval '14 days' returning 1),
     c as (delete from ops_log where (level = 'debug' and at < now() - interval '3 days') or at < now() - interval '60 days' returning 1),
     d as (delete from rate_limits where reset_at < now() - interval '1 day' returning 1)
select json_build_object('poll_log', (select count(*) from a), 'sweeps', (select count(*) from b), 'ops_log', (select count(*) from c), 'rate_limits', (select count(*) from d),
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
