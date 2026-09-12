---
authored_by: rebuild-spec
---

# Functional Spec — F008_SellerProductManagement

**Priority**: P1
**Type**: ui
**Generated**: 2026-09-12

**See also:** [`technical-spec.md`](./technical-spec.md) — endpoints, Source citations, pseudocode,
key entities, and DB writes for a Dev/QA/SA audience.

**Traceability:** F008 → N/A (headless API, no screens) → US052, US053, US054, US055, US056 → N/A (no background logic) → ROUTE053, ROUTE054, ROUTE055, ROUTE056, ROUTE057 → N/A (no test cases generated yet)

## 1. Overview

**Problem:** A seller running their own catalog needs a way to create and maintain product
listings without being able to see or change another seller's inventory.
**Solution:** A seller-facing product management surface lets the caller list, view, create,
update, and delete the products they themselves created; an admin caller can act on any seller's
product.
**Scope:** Own-product listing/detail, own-product create, own-product update, own-product delete
— all scoped to the caller's ownership of the product.
**Non-Scope:** Browsing the public catalog (that is the buyer-facing outcome of a separate
feature), and administering brand/category catalog structure (owned by separate admin-facing
features).

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Seller | A caller with the seller role | Manage the products they themselves created |
| Admin | A caller with the admin role | Manage any seller's product on their behalf |

This feature is distinct from the buyer-facing product browsing feature — same underlying
product data, different actor and intent (ownership/maintenance vs. discovery).

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | View Own Catalog | List and inspect only the products the caller created (or, for admin, any product) | US052, US053 | FR-001, FR-002, FR-201, FR-202, FR-203, FR-204, FR-601 | BR-001 | N/A |
| CAP-02 | Maintain Own Catalog | Create, update, and delete products the caller owns | US054, US055, US056 | FR-301, FR-302, FR-303, FR-304, FR-305, FR-306 | BR-002, BR-003, BR-004, BR-005 | N/A |

## 3. Open Decisions

None — no unresolved domain confirmations.

## 4. Requirements

### Foundation (0xx)

- **FR-001** The caller must present a valid `Bearer` session to reach any manage-product action.
- **FR-002** The caller's role must carry the manage-product permission grant (seller or admin); a
  client-role caller is refused before ownership is ever evaluated.

### View Own Catalog (2xx)

- **FR-201** Listing products defaults to only the products the caller created.
- **FR-202** The list supports filtering by name, brand, category, price range, and publish
  status, plus pagination and sorting.
- **FR-203** Viewing a single product's detail returns its full data, including categories and
  SKUs.
- **FR-204** Listing or viewing a product created by a different seller is refused unless the
  caller is admin.

### Maintain Own Catalog (3xx)

- **FR-301** Creating a product requires at least one variant, and the submitted SKU list must
  exactly match the SKUs generated from those variants.
- **FR-302** Creating or updating a product requires every referenced category to exist and not be
  deleted.
- **FR-303** A newly created product is recorded as owned by its creator.
- **FR-304** Updating a product replaces its category links and reconciles its SKU list — new SKUs
  are created, existing ones updated, and SKUs no longer present are removed.
- **FR-305** Updating or deleting a product created by a different seller is refused unless the
  caller is admin.
- **FR-306** Deleting a product soft-deletes the product together with its translations and its
  SKUs, in one operation.

### Security (6xx)

- **FR-601** An admin caller bypasses the ownership fence entirely and may view, update, or delete
  any seller's product.

## 5. Business Rules

- A caller may only list, view, update, or delete a product they themselves created; a caller with
  the admin role is exempt from this check. (BR-001)
- All variant names on a product must be unique, and each variant's own option values must be
  unique. (BR-002)
- The submitted SKU list must contain exactly the SKUs generated from the product's variants — no
  extra, no missing, no mismatched value. (BR-003)
- Every category ID referenced when creating or updating a product must exist and must not be
  soft-deleted. (BR-004)
- Deleting a product soft-deletes it together with its translations and its SKUs as one operation.
  (BR-005)

## 6. Screens

N/A — background feature; no user-facing screens. This is a headless backend API — no UI
layer exists in this repository and `docs/generated/screen-list.md` is an explicit "No data"
artifact, so no `SCR###` code exists to cite. Traceability runs through the owning routes
instead: its five `/manage-product` routes — see `technical-spec.md § 2 Action Index`.

## 7. User Stories

### US052_ListOwnProducts

**Actor:** Seller
**Goal:** List the products I created so I can manage my own catalog.
**Business value:** Lets a seller keep track of their own inventory without seeing anyone else's.

**Acceptance Criteria:**
- [ ] The list defaults to only products the caller created.
- [ ] An admin caller can see any seller's products through the same endpoint.
- [ ] The list supports filtering and pagination.

### US053_ViewOwnProductDetail

**Actor:** Seller
**Goal:** View the full detail of a product I created so I can check its data.
**Business value:** Lets a seller confirm exactly what is listed before making changes.

**Acceptance Criteria:**
- [ ] Viewing a product owned by the caller returns its full detail (categories, SKUs, brand).
- [ ] Viewing a product created by a different seller is refused, unless the caller is admin.

### US054_CreateProduct

**Actor:** Seller
**Goal:** Create a new product so I can list it for sale.
**Business value:** Lets a seller add inventory to the catalog under their own ownership.

**Acceptance Criteria:**
- [ ] The new product is recorded with the caller as its creator.
- [ ] The submitted SKUs must exactly match the SKUs generated from the submitted variants.
- [ ] Every referenced category must exist and not be deleted.

### US055_UpdateOwnProduct

**Actor:** Seller
**Goal:** Update a product I created so its listing stays accurate.
**Business value:** Keeps a seller's own catalog current without touching anyone else's listings.

**Acceptance Criteria:**
- [ ] Updating a product owned by the caller succeeds and reconciles its category and SKU lists.
- [ ] Updating a product created by a different seller is refused, unless the caller is admin.

### US056_DeleteOwnProduct

**Actor:** Seller
**Goal:** Delete a product I created so it is no longer listed for sale.
**Business value:** Lets a seller retire inventory they own without admin intervention.

**Acceptance Criteria:**
- [ ] Deleting a product owned by the caller soft-deletes it, its translations, and its SKUs.
- [ ] Deleting a product created by a different seller is refused, unless the caller is admin.

## 8. Scenarios

### US052_ListOwnProducts — Happy Path

**Given** a seller has created 3 products, **When** they call the manage-product list with no
filters, **Then** they see exactly their own 3 products, paginated.

### US052_ListOwnProducts — Error: not authorized for the module

**Given** a caller holds the client role, **When** they call the manage-product list, **Then** the
request is refused before any product data is read.

### US053_ViewOwnProductDetail — Happy Path

**Given** a seller owns a product, **When** they request its detail by ID, **Then** they receive
its full data including categories and SKUs.

### US053_ViewOwnProductDetail — Error: viewing another seller's product

**Given** a seller does not own the requested product, **When** they request its detail by ID,
**Then** the request is refused.

### US054_CreateProduct — Happy Path

**Given** a seller submits a valid product with matching variants and SKUs, **When** they create
it, **Then** the product is created and owned by the caller.

### US054_CreateProduct — Error: mismatched SKUs

**Given** a seller submits SKUs that do not match the variants they declared, **When** they create
the product, **Then** the request is rejected before anything is written.

### US055_UpdateOwnProduct — Happy Path

**Given** a seller owns a product, **When** they submit an update with a changed category list and
SKU list, **Then** the product's categories and SKUs are reconciled to match the submission.

### US055_UpdateOwnProduct — Error: updating another seller's product

**Given** a seller does not own the product being updated, **When** they submit the update,
**Then** the request is refused.

### US056_DeleteOwnProduct — Happy Path

**Given** a seller owns a product, **When** they delete it, **Then** the product, its
translations, and its SKUs are all soft-deleted together.

### US056_DeleteOwnProduct — Error: deleting another seller's product

**Given** a seller does not own the product being deleted, **When** they attempt to delete it,
**Then** the request is refused.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Client-role caller calls any manage-product endpoint | Refused before ownership is ever evaluated — the role's module allowlist does not include this feature | "You do not have permission to access this resource." |
| Seller requests, updates, or deletes a product owned by a different seller | Ownership check runs after the module gate and rejects the request | "You do not have permission to interact with this product." |
| Seller creates a product with SKUs that do not match its variants | Rejected before any database write happens | "The number of SKUs does not match the correctly generated SKUs." (or a per-value mismatch message) |
| Seller creates or updates a product referencing a deleted or nonexistent category | Rejected before the product write happens | "Some categories do not exist or are deleted." |
| Seller updates or deletes a product ID that does not exist (or was already deleted) | The lookup fails and the request is rejected | "Product not found." |
| Seller submits duplicate variant names or duplicate options within one variant | Rejected before any database write happens | "All variant names must be unique. Duplicate variant names are not allowed." (or the options equivalent) |

## 10. Edge Behaviours to Verify

- **FR-201** → Confirm a fresh seller account with no products sees an empty list, not another
  seller's data.
- **FR-204** → Confirm a seller viewing another seller's product by ID is refused, and that an
  admin viewing the same product succeeds.
- **FR-301** → Confirm a create request with a SKU set that doesn't match the generated set is
  rejected before any row is written.
- **FR-304** → Confirm an update that removes a SKU from the submitted list deletes that SKU, and
  one that adds a new value creates it.
- **FR-306** → Confirm a delete soft-deletes the product's translations and SKUs in the same
  operation, not just the product row.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | The list endpoint's `isPublic` filter is meant to mean "no filter" when the caller omits it (the code comments say "get all products if not specified"), but the value transform coerces a missing/non-string input to the literal boolean `false` rather than leaving it `undefined`. The list query then takes the `isPublic === false` branch, which excludes already-published products from the default listing instead of returning everything the seller owns. | A seller who calls the list endpoint without setting `isPublic` sees fewer of their own products than expected — published ones are silently excluded. | [UNVERIFIED] — observed in source, not confirmed against a live response |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F002_BrandCatalogManagement | feature | A product's `brandId` must reference an existing brand row | FR-301 |
| F003_CategoryCatalogManagement | feature | Every category ID on create/update must exist and not be deleted (BR-004) | FR-302 |

## 13. Configuration

N/A — no user-facing configuration constants for this feature.
