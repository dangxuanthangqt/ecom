---
authored_by: doc-writer
---

# Mô tả chức năng — F013_ProductReviews

**Độ ưu tiên**: P1
**Loại**: ui
**Được tạo**: 2026-09-12

**Xem thêm:** [`technical-spec.vi.md`](./technical-spec.vi.md) — endpoint, trích dẫn nguồn, pseudocode,
các entity chính, và ghi DB, dành cho Dev/QA/SA.

**Truy vết:** F013 → N/A (headless API — không có màn hình) → US081, US082, US083, US084 → N/A (không có logic nền) → ROUTE082, ROUTE083, ROUTE084, ROUTE085 → N/A (chưa tạo test case)

## 1. Tổng quan

**Vấn đề:** Người mua không có tín hiệu nào khác ngoài mô tả sản phẩm do chính người bán viết.
**Giải pháp:** Xếp hạng và đánh giá bằng văn bản, ai cũng đọc được, nhưng chỉ người có đơn hàng
cho sản phẩm đó đã thực sự được giao mới ghi được.
**Phạm vi:** danh sách đánh giá công khai theo sản phẩm; tạo/chỉnh sửa/xóa đánh giá của chính mình.
**Ngoài phạm vi:** phản hồi từ người bán (không có model Prisma); ảnh trong đánh giá (`Review` không có cột image);
kiểm duyệt và báo cáo vi phạm; xếp hạng tổng hợp hiển thị trên read model của sản phẩm (`Product` không có
cột đó — tính năng duyệt công khai của F007 không bị ảnh hưởng bởi tính năng này).

**Tác nhân**

| Tác nhân | Mô tả | Mục tiêu chính |
|-------|------|------|
| Khách mua hàng | Bất kỳ khách truy cập nào, dù đã đăng nhập hay chưa | Đọc đánh giá của sản phẩm trước khi mua |
| Người mua đã xác minh | Người dùng đã đăng nhập, có đơn hàng `DELIVERED` cho sản phẩm | Viết, sửa hoặc xóa đánh giá của chính mình cho sản phẩm mình thực sự đã nhận |

Tính năng này phụ thuộc vào đơn hàng `DELIVERED` của F012_OrderPlacement và quan hệ `Order.products`
mà nó điền lúc checkout, để xác minh việc mua hàng (BR-R01).

## 2. Khả năng chức năng

| ID | Khả năng | Người dùng có thể làm gì | User Stories | Yêu cầu | Business Rules | Màn hình |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Đọc đánh giá công khai | Đọc đánh giá của bất kỳ sản phẩm nào, mới nhất trước, không cần đăng nhập | US081 | FR-001, FR-201 | BR-R05 | N/A — headless API, không có màn hình |
| CAP-02 | Viết đánh giá của riêng mình | Tạo, sửa, xóa đánh giá của chính mình cho sản phẩm mình thực sự đã nhận | US082, US083, US084 | FR-202, FR-203, FR-204 | BR-R01, BR-R02, BR-R03, BR-R04, BR-R06 | N/A — headless API, không có màn hình |

## 3. Quyết định còn mở

Không có — mọi xác nhận về nghiệp vụ đều đã chốt. `clarifications.md` § Review đã giải quyết xong; mục
mở duy nhất được ghi ở đó ("người bán có được trả lời hay không") đã được xác định rõ là ngoài phạm vi, không phải
quyết định còn treo cho tính năng này.

## 4. Yêu cầu

### Nền tảng (0xx)

- **FR-001** Đọc đánh giá không cần xác thực; ghi (tạo/sửa/xóa) yêu cầu người gọi đã xác thực và
  chỉ được thao tác trên đánh giá của chính họ.

### Đọc đánh giá công khai (2xx)

- **FR-201** Ai cũng có thể liệt kê đánh giá của một sản phẩm, mới nhất trước, có phân trang, giới hạn theo một
  `productId`.

### Viết đánh giá của riêng mình (2xx, tiếp theo)

- **FR-202** Người gọi có đơn hàng `DELIVERED` cho sản phẩm có thể tạo đúng một đánh giá cho nó.
- **FR-203** Người gọi có thể sửa rating và/hoặc nội dung đánh giá của chính mình.
- **FR-204** Người gọi có thể xóa đánh giá của chính mình.

## 5. Business Rules

- **BR-R01 — Đã xác minh mua hàng.** Chỉ tạo được đánh giá nếu người gọi có `Order` ở trạng thái
  `DELIVERED`, chưa bị xóa mềm, và quan hệ `products` của đơn hàng đó có sản phẩm này.
- **BR-R02 — Mỗi user một đánh giá cho mỗi sản phẩm.** Được ràng buộc ở tầng database bằng
  `@@unique([userId, productId])` trên `Review` (migration `20260912140540_add_review_user_product_unique`).
  Lần thử thứ hai trả về 409, không âm thầm ghi đè.
- **BR-R03 — Chỉ tác giả mới được ghi.** Sửa và xóa yêu cầu `Review.userId = activeUserId`.
  `reviewId` của người khác trả về 404, không bao giờ là 403.
- **BR-R04 — Giới hạn rating.** `rating` là số nguyên từ 1 đến 5; `content` bắt buộc và
  không được rỗng. Được kiểm tra ở tầng DTO, không phải bằng constraint của DB.
- **BR-R05 — Đọc công khai.** Danh sách được đánh dấu `@IsPublicApi()` và chỉ trả về tên hiển thị
  và avatar của tác giả — không bao giờ lộ email, số điện thoại hay trạng thái tài khoản.
- **BR-R06 — Không xóa mềm.** `Review` không có cột `deletedAt`; xóa luôn là hard delete.

## 6. Màn hình

N/A — đây là tính năng nền, không có màn hình cho người dùng. Đây là backend API dạng headless — xem
tham chiếu `(ROUTE###)` ở § 4 Yêu cầu, trong `technical-spec.md § 2`, cho bốn route sở hữu, thay cho mã màn hình.

### Hành trình người dùng

1. Khách (hoặc bất kỳ người gọi nào) đọc đánh giá của sản phẩm trước khi quyết định mua — không cần đăng nhập.
2. Sau khi nhận được đơn hàng đã giao cho sản phẩm đó, người mua viết một đánh giá về nó.
3. Người mua có thể sau đó sửa hoặc xóa đúng đánh giá đó; họ không bao giờ có được đánh giá thứ hai cho
   cùng một sản phẩm.

## 7. User Stories

### US081_ViewProductReviews — Xem đánh giá sản phẩm

**Tác nhân:** Khách mua hàng
**Mục tiêu:** Đọc xem những người mua khác nói gì về sản phẩm trước khi quyết định mua.
**Giá trị nghiệp vụ:** Bằng chứng xã hội đã được xác minh mua hàng giúp tăng niềm tin và tỷ lệ chuyển đổi của người mua.

**Tiêu chí chấp nhận:**
- [ ] Không cần xác thực.
- [ ] Đánh giá của `productId` được yêu cầu trả về mới nhất trước, có phân trang.
- [ ] Tác giả mỗi đánh giá chỉ hiển thị tên hiển thị và avatar.

### US082_CreateReview — Tạo đánh giá

**Tác nhân:** Người mua đã xác minh
**Mục tiêu:** Chia sẻ rating và nhận xét bằng văn bản cho sản phẩm mình đã nhận.
**Giá trị nghiệp vụ:** Tăng số lượng đánh giá đáng tin cậy để những người mua khác tham khảo.

**Tiêu chí chấp nhận:**
- [ ] Từ chối bằng 403 trừ khi người gọi có đơn hàng `DELIVERED` chứa sản phẩm đó.
- [ ] Từ chối bằng 409 nếu người gọi đã đánh giá sản phẩm này rồi.
- [ ] `rating` phải là số nguyên từ 1 đến 5; `content` phải không rỗng.

### US083_UpdateReview — Cập nhật đánh giá

**Tác nhân:** Người mua đã xác minh
**Mục tiêu:** Sửa hoặc cập nhật đánh giá của chính mình.
**Giá trị nghiệp vụ:** Giữ phản hồi của người mua luôn chính xác theo thời gian, không phải xóa rồi
tạo lại.

**Tiêu chí chấp nhận:**
- [ ] Chỉ tác giả đánh giá mới sửa được — đánh giá của người khác trả về 404.

### US084_DeleteReview — Xóa đánh giá

**Tác nhân:** Người mua đã xác minh
**Mục tiêu:** Xóa hẳn đánh giá của chính mình.
**Giá trị nghiệp vụ:** Cho phép người mua rút lại phản hồi mà họ không còn đồng ý nữa.

**Tiêu chí chấp nhận:**
- [ ] Luôn là hard delete — không có cách hoàn tác.
- [ ] Chỉ tác giả đánh giá mới xóa được — đánh giá của người khác trả về 404.

## 8. Kịch bản

### US081_ViewProductReviews — Happy Path

**Given** một sản phẩm có 3 đánh giá, **When** một khách không có token xác thực liệt kê đánh giá cho sản phẩm đó,
**Then** cả 3 đánh giá được trả về mới nhất trước, mỗi đánh giá chỉ hiển thị tên và avatar của tác giả.

### US082_CreateReview — Happy Path

**Given** người mua có đơn hàng `DELIVERED` chứa sản phẩm, **When** họ gửi đánh giá
với `rating: 5` và nội dung không rỗng, **Then** đánh giá được tạo và trả về kèm thông tin tác giả đính kèm.

### US082_CreateReview — Lỗi: chưa mua hàng

**Given** người gọi không có đơn hàng `DELIVERED` cho sản phẩm, **When** họ cố tạo đánh giá,
**Then** request bị từ chối bằng 403, và không có dòng `Review` nào được ghi.

### US082_CreateReview — Lỗi: đánh giá trùng lặp

**Given** người gọi đã đánh giá sản phẩm rồi, **When** họ cố đánh giá lại lần nữa, **Then** request
bị từ chối bằng 409, và đánh giá cũ vẫn giữ nguyên.

## 9. Trường hợp biên

| Kịch bản | Điều gì xảy ra | Thông báo cho người dùng |
|----------|--------------|----------------------|
| `productId`/`reviewId` không phải UUID hợp lệ | Bị từ chối trước khi tra cứu bất cứ gì | Lỗi validation nêu tên field |
| `rating` nằm ngoài 1–5, hoặc không phải số nguyên | Bị từ chối trước khi tra cứu bất cứ gì | Lỗi validation nêu tên field |
| Sản phẩm không tồn tại, đã bị xóa, hoặc chưa publish | Tạo bị từ chối | 404 "Product not found." |
| Người gọi không có đơn hàng `DELIVERED` chứa sản phẩm | Tạo bị từ chối | 403 "You can only review a product you have received." |
| Người gọi đã đánh giá sản phẩm rồi | Tạo bị từ chối, đánh giá cũ không đổi | 409 "You have already reviewed this product." |
| Đánh giá thuộc về người khác (sửa/xóa) | Coi như không tồn tại | 404 "Review not found." |
| Hai lần tạo gần như đồng thời cho cùng (user, product) | Unique constraint của DB chỉ cho đúng một request qua | Request thứ hai được map từ lỗi unique-violation của Prisma thành 409 |

## 10. Hành vi biên cần kiểm tra

- **BR-R01** → Xác nhận người gọi có đơn hàng ở trạng thái khác `DELIVERED` (ví dụ
  `PENDING_DELIVERY`) vẫn bị từ chối bằng 403 khi tạo đánh giá.
- **BR-R02** → Xác nhận hai lệnh gọi tạo gần như đồng thời cho cùng (user, product) không bao giờ
  cùng thành công — chỉ đúng một đánh giá tồn tại.
- **BR-R05** → Xác nhận thông tin tác giả trong danh sách công khai không bao giờ có email, số điện thoại, hay
  trạng thái tài khoản, chỉ có tên hiển thị và avatar.

## 11. Rủi ro & Vấn đề đã biết

| ID | Loại | Mô tả | Ảnh hưởng | Trạng thái |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | Không có xếp hạng tổng hợp nào hiển thị trên read model của `Product` — danh sách/chi tiết sản phẩm của F007 không hiện rating trung bình. | Người mua phải mở riêng danh sách đánh giá để ước lượng mức độ hài lòng chung; bản thân catalog sản phẩm không mang tín hiệu rating nào. | confirmed — đã xác định rõ là ngoài phạm vi theo `spec/F013-review.md` |

## 12. Phụ thuộc

| Phụ thuộc | Loại | Vì sao tính năng này cần nó | Bằng chứng |
|------------|------|-----------------------------|----------|
| F012_OrderPlacement | feature | Xác minh mua hàng (BR-R01) đọc đơn hàng `DELIVERED` của tính năng này và quan hệ `Order.products` được điền lúc checkout. | BR-R01 |
| F007_PublicProductBrowsing | feature | Dùng lại đúng điều kiện publish/xóa-mềm để quyết định một sản phẩm có đánh giá được hay không. | Bảng Trường hợp biên |

## 13. Cấu hình

```text
DEFAULT_PAGE_INDEX = 1     # review list starts at page 1 when no pageIndex is supplied
DEFAULT_PAGE_SIZE = 10     # number of reviews returned per page when no pageSize is supplied
```
