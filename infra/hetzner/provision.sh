#!/usr/bin/env bash
# Creates (or re-creates) the poller server on Hetzner Cloud with the rendered cloud-init.
#
#   HCLOUD_TOKEN=…  DATABASE_URL=…  RESEND_API_KEY=…  POLLER_TOKEN=…  MAIL_WORKER_URL=…  MAIL_WORKER_TOKEN=… \
#   ./infra/hetzner/provision.sh [server-name] [server-type] [location]
#
# Repo access: a fresh ed25519 keypair is generated per run, its public half is registered on the
# private repo as a read-only deploy key (needs `gh auth` or GH_TOKEN), and the private half only
# travels inside the cloud-init user data. Nothing is stored locally.
#
# The server's /64 is assigned at creation, so the host discovers it itself on boot
# (/opt/pickupchecker/anyip.sh) and the poller reads IPV6_PREFIX=auto from its own interface.
# Optional: SSH_KEY_ID (Hetzner ssh key id) to be able to log in; NAME/TYPE/LOC positional args.
set -euo pipefail
NAME="${1:-pickupchecker-poller}"; TYPE="${2:-cx23}"; LOC="${3:-hel1}"  # CX line is EU-only (US locations sell CPX at ~3x the price)
: "${HCLOUD_TOKEN:?}" "${DATABASE_URL:?}" "${RESEND_API_KEY:?}" "${POLLER_TOKEN:?}"
REPO="${REPO:-haohuazheng3/pickupchecker_private}"
MAIL_WORKER_URL="${MAIL_WORKER_URL:-}"; MAIL_WORKER_TOKEN="${MAIL_WORKER_TOKEN:-}"
here="$(cd "$(dirname "$0")" && pwd)"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
ssh-keygen -q -t ed25519 -N "" -C "pickupchecker-poller" -f "$tmp/key"
gh api "repos/$REPO/keys" -f title="$NAME $(date -u +%Y-%m-%dT%H:%MZ)" -f key="$(cat "$tmp/key.pub")" -F read_only=true --jq '"deploy key id " + (.id|tostring)'
DEPLOY_KEY_B64="$(base64 < "$tmp/key" | tr -d '\n')"
render() {
  sed -e "s|__DATABASE_URL__|$DATABASE_URL|" -e "s|__RESEND_API_KEY__|$RESEND_API_KEY|" -e "s|__POLLER_TOKEN__|$POLLER_TOKEN|" \
      -e "s|__MAIL_WORKER_URL__|$MAIL_WORKER_URL|" -e "s|__MAIL_WORKER_TOKEN__|$MAIL_WORKER_TOKEN|" -e "s|__DEPLOY_KEY_B64__|$DEPLOY_KEY_B64|" "$here/cloud-init.yaml"
}
api() { curl -fsS -H "Authorization: Bearer $HCLOUD_TOKEN" -H "Content-Type: application/json" "$@"; }
existing=$(api "https://api.hetzner.cloud/v1/servers?name=$NAME" | python3 -c 'import json,sys; s=json.load(sys.stdin)["servers"]; print(s[0]["id"] if s else "")')
if [ -n "$existing" ]; then echo "server $NAME exists (id $existing); run update instead: ssh root@<ip> /opt/pickupchecker/update.sh"; exit 0; fi
ssh_keys="[]"
if [ -n "${SSH_KEY_ID:-}" ]; then ssh_keys="[$SSH_KEY_ID]"; fi
payload=$(python3 - "$NAME" "$TYPE" "$LOC" "$ssh_keys" <<'PY'
import json,sys
name,typ,loc,keys=sys.argv[1:5]
ud=sys.stdin.read()
print(json.dumps({"name":name,"server_type":typ,"location":loc,"image":"ubuntu-24.04","ssh_keys":json.loads(keys),"user_data":ud,"public_net":{"enable_ipv4":True,"enable_ipv6":True},"labels":{"app":"pickupchecker","role":"poller"}}))
PY
<<<"$(render)")
res=$(api -X POST https://api.hetzner.cloud/v1/servers -d "$payload")
echo "$res" | python3 -c 'import json,sys; d=json.load(sys.stdin); s=d["server"]; print("created", s["id"], s["name"], "ipv4:", s["public_net"]["ipv4"]["ip"], "ipv6:", s["public_net"]["ipv6"]["ip"])'
echo "cloud-init takes ~3 minutes; the poller then writes its first heartbeat (see /admin)."
