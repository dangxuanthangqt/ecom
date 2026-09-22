# Permissions

**Dự án**: ecom (NestJS backend)
**Được tạo**: 2026-09-12 · **Cập nhật lần cuối**: 2026-09-21 (RBAC refactor: semantic permission keys)
**Phạm vi phân tích**: Headless backend API, ~70 route

> **Bản mô tả súc tích, dễ hiểu.** Dành cho PM/BA/client. Phần đi sâu kỹ thuật — request được
> phân quyền thế nào, cách thêm permission, vì sao chọn mô hình này — nằm ở
> [../authorization-guide.md](../authorization-guide.md). Ma trận PERM### thô tại
> [permissions-matrix.md](permissions-matrix.md) có từ trước đợt refactor 2026-09-21 và mô tả
> mô hình dựa trên route cũ; coi nó là tài liệu lịch sử cho đến khi `rebuild-spec` chạy lại.

## Loại hệ thống phân quyền

**Loại hệ thống**: `rbac` với thêm trục scope cho từng permission (`own` / `any`) — thường gọi là scoped RBAC.

Mỗi request trước tiên cần một access token Bearer hợp lệ, trừ khi route được đánh dấu công khai rõ ràng.
Xác thực xong, đến lượt kiểm tra thứ hai: role của người gọi phải có **permission key** mà route
khai báo. Một key gồm tên năng lực nghiệp vụ, một hành động và một phạm vi — ví dụ
`product:update:own` ("cập nhật sản phẩm do mình tạo") hoặc `brand:create:any` ("tạo brand bất kỳ").

Key được khai báo trong code, ngay trên từng route handler, và danh sách key được đồng bộ vào
database. Role nào giữ key nào là dữ liệu: với ba role dựng sẵn, việc gán được định nghĩa trong code và
áp dụng lại mỗi lần seed; với role tạo sau, việc gán được chỉnh qua role-management API.

Một route hoặc là công khai, hoặc phải khai báo key — nếu không, ứng dụng sẽ không khởi động. Không có
trạng thái thứ ba.

**Các role đã xác định**:
- `admin`
- `seller`
- `client`

Cả ba đều là **system role**: không thể đổi tên, đổi permission hay xóa qua API.

## Tổng quan các role

- **Admin** giữ mọi key ở scope `any`: toàn quyền với user, role, ngôn ngữ, brand,
  category, mọi bản dịch, sản phẩm của mọi seller, tiến trình xử lý mọi order, và kiểm duyệt
  (xóa review bất kỳ). Admin cũng là role duy nhất được xóa file media, vì
  hệ thống chưa ghi lại ai là chủ sở hữu file nên không thể scope theo `own`.
- **Seller** quản lý sản phẩm và bản dịch sản phẩm **của chính mình** (tạo/đọc/sửa/xóa,
  scope `own`), xem và cập nhật trạng thái các order có chứa sản phẩm của mình, và được đọc
  brand, category — thứ cần để tạo sản phẩm. Seller cũng có mọi quyền mà một tài khoản đã đăng nhập
  được cấp (xem bên dưới). Seller không được đụng vào sản phẩm của seller khác, không được tạo/sửa
  brand hay category, không được quản lý user hay role.
- **Client** có mọi quyền của một tài khoản đã đăng nhập: profile riêng, giỏ hàng, order (tạo, xem,
  hủy), review của mình, upload media, và quyền đọc brand, category. Client duyệt được
  catalogue công khai. Client **không** được tạo, sửa hay xóa brand, category hay bản dịch sản phẩm —
  trước đây có thể do sơ suất; quyền đó đã bị gỡ trong đợt refactor 2026-09-21.
- **Mọi người, kể cả người gọi ẩn danh**, đều đăng ký, đăng nhập, refresh token, xin OTP,
  bắt đầu/hoàn tất đăng nhập Google OAuth, yêu cầu reset mật khẩu, và duyệt `GET /products`,
  `GET /products/:id`, `GET /brands`, `GET /reviews` được.

## Ranh giới truy cập

Ranh giới cốt lõi là **permission key**, không phải URL. Hai route có thể dùng chung tiền tố URL nhưng
đòi hỏi key khác nhau; một năng lực có thể trải trên nhiều route. Trong một key, phần `scope` tạo ra ranh giới thứ hai:

- `any` — người gọi được thao tác trên mọi bản ghi.
- `own` — người gọi chỉ được thao tác trên bản ghi mình sở hữu. Quyền sở hữu được xác định ở tầng
  service bằng cách so `user ID` của người gọi với `createdById` của bản ghi (sản phẩm), hoặc bằng cách
  lọc query chỉ lấy order có chứa sản phẩm của người gọi (xử lý order). Bản ghi không thuộc về người gọi
  sẽ trả về 403 (sản phẩm) hoặc 404 (order).

Có `any` thì mặc nhiên có `own`. Route chỉ khai báo mức *tối thiểu* nó cần; người gọi có quyền rộng hơn
vẫn qua được, và service sẽ mở rộng dữ liệu tương ứng. Nhờ vậy một route `GET` duy nhất phục vụ được
cả "seller chỉ thấy sản phẩm của mình" lẫn "admin thấy tất cả" mà code không cần biết đến tên role.

## Trường hợp đặc biệt

- **Role mặc định khi đăng ký là cố định.** Đăng ký tài khoản (email/mật khẩu hoặc Google OAuth)
  luôn tạo ra một `client`. Muốn nâng quyền, một admin phải thao tác sau đó.
- **System role bị khóa cứng qua HTTP.** `admin`, `client`, `seller` mang cờ `isSystem = true`; các
  endpoint quản lý role từ chối sửa hoặc xóa chúng. Quyền của các role này lấy từ
  `src/constants/role-permission-matrix.constant.ts` và được ghi đè mỗi lần seed, nên nếu sửa qua API
  thì thay đổi đó sẽ âm thầm bị mất — từ chối thẳng vẫn trung thực hơn.
- **Danh mục permission do code sở hữu và chỉ đọc qua HTTP.** `GET /permissions` liệt kê danh mục đó;
  không có tạo/sửa/xóa. Muốn đổi quyền thì sửa từ phía role (`PUT /roles/:id`) đối với role tùy chỉnh,
  hoặc sửa trực tiếp ma trận trong code (qua review) đối với system role.
- **Xóa media chỉ admin mới làm được.** Không có bảng nào ghi ai đã upload file nào, nên `media:delete`
  không thể scope theo `own`. Seller và client upload được; chỉ admin xóa được. Việc này bịt lại lỗ hổng
  khiến bất kỳ user đã đăng nhập nào cũng có thể xóa file bất kỳ chỉ cần biết key.
- **Quyền sở hữu bản dịch sản phẩm đi theo sản phẩm.** Bản dịch thuộc về người đã tạo ra
  sản phẩm mà nó dịch. Seller chỉ xem, sửa, xóa được bản dịch của sản phẩm mình,
  và chỉ thêm được bản dịch cho sản phẩm mình; động vào hàng của seller khác sẽ nhận 404. Admin
  (`any`) không bị giới hạn.
- **`GET /brands/:id` cần token; `GET /brands` thì không.** Route danh sách công khai, route chi tiết
  yêu cầu `brand:read:any` — cả ba role đều có quyền này. Đã đánh dấu để đội kỹ thuật cân nhắc
  xem route chi tiết có nên công khai luôn hay không.
- **Trong code còn một luồng xác thực bằng API key chưa dùng đến** nhưng chưa gắn vào route nào.
