---
authored_by: rebuild-spec
---

# F005_MediaAssetManagement — Technical Spec

**Độ ưu tiên**: P1
**Loại**: mixed
**Ngày tạo**: 2026-09-12

**Xem thêm:** [`functional-spec.vi.md`](./functional-spec.vi.md) — tổng quan bằng ngôn ngữ thường, các
quyết định còn treo, yêu cầu/quy tắc nghiệp vụ viết gọn một dòng, màn hình, user story, kịch bản,
edge case, và cấu hình dành cho đối tượng BA/QA.

**Cách đọc file này:** § 2 là mục lục — chọn action bạn quan tâm rồi đọc block tương ứng ở § 3 từ
đầu đến cuối; mỗi block là một luồng hoàn chỉnh, đọc xuôi từ trên xuống dưới. § 4 là phụ lục dùng
chung — chỉ nhảy vào khi một block ở § 3 trỏ bạn tới đó.

## 1. Tổng quan kỹ thuật

`MediaController` (`src/routes/media/media.controller.ts`) expose 5 route đang hoạt động, tất cả
đi qua `MediaService` (`src/routes/media/media.service.ts`) rồi tới `S3Service`
(`src/shared/services/s3.service.ts`), điểm tích hợp duy nhất với AWS S3 (BL004). Ba route nhận
upload (một file từ disk, mảng file, các field có tên riêng), mỗi route được chặn bởi Multer
interceptor + validation pipe riêng (BL009/BL011/BL012) trước khi bất kỳ byte nào chạm tới
`S3Service`; hai route thao tác trực tiếp với object trên S3 theo key (presigned URL, xóa). Tính
năng này không có Prisma model nào đứng sau — mọi object được định danh thuần túy bằng S3 key.

## 2. Mục lục Action

| # | Action (handler) | Method · Path | Codes | Ghi dữ liệu | Chi tiết |
|---|---|---|---|---|---|
| **A0** | *cross-cutting — không thuộc riêng action nào* | — | {FR-001, FR-601} | — | § 4.4 |
| **A1** | `MediaController#uploadLargeImageFromDisk` | `POST` `/media/upload/image` | {FR-201, BR-001, US035} | — *(ghi object S3, không có bảng DB)* | § 3.1 |
| **A2** | `MediaController#uploadArrayOfImages` | `POST` `/media/upload/array-of-images` | {FR-202, BR-002, US036} | — *(ghi object S3, không có bảng DB)* | § 3.1 |
| **A3** | `MediaController#uploadMultipleImages` | `POST` `/media/upload/multiple-images` | {FR-203, BR-003, US037} | — *(ghi object S3, không có bảng DB)* | § 3.1 |
| **A4** | `MediaController#getPresignedUrl` | `GET` `/media/presigned-url` | {FR-204, BR-004, US038} | — *(chỉ đọc — không ghi S3)* | § 3.2 |
| **A5** | `MediaController#deleteMedia` | `DELETE` `/media/delete` | {FR-205, US039} | — *(xóa object S3, không có bảng DB)* | § 3.2 |

## 3. Actions

### 3.1 CAP-01 — Upload ảnh trực tiếp

#### A1 · Upload một ảnh lớn từ disk
`POST` `/media/upload/image` → `` `MediaController#uploadLargeImageFromDisk` ``
`FR-201` `BR-001` · `US035`

**Ai gọi** · seller/client/admin, bất kỳ caller đã xác thực nào *(gate A0 — § 4.4)*
**Request** · multipart field `image` *(một file duy nhất)*
**BE** · `` `MediaService#uploadLargeImageFromDisk` `` đọc `path`/`originalname`/`mimetype` từ
file tạm mà Multer đã ghi rồi gọi `S3Service#uploadLargeFileFromDisk` —
`src/routes/media/media.service.ts:29-41`
**Rule** · **BR-001 — Chỉ MIME type/extension ảnh được cho phép mới tới được storage; kích thước
được kiểm tra riêng.** `fileFilter` của `createSingleImageDiskInterceptor` từ chối bất kỳ MIME
type nào không nằm trong `image/jpeg|png|gif|webp` hoặc extension không nằm trong
`.jpg/.jpeg/.png/.gif/.webp` trước khi Multer nhận xong body — kích thước file không kiểm tra
được ở bước này (comment inline trong code giải thích `fileFilter` của Multer chạy trước khi body
được stream), nên kích thước được kiểm tra riêng bởi cap `limits.fileFilter` của chính Multer
(`FILE_SIZE_LIMITS.IMAGE_5MB` = 5MB, giá trị mặc định).
`src/shared/utils/files/single-image-interceptor.util.ts:52-79` (filter), `:11-17` + `:108` (giá trị mặc định kích thước).
**Kết quả** · Ghi file lên S3 dưới đường dẫn `images/{name}_{timestamp}{ext}` với
`ServerSideEncryption: AES256` (multipart upload qua `@aws-sdk/lib-storage`, `src/shared/services/s3.service.ts:75-185`);
file tạm cục bộ bị xóa sau khi upload xong (`cleanupTempFile`, `src/shared/services/s3.service.ts:259-266`). Trả về
URL công khai của object trên S3.
**Source:** `src/routes/media/media.controller.ts:71-80` → `src/routes/media/media.service.ts:29-41` → `src/shared/services/s3.service.ts:75-185`

<!-- No diagram: below threshold — no DB table write, single synchronous S3 call. -->

---

#### A2 · Upload một mảng ảnh trong một request
`POST` `/media/upload/array-of-images` → `` `MediaController#uploadArrayOfImages` ``
`FR-202` `BR-002` · `US036`

**Ai gọi** · seller/client/admin, bất kỳ caller đã xác thực nào *(gate A0)*
**Request** · multipart field `files` *(mảng, tối đa 10, `FilesInterceptor("files", 10)`)*
**BE** · `` `MediaService#uploadArrayOfImagesFromBuffer` `` map mỗi file sang
`S3Service#uploadFileFromBuffer` chạy song song qua `Promise.all` — `src/routes/media/media.service.ts:57-75`
**Rule** · **BR-002 — 1–10 file, mỗi file 1KB–5MB, MIME/extension được cho phép, tên ≤255 ký tự,
tổng ≤50MB.** `ArrayFilesValidationPipe` (khởi tạo inline tại `src/routes/media/media.controller.ts:104-118`) kiểm tra:
từ chối mảng rỗng, vượt/thiếu số lượng so với `maxCount=10`/`minCount=1`, kích thước từng file so
với `maxSize=5MB`/`minSize=1KB`, allow-list MIME/extension, tên file tồn tại và độ dài ≤255 ký tự,
sau đó kiểm tra tổng kích thước gộp của tất cả file so với 50MB.
`src/shared/pipes/array-images-validation.pipe.ts:21-172` (kiểm tra tổng `:156-169`).
**Kết quả** · Mỗi file được chấp nhận được upload độc lập lên S3 (`images/{name}_{timestamp}{ext}`,
`ServerSideEncryption: AES256`, `src/shared/services/s3.service.ts:321-377`); trả về một URL cho mỗi file, đúng thứ tự
đã gửi lên.
**Source:** `src/routes/media/media.controller.ts:100-124` → `src/shared/pipes/array-images-validation.pipe.ts:21-172` →
`src/routes/media/media.service.ts:57-75` → `src/shared/services/s3.service.ts:321-377`

<!-- No diagram: below threshold — no DB table write, per-file S3 calls are parallel but not
     branching/async-job in the sense the diagram threshold means. -->

---

#### A3 · Upload nhiều ảnh dưới các field có tên riêng
`POST` `/media/upload/multiple-images` → `` `MediaController#uploadMultipleImages` ``
`FR-203` `BR-003` · `US037`

**Ai gọi** · seller/client/admin, bất kỳ caller đã xác thực nào *(gate A0)*
**Request** · các multipart field được khai báo bởi `FileFieldsInterceptor([{name:"file1",maxCount:1},
{name:"file3",maxCount:3}])` — `src/routes/media/media.controller.ts:138-146`
**BE** · `` `MediaService#uploadMultipleImagesFromBuffer` `` gộp phẳng file từ tất cả các field
nhận được rồi upload từng file qua `S3Service#uploadFileFromBuffer` — `src/routes/media/media.service.ts:77-98`
**Rule** · **BR-003 — Mỗi field được khai báo được validate theo quy tắc count/size/type riêng của
nó; một field không được khai báo sẽ bị từ chối.** `MultipleFilesValidationPipe`, cấu hình inline
tại `src/routes/media/media.controller.ts:150-165` cho field `file1` (maxCount 1, ≤5MB, jpeg/png) và `file2`
(maxCount 3, ≤2MB, jpeg/png/gif, không bắt buộc), kiểm tra theo từng field required/count/size/MIME/
extension/name, sau đó từ chối bất kỳ field nào có trong request mà config không khai báo.
`src/shared/pipes/multiple-images-validation.pipe.ts:21-134` (kiểm tra field bất ngờ `:118-129`).

**[INFERRED] lệch tên field — xem `functional-spec.md § 11` RISK-02:** interceptor
(`src/routes/media/media.controller.ts:138-146`) khai báo field `file1`/`file3`; validation pipe
(`src/routes/media/media.controller.ts:150-165`) lại được cấu hình cho `file1`/`file2`. Một file gửi dưới tên
`file3` qua được Multer nhưng sau đó fail ở bước kiểm tra field bất ngờ của
`MultipleFilesValidationPipe` (`:118-129`, vì `file3` không có trong `this.config`); một file gửi
dưới tên `file2` thậm chí không bao giờ tới được pipe vì `FileFieldsInterceptor` của Multer chỉ
parse các field đã khai báo (`file1`/`file3`) và âm thầm bỏ qua mọi field khác. Chỉ `file1` hoạt
động đúng như vẻ ngoài dự kiến.

**Kết quả** · File của mỗi field được chấp nhận được upload độc lập lên S3
(`src/shared/services/s3.service.ts:321-377`); trả về một URL cho mỗi file đã upload, gộp phẳng
qua các field.
**Source:** `src/routes/media/media.controller.ts:128-176` → `src/shared/pipes/multiple-images-validation.pipe.ts:21-134` →
`src/routes/media/media.service.ts:77-98` → `src/shared/services/s3.service.ts:321-377`

<!-- No diagram: below threshold — no DB table write. The field-name mismatch above is a static
     wiring defect, not a branching runtime path worth a sequence diagram. -->

### 3.2 CAP-02 — Truy cập bằng presigned URL & Xóa

#### A4 · Yêu cầu một presigned URL
`GET` `/media/presigned-url` → `` `MediaController#getPresignedUrl` ``
`FR-204` `BR-004` · `US038`

**Ai gọi** · seller/client/admin, bất kỳ caller đã xác thực nào *(gate A0)*
**Request** · query `key` *(string, S3 object key)*, `type` *(`upload` \| `download`,
`PresignedUrlQueryDto` giới hạn chỉ hai giá trị này qua `@IsIn`, `src/dtos/media/media.dto.ts:19-27`)*
**BE** · `` `MediaService#getPresignedUrl` `` phân nhánh theo `type` —
`type === PRESIGNED_URL_TYPE.UPLOAD` gọi `S3Service#generatePresignedUploadUrl`, ngược lại
gọi `S3Service#generatePresignedDownloadUrl` — `src/routes/media/media.service.ts:114-135`
**Rule** · **BR-004 — Cả hai nhánh đều từ chối cấp URL cho một key mà bước kiểm tra tồn tại báo là
đang có mặt.** `generatePresignedUploadUrl` (`src/shared/services/s3.service.ts:610-665`) và
`generatePresignedDownloadUrl` (`src/shared/services/s3.service.ts:552-608`) đều gọi `checkFileExists(key)` trước
(`src/shared/services/s3.service.ts:671-708`, một phép thử `GetObjectCommand` coi `404`/`NoSuchKey` là "không tồn
tại") và ném lỗi 400 `"File already exists: {key}"` khi nó trả về `true`
(`src/shared/services/s3.service.ts:568-575` — điểm gọi ở nhánh upload thật ra lại nằm bên trong hàm download; xem
bên dưới).

**[UNVERIFIED] đảo ngược tên gọi/hành vi ở nhánh download — xem `functional-spec.md § 11`
RISK-01:** bước kiểm tra tồn tại của `generatePresignedDownloadUrl` (`src/shared/services/s3.service.ts:566-575`) ném
lỗi đúng lúc key **có** tồn tại — ngược hẳn với những gì một endpoint download nên kiểm tra (một
lượt download bình thường đòi hỏi key phải tồn tại). Điều này giống như copy-paste bước kiểm tra
chống ghi đè của nhánh upload (`src/shared/services/s3.service.ts:620-633`, hợp lý vì không nên cấp URL upload
cho một key đã có sẵn) vào hàm download mà không đảo ngược điều kiện. Không thể xác nhận từ mã
nguồn liệu đây có phải chủ đích hay không; ghi lại như một hiện tượng quan sát được.
**Kết quả** · Chỉ đọc — **không ghi S3**. Trả về một presigned URL (`getSignedUrl`,
`@aws-sdk/s3-request-presigner`) hết hạn sau `expiresIn` giây (mặc định 3600).
**Source:** `src/routes/media/media.controller.ts:187-192` → `src/routes/media/media.service.ts:114-135` →
`src/shared/services/s3.service.ts:552-608, 610-665, 671-708`

<!-- No diagram: below threshold — no DB table write, single synchronous branch-then-call. -->

---

#### A5 · Xóa một object media đã upload
`DELETE` `/media/delete` → `` `MediaController#deleteMedia` ``
`FR-205` · `US039`

**Ai gọi** · seller/client/admin, bất kỳ caller đã xác thực nào *(gate A0)*
**Request** · query `key` *(string, S3 object key)*
**BE** · `` `MediaService#deleteMedia` `` gọi `S3Service#deleteFile` — `src/routes/media/media.service.ts:137-141`
**Rule** · Một key không tồn tại được coi như đã bị xóa từ trước: `deleteFile` gọi `checkFileExists(key)`
trước (`src/shared/services/s3.service.ts:473`) nhưng không phân nhánh theo giá trị trả về — `DeleteObjectCommand`
vẫn chạy vô điều kiện sau đó, và ngữ nghĩa xóa-theo-key của chính S3 vẫn thành công kể cả khi key
đã vắng mặt. `src/shared/services/s3.service.ts:469-496`.
**Kết quả** · Xóa object S3 tại `key`; trả về một message thành công đơn giản nêu tên key.
**Source:** `src/routes/media/media.controller.ts:194-206` → `src/routes/media/media.service.ts:137-141` → `src/shared/services/s3.service.ts:469-496`

<!-- No diagram: below threshold — no DB table write, single synchronous S3 call. -->

### 3.3 Edge case

| Action | Kịch bản | Hành vi |
|---|---|---|
| A2 | Gửi mảng file rỗng | `ArrayFilesValidationPipe` ném lỗi 400 trước khi bất kỳ file nào tới `MediaService` — `src/shared/pipes/array-images-validation.pipe.ts:32-40` |
| A2 | Tổng kích thước file vượt 50MB dù từng file riêng lẻ đều qua kiểm tra | 400, kiểm tra tổng chạy sau tất cả các kiểm tra từng file — `src/shared/pipes/array-images-validation.pipe.ts:156-169` |
| A3 | File gửi dưới tên field không có trong config của `MultipleFilesValidationPipe` | 400 "Unexpected field" — `src/shared/pipes/multiple-images-validation.pipe.ts:118-129` |
| A4 | Yêu cầu presigned URL (chiều nào cũng vậy) cho một key mà `checkFileExists` báo là đang tồn tại | 400 "File already exists" — `src/shared/services/s3.service.ts:568-575, 626-633` |
| A5 | Yêu cầu xóa một key không tồn tại trên S3 | Vẫn thành công — giá trị trả về của `checkFileExists` bị bỏ qua, `src/shared/services/s3.service.ts:473` |
| A1-A5 | Token `Bearer` thiếu/không hợp lệ | 401, bị từ chối trước khi bất kỳ handler nào chạy — xem A0 § 4.4 |

## 4. Nền tảng dùng chung

### 4.1 Thành phần

| Thành phần | Trách nhiệm | Dùng trong | File |
|---|---|---|---|
| `MediaController` | Điểm vào HTTP cho cả 5 route media đang hoạt động | A1-A5 | `src/routes/media/media.controller.ts` |
| `MediaService` | Lớp trung gian mỏng cho từng route, chuyển tiếp tới `S3Service` | A1-A5 | `src/routes/media/media.service.ts` |
| `S3Service` | Wrapper AWS S3 client duy nhất — upload/xóa/presign (BL004) | A1-A5 | `src/shared/services/s3.service.ts` |
| `ArrayFilesValidationPipe` | Validate file khi upload theo mảng (BL009) | A2 | `src/shared/pipes/array-images-validation.pipe.ts` |
| `MultipleFilesValidationPipe` | Validate file theo từng field có tên (BL011) | A3 | `src/shared/pipes/multiple-images-validation.pipe.ts` |
| Factory `createSingleImageDiskInterceptor` | Interceptor lưu trên disk qua Multer + `fileFilter` (BL012) | A1 | `src/shared/utils/files/single-image-interceptor.util.ts` |

**[INFERRED] mã không thể chạy tới, không nối vào route nào đang hoạt động:** `MediaService#uploadImageFromDisk`
(`src/routes/media/media.service.ts:15-27`), `#uploadImageFromBuffer` (`:43-55`), và `#uploadLargeFileFromBuffer`
(`:100-112`) chỉ được gọi từ các handler `MediaController` đã bị comment (`src/routes/media/media.controller.ts:41-57, 82-88`);
`S3Service#smartUploadFromBuffer`
(`src/shared/services/s3.service.ts:503-546`) không có nơi nào trong codebase gọi tới. `ImageValidationPipe`
(BL010, `src/shared/pipes/image-validation.pipe.ts`) chỉ được import và tham chiếu trong các dòng bị comment
(`src/routes/media/media.controller.ts:27, 84`) — mã chết, không gắn vào route nào đang hoạt động; xem § 5.3.

### 4.2 Mô hình dữ liệu

N/A — không có Prisma model nào đứng sau tính năng này. Mọi object media được định danh thuần túy
bằng S3 object key (`{folder}/{originalName}_{timestamp}{ext}`); không có dòng dữ liệu nào được
lưu ở bất kỳ đâu trong tập action của tính năng này. `entities.md` không có entity nào thuộc MEDIA
để vẽ.

#### Hành vi Polymorphic

N/A — không có discriminator field trong Key Entities (tính năng này không có Key Entities nào).

### 4.3 Quản lý State

Không có. Không có entity hay state machine nội bộ ở UI — mỗi action là một request/response
không trạng thái đối với S3.

### 4.4 Quy tắc dùng chung

#### Bin 3 — cross-cutting, không thuộc riêng action nào

**A0 · `FR-001` / `FR-601` — mọi action liên quan media đều yêu cầu một session `Bearer` hợp lệ,
và quyền truy cập được cấp ở cấp module, không phải theo từng vai trò.** Guard access-token toàn
cục từ chối mọi request thiếu/có token `Bearer` không hợp lệ trước khi bất kỳ handler nào chạy.
Ngoài xác thực ra, module `MEDIA` nằm trong allow-list của mọi vai trò được seed (`ADMIN`,
`SELLER`, `CLIENT` đều có nó — `initial-scripts/create-permission.ts:14-30`), nên cả ba vai trò
đều tiếp cận mọi action trong tính năng này như nhau; không có route media nào chỉ dành riêng cho
admin hay seller. **Không phải một quy tắc riêng của tính năng này** — cùng một gate này áp dụng
cho mọi module trong hệ thống.
**Source:** `initial-scripts/create-permission.ts:14-35,149-192` · `route-list.md` ROUTE036-ROUTE040

### 4.5 Thuật toán & Tích hợp

Không có.

### `Server-side S3 object storage` (INT-001)
**FR liên quan:** FR-001
**Dùng trong:** A1 → A5
**Source:** `src/shared/services/s3.service.ts:1-709`
**Loại:** api-call
**Target:** AWS S3, bucket/region lấy từ `AppConfigService` (`s3BucketName`/`s3Region`/
`s3AccessKey`/`s3SecretKey`)
**Payload:** byte của file (stream từ disk hoặc buffer trong bộ nhớ) + `Metadata.originalName`/
`Metadata.uploadedAt`; `ServerSideEncryption: AES256` trên mọi lượt ghi.
**Xử lý lỗi:** mọi method public của `S3Service` đều bọc lỗi SDK trong một lỗi 500 chung
(`throwHttpException({type:"internal", ...})`), log lại lỗi AWS gốc nhưng không bao giờ đưa nó ra
cho caller — không có đường retry hay dead-letter nào; các phần đã gửi của một multipart upload
thất bại sẽ bị bỏ dở (không quan sát thấy lời gọi `AbortMultipartUpload` tường minh nào).

### 4.6 Cấu hình

```text
FILE_SIZE_LIMITS.IMAGE_5MB = 5MB            # default Multer size cap for the single-image disk upload (A1)
ArrayFilesValidationPipe.maxCount = 10      # per-request file count cap for the array upload (A2)
ArrayFilesValidationPipe.maxSize = 5MB      # per-file size cap for the array upload (A2)
ArrayFilesValidationPipe.minSize = 1KB      # per-file minimum size for the array upload (A2)
ARRAY_UPLOAD_TOTAL_SIZE_CAP = 50MB          # aggregate size cap across all files in one array upload (A2)
MultipleFilesValidationPipe.file1.maxSize = 5MB   # named-field config, field "file1" (A3)
MultipleFilesValidationPipe.file2.maxSize = 2MB   # named-field config, field "file2" — see RISK-02 (A3)
PRESIGNED_URL_EXPIRY_SECONDS = 3600         # default expiry for both upload/download presigned URLs (A4)
```

**Hành vi phía client:** xem
[`behavior-logic.vi.md`](../../generated/behavior-logic.vi.md) (các pattern phía client — debounce, optimistic UI, polling, upload, realtime),
[`permissions.vi.md`](../../system/permissions.vi.md) (feature flag / thử nghiệm / env / gate ngôn ngữ),
[`screen-flow.vi.md`](../../generated/screen-flow.vi.md) (guard / khôi phục state qua deep-link / bảo vệ thay đổi chưa lưu).

## 5. Kiểm chứng & Ghi chú kỹ thuật

### 5.1 Kiểm chứng kỹ thuật

- **SC-001** *(A1)* Upload một ảnh hợp lệ dưới ngưỡng kích thước trả về HTTP 200 với field `url` trỏ tới object S3 (bao phủ FR-201, BR-001).
- **SC-002** *(A2)* Upload 1–10 ảnh hợp lệ dưới ngưỡng tổng trả về HTTP 200 với một `url` cho mỗi file, đúng thứ tự đã gửi (bao phủ FR-202, BR-002).
- **SC-003** *(A3)* Upload dưới field `file1` trả về HTTP 200 với URL đã lưu; upload dưới `file2`/`file3` tái hiện lại RISK-02 (bao phủ FR-203, BR-003).
- **SC-004** *(A4)* Yêu cầu presigned upload URL cho một key chưa có trên S3 trả về HTTP 200 với một URL có thời hạn (bao phủ FR-204, BR-004).
- **SC-005** *(A5)* Xóa một key không tồn tại trả về HTTP 200 với message thành công, không phải lỗi (bao phủ FR-205).

#### US035_UploadSingleImage *(A1)*

**Test độc lập:** POST một file `.png` hợp lệ dưới 5MB tới `/media/upload/image` kèm token `Bearer`; kỳ vọng HTTP 200 và có `url` trong response body.

**Kịch bản nghiệm thu:**

1. **Given** một ảnh hợp lệ dưới ngưỡng kích thước, **When** POST tới `/media/upload/image`, **Then** HTTP 200 với `{ url }`.
2. **Given** một file `.pdf`, **When** POST tới `/media/upload/image`, **Then** HTTP 400 "Invalid file type."

#### US038_GetMediaPresignedUrl *(A4)*

**Test độc lập:** GET `/media/presigned-url?key=images/does-not-exist.png&type=download` kèm token `Bearer`; kỳ vọng HTTP 200 ở thời điểm hiện tại chỉ vì key đó thực sự không tồn tại (xem RISK-01/BR-004 để hiểu vì sao một key đang tồn tại lại fail).

**Kịch bản nghiệm thu:**

1. **Given** `type=upload` và một key chưa có trên S3, **When** gọi GET, **Then** HTTP 200 với `url`.
2. **Given** `type=download` và một key đã có trên S3, **When** gọi GET, **Then** HTTP 400 "File already exists" (RISK-01).

### 5.2 Giả định

- *(A1, A2, A3)* Thư mục tạm trên disk của Multer (`./uploads/temp`) được giả định là tiến trình đang chạy có quyền ghi; không tìm thấy kiểm tra quyền tường minh nào ngoài `existsSync`/`mkdirSync` tại thời điểm request (`src/shared/utils/files/single-image-interceptor.util.ts:86-89`).
- *(A1-A5)* Bucket S3 được giả định đã cấu hình sẵn cho phép đọc công khai với object đã ghi, theo comment inline trong `getPublicUrl()` (`src/shared/services/s3.service.ts:54-68`) — spec này không xác nhận chính sách bucket, chỉ xác nhận là code giả định như vậy.
- *(A4, A5)* Việc phân biệt 404-so-với-lỗi-khác của `checkFileExists` (`src/shared/services/s3.service.ts:686-707`) được giả định phân loại đúng mọi lỗi credential/permission của AWS thành "lỗi cứng" thay vì "không tìm thấy" — chưa được kiểm chứng độc lập với một tài khoản AWS thật trong đợt này.

### 5.3 Câu hỏi chưa giải quyết

1. **Mã service/pipe chết** *(bảng thành phần ở trên)*: liệu `MediaService#uploadImageFromDisk`/`#uploadImageFromBuffer`/`#uploadLargeFileFromBuffer`, `S3Service#smartUploadFromBuffer`, và `ImageValidationPipe` (BL010) được giữ lại có chủ đích như một đường bật lại trong tương lai, hay nên bị xóa, không thể xác nhận chỉ từ mã nguồn.
2. **Chủ đích của bước kiểm tra tồn tại ở A4**: liệu bước kiểm tra tồn tại của `generatePresignedDownloadUrl` (RISK-01) là một lựa chọn thiết kế thật sự (ví dụ "chặn việc cấp lại download URL cho nội dung đã được phục vụ một lần") hay là một lỗi copy-paste không nhận ra từ guard chống ghi đè của nhánh upload, không thể xác nhận chỉ từ mã nguồn.

### 5.4 Tham chiếu mã nguồn

| Action | Thứ tự | Symbol | Path | Mục đích |
|---|---|---|---|---|
| A1-A5 | 1 | `MediaController` | `src/routes/media/media.controller.ts:1-208` | Điểm vào HTTP cho cả 5 route đang hoạt động |
| A1-A5 | 2 | `MediaService` | `src/routes/media/media.service.ts:1-143` | Logic nghiệp vụ trung gian cho từng route |
| A1-A5 | 3 | `S3Service` | `src/shared/services/s3.service.ts:1-709` | Tích hợp S3 duy nhất (BL004) |
| A2 | 4 | `ArrayFilesValidationPipe` | `src/shared/pipes/array-images-validation.pipe.ts:1-174` | Validate upload theo mảng (BL009) |
| A3 | 5 | `MultipleFilesValidationPipe` | `src/shared/pipes/multiple-images-validation.pipe.ts:1-135` | Validate upload theo field có tên (BL011) |
| A1 | 6 | `createSingleImageDiskInterceptor` | `src/shared/utils/files/single-image-interceptor.util.ts:1-180` | Factory interceptor lưu trên disk (BL012) |

#### Luồng dữ liệu

```text
Multipart request (image/files/fieldset) -> Multer interceptor + validation pipe (per-route) ->
MediaService pass-through -> S3Service PutObject/Upload/DeleteObject/getSignedUrl -> { url | urls | message }
```

### 5.5 Tham chiếu tài liệu liên quan

| Tài liệu | File | Codes đã dùng | Đã review |
|----------|------|------------|----------|
| System Overview | [system-overview.md](../../system/system-overview.md) | — | [x] |
| Feature List | [feature-list.vi.md](../../generated/feature-list.vi.md) | F005 | [x] |
| API Map | [route-list.vi.md](../../generated/route-list.vi.md) | ROUTE036, ROUTE037, ROUTE038, ROUTE039, ROUTE040 | [x] |
| Entities | [entities.vi.md](../../generated/entities.vi.md) | — | [x] |
| Screens | [functional-spec.md § 6](./functional-spec.vi.md#6-screens) | — | [x] |
| Behavior Logic | [behavior-logic.vi.md](../../generated/behavior-logic.vi.md) | BL004, BL009, BL010, BL011, BL012 | [x] |
| Permissions Matrix | [permissions-matrix.vi.md](../../generated/permissions-matrix.vi.md) | PERM005 | [x] |
| User Stories | [user-stories.vi.md](../../generated/user-stories.vi.md) | US035, US036, US037, US038, US039 | [x] |
</content>
