---
source_artifact: docs/features/F003_CategoryCatalogManagement/functional-spec.md
claims_total: 3
claims_with_evidence: 0
confidence_derived: 0.0
generated_by: derive_confidence_report.py
---

# Báo cáo độ tin cậy -- docs/features/F003_CategoryCatalogManagement/functional-spec.md

> **Số liệu phạm vi trích dẫn tự báo cáo -- KHÔNG phải xác minh tính đúng đắn.** Báo cáo này được tạo tự động bằng cách phân tích các trích dẫn `**Source:** file:line` nội tuyến của artifact và các tag `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]`. Nó KHÔNG xác minh trích dẫn có chính xác hay các khẳng định có đúng hay không. Muốn xác minh độc lập, xem `claude/skills/audit-doc-parity/`.

## Khẳng định ↔ Bằng chứng

Chú giải: `○` = có trích dẫn (có `**Source:** file:line`) · `△` = gắn tag (chưa chắc chắn, không có trích dẫn).

| Khẳng định | Mục | Bằng chứng (file:line) | Trạng thái ○/△ |
|---|---|---|---|
| RISK-02 \| known-issue \| Kiểm tra "category không được là parent của chính nó" khi update chỉ chặn một *dir… | 11. Rủi ro & Vấn đề đã biết | — | △ |
| RISK-03 \| risk \| Vì phần cấp quyền role→module chỉ lọc theo tên module, không bao giờ theo HTT… | 11. Rủi ro & Vấn đề đã biết | — | △ |
| RISK-04 \| known-issue \| Code Create/Update bắt lỗi vi phạm unique-constraint của database và trả về… | 11. Rủi ro & Vấn đề đã biết | — | △ |

## Thông tin còn thiếu

Các mục nên kiểm tra thêm cho những khẳng định gắn tag `△` -- chỉ là gợi ý, không phải kết luận chính thức:

- 11. Rủi ro & Vấn đề đã biết: RISK-02 \| known-issue \| Kiểm tra "category không được là parent của chính nó" khi update chỉ chặn một *dir…
- 11. Rủi ro & Vấn đề đã biết: RISK-03 \| risk \| Vì phần cấp quyền role→module chỉ lọc theo tên module, không bao giờ theo HTT…
- 11. Rủi ro & Vấn đề đã biết: RISK-04 \| known-issue \| Code Create/Update bắt lỗi vi phạm unique-constraint của database và trả về…

## Cờ cảnh báo rủi ro

- Phạm vi trích dẫn thấp (0%) -- hầu hết khẳng định chỉ gắn tag, không có trích dẫn.
