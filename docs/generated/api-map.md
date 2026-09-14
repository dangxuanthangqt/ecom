# API Map

**Project**: ecom (NestJS backend) | **Generated**: 2026-09-12
**Sources**: `route-list.md` (70 ROUTE### rows), `behavior-logic.md` (13 BL### items)

**Method**: per-route `Handler BL###` cells are filled only where `behavior-logic.md § Related Routes` names that exact route. Standard CRUD handlers (Brand, Category, Language, Permission, ProductTranslation, Role, User, etc.) have no BL### entry in the source — behavior-logic.md documents cross-cutting concerns (scripts, integrations, mail, middleware, one observer), not per-route business handlers. Those cells are `[UNMAPPED]` — this is the correct, expected shape, not a gap.

**Cross-cutting note (applies to ALL 70 routes, not repeated per row)**: `BL006_ExternalExceptionFilter` (HTTP error mapping) and `BL007_PrismaClientExceptionFilter` (Prisma error mapping) are superseded — both are now dispatched through one `GlobalExceptionFilter`, see `behavior-logic.md` and `docs/error-handling.md`. `BL008_ResponseTransformInterceptor` (success envelope) and `BL013_PrismaClientLifecycleObserver` (DB connection lifecycle) are unaffected. All four are global `APP_FILTER`/`APP_INTERCEPTOR` registrations in `src/shared/modules/base.module.ts` that wrap every route. They are listed once here rather than in every table row to avoid noise.

**Auth column key**: `public` = `@IsPublicApi()` present (auth skipped entirely); `Bearer` = default global `AuthorizationHeaderGuard` + `AccessTokenGuard` role-permission check on `(path, method)` against the `role.permissions` table (no PERM### codes exist in this artifact set — `permissions.md` was not in scope for this task).

## Endpoints by Domain

### Auth (`src/routes/auth/auth.controller.ts`, prefix `auth`)

| Method | Path | Handler BL### | Auth |
|--------|------|---------------|------|
| POST | /auth/register | [UNMAPPED] | public |
| POST | /auth/login | [UNMAPPED] | public |
| POST | /auth/refresh-token | [UNMAPPED] | public |
| POST | /auth/logout | [UNMAPPED] | Bearer |
| POST | /auth/otp | BL005_SendVerificationCodeEmail (intended trigger; call site currently commented out — see behavior-logic.md) | public |
| GET | /auth/google/authorization-url | BL003_GoogleOAuthLogin | public |
| GET | /auth/google/callback | BL003_GoogleOAuthLogin | public |
| POST | /auth/forgot-password | [UNMAPPED] | public |
| POST | /auth/2fa/enable | [UNMAPPED] | Bearer |
| POST | /auth/2fa/disable | [UNMAPPED] | Bearer |

### Brand (`src/routes/brand/brand.controller.ts`, prefix `brands`)

| Method | Path | Handler BL### | Auth |
|--------|------|---------------|------|
| GET | /brands | [UNMAPPED] | public |
| GET | /brands/:id | [UNMAPPED] | Bearer [UNVERIFIED: swagger-labeled `@ApiPublic` but no `@IsPublicApi()` — runtime requires Bearer per route-list.md] |
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

### Permission (`src/routes/permission/permission.controller.ts`, prefix `permissions`)

| Method | Path | Handler BL### | Auth |
|--------|------|---------------|------|
| GET | /permissions | [UNMAPPED] | Bearer |
| GET | /permissions/:id | [UNMAPPED] | Bearer |
| POST | /permissions | [UNMAPPED] | Bearer |
| PUT | /permissions/:id | [UNMAPPED] | Bearer |
| DELETE | /permissions/:id | [UNMAPPED] | Bearer |

### Product Translation (`src/routes/product-translation/product-translation.controller.ts`, prefix `product-translations`)

| Method | Path | Handler BL### | Auth |
|--------|------|---------------|------|
| GET | /product-translations | [UNMAPPED] | Bearer |
| GET | /product-translations/:id | [UNMAPPED] | Bearer |
| POST | /product-translations | [UNMAPPED] | Bearer |
| PUT | /product-translations/:id | [UNMAPPED] | Bearer |
| DELETE | /product-translations/:id | [UNMAPPED] | Bearer |

### Product — public catalog (`src/routes/product/product.controller.ts`, prefix `products`)

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

### Order — buyer (`src/routes/order/order.controller.ts`, prefix `orders`)

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

## Mapping Summary

- 85 routes total (70 original + 15 added 2026-09-12 for cart/order/review). 8 mapped to a specific BL### (ROUTE005–BL005 intended-but-dead, ROUTE006/007–BL003, ROUTE036–BL004+BL012, ROUTE037–BL004+BL009, ROUTE038–BL004+BL011, ROUTE039–BL004, ROUTE040–BL004). 77 routes `[UNMAPPED]` — standard CRUD/business-service routes with no distinct entry in the 13-item BL inventory (`behavior-logic.md` was not re-generated in this pass; the new cart/order/review business rules — stock decrement, snapshot freezing, status transitions — are documented as BR-C##/BR-O##/BR-R## in the F011/F012/F013 feature specs instead of as BL### items).
- BL001_SyncRoutePermissionsScript and BL002_SeedAdminUserScript have `Related Routes: N/A` in behavior-logic.md (standalone scripts, not tied to any HTTP route) — correctly excluded from all route rows above.
- BL010_ImageValidationPipe is dead code (no live route references it per behavior-logic.md) — correctly excluded from all route rows above.
- BL006/BL007/BL008/BL013 apply globally to all 70 routes as cross-cutting middleware/lifecycle — documented once above rather than duplicated into every row (see "Cross-cutting note").

## Background Jobs

No data — scout-report verified zero `@Cron`/`@Interval`/`@Process`/`@OnEvent` decorators and no Bull/BullMQ dependency in the codebase (per `behavior-logic.md`: `scheduled-job`, `queue-worker`, `event-listener` types are all "absent (verified `_(none found)_` in scout inventory)"). `BL001`/`BL002` are one-shot manual `pnpm`/`ts-node` scripts (custom-command type), not scheduled jobs — no cron expression exists for either.

## Webhooks / External Calls

No data for incoming webhooks — scout-report verified zero webhook-type entries in the Background Logic Source Inventory (`behavior-logic.md`: webhook type "absent (verified `_(none found)_`)").

Outgoing external integrations exist (both already captured as `integration`-type BL items, not webhooks):

| Direction | Target / Source | Event / Endpoint | Description |
|-----------|----------------|------------------|-------------|
| outgoing | Google OAuth2 (`google-auth-library`) | `GET /auth/google/authorization-url`, `GET /auth/google/callback` | BL003_GoogleOAuthLogin — builds Google consent URL, exchanges auth code for tokens, fetches profile, auto-provisions `CLIENT` user on first login |
| outgoing | AWS S3 (`@aws-sdk/client-s3`) | upload / delete / presign calls from `MediaService` | BL004_S3ObjectStorage — disk/buffer upload (simple + multipart), object deletion, presigned URL generation (download + upload) |
| outgoing (dead/unwired) | Resend (email API) | intended: `POST /auth/otp` verification email | BL005_SendVerificationCodeEmail — provider registered, call site in `AuthService.sendOTP` is commented out (`auth.service.ts:430-432`); DB row created but email not actually sent |

**Status:** DONE_WITH_CONCERNS
**Summary:** ApiMap synthesized: 70 routes grouped into 14 domain tables with BL### mapping (8 routes mapped, 62 `[UNMAPPED]` — expected since behavior-logic.md covers cross-cutting concerns, not per-route CRUD handlers), Background Jobs and Webhooks sections filled with explicit "No data" + reasons.
**Concerns/Blockers:** (1) Auth column uses guard-name terminology ("public"/"Bearer"), not PERM### codes — `permissions.md` was out of scope for this task per the brief's read list, so no PERM### codes were available to cite. (2) ROUTE012 (`GET /brands/:id`) carries route-list.md's own `[UNVERIFIED]` flag (doc says public, runtime requires Bearer) — preserved verbatim rather than resolved, since resolving it requires source re-verification outside this task's scope.
