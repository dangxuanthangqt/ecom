---
source_artifact: docs/generated/user-stories.md
claims_total: 7
claims_with_evidence: 0
confidence_derived: 0.0
generated_by: derive_confidence_report.py
---

# Báo cáo độ tin cậy -- docs/generated/user-stories.md

> **Thống kê phạm vi trích dẫn tự báo cáo -- KHÔNG phải xác minh tính đúng đắn.** Báo cáo này sinh ra tự động bằng cách quét các trích dẫn `**Source:** file:line` và các thẻ đánh dấu `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` ngay trong tài liệu gốc. Nó KHÔNG kiểm tra trích dẫn có chính xác hay khẳng định có đúng hay không. Muốn xác minh độc lập, xem `claude/skills/audit-doc-parity/`.

## Khẳng định ↔ Bằng chứng

Chú thích: `○` = có trích dẫn (có Source file:line) · `△` = đánh dấu marker (chưa chắc, không có trích dẫn).

| Khẳng định | Phần | Bằng chứng (file:line) | Trạng thái ○/△ |
|---|---|---|---|
| với `admin` là tác nhân duy nhất; `client` write-access đến hai mô-đun đó là `` và | Lời mở đầu | — | △ |
| AC: `` Swagger đánh nhãn này `@ApiPublic` nhưng nó không mang `@IsPublicApi()` — runtime yêu cầu Bea… | Thương hiệu | — | △ |
| AC: `` mỗi mâu thuẫn nguồn được lưu ý ở trên — liệu `client` cũng có thể gọi điều này không được giải quyết; trên… | Thương hiệu | — | △ |
| AC: Giống `` cảnh báo client-access như US012. | Thương hiệu | — | △ |
| AC: Giống `` cảnh báo client-access như US012. | Thương hiệu | — | △ |
| AC: Tải trọng hợp lệ tạo hàng `Category` mới. `` cảnh báo client-access giống như thương hiệu. | Danh mục | — | △ |
| AC: Tạo hàng `Permission`. AC: `` điều này có thể được ghi đè bởi lần chạy tiếp theo của script sync BL001 của… | Quyền (mô-đun chỉ admin) | — | △ |

## Thông tin bị thiếu

Các phần nên rà lại vì có khẳng định đánh dấu `△` -- chỉ mang tính tham khảo, không phải kết luận chính thức:

- Lời mở đầu: với `admin` là tác nhân duy nhất; `client` write-access đến hai mô-đun đó là `` và
- Thương hiệu: AC: `` Swagger đánh nhãn này `@ApiPublic` nhưng nó không mang `@IsPublicApi()` — runtime yêu cầu Bea…
- Thương hiệu: AC: `` mỗi mâu thuẫn nguồn được lưu ý ở trên — liệu `client` cũng có thể gọi điều này không được giải quyết; trên…
- Thương hiệu: AC: Giống `` cảnh báo client-access như US012.
- Thương hiệu: AC: Giống `` cảnh báo client-access như US012.
- Danh mục: AC: Tải trọng hợp lệ tạo hàng `Category` mới. `` cảnh báo client-access giống như thương hiệu.
- Quyền (mô-đun chỉ admin): AC: Tạo hàng `Permission`. AC: `` điều này có thể được ghi đè bởi lần chạy tiếp theo của script sync BL001 của…

## Cờ rủi ro

- Phạm vi trích dẫn thấp (0%) -- hầu hết khẳng định chỉ đánh dấu marker, không có trích dẫn.
