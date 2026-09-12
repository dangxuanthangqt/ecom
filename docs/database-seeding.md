# Database Seeding

Two seeders, two jobs:

|                         | Fixture seed                    | Volume seed                             |
| ----------------------- | ------------------------------- | --------------------------------------- |
| Entry                   | `prisma/seed.ts`                | `prisma/seed-volume.ts`                 |
| Size                    | ~180 rows                       | tens of thousands, tunable              |
| Ids                     | fixed, hardcoded                | random                                  |
| Re-runnable             | yes, idempotent (`upsert`)      | no, appends (`createMany`)              |
| Runs on `migrate reset` | yes                             | no, on demand only                      |
| For                     | daily development, e2e, Postman | pagination, index and query performance |

Keeping them apart is the point. If the everyday seed carried 50k rows the dev
loop would crawl and tests could not hardcode ids; if the volume seed were
deterministic it would not resemble real data distribution.

---

## Fixture seed

### Commands

| Command                     | What it does                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `pnpm db:seed`              | Core + demo data. Safe to run repeatedly.                                                   |
| `pnpm db:seed:reset`        | Truncates every seeded table first, then seeds.                                             |
| `pnpm db:seed:core`         | Core data only (languages, roles, admin user).                                              |
| `pnpm prisma migrate reset` | Rebuilds the schema and runs `prisma/seed.ts` via the `prisma.seed` hook in `package.json`. |

Permissions are **not** seeded here — they are derived from the live route table:

```bash
pnpm seed:initial-scripts:create-permission
```

### What it creates

| Table                          | Rows                           |
| ------------------------------ | ------------------------------ |
| Language                       | 2 (`en`, `vi`)                 |
| Role                           | 3 (admin, client, seller)      |
| User                           | 4 (admin + seller + 2 clients) |
| UserTranslation                | 3                              |
| Brand / BrandTranslation       | 6 / 12                         |
| Category / CategoryTranslation | 9 / 18                         |
| Product / ProductTranslation   | 30 / 60                        |
| SKU                            | 71                             |
| CartItem                       | 5                              |
| Order / ProductSKUSnapshot     | 6 / 8                          |
| Review                         | 10                             |

Shaped so the interesting branches have data:

- one product with `publishedAt: null` — published-only filters actually exclude something
- categories nested two deep (Electronics → Phones) — tree traversal has a real tree
- **one order per `OrderStatus`** — every status filter returns rows
- reviews spanning ratings 1..5 — rating filters and averages cover every bucket
- 30 products with staggered `publishedAt` — pagination has a stable, non-tied sort order
- products with 1, 2, 3 and 4 SKUs — variant handling sees every arity

### Layout

```
prisma/
  seed.ts                     entrypoint: env, flags, transaction boundary
  seed/
    seed-context.ts           SeedContext + Seeder contract
    seed-ids.ts               fixed UUIDs + derived-id helpers
    seed-runner.ts            ordered seeder list (= FK dependency order)
    reset.ts                  TRUNCATE for the seeded tables
    data/
      catalog-types.ts        fixture interfaces + buildSkus
      brands.data.ts
      categories.data.ts
      products.data.ts        5 hero products + 25 bulk catalogue entries
    seeders/*.seeder.ts       one file per aggregate
```

### The five rules this follows

1. **Fixed ids, never `uuid()`.** Every row has a hardcoded UUID in `seed-ids.ts`.
   That is what makes re-runs `upsert` instead of `insert`, and it lets Postman
   collections and e2e tests hardcode ids that survive a `migrate reset`.
   Child rows with no composite unique key (translations, order snapshots) get a
   derived id via `derivedId(parentId, block)`.

2. **Two tiers, gated by an environment allowlist.** A seeder declares
   `tier: "core" | "demo"`. `core` is reference data the app cannot boot without
   and is safe everywhere; `demo` is the sample catalogue and runs only when
   `NODE_ENV` is `development` or `test` (see `seed/seed-environment.ts`).
   The gate is an allowlist on purpose — a `!== "production"` check would let
   `staging`, `uat` and `qa` through, and those databases are shared. In any
   other environment `pnpm db:seed` quietly degrades to core-only, and
   `--reset` refuses outright.

3. **Explicit order, not a dependency graph.** `SEEDERS` in `seed-runner.ts` is
   the FK dependency order. A new seeder goes after everything it references.
   `roles` and `languages` write `createdById: null` because the admin that would
   own them does not exist yet.

4. **One transaction per run.** A half-seeded database is worse than an empty one,
   because the next run's upserts would hide the gap.

5. **No Nest DI.** The seed uses a bare `PrismaClient`. Booting `AppModule` would
   drag in Redis, S3, the mailer and an HTTP listener for a job that only needs a
   database connection.

### Hero vs catalogue products

`products.data.ts` holds two groups:

- **Hero products** (`ProductId.IPHONE_15`, …) keep named ids because the cart,
  order and review fixtures point at them. Never renumber or remove one without
  updating those seeders.
- **Catalogue entries** are one terse line each; ids, images, translations, SKUs
  and virtual price are all derived. Adding a product is one line.

### Demo accounts

| Role   | Email                | Password          |
| ------ | -------------------- | ----------------- |
| admin  | `$ADMIN_EMAIL`       | `$ADMIN_PASSWORD` |
| seller | `seller@ecom.local`  | `Password@123`    |
| client | `client@ecom.local`  | `Password@123`    |
| client | `client2@ecom.local` | `Password@123`    |

Admin credentials come from the environment, never from a checked-in fixture, so
the core seeder can also run in staging. Passwords are written on **create only** —
re-seeding never resets a password that was rotated afterwards.

### Adding a seeder

1. Add the fixed ids to `seed-ids.ts`.
2. Add fixtures to `data/` if the dataset is more than a handful of rows.
3. Create `seeders/<name>.seeder.ts` exporting `defineSeeder({ name, tier, run })`.
   Use `upsert` keyed on the fixed id or on a real composite unique constraint.
4. Register it in `SEEDERS` **after** everything it references.

---

## Volume seed

Bulk random data for measuring query and index behaviour. Requires the core seed
(roles and languages) to have run first.

### Commands

```bash
# defaults: 500 users, 2k products, 6k SKUs, 5k orders, 3k reviews (~2s)
pnpm db:seed:volume

# tune any count
pnpm db:seed:volume --products=20000 --orders=50000 --users=5000 --reviews=30000

# remove everything the volume seeder wrote, fixture data untouched
pnpm db:seed:volume:clean
```

Flags map one-to-one onto `VolumeConfig`: `users`, `brands`, `categories`,
`products`, `skusPerProduct`, `orders`, `itemsPerOrder`, `reviews`, `cartItems`,
`batchSize`, `randomSeed`. An unknown flag is a hard error, not a silent no-op.

Measured on a local Postgres container: ~44k rows in 2.3s at defaults,
~290k rows in 27s at `--products=20000 --orders=50000`.

### Layout

```
prisma/
  seed-volume.ts              entrypoint: guards, flags, --clean
  seed/volume/
    volume-config.ts          defaults + flag parsing
    volume-generators.ts      faker-backed row factories
    volume-runner.ts          batched createMany + join-table SQL
    volume-clean.ts           ownership-keyed teardown
```

### Design decisions

- **`createMany` in batches of 1000.** One 100k-row INSERT is a memory and lock
  risk; `batchSize` is tunable if your Postgres prefers otherwise.
- **No wrapping transaction.** A write that large held open as one transaction is
  a lock and WAL problem, and there is nothing to protect — `--clean` undoes it.
- **One bcrypt hash, shared by every generated user.** Hashing 5000 passwords at
  10 rounds would cost minutes and prove nothing.
- **`faker.seed(randomSeed)`.** Two runs with the same flags produce the same
  shape, so a perf comparison is not confounded by a different data distribution.
- **Implicit m2m via parameterized raw SQL.** `Product.categories` and
  `Order.products` have no Prisma model behind them, so `_CategoryToProduct` and
  `_OrderToProduct` are written with `INSERT … ON CONFLICT DO NOTHING` built from
  `Prisma.sql` placeholders. Only the table name is `Prisma.raw`, and it comes
  from a closed union type.
- **`skipDuplicates` on Review and CartItem.** Both carry a composite unique key
  and random pairs collide, so the realised count is reported, not the requested
  one.
- **~10% of products are unpublished**, so published-only filters exclude real
  rows instead of scanning everything.

### How `--clean` finds its rows

Nothing is guessed. Every generated row is stamped `createdById =
UserId.VOLUME_ACTOR`, and every generated account sits on the `@volume.local`
email domain. Deletion runs in reverse FK order; Product, Brand and Category
cascade to their SKUs and translations, so those need no explicit step.

Both the volume seeder and its cleaner refuse to run unless `NODE_ENV` is
`development` or `test` — the same allowlist the fixture seed uses. `staging`,
`uat`, `qa` and production are all refused, with an error that names the
operation and points at `pnpm db:seed:core`.
