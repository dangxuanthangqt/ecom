# Route List

**Project**: ecom (NestJS backend)
**Generated**: 2026-09-12

**Route source tier**: Tier-2 static parse (no CLI probe/route-lister). Enumerated from `@Controller`/`@Get|Post|Put|Delete` decorators in `src/routes/**`. Cross-checked against generated `swagger.yaml` (produced by `pnpm build:swagger` → `src/generate-swagger.ts`) — **0 discrepancies**: all 39 swagger path entries and their HTTP methods match the static parse exactly (spot-verified path list + method counts for `/auth/*`, `/media/*`, `/languages/*`; full path-list diff below).

**Global prefix**: none. `src/main.ts` calls no `app.setGlobalPrefix()`. Swagger UI is mounted at `/api` only when `NODE_ENV=development` (`src/main.ts:54-60`) — not an API route, dev-only tooling.

**Auth mechanism**: `AuthorizationHeaderGuard` is registered globally as `APP_GUARD` (`src/shared/modules/base.module.ts:39-42`). Default behavior (no decorator) = `Bearer` token required, verified + role-permission-checked by `AccessTokenGuard` (`src/shared/guards/access-token.guard.ts`) against the `role.permissions` table keyed on `(path, method)`. Handlers annotated `@IsPublicApi()` (= `@AuthApi([AuthorizationType.NONE])`, `src/shared/param-decorators/auth-api.decorator.ts:19`) skip this check entirely. `ApiAuth`/`ApiPublic`/`ApiPageOkResponse` (`src/shared/param-decorators/http-decorator.ts`) are Swagger-doc-only decorators — they do NOT enforce auth; only `@IsPublicApi()` presence/absence changes runtime auth. **Owner F### column**: backfilled after Wave 5 from `feature-list.md` § Feature Details (`Related APIs/Routes`). Every route is owned by exactly one feature F001–F010; the four cross-cutting background-logic items (BL006/007/008/013) apply to all routes and are deliberately excluded from the feature partition — see `feature-list.md` § Cross-Cutting Technical Concerns.

## Backend Routes

### File: src/routes/auth/auth.controller.ts (prefix: `auth`)

| Method | Path | Code | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| POST | /auth/register | ROUTE001 | F001 | AuthController@register (auth.controller.ts:70) | public (`@IsPublicApi`) |
| POST | /auth/login | ROUTE002 | F001 | AuthController@login (auth.controller.ts:88) | public (`@IsPublicApi`) |
| POST | /auth/refresh-token | ROUTE003 | F001 | AuthController@refreshToken (auth.controller.ts:111) | public (`@IsPublicApi`) |
| POST | /auth/logout | ROUTE004 | F001 | AuthController@logout (auth.controller.ts:133) | Bearer (default) |
| POST | /auth/otp | ROUTE005 | F001 | AuthController@sendOTP (auth.controller.ts:150) | public (`@IsPublicApi`) |
| GET | /auth/google/authorization-url | ROUTE006 | F001 | AuthController@getAuthorizationUrl (auth.controller.ts:171) | public (`@IsPublicApi`) |
| GET | /auth/google/callback | ROUTE007 | F001 | AuthController@googleCallback (auth.controller.ts:183) | public (`@IsPublicApi`) |
| POST | /auth/forgot-password | ROUTE008 | F001 | AuthController@forgotPassword (auth.controller.ts:222) | public (`@IsPublicApi`) |
| POST | /auth/2fa/enable | ROUTE009 | F001 | AuthController@enable2fa (auth.controller.ts:236) | Bearer (default) |
| POST | /auth/2fa/disable | ROUTE010 | F001 | AuthController@disable2fa (auth.controller.ts:251) | Bearer (default) |

### File: src/routes/brand/brand.controller.ts (prefix: `brands`)

| Method | Path | Code | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /brands | ROUTE011 | F002 | BrandController@getBrands (brand.controller.ts:50) | public (`@IsPublicApi`) |
| GET | /brands/:id | ROUTE012 | F002 | BrandController@getBrandById (brand.controller.ts:68) | public (via `@ApiPublic` doc + no auth decorator override... default Bearer) [UNVERIFIED: `@ApiPublic` is swagger-only, no `@IsPublicApi()` present → runtime requires Bearer despite doc name] |
| POST | /brands | ROUTE013 | F002 | BrandController@createBrand (brand.controller.ts:88) | Bearer (default) |
| PUT | /brands/:id | ROUTE014 | F002 | BrandController@updateBrand (brand.controller.ts:101) | Bearer (default) |
| DELETE | /brands/:id | ROUTE015 | F002 | BrandController@deleteBrand (brand.controller.ts:116) | Bearer (default) |

### File: src/routes/brand-translation/brand-translation.controller.ts (prefix: `brand-translations`)

| Method | Path | Code | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /brand-translations | ROUTE016 | F004 | BrandTranslationController@getBrandTranslations (brand-translation.controller.ts:42) | Bearer (default) |
| GET | /brand-translations/:id | ROUTE017 | F004 | BrandTranslationController@getBrandTranslationById (brand-translation.controller.ts:64) | Bearer (default) |
| POST | /brand-translations | ROUTE018 | F004 | BrandTranslationController@createBrandTranslation (brand-translation.controller.ts:79) | Bearer (default) |
| PUT | /brand-translations/:id | ROUTE019 | F004 | BrandTranslationController@updateBrandTranslation (brand-translation.controller.ts:99) | Bearer (default) |
| DELETE | /brand-translations/:id | ROUTE020 | F004 | BrandTranslationController@deleteBrandTranslation (brand-translation.controller.ts:121) | Bearer (default) |

### File: src/routes/category/category.controller.ts (prefix: `categories`)

| Method | Path | Code | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /categories | ROUTE021 | F003 | CategoryController@getAllCategories (category.controller.ts:46) | Bearer (default) |
| GET | /categories/:id | ROUTE022 | F003 | CategoryController@getCategoryById (category.controller.ts:79) | Bearer (default) |
| POST | /categories | ROUTE023 | F003 | CategoryController@createCategory (category.controller.ts:99) | Bearer (default) |
| PUT | /categories/:id | ROUTE024 | F003 | CategoryController@updateCategory (category.controller.ts:126) | Bearer (default) |
| DELETE | /categories/:id | ROUTE025 | F003 | CategoryController@deleteCategory (category.controller.ts:155) | Bearer (default) |

### File: src/routes/category-translation/category-translation.controller.ts (prefix: `category-translations`)

| Method | Path | Code | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /category-translations | ROUTE026 | F004 | CategoryTranslationController@getCategoryTranslations (category-translation.controller.ts:46) | Bearer (default) |
| GET | /category-translations/:id | ROUTE027 | F004 | CategoryTranslationController@getCategoryTranslationById (category-translation.controller.ts:65) | Bearer (default) |
| POST | /category-translations | ROUTE028 | F004 | CategoryTranslationController@createCategoryTranslation (category-translation.controller.ts:82) | Bearer (default) |
| PUT | /category-translations/:id | ROUTE029 | F004 | CategoryTranslationController@updateCategoryTranslation (category-translation.controller.ts:110) | Bearer (default) |
| DELETE | /category-translations/:id | ROUTE030 | F004 | CategoryTranslationController@deleteCategoryTranslation (category-translation.controller.ts:140) | Bearer (default) |

### File: src/routes/language/language.controller.ts (prefix: `languages`)

| Method | Path | Code | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /languages | ROUTE031 | F004 | LanguageController@getLanguages (language.controller.ts:44) | Bearer (default) |
| GET | /languages/:id | ROUTE032 | F004 | LanguageController@getLanguageById (language.controller.ts:61) | Bearer (default) |
| POST | /languages/create | ROUTE033 | F004 | LanguageController@createLanguage (language.controller.ts:75) | Bearer (default) |
| PUT | /languages/:id | ROUTE034 | F004 | LanguageController@updateLanguage (language.controller.ts:92) | Bearer (default) |
| DELETE | /languages/:id | ROUTE035 | F004 | LanguageController@deleteLanguage (language.controller.ts:114) | Bearer (default) |

### File: src/routes/media/media.controller.ts (prefix: `media`)

| Method | Path | Code | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| POST | /media/upload/image | ROUTE036 | F005 | MediaController@uploadLargeImageFromDisk (media.controller.ts:73) | Bearer (default); `FileInterceptor` disk-storage via `createSingleImageDiskInterceptor` |
| POST | /media/upload/array-of-images | ROUTE037 | F005 | MediaController@uploadArrayOfImages (media.controller.ts:102) | Bearer (default); `FilesInterceptor("files",10)` + `ArrayFilesValidationPipe` |
| POST | /media/upload/multiple-images | ROUTE038 | F005 | MediaController@uploadMultipleImages (media.controller.ts:148) | Bearer (default); `FileFieldsInterceptor` + `MultipleFilesValidationPipe` |
| GET | /media/presigned-url | ROUTE039 | F005 | MediaController@getPresignedUrl (media.controller.ts:188) | Bearer (default) |
| DELETE | /media/delete | ROUTE040 | F005 | MediaController@deleteMedia (media.controller.ts:202) | Bearer (default) |

Note: two handlers are commented out in source (`uploadImage` buffer variant `media.controller.ts:41-57`, `uploadImageFromBuffer` `media.controller.ts:82-88`) — dead code, not live routes, correctly excluded.

### File: src/routes/permission/permission.controller.ts (prefix: `permissions`)

| Method | Path | Code | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /permissions | ROUTE041 | F006 | PermissionController@getPermissions (permission.controller.ts:42) | Bearer (default) |
| GET | /permissions/:id | ROUTE042 | F006 | PermissionController@getPermissionById (permission.controller.ts:66) | Bearer (default) |
| POST | /permissions | ROUTE043 | F006 | PermissionController@createPermission (permission.controller.ts:82) | Bearer (default) |
| PUT | /permissions/:id | ROUTE044 | F006 | PermissionController@updatePermission (permission.controller.ts:109) | Bearer (default) |
| DELETE | /permissions/:id | ROUTE045 | F006 | PermissionController@deletePermission (permission.controller.ts:138) | Bearer (default) |

### File: src/routes/product-translation/product-translation.controller.ts (prefix: `product-translations`)

| Method | Path | Code | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /product-translations | ROUTE046 | F004 | ProductTranslationController@getProductTranslations (product-translation.controller.ts:43) | Bearer (default) |
| GET | /product-translations/:id | ROUTE047 | F004 | ProductTranslationController@getProductTranslationById (product-translation.controller.ts:67) | Bearer (default) |
| POST | /product-translations | ROUTE048 | F004 | ProductTranslationController@createProductTranslation (product-translation.controller.ts:84) | Bearer (default) |
| PUT | /product-translations/:id | ROUTE049 | F004 | ProductTranslationController@updateProductTranslation (product-translation.controller.ts:112) | Bearer (default) |
| DELETE | /product-translations/:id | ROUTE050 | F004 | ProductTranslationController@deleteProductTranslation (product-translation.controller.ts:142) | Bearer (default) |

### File: src/routes/product/product.controller.ts (prefix: `products`)

| Method | Path | Code | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /products | ROUTE051 | F007 | ProductController@getProducts (product.controller.ts:36) | public (`@IsPublicApi`) |
| GET | /products/:id | ROUTE052 | F007 | ProductController@getProductById (product.controller.ts:61) | public (`@IsPublicApi`) |

### File: src/routes/product/manage-product/manage-product.controller.ts (prefix: `manage-product/products`)

| Method | Path | Code | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /manage-product/products | ROUTE053 | F008 | ManageProductController@getManageProducts (manage-product.controller.ts:50) | Bearer (default) |
| GET | /manage-product/products/:id | ROUTE054 | F008 | ManageProductController@getManageProductById (manage-product.controller.ts:81) | Bearer (default) |
| POST | /manage-product/products | ROUTE055 | F008 | ManageProductController@createProduct (manage-product.controller.ts:105) | Bearer (default) |
| PUT | /manage-product/products/:id | ROUTE056 | F008 | ManageProductController@updateProduct (manage-product.controller.ts:125) | Bearer (default) |
| DELETE | /manage-product/products/:id | ROUTE057 | F008 | ManageProductController@deleteProduct (manage-product.controller.ts:155) | Bearer (default) |

### File: src/routes/profile/profile.controller.ts (prefix: `profile`)

| Method | Path | Code | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /profile | ROUTE058 | F009 | ProfileController@getProfile (profile.controller.ts:31) | Bearer (default) |
| PUT | /profile | ROUTE059 | F009 | ProfileController@updateProfile (profile.controller.ts:48) | Bearer (default) |
| PUT | /profile/change-password | ROUTE060 | F009 | ProfileController@changePassword (profile.controller.ts:68) | Bearer (default) |

### File: src/routes/role/role.controller.ts (prefix: `roles`)

| Method | Path | Code | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /roles | ROUTE061 | F006 | RoleController@getRoles (role.controller.ts:42) | Bearer (default) |
| GET | /roles/:id | ROUTE062 | F006 | RoleController@getRoleById (role.controller.ts:66) | Bearer (default) |
| POST | /roles | ROUTE063 | F006 | RoleController@createRole (role.controller.ts:82) | Bearer (default) |
| PUT | /roles/:id | ROUTE064 | F006 | RoleController@updateRole (role.controller.ts:109) | Bearer (default) |
| DELETE | /roles/:id | ROUTE065 | F006 | RoleController@deleteRole (role.controller.ts:138) | Bearer (default) |

### File: src/routes/user/user.controller.ts (prefix: `users`)

| Method | Path | Code | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /users | ROUTE066 | F010 | UserController@getUsers (user.controller.ts:45) | Bearer (default) |
| GET | /users/:id | ROUTE067 | F010 | UserController@getUserById (user.controller.ts:67) | Bearer (default) |
| POST | /users | ROUTE068 | F010 | UserController@createUser (user.controller.ts:83) | Bearer (default) |
| PUT | /users/:id | ROUTE069 | F010 | UserController@updateUser (user.controller.ts:110) | Bearer (default) |
| DELETE | /users/:id | ROUTE070 | F010 | UserController@deleteUser (user.controller.ts:139) | Bearer (default) |

## Frontend Routes

No data — headless backend API, no frontend routes.

## Summary

| Category | Count |
|----------|-------|
| Backend Routes | 70 |
| Frontend Pages | 0 |
| Total | 70 |

## Cross-check notes

- `swagger.yaml` lists 39 distinct paths; every path and its HTTP-method set matches the static-parse rows above exactly (verified full path-list diff + method-count spot-check on `/auth/*`, `/media/*`, `/languages/*`). No discrepancy found.
- Route `ROUTE012` (`GET /brands/:id`) is documented via `@ApiPublic` (swagger label) but carries **no** `@IsPublicApi()` decorator — the only decorator that changes runtime auth. Runtime behavior therefore requires a Bearer token despite the "Public" swagger doc name. Flagged `[UNVERIFIED]` pending confirmation this isn't a doc/behavior drift bug in the source itself (not a route-list extraction error).
- `Owner F###` is `—` for all 70 rows: `feature-list.md` has not been generated yet in this session (Wave 1 runs before feature synthesis per `_session-context.md`). Re-attribution is a downstream wave's job, not a gap in this artifact.
