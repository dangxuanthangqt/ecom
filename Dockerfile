# Pinned to an exact Node 20 LTS patch (the same major CI uses) so the build,
# the migrator image and the runtime are reproducible and never drift apart.
# Do not pin below 20.19: earlier patches ship a corepack whose registry signing
# keys are expired, which breaks `corepack prepare` at build time.
FROM node:20.19.5-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm && corepack prepare --activate pnpm@10.6.5
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed
RUN apk add --no-cache libc6-compat


# ------------------------------------------------------
# Stage 1 - the dependencies state
# Install dependencies only when needed
# ------------------------------------------------------
# Set working directory
WORKDIR /app
# Copy package files
COPY package.json pnpm-lock.yaml ./
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
# Generate Prisma client
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
FROM node:20.19.5-alpine AS production
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production

COPY --chown=node:node --from=pruner /app/node_modules ./node_modules
COPY --chown=node:node --from=pruner /app/dist ./dist
COPY --chown=node:node --from=pruner /app/package.json ./
# Schema is kept for the generated client's runtime lookup. Migrations are NOT
# applied from this image.
COPY --chown=node:node --from=pruner /app/prisma ./prisma

# Copy entrypoint script
COPY --chown=node:node docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER node

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
