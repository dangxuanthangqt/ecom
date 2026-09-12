#!/bin/sh
# Entrypoint for the application container.
#
# It deliberately does NOT run database migrations. Every app replica shares this
# entrypoint, so migrating here means N instances racing the same schema on every
# scale-up or rolling deploy. Migrations are applied exactly once, by the
# dedicated `migrator` image (Dockerfile stage `migrator`) or by the CI/CD
# migration job, BEFORE the new app version starts.
#
# See docs/database-migration.md.

set -eu

echo "[entrypoint] Starting application..."

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[entrypoint] ERROR: DATABASE_URL is not set." >&2
  exit 1
fi

exec "$@"
