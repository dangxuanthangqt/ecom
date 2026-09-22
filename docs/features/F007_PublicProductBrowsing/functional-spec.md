---
authored_by: rebuild-spec
---

# Functional Spec — F007_PublicProductBrowsing

**Priority**: P1
**Type**: ui
**Generated**: 2026-09-12

**See also:** [`technical-spec.md`](./technical-spec.md) — endpoints, Source citations, pseudocode,
key entities, and DB writes for a Dev/QA/SA audience.

**Traceability:** F007 → N/A (headless API — no screens) → US050, US051 → N/A (no background logic) → ROUTE051, ROUTE052 → N/A (no test cases generated yet)

## 1. Overview

**Problem:** A prospective buyer — whether or not they've registered an account — needs to
discover what products are for sale, see enough detail to decide whether to buy, without being
forced to log in first.
**Solution:** Two read-only, anonymous-accessible endpoints — a paginated/filterable product list
and a single product detail lookup — that return only products the seller has actually published
and that are not deleted.
**Scope:** Browsing the public catalog (list with filters/sort/pagination; single-product detail
with brand, categories, translations, and SKUs).
**Non-Scope:** Creating, updating, or deleting products (seller-owned — see F008); managing brand
or category master data (F002/F003); managing product translation text (F004); cart/order/review
actions on a product.

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Guest Shopper | An unauthenticated visitor with no account/session | Browse products and view detail without logging in |
| Registered Buyer | Any authenticated user (client/seller/admin) | Same browsing outcome — this feature applies to them identically since it never checks a role |

This feature is part of no cross-feature flow — no `flows/*.md` artifacts exist yet.

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Public Catalog Browsing | Search/filter/sort/paginate the public product list, and open one product's full detail — all without authenticating | US050, US051 | FR-001, FR-201, FR-202, FR-601 | BR-001, BR-002, BR-003, DEC-001 | N/A — headless API, no screens |

## 3. Open Decisions

None — no unresolved domain confirmations.

## 4. Requirements

### Foundation (0xx)

- **FR-001** Only products that have been published (a publish date in the past) and are not
  deleted are eligible to appear through this feature's endpoints.

### Public Product List (2xx)

- **FR-201** A visitor can list products filtered by brand, category, name (partial, case-insensitive),
  and price range, sorted by name/price/publish date/creation/update time/sales volume, and paginated.
- **FR-202** A visitor can retrieve one product's full detail — brand, categories, SKUs, and
  translations for their own locale — by its ID, or a clear "not found" outcome if it doesn't
  qualify.

### Security (6xx)

- **FR-601** Both endpoints are reachable without any authentication token — no login is required
  to browse or view a product.

## 5. Business Rules

- Only products with a `publishedAt` date that has already passed, and that are not soft-deleted,
  are ever returned by either endpoint — an unpublished, future-dated, or deleted product is
  treated the same as if it doesn't exist. (BR-001)
- A product's own translated name/description come back in the visitor's current locale when a
  translation exists for it; the brand's translated name is always returned in every language the
  brand has, not filtered to the visitor's locale — this feature does not narrow the brand's
  translation list the way it narrows the product's own. (BR-002)
- The category names shown in a product's detail are the base (untranslated) category record —
  this feature does not surface `CategoryTranslation` rows at all, even though the visitor's
  locale is known. (BR-003)
- When a visitor browses the product list, only products the seller has actually published so far
  are shown to them — a product that hasn't gone live yet is left out of the results entirely,
  the same as if it didn't exist, rather than shown with an "unavailable" marker. (DEC-001)

## 6. Screens

N/A — background feature; no user-facing screens. This is a headless backend API — see § 4
Requirements' `(ROUTE###)` references in `technical-spec.md § 2` for the two owning routes,
`GET /products` (ROUTE051) and `GET /products/:id` (ROUTE052), in place of screen codes.

### User Journey

1. A visitor calls the product list endpoint, optionally narrowing by brand, category, name, or
   price, and sorting/paging the results.
2. The visitor picks one product from the list and calls the detail endpoint with that product's
   ID.
3. The visitor sees the product's full detail — brand, categories, available SKUs, and localized
   translation — or a not-found response if the product isn't eligible to be shown.

## 7. User Stories

### US050_BrowseProductCatalog — Browse Product Catalog

**Actor:** Guest Shopper
**Goal:** Browse the public product catalog to find products to consider.
**Business value:** Lets a prospective buyer discover what's for sale without any signup friction,
widening the pool of people who can find and eventually purchase products.

**Acceptance Criteria:**
- [ ] The list is returned to an anonymous caller with no auth token.
- [ ] Only published, non-deleted products appear.
- [ ] Filters (brand, category, name, price range) and sort/pagination all apply.

### US051_ViewProductDetail — View Product Detail

**Actor:** Guest Shopper
**Goal:** View a single product's full detail to decide whether to buy it.
**Business value:** Gives a prospective buyer the information (price, brand, SKUs, description)
needed to convert browsing into a purchase decision.

**Acceptance Criteria:**
- [ ] The product matching the given ID is returned when it is published and not deleted.
- [ ] A product that doesn't exist, is unpublished, or is deleted returns a clear not-found
  outcome instead of its data.
- [ ] No auth token is required.

## 8. Scenarios

### US050_BrowseProductCatalog — Happy Path

**Given** the catalog has published products, **When** a guest calls the product list with a
brand filter and no auth token, **Then** the response contains only that brand's published
products, paginated per the request.

### US050_BrowseProductCatalog — Error: invalid filter value

**Given** a guest supplies a non-UUID value as a brand ID filter, **When** they call the product
list, **Then** the request is rejected with a validation error identifying the bad field.

### US051_ViewProductDetail — Happy Path

**Given** a product is published and not deleted, **When** a guest requests its detail by ID,
**Then** the full product detail (brand, categories, SKUs, translation) is returned.

### US051_ViewProductDetail — Error: not eligible

**Given** a product ID belongs to a deleted, unpublished, or future-published product, **When** a
guest requests its detail, **Then** a not-found response is returned instead of the product's
data.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Product ID does not exist, or exists but is soft-deleted, unpublished, or scheduled for a future publish date | The detail lookup treats it as absent | "Product not found" |
| Product ID is not a valid UUID | The request is rejected before any lookup happens | "Validation failed (uuid is expected)" |
| List called with an invalid sort field, or a filter value of the wrong type/shape | The request is rejected before querying | "orderBy must be one of: name, basePrice, virtualPrice, publishedAt, createdAt, updatedAt, sale" (or the matching field's own validation message) |
| List called with no matching products for the given filters | An empty result set is returned, not an error | "None — silent handling; the response is an empty `data` array with pagination totals of 0" |

## 10. Edge Behaviours to Verify

- **FR-001** → Confirm a product whose `publishedAt` is null, in the future, or whose
  `deletedAt` is set never appears in either the list or the detail response.
- **FR-202** → Confirm requesting a non-existent, unpublished, or deleted product ID by detail
  returns a not-found outcome rather than a 500 or the product's raw data.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | Brand translations returned with a product are never filtered to the visitor's locale (always all languages), unlike the product's own translations, which are locale-filtered. | A buyer browsing in one locale sees the brand name repeated in every language the brand has, rather than just their own — inconsistent with how the product's own name/description behave. | confirmed |
| RISK-02 | known-issue | Category names returned with a product detail are the base (untranslated) `Category.name` column — `CategoryTranslation` rows are never joined into this feature's response at all. | A buyer sees categories only in whatever language the base record was authored in, regardless of their own locale — even though the same request already resolves a locale for the product's own text. | confirmed |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F004_CatalogLocalization | feature | This feature reads the `ProductTranslation` rows F004 owns writing, to show a localized product name/description. | BR-002 |
| F002_BrandCatalogManagement | feature | Reads `Brand`/`BrandTranslation` rows owned there to show brand info on a product. | BR-002 |
| F003_CategoryCatalogManagement | feature | Reads `Category` rows owned there to show a product's categories. | BR-003 |
| F008_SellerProductManagement | feature | Both features read/write the same `Product`/`SKU` tables; this feature is the read-only public counterpart to F008's seller-scoped CRUD. | § 1 Overview |

## 13. Configuration

```text
DEFAULT_PAGE = 1     # product list starts at page 1 when no page is supplied
DEFAULT_PAGE_SIZE = 10     # number of products returned per page when no pageSize is supplied
```
