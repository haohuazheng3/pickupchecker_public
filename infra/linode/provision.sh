#!/usr/bin/env bash
# Creates the poller host on Linode (Akamai Cloud) with the rendered cloud-init, then attaches a
# routed IPv6 range (/56 by default, /64 if the account is not allowed a /56) that the host discovers
# itself through the Metadata service (see cloud-init.yaml → anyip.sh).
#
#   LINODE_API_TOKEN=…  DATABASE_URL=…  RESEND_API_KEY=…  POLLER_TOKEN=…  MAIL_WORKER_URL=…  MAIL_WORKER_TOKEN=… \
#   VAPID_PUBLIC_KEY=…  VAPID_PRIVATE_KEY=…  (Web Push; same values as the Vercel project env) \
#   ./infra/linode/provision.sh [label] [type] [region] [prefix-length]
#
# Defaults: label pickupchecker-poller, type g6-nanode-1 ($5/mo), region us-ord (Chicago), /56.
# Optional: SSH_PUBKEY="ssh-ed25519 AAAA…" to be able to log in as root; REPO (default
# haohuazheng3/pickupchecker_private). Needs `gh auth` (or GH_TOKEN) to register the read-only deploy key.
# LINODE_ID=<id> rebuilds that existing Linode in place (keeps its IPv4 and the attached IPv6 range)
# instead of deleting and re-creating it.
#
# Repo access: a fresh ed25519 keypair is generated per run, its public half is registered on the
# private repo as a read-only deploy key, and the private half only travels inside the cloud-init user
# data. The root password is random and discarded (use SSH_PUBKEY or Lish to get in).
set -euo pipefail
LABEL="${1:-pickupchecker-poller}"; TYPE="${2:-g6-nanode-1}"; REGION="${3:-us-ord}"; PLEN="${4:-56}"
: "${LINODE_API_TOKEN:?}" "${DATABASE_URL:?}" "${RESEND_API_KEY:?}" "${POLLER_TOKEN:?}"
REPO="${REPO:-haohuazheng3/pickupchecker_private}"
MAIL_WORKER_URL="${MAIL_WORKER_URL:-}"; MAIL_WORKER_TOKEN="${MAIL_WORKER_TOKEN:-}"; SSH_PUBKEY="${SSH_PUBKEY:-}"
API=https://api.linode.com/v4
here="$(cd "$(dirname "$0")" && pwd)"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
api() { curl -fsS -H "Authorization: Bearer $LINODE_API_TOKEN" -H "Content-Type: application/json" "$@"; }

echo "token ok for: $(api "$API/profile" | python3 -c 'import json,sys; print(json.load(sys.stdin)["username"])')"

ssh-keygen -q -t ed25519 -N "" -C "pickupchecker-poller" -f "$tmp/key"
gh api "repos/$REPO/keys" -f title="$LABEL $(date -u +%Y-%m-%dT%H:%MZ)" -f key="$(cat "$tmp/key.pub")" -F read_only=true --jq '"deploy key id " + (.id|tostring)'
DEPLOY_KEY_B64="$(base64 < "$tmp/key" | tr -d '\n')"

render() {
  sed -e "s|__DATABASE_URL__|$DATABASE_URL|" -e "s|__RESEND_API_KEY__|$RESEND_API_KEY|" -e "s|__POLLER_TOKEN__|$POLLER_TOKEN|" \
      -e "s|__MAIL_WORKER_URL__|$MAIL_WORKER_URL|" -e "s|__MAIL_WORKER_TOKEN__|$MAIL_WORKER_TOKEN|" -e "s|__DEPLOY_KEY_B64__|$DEPLOY_KEY_B64|" \
      -e "s|__VAPID_PUBLIC_KEY__|${VAPID_PUBLIC_KEY:-}|" -e "s|__VAPID_PRIVATE_KEY__|${VAPID_PRIVATE_KEY:-}|" "$here/cloud-init.yaml"
}
USER_DATA_B64="$(render | base64 | tr -d '\n')"
ROOT_PASS="$(openssl rand -base64 30 | tr -d '/+=' | cut -c1-32)"

body=$(python3 - "$LABEL" "$TYPE" "$REGION" "$ROOT_PASS" "$USER_DATA_B64" "$SSH_PUBKEY" "${LINODE_ID:-}" <<'PY'
import json,sys
label,typ,region,pw,ud,pub,rebuild=sys.argv[1:8]
b={"image":"linode/ubuntu24.04","root_pass":pw,"booted":True,"metadata":{"user_data":ud}}
if not rebuild: b.update({"label":label,"type":typ,"region":region,"tags":["pickupchecker","poller"],"private_ip":False})
if pub: b["authorized_keys"]=[pub]
print(json.dumps(b))
PY
)
if [ -n "${LINODE_ID:-}" ]; then
  inst=$(api -X POST "$API/linode/instances/$LINODE_ID/rebuild" -d "$body")
  echo "linode $LINODE_ID rebuilt in place"
else
  # Replace an existing Linode with the same label (idempotent re-provision).
  existing=$(api "$API/linode/instances" | python3 -c 'import json,sys; L=sys.argv[1]; print(" ".join(str(i["id"]) for i in json.load(sys.stdin)["data"] if i["label"]==L))' "$LABEL")
  for id in $existing; do echo "deleting old linode $id"; api -X DELETE "$API/linode/instances/$id" >/dev/null; sleep 5; done
  inst=$(api -X POST "$API/linode/instances" -d "$body")
fi
ID=$(echo "$inst" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')
IPV4=$(echo "$inst" | python3 -c 'import json,sys; print(json.load(sys.stdin)["ipv4"][0])')
SLAAC=$(echo "$inst" | python3 -c 'import json,sys; print(json.load(sys.stdin)["ipv6"])')
echo "linode $ID: ipv4=$IPV4 slaac=$SLAAC region=$REGION type=$TYPE"

# Routed IPv6 range: reuse one already routed to this Linode, else request the wanted length and fall
# back to /64. New accounts get ONE range by default ("your limit will be exceeded" → support ticket).
RANGE=$(api "$API/networking/ipv6/ranges" | python3 -c 'import json,sys; t=sys.argv[1]; print(next((r["range"]+"/"+str(r["prefix"]) for r in json.load(sys.stdin)["data"] if r.get("route_target")==t), ""))' "${SLAAC%%/*}")
[ -n "$RANGE" ] && echo "ipv6 range already attached: $RANGE"
for plen in "$PLEN" 64; do
  [ -n "$RANGE" ] && break
  r=$(curl -sS -X POST "$API/networking/ipv6/ranges" -H "Authorization: Bearer $LINODE_API_TOKEN" -H "Content-Type: application/json" \
        -d "{\"linode_id\":$ID,\"prefix_length\":$plen}" || true)
  RANGE=$(echo "$r" | python3 -c 'import json,sys
try:
    d=json.load(sys.stdin); print(str(d["range"]) + "/" + str(d["prefix"]))
except Exception: print("")' 2>/dev/null || true)
  if [ -n "$RANGE" ]; then echo "ipv6 range attached: $RANGE"; break; fi
  echo "range /$plen refused: $(echo "$r" | head -c 200)"
done
[ -n "$RANGE" ] || { echo "no IPv6 range could be attached; the poller will run in degraded mode" >&2; }

echo "waiting for boot…"
for i in $(seq 1 30); do
  st=$(api "$API/linode/instances/$ID" | python3 -c 'import json,sys; print(json.load(sys.stdin)["status"])')
  [ "$st" = "running" ] && break; sleep 10
done
echo "status=$st. Cloud-init now installs Node, clones the repo and starts the poller (3–5 min)."
echo "Check: https://pickupchecker.com/admin (poller heartbeat) and curl -s https://pickupchecker.com/api/health"
echo "SUMMARY id=$ID ipv4=$IPV4 slaac=$SLAAC range=${RANGE:-none} region=$REGION type=$TYPE"
