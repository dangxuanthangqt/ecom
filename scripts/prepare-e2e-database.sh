#!/bin/sh
# Resets, migrates, seeds and permission-syncs the isolated `ecom_e2e` database,
# then flushes redis logical DB 1. Run automatically via `pretest:e2e`; callable
# on its own (`pnpm test:e2e:setup`) for debugging the setup step in isolation.
#
# NEVER touches dev/prod data: every destructive step below only runs after the
# hard guard confirms DATABASE_URL points at `ecom_e2e`.

set -e

log() {
  echo "[prepare-e2e-database] $*"
}

fail() {
  echo "[prepare-e2e-database] ERROR: $*" >&2
  exit 1
}

[ -f .env.test ] || fail ".env.test not found. Copy it from .env.test.example first."

# Export every var .env.test defines (NODE_ENV, DATABASE_URL, REDIS_URL) into
# this shell so the prisma/ts-node/redis-cli invocations below all see them.
set -a
# shellcheck disable=SC1091
. ./.env.test
set +a

# --- Guard: refuse to run against anything but the e2e database --------------
# The single most important line in this script. A typo'd or stale .env.test
# pointing at ecom_prod would otherwise TRUNCATE/reset real data.
case "${DATABASE_URL:-}" in
  *ecom_e2e*) ;;
  *)
    fail "DATABASE_URL does not contain \"ecom_e2e\" (got: \"${DATABASE_URL:-<unset>}\"). Refusing to run."
    ;;
esac

[ "${NODE_ENV:-}" = "test" ] || fail "NODE_ENV must be \"test\" (got: \"${NODE_ENV:-<unset>}\")."

# `I18nModule` (src/shared/modules/i18n.module.ts) resolves its translations
# directory as `isDevelopment ? "src/i18n" : "dist/i18n"`. `NODE_ENV=test`
# makes `isDevelopment` false (by design — Swagger must not mount either), so
# the app looks for `dist/i18n`, which a plain checkout never has: `nest build`
# nests output under `dist/src/i18n` (tsconfig has no `rootDir` override), a
# pre-existing mismatch this phase does not attempt to fix (it is unrelated to
# NODE_ENV=test and would need to be fixed for a real production build too).
# Mirroring the directory here is a build-artifact copy, not a source change,
# and is required for any app boot under a non-development NODE_ENV.
log "Mirroring src/i18n to dist/i18n (I18nModule looks there under NODE_ENV=test)..."
mkdir -p dist
rm -rf dist/i18n
cp -r src/i18n dist/i18n

# `pnpm exec` (not a bare `./node_modules/.bin/...` path) so the invoked CLI
# gets `node_modules/.bin` on its own PATH — `prisma migrate reset` shells out
# to the `prisma-json-types-generator` generator binary, which only resolves
# with that PATH augmentation in place.
# Prisma 7's `migrate reset` never seeds (and `--skip-seed` no longer exists):
# the seed step below is the only one. prisma.config.ts reads DATABASE_URL from
# `.env.test` because NODE_ENV=test — the same variables exported above.
log "Resetting and migrating ecom_e2e..."
NODE_ENV=test pnpm exec prisma migrate reset --force

log "Seeding core + demo fixtures..."
NODE_ENV=test pnpm exec ts-node prisma/seed.ts --reset

log "Syncing route permissions..."
NODE_ENV=test pnpm exec ts-node initial-scripts/create-permission.ts

log "Flushing redis logical DB 1..."
case "${REDIS_URL:-}" in
  *localhost*/1|*127.0.0.1*/1)
    # `docker compose exec` parses the whole compose file, including the
    # `env_file: .env` on services this script never touches (`app`,
    # `migrate`) — so it fails on a checkout that has no `.env` yet.
    # `ps -q` resolves just the one container id without that requirement.
    redis_container="$(docker compose ps -q redis)"
    [ -n "$redis_container" ] || fail "docker compose redis service is not running. Run: docker compose up -d redis"
    docker exec "$redis_container" redis-cli -n 1 FLUSHDB
    ;;
  *)
    fail "REDIS_URL does not select logical DB 1 (got: \"${REDIS_URL:-<unset>}\"). Refusing to FLUSHDB."
    ;;
esac

log "Done."
