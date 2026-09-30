# 02 · Trung cấp (tuần 4–6)

Mục tiêu: viết được các query "một phát ăn ngay" mà ORM không sinh ra được: top-N mỗi nhóm, running total, phân trang cursor, tìm kiếm trên JSONB, upsert hàng loạt. Đây là giai đoạn phân biệt dev "CRUD" và dev "làm được báo cáo".

Ví dụ chạy trên schema mẫu [schema.sql](schema.sql). Bài tập tương ứng: mức 2 trong [05-exercises.md](05-exercises.md).

Cách đọc file này: mỗi khái niệm có 2–3 ví dụ tăng dần độ khó. Mỗi ví dụ có **Bối cảnh**, câu SQL, một bảng **dữ liệu giả sử** thu nhỏ (3–6 dòng, không phải seed thật) và bảng **kết quả** tương ứng, để bạn tự tính tay trước khi chạy. Mọi câu SQL đều chạy được trên schema thật; chỗ có `$1`, `$2` là tham số truyền từ app.

---

## Tuần 4 · CTE và Window function

### 4.1 CTE (`WITH`) — đặt tên cho bước trung gian

CTE là "biến tạm" trong SQL: đặt tên cho một tập kết quả để dùng ở bước sau. Ba việc hay dùng: gom nhóm từng bảng con trước khi JOIN, xây pipeline nhiều tầng, và ghi dữ liệu theo chuỗi (INSERT/DELETE ... RETURNING rồi dùng tiếp).

#### Ví dụ 1 — gom hai bảng con độc lập rồi mới JOIN

**Bối cảnh:** trang listing cần, cho mỗi product: giá thấp nhất và tổng tồn kho (từ `skus`, 1-n), điểm trung bình và số review (từ `reviews`, cũng 1-n). Tức là **hai** bảng con độc lập cùng treo dưới một product. Đây là tình huống ORM hay sinh 3 query, hoặc bạn tự viết sai bằng một JOIN kép.

```sql
WITH sku_stats AS (
  SELECT product_id, MIN(price) AS min_price, SUM(stock) AS total_stock
  FROM skus
  WHERE deleted_at IS NULL
  GROUP BY product_id
),
review_stats AS (
  SELECT product_id, round(AVG(rating), 2) AS avg_rating, COUNT(*) AS review_count
  FROM reviews
  GROUP BY product_id
)
SELECT p.id, p.name, ss.min_price, COALESCE(ss.total_stock, 0) AS total_stock,
       COALESCE(rs.avg_rating, 0) AS avg_rating, COALESCE(rs.review_count, 0) AS review_count
FROM products p
LEFT JOIN sku_stats ss ON ss.product_id = p.id
LEFT JOIN review_stats rs ON rs.product_id = p.id
WHERE p.deleted_at IS NULL AND p.published_at IS NOT NULL
ORDER BY p.created_at DESC
LIMIT 20;
```

Giả sử product "Áo thun A" có 3 sku và 2 review:

| skus.sku_code | price | stock |
| ------------- | ----- | ----- |
| A-S           | 100   | 5     |
| A-M           | 120   | 10    |
| A-L           | 120   | 0     |

| reviews.id | rating |
| ---------- | ------ |
| 1          | 4      |
| 2          | 2      |

Kết quả:

| name      | min_price | total_stock | avg_rating | review_count |
| --------- | --------- | ----------- | ---------- | ------------ |
| Áo thun A | 100       | 15          | 3.00       | 2            |

Product không có sku hoặc review vẫn xuất hiện nhờ LEFT JOIN, cột tổng về 0 nhờ `COALESCE`.

#### Sai / Đúng — JOIN thẳng rồi GROUP BY

**Sai:**

```sql
SELECT p.id, p.name, MIN(s.price) AS min_price, SUM(s.stock) AS total_stock,
       round(AVG(r.rating), 2) AS avg_rating, COUNT(r.id) AS review_count
FROM products p
LEFT JOIN skus s    ON s.product_id = p.id AND s.deleted_at IS NULL
LEFT JOIN reviews r ON r.product_id = p.id
WHERE p.id = $1
GROUP BY p.id, p.name;
```

Vì sao sai: bảng trung gian sau hai JOIN là **tích** 3 sku × 2 review = 6 dòng. Chạy câu dưới để nhìn tận mắt:

```sql
SELECT s.sku_code, s.stock, r.id AS review_id, r.rating
FROM products p
LEFT JOIN skus s    ON s.product_id = p.id AND s.deleted_at IS NULL
LEFT JOIN reviews r ON r.product_id = p.id
WHERE p.id = $1
ORDER BY s.sku_code, r.id;
```

| sku_code | stock | review_id | rating |
| -------- | ----- | --------- | ------ |
| A-L      | 0     | 1         | 4      |
| A-L      | 0     | 2         | 2      |
| A-M      | 10    | 1         | 4      |
| A-M      | 10    | 2         | 2      |
| A-S      | 5     | 1         | 4      |
| A-S      | 5     | 2         | 2      |

Mỗi sku lặp 2 lần (số review), mỗi review lặp 3 lần (số sku). Kết quả GROUP BY trên bảng này:

| Cột          | Sai             | Đúng                                                |
| ------------ | --------------- | --------------------------------------------------- |
| total_stock  | **30** (15 × 2) | 15                                                  |
| review_count | **6** (2 × 3)   | 2                                                   |
| min_price    | 100             | 100 (MIN không bị ảnh hưởng, nên lỗi khó phát hiện) |
| avg_rating   | 3.00            | 3.00 (AVG cũng "tình cờ" đúng vì lặp đều)           |

**Đúng:** ví dụ 1 ở trên. **Gom từng bảng con trước, rồi mới JOIN** — pattern quan trọng nhất của giai đoạn này. Ghi nhớ: lỗi này không văng exception, MIN/MAX/AVG vẫn đúng, chỉ SUM/COUNT sai, nên thường lọt qua test.

#### Ví dụ 2 — CTE nhiều tầng tham chiếu nhau

**Bối cảnh:** báo cáo theo tháng cho các đơn đã giao: doanh thu, số ngày có đơn, và mỗi tháng đạt bao nhiêu % so với tháng tốt nhất. Cần 3 bước: ngày → tháng → tìm tháng tốt nhất. CTE sau được phép tham chiếu CTE trước.

```sql
WITH daily AS (
  SELECT (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS d,
         SUM(i.unit_price * i.quantity) AS revenue
  FROM orders o JOIN order_items i ON i.order_id = o.id
  WHERE o.status = 'delivered' AND o.deleted_at IS NULL
  GROUP BY 1
),
monthly AS (
  SELECT date_trunc('month', d)::date AS month, SUM(revenue) AS revenue, COUNT(*) AS active_days
  FROM daily
  GROUP BY 1
),
best AS (
  SELECT month, revenue FROM monthly ORDER BY revenue DESC LIMIT 1
)
SELECT m.month, m.revenue, m.active_days,
       round(100.0 * m.revenue / b.revenue, 1) AS pct_of_best
FROM monthly m CROSS JOIN best b
ORDER BY m.month;
```

Giả sử `daily` sau tầng 1:

| d          | revenue |
| ---------- | ------- |
| 2026-07-01 | 100     |
| 2026-07-03 | 300     |
| 2026-08-02 | 250     |
| 2026-08-03 | 250     |
| 2026-08-04 | 100     |

Tầng 2 `monthly` và kết quả cuối (best = tháng 8, 600):

| month      | revenue | active_days | pct_of_best |
| ---------- | ------- | ----------- | ----------- |
| 2026-07-01 | 400     | 2           | 66.7        |
| 2026-08-01 | 600     | 3           | 100.0       |

`best` chỉ có 1 dòng nên `CROSS JOIN` không nhân dòng. Mỗi tầng chỉ làm một việc, đặt tên rõ; khi query sai, bạn `SELECT * FROM monthly` để debug từng tầng.

#### Ví dụ 3 — CTE ghi dữ liệu: checkout chuyển giỏ hàng thành đơn

**Bối cảnh:** khách bấm "đặt hàng": tạo một dòng `orders`, chuyển toàn bộ `cart_items` của user thành `order_items` (chụp lại tên và giá hiện tại từ `products`/`skus`), rồi xoá giỏ. Ba câu lệnh, một round-trip, và vẫn atomic vì cùng một statement.

```sql
WITH new_order AS (
  INSERT INTO orders (user_id, status) VALUES ($1, 'pending') RETURNING id
),
moved AS (
  DELETE FROM cart_items WHERE user_id = $1 RETURNING sku_id, quantity
)
INSERT INTO order_items (order_id, sku_id, product_name, unit_price, quantity)
SELECT no.id, m.sku_id, p.name, s.price, m.quantity
FROM moved m
JOIN skus s     ON s.id = m.sku_id
JOIN products p ON p.id = s.product_id
CROSS JOIN new_order no
RETURNING order_id, product_name, unit_price, quantity;
```

Giả sử giỏ của user có 2 dòng:

| cart_items.sku_id | quantity | skus.price | products.name |
| ----------------- | -------- | ---------- | ------------- |
| sku-A-S           | 2        | 100        | Áo thun A     |
| sku-B-M           | 1        | 250        | Quần B        |

Kết quả `RETURNING` (đồng thời `cart_items` của user còn 0 dòng, `orders` có thêm 1 dòng):

| order_id | product_name | unit_price | quantity |
| -------- | ------------ | ---------- | -------- |
| o-new    | Áo thun A    | 100        | 2        |
| o-new    | Quần B       | 250        | 1        |

Hai điểm cần nhớ: (1) các CTE ghi dữ liệu trong cùng một `WITH` **nhìn thấy cùng một snapshot** — `moved` không thấy dòng `new_order` vừa insert và ngược lại; muốn dùng kết quả thì phải qua `RETURNING` như trên. (2) Câu này chưa trừ tồn kho; khoá tồn kho và race condition là bài ở file 03.

Pattern chị em, "archive rồi xoá": `WITH old AS (DELETE FROM messages WHERE created_at < now() - interval '30 days' AND read_at IS NOT NULL RETURNING *) INSERT INTO messages_archive SELECT * FROM old;`.

#### MATERIALIZED vs NOT MATERIALIZED

Postgres ≥ 12: CTE được tham chiếu **một lần** và không có side effect sẽ được inline vào query chính (planner được đẩy điều kiện WHERE vào trong). CTE được tham chiếu nhiều lần, hoặc có ghi dữ liệu, thì được tính một lần rồi giữ lại (materialize). Bạn ép bằng từ khoá:

```sql
-- ép tính trước, chặn planner đẩy điều kiện vào trong
WITH s AS MATERIALIZED (
  SELECT product_id, MIN(price) AS min_price FROM skus GROUP BY product_id
)
SELECT p.name, s.min_price FROM products p JOIN s ON s.product_id = p.id WHERE p.id = $1;
```

Plan (rút gọn) với `MATERIALIZED`: `CTE s -> HashAggregate -> Seq Scan on skus` (gom **toàn bộ** 4.000 sku rồi mới lọc 1 product). Với `NOT MATERIALIZED` (hoặc bỏ từ khoá): `Bitmap Index Scan on skus_product_idx` với điều kiện `product_id = $1` — chỉ đọc vài dòng. Trên seed mẫu là chênh vài ms; trên bảng triệu dòng là chênh cả giây.

Khi nào ép `MATERIALIZED`: CTE tốn kém dùng ở nhiều chỗ, hoặc bạn cố tình muốn "chốt" kết quả (tránh planner chọn plan xấu vì ước lượng sai). Mặc định: đừng ghi gì cả và để planner quyết.

**Bẫy:** (1) CTE tham chiếu 2 lần thì auto-materialize, tức là mất index pushdown; nếu cần lọc, đưa điều kiện vào ngay trong CTE. (2) Đừng dùng CTE thay cho subquery chỉ vì "đẹp" khi query có một tầng; nhiều tầng mới đáng.

**Thử biến tấu:** thêm tầng `brand_stats` để tính tổng tồn kho theo brand từ `sku_stats` (tham chiếu CTE trước). Viết CTE ghi dữ liệu "huỷ đơn pending quá 24h và trả tồn kho về skus" bằng `UPDATE ... RETURNING` nối `UPDATE`. Chạy `EXPLAIN` ví dụ MATERIALIZED với và không có từ khoá, so số dòng ước lượng ở node `skus`.

### 4.2 Window function — tính toán "nhìn sang dòng khác" mà không gom nhóm

Cú pháp: `hàm() OVER (PARTITION BY ... ORDER BY ... [frame])`. Khác GROUP BY: **số dòng không đổi**, mỗi dòng có thêm cột tính từ "cửa sổ" của nó. `PARTITION BY` chia dòng thành nhóm; `ORDER BY` xếp thứ tự trong nhóm (bắt buộc với hàm xếp hạng, LAG/LEAD, running total).

#### Ví dụ 1 — xếp hạng sku theo giá trong từng product

**Bối cảnh:** trong một product có nhiều sku với giá khác nhau. Muốn hiện từng sku kèm "đây là sku rẻ thứ mấy" và "đắt hơn sku rẻ nhất bao nhiêu". GROUP BY không làm được vì gom mất từng sku.

```sql
SELECT s.product_id, s.sku_code, s.price,
  ROW_NUMBER() OVER (PARTITION BY s.product_id ORDER BY s.price) AS rn,
  RANK()       OVER (PARTITION BY s.product_id ORDER BY s.price) AS rnk,
  MIN(s.price) OVER (PARTITION BY s.product_id) AS min_price_of_product,
  s.price - MIN(s.price) OVER (PARTITION BY s.product_id) AS diff_from_min
FROM skus s;
```

Giả sử 2 product, 5 sku:

| product_id | sku_code | price |
| ---------- | -------- | ----- |
| P1         | A-S      | 100   |
| P1         | A-M      | 120   |
| P1         | A-L      | 120   |
| P2         | B-S      | 200   |
| P2         | B-M      | 250   |

Kết quả (5 dòng vào, 5 dòng ra):

| product_id | sku_code | price | rn  | rnk | min_price_of_product | diff_from_min |
| ---------- | -------- | ----- | --- | --- | -------------------- | ------------- |
| P1         | A-S      | 100   | 1   | 1   | 100                  | 0             |
| P1         | A-M      | 120   | 2   | 2   | 100                  | 20            |
| P1         | A-L      | 120   | 3   | 2   | 100                  | 20            |
| P2         | B-S      | 200   | 1   | 1   | 200                  | 0             |
| P2         | B-M      | 250   | 2   | 2   | 200                  | 50            |

`rn` khác `rnk` ở A-M/A-L vì trùng giá: ROW_NUMBER vẫn đếm tiếp (thứ tự giữa 2 dòng trùng là **không xác định** trừ khi thêm `, id` vào ORDER BY), RANK cho cùng hạng. `MIN(...) OVER (PARTITION BY ...)` không có ORDER BY nên lấy min của cả partition.

#### Ví dụ 2 — PARTITION BY nhiều cột

**Bối cảnh:** với mỗi đơn đã giao của một user, muốn biết đơn đó xếp thứ mấy về giá trị **trong tháng của nó**, tổng chi tiêu tháng đó, và tổng chi tiêu toàn thời gian. Ba cửa sổ với phạm vi khác nhau trong cùng một SELECT.

```sql
WITH order_rev AS (
  SELECT o.user_id, date_trunc('month', o.created_at)::date AS month, o.id AS order_id,
         SUM(i.unit_price * i.quantity) AS amount
  FROM orders o JOIN order_items i ON i.order_id = o.id
  WHERE o.status = 'delivered' AND o.deleted_at IS NULL
  GROUP BY o.user_id, 2, o.id
)
SELECT user_id, month, order_id, amount,
  SUM(amount)  OVER (PARTITION BY user_id, month) AS user_month_total,
  ROW_NUMBER() OVER (PARTITION BY user_id, month ORDER BY amount DESC) AS rank_in_month,
  SUM(amount)  OVER (PARTITION BY user_id) AS user_total
FROM order_rev
WHERE user_id = $1
ORDER BY month, amount DESC;
```

Giả sử user U1 có 4 đơn:

| month   | order_id | amount |
| ------- | -------- | ------ |
| 2026-07 | o1       | 300    |
| 2026-07 | o2       | 500    |
| 2026-08 | o3       | 200    |
| 2026-08 | o4       | 200    |

| month   | order_id | amount | user_month_total | rank_in_month | user_total |
| ------- | -------- | ------ | ---------------- | ------------- | ---------- |
| 2026-07 | o2       | 500    | 800              | 1             | 1200       |
| 2026-07 | o1       | 300    | 800              | 2             | 1200       |
| 2026-08 | o3       | 200    | 400              | 1             | 1200       |
| 2026-08 | o4       | 200    | 400              | 2             | 1200       |

`PARTITION BY user_id, month` = "cửa sổ là các đơn cùng user cùng tháng". Bỏ `month` đi thì cửa sổ rộng ra thành cả user. Lưu ý `GROUP BY` trong CTE phải gom theo `o.id` để mỗi đơn một dòng trước khi vào window, nếu không lại dính lỗi nhân dòng ở 4.1.

#### Ví dụ 3 — LAG với giá trị mặc định và offset > 1

**Bối cảnh:** số đơn theo ngày. Muốn so với hôm qua và với **cùng ngày tuần trước** (offset 7). Ngày đầu tiên không có "hôm qua" thì LAG trả NULL; tham số thứ ba cho giá trị mặc định thay NULL.

```sql
WITH daily AS (
  SELECT (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS d, COUNT(*) AS orders
  FROM orders o WHERE o.deleted_at IS NULL
  GROUP BY 1
)
SELECT d, orders,
  LAG(orders, 1, 0) OVER (ORDER BY d) AS prev_1,
  LAG(orders, 7, 0) OVER (ORDER BY d) AS prev_7,
  orders - LAG(orders, 7, 0) OVER (ORDER BY d) AS diff_vs_last_week,
  LEAD(d) OVER (ORDER BY d) AS next_day
FROM daily ORDER BY d;
```

Giả sử 9 ngày liên tiếp từ 01/09, số đơn `10, 12, 8, 9, 11, 13, 7, 15, 9`:

| d     | orders | prev_1 | prev_7 | diff_vs_last_week | next_day |
| ----- | ------ | ------ | ------ | ----------------- | -------- |
| 09-01 | 10     | 0      | 0      | 10                | 09-02    |
| 09-02 | 12     | 10     | 0      | 12                | 09-03    |
| …     |        |        |        |                   |          |
| 09-07 | 7      | 13     | 0      | 7                 | 09-08    |
| 09-08 | 15     | 7      | 10     | 5                 | 09-09    |
| 09-09 | 9      | 15     | 12     | -3                | NULL     |

`LAG(orders, 7, 0)`: lấy dòng đứng trước 7 vị trí **trong tập kết quả**, không phải "7 ngày trước". Nếu có ngày trống (không đơn) thì bị lệch; sửa bằng cách sinh dãy ngày đầy đủ (6.3) trước khi LAG, hoặc dùng `RANGE` frame (4.4). Mặc định `0` ở đây đúng cho "số đơn" nhưng sai cho "% tăng" (chia cho 0), lúc đó để NULL và `NULLIF`.

#### Ví dụ 4 — named window (`WINDOW w AS`) và window kết hợp `FILTER`

**Bối cảnh:** trang chi tiết product cần từng sku kèm: thứ tự theo giá, tồn kho luỹ kế theo giá tăng dần, số biến thể còn hàng và tổng số biến thể. Bốn cửa sổ, hai cái giống hệt nhau; đặt tên để không lặp.

```sql
SELECT s.sku_code, s.price, s.stock,
  ROW_NUMBER() OVER w                                                     AS rn,
  SUM(s.stock) OVER w                                                     AS running_stock,
  COUNT(*) FILTER (WHERE s.stock > 0) OVER (PARTITION BY s.product_id)    AS in_stock_variants,
  COUNT(*) OVER (PARTITION BY s.product_id)                               AS variants
FROM skus s
WHERE s.product_id = $1
WINDOW w AS (PARTITION BY s.product_id ORDER BY s.price)
ORDER BY s.price;
```

| sku_code | price | stock | rn  | running_stock | in_stock_variants | variants |
| -------- | ----- | ----- | --- | ------------- | ----------------- | -------- |
| A-S      | 100   | 5     | 1   | 5             | 2                 | 3        |
| A-M      | 120   | 10    | 2   | 15            | 2                 | 3        |
| A-L      | 120   | 0     | 3   | 15            | 2                 | 3        |

`WINDOW w AS (...)` đứng sau `WHERE`/`GROUP BY`, trước `ORDER BY`. `FILTER (WHERE ...)` đặt trước `OVER`, chỉ đếm dòng thoả điều kiện nhưng vẫn trả giá trị cho **mọi** dòng (kể cả A-L hết hàng vẫn thấy `in_stock_variants = 2`).

Hàm hay dùng:

| Hàm                                                                   | Ý nghĩa                                                           |
| --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `ROW_NUMBER()`                                                        | 1,2,3… không trùng                                                |
| `RANK()` / `DENSE_RANK()`                                             | 1,1,3 / 1,1,2 khi trùng                                           |
| `LAG(col, n, default)` / `LEAD(...)`                                  | giá trị dòng trước / sau n vị trí                                 |
| `SUM(col) OVER (ORDER BY d)`                                          | running total (xem 4.4 về frame mặc định)                         |
| `AVG(col) OVER (ORDER BY d ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)` | trung bình trượt 7 dòng                                           |
| `FIRST_VALUE / LAST_VALUE / NTH_VALUE`                                | LAST_VALUE cần frame `UNBOUNDED FOLLOWING` mới đúng ý (bẫy ở 4.4) |
| `NTILE(4)`, `PERCENT_RANK()`, `CUME_DIST()`                           | chia nhóm, phần trăm thứ hạng (4.5)                               |
| `COUNT(*) OVER ()`                                                    | tổng số dòng, dùng để trả `total` cùng trang dữ liệu              |

**Thử biến tấu:** thêm cột "sku này chiếm bao nhiêu % tồn kho của product" bằng `stock * 100.0 / SUM(stock) OVER (PARTITION BY product_id)`. Đổi ví dụ 3 sang so với 30 ngày trước và giải thích vì sao offset 30 sai khi có ngày trống. Viết `COUNT(*) OVER ()` vào query listing để trả tổng số product cùng trang đầu (và cân nhắc chi phí khi bảng lớn).

### 4.3 Top-N mỗi nhóm — bài toán kinh điển

#### Ví dụ 1 — mỗi product lấy 2 sku rẻ nhất

```sql
SELECT * FROM (
  SELECT s.*, ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY price, id) AS rn
  FROM skus s WHERE deleted_at IS NULL
) t
WHERE rn <= 2;
```

Window không lọc được trực tiếp bằng WHERE (thứ tự thực thi ở file 00) nên phải bọc subquery. Với dữ liệu giả sử ở 4.2 ví dụ 1, kết quả là A-S, A-M (P1) và B-S, B-M (P2). N = 1 thì `DISTINCT ON` (file 01) gọn hơn; N nhỏ và có index thì LATERAL (5.2) thường nhanh hơn.

#### Ví dụ 2 — Top-N có tie: RANK vs ROW_NUMBER cho kết quả khác nhau

**Bối cảnh:** "2 review điểm cao nhất của mỗi product". Nếu có 4 review cùng 5 sao thì "top 2" nghĩa là gì? Câu trả lời phụ thuộc bạn chọn hàm nào, và phải nói rõ với PM.

```sql
SELECT * FROM (
  SELECT r.product_id, r.user_id, r.rating, r.created_at,
    ROW_NUMBER() OVER (PARTITION BY r.product_id ORDER BY r.rating DESC) AS rn,
    RANK()       OVER (PARTITION BY r.product_id ORDER BY r.rating DESC) AS rnk,
    DENSE_RANK() OVER (PARTITION BY r.product_id ORDER BY r.rating DESC) AS drnk
  FROM reviews r
) t
WHERE product_id = $1 AND rnk <= 2
ORDER BY rn;
```

Giả sử product có 5 review với rating `5, 5, 5, 4, 3`:

| user_id | rating | rn  | rnk | drnk |
| ------- | ------ | --- | --- | ---- |
| u1      | 5      | 1   | 1   | 1    |
| u2      | 5      | 2   | 1   | 1    |
| u3      | 5      | 3   | 1   | 1    |
| u4      | 4      | 4   | 4   | 2    |
| u5      | 3      | 5   | 5   | 3    |

| Điều kiện lọc | Dòng trả về    | Ý nghĩa                                                                                |
| ------------- | -------------- | -------------------------------------------------------------------------------------- |
| `rn <= 2`     | u1, u2         | đúng 2 dòng, nhưng u3 bị loại **ngẫu nhiên** (thứ tự giữa 3 dòng 5 sao không xác định) |
| `rnk <= 2`    | u1, u2, u3     | mọi dòng "đồng hạng top 2"; có thể > 2 dòng                                            |
| `drnk <= 2`   | u1, u2, u3, u4 | 2 **mức** điểm cao nhất                                                                |

Muốn ROW_NUMBER ổn định, thêm tie-breaker: `ORDER BY rating DESC, created_at DESC, id`. Nguyên tắc: **ORDER BY trong window phải xác định duy nhất** nếu bạn dùng ROW_NUMBER để cắt.

#### Ví dụ 3 — top-3 khách hàng theo doanh thu mỗi tháng

**Bối cảnh:** báo cáo marketing "3 khách chi nhiều nhất từng tháng". Phải gom (user, tháng) trước rồi mới xếp hạng trong từng tháng.

```sql
WITH user_month AS (
  SELECT o.user_id, date_trunc('month', o.created_at)::date AS month,
         SUM(i.unit_price * i.quantity) AS revenue
  FROM orders o JOIN order_items i ON i.order_id = o.id
  WHERE o.status = 'delivered' AND o.deleted_at IS NULL
  GROUP BY 1, 2
)
SELECT month, user_id, revenue, rn
FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY month ORDER BY revenue DESC, user_id) AS rn
  FROM user_month
) t
WHERE rn <= 3
ORDER BY month, rn;
```

Giả sử `user_month`:

| user_id | month | revenue |
| ------- | ----- | ------- |
| U1      | 07    | 900     |
| U2      | 07    | 400     |
| U3      | 07    | 400     |
| U4      | 07    | 100     |
| U1      | 08    | 200     |
| U5      | 08    | 800     |

| month | user_id | revenue | rn  |
| ----- | ------- | ------- | --- |
| 07    | U1      | 900     | 1   |
| 07    | U2      | 400     | 2   |
| 07    | U3      | 400     | 3   |
| 08    | U5      | 800     | 1   |
| 08    | U1      | 200     | 2   |

Tháng 08 chỉ có 2 khách nên trả 2 dòng. `user_id` làm tie-breaker để U2/U3 ổn định giữa các lần chạy.

**Thử biến tấu:** viết lại ví dụ 1 bằng LATERAL (5.2) và so `EXPLAIN` khi có index `(product_id, price)`. Đổi ví dụ 2 sang "review mới nhất trong số các review điểm cao nhất" (một dòng, ổn định). Với ví dụ 3, thêm cột "khoảng cách so với người xếp trên" bằng `LAG(revenue) OVER (PARTITION BY month ORDER BY revenue DESC) - revenue`.

### 4.4 Running total, trung bình trượt và window frame

Frame là "cửa sổ trong cửa sổ": sau khi ORDER BY, hàm gộp chỉ tính trên khoảng `BETWEEN <bắt đầu> AND <kết thúc>` quanh dòng hiện tại. Mặc định khi có ORDER BY là `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` — điều này gây bất ngờ ở ví dụ 3.

#### Ví dụ 1 — luỹ kế và so với hôm trước

**Bối cảnh:** dashboard doanh thu theo ngày của các đơn đã giao (`orders.status = 'delivered'`), doanh thu tính từ `order_items` như file 01 §2.4. Cần thêm hai cột: luỹ kế từ đầu và % tăng so với hôm trước.

```sql
WITH daily AS (
  SELECT date_trunc('day', o.created_at)::date AS d, SUM(i.unit_price * i.quantity) AS revenue
  FROM orders o JOIN order_items i ON i.order_id = o.id
  WHERE o.status = 'delivered' AND o.deleted_at IS NULL
  GROUP BY 1
)
SELECT d, revenue,
  SUM(revenue) OVER (ORDER BY d) AS cumulative,
  LAG(revenue) OVER (ORDER BY d) AS prev_day,
  round(100.0 * (revenue - LAG(revenue) OVER (ORDER BY d)) / NULLIF(LAG(revenue) OVER (ORDER BY d), 0), 1) AS growth_pct
FROM daily ORDER BY d;
```

| d     | revenue | cumulative | prev_day | growth_pct |
| ----- | ------- | ---------- | -------- | ---------- |
| 09-01 | 100     | 100        | NULL     | NULL       |
| 09-02 | 150     | 250        | 100      | 50.0       |
| 09-03 | 120     | 370        | 150      | -20.0      |
| 09-04 | 0       | 370        | 120      | -100.0     |

`GROUP BY 1` = group theo cột thứ nhất của SELECT; tiện khi viết tay, trong code nên viết rõ tên. `NULLIF(..., 0)` tránh chia cho 0.

#### Ví dụ 2 — trung bình trượt 7 ngày, xem từng dòng cửa sổ tính gì

**Bối cảnh:** đường "MA7" trên biểu đồ doanh thu, làm mượt dao động theo ngày. Thêm cột đếm để thấy 6 ngày đầu cửa sổ chưa đủ 7 dòng.

```sql
WITH daily AS (
  SELECT (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS d, SUM(i.unit_price * i.quantity) AS revenue
  FROM orders o JOIN order_items i ON i.order_id = o.id
  WHERE o.status = 'delivered' AND o.deleted_at IS NULL
  GROUP BY 1
)
SELECT d, revenue,
  round(AVG(revenue) OVER (ORDER BY d ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 2) AS ma7,
  COUNT(*)     OVER (ORDER BY d ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS days_in_window,
  SUM(revenue) OVER (ORDER BY d ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative,
  SUM(revenue) OVER (ORDER BY d ROWS BETWEEN 1 FOLLOWING AND 3 FOLLOWING) AS next_3_days
FROM daily ORDER BY d;
```

Giả sử 9 ngày liên tiếp, doanh thu `10, 20, 30, 40, 50, 60, 70, 80, 90`, rút gọn để dễ tính (ma7 lấy 2 chữ số):

| d     | revenue | các dòng trong cửa sổ MA7 | ma7   | days_in_window | cumulative | next_3_days   |
| ----- | ------- | ------------------------- | ----- | -------------- | ---------- | ------------- |
| 09-01 | 10      | 10                        | 10.00 | 1              | 10         | 90 (20+30+40) |
| 09-02 | 20      | 10,20                     | 15.00 | 2              | 30         | 120           |
| 09-03 | 30      | 10..30                    | 20.00 | 3              | 60         | 150           |
| 09-07 | 70      | 10..70                    | 40.00 | 7              | 280        | 170 (80+90)   |
| 09-08 | 80      | 20..80                    | 50.00 | 7              | 360        | 90            |
| 09-09 | 90      | 30..90                    | 60.00 | 7              | 450        | NULL          |

Đọc frame: `6 PRECEDING AND CURRENT ROW` = 6 dòng trước + dòng này = tối đa 7 dòng. `UNBOUNDED PRECEDING` = từ dòng đầu. `1 FOLLOWING AND 3 FOLLOWING` = 3 dòng sau, không tính dòng này; hết dữ liệu thì SUM trên tập rỗng là NULL. Nếu muốn MA7 chỉ hiện khi đủ 7 ngày: `CASE WHEN COUNT(*) OVER (...) = 7 THEN AVG(...) END`.

#### Ví dụ 3 — ROWS vs RANGE, và frame mặc định

**Bối cảnh:** luỹ kế điểm review của một product theo ngày. Nếu hai review cùng ngày, kết quả khác nhau tuỳ frame.

```sql
SELECT r.created_at::date AS d, r.rating,
  SUM(r.rating) OVER (ORDER BY r.created_at::date ROWS  BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS sum_rows,
  SUM(r.rating) OVER (ORDER BY r.created_at::date RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS sum_range,
  SUM(r.rating) OVER (ORDER BY r.created_at::date) AS sum_default
FROM reviews r
WHERE r.product_id = $1
ORDER BY r.created_at::date, r.id;
```

Giả sử 4 review, hai cái cùng ngày 09-02:

| d     | rating | sum_rows | sum_range | sum_default |
| ----- | ------ | -------- | --------- | ----------- |
| 09-01 | 3      | 3        | 3         | 3           |
| 09-02 | 5      | 8        | **12**    | **12**      |
| 09-02 | 4      | 12       | 12        | 12          |
| 09-03 | 2      | 14       | 14        | 14          |

`ROWS` đếm dòng vật lý: dòng thứ hai của 09-02 thấy 3+5 = 8. `RANGE` coi các dòng **cùng giá trị ORDER BY** là một khối ("peers"): cả hai dòng 09-02 đều thấy 3+5+4 = 12. **Frame mặc định là RANGE**, nên `sum_default` = `sum_range`. Hệ quả nổi tiếng: `LAST_VALUE(x) OVER (ORDER BY d)` trả về giá trị của **dòng hiện tại** chứ không phải dòng cuối, vì frame mặc định kết thúc ở CURRENT ROW; muốn "cuối cùng" phải thêm `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`.

`RANGE` còn nhận khoảng theo giá trị: `RANGE BETWEEN interval '6 days' PRECEDING AND CURRENT ROW` là "7 ngày lịch" thật, kể cả khi thiếu ngày trong dữ liệu — đây là cách sửa đúng cho bẫy offset ở 4.2 ví dụ 3 (ORDER BY phải là một cột date/timestamp/số).

**Bẫy:** running total với `ORDER BY` có trùng giá trị mà không nói rõ frame → số nhảy bậc như `sum_default` ở trên. Khi làm luỹ kế, viết `ROWS` tường minh, và ORDER BY thêm khoá duy nhất.

**Thử biến tấu:** viết MA7 chỉ tính các ngày đủ dữ liệu (dùng `CASE` như gợi ý). Tính "tỷ trọng doanh thu ngày so với 7 ngày gần nhất". So sánh `ROWS BETWEEN 6 PRECEDING` và `RANGE BETWEEN interval '6 days' PRECEDING` trên tập có ngày trống và giải thích chênh lệch.

### 4.5 NTILE, PERCENT_RANK, CUME_DIST — chia nhóm và phần trăm

**Bối cảnh:** phân khúc khách hàng theo tổng chi tiêu: chia 4 nhóm bằng nhau (quartile), và mỗi khách ở "top bao nhiêu %".

```sql
WITH spend AS (
  SELECT o.user_id, SUM(i.unit_price * i.quantity) AS total
  FROM orders o JOIN order_items i ON i.order_id = o.id
  WHERE o.status = 'delivered' AND o.deleted_at IS NULL
  GROUP BY 1
)
SELECT user_id, total,
  NTILE(4) OVER (ORDER BY total) AS quartile,
  round(PERCENT_RANK() OVER (ORDER BY total)::numeric, 3) AS pct_rank,
  round(CUME_DIST()    OVER (ORDER BY total)::numeric, 3) AS cume_dist
FROM spend ORDER BY total DESC;
```

Giả sử 6 khách, total `100, 200, 300, 300, 500, 900`:

| user_id | total | quartile | pct_rank | cume_dist |
| ------- | ----- | -------- | -------- | --------- |
| U6      | 900   | 4        | 1.000    | 1.000     |
| U5      | 500   | 4        | 0.800    | 0.833     |
| U4      | 300   | 3        | 0.400    | 0.667     |
| U3      | 300   | 2        | 0.400    | 0.667     |
| U2      | 200   | 2        | 0.200    | 0.333     |
| U1      | 100   | 1        | 0.000    | 0.167     |

- `NTILE(4)`: chia 6 dòng thành 4 nhóm gần bằng nhau (2,2,1,1); nhóm đầu nhận phần dư. U3/U4 cùng total nhưng khác nhóm — NTILE **không** quan tâm tie.
- `PERCENT_RANK` = (rank − 1) / (n − 1): "% dòng đứng dưới mình". Tie cùng giá trị.
- `CUME_DIST` = số dòng ≤ mình / n: "% dòng nhỏ hơn hoặc bằng mình".

Tổng hợp theo nhóm bằng cách bọc thêm một tầng: `SELECT quartile, COUNT(*), MIN(total), MAX(total) FROM (...) GROUP BY quartile`. Hai hàm trả `double precision`, cast sang `numeric` trước khi `round(x, n)`.

**Thử biến tấu:** chia 10 nhóm (decile) và lấy ngưỡng chi tiêu để vào top 10%. Tính percentile bằng `percentile_cont(0.9) WITHIN GROUP (ORDER BY total)` (hàm gộp, không phải window) và so với `CUME_DIST`.

### 4.6 Gaps and islands — chuỗi ngày liên tiếp

**Bối cảnh:** "chuỗi ngày dài nhất user đặt hàng liên tục" (kiểu streak). Thủ thuật kinh điển: với dãy ngày đã sắp xếp, `d - ROW_NUMBER()` là **hằng số** trong một chuỗi liên tiếp, đổi giá trị khi có lỗ.

```sql
WITH days AS (
  SELECT DISTINCT (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS d
  FROM orders o WHERE o.user_id = $1 AND o.deleted_at IS NULL
),
numbered AS (
  SELECT d, d - (ROW_NUMBER() OVER (ORDER BY d))::int AS grp
  FROM days
)
SELECT MIN(d) AS streak_start, MAX(d) AS streak_end, COUNT(*) AS streak_days
FROM numbered
GROUP BY grp
ORDER BY streak_days DESC, streak_start
LIMIT 3;
```

Giả sử user có đơn vào các ngày `09-01, 09-02, 09-03, 09-06, 09-07, 09-10`:

| d     | row_number | grp = d − rn |
| ----- | ---------- | ------------ |
| 09-01 | 1          | 08-31        |
| 09-02 | 2          | 08-31        |
| 09-03 | 3          | 08-31        |
| 09-06 | 4          | 09-02        |
| 09-07 | 5          | 09-02        |
| 09-10 | 6          | 09-04        |

| streak_start | streak_end | streak_days |
| ------------ | ---------- | ----------- |
| 09-01        | 09-03      | 3           |
| 09-06        | 09-07      | 2           |
| 09-10        | 09-10      | 1           |

`DISTINCT` là bắt buộc: hai đơn cùng ngày sẽ phá phép trừ. Biến thể "island theo cờ" (ví dụ: các khoảng liên tiếp có/không có đơn trên lịch đầy đủ) dùng `LAG` để đánh dấu điểm đổi trạng thái rồi `SUM(is_start) OVER (ORDER BY d)` làm id nhóm; xem file 05 bài mức 2.

**Thử biến tấu:** tìm khoảng "im lặng" dài nhất (ngày không có đơn) bằng cách sinh lịch đầy đủ rồi đảo cờ. Streak theo tuần thay vì ngày (`date_trunc('week')` rồi trừ `rn * interval '1 week'`).

---

## Tuần 5 · EXISTS / anti-join, LATERAL, set operations, JSONB, array

### 5.1 EXISTS vs IN vs JOIN — chọn đúng

| Cần                                               | Dùng                                                             | Tránh                                        |
| ------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------- |
| "product có ít nhất một sku còn hàng" (semi-join) | `WHERE EXISTS (...)`                                             | `JOIN` + `DISTINCT` (nhân dòng rồi khử, tốn) |
| "product không có review nào" (anti-join)         | `WHERE NOT EXISTS (...)` hoặc `LEFT JOIN ... WHERE r.id IS NULL` | `NOT IN` (bẫy NULL, file 01)                 |
| lấy thêm cột từ bảng con                          | `JOIN`                                                           | subquery scalar lặp trong SELECT             |
| so với danh sách hằng ngắn                        | `IN ('a','b')` / `= ANY($1)`                                     |                                              |

#### Ví dụ 1 — anti-join: user chưa từng đặt hàng

**Bối cảnh:** `users` → `orders` là 1-n. Lấy dòng bên trái **không có** dòng tương ứng bên phải.

```sql
SELECT u.id, u.email
FROM users u
WHERE u.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id AND o.deleted_at IS NULL);
```

| users      | orders (user_id) | Kết quả |
| ---------- | ---------------- | ------- |
| U1, U2, U3 | U1, U1, U3       | U2      |

Planner đủ thông minh để biến `IN (subquery)` thành semi-join, nhưng `EXISTS` luôn rõ ý và **an toàn với NULL**. Mặc định dùng EXISTS.

#### Sai / Đúng — semi-join bằng JOIN + DISTINCT

**Bối cảnh:** "product còn ít nhất một sku có hàng".

**Sai:**

```sql
SELECT DISTINCT p.id, p.name
FROM products p
JOIN skus s ON s.product_id = p.id AND s.deleted_at IS NULL AND s.stock > 0
WHERE p.deleted_at IS NULL;
```

**Đúng:**

```sql
SELECT p.id, p.name
FROM products p
WHERE p.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM skus s WHERE s.product_id = p.id AND s.deleted_at IS NULL AND s.stock > 0);
```

Giả sử P1 có 3 sku còn hàng, P2 có 1, P3 hết:

| Cách            | Dòng sau JOIN (trước DISTINCT) | Dòng trả về |
| --------------- | ------------------------------ | ----------- |
| JOIN + DISTINCT | 4 (P1 × 3, P2 × 1)             | 2           |
| EXISTS          | không nhân                     | 2           |

Cùng kết quả, nhưng cách sai nhân dòng rồi mới khử (trên seed: 4.345 dòng → 1.790), và nếu bạn quên `DISTINCT` hoặc thêm cột gộp thì sai luôn. Còn có lỗi ngầm: `DISTINCT` cũng khử luôn các product **trùng tên** nếu bạn không SELECT `id`.

#### Ví dụ 2 — EXISTS lồng nhiều cấp

**Bối cảnh:** "user nào đã nhận hàng (delivered) ít nhất một sản phẩm của brand X". Đường đi: `users → orders → order_items → skus → products.brand_id`. EXISTS bên ngoài hỏi "có đơn nào", EXISTS bên trong hỏi "trong đơn đó có dòng nào của brand X".

```sql
SELECT u.id, u.email
FROM users u
WHERE u.deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM orders o
    WHERE o.user_id = u.id AND o.status = 'delivered' AND o.deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM order_items i
        JOIN skus s     ON s.id = i.sku_id
        JOIN products p ON p.id = s.product_id
        WHERE i.order_id = o.id AND p.brand_id = $1
      )
  );
```

Giả sử:

| user | order | status    | order_items → brand |
| ---- | ----- | --------- | ------------------- |
| U1   | o1    | delivered | X, Y                |
| U2   | o2    | pending   | X                   |
| U3   | o3    | delivered | Y                   |

Kết quả: chỉ **U1**. U2 có brand X nhưng đơn chưa giao; U3 giao rồi nhưng không có X. Subquery trong cùng tham chiếu cả `o.id` (cấp giữa) — EXISTS lồng được bao nhiêu cấp cũng được, mỗi cấp thấy mọi alias bên ngoài. Cách viết phẳng tương đương: một EXISTS với JOIN 4 bảng; lồng cấp đọc rõ "điều kiện của đơn" và "điều kiện của dòng hàng" hơn.

#### Ví dụ 3 — NOT EXISTS vs LEFT JOIN … IS NULL vs EXCEPT

**Bối cảnh:** "product chưa có review nào". Ba cách viết, cùng kết quả, plan khác nhau.

```sql
-- (a) NOT EXISTS
SELECT p.id FROM products p
WHERE p.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.product_id = p.id);

-- (b) LEFT JOIN ... IS NULL
SELECT p.id FROM products p LEFT JOIN reviews r ON r.product_id = p.id
WHERE p.deleted_at IS NULL AND r.id IS NULL;

-- (c) EXCEPT
SELECT p.id FROM products p WHERE p.deleted_at IS NULL
EXCEPT
SELECT r.product_id FROM reviews r;
```

Plan trên seed mẫu (`EXPLAIN (COSTS OFF)`, rút gọn):

| Cách | Node chính                                                      | Nhận xét                                                                        |
| ---- | --------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| (a)  | `Nested Loop Anti Join` + `Index Only Scan reviews_product_idx` | planner nhận diện anti-join, dùng index của bảng con, dừng ngay khi thấy 1 dòng |
| (b)  | `Hash Right Join` + `Filter: r.id IS NULL`                      | đọc **toàn bộ** reviews vào hash rồi lọc; tốn hơn khi bảng con to               |
| (c)  | `HashSetOp Except` trên `Append`                                | cũng đọc cả hai; thêm bước khử trùng; và **khác ngữ nghĩa** (xem dưới)          |

(c) khác hai cách kia ở hai điểm: EXCEPT khử trùng nên nếu SELECT thêm cột không duy nhất sẽ gộp dòng; và nếu `reviews.product_id` chứa NULL thì EXCEPT vẫn đúng (so sánh tập), còn `NOT IN` sẽ hỏng. Mặc định: (a). (b) hữu ích khi bạn cần thêm cột từ bảng phải cho trường hợp "có". (c) khi hai vế là hai query độc lập cùng hình dạng.

Nhắc lại bẫy `NOT IN`: `skus.id NOT IN (SELECT sku_id FROM order_items)` trả **0 dòng** ngay khi có một `sku_id` NULL (cột này nullable trong schema mẫu). Seed hiện tại chưa có NULL nên ba cách cho cùng số; hard delete một sku là khác ngay.

**Thử biến tấu:** viết "user có đơn delivered nhưng chưa review product nào trong các đơn đó" (EXISTS lồng NOT EXISTS). Chạy `EXPLAIN ANALYZE` cả ba cách ở ví dụ 3 và ghi lại thời gian; thêm index `reviews(product_id)` đã có sẵn, hãy thử `DROP INDEX` tạm trong transaction rồi xem plan (a) đổi thế nào.

### 5.2 LATERAL — "for each" ở tầng SQL

`LATERAL` cho phép subquery bên phải tham chiếu cột bên trái, chạy lại cho mỗi dòng. Dùng cho top-N mỗi nhóm khi N nhỏ và có index, và để "bung" hàm trả nhiều dòng từ một cột.

#### Ví dụ 1 — mỗi user 3 đơn gần nhất

**Bối cảnh:** trang admin liệt kê user kèm 3 đơn gần nhất (`users` → `orders` 1-n). Bằng ORM bạn sẽ loop từng user rồi query (N+1); LATERAL là "với mỗi user, chạy subquery này" ngay trong SQL.

```sql
SELECT u.email, o.id AS order_id, o.created_at
FROM users u
LEFT JOIN LATERAL (
  SELECT id, created_at FROM orders
  WHERE user_id = u.id AND deleted_at IS NULL
  ORDER BY created_at DESC LIMIT 3
) o ON true
WHERE u.deleted_at IS NULL;
```

| user | số đơn | dòng trả về                        |
| ---- | ------ | ---------------------------------- |
| U1   | 5      | 3 (mới nhất)                       |
| U2   | 1      | 1                                  |
| U3   | 0      | 1 dòng, `order_id` NULL (nhờ LEFT) |

`LEFT JOIN LATERAL ... ON true` giữ user không có đơn; `CROSS JOIN LATERAL` (hoặc `JOIN LATERAL ... ON true`) thì bỏ. Cần index `(user_id, created_at DESC)` để LATERAL không thành N lần seq scan; schema mẫu chỉ có `(user_id)`, đây là bài tập ở file 03.

#### Ví dụ 2 — LATERAL trả nhiều cột

**Bối cảnh:** listing cần 4 số liệu từ `skus` cho mỗi product. Thay vì 4 subquery scalar trong SELECT (mỗi cái quét `skus` một lần), một LATERAL tính cả 4 trong một lượt.

```sql
SELECT p.name, st.min_price, st.max_price, st.total_stock, st.variants
FROM products p
CROSS JOIN LATERAL (
  SELECT MIN(price) AS min_price, MAX(price) AS max_price, SUM(stock) AS total_stock, COUNT(*) AS variants
  FROM skus s WHERE s.product_id = p.id AND s.deleted_at IS NULL
) st
WHERE p.deleted_at IS NULL
ORDER BY p.created_at DESC LIMIT 20;
```

| name                | min_price | max_price | total_stock | variants |
| ------------------- | --------- | --------- | ----------- | -------- |
| Áo thun A           | 100       | 120       | 15          | 3        |
| Quần B              | 250       | 250       | 4           | 1        |
| Nón C (chưa có sku) | NULL      | NULL      | NULL        | 0        |

Subquery gộp không GROUP BY luôn trả **đúng 1 dòng** (kể cả khi không có sku), nên `CROSS JOIN` ở đây an toàn, không rớt product. So với CTE ở 4.1: CTE gom toàn bộ `skus` rồi JOIN, hợp với "lấy tất cả"; LATERAL gom theo từng product, hợp với "lấy 20 product rồi bổ sung số liệu" — với `LIMIT 20` LATERAL chỉ chạy 20 lần.

#### Ví dụ 3 — LATERAL với hàm: `unnest`, `jsonb_array_elements_text`

**Bối cảnh:** (a) bung `products.images` thành từng dòng kèm vị trí để hiện ảnh đầu tiên làm thumbnail; (b) đếm mỗi màu trong `attributes.color` xuất hiện ở bao nhiêu product.

```sql
-- (a) mỗi ảnh một dòng, kèm thứ tự trong mảng
SELECT p.name, img.url, img.pos
FROM products p
CROSS JOIN LATERAL unnest(p.images) WITH ORDINALITY AS img(url, pos)
WHERE p.deleted_at IS NULL
ORDER BY p.created_at DESC, img.pos;

-- (b) đếm product theo màu
SELECT c.color, COUNT(*) AS products
FROM products p
CROSS JOIN LATERAL jsonb_array_elements_text(p.attributes -> 'color') AS c(color)
WHERE p.deleted_at IS NULL
GROUP BY c.color ORDER BY products DESC;
```

Giả sử 2 product: A có `images = {a1.png, a2.png}`, `color = ["red","blue"]`; B có `images = {}`, `color = ["red"]`.

(a):

| name | url    | pos |
| ---- | ------ | --- |
| A    | a1.png | 1   |
| A    | a2.png | 2   |

(b):

| color | products |
| ----- | -------- |
| red   | 2        |
| blue  | 1        |

Product B biến mất ở (a) vì `unnest` mảng rỗng trả 0 dòng và `CROSS JOIN` bỏ dòng trái — muốn giữ, dùng `LEFT JOIN LATERAL ... ON true`. Với hàm trả tập (set-returning function) Postgres cho phép bỏ chữ `LATERAL` (`FROM products p, unnest(p.images)`), nhưng viết rõ dễ đọc hơn. `WITH ORDINALITY` thêm cột số thứ tự 1-based — cần khi thứ tự ảnh có ý nghĩa.

**Thử biến tấu:** viết "mỗi user: đơn gần nhất kèm tổng tiền của đơn đó" bằng LATERAL có GROUP BY bên trong. Kết hợp (a) với `WHERE img.pos = 1` để lấy thumbnail, rồi so với `images[1]` — cái nào gọn hơn và vì sao. Viết lại ví dụ 2 bằng 4 subquery scalar và so `EXPLAIN`.

### 5.3 UNION / INTERSECT / EXCEPT

#### Ví dụ 1 — feed hoạt động gộp hai bảng

**Bối cảnh:** trang "hoạt động gần đây" gộp `orders` và `reviews` của một user (đều có `user_id`, `created_at`) thành một danh sách theo thời gian.

```sql
SELECT 'order' AS kind, id::text AS ref_id, created_at FROM orders WHERE user_id = $1
UNION ALL
SELECT 'review', id::text, created_at FROM reviews WHERE user_id = $1
ORDER BY created_at DESC LIMIT 20;
```

| kind   | ref_id | created_at |
| ------ | ------ | ---------- |
| order  | o9     | 09-20      |
| review | 12597  | 09-14      |
| order  | o7     | 08-11      |

- `UNION` khử trùng (tốn sort/hash), `UNION ALL` không. Trên seed: `SELECT status FROM orders UNION SELECT status FROM orders` → 6 dòng; `UNION ALL` → 100.000 dòng. Mặc định dùng `UNION ALL` trừ khi cần khử.
- Các nhánh phải cùng số cột, kiểu tương thích (phải cast `id` vì một bên uuid, một bên bigint). Tên cột lấy theo nhánh **đầu tiên**.
- `ORDER BY`/`LIMIT` cuối áp cho toàn bộ kết quả gộp.

#### Ví dụ 2 — ORDER BY / LIMIT riêng từng nhánh

**Bối cảnh:** feed trên lấy toàn bộ đơn và review rồi mới cắt 20. User có 5.000 đơn thì tốn. Cách sửa: mỗi nhánh tự lấy 20 mới nhất (tận dụng index), gộp 40 dòng rồi cắt 20. Nhánh có ORDER BY/LIMIT riêng phải bọc **ngoặc đơn**.

```sql
(SELECT 'order' AS kind, id::text AS ref_id, created_at FROM orders  WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20)
UNION ALL
(SELECT 'review',        id::text,           created_at FROM reviews WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20)
ORDER BY created_at DESC LIMIT 20;
```

Giả sử user có 3 đơn (09-20, 08-11, 07-21) và 3 review (09-14, 08-20, 08-10), mỗi nhánh LIMIT 2:

| Sau từng nhánh                            | Sau gộp + ORDER BY                                   |
| ----------------------------------------- | ---------------------------------------------------- |
| order: 09-20, 08-11; review: 09-14, 08-20 | 09-20 order, 09-14 review, 08-20 review, 08-11 order |

Không có ngoặc, `ORDER BY ... LIMIT` ở giữa là lỗi cú pháp. Phân trang cho feed gộp kiểu này: keyset trên `(created_at, kind, ref_id)`, xem 6.2.

#### Ví dụ 3 — INTERSECT / EXCEPT

**Bối cảnh:** marketing hỏi "user vừa mua vừa từng review" (giao) và "user mua nhưng chưa review bao giờ" (hiệu).

```sql
SELECT user_id FROM orders WHERE deleted_at IS NULL
INTERSECT
SELECT user_id FROM reviews;

SELECT user_id FROM orders WHERE deleted_at IS NULL
EXCEPT
SELECT user_id FROM reviews;
```

| orders.user_id | reviews.user_id | INTERSECT | EXCEPT |
| -------------- | --------------- | --------- | ------ |
| U1, U1, U2, U3 | U1, U4          | U1        | U2, U3 |

Cả hai đều khử trùng (U1 xuất hiện 2 lần trong orders vẫn ra 1). `INTERSECT ALL` / `EXCEPT ALL` giữ số lần lặp — hiếm khi cần. EXCEPT là một cách viết anti-join; so sánh plan ở 5.1 ví dụ 3.

**Thử biến tấu:** thêm nhánh thứ ba `messages` (tin nhắn gửi đi) vào feed, cột `ref_id` cast từ bigint. Viết "user mua trong tháng 8 nhưng không mua trong tháng 9" bằng EXCEPT rồi bằng NOT EXISTS, so kết quả.

### 5.4 JSONB — cột `products.attributes`

Schema mẫu lưu `attributes` dạng `{"color": ["red","blue"], "size": ["S","M","L"]}`. JSONB phù hợp cho dữ liệu **hình dạng thay đổi, ít filter, không join**. Nếu bạn thấy mình `WHERE attributes->>'x' = ...` khắp nơi, đó là dấu hiệu nên tách thành bảng riêng.

#### Ví dụ 1 — đọc: `->` vs `->>` vs `#>>`

```sql
SELECT attributes -> 'color'        AS color_jsonb,   -- jsonb: ["red","blue"]
       attributes ->> 'color'       AS color_text,    -- text:  ["red","blue"] (chuỗi, không phải mảng)
       attributes -> 'color' -> 0   AS first_jsonb,   -- jsonb: "red" (có nháy)
       attributes #>> '{color,0}'   AS first_text,    -- text:  red
       jsonb_typeof(attributes -> 'color') AS ty      -- array
FROM products WHERE id = $1;
```

Giả sử `attributes = {"color": ["red","blue"], "size": ["S","M"]}`:

| color_jsonb       | color_text        | first_jsonb | first_text | ty    |
| ----------------- | ----------------- | ----------- | ---------- | ----- |
| `["red", "blue"]` | `["red", "blue"]` | `"red"`     | `red`      | array |

Quy tắc: `->` trả jsonb (đi tiếp được), `->>` trả text (để so sánh, hiển thị). `#>` / `#>>` nhận đường dẫn mảng, thay cho chuỗi `-> 'a' -> 0 ->> 'b'`.

#### Sai / Đúng — tìm product có màu đỏ

**Sai:**

```sql
SELECT count(*) FROM products WHERE attributes ->> 'color' = 'red';   -- 0 dòng
```

`->> 'color'` là chuỗi `["red","blue"]`, không bao giờ bằng `'red'`. Người mới thường sửa thành `LIKE '%red%'` — chạy được nhưng khớp cả `"darkred"` và không dùng được index.

**Đúng** (ba cách, cùng kết quả):

```sql
SELECT count(*) FROM products WHERE attributes @> '{"color": ["red"]}';   -- chứa; dùng được GIN index
SELECT count(*) FROM products WHERE attributes -> 'color' ? 'red';        -- mảng có phần tử chuỗi 'red'
SELECT count(*) FROM products WHERE attributes @? '$.color[*] ? (@ == "red")';   -- jsonpath
```

| Cách              | Giả sử 3 product: A `["red","blue"]`, B `["red"]`, C `["blue"]` |
| ----------------- | --------------------------------------------------------------- |
| `->> = 'red'`     | 0                                                               |
| `@>` / `?` / `@?` | 2 (A, B)                                                        |

`@>` là toán tử chính khi bạn có GIN index trên `attributes` (file 03). `?` kiểm tra **khoá** của object hoặc **phần tử chuỗi** của mảng; không khớp số.

#### Ví dụ 2 — tồn tại khoá, xoá khoá, duyệt khoá

```sql
SELECT count(*) FROM products WHERE attributes ? 'size';                          -- có khoá size
SELECT count(*) FROM products WHERE attributes ?| array['material', 'color'];      -- có BẤT KỲ khoá nào
SELECT count(*) FROM products WHERE attributes ?& array['material', 'color'];      -- có TẤT CẢ khoá
SELECT attributes - 'size'            FROM products WHERE id = $1;                 -- bỏ khoá (không ghi)
SELECT attributes #- '{color,0}'      FROM products WHERE id = $1;                 -- bỏ phần tử theo đường dẫn
SELECT key, value, jsonb_typeof(value) FROM products p, jsonb_each(p.attributes) WHERE p.id = $1;
```

Với `attributes = {"color": ["red"], "size": ["S","M","L"]}` (seed không có `material`):

| Câu                    | Kết quả                                                               |
| ---------------------- | --------------------------------------------------------------------- |
| `? 'size'`             | 2000 (tất cả)                                                         |
| `?\| {material,color}` | 2000 (có color là đủ)                                                 |
| `?& {material,color}`  | 0                                                                     |
| `- 'size'`             | `{"color": ["red"]}`                                                  |
| `#- '{color,0}'`       | `{"size": [...], "color": []}`                                        |
| `jsonb_each`           | 2 dòng: `color` / `["red"]` / array; `size` / `["S","M","L"]` / array |

`jsonb_each` biến object thành (key, value) — dùng để "pivot ngược" attributes ra dòng cho trang so sánh sản phẩm. `jsonb_object_keys` nếu chỉ cần tên khoá.

#### Ví dụ 3 — trả nested JSON cho API trong MỘT query

**Bối cảnh:** endpoint `GET /products/:id` cần `{ id, name, basePrice, skus: [{id, code, price, stock}] }`. ORM sẽ chạy 2 query rồi ghép trong app; Postgres ghép tại chỗ bằng `jsonb_build_object` + `jsonb_agg`.

```sql
SELECT jsonb_build_object(
  'id', p.id, 'name', p.name, 'basePrice', p.base_price,
  'skus', COALESCE(sk.items, '[]'::jsonb)
) AS product
FROM products p
LEFT JOIN LATERAL (
  SELECT jsonb_agg(
           jsonb_build_object('id', s.id, 'code', s.sku_code, 'price', s.price, 'stock', s.stock)
           ORDER BY s.price
         ) AS items
  FROM skus s WHERE s.product_id = p.id AND s.deleted_at IS NULL
) sk ON true
WHERE p.id = $1;
```

Giả sử product A có 2 sku, kết quả một cột `product` (đã format lại cho dễ đọc):

```json
{
  "id": "…A",
  "name": "Áo thun A",
  "basePrice": 100,
  "skus": [
    { "id": "…s1", "code": "A-S", "price": 100, "stock": 5 },
    { "id": "…s2", "code": "A-M", "price": 120, "stock": 10 }
  ]
}
```

Ba điểm: `COALESCE(..., '[]')` vì `jsonb_agg` trên tập rỗng trả NULL (API sẽ nhận `null` thay vì `[]`); `ORDER BY` trong `jsonb_agg` quyết định thứ tự mảng; `numeric` được xuất thành số JSON (100, không phải "100"), còn uuid và timestamptz thành chuỗi. Cho listing, viết mỗi mảng con thành một subquery scalar trong SELECT (`(SELECT COALESCE(jsonb_agg(...), '[]') FROM skus s WHERE s.product_id = p.id)`), cột thứ hai tương tự cho `categories` — hai mảng con độc lập, không nhân dòng vì mỗi subquery tự gộp.

Gọn hơn khi muốn lấy nguyên dòng: `jsonb_agg(to_jsonb(s) - 'deleted_at' - 'version' ORDER BY s.price)` — `to_jsonb(dòng)` biến cả dòng thành object với tên cột làm khoá; trừ đi khoá không muốn lộ.

#### Ví dụ 4 — jsonpath cơ bản và ghi dữ liệu

```sql
SELECT jsonb_path_query(attributes, '$.color[*]') FROM products WHERE id = $1;                -- mỗi phần tử một dòng
SELECT jsonb_path_query_array(attributes, '$.size[*] ? (@ != "S")') FROM products WHERE id = $1;  -- ["M","L"]
SELECT count(*) FROM products WHERE jsonb_path_exists(attributes, '$.color[*] ? (@ == "red")');

UPDATE products SET attributes = jsonb_set(attributes, '{size}', '["S","M","L","XL"]') WHERE id = $1;
UPDATE products SET attributes = attributes || '{"material": "cotton"}' WHERE id = $1;
```

**Bẫy `jsonb_set`:** `jsonb_set(attributes, '{spec,weight}', '"200g"', true)` khi khoá `spec` **chưa tồn tại** sẽ trả về jsonb **không đổi**, không lỗi — tham số `create_missing` chỉ tạo được khoá **cuối** của đường dẫn. Muốn tạo cả nhánh: `attributes || '{"spec": {"weight": "200g"}}'` (`||` gộp ở tầng đỉnh, thay thế nguyên khoá `spec` nếu đã có) hoặc `jsonb_set` hai lần.

**Thử biến tấu:** viết endpoint "product kèm mảng `categories` (tên) và `skus`" trong một query. Tìm product có màu đỏ **và** không có size XL. Viết UPDATE thêm `"XL"` vào mảng `size` chỉ khi chưa có (gợi ý: `WHERE NOT attributes -> 'size' ? 'XL'`, và `||` hai mảng jsonb).

### 5.5 Array — cột `products.images`

**Bối cảnh:** `images` là mảng URL ảnh của product (`text[]`), thay cho bảng `product_images` riêng vì chỉ cần lưu và hiển thị, không cần join.

#### Ví dụ 1 — toán tử cơ bản

```sql
SELECT * FROM products WHERE 'https://img.example.com/p/1.png' = ANY(images);   -- có phần tử
SELECT * FROM products WHERE cardinality(images) = 0;                             -- không có ảnh
SELECT id, unnest(images) AS image FROM products;                                 -- bung ra dòng
UPDATE products SET images = array_append(images, $1) WHERE id = $2;
UPDATE products SET images = array_remove(images, $1) WHERE id = $2;
```

Các hàm hay nhầm:

| Biểu thức                                 | Kết quả      | Ghi chú                                                                                  |
| ----------------------------------------- | ------------ | ---------------------------------------------------------------------------------------- |
| `array_length('{}'::text[], 1)`           | **NULL**     | mảng rỗng không có chiều 1                                                               |
| `cardinality('{}'::text[])`               | 0            | luôn dùng cái này để đếm                                                                 |
| `ARRAY['a','b'] && ARRAY['b','c']`        | true         | giao nhau (overlap)                                                                      |
| `ARRAY['a'] <@ ARRAY['a','b']`            | true         | bị chứa                                                                                  |
| `ARRAY['a','b'] @> ARRAY['b']`            | true         | chứa                                                                                     |
| `array_position(ARRAY['S','M','L'], 'M')` | 2            | 1-based; không có thì NULL                                                               |
| `string_to_array('red,blue', ',')`        | `{red,blue}` | tham số 3: chuỗi nào thành NULL, ví dụ `string_to_array('a,,b', ',', '')` → `{a,NULL,b}` |
| `array_to_string(ARRAY['S','M'], '/')`    | `S/M`        |                                                                                          |

`&&`, `<@`, `@>` dùng được GIN index trên mảng; `= ANY` thì không.

#### Ví dụ 2 — `array_agg` với ORDER BY và FILTER

**Bối cảnh:** trang product cần danh sách mã sku theo giá tăng dần, và riêng danh sách còn hàng. Gộp thành mảng để API trả một dòng/product thay vì N dòng.

```sql
SELECT p.id, p.name,
  array_agg(s.sku_code ORDER BY s.price)                          AS sku_codes,
  array_agg(s.sku_code ORDER BY s.price) FILTER (WHERE s.stock > 0) AS in_stock_codes,
  array_agg(s.price    ORDER BY s.price) FILTER (WHERE s.stock > 0) AS in_stock_prices
FROM products p JOIN skus s ON s.product_id = p.id AND s.deleted_at IS NULL
WHERE p.id = $1
GROUP BY p.id, p.name;
```

| sku_code | price | stock |
| -------- | ----- | ----- |
| A-L      | 120   | 0     |
| A-S      | 100   | 5     |
| A-M      | 120   | 10    |

| sku_codes       | in_stock_codes | in_stock_prices |
| --------------- | -------------- | --------------- |
| `{A-S,A-M,A-L}` | `{A-S,A-M}`    | `{100,120}`     |

Thứ tự `ORDER BY` bên trong `array_agg` — không phải ORDER BY của câu — quyết định thứ tự phần tử. Hai `array_agg` cùng ORDER BY thì phần tử cùng vị trí ứng với cùng sku (in_stock_codes[i] ↔ in_stock_prices[i]). `FILTER` trên tập rỗng trả NULL, không phải `{}`; bọc `COALESCE(..., '{}')` khi cần. `string_agg(c.name, ', ' ORDER BY c.name)` là phiên bản trả chuỗi, tiện cho danh sách category.

#### Ví dụ 3 — truyền mảng từ app và lọc bằng `&&`

**Bối cảnh:** filter listing theo "bất kỳ danh mục nào trong danh sách người dùng chọn". Truyền mảng id từ NestJS thay vì sinh `IN ($1,$2,$3...)` động.

```sql
-- product thuộc ít nhất một category trong $1
SELECT p.id, p.name
FROM products p
WHERE p.deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM product_categories pc
    WHERE pc.product_id = p.id AND pc.category_id = ANY($1::uuid[])
  );

-- cùng câu hỏi khi đã gom category_id thành mảng (ví dụ từ CTE)
WITH pc_agg AS (
  SELECT product_id, array_agg(category_id) AS category_ids FROM product_categories GROUP BY product_id
)
SELECT product_id FROM pc_agg WHERE category_ids && $1::uuid[];
```

| product | category_ids | `&& {C1,C9}` |
| ------- | ------------ | ------------ |
| A       | {C1,C2}      | true         |
| B       | {C3}         | false        |
| C       | {C9}         | true         |

`= ANY($1::uuid[])` nhanh và an toàn hơn `IN` sinh động: một prepared statement cho mọi độ dài mảng. Đổi `&&` thành `@>` là "thuộc **tất cả** category đã chọn".

**Thử biến tấu:** viết "product có ảnh nhưng ảnh đầu tiên không phải png" bằng `images[1]`. Dùng `array_agg(DISTINCT ...)` để gom màu của mọi sku trong product (chú ý DISTINCT và ORDER BY phải cùng biểu thức). So `EXPLAIN` của `= ANY($1)` với `IN (...)` 3 giá trị.

---

## Tuần 6 · Upsert, phân trang keyset, ngày giờ, GROUPING SETS

### 6.1 Upsert với ON CONFLICT

**Bối cảnh:** giỏ hàng `cart_items` có khoá chính `(user_id, sku_id)`: mỗi cặp user–sku chỉ một dòng. Khi khách bấm "thêm vào giỏ" một sku đã có sẵn, phải cộng dồn số lượng chứ không tạo dòng mới. Cách ngây thơ là SELECT rồi INSERT hoặc UPDATE, hai request đồng thời sẽ tạo trùng (hoặc mất một lần cộng); upsert làm việc đó trong một câu, atomic.

#### Ví dụ 1 — thêm vào giỏ, có rồi thì cộng dồn

```sql
INSERT INTO cart_items (user_id, sku_id, quantity)
VALUES ($1, $2, $3)
ON CONFLICT (user_id, sku_id)
DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity, updated_at = now()
RETURNING *;
```

Chạy hai lần với `quantity = 2` rồi `3`:

| Lần | Trước      | Sau | RETURNING          |
| --- | ---------- | --- | ------------------ |
| 1   | (không có) | 2   | 1 dòng, quantity 2 |
| 2   | 2          | 5   | 1 dòng, quantity 5 |

Cần unique constraint / index trên `(user_id, sku_id)` (schema mẫu dùng làm khoá chính) — thiếu thì lỗi `there is no unique or exclusion constraint matching the ON CONFLICT specification`. Ví dụ: `reviews` không có unique `(product_id, user_id)`, nên upsert review cần thêm constraint trước. `EXCLUDED` = dòng định insert; `cart_items.quantity` = dòng đang có.

#### Ví dụ 2 — `DO NOTHING` và `WHERE` trong `DO UPDATE`

```sql
-- bỏ qua nếu đã có: RETURNING trả RỖNG khi trùng
INSERT INTO cart_items (user_id, sku_id, quantity) VALUES ($1, $2, 1)
ON CONFLICT (user_id, sku_id) DO NOTHING
RETURNING *;

-- chỉ cộng dồn nếu tổng không vượt 10; vượt thì không làm gì
INSERT INTO cart_items (user_id, sku_id, quantity) VALUES ($1, $2, $3)
ON CONFLICT (user_id, sku_id) DO UPDATE
SET quantity = cart_items.quantity + EXCLUDED.quantity
WHERE cart_items.quantity + EXCLUDED.quantity <= 10
RETURNING quantity;
```

| Trạng thái         | Câu                  | Kết quả                                          |
| ------------------ | -------------------- | ------------------------------------------------ |
| đã có dòng (qty 5) | DO NOTHING RETURNING | 0 dòng, `INSERT 0 0`                             |
| chưa có            | DO NOTHING RETURNING | 1 dòng                                           |
| qty 5, thêm 4      | DO UPDATE WHERE ≤ 10 | 1 dòng, quantity 9                               |
| qty 9, thêm 4      | DO UPDATE WHERE ≤ 10 | 0 dòng (điều kiện sai → không update, không lỗi) |

Điểm hay bị hiểu nhầm: `RETURNING` **chỉ trả dòng đã được insert hoặc update**. `DO NOTHING` trùng → rỗng; `DO UPDATE ... WHERE` không thoả → rỗng. Trong service, "rỗng" là tín hiệu để trả 409 hoặc thông báo "giỏ đã đủ 10". Muốn phân biệt insert với update trong cùng câu: `RETURNING (xmax = 0) AS inserted` (thủ thuật dựa vào MVCC, xmax = 0 là dòng mới).

Tránh update vô nghĩa (giữ `updated_at` đúng): `DO UPDATE SET ... WHERE cart_items.quantity IS DISTINCT FROM EXCLUDED.quantity`.

#### Ví dụ 3 — upsert hàng loạt: `unnest` và `jsonb_to_recordset`

**Bối cảnh:** "đồng bộ giỏ" từ client gửi lên một mảng `[{skuId, quantity}]` — ghi đè số lượng cho từng sku trong một round-trip thay vì N query.

```sql
-- (a) hai mảng song song từ app
INSERT INTO cart_items (user_id, sku_id, quantity)
SELECT $1, sku_id, qty FROM unnest($2::uuid[], $3::int[]) AS v(sku_id, qty)
ON CONFLICT (user_id, sku_id) DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = now()
RETURNING sku_id, quantity;

-- (b) một tham số jsonb, đúng hình dạng body của request
INSERT INTO cart_items (user_id, sku_id, quantity)
SELECT $1, v.sku_id, v.quantity
FROM jsonb_to_recordset($2::jsonb) AS v(sku_id uuid, quantity int)
ON CONFLICT (user_id, sku_id) DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = now()
RETURNING sku_id, quantity;
```

Với `$2 = '[{"sku_id": "…s1", "quantity": 2}, {"sku_id": "…s2", "quantity": 5}]'`:

| sku_id | quantity |
| ------ | -------- |
| …s1    | 2        |
| …s2    | 5        |

`jsonb_to_recordset` cần khai báo kiểu từng cột, tên cột phải **khớp khoá JSON** (client gửi `skuId` thì đổi tên ở app hoặc dùng `jsonb_to_recordset` với alias `"skuId" uuid` có nháy). Bẫy khi bulk: nếu mảng đầu vào chứa **hai lần cùng sku**, Postgres báo `ON CONFLICT DO UPDATE command cannot affect row a second time` — khử trùng ở app hoặc `SELECT DISTINCT ON (sku_id)` trước.

**Thử biến tấu:** viết upsert review "mỗi user một review/product, sửa thì ghi đè rating và content" — trước hết phải `ALTER TABLE reviews ADD CONSTRAINT ... UNIQUE (product_id, user_id)`. Thêm điều kiện `WHERE cart_items.updated_at < EXCLUDED.updated_at` cho bài "last write wins" khi client gửi timestamp. Đổi ví dụ 3 để xoá khỏi giỏ những sku có `quantity = 0` trong mảng (gợi ý: CTE ghi dữ liệu ở 4.1).

### 6.2 Keyset (cursor) pagination — thay cho OFFSET

**Bối cảnh:** listing product cuộn vô hạn, sắp theo mới nhất. Với OFFSET, trang thứ 500 phải đọc và bỏ 10.000 dòng. Keyset thay bằng câu hỏi: "cho tôi 20 dòng đứng **sau** dòng cuối cùng tôi đã thấy", dòng cuối đó gọi là cursor.

#### Ví dụ 1 — trang kế tiếp, sort hai cột cùng chiều

```sql
-- sắp theo created_at DESC, id DESC; cursor = (created_at, id) của dòng cuối trang trước
SELECT id, name, created_at
FROM products
WHERE deleted_at IS NULL
  AND (created_at, id) < ($1, $2)       -- so sánh tuple (row comparison)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

Giả sử 6 product, trang 2 dòng, cursor sau trang 1 là `(09-29, p4)`:

| id  | created_at |     | Trang 1 | Trang 2 |
| --- | ---------- | --- | ------- | ------- |
| p6  | 09-30      |     | x       |         |
| p4  | 09-29      |     | x       |         |
| p3  | 09-29      |     |         | x       |
| p5  | 09-28      |     |         | x       |
| p2  | 09-28      |     |         |         |
| p1  | 09-27      |     |         |         |

`(created_at, id) < (09-29, p4)` nghĩa là "created_at < 09-29, **hoặc** bằng 09-29 và id < p4" — p3 lọt vì cùng ngày nhưng id nhỏ hơn. Vì thế **cột thứ hai phải duy nhất**; chỉ sort theo `created_at` sẽ mất/lặp dòng khi trùng thời gian.

- Cần index `(created_at DESC, id DESC) WHERE deleted_at IS NULL`.
- Trang thứ 1000 nhanh y như trang 1. OFFSET thì không.
- Đổi lại: không nhảy tới "trang 37", chỉ next/prev. Với infinite scroll đây là lựa chọn đúng.
- Cursor thường mã hoá base64 `{created_at, id}` gửi cho client. Biết "còn trang sau không": `LIMIT 21`, trả 20 và `hasNext = rows.length > 20`.

#### Ví dụ 2 — trang trước (keyset ngược chiều)

**Bối cảnh:** nút "Prev" với cursor là dòng **đầu** của trang hiện tại. Phải đảo dấu so sánh **và** đảo ORDER BY để lấy đúng 20 dòng ngay trước cursor, rồi đảo lại thứ tự hiển thị.

```sql
SELECT * FROM (
  SELECT id, name, created_at
  FROM products
  WHERE deleted_at IS NULL
    AND (created_at, id) > ($1, $2)      -- đảo dấu
  ORDER BY created_at ASC, id ASC        -- đảo chiều để LIMIT lấy các dòng sát cursor
  LIMIT 20
) prev
ORDER BY created_at DESC, id DESC;       -- trả về đúng thứ tự hiển thị
```

Với bảng ở ví dụ 1, đang ở trang 3 (p2, p1), cursor prev = `(09-28, p2)`:

| Bước                                 | Dòng                      |
| ------------------------------------ | ------------------------- |
| `> (09-28, p2)` ORDER BY ASC LIMIT 2 | p5, p3                    |
| Đảo lại DESC                         | p3, p5 — chính là trang 2 |

Quên đảo ORDER BY bên trong thì LIMIT 2 lấy p6, p4 (trang 1) — lỗi rất hay gặp.

#### Ví dụ 3 — sort ASC/DESC hỗn hợp: phải viết tay điều kiện OR

**Bối cảnh:** listing "giá tăng dần, cùng giá thì mới nhất trước": `ORDER BY base_price ASC, created_at DESC, id DESC`. So sánh tuple **không dùng được** vì tuple so mọi cột cùng một chiều.

**Sai:**

```sql
-- tuple so cả ba cột cùng chiều '>', nên created_at cũng bị hiểu là tăng dần
WHERE (base_price, created_at, id) > ($1, $2, $3)
```

**Đúng:**

```sql
SELECT id, base_price, created_at
FROM products
WHERE deleted_at IS NULL
  AND (
       base_price > $1
    OR (base_price = $1 AND created_at < $2)
    OR (base_price = $1 AND created_at = $2 AND id < $3)
  )
ORDER BY base_price ASC, created_at DESC, id DESC
LIMIT 20;
```

Giả sử cursor = `(100, 09-29, p4)`:

| id  | base_price | created_at | Tuple (sai) | OR (đúng)                                |
| --- | ---------- | ---------- | ----------- | ---------------------------------------- |
| p3  | 100        | 09-29      |             | x (cùng giá, cùng ngày, id nhỏ hơn)      |
| p5  | 100        | 09-28      |             | x (cùng giá, cũ hơn)                     |
| p6  | 100        | 09-30      | x           | (mới hơn cursor → đã hiện ở trang trước) |
| p2  | 120        | 09-28      | x           | x                                        |

Trên seed thật, cách sai trả 3 dòng, cách đúng trả 1.946 — sai lệch không thể bỏ qua. Mỗi nhánh OR tương ứng một cột; planner vẫn dùng được index `(base_price, created_at DESC, id DESC)` nhưng kém hiệu quả hơn tuple; nếu được, thiết kế sort cùng chiều (ví dụ lưu `-base_price` hoặc sort theo `created_at ASC`).

**Thử biến tấu:** viết cursor cho feed gộp ở 5.3 ví dụ 2 với `(created_at, kind, ref_id)`. Viết hàm mã hoá/giải mã cursor base64 trong NestJS và xử lý cursor bị sửa (giá trị không parse được). Thử `EXPLAIN` ví dụ 1 với và không có index gợi ý.

### 6.3 Ngày giờ: bucket, dãy ngày không có lỗ, múi giờ

#### Ví dụ 1 — báo cáo theo ngày không thiếu ngày trống

**Bối cảnh:** biểu đồ doanh thu 30 ngày. Nếu chỉ GROUP BY ngày từ `orders`, ngày nào không có đơn sẽ **biến mất** và biểu đồ bị gãy. Cần tự sinh dãy 30 ngày rồi LEFT JOIN doanh thu vào. Ngoài ra `created_at` lưu UTC, còn "ngày" phải tính theo giờ Việt Nam.

```sql
WITH days AS (
  SELECT generate_series(
    (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 29,
    (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
    '1 day')::date AS d
),
rev AS (
  SELECT (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS d, SUM(i.unit_price * i.quantity) AS revenue
  FROM orders o JOIN order_items i ON i.order_id = o.id
  WHERE o.status = 'delivered' AND o.created_at >= now() - interval '31 days'
  GROUP BY 1
)
SELECT days.d, COALESCE(rev.revenue, 0) AS revenue
FROM days LEFT JOIN rev ON rev.d = days.d
ORDER BY days.d;
```

| rev (chỉ ngày có đơn)  | Kết quả sau LEFT JOIN                   |
| ---------------------- | --------------------------------------- |
| 09-01: 100; 09-03: 250 | 09-01: 100; 09-02: **0**; 09-03: 250; … |

`>= now() - interval '31 days'` lấy dư một ngày để bù chênh múi giờ; điều kiện thô này giúp dùng index trên `created_at`, còn `days` lo chuyện cắt đúng.

#### Ví dụ 2 — `timestamptz` vs `timestamp`: cùng câu lệnh, kết quả khác

**Bối cảnh:** một đơn đặt lúc **23:30 ngày 01/01 giờ Việt Nam**. Nó thuộc ngày nào trong báo cáo? Phụ thuộc kiểu cột và múi giờ session.

```sql
SET timezone = 'UTC';   -- giả lập server app / DB chạy UTC (mặc định trong Docker)
SELECT '2026-01-01 23:30:00+07'::timestamptz AS tz,
       '2026-01-01 23:30:00+07'::timestamp   AS naive;
```

| tz                     | naive               |
| ---------------------- | ------------------- |
| 2026-01-01 16:30:00+00 | 2026-01-01 23:30:00 |

`timestamptz` **lưu một thời điểm** (chuẩn hoá về UTC, hiển thị theo session); `timestamp` **vứt bỏ** phần `+07` và lưu "23:30" trần trụi. Giờ tính ngày:

```sql
SELECT ('2026-01-01 23:30:00+07'::timestamptz)::date                                     AS date_session,   -- theo session (UTC)
       ('2026-01-01 23:30:00+07'::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date     AS date_vn;
```

| timezone session | date_session           | date_vn    |
| ---------------- | ---------------------- | ---------- |
| UTC              | 2026-01-01 (16:30 UTC) | 2026-01-01 |
| Asia/Ho_Chi_Minh | 2026-01-01             | 2026-01-01 |

Thay bằng đơn lúc **06:30 sáng 02/01 giờ VN** (= 23:30 01/01 UTC): `date_session` là 01/01 khi session UTC, còn `date_vn` là 02/01. Cùng một `::date`, kết quả đổi theo `SET timezone` — đó là lý do **không được** dựa vào session mà phải viết `AT TIME ZONE` tường minh.

`AT TIME ZONE` có hai nghĩa đối lập:

| Biểu thức                                     | Ý nghĩa                                                       | Kết quả (session UTC)                           |
| --------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------- |
| `timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh'` | đổi thời điểm sang giờ địa phương, trả `timestamp` không zone | `'2026-01-01 23:30+00'` → `2026-01-02 06:30:00` |
| `timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'`   | **diễn giải** giờ trần là giờ VN, trả `timestamptz`           | `'2026-01-01 23:30'` → `2026-01-01 16:30:00+00` |

Kết luận: cột luôn là `timestamptz` (schema mẫu đã đúng); chốt múi giờ trong query; đừng để FE tự đoán. So sánh khoảng ngày cũng phải theo múi giờ: `created_at >= timestamptz '2026-09-01 00:00 Asia/Ho_Chi_Minh' AND created_at < timestamptz '2026-10-01 00:00 Asia/Ho_Chi_Minh'`. Tránh `BETWEEN '2026-09-01' AND '2026-09-30'`: chuỗi ngày thành `00:00`, mất cả ngày 30 (trên seed: 8.028 vs 8.110 vs 8.189 đơn cho ba cách viết).

#### Ví dụ 3 — interval, `extract(epoch)`, tuổi đơn, tuần bắt đầu thứ hai

```sql
SELECT now() - interval '7 days'                                        AS a_week_ago,
       date '2026-01-31' + interval '1 month'                            AS end_feb,      -- 2026-02-28, không tràn sang tháng 3
       interval '1 day' * 3                                              AS three_days,
       timestamptz '2026-03-01 10:00+07' - timestamptz '2026-02-27 08:30+07' AS diff,    -- 2 days 01:30:00
       extract(epoch FROM interval '1 day 2 hours')                      AS seconds,      -- 93600
       extract(epoch FROM now())::bigint                                 AS unix_now,
       to_timestamp(1767225600)                                          AS from_unix;
```

Tuổi đơn pending (để job huỷ đơn quá hạn):

```sql
SELECT o.id, o.created_at,
       age(now(), o.created_at)                              AS age_interval,        -- '5 mons 27 days 22:44:39'
       extract(day FROM age(now(), o.created_at))::int       AS age_days_WRONG,      -- 27: chỉ phần "days", bỏ "mons"
       (now()::date - o.created_at::date)                    AS age_days,            -- 181
       extract(epoch FROM now() - o.created_at) / 3600       AS age_hours            -- 4342.7
FROM orders o WHERE o.status = 'pending' AND o.deleted_at IS NULL
ORDER BY o.created_at;
```

| age_interval            | age_days_WRONG | age_days | age_hours |
| ----------------------- | -------------- | -------- | --------- |
| 5 mons 27 days 22:44:39 | 27             | 181      | 4342.7    |

`age()` trả interval có tháng, `extract(day)` chỉ lấy trường "days" — bẫy kinh điển. Muốn tổng số ngày/giờ: trừ hai timestamp (không dùng `age`) rồi `extract(epoch)`, hoặc trừ hai `date`. Điều kiện job huỷ: `WHERE status = 'pending' AND created_at < now() - interval '24 hours'` (so trực tiếp, dùng được index).

Tuần:

```sql
SELECT date_trunc('week', date '2026-09-30')::date AS week_start,    -- 2026-09-28 (thứ hai, chuẩn ISO)
       extract(isodow FROM date '2026-09-30')      AS isodow,        -- 3 (thứ tư; isodow: 1 = thứ hai … 7 = chủ nhật)
       extract(dow FROM date '2026-09-27')         AS dow,           -- 0 (chủ nhật; dow: 0 = chủ nhật)
       to_char(date '2026-09-30', 'IYYY-IW')       AS iso_week;      -- 2026-40
-- tuần bắt đầu chủ nhật (kiểu Mỹ): tự trừ dow
SELECT date '2026-09-30' - extract(dow FROM date '2026-09-30')::int AS sunday_week_start;   -- 2026-09-27
-- ngày cuối tháng
SELECT (date_trunc('month', date '2026-02-10') + interval '1 month - 1 day')::date;          -- 2026-02-28
```

Báo cáo theo tuần đúng múi giờ: `date_trunc('week', o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date` — đổi múi giờ **trước** rồi mới trunc. Hàm hay dùng khác: `to_char(ts, 'YYYY-MM')`, `extract(hour FROM ts AT TIME ZONE '...')` cho biểu đồ "giờ vàng đặt hàng", `justify_interval`.

**Thử biến tấu:** viết báo cáo 12 tuần gần nhất không thiếu tuần trống (generate_series bước `'1 week'` từ `date_trunc('week', ...)`). Đếm đơn theo giờ trong ngày (0–23) theo giờ VN và tìm giờ cao điểm. Chạy ví dụ 2 với `SET timezone = 'Asia/Ho_Chi_Minh'` và ghi lại cột nào đổi, cột nào không.

### 6.4 GROUPING SETS / ROLLUP / CUBE — subtotal trong một query

#### Ví dụ 1 — ROLLUP: tổng theo tháng và tổng toàn bộ

**Bối cảnh:** bảng "số đơn theo tháng × trạng thái" có dòng tổng mỗi tháng và dòng tổng cuối bảng. Không ROLLUP thì phải UNION ALL ba query.

```sql
SELECT date_trunc('month', o.created_at)::date AS month, o.status, COUNT(*)
FROM orders o
GROUP BY ROLLUP (1, 2)     -- = GROUPING SETS ((1,2), (1), ())
ORDER BY 1, 2;
```

Giả sử tháng 8 có 3 delivered + 1 cancelled, tháng 9 có 2 delivered:

| month      | status    | count            |
| ---------- | --------- | ---------------- |
| 2026-08-01 | cancelled | 1                |
| 2026-08-01 | delivered | 3                |
| 2026-08-01 | NULL      | 4 ← tổng tháng 8 |
| 2026-09-01 | delivered | 2                |
| 2026-09-01 | NULL      | 2                |
| NULL       | NULL      | 6 ← tổng toàn bộ |

`ROLLUP (a, b)` sinh các mức `(a,b)`, `(a)`, `()` — phân cấp từ phải sang trái. `CUBE (a, b)` sinh mọi tổ hợp (thêm `(b)`: tổng theo status không phân tháng). `GROUPING SETS ((1), (2))` tự chọn: chỉ tổng theo tháng và tổng theo status, không có chi tiết.

#### Ví dụ 2 — `GROUPING()` để phân biệt NULL tổng và NULL dữ liệu

**Bối cảnh:** đếm số danh mục con theo danh mục cha. Danh mục gốc có `parent_id` NULL — đó là NULL **dữ liệu thật**. ROLLUP lại sinh thêm một dòng tổng với parent NULL. Nhìn cột thì hai NULL giống hệt nhau.

```sql
SELECT parent.name AS parent_name, COUNT(*) AS children, GROUPING(parent.name) AS is_total
FROM categories c
LEFT JOIN categories parent ON parent.id = c.parent_id
WHERE c.deleted_at IS NULL
GROUP BY ROLLUP (parent.name)
ORDER BY is_total, parent_name NULLS FIRST;
```

Giả sử 2 gốc, gốc "Thời trang" có 2 con, gốc "Điện tử" có 1 con:

| parent_name | children | is_total                      |
| ----------- | -------- | ----------------------------- |
| NULL        | 2        | 0 ← NULL thật: 2 danh mục gốc |
| Điện tử     | 1        | 0                             |
| Thời trang  | 2        | 0                             |
| NULL        | 5        | 1 ← dòng tổng do ROLLUP sinh  |

`GROUPING(col)` trả 1 khi cột đó bị "gộp" (không nằm trong grouping set của dòng), 0 khi là giá trị thật. Đối số phải là **đúng biểu thức** trong GROUP BY. Hiển thị cho người: `COALESCE(parent.name, CASE WHEN GROUPING(parent.name) = 1 THEN '(tổng)' ELSE '(gốc)' END)`. Với nhiều cột, `GROUPING(a, b)` trả bitmask: `0` chi tiết, `1` gộp b, `3` gộp cả hai — tiện để gán nhãn "chi tiết / tổng tháng / tổng toàn bộ" trong một CASE.

**Bẫy:** `ORDER BY 1, 2` với NULL: Postgres xếp NULL **cuối** khi ASC, nên dòng tổng tháng tự rơi xuống dưới các dòng chi tiết — tiện; nhưng nếu sort DESC thì NULL lên đầu, thêm `NULLS LAST`.

**Thử biến tấu:** thay ROLLUP bằng CUBE ở ví dụ 1 và đếm số dòng thêm ra. Viết báo cáo doanh thu theo brand × tháng có subtotal, dùng `GROUPING()` để gán nhãn. Với ví dụ 2, thêm cấp thứ hai (ông → cha → con) bằng ROLLUP hai cột.

### 6.5 Conditional aggregation — pivot đơn giản

#### Ví dụ 1 — cột theo trạng thái

```sql
SELECT date_trunc('month', created_at)::date AS month,
  COUNT(*) FILTER (WHERE status = 'delivered') AS delivered,
  COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
  COUNT(*) FILTER (WHERE status = 'returned')  AS returned
FROM orders GROUP BY 1 ORDER BY 1;
```

| month      | delivered | cancelled | returned |
| ---------- | --------- | --------- | -------- |
| 2026-08-01 | 3         | 1         | 0        |
| 2026-09-01 | 2         | 0         | 1        |

Đây là "pivot" kiểu Postgres: mỗi giá trị muốn thành cột là một `FILTER`. Số cột phải biết trước khi viết query — pivot động (cột theo dữ liệu) cần extension `tablefunc` với hàm `crosstab`, hoặc trả về dạng dài rồi để app/FE pivot. Thực tế đa số dashboard biết trước cột nên FILTER là đủ.

#### Sai / Đúng — `SUM(CASE)` thay `FILTER`

`SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END)` tương đương `COUNT(*) FILTER (...)` (và là cách viết cho MySQL). Nhưng với AVG thì khác:

```sql
SELECT r.product_id,
  round(AVG(CASE WHEN r.rating >= 4 THEN r.rating ELSE 0 END), 2) AS avg_wrong,
  round(AVG(r.rating) FILTER (WHERE r.rating >= 4), 2)            AS avg_good,
  round(AVG(CASE WHEN r.rating >= 4 THEN r.rating END), 2)        AS avg_case_null
FROM reviews r WHERE r.product_id = $1 GROUP BY 1;
```

Giả sử 3 review: 5, 4, 2:

| avg_wrong            | avg_good | avg_case_null |
| -------------------- | -------- | ------------- |
| **3.00** ((5+4+0)/3) | 4.50     | 4.50          |

`ELSE 0` đưa dòng không thoả vào mẫu số. `FILTER` (hoặc `CASE` không ELSE, trả NULL, vì AVG bỏ NULL) mới đúng. FILTER còn rõ ý và nhanh hơn một chút.

#### Ví dụ 2 — pivot doanh thu brand × tháng, và unpivot ngược lại

**Bối cảnh:** bảng so sánh doanh thu 3 tháng của từng brand (`orders → order_items → skus → products → brands`).

```sql
SELECT b.name,
  SUM(i.unit_price * i.quantity) FILTER (WHERE o.created_at >= date '2026-07-01' AND o.created_at < date '2026-08-01') AS jul,
  SUM(i.unit_price * i.quantity) FILTER (WHERE o.created_at >= date '2026-08-01' AND o.created_at < date '2026-09-01') AS aug,
  SUM(i.unit_price * i.quantity) FILTER (WHERE o.created_at >= date '2026-09-01' AND o.created_at < date '2026-10-01') AS sep
FROM orders o
JOIN order_items i ON i.order_id = o.id
JOIN skus s        ON s.id = i.sku_id
JOIN products p    ON p.id = s.product_id
JOIN brands b      ON b.id = p.brand_id
WHERE o.status = 'delivered' AND o.deleted_at IS NULL
GROUP BY b.name ORDER BY b.name;
```

| name    | jul    | aug    | sep    |
| ------- | ------ | ------ | ------ |
| Brand 1 | 322234 | 271737 | 319008 |
| Brand 2 | 410000 | NULL   | 12000  |

Brand không bán tháng nào thì cột đó NULL (SUM trên tập rỗng), bọc `COALESCE(..., 0)` nếu FE cần số. Chuỗi JOIN 5 bảng ở đây **không nhân dòng** vì đi theo chiều n-1 (mỗi order_item → 1 sku → 1 product → 1 brand). Lưu ý `sku_id` nullable: dòng hàng của sku đã xoá cứng bị rớt khỏi báo cáo — chấp nhận hay dùng LEFT JOIN, phải quyết định rõ.

Unpivot (cột → dòng) cho biểu đồ: `CROSS JOIN LATERAL (VALUES ('base', p.base_price), ('list', p.list_price)) AS v(kind, price)` biến một product thành hai dòng `base`/`list`.

**Thử biến tấu:** thêm cột `pct_positive` = % review ≥ 4 sao cho từng product bằng hai FILTER chia nhau. Viết pivot "số đơn theo ngày trong tuần (T2…CN) × trạng thái". Thử `CREATE EXTENSION tablefunc` trên DB học và đọc doc `crosstab` để thấy vì sao FILTER thường đủ.

---

## Tự kiểm tra cuối giai đoạn 2

- [ ] Giải thích được vì sao JOIN 2 bảng con rồi GROUP BY cho kết quả SUM sai, và cách sửa.
- [ ] Viết top-3 mỗi nhóm bằng cả window lẫn LATERAL; nói được khi nào cái nào nhanh hơn, và RANK/ROW_NUMBER khác nhau thế nào khi tie.
- [ ] Viết trung bình trượt 7 ngày và giải thích khác biệt ROWS/RANGE, frame mặc định.
- [ ] Viết anti-join bằng NOT EXISTS mà không dùng NOT IN; đọc được plan của 3 cách viết.
- [ ] Trả nested JSON (product kèm mảng skus) trong một query.
- [ ] Viết keyset pagination với 2 cột sort, cả trang sau lẫn trang trước, và nói được index cần có.
- [ ] Viết báo cáo theo ngày không bị thiếu ngày trống, đúng múi giờ; giải thích timestamptz vs timestamp.
- [ ] Dùng GROUPING() để phân biệt NULL tổng và NULL dữ liệu.
- [ ] Hoàn thành bài 11–20 trong [05-exercises.md](05-exercises.md).

**Tiếp theo**: [03-advanced.md](03-advanced.md).
