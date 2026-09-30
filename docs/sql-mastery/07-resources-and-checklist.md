# 07 · Tài nguyên và checklist tự đánh giá

## Tài nguyên theo giai đoạn

### Luyện tay (mọi giai đoạn)

- [pgexercises.com](https://pgexercises.com) — bài tập Postgres từ SELECT tới window/recursive, chấm ngay. Làm hết là xong nền tảng.
- [SQLBolt](https://sqlbolt.com) — nếu cần ôn cú pháp từ đầu, 1 buổi.
- [LeetCode Database](https://leetcode.com/problemset/database/) — Medium/Hard là bài top-N, gap, window rất sát phỏng vấn và thực tế.
- [Use The Index, Luke](https://use-the-index-luke.com) — sách online miễn phí về index, đọc ở tuần 7. Ngắn, đúng trọng tâm, có phần riêng cho Postgres.

### Sách

| Sách                                                                                                                                                                                                                                                                                                           | Đọc khi  | Vì sao                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------- |
| _SQL Antipatterns_ (Bill Karwin)                                                                                                                                                                                                                                                                               | tuần 3–6 | Mỗi chương một lỗi thiết kế / query kinh điển, đúng những gì dev ORM hay mắc |
| _The Art of PostgreSQL_ (Dimitri Fontaine)                                                                                                                                                                                                                                                                     | tuần 4–9 | Dạy nghĩ "để DB làm việc", nhiều ví dụ window, CTE, LATERAL                  |
| PostgreSQL docs: [Queries](https://www.postgresql.org/docs/current/queries.html), [Indexes](https://www.postgresql.org/docs/current/indexes.html), [Concurrency Control](https://www.postgresql.org/docs/current/mvcc.html), [Performance Tips](https://www.postgresql.org/docs/current/performance-tips.html) | tuần 7–9 | Docs Postgres viết rất tốt; chương MVCC là bắt buộc                          |
| _Designing Data-Intensive Applications_ (Kleppmann), chương 7 Transactions                                                                                                                                                                                                                                     | tuần 8   | Hiểu isolation level, write skew, lost update ở mức bản chất                 |

### Tool

- [explain.dalibo.com](https://explain.dalibo.com) / [explain.depesz.com](https://explain.depesz.com) — dán `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` để nhìn plan trực quan.
- `pg_stat_statements` — bật trên DB dev để thấy query nào ORM sinh ra nhiều nhất.
- [Prisma raw queries docs](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries) — phần `Prisma.sql`, `Prisma.join`, type mapping.
- [Drizzle docs](https://orm.drizzle.team/docs/select) — đọc mục Select, Joins, Magic sql operator, Set operations.
- [TypeORM QueryBuilder docs](https://typeorm.io/select-query-builder) — đặc biệt mục "Using pagination" để hiểu `take` vs `limit`.
- [Postgres wiki: Don't Do This](https://wiki.postgresql.org/wiki/Don%27t_Do_This) — danh sách ngắn những thứ đừng dùng (timestamp không tz, char(n), money…).
- [Testcontainers](https://testcontainers.com) — Postgres thật trong test, bỏ mock.

## Checklist "đã master SQL để vào dự án khó chưa"

Tick trung thực. ≥ 80% là sẵn sàng nhận task nặng SQL trong dự án thật; dưới đó quay lại giai đoạn tương ứng.

### Đọc & viết

- [ ] Nhìn một query 40 dòng có 3 CTE, nói được trong 1 phút mỗi dòng kết quả đại diện cho gì.
- [ ] Viết top-N mỗi nhóm bằng 3 cách (DISTINCT ON, window, LATERAL) và chọn đúng theo dữ liệu.
- [ ] Viết anti-join, semi-join không dùng NOT IN / DISTINCT.
- [ ] Viết báo cáo theo ngày/tuần/tháng không thiếu bucket trống, đúng múi giờ.
- [ ] Viết keyset pagination 2 cột, có cursor mã hoá, có index tương ứng.
- [ ] Viết upsert hàng loạt một round-trip với `unnest` / `jsonb_to_recordset`.
- [ ] Truy vấn và cập nhật JSONB, array, có index GIN.
- [ ] Viết recursive CTE cho cây, có chặn vòng lặp.

### Hiệu năng

- [ ] Đọc `EXPLAIN ANALYZE`, chỉ ra node tốn nhất kể cả khi có `loops`.
- [ ] Nói được 6 lý do index có mà không được dùng, và sửa từng cái.
- [ ] Thiết kế composite / partial / covering / expression index cho một query cụ thể, biết chi phí ghi.
- [ ] Dùng `pg_stat_statements` tìm top 5 query tốn thời gian trên một DB lạ.
- [ ] Phân biệt Nested Loop / Hash Join / Merge Join và khi nào planner chọn sai.

### Đồng thời & giao dịch

- [ ] Giải thích MVCC và vì sao reader không chặn writer.
- [ ] Nói được sự khác nhau của 3 isolation level bằng ví dụ tồn kho.
- [ ] Trừ tồn kho an toàn bằng ≥ 2 cách; giải thích `FOR UPDATE` vs `FOR NO KEY UPDATE`.
- [ ] Tái hiện một deadlock có chủ đích, rồi sửa bằng thứ tự khoá.
- [ ] Viết job queue bằng `SKIP LOCKED` và biết khi nào dùng thay vì Redis queue.

### Vận hành & an toàn

- [ ] Thêm cột NOT NULL / index / FK vào bảng lớn không downtime.
- [ ] Backfill hàng chục triệu dòng theo batch không làm bloat.
- [ ] Không bao giờ nối chuỗi vào SQL; identifier động qua whitelist.
- [ ] Mọi raw query có test e2e trên DB thật cho từng bẫy đã biết.
- [ ] Biết DB của dự án backup thế nào trước khi chạy UPDATE/DELETE hàng loạt.

### Trong NestJS

- [ ] Viết raw query với điều kiện động tham số hoá, typed, validate output.
- [ ] Đọc và viết Drizzle select/join/sql template mà không cần tra docs quá 2 lần.
- [ ] Giải thích bug `limit()` vs `take()` của TypeORM khi có join 1-n.
- [ ] Hoàn thành đồ án cuối khoá (bài 30) và được review pass.

## Sau khi xong giáo trình

Bạn không "xong" SQL, bạn xong phần nền để tự học tiếp trong dự án. Ba việc giữ phong độ:

1. Mỗi tuần đọc plan của một query chậm nhất trong `pg_stat_statements` của dự án đang làm, dù không phải task của bạn.
2. Mỗi query ORM sinh ra mà bạn thấy lạ, chép về và viết lại bằng tay một cách tốt hơn.
3. Mỗi tháng đọc lại [06-common-mistakes.md](06-common-mistakes.md), thêm vào đó lỗi mới bạn gặp trong dự án. File này là của cả team.
