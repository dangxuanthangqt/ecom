# E-commerce project API

## Preparation steps

You need to run the following step by step.

1. Generate a dot environment file and fill in your environment information

   ```bash
   # for local development mode
   cp .env.example .env.development

   # for local production mode or docker
   cp .env.example .env.local
   ```

2. Use the project's Node version. It is pinned in `.nvmrc`, and CI, the Docker
   image and `engines.node` all read the same version — a mismatch fails at
   install time rather than in CI:

   ```bash
   nvm use   # installs/activates the version in .nvmrc
   ```

3. Install dependencies. pnpm comes from the `packageManager` field via corepack,
   so there is no version to pass:

   ```bash
   corepack enable pnpm
   pnpm install
   ```

### In your local production mode

Use `./.env.local` to load environment variables

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

`pnpm prisma migrate reset` runs this seed automatically via the `prisma.seed`
hook.

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

### Start Postgres Server on local

```bash
# start the database server and init database
$ docker compose up db -d
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
