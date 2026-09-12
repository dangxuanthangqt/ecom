# User Stories

**Project**: ecom (NestJS backend) | **Generated**: 2026-09-12
**Analysis Scope**: headless backend API — 70 routes (route-list.md), no frontend/screens

**Deviation from standard protocol**: `screen-list.md` is "No data — headless backend API, no
screens". Per Wave-4 brief, this artifact derives US### from **ROUTE### + PERM### + BL###**
instead of SCR###. `Screen→US Map` is replaced by **Route→US Map** below. Actors are limited to
the 3 verified roles: `admin`, `seller`, `client` (`src/constants/role.constant.ts`). New
self-registered users always land as `client`; only `admin` can promote to `seller`/`admin`
(PERM006, ROUTE069).

**Code Format**: `US###_NameSlug`. **Types**: `ui` (human-actor-triggered API action). No
`system`-typed US were written — see "System-Initiated Behavior" note at the end: per the W4.5
actor-clarity gate, system-initiated behavior (global filters, interceptors, DB lifecycle,
one-shot ops scripts) has no human actor and stays in `behavior-logic.md`, not here.

**Known source contradiction — flagged, not resolved**: `permissions-matrix.md` PERM005 states
role→module grants are all-methods-per-module (no per-verb split); `permissions.md`'s curated
narrative separately claims `client` gets "read-only browsing" of brands/categories only. The
two disagree on whether `client` can create/edit/delete brands/categories. This artifact takes
the **conservative reading** — BRANDS/CATEGORIES create/update/delete stories below are written
with `admin` as the sole actor; `client` write-access to those two modules is `[UNVERIFIED]` and
intentionally NOT asserted as a story to avoid inventing an unconfirmed capability.

**Unexposed schema-only models** — `Order`, `Review`, `CartItem`, `Message`, `PaymentTransaction`,
`Device` exist in `prisma/schema.prisma` but have **no controller/route**. No user stories are
written for ordering, reviewing, cart, or messaging — these capabilities are not exposed by the
API today.

## Route → US Map (also serves as Interaction Inventory + US Index)

| Route | Method Path | Actor | Priority | US Code | Title |
|-------|------------|-------|----------|---------|-------|
| ROUTE001 | POST /auth/register | client | P0 | US001 | Register Account |
| ROUTE002 | POST /auth/login | client | P0 | US002 | Log In |
| ROUTE003 | POST /auth/refresh-token | client | P0 | US003 | Refresh Access Token |
| ROUTE004 | POST /auth/logout | client | P0 | US004 | Log Out |
| ROUTE005 | POST /auth/otp | client | P0 | US005 | Request OTP Code |
| ROUTE006+007 | GET .../authorization-url + GET .../callback | client | P0 | US006 | Log In With Google |
| ROUTE008 | POST /auth/forgot-password | client | P0 | US007 | Reset Forgotten Password |
| ROUTE009 | POST /auth/2fa/enable | client | P0 | US008 | Enable Two-Factor Auth |
| ROUTE010 | POST /auth/2fa/disable | client | P0 | US009 | Disable Two-Factor Auth |
| ROUTE011 | GET /brands | client | P1 | US010 | View Brand List |
| ROUTE012 | GET /brands/:id | client | P1 | US011 | View Brand Detail |
| ROUTE013 | POST /brands | admin | P2 | US012 | Create Brand |
| ROUTE014 | PUT /brands/:id | admin | P2 | US013 | Update Brand |
| ROUTE015 | DELETE /brands/:id | admin | P2 | US014 | Delete Brand |
| ROUTE016 | GET /brand-translations | admin | P2 | US015 | View Brand Translation List |
| ROUTE017 | GET /brand-translations/:id | admin | P2 | US016 | View Brand Translation Detail |
| ROUTE018 | POST /brand-translations | admin | P2 | US017 | Create Brand Translation |
| ROUTE019 | PUT /brand-translations/:id | admin | P2 | US018 | Update Brand Translation |
| ROUTE020 | DELETE /brand-translations/:id | admin | P2 | US019 | Delete Brand Translation |
| ROUTE021 | GET /categories | client | P1 | US020 | View Category List |
| ROUTE022 | GET /categories/:id | client | P1 | US021 | View Category Detail |
| ROUTE023 | POST /categories | admin | P2 | US022 | Create Category |
| ROUTE024 | PUT /categories/:id | admin | P2 | US023 | Update Category |
| ROUTE025 | DELETE /categories/:id | admin | P2 | US024 | Delete Category |
| ROUTE026 | GET /category-translations | admin | P2 | US025 | View Category Translation List |
| ROUTE027 | GET /category-translations/:id | admin | P2 | US026 | View Category Translation Detail |
| ROUTE028 | POST /category-translations | admin | P2 | US027 | Create Category Translation |
| ROUTE029 | PUT /category-translations/:id | admin | P2 | US028 | Update Category Translation |
| ROUTE030 | DELETE /category-translations/:id | admin | P2 | US029 | Delete Category Translation |
| ROUTE031 | GET /languages | admin | P2 | US030 | View Language List |
| ROUTE032 | GET /languages/:id | admin | P2 | US031 | View Language Detail |
| ROUTE033 | POST /languages/create | admin | P2 | US032 | Create Language |
| ROUTE034 | PUT /languages/:id | admin | P2 | US033 | Update Language |
| ROUTE035 | DELETE /languages/:id | admin | P2 | US034 | Delete Language |
| ROUTE036 | POST /media/upload/image | seller | P1 | US035 | Upload Single Image |
| ROUTE037 | POST /media/upload/array-of-images | seller | P1 | US036 | Upload Image Array |
| ROUTE038 | POST /media/upload/multiple-images | seller | P1 | US037 | Upload Multiple Named Images |
| ROUTE039 | GET /media/presigned-url | seller | P1 | US038 | Get Media Presigned URL |
| ROUTE040 | DELETE /media/delete | seller | P1 | US039 | Delete Media Object |
| ROUTE041 | GET /permissions | admin | P2 | US040 | View Permission List |
| ROUTE042 | GET /permissions/:id | admin | P2 | US041 | View Permission Detail |
| ROUTE043 | POST /permissions | admin | P2 | US042 | Create Permission |
| ROUTE044 | PUT /permissions/:id | admin | P2 | US043 | Update Permission |
| ROUTE045 | DELETE /permissions/:id | admin | P2 | US044 | Delete Permission |
| ROUTE046 | GET /product-translations | client | P2 | US045 | View Product Translation List |
| ROUTE047 | GET /product-translations/:id | client | P2 | US046 | View Product Translation Detail |
| ROUTE048 | POST /product-translations | client | P2 | US047 | Create Product Translation |
| ROUTE049 | PUT /product-translations/:id | client | P2 | US048 | Update Product Translation |
| ROUTE050 | DELETE /product-translations/:id | client | P2 | US049 | Delete Product Translation |
| ROUTE051 | GET /products | client | P1 | US050 | Browse Product Catalog |
| ROUTE052 | GET /products/:id | client | P1 | US051 | View Product Detail |
| ROUTE053 | GET /manage-product/products | seller | P1 | US052 | List Own Products |
| ROUTE054 | GET /manage-product/products/:id | seller | P1 | US053 | View Own Product Detail |
| ROUTE055 | POST /manage-product/products | seller | P1 | US054 | Create Product |
| ROUTE056 | PUT /manage-product/products/:id | seller | P1 | US055 | Update Own Product |
| ROUTE057 | DELETE /manage-product/products/:id | seller | P1 | US056 | Delete Own Product |
| ROUTE058 | GET /profile | client | P1 | US057 | View Own Profile |
| ROUTE059 | PUT /profile | client | P1 | US058 | Update Own Profile |
| ROUTE060 | PUT /profile/change-password | client | P1 | US059 | Change Own Password |
| ROUTE061 | GET /roles | admin | P2 | US060 | View Role List |
| ROUTE062 | GET /roles/:id | admin | P2 | US061 | View Role Detail |
| ROUTE063 | POST /roles | admin | P2 | US062 | Create Role |
| ROUTE064 | PUT /roles/:id | admin | P2 | US063 | Update Role |
| ROUTE065 | DELETE /roles/:id | admin | P2 | US064 | Delete Role |
| ROUTE066 | GET /users | admin | P2 | US065 | View User List |
| ROUTE067 | GET /users/:id | admin | P2 | US066 | View User Detail |
| ROUTE068 | POST /users | admin | P2 | US067 | Create User |
| ROUTE069 | PUT /users/:id | admin | P1 | US068 | Update User And Promote Role |
| ROUTE070 | DELETE /users/:id | admin | P2 | US069 | Delete User |

> Every route maps to exactly one US (1:1), except ROUTE006+ROUTE007 which merge into US006 —
> both steps of one Google-login click, same actor, no branching between them, no independently
> meaningful user intent for "get authorization URL" alone (merge exception, Step 3).
> No `[IPE_ZERO]` rows — every route has ≥1 mapped US.

---

## Auth

### US001_RegisterAccount
> As a client, I want to register a new account so that I can start using the platform.
- AC: Submitting valid email/password/name/phone creates a `User` with role forced to `CLIENT` (PERM006) — no field lets the caller choose a different role.
- AC: Duplicate email returns a conflict error (BL007 maps Prisma `P2002` → 409).
- Route: ROUTE001, POST /auth/register, public (PERM002).

### US002_LogIn
> As a client, I want to log in with my email and password so that I can access my account.
- AC: Valid credentials return an access + refresh token pair.
- AC: Invalid credentials are rejected without revealing which field was wrong.
- Route: ROUTE002, POST /auth/login, public (PERM002).

### US003_RefreshAccessToken
> As a client, I want to exchange my refresh token for a new access token so that my session stays active without re-entering credentials.
- AC: A valid, non-revoked refresh token issues a new access token.
- AC: An expired/invalid refresh token is rejected.
- Route: ROUTE003, POST /auth/refresh-token, public (PERM002).

### US004_LogOut
> As a client, I want to log out so that my current session token is invalidated.
- AC: Logout invalidates the caller's active session/device record.
- AC: Applies identically to `seller` and `admin` — AUTH module is granted to all three roles (PERM005).
- Route: ROUTE004, POST /auth/logout, Bearer (PERM001, PERM003).

### US005_RequestOtpCode
> As a client, I want to request a one-time verification code so that I can verify my identity.
- AC: A `VerificationCode` row is created for the caller.
- AC: `[UNVERIFIED gap]` the code is currently NOT emailed — `EmailService` call site in `AuthService.sendOTP` is commented out (BL005); the code exists only in the DB.
- Route: ROUTE005, POST /auth/otp, public (PERM002).

### US006_LogInWithGoogle
> As a client, I want to log in with my Google account so that I don't need a separate password for this platform.
- AC: Starting the flow returns a Google consent URL; completing it (Google's redirect) creates a new `CLIENT` user on first login or logs in an existing one by email (PERM006, BL003).
- AC: First-time Google logins get a fixed placeholder local password (`"changeme"`, hashed) — a business rule worth surfacing to security review.
- Route: ROUTE006 (GET /auth/google/authorization-url) + ROUTE007 (GET /auth/google/callback), public (PERM002); BL003.

### US007_ResetForgottenPassword
> As a client, I want to reset my forgotten password so that I can regain access to my account.
- AC: A valid reset request updates the account's password.
- AC: The endpoint does not require an existing session (public, PERM002).
- Route: ROUTE008, POST /auth/forgot-password, public.

### US008_EnableTwoFactorAuth
> As a client, I want to enable two-factor authentication so that my account has an extra layer of protection.
- AC: Enabling 2FA persists the setting on the caller's own account (Bearer-scoped, no target-user param).
- AC: Applies identically to `seller`/`admin` (AUTH module, PERM005).
- Route: ROUTE009, POST /auth/2fa/enable, Bearer (PERM001, PERM003).

### US009_DisableTwoFactorAuth
> As a client, I want to disable two-factor authentication so that I can log in with just my password again.
- AC: Disabling 2FA persists the setting on the caller's own account.
- AC: Same cross-role applicability as US008.
- Route: ROUTE010, POST /auth/2fa/disable, Bearer.

## Brands

### US010_ViewBrandList
> As a client, I want to view the list of brands so that I can browse what's available in the catalog.
- AC: Returns all active brands, no auth required.
- AC: BRANDS module is one of client's 7 granted modules (PERM005).
- Route: ROUTE011, GET /brands, public.

### US011_ViewBrandDetail
> As a client, I want to view a single brand's detail so that I can see more about it.
- AC: Returns the brand matching `:id`, or 404 if not found.
- AC: `[UNVERIFIED]` Swagger labels this `@ApiPublic` but it carries no `@IsPublicApi()` — runtime requires a Bearer token despite the doc (PERM010); treated as Bearer-required here.
- Route: ROUTE012, GET /brands/:id, Bearer (per PERM010 doc-drift finding).

### US012_CreateBrand
> As an admin, I want to create a new brand so that it becomes available in the catalog.
- AC: A valid payload creates a new `Brand` row.
- AC: `[UNVERIFIED]` per source contradiction noted above — whether `client` can also call this is unresolved; only `admin` is asserted here.
- Route: ROUTE013, POST /brands, Bearer.

### US013_UpdateBrand
> As an admin, I want to update an existing brand so that its catalog information stays accurate.
- AC: A valid payload updates the brand matching `:id`.
- AC: Same `[UNVERIFIED]` client-access caveat as US012.
- Route: ROUTE014, PUT /brands/:id, Bearer.

### US014_DeleteBrand
> As an admin, I want to delete a brand so that it no longer appears in the catalog.
- AC: The brand matching `:id` is removed (or soft-deleted per repository convention).
- AC: Same `[UNVERIFIED]` client-access caveat as US012.
- Route: ROUTE015, DELETE /brands/:id, Bearer.

## Brand Translations (admin-only module)

### US015_ViewBrandTranslationList
> As an admin, I want to view all brand translations so that I can audit localized brand names.
- AC: Returns all brand-translation rows.
- AC: BRAND-TRANSLATIONS is reachable only by `admin` (PERM005) — neither seller nor client hold this module.
- Route: ROUTE016, GET /brand-translations, Bearer.

### US016_ViewBrandTranslationDetail
> As an admin, I want to view a single brand translation so that I can check its localized content.
- AC: Returns the translation matching `:id`, or 404.
- Route: ROUTE017, GET /brand-translations/:id, Bearer.

### US017_CreateBrandTranslation
> As an admin, I want to add a translation for a brand so that it displays correctly in another language.
- AC: Creates a translation row linked to an existing brand + language.
- Route: ROUTE018, POST /brand-translations, Bearer.

### US018_UpdateBrandTranslation
> As an admin, I want to edit an existing brand translation so that its localized text stays correct.
- AC: Updates the translation matching `:id`.
- Route: ROUTE019, PUT /brand-translations/:id, Bearer.

### US019_DeleteBrandTranslation
> As an admin, I want to remove a brand translation so that outdated localized content is no longer served.
- AC: Deletes the translation matching `:id`.
- Route: ROUTE020, DELETE /brand-translations/:id, Bearer.

## Categories

### US020_ViewCategoryList
> As a client, I want to view the list of categories so that I can browse the catalog by category.
- AC: Returns all active categories. Requires a Bearer token — `category.controller.ts:45` carries no `@IsPublicApi()`, so the global `AuthorizationHeaderGuard` default applies.
- Route: ROUTE021, GET /categories, Bearer (CATEGORIES is a granted client module, PERM005).

### US021_ViewCategoryDetail
> As a client, I want to view a single category's detail so that I can see what it contains.
- AC: Returns the category matching `:id`, or 404.
- Route: ROUTE022, GET /categories/:id, Bearer.

### US022_CreateCategory
> As an admin, I want to create a new category so that products can be organized under it.
- AC: A valid payload creates a new `Category` row. `[UNVERIFIED]` same client-access caveat as brands.
- Route: ROUTE023, POST /categories, Bearer.

### US023_UpdateCategory
> As an admin, I want to update an existing category so that its information stays accurate.
- AC: A valid payload updates the category matching `:id`.
- Route: ROUTE024, PUT /categories/:id, Bearer.

### US024_DeleteCategory
> As an admin, I want to delete a category so that it no longer organizes any products.
- AC: The category matching `:id` is removed.
- Route: ROUTE025, DELETE /categories/:id, Bearer.

## Category Translations (admin-only module)

### US025_ViewCategoryTranslationList
> As an admin, I want to view all category translations so that I can audit localized category names.
- AC: Returns all category-translation rows. Route: ROUTE026, GET /category-translations, Bearer.

### US026_ViewCategoryTranslationDetail
> As an admin, I want to view a single category translation so that I can check its localized content.
- AC: Returns the translation matching `:id`, or 404. Route: ROUTE027, GET /category-translations/:id, Bearer.

### US027_CreateCategoryTranslation
> As an admin, I want to add a translation for a category so that it displays correctly in another language.
- AC: Creates a translation row linked to an existing category + language. Route: ROUTE028, POST /category-translations, Bearer.

### US028_UpdateCategoryTranslation
> As an admin, I want to edit an existing category translation so that its localized text stays correct.
- AC: Updates the translation matching `:id`. Route: ROUTE029, PUT /category-translations/:id, Bearer.

### US029_DeleteCategoryTranslation
> As an admin, I want to remove a category translation so that outdated localized content is no longer served.
- AC: Deletes the translation matching `:id`. Route: ROUTE030, DELETE /category-translations/:id, Bearer.

## Languages (admin-only module)

### US030_ViewLanguageList
> As an admin, I want to view the list of supported languages so that I know which locales the catalog supports.
- AC: Returns all `Language` rows. Route: ROUTE031, GET /languages, Bearer.

### US031_ViewLanguageDetail
> As an admin, I want to view a single language's detail so that I can confirm its configuration.
- AC: Returns the language matching `:id`, or 404. Route: ROUTE032, GET /languages/:id, Bearer.

### US032_CreateLanguage
> As an admin, I want to add a new supported language so that translations can target it.
- AC: Creates a new `Language` row. Route: ROUTE033, POST /languages/create, Bearer.

### US033_UpdateLanguage
> As an admin, I want to update a language's configuration so that its metadata stays accurate.
- AC: Updates the language matching `:id`. Route: ROUTE034, PUT /languages/:id, Bearer.

### US034_DeleteLanguage
> As an admin, I want to remove a supported language so that it's no longer offered for translation.
- AC: Deletes the language matching `:id`. Route: ROUTE035, DELETE /languages/:id, Bearer.

## Media

### US035_UploadSingleImage
> As a seller, I want to upload a single large image from disk so that I can attach it to a product listing.
- AC: Accepts `image/jpeg|png|gif|webp` under the multer disk-storage limits; rejects disallowed MIME/extension (BL012).
- AC: The stored file is pushed to S3 with server-side encryption (BL004). Same access for `admin`/`client` — MEDIA is a shared module (PERM005).
- Route: ROUTE036, POST /media/upload/image, Bearer.

### US036_UploadImageArray
> As a seller, I want to upload an array of images in one request so that I can attach multiple photos to a listing at once.
- AC: Rejects if count/size/MIME/extension violate `ArrayFilesValidationPipe` bounds (max 10 files, 5MB/file, 50MB total — BL009).
- Route: ROUTE037, POST /media/upload/array-of-images, Bearer.

### US037_UploadMultipleNamedImages
> As a seller, I want to upload multiple images under distinct named fields so that different image slots (e.g. thumbnail vs. gallery) are populated correctly.
- AC: Each declared field is validated independently (per-field maxCount/size/MIME); an undeclared field name is rejected (BL011).
- Route: ROUTE038, POST /media/upload/multiple-images, Bearer.

### US038_GetMediaPresignedUrl
> As a seller, I want to request a presigned URL so that I can upload or download a file directly against S3.
- AC: Returns a time-limited presigned URL (BL004). File existence is checked first where applicable.
- Route: ROUTE039, GET /media/presigned-url, Bearer.

### US039_DeleteMediaObject
> As a seller, I want to delete an uploaded media object so that it's removed from storage.
- AC: Deletes the S3 object by key; a missing key is treated as already-deleted (BL004 `checkFileExists`).
- Route: ROUTE040, DELETE /media/delete, Bearer.

## Permissions (admin-only module)

### US040_ViewPermissionList
> As an admin, I want to view the list of permission rows so that I can audit what access exists.
- AC: Returns all `Permission` rows (path/method/module). Route: ROUTE041, GET /permissions, Bearer.

### US041_ViewPermissionDetail
> As an admin, I want to view a single permission row so that I can confirm its details.
- AC: Returns the row matching `:id`, or 404. Route: ROUTE042, GET /permissions/:id, Bearer.

### US042_CreatePermission
> As an admin, I want to create a permission row so that a role can be granted access to a route.
- AC: Creates a `Permission` row. AC: `[UNVERIFIED]` this may be overwritten by the next run of BL001's sync script, which deletes rows for routes no longer live and re-derives module grants.
- Route: ROUTE043, POST /permissions, Bearer.

### US043_UpdatePermission
> As an admin, I want to update a permission row so that its role/module association stays correct.
- AC: Updates the row matching `:id`. Route: ROUTE044, PUT /permissions/:id, Bearer.

### US044_DeletePermission
> As an admin, I want to delete a permission row so that a role loses access to that route.
- AC: Deletes the row matching `:id`. Route: ROUTE045, DELETE /permissions/:id, Bearer.

## Product Translations

### US045_ViewProductTranslationList
> As a client, I want to view product translations so that I can see localized product content.
- AC: Returns all product-translation rows. PRODUCT-TRANSLATIONS is granted to both `client` and `seller` (PERM005).
- Route: ROUTE046, GET /product-translations, Bearer.

### US046_ViewProductTranslationDetail
> As a client, I want to view a single product translation so that I can see its localized content.
- AC: Returns the translation matching `:id`, or 404. Route: ROUTE047, GET /product-translations/:id, Bearer.

### US047_CreateProductTranslation
> As a client, I want to add a translation for a product so that it displays correctly in another language.
- AC: Creates a translation row linked to an existing product + language.
- Route: ROUTE048, POST /product-translations, Bearer.

### US048_UpdateProductTranslation
> As a client, I want to edit an existing product translation so that its localized text stays correct.
- AC: Updates the translation matching `:id`. Route: ROUTE049, PUT /product-translations/:id, Bearer.

### US049_DeleteProductTranslation
> As a client, I want to remove a product translation so that outdated localized content is no longer served.
- AC: Deletes the translation matching `:id`. Route: ROUTE050, DELETE /product-translations/:id, Bearer.

## Public Product Catalog

### US050_BrowseProductCatalog
> As a client, I want to browse the product catalog so that I can find products to consider.
- AC: Returns the public product list, no auth required (open to anonymous callers too).
- Route: ROUTE051, GET /products, public.

### US051_ViewProductDetail
> As a client, I want to view a single product's detail so that I can decide whether to buy it.
- AC: Returns the product matching `:id`, or 404. No auth required.
- Route: ROUTE052, GET /products/:id, public.

## Manage Product (seller-owned)

### US052_ListOwnProducts
> As a seller, I want to list the products I created so that I can manage my own catalog.
- AC: The list defaults to `createdById = caller.userId` (PERM007) — a seller never sees another seller's products via this endpoint.
- AC: `admin` bypasses the ownership fence and can see any seller's products.
- Route: ROUTE053, GET /manage-product/products, Bearer.

### US053_ViewOwnProductDetail
> As a seller, I want to view the detail of a product I created so that I can check its full data.
- AC: Returns 403 if `product.createdById !== caller.userId` and caller is not `admin` (PERM007).
- Route: ROUTE054, GET /manage-product/products/:id, Bearer.

### US054_CreateProduct
> As a seller, I want to create a new product so that I can list it for sale.
- AC: The new product's `createdById` is set to the caller, establishing ownership for later PERM007 checks.
- Route: ROUTE055, POST /manage-product/products, Bearer.

### US055_UpdateOwnProduct
> As a seller, I want to update a product I created so that its listing stays accurate.
- AC: Rejected with 403 if the product belongs to a different seller (PERM007); `admin` can update any product.
- Route: ROUTE056, PUT /manage-product/products/:id, Bearer.

### US056_DeleteOwnProduct
> As a seller, I want to delete a product I created so that it's no longer listed for sale.
- AC: Rejected with 403 if the product belongs to a different seller (PERM007); `admin` can delete any product.
- Route: ROUTE057, DELETE /manage-product/products/:id, Bearer.

## Profile

### US057_ViewOwnProfile
> As a client, I want to view my own profile so that I can see my account details.
- AC: Returns the caller's own profile (identified from the Bearer token, no `:id` param).
- AC: Applies identically to `seller`/`admin` (PROFILE is granted to all three, PERM005).
- Route: ROUTE058, GET /profile, Bearer.

### US058_UpdateOwnProfile
> As a client, I want to update my own profile so that my account details stay current.
- AC: Updates the caller's own profile only — no cross-user update path exists on this route.
- Route: ROUTE059, PUT /profile, Bearer.

### US059_ChangeOwnPassword
> As a client, I want to change my own password so that I can rotate my credentials.
- AC: Requires the caller's own current session; does not accept a target user id.
- Route: ROUTE060, PUT /profile/change-password, Bearer.

## Roles (admin-only module)

### US060_ViewRoleList
> As an admin, I want to view the list of roles so that I know what roles exist in the system.
- AC: Returns all `Role` rows, including the 3 seeded ones. Route: ROUTE061, GET /roles, Bearer.

### US061_ViewRoleDetail
> As an admin, I want to view a single role's detail so that I can inspect its permissions.
- AC: Returns the role matching `:id`, or 404. Route: ROUTE062, GET /roles/:id, Bearer.

### US062_CreateRole
> As an admin, I want to create a new custom role so that I can grant a distinct permission set.
- AC: Creates a new `Role` row; unaffected by the core-role lock (PERM008 only guards update/delete).
- Route: ROUTE063, POST /roles, Bearer.

### US063_UpdateRole
> As an admin, I want to update a role so that its permission set changes.
- AC: Rejected with 403 if the target role's name is `admin`, `client`, or `seller` (PERM008) — only custom roles are mutable.
- Route: ROUTE064, PUT /roles/:id, Bearer.

### US064_DeleteRole
> As an admin, I want to delete a custom role so that it's no longer assignable.
- AC: Rejected with 403 if the target role's name is `admin`, `client`, or `seller` (PERM008).
- Route: ROUTE065, DELETE /roles/:id, Bearer.

## Users (admin-only module)

### US065_ViewUserList
> As an admin, I want to view the list of users so that I can manage accounts.
- AC: Returns all `User` rows. Route: ROUTE066, GET /users, Bearer.

### US066_ViewUserDetail
> As an admin, I want to view a single user's detail so that I can inspect their account.
- AC: Returns the user matching `:id`, or 404. Route: ROUTE067, GET /users/:id, Bearer.

### US067_CreateUser
> As an admin, I want to create a new user account so that I can onboard someone directly.
- AC: Creates a `User` row; the `roleId` field is caller-settable here (unlike self-registration, which forces `client`).
- Route: ROUTE068, POST /users, Bearer.

### US068_UpdateUserAndPromoteRole
> As an admin, I want to update a user's role so that I can promote them to seller or admin.
- AC: `UpdateUserRequestDto.roleId` lets the admin set any role — this is the ONLY path in the system that elevates a self-registered `client` to `seller`/`admin` (PERM006).
- AC: Only `admin` can reach this route — USERS module is admin-only (PERM005); `seller`/`client` get 403 before this logic runs.
- Route: ROUTE069, PUT /users/:id, Bearer.

### US069_DeleteUser
> As an admin, I want to delete a user account so that it's removed from the system.
- AC: Deletes the user matching `:id`. Route: ROUTE070, DELETE /users/:id, Bearer.

---

## System-Initiated Behavior (excluded from US### by design)

Per the W4.5 actor-clarity gate, the following BL### items have **no human actor** — they are
global filters/interceptors/lifecycle hooks or one-shot ops scripts, not a person clicking/calling
anything — and are correctly homed in `behavior-logic.md` only, not represented here:

- BL001_SyncRoutePermissionsScript, BL002_SeedAdminUserScript — manual dev/ops scripts, no route.
- BL006_ExternalExceptionFilter, BL007_PrismaClientExceptionFilter, BL008_ResponseTransformInterceptor, BL013_PrismaClientLifecycleObserver — global cross-cutting middleware wrapping all 70 routes automatically.
- BL010_ImageValidationPipe — dead code, not attached to any live route.

BL003, BL004, BL005, BL009, BL011, BL012 are referenced above inline within the US that triggers
them (US006, US035–US039, US005 respectively) — satisfying BL→US traceability without a separate
system-typed entry.

## Cross-Reference Validation

- [x] All US### codes are unique (US001–US069, sequential, no gaps/dupes)
- [x] Every US has exactly one named human actor (`admin`/`seller`/`client`) — no "system"/"platform"/"application" actor used
- [x] Every US title carries exactly one action verb (no CRUD-compound titles)
- [x] Every US has a "so that" outcome clause
- [x] Every route (70) maps to ≥1 US; every US maps to ≥1 route (Route→US Map above)
- [x] BL003/004/005/009/011/012 referenced inline in their triggering US; BL001/002/006/007/008/010/013 explicitly excluded with reason (System-Initiated Behavior section)
- [ ] Referenced in FeatureList.md — not yet generated at this wave (pending Wave 3+ per `_session-context.md`)
- Open contradiction: client write-access to BRANDS/CATEGORIES (permissions-matrix.md PERM005 vs. permissions.md curated text) — flagged at top, not asserted either way.
