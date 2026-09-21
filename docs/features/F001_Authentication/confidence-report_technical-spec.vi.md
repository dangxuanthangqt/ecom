---
source_artifact: docs/features/F001_Authentication/technical-spec.md
claims_total: 33
claims_with_evidence: 33
confidence_derived: 1.0
generated_by: derive_confidence_report.py
---

# Báo cáo độ tin cậy -- docs/features/F001_Authentication/technical-spec.md

> **Số liệu độ phủ trích dẫn tự báo cáo -- KHÔNG phải là kiểm chứng độ chính xác.** Báo cáo này được tạo ra một cách xác định bằng cách parse các trích dẫn `**Source:** file:line` và các thẻ đánh dấu `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` ngay trong artifact. Nó KHÔNG kiểm chứng trích dẫn có đúng hay khẳng định có thật hay không. Muốn kiểm chứng độc lập, xem `claude/skills/audit-doc-parity/`.

## Khẳng định ↔ Bằng chứng

Chú giải: `○` = có trích dẫn (có Source file:line) · `△` = đánh dấu bằng marker (chưa chắc chắn, không có trích dẫn).

| Khẳng định | Mục | Bằng chứng (file:line) | Trạng thái ○/△ |
|---|---|---|---|
| (khẳng định không gắn nhãn) | 3. Actions | src/routes/auth/auth.controller.ts:68-76 | ○ |
| (khẳng định không gắn nhãn) | 3. Actions | src/routes/auth/auth.service.ts:105-134 | ○ |
| (khẳng định không gắn nhãn) | 3. Actions | src/repositories/user/user.repository.ts:22-58 | ○ |
| (khẳng định không gắn nhãn) | 3. Actions | src/routes/auth/auth.controller.ts:148-154 | ○ |
| (khẳng định không gắn nhãn) | 3. Actions | src/routes/auth/auth.service.ts:394-442 | ○ |
| (khẳng định không gắn nhãn) | 3. Actions | src/repositories/verification-code/verification-code.repository.ts:47-83 | ○ |
| (khẳng định không gắn nhãn) | 3. Actions | src/routes/auth/auth.controller.ts:85-100 | ○ |
| (khẳng định không gắn nhãn) | 3. Actions | src/routes/auth/auth.service.ts:145-234 | ○ |
| (khẳng định không gắn nhãn) | 3. Actions | src/repositories/device/device.repository.ts:28-58 | ○ |
| (khẳng định không gắn nhãn) | 3. Actions | src/routes/auth/auth.controller.ts:109-123 | ○ |
| (khẳng định không gắn nhãn) | 3. Actions | src/routes/auth/auth.service.ts:284-354 | ○ |
| (khẳng định không gắn nhãn) | 3. Actions | src/repositories/refresh-token/refresh-token.repository.ts:24-100 | ○ |
| (khẳng định không gắn nhãn) | 3. Actions | src/routes/auth/auth.controller.ts:132-139 | ○ |
| (khẳng định không gắn nhãn) | 3. Actions | src/routes/auth/auth.service.ts:362-385 | ○ |
| (khẳng định không gắn nhãn) | 3. Actions | src/repositories/device/device.repository.ts:60-96 | ○ |
| (khẳng định không gắn nhãn) | 3. Actions | src/routes/auth/auth.controller.ts:171-178 | ○ |
| (khẳng định không gắn nhãn) | 3. Actions | src/routes/auth/google.service.ts:49-67 | ○ |
| (khẳng định không gắn nhãn) | 3. Actions | src/routes/auth/auth.controller.ts:183-211 | ○ |
| (khẳng định không gắn nhãn) | 3. Actions | src/routes/auth/google.service.ts:76-156 | ○ |
| (khẳng định không gắn nhãn) | 3. Actions | src/repositories/device/device.repository.ts:28-58 | ○ |
| (khẳng định không gắn nhãn) | 3. Actions | src/routes/auth/auth.controller.ts:220-226 | ○ |
| (khẳng định không gắn nhãn) | 3. Actions | src/routes/auth/auth.service.ts:453-493 | ○ |
| (khẳng định không gắn nhãn) | 3. Actions | src/repositories/verification-code/verification-code.repository.ts:47-83 | ○ |
| → `src/repositories/user/user.repository.ts` | 3. Actions | src/routes/auth/auth.controller.ts:228-261 | ○ |
| → `src/repositories/user/user.repository.ts` | 3. Actions | src/routes/auth/auth.service.ts:502-608 | ○ |
| (khẳng định không gắn nhãn) | 4. Shared Foundation | src/repositories/refresh-token/refresh-token.repository.ts:24-100 | ○ |
| · route-list.md PERM001-PERM003 | 4. Shared Foundation | src/shared/modules/base.module.ts:39-42 | ○ |
| · route-list.md PERM001-PERM003 | 4. Shared Foundation | src/shared/guards/access-token.guard.ts:22-123 | ○ |
| (khẳng định không gắn nhãn) | 4. Shared Foundation | src/repositories/role/shared-role.repository.ts:25-47 | ○ |
| (khẳng định không gắn nhãn) | 4. Shared Foundation | src/routes/auth/auth.service.ts:67-96 | ○ |
| (cập nhật A4) | 4. Shared Foundation | src/routes/auth/auth.service.ts:219-224 | ○ |
| (cập nhật A4) | 4. Shared Foundation | src/routes/auth/auth.service.ts:326-334 | ○ |
| (khẳng định không gắn nhãn) | 4. Shared Foundation | src/routes/auth/google.service.ts:32-156 | ○ |

## Thông tin còn thiếu

Các mục ứng viên cần kiểm tra thẻ `△` (đánh dấu bằng marker) -- chỉ mang tính tham khảo, không phải căn cứ chính thức:

_(không có -- không có khẳng định nào gắn marker)_

## Cờ cảnh báo rủi ro

_(không có)_
</content>
