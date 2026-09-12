#!/bin/sh
# Takes a verified logical backup of the target database with pg_dump.
#
# This is the project's ONLY recovery point. There is no WAL archiving and no
# PITR in this setup (archive_mode=off on postgres:15-alpine), so a dump taken
# here is the newest state any restore can return to. Run it before every
# production migration.
#
# Custom format (-Fc) is used deliberately: it is compressed, and pg_restore can
# read it selectively (single table, schema-only, data-only) — which plain SQL
# cannot do. See docs/database-rollback-recovery.md.
#
# Environment variables:
#   DATABASE_URL  (required) database to dump.
#   BACKUP_DIR    (optional, default ./backups) destination directory.
#                 MUST be durable storage — a mounted volume or an object store
#                 sync target. A dump written inside an ephemeral container is
#                 not a backup.
#   BACKUP_LABEL  (optional) suffix in the filename, e.g. "pre-migration".
#   RETENTION_DAYS (optional, default 14) delete local dumps older than this.
#                 Set to 0 to keep everything.

set -eu

BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_LABEL="${BACKUP_LABEL:-manual}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

log() {
  echo "[db-backup] $*"
}

fail() {
  echo "[db-backup] ERROR: $*" >&2
  exit 1
}

[ -n "${DATABASE_URL:-}" ] || fail "DATABASE_URL is not set."
command -v pg_dump >/dev/null 2>&1 || fail "pg_dump not found. Install postgresql15-client, \
or run this from the Docker 'migrator' image which bundles it."

# shellcheck source=./postgres-url-helpers.sh
. "$(dirname "$0")/postgres-url-helpers.sh"

# Prisma's URL carries params libpq rejects (schema=, connection_limit=, ...).
PG_URL="$(libpq_url "$DATABASE_URL")"
prisma_schema="$(url_schema "$DATABASE_URL")"
if [ -n "$prisma_schema" ] && [ "$prisma_schema" != "public" ]; then
  log "NOTE: DATABASE_URL names schema '$prisma_schema'; the dump covers ALL schemas in the database."
fi

# Server and client major versions must match, or the dump may be unrestorable.
server_version="$(psql "$PG_URL" -tAc 'SHOW server_version;' 2>/dev/null | cut -d. -f1)" \
  || fail "Cannot connect to the database."
client_version="$(pg_dump --version | awk '{print $3}' | cut -d. -f1)"
if [ "$server_version" != "$client_version" ]; then
  fail "pg_dump major version ($client_version) does not match the server ($server_version). \
Dumping with a mismatched client risks an unrestorable backup."
fi

mkdir -p "$BACKUP_DIR"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
outfile="$BACKUP_DIR/ecom-${BACKUP_LABEL}-${timestamp}.dump"

log "Server PostgreSQL $server_version. Dumping to $outfile ..."

# --no-owner / --no-privileges keep the dump restorable into a database owned by
# a different role (e.g. restoring production into a staging box for a drill).
pg_dump "$PG_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$outfile"

[ -s "$outfile" ] || fail "Dump file is empty — treat this as a FAILED backup."

# A dump that cannot be listed cannot be restored. Verify before trusting it.
log "Verifying dump integrity..."
object_count="$(pg_restore --list "$outfile" | grep -cv '^;' || true)"
[ "$object_count" -gt 0 ] || fail "Dump contains no restorable objects — FAILED backup."

size="$(wc -c < "$outfile" | tr -d ' ')"
log "OK: $object_count objects, ${size} bytes."
log "Backup: $outfile"

if [ "$RETENTION_DAYS" -gt 0 ]; then
  log "Pruning local dumps older than ${RETENTION_DAYS} days..."
  find "$BACKUP_DIR" -name 'ecom-*.dump' -type f -mtime "+${RETENTION_DAYS}" -print -delete || true
fi

# Emit the path so a caller (CI job, migration runbook) can capture it.
echo "$outfile"
