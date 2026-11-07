#!/usr/bin/env bash
# The site's database, on the poller host (Postgres 17). Neon's free tier could not carry a poller that
# writes every 20 s: the compute never sleeps (180 of 100 CU-hours a month) and the October egress ran
# past 5 GB on day two, which suspended the database. Idempotent: a re-run keeps the CA, the server
# certificate, the passwords and the data.
#
#   scp infra/linode/postgres.sh root@HOST:/root/ && ssh root@HOST bash /root/postgres.sh
#
# Two hosts (docs/architecture.md「热备主机」): HOST_LABEL names this server (postgresql.conf pickupchecker.host,
# which the site reads to tell the primary from a fenced old one), PEER_IP is the other host's IPv4.
#   primary:  HOST_LABEL=linode-1 PEER_IP=<standby> bash postgres.sh   (replication role and slot, peer access)
#   standby:  copy /root/pg-ca and /root/pg-secrets from the primary first (one CA, one set of passwords), then
#             ROLE=standby HOST_LABEL=linode-2 PEER_IP=<primary> bash postgres.sh — a streaming replica made with
#             pg_basebackup (the data directory is replaced unless it already is a replica). Run the same on a
#             fenced old primary to make it the standby of the host that took over.
#
# Leaves, root-only: /root/pg-secrets/<db>.url (remote: TLS to this host's IPv4), /root/pg-secrets/<db>-local.url
# (loopback), /root/pg-secrets/poller-local.url (the poller's own role, with reserved connections) and
# /root/pg-ca/ca.crt (the site pins it as DATABASE_CA). Copy db-maintenance.sh, poll-rollup.sh, core-archive.sh
# next to this script to (re)install the daily maintenance. Postgres restarts only when its settings change.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
# Write stdin to $1 only if it differs; succeeds (0) when the file changed.
put() { local t; t=$(mktemp); cat > "$t"; if cmp -s "$t" "$1"; then rm -f "$t"; return 1; fi; install -m 644 "$t" "$1"; rm -f "$t"; }
PGV=17
DBS=(pickupchecker pickupchecker_preview)
SECRETS=/root/pg-secrets
CA=/root/pg-ca
CONF=/etc/postgresql/$PGV/main
IP4=$(ip -4 -o addr show scope global | awk '{print $4}' | cut -d/ -f1 | head -1)
ROLE=${ROLE:-primary}; HOST_LABEL=${HOST_LABEL:-linode-1}; PEER_IP=${PEER_IP:-}
[ "$ROLE" = primary ] || [ "$ROLE" = standby ] || { echo "ROLE must be primary or standby" >&2; exit 1; }
[ "$ROLE" = primary ] || [ -n "$PEER_IP" ] || { echo "a standby needs PEER_IP (the primary)" >&2; exit 1; }
[ "$ROLE" = primary ] || [ -s "$SECRETS/replicator.pw" ] || { echo "copy /root/pg-secrets and /root/pg-ca from the primary first" >&2; exit 1; }

# Postgres 17 from the PGDG repository: Ubuntu 24.04 ships 16, and pg_dump must be at least the server
# version of any database we copy from (Neon runs 17).
if [ ! -x /usr/lib/postgresql/$PGV/bin/postgres ]; then
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql-common ca-certificates curl >/dev/null
  /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y >/dev/null
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql-$PGV >/dev/null
fi

# The poller (~180 MB) and Postgres share 1 GB of RAM: a second, larger swap file as a cushion.
if [ ! -f /swapfile ]; then
  fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# TLS from our own CA (10 years). The server certificate names this host's IPv4, which is what the site dials.
install -d -m 700 "$CA"
if [ ! -f "$CA/ca.crt" ]; then
  openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -days 3650 \
    -subj "/CN=PickupChecker database CA" -keyout "$CA/ca.key" -out "$CA/ca.crt" 2>/dev/null
fi
if ! openssl x509 -in "$CONF/server.crt" -noout -ext subjectAltName 2>/dev/null | grep -q "IP Address:$IP4"; then
  openssl req -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -subj "/CN=$IP4" \
    -keyout "$CONF/server.key" -out /tmp/pg-server.csr 2>/dev/null
  printf 'subjectAltName=IP:%s,IP:127.0.0.1,DNS:localhost\nbasicConstraints=CA:FALSE\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth\n' "$IP4" > /tmp/pg-server.ext
  openssl x509 -req -in /tmp/pg-server.csr -CA "$CA/ca.crt" -CAkey "$CA/ca.key" -CAcreateserial -days 3650 \
    -extfile /tmp/pg-server.ext -out "$CONF/server.crt" 2>/dev/null
  rm -f /tmp/pg-server.csr /tmp/pg-server.ext
  chown postgres:postgres "$CONF/server.key" "$CONF/server.crt"; chmod 600 "$CONF/server.key"
fi

# Sized for a 1 GB machine. Connections: the site keeps up to 3 per Vercel instance, the poller 8. A burst of
# instances once took all 50 slots for a minute (2026-11-01 01:48, 417 refused) and the poller's writes failed
# with them, so slots are now reserved for the poller's own role (reserved_connections, Postgres 16+): the site
# can never starve polling and alerts. UTC like Neon.
restart=0; reload=0
put "$CONF/conf.d/pickupchecker.conf" <<CONF && restart=1
listen_addresses = '*'
port = 5432
max_connections = 100
reserved_connections = 10
pickupchecker.host = '$HOST_LABEL'
wal_level = replica
max_wal_senders = 5
# A standby that is down for long must not fill this disk: past this, its slot is dropped (it then re-syncs).
max_slot_wal_keep_size = 4GB
hot_standby = on
hot_standby_feedback = on
shared_buffers = 96MB
effective_cache_size = 384MB
work_mem = 4MB
maintenance_work_mem = 32MB
wal_buffers = 4MB
min_wal_size = 64MB
max_wal_size = 512MB
checkpoint_completion_target = 0.9
random_page_cost = 1.1
effective_io_concurrency = 100
ssl = on
ssl_cert_file = '$CONF/server.crt'
ssl_key_file = '$CONF/server.key'
ssl_min_protocol_version = 'TLSv1.2'
password_encryption = scram-sha-256
idle_session_timeout = '10min'
idle_in_transaction_session_timeout = '60s'
tcp_keepalives_idle = 60
tcp_keepalives_interval = 15
tcp_keepalives_count = 4
timezone = 'UTC'
log_timezone = 'UTC'
log_min_duration_statement = 2000
CONF

# Peer auth for local admin, passwords on loopback, and from anywhere else only TLS plus a password, and only
# each app role to its own database.
put "$CONF/pg_hba.conf" <<HBA && reload=1
local   all                    postgres                              peer
local   all                    all                                   peer
host    all                    all                    127.0.0.1/32   scram-sha-256
host    all                    all                    ::1/128        scram-sha-256
hostssl pickupchecker          pickupchecker          0.0.0.0/0      scram-sha-256
hostssl pickupchecker          pickupchecker          ::/0           scram-sha-256
hostssl pickupchecker_preview  pickupchecker_preview  0.0.0.0/0      scram-sha-256
hostssl pickupchecker_preview  pickupchecker_preview  ::/0           scram-sha-256
$( [ -n "$PEER_IP" ] && printf 'hostssl replication            replicator             %s/32  scram-sha-256\nhostssl pickupchecker          poller                 %s/32  scram-sha-256\n' "$PEER_IP" "$PEER_IP" )
HBA
chown postgres:postgres "$CONF/conf.d/pickupchecker.conf" "$CONF/pg_hba.conf"

# Under memory pressure the kernel should kill the poller (systemd restarts it), never the database: the
# postmaster is shielded and its backends reset to neutral (PostgreSQL's documented setup), and the poller is
# capped well above its ~190 MB so a leak restarts it instead of starving everything else.
install -d /etc/systemd/system/postgresql@$PGV-main.service.d /etc/systemd/system/pickupchecker-poller.service.d
put /etc/systemd/system/postgresql@$PGV-main.service.d/oom.conf <<'UNIT' && restart=1
[Service]
OOMScoreAdjust=-900
Environment=PG_OOM_ADJUST_FILE=/proc/self/oom_score_adj PG_OOM_ADJUST_VALUE=0
UNIT
poller_unit=0
put /etc/systemd/system/pickupchecker-poller.service.d/memory.conf <<'UNIT' && poller_unit=1
[Service]
OOMScoreAdjust=500
MemoryHigh=400M
MemoryMax=500M
UNIT
systemctl daemon-reload
systemctl enable -q postgresql
if [ "$restart" = 1 ] || ! systemctl is-active -q postgresql@$PGV-main; then systemctl restart postgresql@$PGV-main; elif [ "$reload" = 1 ]; then systemctl reload postgresql@$PGV-main; fi
for _ in $(seq 1 30); do sudo -u postgres pg_isready -q && break; sleep 1; done
[ "$poller_unit" = 1 ] && systemctl is-active -q pickupchecker-poller && systemctl restart pickupchecker-poller

install -d -m 700 "$SECRETS"
if [ "$ROLE" = standby ]; then
  # A streaming replica of the primary. Roles, passwords and data all come with it.
  if [ ! -f /var/lib/postgresql/$PGV/main/standby.signal ]; then
    (umask 077; printf '%s:5432:replication:replicator:%s\n' "$PEER_IP" "$(cat "$SECRETS/replicator.pw")" > /var/lib/postgresql/.pgpass)
    chown postgres:postgres /var/lib/postgresql/.pgpass
    install -m 644 -o postgres -g postgres "$CA/ca.crt" "$CONF/root.crt"
    systemctl stop postgresql@$PGV-main
    rm -rf /var/lib/postgresql/$PGV/main.old && mv /var/lib/postgresql/$PGV/main /var/lib/postgresql/$PGV/main.old
    install -d -m 700 -o postgres -g postgres /var/lib/postgresql/$PGV/main
    sudo -u postgres pg_basebackup -D /var/lib/postgresql/$PGV/main -R -X stream -S standby -P \
      -d "host=$PEER_IP port=5432 user=replicator sslmode=verify-ca sslrootcert=$CONF/root.crt application_name=$HOST_LABEL"
    systemctl start postgresql@$PGV-main
    for _ in $(seq 1 30); do sudo -u postgres pg_isready -q && break; sleep 1; done
    rm -rf /var/lib/postgresql/$PGV/main.old
  fi
  for db in "${DBS[@]}"; do
    (umask 077
     printf 'postgres://%s:%s@%s:5432/%s' "$db" "$(cat "$SECRETS/$db.pw")" "$IP4" "$db" > "$SECRETS/$db.url"
     printf 'postgres://%s:%s@127.0.0.1:5432/%s' "$db" "$(cat "$SECRETS/$db.pw")" "$db" > "$SECRETS/$db-local.url")
  done
  (umask 077
   printf 'postgres://poller:%s@127.0.0.1:5432/pickupchecker' "$(cat "$SECRETS/poller.pw")" > "$SECRETS/poller-local.url"
   printf 'postgres://poller:%s@%s:5432/pickupchecker' "$(cat "$SECRETS/poller.pw")" "$IP4" > "$SECRETS/poller-remote.url")
else
# One role and one database per environment; passwords made once, never printed.
for db in "${DBS[@]}"; do
  pw="$SECRETS/$db.pw"
  [ -s "$pw" ] || (umask 077; openssl rand -base64 64 | tr -dc 'A-Za-z0-9' | head -c 40 > "$pw")
  sudo -u postgres psql -qtAc "SELECT 1 FROM pg_roles WHERE rolname = '$db'" | grep -q 1 || sudo -u postgres psql -qc "CREATE ROLE $db LOGIN"
  printf "ALTER ROLE %s WITH LOGIN PASSWORD :'pw';\n" "$db" | sudo -u postgres psql -q -v pw="$(cat "$pw")" >/dev/null
  sudo -u postgres psql -qtAc "SELECT 1 FROM pg_database WHERE datname = '$db'" | grep -q 1 || sudo -u postgres createdb -O "$db" "$db"
  (umask 077
   printf 'postgres://%s:%s@%s:5432/%s' "$db" "$(cat "$pw")" "$IP4" "$db" > "$SECRETS/$db.url"
   printf 'postgres://%s:%s@127.0.0.1:5432/%s' "$db" "$(cat "$pw")" "$db" > "$SECRETS/$db-local.url")
done

# The poller's own login (loopback only): a member of pickupchecker, so it has exactly that role's rights, plus
# the reserved connection slots. poller.env's DATABASE_URL takes /root/pg-secrets/poller-local.url.
pw="$SECRETS/poller.pw"
[ -s "$pw" ] || (umask 077; openssl rand -base64 64 | tr -dc 'A-Za-z0-9' | head -c 40 > "$pw")
sudo -u postgres psql -qtAc "SELECT 1 FROM pg_roles WHERE rolname = 'poller'" | grep -q 1 || sudo -u postgres psql -qc "CREATE ROLE poller LOGIN"
printf "ALTER ROLE poller WITH LOGIN PASSWORD :'pw';\nGRANT pickupchecker TO poller;\nGRANT pg_use_reserved_connections TO poller;\n" | sudo -u postgres psql -q -v pw="$(cat "$pw")" >/dev/null
(umask 077; printf 'postgres://poller:%s@127.0.0.1:5432/pickupchecker' "$(cat "$pw")" > "$SECRETS/poller-local.url"
 printf 'postgres://poller:%s@%s:5432/pickupchecker' "$(cat "$pw")" "$IP4" > "$SECRETS/poller-remote.url")
# The standby's takeover promotes its replica as the poller role, which also reads the replica's receiver status.
sudo -u postgres psql -qc "GRANT EXECUTE ON FUNCTION pg_promote(boolean, integer) TO poller" -d pickupchecker >/dev/null
sudo -u postgres psql -qc "GRANT pg_read_all_stats TO poller" >/dev/null 2>&1 || true

# Streaming replication to the standby: its own login and a physical slot (WAL is kept until it has it, up to
# max_slot_wal_keep_size). The cluster record names the primary (stock/cluster.ts); epoch 1 until a takeover.
pw="$SECRETS/replicator.pw"
[ -s "$pw" ] || (umask 077; openssl rand -base64 64 | tr -dc 'A-Za-z0-9' | head -c 40 > "$pw")
sudo -u postgres psql -qtAc "SELECT 1 FROM pg_roles WHERE rolname = 'replicator'" | grep -q 1 || sudo -u postgres psql -qc "CREATE ROLE replicator WITH REPLICATION LOGIN"
printf "ALTER ROLE replicator WITH REPLICATION LOGIN PASSWORD :'pw';\n" | sudo -u postgres psql -q -v pw="$(cat "$pw")" >/dev/null
sudo -u postgres psql -qtAc "SELECT 1 FROM pg_replication_slots WHERE slot_name = 'standby'" | grep -q 1 || sudo -u postgres psql -qc "SELECT pg_create_physical_replication_slot('standby')" >/dev/null
sudo -u postgres psql -d pickupchecker -qc "INSERT INTO poller_state (key, value) VALUES ('cluster', jsonb_build_object('primary', '$HOST_LABEL', 'epoch', 1)) ON CONFLICT (key) DO NOTHING" >/dev/null 2>&1 || true
fi

ufw allow 5432/tcp >/dev/null

# Nightly dump of production, one per weekday (seven kept), at a quiet hour for US stores. Without poll_log's rows
# (owner 2026-11-07: ~1.5 GB a day of raw request log; its hourly summary poll_hourly is in the dump).
install -d -o postgres -g postgres -m 700 /var/backups/pickupchecker
cat > /etc/systemd/system/pickupchecker-pgdump.service <<'UNIT'
[Unit]
Description=Dump the PickupChecker database
[Service]
Type=oneshot
User=postgres
ExecStart=/bin/sh -c 'pg_dump -Fc --exclude-table-data=public.poll_log pickupchecker > /var/backups/pickupchecker/pickupchecker-$(date +%%a).dump'
UNIT
cat > /etc/systemd/system/pickupchecker-pgdump.timer <<'UNIT'
[Unit]
Description=Nightly PickupChecker database dump
[Timer]
OnCalendar=*-*-* 09:30:00 UTC
Persistent=true
[Install]
WantedBy=timers.target
UNIT

# Daily maintenance (db-maintenance.sh): trim the request logs, then the off-host copy to Neon.
if [ -f "$HERE/db-maintenance.sh" ]; then
  install -m 755 "$HERE/db-maintenance.sh" /opt/pickupchecker/db-maintenance.sh
  cat > /etc/systemd/system/pickupchecker-db-maintenance.service <<'UNIT'
[Unit]
Description=Trim PickupChecker request logs and copy the database off the host
After=postgresql.service network-online.target
[Service]
Type=oneshot
Environment=HOME=/root
ExecStart=/opt/pickupchecker/db-maintenance.sh
UNIT
  cat > /etc/systemd/system/pickupchecker-db-maintenance.timer <<'UNIT'
[Unit]
Description=Daily PickupChecker database maintenance
[Timer]
OnCalendar=*-*-* 10:00:00 UTC
Persistent=true
[Install]
WantedBy=timers.target
UNIT
fi

# Hourly poll_log roll-up and trim (poll-rollup.sh; primary only) and the daily dated archive (core-archive.sh;
# standby only, so it always sits on the other machine). Both hosts get both.
if [ -f "$HERE/poll-rollup.sh" ]; then
  install -m 755 "$HERE/poll-rollup.sh" /opt/pickupchecker/poll-rollup.sh
  cat > /etc/systemd/system/pickupchecker-poll-rollup.service <<'UNIT'
[Unit]
Description=Summarise PickupChecker's request log by hour and drop raw rows older than 3 days
After=postgresql.service
[Service]
Type=oneshot
Environment=HOME=/root
ExecStart=/opt/pickupchecker/poll-rollup.sh
UNIT
  cat > /etc/systemd/system/pickupchecker-poll-rollup.timer <<'UNIT'
[Unit]
Description=Hourly PickupChecker request-log roll-up
[Timer]
OnCalendar=*-*-* *:07:00 UTC
Persistent=true
[Install]
WantedBy=timers.target
UNIT
fi
if [ -f "$HERE/core-archive.sh" ]; then
  install -m 755 "$HERE/core-archive.sh" /opt/pickupchecker/core-archive.sh
  cat > /etc/systemd/system/pickupchecker-archive.service <<'UNIT'
[Unit]
Description=Dated daily archive of the PickupChecker data (standby only)
After=postgresql.service network-online.target
[Service]
Type=oneshot
Environment=HOME=/root
ExecStart=/opt/pickupchecker/core-archive.sh
UNIT
  cat > /etc/systemd/system/pickupchecker-archive.timer <<'UNIT'
[Unit]
Description=Daily PickupChecker data archive
[Timer]
OnCalendar=*-*-* 10:30:00 UTC
Persistent=true
[Install]
WantedBy=timers.target
UNIT
fi
systemctl daemon-reload
systemctl enable -q --now pickupchecker-pgdump.timer
for t in db-maintenance poll-rollup archive; do
  if [ -f "/etc/systemd/system/pickupchecker-$t.timer" ]; then systemctl enable -q --now "pickupchecker-$t.timer"; fi
done

echo "postgres $(sudo -u postgres psql -qtAc 'SHOW server_version') on $IP4:5432 · databases: ${DBS[*]}"
