---
authored_by: rebuild-spec
---
<!-- Contract: references/feature-spec-researcher-contract.md -->

# Functional Spec — F006_AccessControlAdministration

**Priority**: P2
**Type**: mixed
**Generated**: 2026-09-12

**Xem thêm:** [`technical-spec.vi.md`](./technical-spec.vi.md) — endpoint, trích dẫn Source, pseudocode,
các entity chính, và các thao tác ghi DB, dành cho Dev/QA/SA.

**Truy vết:** F006 → N/A (headless, không có màn hình) → US040-US044, US060-US064 → BL001, BL002 → ROUTE041-045, ROUTE061-065 → TC### (chưa tạo)

> **⚠️ Đã lỗi thời một phần kể từ 2026-09-21 (refactor RBAC).** Spec này được tạo dựa trên mô hình
> permission gắn theo route. Từ sau refactor:
>
> - Permission là các key semantic dạng `resource:action:scope`, khai báo trên handler bằng
>   `@RequirePermission`; các cột `path`/`method`/`module`/`name` không còn nữa.
> - `POST/PUT/DELETE /permissions` (FR-203, FR-204, FR-205; action A3–A5) **không còn tồn tại**.
>   Danh mục permission do code sở hữu, chỉ đọc qua HTTP; việc cấp quyền chuyển sang phía role.
> - Role mang cờ `isSystem`; mảng `forbiddenRoles` hardcode đã bị bỏ. Quyền của các role hệ thống
>   lấy từ `RolePermissionMatrix` trong code và được áp lại mỗi lần seed.
> - Allowlist theo module (CAP-03, ALG-002) và việc cấp thừa quyền theo method (D001, RISK-01,
>   RISK-02) đã được xử lý: `client` không còn quyền ghi vào brand/category/translation nữa.
>
> Thiết kế hiện tại: [../../authorization-guide.md](../../authorization-guide.md). Phần quản trị
> role (CAP-02) không đổi, ngoại trừ có thêm kiểm tra `isSystem`. Chạy lại `rebuild-spec` để tạo lại file này.

## 1. Tổng quan

**Vấn đề:** Admin cần một cách để quyết định role nào được gọi route API nào, và giữ cho danh sách
quyền đó không lệch dần theo thời gian khi hệ thống có thêm route mới — nếu duy trì danh sách quyền
thủ công, nó sẽ lỗi thời ngay khi có route được thêm hoặc bỏ.
**Giải pháp:** Hai API quản trị đi kèm nhau — một cho các dòng permission theo từng route, một cho
các role nắm giữ chúng — cho phép admin xem và chỉnh sửa trực tiếp ma trận quyền. Hai script bảo trì
chạy một lần giữ ma trận đó luôn đúng: một script tạo lại các dòng permission từ đúng những route đang
thực sự chạy trong app, script còn lại seed ba role khởi tạo và tài khoản admin đầu tiên trên một môi
trường mới.
**Phạm vi:** Xem/tạo/sửa/xóa dòng permission; xem/tạo/sửa/xóa role (3 role được seed sẵn bị khóa,
không cho sửa và xóa); hai script bảo trì giữ cho dữ liệu này
chính xác.
**Ngoài phạm vi:** Gán role cho một tài khoản user cụ thể (thuộc về user management); mọi giới hạn
theo method hẹp hơn "cả một module theo URL-prefix" (hiện chưa có cơ chế kiểm soát chi tiết hơn — xem
§ 3 Open Decisions D001); việc xây dựng hay chỉnh sửa bản thân các route.

**Actor**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Admin | Role duy nhất được phép chạm vào bất kỳ endpoint nào của tính năng này | Giữ cho ma trận access-control của hệ thống (ai được gọi gì) luôn chính xác và an toàn khi API thay đổi |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Permission Row Administration | Xem, tạo, sửa, xóa các dòng permission theo từng route | US040, US041, US042, US043, US044 | FR-201, FR-202, FR-203, FR-204, FR-205, FR-401, FR-601 | BR-001, BR-003 | N/A |
| CAP-02 | Role Administration | Xem, tạo, sửa, xóa role; 3 role được seed sẵn (admin/client/seller) bị khóa, không cho sửa và xóa | US060, US061, US062, US063, US064 | FR-301, FR-302, FR-303, FR-304, FR-305, FR-402, FR-602 | BR-002, BR-004, SM-001 | N/A |
| CAP-03 | Permission Set & Role Grant Maintenance | Tạo lại các dòng permission từ bảng route đang chạy, và gán lại quyền của mỗi role theo module URL-prefix; seed một lần 3 role và tài khoản admin đầu tiên trên môi trường mới | N/A — script chạy nền, không gắn với user story cụ thể | FR-001, FR-002 | N/A — xem ALG-001/ALG-002 trong technical-spec.md § 4.5 | N/A |

## 3. Open Decisions

| D### | Decision | Default proposal | Rationale | Blocks work |
|------|----------|-------------------|-----------|--------------|
| D001 | `client` và `seller` có nên giữ toàn quyền ghi (tạo/sửa/xóa) trên mọi route trong module được cấp hay không, chỉ vì allowlist role→module hoạt động ở mức module và không bao giờ kiểm tra HTTP method? | Giữ nguyên như hiện tại — cấp quyền theo module | Không có đoạn code hay comment nào cho thấy từng có ý định giới hạn theo method; muốn đổi việc này cần thiết kế lại mô hình permission, không phải một bản vá nhỏ | không |

## 4. Requirements

### Foundation (0xx)

- **FR-001** Các dòng permission dùng để kiểm tra quyền của một role được suy ra từ đúng những route thực sự đang đăng ký trong app đang chạy, không phải gõ tay từ một danh sách tĩnh.
- **FR-002** Tập permission được cấp cho mỗi role được tính bằng cách khớp toàn bộ module URL-prefix với role đó, sau đó thay thế toàn bộ danh sách permission của role bằng kết quả khớp.

### Permission Row Administration (2xx)

- **FR-201** Admin có thể liệt kê toàn bộ dòng permission, có phân trang.
- **FR-202** Admin có thể xem chi tiết đầy đủ một dòng permission (path, method, module, các role được gán), hoặc nhận response not-found nếu nó không tồn tại.
- **FR-203** Admin có thể tạo một dòng permission mới cho một cặp path + method, tùy chọn gán ngay cho một hoặc nhiều role.
- **FR-204** Admin có thể sửa name, description, path hoặc method của một dòng permission có sẵn, và thay thế danh sách role được gán cho nó.
- **FR-205** Admin có thể xóa một dòng permission — mặc định có thể khôi phục (soft delete), hoặc xóa vĩnh viễn khi yêu cầu rõ (hard delete).

### Role Administration (3xx)

- **FR-301** Admin có thể liệt kê toàn bộ role, có phân trang, kể cả 3 role được seed sẵn.
- **FR-302** Admin có thể xem chi tiết đầy đủ một role, gồm cả các dòng permission đang được gán cho nó, hoặc nhận response not-found nếu nó không tồn tại.
- **FR-303** Admin có thể tạo một role tùy chỉnh mới, tùy chọn cấp sẵn một tập permission ban đầu.
- **FR-304** Admin có thể đổi tên hoặc sửa một role tùy chỉnh và thay thế danh sách permission được cấp cho nó. Việc này bị từ chối với 3 role được seed sẵn.
- **FR-305** Admin có thể xóa một role tùy chỉnh — mặc định có thể khôi phục, hoặc xóa vĩnh viễn khi yêu cầu rõ. Việc này bị từ chối với 3 role được seed sẵn.

### Interaction (4xx)

- **FR-401** Sửa danh sách role được gán của một dòng permission sẽ thay thế toàn bộ danh sách bằng dữ liệu gửi lên — role nào không có trong đó coi như bị bỏ gán.
- **FR-402** Sửa danh sách permission được gán của một role sẽ thay thế toàn bộ danh sách bằng dữ liệu gửi lên — permission nào không có trong đó coi như bị bỏ gán.

### Security (6xx)

- **FR-601** Chỉ caller có role đang nắm dòng permission đúng route và đúng HTTP method đang gọi mới được chạm vào bất kỳ endpoint quản trị permission nào.
- **FR-602** Sửa hoặc xóa một trong 3 role được seed sẵn (admin, client, seller) luôn bị từ chối, bất kể caller là ai.

## 5. Business Rules

- Nhãn module của một dòng permission mới được tự suy ra từ đoạn đầu tiên trong path (ví dụ `/users` → `USERS`); sửa path của một dòng có sẵn KHÔNG tính lại nhãn đó. (BR-001)
- 3 role được seed sẵn (admin, client, seller) không bao giờ có thể bị đổi tên, đổi quyền, hay xóa qua các endpoint này — chỉ những role tùy chỉnh tạo sau mới có thể sửa được. (BR-002)
- Sửa danh sách role được gán của một dòng permission, hay danh sách permission được gán của một role, luôn thay thế toàn bộ danh sách bằng dữ liệu gửi lên chứ không gộp vào danh sách cũ. (BR-003)
- Mọi ID permission hay ID role gửi lên để gán đều phải tồn tại và chưa bị soft-delete, nếu không toàn bộ request bị từ chối. (BR-004)
- Một role có thể ở trạng thái Active, Inactive, hoặc (soft-)Deleted; chỉ role Active và chưa bị xóa mới được trả về hoặc được dùng để kiểm tra access-control. (SM-001)

## 6. Screens

N/A — đây là tính năng chạy nền; không có màn hình nào hướng tới người dùng. Đây là một backend API
headless — repo này không có tầng UI, và `docs/generated/screen-list.md` là một artifact ghi rõ
"No data", nên không có mã `SCR###` nào để trích dẫn. Truy vết đi qua các route sở hữu tính năng này
thay thế: ROUTE041-045 (`/permissions`) và ROUTE061-065 (`/roles`).

## 7. User Stories

### US040_ViewPermissionList — View Permission List

**Actor:** Admin
**Goal:** Xem toàn bộ dòng permission hiện có.
**Business value:** Cho admin kiểm tra chính xác những gì đang được cấp quyền trước khi cấp thêm hay thu hồi bất cứ thứ gì.

**Acceptance Criteria:**
- [ ] Trả về toàn bộ dòng permission chưa bị xóa, có phân trang, mỗi dòng kèm path/method/module.

### US041_ViewPermissionDetail — View Permission Detail

**Actor:** Admin
**Goal:** Xem đầy đủ chi tiết một dòng permission.
**Business value:** Xác nhận chính xác một dòng permission cụ thể cấp quyền gì trước khi dựa vào nó.

**Acceptance Criteria:**
- [ ] Trả về dòng khớp với ID được cho, gồm cả các role đang được gán.
- [ ] Trả về response not-found nếu ID không khớp dòng nào chưa bị xóa.

### US042_CreatePermission — Create Permission

**Actor:** Admin
**Goal:** Thêm một dòng permission mới để có thể cấp cho role quyền truy cập một route.
**Business value:** Mở quyền truy cập cho một route chưa được xử lý, hoặc trước khi script bảo trì kế tiếp chạy.

**Acceptance Criteria:**
- [ ] Tạo một dòng permission mới với path/method/module gửi lên và tùy chọn gán role.
- [ ] `[UNVERIFIED]` Một dòng tạo tay có thể bị xóa vào lần chạy tiếp theo của script sync CAP-03, nếu cặp (path, method) của nó không còn khớp route nào đang chạy.

### US043_UpdatePermission — Update Permission

**Actor:** Admin
**Goal:** Sửa lại chi tiết hoặc danh sách role được gán của một dòng permission.
**Business value:** Giữ ma trận quyền chính xác sau một sai sót hoặc một thay đổi quyền có chủ đích.

**Acceptance Criteria:**
- [ ] Cập nhật dòng khớp với ID được cho.
- [ ] Danh sách role gửi lên thay thế toàn bộ danh sách role đang được gán của dòng đó.

### US044_DeletePermission — Delete Permission

**Actor:** Admin
**Goal:** Xóa một dòng permission để role mất quyền truy cập route đó.
**Business value:** Thu hồi quyền truy cập một route cụ thể mà không đụng tới role hay bất kỳ dòng permission nào khác.

**Acceptance Criteria:**
- [ ] Xóa dòng khớp với ID được cho (mặc định có thể khôi phục, xóa vĩnh viễn nếu yêu cầu hard-delete).

### US060_ViewRoleList — View Role List

**Actor:** Admin
**Goal:** Xem toàn bộ role đang có trong hệ thống.
**Business value:** Xác nhận role nào đang sẵn có trước khi gán cho một user hoặc sửa quyền của nó.

**Acceptance Criteria:**
- [ ] Trả về toàn bộ role chưa bị xóa, có phân trang, kể cả 3 role được seed sẵn.

### US061_ViewRoleDetail — View Role Detail

**Actor:** Admin
**Goal:** Xem chi tiết các permission đang được gán cho một role.
**Business value:** Xác nhận chính xác một role được làm gì trước khi gán nó hoặc kiểm tra lại.

**Acceptance Criteria:**
- [ ] Trả về role khớp với ID được cho, gồm cả các dòng permission đang được gán.
- [ ] Trả về response not-found nếu ID không khớp role nào chưa bị xóa.

### US062_CreateRole — Create Role

**Actor:** Admin
**Goal:** Tạo một role tùy chỉnh mới với một tập permission riêng.
**Business value:** Cho admin tạo một hồ sơ quyền hẹp hơn hoặc rộng hơn 3 role được seed sẵn, mà không phải đụng vào chúng.

**Acceptance Criteria:**
- [ ] Tạo một dòng role mới, tùy chọn kèm một tập permission ban đầu.
- [ ] Việc tạo không bao giờ bị chặn bởi khóa dành cho role được seed sẵn — khóa đó chỉ áp dụng cho sửa/xóa.

### US063_UpdateRole — Update Role

**Actor:** Admin
**Goal:** Đổi name, description, cờ active, hoặc tập permission của một role tùy chỉnh.
**Business value:** Cho phép hồ sơ quyền thay đổi theo khi route và nhu cầu nghiệp vụ của hệ thống thay đổi.

**Acceptance Criteria:**
- [ ] Cập nhật role khớp với ID được cho và thay thế danh sách permission của nó bằng dữ liệu gửi lên.
- [ ] Bị từ chối với response forbidden nếu name của role đích là `admin`, `client`, hoặc `seller`.

### US064_DeleteRole — Delete Role

**Actor:** Admin
**Goal:** Xóa một role tùy chỉnh không còn cần dùng nữa.
**Business value:** Giữ danh sách role gọn gàng, không còn hồ sơ permission thừa hoặc đã ngừng dùng.

**Acceptance Criteria:**
- [ ] Xóa role khớp với ID được cho (mặc định có thể khôi phục, xóa vĩnh viễn nếu yêu cầu hard-delete).
- [ ] Bị từ chối với response forbidden nếu name của role đích là `admin`, `client`, hoặc `seller`.

## 8. Scenarios

### US040_ViewPermissionList — Happy Path

**Given** một admin với session hợp lệ, **When** họ request danh sách permission, **Then** họ thấy toàn bộ dòng permission chưa bị xóa, có phân trang.

### US040_ViewPermissionList — Error: unauthenticated caller

**Given** một caller không có session hợp lệ hoặc role không có dòng permission khớp, **When** họ request danh sách permission, **Then** họ nhận response access-denied và không thấy dữ liệu nào.

### US041_ViewPermissionDetail — Happy Path

**Given** một admin và một ID permission tồn tại, **When** họ request chi tiết permission đó, **Then** họ thấy đầy đủ chi tiết gồm cả các role được gán.

### US041_ViewPermissionDetail — Error: unknown ID

**Given** một admin và một ID permission không khớp dòng nào chưa bị xóa, **When** họ request chi tiết, **Then** họ nhận response not-found.

### US042_CreatePermission — Happy Path

**Given** một admin gửi lên một cặp path/method mới, **When** họ tạo permission, **Then** một dòng mới được tạo với module tự suy ra từ path.

### US042_CreatePermission — Error: invalid role assignment

**Given** một admin gửi lên một ID role không tồn tại, **When** họ tạo permission, **Then** request bị từ chối và không có gì được tạo.

### US043_UpdatePermission — Happy Path

**Given** một admin và một permission có sẵn, **When** họ gửi chi tiết đã sửa cùng một danh sách role mới, **Then** dòng đó được cập nhật và danh sách role được gán được thay thế hoàn toàn.

### US043_UpdatePermission — Error: unknown ID

**Given** một admin và một ID permission không khớp dòng nào chưa bị xóa, **When** họ gửi một update, **Then** họ nhận response not-found.

### US044_DeletePermission — Happy Path

**Given** một admin và một permission có sẵn, **When** họ xóa nó mà không yêu cầu hard delete, **Then** dòng đó bị soft-delete và bị loại khỏi mọi lần đọc sau này.

### US044_DeletePermission — Error: already deleted

**Given** một admin và một ID permission đã bị soft-delete hoặc chưa từng tồn tại, **When** họ thử xóa nó, **Then** họ nhận response not-found.

### US060_ViewRoleList — Happy Path

**Given** một admin, **When** họ request danh sách role, **Then** họ thấy toàn bộ role chưa bị xóa, kể cả 3 role được seed sẵn.

### US060_ViewRoleList — Error: unauthenticated caller

**Given** một caller không có dòng permission khớp, **When** họ request danh sách role, **Then** họ nhận response access-denied.

### US061_ViewRoleDetail — Happy Path

**Given** một admin và một ID role tồn tại, **When** họ request chi tiết của nó, **Then** họ thấy dữ liệu của role đó cùng các permission đang được gán.

### US061_ViewRoleDetail — Error: unknown ID

**Given** một admin và một ID role không khớp role nào chưa bị xóa, **When** họ request chi tiết, **Then** họ nhận response not-found.

### US062_CreateRole — Happy Path

**Given** một admin gửi lên một name và một danh sách permission tùy chọn, **When** họ tạo role, **Then** một role mới được tạo, không bị ảnh hưởng bởi khóa dành cho role được seed sẵn.

### US062_CreateRole — Error: invalid permission assignment

**Given** một admin gửi lên một ID permission không tồn tại, **When** họ tạo role, **Then** request bị từ chối và không có gì được tạo.

### US063_UpdateRole — Happy Path

**Given** một admin và một role tùy chỉnh, **When** họ gửi chi tiết đã sửa, **Then** role đó được cập nhật và danh sách permission của nó được thay thế hoàn toàn.

### US063_UpdateRole — Error: target is a seeded role

**Given** một admin nhắm tới role `admin`, `client`, hoặc `seller`, **When** họ gửi một update, **Then** request bị từ chối với response forbidden và không có gì thay đổi.

### US064_DeleteRole — Happy Path

**Given** một admin và một role tùy chỉnh, **When** họ xóa nó mà không yêu cầu hard delete, **Then** role đó bị soft-delete và bị loại khỏi mọi lần đọc và kiểm tra quyền sau này.

### US064_DeleteRole — Error: target is a seeded role

**Given** một admin nhắm tới role `admin`, `client`, hoặc `seller`, **When** họ thử xóa nó, **Then** request bị từ chối với response forbidden và không có gì thay đổi.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Admin gửi lên một danh sách ID permission hoặc role có chứa một ID không tồn tại hoặc đã soft-delete | Toàn bộ request create/update bị từ chối — không có gì được áp dụng một phần | "Invalid permissions provided." / "Invalid roles provided." |
| Admin sửa `path` của một permission mà không ngờ `module` sẽ đổi theo | Nhãn module lưu trong DB giữ nguyên như lúc tạo, dù path đã đổi | Không hiện lỗi nào — sự lệch này diễn ra âm thầm (xem § 11 RISK-01) |
| Admin nhắm update hoặc delete vào `admin`, `client`, hoặc `seller` | Request bị từ chối trước khi có bất kỳ thay đổi nào | "You cannot modify this role." |
| Hai admin cùng sửa danh sách role của một permission cùng lúc | Lần ghi hoàn tất sau cùng thắng — danh sách gán được thay thế hoàn toàn chứ không gộp, nên thay đổi của admin trước bị ghi đè âm thầm | Không hiện cảnh báo xung đột nào |
| Script sync CAP-03 chạy trong lúc route của một dòng permission tạo tay không còn tồn tại | Dòng đó bị xóa, kể cả khi vừa được một admin tạo trước đó không lâu | Không có thông báo nào — việc này xảy ra ngoài mọi request API |

## 10. Edge Behaviours to Verify

- **FR-204** → Xác nhận việc chỉ sửa `path` của một permission không làm đổi `module` đã lưu.
- **FR-304** → Xác nhận update `admin`, `client`, hoặc `seller` bị từ chối trước khi có bất kỳ lệnh ghi DB nào.
- **FR-401** → Xác nhận gửi một danh sách role rỗng khi update permission sẽ xóa hết các role đang được gán.
- **FR-601** → Xác nhận một session `Bearer` hợp lệ nhưng role không có dòng permission khớp route vẫn nhận response access-denied.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | Sửa `path` của một dòng permission không tính lại nhãn `module` của nó — module lưu trong DB có thể lệch khỏi path thực tế sau khi sửa. | Allowlist role→module (CAP-03) có thể âm thầm tiếp tục cấp hoặc chặn quyền dựa trên một nhãn module đã cũ. | `[UNVERIFIED]` |
| RISK-02 | known-issue | Enum của cột `method` trong DB có 7 giá trị (thêm cả OPTIONS và HEAD), nhưng mọi đường code ghi dòng permission đều validate theo danh sách chỉ 5 giá trị — dòng OPTIONS/HEAD không bao giờ thực sự tạo được. | 2 trong 7 giá trị method được khai báo là vĩnh viễn không thể dùng tới; hiện chưa phải bug chức năng, nhưng là một điểm lệch giữa schema và những gì API thực sự tạo ra được. | `[INFERRED]` |
| RISK-03 | risk | Không tìm thấy cơ chế tự động (deploy hook, bước CI/CD, lúc app khởi động) nào để trigger script bảo trì sync-permission. | Nếu không ai nhớ chạy lại script này sau khi thêm/bớt route, bảng permission đang chạy sẽ âm thầm lệch khỏi bề mặt API thực tế. | `[UNVERIFIED]` |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| Authentication | feature | Phát hành access token `Bearer` mang theo role của caller trong payload, thứ mà mọi kiểm tra quyền của endpoint permission/role đều dựa vào | FR-601 |

## 13. Configuration

N/A — tính năng này không có hằng số cấu hình nào hướng tới người dùng. (Các biến môi trường admin-bootstrap dùng cho script seed của CAP-03 là cấu hình kỹ thuật/vận hành — xem `technical-spec.md § 4.6`.)
