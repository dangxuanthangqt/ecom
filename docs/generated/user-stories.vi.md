# User Stories

**Dự án**: ecom (NestJS backend) | **Tạo lúc**: 2026-09-12
**Phạm vi phân tích**: backend API headless — 70 route (route-list.md), không có frontend/màn hình

**Sai khác so với quy trình chuẩn**: `screen-list.md` ghi "Không có dữ liệu — backend API headless, không
có màn hình". Theo brief Wave-4, artifact này dựng US### từ **ROUTE### + PERM### + BL###**
thay vì từ SCR###. `Screen→US Map` được thay bằng **Route→US Map** bên dưới. Actor chỉ giới hạn ở
3 role đã xác minh: `admin`, `seller`, `client` (`src/constants/role.constant.ts`). User tự đăng ký
luôn nhận role `client`; chỉ `admin` mới có thể thăng cấp lên `seller`/`admin`
(PERM006, ROUTE069).

**Định dạng mã**: `US###_NameSlug`. **Loại**: `ui` (hành động API do người dùng kích hoạt). Không
viết US kiểu `system` nào — xem ghi chú "Hành vi do hệ thống khởi tạo" ở cuối bài: theo cổng
actor-clarity của W4.5, hành vi do hệ thống khởi tạo (global filter, interceptor, vòng đời DB,
script ops chạy một lần) không có actor là người, nên nằm ở `behavior-logic.md`, không nằm ở đây.

**Mâu thuẫn đã biết trong nguồn — chỉ nêu ra, chưa xử lý**: `permissions-matrix.md` PERM005 nói
việc cấp quyền theo role→module là cấp toàn bộ method trong module (không tách theo từng verb);
còn phần văn bản của `permissions.md` lại khẳng định `client` chỉ được "xem, không chỉnh sửa" với
brand/category. Hai nguồn này mâu thuẫn nhau về việc `client` có được tạo/sửa/xoá brand/category hay
không. Artifact này chọn cách đọc **thận trọng** — các story tạo/cập nhật/xoá BRANDS/CATEGORIES bên
dưới chỉ viết `admin` là actor duy nhất; quyền ghi của `client` với hai module đó là `[UNVERIFIED]`
và cố tình KHÔNG được viết thành story để tránh bịa ra một năng lực chưa được xác nhận.

**Model chỉ có schema, chưa expose (trước 2026-09-12)** — `Order`, `Review`, `CartItem`, `Message`, `PaymentTransaction`,
`Device` đã tồn tại trong `prisma/schema.prisma` nhưng **chưa có controller/route**. **Kể từ 2026-09-12,
`CartItem`, `Order` (+`ProductSKUSnapshot`), và `Review` đã được expose qua F011 Shopping Cart, F012
Order Placement & Fulfilment, và F013 Product Reviews** — US070–US084 bên dưới cover route của chúng.
`Message` và `PaymentTransaction` vẫn chưa expose (hoãn lại theo `clarifications.md`); không viết user
story nào cho nhắn tin hay thanh toán.

## Route → US Map (kiêm luôn Interaction Inventory + US Index)

| Route | Method Path | Actor | Priority | US Code | Title |
|-------|------------|-------|----------|---------|-------|
| ROUTE001 | POST /auth/register | client | P0 | US001 | Đăng ký tài khoản |
| ROUTE002 | POST /auth/login | client | P0 | US002 | Đăng nhập |
| ROUTE003 | POST /auth/refresh-token | client | P0 | US003 | Làm mới access token |
| ROUTE004 | POST /auth/logout | client | P0 | US004 | Đăng xuất |
| ROUTE005 | POST /auth/otp | client | P0 | US005 | Yêu cầu mã OTP |
| ROUTE006+007 | GET .../authorization-url + GET .../callback | client | P0 | US006 | Đăng nhập bằng Google |
| ROUTE008 | POST /auth/forgot-password | client | P0 | US007 | Đặt lại mật khẩu đã quên |
| ROUTE009 | POST /auth/2fa/enable | client | P0 | US008 | Bật xác thực hai yếu tố |
| ROUTE010 | POST /auth/2fa/disable | client | P0 | US009 | Tắt xác thực hai yếu tố |
| ROUTE011 | GET /brands | client | P1 | US010 | Xem danh sách brand |
| ROUTE012 | GET /brands/:id | client | P1 | US011 | Xem chi tiết brand |
| ROUTE013 | POST /brands | admin | P2 | US012 | Tạo brand |
| ROUTE014 | PUT /brands/:id | admin | P2 | US013 | Cập nhật brand |
| ROUTE015 | DELETE /brands/:id | admin | P2 | US014 | Xoá brand |
| ROUTE016 | GET /brand-translations | admin | P2 | US015 | Xem danh sách bản dịch brand |
| ROUTE017 | GET /brand-translations/:id | admin | P2 | US016 | Xem chi tiết bản dịch brand |
| ROUTE018 | POST /brand-translations | admin | P2 | US017 | Tạo bản dịch brand |
| ROUTE019 | PUT /brand-translations/:id | admin | P2 | US018 | Cập nhật bản dịch brand |
| ROUTE020 | DELETE /brand-translations/:id | admin | P2 | US019 | Xoá bản dịch brand |
| ROUTE021 | GET /categories | client | P1 | US020 | Xem danh sách category |
| ROUTE022 | GET /categories/:id | client | P1 | US021 | Xem chi tiết category |
| ROUTE023 | POST /categories | admin | P2 | US022 | Tạo category |
| ROUTE024 | PUT /categories/:id | admin | P2 | US023 | Cập nhật category |
| ROUTE025 | DELETE /categories/:id | admin | P2 | US024 | Xoá category |
| ROUTE026 | GET /category-translations | admin | P2 | US025 | Xem danh sách bản dịch category |
| ROUTE027 | GET /category-translations/:id | admin | P2 | US026 | Xem chi tiết bản dịch category |
| ROUTE028 | POST /category-translations | admin | P2 | US027 | Tạo bản dịch category |
| ROUTE029 | PUT /category-translations/:id | admin | P2 | US028 | Cập nhật bản dịch category |
| ROUTE030 | DELETE /category-translations/:id | admin | P2 | US029 | Xoá bản dịch category |
| ROUTE031 | GET /languages | admin | P2 | US030 | Xem danh sách ngôn ngữ |
| ROUTE032 | GET /languages/:id | admin | P2 | US031 | Xem chi tiết ngôn ngữ |
| ROUTE033 | POST /languages/create | admin | P2 | US032 | Tạo ngôn ngữ |
| ROUTE034 | PUT /languages/:id | admin | P2 | US033 | Cập nhật ngôn ngữ |
| ROUTE035 | DELETE /languages/:id | admin | P2 | US034 | Xoá ngôn ngữ |
| ROUTE036 | POST /media/upload/image | seller | P1 | US035 | Upload một ảnh |
| ROUTE037 | POST /media/upload/array-of-images | seller | P1 | US036 | Upload mảng ảnh |
| ROUTE038 | POST /media/upload/multiple-images | seller | P1 | US037 | Upload nhiều ảnh có tên field |
| ROUTE039 | GET /media/presigned-url | seller | P1 | US038 | Lấy presigned URL cho media |
| ROUTE040 | DELETE /media/delete | seller | P1 | US039 | Xoá media object |
| ROUTE041 | GET /permissions | admin | P2 | US040 | Xem danh sách permission |
| ROUTE042 | GET /permissions/:id | admin | P2 | US041 | Xem chi tiết permission |
| ROUTE043 | POST /permissions | admin | P2 | US042 | Tạo permission — **RETIRED 2026-09-21** |
| ROUTE044 | PUT /permissions/:id | admin | P2 | US043 | Cập nhật permission — **RETIRED 2026-09-21** |
| ROUTE045 | DELETE /permissions/:id | admin | P2 | US044 | Xoá permission — **RETIRED 2026-09-21** |
| ROUTE046 | GET /product-translations | client | P2 | US045 | Xem danh sách bản dịch sản phẩm |
| ROUTE047 | GET /product-translations/:id | client | P2 | US046 | Xem chi tiết bản dịch sản phẩm |
| ROUTE048 | POST /product-translations | client | P2 | US047 | Tạo bản dịch sản phẩm |
| ROUTE049 | PUT /product-translations/:id | client | P2 | US048 | Cập nhật bản dịch sản phẩm |
| ROUTE050 | DELETE /product-translations/:id | client | P2 | US049 | Xoá bản dịch sản phẩm |
| ROUTE051 | GET /products | client | P1 | US050 | Duyệt catalog sản phẩm |
| ROUTE052 | GET /products/:id | client | P1 | US051 | Xem chi tiết sản phẩm |
| ROUTE053 | GET /manage-product/products | seller | P1 | US052 | Xem danh sách sản phẩm của mình |
| ROUTE054 | GET /manage-product/products/:id | seller | P1 | US053 | Xem chi tiết sản phẩm của mình |
| ROUTE055 | POST /manage-product/products | seller | P1 | US054 | Tạo sản phẩm |
| ROUTE056 | PUT /manage-product/products/:id | seller | P1 | US055 | Cập nhật sản phẩm của mình |
| ROUTE057 | DELETE /manage-product/products/:id | seller | P1 | US056 | Xoá sản phẩm của mình |
| ROUTE058 | GET /profile | client | P1 | US057 | Xem profile của mình |
| ROUTE059 | PUT /profile | client | P1 | US058 | Cập nhật profile của mình |
| ROUTE060 | PUT /profile/change-password | client | P1 | US059 | Đổi mật khẩu của mình |
| ROUTE061 | GET /roles | admin | P2 | US060 | Xem danh sách role |
| ROUTE062 | GET /roles/:id | admin | P2 | US061 | Xem chi tiết role |
| ROUTE063 | POST /roles | admin | P2 | US062 | Tạo role |
| ROUTE064 | PUT /roles/:id | admin | P2 | US063 | Cập nhật role |
| ROUTE065 | DELETE /roles/:id | admin | P2 | US064 | Xoá role |
| ROUTE066 | GET /users | admin | P2 | US065 | Xem danh sách user |
| ROUTE067 | GET /users/:id | admin | P2 | US066 | Xem chi tiết user |
| ROUTE068 | POST /users | admin | P2 | US067 | Tạo user |
| ROUTE069 | PUT /users/:id | admin | P1 | US068 | Cập nhật user và thăng role |
| ROUTE070 | DELETE /users/:id | admin | P2 | US069 | Xoá user |
| ROUTE071 | GET /cart | client | P0 | US070 | Xem danh sách cart |
| ROUTE072 | POST /cart | client | P0 | US071 | Thêm cart item |
| ROUTE073 | PUT /cart/:cartItemId | client | P0 | US072 | Cập nhật số lượng cart item |
| ROUTE074 | DELETE /cart/:cartItemId | client | P0 | US073 | Xoá cart item |
| ROUTE075 | GET /orders | client | P0 | US074 | Xem danh sách order của mình |
| ROUTE076 | GET /orders/:orderId | client | P0 | US075 | Xem chi tiết order của mình |
| ROUTE077 | POST /orders | client | P0 | US076 | Checkout giỏ hàng |
| ROUTE078 | PUT /orders/:orderId/cancel | client | P0 | US077 | Huỷ order của mình |
| ROUTE079 | GET /manage-order/orders | seller | P0 | US078 | Xem danh sách order cần quản lý |
| ROUTE080 | GET /manage-order/orders/:orderId | seller | P0 | US079 | Xem chi tiết order cần quản lý |
| ROUTE081 | PUT /manage-order/orders/:orderId/status | seller | P0 | US080 | Cập nhật trạng thái order |
| ROUTE082 | GET /reviews | client | P1 | US081 | Xem review sản phẩm |
| ROUTE083 | POST /reviews | client | P1 | US082 | Tạo review |
| ROUTE084 | PUT /reviews/:reviewId | client | P1 | US083 | Cập nhật review |
| ROUTE085 | DELETE /reviews/:reviewId | client | P1 | US084 | Xoá review |

> Mỗi route map đúng 1:1 với một US, trừ ROUTE006+ROUTE007 gộp chung vào US006 —
> cả hai bước đều nằm trong một lượt bấm đăng nhập Google, cùng một actor, không rẽ nhánh giữa
> chúng, và bước "lấy authorization URL" đứng riêng thì không mang ý nghĩa gì với người dùng
> (ngoại lệ gộp, Bước 3).
> Không có hàng `[IPE_ZERO]` — mọi route đều có ≥1 US map tới.
> ROUTE071–085 thêm vào ngày 2026-09-12 (F011/F012/F013). Các hàng `manage-order/orders` viết
> `seller` là actor chính vì MANAGE-ORDER là hàng đợi order cho các sản phẩm của chính seller đó
> (PERM011); `admin` dùng chung route nhưng với scope nhìn thấy không giới hạn
> (`ManageOrderService.buildActorScope`) chứ không tách thành một US riêng.

---

## Auth

### US001_RegisterAccount
> Là một client, tôi muốn đăng ký tài khoản mới để có thể bắt đầu dùng nền tảng.
- AC: Gửi email/mật khẩu/tên/số điện thoại hợp lệ sẽ tạo một `User` với role bị ép thành `CLIENT` (PERM006) — không có field nào cho phép người gọi tự chọn role khác.
- AC: Email trùng trả về lỗi conflict (BL007 map Prisma `P2002` → 409).
- Route: ROUTE001, POST /auth/register, public (PERM002).

### US002_LogIn
> Là một client, tôi muốn đăng nhập bằng email và mật khẩu để có thể truy cập tài khoản của mình.
- AC: Credential hợp lệ trả về cặp access token + refresh token.
- AC: Credential sai bị từ chối mà không tiết lộ field nào sai.
- Route: ROUTE002, POST /auth/login, public (PERM002).

### US003_RefreshAccessToken
> Là một client, tôi muốn đổi refresh token lấy access token mới để phiên đăng nhập của mình vẫn còn hiệu lực mà không cần nhập lại credential.
- AC: Refresh token hợp lệ, chưa bị thu hồi thì được cấp access token mới.
- AC: Refresh token hết hạn/không hợp lệ thì bị từ chối.
- Route: ROUTE003, POST /auth/refresh-token, public (PERM002).

### US004_LogOut
> Là một client, tôi muốn đăng xuất để token của session hiện tại bị vô hiệu hoá.
- AC: Logout làm vô hiệu bản ghi session/device đang hoạt động của người gọi.
- AC: Áp dụng như nhau cho `seller` và `admin` — module AUTH được cấp cho cả ba role (PERM005).
- Route: ROUTE004, POST /auth/logout, Bearer (PERM001, PERM003).

### US005_RequestOtpCode
> Là một client, tôi muốn yêu cầu mã xác thực dùng một lần để có thể xác minh danh tính.
- AC: Một bản ghi `VerificationCode` được tạo cho người gọi.
- AC: `[UNVERIFIED gap]` mã này hiện KHÔNG được gửi qua email — chỗ gọi `EmailService` trong `AuthService.sendOTP` đang bị comment out (BL005); mã chỉ tồn tại trong DB.
- Route: ROUTE005, POST /auth/otp, public (PERM002).

### US006_LogInWithGoogle
> Là một client, tôi muốn đăng nhập bằng tài khoản Google để không cần một mật khẩu riêng cho nền tảng này.
- AC: Bắt đầu flow trả về một Google consent URL; hoàn tất flow đó (qua redirect của Google) sẽ tạo một user `CLIENT` mới nếu là lần đăng nhập đầu, hoặc đăng nhập vào tài khoản đã có theo email (PERM006, BL003).
- AC: Lần đầu đăng nhập bằng Google được gán một mật khẩu local placeholder cố định (`"changeme"`, đã hash) — đây là một business rule đáng đưa cho bên security review.
- Route: ROUTE006 (GET /auth/google/authorization-url) + ROUTE007 (GET /auth/google/callback), public (PERM002); BL003.

### US007_ResetForgottenPassword
> Là một client, tôi muốn đặt lại mật khẩu đã quên để lấy lại quyền truy cập tài khoản.
- AC: Một yêu cầu reset hợp lệ sẽ cập nhật mật khẩu của tài khoản.
- AC: Endpoint này không yêu cầu session sẵn có (public, PERM002).
- Route: ROUTE008, POST /auth/forgot-password, public.

### US008_EnableTwoFactorAuth
> Là một client, tôi muốn bật xác thực hai yếu tố để tài khoản có thêm một lớp bảo vệ.
- AC: Bật 2FA lưu setting này trên chính tài khoản của người gọi (theo Bearer, không có param target user).
- AC: Áp dụng như nhau cho `seller`/`admin` (module AUTH, PERM005).
- Route: ROUTE009, POST /auth/2fa/enable, Bearer (PERM001, PERM003).

### US009_DisableTwoFactorAuth
> Là một client, tôi muốn tắt xác thực hai yếu tố để có thể đăng nhập chỉ bằng mật khẩu như trước.
- AC: Tắt 2FA lưu setting này trên chính tài khoản của người gọi.
- AC: Áp dụng cross-role giống US008.
- Route: ROUTE010, POST /auth/2fa/disable, Bearer.

## Brands

### US010_ViewBrandList
> Là một client, tôi muốn xem danh sách brand để có thể duyệt những gì đang có trong catalog.
- AC: Trả về tất cả brand đang active, không cần auth.
- AC: Module BRANDS là một trong 7 module được cấp cho client (PERM005).
- Route: ROUTE011, GET /brands, public.

### US011_ViewBrandDetail
> Là một client, tôi muốn xem chi tiết một brand để biết thêm thông tin về nó.
- AC: Trả về brand khớp `:id`, hoặc 404 nếu không tìm thấy.
- AC: `[UNVERIFIED]` Swagger gắn tag `@ApiPublic` cho route này nhưng nó không có `@IsPublicApi()` — lúc chạy thật vẫn đòi Bearer token dù doc nói khác (PERM010); ở đây coi là route cần Bearer.
- Route: ROUTE012, GET /brands/:id, Bearer (theo phát hiện doc-drift ở PERM010).

### US012_CreateBrand
> Là một admin, tôi muốn tạo một brand mới để nó xuất hiện trong catalog.
- AC: Payload hợp lệ sẽ tạo một bản ghi `Brand` mới.
- AC: `[UNVERIFIED]` theo mâu thuẫn nguồn đã nêu ở trên — việc `client` có gọi được endpoint này hay không vẫn chưa rõ; ở đây chỉ khẳng định `admin`.
- Route: ROUTE013, POST /brands, Bearer.

### US013_UpdateBrand
> Là một admin, tôi muốn cập nhật một brand có sẵn để thông tin catalog luôn chính xác.
- AC: Payload hợp lệ sẽ cập nhật brand khớp `:id`.
- AC: Cùng lưu ý `[UNVERIFIED]` về quyền của client như US012.
- Route: ROUTE014, PUT /brands/:id, Bearer.

### US014_DeleteBrand
> Là một admin, tôi muốn xoá một brand để nó không còn xuất hiện trong catalog.
- AC: Brand khớp `:id` bị xoá (hoặc xoá mềm theo convention của repository).
- AC: Cùng lưu ý `[UNVERIFIED]` về quyền của client như US012.
- Route: ROUTE015, DELETE /brands/:id, Bearer.

## Brand Translations (module chỉ dành cho admin)

### US015_ViewBrandTranslationList
> Là một admin, tôi muốn xem tất cả bản dịch brand để kiểm tra tên brand đã bản địa hoá.
- AC: Trả về tất cả bản ghi brand-translation.
- AC: BRAND-TRANSLATIONS chỉ `admin` truy cập được (PERM005) — cả seller lẫn client đều không có module này.
- Route: ROUTE016, GET /brand-translations, Bearer.

### US016_ViewBrandTranslationDetail
> Là một admin, tôi muốn xem chi tiết một bản dịch brand để kiểm tra nội dung đã bản địa hoá.
- AC: Trả về bản dịch khớp `:id`, hoặc 404.
- Route: ROUTE017, GET /brand-translations/:id, Bearer.

### US017_CreateBrandTranslation
> Là một admin, tôi muốn thêm bản dịch cho một brand để nó hiển thị đúng ở ngôn ngữ khác.
- AC: Tạo một bản ghi bản dịch gắn với brand + ngôn ngữ đã có sẵn.
- Route: ROUTE018, POST /brand-translations, Bearer.

### US018_UpdateBrandTranslation
> Là một admin, tôi muốn sửa một bản dịch brand có sẵn để nội dung bản địa hoá luôn đúng.
- AC: Cập nhật bản dịch khớp `:id`.
- Route: ROUTE019, PUT /brand-translations/:id, Bearer.

### US019_DeleteBrandTranslation
> Là một admin, tôi muốn xoá một bản dịch brand để nội dung bản địa hoá đã lỗi thời không còn hiển thị nữa.
- AC: Xoá bản dịch khớp `:id`.
- Route: ROUTE020, DELETE /brand-translations/:id, Bearer.

## Categories

### US020_ViewCategoryList
> Là một client, tôi muốn xem danh sách category để duyệt catalog theo category.
- AC: Trả về tất cả category đang active. Yêu cầu Bearer token — `category.controller.ts:45` không có `@IsPublicApi()`, nên mặc định của `AuthorizationHeaderGuard` toàn cục vẫn áp dụng.
- Route: ROUTE021, GET /categories, Bearer (CATEGORIES là module được cấp cho client, PERM005).

### US021_ViewCategoryDetail
> Là một client, tôi muốn xem chi tiết một category để biết nó chứa gì.
- AC: Trả về category khớp `:id`, hoặc 404.
- Route: ROUTE022, GET /categories/:id, Bearer.

### US022_CreateCategory
> Là một admin, tôi muốn tạo một category mới để sản phẩm có thể được sắp xếp vào đó.
- AC: Payload hợp lệ sẽ tạo một bản ghi `Category` mới. `[UNVERIFIED]` cùng lưu ý về quyền client như brand.
- Route: ROUTE023, POST /categories, Bearer.

### US023_UpdateCategory
> Là một admin, tôi muốn cập nhật một category có sẵn để thông tin luôn chính xác.
- AC: Payload hợp lệ sẽ cập nhật category khớp `:id`.
- Route: ROUTE024, PUT /categories/:id, Bearer.

### US024_DeleteCategory
> Là một admin, tôi muốn xoá một category để nó không còn dùng để sắp xếp sản phẩm nào nữa.
- AC: Category khớp `:id` bị xoá.
- Route: ROUTE025, DELETE /categories/:id, Bearer.

## Category Translations (module chỉ dành cho admin)

### US025_ViewCategoryTranslationList
> Là một admin, tôi muốn xem tất cả bản dịch category để kiểm tra tên category đã bản địa hoá.
- AC: Trả về tất cả bản ghi category-translation. Route: ROUTE026, GET /category-translations, Bearer.

### US026_ViewCategoryTranslationDetail
> Là một admin, tôi muốn xem chi tiết một bản dịch category để kiểm tra nội dung đã bản địa hoá.
- AC: Trả về bản dịch khớp `:id`, hoặc 404. Route: ROUTE027, GET /category-translations/:id, Bearer.

### US027_CreateCategoryTranslation
> Là một admin, tôi muốn thêm bản dịch cho một category để nó hiển thị đúng ở ngôn ngữ khác.
- AC: Tạo một bản ghi bản dịch gắn với category + ngôn ngữ đã có sẵn. Route: ROUTE028, POST /category-translations, Bearer.

### US028_UpdateCategoryTranslation
> Là một admin, tôi muốn sửa một bản dịch category có sẵn để nội dung bản địa hoá luôn đúng.
- AC: Cập nhật bản dịch khớp `:id`. Route: ROUTE029, PUT /category-translations/:id, Bearer.

### US029_DeleteCategoryTranslation
> Là một admin, tôi muốn xoá một bản dịch category để nội dung bản địa hoá đã lỗi thời không còn hiển thị nữa.
- AC: Xoá bản dịch khớp `:id`. Route: ROUTE030, DELETE /category-translations/:id, Bearer.

## Languages (module chỉ dành cho admin)

### US030_ViewLanguageList
> Là một admin, tôi muốn xem danh sách ngôn ngữ được hỗ trợ để biết catalog hỗ trợ locale nào.
- AC: Trả về tất cả bản ghi `Language`. Route: ROUTE031, GET /languages, Bearer.

### US031_ViewLanguageDetail
> Là một admin, tôi muốn xem chi tiết một ngôn ngữ để xác nhận cấu hình của nó.
- AC: Trả về ngôn ngữ khớp `:id`, hoặc 404. Route: ROUTE032, GET /languages/:id, Bearer.

### US032_CreateLanguage
> Là một admin, tôi muốn thêm một ngôn ngữ hỗ trợ mới để bản dịch có thể nhắm tới nó.
- AC: Tạo một bản ghi `Language` mới. Route: ROUTE033, POST /languages/create, Bearer.

### US033_UpdateLanguage
> Là một admin, tôi muốn cập nhật cấu hình một ngôn ngữ để metadata của nó luôn chính xác.
- AC: Cập nhật ngôn ngữ khớp `:id`. Route: ROUTE034, PUT /languages/:id, Bearer.

### US034_DeleteLanguage
> Là một admin, tôi muốn xoá một ngôn ngữ hỗ trợ để nó không còn được dùng để dịch nữa.
- AC: Xoá ngôn ngữ khớp `:id`. Route: ROUTE035, DELETE /languages/:id, Bearer.

## Media

### US035_UploadSingleImage
> Là một seller, tôi muốn upload một ảnh lớn từ máy để đính kèm vào một product listing.
- AC: Chấp nhận `image/jpeg|png|gif|webp` trong giới hạn multer disk-storage; từ chối MIME/extension không được phép (BL012).
- AC: File được lưu sẽ được đẩy lên S3 với server-side encryption (BL004). Quyền truy cập giống nhau cho `admin`/`client` — MEDIA là module dùng chung (PERM005).
- Route: ROUTE036, POST /media/upload/image, Bearer.

### US036_UploadImageArray
> Là một seller, tôi muốn upload một mảng ảnh trong một request để đính kèm nhiều ảnh vào listing cùng lúc.
- AC: Từ chối nếu số lượng/kích thước/MIME/extension vi phạm giới hạn của `ArrayFilesValidationPipe` (tối đa 10 file, 5MB/file, tổng 50MB — BL009).
- Route: ROUTE037, POST /media/upload/array-of-images, Bearer.

### US037_UploadMultipleNamedImages
> Là một seller, tôi muốn upload nhiều ảnh theo các field tên riêng để các vị trí ảnh khác nhau (ví dụ thumbnail và gallery) được điền đúng.
- AC: Mỗi field khai báo được validate riêng (maxCount/size/MIME theo từng field); một field không khai báo sẽ bị từ chối (BL011).
- Route: ROUTE038, POST /media/upload/multiple-images, Bearer.

### US038_GetMediaPresignedUrl
> Là một seller, tôi muốn xin một presigned URL để có thể upload hoặc download file trực tiếp lên/từ S3.
- AC: Trả về một presigned URL có giới hạn thời gian (BL004). Nếu áp dụng thì kiểm tra file có tồn tại trước.
- Route: ROUTE039, GET /media/presigned-url, Bearer.

### US039_DeleteMediaObject
> Là một seller, tôi muốn xoá một media object đã upload để nó không còn trong storage.
- AC: Xoá object trên S3 theo key; nếu key không tồn tại thì coi như đã xoá rồi (BL004 `checkFileExists`).
- Route: ROUTE040, DELETE /media/delete, Bearer.

## Permissions (module chỉ dành cho admin)

### US040_ViewPermissionList
> Là một admin, tôi muốn xem danh sách bản ghi permission để kiểm tra các quyền đang tồn tại.
- AC: Trả về tất cả bản ghi `Permission` (path/method/module). Route: ROUTE041, GET /permissions, Bearer.

### US041_ViewPermissionDetail
> Là một admin, tôi muốn xem chi tiết một bản ghi permission để xác nhận thông tin của nó.
- AC: Trả về bản ghi khớp `:id`, hoặc 404. Route: ROUTE042, GET /permissions/:id, Bearer.

### US042_CreatePermission
> Là một admin, tôi muốn tạo một bản ghi permission để một role có thể được cấp quyền truy cập một route.
- AC: Tạo một bản ghi `Permission`. AC: `[UNVERIFIED]` bản ghi này có thể bị ghi đè ở lần chạy tiếp theo của sync script BL001, script này xoá các bản ghi của route không còn tồn tại và tính lại quyền theo module.
- Route: ROUTE043, POST /permissions, Bearer. **RETIRED 2026-09-21** — permission catalogue giờ do code quản lý; endpoint này không còn tồn tại.

### US043_UpdatePermission
> Là một admin, tôi muốn cập nhật một bản ghi permission để liên kết role/module của nó luôn đúng.
- AC: Cập nhật bản ghi khớp `:id`. Route: ROUTE044, PUT /permissions/:id, Bearer. **RETIRED 2026-09-21** — endpoint đã bị gỡ; muốn đổi quyền thì dùng `PUT /roles/:id`.

### US044_DeletePermission
> Là một admin, tôi muốn xoá một bản ghi permission để một role mất quyền truy cập route đó.
- AC: Xoá bản ghi khớp `:id`. Route: ROUTE045, DELETE /permissions/:id, Bearer. **RETIRED 2026-09-21** — endpoint đã bị gỡ; một key sẽ biến mất khi không còn handler nào khai báo nó.

## Product Translations

### US045_ViewProductTranslationList
> Là một client, tôi muốn xem bản dịch sản phẩm để thấy nội dung sản phẩm đã bản địa hoá.
- AC: Trả về tất cả bản ghi product-translation. PRODUCT-TRANSLATIONS được cấp cho cả `client` lẫn `seller` (PERM005).
- Route: ROUTE046, GET /product-translations, Bearer.

### US046_ViewProductTranslationDetail
> Là một client, tôi muốn xem chi tiết một bản dịch sản phẩm để thấy nội dung đã bản địa hoá.
- AC: Trả về bản dịch khớp `:id`, hoặc 404. Route: ROUTE047, GET /product-translations/:id, Bearer.

### US047_CreateProductTranslation
> Là một client, tôi muốn thêm bản dịch cho một sản phẩm để nó hiển thị đúng ở ngôn ngữ khác.
- AC: Tạo một bản ghi bản dịch gắn với sản phẩm + ngôn ngữ đã có sẵn.
- Route: ROUTE048, POST /product-translations, Bearer.

### US048_UpdateProductTranslation
> Là một client, tôi muốn sửa một bản dịch sản phẩm có sẵn để nội dung bản địa hoá luôn đúng.
- AC: Cập nhật bản dịch khớp `:id`. Route: ROUTE049, PUT /product-translations/:id, Bearer.

### US049_DeleteProductTranslation
> Là một client, tôi muốn xoá một bản dịch sản phẩm để nội dung bản địa hoá đã lỗi thời không còn hiển thị nữa.
- AC: Xoá bản dịch khớp `:id`. Route: ROUTE050, DELETE /product-translations/:id, Bearer.

## Public Product Catalog

### US050_BrowseProductCatalog
> Là một client, tôi muốn duyệt catalog sản phẩm để tìm sản phẩm muốn xem xét.
- AC: Trả về danh sách sản phẩm public, không cần auth (cả caller vô danh cũng gọi được).
- Route: ROUTE051, GET /products, public.

### US051_ViewProductDetail
> Là một client, tôi muốn xem chi tiết một sản phẩm để quyết định có mua hay không.
- AC: Trả về sản phẩm khớp `:id`, hoặc 404. Không cần auth.
- Route: ROUTE052, GET /products/:id, public.

## Manage Product (thuộc sở hữu của seller)

### US052_ListOwnProducts
> Là một seller, tôi muốn liệt kê các sản phẩm mình đã tạo để quản lý catalog của riêng mình.
- AC: Danh sách mặc định lọc theo `createdById = caller.userId` (PERM007) — một seller không bao giờ thấy sản phẩm của seller khác qua endpoint này.
- AC: `admin` bỏ qua rào chắn ownership này và thấy được sản phẩm của mọi seller.
- Route: ROUTE053, GET /manage-product/products, Bearer.

### US053_ViewOwnProductDetail
> Là một seller, tôi muốn xem chi tiết một sản phẩm mình đã tạo để kiểm tra đầy đủ dữ liệu.
- AC: Trả về 403 nếu `product.createdById !== caller.userId` và người gọi không phải `admin` (PERM007).
- Route: ROUTE054, GET /manage-product/products/:id, Bearer.

### US054_CreateProduct
> Là một seller, tôi muốn tạo một sản phẩm mới để đăng bán.
- AC: `createdById` của sản phẩm mới được set thành người gọi, thiết lập ownership để dùng cho các check PERM007 sau này.
- Route: ROUTE055, POST /manage-product/products, Bearer.

### US055_UpdateOwnProduct
> Là một seller, tôi muốn cập nhật một sản phẩm mình đã tạo để thông tin listing luôn chính xác.
- AC: Bị từ chối với 403 nếu sản phẩm thuộc về seller khác (PERM007); `admin` có thể cập nhật bất kỳ sản phẩm nào.
- Route: ROUTE056, PUT /manage-product/products/:id, Bearer.

### US056_DeleteOwnProduct
> Là một seller, tôi muốn xoá một sản phẩm mình đã tạo để nó không còn được đăng bán.
- AC: Bị từ chối với 403 nếu sản phẩm thuộc về seller khác (PERM007); `admin` có thể xoá bất kỳ sản phẩm nào.
- Route: ROUTE057, DELETE /manage-product/products/:id, Bearer.

## Profile

### US057_ViewOwnProfile
> Là một client, tôi muốn xem profile của mình để thấy thông tin tài khoản.
- AC: Trả về profile của chính người gọi (xác định từ Bearer token, không có param `:id`).
- AC: Áp dụng như nhau cho `seller`/`admin` (PROFILE được cấp cho cả ba role, PERM005).
- Route: ROUTE058, GET /profile, Bearer.

### US058_UpdateOwnProfile
> Là một client, tôi muốn cập nhật profile của mình để thông tin tài khoản luôn mới nhất.
- AC: Chỉ cập nhật profile của chính người gọi — route này không có đường nào để update user khác.
- Route: ROUTE059, PUT /profile, Bearer.

### US059_ChangeOwnPassword
> Là một client, tôi muốn đổi mật khẩu của mình để xoay vòng credential.
- AC: Yêu cầu session hiện tại của chính người gọi; không nhận id của user khác.
- Route: ROUTE060, PUT /profile/change-password, Bearer.

## Roles (module chỉ dành cho admin)

### US060_ViewRoleList
> Là một admin, tôi muốn xem danh sách role để biết hệ thống đang có những role nào.
- AC: Trả về tất cả bản ghi `Role`, gồm cả 3 role đã seed sẵn. Route: ROUTE061, GET /roles, Bearer.

### US061_ViewRoleDetail
> Là một admin, tôi muốn xem chi tiết một role để kiểm tra các quyền của nó.
- AC: Trả về role khớp `:id`, hoặc 404. Route: ROUTE062, GET /roles/:id, Bearer.

### US062_CreateRole
> Là một admin, tôi muốn tạo một role tuỳ chỉnh mới để cấp một tập quyền riêng biệt.
- AC: Tạo một bản ghi `Role` mới; không bị ảnh hưởng bởi khoá core-role (PERM008 chỉ chặn update/delete).
- Route: ROUTE063, POST /roles, Bearer.

### US063_UpdateRole
> Là một admin, tôi muốn cập nhật một role để thay đổi tập quyền của nó.
- AC: Bị từ chối với 403 nếu tên role đích là `admin`, `client`, hoặc `seller` (PERM008) — chỉ role tuỳ chỉnh mới sửa được.
- Route: ROUTE064, PUT /roles/:id, Bearer.

### US064_DeleteRole
> Là một admin, tôi muốn xoá một role tuỳ chỉnh để nó không còn gán được nữa.
- AC: Bị từ chối với 403 nếu tên role đích là `admin`, `client`, hoặc `seller` (PERM008).
- Route: ROUTE065, DELETE /roles/:id, Bearer.

## Users (module chỉ dành cho admin)

### US065_ViewUserList
> Là một admin, tôi muốn xem danh sách user để quản lý tài khoản.
- AC: Trả về tất cả bản ghi `User`. Route: ROUTE066, GET /users, Bearer.

### US066_ViewUserDetail
> Là một admin, tôi muốn xem chi tiết một user để kiểm tra tài khoản của họ.
- AC: Trả về user khớp `:id`, hoặc 404. Route: ROUTE067, GET /users/:id, Bearer.

### US067_CreateUser
> Là một admin, tôi muốn tạo một tài khoản user mới để onboard trực tiếp cho ai đó.
- AC: Tạo một bản ghi `User`; field `roleId` ở đây do người gọi tự set được (khác với self-registration, luôn bị ép thành `client`).
- Route: ROUTE068, POST /users, Bearer.

### US068_UpdateUserAndPromoteRole
> Là một admin, tôi muốn cập nhật role của một user để có thể thăng cấp họ lên seller hoặc admin.
- AC: `UpdateUserRequestDto.roleId` cho phép admin set bất kỳ role nào — đây là đường DUY NHẤT trong hệ thống để nâng một `client` tự đăng ký lên `seller`/`admin` (PERM006).
- AC: Chỉ `admin` mới tới được route này — module USERS chỉ dành cho admin (PERM005); `seller`/`client` bị 403 trước khi logic này chạy.
- Route: ROUTE069, PUT /users/:id, Bearer.

### US069_DeleteUser
> Là một admin, tôi muốn xoá một tài khoản user để nó bị gỡ khỏi hệ thống.
- AC: Xoá user khớp `:id`. Route: ROUTE070, DELETE /users/:id, Bearer.

## Cart

### US070_ViewCartList
> Là một client, tôi muốn xem các dòng cart của mình để biết mình đã thêm gì trước khi checkout.
- AC: Chỉ trả về bản ghi `CartItem` của chính người gọi (BR-C01), có phân trang.
- Route: ROUTE071, GET /cart, Bearer.

### US071_AddCartItem
> Là một client, tôi muốn thêm một SKU vào cart để mua sau.
- AC: Thêm một SKU đã có sẵn trong cart sẽ tăng số lượng của dòng đó thay vì tạo dòng thứ hai (BR-C04, được DB ép buộc bằng `@@unique([userId, skuId])`).
- AC: Bị từ chối với 400 nếu số lượng kết quả vượt `SKU.stock` (BR-C03); bị từ chối với 404 nếu SKU không tồn tại, đã bị xoá, hoặc sản phẩm của nó chưa publish (BR-C02).
- Route: ROUTE072, POST /cart, Bearer.

### US072_UpdateCartItemQuantity
> Là một client, tôi muốn đặt số lượng cho một dòng cart để phản ánh đúng số lượng mình thật sự muốn.
- AC: Bị từ chối với 400 nếu số lượng mới vượt `SKU.stock`; bị từ chối với 404 nếu dòng đó thuộc về user khác (BR-C01) hoặc không tồn tại.
- Route: ROUTE073, PUT /cart/:cartItemId, Bearer.

### US073_RemoveCartItem
> Là một client, tôi muốn xoá một dòng cart để nó không còn nằm trong danh sách có thể mua.
- AC: Luôn là hard delete — `CartItem` không có `deletedAt` (BR-C05). Dòng của user khác trả về 404, không bao giờ 403.
- Route: ROUTE074, DELETE /cart/:cartItemId, Bearer.

## Orders (phía người mua)

### US074_ViewOwnOrderList
> Là một client, tôi muốn xem các order của mình để theo dõi những gì đã mua.
- AC: Chỉ trả về order có `userId` là của người gọi (BR-O06), có thể lọc theo status, có phân trang.
- Route: ROUTE075, GET /orders, Bearer.

### US075_ViewOwnOrderDetail
> Là một client, tôi muốn xem chi tiết một order của mình để thấy các dòng snapshot đã đóng băng.
- AC: Trả về các dòng `ProductSKUSnapshot` của order (tên/giá/ảnh sản phẩm, giá trị SKU, số lượng đúng như tại thời điểm mua, BR-O03), chứ không phải sản phẩm hiện tại. `orderId` của người mua khác trả về 404.
- Route: ROUTE076, GET /orders/:orderId, Bearer.

### US076_CheckoutCart
> Là một client, tôi muốn checkout các dòng cart đã chọn để chúng trở thành một order thật, theo dõi được.
- AC: Các dòng cart đã chọn được nhóm theo seller (`product.createdById`) — mỗi seller một `Order` (BR-O01).
- AC: Một transaction duy nhất validate stock, trừ stock, tạo (các) order cùng dòng snapshot của chúng, và xoá các dòng cart đã dùng; nếu có lỗi thì rollback toàn bộ checkout (BR-O02).
- AC: Một cart item id không thuộc về người gọi sẽ làm fail toàn bộ request, không chỉ dòng đó (BR-O07).
- Route: ROUTE077, POST /orders, Bearer.

### US077_CancelOwnOrder
> Là một client, tôi muốn huỷ order của mình khi nó còn đang chờ xác nhận để lấy lại tiền/cam kết của mình.
- AC: Chỉ người mua sở hữu order mới huỷ được, và chỉ khi `status = PENDING_CONFIRMATION` (BR-O04); ngoài ra bị từ chối với 400.
- AC: Huỷ order sẽ hoàn lại stock mà các dòng snapshot của order đã trừ.
- Route: ROUTE078, PUT /orders/:orderId/cancel, Bearer.

## Manage Orders (seller/admin)

### US078_ViewManageOrderList
> Là một seller, tôi muốn xem các order chứa sản phẩm của mình để có thể xử lý (fulfil) chúng.
- AC: Một seller chỉ thấy order có dòng snapshot tham chiếu tới sản phẩm mình tạo ra; admin thấy tất cả (BR-O06, PERM011). Một caller là `client` bị từ chối với 403 trước khi logic này chạy (MANAGE-ORDER không nằm trong allowlist module của họ).
- Route: ROUTE079, GET /manage-order/orders, Bearer.

### US079_ViewManageOrderDetail
> Là một seller, tôi muốn xem đầy đủ chi tiết một order để biết cần xử lý (fulfil) gì.
- AC: Cùng scope hiển thị như US078; một order ngoài scope của người gọi trả về 404, không bao giờ 403.
- Route: ROUTE080, GET /manage-order/orders/:orderId, Bearer.

### US080_UpdateOrderStatus
> Là một seller, tôi muốn chuyển trạng thái của một order để theo dõi tiến độ xử lý (fulfilment).
- AC: Chỉ chuỗi tuyến tính `PENDING_CONFIRMATION → PENDING_PICKUP → PENDING_DELIVERY → DELIVERED`, cộng thêm `DELIVERED → RETURNED`, là hợp lệ (BR-O05); chuyển trạng thái nào khác đều bị từ chối với 400, kèm tên trạng thái hiện tại và trạng thái yêu cầu.
- AC: Đặt `CANCELLED` qua route này luôn bị từ chối — huỷ order chỉ dành cho người mua (BR-O04).
- AC: Nếu có ai khác ghi trạng thái đồng thời (giá trị `currentStatus` mà người gọi thấy không còn khớp) thì bị từ chối với 409, không âm thầm ghi đè.
- Route: ROUTE081, PUT /manage-order/orders/:orderId/status, Bearer.

## Reviews

### US081_ViewProductReviews
> Là một khách hoặc bất kỳ caller nào, tôi muốn đọc review của một sản phẩm để đánh giá trước khi mua.
- AC: Public — không cần auth (BR-R05, PERM002). Mới nhất trước, có phân trang, giới hạn theo một `productId`.
- AC: Projection của tác giả chỉ lộ display name và avatar — không bao giờ lộ email, số điện thoại, hay trạng thái tài khoản.
- Route: ROUTE082, GET /reviews, public.

### US082_CreateReview
> Là một client, tôi muốn review một sản phẩm mình đã nhận được để những người mua khác có thể tham khảo trải nghiệm của mình.
- AC: Yêu cầu có một order `DELIVERED`, chưa bị xoá, của chính người gọi, có dòng snapshot tham chiếu tới sản phẩm đó (BR-R01) — nếu không thì 403.
- AC: Mỗi (user, product) chỉ một review, được DB ép buộc bằng `@@unique([userId, productId])` (BR-R02) — lần thử thứ hai trả về 409, không âm thầm ghi đè.
- AC: `rating` phải là số nguyên 1–5; `content` không được rỗng (BR-R04).
- Route: ROUTE083, POST /reviews, Bearer.

### US083_UpdateReview
> Là một client, tôi muốn sửa review của chính mình để chỉnh lại hoặc cập nhật ý kiến.
- AC: Ownership được ép buộc ngay trong mệnh đề `where` (BR-R03) — review của user khác trả về 404, không bao giờ 403.
- Route: ROUTE084, PUT /reviews/:reviewId, Bearer.

### US084_DeleteReview
> Là một client, tôi muốn xoá review của chính mình để nó không còn hiển thị nữa.
- AC: Luôn là hard delete — `Review` không có `deletedAt` (BR-R06). Review của user khác trả về 404.
- Route: ROUTE085, DELETE /reviews/:reviewId, Bearer.

---

## Hành vi do hệ thống khởi tạo (cố tình không đưa vào US###)

Theo cổng actor-clarity của W4.5, các mục BL### sau đây **không có actor là người** — chúng là
global filter/interceptor/lifecycle hook, hoặc script ops chạy một lần, không phải một người thực
sự bấm/gọi gì cả — nên đúng ra chỉ nằm trong `behavior-logic.md`, không xuất hiện ở đây:

- BL001_SyncRoutePermissionsScript, BL002_SeedAdminUserScript — script dev/ops chạy tay, không có route.
- BL006_ExternalExceptionFilter, BL007_PrismaClientExceptionFilter (cả hai đã được thay thế — giờ gộp thành một `GlobalExceptionFilter`, xem `behavior-logic.md`), BL008_ResponseTransformInterceptor, BL013_PrismaClientLifecycleObserver — middleware cross-cutting toàn cục, tự động bọc quanh cả 70 route.
- BL010_ImageValidationPipe — dead code, không gắn vào route nào đang chạy.

BL003, BL004, BL005, BL009, BL011, BL012 đã được nhắc tới ở trên, ngay trong US kích hoạt chúng
(lần lượt là US006, US035–US039, US005) — như vậy đã đảm bảo truy vết BL→US mà không cần thêm một
entry kiểu system riêng.

## Cross-Reference Validation

- [x] Tất cả mã US### là duy nhất (US001–US084, liên tục, không thiếu/không trùng)
- [x] Mọi US đều có đúng một actor là người được nêu tên (`admin`/`seller`/`client`) — không dùng actor "system"/"platform"/"application"
- [x] Mọi tiêu đề US chỉ mang đúng một động từ hành động (không có tiêu đề kiểu CRUD ghép)
- [x] Mọi US đều có mệnh đề "so that" nêu kết quả
- [x] Mọi route (85) map tới ≥1 US; mọi US map tới ≥1 route (xem Route→US Map ở trên)
- [x] BL003/004/005/009/011/012 được nhắc tới ngay trong US kích hoạt chúng; BL001/002/006/007/008/010/013 bị loại rõ ràng kèm lý do (mục Hành vi do hệ thống khởi tạo)
- [x] Được tham chiếu trong feature-list.md — F011/F012/F013 liệt kê US070–US084 dưới mục "Related User Stories"
- Mâu thuẫn còn để ngỏ: quyền ghi của client với BRANDS/CATEGORIES (permissions-matrix.md PERM005 so với văn bản của permissions.md) — đã nêu ở đầu bài, không khẳng định theo hướng nào cả; không liên quan tới phần cart/order/review thêm vào ngày 2026-09-12.
