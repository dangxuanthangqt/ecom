---
authored_by: rebuild-spec
---
<!-- layout-exempt: rebuild-spec owns all docs/system|features|generated|flows paths -->
<!-- Contract: references/feature-spec-researcher-contract.md -->

# Functional Spec — F004_CatalogLocalization

**Độ ưu tiên**: P2
**Loại**: ui
**Được sinh ra**: 2026-09-12

**Xem thêm:** [`technical-spec.vi.md`](./technical-spec.vi.md) — endpoint, nguồn trích dẫn, pseudocode,
các entity chính và các thao tác ghi DB, dành cho Dev/QA/SA.

**Truy vết:** F004 → N/A (không có màn hình) → US015-US019, US025-US034, US045-US049 → N/A (không có logic nền) → ROUTE016-ROUTE020, ROUTE026-ROUTE035, ROUTE046-ROUTE050 → N/A (chưa có test case)

## 1. Tổng quan

**Vấn đề:** Brand, category và product trong catalog mỗi cái chỉ có một name/description gốc. Không có chỗ riêng để lưu văn bản theo từng locale thì không thể hiển thị catalog đúng cho người dùng ở ngôn ngữ khác.
**Giải pháp:** Duy trì danh sách locale được hỗ trợ, và cho admin (hoặc với product, cả client/seller) gắn tên và mô tả theo locale vào một brand, category hoặc product. Đọc một bản dịch luôn trả về kèm entity cha và locale của nó.
**Phạm vi:** Định nghĩa catalog hỗ trợ locale nào (thêm/đổi tên/xóa ngôn ngữ); tạo, đọc, cập nhật, xóa văn bản đã địa hóa cho brand, category và product, mỗi hàng ứng với một cặp (entity, locale).
**Ngoài phạm vi:** Tính năng này không sở hữu dữ liệu gốc (chưa dịch) của brand/category/product — dữ liệu đó thuộc về F002 (Brand Catalog Management), F003 (Category Catalog Management) và F008 (Seller Product Management). Nó cũng không quyết định request nên được phục vụ bằng locale nào (không tìm thấy logic thương lượng/fallback locale nào trong source) — xem § 3 Quyết định Mở.

**Tác nhân**

| Tác nhân | Mô tả | Mục tiêu chính |
|-------|--------------|---------------|
| Admin | Nhân viên back-office có đầy đủ quyền | Giữ danh sách locale được hỗ trợ và mọi bản dịch brand/category/product chính xác |
| Client | Tài khoản khách mua hàng | Đọc và duy trì văn bản sản phẩm đã địa hóa (nhóm bản dịch duy nhất mà client chạm được) |
| Seller | Tài khoản quản lý danh sách sản phẩm của chính mình | Đọc và duy trì văn bản sản phẩm đã địa hóa cho sản phẩm, cùng phạm vi tiếp cận như Client ở tính năng này |

## 2. Khả năng Chức năng

| ID | Khả năng | Người dùng có thể làm gì | User Stories | Yêu cầu | Quy tắc Kinh doanh | Màn hình |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Quản lý Ngôn ngữ Được hỗ trợ | Xem, thêm, đổi tên, và xóa vĩnh viễn locale mà catalog hỗ trợ | US030, US031, US032, US033, US034 | FR-001, FR-101, FR-201, FR-202, FR-203, FR-204, FR-205, FR-601, FR-602 | BR-004 | — |
| CAP-02 | Quản lý Bản dịch Brand | Xem, thêm, sửa, xóa tên/mô tả đã địa hóa của brand | US015, US016, US017, US018, US019 | FR-301, FR-302, FR-303, FR-304, FR-305 | BR-001 | — |
| CAP-03 | Quản lý Bản dịch Category | Xem, thêm, sửa, xóa tên/mô tả đã địa hóa của category | US025, US026, US027, US028, US029 | FR-401, FR-402, FR-403, FR-404, FR-405 | BR-002 | — |
| CAP-04 | Quản lý Bản dịch Product | Xem, thêm, sửa, xóa tên/mô tả đã địa hóa của product | US045, US046, US047, US048, US049 | FR-501, FR-502, FR-503, FR-504, FR-505, FR-551 | BR-003 | — |

## 3. Quyết định Mở

| D### | Quyết định | Đề xuất mặc định | Lý do | Chặn công việc |
|------|----------|-------------------|-----------|--------------|
| D001 | API nên tự chọn bản dịch dựa trên header kiểu `Accept-Language`, hay mọi caller luôn phải truyền tường minh bộ lọc ngôn ngữ? | Giữ nguyên hiện trạng: không tự thương lượng locale; caller luôn tự xác định ngôn ngữ tường minh (bằng cách lọc/đọc đúng bản dịch cần). | Source không có logic kiểu này; tự bịa ra sẽ là thêm tính năng mới, không phải mô tả sự thật đã có. | không |

## 4. Yêu cầu

### Nền tảng (0xx)

- **FR-001** Một locale phải đã là Language được hỗ trợ trước khi bất kỳ bản dịch brand, category hay product nào có thể nhắm tới nó.

### Điều hướng (1xx)

- **FR-101** Caller tiếp cận mọi khả năng trong tính năng này trực tiếp qua REST endpoint riêng; không có flow điều hướng nào cần mô tả (headless API, không có màn hình).

### Quản lý Ngôn ngữ Được hỗ trợ (2xx)

- **FR-201** Admin có thể liệt kê tất cả ngôn ngữ được hỗ trợ, có phân trang và tìm kiếm từ khóa theo tên ngôn ngữ.
- **FR-202** Admin có thể lấy một ngôn ngữ theo locale code, nhận response not-found khi nó không tồn tại.
- **FR-203** Admin có thể thêm một ngôn ngữ được hỗ trợ mới bằng cách cung cấp locale code 2 ký tự và tên hiển thị, qua một endpoint tạo riêng.
- **FR-204** Admin có thể đổi tên hiển thị của một ngôn ngữ đã có.
- **FR-205** Admin có thể xóa vĩnh viễn một ngôn ngữ được hỗ trợ; thao tác xóa này không thể hoàn tác.

### Quản lý Bản dịch Brand (3xx)

- **FR-301** Admin có thể liệt kê tất cả bản dịch brand, có phân trang và tìm kiếm từ khóa theo tên đã dịch.
- **FR-302** Admin có thể lấy một bản dịch brand theo ID, nhận response not-found khi nó không tồn tại.
- **FR-303** Admin có thể thêm tên/mô tả đã địa hóa cho một brand đã có, theo một ngôn ngữ cho trước.
- **FR-304** Admin có thể sửa tên, mô tả, ngôn ngữ, hoặc brand đích của một bản dịch brand đã có.
- **FR-305** Admin có thể xóa một bản dịch brand; hàng này chỉ bị vô hiệu hóa, không xóa cứng.

### Quản lý Bản dịch Category (4xx)

- **FR-401** Admin có thể liệt kê tất cả bản dịch category, có phân trang và tìm kiếm từ khóa theo tên đã dịch.
- **FR-402** Admin có thể lấy một bản dịch category theo ID, nhận response not-found khi nó không tồn tại.
- **FR-403** Admin có thể thêm tên/mô tả đã địa hóa cho một category đã có, theo một ngôn ngữ cho trước.
- **FR-404** Admin có thể sửa tên, mô tả, ngôn ngữ, hoặc category đích của một bản dịch category đã có.
- **FR-405** Admin có thể xóa một bản dịch category; hàng này chỉ bị vô hiệu hóa, không xóa cứng.

### Quản lý Bản dịch Product (5xx)

- **FR-501** Client hoặc seller có thể liệt kê tất cả bản dịch product, có phân trang và tìm kiếm từ khóa theo tên đã dịch.
- **FR-502** Client hoặc seller có thể lấy một bản dịch product theo ID, nhận response not-found khi nó không tồn tại.
- **FR-503** Client hoặc seller có thể thêm tên/mô tả đã địa hóa cho một product đã có, theo một ngôn ngữ cho trước.
- **FR-504** Client hoặc seller có thể sửa tên, mô tả, ngôn ngữ, hoặc product đích của một bản dịch product đã có.
- **FR-505** Client hoặc seller có thể xóa một bản dịch product; hàng này chỉ bị vô hiệu hóa, không xóa cứng.

### Tương tác (n/a — không có tương tác liên khả năng)

- **FR-551** Bốn khả năng hoạt động độc lập; entity cha và ngôn ngữ của một bản dịch là hai mối quan tâm riêng biệt, không có workflow chung giữa các khả năng.

### Bảo mật (6xx)

- **FR-601** Mỗi endpoint trong số 20 endpoint của tính năng này mặc định yêu cầu một session `Bearer` hợp lệ; không endpoint nào công khai.
- **FR-602** Quản lý ngôn ngữ, bản dịch brand và bản dịch category chỉ dành cho admin; quản lý bản dịch product thì mở thêm cho cả client và seller.

## 5. Quy tắc Kinh doanh

- Một bản dịch brand/category/product không được trùng cặp (entity cha, ngôn ngữ) với một bản dịch còn hiệu lực khác — lần thử thứ hai bị từ chối. (BR-001)
- Tạo hoặc cập nhật một bản dịch brand/category/product yêu cầu brand/category/product cha phải tồn tại và chưa bị xóa; một cha không hợp lệ bị từ chối trước khi bản dịch được ghi. (BR-002)
- Việc tiếp cận route của tính năng này được kiểm soát theo role và module: admin tiếp cận cả 20 route; client và seller chỉ tiếp cận 5 route bản dịch product — các route ngôn ngữ, bản dịch brand, bản dịch category vẫn chỉ dành cho admin. (BR-003)
- Xóa một ngôn ngữ được hỗ trợ là xóa vĩnh viễn, không thể khôi phục — khác với mọi entity khác trong tính năng này, nó không bao giờ được xóa mềm. (BR-004)

## 6. Màn hình

N/A — tính năng nền; không có màn hình hướng người dùng. Đây là một API backend thuần —
không có lớp UI nào trong repository này, và `docs/generated/screen-list.md` đã ghi rõ
"Không có dữ liệu", nên không có mã `SCR###` nào để trích dẫn. Truy vết chạy qua các route
sở hữu thay vào đó: 20 route sở hữu của nó trên `/languages`, `/brand-translations`, `/category-translations` và `/product-translations` — xem `technical-spec.md § 2 Action Index`.

## 7. User Stories

### US030 — Xem Danh sách Ngôn ngữ

**Tác nhân:** Admin
**Mục tiêu:** Xem mọi locale được hỗ trợ.
**Giá trị kinh doanh:** Xác nhận catalog hiện dịch được sang những ngôn ngữ nào.

**Tiêu chí Chấp nhận:**
- [ ] Trả về mọi ngôn ngữ được hỗ trợ, có phân trang.

### US031 — Xem Chi tiết Ngôn ngữ

**Tác nhân:** Admin
**Mục tiêu:** Tra cứu cấu hình của một ngôn ngữ.
**Giá trị kinh doanh:** Xác nhận thiết lập của một locale cụ thể trước khi dùng nó cho bản dịch mới.

**Tiêu chí Chấp nhận:**
- [ ] Trả về ngôn ngữ khớp code được cho, hoặc kết quả not-found.

### US032 — Tạo Ngôn ngữ

**Tác nhân:** Admin
**Mục tiêu:** Thêm một locale được hỗ trợ mới.
**Giá trị kinh doanh:** Mở khóa việc dịch brand/category/product sang locale đó.

**Tiêu chí Chấp nhận:**
- [ ] Code + name hợp lệ tạo ra một hàng ngôn ngữ mới.
- [ ] Code trùng lặp bị từ chối.

### US033 — Cập nhật Ngôn ngữ

**Tác nhân:** Admin
**Mục tiêu:** Sửa tên hiển thị của một ngôn ngữ.
**Giá trị kinh doanh:** Giữ metadata locale chính xác cho admin khi chọn ngôn ngữ ở nơi khác trong hệ thống.

**Tiêu chí Chấp nhận:**
- [ ] Tên hiển thị của ngôn ngữ được chỉ định được cập nhật.

### US034 — Xóa Ngôn ngữ

**Tác nhân:** Admin
**Mục tiêu:** Ngừng cung cấp một locale không còn dùng nữa.
**Giá trị kinh doanh:** Ngăn một locale đã ngừng dùng bị chọn cho bản dịch mới.

**Tiêu chí Chấp nhận:**
- [ ] Hàng ngôn ngữ bị xóa vĩnh viễn.
- [ ] [EXPECTED] Admin được cảnh báo rằng mọi bản dịch còn trỏ tới ngôn ngữ này sẽ bị xóa theo — không tìm thấy cảnh báo như vậy trong source; xem § 11 Rủi ro & Vấn đề Đã biết.

### US015 — Xem Danh sách Bản dịch Brand

**Tác nhân:** Admin
**Mục tiêu:** Kiểm tra toàn bộ tên/mô tả brand đã địa hóa đang có.
**Giá trị kinh doanh:** Xác nhận độ phủ địa hóa của brand trên các locale được hỗ trợ.

**Tiêu chí Chấp nhận:**
- [ ] Trả về mọi bản dịch brand, có phân trang.

### US016 — Xem Chi tiết Bản dịch Brand

**Tác nhân:** Admin
**Mục tiêu:** Kiểm tra nội dung của một bản dịch brand.
**Giá trị kinh doanh:** Xác nhận văn bản đã địa hóa của một brand cụ thể trước khi sửa.

**Tiêu chí Chấp nhận:**
- [ ] Trả về bản dịch brand khớp ID được cho, hoặc kết quả not-found.

### US017 — Tạo Bản dịch Brand

**Tác nhân:** Admin
**Mục tiêu:** Thêm tên/mô tả đã địa hóa cho một brand.
**Giá trị kinh doanh:** Giúp brand đó hiển thị đúng ở locale đích.

**Tiêu chí Chấp nhận:**
- [ ] Payload hợp lệ tạo ra bản dịch liên kết với một brand và ngôn ngữ đã có.
- [ ] Cặp (brand, ngôn ngữ) trùng lặp bị từ chối.
- [ ] Brand không tồn tại bị từ chối.

### US018 — Cập nhật Bản dịch Brand

**Tác nhân:** Admin
**Mục tiêu:** Sửa một bản dịch brand đã có.
**Giá trị kinh doanh:** Giữ văn bản brand đã địa hóa chính xác theo thời gian.

**Tiêu chí Chấp nhận:**
- [ ] Các trường của bản dịch brand được chỉ định được cập nhật.

### US019 — Xóa Bản dịch Brand

**Tác nhân:** Admin
**Mục tiêu:** Gỡ một bản dịch brand đã lỗi thời.
**Giá trị kinh doanh:** Ngăn văn bản brand đã địa hóa cũ tiếp tục được phục vụ.

**Tiêu chí Chấp nhận:**
- [ ] Bản dịch brand bị vô hiệu hóa (không còn xuất hiện ở list/detail).

### US025 — Xem Danh sách Bản dịch Category

**Tác nhân:** Admin
**Mục tiêu:** Kiểm tra toàn bộ tên/mô tả category đã địa hóa đang có.
**Giá trị kinh doanh:** Xác nhận độ phủ địa hóa của category trên các locale được hỗ trợ.

**Tiêu chí Chấp nhận:**
- [ ] Trả về mọi bản dịch category, có phân trang.

### US026 — Xem Chi tiết Bản dịch Category

**Tác nhân:** Admin
**Mục tiêu:** Kiểm tra nội dung của một bản dịch category.
**Giá trị kinh doanh:** Xác nhận văn bản đã địa hóa của một category cụ thể trước khi sửa.

**Tiêu chí Chấp nhận:**
- [ ] Trả về bản dịch category khớp ID được cho, hoặc kết quả not-found.

### US027 — Tạo Bản dịch Category

**Tác nhân:** Admin
**Mục tiêu:** Thêm tên/mô tả đã địa hóa cho một category.
**Giá trị kinh doanh:** Giúp category đó hiển thị đúng ở locale đích.

**Tiêu chí Chấp nhận:**
- [ ] Payload hợp lệ tạo ra bản dịch liên kết với một category và ngôn ngữ đã có.
- [ ] Cặp (category, ngôn ngữ) trùng lặp bị từ chối.
- [ ] Category không tồn tại bị từ chối.

### US028 — Cập nhật Bản dịch Category

**Tác nhân:** Admin
**Mục tiêu:** Sửa một bản dịch category đã có.
**Giá trị kinh doanh:** Giữ văn bản category đã địa hóa chính xác theo thời gian.

**Tiêu chí Chấp nhận:**
- [ ] Các trường của bản dịch category được chỉ định được cập nhật.

### US029 — Xóa Bản dịch Category

**Tác nhân:** Admin
**Mục tiêu:** Gỡ một bản dịch category đã lỗi thời.
**Giá trị kinh doanh:** Ngăn văn bản category đã địa hóa cũ tiếp tục được phục vụ.

**Tiêu chí Chấp nhận:**
- [ ] Bản dịch category bị vô hiệu hóa (không còn xuất hiện ở list/detail).

### US045 — Xem Danh sách Bản dịch Product

**Tác nhân:** Client
**Mục tiêu:** Xem nội dung product đã địa hóa.
**Giá trị kinh doanh:** Cho phép client/seller xác nhận độ phủ địa hóa của product; seller tiếp cận theo cùng cách (PERM005 cấp cả hai role cùng module).

**Tiêu chí Chấp nhận:**
- [ ] Trả về mọi bản dịch product, có phân trang.

### US046 — Xem Chi tiết Bản dịch Product

**Tác nhân:** Client
**Mục tiêu:** Kiểm tra nội dung đã địa hóa của một product.
**Giá trị kinh doanh:** Xác nhận văn bản đã địa hóa của một product cụ thể trước khi sửa.

**Tiêu chí Chấp nhận:**
- [ ] Trả về bản dịch product khớp ID được cho, hoặc kết quả not-found.

### US047 — Tạo Bản dịch Product

**Tác nhân:** Client
**Mục tiêu:** Thêm tên/mô tả đã địa hóa cho một product.
**Giá trị kinh doanh:** Giúp product đó hiển thị đúng ở locale đích.

**Tiêu chí Chấp nhận:**
- [ ] Payload hợp lệ tạo ra bản dịch liên kết với một product và ngôn ngữ đã có.
- [ ] Cặp (product, ngôn ngữ) trùng lặp bị từ chối.
- [ ] Product không tồn tại bị từ chối.

### US048 — Cập nhật Bản dịch Product

**Tác nhân:** Client
**Mục tiêu:** Sửa một bản dịch product đã có.
**Giá trị kinh doanh:** Giữ văn bản product đã địa hóa chính xác theo thời gian.

**Tiêu chí Chấp nhận:**
- [ ] Các trường của bản dịch product được chỉ định được cập nhật.

### US049 — Xóa Bản dịch Product

**Tác nhân:** Client
**Mục tiêu:** Gỡ một bản dịch product đã lỗi thời.
**Giá trị kinh doanh:** Ngăn văn bản product đã địa hóa cũ tiếp tục được phục vụ.

**Tiêu chí Chấp nhận:**
- [ ] Bản dịch product bị vô hiệu hóa (không còn xuất hiện ở list/detail).

## 8. Kịch bản

### US030 — Happy Path
**Cho rằng** nhiều ngôn ngữ đã tồn tại, **Khi** admin yêu cầu danh sách ngôn ngữ, **Thì** mọi ngôn ngữ chưa bị xóa được trả về, có phân trang.

### US030 — Lỗi: unauthenticated call
**Cho rằng** không có session hợp lệ, **Khi** danh sách được yêu cầu, **Thì** request bị từ chối là unauthorized.

### US031 — Happy Path
**Cho rằng** một ngôn ngữ có code "en" đã tồn tại, **Khi** admin yêu cầu nó theo code, **Thì** tên của nó được trả về.

### US031 — Lỗi: unknown code
**Cho rằng** không có ngôn ngữ nào mang code "xx", **Khi** admin yêu cầu nó, **Thì** kết quả not-found được trả về.

### US032 — Happy Path
**Cho rằng** chưa có ngôn ngữ nào mang code "vi", **Khi** admin gửi code + name hợp lệ, **Thì** ngôn ngữ được tạo.

### US032 — Lỗi: duplicate code
**Cho rằng** một ngôn ngữ với code "en" đã tồn tại, **Khi** admin gửi lại code "en", **Thì** thao tác tạo bị từ chối.

### US033 — Happy Path
**Cho rằng** một ngôn ngữ đã tồn tại, **Khi** admin gửi một tên hiển thị mới, **Thì** tên của ngôn ngữ được cập nhật.

### US033 — Lỗi: unknown code
**Cho rằng** không có ngôn ngữ nào mang code "xx", **Khi** admin gửi một cập nhật, **Thì** kết quả not-found được trả về.

### US034 — Happy Path
**Cho rằng** admin muốn gỡ một ngôn ngữ không còn phụ thuộc nào, **Khi** admin xóa nó, **Thì** hàng ngôn ngữ bị xóa vĩnh viễn.

### US034 — Lỗi: unknown code
**Cho rằng** không có ngôn ngữ nào mang code "xx", **Khi** admin xóa nó, **Thì** kết quả not-found được trả về.

### US015 — Happy Path
**Cho rằng** nhiều bản dịch brand đã tồn tại, **Khi** admin yêu cầu danh sách, **Thì** mọi bản dịch brand chưa bị xóa được trả về, có phân trang.

### US015 — Lỗi: unauthenticated call
**Cho rằng** không có session hợp lệ, **Khi** danh sách được yêu cầu, **Thì** request bị từ chối là unauthorized.

### US016 — Happy Path
**Cho rằng** một bản dịch brand đã tồn tại, **Khi** admin yêu cầu nó theo ID, **Thì** nội dung của nó được trả về kèm brand và ngôn ngữ.

### US016 — Lỗi: unknown ID
**Cho rằng** không có bản dịch brand nào mang ID được cho, **Khi** admin yêu cầu nó, **Thì** kết quả not-found được trả về.

### US017 — Happy Path
**Cho rằng** một brand và ngôn ngữ đã tồn tại, **Khi** admin gửi một payload bản dịch hợp lệ, **Thì** bản dịch được tạo.

### US017 — Lỗi: duplicate pair
**Cho rằng** một bản dịch đã tồn tại cho cặp brand + ngôn ngữ đó, **Khi** admin gửi thêm một bản khác, **Thì** thao tác tạo bị từ chối.

### US018 — Happy Path
**Cho rằng** một bản dịch brand đã tồn tại, **Khi** admin gửi các trường cập nhật, **Thì** bản dịch được cập nhật.

### US018 — Lỗi: unknown ID
**Cho rằng** không có bản dịch brand nào mang ID được cho, **Khi** admin gửi một cập nhật, **Thì** kết quả not-found được trả về.

### US019 — Happy Path
**Cho rằng** một bản dịch brand đã tồn tại, **Khi** admin xóa nó, **Thì** bản dịch bị vô hiệu hóa và không còn được liệt kê.

### US019 — Lỗi: unknown ID
**Cho rằng** không có bản dịch brand nào mang ID được cho, **Khi** admin xóa nó, **Thì** kết quả not-found được trả về.

### US025 — Happy Path
**Cho rằng** nhiều bản dịch category đã tồn tại, **Khi** admin yêu cầu danh sách, **Thì** mọi bản dịch category chưa bị xóa được trả về, có phân trang.

### US025 — Lỗi: unauthenticated call
**Cho rằng** không có session hợp lệ, **Khi** danh sách được yêu cầu, **Thì** request bị từ chối là unauthorized.

### US026 — Happy Path
**Cho rằng** một bản dịch category đã tồn tại, **Khi** admin yêu cầu nó theo ID, **Thì** nội dung của nó được trả về kèm category và ngôn ngữ.

### US026 — Lỗi: unknown ID
**Cho rằng** không có bản dịch category nào mang ID được cho, **Khi** admin yêu cầu nó, **Thì** kết quả not-found được trả về.

### US027 — Happy Path
**Cho rằng** một category và ngôn ngữ đã tồn tại, **Khi** admin gửi một payload bản dịch hợp lệ, **Thì** bản dịch được tạo.

### US027 — Lỗi: duplicate pair
**Cho rằng** một bản dịch đã tồn tại cho cặp category + ngôn ngữ đó, **Khi** admin gửi thêm một bản khác, **Thì** thao tác tạo bị từ chối.

### US028 — Happy Path
**Cho rằng** một bản dịch category đã tồn tại, **Khi** admin gửi các trường cập nhật, **Thì** bản dịch được cập nhật.

### US028 — Lỗi: unknown ID
**Cho rằng** không có bản dịch category nào mang ID được cho, **Khi** admin gửi một cập nhật, **Thì** kết quả not-found được trả về.

### US029 — Happy Path
**Cho rằng** một bản dịch category đã tồn tại, **Khi** admin xóa nó, **Thì** bản dịch bị vô hiệu hóa và không còn được liệt kê.

### US029 — Lỗi: unknown ID
**Cho rằng** không có bản dịch category nào mang ID được cho, **Khi** admin xóa nó, **Thì** kết quả not-found được trả về.

### US045 — Happy Path
**Cho rằng** nhiều bản dịch product đã tồn tại, **Khi** client hoặc seller yêu cầu danh sách, **Thì** mọi bản dịch product chưa bị xóa được trả về, có phân trang.

### US045 — Lỗi: unauthenticated call
**Cho rằng** không có session hợp lệ, **Khi** danh sách được yêu cầu, **Thì** request bị từ chối là unauthorized.

### US046 — Happy Path
**Cho rằng** một bản dịch product đã tồn tại, **Khi** client hoặc seller yêu cầu nó theo ID, **Thì** nội dung của nó được trả về kèm ngôn ngữ.

### US046 — Lỗi: unknown ID
**Cho rằng** không có bản dịch product nào mang ID được cho, **Khi** nó được yêu cầu, **Thì** kết quả not-found được trả về.

### US047 — Happy Path
**Cho rằng** một product và ngôn ngữ đã tồn tại, **Khi** client hoặc seller gửi một payload bản dịch hợp lệ, **Thì** bản dịch được tạo.

### US047 — Lỗi: duplicate pair
**Cho rằng** một bản dịch đã tồn tại cho cặp product + ngôn ngữ đó, **Khi** một bản khác được gửi, **Thì** thao tác tạo bị từ chối — dù xem § 11 RISK-02 để biết một điểm bất nhất trong cách lỗi từ chối này thể hiện ra ngoài.

### US048 — Happy Path
**Cho rằng** một bản dịch product đã tồn tại, **Khi** client hoặc seller gửi các trường cập nhật, **Thì** bản dịch được cập nhật.

### US048 — Lỗi: unknown ID
**Cho rằng** không có bản dịch product nào mang ID được cho, **Khi** một cập nhật được gửi, **Thì** kết quả not-found được trả về.

### US049 — Happy Path
**Cho rằng** một bản dịch product đã tồn tại, **Khi** client hoặc seller xóa nó, **Thì** bản dịch bị vô hiệu hóa và không còn được liệt kê.

### US049 — Lỗi: unknown ID
**Cho rằng** không có bản dịch product nào mang ID được cho, **Khi** nó bị xóa, **Thì** kết quả not-found được trả về.

## 9. Trường hợp Biên

| Tình huống | Điều gì Xảy ra | Thông báo Hiển thị cho Người dùng |
|----------|--------------|----------------------|
| Một bản dịch thứ hai được gửi cho cùng cặp (brand/category/product, ngôn ngữ) | Việc ghi bị từ chối trước hoặc tại cấp database (BR-001) | "This translation already exists for that language." (khi tạo bản dịch product: xem RISK-02 — trường hợp cụ thể này có thể lại hiện ra thành một lỗi server chung chung) |
| Một bản dịch được tạo/cập nhật nhắm tới một ID brand/category/product không tồn tại | Việc ghi bị từ chối trước khi chạm tới database (BR-002) | "Brand/Category/Product not found." |
| Một ID ngôn ngữ, bản dịch brand, bản dịch category hoặc bản dịch product đã bị xóa (hoặc chưa từng tồn tại) được yêu cầu | Việc tra cứu trả về not-found | "Not found." |
| Một tài khoản client gọi một route ngôn ngữ, bản dịch brand, hoặc bản dịch category | Request bị từ chối bởi cơ chế kiểm soát role/module (BR-003) | "You don't have permission to do this." |
| Admin xóa một ngôn ngữ vẫn còn bản dịch brand/category/product/user trỏ tới | Việc xóa vẫn tiến hành và lan theo hiệu ứng cascade — mọi hàng bản dịch của ngôn ngữ đó bị xóa theo, không báo trước | Không có — xử lý âm thầm (xem RISK-03) |
| Hai admin gửi cùng một bản dịch (brand, ngôn ngữ) mới gần như cùng lúc | Partial unique index của database chỉ cho đúng một lần ghi lọt qua; lần còn lại thất bại giống một trường hợp trùng lặp thông thường | "This translation already exists for that language." |

## 10. Hành vi Biên cần Xác minh

- **FR-203** → Xác nhận `POST /languages/create` (không phải `POST /languages`) là cách duy nhất để tạo một ngôn ngữ, và code 2 ký tự được bắt buộc.
- **FR-205** → Xác nhận xóa một ngôn ngữ là xóa cứng, không để lại dấu vết soft-delete, khác với mọi entity khác trong tính năng này.
- **FR-303** → Xác nhận không thể tạo bản dịch brand nhắm tới một brand ID không tồn tại.
- **FR-503** → Xác nhận lỗi từ chối trùng cặp của bản dịch product thực sự trả về cho caller dưới dạng 422, không phải 500 (xem RISK-02).
- **FR-602** → Xác nhận token của seller hoặc client tiếp cận được cả 5 route bản dịch product nhưng không tiếp cận được bất kỳ route ngôn ngữ/bản dịch brand/bản dịch category nào.

## 11. Rủi ro & Vấn đề Đã biết

| ID | Loại | Mô tả | Tác động | Trạng thái |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | Tạo một bản dịch brand hoặc category vi phạm ràng buộc duy nhất (parent, ngôn ngữ) trả về thông báo "…with this name already exists" / "…with this name already exists", chỉ sai trường — ràng buộc thực sự nằm ở cặp (brand/category, ngôn ngữ), không phải ở tên đã dịch. | Admin sửa một lỗi trùng lặp bị từ chối có thể nhìn nhầm vào trường tên thay vì nguyên nhân thật (đã có bản dịch cho đúng ngôn ngữ đó). | confirmed |
| RISK-02 | known-issue | Tạo bản dịch product hoàn toàn không xử lý ràng buộc duy nhất (product, ngôn ngữ) của database — chỉ có xử lý not-found và bắt lỗi khóa ngoại. Một lần tạo trùng lặp vẫn thất bại ở database, nhưng lại trả về một lỗi internal-error chung chung thay vì cùng dạng lỗi từ chối mà mọi path tạo khác trong tính năng này trả về cho tình huống giống hệt. | Client/seller thử tạo lại một bản dịch product trùng lặp sẽ thấy một lỗi server khó hiểu thay vì thông báo "already exists" rõ ràng. | confirmed |
| RISK-03 | known-issue | Xóa một ngôn ngữ được hỗ trợ là xóa cứng vĩnh viễn, và database lan hiệu ứng xóa đó sang mọi bản dịch brand/category/product/user còn trỏ tới ngôn ngữ đó — không có bước xác nhận và không có cách khôi phục các bản dịch đã mất. | Admin xóa một locale trông có vẻ không dùng nữa có thể vô tình phá hủy âm thầm nội dung bản dịch trên toàn bộ catalog. | confirmed |
| RISK-04 | risk | Không dịch vụ bản dịch nào trong ba dịch vụ xác nhận ngôn ngữ được gửi lên có thực sự tồn tại trước khi ghi — chỉ kiểm tra brand/category/product cha; một ngôn ngữ không hợp lệ chỉ bị bắt bởi ràng buộc khóa ngoại của database, trả về một thông báo vi phạm ràng buộc chung chung thay vì một thông báo dành riêng cho ngôn ngữ. | Caller gõ nhầm hoặc dùng một language code đã bị xóa sẽ nhận một lỗi kém hữu ích hơn so với lỗi họ nhận được khi entity cha không hợp lệ. | confirmed |

## 12. Phụ thuộc

| Phụ thuộc | Loại | Tại sao tính năng này cần nó | Bằng chứng |
|------------|------|-----------------------------|----------|
| F002 Brand Catalog Management | feature | Một bản dịch brand luôn nhắm tới một hàng Brand đã có, do F002 sở hữu. | FR-303 |
| F003 Category Catalog Management | feature | Một bản dịch category luôn nhắm tới một hàng Category đã có, do F003 sở hữu. | FR-403 |
| F008 Seller Product Management | feature | Một bản dịch product luôn nhắm tới một hàng Product đã có, do F008 sở hữu. | FR-503 |
| PostgreSQL partial unique indexes (theo từng nhóm, trên (parentId, languageId) WHERE not deleted) | infrastructure | Thực thi quy tắc trùng cặp của BR-001 ở tầng database, vì schema Prisma không khai báo những ràng buộc này. | BR-001 |

## 13. Cấu hình

N/A — tính năng này không có hằng số cấu hình nào hiển thị cho người dùng.
