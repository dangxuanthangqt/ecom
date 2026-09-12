#!/bin/sh
# Shared helpers for the pg_dump / pg_restore / psql scripts.
#
# Sourced by backup-database.sh and restore-database.sh — not executed directly.

# Prisma's DATABASE_URL carries connection parameters that libpq does not
# understand. Passing the raw URL to psql or pg_dump fails with
# "invalid URI query parameter". Strip the Prisma-only ones and keep the rest
# (sslmode, connect_timeout, application_name and friends are valid libpq).
#
# Usage: url="$(libpq_url "$DATABASE_URL")"
libpq_url() {
  echo "$1" | sed -E \
    -e 's/([?&])(schema|connection_limit|pool_timeout|pgbouncer|socket_timeout|statement_cache_size)=[^&]*/\1/g' \
    -e 's/[?&]+$//' \
    -e 's/\?&+/?/' \
    -e 's/&&+/\&/g' \
    -e 's/\?$//'
}

# Reports the non-default Prisma schema, if the URL names one. The dump covers
# every schema in the database, so this is informational only.
url_schema() {
  echo "$1" | sed -nE 's/.*[?&]schema=([^&]*).*/\1/p'
}
