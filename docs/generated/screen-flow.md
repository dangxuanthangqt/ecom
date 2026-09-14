# Screen Flow

**Project**: ecom (NestJS backend)
**Generated**: 2026-09-12
**Analysis Scope**: full repository

**Code Format**: N/A — no `SCR###` codes exist in this project (see `screen-list.md`).

## No data

**No screen flow exists.** This repository is a headless NestJS REST API with zero view/template files (confirmed in `screen-list.md` and `scout-report.md § File Inventory`). There is no client-rendered navigation, no route guards driving UI transitions, and no browser-level `beforeunload`/deep-link state to document — those concepts require a view layer that does not exist here. Client request flow (which endpoint an API consumer calls next) is a caller-side concern outside this codebase and is out of scope for ScreenFlow.

The request-level equivalent of "navigation" — which HTTP routes exist and their auth requirements — is already fully documented in `route-list.md` (70 backend routes, auth mechanism, middleware per route). This document does not duplicate that.

## Navigation Map

N/A — no screens, no client-side navigation graph to render.

## Feature Entry Points

{Populated by FS.1 researchers after feature-list.md exists — left as placeholder per W2 contract, unaffected by the headless-backend finding.}

### F001_Authentication

- **Entry route**: (POST) /auth/login — `src/routes/auth/auth.controller.ts:88`
- **Owned routes**:
  - (POST) /auth/register — `src/routes/auth/auth.controller.ts:68`
  - (POST) /auth/login — `src/routes/auth/auth.controller.ts:85`
  - (POST) /auth/refresh-token — `src/routes/auth/auth.controller.ts:109`
  - (POST) /auth/logout — `src/routes/auth/auth.controller.ts:132`
  - (POST) /auth/otp — `src/routes/auth/auth.controller.ts:148`
  - (GET) /auth/google/authorization-url — `src/routes/auth/auth.controller.ts:171`
  - (GET) /auth/google/callback — `src/routes/auth/auth.controller.ts:183`
  - (POST) /auth/forgot-password — `src/routes/auth/auth.controller.ts:220`
  - (POST) /auth/2fa/enable — `src/routes/auth/auth.controller.ts:236`
  - (POST) /auth/2fa/disable — `src/routes/auth/auth.controller.ts:251`
- **Exit**: an issued access + refresh token pair (or, for logout/2FA-toggle, a confirmation
  message) — every other feature's Bearer-gated route consumes the access token this feature
  issues via `AccessTokenGuard`.

### F002_BrandCatalogManagement

- **Entry route**: (GET) /brands — `src/routes/brand/brand.controller.ts:50`
- **Owned routes**:
  - (GET) /brands — `src/routes/brand/brand.controller.ts:50`
  - (GET) /brands/:id — `src/routes/brand/brand.controller.ts:68`
  - (POST) /brands — `src/routes/brand/brand.controller.ts:88`
  - (PUT) /brands/:id — `src/routes/brand/brand.controller.ts:101`
  - (DELETE) /brands/:id — `src/routes/brand/brand.controller.ts:116`
- **Exit**: Returns brand data (list/detail/created/updated row, or a delete confirmation
  message) to the caller; created/updated brand rows may link existing `BrandTranslation` rows
  owned by F004_CatalogLocalization via `brandTranslationIds`.

### F003_CategoryCatalogManagement

- **Entry route**: (GET) /categories — `src/routes/category/category.controller.ts:46`
- **Owned routes**:
  - (GET) /categories — `src/routes/category/category.controller.ts:46`
  - (GET) /categories/:id — `src/routes/category/category.controller.ts:79`
  - (POST) /categories — `src/routes/category/category.controller.ts:99`
  - (PUT) /categories/:id — `src/routes/category/category.controller.ts:126`
  - (DELETE) /categories/:id — `src/routes/category/category.controller.ts:155`
- **Exit**: Returns a `Category` (with translations/parent/children) to the caller; a successful
  create/update/delete hands the affected `category` row's ID to any feature that links products
  or translations to it (F004 Catalog Localization, product-catalog features).

### F004_CatalogLocalization

- **Entry route**: (GET) /languages — `src/routes/language/language.controller.ts:38`
- **Owned routes**:
  - (GET) /languages — `src/routes/language/language.controller.ts:38`
  - (GET) /languages/:id — `src/routes/language/language.controller.ts:53`
  - (POST) /languages/create — `src/routes/language/language.controller.ts:67`
  - (PUT) /languages/:id — `src/routes/language/language.controller.ts:84`
  - (DELETE) /languages/:id — `src/routes/language/language.controller.ts:106`
  - (GET) /brand-translations — `src/routes/brand-translation/brand-translation.controller.ts:41`
  - (GET) /brand-translations/:id — `src/routes/brand-translation/brand-translation.controller.ts:63`
  - (POST) /brand-translations — `src/routes/brand-translation/brand-translation.controller.ts:78`
  - (PUT) /brand-translations/:id — `src/routes/brand-translation/brand-translation.controller.ts:98`
  - (DELETE) /brand-translations/:id — `src/routes/brand-translation/brand-translation.controller.ts:120`
  - (GET) /category-translations — `src/routes/category-translation/category-translation.controller.ts:45`
  - (GET) /category-translations/:id — `src/routes/category-translation/category-translation.controller.ts:64`
  - (POST) /category-translations — `src/routes/category-translation/category-translation.controller.ts:81`
  - (PUT) /category-translations/:id — `src/routes/category-translation/category-translation.controller.ts:109`
  - (DELETE) /category-translations/:id — `src/routes/category-translation/category-translation.controller.ts:139`
  - (GET) /product-translations — `src/routes/product-translation/product-translation.controller.ts:42`
  - (GET) /product-translations/:id — `src/routes/product-translation/product-translation.controller.ts:66`
  - (POST) /product-translations — `src/routes/product-translation/product-translation.controller.ts:83`
  - (PUT) /product-translations/:id — `src/routes/product-translation/product-translation.controller.ts:111`
  - (DELETE) /product-translations/:id — `src/routes/product-translation/product-translation.controller.ts:141`
- **Exit**: Each route returns its own paginated list / single-record / created / updated / deleted
  translation-or-language payload directly to the caller — no chained hand-off to another feature.
  Reads join back to the parent Brand (F002) / Category (F003) / Product (F008) row owned by
  another feature; writes validate that parent exists (BR-002) but do not mutate it.

### F005_MediaAssetManagement

- **Entry route**: (POST) /media/upload/image — `src/routes/media/media.controller.ts:71`
- **Owned routes**:
  - (POST) /media/upload/image — `src/routes/media/media.controller.ts:71`
  - (POST) /media/upload/array-of-images — `src/routes/media/media.controller.ts:100`
  - (POST) /media/upload/multiple-images — `src/routes/media/media.controller.ts:136`
  - (GET) /media/presigned-url — `src/routes/media/media.controller.ts:187`
  - (DELETE) /media/delete — `src/routes/media/media.controller.ts:201`
- **Exit**: caller receives an S3 object URL (upload routes), a presigned URL (presigned-url route), or a deletion confirmation (delete route) — no hand-off to another feature; the returned URL is stored by the CALLING feature (e.g. product/catalog), not by F005 itself.

### F006_AccessControlAdministration

- **Entry route**: (GET) /roles — `src/routes/role/role.controller.ts:42`
- **Owned routes**:
  - (GET) /permissions — `src/routes/permission/permission.controller.ts:42`
  - (GET) /permissions/:id — `src/routes/permission/permission.controller.ts:66`
  - (POST) /permissions — `src/routes/permission/permission.controller.ts:82`
  - (PUT) /permissions/:id — `src/routes/permission/permission.controller.ts:109`
  - (DELETE) /permissions/:id — `src/routes/permission/permission.controller.ts:138`
  - (GET) /roles — `src/routes/role/role.controller.ts:42`
  - (GET) /roles/:id — `src/routes/role/role.controller.ts:66`
  - (POST) /roles — `src/routes/role/role.controller.ts:82`
  - (PUT) /roles/:id — `src/routes/role/role.controller.ts:109`
  - (DELETE) /roles/:id — `src/routes/role/role.controller.ts:138`
  - *(background, no route)* `initial-scripts/create-permission.ts:37` (bootstrap) — BL001
  - *(background, no route)* `initial-scripts/index.ts:30` (main) — BL002
- **Exit**: a `Permission`/`Role` row change persisted to the DB that `AccessTokenGuard`
  (`src/shared/guards/access-token.guard.ts:56-99`) reads on every other feature's Bearer-gated
  route — this feature is upstream of every other feature's per-route access check, not just its
  own.

### F007_PublicProductBrowsing

- **Entry route**: (GET) /products — `src/routes/product/product.controller.ts:36`
- **Owned routes**:
  - (GET) /products — `src/routes/product/product.controller.ts:36`
  - (GET) /products/:id — `src/routes/product/product.controller.ts:61`
- **Exit**: A visitor picks a product from the list response and calls the detail route with its
  ID; no further in-feature hop — cart/order actions on that product are outside this feature.

### F008_SellerProductManagement

- **Entry route**: (GET) /manage-product/products — `src/routes/product/manage-product/manage-product.controller.ts:49`
- **Owned routes**:
  - (GET) /manage-product/products — `src/routes/product/manage-product/manage-product.controller.ts:49`
  - (GET) /manage-product/products/:id — `src/routes/product/manage-product/manage-product.controller.ts:80`
  - (POST) /manage-product/products — `src/routes/product/manage-product/manage-product.controller.ts:104`
  - (PUT) /manage-product/products/:id — `src/routes/product/manage-product/manage-product.controller.ts:124`
  - (DELETE) /manage-product/products/:id — `src/routes/product/manage-product/manage-product.controller.ts:154`
- **Exit**: response returned to the caller (product list/detail, or a delete confirmation message) — no downstream feature handoff; the underlying `Product`/`SKU` rows are the same ones F007 (public browsing) reads read-only.

### F009_OwnProfileManagement

- **Entry route**: (GET) /profile — `src/routes/profile/profile.controller.ts:31`
- **Owned routes**:
  - (GET) /profile — `src/routes/profile/profile.controller.ts:31`
  - (PUT) /profile — `src/routes/profile/profile.controller.ts:48`
  - (PUT) /profile/change-password — `src/routes/profile/profile.controller.ts:68`
- **Exit**: view returns the caller's own profile; update returns the changed profile; change-password revokes all refresh tokens and deactivates all devices for the caller, requiring re-authentication elsewhere.

### F010_UserAccountAdministration

- **Entry route**: (GET) /users — `src/routes/user/user.controller.ts:39`
- **Owned routes**:
  - (GET) /users — `src/routes/user/user.controller.ts:39`
  - (GET) /users/:id — `src/routes/user/user.controller.ts:54`
  - (POST) /users — `src/routes/user/user.controller.ts:75`
  - (PUT) /users/:id — `src/routes/user/user.controller.ts:97`
  - (DELETE) /users/:id — `src/routes/user/user.controller.ts:126`
- **Exit**: List/detail return user data to the admin caller; create/update/delete return the
  affected user's updated state — no handoff to another feature. Role changes made here (via
  `PUT /users/:id`, `roleId`) are the only path that elevates a client-created-via-F001 account
  to seller/admin, affecting what that user can subsequently do under F001/F009 and every
  module-gated feature — but no code call crosses into another feature's files.

## Screen Access Paths

N/A — no screens.

## Screen Transitions

N/A — no screens.

## Region Transitions

N/A — no regions (no composite screens exist).

## Authentication Flow

N/A as a screen-flow diagram — see `route-list.md § Auth mechanism` for the authoritative account of runtime authorization (`AuthorizationHeaderGuard` global `APP_GUARD`, `AccessTokenGuard` role-permission check, `@IsPublicApi()` opt-out). No login screen or client redirect flow exists to diagram; auth here gates JSON responses, not page navigation.

## Error Handling Flows

N/A at the screen level — every error response body across all 70 routes is now shaped by one `GlobalExceptionFilter` (`src/shared/filters/global-exception.filter.ts`); see `behavior-logic.md` (BL006/BL007, both marked superseded) and `docs/error-handling.md` for the current contract.

## Circular Dependencies Check

- [x] No circular dependencies detected — N/A, no screen graph exists to check

## Guard Logic

N/A — "Guard Logic" in this template covers route-navigation guards (`beforeRouteEnter`/`canActivate` gating a client-side page transition). This project's only guards are backend request-authorization guards (`AccessTokenGuard`, `ApiKeyGuard`, `AuthorizationHeaderGuard`), which gate API responses, not screen navigation — documented in `permissions.md`, not here.

*If no route guards detected:* `N/A — no route guards detected (headless API; the project's guards are request-authorization guards, documented in permissions.md).`

## Deep-Link State Restoration

*If no URL-driven state restoration detected:* `N/A — no URL-driven state restoration detected (no client views exist to rehydrate from URL params).`

## Unsaved-Changes Protection

*If no unsaved-changes protection detected:* `N/A — no unsaved-changes guards detected (no client forms exist in this repository).`

## Extraction Signatures

N/A — extraction signatures target client-side source constructs (`beforeEnter`, `useSearchParams`, `useBeforeUnload`, etc.) that require a view layer. None apply to a headless API backend.
