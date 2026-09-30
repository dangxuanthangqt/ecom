# 05 · Bài tập thực chiến trên schema mẫu

30 bài, 4 mức, chạy trực tiếp trên DB tạo từ [schema.sql](schema.sql) (`SET search_path TO shop`). Làm theo tuần tương ứng. **Tự viết trước, chạy, so kết quả, rồi mới mở đáp án.** Đáp án là một cách làm, không phải cách duy nhất; nếu query của bạn ra cùng kết quả và plan không tệ hơn, nó đúng.

Nhắc lại schema: `users`, `roles`, `brands`, `categories` (cây qua `parent_id`), `products`, `product_categories`, `skus`, `orders`, `order_items` (snapshot, `sku_id` nullable), `cart_items`, `reviews`, `messages`. Các bảng `users`, `products`, `skus`, `orders`, `brands`, `categories` có `deleted_at` (soft delete).

---

## Mức 1 · Nền tảng (tuần 1–3)

### Bài 1. Sản phẩm đã publish, mới nhất

20 product đã publish, chưa xoá, mới nhất trước; trả về id, name, base_price, published_at.

<details><summary>Đáp án</summary>

```sql
SELECT id, name, base_price, published_at
FROM products
WHERE deleted_at IS NULL AND published_at IS NOT NULL
ORDER BY published_at DESC, id DESC
LIMIT 20;
```

Điểm chấm: có khoá phụ `id` trong ORDER BY.

</details>

### Bài 2. Giảm giá

Với mỗi product, tính phần trăm giảm từ `list_price` xuống `base_price`, làm tròn, 0 nếu không giảm; chỉ lấy product giảm ≥ 20%.

<details><summary>Đáp án</summary>

```sql
SELECT id, name,
  CASE WHEN list_price > base_price
       THEN round((1 - base_price / list_price) * 100) ELSE 0 END AS discount_pct
FROM products
WHERE deleted_at IS NULL
  AND list_price > 0
  AND (1 - base_price / list_price) * 100 >= 20;
```

Điểm chấm: không dùng alias `discount_pct` trong WHERE (thứ tự thực thi); chặn chia cho 0.

</details>

### Bài 3. User chưa có avatar theo role

Số user (chưa xoá) chưa có avatar, nhóm theo tên role.

<details><summary>Đáp án</summary>

```sql
SELECT r.name AS role, COUNT(*) AS no_avatar
FROM users u JOIN roles r ON r.id = u.role_id
WHERE u.deleted_at IS NULL AND u.avatar IS NULL
GROUP BY r.name;
```

</details>

### Bài 4. Product và số SKU (kể cả 0)

Mỗi product: số sku chưa xoá, tổng stock. Product không có sku vẫn phải xuất hiện với 0. (Seed cố ý để ~1/13 product không có sku.)

<details><summary>Đáp án</summary>

```sql
SELECT p.id, p.name, COUNT(s.id) AS sku_count, COALESCE(SUM(s.stock), 0) AS total_stock
FROM products p
LEFT JOIN skus s ON s.product_id = p.id AND s.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name;
```

Điểm chấm: điều kiện `s.deleted_at` trong ON; `COUNT(s.id)` chứ không `COUNT(*)`. Kiểm tra: `... HAVING COUNT(s.id) = 0` phải trả về dòng.

</details>

### Bài 5. Product theo category kèm tên cha

Tên product, tên category, tên category cha (NULL nếu là gốc).

<details><summary>Đáp án</summary>

```sql
SELECT p.name AS product, c.name AS category, parent.name AS parent_category
FROM products p
JOIN product_categories pc ON pc.product_id = p.id
JOIN categories c ON c.id = pc.category_id
LEFT JOIN categories parent ON parent.id = c.parent_id
WHERE p.deleted_at IS NULL;
```

</details>

### Bài 6. Đơn theo trạng thái trong 30 ngày

Bối cảnh: `orders` → `order_items` 1-n, doanh thu một đơn = tổng `unit_price × quantity` các dòng của nó. Số đơn và tổng giá trị (`unit_price × quantity` của items) theo status, 30 ngày gần nhất.

<details><summary>Đáp án</summary>

```sql
SELECT o.status, COUNT(DISTINCT o.id) AS orders, SUM(i.unit_price * i.quantity) AS revenue
FROM orders o
JOIN order_items i ON i.order_id = o.id
WHERE o.deleted_at IS NULL AND o.created_at >= now() - interval '30 days'
GROUP BY o.status
ORDER BY revenue DESC;
```

Điểm chấm: `COUNT(DISTINCT o.id)` vì join items nhân dòng. So với `SELECT status, COUNT(*) FROM orders WHERE ...` để tự kiểm.

</details>

### Bài 7. Sản phẩm còn hàng

Product có ít nhất một sku stock > 0. Viết bằng EXISTS.

<details><summary>Đáp án</summary>

```sql
SELECT p.id, p.name
FROM products p
WHERE p.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM skus s WHERE s.product_id = p.id AND s.deleted_at IS NULL AND s.stock > 0);
```

</details>

### Bài 8. SKU chưa từng được bán

Bối cảnh: `order_items.sku_id` trỏ về sku đã mua, nullable vì sku có thể bị xoá cứng. SKU chưa xuất hiện trong bất kỳ `order_items` nào. Giải thích vì sao không dùng `NOT IN`.

<details><summary>Đáp án</summary>

```sql
SELECT s.id, s.sku_code
FROM skus s
WHERE s.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM order_items i WHERE i.sku_id = s.id);
```

`order_items.sku_id` nullable (`ON DELETE SET NULL`) → chỉ cần một dòng NULL là `NOT IN` trả về 0 dòng. Thử: `DELETE FROM skus WHERE id = (SELECT sku_id FROM order_items LIMIT 1);` rồi chạy phiên bản NOT IN.

</details>

### Bài 9. Trừ tồn kho atomic

Viết một câu UPDATE trừ `n` khỏi stock của sku, không bao giờ âm, trả về stock mới. Không dùng SELECT trước.

<details><summary>Đáp án</summary>

```sql
UPDATE skus SET stock = stock - $2
WHERE id = $1::uuid AND deleted_at IS NULL AND stock >= $2
RETURNING stock;
```

0 dòng → hết hàng. Ràng buộc `CHECK (stock >= 0)` là lưới an toàn thứ hai.

</details>

### Bài 10. Xoá mềm brand

Soft delete một brand và mọi product của nó trong một transaction.

<details><summary>Đáp án</summary>

```sql
BEGIN;
UPDATE products SET deleted_at = now() WHERE brand_id = $1 AND deleted_at IS NULL;
UPDATE brands   SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL;
COMMIT;
```

</details>

---

## Mức 2 · Trung cấp (tuần 4–6)

### Bài 11. Danh sách sản phẩm cho trang listing

Bối cảnh: hai bảng con độc lập cùng treo dưới `products`: `skus` (giá, tồn) và `reviews` (rating). Mỗi product: min_price, total_stock, avg_rating (2 số lẻ), review_count. Không được nhân dòng. Tự kiểm bằng một product có ≥ 2 sku và ≥ 2 review.

<details><summary>Đáp án</summary>

```sql
WITH s AS (
  SELECT product_id, MIN(price) AS min_price, SUM(stock) AS total_stock
  FROM skus WHERE deleted_at IS NULL GROUP BY product_id
), r AS (
  SELECT product_id, round(AVG(rating), 2) AS avg_rating, COUNT(*) AS review_count
  FROM reviews GROUP BY product_id
)
SELECT p.id, p.name, s.min_price, COALESCE(s.total_stock, 0) AS total_stock,
       COALESCE(r.avg_rating, 0) AS avg_rating, COALESCE(r.review_count, 0) AS review_count
FROM products p
LEFT JOIN s ON s.product_id = p.id
LEFT JOIN r ON r.product_id = p.id
WHERE p.deleted_at IS NULL AND p.published_at IS NOT NULL;
```

</details>

### Bài 12. SKU rẻ nhất mỗi product, hai cách

(a) `DISTINCT ON`, (b) window `ROW_NUMBER`.

<details><summary>Đáp án</summary>

```sql
-- a
SELECT DISTINCT ON (product_id) product_id, id, sku_code, price
FROM skus WHERE deleted_at IS NULL
ORDER BY product_id, price, id;
-- b
SELECT * FROM (
  SELECT product_id, id, sku_code, price,
         ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY price, id) AS rn
  FROM skus WHERE deleted_at IS NULL
) t WHERE rn = 1;
```

</details>

### Bài 13. 3 đơn gần nhất của mỗi user (LATERAL)

Bối cảnh: trang admin liệt kê user (chưa xoá) kèm tối đa 3 đơn gần nhất của mỗi người; user chưa có đơn vẫn phải hiện. Trả về email, order_id, status, created_at.

<details><summary>Đáp án</summary>

```sql
SELECT u.id, u.email, o.id AS order_id, o.status, o.created_at
FROM users u
LEFT JOIN LATERAL (
  SELECT id, status, created_at FROM orders
  WHERE user_id = u.id AND deleted_at IS NULL
  ORDER BY created_at DESC LIMIT 3
) o ON true
WHERE u.deleted_at IS NULL;
```

</details>

### Bài 14. Doanh thu theo ngày, có ngày trống, múi giờ VN

30 ngày gần nhất, đơn delivered, ngày không có đơn hiện 0, cột cumulative.

<details><summary>Đáp án</summary>

```sql
WITH days AS (
  SELECT generate_series((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 29,
                         (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, '1 day')::date AS d
), rev AS (
  SELECT (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS d, SUM(i.unit_price * i.quantity) AS revenue
  FROM orders o JOIN order_items i ON i.order_id = o.id
  WHERE o.status = 'delivered' AND o.deleted_at IS NULL AND o.created_at >= now() - interval '31 days'
  GROUP BY 1
)
SELECT days.d, COALESCE(rev.revenue, 0) AS revenue,
       SUM(COALESCE(rev.revenue, 0)) OVER (ORDER BY days.d) AS cumulative
FROM days LEFT JOIN rev ON rev.d = days.d
ORDER BY days.d;
```

</details>

### Bài 15. Tăng trưởng đơn theo tháng so với tháng trước

<details><summary>Đáp án</summary>

```sql
WITH m AS (
  SELECT date_trunc('month', created_at)::date AS month, COUNT(*) AS orders
  FROM orders WHERE deleted_at IS NULL GROUP BY 1
)
SELECT month, orders, LAG(orders) OVER (ORDER BY month) AS prev,
       round(100.0 * (orders - LAG(orders) OVER (ORDER BY month)) / NULLIF(LAG(orders) OVER (ORDER BY month), 0), 1) AS growth_pct
FROM m ORDER BY month;
```

</details>

### Bài 16. Keyset pagination cho listing

Bối cảnh: listing cuộn vô hạn; client gửi lên `(published_at, id)` của dòng cuối cùng đã thấy. Trang tiếp theo sau cursor `(published_at, id)`, sắp `published_at DESC, id DESC`, 20 dòng. Thêm cột `total` là tổng số product thoả điều kiện (không tính cursor) trong cùng một câu lệnh.

<details><summary>Đáp án</summary>

```sql
WITH base AS (
  SELECT id, name, published_at FROM products
  WHERE deleted_at IS NULL AND published_at IS NOT NULL
), total AS (SELECT COUNT(*)::int AS total FROM base)
SELECT b.id, b.name, b.published_at, t.total
FROM base b CROSS JOIN total t
WHERE (b.published_at, b.id) < ($1::timestamptz, $2::uuid)
ORDER BY b.published_at DESC, b.id DESC
LIMIT 20;
```

Bẫy: `COUNT(*) OVER ()` đặt trong query có điều kiện cursor sẽ đếm "còn lại", không phải tổng. Vì thế phải đếm ở CTE riêng.

</details>

### Bài 17. Thêm vào giỏ (upsert)

Thêm sku vào giỏ của user; đã có thì cộng dồn quantity.

<details><summary>Đáp án</summary>

```sql
INSERT INTO cart_items (user_id, sku_id, quantity)
VALUES ($1, $2, $3)
ON CONFLICT (user_id, sku_id)
DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity, updated_at = now()
RETURNING *;
```

</details>

### Bài 18. Tìm product theo thuộc tính trong JSONB

Product có màu `red` và có size `L`.

<details><summary>Đáp án</summary>

```sql
SELECT id, name
FROM products
WHERE deleted_at IS NULL
  AND attributes @> '{"color": ["red"], "size": ["L"]}';
```

`@>` với mảng trong jsonb là "chứa tập con", nên `["red"]` khớp `["red","blue"]`. Cần `CREATE INDEX ... USING gin (attributes)` để nhanh; so `EXPLAIN` trước/sau.

</details>

### Bài 19. Hội thoại gần nhất của user

Bối cảnh: `messages` là tin nhắn 1-1 với `from_user_id`, `to_user_id`; "người đối thoại" của X trong một tin là phía còn lại. Màn hình inbox cần mỗi người đối thoại một dòng. Với user X, mỗi người đối thoại một dòng: tin cuối cùng, thời gian, số tin chưa đọc gửi tới X.

<details><summary>Đáp án</summary>

```sql
WITH msgs AS (
  SELECT m.*, CASE WHEN m.from_user_id = $1 THEN m.to_user_id ELSE m.from_user_id END AS peer
  FROM messages m WHERE m.from_user_id = $1 OR m.to_user_id = $1
), last AS (
  SELECT DISTINCT ON (peer) peer, content, created_at
  FROM msgs ORDER BY peer, created_at DESC
), unread AS (
  SELECT from_user_id AS peer, COUNT(*) AS unread
  FROM messages WHERE to_user_id = $1 AND read_at IS NULL GROUP BY 1
)
SELECT l.peer, u.name, l.content, l.created_at, COALESCE(un.unread, 0) AS unread
FROM last l
JOIN users u ON u.id = l.peer
LEFT JOIN unread un ON un.peer = l.peer
ORDER BY l.created_at DESC;
```

</details>

### Bài 20. Pivot trạng thái đơn theo tháng

Mỗi tháng một dòng, cột: delivered, cancelled, returned, other.

<details><summary>Đáp án</summary>

```sql
SELECT date_trunc('month', created_at)::date AS month,
  COUNT(*) FILTER (WHERE status = 'delivered') AS delivered,
  COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
  COUNT(*) FILTER (WHERE status = 'returned')  AS returned,
  COUNT(*) FILTER (WHERE status NOT IN ('delivered','cancelled','returned')) AS other
FROM orders WHERE deleted_at IS NULL
GROUP BY 1 ORDER BY 1;
```

</details>

---

## Mức 3 · Nâng cao (tuần 7–9)

### Bài 21. Index cho bài 13

Chạy `EXPLAIN ANALYZE` bài 13. Đề xuất một index, tạo, chạy lại, ghi lại thay đổi node và thời gian.

<details><summary>Đáp án</summary>

```sql
CREATE INDEX orders_user_created_active_idx ON orders (user_id, created_at DESC) WHERE deleted_at IS NULL;
```

Kỳ vọng: node bên trong LATERAL từ `Seq Scan` + `Sort` (hoặc Bitmap trên `orders_user_idx` + Sort) thành `Index Scan Backward` với `LIMIT 3`, `loops` = số user, mỗi loop vài chục micro giây.

</details>

### Bài 22. Vì sao index không được dùng

Tạo `CREATE INDEX t ON orders (deleted_at, status);`. Query `WHERE status = 'delivered'` không dùng index đó. Giải thích và đề xuất index đúng.

<details><summary>Đáp án</summary>

Left-most prefix: index `(deleted_at, status)` chỉ hữu ích khi WHERE có `deleted_at`. Query chỉ có `status` → không dùng. Vì `deleted_at` gần như luôn là `IS NULL`, cột đó nên thành điều kiện partial thay vì cột index:

```sql
CREATE INDEX orders_status_active_idx ON orders (status, created_at DESC) WHERE deleted_at IS NULL;
```

</details>

### Bài 23. Checkout nhiều SKU không deadlock

Bối cảnh: một đơn có nhiều sku, mỗi sku trừ một lượng khác nhau; hai khách có thể đặt cùng lúc hai đơn chứa cùng các sku. Viết transaction trừ tồn kho cho danh sách `(sku_id, qty)` sao cho hai checkout có cùng 2 sku theo thứ tự ngược nhau không deadlock, và không bán quá tồn.

<details><summary>Đáp án</summary>

```sql
BEGIN;
-- khoá theo thứ tự id cố định
SELECT id, stock FROM skus
WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL
ORDER BY id
FOR NO KEY UPDATE;
-- app kiểm tra đủ hàng cho từng sku; thiếu → ROLLBACK
UPDATE skus s SET stock = s.stock - v.qty
FROM unnest($1::uuid[], $2::int[]) AS v(id, qty)
WHERE s.id = v.id AND s.stock >= v.qty;
-- rowCount phải bằng số sku, không thì ROLLBACK
COMMIT;
```

Hoặc bỏ SELECT, chỉ dùng UPDATE với `unnest` đã `ORDER BY id` trong subquery và kiểm tra rowCount. Tái hiện deadlock bằng 2 cửa sổ psql trước, rồi áp `ORDER BY id` để thấy nó biến mất.

</details>

### Bài 24. Toàn bộ sản phẩm trong cây danh mục

Cho một category gốc, lấy product thuộc nó hoặc bất kỳ con cháu nào, kèm độ sâu của category chứa nó.

<details><summary>Đáp án</summary>

```sql
WITH RECURSIVE tree AS (
  SELECT id, 0 AS depth, ARRAY[id] AS path FROM categories WHERE id = $1
  UNION ALL
  SELECT c.id, t.depth + 1, t.path || c.id
  FROM categories c JOIN tree t ON c.parent_id = t.id
  WHERE c.deleted_at IS NULL AND NOT c.id = ANY(t.path)
)
SELECT DISTINCT ON (p.id) p.id, p.name, t.depth
FROM tree t
JOIN product_categories pc ON pc.category_id = t.id
JOIN products p ON p.id = pc.product_id AND p.deleted_at IS NULL
ORDER BY p.id, t.depth;
```

</details>

### Bài 25. Job queue với SKIP LOCKED

Bối cảnh: nhiều worker song song đọc bảng sự kiện, không được lấy trùng, worker chết thì sự kiện phải được lấy lại. Dùng bảng `outbox_events` ở file 03 §8.5. Viết query cho worker lấy 10 event và query đánh dấu đã xử lý. Chạy 2 cửa sổ psql song song (`BEGIN` ở cả hai, không COMMIT) để chứng minh hai worker không lấy trùng.

<details><summary>Đáp án</summary>

```sql
-- lấy (xem file 03 §8.5)
WITH picked AS (
  SELECT id FROM outbox_events
  WHERE processed_at IS NULL AND (locked_at IS NULL OR locked_at < now() - interval '5 minutes')
  ORDER BY created_at LIMIT 10
  FOR UPDATE SKIP LOCKED
)
UPDATE outbox_events e SET locked_at = now(), attempts = e.attempts + 1
FROM picked WHERE e.id = picked.id
RETURNING e.*;

-- xong
UPDATE outbox_events SET processed_at = now() WHERE id = ANY($1::bigint[]);
```

</details>

### Bài 26. Materialized view thống kê sản phẩm

Tạo MV cho bài 11, unique index, lệnh refresh không khoá reader, và nói khi nào refresh.

<details><summary>Đáp án</summary>

Xem file 03 §9.2 (chính là bài 11 bọc trong `CREATE MATERIALIZED VIEW`). Refresh bằng cron mỗi 5 phút hoặc sau batch import; nếu cần realtime thì không dùng MV.

</details>

### Bài 27. Backfill an toàn

Bối cảnh: hiện doanh thu mỗi đơn phải tính lại từ `order_items` mỗi lần; muốn lưu sẵn vào `orders.total_amount` để list đơn nhanh hơn, trên production đang chạy. Thêm cột `orders.total_amount numeric(12,2) NOT NULL` vào bảng giả định 20 triệu dòng, tính từ items, không downtime. Viết các bước SQL.

<details><summary>Đáp án</summary>

```sql
-- 1. thêm nullable (không rewrite bảng)
ALTER TABLE orders ADD COLUMN total_amount numeric(12,2);
-- 2. app bắt đầu ghi cột này cho đơn mới (deploy)
-- 3. backfill theo batch, lặp tới khi 0 dòng
UPDATE orders o SET total_amount = t.total
FROM (
  SELECT i.order_id, SUM(i.unit_price * i.quantity) AS total
  FROM order_items i
  WHERE i.order_id IN (SELECT id FROM orders WHERE total_amount IS NULL LIMIT 5000)
  GROUP BY i.order_id
) t WHERE o.id = t.order_id;
-- 4. ràng buộc không khoá lâu
ALTER TABLE orders ADD CONSTRAINT orders_total_not_null CHECK (total_amount IS NOT NULL) NOT VALID;
ALTER TABLE orders VALIDATE CONSTRAINT orders_total_not_null;
ALTER TABLE orders ALTER COLUMN total_amount SET NOT NULL;   -- PG12+: dùng CHECK đã validate, không quét lại
ALTER TABLE orders DROP CONSTRAINT orders_total_not_null;
```

</details>

---

## Mức 4 · Trong NestJS (tuần 10–12)

### Bài 28. Repository tìm kiếm sản phẩm với filter động

Viết `ProductSearchRepository.search({ q, brandIds, categoryId, minPrice, maxPrice, inStock, sort, cursor })` bằng raw SQL tham số hoá (Prisma `$queryRaw` + `Prisma.sql`, hoặc Drizzle builder). `categoryId` lấy cả con cháu (bài 24), `inStock` dùng EXISTS, `sort` qua whitelist, keyset pagination.

<details><summary>Gợi ý</summary>

Ghép: CTE `tree` (bài 24) chỉ khi có `categoryId`; mảng điều kiện; `orderBy` map từ `{ newest, priceAsc }`; cursor giải mã base64 thành `(value, id)`. Test: mỗi filter một test, một test tổ hợp, một test trang 2 không lặp trang 1.

</details>

### Bài 29. Checkout service không bán quá tồn

Dùng bài 23 trong một transaction có timeout 5s, ném `OutOfStockException` với danh sách sku thiếu, test e2e chạy 2 request song song với `Promise.allSettled` và assert đúng một cái thành công.

### Bài 30. Đồ án: endpoint báo cáo doanh thu

Theo mô tả ở [04-sql-in-nestjs.md](04-sql-in-nestjs.md) mục 12.3. Nộp: PR có migration, EXPLAIN trước/sau, test e2e, cache.

---

## Bảng theo dõi tiến độ

| Bài   | Tuần | Xong | Ghi chú của bạn |
| ----- | ---- | ---- | --------------- |
| 1–5   | 1–2  | [ ]  |                 |
| 6–10  | 2–3  | [ ]  |                 |
| 11–15 | 4–5  | [ ]  |                 |
| 16–20 | 5–6  | [ ]  |                 |
| 21–24 | 7–8  | [ ]  |                 |
| 25–27 | 9    | [ ]  |                 |
| 28    | 10   | [ ]  |                 |
| 29    | 11   | [ ]  |                 |
| 30    | 12   | [ ]  |                 |
