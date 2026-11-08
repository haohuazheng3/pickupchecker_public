#!/usr/bin/env bash
# owner-mail.sh SUBJECT TEXT — mail the owner from a host script. Resend first (RESEND_API_KEY, ALERTS_FROM,
# OWNER_EMAIL in poller.env), the Cloudflare mail worker /notify as the fallback; exit 0 if either took it.
# Owner 2026-11-08: the worker's Workers Free account ran out of its 100k requests a day every evening (another
# project's collector), so host alerts sent only through it were lost from ~22:00 to 00:00 UTC. Same order as
# src/lib/mail/owner.ts. Reads only the keys it needs; prints no secret.
set -uo pipefail
ENV=/opt/pickupchecker/poller.env
val() { sed -n "s/^$1=//p" "$ENV" | head -1 | sed 's/^"\(.*\)"$/\1/'; }
subject="${1:?subject}"; text="${2:-}"
body=$(python3 -c 'import json,sys; print(json.dumps({"subject": sys.argv[1], "text": sys.argv[2]}))' "$subject" "$text")

key="$(val RESEND_API_KEY)"; to="$(val OWNER_EMAIL)"; from="$(val ALERTS_FROM)"
if [ -n "$key" ] && [ -n "$to" ]; then
  payload=$(python3 -c 'import json,sys; b=json.loads(sys.argv[1]); print(json.dumps({"from": sys.argv[2] or "PickupChecker <alerts@pickupchecker.com>", "to": [sys.argv[3]], "subject": b["subject"], "text": b["text"]}))' "$body" "$from" "$to")
  if printf '%s' "$payload" | curl -fsS -m 30 -X POST https://api.resend.com/emails \
       -H "Authorization: Bearer ${key}" -H "content-type: application/json" --data-binary @- >/dev/null; then
    exit 0
  fi
  echo "owner-mail: Resend failed, trying the mail worker" >&2
fi

url="$(val MAIL_WORKER_URL)"; token="$(val MAIL_WORKER_TOKEN)"
if [ -n "$url" ] && [ -n "$token" ]; then
  printf '%s' "$body" | curl -fsS -m 40 -X POST "${url%/}/notify" -H "Authorization: Bearer ${token}" \
    -H "content-type: application/json" --data-binary @- >/dev/null && exit 0
fi
echo "owner-mail: no channel delivered: $subject" >&2
exit 1
