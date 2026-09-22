---
source_artifact: docs/generated/feature-list.md
claims_total: 3
claims_with_evidence: 0
confidence_derived: 0.0
generated_by: derive_confidence_report.py
---

# Báo cáo độ tin cậy -- docs/generated/feature-list.md

> **Chỉ số độ phủ trích dẫn tự báo cáo -- KHÔNG phải kiểm chứng tính đúng đắn.** Báo cáo này được tạo tự động bằng cách phân tích các trích dẫn `**Source:** file:line` và các tag đánh dấu `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` ngay trong artifact. Nó KHÔNG xác minh trích dẫn có chính xác hay khẳng định có đúng hay không. Để kiểm chứng độc lập, xem `claude/skills/audit-doc-parity/`.

## Khẳng định ↔ Bằng chứng

Chú giải: `○` = có trích dẫn (có Source file:line) · `△` = gắn tag đánh dấu (chưa chắc chắn, không có trích dẫn).

| Khẳng định | Mục | Bằng chứng (file:line) | Trạng thái ○/△ |
|---|---|---|---|
| BL005_SendVerificationCodeEmail — `` điểm gọi hiện đang bị comment out (xem US005); được ghi trong tài liệu h… | Feature Details | — | △ |
| UserTranslation (MODEL003) — `` schema model hóa các trường dữ liệu hồ sơ theo từng ngôn ngữ (address/description) aga… | Feature Details | — | △ |
| Ngoài ra, `UserTranslation` (MODEL003) cũng không có route riêng; nó được liệt kê dưới F009 a… | Unexposed Schema-Only Models (not assigned to any Feature) | — | △ |

## Thông tin còn thiếu

Các mục có khả năng chứa khẳng định `△` (gắn tag đánh dấu) cần kiểm tra -- chỉ mang tính tham khảo, không đảm bảo chính xác:

- Feature Details: BL005_SendVerificationCodeEmail — `` điểm gọi hiện đang bị comment out (xem US005); được ghi trong tài liệu h…
- Feature Details: UserTranslation (MODEL003) — `` schema model hóa các trường dữ liệu hồ sơ theo từng ngôn ngữ (address/description) aga…
- Unexposed Schema-Only Models (not assigned to any Feature): Ngoài ra, `UserTranslation` (MODEL003) cũng không có route riêng; nó được liệt kê dưới F009 a…

## Cảnh báo rủi ro

- Độ phủ trích dẫn thấp (0%) -- phần lớn khẳng định được gắn tag đánh dấu, không có trích dẫn.
</content>
