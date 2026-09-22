---
authored_by: doc-writer
---

# Functional Spec — F011_ShoppingCart

**Priority**: P0
**Type**: ui
**Generated**: 2026-09-12

**See also:** [`technical-spec.vi.md`](./technical-spec.vi.md) — endpoint, trích dẫn nguồn, pseudocode,
entity chính, và các thao tác ghi DB, dành cho Dev/QA/SA.

**Truy vết:** F011 → N/A (headless API — không có màn hình) → US070, US071, US072, US073 → N/A (không có background logic) → ROUTE071, ROUTE072, ROUTE073, ROUTE074 → N/A (chưa sinh test case)

## 1. Tổng quan

**Vấn đề:** Người mua tìm được sản phẩm nhưng chưa có chỗ giữ lại trước khi quyết định đặt hàng.
**Giải pháp:** Một giỏ hàng riêng cho từng user gồm các dòng `(SKU, quantity)`, tồn tại xuyên suốt
giữa các phiên và là đầu vào duy nhất cho phần checkout của F012.
**Phạm vi:** liệt kê / thêm / cập nhật số lượng / xóa các dòng giỏ hàng của chính mình.
**Ngoài phạm vi:** checkout và trừ tồn kho (F012); tính giá hoặc khuyến mãi (Prisma không hỗ trợ);
giỏ hàng khách vãng lai (`CartItem.userId` không nullable — mọi dòng luôn thuộc về một user đã
đăng nhập).

**Tác nhân**

| Tác nhân | Mô tả | Mục tiêu chính |
|-------|--------------|---------------|
| Người mua đã xác thực | Bất kỳ user nào đã đăng nhập (client/seller/admin) | Giữ lại SKU mà họ định mua cho đến khi sẵn sàng checkout |

Tính năng này không thuộc luồng liên-tính-năng nào — chưa có artifact `flows/*.md` nào. Nó là đầu
vào trực tiếp cho hành động checkout của F012_OrderPlacement.

## 2. Năng lực chức năng

| ID | Năng lực | Người dùng có thể làm gì | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Quản lý giỏ hàng của mình | Liệt kê, thêm, chỉnh số lượng, và xóa dòng trong giỏ hàng của chính mình | US070, US071, US072, US073 | FR-001, FR-201, FR-202, FR-203, FR-204 | BR-C01, BR-C02, BR-C03, BR-C04, BR-C05 | N/A — headless API, không có screen |

## 3. Quyết định còn treo

Không có — không có xác nhận domain nào còn treo (`clarifications.md` § Cart đã được giải quyết
hoàn toàn).

## 4. Requirements

### Nền tảng (0xx)

- **FR-001** Mọi thao tác đọc và ghi giỏ hàng đều giới hạn trong các dòng `CartItem` của chính
  người gọi — không route nào nhận user id đích.

### Quản lý giỏ hàng (2xx)

- **FR-201** Người gọi có thể liệt kê các dòng giỏ hàng của mình, mỗi dòng kèm SKU và sản phẩm cha,
  có phân trang.
- **FR-202** Người gọi có thể thêm một SKU vào giỏ; nếu SKU đó đã có trong giỏ, số lượng của dòng
  hiện có sẽ tăng thêm thay vì tạo dòng thứ hai.
- **FR-203** Người gọi có thể đặt trực tiếp số lượng của một dòng giỏ hàng của mình (không chỉ là
  cộng dồn).
- **FR-204** Người gọi có thể xóa một dòng giỏ hàng của mình.

## 5. Business Rules

- **BR-C01 — Quyền sở hữu.** Mọi thao tác đọc và ghi đều giới hạn theo `CartItem.userId =
  activeUserId`. `cartItemId` của user khác trả về 404, không bao giờ 403 — sự tồn tại của dòng đó
  không bao giờ được xác nhận cho người gọi không sở hữu nó.
- **BR-C02 — Chỉ SKU thêm được.** SKU phải tồn tại, chưa bị soft-delete, và sản phẩm cha của nó
  phải chưa bị soft-delete và đã publish (`publishedAt` khác null và không ở tương lai) — cùng
  điều kiện hiển thị mà danh sách sản phẩm công khai (F007) đã áp dụng.
- **BR-C03 — Trần tồn kho.** Số lượng kết quả phải nằm trong khoảng từ 1 đến `SKU.stock`. Tồn kho
  chỉ được kiểm tra ở đây, chưa bao giờ được giữ chỗ — việc giữ chỗ diễn ra khi tạo order (F012).
- **BR-C04 — Một dòng cho mỗi SKU.** Thêm một SKU đã có trong giỏ sẽ tăng số lượng dòng hiện có
  thay vì tạo dòng thứ hai. Được enforce ở mức database bằng `@@unique([userId, skuId])` trên
  `CartItem` (migration `20260912140523_add_cart_item_user_sku_unique`), nên thao tác thêm trùng
  đồng thời không thể tách dòng thành hai bản ghi.
- **BR-C05 — Không soft delete.** `CartItem` không có cột `deletedAt`; xóa luôn là hard delete.

## 6. Screens

N/A — tính năng nền, không có màn hình hướng tới người dùng. Đây là backend API dạng headless —
xem tham chiếu `(ROUTE###)` ở § 4 Requirements trong `technical-spec.md § 2` để biết bốn route sở
hữu, thay cho mã screen.

### Hành trình người dùng

1. Người gọi đã đăng nhập liệt kê giỏ hàng của mình để xem những gì đã có trong đó.
2. Người gọi thêm một SKU muốn mua; nếu đã có trong giỏ, số lượng của nó tăng lên thay vì xuất
   hiện một dòng trùng.
3. Người gọi chỉnh trực tiếp số lượng của một dòng, hoặc xóa hẳn nó, bất cứ lúc nào trước khi
   checkout (F012).

## 7. User Stories

### US070_ViewCartList — Xem danh sách giỏ hàng

**Actor:** Người mua đã xác thực
**Mục tiêu:** Xem những gì hiện có trong giỏ hàng của chính mình.
**Giá trị nghiệp vụ:** Cho phép người mua rà lại ý định mua trước khi chốt checkout.

**Tiêu chí nghiệm thu:**
- [ ] Chỉ trả về các dòng `CartItem` của chính người gọi, có phân trang.
- [ ] Mỗi dòng kèm SKU và tóm tắt sản phẩm cha của SKU đó.

### US071_AddCartItem — Thêm mục vào giỏ hàng

**Actor:** Người mua đã xác thực
**Mục tiêu:** Thêm một SKU muốn mua vào giỏ hàng.
**Giá trị nghiệp vụ:** Ghi nhận ý định mua mà không buộc phải chốt order ngay.

**Tiêu chí nghiệm thu:**
- [ ] SKU chưa có trong giỏ sẽ tạo dòng mới.
- [ ] SKU đã có trong giỏ sẽ tăng số lượng dòng hiện có thay vì nhân đôi.
- [ ] Thêm vượt quá `SKU.stock` bị từ chối với 400, và không ghi gì cả.
- [ ] SKU bị thiếu, đã xóa, hoặc thuộc sản phẩm chưa publish bị từ chối với 404.

### US072_UpdateCartItemQuantity — Cập nhật số lượng mục trong giỏ hàng

**Actor:** Người mua đã xác thực
**Mục tiêu:** Đặt chính xác số lượng SKU mà họ muốn.
**Giá trị nghiệp vụ:** Cho phép người mua sửa số lượng mà không cần xóa rồi thêm lại dòng.

**Tiêu chí nghiệm thu:**
- [ ] Số lượng mới thay thế hẳn số lượng của dòng (không cộng dồn).
- [ ] Số lượng vượt `SKU.stock` bị từ chối với 400.
- [ ] Dòng giỏ hàng của user khác trả về 404, không phải 403.

### US073_RemoveCartItem — Xóa mục khỏi giỏ hàng

**Actor:** Người mua đã xác thực
**Mục tiêu:** Bỏ hẳn một dòng ra khỏi giỏ hàng.
**Giá trị nghiệp vụ:** Cho phép người mua loại bỏ một ý định mua không còn muốn nữa, không để nó
tồn đọng.

**Tiêu chí nghiệm thu:**
- [ ] Dòng bị hard-delete — không có đường undo/soft-delete nào.
- [ ] Dòng giỏ hàng của user khác trả về 404, không phải 403.

## 8. Kịch bản

### US071_AddCartItem — Happy Path

**Given** một SKU còn hàng và sản phẩm của nó đã publish, **When** một người gọi đã xác thực thêm
nó vào giỏ lần đầu, **Then** một dòng giỏ hàng mới được tạo với số lượng yêu cầu.

### US071_AddCartItem — Thêm trùng thì tăng số lượng

**Given** người gọi đã có 2 của một SKU trong giỏ, **When** họ thêm 1 nữa cùng SKU đó, **Then**
số lượng của dòng hiện có trở thành 3 — không có dòng thứ hai được tạo.

### US071_AddCartItem — Lỗi: vượt tồn kho

**Given** một SKU còn 5 trong kho và người gọi đã giữ 3 trong giỏ, **When** họ cố thêm 3 nữa,
**Then** request bị từ chối với 400 kèm tên số tồn kho khả dụng, và không có gì được ghi.

### US073_RemoveCartItem — Lỗi: dòng của user khác

**Given** một dòng giỏ hàng thuộc về user khác, **When** người gọi cố xóa nó theo id, **Then**
trả về 404, không phải 403 — người gọi không thể biết được dòng đó tồn tại.

## 9. Edge Cases

| Tình huống | Điều gì xảy ra | Thông báo hiển thị cho user |
|----------|--------------|----------------------|
| `skuId`/`cartItemId` không phải UUID hợp lệ | Bị từ chối trước khi tra cứu | Lỗi validation nêu tên field |
| SKU bị thiếu, đã soft-delete, hoặc sản phẩm của nó chưa publish | Việc thêm bị từ chối | "SKU not found." |
| Số lượng kết quả vượt `SKU.stock` | Thêm/cập nhật bị từ chối, không ghi gì | "Only {stock} left in stock for this SKU." |
| `quantity < 1` | Bị từ chối trước khi tra cứu | "Quantity must be at least 1." |
| Dòng giỏ hàng thuộc về user khác (update/delete/read-by-id) | Coi như không tồn tại | 404 "Cart item not found." |
| Hai lần thêm đồng thời cùng một SKU mới | Ràng buộc unique của DB (`@@unique([userId, skuId])`) ngăn tách dòng | Chỉ còn một dòng với số lượng gộp |

## 10. Hành vi biên cần kiểm chứng

- **BR-C03** → Xác nhận việc thêm hoặc cập nhật vượt `SKU.stock` bị từ chối với 400 và không ghi
  gì, cho cả dòng mới lẫn dòng đã tồn tại.
- **BR-C04** → Xác nhận hai lệnh "thêm SKU này" gần như đồng thời của cùng user/SKU không bao giờ
  tạo ra hai dòng `CartItem`.
- **BR-C01** → Xác nhận mọi thao tác GET/PUT/DELETE nhắm vào `cartItemId` của user khác đều trả về
  404, không bao giờ 403.

## 11. Rủi ro & Vấn đề đã biết

| ID | Loại | Mô tả | Tác động | Trạng thái |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | Tồn kho được kiểm tra, không được giữ chỗ, tại thời điểm thêm/cập nhật số lượng. Giữa lúc thêm vào giỏ và checkout (F012), cùng một tồn kho có thể bị một lượt checkout khác của người mua khác chiếm mất. | Một dòng giỏ hàng có thể vượt qua kiểm tra tồn kho của chính nó nhưng vẫn thất bại khi checkout nếu tồn kho hết giữa chừng. | confirmed (thiết kế chủ đích — checkout kiểm tra lại, theo F012 BR-O02) |

## 12. Dependencies

| Dependency | Loại | Vì sao tính năng này cần nó | Bằng chứng |
|------------|------|-----------------------------|----------|
| F007_PublicProductBrowsing | feature | Dùng lại cùng điều kiện hiển thị publish/soft-delete (`publishedProductWhere()`) để quyết định SKU nào thêm được. | BR-C02 |
| F012_OrderPlacement | feature | Các dòng giỏ hàng của tính năng này là đầu vào duy nhất mà `cartItemIds` dùng khi checkout; checkout xóa các dòng đã tiêu thụ. | § 1 Tổng quan |

## 13. Configuration

```text
DEFAULT_PAGE_INDEX = 1     # cart list starts at page 1 when no pageIndex is supplied
DEFAULT_PAGE_SIZE = 10     # number of cart lines returned per page when no pageSize is supplied
```
</content>
