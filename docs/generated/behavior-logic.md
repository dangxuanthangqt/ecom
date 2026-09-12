---
authored_by: rebuild-spec
---
<!-- layout-exempt: rebuild-spec owns all docs/system|features|generated|flows paths -->
# Behavior Logic

**Project**: ecom (NestJS backend)
**Generated**: 2026-09-12
**Analysis Scope**: full repository — `## Background Logic Source Inventory` in `scout-report.md` (13 entries, authoritative)

**Code Format**: `BL###_NameSlug`

**Behavior Logic Types present**: `custom-command` (2), `integration` (2), `mail` (1), `middleware` (7), `observer` (1). Absent (verified `_(none found)_` in scout inventory): `scheduled-job`, `queue-worker`, `event-listener`, `notification`, `webhook`.

**Note**: Auth/permission guards (`AccessTokenGuard`, `ApiKeyGuard`, `AuthorizationHeaderGuard`) are excluded here — see `permissions.md`.

---

## Behavior Logic Index

### Type: custom-command

| Code | Name | Trigger | Payload | File Schema |
|------|------|---------|---------|--------------|
| BL001_SyncRoutePermissionsScript | pnpm script `seed:initial-scripts:create-permission` (manual ts-node invocation) | N/A — not event/notification | N/A — not a file-exchange type |
| BL002_SeedAdminUserScript | pnpm script `seed:initial-scripts` (manual ts-node invocation) | N/A — not event/notification | N/A — not a file-exchange type |

### Type: integration

| Code | Name | Trigger | Payload | File Schema |
|------|------|---------|---------|--------------|
| BL003_GoogleOAuthLogin | Incoming `GET /auth/google/authorization-url` and `GET /auth/google/callback` | N/A — not event/notification | N/A — not a file-exchange type |
| BL004_S3ObjectStorage | Called from `MediaService`/`MediaController` handlers on file upload/delete/presign requests | N/A — not event/notification | N/A — not a file-exchange type |

### Type: mail

| Code | Name | Trigger | Payload | File Schema |
|------|------|---------|---------|--------------|
| BL005_SendVerificationCodeEmail | Registered provider; call site (`AuthService.sendOTP`) currently commented out — see Description | N/A — not event/notification | N/A — not a file-exchange type |

### Type: middleware

| Code | Name | Trigger | Payload | File Schema |
|------|------|---------|---------|--------------|
| BL006_ExternalExceptionFilter | Any `HttpException` (incl. Zod validation/serialization) thrown by any handler — global `APP_FILTER` | N/A — not event/notification | N/A — not a file-exchange type |
| BL007_PrismaClientExceptionFilter | Any Prisma client error thrown by any handler — global `APP_FILTER` | N/A — not event/notification | N/A — not a file-exchange type |
| BL008_ResponseTransformInterceptor | Every successful response — global `APP_INTERCEPTOR` | N/A — not event/notification | N/A — not a file-exchange type |
| BL009_ArrayFilesValidationPipe | Applied inline in `MediaController.uploadArrayOfImages` (`POST /media/upload/array-of-images`) | N/A — not event/notification | N/A — not a file-exchange type |
| BL010_ImageValidationPipe | Not currently attached to any live handler — see Description | N/A — not event/notification | N/A — not a file-exchange type |
| BL011_MultipleFilesValidationPipe | Applied inline in `MediaController.uploadMultipleImages` (`POST /media/upload/multiple-images`) | N/A — not event/notification | N/A — not a file-exchange type |
| BL012_SingleImageDiskInterceptorFactory | `@UseInterceptors()` on `MediaController.uploadLargeImageFromDisk` (`POST /media/upload/image`) | N/A — not event/notification | N/A — not a file-exchange type |

### Type: observer

| Code | Name | Trigger | Payload | File Schema |
|------|------|---------|---------|--------------|
| BL013_PrismaClientLifecycleObserver | Nest module lifecycle (`OnModuleInit`/`OnModuleDestroy`) | N/A — not event/notification | N/A — not a file-exchange type |

---

## Dev Appendix

### Cardinality Contract

Same as `templates/behavior-logic-template.md § Cardinality Contract` (Rules C1–C3). This artifact emits exactly 13 BL items — one per `scout-report.md § Background Logic Source Inventory` entry, no aggregation, no split beyond what the inventory already enumerates.

---

## BL001_SyncRoutePermissionsScript

**Type**: custom-command
**Trigger**: Manual `pnpm run seed:initial-scripts:create-permission` (`NODE_ENV=development ts-node initial-scripts/create-permission`) — no HTTP surface, no scheduler
**Source File**: initial-scripts/create-permission.ts
**Source Symbol**: module::bootstrap

### Description

Boots a full Nest app (`NestFactory.create(AppModule)`), listens on port 3010, then reads the live Express router stack (`app.getHttpAdapter().getInstance().router.stack`) to enumerate every registered `(method, path)` route (`initial-scripts/create-permission.ts:41-72`). Diffs that live route set against the `permission` table: deletes any DB permission row whose `(method, path)` no longer matches a live route (`:84-98`), inserts any live route missing from the DB (`:100-110`, `skipDuplicates: true`). Then re-reads all non-deleted permissions and re-assigns each of `SELLER`/`CLIENT`/`ADMIN` roles' `permissions` relation via `role.update({ data: { permissions: { set: [...] } } })` (`:149-192`), filtering by a hardcoded module allow-list per role (`SellerModule`/`ClientModule` arrays, `:14-30`; `ADMIN` gets the unfiltered full permission set because it has no entry in the `Module` map, `:158-160`). This is the mechanism that keeps `role.permissions` — the table `AccessTokenGuard` checks at runtime (see `route-list.md`) — in sync with actual controller routes.

**[UNVERIFIED]**: no CI/CD step or npm postinstall hook was found wiring this script into deploy; it is invoked manually per `package.json` script name.

### Related Modules

- src/app.module.ts (bootstrapped whole-app instance)
- src/shared/services/prisma.service.ts

### Related Routes

- (ALL) every route in `route-list.md` — this script reads the live router table, so it is coupled to all 70 routes, not one

### Related Data Models

- MODEL: Permission
- MODEL: Role

---

## BL002_SeedAdminUserScript

**Type**: custom-command
**Trigger**: Manual `pnpm run seed:initial-scripts` (`ts-node initial-scripts`) — one-shot bootstrap, run once per fresh environment
**Source File**: initial-scripts/index.ts
**Source Symbol**: module::main

### Description

Loads `.env.{NODE_ENV}` (`:10`), guards against re-running on a seeded DB (`throw new Error("Roles already exist")` if `role.count() > 0`, `:31-35`), then creates the three fixed roles (`ADMIN`, `CLIENT`, `SELLER`, `:37-53`) and one admin user from `ADMIN_NAME`/`ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_PHONE_NUMBER` env vars, validated via a `class-validator` DTO (`AdminUserSchema`, `:16-28`) and password-hashed via `HashingService` (`:68`) before insert (`:70-78`). This is the only path that creates the initial `ADMIN` role and its first user — every other admin account is created downstream of this seed.

### Related Modules

- src/shared/services/hashing.service.ts
- src/shared/services/prisma.service.ts

### Related Routes

- N/A — standalone script, no route

### Related Data Models

- MODEL: Role
- MODEL: User

---

## BL003_GoogleOAuthLogin

**Type**: integration
**Trigger**: `GET /auth/google/authorization-url` (ROUTE006) generates the redirect URL; `GET /auth/google/callback` (ROUTE007) receives Google's redirect and completes login
**Source File**: src/routes/auth/google.service.ts
**Source Symbol**: GoogleService

### Description

Wraps `google-auth-library`'s `OAuth2Client` (constructed once in the constructor from `googleClientId`/`googleClientSecret`/`googleRedirectUri` config, `:32-39`). `getAuthorizationUrl()` (`:49-67`) base64-encodes `{userAgent, ip}` into an opaque `state` param and builds the Google consent URL with `access_type: "offline"` + email/profile scopes. `googleCallback(code, state)` (`:76-156`) decodes and Zod-validates the `state` payload (`:77-87`), exchanges `code` for tokens (`oauth2Client.getToken`, `:90`), fetches the Google profile (`oauth2.userinfo.get()`, `:99`), then either finds the existing user by email or auto-provisions a new one with role `CLIENT` and a fixed placeholder password (`DEFAULT_PASSWORD = "changeme"`, hashed, `:16`, `:119-130`) — a business rule worth flagging: Google-provisioned accounts get a known, non-random local password. Registers a `Device` row for the login session (`:133-138`) and issues app JWTs via `AuthService.generateTokens` (`:140-145`). Any error in this path is swallowed into a generic `"Invalid state data."` 500 (`:148-155`) — the real cause (e.g. Google API failure vs. bad state) is only visible in the server log.

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
**Trigger**: Called synchronously from `MediaService`/`MediaController` on each media upload, presign, or delete request
**Source File**: src/shared/services/s3.service.ts
**Source Symbol**: S3Service

### Description

AWS S3 client wrapper (`@aws-sdk/client-s3`, `@aws-sdk/lib-storage`, `@aws-sdk/s3-request-presigner`) constructed from `s3Region`/`s3AccessKey`/`s3SecretKey` config (`:29-38`), self-checks connectivity on construction via `listBuckets()` (`:40-48`). Exposes: disk-stream upload with progress tracking for large files (`uploadLargeFileFromDisk`, multipart via `Upload`, `:75-185`), simple disk-stream upload for small files (`uploadSimpleFileFromDisk`, `:190-254`), buffer-based simple/multipart upload (`uploadFileFromBuffer`/`uploadLargeFileFromBuffer`, `:321-464`) with an auto-selecting wrapper switching at a 100MB threshold (`smartUploadFromBuffer`, `:503-546`), object deletion (`deleteFile`, `:469-496`), and presigned URL generation for both download (`generatePresignedDownloadUrl`, `:552-608`) and upload (`generatePresignedUploadUrl`, `:610-665`). All objects are stored with `ServerSideEncryption: "AES256"` and a `Metadata.uploadedAt` timestamp. `getPublicUrl()` (`:51-70`) constructs a direct public S3 URL — the code comment explicitly notes the bucket must be configured for public read, i.e. objects are NOT private-by-default from this service's perspective. File existence is checked pre-delete/pre-presign via `checkFileExists()` (`:671-708`), which treats `S3ServiceException` with `404`/`NoSuchKey` as "does not exist" and anything else as a hard error. Every public method wraps failures in `throwHttpException({type: "internal", ...})`, discarding the original AWS error detail from the HTTP response (though it is logged).

**[SIGNAL_INFERRED]** — this file was independently identified in scout's inventory as `integration`; confirmed here by direct read of the external SDK client construction.

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

- N/A — no direct Prisma model; operates on S3 object keys only

---

## BL005_SendVerificationCodeEmail

**Type**: mail
**Trigger**: Intended call site: OTP send flow (`AuthService.sendOTP`) — see Description for current wiring status
**Source File**: src/shared/services/email.service.ts
**Source Symbol**: EmailService::sendEmail

### Description

Thin wrapper around the Resend SDK (`resend.emails.send`, `:16-21`), hardcoded `from: "onboarding@resend.dev"` sender and a plain `<p>{code}</p>` HTML body carrying a verification code. **[UNVERIFIED]/finding**: `EmailService` is registered as a provider in `shared.module.ts` but its only call site, `AuthService.sendOTP` (`src/routes/auth/auth.service.ts:430-432`), is commented out — the OTP flow (`POST /auth/otp`, ROUTE005) currently creates a `VerificationCode` DB row (`auth.service.ts:421-429`) but does not actually email it to the user. This is either dead code awaiting re-enablement or a functional gap; flagging for feature-spec/BA follow-up rather than asserting either reading.

### Related Modules

- src/routes/auth/auth.service.ts (intended caller, currently disconnected)
- src/shared/services/app-config.service.ts

### Related Routes

- (POST) /auth/otp — intended trigger route; call currently dead (see Description)

### Related Data Models

- MODEL: VerificationCode (populated regardless of whether the email actually sends)

---

## BL006_ExternalExceptionFilter

**Type**: middleware
**Trigger**: Any `HttpException` thrown by any route handler (registered `@Catch(HttpException)`, global `APP_FILTER` in `src/shared/modules/base.module.ts`)
**Source File**: src/shared/filters/external-exception.filter.ts
**Source Symbol**: ExternalExceptionFilter::catch

### Description

Normalizes every uncaught `HttpException` (and the Zod-specific subclasses `ZodValidationException`/`ZodSerializationException` from `nestjs-zod`) into a single `DefaultExceptionDto` response shape (`statusCode`, `message`). For Zod exceptions it extracts `exception.getZodError().message` (`:29-38`); for all other `HttpException`s it reads `exception.getResponse()` and falls back to `exception.message` (`:40-47`). Logs the exception class name, timestamp, status, and message plus the full stack (`:49-52`) before writing the JSON response (`:55`). This is the process-wide error-shape contract every one of the 70 routes' error responses conforms to.

### Related Modules

- src/dtos/default-exception.dto.ts
- src/shared/modules/base.module.ts (registration site)

### Related Routes

- (ALL) every route in `route-list.md`

### Related Data Models

- N/A

---

## BL007_PrismaClientExceptionFilter

**Type**: middleware
**Trigger**: Any of `PrismaClientInitializationError`/`ValidationError`/`KnownRequestError`/`UnknownRequestError`/`RustPanicError` thrown during a Prisma call (registered `@Catch(...)`, global `APP_FILTER`)
**Source File**: src/shared/filters/prisma-exception.filter.ts
**Source Symbol**: PrismaClientExceptionFilter::catch

### Description

Maps Prisma error codes to HTTP status + message via a static lookup table `HTTP_CODE_FROM_PRISMA` (`:12-59`) — e.g. `P2002` (unique constraint) → 409 "Reference Data already exists.", `P2025` (record not found) → 404, `P1008` (timeout) → 408. Unmapped codes fall back to a generic 500 (`:96-100`). Extracts a trimmed diagnostic snippet from the raw Prisma error message (everything after the `→` arrow Prisma includes in its error text, `:117-123`) for logging, while the HTTP response body carries only the mapped generic message — raw Prisma internals never reach the client.

### Related Modules

- src/shared/modules/base.module.ts (registration site)

### Related Routes

- (ALL) every route that touches Prisma — effectively all 70 routes except pure-auth-token routes

### Related Data Models

- N/A — cross-cutting, not model-specific

---

## BL008_ResponseTransformInterceptor

**Type**: middleware
**Trigger**: Every successful (non-thrown) handler response (global `APP_INTERCEPTOR` in `src/shared/modules/base.module.ts`)
**Source File**: src/shared/interceptors/transform.interceptor.ts
**Source Symbol**: TransformInterceptor::intercept

### Description

Wraps every successful handler return value in a `{ data, statusCode }` envelope (`:20-31`) via RxJS `map` on the response stream, reading `response.statusCode` off the raw Express `ServerResponse`. This is the uniform success-response contract for all 70 routes — paired with `BL006`/`BL007` for the error side, together they define the whole API's response envelope.

### Related Modules

- src/shared/modules/base.module.ts (registration site)

### Related Routes

- (ALL) every route in `route-list.md`

### Related Data Models

- N/A

---

## BL009_ArrayFilesValidationPipe

**Type**: middleware
**Trigger**: Explicit `new ArrayFilesValidationPipe({...})` pipe instantiated inline in `MediaController.uploadArrayOfImages` (`media.controller.ts:104`)
**Source File**: src/shared/pipes/array-images-validation.pipe.ts
**Source Symbol**: ArrayFilesValidationPipe::transform

### Description

Validates an array of uploaded files against configurable bounds (defaults: `maxCount=10`, `minCount=1`, `maxSize=5MB`, `minSize=1KB`, MIME allow-list `image/jpeg|png|gif|webp`, extension allow-list `.jpg/.jpeg/.png/.gif/.webp`, `:22-29`). Rejects (via `throwHttpException({type:"badRequest",...})`) on: empty array, over/under count, any file failing per-file size/MIME/extension/name checks, filename >255 chars, or aggregate total size >50MB (`:157-169`). This is the business rule set for the bulk-image-upload endpoint (`POST /media/upload/array-of-images`).

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
**Trigger**: Not currently attached to any live route — its only import site in `media.controller.ts:27` (`ImageValidationPipe`) and usage at `:84` are both commented out
**Source File**: src/shared/pipes/image-validation.pipe.ts
**Source Symbol**: ImageValidationPipe::transform

### Description

Single-file validator: rejects missing file, size outside 1KB–5MB, disallowed MIME type (`jpeg/png/gif/webp/svg+xml`), missing filename, or disallowed extension (`.jpg/.jpeg/.png/.gif/.webp/.svg`) via `BadRequestException` (`:16-63`). A commented-out magic-number (file-signature) check is present but inactive (`:65-89`). Per Rule C1 this is emitted as its own BL item because it is a distinct file in the scout inventory, even though it is currently dead code (superseded by `BL009`/`BL011` at the only route that used to reference it, `uploadImageFromBuffer`, which is itself commented out in `media.controller.ts:82-88` per `route-list.md`'s dead-code note).

### Related Modules

- src/routes/media/media.controller.ts (commented-out reference only)

### Related Routes

- N/A — no live route currently applies this pipe

### Related Data Models

- N/A

---

## BL011_MultipleFilesValidationPipe

**Type**: middleware
**Trigger**: Explicit `new MultipleFilesValidationPipe({...})` pipe instantiated inline in `MediaController.uploadMultipleImages` (`media.controller.ts:150`)
**Source File**: src/shared/pipes/multiple-images-validation.pipe.ts
**Source Symbol**: MultipleFilesValidationPipe::transform

### Description

Per-field-name multi-file validator, configured via a `FileFieldsConfig` map (`:5-13`) — each field can specify its own `maxCount`, `maxSize`, `allowedMimeTypes`, `allowedExtensions`, `required`. Rejects (via `throwHttpException`) on: missing required field, per-field over-count, per-file size/MIME/extension/name violations (`:23-114`), and any field present in the request that isn't declared in the config (`:118-130`) — the last rule makes this pipe strict about unexpected form fields, unlike `BL009`. Drives the business rules for the multi-field image upload endpoint (`POST /media/upload/multiple-images`).

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
**Trigger**: `@UseInterceptors(createSingleImageDiskInterceptor("image"))` on `MediaController.uploadLargeImageFromDisk` (`media.controller.ts:72`)
**Source File**: src/shared/utils/files/single-image-interceptor.util.ts
**Source Symbol**: module::createSingleImageDiskInterceptor

### Description

Factory producing a Nest `FileInterceptor` configured with Multer disk storage. `fileFilter` (`:52-79`) rejects (via `BadRequestException`) any file whose MIME type or extension isn't in the `image/jpeg|png|gif|webp` / `.jpg/.jpeg/.png/.gif/.webp` allow-lists — explicitly documented in an inline code comment (`:28-50`) that file *size* cannot be checked at this stage because Multer's `fileFilter` runs before the file body is streamed; size limiting is deferred to Multer's `limits.fileSize` option (default `FILE_SIZE_LIMITS.IMAGE_5MB = 5MB`, `:11-17`, `108`). `createDiskStorage()` (`:82-99`) auto-creates the destination directory if missing and generates a unique filename as `{original}_{timestamp}{ext}`. Three named factory variants are exported: `createSingleImageInterceptor` (caller picks storage), `createSingleImageMemoryInterceptor` (forces memory storage), `createSingleImageDiskInterceptor` (forces disk storage, the one actually used by `media.controller.ts`).

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
**Trigger**: Nest module lifecycle — `onModuleInit` fires once at app bootstrap; `onModuleDestroy` fires once at app shutdown
**Source File**: src/shared/services/prisma.service.ts
**Source Symbol**: PrismaService::onModuleInit

### Description

`PrismaService extends PrismaClient implements OnModuleInit` (`:5`). `onModuleInit()` calls `this.$connect()` and logs success, or logs+rethrows on failure — a connection failure here aborts app startup (`:8-16`). `onModuleDestroy()` calls `this.$disconnect()` on shutdown (`:18-21`). This is the single lifecycle hook governing the DB connection for every repository/service in the app (all 13 repositories inject this service transitively).

### Related Modules

- All 13 files under src/repositories/**

### Related Routes

- (ALL) every route that touches the database — effectively all 70 routes

### Related Data Models

- N/A — cross-cutting connection lifecycle, not model-specific

---

## Summary

- **Total Behavior Logic Items**: 13
- **By Type**: custom-command: 2, event-listener: 0, integration: 2, mail: 1, middleware: 7, notification: 0, observer: 1, queue-worker: 0, scheduled-job: 0, webhook: 0

---

## Cross-Reference Validation

- [x] All BL### codes are unique
- [ ] All BL### codes are referenced in UserStories.md (type=system) — pending Wave 3+ (user-stories.md not yet generated at W2)
- [ ] All BL### codes are referenced in FeatureList.md — pending Wave 3+ (feature-list.md not yet generated at W2)
- [x] All related route references are valid (cross-checked against `route-list.md`)
- [x] All related data model references are valid (model names match `prisma/schema.prisma` entity names: Permission, Role, User, Device, VerificationCode)
- [x] No orphaned behavior logic references
- [x] All BL items have Source File + Source Symbol fields (Rule C2)
- [x] All Source File paths match scout `## Background Logic Source Inventory` entries 1-to-1 (Rule C2/C3)

---

## Client-Side Logic

`N/A — no client-side code exists in this repository (headless backend API; verified in screen-list.md).` This covers Debounce/Throttle, Optimistic UI, Polling, Upload Progress (client-side), and Realtime — all require a browser/client runtime that does not exist here. Note: `S3Service.uploadLargeFileFromDisk`/`uploadLargeFileFromBuffer` (`BL004`) implement *server-side* multipart-upload progress tracking via `progressCallback`, which is a distinct backend concern already documented under `BL004` — not a client-side pattern.
