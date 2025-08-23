FROM node:alpine AS base
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

RUN pnpm prune --prod

# ------------------------------------------------------
# Stage 3 - the production state
# ------------------------------------------------------

FROM node:20-alpine AS production
WORKDIR /app

COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/package.json ./
COPY --chown=node:node --from=builder /app/prisma ./prisma

# Copy entrypoint script
COPY --chown=node:node docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER node

ENTRYPOINT ["./docker-entrypoint.sh"]
