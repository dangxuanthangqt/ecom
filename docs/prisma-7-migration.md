# Prisma 7 Migration

What changed when this repository moved from Prisma 6.4.1 to Prisma 7.10.0, why, and what it
means for day-to-day work.

**Related:** [database-migration.md](database-migration.md) · [database-seeding.md](database-seeding.md) ·
[postgres-database-management.md](postgres-database-management.md) · [e2e-testing.md](e2e-testing.md)

---

## 1. Why we upgraded

`pnpm db:seed` once failed with `Database "ecom_prod" does not exist` even though `NODE_ENV=development`
selected `.env.development` (`ecom_db`). The cause was Prisma 6 itself: importing `@prisma/client`
**loaded `.env` and wrote `DATABASE_URL` into `process.env` before any of our code ran**. Imports
execute before the module body, and `dotenv` never overwrites an existing key, so our
`config({ path: resolveEnvFilePath() })` became a silent no-op and the production URL won.

Prisma 7 removes that behaviour entirely:

- Neither the CLI nor the client loads any `.env` file on its own.
- `PrismaClient` no longer reads `DATABASE_URL`; the connection string is passed explicitly through a
  driver adapter.

There is nothing left that can inject an env file behind our back. Every Prisma code path in the repo
now goes through the one resolver the Nest app already used (`src/constants/env-file.constant.ts`).

## 2. The one place env files are loaded: `prisma.config.ts`

```ts
loadEnvFile({ path: resolveEnvFilePath() }); // .env.development | .env.test | .env, by NODE_ENV

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "ts-node prisma/seed.ts" },
  datasource: databaseUrl
    ? { url: databaseUrl, shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL }
    : undefined,
});
```

| Situation                                        | What happens                                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `pnpm prisma:migrate:dev` (no `NODE_ENV`)        | Loads `.env.development`. Default is development, never production.                        |
| `NODE_ENV=test pnpm exec prisma migrate reset`   | Loads `.env.test` — this is what `scripts/prepare-e2e-database.sh` and `db:test:reset` do. |
| Docker `migrator` / CI job with `DATABASE_URL`   | Real process variables win; the file (if it even exists) fills in nothing.                 |
| Docker `builder` stage running `prisma generate` | No `DATABASE_URL` → `datasource` is omitted → generate/validate/format still work.         |
| `prisma migrate status` with no URL              | Prisma fails with "datasource.url is required", not with an empty connection string.       |

Consequences:

- `dotenv-cli` is gone. Use `NODE_ENV=<env>` instead of `dotenv -e <file> --`.
- The `prisma.seed` key in `package.json` moved to `migrations.seed` in the config.

## 3. Driver adapter: how a `PrismaClient` is built now

`new PrismaClient()` with no adapter throws in Prisma 7. All clients are built in one helper,
[`src/shared/utils/prisma-client.util.ts`](../src/shared/utils/prisma-client.util.ts):

| Caller                                    | How it gets a URL                                                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `PrismaService` (the Nest app)            | Injects `AppConfigService` and passes `appConfig.databaseUrl` — the value `ConfigModule` loaded and `validateEnv` checked. |
| `prisma/seed.ts`, `prisma/seed-volume.ts` | `createStandalonePrismaClient()` after `config({ path: resolveEnvFilePath() })`.                                           |
| `initial-scripts/index.ts`                | Same standalone factory.                                                                                                   |
| `initial-scripts/create-permission.ts`    | Boots `AppModule` and uses `app.get(PrismaService)` — no second connection string to keep in sync.                         |
| `test/e2e/support/prisma-test-client.ts`  | Standalone factory; `.env.test` is already in `process.env` thanks to Jest `setupFiles`.                                   |

The adapter is `@prisma/adapter-pg` over `pg`'s pool. The Prisma-only `?schema=` URL parameter is
lifted out and passed as the adapter's `schema` option (it becomes `search_path`).

## 4. The generated client lives in `src/generated/prisma`

The `prisma-client` generator emits plain TypeScript instead of writing into `node_modules`.

- Import from `@/generated/prisma/client` (`PrismaClient`, `Prisma`, model types, enums).
- The folder is gitignored, prettier-ignored, eslint-ignored and excluded from coverage. CI caches it
  (`.github/actions/prisma-setup`) and regenerates on schema change; `pnpm prisma:generate` after every
  pull that touches `schema.prisma`.
- Runtime error classes come from the same module: `Prisma.PrismaClientKnownRequestError`. Do **not**
  import from `@prisma/client/runtime/library` — that is the deprecated `prisma-client-js` runtime and
  `instanceof` against it would silently never match what the v7 client throws.
- `Prisma.validator` no longer exists. Selectors use
  [`defineSelect`](../src/shared/utils/prisma-select.util.ts), a curried identity with the same shape:
  `defineSelect<Prisma.UserSelect>()({ id: true })`.
- `prisma-json-types-generator` 5.x types `Product.variants` as `PrismaJson.Variants`
  (`src/types/lib/prisma.d.ts`). The namespace was previously misspelled (`PrismaJon`), which made the
  generator a no-op and forced `as unknown as Prisma.InputJsonValue` casts in the seeds; both are fixed.

## 5. CLI changes that touched our scripts

| Prisma 6                                                    | Prisma 7                                                            | Where                                      |
| ----------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------ |
| `prisma db execute --stdin --url "$DATABASE_URL"`           | `prisma db execute --stdin` (URL from config)                       | `scripts/run-database-migrations.sh`       |
| `prisma migrate diff --from-url "$DATABASE_URL" ...`        | `--from-config-datasource`                                          | `db:drift:live*`                           |
| `--to-schema-datamodel`, `--shadow-database-url`            | `--to-schema`; shadow URL from config                               | `prisma:migrate:drift`                     |
| `prisma migrate reset --force --skip-seed`                  | `prisma migrate reset --force` (never seeds; flag removed)          | `db:test:reset`, `prepare-e2e-database.sh` |
| `prisma migrate reset` seeds via `package.json#prisma.seed` | Only `prisma db seed` seeds, via `prisma.config.ts#migrations.seed` | `docs/database-seeding.md`                 |

`prisma migrate dev` still triggers generators after applying a migration.

## 6. Running destructive commands from an AI agent

Prisma 7 detects Claude Code and similar agents and refuses `prisma migrate reset` (and other
data-destroying commands) unless `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` carries the user's
literal consent message. This affects `pnpm test:e2e` when it is started by an agent, because the
e2e setup resets `ecom_e2e`. A human running it, or CI, is unaffected.

## 7. Requirements

| Requirement | Minimum for Prisma 7 | This repo                     |
| ----------- | -------------------- | ----------------------------- |
| Node.js     | 20.19 / 22.12 / 24   | 24.x (`.nvmrc`, `devEngines`) |
| TypeScript  | 5.4                  | 5.7.3                         |
| Postgres    | any supported        | 15                            |

Unit tests are noticeably heavier under `ts-jest` because the generated client is type-checked per
worker; on a 16 GB machine run `pnpm exec jest --maxWorkers=2` if the default gets OOM-killed. CI
already caps workers at 2.
