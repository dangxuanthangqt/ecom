# 01 · Nền tảng (tuần 1–3)

Mục tiêu: sau 3 tuần, bạn viết được mọi query CRUD + báo cáo đơn giản bằng tay, không nhìn ORM, và **hiểu vì sao kết quả ra như vậy**.

Cách học: mỗi mục đọc 10 phút, gõ lại ví dụ 10 phút, tự biến tấu 10 phút. Mọi ví dụ chạy trên schema mẫu trong [schema.sql](schema.sql) (đã `SET search_path TO shop`). Bài tập tương ứng: mức 1 trong [05-exercises.md](05-exercises.md).

Quy ước riêng của file này:

- Mỗi ví dụ có bảng **dữ liệu mẫu đầu vào** và **kết quả**. Đó là dữ liệu **giả định thu nhỏ** (3–6 dòng, id rút gọn thành `p1`, `s1`, `o1`… cho dễ đọc; thực tế là uuid) để bạn dò được từng dòng bằng mắt. Nó không khớp seed thật, nhưng **mọi câu SQL đều đã chạy được trên schema thật**; chạy trên seed bạn sẽ thấy nhiều dòng hơn.
- Cặp **Sai / Đúng** đặt cạnh nhau ở những chỗ dev từ ORM sang hay vấp. Đọc cả hai kết quả, đừng chỉ đọc câu đúng.
- Cuối mỗi mục có **Thử biến tấu:** bài nhỏ, không có đáp án, làm ngay trong psql.

---

## Tuần 1 · Một bảng: SELECT, WHERE, NULL, ORDER, LIMIT

### 1.1 SELECT tối thiểu

Một câu SELECT tối thiểu gồm: chọn cột → từ bảng nào → lọc dòng → sắp xếp → cắt bao nhiêu. Thứ tự **viết** là vậy, thứ tự **thực thi** là FROM → WHERE → SELECT → ORDER BY → LIMIT (xem file 00). Nhớ điều này để hiểu vì sao alias đặt ở SELECT không dùng được trong WHERE (§3.6).

**Ví dụ 1 — danh sách sản phẩm mới nhất.**

**Bối cảnh:** trang danh sách sản phẩm cần 20 product mới nhất còn hoạt động. `products.deleted_at` NULL nghĩa là chưa bị xoá mềm.

```sql
SELECT id, name, base_price
FROM products
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20;
```

Giả sử `products` có các dòng sau:

| id  | name        | base_price | created_at | deleted_at |
| --- | ----------- | ---------- | ---------- | ---------- |
| p1  | Áo thun A   | 120.00     | 2026-09-01 | NULL       |
| p2  | Quần jean B | 350.00     | 2026-09-10 | NULL       |
| p3  | Mũ C        | 80.00      | 2026-09-15 | 2026-09-20 |
| p4  | Giày D      | 900.00     | 2026-09-25 | NULL       |

Kết quả:

| id  | name        | base_price |
| --- | ----------- | ---------- |
| p4  | Giày D      | 900.00     |
| p2  | Quần jean B | 350.00     |
| p1  | Áo thun A   | 120.00     |

`p3` bị loại vì `deleted_at` có giá trị. Ba dòng còn lại sắp theo `created_at` giảm dần dù cột đó không nằm trong SELECT: ORDER BY được phép dùng cột không hiển thị.

**Ví dụ 2 — thêm điều kiện và cột tính toán.**

**Bối cảnh:** trang chủ chỉ hiện product đã publish (`published_at` không NULL) và muốn hiện luôn số tiền tiết kiệm so với giá niêm yết.

```sql
SELECT name, base_price, list_price, list_price - base_price AS saving
FROM products
WHERE deleted_at IS NULL AND published_at IS NOT NULL
ORDER BY created_at DESC, id
LIMIT 5;
```

| id  | name        | base_price | list_price | published_at |
| --- | ----------- | ---------- | ---------- | ------------ |
| p1  | Áo thun A   | 120.00     | 150.00     | 2026-09-02   |
| p2  | Quần jean B | 350.00     | 350.00     | NULL         |
| p4  | Giày D      | 900.00     | 1000.00    | 2026-09-26   |

Kết quả:

| name      | base_price | list_price | saving |
| --------- | ---------- | ---------- | ------ |
| Giày D    | 900.00     | 1000.00    | 100.00 |
| Áo thun A | 120.00     | 150.00     | 30.00  |

`p2` còn nháp nên bị loại. `saving` là cột tính toán, chỉ tồn tại trong kết quả, không lưu vào bảng. `ORDER BY created_at DESC, id` có khoá phụ `id` để thứ tự ổn định (lý do ở §1.4).

**Ví dụ 3 — alias để API trả tên cột như FE muốn.**

```sql
SELECT name AS ten, base_price AS gia
FROM products
WHERE deleted_at IS NULL
LIMIT 3;
```

| ten         | gia    |
| ----------- | ------ |
| Áo thun A   | 120.00 |
| Quần jean B | 350.00 |
| Giày D      | 900.00 |

Quy tắc:

- Liệt kê cột, không `SELECT *` trong code thật. Lý do: cột thừa tốn băng thông, làm mất cơ hội dùng **index-only scan** (file 03), và thêm cột mới vào bảng sẽ làm đổi hình dạng dữ liệu trả về mà bạn không biết.
- Alias cho bảng (`p`, `s`) ngắn nhưng nhất quán, luôn prefix cột khi có JOIN.
- Alias cột có dấu cách hoặc chữ hoa phải bọc nháy kép (`AS "Tên"`); tránh, vì sau đó chỗ nào gọi cũng phải bọc nháy.

**Thử biến tấu:** lấy 10 user tạo gần nhất còn hoạt động, chỉ hiện `email` và `name`. Sau đó đổi thành 10 user **cũ nhất**. Rồi thêm cột `has_avatar` là `avatar IS NOT NULL`.

### 1.2 Toán tử lọc

Bốn nhóm toán tử bạn dùng hằng ngày: so sánh (`= <> < > <= >=`), khoảng (`BETWEEN`), tập hợp (`IN`), chuỗi (`LIKE`, `ILIKE`, `~`). Ghép bằng `AND`, `OR`, `NOT`; **`AND` ưu tiên hơn `OR`**, nên có `OR` là bọc ngoặc.

**Ví dụ 1 — khoảng giá và tập trạng thái.**

**Bối cảnh:** lọc product trong tầm giá 100–500, và đơn hàng đang chờ xử lý (`pending` hoặc `paid`).

```sql
SELECT name, base_price
FROM products
WHERE base_price BETWEEN 100 AND 500;

SELECT id, status
FROM orders
WHERE status IN ('pending', 'paid');
```

| id  | name        | base_price |
| --- | ----------- | ---------- |
| p1  | Áo thun A   | 120.00     |
| p2  | Quần jean B | 500.00     |
| p3  | Mũ C        | 80.00      |
| p4  | Giày D      | 900.00     |

Kết quả câu 1:

| name        | base_price |
| ----------- | ---------- |
| Áo thun A   | 120.00     |
| Quần jean B | 500.00     |

`BETWEEN a AND b` là `>= a AND <= b`, **bao gồm cả hai đầu**, nên 500.00 vào. `IN (...)` tương đương một chuỗi `OR`, nhưng dễ đọc hơn và nhận được mảng tham số từ app (`= ANY($1)`, xem §3.1).

**Ví dụ 2 — ngày giờ: khoảng nửa mở và bẫy biên của BETWEEN.**

**Bối cảnh:** báo cáo "đơn trong tháng 9/2026". `orders.created_at` là `timestamptz`, có giờ phút giây.

```sql
-- ĐÚNG: nửa mở [đầu tháng, đầu tháng sau)
SELECT count(*) FROM orders
WHERE created_at >= '2026-09-01' AND created_at < '2026-10-01';

-- SAI: BETWEEN với ngày → mất gần trọn ngày cuối
SELECT count(*) FROM orders
WHERE created_at BETWEEN '2026-09-01' AND '2026-09-30';
```

Giả sử có các đơn:

| id  | created_at          |
| --- | ------------------- |
| o1  | 2026-09-01 00:00:00 |
| o2  | 2026-09-15 12:30:00 |
| o3  | 2026-09-30 00:00:00 |
| o4  | 2026-09-30 18:45:00 |
| o5  | 2026-10-01 00:00:00 |

| Câu           | count | Dòng được tính |
| ------------- | ----- | -------------- |
| Nửa mở (đúng) | 4     | o1, o2, o3, o4 |
| BETWEEN (sai) | 3     | o1, o2, o3     |

`'2026-09-30'` khi ép sang `timestamptz` là `2026-09-30 00:00:00`; `o4` lúc 18:45 lớn hơn mốc đó nên rớt. Trên seed thật, câu sai thiếu hơn 100 đơn của ngày 30. Quy tắc: **mốc thời gian luôn viết nửa mở `>= start AND < end`**, và `end` là đầu ngày kế tiếp. `BETWEEN` chỉ an toàn với số nguyên hoặc `date`.

Hai cách viết mốc tương đối hay dùng:

```sql
WHERE created_at >= now() - interval '7 days'
WHERE created_at >= date_trunc('month', now())   -- từ đầu tháng này
```

Bẫy thứ hai: `WHERE date(created_at) = '2026-09-30'` hoặc `created_at::date BETWEEN ...` đúng về logic nhưng **giết index** vì bọc cột trong hàm/ép kiểu: Postgres phải tính hàm cho từng dòng rồi mới so sánh. Viết thành khoảng như trên.

**Ví dụ 3 — chuỗi: LIKE, ILIKE, ký tự đại diện, regex.**

**Bối cảnh:** ô tìm kiếm tên sản phẩm; và tìm user theo prefix email.

```sql
WHERE name ILIKE '%phone%'      -- không phân biệt hoa thường (Postgres only); có % đầu → không dùng được index B-tree
WHERE email LIKE 'user1%'       -- không có % đầu → có thể dùng index
WHERE name LIKE 'Product 1_'    -- _ là đúng một ký tự bất kỳ
WHERE name ~ '^Product 1[0-9]$' -- regex POSIX
```

| name        |
| ----------- |
| Product 1   |
| Product 10  |
| Product 15  |
| Product 100 |

| Điều kiện              | Khớp                                  |
| ---------------------- | ------------------------------------- |
| `LIKE 'Product 1%'`    | cả 4                                  |
| `LIKE 'Product 1_'`    | Product 10, Product 15                |
| `~ '^Product 1[0-9]$'` | Product 10, Product 15                |
| `LIKE 'product 1%'`    | không dòng nào (phân biệt hoa thường) |
| `ILIKE 'product 1%'`   | cả 4                                  |

**Ví dụ 4 — IN với NULL trong danh sách.**

```sql
SELECT 'x' IN ('a', NULL), 'a' IN ('a', NULL), 'x' NOT IN ('a', NULL);
```

| `'x' IN ('a', NULL)` | `'a' IN ('a', NULL)` | `'x' NOT IN ('a', NULL)` |
| -------------------- | -------------------- | ------------------------ |
| NULL                 | true                 | NULL                     |

`IN` là chuỗi `OR`: `'x' = 'a' OR 'x' = NULL` → `false OR NULL` → NULL. `'a' IN (...)` ra true vì `true OR NULL` là true. Nhưng `NOT IN` với NULL **không bao giờ true**, chỉ false hoặc NULL, và WHERE loại NULL. Đây chính là bẫy `NOT IN (subquery)` ở §1.3. Với ORM: `where: { status: { in: list } }` mà `list` chứa `null` sẽ âm thầm lọc sai.

**Thử biến tấu:** đếm đơn trong 24 giờ qua (không phải "hôm nay"). Tìm product tên kết thúc bằng số 0. Viết lại `status NOT IN ('cancelled', 'returned')` bằng `AND` rồi thử với `status = NULL` giả định xem hai cách có khác nhau không.

### 1.3 NULL — thứ FE hay hiểu sai nhất

NULL không phải là giá trị, mà là "không biết". Mọi so sánh với NULL trả về **UNKNOWN** (hiển thị là NULL), và WHERE chỉ giữ dòng TRUE. Logic ba giá trị: `NULL AND false` = false, `NULL OR true` = true, `NOT NULL` = NULL.

```sql
SELECT NULL = NULL, NULL <> 'x', 1 + NULL, NULL IS NULL, NULL IS DISTINCT FROM 'x';
```

| `NULL = NULL` | `NULL <> 'x'` | `1 + NULL` | `NULL IS NULL` | `NULL IS DISTINCT FROM 'x'` |
| ------------- | ------------- | ---------- | -------------- | --------------------------- |
| NULL          | NULL          | NULL       | true           | true                        |

**Sai / Đúng 1 — lọc dòng chưa xoá.**

**Bối cảnh:** `users.deleted_at` NULL là còn dùng.

```sql
-- SAI
SELECT count(*) FROM users WHERE deleted_at = NULL;
-- ĐÚNG
SELECT count(*) FROM users WHERE deleted_at IS NULL;
```

| id  | name | deleted_at |
| --- | ---- | ---------- |
| u1  | An   | NULL       |
| u2  | Bình | 2026-09-20 |
| u3  | Chi  | NULL       |

| Câu              | count |
| ---------------- | ----- |
| `= NULL` (sai)   | 0     |
| `IS NULL` (đúng) | 2     |

`deleted_at = NULL` là UNKNOWN với **mọi** dòng, kể cả dòng có `deleted_at` NULL. Câu sai không báo lỗi, chỉ lặng lẽ trả 0 dòng. Trên seed: 0 và 4900.

**Sai / Đúng 2 — `<>` bỏ rơi dòng NULL.**

**Bối cảnh:** `users.avatar` NULL = chưa upload ảnh. Muốn "user không dùng ảnh mặc định `x`".

```sql
-- Có thể sai: bỏ rơi dòng avatar NULL
SELECT count(*) FROM users WHERE avatar <> 'x';
-- Đúng ý muốn: lấy cả dòng NULL
SELECT count(*) FROM users WHERE avatar IS DISTINCT FROM 'x';
```

| id  | avatar |
| --- | ------ |
| u1  | a.png  |
| u2  | x      |
| u3  | NULL   |

| Câu                    | count | Dòng   |
| ---------------------- | ----- | ------ |
| `<> 'x'`               | 1     | u1     |
| `IS DISTINCT FROM 'x'` | 2     | u1, u3 |

`IS DISTINCT FROM` coi NULL như một giá trị so sánh được: `NULL IS DISTINCT FROM 'x'` là true, `NULL IS NOT DISTINCT FROM NULL` là true. Dùng nó khi bạn thực sự muốn "khác", kể cả với NULL.

**Sai / Đúng 3 — `NOT IN` với subquery có NULL (bẫy chết người).**

**Bối cảnh:** muốn tìm "sku chưa từng được bán". `order_items.sku_id` trỏ về sku đã mua nhưng là cột **nullable**: khi sku bị xoá cứng, cột này thành NULL còn dòng hàng vẫn giữ lại.

```sql
-- SAI: chỉ cần subquery có MỘT NULL, toàn bộ NOT IN thành NULL → 0 dòng
SELECT count(*) FROM skus WHERE id NOT IN (SELECT sku_id FROM order_items);

-- ĐÚNG (tạm): loại NULL khỏi subquery
SELECT count(*) FROM skus
WHERE id NOT IN (SELECT sku_id FROM order_items WHERE sku_id IS NOT NULL);

-- ĐÚNG (chuẩn): NOT EXISTS, không quan tâm NULL, tối ưu tốt hơn (file 02)
SELECT count(*) FROM skus s
WHERE NOT EXISTS (SELECT 1 FROM order_items i WHERE i.sku_id = s.id);
```

| skus.id | sku_code |
| ------- | -------- |
| s1      | AO-A-S   |
| s2      | AO-A-M   |
| s3      | AO-A-L   |

| order_items.id | sku_id |
| -------------- | ------ |
| 1              | s1     |
| 2              | NULL   |

| Câu                      | count | Vì sao                                                                  |
| ------------------------ | ----- | ----------------------------------------------------------------------- |
| `NOT IN` (sai)           | 0     | `s2 NOT IN (s1, NULL)` = `s2<>s1 AND s2<>NULL` = `true AND NULL` = NULL |
| `NOT IN ... IS NOT NULL` | 2     | s2, s3                                                                  |
| `NOT EXISTS`             | 2     | s2, s3                                                                  |

Trên seed thật, subquery có NULL hay không phụ thuộc dữ liệu; hôm nay câu "sai" có thể vẫn ra đúng và ngày mai sập khi ai đó xoá cứng một sku. Quy tắc: **không bao giờ dùng `NOT IN (subquery)` trên cột nullable**. Dùng `NOT EXISTS`.

**Sai / Đúng 4 — `COUNT(*)` vs `COUNT(col)`, và AVG bỏ qua NULL.**

**Bối cảnh:** dashboard cần "tổng user" và "user đã có avatar".

```sql
SELECT COUNT(*), COUNT(avatar), COUNT(*) - COUNT(avatar) AS no_avatar FROM users;
```

| id  | avatar |
| --- | ------ |
| u1  | a.png  |
| u2  | NULL   |
| u3  | c.png  |
| u4  | NULL   |

| count | count | no_avatar |
| ----- | ----- | --------- |
| 4     | 2     | 2         |

`COUNT(*)` đếm dòng; `COUNT(col)` đếm dòng có `col` khác NULL. Nếu bạn viết `COUNT(avatar)` để "đếm user" thì thiếu người. Tương tự `AVG`:

```sql
SELECT AVG(x) FROM (VALUES (4), (NULL), (2)) v(x);   -- 3, không phải 2
```

AVG chia cho 2 (số dòng không NULL), không chia cho 3. Muốn NULL tính là 0: `AVG(COALESCE(x, 0))`.

**Chuỗi rỗng không phải NULL.** `reviews.content` có thể là NULL (không viết gì) hoặc `''` (gửi form trống). `COUNT(content)` đếm cả `''`. Muốn "review có nội dung thật": `COUNT(NULLIF(content, ''))`.

Hàm xử lý NULL:

```sql
COALESCE(avatar, '/default.png')       -- giá trị đầu tiên không NULL
NULLIF(stock, 0)                        -- trả NULL nếu bằng 0; 100 / NULLIF(stock, 0) không bao giờ chia cho 0
SUM(x) FILTER (WHERE ...)               -- SUM/AVG/COUNT(col) bỏ qua NULL
'a' || NULL                             -- NULL; concat('a', NULL) → 'a'
```

**Thử biến tấu:** đếm product chưa publish bằng `COUNT(*) - COUNT(published_at)`. Viết "sku chưa có trong giỏ hàng của ai" bằng `NOT EXISTS`, rồi bằng `NOT IN` và tự giải thích vì sao lần này `NOT IN` an toàn (gợi ý: `cart_items.sku_id` có NOT NULL không?).

### 1.4 ORDER BY và LIMIT/OFFSET

**Ví dụ 1 — phân trang cơ bản.**

**Bối cảnh:** trang 3 của danh sách sản phẩm, 20 dòng/trang, đắt trước.

```sql
SELECT id, name, base_price
FROM products
WHERE deleted_at IS NULL
ORDER BY base_price DESC, id
LIMIT 20 OFFSET 40;
```

- `OFFSET n` vẫn phải đọc và bỏ đi n dòng. Với n lớn (trang 500) query chậm dần đều. Giải pháp: keyset pagination ở file 02.
- Khoá phụ `id`: xem Sai / Đúng bên dưới.

**Sai / Đúng 1 — LIMIT không có ORDER BY là không xác định.**

```sql
-- SAI: "3 sản phẩm đầu" theo cái gì?
SELECT name FROM products LIMIT 3;
-- ĐÚNG
SELECT name FROM products ORDER BY created_at DESC, id LIMIT 3;
```

Câu sai trả 3 dòng **nào đó**: thứ tự vật lý trên đĩa, thay đổi sau UPDATE, VACUUM, hoặc khi planner đổi cách quét. Hôm nay bạn thấy "Product 1, 2, 3" và tưởng nó sắp theo tên; sau một migration nó trả thứ khác. SQL không có "thứ tự chèn" như mảng JS.

**Sai / Đúng 2 — thiếu khoá phụ khi giá trị trùng.**

**Bối cảnh:** phân trang theo `base_price`, nhiều product cùng giá.

| id  | name      | base_price |
| --- | --------- | ---------- |
| p1  | Áo thun A | 120.00     |
| p2  | Áo thun B | 120.00     |
| p3  | Áo thun C | 120.00     |
| p4  | Giày D    | 900.00     |

```sql
-- SAI: ORDER BY base_price DESC LIMIT 2 OFFSET 0  → có thể p4, p2
--      ORDER BY base_price DESC LIMIT 2 OFFSET 2  → có thể p2, p1   (p2 lặp, p3 mất)
-- ĐÚNG: ORDER BY base_price DESC, id
```

| Trang | Câu sai (một khả năng) | Câu đúng |
| ----- | ---------------------- | -------- |
| 1     | p4, p2                 | p4, p1   |
| 2     | p2, p1                 | p2, p3   |

Ba dòng giá 120 có thứ tự tự do giữa hai lần chạy → trang 2 lặp / mất dòng. **Luôn thêm khoá phụ duy nhất** (`id`) sau cột sắp xếp chính.

**Ví dụ 3 — NULL đứng đâu.**

**Bối cảnh:** sắp product theo ngày publish mới nhất; product nháp có `published_at` NULL.

```sql
SELECT name, published_at FROM products ORDER BY published_at DESC LIMIT 3;
SELECT name, published_at FROM products ORDER BY published_at DESC NULLS LAST LIMIT 3;
```

| name        | published_at |
| ----------- | ------------ |
| Áo thun A   | 2026-09-02   |
| Quần jean B | NULL         |
| Giày D      | 2026-09-26   |

| `DESC`             | `DESC NULLS LAST`  |
| ------------------ | ------------------ |
| Quần jean B (NULL) | Giày D             |
| Giày D             | Áo thun A          |
| Áo thun A          | Quần jean B (NULL) |

Postgres coi NULL **lớn hơn mọi giá trị**: `ASC` đẩy NULL xuống cuối, `DESC` đẩy lên đầu. Trang "mới publish" mà 200 sản phẩm nháp chiếm hết trang 1 là lỗi thật gặp trong dự án. MySQL ngược lại (NULL nhỏ nhất).

Ngoài ra: `ORDER BY 2 DESC` (theo số thứ tự cột) chạy được nhưng dễ vỡ khi ai đó chèn thêm cột; `ORDER BY saving DESC` với alias trong SELECT thì **được** (ORDER BY chạy sau SELECT, khác với WHERE).

**Thử biến tấu:** lấy 5 đơn `paid` cũ nhất, thứ tự ổn định. Sắp review theo rating giảm dần rồi mới nhất trước. Thử `ORDER BY random() LIMIT 1` và đoán vì sao không nên dùng trên bảng 50k dòng.

### 1.5 CASE và cột tính toán

`CASE` là `if/else` của SQL, dùng được ở SELECT, WHERE, ORDER BY và trong hàm tổng hợp. Hai dạng: `CASE WHEN <điều kiện> THEN ... END` (tổng quát) và `CASE <biểu thức> WHEN <giá trị> THEN ... END` (so bằng). Không có `ELSE` thì ra NULL.

**Ví dụ 1 — % giảm giá và cờ publish.**

**Bối cảnh:** `products` có hai giá: `list_price` là giá niêm yết, `base_price` là giá bán thật. Cần hiển thị "% giảm" và cờ đã publish (`published_at` NULL = còn nháp).

```sql
SELECT
  id,
  base_price,
  list_price,
  CASE
    WHEN list_price > base_price THEN round((1 - base_price / list_price) * 100)
    ELSE 0
  END AS discount_percent,
  published_at IS NOT NULL AS is_published
FROM products;
```

| id  | base_price | list_price | published_at |
| --- | ---------- | ---------- | ------------ |
| p1  | 120.00     | 150.00     | 2026-09-02   |
| p2  | 350.00     | 350.00     | NULL         |
| p4  | 900.00     | 1000.00    | 2026-09-26   |

| id  | base_price | list_price | discount_percent | is_published |
| --- | ---------- | ---------- | ---------------- | ------------ |
| p1  | 120.00     | 150.00     | 20               | true         |
| p2  | 350.00     | 350.00     | 0                | false        |
| p4  | 900.00     | 1000.00    | 10               | true         |

Một biểu thức boolean (`published_at IS NOT NULL`) tự nó đã là cột `boolean`, không cần `CASE WHEN ... THEN true ELSE false`.

**Ví dụ 2 — nhãn tồn kho (nhiều nhánh, thứ tự WHEN quan trọng).**

```sql
SELECT sku_code, stock,
  CASE
    WHEN stock = 0 THEN 'hết hàng'
    WHEN stock < 5 THEN 'sắp hết'
    ELSE 'còn hàng'
  END AS stock_label
FROM skus;
```

| sku_code | stock | stock_label |
| -------- | ----- | ----------- |
| AO-A-S   | 0     | hết hàng    |
| AO-A-M   | 3     | sắp hết     |
| AO-A-L   | 40    | còn hàng    |

`CASE` dừng ở nhánh **đầu tiên** đúng. Đảo `stock < 5` lên trước thì `stock = 0` không bao giờ tới lượt.

**Ví dụ 3 — CASE lồng: trạng thái hiển thị của product.**

**Bối cảnh:** admin cần một cột `state`: đã xoá → `deleted`; chưa publish → `draft`; publish trong tương lai → `scheduled`; còn lại → `live`.

```sql
SELECT name, published_at, deleted_at,
  CASE
    WHEN deleted_at IS NOT NULL THEN 'deleted'
    WHEN published_at IS NULL THEN 'draft'
    ELSE CASE WHEN published_at > now() THEN 'scheduled' ELSE 'live' END
  END AS state
FROM products;
```

Giả sử hôm nay là 2026-09-30:

| name        | published_at | deleted_at | state     |
| ----------- | ------------ | ---------- | --------- |
| Áo thun A   | 2026-09-02   | NULL       | live      |
| Quần jean B | NULL         | NULL       | draft     |
| Mũ C        | 2026-09-15   | 2026-09-20 | deleted   |
| Giày D      | 2026-10-05   | NULL       | scheduled |

CASE lồng đọc được khi ≤ 2 tầng; sâu hơn thì tách thành CTE (file 02) hoặc chuyển logic vào app.

**Ví dụ 4 — CASE trong aggregate: pivot theo trạng thái.**

**Bối cảnh:** báo cáo mỗi tháng có bao nhiêu đơn giao thành công, bao nhiêu huỷ, tổng bao nhiêu — trên **một dòng** mỗi tháng.

```sql
-- cách cổ điển: SUM(CASE ...)
SELECT date_trunc('month', created_at)::date AS month,
  SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
  SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
  COUNT(*) AS total
FROM orders
GROUP BY 1 ORDER BY 1;

-- cách Postgres: FILTER, ngắn hơn và đọc rõ ý
SELECT date_trunc('month', created_at)::date AS month,
  COUNT(*) FILTER (WHERE status = 'delivered') AS delivered,
  COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
  COUNT(*) AS total
FROM orders
GROUP BY 1 ORDER BY 1;
```

| id  | status    | created_at |
| --- | --------- | ---------- |
| o1  | delivered | 2026-08-03 |
| o2  | cancelled | 2026-08-20 |
| o3  | delivered | 2026-09-01 |
| o4  | delivered | 2026-09-10 |
| o5  | pending   | 2026-09-29 |

| month      | delivered | cancelled | total |
| ---------- | --------- | --------- | ----- |
| 2026-08-01 | 1         | 1         | 2     |
| 2026-09-01 | 2         | 0         | 3     |

Hai cách cho cùng kết quả. `SUM(CASE ...)` chạy trên mọi DB; `FILTER` chỉ Postgres nhưng nên dùng khi biết chắc DB. Biến thể hay gặp: tỉ lệ review tốt `SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END)::numeric / COUNT(*)` — nhớ ép `numeric`, vì `int / int` là chia lấy phần nguyên: `7 / 2` = 3, `7 / 2.0` = 3.5.

**Thử biến tấu:** gắn nhãn user `new` (tạo < 30 ngày) / `regular` / `dormant` (tạo > 1 năm). Đếm review theo 3 nhóm rating (1–2, 3, 4–5) trên một dòng. Viết `discount_percent` mà không dùng CASE, bằng `GREATEST`.

### 1.6 DISTINCT

**Ví dụ 1 — danh sách giá trị khác nhau.**

**Bối cảnh:** dropdown lọc theo brand chỉ cần các `brand_id` đang có product.

```sql
SELECT DISTINCT brand_id FROM products WHERE deleted_at IS NULL;
```

| id  | brand_id |
| --- | -------- |
| p1  | b1       |
| p2  | b1       |
| p3  | b2       |

| brand_id |
| -------- |
| b1       |
| b2       |

`DISTINCT` áp lên **toàn bộ** danh sách cột: `SELECT DISTINCT user_id, status FROM orders` khử trùng theo cặp, không phải theo `user_id`. Muốn "một dòng mỗi user" thì xem `DISTINCT ON`.

**Ví dụ 2 — DISTINCT vs GROUP BY: cùng kết quả, mục đích khác.**

```sql
SELECT DISTINCT status FROM orders ORDER BY status;
SELECT status FROM orders GROUP BY status ORDER BY status;
SELECT status, COUNT(*) FROM orders GROUP BY status ORDER BY status;
```

| id  | status  |
| --- | ------- |
| o1  | paid    |
| o2  | paid    |
| o3  | pending |

| DISTINCT / GROUP BY | GROUP BY + COUNT |
| ------------------- | ---------------- |
| paid                | paid, 2          |
| pending             | pending, 1       |

Hai câu đầu ra hệt nhau và planner thường sinh cùng một plan. Khác ở ý định: `DISTINCT` nói "tôi chỉ muốn khử trùng"; `GROUP BY` nói "tôi sắp tính gì đó trên mỗi nhóm". Viết `SELECT DISTINCT status, COUNT(*) ... GROUP BY status` là thừa (GROUP BY đã làm mỗi nhóm một dòng) và là dấu hiệu người viết không rõ mình đang làm gì. Còn `COUNT(DISTINCT user_id)` là "đếm số giá trị khác nhau", dùng rất nhiều ở §2.4.

**Ví dụ 3 — DISTINCT ON: mỗi nhóm lấy một dòng.**

**Bối cảnh:** trang danh sách cần "giá thấp nhất và sku tương ứng" cho mỗi product; và "đơn gần nhất của mỗi user".

```sql
-- 1 dòng rẻ nhất mỗi product
SELECT DISTINCT ON (product_id) product_id, sku_code, price
FROM skus
ORDER BY product_id, price ASC;

-- đơn gần nhất mỗi user
SELECT DISTINCT ON (user_id) user_id, id, status, created_at
FROM orders
ORDER BY user_id, created_at DESC;
```

| skus.id | product_id | sku_code | price  |
| ------- | ---------- | -------- | ------ |
| s1      | p1         | AO-A-S   | 120.00 |
| s2      | p1         | AO-A-M   | 125.00 |
| s3      | p1         | AO-A-L   | 130.00 |
| s4      | p2         | QJ-B-32  | 350.00 |

| product_id | sku_code | price  |
| ---------- | -------- | ------ |
| p1         | AO-A-S   | 120.00 |
| p2         | QJ-B-32  | 350.00 |

Quy tắc bắt buộc: các cột trong `DISTINCT ON (...)` phải là **phần đầu** của `ORDER BY`; phần sau của ORDER BY quyết định dòng nào được giữ. Muốn sắp kết quả cuối theo cột khác (ví dụ giá) thì bọc ngoài một SELECT nữa. `DISTINCT ON` là "vũ khí" của Postgres cho bài "mỗi nhóm lấy 1 dòng"; window function ở file 02 là cách tổng quát hơn (lấy top-3 mỗi nhóm chẳng hạn).

**Thử biến tấu:** tin nhắn mới nhất giữa mỗi cặp `(from_user_id, to_user_id)`. Review mới nhất mỗi product kèm rating. Đếm số brand khác nhau xuất hiện trong `order_items` (phải join qua `skus` → `products`).

### 1.7 So sánh chuỗi và collation cơ bản

Chuỗi so sánh theo **collation** của cột/DB, không phải theo mã ASCII. `SHOW lc_collate;` cho biết DB đang dùng gì (thường `en_US.utf8`, đôi khi `C`).

```sql
SELECT 'a' < 'B', 'Z' < 'a';                           -- theo collation mặc định
SELECT 'a' < 'B' COLLATE "C", 'Z' < 'a' COLLATE "C";  -- so từng byte
```

| Collation                | `'a' < 'B'` | `'Z' < 'a'` | ORDER BY name                                                 |
| ------------------------ | ----------- | ----------- | ------------------------------------------------------------- |
| `C` (byte)               | false       | true        | tất cả chữ hoa trước chữ thường: `Bình`, `an`, `Ánh`… lộn xộn |
| `en_US.utf8` (glibc/ICU) | true        | false       | xếp theo bảng chữ cái, bỏ qua hoa thường ở bước đầu           |

Trên container Alpine (musl) `en_US.utf8` có thể vẫn hành xử như `C`; **hãy chạy hai câu trên ở DB của bạn** thay vì tin bảng. Điều cần nhớ:

1. **Kết quả `ORDER BY name` và `WHERE name < 'M'` phụ thuộc môi trường.** Cùng query, dev trên Docker Alpine và prod trên Ubuntu có thể ra thứ tự khác nhau. Khi tên cột tiếng Việt có dấu, khác biệt còn rõ hơn.
2. **Không so hoa thường bằng `=`.** Dùng `ILIKE`, hoặc `lower(name) = lower($1)` (index theo `lower(name)` ở file 03), hoặc kiểu `citext`.
3. Index B-tree trên `text` cũng sắp theo collation, nên `LIKE 'abc%'` chỉ dùng được index khi collation là `C` hoặc index tạo với `text_pattern_ops` (file 03).
4. Cần thứ tự ổn định giữa các môi trường cho một cột (mã sku, slug): khai báo `COLLATE "C"` ngay trên cột.

**Thử biến tấu:** chạy `SELECT name FROM products ORDER BY name LIMIT 3` với và không `COLLATE "C"`, so kết quả. Chèn (trong transaction rồi ROLLBACK) hai brand `'áo'` và `'Ao'`, xếp thứ tự và xem cái nào đứng trước.

---

## Tuần 2 · Nhiều bảng: JOIN, GROUP BY, subquery

### 2.1 Năm loại JOIN — hình dung bằng products và skus

**Bối cảnh:** `products` → `skus` là 1-n qua `skus.product_id = products.id`. Một product có thể có 0, 1 hoặc nhiều sku (seed cố ý để khoảng 1/13 product không có sku, giống product vừa tạo còn nháp). Câu hỏi nghiệp vụ: "mỗi product có bao nhiêu biến thể?", và product chưa có biến thể vẫn phải hiện với số 0.

| JOIN              | Trả về                                 | Dùng khi                                                 |
| ----------------- | -------------------------------------- | -------------------------------------------------------- |
| `INNER JOIN`      | chỉ product **có** sku                 | cần dữ liệu ở cả hai phía                                |
| `LEFT JOIN`       | mọi product, cột sku NULL nếu không có | "danh sách kèm thông tin phụ nếu có"                     |
| `RIGHT JOIN`      | mọi sku, product NULL nếu mồ côi       | hiếm, viết lại thành LEFT cho dễ đọc                     |
| `FULL OUTER JOIN` | cả hai, NULL ở phía thiếu              | so khớp / đối soát dữ liệu                               |
| `CROSS JOIN`      | tích Descartes                         | sinh tổ hợp, ví dụ mọi ngày × mọi trạng thái cho báo cáo |

Dữ liệu mẫu dùng cho cả mục này:

| products.id | name        |
| ----------- | ----------- |
| p1          | Áo thun A   |
| p2          | Quần jean B |
| p3          | Mũ C        |

| skus.id | product_id | sku_code | price  | stock |
| ------- | ---------- | -------- | ------ | ----- |
| s1      | p1         | AO-A-S   | 120.00 | 10    |
| s2      | p1         | AO-A-M   | 125.00 | 0     |
| s3      | p2         | QJ-B-32  | 350.00 | 5     |

`p3` (Mũ C) chưa có sku nào.

**Ví dụ 1 — INNER JOIN: mọi cặp product–sku.**

```sql
SELECT p.name, s.sku_code, s.price
FROM products p
JOIN skus s ON s.product_id = p.id;
```

| name        | sku_code | price  |
| ----------- | -------- | ------ |
| Áo thun A   | AO-A-S   | 120.00 |
| Áo thun A   | AO-A-M   | 125.00 |
| Quần jean B | QJ-B-32  | 350.00 |

3 dòng: `p1` xuất hiện 2 lần (nhân dòng theo số sku), `p3` biến mất. `JOIN` = `INNER JOIN`.

**Ví dụ 2 — LEFT JOIN + đếm, kể cả product chưa có sku.**

```sql
SELECT p.id, p.name, COUNT(s.id) AS sku_count
FROM products p
LEFT JOIN skus s ON s.product_id = p.id AND s.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name;
```

| id  | name        | sku_count |
| --- | ----------- | --------- |
| p1  | Áo thun A   | 2         |
| p2  | Quần jean B | 1         |
| p3  | Mũ C        | 0         |

`p3` có một dòng sau LEFT JOIN với mọi cột `s.*` NULL; `COUNT(s.id)` bỏ qua NULL nên ra 0. Viết `COUNT(*)` thì `p3` ra 1 — sai. Đây là chỗ `COUNT(*)` vs `COUNT(col)` ở §1.3 thành lỗi thật.

**Sai / Đúng — điều kiện bảng phải đặt ở ON, không phải WHERE.**

**Bối cảnh:** "mỗi product có bao nhiêu sku còn hàng?", product không có sku còn hàng vẫn phải hiện với 0.

```sql
-- SAI: lọc bảng bên phải ở WHERE → dòng NULL bị loại → thành INNER JOIN
SELECT p.id, p.name, COUNT(s.id)
FROM products p
LEFT JOIN skus s ON s.product_id = p.id
WHERE s.stock > 0
GROUP BY p.id, p.name;

-- ĐÚNG: điều kiện lọc bảng bên phải nằm trong ON
SELECT p.id, p.name, COUNT(s.id)
FROM products p
LEFT JOIN skus s ON s.product_id = p.id AND s.stock > 0
GROUP BY p.id, p.name;
```

| Câu sai     |     | Câu đúng    |     |
| ----------- | --- | ----------- | --- |
| Áo thun A   | 1   | Áo thun A   | 1   |
| Quần jean B | 1   | Quần jean B | 1   |
|             |     | Mũ C        | 0   |

Câu sai: `p3` sau LEFT JOIN có `s.stock` NULL → `NULL > 0` → UNKNOWN → WHERE loại. Trên seed thật: câu sai ra 1.839 product, câu đúng ra 2.000. Không có lỗi, chỉ mất 161 dòng. Quy tắc: **điều kiện lọc bảng bên phải của LEFT JOIN đặt trong ON; điều kiện lọc bảng bên trái đặt trong WHERE.** Ngoại lệ có chủ ý: `WHERE s.id IS NULL` sau LEFT JOIN là cách tìm "product **không** có sku" (anti-join, file 02).

**Ví dụ 3 — RIGHT JOIN: viết lại thành LEFT.**

```sql
SELECT s.sku_code, p.name FROM skus s RIGHT JOIN products p ON p.id = s.product_id;
-- đọc dễ hơn khi đảo:
SELECT s.sku_code, p.name FROM products p LEFT JOIN skus s ON s.product_id = p.id;
```

Hai câu cho cùng kết quả. Trong review, RIGHT JOIN gần như luôn bị yêu cầu đổi thành LEFT: bảng "chính" nên đứng đầu FROM.

**Ví dụ 4 — FULL OUTER JOIN để đối soát.**

**Bối cảnh:** kiểm kê: so bảng tồn kho `skus` với "số đã bán" gom từ `order_items`. Cần thấy cả sku chưa bán bao giờ **và** dòng bán trỏ về sku không còn tồn tại (nếu có).

```sql
SELECT s.sku_code, s.stock, sold.qty
FROM skus s
FULL OUTER JOIN (
  SELECT sku_id, SUM(quantity) AS qty FROM order_items GROUP BY sku_id
) sold ON sold.sku_id = s.id
WHERE s.id IS NULL OR sold.sku_id IS NULL;
```

| skus.id | sku_code | stock |
| ------- | -------- | ----- |
| s1      | AO-A-S   | 10    |
| s2      | AO-A-M   | 0     |

| order_items.sku_id | quantity |
| ------------------ | -------- |
| s1                 | 2        |
| s1                 | 1        |
| s9                 | 4        |

Sau FULL JOIN (trước WHERE):

| sku_code | stock | qty  | Ghi chú                          |
| -------- | ----- | ---- | -------------------------------- |
| AO-A-S   | 10    | 3    | khớp cả hai phía                 |
| AO-A-M   | 0     | NULL | chỉ có ở skus                    |
| NULL     | NULL  | 4    | chỉ có ở sold (s9 không tồn tại) |

Sau WHERE giữ hai dòng lệch. Cột NULL bên nào cho biết thiếu bên đó. Trên schema thật `sku_id` là FK nên dòng thứ ba chỉ xuất hiện khi `sku_id` NULL (sku bị xoá cứng): chạy trên seed ra 0 orphan và 462 sku chưa bán.

**Ví dụ 5 — CROSS JOIN sinh lưới ngày × trạng thái.**

**Bối cảnh:** biểu đồ cần đủ mọi ô (ngày, trạng thái) kể cả ô 0 đơn. GROUP BY thuần chỉ trả ô có dữ liệu.

```sql
SELECT d.day::date AS day, st.status, COUNT(o.id) AS orders
FROM generate_series('2026-09-28'::date, '2026-09-30'::date, interval '1 day') d(day)
CROSS JOIN (VALUES ('pending'), ('paid'), ('cancelled')) st(status)
LEFT JOIN orders o
  ON o.status = st.status
 AND o.created_at >= d.day AND o.created_at < d.day + interval '1 day'
GROUP BY d.day, st.status
ORDER BY d.day, st.status;
```

Giả sử chỉ có hai đơn: `o1` pending ngày 28, `o2` paid ngày 30.

| day        | status    | orders |
| ---------- | --------- | ------ |
| 2026-09-28 | cancelled | 0      |
| 2026-09-28 | paid      | 0      |
| 2026-09-28 | pending   | 1      |
| 2026-09-29 | cancelled | 0      |
| 2026-09-29 | paid      | 0      |
| 2026-09-29 | pending   | 0      |
| 2026-09-30 | cancelled | 0      |
| 2026-09-30 | paid      | 1      |
| 2026-09-30 | pending   | 0      |

3 ngày × 3 trạng thái = 9 ô luôn có mặt; LEFT JOIN đổ đơn vào ô tương ứng; `COUNT(o.id)` ra 0 ở ô trống. Đây là khuôn mẫu cho mọi báo cáo "không được thiếu ngày". CROSS JOIN vô tình (quên ON, hoặc `FROM a, b` không WHERE) là nguồn query chạy hàng phút: 30 brands × 3 roles = 90 dòng vô nghĩa, 2.000 × 50.000 thì treo.

**Thử biến tấu:** "mỗi brand có bao nhiêu product đã publish", brand không có product vẫn hiện 0. Đối soát `cart_items` với `skus` đã xoá mềm. Sinh lưới 7 ngày gần nhất × 3 rating (3, 4, 5) đếm review.

### 2.2 Self-join: cây danh mục

**Bối cảnh:** danh mục nhiều cấp ("Thời trang" → "Áo" → "Áo thun") lưu trong **một** bảng `categories`, dòng con giữ `parent_id` trỏ về dòng cha; dòng gốc có `parent_id` NULL. Muốn hiện "tên danh mục kèm tên cha" thì phải join bảng với chính nó, dùng hai alias khác nhau.

Dữ liệu mẫu:

| id  | name       | parent_id |
| --- | ---------- | --------- |
| c1  | Thời trang | NULL      |
| c2  | Áo         | c1        |
| c3  | Áo thun    | c2        |
| c4  | Giày       | c1        |

**Ví dụ 1 — tên kèm tên cha.**

```sql
SELECT c.name AS child, parent.name AS parent
FROM categories c
LEFT JOIN categories parent ON parent.id = c.parent_id;
```

| child      | parent     |
| ---------- | ---------- |
| Thời trang | NULL       |
| Áo         | Thời trang |
| Áo thun    | Áo         |
| Giày       | Thời trang |

Hai alias `c` và `parent` là **hai bản sao độc lập** của cùng bảng; `LEFT` để dòng gốc không rơi (đổi thành `JOIN` thì "Thời trang" mất).

**Ví dụ 2 — đường dẫn 3 cấp.**

```sql
SELECT g.name AS grand, s.name AS sub, l.name AS leaf
FROM categories l
JOIN categories s ON s.id = l.parent_id
JOIN categories g ON g.id = s.parent_id;
```

| grand      | sub | leaf    |
| ---------- | --- | ------- |
| Thời trang | Áo  | Áo thun |

Chỉ dòng có đủ 3 cấp mới ra. Số cấp cố định → self-join đủ dùng; số cấp không biết trước → recursive CTE, học ở file 03.

**Ví dụ 3 — đếm con trực tiếp của mỗi danh mục gốc.**

```sql
SELECT parent.name AS parent, COUNT(c.id) AS children
FROM categories parent
LEFT JOIN categories c ON c.parent_id = parent.id
WHERE parent.parent_id IS NULL
GROUP BY parent.id, parent.name;
```

| parent     | children |
| ---------- | -------- |
| Thời trang | 2        |

Self-join cũng dùng cho `messages` (bảng có **hai** FK về `users`): join `users` hai lần với alias `a` (người gửi) và `b` (người nhận):

```sql
SELECT a.name AS sender, b.name AS receiver, m.content
FROM messages m
JOIN users a ON a.id = m.from_user_id
JOIN users b ON b.id = m.to_user_id;
```

**Thử biến tấu:** liệt kê danh mục **lá** (không có con nào) bằng LEFT JOIN + `IS NULL`. Tìm cặp sku cùng product có giá chênh nhau > 10 (self-join `skus` với điều kiện `b.id > a.id` để không ra cặp trùng).

### 2.3 Quan hệ n-n qua bảng nối

**Bối cảnh:** một product nằm trong nhiều danh mục và một danh mục chứa nhiều product, nên không thể để `category_id` trên `products`. SQL giải quyết bằng bảng nối `product_categories(product_id, category_id)`, mỗi dòng là một cặp. ORM giấu bảng này sau `@ManyToMany`; viết SQL thì bạn phải join qua nó tường minh, hai bước.

Dữ liệu mẫu:

| products.id | name        |
| ----------- | ----------- |
| p1          | Áo thun A   |
| p2          | Quần jean B |

| product_categories.product_id | category_id |
| ----------------------------- | ----------- |
| p1                            | c3          |
| p1                            | c5          |
| p2                            | c6          |

| categories.id | name    |
| ------------- | ------- |
| c3            | Áo thun |
| c5            | Sale    |
| c6            | Quần    |

**Ví dụ 1 — mỗi cặp một dòng.**

```sql
SELECT p.name, c.name AS category
FROM products p
JOIN product_categories pc ON pc.product_id = p.id
JOIN categories c ON c.id = pc.category_id;
```

| name        | category |
| ----------- | -------- |
| Áo thun A   | Áo thun  |
| Áo thun A   | Sale     |
| Quần jean B | Quần     |

`p1` có 2 category → 2 dòng. Đây là cách SQL biểu diễn "mảng": bằng nhiều dòng.

**Ví dụ 2 — gom về 1 dòng/product.**

```sql
SELECT p.id, p.name, string_agg(c.name, ', ' ORDER BY c.name) AS categories
FROM products p
LEFT JOIN product_categories pc ON pc.product_id = p.id
LEFT JOIN categories c ON c.id = pc.category_id
GROUP BY p.id, p.name;
```

| id  | name        | categories    |
| --- | ----------- | ------------- |
| p1  | Áo thun A   | Áo thun, Sale |
| p2  | Quần jean B | Quần          |

`LEFT` để product chưa gắn category vẫn có mặt (cột `categories` NULL). `ORDER BY` bên trong `string_agg` giữ thứ tự ổn định; muốn trả JSON cho API thì `json_agg(c.name)`.

**Ví dụ 3 — đi ngược: product thuộc một danh mục, và đếm product mỗi danh mục.**

```sql
SELECT p.name
FROM products p
JOIN product_categories pc ON pc.product_id = p.id
JOIN categories c ON c.id = pc.category_id
WHERE c.name = 'Sale';

SELECT c.name, COUNT(pc.product_id) AS products
FROM categories c
LEFT JOIN product_categories pc ON pc.category_id = c.id
GROUP BY c.id, c.name;
```

| Câu 1     |     | Câu 2   |     |
| --------- | --- | ------- | --- |
| Áo thun A |     | Áo thun | 1   |
|           |     | Sale    | 1   |
|           |     | Quần    | 1   |

**Sai / Đúng — nhân dòng khi join hai quan hệ 1-n cùng lúc.**

**Bối cảnh:** muốn "tổng tồn kho của mỗi product" và tiện tay join thêm category để lọc sau.

```sql
-- SAI: skus (1-n) và product_categories (1-n) cùng nối vào products → dòng nhân chéo
SELECT p.name, SUM(s.stock) AS total_stock
FROM products p
JOIN skus s ON s.product_id = p.id
JOIN product_categories pc ON pc.product_id = p.id
GROUP BY p.id, p.name;

-- ĐÚNG: chỉ join bảng cần cho phép tính
SELECT p.name, SUM(s.stock) AS total_stock
FROM products p
JOIN skus s ON s.product_id = p.id
GROUP BY p.id, p.name;
```

Với `p1` có 2 sku (stock 10 và 0) và 2 category:

| Câu sai           | Câu đúng          |
| ----------------- | ----------------- |
| Áo thun A, **20** | Áo thun A, **10** |

Sau hai JOIN, `p1` có 2 × 2 = 4 dòng; mỗi sku xuất hiện 2 lần nên SUM gấp đôi. Đây là lỗi mà `COUNT(DISTINCT)` không cứu được cho SUM. Cách xử lý: tính từng quan hệ 1-n trong derived table / CTE riêng rồi mới join (§2.5, file 02), hoặc dùng `EXISTS` để lọc thay vì JOIN.

**Thử biến tấu:** danh sách product thuộc **cả hai** danh mục 'Áo thun' và 'Sale' (gợi ý: `HAVING COUNT(DISTINCT c.name) = 2`). Danh mục không có product nào. Cặp product có chung ít nhất một danh mục (self-join qua `product_categories`).

### 2.4 GROUP BY và HAVING

**Bối cảnh:** `orders` → `order_items` là 1-n: một đơn có nhiều dòng hàng, mỗi dòng ghi `unit_price` và `quantity` tại thời điểm mua. Doanh thu một đơn = tổng `unit_price × quantity` các dòng của nó. Câu hỏi: "theo từng trạng thái đơn, có bao nhiêu đơn và tổng doanh thu bao nhiêu?"

Dữ liệu mẫu:

| orders.id | user_id | status    | created_at |
| --------- | ------- | --------- | ---------- |
| o1        | u1      | delivered | 2026-09-01 |
| o2        | u1      | delivered | 2026-09-10 |
| o3        | u2      | cancelled | 2026-09-12 |
| o4        | u2      | delivered | 2026-08-20 |

| order_items.id | order_id | product_name | unit_price | quantity |
| -------------- | -------- | ------------ | ---------- | -------- |
| 1              | o1       | Áo thun A    | 120.00     | 2        |
| 2              | o1       | Mũ C         | 80.00      | 1        |
| 3              | o2       | Giày D       | 900.00     | 1        |
| 4              | o3       | Áo thun A    | 120.00     | 1        |
| 5              | o4       | Quần jean B  | 350.00     | 2        |

**Ví dụ 1 — đếm theo một cột.**

```sql
SELECT status, COUNT(*) AS orders FROM orders GROUP BY status ORDER BY orders DESC;
```

| status    | orders |
| --------- | ------ |
| delivered | 3      |
| cancelled | 1      |

**Ví dụ 2 — doanh thu theo trạng thái, có HAVING.**

```sql
SELECT o.status, COUNT(DISTINCT o.id) AS orders, SUM(i.unit_price * i.quantity) AS revenue
FROM orders o
JOIN order_items i ON i.order_id = o.id
WHERE o.deleted_at IS NULL
GROUP BY o.status
HAVING SUM(i.unit_price * i.quantity) > 200
ORDER BY revenue DESC;
```

Sau JOIN có 5 dòng (mỗi order_item một dòng). Gom theo status:

| status    | orders | revenue |
| --------- | ------ | ------- |
| delivered | 3      | 1920.00 |

`delivered`: 240 + 80 + 900 + 700 = 1920. `cancelled`: 120, bị HAVING loại. `COUNT(DISTINCT o.id)` là bắt buộc vì JOIN với items đã nhân dòng: `COUNT(*)` cho `delivered` là 4 (số dòng hàng), không phải 3 đơn. Trên seed thật: `COUNT(*)` ra 56.777 với `delivered` còn `COUNT(DISTINCT o.id)` ra 18.905. Đây là chỗ bài tập tư duy ở file 00 phát huy tác dụng.

Quy tắc bắt buộc: **mọi cột trong SELECT không nằm trong hàm tổng hợp phải có trong GROUP BY**. Vi phạm thì Postgres báo ngay:

```
ERROR:  column "orders.user_id" must appear in the GROUP BY clause or be used in an aggregate function
```

Ngoại lệ: group theo khoá chính thì được chọn cột khác của bảng đó (`GROUP BY p.id` rồi `SELECT p.name`), vì `id` đã xác định duy nhất dòng.

**Ví dụ 3 — GROUP BY nhiều cột.**

**Bối cảnh:** báo cáo tháng × trạng thái.

```sql
SELECT date_trunc('month', created_at)::date AS month, status, COUNT(*)
FROM orders
GROUP BY 1, 2
ORDER BY 1, 2;
```

| month      | status    | count |
| ---------- | --------- | ----- |
| 2026-08-01 | delivered | 1     |
| 2026-09-01 | cancelled | 1     |
| 2026-09-01 | delivered | 2     |

Mỗi tổ hợp (tháng, status) khác nhau là một nhóm. `GROUP BY 1, 2` là số thứ tự cột trong SELECT; tiện cho biểu thức dài như `date_trunc(...)`, nhưng đừng lạm dụng.

**Sai / Đúng — HAVING vs WHERE cho cùng một yêu cầu.**

**Bối cảnh:** "user nào có ≥ 2 đơn đã giao?"

```sql
-- SAI: lọc trạng thái ở HAVING (chạy được nhưng chậm và sai ý)
SELECT user_id, COUNT(*) AS orders
FROM orders
GROUP BY user_id
HAVING COUNT(*) FILTER (WHERE status = 'delivered') >= 2;

-- ĐÚNG: điều kiện trên từng dòng → WHERE; điều kiện trên nhóm → HAVING
SELECT user_id, COUNT(*) AS orders
FROM orders
WHERE status = 'delivered'
GROUP BY user_id
HAVING COUNT(*) >= 2;
```

| Câu "sai" |     | Câu đúng |     |
| --------- | --- | -------- | --- |
| u1        | 2   | u1       | 2   |

Ở mẫu này cả hai ra `u1`. Nhưng với `u2` (1 delivered, 1 cancelled) mà đổi ngưỡng thành `>= 1`: câu trên trả `u2, 2` (đếm cả đơn huỷ vào cột `orders`), câu dưới trả `u2, 1`. WHERE lọc **trước** khi gom, giảm số dòng phải gom; HAVING lọc **sau** khi gom, chỉ dùng cho điều kiện cần aggregate. Viết `WHERE COUNT(*) > 10` sẽ bị từ chối: `ERROR:  aggregate functions are not allowed in WHERE`.

**Ví dụ 4 — nhiều aggregate một lúc, FILTER và aggregate không phải số.**

**Bối cảnh:** thống kê mỗi brand: số product, số đã publish, có product nháp không, tên các product nháp.

```sql
SELECT b.name AS brand,
  COUNT(p.id) AS products,
  COUNT(p.published_at) AS published,
  bool_or(p.published_at IS NULL) AS has_draft,
  array_agg(p.name ORDER BY p.name) FILTER (WHERE p.published_at IS NULL) AS drafts
FROM brands b
LEFT JOIN products p ON p.brand_id = b.id
GROUP BY b.id, b.name;
```

| brands.id | name   |
| --------- | ------ |
| b1        | Acme   |
| b2        | Globex |

| products.id | name        | brand_id | published_at |
| ----------- | ----------- | -------- | ------------ |
| p1          | Áo thun A   | b1       | 2026-09-02   |
| p2          | Quần jean B | b1       | NULL         |
| p3          | Mũ C        | b1       | NULL         |

| brand  | products | published | has_draft | drafts             |
| ------ | -------- | --------- | --------- | ------------------ |
| Acme   | 3        | 1         | true      | {Mũ C,Quần jean B} |
| Globex | 0        | 0         | NULL      | NULL               |

`Globex` không có product: `COUNT` ra 0, còn `bool_or` / `array_agg` trên nhóm rỗng ra NULL (bọc `COALESCE` nếu API cần `false` / `[]`). Hàm tổng hợp hay dùng: `COUNT, SUM, AVG, MIN, MAX, string_agg, array_agg, bool_or, bool_and, json_agg`, và `FILTER (WHERE ...)` gắn sau bất kỳ hàm nào.

```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'delivered')  AS delivered,
  COUNT(*) FILTER (WHERE status = 'cancelled')  AS cancelled,
  COUNT(*)                                       AS total
FROM orders;
```

**Thử biến tấu:** rating trung bình và số review mỗi product, chỉ product có ≥ 20 review, làm tròn 2 chữ số. Doanh thu theo tháng chỉ tính đơn `delivered`. Đơn có tổng tiền lớn nhất (GROUP BY `o.id` + ORDER BY + LIMIT 1).

### 2.5 Subquery: ba vị trí

**Bối cảnh:** vẫn là `products` → `skus` 1-n. Ba câu hỏi: giá thấp nhất của mỗi product; product nào còn ít nhất một sku có hàng; và cách lấy giá thấp nhất mà không dùng subquery trong SELECT.

```sql
-- 1. Scalar subquery trong SELECT (chạy cho mỗi dòng → cẩn thận hiệu năng)
SELECT p.name,
  (SELECT MIN(s.price) FROM skus s WHERE s.product_id = p.id) AS min_price
FROM products p;

-- 2. Trong WHERE với IN / EXISTS
SELECT * FROM products p
WHERE EXISTS (SELECT 1 FROM skus s WHERE s.product_id = p.id AND s.stock > 0);

-- 3. Trong FROM (derived table): phải có alias
SELECT p.name, m.min_price
FROM products p
JOIN (SELECT product_id, MIN(price) AS min_price FROM skus GROUP BY product_id) m
  ON m.product_id = p.id;
```

Dùng lại dữ liệu mẫu §2.1 (`p1` có s1 120/stock 10, s2 125/stock 0; `p2` có s3 350/stock 5; `p3` không có sku):

| Câu 1       |        | Câu 2       | Câu 3       |        |
| ----------- | ------ | ----------- | ----------- | ------ |
| Áo thun A   | 120.00 | Áo thun A   | Áo thun A   | 120.00 |
| Quần jean B | 350.00 | Quần jean B | Quần jean B | 350.00 |
| Mũ C        | NULL   |             |             |        |

Câu 1 giữ `p3` với `min_price` NULL (scalar subquery không có dòng → NULL). Câu 3 là INNER JOIN nên `p3` mất; đổi thành LEFT JOIN thì giống câu 1. Quên alias ở câu 3: `ERROR:  subquery in FROM must have an alias`.

**Không tương quan vs tương quan.** Subquery **không tương quan** không nhắc tới bảng ngoài, chạy đúng **một lần**, kết quả dùng chung cho mọi dòng. Subquery **tương quan** nhắc tới bảng ngoài (`s.product_id = p.id`), về logic chạy lại **cho từng dòng** ngoài.

**Ví dụ 1 — không tương quan: so với trung bình toàn cục.**

**Bối cảnh:** product nào đắt hơn giá trung bình?

```sql
SELECT name, base_price
FROM products
WHERE base_price > (SELECT AVG(base_price) FROM products);
```

| id  | name        | base_price |
| --- | ----------- | ---------- |
| p1  | Áo thun A   | 120.00     |
| p2  | Quần jean B | 350.00     |
| p4  | Giày D      | 900.00     |

AVG = 456.67 → kết quả:

| name   | base_price |
| ------ | ---------- |
| Giày D | 900.00     |

Subquery trả **đúng một giá trị**; nếu nó trả nhiều dòng (ví dụ `= (SELECT price FROM skus)`) Postgres báo `ERROR:  more than one row returned by a subquery used as an expression`. Muốn so với tập hợp thì dùng `IN`, `= ANY`, `> ALL`.

**Ví dụ 2 — tương quan: sku đắt nhất của từng product.**

```sql
SELECT s.sku_code, s.price
FROM skus s
WHERE s.price = (SELECT MAX(s2.price) FROM skus s2 WHERE s2.product_id = s.product_id);
```

| skus.id | product_id | sku_code | price  |
| ------- | ---------- | -------- | ------ |
| s1      | p1         | AO-A-S   | 120.00 |
| s2      | p1         | AO-A-M   | 125.00 |
| s3      | p2         | QJ-B-32  | 350.00 |

| sku_code | price  |
| -------- | ------ |
| AO-A-M   | 125.00 |
| QJ-B-32  | 350.00 |

Với mỗi dòng `s`, subquery tính MAX của **riêng product đó**. Ý nghĩa khác hẳn `(SELECT MAX(price) FROM skus)` (không tương quan, MAX toàn bảng: chỉ ra QJ-B-32). Cách nhận biết: có alias bảng ngoài xuất hiện trong subquery hay không.

**Ví dụ 3 — IN vs EXISTS cho "đơn có dòng mua ≥ 3 cái".**

```sql
SELECT o.id, o.status FROM orders o
WHERE o.id IN (SELECT order_id FROM order_items WHERE quantity >= 3);

SELECT o.id, o.status FROM orders o
WHERE EXISTS (SELECT 1 FROM order_items i WHERE i.order_id = o.id AND i.quantity >= 3);
```

Cùng kết quả; `IN` là dạng không tương quan (planner thường biến thành semi-join), `EXISTS` là tương quan. Với cột nullable, `NOT IN` và `NOT EXISTS` **không** tương đương (§1.3).

**Ví dụ 4 — derived table để tránh nhân dòng.**

**Bối cảnh:** "user đặt > 20 đơn" nhưng muốn kèm tên user.

```sql
SELECT u.name, t.orders
FROM users u
JOIN (SELECT user_id, COUNT(*) AS orders FROM orders GROUP BY user_id) t ON t.user_id = u.id
WHERE t.orders > 20;
```

Gom `orders` xong trong derived table rồi mới join `users` — mỗi user đúng một dòng, không cần `COUNT(DISTINCT)`. Đây cũng là cách sửa bài "nhân dòng" ở §2.3: mỗi quan hệ 1-n gom riêng, rồi join các bảng đã gom.

Khi nào dùng cái nào: đọc `EXISTS vs IN vs JOIN` ở file 02. Tạm thời: lọc "có tồn tại" → EXISTS; lấy thêm cột → JOIN với derived table / CTE; scalar subquery trong SELECT chỉ khi bảng ngoài nhỏ.

**Thử biến tấu:** user chưa đặt đơn nào bằng 3 cách (NOT EXISTS, LEFT JOIN + IS NULL, scalar `(SELECT COUNT(*)) = 0`). Sku có giá cao hơn trung bình của **product của nó**. Product có `base_price` cao hơn **mọi** sku hết hàng (`> ALL`).

### 2.6 JOIN dây chuyền nhiều bảng và sơ đồ nhân dòng

**Bối cảnh:** trang "lịch sử mua hàng" của một user cần: đơn, dòng hàng, mã sku, và tên product **hiện tại** (để so với tên lúc mua). Đường đi: `users` → `orders` → `order_items` → `skus` → `products`. Hai mối cuối là LEFT vì `order_items.sku_id` nullable.

```sql
SELECT u.name, o.id AS order_id, o.status,
       i.product_name, i.quantity, i.unit_price,
       s.sku_code, p.name AS current_name
FROM users u
JOIN orders o       ON o.user_id = u.id
JOIN order_items i  ON i.order_id = o.id
LEFT JOIN skus s    ON s.id = i.sku_id
LEFT JOIN products p ON p.id = s.product_id
WHERE u.email = 'user100@example.com'
ORDER BY o.created_at, i.id;
```

Dữ liệu mẫu cho một user:

| orders.id | status    |
| --------- | --------- |
| o1        | delivered |
| o2        | pending   |

| order_items.id | order_id | sku_id | product_name    | unit_price | quantity |
| -------------- | -------- | ------ | --------------- | ---------- | -------- |
| 1              | o1       | s1     | Áo thun A       | 120.00     | 2        |
| 2              | o1       | s3     | Quần jean B     | 350.00     | 1        |
| 3              | o2       | NULL   | Mũ C (đã ngừng) | 80.00      | 1        |

Sơ đồ số dòng qua từng bước JOIN:

```
users (1 dòng: An)
  └─ JOIN orders        → 2 dòng   (An×o1, An×o2)
       └─ JOIN order_items → 3 dòng   (o1 có 2 dòng hàng, o2 có 1)
            └─ LEFT JOIN skus     → 3 dòng   (dòng 3 có sku NULL, vẫn giữ nhờ LEFT)
                 └─ LEFT JOIN products → 3 dòng
```

Kết quả:

| name | order_id | status    | product_name    | quantity | unit_price | sku_code | current_name     |
| ---- | -------- | --------- | --------------- | -------- | ---------- | -------- | ---------------- |
| An   | o1       | delivered | Áo thun A       | 2        | 120.00     | AO-A-S   | Áo thun A (2026) |
| An   | o1       | delivered | Quần jean B     | 1        | 350.00     | QJ-B-32  | Quần jean B      |
| An   | o2       | pending   | Mũ C (đã ngừng) | 1        | 80.00      | NULL     | NULL             |

Số dòng cuối = số dòng của bảng **nhiều nhất** trên dây chuyền (order_items), miễn các JOIN sau đó là n-1 hoặc LEFT n-1. Tên user và trạng thái đơn lặp lại trên mỗi dòng hàng — bình thường, app gom lại. Trên seed: user100 có 1 → 6 đơn → 20 dòng hàng.

**Sai / Đúng — đếm đơn sau dây chuyền.**

```sql
-- SAI: đếm dòng sau khi đã nhân qua order_items
SELECT u.name, COUNT(o.id) AS orders
FROM users u JOIN orders o ON o.user_id = u.id JOIN order_items i ON i.order_id = o.id
WHERE u.email = 'user100@example.com' GROUP BY u.id, u.name;

-- ĐÚNG
SELECT u.name, COUNT(DISTINCT o.id) AS orders, SUM(i.unit_price * i.quantity) AS revenue
FROM users u JOIN orders o ON o.user_id = u.id JOIN order_items i ON i.order_id = o.id
WHERE u.email = 'user100@example.com' GROUP BY u.id, u.name;
```

| Câu sai | Câu đúng      |
| ------- | ------------- |
| An, 3   | An, 2, 670.00 |

`COUNT(o.id)` đếm `o1` hai lần. `SUM` thì **không** cần DISTINCT vì mỗi dòng hàng chỉ xuất hiện đúng một lần — DISTINCT chỉ cho cột bị lặp. Trên seed: 20 vs 6.

Cách tự kiểm tra một dây chuyền: viết `SELECT COUNT(*)` sau **mỗi** JOIN thêm vào; số tăng ở bước nào thì bước đó là 1-n, và mọi aggregate từ bước đó trở đi phải cân nhắc.

**Thử biến tấu:** thêm `brands` vào dây chuyền (qua `products.brand_id`) và kiểm tra số dòng không đổi. Doanh thu theo brand từ `order_items` (tại sao phải dùng `i.unit_price` chứ không phải `s.price`?). Đổi hai LEFT JOIN cuối thành JOIN và giải thích dòng nào mất.

### 2.7 USING vs ON

`USING (col)` là cách viết tắt của `ON a.col = b.col` khi **hai bảng có cột cùng tên**, và kết quả chỉ giữ **một** cột đó (không cần prefix). Trong schema này hầu hết cột nối **khác tên** (`orders.user_id` ↔ `users.id`) nên `USING` ít có đất; nó hợp với các cột kiểu `product_id` xuất hiện ở cả hai phía.

**Ví dụ 1 — ON (thông thường).**

```sql
SELECT o.id, u.name FROM orders o JOIN users u ON u.id = o.user_id;
```

**Ví dụ 2 — USING khi cùng tên cột.**

**Bối cảnh:** `reviews.product_id` và `skus.product_id` cùng tên, cùng ý nghĩa.

```sql
SELECT product_id, r.rating, s.sku_code
FROM reviews r
JOIN skus s USING (product_id);
```

| reviews.product_id | rating |
| ------------------ | ------ |
| p1                 | 5      |

| skus.product_id | sku_code |
| --------------- | -------- |
| p1              | AO-A-S   |
| p1              | AO-A-M   |

| product_id | rating | sku_code |
| ---------- | ------ | -------- |
| p1         | 5      | AO-A-S   |
| p1         | 5      | AO-A-M   |

`product_id` viết không prefix; viết `r.product_id` vẫn được nhưng `SELECT *` chỉ ra một cột `product_id`. (Ví dụ này cũng nhắc lại: review × sku là hai quan hệ 1-n → nhân dòng; đừng AVG rating trên kết quả này.)

**Sai / Đúng — USING nối nhầm cột trùng tên.**

```sql
-- SAI: products và brands đều có id và deleted_at; USING (id) nối product.id = brand.id → vô nghĩa, 0 dòng
SELECT id FROM products JOIN brands USING (id);
-- ĐÚNG
SELECT p.id, b.name FROM products p JOIN brands b ON b.id = p.brand_id;
```

Câu sai chạy được, trả 0 dòng (hai uuid khác bảng không bao giờ bằng nhau), không lỗi. `USING (deleted_at)` còn tệ hơn: nối theo NULL không bao giờ khớp. Quy tắc: `USING` chỉ khi cột cùng tên **và** cùng nghĩa; còn nghi ngờ thì `ON`. `NATURAL JOIN` (tự nối mọi cột trùng tên) thì không dùng bao giờ.

**Thử biến tấu:** viết lại JOIN `product_categories` ↔ `skus` bằng `USING (product_id)` rồi bằng `ON`, so số dòng. Thử `SELECT *` trên hai phiên bản và đếm số cột.

---

## Tuần 3 · Ghi dữ liệu, kiểu dữ liệu, ràng buộc, transaction

Mọi ví dụ ghi trong tuần này nên chạy trong `BEGIN; ... ROLLBACK;` khi bạn tập, để seed không bị biến dạng.

### 3.1 INSERT / UPDATE / DELETE và RETURNING

**Bối cảnh:** ba thao tác đời thường: tạo brand mới và cần id vừa sinh; khách mua 2 cái nên trừ tồn kho của sku nhưng không được để âm; khách bỏ nhiều sku khỏi giỏ (`cart_items` là bảng giỏ hàng, một dòng cho mỗi cặp user–sku).

```sql
INSERT INTO brands (name) VALUES ('Acme') RETURNING id;

UPDATE skus SET stock = stock - 2
WHERE id = $1 AND stock >= 2
RETURNING stock;      -- 0 dòng trả về = hết hàng, không cần SELECT trước

DELETE FROM cart_items WHERE user_id = $1 AND sku_id = ANY($2::uuid[]);
```

`RETURNING` là điểm mạnh của Postgres: ghi + đọc trong một round-trip. Câu `UPDATE ... WHERE stock >= 2` là cách **atomic** trừ tồn kho, không cần lock tay (chi tiết file 03). `= ANY($2::uuid[])` nhận một mảng từ app (`['id1','id2']`) thay cho `IN` phải nối chuỗi.

**Ví dụ 1 — INSERT nhiều dòng, RETURNING nhiều cột, giá trị mặc định.**

```sql
INSERT INTO brands (name) VALUES ('Acme'), ('Globex'), ('Initech')
RETURNING id, name;

INSERT INTO categories (name) VALUES ('Giày') RETURNING *;
```

| id        | name    |
| --------- | ------- |
| 7d6e…cedf | Acme    |
| 3799…3cb4 | Globex  |
| 8fba…8438 | Initech |

| id        | name | parent_id | deleted_at |
| --------- | ---- | --------- | ---------- |
| 4c1b…2173 | Giày | NULL      | NULL       |

Một câu INSERT nhiều dòng nhanh hơn nhiều câu INSERT một dòng (một round-trip, một lần ghi WAL); ORM `createMany` sinh đúng câu này. Cột không liệt kê nhận `DEFAULT` (`id` = `gen_random_uuid()`, `parent_id` = NULL). `RETURNING *` ổn khi debug; trong code liệt kê cột.

**Ví dụ 2 — INSERT ... SELECT: chuyển giỏ hàng thành dòng đơn.**

**Bối cảnh:** checkout: tạo đơn rồi chép mọi `cart_items` của user thành `order_items`, **chụp** tên và giá hiện tại từ `products` / `skus`.

```sql
INSERT INTO orders (id, user_id, status)
VALUES ('11111111-1111-1111-1111-111111111111', (SELECT id FROM users WHERE email = 'user200@example.com'), 'pending')
RETURNING id;

INSERT INTO order_items (order_id, sku_id, product_name, unit_price, quantity)
SELECT '11111111-1111-1111-1111-111111111111', s.id, p.name, s.price, ci.quantity
FROM cart_items ci
JOIN skus s ON s.id = ci.sku_id
JOIN products p ON p.id = s.product_id
WHERE ci.user_id = (SELECT id FROM users WHERE email = 'user200@example.com')
RETURNING id, product_name, unit_price, quantity;
```

| cart_items.sku_id | quantity | skus.sku_code | price  | products.name |
| ----------------- | -------- | ------------- | ------ | ------------- |
| s1                | 2        | AO-A-S        | 120.00 | Áo thun A     |
| s3                | 1        | QJ-B-32       | 350.00 | Quần jean B   |

| id     | product_name | unit_price | quantity |
| ------ | ------------ | ---------- | -------- |
| 150110 | Áo thun A    | 120.00     | 2        |
| 150111 | Quần jean B  | 350.00     | 1        |

`INSERT ... SELECT` chèn bao nhiêu dòng tuỳ SELECT trả về (0 dòng thì không chèn gì, không lỗi). Tên và giá được chép **tại thời điểm này**; sau này `skus.price` đổi, `order_items.unit_price` vẫn giữ. Trong thực tế, id đơn do app sinh (uuid v7) hoặc lấy từ `RETURNING id` của câu trước; ở đây dùng id cố định cho dễ đọc.

**Ví dụ 3 — UPDATE có điều kiện, nhiều cột, và UPDATE ... FROM.**

```sql
-- trừ tồn + tăng version, không bao giờ âm
UPDATE skus SET stock = stock - 2, version = version + 1
WHERE sku_code = 'AO-A-S' AND stock >= 2
RETURNING sku_code, stock, version;

-- publish mọi product nháp đã có ít nhất một sku
UPDATE products SET published_at = now()
WHERE published_at IS NULL AND deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM skus s WHERE s.product_id = products.id)
RETURNING id, name;

-- UPDATE ... FROM: đồng bộ giá sku theo product
UPDATE skus s SET price = p.base_price + 10
FROM products p
WHERE p.id = s.product_id AND p.name = 'Áo thun A'
RETURNING s.sku_code, s.price, p.name;
```

| sku_code | stock | version | (trước)             |
| -------- | ----- | ------- | ------------------- |
| AO-A-S   | 8     | 1       | stock 10, version 0 |

| sku_code | price  | name      |
| -------- | ------ | --------- |
| AO-A-S   | 130.00 | Áo thun A |
| AO-A-M   | 130.00 | Áo thun A |

`UPDATE ... FROM` là JOIN trong UPDATE: bảng bị sửa đứng sau UPDATE, bảng tham chiếu đứng sau FROM, điều kiện nối trong WHERE. `RETURNING` được phép lấy cột của cả hai bảng. Với câu trừ tồn: nếu `stock` là 1 thì `RETURNING` trả 0 dòng → app hiểu là hết hàng, không cần SELECT trước. Cột ORM thường tự điền (`updated_at`, `version`) giờ bạn phải tự set.

**Ví dụ 4 — DELETE với mảng, DELETE ... USING, và xoá mềm.**

```sql
-- xoá nhiều sku khỏi giỏ
DELETE FROM cart_items
WHERE user_id = $1 AND sku_id = ANY($2::uuid[])
RETURNING user_id, sku_id;

-- DELETE ... USING: dọn giỏ hàng chứa sku đã xoá mềm
DELETE FROM cart_items ci
USING skus s
WHERE s.id = ci.sku_id AND s.deleted_at IS NOT NULL
RETURNING ci.user_id, s.sku_code;

-- xoá mềm: thực ra là UPDATE
UPDATE products SET deleted_at = now()
WHERE name = 'Quần jean B' AND deleted_at IS NULL
RETURNING id, name, deleted_at;
```

| cart_items.user_id | sku_id | skus.deleted_at |
| ------------------ | ------ | --------------- |
| u1                 | s1     | NULL            |
| u1                 | s2     | 2026-09-20      |
| u2                 | s2     | 2026-09-20      |

Kết quả `DELETE ... USING`:

| user_id | sku_code |
| ------- | -------- |
| u1      | AO-A-M   |
| u2      | AO-A-M   |

`USING` trong DELETE tương ứng `FROM` trong UPDATE. `DELETE` không có WHERE xoá **cả bảng** và Postgres không hỏi lại; thói quen tốt: viết `SELECT` với cùng WHERE trước, đếm, rồi mới đổi thành `DELETE`. Với soft delete, `AND deleted_at IS NULL` trong WHERE giữ nguyên mốc xoá lần đầu nếu lỡ gọi hai lần.

**Thử biến tấu:** viết upsert cho `cart_items` bằng `INSERT ... ON CONFLICT (user_id, sku_id) DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity` (đọc trước ở file 02). Đổi status mọi đơn `pending` quá 3 ngày thành `cancelled`, trả về số đơn. Xoá review của user đã bị `blocked` bằng `DELETE ... USING`.

### 3.2 Kiểu dữ liệu: những lựa chọn có hậu quả

| Việc       | Nên dùng                                     | Không nên                       | Vì sao                                                                                                                    |
| ---------- | -------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Tiền       | `numeric(12,2)` / `bigint` (đơn vị nhỏ nhất) | `float` / `double precision`    | float làm tròn sai: `0.1 + 0.2 <> 0.3`. Rất nhiều schema sinh từ ORM đang mắc lỗi này                                     |
| Thời điểm  | `timestamptz`                                | `timestamp`                     | `timestamp` không có múi giờ, đổi server timezone là sai giờ. Prisma `DateTime` mặc định map sang `timestamp(3)` không tz |
| Khoá chính | `uuid` (v7 nếu được) hoặc `bigint identity`  | `varchar` cho uuid              | uuid text tốn gấp đôi, index kém                                                                                          |
| Enum       | `text` + `CHECK` hoặc Postgres `enum`        | `int` mã số                     | đọc log / debug dễ hơn; `text + CHECK` dễ thêm giá trị hơn `enum`                                                         |
| Text       | `text`                                       | `varchar(n)` khi không có lý do | Postgres không khác biệt hiệu năng, varchar(n) chỉ là ràng buộc                                                           |
| Cờ         | `boolean`                                    | `smallint 0/1`                  |                                                                                                                           |
| JSON       | `jsonb`                                      | `json`                          | jsonb có index, so sánh được                                                                                              |

Tự chứng minh bằng vài câu SELECT:

```sql
SELECT 0.1 + 0.2 = 0.3, 0.1::float + 0.2::float = 0.3::float, 0.1::float8 + 0.2::float8;
SELECT 19.99::numeric(12,2) * 3, 19.99::float * 3;
```

| `numeric` | `float` | `float` tổng        |
| --------- | ------- | ------------------- |
| true      | false   | 0.30000000000000004 |

| `numeric × 3` | `float × 3`       |
| ------------- | ----------------- |
| 59.97         | 59.97000000000001 |

Hằng số `0.1` không ép kiểu là `numeric`, nên câu đầu đúng; ép sang `float` thì sai — đúng như JS. Giỏ hàng 3 món cộng bằng float rồi so `= 59.97` để kiểm tra thanh toán sẽ lệch.

```sql
SELECT '2026-09-30 10:00'::timestamp, '2026-09-30 10:00+07'::timestamptz;
SELECT now() AT TIME ZONE 'Asia/Ho_Chi_Minh';
SELECT pg_column_size('123e4567-e89b-12d3-a456-426614174000'::uuid),
       pg_column_size('123e4567-e89b-12d3-a456-426614174000'::text);
SELECT 10::numeric / 3, (10::numeric / 3)::numeric(12,2), 7 / 2, 7 / 2.0;
```

| `timestamp`         | `timestamptz` (server UTC) |
| ------------------- | -------------------------- |
| 2026-09-30 10:00:00 | 2026-09-30 03:00:00+00     |

`timestamp` giữ nguyên "10:00" và không biết là 10 giờ ở đâu; `timestamptz` hiểu `+07` và lưu thành thời điểm tuyệt đối, hiển thị theo timezone của session. `pg_column_size` trả 16 vs 37 byte: uuid lưu dạng text tốn hơn gấp đôi, index to hơn, so sánh chậm hơn. Còn `10::numeric / 3` = `3.3333333333333333`, `7 / 2` = 3 (chia nguyên).

Ép kiểu sai thì lỗi ngay, đây là điều tốt:

```
SELECT 'abc'::numeric;        → ERROR:  invalid input syntax for type numeric: "abc"
SELECT '2026-13-01'::date;    → ERROR:  date/time field value out of range: "2026-13-01"
WHERE id = '123'              → ERROR:  invalid input syntax for type uuid: "123"
```

Lỗi cuối hay gặp khi FE truyền `productId` không hợp lệ vào raw query; validate ở DTO trước, đừng để nó thành 500.

**Thử biến tấu:** tính tổng `unit_price * quantity` của một đơn bằng `numeric` rồi ép cả hai vế sang `float` và so sánh. Hiển thị `orders.created_at` theo giờ Việt Nam dạng `YYYY-MM-DD HH24:MI` (`to_char`). Xem `\d products` và tìm cột nào nếu bạn thiết kế lại sẽ đổi kiểu.

### 3.3 Ràng buộc: để DB bảo vệ bạn thay vì code

Schema mẫu đã có sẵn các ràng buộc này; đọc lại [schema.sql](schema.sql) và tìm chúng:

```sql
CHECK (stock >= 0)                                   -- skus: không bao giờ âm dù code có bug
CHECK (rating BETWEEN 1 AND 5)                       -- reviews
CHECK (status IN ('pending', 'paid', ...))           -- orders: enum bằng CHECK
CREATE UNIQUE INDEX users_email_active_uq ON users (email) WHERE deleted_at IS NULL;
```

Cái cuối là **partial unique index**: email chỉ unique trong số user chưa xoá mềm. Không có nó, user xoá rồi đăng ký lại cùng email sẽ bị chặn.

**Ràng buộc bị vi phạm thì trông thế nào.** Học thuộc hình dạng thông báo để đọc log nhanh; mỗi lỗi có dòng `ERROR` (loại vi phạm, tên constraint) và dòng `DETAIL` (dòng/khoá gây lỗi).

CHECK — trừ tồn quá tay, hoặc status ngoài danh sách:

```
UPDATE skus SET stock = stock - 999 WHERE sku_code = 'SKU-7a563a8a-1';
ERROR:  new row for relation "skus" violates check constraint "skus_stock_check"
DETAIL:  Failing row contains (4d608d82-…, 7a563a8a-…, SKU-7a563a8a-1, 87.15, -985, 0, null).

INSERT INTO orders (user_id, status) VALUES (…, 'done');
ERROR:  new row for relation "orders" violates check constraint "orders_status_check"
DETAIL:  Failing row contains (984efe90-…, b35d7dce-…, done, 2026-09-30 16:59:02.12079+00, null).
```

NOT NULL — quên `base_price`:

```
INSERT INTO products (name, brand_id, list_price) VALUES ('Áo thun A', …, 150);
ERROR:  null value in column "base_price" of relation "products" violates not-null constraint
DETAIL:  Failing row contains (87c002c8-…, Áo thun A, ff5f1288-…, null, 150.00, {}, {}, null, 2026-09-30 …, null).
```

UNIQUE — email trùng (partial index) và sku_code trùng; khoá chính ghép trùng ở giỏ hàng:

```
INSERT INTO users (email, name, role_id) VALUES ('user1@example.com', 'Dup', 3);
ERROR:  duplicate key value violates unique constraint "users_email_active_uq"
DETAIL:  Key (email)=(user1@example.com) already exists.

ERROR:  duplicate key value violates unique constraint "skus_sku_code_key"
DETAIL:  Key (sku_code)=(SKU-7a563a8a-1) already exists.

ERROR:  duplicate key value violates unique constraint "cart_items_pkey"
DETAIL:  Key (user_id, sku_id)=(000d1458-…, cf8cfbdb-…) already exists.
```

Lỗi `cart_items_pkey` chính là lý do giỏ hàng cần **upsert** (`ON CONFLICT`, file 02) thay vì INSERT trần. Còn partial unique index cho phép đúng ý nghiệp vụ: xoá mềm `user1@example.com` xong thì INSERT lại cùng email **thành công**.

FOREIGN KEY — chèn trỏ tới cha không tồn tại, và xoá cha còn con:

```
INSERT INTO orders (user_id, status) VALUES ('00000000-0000-0000-0000-000000000000', 'pending');
ERROR:  insert or update on table "orders" violates foreign key constraint "orders_user_id_fkey"
DETAIL:  Key (user_id)=(00000000-0000-0000-0000-000000000000) is not present in table "users".

DELETE FROM users WHERE id = '5fee91e9-…';
ERROR:  update or delete on table "users" violates foreign key constraint "orders_user_id_fkey" on table "orders"
DETAIL:  Key (id)=(5fee91e9-…) is still referenced from table "orders".
```

Hành vi `ON DELETE` của khoá ngoại:

- `CASCADE` → xoá cha xoá con (`product_categories`, `skus` theo `products`; `cart_items` theo `skus`)
- `SET NULL` → xoá cha, cột FK ở con thành NULL (`order_items.sku_id`, `categories.parent_id`)
- `NO ACTION` / `RESTRICT` (mặc định) → cấm xoá cha khi còn con (`orders.user_id`, `products.brand_id`)

Thử trong transaction: `DELETE FROM products WHERE name = 'Product 1'` — số dòng `product_categories` của nó đi từ 2 về 0 mà bạn không xoá tay dòng nào. Tiện, và cũng nguy hiểm: một `DELETE` nhầm trên `products` kéo theo `skus`, `cart_items`, `reviews`. Đây là lý do nhiều dự án chọn soft delete cho bảng gốc, và cũng là lý do bạn đọc `\d <bảng>` phần "Referenced by" trước khi xoá.

Ở tầng app, bắt lỗi theo **mã SQLSTATE** thay vì parse chuỗi: `23505` unique, `23503` foreign key, `23514` check, `23502` not null. Thư viện `pg` trả `err.code`; Prisma bọc lại thành `P2002` (unique) / `P2003` (FK).

**Thử biến tấu:** liệt kê constraint của `orders` bằng `SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'orders'::regclass`. Cố tình gây từng loại lỗi trên `reviews` (rating 0, product_id không tồn tại, user_id NULL) và ghi lại SQLSTATE. Nghĩ xem `CHECK (quantity > 0)` trên `order_items` chặn được bug gì ở tầng checkout.

### 3.4 Transaction cơ bản

**Bối cảnh:** luồng "đặt hàng" gồm ba bước phải đi cùng nhau: trừ tồn kho sku, tạo dòng `orders`, tạo dòng `order_items` chụp lại tên và giá lúc mua. Nếu bước 2 lỗi mà bước 1 đã chạy thì tồn kho bị trừ oan. Transaction đảm bảo cả ba cùng thành công hoặc cùng không.

```sql
BEGIN;
  UPDATE skus SET stock = stock - 1 WHERE id = $1 AND stock >= 1;
  -- nếu 0 dòng bị ảnh hưởng → ROLLBACK ở tầng app
  INSERT INTO orders (id, user_id, status) VALUES ($2, $3, 'pending');
  INSERT INTO order_items (order_id, sku_id, product_name, unit_price, quantity) VALUES ($2, $1, $4, $5, 1);
COMMIT;
```

Ba điều cần nhớ ở mức nền tảng:

1. **Atomic**: hoặc tất cả, hoặc không gì cả. Lỗi giữa chừng → `ROLLBACK`.
2. Transaction mở càng lâu càng giữ lock lâu → **không gọi HTTP / gửi mail bên trong transaction**.
3. Mặc định Postgres là `READ COMMITTED`: mỗi câu lệnh thấy dữ liệu đã commit tại thời điểm câu lệnh đó chạy. Hai lần `SELECT` trong cùng transaction có thể thấy kết quả khác nhau. Sâu hơn ở file 03.

**Ví dụ 1 — lỗi giữa chừng: transaction bị "abort", mọi câu sau bị bỏ qua.**

**Bối cảnh:** trong psql, bạn gõ một câu vi phạm CHECK rồi cứ tiếp tục.

```sql
BEGIN;
UPDATE skus SET stock = -1 WHERE sku_code = 'SKU-7a563a8a-1';
SELECT 1;
COMMIT;
SELECT stock FROM skus WHERE sku_code = 'SKU-7a563a8a-1';
```

Postgres in ra:

```
BEGIN
ERROR:  new row for relation "skus" violates check constraint "skus_stock_check"
DETAIL:  Failing row contains (…, SKU-7a563a8a-1, 87.15, -1, 0, null).
ERROR:  current transaction is aborted, commands ignored until end of transaction block
ROLLBACK
 stock
-------
    14
```

Sau lỗi đầu tiên, **mọi** câu tiếp theo (kể cả `SELECT 1`) đều bị từ chối với thông báo `current transaction is aborted`. Câu `COMMIT` lúc này **thực chất là ROLLBACK** (psql in `ROLLBACK`). Stock vẫn là 14. Ở tầng app: bắt lỗi → gọi `ROLLBACK` tường minh → trả lỗi cho client; không "thử lại câu tiếp theo" trong cùng transaction.

**Ví dụ 2 — SAVEPOINT: huỷ một phần, giữ phần còn lại.**

**Bối cảnh:** import lô dữ liệu: tạo brand, rồi thử chèn review; review lỗi thì bỏ review nhưng vẫn giữ brand.

```sql
BEGIN;
INSERT INTO brands (name) VALUES ('Acme') RETURNING name;
SAVEPOINT before_review;
INSERT INTO reviews (product_id, user_id, rating) VALUES ((SELECT id FROM products LIMIT 1), (SELECT id FROM users LIMIT 1), 6);
ROLLBACK TO SAVEPOINT before_review;
SELECT count(*) FROM brands WHERE name = 'Acme';
COMMIT;
```

```
BEGIN
 name
------
 Acme
SAVEPOINT
ERROR:  new row for relation "reviews" violates check constraint "reviews_rating_check"
ROLLBACK            ← ROLLBACK TO SAVEPOINT: transaction sống lại
 count
-------
     1              ← brand vẫn còn
COMMIT
```

`ROLLBACK TO SAVEPOINT` đưa transaction về trạng thái tại savepoint và thoát khỏi trạng thái abort; những gì trước savepoint (brand) còn nguyên, `COMMIT` sau đó ghi brand. `RELEASE SAVEPOINT x` bỏ mốc khi không cần nữa. ORM dùng chính cơ chế này cho "nested transaction" (TypeORM `queryRunner`, Prisma không hỗ trợ lồng). Mỗi savepoint tốn tài nguyên; đừng đặt trong vòng lặp 10.000 dòng — gom lô và fail cả lô thì rẻ hơn.

**Ví dụ 3 — quên COMMIT trong psql.**

**Bối cảnh:** bạn mở psql, `BEGIN`, sửa tên brand, thấy `SELECT` ra đúng, rồi chuyển sang app test tiếp.

Phiên psql 1:

```sql
BEGIN;
UPDATE brands SET name = 'Đổi tên' WHERE name = 'Brand 1';
SELECT name FROM brands WHERE name = 'Đổi tên';   -- Đổi tên  (thấy được, vì cùng transaction)
-- ... quên COMMIT, để đó
```

Phiên khác (app, hoặc cửa sổ psql thứ hai):

```sql
SELECT name FROM brands WHERE name IN ('Đổi tên', 'Brand 1');   -- Brand 1
```

Phiên khác **vẫn thấy tên cũ** — đúng theo isolation; nếu phiên 1 đóng (Ctrl-D, mất mạng) thì UPDATE bị rollback lặng lẽ. Triệu chứng đặc trưng: "tôi sửa trong DB rồi mà app không thấy", hoặc tệ hơn, `ALTER TABLE` / `UPDATE` của người khác **treo** vì phiên quên COMMIT đang giữ lock trên dòng đó. Kiểm tra bằng `SELECT pid, state, query FROM pg_stat_activity WHERE state = 'idle in transaction';` — `idle in transaction` là kẻ tình nghi. Trong psql, prompt đổi từ `=#` thành `*#` khi đang trong transaction; nhìn prompt trước khi tắt cửa sổ. Ở app: mọi `BEGIN` phải nằm trong `try/finally` có `COMMIT`/`ROLLBACK`, và đặt `idle_in_transaction_session_timeout` trên server để tự cắt phiên lười.

**Thử biến tấu:** mở hai psql song song, phiên A `BEGIN; UPDATE skus SET stock = 0 WHERE sku_code = '...'` không COMMIT, phiên B `UPDATE` cùng dòng: quan sát B treo, rồi A `COMMIT` và xem B chạy tiếp. Viết luồng checkout trên ở dạng hoàn chỉnh với SAVEPOINT quanh bước trừ tồn từng sku, để đơn nhiều sku vẫn tạo được với các sku còn hàng (rồi tự hỏi nghiệp vụ có muốn thế không).

### 3.5 Đọc cấu trúc bảng bằng psql

```
\d products         -- cột, kiểu, index, FK
\di                 -- danh sách index
\dt                 -- danh sách bảng
\timing on          -- đo thời gian mỗi query
\x                  -- bật/tắt hiển thị dọc, hữu ích với bảng nhiều cột
\e                  -- mở editor sửa câu vừa gõ
```

`\d skus` trên schema mẫu:

```
                                Table "shop.skus"
   Column   |           Type           | Collation | Nullable |      Default
------------+--------------------------+-----------+----------+-------------------
 id         | uuid                     |           | not null | gen_random_uuid()
 product_id | uuid                     |           | not null |
 sku_code   | text                     |           | not null |
 price      | numeric(12,2)            |           | not null |
 stock      | integer                  |           | not null |
 version    | integer                  |           | not null | 0
 deleted_at | timestamp with time zone |           |          |
Indexes:
    "skus_pkey" PRIMARY KEY, btree (id)
    "skus_product_idx" btree (product_id)
    "skus_sku_code_key" UNIQUE CONSTRAINT, btree (sku_code)
Check constraints:
    "skus_stock_check" CHECK (stock >= 0)
Foreign-key constraints:
    "skus_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
Referenced by:
    TABLE "cart_items" CONSTRAINT "cart_items_sku_id_fkey" ... ON DELETE CASCADE
    TABLE "order_items" CONSTRAINT "order_items_sku_id_fkey" ... ON DELETE SET NULL
```

Đọc từ trên xuống, bạn trả lời được ngay: cột nào nullable (chỉ `deleted_at`), lọc theo `product_id` có index không (có), `sku_code` có unique không (có), xoá sku thì giỏ hàng mất còn lịch sử đơn giữ lại (`CASCADE` vs `SET NULL`). Từ giờ mỗi lần viết query cho bảng nào, `\d` bảng đó trước.

**Thử biến tấu:** `\d users` và tìm partial unique index. `\d order_items` và giải thích vì sao `sku_id` không có `not null`. `\x` rồi `SELECT * FROM products LIMIT 1` để đọc `attributes` jsonb cho dễ.

### 3.6 Lỗi cú pháp và ngữ nghĩa hay gặp tuần đầu

Sáu thông báo bạn sẽ gặp nhiều nhất khi bắt đầu viết tay, kèm cách sửa. Tất cả là lỗi **thật** Postgres in ra.

| Câu                                                                              | Lỗi                                                                                              | Vì sao / cách sửa                                                                                                                  |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `SELECT status, user_id, count(*) FROM orders GROUP BY status`                   | `column "orders.user_id" must appear in the GROUP BY clause or be used in an aggregate function` | Mỗi nhóm `status` có nhiều `user_id`, Postgres không biết chọn cái nào. Thêm vào GROUP BY hoặc bọc aggregate (`array_agg`, `MIN`). |
| `... WHERE count(*) > 10 GROUP BY status`                                        | `aggregate functions are not allowed in WHERE`                                                   | WHERE chạy trước GROUP BY. Chuyển sang HAVING.                                                                                     |
| `SELECT name, list_price - base_price AS saving FROM products WHERE saving > 10` | `column "saving" does not exist`                                                                 | Alias sinh ra ở SELECT, sau WHERE. Lặp lại biểu thức trong WHERE, hoặc bọc subquery/CTE. ORDER BY thì dùng alias được.             |
| `WHERE base_price = (SELECT price FROM skus)`                                    | `more than one row returned by a subquery used as an expression`                                 | Subquery vô hướng phải trả ≤ 1 dòng. Thêm điều kiện / `LIMIT 1` / dùng `IN`, `ANY`.                                                |
| `SELECT * FROM (SELECT 1)`                                                       | `subquery in FROM must have an alias`                                                            | Derived table cần tên: `(SELECT 1) t`.                                                                                             |
| `SELECT id, name FROM products JOIN brands USING (id)`                           | `column reference "name" is ambiguous`                                                           | Cả hai bảng có `name`; prefix `p.name`. (Và `USING (id)` ở đây còn sai logic, §2.7.)                                               |

Thêm hai lỗi runtime không phải cú pháp: `division by zero` (bọc mẫu số bằng `NULLIF(x, 0)`), và `invalid input syntax for type uuid` (validate tham số trước khi vào query, §3.2).

**Thử biến tấu:** tự gây ra từng lỗi trong bảng, đọc vị trí `^` mà psql chỉ, rồi sửa. Viết một câu vừa có WHERE, GROUP BY, HAVING, ORDER BY dùng alias và kiểm tra alias dùng được ở đâu.

---

## Tự kiểm tra cuối giai đoạn 1

Bạn qua được giai đoạn này khi trả lời đúng mà không tra cứu:

- [ ] `COUNT(*)` và `COUNT(avatar)` khác nhau thế nào? Sau LEFT JOIN thì cái nào cho 0 đúng?
- [ ] Vì sao `WHERE x NOT IN (subquery)` có thể trả về 0 dòng dù dữ liệu có? Viết lại bằng gì?
- [ ] Điều kiện lọc bảng bên phải của LEFT JOIN đặt ở đâu? Vì sao?
- [ ] Vì sao `WHERE date(created_at) = '...'` chậm hơn viết khoảng? Vì sao `BETWEEN` với timestamptz mất dữ liệu?
- [ ] `LIMIT 3` không có ORDER BY trả về gì? Vì sao cần khoá phụ trong ORDER BY khi phân trang?
- [ ] Join `products` với cả `skus` và `product_categories` rồi `SUM(stock)` sai ở đâu? Sửa thế nào?
- [ ] Cùng một yêu cầu, khi nào đặt điều kiện ở WHERE và khi nào ở HAVING?
- [ ] Subquery tương quan khác không tương quan ở điểm nào? Nhìn vào đâu để biết?
- [ ] Viết một câu UPDATE trừ tồn kho không bao giờ làm stock âm, không dùng lock.
- [ ] Vì sao không lưu tiền bằng float? Vì sao không dùng `timestamp` không tz?
- [ ] Sau một câu lỗi trong transaction, các câu tiếp theo bị gì? `COMMIT` lúc đó làm gì?
- [ ] Hoàn thành bài 1–10 trong [05-exercises.md](05-exercises.md).

**Tiếp theo**: [02-intermediate.md](02-intermediate.md).
