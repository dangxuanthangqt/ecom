# Nâng cấp Prisma 7

Những gì đã thay đổi khi repo này chuyển từ Prisma 6.4.1 lên Prisma 7.10.0, lý do, và ảnh hưởng tới
công việc hằng ngày.

**Liên quan:** [database-migration.vi.md](database-migration.vi.md) · [database-seeding.vi.md](database-seeding.vi.md) ·
[postgres-database-management.vi.md](postgres-database-management.vi.md) · [e2e-testing.vi.md](e2e-testing.vi.md)

---

## 1. Vì sao nâng cấp

`pnpm db:seed` từng lỗi `Database "ecom_prod" does not exist` dù `NODE_ENV=development` đã chọn
`.env.development` (`ecom_db`). Thủ phạm là chính Prisma 6: import `@prisma/client` **nạp `.env` và ghi
`DATABASE_URL` vào `process.env` trước khi bất kỳ dòng code nào của ta chạy**. Import luôn chạy trước
thân module, và `dotenv` không bao giờ ghi đè key đã có, nên `config({ path: resolveEnvFilePath() })`
của ta trở thành no-op và URL production thắng.

Prisma 7 bỏ hẳn hành vi này:

- Cả CLI lẫn client đều không tự nạp file `.env` nào.
- `PrismaClient` không còn đọc `DATABASE_URL`; connection string được truyền tường minh qua driver adapter.

Không còn thứ gì có thể lén nạp file env sau lưng ta. Mọi đường đi qua Prisma trong repo giờ đều dùng đúng
một resolver mà app Nest vốn đã dùng (`src/constants/env-file.constant.ts`).

## 2. Nơi duy nhất nạp file env: `prisma.config.ts`

```ts
loadEnvFile({ path: resolveEnvFilePath() }); // .env.development | .env.test | .env, theo NODE_ENV

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "ts-node prisma/seed.ts" },
  datasource: databaseUrl
    ? { url: databaseUrl, shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL }
    : undefined,
});
```

| Tình huống                                      | Điều gì xảy ra                                                                                |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `pnpm prisma:migrate:dev` (không có `NODE_ENV`) | Nạp `.env.development`. Mặc định là development, không bao giờ là production.                 |
| `NODE_ENV=test pnpm exec prisma migrate reset`  | Nạp `.env.test` — đây là cách `scripts/prepare-e2e-database.sh` và `db:test:reset` hoạt động. |
| Docker `migrator` / job CI có `DATABASE_URL`    | Biến môi trường thật thắng; file (nếu có) không điền thêm gì.                                 |
| Stage Docker `builder` chạy `prisma generate`   | Không có `DATABASE_URL` → bỏ qua `datasource` → generate/validate/format vẫn chạy.            |
| `prisma migrate status` không có URL            | Prisma báo "datasource.url is required", chứ không phải lỗi mơ hồ vì connection string rỗng.  |

Hệ quả:

- Bỏ `dotenv-cli`. Dùng `NODE_ENV=<env>` thay cho `dotenv -e <file> --`.
- Key `prisma.seed` trong `package.json` chuyển sang `migrations.seed` trong file config.

## 3. Driver adapter: `PrismaClient` giờ được tạo thế nào

`new PrismaClient()` không có adapter sẽ throw ở Prisma 7. Mọi client được tạo tại một helper duy nhất,
[`src/shared/utils/prisma-client.util.ts`](../src/shared/utils/prisma-client.util.ts):

| Nơi gọi                                   | Lấy URL từ đâu                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `PrismaService` (app Nest)                | Inject `AppConfigService` và truyền `appConfig.databaseUrl` — giá trị `ConfigModule` đã nạp và `validateEnv` đã kiểm tra. |
| `prisma/seed.ts`, `prisma/seed-volume.ts` | `createStandalonePrismaClient()` sau khi `config({ path: resolveEnvFilePath() })`.                                        |
| `initial-scripts/index.ts`                | Cùng factory standalone.                                                                                                  |
| `initial-scripts/create-permission.ts`    | Boot `AppModule` và dùng `app.get(PrismaService)` — không có connection string thứ hai phải giữ đồng bộ.                  |
| `test/e2e/support/prisma-test-client.ts`  | Factory standalone; `.env.test` đã nằm trong `process.env` nhờ Jest `setupFiles`.                                         |

Adapter là `@prisma/adapter-pg` chạy trên pool của `pg`. Tham số URL `?schema=` (chỉ Prisma hiểu) được tách
ra và truyền vào option `schema` của adapter (trở thành `search_path`).

## 4. Client sinh ra nằm ở `src/generated/prisma`

Generator `prisma-client` sinh TypeScript thuần thay vì ghi vào `node_modules`.

- Import từ `@/generated/prisma/client` (`PrismaClient`, `Prisma`, type model, enum).
- Thư mục này được gitignore, prettier-ignore, eslint-ignore và loại khỏi coverage. CI cache nó
  (`.github/actions/prisma-setup`) và sinh lại khi schema đổi; chạy `pnpm prisma:generate` sau mỗi lần pull
  có đụng `schema.prisma`.
- Các class lỗi runtime lấy từ cùng module: `Prisma.PrismaClientKnownRequestError`. **Không** import từ
  `@prisma/client/runtime/library` — đó là runtime của `prisma-client-js` (đã deprecated) và `instanceof`
  với nó sẽ âm thầm không bao giờ khớp với lỗi mà client v7 ném ra.
- `Prisma.validator` không còn. Các selector dùng
  [`defineSelect`](../src/shared/utils/prisma-select.util.ts), một identity curried cùng hình dạng:
  `defineSelect<Prisma.UserSelect>()({ id: true })`.
- `prisma-json-types-generator` 5.x gán kiểu `Product.variants` là `PrismaJson.Variants`
  (`src/types/lib/prisma.d.ts`). Trước đây namespace bị gõ nhầm (`PrismaJon`) khiến generator vô hiệu và
  seed phải ép kiểu `as unknown as Prisma.InputJsonValue`; cả hai đã được sửa.

## 5. Thay đổi CLI ảnh hưởng tới script của ta

| Prisma 6                                                   | Prisma 7                                                              | Ở đâu                                      |
| ---------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------ |
| `prisma db execute --stdin --url "$DATABASE_URL"`          | `prisma db execute --stdin` (URL từ config)                           | `scripts/run-database-migrations.sh`       |
| `prisma migrate diff --from-url "$DATABASE_URL" ...`       | `--from-config-datasource`                                            | `db:drift:live*`                           |
| `--to-schema-datamodel`, `--shadow-database-url`           | `--to-schema`; URL shadow lấy từ config                               | `prisma:migrate:drift`                     |
| `prisma migrate reset --force --skip-seed`                 | `prisma migrate reset --force` (không bao giờ seed; flag đã bị bỏ)    | `db:test:reset`, `prepare-e2e-database.sh` |
| `prisma migrate reset` seed qua `package.json#prisma.seed` | Chỉ `prisma db seed` mới seed, qua `prisma.config.ts#migrations.seed` | `docs/database-seeding.vi.md`              |

`prisma migrate dev` vẫn kích hoạt generator sau khi apply migration.

## 6. Chạy lệnh phá hủy dữ liệu từ AI agent

Prisma 7 nhận diện Claude Code và các agent tương tự, từ chối `prisma migrate reset` (và các lệnh phá dữ
liệu khác) trừ khi biến `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` chứa nguyên văn câu đồng ý của người
dùng. Điều này ảnh hưởng tới `pnpm test:e2e` khi được agent khởi chạy, vì bước setup e2e reset `ecom_e2e`.
Người chạy tay hoặc CI không bị ảnh hưởng.

## 7. Yêu cầu

| Yêu cầu    | Tối thiểu cho Prisma 7 | Repo này                      |
| ---------- | ---------------------- | ----------------------------- |
| Node.js    | 20.19 / 22.12 / 24     | 24.x (`.nvmrc`, `devEngines`) |
| TypeScript | 5.4                    | 5.7.3                         |
| Postgres   | bất kỳ bản được hỗ trợ | 15                            |

Unit test nặng hơn rõ rệt dưới `ts-jest` vì client sinh ra được type-check trong từng worker; trên máy
16 GB hãy chạy `pnpm exec jest --maxWorkers=2` nếu mặc định bị OOM-kill. CI đã giới hạn 2 worker sẵn.
