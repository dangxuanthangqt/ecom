# Dựng môi trường thực hành (30 phút, làm một lần)

Mục tiêu: có một Postgres riêng chứa **đúng dữ liệu mà toàn bộ giáo trình dùng**, kết nối được bằng DBeaver / psql / VS Code, và biết cách đối chiếu từng ví dụ trong tài liệu với kết quả thật trên máy bạn.

Mọi thứ nằm trong thư mục này:

| File                                     | Vai trò                                                                                        |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [docker-compose.yml](docker-compose.yml) | Postgres 16, cổng **5433**, tự nạp schema + seed lần đầu, bật sẵn `pg_stat_statements`         |
| [schema.sql](schema.sql)                 | 12 bảng của schema mẫu `shop` + seed 5.000 user, 2.000 product, 50.000 đơn, ~150.000 dòng hàng |

Cổng 5433 được chọn cố ý để không đụng Postgres 5432 của dự án khác trên máy bạn.

---

## Bước 1 · Cài Docker

- **Windows / macOS**: cài [Docker Desktop](https://www.docker.com/products/docker-desktop/). Trên Windows, bật WSL 2 integration trong Settings → Resources → WSL integration nếu bạn làm việc trong WSL.
- **Linux**: `sudo apt install docker.io docker-compose-plugin` (Ubuntu) hoặc theo [docs.docker.com](https://docs.docker.com/engine/install/).

Kiểm tra:

```bash
docker --version          # Docker version 24+ là được
docker compose version    # Docker Compose version v2+
```

## Bước 2 · Khởi động Postgres và nạp dữ liệu

```bash
cd docs/sql-mastery          # thư mục chứa docker-compose.yml và schema.sql
docker compose up -d
```

Lần đầu Docker tải image (~100 MB) rồi chạy `schema.sql` tự động. Seed mất khoảng 10–20 giây. Theo dõi tới khi thấy dòng `database system is ready to accept connections` xuất hiện **lần thứ hai** (lần đầu là server tạm dùng để nạp seed):

```bash
docker compose logs -f db
# ... PostgreSQL init process complete; ready for start up.
# ... database system is ready to accept connections     ← xong
```

Nhấn Ctrl+C để thoát log. Kiểm tra dữ liệu đã đủ:

```bash
docker compose exec db psql -U postgres -d sql_mastery -c "
SET search_path TO shop;
SELECT (SELECT count(*) FROM users)       AS users,
       (SELECT count(*) FROM products)    AS products,
       (SELECT count(*) FROM skus)        AS skus,
       (SELECT count(*) FROM orders)      AS orders,
       (SELECT count(*) FROM order_items) AS order_items,
       (SELECT count(*) FROM reviews)     AS reviews;"
```

Kết quả mong đợi (số lẻ có thể khác vài đơn vị vì seed dùng `random()`):

| users | products | skus  | orders | order_items | reviews |
| ----- | -------- | ----- | ------ | ----------- | ------- |
| 5000  | 2000     | ~4600 | 50000  | ~150000     | 20000   |

Nếu `order_items` bằng 0, seed chưa chạy xong; đợi thêm 10 giây rồi chạy lại.

Thông tin kết nối dùng cho mọi công cụ bên dưới:

| Tham số  | Giá trị                                                     |
| -------- | ----------------------------------------------------------- |
| Host     | `localhost`                                                 |
| Port     | `5433`                                                      |
| Database | `sql_mastery`                                               |
| User     | `postgres`                                                  |
| Password | `postgres`                                                  |
| Schema   | `shop`                                                      |
| URL      | `postgresql://postgres:postgres@localhost:5433/sql_mastery` |

## Bước 3 · Kết nối bằng DBeaver (khuyến nghị cho người quen GUI)

Tải [DBeaver Community](https://dbeaver.io/download/), miễn phí, chạy trên Windows / macOS / Linux.

1. **Database → New Database Connection** (hoặc biểu tượng ổ cắm ở góc trên trái) → chọn **PostgreSQL** → Next.
2. Tab **Main**: điền Host `localhost`, Port `5433`, Database `sql_mastery`, Username `postgres`, Password `postgres`. Tick **Save password**.
3. Lần đầu DBeaver hỏi tải driver PostgreSQL → **Download**.
4. Bấm **Test Connection**. Phải thấy "Connected". Nếu báo _Connection refused_: container chưa chạy (`docker compose ps`) hoặc sai cổng.
5. **Đặt schema mặc định là `shop`** để gõ `SELECT * FROM products` thay vì `shop.products`: trong cùng hộp thoại, tab **Connection settings → Initialization** → mục **Bootstrap queries** → Add → nhập:
   ```sql
   SET search_path TO shop, public
   ```
   Cách khác: sau khi kết nối, trên toolbar chọn ô schema (mặc định `public`) → đổi thành `shop`.
6. **Finish**. Trong cây bên trái mở `sql_mastery → Schemas → shop → Tables`, bạn thấy 12 bảng. Double-click một bảng → tab **Data** xem dữ liệu, tab **Properties → Columns / Constraints / Indexes** xem cấu trúc (tương đương `\d` trong psql).

Thao tác hay dùng khi học:

| Việc                                             | Cách làm trong DBeaver                                                                                                                                                                                                                                                 |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mở cửa sổ SQL                                    | chọn connection → **SQL Editor → Open SQL script** (Ctrl+])                                                                                                                                                                                                            |
| Chạy câu lệnh dưới con trỏ                       | **Ctrl+Enter**                                                                                                                                                                                                                                                         |
| Chạy cả script nhiều câu                         | **Alt+X**                                                                                                                                                                                                                                                              |
| Xem execution plan (phần EXPLAIN, file 03)       | đặt con trỏ vào query → **Ctrl+Shift+E** (Explain Execution Plan); dạng text thì gõ `EXPLAIN (ANALYZE, BUFFERS)` trước query và Ctrl+Enter                                                                                                                             |
| Xem giá trị thật thay vì "(null)"                | Preferences → Editors → Data Editor → tùy chỉnh hiển thị NULL                                                                                                                                                                                                          |
| Auto-commit                                      | mặc định **bật**. Với các bài về transaction (file 01 §3.4, file 03 tuần 8) tắt đi: toolbar → nút **Auto** đổi thành **Manual**, rồi dùng nút Commit / Rollback                                                                                                        |
| Mở **hai phiên độc lập** cho bài lock / deadlock | mở 2 SQL editor; ở mỗi editor bấm chuột phải tab → **Isolated connection** (hoặc trong Connection settings → SQL Editor → tick "Open separate connection for each editor"). Nếu không tách, hai tab dùng chung một connection và bạn sẽ không thấy hiện tượng chờ lock |
| Export kết quả                                   | chuột phải bảng kết quả → Export data → CSV / JSON                                                                                                                                                                                                                     |

## Bước 4 · Kết nối bằng psql (khuyến nghị cho phần EXPLAIN và lock)

psql là công cụ chính xác nhất khi cần dán output `EXPLAIN` hoặc tái hiện hai phiên tranh khoá. Hai cách:

**Cách A: dùng psql bên trong container** (không cần cài gì):

```bash
docker compose exec db psql -U postgres -d sql_mastery
```

**Cách B: psql cài trên máy** (`sudo apt install postgresql-client` / `brew install libpq` / trên Windows đi kèm bộ cài PostgreSQL):

```bash
psql "postgresql://postgres:postgres@localhost:5433/sql_mastery"
```

Việc đầu tiên trong mỗi phiên:

```
SET search_path TO shop, public;
\timing on
```

Để khỏi gõ lại, tạo file `~/.psqlrc` với hai dòng đó (không có dấu chấm phẩy sau `\timing on`).

Lệnh psql cần thuộc:

| Lệnh          | Ý nghĩa                                  |
| ------------- | ---------------------------------------- |
| `\dt`         | liệt kê bảng trong schema hiện tại       |
| `\d products` | cột, kiểu, ràng buộc, index, FK của bảng |
| `\di`         | liệt kê index                            |
| `\x`          | bật/tắt hiển thị dọc, tiện khi dòng dài  |
| `\e`          | mở editor để sửa query dài               |
| `\i file.sql` | chạy file SQL                            |
| `\q`          | thoát                                    |

**Mở hai phiên song song** (bài deadlock, FOR UPDATE, SKIP LOCKED ở file 03): mở hai terminal, mỗi terminal chạy lệnh psql ở trên. Đặt tên cho dễ theo dõi: `SET application_name = 'phien_A';`. Từ phiên thứ ba xem ai đang chờ ai:

```sql
SELECT pid, application_name, state, wait_event_type, pg_blocking_pids(pid) AS blocked_by, left(query, 60) AS query
FROM pg_stat_activity WHERE datname = 'sql_mastery' AND pid <> pg_backend_pid();
```

## Bước 5 · Kết nối bằng VS Code (nếu muốn ở trong editor)

Cài extension **PostgreSQL** (tác giả Chris Kolkman) hoặc **Database Client** (Weijan Chen). Thêm connection với cùng tham số ở Bước 2. Với Database Client, sau khi kết nối chọn schema `shop` trong cây. Phím `Ctrl+Enter` chạy câu lệnh. Phù hợp để làm bài tập; phần EXPLAIN và lock vẫn nên dùng psql.

TablePlus, DataGrip, pgAdmin đều dùng được với cùng tham số; tài liệu không mô tả riêng.

---

## Quy trình đối chiếu tài liệu với thực tế

Mỗi ví dụ trong file 01–03 có bảng "dữ liệu giả sử" thu nhỏ để bạn hình dung, và câu SQL chạy được trên seed thật. Hai thứ này khác nhau: **bảng giả sử là để hiểu, seed là để chạy**. Cách xác minh một mục:

1. **Chạy nguyên văn câu SQL trong tài liệu** trên seed. Nếu có `$1`, `$2`, thay bằng giá trị thật lấy từ DB, ví dụ:
   ```sql
   SELECT id FROM users WHERE role_id = 3 LIMIT 1;           -- lấy một user_id
   SELECT id FROM products WHERE deleted_at IS NULL LIMIT 1; -- lấy một product_id
   SELECT id FROM categories WHERE parent_id IS NULL LIMIT 1;-- lấy một category gốc
   ```
   Trong psql tiện hơn: `SELECT id AS uid FROM users LIMIT 1 \gset` rồi dùng `:'uid'` trong query.
2. **So sánh hình dạng kết quả** với bảng minh hoạ: cùng số cột, cùng ý nghĩa mỗi dòng, cùng cách NULL xuất hiện. Số liệu cụ thể sẽ khác vì seed lớn hơn và ngẫu nhiên.
3. **Tái tạo bảng giả sử thành dữ liệu thật** khi muốn thấy đúng con số trong tài liệu. Cách an toàn là làm trong một transaction rồi rollback, không làm bẩn seed:
   ```sql
   BEGIN;
   INSERT INTO brands (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'Brand Test');
   INSERT INTO products (id, name, brand_id, base_price, list_price)
   VALUES ('00000000-0000-0000-0000-0000000000a1', 'Áo thun A', '00000000-0000-0000-0000-000000000001', 100, 150);
   INSERT INTO skus (product_id, sku_code, price, stock) VALUES
     ('00000000-0000-0000-0000-0000000000a1', 'AO-A-S', 100, 5),
     ('00000000-0000-0000-0000-0000000000a1', 'AO-A-M', 120, 0),
     ('00000000-0000-0000-0000-0000000000a1', 'AO-A-L', 120, 3);
   -- chạy query của tài liệu ở đây, ví dụ ví dụ nhân dòng ở file 00
   SELECT p.name, s.sku_code, s.price FROM products p LEFT JOIN skus s ON s.product_id = p.id
   WHERE p.id = '00000000-0000-0000-0000-0000000000a1';
   ROLLBACK;   -- mọi thứ biến mất, seed nguyên vẹn
   ```
   Trong DBeaver phải ở chế độ Manual commit (Bước 3) thì `ROLLBACK` mới có tác dụng.
4. **Với phần EXPLAIN** (file 03): số ms và số block trong tài liệu là của máy tác giả; trên máy bạn khác, nhưng **loại node** (Seq Scan, Index Scan, Nested Loop…) và **hướng thay đổi** trước/sau khi tạo index phải giống. Đó là thứ cần đối chiếu.
5. **Với phần hai phiên** (file 03 tuần 8, 9): làm đúng thứ tự trong bảng Phiên A / Phiên B của tài liệu. Phiên nào tài liệu ghi "chờ" thì terminal đó sẽ đứng im cho tới khi phiên kia COMMIT / ROLLBACK. Thông báo lỗi (`deadlock detected`, `could not serialize access…`) phải giống nguyên văn.

Tìm được chỗ tài liệu nói khác thực tế: ghi lại query, kết quả, phiên bản Postgres (`SELECT version();`) và sửa tài liệu. Đây chính là cách tài liệu được kiểm chứng trước khi bạn đọc nó.

## Reset, dừng, xoá

```bash
docker compose stop            # tắt, giữ dữ liệu; bật lại: docker compose start
docker compose down            # xoá container, GIỮ volume dữ liệu
docker compose down -v         # xoá cả dữ liệu; lần up -d tiếp theo seed lại từ đầu (10–20 giây)
```

Làm bẩn seed mà không nhớ đã sửa gì → `down -v` rồi `up -d`. Đây là cách reset nhanh nhất, rẻ hơn mọi cách dọn tay.

Nạp lại schema mà không xoá container (ví dụ khi bạn sửa `schema.sql`):

```bash
docker compose exec -T db psql -U postgres -d sql_mastery < schema.sql
```

`schema.sql` bắt đầu bằng `DROP SCHEMA IF EXISTS shop CASCADE`, nên chạy lại là làm mới toàn bộ.

## Sự cố thường gặp

| Triệu chứng                              | Nguyên nhân / cách xử lý                                                                                                                            |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `port is already allocated` khi `up`     | cổng 5433 đang bị chiếm; đổi `"5433:5432"` thành `"5434:5432"` trong docker-compose.yml và dùng cổng mới ở mọi công cụ                              |
| `relation "products" does not exist`     | chưa `SET search_path TO shop` hoặc chưa chọn schema `shop` trong GUI; hoặc gõ `shop.products`                                                      |
| DBeaver: _Connection refused_            | container chưa chạy: `docker compose ps`; trong WSL, đảm bảo Docker Desktop đã bật WSL integration                                                  |
| Seed chạy xong nhưng `order_items` = 0   | xem log `docker compose logs db`, tìm dòng ERROR; thường do sửa schema.sql sai. `down -v` rồi `up -d`                                               |
| Query "chờ mãi không xong"               | một phiên khác đang giữ lock (bạn quên COMMIT ở tab kia). Chạy query `pg_stat_activity` ở Bước 4 để tìm, hoặc `SELECT pg_terminate_backend(<pid>);` |
| DBeaver hai tab không thấy nhau chờ lock | hai tab dùng chung connection; bật Isolated connection (Bước 3)                                                                                     |
| Số liệu EXPLAIN khác tài liệu            | bình thường; đối chiếu loại node và hướng thay đổi, không đối chiếu ms                                                                              |

Xong bước này, quay lại [README.md](README.md) và bắt đầu tuần 0.
