# Danh sách tính năng

**Dự án**: ecom (backend headless API dùng NestJS + Prisma + PostgreSQL)
**Tạo lúc**: 2026-09-12
**Phạm vi phân tích**: 84 user story (US001–US084), 85 route, 13 mục logic nền, 11 mục quyền, 21 model Prisma — headless API, không có màn hình nào (`screen-list.md`: "No data").

**Cập nhật 2026-09-12**: đã thêm F011 Shopping Cart, F012 Order Placement & Fulfilment, và F013 Product Reviews — ba model Prisma trước đây chưa được expose (`CartItem`, `Order`+`ProductSKUSnapshot`, `Review`) giờ đã có route thực. 15 route mới (ROUTE071–ROUTE085), 15 user story mới (US070–US084), 1 mục quyền mới (PERM011). Xem `docs/features/F0##_*/functional-spec.md` của từng tính năng để biết chi tiết đầy đủ.

**Ghi chú sai khác**: không có mã SCR### nào tồn tại hoặc được tham chiếu ở bất kỳ đâu trong tài liệu này. Các dòng "Related Screens" bị bỏ khỏi mọi khối Feature Detail bên dưới (không áp dụng cho headless API), theo chỉ dẫn brief Wave-5 là bỏ qua cổng kiểm tra độ phủ SCR cho repo này.

**Phương pháp gom nhóm**: các tính năng được nhóm theo mục đích nghiệp vụ chính, theo `code-formats.md` § Feature Clustering Rule (nguồn thẩm quyền), chứ không theo 14 nhóm module/controller kỹ thuật trong `api-map.md`. Ở đâu một module kỹ thuật ánh xạ 1:1 với một kết quả nghiệp vụ (ví dụ Brands), ranh giới tính năng trùng với module đó; ở đâu nhiều module cùng phục vụ một kết quả (ví dụ Languages + ba module `*Translation` đều phục vụ "bản địa hóa nội dung catalog") thì chúng được gộp thành một tính năng; ở đâu một module phục vụ hai kết quả (ví dụ admin Roles + admin Permissions đều cấu hình cùng một hệ thống RBAC) thì chúng được gộp lại.

## Cây phân cấp tính năng

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
## Chi tiết tính năng

### F001: Authentication

**Type**: mixed
**Mô tả**: Một client tự thiết lập, làm mới, bảo mật và kết thúc phiên xác thực của chính mình — đăng ký, đăng nhập (bằng mật khẩu hoặc Google), refresh/thu hồi token, đăng xuất, yêu cầu mã OTP, đặt lại mật khẩu đã quên, và bật/tắt 2FA. Mọi US trong nhóm này chung một kết quả: người gọi tự kiểm soát quyền truy cập vào tài khoản của chính mình, không bao giờ là tài khoản người khác. Luồng: credentials/OAuth code/token → `AuthService`/`GoogleService` xác thực hoặc phát hành → các artifact phiên (cặp JWT, `Device`, `RefreshToken`, `VerificationCode`) được lưu/dùng.

**Workspace**: backend (single)
**Languages**: TypeScript
**Components**: N/A (headless API — không có UI component)

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
- Device (MODEL005) — được tạo bởi BL003 trong lúc đăng nhập Google; không có route CRUD Device riêng
- RefreshToken (MODEL006)
- Role (MODEL008) — chỉ là FK, việc gán role thuộc quyền sở hữu của F010

**Related Background Logic**:
- BL003_GoogleOAuthLogin
- BL005_SendVerificationCodeEmail — `[UNVERIFIED]` điểm gọi hiện đang bị comment out (xem US005); được ghi ở đây như hành vi dự kiến, chưa xác nhận là hành vi thực tế đang chạy

**Related Permissions**:
- PERM001_GlobalAppGuard
- PERM002_IsPublicApiOverride
- PERM006_DefaultSignupRoleClient
- PERM009_ApiKeyGuardUnused

---

### F002: Brand Catalog Management
**Type**: ui
**Mô tả**: Duy trì các entity brand trong catalog — xem danh sách/chi tiết brand công khai, và (admin) tạo/cập nhật/xóa các dòng brand. Một kết quả: giữ dữ liệu entity brand gốc chính xác và luôn sẵn có; văn bản brand đã bản địa hóa là một kết quả riêng (F004).

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
- MODEL015_BrandTranslation (văn bản brand đã bản địa hóa thuộc quyền sở hữu của F004; liệt kê ở đây như entity đi kèm)

**Related Background Logic**: none

**Related Permissions**:
- PERM005_ModuleBasedRoleGrant
- PERM010_BrandByIdDocDrift

---

### F003: Category Catalog Management
**Type**: ui
**Mô tả**: Duy trì các entity category phân cấp của catalog — xem danh sách/chi tiết category công khai, và (admin) tạo/cập nhật/xóa các dòng category, bao gồm cấu trúc parent/child tự tham chiếu. Cùng hình dạng một-kết-quả như F002, nhưng cho một entity catalog khác.

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
**Mô tả**: Duy trì nội dung đa ngôn ngữ cho catalog — định nghĩa ngôn ngữ nào được hỗ trợ, và duy trì văn bản tên/mô tả đã dịch cho brand, category, và product. Một kết quả chung cho bốn module kỹ thuật: hiển thị catalog theo locale của người gọi. Việc này được tách riêng có chủ đích khỏi F002/F003/quyền sở hữu entity product, vốn có kết quả là dữ liệu entity gốc (chưa dịch), không phải phần trình bày đã bản địa hóa của nó.

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
**Mô tả**: Upload, lấy về, và xóa các media asset (hình ảnh) phục vụ các listing product/catalog — một ảnh đơn lớn, mảng nhiều ảnh, tập ảnh theo tên field riêng, presigned URL upload trực tiếp lên S3, và xóa. Một kết quả: đưa binary asset vào/ra khỏi S3 một cách tin cậy và hợp lệ. Gộp chung tích hợp S3 và các pipe validate file gác cổng cho từng route upload, vì các pipe này không có ý nghĩa nghiệp vụ độc lập ngoài luồng này.

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

**Related Data Models**: none direct (asset nằm trong S3, chỉ định danh bằng object key — theo BL004)

**Related Background Logic**:
- BL004_S3ObjectStorage
- BL009_ArrayFilesValidationPipe
- BL010_ImageValidationPipe — dead code, không gắn với route thực nào; giữ lại ở đây như validator (đã bị thay thế) của cùng domain
- BL011_MultipleFilesValidationPipe
- BL012_SingleImageDiskInterceptorFactory

**Related Permissions**:
- PERM005_ModuleBasedRoleGrant

---

### F006: Access Control Administration
**Type**: mixed
**Mô tả**: Cấu hình chính hệ thống RBAC — định nghĩa/sửa/xóa custom role (3 role được seed sẵn bị khóa không cho sửa), và xem/tạo/cập nhật/xóa các dòng Permission thô theo từng route được gán cho role. Roles và Permissions là hai bảng của cùng một kết quả (quyết định ai được gọi route nào) và được quản trị cùng nhau; hai script one-shot/ops seed và đồng bộ dữ liệu này (BL001, BL002) không có kết quả nghiệp vụ độc lập của riêng chúng và được giải thích bởi mục đích của tính năng này.

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
**Mô tả**: Duyệt công khai catalog product, có hoặc không cần đăng nhập — xem danh sách và chi tiết, không cần xác thực. Một kết quả: cho phép người mua tiềm năng khám phá sản phẩm. Được tách riêng có chủ đích khỏi F008 (CRUD sản phẩm của chính seller) — khác tác nhân, khác mục đích (khám phá vs. sở hữu/duy trì).

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
- SKU (theo ERD)
- Brand, Category (được tham chiếu, thuộc quyền sở hữu của F002/F003)

**Related Background Logic**: none

**Related Permissions**:
- PERM002_IsPublicApiOverride

---

### F008: Seller Product Management
**Type**: ui
**Mô tả**: Một seller tạo và duy trì các listing sản phẩm của chính mình — xem danh sách/xem/tạo/cập nhật/xóa, giới hạn phạm vi ở các sản phẩm họ tạo (admin bỏ qua rào chắn quyền sở hữu này). Một kết quả: để seller vận hành kho hàng catalog của riêng họ, khác với kết quả duyệt công khai (F007) và cấu trúc catalog cấp admin (F002/F003).

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
- SKU (theo ERD)

**Related Background Logic**: none

**Related Permissions**:
- PERM007_ManageProductOwnership
- PERM005_ModuleBasedRoleGrant

---

### F009: Own Profile Management
**Type**: ui
**Mô tả**: Một người gọi (bất kỳ trong 3 role) xem và duy trì hồ sơ tài khoản và mật khẩu của chính mình. Một kết quả: tự phục vụ việc cập nhật thông tin tài khoản, khác với Authentication (thiết lập phiên/credential) và khác với User Account Administration (admin quản lý tài khoản của người khác).

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
- _(không có gì ngoài User — xem ghi chú bên dưới về UserTranslation)_

**Related Background Logic**: none

**Related Permissions**:
- PERM001_GlobalAppGuard

---

### F010: User Account Administration
**Type**: ui
**Mô tả**: Một admin quản lý tài khoản người dùng thay mặt người khác — xem danh sách/xem/tạo/xóa user, và cập nhật một user bao gồm nâng cấp role của họ (đường duy nhất để nâng một client tự đăng ký lên seller/admin). Một kết quả: quản trị toàn bộ tập hợp tài khoản, khác với F001 (người dùng quản lý phiên của chính họ) hay F009 (người dùng quản lý hồ sơ của chính họ).

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
- Role (MODEL008) — mục tiêu FK của việc nâng role

**Related Background Logic**: none

**Related Permissions**:
- PERM005_ModuleBasedRoleGrant
- PERM006_DefaultSignupRoleClient

---

### F011: Shopping Cart

**Type**: ui
**Mô tả**: Một người gọi (bất kỳ role đã xác thực nào) giữ các SKU họ định mua trong một giỏ hàng riêng theo user — xem các dòng của chính mình, thêm một SKU (tăng số lượng nếu dòng cho SKU đó đã tồn tại), đặt số lượng cho một dòng, hoặc xóa một dòng. Một kết quả: cho input duy nhất của bước checkout ở F012 một nơi để tồn tại giữa các lần truy cập, không hỗ trợ giỏ hàng khách vãng lai (`CartItem.userId` không cho phép null).

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
- SKU (MODEL013) — chỉ đọc, để kiểm tra khả năng thêm/tồn kho
- Product (MODEL009) — chỉ đọc, qua parent của SKU, để kiểm tra trạng thái publish

**Related Background Logic**: none

**Related Permissions**:
- PERM005_ModuleBasedRoleGrant

---

### F012: Order Placement & Fulfilment

**Type**: mixed
**Mô tả**: Một buyer chuyển các dòng giỏ hàng đã chọn thành một order cho mỗi seller — đóng băng dữ liệu product/SKU thành các dòng `ProductSKUSnapshot` và giảm tồn kho trong cùng một transaction — sau đó xem danh sách/xem chi tiết/hủy các order của chính họ. Riêng biệt, một seller hoặc admin xem danh sách/xem các order họ được phép thấy và đẩy một order tiến qua vòng đời trạng thái của nó. Một kết quả trải rộng hai nhóm tác nhân: biến giỏ hàng thành một cam kết đã hoàn tất (hoặc đã hủy), và cho phía thực hiện đơn theo dõi nó.

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
- CartItem (MODEL016) — bị tiêu thụ (xóa) khi checkout
- SKU (MODEL013) — đọc/ghi tồn kho
- Product (MODEL009) — đọc, và quan hệ m-n `Order.products` được điền khi checkout

**Related Background Logic**: none

**Related Permissions**:
- PERM005_ModuleBasedRoleGrant
- PERM011_ManageOrderRoleGate

---

### F013: Product Reviews

**Type**: ui
**Mô tả**: Bất kỳ ai cũng đọc được review của một sản phẩm (công khai, mới nhất trước); một buyer mà đơn hàng của họ cho sản phẩm đó thực sự đã giao thành công thì được viết, sửa, hoặc xóa review duy nhất của chính họ cho sản phẩm đó. Một kết quả: bằng chứng xã hội đã được xác minh mua hàng cho người mua tiềm năng, khác với việc duyệt chỉ-đọc ở F007 và vòng đời order ở F012 (mà nó phụ thuộc vào để xét điều kiện đủ).

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
- Order (MODEL018) — đọc, để xác minh mua hàng (BR-R01)
- Product (MODEL009) — đọc, để xem đối tượng review có hiển thị hay không

**Related Background Logic**: none

**Related Permissions**:
- PERM002_IsPublicApiOverride
- PERM005_ModuleBasedRoleGrant

---

## Các mối quan tâm kỹ thuật xuyên suốt (không gán cho Feature nào)

Các mục logic nền này là phần plumbing request/response toàn cục, **không có tác nhân con người,
không có user story, và không có route riêng**: chúng chuẩn hóa lỗi ném ra (HTTP và Prisma) về
một dạng response duy nhất, bọc mọi response thành công vào một envelope, và quản lý vòng đời
kết nối/ngắt kết nối của DB client.

- BL006_ExternalExceptionFilter (đã bị thay thế — giờ là `GlobalExceptionFilter`, xem `behavior-logic.md`)
- BL007_PrismaClientExceptionFilter (đã bị thay thế — giờ là `GlobalExceptionFilter`, xem `behavior-logic.md`)
- BL008_ResponseTransformInterceptor
- BL013_PrismaClientLifecycleObserver

Chúng bị **loại trừ có chủ đích** khỏi phân vùng tính năng thay vì gộp vào một tính năng
"infrastructure" chung. Theo `code-formats.md` § Feature Clustering Rule (nguồn thẩm quyền), một
nhóm chỉ được gắn kết bởi CÁCH nó được triển khai ("toàn bộ đều là middleware") thì không phải là
một Feature, và gạch đầu dòng fallback của quy tắc này — cho một job nền chưa được giải thích một
Feature riêng — chỉ áp dụng cho các job có kết quả nghiệp vụ, không áp dụng cho plumbing kỹ thuật
xuyên suốt. Bốn mục này được tài liệu hóa đầy đủ trong `behavior-logic.md`; mục này ghi lại việc
loại trừ có chủ đích để việc bỏ sót này được hiểu là một quyết định, không phải một sơ suất. (Được
quyết định tại cổng Wave 5.6: `feature-list-review.md`.)

## Các model chỉ tồn tại trong schema, chưa được expose (không gán cho Feature nào)

Theo brief Wave-5 và `user-stories.md` (trước ngày 2026-09-12), các model Prisma sau không có
controller/route và không được biến thành feature: `Order`, `Review`, `CartItem`, `Message`,
`PaymentTransaction`, `Device`, `UserTranslation`. **Kể từ 2026-09-12, `Order` (+`ProductSKUSnapshot`),
`Review`, và `CartItem` đã được expose qua F011/F012/F013 ở trên và được gỡ khỏi danh sách này.**
`Message` và `PaymentTransaction` vẫn chưa được expose — `clarifications.md`
(`plans/260912-2042-cart-order-review-api/clarifications.md`) hoãn cả hai lại một giai đoạn sau một
cách rõ ràng (chat: plain REST, không WebSocket; thanh toán: đối soát webhook kiểu SePay). `Device`
là ngoại lệ duy nhất đáng nêu chính xác: nó không có route CRUD riêng, nhưng NÓ CÓ được ghi bởi
`BL003_GoogleOAuthLogin` như một phần của luồng Authentication — nên nó xuất hiện một lần, ở trên,
như một **model dữ liệu liên quan** thuộc F001, chứ không phải như một feature của riêng nó.

`UserTranslation` (MODEL003) gia nhập danh sách này kể từ đợt viết feature-spec. Wave 5 trước đó
đã tạm gán nó cho F009 dưới dạng `[UNVERIFIED]` với lý do nó liền kề về schema với domain Profile.
Researcher viết feature-spec cho F009 đã giải quyết việc này từ mã nguồn: một lượt grep toàn bộ
`src/` trả về **không** tham chiếu nào tới `UserTranslation` ngoài Prisma schema và migration —
`ProfileService`/`ProfileController` không hề đụng tới nó. Vì vậy nó chỉ tồn tại trong schema, chưa
được expose, cùng hàng với sáu model ở trên, và không còn được gán cho feature nào nữa.

## Tổng kết

- **Tổng số Feature**: 13 (F001–F013; F011/F012/F013 thêm vào 2026-09-12)
- **Tổng số Screen**: 0 (headless backend API — screen-list.md: "No data")
- **Tổng số User Story**: 84 (US001–US084, tất cả đã được gán)
- **Tổng số Route**: 85 (toàn bộ 85 đã được phủ trên F001–F013)
- **Tổng số Data Model**: 21 (18 được tham chiếu ở trên trên F001–F013; 3 bị loại trừ rõ ràng vì chỉ tồn tại trong schema, chưa expose: `Message`, `PaymentTransaction`, `UserTranslation`)
- **Tổng số Background Logic**: 13 (9 đã gán: BL001/002→F006, BL003/005→F001, BL004/009/010/011/012→F005; 4 bị loại trừ rõ ràng vì xuyên suốt: BL006/007/008/013 — xem mục Các mối quan tâm kỹ thuật xuyên suốt)
- **Tổng số Permission**: 11 (tất cả 11 được tham chiếu trên F001–F013)
- **Ngôn ngữ đã phát hiện**: TypeScript

## Kiểm tra chéo tham chiếu

- [x] Mọi mã F### đều duy nhất (F001–F013)
- [x] Mọi mã F### sẽ được tham chiếu trong UserStories.md khi file này được tiêu thụ ở downstream (US###→F### là liên kết xuôi được orchestrator giải quyết)
- [x] Tham chiếu screen: không áp dụng — 0 screen trong repo này (xem Ghi chú sai khác ở trên)
- [x] Mọi tham chiếu user story đều hợp lệ (US001–US084 đều tồn tại trong user-stories.md; mỗi cái được gán cho đúng một Feature)
- [x] Mọi tham chiếu route đều hợp lệ (ROUTE001–ROUTE085 đều tồn tại trong route-list.md)
- [x] Mọi tham chiếu data model đều hợp lệ (tên đã được đối chiếu chéo với entities.md)
- [x] Mọi tham chiếu behavior logic đều hợp lệ (BL001–BL013 đều tồn tại trong behavior-logic.md; 9 đã gán cho feature, 4 bị loại trừ rõ ràng vì xuyên suốt)
- [x] Mọi tham chiếu permission đều hợp lệ (PERM001–PERM011 đều tồn tại trong permissions-matrix.md; tất cả 11 đều được tham chiếu)
- [x] Mọi US đều có feature cha (F###) — đã xác minh 9+5+5+20+5+10+2+5+3+5+4+7+4 = 84
- [x] Mọi route đều ánh xạ tới một feature (F###) — 85 route được phân bổ 10+5+5+20+5+10+2+5+3+5+4+7+4 = 85
- [x] Mọi data model đều ánh xạ tới một feature (F###) hoặc bị loại trừ rõ ràng có lý do (mục Chưa được expose)
- [x] Mọi mục background logic đều ánh xạ tới một feature (F###) hoặc bị loại trừ rõ ràng có lý do — 9 đã gán + 4 loại trừ = 13/13
- [x] Mọi permission đều ánh xạ tới một feature (F###) — 11/11
</content>
