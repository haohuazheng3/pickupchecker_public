#!/usr/bin/env bash
# Daily dated archive of the PickupChecker data (pickupchecker-archive.timer, 10:30 UTC), owner 2026-11-07: the
# restock history is the product. Neon's off-site copy is replaced every night and the weekday dumps roll over after
# a week, so a mistake noticed late would be in every copy. This keeps one file per day: every file 90 days, the file
# from the 1st of each month forever (~5 MB each today).
# What: schema public, everything except the raw request logs (poll_log, sweeps, ops_log); poll_hourly, the summary
# of poll_log, is in. Where: installed on both database hosts, runs only on the standby, so the archive always sits on
# the other machine than the primary. pg_dump reads the standby's replayed copy (hot_standby_feedback is on).
# A failed dump or a standby more than an hour behind mails the owner.
set -uo pipefail
P=(sudo -u postgres psql -qX -d pickupchecker)
[ "$("${P[@]}" -tAc 'select pg_is_in_recovery()' 2>/dev/null)" = "t" ] || { echo "not a standby: nothing to do"; exit 0; }
val() { sed -n "s/^$1=//p" /opt/pickupchecker/poller.env | head -1 | sed 's/^"\(.*\)"$/\1/'; }
notify() { /opt/pickupchecker/owner-mail.sh "$1" "$2" || true; }  # Resend first, mail worker fallback
DIR=/var/backups/pickupchecker-archive
install -d -o postgres -g postgres -m 700 "$DIR"
F="$DIR/pickupchecker-core-$(date -u +%F).dump"

lag=$("${P[@]}" -tAc "select coalesce(extract(epoch from now() - pg_last_xact_replay_timestamp())::int, -1)")
if [ "${lag:--1}" -lt 0 ] || [ "$lag" -gt 3600 ]; then
  notify "[PickupChecker] Standby is behind: today's archive may be stale" "$(printf 'The standby on %s last replayed a change %s s ago; the archive taken from it is that old.' "$(hostname)" "$lag")"
fi

ok=0
for attempt in 1 2; do
  # The table list is read whole first: `pg_restore -l | grep -q` fails under pipefail once grep stops reading.
  if sudo -u postgres pg_dump -Fc -n public --exclude-table-data=public.poll_log --exclude-table-data=public.sweeps --exclude-table-data=public.ops_log pickupchecker > "$F.tmp" 2>/tmp/pc-archive.err &&
     toc=$(pg_restore -l "$F.tmp" 2>>/tmp/pc-archive.err) &&
     grep -q "TABLE DATA public availability_events " <<< "$toc" &&
     grep -q "TABLE DATA public users " <<< "$toc"; then
    mv "$F.tmp" "$F"; ok=1; break
  fi
  sleep 60
done
if [ "$ok" = 1 ]; then
  echo "archive ok: $F ($(stat -c %s "$F") bytes, standby lag ${lag}s)"
else
  rm -f "$F.tmp"
  err=$(tail -c 800 /tmp/pc-archive.err 2>/dev/null | tr '\n' ' ')
  notify "[PickupChecker] Daily data archive failed" "$(printf 'pg_dump on the standby (%s) failed twice; the older archives in %s are untouched.\n\n%s' "$(hostname)" "$DIR" "$err")"
  echo "archive FAILED: $err"
  exit 1
fi

# Keep every file 90 days, the 1st of each month forever.
find "$DIR" -maxdepth 1 -name 'pickupchecker-core-*.dump' ! -name '*-01.dump' -mtime +90 -delete
echo "$(ls "$DIR" | wc -l) archives, $(du -sh "$DIR" | cut -f1) in $DIR"
