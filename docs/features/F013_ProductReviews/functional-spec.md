---
authored_by: doc-writer
---

# Functional Spec — F013_ProductReviews

**Priority**: P1
**Type**: ui
**Generated**: 2026-09-12

**See also:** [`technical-spec.md`](./technical-spec.md) — endpoints, Source citations, pseudocode,
key entities, and DB writes for a Dev/QA/SA audience.

**Traceability:** F013 → N/A (headless API — no screens) → US081, US082, US083, US084 → N/A (no background logic) → ROUTE082, ROUTE083, ROUTE084, ROUTE085 → N/A (no test cases generated yet)

## 1. Overview

**Problem:** A shopper has no signal beyond the seller's own description of a product.
**Solution:** Ratings and written reviews, readable by anyone, writable only by someone whose order
for that product was actually delivered.
**Scope:** public review listing per product; create/edit/delete one's own review.
**Non-Scope:** seller replies (no Prisma model); review images (`Review` has no image column);
moderation and reporting; aggregate rating surfaced on the product read model (`Product` has no
such column — F007's public browsing is unaffected by this feature).

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Guest Shopper | Any visitor, authenticated or not | Read a product's reviews before buying |
| Verified Buyer | An authenticated user with a `DELIVERED` order for the product | Write, edit, or delete their own review of a product they actually received |

This feature depends on F012_OrderPlacement's `DELIVERED` orders and the `Order.products`
relation it populates at checkout, for purchase-verification (BR-R01).

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Public Review Reading | Read any product's reviews, newest first, without authenticating | US081 | FR-001, FR-201 | BR-R05 | N/A — headless API, no screens |
| CAP-02 | Own Review Authoring | Create, edit, and delete one's own review of a product one has actually received | US082, US083, US084 | FR-202, FR-203, FR-204 | BR-R01, BR-R02, BR-R03, BR-R04, BR-R06 | N/A — headless API, no screens |

## 3. Open Decisions

None — no unresolved domain confirmations. `clarifications.md` § Review is fully resolved; the
sole open item recorded there ("whether a seller may reply") is explicitly out of scope, not a
pending decision for this feature.

## 4. Requirements

### Foundation (0xx)

- **FR-001** Reading reviews requires no authentication; writing (create/edit/delete) requires an
  authenticated caller acting only on their own review.

### Public Review Reading (2xx)

- **FR-201** Anyone can list a product's reviews, newest first, paginated, scoped to one
  `productId`.

### Own Review Authoring (2xx, continued)

- **FR-202** A caller with a `DELIVERED` order for a product can create exactly one review of it.
- **FR-203** A caller can edit their own review's rating and/or content.
- **FR-204** A caller can delete their own review.

## 5. Business Rules

- **BR-R01 — Purchase-verified.** A review may be created only if the caller has an `Order` that
  is `DELIVERED`, not soft-deleted, and whose `products` relation includes that product.
- **BR-R02 — One per product per user.** Enforced at the database level by
  `@@unique([userId, productId])` on `Review` (migration `20260912140540_add_review_user_product_unique`).
  A second attempt is a 409, not a silent overwrite.
- **BR-R03 — Author-only writes.** Edit and delete require `Review.userId = activeUserId`.
  Another user's `reviewId` is a 404, never a 403.
- **BR-R04 — Rating range.** `rating` is an integer 1–5 inclusive; `content` is required and
  non-empty. Enforced at the DTO layer, not by a DB check constraint.
- **BR-R05 — Public read.** Listing is marked `@IsPublicApi()` and returns the author's display
  name and avatar only — never their email, phone, or account status.
- **BR-R06 — No soft delete.** `Review` carries no `deletedAt`; deletion is always a hard delete.

## 6. Screens

N/A — background feature; no user-facing screens. This is a headless backend API — see § 4
Requirements' `(ROUTE###)` references in `technical-spec.md § 2` for the four owning routes in
place of screen codes.

### User Journey

1. A guest (or any caller) reads a product's reviews before deciding to buy — no login required.
2. After receiving a delivered order for that product, the buyer writes one review of it.
3. The buyer may later edit or delete that same review; they can never have a second review of the
   same product.

## 7. User Stories

### US081_ViewProductReviews — View Product Reviews

**Actor:** Guest Shopper
**Goal:** Read what other buyers said about a product before deciding to buy it.
**Business value:** Purchase-verified social proof increases buyer confidence and conversion.

**Acceptance Criteria:**
- [ ] No authentication is required.
- [ ] Reviews for the given `productId` are returned newest first, paginated.
- [ ] Each review's author is shown only by display name and avatar.

### US082_CreateReview — Create Review

**Actor:** Verified Buyer
**Goal:** Share a rating and written opinion of a product they've received.
**Business value:** Grows the pool of trustworthy reviews other buyers rely on.

**Acceptance Criteria:**
- [ ] Rejected with 403 unless the caller has a `DELIVERED` order containing the product.
- [ ] Rejected with 409 if the caller already reviewed this product.
- [ ] `rating` must be an integer 1–5; `content` must be non-empty.

### US083_UpdateReview — Update Review

**Actor:** Verified Buyer
**Goal:** Correct or update their own review.
**Business value:** Keeps a buyer's feedback accurate over time without needing to delete and
recreate it.

**Acceptance Criteria:**
- [ ] Only the review's own author can edit it — another user's review is a 404.

### US084_DeleteReview — Delete Review

**Actor:** Verified Buyer
**Goal:** Remove their own review entirely.
**Business value:** Lets a buyer retract feedback they no longer stand behind.

**Acceptance Criteria:**
- [ ] Always a hard delete — no undo path.
- [ ] Only the review's own author can delete it — another user's review is a 404.

## 8. Scenarios

### US081_ViewProductReviews — Happy Path

**Given** a product has 3 reviews, **When** a guest with no auth token lists reviews for that
product, **Then** all 3 are returned newest first, each showing only the author's name and avatar.

### US082_CreateReview — Happy Path

**Given** a buyer has a `DELIVERED` order containing the product, **When** they submit a review
with `rating: 5` and non-empty content, **Then** the review is created and returned with their
author projection attached.

### US082_CreateReview — Error: not purchased

**Given** a caller has no `DELIVERED` order for the product, **When** they try to create a review,
**Then** the request is rejected with 403, and no `Review` row is written.

### US082_CreateReview — Error: duplicate review

**Given** a caller already reviewed a product, **When** they try to review it again, **Then** the
request is rejected with 409, and the existing review is unchanged.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| `productId`/`reviewId` not a valid UUID | Rejected before any lookup | Validation error naming the field |
| `rating` outside 1–5, or not an integer | Rejected before any lookup | Validation error naming the field |
| Product missing, deleted, or unpublished | Create is rejected | 404 "Product not found." |
| Caller has no `DELIVERED` order containing the product | Create is rejected | 403 "You can only review a product you have received." |
| Caller already reviewed the product | Create is rejected, existing review untouched | 409 "You have already reviewed this product." |
| Review belongs to another user (edit/delete) | Treated as absent | 404 "Review not found." |
| Two near-simultaneous create attempts for the same (user, product) | DB unique constraint lets exactly one through | The second is remapped from a Prisma unique-violation to 409 |

## 10. Edge Behaviours to Verify

- **BR-R01** → Confirm a caller with an order in any status other than `DELIVERED` (e.g.
  `PENDING_DELIVERY`) is still rejected with 403 when creating a review.
- **BR-R02** → Confirm two near-simultaneous create calls for the same (user, product) never both
  succeed — exactly one review survives.
- **BR-R05** → Confirm the public listing's author projection never includes email, phone, or
  account status, only display name and avatar.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | No aggregate rating is surfaced on the `Product` read model — F007's product list/detail does not show an average rating. | A buyer must open the reviews list separately to gauge overall sentiment; the product catalog itself carries no rating signal. | confirmed — explicitly non-scope per `spec/F013-review.md` |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F012_OrderPlacement | feature | Purchase-verification (BR-R01) reads this feature's `DELIVERED` orders and the `Order.products` relation populated at checkout. | BR-R01 |
| F007_PublicProductBrowsing | feature | Reuses the same publish/soft-delete visibility predicate to decide whether a product is reviewable at all. | Edge Cases table |

## 13. Configuration

```text
DEFAULT_PAGE = 1     # review list starts at page 1 when no page is supplied
DEFAULT_PAGE_SIZE = 10     # number of reviews returned per page when no pageSize is supplied
```
