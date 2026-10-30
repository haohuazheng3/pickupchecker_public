#!/usr/bin/env bash
# The site's database, on the poller host (Postgres 17). Neon's free tier could not carry a poller that
# writes every 20 s: the compute never sleeps (180 of 100 CU-hours a month) and the October egress ran
# past 5 GB on day two, which suspended the database. Idempotent: a re-run keeps the CA, the server
# certificate, the passwords and the data.
#
#   scp infra/linode/postgres.sh root@HOST:/root/ && ssh root@HOST bash /root/postgres.sh
#
# Leaves, root-only: /root/pg-secrets/<db>.url (remote: TLS to this host's IPv4), /root/pg-secrets/<db>-local.url
# (loopback, for the poller) and /root/pg-ca/ca.crt (the site pins it as DATABASE_CA).
set -euo pipefail
PGV=17
DBS=(pickupchecker pickupchecker_preview)
SECRETS=/root/pg-secrets
CA=/root/pg-ca
CONF=/etc/postgresql/$PGV/main
IP4=$(ip -4 -o addr show scope global | awk '{print $4}' | cut -d/ -f1 | head -1)

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

# Sized for a 1 GB machine; few connections (the site keeps 3 per instance, the poller 8). UTC like Neon.
cat > "$CONF/conf.d/pickupchecker.conf" <<CONF
listen_addresses = '*'
port = 5432
max_connections = 50
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
cat > "$CONF/pg_hba.conf" <<HBA
local   all                    postgres                              peer
local   all                    all                                   peer
host    all                    all                    127.0.0.1/32   scram-sha-256
host    all                    all                    ::1/128        scram-sha-256
hostssl pickupchecker          pickupchecker          0.0.0.0/0      scram-sha-256
hostssl pickupchecker          pickupchecker          ::/0           scram-sha-256
hostssl pickupchecker_preview  pickupchecker_preview  0.0.0.0/0      scram-sha-256
hostssl pickupchecker_preview  pickupchecker_preview  ::/0           scram-sha-256
HBA
systemctl enable -q postgresql
systemctl restart postgresql
for _ in $(seq 1 30); do sudo -u postgres pg_isready -q && break; sleep 1; done

# One role and one database per environment; passwords made once, never printed.
install -d -m 700 "$SECRETS"
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

ufw allow 5432/tcp >/dev/null

# Nightly dump of production, one per weekday (seven kept), at a quiet hour for US stores.
install -d -o postgres -g postgres -m 700 /var/backups/pickupchecker
cat > /etc/systemd/system/pickupchecker-pgdump.service <<'UNIT'
[Unit]
Description=Dump the PickupChecker database
[Service]
Type=oneshot
User=postgres
ExecStart=/bin/sh -c 'pg_dump -Fc pickupchecker > /var/backups/pickupchecker/pickupchecker-$(date +%%a).dump'
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
systemctl daemon-reload
systemctl enable -q --now pickupchecker-pgdump.timer

echo "postgres $(sudo -u postgres psql -qtAc 'SHOW server_version') on $IP4:5432 · databases: ${DBS[*]}"
