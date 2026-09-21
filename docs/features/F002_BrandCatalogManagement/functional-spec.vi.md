---
authored_by: rebuild-spec
---

# Quy cách chức năng — F002_BrandCatalogManagement

**Độ ưu tiên**: P1
**Loại**: ui
**Tạo**: 2026-09-12

**Xem thêm:** [`technical-spec.vi.md`](./technical-spec.vi.md) — endpoint, trích dẫn nguồn, pseudocode,
các entity chính, và các thao tác ghi DB, dành cho Dev/QA/SA.

**Truy vết:** F002 → N/A (headless, không có màn hình) → US010, US011, US012, US013, US014 → N/A (không có logic nền thuộc tính năng này) → ROUTE011, ROUTE012, ROUTE013, ROUTE014, ROUTE015 → N/A (chưa có test case nào)

## 1. Tổng quan

**Vấn đề:** Người mua cần xem catalog có những thương hiệu nào, còn cửa hàng cần cách kiểm soát
để giữ danh sách thương hiệu chính xác khi sản phẩm thay đổi.
**Giải pháp:** Một danh bạ thương hiệu ai cũng liệt kê và tra cứu được, cộng thêm các thao tác
tạo/cập nhật/xóa để quản lý từng dòng thương hiệu (tên, logo, liên kết tới bản dịch bản địa hóa).
**Phạm vi:** Duyệt danh sách thương hiệu và xem chi tiết một thương hiệu; tạo, cập nhật, xóa
các dòng thương hiệu; mặc định xóa mềm, có tùy chọn xóa cứng.
**Ngoài phạm vi:** Nội dung thương hiệu bản địa hóa (tên/mô tả đã dịch) thuộc về
F004_CatalogLocalization, không thuộc feature này — feature này chỉ sở hữu entity thương hiệu gốc.
Việc gán thương hiệu cho sản phẩm thuộc các feature sản phẩm, không thuộc feature này.

**Tác nhân**

| Tác nhân | Mô tả | Mục tiêu chính |
|-------|--------------|---------------|
| Khách / bất kỳ ai gọi | Bất kỳ ai truy cập catalog công khai, đã xác thực hay chưa | Duyệt danh sách thương hiệu để xem có những gì |
| Client | Người mua đã đăng nhập (role `client`) | Duyệt thương hiệu, và — theo grant quyền hiện tại lúc runtime — cũng tạo/cập nhật/xóa được |
| Admin | Quản trị viên cửa hàng (role `admin`) | Quản lý catalog thương hiệu (tạo/cập nhật/xóa các dòng thương hiệu) |

Feature này nằm trong domain catalog cùng F003_CategoryCatalogManagement và
F004_CatalogLocalization — chưa có file mô tả luồng xuyên feature riêng cho cặp này.

## 2. Khả năng chức năng

| ID | Khả năng | Người dùng làm được gì | User story | Yêu cầu | Business rule | Màn hình |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Duyệt thương hiệu | Liệt kê tất cả thương hiệu (phân trang, tìm kiếm, sắp xếp) và xem chi tiết một thương hiệu, cả hai đều kèm bản dịch bản địa hóa | US010, US011 | FR-001, FR-201, FR-202, FR-602 | BR-001, BR-002 | N/A (headless — xem § 6) |
| CAP-02 | Quản lý thương hiệu | Tạo, cập nhật, xóa các dòng thương hiệu | US012, US013, US014 | FR-301, FR-302, FR-303, FR-601 | BR-003, BR-004, BR-005 | N/A (headless — xem § 6) |

## 3. Quyết định còn mở

| D### | Quyết định | Đề xuất mặc định | Lý do | Chặn công việc |
|------|----------|-------------------|-----------|--------------|
| D001 | API lấy chi tiết thương hiệu (ROUTE012) được tài liệu ghi là công khai, nhưng hành vi thực tế lúc runtime lại yêu cầu token `Bearer` — vậy thiết kế đúng là theo tài liệu hay theo runtime? | Giữ nguyên: coi hành vi RUNTIME (yêu cầu `Bearer`) là chuẩn; sửa tài liệu ở lần sau, không sửa trong spec này. | Đổi auth lúc runtime mà chưa có quyết định từ stakeholder có nguy cơ âm thầm phá vỡ bất kỳ caller nào đang dựa vào hành vi "công khai" đã được ghi trong tài liệu. | không |
| D002 | Role `client` tạo/cập nhật/xóa được thương hiệu (không chỉ đọc) vì grant quyền role→module chỉ lọc theo tên module, không lọc theo HTTP method, và `BRANDS` nằm trong allow-list của module client — đây là chủ ý hay client nên chỉ được đọc thương hiệu? | Giữ nguyên: grant quyền hiện tại vẫn áp dụng cho đến khi stakeholder thu hẹp lại. | Thu hẹp grant là thay đổi ở tầng hệ thống phân quyền (ảnh hưởng mọi module chứ không riêng Brands), không nên quyết định trong phạm vi một spec feature. | không |

## 4. Yêu cầu

### Nền tảng (0xx)

- **FR-001** Một thương hiệu là entity catalog được lưu trữ, giữ tên, URL logo, và liên kết tới các bản dịch bản địa hóa; xóa một thương hiệu chỉ đánh dấu đã xóa chứ không phải lúc nào cũng xóa hẳn dòng dữ liệu.

### Duyệt thương hiệu (2xx)

- **FR-201** Ai cũng lấy được danh sách thương hiệu đang hoạt động (chưa xóa), có phân trang, tìm theo từ khóa, sắp xếp được, mỗi thương hiệu kèm bản dịch theo ngôn ngữ hiện tại của caller.
- **FR-202** Bất kỳ ai có session hợp lệ đều lấy được chi tiết đầy đủ một thương hiệu theo ID, kèm bản dịch theo ngôn ngữ hiện tại, hoặc nhận response not-found nếu thương hiệu không tồn tại hoặc đã bị xóa.

### Quản lý thương hiệu (3xx)

- **FR-301** Caller được phép có thể tạo thương hiệu mới bằng cách cung cấp tên và URL logo, tùy chọn liên kết tới các dòng bản dịch thương hiệu đã có.
- **FR-302** Caller được phép có thể cập nhật tên, logo, hoặc các bản dịch liên kết của một thương hiệu đã có.
- **FR-303** Caller được phép có thể xóa một thương hiệu, xóa mềm (mặc định — đánh dấu đã xóa, về nguyên tắc còn khôi phục được) hoặc xóa cứng (xóa hẳn dòng dữ liệu), tùy vào flag chỉ định rõ trong request.

### Bảo mật (6xx)

- **FR-601** Liệt kê thương hiệu không cần xác thực; mọi thao tác thương hiệu khác đều cần session `Bearer` hợp lệ, cộng với role của caller phải có quyền trên module Brands.
- **FR-602** `[UNVERIFIED]` Xem chi tiết một thương hiệu được tài liệu ghi là công khai, nhưng lúc runtime lại bị enforce là phải có `Bearer` — xem Quyết định còn mở D001.

## 5. Business rule

- Liệt kê thương hiệu mặc định lấy trang 1 với 10 mục, sắp xếp tăng dần theo ngày tạo, và lọc theo kiểu match chuỗi con không phân biệt hoa/thường trên tên khi có từ khóa; thương hiệu đã xóa mềm không bao giờ xuất hiện. (BR-001)
- Mọi thao tác đọc thương hiệu (danh sách, chi tiết) và mọi thao tác ghi thương hiệu (tạo, cập nhật) đều trả về thương hiệu kèm bản dịch giới hạn theo ngôn ngữ hiện tại của caller. (BR-002)
- Khi tạo hoặc cập nhật thương hiệu kèm ID bản dịch liên kết, hệ thống kiểm tra trước mỗi ID có trỏ tới một dòng bản dịch đang tồn tại, chưa bị xóa hay không — nếu bất kỳ ID nào không khớp, toàn bộ request bị từ chối. (BR-003)
- Xóa một thương hiệu mặc định là xóa mềm (đánh dấu đã xóa, giữ nguyên dòng dữ liệu) trừ khi caller yêu cầu rõ ràng xóa cứng, khi đó dòng dữ liệu bị xóa hẳn. (BR-004)
- `[UNVERIFIED]` Vì grant quyền role-to-module chỉ lọc theo module, không lọc theo HTTP method, nên một `client` (không chỉ `admin`) tạo/cập nhật/xóa được thương hiệu, chứ không chỉ duyệt — xem Quyết định còn mở D002. (BR-005)

## 6. Màn hình

N/A — đây là feature nền, không có màn hình hướng tới người dùng. Đây là API backend headless — repo này
không có UI/frontend. Việc truy vết cho feature này đi qua các route mà nó sở hữu:
ROUTE011 (liệt kê thương hiệu), ROUTE012 (chi tiết thương hiệu), ROUTE013 (tạo thương hiệu), ROUTE014
(cập nhật thương hiệu), ROUTE015 (xóa thương hiệu).

## 7. Các user story

### US010_ViewBrandList — Xem danh sách thương hiệu

**Tác nhân:** Khách / bất kỳ ai gọi
**Mục tiêu:** Xem tất cả thương hiệu hiện có trong catalog.
**Giá trị nghiệp vụ:** Cho phép người mua duyệt theo thương hiệu trước khi thu hẹp xuống sản phẩm cụ thể.

**Tiêu chí chấp nhận:**
- [ ] Danh sách chỉ trả về thương hiệu đang hoạt động (chưa xóa).
- [ ] Gọi API này không cần xác thực.
- [ ] Mỗi thương hiệu trong danh sách kèm bản dịch theo ngôn ngữ hiện tại của caller.

### US011_ViewBrandDetail — Xem chi tiết một thương hiệu

**Tác nhân:** Client
**Mục tiêu:** Xem thêm chi tiết về một thương hiệu cụ thể.
**Giá trị nghiệp vụ:** Cho phép người mua xác nhận chi tiết thương hiệu trước khi quyết định mua.

**Tiêu chí chấp nhận:**
- [ ] Request một ID thương hiệu đang tồn tại, chưa xóa thì trả về chi tiết đầy đủ kèm bản dịch.
- [ ] Request một ID thương hiệu không tồn tại hoặc đã xóa thì trả về response not-found.
- [ ] `[UNVERIFIED]` Lệnh gọi này lúc runtime cần session `Bearer` hợp lệ dù tài liệu ghi là công khai — xem Quyết định còn mở D001.

### US012_CreateBrand — Tạo thương hiệu mới

**Tác nhân:** Admin
**Mục tiêu:** Thêm một thương hiệu mới để nó xuất hiện trong catalog.
**Giá trị nghiệp vụ:** Giữ độ phủ thương hiệu của catalog luôn cập nhật khi có nhà sản xuất mới tham gia.

**Tiêu chí chấp nhận:**
- [ ] Payload tên + logo hợp lệ thì tạo được dòng thương hiệu mới.
- [ ] Liên kết tới ID bản dịch không tồn tại hoặc đã xóa thì request bị từ chối, không tạo thương hiệu nửa vời.
- [ ] `[UNVERIFIED]` Hiện tại caller với role `client` cũng thực hiện được hành động này — xem Quyết định còn mở D002.

### US013_UpdateBrand — Cập nhật một thương hiệu đã có

**Tác nhân:** Admin
**Mục tiêu:** Sửa hoặc cập nhật lại thông tin của một thương hiệu đã có.
**Giá trị nghiệp vụ:** Giữ thông tin catalog luôn chính xác theo thời gian.

**Tiêu chí chấp nhận:**
- [ ] Payload hợp lệ cập nhật đúng các trường của thương hiệu tương ứng.
- [ ] Cập nhật với ID bản dịch không tồn tại hoặc đã xóa thì request bị từ chối.
- [ ] `[UNVERIFIED]` Hiện tại caller với role `client` cũng thực hiện được hành động này — xem Quyết định còn mở D002.

### US014_DeleteBrand — Xóa một thương hiệu

**Tác nhân:** Admin
**Mục tiêu:** Xóa một thương hiệu không nên xuất hiện trong catalog nữa.
**Giá trị nghiệp vụ:** Giữ catalog không còn thương hiệu đã ngừng bán hoặc không hợp lệ.

**Tiêu chí chấp nhận:**
- [ ] Xóa mà không kèm flag xóa cứng thì thương hiệu bị xóa mềm (dòng dữ liệu vẫn còn, được đánh dấu đã xóa).
- [ ] Xóa kèm flag xóa cứng thì dòng dữ liệu bị xóa hẳn.
- [ ] `[UNVERIFIED]` Hiện tại caller với role `client` cũng thực hiện được hành động này — xem Quyết định còn mở D002.

## 8. Kịch bản

### US010_ViewBrandList — Happy Path

**Given** catalog có nhiều thương hiệu đang hoạt động, **When** bất kỳ caller nào request
danh sách thương hiệu, **Then** họ nhận được một trang thương hiệu đang hoạt động (đã phân trang),
mỗi thương hiệu kèm bản dịch theo ngôn ngữ hiện tại của họ.

### US010_ViewBrandList — Lỗi: không khớp từ khóa

**Given** một từ khóa tìm kiếm không khớp tên thương hiệu nào, **When** caller request danh sách
với từ khóa đó, **Then** họ nhận được một trang rỗng (0 mục), không phải lỗi.

### US011_ViewBrandDetail — Happy Path

**Given** một thương hiệu đang tồn tại, chưa xóa, **When** một caller đã xác thực request nó theo ID,
**Then** họ nhận được chi tiết đầy đủ kèm bản dịch.

### US011_ViewBrandDetail — Lỗi: không tìm thấy thương hiệu

**Given** một ID thương hiệu không tồn tại hoặc đã xóa, **When** caller request nó,
**Then** hệ thống trả về "Không tìm thấy."

### US012_CreateBrand — Happy Path

**Given** tên và URL logo hợp lệ, **When** một caller được phép tạo thương hiệu,
**Then** một dòng thương hiệu mới được tạo và trả về kèm bản dịch (rỗng hoặc đã liên kết) của nó.

### US012_CreateBrand — Lỗi: liên kết bản dịch không hợp lệ

**Given** một ID bản dịch không tồn tại hoặc đã xóa, **When** một caller được phép
cố tạo thương hiệu liên kết tới ID đó, **Then** request bị từ chối và không có thương hiệu nào được tạo.

## 9. Trường hợp biên

| Kịch bản | Điều gì xảy ra | Thông báo hiển thị cho người dùng |
|----------|--------------|----------------------|
| Trùng tên thương hiệu khi tạo | Database từ chối bản trùng ở mức unique constraint | "Brand is already exists." |
| Liên kết tới ID bản dịch thuộc thương hiệu khác hoặc đã xóa, lúc tạo hoặc cập nhật | Toàn bộ request bị từ chối trước khi có bất kỳ thao tác ghi nào | "Some brand translations do not exist." |
| Cập nhật và xóa đồng thời trên cùng một ID thương hiệu | Request nào tới database trước thì thành công; request còn lại thấy dòng dữ liệu đã mất/thay đổi và nhận lỗi not-found hoặc lỗi constraint | "Brand not found." |
| Xóa một ID thương hiệu đã bị xóa trước đó | Luồng xóa mềm không tìm thấy dòng dữ liệu chưa xóa nào khớp | "Brand not found." |
| Xóa một thương hiệu đang bị dòng khác tham chiếu (ví dụ sản phẩm) | Xóa cứng có thể fail do vi phạm foreign-key; xóa mềm luôn thành công vì nó không bao giờ xóa dòng dữ liệu | "Failed to update brand." *(khi xóa cứng gặp xung đột FK)* |

## 10. Hành vi biên cần kiểm chứng

- **FR-201** → Liệt kê với từ khóa rỗng trả về mọi thương hiệu đang hoạt động; liệt kê với từ khóa chỉ trả về thương hiệu khớp tên, chưa xóa.
- **FR-202** → Request chi tiết một thương hiệu đã xóa có hành vi giống hệt request một ID không tồn tại (not-found), không bao giờ tiết lộ rằng nó từng tồn tại.
- **FR-301** → Tạo thương hiệu không kèm `brandTranslationIds` vẫn thành công và trả về mảng bản dịch rỗng.
- **FR-303** → Xóa mà không kèm `isHardDelete` thì dòng dữ liệu vẫn truy vấn được nếu tra cứu trực tiếp theo ID bỏ qua bộ lọc xóa mềm (dữ liệu vẫn còn tồn tại về mặt vật lý).

## 11. Rủi ro & Vấn đề đã biết

| ID | Loại | Mô tả | Tác động | Trạng thái |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | API lấy chi tiết thương hiệu (ROUTE012) được tài liệu ghi là công khai nhưng thực tế lúc runtime lại yêu cầu token `Bearer` — tài liệu API sinh ra khiến bất kỳ bên tích hợp nào tin vào nhãn "Public" đều bị hiểu lầm. | Bên tích hợp làm theo tài liệu sẽ gặp lỗi xác thực bất ngờ ngay lần đầu gọi endpoint này mà không có xác thực. | [UNVERIFIED] |
| RISK-02 | known-issue | Grant quyền role→module chỉ lọc theo tên module, không bao giờ lọc theo HTTP method — mọi method (`GET`/`POST`/`PUT`/`DELETE`) dưới một module đã được cấp quyền đều được phép. Vì `BRANDS` nằm trong danh sách module của role `client`, tài khoản `client` tạo/cập nhật/xóa được thương hiệu, chứ không chỉ duyệt. | Bất kỳ tài khoản người mua nào cũng thay đổi được catalog thương hiệu dùng chung, chứ không riêng admin — bề mặt ghi dữ liệu rộng hơn nhiều so với những gì user story ("As an admin...") ngụ ý. | [UNVERIFIED] |

## 12. Phụ thuộc

| Phụ thuộc | Loại | Vì sao feature này cần nó | Bằng chứng |
|------------|------|-----------------------------|----------|
| F004_CatalogLocalization | feature | Response danh sách/chi tiết brand nhúng các dòng `BrandTranslation`, và tạo/cập nhật nhận `brandTranslationIds` — các ID này phải là dòng bản dịch hợp lệ đã tồn tại, do feature đó sở hữu. | FR-201, FR-301 |

## 13. Cấu hình

```text
DEFAULT_PAGE_INDEX = 1      # first page returned when no pageIndex is supplied
DEFAULT_PAGE_SIZE = 10      # number of brands per page when no pageSize is supplied
DEFAULT_ORDER = ASC         # sort direction when no order is supplied
DEFAULT_ORDER_BY = createdAt # sort field when no orderBy is supplied
```
</content>
