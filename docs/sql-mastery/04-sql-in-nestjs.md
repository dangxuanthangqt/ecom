# 04 · SQL trong NestJS thực tế (tuần 10–12)

Mục tiêu: đem SQL đã học vào code theo cách senior làm: an toàn (không SQL injection), có kiểu (typed), có test, có migration, và **biết khi nào dùng ORM, khi nào viết tay**. Ba ORM phổ biến trong hệ NestJS được đề cập: Prisma, Drizzle, TypeORM. Bạn chỉ cần đọc kỹ phần của ORM dự án mình dùng, lướt hai phần còn lại.

Ví dụ dùng schema mẫu [schema.sql](schema.sql). Bài tập tương ứng: mức 4 trong [05-exercises.md](05-exercises.md).

---

## Tuần 10 · Prisma raw query đúng cách

### 10.1 Tên bảng / cột: snake_case hay camelCase?

Prisma mặc định tạo bảng theo tên model (`Product`) và cột camelCase (`createdAt`). Postgres phân biệt hoa thường khi có nháy kép, nên raw SQL phải viết `"Product"."createdAt"`. Hai lựa chọn:

- **Khuyến nghị**: dùng `@@map("products")` và `@map("created_at")` trong schema Prisma để DB là snake_case chuẩn; code TypeScript vẫn camelCase. Raw SQL sạch, DBA và tool ngoài đọc được.
- Giữ mặc định: mọi identifier trong raw SQL phải bọc nháy kép. Bảng nối n-n ẩn có tên `_CategoryToProduct` với cột `A`, `B`.

Các ví dụ dưới giả định đã `@map` sang snake_case như schema mẫu.

### 10.2 Quy tắc số một: tagged template, không nối chuỗi

**Bối cảnh:** endpoint "sản phẩm của một brand kèm giá thấp nhất" (`brands` → `products` → `skus`, đều 1-n). `brandId` và `take` đến từ query string của người dùng, tức là dữ liệu không tin được.

```ts
// ĐÚNG: $queryRaw với template literal → tham số hoá ($1, $2), không thể inject
const rows = await prisma.$queryRaw<ProductRow[]>`
  SELECT p.id, p.name, MIN(s.price) AS min_price
  FROM products p
  LEFT JOIN skus s ON s.product_id = p.id AND s.deleted_at IS NULL
  WHERE p.deleted_at IS NULL AND p.brand_id = ${brandId}::uuid
  GROUP BY p.id
  ORDER BY p.created_at DESC
  LIMIT ${take}
`;

// SAI: $queryRawUnsafe với chuỗi nối → SQL injection
await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE email = '${email}'`);
```

`${brandId}` trong tagged template **không** phải nội suy chuỗi; Prisma biến nó thành tham số `$1`. Lưu ý cast `::uuid` khi cột là uuid để planner dùng index (file 03, mục 7.4).

### 10.3 Điều kiện động với `Prisma.sql` và `Prisma.join`

**Bối cảnh:** màn hình tìm kiếm có nhiều filter tuỳ chọn (từ khoá, nhiều brand, giá tối thiểu) và một tuỳ chọn sắp xếp. Filter nào người dùng không chọn thì không được xuất hiện trong WHERE, nên mệnh đề WHERE phải ghép động, nhưng vẫn phải tham số hoá.

```ts
import { Prisma } from "@prisma/client";

const conditions: Prisma.Sql[] = [Prisma.sql`p.deleted_at IS NULL`];
if (q) conditions.push(Prisma.sql`p.name ILIKE ${"%" + q + "%"}`);
if (brandIds?.length)
  conditions.push(Prisma.sql`p.brand_id IN (${Prisma.join(brandIds)})`);
if (minPrice != null) conditions.push(Prisma.sql`p.base_price >= ${minPrice}`);

const where = Prisma.join(conditions, " AND ");

// sort qua whitelist, KHÔNG BAO GIỜ lấy tên cột từ input
const ORDER: Record<SortKey, Prisma.Sql> = {
  newest: Prisma.sql`p.created_at DESC, p.id DESC`,
  priceAsc: Prisma.sql`p.base_price ASC, p.id ASC`,
};
const orderBy = ORDER[sort] ?? ORDER.newest;

const rows = await prisma.$queryRaw<ProductRow[]>`
  SELECT p.id, p.name, p.base_price
  FROM products p
  WHERE ${where}
  ORDER BY ${orderBy}
  LIMIT ${take}
`;
```

- Mảng: `IN (${Prisma.join(ids)})` hoặc `= ANY(${ids}::uuid[])`.
- `Prisma.raw()` chèn chuỗi thô, chỉ dùng cho identifier đã whitelist.

### 10.4 Kiểu trả về

`$queryRaw` không biết kiểu; generic `<ProductRow[]>` chỉ là lời hứa của bạn. Hai việc phải làm:

1. Khai báo interface theo đúng alias trong SELECT (`min_price` → đặt alias `"minPrice"` nếu muốn camelCase, hoặc map sau).
2. Biết mapping kiểu Postgres → JS của Prisma: `bigint` và `COUNT(*)` về `bigint` (phải `Number()` hoặc `::int` trong SQL), `numeric` về `Decimal`, `timestamptz` về `Date`. Bẫy phổ biến: `COUNT(*)` trả `1n` và `JSON.stringify` ném lỗi. Viết `COUNT(*)::int`.

Muốn chắc chắn: validate output bằng Zod / class-validator ngay sau query, nhất là cho endpoint báo cáo.

### 10.5 Transaction có raw SQL

**Bối cảnh:** luồng đặt hàng ở file 01 §3.4, viết trong service NestJS: trừ tồn kho bằng raw SQL (để có `RETURNING` và điều kiện `stock >= qty`), rồi tạo đơn bằng Prisma Client, tất cả trong một transaction.

```ts
await prisma.$transaction(
  async (tx) => {
    const [sku] = await tx.$queryRaw<{ stock: number }[]>`
    UPDATE skus SET stock = stock - ${qty}
    WHERE id = ${skuId}::uuid AND stock >= ${qty}
    RETURNING stock
  `;
    if (!sku) throw new OutOfStockException(skuId);
    await tx.order.create({
      data: {
        /* ... */
      },
    }); // trộn ORM và raw trong cùng tx là bình thường
  },
  { isolationLevel: "ReadCommitted", timeout: 5000 },
);
```

- Interactive transaction có `timeout`; đừng để mặc định.
- Retry khi `error.code === 'P2034'` (serialization / deadlock) nếu dùng RepeatableRead / Serializable.
- Không `await` HTTP, queue, mail trong callback.

### 10.6 Khi nào dùng Prisma Client, khi nào raw

| Dùng Prisma Client                     | Dùng `$queryRaw`                                                                          |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| CRUD, filter đơn giản, include 1–2 cấp | Window function, CTE, LATERAL, recursive                                                  |
| Cần type-safety end-to-end             | Aggregation phức tạp nhiều bảng con (`groupBy` của Prisma chỉ 1 bảng)                     |
| Upsert, createMany, nested write       | Keyset pagination trên nhiều cột, `FOR UPDATE SKIP LOCKED`, upsert hàng loạt với `unnest` |
|                                        | Bất kỳ query nào bạn đã phải viết `include` lồng 3 cấp rồi lọc/sort ở JS                  |

Quy tắc đội: **raw SQL nằm trong repository/service, không rải ra controller; mỗi raw query có tên, có comment mục đích, có test e2e.**

---

## Tuần 11 · Drizzle và TypeORM QueryBuilder — cùng SQL, khác vỏ

### 11.1 Drizzle: schema và query builder

Drizzle **là SQL viết bằng TypeScript**; mọi thứ ở file 01–03 áp dụng 1:1.

**Bối cảnh:** khai báo bảng `products` của schema mẫu bằng Drizzle (mỗi cột TypeScript map sang một cột SQL, tên snake_case ghi trong chuỗi), rồi viết lại query "product theo brand kèm giá thấp nhất" ở §10.2. Giả sử `skus` đã khai báo tương tự với cột `productId` map sang `product_id`.

```ts
// schema
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    brandId: uuid("brand_id").notNull(),
    basePrice: numeric("base_price", { precision: 12, scale: 2 }).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("products_brand_idx").on(t.brandId),
    index("products_published_idx")
      .on(t.publishedAt.desc())
      .where(sql`${t.deletedAt} IS NULL`),
  ],
);

// query: đọc y như SQL
const minPrice = sql<string>`min(${skus.price})`.as("min_price");
const rows = await db
  .select({ id: products.id, name: products.name, minPrice })
  .from(products)
  .leftJoin(skus, and(eq(skus.productId, products.id), isNull(skus.deletedAt)))
  .where(and(isNull(products.deletedAt), inArray(products.brandId, brandIds)))
  .groupBy(products.id)
  .orderBy(desc(products.createdAt), desc(products.id))
  .limit(20);
```

Để ý `.leftJoin(table, condition)`: điều kiện lọc bảng con nằm trong ON, đúng như bài học LEFT JOIN. Drizzle không "giấu" điều gì; nếu bạn viết sai SQL, Drizzle sinh ra SQL sai y hệt.

### 11.2 Drizzle `sql` template cho phần builder không cover

```ts
// window function, CTE
const ranked = db.$with("ranked").as(
  db
    .select({
      productId: skus.productId,
      price: skus.price,
      rn: sql<number>`row_number() over (partition by ${skus.productId} order by ${skus.price})`.as(
        "rn",
      ),
    })
    .from(skus),
);
const cheapest = await db
  .with(ranked)
  .select()
  .from(ranked)
  .where(eq(ranked.rn, 1));

// raw hoàn toàn, vẫn tham số hoá
await db.execute(sql`
  UPDATE skus SET stock = stock - ${qty} WHERE id = ${skuId} AND stock >= ${qty} RETURNING stock
`);
```

Drizzle relational queries (`db.query.products.findMany({ with: { skus: true } })`) là lớp tiện ích tương tự Prisma `include`, dùng cho CRUD; báo cáo thì dùng builder / sql.

### 11.3 Drizzle migrations

`drizzle-kit generate` sinh SQL migration từ diff schema; **đọc file SQL sinh ra trước khi apply**, đặc biệt `CREATE INDEX` (thêm `CONCURRENTLY` tay nếu bảng lớn) và `ALTER COLUMN ... SET NOT NULL`.

### 11.4 TypeORM QueryBuilder — thứ bạn đã dùng, giờ hiểu nó

**Bối cảnh:** entity `Product` có `@OneToMany(() => Sku, s => s.product) skus`, entity `Sku` có `@ManyToOne(() => Product) product` và cột `deletedAt`. Cùng query "product theo brand kèm giá thấp nhất" như hai mục trên. TypeORM dùng tên property (`p.deletedAt`) và tự dịch sang tên cột.

```ts
repo
  .createQueryBuilder("p")
  .leftJoin("p.skus", "s", "s.deletedAt IS NULL") // điều kiện trong ON
  .select(["p.id", "p.name"])
  .addSelect("MIN(s.price)", "minPrice")
  .where("p.deletedAt IS NULL")
  .andWhere("p.brandId IN (:...brandIds)", { brandIds }) // tham số hoá
  .groupBy("p.id")
  .orderBy("p.createdAt", "DESC")
  .addOrderBy("p.id", "DESC")
  .limit(20)
  .getRawMany();
```

`getMany()` map về entity (và tự khử nhân dòng), nhưng **`limit()` bị áp sai khi có join 1-n** vì nó là LIMIT của SQL, đếm dòng đã nhân, không đếm entity. Dùng `take()` (TypeORM chạy 2 query) hoặc `getRawMany()`. Đây là lỗi kinh điển mà dev TypeORM gặp và không hiểu tại sao; giờ bạn hiểu: nhân dòng.

`dataSource.query(sql, params)` là raw thuần, tham số `$1, $2`.

---

## Tuần 12 · Migration, test, và đóng gói thành endpoint thật

### 12.1 Đưa index vào migration

ORM khai được index thường (`@@index`, `index().on()`), nhưng partial / expression / GIN thường phải viết SQL tay trong file migration:

```sql
-- migrations/20260930_product_listing_indexes.sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS products_published_active_idx
  ON products (published_at DESC, id DESC) WHERE deleted_at IS NULL;
```

`CONCURRENTLY` không chạy trong transaction. Prisma Migrate bọc mỗi migration trong transaction → tách riêng file chỉ chứa lệnh này và chạy thủ công trên production, hoặc dùng cơ chế tắt transaction của tool bạn dùng (Drizzle: `-- custom` migration; Flyway: `flyway.executeInTransaction=false`).

### 12.2 Test SQL: chạy trên DB thật, không mock

Mock ORM cho raw query là vô nghĩa (bạn test chuỗi SQL, không test hành vi). Dùng Postgres thật trong Docker / Testcontainers, seed nhỏ cho từng test:

```ts
describe('ProductListingRepository', () => {
  beforeEach(async () => {
    await seed({ products: 3, skusPerProduct: [2, 0, 3], reviewsPerProduct: [5, 0, 1] });
  });

  it('trả về product không có sku với minPrice null', ...);            // test LEFT JOIN
  it('không nhân đôi tổng stock khi product có nhiều review', ...);    // test lỗi nhân dòng
  it('trang 2 keyset không lặp dòng của trang 1', ...);
  it('hai request trừ stock=1 đồng thời chỉ một thành công', async () => {
    const results = await Promise.allSettled([buy(sku, 1), buy(sku, 1)]);   // test race
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  });
});
```

Mỗi bẫy ở file 01–03 tương ứng một test. Đây là cách biến kiến thức thành lưới an toàn cho cả team.

### 12.3 Đồ án cuối khoá: endpoint báo cáo doanh thu

Xây trong một project NestJS bất kỳ (tạo mới bằng `nest new` cũng được) nối vào DB schema mẫu:

`GET /admin/reports/revenue?from=&to=&groupBy=day|week|month&tz=Asia/Ho_Chi_Minh`

Yêu cầu:

1. Query bằng raw SQL (hoặc Drizzle builder), một round-trip, dùng `generate_series` để không thiếu bucket trống, `FILTER` để tách trạng thái, window để có `cumulative` và `growth_pct`.
2. Điều kiện động tham số hoá; `groupBy` và `tz` qua whitelist.
3. Validate cả input lẫn output (Zod hoặc class-validator).
4. Migration thêm partial index `orders (created_at) WHERE deleted_at IS NULL AND status = 'delivered'` bằng `CONCURRENTLY`.
5. `EXPLAIN ANALYZE` trước/sau index, dán vào PR description.
6. Test e2e: bucket trống hiện 0, múi giờ đúng ở ranh giới nửa đêm, không nhân dòng khi đơn có nhiều item.
7. Cache kết quả 60 giây (Redis hoặc in-memory), key theo toàn bộ tham số.

Làm xong đồ án này, bạn đã thực hiện đủ vòng đời một tính năng BE nặng SQL: thiết kế query → index → an toàn → test → vận hành.

### 12.4 Checklist review SQL trước khi tạo PR

- [ ] Không có chuỗi nối vào SQL; identifier động qua whitelist.
- [ ] Mọi bảng có soft delete đều có `deleted_at IS NULL` (cả trong ON của LEFT JOIN).
- [ ] Không JOIN hai bảng 1-n rồi aggregate; gom trước bằng CTE.
- [ ] `COUNT(*)::int`, tiền `numeric`, ngày có múi giờ rõ ràng.
- [ ] ORDER BY có khoá phụ duy nhất; phân trang trên bảng lớn dùng keyset.
- [ ] Có `EXPLAIN ANALYZE` với dữ liệu cỡ production cho query mới; index đi kèm migration.
- [ ] Transaction ngắn, không I/O ngoài, có timeout; retry cho 40001/40P01 nếu áp dụng.
- [ ] Có test e2e cho từng bẫy đã biết.

**Tiếp theo**: [05-exercises.md](05-exercises.md) để luyện, [06-common-mistakes.md](06-common-mistakes.md) để tự review.
