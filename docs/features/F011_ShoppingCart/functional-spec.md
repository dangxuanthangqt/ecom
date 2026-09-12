---
authored_by: doc-writer
---

# Functional Spec — F011_ShoppingCart

**Priority**: P0
**Type**: ui
**Generated**: 2026-09-12

**See also:** [`technical-spec.md`](./technical-spec.md) — endpoints, Source citations, pseudocode,
key entities, and DB writes for a Dev/QA/SA audience.

**Traceability:** F011 → N/A (headless API — no screens) → US070, US071, US072, US073 → N/A (no background logic) → ROUTE071, ROUTE072, ROUTE073, ROUTE074 → N/A (no test cases generated yet)

## 1. Overview

**Problem:** A buyer who found a product has nowhere to hold it before deciding to order.
**Solution:** A per-user cart of `(SKU, quantity)` lines that survives between sessions and is the
sole input to F012's checkout.
**Scope:** list / add / update-quantity / remove own cart lines.
**Non-Scope:** checkout and stock decrement (F012); price calculation or promotions (no Prisma
support); guest carts (`CartItem.userId` is non-nullable — every line always belongs to a signed-in
user).

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Authenticated Buyer | Any signed-in user (client/seller/admin) | Hold SKUs they intend to buy until they're ready to check out |

This feature is part of no cross-feature flow — no `flows/*.md` artifacts exist yet. It is the
direct upstream input to F012_OrderPlacement's checkout action.

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Own Cart Management | List, add to, adjust the quantity of, and remove lines from their own cart | US070, US071, US072, US073 | FR-001, FR-201, FR-202, FR-203, FR-204 | BR-C01, BR-C02, BR-C03, BR-C04, BR-C05 | N/A — headless API, no screens |

## 3. Open Decisions

None — no unresolved domain confirmations (`clarifications.md` § Cart is fully resolved).

## 4. Requirements

### Foundation (0xx)

- **FR-001** Every cart read and write is scoped to the caller's own `CartItem` rows — no route
  accepts a target user id.

### Cart Management (2xx)

- **FR-201** A caller can list their own cart lines, each with its SKU and parent product, paginated.
- **FR-202** A caller can add a SKU to their cart; if that SKU is already in the cart, the existing
  line's quantity increases instead of a second line being created.
- **FR-203** A caller can set the quantity of one own cart line directly (not just increment).
- **FR-204** A caller can remove one own cart line.

## 5. Business Rules

- **BR-C01 — Ownership.** Every read and write is scoped to `CartItem.userId = activeUserId`.
  Another user's `cartItemId` is a 404, never a 403 — the row's existence is never confirmed to a
  caller who doesn't own it.
- **BR-C02 — Addable SKUs only.** The SKU must exist, not be soft-deleted, and its parent product
  must be not soft-deleted and published (`publishedAt` non-null and not in the future) — the same
  visibility predicate the public product list (F007) already applies.
- **BR-C03 — Stock ceiling.** The resulting quantity must be between 1 and `SKU.stock` inclusive.
  Stock is only checked here, never reserved — reservation happens at order creation (F012).
- **BR-C04 — One line per SKU.** Adding a SKU already in the cart increments the existing line
  rather than creating a second one. Enforced at the database level by
  `@@unique([userId, skuId])` on `CartItem` (migration `20260912140523_add_cart_item_user_sku_unique`),
  so a concurrent double-add cannot split the line into two rows.
- **BR-C05 — No soft delete.** `CartItem` carries no `deletedAt` column; removal is always a hard
  delete.

## 6. Screens

N/A — background feature; no user-facing screens. This is a headless backend API — see § 4
Requirements' `(ROUTE###)` references in `technical-spec.md § 2` for the four owning routes in
place of screen codes.

### User Journey

1. A signed-in caller lists their own cart to see what's already in it.
2. The caller adds a SKU they want to buy; if it's already in the cart, its quantity goes up
   instead of a duplicate line appearing.
3. The caller adjusts a line's quantity directly, or removes it entirely, at any point before
   checking out (F012).

## 7. User Stories

### US070_ViewCartList — View Cart List

**Actor:** Authenticated Buyer
**Goal:** See what's currently in their own cart.
**Business value:** Lets a buyer review their intended purchase before committing to checkout.

**Acceptance Criteria:**
- [ ] Only the caller's own `CartItem` rows are returned, paginated.
- [ ] Each line includes its SKU and the SKU's parent product summary.

### US071_AddCartItem — Add Cart Item

**Actor:** Authenticated Buyer
**Goal:** Add a SKU they want to buy to their cart.
**Business value:** Captures purchase intent without forcing an immediate order decision.

**Acceptance Criteria:**
- [ ] A SKU not yet in the cart creates a new line.
- [ ] A SKU already in the cart increments the existing line's quantity instead of duplicating it.
- [ ] Adding past `SKU.stock` is rejected with 400, and nothing is written.
- [ ] A missing, deleted, or unpublished-product SKU is rejected with 404.

### US072_UpdateCartItemQuantity — Update Cart Item Quantity

**Actor:** Authenticated Buyer
**Goal:** Set exactly how many of a SKU they want.
**Business value:** Lets a buyer correct a quantity without removing and re-adding the line.

**Acceptance Criteria:**
- [ ] The new quantity replaces the line's quantity outright (not additive).
- [ ] A quantity above `SKU.stock` is rejected with 400.
- [ ] Another user's cart line is a 404, not a 403.

### US073_RemoveCartItem — Remove Cart Item

**Actor:** Authenticated Buyer
**Goal:** Take a line out of their cart entirely.
**Business value:** Lets a buyer discard a purchase they no longer want, without it lingering.

**Acceptance Criteria:**
- [ ] The line is hard-deleted — no soft-delete/undo path exists.
- [ ] Another user's cart line is a 404, not a 403.

## 8. Scenarios

### US071_AddCartItem — Happy Path

**Given** a SKU is in stock and its product is published, **When** an authenticated caller adds it
to their cart for the first time, **Then** a new cart line is created with the requested quantity.

### US071_AddCartItem — Duplicate add increments

**Given** a caller already has 2 of a SKU in their cart, **When** they add 1 more of the same SKU,
**Then** the existing line's quantity becomes 3 — no second line is created.

### US071_AddCartItem — Error: exceeds stock

**Given** a SKU has 5 in stock and the caller already holds 3 in their cart, **When** they try to
add 3 more, **Then** the request is rejected with 400 naming the available stock, and no write
happens.

### US073_RemoveCartItem — Error: another user's line

**Given** a cart line belongs to a different user, **When** the caller tries to delete it by its
id, **Then** a 404 is returned, not a 403 — the caller cannot learn the line exists.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| `skuId`/`cartItemId` is not a valid UUID | Rejected before any lookup | Validation error naming the field |
| SKU is missing, soft-deleted, or its product is unpublished | Add is rejected | "SKU not found." |
| Resulting quantity exceeds `SKU.stock` | Add/update rejected, nothing written | "Only {stock} left in stock for this SKU." |
| `quantity < 1` | Rejected before any lookup | "Quantity must be at least 1." |
| Cart line belongs to another user (update/delete/read-by-id) | Treated as absent | 404 "Cart item not found." |
| Two concurrent adds of the same new SKU | DB unique constraint (`@@unique([userId, skuId])`) prevents a split line | One line survives with the combined quantity |

## 10. Edge Behaviours to Verify

- **BR-C03** → Confirm adding or updating past `SKU.stock` is rejected with 400 and writes nothing,
  for both a brand-new line and an existing one.
- **BR-C04** → Confirm two near-simultaneous "add this SKU" calls for the same user/SKU never
  produce two `CartItem` rows.
- **BR-C01** → Confirm every one of GET/PUT/DELETE against another user's `cartItemId` returns 404,
  never 403.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | known-issue | Stock is checked, not reserved, at add/update-quantity time. Between adding to cart and checking out (F012), the same stock could be claimed by another buyer's checkout. | A cart line can pass its own stock check yet still fail at checkout if stock ran out in between. | confirmed (by design — checkout re-validates, per F012 BR-O02) |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| F007_PublicProductBrowsing | feature | Reuses the same publish/soft-delete visibility predicate (`publishedProductWhere()`) to decide which SKUs are addable. | BR-C02 |
| F012_OrderPlacement | feature | This feature's cart lines are the sole input `cartItemIds` consumes at checkout; checkout deletes the consumed lines. | § 1 Overview |

## 13. Configuration

```text
DEFAULT_PAGE_INDEX = 1     # cart list starts at page 1 when no pageIndex is supplied
DEFAULT_PAGE_SIZE = 10     # number of cart lines returned per page when no pageSize is supplied
```
