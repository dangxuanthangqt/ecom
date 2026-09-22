---
authored_by: rebuild-spec
---
<!-- layout-exempt: rebuild-spec owns all docs/system|features|generated|flows paths -->
# Behavior Logic

**Dự án**: ecom (NestJS backend)
**Ngày tạo**: 2026-09-12
**Phạm vi phân tích**: toàn bộ repo — `## Background Logic Source Inventory` trong `scout-report.md` (13 mục, làm chuẩn)

**Định dạng mã**: `BL###_NameSlug`

**Các loại Behavior Logic có mặt**: `custom-command` (2), `integration` (2), `mail` (1), `middleware` (7), `observer` (1). Không có (đã xác nhận `_(none found)_` trong inventory của scout): `scheduled-job`, `queue-worker`, `event-listener`, `notification`, `webhook`.

**Ghi chú**: Các guard auth/permission (`AccessTokenGuard`, `ApiKeyGuard`, `AuthorizationHeaderGuard`) không nằm trong tài liệu này — xem `permissions.md`.

---

## Behavior Logic Index

### Loại: custom-command

| Code | Name | Trigger | Payload | File Schema |
|------|------|---------|---------|--------------|
| BL001_SyncRoutePermissionsScript | pnpm script `seed:initial-scripts:create-permission` (chạy tay qua ts-node) | N/A — không phải event/notification | N/A — không phải kiểu trao đổi file |
| BL002_SeedAdminUserScript | pnpm script `seed:initial-scripts` (chạy tay qua ts-node) | N/A — không phải event/notification | N/A — không phải kiểu trao đổi file |

### Loại: integration

| Code | Name | Trigger | Payload | File Schema |
|------|------|---------|---------|--------------|
| BL003_GoogleOAuthLogin | Request đến `GET /auth/google/authorization-url` và `GET /auth/google/callback` | N/A — không phải event/notification | N/A — không phải kiểu trao đổi file |
| BL004_S3ObjectStorage | Được gọi từ handler của `MediaService`/`MediaController` khi upload/xóa/presign file | N/A — không phải event/notification | N/A — không phải kiểu trao đổi file |

### Loại: mail

| Code | Name | Trigger | Payload | File Schema |
|------|------|---------|---------|--------------|
| BL005_SendVerificationCodeEmail | Provider đã đăng ký; nơi gọi (`AuthService.sendOTP`) hiện đang bị comment out — xem phần Description | N/A — không phải event/notification | N/A — không phải kiểu trao đổi file |

### Loại: middleware

| Code | Name | Trigger | Payload | File Schema |
|------|------|---------|---------|--------------|
| BL006_ExternalExceptionFilter | Bất kỳ `HttpException` nào bị ném từ handler bất kỳ, được điều phối qua `GlobalExceptionFilter` — `APP_FILTER` toàn cục (đã bị thay thế, xem mục này) | N/A — không phải event/notification | N/A — không phải kiểu trao đổi file |
| BL007_PrismaClientExceptionFilter | Bất kỳ lỗi Prisma client nào bị ném từ handler bất kỳ, được điều phối qua `GlobalExceptionFilter` — `APP_FILTER` toàn cục (đã bị thay thế, xem mục này) | N/A — không phải event/notification | N/A — không phải kiểu trao đổi file |
| BL008_ResponseTransformInterceptor | Mọi response thành công — `APP_INTERCEPTOR` toàn cục | N/A — không phải event/notification | N/A — không phải kiểu trao đổi file |
| BL009_ArrayFilesValidationPipe | Áp dụng inline trong `MediaController.uploadArrayOfImages` (`POST /media/upload/array-of-images`) | N/A — không phải event/notification | N/A — không phải kiểu trao đổi file |
| BL010_ImageValidationPipe | Hiện không gắn vào handler nào đang chạy — xem phần Description | N/A — không phải event/notification | N/A — không phải kiểu trao đổi file |
| BL011_MultipleFilesValidationPipe | Áp dụng inline trong `MediaController.uploadMultipleImages` (`POST /media/upload/multiple-images`) | N/A — không phải event/notification | N/A — không phải kiểu trao đổi file |
| BL012_SingleImageDiskInterceptorFactory | `@UseInterceptors()` trên `MediaController.uploadLargeImageFromDisk` (`POST /media/upload/image`) | N/A — không phải event/notification | N/A — không phải kiểu trao đổi file |

### Loại: observer

| Code | Name | Trigger | Payload | File Schema |
|------|------|---------|---------|--------------|
| BL013_PrismaClientLifecycleObserver | Vòng đời module Nest (`OnModuleInit`/`OnModuleDestroy`) | N/A — không phải event/notification | N/A — không phải kiểu trao đổi file |

---

## Dev Appendix

### Cardinality Contract

Giống với `templates/behavior-logic-template.md § Cardinality Contract` (Rules C1–C3). Tài liệu này xuất ra đúng 13 mục BL — mỗi mục ứng với một entry trong `scout-report.md § Background Logic Source Inventory`, không gộp, không tách thêm ngoài những gì inventory đã liệt kê.

---

## BL001_SyncRoutePermissionsScript

**Type**: custom-command
**Trigger**: Chạy tay `pnpm run seed:initial-scripts:create-permission` (`NODE_ENV=development ts-node initial-scripts/create-permission`) — không có bề mặt HTTP, không có scheduler
**Source File**: initial-scripts/create-permission.ts
**Source Symbol**: module::bootstrap

### Description

Khởi động một Nest app đầy đủ (`NestFactory.create(AppModule)`), lắng nghe ở port 3010, sau đó đọc bảng router Express đang chạy (`app.getHttpAdapter().getInstance().router.stack`) để liệt kê từng route `(method, path)` đã đăng ký (`initial-scripts/create-permission.ts:41-72`). So sánh tập route đang chạy này với bảng `permission`: xóa bất kỳ dòng permission nào trong DB mà `(method, path)` của nó không còn khớp với route đang chạy (`:84-98`), thêm bất kỳ route đang chạy nào còn thiếu trong DB (`:100-110`, `skipDuplicates: true`). Sau đó đọc lại toàn bộ permission chưa bị xóa và gán lại quan hệ `permissions` cho từng vai trò `SELLER`/`CLIENT`/`ADMIN` qua `role.update({ data: { permissions: { set: [...] } } })` (`:149-192`), lọc theo danh sách module cho phép hardcode riêng cho từng vai trò (mảng `SellerModule`/`ClientModule`, `:14-30`; `ADMIN` nhận trọn bộ permission không lọc vì không có entry trong `Module` map, `:158-160`). Đây là cơ chế giữ cho `role.permissions` — bảng mà `AccessTokenGuard` kiểm tra lúc runtime (xem `route-list.md`) — luôn đồng bộ với các route thực tế của controller.

**[UNVERIFIED]**: không thấy bước CI/CD hay hook postinstall npm nào gắn script này vào quá trình deploy; nó được chạy tay theo tên script trong `package.json`.

### Related Modules

- src/app.module.ts (instance toàn app được bootstrap)
- src/shared/services/prisma.service.ts

### Related Routes

- (ALL) mọi route trong `route-list.md` — script này đọc bảng router đang chạy, nên nó liên quan tới cả 70 route, không phải riêng một route nào

### Related Data Models

- MODEL: Permission
- MODEL: Role

---

## BL002_SeedAdminUserScript

**Type**: custom-command
**Trigger**: Chạy tay `pnpm run seed:initial-scripts` (`ts-node initial-scripts`) — bootstrap một lần, chạy một lần cho mỗi môi trường mới
**Source File**: initial-scripts/index.ts
**Source Symbol**: module::main

### Description

Nạp `.env.{NODE_ENV}` (`:10`), chặn việc chạy lại trên DB đã seed (`throw new Error("Roles already exist")` nếu `role.count() > 0`, `:31-35`), sau đó tạo ba vai trò cố định (`ADMIN`, `CLIENT`, `SELLER`, `:37-53`) và một user admin từ các biến môi trường `ADMIN_NAME`/`ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_PHONE_NUMBER`, được validate qua DTO `class-validator` (`AdminUserSchema`, `:16-28`) và hash mật khẩu qua `HashingService` (`:68`) trước khi insert (`:70-78`). Đây là đường duy nhất tạo ra vai trò `ADMIN` ban đầu và user đầu tiên của nó — mọi tài khoản admin khác đều phát sinh từ sau bước seed này.

### Related Modules

- src/shared/services/hashing.service.ts
- src/shared/services/prisma.service.ts

### Related Routes

- N/A — script độc lập, không có route

### Related Data Models

- MODEL: Role
- MODEL: User

---

## BL003_GoogleOAuthLogin

**Type**: integration
**Trigger**: `GET /auth/google/authorization-url` (ROUTE006) tạo URL redirect; `GET /auth/google/callback` (ROUTE007) nhận redirect từ Google và hoàn tất đăng nhập
**Source File**: src/routes/auth/google.service.ts
**Source Symbol**: GoogleService

### Description

Bọc `OAuth2Client` của `google-auth-library` (khởi tạo một lần trong constructor từ config `googleClientId`/`googleClientSecret`/`googleRedirectUri`, `:32-39`). `getAuthorizationUrl()` (`:49-67`) mã hóa base64 `{userAgent, ip}` thành tham số `state` mờ (opaque) và dựng URL consent của Google với `access_type: "offline"` cùng các scope email/profile. `googleCallback(code, state)` (`:76-156`) giải mã và validate `state` bằng Zod (`:77-87`), đổi `code` lấy token (`oauth2Client.getToken`, `:90`), lấy profile Google (`oauth2.userinfo.get()`, `:99`), rồi hoặc tìm user hiện có theo email hoặc tự tạo user mới với vai trò `CLIENT` và mật khẩu placeholder cố định (`DEFAULT_PASSWORD = "changeme"`, đã hash, `:16`, `:119-130`) — một quy tắc nghiệp vụ đáng lưu ý: tài khoản được tạo qua Google có mật khẩu nội bộ đã biết trước, không phải ngẫu nhiên. Ghi một dòng `Device` cho phiên đăng nhập (`:133-138`) và cấp JWT của app qua `AuthService.generateTokens` (`:140-145`). Mọi lỗi trong luồng này đều bị nuốt thành một lỗi 500 chung chung `"Invalid state data."` (`:148-155`) — nguyên nhân thật (ví dụ Google API lỗi hay state sai) chỉ hiện trong log server.

### Related Modules

- src/routes/auth/auth.service.ts (`AuthService.generateTokens`)
- src/repositories/device/device.repository.ts
- src/repositories/user/shared-user.repository.ts
- src/repositories/role/shared-role.repository.ts
- src/shared/services/hashing.service.ts
- src/shared/services/app-config.service.ts

### Related Routes

- (GET) /auth/google/authorization-url
- (GET) /auth/google/callback

### Related Data Models

- MODEL: User
- MODEL: Device
- MODEL: Role

---

## BL004_S3ObjectStorage

**Type**: integration
**Trigger**: Được gọi đồng bộ từ `MediaService`/`MediaController` mỗi khi có request upload, presign hoặc xóa media
**Source File**: src/shared/services/s3.service.ts
**Source Symbol**: S3Service

### Description

Wrapper cho AWS S3 client (`@aws-sdk/client-s3`, `@aws-sdk/lib-storage`, `@aws-sdk/s3-request-presigner`) được khởi tạo từ config `s3Region`/`s3AccessKey`/`s3SecretKey` (`:29-38`), tự kiểm tra kết nối khi khởi tạo qua `listBuckets()` (`:40-48`). Cung cấp: upload stream từ đĩa có theo dõi tiến trình cho file lớn (`uploadLargeFileFromDisk`, multipart qua `Upload`, `:75-185`), upload stream đơn giản từ đĩa cho file nhỏ (`uploadSimpleFileFromDisk`, `:190-254`), upload đơn giản/multipart từ buffer (`uploadFileFromBuffer`/`uploadLargeFileFromBuffer`, `:321-464`) cùng một wrapper tự chọn chuyển đổi ở ngưỡng 100MB (`smartUploadFromBuffer`, `:503-546`), xóa object (`deleteFile`, `:469-496`), và tạo presigned URL cho cả tải xuống (`generatePresignedDownloadUrl`, `:552-608`) lẫn tải lên (`generatePresignedUploadUrl`, `:610-665`). Mọi object đều được lưu với `ServerSideEncryption: "AES256"` và timestamp `Metadata.uploadedAt`. `getPublicUrl()` (`:51-70`) dựng URL S3 công khai trực tiếp — comment trong code nói rõ bucket phải được cấu hình cho phép đọc công khai, tức là theo góc nhìn của service này, object KHÔNG mặc định là private. Việc kiểm tra file tồn tại trước khi xóa/presign được thực hiện qua `checkFileExists()` (`:671-708`), coi `S3ServiceException` với `404`/`NoSuchKey` là "không tồn tại" và mọi thứ khác là lỗi cứng. Mọi method public đều bọc lỗi trong `throwHttpException({type: "internal", ...})`, bỏ chi tiết lỗi gốc từ AWS ra khỏi response HTTP (dù vẫn được ghi log).

**[SIGNAL_INFERRED]** — file này đã được xác định độc lập trong inventory của scout là `integration`; xác nhận lại ở đây bằng cách đọc trực tiếp phần khởi tạo SDK client bên ngoài.

### Related Modules

- src/routes/media/media.service.ts
- src/shared/services/app-config.service.ts
- src/shared/utils/throw-http-exception.util.ts

### Related Routes

- (POST) /media/upload/image
- (POST) /media/upload/array-of-images
- (POST) /media/upload/multiple-images
- (GET) /media/presigned-url
- (DELETE) /media/delete

### Related Data Models

- N/A — không có model Prisma trực tiếp; chỉ thao tác trên S3 object key

---

## BL005_SendVerificationCodeEmail

**Type**: mail
**Trigger**: Nơi gọi dự kiến: luồng gửi OTP (`AuthService.sendOTP`) — xem phần Description về tình trạng kết nối hiện tại
**Source File**: src/shared/services/email.service.ts
**Source Symbol**: EmailService::sendEmail

### Description

Wrapper mỏng quanh Resend SDK (`resend.emails.send`, `:16-21`), sender hardcode `from: "onboarding@resend.dev"` và nội dung HTML `<p>{code}</p>` đơn giản chứa mã xác thực. **[UNVERIFIED]/finding**: `EmailService` được đăng ký như một provider trong `shared.module.ts` nhưng nơi gọi duy nhất của nó, `AuthService.sendOTP` (`src/routes/auth/auth.service.ts:430-432`), đang bị comment out — luồng OTP (`POST /auth/otp`, ROUTE005) hiện tạo một dòng `VerificationCode` trong DB (`auth.service.ts:421-429`) nhưng thực tế không gửi email cho user. Đây có thể là code chết đang chờ bật lại, hoặc là một lỗ hổng chức năng; đánh dấu để BA/feature-spec theo dõi thêm chứ không khẳng định theo hướng nào.

### Related Modules

- src/routes/auth/auth.service.ts (nơi gọi dự kiến, hiện đang ngắt kết nối)
- src/shared/services/app-config.service.ts

### Related Routes

- (POST) /auth/otp — route trigger dự kiến; lời gọi hiện đang chết (xem Description)

### Related Data Models

- MODEL: VerificationCode (vẫn được tạo ra dù email có gửi được hay không)

---

## BL006_ExternalExceptionFilter

> **Đã bị thay thế.** `ExternalExceptionFilter` và `PrismaClientExceptionFilter` đã bị xóa và
> gộp lại thành một `GlobalExceptionFilter` duy nhất (`@Catch()`, không có tham số). Mục này được giữ lại làm BL006
> để ổn định ID (được `api-map.md`, `feature-list.md`, `user-stories.md`, `screen-flow.md` tham chiếu tới);
> xem BL007 cho phía Prisma và `docs/error-handling.md` cho hợp đồng đầy đủ hiện tại.

**Type**: middleware
**Trigger**: Bất kỳ `HttpException` nào bị ném từ route handler bất kỳ, được điều phối qua `@Catch()` trần của `GlobalExceptionFilter` (`APP_FILTER` toàn cục trong `src/shared/modules/base.module.ts`)
**Source File**: src/shared/filters/http-exception.mapper.ts
**Source Symbol**: mapHttpException

### Description

Chuẩn hóa mọi `HttpException` về một envelope `ErrorResponseDto` duy nhất (`statusCode`, `error`, `message`, `details`, `requestId`) mà `GlobalExceptionFilter` (`src/shared/filters/global-exception.filter.ts`) ghi cho mọi response. Một payload dạng chuỗi thuần trở thành `message`; một mảng dưới `message` (từ validation pipe của Nest, hoặc lỗi theo từng field của một pipe khác) được đưa vào `details` với `message` cố định là `"Validation failed"`. Một `error` dạng SCREAMING_SNAKE đã có sẵn trên payload exception thì được giữ nguyên; mọi trường hợp khác được suy ra lại từ HTTP status. `class-validator` giờ là hệ thống validation duy nhất đi tới đường này — `nestjs-zod` cùng các subclass `ZodValidationException`/`ZodSerializationException` của nó đã biến mất khỏi pipeline HTTP. Đây là hợp đồng hình dạng lỗi toàn tiến trình mà response lỗi của cả 70 route đều tuân theo; xem `docs/error-handling.md` để biết hợp đồng đầy đủ và ví dụ minh họa.

### Related Modules

- src/dtos/error-response.dto.ts
- src/shared/filters/global-exception.filter.ts (nơi điều phối + đăng ký)

### Related Routes

- (ALL) mọi route trong `route-list.md`

### Related Data Models

- N/A

---

## BL007_PrismaClientExceptionFilter

> **Đã bị thay thế.** `PrismaClientExceptionFilter` và `ExternalExceptionFilter` đã bị xóa và
> gộp lại thành một `GlobalExceptionFilter` duy nhất (`@Catch()`, không có tham số). Mục này được giữ lại làm BL007
> để ổn định ID (được `api-map.md`, `feature-list.md`, `user-stories.md`, `screen-flow.md` tham chiếu tới);
> xem BL006 cho phía HTTP-exception và `docs/error-handling.md` cho hợp đồng đầy đủ hiện tại.

**Type**: middleware
**Trigger**: Bất kỳ lỗi nào trong `PrismaClientInitializationError`/`ValidationError`/`KnownRequestError`/`UnknownRequestError`/`RustPanicError` bị ném trong lúc gọi Prisma, được điều phối qua `@Catch()` trần của `GlobalExceptionFilter` (`APP_FILTER` toàn cục trong `src/shared/modules/base.module.ts`)
**Source File**: src/shared/filters/prisma-error.mapper.ts
**Source Symbol**: mapPrismaError

### Description

Ánh xạ mã lỗi Prisma sang HTTP status + message qua một bảng tra tĩnh `HTTP_CODE_FROM_PRISMA` — ví dụ `P2002` (vi phạm unique constraint) → 409 "Reference data already exists.", `P2025` (không tìm thấy bản ghi) → 404, `P1008` (timeout) → 408. `P2001` (bản ghi không tồn tại) giờ ánh xạ về `404 NOT_FOUND` — trước đây nó ánh xạ về `204 No Content` kèm body JSON, sai ở hai điểm: 204 không được phép có body, và "bản ghi không tồn tại" không phải là "no content". Các mã chưa được ánh xạ giờ không còn message riêng: chúng rơi vào text 500 chung của `ErrorResponseDto`, nên một mã Prisma chưa ánh xạ không phân biệt được với bất kỳ lỗi 500 nào khác. `shortPrismaMessage` cắt bớt phần chẩn đoán thô của Prisma (mọi thứ sau mũi tên `→` mà Prisma đưa vào text lỗi) chỉ để ghi log — response HTTP không bao giờ mang message thô của Prisma.

### Related Modules

- src/shared/filters/global-exception.filter.ts (nơi điều phối + đăng ký)

### Related Routes

- (ALL) mọi route có chạm tới Prisma — gần như toàn bộ 70 route trừ các route thuần auth-token

### Related Data Models

- N/A — cross-cutting, không gắn với model cụ thể

---

## BL008_ResponseTransformInterceptor

**Type**: middleware
**Trigger**: Mọi response thành công (không bị ném lỗi) từ handler (`APP_INTERCEPTOR` toàn cục trong `src/shared/modules/base.module.ts`)
**Source File**: src/shared/interceptors/transform.interceptor.ts
**Source Symbol**: TransformInterceptor::intercept

### Description

Bọc mọi giá trị trả về thành công của handler vào envelope `{ data, statusCode }` (`:20-31`) qua `map` của RxJS trên stream response, đọc `response.statusCode` trực tiếp từ `ServerResponse` gốc của Express. Đây là hợp đồng response thành công thống nhất cho cả 70 route — kết hợp với `BL006`/`BL007` ở phía lỗi, cùng nhau định nghĩa toàn bộ envelope response của API.

### Related Modules

- src/shared/modules/base.module.ts (nơi đăng ký)

### Related Routes

- (ALL) mọi route trong `route-list.md`

### Related Data Models

- N/A

---

## BL009_ArrayFilesValidationPipe

**Type**: middleware
**Trigger**: Pipe `new ArrayFilesValidationPipe({...})` được khởi tạo inline trong `MediaController.uploadArrayOfImages` (`media.controller.ts:104`)
**Source File**: src/shared/pipes/array-images-validation.pipe.ts
**Source Symbol**: ArrayFilesValidationPipe::transform

### Description

Validate một mảng file upload theo các giới hạn có thể cấu hình (mặc định: `maxCount=10`, `minCount=1`, `maxSize=5MB`, `minSize=1KB`, danh sách MIME cho phép `image/jpeg|png|gif|webp`, danh sách extension cho phép `.jpg/.jpeg/.png/.gif/.webp`, `:22-29`). Từ chối (qua `throwHttpException({type:"badRequest",...})`) khi: mảng rỗng, số lượng vượt/thiếu ngưỡng, bất kỳ file nào không đạt kiểm tra size/MIME/extension/tên theo từng file, tên file dài quá 255 ký tự, hoặc tổng dung lượng vượt 50MB (`:157-169`). Đây là tập quy tắc nghiệp vụ cho endpoint upload ảnh hàng loạt (`POST /media/upload/array-of-images`).

### Related Modules

- src/routes/media/media.controller.ts
- src/shared/utils/throw-http-exception.util.ts

### Related Routes

- (POST) /media/upload/array-of-images

### Related Data Models

- N/A

---

## BL010_ImageValidationPipe

**Type**: middleware
**Trigger**: Hiện không gắn vào route nào đang chạy — cả nơi import (`media.controller.ts:27`, `ImageValidationPipe`) và nơi dùng (`:84`) đều đang bị comment out
**Source File**: src/shared/pipes/image-validation.pipe.ts
**Source Symbol**: ImageValidationPipe::transform

### Description

Validator cho một file đơn: từ chối khi thiếu file, size ngoài khoảng 1KB–5MB, MIME type không được phép (`jpeg/png/gif/webp/svg+xml`), thiếu tên file, hoặc extension không được phép (`.jpg/.jpeg/.png/.gif/.webp/.svg`) qua `BadRequestException` (`:16-63`). Có một đoạn kiểm tra magic-number (file-signature) bị comment out, không hoạt động (`:65-89`). Theo Rule C1, mục này vẫn được xuất ra như một BL riêng vì nó là một file riêng biệt trong inventory của scout, dù hiện là code chết (đã bị thay thế bởi `BL009`/`BL011` tại route duy nhất từng tham chiếu nó, `uploadImageFromBuffer`, mà chính route đó cũng đang bị comment out trong `media.controller.ts:82-88` theo ghi chú code chết của `route-list.md`).

### Related Modules

- src/routes/media/media.controller.ts (chỉ còn tham chiếu đã comment out)

### Related Routes

- N/A — không có route nào đang chạy áp dụng pipe này

### Related Data Models

- N/A

---

## BL011_MultipleFilesValidationPipe

**Type**: middleware
**Trigger**: Pipe `new MultipleFilesValidationPipe({...})` được khởi tạo inline trong `MediaController.uploadMultipleImages` (`media.controller.ts:150`)
**Source File**: src/shared/pipes/multiple-images-validation.pipe.ts
**Source Symbol**: MultipleFilesValidationPipe::transform

### Description

Validator nhiều file theo từng field name, cấu hình qua map `FileFieldsConfig` (`:5-13`) — mỗi field có thể tự định nghĩa `maxCount`, `maxSize`, `allowedMimeTypes`, `allowedExtensions`, `required` riêng. Từ chối (qua `throwHttpException`) khi: thiếu field bắt buộc, vượt số lượng theo từng field, vi phạm size/MIME/extension/tên theo từng file (`:23-114`), và bất kỳ field nào xuất hiện trong request mà không được khai báo trong config (`:118-130`) — quy tắc cuối khiến pipe này nghiêm ngặt với các field form không mong đợi, khác với `BL009`. Định hình quy tắc nghiệp vụ cho endpoint upload ảnh nhiều field (`POST /media/upload/multiple-images`).

### Related Modules

- src/routes/media/media.controller.ts
- src/shared/utils/throw-http-exception.util.ts

### Related Routes

- (POST) /media/upload/multiple-images

### Related Data Models

- N/A

---

## BL012_SingleImageDiskInterceptorFactory

**Type**: middleware
**Trigger**: `@UseInterceptors(createSingleImageDiskInterceptor("image"))` trên `MediaController.uploadLargeImageFromDisk` (`media.controller.ts:72`)
**Source File**: src/shared/utils/files/single-image-interceptor.util.ts
**Source Symbol**: module::createSingleImageDiskInterceptor

### Description

Factory tạo ra một `FileInterceptor` của Nest được cấu hình với Multer disk storage. `fileFilter` (`:52-79`) từ chối (qua `BadRequestException`) bất kỳ file nào có MIME type hoặc extension không nằm trong danh sách cho phép `image/jpeg|png|gif|webp` / `.jpg/.jpeg/.png/.gif/.webp` — được ghi rõ trong một comment inline (`:28-50`) rằng *size* của file không thể kiểm tra ở bước này vì `fileFilter` của Multer chạy trước khi body file được stream; việc giới hạn size được chuyển sang tùy chọn `limits.fileSize` của Multer (mặc định `FILE_SIZE_LIMITS.IMAGE_5MB = 5MB`, `:11-17`, `108`). `createDiskStorage()` (`:82-99`) tự tạo thư mục đích nếu chưa có và sinh tên file duy nhất dạng `{original}_{timestamp}{ext}`. Ba biến thể factory được export: `createSingleImageInterceptor` (nơi gọi tự chọn storage), `createSingleImageMemoryInterceptor` (bắt buộc memory storage), `createSingleImageDiskInterceptor` (bắt buộc disk storage, là biến thể `media.controller.ts` thực sự dùng).

### Related Modules

- src/routes/media/media.controller.ts
- src/constants/upload.constant.ts

### Related Routes

- (POST) /media/upload/image

### Related Data Models

- N/A

---

## BL013_PrismaClientLifecycleObserver

**Type**: observer
**Trigger**: Vòng đời module Nest — `onModuleInit` chạy một lần khi app khởi động; `onModuleDestroy` chạy một lần khi app tắt
**Source File**: src/shared/services/prisma.service.ts
**Source Symbol**: PrismaService::onModuleInit

### Description

`PrismaService extends PrismaClient implements OnModuleInit` (`:5`). `onModuleInit()` gọi `this.$connect()` và ghi log khi thành công, hoặc ghi log rồi ném lại lỗi khi thất bại — một lỗi kết nối ở đây sẽ chặn app khởi động (`:8-16`). `onModuleDestroy()` gọi `this.$disconnect()` khi app tắt (`:18-21`). Đây là hook vòng đời duy nhất quản lý kết nối DB cho mọi repository/service trong app (cả 13 repository đều inject service này một cách gián tiếp).

### Related Modules

- Cả 13 file dưới src/repositories/**

### Related Routes

- (ALL) mọi route có chạm tới database — gần như toàn bộ 70 route

### Related Data Models

- N/A — vòng đời kết nối cross-cutting, không gắn với model cụ thể

---

## Summary

- **Tổng số mục Behavior Logic**: 13
- **Theo loại**: custom-command: 2, event-listener: 0, integration: 2, mail: 1, middleware: 7, notification: 0, observer: 1, queue-worker: 0, scheduled-job: 0, webhook: 0

---

## Cross-Reference Validation

- [x] Tất cả mã BL### đều duy nhất
- [ ] Tất cả mã BL### được tham chiếu trong UserStories.md (type=system) — chờ đến Wave 3+ (user-stories.md chưa được tạo ở W2)
- [ ] Tất cả mã BL### được tham chiếu trong FeatureList.md — chờ đến Wave 3+ (feature-list.md chưa được tạo ở W2)
- [x] Tất cả tham chiếu route liên quan đều hợp lệ (đã đối chiếu với `route-list.md`)
- [x] Tất cả tham chiếu data model liên quan đều hợp lệ (tên model khớp với tên entity trong `prisma/schema.prisma`: Permission, Role, User, Device, VerificationCode)
- [x] Không có tham chiếu behavior logic mồ côi
- [x] Mọi mục BL đều có trường Source File + Source Symbol (Rule C2)
- [x] Mọi đường dẫn Source File đều khớp 1-1 với các entry trong `## Background Logic Source Inventory` của scout (Rule C2/C3)

---

## Client-Side Logic

`N/A — không có code client-side nào trong repo này (headless backend API; đã xác nhận trong screen-list.md).` Điều này bao trùm Debounce/Throttle, Optimistic UI, Polling, Upload Progress (phía client), và Realtime — tất cả đều cần một runtime trình duyệt/client mà repo này không có. Lưu ý: `S3Service.uploadLargeFileFromDisk`/`uploadLargeFileFromBuffer` (`BL004`) triển khai theo dõi tiến trình multipart-upload ở *phía server*, qua `progressCallback` — đây là một mối quan tâm backend riêng đã được ghi ở `BL004`, không phải một pattern phía client.
