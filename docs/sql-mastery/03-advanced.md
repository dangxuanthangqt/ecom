# 03 · Nâng cao (tuần 7–9)

Mục tiêu: hiểu DB làm gì bên dưới câu lệnh của bạn. Đây là giai đoạn tách "người viết được query" khỏi "người sửa được production lúc 2 giờ sáng". Ba trụ cột: **index & plan**, **transaction & lock**, **cấu trúc nâng cao** (recursive, materialized view, partition).

Ví dụ chạy trên schema mẫu [schema.sql](schema.sql); seed 50k đơn là cố ý để plan có ý nghĩa. Bài tập tương ứng: mức 3 trong [05-exercises.md](05-exercises.md).

**Về các output trong file này.** Mọi plan `EXPLAIN (ANALYZE, BUFFERS)`, mọi thông báo lỗi và mọi kịch bản hai phiên dưới đây đều được chạy thật trên PostgreSQL 15.19, DB tạm nạp từ `schema.sql`. Số liệu thời gian (ms) sẽ khác trên máy bạn; số dòng (`rows`), số block (`Buffers`) và **hình dạng plan** thì sẽ giống. UUID trong ví dụ là của lần seed cụ thể đó; bạn thay bằng id trong DB của mình (mẹo: `SELECT id FROM ... LIMIT 1 \gset` trong psql rồi dùng `:'id'`). Kịch bản hai phiên được tái hiện bằng hai kết nối `psql` song song, dùng `pg_sleep()` để sắp thứ tự; bạn tự tái hiện bằng hai cửa sổ terminal là đủ.

---

## Tuần 7 · Index và đọc EXPLAIN ANALYZE

### 7.1 B-tree index hoạt động thế nào (đủ để ra quyết định)

Index B-tree là một cây cân bằng, mỗi node chứa các giá trị **đã sắp xếp** của cột được index; node lá chứa giá trị kèm con trỏ (`ctid`) tới dòng thật trong bảng (heap). Với 50.000 đơn, index trên `created_at` chỉ sâu 2–3 tầng:

```
                        ┌─────────────────────────────┐
  root                  │  2026-04-01 | 2026-07-01     │   ← "nhỏ hơn 04-01 sang trái, ..."
                        └──────┬──────────┬───────────┘
              ┌────────────────┘          └────────────────┐
     ┌────────┴────────┐                          ┌────────┴────────┐
     │ 04-05 │ 05-20   │  ...  (tầng trong)       │ 08-10 │ 09-15   │
     └───┬───────┬─────┘                          └───┬───────┬─────┘
         │       │                                    │       │
   ┌─────┴─┐ ┌───┴───┐                          ┌─────┴─┐ ┌───┴───┐
   │04-01  │ │04-05  │  ...   lá (leaf)         │08-10  │ │09-15  │   ← mỗi lá: giá trị + ctid
   │04-02  │ │04-06  │                          │08-11  │ │09-16  │      lá nối nhau bằng con trỏ
   │  ...  │→│  ...  │→                        →│  ...  │→│  ...  │      để quét theo khoảng
   └───────┘ └───────┘                          └───────┘ └───────┘
       ↓          ↓                                  ↓         ↓
   heap (bảng orders): dòng thật nằm rải rác, không theo thứ tự nào
```

Ba hệ quả bạn dùng hàng ngày:

1. **Tìm bằng so sánh thì nhanh**: `=`, `<`, `>`, `BETWEEN`, `IN`, `LIKE 'abc%'` đi từ root xuống lá bằng vài lần so sánh (`Buffers: shared hit=3–4` là đi 3–4 block), rồi đọc heap đúng những dòng cần.
2. **Lá đã sắp xếp** nên `ORDER BY` theo cột index không cần node `Sort`; đi ngược từ cuối lá là `Index Scan Backward` cho `ORDER BY ... DESC`.
3. **Giá trị bị biến đổi thì cây vô dụng**: `lower(email)`, `created_at::date`, `LIKE '%abc'` không đi được từ root vì không biết rẽ trái hay phải. Muốn dùng phải index đúng biểu thức đó (§7.2.3) hoặc kiểu index khác (GIN, §7.2.4–7.2.5).

**Bối cảnh cho cả mục:** bảng `orders` (50.000 dòng, `users` → `orders` 1-n). Ta tạo index kết hợp `(user_id, created_at DESC)` để phục vụ màn "lịch sử đơn của tôi", rồi xem index đó trả lời được những query nào.

```sql
CREATE INDEX orders_user_created_idx ON orders (user_id, created_at DESC) WHERE deleted_at IS NULL;
```

#### Ví dụ 1 — tìm bằng `=` trên cột đầu tiên (a)

**Bối cảnh:** đếm số đơn của một khách.

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM orders
WHERE user_id = '09d57b48-476f-4441-b8b4-f0b67464dbd3' AND deleted_at IS NULL;
```

```
Aggregate  (cost=5.12..5.12 rows=1 width=8) (actual time=0.028..0.029 rows=1 loops=1)
  Buffers: shared hit=4
  ->  Index Only Scan using orders_user_created_idx on orders  (cost=0.41..5.03 rows=35 width=0) (actual time=0.022..0.024 rows=28 loops=1)
        Index Cond: (user_id = '09d57b48-476f-4441-b8b4-f0b67464dbd3'::uuid)
        Heap Fetches: 0
        Buffers: shared hit=4
Execution Time: 0.068 ms
```

Đọc plan: `Index Cond` là điều kiện được đẩy vào cây (rẽ nhánh); đi qua 4 block (`shared hit=4`: root → tầng trong → lá, cộng 1 block visibility map); planner ước 35 dòng, thật 28 — ước tốt. `Index Only Scan` vì `count(*)` không cần cột nào ngoài index (§7.2.2).

#### Ví dụ 2 — `=` trên a **và** khoảng trên b

**Bối cảnh:** số đơn của khách đó trong 30 ngày qua.

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM orders
WHERE user_id = '09d57b48-476f-4441-b8b4-f0b67464dbd3'
  AND created_at >= now() - interval '30 days' AND deleted_at IS NULL;
```

```
Aggregate  (cost=4.55..4.56 rows=1 width=8) (actual time=0.025..0.026 rows=1 loops=1)
  ->  Index Only Scan using orders_user_created_idx on orders  (cost=0.42..4.54 rows=6 width=0) (actual time=0.022..0.023 rows=3 loops=1)
        Index Cond: ((user_id = '09d57b48-...'::uuid) AND (created_at >= (now() - '30 days'::interval)))
        Heap Fetches: 0
        Buffers: shared hit=4
Execution Time: 0.058 ms
```

Cả hai điều kiện đều nằm trong `Index Cond`: cây rẽ theo `user_id`, rồi trong nhóm lá của user đó đi tiếp theo `created_at`. Đây là lý do thứ tự cột là **cột lọc bằng `=` trước, cột lọc bằng khoảng / sort sau**.

#### Ví dụ 3 — chỉ có b: quy tắc left-most prefix

**Bối cảnh:** đếm đơn của **mọi khách** trong 24 giờ qua. Cùng index, nhưng WHERE không có `user_id`.

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM orders
WHERE created_at >= now() - interval '1 day' AND deleted_at IS NULL;
```

```
Aggregate  (cost=1374.56..1374.57 rows=1 width=8) (actual time=6.342..6.343 rows=1 loops=1)
  Buffers: shared hit=499
  ->  Seq Scan on orders  (cost=0.00..1374.00 rows=223 width=0) (actual time=0.092..6.329 rows=145 loops=1)
        Filter: ((deleted_at IS NULL) AND (created_at >= (now() - '1 day'::interval)))
        Rows Removed by Filter: 49855
        Buffers: shared hit=499
Execution Time: 6.378 ms
```

Planner bỏ index, quét 499 block của bảng, loại 49.855 dòng để giữ 145. Vì sao index không giúp được? Lá sắp theo `user_id` trước; các đơn "hôm qua" nằm rải rác trong **mọi** nhóm user, không có chỗ nào để "rẽ". Ép Postgres dùng index để thấy nó tệ ngang nhau:

```sql
SET enable_seqscan = off;   -- chỉ để thí nghiệm, không bao giờ để trên production
EXPLAIN (ANALYZE, BUFFERS) SELECT count(*) FROM orders WHERE created_at >= now() - interval '1 day' AND deleted_at IS NULL;
```

```
->  Index Only Scan using orders_user_created_idx on orders  (cost=0.42..1381.65 rows=223 width=0) (actual time=0.084..6.302 rows=145 loops=1)
      Index Cond: (created_at >= (now() - '1 day'::interval))
      Buffers: shared hit=4 read=246
Execution Time: 6.397 ms
```

Nó phải đọc **toàn bộ 246 block lá** của index (điều kiện `created_at` không rẽ được, chỉ lọc từng entry), thời gian y hệt Seq Scan. Quy tắc: index `(a, b, c)` phục vụ WHERE có `a`, `a+b`, `a+b+c`; không phục vụ `b`, `c`, `b+c`. Muốn phục vụ ví dụ 3 cần index riêng bắt đầu bằng `created_at` (§7.2.6).

**Sai / Đúng:**

| Sai                                                        | Đúng                                                                 | Hậu quả nếu sai                                                                                                                       |
| ---------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Tạo `(deleted_at, user_id)` vì "cột nào cũng lọc"          | `(user_id) WHERE deleted_at IS NULL`                                 | `deleted_at` có 1 giá trị (NULL) ở 100% dòng; cây rẽ theo nó vô nghĩa, và query chỉ có `user_id` không dùng được index                |
| Tạo `(created_at, user_id)` cho màn "đơn của tôi"          | `(user_id, created_at DESC)`                                         | Query lọc `user_id = $1` chỉ dùng được index nếu `created_at` nằm trước — mà nó không có trong WHERE → Seq Scan 499 block như ví dụ 3 |
| Tin rằng cột ít giá trị (`status`) không bao giờ nên index | Đặt nó **đầu** index kết hợp `(status, created_at)` hoặc làm partial | `WHERE status = 'pending' AND created_at >= ...` thành Index Only Scan 5 block (§7.4)                                                 |

**Thử biến tấu:** đổi ví dụ 2 thành `created_at BETWEEN ... AND ...` rồi thêm `ORDER BY created_at DESC LIMIT 5` — plan còn node `Sort` không? Tạo thêm index `(user_id, status)` và chạy `WHERE user_id = $1 AND status = 'paid'`: planner chọn index nào, và nếu bỏ index mới thì `status` xuất hiện ở `Index Cond` hay `Filter`?

### 7.2 Các loại index bạn sẽ thực sự dùng

Bảng tóm tắt, chi tiết và plan thật ở các mục con:

```sql
-- 1. Composite: thứ tự cột = thứ tự lọc rồi sort
CREATE INDEX orders_user_created_idx ON orders (user_id, created_at DESC) WHERE deleted_at IS NULL;

-- 2. Partial: chỉ index phần dữ liệu hay truy vấn (soft delete, trạng thái "đang chờ")
CREATE INDEX orders_created_pending_idx ON orders (created_at) WHERE status = 'pending';

-- 3. Covering (INCLUDE): trả lời query hoàn toàn từ index, không đụng bảng (Index Only Scan)
CREATE INDEX skus_product_price_idx ON skus (product_id) INCLUDE (price, stock);

-- 4. Expression: cho search không phân biệt hoa thường
CREATE INDEX users_email_lower_idx ON users (lower(email));

-- 5. GIN cho jsonb / array
CREATE INDEX products_attributes_gin ON products USING gin (attributes);
CREATE INDEX products_images_gin     ON products USING gin (images);

-- 6. Trigram cho LIKE '%x%' (extension pg_trgm, schema mẫu đã bật)
CREATE INDEX products_name_trgm ON products USING gin (name gin_trgm_ops);

-- 7. Unique partial: email unique trong số chưa xoá (schema mẫu đã có)
CREATE UNIQUE INDEX users_email_active_uq ON users (email) WHERE deleted_at IS NULL;
```

#### 7.2.1 Partial index — nhỏ hơn bao nhiêu

**Bối cảnh:** màn "đơn chờ xử lý" của admin chỉ xem đơn `pending` (12% dữ liệu), sắp theo thời gian tạo. So sánh index đầy đủ trên `created_at` với partial index cùng cột.

```sql
CREATE INDEX orders_created_full_idx    ON orders (created_at);
CREATE INDEX orders_created_pending_idx ON orders (created_at) WHERE status = 'pending';

SELECT relname, pg_size_pretty(pg_relation_size(oid)) AS size
FROM pg_class WHERE relname IN ('orders', 'orders_created_full_idx', 'orders_created_pending_idx');
```

```
          relname           |  size
----------------------------+---------
 orders                     | 3992 kB
 orders_created_full_idx    | 1112 kB
 orders_created_pending_idx | 152 kB      ← 1/7 kích thước, và INSERT đơn không-pending không phải đụng nó
```

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM orders WHERE status = 'pending' ORDER BY created_at LIMIT 20;
```

```
Limit  (cost=0.28..7.26 rows=20 width=24) (actual time=0.019..0.030 rows=20 loops=1)
  ->  Index Scan using orders_created_pending_idx on orders  (cost=0.28..2165.10 rows=6205 width=24) (actual time=0.018..0.028 rows=20 loops=1)
        Buffers: shared hit=19 read=2
Execution Time: 0.061 ms
```

Không có `Index Cond` lẫn `Filter` cho `status`: điều kiện đã "nằm trong" index, planner chỉ cần chứng minh WHERE của query **bao hàm** WHERE của index. Chứng minh đó phải là so khớp văn bản gần như y nguyên; đổi giá trị là mất:

```sql
EXPLAIN (ANALYZE) SELECT id FROM orders WHERE status = 'paid' ORDER BY created_at LIMIT 20;
```

```
Limit  (cost=1288.77..1288.82 rows=20 width=24) (actual time=3.776..3.779 rows=20 loops=1)
  ->  Sort  (cost=1288.77..1304.25 rows=6192 width=24) (actual time=3.775..3.776 rows=20 loops=1)
        Sort Key: created_at
        Sort Method: top-N heapsort  Memory: 27kB
        ->  Seq Scan on orders  (cost=0.00..1124.00 rows=6192 width=24) (actual time=0.008..3.246 rows=6252 loops=1)
              Filter: (status = 'paid'::text)
              Rows Removed by Filter: 43748
Execution Time: 3.833 ms
```

60 lần chậm hơn. Partial index là công cụ **cho một query cụ thể**; với tham số thay đổi (`status = $1`) planner không thể chứng minh nên không dùng — khi đó dùng composite `(status, created_at)` (1840 kB, phục vụ mọi status).

#### 7.2.2 Covering index và Index Only Scan — `Heap Fetches` nói gì

**Bối cảnh:** trang chi tiết product cần giá và tồn của từng sku (`products` → `skus` 1-n). Query chỉ cần `price, stock`, lọc theo `product_id`.

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT price, stock FROM skus WHERE product_id = 'b709cb9a-7a2d-4e1e-b4d6-79dd8bc770a0';
```

Trước, với index thường `skus_product_idx (product_id)`:

```
Bitmap Heap Scan on skus  (cost=4.30..11.17 rows=2 width=11) (actual time=0.020..0.022 rows=4 loops=1)
  Recheck Cond: (product_id = 'b709cb9a-...'::uuid)
  Heap Blocks: exact=2
  Buffers: shared hit=4
  ->  Bitmap Index Scan on skus_product_idx  (cost=0.00..4.30 rows=2 width=0) (actual time=0.015..0.015 rows=4 loops=1)
        Index Cond: (product_id = 'b709cb9a-...'::uuid)
        Buffers: shared hit=2
Execution Time: 0.076 ms
```

Index chỉ biết `product_id` → phải sang heap (2 block) lấy `price, stock`. Sau khi tạo covering index:

```sql
CREATE INDEX skus_product_price_idx ON skus (product_id) INCLUDE (price, stock);
```

```
Index Only Scan using skus_product_price_idx on skus  (cost=0.28..4.32 rows=2 width=11) (actual time=0.024..0.025 rows=4 loops=1)
  Index Cond: (product_id = 'b709cb9a-...'::uuid)
  Heap Fetches: 0
  Buffers: shared hit=1 read=2
Execution Time: 0.068 ms
```

`Heap Fetches: 0` — không đụng bảng. Bây giờ UPDATE 4 sku đó (tạo phiên bản dòng mới, §8.1) rồi chạy lại:

```sql
UPDATE skus SET stock = stock WHERE product_id = 'b709cb9a-7a2d-4e1e-b4d6-79dd8bc770a0';
```

```
Index Only Scan using skus_product_price_idx on skus  (...) (actual time=0.011..0.012 rows=4 loops=1)
  Index Cond: (product_id = 'b709cb9a-...'::uuid)
  Heap Fetches: 4
  Buffers: shared hit=5
```

`Heap Fetches: 4`: index không biết phiên bản dòng nào còn nhìn thấy được với transaction hiện tại (thông tin đó nằm ở heap), nên với block chưa được đánh dấu "all-visible" trong **visibility map** nó phải ghé heap kiểm tra. Sau `VACUUM skus;` → `Heap Fetches: 0` trở lại. Trên bảng ghi liên tục, Index Only Scan có thể "hụt" thành gần như Index Scan thường; `Heap Fetches` cao so với `rows` là dấu hiệu autovacuum không theo kịp.

Bảng bé nên chênh lệch thời gian không thấy; điểm cần nhớ là **số block**: 4 → 3, và trên bảng triệu dòng với query lấy hàng nghìn dòng thì "không đụng heap" là chênh lệch 10 lần.

#### 7.2.3 Expression index — phải viết query đúng biểu thức

**Bối cảnh:** login bằng email không phân biệt hoa thường: `WHERE lower(email) = lower($1)`.

```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM users WHERE lower(email) = lower('USER123@example.com');
```

Trước:

```
Seq Scan on users  (cost=0.00..149.00 rows=25 width=16) (actual time=0.038..1.381 rows=1 loops=1)
  Filter: (lower(email) = 'user123@example.com'::text)
  Rows Removed by Filter: 4999
  Buffers: shared hit=74
Execution Time: 1.404 ms
```

Lưu ý `rows=25` ước vs `rows=1` thật: planner không có thống kê cho biểu thức `lower(email)` nên đoán mò. Sau:

```sql
CREATE INDEX users_email_lower_idx ON users (lower(email));
```

```
Bitmap Heap Scan on users  (cost=4.48..56.86 rows=25 width=16) (actual time=0.013..0.014 rows=1 loops=1)
  Recheck Cond: (lower(email) = 'user123@example.com'::text)
  Heap Blocks: exact=1
  ->  Bitmap Index Scan on users_email_lower_idx  (cost=0.00..4.47 rows=25 width=0) (actual time=0.011..0.011 rows=1 loops=1)
        Index Cond: (lower(email) = 'user123@example.com'::text)
Execution Time: 0.049 ms
```

(Tạo expression index cũng tạo thống kê cho biểu thức; sau `ANALYZE users` ước lượng sẽ về đúng 1.)

**Sai / Đúng:**

```sql
-- Sai: index trên lower(email) nhưng query so sánh email thô
SELECT id FROM users WHERE email = lower($1);
-- → Seq Scan, Filter: (email = 'user123@example.com'), 4999 dòng bị loại. Index không bao giờ được xét
--   vì vế trái là "email", không phải "lower(email)".

-- Đúng: vế trái y hệt biểu thức trong index
SELECT id FROM users WHERE lower(email) = lower($1);
```

Hậu quả thực tế: login chậm 30 lần ở giờ cao điểm, và không ai nghi ngờ vì "đã có index trên email".

#### 7.2.4 GIN cho jsonb `@>`

**Bối cảnh:** `products.attributes` là jsonb kiểu `{"color": ["red","blue"], "size": ["S","M","L"], "material": "cotton"}`. Filter "chất liệu cotton" — chỉ ~2% product có thuộc tính này.

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, name FROM products WHERE attributes @> '{"material": "cotton"}' AND deleted_at IS NULL;
```

Trước:

```
Seq Scan on products  (cost=0.00..86.00 rows=39 width=28) (actual time=0.026..0.384 rows=37 loops=1)
  Filter: ((deleted_at IS NULL) AND (attributes @> '{"material": "cotton"}'::jsonb))
  Rows Removed by Filter: 1963
  Buffers: shared hit=61
```

Sau `CREATE INDEX products_attributes_gin ON products USING gin (attributes);`:

```
Bitmap Heap Scan on products  (cost=16.31..74.51 rows=39 width=28) (actual time=0.088..0.132 rows=37 loops=1)
  Recheck Cond: (attributes @> '{"material": "cotton"}'::jsonb)
  Filter: (deleted_at IS NULL)
  Rows Removed by Filter: 3
  Heap Blocks: exact=28
  Buffers: shared hit=34
  ->  Bitmap Index Scan on products_attributes_gin  (cost=0.00..16.30 rows=40 width=0) (actual time=0.080..0.080 rows=40 loops=1)
        Index Cond: (attributes @> '{"material": "cotton"}'::jsonb)
        Buffers: shared hit=6
Execution Time: 0.154 ms
```

Đọc: GIN trả 40 ứng viên (`Bitmap Index Scan rows=40`), heap loại thêm 3 dòng đã soft-delete (`Filter`). GIN luôn đi cùng `Bitmap Heap Scan` vì nó trả về tập vị trí, không phải thứ tự.

Hai lưu ý làm GIN vô dụng:

- Toán tử phải là toán tử GIN hỗ trợ: `@>`, `?`, `?|`, `?&` (với opclass mặc định `jsonb_ops`). Viết `attributes->'color' ? 'black'` (toán tử `->` trước) → Seq Scan, thí nghiệm thật ra `Filter: ((attributes -> 'color') ? 'black')`. Viết `attributes @> '{"color": ["black"]}'` thì dùng được.
- Điều kiện khớp quá nhiều dòng thì planner vẫn Seq Scan: `@> '{"color": ["black"]}'` khớp 1/3 bảng → Seq Scan dù index tồn tại (đã thử: plan y hệt trước/sau). Đó là §7.4, không phải lỗi GIN.

#### 7.2.5 pg_trgm cho `ILIKE '%x%'`

**Bối cảnh:** ô tìm kiếm tên sản phẩm gõ gì tìm đó, không phân biệt hoa thường: `name ILIKE '%duct 199%'` (khớp 11/2000 dòng).

Trước (không index nào áp dụng được cho `%...%`):

```
Seq Scan on products  (cost=0.00..86.00 rows=1 width=28) (actual time=0.080..0.782 rows=11 loops=1)
  Filter: (name ~~* '%duct 199%'::text)
  Rows Removed by Filter: 1989
  Buffers: shared hit=61
Execution Time: 0.818 ms
```

Sau `CREATE INDEX products_name_trgm ON products USING gin (name gin_trgm_ops);`:

```
Bitmap Heap Scan on products  (cost=60.00..64.01 rows=1 width=28) (actual time=0.133..0.140 rows=11 loops=1)
  Recheck Cond: (name ~~* '%duct 199%'::text)
  Heap Blocks: exact=2
  Buffers: shared hit=17
  ->  Bitmap Index Scan on products_name_trgm  (cost=0.00..60.00 rows=1 width=0) (actual time=0.128..0.128 rows=11 loops=1)
        Index Cond: (name ~~* '%duct 199%'::text)
        Buffers: shared hit=15
Execution Time: 0.251 ms
```

`~~*` là `ILIKE`. Index tách chuỗi thành bộ ba ký tự ("duc", "uct", "ct ", ...) nên **chuỗi tìm dưới 3 ký tự thì gần như vô dụng** (`'%ab%'` → planner quay lại Seq Scan). Kích thước: index trgm 144 kB cho bảng 488 kB; trên bảng text dài, trgm có thể lớn hơn cả bảng. Với pattern khớp nhiều dòng (`'%duct 19%'`, 111 dòng) planner đã chọn Seq Scan — cùng lý do §7.4.

#### 7.2.6 Index cho `ORDER BY ... LIMIT` — Index Scan Backward

**Bối cảnh:** dashboard "10 đơn mới nhất toàn hệ thống".

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, created_at FROM orders WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 10;
```

Trước:

```
Limit  (cost=2079.48..2079.51 rows=10 width=24) (actual time=8.351..8.354 rows=10 loops=1)
  ->  Sort  (cost=2079.48..2204.48 rows=50000 width=24) (actual time=8.350..8.351 rows=10 loops=1)
        Sort Key: created_at DESC
        Sort Method: top-N heapsort  Memory: 26kB
        ->  Seq Scan on orders  (cost=0.00..999.00 rows=50000 width=24) (actual time=0.005..4.444 rows=50000 loops=1)
              Filter: (deleted_at IS NULL)
              Buffers: shared hit=499
Execution Time: 8.398 ms
```

Đọc 50.000 dòng, sort giữ top 10 (`top-N heapsort` là dạng Sort rẻ nhất, nhưng vẫn phải đọc hết). Sau:

```sql
CREATE INDEX orders_created_idx ON orders (created_at) WHERE deleted_at IS NULL;
```

```
Limit  (cost=0.29..0.95 rows=10 width=24) (actual time=0.066..0.073 rows=10 loops=1)
  ->  Index Scan Backward using orders_created_idx on orders  (cost=0.29..3302.29 rows=50000 width=24) (actual time=0.065..0.072 rows=10 loops=1)
        Buffers: shared hit=10 read=2
Execution Time: 0.102 ms
```

80 lần nhanh hơn. Chú ý `rows=50000` ước ở node Index Scan: planner ước cho trường hợp đọc hết, nhưng `Limit` dừng sau 10 dòng (`actual rows=10`), chỉ đụng 12 block. `Backward` = đi từ lá cuối về đầu; index `ASC` phục vụ được `DESC` và ngược lại với **một** cột.

Với keyset pagination (file 02) `ORDER BY created_at DESC, id DESC`, index một cột chỉ giúp một phần:

```
Limit  (actual time=0.095..0.097 rows=10 loops=1)
  ->  Incremental Sort  (cost=0.37..5547.25 rows=50000 width=24)
        Sort Key: created_at DESC, id DESC
        Presorted Key: created_at
        ->  Index Scan Backward using orders_created_idx on orders (actual rows=11 loops=1)
```

`Incremental Sort` sort thêm theo `id` trong từng nhóm `created_at` bằng nhau — rẻ, nhưng tạo index `(created_at DESC, id DESC) WHERE deleted_at IS NULL` thì plan thành `Index Only Scan` thẳng, 3 block, 0.051 ms. Với nhiều cột, chiều `ASC/DESC` của từng cột phải khớp ORDER BY (hoặc khớp toàn bộ khi đảo ngược).

#### 7.2.7 Index thừa, index đè nhau

Sau các thí nghiệm trên, `orders` có:

```sql
SELECT indexrelid::regclass AS index, indkey::text AS cols, pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_index WHERE indrelid = 'orders'::regclass ORDER BY 2;
```

```
           index            | cols |  size
----------------------------+------+---------
 orders_pkey                | 1    | 2200 kB
 orders_user_idx            | 2    | 608 kB    ← (user_id)
 orders_user_created_idx    | 2 4  | 2008 kB   ← (user_id, created_at) partial
 orders_created_pending_idx | 4    | 152 kB
 orders_created_idx         | 4    | 1112 kB
```

`orders_user_idx (user_id)` là **prefix** của `orders_user_created_idx (user_id, created_at)`: mọi query index 1 phục vụ được, index 2 cũng phục vụ được (§7.1 ví dụ 1). Nhưng ở đây index 2 là partial (`WHERE deleted_at IS NULL`) nên chưa thừa hẳn: query không lọc `deleted_at` vẫn cần index 1. Trên `skus` thì rõ ràng:

```sql
SELECT a.indexrelid::regclass AS thua, b.indexrelid::regclass AS bao_boi
FROM pg_index a JOIN pg_index b ON a.indrelid = b.indrelid AND a.indexrelid <> b.indexrelid
WHERE b.indkey::text LIKE a.indkey::text || ' %'      -- cột của a là prefix của b
  AND a.indpred IS NULL AND b.indpred IS NULL AND NOT a.indisunique;
```

```
       thua       |        bao_boi
------------------+------------------------
 skus_product_idx | skus_product_price_idx
```

`skus_product_idx (product_id)` thừa hoàn toàn khi có `(product_id) INCLUDE (price, stock)`; giữ cả hai nghĩa là mỗi INSERT/UPDATE sku ghi 2 index. Xoá cái bé. Kiểm tra trước bằng `pg_stat_user_indexes.idx_scan` (§7.5) để chắc không ai dùng.

#### 7.2.8 Cái giá của index

- Mỗi INSERT/UPDATE/DELETE phải cập nhật **mọi** index của bảng (UPDATE chỉ tránh được với HOT update khi cột đổi không nằm trong index nào). Bảng ghi nhiều (log, event) → ít index.
- Index chiếm RAM cache: 5 index của `orders` = 6 MB, gấp 1,5 lần bảng.
- Đừng "rắc" index theo cảm giác; thêm khi có query cụ thể cần và đã thấy plan trước/sau.
- Trên production: `CREATE INDEX CONCURRENTLY` để không khoá ghi bảng (thí nghiệm thật ở §9.4; không chạy được trong transaction).

**Thử biến tấu:** tạo partial index `WHERE published_at IS NOT NULL AND deleted_at IS NULL` trên `products (published_at DESC)` rồi so `pg_relation_size` với index đầy đủ. Tạo GIN trên `images` (text[]) và thử `WHERE images @> ARRAY['https://img.example.com/p/7.png']` — plan có dùng không? Bỏ `INCLUDE` khỏi covering index nhưng đưa `price, stock` vào cột key `(product_id, price, stock)` — vẫn Index Only Scan chứ? Vậy INCLUDE khác gì?

### 7.3 Đọc EXPLAIN ANALYZE

#### 7.3.1 Ví dụ dẫn: Seq Scan thành Bitmap Scan

**Bối cảnh:** báo cáo "sku này đã bán trong những đơn nào" (`skus` → `order_items` 1-n, 150.055 dòng). Schema mẫu không có index trên `order_items.sku_id`.

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT order_id, quantity FROM order_items WHERE sku_id = 'cd12c859-cd2f-47a0-b45e-cccadb01821f';
```

```
Seq Scan on order_items  (cost=0.00..3581.69 rows=36 width=20) (actual time=0.016..7.243 rows=59 loops=1)
  Filter: (sku_id = 'cd12c859-...'::uuid)
  Rows Removed by Filter: 149996
  Buffers: shared hit=1706
Planning Time: 0.524 ms
Execution Time: 7.283 ms
```

Đọc từng phần:

| Mảnh                                        | Nghĩa                                                                                     |
| ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `Seq Scan on order_items`                   | quét tuần tự cả bảng                                                                      |
| `cost=0.00..3581.69`                        | chi phí ước: 0 để ra dòng đầu, 3581 để ra hết (đơn vị tương đối, không phải ms)           |
| `rows=36 width=20`                          | planner ước 36 dòng, mỗi dòng 20 byte                                                     |
| `actual time=0.016..7.243`                  | thật: 0.016 ms ra dòng đầu, 7.243 ms xong                                                 |
| `rows=59 loops=1`                           | thật 59 dòng, node chạy 1 lần                                                             |
| `Filter` / `Rows Removed by Filter: 149996` | điều kiện áp **sau** khi đọc dòng; 149.996 dòng đọc rồi vứt — đây là tín hiệu thiếu index |
| `Buffers: shared hit=1706`                  | đọc 1706 block 8 kB (13 MB) từ cache; `read=` là từ đĩa                                   |

Sau `CREATE INDEX order_items_sku_idx ON order_items (sku_id);`:

```
Bitmap Heap Scan on order_items  (cost=4.57..133.34 rows=36 width=20) (actual time=0.066..0.113 rows=59 loops=1)
  Recheck Cond: (sku_id = 'cd12c859-...'::uuid)
  Heap Blocks: exact=59
  Buffers: shared hit=59 read=2
  ->  Bitmap Index Scan on order_items_sku_idx  (cost=0.00..4.56 rows=36 width=0) (actual time=0.058..0.058 rows=59 loops=1)
        Index Cond: (sku_id = 'cd12c859-...'::uuid)
        Buffers: shared read=2
Execution Time: 0.158 ms
```

1706 block → 61 block, 46 lần nhanh hơn. Vì sao `Bitmap` chứ không phải `Index Scan`? 59 dòng nằm ở 59 block khác nhau; Bitmap Index Scan gom danh sách block trước, sắp xếp, rồi Bitmap Heap Scan đọc mỗi block một lần theo thứ tự vật lý. `Index Scan` thường sẽ nhảy qua lại. Planner chọn Bitmap khi số dòng "vừa phải" (vài chục đến vài nghìn); `Recheck Cond` chỉ thực sự chạy khi bitmap bị nén (`Heap Blocks: lossy=`), còn `exact=` là không cần recheck.

#### 7.3.2 Ví dụ hai: Bitmap + Sort thành Index Scan không Sort

**Bối cảnh:** "10 đơn gần nhất của một user" — query ở §7.1. Schema mẫu có `orders_user_idx (user_id)`, chưa có index phục vụ sắp xếp.

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, created_at FROM orders
WHERE user_id = '09d57b48-476f-4441-b8b4-f0b67464dbd3' AND deleted_at IS NULL
ORDER BY created_at DESC LIMIT 10;
```

Trước:

```
Limit  (cost=115.13..115.16 rows=10 width=24) (actual time=0.165..0.167 rows=10 loops=1)
  Buffers: shared hit=31
  ->  Sort  (cost=115.13..115.22 rows=35 width=24) (actual time=0.164..0.165 rows=10 loops=1)
        Sort Key: created_at DESC
        Sort Method: top-N heapsort  Memory: 26kB
        ->  Bitmap Heap Scan on orders  (cost=4.56..114.37 rows=35 width=24) (actual time=0.025..0.133 rows=28 loops=1)
              Recheck Cond: (user_id = '09d57b48-...'::uuid)
              Filter: (deleted_at IS NULL)
              Heap Blocks: exact=26
              ->  Bitmap Index Scan on orders_user_idx  (cost=0.00..4.55 rows=35 width=0) (actual time=0.014..0.014 rows=28 loops=1)
                    Index Cond: (user_id = '09d57b48-...'::uuid)
Execution Time: 0.206 ms
```

Sau `CREATE INDEX orders_user_created_idx ON orders (user_id, created_at DESC) WHERE deleted_at IS NULL;`:

```
Limit  (cost=0.41..40.59 rows=10 width=24) (actual time=0.116..0.129 rows=10 loops=1)
  Buffers: shared hit=10 read=3
  ->  Index Scan using orders_user_created_idx on orders  (cost=0.41..141.02 rows=35 width=24) (actual time=0.115..0.126 rows=10 loops=1)
        Index Cond: (user_id = '09d57b48-...'::uuid)
Execution Time: 0.159 ms
```

Node `Sort` biến mất, `Filter: (deleted_at IS NULL)` biến mất (nằm trong partial index), và quan trọng nhất: `Limit` dừng Index Scan sau đúng 10 dòng (`actual rows=10` so với 28 ở plan trước). Với user có 5.000 đơn, plan cũ đọc 5.000 dòng rồi sort; plan mới vẫn đọc 10.

Chú ý một bẫy khi thí nghiệm: nếu viết `WHERE user_id = (SELECT id FROM users ... LIMIT 1)` thì planner nhận `user_id = $0` từ `InitPlan`, không biết giá trị lúc lập kế hoạch, và trong thí nghiệm thật đã **không** chọn index mới (cost hai plan bằng nhau, 40.44). Khi so plan, dùng literal hoặc `PREPARE` với tham số thật.

#### 7.3.3 Bảng tra: bạn thấy gì, nghĩa là gì

Đọc từ trong ra ngoài, node thụt sâu nhất chạy trước:

| Bạn thấy                                        | Nghĩa là                                  | Phản ứng                                                    |
| ----------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| `Seq Scan on orders`                            | quét toàn bảng                            | ok nếu bảng nhỏ hoặc lấy > ~10% dòng; ngược lại thiếu index |
| `Index Scan using X`                            | dùng index rồi đọc bảng theo từng con trỏ | tốt cho ít dòng                                             |
| `Index Only Scan` + `Heap Fetches: 0`           | chỉ đọc index                             | rất tốt; `Heap Fetches` cao → cần VACUUM                    |
| `Bitmap Heap Scan` + `Bitmap Index Scan`        | index trả nhiều dòng, gom block rồi đọc   | ok cho tập trung bình; `lossy=` lớn → tăng `work_mem`       |
| `Nested Loop`                                   | với mỗi dòng ngoài, tìm bên trong         | tốt khi ngoài nhỏ + trong có index; tệ khi cả hai lớn       |
| `Hash Join`                                     | build hash một bên, probe bên kia         | tốt cho join lớn không sort; `Batches > 1` là tràn đĩa      |
| `Merge Join`                                    | hai bên đã sort                           | tốt khi có index sort sẵn; kèm `Sort` lớn thì tệ            |
| `Sort` với `Sort Method: external merge  Disk:` | sort tràn ra đĩa                          | tăng `work_mem` hoặc thêm index theo thứ tự sort            |
| `rows=1000` (ước) vs `actual rows=500000`       | thống kê sai                              | `ANALYZE bảng;` hoặc `CREATE STATISTICS`                    |
| `Buffers: shared hit=X read=Y`                  | X block từ cache, Y từ đĩa                | Y lớn → thiếu index hoặc thiếu RAM                          |
| `loops=5000` trên node con                      | node đó chạy 5000 lần                     | nhân `actual time × loops` mới ra chi phí thật              |
| `Filter` + `Rows Removed by Filter` lớn         | đọc rồi vứt                               | điều kiện đó cần vào index (`Index Cond`)                   |
| `InitPlan` / `SubPlan`                          | subquery chạy 1 lần / chạy mỗi dòng       | `SubPlan` với `loops` lớn → viết lại thành JOIN             |
| `Parallel Seq Scan`, `Workers Launched: 2`      | quét song song                            | tốt cho báo cáo, không thay được index cho OLTP             |

#### 7.3.4 Ba kiểu join trên cùng một query

**Bối cảnh:** doanh thu theo trạng thái đơn trong 30 ngày (`orders` → `order_items`, 8.259 đơn khớp, 24.634 dòng hàng). Cùng query, ép planner đổi thuật toán join bằng `enable_*` (chỉ để học, không dùng trên production) và so số block.

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT o.status, sum(oi.unit_price * oi.quantity)
FROM orders o JOIN order_items oi ON oi.order_id = o.id
WHERE o.created_at >= now() - interval '30 days'
GROUP BY o.status;
```

**Hash Join** (planner tự chọn):

```
HashAggregate  (actual time=34.496..34.498 rows=6 loops=1)
  Buffers: shared hit=2205
  ->  Hash Join  (cost=1477.58..5078.05 rows=24867 width=19) (actual time=7.796..28.197 rows=24634 loops=1)
        Hash Cond: (oi.order_id = o.id)
        ->  Seq Scan on order_items oi  (cost=0.00..3206.55 rows=150055 width=27) (actual time=0.003..6.165 rows=150055 loops=1)
              Buffers: shared hit=1706
        ->  Hash  (cost=1374.00..1374.00 rows=8286 width=24) (actual time=7.744..7.745 rows=8259 loops=1)
              Buckets: 16384  Batches: 1  Memory Usage: 586kB
              ->  Seq Scan on orders o  (cost=0.00..1374.00 rows=8286 width=24) (actual time=0.005..6.622 rows=8259 loops=1)
                    Filter: (created_at >= (now() - '30 days'::interval))
                    Rows Removed by Filter: 41741
Execution Time: 34.635 ms
```

Đọc: bên **nhỏ** (8.259 đơn) được nạp vào bảng băm 586 kB trong RAM (`Batches: 1` = vừa `work_mem`, không tràn đĩa); bên **lớn** (150.055 dòng hàng) quét tuần tự một lần, mỗi dòng tra hash. Tổng 2205 block. Ước 24.867 vs thật 24.634 — planner rất chuẩn.

**Merge Join** (`SET enable_hashjoin = off;`):

```
->  Merge Join  (cost=1969.61..13405.54 rows=24867 width=19) (actual time=8.395..47.673 rows=24634 loops=1)
      Merge Cond: (oi.order_id = o.id)
      Buffers: shared hit=52041
      ->  Index Scan using order_items_order_idx on order_items oi  (cost=0.42..10827.23 rows=150055 width=27) (actual time=0.013..27.962 rows=149993 loops=1)
            Buffers: shared hit=51542
      ->  Sort  (cost=1913.27..1933.99 rows=8286 width=24) (actual time=8.326..9.128 rows=8259 loops=1)
            Sort Key: o.id
            Sort Method: quicksort  Memory: 941kB
            ->  Seq Scan on orders o  (...)
Execution Time: 54.330 ms
```

Đọc: hai bên phải **cùng thứ tự** theo `order_id`. `order_items` có index theo `order_id` nên đi Index Scan theo thứ tự — nhưng 150k dòng qua index là 51.542 block (nhảy heap liên tục), gấp 30 lần Seq Scan. `orders` không có thứ tự đó → `Sort` 941 kB. Merge chỉ thắng khi **cả hai** bên đã sort sẵn (ví dụ join hai bảng lớn theo khoá chính, hoặc cần ORDER BY theo cột join).

**Nested Loop** (`SET enable_hashjoin = off; SET enable_mergejoin = off;`):

```
->  Nested Loop  (cost=0.42..14113.71 rows=24867 width=19) (actual time=0.028..23.236 rows=24634 loops=1)
      Buffers: shared hit=33719
      ->  Seq Scan on orders o  (cost=0.00..1374.00 rows=8286 width=24) (actual time=0.007..6.756 rows=8259 loops=1)
            Filter: (created_at >= (now() - '30 days'::interval))
      ->  Index Scan using order_items_order_idx on order_items oi  (cost=0.42..1.51 rows=3 width=27) (actual time=0.001..0.002 rows=3 loops=8259)
            Index Cond: (order_id = o.id)
            Buffers: shared hit=33220
Execution Time: 30.091 ms
```

Đọc: `loops=8259` — Index Scan bên trong chạy 8.259 lần, mỗi lần 0.002 ms và 3 dòng: tổng ≈ 16 ms và 33.220 block. Cost ước cao nhất (14113) nhưng thời gian thật thấp hơn Hash Join vì mọi thứ trong cache; planner tính cost theo I/O nên thiên về Hash. Nested Loop là **kẻ thắng tuyệt đối** khi bên ngoài nhỏ: ví dụ §7.3.2 với 28 đơn của một user → planner tự chọn Nested Loop, 142 block, 0.4 ms.

Quy tắc rút ra: đừng chọn join bằng tay; hãy cho planner **thống kê đúng** (`ANALYZE`) và **index bên trong** (cột join của bảng nhiều) rồi để nó chọn. Nếu nó chọn Nested Loop với `loops` hàng triệu, thường là ước lượng `rows` bên ngoài sai (ước 10, thật 100.000).

#### 7.3.5 `EXPLAIN (FORMAT JSON)` và các option khác

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT ...;
```

Trả về cùng thông tin dưới dạng JSON (`"Node Type": "Index Scan"`, `"Actual Rows": 10`, `"Shared Hit Blocks": 10` ...). Dùng khi: dán vào [explain.dalibo.com](https://explain.dalibo.com) hoặc [explain.depesz.com](https://explain.depesz.com) để nhìn cây và tô màu node tốn nhất; hoặc lưu plan vào log của app để so sánh tự động. Option khác đáng biết: `SETTINGS` (in các GUC không mặc định ảnh hưởng plan), `WAL` (lượng WAL sinh ra của UPDATE/INSERT), `TIMING off` (bớt overhead đo giờ khi node chạy hàng triệu lần), và `EXPLAIN` không `ANALYZE` cho câu UPDATE/DELETE bạn không muốn thực thi thật (hoặc bọc `BEGIN; EXPLAIN ANALYZE ...; ROLLBACK;`).

Quy trình sửa query chậm:

1. Chạy `EXPLAIN (ANALYZE, BUFFERS)`.
2. Tìm node có `actual time` lớn nhất (tính cả `loops`).
3. Node đó là Seq Scan trên bảng lớn với `Rows Removed by Filter` lớn, hoặc Sort tốn → thêm/sửa index.
4. Ước lượng `rows` lệch xa thực tế (10 lần trở lên) → `ANALYZE`, hoặc viết lại để planner ước đúng.
5. Chạy lại, so **số block** (`Buffers`) chứ không chỉ ms, vì ms phụ thuộc cache.

**Thử biến tấu:** thêm `ORDER BY o.status` vào query ba kiểu join — plan đổi từ `HashAggregate` sang gì? Đổi điều kiện thành `interval '2 days'` (ít đơn hơn nhiều): planner có tự chuyển sang Nested Loop không, ở ngưỡng bao nhiêu ngày thì đổi? Thử `SET work_mem = '64kB'` rồi chạy Hash Join: `Batches` thành bao nhiêu và thời gian tăng thế nào?

### 7.4 Vì sao index có mà không được dùng

#### 7.4.1 Selectivity: thí nghiệm với `status`

**Bối cảnh:** admin muốn xem danh sách đơn `delivered`. Ai đó tạo `CREATE INDEX orders_status_idx ON orders (status);` rồi thắc mắc vì sao vẫn chậm. Xem thống kê trước:

```sql
SELECT attname, n_distinct, most_common_vals, most_common_freqs
FROM pg_stats WHERE schemaname = 'shop' AND tablename = 'orders' AND attname = 'status';
```

```
 attname | n_distinct |                most_common_vals                |                      most_common_freqs
---------+------------+------------------------------------------------+----------------------------------------------------------------
 status  |          6 | {delivered,returned,cancelled,shipped,pending,paid} | {0.37153333,0.1285,0.1277,0.12433334,0.1241,0.123833336}
```

Planner biết: 6 giá trị, `delivered` chiếm 37,2% (thật: 18.654/50.000 = 37,3%). Query cần cột ngoài index:

```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT id, user_id, created_at FROM orders WHERE status = 'delivered';
```

```
Bitmap Heap Scan on orders  (cost=212.26..943.47 rows=18577 width=40) (actual time=0.675..2.899 rows=18654 loops=1)
  Recheck Cond: (status = 'delivered'::text)
  Heap Blocks: exact=499
  Buffers: shared hit=499 read=18
  ->  Bitmap Index Scan on orders_status_idx  (cost=0.00..207.62 rows=18577 width=0) (actual time=0.634..0.634 rows=18654 loops=1)
        Index Cond: (status = 'delivered'::text)
Execution Time: 3.419 ms
```

Planner vẫn dùng index, nhưng nhìn `Heap Blocks: exact=499` — bảng có đúng 499 block. Nó đọc **toàn bộ bảng** cộng thêm 18 block index; so với Seq Scan không index (499 block) chỉ tệ hơn. Ở đây bảng nhỏ và cache nóng nên chênh lệch không đáng kể; trên bảng 50 triệu dòng, index như vậy hoặc bị bỏ qua (Seq Scan) hoặc còn chậm hơn Seq Scan vì đọc ngẫu nhiên. Với `pending` (12%) cũng y hệt: `Heap Blocks: exact=499`. Cột 6 giá trị đứng một mình không bao giờ "hẹp" đủ.

Thêm điều kiện hẹp thì khác hẳn:

```sql
CREATE INDEX orders_status_created_idx ON orders (status, created_at);
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM orders WHERE status = 'pending' AND created_at >= now() - interval '7 days';
```

```
Aggregate  (actual time=0.123..0.123 rows=1 loops=1)
  ->  Index Only Scan using orders_status_created_idx on orders  (cost=0.42..13.00 rows=229 width=0) (actual time=0.074..0.112 rows=228 loops=1)
        Index Cond: ((status = 'pending'::text) AND (created_at >= (now() - '7 days'::interval)))
        Heap Fetches: 0
        Buffers: shared hit=1 read=4
Execution Time: 0.156 ms
```

5 block thay vì 517. `status` đứng đầu index là **tốt** — nó chia index thành 6 vùng, rồi `created_at` rẽ tiếp trong vùng đó. Điều vô dụng là index chỉ có `status`.

Còn `count(*) WHERE status = 'delivered'` với index đơn thì lại là `Index Only Scan` 19 block, 1.9 ms — vì không cần cột nào từ heap. Cùng một index có ích hay không tuỳ **query cần gì**, không có câu trả lời tuyệt đối; hãy nhìn plan.

#### 7.4.2 Các lý do còn lại (kèm plan thật đã chạy)

- **Bảng nhỏ** (vài nghìn dòng, vài chục block): Seq Scan rẻ hơn, đây là đúng, không phải lỗi. `categories` 85 dòng luôn Seq Scan.
- **Cột bị bọc hàm / cast**: `created_at::date = $1`, `lower(email)` không có expression index (§7.2.3).
- **Kiểu không khớp**: cột `uuid` so với tham số `text`. Thí nghiệm `WHERE user_id::text = '09d57b48-...'`:

  ```
  Seq Scan on orders  (cost=0.00..1374.00 rows=250 width=16) (actual time=0.172..8.503 rows=28 loops=1)
    Filter: ((user_id)::text = '09d57b48-476f-4441-b8b4-f0b67464dbd3'::text)
    Rows Removed by Filter: 49972
  ```

  8.5 ms thay vì 0.1 ms, và ước `rows=250` sai 9 lần vì planner không có thống kê cho `user_id::text`. Driver/ORM đôi khi gửi tham số dạng text; trong raw query dùng `$1::uuid`.

- `LIKE '%x'`, `<>`, `IS NOT NULL` trên cột hầu hết NOT NULL: không selective.
- **`OR` giữa hai cột khác nhau**: `WHERE user_id = $1 OR id = $2` có thể thành `BitmapOr` hai index (ổn) hoặc Seq Scan; nếu Seq Scan, viết lại bằng `UNION ALL`.
- **Thống kê cũ**: sau khi nạp/xoá hàng loạt, `ANALYZE bảng;`. Dấu hiệu: `rows` ước lệch thật 10 lần trở lên.
- **Cột tương quan**: `WHERE status = 'delivered' AND returned_at IS NOT NULL` — planner nhân xác suất hai cột như độc lập, ước sai → `CREATE STATISTICS st (dependencies) ON status, returned_at FROM orders; ANALYZE orders;`.
- **Partial index không khớp điều kiện** (§7.2.1): `status = 'paid'` không dùng được index `WHERE status = 'pending'`.
- **Tham số trong prepared statement**: sau 5 lần chạy, driver có thể chuyển sang generic plan không biết giá trị tham số; với cột lệch phân phối như `status`, generic plan có thể tệ. `SET plan_cache_mode = force_custom_plan` cho session đó hoặc kiểm tra bằng `EXPLAIN EXECUTE`.

**Thử biến tấu:** chạy `SELECT id FROM orders WHERE status = 'returned'` với `enable_seqscan = off` và so `Buffers` với Seq Scan thường; sau đó `UPDATE orders SET status = 'returned' WHERE status = 'delivered'` (trong transaction rồi ROLLBACK) — `ANALYZE` xong plan đổi thế nào? Với `pg_stats` của `users.role_id`, đoán trước planner có dùng index `(role_id)` cho `role_id = 1` (5 dòng) và `role_id = 3` (4.950 dòng) không, rồi kiểm chứng.

### 7.5 Công cụ tìm query chậm trên production

**`pg_stat_statements`** — bảng tổng hợp mọi query đã chạy (đã chuẩn hoá tham số): số lần gọi, tổng thời gian, thời gian trung bình, số block đọc. Đây là nơi bắt đầu mỗi lần tối ưu. Nó cần được nạp lúc khởi động; trên container mẫu chưa bật:

```sql
CREATE EXTENSION pg_stat_statements;      -- thành công
SELECT calls FROM pg_stat_statements;     -- ERROR:  pg_stat_statements must be loaded via shared_preload_libraries
```

Bật: thêm `shared_preload_libraries = 'pg_stat_statements'` vào `postgresql.conf` (Docker: `command: postgres -c shared_preload_libraries=pg_stat_statements`), restart, rồi `CREATE EXTENSION`. Sau đó query hay dùng nhất:

```sql
SELECT calls, round(total_exec_time::numeric, 0) AS total_ms, round(mean_exec_time::numeric, 2) AS mean_ms,
       rows, shared_blks_read, left(query, 80) AS query
FROM pg_stat_statements
ORDER BY total_exec_time DESC LIMIT 20;
```

Output sẽ là mỗi dòng một "dạng" query (`WHERE user_id = $1`), sắp theo tổng thời gian. Query có `mean_ms` nhỏ nhưng `calls` khổng lồ (N+1 từ ORM) và query `mean_ms` lớn ít gọi (báo cáo) đều lên top; xử lý hai nhóm khác nhau. `SELECT pg_stat_statements_reset();` sau mỗi đợt tối ưu để so sánh.

**`log_min_duration_statement = 500`** (ms): log mọi query chậm hơn 0,5 s kèm tham số thật. Kết hợp `auto_explain` (`auto_explain.log_min_duration = 500`, `auto_explain.log_analyze = on`) để log luôn plan thật của query chậm — không cần tái hiện bằng tay.

**`pg_stat_user_indexes`**: index nào không ai quét:

```sql
SELECT indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes WHERE schemaname = 'shop' AND relname = 'orders' ORDER BY idx_scan;
```

```
        indexrelname        | idx_scan |  size
----------------------------+----------+---------
 orders_created_pending_idx |        1 | 152 kB
 orders_created_idx         |        2 | 1112 kB
 orders_user_idx            |        4 | 608 kB
 orders_user_created_idx    |        4 | 2008 kB
 orders_pkey                |   150055 | 2200 kB     ← 150.055 lần: FK check khi seed order_items
```

Sau vài tuần production, `idx_scan = 0` và không phải unique/PK → xoá (bằng `DROP INDEX CONCURRENTLY`). Bộ đếm reset khi `pg_stat_reset()` hoặc crash; kiểm tra `stats_reset` trong `pg_stat_database` trước khi kết luận.

**`pg_stat_activity`**: ai đang chạy gì, ai đang chờ lock (`wait_event_type = 'Lock'`), transaction mở bao lâu (`now() - xact_start`). Ví dụ thật ở §8.4.

**Thử biến tấu:** viết query tìm các transaction `idle in transaction` quá 5 phút và câu `pg_terminate_backend` đi kèm. Với `pg_stat_user_tables`, tìm bảng có `seq_scan` cao và `seq_tup_read / seq_scan` lớn (mỗi lần quét đọc nhiều dòng) — đó là ứng viên thiếu index.

---

## Tuần 8 · Transaction, isolation, lock, race condition

### 8.1 MVCC — vì sao đọc không chặn ghi

Postgres không sửa dòng tại chỗ; mỗi UPDATE tạo **phiên bản mới** của dòng, phiên bản cũ giữ lại cho transaction còn cần thấy. Mỗi phiên bản mang hai cột hệ thống: `xmin` (transaction tạo ra nó) và `xmax` (transaction xoá/thay thế nó; 0 nếu chưa). Một transaction "thấy" phiên bản nếu `xmin` đã commit trước snapshot của nó và `xmax` chưa (hoặc đã bị rollback).

#### Ví dụ 1 — xem `xmin`/`xmax`/`ctid` trước và sau UPDATE

**Bối cảnh:** một sku bất kỳ, xem "địa chỉ vật lý" (`ctid` = block, vị trí) và các xid.

```sql
SELECT xmin, xmax, ctid, sku_code, stock FROM skus WHERE id = '7204bc56-d098-48e9-b4a2-173d07d3ba4c';
SELECT txid_current() AS my_txid;
UPDATE skus SET stock = stock - 1 WHERE id = '7204bc56-d098-48e9-b4a2-173d07d3ba4c';
SELECT xmin, xmax, ctid, sku_code, stock FROM skus WHERE id = '7204bc56-d098-48e9-b4a2-173d07d3ba4c';
```

```
 xmin | xmax |  ctid   |    sku_code    | stock
------+------+---------+----------------+-------
 5290 |    0 | (49,29) | SKU-00096ffd-1 |     9        ← trước: tạo bởi xid 5290 (lúc seed), chưa ai thay

 my_txid
---------
    5554

 xmin | xmax |  ctid  |    sku_code    | stock
------+------+--------+----------------+-------
 5555 |    0 | (0,59) | SKU-00096ffd-1 |     8        ← sau: phiên bản MỚI, xid 5555, nằm ở block 0 vị trí 59
```

Dòng "chuyển nhà" từ block 49 sang block 0; phiên bản cũ ở (49,29) vẫn nằm đó với `xmax = 5555`, chờ VACUUM dọn. Đây là lý do `ctid` không bao giờ được dùng làm khoá.

#### Ví dụ 2 — UPDATE rồi ROLLBACK: `xmax` vẫn còn

**Bối cảnh:** request trừ tồn nhưng transaction thất bại giữa chừng.

```sql
BEGIN;
SELECT txid_current();                              -- 5556
UPDATE skus SET stock = stock - 1 WHERE id = '7204bc56-...';
SELECT xmin, xmax, ctid, stock FROM skus WHERE id = '7204bc56-...';
ROLLBACK;
SELECT xmin, xmax, ctid, stock FROM skus WHERE id = '7204bc56-...';
```

```
 xmin | xmax |  ctid  | stock
------+------+--------+-------
 5556 |    0 | (1,11) |     7        ← trong transaction: thấy phiên bản mới của mình

 xmin | xmax |  ctid  | stock
------+------+--------+-------
 5555 | 5556 | (0,59) |     8        ← sau ROLLBACK: phiên bản cũ quay lại, xmax = 5556 vẫn ghi
```

ROLLBACK không xoá gì cả: Postgres chỉ đánh dấu xid 5556 là "aborted" trong `pg_xact`; khi đọc, thấy `xmax` trỏ tới xid đã abort thì coi như 0. Phiên bản (1,11) trở thành rác. Nên rollback rẻ, nhưng rollback nhiều cũng tạo bloat như update.

#### Ví dụ 3 — dòng chết tích tụ: `n_dead_tup`

```sql
SELECT n_live_tup, n_dead_tup, n_tup_upd, last_autovacuum
FROM pg_stat_user_tables WHERE schemaname = 'shop' AND relname = 'skus';
```

```
 n_live_tup | n_dead_tup | n_tup_upd |        last_autovacuum
------------+------------+-----------+-------------------------------
       4592 |          1 |       105 | 2026-09-30 16:54:44.824665+00
```

Mỗi UPDATE = +1 `n_dead_tup` cho tới khi autovacuum chạy (mặc định khi dead > 20% bảng + 50 dòng). Thí nghiệm bloat toàn bảng và `VACUUM FULL` ở §9.5.

Hệ quả cần nhớ:

- Reader không chờ writer, writer không chờ reader. Chỉ writer chờ writer trên **cùng dòng** (§8.3).
- Transaction mở lâu (kể cả chỉ SELECT, kể cả `idle in transaction`) giữ snapshot cũ → VACUUM không dọn được phiên bản mà snapshot đó còn cần → bloat toàn cụm. Kẻ thù số một của MVCC là connection quên COMMIT.
- `Index Only Scan` cần visibility map, tức cần VACUUM chạy đều (§7.2.2).
- Cột `version` cho optimistic lock (§8.3) là cách app tự "nhìn thấy" một phần MVCC.

**Thử biến tấu:** mở transaction A chỉ chạy `SELECT 1` rồi để đó; ở phiên B update một sku 100 lần (`DO $$ ... $$`), rồi `VACUUM (VERBOSE) skus` — đọc dòng "dead but not yet removable" và giải thích vì sao. Sau khi COMMIT A, VACUUM lại.

### 8.2 Isolation level — chọn cái nào

| Level                       | Thấy gì                                                          | Vấn đề còn lại                                                                                   | Khi dùng                                                            |
| --------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `READ COMMITTED` (mặc định) | mỗi **câu lệnh** thấy dữ liệu đã commit tại lúc câu lệnh bắt đầu | non-repeatable read, phantom, lost update nếu read-then-write ở app                              | hầu hết OLTP, kết hợp với lock hàng hoặc UPDATE atomic (§8.3)       |
| `REPEATABLE READ`           | snapshot cố định từ **câu lệnh đầu** của transaction             | write skew; UPDATE dòng đã bị sửa → lỗi serialization, phải retry                                | báo cáo nhiều query cần nhất quán; logic đọc-rồi-ghi trên cùng dòng |
| `SERIALIZABLE`              | như chạy tuần tự                                                 | lỗi serialization thường xuyên hơn, kể cả giữa các transaction không đụng cùng dòng → phải retry | tiền, tồn kho, ràng buộc trên nhiều dòng khi không muốn lock tay    |

Ba kịch bản dưới đây đều đã chạy thật; thông báo lỗi là của Postgres.

#### Kịch bản 1 — non-repeatable read: xảy ra ở READ COMMITTED, không ở REPEATABLE READ

**Bối cảnh:** phiên A là một báo cáo đọc `stock` hai lần trong cùng transaction; phiên B là khách mua hàng làm giảm tồn giữa hai lần đọc.

| t   | Phiên A                                                 | Phiên B                                                                       |
| --- | ------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 0   | `BEGIN;` (READ COMMITTED)                               |                                                                               |
| 0   | `SELECT stock FROM skus WHERE id = :sk;` → **42**       |                                                                               |
| 1   |                                                         | `UPDATE skus SET stock = stock - 1 WHERE id = :sk;` → `UPDATE 1` (autocommit) |
| 2   | `SELECT stock FROM skus WHERE id = :sk;` → **41**       |                                                                               |
| 2   | `COMMIT;`                                               |                                                                               |
| 3   | `BEGIN ISOLATION LEVEL REPEATABLE READ;`                |                                                                               |
| 3   | `SELECT stock ...;` → **41**                            |                                                                               |
| 4   |                                                         | `UPDATE skus SET stock = stock - 1 ...;` → `UPDATE 1`                         |
| 5   | `SELECT stock ...;` → **41** (vẫn)                      |                                                                               |
| 5   | `COMMIT;` rồi `SELECT stock` ngoài transaction → **40** |                                                                               |

Ở READ COMMITTED, hai SELECT trong cùng transaction cho hai kết quả khác nhau — đúng theo định nghĩa, không phải bug. Báo cáo gồm nhiều query (tổng ở đầu trang, chi tiết ở dưới) mà chạy READ COMMITTED có thể tổng không khớp chi tiết. Fix: `BEGIN ISOLATION LEVEL REPEATABLE READ` cho transaction chỉ đọc — rẻ, không bao giờ lỗi serialization khi chỉ SELECT.

#### Kịch bản 2 — lost update: READ COMMITTED mất dữ liệu im lặng, REPEATABLE READ báo lỗi

**Bối cảnh:** hai request cùng đọc `stock` về app, tính `stock - 1`, ghi giá trị đã tính (kiểu `sku.stock -= 1; repo.save(sku)` của ORM). `stock` ban đầu 20.

| t   | Phiên A (READ COMMITTED)                           | Phiên B (READ COMMITTED)                                   |
| --- | -------------------------------------------------- | ---------------------------------------------------------- |
| 0   | `BEGIN; SELECT stock ...` → **20**                 |                                                            |
| 1   |                                                    | `BEGIN; SELECT stock ...` → **20**                         |
| 1   |                                                    | `UPDATE skus SET stock = 20 - 1 ...; COMMIT;` → stock = 19 |
| 2   | `UPDATE skus SET stock = 20 - 1 ...;` → `UPDATE 1` |                                                            |
| 2   | `COMMIT;`                                          |                                                            |
| 3   | `SELECT stock` → **19**                            |                                                            |

Hai lần bán, tồn giảm 1. Không lỗi, không log, không ai biết — đây là lý do "read-then-write ở app" bị cấm trong review. Cùng kịch bản, cả hai `BEGIN ISOLATION LEVEL REPEATABLE READ`:

| t   | Phiên A (RR)                                                   | Phiên B (RR)                                                   |
| --- | -------------------------------------------------------------- | -------------------------------------------------------------- |
| 0   | `BEGIN ISOLATION LEVEL REPEATABLE READ; SELECT stock` → **19** |                                                                |
| 1   |                                                                | `BEGIN ISOLATION LEVEL REPEATABLE READ; SELECT stock` → **19** |
| 2   | `UPDATE skus SET stock = 19 - 1 ...; COMMIT;` → stock = 18     |                                                                |
| 3   |                                                                | `UPDATE skus SET stock = 19 - 1 ...;`                          |
| 3   |                                                                | `ERROR:  could not serialize access due to concurrent update`  |
| 3   |                                                                | `COMMIT;` → `ROLLBACK`                                         |

B thấy dòng đã bị sửa sau snapshot của mình → Postgres từ chối, SQLSTATE `40001`. App phải bắt lỗi, mở transaction mới, đọc lại (thấy 18), ghi 17. Kết quả đúng nhưng cần retry loop. Cách rẻ hơn không cần đổi level: `UPDATE ... SET stock = stock - 1` (§8.3 cách 1).

#### Kịch bản 3 — write skew: REPEATABLE READ cho qua, SERIALIZABLE chặn

**Bối cảnh:** một product có hai sku `SKU-WS-1`, `SKU-WS-2`, mỗi cái tồn 1. Quy tắc nghiệp vụ: **tổng tồn của product phải ≥ 1** (không được để product "hết hàng toàn bộ" khi đang chạy khuyến mãi). Hai seller cùng lúc, mỗi người kiểm tra tổng rồi giảm một sku **khác nhau** — không đụng cùng dòng, nên lock hàng và kịch bản 2 không bắt được.

| t   | Phiên A (REPEATABLE READ)                                                                  | Phiên B (REPEATABLE READ)                                                           |
| --- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| 0   | `BEGIN ISOLATION LEVEL REPEATABLE READ;`                                                   |                                                                                     |
| 0   | `SELECT sum(stock) FROM skus WHERE product_id = :pid AND sku_code LIKE 'SKU-WS%';` → **2** |                                                                                     |
| 1   |                                                                                            | `BEGIN ISOLATION LEVEL REPEATABLE READ;`                                            |
| 1   |                                                                                            | `SELECT sum(stock) ...` → **2**                                                     |
| 2   | `UPDATE skus SET stock = stock - 1 WHERE sku_code = 'SKU-WS-1'; COMMIT;`                   |                                                                                     |
| 3   |                                                                                            | `UPDATE skus SET stock = stock - 1 WHERE sku_code = 'SKU-WS-2'; COMMIT;` → `COMMIT` |
| 4   |                                                                                            | `SELECT sku_code, stock ...` → **WS-1: 0, WS-2: 0**                                 |

Cả hai đều kiểm tra "tổng 2 ≥ 1, ok" và đều thành công; quy tắc bị vi phạm. Đây là **write skew**: hai transaction đọc chung tập dữ liệu, ghi vào hai chỗ khác nhau, và quyết định của mỗi bên sẽ khác nếu thấy ghi của bên kia. Cùng kịch bản với `SERIALIZABLE`:

| t   | Phiên A (SERIALIZABLE)                                              | Phiên B (SERIALIZABLE)                                                                 |
| --- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 0–1 | `BEGIN ISOLATION LEVEL SERIALIZABLE; SELECT sum(stock) ...` → **2** | `BEGIN ISOLATION LEVEL SERIALIZABLE; SELECT sum(stock) ...` → **2**                    |
| 2   | `UPDATE ... 'SKU-WS-1'; COMMIT;` → `COMMIT`                         |                                                                                        |
| 3   |                                                                     | `UPDATE ... 'SKU-WS-2';`                                                               |
| 3   |                                                                     | `ERROR:  could not serialize access due to read/write dependencies among transactions` |
| 3   |                                                                     | `DETAIL:  Reason code: Canceled on identification as a pivot, during write.`           |
| 3   |                                                                     | `HINT:  The transaction might succeed if retried.`                                     |
| 4   |                                                                     | `SELECT sku_code, stock ...` → **WS-1: 0, WS-2: 1** — quy tắc còn nguyên               |

Postgres theo dõi "A đọc dòng mà B ghi, B đọc dòng mà A ghi" (SIREAD lock) và huỷ một bên với `40001`. B retry sẽ thấy tổng = 1, kiểm tra thất bại đúng. Cái giá: mọi transaction SERIALIZABLE trong hệ thống phải sẵn sàng bị huỷ và retry, kể cả transaction chỉ đọc (dùng `SERIALIZABLE READ ONLY DEFERRABLE` cho báo cáo để tránh). Cách thay thế không đổi level: lock **một dòng đại diện** cho quy tắc — `SELECT ... FROM products WHERE id = :pid FOR UPDATE` trước khi kiểm tra tổng; hai seller sẽ xếp hàng trên dòng product.

Thực tế: 90% dùng READ COMMITTED + kỹ thuật ở §8.3. Chỉ nâng level khi hiểu rõ và có retry loop bắt `40001`.

**Thử biến tấu:** lặp lại kịch bản 1 nhưng phiên B `INSERT` một sku mới cho cùng product và phiên A `SELECT count(*)` hai lần — đây là phantom read; REPEATABLE READ của Postgres có cho phép phantom không (chuẩn SQL thì cho)? Ở kịch bản 3, thay `SELECT sum(stock)` bằng `SELECT ... FOR UPDATE` trên cả hai sku ở cả hai phiên (READ COMMITTED): điều gì xảy ra với B, và tại sao kết quả đúng mà không cần SERIALIZABLE?

### 8.3 Race condition trừ tồn kho — bốn cách, chọn một

**Bối cảnh:** `skus.stock` là số lượng còn bán được của một biến thể. Khi khách đặt hàng, service phải trừ `stock` và không được bán quá số còn lại. Kịch bản: `stock = 1`, hai request cùng mua.

#### Cách ngây thơ (đã tái hiện): bán 2 cái khi chỉ còn 1

| t   | Phiên A                                                            | Phiên B                                                   |
| --- | ------------------------------------------------------------------ | --------------------------------------------------------- |
| 0   | `BEGIN; SELECT stock ...` → **1**, app kiểm tra `1 >= 1` → đủ hàng |                                                           |
| 1   |                                                                    | `BEGIN; SELECT stock ...` → **1**, app kiểm tra → đủ hàng |
| 1   |                                                                    | `UPDATE skus SET stock = 0 ...; COMMIT;`                  |
| 2   | `UPDATE skus SET stock = 0 ...; COMMIT;` → `UPDATE 1`              |                                                           |
| 3   | `SELECT stock` → **0**, nhưng đã tạo **2 đơn**                     |                                                           |

Không lỗi nào cả. Khoảng trống giữa SELECT và UPDATE là nơi race xảy ra; MVCC cho phép B đọc trong khi A "đang xử lý" vì A chưa ghi gì.

#### Cách 1: UPDATE atomic có điều kiện (đơn giản nhất, ưu tiên)

```sql
UPDATE skus SET stock = stock - $2
WHERE id = $1 AND stock >= $2
RETURNING stock;
-- rowCount = 0 → hết hàng
```

| t   | Phiên A                                                                                          | Phiên B                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| 0   | `BEGIN;`                                                                                         |                                                                                                                            |
| 1   | `UPDATE ... SET stock = stock - 1 WHERE ... AND stock >= 1 RETURNING stock;` → **0**, `UPDATE 1` |                                                                                                                            |
| 1.4 | (chưa COMMIT)                                                                                    | `UPDATE ... stock >= 1 RETURNING stock;` → **chờ** (dòng đang bị A khoá)                                                   |
| 3   | `COMMIT;`                                                                                        |                                                                                                                            |
| 3.0 |                                                                                                  | Postgres đánh giá lại `WHERE` trên phiên bản mới: `stock = 0`, không khớp → `UPDATE 0`, 0 dòng trả về (đo thật: chờ 1,0 s) |

Điểm mấu chốt: ở READ COMMITTED, UPDATE bị chặn bởi một UPDATE khác sẽ **đọc lại phiên bản mới nhất** của dòng sau khi bên kia commit rồi mới kiểm tra WHERE (EvalPlanQual). Nên `stock >= 1` được kiểm tra trên giá trị đúng. Không cần transaction, không cần lock tay. Đây là cách nên dùng cho 90% trường hợp "trừ / cộng một con số".

#### Cách 2: pessimistic lock — `SELECT ... FOR UPDATE` và các anh em

Dùng khi phải đọc nhiều thứ, tính toán ở app rồi mới ghi (ví dụ trừ tồn của 5 sku trong một đơn kèm kiểm tra khuyến mãi).

```sql
BEGIN;
SELECT stock FROM skus WHERE id = $1 FOR NO KEY UPDATE;   -- request 2 chờ ở đây
-- logic kiểm tra ở app
UPDATE skus SET stock = stock - 1 WHERE id = $1;
COMMIT;
```

Postgres có **bốn** mức khoá dòng; chọn sai mức là chặn nhiều hơn cần. Bảng tương thích (✓ = hai phiên cùng giữ được, ✗ = phiên sau chờ):

| Phiên B muốn ↓ / Phiên A đang giữ →            | `FOR KEY SHARE` | `FOR SHARE` | `FOR NO KEY UPDATE` | `FOR UPDATE` |
| ---------------------------------------------- | --------------- | ----------- | ------------------- | ------------ |
| `FOR KEY SHARE` (FK check khi INSERT bảng con) | ✓               | ✓           | ✓                   | ✗            |
| `FOR SHARE`                                    | ✓               | ✓           | ✗                   | ✗            |
| `FOR NO KEY UPDATE` (= `UPDATE` cột thường)    | ✓               | ✗           | ✗                   | ✗            |
| `FOR UPDATE` (= `DELETE`, `UPDATE` cột khoá)   | ✗               | ✗           | ✗                   | ✗            |

Kịch bản đã chạy để thấy bảng này là thật. Phiên B đặt `SET lock_timeout = '1s'` để không treo mãi:

| t   | Phiên A                                                    | Phiên B                                                                                                                                                                   |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | `BEGIN; SELECT stock FROM skus WHERE id = :sk FOR UPDATE;` |                                                                                                                                                                           |
| 1   |                                                            | `INSERT INTO order_items (order_id, sku_id, ...) VALUES (:oid, :sk, ...);`                                                                                                |
| 2   |                                                            | `ERROR:  canceling statement due to lock timeout`                                                                                                                         |
| 2   |                                                            | `CONTEXT:  while locking tuple (32,52) in relation "skus"`                                                                                                                |
| 2   |                                                            | `SQL statement "SELECT 1 FROM ONLY "shop"."skus" x WHERE "id" OPERATOR(pg_catalog.=) $1 FOR KEY SHARE OF x"`                                                              |
| 2   |                                                            | `SELECT stock ... FOR UPDATE NOWAIT;` → `ERROR:  could not obtain lock on row in relation "skus"` (ngay lập tức)                                                          |
| 3   | `COMMIT;`                                                  |                                                                                                                                                                           |
| 4   | `BEGIN; SELECT stock ... FOR NO KEY UPDATE;`               |                                                                                                                                                                           |
| 5   |                                                            | `INSERT INTO order_items (... sku_id = :sk ...)` → `INSERT 0 1` — **không chờ**                                                                                           |
| 5   |                                                            | `UPDATE skus SET stock = stock WHERE id = :sk;` → chờ 1 s → `ERROR:  canceling statement due to lock timeout` `CONTEXT:  while updating tuple (32,52) in relation "skus"` |
| 7   | `COMMIT;`                                                  |                                                                                                                                                                           |
| 8   | `BEGIN; SELECT stock ... FOR SHARE;`                       |                                                                                                                                                                           |
| 9   |                                                            | `SELECT stock ... FOR SHARE;` → **48** — không chờ                                                                                                                        |
| 9   |                                                            | `UPDATE skus SET stock = stock ...;` → `ERROR:  canceling statement due to lock timeout`                                                                                  |

Dòng `CONTEXT` ở t=2 là bằng chứng quý: INSERT vào `order_items` phải lấy `FOR KEY SHARE` trên dòng `skus` cha để bảo đảm FK, mà `FOR UPDATE` chặn cả `KEY SHARE`. Hậu quả thực tế: service A giữ `FOR UPDATE` trên sku trong lúc gọi cổng thanh toán 3 giây → **mọi** đơn khác chứa sku đó đứng chờ, dù chúng không hề sửa sku. Dùng `FOR NO KEY UPDATE` (bạn chỉ sửa `stock`, không sửa `id`) thì INSERT bảng con đi qua bình thường. Thực tế `UPDATE` cột thường cũng chỉ lấy `NO KEY UPDATE`, nên `FOR UPDATE` hầu như chỉ đúng khi bạn định DELETE dòng đó.

Hai công cụ chống treo:

- `NOWAIT`: lỗi ngay nếu dòng đang bị khoá (SQLSTATE `55P03`). Dùng cho "nếu ai đang xử lý thì bỏ qua" (ví dụ nút "đồng bộ" bấm hai lần).
- `SET lock_timeout = '2s'` (session hoặc `SET LOCAL` trong transaction): chờ tối đa rồi lỗi (`55P03` cùng mã). Nên đặt mặc định cho connection của app (trong connection string: `options=-c lock_timeout=5s`) để một lock kẹt không kéo cả pool xuống.

#### Cách 3: optimistic lock bằng cột `version` (schema mẫu có sẵn `skus.version`)

```sql
UPDATE skus SET stock = $3, version = version + 1
WHERE id = $1 AND version = $2;
-- rowCount = 0 → ai đó sửa trước, đọc lại và thử lại
```

| t   | Phiên A                                                                                            | Phiên B                                                                                        |
| --- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 0   | `SELECT stock, version ...` → stock **1**, version **0**                                           |                                                                                                |
| 1   |                                                                                                    | `SELECT stock, version ...` → **1**, **0**                                                     |
| 1   |                                                                                                    | `UPDATE skus SET stock = 1 - 1, version = version + 1 WHERE ... AND version = 0;` → `UPDATE 1` |
| 2   | `UPDATE skus SET stock = 1 - 1, version = version + 1 WHERE ... AND version = 0;` → **`UPDATE 0`** |                                                                                                |

A biết mình đã thua (0 dòng), đọc lại: stock 0 → báo hết hàng. Không lock, không chờ, không transaction dài — đổi lại là phải viết retry và tốt khi **xung đột hiếm** (chỉnh sửa form admin, cập nhật profile). Với flash sale (xung đột liên tục) sẽ retry vô tận; dùng cách 1.

#### Cách 4: SERIALIZABLE + retry

Ít code SQL nhất (chỉ `BEGIN ISOLATION LEVEL SERIALIZABLE`), nhưng app phải bắt `40001` và chạy lại toàn bộ transaction (xem kịch bản 3 ở §8.2). Hợp lý khi ràng buộc trải trên nhiều dòng/bảng và bạn không muốn nghĩ về từng lock.

**Sai / Đúng:**

```sql
-- Sai: kiểm tra ở app rồi ghi giá trị đã tính
const s = await db.sku.findUnique(...); if (s.stock >= qty) await db.sku.update({ data: { stock: s.stock - qty } });
-- Hậu quả: bán vượt tồn (kịch bản ngây thơ), và không có lỗi nào để bạn biết.

-- Đúng: để DB tính và kiểm tra trong một câu
UPDATE skus SET stock = stock - $2 WHERE id = $1 AND stock >= $2 RETURNING stock;
-- (Prisma: updateMany với where { id, stock: { gte: qty } } và data { stock: { decrement: qty } }, kiểm tra count)

-- Sai: FOR UPDATE rồi gọi HTTP bên ngoài trong transaction
-- Đúng: FOR NO KEY UPDATE, transaction chỉ chứa SQL, gọi HTTP sau COMMIT (hoặc outbox, §8.5)
```

**Thử biến tấu:** chạy cách 1 với `stock = 5` và **ba** phiên mỗi phiên mua 2 — phiên nào nhận `UPDATE 0`? Bỏ điều kiện `stock >= $2` đi: CHECK `stock >= 0` của schema bắt được gì, thông báo lỗi là gì, và vì sao đó vẫn là thiết kế tệ dù "không bán vượt"? Với cách 2, hai phiên cùng `FOR NO KEY UPDATE` hai sku theo thứ tự ngược nhau — chuyện gì xảy ra (§8.4)?

### 8.4 Deadlock và cách tránh

Hai transaction khoá 2 dòng theo thứ tự ngược nhau → mỗi bên chờ bên kia mãi mãi. Postgres kiểm tra chu trình chờ sau `deadlock_timeout` (mặc định 1 s), huỷ một bên với SQLSTATE `40P01`.

**Bối cảnh:** hai đơn hàng cùng chứa sku 1 và sku 2; service trừ tồn theo thứ tự sku xuất hiện trong giỏ — đơn A giỏ [1, 2], đơn B giỏ [2, 1].

| t   | Phiên A                                                                                     | Phiên B                                                                  |
| --- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 0   | `BEGIN; UPDATE skus SET stock = stock - 1 WHERE id = :sk1;` → `UPDATE 1`                    |                                                                          |
| 1   |                                                                                             | `BEGIN; UPDATE skus SET stock = stock - 1 WHERE id = :sk2;` → `UPDATE 1` |
| 1   |                                                                                             | `UPDATE skus SET stock = stock - 1 WHERE id = :sk1;` → **chờ A**         |
| 2   | `UPDATE skus SET stock = stock - 1 WHERE id = :sk2;` → **chờ B** — chu trình                |                                                                          |
| 3   | `ERROR:  deadlock detected`                                                                 |                                                                          |
| 3   | `DETAIL:  Process 13425 waits for ShareLock on transaction 5594; blocked by process 13426.` |                                                                          |
| 3   | `        Process 13426 waits for ShareLock on transaction 5593; blocked by process 13425.`  |                                                                          |
| 3   | `HINT:  See server log for query details.`                                                  |                                                                          |
| 3   | `CONTEXT:  while updating tuple (26,87) in relation "skus"`                                 |                                                                          |
| 3   | `COMMIT;` → `ROLLBACK`                                                                      | `UPDATE 1` (được mở khoá) rồi `COMMIT;` → `COMMIT`                       |

Postgres chọn huỷ **transaction phát hiện ra chu trình** (ở đây là A, vì A là bên chờ sau và đến hạn `deadlock_timeout` trước); không có quy tắc "ai quan trọng hơn". Chú ý "waits for ShareLock on transaction 5594": chờ khoá dòng được biểu diễn là chờ **transaction** kia kết thúc — vì thế `pg_locks` không có dòng "row lock" cho từng dòng chờ, mà có `locktype = 'transactionid'`.

#### Nhìn ai chờ ai trong lúc kẹt (phiên C, chạy ở t = 2,5)

```sql
SELECT pid, state, wait_event_type, wait_event, pg_blocking_pids(pid) AS blocked_by, left(query, 60) AS query
FROM pg_stat_activity
WHERE datname = current_database() AND pid <> pg_backend_pid() AND state <> 'idle';
```

```
  pid  | state  | wait_event_type |  wait_event   | blocked_by |                            query
-------+--------+-----------------+---------------+------------+--------------------------------------------------------------
 13425 | active | Lock            | transactionid | {13426}    | UPDATE skus SET stock = stock - 1 WHERE id = '2906a086-4b67-
 13426 | active | Lock            | transactionid | {13425}    | UPDATE skus SET stock = stock - 1 WHERE id = 'b28075a4-2a33-
```

`pg_blocking_pids` là hàm quan trọng nhất khi trực production: 13425 bị 13426 chặn và ngược lại — chu trình nhìn thấy bằng mắt. Với `pg_locks`:

```sql
SELECT l.pid, l.locktype, l.mode, l.granted, l.relation::regclass
FROM pg_locks l JOIN pg_stat_activity a ON a.pid = l.pid
WHERE l.locktype IN ('relation', 'tuple') AND a.datname = current_database() AND l.pid <> pg_backend_pid()
ORDER BY l.pid;
```

```
  pid  | locktype |       mode       | granted |        relation
-------+----------+------------------+---------+------------------------
 13425 | relation | RowExclusiveLock | t       | skus                   ← UPDATE lấy RowExclusive trên bảng và mọi index
 13425 | relation | RowExclusiveLock | t       | skus_pkey
 13425 | tuple    | ExclusiveLock    | t       | skus                   ← "tuple lock": đang xếp hàng chờ một dòng cụ thể
 13426 | relation | RowExclusiveLock | t       | skus
 13426 | tuple    | ExclusiveLock    | t       | skus
 ...
```

`RowExclusiveLock` trên bảng **không** xung đột với nhau (nhiều UPDATE cùng bảng là bình thường); nó chỉ xung đột với DDL (`ALTER`, `CREATE INDEX` thường, §9.4). Xung đột thật nằm ở `transactionid` (không hiện `relation`).

#### Quy tắc tránh

- **Khoá theo thứ tự cố định**: khi trừ nhiều sku trong một đơn, `ORDER BY id` trước khi lock/UPDATE:

  ```sql
  -- Đúng: cả hai phiên đều khoá theo thứ tự id tăng dần → phiên sau xếp hàng, không chu trình
  SELECT id, stock FROM skus WHERE id = ANY($1::uuid[]) ORDER BY id FOR NO KEY UPDATE;
  -- Sai: UPDATE ... WHERE id = ANY($1) — thứ tự khoá theo thứ tự plan quét, không kiểm soát được
  ```

- Transaction ngắn; không I/O bên ngoài bên trong transaction.
- Không UPDATE cùng một dòng "tổng" (counter, số dư ví) từ nhiều request; ghi bảng sự kiện rồi tổng hợp.
- Deadlock giữa **UPDATE cha** và **INSERT con** (FK) cũng có thật: A update `products` rồi insert `skus`; B insert `skus` (KEY SHARE trên product) rồi update `products`. Cùng cách chữa: thứ tự cố định.
- Ở app: bắt `40P01` và `40001`, retry có backoff, giới hạn 3 lần. Deadlock hiếm thì retry đủ; deadlock thường xuyên là lỗi thiết kế thứ tự khoá.

**Thử biến tấu:** lặp lại kịch bản với `SET deadlock_timeout = '100ms'` ở cả hai phiên — phiên nào bị huỷ lần này? Tạo deadlock ba phiên A→B→C→A rồi xem `pg_blocking_pids`. Chạy phiên A với `SET lock_timeout = '500ms'`: A lỗi gì trước khi kịp deadlock, và có đúng là "không còn deadlock" không?

### 8.5 SKIP LOCKED — job queue bằng bảng

**Bối cảnh:** sau khi tạo đơn phải gửi email và đẩy sự kiện sang hệ thống kho. Gọi thẳng trong transaction thì chậm và dễ lỗi (file 01 §3.4); gọi sau khi COMMIT thì app chết giữa chừng là mất sự kiện. Giải pháp: ghi sự kiện vào bảng `outbox_events` **trong cùng transaction** với đơn, rồi nhiều worker song song lấy ra xử lý. Vấn đề cần giải: hai worker không được lấy trùng một sự kiện, và worker chết giữa chừng thì sự kiện phải được lấy lại.

```sql
CREATE TABLE outbox_events (
  id           bigserial PRIMARY KEY,
  type         text NOT NULL,
  payload      jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  locked_at    timestamptz,
  processed_at timestamptz,
  attempts     int NOT NULL DEFAULT 0
);
CREATE INDEX outbox_pending_idx ON outbox_events (created_at) WHERE processed_at IS NULL;

-- worker lấy 5 job chưa xử lý, không tranh nhau
WITH picked AS (
  SELECT id FROM outbox_events
  WHERE processed_at IS NULL AND (locked_at IS NULL OR locked_at < now() - interval '5 minutes')
  ORDER BY created_at
  LIMIT 5
  FOR UPDATE SKIP LOCKED
)
UPDATE outbox_events e SET locked_at = now(), attempts = e.attempts + 1
FROM picked WHERE e.id = picked.id
RETURNING e.*;
```

#### Kịch bản: hai worker lấy không trùng, không chờ

20 sự kiện chờ (id 1–20). Worker A giữ transaction 2 giây sau khi lấy (giả lập đang xử lý).

| t   | Worker A                                                  | Worker B                                                                |
| --- | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| 0   | `BEGIN;` + query trên → `RETURNING id`: **1, 2, 3, 4, 5** |                                                                         |
| 1.0 | (đang xử lý, chưa COMMIT)                                 | cùng query → **6, 7, 8, 9, 10** — trả về sau **3 ms** (16.543 → 16.546) |
| 2   | `COMMIT;`                                                 | `COMMIT;`                                                               |

B nhìn thấy dòng 1–5 đang bị khoá và **bỏ qua** thay vì chờ. Cùng kịch bản, bỏ `SKIP LOCKED`:

| t   | Worker A                                | Worker B                                                                                                                      |
| --- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 0   | `BEGIN;` + query `FOR UPDATE` → **1–5** |                                                                                                                               |
| 1.0 |                                         | cùng query → **chờ** trên dòng 1                                                                                              |
| 2.0 | `COMMIT;`                               |                                                                                                                               |
| 2.0 |                                         | trả về sau **1.004 ms** (18.629 → 19.633): dòng 1–5 đọc lại thấy `locked_at` vừa set → không khớp WHERE → bỏ, lấy 5 dòng khác |

Không `SKIP LOCKED`, 10 worker = 9 worker đứng chờ worker đầu; throughput bằng một worker. Còn hai lựa chọn khác đều tệ: `NOWAIT` lỗi ngay và worker phải sleep-retry; `LIMIT` không lock thì lấy trùng.

Vòng đời một job: lấy (`locked_at = now()`) → xử lý ngoài transaction → `UPDATE ... SET processed_at = now() WHERE id = $1` khi xong. Worker chết thì `locked_at` cũ quá 5 phút → job được lấy lại (cột `attempts` để đưa vào dead-letter sau N lần). Transaction lấy job phải **ngắn**: chỉ lấy, COMMIT ngay, rồi mới xử lý — nếu giữ transaction trong lúc gọi API 30 giây, `SKIP LOCKED` vẫn đúng nhưng bạn đang giữ connection và snapshot (§8.1).

Đây là pattern "transactional outbox": ghi event vào bảng **trong cùng transaction** với dữ liệu nghiệp vụ, worker đọc bảng và đẩy ra queue (BullMQ, SQS, Pub/Sub…). App chết giữa chừng thì event vẫn còn. Partial index `WHERE processed_at IS NULL` giữ index bé dù bảng có hàng triệu sự kiện đã xử lý (§7.2.1); nhớ xoá hoặc partition sự kiện cũ (§9.3).

**Thử biến tấu:** thêm cột `priority` và đổi `ORDER BY priority DESC, created_at` — index cần đổi thế nào để không có node Sort? Chạy 3 worker cùng lúc với `LIMIT 1` trong vòng lặp `DO $$ ... $$` 100 lần và đếm `attempts`: có job nào bị lấy 2 lần không? Đổi `FOR UPDATE SKIP LOCKED` thành `FOR NO KEY UPDATE SKIP LOCKED` — có khác gì ở đây không, và khi nào thì khác?

### 8.6 Advisory lock — khoá theo "khái niệm"

Khi không có dòng nào để khoá (ví dụ "mỗi user chỉ một checkout cùng lúc", "chỉ một instance chạy cron này"), Postgres cho phép khoá một **số nguyên** do bạn đặt tên. Hai loại:

```sql
-- Session-level: giữ tới khi gọi unlock hoặc ngắt kết nối. Không tự nhả khi COMMIT.
SELECT pg_advisory_lock(hashtext('checkout:' || $1::text));
SELECT pg_advisory_unlock(hashtext('checkout:' || $1::text));

-- Transaction-level: tự nhả khi COMMIT/ROLLBACK. Ưu tiên dùng loại này.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('checkout:' || $1::text));
-- ... tạo đơn, trừ tồn ...
COMMIT;   -- lock nhả ở đây

-- Bản try_: không chờ, trả true/false
SELECT pg_try_advisory_xact_lock(hashtext('cron:refresh-stats'));
```

#### Kịch bản: hai request checkout cùng user

| t   | Phiên A                                                                                                            | Phiên B                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | --- | --- |
| 0   | `SELECT pg_advisory_lock(hashtext('checkout:user-42'));` → lấy được                                                |                                                                                     |
| 1   |                                                                                                                    | `SELECT pg_try_advisory_lock(hashtext('checkout:user-42'));` → **f**                |
| 1   |                                                                                                                    | `SELECT pg_advisory_lock(hashtext('checkout:user-42'));` → **chờ** (bắt đầu 20.715) |
| 2   | `SELECT pg_advisory_unlock(...);` → `t`                                                                            | lấy được lúc **21.718** (chờ đúng 1 s)                                              |
| 2   |                                                                                                                    | `SELECT pg_advisory_unlock(...);` → `t`                                             |
| 4   | `BEGIN; SELECT pg_advisory_xact_lock(hashtext('checkout:user-42'));`                                               |                                                                                     |
| 4   | `SELECT locktype, mode, granted FROM pg_locks WHERE locktype = 'advisory' AND pid = pg_backend_pid();` → `advisory | ExclusiveLock                                                                       | t`  |     |
| 5   |                                                                                                                    | `SELECT pg_try_advisory_xact_lock(...);` → **f**                                    |
| 6   | `COMMIT;`                                                                                                          |                                                                                     |
| 6   | `SELECT count(*) FROM pg_locks WHERE locktype = 'advisory' AND pid = pg_backend_pid();` → **0**                    |                                                                                     |
| 7   |                                                                                                                    | `SELECT pg_try_advisory_xact_lock(...);` → **t**                                    |

Bẫy của session-level: app dùng connection pool, request A lấy lock rồi throw exception trước khi unlock → connection về pool **vẫn giữ lock**, request khác mượn connection đó thì vô tình "có" lock, còn user-42 bị khoá vĩnh viễn tới khi connection bị đóng. Với `_xact_` không thể xảy ra. Chỉ dùng session-level cho tiến trình dài (worker, migration) và luôn `unlock` trong `finally`.

`hashtext()` trả int4 nên hai chuỗi khác nhau có thể trùng hash (xác suất nhỏ nhưng có); nếu cần tách không gian khoá, dùng bản hai tham số `pg_advisory_xact_lock(int4 key1, int4 key2)`: `(1, user_id_hash)` cho checkout, `(2, ...)` cho việc khác. Advisory lock thay được lock Redis khi hệ thống đã có Postgres và không cần lock xuyên nhiều DB.

**Thử biến tấu:** chạy `pg_advisory_lock(42)` hai lần trong cùng phiên rồi `pg_advisory_unlock(42)` một lần — phiên khác lấy được chưa (advisory lock có đếm số lần)? Dùng `pg_try_advisory_xact_lock` để bảo đảm chỉ một instance chạy `REFRESH MATERIALIZED VIEW` (§9.2), viết cả nhánh "không lấy được thì log và thoát".

---

## Tuần 9 · Recursive CTE, materialized view, partition, migration lớn

### 9.1 Recursive CTE — cây danh mục

**Bối cảnh:** `categories` là cây qua `parent_id` (file 01 §2.2): 5 gốc, mỗi gốc 4 con, mỗi con 3 cháu (85 node). Self-join chỉ lấy được một cấp; câu hỏi thật là "toàn bộ con cháu của danh mục X, bất kể sâu bao nhiêu" và "sản phẩm thuộc X hoặc bất kỳ danh mục con nào của X", vì sản phẩm chỉ được gắn vào danh mục lá.

Cấu trúc luôn là: **phần neo** (anchor: hàng bắt đầu) `UNION ALL` **phần đệ quy** (join bảng với chính kết quả vòng trước, tên CTE) — Postgres lặp tới khi vòng đệ quy không sinh thêm dòng.

#### Ví dụ 1 — con cháu, độ sâu, đường dẫn dạng text

```sql
WITH RECURSIVE tree AS (
  SELECT id, name, parent_id, 0 AS depth, ARRAY[id] AS path, name AS path_text
  FROM categories WHERE parent_id IS NULL AND name = 'Root 1'
  UNION ALL
  SELECT c.id, c.name, c.parent_id, t.depth + 1, t.path || c.id, t.path_text || ' > ' || c.name
  FROM categories c JOIN tree t ON c.parent_id = t.id
  WHERE NOT c.id = ANY(t.path)      -- chặn vòng lặp nếu dữ liệu hỏng (cách cũ, mọi version)
)
SELECT depth, name, path_text FROM tree ORDER BY path_text;
```

```
 depth |          name           |                     path_text
-------+-------------------------+---------------------------------------------------
     0 | Root 1                  | Root 1
     1 | Root 1 / Sub 1          | Root 1 > Root 1 / Sub 1
     2 | Root 1 / Sub 1 / Leaf 1 | Root 1 > Root 1 / Sub 1 > Root 1 / Sub 1 / Leaf 1
     2 | Root 1 / Sub 1 / Leaf 2 | Root 1 > Root 1 / Sub 1 > Root 1 / Sub 1 / Leaf 2
     2 | Root 1 / Sub 1 / Leaf 3 | Root 1 > Root 1 / Sub 1 > Root 1 / Sub 1 / Leaf 3
     1 | Root 1 / Sub 2          | Root 1 > Root 1 / Sub 2
     ...                                                          (17 dòng)
```

`ORDER BY path_text` cho thứ tự "duyệt cây" mà FE cần để render menu lồng nhau; `ORDER BY path` (mảng uuid) cũng được nhưng thứ tự anh em ngẫu nhiên. Sản phẩm thuộc cả cây:

```sql
SELECT DISTINCT p.*
FROM tree t
JOIN product_categories pc ON pc.category_id = t.id
JOIN products p ON p.id = pc.product_id
WHERE p.deleted_at IS NULL;
```

#### Ví dụ 2 — tổ tiên (đi ngược lên) và breadcrumb

**Bối cảnh:** trang sản phẩm hiện breadcrumb "Root 2 > Sub 3 > Leaf 1" từ danh mục lá. Đệ quy theo chiều ngược: join `c.id = t.parent_id`.

```sql
WITH RECURSIVE up AS (
  SELECT id, name, parent_id, 0 AS steps FROM categories WHERE name = 'Root 2 / Sub 3 / Leaf 1'
  UNION ALL
  SELECT c.id, c.name, c.parent_id, up.steps + 1
  FROM categories c JOIN up ON c.id = up.parent_id       -- ngược với ví dụ 1
)
SELECT steps, name FROM up ORDER BY steps;
```

```
 steps |          name
-------+-------------------------
     0 | Root 2 / Sub 3 / Leaf 1
     1 | Root 2 / Sub 3
     2 | Root 2
```

Dừng tự nhiên khi `parent_id IS NULL` (join không ra dòng). Gom thành một chuỗi, gốc trước lá sau:

```sql
SELECT string_agg(name, ' > ' ORDER BY steps DESC) AS breadcrumb FROM up;
```

Với seed này tên đã chứa tiền tố cha nên breadcrumb thật là `Root 2 > Root 2 / Sub 3 > Root 2 / Sub 3 / Leaf 1`; trong dữ liệu thật tên chỉ là "Leaf 1" và output là `Root 2 > Sub 3 > Leaf 1`. Đi lên luôn rẻ (mỗi vòng đúng 1 dòng, dùng PK), nên breadcrumb không cần cache.

#### Ví dụ 3 — đếm sản phẩm theo từng nhánh

**Bối cảnh:** menu cần "Root 1 (760)", tức số product thuộc bất kỳ node nào dưới Root 1. Mẹo: neo là **tất cả** gốc cùng lúc, mang theo `root_id` xuống từng node con.

```sql
WITH RECURSIVE tree AS (
  SELECT id AS root_id, id, name AS root_name FROM categories WHERE parent_id IS NULL
  UNION ALL
  SELECT t.root_id, c.id, t.root_name FROM categories c JOIN tree t ON c.parent_id = t.id
)
SELECT t.root_name, count(DISTINCT pc.product_id) AS products, count(DISTINCT t.id) AS categories
FROM tree t LEFT JOIN product_categories pc ON pc.category_id = t.id
GROUP BY t.root_name ORDER BY t.root_name;
```

```
 root_name | products | categories
-----------+----------+------------
 Root 1    |      760 |         17
 Root 2    |      675 |         17
 Root 3    |      692 |         17
 Root 4    |      741 |         17
 Root 5    |      735 |         17
```

`count(DISTINCT pc.product_id)` vì một product gắn 2 category lá có thể cùng nhánh — không DISTINCT sẽ đếm đôi. Đổi neo thành `WHERE parent_id = (SELECT id FROM categories WHERE name = 'Root 1')` để đếm theo từng Sub (thật: 194 / 204 / 211 / 207). Tổng các Sub (816) > 760 của Root vì cùng lý do — product nằm ở hai Sub khác nhau được đếm ở cả hai; đó là đúng nghiệp vụ "menu", nhưng đừng cộng chúng lại.

#### Ví dụ 4 — dữ liệu hỏng thành vòng lặp; `CYCLE` (PG 14+)

**Bối cảnh:** admin lỡ đặt `parent_id` của "Root 1" trỏ về một cháu của chính nó. Recursive CTE không có bảo vệ chạy **mãi mãi**:

```sql
BEGIN;
UPDATE categories SET parent_id = (SELECT id FROM categories WHERE name = 'Root 1 / Sub 1 / Leaf 1') WHERE name = 'Root 1';
SET LOCAL statement_timeout = '2s';
WITH RECURSIVE tree AS (
  SELECT id, name, parent_id, 0 AS depth FROM categories WHERE name = 'Root 1'
  UNION ALL
  SELECT c.id, c.name, c.parent_id, t.depth + 1 FROM categories c JOIN tree t ON c.parent_id = t.id
)
SELECT count(*) FROM tree;
-- ERROR:  canceling statement due to statement timeout
ROLLBACK;
```

Không có `statement_timeout`, query này chạy tới khi hết RAM/đĩa tạm. Cú pháp chuẩn từ PG 14 thay cho `NOT c.id = ANY(path)`:

```sql
WITH RECURSIVE tree AS (
  SELECT id, name, parent_id, 0 AS depth FROM categories WHERE name = 'Root 1'
  UNION ALL
  SELECT c.id, c.name, c.parent_id, t.depth + 1 FROM categories c JOIN tree t ON c.parent_id = t.id
) CYCLE id SET is_cycle USING path
SELECT depth, name, is_cycle FROM tree WHERE is_cycle OR depth <= 1 ORDER BY depth, name;
```

```
 depth |      name      | is_cycle
-------+----------------+----------
     0 | Root 1         | f
     1 | Root 1 / Sub 1 | f
     1 | Root 1 / Sub 2 | f
     1 | Root 1 / Sub 3 | f
     1 | Root 1 / Sub 4 | f
     3 | Root 1         | t        ← gặp lại Root 1 ở depth 3, đánh dấu và không đi tiếp
```

`CYCLE id SET is_cycle USING path` tự thêm hai cột: `is_cycle` (boolean) và `path` (mảng các `id` đã đi qua). Luôn thêm nó (hoặc `depth < 20`) cho cây do người dùng sửa được; thêm cả CHECK ở app "parent mới không được là con cháu của chính nó" — kiểm tra bằng chính query tổ tiên ở ví dụ 2.

#### Plan của recursive CTE

```
CTE tree
  ->  Recursive Union  (actual rows=17 loops=1)
        ->  Seq Scan on categories  (actual rows=1 loops=1)               ← neo
              Filter: (name = 'Root 1'::text)
        ->  Hash Join  (actual rows=5 loops=3)                             ← đệ quy: chạy 3 vòng
              Hash Cond: (c.parent_id = t.id)
              ->  Seq Scan on categories c  (actual rows=85 loops=3)
              ->  Hash  ->  WorkTable Scan on tree t  (actual rows=6 loops=3)   ← kết quả vòng trước
```

`loops=3` = 3 vòng (gốc → sub → leaf → không còn gì). `WorkTable Scan` là "vòng trước". Bảng 85 dòng nên Seq Scan; cây vài nghìn node cần index trên `parent_id` (schema mẫu có) để nhánh đệ quy thành Index Scan. Cây > vài chục nghìn node và đọc rất nhiều → lưu `path` sẵn (extension `ltree`) hoặc closure table.

**Thử biến tấu:** viết query trả về cho mỗi category số con **trực tiếp** và số con cháu **tổng**, trong một câu. Sửa ví dụ 1 để chỉ lấy tới `depth <= 1` (menu 2 cấp) và xem plan còn `loops=3` không. Với `CYCLE`, thay `USING path` bằng tên khác và SELECT cột đó ra: nó là mảng gì?

### 9.2 Materialized view — báo cáo nặng đọc nhiều

**Bối cảnh:** query thống kê product ở file 02 §4.1 (min giá, tổng tồn, rating trung bình) được gọi ở mọi trang listing, hàng nghìn lần một phút, trong khi dữ liệu nguồn chỉ đổi vài lần một phút. Tính lại mỗi lần là lãng phí; materialized view lưu sẵn kết quả như một bảng và làm mới định kỳ.

```sql
CREATE MATERIALIZED VIEW product_stats AS
WITH s AS (
  SELECT product_id, MIN(price) AS min_price, SUM(stock) AS total_stock
  FROM skus WHERE deleted_at IS NULL GROUP BY product_id
), r AS (
  SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
  FROM reviews GROUP BY product_id
)
SELECT p.id AS product_id, s.min_price, COALESCE(s.total_stock, 0) AS total_stock,
       COALESCE(r.avg_rating, 0) AS avg_rating, COALESCE(r.review_count, 0) AS review_count
FROM products p
LEFT JOIN s ON s.product_id = p.id
LEFT JOIN r ON r.product_id = p.id
WHERE p.deleted_at IS NULL;

CREATE UNIQUE INDEX product_stats_pk ON product_stats (product_id);   -- bắt buộc cho CONCURRENTLY
REFRESH MATERIALIZED VIEW CONCURRENTLY product_stats;
```

#### REFRESH thường vs CONCURRENTLY — khác nhau ở lock

Cả hai đều chạy lại query gốc (ở đây 24 ms vs 28 ms, gần như nhau). Khác biệt là **ai bị chặn trong lúc đó**. Kịch bản: phiên A giữ REFRESH trong transaction 3 giây (giả lập query gốc chậm); phiên B là request listing với `lock_timeout = '1500ms'`.

| t   | Phiên A                                                                                                 | Phiên B                                                                     |
| --- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 0   | `BEGIN; REFRESH MATERIALIZED VIEW product_stats;`                                                       |                                                                             |
| 0   | `pg_locks` của A trên `product_stats`: `AccessExclusiveLock` (+ Share, Exclusive, AccessShare)          |                                                                             |
| 1   |                                                                                                         | `SELECT count(*) FROM product_stats;` → **chờ**                             |
| 2.5 |                                                                                                         | `ERROR:  canceling statement due to lock timeout`                           |
| 3   | `COMMIT;`                                                                                               |                                                                             |
| 4   | `BEGIN; REFRESH MATERIALIZED VIEW CONCURRENTLY product_stats;`                                          |                                                                             |
| 4   | `pg_locks` của A: `ExclusiveLock`, `RowExclusiveLock`, `AccessShareLock` — **không** có AccessExclusive |                                                                             |
| 5   |                                                                                                         | `SELECT count(*) FROM product_stats;` → **1950** sau 2 ms (32.312 → 32.314) |
| 7   | `COMMIT;`                                                                                               |                                                                             |

REFRESH thường xây bảng mới rồi **tráo** (cần `AccessExclusiveLock`, chặn cả SELECT) — với query gốc chạy 30 giây, listing đứng 30 giây. CONCURRENTLY tính kết quả vào bảng tạm, so với bản cũ theo unique index, rồi UPDATE/INSERT/DELETE **từng dòng khác biệt** dưới `ExclusiveLock` (chặn REFRESH khác, không chặn SELECT). Đổi lại: chậm hơn (thêm bước diff), cần unique index, không dùng được cho lần refresh đầu tiên của MV `WITH NO DATA`, và sinh dead tuple như UPDATE thường (§8.1).

Dùng khi: dữ liệu chấp nhận trễ vài phút, query gốc chạy > 1 s, đọc nhiều hơn ghi rất nhiều. Refresh bằng cron / worker, bọc `pg_try_advisory_xact_lock` để hai instance không refresh chồng (§8.6). Cần realtime → không dùng MV mà cập nhật bảng thống kê bằng trigger hoặc job theo event (outbox, §8.5). MV không tự cập nhật khi bảng nguồn đổi; `pg_stat_user_tables` không có `last_refresh` — tự ghi vào bảng meta nếu cần hiển thị "cập nhật lúc".

**Thử biến tấu:** thêm index `(avg_rating DESC)` trên MV và viết query "top 20 product rating cao còn hàng" dùng cả `product_stats` và `products`. Chạy `EXPLAIN ANALYZE` cho `REFRESH ... CONCURRENTLY` (được) và tìm node diff. Tạo MV `WITH NO DATA` rồi thử `REFRESH ... CONCURRENTLY` — lỗi gì?

### 9.3 Partition — bảng thời gian lớn

**Bối cảnh:** giả sử thêm bảng `payment_transactions` ghi mọi giao dịch cổng thanh toán, vài triệu dòng mỗi tháng, chỉ cần giữ 12 tháng. Log, event, giao dịch thanh toán: partition theo tháng để xoá dữ liệu cũ bằng `DROP TABLE partition` (tức thì) thay vì `DELETE` (chậm, gây bloat), và để query theo khoảng thời gian chỉ đụng vài partition.

```sql
CREATE TABLE payment_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(), order_id uuid NOT NULL, amount numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (id, created_at)                -- khoá partition phải nằm trong PK / unique
) PARTITION BY RANGE (created_at);

CREATE TABLE payment_transactions_2026_07 PARTITION OF payment_transactions FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE payment_transactions_2026_08 PARTITION OF payment_transactions FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE payment_transactions_2026_09 PARTITION OF payment_transactions FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

-- nạp thử từ orders 3 tháng gần nhất
INSERT INTO payment_transactions (order_id, amount, created_at)
SELECT id, 100 + random() * 900, created_at FROM orders WHERE created_at >= '2026-07-01';

SELECT tableoid::regclass AS partition, count(*) FROM payment_transactions GROUP BY 1 ORDER BY 1;
```

```
          partition           | count
------------------------------+-------
 payment_transactions_2026_07 |  8452
 payment_transactions_2026_08 |  8640
 payment_transactions_2026_09 |  8170
```

`tableoid` cho biết dòng nằm ở partition nào. Insert vào bảng cha, Postgres tự định tuyến.

#### Partition pruning trong EXPLAIN

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT sum(amount) FROM payment_transactions WHERE created_at >= '2026-09-01' AND created_at < '2026-09-15';
```

```
Aggregate  (actual time=1.127..1.127 rows=1 loops=1)
  ->  Seq Scan on payment_transactions_2026_09 payment_transactions  (cost=0.00..189.03 rows=37 width=16) (actual time=0.006..0.784 rows=3900 loops=1)
        Filter: ((created_at >= '2026-09-01 00:00:00+00'::timestamptz) AND (created_at < '2026-09-15 00:00:00+00'::timestamptz))
        Rows Removed by Filter: 4270
        Buffers: shared hit=77
```

Chỉ **một** partition xuất hiện, không có node `Append`: hai partition kia bị loại lúc lập kế hoạch. (`rows=37` ước sai vì bảng mới chưa `ANALYZE` — nhớ điều này khi nạp partition mới.) Với tham số chỉ biết lúc chạy (`created_at >= now() - interval '3 days'`), pruning diễn ra lúc thực thi và plan ghi rõ:

```
->  Append  (actual time=0.005..1.202 rows=713 loops=1)
      Subplans Removed: 1                                                       ← partition 08 bị loại lúc chạy
      ->  Seq Scan on payment_transactions_2026_09 ... (actual rows=713 loops=1)
      ->  Seq Scan on payment_transactions_2026_10 ... (actual rows=0 loops=1)
      ->  Seq Scan on payment_transactions_default ... (actual rows=0 loops=1)
```

Pruning **mất** khi bọc cột partition trong hàm — quy tắc y hệt index (§7.1):

```sql
EXPLAIN (ANALYZE) SELECT sum(amount) FROM payment_transactions WHERE date_trunc('month', created_at) = '2026-09-01';
```

```
->  Append  (actual time=2.367..4.173 rows=8170 loops=1)
      ->  Seq Scan on payment_transactions_2026_07 ... (actual rows=0 loops=1)   Rows Removed by Filter: 8452
      ->  Seq Scan on payment_transactions_2026_08 ... (actual rows=0 loops=1)   Rows Removed by Filter: 8640
      ->  Seq Scan on payment_transactions_2026_09 ... (actual rows=8170 loops=1)
Execution Time: 4.771 ms          ← 4 lần chậm hơn, và với 12 partition sẽ là 12 lần
```

#### Dòng không có partition; default partition

```sql
INSERT INTO payment_transactions (order_id, amount, created_at) VALUES (gen_random_uuid(), 1, '2026-10-05');
-- ERROR:  no partition of relation "payment_transactions" found for row
-- DETAIL:  Partition key of the failing row contains (created_at) = (2026-10-05 00:00:00+00).
```

Đây là lỗi production kinh điển lúc 00:00 ngày đầu tháng khi quên tạo partition mới. Hai cách phòng: job tạo partition trước vài tháng (extension `pg_partman` làm việc này), hoặc default partition hứng mọi thứ không khớp:

```sql
CREATE TABLE payment_transactions_default PARTITION OF payment_transactions DEFAULT;
INSERT INTO ... VALUES (..., '2026-10-05');       -- INSERT 0 1, vào _default
```

Nhưng default partition có cái giá — khi tạo partition tháng 10 sau đó:

```sql
CREATE TABLE payment_transactions_2026_10 PARTITION OF payment_transactions FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
-- ERROR:  updated partition constraint for default partition "payment_transactions_default" would be violated by some row
```

Postgres phải quét default để chắc không có dòng nào thuộc khoảng mới (và giữ lock trong lúc quét). Phải chuyển dòng ra trước: `WITH moved AS (DELETE FROM payment_transactions_default WHERE created_at >= '2026-10-01' AND created_at < '2026-11-01' RETURNING *) INSERT INTO payment_transactions SELECT * FROM moved;` — sau khi đã tạo partition mới bằng cách tách rời (xem ATTACH bên dưới). Quan điểm thực dụng: default partition là **lưới an toàn có cảnh báo** (monitor `count(*)` của nó phải bằng 0), không phải nơi chứa dữ liệu.

#### DETACH / ATTACH — xoá cũ, nạp lưu trữ

```sql
-- Tháng 7 hết hạn lưu: tách rồi drop (hoặc giữ làm bảng thường để archive)
ALTER TABLE payment_transactions DETACH PARTITION payment_transactions_2026_07;
SELECT count(*) FROM payment_transactions;            -- 16810: mất 8452 dòng khỏi bảng cha ngay lập tức
SELECT count(*) FROM payment_transactions_2026_07;    -- 8452: bảng độc lập, dữ liệu còn nguyên
DROP TABLE payment_transactions_2026_07;              -- tức thì, không bloat, không WAL từng dòng

-- Nạp dữ liệu lưu trữ trở lại: tạo bảng thường, nạp, rồi gắn
ALTER TABLE payment_transactions ATTACH PARTITION payment_transactions_2026_07 FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
```

`ATTACH` phải quét bảng để kiểm tra mọi dòng nằm trong khoảng (giữ `ShareUpdateExclusiveLock` trên cha). Với bảng lớn, thêm `CHECK (created_at >= '2026-07-01' AND created_at < '2026-08-01')` vào bảng con **trước** khi ATTACH → Postgres tin CHECK, bỏ qua bước quét. `DETACH ... CONCURRENTLY` (PG 14+) không chặn query trên cha, nhưng thí nghiệm thật cho lỗi khi có default partition: `ERROR:  cannot detach partitions concurrently when a default partition exists` — thêm một lý do cân nhắc default.

Khi nào chưa cần: bảng < ~50 triệu dòng và không có nhu cầu xoá theo thời gian. Partition có chi phí: mọi unique constraint phải chứa khoá partition (không `UNIQUE (order_id)` toàn cục được), FK từ bảng khác trỏ vào bảng partition cần PG 12+, và mỗi query planning tốn thêm theo số partition (giữ dưới vài trăm).

**Thử biến tấu:** viết hàm `ensure_partition(month date)` tạo partition nếu chưa có, idempotent, để cron gọi mỗi ngày. Partition `orders` (bản copy) theo `status` bằng `PARTITION BY LIST` và xem query `WHERE status = 'pending'` prune thế nào; sau đó thử `UPDATE ... SET status = 'paid'` — dòng có "chuyển partition" không (PG 11+)? So `EXPLAIN` của `DELETE FROM payment_transactions WHERE created_at < '2026-08-01'` với `DROP TABLE` partition: ước cost, WAL, thời gian.

### 9.4 Migration không làm sập production

| Việc                | Cách an toàn                                                                                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Thêm cột có DEFAULT | PG ≥ 11: `ADD COLUMN ... DEFAULT <hằng số>` tức thì, không rewrite. DEFAULT là hàm volatile (`now()`, `gen_random_uuid()`) → rewrite cả bảng                           |
| Thêm cột NOT NULL   | thêm cột nullable → backfill theo batch → `ADD CONSTRAINT ... CHECK (col IS NOT NULL) NOT VALID` → `VALIDATE` → `SET NOT NULL` (PG ≥ 12 nhận ra CHECK, không quét lại) |
| Thêm index          | `CREATE INDEX CONCURRENTLY` (ngoài transaction)                                                                                                                        |
| Đổi tên / kiểu cột  | expand–contract: thêm cột mới, ghi song song, migrate đọc, xoá cột cũ ở release sau                                                                                    |
| Backfill triệu dòng | `UPDATE ... WHERE id IN (SELECT id ... LIMIT 5000)` lặp, có sleep, không một UPDATE khổng lồ                                                                           |
| Thêm FK             | `ADD CONSTRAINT ... NOT VALID` rồi `VALIDATE CONSTRAINT` (VALIDATE chỉ giữ `ShareUpdateExclusive`)                                                                     |
| Xoá cột             | xoá code dùng cột trước, deploy, rồi mới drop                                                                                                                          |
| Mọi DDL             | `SET lock_timeout = '3s'` + retry, để DDL không xếp hàng chặn cả app                                                                                                   |

Mọi tool migration (Prisma Migrate, Drizzle Kit, TypeORM, Flyway…) đều chỉ là "chạy file SQL theo thứ tự". Hiểu bảng trên là hiểu được file SQL nào tool sinh ra là nguy hiểm. Ba thí nghiệm dưới đây chứng minh ba dòng quan trọng nhất.

#### Thí nghiệm 1 — `ADD COLUMN ... DEFAULT` có rewrite hay không (`\timing on`, `order_items` 150.055 dòng)

```sql
ALTER TABLE order_items ADD COLUMN note text NOT NULL DEFAULT 'n/a';
-- Time: 2.684 ms
SELECT attname, atthasmissing, attmissingval FROM pg_attribute WHERE attrelid = 'order_items'::regclass AND attname = 'note';
```

```
 attname | atthasmissing | attmissingval
---------+---------------+---------------
 note    | t             | {n/a}
```

2,7 ms cho 150k dòng vì Postgres **không ghi gì vào dòng**: nó lưu giá trị mặc định vào catalog (`attmissingval`) và khi đọc dòng cũ thiếu cột thì điền vào. Kể cả `NOT NULL` cũng tức thì. Giờ DEFAULT là hàm volatile:

```sql
ALTER TABLE order_items ADD COLUMN ref_code uuid DEFAULT gen_random_uuid();
-- Time: 443.425 ms
```

```
 attname  | atthasmissing | attmissingval
----------+---------------+---------------
 note     | f             |                 ← rewrite đã "vật chất hoá" luôn cột note
 ref_code | f             |
```

Mỗi dòng cần một giá trị khác nhau nên phải rewrite toàn bảng (443 ms ở 13 MB; bảng 50 GB là hàng chục phút giữ `AccessExclusiveLock`, app đứng). Cách đúng: thêm cột không DEFAULT, backfill theo batch, rồi `ALTER ... SET DEFAULT gen_random_uuid()` cho dòng mới.

#### Thí nghiệm 2 — NOT NULL không quét lâu

```sql
ALTER TABLE order_items ADD COLUMN warehouse_id int;                                  -- 2.5 ms
-- backfill theo batch ở đây (một lệnh cho gọn):
UPDATE order_items SET warehouse_id = 1 WHERE id <= 150000;                             -- 1862 ms, đây là phần phải chia batch
ALTER TABLE order_items ADD CONSTRAINT order_items_wh_nn CHECK (warehouse_id IS NOT NULL) NOT VALID;   -- 3.1 ms, không quét
UPDATE order_items SET warehouse_id = 1 WHERE warehouse_id IS NULL;                     -- dọn phần còn sót (55 dòng)
ALTER TABLE order_items VALIDATE CONSTRAINT order_items_wh_nn;                          -- 10.7 ms, quét nhưng chỉ giữ ShareUpdateExclusive: app vẫn ghi được
ALTER TABLE order_items ALTER COLUMN warehouse_id SET NOT NULL;                         -- 1.4 ms: PG 12+ thấy CHECK đã VALID, không quét lại
ALTER TABLE order_items DROP CONSTRAINT order_items_wh_nn;
```

`SET NOT NULL` trực tiếp trên bảng chưa có CHECK sẽ quét toàn bảng dưới `AccessExclusiveLock`. Với 150k dòng là 10 ms, không ai để ý; với 100 triệu dòng là vài phút app đứng — và đây chính là loại migration Prisma/TypeORM sinh ra mặc định.

#### Thí nghiệm 3 — `CREATE INDEX` vs `CONCURRENTLY` với INSERT song song

| t   | Phiên A                                                                                         | Phiên B (`lock_timeout = 1500ms`)                                                         |
| --- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 0   | `BEGIN; CREATE INDEX order_items_pname_idx ON order_items (product_name);`                      |                                                                                           |
| 0   | `pg_locks` của A trên `order_items`: **`ShareLock`**                                            |                                                                                           |
| 1   |                                                                                                 | `INSERT INTO order_items (...) VALUES (...);` → **chờ**                                   |
| 2.5 |                                                                                                 | `ERROR:  canceling statement due to lock timeout`                                         |
| 3   | `COMMIT;`                                                                                       |                                                                                           |
| 5   | `CREATE INDEX CONCURRENTLY order_items_pname_idx ON order_items (product_name);`                | `BEGIN; INSERT INTO order_items (...);` → `INSERT 0 1` **không chờ**; giữ transaction 3 s |
| 8   |                                                                                                 | `COMMIT;`                                                                                 |
| 8   | `Time: 1407.630 ms` — A **chờ B commit** rồi mới xong (index 150k dòng bình thường mất ~150 ms) |                                                                                           |

`ShareLock` cho phép SELECT nhưng chặn INSERT/UPDATE/DELETE trong suốt thời gian build; bảng 50 GB là 20 phút không ghi được. CONCURRENTLY chỉ giữ `ShareUpdateExclusiveLock`: ghi bình thường, nhưng nó phải **chờ mọi transaction đang mở** kết thúc (hai lần, ở hai pha) — nên một transaction quên COMMIT làm CIC treo vô hạn, và CIC thất bại để lại index `INVALID` phải `DROP INDEX` rồi tạo lại. Không chạy được trong transaction: với Prisma, đặt migration đó vào file riêng và... Prisma luôn bọc transaction, nên phải chạy tay hoặc dùng tool khác; Drizzle/TypeORM/Flyway có cờ tắt transaction cho từng file.

#### Thí nghiệm 4 — hàng đợi lock: một ALTER chặn cả app, và `lock_timeout` cứu thế nào

**Bối cảnh:** phiên A là một báo cáo đọc `orders` trong transaction 4 giây (chỉ giữ `AccessShareLock`, vô hại). Phiên B chạy migration `ALTER TABLE orders ADD COLUMN note text` (tức thì theo thí nghiệm 1, nhưng cần `AccessExclusiveLock`). Phiên C là một request bình thường đọc `orders`.

| t   | Phiên A                                         | Phiên B                                                         | Phiên C                                                                      |
| --- | ----------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 0   | `BEGIN; SELECT count(*) FROM orders;` (giữ 4 s) |                                                                 |                                                                              |
| 1   |                                                 | `ALTER TABLE orders ADD COLUMN note text;` → **chờ A** (44.596) |                                                                              |
| 2   |                                                 |                                                                 | `SELECT count(*) FROM orders WHERE status = 'pending';` → **chờ B** (45.586) |
| 4   | `COMMIT;`                                       | `ALTER TABLE` xong lúc **47.592**                               | trả về lúc **47.597** — chờ 2 giây cho một SELECT 3 ms                       |

Lock của Postgres là **hàng đợi công bằng**: C xếp sau B dù C chỉ cần `AccessShare` tương thích với A. Nghĩa là một `ALTER` "tức thì" xếp sau một báo cáo chậm sẽ **chặn toàn bộ traffic** đọc/ghi bảng đó cho tới khi báo cáo xong. Cùng kịch bản, B đặt `SET lock_timeout = '500ms'`:

| t   | Phiên A                            | Phiên B                                                                 | Phiên C                                                       |
| --- | ---------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------- |
| 0   | `BEGIN; SELECT count(*) ...` (4 s) |                                                                         |                                                               |
| 1   |                                    | `ALTER TABLE ...` → chờ (48.692)                                        |                                                               |
| 1.5 |                                    | `ERROR:  canceling statement due to lock timeout` — B rút khỏi hàng đợi |                                                               |
| 2   |                                    |                                                                         | `SELECT count(*) ...` → trả về sau **3 ms** (49.694 → 49.697) |
| 4   | `COMMIT;`                          |                                                                         |                                                               |
| 5.5 |                                    | retry: `ALTER TABLE ...` → `ALTER TABLE` xong lúc 53.200                |                                                               |

Mẫu cho mọi DDL trên production:

```sql
SET lock_timeout = '3s';            -- chờ tối đa 3 s để lấy lock
SET statement_timeout = '0';        -- nhưng bản thân DDL (nếu phải quét) được chạy lâu
-- retry ở app/script: lặp tối đa N lần, sleep tăng dần, tới khi ALTER thành công
ALTER TABLE orders ADD COLUMN note text;
```

Kết hợp: kiểm tra `pg_stat_activity` tìm transaction dài trên bảng trước khi chạy migration; chạy migration ngoài giờ cao điểm; và với bảng nóng, `ALTER` phải là loại tức thì (thí nghiệm 1–2) — ngay cả khi nó tức thì, `lock_timeout` vẫn bắt buộc vì hàng đợi.

**Sai / Đúng:**

| Sai                                                                   | Đúng                                                                                  | Hậu quả nếu sai                                                                           |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `ADD COLUMN created_at timestamptz DEFAULT now()` trên bảng 100M dòng | `ADD COLUMN created_at timestamptz;` + backfill batch + `ALTER ... SET DEFAULT now()` | rewrite toàn bảng dưới AccessExclusive: app đứng hàng chục phút, WAL bùng nổ, replica lag |
| `CREATE INDEX` trong file migration bọc transaction                   | `CREATE INDEX CONCURRENTLY` ngoài transaction, có kiểm tra `indisvalid` sau đó        | mọi INSERT/UPDATE vào bảng chờ tới khi index xong                                         |
| Chạy `ALTER` không `lock_timeout`                                     | `SET lock_timeout = '3s'` + retry                                                     | một transaction báo cáo đang mở biến migration "1 ms" thành sự cố toàn hệ thống           |

**Thử biến tấu:** mô phỏng expand–contract đổi `orders.status` từ text sang enum: viết đủ 4 bước SQL và chỉ ra bước nào cần lock gì. Chạy `CREATE INDEX CONCURRENTLY` rồi giết nó giữa chừng (`pg_cancel_backend`), xem `SELECT indexrelid::regclass, indisvalid FROM pg_index WHERE NOT indisvalid` và dọn. Với Prisma Migrate, tìm cách đưa một `CREATE INDEX CONCURRENTLY` vào pipeline (gợi ý: file 04).

### 9.5 Những thứ vận hành nên biết tên

#### VACUUM và bloat — thí nghiệm đo bằng `pg_relation_size`

**Bối cảnh:** một job "đồng bộ trạng thái" chạy `UPDATE orders SET status = status` cho toàn bộ 50.000 đơn (UPDATE không đổi gì vẫn tạo phiên bản mới, §8.1).

```sql
SELECT pg_size_pretty(pg_relation_size('orders')), (SELECT n_dead_tup FROM pg_stat_user_tables WHERE relname = 'orders');
-- 3992 kB | 0
UPDATE orders SET status = status;                     -- UPDATE 50000
-- 7976 kB | 50000        ← bảng gấp đôi: 50k phiên bản cũ + 50k mới
VACUUM (VERBOSE) orders;
-- INFO:  tuples: 50000 removed, 50000 remain, 0 are dead but not yet removable
-- INFO:  index scan needed: 499 pages from table (50.05% of total) had 49963 dead item identifiers removed
-- 7976 kB | 0            ← dead = 0 nhưng KÍCH THƯỚC KHÔNG GIẢM
```

`VACUUM` thường chỉ đánh dấu chỗ trống để **tái sử dụng** cho INSERT/UPDATE sau; nó không trả đĩa về OS (chỉ cắt được phần trống ở cuối file). Vì vậy sau lần UPDATE 8.259 đơn tiếp theo, kích thước vẫn 7976 kB — chỗ trống được dùng lại, bảng không phình thêm. Đây là trạng thái bình thường của bảng ghi nhiều: "bloat ổn định" khoảng 20–50%. Muốn co lại thật:

```sql
VACUUM FULL orders;      -- 3992 kB
```

`VACUUM FULL` chép bảng sang file mới, giữ `AccessExclusiveLock` suốt quá trình (bảng 50 GB = app đứng hàng chục phút) và cần đĩa trống bằng kích thước bảng. Trên production dùng `pg_repack` (extension, làm việc tương tự nhưng online) hoặc chấp nhận bloat ổn định. Chỉ dùng `VACUUM FULL` sau khi xoá phần lớn bảng một lần (ví dụ dọn 80% log cũ) — mà trường hợp đó thì partition (§9.3) tốt hơn.

Autovacuum mặc định kích hoạt khi dead > 20% + 50 dòng; bảng `skus` update liên tục nên hạ ngưỡng riêng: `ALTER TABLE skus SET (autovacuum_vacuum_scale_factor = 0.02);`. Theo dõi: `n_dead_tup / n_live_tup` và `last_autovacuum` trong `pg_stat_user_tables`; bloat thật bằng extension `pgstattuple`.

#### Các khái niệm còn lại

- **Connection pooling**: mỗi connection Postgres tốn ~5–10 MB RAM và một process; `max_connections` mặc định 100. App nhiều instance × pool 10 = vượt nhanh. Dùng PgBouncer (transaction mode; lưu ý session-level advisory lock và `SET` không sống qua transaction mode) hoặc pool của driver với giới hạn hợp lý.
- **`work_mem`**: RAM cho mỗi node sort/hash (mặc định 4 MB); `Sort Method: external merge  Disk:` hoặc `Batches: 8` trong plan → tăng, nhưng nhân với số connection × số node. Đặt riêng cho session báo cáo (`SET work_mem = '256MB'`) thay vì toàn cụm.
- **`shared_buffers`** ~25% RAM; `Buffers: shared read=` lớn lặp lại trên cùng query là dấu hiệu cache không đủ.
- **Replica đọc**: query báo cáo nặng chạy trên replica, không cản OLTP; chấp nhận lag vài trăm ms — không đọc "đơn vừa tạo" từ replica.
- **Backup & PITR**: biết dự án backup thế nào (pg_dump theo lịch? WAL archiving?) trước khi chạy bất kỳ DELETE/UPDATE hàng loạt nào. `BEGIN; ... ; SELECT count(*) ...;` kiểm tra rồi mới `COMMIT` là thói quen bắt buộc khi sửa dữ liệu tay.
- **Transaction ID wraparound**: xid là số 32-bit; VACUUM còn nhiệm vụ "đóng băng" dòng cũ. `VACUUM (VERBOSE)` ở trên in `new relfrozenxid`. Khi thấy log "database must be vacuumed within N transactions" là khẩn cấp thật.

**Thử biến tấu:** lặp lại thí nghiệm bloat với `DELETE FROM orders WHERE status = 'cancelled'` rồi `VACUUM` — kích thước có giảm không, và nếu các dòng cancelled tình cờ nằm ở cuối file thì sao? Đo thời gian `VACUUM FULL orders` và so với `CREATE TABLE orders_new AS SELECT ...` + đổi tên; cách nào giữ index và FK? Mở một transaction `SELECT 1` ở phiên khác rồi chạy lại thí nghiệm bloat: đọc dòng "dead but not yet removable" và giải thích.

---

## Tự kiểm tra cuối giai đoạn 3

- [ ] Nhìn `EXPLAIN ANALYZE` chỉ ra được node tốn nhất và đề xuất index cụ thể (cột, thứ tự, partial hay không), rồi chứng minh bằng `Buffers` trước/sau.
- [ ] Giải thích được vì sao `WHERE user_id = $1` không dùng index `(deleted_at, user_id)`, và vì sao `WHERE status = 'delivered'` không nên có index riêng trên `status`.
- [ ] Đọc được `Heap Fetches`, `loops`, `Rows Removed by Filter`, `Batches` và nói được từng con số gợi ý hành động gì.
- [ ] Tái hiện non-repeatable read, lost update và write skew bằng hai cửa sổ psql; nói được level nào chặn được cái nào.
- [ ] Viết trừ tồn kho an toàn bằng 2 trong 4 cách, nói được ưu nhược, và chọn đúng giữa `FOR UPDATE` / `FOR NO KEY UPDATE`.
- [ ] Tái hiện deadlock bằng 2 cửa sổ psql, đọc `pg_blocking_pids`, và sửa bằng thứ tự khoá.
- [ ] Viết recursive CTE lấy toàn bộ sản phẩm của một cây danh mục, breadcrumb đi ngược, và có `CYCLE`.
- [ ] Trình bày quy trình thêm cột NOT NULL vào bảng 50 triệu dòng không downtime, kèm `lock_timeout` + retry.
- [ ] Giải thích vì sao `VACUUM` không làm bảng nhỏ lại và khi nào mới cần `VACUUM FULL` / `pg_repack`.
- [ ] Hoàn thành bài 21–27 trong [05-exercises.md](05-exercises.md).

**Tiếp theo**: [04-sql-in-nestjs.md](04-sql-in-nestjs.md).
