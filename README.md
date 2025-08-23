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

2. Install dependencies:

   ```bash
   pnpm install
   ```

### In your local production mode

Use `./.env.local` to load environment variables

```bash
$   docker-compose up -d --build
```

Open [http://localhost:4000/api](http://localhost:4000/api) with your browser to see the result.

### Seeding initial data (ex: roles....)

Update the DATABASE_URL in `.env.development` file to match your target database configuration.

```bash
# Seed roles and create admin user
$  pnpm run seed:initial-scripts

# Seed permissions development, create permission for admin role
$  pnpm run seed:initial-scripts:create-permission
# (NODE_ENV=development ts-node initial-scripts/create-permission)
```

## Database

### Start Postgres Server on local

```bash
# start the database server and init database
$ docker compose up db -d
```

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
