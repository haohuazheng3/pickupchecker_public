#!/usr/bin/env bash
# External health probe of the site, every 5 minutes (pickupchecker-probe.timer). Until 2026-11-08 this only
# triggered the Cloudflare mail worker's /probe, which went dark every evening when the shared Workers Free account
# ran out of requests; now the host checks /api/health itself and mails through owner-mail.sh (Resend first).
# Mails once the site has failed 2 checks in a row (10 min), again every 2 hours while it stays down, and once
# on recovery. Only the database primary mails; the standby mails only when the primary's database does not
# answer either (then the primary host may be what is down). Hosts without a database (the US worker) skip.
set -uo pipefail
ENVF=/opt/pickupchecker/poller.env
MAIL="$(dirname "$(readlink -f "$0")")/owner-mail.sh"  # installed side by side (or both in the checkout)
STATE=/var/lib/pickupchecker/probe.state
SITE=${PROBE_URL:-https://pickupchecker.com/api/health?shallow=1}
mkdir -p "$(dirname "$STATE")"

role=$(sudo -u postgres psql -qXtA -d pickupchecker -c 'select pg_is_in_recovery()' 2>/dev/null || true)
if [ "$role" = "t" ]; then
  primary_db=$(sed -n 's/^DATABASE_URL=//p' "$ENVF" | head -1 | sed -E 's#^"?postgres(ql)?://[^@]*@([^:/]+).*#\2#')
  if [ -n "$primary_db" ] && pg_isready -q -t 5 -h "$primary_db" -p 5432 2>/dev/null; then exit 0; fi
elif [ "$role" != "f" ]; then
  exit 0
fi

fails=0; down_since=""; last_mail=0
[ -f "$STATE" ] && . "$STATE"
now=$(date +%s)
code=$(curl -s -o /tmp/pc-probe.body -w '%{http_code}' -m 25 -A "pickupchecker-probe/1.0" "$SITE" || echo 000)
ok=0; [ "$code" = "200" ] && grep -q '"ok":true' /tmp/pc-probe.body && ok=1

if [ "$ok" = 1 ]; then
  if [ -n "$down_since" ] && [ "$last_mail" -gt 0 ]; then
    "$MAIL" "[PickupChecker] Site is back up" "$(printf '%s answers ok again (down since %s UTC, checked from %s).' "$SITE" "$(date -u -d "@$down_since" '+%F %T')" "$(hostname)")"
  fi
  printf 'fails=0\ndown_since=""\nlast_mail=0\n' > "$STATE"
  exit 0
fi

fails=$((fails + 1)); [ -n "$down_since" ] || down_since=$now
if [ "$fails" -ge 2 ] && [ $((now - last_mail)) -ge 7200 ]; then
  if "$MAIL" "[PickupChecker] /api/health returned ${code}" \
       "$(printf 'GET %s failed %s times in a row from %s (down since %s UTC).\n\n%s' "$SITE" "$fails" "$(hostname)" "$(date -u -d "@$down_since" '+%F %T')" "$(head -c 1500 /tmp/pc-probe.body 2>/dev/null)")"; then
    last_mail=$now
  fi
fi
printf 'fails=%s\ndown_since="%s"\nlast_mail=%s\n' "$fails" "$down_since" "$last_mail" > "$STATE"
