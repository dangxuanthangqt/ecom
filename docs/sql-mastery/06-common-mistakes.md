# 06 · 20 lỗi senior hay bắt khi review SQL của dev từ ORM sang

Đọc ngay tuần 1, đọc lại cuối mỗi giai đoạn. Mỗi mục: triệu chứng → nguyên nhân → sửa. Ví dụ theo schema mẫu [schema.sql](schema.sql). Dùng làm checklist tự review trước khi tạo PR.

## A. Sai kết quả (nguy hiểm nhất vì test nhỏ vẫn pass)

**1. Nhân dòng khi JOIN 1-n rồi aggregate.**
Triệu chứng: `SUM(stock)` gấp 5 lần thực tế khi product có 5 review.

```sql
-- SAI
SELECT p.id, SUM(s.stock), AVG(r.rating)
FROM products p LEFT JOIN skus s ON s.product_id = p.id LEFT JOIN reviews r ON r.product_id = p.id
GROUP BY p.id;
```

Sửa: gom từng bảng con bằng CTE rồi JOIN (file 02 §4.1), hoặc `COUNT(DISTINCT)` khi chỉ đếm.

**2. LEFT JOIN thành INNER JOIN vì đặt điều kiện ở WHERE.**
Triệu chứng: product không có sku biến mất khỏi listing khi thêm `WHERE s.stock > 0`. Sửa: điều kiện bảng bên phải đặt trong `ON`.

**3. `NOT IN (subquery)` với cột nullable → 0 dòng.**
`WHERE id NOT IN (SELECT sku_id FROM order_items)` với `sku_id` nullable. Sửa: `NOT EXISTS`.

**4. Quên `deleted_at IS NULL`, nhất là trên bảng JOIN vào.**
Triệu chứng: sản phẩm đã xoá vẫn tính vào doanh thu / còn hàng. Sửa: mọi bảng soft delete, mọi chỗ, cả trong ON. Cân nhắc view `active_products` để khỏi quên.

**5. Phân trang không có khoá phụ duy nhất trong ORDER BY.**
Triệu chứng: trang 2 lặp dòng trang 1 khi nhiều dòng cùng `created_at`. Sửa: `ORDER BY created_at DESC, id DESC`.

**6. Lệch ngày vì múi giờ.**
Triệu chứng: đơn đặt 23:30 ngày 30 hiện trong báo cáo ngày 1. Sửa: `AT TIME ZONE 'Asia/Ho_Chi_Minh'` ngay trong query, cột kiểu `timestamptz`.

**7. Tiền bằng float.**
Triệu chứng: tổng lệch vài đồng, `0.1 + 0.2`. Sửa: `numeric` hoặc số nguyên đơn vị nhỏ nhất. Kiểm tra schema ORM của dự án: `Float` trong Prisma là `double precision`.

**8. Read-then-write không lock → bán quá tồn.**
Triệu chứng: stock âm hoặc hai đơn cùng lấy chiếc cuối. Sửa: `UPDATE ... WHERE stock >= n RETURNING`, hoặc `FOR UPDATE` (file 03 §8.3).

**9. `COUNT(*)` trả `bigint` → JSON serialize lỗi hoặc so sánh `=== 0` sai.**
Sửa: `COUNT(*)::int` trong SQL.

## B. Hiệu năng (pass ở dev, sập ở production)

**10. Bọc cột trong hàm ở WHERE.**
`date(created_at) = ...`, `lower(email) = ...` không có expression index. Sửa: viết khoảng, hoặc tạo expression index đúng biểu thức.

**11. OFFSET lớn.**
Trang 500 chậm gấp trăm lần trang 1. Sửa: keyset pagination.

**12. `SELECT *` trong code.**
Mất index-only scan, kéo cột text khổng lồ về app. Sửa: liệt kê cột.

**13. Scalar subquery trong SELECT chạy N lần.**
`(SELECT MIN(price) FROM skus WHERE product_id = p.id)` cho 10k product = 10k query con. Sửa: CTE gom trước + JOIN, hoặc LATERAL khi có index và N nhỏ.

**14. Index sai thứ tự cột hoặc thiếu partial.**
`(deleted_at, status)` không phục vụ `WHERE status = ...`. Sửa: cột selective lên đầu, `deleted_at IS NULL` làm điều kiện partial.

**15. N+1 ở tầng app.**
`for (const p of products) await repo.findSkus(p.id)`. Sửa: một query với `IN` / `ANY`, hoặc `include` của ORM, hoặc CTE.

**16. Tham số kiểu sai làm mất index.**
`id = $1` với `$1` là text trong khi cột uuid. Sửa: `$1::uuid`.

**17. Transaction dài, có I/O ngoài.**
Gọi HTTP payment gateway trong transaction → giữ lock hàng chục giây → deadlock, pool cạn. Sửa: transaction chỉ chứa SQL, ngắn, có timeout; outbox pattern cho việc ngoài.

## C. An toàn & bảo trì

**18. Nối chuỗi vào SQL.**
`query(\`... '${input}'\`)`= SQL injection. Sửa: tham số hoá (tagged template,`$1`), identifier qua whitelist.

**19. Migration khoá bảng.**
`CREATE INDEX` không `CONCURRENTLY`, `ADD COLUMN NOT NULL` không có bước backfill, `ALTER TYPE` trên bảng lớn. Sửa: file 03 §9.4.

**20. Raw SQL không có test trên DB thật.**
Mock ORM cho raw query = test chuỗi. Sửa: e2e với seed nhỏ, mỗi bẫy ở trên một test.

## Cách dùng file này khi review

Khi đọc một query (của mình hay của người khác), chạy qua 5 câu:

1. Mỗi dòng kết quả đại diện cho gì, có nhân dòng không? (1, 2)
2. NULL và soft delete đã xử lý hết chưa? (3, 4)
3. Sort / phân trang ổn định chưa? (5, 11)
4. Index nào sẽ được dùng, có gì phá index không? (10, 14, 16)
5. Nếu 2 request chạy cùng lúc thì sao? (8, 17)

Trả lời được 5 câu là query "qua cửa" review của senior.
