# API Map

**Project**: ecom (NestJS backend) | **Generated**: 2026-09-12
**Nguồn**: `route-list.md` (70 dòng ROUTE###), `behavior-logic.md` (13 mục BL###)

**Phương pháp**: các ô `Handler BL###` theo từng route chỉ được điền khi `behavior-logic.md § Related Routes` nêu đích danh route đó. Các handler CRUD chuẩn (Brand, Category, Language, Permission, ProductTranslation, Role, User, v.v.) không có mục BL### nào trong nguồn — behavior-logic.md ghi lại các mối quan tâm cross-cutting (script, tích hợp, mail, middleware, một observer), không phải các handler nghiệp vụ theo từng route. Những ô đó là `[UNMAPPED]` — đây là hình dạng đúng, như kỳ vọng, không phải thiếu sót.

**Ghi chú cross-cutting (áp dụng cho CẢ 70 route, không lặp lại theo từng dòng)**: `BL006_ExternalExceptionFilter` (mapping lỗi HTTP) và `BL007_PrismaClientExceptionFilter` (mapping lỗi Prisma) đã được thay thế — cả hai giờ đều được dispatch qua một `GlobalExceptionFilter` duy nhất, xem `behavior-logic.md` và `docs/error-handling.md`. `BL008_ResponseTransformInterceptor` (bọc response thành công) và `BL013_PrismaClientLifecycleObserver` (lifecycle kết nối DB) không bị ảnh hưởng. Cả bốn đều là đăng ký `APP_FILTER`/`APP_INTERCEPTOR` toàn cục trong `src/shared/modules/base.module.ts`, bọc mọi route. Chúng chỉ được liệt kê một lần ở đây thay vì lặp lại ở mọi dòng bảng để tránh nhiễu.

**Chú giải cột Auth**: `public` = có `@IsPublicApi()` (bỏ qua xác thực hoàn toàn); `Bearer` = check permission mặc định toàn cục qua `AuthorizationHeaderGuard` + `AccessTokenGuard` dựa trên khóa quyền mà handler khai báo bằng `@RequirePermission` (`resource:action:scope`) — **thay đổi ngày 2026-09-21**, cách key theo `(path, method)` cũ không còn nữa; xem `docs/authorization-guide.md` (bộ tài liệu này không có mã PERM### nào — `permissions.md` nằm ngoài phạm vi của công việc này).

## Endpoint theo Domain

### Auth (`src/routes/auth/auth.controller.ts`, prefix `auth`)

| Method | Path | Handler BL### | Auth |
|--------|------|---------------|------|
| POST | /auth/register | [UNMAPPED] | public |
| POST | /auth/login | [UNMAPPED] | public |
| POST | /auth/refresh-token | [UNMAPPED] | public |
| POST | /auth/logout | [UNMAPPED] | Bearer |
| POST | /auth/otp | BL005_SendVerificationCodeEmail (trigger dự kiến; call site hiện đang bị comment — xem behavior-logic.md) | public |
| GET | /auth/google/authorization-url | BL003_GoogleOAuthLogin | public |
| GET | /auth/google/callback | BL003_GoogleOAuthLogin | public |
| POST | /auth/forgot-password | [UNMAPPED] | public |
| POST | /auth/2fa/enable | [UNMAPPED] | Bearer |
| POST | /auth/2fa/disable | [UNMAPPED] | Bearer |

### Brand (`src/routes/brand/brand.controller.ts`, prefix `brands`)

| Method | Path | Handler BL### | Auth |
|--------|------|---------------|------|
| GET | /brands | [UNMAPPED] | public |
| GET | /brands/:id | [UNMAPPED] | Bearer [UNVERIFIED: swagger gắn nhãn `@ApiPublic` nhưng không có `@IsPublicApi()` — runtime yêu cầu Bearer theo route-list.md] |
| POST | /brands | [UNMAPPED] | Bearer |
| PUT | /brands/:id | [UNMAPPED] | Bearer |
| DELETE | /brands/:id | [UNMAPPED] | Bearer |

### Brand Translation (`src/routes/brand-translation/brand-translation.controller.ts`, prefix `brand-translations`)

| Method | Path | Handler BL### | Auth |
|--------|------|---------------|------|
| GET | /brand-translations | [UNMAPPED] | Bearer |
| GET | /brand-translations/:id | [UNMAPPED] | Bearer |
| POST | /brand-translations | [UNMAPPED] | Bearer |
| PUT | /brand-translations/:id | [UNMAPPED] | Bearer |
| DELETE | /brand-translations/:id | [UNMAPPED] | Bearer |

### Category (`src/routes/category/category.controller.ts`, prefix `categories`)

| Method | Path | Handler BL### | Auth |
|--------|------|---------------|------|
| GET | /categories | [UNMAPPED] | Bearer |
| GET | /categories/:id | [UNMAPPED] | Bearer |
| POST | /categories | [UNMAPPED] | Bearer |
| PUT | /categories/:id | [UNMAPPED] | Bearer |
| DELETE | /categories/:id | [UNMAPPED] | Bearer |

### Category Translation (`src/routes/category-translation/category-translation.controller.ts`, prefix `category-translations`)

| Method | Path | Handler BL### | Auth |
|--------|------|---------------|------|
| GET | /category-translations | [UNMAPPED] | Bearer |
| GET | /category-translations/:id | [UNMAPPED] | Bearer |
| POST | /category-translations | [UNMAPPED] | Bearer |
| PUT | /category-translations/:id | [UNMAPPED] | Bearer |
| DELETE | /category-translations/:id | [UNMAPPED] | Bearer |

### Language (`src/routes/language/language.controller.ts`, prefix `languages`)

| Method | Path | Handler BL### | Auth |
|--------|------|---------------|------|
| GET | /languages | [UNMAPPED] | Bearer |
| GET | /languages/:id | [UNMAPPED] | Bearer |
| POST | /languages/create | [UNMAPPED] | Bearer |
| PUT | /languages/:id | [UNMAPPED] | Bearer |
| DELETE | /languages/:id | [UNMAPPED] | Bearer |

### Media (`src/routes/media/media.controller.ts`, prefix `media`)

| Method | Path | Handler BL### | Auth |
|--------|------|---------------|------|
| POST | /media/upload/image | BL004_S3ObjectStorage, BL012_SingleImageDiskInterceptorFactory | Bearer |
| POST | /media/upload/array-of-images | BL004_S3ObjectStorage, BL009_ArrayFilesValidationPipe | Bearer |
| POST | /media/upload/multiple-images | BL004_S3ObjectStorage, BL011_MultipleFilesValidationPipe | Bearer |
| GET | /media/presigned-url | BL004_S3ObjectStorage | Bearer |
| DELETE | /media/delete | BL004_S3ObjectStorage | Bearer |

### Permission (`src/routes/permission/permission.controller.ts`, prefix `permissions`) — chỉ đọc kể từ 2026-09-21

| Method | Path | Handler BL### | Auth |
|--------|------|---------------|------|
| GET | /permissions | [UNMAPPED] | Bearer |
| GET | /permissions/:id | [UNMAPPED] | Bearer |

### Product Translation (`src/routes/product-translation/product-translation.controller.ts`, prefix `product-translations`)

| Method | Path | Handler BL### | Auth |
|--------|------|---------------|------|
| GET | /product-translations | [UNMAPPED] | Bearer |
| GET | /product-translations/:id | [UNMAPPED] | Bearer |
| POST | /product-translations | [UNMAPPED] | Bearer |
| PUT | /product-translations/:id | [UNMAPPED] | Bearer |
| DELETE | /product-translations/:id | [UNMAPPED] | Bearer |

### Product — catalog công khai (`src/routes/product/product.controller.ts`, prefix `products`)

| Method | Path | Handler BL### | Auth |
|--------|------|---------------|------|
| GET | /products | [UNMAPPED] | public |
| GET | /products/:id | [UNMAPPED] | public |

### Manage Product (`src/routes/product/manage-product/manage-product.controller.ts`, prefix `manage-product/products`)

| Method | Path | Handler BL### | Auth |
|--------|------|---------------|------|
| GET | /manage-product/products | [UNMAPPED] | Bearer |
| GET | /manage-product/products/:id | [UNMAPPED] | Bearer |
| POST | /manage-product/products | [UNMAPPED] | Bearer |
| PUT | /manage-product/products/:id | [UNMAPPED] | Bearer |
| DELETE | /manage-product/products/:id | [UNMAPPED] | Bearer |

### Profile (`src/routes/profile/profile.controller.ts`, prefix `profile`)

| Method | Path | Handler BL### | Auth |
|--------|------|---------------|------|
| GET | /profile | [UNMAPPED] | Bearer |
| PUT | /profile | [UNMAPPED] | Bearer |
| PUT | /profile/change-password | [UNMAPPED] | Bearer |

### Role (`src/routes/role/role.controller.ts`, prefix `roles`)

| Method | Path | Handler BL### | Auth |
|--------|------|---------------|------|
| GET | /roles | [UNMAPPED] | Bearer |
| GET | /roles/:id | [UNMAPPED] | Bearer |
| POST | /roles | [UNMAPPED] | Bearer |
| PUT | /roles/:id | [UNMAPPED] | Bearer |
| DELETE | /roles/:id | [UNMAPPED] | Bearer |

### User (`src/routes/user/user.controller.ts`, prefix `users`)

| Method | Path | Handler BL### | Auth |
|--------|------|---------------|------|
| GET | /users | [UNMAPPED] | Bearer |
| GET | /users/:id | [UNMAPPED] | Bearer |
| POST | /users | [UNMAPPED] | Bearer |
| PUT | /users/:id | [UNMAPPED] | Bearer |
| DELETE | /users/:id | [UNMAPPED] | Bearer |

### Cart (`src/routes/cart/cart.controller.ts`, prefix `cart`)

| Method | Path | Handler BL### | Auth |
|--------|------|---------------|------|
| GET | /cart | [UNMAPPED] | Bearer |
| POST | /cart | [UNMAPPED] | Bearer |
| PUT | /cart/:cartItemId | [UNMAPPED] | Bearer |
| DELETE | /cart/:cartItemId | [UNMAPPED] | Bearer |

### Order — người mua (`src/routes/order/order.controller.ts`, prefix `orders`)

| Method | Path | Handler BL### | Auth |
|--------|------|---------------|------|
| GET | /orders | [UNMAPPED] | Bearer |
| GET | /orders/:orderId | [UNMAPPED] | Bearer |
| POST | /orders | [UNMAPPED] | Bearer |
| PUT | /orders/:orderId/cancel | [UNMAPPED] | Bearer |

### Manage Order — seller/admin (`src/routes/order/manage-order/manage-order.controller.ts`, prefix `manage-order/orders`)

| Method | Path | Handler BL### | Auth |
|--------|------|---------------|------|
| GET | /manage-order/orders | [UNMAPPED] | Bearer |
| GET | /manage-order/orders/:orderId | [UNMAPPED] | Bearer |
| PUT | /manage-order/orders/:orderId/status | [UNMAPPED] | Bearer |

### Review (`src/routes/review/review.controller.ts`, prefix `reviews`)

| Method | Path | Handler BL### | Auth |
|--------|------|---------------|------|
| GET | /reviews | [UNMAPPED] | public |
| POST | /reviews | [UNMAPPED] | Bearer |
| PUT | /reviews/:reviewId | [UNMAPPED] | Bearer |
| DELETE | /reviews/:reviewId | [UNMAPPED] | Bearer |

## Tóm tắt Mapping

- Tổng 85 route (70 route gốc + 15 route thêm ngày 2026-09-12 cho cart/order/review). 8 route được map vào một BL### cụ thể (ROUTE005–BL005 dự kiến-nhưng-chết, ROUTE006/007–BL003, ROUTE036–BL004+BL012, ROUTE037–BL004+BL009, ROUTE038–BL004+BL011, ROUTE039–BL004, ROUTE040–BL004). 77 route `[UNMAPPED]` — các route CRUD/business-service chuẩn không có mục riêng trong danh mục 13 mục BL (`behavior-logic.md` chưa được tạo lại trong pass này; các quy tắc nghiệp vụ cart/order/review mới — trừ tồn kho, đóng băng snapshot, chuyển trạng thái — được ghi lại dưới dạng BR-C##/BR-O##/BR-R## trong các feature spec F011/F012/F013 thay vì dưới dạng mục BL###).
- BL001_SyncRoutePermissionsScript và BL002_SeedAdminUserScript có `Related Routes: N/A` trong behavior-logic.md (script độc lập, không gắn với route HTTP nào) — bị loại đúng cách khỏi mọi dòng route ở trên.
- BL010_ImageValidationPipe là dead code (không route sống nào tham chiếu tới nó theo behavior-logic.md) — bị loại đúng cách khỏi mọi dòng route ở trên.
- BL006/BL007/BL008/BL013 áp dụng toàn cục cho cả 70 route như middleware/lifecycle cross-cutting — được ghi lại một lần ở trên thay vì lặp lại trong mọi dòng (xem "Ghi chú cross-cutting").

## Background Jobs

Không có dữ liệu — scout-report đã xác nhận zero decorator `@Cron`/`@Interval`/`@Process`/`@OnEvent` và không có dependency Bull/BullMQ nào trong codebase (theo `behavior-logic.md`: các loại `scheduled-job`, `queue-worker`, `event-listener` đều "absent (verified `_(none found)_` in scout inventory)"). `BL001`/`BL002` là script `pnpm`/`ts-node` chạy tay một lần (loại custom-command), không phải scheduled job — không có cron expression nào cho cả hai.

## Webhooks / External Calls

Không có dữ liệu cho webhook đến — scout-report đã xác nhận zero mục loại webhook trong Background Logic Source Inventory (`behavior-logic.md`: loại webhook "absent (verified `_(none found)_`)").

Có tồn tại tích hợp bên ngoài đi ra (cả hai đã được ghi nhận là mục BL loại `integration`, không phải webhook):

| Chiều | Đích / Nguồn | Sự kiện / Endpoint | Mô tả |
|-----------|----------------|------------------|-------------|
| đi ra | Google OAuth2 (`google-auth-library`) | `GET /auth/google/authorization-url`, `GET /auth/google/callback` | BL003_GoogleOAuthLogin — dựng URL consent của Google, đổi auth code lấy token, lấy profile, tự động tạo user `CLIENT` ở lần đăng nhập đầu |
| đi ra | AWS S3 (`@aws-sdk/client-s3`) | các lệnh gọi upload / delete / presign từ `MediaService` | BL004_S3ObjectStorage — upload disk/buffer (đơn giản + multipart), xoá object, tạo presigned URL (download + upload) |
| đi ra (chết/chưa nối) | Resend (email API) | dự kiến: email xác minh cho `POST /auth/otp` | BL005_SendVerificationCodeEmail — provider đã đăng ký, nhưng call site trong `AuthService.sendOTP` đang bị comment (`auth.service.ts:430-432`); row DB được tạo nhưng email chưa thực sự được gửi |

**Status:** DONE_WITH_CONCERNS
**Summary:** Đã tổng hợp ApiMap: 70 route được nhóm vào 14 bảng theo domain với mapping BL### (8 route được map, 62 route `[UNMAPPED]` — đúng như kỳ vọng vì behavior-logic.md ghi lại các mối quan tâm cross-cutting, không phải handler CRUD theo từng route), phần Background Jobs và Webhooks được điền rõ ràng "Không có dữ liệu" kèm lý do.
**Concerns/Blockers:** (1) Cột Auth dùng thuật ngữ tên guard ("public"/"Bearer"), không phải mã PERM### — `permissions.md` nằm ngoài phạm vi công việc này theo danh sách đọc của brief, nên không có mã PERM### nào để trích dẫn. (2) ROUTE012 (`GET /brands/:id`) mang cờ `[UNVERIFIED]` riêng của route-list.md (tài liệu ghi public, runtime lại yêu cầu Bearer) — được giữ nguyên văn thay vì giải quyết, vì việc giải quyết nó đòi hỏi xác minh lại nguồn nằm ngoài phạm vi công việc này.
</content>
