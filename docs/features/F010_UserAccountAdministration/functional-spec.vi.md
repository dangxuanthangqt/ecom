---
authored_by: rebuild-spec
---
<!-- layout-exempt: rebuild-spec owns all docs/system|features|generated|flows paths -->

# Functional Spec — F010_UserAccountAdministration

**Độ ưu tiên**: P2
**Loại**: ui
**Được tạo**: 2026-09-12

**Xem thêm:** [`technical-spec.vi.md`](./technical-spec.vi.md) — endpoint, trích dẫn nguồn, pseudocode,
các entity chính, và các thao tác ghi DB, dành cho Dev/QA/SA.

**Truy vết:** F010 → N/A (headless) → US065,US066,US067,US068,US069 → N/A (không có BL) → ROUTE066,ROUTE067,ROUTE068,ROUTE069,ROUTE070 → N/A (chưa có TC### nào)

## 1. Tổng quan

**Vấn đề:** Admin cần quản lý trực tiếp tài khoản của NGƯỜI KHÁC — tạo tài khoản cho một người dùng mà không cần họ tự đăng ký, kiểm tra bất kỳ tài khoản nào, sửa thông tin của họ, nâng một client đáng tin cậy lên seller/admin, và xóa một tài khoản — không điều nào trong số này được các tính năng tự phục vụ đăng nhập/hồ sơ
(F001, F009) cung cấp.
**Giải pháp:** Một bộ cố định gồm 5 endpoint chỉ dành cho admin (list, detail, create, update, delete) tác động lên entity `User` thay mặt admin, khác với việc caller tự quản lý session của chính mình
(F001) hoặc profile của chính mình (F009).
**Phạm vi:** Liệt kê tất cả user; xem chi tiết một user bất kỳ; tạo user với role do caller chọn;
cập nhật bất kỳ field nào của user kể cả role (đường duy nhất trong hệ thống nâng
`client` lên `seller`/`admin`); soft-delete bất kỳ user nào.
**Ngoài phạm vi:** Tự đăng ký/đăng nhập/sửa profile (F001/F009); CRUD Role/Permission
(một bề mặt admin riêng, US060–US064, không thuộc F010); việc thực thi field `status` mà admin
đặt ở đây khi đăng nhập — xem § 11 Risks & Known Issues.

**Actor**

| Actor | Mô tả | Mục tiêu chính |
|-------|--------------|---------------|
| Admin | Role duy nhất có bộ quyền bao gồm module USERS | Quản trị toàn bộ tài khoản user thay mặt người khác |

## 2. Khả năng chức năng

| ID | Khả năng | Người dùng làm được gì | User Stories | Yêu cầu | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Duyệt & Kiểm tra User | Liệt kê tất cả tài khoản (phân trang) và xem chi tiết đầy đủ một tài khoản kể cả role/quyền | US065, US066 | FR-001, FR-201, FR-202 | BR-001 | N/A (headless) |
| CAP-02 | Tạo User | Tạo trực tiếp một tài khoản mới với role do caller chọn | US067 | FR-203 | BR-002, BR-003 | N/A (headless) |
| CAP-03 | Cập nhật & Nâng Role | Sửa các field bất kỳ của user; đường duy nhất nâng client lên seller/admin | US068 | FR-204, FR-601 | BR-004, BR-005, BR-006 | N/A (headless) |
| CAP-04 | Xóa User | Soft-remove một tài khoản, vẫn giữ nguyên các FK lịch sử | US069 | FR-205, FR-602 | BR-007, BR-008, BR-009 | N/A (headless) |

## 3. Quyết định còn mở

| D### | Quyết định | Đề xuất mặc định | Lý do | Chặn công việc |
|------|----------|-------------------|-----------|--------------|
| D001 | Đặt `User.status` thành `INACTIVE`/`BLOCKED` ở đây có thực sự chặn lần đăng nhập tiếp theo của user đó không? | Giữ nguyên hiện trạng (status được lưu nhưng không được enforce); coi đây là một khoảng trống đã biết, không phải điểm chặn | Sửa cái này đụng sang F001 (luồng đăng nhập) — ngoài phạm vi của một lượt viết tài liệu | không |

## 4. Yêu cầu

### Nền tảng (0xx)

- **FR-001** Chỉ admin mới truy cập được 5 endpoint này — mặc định không role nào khác được cấp
  module USERS.

### Quản lý tài khoản User (2xx)

- **FR-201** Admin xem được danh sách phân trang mọi tài khoản user chưa xóa, sắp xếp
  theo field do caller cung cấp.
- **FR-202** Admin xem được chi tiết đầy đủ một user, kể cả role và danh sách quyền
  của role đó.
- **FR-203** Admin tạo được một tài khoản user mới, có thể chọn role và
  status ban đầu của tài khoản đó.
- **FR-204** Admin cập nhật được các field có thể sửa của bất kỳ user nào (tên, số điện thoại, avatar, password,
  status, role), trừ tài khoản của chính mình qua route này.
- **FR-205** Admin xóa được một tài khoản user; tài khoản chỉ bị soft-delete, không bị xóa hẳn.

### Bảo mật (6xx)

- **FR-601** Chỉ một admin có sẵn mới tạo được admin khác, hoặc nâng bất kỳ user nào lên admin hoặc
  seller — caller không phải admin thử làm điều đó đều bị từ chối.
- **FR-602** Admin không thể xóa admin khác trừ khi chính họ cũng là admin, không thể
  xóa user giữ đúng role giống mình, và không thể xóa hoặc cập nhật tài khoản
  của chính mình qua route này.

## 5. Business Rules

- Chỉ session của admin mới chạm tới được bất kỳ route `/users` nào — không role nào khác có bộ quyền gồm
  module USERS. (BR-001)
- Caller không phải admin không thể tạo một user có role admin. (BR-002)
- User mới tạo mà không chỉ định role rõ ràng sẽ mặc định là role client, giống như
  tự đăng ký. (BR-003)
- Admin không thể cập nhật tài khoản của chính mình qua route này. (BR-004)
- Caller không phải admin không thể cập nhật một user hiện đang là admin, và không thể nâng bất kỳ user nào
  lên admin. (BR-005)
- Cập nhật `roleId` của user ở đây là đường duy nhất trong hệ thống nâng một client tự đăng ký
  lên seller hoặc admin. (BR-006)
- Admin không thể xóa tài khoản của chính mình qua route này. (BR-007)
- Caller không phải admin không thể xóa một user hiện đang là admin. (BR-008)
- Caller không thể xóa một user giữ đúng role giống mình — điều này cũng chặn luôn
  trường hợp admin xóa admin, trừ khi một check chặt hơn đã bắt trước đó. (BR-009)

## 6. Screens

N/A — đây là tính năng nền, không có màn hình nào cho người dùng.

### User Journey

N/A — headless backend API; "user journey" ở đây chính là caller (một admin, qua một client bên ngoài)
gọi 5 route dưới đây theo bất kỳ thứ tự nào công việc của họ cần. Repo này không có UI để
sắp xếp thành chuỗi thao tác.

## 7. User Stories

### US065_ViewUserList — Xem Danh sách User

**Actor:** Admin
**Mục tiêu:** Xem tất cả tài khoản user trong hệ thống.
**Giá trị nghiệp vụ:** Cho phép admin khảo sát toàn bộ tài khoản trước khi thao tác lên bất kỳ tài khoản nào.

**Tiêu chí chấp nhận:**
- [ ] Trả về mọi row `User` chưa xóa, có phân trang.
- [ ] Mỗi row hiển thị role của user.

### US066_ViewUserDetail — Xem Chi tiết User

**Actor:** Admin
**Mục tiêu:** Kiểm tra chi tiết đầy đủ một tài khoản.
**Giá trị nghiệp vụ:** Cho phép admin xác minh trạng thái tài khoản (role, quyền, status) trước khi
sửa hoặc xóa nó.

**Tiêu chí chấp nhận:**
- [ ] Trả về user khớp với ID đã cho, kể cả role và danh sách quyền của role đó.
- [ ] Trả về not-found nếu ID đã xóa hoặc không tồn tại.

### US067_CreateUser — Tạo User

**Actor:** Admin
**Mục tiêu:** Tạo trực tiếp một tài khoản mới, không cần người đó tự đăng ký.
**Giá trị nghiệp vụ:** Cho phép admin thêm tài khoản nhân viên/seller hoặc tạo tài khoản test/hỗ trợ theo
nhu cầu.

**Tiêu chí chấp nhận:**
- [ ] Tạo một user mới với thông tin đã cho.
- [ ] Admin có thể đặt role cho tài khoản mới; bỏ trống sẽ mặc định là client.
- [ ] Caller không phải admin không thể đặt role của tài khoản mới thành admin.

### US068_UpdateUserAndPromoteRole — Cập nhật User và Nâng Role

**Actor:** Admin
**Mục tiêu:** Sửa thông tin của một user hoặc nâng họ lên một role có đặc quyền cao hơn.
**Giá trị nghiệp vụ:** Đây là cách duy nhất để một client tự đăng ký trở thành seller hoặc admin —
thiếu nó, mọi tài khoản sẽ kẹt vĩnh viễn ở client.

**Tiêu chí chấp nhận:**
- [ ] Cập nhật tên/số điện thoại/avatar/password/status/role của user mục tiêu theo đúng dữ liệu truyền vào.
- [ ] Từ chối call nếu admin nhắm vào tài khoản của chính mình.
- [ ] Từ chối call nếu caller không phải admin nhắm vào tài khoản admin, hoặc cố nâng bất kỳ ai
  lên admin.

### US069_DeleteUser — Xóa User

**Actor:** Admin
**Mục tiêu:** Xóa một tài khoản không nên tồn tại trong hệ thống nữa.
**Giá trị nghiệp vụ:** Cho phép admin cho nghỉ hưu tài khoản (cựu nhân viên, tài khoản đăng ký spam) trong khi nền tảng
vẫn giữ nguyên dấu vết lịch sử của tài khoản đó (ví dụ sản phẩm họ đã tạo).

**Tiêu chí chấp nhận:**
- [ ] Tài khoản mục tiêu bị soft-delete (đánh dấu, không xóa hẳn) và biến mất khỏi list/detail.
- [ ] Từ chối call nếu admin nhắm vào tài khoản của chính mình.
- [ ] Từ chối call nếu caller không phải admin nhắm vào tài khoản admin, hoặc nếu caller và target
  cùng chung một role.

## 8. Scenarios

### US065_ViewUserList — Happy Path

**Given** một admin session, **When** admin request danh sách user, **Then** một trang phân trang
gồm user chưa xóa được trả về, mỗi user kèm role của họ.

### US065_ViewUserList — Error: Không phải admin

**Given** một session client hoặc seller, **When** caller đó request danh sách user, **Then**
request bị từ chối là forbidden trước khi trả về bất kỳ dữ liệu nào.

### US067_CreateUser — Happy Path

**Given** một admin session, **When** admin gửi thông tin user mới mà không chọn role,
**Then** tài khoản được tạo với role client.

### US067_CreateUser — Error: Non-admin cố gán role admin

**Given** một caller mà session của họ bằng cách nào đó chạm tới route này dù không phải admin, **When** họ
gửi một user mới với role admin được chọn, **Then** request bị từ chối là forbidden và
không tài khoản nào được tạo.

### US068_UpdateUserAndPromoteRole — Happy Path

**Given** một admin session và một client user có sẵn, **When** admin cập nhật role của user đó
thành seller, **Then** role của user đổi thành seller.

### US068_UpdateUserAndPromoteRole — Error: Admin sửa chính mình

**Given** một admin session, **When** admin nhắm vào chính user ID của mình trên route này, **Then**
request bị từ chối là forbidden và không có gì thay đổi.

### US069_DeleteUser — Happy Path

**Given** một admin session và một tài khoản client mục tiêu, **When** admin xóa tài khoản đó,
**Then** tài khoản được đánh dấu deleted và ngừng xuất hiện trong list/detail.

### US069_DeleteUser — Error: Xóa cùng role

**Given** một admin session, **When** admin nhắm vào một tài khoản khác giữ role admin
(cùng role với caller), **Then** request bị từ chối là forbidden và tài khoản không bị
đụng tới.

## 9. Edge Cases

| Kịch bản | Điều gì xảy ra | Thông báo cho người dùng |
|----------|--------------|----------------------|
| Caller không phải admin gọi bất kỳ route `/users` nào | Bị từ chối trước khi bất kỳ handler nào chạy — role của caller không có quyền module USERS | "You do not have permission to access this resource." |
| Admin nhắm vào tài khoản của chính mình khi update hoặc delete | Bị từ chối bất kể check role — route này không bao giờ cho phép admin thao tác lên chính mình | "You cannot update your own user." / thông báo tương tự cho delete |
| Non-admin bằng cách nào đó chạm tới create/update với `roleId` là admin | Bị từ chối — chỉ admin có sẵn mới được tạo hoặc nâng lên admin | "You are not allowed to create an admin user." / "You are not allowed to update the user to an admin." |
| Admin đặt `status` của user mục tiêu thành BLOCKED hoặc INACTIVE | Giá trị được lưu, nhưng hiện không có gì khác trong hệ thống kiểm tra nó — user vẫn đăng nhập bình thường được | (không có thông báo — bản thân update vẫn thành công âm thầm mà không có tác dụng thực thi nào) |
| Detail/update/delete trên một user ID không tồn tại hoặc đã xóa | Trả về not-found | "User not found." |

## 10. Edge Behaviours cần kiểm chứng

- **FR-001** → Xác nhận session client hoặc seller không chạm tới được bất kỳ 5 route `/users` nào.
- **FR-601** → Xác nhận non-admin không thể tạo hoặc nâng một user lên admin, và không thể thao tác lên
  tài khoản admin có sẵn.
- **FR-602** → Xác nhận admin không thể xóa/cập nhật tài khoản của chính mình, và không thể xóa
  tài khoản cùng role, qua route này.

## 11. Risks & Known Issues

| ID | Loại | Mô tả | Tác động | Trạng thái |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | `User.status` (ACTIVE/INACTIVE/BLOCKED) có thể được admin đặt qua create/update trên tính năng này, nhưng không có đường code nào trong repo (kể cả login) đọc hoặc enforce field này — admin "khóa" một user bằng cách đặt BLOCKED không có tác dụng thực tế nào lên khả năng đăng nhập hoặc dùng API của user đó. | Admin tin rằng họ đã khóa một tài khoản nhưng thực ra không — tài khoản vẫn giữ nguyên quyền truy cập đầy đủ. | confirmed |
| RISK-02 | risk | Việc chặn leo thang role cho create/update/delete (BR-002/005/008/009) hoàn toàn được enforce trong code riêng của `UserService`, chứ không phải bởi cổng RBAC ở cấp module. Vì hiện tại quyền module USERS chỉ được cấp cho `admin` (PERM005), đây hiện là một lớp bảo vệ dư — nhưng nếu sau này có role khác được cấp module USERS, role đó vẫn bị chặn khỏi các đường leo thang admin chỉ nhờ các check tường minh này tồn tại; bất kỳ hành động module USERS nào khác (ví dụ xem/tạo/xóa user không phải admin) sẽ mở sẵn cho role đó mà không còn cổng chặn nào khác. | Bất kỳ role nào được cấp module USERS trong tương lai sẽ mặc định thừa hưởng toàn bộ khả năng list/view/create/delete user không phải admin, chỉ bị kiềm chế bởi các check leo thang dành riêng cho admin. | confirmed |

## 12. Dependencies

| Dependency | Loại | Vì sao tính năng này cần nó | Bằng chứng |
|------------|------|-----------------------------|----------|
| F001_Authentication | feature | Cung cấp session `Bearer` và tra cứu role/quyền mà mọi route `/users` dựa vào để gate | BR-001 |
| Role/Permission seed (module USERS chỉ dành cho admin) | infrastructure | Quyết định role nào chạm tới được tính năng này — được đặt một lần lúc seed, không phải bởi tính năng này | BR-001 |

## 13. Cấu hình

N/A — tính năng này không có hằng số cấu hình nào lộ ra cho người dùng.
