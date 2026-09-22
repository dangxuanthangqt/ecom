---
authored_by: doc-writer
---

# Functional Spec — F012_OrderPlacement

**Độ ưu tiên**: P0
**Loại**: mixed
**Được tạo ra**: 2026-09-12

**Xem thêm:** [`technical-spec.vi.md`](./technical-spec.vi.md) — endpoint, trích dẫn nguồn, pseudocode,
các entity chính và các thao tác ghi DB, dành cho Dev/QA/SA.

**Truy vết:** F012 → N/A (headless API — không có màn hình) → US074, US075, US076, US077, US078, US079, US080 → N/A (không có logic nền) → ROUTE075, ROUTE076, ROUTE077, ROUTE078, ROUTE079, ROUTE080, ROUTE081 → N/A (chưa sinh test case)

## 1. Tổng quan

**Vấn đề:** Một giỏ hàng đầy không tự nhiên trở thành một cam kết mua — không có bản ghi nào cho biết đã mua gì, giá bao nhiêu, hay giao hàng tới đâu rồi.
**Giải pháp:** Checkout chuyển các dòng cart đã chọn thành một order cho mỗi seller, đóng băng tên sản phẩm, giá, ảnh, giá trị SKU và số lượng vào các hàng `ProductSKUSnapshot` để sau này catalog có sửa cũng không viết lại được lịch sử, đồng thời trừ stock trong cùng transaction. Buyer tự theo dõi và hủy order của mình; seller/admin theo dõi và chuyển trạng thái các order có chạm tới sản phẩm của họ.
**Phạm vi:** đặt order (checkout), xem list/detail order của chính buyer, buyer hủy order, seller/admin xem và chuyển trạng thái order.
**Ngoài phạm vi:** thanh toán (payment, để sau — xem `clarifications.md`); địa chỉ giao hàng và phí ship (không có model Prisma); xử lý trả hàng ngoài việc set trạng thái `RETURNED`; seller phản hồi hay nhắn tin (F013 chỉ bao review, không có chat buyer-seller).

**Tác nhân**

| Tác nhân | Mô tả | Mục tiêu chính |
|-------|--------------|---------------|
| Buyer | Bất kỳ user đã xác thực nào (client/seller/admin) checkout giỏ hàng của chính mình | Chuyển các dòng cart thành một order theo dõi được, hủy được |
| Seller | User đã xác thực có sản phẩm nằm trong order | Xem và chuyển trạng thái các order chứa sản phẩm của chính mình |
| Admin | Bất kỳ admin nào gọi API | Xem và chuyển trạng thái mọi order, giống seller nhưng không giới hạn |

Tính năng này lấy các dòng cart của F011_ShoppingCart làm đầu vào duy nhất cho checkout, và là phần F013_ProductReviews dựa vào để xác định điều kiện review theo lịch sử mua hàng.

## 2. Khả năng chức năng

| ID | Khả năng | Người dùng có thể làm gì | User Stories | Yêu cầu | Quy tắc kinh doanh | Màn hình |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Vòng đời Order của Buyer | Xem list/detail order của mình, checkout các dòng cart đã chọn thành order theo từng seller, hủy order của mình khi còn ở trạng thái chờ xác nhận | US074, US075, US076, US077 | FR-001, FR-201, FR-202, FR-203, FR-204 | BR-O01, BR-O02, BR-O03, BR-O04, BR-O06, BR-O07, BR-O08 | N/A — headless API, không có màn hình |
| CAP-02 | Quản lý Order của Seller/Admin | Xem list/detail order mà mình có quyền thấy, chuyển trạng thái order theo đúng vòng đời hợp lệ | US078, US079, US080 | FR-301, FR-302 | BR-O05, BR-O06 | N/A — headless API, không có màn hình |

## 3. Quyết định mở

Không có — không còn xác nhận nghiệp vụ nào bỏ ngỏ. `clarifications.md` ghi lại cả các quyết định trong blueprint ban đầu lẫn hai quyết định bổ sung sau đó (migration `ProductSKUSnapshot.quantity` và việc điền quan hệ ngầm `Order.products` lúc checkout).

## 4. Yêu cầu

### Nền tảng (0xx)

- **FR-001** Mọi thao tác đọc/ghi order phía buyer chỉ giới hạn trong order của chính người gọi (`Order.userId`) — không route nào nhận id buyer khác làm target.

### Vòng đời Order của Buyer (2xx)

- **FR-201** Buyer có thể xem list order của chính mình, tùy chọn lọc theo trạng thái, có phân trang.
- **FR-202** Buyer có thể xem detail một order của mình, gồm cả các dòng snapshot đã đóng băng.
- **FR-203** Buyer có thể checkout một tập các dòng cart của mình; checkout tách thành một order cho mỗi seller và, trong cùng một transaction, trừ stock, đóng băng các dòng snapshot, và xóa các dòng cart đã dùng.
- **FR-204** Buyer có thể hủy order của mình khi order còn ở trạng thái `PENDING_CONFIRMATION`, và stock mà order đó đã trừ sẽ được hoàn lại.

### Quản lý Order của Seller/Admin (3xx)

- **FR-301** Seller/admin có thể xem list và detail các order mà họ có quyền thấy — seller chỉ thấy order chứa sản phẩm của chính mình, admin thấy tất cả.
- **FR-302** Seller/admin có thể chuyển trạng thái order theo đúng trình tự tuyến tính hợp lệ; một chuyển trạng thái không hợp lệ (kể cả hủy order, việc chỉ buyer mới được làm) sẽ bị từ chối.

## 5. Quy tắc kinh doanh

- **BR-O01 — Tách theo từng seller.** Các dòng cart đã chọn được nhóm theo `createdById` của sản phẩm (chính là seller). Mỗi nhóm tạo ra một `Order`. Một checkout gồm ba seller sẽ trả về ba order, mỗi order có trạng thái độc lập.
- **BR-O02 — Tạo mang tính nguyên tử.** Một transaction tương tác của Prisma thực hiện theo thứ tự:
  xác thực lại từng dòng cart và SKU của nó (còn tồn tại, chưa xóa, sản phẩm đã publish,
  `stock >= quantity`) → trừ `SKU.stock` → tạo các hàng `Order` → tạo các hàng
  `ProductSKUSnapshot` → xóa các dòng `CartItem` đã dùng. Bất kỳ bước nào lỗi cũng rollback toàn bộ checkout; không có order tạo dở dang.
- **BR-O03 — Snapshot, không join.** `ProductSKUSnapshot` sao chép `productName`, `price`, `images`,
  `skuValue` và `quantity` tại thời điểm mua. Khi đọc order, hệ thống trả về đúng các bản sao này chứ không phải dữ liệu sản phẩm hiện tại — giá đổi sau đó không được phép làm thay đổi một order đã xảy ra.
- **BR-O04 — Buyer hủy order.** Buyer chỉ được hủy order của chính mình, và chỉ khi order đang ở `PENDING_CONFIRMATION`. Hủy order sẽ set trạng thái `CANCELLED` và hoàn lại đúng số stock đã trừ, trong cùng transaction.
- **BR-O05 — Trình tự tuyến tính.** Seller/admin chỉ được chuyển trạng thái theo trình tự
  `PENDING_CONFIRMATION → PENDING_PICKUP → PENDING_DELIVERY → DELIVERED`, hoặc set `RETURNED` từ
  `DELIVERED`. Mọi chuyển trạng thái khác — đi lùi, bỏ qua một bước, hoặc xuất phát từ trạng thái cuối — đều bị từ chối với mã 400. Set `CANCELLED` qua route của seller/admin luôn bị từ chối; hủy order là việc chỉ buyer mới làm được.
- **BR-O06 — Quyền xem.** Buyer chỉ thấy order có `userId` là chính mình. Seller chỉ thấy order có dòng snapshot tham chiếu tới sản phẩm của mình (qua quan hệ m-n `Order.products`). Admin thấy tất cả. `orderId` thuộc về người khác trả về 404, không bao giờ trả 403.
- **BR-O07 — Dòng cart phải thuộc về người gọi.** Mỗi id trong `cartItemIds` phải thuộc về người gọi; chỉ cần một id không thỏa là toàn bộ request thất bại, chứ không âm thầm bỏ qua id đó.
- **BR-O08 — Trường audit.** `createdById`/`updatedById` được set theo đúng quy ước hiện có; `deletedAt` (xóa mềm) áp dụng cho `Order` như với các model xóa mềm khác.

## 6. Màn hình

N/A — tính năng nền; không có màn hình hướng người dùng. Đây là một API backend thuần —
xem các tham chiếu `(ROUTE###)` ở § 4 Yêu cầu của `technical-spec.md § 2` để biết bảy route sở hữu, thay cho mã màn hình.

### Hành trình người dùng

1. Buyer xem lại giỏ hàng (F011) và checkout các dòng đã chọn; hệ thống tách thành một order cho mỗi seller, trừ stock và đóng băng lại những gì đã mua.
2. Buyer theo dõi order của mình qua list/detail, và có thể hủy order khi nó vẫn đang chờ xác nhận.
3. Song song đó, seller (hoặc admin) thấy các order có chạm tới sản phẩm của mình và đẩy từng order tiến lên — đã xác nhận → đã lấy hàng → đang giao → đã giao — hoặc đánh dấu một order đã giao thành trả hàng.

## 7. User Stories

### US074_ViewOwnOrderList — Xem Danh sách Order của Mình

**Tác nhân:** Buyer
**Mục tiêu:** Xem các order mình đã đặt.
**Giá trị kinh doanh:** Giúp buyer theo dõi lịch sử mua hàng và trạng thái order hiện tại.

**Tiêu chí chấp nhận:**
- [ ] Chỉ trả về order có `userId` là chính người gọi, tùy chọn lọc theo trạng thái.
- [ ] Kết quả có phân trang.

### US075_ViewOwnOrderDetail — Xem Chi tiết Order của Mình

**Tác nhân:** Buyer
**Mục tiêu:** Xem chính xác một order của mình gồm những gì.
**Giá trị kinh doanh:** Cho buyer bản ghi cố định về những gì đã mua, không bị ảnh hưởng bởi thay đổi catalog sau này.

**Tiêu chí chấp nhận:**
- [ ] Trả về các dòng `ProductSKUSnapshot` của order đúng như lúc được ghi nhận khi mua.
- [ ] Id order của buyer khác trả về 404.

### US076_CheckoutCart — Checkout Giỏ hàng

**Tác nhân:** Buyer
**Mục tiêu:** Biến các dòng cart đã chọn thành một hoặc nhiều order thật.
**Giá trị kinh doanh:** Chuyển ý định xem/để trong giỏ thành một cam kết có thể thực hiện và theo dõi được.

**Tiêu chí chấp nhận:**
- [ ] Các dòng cart được nhóm theo seller; mỗi seller tạo ra một order.
- [ ] Stock bị trừ, các dòng snapshot được đóng băng, và các dòng cart đã dùng bị xóa — tất cả trong một transaction.
- [ ] Bất kỳ dòng cart nào không qua được validate (thiếu, thuộc user khác, không đủ stock) đều làm hỏng toàn bộ checkout — không có gì được ghi dở dang.

### US077_CancelOwnOrder — Hủy Order của Mình

**Tác nhân:** Buyer
**Mục tiêu:** Rút lại một order trước khi nó bắt đầu được xử lý.
**Giá trị kinh doanh:** Cho buyer một khoảng thời gian an toàn để sửa sai khi lỡ mua nhầm.

**Tiêu chí chấp nhận:**
- [ ] Chỉ hủy được khi `status = PENDING_CONFIRMATION`; trạng thái khác bị từ chối với 400.
- [ ] Hủy order hoàn lại đúng số stock mà các dòng snapshot của order đó đã trừ.

### US078_ViewManageOrderList — Xem Danh sách Order Quản lý

**Tác nhân:** Seller
**Mục tiêu:** Xem các order có chứa sản phẩm của mình.
**Giá trị kinh doanh:** Giúp seller biết mình cần xử lý những gì.

**Tiêu chí chấp nhận:**
- [ ] Seller chỉ thấy order có dòng snapshot tham chiếu tới sản phẩm do mình tạo.
- [ ] Admin thấy mọi order; người gọi là `client` không thể vào route này (403, chặn theo role).

### US079_ViewManageOrderDetail — Xem Chi tiết Order Quản lý

**Tác nhân:** Seller
**Mục tiêu:** Xem đầy đủ chi tiết một order để biết cần chuẩn bị/giao gì.
**Giá trị kinh doanh:** Cho seller mọi thông tin cần để xử lý một order cụ thể.

**Tiêu chí chấp nhận:**
- [ ] Phạm vi xem giống US078; order ngoài phạm vi trả về 404, không phải 403.

### US080_UpdateOrderStatus — Cập nhật Trạng thái Order

**Tác nhân:** Seller
**Mục tiêu:** Đẩy một order tiến lên khi xử lý.
**Giá trị kinh doanh:** Giữ cho trạng thái order mà buyer nhìn thấy luôn khớp với tiến độ xử lý thực tế.

**Tiêu chí chấp nhận:**
- [ ] Chỉ chấp nhận đúng trình tự tuyến tính hợp lệ (hoặc `DELIVERED → RETURNED`); còn lại đều trả 400, có nêu rõ trạng thái hiện tại và trạng thái yêu cầu.
- [ ] Cố set `CANCELLED` ở đây luôn bị từ chối — đó là việc chỉ buyer mới được làm.
- [ ] Một lần ghi trạng thái bị race với lần khác (dựa trên `currentStatus` đã cũ) bị từ chối với 409, không bị ghi đè âm thầm.

## 8. Kịch bản

### US076_CheckoutCart — Happy Path, tách theo seller

**Cho rằng** giỏ hàng của buyer có các dòng từ hai seller khác nhau, **Khi** họ checkout tất cả các dòng đó, **Thì** đúng hai order được tạo, mỗi order cho một seller, mỗi order chỉ chứa dòng của seller đó.

### US076_CheckoutCart — Lỗi: không đủ stock giữa lúc checkout

**Cho rằng** một trong các dòng cart không còn đủ stock, **Khi** buyer checkout, **Thì** toàn bộ checkout thất bại với 400 nêu rõ SKU đó, và không có order, snapshot hay thay đổi stock nào được ghi cho bất kỳ dòng nào.

### US077_CancelOwnOrder — Lỗi: order đã qua giai đoạn xác nhận

**Cho rằng** trạng thái order là `PENDING_PICKUP`, **Khi** buyer cố hủy order, **Thì** request bị từ chối với 400 — chỉ order đang `PENDING_CONFIRMATION` mới được hủy.

### US080_UpdateOrderStatus — Lỗi: chuyển trạng thái không hợp lệ

**Cho rằng** order đang ở `PENDING_CONFIRMATION`, **Khi** seller cố set thẳng nó thành `DELIVERED`, **Thì** request bị từ chối với 400 nêu rõ trạng thái hiện tại và trạng thái yêu cầu.

## 9. Trường hợp biên

| Kịch bản | Điều gì xảy ra | Thông báo hiển thị cho người dùng |
|----------|--------------|----------------------|
| `cartItemIds` rỗng hoặc chứa giá trị không phải UUID | Bị từ chối trước khi thực hiện bất kỳ lookup nào | Lỗi validate nêu tên trường |
| Một id dòng cart bị thiếu hoặc thuộc user khác | Toàn bộ checkout bị từ chối | 404 |
| Một SKU không còn đủ stock lúc checkout | Toàn bộ checkout bị từ chối, không ghi gì | 400 nêu rõ SKU và stock còn lại |
| Hủy một order không ở `PENDING_CONFIRMATION` | Bị từ chối | 400 "Only orders pending confirmation can be cancelled." |
| Chuyển trạng thái không hợp lệ (seller/admin) | Bị từ chối | 400 nêu rõ trạng thái hiện tại và trạng thái yêu cầu |
| Seller thao tác trên một order không có sản phẩm nào của mình | Coi như không tồn tại | 404 |
| Hai lần ghi của seller/admin race nhau trên cùng trạng thái order | Lần ghi thứ hai thua | 409 "Order status was changed by someone else in the meantime. Please retry." |
| Seller/admin cố set trạng thái thành `CANCELLED` | Luôn bị từ chối bất kể trạng thái hiện tại | 400 "Only the buyer may cancel an order." |

## 10. Hành vi biên cần xác minh

- **BR-O02** → Xác nhận một checkout thất bại giữa chừng (ví dụ SKU thứ hai trong ba SKU hết stock) để lại stock, `Order`, `ProductSKUSnapshot` và các hàng `CartItem` hoàn toàn không đổi.
- **BR-O04** → Xác nhận việc hủy order hoàn lại đúng số lượng mà mỗi dòng snapshot đã giữ, không phải một con số cố định/mặc định.
- **BR-O05** → Xác nhận mọi chuyển trạng thái nằm ngoài chuỗi tuyến tính (đi lùi, bỏ bước, hoặc xuất phát từ `RETURNED`/`CANCELLED`) đều bị từ chối, và `CANCELLED` không thể đạt được qua route này bất kể trạng thái hiện tại.
- **BR-O06** → Xác nhận một seller không có sản phẩm chung nào trong order sẽ nhận 404 ở cả list-detail lẫn update trạng thái cho order đó, không bao giờ 403.

## 11. Rủi ro & Vấn đề đã biết

| ID | Loại | Mô tả | Tác động | Trạng thái |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | `Product.createdById` không có index trong DB, nhưng phạm vi quyền xem của seller trong `ManageOrderService.buildActorScope` lại phụ thuộc vào nó thông qua join ngầm `_OrderToProduct` trên mỗi request của seller. | Truy vấn list/detail order của seller có thể chậm dần khi khối lượng `Product`/`Order` tăng lên. | confirmed — hoãn lại theo `clarifications.md` (phát hiện H2 của reviewer), chưa sửa trong lần này |
| RISK-02 | known-issue | Payment hiện chưa được làm — chưa có liên kết `PaymentTransaction` với `Order`; order ở `PENDING_CONFIRMATION` không bị chặn bởi bất kỳ tín hiệu thanh toán nào. | Trong codebase hiện tại, một order có thể được tạo và chuyển trạng thái mà không qua bước xác minh thanh toán nào. | confirmed — hoãn lại theo `clarifications.md` |

## 12. Sự phụ thuộc

| Sự phụ thuộc | Loại | Tại sao tính năng này cần nó | Bằng chứng |
|------------|------|-----------------------------|----------|
| F011_ShoppingCart | feature | Đầu vào duy nhất của checkout là các hàng `CartItem` của chính người gọi; các dòng đã dùng (bị xóa) sẽ biến mất sau đó. | BR-O01, BR-O02 |
| F007_PublicProductBrowsing | feature | Tái dùng lại điều kiện hợp lệ của sản phẩm (đã publish, chưa xóa) khi xác thực lại các dòng cart lúc checkout. | BR-O02 |
| F013_ProductReviews | feature (downstream) | Xác minh mua hàng của F013 (BR-R01) đọc các order `DELIVERED` của tính năng này và quan hệ `Order.products` mà tính năng này điền vào. | § 1 Overview |

## 13. Cấu hình

```text
DEFAULT_PAGE = 1     # order list starts at page 1 when no page is supplied
DEFAULT_PAGE_SIZE = 10     # number of orders returned per page when no pageSize is supplied
CHECKOUT_TRANSACTION_TIMEOUT_MS = 15000   # extended interactive-transaction timeout for multi-line, multi-seller checkout
```
