---
source_artifact: docs/system/architecture.md
claims_total: 20
claims_with_evidence: 16
confidence_derived: 0.8
generated_by: derive_confidence_report.py
---

# Báo cáo độ tin cậy -- docs/system/architecture.md

> **Chỉ số độ phủ trích dẫn tự báo cáo -- KHÔNG phải kiểm chứng độ đúng.** Báo cáo này được suy ra một cách xác định bằng cách phân tích các trích dẫn inline `**Source:** file:line` và các thẻ đánh dấu `[UNVERIFIED]`/`[INFERRED]`/`[NEEDS_DOMAIN_CONFIRMATION]` của chính artifact. Nó KHÔNG kiểm chứng trích dẫn có chính xác hay khẳng định có đúng hay không. Để kiểm chứng độc lập, xem `claude/skills/audit-doc-parity/`.

## Khẳng định ↔ Bằng chứng

Chú giải: `○` = có trích dẫn (có Source file:line) · `△` = có đánh dấu thẻ (chưa chắc chắn, không có trích dẫn).

| Khẳng định | Mục | Bằng chứng (file:line) | Trạng thái ○/△ |
|---|---|---|---|
| (lớp con `PrismaClient`); `src/routes/auth/google.service.ts` (tích hợp Google, theo scout BL tr… | System Architecture | src/app.module.ts:8 | ○ |
| (lớp con `PrismaClient`); `src/routes/auth/google.service.ts` (tích hợp Google, theo scout BL tr… | System Architecture | src/routes/route.module.ts:18-32 | ○ |
| (lớp con `PrismaClient`); `src/routes/auth/google.service.ts` (tích hợp Google, theo scout BL tr… | System Architecture | src/shared/modules/base.module.ts:36-43 | ○ |
| (lớp con `PrismaClient`); `src/routes/auth/google.service.ts` (tích hợp Google, theo scout BL tr… | System Architecture | src/shared/modules/base.module.ts:65-73 | ○ |
| (lớp con `PrismaClient`); `src/routes/auth/google.service.ts` (tích hợp Google, theo scout BL tr… | System Architecture | src/shared/modules/shared.module.ts:12-27 | ○ |
| (lớp con `PrismaClient`); `src/routes/auth/google.service.ts` (tích hợp Google, theo scout BL tr… | System Architecture | src/repositories/product/product.repository.ts:29 | ○ |
| (lớp con `PrismaClient`); `src/routes/auth/google.service.ts` (tích hợp Google, theo scout BL tr… | System Architecture | src/shared/services/prisma.service.ts:5 | ○ |
| **Repository dùng chung/cross-cutting** (ví dụ `SharedUserRepository`, `SharedRoleRepository` trong `src/ro… | Layering | — | △ |
| (`@Catch(HttpException)`, đồng thời xử lý `ZodValidationException`/`ZodSerializationException`). | Data Flow | src/shared/guards/authorization-header.guard.ts:39-78 | ○ |
| (`@Catch(HttpException)`, đồng thời xử lý `ZodValidationException`/`ZodSerializationException`). | Data Flow | src/shared/guards/access-token.guard.ts:101-122 | ○ |
| (`@Catch(HttpException)`, đồng thời xử lý `ZodValidationException`/`ZodSerializationException`). | Data Flow | src/shared/guards/access-token.guard.ts:56-90 | ○ |
| (`@Catch(HttpException)`, đồng thời xử lý `ZodValidationException`/`ZodSerializationException`). | Data Flow | src/shared/modules/base.module.ts:45-58 | ○ |
| (`@Catch(HttpException)`, đồng thời xử lý `ZodValidationException`/`ZodSerializationException`). | Data Flow | src/shared/modules/base.module.ts:60-63 | ○ |
| (`@Catch(HttpException)`, đồng thời xử lý `ZodValidationException`/`ZodSerializationException`). | Data Flow | src/shared/filters/prisma-exception.filter.ts:61-67 | ○ |
| (`@Catch(HttpException)`, đồng thời xử lý `ZodValidationException`/`ZodSerializationException`). | Data Flow | src/shared/filters/external-exception.filter.ts:18-19 | ○ |
| CORS \| Hardcode một origin duy nhất `http://localhost:3000`, methods `GET,HEAD,PUT,PATCH,POST,DELETE` \|… | Cross-Cutting Concerns | — | △ |
| (`ManageProductController` được đăng ký bên trong `ProductModule`, không phải module top-level riêng — nê… | Module Graph (route feature modules) | src/routes/route.module.ts:18-32 | ○ |
| (`ManageProductController` được đăng ký bên trong `ProductModule`, không phải module top-level riêng — nê… | Module Graph (route feature modules) | src/routes/product/product.module.ts:12 | ○ |
| **Tồn tại hai file Prisma schema** (`prisma/schema.prisma`, `prisma/schema.development.prisma`); …c… | Notes | — | △ |
| Concerns/Blockers:** Hai mục còn mở `` được mang từ scout-report (cơ chế chọn dual Prisma schema… | Notes | — | △ |

## Thông tin còn thiếu

Các mục nên kiểm tra thêm cho khẳng định có đánh dấu `△` -- chỉ mang tính tham khảo, không phải căn cứ chính thức:

- Layering: **Repository dùng chung/cross-cutting** (ví dụ `SharedUserRepository`, `SharedRoleRepository` trong `src/ro…
- Cross-Cutting Concerns: CORS \| Hardcode một origin duy nhất `http://localhost:3000`, methods `GET,HEAD,PUT,PATCH,POST,DELETE` \|…
- Notes: **Tồn tại hai file Prisma schema** (`prisma/schema.prisma`, `prisma/schema.development.prisma`); …c…
- Notes: Concerns/Blockers:** Hai mục còn mở `` được mang từ scout-report (cơ chế chọn dual Prisma schema…

## Cờ rủi ro

_(không có)_
</content>
