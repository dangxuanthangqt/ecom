---
authored_by: rebuild-spec
---

# F005_MediaAssetManagement — Technical Spec

**Priority**: P1
**Type**: mixed
**Generated**: 2026-09-12

**See also:** [`functional-spec.md`](./functional-spec.md) — plain-language overview, open
decisions, requirements/business rules stated in one-liners, screens, user stories, scenarios,
edge cases, and configuration for a BA/QA audience.

**How to read this file:** § 2 is the index — pick the action you care about and read its block
in § 3 straight through; each block is one complete thread, top to bottom. § 4 is the shared
appendix — jump in only when a § 3 block points you there.

## 1. Technical Overview

`MediaController` (`src/routes/media/media.controller.ts`) exposes 5 live routes that funnel
through `MediaService` (`src/routes/media/media.service.ts`) to `S3Service`
(`src/shared/services/s3.service.ts`), the sole integration point with AWS S3 (BL004). Three
routes accept uploads (single-from-disk, bulk array, named-fields), each gated by its own
Multer interceptor + validation pipe (BL009/BL011/BL012) before any byte reaches `S3Service`; two
routes manage S3 objects directly by key (presigned URL, delete). No Prisma model backs this
feature — every object is addressed purely by its S3 key.

## 2. Action Index

| # | Action (handler) | Method · Path | Codes | Writes | Detail |
|---|---|---|---|---|---|
| **A0** | *cross-cutting — belongs to no single action* | — | {FR-001, FR-601} | — | § 4.4 |
| **A1** | `MediaController#uploadLargeImageFromDisk` | `POST` `/media/upload/image` | {FR-201, BR-001, US035} | — *(S3 object write, no DB table)* | § 3.1 |
| **A2** | `MediaController#uploadArrayOfImages` | `POST` `/media/upload/array-of-images` | {FR-202, BR-002, US036} | — *(S3 object write, no DB table)* | § 3.1 |
| **A3** | `MediaController#uploadMultipleImages` | `POST` `/media/upload/multiple-images` | {FR-203, BR-003, US037} | — *(S3 object write, no DB table)* | § 3.1 |
| **A4** | `MediaController#getPresignedUrl` | `GET` `/media/presigned-url` | {FR-204, BR-004, US038} | — *(read-only — no S3 write)* | § 3.2 |
| **A5** | `MediaController#deleteMedia` | `DELETE` `/media/delete` | {FR-205, US039} | — *(S3 object delete, no DB table)* | § 3.2 |

## 3. Actions

### 3.1 CAP-01 — Direct Image Upload

#### A1 · Upload a single large image from disk
`POST` `/media/upload/image` → `` `MediaController#uploadLargeImageFromDisk` ``
`FR-201` `BR-001` · `US035`

**Who** · seller/client/admin, any authenticated caller *(gate A0 — § 4.4)*
**Request** · multipart field `image` *(single file)*
**BE** · `` `MediaService#uploadLargeImageFromDisk` `` reads `path`/`originalname`/`mimetype` off
the Multer-written temp file and calls `S3Service#uploadLargeFileFromDisk` —
`src/routes/media/media.service.ts:29-41`
**Rule** · **BR-001 — Only allowed image MIME types/extensions may reach storage; size is
enforced separately.** `createSingleImageDiskInterceptor`'s `fileFilter` rejects any MIME type
not in `image/jpeg|png|gif|webp` or extension not in `.jpg/.jpeg/.png/.gif/.webp` before Multer
even finishes receiving the body — file size cannot be checked at this stage (an inline code
comment explains Multer's `fileFilter` runs before the body streams), so size is enforced
separately by Multer's own `limits.fileFilter` cap (`FILE_SIZE_LIMITS.IMAGE_5MB` = 5MB, the
default). `src/shared/utils/files/single-image-interceptor.util.ts:52-79` (filter), `:11-17` + `:108` (size default).
**Result** · Writes the file to S3 under `images/{name}_{timestamp}{ext}` with
`ServerSideEncryption: AES256` (multipart upload via `@aws-sdk/lib-storage`, `src/shared/services/s3.service.ts:75-185`);
the local temp file is deleted after upload (`cleanupTempFile`, `src/shared/services/s3.service.ts:259-266`). Returns
the object's public S3 URL.
**Source:** `src/routes/media/media.controller.ts:71-80` → `src/routes/media/media.service.ts:29-41` → `src/shared/services/s3.service.ts:75-185`

<!-- No diagram: below threshold — no DB table write, single synchronous S3 call. -->

---

#### A2 · Upload an array of images in one request
`POST` `/media/upload/array-of-images` → `` `MediaController#uploadArrayOfImages` ``
`FR-202` `BR-002` · `US036`

**Who** · seller/client/admin, any authenticated caller *(gate A0)*
**Request** · multipart field `files` *(array, up to 10, `FilesInterceptor("files", 10)`)*
**BE** · `` `MediaService#uploadArrayOfImagesFromBuffer` `` maps each file to
`S3Service#uploadFileFromBuffer` in parallel via `Promise.all` — `src/routes/media/media.service.ts:57-75`
**Rule** · **BR-002 — 1–10 files, each 1KB–5MB, allowed MIME/extension, name ≤255 chars, total
≤50MB.** `ArrayFilesValidationPipe` (instantiated inline at `src/routes/media/media.controller.ts:104-118`) checks:
empty-array reject, over/under count vs `maxCount=10`/`minCount=1`, per-file size vs
`maxSize=5MB`/`minSize=1KB`, MIME/extension allow-list, filename presence and ≤255-char length,
then an aggregate-size check across all files vs 50MB.
`src/shared/pipes/array-images-validation.pipe.ts:21-172` (aggregate check `:156-169`).
**Result** · Each accepted file is uploaded independently to S3 (`images/{name}_{timestamp}{ext}`,
`ServerSideEncryption: AES256`, `src/shared/services/s3.service.ts:321-377`); returns one URL per file, same order as
submitted.
**Source:** `src/routes/media/media.controller.ts:100-124` → `src/shared/pipes/array-images-validation.pipe.ts:21-172` →
`src/routes/media/media.service.ts:57-75` → `src/shared/services/s3.service.ts:321-377`

<!-- No diagram: below threshold — no DB table write, per-file S3 calls are parallel but not
     branching/async-job in the sense the diagram threshold means. -->

---

#### A3 · Upload multiple images under distinct named fields
`POST` `/media/upload/multiple-images` → `` `MediaController#uploadMultipleImages` ``
`FR-203` `BR-003` · `US037`

**Who** · seller/client/admin, any authenticated caller *(gate A0)*
**Request** · multipart fields declared by `FileFieldsInterceptor([{name:"file1",maxCount:1},
{name:"file3",maxCount:3}])` — `src/routes/media/media.controller.ts:138-146`
**BE** · `` `MediaService#uploadMultipleImagesFromBuffer` `` flattens all received fields' files
and uploads each via `S3Service#uploadFileFromBuffer` — `src/routes/media/media.service.ts:77-98`
**Rule** · **BR-003 — Each declared field is validated against its own count/size/type rules; an
undeclared field is rejected.** `MultipleFilesValidationPipe`, configured inline at
`src/routes/media/media.controller.ts:150-165` for fields `file1` (maxCount 1, ≤5MB, jpeg/png) and `file2`
(maxCount 3, ≤2MB, jpeg/png/gif, not required), checks per-field required/count/size/MIME/
extension/name, then rejects any field present in the request that the config doesn't declare.
`src/shared/pipes/multiple-images-validation.pipe.ts:21-134` (unexpected-field check `:118-129`).

**[INFERRED] field-name mismatch — see `functional-spec.md § 11` RISK-02:** the interceptor
(`src/routes/media/media.controller.ts:138-146`) declares fields `file1`/`file3`; the validation pipe
(`src/routes/media/media.controller.ts:150-165`) is configured for `file1`/`file2`. A file submitted as `file3`
clears Multer but then fails `MultipleFilesValidationPipe`'s unexpected-field check (`:118-129`,
since `file3` is absent from `this.config`); a file submitted as `file2` never reaches the pipe at
all because Multer's `FileFieldsInterceptor` only parses declared fields (`file1`/`file3`) and
silently drops anything else. Only `file1` works as apparently intended.

**Result** · Each accepted field's files are uploaded independently to S3
(`src/shared/services/s3.service.ts:321-377`); returns one URL per uploaded file, flattened across fields.
**Source:** `src/routes/media/media.controller.ts:128-176` → `src/shared/pipes/multiple-images-validation.pipe.ts:21-134` →
`src/routes/media/media.service.ts:77-98` → `src/shared/services/s3.service.ts:321-377`

<!-- No diagram: below threshold — no DB table write. The field-name mismatch above is a static
     wiring defect, not a branching runtime path worth a sequence diagram. -->

### 3.2 CAP-02 — Presigned Access & Deletion

#### A4 · Request a presigned URL
`GET` `/media/presigned-url` → `` `MediaController#getPresignedUrl` ``
`FR-204` `BR-004` · `US038`

**Who** · seller/client/admin, any authenticated caller *(gate A0)*
**Request** · query `key` *(string, S3 object key)*, `type` *(`upload` \| `download`,
`PresignedUrlQueryDto` restricts to these two via `@IsIn`, `src/dtos/media/media.dto.ts:19-27`)*
**BE** · `` `MediaService#getPresignedUrl` `` dispatches on `type` —
`type === PRESIGNED_URL_TYPE.UPLOAD` calls `S3Service#generatePresignedUploadUrl`, otherwise
calls `S3Service#generatePresignedDownloadUrl` — `src/routes/media/media.service.ts:114-135`
**Rule** · **BR-004 — Both branches refuse to hand out a URL for a key the exists-check reports as
present.** `generatePresignedUploadUrl` (`src/shared/services/s3.service.ts:610-665`) and
`generatePresignedDownloadUrl` (`src/shared/services/s3.service.ts:552-608`) both call `checkFileExists(key)` first
(`src/shared/services/s3.service.ts:671-708`, a `GetObjectCommand` probe treating `404`/`NoSuchKey` as "does not
exist") and throw 400 `"File already exists: {key}"` when it returns `true`
(`src/shared/services/s3.service.ts:568-575` upload branch call site is actually inside the download function; see
below).

**[UNVERIFIED] naming/behavior inversion on the download branch — see `functional-spec.md § 11`
RISK-01:** `generatePresignedDownloadUrl`'s exists-check (`src/shared/services/s3.service.ts:566-575`) throws exactly
when the key **does** exist — the opposite of what a download endpoint would be expected to gate
on (a download normally requires the key to exist). This reads as a copy-paste of the upload
branch's overwrite-prevention check (`src/shared/services/s3.service.ts:620-633`, which makes sense: don't hand out an
upload URL for a key already occupied) into the download function without inverting the
condition. Not confirmable from source alone whether this is intentional; recorded as observed.
**Result** · Read-only — **no S3 write**. Returns a presigned URL (`getSignedUrl`,
`@aws-sdk/s3-request-presigner`) expiring in `expiresIn` seconds (default 3600).
**Source:** `src/routes/media/media.controller.ts:187-192` → `src/routes/media/media.service.ts:114-135` →
`src/shared/services/s3.service.ts:552-608, 610-665, 671-708`

<!-- No diagram: below threshold — no DB table write, single synchronous branch-then-call. -->

---

#### A5 · Delete an uploaded media object
`DELETE` `/media/delete` → `` `MediaController#deleteMedia` ``
`FR-205` · `US039`

**Who** · seller/client/admin, any authenticated caller *(gate A0)*
**Request** · query `key` *(string, S3 object key)*
**BE** · `` `MediaService#deleteMedia` `` calls `S3Service#deleteFile` — `src/routes/media/media.service.ts:137-141`
**Rule** · A missing key is treated as already-deleted: `deleteFile` calls `checkFileExists(key)`
first (`src/shared/services/s3.service.ts:473`) but does not branch on its return value — the `DeleteObjectCommand`
runs unconditionally afterward, and S3's own delete-by-key semantics succeed even when the key is
already absent. `src/shared/services/s3.service.ts:469-496`.
**Result** · Deletes the S3 object at `key`; returns a plain success message naming the key.
**Source:** `src/routes/media/media.controller.ts:194-206` → `src/routes/media/media.service.ts:137-141` → `src/shared/services/s3.service.ts:469-496`

<!-- No diagram: below threshold — no DB table write, single synchronous S3 call. -->

### 3.3 Edge cases

| Action | Scenario | Behavior |
|---|---|---|
| A2 | Empty file array submitted | `ArrayFilesValidationPipe` throws 400 before any file reaches `MediaService` — `src/shared/pipes/array-images-validation.pipe.ts:32-40` |
| A2 | Combined file size exceeds 50MB even though each file individually passed | 400, aggregate check runs after all per-file checks — `src/shared/pipes/array-images-validation.pipe.ts:156-169` |
| A3 | File submitted under a field name absent from `MultipleFilesValidationPipe`'s config | 400 "Unexpected field" — `src/shared/pipes/multiple-images-validation.pipe.ts:118-129` |
| A4 | Presigned URL requested (either direction) for a key `checkFileExists` reports as present | 400 "File already exists" — `src/shared/services/s3.service.ts:568-575, 626-633` |
| A5 | Delete requested for a key not present in S3 | Succeeds anyway — `checkFileExists`'s return value is discarded, `src/shared/services/s3.service.ts:473` |
| A1-A5 | Missing/invalid `Bearer` token | 401, rejected before any handler body runs — see A0 § 4.4 |

## 4. Shared Foundation

### 4.1 Components

| Component | Responsibility | Used in | File |
|---|---|---|---|
| `MediaController` | HTTP entry point for all 5 live media routes | A1-A5 | `src/routes/media/media.controller.ts` |
| `MediaService` | Thin per-route pass-through to `S3Service` | A1-A5 | `src/routes/media/media.service.ts` |
| `S3Service` | Sole AWS S3 client wrapper — upload/delete/presign (BL004) | A1-A5 | `src/shared/services/s3.service.ts` |
| `ArrayFilesValidationPipe` | Bulk-array file validation (BL009) | A2 | `src/shared/pipes/array-images-validation.pipe.ts` |
| `MultipleFilesValidationPipe` | Per-named-field file validation (BL011) | A3 | `src/shared/pipes/multiple-images-validation.pipe.ts` |
| `createSingleImageDiskInterceptor` factory | Multer disk-storage interceptor + `fileFilter` (BL012) | A1 | `src/shared/utils/files/single-image-interceptor.util.ts` |

**[INFERRED] unreachable code, not wired to any live route:** `MediaService#uploadImageFromDisk`
(`src/routes/media/media.service.ts:15-27`), `#uploadImageFromBuffer` (`:43-55`), and `#uploadLargeFileFromBuffer`
(`:100-112`) are only called from the commented-out `MediaController` handlers
(`src/routes/media/media.controller.ts:41-57, 82-88`); `S3Service#smartUploadFromBuffer`
(`src/shared/services/s3.service.ts:503-546`) has no caller anywhere in the codebase. `ImageValidationPipe`
(BL010, `src/shared/pipes/image-validation.pipe.ts`) is imported and referenced only in commented
lines (`src/routes/media/media.controller.ts:27, 84`) — dead code, not attached to any live route; see § 5.3.

### 4.2 Data Model

N/A — no Prisma model backs this feature. Every media object is addressed purely by its S3
object key (`{folder}/{originalName}_{timestamp}{ext}`); no row is persisted anywhere in this
feature's own action set. `entities.md` has no MEDIA-owned entity to diagram.

#### Polymorphic Behavior

N/A — no discriminator fields in Key Entities (no Key Entities exist for this feature).

### 4.3 State Management

None. No entity or UI-local state machine — each action is a stateless request/response against
S3.

### 4.4 Shared Rules

#### Bin 3 — cross-cutting, belongs to no single action

**A0 · `FR-001` / `FR-601` — every media action requires a valid `Bearer` session, and access is
granted at the module level, not per-role.** The global access-token guard rejects any request
with a missing/invalid `Bearer` token before a handler body runs. Beyond authentication, the
`MEDIA` module is included in every seeded role's allow-list (`ADMIN`, `SELLER`, `CLIENT` all
carry it — `initial-scripts/create-permission.ts:14-30`), so all three roles reach every action in
this feature identically; there is no admin-only or seller-only media route. **Not a rule of this
feature** — the same gate applies to every module in the system.
**Source:** `initial-scripts/create-permission.ts:14-35,149-192` · `route-list.md` ROUTE036-ROUTE040

### 4.5 Algorithms & Integrations

None.

### `Server-side S3 object storage` (INT-001)
**Linked FR:** FR-001
**Used in:** A1 → A5
**Source:** `src/shared/services/s3.service.ts:1-709`
**Type:** api-call
**Target:** AWS S3, bucket/region from `AppConfigService` (`s3BucketName`/`s3Region`/
`s3AccessKey`/`s3SecretKey`)
**Payload:** file bytes (disk stream or in-memory buffer) + `Metadata.originalName`/
`Metadata.uploadedAt`; `ServerSideEncryption: AES256` on every write.
**Failure handling:** every public `S3Service` method wraps SDK failures in a generic 500
(`throwHttpException({type:"internal", ...})`), logging the original AWS error but never
surfacing it to the caller — there is no retry or dead-letter path; a failed multipart upload's
already-sent parts are abandoned (no explicit `AbortMultipartUpload` call observed).

### 4.6 Configuration

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

**Client behavior:** see
[`behavior-logic.md`](../../generated/behavior-logic.md) (client-side patterns — debounce, optimistic UI, polling, upload, realtime),
[`permissions.md`](../../system/permissions.md) (feature flags / experiments / env / locale gates),
[`screen-flow.md`](../../generated/screen-flow.md) (guards / deep-link state restoration / unsaved-changes protection).

## 5. Verification & Technical Notes

### 5.1 Technical Verification

- **SC-001** *(A1)* Uploading a valid image under the size cap returns HTTP 200 with a `url` field pointing at the S3 object (covers FR-201, BR-001).
- **SC-002** *(A2)* Uploading 1–10 valid images under the aggregate cap returns HTTP 200 with one `url` per file, in submitted order (covers FR-202, BR-002).
- **SC-003** *(A3)* Uploading under field `file1` returns HTTP 200 with a stored URL; uploading under `file2`/`file3` reproduces RISK-02 (covers FR-203, BR-003).
- **SC-004** *(A4)* Requesting a presigned upload URL for a key not yet in S3 returns HTTP 200 with a time-limited URL (covers FR-204, BR-004).
- **SC-005** *(A5)* Deleting an absent key returns HTTP 200 with a success message, not an error (covers FR-205).

#### US035_UploadSingleImage *(A1)*

**Independent Test:** POST a valid `.png` under 5MB to `/media/upload/image` with a `Bearer` token; expect HTTP 200 and a `url` in the response body.

**Acceptance Scenarios:**

1. **Given** a valid image under the size cap, **When** POSTed to `/media/upload/image`, **Then** HTTP 200 with `{ url }`.
2. **Given** a `.pdf` file, **When** POSTed to `/media/upload/image`, **Then** HTTP 400 "Invalid file type."

#### US038_GetMediaPresignedUrl *(A4)*

**Independent Test:** GET `/media/presigned-url?key=images/does-not-exist.png&type=download` with a `Bearer` token; expect HTTP 200 today only because the key genuinely does not exist (see RISK-01/BR-004 for why an existing key fails instead).

**Acceptance Scenarios:**

1. **Given** `type=upload` and a key not yet in S3, **When** GET is called, **Then** HTTP 200 with an `url`.
2. **Given** `type=download` and a key already in S3, **When** GET is called, **Then** HTTP 400 "File already exists" (RISK-01).

### 5.2 Assumptions

- *(A1, A2, A3)* Multer's temp-disk destination (`./uploads/temp`) is assumed writable by the running process; no explicit permission check was found beyond `existsSync`/`mkdirSync` at request time (`src/shared/utils/files/single-image-interceptor.util.ts:86-89`).
- *(A1-A5)* The S3 bucket is assumed to already be configured for public read on written objects, per the inline comment in `getPublicUrl()` (`src/shared/services/s3.service.ts:54-68`) — this spec does not confirm the bucket policy itself, only that the code assumes it.
- *(A4, A5)* `checkFileExists`'s 404-vs-other-error distinction (`src/shared/services/s3.service.ts:686-707`) is assumed to correctly classify every AWS credential/permission error as a "hard error" rather than "not found" — not independently verified against a live AWS account in this pass.

### 5.3 Unresolved Questions

1. **Dead service/pipe code** *(components table above)*: whether `MediaService#uploadImageFromDisk`/`#uploadImageFromBuffer`/`#uploadLargeFileFromBuffer`, `S3Service#smartUploadFromBuffer`, and `ImageValidationPipe` (BL010) are intentionally kept as a future re-enable path, or should be deleted, is not confirmable from source alone.
2. **A4 exists-check intent**: whether `generatePresignedDownloadUrl`'s exists-check (RISK-01) is a genuine design choice (e.g. "block re-issuing a download URL for content already served once") or an unnoticed copy-paste of the upload branch's overwrite guard is not confirmable from source alone.

### 5.4 Source References

| Action | Order | Symbol | Path | Purpose |
|---|---|---|---|---|
| A1-A5 | 1 | `MediaController` | `src/routes/media/media.controller.ts:1-208` | HTTP entry point for all 5 live routes |
| A1-A5 | 2 | `MediaService` | `src/routes/media/media.service.ts:1-143` | Per-route pass-through business logic |
| A1-A5 | 3 | `S3Service` | `src/shared/services/s3.service.ts:1-709` | Sole S3 integration (BL004) |
| A2 | 4 | `ArrayFilesValidationPipe` | `src/shared/pipes/array-images-validation.pipe.ts:1-174` | Bulk-array upload validation (BL009) |
| A3 | 5 | `MultipleFilesValidationPipe` | `src/shared/pipes/multiple-images-validation.pipe.ts:1-135` | Named-field upload validation (BL011) |
| A1 | 6 | `createSingleImageDiskInterceptor` | `src/shared/utils/files/single-image-interceptor.util.ts:1-180` | Disk-storage interceptor factory (BL012) |

#### Data Flow

```text
Multipart request (image/files/fieldset) -> Multer interceptor + validation pipe (per-route) ->
MediaService pass-through -> S3Service PutObject/Upload/DeleteObject/getSignedUrl -> { url | urls | message }
```

### 5.5 Artifact References

| Artifact | File | Codes Used | Reviewed |
|----------|------|------------|----------|
| System Overview | [system-overview.md](../../system/system-overview.md) | — | [x] |
| Feature List | [feature-list.md](../../generated/feature-list.md) | F005 | [x] |
| API Map | [route-list.md](../../generated/route-list.md) | ROUTE036, ROUTE037, ROUTE038, ROUTE039, ROUTE040 | [x] |
| Entities | [entities.md](../../generated/entities.md) | — | [x] |
| Screens | [functional-spec.md § 6](./functional-spec.md#6-screens) | — | [x] |
| Behavior Logic | [behavior-logic.md](../../generated/behavior-logic.md) | BL004, BL009, BL010, BL011, BL012 | [x] |
| Permissions Matrix | [permissions-matrix.md](../../generated/permissions-matrix.md) | PERM005 | [x] |
| User Stories | [user-stories.md](../../generated/user-stories.md) | US035, US036, US037, US038, US039 | [x] |
