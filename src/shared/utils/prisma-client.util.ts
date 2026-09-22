import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma-only `DATABASE_URL` query parameters. Prisma 6 read them itself;
 * under Prisma 7 the URL goes straight to `pg`, which silently ignores every
 * key it does not know — so each one is translated to its pool equivalent here
 * rather than being dropped on the floor.
 */
const PRISMA_URL_PARAMS = {
  schema: "search_path handed to the adapter",
  connection_limit: "pg Pool `max`",
  pool_timeout: "pg Pool `connectionTimeoutMillis`",
} as const;

const readSeconds = (
  value: string | null,
  name: string,
): number | undefined => {
  if (value === null) return undefined;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new Error(`DATABASE_URL: ${name}=${value} is not a valid number.`);
  }
  return seconds;
};

/**
 * Prisma 7 requires a driver adapter: `new PrismaClient()` without one throws.
 * The adapter is also where the connection string now goes — the client itself
 * no longer reads `DATABASE_URL`, or any `.env` file, on its own. Every
 * `PrismaClient` in this repo (the Nest `PrismaService`, the seed scripts, the
 * e2e fixture client) is built here so the pool configuration and the
 * Prisma-specific URL parameters cannot drift between them.
 */
export function createPrismaAdapter(databaseUrl: string): PrismaPg {
  const url = new URL(databaseUrl);
  const params = url.searchParams;

  const schema = params.get("schema") ?? undefined;
  const max = readSeconds(params.get("connection_limit"), "connection_limit");
  const poolTimeout = readSeconds(params.get("pool_timeout"), "pool_timeout");

  for (const key of Object.keys(PRISMA_URL_PARAMS)) {
    params.delete(key);
  }

  return new PrismaPg(
    {
      connectionString: url.toString(),
      max,
      // Prisma expressed this in seconds; pg wants milliseconds. `0` in Prisma
      // meant "wait forever", which is also pg's meaning for `0`.
      connectionTimeoutMillis:
        poolTimeout === undefined ? undefined : poolTimeout * 1000,
    },
    { schema },
  );
}

/**
 * A bare client for scripts that do not boot the Nest application (seeds,
 * one-off maintenance scripts, e2e fixtures). The caller is responsible for
 * having loaded the right env file first — see `prisma.config.ts` for why no
 * `.env` is picked up implicitly any more.
 */
export function createStandalonePrismaClient(
  databaseUrl: string | undefined = process.env.DATABASE_URL,
): PrismaClient {
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Load the env file for the current NODE_ENV " +
        "before creating a PrismaClient (see src/constants/env-file.constant.ts).",
    );
  }

  return new PrismaClient({ adapter: createPrismaAdapter(databaseUrl) });
}
