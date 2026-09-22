---
source_artifact: docs/features/F005_MediaAssetManagement/technical-spec.md
claims_total: 18
claims_with_evidence: 15
confidence_derived: 0.8333
generated_by: derive_confidence_report.py
---

# Báo cáo độ tin cậy -- docs/features/F005_MediaAssetManagement/technical-spec.md

> **Chỉ số độ phủ trích dẫn tự báo cáo -- KHÔNG phải kiểm chứng tính đúng đắn.** Báo cáo này được tạo tự động bằng cách phân tích các trích dẫn `**Source:** file:line` và các tag đánh dấu `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` ngay trong artifact. Nó KHÔNG xác minh trích dẫn có chính xác hay khẳng định có đúng hay không. Để kiểm chứng độc lập, xem `claude/skills/audit-doc-parity/`.

## Khẳng định ↔ Bằng chứng

Chú giải: `○` = có trích dẫn (có Source file:line) · `△` = gắn tag đánh dấu (chưa chắc chắn, không có trích dẫn).

| Khẳng định | Mục | Bằng chứng (file:line) | Trạng thái ○/△ |
|---|---|---|---|
| (khẳng định không có nhãn) | 3. Actions | src/routes/media/media.controller.ts:71-80 | ○ |
| (khẳng định không có nhãn) | 3. Actions | src/routes/media/media.service.ts:29-41 | ○ |
| (khẳng định không có nhãn) | 3. Actions | src/shared/services/s3.service.ts:75-185 | ○ |
| → | 3. Actions | src/routes/media/media.controller.ts:100-124 | ○ |
| → | 3. Actions | src/shared/pipes/array-images-validation.pipe.ts:21-172 | ○ |
| field-name không khớp — xem `functional-spec.md § 11` RISK-02:** interceptor | 3. Actions | — | △ |
| → | 3. Actions | src/routes/media/media.controller.ts:128-176 | ○ |
| → | 3. Actions | src/shared/pipes/multiple-images-validation.pipe.ts:21-134 | ○ |
| đảo ngược tên gọi/hành vi ở nhánh download — xem `functional-spec.md § 11` | 3. Actions | — | △ |
| → | 3. Actions | src/routes/media/media.controller.ts:187-192 | ○ |
| → | 3. Actions | src/routes/media/media.service.ts:114-135 | ○ |
| (khẳng định không có nhãn) | 3. Actions | src/routes/media/media.controller.ts:194-206 | ○ |
| (khẳng định không có nhãn) | 3. Actions | src/routes/media/media.service.ts:137-141 | ○ |
| (khẳng định không có nhãn) | 3. Actions | src/shared/services/s3.service.ts:469-496 | ○ |
| code không thể chạy tới (unreachable), không được nối vào route nào đang hoạt động:** `MediaService#uploadImageFromDisk` | 4. Shared Foundation | — | △ |
| · `route-list.md` ROUTE036-ROUTE040 | 4. Shared Foundation | initial-scripts/create-permission.ts:14-35 | ○ |
| · `route-list.md` ROUTE036-ROUTE040 | 4. Shared Foundation | initial-scripts/create-permission.ts:149-192 | ○ |
| (khẳng định không có nhãn) | 4. Shared Foundation | src/shared/services/s3.service.ts:1-709 | ○ |

## Thông tin còn thiếu

Các mục có khả năng chứa khẳng định `△` (gắn tag đánh dấu) cần kiểm tra -- chỉ mang tính tham khảo, không đảm bảo chính xác:

- 3. Actions: field-name không khớp — xem `functional-spec.md § 11` RISK-02:** interceptor
- 3. Actions: đảo ngược tên gọi/hành vi ở nhánh download — xem `functional-spec.md § 11`
- 4. Shared Foundation: code không thể chạy tới (unreachable), không được nối vào route nào đang hoạt động:** `MediaService#uploadImageFromDisk`

## Cảnh báo rủi ro

_(không có)_
</content>
