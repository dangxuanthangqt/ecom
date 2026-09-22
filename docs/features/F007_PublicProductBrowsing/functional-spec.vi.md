---
authored_by: rebuild-spec
---

# Mô tả chức năng — F007_PublicProductBrowsing

**Độ ưu tiên**: P1
**Loại**: ui
**Generated**: 2026-09-12

**Xem thêm:** [`technical-spec.vi.md`](./technical-spec.vi.md) — endpoint, trích dẫn nguồn, pseudocode,
entity chính, và ghi DB, dành cho Dev/QA/SA.

**Truy vết:** F007 → N/A (headless API — không có màn hình) → US050, US051 → N/A (không có logic nền) → ROUTE051, ROUTE052 → N/A (chưa sinh test case)

## 1. Tổng quan

**Vấn đề:** Một khách hàng tiềm năng — dù đã đăng ký tài khoản hay chưa — cần
xem có sản phẩm nào đang bán, thấy đủ chi tiết để quyết định có mua hay không, mà không bị bắt
đăng nhập trước.
**Giải pháp:** Hai endpoint chỉ đọc, ai cũng truy cập được — một danh sách sản phẩm có phân trang/lọc
và một endpoint tra chi tiết một sản phẩm — chỉ trả về sản phẩm mà người bán đã thực sự publish
và chưa bị xóa.
**Phạm vi:** Duyệt catalog công khai (danh sách có filter/sort/phân trang; chi tiết một sản phẩm
gồm brand, category, translation, và SKU).
**Ngoài phạm vi:** Tạo, cập nhật, hoặc xóa sản phẩm (thuộc quyền người bán — xem F008); quản lý dữ liệu gốc
brand hay category (F002/F003); quản lý text dịch sản phẩm (F004); các thao tác cart/order/review trên sản phẩm.

**Tác nhân**

| Tác nhân | Mô tả | Mục tiêu chính |
|-------|--------------|---------------|
| Guest Shopper | Khách truy cập chưa đăng nhập, không có tài khoản/session | Duyệt sản phẩm và xem chi tiết mà không cần đăng nhập |
| Registered Buyer | Bất kỳ user nào đã đăng nhập (client/seller/admin) | Trải nghiệm duyệt giống hệt — tính năng này không kiểm tra role nên áp dụng như nhau |

Tính năng này không nằm trong flow liên tính năng nào — chưa có artifact `flows/*.md` nào.

## 2. Khả năng chức năng

| ID | Khả năng | Người dùng có thể làm gì | User Stories | Yêu cầu | Business Rules | Màn hình |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Duyệt catalog công khai | Tìm kiếm/lọc/sắp xếp/phân trang danh sách sản phẩm công khai, và mở chi tiết đầy đủ một sản phẩm — tất cả không cần xác thực | US050, US051 | FR-001, FR-201, FR-202, FR-601 | BR-001, BR-002, BR-003, DEC-001 | N/A — headless API, không có màn hình |

## 3. Quyết định còn mở

Không có — mọi xác nhận về nghiệp vụ đều đã chốt.

## 4. Yêu cầu

### Nền tảng (0xx)

- **FR-001** Chỉ sản phẩm đã publish (ngày publish đã qua) và chưa bị xóa
  mới đủ điều kiện xuất hiện qua các endpoint của tính năng này.

### Danh sách sản phẩm công khai (2xx)

- **FR-201** Khách truy cập có thể liệt kê sản phẩm, lọc theo brand, category, tên (khớp một phần, không phân biệt hoa/thường),
  và khoảng giá, sắp xếp theo tên/giá/ngày publish/thời điểm tạo/cập nhật/lượng bán, và phân trang.
- **FR-202** Khách truy cập có thể lấy chi tiết đầy đủ một sản phẩm — brand, category, SKU, và
  translation theo locale của họ — bằng ID sản phẩm, hoặc nhận kết quả "không tìm thấy" rõ ràng nếu sản phẩm
  không đủ điều kiện.

### Bảo mật (6xx)

- **FR-601** Cả hai endpoint đều gọi được mà không cần token xác thực nào — không cần đăng nhập
  để duyệt hoặc xem một sản phẩm.

## 5. Business Rules

- Chỉ sản phẩm có ngày `publishedAt` đã qua, và chưa bị soft-delete, mới được trả về bởi cả hai
  endpoint — sản phẩm chưa publish, publish trong tương lai, hoặc đã xóa được coi như không tồn tại. (BR-001)
- Tên/mô tả dịch của sản phẩm trả về theo locale hiện tại của khách truy cập khi có bản dịch tương ứng; tên dịch
  của brand thì luôn trả về đủ mọi ngôn ngữ mà brand có, không lọc theo locale của khách truy cập — tính năng này
  không thu hẹp danh sách translation của brand như cách nó thu hẹp translation của chính sản phẩm. (BR-002)
- Tên category hiển thị trong chi tiết sản phẩm là bản ghi category gốc (chưa dịch) —
  tính năng này hoàn toàn không lấy dữ liệu từ `CategoryTranslation`, dù locale của khách truy cập đã biết. (BR-003)
- Khi khách truy cập duyệt danh sách sản phẩm, chỉ những sản phẩm người bán đã thực sự publish tính đến
  thời điểm hiện tại mới được hiển thị — sản phẩm chưa lên live bị loại hoàn toàn khỏi kết quả,
  giống như nó không tồn tại, chứ không hiển thị kèm nhãn "không khả dụng". (DEC-001)

## 6. Màn hình

N/A — tính năng nền; không có màn hình cho người dùng. Đây là backend API dạng headless — xem
tham chiếu `(ROUTE###)` ở § 4 Yêu cầu, trong `technical-spec.md § 2`, cho hai route sở hữu là
`GET /products` (ROUTE051) và `GET /products/:id` (ROUTE052), thay cho mã màn hình.

### Hành trình người dùng

1. Khách truy cập gọi endpoint danh sách sản phẩm, có thể thu hẹp theo brand, category, tên, hoặc
   giá, và sắp xếp/phân trang kết quả.
2. Khách truy cập chọn một sản phẩm từ danh sách và gọi endpoint chi tiết với ID sản phẩm đó.
3. Khách truy cập thấy chi tiết đầy đủ của sản phẩm — brand, category, SKU khả dụng, và translation đã
   địa phương hóa — hoặc nhận response không tìm thấy nếu sản phẩm không đủ điều kiện hiển thị.

## 7. User Stories

### US050_BrowseProductCatalog — Duyệt Catalog Sản phẩm

**Tác nhân:** Guest Shopper
**Mục tiêu:** Duyệt catalog sản phẩm công khai để tìm sản phẩm muốn xem xét.
**Giá trị nghiệp vụ:** Giúp khách hàng tiềm năng khám phá những gì đang bán mà không phải đăng ký gì cả,
mở rộng nhóm người có thể tìm và cuối cùng mua sản phẩm.

**Tiêu chí chấp nhận:**
- [ ] Danh sách trả về cho người gọi ẩn danh, không cần token xác thực.
- [ ] Chỉ sản phẩm đã publish, chưa xóa mới xuất hiện.
- [ ] Filter (brand, category, tên, khoảng giá) và sort/phân trang đều hoạt động.

### US051_ViewProductDetail — Xem chi tiết sản phẩm

**Tác nhân:** Guest Shopper
**Mục tiêu:** Xem chi tiết đầy đủ một sản phẩm để quyết định có mua hay không.
**Giá trị nghiệp vụ:** Cung cấp cho khách hàng tiềm năng thông tin (giá, brand, SKU, mô tả)
cần thiết để biến việc duyệt hàng thành quyết định mua.

**Tiêu chí chấp nhận:**
- [ ] Sản phẩm khớp ID được trả về khi nó đã publish và chưa xóa.
- [ ] Sản phẩm không tồn tại, chưa publish, hoặc đã xóa thì trả về kết quả không tìm thấy rõ ràng
  thay vì dữ liệu của nó.
- [ ] Không cần token xác thực.

## 8. Kịch bản

### US050_BrowseProductCatalog — Happy Path

**Given** catalog có sản phẩm đã publish, **When** guest gọi danh sách sản phẩm với filter
brand và không có token xác thực, **Then** response chỉ chứa sản phẩm đã publish của brand đó, phân trang
theo đúng request.

### US050_BrowseProductCatalog — Lỗi: giá trị filter không hợp lệ

**Given** guest truyền giá trị không phải UUID làm filter ID brand, **When** họ gọi danh sách sản phẩm,
**Then** request bị từ chối kèm lỗi validation nêu rõ field sai.

### US051_ViewProductDetail — Happy Path

**Given** sản phẩm đã publish và chưa xóa, **When** guest yêu cầu chi tiết theo ID,
**Then** chi tiết đầy đủ của sản phẩm (brand, category, SKU, translation) được trả về.

### US051_ViewProductDetail — Lỗi: không đủ điều kiện

**Given** ID sản phẩm thuộc về một sản phẩm đã xóa, chưa publish, hoặc publish trong tương lai, **When** guest
yêu cầu chi tiết của nó, **Then** response không tìm thấy được trả về thay vì dữ liệu sản phẩm.

## 9. Trường hợp biên

| Kịch bản | Điều gì xảy ra | Thông báo cho người dùng |
|----------|--------------|----------------------|
| ID sản phẩm không tồn tại, hoặc tồn tại nhưng đã bị soft-delete, chưa publish, hoặc hẹn publish trong tương lai | Việc tra chi tiết coi như sản phẩm không tồn tại | "Không tìm thấy sản phẩm" |
| ID sản phẩm không phải UUID hợp lệ | Request bị từ chối trước khi tra cứu bất cứ gì | "Validation failed (uuid is expected)" |
| Gọi danh sách với sort field không hợp lệ, hoặc giá trị filter sai kiểu/định dạng | Request bị từ chối trước khi query | "orderBy must be one of: name, basePrice, virtualPrice, publishedAt, createdAt, updatedAt, sale" (hoặc thông báo validation của field tương ứng) |
| Gọi danh sách mà không có sản phẩm nào khớp filter | Trả về tập kết quả rỗng, không phải lỗi | "None — xử lý ngầm; response là mảng `data` rỗng với tổng phân trang bằng 0" |

## 10. Hành vi biên cần kiểm tra

- **FR-001** → Xác nhận sản phẩm có `publishedAt` là null, ở tương lai, hoặc có `deletedAt` đã set
  không bao giờ xuất hiện trong response danh sách hay chi tiết.
- **FR-202** → Xác nhận yêu cầu chi tiết với ID sản phẩm không tồn tại, chưa publish, hoặc đã xóa
  trả về kết quả không tìm thấy chứ không phải lỗi 500 hay dữ liệu thô của sản phẩm.

## 11. Rủi ro & Vấn đề đã biết

| ID | Loại | Mô tả | Ảnh hưởng | Trạng thái |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | Translation của brand đi kèm sản phẩm không bao giờ được lọc theo locale của khách truy cập (luôn trả về mọi ngôn ngữ), khác với translation của chính sản phẩm, vốn được lọc theo locale. | Khách mua duyệt ở một locale nhất định sẽ thấy tên brand lặp lại ở mọi ngôn ngữ brand có, thay vì chỉ ngôn ngữ của họ — không nhất quán với cách tên/mô tả của chính sản phẩm hoạt động. | confirmed |
| RISK-02 | known-issue | Tên category đi kèm chi tiết sản phẩm là cột `Category.name` gốc (chưa dịch) — hàng `CategoryTranslation` hoàn toàn không được join vào response của tính năng này. | Khách mua chỉ thấy category bằng bất kỳ ngôn ngữ nào mà bản ghi gốc được viết, bất kể locale của họ — dù cùng request đó đã xác định locale cho text của chính sản phẩm. | confirmed |

## 12. Phụ thuộc

| Phụ thuộc | Loại | Vì sao tính năng này cần nó | Bằng chứng |
|------------|------|-----------------------------|----------|
| F004_CatalogLocalization | feature | Tính năng này đọc các hàng `ProductTranslation` do F004 sở hữu việc ghi, để hiển thị tên/mô tả sản phẩm đã địa phương hóa. | BR-002 |
| F002_BrandCatalogManagement | feature | Đọc các hàng `Brand`/`BrandTranslation` thuộc quyền sở hữu ở đó để hiển thị thông tin brand trên sản phẩm. | BR-002 |
| F003_CategoryCatalogManagement | feature | Đọc các hàng `Category` thuộc quyền sở hữu ở đó để hiển thị category của sản phẩm. | BR-003 |
| F008_SellerProductManagement | feature | Cả hai tính năng cùng đọc/ghi bảng `Product`/`SKU`; tính năng này là phiên bản chỉ-đọc công khai đối ứng với CRUD phạm vi người bán của F008. | § 1 Overview |

## 13. Cấu hình

```text
DEFAULT_PAGE_INDEX = 1     # product list starts at page 1 when no pageIndex is supplied
DEFAULT_PAGE_SIZE = 10     # number of products returned per page when no pageSize is supplied
```
