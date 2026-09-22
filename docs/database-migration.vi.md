# Hướng dẫn Database Migration

Thay đổi schema đi tới từng môi trường trong repo này như thế nào.

**Stack:** NestJS 11 · Prisma 7.10.0 · PostgreSQL 15 · pnpm 12.4.1
**Config:** [`prisma.config.ts`](../prisma.config.ts) — URL datasource, URL shadow, thư mục migrations và lệnh seed (xem [prisma-7-migration.vi.md](prisma-7-migration.vi.md))
**Schema:** [`prisma/schema.prisma`](../prisma/schema.prisma) (một file schema duy nhất)
**Lịch sử:** [`prisma/migrations/`](../prisma/migrations/) — 27 migration, provider khóa cứng `postgresql` trong `migration_lock.toml`

---

## 1. Hai lệnh, và quy tắc giữa chúng

| Lệnh                    | Chạy được ở đâu                 | Nó làm gì                                                                                                                  |
| ----------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `prisma migrate dev`    | **Chỉ môi trường dev local**    | Diff `schema.prisma` với DB, ghi ra file migration mới, apply nó, generate lại client. Có thể **xóa và tạo lại database**. |
| `prisma migrate deploy` | **test / staging / production** | Apply các file migration đã commit theo thứ tự. Không bao giờ generate SQL, không reset, không hỏi gì.                     |

**Quy tắc cứng**

1. `migrate dev` và `db push` **bị cấm** ngoài máy của developer. `db push` không được dùng trong project này — không có script cho nó, và thêm một cái là lỗi.
2. Một thư mục migration dưới `prisma/migrations/` **bất biến sau khi merge**. Mỗi môi trường lưu checksum của nó trong `_prisma_migrations`; sửa một file đã apply làm `migrate deploy` fail. Muốn sửa một migration sai thì thêm migration mới.
3. Chỉ **một tiến trình** migrate tại một thời điểm. Container ứng dụng không bao giờ migrate (xem §5).

---

## 2. Ma trận môi trường

`NODE_ENV` được validate bởi [`src/validations/env.validation.ts`](../src/validations/env.validation.ts) và chỉ chấp nhận **`development`, `test` hoặc `production`**. Staging và production đều chạy dưới `production`, và được phân biệt bằng `DATABASE_URL` cùng target deploy — _không phải_ bằng `NODE_ENV`.

| Môi trường  | `NODE_ENV`    | Lệnh migration                                                   | Ai chạy nó                                                           |
| ----------- | ------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| Development | `development` | `pnpm prisma:migrate:dev`                                        | Developer                                                            |
| Test / CI   | `development` | `pnpm db:test:reset` (local) · `pnpm prisma:migrate:deploy` (CI) | Jest setup / job `migrations` trong CI                               |
| Staging     | `production`  | `pnpm db:migrate`                                                | Workflow `Database Migrate`, environment `staging`                   |
| Production  | `production`  | `pnpm db:migrate`                                                | Workflow `Database Migrate`, environment `production` (cần approval) |

### Mỗi lệnh đọc file env nào

`ConfigModule` chỉ load đúng một file env, chọn theo `NODE_ENV` ([`src/constants/env-file.constant.ts`](../src/constants/env-file.constant.ts), được gắn vào [`src/shared/modules/base.module.ts`](../src/shared/modules/base.module.ts)). Không có fallback giữa các file, nên mỗi file phải đầy đủ:

| `NODE_ENV`    | File env           |
| ------------- | ------------------ |
| `development` | `.env.development` |
| `test`        | `.env.test`        |
| `production`  | `.env`             |

Các môi trường deploy inject biến trực tiếp thay vì đóng gói một file — `.dockerignore` chặn mọi `.env*` khỏi image.

> **Prisma CLI cũng theo đúng luật này.** [`prisma.config.ts`](../prisma.config.ts) nạp đúng file mà `NODE_ENV` chọn (development khi không đặt) qua cùng một resolver, và Prisma 7 không nạp gì khác — cả CLI lẫn client sinh ra đều không tự đọc `.env` nữa. Một lệnh `prisma migrate dev` trần trên máy developer vì thế chạy với `.env.development`, không bao giờ với production. Thứ tự ưu tiên, cao nhất trước:
>
> 1. biến đã có sẵn trong environment (secret của CI, `DATABASE_URL=... pnpm ...`)
> 2. file env ứng với `NODE_ENV`
>
> Thiếu file không phải là lỗi: checkout trên CI và image Docker không có `.env.development` và inject thẳng mọi biến. Nếu sau đó `DATABASE_URL` vẫn trống, config bỏ qua datasource, nên `prisma generate` / `validate` / `format` vẫn chạy còn mọi lệnh cần database sẽ báo "datasource.url is required".
>
> `NODE_ENV=test` có thêm một chốt chặn: config từ chối mọi `DATABASE_URL` không chứa `ecom_e2e`, nên `db:test:reset` và bước setup e2e không thể bị trỏ sang database khác bởi một `.env.test` cũ hay một URL production đang export trong shell.
>
> Các script hướng deploy (`db:migrate`, `prisma:migrate:deploy`, `prisma:migrate:resolve:*`, `db:backup`, `db:restore`) kỳ vọng `DATABASE_URL` do platform hoặc CI inject. `scripts/run-database-migrations.sh` và các script backup/restore kiểm tra biến shell và dừng ngay nếu thiếu; trên máy developer, `pnpm prisma:migrate:deploy` trần sẽ rơi về `.env.development` như mọi lệnh khác.

---

## 3. Quy trình phát triển

### Tạo một migration

```bash
# 1. Sửa prisma/schema.prisma
# 2. Generate + apply + regenerate client trong một bước
pnpm prisma:migrate:dev --name add_product_rating
```

Dùng tên `snake_case` mô tả rõ ràng; nó trở thành tên thư mục và xuất hiện trong migration log của mọi môi trường.

### Review trước khi commit — không thương lượng

```bash
# Ghi SQL nhưng KHÔNG apply, để bạn đọc và sửa trước
pnpm prisma:migrate:dev:create-only --name rename_publish_at_to_published_at

# Đọc SQL vừa generate
cat prisma/migrations/*_rename_publish_at_to_published_at/migration.sql

# Apply khi đã hài lòng
pnpm prisma:migrate:dev
```

`--create-only` là thói quen quan trọng nhất trong repo này. Prisma diễn tả một **rename** thành `DROP COLUMN` + `ADD COLUMN`, việc này phá dữ liệu. [`20250710152419_rename_publish_at_to_published_at`](../prisma/migrations/20250710152419_rename_publish_at_to_published_at/migration.sql) cho thấy cách sửa tay đúng — drop/add được generate ra đã bị thay bằng:

```sql
ALTER TABLE "Product" RENAME COLUMN "publishAt" TO "publishedAt";
```

Header cảnh báo mà Prisma để lại trong file đó đã cũ; SQL bên dưới nó an toàn. Đọc SQL, đừng đọc header.

Ngược lại, [`20250426095525_update_to_uuid`](../prisma/migrations/20250426095525_update_to_uuid/migration.sql) (857 dòng) drop và tạo lại mọi cột FK. Nó sống sót được chỉ vì lúc đó chưa có dữ liệu thật. **Một migration dạng đó không bao giờ được apply lên production ở dạng được generate ra.**

### Verify trước khi push

```bash
pnpm prisma:validate        # schema hợp lệ về cú pháp
pnpm prisma:migrate:status  # DB local không có migration pending/failed
pnpm prisma:migrate:drift   # lịch sử migration tái tạo đúng schema.prisma
```

Cả ba lệnh đều chạy với `.env.development` (do `prisma.config.ts` chọn), nên chúng không bao giờ đụng tới database mà `.env` khai báo. `prisma:migrate:drift` cần `SHADOW_DATABASE_URL` trỏ vào một **database dùng-một-lần riêng biệt** — Prisma sẽ reset nó. Nó exit `2` khi `schema.prisma` và lịch sử migration không khớp, đây là lỗi kinh điển "sửa schema, quên migration".

### Seeding

Seed **không phải** migration và không bao giờ tự chạy:

```bash
pnpm seed:initial-scripts                    # admin user
pnpm seed:initial-scripts:create-permission  # các dòng permission từ routes
```

---

## 4. Quy trình test

Unit test (`pnpm test`, 114 suite) mock Prisma hoàn toàn và không cần database.

Với bất cứ thứ gì đụng vào database thật, `db:test:reset` chạy với `NODE_ENV=test` nên lấy `DATABASE_URL` từ `.env.test` (copy từ `.env.test.example`, file này trỏ vào `ecom_e2e`):

```bash
cp .env.test.example .env.test   # một lần cho mỗi checkout
pnpm db:test:reset
```

Một biến được export tường minh vẫn ưu tiên hơn file — đây là cách CI trỏ lệnh này vào service container của nó:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ecom_test?schema=public" \
  pnpm db:test:reset
```

`db:test:reset` chạy `prisma migrate reset --force` dưới `NODE_ENV=test` — nó **xóa và tạo lại database**. Đừng bao giờ trỏ nó vào một database bạn quan tâm. `prisma.config.ts` chỉ nạp đúng file env mà `NODE_ENV` chọn (ở đây là `.env.test`) và không gì khác; Prisma 7 không còn tự đọc `.env`, nên lệnh reset không thể thừa hưởng URL production. (`--skip-seed` đã bị bỏ ở Prisma 7 vì `migrate reset` không còn seed nữa — xem [database-seeding.vi.md](database-seeding.vi.md).)

CI làm điều tương tự theo cách khó hơn: nó apply toàn bộ lịch sử lên một service container Postgres 15 trống, đây là thứ chứng minh lịch sử replay được từ số 0.

---

## 5. Quy trình staging và production

### Thứ tự (đây là toàn bộ thiết kế)

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

Migration chạy **trước** phiên bản ứng dụng mới, và thay đổi schema phải tương thích ngược với phiên bản đang chạy (§6).

### Ai nói chuyện với database, và khi nào

Ý nghĩa của sơ đồ dưới đây: trong cửa sổ rollout, phiên bản app **cũ** vẫn đang phục vụ traffic với schema **mới**. Cửa sổ đó là lý do §6 tồn tại.

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

### Vì sao container ứng dụng không migrate

[`docker-entrypoint.sh`](../docker-entrypoint.sh) chỉ khởi động app, không làm gì khác. Nếu nó migrate, mỗi replica sẽ thử chạy cùng một migration mỗi khi scale-up và rolling deploy. Image production thậm chí không chứa Prisma CLI — `pnpm prune --prod` loại bỏ nó, vì `prisma` là devDependency.

Migration đến từ stage Docker **`migrator`** riêng thay vào đó:

```bash
docker build --target migrator -t ecom-migrator .
docker run --rm -e DATABASE_URL="$DATABASE_URL" ecom-migrator
```

Image migrator, workflow `Database Migrate` và một lần chạy production thủ công đều gọi cùng một script, [`scripts/run-database-migrations.sh`](../scripts/run-database-migrations.sh), nên mọi đường đi tới database đã deploy đều hành xử giống nhau. (Job `migrations` của CI gọi `prisma migrate deploy` trực tiếp — nó nhắm vào một container dùng-một-lần, không phải database đã deploy.) Script sẽ:

1. yêu cầu `DATABASE_URL`;
2. probe database cho tới khi nó chấp nhận kết nối (thay cho một `sleep` cố định);
3. in `migrate status` trước khi động vào bất cứ thứ gì;
4. chạy `prisma migrate deploy`;
5. in hướng dẫn recovery cho P3009 và exit non-zero khi fail.

`DRY_RUN=true` báo cáo các migration đang pending và exit `0` mà không apply.

### Docker Compose local / single-host

`docker compose up` tự sắp thứ tự này đúng:

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

Service `migrate` không bao giờ được scale.

---

## 6. Breaking changes — expand và contract

Một migration và phiên bản ứng dụng cần nó **không bao giờ** được deploy nguyên khối cùng lúc. Trong một rolling deploy, code cũ và mới đều chạy với schema mới. Vì vậy một breaking change được chia thành **các release riêng biệt**:

| Giai đoạn    | Release | Schema                                                  | Code                       |
| ------------ | ------- | ------------------------------------------------------- | -------------------------- |
| **Expand**   | N       | Thêm cấu trúc mới, nullable/có default. Cột cũ vẫn còn. | Ghi cả cũ lẫn mới. Đọc cũ. |
| **Migrate**  | N       | Backfill theo batch (§7).                               | —                          |
| **Switch**   | N+1     | —                                                       | Chỉ đọc và ghi cái mới.    |
| **Contract** | N+2     | Xóa cấu trúc cũ.                                        | —                          |

Mỗi giai đoạn là một migration và một deploy riêng. Không bao giờ gộp chúng lại.

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

Các mũi tên chấm chấm là lý do cho việc chia tách: cho tới khi **Contract** được ship, việc rollback app luôn khả thi vì cấu trúc cũ vẫn còn tồn tại.

### Rủi ro cụ thể trong PostgreSQL 15

| Thay đổi                                      | Rủi ro                                            | Cách an toàn                                                                                 |
| --------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `ADD COLUMN NOT NULL` không có default        | Từ chối các dòng hiện có; fail thẳng              | Thêm nullable → backfill → `SET NOT NULL` trong migration sau                                |
| `ADD COLUMN NOT NULL DEFAULT <constant>`      | An toàn từ PG 11 — không rewrite bảng             | Dùng thoải mái                                                                               |
| `ADD COLUMN NOT NULL DEFAULT <volatile expr>` | Rewrite toàn bộ bảng dưới lock `ACCESS EXCLUSIVE` | Thêm nullable → backfill → set default                                                       |
| `SET NOT NULL`                                | Full table scan giữ lock `ACCESS EXCLUSIVE`       | Thêm một `CHECK (col IS NOT NULL)` đã validate trước, sau đó `SET NOT NULL` (PG bỏ qua scan) |
| `CREATE INDEX`                                | Chặn write cho toàn bộ quá trình build            | Dùng `CONCURRENTLY` — xem bên dưới                                                           |
| Đổi kiểu dữ liệu của cột                      | Rewrite bảng; Prisma có thể emit drop + add       | Expand/contract với một cột mới                                                              |
| Đổi tên một cột                               | Prisma emit `DROP` + `ADD` = mất dữ liệu          | Sửa tay thành `RENAME COLUMN` (xem §3)                                                       |
| `ADD FOREIGN KEY`                             | Validate mọi dòng dưới lock                       | `NOT VALID`, sau đó `VALIDATE CONSTRAINT` trong migration sau                                |

### `CREATE INDEX CONCURRENTLY` — hành vi đã kiểm chứng

Prisma gửi mỗi file migration tới PostgreSQL dưới dạng **một chuỗi lệnh**. Điều đó dẫn tới hai hệ quả, cả hai đều đã được xác nhận trên schema này với PostgreSQL 15:

- Một file migration chứa **hơn một statement** chạy trong một transaction ngầm. Nó có tính atomic — fail giữa chừng thì rollback toàn bộ file — nhưng `CREATE INDEX CONCURRENTLY` sẽ fail với `25001: cannot run inside a transaction block`.
- Một file migration chứa **đúng một statement** chạy ở chế độ autocommit, và `CREATE INDEX CONCURRENTLY` sẽ thành công.

Vậy nên: **đặt một index `CONCURRENTLY` trong migration riêng của nó, một mình, không có gì khác trong file.**

```bash
pnpm prisma:migrate:dev:create-only --name add_order_status_index_concurrently
# then edit the file so it contains ONLY:
#   CREATE INDEX CONCURRENTLY "Order_status_idx" ON "Order" ("status");
```

Lưu ý: một lần build `CONCURRENTLY` thất bại để lại một **index không hợp lệ** phải được drop thủ công trước khi thử lại:

```sql
SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;
DROP INDEX CONCURRENTLY "Order_status_idx";
```

Vì `schema.prisma` không thể diễn tả `CONCURRENTLY`, khai báo index bình thường với `@@index` rồi sửa tay SQL được generate ra — `pnpm prisma:migrate:drift` sau đó vẫn pass.

### Hành vi lock trên bảng lớn

`ALTER TABLE` giữ lock `ACCESS EXCLUSIVE`. Nó chờ phía sau bất kỳ transaction nào đang mở trên bảng — và trong lúc chờ, **mọi query tiếp theo xếp hàng phía sau nó**. Một migration trông như tức thì có thể làm đứng cả API.

Đặt một lock timeout để migration fail nhanh thay vì làm đóng băng traffic, bằng cách thêm libpq options vào `DATABASE_URL` của migration:

```
postgresql://user:pass@host:5432/db?schema=public&options=-c%20lock_timeout%3D5000
```

Năm giây là một mặc định hợp lý: một migration không lấy được lock sẽ bị abort và được retry, thay vì làm sập service. `prisma migrate deploy` chạy lại được an toàn.

---

## 7. Data migration

File migration của Prisma là SQL thuần, nên data migration nằm trong đó. Hai quy tắc:

1. **Batch mọi thứ lớn.** Một `UPDATE` duy nhất trên hàng triệu dòng giữ lock và làm phình WAL. Dùng một vòng lặp có giới hạn:

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

2. **Giữ backfill dài ngoài đường deploy.** Nếu một backfill mất vài phút, chạy nó như một bước riêng giữa Expand và Switch, không phải bên trong migration làm chặn release.

Với các model soft-delete (hầu hết model ở đây có `deletedAt`), scope backfill rõ ràng — quyết định xem các dòng đã soft-delete có nên bị động vào hay không, và ghi rõ điều đó trong SQL.

---

## 8. Quy trình production thủ công (phương án dự phòng)

Chỉ dùng khi workflow `Database Migrate` không khả dụng. Thông báo trước — không migrate thủ công âm thầm.

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

Chạy cái này từ **một** máy, với **một** operator, trên một kết nối ổn định — `tmux`/`screen` để một phiên SSH bị rớt không thể làm gián đoạn migration giữa chừng. Không bao giờ chạy bước 5 từ hai terminal.

---

## 9. Rollback và recovery

**Prisma không có `migrate down`.** Không có rollback tự động. Recovery là một trong ba đường, theo thứ tự ưu tiên:

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

### a. Roll forward (mặc định)

Viết một migration mới đảo ngược thay đổi và deploy nó. Đây là đường duy nhất giữ lịch sử tuyến tính và mọi môi trường nhất quán.

```bash
pnpm prisma:migrate:dev:create-only --name revert_add_product_rating
# hand-write the inverse SQL, review, commit, deploy
```

[`20250615164008_revert_language_id_varchar`](../prisma/migrations/20250615164008_revert_language_id_varchar/) là pattern này đã được dùng trong repo này rồi.

### b. Restore từ backup

Chỉ khi migration đã phá dữ liệu và không có forward fix nào phục hồi được nó. Chấp nhận mất mọi thứ đã ghi kể từ dump:

```bash
pg_restore -d "$PROD_DATABASE_URL" --clean --if-exists backup-YYYYmmdd-HHMMSS.dump
```

Sau khi restore, bảng `_prisma_migrations` trở về trạng thái đã backup — chạy lại `pnpm prisma:migrate:status` và đối soát trước khi deploy bất cứ thứ gì.

### c. Redeploy phiên bản ứng dụng trước đó

Nếu schema ổn nhưng code sai, roll app trở lại. Cái này chỉ hoạt động khi migration tương thích ngược (§6) — đó là lý do cho kỷ luật đó.

---

## 10. Xử lý sự cố khi fail

### `P3009` — một migration bị fail được ghi nhận

```
migrate found failed migrations in the target database
```

`migrate deploy` từ chối làm gì cho tới khi cái này được resolve. **Không bao giờ sửa `_prisma_migrations` bằng tay.**

1. Xác định nó: `pnpm prisma:migrate:status`
2. Đọc SQL của migration đó và kiểm tra trạng thái database thật để xác định cái gì thực sự đã landed.
3. Resolve có chủ đích:

   ```bash
   # The migration left NOTHING behind (multi-statement files roll back atomically)
   pnpm prisma:migrate:resolve:rolled-back <migration_name>

   # Its effects are fully present, applied by hand and matching the SQL
   pnpm prisma:migrate:resolve:applied <migration_name>
   ```

4. Chạy lại `pnpm db:migrate`.

Một migration một-statement là trường hợp duy nhất cần cẩn thận: nó chạy ở autocommit, nên có thể đã apply một phần. Verify schema thực tế trước khi chọn.

### `P3018` — một migration apply thất bại

Bản thân SQL bị lỗi; mã lỗi database được in bên dưới (ví dụ `42701 duplicate column`, `25001 CONCURRENTLY in transaction`). Sửa SQL trong một migration **mới** — không bao giờ sửa file đã fail nếu nó đã tới môi trường khác rồi.

### `P3005` / checksum mismatch — schema database không trống

Hoặc database bị thay đổi ngoài Prisma, hoặc một migration đã commit bị sửa sau khi apply. Với một database đã khớp với một migration, baseline nó:

```bash
pnpm prisma:migrate:resolve:applied <migration_name>
```

Nếu một file migration đã merge bị sửa, revert lại chỉnh sửa đó — cổng bất biến của CI tồn tại để chặn việc này tới được production.

### `migrate deploy` bị treo

Nó đang chờ `ACCESS EXCLUSIVE`. Tìm cái đang chặn:

```sql
SELECT pid, state, wait_event_type, left(query, 120) AS query, now() - xact_start AS age
  FROM pg_stat_activity
 WHERE datname = current_database() AND state <> 'idle'
 ORDER BY xact_start;
```

Kết thúc transaction đang chặn (`SELECT pg_terminate_backend(<pid>);`) hoặc hủy migration và retry với `lock_timeout` được đặt (§6).

### Drift check fail trong CI (exit 2)

`schema.prisma` và lịch sử migration không khớp. Generate migration còn thiếu và commit nó:

```bash
pnpm prisma:migrate:dev --name <describes_the_change>
```

---

## 11. CI/CD

### `CI` — [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

Các job: `lint`, `build`, và `migrations`. Job `migrations` chạy trên một service container `postgres:15-alpine` thật và gate mọi PR:

| Bước                                        | Bắt được gì                                                                       |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| Migration đã apply là bất biến              | Bất kỳ file bị sửa / xóa / đổi tên nào dưới `prisma/migrations` so với branch gốc |
| `pnpm prisma:validate`                      | Schema không hợp lệ                                                               |
| `pnpm prisma:migrate:deploy` trên DB trống  | SQL không thể replay từ số 0                                                      |
| `pnpm prisma:migrate:status`                | Migration pending hoặc failed                                                     |
| `pnpm prisma:migrate:drift` (exit 2 ⇒ fail) | `schema.prisma` bị sửa mà không có migration                                      |

### `Database Migrate` — [`.github/workflows/database-migrate.yml`](../.github/workflows/database-migrate.yml)

Là writer tự động duy nhất tới một database đã deploy.

- `workflow_dispatch` cho operator (chọn `staging` / `production`, `dry_run` mặc định là **true**).
- `workflow_call` để một deploy pipeline có thể chain nó trước khi rollout container.
- `concurrency: db-migrate-<environment>` với `cancel-in-progress: false` — chạy hàng đợi, không bao giờ hủy. Hủy giữa chừng migration là thứ tạo ra P3009.
- `environment:` gắn với GitHub Environment secrets (`DATABASE_URL`); thêm required reviewers vào environment `production` để làm production cần approval.

**Cần setup trước khi dùng lần đầu:** tạo GitHub Environments `staging` và `production` trong repository settings và thêm secret `DATABASE_URL` cho mỗi cái. Thêm required reviewers vào `production`.

---

## 12. Checklist

### Checklist review — cho tác giả PR và reviewer

- [ ] `migration.sql` đã được **đọc**, không chỉ generate ra
- [ ] Không có `DROP COLUMN` / `DROP TABLE` ngoài ý muốn; rename dùng `RENAME COLUMN`
- [ ] Bất kỳ header `Warnings:` nào trong file đã được đánh giá và hoặc chính xác hoặc đã cũ-và-được-ghi-chú
- [ ] Cột `NOT NULL` mới có default là hằng số, hoặc được chia expand/contract
- [ ] Index trên bảng lớn dùng `CONCURRENTLY`, một mình trong file migration riêng
- [ ] Data backfill được batch
- [ ] Thay đổi tương thích ngược với phiên bản app đang deploy hiện tại
- [ ] Chỉ có thư mục migration **mới** được thêm vào — không file nào hiện có bị động vào
- [ ] `pnpm prisma:migrate:drift` pass ở local
- [ ] Tên migration mô tả thay đổi bằng `snake_case`

### Checklist deployment

- [ ] Job `migrations` của CI xanh trên merge commit
- [ ] Backup gần đây tồn tại và đã được verify không rỗng
- [ ] `pnpm db:migrate:dry-run` đã review — danh sách pending đúng như mong đợi
- [ ] Migration được apply **trước** khi phiên bản app mới rollout
- [ ] Đúng một tiến trình migration (workflow job hoặc migrator container) — không bao giờ là một app replica
- [ ] `pnpm prisma:migrate:status` báo cáo up to date sau đó
- [ ] Health và error rate của ứng dụng được kiểm tra sau rollout
- [ ] Với một thay đổi kéo dài nhiều release: giai đoạn expand/contract cho release này được ghi lại, để release tiếp theo không bị quên

---

## 13. Bảng tra lệnh

| Lệnh                                             | Mục đích                                                                                                               |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `pnpm prisma:migrate:dev`                        | Tạo + apply một migration rồi generate lại client (**chỉ development**, đọc `.env.development` qua `prisma.config.ts`) |
| `pnpm prisma:migrate:dev:create-only`            | Generate SQL mà không apply — để review và sửa tay                                                                     |
| `pnpm prisma:migrate:deploy`                     | Apply các migration đã commit (không phải development)                                                                 |
| `pnpm prisma:migrate:status`                     | Hiện các migration đã apply / pending / failed                                                                         |
| `pnpm prisma:migrate:resolve:applied <name>`     | Đánh dấu một migration failed là đã apply                                                                              |
| `pnpm prisma:migrate:resolve:rolled-back <name>` | Đánh dấu một migration failed là đã rolled back                                                                        |
| `pnpm prisma:migrate:drift`                      | Verify lịch sử tái tạo đúng `schema.prisma` (cần `SHADOW_DATABASE_URL`)                                                |
| `pnpm prisma:validate`                           | Validate `schema.prisma`                                                                                               |
| `pnpm prisma:generate`                           | Generate lại Prisma client vào `src/generated/prisma` (không cần database)                                             |
| `pnpm prisma:studio`                             | Mở Prisma Studio                                                                                                       |
| `pnpm db:migrate`                                | Deploy có bảo vệ: chờ DB → status → deploy → verify                                                                    |
| `pnpm db:migrate:dry-run`                        | Báo cáo migration đang pending, không apply gì                                                                         |
| `pnpm db:test:reset`                             | **Xóa và tạo lại** database test (`.env.test`), sau đó apply mọi migration                                             |
| `NODE_ENV=<development\|test\|production> <cmd>` | Chọn file env mà `prisma.config.ts` nạp cho bất kỳ lệnh Prisma nào (mặc định: development)                             |
| `pnpm seed:initial-scripts`                      | Seed admin user (không bao giờ tự động)                                                                                |

</content>
