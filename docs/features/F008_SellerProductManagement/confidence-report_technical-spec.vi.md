---
source_artifact: docs/features/F008_SellerProductManagement/technical-spec.md
claims_total: 19
claims_with_evidence: 18
confidence_derived: 0.9474
generated_by: derive_confidence_report.py
---

# Báo cáo độ tin cậy -- docs/features/F008_SellerProductManagement/technical-spec.md

> **Chỉ số độ phủ trích dẫn tự báo cáo -- KHÔNG phải kiểm chứng tính đúng đắn.** Báo cáo này được tạo tự động bằng cách phân tích các trích dẫn `**Source:** file:line` và các tag đánh dấu `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` ngay trong artifact. Nó KHÔNG xác minh trích dẫn có chính xác hay khẳng định có đúng hay không. Để kiểm chứng độc lập, xem `claude/skills/audit-doc-parity/`.

## Khẳng định ↔ Bằng chứng

Chú giải: `○` = có trích dẫn (có Source file:line) · `△` = gắn tag đánh dấu (chưa chắc chắn, không có trích dẫn).

| Khẳng định | Mục | Bằng chứng (file:line) | Trạng thái ○/△ |
|---|---|---|---|
| → | 3. Actions | src/routes/product/manage-product/manage-product.controller.ts:49-65 | ○ |
| → | 3. Actions | src/routes/product/manage-product/manage-product.service.ts:31-48 | ○ |
| → | 3. Actions | src/routes/product/manage-product/manage-product.service.ts:50-119 | ○ |
| → | 3. Actions | src/routes/product/manage-product/manage-product.controller.ts:74-95 | ○ |
| → | 3. Actions | src/routes/product/manage-product/manage-product.service.ts:121-144 | ○ |
| → | 3. Actions | src/routes/product/manage-product/manage-product.controller.ts:104-115 | ○ |
| → | 3. Actions | src/routes/product/manage-product/manage-product.service.ts:185-232 | ○ |
| → | 3. Actions | src/routes/product/manage-product/manage-product.controller.ts:124-139 | ○ |
| → | 3. Actions | src/routes/product/manage-product/manage-product.service.ts:146-183 | ○ |
| → | 3. Actions | src/routes/product/manage-product/manage-product.controller.ts:154-167 | ○ |
| → | 3. Actions | src/routes/product/manage-product/manage-product.service.ts:234-263 | ○ |
| A4 \| Hai lần update đồng thời vào cùng danh sách SKU của một product \| Không thấy optimistic lock — lần `$t… | 3. Actions | — | △ |
| (khẳng định không có nhãn) | 4. Shared Foundation | src/shared/guards/access-token.guard.ts:56-99 | ○ |
| (khẳng định không có nhãn) | 4. Shared Foundation | initial-scripts/create-permission.ts:14-35 | ○ |
| (khẳng định không có nhãn) | 4. Shared Foundation | initial-scripts/create-permission.ts:149-192 | ○ |
| (khẳng định không có nhãn) | 4. Shared Foundation | src/routes/product/manage-product/manage-product.service.ts:31-48 | ○ |
| (khẳng định không có nhãn) | 4. Shared Foundation | src/dtos/product/product.validation.ts:15-46 | ○ |
| (khẳng định không có nhãn) | 4. Shared Foundation | src/dtos/product/product.validation.ts:62-96 | ○ |
| (khẳng định không có nhãn) | 4. Shared Foundation | src/repositories/product/product.repository.ts:183-198 | ○ |

## Thông tin còn thiếu

Các mục có khả năng chứa khẳng định `△` (gắn tag đánh dấu) cần kiểm tra -- chỉ mang tính tham khảo, không đảm bảo chính xác:

- 3. Actions: A4 \| Hai lần update đồng thời vào cùng danh sách SKU của một product \| Không thấy optimistic lock — lần `$t…

## Cảnh báo rủi ro

_(không có)_
</content>
