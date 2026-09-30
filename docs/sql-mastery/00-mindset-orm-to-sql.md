# 00 · Tư duy: từ ORM sang SQL

## Vì sao dev quen ORM lại "đơ" khi gặp SQL tay

Không phải vì bạn thiếu kiến thức cú pháp. `SELECT`, `JOIN`, `WHERE` ai cũng đọc được. Vấn đề nằm ở **cách hình dung dữ liệu**:

| Tư duy ORM / FE                                                    | Tư duy SQL                                                        |
| ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Dữ liệu là **object có quan hệ**: `product.skus[0].price`          | Dữ liệu là **các bảng phẳng**, quan hệ chỉ là hai cột bằng nhau   |
| Xử lý **từng phần tử**: `for (const p of products) { ... }`        | Xử lý **cả tập hợp một lần**: một câu lệnh áp lên hàng triệu dòng |
| Mô tả **cách làm** (imperative): lấy product, rồi lấy sku, rồi lọc | Mô tả **kết quả muốn có** (declarative): DB tự chọn cách làm      |
| Lọc / sort / group ở tầng JS sau khi fetch                         | Lọc / sort / group ngay tại DB, chỉ trả về đúng thứ cần           |
| "Có bao nhiêu query" không quan trọng lắm                          | Số round-trip và lượng dữ liệu đi qua mạng là chi phí số một      |

ORM giấu bảng phẳng sau object graph, nên bạn chưa từng phải nghĩ "join xong thì mỗi dòng trông thế nào". Đó chính là chỗ cần rèn.

## Bài tập tư duy đầu tiên: JOIN nhân dòng

**Bối cảnh:** trong schema mẫu, `products` và `skus` là quan hệ **1-n**: một product ("Áo thun A") có nhiều biến thể để bán (size S, M, L), mỗi biến thể là một dòng trong `skus` mang `product_id` trỏ về product cha, kèm giá và tồn kho riêng. Trong ORM, quan hệ này thường khai báo kiểu `@OneToMany(() => Sku, sku => sku.product) skus` ở entity Product, và `@ManyToOne` ở entity Sku. Giả sử product `a1` có 3 sku.

Với một ORM bất kỳ bạn viết đại loại:

```ts
productRepo.find({ where: { id }, relations: { skus: true } });
```

và nhận về **1 product có mảng 3 sku**. SQL không có mảng. Query tương đương:

```sql
SELECT p.id, p.name, s.id AS sku_id, s.sku_code, s.price
FROM products p
LEFT JOIN skus s ON s.product_id = p.id
WHERE p.id = '...';
```

trả về **3 dòng, mỗi dòng lặp lại tên product**:

| id  | name      | sku_id | sku_code | price  |
| --- | --------- | ------ | -------- | ------ |
| a1  | Product 1 | s1     | SKU-…-1  | 120.00 |
| a1  | Product 1 | s2     | SKU-…-2  | 125.00 |
| a1  | Product 1 | s3     | SKU-…-3  | 130.00 |

ORM phải "gom" 3 dòng đó lại thành object cho bạn. Khi bạn tự viết SQL, bạn phải tự ý thức việc nhân dòng này, nếu không sẽ gặp lỗi kinh điển: đếm `COUNT(*)` sau khi join ra con số gấp 3 lần thực tế.

Hãy tự làm: trước khi viết bất kỳ JOIN nào, **vẽ ra giấy hình dạng của kết quả** (mỗi dòng gồm cột nào, một product xuất hiện mấy lần).

## Thứ tự thực thi logic của SELECT (quan trọng nhất file này)

Bạn _viết_ theo thứ tự này:

```sql
SELECT ... FROM ... JOIN ... WHERE ... GROUP BY ... HAVING ... ORDER BY ... LIMIT ...
```

Nhưng DB _hiểu_ theo thứ tự này:

1. `FROM` + `JOIN` → tạo ra một bảng lớn phẳng
2. `WHERE` → lọc từng dòng của bảng đó (chưa có nhóm, chưa có alias của SELECT)
3. `GROUP BY` → gom dòng thành nhóm
4. `HAVING` → lọc nhóm (được dùng hàm tổng hợp)
5. `SELECT` → tính các cột đầu ra, alias, window function
6. `DISTINCT`
7. `ORDER BY` → được dùng alias của SELECT
8. `LIMIT` / `OFFSET`

Nắm thứ tự này giải thích được 80% câu hỏi "vì sao lỗi":

- Vì sao `WHERE total > 100` báo lỗi khi `total` là alias trong SELECT? → WHERE chạy trước SELECT.
- Vì sao không dùng được `COUNT(*) > 1` trong WHERE? → chưa có nhóm ở bước WHERE, phải dùng HAVING.
- Vì sao `ORDER BY total` thì được? → ORDER BY chạy sau SELECT.
- Vì sao window function không lọc được bằng WHERE? → window tính ở bước SELECT, sau WHERE. Phải bọc trong subquery / CTE.

## Bảng dịch: thao tác ORM quen thuộc → SQL

**Bối cảnh:** các dòng dưới dùng `users` (mỗi user có một `role_id` trỏ sang `roles`, tức `users` → `roles` là n-1) và `products` → `skus` (1-n như trên). Cột trái viết theo phong cách TypeORM / Prisma, nhưng ORM nào cũng có thao tác tương đương.

| Bạn hay viết                                   | SQL thật sự chạy                                                        | Ghi chú                                                     |
| ---------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------- |
| `find({ where: { status: 'active' } })`        | `SELECT * FROM users WHERE status = 'active'`                           | `SELECT *` chỉ nên dùng khi debug                           |
| `findOne({ where: { id } })`                   | `... WHERE id = $1 LIMIT 1`                                             |                                                             |
| `find({ relations: { role: true } })`          | `LEFT JOIN roles r ON r.id = u.role_id`                                 | Prisma mặc định chạy **2 query** rồi ghép ở app, không JOIN |
| `find({ where: { role: { name: 'admin' } } })` | `INNER JOIN roles r ... WHERE r.name = 'admin'`                         | lọc theo bảng con → INNER JOIN hoặc EXISTS                  |
| `count({ where })`                             | `SELECT COUNT(*) FROM ... WHERE ...`                                    |                                                             |
| `find({ skip: 20, take: 10 })`                 | `LIMIT 10 OFFSET 20`                                                    | OFFSET lớn thì chậm, xem keyset pagination ở file 02        |
| `find({ order: { createdAt: 'DESC' } })`       | `ORDER BY created_at DESC`                                              | NULL đứng đầu khi DESC trong Postgres                       |
| `findMany({ include: { skus: true } })`        | 2 query: products, rồi `SELECT ... FROM skus WHERE product_id IN (...)` | đây là cách Prisma tránh nhân dòng                          |
| `groupBy({ by: ['status'], _count: true })`    | `SELECT status, COUNT(*) FROM orders GROUP BY status`                   |                                                             |
| `save(entity)` với entity có id                | `UPDATE ... WHERE id = $1` (TypeORM còn SELECT trước)                   |                                                             |
| `upsert`                                       | `INSERT ... ON CONFLICT (...) DO UPDATE SET ...`                        |                                                             |
| `softDelete()`                                 | `UPDATE ... SET deleted_at = now()`                                     | mọi query đọc phải nhớ `deleted_at IS NULL`                 |

**Bài tập ngay bây giờ**: bật log query của ORM bạn đang dùng (TypeORM: `logging: true`; Prisma: `log: ['query']`; Drizzle: `logger: true`), gọi 5 thao tác bất kỳ, chép SQL nó sinh ra vào một file và đọc từng dòng. Bạn sẽ ngạc nhiên vì lượng query mà một `include` lồng nhau sinh ra.

## Ba câu hỏi phải tự hỏi trước mỗi query

1. **Kết quả là bao nhiêu dòng, mỗi dòng "đại diện cho cái gì"?** Một dòng = một product? một sku? một cặp product–category? Nếu trả lời không được, bạn chưa sẵn sàng viết JOIN.
2. **Lọc ở đâu?** Trước khi group (WHERE) hay sau khi group (HAVING)? Lọc bảng con nên đặt trong `ON` của LEFT JOIN hay trong WHERE? (Đặt sai làm LEFT JOIN biến thành INNER JOIN, xem file 01.)
3. **DB dùng index nào để tìm dòng?** Câu này bạn chưa cần trả lời ngay, nhưng từ tuần 7 nó là câu bắt buộc.

## Vì sao phải học SQL khi đã có ORM

Trong dự án thật, ORM giải quyết tốt CRUD đơn giản. Những chỗ khó nhất của BE lại luôn rơi vào các điểm ORM yếu:

- **Báo cáo / dashboard**: doanh thu theo ngày, top sản phẩm, tỷ lệ huỷ đơn theo tháng → cần GROUP BY, window, CTE.
- **Phân trang trên bảng lớn**: OFFSET 100000 chậm, cần keyset pagination.
- **Tồn kho & race condition**: trừ stock khi nhiều người đặt cùng lúc → cần `SELECT ... FOR UPDATE`, atomic `UPDATE ... WHERE stock >= $1`, isolation level.
- **Search có điều kiện động**: filter theo category cây, brand, khoảng giá, có/không có hàng → cần EXISTS, recursive CTE, index đúng.
- **Migration dữ liệu** hàng triệu dòng, thêm cột NOT NULL không khoá bảng.
- **Query chậm trên production**: chỉ đọc được EXPLAIN mới sửa được.

Người viết được những thứ đó là người "gánh" dự án. Giáo trình này đưa bạn tới đó.

**Tiếp theo**: [01-foundation.md](01-foundation.md).
