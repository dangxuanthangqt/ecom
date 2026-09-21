---
authored_by: rebuild-spec
---
<!-- layout-exempt: rebuild-spec owns all docs/system|features|generated|flows paths -->
<!-- Contract: references/feature-spec-researcher-contract.md -->

# Mô tả chức năng — F009_OwnProfileManagement

**Độ ưu tiên**: P1
**Loại**: ui
**Được tạo**: 2026-09-12

**Xem thêm:** [`technical-spec.vi.md`](./technical-spec.vi.md) — endpoint, trích dẫn nguồn, pseudocode,
các entity chính, và ghi DB, dành cho Dev/QA/SA.

**Truy vết:** F009 → N/A (headless, không có màn hình) → US057, US058, US059 → N/A (không có logic nền) → ROUTE058, ROUTE059, ROUTE060 → N/A (chưa tạo test case)

## 1. Tổng quan

**Vấn đề:** Một người gọi đã đăng nhập (client, seller, hoặc admin) cần xem chi tiết tài khoản của chính mình, giữ nó cập nhật, và đổi mật khẩu mà không cần admin can thiệp.
**Giải pháp:** Ba hành động tự phục vụ — xem hồ sơ của chính mình, cập nhật các trường hồ sơ của chính mình, đổi mật khẩu của chính mình — tất cả đều giới hạn trong người gọi được xác định từ token session của họ, không bao giờ dùng ID người dùng khác.
**Phạm vi:** Xem bản ghi tài khoản của người gọi (kèm role và permission), sửa các trường name/phone/avatar/status/role của người gọi, và đổi mật khẩu của chính mình kèm buộc logout khỏi mọi thiết bị khác.
**Ngoài phạm vi:** Quản lý tài khoản người dùng khác (đó là `F010_UserAccountAdministration`); thiết lập hoặc refresh session, OTP, đăng nhập Google, hay bật/tắt 2FA (đó là `F001_Authentication`); tính năng này không có màn hình hay code phía client — đây là backend API dạng headless.

**Tác nhân**

| Tác nhân | Mô tả | Mục tiêu chính |
|-------|--------------|---------------|
| Client | Người mua đã đăng ký | Xem/cập nhật chi tiết tài khoản của chính mình và đổi mật khẩu |
| Seller | Chủ tài khoản role seller | Các hành động tự phục vụ giống hệt như bất kỳ người gọi đã xác thực nào khác |
| Admin | Chủ tài khoản role admin | Các hành động tự phục vụ giống hệt như bất kỳ người gọi đã xác thực nào khác — F009 không bao giờ phân biệt theo role, chỉ yêu cầu đã xác thực |

## 2. Khả năng chức năng

| ID | Khả năng | Người dùng có thể làm gì | User Stories | Yêu cầu | Business Rules | Màn hình |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Xem hồ sơ của chính mình | Xem chi tiết tài khoản của chính mình, gồm cả role và permission | US057 | FR-001, FR-101, FR-201, FR-601 | — | N/A |
| CAP-02 | Cập nhật hồ sơ của chính mình | Đổi tên, số điện thoại, avatar, status, hoặc role của chính mình | US058 | FR-202, FR-203, FR-602 | BR-003, BR-004 | N/A |
| CAP-03 | Đổi mật khẩu của chính mình | Đổi mật khẩu của chính mình, việc này sẽ logout khỏi mọi nơi khác | US059 | FR-204, FR-205 | BR-001, BR-002 | N/A |

## 3. Quyết định còn mở

| D### | Quyết định | Đề xuất mặc định | Lý do | Chặn công việc |
|------|----------|-------------------|-----------|--------------|
| D001 | Hành động tự phục vụ `PUT /profile` có nên được phép set `status` và `roleId` trên tài khoản của chính người gọi, hay hai trường đó chỉ admin mới được đụng? | Giới hạn `status` và `roleId` vào đường cập nhật do admin quản lý (`F010`), bỏ chúng khỏi cập nhật tự phục vụ; tự phục vụ chỉ giữ name/phone/avatar. | Hiện tại bất kỳ người gọi đã xác thực nào cũng có thể set `status` hoặc `roleId` của chính mình thành bất kỳ giá trị nào họ cung cấp được — kể cả id của role khác — không có kiểm tra sở hữu hay phân cấp. Đã ghi nhận đúng thực trạng ở RISK-01/RISK-02 bên dưới; dòng này là quyết định nghiệp vụ xem đó có phải là chủ ý hay không. | có |

## 4. Yêu cầu

### Nền tảng (0xx)

- **FR-001** Mọi hành động profile đều yêu cầu session `Bearer` hợp lệ; không route nào trong 3 route của tính năng này cho truy cập ẩn danh.

### Điều hướng (1xx)

- **FR-101** Người gọi được xác định từ token session của chính họ — không request nào trong tính năng này nhận ID người dùng mục tiêu.

### Hồ sơ (2xx)

- **FR-201** Xem hồ sơ trả về bản ghi tài khoản đầy đủ của người gọi, gồm cả role và permission của role đó.
- **FR-202** Cập nhật hồ sơ chấp nhận bất kỳ tập con nào của tên, số điện thoại, avatar, status, hoặc role — chỉ những trường được truyền mới bị đổi.
- **FR-203** `[UNVERIFIED]` Cập nhật hồ sơ không giới hạn giá trị `status` hay `role` mà người gọi có thể set cho tài khoản của chính mình — xem RISK-01/RISK-02 và Quyết định còn mở D001.
- **FR-204** Đổi mật khẩu yêu cầu mật khẩu hiện tại của người gọi và xác nhận mật khẩu mới phải khớp.
- **FR-205** Đổi mật khẩu thành công sẽ logout người gọi khỏi mọi thiết bị và session khác.

### Bảo mật (6xx)

- **FR-601** Cả ba role (client, seller, admin) đều dùng chung 3 hành động y hệt nhau — không role nào có thêm khả năng tự phục vụ ở đây.
- **FR-602** `[UNVERIFIED]` Không có kiểm tra nào giới hạn việc cập nhật hồ sơ của người gọi ở mức role bằng hoặc thấp hơn cấp quyền hiện tại của họ.

## 5. Business Rules

- Mật khẩu hiện tại của người gọi phải khớp với hash mật khẩu đã lưu trước khi mật khẩu mới được chấp nhận. (BR-001)
- Đổi mật khẩu sẽ revoke mọi refresh token và deactivate mọi thiết bị đã ghi nhận của user đó, buộc phải xác thực lại ở mọi nơi khác. (BR-002)
- Mọi lần cập nhật hồ sơ đều ghi nhận chính người gọi là người thực hiện thay đổi. (BR-003)
- Các trường cập nhật hồ sơ đều tùy chọn; trường nào không có trong request thì giữ nguyên giá trị cũ. (BR-004)

## 6. Màn hình

N/A — tính năng nền; không có màn hình cho người dùng (backend API dạng headless — xem `F001` để biết ghi chú phạm vi "không có màn hình" dùng chung; tính năng này expose 3 route, không có view nào).

### Hành trình người dùng

1. Người gọi đã xác thực gọi hành động xem và thấy chi tiết tài khoản, role, và permission của chính mình.
2. Người gọi gọi hành động cập nhật với bất kỳ tập con trường nào và thấy hồ sơ đã thay đổi được phản ánh lại.
3. Người gọi gọi hành động đổi mật khẩu với mật khẩu hiện tại và mật khẩu mới; khi thành công, mọi thiết bị/session khác họ từng đăng nhập đều bị logout.

## 7. User Stories

### US057 — Xem hồ sơ của chính mình

**Tác nhân:** Client (áp dụng y hệt cho Seller và Admin)
**Mục tiêu:** Xem chi tiết tài khoản của chính tôi.
**Giá trị nghiệp vụ:** Cho phép người gọi tự kiểm tra trạng thái tài khoản của mình mà không cần hỏi admin.

**Tiêu chí chấp nhận:**
- [ ] Response là hồ sơ của chính người gọi, xác định từ token `Bearer` — không nhận tham số id nào.
- [ ] Response bao gồm role của người gọi và permission của role đó.

### US058 — Cập nhật hồ sơ của chính mình

**Tác nhân:** Client (áp dụng y hệt cho Seller và Admin)
**Mục tiêu:** Giữ chi tiết tài khoản của chính tôi luôn cập nhật.
**Giá trị nghiệp vụ:** Cho phép người gọi tự sửa các thông tin thường xuyên thay đổi (tên, điện thoại, avatar) mà không cần admin can thiệp.

**Tiêu chí chấp nhận:**
- [ ] Chỉ tài khoản của chính người gọi mới bị thay đổi — route này không có đường cập nhật chéo sang user khác.
- [ ] Chỉ truyền một vài trường thì các trường còn lại của hồ sơ vẫn giữ nguyên.

### US059 — Đổi mật khẩu của chính mình

**Tác nhân:** Client (áp dụng y hệt cho Seller và Admin)
**Mục tiêu:** Đổi thông tin đăng nhập của chính tôi.
**Giá trị nghiệp vụ:** Cho phép người gọi tự bảo mật tài khoản (ví dụ sau khi nghi ngờ bị lộ) mà không cần admin can thiệp.

**Tiêu chí chấp nhận:**
- [ ] Bị từ chối nếu mật khẩu hiện tại được cung cấp không khớp.
- [ ] Khi thành công, người gọi bị logout khỏi mọi thiết bị khác.

## 8. Kịch bản

### US057 — Happy Path

**Given** một người gọi có session `Bearer` hợp lệ, **When** họ yêu cầu hồ sơ của chính mình, **Then** họ thấy tên, email, số điện thoại, avatar, status, role của họ và permission của role đó.

### US057 — Lỗi: session hết hạn

**Given** một người gọi có access token đã hết hạn, **When** họ yêu cầu hồ sơ của chính mình, **Then** request bị từ chối và họ phải đăng nhập lại.

### US058 — Happy Path

**Given** một người gọi có session `Bearer` hợp lệ, **When** họ chỉ gửi số điện thoại mới, **Then** số điện thoại của họ đổi và mọi trường khác giữ nguyên.

### US058 — Lỗi: tài khoản đã xóa mềm

**Given** một người gọi có tài khoản bị xóa mềm sau khi token của họ được cấp, **When** họ cố cập nhật hồ sơ, **Then** request bị từ chối như không tìm thấy.

### US059 — Happy Path

**Given** một người gọi biết mật khẩu hiện tại của mình, **When** họ gửi mật khẩu hiện tại khớp cùng mật khẩu mới có xác nhận khớp, **Then** mật khẩu đổi và họ bị logout khỏi mọi thiết bị khác.

### US059 — Lỗi: sai mật khẩu hiện tại

**Given** một người gọi cung cấp sai mật khẩu hiện tại, **When** họ cố đổi mật khẩu, **Then** request bị từ chối và mật khẩu không đổi.

## 9. Trường hợp biên

| Kịch bản | Điều gì xảy ra | Thông báo cho người dùng |
|----------|--------------|----------------------|
| Mật khẩu hiện tại không khớp khi đổi mật khẩu | Mật khẩu không đổi; không token nào bị revoke | "Current password is incorrect." |
| Mật khẩu mới và xác nhận không khớp | Request bị từ chối trước khi có bất kỳ thay đổi database nào | "newConfirmPassword must match newPassword." |
| Tài khoản của người gọi bị xóa mềm sau khi token được cấp | Cả 3 hành động đều bị từ chối | "User not found." |
| Người gọi tự set `status` của mình thành `BLOCKED` hoặc `INACTIVE` qua cập nhật hồ sơ | Giá trị được ghi mà không có kiểm tra thêm nào — tài khoản không bị logout ngay, vì cả guard lẫn các route này đều không kiểm tra `status` | Không có — thành công âm thầm; xem RISK-02 |
| Người gọi tự set `roleId` của mình thành role khác role hiện tại | Giá trị được ghi mà không kiểm tra sở hữu/phân cấp, miễn id đó trỏ tới một role thật, chưa xóa | Không có — thành công âm thầm; xem RISK-01 |

## 10. Hành vi biên cần kiểm tra

- **FR-204** → Xác nhận việc nhập sai mật khẩu hiện tại không bao giờ đổi mật khẩu đã lưu và không bao giờ revoke token nào.
- **FR-205** → Xác nhận đổi mật khẩu thành công sẽ revoke mọi refresh token và deactivate mọi thiết bị của user đó, không chỉ thiết bị hiện tại.
- **FR-202** → Xác nhận bỏ trống một trường trong request cập nhật thì giá trị đã lưu của trường đó không đổi.

## 11. Rủi ro & Vấn đề đã biết

| ID | Loại | Mô tả | Ảnh hưởng | Trạng thái |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | `PUT /profile` chấp nhận trường `roleId` chỉ với kiểm tra định dạng UUID + foreign-key tồn tại — không có rule nào giới hạn người gọi ở role hiện tại của họ hay một role thấp hơn. | Một client hay seller cung cấp id của role khác (ví dụ id role admin) có thể tự nâng cấp lên role đó. | confirmed |
| RISK-02 | known-issue | `PUT /profile` chấp nhận trường `status` chỉ với kiểm tra enum hợp lệ — không có rule nào ngăn người gọi tự set status của mình, và không route nào trong tính năng này (hay guard access-token dùng chung) kiểm tra `User.status` trước khi cấp quyền truy cập. | Người gọi có thể tự set tài khoản mình thành `BLOCKED`/`INACTIVE` mà không có tác dụng thực tế nào cho đến khi token tự hết hạn; ngược lại, đường này cũng không thể dùng cho quy trình tương đương admin để khóa tài khoản một cách đáng tin cậy. | confirmed |

## 12. Phụ thuộc

| Phụ thuộc | Loại | Vì sao tính năng này cần nó | Bằng chứng |
|------------|------|-----------------------------|----------|
| F001_Authentication | feature | Cung cấp access token `Bearer` mà danh tính người gọi (`ActiveUser`) của tính năng này được đọc ra từ đó; F009 không tự thiết lập session. | FR-001 |
| F010_UserAccountAdministration | feature | Dùng chung model `User` và các trường `roleId`/`status` mà RISK-01/RISK-02 đề cập — admin thao tác trên tài khoản người dùng khác là đường được phê duyệt cho đúng các trường mà F009 để hở không giới hạn. | RISK-01, RISK-02 |

## 13. Cấu hình

N/A — tính năng này không có hằng số cấu hình nào hướng đến người dùng.
