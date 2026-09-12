# Database Migration Guide

How schema changes reach each environment in this repository.

**Stack:** NestJS 11 · Prisma 6.4.1 · PostgreSQL 15 · pnpm 10.6.5
**Schema:** [`prisma/schema.prisma`](../prisma/schema.prisma) (single schema file)
**History:** [`prisma/migrations/`](../prisma/migrations/) — 27 migrations, provider locked to `postgresql` in `migration_lock.toml`

---

## 1. The two commands, and the rule between them

| Command                 | Where it may run                | What it does                                                                                                                                   |
| ----------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `prisma migrate dev`    | **Local development only**      | Diffs `schema.prisma` against the DB, writes a new migration file, applies it, regenerates the client. May **drop and recreate the database**. |
| `prisma migrate deploy` | **test / staging / production** | Applies committed migration files in order. Never generates SQL, never resets, never prompts.                                                  |

**Hard rules**

1. `migrate dev` and `db push` are **forbidden** outside a developer's own machine. `db push` is not used in this project at all — there is no script for it, and adding one is a defect.
2. A migration directory under `prisma/migrations/` is **immutable once merged**. Every environment stores its checksum in `_prisma_migrations`; editing an applied file makes `migrate deploy` fail. Fix a bad migration by adding a new one.
3. Only **one process** migrates at a time. The application container never migrates (see §5).

---

## 2. Environment matrix

`NODE_ENV` is validated by [`src/validations/env.validation.ts`](../src/validations/env.validation.ts) and accepts **only `development` or `production`**. Environments are therefore separated by `DATABASE_URL` and by deployment target — _not_ by `NODE_ENV`.

| Environment | `NODE_ENV`    | Migration command                                                | Who runs it                                                            |
| ----------- | ------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Development | `development` | `pnpm prisma:migrate:dev`                                        | The developer                                                          |
| Test / CI   | `development` | `pnpm db:test:reset` (local) · `pnpm prisma:migrate:deploy` (CI) | Jest setup / the `migrations` CI job                                   |
| Staging     | `production`  | `pnpm db:migrate`                                                | `Database Migrate` workflow, environment `staging`                     |
| Production  | `production`  | `pnpm db:migrate`                                                | `Database Migrate` workflow, environment `production` (approval-gated) |

`ConfigModule` loads `.env.${NODE_ENV}` then `.env` ([`src/shared/modules/base.module.ts`](../src/shared/modules/base.module.ts)). Deployed environments inject variables directly rather than shipping a file — `.dockerignore` blocks every `.env*` from the image.

---

## 3. Development flow

### Create a migration

```bash
# 1. Edit prisma/schema.prisma
# 2. Generate + apply + regenerate client in one step
pnpm prisma:migrate:dev --name add_product_rating
```

Use a descriptive `snake_case` name; it becomes the directory name and shows up in every environment's migration log.

### Review before committing — non-negotiable

```bash
# Write the SQL but do NOT apply it, so you can read and edit it first
pnpm prisma:migrate:dev:create-only --name rename_publish_at_to_published_at

# Read the generated SQL
cat prisma/migrations/*_rename_publish_at_to_published_at/migration.sql

# Apply once you are satisfied
pnpm prisma:migrate:dev
```

`--create-only` is the single most important habit in this repo. Prisma expresses a **rename** as `DROP COLUMN` + `ADD COLUMN`, which destroys data. [`20250710152419_rename_publish_at_to_published_at`](../prisma/migrations/20250710152419_rename_publish_at_to_published_at/migration.sql) shows the correct hand-edit — the generated drop/add was replaced with:

```sql
ALTER TABLE "Product" RENAME COLUMN "publishAt" TO "publishedAt";
```

The warning header Prisma left in that file is stale; the SQL below it is safe. Read the SQL, not the header.

By contrast, [`20250426095525_update_to_uuid`](../prisma/migrations/20250426095525_update_to_uuid/migration.sql) (857 lines) drops and recreates every FK column. It was survivable only because it predates real data. **A migration of that shape must never be applied to production as generated.**

### Verify before pushing

```bash
pnpm prisma:validate        # schema is syntactically valid
pnpm prisma:migrate:status  # local DB has no pending/failed migration
pnpm prisma:migrate:drift   # migration history reproduces schema.prisma exactly
```

`prisma:migrate:drift` needs `SHADOW_DATABASE_URL` pointing at a **separate throwaway database** — Prisma resets it. It exits `2` when `schema.prisma` and the migration history disagree, which is the classic "edited the schema, forgot the migration" mistake.

### Seeding

Seeds are **not** migrations and never run automatically:

```bash
pnpm seed:initial-scripts                    # admin user
pnpm seed:initial-scripts:create-permission  # permission rows from routes
```

---

## 4. Test flow

Unit tests (`pnpm test`, 114 suites) mock Prisma entirely and need no database.

For anything that touches a real database, point `DATABASE_URL` at a **dedicated test database** and reset it:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ecom_test?schema=public" \
  pnpm db:test:reset
```

`db:test:reset` runs `prisma migrate reset --force --skip-seed` — it **drops and recreates the database**. Never point it at a database you care about.

CI does the same thing the hard way: it applies the whole history to an empty Postgres 15 service container, which is what proves the history is replayable from zero.

---

## 5. Staging and production flow

### Ordering (this is the whole design)

```mermaid
flowchart TD
    A["Merge to master"] --> B["CI — job <b>migrations</b><br/>immutable · validate · replay · status · drift"]
    B -->|"any check red"| B1["STOP<br/>Nothing reaches the database"]
    B -->|"all green"| C["Workflow <b>Database Migrate</b><br/>environment: staging | production"]
    C --> D["dry-run<br/>list pending migrations"]
    D --> E{"Approved?<br/>(required reviewers on production)"}
    E -->|No| E1["STOP"]
    E -->|Yes| F["prisma migrate deploy<br/><b>ONE runner · ONE job</b>"]
    F -->|"fails"| F1["Exit non-zero<br/>rollout does NOT start<br/>see §10"]
    F -->|"succeeds"| G["Roll out new app containers"]
    G --> H["App starts — never migrates"]

    style B1 fill:#ffe0e0,stroke:#c00
    style E1 fill:#ffe0e0,stroke:#c00
    style F1 fill:#ffe0e0,stroke:#c00
    style F fill:#fff3cd,stroke:#b8860b
    style H fill:#e0f0e0,stroke:#2d7a2d
```

Migrations run **before** the new application version, and the schema change must be backward compatible with the version still running (§6).

### Who talks to the database, and when

The point of the diagram below: during the rollout window, the **old** app version is still serving traffic against the **new** schema. That window is why §6 exists.

```mermaid
sequenceDiagram
    participant GH as GitHub Actions
    participant MIG as Migrator job<br/>(prisma CLI)
    participant DB as PostgreSQL 15
    participant OLD as App v1 (running)
    participant NEW as App v2 (rolling out)

    Note over OLD,DB: v1 serving traffic on the old schema

    GH->>MIG: start (concurrency locked per environment)
    MIG->>DB: probe until connections accepted
    MIG->>DB: prisma migrate status
    DB-->>MIG: pending migrations
    MIG->>DB: prisma migrate deploy
    DB-->>MIG: applied — _prisma_migrations updated
    MIG-->>GH: exit 0

    Note over OLD,DB: v1 STILL running, now on the NEW schema<br/>⚠ backward compatibility required here

    GH->>NEW: roll out containers
    NEW->>DB: connect (no migration — CLI absent from image)
    NEW-->>GH: healthy
    GH->>OLD: drain and stop
    Note over NEW,DB: v2 only
```

### Why the app container does not migrate

[`docker-entrypoint.sh`](../docker-entrypoint.sh) starts the app and nothing else. If it migrated, every replica would attempt the same migration on every scale-up and rolling deploy. The production image does not even contain the Prisma CLI — `pnpm prune --prod` strips it, since `prisma` is a devDependency.

Migrations come from the dedicated **`migrator`** Docker stage instead:

```bash
docker build --target migrator -t ecom-migrator .
docker run --rm -e DATABASE_URL="$DATABASE_URL" ecom-migrator
```

The migrator image, the `Database Migrate` workflow and a manual production run all call the same script, [`scripts/run-database-migrations.sh`](../scripts/run-database-migrations.sh), so every deployed-database path behaves identically. (The CI `migrations` job calls `prisma migrate deploy` directly — it targets a throwaway container, not a deployed database.) The script:

1. requires `DATABASE_URL`;
2. probes the database until it accepts connections (replacing a fixed `sleep`);
3. prints `migrate status` before touching anything;
4. runs `prisma migrate deploy`;
5. prints P3009 recovery instructions and exits non-zero on failure.

`DRY_RUN=true` reports pending migrations and exits `0` without applying.

### Local / single-host Docker Compose

`docker compose up` orders this correctly on its own:

```yaml
db:      healthcheck: pg_isready
migrate: depends_on: db (service_healthy)          # one-shot, restart: "no"
app:     depends_on: migrate (service_completed_successfully)
```

```mermaid
flowchart LR
    DB["<b>db</b><br/>postgres:15-alpine"] -->|"service_healthy<br/>(pg_isready)"| MIG["<b>migrate</b><br/>target: migrator<br/>restart: no · one-shot"]
    MIG -->|"service_completed_successfully<br/>(exit 0)"| APP["<b>app</b><br/>target: production<br/>restart: always"]
    MIG -.->|"exit ≠ 0"| STOP["app never starts"]

    style MIG fill:#fff3cd,stroke:#b8860b
    style STOP fill:#ffe0e0,stroke:#c00
    style APP fill:#e0f0e0,stroke:#2d7a2d
```

The `migrate` service must never be scaled.

---

## 6. Breaking changes — expand and contract

A migration and the application version that needs it are **never** deployed atomically. During a rolling deploy, old and new code both run against the new schema. So a breaking change is split across **separate releases**:

| Phase        | Release | Schema                                                       | Code                                |
| ------------ | ------- | ------------------------------------------------------------ | ----------------------------------- |
| **Expand**   | N       | Add the new, nullable/defaulted structure. Old columns stay. | Writes both old and new. Reads old. |
| **Migrate**  | N       | Backfill in batches (§7).                                    | —                                   |
| **Switch**   | N+1     | —                                                            | Reads and writes new only.          |
| **Contract** | N+2     | Drop the old structure.                                      | —                                   |

Each phase is its own migration and its own deploy. Never collapse them.

```mermaid
flowchart TD
    subgraph R1["Release N — EXPAND"]
        A1["Migration: add new column<br/>nullable / constant default"] --> A2["Deploy code:<br/>write old + new · read old"]
        A2 --> A3["Backfill in batches (§7)"]
        A3 -.-> SAFE["Rollback still safe:<br/>old column intact"]
    end
    subgraph R2["Release N+1 — SWITCH"]
        B1["No schema change"] --> B2["Deploy code:<br/>write new · read new"]
    end
    subgraph R3["Release N+2 — CONTRACT"]
        C1["Migration: drop old column"]
    end

    R1 --> R2 --> R3

    C1 -.->|"point of no return"| X["Old structure gone"]

    style R1 fill:#e8f0ff,stroke:#4a6fa5
    style R2 fill:#fff8e0,stroke:#b8860b
    style R3 fill:#ffe8e8,stroke:#c00
```

The dotted arrows are the reason for the split: until **Contract** ships, rolling the app back is always possible because the old structure still exists.

### Specific hazards in PostgreSQL 15

| Change                                        | Risk                                        | Safe approach                                                                            |
| --------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `ADD COLUMN NOT NULL` without default         | Rejects existing rows; fails outright       | Add nullable → backfill → `SET NOT NULL` in a later migration                            |
| `ADD COLUMN NOT NULL DEFAULT <constant>`      | Safe since PG 11 — no table rewrite         | Fine to use                                                                              |
| `ADD COLUMN NOT NULL DEFAULT <volatile expr>` | Full table rewrite under `ACCESS EXCLUSIVE` | Add nullable → backfill → set default                                                    |
| `SET NOT NULL`                                | Full table scan holding `ACCESS EXCLUSIVE`  | Add a validated `CHECK (col IS NOT NULL)` first, then `SET NOT NULL` (PG skips the scan) |
| `CREATE INDEX`                                | Blocks writes for the whole build           | Use `CONCURRENTLY` — see below                                                           |
| Changing a column type                        | Table rewrite; Prisma may emit drop + add   | Expand/contract with a new column                                                        |
| Renaming a column                             | Prisma emits `DROP` + `ADD` = data loss     | Hand-edit to `RENAME COLUMN` (see §3)                                                    |
| `ADD FOREIGN KEY`                             | Validates every row under lock              | `NOT VALID`, then `VALIDATE CONSTRAINT` in a later migration                             |

### `CREATE INDEX CONCURRENTLY` — verified behaviour

Prisma sends each migration file to PostgreSQL as **one command string**. That has two consequences, both confirmed against this schema on PostgreSQL 15:

- A migration file containing **more than one statement** runs inside an implicit transaction. It is atomic — a failure part-way rolls the whole file back — but `CREATE INDEX CONCURRENTLY` fails with `25001: cannot run inside a transaction block`.
- A migration file containing **exactly one statement** runs in autocommit, and `CREATE INDEX CONCURRENTLY` succeeds.

So: **put a `CONCURRENTLY` index in its own migration, alone, with nothing else in the file.**

```bash
pnpm prisma:migrate:dev:create-only --name add_order_status_index_concurrently
# then edit the file so it contains ONLY:
#   CREATE INDEX CONCURRENTLY "Order_status_idx" ON "Order" ("status");
```

Caveat: a failed `CONCURRENTLY` build leaves an **invalid index** behind that must be dropped manually before retrying:

```sql
SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;
DROP INDEX CONCURRENTLY "Order_status_idx";
```

Because `schema.prisma` cannot express `CONCURRENTLY`, declare the index normally with `@@index` and hand-edit the generated SQL — `pnpm prisma:migrate:drift` then still passes.

### Lock behaviour on large tables

`ALTER TABLE` takes an `ACCESS EXCLUSIVE` lock. It waits behind any open transaction on the table — and while it waits, **every subsequent query queues behind it**. A migration that looks instant can stall the whole API.

Set a lock timeout so the migration fails fast instead of freezing traffic, by appending libpq options to the migration `DATABASE_URL`:

```
postgresql://user:pass@host:5432/db?schema=public&options=-c%20lock_timeout%3D5000
```

Five seconds is a reasonable default: a migration that cannot take its lock aborts and is retried, rather than taking the service down. `prisma migrate deploy` is safe to re-run.

---

## 7. Data migrations

Prisma's migration files are plain SQL, so data migrations live in them. Two rules:

1. **Batch anything large.** A single `UPDATE` over millions of rows holds locks and bloats WAL. Use a bounded loop:

   ```sql
   -- Backfill in batches of 10k
   DO $$
   DECLARE rows_updated INT;
   BEGIN
     LOOP
       UPDATE "Product"
          SET "publishedAt" = "createdAt"
        WHERE "id" IN (
          SELECT "id" FROM "Product"
           WHERE "publishedAt" IS NULL
           LIMIT 10000
        );
       GET DIAGNOSTICS rows_updated = ROW_COUNT;
       EXIT WHEN rows_updated = 0;
     END LOOP;
   END $$;
   ```

2. **Keep long backfills out of the deploy path.** If a backfill takes minutes, run it as its own step between Expand and Switch, not inside the migration that blocks the release.

For soft-deleted models (most models here carry `deletedAt`), scope backfills explicitly — decide whether soft-deleted rows should be touched, and say so in the SQL.

---

## 8. Manual production procedure (fallback)

Use only when the `Database Migrate` workflow is unavailable. Announce it first — no silent manual migrations.

```bash
# 0. Checkout the EXACT commit being deployed
git fetch --all && git checkout <sha> && git status   # must be clean

# 1. Back up. Non-negotiable. Verify the dump is non-empty.
pg_dump "$PROD_DATABASE_URL" -Fc -f "backup-$(date +%Y%m%d-%H%M%S).dump"
ls -lh backup-*.dump

# 2. Install deps and generate the client
pnpm install --frozen-lockfile
pnpm prisma:generate

# 3. Look before you leap — lists pending migrations, applies nothing
export DATABASE_URL="$PROD_DATABASE_URL"
pnpm db:migrate:dry-run

# 4. Read the SQL of every pending migration
cat prisma/migrations/<pending>/migration.sql

# 5. Apply
pnpm db:migrate

# 6. Confirm
pnpm prisma:migrate:status   # expect "Database schema is up to date!"
```

Run this from **one** machine, with **one** operator, on a stable connection — `tmux`/`screen` so a dropped SSH session cannot interrupt a migration mid-flight. Never run step 5 from two terminals.

---

## 9. Rollback and recovery

**Prisma has no `migrate down`.** There is no automatic rollback. Recovery is one of three paths, in order of preference:

```mermaid
flowchart TD
    S["Something is wrong after a deploy"] --> Q1{"Did migrate deploy<br/>fail part-way?"}
    Q1 -->|Yes| P3009["P3009 recovery — §10<br/>migrate status → inspect DB<br/>→ resolve applied / rolled-back"]
    Q1 -->|No| Q2{"Is the schema correct,<br/>only the code wrong?"}
    Q2 -->|Yes| RB["<b>c.</b> Redeploy previous app version<br/>works only if the migration<br/>was backward compatible (§6)"]
    Q2 -->|No| Q3{"Was data destroyed?"}
    Q3 -->|No| FWD["<b>a.</b> Roll forward (default)<br/>new migration reversing the change"]
    Q3 -->|Yes| Q4{"Can a forward fix<br/>reconstruct the data?"}
    Q4 -->|Yes| FWD
    Q4 -->|No| RST["<b>b.</b> Restore from backup<br/>⚠ loses everything written<br/>since the dump"]

    style FWD fill:#e0f0e0,stroke:#2d7a2d
    style RB fill:#fff8e0,stroke:#b8860b
    style RST fill:#ffe0e0,stroke:#c00
    style P3009 fill:#fff3cd,stroke:#b8860b
```

### a. Roll forward (default)

Write a new migration that reverses the change and deploy it. This is the only path that keeps the history linear and every environment consistent.

```bash
pnpm prisma:migrate:dev:create-only --name revert_add_product_rating
# hand-write the inverse SQL, review, commit, deploy
```

[`20250615164008_revert_language_id_varchar`](../prisma/migrations/20250615164008_revert_language_id_varchar/) is this pattern already used in this repo.

### b. Restore from backup

Only when the migration destroyed data and no forward fix recovers it. Accepts the loss of everything written since the dump:

```bash
pg_restore -d "$PROD_DATABASE_URL" --clean --if-exists backup-YYYYmmdd-HHMMSS.dump
```

After restoring, the `_prisma_migrations` table returns to its backed-up state — re-run `pnpm prisma:migrate:status` and reconcile before deploying anything.

### c. Redeploy the previous application version

If the schema is fine but the code is not, roll the app back. This only works when the migration was backward compatible (§6) — which is the reason for that discipline.

---

## 10. Failure troubleshooting

### `P3009` — a failed migration is recorded

```
migrate found failed migrations in the target database
```

`migrate deploy` refuses to do anything until this is resolved. **Never edit `_prisma_migrations` by hand.**

1. Identify it: `pnpm prisma:migrate:status`
2. Read that migration's SQL and inspect the real database state to determine what actually landed.
3. Resolve deliberately:

   ```bash
   # The migration left NOTHING behind (multi-statement files roll back atomically)
   pnpm prisma:migrate:resolve:rolled-back <migration_name>

   # Its effects are fully present, applied by hand and matching the SQL
   pnpm prisma:migrate:resolve:applied <migration_name>
   ```

4. Re-run `pnpm db:migrate`.

A single-statement migration is the one case needing care: it runs in autocommit, so it may have partially applied. Verify the actual schema before choosing.

### `P3018` — a migration failed to apply

The SQL itself errored; the database error code is printed underneath (e.g. `42701 duplicate column`, `25001 CONCURRENTLY in transaction`). Fix the SQL in a **new** migration — never edit the failed file if it has already reached another environment.

### `P3005` / checksum mismatch — the database schema is not empty

Either the database was changed outside Prisma, or a committed migration was edited after being applied. For a database that already matches a migration, baseline it:

```bash
pnpm prisma:migrate:resolve:applied <migration_name>
```

If a merged migration file was edited, revert the edit — the CI immutability gate exists to stop this reaching production.

### `migrate deploy` hangs

It is waiting for `ACCESS EXCLUSIVE`. Find the blocker:

```sql
SELECT pid, state, wait_event_type, left(query, 120) AS query, now() - xact_start AS age
  FROM pg_stat_activity
 WHERE datname = current_database() AND state <> 'idle'
 ORDER BY xact_start;
```

Terminate the blocking transaction (`SELECT pg_terminate_backend(<pid>);`) or cancel the migration and retry with `lock_timeout` set (§6).

### Drift check fails in CI (exit 2)

`schema.prisma` and the migration history disagree. Generate the missing migration and commit it:

```bash
pnpm prisma:migrate:dev --name <describes_the_change>
```

---

## 11. CI/CD

### `CI` — [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

Jobs: `lint`, `build`, and `migrations`. The `migrations` job runs against a real `postgres:15-alpine` service container and gates every PR:

| Step                                        | Catches                                                                                |
| ------------------------------------------- | -------------------------------------------------------------------------------------- |
| Applied migrations are immutable            | Any modified / deleted / renamed file under `prisma/migrations` versus the base branch |
| `pnpm prisma:validate`                      | Invalid schema                                                                         |
| `pnpm prisma:migrate:deploy` on an empty DB | SQL that cannot replay from zero                                                       |
| `pnpm prisma:migrate:status`                | Pending or failed migrations                                                           |
| `pnpm prisma:migrate:drift` (exit 2 ⇒ fail) | `schema.prisma` edited without a migration                                             |

### `Database Migrate` — [`.github/workflows/database-migrate.yml`](../.github/workflows/database-migrate.yml)

The only automated writer to a deployed database.

- `workflow_dispatch` for operators (choose `staging` / `production`, `dry_run` defaults to **true**).
- `workflow_call` so a deploy pipeline can chain it before rolling out containers.
- `concurrency: db-migrate-<environment>` with `cancel-in-progress: false` — runs queue, never cancel. Cancelling mid-migration is what creates P3009.
- `environment:` binds GitHub Environment secrets (`DATABASE_URL`); add required reviewers to the `production` environment to make production approval-gated.

**Setup required before first use:** create the `staging` and `production` GitHub Environments in repository settings and add a `DATABASE_URL` secret to each. Add required reviewers to `production`.

---

## 12. Checklists

### Review checklist — for the PR author and reviewer

- [ ] `migration.sql` was **read**, not just generated
- [ ] No unintended `DROP COLUMN` / `DROP TABLE`; renames use `RENAME COLUMN`
- [ ] Any `Warnings:` header in the file was assessed and is either accurate or stale-and-noted
- [ ] New `NOT NULL` columns have a constant default, or are split expand/contract
- [ ] Indexes on large tables use `CONCURRENTLY`, alone in their own migration file
- [ ] Data backfills are batched
- [ ] The change is backward compatible with the currently deployed app version
- [ ] Only **new** migration directories are added — no existing file touched
- [ ] `pnpm prisma:migrate:drift` passes locally
- [ ] Migration name describes the change in `snake_case`

### Deployment checklist

- [ ] CI `migrations` job green on the merge commit
- [ ] Recent backup exists and was verified non-empty
- [ ] `pnpm db:migrate:dry-run` reviewed — the pending list is what you expect
- [ ] Migration applied **before** the new app version rolls out
- [ ] Exactly one migration process (workflow job or migrator container) — never an app replica
- [ ] `pnpm prisma:migrate:status` reports up to date afterwards
- [ ] Application health and error rate checked after rollout
- [ ] For a long-running change: the expand/contract phase for this release is recorded, so the follow-up release is not forgotten

---

## 13. Command reference

| Command                                          | Purpose                                                                     |
| ------------------------------------------------ | --------------------------------------------------------------------------- |
| `pnpm prisma:migrate:dev`                        | Create + apply a migration (**development only**)                           |
| `pnpm prisma:migrate:dev:create-only`            | Generate SQL without applying — for review and hand-editing                 |
| `pnpm prisma:migrate:deploy`                     | Apply committed migrations (non-development)                                |
| `pnpm prisma:migrate:status`                     | Show applied / pending / failed migrations                                  |
| `pnpm prisma:migrate:resolve:applied <name>`     | Mark a failed migration as applied                                          |
| `pnpm prisma:migrate:resolve:rolled-back <name>` | Mark a failed migration as rolled back                                      |
| `pnpm prisma:migrate:drift`                      | Verify the history reproduces `schema.prisma` (needs `SHADOW_DATABASE_URL`) |
| `pnpm prisma:validate`                           | Validate `schema.prisma`                                                    |
| `pnpm prisma:generate`                           | Regenerate the Prisma client                                                |
| `pnpm prisma:studio`                             | Open Prisma Studio                                                          |
| `pnpm db:migrate`                                | Guarded deploy: wait for DB → status → deploy → verify                      |
| `pnpm db:migrate:dry-run`                        | Report pending migrations, apply nothing                                    |
| `pnpm db:test:reset`                             | **Drop and recreate** the test database, then apply all migrations          |
| `pnpm seed:initial-scripts`                      | Seed the admin user (never automatic)                                       |
