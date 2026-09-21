---
source_artifact: docs/features/F002_BrandCatalogManagement/technical-spec.md
claims_total: 30
claims_with_evidence: 21
confidence_derived: 0.7
generated_by: derive_confidence_report.py
---

# Báo cáo độ tin cậy -- docs/features/F002_BrandCatalogManagement/technical-spec.md

> **Chỉ số độ phủ trích dẫn tự báo cáo -- KHÔNG phải kiểm chứng tính đúng đắn.** Báo cáo này được tạo tự động bằng cách phân tích các trích dẫn `**Source:** file:line` và các tag đánh dấu `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` ngay trong artifact. Nó KHÔNG xác minh trích dẫn có chính xác hay khẳng định có đúng hay không. Để kiểm chứng độc lập, xem `claude/skills/audit-doc-parity/`.

## Khẳng định ↔ Bằng chứng

Chú giải: `○` = có trích dẫn (có Source file:line) · `△` = gắn tag đánh dấu (chưa chắc chắn, không có trích dẫn).

| Khẳng định | Mục | Bằng chứng (file:line) | Trạng thái ○/△ |
|---|---|---|---|
| (khẳng định không có nhãn) | 3. Actions | src/routes/brand/brand.controller.ts:42-58 | ○ |
| (khẳng định không có nhãn) | 3. Actions | src/routes/brand/brand.service.ts:30-72 | ○ |
| (khẳng định không có nhãn) | 3. Actions | src/repositories/brand/brand.repository.ts:49-87 | ○ |
| Ai** · người gọi bất kỳ — **nhưng xem `` bên dưới: runtime thực ra yêu cầu phiên `Bearer`** | 3. Actions | — | △ |
| FR-602 ``** — handler này gắn `@ApiPublic` (decorator chỉ dùng cho Swagger-doc) nhưng | 3. Actions | — | △ |
| (khẳng định không có nhãn) | 3. Actions | src/routes/brand/brand.controller.ts:60-78 | ○ |
| (khẳng định không có nhãn) | 3. Actions | src/routes/brand/brand.service.ts:81-94 | ○ |
| (khẳng định không có nhãn) | 3. Actions | src/repositories/brand/brand.repository.ts:96-127 | ○ |
| BR-005 ``** — vì quyền cấp cho vai trò→module được lọc theo tên module | 3. Actions | — | △ |
| (khẳng định không có nhãn) | 3. Actions | src/routes/brand/brand.controller.ts:80-98 | ○ |
| (khẳng định không có nhãn) | 3. Actions | src/routes/brand/brand.service.ts:103-120 | ○ |
| (khẳng định không có nhãn) | 3. Actions | src/repositories/brand/brand.repository.ts:136-183 | ○ |
| BR-005 ``** — cùng phát hiện client có thể mutate như A3. *(§ 4.4)* | 3. Actions | — | △ |
| (khẳng định không có nhãn) | 3. Actions | src/routes/brand/brand.controller.ts:100-113 | ○ |
| (khẳng định không có nhãn) | 3. Actions | src/routes/brand/brand.service.ts:130-149 | ○ |
| (khẳng định không có nhãn) | 3. Actions | src/repositories/brand/brand.repository.ts:219-278 | ○ |
| BR-005 ``** — cùng phát hiện client có thể mutate như A3/A4. *(§ 4.4)* | 3. Actions | — | △ |
| (khẳng định không có nhãn) | 3. Actions | src/routes/brand/brand.controller.ts:115-130 | ○ |
| (khẳng định không có nhãn) | 3. Actions | src/routes/brand/brand.service.ts:159-175 | ○ |
| (khẳng định không có nhãn) | 3. Actions | src/repositories/brand/brand.repository.ts:288-331 | ○ |
| A5 \| Hard-delete một brand vẫn còn được `Product` tham chiếu (FK: `Product.brandId`) \| Prisma fore… | 3. Actions | — | △ |
| · route-list.md ROUTE011-ROUTE015 | 4. Shared Foundation | src/shared/guards/access-token.guard.ts:56-90 | ○ |
| · route-list.md ROUTE011-ROUTE015 | 4. Shared Foundation | src/shared/modules/base.module.ts:17-43 | ○ |
| (khẳng định không có nhãn) | 4. Shared Foundation | src/selectors/brand.selector.ts:12-27 | ○ |
| (khẳng định không có nhãn) | 4. Shared Foundation | src/repositories/brand/brand.repository.ts:191-209 | ○ |
| BR-005 `` — quyền cấp cho vai trò→module chỉ được lọc theo tên module, không bao giờ | 4. Shared Foundation | — | △ |
| áp dụng như nhau trên `/brands*`. `` liệu đây có phải là chủ đích để "client có thể curate brand | 4. Shared Foundation | — | △ |
| (khẳng định không có nhãn) | 4. Shared Foundation | initial-scripts/create-permission.ts:22-29 | ○ |
| (khẳng định không có nhãn) | 4. Shared Foundation | initial-scripts/create-permission.ts:158-169 | ○ |
| *(A2)* Hành vi yêu cầu `Bearer` trên `GET /brands/:id` được giả định là | 5. Verification & Technical Notes | — | △ |

## Thông tin còn thiếu

Các mục có khả năng chứa khẳng định `△` (gắn tag đánh dấu) cần kiểm tra -- chỉ mang tính tham khảo, không đảm bảo chính xác:

- 3. Actions: Ai** · người gọi bất kỳ — **nhưng xem `` bên dưới: runtime thực ra yêu cầu phiên `Bearer`**
- 3. Actions: FR-602 ``** — handler này gắn `@ApiPublic` (decorator chỉ dùng cho Swagger-doc) nhưng
- 3. Actions: BR-005 ``** — vì quyền cấp cho vai trò→module được lọc theo tên module
- 3. Actions: BR-005 ``** — cùng phát hiện client có thể mutate như A3. *(§ 4.4)*
- 3. Actions: BR-005 ``** — cùng phát hiện client có thể mutate như A3/A4. *(§ 4.4)*
- 3. Actions: A5 \| Hard-delete một brand vẫn còn được `Product` tham chiếu (FK: `Product.brandId`) \| Prisma fore…
- 4. Shared Foundation: BR-005 `` — quyền cấp cho vai trò→module chỉ được lọc theo tên module, không bao giờ
- 4. Shared Foundation: áp dụng như nhau trên `/brands*`. `` liệu đây có phải là chủ đích để "client có thể curate brand
- 5. Verification & Technical Notes: *(A2)* Hành vi yêu cầu `Bearer` trên `GET /brands/:id` được giả định là

## Cảnh báo rủi ro

_(không có)_
</content>
