# Tổng quan hệ thống

**Dự án**: ecom (API dự án thương mại điện tử) — `package.json:2-3`
**Được tạo**: 2026-09-12
**Loại kiến trúc**: Monolith mô-đun — API REST headless (module NestJS phân lớp: Controller → Service → Repository/Prisma), không có frontend, không tách microservices.

## Tóm tắt

`ecom` là backend thương mại điện tử headless xây trên NestJS 11 + Prisma 6 + PostgreSQL 15 (`package.json:41-69`, `prisma/schema.prisma:9-12`, `docker-compose.yml:6`). Nó chỉ expose một API REST — không có UI, không render template, không có lớp view `.tsx`/`.vue`/`.html` nào trong cả cây thư mục (`plans/260912-0113-rebuild-spec/artifacts/scout-report.md:263`). Mười bốn module route `@Controller()` phủ auth, catalog (product/brand/category + bản dịch i18n), upload media, RBAC (role/permission), profile người dùng và quản lý ngôn ngữ (`src/routes/route.module.ts:17-33`).

Data model (`prisma/schema.prisma`, 21 khối model) rộng hơn phần API đã expose: `Order`, `Review`, `CartItem`, `Message`, `PaymentTransaction` và `Device` đều có model Prisma và quan hệ nhưng **không** có `@Controller()` tương ứng dưới `src/routes/**` — giỏ hàng/thanh toán/đơn hàng/đánh giá/nhắn tin đã được model hóa trong schema nhưng chưa nối vào route. [UNVERIFIED — không xác nhận được đây là phần đã lên kế hoạch nhưng chưa xây, hay đã bị bỏ; không có route, repository hay service nào tham chiếu tới chúng ngoài chính `schema.prisma`.]

Auth là JWT tự viết (access token + refresh token xoay vòng, HS256) cộng Google OAuth2 Authorization-Code flow, 2FA dựa trên TOTP, và xác minh OTP qua email bằng Resend (`src/shared/services/token.service.ts:25-49`, `src/routes/auth/google.service.ts`, `docs/google-oauth-login-flow.md`). Phân quyền dùng RBAC: `Role` ↔ `Permission` (cặp path+method) được resolve theo từng request dựa trên `roleId` trong JWT của caller (`src/shared/guards/access-token.guard.ts:56-99`, `prisma/schema.prisma:182-225`). Có ba role seed sẵn: `admin`, `client`, `seller` (`src/constants/role.constant.ts:2-6`).

File media được lưu trên AWS S3 (`src/shared/services/s3.service.ts`); chuỗi i18n nằm trong các catalog JSON của `nestjs-i18n` (`src/i18n/en/`, `src/i18n/vn/`) chứ không hard-code trong code. Deploy dùng Docker build 3 giai đoạn (deps → build → runtime `node:24.14.1-alpine` slim), điều khiển bởi `docker-compose.yml`, với Postgres chạy chung như một service. CI chạy qua `.github/workflows/ci.yml` với các action cài pnpm/Prisma (`.github/actions/pnpm-install/`, `.github/actions/prisma-setup/`).

Chi tiết từng tính năng, ánh xạ quyền và data model đầy đủ, xem `feature-list.md`, `permissions.md` và `data-model.md` khi các artifact đó xuất hiện trong cùng thư mục.

## Quyết định thiết kế chính

### Quyết định 1: Một hệ thống validate, một khuôn dạng response lỗi

**Bối cảnh**: Trước đây codebase mang song song hai stack validate — DTO của `class-validator`/`class-transformer` chạy qua `ValidationPipe` global của Nest, và `ZodValidationPipe`/`ZodSerializerInterceptor` của `nestjs-zod` đăng ký global làm `APP_PIPE`/`APP_INTERCEPTOR`. Kết quả là bốn kiểu body lỗi không đồng nhất tới client, tùy vào thành phần nào xử lý lỗi.

**Quyết định**: `nestjs-zod` bị gỡ khỏi pipeline HTTP và khỏi `package.json`. `ValidationPipe` của `class-validator` (`src/shared/utils/validation-pipe.config.ts`) giờ là hệ thống validate duy nhất, đăng ký làm `APP_PIPE` trong `src/shared/modules/base.module.ts:52-55`. Hai exception filter cũ (`ExternalExceptionFilter`, `PrismaClientExceptionFilter`) được gộp thành một `GlobalExceptionFilter` (`@Catch()`, không tham số, `src/shared/filters/global-exception.filter.ts`) điều phối tới các mapper thuần túy, nhờ vậy mọi response lỗi giờ dùng chung một khuôn dạng (`statusCode`, `error`, `message`, `details`, `requestId`). `src/main.ts` không còn cấu hình pipe hay filter nào nữa — cả hai đều là provider của `BaseModule`, đó là lý do e2e harness (`test/e2e/support/create-test-app.ts`) nhận đúng contract lỗi của production chỉ bằng cách import `AppModule`.

**Lý do**: Một hệ thống validate duy nhất và một nơi ghi response duy nhất nghĩa là hình dạng response không còn phụ thuộc vào thứ tự đăng ký `APP_FILTER`/`APP_PIPE` hay việc thư viện nào ném lỗi trước. Xem `docs/error-handling.md` để biết contract đầy đủ, các phần tạo nên nó, và cách thêm một lỗi mới. `zod` độc lập vẫn được dùng trong `GoogleService` để parse blob `state` của OAuth (`src/routes/auth/google.service.ts`) — đây không phải validate HTTP nên không bị ảnh hưởng bởi quyết định này.

### Quyết định 2: RBAC tự viết qua các dòng Permission theo từng route, không dùng bản đồ role→scope cố định

**Bối cảnh**: Mỗi request đi qua `AuthorizationHeaderGuard` global (`APP_GUARD`, `src/shared/modules/base.module.ts:39-43`) đều được kiểm tra với bảng `Permission` khóa theo đúng cặp `(path, method)`, join với `Role`, join với `User.roleId` (`prisma/schema.prisma:182-225`, `access-token.guard.ts:56-99`).

**Quyết định**: Phân quyền được điều khiển bởi dữ liệu (dòng DB), không khai báo bằng code (decorator `@Roles()` + kiểm tra enum), và permission được seed qua một script riêng thay vì migration (`initial-scripts/create-permission.ts`, `README.md:33-44`).

**Lý do**: Cho phép ops thêm/thu hồi quyền theo từng route mà không cần redeploy; đổi lại là một round-trip DB `role.findUniqueOrThrow` thêm trên mỗi request đã xác thực (`access-token.guard.ts:65-81`) và một seed script phải chạy lại mỗi khi thêm route mới — không có CI nào bắt buộc route controller mới phải có dòng `Permission` seed tương ứng. [INFERRED từ code guard + seed script; không có doc nào nêu rõ trade-off này.]

## Tổng quan bảo mật

- **Xác thực**: JWT stateless, HS256, mô hình hai token — access token (mặc định 5 phút, `ACCESS_TOKEN_EXPIRES_IN`) không lưu DB, refresh token (mặc định 1 ngày, `REFRESH_TOKEN_EXPIRES_IN`) lưu trong bảng `RefreshToken` và xoay vòng (dùng một lần, soft-delete sau khi dùng) (`token.service.ts:25-49`, `prisma/schema.prisma:169-180`, `docs/google-oauth-login-flow.md` §4.3). Các flow bổ sung: 2FA TOTP (`src/shared/services/2fa.service.ts`, dep `otpauth`), OTP email qua Resend cho đăng ký/quên mật khẩu/đăng nhập/tắt 2FA (`prisma/schema.prisma:542-547`, enum `VerificationCodeType`), và Google OAuth2 Authorization-Code flow với trao đổi token phía server (`src/routes/auth/google.service.ts`).
- **Phân quyền**: RBAC, dựa trên DB, mỗi dòng `Permission` (path, method) được resolve theo `roleId` của caller trên mỗi request (`access-token.guard.ts:56-99`); `AuthorizationHeaderGuard` hỗ trợ BEARER / API_KEY / NONE theo từng handler qua metadata reflect, kết hợp AND/OR (`authorization-header.guard.ts:25-81`).
- **Mã hóa dữ liệu**: Mật khẩu hash bằng bcrypt, 10 salt round (`hashing.service.ts:4-12`). JWT secret và API key tĩnh là chuỗi env thuần, **không rotate, không tích hợp KMS** (`env.validation.ts:27-40`). Không thấy mã hóa cấp field-at-rest trong schema (mã hóa TLS/at-rest, nếu có, thuộc về lớp Postgres/infra, ngoài phạm vi codebase này — [UNVERIFIED]).
- **Bảo mật API**: `ValidationPipe` global (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`), là hệ thống validate HTTP duy nhất, đăng ký làm `APP_PIPE` trong `base.module.ts:52-55` (`src/shared/utils/validation-pipe.config.ts`). CORS hard-code chỉ một origin `http://localhost:3000`, không có override qua env (`main.ts:20-25`) — **sẽ âm thầm chỉ chặn/cho phép đúng origin đó ở mọi môi trường kể cả production** trừ khi đổi trước khi deploy. Không thấy rate-limiting hay dep `@nestjs/throttler` trong `package.json`. Không có API prefix global (`docs/google-oauth-login-flow.md:419`).

**Rủi ro bảo mật đã xác định, có bằng chứng trong code** (nêu tại `docs/google-oauth-login-flow.md` §7, do chính developer của dự án viết trên đúng codebase này — nguồn first-party, độ tin cậy cao):
1. `ApiKeyGuard` so header `SECRET_API_KEY` với một literal hard-code `"secretApiKey"`, không phải giá trị env đã cấu hình — dòng `appConfigService.get("SECRET_API_KEY")` vẫn còn nhưng bị comment (`src/shared/guards/api-key.guard.ts:20-27`). Đường xác thực bằng API key coi như không hoạt động/bị bypass với cấu hình hiện tại.
2. User tạo qua Google login nhận một mật khẩu hard-code dùng chung `"changeme"` (đã hash), cho phép kẻ tấn công biết/đoán được email đã liên kết Google đăng nhập qua `POST /auth/login`, bỏ qua hoàn toàn Google (`google.service.ts:16,124`, `docs/google-oauth-login-flow.md` §7.1).
3. Tham số `state` của OAuth là JSON base64 không ký — callback OAuth không có bảo vệ CSRF (`docs/google-oauth-login-flow.md` §7.2).
4. Access/refresh token trả về qua **query string** khi redirect ở callback Google OAuth, lộ ra lịch sử trình duyệt, log truy cập của proxy, và rò rỉ qua `Referer` (`docs/google-oauth-login-flow.md` §7.4, §5b).
5. `.env.example` chứa sẵn các secret mẫu yếu (`ACCESS_TOKEN_SECRET=crud_dxt`) trông như default dev thật — phải đổi trước khi deploy thật (`.env.example:4,6,8`).

## Khả năng mở rộng

- **Năng lực hiện tại**: Stack Docker Compose một instance — một container `app`, một container `db`, không load balancer, không read replica, không có lớp cache (Redis, v.v.) trong `docker-compose.yml` hay dependency của `package.json`. Không được thiết kế để scale ngang với cấu hình hiện tại. [INFERRED từ việc không có dependency cache/queue nào và file compose chỉ một service.]
- **Chiến lược scale**: [UNVERIFIED] — không có config autoscaling, không có manifest k8s, không có hạ tầng queue/worker (scout report xác nhận không tìm thấy logic nền dạng `queue-worker`/`scheduled-job` nào). Scale ngang container `app` sau một LB ngoài là khả thi về mặt kiến trúc (JWT stateless, không giữ session trong memory) nhưng repo này chưa cấu hình việc đó.
- **Mục tiêu hiệu năng**: [UNVERIFIED] — không tìm thấy SLA, mục tiêu độ trễ, hay artifact load-test nào trong repo.
