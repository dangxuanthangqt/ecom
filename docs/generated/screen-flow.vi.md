# Screen Flow

**Dự án**: ecom (NestJS backend)
**Ngày tạo**: 2026-09-12
**Phạm vi phân tích**: toàn bộ repo

**Định dạng mã**: N/A — dự án này không có mã `SCR###` nào (xem `screen-list.md`).

## Không có dữ liệu

**Không tồn tại screen flow.** Repo này là một REST API NestJS headless, không có bất kỳ file view/template nào (đã xác nhận trong `screen-list.md` và `scout-report.md § File Inventory`). Không có điều hướng render phía client, không có route guard điều khiển chuyển màn hình UI, không có state `beforeunload`/deep-link ở mức trình duyệt cần tài liệu hóa — những khái niệm đó cần một view layer mà repo này không có. Luồng request phía client (API consumer sẽ gọi endpoint nào tiếp theo) là mối quan tâm của bên gọi, nằm ngoài codebase này và ngoài phạm vi của ScreenFlow.

Phần tương đương ở mức request của "điều hướng" — những route HTTP nào tồn tại và yêu cầu auth của chúng — đã được tài liệu hóa đầy đủ trong `route-list.md` (70 route backend, cơ chế auth, middleware theo từng route). Tài liệu này không lặp lại nội dung đó.

## Navigation Map

N/A — không có screen, không có navigation graph phía client để vẽ.

## Feature Entry Points

{Sẽ được các researcher của FS.1 điền vào sau khi feature-list.md tồn tại — để placeholder theo hợp đồng W2, không bị ảnh hưởng bởi phát hiện backend headless.}

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
- **Exit**: một cặp access + refresh token được cấp (hoặc, với logout/bật-tắt 2FA, một
  thông báo xác nhận) — mọi route Bearer-gated của các feature khác đều dùng access token
  mà feature này cấp, thông qua `AccessTokenGuard`.

### F002_BrandCatalogManagement

- **Entry route**: (GET) /brands — `src/routes/brand/brand.controller.ts:50`
- **Owned routes**:
  - (GET) /brands — `src/routes/brand/brand.controller.ts:50`
  - (GET) /brands/:id — `src/routes/brand/brand.controller.ts:68`
  - (POST) /brands — `src/routes/brand/brand.controller.ts:88`
  - (PUT) /brands/:id — `src/routes/brand/brand.controller.ts:101`
  - (DELETE) /brands/:id — `src/routes/brand/brand.controller.ts:116`
- **Exit**: Trả về dữ liệu brand (danh sách/chi tiết/bản ghi vừa tạo/vừa cập nhật, hoặc
  thông báo xác nhận xóa) cho bên gọi; các dòng brand vừa tạo/cập nhật có thể liên kết tới
  các dòng `BrandTranslation` sẵn có do F004_CatalogLocalization sở hữu, qua `brandTranslationIds`.

### F003_CategoryCatalogManagement

- **Entry route**: (GET) /categories — `src/routes/category/category.controller.ts:46`
- **Owned routes**:
  - (GET) /categories — `src/routes/category/category.controller.ts:46`
  - (GET) /categories/:id — `src/routes/category/category.controller.ts:79`
  - (POST) /categories — `src/routes/category/category.controller.ts:99`
  - (PUT) /categories/:id — `src/routes/category/category.controller.ts:126`
  - (DELETE) /categories/:id — `src/routes/category/category.controller.ts:155`
- **Exit**: Trả về một `Category` (kèm translation/parent/children) cho bên gọi; một lần
  tạo/cập nhật/xóa thành công sẽ chuyển ID của dòng `category` bị ảnh hưởng cho bất kỳ
  feature nào liên kết product hoặc translation tới nó (F004 Catalog Localization, các
  feature product-catalog).

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
- **Exit**: Mỗi route trả về trực tiếp cho bên gọi payload translation-hoặc-language riêng
  của nó (danh sách phân trang / bản ghi đơn / vừa tạo / vừa cập nhật / vừa xóa) — không
  chuyển tiếp sang feature khác. Các thao tác đọc join ngược về dòng Brand (F002) /
  Category (F003) / Product (F008) cha do feature khác sở hữu; các thao tác ghi kiểm tra
  cha có tồn tại (BR-002) nhưng không thay đổi nó.

### F005_MediaAssetManagement

- **Entry route**: (POST) /media/upload/image — `src/routes/media/media.controller.ts:71`
- **Owned routes**:
  - (POST) /media/upload/image — `src/routes/media/media.controller.ts:71`
  - (POST) /media/upload/array-of-images — `src/routes/media/media.controller.ts:100`
  - (POST) /media/upload/multiple-images — `src/routes/media/media.controller.ts:136`
  - (GET) /media/presigned-url — `src/routes/media/media.controller.ts:187`
  - (DELETE) /media/delete — `src/routes/media/media.controller.ts:201`
- **Exit**: bên gọi nhận được một URL object S3 (route upload), một presigned URL (route
  presigned-url), hoặc một xác nhận xóa (route delete) — không chuyển tiếp sang feature
  khác; URL trả về được feature GỌI (ví dụ product/catalog) lưu lại, không phải do F005 tự lưu.

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
  - *(chạy nền, không có route)* `initial-scripts/create-permission.ts:37` (bootstrap) — BL001
  - *(chạy nền, không có route)* `initial-scripts/index.ts:30` (main) — BL002
- **Exit**: một thay đổi dòng `Permission`/`Role` được lưu vào DB mà `AccessTokenGuard`
  (`src/shared/guards/access-token.guard.ts:56-99`) đọc trên mọi route Bearer-gated của
  các feature khác — feature này nằm phía trước kiểm tra quyền truy cập theo từng route
  của mọi feature khác, không chỉ của riêng nó.

### F007_PublicProductBrowsing

- **Entry route**: (GET) /products — `src/routes/product/product.controller.ts:36`
- **Owned routes**:
  - (GET) /products — `src/routes/product/product.controller.ts:36`
  - (GET) /products/:id — `src/routes/product/product.controller.ts:61`
- **Exit**: Khách chọn một product từ response danh sách và gọi route chi tiết với ID của
  nó; không có bước chuyển tiếp nào khác trong feature — các hành động giỏ hàng/đặt hàng
  trên product đó nằm ngoài feature này.

### F008_SellerProductManagement

- **Entry route**: (GET) /manage-product/products — `src/routes/product/manage-product/manage-product.controller.ts:49`
- **Owned routes**:
  - (GET) /manage-product/products — `src/routes/product/manage-product/manage-product.controller.ts:49`
  - (GET) /manage-product/products/:id — `src/routes/product/manage-product/manage-product.controller.ts:80`
  - (POST) /manage-product/products — `src/routes/product/manage-product/manage-product.controller.ts:104`
  - (PUT) /manage-product/products/:id — `src/routes/product/manage-product/manage-product.controller.ts:124`
  - (DELETE) /manage-product/products/:id — `src/routes/product/manage-product/manage-product.controller.ts:154`
- **Exit**: response trả về cho bên gọi (danh sách/chi tiết product, hoặc thông báo xác
  nhận xóa) — không chuyển tiếp sang feature khác; các dòng `Product`/`SKU` bên dưới cũng
  chính là những dòng mà F007 (public browsing) đọc theo kiểu chỉ-đọc.

### F009_OwnProfileManagement

- **Entry route**: (GET) /profile — `src/routes/profile/profile.controller.ts:31`
- **Owned routes**:
  - (GET) /profile — `src/routes/profile/profile.controller.ts:31`
  - (PUT) /profile — `src/routes/profile/profile.controller.ts:48`
  - (PUT) /profile/change-password — `src/routes/profile/profile.controller.ts:68`
- **Exit**: xem trả về profile của chính bên gọi; cập nhật trả về profile đã thay đổi;
  đổi mật khẩu thu hồi toàn bộ refresh token và vô hiệu hóa toàn bộ device của bên gọi,
  buộc phải xác thực lại ở nơi khác.

### F010_UserAccountAdministration

- **Entry route**: (GET) /users — `src/routes/user/user.controller.ts:39`
- **Owned routes**:
  - (GET) /users — `src/routes/user/user.controller.ts:39`
  - (GET) /users/:id — `src/routes/user/user.controller.ts:54`
  - (POST) /users — `src/routes/user/user.controller.ts:75`
  - (PUT) /users/:id — `src/routes/user/user.controller.ts:97`
  - (DELETE) /users/:id — `src/routes/user/user.controller.ts:126`
- **Exit**: Danh sách/chi tiết trả về dữ liệu user cho admin gọi; tạo/cập nhật/xóa trả về
  trạng thái mới nhất của user bị ảnh hưởng — không chuyển tiếp sang feature khác. Thay
  đổi vai trò thực hiện ở đây (qua `PUT /users/:id`, `roleId`) là đường duy nhất nâng cấp
  một tài khoản client được tạo qua F001 lên seller/admin, ảnh hưởng tới những gì user đó
  có thể làm sau này dưới F001/F009 và mọi feature bị chặn theo module — nhưng không có
  lời gọi code nào băng qua file của feature khác.

## Screen Access Paths

N/A — không có screen.

## Screen Transitions

N/A — không có screen.

## Region Transitions

N/A — không có region (không tồn tại screen tổng hợp).

## Authentication Flow

N/A dưới dạng sơ đồ screen-flow — xem `route-list.md § Auth mechanism` để biết mô tả
chuẩn về phân quyền lúc runtime (`AuthorizationHeaderGuard` là `APP_GUARD` toàn cục,
`AccessTokenGuard` kiểm tra role-permission, `@IsPublicApi()` để opt-out). Không có màn
hình login hay luồng redirect phía client nào để vẽ sơ đồ; auth ở đây chặn response
JSON, không phải điều hướng trang.

## Error Handling Flows

N/A ở mức screen — mọi body response lỗi trên cả 70 route giờ đều được định hình bởi
một `GlobalExceptionFilter` duy nhất (`src/shared/filters/global-exception.filter.ts`);
xem `behavior-logic.md` (BL006/BL007, cả hai đều đánh dấu đã bị thay thế) và
`docs/error-handling.md` để biết hợp đồng hiện tại.

## Circular Dependencies Check

- [x] Không phát hiện phụ thuộc vòng — N/A, không có screen graph nào để kiểm tra

## Guard Logic

N/A — "Guard Logic" trong template này bao trùm các guard điều hướng route
(`beforeRouteEnter`/`canActivate` chặn một lần chuyển trang phía client). Guard duy nhất
trong dự án này là guard phân quyền request phía backend (`AccessTokenGuard`,
`ApiKeyGuard`, `AuthorizationHeaderGuard`), chặn response API chứ không phải điều hướng
screen — đã tài liệu hóa trong `permissions.md`, không phải ở đây.

*Nếu không phát hiện route guard nào:* `N/A — no route guards detected (headless API; the project's guards are request-authorization guards, documented in permissions.md).`

## Deep-Link State Restoration

*Nếu không phát hiện khôi phục state dẫn hướng bởi URL:* `N/A — no URL-driven state restoration detected (no client views exist to rehydrate from URL params).`

## Unsaved-Changes Protection

*Nếu không phát hiện bảo vệ thay đổi chưa lưu:* `N/A — no unsaved-changes guards detected (no client forms exist in this repository).`

## Extraction Signatures

N/A — extraction signature nhắm tới các cấu trúc mã nguồn phía client (`beforeEnter`,
`useSearchParams`, `useBeforeUnload`, v.v.) vốn cần một view layer. Không có cái nào áp
dụng cho một backend API headless.
