#!/usr/bin/env bash
# Database tests on a throwaway local Postgres:  bash tests/db/run.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
BIN=$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)
DIR=$(mktemp -d)
PORT=${PGTEST_PORT:-55433}
# Postgres refuses to run as root: use the postgres account then
AS=()
if [ "$(id -u)" = 0 ]; then chown postgres "$DIR"; AS=(runuser -u postgres --); fi
"${AS[@]}" "$BIN/initdb" -D "$DIR" -U postgres -A trust >/dev/null
"${AS[@]}" "$BIN/pg_ctl" -D "$DIR" -o "-p $PORT -k $DIR" -l "$DIR/log" start >/dev/null
trap '"${AS[@]}" "$BIN/pg_ctl" -D "$DIR" stop -m fast >/dev/null; rm -rf "$DIR"' EXIT
PSQL=(psql -h "$DIR" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q -X)
"${PSQL[@]}" -c "create database poe" >/dev/null
DB=("${PSQL[@]}" -d poe)
"${DB[@]}" -f tests/db/stubs.sql
for f in supabase/migrations/0001_init.sql supabase/migrations/0002_challenge_keys.sql supabase/migrations/0004_campus.sql supabase/migrations/0005_universities.sql; do
  "${DB[@]}" -f "$f" >/dev/null
done
# running 0004's seed twice must be harmless
"${DB[@]}" -f supabase/migrations/0005_universities.sql >/dev/null
"${DB[@]}" -f tests/db/test.sql
