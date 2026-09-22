# Pinned to the exact Node patch in .nvmrc, which CI also reads, so the build,
# the migrator image and the runtime are reproducible and never drift apart.
# A FROM line cannot read .nvmrc, so this literal is the one place that must be
# updated alongside it — they drifted once already (CI on 20.17, image on 20.19)
# and the mismatch only surfaced when a dependency's engines.node range rejected
# the CI runner mid-install.
FROM node:24.21.0-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# No version here: corepack reads `packageManager` from package.json, the same
# source pnpm/action-setup uses in CI.
RUN corepack enable pnpm
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed
RUN apk add --no-cache libc6-compat


# ------------------------------------------------------
# Stage 1 - the dependencies state
# Install dependencies only when needed
# ------------------------------------------------------
# Set working directory
WORKDIR /app
# Copy package files
# pnpm-workspace.yaml carries the install settings (allowBuilds); pnpm 12 errors
# out without it rather than silently skipping build scripts.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# https://pnpm.io/cli/fetch
RUN pnpm fetch

# ------------------------------------------------------
# Stage 2 - the build state
# Rebuild the source code only when needed
# ------------------------------------------------------
FROM base AS builder
ENV NODE_ENV=production
#Skip install husky
WORKDIR /app
COPY . .
# Install dependencies based on the pnpm package manager
RUN pnpm install --offline
# Generate the Prisma client into src/generated/prisma. Needs no DATABASE_URL:
# prisma.config.ts omits the datasource when the variable is unset.
RUN pnpm prisma:generate
# Build application
RUN pnpm build

# ------------------------------------------------------
# Stage 3 - the migrator state
# Carries the Prisma CLI (a devDependency) plus the committed migrations.
# Run this image as a one-shot job BEFORE rolling out a new app version; the
# application image cannot and must not migrate (see docker-entrypoint.sh).
#   docker build --target migrator -t ecom-migrator .
#   docker run --rm -e DATABASE_URL=... ecom-migrator
# ------------------------------------------------------
FROM builder AS migrator
WORKDIR /app
ENV NODE_ENV=production
# Backup/restore tooling. postgresql15-client matches the postgres:15 server —
# a mismatched pg_dump major version can produce an unrestorable backup.
# Override the entrypoint to reach them:
#   docker run --rm --entrypoint sh ecom-migrator ./scripts/backup-database.sh
RUN apk add --no-cache postgresql15-client
USER node
ENTRYPOINT ["sh", "./scripts/run-database-migrations.sh"]

# ------------------------------------------------------
# Stage 4 - the pruner state
# Strips devDependencies (Prisma CLI included) for the runtime image.
# Kept separate from `builder` so the migrator above still has the CLI.
# ------------------------------------------------------
FROM builder AS pruner
WORKDIR /app
RUN pnpm prune --prod

# ------------------------------------------------------
# Stage 5 - the production state
# ------------------------------------------------------

# Starts from a clean pinned image, not from `base`: `base` carries the pnpm
# store populated by `pnpm fetch`, which has no business in a runtime image.
# Keep this tag identical to the `base` stage and to .nvmrc.
FROM node:24.21.0-alpine AS production
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production

COPY --chown=node:node --from=pruner /app/node_modules ./node_modules
COPY --chown=node:node --from=pruner /app/dist ./dist
COPY --chown=node:node --from=pruner /app/package.json ./
# No prisma/ directory here on purpose: the Prisma 7 client is compiled into
# dist/ with the rest of the source, and migrations are NOT applied from this
# image (see the migrator stage).

# Copy entrypoint script
COPY --chown=node:node docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER node

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
