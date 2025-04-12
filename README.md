# E-commerce project API

## Project setup

```bash
$ pnpm install
```

### Seeding initial data (ex: roles....)

```bash
# Seed roles and create admin user
$  pnpm run seed:initial-scripts

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
