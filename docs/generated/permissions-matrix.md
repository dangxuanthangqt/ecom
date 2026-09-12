# Permissions Matrix

**Project**: ecom (NestJS backend)
**Generated**: 2026-09-12
**Analysis Scope**: Headless backend API, 70 routes (see route-list.md)

> **Raw PERM### matrix.** Machine-generated inventory of every permission item with full
> per-permission detail. The plain-language curated view lives at
> [permissions.md](permissions.md). This file is written FIRST; permissions.md is derived from it.

**Code Format**: `PERM###_NameSlug`

## Permissions Index

| Code | Name | Type | Enforced At |
|------|------|------|-------------|
| PERM001_GlobalAppGuard | Global APP_GUARD requires Bearer by default | route-guard | `src/shared/modules/base.module.ts:39-42` |
| PERM002_IsPublicApiOverride | `@IsPublicApi()` opts a route out of auth | route-guard | `src/shared/param-decorators/auth-api.decorator.ts:19` |
| PERM003_PerRoutePermissionCheck | Per-(path,method) permission row lookup on the caller's role | role-based | `src/shared/guards/access-token.guard.ts:56-99` |
| PERM004_DynamicPermissionSeeding | Permission rows generated from the live Express route table, not a static list | role-based | `initial-scripts/create-permission.ts:41-110` |
| PERM005_ModuleBasedRoleGrant | Role→module allowlist assigns bulk permissions (Admin = all modules) | role-based | `initial-scripts/create-permission.ts:14-35,149-192` |
| PERM006_DefaultSignupRoleClient | New users (register + Google OAuth) always get the CLIENT role | role-based | `src/routes/auth/auth.service.ts:114-121`, `src/routes/auth/google.service.ts:117-123` |
| PERM007_ManageProductOwnership | Non-admin caller may only view/update/delete a product they created | resource-ownership | `src/routes/product/manage-product/manage-product.service.ts:31-48` |
| PERM008_CoreRoleMutationLock | The 3 seeded roles (admin/client/seller) cannot be edited or deleted via `/roles` | role-based | `src/routes/role/role.service.ts:17,104-120` |
| PERM009_ApiKeyGuardUnused | Alternate `ApiKeyGuard`/`API_KEY` auth type exists but is not wired to any route | api-scope | `src/shared/guards/api-key.guard.ts`, `src/shared/guards/authorization-header.guard.ts:25-31` |
| PERM010_BrandByIdDocDrift | `GET /brands/:id` is Swagger-labeled `@ApiPublic` but carries no `@IsPublicApi()` — runtime still requires Bearer | route-guard | `src/routes/brand/brand.controller.ts:68` |
| PERM011_ManageOrderRoleGate | `MANAGE-ORDER` module (seller status-progression + order visibility) is seller/admin only — `client` never holds it | role-based | `initial-scripts/create-permission.ts:14-24` |

---

## PERM001_GlobalAppGuard: Global APP_GUARD requires Bearer by default

**Type**: route-guard
**Enforced At**: `src/shared/modules/base.module.ts:39-42` (registers `AuthorizationHeaderGuard` as `APP_GUARD`)

### Description

`AuthorizationHeaderGuard` runs on every request. It reads the `@AuthApi` metadata (if any) off the handler/class via `Reflector.getAllAndOverride`. With no metadata present, it defaults to `authorizationTypes = [AuthorizationType.BEARER]` and `combinedCondition = AND` (`authorization-header.guard.ts:44-47`), which dispatches to `AccessTokenGuard`. There is no global allowlist of paths — every one of the 70 routes is Bearer-protected unless explicitly opted out (see PERM002).

### Related Routes

- All 70 routes in route-list.md, minus the 9 marked `public` (see PERM002)

### Permission Rules

| Role | Allow | Conditions |
|------|-------|------------|
| admin | ✓ | valid, non-expired Bearer token + role.isActive=true |
| seller | ✓ | valid, non-expired Bearer token + role.isActive=true |
| client | ✓ | valid, non-expired Bearer token + role.isActive=true |
| unauthenticated | ✗ | — |

### Related Modules

- All (global guard)

---

## PERM002_IsPublicApiOverride: `@IsPublicApi()` opts a route out of auth

**Type**: route-guard
**Enforced At**: `src/shared/param-decorators/auth-api.decorator.ts:10-19`

### Description

`IsPublicApi()` is sugar for `AuthApi([AuthorizationType.NONE])`. When the metadata resolves to `NONE`, `AuthorizationHeaderGuard`'s type mapper substitutes a no-op guard (`canActivate: () => true`) — the request skips `AccessTokenGuard` entirely, no token is read or validated. This is the ONLY decorator that changes runtime auth. `@ApiAuth`/`@ApiPublic`/`@ApiPageOkResponse` (`src/shared/param-decorators/http-decorator.ts`) only add Swagger documentation (response schemas, `Authorization` header doc) — they carry no `SetMetadata` call and have zero effect on `AuthorizationHeaderGuard`.

### Related Routes

- (POST) /auth/register — ROUTE001
- (POST) /auth/login — ROUTE002
- (POST) /auth/refresh-token — ROUTE003
- (POST) /auth/otp — ROUTE005
- (GET) /auth/google/authorization-url — ROUTE006
- (GET) /auth/google/callback — ROUTE007
- (POST) /auth/forgot-password — ROUTE008
- (GET) /products — ROUTE051
- (GET) /products/:id — ROUTE052

### Permission Rules

| Role | Allow | Conditions |
|------|-------|------------|
| any (incl. unauthenticated) | ✓ | route carries `@IsPublicApi()` |

### Related Modules

- AUTH, PRODUCTS

---

## PERM003_PerRoutePermissionCheck: Per-(path,method) permission row lookup

**Type**: role-based
**Enforced At**: `src/shared/guards/access-token.guard.ts:56-99`

### Description

After Bearer verification, `AccessTokenGuard.verifyRolePermission` reads the matched Express route's `path` (`request.route.path`) and uppercased HTTP `method`, then runs `role.findUniqueOrThrow({ where: { id: roleId, isActive:true, deletedAt:null }, select: { permissions: { where: { deletedAt:null, path, method } } } })`. If the caller's role has zero matching `Permission` rows for that exact (path, method) pair, a 403 Forbidden is thrown (`throwHttpException({type:"forbidden", ...})`, lines 85-90). This is genuinely per-route RBAC, not a fixed role→scope map — access is driven entirely by which `Permission` rows are attached to the caller's `Role` in the DB.

### Related Routes

- All 61 Bearer-protected routes (70 total minus the 9 in PERM002)

### Permission Rules

| Role | Allow | Conditions |
|------|-------|------------|
| admin / seller / client | ✓ | a `Permission` row exists with `roleId, path, method` matching the request AND `deletedAt IS NULL` |
| any role | ✗ | no matching `Permission` row → 403 |

### Related Modules

- All 14 modules (see route-list.md)

---

## PERM004_DynamicPermissionSeeding: Permission rows generated from the live route table

**Type**: role-based
**Enforced At**: `initial-scripts/create-permission.ts:41-110`

### Description

**This system cannot be fully audited statically** — the `Permission` table is not populated from a fixed seed list. `initial-scripts/create-permission.ts` boots the actual Nest app (`NestFactory.create(AppModule)`, `app.listen(3010)`), then introspects the live Express router's `server.router.stack` to enumerate every registered `(path, method)` pair. It diffs that live set against `Permission` rows already in the DB: rows for routes no longer registered are hard-deleted (`prisma.permission.deleteMany`, lines 84-98); rows for newly-registered routes are inserted (`prisma.permission.createMany`, lines 100-110). Each new row's `module` field is derived as `path.split("/")[1].toUpperCase()` (line 62) — e.g. `/manage-product/products` → module `MANAGE-PRODUCT`.

This means the permission set for a role is only as current as the last run of this script (there is no evidence in the codebase of it running automatically on deploy/migrate — `[UNVERIFIED]`, no CI/CD or `package.json` script reference found in the files read for this pass). The static route-list.md content is the best available proxy for what `create-permission.ts` would currently register.

### Related Routes

- All 70 routes (module derivation applies uniformly)

### Permission Rules

| Role | Allow | Conditions |
|------|-------|------------|
| n/a | n/a | this is a seeding mechanism, not itself a runtime gate |

### Related Modules

- All 14

---

## PERM005_ModuleBasedRoleGrant: Role→module allowlist assigns bulk permissions

**Type**: role-based
**Enforced At**: `initial-scripts/create-permission.ts:14-35, 149-192`

### Description

After permissions are seeded (PERM004), `updateRole()` runs once per role and REPLACES (`permissions: { set: [...] }`, Prisma `set` — not `connect`) that role's entire permission list:

- **ADMIN**: `Module[Role.ADMIN]` is `undefined` (no entry in the `Module` map, lines 32-35) → the `moduleList && moduleList.length > 0` guard (line 160) is false → `permissionIds` stays as **all** permission IDs, unfiltered. Admin holds every permission for every module, all methods.
- **SELLER**: filtered to modules `["AUTH","MEDIA","MANAGE-PRODUCT","PRODUCT-TRANSLATIONS","PROFILE","CART","ORDERS","MANAGE-ORDER","REVIEWS"]` (lines 14-24, updated 2026-09-12 for F011/F012/F013) — ALL methods (GET/POST/PUT/DELETE) under those 9 modules are granted, since filtering is by module string only, not by method.
- **CLIENT**: filtered to modules `["AUTH","MEDIA","PRODUCTS","CATEGORIES","BRANDS","PRODUCT-TRANSLATIONS","PROFILE","CART","ORDERS","REVIEWS"]` (lines 26-37, updated 2026-09-12) — same all-methods-within-module behavior. Notably **excludes `MANAGE-ORDER`** — see PERM011.

Modules `BRAND-TRANSLATIONS`, `CATEGORY-TRANSLATIONS`, `LANGUAGES`, `PERMISSIONS`, `ROLES`, `USERS` appear in neither the Seller nor Client allowlist — those 6 modules (30 routes) are effectively admin-only under this seed. `MANAGE-ORDER` (3 routes, ROUTE079–081) is seller+admin only (client excluded) — see PERM011.

### Related Routes

- All 85 (partitioned by module, see table below)

### Permission Rules

| Role | Allow | Conditions |
|------|-------|------------|
| admin | ✓ (all 18 modules / 85 routes) | `Module[Role.ADMIN]` undefined → no filter applied |
| seller | ✓ (9 modules / 43 routes: AUTH, MEDIA, MANAGE-PRODUCT, PRODUCT-TRANSLATIONS, PROFILE, CART, ORDERS, MANAGE-ORDER, REVIEWS) | module must be in `SellerModule` list |
| seller | ✗ (9 modules / 42 routes: BRANDS, BRAND-TRANSLATIONS, CATEGORIES, CATEGORY-TRANSLATIONS, LANGUAGES, PERMISSIONS, PRODUCTS, ROLES, USERS) | module not in `SellerModule` list |
| client | ✓ (10 modules / 39 routes: AUTH, MEDIA, PRODUCTS, CATEGORIES, BRANDS, PRODUCT-TRANSLATIONS, PROFILE, CART, ORDERS, REVIEWS) | module must be in `ClientModule` list |
| client | ✗ (8 modules / 46 routes: BRAND-TRANSLATIONS, CATEGORY-TRANSLATIONS, LANGUAGES, MANAGE-PRODUCT, MANAGE-ORDER, PERMISSIONS, ROLES, USERS) | module not in `ClientModule` list |

### Related Modules

AUTH, MEDIA, MANAGE-PRODUCT, PRODUCT-TRANSLATIONS, PROFILE, PRODUCTS, CATEGORIES, BRANDS, BRAND-TRANSLATIONS, CATEGORY-TRANSLATIONS, LANGUAGES, PERMISSIONS, ROLES, USERS, CART, ORDERS, MANAGE-ORDER, REVIEWS

---

## PERM006_DefaultSignupRoleClient: New users always get CLIENT role

**Type**: role-based
**Enforced At**: `src/routes/auth/auth.service.ts:114-121`, `src/routes/auth/google.service.ts:117-123`, `src/repositories/role/shared-role.repository.ts:25-47`

### Description

`AuthService.register` (path via `/auth/register`, ROUTE001) and `GoogleService`'s OAuth signup path (`/auth/google/callback`, ROUTE007) both call `sharedRoleRepository.getClientRoleId()` and hardcode the new `User.roleId` to it. There is no request field to choose a different role at signup — a caller cannot self-register as `seller` or `admin`. Elevation to `seller`/`admin` requires an existing privileged user to `PUT /users/:id` with a different `roleId` (the field exists on `UpdateUserRequestDto`, `src/dtos/user/user.dto.ts:213,220`) — that route itself requires Bearer + the USERS-module permission (admin-only per PERM005), so only an admin can promote a user.

### Related Routes

- (POST) /auth/register — ROUTE001
- (GET) /auth/google/callback — ROUTE007
- (PUT) /users/:id — ROUTE069 (role-elevation path)

### Permission Rules

| Role | Allow | Conditions |
|------|-------|------------|
| new user (self-registered) | client only | fixed at registration, no override |
| admin | ✓ (can set any roleId via `PUT /users/:id`) | admin holds USERS module permission |
| seller / client | ✗ (cannot set roleId) | USERS module not in their allowlist |

### Related Modules

- AUTH, USERS

---

## PERM007_ManageProductOwnership: Non-admin caller limited to own products

**Type**: resource-ownership
**Enforced At**: `src/routes/product/manage-product/manage-product.service.ts:31-48`

### Description

`ManageProductService.validateClientPermission` runs on every manage-product operation (get list default-scoped to own `createdById`, get-by-id, update, delete). It throws 403 (`throwHttpException({type:"forbidden", ...})`) unless `userId === createdById OR roleName === Role.ADMIN`. This sits ON TOP of PERM003/PERM005 — a seller passes the module-level RBAC check for `MANAGE-PRODUCT` routes, but is still blocked from touching another seller's product by this ownership check. Admin bypasses the ownership check entirely (line 40: `roleNameRequest !== Role.ADMIN`).

### Related Routes

- (GET) /manage-product/products — ROUTE053 (defaults `createdById = userId` in the query, `manage-product.service.ts:65`)
- (GET) /manage-product/products/:id — ROUTE054
- (PUT) /manage-product/products/:id — ROUTE056
- (DELETE) /manage-product/products/:id — ROUTE057

### Permission Rules

| Role | Allow | Conditions |
|------|-------|------------|
| admin | ✓ | no ownership check applied |
| seller | ✓ | only for products where `product.createdById === caller.userId` |
| seller | ✗ | product created by a different user |
| client | ✗ | MANAGE-PRODUCT module not in Client's allowlist (blocked earlier at PERM005/PERM003) |

### Related Modules

- MANAGE-PRODUCT

---

## PERM008_CoreRoleMutationLock: Seeded roles cannot be edited/deleted

**Type**: role-based
**Enforced At**: `src/routes/role/role.service.ts:17, 104-120`

### Description

`RoleService.verifyForbiddenRole` (called from both `updateRole` and `deleteRole`) throws 403 if the target role's `name` is in `forbiddenRoles = [Role.ADMIN, Role.CLIENT, Role.SELLER]` (line 17). This protects the 3 bootstrap roles from being renamed/re-permissioned/deleted via `/roles` even by an admin. `POST /roles` (create) is unaffected — only update/delete are locked, and only for these 3 named roles; custom roles created afterward are fully mutable.

### Related Routes

- (PUT) /roles/:id — ROUTE064
- (DELETE) /roles/:id — ROUTE065

### Permission Rules

| Role | Allow | Conditions |
|------|-------|------------|
| admin | ✗ | target role name ∈ {admin, client, seller} |
| admin | ✓ | target role is any other (custom) role |

### Related Modules

- ROLES

---

## PERM009_ApiKeyGuardUnused: Alternate API-key auth path exists but unwired

**Type**: api-scope
**Enforced At**: `src/shared/guards/api-key.guard.ts`, `src/shared/guards/authorization-header.guard.ts:25-31`

### Description

`AuthorizationHeaderGuard` supports `AuthorizationType.API_KEY` (dispatches to `ApiKeyGuard`, which currently checks a hardcoded literal `"secretApiKey"` against a request header named by `SECRET_API_KEY` — the real `AppConfigService` lookup is commented out, `api-key.guard.ts:20-21`). A grep of `src` for `AuthorizationType.API_KEY` / `AuthApi([` usage outside the guard/constants files found **no controller invoking it** — no route in route-list.md uses this path. `[UNVERIFIED]` whether this is planned-but-unfinished infra or dead code; flagged as-is, not fabricated as an active permission.

### Related Routes

- none currently

### Permission Rules

| Role | Allow | Conditions |
|------|-------|------------|
| n/a | n/a | not attached to any route |

### Related Modules

- none

---

## PERM010_BrandByIdDocDrift: `GET /brands/:id` public-doc vs Bearer-runtime mismatch

**Type**: route-guard
**Enforced At**: `src/routes/brand/brand.controller.ts:68`

### Description

`GET /brands/:id` (ROUTE012) is decorated with `@ApiPublic` (a Swagger-doc-only decorator, PERM002) but has NO `@IsPublicApi()` — the actual auth-affecting decorator. Runtime behavior therefore defaults to Bearer-required (PERM001), while the generated Swagger doc labels the endpoint "Public." Carried over verbatim from route-list.md's own flag (`route-list.md:171`). `[UNVERIFIED]` whether this is an intentional inconsistency or a bug in the source; the effective RUNTIME behavior is Bearer-required, and is treated as such throughout this matrix and in permissions.md.

### Related Routes

- (GET) /brands/:id — ROUTE012

### Permission Rules

| Role | Allow | Conditions |
|------|-------|------------|
| admin / seller / client | ✓ | valid Bearer + BRANDS-module permission (client only, per PERM005) |
| unauthenticated | ✗ | despite `@ApiPublic` doc label |

### Related Modules

- BRANDS

---

## PERM011_ManageOrderRoleGate: `MANAGE-ORDER` module is seller/admin only

**Type**: role-based
**Enforced At**: `initial-scripts/create-permission.ts:14-24` (SellerModule includes `"MANAGE-ORDER"`, ClientModule does not)

### Description

Added 2026-09-12 for F012 Order Placement & Fulfilment. `ManageOrderController` (`src/routes/order/manage-order/manage-order.controller.ts`, prefix `manage-order/orders`) is registered under module `MANAGE-ORDER` (derived from its path segment per PERM004). `SellerModule` (`initial-scripts/create-permission.ts:14-24`) includes `"MANAGE-ORDER"`; `ClientModule` (lines 26-37) does not. Combined with PERM005's all-methods-per-module grant, this means a `client` caller is rejected by PERM003 (403, no matching `Permission` row) before `ManageOrderService.buildActorScope`'s own visibility logic ever runs — the role gate and the ownership-scope logic are two independent layers. `ManageOrderService.updateOrderStatus` additionally rejects any caller attempting `nextStatus: CANCELLED` regardless of role, since cancellation is buyer-only (BR-O04, `src/routes/order/manage-order/manage-order.service.ts:118-122`).

### Related Routes

- (GET) /manage-order/orders — ROUTE079
- (GET) /manage-order/orders/:orderId — ROUTE080
- (PUT) /manage-order/orders/:orderId/status — ROUTE081

### Permission Rules

| Role | Allow | Conditions |
|------|-------|------------|
| admin | ✓ | `MANAGE-ORDER` module granted (undefined allowlist → all modules); sees all orders (`buildActorScope` returns `{}`) |
| seller | ✓ | `MANAGE-ORDER` in `SellerModule`; sees only orders whose snapshot items reference their own products (`buildActorScope` filters `products.some.createdById`) |
| client | ✗ | `MANAGE-ORDER` not in `ClientModule` → 403 before any handler logic runs |

### Related Modules

- MANAGE-ORDER

---

## Summary

- **Total Permission Items**: 11
- **By Type**: route-guard: 3 (PERM001, PERM002, PERM010), role-based: 6 (PERM003, PERM004, PERM005, PERM006, PERM008, PERM011), resource-ownership: 1 (PERM007), api-scope: 1 (PERM009) — total 11. PERM003 is classified role-based (its table row, line 19); it is route-guard-flavored in mechanism but counted once, under role-based.
- **Roles identified**: `admin`, `client`, `seller` (`src/constants/role.constant.ts:1-5`) — no others found in code
- **No client-side gates found**: this is a headless backend API; `feature-flag`/`experiment`/`env-gate`/`locale-gate` types do not apply. `No special client-side gates identified.`
- **2026-09-12 update (F011/F012/F013)**: `SellerModule`/`ClientModule` in `initial-scripts/create-permission.ts` both gained `CART`, `ORDERS`, `REVIEWS`; `SellerModule` additionally gained `MANAGE-ORDER` (client did not) — see PERM005 (updated) and PERM011 (new).

---

## Cross-Reference Validation

- [x] All PERM### codes are unique
- [ ] All PERM### codes are referenced in FeatureList.md (feature-list.md not yet generated at this wave — Wave 1 precedes feature synthesis per `_session-context.md`)
- [x] All related route references are valid (ROUTE### IDs match route-list.md)
- [x] No screen references (headless backend, no frontend routes)
- [x] All related module references are valid (cross-checked against `initial-scripts/create-permission.ts` module derivation and route-list.md prefixes)
- [x] No orphaned permission references

---

## Client-Side Gate Types

Not applicable — this project is a headless NestJS backend API with no frontend/UI code. No `feature-flag`, `experiment`, `env-gate`, or `locale-gate` items were found in `src/`.
