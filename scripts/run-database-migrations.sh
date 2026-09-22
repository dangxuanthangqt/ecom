#!/bin/sh
# Applies committed Prisma migrations with `prisma migrate deploy`.
#
# Single source of truth for every non-development environment: the Docker
# `migrator` stage, the GitHub Actions migration job, and manual production runs
# all call this script so they behave identically.
#
# NEVER uses `prisma migrate dev` or `prisma db push` — both are development-only
# and can drop data.
#
# Environment variables:
#   DATABASE_URL   (required) Postgres connection string for the target database.
#   DRY_RUN        (optional) "true" => report pending migrations and exit 0
#                             without applying anything.
#   DB_WAIT_RETRIES  (optional, default 30) readiness probe attempts.
#   DB_WAIT_DELAY    (optional, default 2)  seconds between attempts.

set -eu

PRISMA="./node_modules/.bin/prisma"
DB_WAIT_RETRIES="${DB_WAIT_RETRIES:-30}"
DB_WAIT_DELAY="${DB_WAIT_DELAY:-2}"

log() {
  echo "[db-migrate] $*"
}

fail() {
  echo "[db-migrate] ERROR: $*" >&2
  exit 1
}

# --- Preconditions -----------------------------------------------------------

[ -n "${DATABASE_URL:-}" ] || fail "DATABASE_URL is not set."

[ -x "$PRISMA" ] || fail "Prisma CLI not found at $PRISMA. \
This image or checkout does not carry the Prisma CLI — run migrations from the \
Docker 'migrator' stage or a full (non-pruned) install."

[ -d "./prisma/migrations" ] || fail "./prisma/migrations not found. Run from the repository root."

# --- Wait for the database to accept connections -----------------------------
# Replaces a fixed `sleep`: probes until Postgres actually answers.

log "Waiting for database (max $((DB_WAIT_RETRIES * DB_WAIT_DELAY))s)..."
attempt=1
while [ "$attempt" -le "$DB_WAIT_RETRIES" ]; do
  # No --url: Prisma 7 removed it; prisma.config.ts supplies DATABASE_URL.
  if echo "SELECT 1;" | "$PRISMA" db execute --stdin >/dev/null 2>&1; then
    log "Database is accepting connections."
    break
  fi
  if [ "$attempt" -eq "$DB_WAIT_RETRIES" ]; then
    fail "Database unreachable after $DB_WAIT_RETRIES attempts."
  fi
  attempt=$((attempt + 1))
  sleep "$DB_WAIT_DELAY"
done

# --- Report state before touching anything -----------------------------------

log "Current migration status:"
set +e
"$PRISMA" migrate status
status_code=$?
set -e

# `migrate status` exits non-zero when migrations are pending (expected here) and
# also when the history is broken. Exit code 1 with a failed migration is fatal:
# `migrate deploy` would refuse anyway (P3009), so surface it with guidance now.
if [ "$status_code" -ne 0 ]; then
  log "Migration history reports pending or failed migrations (exit $status_code)."
fi

if [ "${DRY_RUN:-false}" = "true" ]; then
  log "DRY_RUN=true — no migrations applied."
  exit 0
fi

# --- Apply -------------------------------------------------------------------

log "Applying migrations (prisma migrate deploy)..."
set +e
"$PRISMA" migrate deploy
deploy_code=$?
set -e

if [ "$deploy_code" -ne 0 ]; then
  cat >&2 <<'REMEDIATION'
[db-migrate] ERROR: `prisma migrate deploy` failed.

The database is now in one of two states:

  1. A migration failed part-way (Prisma error P3009). The failed migration is
     recorded in _prisma_migrations with finished_at = NULL. Every later
     `migrate deploy` will refuse until it is resolved.

     Resolve it deliberately — never by editing _prisma_migrations by hand:
       - Rolled back / no effect left in the DB:
           pnpm prisma:migrate:resolve:rolled-back <migration_name>
       - Effects were completed manually and match the migration:
           pnpm prisma:migrate:resolve:applied <migration_name>

  2. Connection / permission / lock-timeout failure — nothing was applied.
     Fix the cause and re-run; `migrate deploy` is safe to retry.

See docs/database-migration.md § Failure troubleshooting before retrying.
REMEDIATION
  exit "$deploy_code"
fi

log "Migrations applied. Final status:"
"$PRISMA" migrate status

log "Done."
