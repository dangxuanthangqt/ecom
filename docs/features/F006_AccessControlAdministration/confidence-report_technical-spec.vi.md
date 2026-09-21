---
source_artifact: docs/features/F006_AccessControlAdministration/technical-spec.md
claims_total: 50
claims_with_evidence: 47
confidence_derived: 0.94
generated_by: derive_confidence_report.py
---

# Báo cáo độ tin cậy -- docs/features/F006_AccessControlAdministration/technical-spec.md

> **Thống kê phạm vi trích dẫn tự báo cáo -- KHÔNG phải xác minh tính đúng đắn.** Báo cáo này được tạo ra theo cách xác định (deterministic), bằng cách phân tích các trích dẫn `**Source:** file:line` nội tuyến của artifact và các thẻ đánh dấu `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]`. Nó KHÔNG xác minh rằng các trích dẫn là chính xác hay các khẳng định là đúng sự thật. Để xác minh sự thật độc lập, xem `claude/skills/audit-doc-parity/`.

## Khẳng định ↔ Bằng chứng

Chú giải: `○` = trích dẫn (có `Source file:line`) · `△` = thẻ đánh dấu (không chắc chắn, không trích dẫn).

| Khẳng định | Phần | Bằng chứng (file:line) | Trạng thái ○/△ |
|---|---|---|---|
| (khẳng định không nhãn) | 3. Hành động | src/routes/permission/permission.controller.ts:36-49 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/routes/permission/permission.service.ts:26-56 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/repositories/permission/permission.repository.ts:29-72 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/routes/permission/permission.controller.ts:51-72 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/routes/permission/permission.service.ts:64-68 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/repositories/permission/permission.repository.ts:80-106 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/routes/permission/permission.controller.ts:74-92 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/routes/permission/permission.service.ts:77-97 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/repositories/permission/permission.repository.ts:114-189 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/routes/permission/permission.controller.ts:94-121 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/routes/permission/permission.service.ts:107-131 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/repositories/permission/permission.repository.ts:199-257 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/routes/permission/permission.controller.ts:123-150 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/routes/permission/permission.service.ts:141-157 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/repositories/permission/permission.repository.ts:267-319 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/routes/role/role.controller.ts:36-49 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/routes/role/role.service.ts:30-57 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/repositories/role/role.repository.ts:24-59 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/routes/role/role.controller.ts:58-72 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/routes/role/role.service.ts:66-70 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/repositories/role/role.repository.ts:67-90 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/routes/role/role.controller.ts:74-92 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/routes/role/role.service.ts:79-96 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/repositories/role/role.repository.ts:98-177 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/routes/role/role.controller.ts:94-121 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/routes/role/role.service.ts:104-152 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/repositories/role/role.repository.ts:98-246 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/routes/role/role.controller.ts:123-150 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/routes/role/role.service.ts:104-120 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/routes/role/role.service.ts:162-180 | ○ |
| (khẳng định không nhãn) | 3. Hành động | src/repositories/role/role.repository.ts:256-300 | ○ |
| (khẳng định không nhãn) | 3. Hành động | initial-scripts/create-permission.ts:37-147 | ○ |
| (khẳng định không nhãn) | 3. Hành động | initial-scripts/create-permission.ts:149-192 | ○ |
| (khẳng định không nhãn) | 3. Hành động | initial-scripts/index.ts:30-84 | ○ |
| A5 · A10 \| `isHardDelete: true` trên một hàng vẫn được tham chiếu bởi bảng nối của nó \| Prisma cascades `… | 3. Hành động | — | △ |
| OPTIONS \| *(API không có giao diện — không render)* \| **Bị từ chối** bởi hằng số `HTTPMethod` cấp ứng dụng (`src/… | 4. Nền tảng chung | — | △ |
| HEAD \| *(API không có giao diện — không render)* \| Từ chối giống như OPTIONS \| `` không thể truy cập, lý do tương tự… | 4. Nền tảng chung | — | △ |
| (`isActive` + `deletedAt` cột) | 4. Nền tảng chung | prisma/schema.prisma:205-225 | ○ |
| · route-list.md ROUTE041-045, ROUTE061-065 | 4. Nền tảng chung | src/shared/guards/access-token.guard.ts:56-99 | ○ |
| (cập nhật, không tính toán lại mô-đun) | 4. Nền tảng chung | src/routes/permission/permission.service.ts:90 | ○ |
| (cập nhật, không tính toán lại mô-đun) | 4. Nền tảng chung | src/routes/permission/permission.service.ts:107-131 | ○ |
| (khẳng định không nhãn) | 4. Nền tảng chung | src/repositories/permission/permission.repository.ts:220-222 | ○ |
| (khẳng định không nhãn) | 4. Nền tảng chung | src/repositories/role/role.repository.ts:205-209 | ○ |
| (khẳng định không nhãn) | 4. Nền tảng chung | src/repositories/permission/permission.repository.ts:114-135 | ○ |
| (khẳng định không nhãn) | 4. Nền tảng chung | src/repositories/role/role.repository.ts:98-119 | ○ |
| (khẳng định không nhãn) | 4. Nền tảng chung | src/routes/role/role.service.ts:17 | ○ |
| (khẳng định không nhãn) | 4. Nền tảng chung | src/routes/role/role.service.ts:104-120 | ○ |
| (khẳng định không nhãn) | 4. Nền tảng chung | initial-scripts/create-permission.ts:41-110 | ○ |
| (khẳng định không nhãn) | 4. Nền tảng chung | initial-scripts/create-permission.ts:14-35 | ○ |
| (khẳng định không nhãn) | 4. Nền tảng chung | initial-scripts/create-permission.ts:149-192 | ○ |

## Thông tin bị thiếu

Phần ứng cử để kiểm tra các khẳng định `△` (được đánh dấu) -- tốt nhất mà có thể, không phải được coi là quyền lực:

- 3. Hành động: A5 · A10 \| `isHardDelete: true` trên một hàng vẫn được tham chiếu bởi bảng nối của nó \| Prisma cascades `…
- 4. Nền tảng chung: OPTIONS \| *(API không có giao diện — không render)* \| **Bị từ chối** bởi hằng số `HTTPMethod` cấp ứng dụng (`src/…
- 4. Nền tảng chung: HEAD \| *(API không có giao diện — không render)* \| Từ chối giống như OPTIONS \| `` không thể truy cập, lý do tương tự…

## Cờ rủi ro

_(không có)_
