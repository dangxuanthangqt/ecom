# E-commerce project API

## Preparation steps

You need to run the following step by step.

1. Generate the environment files and fill in your environment information.

   Each environment reads exactly **one** file, picked by `NODE_ENV`
   (`src/constants/env-file.constant.ts`) — nothing falls back to another file,
   so every file must carry the full key set from `.env.example`:

   | NODE_ENV      | File               | Used by                           |
   | ------------- | ------------------ | --------------------------------- |
   | `development` | `.env.development` | `pnpm start:dev`, seeds (default) |
   | `test`        | `.env.test`        | `pnpm test:e2e`                   |
   | `production`  | `.env`             | `pnpm start:prod`, docker compose |

   ```bash
   # local development
   cp .env.example .env.development

   # local production mode or docker
   cp .env.example .env   # then set NODE_ENV=production inside it

   # e2e tests
   cp .env.test.example .env.test
   ```

2. Use the project's Node version. `.nvmrc` is what the humans and CI read
   (`actions/setup-node` takes `node-version-file: .nvmrc`); the `FROM` lines in
   the Dockerfile carry the same literal because a `FROM` cannot read a file.

   ```bash
   nvm use   # installs/activates the version in .nvmrc
   ```

   The version is _enforced_ by `devEngines.runtime` in `package.json`, not by
   `.nvmrc` and not by `engines.node`. Since pnpm 12, `engines.node` is metadata
   only. Any project command on the wrong Node stops with
   `ERR_PNPM_BAD_RUNTIME_VERSION` before it runs — `pnpm install`, `pnpm start:dev`,
   `pnpm test`, all of them. Keep the three versions in step when you bump.

3. Install dependencies. pnpm comes from the `packageManager` field via corepack,
   so there is no version to pass:

   ```bash
   corepack enable pnpm
   pnpm install
   ```

### In your local production mode

`docker-compose.yml` loads `./.env` as the container environment.

```bash
$   docker-compose up -d --build
```

Open [http://localhost:4000/api](http://localhost:4000/api) with your browser to see the result.

### Seeding data

Update the DATABASE_URL in `.env.development` file to match your target database configuration.

Full reference: [docs/database-seeding.md](docs/database-seeding.md).

#### Fixture seed — everyday development

Small (~180 rows), deterministic and idempotent. Fixed ids, so e2e tests and
Postman collections can hardcode them. Re-run it as often as you like.

```bash
# core (languages, roles, admin) + demo catalogue
$ pnpm run db:seed

# truncate the seeded tables first
$ pnpm run db:seed:reset

# core only — the only tier that runs outside development/test
$ pnpm run db:seed:core
```

`prisma migrate reset` does **not** seed (Prisma 7 removed that hook); run
`pnpm run db:seed` — or `pnpm exec prisma db seed` — after a reset.

Demo accounts: `seller@ecom.local`, `client@ecom.local`, `client2@ecom.local` —
all with password `Password@123`. The admin account comes from `ADMIN_EMAIL` /
`ADMIN_PASSWORD` in your env file.

#### Volume seed — performance work

Bulk random data for pagination, index and query measurement. Run on demand;
never part of `migrate reset`. Needs the core seed first. Refused unless
`NODE_ENV` is `development` or `test`.

```bash
# ~44k rows in about 2s
$ pnpm run db:seed:volume

# tune any count
$ pnpm run db:seed:volume --products=20000 --orders=50000

# remove volume data, leaving the fixture data intact
$ pnpm run db:seed:volume:clean
```

#### Permissions

Permissions are derived from the live route table, so they need a booted app
rather than a fixture:

```bash
$ pnpm run seed:initial-scripts:create-permission
# (NODE_ENV=development ts-node initial-scripts/create-permission)
```

## Database

One Postgres server holds several isolated databases — `ecom_db` (development), `ecom_prod`
(compose), `ecom_e2e` (tests) and Prisma's `ecom_shadow`. Which env file points where, how the
container decides whether to create a database, and the errors that follow from it:
[docs/postgres-database-management.md](docs/postgres-database-management.md)
([vi](docs/postgres-database-management.vi.md)).

### Start Postgres Server on local

```bash
# start the database server and init database
$ docker compose up db -d
```

`POSTGRES_DB` in `docker-compose.yml` only creates a database while the `postgres_data` volume is
empty. On an existing volume, create one explicitly:

```bash
$ docker exec ecom-db-1 psql -U postgres -c 'CREATE DATABASE ecom_db;'
```

## Redis

Redis caches the auth guard's role/permission lookup (see
[docs/redis-role-permission-cache.md](docs/redis-role-permission-cache.md)). Required for the app to
boot — set `REDIS_URL` in your env file (defaults to `redis://localhost:6379` in `.env.example`).

### Start Redis Server on local

```bash
# start Redis only (useful with `pnpm run start:dev`, which runs outside docker)
$ docker compose up redis -d
```

`docker-compose up -d --build` (production mode above) already starts Redis alongside Postgres and the
app, so this is only needed when running the app directly on the host.

### Generate prisma client

```bash
$ pnpm run prisma:generate

```

If having issue related bcrypt, please run `npm rebuild bcrypt` after install dependencies.

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```
