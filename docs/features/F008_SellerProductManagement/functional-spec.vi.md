---
authored_by: rebuild-spec
---

# Functional Spec — F008_SellerProductManagement

**Priority**: P1
**Type**: ui
**Generated**: 2026-09-12

**Xem thêm:** [`technical-spec.vi.md`](./technical-spec.vi.md) — endpoint, trích dẫn Source, pseudocode,
các entity chính, và ghi DB, dành cho Dev/QA/SA.

**Truy vết:** F008 → N/A (headless API, không có màn hình) → US052, US053, US054, US055, US056 → N/A (không logic nền) → ROUTE053, ROUTE054, ROUTE055, ROUTE056, ROUTE057 → N/A (chưa tạo test case)

## 1. Tổng quan

**Vấn đề:** Seller tự vận hành danh mục của mình cần cách tạo và duy trì sản phẩm mà không
thấy hay sửa được tồn kho của seller khác.
**Giải pháp:** Giao diện quản lý sản phẩm dành cho seller, cho phép người gọi liệt kê, xem, tạo,
cập nhật và xóa sản phẩm do chính mình tạo; admin có thể thao tác trên sản phẩm của bất kỳ seller nào.
**Phạm vi:** Liệt kê/xem chi tiết sản phẩm của mình, tạo sản phẩm của mình, cập nhật sản phẩm của mình, xóa sản phẩm của mình
— tất cả giới hạn theo quyền sở hữu sản phẩm của người gọi.
**Ngoài phạm vi:** Duyệt danh mục công khai (đó là kết quả dành cho buyer của một
tính năng khác), và quản trị cấu trúc danh mục brand/category (thuộc các
tính năng khác dành cho admin).

**Tác nhân**

| Tác nhân | Mô tả | Mục tiêu chính |
|-------|--------------|---------------|
| Seller | Người gọi có role seller | Quản lý sản phẩm do chính mình tạo |
| Admin | Người gọi có role admin | Quản lý sản phẩm thay cho bất kỳ seller nào |

Tính năng này khác tính năng duyệt sản phẩm dành cho buyer — cùng dữ liệu sản phẩm,
nhưng khác actor và mục đích (quản lý sở hữu vs. khám phá).


## 2. Khả năng chức năng

| ID | Khả năng | Người dùng có thể làm gì | User Stories | Yêu cầu | Quy tắc kinh doanh | Màn hình |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Xem danh mục riêng | Liệt kê và xem sản phẩm do người gọi tạo (riêng admin thì xem được mọi sản phẩm) | US052, US053 | FR-001, FR-002, FR-201, FR-202, FR-203, FR-204, FR-601 | BR-001 | N/A |
| CAP-02 | Duy trì danh mục riêng | Tạo, cập nhật và xóa sản phẩm mà người gọi sở hữu | US054, US055, US056 | FR-301, FR-302, FR-303, FR-304, FR-305, FR-306 | BR-002, BR-003, BR-004, BR-005 | N/A |

## 3. Các quyết định mở

Không có — không còn xác nhận domain nào bỏ ngỏ.

## 4. Yêu cầu

### Nền tảng (0xx)

- **FR-001** Người gọi phải có session `Bearer` hợp lệ mới gọi được bất kỳ hành động manage-product nào.
- **FR-002** Role của người gọi phải có quyền manage-product (seller hoặc admin); role client
  bị chặn ngay, trước khi hệ thống kiểm tra quyền sở hữu.

### Xem danh mục riêng (2xx)

- **FR-201** Mặc định, list sản phẩm chỉ trả về sản phẩm do người gọi tạo.
- **FR-202** List hỗ trợ lọc theo tên, brand, category, khoảng giá và trạng thái
  publish, cùng với phân trang và sắp xếp.
- **FR-203** Xem chi tiết một sản phẩm trả về đầy đủ dữ liệu, gồm category và
  SKU.
- **FR-204** List hoặc xem sản phẩm do seller khác tạo sẽ bị từ chối, trừ khi
  người gọi là admin.

### Duy trì danh mục riêng (3xx)

- **FR-301** Tạo sản phẩm cần ít nhất một variant, và danh sách SKU gửi lên phải
  khớp chính xác với SKU sinh ra từ các variant đó.
- **FR-302** Tạo hoặc cập nhật sản phẩm yêu cầu mọi category được tham chiếu phải tồn tại và chưa bị
  xóa.
- **FR-303** Sản phẩm mới tạo được ghi nhận thuộc sở hữu của người tạo ra nó.
- **FR-304** Cập nhật sản phẩm sẽ thay toàn bộ liên kết category và đồng bộ lại danh sách SKU — SKU mới
  được tạo, SKU cũ được cập nhật, và SKU không còn xuất hiện thì bị xóa.
- **FR-305** Cập nhật hoặc xóa sản phẩm do seller khác tạo sẽ bị từ chối, trừ khi
  người gọi là admin.
- **FR-306** Xóa sản phẩm sẽ soft-delete sản phẩm cùng với các bản dịch và SKU của nó, trong một thao tác.

### Bảo mật (6xx)

- **FR-601** Admin bỏ qua hoàn toàn rào chắn quyền sở hữu, có thể xem, cập nhật hoặc xóa
  sản phẩm của bất kỳ seller nào.

## 5. Quy tắc kinh doanh

- Người gọi chỉ được liệt kê, xem, cập nhật hoặc xóa sản phẩm do chính mình tạo; riêng
  admin được miễn kiểm tra này. (BR-001)
- Tên các variant trong một sản phẩm phải là duy nhất, và giá trị option của từng variant cũng phải
  duy nhất. (BR-002)
- Danh sách SKU gửi lên phải khớp chính xác với SKU sinh từ các variant của sản phẩm — không
  thừa, không thiếu, không lệch giá trị. (BR-003)
- Mỗi category ID được tham chiếu khi tạo hoặc cập nhật sản phẩm phải tồn tại và chưa bị
  soft-delete. (BR-004)
- Xóa sản phẩm sẽ soft-delete luôn cả bản dịch và SKU trong cùng một thao tác. (BR-005)

## 6. Màn hình

N/A — đây là tính năng nền, không có màn hình cho người dùng. Đây là API backend headless — repo này không có UI
layer, và `docs/generated/screen-list.md` ghi rõ là "No data",
nên không có `SCR###` nào để trích dẫn. Việc truy vết đi qua các route sở hữu
tính năng này — năm route `/manage-product` — xem `technical-spec.md § 2 Action Index`.

## 7. User Stories

### US052_ListOwnProducts

**Tác nhân:** Seller
**Mục tiêu:** Liệt kê sản phẩm tôi tạo, để tôi quản lý danh mục sản phẩm của riêng mình.
**Giá trị kinh doanh:** Giúp seller theo dõi tồn kho của mình mà không thấy tồn kho người khác.

**Tiêu chí chấp nhận:**
- [ ] List mặc định chỉ trả về sản phẩm do người gọi tạo.
- [ ] Admin có thể xem sản phẩm của bất kỳ seller nào qua cùng endpoint.
- [ ] List hỗ trợ lọc và phân trang.

### US053_ViewOwnProductDetail

**Tác nhân:** Seller
**Mục tiêu:** Xem đầy đủ chi tiết sản phẩm tôi tạo, để kiểm tra lại dữ liệu.
**Giá trị kinh doanh:** Giúp seller xác nhận đúng thông tin đang hiển thị trước khi sửa.

**Tiêu chí chấp nhận:**
- [ ] Xem sản phẩm do người gọi sở hữu sẽ trả về đầy đủ chi tiết (category, SKU, brand).
- [ ] Xem sản phẩm do seller khác tạo sẽ bị từ chối, trừ khi người gọi là admin.

### US054_CreateProduct

**Tác nhân:** Seller
**Mục tiêu:** Tạo sản phẩm mới để đăng bán.
**Giá trị kinh doanh:** Giúp seller thêm hàng vào danh mục dưới quyền sở hữu của chính mình.

**Tiêu chí chấp nhận:**
- [ ] Sản phẩm mới được ghi nhận với người gọi là người tạo.
- [ ] SKU gửi lên phải khớp chính xác với SKU sinh ra từ các variant đã gửi.
- [ ] Mỗi category được tham chiếu phải tồn tại và chưa bị xóa.

### US055_UpdateOwnProduct

**Tác nhân:** Seller
**Mục tiêu:** Cập nhật sản phẩm tôi tạo để thông tin luôn chính xác.
**Giá trị kinh doanh:** Giữ danh mục của seller luôn cập nhật mà không đụng đến sản phẩm của người khác.

**Tiêu chí chấp nhận:**
- [ ] Cập nhật sản phẩm do người gọi sở hữu sẽ thành công và đồng bộ lại danh sách category, SKU.
- [ ] Cập nhật sản phẩm do seller khác tạo sẽ bị từ chối, trừ khi người gọi là admin.

### US056_DeleteOwnProduct

**Tác nhân:** Seller
**Mục tiêu:** Xóa sản phẩm tôi tạo để nó không còn được rao bán.
**Giá trị kinh doanh:** Giúp seller ngừng bán hàng tồn kho của mình mà không cần admin can thiệp.

**Tiêu chí chấp nhận:**
- [ ] Xóa sản phẩm do người gọi sở hữu sẽ soft-delete sản phẩm, bản dịch và SKU của nó.
- [ ] Xóa sản phẩm do seller khác tạo sẽ bị từ chối, trừ khi người gọi là admin.

## 8. Kịch bản

### US052_ListOwnProducts — Happy Path

**Given** một seller đã tạo 3 sản phẩm, **When** họ gọi manage-product list không
có filter nào, **Then** họ thấy đúng 3 sản phẩm của mình, có phân trang.

### US052_ListOwnProducts — Lỗi: không có quyền vào module

**Given** người gọi có role client, **When** họ gọi manage-product list, **Then** request
bị từ chối trước khi đọc bất kỳ dữ liệu sản phẩm nào.

### US053_ViewOwnProductDetail — Happy Path

**Given** một seller sở hữu một sản phẩm, **When** họ xem chi tiết sản phẩm đó theo ID, **Then** họ nhận
được đầy đủ dữ liệu, gồm category và SKU.

### US053_ViewOwnProductDetail — Lỗi: xem sản phẩm của seller khác

**Given** một seller không sở hữu sản phẩm được yêu cầu, **When** họ xem chi tiết sản phẩm đó theo ID,
**Then** request bị từ chối.

### US054_CreateProduct — Happy Path

**Given** một seller gửi sản phẩm hợp lệ với variant và SKU khớp nhau, **When** họ tạo
sản phẩm, **Then** sản phẩm được tạo ra và thuộc sở hữu của người gọi.

### US054_CreateProduct — Lỗi: SKU không khớp

**Given** một seller gửi SKU không khớp với variant đã khai báo, **When** họ tạo
sản phẩm, **Then** request bị từ chối trước khi có bất kỳ thứ gì được ghi xuống.

### US055_UpdateOwnProduct — Happy Path

**Given** một seller sở hữu một sản phẩm, **When** họ gửi cập nhật với danh sách category và
SKU đã thay đổi, **Then** category và SKU của sản phẩm được đồng bộ lại đúng theo dữ liệu gửi lên.

### US055_UpdateOwnProduct — Lỗi: cập nhật sản phẩm của seller khác

**Given** một seller không sở hữu sản phẩm đang cập nhật, **When** họ gửi cập nhật,
**Then** request bị từ chối.

### US056_DeleteOwnProduct — Happy Path

**Given** một seller sở hữu một sản phẩm, **When** họ xóa sản phẩm đó, **Then** sản phẩm, các
bản dịch và SKU của nó đều bị soft-delete cùng lúc.

### US056_DeleteOwnProduct — Lỗi: xóa sản phẩm của seller khác

**Given** một seller không sở hữu sản phẩm đang xóa, **When** họ cố xóa sản phẩm đó,
**Then** request bị từ chối.

## 9. Trường hợp đặc biệt

| Kịch bản | Điều xảy ra | Thông báo cho người dùng |
|----------|--------------|----------------------|
| Người gọi role client gọi bất kỳ endpoint manage-product nào | Bị từ chối trước khi kiểm tra quyền sở hữu — allowlist module của role đó không có tính năng này | "You do not have permission to access this resource." |
| Seller request, cập nhật hoặc xóa sản phẩm do seller khác sở hữu | Kiểm tra quyền sở hữu chạy sau bước chặn module, và từ chối request | "You do not have permission to interact with this product." |
| Seller tạo sản phẩm với SKU không khớp variant | Bị từ chối trước khi ghi database | "The number of SKUs does not match the correctly generated SKUs." (hoặc thông báo lệch giá trị tương ứng) |
| Seller tạo hoặc cập nhật sản phẩm tham chiếu category đã xóa hoặc không tồn tại | Bị từ chối trước khi ghi sản phẩm | "Some categories do not exist or are deleted." |
| Seller cập nhật hoặc xóa một product ID không tồn tại (hoặc đã bị xóa) | Tra cứu thất bại, request bị từ chối | "Product not found." |
| Seller gửi tên variant trùng lặp, hoặc option trùng lặp trong cùng một variant | Bị từ chối trước khi ghi database | "All variant names must be unique. Duplicate variant names are not allowed." (hoặc thông báo tương ứng cho option) |

## 10. Hành vi cần xác minh thêm

- **FR-201** → Xác nhận tài khoản seller mới, chưa có sản phẩm nào, sẽ thấy list trống chứ không lẫn dữ liệu của seller khác.
- **FR-204** → Xác nhận seller xem sản phẩm của seller khác theo ID sẽ bị từ chối, còn admin xem cùng sản phẩm đó thì thành công.
- **FR-301** → Xác nhận request tạo với tập SKU không khớp tập sinh ra tự động sẽ bị từ chối trước khi ghi bất kỳ row nào.
- **FR-304** → Xác nhận cập nhật xóa một SKU khỏi danh sách gửi lên thì SKU đó bị xóa, và
  thêm một giá trị mới thì SKU đó được tạo.
- **FR-306** → Xác nhận xóa sản phẩm sẽ soft-delete cả bản dịch và SKU trong cùng một thao tác, không chỉ riêng row sản phẩm.

## 11. Rủi ro & Vấn đề đã biết

| ID | Loại | Mô tả | Tác động | Trạng thái |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | Filter `isPublic` của endpoint list được thiết kế để hiểu là "không lọc" khi người gọi bỏ trống (comment trong code ghi "get all products if not specified"), nhưng hàm biến đổi giá trị lại ép input rỗng/không phải string thành literal boolean `false` thay vì để `undefined`. Query list sau đó rơi vào nhánh `isPublic === false`, loại bỏ luôn các sản phẩm đã publish khỏi list mặc định, thay vì trả về toàn bộ sản phẩm seller sở hữu. | Seller gọi endpoint list mà không set `isPublic` sẽ thấy ít sản phẩm hơn số họ thực có — các sản phẩm đã publish bị loại âm thầm. | [UNVERIFIED] — quan sát được trong code, chưa xác nhận qua response thực tế |

## 12. Phụ thuộc

| Phụ thuộc | Loại | Tại sao tính năng này cần nó | Bằng chứng |
|------------|------|-----------------------------|----------|
| F002_BrandCatalogManagement | feature | `brandId` của sản phẩm phải tham chiếu một row brand đang tồn tại | FR-301 |
| F003_CategoryCatalogManagement | feature | Mỗi category ID khi create/update phải tồn tại và chưa bị xóa (BR-004) | FR-302 |

## 13. Cấu hình

N/A — tính năng này không có hằng số cấu hình nào hướng đến người dùng.
