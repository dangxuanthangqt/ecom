---
source_artifact: docs/generated/permissions-matrix.md
claims_total: 3
claims_with_evidence: 0
confidence_derived: 0.0
generated_by: derive_confidence_report.py
---

# Báo cáo độ tin cậy -- docs/generated/permissions-matrix.md

> **Số liệu phạm vi trích dẫn tự báo cáo -- KHÔNG phải xác minh tính đúng đắn.** Báo cáo này được tạo tự động bằng cách phân tích các trích dẫn `**Source:** file:line` nội tuyến của artifact và các tag `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]`. Nó KHÔNG xác minh trích dẫn có chính xác hay các khẳng định có đúng hay không. Muốn xác minh độc lập, xem `claude/skills/audit-doc-parity/`.

## Khẳng định ↔ Bằng chứng

Chú giải: `○` = có trích dẫn (có `**Source:** file:line`) · `△` = gắn tag (chưa chắc chắn, không có trích dẫn).

| Khẳng định | Mục | Bằng chứng (file:line) | Trạng thái ○/△ |
|---|---|---|---|
| Điều này nghĩa là tập quyền của một role chỉ mới bằng lần chạy script gần nhất (có i… | PERM004_DynamicPermissionSeeding: Permission rows generated from the live route table | — | △ |
| `AuthorizationHeaderGuard` hỗ trợ `AuthorizationType.API_KEY` (chuyển sang `ApiKeyGuard`, cái… | PERM009_ApiKeyGuardUnused: Alternate API-key auth path exists but unwired | — | △ |
| `GET /brands/:id` (ROUTE012) được gắn `@ApiPublic` (decorator chỉ để hiện trong Swagger doc, PERM002)… | PERM010_BrandByIdDocDrift: `GET /brands/:id` public-doc vs Bearer-runtime mismatch | — | △ |

## Thông tin còn thiếu

Các mục nên kiểm tra thêm cho những khẳng định gắn tag `△` -- chỉ là gợi ý, không phải kết luận chính thức:

- PERM004_DynamicPermissionSeeding: Permission rows generated from the live route table: Điều này nghĩa là tập quyền của một role chỉ mới bằng lần chạy script gần nhất (có i…
- PERM009_ApiKeyGuardUnused: Alternate API-key auth path exists but unwired: `AuthorizationHeaderGuard` hỗ trợ `AuthorizationType.API_KEY` (chuyển sang `ApiKeyGuard`, cái…
- PERM010_BrandByIdDocDrift: `GET /brands/:id` public-doc vs Bearer-runtime mismatch: `GET /brands/:id` (ROUTE012) được gắn `@ApiPublic` (decorator chỉ để hiện trong Swagger doc, PERM002)…

## Cờ cảnh báo rủi ro

- Phạm vi trích dẫn thấp (0%) -- hầu hết khẳng định chỉ gắn tag, không có trích dẫn.
