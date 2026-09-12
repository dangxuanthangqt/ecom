---
authored_by: rebuild-spec
---
<!-- layout-exempt: rebuild-spec owns all docs/system|features|generated|flows paths -->
<!-- Contract: references/feature-spec-researcher-contract.md -->

# Functional Spec — F003_CategoryCatalogManagement

**Priority**: P1
**Type**: ui
**Generated**: 2026-09-12

**See also:** [`technical-spec.md`](./technical-spec.md) — endpoints, Source citations, pseudocode,
key entities, and DB writes for a Dev/QA/SA audience.

**Traceability:** F003_CategoryCatalogManagement → US020, US021, US022, US023, US024 → ROUTE021, ROUTE022, ROUTE023, ROUTE024, ROUTE025

## 1. Overview

**Problem:** The catalog needs a hierarchical category structure (categories can nest under a
parent category) so products can be organized and browsed by category, and that structure needs
to be maintained over time.
**Solution:** A headless REST API to browse the category list/detail (including a category's
parent and direct children) and to create, update, and delete category rows, including setting or
changing a category's parent.
**Scope:** Browsing categories (list, optionally filtered to one parent's children; single-category
detail); creating, updating, and deleting a category; maintaining the self-referential
parent/child link.
**Non-Scope:** Localized category name/description text — that content and its own CRUD surface is
owned by F004 (Catalog Localization); this feature only links to existing translation IDs.
Product-to-category association — owned by the product features.

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Admin | Catalog administrator maintaining category structure | Create, organize, and retire categories so products can be grouped under them |
| Client (authenticated) | Any authenticated API caller whose role is granted the `CATEGORIES` module (currently `admin` and `client`) | Browse the category list/detail to explore the catalog by category |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Browse Categories | View the full category list (optionally filtered to one parent's direct children) or a single category's detail, including its parent and children | US020, US021 | FR-101, FR-201, FR-202, FR-401, FR-601 | BR-003, BR-004 | — |
| CAP-02 | Manage Categories | Create, update, and delete a category, including setting/changing its parent | US022, US023, US024 | FR-001, FR-301, FR-302, FR-303 | BR-001, BR-002 | — |

## 3. Open Decisions

| D### | Decision | Default proposal | Rationale | Blocks work |
|------|----------|-------------------|-----------|--------------|
| D001 | Whether the `client` role's ability to create/update/delete categories (not just browse) is intentional, or an unintended side effect of the role→module permission grant being filtered by module name only, never by HTTP method | Ship as-is (no RBAC change); document the actual behavior | Tightening write access to admin-only is an RBAC change with its own blast radius — it should not be made as a side effect of writing this spec | no |

## 4. Requirements

### Foundation (0xx)

- **FR-001** A category may optionally reference exactly one parent category, forming a
  self-referencing hierarchy of categories.

### Navigation (1xx)

- **FR-101** A caller reaches category data directly via the `/categories` endpoints — there is no
  navigation menu (headless API) — using a previously obtained `Bearer` access token.

### Browse Categories (2xx)

- **FR-201** Listing categories returns every non-deleted category together with its
  translations, its parent (if any), and its direct children.
- **FR-202** Retrieving a category by ID returns that category's translations, parent, and direct
  children, or a not-found response when the ID does not match a non-deleted category.

### Manage Categories (3xx)

- **FR-301** Creating a category requires a name and accepts an optional logo URL, parent
  category, and translation links.
- **FR-302** Updating a category accepts any subset of name/logo/parent/translation links and
  changes only the fields supplied.
- **FR-303** Deleting a category removes it from all future reads without destroying the row.

### Interaction (4xx)

- **FR-401** Filtering the category list by a parent category ID returns only that category's
  direct children.

### Security (6xx)

- **FR-601** Every category endpoint — including the read-only list and detail views — requires a
  valid `Bearer` access token; there is no public/anonymous access to category data.

## 5. Business Rules

- Every `categoryTranslationIds` entry supplied on create/update must reference an existing,
  non-deleted translation row, or the request is rejected. (BR-001)
- A category cannot be set as its own parent. (BR-002)
- Soft-deleted categories are excluded from every read (list, detail, and any other category's
  parent/children view); deleting a category marks it deleted rather than removing the row. (BR-003)
- The translations returned for a category are limited to the caller's requested language, or all
  languages when none is requested. (BR-004)

## 6. Screens

N/A — background feature; no user-facing screens. This is a headless backend API — no UI
layer exists in this repository and `docs/generated/screen-list.md` is an explicit "No data"
artifact, so no `SCR###` code exists to cite. Traceability runs through the owning routes
instead: ROUTE021 (list categories), ROUTE022 (category detail), ROUTE023 (create), ROUTE024 (update), ROUTE025 (delete).

## 7. User Stories

### US020_ViewCategoryList — View Category List

**Actor:** Client (authenticated)
**Goal:** View the list of categories.
**Business value:** Lets a caller browse the catalog by category.

**Acceptance Criteria:**
- [ ] Every non-deleted category is returned with its translations, parent, and direct children.
- [ ] Supplying a parent category ID filters the list to that category's direct children.
- [ ] The call is rejected without a valid `Bearer` token.

### US021_ViewCategoryDetail — View Category Detail

**Actor:** Client (authenticated)
**Goal:** View a single category's detail.
**Business value:** Lets a caller see exactly what one category contains before acting on it.

**Acceptance Criteria:**
- [ ] A valid, non-deleted category ID returns that category's full detail.
- [ ] An ID that does not resolve to a non-deleted category returns a not-found response.

### US022_CreateCategory — Create Category

**Actor:** Admin
**Goal:** Create a new category.
**Business value:** Lets products be organized under a new category.

**Acceptance Criteria:**
- [ ] A valid payload creates a new category row attributed to the caller.
- [ ] Any invalid or soft-deleted `categoryTranslationIds` entry is rejected.

### US023_UpdateCategory — Update Category

**Actor:** Admin
**Goal:** Update an existing category.
**Business value:** Keeps category information accurate over time.

**Acceptance Criteria:**
- [ ] A valid partial payload updates only the supplied fields.
- [ ] Setting the category as its own parent is rejected.

### US024_DeleteCategory — Delete Category

**Actor:** Admin
**Goal:** Delete a category.
**Business value:** Lets stale categories stop organizing any products.

**Acceptance Criteria:**
- [ ] The category matching the ID is marked deleted and excluded from subsequent reads.
- [ ] An ID that does not resolve to a non-deleted category returns a not-found response.

## 8. Scenarios

### US020_ViewCategoryList — Happy Path

**Given** an authenticated caller with the `CATEGORIES` module grant, **When** they call the
category list without a filter, **Then** they receive every non-deleted category with its
translations, parent, and direct children.

### US020_ViewCategoryList — Error: no `Bearer` token

**Given** no `Bearer` token is supplied, **When** the caller requests the category list, **Then**
they receive an unauthorized response.

### US021_ViewCategoryDetail — Happy Path

**Given** a valid, non-deleted category ID, **When** the caller requests that category's detail,
**Then** they receive its translations, parent, and direct children.

### US021_ViewCategoryDetail — Error: unknown ID

**Given** an ID that does not resolve to a non-deleted category, **When** the caller requests that
category's detail, **Then** they receive a not-found response.

### US022_CreateCategory — Happy Path

**Given** a valid `name` (and optional logo/parent/translation links), **When** the caller creates
a category, **Then** a new category row is created and attributed to them.

### US022_CreateCategory — Error: unknown translation link

**Given** a `categoryTranslationIds` entry that does not exist or is soft-deleted, **When** the
caller creates a category, **Then** the request is rejected.

### US023_UpdateCategory — Happy Path

**Given** a valid partial update payload, **When** the caller updates an existing category,
**Then** only the supplied fields change and the row is attributed to them as the updater.

### US023_UpdateCategory — Error: self-parent

**Given** a `parentCategoryId` equal to the category's own ID, **When** the caller updates the
category, **Then** the request is rejected.

### US024_DeleteCategory — Happy Path

**Given** a valid, non-deleted category ID, **When** the caller deletes that category, **Then** the
row is marked deleted and excluded from every subsequent read.

### US024_DeleteCategory — Error: unknown ID

**Given** an ID that does not resolve to a non-deleted category, **When** the caller deletes it,
**Then** they receive a not-found response.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| The `parentCategoryId` list filter is not a valid UUID | The request is rejected before any database call | "Page number must be a valid UUID v4." *(mislabeled validation message — see § 11 RISK-01)* |
| An ID (detail/update/delete) does not resolve to a non-deleted category | The system reports the row as missing | "Category not found" |
| A `categoryTranslationIds` entry on create/update does not exist or is soft-deleted | The request is rejected before any write | "Some category translations do not exist." |
| A category is set as its own parent on update | The request is rejected before any write | "A category cannot be its own parent." |
| Caller has no `Bearer` token, or their role is not granted the `CATEGORIES` module | The request never reaches the handler | "Unauthorized" (no/invalid token) or "Forbidden" (module not granted) |

## 10. Edge Behaviours to Verify

- **FR-201** → Confirm a soft-deleted category never appears in the list, and never appears as
  another category's parent or child.
- **FR-202** → Confirm an unknown or soft-deleted ID returns not-found rather than an empty body.
- **FR-301** → Confirm an invalid `categoryTranslationIds` entry blocks creation entirely (no
  partial category row is left behind).
- **FR-302** → Confirm a category cannot be updated to reference itself as its own parent.
- **FR-601** → Confirm every one of the 5 category endpoints, including the two read-only ones,
  rejects a call with no `Bearer` token.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | The category-list filter parameter (`parentCategoryId`) carries Swagger documentation and a validation message that both describe it as a pagination "page number," even though it is validated and used as a parent-category UUID filter | API consumers reading the generated Swagger docs or the validation error text are misled about the parameter's real purpose | confirmed |
| RISK-02 | known-issue | The "category cannot be its own parent" check on update only rejects a *direct* self-reference (`id === parentCategoryId`); it does not walk the hierarchy, so a multi-level cycle (A's parent is B, B's parent is A) can still be created | A corrupted category tree could cause an infinite loop in any future code that walks the hierarchy assuming it is acyclic | [INFERRED] |
| RISK-03 | risk | Because the role→module permission grant filters by module name only, never by HTTP method, the `client` role — not just `admin` — can create, update, and delete categories, the same as browsing them | Category structure could be altered by any authenticated client, not only an administrator, contrary to what the user-story split (admin-only create/update/delete) implies | [UNVERIFIED] whether intentional — see § 3 D001 |
| RISK-04 | known-issue | Create/update code catches a database unique-constraint violation and reports "Category is already exists."/"Category with this name already exists.", but no unique constraint exists on a category's name in the current schema — only `CategoryTranslation` has a unique constraint (on category+language), not `Category` itself | Duplicate category names are not actually prevented despite the error message implying they are; this error branch is currently unreachable | [INFERRED] |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F004 Catalog Localization | feature | Category translation rows (name/description per language) are authored and maintained there; this feature only links existing translation IDs to a category | BR-001 |
| Role/module permission grant | infrastructure | Determines which authenticated callers (by role) can reach any category endpoint at all | FR-601 |

## 13. Configuration

N/A — no user-facing configuration constants for this feature.
