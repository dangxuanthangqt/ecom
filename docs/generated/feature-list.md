# Feature List

**Project**: ecom (NestJS + Prisma + PostgreSQL headless backend API)
**Generated**: 2026-09-12
**Analysis Scope**: 84 user stories (US001–US084), 85 routes, 13 background-logic items, 11 permission items, 21 Prisma models — headless API, zero screens (`screen-list.md`: "No data").

**2026-09-12 update**: F011 Shopping Cart, F012 Order Placement & Fulfilment, and F013 Product Reviews added — three previously-unexposed Prisma models (`CartItem`, `Order`+`ProductSKUSnapshot`, `Review`) now have live routes. 15 new routes (ROUTE071–ROUTE085), 15 new user stories (US070–US084), 1 new permission item (PERM011). See each feature's `docs/features/F0##_*/functional-spec.md` for full detail.

**Deviation note**: no SCR### codes exist or are referenced anywhere in this artifact. "Related Screens" rows are omitted from every Feature Detail block below (not applicable to a headless API), per Wave-5 brief instruction to skip the SCR coverage gate for this repo.

**Clustering method**: features are grouped by primary business intent per `code-formats.md` § Feature Clustering Rule (authority), not by the 14 technical module/controller groupings in `api-map.md`. Where a technical module maps 1:1 to a business outcome (e.g. Brands), the feature boundary coincides with the module; where several modules serve one outcome (e.g. Languages + three `*Translation` modules all serving "localize catalog content") they are merged into one feature; where one module serves two outcomes (e.g. Roles admin + Permissions admin both configuring the same RBAC system) they are merged.

## Feature Hierarchy

| Code | Name | Type | Language | Workspace | Priority |
|------|------|------|----------|-----------|----------|
| F001 | Authentication | mixed | TypeScript | backend (single) | P0 |
| F002 | Brand Catalog Management | ui | TypeScript | backend (single) | P1 |
| F003 | Category Catalog Management | ui | TypeScript | backend (single) | P1 |
| F004 | Catalog Localization | ui | TypeScript | backend (single) | P2 |
| F005 | Media Asset Management | mixed | TypeScript | backend (single) | P1 |
| F006 | Access Control Administration | mixed | TypeScript | backend (single) | P2 |
| F007 | Public Product Browsing | ui | TypeScript | backend (single) | P1 |
| F008 | Seller Product Management | ui | TypeScript | backend (single) | P1 |
| F009 | Own Profile Management | ui | TypeScript | backend (single) | P1 |
| F010 | User Account Administration | ui | TypeScript | backend (single) | P2 |
| F011 | Shopping Cart | ui | TypeScript | backend (single) | P0 |
| F012 | Order Placement & Fulfilment | mixed | TypeScript | backend (single) | P0 |
| F013 | Product Reviews | ui | TypeScript | backend (single) | P1 |
## Feature Details

### F001: Authentication

**Type**: mixed
**Description**: A client establishes, refreshes, secures and terminates their own authenticated session — register, log in (password or Google), refresh/revoke tokens, log out, request an OTP, reset a forgotten password, and toggle 2FA. Every US in this group shares one outcome: the caller controlling access to their own account, never another user's. Flow: credentials/OAuth code/token → `AuthService`/`GoogleService` verify or issue → session artifacts (JWT pair, `Device`, `RefreshToken`, `VerificationCode`) persisted/consumed.

**Workspace**: backend (single)
**Languages**: TypeScript
**Components**: N/A (headless API — no UI components)

**Related User Stories**:
- US001_RegisterAccount
- US002_LogIn
- US003_RefreshAccessToken
- US004_LogOut
- US005_RequestOtpCode
- US006_LogInWithGoogle
- US007_ResetForgottenPassword
- US008_EnableTwoFactorAuth
- US009_DisableTwoFactorAuth

**Related APIs/Routes**:
- (POST) /auth/register
- (POST) /auth/login
- (POST) /auth/refresh-token
- (POST) /auth/logout
- (POST) /auth/otp
- (GET) /auth/google/authorization-url
- (GET) /auth/google/callback
- (POST) /auth/forgot-password
- (POST) /auth/2fa/enable
- (POST) /auth/2fa/disable

**Related Data Models**:
- User (MODEL002)
- VerificationCode (MODEL004)
- Device (MODEL005) — created by BL003 during Google login; no dedicated Device CRUD route exists
- RefreshToken (MODEL006)
- Role (MODEL008) — FK only, role assignment owned by F010

**Related Background Logic**:
- BL003_GoogleOAuthLogin
- BL005_SendVerificationCodeEmail — `[UNVERIFIED]` call site is currently commented out (see US005); documented here as intended behavior, not confirmed live behavior

**Related Permissions**:
- PERM001_GlobalAppGuard
- PERM002_IsPublicApiOverride
- PERM006_DefaultSignupRoleClient
- PERM009_ApiKeyGuardUnused

---

### F002: Brand Catalog Management
**Type**: ui
**Description**: Maintain the catalog's brand entities — browse the public brand list/detail, and (admin) create/update/delete brand rows. One outcome: keep the base brand entity data correct and available; localized brand text is a separate outcome (F004).

**Workspace**: backend (single)
**Languages**: TypeScript
**Components**: N/A (headless API)

**Related User Stories**:
- US010_ViewBrandList
- US011_ViewBrandDetail
- US012_CreateBrand
- US013_UpdateBrand
- US014_DeleteBrand

**Related APIs/Routes**:
- (GET) /brands
- (GET) /brands/:id
- (POST) /brands
- (PUT) /brands/:id
- (DELETE) /brands/:id

**Related Data Models**:
- MODEL014_Brand
- MODEL015_BrandTranslation (localized brand text is owned by F004; listed here as the paired entity)

**Related Background Logic**: none

**Related Permissions**:
- PERM005_ModuleBasedRoleGrant
- PERM010_BrandByIdDocDrift

---

### F003: Category Catalog Management
**Type**: ui
**Description**: Maintain the catalog's hierarchical category entities — browse the public category list/detail, and (admin) create/update/delete category rows, including self-referencing parent/child structure. Same single-outcome shape as F002, for a different catalog entity.

**Workspace**: backend (single)
**Languages**: TypeScript
**Components**: N/A (headless API)

**Related User Stories**:
- US020_ViewCategoryList
- US021_ViewCategoryDetail
- US022_CreateCategory
- US023_UpdateCategory
- US024_DeleteCategory

**Related APIs/Routes**:
- (GET) /categories
- (GET) /categories/:id
- (POST) /categories
- (PUT) /categories/:id
- (DELETE) /categories/:id

**Related Data Models**:
- Category (MODEL011)

**Related Background Logic**: none

**Related Permissions**:
- PERM005_ModuleBasedRoleGrant

---

### F004: Catalog Localization
**Type**: ui
**Description**: Maintain multi-language content for the catalog — define which languages are supported, and maintain translated name/description text for brands, categories, and products. One shared outcome across four technical modules: presenting the catalog in the caller's locale. This is deliberately separated from F002/F003/product-entity ownership, whose outcome is the base (untranslated) entity data, not its localized presentation.

**Workspace**: backend (single)
**Languages**: TypeScript
**Components**: N/A (headless API)

**Related User Stories**:
- US015_ViewBrandTranslationList
- US016_ViewBrandTranslationDetail
- US017_CreateBrandTranslation
- US018_UpdateBrandTranslation
- US019_DeleteBrandTranslation
- US025_ViewCategoryTranslationList
- US026_ViewCategoryTranslationDetail
- US027_CreateCategoryTranslation
- US028_UpdateCategoryTranslation
- US029_DeleteCategoryTranslation
- US030_ViewLanguageList
- US031_ViewLanguageDetail
- US032_CreateLanguage
- US033_UpdateLanguage
- US034_DeleteLanguage
- US045_ViewProductTranslationList
- US046_ViewProductTranslationDetail
- US047_CreateProductTranslation
- US048_UpdateProductTranslation
- US049_DeleteProductTranslation

**Related APIs/Routes**:
- (GET) /brand-translations, (GET) /brand-translations/:id, (POST) /brand-translations, (PUT) /brand-translations/:id, (DELETE) /brand-translations/:id
- (GET) /category-translations, (GET) /category-translations/:id, (POST) /category-translations, (PUT) /category-translations/:id, (DELETE) /category-translations/:id
- (GET) /languages, (GET) /languages/:id, (POST) /languages/create, (PUT) /languages/:id, (DELETE) /languages/:id
- (GET) /product-translations, (GET) /product-translations/:id, (POST) /product-translations, (PUT) /product-translations/:id, (DELETE) /product-translations/:id

**Related Data Models**:
- Language (MODEL001)
- BrandTranslation (MODEL015)
- CategoryTranslation (MODEL012)
- ProductTranslation (MODEL010)

**Related Background Logic**: none

**Related Permissions**:
- PERM005_ModuleBasedRoleGrant

---

### F005: Media Asset Management
**Type**: mixed
**Description**: Upload, retrieve, and delete media (image) assets backing product/catalog listings — single large image, arrays of images, per-field-named image sets, presigned direct-to-S3 URLs, and deletion. One outcome: get binary assets into/out of S3 reliably and validly. Bundles the S3 integration and the file-validation pipes that gate each upload route, since those pipes have no independent business meaning outside this flow.

**Workspace**: backend (single)
**Languages**: TypeScript
**Components**: N/A (headless API)

**Related User Stories**:
- US035_UploadSingleImage
- US036_UploadImageArray
- US037_UploadMultipleNamedImages
- US038_GetMediaPresignedUrl
- US039_DeleteMediaObject

**Related APIs/Routes**:
- (POST) /media/upload/image
- (POST) /media/upload/array-of-images
- (POST) /media/upload/multiple-images
- (GET) /media/presigned-url
- (DELETE) /media/delete

**Related Data Models**: none direct (assets live in S3, keyed by object key only — per BL004)

**Related Background Logic**:
- BL004_S3ObjectStorage
- BL009_ArrayFilesValidationPipe
- BL010_ImageValidationPipe — dead code, not attached to any live route; retained here as the same domain's (superseded) validator
- BL011_MultipleFilesValidationPipe
- BL012_SingleImageDiskInterceptorFactory

**Related Permissions**:
- PERM005_ModuleBasedRoleGrant

---

### F006: Access Control Administration
**Type**: mixed
**Description**: Configure the RBAC system itself — define/edit/delete custom roles (the 3 seeded roles are mutation-locked), and view/create/update/delete the raw per-route Permission rows assigned to roles. Roles and Permissions are two tables of one outcome (deciding who may call which route) and are administered together; the two one-shot/ops scripts that seed and keep this data in sync (BL001, BL002) have no independent business outcome of their own and are explained by this feature's intent.

**Workspace**: backend (single)
**Languages**: TypeScript
**Components**: N/A (headless API)

**Related User Stories**:
- US040_ViewPermissionList
- US041_ViewPermissionDetail
- US042_CreatePermission
- US043_UpdatePermission
- US044_DeletePermission
- US060_ViewRoleList
- US061_ViewRoleDetail
- US062_CreateRole
- US063_UpdateRole
- US064_DeleteRole

**Related APIs/Routes**:
- (GET) /permissions, (GET) /permissions/:id, (POST) /permissions, (PUT) /permissions/:id, (DELETE) /permissions/:id
- (GET) /roles, (GET) /roles/:id, (POST) /roles, (PUT) /roles/:id, (DELETE) /roles/:id

**Related Data Models**:
- Permission (MODEL007)
- Role (MODEL008)

**Related Background Logic**:
- BL001_SyncRoutePermissionsScript
- BL002_SeedAdminUserScript

**Related Permissions**:
- PERM003_PerRoutePermissionCheck
- PERM004_DynamicPermissionSeeding
- PERM005_ModuleBasedRoleGrant
- PERM008_CoreRoleMutationLock

---

### F007: Public Product Browsing
**Type**: ui
**Description**: Anonymous/authenticated browsing of the public product catalog — list and detail views, no auth required. One outcome: let a prospective buyer discover products. Deliberately separated from F008 (seller's own product CRUD) — different actor, different intent (discovery vs. ownership/maintenance).

**Workspace**: backend (single)
**Languages**: TypeScript
**Components**: N/A (headless API)

**Related User Stories**:
- US050_BrowseProductCatalog
- US051_ViewProductDetail

**Related APIs/Routes**:
- (GET) /products
- (GET) /products/:id

**Related Data Models**:
- Product (MODEL009)
- SKU (per ERD)
- Brand, Category (referenced, owned by F002/F003)

**Related Background Logic**: none

**Related Permissions**:
- PERM002_IsPublicApiOverride

---

### F008: Seller Product Management
**Type**: ui
**Description**: A seller creates and maintains their own product listings — list/view/create/update/delete, scoped to products they created (admin bypasses the ownership fence). One outcome: let a seller run their own catalog inventory, distinct from the public browsing outcome (F007) and from admin-level catalog structure (F002/F003).

**Workspace**: backend (single)
**Languages**: TypeScript
**Components**: N/A (headless API)

**Related User Stories**:
- US052_ListOwnProducts
- US053_ViewOwnProductDetail
- US054_CreateProduct
- US055_UpdateOwnProduct
- US056_DeleteOwnProduct

**Related APIs/Routes**:
- (GET) /manage-product/products
- (GET) /manage-product/products/:id
- (POST) /manage-product/products
- (PUT) /manage-product/products/:id
- (DELETE) /manage-product/products/:id

**Related Data Models**:
- Product (MODEL009)
- SKU (per ERD)

**Related Background Logic**: none

**Related Permissions**:
- PERM007_ManageProductOwnership
- PERM005_ModuleBasedRoleGrant

---

### F009: Own Profile Management
**Type**: ui
**Description**: A caller (any of the 3 roles) views and maintains their own account profile and password. One outcome: self-service account-detail upkeep, distinct from Authentication (session/credential establishment) and from User Account Administration (an admin managing other users' accounts).

**Workspace**: backend (single)
**Languages**: TypeScript
**Components**: N/A (headless API)

**Related User Stories**:
- US057_ViewOwnProfile
- US058_UpdateOwnProfile
- US059_ChangeOwnPassword

**Related APIs/Routes**:
- (GET) /profile
- (PUT) /profile
- (PUT) /profile/change-password

**Related Data Models**:
- User (MODEL002)
- _(none beyond User — see note below on UserTranslation)_

**Related Background Logic**: none

**Related Permissions**:
- PERM001_GlobalAppGuard

---

### F010: User Account Administration
**Type**: ui
**Description**: An admin manages user accounts on others' behalf — list/view/create/delete users, and update a user including promoting their role (the only path that elevates a self-registered client to seller/admin). One outcome: administer the population of accounts, as opposed to F001 (a user managing their own session) or F009 (a user managing their own profile).

**Workspace**: backend (single)
**Languages**: TypeScript
**Components**: N/A (headless API)

**Related User Stories**:
- US065_ViewUserList
- US066_ViewUserDetail
- US067_CreateUser
- US068_UpdateUserAndPromoteRole
- US069_DeleteUser

**Related APIs/Routes**:
- (GET) /users
- (GET) /users/:id
- (POST) /users
- (PUT) /users/:id
- (DELETE) /users/:id

**Related Data Models**:
- User (MODEL002)
- Role (MODEL008) — FK target of role promotion

**Related Background Logic**: none

**Related Permissions**:
- PERM005_ModuleBasedRoleGrant
- PERM006_DefaultSignupRoleClient

---

### F011: Shopping Cart

**Type**: ui
**Description**: A caller (any authenticated role) holds SKUs they intend to buy in a per-user cart — list own lines, add a SKU (incrementing an existing line for the same SKU), set a line's quantity, or remove a line. One outcome: give the sole input to F012's checkout somewhere to live between visits, with no guest-cart support (`CartItem.userId` is non-nullable).

**Workspace**: backend (single)
**Languages**: TypeScript
**Components**: N/A (headless API)

**Related User Stories**:
- US070_ViewCartList
- US071_AddCartItem
- US072_UpdateCartItemQuantity
- US073_RemoveCartItem

**Related APIs/Routes**:
- (GET) /cart
- (POST) /cart
- (PUT) /cart/:cartItemId
- (DELETE) /cart/:cartItemId

**Related Data Models**:
- CartItem (MODEL016)
- SKU (MODEL013) — read-only, for addability/stock checks
- Product (MODEL009) — read-only, via SKU's parent, for publish-visibility

**Related Background Logic**: none

**Related Permissions**:
- PERM005_ModuleBasedRoleGrant

---

### F012: Order Placement & Fulfilment

**Type**: mixed
**Description**: A buyer converts selected cart lines into one order per seller — freezing product/SKU data into `ProductSKUSnapshot` rows and decrementing stock in one transaction — then lists/views/cancels their own orders. Separately, a seller or admin lists/views the orders visible to them and advances an order along its status lifecycle. One outcome spanning two actor sets: turning a cart into a fulfilled (or cancelled) commitment, and letting the fulfilling side track it.

**Workspace**: backend (single)
**Languages**: TypeScript
**Components**: N/A (headless API)

**Related User Stories**:
- US074_ViewOwnOrderList
- US075_ViewOwnOrderDetail
- US076_CheckoutCart
- US077_CancelOwnOrder
- US078_ViewManageOrderList
- US079_ViewManageOrderDetail
- US080_UpdateOrderStatus

**Related APIs/Routes**:
- (GET) /orders
- (GET) /orders/:orderId
- (POST) /orders
- (PUT) /orders/:orderId/cancel
- (GET) /manage-order/orders
- (GET) /manage-order/orders/:orderId
- (PUT) /manage-order/orders/:orderId/status

**Related Data Models**:
- Order (MODEL018)
- ProductSKUSnapshot (MODEL017)
- CartItem (MODEL016) — consumed (deleted) at checkout
- SKU (MODEL013) — stock read/write
- Product (MODEL009) — read, and the `Order.products` m-n relation populated at checkout

**Related Background Logic**: none

**Related Permissions**:
- PERM005_ModuleBasedRoleGrant
- PERM011_ManageOrderRoleGate

---

### F013: Product Reviews

**Type**: ui
**Description**: Anyone can read a product's reviews (public, newest first); a buyer whose order for that product was actually delivered can write, edit, or delete their own single review of it. One outcome: purchase-verified social proof for prospective buyers, distinct from F007's read-only browsing and F012's order lifecycle (which it depends on for eligibility).

**Workspace**: backend (single)
**Languages**: TypeScript
**Components**: N/A (headless API)

**Related User Stories**:
- US081_ViewProductReviews
- US082_CreateReview
- US083_UpdateReview
- US084_DeleteReview

**Related APIs/Routes**:
- (GET) /reviews
- (POST) /reviews
- (PUT) /reviews/:reviewId
- (DELETE) /reviews/:reviewId

**Related Data Models**:
- Review (MODEL019)
- Order (MODEL018) — read, for purchase-verification (BR-R01)
- Product (MODEL009) — read, for review-target visibility

**Related Background Logic**: none

**Related Permissions**:
- PERM002_IsPublicApiOverride
- PERM005_ModuleBasedRoleGrant

---

## Cross-Cutting Technical Concerns (not assigned to any Feature)

These background-logic items are global request/response plumbing with **no human actor, no user
story, and no route of their own**: they normalize thrown errors (HTTP and Prisma) into one
response shape, wrap every successful response in one envelope, and manage the DB client's
connect/disconnect lifecycle.

- BL006_ExternalExceptionFilter (superseded — now `GlobalExceptionFilter`, see `behavior-logic.md`)
- BL007_PrismaClientExceptionFilter (superseded — now `GlobalExceptionFilter`, see `behavior-logic.md`)
- BL008_ResponseTransformInterceptor
- BL013_PrismaClientLifecycleObserver

They are **deliberately excluded** from the feature partition rather than grouped into one
"infrastructure" feature. Per `code-formats.md` § Feature Clustering Rule (authority), a group
held together only by HOW it is implemented ("all middleware") is not a Feature, and the rule's
fallback bullet — give an unexplained background job its own Feature — is scoped to jobs with a
business outcome, not to cross-cutting technical plumbing. These four are fully documented in
`behavior-logic.md`; this section records the deliberate exclusion so the omission reads as a
decision, not an oversight. (Ruled at the Wave 5.6 gate: `feature-list-review.md`.)

## Unexposed Schema-Only Models (not assigned to any Feature)

Per Wave-5 brief and `user-stories.md` (pre-2026-09-12), these Prisma models had no controller/route and were not turned into features: `Order`, `Review`, `CartItem`, `Message`, `PaymentTransaction`, `Device`, `UserTranslation`. **As of 2026-09-12, `Order` (+`ProductSKUSnapshot`), `Review`, and `CartItem` are exposed via F011/F012/F013 above and are removed from this list.** `Message` and `PaymentTransaction` remain unexposed — `clarifications.md` (`plans/260912-2042-cart-order-review-api/clarifications.md`) explicitly defers both to a later phase (chat: plain REST, no WebSocket; payment: SePay-style webhook reconciliation). `Device` is the one exception worth flagging precisely: it has no dedicated CRUD route, but it IS written to by `BL003_GoogleOAuthLogin` as part of the Authentication flow — so it appears once, above, as a **related data model** under F001, not as a feature of its own.

`UserTranslation` (MODEL003) joins this list as of the feature-specs pass. Wave 5 had tentatively attributed it to F009 as `[UNVERIFIED]` on the grounds that it is schema-adjacent to the Profile domain. The F009 feature-spec researcher resolved it from source: a full grep of `src/` returns **zero** references to `UserTranslation` outside the Prisma schema and migrations — `ProfileService`/`ProfileController` never touch it. It is therefore unexposed schema-only, on the same footing as the six models above, and is no longer attributed to any feature.

## Summary

- **Total Features**: 13 (F001–F013; F011/F012/F013 added 2026-09-12)
- **Total Screens**: 0 (headless backend API — screen-list.md: "No data")
- **Total User Stories**: 84 (US001–US084, all assigned)
- **Total Routes**: 85 (all 85 covered across F001–F013)
- **Total Data Models**: 21 (18 referenced above across F001–F013; 3 explicitly excluded as unexposed schema-only: `Message`, `PaymentTransaction`, `UserTranslation`)
- **Total Background Logic**: 13 (9 assigned: BL001/002→F006, BL003/005→F001, BL004/009/010/011/012→F005; 4 explicitly excluded as cross-cutting: BL006/007/008/013 — see Cross-Cutting Technical Concerns)
- **Total Permissions**: 11 (all 11 referenced across F001–F013)
- **Languages Detected**: TypeScript

## Cross-Reference Validation

- [x] All F### codes are unique (F001–F013)
- [x] All F### codes will be referenced in UserStories.md once this file is consumed downstream (US###→F### is a forward link resolved by the orchestrator)
- [x] Screen references: not applicable — 0 screens in this repo (see Deviation note above)
- [x] All user story references are valid (US001–US084 all exist in user-stories.md; every one assigned to exactly one Feature)
- [x] All route references are valid (ROUTE001–ROUTE085 all exist in route-list.md)
- [x] All data model references are valid (names cross-checked against entities.md)
- [x] All behavior logic references are valid (BL001–BL013 all exist in behavior-logic.md; 9 assigned to features, 4 explicitly excluded as cross-cutting)
- [x] All permission references are valid (PERM001–PERM011 all exist in permissions-matrix.md; all 11 referenced)
- [x] Every US has a parent feature (F###) — verified 9+5+5+20+5+10+2+5+3+5+4+7+4 = 84
- [x] Every route maps to a feature (F###) — 85 routes distributed 10+5+5+20+5+10+2+5+3+5+4+7+4 = 85
- [x] Every data model maps to a feature (F###) or is explicitly excluded with reason (Unexposed section)
- [x] Every background logic item maps to a feature (F###) or is explicitly excluded with reason — 9 assigned + 4 excluded = 13/13
- [x] Every permission maps to a feature (F###) — 11/11
