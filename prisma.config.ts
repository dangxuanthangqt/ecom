import { config as loadEnvFile } from "dotenv";
import { defineConfig } from "prisma/config";

import { resolveEnvFilePath } from "./src/constants/env-file.constant";

/**
 * Prisma 7 loads NO env file on its own — neither the CLI nor the generated
 * client. That is deliberate and it is what this file relies on: the ONLY env
 * file read here is the one `NODE_ENV` selects (`.env.development` by default,
 * `.env.test`, or `.env` for production), the same resolver the Nest app and
 * the seed scripts use. Under Prisma 6 the client silently loaded `.env` at
 * import time, which is how `pnpm db:seed` once ended up on the production URL.
 *
 * `dotenv` never overwrites a variable that is already set, so real process
 * environment (Docker `env_file`, CI job `env:`) still wins over the file.
 */
loadEnvFile({ path: resolveEnvFilePath() });

const databaseUrl = process.env.DATABASE_URL;

// The test environment is the only one whose commands are destructive by
// design (`migrate reset` in `db:test:reset` and the e2e setup). A stale or
// mistyped `.env.test`, or a production DATABASE_URL exported in the shell,
// must never let those commands reach another database — the same guard
// `scripts/prepare-e2e-database.sh` applies, enforced once more where every
// Prisma CLI command passes.
if (
  process.env.NODE_ENV === "test" &&
  databaseUrl &&
  !databaseUrl.includes("ecom_e2e")
) {
  throw new Error(
    `NODE_ENV=test but DATABASE_URL does not name the ecom_e2e database (got "${databaseUrl}"). Refusing to run.`,
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // `prisma db seed` only. Prisma 7's `migrate dev` / `migrate reset` never
    // seed implicitly, so the e2e setup script and `pnpm db:seed*` call the
    // seed entrypoint themselves.
    seed: "ts-node prisma/seed.ts",
  },
  // Omitted (not empty) when DATABASE_URL is unset so `prisma generate`,
  // `prisma validate` and `prisma format` keep working in the Docker builder
  // stage and on a fresh checkout. Every command that actually needs a
  // database — migrate, db execute, db seed — fails on its own with a clear
  // "datasource url is missing" error instead of an empty connection string.
  datasource: databaseUrl
    ? {
        url: databaseUrl,
        shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
      }
    : undefined,
});
