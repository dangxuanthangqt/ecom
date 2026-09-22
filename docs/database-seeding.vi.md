# Database Seeding

Hai seeder, hai nhiệm vụ:

|                          | Fixture seed                | Volume seed                          |
| ------------------------ | --------------------------- | ------------------------------------ |
| Entry                    | `prisma/seed.ts`            | `prisma/seed-volume.ts`              |
| Kích thước               | ~180 dòng                   | hàng chục nghìn, chỉnh được          |
| Ids                      | cố định, hardcode           | ngẫu nhiên                           |
| Chạy lại được            | được, idempotent (`upsert`) | không, cộng dồn (`createMany`)       |
| Chạy khi `migrate reset` | có                          | không, chỉ chạy khi cần              |
| Dùng cho                 | dev hàng ngày, e2e, Postman | pagination, hiệu năng index và query |

Tách riêng hai cái này là có chủ đích. Nếu seed hàng ngày mang theo 50k dòng thì
vòng lặp dev sẽ chậm và test không thể hardcode id; nếu volume seed mà deterministic
thì nó sẽ không còn giống phân bố dữ liệu thật nữa.

---

## Fixture seed

### Commands

| Command                     | Làm gì                                                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `pnpm db:seed`              | Core + demo data. Chạy lại nhiều lần vẫn an toàn.                                                                 |
| `pnpm db:seed:reset`        | Truncate mọi bảng đã seed trước, rồi seed lại.                                                                    |
| `pnpm db:seed:core`         | Chỉ seed core data (languages, roles, admin user).                                                                |
| `pnpm exec prisma db seed`  | Chạy `prisma/seed.ts` qua `migrations.seed` trong `prisma.config.ts`. Tương đương `pnpm db:seed` theo `NODE_ENV`. |
| `pnpm prisma migrate reset` | Chỉ rebuild schema. **Prisma 7 không bao giờ seed khi reset** — chạy `pnpm db:seed` sau đó.                       |

Permissions **không** được seed ở đây — chúng được suy ra từ route table đang chạy thực tế:

```bash
pnpm seed:initial-scripts:create-permission
```

### Nó tạo ra gì

| Table                          | Số dòng                        |
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

Được thiết kế sao cho các nhánh đáng chú ý đều có dữ liệu:

- một product có `publishedAt: null` — filter published-only thực sự loại bỏ được cái gì đó
- category lồng hai cấp (Electronics → Phones) — traversal cây có một cây thật để duyệt
- **một order cho mỗi `OrderStatus`** — mọi filter theo status đều trả về dòng
- review trải khắp rating 1..5 — filter rating và tính trung bình phủ đủ mọi mốc
- 30 product với `publishedAt` so le nhau — pagination có thứ tự sắp xếp ổn định, không bị trùng
- product có 1, 2, 3 và 4 SKU — xử lý variant thấy đủ mọi trường hợp số lượng

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

### Năm nguyên tắc mà nó tuân theo

1. **Id cố định, không bao giờ `uuid()`.** Mỗi dòng có một UUID hardcode trong `seed-ids.ts`.
   Đó là lý do khiến các lần chạy lại là `upsert` chứ không phải `insert`, và nó cho phép
   Postman collections và e2e test hardcode id mà vẫn sống sót qua `migrate reset`.
   Các dòng con không có composite unique key (translations, order snapshots) được gán
   id dẫn xuất qua `derivedId(parentId, block)`.

2. **Hai tier, chặn bằng allowlist môi trường.** Một seeder khai báo
   `tier: "core" | "demo"`. `core` là dữ liệu tham chiếu mà app không thể khởi động thiếu nó
   và an toàn ở mọi nơi; `demo` là catalog mẫu và chỉ chạy khi
   `NODE_ENV` là `development` hoặc `test` (xem `seed/seed-environment.ts`).
   Chặn bằng allowlist là có chủ đích — một kiểm tra `!== "production"` sẽ để lọt
   `staging`, `uat` và `qa`, mà các database đó là dùng chung. Ở bất kỳ môi trường
   nào khác, `pnpm db:seed` âm thầm hạ xuống chỉ chạy core, còn
   `--reset` từ chối thẳng.

3. **Thứ tự tường minh, không phải dependency graph.** `SEEDERS` trong `seed-runner.ts` là
   thứ tự phụ thuộc FK. Một seeder mới được đặt sau mọi thứ nó tham chiếu tới.
   `roles` và `languages` ghi `createdById: null` vì admin sẽ sở hữu chúng
   chưa tồn tại vào lúc đó.

4. **Một transaction cho mỗi lần chạy.** Một database seed dở dang còn tệ hơn một database rỗng,
   vì lần chạy tiếp theo `upsert` sẽ che giấu mất chỗ thiếu.

5. **Không dùng Nest DI.** Seed dùng `PrismaClient` trần. Boot `AppModule` sẽ
   kéo theo Redis, S3, mailer và một HTTP listener cho một việc chỉ cần
   kết nối database.

### Hero product và catalogue product

`products.data.ts` chứa hai nhóm:

- **Hero products** (`ProductId.IPHONE_15`, …) giữ id có tên vì cart,
  order và review fixture trỏ vào chúng. Không bao giờ đánh lại số hoặc gỡ bỏ một cái
  mà không cập nhật các seeder đó.
- **Catalogue entries** mỗi cái chỉ một dòng ngắn gọn; id, ảnh, translations, SKU
  và giá ảo đều được suy ra. Thêm một product chỉ tốn một dòng.

### Demo accounts

| Role   | Email                | Password          |
| ------ | -------------------- | ----------------- |
| admin  | `$ADMIN_EMAIL`       | `$ADMIN_PASSWORD` |
| seller | `seller@ecom.local`  | `Password@123`    |
| client | `client@ecom.local`  | `Password@123`    |
| client | `client2@ecom.local` | `Password@123`    |

Thông tin đăng nhập admin lấy từ environment, không bao giờ từ một fixture đã commit, để
core seeder cũng có thể chạy trên staging. Password chỉ được ghi khi **create** —
seed lại không bao giờ reset một password đã bị đổi sau đó.

### Thêm một seeder

1. Thêm id cố định vào `seed-ids.ts`.
2. Thêm fixture vào `data/` nếu tập dữ liệu nhiều hơn vài dòng.
3. Tạo `seeders/<name>.seeder.ts` export `defineSeeder({ name, tier, run })`.
   Dùng `upsert` khóa theo id cố định hoặc theo một composite unique constraint thật.
4. Đăng ký nó trong `SEEDERS` **sau** mọi thứ nó tham chiếu tới.

---

## Volume seed

Dữ liệu ngẫu nhiên số lượng lớn để đo hành vi query và index. Cần core seed
(roles và languages) đã chạy trước.

### Commands

```bash
# defaults: 500 users, 2k products, 6k SKUs, 5k orders, 3k reviews (~2s)
pnpm db:seed:volume

# tune any count
pnpm db:seed:volume --products=20000 --orders=50000 --users=5000 --reviews=30000

# remove everything the volume seeder wrote, fixture data untouched
pnpm db:seed:volume:clean
```

Các flag map 1-1 vào `VolumeConfig`: `users`, `brands`, `categories`,
`products`, `skusPerProduct`, `orders`, `itemsPerOrder`, `reviews`, `cartItems`,
`batchSize`, `randomSeed`. Một flag không xác định là lỗi cứng, không phải im lặng bỏ qua.

Đo trên một container Postgres local: ~44k dòng trong 2.3s ở mức mặc định,
~290k dòng trong 27s với `--products=20000 --orders=50000`.

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

### Các quyết định thiết kế

- **`createMany` theo batch 1000.** Một INSERT 100k dòng là rủi ro về bộ nhớ và
  lock; `batchSize` chỉnh được nếu Postgres của bạn thích cách khác.
- **Không bọc transaction.** Một lượt ghi lớn như vậy nếu giữ mở trong một transaction
  là vấn đề lock và WAL, mà cũng chẳng có gì cần bảo vệ — `--clean` sẽ hoàn tác nó.
- **Một bcrypt hash, dùng chung cho mọi user được sinh ra.** Hash 5000 password ở
  10 rounds sẽ tốn vài phút và chẳng chứng minh được gì.
- **`faker.seed(randomSeed)`.** Hai lần chạy với cùng flag cho ra cùng
  hình dạng dữ liệu, nên so sánh hiệu năng không bị nhiễu bởi phân bố dữ liệu khác nhau.
- **m2m ngầm qua raw SQL có tham số hóa.** `Product.categories` và
  `Order.products` không có Prisma model đứng sau, nên `_CategoryToProduct` và
  `_OrderToProduct` được ghi bằng `INSERT … ON CONFLICT DO NOTHING` dựng từ
  các placeholder `Prisma.sql`. Chỉ có tên bảng là `Prisma.raw`, và nó đến
  từ một union type đóng.
- **`skipDuplicates` trên Review và CartItem.** Cả hai đều có composite unique key
  và các cặp ngẫu nhiên bị trùng, nên số lượng thực tế được báo cáo, chứ không phải
  số lượng đã yêu cầu.
- **~10% product chưa published**, nên filter published-only loại bỏ được dòng thật
  thay vì quét toàn bộ.

### `--clean` tìm các dòng của nó như thế nào

Không có gì phải đoán. Mọi dòng được sinh ra đều được đóng dấu `createdById =
UserId.VOLUME_ACTOR`, và mọi tài khoản được sinh ra đều nằm trên domain email
`@volume.local`. Việc xóa chạy theo thứ tự FK ngược; Product, Brand và Category
cascade xuống SKU và translations của chúng, nên các bước đó không cần làm riêng.

Cả volume seeder lẫn cleaner của nó đều từ chối chạy trừ khi `NODE_ENV` là
`development` hoặc `test` — cùng allowlist mà fixture seed dùng. `staging`,
`uat`, `qa` và production đều bị từ chối, kèm lỗi nêu tên
thao tác và trỏ đến `pnpm db:seed:core`.
