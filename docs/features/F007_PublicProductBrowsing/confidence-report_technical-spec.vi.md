---
source_artifact: docs/features/F007_PublicProductBrowsing/technical-spec.md
claims_total: 15
claims_with_evidence: 15
confidence_derived: 1.0
generated_by: derive_confidence_report.py
---

# Báo cáo độ tin cậy -- docs/features/F007_PublicProductBrowsing/technical-spec.md

> **Chỉ số độ phủ trích dẫn tự báo cáo -- KHÔNG phải kiểm chứng tính đúng đắn.** Báo cáo này được tạo tự động bằng cách phân tích các trích dẫn `**Source:** file:line` và các tag đánh dấu `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` ngay trong artifact. Nó KHÔNG xác minh trích dẫn có chính xác hay khẳng định có đúng hay không. Để kiểm chứng độc lập, xem `claude/skills/audit-doc-parity/`.

## Khẳng định ↔ Bằng chứng

Chú giải: `○` = có trích dẫn (có Source file:line) · `△` = gắn tag đánh dấu (chưa chắc chắn, không có trích dẫn).

| Khẳng định | Mục | Bằng chứng (file:line) | Trạng thái ○/△ |
|---|---|---|---|
| (khẳng định không có nhãn) | 3. Actions | src/routes/product/product.controller.ts:35-44 | ○ |
| (khẳng định không có nhãn) | 3. Actions | src/routes/product/product.service.ts:18-79 | ○ |
| (khẳng định không có nhãn) | 3. Actions | src/repositories/product/product.repository.ts:46-132 | ○ |
| (khẳng định không có nhãn) | 3. Actions | src/routes/product/product.controller.ts:60-71 | ○ |
| (khẳng định không có nhãn) | 3. Actions | src/routes/product/product.service.ts:81-100 | ○ |
| (khẳng định không có nhãn) | 3. Actions | src/repositories/product/product.repository.ts:144-174 | ○ |
| · ROUTE051, ROUTE052 | 4. Shared Foundation | src/shared/param-decorators/auth-api.decorator.ts:10-19 | ○ |
| (khẳng định không có nhãn) | 4. Shared Foundation | src/routes/product/product.service.ts:59 | ○ |
| (khẳng định không có nhãn) | 4. Shared Foundation | src/repositories/product/product.repository.ts:85-98 | ○ |
| (khẳng định không có nhãn) | 4. Shared Foundation | src/routes/product/product.service.ts:88-93 | ○ |
| (khẳng định không có nhãn) | 4. Shared Foundation | src/selectors/product.selector.ts:10-22 | ○ |
| (khẳng định không có nhãn) | 4. Shared Foundation | src/selectors/product.selector.ts:41-65 | ○ |
| (khẳng định không có nhãn) | 4. Shared Foundation | src/selectors/brand.selector.ts:13-27 | ○ |
| (khẳng định không có nhãn) | 4. Shared Foundation | src/selectors/product.selector.ts:60-63 | ○ |
| (khẳng định không có nhãn) | 4. Shared Foundation | src/selectors/category.selector.ts:6-10 | ○ |

## Thông tin còn thiếu

Các mục có khả năng chứa khẳng định `△` (gắn tag đánh dấu) cần kiểm tra -- chỉ mang tính tham khảo, không đảm bảo chính xác:

_(không có -- không có khẳng định nào gắn tag đánh dấu)_

## Cảnh báo rủi ro

_(không có)_
</content>
