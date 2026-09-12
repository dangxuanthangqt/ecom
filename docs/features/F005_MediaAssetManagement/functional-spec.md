---
authored_by: rebuild-spec
---

# Functional Spec — F005_MediaAssetManagement

**Priority**: P1
**Type**: mixed
**Generated**: 2026-09-12

**See also:** [`technical-spec.md`](./technical-spec.md) — endpoints, Source citations, pseudocode,
key entities, and DB writes for a Dev/QA/SA audience.

**Traceability:** F005 → N/A (no screens) → US035-US039 → BL004/BL009/BL010/BL011/BL012 → ROUTE036-ROUTE040 → TC (TBD)

## 1. Overview

**Problem:** Sellers and other authenticated callers need a reliable way to get product/catalog
images into and out of long-term storage, without every other feature having to own its own
upload/validation/storage plumbing.
**Solution:** A dedicated media module accepts image uploads (single, array, or multiple named
fields), validates each file's type/size/name before it is kept, stores the bytes in S3, and
separately offers presigned direct-to-S3 URLs and object deletion by key.
**Scope:** Single-image upload from disk; bulk array upload; multiple-named-field upload;
presigned URL issuance for direct upload or download; deletion of a stored object by key.
**Non-Scope:** This feature does not track which product/catalog record an uploaded image belongs
to — that link is the caller's responsibility (no database row is created here); it also does not
serve or proxy file downloads itself (a presigned URL points the caller straight at S3).

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Seller | An authenticated user managing their own product listings | Upload/replace/remove image assets for their products |
| Client | An authenticated shopper-side account | Same media actions are available (module is shared, not seller-only) |
| Admin | A privileged authenticated user | Same media actions, with the same rules as everyone else |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Direct Image Upload | Upload one image from disk, a bulk array of images, or several images under distinct named fields | US035, US036, US037 | FR-001, FR-201, FR-202, FR-203, FR-601 | BR-001, BR-002, BR-003 | N/A |
| CAP-02 | Presigned Access & Deletion | Request a presigned S3 URL to upload/download directly, or delete a stored object by key | US038, US039 | FR-204, FR-205 | BR-004 | N/A |

## 3. Open Decisions

None — no unresolved domain confirmations found while researching this feature.

## 4. Requirements

### Foundation (0xx)

- **FR-001** The storage backend must be reachable and correctly configured (region, credentials, bucket) before any upload/download/delete request can succeed.

### Screen Name — N/A (2xx)

- **FR-201** A caller can upload a single image from disk; only allowed image types/extensions are accepted, and the file must fit within the configured size limit.
- **FR-202** A caller can upload an array of images (1–10 files) in one request; each file and the total batch size are checked before any are stored.
- **FR-203** A caller can upload images under distinct named fields, where each field has its own file-count/size/type rules, and any unrecognized field name is rejected.

### Interaction (4xx)

- **FR-204** A caller can request a time-limited presigned URL for either uploading or downloading a specific object key.
- **FR-205** A caller can delete a stored object by key; deleting a key that is already gone still reports success.

### Security (6xx)

- **FR-601** Every media action requires a valid `Bearer` session; access is granted uniformly to admin, seller, and client roles (media is a shared module, not restricted to one role).

## 5. Business Rules

- Before a single-image upload reaches storage, its MIME type and extension must be on the image allow-list; file size is enforced separately by the upload layer's own size cap, not this check. (BR-001)
- A bulk array upload must contain 1–10 files, each between 1KB and 5MB, of an allowed image type/extension, with a valid name ≤255 characters, and the combined batch must not exceed 50MB. (BR-002)
- A named-field upload validates each declared field's files independently against that field's own count/size/type rules, and rejects any field name the route does not declare. (BR-003)
- A presigned-URL request is refused with a "file already exists" error whenever the requested key is already present in storage — this same check runs for both the upload and the download branch of the request. (BR-004)

## 6. Screens

N/A — background feature; no user-facing screens.

### User Journey

1. A caller uploads one or more images via one of the three upload endpoints; a stored URL for each accepted file is returned.
2. Separately, a caller may request a presigned URL against a specific key to upload/download directly with S3, or delete a key once it is no longer needed.

## 7. User Stories

### US035_UploadSingleImage — Upload a single large image from disk

**Actor:** Seller
**Goal:** Upload a single large image from disk so it can be attached to a product listing.
**Business value:** Lets a seller add a primary image to a listing without size constraints of an in-memory upload.

**Acceptance Criteria:**
- [ ] Only `image/jpeg|png|gif|webp` files with a matching extension are accepted.
- [ ] The stored file's URL is returned in the response.

### US036_UploadImageArray — Upload an array of images in one request

**Actor:** Seller
**Goal:** Upload an array of images in one request so multiple photos can be attached to a listing at once.
**Business value:** Saves the seller from making one request per photo.

**Acceptance Criteria:**
- [ ] Between 1 and 10 files are accepted per request; violating file count, per-file size, or aggregate size is rejected.
- [ ] A list of stored URLs, one per accepted file, is returned.

### US037_UploadMultipleNamedImages — Upload multiple images under distinct named fields

**Actor:** Seller
**Goal:** Upload several images under distinct named fields so different image slots (e.g. thumbnail vs. gallery) are populated correctly.
**Business value:** Lets a caller populate more than one image "slot" in a single request, each with its own rules.

**Acceptance Criteria:**
- [ ] Each declared field is validated against its own count/size/type rules.
- [ ] A field name the route does not declare is rejected.

### US038_GetMediaPresignedUrl — Request a presigned URL

**Actor:** Seller
**Goal:** Request a presigned URL so a file can be uploaded or downloaded directly against storage.
**Business value:** Lets a caller (or a client app on their behalf) talk to storage directly, without proxying bytes through this API.

**Acceptance Criteria:**
- [ ] A time-limited URL is returned for the requested key and direction (upload or download).
- [ ] `[UNVERIFIED]` — Whether the returned URL genuinely lets a caller complete the intended direction in every case is qualified in § 9 Edge Cases; the download branch has an observed inversion (see § 11).

### US039_DeleteMediaObject — Delete an uploaded media object

**Actor:** Seller
**Goal:** Delete an uploaded media object so it's removed from storage.
**Business value:** Lets a caller clean up assets that are no longer needed.

**Acceptance Criteria:**
- [ ] The object at the given key is removed from storage.
- [ ] Deleting a key that is already absent still reports success, not an error.

## 8. Scenarios

### US035_UploadSingleImage — Happy Path

**Given** an authenticated caller with a valid `.png` file under 5MB, **When** they upload it to the single-image endpoint, **Then** the file is stored and its URL is returned.

### US035_UploadSingleImage — Error: disallowed file type

**Given** an authenticated caller with a `.pdf` file, **When** they upload it to the single-image endpoint, **Then** the request is rejected with a plain-language "invalid file type" message.

### US036_UploadImageArray — Happy Path

**Given** an authenticated caller with 3 valid images totaling under 50MB, **When** they upload the array, **Then** all 3 are stored and 3 URLs are returned.

### US036_UploadImageArray — Error: too many files

**Given** an authenticated caller with 12 files, **When** they upload the array, **Then** the request is rejected with a "too many files" message.

### US037_UploadMultipleNamedImages — Happy Path

**Given** an authenticated caller sending files under the route's declared field name(s), **When** they upload, **Then** each field's files are validated and stored per that field's own rules.

### US037_UploadMultipleNamedImages — Error: unrecognized field name

**Given** an authenticated caller sending a file under a field name the route does not expect, **When** they upload, **Then** the request is rejected with an "unexpected field" message.

### US038_GetMediaPresignedUrl — Happy Path

**Given** an authenticated caller requesting an upload URL for a key that does not yet exist, **When** they request the presigned URL, **Then** a time-limited upload URL is returned.

### US038_GetMediaPresignedUrl — Error: key already exists

**Given** an authenticated caller requesting a presigned URL (upload or download) for a key that already exists in storage, **When** they request it, **Then** the request is rejected with a "file already exists" message.

### US039_DeleteMediaObject — Happy Path

**Given** an authenticated caller and an existing key, **When** they request deletion, **Then** the object is removed and a success message is returned.

### US039_DeleteMediaObject — Error: unauthenticated caller

**Given** a caller with no valid session, **When** they call any media endpoint, **Then** the request is rejected as unauthorized.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Array upload sent with zero files | The request is rejected before any file reaches storage | "At least one file is required" |
| Array upload's combined size exceeds 50MB | The request is rejected even if each individual file was within its own limit | "Total files size too large. Maximum: 50MB." |
| Multi-field upload sent under a field name the route doesn't recognize | The request is rejected outright, no files are stored | "Unexpected field: '{field name}'." |
| Presigned URL requested (upload or download) for a key already in storage | Refused instead of proceeding — see the Risk on this in § 11 | "File already exists: {key}" |
| Delete requested for a key that is not in storage | Treated as a successful deletion, not an error | "File {key} deleted successfully." |
| Any media call with a missing/invalid `Bearer` token | Rejected before reaching upload/storage logic | "Unauthorized" |

## 10. Edge Behaviours to Verify

- **FR-201** → Confirm only the allowed image MIME types/extensions pass the single-image upload; everything else is rejected.
- **FR-202** → Confirm both per-file and aggregate size limits are enforced on the array upload.
- **FR-203** → Confirm a field name outside the route's declared set is rejected, not silently ignored.
- **FR-204** → Confirm the presigned-URL exists-check behaves the same for both the upload and download direction (see § 11 for the known inversion on the download side).
- **FR-205** → Confirm deleting an already-absent key still returns success.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | The presigned-URL request rejects with "file already exists" precisely when the requested key IS present in storage — for the download direction this is backwards: a caller can only get a download URL for a key that does NOT yet exist, the opposite of what a download normally needs. | Any caller requesting a download URL for a real, already-uploaded object is refused. | confirmed |
| RISK-02 | known-issue | The multiple-named-field upload route wires its file-receiving layer to accept fields `file1`/`file3`, but its validation layer is configured for fields `file1`/`file2` — a file sent as `file3` passes the receiving layer but is then rejected as an "unexpected field" by validation, and a file sent as `file2` never reaches validation because the receiving layer doesn't declare that field at all. | The multi-named-field upload route cannot be used as apparently intended for its second slot. | confirmed |
| RISK-03 | risk | A superseded single-image validator (allowing `image/svg+xml` in addition to the currently-live allow-list) still exists in the codebase, disconnected from any route today. If it were re-attached without reconciling its allow-list against the currently-live validators, upload rules would become inconsistent across routes. | Future re-enablement risk only; no current caller is affected. | confirmed |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| AWS S3 | external-service | All stored bytes live in S3; every action fails if S3 is unreachable or misconfigured | FR-001, BR-001 |
| F001_Authentication | feature | Every media route requires a valid `Bearer` session issued by Authentication | FR-601 |
| Storage bucket/region/credentials config | config | The storage client is constructed from these values at startup | FR-001 |

## 13. Configuration

```text
MAX_ARRAY_UPLOAD_FILES = 10          # array upload rejects requests with more files than this
MAX_ARRAY_UPLOAD_TOTAL_SIZE_MB = 50  # array upload rejects requests whose combined size exceeds this
PRESIGNED_URL_EXPIRY_SECONDS = 3600  # a presigned URL stops working this many seconds after issuance
```
