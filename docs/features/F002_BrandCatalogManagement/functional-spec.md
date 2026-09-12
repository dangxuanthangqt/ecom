---
authored_by: rebuild-spec
---

# Functional Spec — F002_BrandCatalogManagement

**Priority**: P1
**Type**: ui
**Generated**: 2026-09-12

**See also:** [`technical-spec.md`](./technical-spec.md) — endpoints, Source citations, pseudocode,
key entities, and DB writes for a Dev/QA/SA audience.

**Traceability:** F002 → N/A (headless, no screens) → US010, US011, US012, US013, US014 → N/A (no background logic owned by this feature) → ROUTE011, ROUTE012, ROUTE013, ROUTE014, ROUTE015 → N/A (no test cases generated yet)

## 1. Overview

**Problem:** Shoppers need to browse which brands the catalog carries, and the store needs a
controlled way to keep that brand list accurate as products come and go.
**Solution:** A brand directory that anyone can list and look up, plus create/update/delete
operations for maintaining brand rows (name, logo, links to localized translations).
**Scope:** Browse the brand list and a brand's detail; create, update, and delete brand rows;
soft-delete by default with an optional hard-delete.
**Non-Scope:** Localized brand text (translated name/description) is owned by
F004_CatalogLocalization, not here — this feature owns only the base brand entity. Assigning
brands to products is owned by the product features, not this one.

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Guest / any caller | Anyone hitting the public catalog, authenticated or not | Browse the brand list to see what's available |
| Client | A logged-in shopper (`client` role) | Browse brands, and — per current runtime grants — also create/update/delete them |
| Admin | Store administrator (`admin` role) | Maintain the brand catalog (create/update/delete brand rows) |

This feature is part of the catalog domain alongside F003_CategoryCatalogManagement and
F004_CatalogLocalization — no dedicated cross-feature flow file exists yet for this pairing.

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Brand Browsing | List all brands (paginated, searchable, sortable) and view one brand's detail, both with localized translations attached | US010, US011 | FR-001, FR-201, FR-202, FR-602 | BR-001, BR-002 | N/A (headless — see § 6) |
| CAP-02 | Brand Administration | Create, update, and delete brand rows | US012, US013, US014 | FR-301, FR-302, FR-303, FR-601 | BR-003, BR-004, BR-005 | N/A (headless — see § 6) |

## 3. Open Decisions

| D### | Decision | Default proposal | Rationale | Blocks work |
|------|----------|-------------------|-----------|--------------|
| D001 | The brand detail lookup (ROUTE012) is documented as public but its runtime behavior requires a `Bearer` token — is the documentation or the runtime behavior the intended design? | Ship as-is: treat the RUNTIME behavior (`Bearer` required) as authoritative; fix the documentation in a follow-up, not this spec. | Changing runtime auth without a stakeholder decision risks silently breaking any caller that relied on the documented "public" behavior. | no |
| D002 | The `client` role can create, update, and delete brands (not just read) because role→module permission grants are filtered by module name only, never by HTTP method, and `BRANDS` sits in the client module allow-list — is this intentional, or should client be read-only on brands? | Ship as-is: current runtime grant stands until a stakeholder narrows it. | Narrowing the grant is a permissions-system change (affects every module, not just Brands) and should not be decided inside a single feature spec. | no |

## 4. Requirements

### Foundation (0xx)

- **FR-001** A brand is a persisted catalog entity holding a name, a logo URL, and links to its localized translations; deleting a brand marks it deleted rather than always removing the row outright.

### Brand Browsing (2xx)

- **FR-201** Anyone can retrieve a paginated, keyword-searchable, sortable list of active (non-deleted) brands, each with its translations for the caller's current language.
- **FR-202** Anyone with a valid session can retrieve one brand's full detail by ID, including its translations for the current language, or a not-found response if it doesn't exist or was deleted.

### Brand Administration (3xx)

- **FR-301** An authorized caller can create a new brand by supplying a name and logo URL, optionally linking existing brand-translation rows to it.
- **FR-302** An authorized caller can update an existing brand's name, logo, or linked translations.
- **FR-303** An authorized caller can delete a brand, either soft (default — marked deleted, recoverable in principle) or hard (row permanently removed), by an explicit flag on the request.

### Security (6xx)

- **FR-601** Listing brands requires no authentication; every other brand operation requires a valid `Bearer` session plus the caller's role holding the Brands module permission.
- **FR-602** `[UNVERIFIED]` Viewing a single brand's detail is documented as public but is enforced as `Bearer`-required at runtime — see Open Decision D001.

## 5. Business Rules

- Listing brands defaults to page 1 of 10 items, ascending order by creation date, and filters by a case-insensitive substring match on name when a keyword is given; soft-deleted brands never appear. (BR-001)
- Every brand read (list, detail) and every brand write (create, update) returns the brand together with its translations scoped to the caller's current language. (BR-002)
- Creating or updating a brand with linked translation IDs first confirms every ID names an existing, non-deleted translation row — if any ID doesn't resolve, the whole request is rejected. (BR-003)
- Deleting a brand soft-deletes it by default (marks it deleted, keeps the row) unless the caller explicitly requests a hard delete, which removes the row outright. (BR-004)
- `[UNVERIFIED]` Because role-to-module permission grants are filtered by module only, not by HTTP method, a `client` (not just an `admin`) can create, update, and delete brands, not just browse them — see Open Decision D002. (BR-005)

## 6. Screens

N/A — background feature; no user-facing screens. This is a headless backend API — no UI/frontend
exists in this repository. Traceability for this feature runs through its owning routes instead:
ROUTE011 (list brands), ROUTE012 (brand detail), ROUTE013 (create brand), ROUTE014
(update brand), ROUTE015 (delete brand).

## 7. User Stories

### US010_ViewBrandList — View the brand list

**Actor:** Guest / any caller
**Goal:** See all the brands currently available in the catalog.
**Business value:** Lets a shopper browse by brand before narrowing down to specific products.

**Acceptance Criteria:**
- [ ] The list returns only active (non-deleted) brands.
- [ ] No authentication is required to call this.
- [ ] Each brand in the list carries its translations for the caller's current language.

### US011_ViewBrandDetail — View one brand's detail

**Actor:** Client
**Goal:** See more detail about a specific brand.
**Business value:** Lets a shopper confirm brand details before deciding to buy.

**Acceptance Criteria:**
- [ ] Requesting an existing, non-deleted brand ID returns its full detail with translations.
- [ ] Requesting a missing or deleted brand ID returns a not-found response.
- [ ] `[UNVERIFIED]` This call requires a valid `Bearer` session at runtime despite being documented as public — see Open Decision D001.

### US012_CreateBrand — Create a new brand

**Actor:** Admin
**Goal:** Add a new brand so it becomes available in the catalog.
**Business value:** Keeps the catalog's brand coverage current as new manufacturers are onboarded.

**Acceptance Criteria:**
- [ ] A valid name + logo payload creates a new brand row.
- [ ] Linking non-existent or deleted translation IDs rejects the request instead of partially creating the brand.
- [ ] `[UNVERIFIED]` A `client`-role caller can also perform this action today — see Open Decision D002.

### US013_UpdateBrand — Update an existing brand

**Actor:** Admin
**Goal:** Correct or refresh an existing brand's information.
**Business value:** Keeps catalog information accurate over time.

**Acceptance Criteria:**
- [ ] A valid payload updates the matching brand's fields.
- [ ] Updating with non-existent or deleted translation IDs rejects the request.
- [ ] `[UNVERIFIED]` A `client`-role caller can also perform this action today — see Open Decision D002.

### US014_DeleteBrand — Delete a brand

**Actor:** Admin
**Goal:** Remove a brand that should no longer appear in the catalog.
**Business value:** Keeps the catalog free of discontinued or invalid brands.

**Acceptance Criteria:**
- [ ] Deleting without the hard-delete flag soft-deletes the brand (row stays, marked deleted).
- [ ] Deleting with the hard-delete flag removes the row outright.
- [ ] `[UNVERIFIED]` A `client`-role caller can also perform this action today — see Open Decision D002.

## 8. Scenarios

### US010_ViewBrandList — Happy Path

**Given** the catalog has several active brands, **When** any caller requests the brand list,
**Then** they receive a paginated page of active brands, each with translations for their
current language.

### US010_ViewBrandList — Error: no matching keyword

**Given** a search keyword that matches no brand name, **When** the caller requests the list
with that keyword, **Then** they receive an empty page (zero items), not an error.

### US011_ViewBrandDetail — Happy Path

**Given** an existing, non-deleted brand, **When** an authenticated caller requests it by ID,
**Then** they receive its full detail with translations.

### US011_ViewBrandDetail — Error: brand not found

**Given** a brand ID that does not exist or was deleted, **When** a caller requests it,
**Then** the system returns "Not found."

### US012_CreateBrand — Happy Path

**Given** a valid name and logo URL, **When** an authorized caller creates a brand,
**Then** a new brand row exists and is returned with its (empty or linked) translations.

### US012_CreateBrand — Error: invalid translation link

**Given** a translation ID that doesn't exist or was deleted, **When** an authorized caller
tries to create a brand linking that ID, **Then** the request is rejected and no brand is created.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Duplicate brand name on create | The database rejects the duplicate at the unique-constraint level | "Brand is already exists." |
| Linking a translation ID that belongs to another brand or was deleted, on create or update | The whole request is rejected before any write happens | "Some brand translations do not exist." |
| Concurrent update and delete on the same brand ID | Whichever request reaches the database first succeeds; the other sees the row already gone/changed and gets a not-found or constraint error | "Brand not found." |
| Deleting a brand ID that was already deleted | The soft-delete path finds no matching non-deleted row | "Brand not found." |
| Deleting a brand that other rows reference (e.g. products) | Hard-delete may fail on a foreign-key constraint; soft-delete always succeeds since it never removes the row | "Failed to update brand." *(on hard-delete FK conflict)* |

## 10. Edge Behaviours to Verify

- **FR-201** → Listing with an empty keyword returns all active brands; listing with a keyword returns only name-matching, non-deleted brands.
- **FR-202** → Requesting a deleted brand's detail behaves the same as requesting a non-existent ID (not-found), never exposing that it once existed.
- **FR-301** → Creating a brand without any `brandTranslationIds` succeeds and returns an empty translations array.
- **FR-303** → Deleting without `isHardDelete` leaves the row queryable by direct ID lookup bypassing the soft-delete filter (data still physically present).

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | The brand detail lookup (ROUTE012) is documented as public but actually requires a `Bearer` token at runtime — the generated API docs mislead any client integrator who trusts the "Public" label. | Integrators following the documentation will get an unexpected authentication failure the first time they call this endpoint unauthenticated. | [UNVERIFIED] |
| RISK-02 | known-issue | Role→module permission grants are filtered by module name only, never by HTTP method — every method (`GET`/`POST`/`PUT`/`DELETE`) under a granted module is allowed. Because `BRANDS` is in the `client` role's module list, a `client` account can create, update, and delete brands, not just browse them. | Any shopper account can mutate the shared brand catalog, not just an admin — a broader write surface than the user-story wording ("As an admin...") implies. | [UNVERIFIED] |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F004_CatalogLocalization | feature | Brand list/detail responses embed `BrandTranslation` rows, and create/update accept `brandTranslationIds` that must already exist as valid translation rows owned by that feature. | FR-201, FR-301 |

## 13. Configuration

```text
DEFAULT_PAGE_INDEX = 1      # first page returned when no pageIndex is supplied
DEFAULT_PAGE_SIZE = 10      # number of brands per page when no pageSize is supplied
DEFAULT_ORDER = ASC         # sort direction when no order is supplied
DEFAULT_ORDER_BY = createdAt # sort field when no orderBy is supplied
```
