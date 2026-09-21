# Ma trận quyền

**Dự án**: ecom (NestJS backend)
**Được tạo**: 2026-09-12
**Phạm vi phân tích**: Headless backend API, 70 route (xem route-list.md)

> **⚠️ Đã bị thay thế vào 2026-09-21.** Ma trận này mô tả mô hình *trước khi refactor* dựa trên route
> (quyền được xác định theo `path` + HTTP method, cấp theo allowlist URL-module). Mô hình đó đã được
> thay bằng các khóa quyền dạng `resource:action:scope` khai báo trên từng handler bằng
> `@RequirePermission`. Ngoài ra, `POST/PUT/DELETE /permissions` đã bị gỡ bỏ (danh mục quyền do code
> quản lý, chỉ đọc qua HTTP), và mảng `forbiddenRoles` hardcode đã được thay bằng cột `Role.isSystem`.
> Các dòng PERM### bên dưới không còn khớp với code nữa. Đọc
> [../authorization-guide.md](../authorization-guide.md) để biết thiết kế hiện tại và
> [../system/permissions.md](../system/permissions.vi.md) để xem góc nhìn tổng hợp hiện hành; chạy lại
> `rebuild-spec` để tạo lại file này.

> **Ma trận PERM### thô.** Đây là bảng kiểm kê được sinh tự động cho từng permission item, đầy đủ
> chi tiết cho từng quyền. Góc nhìn tổng hợp bằng ngôn ngữ thường nằm ở
> [permissions.md](permissions.md). File này được viết TRƯỚC; permissions.md được suy ra từ nó.

**Định dạng mã**: `PERM###_NameSlug`

## Chỉ mục quyền

| Mã | Tên | Loại | Được thực thi tại |
|------|------|------|-------------|
| PERM001_GlobalAppGuard | Global APP_GUARD yêu cầu Bearer theo mặc định | route-guard | `src/shared/modules/base.module.ts:39-42` |
| PERM002_IsPublicApiOverride | `@IsPublicApi()` cho phép một route bỏ qua auth | route-guard | `src/shared/param-decorators/auth-api.decorator.ts:19` |
| PERM003_PerRoutePermissionCheck | Tra cứu dòng quyền theo từng cặp (path, method) dựa trên role của người gọi | role-based | `src/shared/guards/access-token.guard.ts:56-99` |
| PERM004_DynamicPermissionSeeding | Các dòng permission được sinh ra từ bảng route Express đang chạy, không phải danh sách tĩnh | role-based | `initial-scripts/create-permission.ts:41-110` |
| PERM005_ModuleBasedRoleGrant | Allowlist Role→module cấp quyền hàng loạt (Admin = tất cả module) | role-based | `initial-scripts/create-permission.ts:14-35,149-192` |
| PERM006_DefaultSignupRoleClient | Người dùng mới (đăng ký + Google OAuth) luôn nhận role CLIENT | role-based | `src/routes/auth/auth.service.ts:114-121`, `src/routes/auth/google.service.ts:117-123` |
| PERM007_ManageProductOwnership | Người gọi không phải admin chỉ được xem/sửa/xóa sản phẩm do chính họ tạo | resource-ownership | `src/routes/product/manage-product/manage-product.service.ts:31-48` |
| PERM008_CoreRoleMutationLock | 3 role được seed sẵn (admin/client/seller) không thể sửa hoặc xóa qua `/roles` | role-based | `src/routes/role/role.service.ts:17,104-120` |
| PERM009_ApiKeyGuardUnused | Có một kiểu auth thay thế `ApiKeyGuard`/`API_KEY` nhưng không gắn vào route nào | api-scope | `src/shared/guards/api-key.guard.ts`, `src/shared/guards/authorization-header.guard.ts:25-31` |
| PERM010_BrandByIdDocDrift | `GET /brands/:id` được gắn nhãn Swagger `@ApiPublic` nhưng không có `@IsPublicApi()` — lúc chạy vẫn yêu cầu Bearer | route-guard | `src/routes/brand/brand.controller.ts:68` |
| PERM011_ManageOrderRoleGate | Module `MANAGE-ORDER` (seller tiến trạng thái + hiển thị đơn hàng) chỉ dành cho seller/admin — `client` không bao giờ có quyền này | role-based | `initial-scripts/create-permission.ts:14-24` |

---

## PERM001_GlobalAppGuard: Global APP_GUARD yêu cầu Bearer theo mặc định

**Loại**: route-guard
**Được thực thi tại**: `src/shared/modules/base.module.ts:39-42` (đăng ký `AuthorizationHeaderGuard` làm `APP_GUARD`)

### Mô tả

`AuthorizationHeaderGuard` chạy trên mọi request. Nó đọc metadata `@AuthApi` (nếu có) từ handler/class qua `Reflector.getAllAndOverride`. Khi không có metadata, nó mặc định về `authorizationTypes = [AuthorizationType.BEARER]` và `combinedCondition = AND` (`authorization-header.guard.ts:44-47`), rồi chuyển tiếp sang `AccessTokenGuard`. Không có allowlist path toàn cục nào — cả 70 route đều được bảo vệ bằng Bearer trừ khi chủ động opt-out (xem PERM002).

### Route liên quan

- Toàn bộ 70 route trong route-list.md, trừ 9 route được đánh dấu `public` (xem PERM002)

### Quy tắc quyền

| Vai trò | Cho phép | Điều kiện |
|------|-------|------------|
| admin | ✓ | Bearer token hợp lệ, chưa hết hạn + role.isActive=true |
| seller | ✓ | Bearer token hợp lệ, chưa hết hạn + role.isActive=true |
| client | ✓ | Bearer token hợp lệ, chưa hết hạn + role.isActive=true |
| chưa xác thực | ✗ | — |

### Module liên quan

- Tất cả (global guard)

---

## PERM002_IsPublicApiOverride: `@IsPublicApi()` cho phép route bỏ qua auth

**Loại**: route-guard
**Được thực thi tại**: `src/shared/param-decorators/auth-api.decorator.ts:10-19`

### Mô tả

`IsPublicApi()` là cú pháp rút gọn của `AuthApi([AuthorizationType.NONE])`. Khi metadata resolve ra `NONE`, bộ ánh xạ loại của `AuthorizationHeaderGuard` sẽ thay bằng một guard no-op (`canActivate: () => true`) — request bỏ qua hoàn toàn `AccessTokenGuard`, không đọc hay validate token nào cả. Đây là decorator DUY NHẤT làm thay đổi auth lúc chạy. `@ApiAuth`/`@ApiPublic`/`@ApiPageOkResponse` (`src/shared/param-decorators/http-decorator.ts`) chỉ thêm tài liệu Swagger (response schema, doc cho header `Authorization`) — chúng không gọi `SetMetadata` và không ảnh hưởng gì đến `AuthorizationHeaderGuard`.

### Route liên quan

- (POST) /auth/register — ROUTE001
- (POST) /auth/login — ROUTE002
- (POST) /auth/refresh-token — ROUTE003
- (POST) /auth/otp — ROUTE005
- (GET) /auth/google/authorization-url — ROUTE006
- (GET) /auth/google/callback — ROUTE007
- (POST) /auth/forgot-password — ROUTE008
- (GET) /products — ROUTE051
- (GET) /products/:id — ROUTE052

### Quy tắc quyền

| Vai trò | Cho phép | Điều kiện |
|------|-------|------------|
| bất kỳ (kể cả chưa xác thực) | ✓ | route có `@IsPublicApi()` |

### Module liên quan

- AUTH, PRODUCTS

---

## PERM003_PerRoutePermissionCheck: Tra cứu dòng quyền theo từng cặp (path, method)

**Loại**: role-based
**Được thực thi tại**: `src/shared/guards/access-token.guard.ts:56-99`

### Mô tả

Sau khi xác thực Bearer, `AccessTokenGuard.verifyRolePermission` đọc `path` của route Express đã khớp (`request.route.path`) và HTTP `method` viết hoa, rồi chạy `role.findUniqueOrThrow({ where: { id: roleId, isActive:true, deletedAt:null }, select: { permissions: { where: { deletedAt:null, path, method } } } })`. Nếu role của người gọi không có dòng `Permission` nào khớp với đúng cặp (path, method) đó, hệ thống ném lỗi 403 Forbidden (`throwHttpException({type:"forbidden", ...})`, dòng 85-90). Đây thực sự là RBAC theo từng route, không phải bảng ánh xạ role→scope cố định — quyền truy cập hoàn toàn phụ thuộc vào các dòng `Permission` nào được gắn với `Role` của người gọi trong DB.

### Route liên quan

- Toàn bộ 61 route được bảo vệ bằng Bearer (70 route trừ 9 route ở PERM002)

### Quy tắc quyền

| Vai trò | Cho phép | Điều kiện |
|------|-------|------------|
| admin / seller / client | ✓ | tồn tại một dòng `Permission` có `roleId, path, method` khớp với request VÀ `deletedAt IS NULL` |
| bất kỳ role nào | ✗ | không có dòng `Permission` khớp → 403 |

### Module liên quan

- Toàn bộ 14 module (xem route-list.md)

---

## PERM004_DynamicPermissionSeeding: Các dòng Permission được sinh từ bảng route đang chạy

**Loại**: role-based
**Được thực thi tại**: `initial-scripts/create-permission.ts:41-110`

### Mô tả

**Hệ thống này không thể được kiểm tra tĩnh một cách đầy đủ** — bảng `Permission` không được nạp từ một danh sách seed cố định. `initial-scripts/create-permission.ts` khởi động thật sự app Nest (`NestFactory.create(AppModule)`, `app.listen(3010)`), sau đó soi vào `server.router.stack` của Express router đang chạy để liệt kê mọi cặp `(path, method)` đã đăng ký. Nó so sánh tập đang chạy này với các dòng `Permission` đã có trong DB: dòng cho những route không còn đăng ký sẽ bị xóa cứng (`prisma.permission.deleteMany`, dòng 84-98); dòng cho những route mới đăng ký sẽ được thêm vào (`prisma.permission.createMany`, dòng 100-110). Trường `module` của mỗi dòng mới được suy ra bằng `path.split("/")[1].toUpperCase()` (dòng 62) — ví dụ `/manage-product/products` → module `MANAGE-PRODUCT`.

Nghĩa là tập quyền của một role chỉ chính xác đến lần chạy gần nhất của script này (không có bằng chứng trong codebase cho thấy nó tự chạy khi deploy/migrate — `[UNVERIFIED]`, không tìm thấy tham chiếu script CI/CD hay `package.json` nào trong các file đã đọc ở lượt này). Nội dung tĩnh của route-list.md là proxy tốt nhất hiện có cho những gì `create-permission.ts` sẽ đăng ký ở thời điểm hiện tại.

### Route liên quan

- Toàn bộ 70 route (việc suy ra module áp dụng đồng nhất)

### Quy tắc quyền

| Vai trò | Cho phép | Điều kiện |
|------|-------|------------|
| n/a | n/a | đây là cơ chế seeding, bản thân nó không phải là cổng chặn lúc chạy |

### Module liên quan

- Toàn bộ 14 module

---

## PERM005_ModuleBasedRoleGrant: Allowlist Role→module cấp quyền hàng loạt

**Loại**: role-based
**Được thực thi tại**: `initial-scripts/create-permission.ts:14-35, 149-192`

### Mô tả

Sau khi quyền được seed (PERM004), `updateRole()` chạy một lần cho mỗi role và THAY THẾ (`permissions: { set: [...] }`, dùng `set` của Prisma — không phải `connect`) toàn bộ danh sách quyền của role đó:

- **ADMIN**: `Module[Role.ADMIN]` là `undefined` (không có mục nào trong map `Module`, dòng 32-35) → điều kiện `moduleList && moduleList.length > 0` (dòng 160) là false → `permissionIds` giữ nguyên là **toàn bộ** ID quyền, không lọc. Admin có mọi quyền cho mọi module, mọi method.
- **SELLER**: được lọc theo các module `["AUTH","MEDIA","MANAGE-PRODUCT","PRODUCT-TRANSLATIONS","PROFILE","CART","ORDERS","MANAGE-ORDER","REVIEWS"]` (dòng 14-24, cập nhật 2026-09-12 cho F011/F012/F013) — TẤT CẢ method (GET/POST/PUT/DELETE) trong 9 module đó đều được cấp, vì việc lọc chỉ dựa trên chuỗi module, không dựa trên method.
- **CLIENT**: được lọc theo các module `["AUTH","MEDIA","PRODUCTS","CATEGORIES","BRANDS","PRODUCT-TRANSLATIONS","PROFILE","CART","ORDERS","REVIEWS"]` (dòng 26-37, cập nhật 2026-09-12) — cùng hành vi cấp tất cả method trong module. Đáng chú ý là **loại trừ `MANAGE-ORDER`** — xem PERM011.

Các module `BRAND-TRANSLATIONS`, `CATEGORY-TRANSLATIONS`, `LANGUAGES`, `PERMISSIONS`, `ROLES`, `USERS` không xuất hiện trong allowlist của cả Seller lẫn Client — 6 module đó (30 route) thực chất chỉ dành cho admin theo seed này. `MANAGE-ORDER` (3 route, ROUTE079–081) chỉ dành cho seller+admin (client bị loại trừ) — xem PERM011.

### Route liên quan

- Toàn bộ 85 route (chia theo module, xem bảng bên dưới)

### Quy tắc quyền

| Vai trò | Cho phép | Điều kiện |
|------|-------|------------|
| admin | ✓ (toàn bộ 18 module / 85 route) | `Module[Role.ADMIN]` undefined → không áp dụng lọc |
| seller | ✓ (9 module / 43 route: AUTH, MEDIA, MANAGE-PRODUCT, PRODUCT-TRANSLATIONS, PROFILE, CART, ORDERS, MANAGE-ORDER, REVIEWS) | module phải nằm trong danh sách `SellerModule` |
| seller | ✗ (9 module / 42 route: BRANDS, BRAND-TRANSLATIONS, CATEGORIES, CATEGORY-TRANSLATIONS, LANGUAGES, PERMISSIONS, PRODUCTS, ROLES, USERS) | module không nằm trong danh sách `SellerModule` |
| client | ✓ (10 module / 39 route: AUTH, MEDIA, PRODUCTS, CATEGORIES, BRANDS, PRODUCT-TRANSLATIONS, PROFILE, CART, ORDERS, REVIEWS) | module phải nằm trong danh sách `ClientModule` |
| client | ✗ (8 module / 46 route: BRAND-TRANSLATIONS, CATEGORY-TRANSLATIONS, LANGUAGES, MANAGE-PRODUCT, MANAGE-ORDER, PERMISSIONS, ROLES, USERS) | module không nằm trong danh sách `ClientModule` |

### Module liên quan

AUTH, MEDIA, MANAGE-PRODUCT, PRODUCT-TRANSLATIONS, PROFILE, PRODUCTS, CATEGORIES, BRANDS, BRAND-TRANSLATIONS, CATEGORY-TRANSLATIONS, LANGUAGES, PERMISSIONS, ROLES, USERS, CART, ORDERS, MANAGE-ORDER, REVIEWS

---

## PERM006_DefaultSignupRoleClient: Người dùng mới luôn nhận role CLIENT

**Loại**: role-based
**Được thực thi tại**: `src/routes/auth/auth.service.ts:114-121`, `src/routes/auth/google.service.ts:117-123`, `src/repositories/role/shared-role.repository.ts:25-47`

### Mô tả

`AuthService.register` (qua `/auth/register`, ROUTE001) và luồng đăng ký OAuth của `GoogleService` (`/auth/google/callback`, ROUTE007) đều gọi `sharedRoleRepository.getClientRoleId()` và hardcode `User.roleId` mới về role đó. Không có trường request nào cho phép chọn role khác khi đăng ký — người gọi không thể tự đăng ký thành `seller` hay `admin`. Muốn nâng cấp lên `seller`/`admin` cần một user có đặc quyền đã tồn tại gọi `PUT /users/:id` với `roleId` khác (trường này tồn tại trên `UpdateUserRequestDto`, `src/dtos/user/user.dto.ts:213,220`) — bản thân route đó cũng yêu cầu Bearer + quyền module USERS (chỉ admin theo PERM005), nên chỉ admin mới có thể nâng cấp một user.

### Route liên quan

- (POST) /auth/register — ROUTE001
- (GET) /auth/google/callback — ROUTE007
- (PUT) /users/:id — ROUTE069 (đường nâng cấp role)

### Quy tắc quyền

| Vai trò | Cho phép | Điều kiện |
|------|-------|------------|
| user mới (tự đăng ký) | chỉ client | cố định lúc đăng ký, không có cách nào ghi đè |
| admin | ✓ (có thể đặt bất kỳ roleId nào qua `PUT /users/:id`) | admin có quyền module USERS |
| seller / client | ✗ (không thể đặt roleId) | module USERS không nằm trong allowlist của họ |

### Module liên quan

- AUTH, USERS

---

## PERM007_ManageProductOwnership: Người gọi không phải admin chỉ giới hạn ở sản phẩm của mình

**Loại**: resource-ownership
**Được thực thi tại**: `src/routes/product/manage-product/manage-product.service.ts:31-48`

### Mô tả

`ManageProductService.validateClientPermission` chạy trên mọi thao tác manage-product (lấy danh sách mặc định giới hạn theo `createdById` của chính mình, lấy theo id, cập nhật, xóa). Nó ném lỗi 403 (`throwHttpException({type:"forbidden", ...})`) trừ khi `userId === createdById HOẶC roleName === Role.ADMIN`. Kiểm tra này nằm CHỒNG LÊN PERM003/PERM005 — một seller vượt qua kiểm tra RBAC ở cấp module cho các route `MANAGE-PRODUCT`, nhưng vẫn bị chặn khi đụng vào sản phẩm của seller khác bởi kiểm tra ownership này. Admin bỏ qua hoàn toàn kiểm tra ownership (dòng 40: `roleNameRequest !== Role.ADMIN`).

### Route liên quan

- (GET) /manage-product/products — ROUTE053 (mặc định `createdById = userId` trong query, `manage-product.service.ts:65`)
- (GET) /manage-product/products/:id — ROUTE054
- (PUT) /manage-product/products/:id — ROUTE056
- (DELETE) /manage-product/products/:id — ROUTE057

### Quy tắc quyền

| Vai trò | Cho phép | Điều kiện |
|------|-------|------------|
| admin | ✓ | không áp dụng kiểm tra ownership |
| seller | ✓ | chỉ với sản phẩm mà `product.createdById === caller.userId` |
| seller | ✗ | sản phẩm do người dùng khác tạo |
| client | ✗ | module MANAGE-PRODUCT không nằm trong allowlist của Client (đã bị chặn từ trước ở PERM005/PERM003) |

### Module liên quan

- MANAGE-PRODUCT

---

## PERM008_CoreRoleMutationLock: Các role được seed sẵn không thể sửa/xóa

**Loại**: role-based
**Được thực thi tại**: `src/routes/role/role.service.ts:17, 104-120`

### Mô tả

`RoleService.verifyForbiddenRole` (được gọi từ cả `updateRole` và `deleteRole`) ném lỗi 403 nếu `name` của role mục tiêu nằm trong `forbiddenRoles = [Role.ADMIN, Role.CLIENT, Role.SELLER]` (dòng 17). Điều này bảo vệ 3 role khởi tạo sẵn khỏi việc bị đổi tên/đổi quyền/xóa qua `/roles`, kể cả bởi admin. `POST /roles` (tạo mới) không bị ảnh hưởng — chỉ cập nhật/xóa bị khóa, và chỉ với 3 role được đặt tên này; các role tùy chỉnh tạo sau đó vẫn có thể thay đổi thoải mái.

### Route liên quan

- (PUT) /roles/:id — ROUTE064
- (DELETE) /roles/:id — ROUTE065

### Quy tắc quyền

| Vai trò | Cho phép | Điều kiện |
|------|-------|------------|
| admin | ✗ | tên role mục tiêu ∈ {admin, client, seller} |
| admin | ✓ | role mục tiêu là bất kỳ role (tùy chỉnh) nào khác |

### Module liên quan

- ROLES

---

## PERM009_ApiKeyGuardUnused: Có đường auth API-key thay thế nhưng chưa được gắn dùng

**Loại**: api-scope
**Được thực thi tại**: `src/shared/guards/api-key.guard.ts`, `src/shared/guards/authorization-header.guard.ts:25-31`

### Mô tả

`AuthorizationHeaderGuard` hỗ trợ `AuthorizationType.API_KEY` (chuyển tiếp sang `ApiKeyGuard`, hiện đang so sánh một literal hardcode `"secretApiKey"` với một header request có tên do `SECRET_API_KEY` định nghĩa — lookup thật qua `AppConfigService` đang bị comment out, `api-key.guard.ts:20-21`). Grep `src` để tìm cách dùng `AuthorizationType.API_KEY` / `AuthApi([` bên ngoài các file guard/constants cho thấy **không có controller nào gọi nó** — không route nào trong route-list.md dùng đường này. `[UNVERIFIED]` chưa rõ đây là hạ tầng đang xây dở hay là code chết; được nêu ra đúng như thực trạng, không suy diễn thêm thành một quyền đang hoạt động.

### Route liên quan

- hiện không có

### Quy tắc quyền

| Vai trò | Cho phép | Điều kiện |
|------|-------|------------|
| n/a | n/a | không gắn với route nào |

### Module liên quan

- không có

---

## PERM010_BrandByIdDocDrift: `GET /brands/:id` lệch giữa doc public và Bearer lúc chạy

**Loại**: route-guard
**Được thực thi tại**: `src/routes/brand/brand.controller.ts:68`

### Mô tả

`GET /brands/:id` (ROUTE012) được gắn `@ApiPublic` (decorator chỉ dùng cho doc Swagger, xem PERM002) nhưng KHÔNG có `@IsPublicApi()` — decorator thật sự ảnh hưởng đến auth. Do đó lúc chạy vẫn mặc định yêu cầu Bearer (PERM001), trong khi doc Swagger sinh ra lại ghi nhãn endpoint này là "Public." Điều này được giữ nguyên theo đúng cờ đánh dấu ở route-list.md (`route-list.md:171`). `[UNVERIFIED]` chưa rõ đây là sự không nhất quán cố ý hay là bug trong source; hành vi THỰC TẾ lúc chạy vẫn là yêu cầu Bearer, và được xử lý như vậy xuyên suốt ma trận này và trong permissions.md.

### Route liên quan

- (GET) /brands/:id — ROUTE012

### Quy tắc quyền

| Vai trò | Cho phép | Điều kiện |
|------|-------|------------|
| admin / seller / client | ✓ | Bearer hợp lệ + quyền module BRANDS (chỉ client, theo PERM005) |
| chưa xác thực | ✗ | mặc dù doc gắn nhãn `@ApiPublic` |

### Module liên quan

- BRANDS

---

## PERM011_ManageOrderRoleGate: Module `MANAGE-ORDER` chỉ dành cho seller/admin

**Loại**: role-based
**Được thực thi tại**: `initial-scripts/create-permission.ts:14-24` (SellerModule có `"MANAGE-ORDER"`, ClientModule thì không)

### Mô tả

Được thêm 2026-09-12 cho F012 Order Placement & Fulfilment. `ManageOrderController` (`src/routes/order/manage-order/manage-order.controller.ts`, tiền tố `manage-order/orders`) được đăng ký dưới module `MANAGE-ORDER` (suy ra từ đoạn path theo PERM004). `SellerModule` (`initial-scripts/create-permission.ts:14-24`) có `"MANAGE-ORDER"`; `ClientModule` (dòng 26-37) thì không. Kết hợp với việc PERM005 cấp tất cả method trong mỗi module, người gọi là `client` sẽ bị PERM003 từ chối (403, không có dòng `Permission` khớp) trước cả khi logic hiển thị riêng của `ManageOrderService.buildActorScope` chạy — cổng chặn theo role và logic phạm vi theo ownership là hai lớp độc lập nhau. `ManageOrderService.updateOrderStatus` còn từ chối bất kỳ ai cố gắng chuyển sang `nextStatus: CANCELLED` bất kể role, vì hủy đơn chỉ dành cho buyer (BR-O04, `src/routes/order/manage-order/manage-order.service.ts:118-122`).

### Route liên quan

- (GET) /manage-order/orders — ROUTE079
- (GET) /manage-order/orders/:orderId — ROUTE080
- (PUT) /manage-order/orders/:orderId/status — ROUTE081

### Quy tắc quyền

| Vai trò | Cho phép | Điều kiện |
|------|-------|------------|
| admin | ✓ | module `MANAGE-ORDER` được cấp (allowlist undefined → toàn bộ module); thấy tất cả đơn hàng (`buildActorScope` trả về `{}`) |
| seller | ✓ | `MANAGE-ORDER` nằm trong `SellerModule`; chỉ thấy các đơn hàng có item snapshot tham chiếu đến sản phẩm của chính họ (`buildActorScope` lọc theo `products.some.createdById`) |
| client | ✗ | `MANAGE-ORDER` không nằm trong `ClientModule` → 403 trước khi bất kỳ logic handler nào chạy |

### Module liên quan

- MANAGE-ORDER

---

## Tổng kết

- **Tổng số permission item**: 11
- **Theo loại**: route-guard: 3 (PERM001, PERM002, PERM010), role-based: 6 (PERM003, PERM004, PERM005, PERM006, PERM008, PERM011), resource-ownership: 1 (PERM007), api-scope: 1 (PERM009) — tổng 11. PERM003 được xếp loại role-based (theo dòng bảng của nó, dòng 19); về cơ chế nó mang màu sắc route-guard nhưng chỉ tính một lần, thuộc role-based.
- **Các role đã xác định**: `admin`, `client`, `seller` (`src/constants/role.constant.ts:1-5`) — không tìm thấy role nào khác trong code
- **Không tìm thấy cổng chặn phía client**: đây là headless backend API; các loại `feature-flag`/`experiment`/`env-gate`/`locale-gate` không áp dụng. `Không xác định được cổng chặn đặc biệt nào phía client.`
- **Cập nhật 2026-09-12 (F011/F012/F013)**: `SellerModule`/`ClientModule` trong `initial-scripts/create-permission.ts` đều được thêm `CART`, `ORDERS`, `REVIEWS`; `SellerModule` còn được thêm `MANAGE-ORDER` (client thì không) — xem PERM005 (đã cập nhật) và PERM011 (mới).

---

## Kiểm tra chéo tính hợp lệ

- [x] Tất cả mã PERM### là duy nhất
- [ ] Tất cả mã PERM### được tham chiếu trong FeatureList.md (feature-list.md chưa được sinh ở đợt này — Wave 1 diễn ra trước bước tổng hợp feature theo `_session-context.md`)
- [x] Tất cả tham chiếu route liên quan đều hợp lệ (ID ROUTE### khớp với route-list.md)
- [x] Không có tham chiếu màn hình nào (headless backend, không có route frontend)
- [x] Tất cả tham chiếu module liên quan đều hợp lệ (đã đối chiếu với cách suy module trong `initial-scripts/create-permission.ts` và các tiền tố trong route-list.md)
- [x] Không có tham chiếu quyền mồ côi nào

---

## Các loại cổng chặn phía client

Không áp dụng — dự án này là một headless NestJS backend API, không có code frontend/UI. Không tìm thấy item `feature-flag`, `experiment`, `env-gate`, hay `locale-gate` nào trong `src/`.
</content>
