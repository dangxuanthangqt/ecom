# SQL Mastery — giáo trình cho dev FE chuyển sang BE

> Viết cho: dev FE đã biết một framework BE (NestJS, Express…), dùng ORM kiểu TypeORM / Prisma ổn, nhưng lúng túng khi phải viết SQL tay hoặc dùng ORM thiên về query như Drizzle / knex / raw query.
> Mục tiêu: sau 12 tuần, bạn đọc được bất kỳ query nào trong dự án, tự viết được query báo cáo / phân trang / khoá tồn kho, đọc được `EXPLAIN ANALYZE` và biết vì sao query chậm.

Tài liệu này **tự chứa**: mọi ví dụ và bài tập chạy trên một schema mẫu đi kèm ([schema.sql](schema.sql)), là mô hình bán hàng thu nhỏ với 12 bảng. Bạn không cần bất kỳ dự án nào khác để học. Khi vào dự án thật, bạn chỉ cần "đổi tên bảng".

## Schema mẫu dùng xuyên suốt

```
roles ──< users ──< orders ──< order_items >── skus >── products >── brands
                     │                                    │
                     └──< cart_items >── skus              ├──< product_categories >── categories (cây tự tham chiếu)
users ──< reviews >── products                             └──< reviews
users ──< messages >── users
```

| Bảng                 | Ý nghĩa                                                                                                         | Điểm đáng chú ý cho việc học            |
| -------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `users`              | người dùng, có `role_id`, `avatar` nullable, `deleted_at` (soft delete)                                         | NULL, partial unique index trên email   |
| `roles`              | admin / seller / customer                                                                                       |                                         |
| `brands`             | thương hiệu                                                                                                     |                                         |
| `categories`         | danh mục, `parent_id` trỏ về chính nó                                                                           | self-join, recursive CTE                |
| `products`           | `base_price`, `list_price` (numeric), `attributes` jsonb, `images` text[], `published_at` nullable, soft delete | JSONB, array, CASE                      |
| `product_categories` | bảng nối n-n                                                                                                    | JOIN nhân dòng, `string_agg`            |
| `skus`               | biến thể của product, có `price`, `stock`, `version`                                                            | 1-n, tồn kho, lock, race condition      |
| `orders`             | đơn hàng, `status`, soft delete                                                                                 | GROUP BY, báo cáo theo thời gian        |
| `order_items`        | snapshot giá & tên lúc mua, `sku_id` nullable                                                                   | NOT IN bẫy NULL, doanh thu              |
| `cart_items`         | giỏ hàng, khoá chính `(user_id, sku_id)`                                                                        | upsert                                  |
| `reviews`            | đánh giá 1–5 sao                                                                                                | aggregate, nhân dòng khi join cùng skus |
| `messages`           | tin nhắn 1-1, `read_at` nullable                                                                                | DISTINCT ON, hội thoại gần nhất         |

### Các mối quan hệ, nói bằng lời

Đọc kỹ mục này một lần; mọi ví dụ về sau đều giả định bạn đã nắm nó.

| Quan hệ                                     | Kiểu              | Cột nối                                        | Ý nghĩa nghiệp vụ                                                                                                                                                                                                                 |
| ------------------------------------------- | ----------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `products` → `skus`                         | 1-n               | `skus.product_id`                              | Một product (ví dụ "Áo thun A") có nhiều biến thể để bán: size S, M, L. Mỗi biến thể là một dòng `skus` với giá và tồn kho riêng. Product có thể chưa có sku nào (mới tạo, còn nháp).                                             |
| `brands` → `products`                       | 1-n               | `products.brand_id`                            | Mỗi product thuộc đúng một brand.                                                                                                                                                                                                 |
| `products` ↔ `categories`                  | n-n               | bảng nối `product_categories`                  | Một product có thể nằm trong nhiều danh mục, một danh mục có nhiều product.                                                                                                                                                       |
| `categories` → `categories`                 | cây               | `categories.parent_id`                         | Danh mục cha–con nhiều cấp: "Thời trang" → "Áo" → "Áo thun". `parent_id` NULL là danh mục gốc.                                                                                                                                    |
| `users` → `orders`                          | 1-n               | `orders.user_id`                               | Một user đặt nhiều đơn. Mỗi đơn có một `status` đi từ pending → paid → shipped → delivered, hoặc cancelled / returned.                                                                                                            |
| `orders` → `order_items`                    | 1-n               | `order_items.order_id`                         | Một đơn có nhiều dòng hàng. Mỗi dòng ghi lại **bản chụp** tên và giá tại thời điểm mua (`product_name`, `unit_price`), vì giá trong `skus` có thể đổi sau này. Doanh thu của một đơn = tổng `unit_price × quantity` của các dòng. |
| `skus` → `order_items`                      | 1-n, nullable     | `order_items.sku_id`                           | Dòng hàng trỏ về sku đã mua. Nếu sku bị xoá cứng, cột này thành NULL nhưng dòng hàng vẫn còn (lịch sử mua không mất).                                                                                                             |
| `users` ↔ `skus`                           | n-n có thuộc tính | `cart_items(user_id, sku_id, quantity)`        | Giỏ hàng: mỗi cặp user–sku chỉ có một dòng, số lượng cộng dồn.                                                                                                                                                                    |
| `products` → `reviews`, `users` → `reviews` | 1-n               | `reviews.product_id`, `reviews.user_id`        | Một user đánh giá một product 1–5 sao. Một product có nhiều review.                                                                                                                                                               |
| `users` → `messages` (hai lần)              | 1-n               | `messages.from_user_id`, `messages.to_user_id` | Tin nhắn 1-1. `read_at` NULL nghĩa là chưa đọc.                                                                                                                                                                                   |

Soft delete: các bảng `users`, `products`, `skus`, `orders`, `brands`, `categories` có cột `deleted_at`. NULL = còn dùng; có giá trị = đã xoá nhưng vẫn giữ dòng. Mọi query "đọc" phải lọc `deleted_at IS NULL`, và đây là nguồn lỗi số một trong dự án thật.

Seed đi kèm tạo ~5.000 user, 2.000 product, 50.000 đơn, 150.000 dòng order_items: đủ lớn để `EXPLAIN` cho thấy sự khác biệt khi thêm index.

## Chuẩn bị môi trường (30 phút, làm một lần)

Làm theo [SETUP.md](SETUP.md): dựng Postgres bằng `docker compose up -d` ngay trong thư mục này (cổng 5433, tự nạp schema + seed), kết nối bằng DBeaver / psql / VS Code, và quy trình đối chiếu từng ví dụ trong tài liệu với kết quả thật. Không cần cài Postgres trên máy.

## Lộ trình 12 tuần

| Tuần       | Giai đoạn                | File                                                           | Chủ đề chính                                                                                                                                      | Đầu ra bạn phải làm được                                                                                      |
| ---------- | ------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 0          | Tư duy                   | [00-mindset-orm-to-sql.md](00-mindset-orm-to-sql.md)           | Vì sao dev ORM yếu SQL; tư duy tập hợp; thứ tự thực thi logic của SELECT                                                                          | Dịch được một `find({ relations })` của ORM sang JOIN bằng tay                                                |
| 1–3        | Nền tảng                 | [01-foundation.md](01-foundation.md)                           | SELECT / WHERE / NULL, 5 loại JOIN, GROUP BY / HAVING, subquery, kiểu dữ liệu, ràng buộc, INSERT/UPDATE/DELETE, transaction                       | Viết đúng 100% bài tập mức 1 không cần nhìn đáp án                                                            |
| 4–6        | Trung cấp                | [02-intermediate.md](02-intermediate.md)                       | CTE, window function, top-N per group, EXISTS / anti-join, LATERAL, JSONB & array, upsert, keyset pagination, ngày giờ                            | Viết được API "danh sách sản phẩm kèm giá thấp nhất, rating trung bình, phân trang cursor" bằng một query     |
| 7–9        | Nâng cao                 | [03-advanced.md](03-advanced.md)                               | Index (partial, composite, GIN), EXPLAIN ANALYZE, isolation level, MVCC, lock, deadlock, SKIP LOCKED, recursive CTE, materialized view, partition | Tối ưu được một query từ Seq Scan sang Index Scan và giải thích được vì sao; xử lý race condition trừ tồn kho |
| 10–12      | Thực chiến               | [04-sql-in-nestjs.md](04-sql-in-nestjs.md)                     | Prisma `$queryRaw` an toàn, Drizzle, TypeORM QueryBuilder, migration zero-downtime, test SQL                                                      | Xây một endpoint báo cáo hoàn chỉnh: query, index, test, cache                                                |
| xuyên suốt | Bài tập                  | [05-exercises.md](05-exercises.md)                             | 30 bài trên schema mẫu, 4 mức, có đáp án                                                                                                          | Làm theo tuần tương ứng                                                                                       |
| xuyên suốt | Review                   | [06-common-mistakes.md](06-common-mistakes.md)                 | 20 lỗi senior hay bắt khi review SQL của dev từ ORM sang                                                                                          | Tự review query theo checklist này trước khi tạo PR                                                           |
| cuối       | Tài nguyên & tự đánh giá | [07-resources-and-checklist.md](07-resources-and-checklist.md) | Sách, site luyện tập, tool xem plan; checklist "đã master chưa"                                                                                   | Tick được ≥ 80% checklist                                                                                     |

## Cách học để không bỏ cuộc

1. **Mỗi ngày 45–60 phút, có bàn phím.** Đọc SQL mà không gõ thì một tuần sau quên hết. Mở psql song song với tài liệu.
2. **Mỗi tuần một "mini-deliverable".** Không phải bài tập trên giấy, mà là một query / một endpoint / một migration chạy được.
3. **Luôn hỏi "ORM sẽ sinh ra SQL gì?"** Bật log query của ORM bạn đang dùng và đọc SQL nó sinh ra cho mỗi thao tác quen thuộc. Đây là cách nhanh nhất để nối kiến thức ORM sẵn có sang SQL.
4. **Từ tuần 7, mọi query bạn viết đều phải qua `EXPLAIN ANALYZE`** trước khi coi là xong.
5. **Đọc [06-common-mistakes.md](06-common-mistakes.md) ngay tuần 1**, rồi đọc lại mỗi khi xong một giai đoạn.

## Quy ước trong tài liệu

- Mọi SQL là **PostgreSQL 15+**. Chỗ nào MySQL khác biệt sẽ ghi chú.
- Tên bảng, cột dạng `snake_case` không nháy, theo chuẩn Postgres. Nếu dự án của bạn dùng ORM sinh tên `camelCase` (Prisma mặc định), phải bọc nháy kép: `"createdAt"`. Chi tiết ở file 04.
- Mỗi chủ đề có 3 phần: **Khái niệm ngắn → Ví dụ trên schema mẫu → Bẫy thường gặp**. Bài tập nằm tập trung ở file 05.
- Ví dụ nào cần biết trước quan hệ giữa các bảng hoặc tình huống nghiệp vụ sẽ mở đầu bằng dòng **Bối cảnh:**. Nếu đọc một ví dụ mà không hiểu vì sao lại join hai bảng đó, quay lại bảng "Các mối quan hệ, nói bằng lời" ở trên.
