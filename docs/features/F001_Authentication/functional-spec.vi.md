---
authored_by: rebuild-spec
---
<!-- layout-exempt: rebuild-spec owns all docs/system|features|generated|flows paths -->
<!-- Contract: references/feature-spec-researcher-contract.md -->

# Functional Spec — F001_Authentication

**Priority**: P0
**Type**: mixed
**Generated**: 2026-09-12

**Xem thêm:** [`technical-spec.vi.md`](./technical-spec.vi.md) — endpoint, trích dẫn Source, pseudocode,
entity chính, và các thao tác ghi DB dành cho đối tượng đọc Dev/QA/SA.

**Truy vết:** F001 → N/A (headless, không có màn hình) → US001-US009 → BL003, BL005 → ROUTE001-ROUTE010 → TC### (chưa được sinh ra)

## 1. Tổng quan

**Vấn đề:** Một client cần cách chứng minh danh tính, tiếp tục chứng minh theo thời gian mà không
phải nhập lại thông tin đăng nhập liên tục, và khôi phục quyền truy cập nếu quên mật khẩu hoặc mất
yếu tố xác thực thứ hai — tất cả mà không cho phép người dùng khác hành động thay họ.
**Giải pháp:** Hệ thống cấp access token ngắn hạn và refresh token dài hạn hơn sau khi đăng nhập
bằng mật khẩu hoặc Google, cho phép client đổi refresh token lấy access token mới, thu hồi một
session, yêu cầu mã dùng một lần để xác minh, đặt lại mật khẩu bị quên, và bật/tắt xác thực hai
yếu tố (2FA) trên chính tài khoản của họ.
**Phạm vi:** Đăng ký tài khoản mới, đăng nhập bằng mật khẩu hoặc Google, refresh/thu hồi session,
yêu cầu OTP, đặt lại mật khẩu bị quên, bật/tắt 2FA.
**Ngoài phạm vi:** Quản trị vai trò/quyền (F010 sở hữu việc gán vai trò và ma trận quyền), quản lý
hồ sơ người dùng ngoài các trường thu thập lúc đăng ký, hạ tầng gửi email (chỉ phần sinh OTP nằm
trong phạm vi — xem § 11 RISK-01 về khoảng trống hiện tại), UI liệt kê thiết bị/session (không có
route CRUD nào cho `Device` ngoài login/logout).

**Tác nhân**

| Tác nhân | Mô tả | Mục tiêu chính |
|-------|--------------|---------------|
| Client | Bất kỳ end user đã đăng ký nào của storefront (vai trò mặc định được cấp khi đăng ký) | Thiết lập, duy trì, và kết thúc session xác thực của chính họ, và khôi phục khi bị khóa |
| Seller / Admin | Dùng chung cơ chế login/logout/2FA/refresh với Client — không có luồng auth riêng | Dùng chung vòng đời session như bất kỳ chủ tài khoản nào khác |

Tính năng này là một phần của luồng đăng nhập Google OAuth được ghi ở tài liệu riêng tại
`docs/google-oauth-login-flow.md` (đã đối chiếu chéo với source cho spec này).

## 2. Năng lực chức năng

| ID | Năng lực | Người dùng có thể làm gì | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Đăng ký & Xác minh danh tính | Tạo tài khoản bằng mã OTP kiểu gửi qua email, hoặc yêu cầu mã đó | US001, US005 | FR-001, FR-002, FR-101, FR-201, FR-202 | BR-001, BR-002, RISK-01, RISK-02 | N/A |
| CAP-02 | Vòng đời session mật khẩu | Đăng nhập bằng mật khẩu, refresh session sắp hết hạn, đăng xuất | US002, US003, US004 | FR-102, FR-203, FR-204, FR-205 | BR-003, BR-004, BR-005, DEC-001, SM-001 | N/A |
| CAP-03 | Đăng nhập Google OAuth | Đăng nhập bằng tài khoản Google, mới hoặc đã có | US006 | FR-103, FR-206 | BR-006, BR-007, DEC-002, RISK-03, RISK-04 | N/A |
| CAP-04 | Khôi phục mật khẩu | Đặt lại mật khẩu bị quên bằng mã OTP | US007 | FR-207 | BR-008 | N/A |
| CAP-05 | Xác thực hai yếu tố | Bật hoặc tắt 2FA dựa trên TOTP cho chính tài khoản người gọi | US008, US009 | FR-601, FR-208, FR-209 | BR-009, BR-010 | N/A |

## 3. Quyết định còn treo

| D### | Quyết định | Đề xuất mặc định | Lý do | Chặn công việc |
|------|----------|-------------------|-----------|--------------|
| D001 | Việc `POST /auth/otp` hiện không gửi email chứa mã (call site `EmailService.sendEmail` của BL005 bị comment out) là chủ đích, hay là một regression đang chờ bật lại? | Cứ để nguyên hiện trạng; coi mã OTP chỉ có thể lấy qua DB/kênh support nội bộ cho tới khi có câu trả lời | Toàn bộ luồng code chạy trọn vẹn end to end trừ việc gửi email thật — nghe giống một tính năng bị tạm dừng hơn là một lỗi sập, nhưng chỉ stakeholder mới xác nhận được chủ đích | có |
| D002 | `User.status` (`ACTIVE`/`INACTIVE`/`BLOCKED`) có nên chặn login/refresh với tài khoản không phải `ACTIVE` không? | Cứ để nguyên hiện trạng (status hiện không được kiểm tra ở đâu trong tính năng này) | Không có đường code nào trong F001 đọc `status` cả; thay đổi điều này là quyết định sản phẩm, không phải fix bug mà researcher nên tự mặc định | không |

## 4. Requirements

### Nền tảng (0xx)

- **FR-001** Tài khoản mới luôn được tạo với vai trò `client` — không có cách nào để người gọi yêu cầu vai trò khác lúc đăng ký.
- **FR-002** Một OTP đăng ký hoặc đặt lại mật khẩu chỉ dùng một lần cho mỗi cặp (email, purpose) — yêu cầu mã mới cho cùng email và purpose sẽ thay thế mã cũ.

### Điều hướng (1xx)

- **FR-101** Người dùng tiềm năng đến bước đăng ký bằng cách yêu cầu OTP cho purpose `REGISTER` trước, sau đó gửi kèm thông tin tài khoản của họ.
- **FR-102** Người dùng quay lại truy cập session của họ bằng cách gửi email + mật khẩu (kèm mã 2FA nếu có) tới endpoint login.
- **FR-103** Người dùng đến bước đăng nhập Google bằng cách yêu cầu authorization URL, hoàn tất consent trên Google, và được redirect trở lại qua callback endpoint.

### Đăng ký & OTP (2xx)

- **FR-201** Đăng ký yêu cầu mã OTP hợp lệ, chưa hết hạn, đã được cấp trước đó cho email đó dưới purpose `REGISTER`.
- **FR-202** Yêu cầu OTP cho `REGISTER` bị từ chối nếu tài khoản với email đó đã tồn tại; yêu cầu cho `FORGOT_PASSWORD` bị từ chối nếu không có tài khoản nào tồn tại.

### Session mật khẩu (2xx)

- **FR-203** Đăng nhập yêu cầu cặp email/mật khẩu khớp nhau; nếu tài khoản đã bật 2FA, còn cần thêm mã TOTP hợp lệ hoặc mã OTP purpose `LOGIN` hợp lệ.
- **FR-204** Một refresh token chỉ có thể đổi lấy cặp access/refresh token mới đúng một lần; refresh token cũ bị vô hiệu hóa trong cùng thao tác đó.
- **FR-205** Đăng xuất vô hiệu hóa refresh token được gửi lên và đánh dấu thiết bị sở hữu nó là inactive.

### Google OAuth (2xx)

- **FR-206** Hoàn tất consent Google tạo tài khoản vai trò `client` mới ở lần đăng nhập đầu tiên (kèm mật khẩu nội bộ placeholder cố định) hoặc đăng nhập vào tài khoản đã tồn tại được khớp theo email.

### Khôi phục mật khẩu (2xx)

- **FR-207** Đặt lại mật khẩu bị quên yêu cầu mã OTP purpose `FORGOT_PASSWORD` hợp lệ, chưa hết hạn cho email đó.

### Xác thực hai yếu tố (2xx)

- **FR-208** Bật 2FA bị từ chối nếu tài khoản người gọi đã bật sẵn.
- **FR-209** Tắt 2FA bị từ chối nếu tài khoản người gọi hiện chưa bật.

### Bảo mật (6xx)

- **FR-601** Mọi route trong tính năng này trừ register/login/refresh-token/otp/google-*/forgot-password đều yêu cầu access token `Bearer` hợp lệ; bảy route đó (google-* là hai route) được khai báo public rõ ràng.

## 5. Business Rules

- Tài khoản mới, dù qua đăng ký hay đăng nhập Google, luôn được gán vai trò `client` — không có trường nào cho phép người gọi chọn vai trò khác. (BR-001)
- Một OTP đăng ký bị xóa ngay khi tài khoản được tạo thành công, và một OTP `FORGOT_PASSWORD` bị xóa ngay khi mật khẩu được đặt lại thành công — mã cũ không thể bị replay lại cho cùng purpose. (BR-002)
- Nếu tài khoản đăng nhập đã bật 2FA, người gọi phải cung cấp mã TOTP hoặc mã đăng nhập dùng một lần — không cái nào bắt buộc khi 2FA tắt. (BR-003)
- Refresh token xoay vòng: dùng một token sẽ xóa nó và cấp refresh token hoàn toàn mới, chỉ giữ lại thời gian sống còn lại của token thay vì reset toàn bộ cửa sổ hết hạn. (BR-004)
- Đăng nhập hoặc refresh cập nhật dòng `Device` của người gọi (IP, user agent) thay vì tạo mới mỗi lần refresh. (BR-005)
- Lần đăng nhập Google đầu tiên được tự động cấp một mật khẩu nội bộ cố định, không ngẫu nhiên (`"changeme"`, đã hash) thay vì mật khẩu ngẫu nhiên — đây là một mối lo bảo mật đã ghi nhận, xem RISK-03. (BR-006)
- Tham số `state` của Google OAuth mang `{userAgent, ip}` để callback có thể gắn chúng vào dòng `Device` của session mới, nhưng nó không được ký mã hóa — xem RISK-04. (BR-007)
- Các trường xác nhận mật khẩu (`confirmPassword` khi đăng ký và quên mật khẩu) phải khớp chính xác với trường mật khẩu đi kèm trước khi request được chấp nhận. (BR-008)
- Bật 2FA chỉ lưu một secret TOTP mới sinh khi tài khoản hiện chưa có, chỉ tác động lên chính tài khoản của người gọi, không bao giờ của người dùng khác. (BR-009)
- Tắt 2FA chỉ xóa secret TOTP khi tài khoản hiện đang có, chỉ tác động lên chính tài khoản của người gọi, không bao giờ của người dùng khác. (BR-010)
- Đích redirect của callback Google OAuth khác nhau tùy kết quả: thành công mang access/refresh token mới dưới dạng query parameter, thất bại mang thông báo lỗi chung — không bao giờ cả hai. (DEC-002)
- Refresh một session token luôn thay thế refresh token được gửi lên bằng một token mới trong cùng request; token cũ bị xóa bất kể token mới sau đó có được dùng hay không. (DEC-001)
- Refresh token của một session chuyển từ active sang rotated khi session được refresh, hoặc sang revoked khi người dùng đăng xuất; một khi đã rotated hoặc revoked thì không thể dùng lại. (SM-001)

## 6. Screens

N/A — tính năng nền, không có màn hình hướng người dùng. Các route sở hữu để truy vết: ROUTE001
(register), ROUTE002 (login), ROUTE003 (refresh-token), ROUTE004 (logout), ROUTE005 (otp),
ROUTE006 (google/authorization-url), ROUTE007 (google/callback), ROUTE008 (forgot-password),
ROUTE009 (2fa/enable), ROUTE010 (2fa/disable).

### Hành trình người dùng

1. Người dùng mới gọi endpoint OTP cho `REGISTER`, sau đó gửi endpoint register kèm mã đó — một
   tài khoản được tạo với vai trò `client`.
2. Người dùng quay lại gọi endpoint login với email/mật khẩu (kèm mã 2FA nếu bật) và nhận cặp
   access + refresh token.
3. Khi access token gần hết hạn, client đổi refresh token lấy cặp mới qua endpoint refresh, mà
   không cần yêu cầu người dùng đăng nhập lại.
4. Người dùng gọi logout, vô hiệu hóa refresh token hiện tại và deactivate thiết bị.
5. Người dùng quên mật khẩu gọi endpoint OTP cho `FORGOT_PASSWORD`, sau đó gửi endpoint
   forgot-password kèm mã đó và mật khẩu mới.
6. Người dùng chọn đăng nhập Google thay thế: client yêu cầu authorization URL, người dùng
   consent trên Google, và redirect của Google hoàn tất login phía server, trả token về client
   qua query parameter của redirect.
7. Người dùng đã đăng nhập bật hoặc tắt 2FA trên chính tài khoản của họ bất cứ lúc nào.

## 7. User Stories

### US001_RegisterAccount — Đăng ký tài khoản mới

**Actor:** Client
**Mục tiêu:** Tạo tài khoản mới để bắt đầu dùng nền tảng.
**Giá trị nghiệp vụ:** Biến một visitor thành một chủ tài khoản đã xác thực, có thể liên hệ được.

**Tiêu chí nghiệm thu:**
- [ ] Gửi email/mật khẩu/tên/số điện thoại hợp lệ kèm OTP `REGISTER` khớp sẽ tạo một tài khoản
  với vai trò `client`.
- [ ] Gửi một email đã có tài khoản trả về lỗi kiểu conflict, không phải tài khoản trùng lặp.
- [ ] URL `avatar` được gửi lên được validation chấp nhận nhưng `[UNVERIFIED gap]` không bao giờ
  thực sự được lưu vào tài khoản — xem RISK-02.

### US002_LogIn — Đăng nhập bằng mật khẩu

**Actor:** Client
**Mục tiêu:** Truy cập tài khoản của tôi bằng email và mật khẩu.
**Giá trị nghiệp vụ:** Cách cơ bản nhất để bất kỳ chủ tài khoản nào tiếp tục một session.

**Tiêu chí nghiệm thu:**
- [ ] Thông tin đăng nhập hợp lệ (kèm mã 2FA nếu bật) trả về cặp access + refresh token.
- [ ] Email hoặc mật khẩu sai bị từ chối mà không xác nhận cho trường *kia* biết cái nào sai.

### US003_RefreshAccessToken — Refresh một session sắp hết hạn

**Actor:** Client
**Mục tiêu:** Đổi refresh token của tôi lấy access token mới mà không cần nhập lại thông tin
đăng nhập.
**Giá trị nghiệp vụ:** Giữ session sống qua suốt vòng đời ngắn của access token.

**Tiêu chí nghiệm thu:**
- [ ] Một refresh token hợp lệ, chưa bị xóa trả về cặp access + refresh token mới và vô hiệu hóa
  refresh token cũ.
- [ ] Refresh token hết hạn hoặc đã dùng bị từ chối.

### US004_LogOut — Đăng xuất

**Actor:** Client
**Mục tiêu:** Kết thúc session hiện tại của tôi trên thiết bị này.
**Giá trị nghiệp vụ:** Cho phép người dùng thu hồi quyền truy cập từ một thiết bị họ không còn
kiểm soát hoặc không còn tin tưởng.

**Tiêu chí nghiệm thu:**
- [ ] Đăng xuất xóa refresh token được gửi lên và đánh dấu thiết bị của nó là inactive.
- [ ] Hoạt động giống hệt nhau bất kể người gọi là client, seller, hay admin.

### US005_RequestOtpCode — Yêu cầu mã xác minh dùng một lần

**Actor:** Client
**Mục tiêu:** Lấy mã dùng một lần để xác minh danh tính cho đăng ký, đăng nhập, đặt lại mật khẩu,
hoặc tắt 2FA.
**Giá trị nghiệp vụ:** Cung cấp bước xác minh danh tính mà nhiều user story khác phụ thuộc vào.

**Tiêu chí nghiệm thu:**
- [ ] Một dòng `VerificationCode` được tạo cho email và purpose được yêu cầu.
- [ ] `[UNVERIFIED gap]` Mã hiện không được gửi email cho người dùng — xem RISK-01.

### US006_LogInWithGoogle — Đăng nhập bằng Google

**Actor:** Client
**Mục tiêu:** Đăng nhập bằng tài khoản Google thay vì một mật khẩu riêng.
**Giá trị nghiệp vụ:** Loại bỏ ma sát của việc phải có mật khẩu riêng cho nền tảng này.

**Tiêu chí nghiệm thu:**
- [ ] Yêu cầu authorization URL trả về một link consent của Google.
- [ ] Hoàn tất consent tạo tài khoản `client` mới ở lần đăng nhập đầu (khớp theo email) hoặc đăng
  nhập vào tài khoản đã có, và redirect trở lại app client kèm token đính kèm.
- [ ] Tài khoản Google lần đầu được cấp một mật khẩu nội bộ cố định, không ngẫu nhiên — xem RISK-03.

### US007_ResetForgottenPassword — Đặt lại mật khẩu bị quên

**Actor:** Client
**Mục tiêu:** Lấy lại quyền truy cập tài khoản sau khi quên mật khẩu.
**Giá trị nghiệp vụ:** Tránh bị khóa vĩnh viễn vì một lỗi phổ biến, rủi ro thấp.

**Tiêu chí nghiệm thu:**
- [ ] OTP `FORGOT_PASSWORD` hợp lệ kèm mật khẩu mới + xác nhận khớp nhau sẽ cập nhật mật khẩu
  của tài khoản.
- [ ] Không cần session hiện có để dùng endpoint này.

### US008_EnableTwoFactorAuth — Bật 2FA

**Actor:** Client
**Mục tiêu:** Thêm một yếu tố thứ hai để bảo vệ tài khoản của tôi.
**Giá trị nghiệp vụ:** Giảm rủi ro chiếm tài khoản chỉ từ mật khẩu bị lộ.

**Tiêu chí nghiệm thu:**
- [ ] Bật 2FA cho tài khoản chưa có 2FA trả về secret TOTP và provisioning URI, và lưu lại secret.
- [ ] Bật 2FA khi đã bật sẵn bị từ chối.

### US009_DisableTwoFactorAuth — Tắt 2FA

**Actor:** Client
**Mục tiêu:** Bỏ yếu tố thứ hai để có thể đăng nhập lại chỉ bằng mật khẩu.
**Giá trị nghiệp vụ:** Cho phép người dùng khôi phục sau khi mất authenticator mà không phải bỏ
tài khoản.

**Tiêu chí nghiệm thu:**
- [ ] Tắt 2FA khi đang bật sẽ xóa secret.
- [ ] Tắt 2FA khi chưa bật bị từ chối.

## 8. Scenarios

### US001_RegisterAccount — Happy Path

**Given** một OTP `REGISTER` hợp lệ, chưa hết hạn tồn tại cho `newuser@example.com`, **When**
người dùng gửi thông tin đăng ký khớp và mã đó, **Then** một tài khoản được tạo với vai trò
`client` và OTP bị tiêu thụ.

### US001_RegisterAccount — Error: Email đã đăng ký

**Given** một tài khoản đã tồn tại cho `existing@example.com`, **When** một OTP mới được yêu cầu
cho email đó dưới `REGISTER`, **Then** request bị từ chối với thông báo dạng ngôn ngữ tự nhiên
"email already exists".

### US002_LogIn — Happy Path

**Given** một tài khoản đã đăng ký với email/mật khẩu đúng và chưa bật 2FA, **When** người dùng
gửi login, **Then** họ nhận được một access token và một refresh token.

### US002_LogIn — Error: Sai mật khẩu

**Given** một tài khoản đã đăng ký, **When** người dùng gửi đúng email nhưng sai mật khẩu,
**Then** request bị từ chối với "Password is not valid."

### US003_RefreshAccessToken — Happy Path

**Given** một refresh token hợp lệ, chưa hết hạn, **When** người dùng gửi nó tới endpoint
refresh, **Then** họ nhận được cặp access + refresh token mới và refresh token cũ không còn
dùng được nữa.

### US003_RefreshAccessToken — Error: Refresh token hết hạn

**Given** một refresh token đã hết hạn, **When** người dùng gửi nó, **Then** request bị từ chối
là unauthorized.

### US006_LogInWithGoogle — Happy Path

**Given** người dùng hoàn tất consent Google lần đầu tiên, **When** Google redirect tới callback
với code và state hợp lệ, **Then** một tài khoản `client` mới được tạo và app client nhận token
qua redirect.

### US006_LogInWithGoogle — Error: State không hợp lệ hoặc hết hạn

**Given** một tham số `state` bị can thiệp hoặc hết hạn, **When** Google redirect tới callback,
**Then** app client bị redirect trở lại kèm thông báo lỗi chung, không phải token.

## 9. Edge Cases

| Kịch bản | Điều gì xảy ra | Thông báo hiển thị cho người dùng |
|----------|--------------|----------------------|
| Đăng ký với OTP được cấp cho một email khác | Việc tra cứu trên `(email, code, type)` không tìm thấy khớp nào | "Verification code is not valid." |
| Hai request refresh đua nhau trên cùng một refresh token | Token bị xóa ngay khi dùng lần đầu; request thua tra cứu thất bại | "Refresh token not found." |
| Yêu cầu login bằng mã 2FA khi tài khoản chưa bật 2FA | Không có kiểm tra 2FA nào chạy cả — chỉ mật khẩu là đủ | Không có — đăng nhập bình thường, âm thầm |
| Tắt 2FA mà không cung cấp cả mã TOTP lẫn mã OTP | Secret 2FA của tài khoản vẫn bị xóa — validation không yêu cầu mã nào khi cả hai trường đều bị bỏ trống | Không có — 2FA bị tắt mà không kiểm tra yếu tố thứ hai |
| Callback Google mà email của tài khoản đã thuộc về một tài khoản không phải Google | Tài khoản hiện có được đăng nhập vào nguyên trạng — không có bước liên kết danh tính riêng nào | Không có — được xử lý như một login bình thường |

## 10. Edge Behaviours to Verify

- **FR-002** → Xác nhận rằng yêu cầu OTP thứ hai cho cùng email/purpose ghi đè, chứ không nhân đôi, mã đầu tiên.
- **FR-204** → Xác nhận một refresh token không thể dùng lại sau khi refresh thành công.
- **FR-206** → Xác nhận một callback Google cho email đã có tài khoản dựa trên mật khẩu đăng nhập vào chính tài khoản đó thay vì tạo bản trùng.
- **FR-601** → Xác nhận mọi route không public trong tính năng này trả 401 khi hoàn toàn không có header `Authorization`.

## 11. Risks & Known Issues

| ID | Loại | Mô tả | Tác động | Trạng thái |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | `POST /auth/otp` tạo một dòng `VerificationCode` nhưng không bao giờ gửi nó — call site duy nhất của `EmailService.sendEmail` (trong `sendOTP`) bị comment out. | Người gọi không có cách nào nhận mã OTP của họ chỉ qua tính năng này; register/forgot-password/login-2FA/disable-2FA đều phụ thuộc vào một mã mà người dùng không bao giờ nhận được qua email. | confirmed |
| RISK-02 | known-issue | `RegisterRequestDto.avatar` được validate (phải là URL nếu có) nhưng không bao giờ được ghi vào dòng `User` được tạo — `UserInputData` bỏ hoàn toàn trường này. | Một client gửi avatar lúc đăng ký sẽ âm thầm mất giá trị đó; trường này trông có vẻ hoạt động trong API contract nhưng thực ra không. | confirmed |
| RISK-03 | risk | Tài khoản đăng nhập Google lần đầu được cấp một mật khẩu nội bộ cố định, dùng chung (`"changeme"`, đã hash) thay vì mật khẩu ngẫu nhiên. | Về lý thuyết bất kỳ tài khoản được provision qua Google nào cũng có thể đăng nhập được qua endpoint mật khẩu bằng giá trị đã biết này, nếu luồng login mật khẩu nội bộ từng bị lộ ra cho tài khoản đó mà người gọi không sở hữu luôn danh tính Google. | confirmed |
| RISK-04 | risk | Tham số `state` của Google OAuth được mã hóa base64 nhưng không được ký/HMAC — bất kỳ ai cũng có thể tự dựng một payload state hợp lệ về hình thức. | State không thể được tin cậy như một biện pháp chống CSRF; hiện nó chỉ mang metadata `{userAgent, ip}`, nên tác động thực tế hiện tại chỉ giới hạn ở việc metadata đó có thể bị giả mạo, chưa đến mức chiếm toàn bộ tài khoản. | confirmed |
| RISK-05 | risk | `User.status` (`ACTIVE`/`INACTIVE`/`BLOCKED`) không bao giờ được đọc ở bất kỳ đâu trong các luồng code login/refresh/register của tính năng này. | Một tài khoản bị đánh dấu `INACTIVE` hoặc `BLOCKED` ở nơi khác trong hệ thống vẫn có thể login, refresh, và dùng 2FA qua tính năng này — xem Quyết định còn treo D002. | confirmed |

## 12. Dependencies

| Dependency | Loại | Vì sao tính năng này cần nó | Bằng chứng |
|------------|------|-----------------------------|----------|
| F010 (Quản trị vai trò/quyền) | feature | Mọi tài khoản mà tính năng này tạo ra đều được gán vai trò `client`, và mọi route trong tính năng này yêu cầu token `Bearer` đều được gác bởi các dòng quyền theo từng route mà F010 quản lý. | BR-001, FR-601 |
| Google OAuth (external service) | external-service | Google là identity provider cho US006 — callback không thể hoàn tất nếu thiếu token exchange và userinfo endpoint của Google. | BR-006, BR-007 |
| Resend (external service) | external-service | Kênh gửi dự kiến (hiện đang ngắt kết nối) cho mã OTP. | RISK-01 |

## 13. Configuration

```text
OTP_EXPIRES_IN         # how long a requested one-time code stays valid before FR-201/FR-207 reject it
ACCESS_TOKEN_EXPIRES_IN  # how long an issued access token stays valid before a refresh is required
REFRESH_TOKEN_EXPIRES_IN # how long an issued refresh token stays valid before FR-204's rotation is no longer possible
```
</content>
