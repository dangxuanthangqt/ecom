---
authored_by: rebuild-spec
---

# Functional Spec — F005_MediaAssetManagement

**Priority**: P1
**Type**: mixed
**Generated**: 2026-09-12

**Xem thêm:** [`technical-spec.vi.md`](./technical-spec.vi.md) — endpoints, trích dẫn Source, pseudocode,
các entity chính, và các thao tác ghi DB, dành cho Dev/QA/SA.

**Truy vết:** F005 → N/A (không có màn hình) → US035-US039 → BL004/BL009/BL010/BL011/BL012 → ROUTE036-ROUTE040 → TC (chưa xác định)

## 1. Tổng quan

**Vấn đề:** Seller và các caller đã xác thực khác cần một cách đáng tin cậy để đưa ảnh sản phẩm/catalog
vào và ra khỏi kho lưu trữ lâu dài, mà không bắt mỗi tính năng khác phải tự xây dựng phần
upload/validate/lưu trữ riêng của mình.
**Giải pháp:** Một module media riêng nhận upload ảnh (một file, một mảng file, hoặc nhiều field
có tên riêng), validate type/size/name của từng file trước khi lưu, lưu bytes vào S3, và
cung cấp riêng presigned URL để upload/download trực tiếp và xóa object theo key.
**Phạm vi:** Upload một ảnh từ đĩa; upload mảng ảnh hàng loạt; upload nhiều field có tên riêng;
cấp presigned URL để upload hoặc download trực tiếp; xóa một object đã lưu theo key.
**Ngoài phạm vi:** Tính năng này không theo dõi ảnh đã upload thuộc về product/catalog nào —
việc liên kết đó là trách nhiệm của caller (không có row database nào được tạo ở đây); nó cũng
không tự phục vụ hay proxy việc download file (presigned URL trỏ caller thẳng tới S3).

**Tác nhân**

| Tác nhân | Mô tả | Mục tiêu chính |
|-------|--------------|---------------|
| Seller | Người dùng đã xác thực, quản lý listing sản phẩm của chính họ | Upload/thay thế/xóa media asset cho sản phẩm của họ |
| Client | Tài khoản người mua đã xác thực | Có cùng các hành động media (module dùng chung, không chỉ dành cho seller) |
| Admin | Người dùng đã xác thực có đặc quyền | Cùng các hành động media, với cùng luật như mọi người khác |

## 2. Năng lực chức năng

| ID | Năng lực | Người dùng có thể làm gì | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Upload ảnh trực tiếp | Upload một ảnh từ đĩa, một mảng ảnh hàng loạt, hoặc nhiều ảnh dưới các field có tên riêng | US035, US036, US037 | FR-001, FR-201, FR-202, FR-203, FR-601 | BR-001, BR-002, BR-003 | N/A |
| CAP-02 | Truy cập bằng presigned & Xóa | Yêu cầu presigned URL của S3 để upload/download trực tiếp, hoặc xóa một object đã lưu theo key | US038, US039 | FR-204, FR-205 | BR-004 | N/A |

## 3. Quyết định còn treo

Không có — không tìm thấy xác nhận nghiệp vụ nào còn chưa giải quyết trong quá trình nghiên cứu tính năng này.

## 4. Requirements

### Foundation (0xx)

- **FR-001** Storage backend phải kết nối được và cấu hình đúng (region, credentials, bucket) trước khi bất kỳ request upload/download/delete nào có thể thành công.

### Screen Name — N/A (2xx)

- **FR-201** Một caller có thể upload một ảnh duy nhất từ đĩa; chỉ chấp nhận các loại/extension ảnh được phép, và file phải nằm trong giới hạn kích thước đã cấu hình.
- **FR-202** Một caller có thể upload một mảng ảnh (1–10 file) trong một request; từng file và tổng kích thước batch đều được kiểm tra trước khi bất kỳ file nào được lưu.
- **FR-203** Một caller có thể upload ảnh dưới các field có tên riêng, mỗi field có luật số lượng file/kích thước/loại riêng, và bất kỳ tên field không xác định nào đều bị từ chối.

### Interaction (4xx)

- **FR-204** Một caller có thể yêu cầu một presigned URL có giới hạn thời gian, để upload hoặc download một object key cụ thể.
- **FR-205** Một caller có thể xóa một object đã lưu theo key; xóa một key đã không còn tồn tại vẫn báo thành công.

### Security (6xx)

- **FR-601** Mọi hành động media đều yêu cầu session `Bearer` hợp lệ; quyền truy cập được cấp đồng đều cho vai trò admin, seller và client (media là module dùng chung, không giới hạn cho một vai trò).

## 5. Business Rules

- Trước khi một upload ảnh đơn đến được storage, MIME type và extension của nó phải nằm trong allow-list ảnh; kích thước file được kiểm tra riêng bởi giới hạn kích thước của chính tầng upload, không phải bởi kiểm tra này. (BR-001)
- Một upload mảng hàng loạt phải chứa 1–10 file, mỗi file từ 1KB đến 5MB, thuộc loại/extension ảnh được phép, tên hợp lệ ≤255 ký tự, và tổng batch không vượt quá 50MB. (BR-002)
- Một upload field có tên validate file của từng field khai báo độc lập theo luật số lượng/kích thước/loại của riêng field đó, và từ chối bất kỳ tên field nào route không khai báo. (BR-003)
- Một request presigned URL bị từ chối với lỗi "file already exists" bất cứ khi nào key được yêu cầu đã tồn tại trong storage — cùng một kiểm tra này chạy cho cả nhánh upload và download của request. (BR-004)

## 6. Screens

N/A — tính năng nền; không có màn hình hiển thị cho người dùng.

### Hành trình người dùng

1. Một caller upload một hoặc nhiều ảnh qua một trong ba endpoint upload; một URL đã lưu cho mỗi file được chấp nhận sẽ được trả về.
2. Riêng biệt, một caller có thể yêu cầu presigned URL cho một key cụ thể để upload/download trực tiếp với S3, hoặc xóa một key khi không còn cần nữa.

## 7. User Stories

### US035_UploadSingleImage — Upload một ảnh lớn duy nhất từ đĩa

**Actor:** Seller
**Mục tiêu:** Upload một ảnh lớn duy nhất từ đĩa để có thể gắn vào một listing sản phẩm.
**Giá trị nghiệp vụ:** Cho phép seller thêm ảnh chính vào listing mà không bị giới hạn kích thước của upload trong bộ nhớ.

**Tiêu chí nghiệm thu:**
- [ ] Chỉ chấp nhận file `image/jpeg|png|gif|webp` với extension khớp.
- [ ] URL của file đã lưu được trả về trong response.

### US036_UploadImageArray — Upload một mảng ảnh trong một request

**Actor:** Seller
**Mục tiêu:** Upload một mảng ảnh trong một request để có thể gắn nhiều ảnh vào một listing cùng lúc.
**Giá trị nghiệp vụ:** Giúp seller không phải gửi một request cho mỗi ảnh.

**Tiêu chí nghiệm thu:**
- [ ] Chấp nhận từ 1 đến 10 file mỗi request; vi phạm số lượng file, kích thước từng file, hoặc tổng kích thước đều bị từ chối.
- [ ] Trả về danh sách URL đã lưu, mỗi URL cho một file được chấp nhận.

### US037_UploadMultipleNamedImages — Upload nhiều ảnh dưới các field có tên riêng

**Actor:** Seller
**Mục tiêu:** Upload nhiều ảnh dưới các field có tên riêng để các vị trí ảnh khác nhau (ví dụ thumbnail và gallery) được điền đúng.
**Giá trị nghiệp vụ:** Cho phép caller điền hơn một "slot" ảnh trong một request, mỗi slot có luật riêng.

**Tiêu chí nghiệm thu:**
- [ ] Mỗi field khai báo được validate theo luật số lượng/kích thước/loại của riêng nó.
- [ ] Một tên field mà route không khai báo sẽ bị từ chối.

### US038_GetMediaPresignedUrl — Yêu cầu một presigned URL

**Actor:** Seller
**Mục tiêu:** Yêu cầu một presigned URL để một file có thể được upload hoặc download trực tiếp từ storage.
**Giá trị nghiệp vụ:** Cho phép caller (hoặc một client app thay mặt họ) làm việc trực tiếp với storage, mà không cần proxy bytes qua API này.

**Tiêu chí nghiệm thu:**
- [ ] Một URL có giới hạn thời gian được trả về cho key và hướng (upload hoặc download) được yêu cầu.
- [ ] `[UNVERIFIED]` — Việc URL trả về có thực sự cho phép caller hoàn tất đúng hướng dự kiến trong mọi trường hợp hay không, được nêu rõ trong § 9 Edge Cases; nhánh download có một hiện tượng bị đảo ngược đã ghi nhận (xem § 11).

### US039_DeleteMediaObject — Xóa một media object đã upload

**Actor:** Seller
**Mục tiêu:** Xóa một media object đã upload để nó không còn nằm trong storage.
**Giá trị nghiệp vụ:** Cho phép caller dọn dẹp các asset không còn cần dùng.

**Tiêu chí nghiệm thu:**
- [ ] Object tại key đã cho được gỡ khỏi storage.
- [ ] Xóa một key đã không còn tồn tại vẫn báo thành công, không phải lỗi.

## 8. Scenarios

### US035_UploadSingleImage — Happy Path

**Given** một caller đã xác thực với một file `.png` hợp lệ dưới 5MB, **When** họ upload nó lên endpoint upload ảnh đơn, **Then** file được lưu và URL của nó được trả về.

### US035_UploadSingleImage — Error: loại file không được phép

**Given** một caller đã xác thực với một file `.pdf`, **When** họ upload nó lên endpoint upload ảnh đơn, **Then** request bị từ chối với thông báo dễ hiểu "invalid file type".

### US036_UploadImageArray — Happy Path

**Given** một caller đã xác thực với 3 ảnh hợp lệ tổng cộng dưới 50MB, **When** họ upload mảng đó, **Then** cả 3 file được lưu và 3 URL được trả về.

### US036_UploadImageArray — Error: quá nhiều file

**Given** một caller đã xác thực với 12 file, **When** họ upload mảng đó, **Then** request bị từ chối với thông báo "too many files".

### US037_UploadMultipleNamedImages — Happy Path

**Given** một caller đã xác thực gửi file dưới (các) tên field mà route đã khai báo, **When** họ upload, **Then** file của từng field được validate và lưu theo luật riêng của field đó.

### US037_UploadMultipleNamedImages — Error: tên field không xác định

**Given** một caller đã xác thực gửi một file dưới tên field mà route không mong đợi, **When** họ upload, **Then** request bị từ chối với thông báo "unexpected field".

### US038_GetMediaPresignedUrl — Happy Path

**Given** một caller đã xác thực yêu cầu URL upload cho một key chưa tồn tại, **When** họ yêu cầu presigned URL, **Then** một URL upload có giới hạn thời gian được trả về.

### US038_GetMediaPresignedUrl — Error: key đã tồn tại

**Given** một caller đã xác thực yêu cầu một presigned URL (upload hoặc download) cho một key đã tồn tại trong storage, **When** họ yêu cầu, **Then** request bị từ chối với thông báo "file already exists".

### US039_DeleteMediaObject — Happy Path

**Given** một caller đã xác thực và một key đang tồn tại, **When** họ yêu cầu xóa, **Then** object bị gỡ và một thông báo thành công được trả về.

### US039_DeleteMediaObject — Error: caller chưa xác thực

**Given** một caller không có session hợp lệ, **When** họ gọi bất kỳ endpoint media nào, **Then** request bị từ chối là unauthorized.

## 9. Edge Cases

| Scenario | Điều gì xảy ra | Thông báo cho người dùng |
|----------|--------------|----------------------|
| Upload mảng gửi với zero file | Request bị từ chối trước khi bất kỳ file nào đến storage | "At least one file is required" |
| Tổng kích thước upload mảng vượt quá 50MB | Request bị từ chối dù mỗi file riêng lẻ đều nằm trong giới hạn của nó | "Total files size too large. Maximum: 50MB." |
| Upload nhiều field gửi dưới một tên field mà route không nhận ra | Request bị từ chối thẳng, không file nào được lưu | "Unexpected field: '{field name}'." |
| Presigned URL được yêu cầu (upload hoặc download) cho một key đã có trong storage | Bị từ chối thay vì tiếp tục — xem Risk về việc này ở § 11 | "File already exists: {key}" |
| Yêu cầu xóa cho một key không có trong storage | Được coi là xóa thành công, không phải lỗi | "File {key} deleted successfully." |
| Bất kỳ lệnh gọi media nào với token `Bearer` thiếu/không hợp lệ | Bị từ chối trước khi đến logic upload/storage | "Unauthorized" |

## 10. Edge Behaviours to Verify

- **FR-201** → Xác nhận chỉ các MIME type/extension ảnh được phép mới qua được upload ảnh đơn; mọi loại khác bị từ chối.
- **FR-202** → Xác nhận cả giới hạn kích thước từng file lẫn tổng kích thước đều được áp dụng trên upload mảng.
- **FR-203** → Xác nhận một tên field nằm ngoài tập route đã khai báo bị từ chối, không bị bỏ qua âm thầm.
- **FR-204** → Xác nhận kiểm tra tồn tại của presigned URL hoạt động giống nhau cho cả hướng upload và download (xem § 11 về hiện tượng đảo ngược đã biết ở phía download).
- **FR-205** → Xác nhận việc xóa một key đã không còn tồn tại vẫn trả về thành công.

## 11. Risks & Known Issues

| ID | Type | Mô tả | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | Request presigned-URL từ chối với "file already exists" chính xác khi key được yêu cầu ĐANG có trong storage — với hướng download thì điều này ngược lại: caller chỉ có thể lấy URL download cho một key CHƯA tồn tại, ngược hoàn toàn với điều một download thường cần. | Bất kỳ caller nào yêu cầu URL download cho một object thật, đã upload rồi, đều bị từ chối. | confirmed |
| RISK-02 | known-issue | Route upload nhiều field có tên đấu nối tầng nhận file để chấp nhận các field `file1`/`file3`, nhưng tầng validate lại được cấu hình cho các field `file1`/`file2` — một file gửi dưới tên `file3` qua được tầng nhận nhưng sau đó bị validate từ chối là "unexpected field", còn một file gửi dưới tên `file2` không bao giờ đến được validate vì tầng nhận không khai báo field đó. | Route upload nhiều field có tên không thể dùng được như dự định cho slot thứ hai. | confirmed |
| RISK-03 | risk | Một validator upload ảnh đơn đã bị thay thế (cho phép `image/svg+xml` ngoài allow-list đang dùng hiện tại) vẫn còn tồn tại trong codebase, không gắn với route nào hiện nay. Nếu nó được gắn lại mà không đối chiếu allow-list với các validator đang dùng hiện tại, luật upload sẽ trở nên không nhất quán giữa các route. | Chỉ là rủi ro nếu được bật lại trong tương lai; hiện chưa có caller nào bị ảnh hưởng. | confirmed |

## 12. Dependencies

| Dependency | Type | Vì sao tính năng này cần nó | Evidence |
|------------|------|-----------------------------|----------|
| AWS S3 | external-service | Mọi byte đã lưu đều nằm trong S3; mọi hành động sẽ thất bại nếu S3 không truy cập được hoặc cấu hình sai | FR-001, BR-001 |
| F001_Authentication | feature | Mọi route media đều yêu cầu session `Bearer` hợp lệ do Authentication cấp | FR-601 |
| Cấu hình storage bucket/region/credentials | config | Storage client được khởi tạo từ các giá trị này lúc startup | FR-001 |

## 13. Configuration

```text
MAX_ARRAY_UPLOAD_FILES = 10          # array upload rejects requests with more files than this
MAX_ARRAY_UPLOAD_TOTAL_SIZE_MB = 50  # array upload rejects requests whose combined size exceeds this
PRESIGNED_URL_EXPIRY_SECONDS = 3600  # a presigned URL stops working this many seconds after issuance
```
