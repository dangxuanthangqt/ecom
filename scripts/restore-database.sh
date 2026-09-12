#!/bin/sh
# Restores a pg_dump custom-format backup into the target database.
#
# ############################################################################
# # THIS IS DESTRUCTIVE. --clean --if-exists DROPS every object in the target #
# # database before recreating it. Everything written since the dump is LOST. #
# ############################################################################
#
# It is the LAST resort in the recovery decision tree — try forward-fix and
# application rollback first (docs/database-rollback-recovery.md § decision tree).
#
# Environment variables:
#   DATABASE_URL     (required) database to restore INTO.
#   BACKUP_FILE      (required) path to the .dump produced by backup-database.sh.
#   CONFIRM_RESTORE  (required) must equal the target database name, exactly.
#                    This is the guard against restoring over the wrong database.
#   SAFETY_BACKUP    (optional, default true) dump the current state first, so a
#                    wrong restore is itself recoverable. Never set false in prod.

set -eu

SAFETY_BACKUP="${SAFETY_BACKUP:-true}"

log() {
  echo "[db-restore] $*"
}

fail() {
  echo "[db-restore] ERROR: $*" >&2
  exit 1
}

[ -n "${DATABASE_URL:-}" ] || fail "DATABASE_URL is not set."
[ -n "${BACKUP_FILE:-}" ] || fail "BACKUP_FILE is not set."
[ -f "$BACKUP_FILE" ] || fail "Backup file not found: $BACKUP_FILE"
command -v pg_restore >/dev/null 2>&1 || fail "pg_restore not found. Install postgresql15-client, \
or run this from the Docker 'migrator' image which bundles it."

# shellcheck source=./postgres-url-helpers.sh
. "$(dirname "$0")/postgres-url-helpers.sh"

# Prisma's URL carries params libpq rejects (schema=, connection_limit=, ...).
PG_URL="$(libpq_url "$DATABASE_URL")"

# Resolve the target database name from the URL, for the confirmation guard.
target_db="$(psql "$PG_URL" -tAc 'SELECT current_database();' 2>/dev/null)" \
  || fail "Cannot connect to the database."

if [ "${CONFIRM_RESTORE:-}" != "$target_db" ]; then
  cat >&2 <<EOF
[db-restore] ERROR: confirmation required.

  About to DROP AND REPLACE every object in database: $target_db
  Using backup file:                                  $BACKUP_FILE

  All data written to "$target_db" since that dump will be permanently lost.

  To proceed, re-run with the target database name as confirmation:

      CONFIRM_RESTORE="$target_db" ... pnpm db:restore
EOF
  exit 1
fi

# Verify the archive is readable BEFORE destroying anything.
log "Verifying backup archive..."
object_count="$(pg_restore --list "$BACKUP_FILE" | grep -cv '^;' || true)"
[ "$object_count" -gt 0 ] || fail "Backup contains no restorable objects. Refusing to drop the database."
log "Archive OK: $object_count objects."

# Dump the current state first — a mis-targeted restore is then still reversible.
if [ "$SAFETY_BACKUP" = "true" ]; then
  log "Taking a safety backup of the CURRENT state before overwriting..."
  BACKUP_LABEL="pre-restore" sh "$(dirname "$0")/backup-database.sh" >/dev/null \
    || fail "Safety backup failed. Refusing to restore. \
Set SAFETY_BACKUP=false only if you accept losing the current state unrecoverably."
  log "Safety backup written to \${BACKUP_DIR:-./backups}."
fi

log "Restoring into $target_db ..."

# --single-transaction makes the restore atomic: on any error the database is
# left exactly as it was, rather than half-replaced.
# --exit-on-error pairs with it so the first failure aborts the whole restore.
set +e
pg_restore \
  --dbname="$PG_URL" \
  --clean --if-exists \
  --no-owner --no-privileges \
  --single-transaction \
  --exit-on-error \
  "$BACKUP_FILE"
restore_code=$?
set -e

if [ "$restore_code" -ne 0 ]; then
  fail "pg_restore failed (exit $restore_code). Because --single-transaction was used, \
the database was NOT modified. See docs/database-rollback-recovery.md § Emergency runbook."
fi

log "Restore complete."

cat <<'NEXT'
[db-restore] NEXT STEPS — the restore is not finished until these pass:

  1. Reconcile Prisma state (the restored DB carries the _prisma_migrations
     table as it was AT DUMP TIME, which may be behind the code):
         pnpm prisma:migrate:status

  2. If migrations are pending, apply them:
         pnpm db:migrate

  3. Confirm schema and migration history agree:
         pnpm prisma:migrate:drift

  4. Verify row counts against expectations before reopening traffic.
NEXT
