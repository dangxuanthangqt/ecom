# PostgreSQL Database Management

How PostgreSQL is run in this repository, which databases exist, who creates them, and how the
errors you will actually hit map back to that model.

**Stack:** PostgreSQL 15 (`postgres:15-alpine`) · Prisma 7.10.0 · Docker Compose
**Service:** [`docker-compose.yml`](../docker-compose.yml) service `db`
**Related:** [database-migration.md](database-migration.md) (schema changes) ·
[database-seeding.md](database-seeding.md) (data) ·
[database-rollback-recovery.md](database-rollback-recovery.md) (incidents)

---

## 1. One server, several databases

There is exactly **one** PostgreSQL server in local development — the `db` container, published on
`localhost:5432`. Inside it live several logical databases, fully isolated from one another. Nothing
in this project runs more than one Postgres server.

```mermaid
flowchart TD
    subgraph SRV["PostgreSQL 15 server — container ecom-db-1, localhost:5432"]
        DEV[("ecom_db<br/><i>development</i>")]
        PROD[("ecom_prod<br/><i>production-mode / compose</i>")]
        E2E[("ecom_e2e<br/><i>e2e tests — reset every run</i>")]
        SHADOW[("ecom_shadow<br/><i>Prisma scratch</i>")]
    end

    ENVD[".env.development"] --> DEV
    ENVP[".env"] --> PROD
    ENVT[".env.test"] --> E2E
    ENVD -.SHADOW_DATABASE_URL.-> SHADOW

    style E2E fill:#ffe9e9,stroke:#c00
    style SHADOW fill:#f0f0f0,stroke:#888,stroke-dasharray: 4 3
```

| Database      | Points at it                               | Created by                                      | Lifetime                                         |
| ------------- | ------------------------------------------ | ----------------------------------------------- | ------------------------------------------------ |
| `ecom_db`     | `.env.development` → `DATABASE_URL`        | `POSTGRES_DB` on first init, or by hand         | Long-lived; your working data                    |
| `ecom_prod`   | `.env` → `DATABASE_URL`                    | `POSTGRES_DB` when the volume was first created | Long-lived                                       |
| `ecom_e2e`    | `.env.test` → `DATABASE_URL`               | `pnpm db:test:reset` / `test:e2e:setup`         | **Dropped and recreated on every e2e run**       |
| `ecom_shadow` | `.env.development` → `SHADOW_DATABASE_URL` | You, once (`CREATE DATABASE`)                   | Prisma wipes and refills it during `migrate dev` |

Two properties of this layout matter:

- **Isolation is per database, not per server.** A wrong `DATABASE_URL` reaches real data across a
  single connection string typo. That is why [`scripts/prepare-e2e-database.sh`](../scripts/prepare-e2e-database.sh)
  refuses to run unless the URL literally contains `ecom_e2e` — the reset it performs would otherwise
  destroy `ecom_db` or `ecom_prod`.
- **No env file inherits from another.** [`src/constants/env-file.constant.ts`](../src/constants/env-file.constant.ts)
  maps each `NODE_ENV` to exactly one file with no layering, so each file carries a complete
  `DATABASE_URL` of its own.

> **`ecom_shadow` is not a real database in the usual sense.** Prisma creates, migrates against and
> drops a shadow database to detect drift during `migrate dev`. It holds no data you should care
> about, and it is only needed for development commands — never for `migrate deploy`.

---

## 2. The `db` service, line by line

```yaml
db:
  image: postgres:15-alpine
  restart: unless-stopped
  environment:
    POSTGRES_DB: ecom_db # ← the only place the name is written
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
  volumes:
    - postgres_data:/var/lib/postgresql/data # ← where the data actually lives
  ports:
    - "5432:5432" # ← host:container
  healthcheck:
    test:
      [
        "CMD-SHELL",
        'psql -U postgres -d "$$POSTGRES_DB" -c ''SELECT 1'' >/dev/null || exit 1',
      ]
```

**`volumes`** is the important line. The data lives in the named volume `postgres_data`, _not_ in the
container. Delete the container and the data survives; delete the volume and it is gone. Every
surprise in §4 follows from this one fact.

**`ports: "5432:5432"`** publishes the container port to the host. From the host — where
`pnpm start:dev`, `prisma` and your GUI client run — the address is `localhost:5432`. From **inside**
the compose network the address is `db:5432`; `localhost` there means the calling container itself.

**`healthcheck`** runs a real `SELECT 1` against `$POSTGRES_DB`. The doubled `$$` escapes Compose's
own variable substitution, so the container shell expands it and the name stays declared once.

> **Why not `pg_isready`?** `pg_isready -d <name>` looks like it checks the database, but it only asks
> whether the _server_ accepts connections — it never validates the database exists. The previous
> healthcheck used it and reported `healthy` throughout a period when `ecom_db` did not exist at all.
> `migrate` and `app` both gate on `db` being healthy, so a health signal that cannot see a missing
> database is not worth much.

---

## 3. Who else talks to this server

```mermaid
flowchart LR
    HOST["Host processes<br/>pnpm start:dev · prisma CLI · seeds"] -->|localhost:5432| DB[("db container")]
    MIG["compose service <b>migrate</b>"] -->|db:5432| DB
    APP["compose service <b>app</b>"] -->|db:5432| DB
```

The `migrate` service applies schema changes exactly once before `app` starts; the app image cannot
migrate at all (no Prisma CLI after `pnpm prune --prod`). That split is documented in
[database-migration.md § 5](database-migration.md#5-staging-and-production-flow) and is out of scope
here.

---

## 4. The initialisation rule — the source of most confusion

`POSTGRES_DB`, `POSTGRES_USER` and `POSTGRES_PASSWORD` are read **only while the data directory is
empty.**

```mermaid
flowchart TD
    S["container starts"] --> Q{"/var/lib/postgresql/data<br/>contains PG_VERSION?"}
    Q -->|"No — volume is empty"| I["run initdb<br/>create POSTGRES_USER<br/>create POSTGRES_DB<br/>run /docker-entrypoint-initdb.d/*.sql"]
    Q -->|"Yes — already initialised"| K["log: Skipping initialization<br/><b>all three vars ignored</b>"]
    I --> R["server ready"]
    K --> R

    style K fill:#fff3cd,stroke:#b8860b
```

So on a volume that already exists:

- changing `POSTGRES_DB` creates **nothing**;
- changing `POSTGRES_PASSWORD` changes **nothing**;
- adding a file to `/docker-entrypoint-initdb.d/` runs **nothing**.

`docker compose restart`, `up`, even `up --force-recreate` all land in the right-hand branch, because
they replace the _container_ and keep the _volume_. You can see which branch a start took:

```bash
docker compose logs db | grep -i "initialization\|initializing"
# → PostgreSQL Database directory appears to contain a database; Skipping initialization
```

This is deliberate. If these variables were re-applied on every start, one typo in an env var could
silently rewrite credentials on a database holding real data.

**Two ways to get a new database, then:**

| Goal                            | Command                                                          | Cost                     |
| ------------------------------- | ---------------------------------------------------------------- | ------------------------ |
| Add a database, keep everything | `docker exec ecom-db-1 psql -U postgres -c 'CREATE DATABASE x;'` | None                     |
| Make `POSTGRES_DB` take effect  | `docker compose down -v && docker compose up db -d`              | **Wipes every database** |

---

## 5. Recipes

### Create a database

```bash
docker exec ecom-db-1 psql -U postgres -c 'CREATE DATABASE ecom_db;'
docker exec ecom-db-1 psql -U postgres -c 'CREATE DATABASE ecom_shadow;'
```

### List what exists

```bash
docker exec ecom-db-1 psql -U postgres -l
```

### Rename the development database

Three places reference the name — miss one and the healthcheck or Prisma will disagree with reality:

```bash
NEW_DB=ecom_local

# 1. no open connections may remain (stop the app and any GUI client first)
docker exec ecom-db-1 psql -U postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='ecom_db';"

# 2. rename — data, schema and _prisma_migrations all travel with it
docker exec ecom-db-1 psql -U postgres -c "ALTER DATABASE ecom_db RENAME TO $NEW_DB;"

# 3. update both references
sed -i "s/ecom_db/$NEW_DB/" .env.development docker-compose.yml

# 4. verify — must report "up to date", not a list of pending migrations
pnpm prisma:migrate:status
```

Prefer a fresh database instead? Skip the rename, `CREATE DATABASE` under the new name, update the
same two files, then `pnpm prisma:migrate:dev && pnpm db:seed`.

### Start over completely

```bash
docker compose down -v          # -v DELETES the volume and every database in it
docker compose up db -d         # empty volume → initdb runs → POSTGRES_DB honoured
pnpm prisma:migrate:dev
pnpm db:seed
```

### Set a development database up from scratch

```bash
docker compose up db -d
docker exec ecom-db-1 psql -U postgres -c 'CREATE DATABASE ecom_shadow;'   # if absent
pnpm prisma:generate
pnpm prisma:migrate:dev
pnpm db:seed
pnpm seed:initial-scripts       # sync RBAC permissions from the app's routes
```

---

## 6. How Prisma decides which database to talk to

One loader, one file. Prisma 7 reads no env file by itself — not in the CLI, not in the client — so
the only thing that can put `DATABASE_URL` into a Prisma command is [`prisma.config.ts`](../prisma.config.ts),
which loads the file `NODE_ENV` selects through the same resolver the app uses
(`src/constants/env-file.constant.ts`).

```mermaid
flowchart TD
    A["pnpm prisma:migrate:dev"] --> B["prisma.config.ts<br/>resolveEnvFilePath() → .env.development"]
    B --> C{"DATABASE_URL already in process.env?"}
    C -->|Yes| D["keep it — dotenv never overwrites<br/><b>CI / Docker injection wins</b>"]
    C -->|No| E["take it from .env.development<br/><b>ecom_db</b>"]
    E --> F{"still unset? (fresh checkout, builder image)"}
    F -->|Yes| G["datasource omitted: generate/validate work,<br/>migrate commands fail with a clear error"]

    style D fill:#e0f0e0,stroke:#2d7a2d
    style E fill:#e0f0e0,stroke:#2d7a2d
```

```
$ pnpm prisma:migrate:status
Loaded Prisma config from prisma.config.ts.
Datasource "db": PostgreSQL database "ecom_db", schema "public" at "localhost:5432"
```

There is no "loaded from .env" line any more, and no second loader that could disagree with the
**Datasource** line. Under Prisma 6 the CLI and the client both auto-loaded the project-root `.env`
(the production file) ahead of our own loader, which is exactly how `pnpm db:seed` once ended up
asking for `ecom_prod` — see [prisma-7-migration.md](prisma-7-migration.md).

**Deploy-facing scripts** — `db:migrate`, `db:backup`, `db:restore` — check for `DATABASE_URL` in
the shell before doing anything, because they are meant to run where the platform injects it (the
`migrator` image, the migration workflow). They fail closed:

```
[db-migrate] ERROR: DATABASE_URL is not set.
```

That guard runs in the shell, before Prisma can auto-load `.env`. It is the reason a bare
`pnpm db:migrate` can never quietly hit the database named in `.env`.

---

## 7. Errors you will actually hit

### `P1003: Database "X" does not exist on the database server`

The server answered; the database inside it does not exist.

```bash
docker exec ecom-db-1 psql -U postgres -l          # is the name there?
docker exec ecom-db-1 psql -U postgres -c 'CREATE DATABASE X;'
```

Almost always follows editing `DATABASE_URL` (or `POSTGRES_DB`) and expecting a restart to create the
database — see §4.

### `P1001: Can't reach database server at ...`

Nothing is listening. Different causes by context:

| Where the command runs      | Correct host     | Common mistake                                   |
| --------------------------- | ---------------- | ------------------------------------------------ |
| Host (`pnpm …`, GUI client) | `localhost:5432` | using `db:5432`, which the host cannot resolve   |
| Inside a compose container  | `db:5432`        | using `localhost`, which is the container itself |

Also check the container is up and the published port matches: `docker compose ps db`. If `ports:`
says `"5433:5432"`, the host address is `localhost:5433`.

### The container is `healthy` but the database is missing

Was true with the old `pg_isready -d` healthcheck; fixed in §2. If you copy that service block
elsewhere, carry the `psql -c 'SELECT 1'` form with it.

### `POSTGRES_DB` changed but no new database appeared

§4. Either `CREATE DATABASE` by hand, or `docker compose down -v` and accept losing everything.

### `Error: P3014` / shadow database failures on `migrate dev`

`SHADOW_DATABASE_URL` is unreachable or points somewhere else than `DATABASE_URL` — easy to leave
behind when only the main URL gets updated. Both live in
[`.env.development`](../.env.development); keep host, port, user and password identical and only the
database name different.

`migrate deploy` never uses a shadow database, so this error is development-only.

### `database "X" is being accessed by other users`

`ALTER DATABASE … RENAME` and `DROP DATABASE` need zero open connections. Stop the app, close GUI
clients and Prisma Studio, then:

```bash
docker exec ecom-db-1 psql -U postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='X';"
```

### `[db-migrate] ERROR: DATABASE_URL is not set.`

Working as designed — §6. Supply the URL explicitly:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ecom_db?schema=public" pnpm db:migrate
```

For development prefer `pnpm prisma:migrate:dev`, which is already pinned to `.env.development`.

### `docker compose ps` does not list `migrate`

It exited — that is the design. `migrate` is a one-shot job, not a long-running service. Use
`docker compose ps -a` and `docker compose logs migrate`.

---

## 8. Safety rules

1. **`docker compose down -v` deletes every database in the volume.** The `-v` is not a verbosity
   flag. Without it, `down` only removes containers and the data survives.
2. **Never point `.env.test` at anything but `ecom_e2e`.** The e2e setup drops and recreates its
   database on every run; the guard in `prepare-e2e-database.sh` is the only thing between a stale
   `.env.test` and your development data.
3. **Never run `prisma migrate reset` or `prisma migrate dev` against a deployed database.** Both are
   development-only and can drop data. Deployed databases take `prisma migrate deploy`, through
   `pnpm db:migrate`.
4. **Every Prisma command reads exactly one env file — the one `NODE_ENV` selects** (`prisma.config.ts`,
   default `development`). Prisma 7 no longer loads `.env` implicitly, neither in the CLI nor in the
   client, so a development command can no longer pick up the production URL by accident. A real
   process variable still wins over the file, which is how Docker and CI inject theirs.

---

## 9. Docker commands, explained

This section takes apart every Docker command used above. New to Docker? Read 9.1 first — most
confusion comes not from syntax but from not separating image, container and volume.

### 9.1 The four concepts

```mermaid
flowchart LR
    IMG["<b>Image</b><br/>postgres:15-alpine<br/><i>blueprint, read-only</i>"]
      -->|"instantiates"| CT["<b>Container</b><br/>ecom-db-1<br/><i>the running process</i>"]
    CT <-->|"reads/writes"| VOL["<b>Volume</b><br/>postgres_data<br/><i>disk, outlives the container</i>"]
    CT <-->|"talks over"| NET["<b>Network</b><br/>ecom-network<br/><i>private network</i>"]

    style VOL fill:#e0f0e0,stroke:#2d7a2d
```

| Concept       | Analogy                        | If you delete it                     |
| ------------- | ------------------------------ | ------------------------------------ |
| **Image**     | The blueprint of a house       | Re-pulled from Docker Hub            |
| **Container** | The house built from it        | Rebuilt in seconds, **no data lost** |
| **Volume**    | A separate warehouse next door | **All data gone** — unrecoverable    |
| **Network**   | The road between the houses    | Recreated automatically              |

The key point: **containers and volumes are independent.** Delete the container ten times and the
data still sits in the volume. That is why `restart` never "starts fresh" the way people expect.

### 9.2 `docker compose up` — bring a service up

```bash
docker compose up db -d
│      │       │  │  └─ -d = detach: run in the background, give the terminal back
│      │       │  └──── service name from docker-compose.yml (omit = all services)
│      │       └─────── "make sure this is running" — creates it if absent
│      └─────────────── reads docker-compose.yml in the current directory
└────────────────────── the Docker CLI
```

Without `-d` the logs take over your terminal and **Ctrl+C stops the container** — which is why `-d`
is nearly always what you want.

`up` is **idempotent**: if the service is already running with unchanged config, it does nothing. If
`docker-compose.yml` changed, it recreates the container to match.

| Extra flag         | When to use it                                                                   |
| ------------------ | -------------------------------------------------------------------------------- |
| `--build`          | The service has a `build:` and you changed code or the Dockerfile                |
| `--force-recreate` | Force a new container even when config is unchanged (e.g. testing a healthcheck) |
| `--wait`           | Block until healthchecks pass before returning — what CI uses                    |
| `--no-deps`        | Start only this service, ignore `depends_on`                                     |

### 9.3 `docker compose down` — and the `-v` trap

```bash
docker compose down       # stop + DELETE containers, DELETE network. Volumes SURVIVE
docker compose down -v    # ...and delete volumes too → EVERY DATABASE IS GONE
```

Here `-v` means `--volumes`, **not** verbose. It is the only command in this document that can
destroy data by accident.

| Command                  | Containers    | Network     | Volumes (data) |
| ------------------------ | ------------- | ----------- | -------------- |
| `docker compose stop`    | stopped, kept | kept        | kept           |
| `docker compose restart` | stop + start  | kept        | kept           |
| `docker compose down`    | **deleted**   | **deleted** | kept           |
| `docker compose down -v` | **deleted**   | **deleted** | **DELETED**    |

To pause temporarily, use `stop` — `down` is not needed.

### 9.4 Seeing what is going on

```bash
docker compose ps            # running services and published ports
docker compose ps -a         # ...including exited containers (migrate lives here)
docker compose logs db       # all logs for the db service
docker compose logs -f db    # -f = follow, stream live (Ctrl+C to detach)
docker compose logs --tail=50 db   # last 50 lines only
```

Without `-a`, `ps` will **not** show `migrate`, because it exited after finishing — by design, not a
failure.

Inspect healthcheck state:

```bash
docker inspect --format '{{.State.Health.Status}}' ecom-db-1
# → starting | healthy | unhealthy
```

Render the compose file after variable substitution — useful for checking YAML without running
anything:

```bash
docker compose config db
```

### 9.5 `docker exec` — run a command inside a running container

```bash
docker exec -it ecom-db-1 psql -U postgres -d ecom_db
│      │    │   │         └─ the command that runs INSIDE the container
│      │    │   └─────────── CONTAINER name (not the service name)
│      │    └─────────────── -i keeps stdin open, -t allocates a terminal → interactive
│      └──────────────────── the container must already be RUNNING
└─────────────────────────── the Docker CLI
```

`-it` is only needed when you intend to **type** inside. For one-shot commands, drop it:

```bash
docker exec ecom-db-1 psql -U postgres -l      # no -it needed
```

**Where does the container name come from?** Compose joins `<project>-<service>-<n>`. The project
defaults to the directory name, so here it is `ecom` + `db` + `1` = `ecom-db-1`. List them with
`docker ps`.

To avoid memorising container names, use the compose form, which takes the **service** name:

```bash
docker compose exec db psql -U postgres -l     # equivalent, shorter
```

> **`exec` is not `run`.** `exec` runs a command in an **existing** container. `docker compose run`
> creates a **new** one. For databases you almost always want `exec` — `run` leaves stray containers
> behind.

### 9.6 The `psql` flags used in this document

`psql` is the PostgreSQL command-line client, running inside the container.

| Flag          | Meaning                                                    |
| ------------- | ---------------------------------------------------------- |
| `-U postgres` | Connect as the `postgres` user                             |
| `-d ecom_db`  | Connect to the `ecom_db` database                          |
| `-c "SQL"`    | Run exactly one statement, then exit                       |
| `-l`          | List every database, then exit                             |
| `-t`          | Strip headers and the row count — handy when piping output |

Once in the interactive shell:

```
\l      list databases
\c name switch database
\dt     list tables
\d name describe a table
\q      quit
```

### 9.7 What to re-run after changing what

The most common question — "I changed it, how do I make it take effect?"

| You changed                           | Run this                           | Note                                    |
| ------------------------------------- | ---------------------------------- | --------------------------------------- |
| `ports`, `environment`, `healthcheck` | `docker compose up -d db`          | Compose detects it and recreates        |
| `Dockerfile` or app code              | `docker compose up -d --build app` | The image must be rebuilt               |
| `POSTGRES_DB` (the database name)     | **Nothing works** — see §4         | `CREATE DATABASE` by hand, or `down -v` |
| `.env.development`                    | No Docker command needed           | Only host processes read this file      |
| `prisma/schema.prisma`                | `pnpm prisma:migrate:dev`          | Unrelated to Docker                     |

### 9.8 Mistakes people make at the prompt

**`Error: No such container: db`** — you gave `docker exec` a _service_ name. Use the full container
name (`ecom-db-1`) or switch to `docker compose exec db`.

**`docker compose up` hangs the terminal** — you forgot `-d`. Logs are holding the terminal; Ctrl+C
stops the container. Open another tab and run `docker compose up -d`.

**`no configuration file provided`** — you are not in the directory holding `docker-compose.yml`.
`cd` to the project root.

**Ran `down -v` and lost everything** — unrecoverable. Rebuild with
`docker compose up db -d && pnpm prisma:migrate:dev && pnpm db:seed`.

**`port is already allocated`** — something else holds 5432, usually a Postgres installed directly on
the machine. Stop it, or publish on `"5433:5432"` and point `DATABASE_URL` at `localhost:5433`.

### 9.9 Cheat sheet

| You want to                    | Run                                                               |
| ------------------------------ | ----------------------------------------------------------------- |
| Start the database             | `docker compose up db -d`                                         |
| Check it is alive              | `docker compose ps db`                                            |
| Read recent errors             | `docker compose logs --tail=50 db`                                |
| List databases                 | `docker compose exec db psql -U postgres -l`                      |
| Get a SQL prompt               | `docker compose exec -it db psql -U postgres -d ecom_db`          |
| Create a database              | `docker compose exec db psql -U postgres -c 'CREATE DATABASE x;'` |
| Pause, keep data               | `docker compose stop`                                             |
| Remove containers, keep data   | `docker compose down`                                             |
| Start over (**destroys data**) | `docker compose down -v`                                          |

---

## 10. Command reference

| Command                                                 | What it does                                           |
| ------------------------------------------------------- | ------------------------------------------------------ |
| `docker compose up db -d`                               | Start the Postgres container                           |
| `docker compose logs db`                                | Server log, including the initialisation branch taken  |
| `docker compose ps db`                                  | Status and published ports                             |
| `docker compose down`                                   | Stop containers, **keep** the data                     |
| `docker compose down -v`                                | Stop containers, **delete** the data                   |
| `docker exec ecom-db-1 psql -U postgres -l`             | List databases                                         |
| `docker exec -it ecom-db-1 psql -U postgres -d ecom_db` | Interactive shell on the dev database                  |
| `pnpm prisma:migrate:status`                            | Pending migrations (pinned to `.env.development`)      |
| `pnpm prisma:migrate:dev`                               | Apply/create migrations in development                 |
| `pnpm db:seed`                                          | Seed fixture data                                      |
| `pnpm db:test:reset`                                    | **Drops and recreates** `ecom_e2e`                     |
| `pnpm db:migrate`                                       | Deploy-facing migration; needs `DATABASE_URL` injected |
