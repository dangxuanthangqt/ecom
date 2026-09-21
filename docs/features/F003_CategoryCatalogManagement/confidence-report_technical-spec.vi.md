---
source_artifact: docs/features/F003_CategoryCatalogManagement/technical-spec.md
claims_total: 19
claims_with_evidence: 16
confidence_derived: 0.8421
generated_by: derive_confidence_report.py
---

# Báo cáo độ tin cậy -- docs/features/F003_CategoryCatalogManagement/technical-spec.md

> **Chỉ số độ phủ trích dẫn tự báo cáo -- KHÔNG phải kiểm chứng độ đúng.** Báo cáo này được suy ra một cách xác định bằng cách phân tích các trích dẫn inline `**Source:** file:line` và các thẻ đánh dấu `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` của chính artifact. Nó KHÔNG kiểm chứng trích dẫn có chính xác hay khẳng định có đúng hay không. Để kiểm chứng độc lập, xem `claude/skills/audit-doc-parity/`.

## Khẳng định ↔ Bằng chứng

Chú giải: `○` = có trích dẫn (có Source file:line) · `△` = có đánh dấu thẻ (chưa chắc chắn, không có trích dẫn).

| Khẳng định | Mục | Bằng chứng (file:line) | Trạng thái ○/△ |
|---|---|---|---|
| → | 3. Actions | src/routes/category/category.controller.ts:46-61 | ○ |
| → | 3. Actions | src/routes/category/category.service.ts:25-38 | ○ |
| → | 3. Actions | src/routes/category/category.controller.ts:79-89 | ○ |
| → | 3. Actions | src/routes/category/category.service.ts:47-60 | ○ |
| 422 `"Category is already exists."` khi bắt được vi phạm unique-constraint — `` hiện tại | 3. Actions | — | △ |
| → | 3. Actions | src/routes/category/category.controller.ts:99-109 | ○ |
| → | 3. Actions | src/routes/category/category.service.ts:69-85 | ○ |
| with this name already exists."` khi bắt được vi phạm unique-constraint — `` hiện tại | 3. Actions | — | △ |
| → | 3. Actions | src/routes/category/category.controller.ts:125-138 | ○ |
| → | 3. Actions | src/routes/category/category.service.ts:95-114 | ○ |
| → | 3. Actions | src/routes/category/category.controller.ts:154-165 | ○ |
| → | 3. Actions | src/routes/category/category.service.ts:122-134 | ○ |
| A3, A4 \| Prisma báo unique-constraint violation khi ghi category \| 422 `"Category is alr… | 3. Actions | — | △ |
| · | 4. Shared Foundation | src/shared/guards/access-token.guard.ts:56-99 | ○ |
| (khẳng định không có nhãn) | 4. Shared Foundation | src/repositories/category/category.repository.ts:99-116 | ○ |
| · | 4. Shared Foundation | src/repositories/category/category.repository.ts:40-49 | ○ |
| · | 4. Shared Foundation | src/repositories/category/category.repository.ts:76-79 | ○ |
| · | 4. Shared Foundation | src/repositories/category/category.repository.ts:254-263 | ○ |
| (khẳng định không có nhãn) | 4. Shared Foundation | src/selectors/category.selector.ts:13-26 | ○ |

## Thông tin còn thiếu

Các mục nên kiểm tra thêm cho khẳng định có đánh dấu `△` -- chỉ mang tính tham khảo, không phải căn cứ chính thức:

- 3. Actions: 422 `"Category is already exists."` khi bắt được vi phạm unique-constraint — `` hiện tại
- 3. Actions: with this name already exists."` khi bắt được vi phạm unique-constraint — `` hiện tại
- 3. Actions: A3, A4 \| Prisma báo unique-constraint violation khi ghi category \| 422 `"Category is alr…

## Cờ rủi ro

_(không có)_
</content>
