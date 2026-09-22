---
source_artifact: docs/features/F010_UserAccountAdministration/technical-spec.md
claims_total: 14
claims_with_evidence: 13
confidence_derived: 0.9286
generated_by: derive_confidence_report.py
---

# Báo cáo độ tin cậy -- docs/features/F010_UserAccountAdministration/technical-spec.md

> **Thống kê độ phủ trích dẫn tự báo cáo -- KHÔNG phải kiểm chứng độ chính xác.** Báo cáo này được suy ra một cách tất định bằng cách phân tích các trích dẫn nội tuyến `**Source:** file:line` và các thẻ đánh dấu `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` của chính artifact. Nó KHÔNG xác minh rằng trích dẫn chính xác hay khẳng định đúng. Để kiểm chứng độc lập, xem `claude/skills/audit-doc-parity/`.

## Khẳng định ↔ Bằng chứng

Chú giải: `○` = có trích dẫn (có Source file:line) · `△` = gắn thẻ đánh dấu (chưa chắc chắn, không có trích dẫn).

| Khẳng định | Mục | Bằng chứng (file:line) | Trạng thái ○/△ |
|---|---|---|---|
| → | 3. Hành động | src/routes/user/user.controller.ts:39-52 | ○ |
| → | 3. Hành động | src/routes/user/user.service.ts:55-98 | ○ |
| → | 3. Hành động | src/routes/user/user.controller.ts:54-73 | ○ |
| → | 3. Hành động | src/routes/user/user.service.ts:34-44 | ○ |
| → | 3. Hành động | src/routes/user/user.controller.ts:75-95 | ○ |
| → | 3. Hành động | src/routes/user/user.service.ts:108-147 | ○ |
| → | 3. Hành động | src/routes/user/user.controller.ts:97-124 | ○ |
| → | 3. Hành động | src/routes/user/user.service.ts:239-285 | ○ |
| → | 3. Hành động | src/routes/user/user.controller.ts:126-151 | ○ |
| → | 3. Hành động | src/routes/user/user.service.ts:295-345 | ○ |
| INACTIVE \| Cùng field, cùng hình dạng response như ACTIVE \| Không có — chấp nhận nguyên trạng; `` liệu có OTHER… | 4. Nền tảng chung | — | △ |
| (khẳng định không có nhãn) | 4. Nền tảng chung | src/shared/guards/access-token.guard.ts:56-122 | ○ |
| (khẳng định không có nhãn) | 4. Nền tảng chung | initial-scripts/create-permission.ts:14-35 | ○ |
| (khẳng định không có nhãn) | 4. Nền tảng chung | initial-scripts/create-permission.ts:149-192 | ○ |

## Thông tin còn thiếu

Các mục ứng viên cần kiểm tra khẳng định gắn thẻ `△` -- chỉ mang tính tham khảo, không phải căn cứ chính thức:

- 4. Nền tảng chung: INACTIVE \| Cùng field, cùng hình dạng response như ACTIVE \| Không có — chấp nhận nguyên trạng; `` liệu có OTHER…

## Cờ rủi ro

_(không có)_
</content>
