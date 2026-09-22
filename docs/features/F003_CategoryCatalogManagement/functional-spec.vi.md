---
authored_by: rebuild-spec
---
<!-- layout-exempt: rebuild-spec owns all docs/system|features|generated|flows paths -->
<!-- Contract: references/feature-spec-researcher-contract.md -->

# Functional Spec — F003_CategoryCatalogManagement

**Độ ưu tiên**: P1
**Loại**: ui
**Được tạo**: 2026-09-12

**Xem thêm:** [`technical-spec.vi.md`](./technical-spec.vi.md) — endpoint, trích dẫn nguồn, pseudocode,
các entity chính, và các thao tác ghi DB, dành cho Dev/QA/SA.

**Truy vết:** F003_CategoryCatalogManagement → US020, US021, US022, US023, US024 → ROUTE021, ROUTE022, ROUTE023, ROUTE024, ROUTE025

## 1. Tổng quan

**Vấn đề:** Catalog cần một cấu trúc category phân cấp (category có thể lồng dưới một category
cha) để sắp xếp và duyệt sản phẩm theo category, và cấu trúc đó phải được duy trì theo thời gian.
**Giải pháp:** Một headless REST API để duyệt danh sách/chi tiết category (gồm cả parent và
children trực tiếp của một category) và để tạo, cập nhật, xóa các category, kể cả việc đặt hoặc
đổi parent của một category.
**Phạm vi:** Duyệt category (danh sách, có thể lọc theo children trực tiếp của một parent; chi tiết một category);
tạo, cập nhật, xóa một category; duy trì liên kết parent/child tự tham chiếu.
**Ngoài phạm vi:** Nội dung name/description của category đã localize — nội dung đó và bề mặt CRUD của nó do F004 (Catalog Localization) sở hữu; tính năng này chỉ liên kết tới các ID translation có sẵn.
Liên kết product-to-category — do các tính năng product sở hữu.


**Actor**

| Actor | Mô tả | Mục tiêu chính |
|-------|--------------|---------------|
| Admin | Quản trị viên catalog, duy trì cấu trúc category | Tạo, sắp xếp, và loại bỏ category để nhóm sản phẩm dưới chúng |
| Client (authenticated) | Bất kỳ caller nào đã xác thực và có role được cấp module `CATEGORIES` (hiện tại là `admin` và `client`) | Duyệt danh sách/chi tiết category để khám phá catalog theo category |

## 2. Khả năng chức năng

| ID | Khả năng | Người dùng làm được gì | User Stories | Yêu cầu | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Duyệt Category | Xem toàn bộ danh sách category (có thể lọc theo children trực tiếp của một parent) hoặc chi tiết một category, gồm parent và children của nó | US020, US021 | FR-101, FR-201, FR-202, FR-401, FR-601 | BR-003, BR-004 | — |
| CAP-02 | Quản lý Category | Tạo, cập nhật, xóa một category, kể cả đặt/đổi parent | US022, US023, US024 | FR-001, FR-301, FR-302, FR-303 | BR-001, BR-002 | — |

## 3. Quyết định còn mở

| D### | Quyết định | Đề xuất mặc định | Lý do | Chặn công việc |
|------|----------|-------------------|-----------|--------------|
| D001 | Việc role `client` tạo/cập nhật/xóa được category (không chỉ duyệt) là chủ ý hay chỉ là hệ quả ngoài ý muốn của việc cấp quyền role→module chỉ lọc theo tên module, không lọc theo HTTP method | Giữ nguyên hiện trạng (không đổi RBAC); ghi lại hành vi thực tế | Siết write access về chỉ admin là một thay đổi RBAC có phạm vi ảnh hưởng riêng — không nên làm điều đó như tác dụng phụ của việc viết spec này | không |

## 4. Yêu cầu

### Nền tảng (0xx)

- **FR-001** Một category có thể tùy chọn tham chiếu đúng một category cha, tạo thành một
  cấu trúc category phân cấp tự tham chiếu.

### Điều hướng (1xx)

- **FR-101** Caller truy cập dữ liệu category trực tiếp qua các endpoint `/categories` — không có
  menu điều hướng (headless API) — dùng access token `Bearer` đã có sẵn từ trước.

### Duyệt Category (2xx)

- **FR-201** Liệt kê category trả về mọi category chưa xóa cùng translation của nó,
  parent (nếu có), và children trực tiếp.
- **FR-202** Lấy một category theo ID trả về translation, parent, và children trực tiếp của
  category đó, hoặc trả về not-found nếu ID không khớp category nào chưa xóa.

### Quản lý Category (3xx)

- **FR-301** Tạo một category cần một name và chấp nhận thêm logo URL, parent
  category, và các translation link — tất cả đều tùy chọn.
- **FR-302** Cập nhật một category chấp nhận bất kỳ tập con nào của name/logo/parent/translation link và
  chỉ đổi các field được truyền vào.
- **FR-303** Xóa một category loại nó khỏi mọi lần đọc sau này mà không xóa hẳn row.

### Tương tác (4xx)

- **FR-401** Lọc danh sách category theo một parent category ID chỉ trả về children trực tiếp của
  category đó.

### Bảo mật (6xx)

- **FR-601** Mọi endpoint category — kể cả hai view chỉ đọc là list và detail — đều yêu cầu một
  access token `Bearer` hợp lệ; không có quyền truy cập public/anonymous vào dữ liệu category.

## 5. Business Rules

- Mỗi mục `categoryTranslationIds` truyền vào khi tạo/cập nhật phải tham chiếu một row translation còn tồn tại,
  chưa xóa, nếu không request bị từ chối. (BR-001)
- Một category không thể tự đặt làm parent của chính nó. (BR-002)
- Category đã soft-delete bị loại khỏi mọi lần đọc (danh sách, chi tiết, và view parent/children của category khác); xóa một category chỉ đánh dấu đã xóa chứ không xóa hẳn row. (BR-003)
- Translation trả về cho một category chỉ giới hạn ở ngôn ngữ caller yêu cầu, hoặc trả về tất cả
  ngôn ngữ nếu không yêu cầu ngôn ngữ nào. (BR-004)

## 6. Screens

N/A — đây là tính năng nền, không có màn hình nào cho người dùng. Đây là một headless backend API — repo này
không có UI layer, và `docs/generated/screen-list.md` là một artifact "No data" rõ ràng, nên không có mã
`SCR###` nào để trích dẫn. Truy vết chạy qua các route sở hữu tính năng thay vào đó: ROUTE021 (danh sách category), ROUTE022 (chi tiết category), ROUTE023 (tạo), ROUTE024 (cập nhật), ROUTE025 (xóa).

## 7. User Stories

### US020_ViewCategoryList — Xem Danh sách Category

**Actor:** Client (authenticated)
**Mục tiêu:** Xem danh sách category.
**Giá trị nghiệp vụ:** Cho phép caller duyệt catalog theo category.

**Tiêu chí chấp nhận:**
- [ ] Mọi category chưa xóa được trả về cùng translation, parent, và children trực tiếp của nó.
- [ ] Truyền một parent category ID sẽ lọc danh sách còn children trực tiếp của category đó.
- [ ] Call bị từ chối nếu không có token `Bearer` hợp lệ.

### US021_ViewCategoryDetail — Xem Chi tiết Category

**Actor:** Client (authenticated)
**Mục tiêu:** Xem chi tiết một category.
**Giá trị nghiệp vụ:** Cho phép caller thấy chính xác một category có gì trước khi thao tác lên nó.

**Tiêu chí chấp nhận:**
- [ ] Một category ID hợp lệ, chưa xóa, trả về đầy đủ chi tiết của category đó.
- [ ] Một ID không khớp category nào chưa xóa trả về not-found.

### US022_CreateCategory — Tạo Category

**Actor:** Admin
**Mục tiêu:** Tạo một category mới.
**Giá trị nghiệp vụ:** Cho phép sắp xếp sản phẩm dưới một category mới.

**Tiêu chí chấp nhận:**
- [ ] Một payload hợp lệ tạo ra một row category mới, gán cho caller là người tạo.
- [ ] Bất kỳ mục `categoryTranslationIds` nào không hợp lệ hoặc đã soft-delete đều bị từ chối.

### US023_UpdateCategory — Cập nhật Category

**Actor:** Admin
**Mục tiêu:** Cập nhật một category có sẵn.
**Giá trị nghiệp vụ:** Giữ thông tin category chính xác theo thời gian.

**Tiêu chí chấp nhận:**
- [ ] Một payload cập nhật một phần hợp lệ chỉ đổi các field được truyền vào.
- [ ] Đặt category làm parent của chính nó sẽ bị từ chối.

### US024_DeleteCategory — Xóa Category

**Actor:** Admin
**Mục tiêu:** Xóa một category.
**Giá trị nghiệp vụ:** Để các category lỗi thời không còn dùng để sắp xếp sản phẩm nào nữa.

**Tiêu chí chấp nhận:**
- [ ] Category khớp ID được đánh dấu deleted và loại khỏi các lần đọc sau đó.
- [ ] Một ID không khớp category nào chưa xóa trả về not-found.

## 8. Scenarios

### US020_ViewCategoryList — Happy Path

**Given** một caller đã xác thực có module `CATEGORIES`, **When** họ gọi danh sách category không lọc,
**Then** họ nhận được mọi category chưa xóa cùng translation, parent, và children trực tiếp của nó.

### US020_ViewCategoryList — Error: không có token `Bearer`

**Given** không có token `Bearer` nào được truyền, **When** caller request danh sách category, **Then**
họ nhận về một response unauthorized.

### US021_ViewCategoryDetail — Happy Path

**Given** một category ID hợp lệ, chưa xóa, **When** caller request chi tiết category đó,
**Then** họ nhận được translation, parent, và children trực tiếp của nó.

### US021_ViewCategoryDetail — Error: ID không xác định

**Given** một ID không khớp category nào chưa xóa, **When** caller request chi tiết
category đó, **Then** họ nhận về not-found.

### US022_CreateCategory — Happy Path

**Given** một `name` hợp lệ (và logo/parent/translation link tùy chọn), **When** caller tạo
một category, **Then** một row category mới được tạo và gán cho họ.

### US022_CreateCategory — Error: liên kết translation không xác định

**Given** một mục `categoryTranslationIds` không tồn tại hoặc đã soft-delete, **When** caller
tạo một category, **Then** request bị từ chối.

### US023_UpdateCategory — Happy Path

**Given** một payload cập nhật một phần hợp lệ, **When** caller cập nhật một category có sẵn,
**Then** chỉ các field được truyền vào thay đổi, và row được gán caller là người cập nhật.

### US023_UpdateCategory — Error: self-parent

**Given** một `parentCategoryId` trùng với ID của chính category đó, **When** caller cập nhật
category, **Then** request bị từ chối.

### US024_DeleteCategory — Happy Path

**Given** một category ID hợp lệ, chưa xóa, **When** caller xóa category đó, **Then** row
được đánh dấu deleted và loại khỏi mọi lần đọc sau đó.

### US024_DeleteCategory — Error: ID không xác định

**Given** một ID không khớp category nào chưa xóa, **When** caller xóa nó,
**Then** họ nhận về not-found.

## 9. Edge Cases

| Kịch bản | Điều gì xảy ra | Thông báo cho người dùng |
|----------|--------------|----------------------|
| Filter `parentCategoryId` trong danh sách không phải một UUID hợp lệ | Request bị từ chối trước khi chạm database | "Page number must be a valid UUID v4." *(thông báo validate bị gắn nhãn sai — xem § 11 RISK-01)* |
| Một ID (detail/update/delete) không khớp category nào chưa xóa | Hệ thống báo row không tồn tại | "Category not found" |
| Một mục `categoryTranslationIds` khi create/update không tồn tại hoặc đã soft-delete | Request bị từ chối trước khi ghi | "Some category translations do not exist." |
| Một category được đặt làm parent của chính nó khi update | Request bị từ chối trước khi ghi | "A category cannot be its own parent." |
| Caller không có token `Bearer`, hoặc role của họ chưa được cấp module `CATEGORIES` | Request không bao giờ tới được handler | "Unauthorized" (thiếu/token sai) hoặc "Forbidden" (chưa cấp module) |

## 10. Edge Behaviours cần kiểm chứng

- **FR-201** → Xác nhận một category đã soft-delete không bao giờ xuất hiện trong danh sách, và cũng không xuất hiện làm
  parent hoặc child của category khác.
- **FR-202** → Xác nhận một ID không xác định hoặc đã soft-delete trả về not-found chứ không phải body rỗng.
- **FR-301** → Xác nhận một mục `categoryTranslationIds` không hợp lệ sẽ chặn toàn bộ việc tạo (không để lại
  row category dở dang nào).
- **FR-302** → Xác nhận một category không thể được cập nhật để tham chiếu chính nó làm parent.
- **FR-601** → Xác nhận cả 5 endpoint category, kể cả hai endpoint chỉ đọc,
  đều từ chối call không có token `Bearer`.

## 11. Risks & Known Issues

| ID | Loại | Mô tả | Tác động | Trạng thái |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | Tham số filter danh sách category (`parentCategoryId`) có Swagger documentation và thông báo validate đều mô tả nó là "page number" phân trang, dù nó được validate và dùng như một filter UUID parent-category | API consumer đọc Swagger docs hoặc nội dung lỗi validate sẽ hiểu sai mục đích thật của tham số | confirmed |
| RISK-02 | known-issue | Check "category không thể là parent của chính nó" khi update chỉ chặn self-reference *trực tiếp* (`id === parentCategoryId`); nó không duyệt qua cả cây, nên vẫn có thể tạo ra một chu trình nhiều cấp (parent của A là B, parent của B là A) | Một cây category bị hỏng có thể gây vòng lặp vô hạn cho bất kỳ code nào sau này duyệt cây với giả định nó không có chu trình | [INFERRED] |
| RISK-03 | risk | Vì việc cấp quyền role→module chỉ lọc theo tên module, không theo HTTP method, role `client` — chứ không chỉ `admin` — có thể tạo, cập nhật, xóa category, giống hệt như duyệt chúng | Cấu trúc category có thể bị đổi bởi bất kỳ client đã xác thực nào, không chỉ admin, trái với ý đồ phân chia user story (create/update/delete chỉ dành cho admin) | [UNVERIFIED] có chủ ý hay không — xem § 3 D001 |
| RISK-04 | known-issue | Code create/update bắt lỗi vi phạm unique-constraint của database và báo "Category is already exists."/"Category with this name already exists.", nhưng schema hiện tại không có unique constraint nào trên name của category — chỉ `CategoryTranslation` có unique constraint (trên category+language), không phải `Category` | Tên category trùng nhau thực ra không bị chặn dù thông báo lỗi ngụ ý là có; nhánh lỗi này hiện không bao giờ chạy tới | [INFERRED] |

## 12. Dependencies

| Dependency | Loại | Vì sao tính năng này cần nó | Bằng chứng |
|------------|------|-----------------------------|----------|
| F004 Catalog Localization | tính năng | Các row translation của category (name/description theo ngôn ngữ) được viết và duy trì ở đó; tính năng này chỉ liên kết tới ID translation có sẵn | BR-001 |
| Role/module permission grant | infrastructure | Quyết định caller đã xác thực nào (theo role) có quyền chạm tới bất kỳ endpoint category nào | FR-601 |

## 13. Cấu hình

N/A — tính năng này không có hằng số cấu hình nào lộ ra cho người dùng.
