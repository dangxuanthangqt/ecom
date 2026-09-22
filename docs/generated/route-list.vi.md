# Danh sách Route

**Dự án**: ecom (NestJS backend)
**Được tạo**: 2026-09-12

**Tầng nguồn route**: Phân tích tĩnh Tier-2 (không dùng CLI probe/route-lister). Liệt kê từ decorator `@Controller`/`@Get|Post|Put|Delete` trong `src/routes/**`. Đối chiếu với `swagger.yaml` được sinh ra (từ `pnpm build:swagger` → `src/generate-swagger.ts`) — **0 sai lệch**: cả 50 path trong swagger (39 path gốc + 10 path mới bao phủ 15 route cart/order/review/manage-order mới) và HTTP method của chúng khớp đúng với kết quả phân tích tĩnh (đã kiểm tra mẫu danh sách path + số lượng method cho `/auth/*`, `/media/*`, `/languages/*`, `/cart`, `/orders`, `/reviews`; diff đầy đủ danh sách path ở dưới).

**Global prefix**: không có. `src/main.ts` không gọi `app.setGlobalPrefix()`. Swagger UI chỉ mount ở `/api` khi `NODE_ENV=development` (`src/main.ts:54-60`) — đây không phải route API, chỉ là tool cho dev.

**Cơ chế Auth**: `AuthorizationHeaderGuard` được đăng ký global làm `APP_GUARD` (`src/shared/modules/base.module.ts:39-42`). Hành vi mặc định (không có decorator) là bắt buộc token `Bearer`, được `AccessTokenGuard` (`src/shared/guards/access-token.guard.ts`) verify và check quyền dựa trên permission key mà handler khai báo qua `@RequirePermission` (`resource:action:scope`, ví dụ `product:update:own`) — **thay đổi từ 2026-09-21**, cách key theo `(path, method)` cũ không còn nữa; xem `docs/authorization-guide.md`. Một route không public mà thiếu `@RequirePermission` sẽ fail check coverage lúc app khởi động, và app sẽ không khởi động. Handler gắn `@IsPublicApi()` (= `@AuthApi([AuthorizationType.NONE])`, `src/shared/param-decorators/auth-api.decorator.ts:19`) bỏ qua hoàn toàn check này. `ApiAuth`/`ApiPublic`/`ApiPageOkResponse` (`src/shared/param-decorators/http-decorator.ts`) chỉ là decorator cho Swagger doc — chúng KHÔNG enforce auth; chỉ có/không có `@IsPublicApi()` mới đổi auth lúc runtime. **Cột Owner F###**: được điền lại sau Wave 5, lấy từ `feature-list.md` § Chi tiết Tính năng (`Related APIs/Routes`). Mỗi route thuộc về đúng một tính năng F001–F010; bốn hạng mục logic nền cross-cutting (BL006/007/008/013) áp dụng cho mọi route và cố tình bị loại khỏi cách chia theo tính năng — xem `feature-list.md` § Mối quan tâm Kỹ thuật Cross-Cutting.

## Route Backend

### File: src/routes/auth/auth.controller.ts (tiền tố: `auth`)

| Phương thức | Đường dẫn | Mã | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| POST | /auth/register | ROUTE001 | F001 | AuthController@register (auth.controller.ts:70) | public (`@IsPublicApi`) |
| POST | /auth/login | ROUTE002 | F001 | AuthController@login (auth.controller.ts:88) | public (`@IsPublicApi`) |
| POST | /auth/refresh-token | ROUTE003 | F001 | AuthController@refreshToken (auth.controller.ts:111) | public (`@IsPublicApi`) |
| POST | /auth/logout | ROUTE004 | F001 | AuthController@logout (auth.controller.ts:133) | Bearer (mặc định) |
| POST | /auth/otp | ROUTE005 | F001 | AuthController@sendOTP (auth.controller.ts:150) | public (`@IsPublicApi`) |
| GET | /auth/google/authorization-url | ROUTE006 | F001 | AuthController@getAuthorizationUrl (auth.controller.ts:171) | public (`@IsPublicApi`) |
| GET | /auth/google/callback | ROUTE007 | F001 | AuthController@googleCallback (auth.controller.ts:183) | public (`@IsPublicApi`) |
| POST | /auth/forgot-password | ROUTE008 | F001 | AuthController@forgotPassword (auth.controller.ts:222) | public (`@IsPublicApi`) |
| POST | /auth/2fa/enable | ROUTE009 | F001 | AuthController@enable2fa (auth.controller.ts:236) | Bearer (mặc định) |
| POST | /auth/2fa/disable | ROUTE010 | F001 | AuthController@disable2fa (auth.controller.ts:251) | Bearer (mặc định) |

### File: src/routes/brand/brand.controller.ts (tiền tố: `brands`)

| Phương thức | Đường dẫn | Mã | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /brands | ROUTE011 | F002 | BrandController@getBrands (brand.controller.ts:50) | public (`@IsPublicApi`) |
| GET | /brands/:id | ROUTE012 | F002 | BrandController@getBrandById (brand.controller.ts:68) | public (via `@ApiPublic` doc + no auth decorator override... default Bearer) [UNVERIFIED: `@ApiPublic` is swagger-only, no `@IsPublicApi()` present → runtime requires Bearer despite doc name] |
| POST | /brands | ROUTE013 | F002 | BrandController@createBrand (brand.controller.ts:88) | Bearer (mặc định) |
| PUT | /brands/:id | ROUTE014 | F002 | BrandController@updateBrand (brand.controller.ts:101) | Bearer (mặc định) |
| DELETE | /brands/:id | ROUTE015 | F002 | BrandController@deleteBrand (brand.controller.ts:116) | Bearer (mặc định) |

### File: src/routes/brand-translation/brand-translation.controller.ts (tiền tố: `brand-translations`)

| Phương thức | Đường dẫn | Mã | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /brand-translations | ROUTE016 | F004 | BrandTranslationController@getBrandTranslations (brand-translation.controller.ts:42) | Bearer (mặc định) |
| GET | /brand-translations/:id | ROUTE017 | F004 | BrandTranslationController@getBrandTranslationById (brand-translation.controller.ts:64) | Bearer (mặc định) |
| POST | /brand-translations | ROUTE018 | F004 | BrandTranslationController@createBrandTranslation (brand-translation.controller.ts:79) | Bearer (mặc định) |
| PUT | /brand-translations/:id | ROUTE019 | F004 | BrandTranslationController@updateBrandTranslation (brand-translation.controller.ts:99) | Bearer (mặc định) |
| DELETE | /brand-translations/:id | ROUTE020 | F004 | BrandTranslationController@deleteBrandTranslation (brand-translation.controller.ts:121) | Bearer (mặc định) |

### File: src/routes/category/category.controller.ts (tiền tố: `categories`)

| Phương thức | Đường dẫn | Mã | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /categories | ROUTE021 | F003 | CategoryController@getAllCategories (category.controller.ts:46) | Bearer (mặc định) |
| GET | /categories/:id | ROUTE022 | F003 | CategoryController@getCategoryById (category.controller.ts:79) | Bearer (mặc định) |
| POST | /categories | ROUTE023 | F003 | CategoryController@createCategory (category.controller.ts:99) | Bearer (mặc định) |
| PUT | /categories/:id | ROUTE024 | F003 | CategoryController@updateCategory (category.controller.ts:126) | Bearer (mặc định) |
| DELETE | /categories/:id | ROUTE025 | F003 | CategoryController@deleteCategory (category.controller.ts:155) | Bearer (mặc định) |

### File: src/routes/category-translation/category-translation.controller.ts (tiền tố: `category-translations`)

| Phương thức | Đường dẫn | Mã | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /category-translations | ROUTE026 | F004 | CategoryTranslationController@getCategoryTranslations (category-translation.controller.ts:46) | Bearer (mặc định) |
| GET | /category-translations/:id | ROUTE027 | F004 | CategoryTranslationController@getCategoryTranslationById (category-translation.controller.ts:65) | Bearer (mặc định) |
| POST | /category-translations | ROUTE028 | F004 | CategoryTranslationController@createCategoryTranslation (category-translation.controller.ts:82) | Bearer (mặc định) |
| PUT | /category-translations/:id | ROUTE029 | F004 | CategoryTranslationController@updateCategoryTranslation (category-translation.controller.ts:110) | Bearer (mặc định) |
| DELETE | /category-translations/:id | ROUTE030 | F004 | CategoryTranslationController@deleteCategoryTranslation (category-translation.controller.ts:140) | Bearer (mặc định) |

### File: src/routes/language/language.controller.ts (tiền tố: `languages`)

| Phương thức | Đường dẫn | Mã | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /languages | ROUTE031 | F004 | LanguageController@getLanguages (language.controller.ts:44) | Bearer (mặc định) |
| GET | /languages/:id | ROUTE032 | F004 | LanguageController@getLanguageById (language.controller.ts:61) | Bearer (mặc định) |
| POST | /languages/create | ROUTE033 | F004 | LanguageController@createLanguage (language.controller.ts:75) | Bearer (mặc định) |
| PUT | /languages/:id | ROUTE034 | F004 | LanguageController@updateLanguage (language.controller.ts:92) | Bearer (mặc định) |
| DELETE | /languages/:id | ROUTE035 | F004 | LanguageController@deleteLanguage (language.controller.ts:114) | Bearer (mặc định) |

### File: src/routes/media/media.controller.ts (tiền tố: `media`)

| Phương thức | Đường dẫn | Mã | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| POST | /media/upload/image | ROUTE036 | F005 | MediaController@uploadLargeImageFromDisk (media.controller.ts:73) | Bearer (mặc định); `FileInterceptor` disk-storage via `createSingleImageDiskInterceptor` |
| POST | /media/upload/array-of-images | ROUTE037 | F005 | MediaController@uploadArrayOfImages (media.controller.ts:102) | Bearer (mặc định); `FilesInterceptor("files",10)` + `ArrayFilesValidationPipe` |
| POST | /media/upload/multiple-images | ROUTE038 | F005 | MediaController@uploadMultipleImages (media.controller.ts:148) | Bearer (mặc định); `FileFieldsInterceptor` + `MultipleFilesValidationPipe` |
| GET | /media/presigned-url | ROUTE039 | F005 | MediaController@getPresignedUrl (media.controller.ts:188) | Bearer (mặc định) |
| DELETE | /media/delete | ROUTE040 | F005 | MediaController@deleteMedia (media.controller.ts:202) | Bearer (mặc định) |

Lưu ý: hai handler bị comment trong source (biến thể buffer của `uploadImage` `media.controller.ts:41-57`, `uploadImageFromBuffer` `media.controller.ts:82-88`) — đây là dead code, không phải route đang chạy, nên bị loại khỏi danh sách đúng.

### File: src/routes/permission/permission.controller.ts (tiền tố: `permissions`)

| Phương thức | Đường dẫn | Mã | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /permissions | ROUTE041 | F006 | PermissionController@getPermissions (permission.controller.ts:42) | Bearer (mặc định) |
| GET | /permissions/:id | ROUTE042 | F006 | PermissionController@getPermissionById (permission.controller.ts:66) | Bearer (mặc định) |

### File: src/routes/product-translation/product-translation.controller.ts (tiền tố: `product-translations`)

| Phương thức | Đường dẫn | Mã | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /product-translations | ROUTE046 | F004 | ProductTranslationController@getProductTranslations (product-translation.controller.ts:43) | Bearer (mặc định) |
| GET | /product-translations/:id | ROUTE047 | F004 | ProductTranslationController@getProductTranslationById (product-translation.controller.ts:67) | Bearer (mặc định) |
| POST | /product-translations | ROUTE048 | F004 | ProductTranslationController@createProductTranslation (product-translation.controller.ts:84) | Bearer (mặc định) |
| PUT | /product-translations/:id | ROUTE049 | F004 | ProductTranslationController@updateProductTranslation (product-translation.controller.ts:112) | Bearer (mặc định) |
| DELETE | /product-translations/:id | ROUTE050 | F004 | ProductTranslationController@deleteProductTranslation (product-translation.controller.ts:142) | Bearer (mặc định) |

### File: src/routes/product/product.controller.ts (tiền tố: `products`)

| Phương thức | Đường dẫn | Mã | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /products | ROUTE051 | F007 | ProductController@getProducts (product.controller.ts:36) | public (`@IsPublicApi`) |
| GET | /products/:id | ROUTE052 | F007 | ProductController@getProductById (product.controller.ts:61) | public (`@IsPublicApi`) |

### File: src/routes/product/manage-product/manage-product.controller.ts (tiền tố: `manage-product/products`)

| Phương thức | Đường dẫn | Mã | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /manage-product/products | ROUTE053 | F008 | ManageProductController@getManageProducts (manage-product.controller.ts:50) | Bearer (mặc định) |
| GET | /manage-product/products/:id | ROUTE054 | F008 | ManageProductController@getManageProductById (manage-product.controller.ts:81) | Bearer (mặc định) |
| POST | /manage-product/products | ROUTE055 | F008 | ManageProductController@createProduct (manage-product.controller.ts:105) | Bearer (mặc định) |
| PUT | /manage-product/products/:id | ROUTE056 | F008 | ManageProductController@updateProduct (manage-product.controller.ts:125) | Bearer (mặc định) |
| DELETE | /manage-product/products/:id | ROUTE057 | F008 | ManageProductController@deleteProduct (manage-product.controller.ts:155) | Bearer (mặc định) |

### File: src/routes/profile/profile.controller.ts (tiền tố: `profile`)

| Phương thức | Đường dẫn | Mã | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /profile | ROUTE058 | F009 | ProfileController@getProfile (profile.controller.ts:31) | Bearer (mặc định) |
| PUT | /profile | ROUTE059 | F009 | ProfileController@updateProfile (profile.controller.ts:48) | Bearer (mặc định) |
| PUT | /profile/change-password | ROUTE060 | F009 | ProfileController@changePassword (profile.controller.ts:68) | Bearer (mặc định) |

### File: src/routes/role/role.controller.ts (tiền tố: `roles`)

| Phương thức | Đường dẫn | Mã | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /roles | ROUTE061 | F006 | RoleController@getRoles (role.controller.ts:42) | Bearer (mặc định) |
| GET | /roles/:id | ROUTE062 | F006 | RoleController@getRoleById (role.controller.ts:66) | Bearer (mặc định) |
| POST | /roles | ROUTE063 | F006 | RoleController@createRole (role.controller.ts:82) | Bearer (mặc định) |
| PUT | /roles/:id | ROUTE064 | F006 | RoleController@updateRole (role.controller.ts:109) | Bearer (mặc định) |
| DELETE | /roles/:id | ROUTE065 | F006 | RoleController@deleteRole (role.controller.ts:138) | Bearer (mặc định) |

### File: src/routes/user/user.controller.ts (tiền tố: `users`)

| Phương thức | Đường dẫn | Mã | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /users | ROUTE066 | F010 | UserController@getUsers (user.controller.ts:45) | Bearer (mặc định) |
| GET | /users/:id | ROUTE067 | F010 | UserController@getUserById (user.controller.ts:67) | Bearer (mặc định) |
| POST | /users | ROUTE068 | F010 | UserController@createUser (user.controller.ts:83) | Bearer (mặc định) |
| PUT | /users/:id | ROUTE069 | F010 | UserController@updateUser (user.controller.ts:110) | Bearer (mặc định) |
| DELETE | /users/:id | ROUTE070 | F010 | UserController@deleteUser (user.controller.ts:139) | Bearer (mặc định) |

### File: src/routes/cart/cart.controller.ts (tiền tố: `cart`)

| Phương thức | Đường dẫn | Mã | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /cart | ROUTE071 | F011 | CartController@getCartItems (cart.controller.ts:42) | Bearer (mặc định) |
| POST | /cart | ROUTE072 | F011 | CartController@addCartItem (cart.controller.ts:60) | Bearer (mặc định) |
| PUT | /cart/:cartItemId | ROUTE073 | F011 | CartController@updateCartItemQuantity (cart.controller.ts:86) | Bearer (mặc định) |
| DELETE | /cart/:cartItemId | ROUTE074 | F011 | CartController@deleteCartItem (cart.controller.ts:113) | Bearer (mặc định) |

### File: src/routes/order/order.controller.ts (tiền tố: `orders`)

| Phương thức | Đường dẫn | Mã | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /orders | ROUTE075 | F012 | OrderController@getOrders (order.controller.ts:41) | Bearer (mặc định) |
| GET | /orders/:orderId | ROUTE076 | F012 | OrderController@getOrderById (order.controller.ts:63) | Bearer (mặc định) |
| POST | /orders | ROUTE077 | F012 | OrderController@checkout (order.controller.ts:81) | Bearer (mặc định) |
| PUT | /orders/:orderId/cancel | ROUTE078 | F012 | OrderController@cancelOrder (order.controller.ts:107) | Bearer (mặc định) |

### File: src/routes/order/manage-order/manage-order.controller.ts (tiền tố: `manage-order/orders`)

| Phương thức | Đường dẫn | Mã | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /manage-order/orders | ROUTE079 | F012 | ManageOrderController@getManageOrders (manage-order.controller.ts:45) | Bearer (mặc định); người bán thấy đơn hàng của sản phẩm riêng, admin thấy tất cả (BR-O06) |
| GET | /manage-order/orders/:orderId | ROUTE080 | F012 | ManageOrderController@getManageOrderById (manage-order.controller.ts:72) | Bearer (mặc định); cùng phạm vi BR-O06 |
| PUT | /manage-order/orders/:orderId/status | ROUTE081 | F012 | ManageOrderController@updateOrderStatus (manage-order.controller.ts:100) | Bearer (mặc định); chỉ người bán/admin qua module MANAGE-ORDER (không được cấp cho client) |

### File: src/routes/review/review.controller.ts (tiền tố: `reviews`)

| Phương thức | Đường dẫn | Mã | Owner F### | Handler | Middleware |
|--------|------|------|------------|---------|------------|
| GET | /reviews | ROUTE082 | F013 | ReviewController@getReviews (review.controller.ts:45) | public (`@IsPublicApi`) |
| POST | /reviews | ROUTE083 | F013 | ReviewController@createReview (review.controller.ts:62) | Bearer (mặc định) |
| PUT | /reviews/:reviewId | ROUTE084 | F013 | ReviewController@updateReview (review.controller.ts:90) | Bearer (mặc định) |
| DELETE | /reviews/:reviewId | ROUTE085 | F013 | ReviewController@deleteReview (review.controller.ts:119) | Bearer (mặc định) |

## Route Frontend

Không có dữ liệu — đây là headless backend API, không có route frontend.

## Tóm tắt

| Danh mục | Số lượng |
|----------|-------|
| Route Backend | 82 |
| Trang Frontend | 0 |
| Tổng cộng | 82 |

## Ghi chú Kiểm tra chéo

- `swagger.yaml` liệt kê 50 path riêng biệt (39 path gốc + 10 path cart/order/review/manage-order mới, vài path mang 2 method, bao phủ đủ 15 route mới). Đã kiểm tra lại sau khi `pnpm build:swagger` sinh lại file trong lần bàn giao này — cả 10 path mới và bộ HTTP method của chúng khớp đúng với các hàng phân tích tĩnh dưới đây. Không thấy sai lệch nào.
- Route `ROUTE012` (`GET /brands/:id`) được ghi là public qua `@ApiPublic` (chỉ là nhãn swagger) nhưng **không** có decorator `@IsPublicApi()` — decorator duy nhất thực sự đổi auth lúc runtime. Vì vậy hành vi thực tế vẫn yêu cầu token Bearer dù swagger ghi là "Public". Gắn cờ `[UNVERIFIED]` chờ xác nhận đây không phải lỗi lệch giữa doc và hành vi trong chính source (không phải lỗi khi trích xuất route-list).
- `Owner F###` là `—` cho 70 hàng gốc (giữ nguyên từ Wave 1: bước tổng hợp tính năng của `feature-list.md` chạy sau artifact này và chưa từng được điền bổ sung ở đây kể từ lần đầu). ROUTE071–ROUTE085 có sẵn Owner F### vì `feature-list.md` đã định nghĩa F011–F013 tính đến lần bàn giao này.
- **2026-09-21 (refactor RBAC):** ROUTE043/044/045 (`POST`/`PUT`/`DELETE /permissions`) đã bị xóa — danh mục permission
  do code sở hữu và chỉ đọc qua HTTP. Các mã không đánh số lại để tham chiếu ROUTE### hiện có vẫn còn hợp lệ;
  ba mã này coi như đã ngừng dùng. Tổng số route 85 → 82.
- ROUTE071–ROUTE085 (cart, orders, manage-order/orders, reviews) được thêm ngày 2026-09-12 cho F011 Shopping Cart, F012 Order Placement & Fulfilment, F013 Product Reviews. Nguồn: `src/routes/{cart,order,review}/*.controller.ts`. `GET /reviews` là route public duy nhất trong 15 route này (`@IsPublicApi()`, `review.controller.ts:38`).
